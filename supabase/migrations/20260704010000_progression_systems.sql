-- Systems & Redesign Pass: economy fix (energy + shards), content depth
-- (stages + power leaderboard), retention (daily login + daily quests).
-- Adds to the schema in 20260703000000_initial_schema.sql, which is
-- already applied live and must not be edited.

-- ============================================================================
-- PROFILES: new columns
-- ============================================================================

alter table public.profiles
  add column if not exists energy int not null default 30 check (energy >= 0),
  add column if not exists max_energy int not null default 30 check (max_energy > 0),
  add column if not exists energy_updated_at timestamptz not null default now(),
  add column if not exists highest_stage_cleared int not null default 0 check (highest_stage_cleared >= 0),
  add column if not exists team_power bigint not null default 0 check (team_power >= 0),
  add column if not exists login_streak int not null default 0 check (login_streak >= 0),
  add column if not exists last_login_date date;

-- ============================================================================
-- DAILY QUEST PROGRESS
-- ============================================================================

create table if not exists public.daily_quest_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_date date not null,
  summons int not null default 0 check (summons >= 0),
  wins int not null default 0 check (wins >= 0),
  trainings int not null default 0 check (trainings >= 0),
  claimed_summon boolean not null default false,
  claimed_win boolean not null default false,
  claimed_training boolean not null default false,
  primary key (user_id, quest_date)
);

alter table public.daily_quest_progress enable row level security;

create policy "users can read their own daily quest progress"
  on public.daily_quest_progress for select
  using (auth.uid() = user_id);

-- ============================================================================
-- ENERGY: spend with lazy regen catch-up
-- ============================================================================
-- Regen rate matches src/game/energy.ts (1 energy / 5 minutes) — kept in sync
-- manually since the rate itself is decided in TypeScript, this RPC just
-- applies whatever regen math the server already computed and passed in.

create or replace function public.spend_energy_commit(
  p_user_id uuid,
  p_new_energy int,
  p_new_energy_updated_at timestamptz,
  p_cost int
)
returns table (new_energy int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_energy int;
begin
  select energy into v_energy from public.profiles where id = p_user_id for update;
  if v_energy is null then
    raise exception 'profile not found for user %', p_user_id;
  end if;

  -- Apply the regen catch-up the caller computed, then spend.
  update public.profiles
    set energy = p_new_energy, energy_updated_at = p_new_energy_updated_at
    where id = p_user_id;

  if p_new_energy < p_cost then
    raise exception 'insufficient energy: have %, need %', p_new_energy, p_cost;
  end if;

  update public.profiles set energy = energy - p_cost where id = p_user_id;

  return query select energy from public.profiles where id = p_user_id;
end;
$$;

-- ============================================================================
-- UPDATED: summon_commit now also tracks the daily "summon" quest
-- ============================================================================

create or replace function public.summon_commit(
  p_user_id uuid,
  p_character_id text,
  p_cost bigint,
  p_new_pity_count int
)
returns table (new_berries bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_berries bigint;
begin
  select berries into v_berries from public.profiles where id = p_user_id for update;

  if v_berries is null then
    raise exception 'profile not found for user %', p_user_id;
  end if;

  if v_berries < p_cost then
    raise exception 'insufficient berries: have %, need %', v_berries, p_cost;
  end if;

  update public.profiles
    set berries = berries - p_cost, pity_count = p_new_pity_count
    where id = p_user_id;

  insert into public.inventory (user_id, character_id, count, level)
  values (p_user_id, p_character_id, 1, 1)
  on conflict (user_id, character_id)
  do update set count = public.inventory.count + 1;

  insert into public.daily_quest_progress (user_id, quest_date, summons)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, quest_date)
  do update set summons = public.daily_quest_progress.summons + 1;

  return query select berries from public.profiles where id = p_user_id;
end;
$$;

-- ============================================================================
-- UPDATED: level_up_commit now supports shard-gated leveling (level >= 10)
-- and tracks the daily "training" quest
-- ============================================================================
-- The parameter list and return type both change, so Postgres would treat
-- this as a new overload rather than a true replace — drop the old
-- signature explicitly to avoid leaving an orphaned function behind.

drop function if exists public.level_up_commit(uuid, text, bigint);

create or replace function public.level_up_commit(
  p_user_id uuid,
  p_character_id text,
  p_cost bigint,
  p_consumes_shard boolean default false
)
returns table (new_level int, new_berries bigint, new_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_berries bigint;
  v_level int;
  v_count int;
begin
  select berries into v_berries from public.profiles where id = p_user_id for update;
  if v_berries is null then
    raise exception 'profile not found for user %', p_user_id;
  end if;

  select level, count into v_level, v_count from public.inventory
    where user_id = p_user_id and character_id = p_character_id
    for update;
  if v_level is null then
    raise exception 'unit % not owned by user %', p_character_id, p_user_id;
  end if;

  if v_berries < p_cost then
    raise exception 'insufficient berries: have %, need %', v_berries, p_cost;
  end if;

  if p_consumes_shard and v_count < 2 then
    raise exception 'insufficient shards: have %, need at least 2 (1 kept, 1 spent)', v_count;
  end if;

  update public.profiles set berries = berries - p_cost where id = p_user_id;

  update public.inventory
    set level = level + 1,
        count = case when p_consumes_shard then count - 1 else count end
    where user_id = p_user_id and character_id = p_character_id;

  insert into public.daily_quest_progress (user_id, quest_date, trainings)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, quest_date)
  do update set trainings = public.daily_quest_progress.trainings + 1;

  return query
    select level, (select berries from public.profiles where id = p_user_id), count
    from public.inventory
    where user_id = p_user_id and character_id = p_character_id;
end;
$$;

-- ============================================================================
-- UPDATED: grant_battle_reward now supports stage progression and tracks
-- the daily "win" quest
-- ============================================================================
-- Same reasoning as level_up_commit above — drop the old signature first.

drop function if exists public.grant_battle_reward(uuid, text, text, jsonb, text, bigint);

create or replace function public.grant_battle_reward(
  p_user_id uuid,
  p_mode text,
  p_seed text,
  p_enemy_squad jsonb,
  p_result text,
  p_reward bigint,
  p_stage_id int default null
)
returns table (new_berries bigint, new_highest_stage int)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.battle_logs (user_id, mode, seed, enemy_squad, result, berries_awarded)
  values (p_user_id, p_mode, p_seed, p_enemy_squad, p_result, p_reward);

  if p_result = 'win' then
    if p_reward > 0 then
      update public.profiles set berries = berries + p_reward where id = p_user_id;
    end if;

    if p_stage_id is not null then
      update public.profiles
        set highest_stage_cleared = p_stage_id
        where id = p_user_id and highest_stage_cleared < p_stage_id;
    end if;

    insert into public.daily_quest_progress (user_id, quest_date, wins)
    values (p_user_id, (now() at time zone 'utc')::date, 1)
    on conflict (user_id, quest_date)
    do update set wins = public.daily_quest_progress.wins + 1;
  end if;

  return query
    select berries, highest_stage_cleared from public.profiles where id = p_user_id;
end;
$$;

-- ============================================================================
-- TEAM POWER: recomputed after team/level changes
-- ============================================================================

create or replace function public.recompute_team_power_commit(
  p_user_id uuid,
  p_team_power bigint
)
returns table (new_team_power bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set team_power = p_team_power where id = p_user_id;
  return query select team_power from public.profiles where id = p_user_id;
end;
$$;

-- ============================================================================
-- DAILY LOGIN CLAIM
-- ============================================================================

create or replace function public.claim_daily_login_commit(
  p_user_id uuid,
  p_today date,
  p_new_streak int,
  p_reward bigint
)
returns table (new_streak int, new_berries bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_login date;
begin
  select last_login_date into v_last_login from public.profiles where id = p_user_id for update;

  if v_last_login is not null and v_last_login = p_today then
    raise exception 'daily login already claimed for %', p_today;
  end if;

  update public.profiles
    set login_streak = p_new_streak, last_login_date = p_today
    where id = p_user_id;

  insert into public.inbox (user_id, title, message, reward_amount)
  values (
    p_user_id,
    'Daily Login — Day ' || p_new_streak,
    'The Log Pose points true. Come back tomorrow to keep your streak alive.',
    p_reward
  );

  return query
    select login_streak, berries from public.profiles where id = p_user_id;
end;
$$;

-- ============================================================================
-- DAILY QUEST CLAIM
-- ============================================================================

create or replace function public.claim_daily_quest_commit(
  p_user_id uuid,
  p_quest_date date,
  p_quest_key text,
  p_reward bigint
)
returns table (new_berries bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress record;
begin
  if p_quest_key not in ('summon', 'win', 'training') then
    raise exception 'unknown quest key %', p_quest_key;
  end if;

  select * into v_progress from public.daily_quest_progress
    where user_id = p_user_id and quest_date = p_quest_date
    for update;

  if v_progress is null then
    raise exception 'no quest progress for % on %', p_user_id, p_quest_date;
  end if;

  if p_quest_key = 'summon' then
    if v_progress.claimed_summon then raise exception 'summon quest already claimed'; end if;
    if v_progress.summons < 3 then raise exception 'summon quest not yet complete'; end if;
    update public.daily_quest_progress set claimed_summon = true
      where user_id = p_user_id and quest_date = p_quest_date;
  elsif p_quest_key = 'win' then
    if v_progress.claimed_win then raise exception 'win quest already claimed'; end if;
    if v_progress.wins < 1 then raise exception 'win quest not yet complete'; end if;
    update public.daily_quest_progress set claimed_win = true
      where user_id = p_user_id and quest_date = p_quest_date;
  else
    if v_progress.claimed_training then raise exception 'training quest already claimed'; end if;
    if v_progress.trainings < 1 then raise exception 'training quest not yet complete'; end if;
    update public.daily_quest_progress set claimed_training = true
      where user_id = p_user_id and quest_date = p_quest_date;
  end if;

  update public.profiles set berries = berries + p_reward where id = p_user_id;

  return query select berries from public.profiles where id = p_user_id;
end;
$$;

-- ============================================================================
-- PERMISSIONS: server-only, same convention as the initial schema
-- ============================================================================

revoke execute on function public.spend_energy_commit(uuid, int, timestamptz, int) from public, anon, authenticated;
revoke execute on function public.summon_commit(uuid, text, bigint, int) from public, anon, authenticated;
revoke execute on function public.level_up_commit(uuid, text, bigint, boolean) from public, anon, authenticated;
revoke execute on function public.grant_battle_reward(uuid, text, text, jsonb, text, bigint, int) from public, anon, authenticated;
revoke execute on function public.recompute_team_power_commit(uuid, bigint) from public, anon, authenticated;
revoke execute on function public.claim_daily_login_commit(uuid, date, int, bigint) from public, anon, authenticated;
revoke execute on function public.claim_daily_quest_commit(uuid, date, text, bigint) from public, anon, authenticated;

grant execute on function public.spend_energy_commit(uuid, int, timestamptz, int) to service_role;
grant execute on function public.summon_commit(uuid, text, bigint, int) to service_role;
grant execute on function public.level_up_commit(uuid, text, bigint, boolean) to service_role;
grant execute on function public.grant_battle_reward(uuid, text, text, jsonb, text, bigint, int) to service_role;
grant execute on function public.recompute_team_power_commit(uuid, bigint) to service_role;
grant execute on function public.claim_daily_login_commit(uuid, date, int, bigint) to service_role;
grant execute on function public.claim_daily_quest_commit(uuid, date, text, bigint) to service_role;

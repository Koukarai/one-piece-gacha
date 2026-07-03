-- Grand Line Revival: initial schema
-- Tables hold only user-owned mutable state. The character catalog itself
-- (stats/skills/passives) lives in src/data/characters.js, not in the DB.

-- ============================================================================
-- TABLES
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  avatar_url text,
  berries bigint not null default 1000 check (berries >= 0),
  pity_count int not null default 0 check (pity_count >= 0),
  team_slot_1 text,
  team_slot_2 text,
  team_slot_3 text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  character_id text not null,
  count int not null default 1 check (count >= 0),
  level int not null default 1 check (level >= 1),
  created_at timestamptz not null default now(),
  unique (user_id, character_id)
);

create index if not exists inventory_user_id_idx on public.inventory (user_id);

create table if not exists public.inbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  reward_amount bigint not null default 0 check (reward_amount >= 0),
  is_claimed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists inbox_user_id_idx on public.inbox (user_id);

create table if not exists public.battle_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null default 'pve' check (mode in ('pve', 'pvp_async', 'pvp_live')),
  seed text not null,
  enemy_squad jsonb not null,
  result text not null check (result in ('win', 'loss')),
  berries_awarded bigint not null default 0 check (berries_awarded >= 0),
  created_at timestamptz not null default now()
);

create index if not exists battle_logs_user_id_idx on public.battle_logs (user_id);

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
-- Removes the old fragile pattern of the client "hoping" a profile row exists.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, berries)
  values (new.id, new.email, 1000)
  on conflict (id) do nothing;

  insert into public.inbox (user_id, title, message, reward_amount)
  values (
    new.id,
    'Welcome Aboard, Captain',
    'The Grand Line is vast and full of danger, but also full of nakama waiting to be found. Here''s a little something to help you set sail.',
    500
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Defense-in-depth for anon/authenticated (anon-key) access. Server endpoints
-- use the service role key and bypass RLS entirely for validated mutations.

alter table public.profiles enable row level security;
alter table public.inventory enable row level security;
alter table public.inbox enable row level security;
alter table public.battle_logs enable row level security;

-- profiles: readable by anyone (leaderboard), writable only by the owner,
-- and only for cosmetic fields — berries/team slots are server-managed.
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users can update their own cosmetic profile fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- inventory: owner-only read. No client-side insert/update/delete —
-- all inventory mutations go through security-definer RPCs below.
create policy "users can read their own inventory"
  on public.inventory for select
  using (auth.uid() = user_id);

-- inbox: owner-only read. Claiming goes through the claim_mail RPC.
create policy "users can read their own inbox"
  on public.inbox for select
  using (auth.uid() = user_id);

-- battle_logs: owner-only read. Writes only via RPC/service role.
create policy "users can read their own battle logs"
  on public.battle_logs for select
  using (auth.uid() = user_id);

-- ============================================================================
-- THIN, GENERIC RPC FUNCTIONS (atomic ledger operations only)
-- ============================================================================
-- Game design (odds, damage formulas, cost curves) lives in TypeScript.
-- These functions just commit an already-decided outcome atomically and
-- are only callable by the server (service_role), never directly by clients.

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

  return query select berries from public.profiles where id = p_user_id;
end;
$$;

create or replace function public.level_up_commit(
  p_user_id uuid,
  p_character_id text,
  p_cost bigint
)
returns table (new_level int, new_berries bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_berries bigint;
  v_level int;
begin
  select berries into v_berries from public.profiles where id = p_user_id for update;
  if v_berries is null then
    raise exception 'profile not found for user %', p_user_id;
  end if;

  select level into v_level from public.inventory
    where user_id = p_user_id and character_id = p_character_id
    for update;
  if v_level is null then
    raise exception 'unit % not owned by user %', p_character_id, p_user_id;
  end if;

  if v_berries < p_cost then
    raise exception 'insufficient berries: have %, need %', v_berries, p_cost;
  end if;

  update public.profiles set berries = berries - p_cost where id = p_user_id;
  update public.inventory set level = level + 1
    where user_id = p_user_id and character_id = p_character_id;

  return query
    select level, (select berries from public.profiles where id = p_user_id)
    from public.inventory
    where user_id = p_user_id and character_id = p_character_id;
end;
$$;

create or replace function public.claim_mail(
  p_user_id uuid,
  p_mail_id bigint
)
returns table (new_berries bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward bigint;
  v_claimed boolean;
  v_owner uuid;
begin
  select reward_amount, is_claimed, user_id into v_reward, v_claimed, v_owner
    from public.inbox where id = p_mail_id for update;

  if v_owner is null then
    raise exception 'mail % not found', p_mail_id;
  end if;
  if v_owner <> p_user_id then
    raise exception 'mail % does not belong to user %', p_mail_id, p_user_id;
  end if;
  if v_claimed then
    raise exception 'mail % already claimed', p_mail_id;
  end if;

  update public.inbox set is_claimed = true where id = p_mail_id;
  update public.profiles set berries = berries + v_reward where id = p_user_id;

  return query select berries from public.profiles where id = p_user_id;
end;
$$;

create or replace function public.grant_battle_reward(
  p_user_id uuid,
  p_mode text,
  p_seed text,
  p_enemy_squad jsonb,
  p_result text,
  p_reward bigint
)
returns table (new_berries bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.battle_logs (user_id, mode, seed, enemy_squad, result, berries_awarded)
  values (p_user_id, p_mode, p_seed, p_enemy_squad, p_result, p_reward);

  if p_result = 'win' and p_reward > 0 then
    update public.profiles set berries = berries + p_reward where id = p_user_id;
  end if;

  return query select berries from public.profiles where id = p_user_id;
end;
$$;

-- Only the server (service_role) should ever call these — never the client.
revoke execute on function public.summon_commit(uuid, text, bigint, int) from public, anon, authenticated;
revoke execute on function public.level_up_commit(uuid, text, bigint) from public, anon, authenticated;
revoke execute on function public.claim_mail(uuid, bigint) from public, anon, authenticated;
revoke execute on function public.grant_battle_reward(uuid, text, text, jsonb, text, bigint) from public, anon, authenticated;

grant execute on function public.summon_commit(uuid, text, bigint, int) to service_role;
grant execute on function public.level_up_commit(uuid, text, bigint) to service_role;
grant execute on function public.claim_mail(uuid, bigint) to service_role;
grant execute on function public.grant_battle_reward(uuid, text, text, jsonb, text, bigint) to service_role;

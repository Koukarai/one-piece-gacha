# Activity Log

A running record of what happened in each work session on this project. Updated at the end of every session — newest entry on top.

---

## 2026-07-04 (session 2) — Systems & Redesign Pass, part 1: economy, content, retention

**Context:** After playtesting Phase 1, did a full audit of the game's *design* (not just visuals): the Arena had no cost/cooldown (proven farmable by looping the endpoint with zero friction), duplicate summons were cosmetic-only, there was one fight forever, the leaderboard ranked raw currency instead of squad strength, and there was exactly one retention hook ever. User chose to fix all of it. Full plan at `C:\Users\terry\.claude\plans\crispy-sprouting-porcupine.md`. Visual redesign itself is saved for last, once systems are final.

**Built and live-verified, all via a new migration (`supabase/migrations/20260704010000_progression_systems.sql`, applied through the Studio SQL Editor — CLI direct-DB access is still flaky/intermittent on this project, same as before):**
- **Energy/stamina** (`src/game/energy.ts`) — closes the infinite-Arena-grind hole. Lazy regen (no cron), 1 energy per 5 min, spent via a new `spend_energy_commit` RPC. Arena UI shows the bar and disables Deploy when insufficient.
- **Duplicate shards** (`leveling.ts`) — levels 10+ now consume 1 duplicate per level-up (via the existing `inventory.count` field, no schema change needed for this part), giving dupes real value for the first time.
- **Arena stages** (`src/game/stages.ts`) — 5 stages, escalating difficulty (reusing existing enemy templates scaled by a multiplier, no new art needed), sequential unlock tracked via `profiles.highest_stage_cleared`.
- **Power leaderboard** — `profiles.team_power`, recomputed via `src/lib/teamPower.ts` after team/train changes, toggle on the leaderboard page between Bounty and Crew Power.
- **Daily login streak** — reuses the existing inbox/claim pattern, reward scales with streak (capped at day 7), auto-claimed silently once per day from `GameLayout.astro` with a toast notification.
- **Daily quests** (`src/game/dailyQuests.ts`) — summon 3×, win 1 battle, train once; tracked via a new `daily_quest_progress` table, surfaced as a panel on the dashboard.

**Two real bugs found during live playtesting (not just written, actually clicked through and cross-checked against the DB):**
1. **Shard-gating off-by-one** — `requiresShardToLevelUp` checked the *current* level instead of the level being leveled *into*, so leveling 9→10 (which should cost a shard) went through for free. The original test for this was accidentally asserting the buggy behavior. Fixed the logic and rewrote the test to match the actually-intended behavior; re-verified live (9→10 with 1 copy now correctly rejected, with 2 copies correctly consumes 1 and succeeds).
2. **Leaderboard tab race condition** — switching the Bounty/Crew-Power tab quickly (or right after page load) could let a slower, stale fetch overwrite a newer one's render. Fixed with a request-token guard.

**Also:** dev server port 4321 was occupied by a stray leftover process; enabled `autoPort` in `.claude/launch.json` since nothing here depends on a fixed port.

**Left for the user / next session:**
- Test account currently has inflated berries and a level-10 Buggy from this session's live-testing — fine for a dev account, flag if you want it reset before treating it as "real."
- Visual redesign pass (item 4 of the plan) — still last on purpose, now that the underlying systems are actually final.

---

## 2026-07-04 (session 1) — First live playtest of the rebuilt Phase 1 features

**Context:** GitHub repo was created (`github.com/Koukarai/one-piece-gacha`) and pushed to. First real playtest of every rebuilt feature against the live backend, using the account created last session.

**Verified working end-to-end (server-authoritative, checked directly against the DB, not just the UI):**
- `/api/summon` — deducts berries correctly, updates inventory, isolated single-call test confirmed exactly one summon per one request.
- `/api/team` — deploy/recall to squad slots persists correctly, ownership validated.
- `/api/train` — cost/level-up persists correctly (Buggy: level 1 → 2, 200 berries deducted).
- `/api/battle/start` — both outcomes verified: loss grants 0 berries, win grants exactly 250 and logs to `battle_logs`.
- `/api/inbox/claim` — reward credited correctly, and double-claiming the same mail is properly rejected (400, "already claimed").

**Bugs found and fixed:**
- `GachaCard.jsx`'s double-submit guard used React state (`isSummoning`) instead of a ref, leaving a real (if narrow) window where two rapid clicks could both slip past the check before a state update commits. Fixed with a `useRef`-based guard that's synchronous.
- `card-back-pattern.png` was a typo'd asset reference (404) — the actual file is `card-back.png`. Fixed.

**Noted, not fixed (low priority / needs art, not code):**
- Sidebar berries/crew-size counters don't live-update after an action (summon/train/battle) without a full page reload — same pre-existing pattern as the original app, not a regression, just never fixed.
- `login.astro` references `/assets/map-bg.png`, which was never actually created — the background silently no-ops. Needs an actual asset, not a code fix.
- `public/assets/phil.png` exists but is referenced nowhere in the code — likely leftover/unused.

**Observed but not fully explained:** during automated browser testing, the test account accumulated far more summons/actions (pity_count reached 6, ~10 total summons, an unprompted team-slot assignment) than were explicitly triggered. An isolated, single direct HTTP call to `/api/summon` proved the server does exactly one unit of work per request, so this reads as dev-tooling/automation noise (e.g., the dev toolbar's Audit feature interacting with the page) rather than an application bug — but flagging in case it recurs, since it wasn't run to full ground truth.

**Left for the user:**
- Test account (`terryokeke@gmail.com`) now has a cluttered inventory (Buggy x6, Arlong x2, Zoro x1, Sanji x1, berries topped up to 5000+ for testing) — fine for continued dev use, but let me know if you want it reset to a clean slate before treating this as your "real" account.
- `/assets/map-bg.png` still needs an actual image if the login page background is wanted.

---

## 2026-07-03 (session 2) — Live Supabase project stood up, IP direction decided

**Context:** Continuation of the rebuild. Also branched into a side conversation about giving the game an original IP long-term — resolved (see below) — and worked through getting an actual live Supabase backend running for the first time.

**IP direction decided:** Explored redesigning the game around an original IP (drafted a full concept, "Tideglass" — ocean world, lightning-crystal powers, the Concord as the authority faction, Glimmer currency, the Wellspring as the endgame myth) so the project can scale publicly without One Piece's trademark risk. Decided to **stick with One Piece for now** — not enough time/characters to redesign the roster yet. A separate chat session was kicked off specifically to keep developing the original-IP concept in parallel, for a future migration once ready. The Tideglass pitch and preferences (bright/adventurous tone; must keep power-growth + found-family + discovery + underdog-vs-authority; genre pivots to circus/space/urban-noir were explicitly rejected) are the reference point for that effort.

**Supabase: found and fixed a real problem.** The "deleted" project turned out to only be paused, not deleted — found via a personal-account mixup first (CLI was authenticated to a different, unrelated "azap" account; fixed via `supabase logout`/`login`). Once on the right account, the resumed project (`djkagmeshaefkyriogdi`) had:
- Only test data (1 user, 17 inventory rows, 0 real inbox rows) — nothing worth preserving.
- Schema drift from the current code: extra columns/RPCs (`current_captain_id`, `crew_power`, `add_berries`, `upgrade_character`) that no code in the repo references — a real example of the "lost track of the data model" problem the rebuild is meant to fix.
- A broken internal Postgres role (`cli_login_postgres`) that made `supabase db push`/`migration list` fail with a permission error, confirmed (via two logout/login cycles and a DB password reset) to be specific to that project's database, not an account issue.

**Resolution:** deleted that project entirely and created a fresh one (same name, same org, ref `qpfdlxjerroxcmtemrgf`) — free-tier active-project slot was available since the old one was deleted first. Applied the migration via `supabase db push` cleanly on the new project. Populated `.env` with the new project's keys directly (never printed to chat). Verified via a real signup that the auto-profile trigger, starting berries, and welcome mail all work correctly.

Also created the user's actual player account (`terryokeke@gmail.com`) — hit Supabase's shared test-email rate limit when going through the normal signup form (twice), so created it via the Supabase Admin API (`auth.admin.createUser` with `email_confirm: true`) instead, which bypasses the email pipeline entirely. Logged in and confirmed it works (1,000 starting Berry, sidebar renders correctly with the new palette).

Learned along the way: Supabase's free-tier "2 active projects" cap is **per-account**, not per-org (corrected an earlier wrong assumption).

**Left for the user:**
- GitHub repo still doesn't exist / nothing pushed remotely. Need the user to create an empty repo on their personal GitHub account and hand over the URL (no `gh` CLI available in this environment) before we can push.
- "Confirm email" is currently OFF on the live project for dev convenience — **turn this back on before any real public launch** (or decide it's not needed if email collection moves fully into the in-game inbox instead — undecided, revisit later).
- Only one real playable account exists so far (the user's own). No other playtesting done yet this session.

---

## 2026-07-03 (session 1) — Revival: server-authoritative rebuild + visual refresh

**Context:** Project had been abandoned; the original Supabase project/database was deleted. Planned and executed a Phase 1 rebuild (see `C:\Users\terry\.claude\plans\majestic-percolating-glade.md` for the full plan this session followed).

**Done:**
- Initialized git for the project (previously untracked).
- Wrote the full DB schema from scratch as a versioned migration (`supabase/migrations/20260703000000_initial_schema.sql`): `profiles`, `inventory`, `inbox`, `battle_logs`, RLS policies, an auto-create-profile trigger (with a welcome mail), and thin `SECURITY DEFINER` RPCs (`summon_commit`, `level_up_commit`, `claim_mail`, `grant_battle_reward`) that only the server can call.
- Added Vitest and built out `src/game/` as pure, tested TypeScript: `rng.ts` (seeded PRNG), `summonOdds.ts` (rarity weights + pity counter), `leveling.ts` (cost/growth curves), `enemies.ts` (PvE content), and `battleEngine.ts` — a deterministic auto-battle simulator that takes two squads + a seed and returns a replayable event log. 19 tests passing.
- Added `@astrojs/node` adapter, switched Astro to `output: 'server'` so API routes work.
- Built server endpoints under `src/pages/api/`: `summon`, `team`, `train`, `battle/start`, `inbox/claim`, `profile` — all verify the caller's Supabase session and never trust client-submitted values (berries/cost/ownership are all re-derived server-side).
- Rewired every page/component that used to mutate Supabase directly (GachaCard, barracks, inspector, inbox, profile) to call the new endpoints via a shared `src/lib/apiClient.js` helper.
- Rewrote `arena.astro`: it used to be a manual, click-to-select-skill-and-target battle system computed entirely client-side (no server validation, and it never actually granted rewards on victory). It's now "Deploy Squad" → server builds the enemy squad, runs `battleEngine`, grants rewards → client replays the returned log with the existing animation/FX code. **This is a real gameplay change** (lost per-turn manual control) traded for full server authority and reusability for future PvP — flagged explicitly rather than silently changed.
- Visual pass: consolidated scattered `yellow-300/400/500/900` Tailwind utility usages across every page onto a single custom `gold-300/400/500/900` token ramp defined once in `src/app.css`, shifted the accent from flat caution-yellow to a warmer bronze/amber, deepened the background, softened the glass blur. Verified live via the preview tool on `/login`.
- Cleanup: deleted the orphaned `InspectorModal.astro` (dead code — barracks navigates to `/inspector` page instead) and unused `src/styles/global.css`. Added `.env.example` documenting required env vars including the new server-only `SUPABASE_SERVICE_ROLE_KEY`. Rewrote `README.md` to describe the actual architecture and setup steps.
- Made the initial git commit.

**Verified:** `npm run build` succeeds, `npx vitest run` passes (19/19).

**Left for the user (needs their Supabase account):**
1. Create a new Supabase project.
2. Copy `.env.example` → `.env`, fill in `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. `supabase login` → `supabase link --project-ref <ref>` → `supabase db push` to apply the migration.
4. `npm run dev` and playtest end-to-end (couldn't be done this session — no live backend to test against).

**Not yet done (future sessions, per the roadmap in the plan):**
- Full manual/authenticated-page visual redesign pass (only did a token-level refresh; dashboard/summon/barracks/arena pages haven't been visually iterated on with a live backend).
- Phase 2: async PvP (attack another player's saved squad via `battleEngine`, no realtime needed).
- Phase 3: real-time co-op/PvP over Supabase Realtime.

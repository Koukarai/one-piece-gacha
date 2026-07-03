# Activity Log

A running record of what happened in each work session on this project. Updated at the end of every session — newest entry on top.

---

## 2026-07-03 — Revival: server-authoritative rebuild + visual refresh

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

# Grand Line — One Piece Gacha & Battle Game

An Astro + React gacha/collection game: summon crew members, build a squad, train them up, and send them into the Arena. Backed by Supabase (Postgres + Auth), with all currency, summon, training, and battle logic resolved **server-side** — the client only ever displays what the server decides.

## Stack

- [Astro 5](https://astro.build) (server output, `@astrojs/node` adapter) + React islands (`client:load`)
- Tailwind CSS 4
- [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security
- Vitest for unit-testing game logic

## Architecture

Game design logic (summon odds, leveling curves, combat) lives in **plain TypeScript** under `src/game/`, so it's versioned, diffable, and unit-tested — not scattered across page scripts or hidden in database functions.

- `src/game/rng.ts` — seeded, deterministic PRNG. Every summon and battle stores its seed, so any outcome can be reproduced/audited later.
- `src/game/summonOdds.ts` — rarity weights + a pity counter (guaranteed SSR after enough pulls without one).
- `src/game/leveling.ts` — training cost curve and stat-scaling formulas.
- `src/game/battleEngine.ts` — a pure, deterministic auto-battle simulator. Given two squads and a seed it always produces the same turn-by-turn event log. This is the one piece of code that will power PvE now and PvP later.
- `src/game/enemies.ts` — PvE enemy content.
- `src/data/characters.js` — the character catalog (stats/skills/passives). Single source of truth, imported by both client UI and server endpoints — never duplicated into the database.

Server endpoints (`src/pages/api/*.ts`) are the only things allowed to mutate berries, inventory, levels, or grant battle rewards. Each one verifies the caller's Supabase session, computes the outcome using the modules above, and commits it atomically through a thin Postgres RPC function (`supabase/migrations/`) — the RPCs themselves contain no game-design logic, just ledger bookkeeping, so there's nothing meaningful "hidden" in the database.

| Endpoint | Purpose |
|---|---|
| `POST /api/summon` | Rolls a summon server-side, deducts berries, updates inventory + pity |
| `POST /api/team` | Equip/unequip a unit in a squad slot (validates ownership) |
| `POST /api/train` | Levels up an owned unit (validates cost server-side) |
| `POST /api/battle/start` | Builds an enemy squad, runs the battle engine, grants rewards on a win |
| `POST /api/inbox/claim` | Claims a mail reward |
| `POST /api/profile` | Updates cosmetic profile fields (username/avatar) |

The client calls these through `src/lib/apiClient.js`, which attaches the user's Supabase access token.

## Local Setup

1. **Install dependencies**
   ```sh
   npm install
   ```

2. **Create a Supabase project** (dashboard or `supabase projects create`), then copy `.env.example` to `.env` and fill in:
   - `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` — from your project's API settings
   - `SUPABASE_SERVICE_ROLE_KEY` — also from API settings; **never** expose this to the client or commit it

3. **Apply the schema** to your new project (no local Docker/Postgres required — this pushes straight to the remote database):
   ```sh
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   This creates the tables, RLS policies, the auto-profile-on-signup trigger, and the RPC functions in `supabase/migrations/`.

4. **Run the dev server**
   ```sh
   npm run dev
   ```

5. **Run tests** (pure game logic — RNG, odds, leveling, battle engine):
   ```sh
   npm test
   ```

## Roadmap

- **Now:** solid single-player loop — summon, barracks/team management, PvE arena, inbox, leaderboard.
- **Next:** async PvP — attack another player's saved defensive squad using the same `battleEngine`, no realtime infra needed.
- **Later:** real-time co-op/PvP over Supabase Realtime channels, with the server still authoritative via the same engine.

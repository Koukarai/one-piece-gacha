import type { CharacterBase } from "./battleEngine";

// Enemy content lives here (not in the DB) — same principle as the player
// character catalog: game design data belongs in versioned TypeScript.
const ENEMY_TEMPLATES: CharacterBase[] = [
  {
    id: "enemy-marine-grunt",
    name: "Marine Grunt",
    image: "/assets/enemy-marine.png",
    rarity: "R",
    role: "Marine",
    stats: { hp: 2000, atk: 300, spd: 90 },
    passive: null,
    skills: [],
  },
  {
    id: "enemy-marine-captain",
    name: "Marine Captain",
    image: "/assets/enemy-captain.png",
    rarity: "SR",
    role: "Marine",
    stats: { hp: 4500, atk: 550, spd: 95 },
    passive: null,
    skills: [],
  },
];

/** Builds a deterministic 3-unit enemy squad from the given RNG stream. */
export function pickEnemySquad(rng: () => number): CharacterBase[] {
  const squad: CharacterBase[] = [];
  for (let i = 0; i < 3; i++) {
    const template = ENEMY_TEMPLATES[Math.floor(rng() * ENEMY_TEMPLATES.length)];
    squad.push({ ...template, id: `${template.id}-${i}` });
  }
  return squad;
}

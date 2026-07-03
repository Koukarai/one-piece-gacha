import { CHARACTERS } from "../data/characters.js";

export const SUMMON_COST = 100;
/** A pull is guaranteed SSR if the player has gone this many pulls without one. */
export const PITY_THRESHOLD = 50;

const RARITY_WEIGHTS: Array<{ rarity: string; weight: number }> = [
  { rarity: "SSR", weight: 0.05 },
  { rarity: "SR", weight: 0.25 },
  { rarity: "R", weight: 0.7 },
];

function poolForRarity(rarity: string) {
  return CHARACTERS.filter((c) => c.rarity === rarity);
}

export interface SummonResult {
  character: (typeof CHARACTERS)[number];
  /** Pity counter to persist for the player's *next* pull. */
  nextPityCount: number;
  pityTriggered: boolean;
}

function rollRarity(rng: () => number): string {
  const roll = rng();
  let cumulative = 0;
  for (const { rarity, weight } of RARITY_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return rarity;
  }
  return RARITY_WEIGHTS[RARITY_WEIGHTS.length - 1].rarity;
}

/**
 * Rolls a single summon. `pityCount` is how many pulls the player has made
 * since their last SSR; pass 0 for a fresh player/counter.
 */
export function rollSummon(rng: () => number, pityCount: number): SummonResult {
  const attemptedPity = pityCount + 1;
  const pityTriggered = attemptedPity >= PITY_THRESHOLD;
  const rarity = pityTriggered ? "SSR" : rollRarity(rng);

  const pool = poolForRarity(rarity);
  const chosenPool = pool.length > 0 ? pool : CHARACTERS;
  const character = chosenPool[Math.floor(rng() * chosenPool.length)];

  return {
    character,
    nextPityCount: rarity === "SSR" ? 0 : attemptedPity,
    pityTriggered,
  };
}

// Shared cost/growth curves. Used by both the training endpoint (server,
// authoritative) and any client UI that wants to preview a cost/power value.

export const BASE_TRAIN_COST = 200;
export const STAT_GROWTH_PER_LEVEL = 0.05;

export function statMultiplier(level: number): number {
  return 1 + (level - 1) * STAT_GROWTH_PER_LEVEL;
}

export function trainCost(currentLevel: number): number {
  return BASE_TRAIN_COST * currentLevel;
}

export function scaledStat(baseValue: number, level: number): number {
  return Math.floor(baseValue * statMultiplier(level));
}

export function powerScore(baseHp: number, baseAtk: number, level: number): number {
  return Math.floor((baseHp + baseAtk) * statMultiplier(level));
}

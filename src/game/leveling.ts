// Shared cost/growth curves. Used by both the training endpoint (server,
// authoritative) and any client UI that wants to preview a cost/power value.

export const BASE_TRAIN_COST = 200;
export const STAT_GROWTH_PER_LEVEL = 0.05;

/**
 * Reaching this level (or any level beyond it) requires consuming a
 * duplicate (a "shard") in addition to berries — training past this point
 * without ever having pulled a dupe of the unit is not possible. Requires
 * owning at least 2 copies (count >= 2) so the unit's own "body" is never
 * spent away.
 */
export const SHARD_LEVEL_THRESHOLD = 10;

/** True if leveling up *from* currentLevel requires a shard — i.e. the level being trained into (currentLevel + 1) is at or past the threshold. */
export function requiresShardToLevelUp(currentLevel: number): boolean {
  return currentLevel + 1 >= SHARD_LEVEL_THRESHOLD;
}

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

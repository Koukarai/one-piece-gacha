// Lazy energy regen: no cron job needed. Every time we need current energy,
// we compute how many regen ticks have elapsed since the last update and
// apply them, advancing the timestamp only by the ticks actually consumed
// so partial progress toward the next tick is never lost.

export const ENERGY_REGEN_INTERVAL_MS = 5 * 60 * 1000; // +1 energy per 5 minutes
export const DEFAULT_BATTLE_ENERGY_COST = 5;

export interface RegenResult {
  newEnergy: number;
  newUpdatedAt: Date;
}

export function computeRegen(current: number, max: number, lastUpdatedAt: Date, now: Date): RegenResult {
  if (current >= max) {
    return { newEnergy: current, newUpdatedAt: lastUpdatedAt };
  }

  const elapsedMs = now.getTime() - lastUpdatedAt.getTime();
  const ticks = Math.floor(elapsedMs / ENERGY_REGEN_INTERVAL_MS);

  if (ticks <= 0) {
    return { newEnergy: current, newUpdatedAt: lastUpdatedAt };
  }

  const newEnergy = Math.min(max, current + ticks);
  const newUpdatedAt = new Date(lastUpdatedAt.getTime() + ticks * ENERGY_REGEN_INTERVAL_MS);

  return { newEnergy, newUpdatedAt };
}

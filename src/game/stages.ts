import type { CharacterBase } from "./battleEngine";

export interface StageConfig {
  id: number;
  name: string;
  energyCost: number;
  /** Multiplies enemy hp/atk before the battle — the only lever for difficulty since we reuse the same enemy templates rather than needing new art per stage. */
  difficultyMultiplier: number;
  winReward: number;
}

export const STAGES: StageConfig[] = [
  { id: 1, name: "Coastal Patrol", energyCost: 5, difficultyMultiplier: 1.0, winReward: 150 },
  { id: 2, name: "Marine Outpost", energyCost: 5, difficultyMultiplier: 1.3, winReward: 200 },
  { id: 3, name: "Blockade Fleet", energyCost: 8, difficultyMultiplier: 1.7, winReward: 300 },
  { id: 4, name: "Vice Admiral's Guard", energyCost: 8, difficultyMultiplier: 2.2, winReward: 400 },
  { id: 5, name: "Marineford Gate", energyCost: 10, difficultyMultiplier: 3.0, winReward: 600 },
];

export function getStage(stageId: number): StageConfig | undefined {
  return STAGES.find((s) => s.id === stageId);
}

/** A stage is playable if it's already been cleared (replay) or is the very next one. */
export function isStageUnlocked(stageId: number, highestCleared: number): boolean {
  return stageId <= highestCleared + 1;
}

export function scaleEnemySquad(squad: CharacterBase[], multiplier: number): CharacterBase[] {
  return squad.map((unit) => ({
    ...unit,
    stats: {
      ...unit.stats,
      hp: Math.floor(unit.stats.hp * multiplier),
      atk: Math.floor(unit.stats.atk * multiplier),
    },
  }));
}

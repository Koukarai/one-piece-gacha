export type QuestKey = "summon" | "win" | "training";

export interface QuestDefinition {
  key: QuestKey;
  label: string;
  threshold: number;
  reward: number;
}

export const DAILY_QUESTS: QuestDefinition[] = [
  { key: "summon", label: "Summon 3 times", threshold: 3, reward: 150 },
  { key: "win", label: "Win 1 Arena battle", threshold: 1, reward: 150 },
  { key: "training", label: "Train a unit once", threshold: 1, reward: 100 },
];

const PROGRESS_COLUMN: Record<QuestKey, string> = {
  summon: "summons",
  win: "wins",
  training: "trainings",
};

const CLAIMED_COLUMN: Record<QuestKey, string> = {
  summon: "claimed_summon",
  win: "claimed_win",
  training: "claimed_training",
};

export function progressColumnFor(key: QuestKey): string {
  return PROGRESS_COLUMN[key];
}

export function claimedColumnFor(key: QuestKey): string {
  return CLAIMED_COLUMN[key];
}

export function isQuestComplete(progressCount: number, quest: QuestDefinition): boolean {
  return progressCount >= quest.threshold;
}

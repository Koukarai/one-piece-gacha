import { describe, expect, it } from "vitest";
import { claimedColumnFor, DAILY_QUESTS, isQuestComplete, progressColumnFor } from "./dailyQuests";

describe("dailyQuests", () => {
  it("every quest key maps to a distinct progress and claimed column", () => {
    const progressCols = DAILY_QUESTS.map((q) => progressColumnFor(q.key));
    const claimedCols = DAILY_QUESTS.map((q) => claimedColumnFor(q.key));
    expect(new Set(progressCols).size).toBe(DAILY_QUESTS.length);
    expect(new Set(claimedCols).size).toBe(DAILY_QUESTS.length);
  });

  it("isQuestComplete respects each quest's threshold", () => {
    const summonQuest = DAILY_QUESTS.find((q) => q.key === "summon")!;
    expect(isQuestComplete(summonQuest.threshold - 1, summonQuest)).toBe(false);
    expect(isQuestComplete(summonQuest.threshold, summonQuest)).toBe(true);
    expect(isQuestComplete(summonQuest.threshold + 1, summonQuest)).toBe(true);
  });
});

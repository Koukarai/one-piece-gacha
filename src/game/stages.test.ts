import { describe, expect, it } from "vitest";
import { getStage, isStageUnlocked, scaleEnemySquad, STAGES } from "./stages";
import type { CharacterBase } from "./battleEngine";

describe("stages", () => {
  it("STAGES is ordered and strictly increasing in difficulty", () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i].difficultyMultiplier).toBeGreaterThan(STAGES[i - 1].difficultyMultiplier);
      expect(STAGES[i].id).toBe(STAGES[i - 1].id + 1);
    }
  });

  it("getStage finds a stage by id and returns undefined for unknown ids", () => {
    expect(getStage(1)?.name).toBe(STAGES[0].name);
    expect(getStage(9999)).toBeUndefined();
  });

  describe("isStageUnlocked", () => {
    it("the first stage is always unlocked", () => {
      expect(isStageUnlocked(1, 0)).toBe(true);
    });

    it("allows replaying any cleared stage", () => {
      expect(isStageUnlocked(2, 3)).toBe(true);
    });

    it("allows the very next stage after the highest cleared", () => {
      expect(isStageUnlocked(4, 3)).toBe(true);
    });

    it("rejects skipping ahead", () => {
      expect(isStageUnlocked(5, 3)).toBe(false);
    });
  });

  it("scaleEnemySquad multiplies hp/atk and floors the result", () => {
    const squad: CharacterBase[] = [
      {
        id: "e1",
        name: "Test Enemy",
        image: "/x.png",
        rarity: "R",
        role: "Marine",
        stats: { hp: 1000, atk: 100, spd: 90 },
        passive: null,
        skills: [],
      },
    ];
    const scaled = scaleEnemySquad(squad, 1.5);
    expect(scaled[0].stats.hp).toBe(1500);
    expect(scaled[0].stats.atk).toBe(150);
    // original untouched
    expect(squad[0].stats.hp).toBe(1000);
  });
});

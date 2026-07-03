import { describe, expect, it } from "vitest";
import { createSeededRng } from "./rng";
import { PITY_THRESHOLD, rollSummon } from "./summonOdds";
import { CHARACTERS } from "../data/characters.js";

describe("rollSummon", () => {
  it("always returns a real character from the catalog", () => {
    const rng = createSeededRng("catalog-check");
    let pity = 0;
    for (let i = 0; i < 200; i++) {
      const result = rollSummon(rng, pity);
      expect(CHARACTERS.some((c) => c.id === result.character.id)).toBe(true);
      pity = result.nextPityCount;
    }
  });

  it("guarantees an SSR once the pity threshold is reached", () => {
    const rng = createSeededRng("pity-check");
    const result = rollSummon(rng, PITY_THRESHOLD - 1);
    expect(result.pityTriggered).toBe(true);
    expect(result.character.rarity).toBe("SSR");
    expect(result.nextPityCount).toBe(0);
  });

  it("resets the pity counter whenever an SSR is pulled naturally", () => {
    const rng = createSeededRng("reset-check");
    let pity = 0;
    for (let i = 0; i < 500 && pity !== 0; i++) {
      const result = rollSummon(rng, pity);
      pity = result.nextPityCount;
      if (result.character.rarity === "SSR") {
        expect(pity).toBe(0);
      }
    }
  });

  it("is deterministic for a given rng stream", () => {
    const rngA = createSeededRng("determinism");
    const rngB = createSeededRng("determinism");
    const resultA = rollSummon(rngA, 3);
    const resultB = rollSummon(rngB, 3);
    expect(resultA).toEqual(resultB);
  });
});

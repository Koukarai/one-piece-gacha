import { describe, expect, it } from "vitest";
import { createSeededRng } from "./rng";

describe("createSeededRng", () => {
  it("produces the same sequence for the same seed", () => {
    const a = createSeededRng("battle-123");
    const b = createSeededRng("battle-123");
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createSeededRng("seed-a");
    const b = createSeededRng("seed-b");
    expect(a()).not.toEqual(b());
  });

  it("stays within [0, 1)", () => {
    const rng = createSeededRng("range-check");
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

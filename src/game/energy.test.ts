import { describe, expect, it } from "vitest";
import { computeRegen, ENERGY_REGEN_INTERVAL_MS } from "./energy";

describe("computeRegen", () => {
  it("does not regen before a full tick has elapsed", () => {
    const last = new Date("2026-01-01T00:00:00Z");
    const now = new Date(last.getTime() + ENERGY_REGEN_INTERVAL_MS - 1);
    const result = computeRegen(10, 30, last, now);
    expect(result.newEnergy).toBe(10);
    expect(result.newUpdatedAt).toEqual(last);
  });

  it("grants exactly one tick and advances the timestamp by exactly one interval", () => {
    const last = new Date("2026-01-01T00:00:00Z");
    const now = new Date(last.getTime() + ENERGY_REGEN_INTERVAL_MS);
    const result = computeRegen(10, 30, last, now);
    expect(result.newEnergy).toBe(11);
    expect(result.newUpdatedAt).toEqual(new Date(last.getTime() + ENERGY_REGEN_INTERVAL_MS));
  });

  it("preserves partial progress toward the next tick", () => {
    const last = new Date("2026-01-01T00:00:00Z");
    const partial = ENERGY_REGEN_INTERVAL_MS * 2.5;
    const now = new Date(last.getTime() + partial);
    const result = computeRegen(10, 30, last, now);
    expect(result.newEnergy).toBe(12);
    // Only 2 full ticks consumed; the remaining half-tick should still be owed.
    expect(result.newUpdatedAt).toEqual(new Date(last.getTime() + ENERGY_REGEN_INTERVAL_MS * 2));
  });

  it("caps at max energy and does not overshoot", () => {
    const last = new Date("2026-01-01T00:00:00Z");
    const now = new Date(last.getTime() + ENERGY_REGEN_INTERVAL_MS * 100);
    const result = computeRegen(28, 30, last, now);
    expect(result.newEnergy).toBe(30);
  });

  it("is a no-op when already at max energy", () => {
    const last = new Date("2026-01-01T00:00:00Z");
    const now = new Date(last.getTime() + ENERGY_REGEN_INTERVAL_MS * 10);
    const result = computeRegen(30, 30, last, now);
    expect(result.newEnergy).toBe(30);
    expect(result.newUpdatedAt).toEqual(last);
  });
});

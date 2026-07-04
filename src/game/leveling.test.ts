import { describe, expect, it } from "vitest";
import { powerScore, requiresShardToLevelUp, scaledStat, SHARD_LEVEL_THRESHOLD, statMultiplier, trainCost } from "./leveling";

describe("leveling", () => {
  it("level 1 has a 1x multiplier", () => {
    expect(statMultiplier(1)).toBe(1);
  });

  it("multiplier grows 5% per level above 1", () => {
    expect(statMultiplier(2)).toBeCloseTo(1.05);
    expect(statMultiplier(11)).toBeCloseTo(1.5);
  });

  it("train cost scales linearly with current level", () => {
    expect(trainCost(1)).toBe(200);
    expect(trainCost(5)).toBe(1000);
  });

  it("scaledStat floors the multiplied value", () => {
    expect(scaledStat(3500, 2)).toBe(Math.floor(3500 * 1.05));
  });

  it("powerScore combines hp and atk under the same multiplier", () => {
    expect(powerScore(3500, 450, 1)).toBe(3950);
    expect(powerScore(3500, 450, 3)).toBe(Math.floor((3500 + 450) * 1.1));
  });

  it("does not require a shard when the resulting level stays below the threshold", () => {
    expect(requiresShardToLevelUp(SHARD_LEVEL_THRESHOLD - 2)).toBe(false);
  });

  it("requires a shard exactly when leveling up crosses into the threshold", () => {
    // currentLevel = THRESHOLD - 1 means the *next* level reached is THRESHOLD itself.
    expect(requiresShardToLevelUp(SHARD_LEVEL_THRESHOLD - 1)).toBe(true);
  });

  it("continues requiring a shard for every level beyond the threshold", () => {
    expect(requiresShardToLevelUp(SHARD_LEVEL_THRESHOLD)).toBe(true);
    expect(requiresShardToLevelUp(SHARD_LEVEL_THRESHOLD + 5)).toBe(true);
  });
});

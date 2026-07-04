import { describe, expect, it } from "vitest";
import { computeNextStreak, dailyLoginReward, DAILY_LOGIN_STREAK_CAP, todayUtcDateString } from "./dailyLogin";

describe("computeNextStreak", () => {
  it("starts a new streak at 1 for a first-ever login", () => {
    expect(computeNextStreak(null, "2026-01-05", 0)).toEqual({ newStreak: 1, alreadyClaimedToday: false });
  });

  it("does not double-claim the same day", () => {
    expect(computeNextStreak("2026-01-05", "2026-01-05", 3)).toEqual({ newStreak: 3, alreadyClaimedToday: true });
  });

  it("increments the streak for a consecutive day", () => {
    expect(computeNextStreak("2026-01-05", "2026-01-06", 3)).toEqual({ newStreak: 4, alreadyClaimedToday: false });
  });

  it("resets the streak after a gap of more than one day", () => {
    expect(computeNextStreak("2026-01-01", "2026-01-06", 5)).toEqual({ newStreak: 1, alreadyClaimedToday: false });
  });
});

describe("dailyLoginReward", () => {
  it("scales linearly with streak up to the cap", () => {
    expect(dailyLoginReward(1)).toBe(100);
    expect(dailyLoginReward(3)).toBe(300);
  });

  it("stops scaling past the cap", () => {
    expect(dailyLoginReward(DAILY_LOGIN_STREAK_CAP)).toBe(dailyLoginReward(DAILY_LOGIN_STREAK_CAP + 10));
  });
});

describe("todayUtcDateString", () => {
  it("formats as YYYY-MM-DD in UTC", () => {
    expect(todayUtcDateString(new Date("2026-03-04T23:59:00Z"))).toBe("2026-03-04");
  });
});

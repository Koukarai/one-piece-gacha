export const DAILY_LOGIN_BASE_REWARD = 100;
export const DAILY_LOGIN_STREAK_CAP = 7; // reward stops scaling past a 7-day streak

export interface StreakResult {
  newStreak: number;
  alreadyClaimedToday: boolean;
}

/** Dates are plain "YYYY-MM-DD" strings (UTC), matching a Postgres `date` column. */
export function computeNextStreak(lastLoginDate: string | null, today: string, currentStreak: number): StreakResult {
  if (lastLoginDate === today) {
    return { newStreak: currentStreak, alreadyClaimedToday: true };
  }
  if (lastLoginDate === null) {
    return { newStreak: 1, alreadyClaimedToday: false };
  }

  const last = new Date(`${lastLoginDate}T00:00:00Z`);
  const current = new Date(`${today}T00:00:00Z`);
  const diffDays = Math.round((current.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 1) {
    return { newStreak: currentStreak + 1, alreadyClaimedToday: false };
  }

  // A gap of more than a day (or a clock going backwards) resets the streak.
  return { newStreak: 1, alreadyClaimedToday: false };
}

export function dailyLoginReward(streak: number): number {
  return Math.min(streak, DAILY_LOGIN_STREAK_CAP) * DAILY_LOGIN_BASE_REWARD;
}

export function todayUtcDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

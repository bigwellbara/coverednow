export const LEADERBOARD_PERIODS = {
  month: "This month",
  year: "This year",
  all: "All time",
} as const;

export type LeaderboardPeriod = keyof typeof LEADERBOARD_PERIODS;

export function parsePeriod(value: unknown): LeaderboardPeriod {
  return typeof value === "string" && value in LEADERBOARD_PERIODS
    ? (value as LeaderboardPeriod)
    : "month";
}

/** Where a period starts, at midnight in Harare (UTC+2, no daylight saving). */
export function periodStart(period: LeaderboardPeriod, now: Date): Date | null {
  if (period === "all") return null;
  const [year, month] = now
    .toLocaleDateString("en-CA", { timeZone: "Africa/Harare" })
    .split("-")
    .map(Number);
  const start = Date.UTC(year!, period === "month" ? month! - 1 : 0, 1) - 2 * 60 * 60 * 1000;
  return new Date(start);
}

export type LeaderboardEntry = {
  displayName: string;
  givenCents: number;
  gifts: number;
  students: number;
};

/** Ranks by amount given, with equal amounts sharing a rank (1, 2, 2, 4). */
export function rank<T extends { givenCents: number }>(rows: readonly T[]): Array<T & { rank: number }> {
  const sorted = [...rows].sort((a, b) => b.givenCents - a.givenCents);
  return sorted.map((row, index) => {
    const first = sorted.findIndex((other) => other.givenCents === row.givenCents);
    return { ...row, rank: (first === -1 ? index : first) + 1 };
  });
}

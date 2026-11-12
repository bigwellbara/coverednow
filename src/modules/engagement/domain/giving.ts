/**
 * What a donor's settled gifts add up to: badges, a year in review and a report.
 * Pure functions over plain facts, so they are easy to test and cost nothing to
 * recompute, which means badges never go stale.
 */

/** One settled gift, joined with what is public about its bill. */
export type GiftFact = {
  id: string;
  reference: string;
  billId: string;
  amountCents: number;
  tipCents: number;
  feeCents: number;
  settledAt: Date;
  displayName: string | null;
  campaignId: string | null;
  bill: {
    schoolId: string;
    schoolName: string;
    city: string;
    term: string;
    studentInitials: string;
    studentLevel: string;
    /** True once the bill reached its full amount. */
    funded: boolean;
    statusLabel: string;
  } | null;
};

export type Badge = {
  key: string;
  name: string;
  description: string;
  earned: boolean;
  /** How close they are, such as "2 of 3 schools", while not yet earned. */
  progress: string | null;
};

const monthKey = (date: Date) =>
  date.toLocaleDateString("en-CA", { timeZone: "Africa/Harare" }).slice(0, 7);

/** The longest run of calendar months in a row with at least one gift. */
export function longestMonthlyRun(dates: readonly Date[]): number {
  const months = [...new Set(dates.map(monthKey))].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const month of months) {
    const [year, m] = month.split("-").map(Number);
    const index = year! * 12 + m!;
    run = previous !== null && index === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = index;
  }
  return best;
}

export function badgesFor(gifts: readonly GiftFact[]): Badge[] {
  const totalCents = gifts.reduce((sum, gift) => sum + gift.amountCents, 0);
  const schools = new Set(gifts.flatMap((gift) => (gift.bill ? [gift.bill.schoolId] : []))).size;
  const terms = new Set(gifts.flatMap((gift) => (gift.bill ? [gift.bill.term] : []))).size;
  const fundedBills = new Set(gifts.filter((gift) => gift.bill?.funded).map((gift) => gift.billId))
    .size;
  const throughCampaign = gifts.some((gift) => gift.campaignId !== null);
  const monthlyRun = longestMonthlyRun(gifts.map((gift) => gift.settledAt));
  const dollars = (cents: number) => `$${Math.floor(cents / 100).toLocaleString("en-US")}`;

  const badge = (
    key: string,
    name: string,
    description: string,
    earned: boolean,
    progress: string,
  ): Badge => ({ key, name, description, earned, progress: earned ? null : progress });

  return [
    badge("first-gift", "First gift", "Made your first gift to a student's fees.", gifts.length > 0, "Make your first gift"),
    badge("finisher", "Finisher", "Supported a bill all the way to fully funded.", fundedBills > 0, "Help a bill reach 100%"),
    badge("century", "Century", "Given $100 or more in total.", totalCents >= 10_000, `${dollars(totalCents)} of $100`),
    badge("three-schools", "Across the map", "Supported students at three different schools.", schools >= 3, `${schools} of 3 schools`),
    badge("term-after-term", "Term after term", "Supported fees for three different terms.", terms >= 3, `${terms} of 3 terms`),
    badge("monthly-regular", "Monthly regular", "Gave in three months in a row.", monthlyRun >= 3, `${monthlyRun} of 3 months in a row`),
    badge("circle", "Better together", "Gave through a giving circle or campaign.", throughCampaign, "Give through a campaign"),
    badge("patron", "Patron", "Given $1,000 or more in total.", totalCents >= 100_000, `${dollars(totalCents)} of $1,000`),
  ];
}

export type YearInReview = {
  year: number;
  givenCents: number;
  gifts: number;
  students: number;
  schools: string[];
  cities: string[];
  billsFunded: number;
  biggestGiftCents: number;
  firstGiftAt: Date | null;
  busiestMonth: string | null;
};

export function yearInReview(allGifts: readonly GiftFact[], year: number): YearInReview {
  const gifts = allGifts.filter(
    (gift) => Number(gift.settledAt.toLocaleDateString("en-CA", { timeZone: "Africa/Harare" }).slice(0, 4)) === year,
  );
  const byMonth = new Map<string, number>();
  for (const gift of gifts) {
    const month = gift.settledAt.toLocaleDateString("en-GB", { month: "long", timeZone: "Africa/Harare" });
    byMonth.set(month, (byMonth.get(month) ?? 0) + gift.amountCents);
  }
  const busiest = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0];
  const sorted = [...gifts].sort((a, b) => a.settledAt.getTime() - b.settledAt.getTime());

  return {
    year,
    givenCents: gifts.reduce((sum, gift) => sum + gift.amountCents, 0),
    gifts: gifts.length,
    students: new Set(gifts.map((gift) => gift.billId)).size,
    schools: [...new Set(gifts.flatMap((gift) => (gift.bill ? [gift.bill.schoolName] : [])))].sort(),
    cities: [...new Set(gifts.flatMap((gift) => (gift.bill ? [gift.bill.city] : [])))].sort(),
    billsFunded: new Set(gifts.filter((gift) => gift.bill?.funded).map((gift) => gift.billId)).size,
    biggestGiftCents: Math.max(0, ...gifts.map((gift) => gift.amountCents)),
    firstGiftAt: sorted[0]?.settledAt ?? null,
    busiestMonth: busiest?.[0] ?? null,
  };
}

/** Totals for a report, overall and per school. */
export function reportTotals(gifts: readonly GiftFact[]) {
  const bySchool = new Map<string, { schoolName: string; amountCents: number; students: Set<string> }>();
  for (const gift of gifts) {
    const name = gift.bill?.schoolName ?? "Other";
    const entry = bySchool.get(name) ?? { schoolName: name, amountCents: 0, students: new Set() };
    entry.amountCents += gift.amountCents;
    entry.students.add(gift.billId);
    bySchool.set(name, entry);
  }
  return {
    toSchoolsCents: gifts.reduce((sum, gift) => sum + gift.amountCents, 0),
    tipsCents: gifts.reduce((sum, gift) => sum + gift.tipCents, 0),
    feesCents: gifts.reduce((sum, gift) => sum + gift.feeCents, 0),
    gifts: gifts.length,
    students: new Set(gifts.map((gift) => gift.billId)).size,
    schools: [...bySchool.values()]
      .map((school) => ({ ...school, students: school.students.size }))
      .sort((a, b) => b.amountCents - a.amountCents),
  };
}

/**
 * One CSV cell. Quoted where needed, and with a leading apostrophe on anything a
 * spreadsheet would run as a formula, so a crafted name can't execute.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const money = (cents: number) => (cents / 100).toFixed(2);

export function giftsToCsv(gifts: readonly GiftFact[]): string {
  const header = [
    "Date",
    "Reference",
    "School",
    "City",
    "Term",
    "Student",
    "Level",
    "To school (USD)",
    "Tip (USD)",
    "Processing fee (USD)",
    "Bill status",
    "Shown as",
  ];
  const rows = gifts.map((gift) => [
    gift.settledAt.toISOString().slice(0, 10),
    gift.reference,
    gift.bill?.schoolName ?? "",
    gift.bill?.city ?? "",
    gift.bill?.term ?? "",
    gift.bill?.studentInitials ?? "",
    gift.bill?.studentLevel ?? "",
    money(gift.amountCents),
    money(gift.tipCents),
    money(gift.feeCents),
    gift.bill?.statusLabel ?? "",
    gift.displayName ?? "Anonymous",
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

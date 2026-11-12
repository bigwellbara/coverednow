/**
 * What the public may see of a bill, and how the feed filters and sorts it.
 *
 * Dignity first: the public sees the student's initials and level only. Never a
 * surname, reg number, fee statement or photo, for adults and minors alike.
 */
import { acceptsDonations, type BillStatus } from "./bill-status";
import { BILLER_TYPES, type BillerType } from "./biller";

/** Statuses a bill can be in once the school has confirmed it and money can flow. */
export const PUBLIC_STATUSES = [
  "SCHOOL_CONFIRMED",
  "PARTIALLY_FUNDED",
  "FUNDED",
  "PAID",
  "RECEIPT_CONFIRMED",
] as const satisfies readonly BillStatus[];

export type PublicStatus = (typeof PUBLIC_STATUSES)[number];

export function isPublicStatus(status: BillStatus): status is PublicStatus {
  return (PUBLIC_STATUSES as readonly BillStatus[]).includes(status);
}

export type PublicBill = {
  id: string;
  schoolId: string;
  schoolName: string;
  schoolType: BillerType;
  city: string;
  term: string;
  studentInitials: string;
  studentLevel: string;
  confirmedCents: number;
  raisedCents: number;
  dueDate: Date;
  status: PublicStatus;
  createdAt: Date;
  confirmedAt: Date | null;
  fundedAt: Date | null;
};

/** "Tendai Moyo" becomes "T. M." */
export function initialsOf(firstName: string, lastName: string): string {
  return [firstName, lastName]
    .map((name) => name.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .map((letter) => `${letter}.`)
    .join(" ");
}

export function remainingCents(bill: Pick<PublicBill, "confirmedCents" | "raisedCents">) {
  return Math.max(bill.confirmedCents - bill.raisedCents, 0);
}

/** The calendar day in Zimbabwe, as YYYY-MM-DD, whatever the server's own zone. */
export function harareDay(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Africa/Harare" });
}

/**
 * One open bill to feature for the whole day. Every visitor sees the same one,
 * and it moves on to the next bill at midnight in Harare.
 */
export function billOfTheDay<T extends Pick<PublicBill, "id">>(
  bills: readonly T[],
  now: Date,
): T | null {
  if (bills.length === 0) return null;
  const sorted = [...bills].sort((a, b) => a.id.localeCompare(b.id));
  const dayNumber = Math.floor(Date.parse(harareDay(now)) / 86_400_000);
  return sorted[dayNumber % sorted.length] ?? null;
}

export type NeedSummary = {
  openBills: number;
  schools: number;
  /** What it would take to clear every one of these bills. */
  remainingCents: number;
  /** The average still needed per bill, rounded to the cent. Zero with no bills. */
  averageCents: number;
};

/** The total still needed across open bills, as shown to large donors. */
export function summariseNeed(
  bills: readonly Pick<PublicBill, "schoolId" | "confirmedCents" | "raisedCents">[],
): NeedSummary {
  const total = bills.reduce((sum, bill) => sum + remainingCents(bill), 0);
  return {
    openBills: bills.length,
    schools: new Set(bills.map((bill) => bill.schoolId)).size,
    remainingCents: total,
    averageCents: bills.length === 0 ? 0 : Math.round(total / bills.length),
  };
}

/** Rounded down, so a bill never reads 100% until it is fully funded. */
export function percentFunded(
  bill: Pick<PublicBill, "confirmedCents" | "raisedCents">,
): number {
  if (bill.confirmedCents <= 0) return 0;
  return Math.min(Math.floor((bill.raisedCents * 100) / bill.confirmedCents), 100);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until the due date, counting a bill due later today as 0. */
export function daysLeft(dueDate: Date, now: Date): number {
  return Math.max(Math.floor((dueDate.getTime() - now.getTime()) / DAY_MS), 0);
}

/** Real dates only: no invented urgency. */
export function dueLabel(dueDate: Date, now: Date): string {
  if (dueDate <= now) return "Past due";
  const days = daysLeft(dueDate, now);
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

/** Open to donations right now: the status allows it and the due date hasn't passed. */
export function isOpenForDonations(
  bill: Pick<PublicBill, "status" | "dueDate">,
  now: Date,
): boolean {
  return acceptsDonations(bill.status) && bill.dueDate > now;
}

// ------------------------------------------------------------------- the feed

export const FEED_SORTS = {
  "almost-funded": "Almost funded",
  "due-soon": "Due soonest",
  smallest: "Smallest amount needed",
  newest: "Newest",
} as const;

export type FeedSort = keyof typeof FEED_SORTS;

/** Choices for "amount still needed", in cents. */
export const FEED_AMOUNT_CAPS = [5_000, 10_000, 25_000, 50_000] as const;

export type FeedFilter = {
  type: BillerType | null;
  schoolId: string | null;
  maxRemainingCents: number | null;
  sort: FeedSort;
};

export const DEFAULT_FEED_FILTER: FeedFilter = {
  type: null,
  schoolId: null,
  maxRemainingCents: null,
  sort: "almost-funded",
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Reads the feed's query string. Anything unexpected falls back to the default. */
export function parseFeedFilter(params: SearchParams): FeedFilter {
  const type = first(params.type);
  const school = first(params.school);
  const max = Number(first(params.max));
  const sort = first(params.sort);

  return {
    type: (BILLER_TYPES as readonly string[]).includes(type ?? "")
      ? (type as BillerType)
      : null,
    schoolId: school && /^[a-z0-9]{1,40}$/i.test(school) ? school : null,
    maxRemainingCents: (FEED_AMOUNT_CAPS as readonly number[]).includes(max)
      ? max
      : null,
    sort: sort && sort in FEED_SORTS ? (sort as FeedSort) : DEFAULT_FEED_FILTER.sort,
  };
}

const COMPARATORS: Record<FeedSort, (a: PublicBill, b: PublicBill) => number> = {
  "almost-funded": (a, b) =>
    percentFunded(b) - percentFunded(a) || a.dueDate.getTime() - b.dueDate.getTime(),
  "due-soon": (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
  smallest: (a, b) => remainingCents(a) - remainingCents(b),
  newest: (a, b) =>
    (b.confirmedAt ?? b.createdAt).getTime() - (a.confirmedAt ?? a.createdAt).getTime(),
};

/** Only bills open for donations, filtered and sorted. Ties keep a stable order. */
export function applyFeedFilter(
  bills: readonly PublicBill[],
  filter: FeedFilter,
  now: Date,
): PublicBill[] {
  return bills
    .filter((bill) => isOpenForDonations(bill, now))
    .filter((bill) => !filter.type || bill.schoolType === filter.type)
    .filter((bill) => !filter.schoolId || bill.schoolId === filter.schoolId)
    .filter(
      (bill) =>
        filter.maxRemainingCents === null ||
        remainingCents(bill) <= filter.maxRemainingCents,
    )
    .sort((a, b) => COMPARATORS[filter.sort](a, b) || a.id.localeCompare(b.id));
}

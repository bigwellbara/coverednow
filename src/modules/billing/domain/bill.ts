import type { BillStatus } from "./bill-status";
import type { BillerType } from "./biller";

const TERM_PERIODS = {
  T1: "Term 1",
  T2: "Term 2",
  T3: "Term 3",
  S1: "Semester 1",
  S2: "Semester 2",
} as const;

/**
 * Terms are stored as "2027-T1". Picking from a list rather than typing means
 * "Term 1 2027" and "2027 term one" can't slip past the one-bill-per-term rule.
 */
export function isValidTerm(term: string): boolean {
  return /^\d{4}-(T[1-3]|S[12])$/.test(term);
}

export function termLabel(term: string): string {
  const [year, period] = term.split("-");
  const name = TERM_PERIODS[period as keyof typeof TERM_PERIODS];
  return name ? `${name}, ${year}` : term;
}

export function termOptions(now: Date): Array<{ value: string; label: string }> {
  const year = now.getUTCFullYear();
  return [year, year + 1].flatMap((optionYear) =>
    Object.keys(TERM_PERIODS).map((period) => {
      const value = `${optionYear}-${period}`;
      return { value, label: termLabel(value) };
    }),
  );
}

/** Capitalisation and spacing shouldn't make one reg number look like two. */
export function normalizeRegNumber(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function isValidRegNumber(regNumber: string): boolean {
  return /^[A-Z0-9/-]{3,30}$/.test(regNumber);
}

/**
 * A bill is due at the end of the day in Zimbabwe (UTC+2, no daylight saving), so
 * one due today isn't treated as overdue this morning.
 */
export function parseDueDate(input: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return null;

  const [year, month, day] = [match[1], match[2], match[3]].map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!isRealDate) return null;

  return new Date(Date.UTC(year, month - 1, day, 21, 59, 59, 999));
}

/** High school accounts are owned by a guardian, so minors never hold accounts. */
export function schoolTypesFor(
  role: "STUDENT" | "GUARDIAN",
): readonly BillerType[] {
  return role === "GUARDIAN" ? ["HIGH_SCHOOL"] : ["UNIVERSITY", "COLLEGE"];
}

export const REJECTED_BY_SCHOOL_REASON =
  "The school couldn't match this bill to one of its students. Please check the reg number.";

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  DRAFT: "Draft",
  PENDING_SCHOOL: "Waiting for the school",
  SCHOOL_CONFIRMED: "Confirmed by the school",
  PARTIALLY_FUNDED: "Partly funded",
  FUNDED: "Fully funded",
  PAID: "Paid to the school",
  RECEIPT_CONFIRMED: "Received by the school",
  REJECTED: "Not accepted",
  EXPIRED: "Expired",
  CANCELLED: "Withdrawn",
  DISPUTED: "Under review",
};

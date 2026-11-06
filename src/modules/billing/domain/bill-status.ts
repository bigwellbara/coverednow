/**
 * Bill status rules: which status changes are legal, who may make them, and
 * what must be true at the time.
 *
 * Pure business rules with no framework imports. Amounts are integer cents so
 * funding checks never depend on floating point; convert from Prisma's Decimal
 * in the adapter layer.
 */

export const BILL_STATUSES = [
  "DRAFT",
  "PENDING_SCHOOL",
  "SCHOOL_CONFIRMED",
  "PARTIALLY_FUNDED",
  "FUNDED",
  "PAID",
  "RECEIPT_CONFIRMED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "DISPUTED",
] as const;

export type BillStatus = (typeof BILL_STATUSES)[number];

/**
 * OWNER is the student or guardian who owns the bill. SYSTEM is automation such
 * as payment webhooks and the expiry job.
 */
export type BillActor = "OWNER" | "SCHOOL" | "ADMIN" | "SYSTEM";

/** Facts about the bill at the moment of the change. */
export type BillContext = {
  /** The school's figure. Null until the school has responded. */
  confirmedCents: number | null;
  /** Sum of settled, unrefunded donations (excludes tips and gateway fees). */
  settledCents: number;
  /** Whether a payout with proof of payment is recorded against the bill. */
  hasPayoutProof: boolean;
  dueDate: Date;
  now: Date;
};

export type TransitionDenial =
  | "ILLEGAL_TRANSITION"
  | "ACTOR_NOT_ALLOWED"
  | "AMOUNT_NOT_CONFIRMED"
  | "DUE_DATE_PASSED"
  | "NOT_PAST_DUE"
  | "FUNDS_ATTACHED"
  | "NO_FUNDS"
  | "NOT_FULLY_FUNDED"
  | "ALREADY_FULLY_FUNDED"
  | "PAYOUT_PROOF_MISSING";

export type TransitionResult =
  | { ok: true }
  | { ok: false; reason: TransitionDenial };

/** Legal changes, and who may make each one. Anything not listed is illegal. */
const TRANSITIONS: Record<
  BillStatus,
  Partial<Record<BillStatus, readonly BillActor[]>>
> = {
  DRAFT: {
    PENDING_SCHOOL: ["OWNER"],
    CANCELLED: ["OWNER", "ADMIN"],
  },
  PENDING_SCHOOL: {
    SCHOOL_CONFIRMED: ["SCHOOL"],
    REJECTED: ["SCHOOL", "ADMIN"],
    EXPIRED: ["SYSTEM"],
    CANCELLED: ["OWNER", "ADMIN"],
  },
  SCHOOL_CONFIRMED: {
    PARTIALLY_FUNDED: ["SYSTEM"],
    FUNDED: ["SYSTEM"], // a single donation can cover the whole bill
    REJECTED: ["ADMIN"],
    EXPIRED: ["SYSTEM"],
    CANCELLED: ["OWNER", "ADMIN"],
    DISPUTED: ["ADMIN"],
  },
  PARTIALLY_FUNDED: {
    SCHOOL_CONFIRMED: ["SYSTEM"], // every donation so far was refunded
    FUNDED: ["SYSTEM"],
    DISPUTED: ["ADMIN"],
  },
  FUNDED: {
    SCHOOL_CONFIRMED: ["SYSTEM"], // refunds before payout
    PARTIALLY_FUNDED: ["SYSTEM"],
    PAID: ["ADMIN"],
    DISPUTED: ["ADMIN"],
  },
  PAID: {
    RECEIPT_CONFIRMED: ["SCHOOL"],
    DISPUTED: ["SCHOOL", "ADMIN"], // for example, the school never got the money
  },
  RECEIPT_CONFIRMED: {},
  REJECTED: {},
  EXPIRED: {
    PENDING_SCHOOL: ["OWNER", "ADMIN"], // relisting goes back through the school
  },
  CANCELLED: {},
  DISPUTED: {
    SCHOOL_CONFIRMED: ["ADMIN"],
    PARTIALLY_FUNDED: ["ADMIN"],
    FUNDED: ["ADMIN"],
    PAID: ["ADMIN"],
    REJECTED: ["ADMIN"],
    CANCELLED: ["ADMIN"],
  },
};

const deny = (reason: TransitionDenial): TransitionResult => ({
  ok: false,
  reason,
});
const ALLOW: TransitionResult = { ok: true };

/** What the destination status requires to be true, wherever the bill came from. */
function checkGuards(
  to: BillStatus,
  { confirmedCents, settledCents, hasPayoutProof, dueDate, now }: BillContext,
): TransitionResult {
  const isConfirmed = confirmedCents !== null && confirmedCents > 0;
  const isFullyFunded = isConfirmed && settledCents >= confirmedCents;

  switch (to) {
    case "PENDING_SCHOOL":
      // A past-due bill with no funding is expired, so it cannot be (re)listed
      // until its due date has been updated.
      return now > dueDate ? deny("DUE_DATE_PASSED") : ALLOW;

    case "SCHOOL_CONFIRMED":
      if (!isConfirmed) return deny("AMOUNT_NOT_CONFIRMED");
      return settledCents > 0 ? deny("FUNDS_ATTACHED") : ALLOW;

    case "PARTIALLY_FUNDED":
      if (!isConfirmed) return deny("AMOUNT_NOT_CONFIRMED");
      if (settledCents <= 0) return deny("NO_FUNDS");
      return isFullyFunded ? deny("ALREADY_FULLY_FUNDED") : ALLOW;

    case "FUNDED":
      if (!isConfirmed) return deny("AMOUNT_NOT_CONFIRMED");
      return isFullyFunded ? ALLOW : deny("NOT_FULLY_FUNDED");

    case "PAID":
      if (!isFullyFunded) return deny("NOT_FULLY_FUNDED");
      return hasPayoutProof ? ALLOW : deny("PAYOUT_PROOF_MISSING");

    case "EXPIRED":
      if (settledCents > 0) return deny("FUNDS_ATTACHED");
      return now > dueDate ? ALLOW : deny("NOT_PAST_DUE");

    // Money must be refunded before a bill can close without reaching the school.
    case "REJECTED":
    case "CANCELLED":
      return settledCents > 0 ? deny("FUNDS_ATTACHED") : ALLOW;

    default:
      return ALLOW;
  }
}

/** Decides whether `actor` may move a bill from `from` to `to` right now. */
export function checkTransition(
  from: BillStatus,
  to: BillStatus,
  actor: BillActor,
  context: BillContext,
): TransitionResult {
  const allowedActors = TRANSITIONS[from][to];
  if (!allowedActors) return deny("ILLEGAL_TRANSITION");
  if (!allowedActors.includes(actor)) return deny("ACTOR_NOT_ALLOWED");
  return checkGuards(to, context);
}

/** A funded bill closes to new donations, and only confirmed amounts are shown. */
export function acceptsDonations(status: BillStatus): boolean {
  return status === "SCHOOL_CONFIRMED" || status === "PARTIALLY_FUNDED";
}

/** Rank credit is given only once the school has confirmed receipt. */
export function countsTowardLeaderboards(status: BillStatus): boolean {
  return status === "RECEIPT_CONFIRMED";
}

export type FundingPosition = {
  status: "SCHOOL_CONFIRMED" | "PARTIALLY_FUNDED" | "FUNDED";
  remainingCents: number;
  /**
   * Money received beyond the confirmed amount, to refund or roll over. Two
   * donors can pay at once, so a webhook may report more than was outstanding.
   */
  surplusCents: number;
};

/** The funding status a bill's settled total implies. */
export function fundingPosition(
  confirmedCents: number,
  settledCents: number,
): FundingPosition {
  const remainingCents = Math.max(confirmedCents - settledCents, 0);
  const surplusCents = Math.max(settledCents - confirmedCents, 0);
  const status =
    remainingCents === 0
      ? "FUNDED"
      : settledCents > 0
        ? "PARTIALLY_FUNDED"
        : "SCHOOL_CONFIRMED";
  return { status, remainingCents, surplusCents };
}

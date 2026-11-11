/**
 * Checkout rules: what a donor pays, and what each part of it is for.
 *
 * The school always gets the full donation. The donor also covers the gateway's
 * cost, and may add an optional tip that funds the platform. Amounts are integer
 * cents throughout. No server-only imports: the checkout form uses this too.
 */
import { z } from "zod";

export const MIN_DONATION_CENTS = 100;

/** Pre-selected but removable, and the full breakdown is shown before paying. */
export const TIP_PERCENTS = [0, 5, 7, 10, 15] as const;
export type TipPercent = (typeof TIP_PERCENTS)[number];
export const DEFAULT_TIP_PERCENT: TipPercent = 7;

/**
 * An estimate of the gateway's cut, used until it is set from the merchant
 * agreement through PAYMENT_FEE_PERCENT. Confirm it with Paynow before launch.
 */
export const DEFAULT_GATEWAY_FEE_BPS = 250;

export function isTipPercent(value: number): value is TipPercent {
  return (TIP_PERCENTS as readonly number[]).includes(value);
}

/** "2.5" becomes 250 basis points. Null for anything outside 0% to 10%. */
export function parseFeePercent(input: string | undefined): number | null {
  if (input === undefined || !/^\d{1,2}(\.\d{1,2})?$/.test(input.trim())) return null;
  const bps = Math.round(Number(input) * 100);
  return bps >= 0 && bps <= 1000 ? bps : null;
}

export type Quote = {
  /** Goes to the school, in full. */
  amountCents: number;
  /** Optional, funds the platform. */
  tipCents: number;
  /** Covers the gateway's percentage of the whole payment. */
  feeCents: number;
  totalCents: number;
};

/**
 * The gateway takes its percentage of everything charged, fee included. The fee
 * is rounded up, so the school and the tip are never short.
 */
export function quote(amountCents: number, tipPercent: TipPercent, feeBps: number): Quote {
  const tipCents = Math.round((amountCents * tipPercent) / 100);
  const subtotal = amountCents + tipCents;
  const feeCents = feeBps > 0 ? Math.ceil((subtotal * feeBps) / (10_000 - feeBps)) : 0;
  return { amountCents, tipCents, feeCents, totalCents: subtotal + feeCents };
}

export type AmountProblem = "TOO_SMALL" | "MORE_THAN_NEEDED";

/** A donation must be at least $1 and no more than the bill still needs. */
export function checkAmount(amountCents: number, remainingCents: number): AmountProblem | null {
  if (!Number.isInteger(amountCents) || amountCents < MIN_DONATION_CENTS) return "TOO_SMALL";
  if (amountCents > remainingCents) return "MORE_THAN_NEEDED";
  return null;
}

/** Suggested amounts: the full balance first, then round figures below it. */
export function suggestedAmounts(remainingCents: number): number[] {
  const rounds = [1_000, 2_500, 5_000, 10_000].filter(
    (cents) => cents < remainingCents && cents >= MIN_DONATION_CENTS,
  );
  return remainingCents >= MIN_DONATION_CENTS ? [remainingCents, ...rounds] : [];
}

// --------------------------------------------------------------- visibility

export const VISIBILITIES = ["PUBLIC", "ALIAS", "ANONYMOUS"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: "Show my name",
  ALIAS: "Use another name",
  ANONYMOUS: "Anonymous",
};

const aliasSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  // Letters, numbers, spaces and simple punctuation: no links or markup.
  .regex(/^[\p{L}\p{N} .,'&-]+$/u);

/**
 * The name shown with a gift, fixed when it is made. Null for anonymous gifts,
 * and undefined if the alias isn't acceptable.
 */
export function displayNameFor(
  visibility: Visibility,
  accountName: string,
  alias: string,
): string | null | undefined {
  if (visibility === "ANONYMOUS") return null;
  if (visibility === "PUBLIC") return accountName;
  const parsed = aliasSchema.safeParse(alias);
  return parsed.success ? parsed.data : undefined;
}

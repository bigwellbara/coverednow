import { z } from "zod";
import { normalizeZimbabweMobile } from "../../identity/domain/phone";

export const BILLER_TYPES = ["UNIVERSITY", "COLLEGE", "HIGH_SCHOOL"] as const;
export type BillerType = (typeof BILLER_TYPES)[number];

export const BILLER_TYPE_LABELS: Record<BillerType, string> = {
  UNIVERSITY: "University",
  COLLEGE: "College",
  HIGH_SCHOOL: "High school",
};

export const PAYOUT_METHODS = ["BANK", "MOBILE_MONEY", "MERCHANT"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  BANK: "Bank transfer",
  MOBILE_MONEY: "Mobile money",
  MERCHANT: "Merchant code",
};

const requiredText = (max: number) => z.string().trim().min(1).max(max);

const mobileNumber = z.string().transform((value, context) => {
  const phone = normalizeZimbabweMobile(value);
  if (!phone) {
    context.addIssue({ code: "custom", message: "Not a Zimbabwean mobile number" });
    return z.NEVER;
  }
  return phone;
});

export const billerDetailsSchema = z.object({
  name: requiredText(150),
  type: z.enum(BILLER_TYPES),
  city: requiredText(80),
});
export type BillerDetails = z.infer<typeof billerDetailsSchema>;

export const contactDetailsSchema = z.object({
  name: requiredText(100),
  phone: mobileNumber,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .or(z.literal("").transform(() => undefined))
    .optional(),
  roleTitle: requiredText(80),
});
export type ContactDetails = z.infer<typeof contactDetailsSchema>;

/** Spaces and dashes are common in account numbers but are not part of them. */
const digits = (min: number, max: number) =>
  z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(new RegExp(`^[0-9]{${min},${max}}$`)));

export const payoutDetailsSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("BANK"),
    bankName: requiredText(80),
    branch: requiredText(80),
    accountName: requiredText(150),
    accountNumber: digits(5, 20),
  }),
  z.object({
    method: z.literal("MOBILE_MONEY"),
    provider: requiredText(40),
    accountName: requiredText(150),
    number: mobileNumber,
  }),
  z.object({
    method: z.literal("MERCHANT"),
    provider: requiredText(40),
    accountName: requiredText(150),
    merchantCode: requiredText(40),
  }),
]);
export type PayoutDetails = z.infer<typeof payoutDetailsSchema>;

function lastFour(value: string): string {
  return value.slice(-4);
}

/** The only form of payout details ever shown on a page. */
export function describePayout(details: PayoutDetails): string {
  switch (details.method) {
    case "BANK":
      return `${details.bankName}, ${details.accountName}, account ending ${lastFour(details.accountNumber)}`;
    case "MOBILE_MONEY":
      return `${details.provider}, ${details.accountName}, number ending ${lastFour(details.number)}`;
    case "MERCHANT":
      return `${details.provider}, ${details.accountName}, code ending ${lastFour(details.merchantCode)}`;
  }
}

export type VerificationBlocker =
  | "PAYOUT_DETAILS_MISSING"
  | "VERIFIED_CONTACT_MISSING";

/**
 * A school can only be listed once money has somewhere to go and someone we have
 * checked can confirm its bills.
 */
export function verificationBlockers(school: {
  hasPayoutDetails: boolean;
  verifiedContacts: number;
}): VerificationBlocker[] {
  const blockers: VerificationBlocker[] = [];
  if (!school.hasPayoutDetails) blockers.push("PAYOUT_DETAILS_MISSING");
  if (school.verifiedContacts < 1) blockers.push("VERIFIED_CONTACT_MISSING");
  return blockers;
}

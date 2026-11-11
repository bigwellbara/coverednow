import { z } from "zod";
import { normalizeZimbabweMobile } from "./phone";

export const APPLICANT_ROLES = ["STUDENT", "GUARDIAN"] as const;
export type ApplicantRole = (typeof APPLICANT_ROLES)[number];

export function isApplicantRole(role: string): role is ApplicantRole {
  return (APPLICANT_ROLES as readonly string[]).includes(role);
}

/** The roles anyone may pick for themselves. Admins are only ever made by a script. */
export const SIGN_UP_ROLES = [...APPLICANT_ROLES, "DONOR"] as const;

/** Where each role lands after signing in. */
export function homePathFor(role: string): string {
  if (role === "ADMIN") return "/admin/verifications";
  if (role === "DONOR") return "/giving";
  return "/onboarding";
}

/**
 * A path on this site to return to after signing in, or null. Refuses anything
 * that could leave the site, such as "//evil.test" or "/\evil.test".
 */
export function safeNextPath(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 200) return null;
  return /^\/(?![/\\])[\w\-./?=&%]*$/.test(input) ? input : null;
}

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/** A phone or email that has been, or is about to be, proven with a code. */
export type SignInAddress = { kind: "PHONE" | "EMAIL"; value: string };

export function parseSignInAddress(input: string): SignInAddress | null {
  if (input.includes("@")) {
    const email = emailSchema.safeParse(input);
    return email.success ? { kind: "EMAIL", value: email.data } : null;
  }
  const phone = normalizeZimbabweMobile(input);
  return phone ? { kind: "PHONE", value: phone } : null;
}

/**
 * What a new account supplies, besides the address it proved. Only the sign-up
 * roles can be chosen, so no form input can ever create an admin. There's no second
 * email or phone here: an unproven one could claim someone else's address.
 */
export const signUpDetailsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.enum(SIGN_UP_ROLES),
});

export type SignUpDetails = z.infer<typeof signUpDetailsSchema>;

export const studentDetailsSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  level: z.string().trim().min(1).max(40),
});

export type StudentDetails = z.infer<typeof studentDetailsSchema>;

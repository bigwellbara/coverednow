import { z } from "zod";

export const APPLICANT_ROLES = ["STUDENT", "GUARDIAN"] as const;
export type ApplicantRole = (typeof APPLICANT_ROLES)[number];

export function isApplicantRole(role: string): role is ApplicantRole {
  return (APPLICANT_ROLES as readonly string[]).includes(role);
}

/**
 * What a new account supplies. Only applicant roles can be chosen here, so no
 * form input can ever create an admin.
 */
export const signUpDetailsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .or(z.literal("").transform(() => undefined))
    .optional(),
  role: z.enum(APPLICANT_ROLES),
});

export type SignUpDetails = z.infer<typeof signUpDetailsSchema>;

export const studentDetailsSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  level: z.string().trim().min(1).max(40),
});

export type StudentDetails = z.infer<typeof studentDetailsSchema>;

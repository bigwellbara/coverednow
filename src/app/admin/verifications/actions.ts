"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  VERIFICATION_ERROR_MESSAGES,
  getVerificationService,
} from "@/modules/identity";
import { requireAdmin } from "@/modules/identity/adapters/session";

export type ReviewFormState = { error?: string };

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({ id: z.string().min(1), decision: z.literal("APPROVED") }),
  z.object({
    id: z.string().min(1),
    decision: z.literal("REJECTED"),
    reason: z.string().trim().min(3).max(500),
  }),
]);

export async function reviewVerificationAction(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const admin = await requireAdmin();

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please tell the applicant what needs fixing." };
  }

  const { id, ...decision } = parsed.data;
  const result = await getVerificationService().review(id, admin.id, decision);
  if (!result.ok) return { error: VERIFICATION_ERROR_MESSAGES[result.error] };

  revalidatePath("/admin/verifications");
  redirect("/admin/verifications");
}

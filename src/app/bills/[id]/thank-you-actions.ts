"use server";

import { revalidatePath } from "next/cache";
import type { FormActionState } from "@/components/use-form-action";
import { getEngagementService, NOTE_ERROR_MESSAGES } from "@/modules/engagement";
import { requireApplicant } from "@/modules/identity/adapters/session";

export async function submitThankYouAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const owner = await requireApplicant();
  const billId = String(formData.get("billId") ?? "");
  const result = await getEngagementService().submitNote(owner.id, billId, String(formData.get("body") ?? ""));
  if (!result.ok) return { error: NOTE_ERROR_MESSAGES[result.error] };
  revalidatePath(`/bills/${billId}`);
  return { success: "Thank you! We'll share your note with your donors once we've checked it." };
}

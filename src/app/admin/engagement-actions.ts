"use server";

import { revalidatePath } from "next/cache";
import type { FormActionState } from "@/components/use-form-action";
import { parseAmountToCents } from "@/modules/billing/domain/money";
import { getEngagementService } from "@/modules/engagement";
import { requireAdmin } from "@/modules/identity/adapters/session";

export async function reviewNoteAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const admin = await requireAdmin();
  const decision = formData.get("decision");
  if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Please choose an answer." };
  const result = await getEngagementService().reviewNote(admin.id, String(formData.get("noteId")), decision);
  revalidatePath("/admin/notes");
  if (!result.ok) return { error: "Someone has already reviewed this note." };
  return { success: decision === "APPROVED" ? "Approved and sent to donors." : "Not shared." };
}

export async function setMatchAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const admin = await requireAdmin();
  const campaignId = String(formData.get("campaignId"));
  const service = getEngagementService();

  if (formData.get("remove") === "1") {
    await service.setMatch(admin.id, campaignId, null);
    revalidatePath("/admin/campaigns");
    return { success: "Match removed." };
  }

  const matcherName = String(formData.get("matcherName") ?? "").trim();
  const capCents = parseAmountToCents(String(formData.get("cap") ?? ""));
  if (matcherName.length < 2 || matcherName.length > 80) return { error: "Please enter who is matching." };
  if (capCents === null || capCents <= 0) return { error: "Please enter the most they will match, such as 5000." };

  await service.setMatch(admin.id, campaignId, { matcherName, capCents });
  revalidatePath("/admin/campaigns");
  return { success: `Saved. ${matcherName}'s match now shows on the campaign.` };
}

export async function setHiddenAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const admin = await requireAdmin();
  const hidden = formData.get("hidden") === "1";
  await getEngagementService().setHidden(admin.id, String(formData.get("campaignId")), hidden);
  revalidatePath("/admin/campaigns");
  return { success: hidden ? "Taken off the site." : "Back on the site." };
}

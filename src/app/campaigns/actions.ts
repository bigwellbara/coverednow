"use server";

import { redirect } from "next/navigation";
import type { FormActionState } from "@/components/use-form-action";
import { parseAmountToCents } from "@/modules/billing/domain/money";
import { CAMPAIGN_ERROR_MESSAGES, getEngagementService } from "@/modules/engagement";
import { currentUser } from "@/modules/identity/adapters/session";

export async function createCampaignAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await currentUser();
  if (!user) return { error: "Please sign in again to start a campaign." };

  const goalCents = parseAmountToCents(String(formData.get("goal") ?? ""));
  const endsOn = String(formData.get("endsOn") ?? "");
  // The end date runs to the end of that day in Harare (UTC+2).
  const endsAt = endsOn ? new Date(`${endsOn}T23:59:59+02:00`) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) return { error: "Please choose a valid end date." };

  const result = await getEngagementService().createCampaign(user.id, {
    kind: formData.get("kind"),
    title: String(formData.get("title") ?? ""),
    story: String(formData.get("story") ?? ""),
    goalCents: goalCents ?? 0,
    endsAt,
  });
  if (!result.ok) return { error: CAMPAIGN_ERROR_MESSAGES[result.error] };
  redirect(`/campaigns/${result.slug}`);
}

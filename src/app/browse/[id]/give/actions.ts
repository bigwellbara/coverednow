"use server";

import { parseAmountToCents } from "@/modules/billing/domain/money";
import { getEngagementService } from "@/modules/engagement";
import { currentUser } from "@/modules/identity/adapters/session";
import { CHECKOUT_ERROR_MESSAGES, getPaymentService } from "@/modules/payments";
import { VISIBILITIES, type Visibility } from "@/modules/payments/domain/checkout";

export type CheckoutActionResult = { redirectUrl: string } | { error: string };

export async function startCheckoutAction(input: {
  billId: string;
  amount: string;
  tipPercent: number;
  visibility: string;
  alias: string;
  /** The slug of the campaign the donor came from, if any. */
  campaign?: string | null;
}): Promise<CheckoutActionResult> {
  const user = await currentUser();
  if (!user) return { error: "Please sign in again to give." };

  // A closed or unknown campaign doesn't stop the gift; it just isn't credited.
  const campaignId = input.campaign
    ? await getEngagementService().openCampaignId(String(input.campaign))
    : null;

  const amountCents = parseAmountToCents(String(input.amount));
  if (amountCents === null) return { error: "Please enter an amount, such as 25 or 25.50." };
  if (!(VISIBILITIES as readonly string[]).includes(input.visibility)) {
    return { error: "Please choose how your name is shown." };
  }

  const result = await getPaymentService().startCheckout(
    { id: user.id, name: user.name },
    {
      billId: String(input.billId),
      amountCents,
      tipPercent: Number(input.tipPercent),
      visibility: input.visibility as Visibility,
      alias: String(input.alias ?? ""),
      campaignId,
    },
  );
  return result.ok
    ? { redirectUrl: result.redirectUrl }
    : { error: CHECKOUT_ERROR_MESSAGES[result.error] };
}

"use server";

import { parseAmountToCents } from "@/modules/billing/domain/money";
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
}): Promise<CheckoutActionResult> {
  const user = await currentUser();
  if (!user) return { error: "Please sign in again to give." };

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
    },
  );
  return result.ok
    ? { redirectUrl: result.redirectUrl }
    : { error: CHECKOUT_ERROR_MESSAGES[result.error] };
}

"use server";

import { revalidatePath } from "next/cache";
import type { FormActionState } from "@/components/use-form-action";
import { getBillService } from "@/modules/billing";
import { parseAmountToCents } from "@/modules/billing/domain/money";
import type { ConfirmationDecision } from "@/modules/billing/services/bill-service";

/**
 * The signed link is the only credential here, because bursars don't have
 * accounts. Payout details are never read or changed through this page.
 */
export async function respondToBillAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const token = formData.get("token");
  const choice = formData.get("decision");
  if (typeof token !== "string") return { error: "This link isn't valid." };

  let decision: ConfirmationDecision;
  if (choice === "CONFIRM" || choice === "REJECT") {
    decision = { decision: choice };
  } else if (choice === "CORRECT") {
    const amount = formData.get("amount");
    const amountCents =
      typeof amount === "string" ? parseAmountToCents(amount) : null;
    if (amountCents === null) {
      return { error: "Please enter the correct amount, such as 200.50." };
    }
    decision = { decision: "CORRECT", amountCents };
  } else {
    return { error: "Please choose an answer." };
  }

  const recorded = await getBillService().respond(token, decision);
  revalidatePath(`/confirm/${token}`);
  return recorded
    ? { success: "Thank you. Your answer has been recorded." }
    : { error: "This link is no longer open." };
}

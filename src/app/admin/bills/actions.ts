"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormActionState } from "@/components/use-form-action";
import { BILL_ERROR_MESSAGES, getBillService } from "@/modules/billing";
import { requireAdmin } from "@/modules/identity/adapters/session";

export async function resendLinksAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  const billId = formData.get("billId");
  if (typeof billId !== "string") return { error: "That bill no longer exists." };

  const { sent, failed } = await getBillService().sendConfirmationLinks(billId);
  revalidatePath(`/admin/bills/${billId}`);

  if (sent === 0 && failed === 0) {
    return { error: "There's nobody to send to, or this bill is no longer waiting." };
  }
  return failed > 0
    ? { error: `Sent ${sent}, but ${failed} could not be delivered. Check the logs.` }
    : { success: `Sent ${sent} link${sent === 1 ? "" : "s"}.` };
}

export async function rejectBillAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      billId: z.string().min(1),
      reason: z.string().trim().min(3).max(500),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please say why, as the owner will see it." };

  const result = await getBillService().rejectAsAdmin(
    parsed.data.billId,
    admin.id,
    parsed.data.reason,
  );
  if (!result.ok) return { error: BILL_ERROR_MESSAGES[result.error] };

  revalidatePath("/admin/bills");
  revalidatePath(`/admin/bills/${parsed.data.billId}`);
  return { success: "Bill rejected." };
}

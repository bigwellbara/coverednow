"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { FormActionState } from "@/components/use-form-action";
import { BILL_ERROR_MESSAGES, getBillService } from "@/modules/billing";
import { parseDueDate } from "@/modules/billing/domain/bill";
import { parseAmountToCents } from "@/modules/billing/domain/money";
import { requireApplicant } from "@/modules/identity/adapters/session";
import { MAX_DOCUMENT_BYTES } from "@/modules/identity/domain/verification";

export async function submitBillAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const owner = await requireApplicant();

  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  const claimedCents = parseAmountToCents(text("amount"));
  if (claimedCents === null) {
    return { error: "Please enter the amount owed, such as 200.50." };
  }
  const dueDate = parseDueDate(text("dueDate"));
  if (!dueDate) return { error: "Please enter the due date." };

  const statement = formData.get("statement");
  if (!(statement instanceof File) || statement.size === 0) {
    return { error: "Please upload the fee statement." };
  }
  // Checked before reading the file into memory.
  if (statement.size > MAX_DOCUMENT_BYTES) {
    return { error: BILL_ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  const service = getBillService();
  const result = await service.submit(owner, {
    billerId: text("billerId"),
    regNumber: text("regNumber"),
    term: text("term"),
    claimedCents,
    dueDate,
    statement: new Uint8Array(await statement.arrayBuffer()),
  });
  if (!result.ok) return { error: BILL_ERROR_MESSAGES[result.error] };

  // After the response, so a slow WhatsApp connection doesn't hold up the page.
  after(() => service.sendConfirmationLinks(result.id));

  revalidatePath("/bills");
  redirect(`/bills/${result.id}`);
}

export async function withdrawBillAction(
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const owner = await requireApplicant();
  const billId = formData.get("billId");
  if (typeof billId !== "string") return { error: "That bill no longer exists." };

  const result = await getBillService().withdraw(owner.id, billId);
  if (!result.ok) return { error: BILL_ERROR_MESSAGES[result.error] };

  revalidatePath("/bills");
  revalidatePath(`/bills/${billId}`);
  return { success: "Bill withdrawn." };
}

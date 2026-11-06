"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BILLER_ERROR_MESSAGES, getBillerService } from "@/modules/billing";
import {
  billerDetailsSchema,
  contactDetailsSchema,
  payoutDetailsSchema,
} from "@/modules/billing/domain/biller";
import type { BillerResult } from "@/modules/billing/services/biller-service";
import { requireAdmin } from "@/modules/identity/adapters/session";

export type SchoolFormState = { error?: string; success?: string };

const idSchema = z.string().min(1);

function toFormState(
  schoolId: string,
  result: BillerResult,
  success: string,
): SchoolFormState {
  if (!result.ok) return { error: BILLER_ERROR_MESSAGES[result.error] };
  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${schoolId}`);
  return { success };
}

export async function createSchoolAction(
  _previous: SchoolFormState,
  formData: FormData,
): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const details = billerDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!details.success) return { error: "Please fill in every field." };

  const id = await getBillerService().create(details.data, admin.id);
  revalidatePath("/admin/schools");
  redirect(`/admin/schools/${id}`);
}

export async function updateSchoolAction(
  _previous: SchoolFormState,
  formData: FormData,
): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(formData.get("schoolId"));
  const details = billerDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!id.success || !details.success) {
    return { error: "Please fill in every field." };
  }

  return toFormState(
    id.data,
    await getBillerService().update(id.data, details.data, admin.id),
    "Saved.",
  );
}

export async function addContactAction(
  _previous: SchoolFormState,
  formData: FormData,
): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(formData.get("schoolId"));
  const contact = contactDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!id.success || !contact.success) {
    return {
      error: "Please check the details. The phone must be a Zimbabwean mobile number.",
    };
  }

  return toFormState(
    id.data,
    await getBillerService().addContact(id.data, contact.data, admin.id),
    "Contact added. Verify them before relying on them.",
  );
}

export async function verifyContactAction(
  _previous: SchoolFormState,
  formData: FormData,
): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      schoolId: idSchema,
      contactId: idSchema,
      note: z.string().trim().min(3).max(300),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please say how you checked this person." };

  const { schoolId, contactId, note } = parsed.data;
  return toFormState(
    schoolId,
    await getBillerService().verifyContact(contactId, note, admin.id),
    "Contact verified.",
  );
}

export async function removeContactAction(
  _previous: SchoolFormState,
  formData: FormData,
): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ schoolId: idSchema, contactId: idSchema })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "That contact could not be removed." };

  return toFormState(
    parsed.data.schoolId,
    await getBillerService().removeContact(parsed.data.contactId, admin.id),
    "Contact removed.",
  );
}

export async function savePayoutAction(
  _previous: SchoolFormState,
  formData: FormData,
): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(formData.get("schoolId"));
  const details = payoutDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!id.success || !details.success) {
    return {
      error: "Please check the details. Account numbers must be 5 to 20 digits.",
    };
  }

  return toFormState(
    id.data,
    await getBillerService().savePayout(id.data, details.data, admin.id),
    "Payout details saved. Check the school again, then verify it.",
  );
}

export async function setSchoolVerifiedAction(
  _previous: SchoolFormState,
  formData: FormData,
): Promise<SchoolFormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ schoolId: idSchema, verified: z.enum(["true", "false"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "That change could not be made." };

  const service = getBillerService();
  const { schoolId, verified } = parsed.data;
  return verified === "true"
    ? toFormState(
        schoolId,
        await service.verify(schoolId, admin.id),
        "School verified.",
      )
    : toFormState(
        schoolId,
        await service.unverify(schoolId, admin.id),
        "School is no longer verified.",
      );
}

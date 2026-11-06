"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  VERIFICATION_ERROR_MESSAGES,
  getVerificationService,
} from "@/modules/identity";
import { requireApplicant } from "@/modules/identity/adapters/session";
import { studentDetailsSchema } from "@/modules/identity/domain/account";
import {
  DOCUMENT_KINDS,
  MAX_DOCUMENT_BYTES,
} from "@/modules/identity/domain/verification";
import type { VerificationResult } from "@/modules/identity/services/verification-service";

export type FormState = { error?: string; success?: string };

function toFormState(result: VerificationResult, success: string): FormState {
  if (!result.ok) return { error: VERIFICATION_ERROR_MESSAGES[result.error] };
  revalidatePath("/onboarding");
  return { success };
}

export async function saveStudentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const applicant = await requireApplicant();
  const parsed = studentDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please fill in every field." };

  return toFormState(
    await getVerificationService().saveStudent(applicant, parsed.data),
    "Saved.",
  );
}

export async function uploadDocumentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const applicant = await requireApplicant();

  const kind = z.enum(DOCUMENT_KINDS).safeParse(formData.get("kind"));
  const file = formData.get("file");
  if (!kind.success || !(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  // Checked before reading the file into memory.
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { error: VERIFICATION_ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  return toFormState(
    await getVerificationService().uploadDocument(
      applicant,
      kind.data,
      new Uint8Array(await file.arrayBuffer()),
    ),
    "Uploaded.",
  );
}

export async function submitVerificationAction(): Promise<FormState> {
  const applicant = await requireApplicant();
  return toFormState(
    await getVerificationService().submit(applicant),
    "Submitted for review.",
  );
}

import type { ApplicantRole } from "./account";

export const DOCUMENT_KINDS = [
  "NATIONAL_ID",
  "BIRTH_CERTIFICATE",
  "STUDENT_ID",
  "ENROLLMENT_LETTER",
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  NATIONAL_ID: "National ID",
  BIRTH_CERTIFICATE: "Birth certificate",
  STUDENT_ID: "Student ID",
  ENROLLMENT_LETTER: "Enrollment letter",
};

export type DocumentRequirement = {
  id: string;
  label: string;
  /** Any one of these satisfies the requirement. */
  anyOf: readonly DocumentKind[];
};

/**
 * Students prove who they are and that they are enrolled. A guardian proves who
 * they are, plus a document linking the application to the student in their care.
 */
const REQUIREMENTS: Record<ApplicantRole, readonly DocumentRequirement[]> = {
  STUDENT: [
    {
      id: "identity",
      label: "Your identity document",
      anyOf: ["NATIONAL_ID", "BIRTH_CERTIFICATE"],
    },
    {
      id: "enrollment",
      label: "Proof of enrollment",
      anyOf: ["STUDENT_ID", "ENROLLMENT_LETTER"],
    },
  ],
  GUARDIAN: [
    {
      id: "identity",
      label: "Your national ID",
      anyOf: ["NATIONAL_ID"],
    },
    {
      id: "student",
      label: "A document for the student",
      anyOf: ["BIRTH_CERTIFICATE", "STUDENT_ID", "ENROLLMENT_LETTER"],
    },
  ],
};

export function documentRequirements(
  role: ApplicantRole,
): readonly DocumentRequirement[] {
  return REQUIREMENTS[role];
}

export function isKindAllowed(role: ApplicantRole, kind: DocumentKind): boolean {
  return REQUIREMENTS[role].some((r) => r.anyOf.includes(kind));
}

export function missingRequirements(
  role: ApplicantRole,
  uploaded: readonly DocumentKind[],
): readonly DocumentRequirement[] {
  return REQUIREMENTS[role].filter(
    (r) => !r.anyOf.some((kind) => uploaded.includes(kind)),
  );
}

export type VerificationStage = "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED";

export function verificationStage(
  verification: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    submittedAt: Date | null;
  } | null,
): VerificationStage {
  if (!verification) return "DRAFT";
  if (verification.status === "APPROVED") return "APPROVED";
  if (verification.status === "REJECTED") return "REJECTED";
  return verification.submittedAt ? "IN_REVIEW" : "DRAFT";
}

/** Nothing can change while under review or after approval. */
export function isEditable(stage: VerificationStage): boolean {
  return stage === "DRAFT" || stage === "REJECTED";
}

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export type DocumentMimeType = "application/pdf" | "image/jpeg" | "image/png";

/**
 * Identifies a file from its contents. The browser's claimed type and the file
 * name are both attacker-controlled, so neither is used.
 */
export function detectDocumentType(bytes: Uint8Array): DocumentMimeType | null {
  const startsWith = (signature: readonly number[]) =>
    bytes.length >= signature.length &&
    signature.every((byte, i) => bytes[i] === byte);

  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  return null;
}

import { createHash } from "node:crypto";
import type { ApplicantRole, StudentDetails } from "../domain/account";
import {
  MAX_DOCUMENT_BYTES,
  detectDocumentType,
  isEditable,
  isKindAllowed,
  missingRequirements,
  verificationStage,
  type DocumentKind,
  type DocumentMimeType,
} from "../domain/verification";

export type Applicant = { id: string; role: ApplicantRole };

export type DocumentRecord = {
  id: string;
  kind: DocumentKind;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

export type VerificationRecord = {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: Date | null;
  rejectionReason: string | null;
  documents: DocumentRecord[];
};

export type ReviewItem = VerificationRecord & {
  applicantName: string;
  applicantPhone: string;
  applicantRole: string;
  student: StudentDetails | null;
};

export type ReviewDecision =
  | { decision: "APPROVED" }
  | { decision: "REJECTED"; reason: string };

export type VerificationStore = {
  findByUser(userId: string): Promise<VerificationRecord | null>;
  findStudent(ownerId: string): Promise<StudentDetails | null>;
  saveStudent(ownerId: string, details: StudentDetails): Promise<void>;
  /** Replaces any document of the same kind. Fails if the hash is already used. */
  saveDocument(
    userId: string,
    document: {
      kind: DocumentKind;
      storageKey: string;
      mimeType: DocumentMimeType;
      sizeBytes: number;
      sha256: string;
    },
  ): Promise<{ ok: true; replacedKey: string | null } | { ok: false }>;
  /** False if it is not in a state that can be submitted. */
  submit(userId: string, at: Date): Promise<boolean>;
  listAwaitingReview(): Promise<ReviewItem[]>;
  findForReview(id: string): Promise<ReviewItem | null>;
  /** False if someone else has already decided it. */
  applyReview(
    id: string,
    reviewerId: string,
    review: ReviewDecision,
    at: Date,
  ): Promise<boolean>;
  findDocument(id: string): Promise<DocumentRecord | null>;
  recordDocumentView(documentId: string, viewerId: string): Promise<void>;
};

/** Private storage for documents. Keys are chosen by the implementation. */
export type DocumentFiles = {
  put(bytes: Uint8Array): Promise<string>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
};

export type VerificationError =
  | "NOT_EDITABLE"
  | "KIND_NOT_ALLOWED"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "DUPLICATE_DOCUMENT"
  | "STUDENT_DETAILS_MISSING"
  | "DOCUMENTS_MISSING"
  | "ALREADY_DECIDED"
  | "SELF_REVIEW";

export const VERIFICATION_ERROR_MESSAGES: Record<VerificationError, string> = {
  NOT_EDITABLE: "This application can't be changed right now.",
  KIND_NOT_ALLOWED: "That document type isn't accepted for this account.",
  EMPTY_FILE: "That file is empty. Please choose another.",
  FILE_TOO_LARGE: "That file is over 5 MB. Please upload a smaller copy.",
  UNSUPPORTED_FILE_TYPE: "Please upload a PDF, JPEG or PNG file.",
  DUPLICATE_DOCUMENT:
    "This document has already been uploaded. If you think that's a mistake, please contact support.",
  STUDENT_DETAILS_MISSING: "Please save the student's details first.",
  DOCUMENTS_MISSING: "Please upload all the required documents first.",
  ALREADY_DECIDED: "This application has already been decided.",
  SELF_REVIEW: "You can't review your own application.",
};

export type VerificationResult =
  | { ok: true }
  | { ok: false; error: VerificationError };

const fail = (error: VerificationError): VerificationResult => ({
  ok: false,
  error,
});
const OK: VerificationResult = { ok: true };

export function createVerificationService(deps: {
  store: VerificationStore;
  files: DocumentFiles;
  now?: () => Date;
}) {
  const { store, files } = deps;
  const now = deps.now ?? (() => new Date());

  async function currentStage(userId: string) {
    return verificationStage(await store.findByUser(userId));
  }

  return {
    async overview(applicant: Applicant) {
      const [verification, student] = await Promise.all([
        store.findByUser(applicant.id),
        store.findStudent(applicant.id),
      ]);
      const stage = verificationStage(verification);
      const documents = verification?.documents ?? [];
      return {
        stage,
        editable: isEditable(stage),
        student,
        rejectionReason: verification?.rejectionReason ?? null,
        documents,
        missing: missingRequirements(
          applicant.role,
          documents.map((d) => d.kind),
        ),
      };
    },

    async saveStudent(
      applicant: Applicant,
      details: StudentDetails,
    ): Promise<VerificationResult> {
      if (!isEditable(await currentStage(applicant.id))) {
        return fail("NOT_EDITABLE");
      }
      await store.saveStudent(applicant.id, details);
      return OK;
    },

    async uploadDocument(
      applicant: Applicant,
      kind: DocumentKind,
      bytes: Uint8Array,
    ): Promise<VerificationResult> {
      if (!isEditable(await currentStage(applicant.id))) {
        return fail("NOT_EDITABLE");
      }
      if (!isKindAllowed(applicant.role, kind)) return fail("KIND_NOT_ALLOWED");
      if (bytes.length === 0) return fail("EMPTY_FILE");
      if (bytes.length > MAX_DOCUMENT_BYTES) return fail("FILE_TOO_LARGE");

      const mimeType = detectDocumentType(bytes);
      if (!mimeType) return fail("UNSUPPORTED_FILE_TYPE");

      const storageKey = await files.put(bytes);
      const saved = await store.saveDocument(applicant.id, {
        kind,
        storageKey,
        mimeType,
        sizeBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });

      if (!saved.ok) {
        await files.delete(storageKey);
        return fail("DUPLICATE_DOCUMENT");
      }
      if (saved.replacedKey) await files.delete(saved.replacedKey);
      return OK;
    },

    async submit(applicant: Applicant): Promise<VerificationResult> {
      const [verification, student] = await Promise.all([
        store.findByUser(applicant.id),
        store.findStudent(applicant.id),
      ]);
      if (!isEditable(verificationStage(verification))) {
        return fail("NOT_EDITABLE");
      }
      if (!student) return fail("STUDENT_DETAILS_MISSING");

      const kinds = verification?.documents.map((d) => d.kind) ?? [];
      if (missingRequirements(applicant.role, kinds).length > 0) {
        return fail("DOCUMENTS_MISSING");
      }
      return (await store.submit(applicant.id, now()))
        ? OK
        : fail("NOT_EDITABLE");
    },

    listAwaitingReview: () => store.listAwaitingReview(),
    findForReview: (id: string) => store.findForReview(id),

    async review(
      id: string,
      reviewerId: string,
      review: ReviewDecision,
    ): Promise<VerificationResult> {
      const item = await store.findForReview(id);
      if (!item) return fail("ALREADY_DECIDED");
      if (item.userId === reviewerId) return fail("SELF_REVIEW");
      return (await store.applyReview(id, reviewerId, review, now()))
        ? OK
        : fail("ALREADY_DECIDED");
    },

    /** Records the view before returning anything, so no read goes unlogged. */
    async readDocumentForReview(documentId: string, viewerId: string) {
      const document = await store.findDocument(documentId);
      if (!document) return null;
      await store.recordDocumentView(documentId, viewerId);
      return {
        mimeType: document.mimeType,
        bytes: await files.get(document.storageKey),
      };
    },
  };
}

export type VerificationService = ReturnType<typeof createVerificationService>;

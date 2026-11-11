import { beforeEach, describe, expect, it } from "vitest";
import type { DocumentFiles } from "../../../lib/encrypted-file-store";
import type { StudentDetails } from "../domain/account";
import {
  MAX_DOCUMENT_BYTES,
  type DocumentKind,
} from "../domain/verification";
import {
  createVerificationService,
  type Applicant,
  type VerificationRecord,
  type VerificationStore,
} from "./verification-service";

const STUDENT: Applicant = { id: "student-1", role: "STUDENT" };
const GUARDIAN: Applicant = { id: "guardian-1", role: "GUARDIAN" };
const ADMIN_ID = "admin-1";
const DETAILS: StudentDetails = {
  firstName: "Tariro",
  lastName: "Moyo",
  level: "Year 2",
};

let counter = 0;
/** A valid PDF header followed by unique content, so hashes never collide. */
const pdf = (label = String((counter += 1))) =>
  new TextEncoder().encode(`%PDF-1.7 ${label}`);

function setup() {
  const verifications = new Map<string, VerificationRecord>();
  const hashes = new Map<string, string>(); // sha256 -> document id
  const students = new Map<string, StudentDetails>();
  const objects = new Map<string, Uint8Array>();
  const views: Array<[string, string]> = [];
  let ids = 0;

  const byId = (id: string) =>
    [...verifications.values()].find((v) => v.id === id) ?? null;

  const toItem = (v: VerificationRecord) => ({
    ...v,
    applicantName: "Applicant",
    applicantPhone: "+263771234567",
    applicantEmail: null,
    applicantRole: "STUDENT",
    student: students.get(v.userId) ?? null,
  });

  const store: VerificationStore = {
    findByUser: async (userId) => verifications.get(userId) ?? null,
    findStudent: async (ownerId) => students.get(ownerId) ?? null,
    saveStudent: async (ownerId, details) => {
      students.set(ownerId, details);
    },
    saveDocument: async (userId, { sha256, ...document }) => {
      const verification = verifications.get(userId) ?? {
        id: `v-${userId}`,
        userId,
        status: "PENDING" as const,
        submittedAt: null,
        rejectionReason: null,
        documents: [],
      };
      const existing = verification.documents.find(
        (d) => d.kind === document.kind,
      );
      const holder = hashes.get(sha256);
      if (holder && holder !== existing?.id) return { ok: false };

      verifications.set(userId, verification);
      verification.documents = verification.documents.filter(
        (d) => d !== existing,
      );
      const id = `doc-${(ids += 1)}`;
      verification.documents.push({ ...document, id });
      for (const [hash, documentId] of hashes) {
        if (documentId === existing?.id) hashes.delete(hash);
      }
      hashes.set(sha256, id);
      return { ok: true, replacedKey: existing?.storageKey ?? null };
    },
    submit: async (userId, at) => {
      const v = verifications.get(userId);
      if (!v) return false;
      v.status = "PENDING";
      v.submittedAt = at;
      v.rejectionReason = null;
      return true;
    },
    listAwaitingReview: async () =>
      [...verifications.values()]
        .filter((v) => v.status === "PENDING" && v.submittedAt)
        .map(toItem),
    findForReview: async (id) => {
      const v = byId(id);
      return v ? toItem(v) : null;
    },
    applyReview: async (id, _reviewerId, review) => {
      const v = byId(id);
      if (!v || v.status !== "PENDING" || !v.submittedAt) return false;
      v.status = review.decision;
      if (review.decision === "REJECTED") {
        v.rejectionReason = review.reason;
        v.submittedAt = null;
      }
      return true;
    },
    findDocument: async (id) =>
      [...verifications.values()]
        .flatMap((v) => v.documents)
        .find((d) => d.id === id) ?? null,
    recordDocumentView: async (documentId, viewerId) => {
      views.push([documentId, viewerId]);
    },
  };

  const files: DocumentFiles = {
    put: async (bytes) => {
      const key = `key-${(ids += 1)}`;
      objects.set(key, bytes);
      return key;
    },
    get: async (key) => objects.get(key)!,
    delete: async (key) => {
      objects.delete(key);
    },
  };

  return {
    service: createVerificationService({ store, files }),
    objects,
    views,
    verifications,
  };
}

describe("verification service", () => {
  let t: ReturnType<typeof setup>;

  const prepare = async (
    applicant: Applicant,
    kinds: DocumentKind[] = ["NATIONAL_ID", "STUDENT_ID"],
  ) => {
    await t.service.saveStudent(applicant, DETAILS);
    for (const kind of kinds) {
      await t.service.uploadDocument(applicant, kind, pdf());
    }
  };

  const submitted = async (applicant: Applicant) => {
    await prepare(applicant);
    await t.service.submit(applicant);
    return t.verifications.get(applicant.id)!.id;
  };

  beforeEach(() => {
    t = setup();
  });

  describe("uploading", () => {
    it("stores an accepted file", async () => {
      expect(await t.service.uploadDocument(STUDENT, "NATIONAL_ID", pdf())).toEqual(
        { ok: true },
      );
      expect(t.objects.size).toBe(1);
    });

    it("rejects files that are not PDF, JPEG or PNG, whatever they claim", async () => {
      const html = new TextEncoder().encode("<script>alert(1)</script>");
      expect(await t.service.uploadDocument(STUDENT, "NATIONAL_ID", html)).toEqual(
        { ok: false, error: "UNSUPPORTED_FILE_TYPE" },
      );
      expect(t.objects.size).toBe(0);
    });

    it("rejects empty and oversized files", async () => {
      expect(
        await t.service.uploadDocument(STUDENT, "NATIONAL_ID", new Uint8Array()),
      ).toEqual({ ok: false, error: "EMPTY_FILE" });

      const big = new Uint8Array(MAX_DOCUMENT_BYTES + 1);
      big.set(pdf());
      expect(await t.service.uploadDocument(STUDENT, "NATIONAL_ID", big)).toEqual({
        ok: false,
        error: "FILE_TOO_LARGE",
      });
    });

    it("refuses a document already used by another account, leaving no file", async () => {
      const shared = pdf("shared");
      await t.service.uploadDocument(STUDENT, "NATIONAL_ID", shared);

      expect(await t.service.uploadDocument(GUARDIAN, "NATIONAL_ID", shared)).toEqual(
        { ok: false, error: "DUPLICATE_DOCUMENT" },
      );
      expect(t.objects.size).toBe(1);
    });

    it("replaces a document of the same kind and removes the old file", async () => {
      await t.service.uploadDocument(STUDENT, "NATIONAL_ID", pdf());
      await t.service.uploadDocument(STUDENT, "NATIONAL_ID", pdf());

      const { documents } = await t.service.overview(STUDENT);
      expect(documents).toHaveLength(1);
      expect(t.objects.size).toBe(1);
    });

    it("lets someone re-upload the same file for the same kind", async () => {
      const file = pdf("same");
      await t.service.uploadDocument(STUDENT, "NATIONAL_ID", file);

      expect(await t.service.uploadDocument(STUDENT, "NATIONAL_ID", file)).toEqual({
        ok: true,
      });
      expect(t.objects.size).toBe(1);
    });
  });

  describe("submitting", () => {
    it("needs student details", async () => {
      await t.service.uploadDocument(STUDENT, "NATIONAL_ID", pdf());
      await t.service.uploadDocument(STUDENT, "STUDENT_ID", pdf());

      expect(await t.service.submit(STUDENT)).toEqual({
        ok: false,
        error: "STUDENT_DETAILS_MISSING",
      });
    });

    it("needs every required document", async () => {
      await prepare(STUDENT, ["NATIONAL_ID"]);

      expect(await t.service.submit(STUDENT)).toEqual({
        ok: false,
        error: "DOCUMENTS_MISSING",
      });
    });

    it("needs something to submit", async () => {
      await t.service.saveStudent(STUDENT, DETAILS);

      expect(await t.service.submit(STUDENT)).toEqual({
        ok: false,
        error: "DOCUMENTS_MISSING",
      });
    });

    it("applies the guardian's requirements to a guardian", async () => {
      await prepare(GUARDIAN, ["BIRTH_CERTIFICATE"]);
      expect(await t.service.submit(GUARDIAN)).toEqual({
        ok: false,
        error: "DOCUMENTS_MISSING",
      });

      await t.service.uploadDocument(GUARDIAN, "NATIONAL_ID", pdf());
      expect(await t.service.submit(GUARDIAN)).toEqual({ ok: true });
    });

    it("locks everything while under review", async () => {
      await submitted(STUDENT);

      expect((await t.service.overview(STUDENT)).stage).toBe("IN_REVIEW");
      const locked = { ok: false, error: "NOT_EDITABLE" };
      expect(await t.service.saveStudent(STUDENT, DETAILS)).toEqual(locked);
      expect(await t.service.uploadDocument(STUDENT, "NATIONAL_ID", pdf())).toEqual(
        locked,
      );
      expect(await t.service.submit(STUDENT)).toEqual(locked);
    });
  });

  describe("reviewing", () => {
    it("lists only submitted applications", async () => {
      await prepare(GUARDIAN, ["NATIONAL_ID", "STUDENT_ID"]);
      await submitted(STUDENT);

      const queue = await t.service.listAwaitingReview();
      expect(queue.map((item) => item.userId)).toEqual([STUDENT.id]);
    });

    it("approves, then locks the application", async () => {
      const id = await submitted(STUDENT);

      expect(
        await t.service.review(id, ADMIN_ID, { decision: "APPROVED" }),
      ).toEqual({ ok: true });
      expect((await t.service.overview(STUDENT)).stage).toBe("APPROVED");
      expect(await t.service.saveStudent(STUDENT, DETAILS)).toEqual({
        ok: false,
        error: "NOT_EDITABLE",
      });
    });

    it("cannot decide the same application twice", async () => {
      const id = await submitted(STUDENT);
      await t.service.review(id, ADMIN_ID, { decision: "APPROVED" });

      expect(
        await t.service.review(id, ADMIN_ID, {
          decision: "REJECTED",
          reason: "Changed my mind",
        }),
      ).toEqual({ ok: false, error: "ALREADY_DECIDED" });
      expect((await t.service.overview(STUDENT)).stage).toBe("APPROVED");
    });

    it("does not let anyone review their own application", async () => {
      const id = await submitted(STUDENT);

      expect(
        await t.service.review(id, STUDENT.id, { decision: "APPROVED" }),
      ).toEqual({ ok: false, error: "SELF_REVIEW" });
    });

    it("lets a rejected applicant fix and resubmit", async () => {
      const id = await submitted(STUDENT);
      await t.service.review(id, ADMIN_ID, {
        decision: "REJECTED",
        reason: "The ID photo is blurry",
      });

      const rejected = await t.service.overview(STUDENT);
      expect(rejected.stage).toBe("REJECTED");
      expect(rejected.rejectionReason).toBe("The ID photo is blurry");

      await t.service.uploadDocument(STUDENT, "NATIONAL_ID", pdf());
      expect(await t.service.submit(STUDENT)).toEqual({ ok: true });

      const resubmitted = await t.service.overview(STUDENT);
      expect(resubmitted.stage).toBe("IN_REVIEW");
      expect(resubmitted.rejectionReason).toBeNull();
    });

    it("records who viewed a document", async () => {
      const file = pdf("viewed");
      await t.service.uploadDocument(STUDENT, "NATIONAL_ID", file);
      const [document] = (await t.service.overview(STUDENT)).documents;

      const read = await t.service.readDocumentForReview(document!.id, ADMIN_ID);

      expect(read).toEqual({ mimeType: "application/pdf", bytes: file });
      expect(t.views).toEqual([[document!.id, ADMIN_ID]]);
    });

    it("returns nothing for an unknown document", async () => {
      expect(await t.service.readDocumentForReview("nope", ADMIN_ID)).toBeNull();
      expect(t.views).toEqual([]);
    });
  });
});

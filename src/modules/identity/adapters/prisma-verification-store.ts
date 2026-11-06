import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  ReviewItem,
  VerificationStore,
} from "../services/verification-service";

const STUDENT_FIELDS = { firstName: true, lastName: true, level: true } as const;

const VERIFICATION_INCLUDE = {
  documents: {
    select: {
      id: true,
      kind: true,
      storageKey: true,
      mimeType: true,
      sizeBytes: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.VerificationInclude;

const REVIEW_INCLUDE = {
  ...VERIFICATION_INCLUDE,
  user: {
    select: {
      name: true,
      phone: true,
      role: true,
      // Onboarding collects one student per account for now.
      students: { select: STUDENT_FIELDS, take: 1, orderBy: { createdAt: "asc" } },
    },
  },
} satisfies Prisma.VerificationInclude;

type ReviewRow = Prisma.VerificationGetPayload<{
  include: typeof REVIEW_INCLUDE;
}>;

function toReviewItem({ user, ...verification }: ReviewRow): ReviewItem {
  return {
    ...verification,
    applicantName: user.name,
    applicantPhone: user.phone,
    applicantRole: user.role,
    student: user.students[0] ?? null,
  };
}

export const prismaVerificationStore: VerificationStore = {
  findByUser: (userId) =>
    db.verification.findUnique({
      where: { userId },
      include: VERIFICATION_INCLUDE,
    }),

  findStudent: (ownerId) =>
    db.student.findFirst({
      where: { ownerId },
      select: STUDENT_FIELDS,
      orderBy: { createdAt: "asc" },
    }),

  saveStudent: async (ownerId, details) => {
    await db.$transaction(async (tx) => {
      const existing = await tx.student.findFirst({
        where: { ownerId },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      const student = existing
        ? await tx.student.update({ where: { id: existing.id }, data: details })
        : await tx.student.create({ data: { ...details, ownerId } });
      await tx.auditLog.create({
        data: {
          actorId: ownerId,
          action: existing ? "student.updated" : "student.created",
          entity: "Student",
          entityId: student.id,
        },
      });
    });
  },

  saveDocument: async (userId, document) => {
    try {
      return await db.$transaction(async (tx) => {
        const verification = await tx.verification.upsert({
          where: { userId },
          update: {},
          create: { userId },
          select: { id: true },
        });
        const replaced = await tx.verificationDocument.findUnique({
          where: {
            verificationId_kind: {
              verificationId: verification.id,
              kind: document.kind,
            },
          },
          select: { id: true, storageKey: true },
        });
        if (replaced) {
          await tx.verificationDocument.delete({ where: { id: replaced.id } });
        }
        const created = await tx.verificationDocument.create({
          data: { ...document, verificationId: verification.id },
          select: { id: true },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "verification.document_uploaded",
            entity: "VerificationDocument",
            entityId: created.id,
            meta: { kind: document.kind },
          },
        });
        return { ok: true as const, replacedKey: replaced?.storageKey ?? null };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { ok: false };
      }
      throw error;
    }
  },

  submit: (userId, at) =>
    db.$transaction(async (tx) => {
      const { count } = await tx.verification.updateMany({
        where: {
          userId,
          OR: [{ status: "PENDING", submittedAt: null }, { status: "REJECTED" }],
        },
        data: {
          status: "PENDING",
          submittedAt: at,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
      if (count === 0) return false;
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "verification.submitted",
          entity: "User",
          entityId: userId,
        },
      });
      return true;
    }),

  listAwaitingReview: async () => {
    const rows = await db.verification.findMany({
      where: { status: "PENDING", submittedAt: { not: null } },
      include: REVIEW_INCLUDE,
      orderBy: { submittedAt: "asc" },
      take: 100,
    });
    return rows.map(toReviewItem);
  },

  findForReview: async (id) => {
    const row = await db.verification.findUnique({
      where: { id },
      include: REVIEW_INCLUDE,
    });
    return row ? toReviewItem(row) : null;
  },

  applyReview: (id, reviewerId, review, at) =>
    db.$transaction(async (tx) => {
      const rejected = review.decision === "REJECTED";
      // Conditional, so two admins deciding at once cannot both succeed.
      const { count } = await tx.verification.updateMany({
        where: { id, status: "PENDING", submittedAt: { not: null } },
        data: {
          status: review.decision,
          reviewedBy: reviewerId,
          reviewedAt: at,
          rejectionReason: rejected ? review.reason : null,
          ...(rejected ? { submittedAt: null } : {}),
        },
      });
      if (count === 0) return false;
      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: rejected ? "verification.rejected" : "verification.approved",
          entity: "Verification",
          entityId: id,
        },
      });
      return true;
    }),

  findDocument: (id) =>
    db.verificationDocument.findUnique({
      where: { id },
      select: {
        id: true,
        kind: true,
        storageKey: true,
        mimeType: true,
        sizeBytes: true,
      },
    }),

  recordDocumentView: async (documentId, viewerId) => {
    await db.auditLog.create({
      data: {
        actorId: viewerId,
        action: "verification.document_viewed",
        entity: "VerificationDocument",
        entityId: documentId,
      },
    });
  },
};

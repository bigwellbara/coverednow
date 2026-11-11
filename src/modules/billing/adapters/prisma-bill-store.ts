import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { centsToDecimal, decimalToCents } from "../domain/money";
import type {
  BillRecord,
  BillStore,
  NewBill,
} from "../services/bill-service";

/** While a bill is one of these, it no longer holds its uniqueness rules. */
const CLOSED_STATUSES = ["REJECTED", "CANCELLED"] as const;

const BILL_INCLUDE = {
  biller: { select: { name: true, type: true } },
} satisfies Prisma.BillInclude;

type BillRow = Prisma.BillGetPayload<{ include: typeof BILL_INCLUDE }>;

function toRecord(row: BillRow): BillRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    studentId: row.studentId,
    billerId: row.billerId,
    billerName: row.biller.name,
    billerType: row.biller.type,
    regNumber: row.regNumber,
    term: row.term,
    claimedCents: decimalToCents(row.claimedAmount.toFixed(2)),
    confirmedCents: row.confirmedAmount
      ? decimalToCents(row.confirmedAmount.toFixed(2))
      : null,
    dueDate: row.dueDate,
    documentKey: row.documentKey,
    status: row.status,
    closedReason: row.closedReason,
    createdAt: row.createdAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** Thrown to roll back a transaction when a conditional update finds nothing. */
class AlreadyAnswered extends Error {}

export const prismaBillStore: BillStore = {
  listVerifiedSchools: () =>
    db.biller.findMany({
      where: { verified: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, city: true },
    }),

  findSchool: (id) =>
    db.biller.findUnique({
      where: { id },
      select: { id: true, name: true, type: true, city: true, verified: true },
    }),

  findConflict: async (bill) => {
    const active = { status: { notIn: [...CLOSED_STATUSES] } };
    const exists = (where: Prisma.BillWhereInput) =>
      db.bill.count({ where: { ...active, ...where } }).then((n) => n > 0);

    if (
      await exists({
        billerId: bill.billerId,
        regNumber: bill.regNumber,
        term: bill.term,
      })
    ) {
      return "DUPLICATE_BILL";
    }
    if (await exists({ studentId: bill.studentId, term: bill.term })) {
      return "OPEN_BILL_FOR_TERM";
    }
    if (await exists({ documentHash: bill.documentHash })) {
      return "DUPLICATE_DOCUMENT";
    }
    return null;
  },

  create: async ({ claimedCents, ...bill }: NewBill) => {
    try {
      return await db.$transaction(async (tx) => {
        const { id } = await tx.bill.create({
          data: { ...bill, claimedAmount: centsToDecimal(claimedCents) },
          select: { id: true },
        });
        await tx.auditLog.create({
          data: {
            actorId: bill.ownerId,
            action: "bill.submitted",
            entity: "Bill",
            entityId: id,
          },
        });
        return { id };
      });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  },

  find: async (id) => {
    const row = await db.bill.findUnique({
      where: { id },
      include: BILL_INCLUDE,
    });
    return row ? toRecord(row) : null;
  },

  listForOwner: async (ownerId) => {
    const rows = await db.bill.findMany({
      where: { ownerId },
      include: BILL_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRecord);
  },

  listAll: async () => {
    const rows = await db.bill.findMany({
      include: BILL_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map(toRecord);
  },

  close: (id, from, to, actorId, reason) =>
    db.$transaction(async (tx) => {
      const { count } = await tx.bill.updateMany({
        where: { id, status: from },
        data: { status: to, closedReason: reason },
      });
      if (count === 0) return false;
      await tx.auditLog.create({
        data: {
          actorId,
          action: `bill.${to.toLowerCase()}`,
          entity: "Bill",
          entityId: id,
          meta: { from },
        },
      });
      return true;
    }),

  listVerifiedContacts: (billerId) =>
    db.billerContact.findMany({
      where: { billerId, removedAt: null, verifiedAt: { not: null } },
      select: { id: true, phone: true },
      orderBy: { name: "asc" },
    }),

  listConfirmations: async (billId) => {
    const rows = await db.billConfirmation.findMany({
      where: { billId },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        sentAt: true,
        respondedAt: true,
        contact: { select: { name: true } },
      },
      orderBy: { contact: { name: "asc" } },
    });
    return rows.map(({ contact, ...row }) => ({
      ...row,
      contactName: contact.name,
    }));
  },

  findPendingConfirmationId: async (billId, contactId) => {
    const row = await db.billConfirmation.findFirst({
      where: { billId, contactId, status: "PENDING" },
      select: { id: true },
    });
    return row?.id ?? null;
  },

  createConfirmation: async (billId, contactId, expiresAt) => {
    const { id } = await db.billConfirmation.create({
      data: { billId, contactId, expiresAt },
      select: { id: true },
    });
    return id;
  },

  extendConfirmation: async (id, expiresAt) => {
    await db.billConfirmation.update({ where: { id }, data: { expiresAt } });
  },

  markConfirmationSent: async (id, at) => {
    await db.billConfirmation.update({ where: { id }, data: { sentAt: at } });
  },

  findConfirmation: async (id) => {
    const row = await db.billConfirmation.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        contactId: true,
        contact: {
          select: { name: true, removedAt: true, verifiedAt: true },
        },
        bill: {
          include: {
            biller: { select: { name: true, type: true, verified: true } },
          },
        },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      expiresAt: row.expiresAt,
      contactId: row.contactId,
      contactName: row.contact.name,
      contactIsActive: !row.contact.removedAt && row.contact.verifiedAt !== null,
      billerVerified: row.bill.biller.verified,
      bill: toRecord(row.bill),
    };
  },

  recordConfirmationView: async (id, contactId) => {
    await db.auditLog.create({
      data: {
        action: "confirmation.viewed",
        entity: "BillConfirmation",
        entityId: id,
        meta: { contactId },
      },
    });
  },

  recordResponse: async (response) => {
    try {
      await db.$transaction(async (tx) => {
        const bill = await tx.bill.updateMany({
          where: { id: response.billId, status: "PENDING_SCHOOL" },
          data: {
            status: response.billStatus,
            closedReason: response.closedReason,
            confirmedAmount:
              response.confirmedCents === null
                ? null
                : centsToDecimal(response.confirmedCents),
          },
        });
        const confirmation = await tx.billConfirmation.updateMany({
          where: { id: response.confirmationId, status: "PENDING" },
          data: {
            status: response.status,
            respondedAt: response.at,
            confirmedAmount:
              response.confirmedCents === null
                ? null
                : centsToDecimal(response.confirmedCents),
          },
        });
        if (bill.count === 0 || confirmation.count === 0) {
          throw new AlreadyAnswered();
        }
        await tx.auditLog.create({
          data: {
            action: `confirmation.${response.status.toLowerCase()}`,
            entity: "Bill",
            entityId: response.billId,
            meta: {
              contactId: response.contactId,
              confirmationId: response.confirmationId,
              confirmedCents: response.confirmedCents,
            },
          },
        });
      });
      return true;
    } catch (error) {
      if (error instanceof AlreadyAnswered) return false;
      throw error;
    }
  },

  recordStatementView: async (billId, viewerId) => {
    await db.auditLog.create({
      data: {
        actorId: viewerId,
        action: "bill.statement_viewed",
        entity: "Bill",
        entityId: billId,
      },
    });
  },
};

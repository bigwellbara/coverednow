import { Prisma, type Donation } from "@prisma/client";
import { db } from "@/lib/db";
import { centsToDecimal, decimalToCents } from "@/modules/billing/domain/money";
import type { DonationRecord, DonationStore } from "../services/payment-service";

/** Outbox event type: a bill's settled total changed, so billing must catch up. */
export const FUNDING_CHANGED = "BillFundingChanged";

const cents = (value: Prisma.Decimal) => decimalToCents(value.toFixed(2));

function toRecord(row: Donation): DonationRecord {
  const amountCents = cents(row.amount);
  const tipCents = cents(row.platformTip);
  const feeCents = cents(row.gatewayFee);
  return {
    id: row.id,
    billId: row.billId,
    donorId: row.donorId,
    amountCents,
    tipCents,
    feeCents,
    totalCents: amountCents + tipCents + feeCents,
    visibility: row.visibility,
    displayName: row.displayName,
    reference: row.gatewayRef,
    providerRef: row.providerRef,
    pollUrl: row.pollUrl,
    status: row.status,
    settledAt: row.settledAt,
    failedAt: row.failedAt,
    createdAt: row.createdAt,
  };
}

/** Thrown to roll back a transaction when a conditional update finds nothing. */
class NothingChanged extends Error {}

async function changeFunding(
  id: string,
  from: Donation["status"][],
  data: Prisma.DonationUpdateManyMutationInput,
  action: string,
): Promise<string | null> {
  try {
    return await db.$transaction(async (tx) => {
      const { count } = await tx.donation.updateMany({
        where: { id, status: { in: from } },
        data,
      });
      if (count === 0) throw new NothingChanged();

      const { billId } = await tx.donation.findUniqueOrThrow({
        where: { id },
        select: { billId: true },
      });
      const event = await tx.outboxEvent.create({
        data: { type: FUNDING_CHANGED, payload: { billId, donationId: id } },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: { action, entity: "Donation", entityId: id, meta: { billId } },
      });
      return event.id;
    });
  } catch (error) {
    if (error instanceof NothingChanged) return null;
    throw error;
  }
}

export async function settledTotal(billId: string): Promise<number> {
  const { _sum } = await db.donation.aggregate({
    where: { billId, status: "SETTLED" },
    _sum: { amount: true },
  });
  return _sum.amount ? cents(_sum.amount) : 0;
}

export const prismaDonationStore: DonationStore = {
  create: async (donation) => {
    const row = await db.$transaction(async (tx) => {
      const created = await tx.donation.create({
        data: {
          billId: donation.billId,
          donorId: donation.donorId,
          amount: centsToDecimal(donation.amountCents),
          platformTip: centsToDecimal(donation.tipCents),
          gatewayFee: centsToDecimal(donation.feeCents),
          currency: "USD",
          visibility: donation.visibility,
          displayName: donation.displayName,
          gatewayRef: donation.reference,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: donation.donorId,
          action: "donation.started",
          entity: "Donation",
          entityId: created.id,
          meta: { billId: donation.billId, amountCents: donation.amountCents },
        },
      });
      return created;
    });
    return row;
  },

  setPollUrl: async (id, pollUrl) => {
    await db.donation.update({ where: { id }, data: { pollUrl } });
  },

  findById: async (id) => {
    const row = await db.donation.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  },

  findByReference: async (reference) => {
    const row = await db.donation.findUnique({ where: { gatewayRef: reference } });
    return row ? toRecord(row) : null;
  },

  settle: (id, providerRef, at) =>
    changeFunding(
      id,
      ["INITIATED", "FAILED"],
      { status: "SETTLED", settledAt: at, failedAt: null, providerRef },
      "donation.settled",
    ),

  fail: async (id, providerRef, at) => {
    const { count } = await db.donation.updateMany({
      where: { id, status: "INITIATED" },
      data: { status: "FAILED", failedAt: at, ...(providerRef ? { providerRef } : {}) },
    });
    return count > 0;
  },

  markRefunded: (id) =>
    changeFunding(id, ["SETTLED"], { status: "REFUNDED" }, "donation.refunded"),

  flag: async (id, action, meta) => {
    await db.auditLog.create({
      data: { action, entity: "Donation", entityId: id, meta: meta as Prisma.InputJsonValue },
    });
  },

  listForDonor: async (donorId) => {
    const rows = await db.donation.findMany({
      where: { donorId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map(toRecord);
  },

  listForBill: async (billId) => {
    const rows = await db.donation.findMany({
      where: { billId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRecord);
  },

  listRecent: async (limit) => {
    const rows = await db.donation.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    return rows.map(toRecord);
  },

  listSupporters: async (billId, limit) => {
    const rows = await db.donation.findMany({
      where: { billId, status: "SETTLED" },
      orderBy: { settledAt: "desc" },
      take: limit,
      select: { displayName: true, amount: true, settledAt: true },
    });
    return rows.map((row) => ({
      displayName: row.displayName,
      amountCents: cents(row.amount),
      settledAt: row.settledAt!,
    }));
  },

  countSupporters: (billId) =>
    db.donation.count({ where: { billId, status: "SETTLED" } }),

  donorSummary: async (donorId) => {
    const where = { donorId, status: "SETTLED" as const };
    const [sum, bills] = await Promise.all([
      db.donation.aggregate({ where, _sum: { amount: true }, _count: true }),
      db.donation.findMany({ where, distinct: ["billId"], select: { billId: true } }),
    ]);
    return {
      givenCents: sum._sum.amount ? cents(sum._sum.amount) : 0,
      donations: sum._count,
      billsSupported: bills.length,
    };
  },

  countDonors: async () =>
    (
      await db.donation.findMany({
        where: { status: "SETTLED" },
        distinct: ["donorId"],
        select: { donorId: true },
      })
    ).length,

  pendingFundingEvents: async (limit) => {
    const rows = await db.outboxEvent.findMany({
      where: { type: FUNDING_CHANGED, processedAt: null },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, payload: true },
    });
    return rows.flatMap((row) => {
      const billId = (row.payload as { billId?: unknown } | null)?.billId;
      return typeof billId === "string" ? [{ id: row.id, billId }] : [];
    });
  },

  markEventProcessed: async (id) => {
    await db.outboxEvent.update({ where: { id }, data: { processedAt: new Date() } });
  },
};

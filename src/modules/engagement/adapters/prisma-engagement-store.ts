import { Prisma, type Campaign, type StudentUpdate, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { centsToDecimal, decimalToCents } from "@/modules/billing/domain/money";
import type {
  CampaignRecord,
  EngagementStore,
  NoteRecord,
} from "../services/engagement-service";

/*
 * Engagement owns campaigns and thank-you notes. It reads donations and people
 * to count, rank and notify, but never changes another module's records, apart
 * from a person's own choice about notifications.
 */

const cents = (value: Prisma.Decimal | null) =>
  value === null ? 0 : decimalToCents(value.toFixed(2));

const toNote = (row: StudentUpdate): NoteRecord => ({
  id: row.id,
  billId: row.billId,
  body: row.body,
  status: row.status,
  createdAt: row.createdAt,
  reviewedAt: row.reviewedAt,
});

const toCampaign = (row: Campaign & { owner: Pick<User, "name"> }): CampaignRecord => ({
  id: row.id,
  slug: row.slug,
  ownerId: row.ownerId,
  ownerName: row.owner.name,
  kind: row.kind,
  title: row.title,
  story: row.story,
  goalCents: cents(row.goalAmount),
  endsAt: row.endsAt,
  matcherName: row.matcherName,
  matchCapCents: row.matchCap === null ? null : cents(row.matchCap),
  matchCheckedAt: row.matchCheckedAt,
  hiddenAt: row.hiddenAt,
  createdAt: row.createdAt,
});

const withOwner = { owner: { select: { name: true } } } as const;

export const prismaEngagementStore: EngagementStore = {
  createNote: async (billId, body) => toNote(await db.studentUpdate.create({ data: { billId, body } })),

  countNotes: (billId) => db.studentUpdate.count({ where: { billId, status: { not: "REJECTED" } } }),

  listNotes: async (billId, status) =>
    (
      await db.studentUpdate.findMany({
        where: { billId, ...(status ? { status } : {}) },
        orderBy: { createdAt: "desc" },
      })
    ).map(toNote),

  listPendingNotes: async (limit) =>
    (
      await db.studentUpdate.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: limit,
      })
    ).map(toNote),

  reviewNote: async (id, status, at, actorId) =>
    db.$transaction(async (tx) => {
      const { count } = await tx.studentUpdate.updateMany({
        where: { id, status: "PENDING" },
        data: { status, reviewedAt: at },
      });
      if (count === 0) return null;
      await tx.auditLog.create({
        data: {
          actorId,
          action: status === "APPROVED" ? "note.approved" : "note.rejected",
          entity: "StudentUpdate",
          entityId: id,
        },
      });
      return toNote(await tx.studentUpdate.findUniqueOrThrow({ where: { id } }));
    }),

  donorIdsForBill: async (billId) =>
    (
      await db.donation.findMany({
        where: { billId, status: "SETTLED" },
        distinct: ["donorId"],
        select: { donorId: true },
      })
    ).map((row) => row.donorId),

  contacts: async (userIds) =>
    userIds.length === 0
      ? []
      : db.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, name: true, phone: true, email: true, notifyUpdates: true },
        }),

  getNotifyUpdates: async (userId) =>
    (await db.user.findUnique({ where: { id: userId }, select: { notifyUpdates: true } }))
      ?.notifyUpdates ?? false,

  setNotifyUpdates: async (userId, on) => {
    await db.user.update({ where: { id: userId }, data: { notifyUpdates: on } });
  },

  settledGifts: async ({ donorId, campaignId, from, to }) => {
    const rows = await db.donation.findMany({
      where: {
        status: "SETTLED",
        ...(donorId ? { donorId } : {}),
        ...(campaignId ? { campaignId } : {}),
        ...(from || to ? { settledAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
      },
      orderBy: { settledAt: "asc" },
      select: {
        id: true,
        gatewayRef: true,
        billId: true,
        amount: true,
        platformTip: true,
        gatewayFee: true,
        settledAt: true,
        displayName: true,
        campaignId: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      reference: row.gatewayRef,
      billId: row.billId,
      amountCents: cents(row.amount),
      tipCents: cents(row.platformTip),
      feeCents: cents(row.gatewayFee),
      settledAt: row.settledAt!,
      displayName: row.displayName,
      campaignId: row.campaignId,
    }));
  },

  topSupporters: async (since, limit) => {
    const rows = await db.$queryRaw<
      Array<{ displayName: string; given: Prisma.Decimal; gifts: bigint; students: bigint }>
    >`
      SELECT "displayName",
             SUM("amount") AS given,
             COUNT(*) AS gifts,
             COUNT(DISTINCT "billId") AS students
      FROM "Donation"
      WHERE "status" = 'SETTLED'
        AND "displayName" IS NOT NULL
        ${since ? Prisma.sql`AND "settledAt" >= ${since}` : Prisma.empty}
      GROUP BY "donorId", "displayName"
      ORDER BY given DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => ({
      displayName: row.displayName,
      givenCents: cents(new Prisma.Decimal(row.given)),
      gifts: Number(row.gifts),
      students: Number(row.students),
    }));
  },

  slugExists: async (slug) => (await db.campaign.count({ where: { slug } })) > 0,

  createCampaign: async (ownerId, input) =>
    toCampaign(
      await db.campaign.create({
        data: {
          ownerId,
          slug: input.slug,
          kind: input.kind,
          title: input.title,
          story: input.story,
          goalAmount: centsToDecimal(input.goalCents),
          endsAt: input.endsAt,
        },
        include: withOwner,
      }),
    ),

  findCampaign: async (where) => {
    const row = await db.campaign.findUnique({ where, include: withOwner });
    return row ? toCampaign(row) : null;
  },

  listCampaigns: async ({ ownerId, includeHidden, limit }) =>
    (
      await db.campaign.findMany({
        where: { ...(ownerId ? { ownerId } : {}), ...(includeHidden ? {} : { hiddenAt: null }) },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: withOwner,
      })
    ).map(toCampaign),

  campaignTotals: async (ids) => {
    const totals = new Map<string, { raisedCents: number; gifts: number; donors: number }>();
    if (ids.length === 0) return totals;
    const [sums, donors] = await Promise.all([
      db.donation.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: [...ids] }, status: "SETTLED" },
        _sum: { amount: true },
        _count: true,
      }),
      db.donation.findMany({
        where: { campaignId: { in: [...ids] }, status: "SETTLED" },
        distinct: ["campaignId", "donorId"],
        select: { campaignId: true },
      }),
    ]);
    for (const row of sums) {
      if (!row.campaignId) continue;
      totals.set(row.campaignId, { raisedCents: cents(row._sum.amount), gifts: row._count, donors: 0 });
    }
    for (const row of donors) {
      const entry = row.campaignId ? totals.get(row.campaignId) : undefined;
      if (entry) entry.donors += 1;
    }
    return totals;
  },

  updateCampaign: async (id, patch, actorId, action) =>
    db.$transaction(async (tx) => {
      const { count } = await tx.campaign.updateMany({
        where: { id },
        data: {
          ...("matcherName" in patch ? { matcherName: patch.matcherName } : {}),
          ...("matchCapCents" in patch
            ? { matchCap: patch.matchCapCents === null || patch.matchCapCents === undefined ? null : centsToDecimal(patch.matchCapCents) }
            : {}),
          ...("matchCheckedAt" in patch ? { matchCheckedAt: patch.matchCheckedAt } : {}),
          ...("hiddenAt" in patch ? { hiddenAt: patch.hiddenAt } : {}),
        },
      });
      if (count === 0) return false;
      await tx.auditLog.create({
        data: {
          actorId,
          action,
          entity: "Campaign",
          entityId: id,
          meta: JSON.parse(JSON.stringify(patch)) as Prisma.InputJsonValue,
        },
      });
      return true;
    }),
};

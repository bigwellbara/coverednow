import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  BillerStore,
  ContactRecord,
  EncryptedPayout,
} from "../services/biller-service";

const CONTACT_FIELDS = {
  id: true,
  billerId: true,
  name: true,
  phone: true,
  email: true,
  roleTitle: true,
  verifiedAt: true,
  verificationNote: true,
  removedAt: true,
} satisfies Prisma.BillerContactSelect;

function audit(
  tx: Prisma.TransactionClient,
  action: string,
  entity: "Biller" | "BillerContact",
  entityId: string,
  actorId: string,
  meta?: Prisma.InputJsonValue,
) {
  return tx.auditLog.create({ data: { action, entity, entityId, actorId, meta } });
}

export const prismaBillerStore: BillerStore = {
  list: async () => {
    const billers = await db.biller.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
        verified: true,
        payoutMethod: true,
        contacts: {
          where: { removedAt: null, verifiedAt: { not: null } },
          select: { id: true },
        },
      },
    });
    return billers.map(({ payoutMethod, contacts, ...biller }) => ({
      ...biller,
      hasPayoutDetails: payoutMethod !== null,
      verifiedContacts: contacts.length,
    }));
  },

  find: async (id) => {
    const biller = await db.biller.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
        verified: true,
        payoutDetails: true,
        contacts: {
          where: { removedAt: null },
          select: CONTACT_FIELDS,
          orderBy: { name: "asc" },
        },
      },
    });
    if (!biller) return null;
    return {
      ...biller,
      payoutDetails: biller.payoutDetails as EncryptedPayout | null,
    };
  },

  findContact: (id): Promise<ContactRecord | null> =>
    db.billerContact.findUnique({ where: { id }, select: CONTACT_FIELDS }),

  create: (details, actorId) =>
    db.$transaction(async (tx) => {
      const { id } = await tx.biller.create({
        data: details,
        select: { id: true },
      });
      await audit(tx, "biller.created", "Biller", id, actorId);
      return id;
    }),

  update: async (id, details, actorId) => {
    await db.$transaction(async (tx) => {
      await tx.biller.update({ where: { id }, data: details });
      await audit(tx, "biller.updated", "Biller", id, actorId);
    });
  },

  savePayout: async (id, method, encrypted, actorId) => {
    await db.$transaction(async (tx) => {
      await tx.biller.update({
        where: { id },
        data: { payoutMethod: method, payoutDetails: encrypted, verified: false },
      });
      await audit(tx, "biller.payout_saved", "Biller", id, actorId, { method });
    });
  },

  addContact: async (billerId, contact, actorId) => {
    await db.$transaction(async (tx) => {
      const { id } = await tx.billerContact.create({
        data: { ...contact, email: contact.email ?? null, billerId },
        select: { id: true },
      });
      await audit(tx, "biller.contact_added", "BillerContact", id, actorId);
    });
  },

  verifyContact: async (contactId, note, actorId, at) => {
    await db.$transaction(async (tx) => {
      await tx.billerContact.update({
        where: { id: contactId },
        data: { verifiedAt: at, verifiedBy: actorId, verificationNote: note },
      });
      await audit(tx, "biller.contact_verified", "BillerContact", contactId, actorId);
    });
  },

  removeContact: async (contactId, actorId, at) => {
    await db.$transaction(async (tx) => {
      const { billerId } = await tx.billerContact.update({
        where: { id: contactId },
        data: { removedAt: at },
        select: { billerId: true },
      });
      await audit(tx, "biller.contact_removed", "BillerContact", contactId, actorId);

      const remaining = await tx.billerContact.count({
        where: { billerId, removedAt: null, verifiedAt: { not: null } },
      });
      if (remaining > 0) return;

      const { count } = await tx.biller.updateMany({
        where: { id: billerId, verified: true },
        data: { verified: false },
      });
      if (count > 0) {
        await audit(tx, "biller.unverified", "Biller", billerId, actorId, {
          reason: "last verified contact removed",
        });
      }
    });
  },

  setVerified: async (id, verified, actorId) => {
    await db.$transaction(async (tx) => {
      await tx.biller.update({ where: { id }, data: { verified } });
      await audit(
        tx,
        verified ? "biller.verified" : "biller.unverified",
        "Biller",
        id,
        actorId,
      );
    });
  },
};

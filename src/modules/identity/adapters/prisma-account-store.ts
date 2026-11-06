import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AccountStore } from "../services/account-service";

const ACCOUNT_FIELDS = { id: true, name: true } as const;

export const prismaAccountStore: AccountStore = {
  findByPhone: (phone) =>
    db.user.findUnique({ where: { phone }, select: ACCOUNT_FIELDS }),

  create: async (phone, details) => {
    try {
      return await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phone,
            name: details.name,
            email: details.email ?? null,
            role: details.role,
          },
          select: ACCOUNT_FIELDS,
        });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: "user.created",
            entity: "User",
            entityId: user.id,
            meta: { role: details.role },
          },
        });
        return user;
      });
    } catch (error) {
      // Two sign-ups for one number at once: the first one wins.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return db.user.findUniqueOrThrow({
          where: { phone },
          select: ACCOUNT_FIELDS,
        });
      }
      throw error;
    }
  },
};

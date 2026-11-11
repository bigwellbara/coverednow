import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SignInAddress } from "../domain/account";
import type { AccountStore } from "../services/account-service";

const ACCOUNT_FIELDS = { id: true, name: true } as const;

const addressColumn = (address: SignInAddress) =>
  address.kind === "PHONE" ? { phone: address.value } : { email: address.value };

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export const prismaAccountStore: AccountStore = {
  findByAddress: (address) =>
    db.user.findUnique({
      where: addressColumn(address) as Prisma.UserWhereUniqueInput,
      select: ACCOUNT_FIELDS,
    }),

  create: async (address, details) => {
    try {
      return await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            ...addressColumn(address),
            name: details.name,
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
            meta: { role: details.role, signedUpWith: address.kind },
          },
        });
        return user;
      });
    } catch (error) {
      // Two sign-ups for one address at once: the first one wins.
      if (isUniqueViolation(error)) {
        return db.user.findUniqueOrThrow({
          where: addressColumn(address) as Prisma.UserWhereUniqueInput,
          select: ACCOUNT_FIELDS,
        });
      }
      throw error;
    }
  },

  addAddress: async (userId, address) => {
    const column = address.kind === "PHONE" ? "phone" : "email";
    try {
      return await db.$transaction(async (tx) => {
        // Conditional, so it can only ever fill in an empty method.
        const { count } = await tx.user.updateMany({
          where: { id: userId, [column]: null },
          data: addressColumn(address),
        });
        if (count === 0) return "ALREADY_SET";
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "user.sign_in_method_added",
            entity: "User",
            entityId: userId,
            meta: { kind: address.kind },
          },
        });
        return "ADDED";
      });
    } catch (error) {
      if (isUniqueViolation(error)) return "TAKEN";
      throw error;
    }
  },
};

import { db } from "@/lib/db";
import type { OtpStore } from "../services/otp-service";

export const prismaOtpStore: OtpStore = {
  countForPhoneSince: (phone, since) =>
    db.otpChallenge.count({ where: { phone, createdAt: { gte: since } } }),

  countForIpSince: (ipHash, since) =>
    db.otpChallenge.count({ where: { ipHash, createdAt: { gte: since } } }),

  create: async (input) => {
    await db.otpChallenge.create({ data: input });
  },

  findLatestActive: async (phone, now) => {
    // Only the newest code counts, so an older one stops working once replaced.
    const latest = await db.otpChallenge.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
      select: { id: true, codeHash: true, consumedAt: true, expiresAt: true },
    });
    if (!latest || latest.consumedAt || latest.expiresAt <= now) return null;
    return { id: latest.id, codeHash: latest.codeHash };
  },

  claimAttempt: async (id, maxAttempts) => {
    const { count } = await db.otpChallenge.updateMany({
      where: { id, attempts: { lt: maxAttempts }, consumedAt: null },
      data: { attempts: { increment: 1 } },
    });
    return count === 1;
  },

  consume: async (id, now) => {
    const { count } = await db.otpChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: now },
    });
    return count === 1;
  },
};

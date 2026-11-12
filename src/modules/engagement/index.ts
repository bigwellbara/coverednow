/**
 * The engagement module: campaigns, thank-you notes, leaderboards, badges,
 * reports and the messages that tell people how their gifts are doing.
 */
import { requireEnv } from "@/lib/env";
import { createMessageSender } from "@/lib/messaging";
import { createEmailSender } from "@/lib/messaging/email";
import { getBillService } from "@/modules/billing";
import { prismaEngagementStore } from "./adapters/prisma-engagement-store";
import { createEngagementService, type EngagementService } from "./services/engagement-service";

let service: EngagementService | undefined;

export function getEngagementService(): EngagementService {
  return (service ??= createEngagementService({
    store: prismaEngagementStore,
    bills: {
      findPublic: (id) => getBillService().findPublic(id),
      findPublicMany: (ids) => getBillService().findPublicMany(ids),
      findForOwner: (ownerId, billId) => getBillService().findForOwner(ownerId, billId),
    },
    messages: createMessageSender(),
    email: createEmailSender(),
    baseUrl: requireEnv("NEXTAUTH_URL").replace(/\/$/, ""),
  }));
}

export { CAMPAIGN_ERROR_MESSAGES, NOTE_ERROR_MESSAGES } from "./services/engagement-service";

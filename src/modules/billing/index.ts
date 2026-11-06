/**
 * The billing module's public interface for the rest of the app. Services are
 * built on first use, so `next build` does not need runtime secrets.
 */
import { getDocumentStore } from "@/lib/document-store";
import { requireEnv } from "@/lib/env";
import { createMessageSender } from "@/lib/messaging";
import { getStudentDirectory } from "@/modules/identity";
import { createPayoutCipher } from "./adapters/payout-cipher";
import { prismaBillStore } from "./adapters/prisma-bill-store";
import { prismaBillerStore } from "./adapters/prisma-biller-store";
import { createBillService, type BillService } from "./services/bill-service";
import {
  createBillerService,
  type BillerService,
} from "./services/biller-service";

let billerService: BillerService | undefined;
let billService: BillService | undefined;

export function getBillerService(): BillerService {
  return (billerService ??= createBillerService({
    store: prismaBillerStore,
    cipher: createPayoutCipher(
      Buffer.from(requireEnv("PAYOUT_ENCRYPTION_KEY"), "base64"),
    ),
  }));
}

export function getBillService(): BillService {
  return (billService ??= createBillService({
    store: prismaBillStore,
    students: getStudentDirectory(),
    files: getDocumentStore(),
    messages: createMessageSender(),
    tokenSecret: requireEnv("CONFIRMATION_TOKEN_SECRET"),
    baseUrl: requireEnv("NEXTAUTH_URL").replace(/\/$/, ""),
  }));
}

export { BILL_ERROR_MESSAGES } from "./services/bill-service";
export { BILLER_ERROR_MESSAGES } from "./services/biller-service";

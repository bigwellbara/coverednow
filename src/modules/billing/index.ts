/**
 * The billing module's public interface for the rest of the app. Services are
 * built on first use, so `next build` does not need runtime secrets.
 */
import { requireEnv } from "@/lib/env";
import { createPayoutCipher } from "./adapters/payout-cipher";
import { prismaBillerStore } from "./adapters/prisma-biller-store";
import {
  createBillerService,
  type BillerService,
} from "./services/biller-service";

let billerService: BillerService | undefined;

export function getBillerService(): BillerService {
  return (billerService ??= createBillerService({
    store: prismaBillerStore,
    cipher: createPayoutCipher(
      Buffer.from(requireEnv("PAYOUT_ENCRYPTION_KEY"), "base64"),
    ),
  }));
}

export { BILLER_ERROR_MESSAGES } from "./services/biller-service";

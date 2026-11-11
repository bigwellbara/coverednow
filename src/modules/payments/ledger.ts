/**
 * The payments ledger, as other modules may read it. Kept apart from this
 * module's index so billing can depend on it without an import cycle.
 */
import { settledTotal } from "./adapters/prisma-donation-store";

export const donationLedger = { settledTotal };

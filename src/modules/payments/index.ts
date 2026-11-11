/**
 * The payments module's public interface for the rest of the app. Services are
 * built on first use, so `next build` does not need runtime secrets.
 */
import { requireEnv } from "@/lib/env";
import { getBillService } from "@/modules/billing";
import { termLabel } from "@/modules/billing/domain/bill";
import { createPaymentGateway } from "./adapters/create-gateway";
import { prismaDonationStore } from "./adapters/prisma-donation-store";
import { DEFAULT_GATEWAY_FEE_BPS, parseFeePercent } from "./domain/checkout";
import { createPaymentService, type PaymentService } from "./services/payment-service";

let paymentService: PaymentService | undefined;

export function getPaymentService(): PaymentService {
  if (paymentService) return paymentService;

  const baseUrl = requireEnv("NEXTAUTH_URL").replace(/\/$/, "");
  const feeSetting = process.env.PAYMENT_FEE_PERCENT;
  const feeBps = feeSetting ? parseFeePercent(feeSetting) : DEFAULT_GATEWAY_FEE_BPS;
  if (feeBps === null) {
    throw new Error("PAYMENT_FEE_PERCENT must be a percentage from 0 to 10, such as 2.5");
  }

  return (paymentService = createPaymentService({
    store: prismaDonationStore,
    gateway: createPaymentGateway(process.env, baseUrl),
    bills: getBillService(),
    feeBps,
    returnUrl: process.env.PAYNOW_RETURN_URL || `${baseUrl}/payments/return`,
    resultUrl: process.env.PAYNOW_RESULT_URL || `${baseUrl}/api/webhooks/paynow`,
    describe: (bill) => `School fees: ${bill.schoolName}, ${termLabel(bill.term)}`,
  }));
}

export { CHECKOUT_ERROR_MESSAGES } from "./services/payment-service";

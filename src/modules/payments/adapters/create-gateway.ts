import { GatewayError, type PaymentGateway } from "../domain/gateway";
import { createPaynowGateway } from "./paynow-gateway";

/**
 * Stands in for Paynow during development. The donor is sent to a local page
 * that settles or cancels the payment with one click. It never exists in a
 * production build, so no real donation can be "paid" this way.
 */
export function createSimulatedGateway(baseUrl: string): PaymentGateway {
  return {
    name: "simulated",
    initiate: async ({ reference }) => ({
      redirectUrl: `${baseUrl}/payments/simulate?ref=${encodeURIComponent(reference)}`,
      pollUrl: `simulated:${reference}`,
    }),
    // The simulator page applies results itself, so polling never learns more.
    poll: async () => null,
    readCallback: () => null,
  };
}

/**
 * Paynow when its keys are set. Otherwise development uses the simulator, and
 * production refuses to take payments rather than pretending to.
 */
export function createPaymentGateway(
  env: Record<string, string | undefined>,
  baseUrl: string,
): PaymentGateway {
  const integrationId = env.PAYNOW_INTEGRATION_ID?.trim();
  const integrationKey = env.PAYNOW_INTEGRATION_KEY?.trim();
  if (integrationId && integrationKey) {
    return createPaynowGateway({ integrationId, integrationKey });
  }
  if (env.NODE_ENV !== "production") return createSimulatedGateway(baseUrl);

  return {
    name: "unconfigured",
    initiate: async () => {
      throw new GatewayError(
        "Payments are not configured. Set PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY.",
      );
    },
    poll: async () => null,
    readCallback: () => null,
  };
}

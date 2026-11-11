/** What the payments service needs from a payment gateway such as Paynow. */

export type GatewayOutcome =
  /** The money has arrived. */
  | "PAID"
  /** Nothing final yet: the donor may still be paying. */
  | "PENDING"
  /** The donor cancelled, or the payment failed. Nothing was taken. */
  | "FAILED"
  /** Money was taken and later returned. Needs a person to look at it. */
  | "REVERSED";

export type GatewayResult = {
  /** Our reference, as sent when the payment started. */
  reference: string;
  /** The gateway's own reference, if it gave one. */
  providerRef: string | null;
  /** What the gateway says was paid, in cents. */
  amountCents: number;
  outcome: GatewayOutcome;
};

export type PaymentRequest = {
  reference: string;
  totalCents: number;
  /** Shown to the donor on the gateway's page. */
  description: string;
  /** Where the donor's browser goes afterwards. */
  returnUrl: string;
  /** Where the gateway posts the result, server to server. */
  resultUrl: string;
};

export type PaymentGateway = {
  readonly name: "paynow" | "simulated" | "unconfigured";
  /** Starts a payment. Returns the page to send the donor to, and where to poll. */
  initiate(request: PaymentRequest): Promise<{ redirectUrl: string; pollUrl: string }>;
  /** Asks the gateway for the latest status. Null if it can't be trusted or read. */
  poll(pollUrl: string): Promise<GatewayResult | null>;
  /** Reads a result the gateway posted to us. Null unless its signature checks out. */
  readCallback(body: string): GatewayResult | null;
};

export class GatewayError extends Error {
  override name = "GatewayError";
}

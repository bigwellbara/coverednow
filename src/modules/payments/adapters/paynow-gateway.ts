/**
 * Paynow's web checkout (EcoCash, OneMoney and bank cards on Paynow's own page).
 *
 * Messages are form-encoded. Each carries a hash: the SHA-512, in upper-case hex,
 * of every value except the hash itself, in the order sent, followed by the
 * integration key. Every message from Paynow is checked against it, so a forged
 * result posted to our webhook is ignored.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import {
  GatewayError,
  type GatewayOutcome,
  type GatewayResult,
  type PaymentGateway,
} from "../domain/gateway";

const INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";
const TIMEOUT_MS = 15_000;

export function paynowHash(values: readonly string[], integrationKey: string): string {
  return createHash("sha512")
    .update(values.join("") + integrationKey.toLowerCase(), "utf8")
    .digest("hex")
    .toUpperCase();
}

/** Encodes fields in order and appends their hash. */
export function signPaynowMessage(
  fields: ReadonlyArray<readonly [string, string]>,
  integrationKey: string,
): string {
  const body = new URLSearchParams(fields.map(([key, value]) => [key, value]));
  body.append("hash", paynowHash(fields.map(([, value]) => value), integrationKey));
  return body.toString();
}

/** The message's fields, or null if its hash is missing or wrong. */
export function readPaynowMessage(
  body: string,
  integrationKey: string,
): Map<string, string> | null {
  const params = new URLSearchParams(body);
  const received = params.get("hash");
  if (!received) return null;

  const values: string[] = [];
  const fields = new Map<string, string>();
  for (const [key, value] of params) {
    if (key.toLowerCase() === "hash") continue;
    values.push(value);
    fields.set(key.toLowerCase(), value);
  }

  const expected = Buffer.from(paynowHash(values, integrationKey));
  const actual = Buffer.from(received.toUpperCase());
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  return fields;
}

const PAID = new Set(["paid", "awaiting delivery", "delivered"]);
const FAILED = new Set(["cancelled", "failed"]);
// A dispute isn't final, so it changes nothing here. Refunds are.
const REVERSED = new Set(["refunded"]);

export function paynowOutcome(status: string): GatewayOutcome {
  const normalized = status.trim().toLowerCase();
  if (PAID.has(normalized)) return "PAID";
  if (FAILED.has(normalized)) return "FAILED";
  if (REVERSED.has(normalized)) return "REVERSED";
  return "PENDING";
}

/** "54.70" becomes 5470. Null for anything that isn't a plain amount. */
export function paynowAmountToCents(amount: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function centsToPaynowAmount(cents: number): string {
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function toResult(fields: Map<string, string>): GatewayResult | null {
  const reference = fields.get("reference");
  const amountCents = paynowAmountToCents(fields.get("amount") ?? "");
  const status = fields.get("status");
  if (!reference || amountCents === null || !status) return null;
  return {
    reference,
    providerRef: fields.get("paynowreference") || null,
    amountCents,
    outcome: paynowOutcome(status),
  };
}

/** Polls must only ever go back to Paynow, whatever a stored URL says. */
function isPaynowUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "www.paynow.co.zw";
  } catch {
    return false;
  }
}

export function createPaynowGateway(config: {
  integrationId: string;
  integrationKey: string;
  fetch?: typeof fetch;
}): PaymentGateway {
  const { integrationId, integrationKey } = config;
  const send = config.fetch ?? fetch;

  async function post(url: string, body: string): Promise<string> {
    const response = await send(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new GatewayError(`Paynow answered ${response.status}`);
    return response.text();
  }

  return {
    name: "paynow",

    async initiate(request) {
      const body = signPaynowMessage(
        [
          ["id", integrationId],
          ["reference", request.reference],
          ["amount", centsToPaynowAmount(request.totalCents)],
          ["additionalinfo", request.description],
          ["returnurl", request.returnUrl],
          ["resulturl", request.resultUrl],
          ["status", "Message"],
        ],
        integrationKey,
      );

      const reply = await post(INITIATE_URL, body);
      const unsigned = new URLSearchParams(reply);
      if (unsigned.get("status")?.toLowerCase() === "error") {
        // Error replies aren't signed. Paynow's text is safe to log: it names the
        // problem, never the donor.
        throw new GatewayError(`Paynow refused the payment: ${unsigned.get("error")}`);
      }

      const fields = readPaynowMessage(reply, integrationKey);
      const redirectUrl = fields?.get("browserurl");
      const pollUrl = fields?.get("pollurl");
      if (fields?.get("status")?.toLowerCase() !== "ok" || !redirectUrl || !pollUrl) {
        throw new GatewayError("Paynow sent a reply that couldn't be verified");
      }
      if (!isPaynowUrl(redirectUrl) || !isPaynowUrl(pollUrl)) {
        throw new GatewayError("Paynow sent a link outside paynow.co.zw");
      }
      return { redirectUrl, pollUrl };
    },

    async poll(pollUrl) {
      if (!isPaynowUrl(pollUrl)) return null;
      const fields = readPaynowMessage(await post(pollUrl, ""), integrationKey);
      return fields ? toResult(fields) : null;
    },

    readCallback(body) {
      const fields = readPaynowMessage(body, integrationKey);
      return fields ? toResult(fields) : null;
    },
  };
}

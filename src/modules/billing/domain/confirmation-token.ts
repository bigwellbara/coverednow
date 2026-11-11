import { createHmac, timingSafeEqual } from "node:crypto";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const CONFIRMATION_TTL_DAYS = 7;
export const CONFIRMATION_TTL_MS = CONFIRMATION_TTL_DAYS * DAY_IN_MS;

function signature(secret: string, confirmationId: string): Buffer {
  return createHmac("sha256", secret)
    .update(`bill-confirmation:${confirmationId}`)
    .digest();
}

/**
 * A link is the confirmation's id plus a signature of it. Nothing secret is stored,
 * so a leaked database doesn't reveal working links, and a link can be re-sent.
 * Expiry and single use are enforced from the confirmation's record.
 */
export function signConfirmationToken(
  secret: string,
  confirmationId: string,
): string {
  return `${confirmationId}.${signature(secret, confirmationId).toString("base64url")}`;
}

/** The confirmation id, or null if the token wasn't signed with this secret. */
export function readConfirmationToken(
  secret: string,
  token: string,
): string | null {
  const [id, signed, ...rest] = token.split(".");
  if (!id || !signed || rest.length > 0) return null;

  const expected = signature(secret, id);
  const actual = Buffer.from(signed, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected)
    ? id
    : null;
}

/** Names no student, because WhatsApp messages can be seen on a locked phone. */
export function confirmationMessage(schoolName: string, link: string): string {
  return `CoveredNow: a fee bill at ${schoolName} needs your confirmation. Please open this link within ${CONFIRMATION_TTL_DAYS} days: ${link}`;
}

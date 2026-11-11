import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const MINUTE = 60_000;

export const OTP_POLICY = {
  ttlMs: 5 * MINUTE,
  /** Guesses allowed against one code before it stops working. */
  maxAttempts: 5,
  addressWindowMs: 10 * MINUTE,
  maxPerAddress: 3,
  ipWindowMs: 60 * MINUTE,
  maxPerIp: 10,
} as const;

/** Uniformly random, unlike anything built on Math.random. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Bound to the address so a stored hash is useless for any other one. */
export function hashOtpCode(secret: string, address: string, code: string): string {
  return hmac(secret, `otp:${address}:${code}`);
}

export function otpCodeMatches(
  secret: string,
  address: string,
  code: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashOtpCode(secret, address, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Lets us rate-limit by address without storing visitors' IP addresses. */
export function hashIp(secret: string, ip: string): string {
  return hmac(secret, `ip:${ip}`);
}

/** Plain text with no links: it goes to people who have never messaged us. */
export function otpMessage(code: string): string {
  const minutes = OTP_POLICY.ttlMs / MINUTE;
  return `Your CoveredNow code is ${code}. It expires in ${minutes} minutes. Don't share it with anyone.`;
}

/** The code stays out of the subject, as subjects show on locked phones. */
export function otpEmail(code: string): { subject: string; text: string } {
  return {
    subject: "Your CoveredNow sign-in code",
    text: `${otpMessage(code)}\n\nIf you didn't ask for this, you can ignore this email.`,
  };
}

import { randomBytes } from "node:crypto";

/** No 0/O or 1/I, so a reference read out over the phone can't be misheard. */
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** A short, unguessable reference such as "CN-7K3QX9MW", sent to the gateway. */
export function newReference(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) code += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  return `CN-${code}`;
}

export function isReference(value: string): boolean {
  return /^CN-[2-9A-HJ-NP-Z]{8}$/.test(value);
}

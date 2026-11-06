/**
 * Accepts the ways Zimbabwean mobile numbers are commonly written and returns
 * the E.164 form, or null if it is not a Zimbabwean mobile number. Launch is
 * Zimbabwe-only; diaspora donors will need this widened when donor sign-up opens.
 */
export function normalizeZimbabweMobile(input: string): string | null {
  const compact = input.replace(/[\s()-]/g, "");
  const national = compact.replace(/^(?:\+263|00263|263)?0?/, "");
  return /^7[1378]\d{7}$/.test(national) ? `+263${national}` : null;
}

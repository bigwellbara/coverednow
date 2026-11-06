/** Well above any fee, and keeps amounts well inside the database column. */
export const MAX_AMOUNT_CENTS = 99_999_999;

/**
 * Reads an amount into integer cents, using no floating point. Commas only count
 * as thousands separators, so "200,50" is refused rather than becoming $20,050.
 */
export function parseAmountToCents(input: string): number | null {
  const value = input.trim().replace(/^\$/, "").trim();
  const match = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;

  const dollars = Number(match[1]!.replaceAll(",", ""));
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const total = dollars * 100 + cents;
  return total > 0 && total <= MAX_AMOUNT_CENTS ? total : null;
}

/** The form a database decimal column takes: "200.50". */
export function centsToDecimal(cents: number): string {
  const whole = Math.trunc(cents / 100);
  return `${whole}.${String(cents % 100).padStart(2, "0")}`;
}

export function formatMoney(cents: number): string {
  const whole = Math.trunc(cents / 100).toLocaleString("en-US");
  return `$${whole}.${String(cents % 100).padStart(2, "0")}`;
}

/** From a database decimal already formatted to two places, such as "200.50". */
export function decimalToCents(decimal: string): number {
  return Number(decimal.replace(".", ""));
}

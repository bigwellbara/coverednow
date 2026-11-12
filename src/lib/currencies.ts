/** Currencies donors at home and in the diaspora most often think in. */
export const CURRENCIES = {
  USD: "US dollar",
  ZWG: "Zimbabwe Gold (ZiG)",
  ZAR: "South African rand",
  GBP: "British pound",
  EUR: "Euro",
  BWP: "Botswana pula",
  AUD: "Australian dollar",
  CAD: "Canadian dollar",
  NZD: "New Zealand dollar",
  ZMW: "Zambian kwacha",
  CNY: "Chinese yuan",
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/** How many of each currency one US dollar buys. USD itself is always 1. */
export type UsdRates = {
  rates: Partial<Record<CurrencyCode, number>> & { USD: 1 };
  /** When the provider last updated them, as an ISO date. */
  updatedAt: string;
};

/** Converts between any two currencies through the dollar. Null if a rate is missing. */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: UsdRates["rates"],
): number | null {
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}

/** "£37.62", "ZAR 1,234". Whole units from 1,000 up, where cents are just noise. */
export function formatCurrency(amount: number, code: CurrencyCode): string {
  const whole = Math.abs(amount) >= 1_000;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

const REGION_CURRENCY: Record<string, CurrencyCode> = {
  ZW: "ZWG",
  ZA: "ZAR",
  GB: "GBP",
  BW: "BWP",
  AU: "AUD",
  CA: "CAD",
  NZ: "NZD",
  ZM: "ZMW",
  CN: "CNY",
  US: "USD",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  NL: "EUR",
  BE: "EUR",
  IT: "EUR",
  ES: "EUR",
  PT: "EUR",
  AT: "EUR",
  FI: "EUR",
};

/** A sensible first guess from a browser language such as "en-GB". Zimbabwe otherwise. */
export function currencyForLocale(locale: string | undefined): CurrencyCode {
  const region = locale?.split("-")[1]?.toUpperCase();
  return (region && REGION_CURRENCY[region]) || "ZWG";
}

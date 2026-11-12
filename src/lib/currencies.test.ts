import { describe, expect, it } from "vitest";
import { convert, currencyForLocale, formatCurrency } from "./currencies";

const rates = { USD: 1, GBP: 0.75, ZAR: 16.5 } as const;

describe("convert", () => {
  it("goes through the dollar", () => {
    expect(convert(100, "USD", "GBP", rates)).toBeCloseTo(75);
    expect(convert(75, "GBP", "USD", rates)).toBeCloseTo(100);
    expect(convert(75, "GBP", "ZAR", rates)).toBeCloseTo(1650);
  });

  it("is null when a rate is missing", () => {
    expect(convert(10, "USD", "BWP", rates)).toBeNull();
  });
});

describe("formatCurrency", () => {
  it("keeps cents on small amounts and drops them on large ones", () => {
    expect(formatCurrency(37.624, "GBP")).toBe("£37.62");
    // Intl puts a non-breaking space after the R.
    expect(formatCurrency(16_500.4, "ZAR")).toMatch(/^R\s16,500$/);
  });

  it("copes with a currency that has no symbol", () => {
    expect(formatCurrency(26.5, "ZWG")).toMatch(/ZWG\s?26\.50/);
  });
});

describe("currencyForLocale", () => {
  it("guesses from the region", () => {
    expect(currencyForLocale("en-GB")).toBe("GBP");
    expect(currencyForLocale("en-za")).toBe("ZAR");
    expect(currencyForLocale("fr-FR")).toBe("EUR");
  });

  it("falls back to ZiG", () => {
    expect(currencyForLocale("en")).toBe("ZWG");
    expect(currencyForLocale(undefined)).toBe("ZWG");
  });
});

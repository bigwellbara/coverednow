import { describe, expect, it } from "vitest";
import {
  checkAmount,
  displayNameFor,
  parseFeePercent,
  quote,
  suggestedAmounts,
} from "./checkout";
import { isReference, newReference } from "./reference";

describe("quote", () => {
  it("adds the tip, then a fee that covers the gateway's cut of everything", () => {
    const q = quote(5_000, 7, 250);

    expect(q).toEqual({ amountCents: 5_000, tipCents: 350, feeCents: 138, totalCents: 5_488 });
    // After the gateway takes 2.5% of the total, the school and tip are whole.
    expect(q.totalCents - Math.round(q.totalCents * 0.025)).toBeGreaterThanOrEqual(5_350);
  });

  it("can be tip-free and fee-free", () => {
    expect(quote(5_000, 0, 0)).toEqual({
      amountCents: 5_000,
      tipCents: 0,
      feeCents: 0,
      totalCents: 5_000,
    });
  });

  it("never leaves the school short, whatever the amount", () => {
    for (let amount = 100; amount < 30_000; amount += 137) {
      const { totalCents, feeCents } = quote(amount, 7, 350);
      const gatewayCut = (totalCents * 350) / 10_000;
      expect(feeCents).toBeGreaterThanOrEqual(gatewayCut);
    }
  });
});

describe("amounts", () => {
  it("must be at least $1 and no more than the bill needs", () => {
    expect(checkAmount(99, 10_000)).toBe("TOO_SMALL");
    expect(checkAmount(100.5, 10_000)).toBe("TOO_SMALL");
    expect(checkAmount(10_001, 10_000)).toBe("MORE_THAN_NEEDED");
    expect(checkAmount(10_000, 10_000)).toBeNull();
  });

  it("suggests the full balance, then round figures below it", () => {
    expect(suggestedAmounts(9_400)).toEqual([9_400, 1_000, 2_500, 5_000]);
    expect(suggestedAmounts(1_500)).toEqual([1_500, 1_000]);
    expect(suggestedAmounts(50)).toEqual([]);
  });
});

describe("fee setting", () => {
  it("reads a percentage into basis points", () => {
    expect(parseFeePercent("2.5")).toBe(250);
    expect(parseFeePercent("0")).toBe(0);
    expect(parseFeePercent("3.75")).toBe(375);
  });

  it("refuses anything odd or over 10%", () => {
    expect(parseFeePercent("11")).toBeNull();
    expect(parseFeePercent("-1")).toBeNull();
    expect(parseFeePercent("2.5%")).toBeNull();
    expect(parseFeePercent(undefined)).toBeNull();
  });
});

describe("display names", () => {
  it("follows the donor's choice", () => {
    expect(displayNameFor("PUBLIC", "Rudo Chikwanha", "ignored")).toBe("Rudo Chikwanha");
    expect(displayNameFor("ANONYMOUS", "Rudo Chikwanha", "ignored")).toBeNull();
    expect(displayNameFor("ALIAS", "Rudo Chikwanha", "  Harare Alumni '09 ")).toBe(
      "Harare Alumni '09",
    );
  });

  it("refuses aliases that are empty, long or carry links and markup", () => {
    expect(displayNameFor("ALIAS", "Rudo", "")).toBeUndefined();
    expect(displayNameFor("ALIAS", "Rudo", "x".repeat(41))).toBeUndefined();
    expect(displayNameFor("ALIAS", "Rudo", "<b>hi</b>")).toBeUndefined();
    expect(displayNameFor("ALIAS", "Rudo", "visit http://x.co")).toBeUndefined();
  });
});

describe("references", () => {
  it("are short, readable and different every time", () => {
    const references = new Set(Array.from({ length: 500 }, newReference));

    expect(references.size).toBe(500);
    for (const reference of references) expect(isReference(reference)).toBe(true);
    expect(isReference("CN-0OI1AAAA")).toBe(false);
  });
});

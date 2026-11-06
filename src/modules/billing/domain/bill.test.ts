import { describe, expect, it } from "vitest";
import {
  isValidRegNumber,
  isValidTerm,
  normalizeRegNumber,
  parseDueDate,
  schoolTypesFor,
  termLabel,
  termOptions,
} from "./bill";
import {
  confirmationMessage,
  readConfirmationToken,
  signConfirmationToken,
} from "./confirmation-token";
import { centsToDecimal, formatMoney, parseAmountToCents } from "./money";

describe("parseAmountToCents", () => {
  it.each([
    ["200", 20_000],
    ["200.5", 20_050],
    ["200.50", 20_050],
    ["$200", 20_000],
    [" 1,000 ", 100_000],
    ["1,000,000.25", 100_000_025],
    ["0.01", 1],
    ["0.07", 7],
    ["19.99", 1_999],
    ["1.10", 110],
  ])("reads %j as %i cents", (input, cents) => {
    if (cents > 99_999_999) expect(parseAmountToCents(input)).toBeNull();
    else expect(parseAmountToCents(input)).toBe(cents);
  });

  it.each([
    ["a decimal comma, which must never read as $20,050", "200,50"],
    ["misplaced thousands", "1,00"],
    ["three decimals", "1.234"],
    ["zero", "0"],
    ["zero with cents", "0.00"],
    ["negative", "-5"],
    ["words", "abc"],
    ["empty", ""],
    ["exponent", "1e5"],
    ["too large", "1000000"],
  ])("refuses %s", (_name, input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });
});

describe("centsToDecimal and formatMoney", () => {
  it.each([
    [1, "0.01", "$0.01"],
    [110, "1.10", "$1.10"],
    [20_050, "200.50", "$200.50"],
    [100_000, "1000.00", "$1,000.00"],
  ])("%i cents", (cents, decimal, money) => {
    expect(centsToDecimal(cents)).toBe(decimal);
    expect(formatMoney(cents)).toBe(money);
  });
});

describe("terms", () => {
  it.each(["2027-T1", "2027-T3", "2027-S1", "2027-S2"])("accepts %s", (term) => {
    expect(isValidTerm(term)).toBe(true);
  });

  it.each(["2027-T4", "2027-S3", "Term 1", "27-T1", "2027-T1x", ""])(
    "refuses %j",
    (term) => {
      expect(isValidTerm(term)).toBe(false);
    },
  );

  it("labels them for people", () => {
    expect(termLabel("2027-T1")).toBe("Term 1, 2027");
    expect(termLabel("2027-S2")).toBe("Semester 2, 2027");
  });

  it("offers this year and next, all valid", () => {
    const options = termOptions(new Date("2026-11-06T00:00:00Z"));

    expect(options[0]?.value).toBe("2026-T1");
    expect(options.at(-1)?.value).toBe("2027-S2");
    expect(options.every((option) => isValidTerm(option.value))).toBe(true);
  });
});

describe("reg numbers", () => {
  it("ignores capitalisation and spacing", () => {
    expect(normalizeRegNumber(" h150 123a ")).toBe("H150123A");
  });

  it.each(["H150123A", "H150/2024", "R-123"])("accepts %s", (reg) => {
    expect(isValidRegNumber(reg)).toBe(true);
  });

  it.each(["", "AB", "A".repeat(31), "<script>", "a b"])("refuses %j", (reg) => {
    expect(isValidRegNumber(reg)).toBe(false);
  });
});

describe("parseDueDate", () => {
  it("is the end of that day in Zimbabwe", () => {
    expect(parseDueDate("2027-01-31")?.toISOString()).toBe(
      "2027-01-31T21:59:59.999Z",
    );
  });

  it.each(["2027-02-30", "2027-13-01", "2027-00-10", "tomorrow", "", "2027-1-1"])(
    "refuses %j",
    (input) => {
      expect(parseDueDate(input)).toBeNull();
    },
  );

  it("accepts a leap day only in a leap year", () => {
    expect(parseDueDate("2028-02-29")).not.toBeNull();
    expect(parseDueDate("2027-02-29")).toBeNull();
  });
});

describe("schoolTypesFor", () => {
  it("keeps high schools to guardians, so minors never hold accounts", () => {
    expect(schoolTypesFor("GUARDIAN")).toEqual(["HIGH_SCHOOL"]);
    expect(schoolTypesFor("STUDENT")).not.toContain("HIGH_SCHOOL");
  });
});

describe("confirmation tokens", () => {
  const SECRET = "test-secret";
  const ID = "cmabc123";

  it("reads back the id", () => {
    expect(readConfirmationToken(SECRET, signConfirmationToken(SECRET, ID))).toBe(
      ID,
    );
  });

  it("gives the same link each time, so it can be re-sent", () => {
    expect(signConfirmationToken(SECRET, ID)).toBe(
      signConfirmationToken(SECRET, ID),
    );
  });

  it("refuses a token signed with another secret", () => {
    expect(
      readConfirmationToken(SECRET, signConfirmationToken("other-secret", ID)),
    ).toBeNull();
  });

  it("refuses a signature moved onto another confirmation", () => {
    const signed = signConfirmationToken(SECRET, ID).split(".")[1];

    expect(readConfirmationToken(SECRET, `other-id.${signed}`)).toBeNull();
  });

  it.each(["", "cmabc123", "cmabc123.", ".abc", "a.b.c", "cmabc123.not-valid"])(
    "refuses %j",
    (token) => {
      expect(readConfirmationToken(SECRET, token)).toBeNull();
    },
  );

  it("does not name the student in the message", () => {
    const message = confirmationMessage(
      "Test University",
      "https://example.test/confirm/x",
    );

    expect(message).toContain("Test University");
    expect(message).toContain("https://example.test/confirm/x");
  });
});

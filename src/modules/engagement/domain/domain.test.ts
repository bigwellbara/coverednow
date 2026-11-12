import { describe, expect, it } from "vitest";
import { campaignProgress, isCampaignOpen, slugify } from "./campaign";
import {
  badgesFor,
  csvCell,
  giftsToCsv,
  longestMonthlyRun,
  reportTotals,
  yearInReview,
  type GiftFact,
} from "./giving";
import { parsePeriod, periodStart, rank } from "./leaderboard";

let n = 0;
const gift = (overrides: Partial<GiftFact> & { school?: string; term?: string; funded?: boolean } = {}): GiftFact => {
  const { school = "Hillside High", term = "2027-T1", funded = false, ...rest } = overrides;
  n += 1;
  return {
    id: `d${n}`,
    reference: `CN-${n}`,
    billId: `b${n}`,
    amountCents: 2_000,
    tipCents: 200,
    feeCents: 100,
    settledAt: new Date("2027-03-10T10:00:00Z"),
    displayName: "Rudo",
    campaignId: null,
    bill: {
      schoolId: school,
      schoolName: school,
      city: "Harare",
      term,
      studentInitials: "T. M.",
      studentLevel: "Form 3",
      funded,
      statusLabel: funded ? "Fully funded" : "Partly funded",
    },
    ...rest,
  };
};

describe("badges", () => {
  const earned = (gifts: GiftFact[]) =>
    badgesFor(gifts).filter((badge) => badge.earned).map((badge) => badge.key);

  it("earns nothing before the first gift, with progress shown", () => {
    const badges = badgesFor([]);
    expect(badges.every((badge) => !badge.earned)).toBe(true);
    expect(badges.find((badge) => badge.key === "century")?.progress).toBe("$0 of $100");
  });

  it("earns badges from what was given", () => {
    const gifts = [
      gift({ amountCents: 6_000, school: "A", term: "2027-T1", funded: true }),
      gift({ amountCents: 5_000, school: "B", term: "2027-T2" }),
      gift({ school: "C", term: "2027-T3", campaignId: "c1" }),
    ];
    expect(earned(gifts)).toEqual([
      "first-gift",
      "finisher",
      "century",
      "three-schools",
      "term-after-term",
      "circle",
    ]);
  });

  it("counts months in a row in Harare time", () => {
    expect(
      longestMonthlyRun([
        new Date("2027-01-31T22:30:00Z"), // 1 February in Harare
        new Date("2027-03-05T10:00:00Z"),
        new Date("2027-04-05T10:00:00Z"),
        new Date("2027-06-05T10:00:00Z"),
      ]),
    ).toBe(3);
    expect(longestMonthlyRun([])).toBe(0);
  });
});

describe("year in review", () => {
  it("covers only that year's gifts", () => {
    const review = yearInReview(
      [
        gift({ amountCents: 3_000, school: "B", funded: true }),
        gift({ amountCents: 1_000, school: "A" }),
        gift({ settledAt: new Date("2026-12-31T22:30:00Z") }), // 00:30, 1 January 2027 in Harare
        gift({ settledAt: new Date("2026-12-31T21:30:00Z") }), // 23:30, still 2026
      ],
      2027,
    );
    expect(review).toMatchObject({
      givenCents: 6_000,
      gifts: 3,
      students: 3,
      schools: ["A", "B", "Hillside High"],
      billsFunded: 1,
      biggestGiftCents: 3_000,
      busiestMonth: "March",
    });
  });

  it("is empty for a quiet year", () => {
    expect(yearInReview([], 2027)).toMatchObject({ gifts: 0, biggestGiftCents: 0, firstGiftAt: null });
  });
});

describe("reports", () => {
  it("totals by school, biggest first", () => {
    const totals = reportTotals([
      gift({ school: "A", amountCents: 1_000 }),
      gift({ school: "B", amountCents: 5_000 }),
      gift({ school: "A", amountCents: 1_000 }),
    ]);
    expect(totals.toSchoolsCents).toBe(7_000);
    expect(totals.tipsCents).toBe(600);
    expect(totals.schools.map((school) => [school.schoolName, school.amountCents, school.students])).toEqual([
      ["B", 5_000, 1],
      ["A", 2_000, 2],
    ]);
  });

  it("quotes CSV cells and defuses formulas", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('Harare, "North"')).toBe('"Harare, ""North"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-5")).toBe("'-5");
  });

  it("writes one row per gift, in dollars", () => {
    const csv = giftsToCsv([gift({ displayName: null, amountCents: 2_550 })]);
    const [header, row] = csv.trim().split("\r\n");
    expect(header).toMatch(/^Date,Reference,School/);
    expect(row).toMatch(/,25\.50,2\.00,1\.00,Partly funded,Anonymous$/);
  });
});

describe("campaigns", () => {
  it("makes readable slugs", () => {
    expect(slugify("Harare Alumni '09 Drive!")).toBe("harare-alumni-09-drive");
    expect(slugify("Rúdo's 30th")).toBe("rudo-s-30th");
    expect(slugify("!!!")).toBe("campaign");
  });

  it("adds a checked match, up to its cap", () => {
    expect(
      campaignProgress({ goalCents: 100_000, raisedCents: 30_000, matchCapCents: 20_000, matchChecked: true }),
    ).toEqual({ raisedCents: 30_000, matchedCents: 20_000, totalCents: 50_000, percent: 50, matchLeftCents: 0 });

    expect(
      campaignProgress({ goalCents: 100_000, raisedCents: 5_000, matchCapCents: 20_000, matchChecked: true }),
    ).toMatchObject({ matchedCents: 5_000, totalCents: 10_000, matchLeftCents: 15_000 });
  });

  it("ignores a match nobody has checked", () => {
    expect(
      campaignProgress({ goalCents: 10_000, raisedCents: 5_000, matchCapCents: 50_000, matchChecked: false }),
    ).toMatchObject({ matchedCents: 0, totalCents: 5_000, percent: 50 });
  });

  it("closes when hidden or past its end", () => {
    const now = new Date("2027-03-10T10:00:00Z");
    expect(isCampaignOpen({ endsAt: null, hiddenAt: null }, now)).toBe(true);
    expect(isCampaignOpen({ endsAt: new Date("2027-03-09T00:00:00Z"), hiddenAt: null }, now)).toBe(false);
    expect(isCampaignOpen({ endsAt: null, hiddenAt: now }, now)).toBe(false);
  });
});

describe("leaderboard", () => {
  it("starts periods at midnight in Harare", () => {
    const now = new Date("2027-03-10T10:00:00Z");
    expect(periodStart("month", now)?.toISOString()).toBe("2027-02-28T22:00:00.000Z");
    expect(periodStart("year", now)?.toISOString()).toBe("2026-12-31T22:00:00.000Z");
    expect(periodStart("all", now)).toBeNull();
  });

  it("shares a rank on a tie", () => {
    const ranked = rank([{ givenCents: 50 }, { givenCents: 100 }, { givenCents: 50 }, { givenCents: 10 }]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 2, 4]);
  });

  it("defaults to this month", () => {
    expect(parsePeriod("year")).toBe("year");
    expect(parsePeriod("forever")).toBe("month");
  });
});

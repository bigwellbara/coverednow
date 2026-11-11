import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEED_FILTER,
  applyFeedFilter,
  daysLeft,
  dueLabel,
  initialsOf,
  parseFeedFilter,
  percentFunded,
  type PublicBill,
} from "./public-bill";

const NOW = new Date("2027-01-10T08:00:00Z");
const day = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

const bill = (overrides: Partial<PublicBill>): PublicBill => ({
  id: "bill",
  schoolId: "uni",
  schoolName: "Test University",
  schoolType: "UNIVERSITY",
  city: "Harare",
  term: "2027-T1",
  studentInitials: "T. M.",
  studentLevel: "Year 2",
  confirmedCents: 20_000,
  raisedCents: 0,
  dueDate: day(20),
  status: "SCHOOL_CONFIRMED",
  createdAt: day(-5),
  confirmedAt: day(-4),
  fundedAt: null,
  ...overrides,
});

describe("initials", () => {
  it("keeps one letter of each name", () => {
    expect(initialsOf("tendai", "Moyo")).toBe("T. M.");
    expect(initialsOf(" Rudo ", "")).toBe("R.");
  });
});

describe("progress", () => {
  it("rounds down, so 100% means fully funded", () => {
    expect(percentFunded({ confirmedCents: 20_000, raisedCents: 19_999 })).toBe(99);
    expect(percentFunded({ confirmedCents: 20_000, raisedCents: 20_000 })).toBe(100);
    expect(percentFunded({ confirmedCents: 20_000, raisedCents: 25_000 })).toBe(100);
    expect(percentFunded({ confirmedCents: 0, raisedCents: 0 })).toBe(0);
  });
});

describe("due dates", () => {
  it("counts whole days and never invents urgency", () => {
    expect(daysLeft(day(12.5), NOW)).toBe(12);
    expect(dueLabel(day(12.5), NOW)).toBe("12 days left");
    expect(dueLabel(day(1.2), NOW)).toBe("1 day left");
    expect(dueLabel(day(0.5), NOW)).toBe("Due today");
    expect(dueLabel(day(-1), NOW)).toBe("Past due");
  });
});

describe("feed filter", () => {
  it("reads known values and ignores the rest", () => {
    expect(
      parseFeedFilter({ type: "HIGH_SCHOOL", school: "abc123", max: "10000", sort: "due-soon" }),
    ).toEqual({ type: "HIGH_SCHOOL", schoolId: "abc123", maxRemainingCents: 10_000, sort: "due-soon" });
    expect(
      parseFeedFilter({ type: "PRISON", school: "<script>", max: "7", sort: "random" }),
    ).toEqual(DEFAULT_FEED_FILTER);
    expect(parseFeedFilter({ type: ["COLLEGE", "UNIVERSITY"] }).type).toBe("COLLEGE");
  });

  it("shows only bills open for donations", () => {
    const bills = [
      bill({ id: "open" }),
      bill({ id: "partly", status: "PARTIALLY_FUNDED", raisedCents: 5_000 }),
      bill({ id: "funded", status: "FUNDED", raisedCents: 20_000 }),
      bill({ id: "past-due", dueDate: day(-1) }),
    ];
    expect(applyFeedFilter(bills, DEFAULT_FEED_FILTER, NOW).map((b) => b.id)).toEqual([
      "partly",
      "open",
    ]);
  });

  it("filters by level, school and amount still needed", () => {
    const bills = [
      bill({ id: "uni-big" }),
      bill({ id: "uni-small", raisedCents: 15_000, status: "PARTIALLY_FUNDED" }),
      bill({ id: "hs", schoolId: "hs", schoolType: "HIGH_SCHOOL", confirmedCents: 8_000 }),
    ];
    const ids = (filter: Partial<typeof DEFAULT_FEED_FILTER>) =>
      applyFeedFilter(bills, { ...DEFAULT_FEED_FILTER, ...filter }, NOW).map((b) => b.id);

    expect(ids({ type: "HIGH_SCHOOL" })).toEqual(["hs"]);
    expect(ids({ schoolId: "uni" })).toEqual(["uni-small", "uni-big"]);
    expect(ids({ maxRemainingCents: 10_000, sort: "smallest" })).toEqual(["uni-small", "hs"]);
  });

  it("sorts by each option", () => {
    const bills = [
      bill({ id: "a", dueDate: day(30), raisedCents: 2_000, confirmedAt: day(-1) }),
      bill({ id: "b", dueDate: day(5), raisedCents: 0, confirmedAt: day(-9) }),
      bill({ id: "c", dueDate: day(15), raisedCents: 18_000, confirmedAt: day(-3) }),
    ];
    const ids = (sort: typeof DEFAULT_FEED_FILTER.sort) =>
      applyFeedFilter(bills, { ...DEFAULT_FEED_FILTER, sort }, NOW).map((b) => b.id);

    expect(ids("almost-funded")).toEqual(["c", "a", "b"]);
    expect(ids("due-soon")).toEqual(["b", "c", "a"]);
    expect(ids("smallest")).toEqual(["c", "a", "b"]);
    expect(ids("newest")).toEqual(["a", "c", "b"]);
  });
});

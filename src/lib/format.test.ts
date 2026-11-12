import { describe, expect, it } from "vitest";
import { QUOTES, quoteOfTheDay } from "./daily-quote";
import { timeAgo } from "./format";

const NOW = new Date("2027-01-10T12:00:00Z");
const before = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

describe("timeAgo", () => {
  it("counts up through minutes, hours and yesterday", () => {
    expect(timeAgo(before(0.5), NOW)).toBe("just now");
    expect(timeAgo(before(5), NOW)).toBe("5 min ago");
    expect(timeAgo(before(60), NOW)).toBe("1 hour ago");
    expect(timeAgo(before(23 * 60), NOW)).toBe("23 hours ago");
    expect(timeAgo(before(30 * 60), NOW)).toBe("yesterday");
  });

  it("gives the date after two days", () => {
    expect(timeAgo(before(3 * 24 * 60), NOW)).toBe("7 Jan 2027");
  });
});

describe("quoteOfTheDay", () => {
  it("changes each day and comes round again", () => {
    const days = QUOTES.length + 1;
    const quotes = Array.from({ length: days }, (_, i) =>
      quoteOfTheDay(new Date(Date.UTC(2027, 0, 10 + i, 8))),
    );
    expect(new Set(quotes.slice(0, QUOTES.length)).size).toBe(QUOTES.length);
    expect(quotes[QUOTES.length]).toBe(quotes[0]);
  });
});

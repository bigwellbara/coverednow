import { describe, expect, it } from "vitest";
import { normalizeZimbabweMobile } from "./phone";

describe("normalizeZimbabweMobile", () => {
  it.each([
    "0771234567",
    "771234567",
    "+263771234567",
    "263771234567",
    "00263771234567",
    "+263 77 123 4567",
    "077-123-4567",
    "+263 (0) 77 123 4567",
  ])("accepts %s", (input) => {
    expect(normalizeZimbabweMobile(input)).toBe("+263771234567");
  });

  it.each(["0711234567", "0731234567", "0781234567"])(
    "accepts the %s network prefix",
    (input) => {
      expect(normalizeZimbabweMobile(input)).toBe(`+263${input.slice(1)}`);
    },
  );

  it.each([
    "",
    "not a phone",
    "077123456", // too short
    "07712345678", // too long
    "0241234567", // landline
    "+447700900123", // not Zimbabwean
    "0771234567; DROP TABLE",
  ])("rejects %s", (input) => {
    expect(normalizeZimbabweMobile(input)).toBeNull();
  });
});

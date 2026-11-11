import { describe, expect, it } from "vitest";
import {
  homePathFor,
  parseSignInAddress,
  safeNextPath,
  signUpDetailsSchema,
} from "./account";

describe("parseSignInAddress", () => {
  it.each(["0771234567", "+263 77 123 4567", "263771234567"])(
    "reads %j as a phone",
    (input) => {
      expect(parseSignInAddress(input)).toEqual({
        kind: "PHONE",
        value: "+263771234567",
      });
    },
  );

  it.each(["tariro@example.com", " Tariro@Example.COM ", "TARIRO@EXAMPLE.COM"])(
    "reads %j as one email, so capitals can't create a second account",
    (input) => {
      expect(parseSignInAddress(input)).toEqual({
        kind: "EMAIL",
        value: "tariro@example.com",
      });
    },
  );

  it.each([
    "",
    "abc",
    "12345",
    "@example.com",
    "tariro@",
    "tariro@example",
    "a b@example.com",
    "a@b@example.com",
    `${"a".repeat(250)}@example.com`,
    "tariro@example.com\nBcc: everyone@example.com",
  ])("refuses %j", (input) => {
    expect(parseSignInAddress(input)).toBeNull();
  });
});

describe("signUpDetailsSchema", () => {
  it("accepts a name and an applicant role", () => {
    expect(
      signUpDetailsSchema.parse({ name: " Tariro Moyo ", role: "GUARDIAN" }),
    ).toEqual({ name: "Tariro Moyo", role: "GUARDIAN" });
  });

  it("drops any unproven email or phone sent along with it", () => {
    expect(
      signUpDetailsSchema.parse({
        name: "Tariro Moyo",
        role: "STUDENT",
        email: "someone-else@example.com",
        phone: "+263771234567",
      }),
    ).toEqual({ name: "Tariro Moyo", role: "STUDENT" });
  });

  it("accepts a donor", () => {
    expect(signUpDetailsSchema.parse({ name: "Rudo", role: "DONOR" }).role).toBe("DONOR");
  });

  it.each(["ADMIN", "SCHOOL_CONTACT", "SPONSOR", ""])("refuses the %j role", (role) => {
    expect(
      signUpDetailsSchema.safeParse({ name: "Tariro Moyo", role }).success,
    ).toBe(false);
  });
});

describe("safeNextPath", () => {
  it.each(["/browse", "/browse/abc123/give?amount=2500", "/giving"])("keeps %j", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    "//evil.test",
    "/\\evil.test",
    "https://evil.test",
    "javascript:alert(1)",
    "browse",
    "/a b",
    `/${"a".repeat(250)}`,
    42,
    undefined,
  ])("refuses %j", (path) => {
    expect(safeNextPath(path)).toBeNull();
  });
});

describe("homePathFor", () => {
  it("sends each role to its own start page", () => {
    expect(homePathFor("ADMIN")).toBe("/admin/verifications");
    expect(homePathFor("DONOR")).toBe("/giving");
    expect(homePathFor("STUDENT")).toBe("/onboarding");
    expect(homePathFor("GUARDIAN")).toBe("/onboarding");
  });
});

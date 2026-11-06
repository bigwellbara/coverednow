import { BillerType as PrismaBillerType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  BILLER_TYPES,
  contactDetailsSchema,
  describePayout,
  payoutDetailsSchema,
  verificationBlockers,
} from "./biller";

describe("BILLER_TYPES", () => {
  it("matches the enum in the Prisma schema", () => {
    expect([...BILLER_TYPES].sort()).toEqual(
      Object.values(PrismaBillerType).sort(),
    );
  });
});

describe("contactDetailsSchema", () => {
  const contact = {
    name: "A Bursar",
    phone: "077 100 0011",
    email: "",
    roleTitle: "Bursar",
  };

  it("normalises the phone and drops an empty email", () => {
    const parsed = contactDetailsSchema.parse(contact);

    expect(parsed.phone).toBe("+263771000011");
    expect(parsed.email).toBeUndefined();
  });

  it("refuses a landline, because links are sent to a mobile", () => {
    expect(
      contactDetailsSchema.safeParse({ ...contact, phone: "0242123456" }).success,
    ).toBe(false);
  });

  it("refuses an invalid email", () => {
    expect(
      contactDetailsSchema.safeParse({ ...contact, email: "nope" }).success,
    ).toBe(false);
  });
});

describe("payoutDetailsSchema", () => {
  const bank = {
    method: "BANK",
    bankName: "Test Bank",
    branch: "Harare",
    accountName: "Test University",
    accountNumber: "1234 5678-9012",
  };

  it("strips spacing from account numbers", () => {
    const parsed = payoutDetailsSchema.parse(bank);

    expect(parsed).toMatchObject({ accountNumber: "123456789012" });
  });

  it.each(["", "12", "12ab5678", "1".repeat(21)])(
    "refuses the account number %j",
    (accountNumber) => {
      expect(
        payoutDetailsSchema.safeParse({ ...bank, accountNumber }).success,
      ).toBe(false);
    },
  );

  it("needs every field for the method", () => {
    expect(
      payoutDetailsSchema.safeParse({ method: "BANK", bankName: "Test Bank" })
        .success,
    ).toBe(false);
    expect(payoutDetailsSchema.safeParse({ method: "CASH" }).success).toBe(false);
  });

  it("refuses a mobile money number that is not a mobile number", () => {
    expect(
      payoutDetailsSchema.safeParse({
        method: "MOBILE_MONEY",
        provider: "EcoCash",
        accountName: "Test College",
        number: "12345",
      }).success,
    ).toBe(false);
  });
});

describe("describePayout", () => {
  it.each([
    [
      {
        method: "BANK",
        bankName: "Test Bank",
        branch: "Harare",
        accountName: "Test University",
        accountNumber: "123456789012",
      },
      "123456789012",
      "Test Bank, Test University, account ending 9012",
    ],
    [
      {
        method: "MOBILE_MONEY",
        provider: "EcoCash",
        accountName: "Test College",
        number: "+263771000099",
      },
      "+263771000099",
      "EcoCash, Test College, number ending 0099",
    ],
    [
      {
        method: "MERCHANT",
        provider: "EcoCash",
        accountName: "Test School",
        merchantCode: "MERCH98765",
      },
      "MERCH98765",
      "EcoCash, Test School, code ending 8765",
    ],
  ] as const)("masks %j", (details, secret, expected) => {
    const description = describePayout(details);

    expect(description).toBe(expected);
    expect(description).not.toContain(secret);
  });
});

describe("verificationBlockers", () => {
  it("names everything still missing", () => {
    expect(
      verificationBlockers({ hasPayoutDetails: false, verifiedContacts: 0 }),
    ).toEqual(["PAYOUT_DETAILS_MISSING", "VERIFIED_CONTACT_MISSING"]);
    expect(
      verificationBlockers({ hasPayoutDetails: true, verifiedContacts: 0 }),
    ).toEqual(["VERIFIED_CONTACT_MISSING"]);
    expect(
      verificationBlockers({ hasPayoutDetails: false, verifiedContacts: 2 }),
    ).toEqual(["PAYOUT_DETAILS_MISSING"]);
  });

  it("clears once payout details and a verified contact exist", () => {
    expect(
      verificationBlockers({ hasPayoutDetails: true, verifiedContacts: 1 }),
    ).toEqual([]);
  });
});

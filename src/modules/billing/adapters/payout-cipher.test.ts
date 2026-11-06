import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PayoutDetails } from "../domain/biller";
import { createPayoutCipher } from "./payout-cipher";

const DETAILS: PayoutDetails = {
  method: "BANK",
  bankName: "Test Bank",
  branch: "Harare",
  accountName: "Test University",
  accountNumber: "123456789012",
};

describe("payout cipher", () => {
  const cipher = createPayoutCipher(randomBytes(32));

  it("returns what was encrypted", () => {
    expect(cipher.decrypt("school-1", cipher.encrypt("school-1", DETAILS))).toEqual(
      DETAILS,
    );
  });

  it("does not store the details in the clear", () => {
    const stored = JSON.stringify(cipher.encrypt("school-1", DETAILS));

    expect(stored).not.toContain("123456789012");
    expect(Buffer.from(JSON.parse(stored).data, "base64").toString()).not.toContain(
      "123456789012",
    );
  });

  it("uses a new IV each time", () => {
    expect(cipher.encrypt("school-1", DETAILS).iv).not.toBe(
      cipher.encrypt("school-1", DETAILS).iv,
    );
  });

  it("refuses details copied from another school", () => {
    const stored = cipher.encrypt("school-1", DETAILS);

    expect(() => cipher.decrypt("school-2", stored)).toThrow();
  });

  it("refuses tampered details", () => {
    const stored = cipher.encrypt("school-1", DETAILS);
    const bytes = Buffer.from(stored.data, "base64");
    bytes[0]! ^= 0xff;

    expect(() =>
      cipher.decrypt("school-1", { ...stored, data: bytes.toString("base64") }),
    ).toThrow();
  });

  it("refuses a different key", () => {
    const stored = cipher.encrypt("school-1", DETAILS);

    expect(() =>
      createPayoutCipher(randomBytes(32)).decrypt("school-1", stored),
    ).toThrow();
  });

  it("refuses a key of the wrong length", () => {
    expect(() => createPayoutCipher(randomBytes(16))).toThrow("32 bytes");
  });
});

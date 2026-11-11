import { beforeEach, describe, expect, it } from "vitest";
import type { SignInAddress, SignUpDetails } from "../domain/account";
import { createAccountService, type Account } from "./account-service";

const PHONE = "+263771234567";
const EMAIL = "tariro@example.com";
const SIGN_UP = { name: "Tariro Moyo", role: "STUDENT" };

type Row = Account & { phone: string | null; email: string | null };

function setup(rows: Row[] = []) {
  const accounts = [...rows];
  const created: Array<{ address: SignInAddress; details: SignUpDetails }> = [];
  const verified: string[] = [];
  let codeIsValid = true;

  const byAddress = (address: SignInAddress) =>
    accounts.find((row) =>
      address.kind === "PHONE"
        ? row.phone === address.value
        : row.email === address.value,
    );

  const service = createAccountService({
    otp: {
      verify: async (address) => {
        verified.push(address);
        return codeIsValid;
      },
    },
    store: {
      findByAddress: async (address) => byAddress(address) ?? null,
      create: async (address, details) => {
        created.push({ address, details });
        const row: Row = {
          id: "new-user",
          name: details.name,
          phone: address.kind === "PHONE" ? address.value : null,
          email: address.kind === "EMAIL" ? address.value : null,
        };
        accounts.push(row);
        return row;
      },
      addAddress: async (userId, address) => {
        const row = accounts.find((r) => r.id === userId)!;
        const field = address.kind === "PHONE" ? "phone" : "email";
        if (row[field]) return "ALREADY_SET";
        if (byAddress(address)) return "TAKEN";
        row[field] = address.value;
        return "ADDED";
      },
    },
  });

  return {
    service,
    accounts,
    created,
    verified,
    rejectCodes: () => {
      codeIsValid = false;
    },
  };
}

const row = (overrides: Partial<Row>): Row => ({
  id: "user-1",
  name: "Original Name",
  phone: null,
  email: null,
  ...overrides,
});

describe("account service", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  describe("signing up", () => {
    it("creates an account from a phone, normalised", async () => {
      const result = await t.service.signIn({
        address: "077 123 4567",
        code: "123456",
        signUp: SIGN_UP,
      });

      expect(result.ok).toBe(true);
      expect(t.created[0]?.address).toEqual({ kind: "PHONE", value: PHONE });
      expect(t.verified).toEqual([PHONE]);
    });

    it("creates an account from an email, normalised", async () => {
      const result = await t.service.signIn({
        address: " Tariro@Example.COM ",
        code: "123456",
        signUp: SIGN_UP,
      });

      expect(result.ok).toBe(true);
      expect(t.created[0]?.address).toEqual({ kind: "EMAIL", value: EMAIL });
      expect(t.verified).toEqual([EMAIL]);
      expect(t.accounts[0]?.phone).toBeNull();
    });

    it("creates nothing when the code is wrong", async () => {
      t.rejectCodes();

      expect(
        await t.service.signIn({ address: EMAIL, code: "000000", signUp: SIGN_UP }),
      ).toEqual({ ok: false, error: "INVALID_CODE" });
      expect(t.created).toEqual([]);
    });

    it.each(["ADMIN", "SPONSOR", "DONOR", "SCHOOL_CONTACT", ""])(
      "refuses to sign up with the %s role",
      async (role) => {
        const result = await t.service.signIn({
          address: EMAIL,
          code: "123456",
          signUp: { ...SIGN_UP, role },
        });

        expect(result).toEqual({ ok: false, error: "INVALID_DETAILS" });
        expect(t.created).toEqual([]);
      },
    );

    it("does not spend the code when the form is invalid", async () => {
      await t.service.signIn({
        address: PHONE,
        code: "123456",
        signUp: { ...SIGN_UP, name: "" },
      });

      expect(t.verified).toEqual([]);
    });

    it.each(["abc", "not@an@email", "@example.com", "12345"])(
      "rejects the address %j without spending a code",
      async (address) => {
        expect(await t.service.signIn({ address, code: "123456" })).toEqual({
          ok: false,
          error: "INVALID_DETAILS",
        });
        expect(t.verified).toEqual([]);
      },
    );
  });

  describe("signing in", () => {
    it("does not create an account from the sign-in form", async () => {
      expect(await t.service.signIn({ address: EMAIL, code: "123456" })).toEqual({
        ok: false,
        error: "NO_ACCOUNT",
      });
      expect(t.created).toEqual([]);
    });

    it("finds an account by phone or by email", async () => {
      const both = row({ phone: PHONE, email: EMAIL });
      t = setup([both]);

      for (const address of [PHONE, EMAIL, "TARIRO@example.com"]) {
        const result = await t.service.signIn({ address, code: "123456" });
        expect(result).toMatchObject({ ok: true, account: { id: "user-1" } });
      }
    });

    it("ignores sign-up details when the address already has an account", async () => {
      t = setup([row({ email: EMAIL })]);

      const result = await t.service.signIn({
        address: EMAIL,
        code: "123456",
        signUp: { name: "Someone Else", role: "GUARDIAN" },
      });

      expect(result).toMatchObject({ ok: true, account: { name: "Original Name" } });
      expect(t.created).toEqual([]);
    });
  });

  describe("adding a sign-in method", () => {
    it("adds an email to a phone account, so a lost phone isn't a lockout", async () => {
      t = setup([row({ phone: PHONE })]);

      expect(
        await t.service.addAddress("user-1", { address: EMAIL, code: "123456" }),
      ).toEqual({ ok: true });
      expect(t.accounts[0]?.email).toBe(EMAIL);
      expect(t.verified).toEqual([EMAIL]);
    });

    it("adds a phone to an email account", async () => {
      t = setup([row({ email: EMAIL })]);

      expect(
        await t.service.addAddress("user-1", { address: "0771234567", code: "123456" }),
      ).toEqual({ ok: true });
      expect(t.accounts[0]?.phone).toBe(PHONE);
    });

    it("needs a code sent to the new address", async () => {
      t = setup([row({ phone: PHONE })]);
      t.rejectCodes();

      expect(
        await t.service.addAddress("user-1", { address: EMAIL, code: "000000" }),
      ).toEqual({ ok: false, error: "INVALID_CODE" });
      expect(t.accounts[0]?.email).toBeNull();
    });

    it("refuses to replace a method, so a stolen session can't lock out the owner", async () => {
      t = setup([row({ phone: PHONE, email: EMAIL })]);

      expect(
        await t.service.addAddress("user-1", {
          address: "attacker@example.com",
          code: "123456",
        }),
      ).toEqual({ ok: false, error: "ALREADY_SET" });
      expect(t.accounts[0]?.email).toBe(EMAIL);
    });

    it("refuses an address on another account", async () => {
      t = setup([row({ phone: PHONE }), row({ id: "user-2", email: EMAIL })]);

      expect(
        await t.service.addAddress("user-1", { address: EMAIL, code: "123456" }),
      ).toEqual({ ok: false, error: "TAKEN" });
    });

    it("rejects an address it can't read", async () => {
      t = setup([row({ phone: PHONE })]);

      expect(
        await t.service.addAddress("user-1", { address: "abc", code: "123456" }),
      ).toEqual({ ok: false, error: "INVALID_DETAILS" });
      expect(t.verified).toEqual([]);
    });
  });
});

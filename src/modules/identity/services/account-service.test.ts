import { beforeEach, describe, expect, it } from "vitest";
import type { SignUpDetails } from "../domain/account";
import { createAccountService, type Account } from "./account-service";

const PHONE = "+263771234567";
const SIGN_UP = { name: "Tariro Moyo", email: "", role: "STUDENT" };

function setup(existing: Record<string, Account> = {}) {
  const accounts = new Map(Object.entries(existing));
  const created: Array<{ phone: string; details: SignUpDetails }> = [];
  let codeIsValid = true;
  let verifyCalls = 0;

  const service = createAccountService({
    otp: {
      verify: async () => {
        verifyCalls += 1;
        return codeIsValid;
      },
    },
    store: {
      findByPhone: async (phone) => accounts.get(phone) ?? null,
      create: async (phone, details) => {
        created.push({ phone, details });
        const account = { id: "new-user", name: details.name };
        accounts.set(phone, account);
        return account;
      },
    },
  });

  return {
    service,
    created,
    verifyCalls: () => verifyCalls,
    rejectCodes: () => {
      codeIsValid = false;
    },
  };
}

describe("account service", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it("creates an account on sign-up, with the phone normalised", async () => {
    const result = await t.service.signIn({
      phone: "077 123 4567",
      code: "123456",
      signUp: SIGN_UP,
    });

    expect(result).toEqual({
      ok: true,
      account: { id: "new-user", name: "Tariro Moyo" },
    });
    expect(t.created[0]!.phone).toBe(PHONE);
    expect(t.created[0]!.details.role).toBe("STUDENT");
  });

  it("creates nothing when the code is wrong", async () => {
    t.rejectCodes();

    expect(
      await t.service.signIn({ phone: PHONE, code: "000000", signUp: SIGN_UP }),
    ).toEqual({ ok: false, error: "INVALID_CODE" });
    expect(t.created).toEqual([]);
  });

  it.each(["ADMIN", "SPONSOR", "DONOR", "SCHOOL_CONTACT", ""])(
    "refuses to sign up with the %s role",
    async (role) => {
      const result = await t.service.signIn({
        phone: PHONE,
        code: "123456",
        signUp: { ...SIGN_UP, role },
      });

      expect(result).toEqual({ ok: false, error: "INVALID_DETAILS" });
      expect(t.created).toEqual([]);
    },
  );

  it("does not spend the code when the form is invalid", async () => {
    await t.service.signIn({
      phone: PHONE,
      code: "123456",
      signUp: { ...SIGN_UP, name: "" },
    });

    expect(t.verifyCalls()).toBe(0);
  });

  it("rejects a phone number it cannot read", async () => {
    expect(await t.service.signIn({ phone: "abc", code: "123456" })).toEqual({
      ok: false,
      error: "INVALID_DETAILS",
    });
    expect(t.verifyCalls()).toBe(0);
  });

  it("does not create an account from the sign-in form", async () => {
    expect(await t.service.signIn({ phone: PHONE, code: "123456" })).toEqual({
      ok: false,
      error: "NO_ACCOUNT",
    });
    expect(t.created).toEqual([]);
  });

  it("signs in an existing account", async () => {
    const admin = { id: "admin-1", name: "Ops" };
    t = setup({ [PHONE]: admin });

    expect(await t.service.signIn({ phone: PHONE, code: "123456" })).toEqual({
      ok: true,
      account: admin,
    });
  });

  it("ignores sign-up details when the number already has an account", async () => {
    const existing = { id: "user-1", name: "Original Name" };
    t = setup({ [PHONE]: existing });

    const result = await t.service.signIn({
      phone: PHONE,
      code: "123456",
      signUp: { name: "Someone Else", role: "GUARDIAN" },
    });

    expect(result).toEqual({ ok: true, account: existing });
    expect(t.created).toEqual([]);
  });
});

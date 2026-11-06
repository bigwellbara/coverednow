import { signUpDetailsSchema, type SignUpDetails } from "../domain/account";
import { normalizeZimbabweMobile } from "../domain/phone";
import type { OtpService } from "./otp-service";

export type Account = { id: string; name: string };

export type AccountStore = {
  findByPhone(phone: string): Promise<Account | null>;
  /** Returns the existing account if another request created it first. */
  create(phone: string, details: SignUpDetails): Promise<Account>;
};

export type SignInError = "INVALID_DETAILS" | "INVALID_CODE" | "NO_ACCOUNT";

export type SignInResult =
  | { ok: true; account: Account }
  | { ok: false; error: SignInError };

const fail = (error: SignInError): SignInResult => ({ ok: false, error });

export function createAccountService(deps: {
  otp: Pick<OtpService, "verify">;
  store: AccountStore;
}) {
  const { otp, store } = deps;

  return {
    /**
     * Proves ownership of the phone, then signs in or creates the account.
     * `signUp` is only used when no account exists: signing up with an existing
     * number signs in as that account and never changes its name, email or role.
     */
    async signIn(input: {
      phone: string;
      code: string;
      signUp?: unknown;
    }): Promise<SignInResult> {
      const phone = normalizeZimbabweMobile(input.phone);
      if (!phone) return fail("INVALID_DETAILS");

      // Checked first so a mistake in the form does not use up the code.
      let details: SignUpDetails | null = null;
      if (input.signUp !== undefined) {
        const parsed = signUpDetailsSchema.safeParse(input.signUp);
        if (!parsed.success) return fail("INVALID_DETAILS");
        details = parsed.data;
      }

      if (!(await otp.verify(phone, input.code))) return fail("INVALID_CODE");

      const existing = await store.findByPhone(phone);
      if (existing) return { ok: true, account: existing };
      if (!details) return fail("NO_ACCOUNT");
      return { ok: true, account: await store.create(phone, details) };
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;

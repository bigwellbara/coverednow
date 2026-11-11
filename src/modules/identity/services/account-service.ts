import {
  parseSignInAddress,
  signUpDetailsSchema,
  type SignInAddress,
  type SignUpDetails,
} from "../domain/account";
import type { OtpService } from "./otp-service";

export type Account = { id: string; name: string };

export type AccountStore = {
  findByAddress(address: SignInAddress): Promise<Account | null>;
  /** Returns the existing account if another request created it first. */
  create(address: SignInAddress, details: SignUpDetails): Promise<Account>;
  /**
   * Only fills in a method the account doesn't have. Replacing one is refused, so
   * a stolen session can't lock out the real owner.
   */
  addAddress(
    userId: string,
    address: SignInAddress,
  ): Promise<"ADDED" | "ALREADY_SET" | "TAKEN">;
};

export type SignInError = "INVALID_DETAILS" | "INVALID_CODE" | "NO_ACCOUNT";

export type SignInResult =
  | { ok: true; account: Account }
  | { ok: false; error: SignInError };

export type AddAddressResult =
  | { ok: true }
  | { ok: false; error: "INVALID_DETAILS" | "INVALID_CODE" | "ALREADY_SET" | "TAKEN" };

const fail = (error: SignInError): SignInResult => ({ ok: false, error });

export function createAccountService(deps: {
  otp: Pick<OtpService, "verify">;
  store: AccountStore;
}) {
  const { otp, store } = deps;

  return {
    /**
     * Proves ownership of the phone or email, then signs in or creates the account.
     * `signUp` is only used when no account exists: signing up with an address
     * already in use signs in to that account and never changes its details.
     */
    async signIn(input: {
      address: string;
      code: string;
      signUp?: unknown;
    }): Promise<SignInResult> {
      const address = parseSignInAddress(input.address);
      if (!address) return fail("INVALID_DETAILS");

      // Checked first so a mistake in the form does not use up the code.
      let details: SignUpDetails | null = null;
      if (input.signUp !== undefined) {
        const parsed = signUpDetailsSchema.safeParse(input.signUp);
        if (!parsed.success) return fail("INVALID_DETAILS");
        details = parsed.data;
      }

      if (!(await otp.verify(address.value, input.code))) {
        return fail("INVALID_CODE");
      }

      const existing = await store.findByAddress(address);
      if (existing) return { ok: true, account: existing };
      if (!details) return fail("NO_ACCOUNT");
      return { ok: true, account: await store.create(address, details) };
    },

    /** Adds a second way to sign in, proven by a code sent to it. */
    async addAddress(
      userId: string,
      input: { address: string; code: string },
    ): Promise<AddAddressResult> {
      const address = parseSignInAddress(input.address);
      if (!address) return { ok: false, error: "INVALID_DETAILS" };

      if (!(await otp.verify(address.value, input.code))) {
        return { ok: false, error: "INVALID_CODE" };
      }

      const result = await store.addAddress(userId, address);
      return result === "ADDED" ? { ok: true } : { ok: false, error: result };
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;

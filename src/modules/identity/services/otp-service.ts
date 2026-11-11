import {
  OTP_POLICY,
  generateOtpCode,
  hashIp,
  hashOtpCode,
  otpCodeMatches,
} from "../domain/otp";

export type OtpChallengeRecord = {
  id: string;
  codeHash: string;
};

export type OtpStore = {
  countForAddressSince(address: string, since: Date): Promise<number>;
  countForIpSince(ipHash: string, since: Date): Promise<number>;
  create(input: {
    address: string;
    codeHash: string;
    ipHash: string;
    expiresAt: Date;
  }): Promise<void>;
  /** The newest challenge for the address, if unused and unexpired. */
  findLatestActive(address: string, now: Date): Promise<OtpChallengeRecord | null>;
  /** Atomically takes one guess. False once the allowance has run out. */
  claimAttempt(id: string, maxAttempts: number): Promise<boolean>;
  /** Atomically marks it used. False if something else already did. */
  consume(id: string, now: Date): Promise<boolean>;
};

export type OtpSender = {
  send(address: string, code: string): Promise<void>;
};

/** The number cannot receive codes on this channel, such as not being on WhatsApp. */
export class OtpRecipientUnreachableError extends Error {}

export type OtpRequestResult = { ok: true } | { ok: false; reason: "RATE_LIMITED" };

export function createOtpService(deps: {
  store: OtpStore;
  sender: OtpSender;
  secret: string;
  now?: () => Date;
}) {
  const { store, sender, secret } = deps;
  const now = deps.now ?? (() => new Date());

  return {
    async request(address: string, ip: string): Promise<OtpRequestResult> {
      const at = now();
      const ipHash = hashIp(secret, ip);

      const [forAddress, forIp] = await Promise.all([
        store.countForAddressSince(
          address,
          new Date(at.getTime() - OTP_POLICY.addressWindowMs),
        ),
        store.countForIpSince(
          ipHash,
          new Date(at.getTime() - OTP_POLICY.ipWindowMs),
        ),
      ]);
      if (forAddress >= OTP_POLICY.maxPerAddress || forIp >= OTP_POLICY.maxPerIp) {
        return { ok: false, reason: "RATE_LIMITED" };
      }

      const code = generateOtpCode();
      await store.create({
        address,
        ipHash,
        codeHash: hashOtpCode(secret, address, code),
        expiresAt: new Date(at.getTime() + OTP_POLICY.ttlMs),
      });
      await sender.send(address, code);
      return { ok: true };
    },

    /** True once only, for the newest code sent to this address. */
    async verify(address: string, code: string): Promise<boolean> {
      const at = now();
      const challenge = await store.findLatestActive(address, at);
      if (!challenge) return false;

      // The guess is counted before the code is checked, so parallel requests
      // cannot get more guesses than the allowance.
      if (!(await store.claimAttempt(challenge.id, OTP_POLICY.maxAttempts))) {
        return false;
      }
      if (!otpCodeMatches(secret, address, code, challenge.codeHash)) return false;

      return store.consume(challenge.id, at);
    },
  };
}

export type OtpService = ReturnType<typeof createOtpService>;

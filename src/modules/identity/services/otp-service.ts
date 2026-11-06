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
  countForPhoneSince(phone: string, since: Date): Promise<number>;
  countForIpSince(ipHash: string, since: Date): Promise<number>;
  create(input: {
    phone: string;
    codeHash: string;
    ipHash: string;
    expiresAt: Date;
  }): Promise<void>;
  /** The newest challenge for the phone, if unused and unexpired. */
  findLatestActive(phone: string, now: Date): Promise<OtpChallengeRecord | null>;
  /** Atomically takes one guess. False once the allowance has run out. */
  claimAttempt(id: string, maxAttempts: number): Promise<boolean>;
  /** Atomically marks it used. False if something else already did. */
  consume(id: string, now: Date): Promise<boolean>;
};

export type OtpSender = {
  send(phone: string, code: string): Promise<void>;
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
    async request(phone: string, ip: string): Promise<OtpRequestResult> {
      const at = now();
      const ipHash = hashIp(secret, ip);

      const [forPhone, forIp] = await Promise.all([
        store.countForPhoneSince(
          phone,
          new Date(at.getTime() - OTP_POLICY.phoneWindowMs),
        ),
        store.countForIpSince(
          ipHash,
          new Date(at.getTime() - OTP_POLICY.ipWindowMs),
        ),
      ]);
      if (forPhone >= OTP_POLICY.maxPerPhone || forIp >= OTP_POLICY.maxPerIp) {
        return { ok: false, reason: "RATE_LIMITED" };
      }

      const code = generateOtpCode();
      await store.create({
        phone,
        ipHash,
        codeHash: hashOtpCode(secret, phone, code),
        expiresAt: new Date(at.getTime() + OTP_POLICY.ttlMs),
      });
      await sender.send(phone, code);
      return { ok: true };
    },

    /** True once only, for the newest code sent to this phone. */
    async verify(phone: string, code: string): Promise<boolean> {
      const at = now();
      const challenge = await store.findLatestActive(phone, at);
      if (!challenge) return false;

      // The guess is counted before the code is checked, so parallel requests
      // cannot get more guesses than the allowance.
      if (!(await store.claimAttempt(challenge.id, OTP_POLICY.maxAttempts))) {
        return false;
      }
      if (!otpCodeMatches(secret, phone, code, challenge.codeHash)) return false;

      return store.consume(challenge.id, at);
    },
  };
}

export type OtpService = ReturnType<typeof createOtpService>;

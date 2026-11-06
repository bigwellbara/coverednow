import { beforeEach, describe, expect, it } from "vitest";
import { OTP_POLICY } from "../domain/otp";
import { createOtpService, type OtpStore } from "./otp-service";

const PHONE = "+263771234567";
const OTHER_PHONE = "+263781234567";
const IP = "203.0.113.5";
const START = new Date("2027-01-01T08:00:00Z");

type Row = {
  id: string;
  phone: string;
  codeHash: string;
  ipHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

function setup() {
  let clock = START;
  const rows: Row[] = [];
  const sent: Array<{ phone: string; code: string }> = [];

  const store: OtpStore = {
    countForPhoneSince: async (phone, since) =>
      rows.filter((r) => r.phone === phone && r.createdAt >= since).length,
    countForIpSince: async (ipHash, since) =>
      rows.filter((r) => r.ipHash === ipHash && r.createdAt >= since).length,
    create: async (input) => {
      rows.push({
        ...input,
        id: String(rows.length),
        attempts: 0,
        consumedAt: null,
        createdAt: clock,
      });
    },
    findLatestActive: async (phone, now) =>
      rows
        .filter((r) => r.phone === phone && !r.consumedAt && r.expiresAt > now)
        .at(-1) ?? null,
    claimAttempt: async (id, max) => {
      const row = rows.find((r) => r.id === id);
      if (!row || row.attempts >= max) return false;
      row.attempts += 1;
      return true;
    },
    consume: async (id, now) => {
      const row = rows.find((r) => r.id === id);
      if (!row || row.consumedAt) return false;
      row.consumedAt = now;
      return true;
    },
  };

  const service = createOtpService({
    store,
    secret: "test-secret",
    now: () => clock,
    sender: {
      send: async (phone, code) => {
        sent.push({ phone, code });
      },
    },
  });

  return {
    service,
    rows,
    sent,
    advance: (ms: number) => {
      clock = new Date(clock.getTime() + ms);
    },
    lastCode: () => sent.at(-1)!.code,
  };
}

const wrong = (code: string) => (code === "000000" ? "000001" : "000000");

describe("otp service", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it("sends a six-digit code and never stores it in the clear", async () => {
    await t.service.request(PHONE, IP);

    expect(t.lastCode()).toMatch(/^\d{6}$/);
    expect(t.rows[0]!.codeHash).not.toContain(t.lastCode());
  });

  it("accepts the right code once only", async () => {
    await t.service.request(PHONE, IP);

    expect(await t.service.verify(PHONE, t.lastCode())).toBe(true);
    expect(await t.service.verify(PHONE, t.lastCode())).toBe(false);
  });

  it("rejects a wrong code, then still accepts the right one", async () => {
    await t.service.request(PHONE, IP);

    expect(await t.service.verify(PHONE, wrong(t.lastCode()))).toBe(false);
    expect(await t.service.verify(PHONE, t.lastCode())).toBe(true);
  });

  it("rejects a code issued for another phone", async () => {
    await t.service.request(PHONE, IP);
    const code = t.lastCode();
    await t.service.request(OTHER_PHONE, IP);

    expect(await t.service.verify(OTHER_PHONE, code === t.lastCode() ? wrong(code) : code)).toBe(false);
  });

  it("expires codes", async () => {
    await t.service.request(PHONE, IP);
    t.advance(OTP_POLICY.ttlMs);

    expect(await t.service.verify(PHONE, t.lastCode())).toBe(false);
  });

  it("locks the code after too many guesses, even the right one", async () => {
    await t.service.request(PHONE, IP);
    const code = t.lastCode();

    for (let i = 0; i < OTP_POLICY.maxAttempts; i += 1) {
      expect(await t.service.verify(PHONE, wrong(code))).toBe(false);
    }
    expect(await t.service.verify(PHONE, code)).toBe(false);
  });

  it("only honours the newest code", async () => {
    await t.service.request(PHONE, IP);
    const first = t.lastCode();
    await t.service.request(PHONE, IP);
    const second = t.lastCode();

    if (first !== second) {
      expect(await t.service.verify(PHONE, first)).toBe(false);
    }
    expect(await t.service.verify(PHONE, second)).toBe(true);
  });

  it("limits requests per phone, then recovers", async () => {
    for (let i = 0; i < OTP_POLICY.maxPerPhone; i += 1) {
      expect(await t.service.request(PHONE, IP)).toEqual({ ok: true });
    }
    expect(await t.service.request(PHONE, "203.0.113.6")).toEqual({
      ok: false,
      reason: "RATE_LIMITED",
    });
    expect(t.sent).toHaveLength(OTP_POLICY.maxPerPhone);

    t.advance(OTP_POLICY.phoneWindowMs + 1);
    expect(await t.service.request(PHONE, IP)).toEqual({ ok: true });
  });

  it("limits requests per address across many phones", async () => {
    for (let i = 0; i < OTP_POLICY.maxPerIp; i += 1) {
      const phone = `+26377100000${i}`;
      expect(await t.service.request(phone, IP)).toEqual({ ok: true });
    }
    expect(await t.service.request(PHONE, IP)).toEqual({
      ok: false,
      reason: "RATE_LIMITED",
    });
  });

  it("returns false with no code sent", async () => {
    expect(await t.service.verify(PHONE, "123456")).toBe(false);
  });
});

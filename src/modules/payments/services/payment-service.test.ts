import { beforeEach, describe, expect, it } from "vitest";
import type { GatewayResult, PaymentGateway } from "../domain/gateway";
import {
  createPaymentService,
  type BillFunding,
  type DonationRecord,
  type DonationStore,
} from "./payment-service";

const NOW = new Date("2027-01-10T08:00:00Z");
const DONOR = { id: "donor-1", name: "Rudo Chikwanha" };

function setup() {
  const donations = new Map<string, DonationRecord>();
  const events = new Map<string, { billId: string; processed: boolean }>();
  const flags: string[] = [];
  const logs: string[] = [];
  const synced: string[] = [];
  let ids = 0;
  let syncFails = false;

  const bill = {
    id: "bill-1",
    schoolName: "Test University",
    term: "2027-T1",
    confirmedCents: 20_000,
    raisedCents: 5_000,
    isOpen: true,
  };

  const emit = (billId: string) => {
    const id = `event-${(ids += 1)}`;
    events.set(id, { billId, processed: false });
    return id;
  };

  const store: DonationStore = {
    create: async (d) => {
      const id = `donation-${(ids += 1)}`;
      donations.set(id, {
        ...d,
        id,
        totalCents: d.amountCents + d.tipCents + d.feeCents,
        providerRef: null,
        pollUrl: null,
        status: "INITIATED",
        settledAt: null,
        failedAt: null,
        createdAt: NOW,
      });
      return { id };
    },
    setPollUrl: async (id, pollUrl) => {
      donations.get(id)!.pollUrl = pollUrl;
    },
    findById: async (id) => donations.get(id) ?? null,
    findByReference: async (reference) =>
      [...donations.values()].find((d) => d.reference === reference) ?? null,
    settle: async (id, providerRef, at) => {
      const d = donations.get(id)!;
      if (d.status !== "INITIATED" && d.status !== "FAILED") return null;
      Object.assign(d, { status: "SETTLED", providerRef, settledAt: at, failedAt: null });
      return emit(d.billId);
    },
    fail: async (id, _ref, at) => {
      const d = donations.get(id)!;
      if (d.status !== "INITIATED") return false;
      Object.assign(d, { status: "FAILED", failedAt: at });
      return true;
    },
    markRefunded: async (id) => {
      const d = donations.get(id)!;
      if (d.status !== "SETTLED") return null;
      d.status = "REFUNDED";
      return emit(d.billId);
    },
    flag: async (id, action) => {
      flags.push(`${action}:${id}`);
    },
    listForDonor: async (donorId) => [...donations.values()].filter((d) => d.donorId === donorId),
    listForBill: async (billId) => [...donations.values()].filter((d) => d.billId === billId),
    listRecent: async () => [...donations.values()],
    listSupporters: async () => [],
    countSupporters: async () => 0,
    donorSummary: async () => ({ givenCents: 0, donations: 0, billsSupported: 0 }),
    countDonors: async () => 0,
    pendingFundingEvents: async () =>
      [...events].filter(([, e]) => !e.processed).map(([id, e]) => ({ id, billId: e.billId })),
    markEventProcessed: async (id) => {
      events.get(id)!.processed = true;
    },
  };

  let nextCallback: GatewayResult | null = null;
  let nextPoll: GatewayResult | null = null;
  let initiateFails = false;
  const initiated: Array<{ reference: string; totalCents: number; returnUrl: string }> = [];
  const gateway: PaymentGateway = {
    name: "simulated",
    initiate: async (request) => {
      if (initiateFails) throw new Error("gateway down");
      initiated.push(request);
      return { redirectUrl: `https://pay.test/${request.reference}`, pollUrl: "https://pay.test/poll" };
    },
    poll: async () => nextPoll,
    readCallback: () => nextCallback,
  };

  const bills: BillFunding = {
    fundingFor: async (id) => (id === bill.id ? { ...bill } : null),
    syncFunding: async (id) => {
      if (syncFails) throw new Error("database busy");
      synced.push(id);
    },
  };

  const service = createPaymentService({
    store,
    gateway,
    bills,
    feeBps: 250,
    returnUrl: "https://app.test/payments/return",
    resultUrl: "https://app.test/api/webhooks/paynow",
    describe: (b) => `School fees: ${b.schoolName}`,
    now: () => NOW,
    log: (line) => logs.push(line),
  });

  return {
    service, bill, donations, events, flags, logs, synced, initiated,
    callback: (result: GatewayResult | null) => { nextCallback = result; },
    pollReturns: (result: GatewayResult | null) => { nextPoll = result; },
    failInitiate: () => { initiateFails = true; },
    failSync: (fails: boolean) => { syncFails = fails; },
  };
}

const give = (overrides: Record<string, unknown> = {}) => ({
  billId: "bill-1",
  amountCents: 5_000,
  tipPercent: 7,
  visibility: "PUBLIC" as const,
  alias: "",
  ...overrides,
});

describe("payment service", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  const started = async (overrides: Record<string, unknown> = {}) => {
    const result = await t.service.startCheckout(DONOR, give(overrides));
    if (!result.ok) throw new Error(result.error);
    return t.donations.get(result.donationId)!;
  };

  const paid = (d: DonationRecord, overrides: Partial<GatewayResult> = {}): GatewayResult => ({
    reference: d.reference,
    providerRef: "PN-1",
    amountCents: d.totalCents,
    outcome: "PAID",
    ...overrides,
  });

  describe("checkout", () => {
    it("records the donation and sends the donor to the gateway for the full total", async () => {
      const result = await t.service.startCheckout(DONOR, give());

      expect(result).toMatchObject({ ok: true, redirectUrl: expect.stringContaining("pay.test") });
      const [donation] = [...t.donations.values()];
      expect(donation).toMatchObject({
        amountCents: 5_000,
        tipCents: 350,
        feeCents: 138,
        totalCents: 5_488,
        displayName: "Rudo Chikwanha",
        status: "INITIATED",
        pollUrl: "https://pay.test/poll",
      });
      expect(t.initiated[0]).toMatchObject({
        totalCents: 5_488,
        returnUrl: `https://app.test/payments/return?ref=${donation!.reference}`,
      });
    });

    it("keeps anonymous gifts nameless and uses an alias when asked", async () => {
      expect((await started({ visibility: "ANONYMOUS" })).displayName).toBeNull();
      expect((await started({ visibility: "ALIAS", alias: "Old Boys '09" })).displayName).toBe(
        "Old Boys '09",
      );
    });

    it("refuses closed bills, odd amounts, tips and aliases", async () => {
      const error = async (overrides: Record<string, unknown>) =>
        ((await t.service.startCheckout(DONOR, give(overrides))) as { error?: string }).error;

      expect(await error({ billId: "unknown" })).toBe("BILL_CLOSED");
      expect(await error({ amountCents: 50 })).toBe("AMOUNT_TOO_SMALL");
      expect(await error({ amountCents: 15_001 })).toBe("AMOUNT_TOO_LARGE");
      expect(await error({ tipPercent: 50 })).toBe("INVALID_TIP");
      expect(await error({ visibility: "ALIAS", alias: "<a>" })).toBe("INVALID_ALIAS");
      t.bill.isOpen = false;
      expect(await error({})).toBe("BILL_CLOSED");
      expect(t.donations.size).toBe(0);
    });

    it("marks the donation failed if the gateway can't be reached", async () => {
      t.failInitiate();

      expect(await t.service.startCheckout(DONOR, give())).toEqual({
        ok: false,
        error: "GATEWAY_UNAVAILABLE",
      });
      expect([...t.donations.values()][0]?.status).toBe("FAILED");
    });
  });

  describe("results", () => {
    it("settles a paid donation and brings the bill up to date", async () => {
      const donation = await started();
      t.callback(paid(donation));

      expect(await t.service.handleCallback("signed body")).toBe(true);

      expect(donation).toMatchObject({ status: "SETTLED", providerRef: "PN-1", settledAt: NOW });
      expect(t.synced).toEqual(["bill-1"]);
      expect([...t.events.values()].every((e) => e.processed)).toBe(true);
    });

    it("ignores repeats of the same result", async () => {
      const donation = await started();
      t.callback(paid(donation));

      await t.service.handleCallback("signed body");
      await t.service.handleCallback("signed body");

      expect(t.synced).toEqual(["bill-1"]);
      expect(t.events.size).toBe(1);
    });

    it("refuses an unverified message", async () => {
      await started();
      t.callback(null);

      expect(await t.service.handleCallback("forged body")).toBe(false);
      expect(t.synced).toEqual([]);
    });

    it("never settles on an amount it didn't ask for", async () => {
      const donation = await started();
      t.callback(paid(donation, { amountCents: 100 }));

      await t.service.handleCallback("signed body");

      expect(donation.status).toBe("INITIATED");
      expect(t.flags).toEqual([`donation.amount_mismatch:${donation.id}`]);
    });

    it("marks a cancelled payment failed, and still settles it if money arrives later", async () => {
      const donation = await started();
      t.callback(paid(donation, { outcome: "FAILED" }));
      await t.service.handleCallback("signed body");
      expect(donation.status).toBe("FAILED");

      t.callback(paid(donation));
      await t.service.handleCallback("signed body");
      expect(donation.status).toBe("SETTLED");
    });

    it("takes a refunded donation off the bill", async () => {
      const donation = await started();
      t.callback(paid(donation));
      await t.service.handleCallback("signed body");

      t.callback(paid(donation, { outcome: "REVERSED" }));
      await t.service.handleCallback("signed body");

      expect(donation.status).toBe("REFUNDED");
      expect(t.synced).toEqual(["bill-1", "bill-1"]);
      expect(t.flags).toContain(`donation.reversed_at_gateway:${donation.id}`);
    });

    it("retries a bill that missed an update on the next message", async () => {
      const donation = await started();
      t.callback(paid(donation));
      t.failSync(true);
      await t.service.handleCallback("signed body");
      expect([...t.events.values()][0]?.processed).toBe(false);

      t.failSync(false);
      t.callback(null);
      await t.service.handleCallback("anything");

      expect(t.synced).toEqual(["bill-1"]);
      expect([...t.events.values()][0]?.processed).toBe(true);
    });
  });

  describe("polling", () => {
    it("applies what the gateway reports for an unfinished payment", async () => {
      const donation = await started();
      t.pollReturns(paid(donation));

      expect((await t.service.refresh(donation.reference))?.status).toBe("SETTLED");
    });

    it("ignores a poll answer about another payment", async () => {
      const donation = await started();
      const other = await started();
      t.pollReturns(paid(other));

      expect((await t.service.refresh(donation.reference))?.status).toBe("INITIATED");
    });
  });

  it("lets the simulator settle payments only with the simulated gateway", async () => {
    const donation = await started();

    expect(await t.service.simulate(donation.reference, "PAID")).toBe(true);
    expect(donation.status).toBe("SETTLED");
  });

  it("shows a donation only to its donor", async () => {
    const donation = await started();

    expect(await t.service.findForDonor(DONOR.id, donation.id)).toBe(donation);
    expect(await t.service.findForDonor("someone-else", donation.id)).toBeNull();
  });
});

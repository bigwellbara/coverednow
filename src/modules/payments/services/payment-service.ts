import {
  checkAmount,
  displayNameFor,
  isTipPercent,
  quote,
  type Visibility,
} from "../domain/checkout";
import type { GatewayResult, PaymentGateway } from "../domain/gateway";
import { newReference } from "../domain/reference";

export type DonationStatus = "INITIATED" | "SETTLED" | "FAILED" | "REFUNDED";

export type DonationRecord = {
  id: string;
  billId: string;
  donorId: string;
  amountCents: number;
  tipCents: number;
  feeCents: number;
  totalCents: number;
  visibility: Visibility;
  displayName: string | null;
  reference: string;
  providerRef: string | null;
  pollUrl: string | null;
  status: DonationStatus;
  settledAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
};

export type NewDonation = Pick<
  DonationRecord,
  | "billId"
  | "donorId"
  | "amountCents"
  | "tipCents"
  | "feeCents"
  | "visibility"
  | "displayName"
  | "reference"
>;

export type Supporter = { displayName: string | null; amountCents: number; settledAt: Date };

export type DonorSummary = {
  givenCents: number;
  donations: number;
  billsSupported: number;
};

/**
 * Every change is written with an audit entry, and every change to what a bill
 * has raised also writes an outbox event, all in one transaction. The event stays
 * unprocessed until billing has caught up, so a crash in between is retried.
 */
export type DonationStore = {
  create(donation: NewDonation): Promise<{ id: string }>;
  setPollUrl(id: string, pollUrl: string): Promise<void>;
  findById(id: string): Promise<DonationRecord | null>;
  findByReference(reference: string): Promise<DonationRecord | null>;
  /** From INITIATED or FAILED only. The event id, or null if nothing changed. */
  settle(id: string, providerRef: string | null, at: Date): Promise<string | null>;
  /** From INITIATED only. */
  fail(id: string, providerRef: string | null, at: Date): Promise<boolean>;
  /** From SETTLED only. The event id, or null if nothing changed. */
  markRefunded(id: string, at: Date): Promise<string | null>;
  /** Records something a person needs to look at, without changing the donation. */
  flag(id: string, action: string, meta: Record<string, unknown>): Promise<void>;
  listForDonor(donorId: string): Promise<DonationRecord[]>;
  listForBill(billId: string): Promise<DonationRecord[]>;
  listRecent(limit: number): Promise<DonationRecord[]>;
  listSupporters(billId: string, limit: number): Promise<Supporter[]>;
  countSupporters(billId: string): Promise<number>;
  donorSummary(donorId: string): Promise<DonorSummary>;
  countDonors(): Promise<number>;
  pendingFundingEvents(limit: number): Promise<Array<{ id: string; billId: string }>>;
  markEventProcessed(id: string): Promise<void>;
};

/** What payments needs from the billing module. */
export type BillFunding = {
  fundingFor(billId: string): Promise<{
    id: string;
    schoolName: string;
    term: string;
    confirmedCents: number;
    raisedCents: number;
    isOpen: boolean;
  } | null>;
  /** Re-reads the ledger and moves the bill on. Safe to repeat. */
  syncFunding(billId: string): Promise<unknown>;
};

export type CheckoutError =
  | "BILL_CLOSED"
  | "AMOUNT_TOO_SMALL"
  | "AMOUNT_TOO_LARGE"
  | "INVALID_TIP"
  | "INVALID_ALIAS"
  | "GATEWAY_UNAVAILABLE";

export const CHECKOUT_ERROR_MESSAGES: Record<CheckoutError, string> = {
  BILL_CLOSED: "This bill isn't taking donations any more. Thank you for looking.",
  AMOUNT_TOO_SMALL: "Please give at least $1.00.",
  AMOUNT_TOO_LARGE:
    "That's more than this bill still needs. Please choose a smaller amount.",
  INVALID_TIP: "Please choose a tip from the list.",
  INVALID_ALIAS:
    "Please enter a name of 2 to 40 letters or numbers, or choose another option.",
  GATEWAY_UNAVAILABLE:
    "We couldn't reach the payment service just now. Nothing was charged. Please try again shortly.",
};

export type CheckoutResult =
  | { ok: true; donationId: string; redirectUrl: string }
  | { ok: false; error: CheckoutError };

const fail = (error: CheckoutError) => ({ ok: false as const, error });

export function createPaymentService(deps: {
  store: DonationStore;
  gateway: PaymentGateway;
  bills: BillFunding;
  feeBps: number;
  returnUrl: string;
  resultUrl: string;
  describe: (bill: { schoolName: string; term: string }) => string;
  now?: () => Date;
  log?: (message: string) => void;
}) {
  const { store, gateway, bills, feeBps } = deps;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? console.error;

  async function syncBill(eventId: string, billId: string) {
    try {
      await bills.syncFunding(billId);
      await store.markEventProcessed(eventId);
    } catch (error) {
      // Left unprocessed, so the next payment event retries it.
      log(
        `Bill ${billId}: funding sync failed, will retry: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  async function applyResult(result: GatewayResult): Promise<void> {
    const donation = await store.findByReference(result.reference);
    if (!donation) {
      log(`Payment result for unknown reference ${result.reference}`);
      return;
    }

    switch (result.outcome) {
      case "PAID": {
        if (result.amountCents !== donation.totalCents) {
          // Never settle on a figure we didn't ask for: a person must look.
          await store.flag(donation.id, "donation.amount_mismatch", {
            expectedCents: donation.totalCents,
            reportedCents: result.amountCents,
          });
          log(`Donation ${donation.id}: gateway reported a different amount`);
          return;
        }
        const eventId = await store.settle(donation.id, result.providerRef, now());
        if (eventId) await syncBill(eventId, donation.billId);
        return;
      }
      case "FAILED":
        await store.fail(donation.id, result.providerRef, now());
        return;
      case "REVERSED": {
        const eventId = await store.markRefunded(donation.id, now());
        if (eventId) {
          await store.flag(donation.id, "donation.reversed_at_gateway", {});
          await syncBill(eventId, donation.billId);
        }
        return;
      }
      case "PENDING":
        return;
    }
  }

  async function retryPendingFunding(): Promise<void> {
    for (const event of await store.pendingFundingEvents(20)) {
      await syncBill(event.id, event.billId);
    }
  }

  return {
    gatewayName: gateway.name,
    feeBps,

    async startCheckout(
      donor: { id: string; name: string },
      input: {
        billId: string;
        amountCents: number;
        tipPercent: number;
        visibility: Visibility;
        alias: string;
      },
    ): Promise<CheckoutResult> {
      const bill = await bills.fundingFor(input.billId);
      if (!bill?.isOpen) return fail("BILL_CLOSED");

      const problem = checkAmount(
        input.amountCents,
        Math.max(bill.confirmedCents - bill.raisedCents, 0),
      );
      if (problem === "TOO_SMALL") return fail("AMOUNT_TOO_SMALL");
      if (problem === "MORE_THAN_NEEDED") return fail("AMOUNT_TOO_LARGE");
      if (!isTipPercent(input.tipPercent)) return fail("INVALID_TIP");

      const displayName = displayNameFor(input.visibility, donor.name, input.alias);
      if (displayName === undefined) return fail("INVALID_ALIAS");

      const { amountCents, tipCents, feeCents, totalCents } = quote(
        input.amountCents,
        input.tipPercent,
        feeBps,
      );
      const reference = newReference();
      const { id } = await store.create({
        billId: bill.id,
        donorId: donor.id,
        amountCents,
        tipCents,
        feeCents,
        visibility: input.visibility,
        displayName,
        reference,
      });

      try {
        const { redirectUrl, pollUrl } = await gateway.initiate({
          reference,
          totalCents,
          description: deps.describe(bill),
          returnUrl: `${deps.returnUrl}?ref=${encodeURIComponent(reference)}`,
          resultUrl: deps.resultUrl,
        });
        await store.setPollUrl(id, pollUrl);
        return { ok: true, donationId: id, redirectUrl };
      } catch (error) {
        await store.fail(id, null, now());
        log(
          `Donation ${id}: could not start payment: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
        return fail("GATEWAY_UNAVAILABLE");
      }
    },

    /**
     * For the gateway's server-to-server result. False if the message couldn't
     * be verified. Also retries any bill that missed an earlier update.
     */
    async handleCallback(body: string): Promise<boolean> {
      await retryPendingFunding();
      const result = gateway.readCallback(body);
      if (!result) return false;
      await applyResult(result);
      return true;
    },

    /** Asks the gateway for news of a payment that hasn't finished yet. */
    async refresh(reference: string): Promise<DonationRecord | null> {
      const donation = await store.findByReference(reference);
      if (donation?.status !== "INITIATED" || !donation.pollUrl) return donation;
      try {
        const result = await gateway.poll(donation.pollUrl);
        if (result?.reference === donation.reference) await applyResult(result);
      } catch (error) {
        log(
          `Donation ${donation.id}: poll failed: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
      return store.findByReference(reference);
    },

    /** Development only: what the simulated gateway's page does. */
    async simulate(reference: string, outcome: "PAID" | "FAILED"): Promise<boolean> {
      if (gateway.name !== "simulated") return false;
      const donation = await store.findByReference(reference);
      if (!donation) return false;
      await applyResult({
        reference,
        providerRef: `SIM-${reference.slice(3)}`,
        amountCents: donation.totalCents,
        outcome,
      });
      return true;
    },

    retryPendingFunding,

    findByReference: (reference: string) => store.findByReference(reference),

    /** Null for anyone else's donation, so ids can't be probed. */
    async findForDonor(donorId: string, donationId: string) {
      const donation = await store.findById(donationId);
      return donation?.donorId === donorId ? donation : null;
    },

    listForDonor: (donorId: string) => store.listForDonor(donorId),
    donorSummary: (donorId: string) => store.donorSummary(donorId),
    listForBill: (billId: string) => store.listForBill(billId),
    listRecent: (limit = 200) => store.listRecent(limit),
    listSupporters: (billId: string, limit = 20) => store.listSupporters(billId, limit),
    countSupporters: (billId: string) => store.countSupporters(billId),
    countDonors: () => store.countDonors(),
  };
}

export type PaymentService = ReturnType<typeof createPaymentService>;

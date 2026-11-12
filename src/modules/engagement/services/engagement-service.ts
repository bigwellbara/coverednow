import { BILL_STATUS_LABELS, termLabel } from "../../billing/domain/bill";
import type { PublicBill } from "../../billing/domain/public-bill";
import type { BillStatus } from "../../billing/domain/bill-status";
import {
  campaignInputSchema,
  campaignProgress,
  isCampaignOpen,
  slugify,
  type CampaignInput,
  type CampaignKind,
  type CampaignProgress,
} from "../domain/campaign";
import { badgesFor, reportTotals, yearInReview, type GiftFact } from "../domain/giving";
import { periodStart, rank, type LeaderboardEntry, type LeaderboardPeriod } from "../domain/leaderboard";

export type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notifyUpdates: boolean;
};

export type NoteStatus = "PENDING" | "APPROVED" | "REJECTED";

export type NoteRecord = {
  id: string;
  billId: string;
  body: string;
  status: NoteStatus;
  createdAt: Date;
  reviewedAt: Date | null;
};

export type CampaignRecord = {
  id: string;
  slug: string;
  ownerId: string;
  ownerName: string;
  kind: CampaignKind;
  title: string;
  story: string;
  goalCents: number;
  endsAt: Date | null;
  matcherName: string | null;
  matchCapCents: number | null;
  matchCheckedAt: Date | null;
  hiddenAt: Date | null;
  createdAt: Date;
};

export type CampaignTotals = { raisedCents: number; gifts: number; donors: number };

export type SettledGift = Omit<GiftFact, "bill">;

export type EngagementStore = {
  createNote(billId: string, body: string): Promise<NoteRecord>;
  countNotes(billId: string): Promise<number>;
  listNotes(billId: string, status: NoteStatus | null): Promise<NoteRecord[]>;
  listPendingNotes(limit: number): Promise<NoteRecord[]>;
  /** Only from PENDING. Null if it was already reviewed or doesn't exist. */
  reviewNote(id: string, status: "APPROVED" | "REJECTED", at: Date, actorId: string): Promise<NoteRecord | null>;

  /** Everyone with a settled gift on the bill. */
  donorIdsForBill(billId: string): Promise<string[]>;
  contacts(userIds: readonly string[]): Promise<Contact[]>;
  getNotifyUpdates(userId: string): Promise<boolean>;
  setNotifyUpdates(userId: string, on: boolean): Promise<void>;

  settledGifts(filter: { donorId?: string; campaignId?: string; from?: Date; to?: Date }): Promise<SettledGift[]>;
  /** Grouped by donor and the name shown, so an alias is never tied to a real name. */
  topSupporters(since: Date | null, limit: number): Promise<LeaderboardEntry[]>;

  slugExists(slug: string): Promise<boolean>;
  createCampaign(ownerId: string, input: CampaignInput & { slug: string }): Promise<CampaignRecord>;
  findCampaign(where: { slug: string } | { id: string }): Promise<CampaignRecord | null>;
  listCampaigns(filter: { ownerId?: string; includeHidden: boolean; limit: number }): Promise<CampaignRecord[]>;
  campaignTotals(ids: readonly string[]): Promise<Map<string, CampaignTotals>>;
  updateCampaign(
    id: string,
    patch: Partial<Pick<CampaignRecord, "matcherName" | "matchCapCents" | "matchCheckedAt" | "hiddenAt">>,
    actorId: string,
    action: string,
  ): Promise<boolean>;
};

export type BillLookup = {
  findPublic(billId: string): Promise<PublicBill | null>;
  findPublicMany(billIds: readonly string[]): Promise<PublicBill[]>;
  findForOwner(ownerId: string, billId: string): Promise<{ id: string; raisedCents: number } | null>;
};

export type CampaignView = CampaignRecord & {
  progress: CampaignProgress;
  totals: CampaignTotals;
  isOpen: boolean;
};

const FUNDED_STATUSES: readonly BillStatus[] = ["FUNDED", "PAID", "RECEIPT_CONFIRMED"];
const MAX_NOTES_PER_BILL = 3;

export const NOTE_ERROR_MESSAGES = {
  NOT_FOUND: "We couldn't find that bill.",
  NO_GIFTS_YET: "You can send a thank-you once someone has given to this bill.",
  TOO_SHORT: "Please write at least a sentence (10 characters).",
  TOO_LONG: "Please keep your note under 500 characters.",
  TOO_MANY: "You've sent the most notes allowed for this bill.",
} as const;

export const CAMPAIGN_ERROR_MESSAGES = {
  INVALID: "Please check the details: a title, a short story, and a goal of at least $50.",
  ENDS_IN_PAST: "The end date must be in the future.",
} as const;

export function createEngagementService(deps: {
  store: EngagementStore;
  bills: BillLookup;
  messages: { sendText(phone: string, text: string): Promise<void> };
  email: { send(email: { to: string; subject: string; text: string }): Promise<void> };
  baseUrl: string;
  now?: () => Date;
  log?: (message: string) => void;
}) {
  const { store, bills, baseUrl } = deps;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? console.error;

  /** WhatsApp where we have a number, otherwise email. One failure never stops the rest. */
  async function tell(people: readonly Contact[], subject: string, text: (person: Contact) => string) {
    let sent = 0;
    for (const person of people) {
      if (!person.notifyUpdates) continue;
      try {
        if (person.phone) await deps.messages.sendText(person.phone, text(person));
        else if (person.email) await deps.email.send({ to: person.email, subject, text: text(person) });
        else continue;
        sent += 1;
      } catch (error) {
        log(`Couldn't send "${subject}" to user ${person.id}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
    return sent;
  }

  const firstName = (person: Contact) => person.name.split(/\s+/)[0] ?? person.name;
  const optOut = `To stop these messages, turn them off on your account page: ${baseUrl}/account`;

  async function giftFacts(gifts: readonly SettledGift[]): Promise<GiftFact[]> {
    const found = new Map(
      (await bills.findPublicMany([...new Set(gifts.map((gift) => gift.billId))])).map((bill) => [bill.id, bill]),
    );
    return gifts.map((gift) => {
      const bill = found.get(gift.billId);
      return {
        ...gift,
        bill: bill
          ? {
              schoolId: bill.schoolId,
              schoolName: bill.schoolName,
              city: bill.city,
              term: termLabel(bill.term),
              studentInitials: bill.studentInitials,
              studentLevel: bill.studentLevel,
              funded: FUNDED_STATUSES.includes(bill.status),
              statusLabel: BILL_STATUS_LABELS[bill.status],
            }
          : null,
      };
    });
  }

  async function withProgress(campaigns: readonly CampaignRecord[]): Promise<CampaignView[]> {
    const totals = await store.campaignTotals(campaigns.map((campaign) => campaign.id));
    return campaigns.map((campaign) => {
      const total = totals.get(campaign.id) ?? { raisedCents: 0, gifts: 0, donors: 0 };
      return {
        ...campaign,
        totals: total,
        isOpen: isCampaignOpen(campaign, now()),
        progress: campaignProgress({
          goalCents: campaign.goalCents,
          raisedCents: total.raisedCents,
          matchCapCents: campaign.matchCapCents,
          matchChecked: campaign.matchCheckedAt !== null,
        }),
      };
    });
  }

  return {
    // ---------------------------------------------------------- notifications

    /** Tells a bill's donors, and its owner, that it is fully funded. */
    async billFunded(bill: { id: string; ownerId: string }): Promise<number> {
      const found = await bills.findPublic(bill.id);
      if (!found) return 0;
      const what = `${termLabel(found.term)} fees at ${found.schoolName}`;
      const link = `${baseUrl}/browse/${found.id}`;
      const donorIds = (await store.donorIdsForBill(bill.id)).filter((id) => id !== bill.ownerId);
      const [donors, owners] = await Promise.all([store.contacts(donorIds), store.contacts([bill.ownerId])]);

      const toDonors = await tell(
        donors,
        "A bill you supported is fully funded",
        (person) =>
          `Good news, ${firstName(person)}! The ${what} you helped with are now fully funded, thanks to you and other donors. ${link}\n\n${optOut}`,
      );
      const toOwner = await tell(
        owners,
        "Your fees are fully funded",
        (person) =>
          `Congratulations, ${firstName(person)}! Your ${what} are now fully funded. The money will be paid to the school. You can send your donors a thank-you note from ${baseUrl}/bills/${found.id}\n\n${optOut}`,
      );
      return toDonors + toOwner;
    },

    async notificationsOn(userId: string) {
      return store.getNotifyUpdates(userId);
    },

    async setNotifications(userId: string, on: boolean) {
      await store.setNotifyUpdates(userId, on);
    },

    // ---------------------------------------------------------- thank-you notes

    async submitNote(ownerId: string, billId: string, body: string) {
      const text = body.trim().replace(/\s+\n/g, "\n");
      const bill = await bills.findForOwner(ownerId, billId);
      if (!bill) return { ok: false as const, error: "NOT_FOUND" as const };
      if (bill.raisedCents <= 0) return { ok: false as const, error: "NO_GIFTS_YET" as const };
      if (text.length < 10) return { ok: false as const, error: "TOO_SHORT" as const };
      if (text.length > 500) return { ok: false as const, error: "TOO_LONG" as const };
      if ((await store.countNotes(billId)) >= MAX_NOTES_PER_BILL) {
        return { ok: false as const, error: "TOO_MANY" as const };
      }
      await store.createNote(billId, text);
      return { ok: true as const };
    },

    /** Every note on a bill, for its owner. */
    async notesForOwner(ownerId: string, billId: string) {
      if (!(await bills.findForOwner(ownerId, billId))) return [];
      return store.listNotes(billId, null);
    },

    /** Approved notes, shown publicly on the bill page. */
    approvedNotes: (billId: string) => store.listNotes(billId, "APPROVED"),

    async pendingNotes() {
      const notes = await store.listPendingNotes(50);
      const found = new Map(
        (await bills.findPublicMany([...new Set(notes.map((note) => note.billId))])).map((bill) => [bill.id, bill]),
      );
      return notes.map((note) => ({ ...note, bill: found.get(note.billId) ?? null }));
    },

    /** Approving a note sends it to the bill's donors. */
    async reviewNote(adminId: string, noteId: string, decision: "APPROVED" | "REJECTED") {
      const note = await store.reviewNote(noteId, decision, now(), adminId);
      if (!note) return { ok: false as const };
      if (decision === "APPROVED") {
        const bill = await bills.findPublic(note.billId);
        if (bill) {
          const donors = await store.contacts(await store.donorIdsForBill(bill.id));
          await tell(
            donors,
            "A thank-you note from a student you supported",
            (person) =>
              `Hi ${firstName(person)}, ${bill.studentInitials} (${bill.studentLevel}, ${bill.schoolName}) sent a thank-you note to everyone who supported their fees:\n\n"${note.body}"\n\n${baseUrl}/browse/${bill.id}\n\n${optOut}`,
          );
        }
      }
      return { ok: true as const };
    },

    // ------------------------------------------------------------- leaderboard

    async leaderboard(period: LeaderboardPeriod, limit = 20) {
      return rank(await store.topSupporters(periodStart(period, now()), limit));
    },

    // ---------------------------------------------------------- donor history

    async donorGifts(donorId: string, range: { from?: Date; to?: Date } = {}) {
      return giftFacts(await store.settledGifts({ donorId, ...range }));
    },

    async donorBadges(donorId: string) {
      return badgesFor(await giftFacts(await store.settledGifts({ donorId })));
    },

    async yearInReview(donorId: string, year: number) {
      return yearInReview(await giftFacts(await store.settledGifts({ donorId })), year);
    },

    async report(donorId: string, range: { from?: Date; to?: Date }) {
      const gifts = await giftFacts(await store.settledGifts({ donorId, ...range }));
      return { gifts, totals: reportTotals(gifts) };
    },

    // --------------------------------------------------------------- campaigns

    async createCampaign(ownerId: string, raw: unknown) {
      const parsed = campaignInputSchema.safeParse(raw);
      if (!parsed.success) return { ok: false as const, error: "INVALID" as const };
      const input = parsed.data;
      if (input.endsAt && input.endsAt.getTime() <= now().getTime()) {
        return { ok: false as const, error: "ENDS_IN_PAST" as const };
      }
      const base = slugify(input.title);
      let slug = base;
      for (let attempt = 2; await store.slugExists(slug); attempt += 1) {
        slug = attempt < 10 ? `${base}-${attempt}` : `${base}-${Math.random().toString(36).slice(2, 7)}`;
      }
      const created = await store.createCampaign(ownerId, { ...input, slug });
      return { ok: true as const, slug: created.slug };
    },

    /** A campaign's public page. Hidden ones are seen only by their owner and admins. */
    async campaign(slug: string, viewer: { id: string; role: string } | null) {
      const record = await store.findCampaign({ slug });
      if (!record) return null;
      const canSeeHidden = viewer !== null && (viewer.id === record.ownerId || viewer.role === "ADMIN");
      if (record.hiddenAt && !canSeeHidden) return null;
      const [view] = await withProgress([record]);
      const gifts = await store.settledGifts({ campaignId: record.id });
      const supporters = gifts
        .sort((a, b) => b.settledAt.getTime() - a.settledAt.getTime())
        .slice(0, 12)
        .map((gift) => ({ displayName: gift.displayName, amountCents: gift.amountCents, settledAt: gift.settledAt }));
      return { ...view!, supporters, isOwner: viewer?.id === record.ownerId };
    },

    async listCampaigns(limit = 24) {
      return withProgress(await store.listCampaigns({ includeHidden: false, limit }));
    },

    async myCampaigns(ownerId: string) {
      return withProgress(await store.listCampaigns({ ownerId, includeHidden: true, limit: 50 }));
    },

    async allCampaignsForAdmin() {
      return withProgress(await store.listCampaigns({ includeHidden: true, limit: 200 }));
    },

    /** The campaign id to credit a gift to, if the campaign is open. */
    async openCampaignId(slug: string): Promise<string | null> {
      const record = await store.findCampaign({ slug });
      return record && isCampaignOpen(record, now()) ? record.id : null;
    },

    async setMatch(adminId: string, campaignId: string, match: { matcherName: string; capCents: number } | null) {
      return store.updateCampaign(
        campaignId,
        match
          ? { matcherName: match.matcherName, matchCapCents: match.capCents, matchCheckedAt: now() }
          : { matcherName: null, matchCapCents: null, matchCheckedAt: null },
        adminId,
        match ? "campaign.match_checked" : "campaign.match_removed",
      );
    },

    async setHidden(adminId: string, campaignId: string, hidden: boolean) {
      return store.updateCampaign(
        campaignId,
        { hiddenAt: hidden ? now() : null },
        adminId,
        hidden ? "campaign.hidden" : "campaign.shown",
      );
    },
  };
}

export type EngagementService = ReturnType<typeof createEngagementService>;

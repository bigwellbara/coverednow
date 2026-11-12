import { beforeEach, describe, expect, it } from "vitest";
import type { PublicBill } from "../../billing/domain/public-bill";
import {
  createEngagementService,
  type CampaignRecord,
  type Contact,
  type EngagementStore,
  type NoteRecord,
  type SettledGift,
} from "./engagement-service";

const NOW = new Date("2027-03-10T10:00:00Z");

const BILL: PublicBill = {
  id: "bill-1",
  schoolId: "school-1",
  schoolName: "Hillside High",
  schoolType: "HIGH_SCHOOL",
  city: "Bulawayo",
  term: "2027-T1",
  studentInitials: "T. M.",
  studentLevel: "Form 3",
  confirmedCents: 20_000,
  raisedCents: 20_000,
  dueDate: new Date("2027-04-01T00:00:00Z"),
  status: "FUNDED",
  createdAt: NOW,
  confirmedAt: NOW,
  fundedAt: NOW,
};

function setup() {
  const people = new Map<string, Contact>([
    ["owner", { id: "owner", name: "Tendai Moyo", phone: "+263771111111", email: null, notifyUpdates: true }],
    ["donor-a", { id: "donor-a", name: "Rudo Ncube", phone: "+447700900000", email: null, notifyUpdates: true }],
    ["donor-b", { id: "donor-b", name: "Sam Dube", phone: null, email: "sam@example.com", notifyUpdates: true }],
    ["donor-c", { id: "donor-c", name: "Quiet Person", phone: "+263772222222", email: null, notifyUpdates: false }],
  ]);
  const donorsByBill = new Map([["bill-1", ["donor-a", "donor-b", "donor-c"]]]);
  const notes = new Map<string, NoteRecord>();
  const campaigns = new Map<string, CampaignRecord>();
  const gifts: SettledGift[] = [];
  const texts: Array<{ to: string; text: string }> = [];
  const emails: Array<{ to: string; subject: string }> = [];
  const logs: string[] = [];
  let failTextsTo: string | null = null;
  let ids = 0;

  const store: EngagementStore = {
    createNote: async (billId, body) => {
      const note: NoteRecord = { id: `note-${(ids += 1)}`, billId, body, status: "PENDING", createdAt: NOW, reviewedAt: null };
      notes.set(note.id, note);
      return note;
    },
    countNotes: async (billId) => [...notes.values()].filter((n) => n.billId === billId && n.status !== "REJECTED").length,
    listNotes: async (billId, status) =>
      [...notes.values()].filter((n) => n.billId === billId && (!status || n.status === status)),
    listPendingNotes: async () => [...notes.values()].filter((n) => n.status === "PENDING"),
    reviewNote: async (id, status, at) => {
      const note = notes.get(id);
      if (!note || note.status !== "PENDING") return null;
      Object.assign(note, { status, reviewedAt: at });
      return note;
    },
    donorIdsForBill: async (billId) => donorsByBill.get(billId) ?? [],
    contacts: async (userIds) => userIds.flatMap((id) => (people.has(id) ? [people.get(id)!] : [])),
    getNotifyUpdates: async (userId) => people.get(userId)?.notifyUpdates ?? false,
    setNotifyUpdates: async (userId, on) => {
      people.get(userId)!.notifyUpdates = on;
    },
    settledGifts: async ({ donorId, campaignId }) =>
      gifts.filter((g) => (!donorId || g.id.startsWith(donorId)) && (!campaignId || g.campaignId === campaignId)),
    topSupporters: async () => [],
    slugExists: async (slug) => [...campaigns.values()].some((c) => c.slug === slug),
    createCampaign: async (ownerId, input) => {
      const record: CampaignRecord = {
        id: `campaign-${(ids += 1)}`,
        slug: input.slug,
        ownerId,
        ownerName: "Owner",
        kind: input.kind,
        title: input.title,
        story: input.story,
        goalCents: input.goalCents,
        endsAt: input.endsAt,
        matcherName: null,
        matchCapCents: null,
        matchCheckedAt: null,
        hiddenAt: null,
        createdAt: NOW,
      };
      campaigns.set(record.id, record);
      return record;
    },
    findCampaign: async (where) =>
      [...campaigns.values()].find((c) => ("slug" in where ? c.slug === where.slug : c.id === where.id)) ?? null,
    listCampaigns: async ({ ownerId, includeHidden }) =>
      [...campaigns.values()].filter((c) => (!ownerId || c.ownerId === ownerId) && (includeHidden || !c.hiddenAt)),
    campaignTotals: async (campaignIds) =>
      new Map(
        campaignIds.map((id) => {
          const own = gifts.filter((g) => g.campaignId === id);
          return [id, { raisedCents: own.reduce((s, g) => s + g.amountCents, 0), gifts: own.length, donors: own.length }];
        }),
      ),
    updateCampaign: async (id, patch) => {
      const campaign = campaigns.get(id);
      if (!campaign) return false;
      Object.assign(campaign, patch);
      return true;
    },
  };

  const service = createEngagementService({
    store,
    bills: {
      findPublic: async (id) => (id === BILL.id ? BILL : null),
      findPublicMany: async (billIds) => (billIds.includes(BILL.id) ? [BILL] : []),
      findForOwner: async (ownerId, billId) =>
        ownerId === "owner" && billId === BILL.id ? { id: BILL.id, raisedCents: BILL.raisedCents } : null,
    },
    messages: {
      sendText: async (to, text) => {
        if (to === failTextsTo) throw new Error("not on WhatsApp");
        texts.push({ to, text });
      },
    },
    email: {
      send: async ({ to, subject }) => {
        emails.push({ to, subject });
      },
    },
    baseUrl: "https://app.test",
    now: () => NOW,
    log: (message) => logs.push(message),
  });

  return {
    service, store, people, notes, campaigns, gifts, texts, emails, logs,
    failTextsTo: (phone: string) => { failTextsTo = phone; },
  };
}

describe("engagement service", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  describe("when a bill is fully funded", () => {
    it("tells donors by WhatsApp or email, and the owner, skipping anyone who opted out", async () => {
      expect(await t.service.billFunded({ id: BILL.id, ownerId: "owner" })).toBe(3);

      expect(t.texts.map((m) => m.to)).toEqual(["+447700900000", "+263771111111"]);
      expect(t.texts[0]!.text).toMatch(/^Good news, Rudo! The Term 1, 2027 fees at Hillside High/);
      expect(t.texts[0]!.text).toContain("https://app.test/browse/bill-1");
      expect(t.texts[0]!.text).toContain("https://app.test/account");
      expect(t.texts[1]!.text).toMatch(/^Congratulations, Tendai!/);
      expect(t.emails).toEqual([{ to: "sam@example.com", subject: "A bill you supported is fully funded" }]);
    });

    it("keeps going when one message fails", async () => {
      t.failTextsTo("+447700900000");
      expect(await t.service.billFunded({ id: BILL.id, ownerId: "owner" })).toBe(2);
      expect(t.logs[0]).toMatch(/donor-a: not on WhatsApp/);
    });

    it("respects a change of mind", async () => {
      await t.service.setNotifications("donor-a", false);
      await t.service.billFunded({ id: BILL.id, ownerId: "owner" });
      expect(t.texts.map((m) => m.to)).not.toContain("+447700900000");
    });
  });

  describe("thank-you notes", () => {
    it("only lets the bill's owner write one", async () => {
      expect(await t.service.submitNote("donor-a", BILL.id, "Thank you all so much!")).toEqual({
        ok: false,
        error: "NOT_FOUND",
      });
      expect(await t.service.submitNote("owner", BILL.id, "Thank you all so much!")).toEqual({ ok: true });
    });

    it("checks the length and caps the number", async () => {
      expect(await t.service.submitNote("owner", BILL.id, "  thanks  ")).toMatchObject({ error: "TOO_SHORT" });
      expect(await t.service.submitNote("owner", BILL.id, "x".repeat(501))).toMatchObject({ error: "TOO_LONG" });
      for (let i = 0; i < 3; i += 1) await t.service.submitNote("owner", BILL.id, `Thank you, note ${i}`);
      expect(await t.service.submitNote("owner", BILL.id, "One more thank you")).toMatchObject({ error: "TOO_MANY" });
    });

    it("is only shown and sent to donors once approved", async () => {
      await t.service.submitNote("owner", BILL.id, "I sat my exams. Thank you!");
      expect(await t.service.approvedNotes(BILL.id)).toEqual([]);
      expect(t.texts).toEqual([]);

      const [pending] = await t.service.pendingNotes();
      expect(pending!.bill?.schoolName).toBe("Hillside High");
      expect(await t.service.reviewNote("admin", pending!.id, "APPROVED")).toEqual({ ok: true });

      expect(await t.service.approvedNotes(BILL.id)).toHaveLength(1);
      expect(t.texts[0]!.text).toContain('"I sat my exams. Thank you!"');
      expect(t.emails).toHaveLength(1);
      // A second review changes nothing.
      expect(await t.service.reviewNote("admin", pending!.id, "REJECTED")).toEqual({ ok: false });
    });

    it("sends nothing for a rejected note", async () => {
      await t.service.submitNote("owner", BILL.id, "Please send me money directly");
      const [pending] = await t.service.pendingNotes();
      await t.service.reviewNote("admin", pending!.id, "REJECTED");
      expect(t.texts).toEqual([]);
    });
  });

  describe("campaigns", () => {
    const input = {
      kind: "CIRCLE",
      title: "Harare Alumni 2009",
      story: "Our class is covering fees for students at our old school.",
      goalCents: 100_000,
      endsAt: null,
    };

    it("creates a campaign with a unique, readable address", async () => {
      expect(await t.service.createCampaign("owner", input)).toEqual({ ok: true, slug: "harare-alumni-2009" });
      expect(await t.service.createCampaign("owner", input)).toEqual({ ok: true, slug: "harare-alumni-2009-2" });
    });

    it("refuses bad details and past end dates", async () => {
      expect(await t.service.createCampaign("owner", { ...input, goalCents: 100 })).toMatchObject({ error: "INVALID" });
      expect(
        await t.service.createCampaign("owner", { ...input, endsAt: new Date("2027-01-01T00:00:00Z") }),
      ).toMatchObject({ error: "ENDS_IN_PAST" });
    });

    it("counts gifts and a checked match toward the goal", async () => {
      const { slug } = (await t.service.createCampaign("owner", input)) as { slug: string };
      const campaign = (await t.service.campaign(slug, null))!;
      t.gifts.push({
        id: "donor-a-1", reference: "CN-1", billId: BILL.id, amountCents: 30_000, tipCents: 0, feeCents: 0,
        settledAt: NOW, displayName: "Rudo", campaignId: campaign.id,
      });
      await t.service.setMatch("admin", campaign.id, { matcherName: "Acme Ltd", capCents: 20_000 });

      const view = (await t.service.campaign(slug, null))!;
      expect(view.progress).toMatchObject({ raisedCents: 30_000, matchedCents: 20_000, totalCents: 50_000, percent: 50 });
      expect(view.supporters).toEqual([{ displayName: "Rudo", amountCents: 30_000, settledAt: NOW }]);
    });

    it("hides a campaign from everyone but its owner and admins, and stops gifts to it", async () => {
      const { slug } = (await t.service.createCampaign("owner", input)) as { slug: string };
      const { id } = (await t.service.campaign(slug, null))!;
      await t.service.setHidden("admin", id, true);

      expect(await t.service.campaign(slug, null)).toBeNull();
      expect(await t.service.campaign(slug, { id: "owner", role: "DONOR" })).not.toBeNull();
      expect(await t.service.campaign(slug, { id: "x", role: "ADMIN" })).not.toBeNull();
      expect(await t.service.openCampaignId(slug)).toBeNull();
      expect(await t.service.listCampaigns()).toEqual([]);
    });
  });
});

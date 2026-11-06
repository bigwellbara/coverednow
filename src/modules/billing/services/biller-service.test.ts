import { beforeEach, describe, expect, it } from "vitest";
import type {
  BillerDetails,
  ContactDetails,
  PayoutDetails,
} from "../domain/biller";
import {
  createBillerService,
  type BillerRecord,
  type BillerStore,
  type PayoutCipher,
} from "./biller-service";

const ADMIN = "admin-1";
const SCHOOL: BillerDetails = {
  name: "Test University",
  type: "UNIVERSITY",
  city: "Harare",
};
const BURSAR: ContactDetails = {
  name: "A Bursar",
  phone: "+263771000011",
  roleTitle: "Bursar",
};
const BANK: PayoutDetails = {
  method: "BANK",
  bankName: "Test Bank",
  branch: "Harare",
  accountName: "Test University",
  accountNumber: "123456789012",
};

function setup() {
  const billers = new Map<string, BillerRecord>();
  const audit: Array<{ action: string; actorId: string; detail: string }> = [];
  let ids = 0;

  const record = (action: string, actorId: string, detail: unknown = null) =>
    audit.push({ action, actorId, detail: JSON.stringify(detail) });

  const contactById = (id: string) =>
    [...billers.values()].flatMap((b) => b.contacts).find((c) => c.id === id);

  const store: BillerStore = {
    list: async () =>
      [...billers.values()].map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        city: b.city,
        verified: b.verified,
        hasPayoutDetails: b.payoutDetails !== null,
        verifiedContacts: b.contacts.filter(
          (c) => c.verifiedAt && !c.removedAt,
        ).length,
      })),
    find: async (id) => {
      const biller = billers.get(id);
      return biller
        ? { ...biller, contacts: biller.contacts.filter((c) => !c.removedAt) }
        : null;
    },
    findContact: async (id) => contactById(id) ?? null,
    create: async (details, actorId) => {
      const id = `school-${(ids += 1)}`;
      billers.set(id, {
        ...details,
        id,
        verified: false,
        payoutDetails: null,
        contacts: [],
      });
      record("biller.created", actorId);
      return id;
    },
    update: async (id, details, actorId) => {
      Object.assign(billers.get(id)!, details);
      record("biller.updated", actorId);
    },
    savePayout: async (id, method, encrypted, actorId) => {
      const biller = billers.get(id)!;
      biller.payoutDetails = encrypted;
      biller.verified = false;
      record("biller.payout_saved", actorId, { method });
    },
    addContact: async (billerId, contact, actorId) => {
      billers.get(billerId)!.contacts.push({
        ...contact,
        email: contact.email ?? null,
        id: `contact-${(ids += 1)}`,
        billerId,
        verifiedAt: null,
        verificationNote: null,
        removedAt: null,
      });
      record("biller.contact_added", actorId);
    },
    verifyContact: async (contactId, note, actorId, at) => {
      Object.assign(contactById(contactId)!, {
        verifiedAt: at,
        verificationNote: note,
      });
      record("biller.contact_verified", actorId);
    },
    removeContact: async (contactId, actorId, at) => {
      const contact = contactById(contactId)!;
      contact.removedAt = at;
      const biller = billers.get(contact.billerId)!;
      if (!biller.contacts.some((c) => c.verifiedAt && !c.removedAt)) {
        biller.verified = false;
      }
      record("biller.contact_removed", actorId);
    },
    setVerified: async (id, verified, actorId) => {
      billers.get(id)!.verified = verified;
      record(verified ? "biller.verified" : "biller.unverified", actorId);
    },
  };

  // Reversible and visibly not plain text, so tests can check what gets stored.
  const cipher: PayoutCipher = {
    encrypt: (billerId, details) => ({
      iv: billerId,
      tag: "tag",
      data: Buffer.from(JSON.stringify(details)).toString("base64"),
    }),
    decrypt: (_billerId, encrypted) =>
      JSON.parse(Buffer.from(encrypted.data, "base64").toString()),
  };

  return {
    service: createBillerService({ store, cipher }),
    billers,
    audit,
  };
}

describe("biller service", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  const verifiedContact = async (id: string) => {
    await t.service.addContact(id, BURSAR, ADMIN);
    const contact = t.billers.get(id)!.contacts.at(-1)!;
    await t.service.verifyContact(contact.id, "Called the school", ADMIN);
    return contact;
  };

  const verifiedSchool = async () => {
    const id = await t.service.create(SCHOOL, ADMIN);
    const contact = await verifiedContact(id);
    await t.service.savePayout(id, BANK, ADMIN);
    await t.service.verify(id, ADMIN);
    return { id, contact };
  };

  it("creates schools as not verified", async () => {
    const id = await t.service.create(SCHOOL, ADMIN);

    expect((await t.service.getForAdmin(id))?.verified).toBe(false);
  });

  describe("verifying a school", () => {
    it("needs payout details and a verified contact", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      expect(await t.service.verify(id, ADMIN)).toEqual({
        ok: false,
        error: "PAYOUT_DETAILS_MISSING",
      });

      await t.service.savePayout(id, BANK, ADMIN);
      expect(await t.service.verify(id, ADMIN)).toEqual({
        ok: false,
        error: "VERIFIED_CONTACT_MISSING",
      });

      await verifiedContact(id);
      expect(await t.service.verify(id, ADMIN)).toEqual({ ok: true });
      expect((await t.service.getForAdmin(id))?.verified).toBe(true);
    });

    it("does not count a contact nobody has checked", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      await t.service.savePayout(id, BANK, ADMIN);
      await t.service.addContact(id, BURSAR, ADMIN);

      expect(await t.service.verify(id, ADMIN)).toEqual({
        ok: false,
        error: "VERIFIED_CONTACT_MISSING",
      });
    });

    it("does not count a verified contact who has been removed", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      await t.service.savePayout(id, BANK, ADMIN);
      const contact = await verifiedContact(id);
      await t.service.removeContact(contact.id, ADMIN);

      expect(await t.service.verify(id, ADMIN)).toEqual({
        ok: false,
        error: "VERIFIED_CONTACT_MISSING",
      });
    });

    it("reports what is missing for the page to show", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);

      expect((await t.service.getForAdmin(id))?.blockers).toEqual([
        "PAYOUT_DETAILS_MISSING",
        "VERIFIED_CONTACT_MISSING",
      ]);
    });

    it("can be withdrawn", async () => {
      const { id } = await verifiedSchool();

      await t.service.unverify(id, ADMIN);

      expect((await t.service.getForAdmin(id))?.verified).toBe(false);
    });
  });

  describe("payout details", () => {
    it("are stored encrypted, not as entered", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      await t.service.savePayout(id, BANK, ADMIN);

      const stored = JSON.stringify(t.billers.get(id)!.payoutDetails);
      expect(stored).not.toContain("123456789012");
    });

    it("are only returned masked", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      await t.service.savePayout(id, BANK, ADMIN);

      const school = await t.service.getForAdmin(id);

      expect(school?.payoutSummary).toBe(
        "Test Bank, Test University, account ending 9012",
      );
      expect(JSON.stringify(school)).not.toContain("123456789012");
      expect(school).not.toHaveProperty("payoutDetails");
    });

    it("show as missing until set", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);

      const school = await t.service.getForAdmin(id);

      expect(school?.hasPayoutDetails).toBe(false);
      expect(school?.payoutSummary).toBeNull();
    });

    it("remove verified status when changed, so a redirect gets re-checked", async () => {
      const { id } = await verifiedSchool();

      await t.service.savePayout(
        id,
        { ...BANK, accountNumber: "999999999999" },
        ADMIN,
      );

      expect((await t.service.getForAdmin(id))?.verified).toBe(false);
    });

    it("never reach the audit log", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      await t.service.savePayout(id, BANK, ADMIN);

      expect(JSON.stringify(t.audit)).not.toContain("123456789012");
    });
  });

  describe("contacts", () => {
    it("start unverified", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      await t.service.addContact(id, BURSAR, ADMIN);

      const school = await t.service.getForAdmin(id);
      expect(school?.contacts[0]?.verifiedAt).toBeNull();
    });

    it("record how they were verified", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      const contact = await verifiedContact(id);

      expect(contact.verificationNote).toBe("Called the school");
    });

    it("disappear from the school when removed", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      const contact = await verifiedContact(id);

      await t.service.removeContact(contact.id, ADMIN);

      expect((await t.service.getForAdmin(id))?.contacts).toEqual([]);
    });

    it("remove verified status when the last verified one goes", async () => {
      const { id, contact } = await verifiedSchool();

      await t.service.removeContact(contact.id, ADMIN);

      expect((await t.service.getForAdmin(id))?.verified).toBe(false);
    });

    it("keep verified status while another verified one remains", async () => {
      const { id, contact } = await verifiedSchool();
      await verifiedContact(id);

      await t.service.removeContact(contact.id, ADMIN);

      expect((await t.service.getForAdmin(id))?.verified).toBe(true);
    });

    it("cannot be verified or removed again once removed", async () => {
      const id = await t.service.create(SCHOOL, ADMIN);
      const contact = await verifiedContact(id);
      await t.service.removeContact(contact.id, ADMIN);

      const notFound = { ok: false, error: "NOT_FOUND" };
      expect(await t.service.verifyContact(contact.id, "note", ADMIN)).toEqual(
        notFound,
      );
      expect(await t.service.removeContact(contact.id, ADMIN)).toEqual(notFound);
    });
  });

  describe("unknown ids", () => {
    const notFound = { ok: false, error: "NOT_FOUND" };

    it("are reported rather than creating anything", async () => {
      expect(await t.service.getForAdmin("nope")).toBeNull();
      expect(await t.service.update("nope", SCHOOL, ADMIN)).toEqual(notFound);
      expect(await t.service.savePayout("nope", BANK, ADMIN)).toEqual(notFound);
      expect(await t.service.addContact("nope", BURSAR, ADMIN)).toEqual(notFound);
      expect(await t.service.verifyContact("nope", "note", ADMIN)).toEqual(
        notFound,
      );
      expect(await t.service.removeContact("nope", ADMIN)).toEqual(notFound);
      expect(await t.service.verify("nope", ADMIN)).toEqual(notFound);
      expect(await t.service.unverify("nope", ADMIN)).toEqual(notFound);
      expect(t.audit).toEqual([]);
    });
  });

  it("records who made each change", async () => {
    await verifiedSchool();

    expect(t.audit.map((entry) => entry.action)).toEqual([
      "biller.created",
      "biller.contact_added",
      "biller.contact_verified",
      "biller.payout_saved",
      "biller.verified",
    ]);
    expect(t.audit.every((entry) => entry.actorId === ADMIN)).toBe(true);
  });
});

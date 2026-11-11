import { beforeEach, describe, expect, it } from "vitest";
import { REJECTED_BY_SCHOOL_REASON } from "../domain/bill";
import { CONFIRMATION_TTL_MS, signConfirmationToken } from "../domain/confirmation-token";
import {
  createBillService,
  type BillOwner,
  type BillRecord,
  type BillStore,
  type ConfirmationRecord,
  type NewBill,
} from "./bill-service";

const SECRET = "test-secret";
const START = new Date("2027-01-01T08:00:00Z");
const DUE = new Date("2027-01-31T21:59:59.999Z");
const STUDENT: BillOwner = { id: "user-student", role: "STUDENT" };
const GUARDIAN: BillOwner = { id: "user-guardian", role: "GUARDIAN" };

let counter = 0;
const pdf = (label = String((counter += 1))) =>
  new TextEncoder().encode(`%PDF-1.7 ${label}`);

function setup() {
  let clock = START;
  const schools = [
    { id: "uni", name: "Test University", type: "UNIVERSITY" as const, city: "Harare", verified: true },
    { id: "hs", name: "Test High School", type: "HIGH_SCHOOL" as const, city: "Bulawayo", verified: true },
    { id: "college", name: "Test College", type: "COLLEGE" as const, city: "Mutare", verified: false },
  ];
  const contacts = new Map([
    ["uni", [
      { id: "bursar-1", phone: "+263771000011", name: "First Bursar", active: true },
      { id: "bursar-2", phone: "+263771000012", name: "Second Bursar", active: true },
    ]],
    ["hs", [{ id: "bursar-3", phone: "+263771000013", name: "HS Bursar", active: true }]],
  ]);
  const bills = new Map<string, BillRecord & { documentHash: string }>();
  const confirmations = new Map<string, {
    id: string;
    billId: string;
    contactId: string;
    status: ConfirmationRecord["status"];
    expiresAt: Date;
    sentAt: Date | null;
    respondedAt: Date | null;
  }>();
  const objects = new Map<string, Uint8Array>();
  const messages: Array<{ phone: string; text: string }> = [];
  const events: string[] = [];
  const logs: string[] = [];
  const directory = new Map([
    [STUDENT.id, { id: "student-1", ownerVerified: true }],
    [GUARDIAN.id, { id: "student-2", ownerVerified: true }],
  ]);
  let ids = 0;
  let sendFailsFor: string | null = null;

  const allContacts = () => [...contacts.values()].flat();
  const school = (id: string) => schools.find((s) => s.id === id)!;
  const isClosed = (status: string) => status === "REJECTED" || status === "CANCELLED";

  const store: BillStore = {
    listVerifiedSchools: async () => schools.filter((s) => s.verified),
    findSchool: async (id) => schools.find((s) => s.id === id) ?? null,
    findConflict: async (bill) => {
      const open = [...bills.values()].filter((b) => !isClosed(b.status));
      if (open.some((b) => b.billerId === bill.billerId && b.regNumber === bill.regNumber && b.term === bill.term)) return "DUPLICATE_BILL";
      if (open.some((b) => b.studentId === bill.studentId && b.term === bill.term)) return "OPEN_BILL_FOR_TERM";
      if (open.some((b) => b.documentHash === bill.documentHash)) return "DUPLICATE_DOCUMENT";
      return null;
    },
    create: async (bill: NewBill) => {
      if (raceOnCreate) return null;
      const id = `bill-${(ids += 1)}`;
      bills.set(id, {
        ...bill,
        id,
        billerName: school(bill.billerId).name,
        billerType: school(bill.billerId).type,
        confirmedCents: null,
        closedReason: null,
        createdAt: clock,
      });
      events.push("bill.submitted");
      return { id };
    },
    find: async (id) => bills.get(id) ?? null,
    listForOwner: async (ownerId) => [...bills.values()].filter((b) => b.ownerId === ownerId),
    listAll: async () => [...bills.values()],
    close: async (id, from, to, actorId, reason) => {
      const bill = bills.get(id);
      if (bill?.status !== from) return false;
      bill.status = to;
      bill.closedReason = reason;
      events.push(`bill.closed:${to}:${actorId}`);
      return true;
    },
    listVerifiedContacts: async (billerId) =>
      (contacts.get(billerId) ?? []).filter((c) => c.active).map(({ id, phone }) => ({ id, phone })),
    listConfirmations: async (billId) =>
      [...confirmations.values()]
        .filter((c) => c.billId === billId)
        .map((c) => ({ ...c, contactName: allContacts().find((x) => x.id === c.contactId)!.name })),
    findPendingConfirmationId: async (billId, contactId) =>
      [...confirmations.values()].find((c) => c.billId === billId && c.contactId === contactId && c.status === "PENDING")?.id ?? null,
    createConfirmation: async (billId, contactId, expiresAt) => {
      const id = `conf-${(ids += 1)}`;
      confirmations.set(id, { id, billId, contactId, status: "PENDING", expiresAt, sentAt: null, respondedAt: null });
      return id;
    },
    extendConfirmation: async (id, expiresAt) => {
      confirmations.get(id)!.expiresAt = expiresAt;
    },
    markConfirmationSent: async (id, at) => {
      confirmations.get(id)!.sentAt = at;
    },
    findConfirmation: async (id) => {
      const c = confirmations.get(id);
      if (!c) return null;
      const bill = bills.get(c.billId)!;
      const contact = allContacts().find((x) => x.id === c.contactId)!;
      return {
        id,
        status: c.status,
        expiresAt: c.expiresAt,
        contactId: c.contactId,
        contactName: contact.name,
        contactIsActive: contact.active,
        billerVerified: school(bill.billerId).verified,
        bill,
      };
    },
    recordConfirmationView: async (id) => {
      events.push(`confirmation.viewed:${id}`);
    },
    recordResponse: async (r) => {
      const c = confirmations.get(r.confirmationId)!;
      const bill = bills.get(r.billId)!;
      if (c.status !== "PENDING" || bill.status !== "PENDING_SCHOOL") return false;
      c.status = r.status;
      c.respondedAt = r.at;
      bill.status = r.billStatus;
      bill.confirmedCents = r.confirmedCents;
      bill.closedReason = r.closedReason;
      events.push(`confirmation.${r.status}:${r.contactId}`);
      return true;
    },
    recordStatementView: async (billId, viewerId) => {
      events.push(`statement.viewed:${billId}:${viewerId}`);
    },
  };
  let raceOnCreate = false;

  const service = createBillService({
    store,
    students: {
      findForOwner: async (ownerId) => directory.get(ownerId) ?? null,
      findStudent: async () => ({ firstName: "Test", lastName: "Learner", level: "Year 2" }),
    },
    files: {
      put: async (bytes) => {
        const key = `key-${(ids += 1)}`;
        objects.set(key, bytes);
        return key;
      },
      get: async (key) => objects.get(key)!,
      delete: async (key) => {
        objects.delete(key);
      },
    },
    messages: {
      sendText: async (phone, text) => {
        if (phone === sendFailsFor) throw new Error(`failed sending ${text}`);
        messages.push({ phone, text });
      },
    },
    tokenSecret: SECRET,
    baseUrl: "https://app.test",
    now: () => clock,
    log: (message) => logs.push(message),
  });

  return {
    service, bills, confirmations, objects, messages, events, logs, directory, schools, contacts,
    advance: (ms: number) => { clock = new Date(clock.getTime() + ms); },
    failSendsTo: (phone: string | null) => { sendFailsFor = phone; },
    raceOnCreate: () => { raceOnCreate = true; },
    tokenFor: (id: string) => signConfirmationToken(SECRET, id),
    confirmationIds: () => [...confirmations.keys()],
  };
}

const input = (overrides: Record<string, unknown> = {}) => ({
  billerId: "uni",
  regNumber: "h150123a",
  term: "2027-S1",
  claimedCents: 20_000,
  dueDate: DUE,
  statement: pdf(),
  ...overrides,
});

describe("bill service", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  const submitted = async () => {
    const result = await t.service.submit(STUDENT, input());
    if (!result.ok) throw new Error(result.error);
    await t.service.sendConfirmationLinks(result.id);
    return { billId: result.id, token: t.tokenFor(t.confirmationIds().at(-1)!) };
  };

  describe("submitting", () => {
    it("creates a bill waiting for the school, with the reg number normalised", async () => {
      const result = await t.service.submit(STUDENT, input());

      expect(result.ok).toBe(true);
      const [bill] = [...t.bills.values()];
      expect(bill?.status).toBe("PENDING_SCHOOL");
      expect(bill?.regNumber).toBe("H150123A");
      expect(bill?.studentId).toBe("student-1");
      expect(bill?.confirmedCents).toBeNull();
    });

    it("needs a verified account", async () => {
      t.directory.set(STUDENT.id, { id: "student-1", ownerVerified: false });

      expect(await t.service.submit(STUDENT, input())).toEqual({ ok: false, error: "NOT_VERIFIED" });
      expect(await t.service.canSubmit(STUDENT)).toBe(false);
    });

    it("needs student details on the account", async () => {
      t.directory.delete(STUDENT.id);

      expect(await t.service.submit(STUDENT, input())).toEqual({ ok: false, error: "NOT_VERIFIED" });
    });

    it("needs a verified school", async () => {
      expect(await t.service.submit(STUDENT, input({ billerId: "college" }))).toEqual({
        ok: false,
        error: "SCHOOL_NOT_AVAILABLE",
      });
      expect(await t.service.submit(STUDENT, input({ billerId: "nope" }))).toEqual({
        ok: false,
        error: "SCHOOL_NOT_AVAILABLE",
      });
    });

    it("does not let a student list a high school bill, as minors hold no accounts", async () => {
      expect(await t.service.submit(STUDENT, input({ billerId: "hs" }))).toEqual({
        ok: false,
        error: "SCHOOL_NOT_AVAILABLE",
      });
    });

    it("keeps guardians to high schools", async () => {
      expect(await t.service.submit(GUARDIAN, input({ billerId: "uni" }))).toEqual({
        ok: false,
        error: "SCHOOL_NOT_AVAILABLE",
      });
      expect((await t.service.submit(GUARDIAN, input({ billerId: "hs" }))).ok).toBe(true);
    });

    it("only offers the schools the account can use", async () => {
      expect((await t.service.schoolsFor(STUDENT)).map((s) => s.id)).toEqual(["uni"]);
      expect((await t.service.schoolsFor(GUARDIAN)).map((s) => s.id)).toEqual(["hs"]);
    });

    it.each([
      [{ regNumber: "a" }, "INVALID_REG_NUMBER"],
      [{ term: "Term 1" }, "INVALID_TERM"],
      [{ dueDate: new Date("2026-12-31T00:00:00Z") }, "DUE_DATE_PASSED"],
      [{ statement: new Uint8Array() }, "EMPTY_FILE"],
      [{ statement: new TextEncoder().encode("<html>") }, "UNSUPPORTED_FILE_TYPE"],
      [{ statement: new Uint8Array(5 * 1024 * 1024 + 1) }, "FILE_TOO_LARGE"],
    ])("refuses %j", async (overrides, error) => {
      expect(await t.service.submit(STUDENT, input(overrides))).toEqual({ ok: false, error });
      expect(t.objects.size).toBe(0);
      expect(t.bills.size).toBe(0);
    });

    it("refuses a second bill for the same reg number and term at a school", async () => {
      await t.service.submit(STUDENT, input());

      expect(await t.service.submit(GUARDIAN, input({ regNumber: "H150 123A" }))).toEqual({
        ok: false,
        error: "SCHOOL_NOT_AVAILABLE",
      });
      t.directory.set("other", { id: "student-3", ownerVerified: true });
      expect(
        await t.service.submit({ id: "other", role: "STUDENT" }, input({ regNumber: "H150 123A" })),
      ).toEqual({ ok: false, error: "DUPLICATE_BILL" });
    });

    it("refuses a second open bill for the same student and term", async () => {
      await t.service.submit(STUDENT, input());

      expect(await t.service.submit(STUDENT, input({ regNumber: "OTHER123" }))).toEqual({
        ok: false,
        error: "OPEN_BILL_FOR_TERM",
      });
    });

    it("refuses a fee statement already used, leaving no file behind", async () => {
      const statement = pdf("shared");
      await t.service.submit(STUDENT, input({ statement }));
      const filesBefore = t.objects.size;

      expect(
        await t.service.submit(STUDENT, input({ statement, regNumber: "OTHER123", term: "2027-S2" })),
      ).toEqual({ ok: false, error: "DUPLICATE_DOCUMENT" });
      expect(t.objects.size).toBe(filesBefore);
    });

    it("does not let a rejected bill block the real student for good", async () => {
      const { token } = await submitted();
      await t.service.respond(token, { decision: "REJECT" });

      t.directory.set("real", { id: "student-real", ownerVerified: true });
      expect(
        (await t.service.submit({ id: "real", role: "STUDENT" }, input())).ok,
      ).toBe(true);
    });

    it("cleans up the file if the database refuses at the last moment", async () => {
      t.raceOnCreate();

      expect(await t.service.submit(STUDENT, input())).toEqual({ ok: false, error: "DUPLICATE_BILL" });
      expect(t.objects.size).toBe(0);
    });
  });

  describe("sending links", () => {
    it("messages every verified contact, with no student named", async () => {
      const result = await t.service.submit(STUDENT, input());
      const outcome = await t.service.sendConfirmationLinks((result as { id: string }).id);

      expect(outcome).toEqual({ sent: 2, failed: 0 });
      expect(t.messages.map((m) => m.phone)).toEqual(["+263771000011", "+263771000012"]);
      expect(t.messages[0]?.text).toContain("https://app.test/confirm/");
      expect(t.messages[0]?.text).not.toContain("Learner");
      expect(t.messages[0]?.text).not.toContain("H150123A");
    });

    it("keeps the same link when re-sending, and extends it", async () => {
      const { billId } = await submitted();
      const firstCount = t.confirmations.size;
      const firstLink = t.messages.at(-1)!.text;

      t.advance(CONFIRMATION_TTL_MS - 1000);
      await t.service.sendConfirmationLinks(billId);

      expect(t.confirmations.size).toBe(firstCount);
      expect(t.messages.at(-1)!.text).toBe(firstLink);
      t.advance(2000);
      expect((await t.service.viewConfirmation(t.tokenFor(t.confirmationIds()[0]!))).state).toBe("OPEN");
    });

    it("reports a failed send without the link, and still sends to the others", async () => {
      const result = await t.service.submit(STUDENT, input());
      t.failSendsTo("+263771000011");

      const outcome = await t.service.sendConfirmationLinks((result as { id: string }).id);

      expect(outcome).toEqual({ sent: 1, failed: 1 });
      expect(t.logs.join()).toContain("bursar-1");
      expect(t.logs.join()).not.toContain("/confirm/");
      const [failedOne, sentOne] = [...t.confirmations.values()];
      expect(failedOne?.sentAt).toBeNull();
      expect(sentOne?.sentAt).not.toBeNull();
    });

    it("sends nothing for a bill no longer waiting", async () => {
      const { billId, token } = await submitted();
      await t.service.respond(token, { decision: "CONFIRM" });
      const before = t.messages.length;

      expect(await t.service.sendConfirmationLinks(billId)).toEqual({ sent: 0, failed: 0 });
      expect(t.messages.length).toBe(before);
    });

    it("logs a school with nobody to ask", async () => {
      const result = await t.service.submit(STUDENT, input());
      t.contacts.set("uni", []);

      await t.service.sendConfirmationLinks((result as { id: string }).id);

      expect(t.logs.join()).toContain("no verified contact");
    });
  });

  describe("the confirmation page", () => {
    it("shows the bill to a valid link, without changing anything", async () => {
      const { token, billId } = await submitted();

      const view = await t.service.viewConfirmation(token);
      await t.service.viewConfirmation(token);

      expect(view).toMatchObject({
        state: "OPEN",
        schoolName: "Test University",
        regNumber: "H150123A",
        claimedCents: 20_000,
        student: { firstName: "Test", lastName: "Learner" },
      });
      expect(t.bills.get(billId)?.status).toBe("PENDING_SCHOOL");
    });

    it.each(["", "garbage", "conf-1.bad", "conf-1"])("refuses the forged token %j", async (token) => {
      await submitted();

      expect(await t.service.viewConfirmation(token)).toEqual({ state: "INVALID" });
      expect(await t.service.respond(token, { decision: "CONFIRM" })).toBe(false);
    });

    it("refuses a token for a confirmation that doesn't exist", async () => {
      expect(await t.service.viewConfirmation(t.tokenFor("nope"))).toEqual({ state: "INVALID" });
    });

    it("expires", async () => {
      const { token, billId } = await submitted();
      t.advance(CONFIRMATION_TTL_MS);

      expect(await t.service.viewConfirmation(token)).toEqual({ state: "EXPIRED" });
      expect(await t.service.respond(token, { decision: "CONFIRM" })).toBe(false);
      expect(t.bills.get(billId)?.status).toBe("PENDING_SCHOOL");
    });

    it("stops working if the contact is removed", async () => {
      const { token } = await submitted();
      for (const contact of t.contacts.get("uni")!) contact.active = false;

      expect(await t.service.viewConfirmation(token)).toEqual({ state: "INVALID" });
      expect(await t.service.respond(token, { decision: "CONFIRM" })).toBe(false);
    });

    it("stops working if the school loses its verified status", async () => {
      const { token } = await submitted();
      t.schools[0]!.verified = false;

      expect(await t.service.respond(token, { decision: "CONFIRM" })).toBe(false);
    });
  });

  describe("responding", () => {
    it("confirms at the claimed amount", async () => {
      const { token, billId } = await submitted();

      expect(await t.service.respond(token, { decision: "CONFIRM" })).toBe(true);

      const bill = t.bills.get(billId)!;
      expect(bill.status).toBe("SCHOOL_CONFIRMED");
      expect(bill.confirmedCents).toBe(20_000);
    });

    it("uses the school's figure when it corrects the amount", async () => {
      const { token, billId } = await submitted();

      expect(await t.service.respond(token, { decision: "CORRECT", amountCents: 15_000 })).toBe(true);

      const bill = t.bills.get(billId)!;
      expect(bill.status).toBe("SCHOOL_CONFIRMED");
      expect(bill.confirmedCents).toBe(15_000);
      expect(bill.claimedCents).toBe(20_000);
      expect([...t.confirmations.values()].some((c) => c.status === "CORRECTED")).toBe(true);
    });

    it("counts a correction to the same figure as a confirmation", async () => {
      const { token } = await submitted();

      await t.service.respond(token, { decision: "CORRECT", amountCents: 20_000 });

      expect([...t.confirmations.values()].some((c) => c.status === "CONFIRMED")).toBe(true);
    });

    it("refuses a zero correction", async () => {
      const { token, billId } = await submitted();

      expect(await t.service.respond(token, { decision: "CORRECT", amountCents: 0 })).toBe(false);
      expect(t.bills.get(billId)?.status).toBe("PENDING_SCHOOL");
    });

    it("rejects with a reason the owner can act on", async () => {
      const { token, billId } = await submitted();

      expect(await t.service.respond(token, { decision: "REJECT" })).toBe(true);

      const bill = t.bills.get(billId)!;
      expect(bill.status).toBe("REJECTED");
      expect(bill.confirmedCents).toBeNull();
      expect(bill.closedReason).toBe(REJECTED_BY_SCHOOL_REASON);
    });

    it("works once only", async () => {
      const { token, billId } = await submitted();
      await t.service.respond(token, { decision: "CONFIRM" });

      expect(await t.service.respond(token, { decision: "REJECT" })).toBe(false);
      expect(await t.service.viewConfirmation(token)).toEqual({ state: "ANSWERED" });
      expect(t.bills.get(billId)?.status).toBe("SCHOOL_CONFIRMED");
    });

    it("lets the first bursar decide, closing the other's link", async () => {
      const { billId } = await submitted();
      const [first, second] = t.confirmationIds().map(t.tokenFor);

      await t.service.respond(first!, { decision: "CORRECT", amountCents: 15_000 });

      expect(await t.service.respond(second!, { decision: "CONFIRM" })).toBe(false);
      expect(await t.service.viewConfirmation(second!)).toEqual({ state: "ANSWERED" });
      expect(t.bills.get(billId)?.confirmedCents).toBe(15_000);
    });

    it("closes links when the owner withdraws", async () => {
      const { token, billId } = await submitted();
      await t.service.withdraw(STUDENT.id, billId);

      expect(await t.service.respond(token, { decision: "CONFIRM" })).toBe(false);
    });

    it("records which contact answered", async () => {
      const { token } = await submitted();
      await t.service.respond(token, { decision: "CONFIRM" });

      expect(t.events.some((e) => e.startsWith("confirmation.CONFIRMED:bursar-"))).toBe(true);
    });
  });

  describe("owners", () => {
    it("only see their own bills", async () => {
      const { billId } = await submitted();

      expect(await t.service.findForOwner(STUDENT.id, billId)).not.toBeNull();
      expect(await t.service.findForOwner(GUARDIAN.id, billId)).toBeNull();
      expect(await t.service.listForOwner(GUARDIAN.id)).toEqual([]);
    });

    it("can withdraw while nothing has been funded", async () => {
      const { billId } = await submitted();

      expect(await t.service.withdraw(STUDENT.id, billId)).toEqual({ ok: true });
      expect(t.bills.get(billId)?.status).toBe("CANCELLED");
    });

    it("can withdraw a confirmed bill", async () => {
      const { billId, token } = await submitted();
      await t.service.respond(token, { decision: "CONFIRM" });

      expect(await t.service.withdraw(STUDENT.id, billId)).toEqual({ ok: true });
    });

    it("cannot withdraw someone else's bill", async () => {
      const { billId } = await submitted();

      expect(await t.service.withdraw(GUARDIAN.id, billId)).toEqual({ ok: false, error: "NOT_FOUND" });
      expect(t.bills.get(billId)?.status).toBe("PENDING_SCHOOL");
    });

    it("cannot withdraw a bill with money on it", async () => {
      const { billId } = await submitted();
      t.bills.get(billId)!.status = "PARTIALLY_FUNDED";

      expect(await t.service.withdraw(STUDENT.id, billId)).toEqual({ ok: false, error: "CANNOT_CHANGE" });
    });

    it("can submit again for the term after withdrawing", async () => {
      const { billId } = await submitted();
      await t.service.withdraw(STUDENT.id, billId);

      expect((await t.service.submit(STUDENT, input())).ok).toBe(true);
    });
  });

  describe("admins", () => {
    it("can reject with a reason the owner sees", async () => {
      const { billId } = await submitted();

      expect(await t.service.rejectAsAdmin(billId, "admin-1", "Statement is unreadable")).toEqual({ ok: true });

      const bill = t.bills.get(billId)!;
      expect(bill.status).toBe("REJECTED");
      expect(bill.closedReason).toBe("Statement is unreadable");
      expect(t.events).toContain("bill.closed:REJECTED:admin-1");
    });

    it("cannot reject once money is involved", async () => {
      const { billId } = await submitted();
      t.bills.get(billId)!.status = "FUNDED";

      expect(await t.service.rejectAsAdmin(billId, "admin-1", "reason")).toEqual({ ok: false, error: "CANNOT_CHANGE" });
    });

    it("see delivery status for each contact", async () => {
      const result = await t.service.submit(STUDENT, input());
      t.failSendsTo("+263771000011");
      await t.service.sendConfirmationLinks((result as { id: string }).id);

      const bill = await t.service.findForAdmin((result as { id: string }).id);

      expect(bill?.confirmations.map((c) => [c.contactName, c.sentAt !== null])).toEqual([
        ["First Bursar", false],
        ["Second Bursar", true],
      ]);
    });

    it("are recorded when they read a statement", async () => {
      const statement = pdf("statement");
      const result = await t.service.submit(STUDENT, input({ statement }));
      const id = (result as { id: string }).id;

      const read = await t.service.readStatementForAdmin(id, "admin-1");

      expect(read).toEqual({ bytes: statement, mimeType: "application/pdf" });
      expect(t.events).toContain(`statement.viewed:${id}:admin-1`);
    });

    it("get nothing for an unknown bill", async () => {
      expect(await t.service.readStatementForAdmin("nope", "admin-1")).toBeNull();
      expect(await t.service.findForAdmin("nope")).toBeNull();
    });
  });
});

import { createHash } from "node:crypto";
import type { DocumentFiles } from "../../../lib/encrypted-file-store";
import {
  MAX_DOCUMENT_BYTES,
  detectDocumentType,
} from "../../identity/domain/verification";
import {
  REJECTED_BY_SCHOOL_REASON,
  isValidRegNumber,
  isValidTerm,
  normalizeRegNumber,
  schoolTypesFor,
} from "../domain/bill";
import {
  checkTransition,
  fundingPosition,
  type BillActor,
  type BillStatus,
} from "../domain/bill-status";
import type { BillerType } from "../domain/biller";
import {
  CONFIRMATION_TTL_MS,
  confirmationMessage,
  readConfirmationToken,
  signConfirmationToken,
} from "../domain/confirmation-token";
import {
  PUBLIC_STATUSES,
  applyFeedFilter,
  initialsOf,
  isOpenForDonations,
  isPublicStatus,
  type FeedFilter,
  type PublicBill,
} from "../domain/public-bill";

export type BillOwner = { id: string; role: "STUDENT" | "GUARDIAN" };

export type BillRecord = {
  id: string;
  ownerId: string;
  studentId: string;
  billerId: string;
  billerName: string;
  billerType: BillerType;
  billerCity: string;
  regNumber: string;
  term: string;
  claimedCents: number;
  confirmedCents: number | null;
  /** Settled donations, excluding tips and fees, as last synced from the ledger. */
  raisedCents: number;
  dueDate: Date;
  documentKey: string;
  status: BillStatus;
  closedReason: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  fundedAt: Date | null;
};

/** What a funding sync writes back to the bill. */
export type FundingUpdate = {
  raisedCents: number;
  status: BillStatus;
  fundedAt: Date | null;
};

export type FundingSync =
  | { ok: false; error: "NOT_FOUND" }
  | {
      ok: true;
      status: BillStatus;
      raisedCents: number;
      /** Money beyond the confirmed amount, or on a bill that can no longer take it. */
      surplusCents: number;
    };

export type SiteStats = {
  raisedCents: number;
  studentsSupported: number;
  verifiedSchools: number;
};

export type SchoolOption = {
  id: string;
  name: string;
  type: BillerType;
  city: string;
};

export type ConfirmationSummary = {
  id: string;
  contactName: string;
  status: "PENDING" | "CONFIRMED" | "CORRECTED" | "REJECTED" | "RECEIPT";
  expiresAt: Date;
  sentAt: Date | null;
  respondedAt: Date | null;
};

export type ConfirmationRecord = {
  id: string;
  status: ConfirmationSummary["status"];
  expiresAt: Date;
  contactId: string;
  contactName: string;
  contactIsActive: boolean;
  billerVerified: boolean;
  bill: BillRecord;
};

export type NewBill = {
  ownerId: string;
  studentId: string;
  billerId: string;
  regNumber: string;
  term: string;
  claimedCents: number;
  dueDate: Date;
  documentKey: string;
  documentHash: string;
  status: BillStatus;
};

export type BillConflict =
  | "DUPLICATE_BILL"
  | "OPEN_BILL_FOR_TERM"
  | "DUPLICATE_DOCUMENT";

/** Every change records who made it in the audit log, in the same transaction. */
export type BillStore = {
  listVerifiedSchools(): Promise<SchoolOption[]>;
  findSchool(id: string): Promise<(SchoolOption & { verified: boolean }) | null>;
  findConflict(bill: NewBill): Promise<BillConflict | null>;
  /** Null if a database uniqueness rule stopped it, such as a double submit. */
  create(bill: NewBill): Promise<{ id: string } | null>;
  find(id: string): Promise<BillRecord | null>;
  listForOwner(ownerId: string): Promise<BillRecord[]>;
  listAll(): Promise<BillRecord[]>;
  listByStatus(statuses: readonly BillStatus[]): Promise<BillRecord[]>;
  findMany(ids: readonly string[]): Promise<BillRecord[]>;
  /**
   * Locks the bill row, hands the locked bill to `decide`, and writes what it
   * returns in the same transaction. Two syncs for one bill run one after the
   * other, so the later one always sees the newer ledger total.
   */
  updateFunding(
    id: string,
    decide: (bill: BillRecord) => Promise<FundingUpdate>,
  ): Promise<{ before: BillRecord; after: FundingUpdate } | null>;
  stats(publicStatuses: readonly BillStatus[]): Promise<SiteStats>;
  /** Only applies if the bill is still in `from`. False if it has moved on. */
  close(
    id: string,
    from: BillStatus,
    to: BillStatus,
    actorId: string,
    reason: string | null,
  ): Promise<boolean>;
  listVerifiedContacts(
    billerId: string,
  ): Promise<Array<{ id: string; phone: string }>>;
  listConfirmations(billId: string): Promise<ConfirmationSummary[]>;
  findPendingConfirmationId(
    billId: string,
    contactId: string,
  ): Promise<string | null>;
  createConfirmation(
    billId: string,
    contactId: string,
    expiresAt: Date,
  ): Promise<string>;
  extendConfirmation(id: string, expiresAt: Date): Promise<void>;
  markConfirmationSent(id: string, at: Date): Promise<void>;
  findConfirmation(id: string): Promise<ConfirmationRecord | null>;
  recordConfirmationView(id: string, contactId: string): Promise<void>;
  /**
   * Conditional on the confirmation still being pending and the bill still
   * waiting, so two bursars answering at once can't both succeed.
   */
  recordResponse(response: {
    confirmationId: string;
    contactId: string;
    billId: string;
    status: "CONFIRMED" | "CORRECTED" | "REJECTED";
    billStatus: "SCHOOL_CONFIRMED" | "REJECTED";
    confirmedCents: number | null;
    closedReason: string | null;
    at: Date;
  }): Promise<boolean>;
  recordStatementView(billId: string, viewerId: string): Promise<void>;
};

/** What billing needs from the identity module. */
export type StudentDirectory = {
  /** The student on this account, and whether the account has been verified. */
  findForOwner(
    ownerId: string,
  ): Promise<{ id: string; ownerVerified: boolean } | null>;
  findStudent(
    studentId: string,
  ): Promise<{ firstName: string; lastName: string; level: string } | null>;
  findStudents(
    studentIds: readonly string[],
  ): Promise<
    Array<{ id: string; firstName: string; lastName: string; level: string }>
  >;
};

/** What billing needs from the payments module: the truth about money received. */
export type FundingLedger = {
  /** Sum of settled, unrefunded donations to the bill, excluding tips and fees. */
  settledTotal(billId: string): Promise<number>;
};

export type BillError =
  | "NOT_VERIFIED"
  | "SCHOOL_NOT_AVAILABLE"
  | "INVALID_REG_NUMBER"
  | "INVALID_TERM"
  | "DUE_DATE_PASSED"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | BillConflict
  | "NOT_FOUND"
  | "CANNOT_CHANGE";

export const BILL_ERROR_MESSAGES: Record<BillError, string> = {
  NOT_VERIFIED: "Your account needs to be verified before you can submit a bill.",
  SCHOOL_NOT_AVAILABLE: "Please choose a school from the list.",
  INVALID_REG_NUMBER: "Please check the reg number.",
  INVALID_TERM: "Please choose a term from the list.",
  DUE_DATE_PASSED: "The due date has already passed. Please enter the current one.",
  EMPTY_FILE: "That file is empty. Please choose another.",
  FILE_TOO_LARGE: "That file is over 5 MB. Please upload a smaller copy.",
  UNSUPPORTED_FILE_TYPE: "Please upload a PDF, JPEG or PNG file.",
  DUPLICATE_BILL:
    "A bill for this reg number and term already exists at this school. If that's a mistake, please contact support.",
  OPEN_BILL_FOR_TERM: "This student already has an open bill for that term.",
  DUPLICATE_DOCUMENT:
    "This fee statement has already been used on another bill. If that's a mistake, please contact support.",
  NOT_FOUND: "That bill no longer exists.",
  CANNOT_CHANGE: "This bill can't be changed now.",
};

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; error: BillError };
export type BillResult = { ok: true } | { ok: false; error: BillError };

export type ConfirmationView =
  | { state: "INVALID" | "EXPIRED" | "ANSWERED" }
  | {
      state: "OPEN";
      schoolName: string;
      contactName: string;
      student: { firstName: string; lastName: string; level: string };
      regNumber: string;
      term: string;
      claimedCents: number;
    };

export type ConfirmationDecision =
  | { decision: "CONFIRM" }
  | { decision: "CORRECT"; amountCents: number }
  | { decision: "REJECT" };

const fail = (error: BillError) => ({ ok: false as const, error });

export function createBillService(deps: {
  store: BillStore;
  students: StudentDirectory;
  files: DocumentFiles;
  ledger: FundingLedger;
  messages: { sendText(phone: string, text: string): Promise<void> };
  tokenSecret: string;
  baseUrl: string;
  now?: () => Date;
  log?: (message: string) => void;
  /**
   * Called once when a bill becomes fully funded, after the change is saved, to
   * tell its donors and owner. A failure here is logged, never undone.
   */
  onFunded?: (bill: { id: string; ownerId: string }) => Promise<void>;
}) {
  const { store, students, files, ledger, messages, tokenSecret, baseUrl } = deps;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? console.error;

  const contextFor = (
    bill: BillRecord,
    confirmedCents = bill.confirmedCents,
    settledCents = bill.raisedCents,
  ) => ({
    confirmedCents,
    settledCents,
    hasPayoutProof: false,
    dueDate: bill.dueDate,
    now: now(),
  });

  async function resolveOpenConfirmation(token: string) {
    const id = readConfirmationToken(tokenSecret, token);
    if (!id) return { state: "INVALID" as const };

    const confirmation = await store.findConfirmation(id);
    if (
      !confirmation ||
      !confirmation.contactIsActive ||
      !confirmation.billerVerified
    ) {
      return { state: "INVALID" as const };
    }
    if (
      confirmation.status !== "PENDING" ||
      confirmation.bill.status !== "PENDING_SCHOOL"
    ) {
      return { state: "ANSWERED" as const };
    }
    if (confirmation.expiresAt <= now()) return { state: "EXPIRED" as const };
    return { state: "OPEN" as const, confirmation };
  }

  async function close(
    bill: BillRecord,
    to: BillStatus,
    actor: BillActor,
    actorId: string,
    reason: string | null,
  ): Promise<BillResult> {
    const check = checkTransition(bill.status, to, actor, contextFor(bill));
    if (!check.ok) return fail("CANNOT_CHANGE");
    return (await store.close(bill.id, bill.status, to, actorId, reason))
      ? { ok: true }
      : fail("CANNOT_CHANGE");
  }

  async function toPublic(bills: BillRecord[]): Promise<PublicBill[]> {
    const shown = bills.filter(
      (bill) => isPublicStatus(bill.status) && bill.confirmedCents !== null,
    );
    if (shown.length === 0) return [];
    const people = new Map(
      (await students.findStudents([...new Set(shown.map((b) => b.studentId))])).map(
        (student) => [student.id, student],
      ),
    );
    return shown.flatMap((bill) => {
      const student = people.get(bill.studentId);
      if (!student || !isPublicStatus(bill.status) || bill.confirmedCents === null) {
        return [];
      }
      return [
        {
          id: bill.id,
          schoolId: bill.billerId,
          schoolName: bill.billerName,
          schoolType: bill.billerType,
          city: bill.billerCity,
          term: bill.term,
          studentInitials: initialsOf(student.firstName, student.lastName),
          studentLevel: student.level,
          confirmedCents: bill.confirmedCents,
          raisedCents: bill.raisedCents,
          dueDate: bill.dueDate,
          status: bill.status,
          createdAt: bill.createdAt,
          confirmedAt: bill.confirmedAt,
          fundedAt: bill.fundedAt,
        },
      ];
    });
  }

  async function findPublic(billId: string): Promise<PublicBill | null> {
    const bill = await store.find(billId);
    return bill ? ((await toPublic([bill]))[0] ?? null) : null;
  }

  return {
    // ------------------------------------------------------------ public views

    /** Bills open for donations, for the public feed. */
    async listOpen(filter: FeedFilter): Promise<PublicBill[]> {
      const bills = await store.listByStatus(["SCHOOL_CONFIRMED", "PARTIALLY_FUNDED"]);
      return applyFeedFilter(await toPublic(bills), filter, now());
    },

    /** Null unless the school has confirmed the bill, so nothing unconfirmed leaks. */
    findPublic,

    /** Bills that reached their full amount since a moment, most recent first. */
    async listRecentlyFunded(since: Date): Promise<PublicBill[]> {
      const bills = await store.listByStatus(["FUNDED", "PAID", "RECEIPT_CONFIRMED"]);
      const recent = bills.filter((bill) => bill.fundedAt && bill.fundedAt >= since);
      return (await toPublic(recent)).sort(
        (a, b) => (b.fundedAt?.getTime() ?? 0) - (a.fundedAt?.getTime() ?? 0),
      );
    },

    async findPublicMany(billIds: readonly string[]): Promise<PublicBill[]> {
      if (billIds.length === 0) return [];
      return toPublic(await store.findMany(billIds));
    },

    listVerifiedSchools: () => store.listVerifiedSchools(),

    stats: () => store.stats(PUBLIC_STATUSES),

    // ---------------------------------------------------------------- funding

    /** What payments checks a donation against. Null if the bill isn't public. */
    async fundingFor(billId: string) {
      const bill = await findPublic(billId);
      if (!bill) return null;
      return {
        id: bill.id,
        schoolName: bill.schoolName,
        term: bill.term,
        confirmedCents: bill.confirmedCents,
        raisedCents: bill.raisedCents,
        isOpen: isOpenForDonations(bill, now()),
      };
    },

    /**
     * Brings the bill in line with the payments ledger: its raised total, and its
     * funding status where the status rules allow. Safe to call any number of
     * times, from any number of places at once.
     */
    async syncFunding(billId: string): Promise<FundingSync> {
      const result = await store.updateFunding(billId, async (bill) => {
        const settled = await ledger.settledTotal(billId);
        const isFundingStage =
          bill.status === "SCHOOL_CONFIRMED" ||
          bill.status === "PARTIALLY_FUNDED" ||
          bill.status === "FUNDED";
        if (!isFundingStage || bill.confirmedCents === null) {
          return { raisedCents: settled, status: bill.status, fundedAt: bill.fundedAt };
        }

        const target = fundingPosition(bill.confirmedCents, settled).status;
        const allowed =
          target === bill.status ||
          checkTransition(
            bill.status,
            target,
            "SYSTEM",
            contextFor(bill, bill.confirmedCents, settled),
          ).ok;
        const status = allowed ? target : bill.status;
        return {
          raisedCents: settled,
          status,
          fundedAt: status === "FUNDED" ? (bill.fundedAt ?? now()) : null,
        };
      });
      if (!result) return { ok: false, error: "NOT_FOUND" };

      const { before, after } = result;
      // Money on a bill that closed without reaching the school must all go back.
      const isClosed =
        after.status === "REJECTED" ||
        after.status === "CANCELLED" ||
        after.status === "EXPIRED";
      const surplusCents = isClosed
        ? after.raisedCents
        : Math.max(after.raisedCents - (before.confirmedCents ?? 0), 0);
      if (surplusCents > 0) {
        log(`Bill ${billId}: ${surplusCents} cents received beyond what it can take`);
      }
      if (before.status !== "FUNDED" && after.status === "FUNDED" && deps.onFunded) {
        try {
          await deps.onFunded({ id: billId, ownerId: before.ownerId });
        } catch (error) {
          log(
            `Bill ${billId}: funded, but telling people failed: ${
              error instanceof Error ? error.message : "unknown error"
            }`,
          );
        }
      }
      return {
        ok: true,
        status: after.status,
        raisedCents: after.raisedCents,
        surplusCents,
      };
    },

    // ----------------------------------------------------------------- owners

    async schoolsFor(owner: BillOwner): Promise<SchoolOption[]> {
      const types = schoolTypesFor(owner.role);
      const schools = await store.listVerifiedSchools();
      return schools.filter((school) => types.includes(school.type));
    },

    async canSubmit(owner: BillOwner): Promise<boolean> {
      const student = await students.findForOwner(owner.id);
      return student?.ownerVerified === true;
    },

    async submit(
      owner: BillOwner,
      input: {
        billerId: string;
        regNumber: string;
        term: string;
        claimedCents: number;
        dueDate: Date;
        statement: Uint8Array;
      },
    ): Promise<SubmitResult> {
      const student = await students.findForOwner(owner.id);
      if (!student?.ownerVerified) return fail("NOT_VERIFIED");

      const school = await store.findSchool(input.billerId);
      if (!school?.verified || !schoolTypesFor(owner.role).includes(school.type)) {
        return fail("SCHOOL_NOT_AVAILABLE");
      }

      const regNumber = normalizeRegNumber(input.regNumber);
      if (!isValidRegNumber(regNumber)) return fail("INVALID_REG_NUMBER");
      if (!isValidTerm(input.term)) return fail("INVALID_TERM");

      if (input.statement.length === 0) return fail("EMPTY_FILE");
      if (input.statement.length > MAX_DOCUMENT_BYTES) return fail("FILE_TOO_LARGE");
      if (!detectDocumentType(input.statement)) return fail("UNSUPPORTED_FILE_TYPE");

      const check = checkTransition("DRAFT", "PENDING_SCHOOL", "OWNER", {
        confirmedCents: null,
        settledCents: 0,
        hasPayoutProof: false,
        dueDate: input.dueDate,
        now: now(),
      });
      if (!check.ok) return fail("DUE_DATE_PASSED");

      const bill: Omit<NewBill, "documentKey"> = {
        ownerId: owner.id,
        studentId: student.id,
        billerId: school.id,
        regNumber,
        term: input.term,
        claimedCents: input.claimedCents,
        dueDate: input.dueDate,
        documentHash: createHash("sha256").update(input.statement).digest("hex"),
        status: "PENDING_SCHOOL",
      };

      const conflict = await store.findConflict({ ...bill, documentKey: "" });
      if (conflict) return fail(conflict);

      const documentKey = await files.put(input.statement);
      const created = await store.create({ ...bill, documentKey });
      if (!created) {
        await files.delete(documentKey);
        return fail("DUPLICATE_BILL");
      }
      return { ok: true, id: created.id };
    },

    /**
     * Sends each verified contact a link, and extends any still open. Whichever
     * contact answers first decides. Never throws: a failed send is logged and
     * shown to admins, who can send again.
     */
    async sendConfirmationLinks(
      billId: string,
    ): Promise<{ sent: number; failed: number }> {
      const bill = await store.find(billId);
      if (bill?.status !== "PENDING_SCHOOL") return { sent: 0, failed: 0 };

      const contacts = await store.listVerifiedContacts(bill.billerId);
      if (contacts.length === 0) {
        log(`Bill ${billId}: the school has no verified contact to confirm it`);
      }

      const expiresAt = new Date(now().getTime() + CONFIRMATION_TTL_MS);
      let sent = 0;
      let failed = 0;

      for (const contact of contacts) {
        try {
          const existing = await store.findPendingConfirmationId(billId, contact.id);
          const id =
            existing ??
            (await store.createConfirmation(billId, contact.id, expiresAt));
          if (existing) await store.extendConfirmation(existing, expiresAt);

          const token = signConfirmationToken(tokenSecret, id);
          await messages.sendText(
            contact.phone,
            confirmationMessage(bill.billerName, `${baseUrl}/confirm/${token}`),
          );
          await store.markConfirmationSent(id, now());
          sent += 1;
        } catch (error) {
          failed += 1;
          // The error is logged by name only, as a message could hold the link.
          log(
            `Bill ${billId}: could not send a confirmation link to contact ${contact.id}: ${
              error instanceof Error ? error.name : "unknown error"
            }`,
          );
        }
      }
      return { sent, failed };
    },

    /** Looking at the link changes nothing, as apps may fetch links by themselves. */
    async viewConfirmation(token: string): Promise<ConfirmationView> {
      const resolved = await resolveOpenConfirmation(token);
      if (resolved.state !== "OPEN") return resolved;

      const { confirmation } = resolved;
      const student = await students.findStudent(confirmation.bill.studentId);
      if (!student) return { state: "INVALID" };

      await store.recordConfirmationView(confirmation.id, confirmation.contactId);
      return {
        state: "OPEN",
        schoolName: confirmation.bill.billerName,
        contactName: confirmation.contactName,
        student,
        regNumber: confirmation.bill.regNumber,
        term: confirmation.bill.term,
        claimedCents: confirmation.bill.claimedCents,
      };
    },

    /** False if the link is no longer open, or someone answered first. */
    async respond(
      token: string,
      decision: ConfirmationDecision,
    ): Promise<boolean> {
      const resolved = await resolveOpenConfirmation(token);
      if (resolved.state !== "OPEN") return false;

      const { confirmation } = resolved;
      const { bill } = confirmation;

      const confirmedCents =
        decision.decision === "CONFIRM"
          ? bill.claimedCents
          : decision.decision === "CORRECT"
            ? decision.amountCents
            : null;
      const billStatus =
        decision.decision === "REJECT" ? "REJECTED" : "SCHOOL_CONFIRMED";

      const check = checkTransition(
        bill.status,
        billStatus,
        "SCHOOL",
        contextFor(bill, confirmedCents),
      );
      if (!check.ok) return false;

      const status =
        decision.decision === "REJECT"
          ? "REJECTED"
          : confirmedCents === bill.claimedCents
            ? "CONFIRMED"
            : "CORRECTED";

      return store.recordResponse({
        confirmationId: confirmation.id,
        contactId: confirmation.contactId,
        billId: bill.id,
        status,
        billStatus,
        confirmedCents,
        closedReason:
          decision.decision === "REJECT" ? REJECTED_BY_SCHOOL_REASON : null,
        at: now(),
      });
    },

    listForOwner: (ownerId: string) => store.listForOwner(ownerId),

    /** Null for anyone else's bill, so ids can't be probed. */
    async findForOwner(ownerId: string, billId: string) {
      const bill = await store.find(billId);
      return bill?.ownerId === ownerId ? bill : null;
    },

    async withdraw(ownerId: string, billId: string): Promise<BillResult> {
      const bill = await store.find(billId);
      if (bill?.ownerId !== ownerId) return fail("NOT_FOUND");
      return close(bill, "CANCELLED", "OWNER", ownerId, null);
    },

    listAll: () => store.listAll(),

    async findForAdmin(billId: string) {
      const bill = await store.find(billId);
      if (!bill) return null;
      const [student, confirmations] = await Promise.all([
        students.findStudent(bill.studentId),
        store.listConfirmations(billId),
      ]);
      return { ...bill, student, confirmations };
    },

    async rejectAsAdmin(
      billId: string,
      adminId: string,
      reason: string,
    ): Promise<BillResult> {
      const bill = await store.find(billId);
      if (!bill) return fail("NOT_FOUND");
      return close(bill, "REJECTED", "ADMIN", adminId, reason);
    },

    /** Records the view before returning anything, so no read goes unlogged. */
    async readStatementForAdmin(billId: string, viewerId: string) {
      const bill = await store.find(billId);
      if (!bill) return null;
      await store.recordStatementView(billId, viewerId);
      const bytes = await files.get(bill.documentKey);
      return { bytes, mimeType: detectDocumentType(bytes) };
    },
  };
}

export type BillService = ReturnType<typeof createBillService>;

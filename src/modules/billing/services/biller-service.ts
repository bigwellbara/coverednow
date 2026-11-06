import {
  describePayout,
  verificationBlockers,
  type BillerDetails,
  type ContactDetails,
  type PayoutDetails,
  type PayoutMethod,
} from "../domain/biller";

export type EncryptedPayout = { iv: string; tag: string; data: string };

export type PayoutCipher = {
  encrypt(billerId: string, details: PayoutDetails): EncryptedPayout;
  decrypt(billerId: string, encrypted: EncryptedPayout): PayoutDetails;
};

export type ContactRecord = {
  id: string;
  billerId: string;
  name: string;
  phone: string;
  email: string | null;
  roleTitle: string;
  verifiedAt: Date | null;
  verificationNote: string | null;
  removedAt: Date | null;
};

export type BillerSummary = BillerDetails & {
  id: string;
  verified: boolean;
  hasPayoutDetails: boolean;
  verifiedContacts: number;
};

export type BillerRecord = BillerDetails & {
  id: string;
  verified: boolean;
  payoutDetails: EncryptedPayout | null;
  /** Current contacts only. Removed ones are kept in the database for history. */
  contacts: ContactRecord[];
};

/**
 * Every write records who made it in the audit log, in the same transaction.
 * Audit entries never contain payout details.
 */
export type BillerStore = {
  list(): Promise<BillerSummary[]>;
  find(id: string): Promise<BillerRecord | null>;
  findContact(id: string): Promise<ContactRecord | null>;
  create(details: BillerDetails, actorId: string): Promise<string>;
  update(id: string, details: BillerDetails, actorId: string): Promise<void>;
  /** Also clears the school's verified status, which must be earned again. */
  savePayout(
    id: string,
    method: PayoutMethod,
    encrypted: EncryptedPayout,
    actorId: string,
  ): Promise<void>;
  addContact(
    billerId: string,
    contact: ContactDetails,
    actorId: string,
  ): Promise<void>;
  verifyContact(
    contactId: string,
    note: string,
    actorId: string,
    at: Date,
  ): Promise<void>;
  /** Also clears the school's verified status if no verified contact remains. */
  removeContact(contactId: string, actorId: string, at: Date): Promise<void>;
  setVerified(id: string, verified: boolean, actorId: string): Promise<void>;
};

export type BillerError =
  | "NOT_FOUND"
  | "PAYOUT_DETAILS_MISSING"
  | "VERIFIED_CONTACT_MISSING";

export const BILLER_ERROR_MESSAGES: Record<BillerError, string> = {
  NOT_FOUND: "That record no longer exists.",
  PAYOUT_DETAILS_MISSING: "Add payout details before verifying this school.",
  VERIFIED_CONTACT_MISSING:
    "Verify at least one contact before verifying this school.",
};

export type BillerResult = { ok: true } | { ok: false; error: BillerError };

const OK: BillerResult = { ok: true };
const fail = (error: BillerError): BillerResult => ({ ok: false, error });

export function createBillerService(deps: {
  store: BillerStore;
  cipher: PayoutCipher;
  now?: () => Date;
}) {
  const { store, cipher } = deps;
  const now = deps.now ?? (() => new Date());

  async function findActiveContact(contactId: string) {
    const contact = await store.findContact(contactId);
    return contact && !contact.removedAt ? contact : null;
  }

  return {
    list: () => store.list(),

    /** Payout details only ever leave here masked. */
    async getForAdmin(id: string) {
      const biller = await store.find(id);
      if (!biller) return null;
      const { payoutDetails, ...rest } = biller;
      return {
        ...rest,
        hasPayoutDetails: payoutDetails !== null,
        payoutSummary: payoutDetails
          ? describePayout(cipher.decrypt(id, payoutDetails))
          : null,
        blockers: verificationBlockers({
          hasPayoutDetails: payoutDetails !== null,
          verifiedContacts: rest.contacts.filter((c) => c.verifiedAt).length,
        }),
      };
    },

    create: (details: BillerDetails, actorId: string) =>
      store.create(details, actorId),

    async update(
      id: string,
      details: BillerDetails,
      actorId: string,
    ): Promise<BillerResult> {
      if (!(await store.find(id))) return fail("NOT_FOUND");
      await store.update(id, details, actorId);
      return OK;
    },

    async savePayout(
      id: string,
      details: PayoutDetails,
      actorId: string,
    ): Promise<BillerResult> {
      if (!(await store.find(id))) return fail("NOT_FOUND");
      await store.savePayout(
        id,
        details.method,
        cipher.encrypt(id, details),
        actorId,
      );
      return OK;
    },

    async addContact(
      billerId: string,
      contact: ContactDetails,
      actorId: string,
    ): Promise<BillerResult> {
      if (!(await store.find(billerId))) return fail("NOT_FOUND");
      await store.addContact(billerId, contact, actorId);
      return OK;
    },

    async verifyContact(
      contactId: string,
      note: string,
      actorId: string,
    ): Promise<BillerResult> {
      if (!(await findActiveContact(contactId))) return fail("NOT_FOUND");
      await store.verifyContact(contactId, note, actorId, now());
      return OK;
    },

    async removeContact(
      contactId: string,
      actorId: string,
    ): Promise<BillerResult> {
      if (!(await findActiveContact(contactId))) return fail("NOT_FOUND");
      await store.removeContact(contactId, actorId, now());
      return OK;
    },

    async verify(id: string, actorId: string): Promise<BillerResult> {
      const biller = await store.find(id);
      if (!biller) return fail("NOT_FOUND");

      const [blocker] = verificationBlockers({
        hasPayoutDetails: biller.payoutDetails !== null,
        verifiedContacts: biller.contacts.filter((c) => c.verifiedAt).length,
      });
      if (blocker) return fail(blocker);

      await store.setVerified(id, true, actorId);
      return OK;
    },

    async unverify(id: string, actorId: string): Promise<BillerResult> {
      if (!(await store.find(id))) return fail("NOT_FOUND");
      await store.setVerified(id, false, actorId);
      return OK;
    },
  };
}

export type BillerService = ReturnType<typeof createBillerService>;

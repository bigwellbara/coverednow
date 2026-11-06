import { BillStatus as PrismaBillStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  BILL_STATUSES,
  acceptsDonations,
  checkTransition,
  countsTowardLeaderboards,
  fundingPosition,
  type BillActor,
  type BillContext,
  type BillStatus,
} from "./bill-status";

const ACTORS: readonly BillActor[] = ["OWNER", "SCHOOL", "ADMIN", "SYSTEM"];

const DUE = new Date("2027-01-31T21:59:59Z");
const BEFORE_DUE = new Date("2027-01-01T00:00:00Z");
const AFTER_DUE = new Date("2027-02-01T00:00:00Z");

const context = (overrides: Partial<BillContext> = {}): BillContext => ({
  confirmedCents: 20_000,
  settledCents: 0,
  hasPayoutProof: false,
  dueDate: DUE,
  now: BEFORE_DUE,
  ...overrides,
});

/**
 * The full permission table, written out separately from the implementation so
 * that an accidental change to either one fails the matrix test below.
 */
const EXPECTED: ReadonlyArray<[BillStatus, BillStatus, readonly BillActor[]]> = [
  ["DRAFT", "PENDING_SCHOOL", ["OWNER"]],
  ["DRAFT", "CANCELLED", ["OWNER", "ADMIN"]],
  ["PENDING_SCHOOL", "SCHOOL_CONFIRMED", ["SCHOOL"]],
  ["PENDING_SCHOOL", "REJECTED", ["SCHOOL", "ADMIN"]],
  ["PENDING_SCHOOL", "EXPIRED", ["SYSTEM"]],
  ["PENDING_SCHOOL", "CANCELLED", ["OWNER", "ADMIN"]],
  ["SCHOOL_CONFIRMED", "PARTIALLY_FUNDED", ["SYSTEM"]],
  ["SCHOOL_CONFIRMED", "FUNDED", ["SYSTEM"]],
  ["SCHOOL_CONFIRMED", "REJECTED", ["ADMIN"]],
  ["SCHOOL_CONFIRMED", "EXPIRED", ["SYSTEM"]],
  ["SCHOOL_CONFIRMED", "CANCELLED", ["OWNER", "ADMIN"]],
  ["SCHOOL_CONFIRMED", "DISPUTED", ["ADMIN"]],
  ["PARTIALLY_FUNDED", "SCHOOL_CONFIRMED", ["SYSTEM"]],
  ["PARTIALLY_FUNDED", "FUNDED", ["SYSTEM"]],
  ["PARTIALLY_FUNDED", "DISPUTED", ["ADMIN"]],
  ["FUNDED", "SCHOOL_CONFIRMED", ["SYSTEM"]],
  ["FUNDED", "PARTIALLY_FUNDED", ["SYSTEM"]],
  ["FUNDED", "PAID", ["ADMIN"]],
  ["FUNDED", "DISPUTED", ["ADMIN"]],
  ["PAID", "RECEIPT_CONFIRMED", ["SCHOOL"]],
  ["PAID", "DISPUTED", ["SCHOOL", "ADMIN"]],
  ["EXPIRED", "PENDING_SCHOOL", ["OWNER", "ADMIN"]],
  ["DISPUTED", "SCHOOL_CONFIRMED", ["ADMIN"]],
  ["DISPUTED", "PARTIALLY_FUNDED", ["ADMIN"]],
  ["DISPUTED", "FUNDED", ["ADMIN"]],
  ["DISPUTED", "PAID", ["ADMIN"]],
  ["DISPUTED", "REJECTED", ["ADMIN"]],
  ["DISPUTED", "CANCELLED", ["ADMIN"]],
];

describe("BILL_STATUSES", () => {
  it("matches the BillStatus enum in the Prisma schema", () => {
    expect([...BILL_STATUSES].sort()).toEqual(
      Object.values(PrismaBillStatus).sort(),
    );
  });
});

describe("transition permissions", () => {
  // Denials from guards are ignored here: this only checks who may attempt what.
  const permissionOutcome = (
    from: BillStatus,
    to: BillStatus,
    actor: BillActor,
  ) => {
    const result = checkTransition(from, to, actor, context());
    if (result.ok) return "permitted";
    return result.reason === "ILLEGAL_TRANSITION" ||
      result.reason === "ACTOR_NOT_ALLOWED"
      ? result.reason
      : "permitted";
  };

  for (const from of BILL_STATUSES) {
    for (const to of BILL_STATUSES) {
      const rule = EXPECTED.find(([f, t]) => f === from && t === to);

      it(`${from} -> ${to}: ${rule ? rule[2].join(", ") : "illegal"}`, () => {
        for (const actor of ACTORS) {
          const expected = !rule
            ? "ILLEGAL_TRANSITION"
            : rule[2].includes(actor)
              ? "permitted"
              : "ACTOR_NOT_ALLOWED";
          expect(permissionOutcome(from, to, actor)).toBe(expected);
        }
      });
    }
  }
});

describe("the school controls the confirmed amount", () => {
  it("needs a positive amount to confirm", () => {
    for (const confirmedCents of [null, 0, -100]) {
      expect(
        checkTransition(
          "PENDING_SCHOOL",
          "SCHOOL_CONFIRMED",
          "SCHOOL",
          context({ confirmedCents }),
        ),
      ).toEqual({ ok: false, reason: "AMOUNT_NOT_CONFIRMED" });
    }
  });

  it.each(["OWNER", "ADMIN", "SYSTEM"] as const)(
    "does not let %s confirm a bill on the school's behalf",
    (actor) => {
      expect(
        checkTransition("PENDING_SCHOOL", "SCHOOL_CONFIRMED", actor, context()),
      ).toEqual({ ok: false, reason: "ACTOR_NOT_ALLOWED" });
    },
  );

  it.each(["OWNER", "ADMIN", "SYSTEM"] as const)(
    "does not let %s confirm receipt on the school's behalf",
    (actor) => {
      expect(
        checkTransition(
          "PAID",
          "RECEIPT_CONFIRMED",
          actor,
          context({ settledCents: 20_000, hasPayoutProof: true }),
        ),
      ).toEqual({ ok: false, reason: "ACTOR_NOT_ALLOWED" });
    },
  );
});

describe("funding guards", () => {
  const fund = (
    to: BillStatus,
    settledCents: number,
    from: BillStatus = "SCHOOL_CONFIRMED",
  ) => checkTransition(from, to, "SYSTEM", context({ settledCents }));

  it("allows a partial donation to partially fund the bill", () => {
    expect(fund("PARTIALLY_FUNDED", 5_000)).toEqual({ ok: true });
  });

  it("allows a single donation to fund the whole bill", () => {
    expect(fund("FUNDED", 20_000)).toEqual({ ok: true });
  });

  it("counts one cent short as not funded", () => {
    expect(fund("FUNDED", 19_999, "PARTIALLY_FUNDED")).toEqual({
      ok: false,
      reason: "NOT_FULLY_FUNDED",
    });
  });

  it("treats overfunding as funded", () => {
    expect(fund("FUNDED", 20_001, "PARTIALLY_FUNDED")).toEqual({ ok: true });
  });

  it("refuses partially funded without any money", () => {
    expect(fund("PARTIALLY_FUNDED", 0)).toEqual({
      ok: false,
      reason: "NO_FUNDS",
    });
  });

  it("refuses partially funded when the bill is covered", () => {
    expect(fund("PARTIALLY_FUNDED", 20_000)).toEqual({
      ok: false,
      reason: "ALREADY_FULLY_FUNDED",
    });
  });

  it("moves back when refunds reduce the settled total", () => {
    expect(fund("PARTIALLY_FUNDED", 5_000, "FUNDED")).toEqual({ ok: true });
    expect(fund("SCHOOL_CONFIRMED", 0, "PARTIALLY_FUNDED")).toEqual({
      ok: true,
    });
    expect(fund("SCHOOL_CONFIRMED", 0, "FUNDED")).toEqual({ ok: true });
  });

  it("does not return to unfunded while money is still attached", () => {
    expect(fund("SCHOOL_CONFIRMED", 5_000, "PARTIALLY_FUNDED")).toEqual({
      ok: false,
      reason: "FUNDS_ATTACHED",
    });
  });
});

describe("payout guards", () => {
  it("marks a bill paid only with proof and full funding", () => {
    const pay = (settledCents: number, hasPayoutProof: boolean) =>
      checkTransition(
        "FUNDED",
        "PAID",
        "ADMIN",
        context({ settledCents, hasPayoutProof }),
      );

    expect(pay(20_000, true)).toEqual({ ok: true });
    expect(pay(20_000, false)).toEqual({
      ok: false,
      reason: "PAYOUT_PROOF_MISSING",
    });
    expect(pay(19_999, true)).toEqual({
      ok: false,
      reason: "NOT_FULLY_FUNDED",
    });
  });

  it("applies the same checks when a dispute resolves back to paid", () => {
    expect(
      checkTransition(
        "DISPUTED",
        "PAID",
        "ADMIN",
        context({ settledCents: 20_000 }),
      ),
    ).toEqual({ ok: false, reason: "PAYOUT_PROOF_MISSING" });
  });
});

describe("expiry", () => {
  const expire = (from: BillStatus, overrides: Partial<BillContext>) =>
    checkTransition(from, "EXPIRED", "SYSTEM", context(overrides));

  it("expires an unfunded bill past its due date", () => {
    expect(expire("SCHOOL_CONFIRMED", { now: AFTER_DUE })).toEqual({
      ok: true,
    });
    expect(
      expire("PENDING_SCHOOL", { now: AFTER_DUE, confirmedCents: null }),
    ).toEqual({ ok: true });
  });

  it("does not expire on or before the due date", () => {
    expect(expire("SCHOOL_CONFIRMED", { now: DUE })).toEqual({
      ok: false,
      reason: "NOT_PAST_DUE",
    });
  });

  it("does not expire a bill holding money", () => {
    expect(
      expire("SCHOOL_CONFIRMED", { now: AFTER_DUE, settledCents: 1 }),
    ).toEqual({ ok: false, reason: "FUNDS_ATTACHED" });
    expect(expire("PARTIALLY_FUNDED", { now: AFTER_DUE })).toEqual({
      ok: false,
      reason: "ILLEGAL_TRANSITION",
    });
  });

  it("relists only once the due date is back in the future", () => {
    const relist = (now: Date) =>
      checkTransition(
        "EXPIRED",
        "PENDING_SCHOOL",
        "OWNER",
        context({ now, confirmedCents: null }),
      );

    expect(relist(AFTER_DUE)).toEqual({ ok: false, reason: "DUE_DATE_PASSED" });
    expect(relist(BEFORE_DUE)).toEqual({ ok: true });
  });

  it("does not submit a bill that is already past due", () => {
    expect(
      checkTransition(
        "DRAFT",
        "PENDING_SCHOOL",
        "OWNER",
        context({ now: AFTER_DUE, confirmedCents: null }),
      ),
    ).toEqual({ ok: false, reason: "DUE_DATE_PASSED" });
  });
});

describe("closing a bill while holding money", () => {
  it.each([
    ["SCHOOL_CONFIRMED", "CANCELLED", "OWNER"],
    ["SCHOOL_CONFIRMED", "REJECTED", "ADMIN"],
    ["DISPUTED", "CANCELLED", "ADMIN"],
    ["DISPUTED", "REJECTED", "ADMIN"],
  ] as const)("refuses %s -> %s until refunded", (from, to, actor) => {
    expect(
      checkTransition(from, to, actor, context({ settledCents: 5_000 })),
    ).toEqual({ ok: false, reason: "FUNDS_ATTACHED" });
    expect(
      checkTransition(from, to, actor, context({ settledCents: 0 })),
    ).toEqual({ ok: true });
  });

  it("gives the owner no way to withdraw a bill once it has donations", () => {
    expect(
      checkTransition(
        "PARTIALLY_FUNDED",
        "CANCELLED",
        "OWNER",
        context({ settledCents: 5_000 }),
      ),
    ).toEqual({ ok: false, reason: "ILLEGAL_TRANSITION" });
  });
});

describe("the happy path", () => {
  it("walks a bill from draft to receipt confirmed", () => {
    const steps: ReadonlyArray<
      [BillStatus, BillStatus, BillActor, Partial<BillContext>]
    > = [
      ["DRAFT", "PENDING_SCHOOL", "OWNER", { confirmedCents: null }],
      ["PENDING_SCHOOL", "SCHOOL_CONFIRMED", "SCHOOL", {}],
      ["SCHOOL_CONFIRMED", "PARTIALLY_FUNDED", "SYSTEM", { settledCents: 5_000 }],
      ["PARTIALLY_FUNDED", "FUNDED", "SYSTEM", { settledCents: 20_000 }],
      ["FUNDED", "PAID", "ADMIN", { settledCents: 20_000, hasPayoutProof: true }],
      [
        "PAID",
        "RECEIPT_CONFIRMED",
        "SCHOOL",
        { settledCents: 20_000, hasPayoutProof: true },
      ],
    ];

    for (const [from, to, actor, overrides] of steps) {
      expect(checkTransition(from, to, actor, context(overrides))).toEqual({
        ok: true,
      });
    }
  });
});

describe("acceptsDonations", () => {
  it("is true only while a confirmed bill still needs money", () => {
    expect(BILL_STATUSES.filter(acceptsDonations)).toEqual([
      "SCHOOL_CONFIRMED",
      "PARTIALLY_FUNDED",
    ]);
  });
});

describe("countsTowardLeaderboards", () => {
  it("is true only after the school confirms receipt", () => {
    expect(BILL_STATUSES.filter(countsTowardLeaderboards)).toEqual([
      "RECEIPT_CONFIRMED",
    ]);
  });
});

describe("fundingPosition", () => {
  it.each([
    [20_000, 0, "SCHOOL_CONFIRMED", 20_000, 0],
    [20_000, 1, "PARTIALLY_FUNDED", 19_999, 0],
    [20_000, 19_999, "PARTIALLY_FUNDED", 1, 0],
    [20_000, 20_000, "FUNDED", 0, 0],
    [20_000, 25_000, "FUNDED", 0, 5_000],
  ] as const)(
    "confirmed %i, settled %i is %s",
    (confirmed, settled, status, remainingCents, surplusCents) => {
      expect(fundingPosition(confirmed, settled)).toEqual({
        status,
        remainingCents,
        surplusCents,
      });
    },
  );

  it("always implies a status the transition rules accept", () => {
    for (const settledCents of [0, 1, 19_999, 20_000, 25_000]) {
      const { status } = fundingPosition(20_000, settledCents);
      if (status === "SCHOOL_CONFIRMED") continue;
      expect(
        checkTransition(
          "SCHOOL_CONFIRMED",
          status,
          "SYSTEM",
          context({ settledCents }),
        ),
      ).toEqual({ ok: true });
    }
  });
});

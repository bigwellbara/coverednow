import { describe, expect, it } from "vitest";
import {
  centsToPaynowAmount,
  createPaynowGateway,
  paynowAmountToCents,
  paynowHash,
  paynowOutcome,
  readPaynowMessage,
  signPaynowMessage,
} from "./paynow-gateway";

const KEY = "3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977";

describe("Paynow hash", () => {
  it("matches the worked example in Paynow's developer documentation", () => {
    const values = [
      "1201",
      "TEST REF",
      "99.99",
      "A test ticket transaction",
      "http://www.google.com/search?q=returnurl",
      "http://www.google.com/search?q=resulturl",
      "Message",
    ];
    expect(paynowHash(values, KEY)).toBe(
      "2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689",
    );
  });

  it("round-trips a signed message", () => {
    const body = signPaynowMessage(
      [
        ["reference", "CN-7K3QX9MW"],
        ["amount", "54.87"],
        ["status", "Paid"],
      ],
      KEY,
    );
    expect(readPaynowMessage(body, KEY)?.get("status")).toBe("Paid");
  });

  it("rejects a tampered, unsigned or wrongly keyed message", () => {
    const body = signPaynowMessage([["reference", "CN-7K3QX9MW"], ["amount", "1.00"]], KEY);

    expect(readPaynowMessage(body.replace("1.00", "9.00"), KEY)).toBeNull();
    expect(readPaynowMessage("reference=CN-7K3QX9MW&amount=1.00", KEY)).toBeNull();
    expect(readPaynowMessage(body, "another-key")).toBeNull();
  });
});

describe("Paynow values", () => {
  it("maps statuses to outcomes", () => {
    expect(paynowOutcome("Paid")).toBe("PAID");
    expect(paynowOutcome("Awaiting Delivery")).toBe("PAID");
    expect(paynowOutcome("Cancelled")).toBe("FAILED");
    expect(paynowOutcome("Refunded")).toBe("REVERSED");
    expect(paynowOutcome("Disputed")).toBe("PENDING");
    expect(paynowOutcome("Sent")).toBe("PENDING");
  });

  it("converts amounts without floating point", () => {
    expect(centsToPaynowAmount(5_487)).toBe("54.87");
    expect(centsToPaynowAmount(100)).toBe("1.00");
    expect(paynowAmountToCents("54.87")).toBe(5_487);
    expect(paynowAmountToCents("54.8")).toBe(5_480);
    expect(paynowAmountToCents("54")).toBe(5_400);
    expect(paynowAmountToCents("-1")).toBeNull();
  });
});

describe("Paynow gateway", () => {
  const reply = (fields: Array<[string, string]>) =>
    new Response(signPaynowMessage(fields, KEY), { status: 200 });

  it("starts a payment and returns Paynow's page", async () => {
    const sent: string[] = [];
    const gateway = createPaynowGateway({
      integrationId: "1201",
      integrationKey: KEY,
      fetch: async (_url, init) => {
        sent.push(String(init?.body));
        return reply([
          ["status", "Ok"],
          ["browserurl", "https://www.paynow.co.zw/Payment/ConfirmPayment/1"],
          ["pollurl", "https://www.paynow.co.zw/Interface/CheckPayment/?guid=1"],
        ]);
      },
    });

    const result = await gateway.initiate({
      reference: "CN-7K3QX9MW",
      totalCents: 5_487,
      description: "School fees",
      returnUrl: "https://app.test/payments/return?ref=CN-7K3QX9MW",
      resultUrl: "https://app.test/api/webhooks/paynow",
    });

    expect(result.redirectUrl).toBe("https://www.paynow.co.zw/Payment/ConfirmPayment/1");
    const body = new URLSearchParams(sent[0]);
    expect(body.get("amount")).toBe("54.87");
    expect(readPaynowMessage(sent[0]!, KEY)).not.toBeNull();
  });

  it("refuses a reply it can't verify, or links away from Paynow", async () => {
    const start = (response: () => Response) =>
      createPaynowGateway({
        integrationId: "1201",
        integrationKey: KEY,
        fetch: async () => response(),
      }).initiate({
        reference: "CN-7K3QX9MW",
        totalCents: 100,
        description: "x",
        returnUrl: "https://app.test/r",
        resultUrl: "https://app.test/w",
      });

    await expect(
      start(() => new Response("status=Ok&browserurl=https://evil.test&pollurl=x&hash=AA")),
    ).rejects.toThrow(/verified/);
    await expect(
      start(() =>
        reply([
          ["status", "Ok"],
          ["browserurl", "https://evil.test/pay"],
          ["pollurl", "https://www.paynow.co.zw/poll"],
        ]),
      ),
    ).rejects.toThrow(/outside/);
    await expect(
      start(() => new Response("status=Error&error=Invalid+amount")),
    ).rejects.toThrow(/Invalid amount/);
  });

  it("reads a signed result, and only a signed one", () => {
    const gateway = createPaynowGateway({ integrationId: "1201", integrationKey: KEY });
    const body = signPaynowMessage(
      [
        ["reference", "CN-7K3QX9MW"],
        ["paynowreference", "12345"],
        ["amount", "54.87"],
        ["status", "Paid"],
        ["pollurl", "https://www.paynow.co.zw/poll"],
      ],
      KEY,
    );

    expect(gateway.readCallback(body)).toEqual({
      reference: "CN-7K3QX9MW",
      providerRef: "12345",
      amountCents: 5_487,
      outcome: "PAID",
    });
    expect(gateway.readCallback(body.replace("Paid", "Cancelled"))).toBeNull();
  });

  it("never polls anywhere but Paynow", async () => {
    let called = false;
    const gateway = createPaynowGateway({
      integrationId: "1201",
      integrationKey: KEY,
      fetch: async () => {
        called = true;
        return new Response("");
      },
    });

    expect(await gateway.poll("https://evil.test/poll")).toBeNull();
    expect(called).toBe(false);
  });
});

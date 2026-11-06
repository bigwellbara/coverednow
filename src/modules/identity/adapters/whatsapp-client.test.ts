import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OtpRecipientUnreachableError } from "../services/otp-service";
import {
  WhatsAppUnavailableError,
  createWhatsAppClient,
  type WhatsAppConnectionUpdate,
  type WhatsAppSocket,
} from "./whatsapp-client";

const PHONE = "+263771234567";
const JID = "263771234567@s.whatsapp.net";

function fakeSocket() {
  let listener: (update: WhatsAppConnectionUpdate) => void = () => {};
  const sent: Array<[string, string]> = [];
  const socket = {
    onUpdate: (next) => {
      listener = next;
    },
    lookup: vi.fn(async (): Promise<{ jid: string; exists: boolean } | undefined> => ({
      jid: JID,
      exists: true,
    })),
    sendText: vi.fn(async (jid: string, text: string) => {
      sent.push([jid, text]);
    }),
    close: vi.fn(),
  } satisfies WhatsAppSocket;
  return {
    socket,
    sent,
    emit: (update: WhatsAppConnectionUpdate) => listener(update),
  };
}

function setup() {
  const sockets: Array<ReturnType<typeof fakeSocket>> = [];
  const log = vi.fn();
  const openSocket = vi.fn(async () => {
    const created = fakeSocket();
    sockets.push(created);
    return created.socket;
  });
  const client = createWhatsAppClient({ openSocket, log, maxBackoffMs: 8000 });
  return { client, sockets, openSocket, log };
}

/** Lets the async socket creation finish without advancing the clock. */
const flush = () => vi.advanceTimersByTimeAsync(0);

describe("WhatsApp client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not connect until there is something to send", () => {
    const { openSocket } = setup();
    expect(openSocket).not.toHaveBeenCalled();
  });

  it("connects, looks up the number, and sends to the address returned", async () => {
    const { client, sockets } = setup();

    const sending = client.sendText(PHONE, "hello");
    await flush();
    sockets[0]!.emit({ state: "open" });
    await sending;

    expect(sockets[0]!.socket.lookup).toHaveBeenCalledWith("263771234567");
    expect(sockets[0]!.sent).toEqual([[JID, "hello"]]);
  });

  it("reuses one connection across sends, including concurrent ones", async () => {
    const { client, sockets, openSocket } = setup();

    const first = client.sendText(PHONE, "one");
    const second = client.sendText(PHONE, "two");
    await flush();
    sockets[0]!.emit({ state: "open" });
    await Promise.all([first, second]);
    await client.sendText(PHONE, "three");

    expect(openSocket).toHaveBeenCalledTimes(1);
    expect(sockets[0]!.sent).toHaveLength(3);
  });

  it("reports a number that is not on WhatsApp, and sends nothing", async () => {
    const { client, sockets } = setup();

    const sending = client.sendText(PHONE, "hello");
    await flush();
    sockets[0]!.socket.lookup.mockResolvedValueOnce({ jid: JID, exists: false });
    sockets[0]!.emit({ state: "open" });

    await expect(sending).rejects.toBeInstanceOf(OtpRecipientUnreachableError);
    expect(sockets[0]!.sent).toEqual([]);
  });

  it("treats an empty lookup as not on WhatsApp", async () => {
    const { client, sockets } = setup();

    const sending = client.sendText(PHONE, "hello");
    await flush();
    sockets[0]!.socket.lookup.mockResolvedValueOnce(undefined);
    sockets[0]!.emit({ state: "open" });

    await expect(sending).rejects.toBeInstanceOf(OtpRecipientUnreachableError);
  });

  it("gives up waiting if the connection never opens", async () => {
    const { client } = setup();

    const sending = client.sendText(PHONE, "hello");
    const outcome = expect(sending).rejects.toBeInstanceOf(
      WhatsAppUnavailableError,
    );
    await vi.advanceTimersByTimeAsync(20_000);
    await outcome;
  });

  it("times out a request that never answers", async () => {
    const { client, sockets } = setup();

    const sending = client.sendText(PHONE, "hello");
    await flush();
    sockets[0]!.socket.lookup.mockReturnValueOnce(new Promise(() => {}));
    sockets[0]!.emit({ state: "open" });
    const outcome = expect(sending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(15_000);
    await outcome;
  });

  it("does not put the message in errors or logs", async () => {
    const { client, sockets, log } = setup();

    const sending = client.sendText(PHONE, "secret-123456");
    await flush();
    sockets[0]!.socket.sendText.mockRejectedValueOnce(new Error("send failed"));
    sockets[0]!.emit({ state: "open" });

    const error = await sending.catch((caught: Error) => caught);
    expect(String(error)).not.toContain("secret-123456");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-123456");
  });

  describe("when not linked to an account", () => {
    it("fails with instructions, closes the socket and does not loop", async () => {
      const { client, sockets, openSocket, log } = setup();

      const sending = client.sendText(PHONE, "hello");
      await flush();
      sockets[0]!.emit({ state: "needs-pairing" });

      await expect(sending).rejects.toThrow("npm run whatsapp:pair");
      expect(sockets[0]!.socket.close).toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("npm run whatsapp:pair"),
      );

      await vi.advanceTimersByTimeAsync(120_000);
      expect(openSocket).toHaveBeenCalledTimes(1);
    });

    it("tries again on the next send, so re-pairing needs no restart", async () => {
      const { client, sockets, openSocket } = setup();

      const first = client.sendText(PHONE, "one");
      await flush();
      sockets[0]!.emit({ state: "needs-pairing" });
      await expect(first).rejects.toThrow();

      const second = client.sendText(PHONE, "two");
      await flush();
      sockets[1]!.emit({ state: "open" });
      await second;

      expect(openSocket).toHaveBeenCalledTimes(2);
      expect(sockets[1]!.sent).toEqual([[JID, "two"]]);
    });
  });

  describe("when the connection closes", () => {
    const open = async (t: ReturnType<typeof setup>) => {
      const sending = t.client.sendText(PHONE, "first");
      await flush();
      t.sockets[0]!.emit({ state: "open" });
      await sending;
    };

    it.each([
      ["connection lost", 408],
      ["restart required after pairing", 515],
      ["service unavailable", 503],
    ])("reconnects by itself after %s", async (_name, statusCode) => {
      const t = setup();
      await open(t);

      t.sockets[0]!.emit({ state: "closed", statusCode });
      await vi.advanceTimersByTimeAsync(1000);

      expect(t.openSocket).toHaveBeenCalledTimes(2);
    });

    it.each([
      ["logged out", 401],
      ["forbidden", 403],
      ["multi-device mismatch", 411],
      ["replaced by another connection", 440],
      ["bad session", 500],
    ])("does not reconnect by itself after %s", async (_name, statusCode) => {
      const t = setup();
      await open(t);

      t.sockets[0]!.emit({ state: "closed", statusCode });
      await vi.advanceTimersByTimeAsync(120_000);

      expect(t.openSocket).toHaveBeenCalledTimes(1);
      expect(t.log).toHaveBeenCalledWith(expect.stringContaining(String(statusCode)));
    });

    it("fails a waiting send straight away when it cannot reconnect", async () => {
      const t = setup();
      const sending = t.client.sendText(PHONE, "hello");
      await flush();

      t.sockets[0]!.emit({ state: "closed", statusCode: 401 });

      await expect(sending).rejects.toBeInstanceOf(WhatsAppUnavailableError);
    });

    it("backs off more each time, up to the limit", async () => {
      const t = setup();
      await open(t);

      const closeLatestAndWait = async (ms: number) => {
        t.sockets.at(-1)!.emit({ state: "closed", statusCode: 408 });
        await vi.advanceTimersByTimeAsync(ms - 1);
        const before = t.openSocket.mock.calls.length;
        await vi.advanceTimersByTimeAsync(1);
        expect(t.openSocket.mock.calls.length).toBe(before + 1);
      };

      await closeLatestAndWait(1000);
      await closeLatestAndWait(2000);
      await closeLatestAndWait(4000);
      await closeLatestAndWait(8000);
      await closeLatestAndWait(8000); // capped by maxBackoffMs
    });

    it("resets the backoff once connected again", async () => {
      const t = setup();
      await open(t);

      t.sockets[0]!.emit({ state: "closed", statusCode: 408 });
      await vi.advanceTimersByTimeAsync(1000);
      t.sockets[1]!.emit({ state: "closed", statusCode: 408 });
      await vi.advanceTimersByTimeAsync(2000);
      t.sockets[2]!.emit({ state: "open" });

      t.sockets[2]!.emit({ state: "closed", statusCode: 408 });
      await vi.advanceTimersByTimeAsync(1000);
      expect(t.sockets).toHaveLength(4);
    });

    it("ignores events from a connection already replaced", async () => {
      const t = setup();
      await open(t);
      t.sockets[0]!.emit({ state: "closed", statusCode: 408 });
      await vi.advanceTimersByTimeAsync(1000);
      t.sockets[1]!.emit({ state: "open" });

      t.sockets[0]!.emit({ state: "closed", statusCode: 401 });
      await t.client.sendText(PHONE, "still works");

      expect(t.sockets[1]!.sent).toEqual([[JID, "still works"]]);
    });

    it("retries if opening the connection itself fails", async () => {
      const t = setup();
      t.openSocket.mockRejectedValueOnce(new Error("no network"));

      const sending = t.client.sendText(PHONE, "hello");
      await flush();
      await vi.advanceTimersByTimeAsync(1000);
      t.sockets[0]!.emit({ state: "open" });
      await sending;

      expect(t.sockets[0]!.sent).toHaveLength(1);
    });
  });
});

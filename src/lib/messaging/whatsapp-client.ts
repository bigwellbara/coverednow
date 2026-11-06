export type WhatsAppConnectionUpdate =
  | { state: "open" }
  /** The session has no linked account, so WhatsApp is offering a QR code. */
  | { state: "needs-pairing" }
  | { state: "closed"; statusCode?: number };

/** The part of a WhatsApp connection this app uses. */
export type WhatsAppSocket = {
  onUpdate(listener: (update: WhatsAppConnectionUpdate) => void): void;
  lookup(phoneDigits: string): Promise<{ jid: string; exists: boolean } | undefined>;
  sendText(jid: string, text: string): Promise<void>;
  close(): void;
};

export class WhatsAppUnavailableError extends Error {}

/** The number has no WhatsApp account. */
export class RecipientNotOnWhatsAppError extends Error {}

/**
 * Closes where reconnecting cannot help, and could make things worse: logged out,
 * forbidden, multi-device mismatch, a corrupt session, or another connection
 * taking over (two connections reconnecting would keep knocking each other off).
 * The next send tries again, so re-pairing does not need an app restart.
 */
const NO_RECONNECT_STATUS_CODES = new Set([401, 403, 411, 440, 500]);

const PAIRING_HINT =
  "WhatsApp is not linked. Stop the app and run: npm run whatsapp:pair";

/**
 * Owns the single WhatsApp connection for this process: opens it on the first
 * send, keeps it open, and reconnects after temporary failures.
 */
export function createWhatsAppClient(options: {
  openSocket: () => Promise<WhatsAppSocket>;
  openTimeoutMs?: number;
  requestTimeoutMs?: number;
  maxBackoffMs?: number;
  log?: (message: string) => void;
}) {
  const {
    openSocket,
    openTimeoutMs = 20_000,
    requestTimeoutMs = 15_000,
    maxBackoffMs = 60_000,
    log = console.error,
  } = options;

  type Waiter = {
    resolve: (socket: WhatsAppSocket) => void;
    reject: (error: Error) => void;
  };

  let socket: WhatsAppSocket | null = null;
  let isOpen = false;
  let isOpening = false;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let waiters: Waiter[] = [];

  function failWaiters(message: string) {
    const pending = waiters;
    waiters = [];
    for (const waiter of pending) {
      waiter.reject(new WhatsAppUnavailableError(message));
    }
  }

  function scheduleReconnect() {
    failures += 1;
    const delay = Math.min(1000 * 2 ** (failures - 1), maxBackoffMs);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connect();
    }, delay);
    retryTimer.unref?.();
  }

  function handleUpdate(from: WhatsAppSocket, update: WhatsAppConnectionUpdate) {
    if (from !== socket) return; // a connection already replaced

    if (update.state === "open") {
      isOpen = true;
      failures = 0;
      const pending = waiters;
      waiters = [];
      for (const waiter of pending) waiter.resolve(from);
      return;
    }

    socket = null;
    isOpen = false;

    if (update.state === "needs-pairing") {
      from.close();
      log(PAIRING_HINT);
      failWaiters(PAIRING_HINT);
      return;
    }

    if (
      update.statusCode !== undefined &&
      NO_RECONNECT_STATUS_CODES.has(update.statusCode)
    ) {
      const message = `WhatsApp connection closed (status ${update.statusCode}). ${PAIRING_HINT}`;
      log(message);
      failWaiters(message);
      return;
    }

    scheduleReconnect();
  }

  async function connect() {
    if (socket || isOpening) return;
    isOpening = true;
    try {
      const opened = await openSocket();
      socket = opened;
      opened.onUpdate((update) => handleUpdate(opened, update));
    } catch (error) {
      log(`Could not open WhatsApp connection: ${String(error)}`);
      scheduleReconnect();
    } finally {
      isOpening = false;
    }
  }

  function whenOpen(): Promise<WhatsAppSocket> {
    if (socket && isOpen) return Promise.resolve(socket);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters = waiters.filter((waiter) => waiter !== entry);
        reject(new WhatsAppUnavailableError("Timed out connecting to WhatsApp"));
      }, openTimeoutMs);

      const entry: Waiter = {
        resolve: (opened) => {
          clearTimeout(timer);
          resolve(opened);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      waiters.push(entry);

      if (!retryTimer) void connect();
    });
  }

  async function withTimeout<T>(work: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new WhatsAppUnavailableError("WhatsApp request timed out")),
        requestTimeoutMs,
      );
    });
    try {
      return await Promise.race([work, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /** Sends to an E.164 number. Throws if it is not on WhatsApp. */
    async sendText(phone: string, text: string): Promise<void> {
      const opened = await whenOpen();
      const contact = await withTimeout(opened.lookup(phone.replace(/^\+/, "")));
      if (!contact?.exists) throw new RecipientNotOnWhatsAppError();
      await withTimeout(opened.sendText(contact.jid, text));
    },
  };
}

export type WhatsAppClient = ReturnType<typeof createWhatsAppClient>;

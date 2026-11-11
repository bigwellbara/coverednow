import type { ILogger } from "baileys/lib/Utils/logger";
import type { proto } from "baileys";
import type {
  WhatsAppConnectionUpdate,
  WhatsAppSocket,
} from "./whatsapp-client";

/** Long enough to answer retry requests for a code that is still valid. */
const RECENT_MESSAGE_TTL_MS = 5 * 60_000;

/**
 * Baileys' lower log levels include message contents, such as sign-in codes and
 * confirmation links. Only error text goes to the console, and never the attached objects.
 */
const logger: ILogger = {
  level: "error",
  child: () => logger,
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: (_details, message) => {
    console.error(`[whatsapp] ${message ?? "error"}`);
  },
};

/**
 * Connects through Baileys. The library is imported on first use, so nothing
 * loads unless WhatsApp delivery is switched on. Linking is only ever done by
 * `npm run whatsapp:pair`, never from here.
 */
export function createBaileysSocketFactory(
  authDirectory: string,
): () => Promise<WhatsAppSocket> {
  // A recipient's phone can ask for a message again if it fails to decrypt it.
  // Answering needs the original, so it is kept in memory only, and only briefly.
  const recentMessages = new Map<string, proto.IMessage>();

  return async () => {
    const {
      default: makeWASocket,
      makeCacheableSignalKeyStore,
      useMultiFileAuthState,
    } = await import("baileys");

    const { state, saveCreds } = await useMultiFileAuthState(authDirectory);
    const socket = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      // Send-only: keep the linked phone's notifications working, and don't
      // download its chat history onto this server.
      markOnlineOnConnect: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      getMessage: async (key) =>
        key.id ? recentMessages.get(key.id) : undefined,
    });
    socket.ev.on("creds.update", saveCreds);

    return {
      onUpdate(listener: (update: WhatsAppConnectionUpdate) => void) {
        socket.ev.on("connection.update", (update) => {
          if (update.qr) {
            listener({ state: "needs-pairing" });
          } else if (update.connection === "open") {
            listener({ state: "open" });
          } else if (update.connection === "close") {
            const error = update.lastDisconnect?.error as
              | { output?: { statusCode?: number } }
              | undefined;
            listener({
              state: "closed",
              statusCode: error?.output?.statusCode,
            });
          }
        });
      },

      lookup: async (phoneDigits) => (await socket.onWhatsApp(phoneDigits))?.[0],

      async sendText(jid, text) {
        const sent = await socket.sendMessage(jid, { text });
        const id = sent?.key.id;
        if (id && sent.message) {
          recentMessages.set(id, sent.message);
          setTimeout(
            () => recentMessages.delete(id),
            RECENT_MESSAGE_TTL_MS,
          ).unref?.();
        }
      },

      close() {
        socket.end(undefined);
      },
    };
  };
}

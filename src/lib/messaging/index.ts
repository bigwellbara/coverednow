import { createBaileysSocketFactory } from "./baileys-socket";
import { createWhatsAppClient, type WhatsAppClient } from "./whatsapp-client";

export { RecipientNotOnWhatsAppError } from "./whatsapp-client";

export type MessageSender = {
  /** Sends to an E.164 number. */
  sendText(phone: string, text: string): Promise<void>;
};

const DEFAULT_AUTH_DIRECTORY = ".data/whatsapp-auth";

// WhatsApp allows one connection per linked device, so the client must survive
// Next.js reloading this module in development.
const globalForWhatsApp = globalThis as unknown as {
  whatsAppClient?: WhatsAppClient;
};

function getWhatsAppClient(): WhatsAppClient {
  return (globalForWhatsApp.whatsAppClient ??= createWhatsAppClient({
    openSocket: createBaileysSocketFactory(
      process.env.WHATSAPP_AUTH_DIR || DEFAULT_AUTH_DIRECTORY,
    ),
  }));
}

/**
 * `MESSAGE_DELIVERY=whatsapp` sends over WhatsApp. Otherwise development prints
 * messages to the console, and production fails loudly: sign-in codes and
 * confirmation links must never reach production logs, and nobody should be stuck
 * behind a silently broken sender.
 */
export function createMessageSender(
  env: Record<string, string | undefined> = process.env,
): MessageSender {
  if (env.MESSAGE_DELIVERY === "whatsapp") return getWhatsAppClient();

  if (env.NODE_ENV === "production") {
    return {
      sendText: async () => {
        throw new Error(
          "No message delivery is configured. Set MESSAGE_DELIVERY=whatsapp.",
        );
      },
    };
  }
  return {
    sendText: async (phone, text) => {
      console.info(`[dev only] message to ${phone}: ${text}`);
    },
  };
}

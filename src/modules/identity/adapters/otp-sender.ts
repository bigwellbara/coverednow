import { otpMessage } from "../domain/otp";
import type { OtpSender } from "../services/otp-service";
import { createBaileysSocketFactory } from "./baileys-socket";
import { createWhatsAppClient, type WhatsAppClient } from "./whatsapp-client";

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

export function createWhatsAppOtpSender(
  client: Pick<WhatsAppClient, "sendText">,
): OtpSender {
  return { send: (phone, code) => client.sendText(phone, otpMessage(code)) };
}

/**
 * `OTP_DELIVERY=whatsapp` sends codes over WhatsApp. Otherwise, development prints
 * them to the console, and production fails loudly: codes must never reach
 * production logs, and nobody should be stuck behind a silently broken sender.
 */
export function createOtpSender(
  env: Record<string, string | undefined> = process.env,
): OtpSender {
  if (env.OTP_DELIVERY === "whatsapp") {
    return createWhatsAppOtpSender(getWhatsAppClient());
  }
  if (env.NODE_ENV === "production") {
    return {
      send: async () => {
        throw new Error(
          "No OTP delivery is configured. Set OTP_DELIVERY=whatsapp.",
        );
      },
    };
  }
  return {
    send: async (phone, code) => {
      console.info(`[dev only] sign-in code for ${phone}: ${code}`);
    },
  };
}

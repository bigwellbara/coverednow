import type { OtpSender } from "../services/otp-service";

/**
 * No SMS or WhatsApp provider is chosen yet. In development the code goes to the
 * server console. In production sending fails loudly, so codes can never end up
 * in production logs and nobody can sign in through a silently broken sender.
 */
export function createOtpSender(): OtpSender {
  if (process.env.NODE_ENV === "production") {
    return {
      send: async () => {
        throw new Error("No OTP delivery provider is configured");
      },
    };
  }
  return {
    send: async (phone, code) => {
      console.info(`[dev only] sign-in code for ${phone}: ${code}`);
    },
  };
}

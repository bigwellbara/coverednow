import {
  RecipientNotOnWhatsAppError,
  type MessageSender,
} from "@/lib/messaging";
import type { EmailSender } from "@/lib/messaging/email";
import { otpEmail, otpMessage } from "../domain/otp";
import { OtpRecipientUnreachableError, type OtpSender } from "../services/otp-service";

/** Sends to an email if the address is one, and over WhatsApp if it's a phone. */
export function createOtpSender(
  messages: MessageSender,
  email: EmailSender,
): OtpSender {
  return {
    send: async (address, code) => {
      if (address.includes("@")) {
        await email.send({ to: address, ...otpEmail(code) });
        return;
      }
      try {
        await messages.sendText(address, otpMessage(code));
      } catch (error) {
        if (error instanceof RecipientNotOnWhatsAppError) {
          throw new OtpRecipientUnreachableError();
        }
        throw error;
      }
    },
  };
}

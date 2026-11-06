import {
  RecipientNotOnWhatsAppError,
  type MessageSender,
} from "@/lib/messaging";
import { otpMessage } from "../domain/otp";
import { OtpRecipientUnreachableError, type OtpSender } from "../services/otp-service";

export function createOtpSender(messages: MessageSender): OtpSender {
  return {
    send: async (phone, code) => {
      try {
        await messages.sendText(phone, otpMessage(code));
      } catch (error) {
        if (error instanceof RecipientNotOnWhatsAppError) {
          throw new OtpRecipientUnreachableError();
        }
        throw error;
      }
    },
  };
}

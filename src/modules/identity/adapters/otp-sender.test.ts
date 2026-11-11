import { describe, expect, it, vi } from "vitest";
import { RecipientNotOnWhatsAppError } from "../../../lib/messaging/whatsapp-client";
import { OtpRecipientUnreachableError } from "../services/otp-service";
import { createOtpSender } from "./otp-sender";

vi.mock("@/lib/messaging", async () =>
  import("../../../lib/messaging/whatsapp-client"),
);

const PHONE = "+263771234567";
const EMAIL = "tariro@example.com";

function setup(sendText: (phone: string, text: string) => Promise<void> = async () => {}) {
  const whatsApp = vi.fn(sendText);
  const email = vi.fn(async () => {});
  return {
    sender: createOtpSender({ sendText: whatsApp }, { send: email }),
    whatsApp,
    email,
  };
}

describe("createOtpSender", () => {
  it("sends a phone's code over WhatsApp, plain with no links", async () => {
    const { sender, whatsApp, email } = setup();

    await sender.send(PHONE, "123456");

    expect(email).not.toHaveBeenCalled();
    const [phone, message] = whatsApp.mock.calls[0]!;
    expect(phone).toBe(PHONE);
    expect(message).toContain("123456");
    expect(message).not.toMatch(/https?:|www\./);
  });

  it("sends an email address's code by email, with it out of the subject", async () => {
    const { sender, whatsApp, email } = setup();

    await sender.send(EMAIL, "123456");

    expect(whatsApp).not.toHaveBeenCalled();
    const [message] = email.mock.calls[0] as unknown as [
      { to: string; subject: string; text: string },
    ];
    expect(message.to).toBe(EMAIL);
    expect(message.text).toContain("123456");
    // Subjects show on locked phones and in notification previews.
    expect(message.subject).not.toContain("123456");
    expect(message.text).not.toMatch(/https?:|www\./);
  });

  it("reports a number that cannot receive codes", async () => {
    const { sender } = setup(async () => {
      throw new RecipientNotOnWhatsAppError();
    });

    await expect(sender.send(PHONE, "123456")).rejects.toBeInstanceOf(
      OtpRecipientUnreachableError,
    );
  });

  it("passes on other delivery failures", async () => {
    const failure = new Error("not connected");
    const { sender } = setup(async () => {
      throw failure;
    });

    await expect(sender.send(PHONE, "123456")).rejects.toBe(failure);
  });
});

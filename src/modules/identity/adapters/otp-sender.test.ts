import { describe, expect, it, vi } from "vitest";
import { RecipientNotOnWhatsAppError } from "../../../lib/messaging/whatsapp-client";
import { OtpRecipientUnreachableError } from "../services/otp-service";
import { createOtpSender } from "./otp-sender";

vi.mock("@/lib/messaging", async () =>
  import("../../../lib/messaging/whatsapp-client"),
);

const PHONE = "+263771234567";

describe("createOtpSender", () => {
  it("sends the code to the number, in a plain message with no links", async () => {
    const sendText = vi.fn(async () => {});

    await createOtpSender({ sendText }).send(PHONE, "123456");

    expect(sendText).toHaveBeenCalledTimes(1);
    const [phone, message] = sendText.mock.calls[0] as unknown as [string, string];
    expect(phone).toBe(PHONE);
    expect(message).toContain("123456");
    expect(message).not.toMatch(/https?:|www\./);
  });

  it("reports a number that cannot receive codes", async () => {
    const sender = createOtpSender({
      sendText: async () => {
        throw new RecipientNotOnWhatsAppError();
      },
    });

    await expect(sender.send(PHONE, "123456")).rejects.toBeInstanceOf(
      OtpRecipientUnreachableError,
    );
  });

  it("passes on other delivery failures", async () => {
    const failure = new Error("not connected");
    const sender = createOtpSender({
      sendText: async () => {
        throw failure;
      },
    });

    await expect(sender.send(PHONE, "123456")).rejects.toBe(failure);
  });
});

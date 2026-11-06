import { afterEach, describe, expect, it, vi } from "vitest";
import { createOtpSender, createWhatsAppOtpSender } from "./otp-sender";

const PHONE = "+263771234567";

describe("createWhatsAppOtpSender", () => {
  it("sends the code to the number, in a plain message with no links", async () => {
    const sendText = vi.fn(async () => {});

    await createWhatsAppOtpSender({ sendText }).send(PHONE, "123456");

    expect(sendText).toHaveBeenCalledTimes(1);
    const [phone, message] = sendText.mock.calls[0] as unknown as [string, string];
    expect(phone).toBe(PHONE);
    expect(message).toContain("123456");
    expect(message).not.toMatch(/https?:|www\./);
  });

  it("passes on delivery failures, so the form can report them", async () => {
    const failure = new Error("not connected");
    const sender = createWhatsAppOtpSender({
      sendText: async () => {
        throw failure;
      },
    });

    await expect(sender.send(PHONE, "123456")).rejects.toBe(failure);
  });
});

describe("createOtpSender", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses to send in production with no delivery set", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await expect(
      createOtpSender({ NODE_ENV: "production" }).send(PHONE, "123456"),
    ).rejects.toThrow("No OTP delivery");
    expect(info).not.toHaveBeenCalled();
  });

  it("never treats an unknown delivery setting as console output in production", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const sender = createOtpSender({
      NODE_ENV: "production",
      OTP_DELIVERY: "console",
    });

    await expect(sender.send(PHONE, "123456")).rejects.toThrow();
    expect(info).not.toHaveBeenCalled();
  });

  it("prints the code to the console in development", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await createOtpSender({ NODE_ENV: "development" }).send(PHONE, "123456");

    expect(info.mock.calls[0]?.[0]).toContain("123456");
  });

  it("does not print the code when WhatsApp delivery is on", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const sender = createOtpSender({
      NODE_ENV: "development",
      OTP_DELIVERY: "whatsapp",
    });

    expect(sender).toBeDefined();
    expect(info).not.toHaveBeenCalled();
  });
});

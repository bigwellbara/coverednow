import { afterEach, describe, expect, it, vi } from "vitest";
import { createMessageSender } from "./index";

const PHONE = "+263771234567";

describe("createMessageSender", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses to send in production with no delivery set", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await expect(
      createMessageSender({ NODE_ENV: "production" }).sendText(PHONE, "secret"),
    ).rejects.toThrow("No message delivery");
    expect(info).not.toHaveBeenCalled();
  });

  it("never treats an unknown delivery setting as console output in production", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const sender = createMessageSender({
      NODE_ENV: "production",
      MESSAGE_DELIVERY: "console",
    });

    await expect(sender.sendText(PHONE, "secret")).rejects.toThrow();
    expect(info).not.toHaveBeenCalled();
  });

  it("prints the message to the console in development", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await createMessageSender({ NODE_ENV: "development" }).sendText(PHONE, "hello");

    expect(info.mock.calls[0]?.[0]).toContain("hello");
  });

  it("does not print anything when WhatsApp delivery is on", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const sender = createMessageSender({
      NODE_ENV: "development",
      MESSAGE_DELIVERY: "whatsapp",
    });

    expect(sender).toBeDefined();
    expect(info).not.toHaveBeenCalled();
  });
});

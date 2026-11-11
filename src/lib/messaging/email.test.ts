import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmailSender, smtpOptions } from "./email";

const EMAIL = {
  to: "tariro@example.com",
  subject: "Your code",
  text: "Your code is 123456",
};

const SMTP = {
  SMTP_HOST: "smtp.example.com",
  EMAIL_FROM: "CoveredNow <no-reply@example.com>",
};

describe("smtpOptions", () => {
  it("defaults to port 587 and insists on upgrading to TLS", () => {
    expect(smtpOptions(SMTP)).toMatchObject({
      port: 587,
      secure: false,
      requireTLS: true,
    });
  });

  it("uses TLS from the start on port 465", () => {
    expect(smtpOptions({ ...SMTP, SMTP_PORT: "465" })).toMatchObject({
      port: 465,
      secure: true,
      requireTLS: false,
    });
  });

  it("only skips TLS for a mail server on this machine", () => {
    expect(smtpOptions({ SMTP_HOST: "localhost", SMTP_PORT: "1025" })).toMatchObject({
      requireTLS: false,
    });
    expect(
      smtpOptions({ SMTP_HOST: "mail.example.com", SMTP_PORT: "25" }),
    ).toMatchObject({ requireTLS: true });
  });

  it("only sends a login when one is set", () => {
    expect(smtpOptions(SMTP).auth).toBeUndefined();
    expect(
      smtpOptions({ ...SMTP, SMTP_USER: "user", SMTP_PASSWORD: "secret" }).auth,
    ).toEqual({ user: "user", pass: "secret" });
  });
});

describe("createEmailSender", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends through SMTP once it is configured, from the configured address", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const sendMail = vi.fn(async () => ({}));
    const make = vi.fn(() => ({ sendMail }));

    const sender = createEmailSender({ ...SMTP, NODE_ENV: "production" }, make as never);
    await sender.send(EMAIL);
    await sender.send(EMAIL);

    expect(make).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({ from: SMTP.EMAIL_FROM, ...EMAIL });
    expect(info).not.toHaveBeenCalled();
  });

  it("refuses to send without a from address", async () => {
    const sender = createEmailSender(
      { SMTP_HOST: "smtp.example.com" },
      (() => ({ sendMail: vi.fn() })) as never,
    );

    await expect(sender.send(EMAIL)).rejects.toThrow("EMAIL_FROM");
  });

  it("passes on delivery failures", async () => {
    const failure = new Error("connection refused");
    const sender = createEmailSender(SMTP, (() => ({
      sendMail: async () => {
        throw failure;
      },
    })) as never);

    await expect(sender.send(EMAIL)).rejects.toBe(failure);
  });

  it("refuses to send in production with no SMTP, and prints nothing", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await expect(
      createEmailSender({ NODE_ENV: "production" }).send(EMAIL),
    ).rejects.toThrow("No email delivery");
    expect(info).not.toHaveBeenCalled();
  });

  it("prints to the console in development", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await createEmailSender({ NODE_ENV: "development" }).send(EMAIL);

    expect(info.mock.calls[0]?.[0]).toContain("123456");
  });
});

import type { Transporter } from "nodemailer";

export type Email = { to: string; subject: string; text: string };

export type EmailSender = { send(email: Email): Promise<void> };

type Settings = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Settings for any SMTP provider. Port 465 uses TLS from the start. Other ports
 * must upgrade with STARTTLS, so a downgrade can't expose codes or the password.
 */
export function smtpOptions(env: Settings) {
  const host = env.SMTP_HOST!;
  const port = Number(env.SMTP_PORT || 587);
  const secure = port === 465;
  return {
    host,
    port,
    secure,
    requireTLS: !secure && !LOCAL_HOSTS.has(host),
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
}

/**
 * Sends through SMTP once `SMTP_HOST` is set. Otherwise development prints emails
 * to the console, and production fails loudly, so codes never reach its logs.
 */
export function createEmailSender(
  env: Settings = process.env,
  createTransport?: (options: ReturnType<typeof smtpOptions>) => Pick<Transporter, "sendMail">,
): EmailSender {
  if (env.SMTP_HOST) {
    let transport: Pick<Transporter, "sendMail"> | undefined;

    return {
      send: async ({ to, subject, text }) => {
        if (!env.EMAIL_FROM) throw new Error("EMAIL_FROM is not set");
        if (!transport) {
          const make =
            createTransport ?? (await import("nodemailer")).default.createTransport;
          transport = make(smtpOptions(env));
        }
        await transport.sendMail({ from: env.EMAIL_FROM, to, subject, text });
      },
    };
  }

  if (env.NODE_ENV === "production") {
    return {
      send: async () => {
        throw new Error("No email delivery is configured. Set SMTP_HOST.");
      },
    };
  }
  return {
    send: async ({ to, text }) => {
      console.info(`[dev only] email to ${to}: ${text}`);
    },
  };
}

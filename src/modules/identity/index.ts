/**
 * The identity module's public interface for the rest of the app. Services are
 * built on first use, so `next build` does not need runtime secrets.
 */
import { requireEnv } from "@/lib/env";
import { createEncryptedFileStore } from "./adapters/encrypted-file-store";
import { createOtpSender } from "./adapters/otp-sender";
import { prismaAccountStore } from "./adapters/prisma-account-store";
import { prismaOtpStore } from "./adapters/prisma-otp-store";
import { prismaVerificationStore } from "./adapters/prisma-verification-store";
import {
  createAccountService,
  type AccountService,
} from "./services/account-service";
import { createOtpService, type OtpService } from "./services/otp-service";
import {
  createVerificationService,
  type VerificationService,
} from "./services/verification-service";

let otpService: OtpService | undefined;
let accountService: AccountService | undefined;
let verificationService: VerificationService | undefined;

export function getOtpService(): OtpService {
  return (otpService ??= createOtpService({
    store: prismaOtpStore,
    sender: createOtpSender(),
    secret: requireEnv("OTP_SECRET"),
  }));
}

export function getAccountService(): AccountService {
  return (accountService ??= createAccountService({
    otp: getOtpService(),
    store: prismaAccountStore,
  }));
}

export function getVerificationService(): VerificationService {
  return (verificationService ??= createVerificationService({
    store: prismaVerificationStore,
    files: createEncryptedFileStore({
      directory: requireEnv("DOCUMENT_STORAGE_DIR"),
      encryptionKey: Buffer.from(requireEnv("DOCUMENT_ENCRYPTION_KEY"), "base64"),
    }),
  }));
}

export { VERIFICATION_ERROR_MESSAGES } from "./services/verification-service";

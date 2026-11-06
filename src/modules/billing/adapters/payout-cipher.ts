import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { payoutDetailsSchema } from "../domain/biller";
import type { EncryptedPayout, PayoutCipher } from "../services/biller-service";

const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts payout details with AES-256-GCM. Each value is bound to its school,
 * so copying one school's stored details onto another fails to decrypt, even for
 * someone with write access to the database.
 */
export function createPayoutCipher(key: Buffer): PayoutCipher {
  if (key.length !== 32) {
    throw new Error("Payout encryption key must be 32 bytes");
  }

  return {
    encrypt(billerId, details) {
      const iv = randomBytes(12);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      cipher.setAAD(Buffer.from(billerId));
      const data = Buffer.concat([
        cipher.update(JSON.stringify(details), "utf8"),
        cipher.final(),
      ]);
      return {
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        data: data.toString("base64"),
      };
    },

    decrypt(billerId, { iv, tag, data }: EncryptedPayout) {
      const decipher = createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, "base64"),
      );
      decipher.setAAD(Buffer.from(billerId));
      decipher.setAuthTag(Buffer.from(tag, "base64"));
      const plain = Buffer.concat([
        decipher.update(Buffer.from(data, "base64")),
        decipher.final(),
      ]);
      return payoutDetailsSchema.parse(JSON.parse(plain.toString("utf8")));
    },
  };
}

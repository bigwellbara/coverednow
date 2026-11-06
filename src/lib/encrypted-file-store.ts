import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Private storage for documents. Keys are chosen by the implementation. */
export type DocumentFiles = {
  put(bytes: Uint8Array): Promise<string>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
};

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_PATTERN = /^[0-9a-f-]{36}$/;

/**
 * Keeps documents on private disk, encrypted with AES-256-GCM. The directory must
 * sit outside anything the web server serves. Swap this adapter for S3-compatible
 * storage when deploying somewhere without a persistent disk.
 *
 * The storage key is authenticated with each file, so a file renamed or moved to
 * another record fails to decrypt.
 */
export function createEncryptedFileStore(options: {
  directory: string;
  encryptionKey: Buffer;
}): DocumentFiles {
  const { directory, encryptionKey } = options;
  if (encryptionKey.length !== 32) {
    throw new Error("Document encryption key must be 32 bytes");
  }

  const pathFor = (key: string) => {
    if (!KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
    return path.join(directory, key);
  };

  return {
    async put(bytes) {
      const key = randomUUID();
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);
      cipher.setAAD(Buffer.from(key));
      const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);

      await mkdir(directory, { recursive: true });
      await writeFile(
        pathFor(key),
        Buffer.concat([iv, cipher.getAuthTag(), ciphertext]),
        { flag: "wx", mode: 0o600 },
      );
      return key;
    },

    async get(key) {
      const file = await readFile(pathFor(key));
      const decipher = createDecipheriv(
        ALGORITHM,
        encryptionKey,
        file.subarray(0, IV_BYTES),
      );
      decipher.setAAD(Buffer.from(key));
      decipher.setAuthTag(file.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
      return Buffer.concat([
        decipher.update(file.subarray(IV_BYTES + TAG_BYTES)),
        decipher.final(),
      ]);
    },

    async delete(key) {
      await rm(pathFor(key), { force: true });
    },
  };
}

import { createEncryptedFileStore, type DocumentFiles } from "./encrypted-file-store";
import { requireEnv } from "./env";

let store: DocumentFiles | undefined;

/** Private, encrypted storage for identity documents and fee statements. */
export function getDocumentStore(): DocumentFiles {
  return (store ??= createEncryptedFileStore({
    directory: requireEnv("DOCUMENT_STORAGE_DIR"),
    encryptionKey: Buffer.from(requireEnv("DOCUMENT_ENCRYPTION_KEY"), "base64"),
  }));
}

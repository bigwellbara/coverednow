import { randomBytes, randomUUID } from "node:crypto";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEncryptedFileStore } from "./encrypted-file-store";

const CONTENT = Buffer.from("%PDF-1.7 confidential identity document");

describe("encrypted file store", () => {
  let directory: string;
  const encryptionKey = randomBytes(32);
  const store = () => createEncryptedFileStore({ directory, encryptionKey });

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "coverednow-files-"));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("returns what was stored", async () => {
    const files = store();
    const key = await files.put(CONTENT);

    expect(Buffer.from(await files.get(key)).equals(CONTENT)).toBe(true);
  });

  it("does not write the document in the clear", async () => {
    const key = await store().put(CONTENT);
    const onDisk = await readFile(path.join(directory, key));

    expect(onDisk.includes("confidential")).toBe(false);
  });

  it("refuses to decrypt a tampered file", async () => {
    const files = store();
    const key = await files.put(CONTENT);
    const file = path.join(directory, key);
    const bytes = await readFile(file);
    bytes[bytes.length - 1]! ^= 0xff;
    await writeFile(file, bytes);

    await expect(files.get(key)).rejects.toThrow();
  });

  it("refuses a file moved to another storage key", async () => {
    const files = store();
    const key = await files.put(CONTENT);
    const otherKey = randomUUID();
    await copyFile(path.join(directory, key), path.join(directory, otherKey));

    await expect(files.get(otherKey)).rejects.toThrow();
  });

  it("refuses to decrypt with a different key", async () => {
    const key = await store().put(CONTENT);
    const other = createEncryptedFileStore({
      directory,
      encryptionKey: randomBytes(32),
    });

    await expect(other.get(key)).rejects.toThrow();
  });

  it("deletes files, and deleting twice is harmless", async () => {
    const files = store();
    const key = await files.put(CONTENT);

    await files.delete(key);
    await files.delete(key);

    await expect(files.get(key)).rejects.toThrow();
  });

  it.each(["../../etc/passwd", "..", "a/b", ""])(
    "rejects the path-like key %j",
    async (key) => {
      await expect(store().get(key)).rejects.toThrow("Invalid storage key");
      await expect(store().delete(key)).rejects.toThrow("Invalid storage key");
    },
  );

  it("refuses a key of the wrong length", () => {
    expect(() =>
      createEncryptedFileStore({ directory, encryptionKey: randomBytes(16) }),
    ).toThrow("32 bytes");
  });
});

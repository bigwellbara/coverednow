import { VerificationDocumentKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  DOCUMENT_KINDS,
  detectDocumentType,
  isEditable,
  isKindAllowed,
  missingRequirements,
  verificationStage,
} from "./verification";

describe("DOCUMENT_KINDS", () => {
  it("matches the enum in the Prisma schema", () => {
    expect([...DOCUMENT_KINDS].sort()).toEqual(
      Object.values(VerificationDocumentKind).sort(),
    );
  });
});

describe("missingRequirements", () => {
  const missing = (...args: Parameters<typeof missingRequirements>) =>
    missingRequirements(...args).map((r) => r.id);

  it("needs identity and enrollment from a student", () => {
    expect(missing("STUDENT", [])).toEqual(["identity", "enrollment"]);
    expect(missing("STUDENT", ["NATIONAL_ID"])).toEqual(["enrollment"]);
    expect(missing("STUDENT", ["BIRTH_CERTIFICATE", "ENROLLMENT_LETTER"])).toEqual(
      [],
    );
  });

  it("needs the guardian's own ID plus a student document", () => {
    expect(missing("GUARDIAN", [])).toEqual(["identity", "student"]);
    expect(missing("GUARDIAN", ["BIRTH_CERTIFICATE"])).toEqual(["identity"]);
    expect(missing("GUARDIAN", ["NATIONAL_ID"])).toEqual(["student"]);
    expect(missing("GUARDIAN", ["NATIONAL_ID", "STUDENT_ID"])).toEqual([]);
  });
});

describe("isKindAllowed", () => {
  it("allows every kind that satisfies a requirement for the role", () => {
    for (const kind of DOCUMENT_KINDS) {
      expect(isKindAllowed("STUDENT", kind)).toBe(true);
      expect(isKindAllowed("GUARDIAN", kind)).toBe(true);
    }
  });
});

describe("verificationStage", () => {
  const at = new Date("2027-01-01");

  it.each([
    [null, "DRAFT", true],
    [{ status: "PENDING", submittedAt: null }, "DRAFT", true],
    [{ status: "PENDING", submittedAt: at }, "IN_REVIEW", false],
    [{ status: "APPROVED", submittedAt: at }, "APPROVED", false],
    [{ status: "REJECTED", submittedAt: null }, "REJECTED", true],
  ] as const)("%j is %s", (verification, stage, editable) => {
    expect(verificationStage(verification)).toBe(stage);
    expect(isEditable(stage)).toBe(editable);
  });
});

describe("detectDocumentType", () => {
  const bytes = (text: string) => new TextEncoder().encode(text);

  it("recognises PDF, JPEG and PNG from their contents", () => {
    expect(detectDocumentType(bytes("%PDF-1.7 ..."))).toBe("application/pdf");
    expect(detectDocumentType(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0))).toBe(
      "image/jpeg",
    );
    expect(
      detectDocumentType(
        Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00),
      ),
    ).toBe("image/png");
  });

  it.each([
    ["HTML", "<html><script>alert(1)</script>"],
    ["SVG", "<svg xmlns='http://www.w3.org/2000/svg'/>"],
    ["empty file", ""],
    ["truncated signature", "%PD"],
  ])("rejects %s", (_name, content) => {
    expect(detectDocumentType(bytes(content))).toBeNull();
  });
});

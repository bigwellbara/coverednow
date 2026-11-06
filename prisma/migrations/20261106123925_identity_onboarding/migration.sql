/*
  Warnings:

  - You are about to drop the column `idDocUrl` on the `Verification` table. All the data in the column will be lost.
  - Added the required column `studentId` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VerificationDocumentKind" AS ENUM ('NATIONAL_ID', 'BIRTH_CERTIFICATE', 'STUDENT_ID', 'ENROLLMENT_LETTER');

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "studentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Verification" DROP COLUMN "idDocUrl",
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "kind" "VerificationDocumentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Student_ownerId_idx" ON "Student"("ownerId");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_ipHash_createdAt_idx" ON "OtpChallenge"("ipHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationDocument_storageKey_key" ON "VerificationDocument"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationDocument_sha256_key" ON "VerificationDocument"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationDocument_verificationId_kind_key" ON "VerificationDocument"("verificationId", "kind");

-- CreateIndex
CREATE INDEX "Bill_studentId_idx" ON "Bill"("studentId");

-- CreateIndex
CREATE INDEX "Verification_status_submittedAt_idx" ON "Verification"("status", "submittedAt");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

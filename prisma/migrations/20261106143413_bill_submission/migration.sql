/*
  Warnings:

  - You are about to drop the column `documentUrl` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `BillConfirmation` table. All the data in the column will be lost.
  - Added the required column `documentKey` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Bill_billerId_regNumber_term_key";

-- DropIndex
DROP INDEX "BillConfirmation_token_key";

-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "documentUrl",
ADD COLUMN     "closedReason" TEXT,
ADD COLUMN     "documentKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BillConfirmation" DROP COLUMN "token",
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BillConfirmation_billId_idx" ON "BillConfirmation"("billId");

-- Partial unique indexes, which Prisma cannot express in the schema. They only
-- cover active bills, so a rejected or withdrawn bill cannot block a real one.
CREATE UNIQUE INDEX "Bill_active_biller_reg_term_key" ON "Bill"("billerId", "regNumber", "term")
  WHERE "status" NOT IN ('REJECTED', 'CANCELLED');

CREATE UNIQUE INDEX "Bill_active_student_term_key" ON "Bill"("studentId", "term")
  WHERE "status" NOT IN ('REJECTED', 'CANCELLED');

CREATE UNIQUE INDEX "Bill_active_document_key" ON "Bill"("documentHash")
  WHERE "status" NOT IN ('REJECTED', 'CANCELLED');

-- DropIndex
DROP INDEX "Bill_status_idx";

-- DropIndex
DROP INDEX "Donation_billId_idx";

-- DropIndex
DROP INDEX "Donation_donorId_idx";

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "fundedAt" TIMESTAMP(3),
ADD COLUMN     "raisedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "pollUrl" TEXT,
ADD COLUMN     "providerRef" TEXT;

-- CreateIndex
CREATE INDEX "Bill_status_dueDate_idx" ON "Bill"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Donation_billId_status_idx" ON "Donation"("billId", "status");

-- CreateIndex
CREATE INDEX "Donation_donorId_createdAt_idx" ON "Donation"("donorId", "createdAt");

-- Bills the school already confirmed get the date it answered, for the public timeline.
UPDATE "Bill" AS b
SET "confirmedAt" = c."respondedAt"
FROM "BillConfirmation" AS c
WHERE c."billId" = b."id"
  AND c."status" IN ('CONFIRMED', 'CORRECTED')
  AND b."confirmedAt" IS NULL;

-- Money columns can't go wrong quietly.
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_raisedAmount_not_negative"
  CHECK ("raisedAmount" >= 0);
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_amounts_valid"
  CHECK ("amount" > 0 AND "platformTip" >= 0 AND "gatewayFee" >= 0);

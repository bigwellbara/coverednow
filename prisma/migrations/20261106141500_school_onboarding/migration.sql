-- AlterTable
ALTER TABLE "Biller" ALTER COLUMN "payoutMethod" DROP NOT NULL,
ALTER COLUMN "payoutDetails" DROP NOT NULL;

-- AlterTable
ALTER TABLE "BillerContact" ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "verificationNote" TEXT,
ADD COLUMN     "verifiedBy" TEXT;

-- CreateIndex
CREATE INDEX "BillerContact_billerId_idx" ON "BillerContact"("billerId");

-- CreateEnum
CREATE TYPE "CampaignKind" AS ENUM ('CIRCLE', 'COMPANY', 'OCCASION');

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "campaignId" TEXT;

-- AlterTable
ALTER TABLE "StudentUpdate" ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyUpdates" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "CampaignKind" NOT NULL,
    "title" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "goalAmount" DECIMAL(12,2) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "matcherName" TEXT,
    "matchCap" DECIMAL(12,2),
    "matchCheckedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_ownerId_idx" ON "Campaign"("ownerId");

-- CreateIndex
CREATE INDEX "Campaign_hiddenAt_createdAt_idx" ON "Campaign"("hiddenAt", "createdAt");

-- CreateIndex
CREATE INDEX "Donation_campaignId_status_idx" ON "Donation"("campaignId", "status");

-- CreateIndex
CREATE INDEX "StudentUpdate_billId_status_idx" ON "StudentUpdate"("billId", "status");

-- CreateIndex
CREATE INDEX "StudentUpdate_status_createdAt_idx" ON "StudentUpdate"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

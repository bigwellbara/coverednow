-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'GUARDIAN', 'DONOR', 'SCHOOL_CONTACT', 'ADMIN', 'SPONSOR');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'PENDING_SCHOOL', 'SCHOOL_CONFIRMED', 'PARTIALLY_FUNDED', 'FUNDED', 'PAID', 'RECEIPT_CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "BillCategory" AS ENUM ('SCHOOL_FEES');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'ALIAS', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "BillerType" AS ENUM ('UNIVERSITY', 'COLLEGE', 'HIGH_SCHOOL');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CORRECTED', 'REJECTED', 'RECEIPT');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('INITIATED', 'SETTLED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "UpdateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "idDocUrl" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Biller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BillerType" NOT NULL,
    "city" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "payoutMethod" TEXT NOT NULL,
    "payoutDetails" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Biller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillerContact" (
    "id" TEXT NOT NULL,
    "billerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "roleTitle" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "BillerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "billerId" TEXT NOT NULL,
    "regNumber" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "claimedAmount" DECIMAL(12,2) NOT NULL,
    "confirmedAmount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" "BillCategory" NOT NULL DEFAULT 'SCHOOL_FEES',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillConfirmation" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAmount" DECIMAL(12,2),
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "BillConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "platformTip" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gatewayFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "gatewayRef" TEXT NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'INITIATED',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "streakWeeks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DonorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorBadge" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonorBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "LeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentUpdate" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "UpdateStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_userId_key" ON "Verification"("userId");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_billerId_regNumber_term_key" ON "Bill"("billerId", "regNumber", "term");

-- CreateIndex
CREATE UNIQUE INDEX "BillConfirmation_token_key" ON "BillConfirmation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_gatewayRef_key" ON "Donation"("gatewayRef");

-- CreateIndex
CREATE INDEX "Donation_billId_idx" ON "Donation"("billId");

-- CreateIndex
CREATE INDEX "Donation_donorId_idx" ON "Donation"("donorId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_billId_key" ON "Payout"("billId");

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_createdAt_idx" ON "OutboxEvent"("processedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DonorProfile_userId_key" ON "DonorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DonorBadge_donorId_badgeId_key" ON "DonorBadge"("donorId", "badgeId");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_period_metric_rank_idx" ON "LeaderboardSnapshot"("period", "metric", "rank");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillerContact" ADD CONSTRAINT "BillerContact_billerId_fkey" FOREIGN KEY ("billerId") REFERENCES "Biller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_billerId_fkey" FOREIGN KEY ("billerId") REFERENCES "Biller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillConfirmation" ADD CONSTRAINT "BillConfirmation_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillConfirmation" ADD CONSTRAINT "BillConfirmation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "BillerContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorProfile" ADD CONSTRAINT "DonorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorBadge" ADD CONSTRAINT "DonorBadge_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "DonorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorBadge" ADD CONSTRAINT "DonorBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentUpdate" ADD CONSTRAINT "StudentUpdate_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

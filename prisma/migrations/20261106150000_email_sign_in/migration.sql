-- Emails collected at sign-up until now were never proven to belong to anyone.
-- From here on, a stored email is one that can sign in, so an unproven one could
-- hand an account to whoever signs up with that address. Clear them.
UPDATE "User" SET "email" = NULL;

-- Accounts can now sign up with just an email.
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Every account must keep a way to sign in. Prisma can't express this in the schema.
ALTER TABLE "User" ADD CONSTRAINT "User_has_sign_in_method"
  CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL);

-- Codes can now go to an email as well as a phone. Renamed, not replaced, to keep
-- the recent rows that sign-in rate limits are counted from.
ALTER TABLE "OtpChallenge" RENAME COLUMN "phone" TO "address";
ALTER INDEX "OtpChallenge_phone_createdAt_idx" RENAME TO "OtpChallenge_address_createdAt_idx";

-- Sign-up contacts, birthday, private photo and data consent (web app v2).
-- Idempotent so a re-run after a partial apply is harmless.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthday" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "facebook" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lineId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "photoBlobId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dataConsentAt" TIMESTAMP(3);

-- Round 7m: teachers' advance payments (เบิกล่วงหน้า) and reviews put in by an admin.
-- Additive only: one new table, new nullable columns, and Review."userId" made nullable (an admin's review has no
-- account; DROP NOT NULL keeps every existing value as it is). No row is written, changed or deleted; nothing is
-- dropped or renamed.

-- CreateTable
CREATE TABLE IF NOT EXISTS "FinAdvance" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT NOT NULL DEFAULT '',
    "reply" TEXT NOT NULL DEFAULT '',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT NOT NULL,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "slipBlobId" TEXT,
    "account" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "FinAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FinAdvance_period_idx" ON "FinAdvance"("period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FinAdvance_userId_idx" ON "FinAdvance"("userId");

-- AlterTable: the period an "advance" adjustment came from
ALTER TABLE "FinAdjustment" ADD COLUMN IF NOT EXISTS "ref" TEXT;

-- AlterTable: reviews put in by an admin
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "displayGrade" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "Review" ALTER COLUMN "userId" DROP NOT NULL;

-- Round 7i: new-member coupons, finance cutoffs and adjustments, Halloween 2569 dates.
-- Additive only: two new columns with defaults/nullable, one new table, two settings rows written.
-- Nothing existing is dropped, renamed or rewritten.

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "newOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FinPeriod" ADD COLUMN IF NOT EXISTS "cutoff" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FinAdjustment" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FinAdjustment_period_idx" ON "FinAdjustment"("period");

-- Halloween 2569 theme window (Thai time), owner's request
INSERT INTO "Setting" ("key", "value", "updatedAt") VALUES
  ('event_from', '2026-10-04T00:00', CURRENT_TIMESTAMP),
  ('event_until', '2026-10-31T23:59', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = EXCLUDED."updatedAt";

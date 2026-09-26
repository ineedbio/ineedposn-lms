-- Web app v4: teachers with several subjects, lesson files / hidden lessons / playlist sync,
-- where each course access came from, the new finance (expense approval, closed months, payouts)
-- and students from before the website. Additive and safe to re-run.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subjects" TEXT;
UPDATE "User" SET "subjects" = "instructorSubjectKey" WHERE "role" = 'INSTRUCTOR' AND "subjects" IS NULL AND "instructorSubjectKey" IS NOT NULL;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "playlists" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "teacherSplit" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "sourcePlaylist" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "files" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "billId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

ALTER TABLE "PayAccount" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- Expenses recorded on the old finance page stay as they are and count as approved.
ALTER TABLE "Expense" ALTER COLUMN "amount" TYPE DOUBLE PRECISION;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "decidedById" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "decidedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "FinPeriod" (
  "period" TEXT NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedBy" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "FinPeriod_pkey" PRIMARY KEY ("period")
);
CREATE TABLE IF NOT EXISTS "FinPayout" (
  "id" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subjects" TEXT NOT NULL DEFAULT '',
  "share" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "held" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paidAt" TIMESTAMP(3),
  "paidBy" TEXT,
  "note" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinPayout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FinPayout_period_idx" ON "FinPayout"("period");

CREATE TABLE IF NOT EXISTS "LegacyStudent" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "nickname" TEXT NOT NULL DEFAULT '',
  "norm" TEXT NOT NULL,
  "courseIds" TEXT NOT NULL,
  "batch" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'open',
  "userId" TEXT,
  "claimedAt" TIMESTAMP(3),
  "match" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegacyStudent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LegacyStudent_norm_idx" ON "LegacyStudent"("norm");

CREATE TABLE IF NOT EXISTS "LegacyClaim" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "legacyIds" TEXT NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedBy" TEXT,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "LegacyClaim_pkey" PRIMARY KEY ("id")
);

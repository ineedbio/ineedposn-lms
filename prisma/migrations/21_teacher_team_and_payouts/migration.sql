-- Rounds 3–4 (teacher profiles, course team / colour / price requests, payouts per subject).
-- Additive only: new columns with defaults and one new table. No existing row, column or table is changed.

-- Course: who teaches it (TeacherProfile ids), its colour, and a teacher's pending price/status request
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "teacherIds" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "accent" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "pendingChange" TEXT NOT NULL DEFAULT '';

-- FinPayout: one row per (subject, person) from now on, the transfer slip and the account it went to
ALTER TABLE "FinPayout" ADD COLUMN IF NOT EXISTS "subject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FinPayout" ADD COLUMN IF NOT EXISTS "slipBlobId" TEXT;
ALTER TABLE "FinPayout" ADD COLUMN IF NOT EXISTS "account" TEXT NOT NULL DEFAULT '';

-- Teacher profiles
CREATE TABLE IF NOT EXISTS "TeacherProfile" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "bio" JSONB NOT NULL DEFAULT '[]',
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL DEFAULT '',
    "accountNo" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("userId")
);

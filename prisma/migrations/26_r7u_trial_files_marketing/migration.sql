-- Round 7u: "where did you hear of INeedBio" at sign-up, free-chapter files for a 2-question survey, marketing page.
-- Additive only: new nullable columns, one column with a default (trial files off for every course), one new table.
-- No row is changed by hand, nothing is backfilled, dropped or renamed.

-- AlterTable: sign-up answers (null for members from before)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "heardFrom" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "heardNote" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ref" TEXT;

-- AlterTable: free-chapter files, off for every course until an admin turns it on
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "trialFiles" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "trialLabel" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrialLead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "goals" TEXT NOT NULL DEFAULT '',
    "help" TEXT NOT NULL DEFAULT '',
    "ref" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrialLead_courseId_idx" ON "TrialLead"("courseId");
CREATE INDEX IF NOT EXISTS "TrialLead_createdAt_idx" ON "TrialLead"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "TrialLead_userId_courseId_key" ON "TrialLead"("userId", "courseId");

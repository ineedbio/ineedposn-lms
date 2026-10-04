-- Round 7: cells (study streaks), course reviews, free-episode feedback, grade reports + personal coupons.
-- Additive only: new tables and one new nullable column. Nothing existing is dropped, renamed or rewritten.
-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Streak" (
    "userId" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "best" INTEGER NOT NULL DEFAULT 0,
    "lastDay" TEXT NOT NULL DEFAULT '',
    "freezes" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "theme" TEXT NOT NULL DEFAULT 'base',
    "lastRedeemAt" TIMESTAMP(3),
    "pingAt" TIMESTAMP(3),
    "posLessonId" TEXT NOT NULL DEFAULT '',
    "pos" INTEGER NOT NULL DEFAULT 0,
    "posAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StudyDay" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "credited" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyDay_pkey" PRIMARY KEY ("userId","day")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CellLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "day" TEXT NOT NULL DEFAULT '',
    "ref" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CellLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrialFeedback" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lesson" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "deviceId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GradeReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL DEFAULT '',
    "grades" JSONB NOT NULL DEFAULT '[]',
    "gpa" TEXT NOT NULL DEFAULT '',
    "exam" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "proofBlobId" TEXT,
    "consentPublish" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "GradeReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudyDay_day_idx" ON "StudyDay"("day");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CellLedger_userId_idx" ON "CellLedger"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_courseId_status_idx" ON "Review"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Review_userId_courseId_key" ON "Review"("userId", "courseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrialFeedback_courseId_idx" ON "TrialFeedback"("courseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GradeReport_status_idx" ON "GradeReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GradeReport_userId_year_term_key" ON "GradeReport"("userId", "year", "term");


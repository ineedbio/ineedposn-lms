-- APPLIED — already run against production (Neon). Kept only as a record of
-- what happened; do not run again (though every statement below is
-- idempotent via IF NOT EXISTS, so a re-run would be a harmless no-op).
--
-- Hotfix: schema drift — 3 columns exist in prisma/schema.prisma + app code
-- but were never added to the production database.
--
-- Cause of the "Application error: server-side exception" on / :
--   prisma.course.findMany() -> P2022 "column Course.paymentQrUrl does not exist"
--   (login also broken: lib/auth.ts selects User.avatarUrl)
--
-- Added by commits:
--   c1ab611  Lesson.isPreview
--   d1c68ac  User.avatarUrl, Course.paymentQrUrl
-- Both commit messages note the matching ALTER TABLE was "given to the user
-- separately" — it was never run.
--
-- Run in: Neon Console (console.neon.tech) -> project -> SQL Editor -> paste all -> Run
-- Safe: all additive, nullable or defaulted, no data loss, no backfill.

-- 1. Inspect what the DB actually has right now (optional, run on its own first)
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('User', 'Course', 'Lesson')
ORDER BY table_name, column_name;

-- 2. Apply the missing columns (idempotent — safe to re-run)
ALTER TABLE "User"   ADD COLUMN IF NOT EXISTS "avatarUrl"    TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "paymentQrUrl" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "isPreview"    BOOLEAN NOT NULL DEFAULT false;

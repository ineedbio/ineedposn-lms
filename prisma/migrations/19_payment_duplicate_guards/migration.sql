-- Guards against the same purchase being recorded twice (income counted twice).
--  1. One open slip request per student + course (a double tap on "ส่งสลิป" can't create two).
--  2. A bill records each of its courses once.
-- The app checks the other paths (slip approved after a bill, bill approved after a slip). Each index is only
-- created when the existing rows already satisfy it, so this never fails a deploy; any older duplicates are
-- flagged "อาจซ้ำ" in รายรับรายจ่าย for an admin to delete. Safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Payment" WHERE "status" = 'PENDING' GROUP BY "userId", "courseId" HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "Payment_one_pending_per_course" ON "Payment" ("userId", "courseId") WHERE "status" = 'PENDING';
  ELSE
    RAISE NOTICE 'Payment_one_pending_per_course skipped: duplicate pending requests exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "Payment" WHERE "billId" IS NOT NULL GROUP BY "billId", "courseId" HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "Payment_bill_course_once" ON "Payment" ("billId", "courseId") WHERE "billId" IS NOT NULL;
  ELSE
    RAISE NOTICE 'Payment_bill_course_once skipped: a bill already has a course recorded twice';
  END IF;
END
$$;

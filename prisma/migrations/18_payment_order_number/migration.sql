-- Order numbers for admins: {PREFIX}-{4-digit running number}, one sequence per subject
-- (BIO-0001, CHEM-0001, PHYS-0001, MATH-0001). Admin-only: a running number reveals how much a subject
-- has sold, so the API never sends it to students (their reference stays the random bill / request id).
-- A trigger numbers every new Payment row, whichever code path creates it (bills, slips, grants, old
-- students, ฿0 bills). Existing rows are numbered in order of creation. Safe to re-run.

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderNumber_key" ON "Payment"("orderNumber");

CREATE TABLE IF NOT EXISTS "OrderCounter" (
  "prefix" TEXT NOT NULL,
  "last" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OrderCounter_pkey" PRIMARY KEY ("prefix")
);

-- Same mapping as lib/ib/subjects.ts (subject slug/name → bio | chem | phys | math).
CREATE OR REPLACE FUNCTION ib_order_prefix(course_id text) RETURNS text LANGUAGE sql STABLE AS $fn$
  SELECT COALESCE((
    SELECT CASE
      WHEN t ~ '(chem|เคมี)' THEN 'CHEM'
      WHEN t ~ '(phys|ฟิสิก)' THEN 'PHYS'
      WHEN t ~ '(math|คณิต)' THEN 'MATH'
      ELSE 'BIO' END
    FROM (SELECT lower(COALESCE(s."slug", '') || ' ' || COALESCE(s."name", '')) AS t
          FROM "Course" c JOIN "Subject" s ON s."id" = c."subjectId" WHERE c."id" = course_id) x
  ), 'BIO');
$fn$;
CREATE OR REPLACE FUNCTION ib_order_label(prefix text, n integer) RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT prefix || '-' || CASE WHEN n > 9999 THEN n::text ELSE lpad(n::text, 4, '0') END;
$fn$;

-- Existing rows: number them per subject in the order they were created, after any number already given.
WITH base AS (
  SELECT p."id", ib_order_prefix(p."courseId") AS pre, p."createdAt"
  FROM "Payment" p WHERE p."orderNumber" IS NULL
), numbered AS (
  SELECT b."id", b.pre,
         COALESCE((SELECT oc."last" FROM "OrderCounter" oc WHERE oc."prefix" = b.pre), 0)
           + row_number() OVER (PARTITION BY b.pre ORDER BY b."createdAt", b."id") AS n
  FROM base b
)
UPDATE "Payment" p SET "orderNumber" = ib_order_label(n.pre, n.n::int) FROM numbered n WHERE p."id" = n."id";

INSERT INTO "OrderCounter" ("prefix", "last")
SELECT split_part("orderNumber", '-', 1), max(split_part("orderNumber", '-', 2)::int)
FROM "Payment" WHERE "orderNumber" ~ '^[A-Z]+-[0-9]+$' GROUP BY 1
ON CONFLICT ("prefix") DO UPDATE SET "last" = GREATEST("OrderCounter"."last", EXCLUDED."last");

-- New rows: the counter row is locked while it counts, so two payments at once never share a number.
CREATE OR REPLACE FUNCTION ib_payment_number() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE pre text; n integer;
BEGIN
  IF NEW."orderNumber" IS NOT NULL THEN RETURN NEW; END IF;
  pre := ib_order_prefix(NEW."courseId");
  INSERT INTO "OrderCounter" ("prefix", "last") VALUES (pre, 1)
  ON CONFLICT ("prefix") DO UPDATE SET "last" = "OrderCounter"."last" + 1
  RETURNING "last" INTO n;
  NEW."orderNumber" := ib_order_label(pre, n);
  RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS "ib_payment_number" ON "Payment";
CREATE TRIGGER "ib_payment_number" BEFORE INSERT ON "Payment" FOR EACH ROW EXECUTE FUNCTION ib_payment_number();

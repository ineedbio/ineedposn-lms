-- ib_merge_course(draft_slug, published_slug): move everything from a leftover/duplicate course to the real
-- one, for pairs that migration 16 can't find by itself (e.g. different titles). Run it in Neon → SQL Editor:
--     select ib_merge_course('phys-posn-mechanics', 'phys-alevel');
-- Moves enrollments (a student with both keeps the better access: active, no end date wins), payment
-- records, expenses, and the course slug in old-student lists, bundles and discount codes; renames the
-- old course so it isn't picked again; writes a line in หลังบ้าน → บันทึกการแก้ไข. Returns a summary.
-- Refuses when the old course is still for sale, the target isn't, or the subjects differ (pass
-- allow_other_subject => true to allow that on purpose). Running it again for the same pair does nothing.
CREATE OR REPLACE FUNCTION ib_merge_course(draft_slug text, published_slug text, allow_other_subject boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql AS $fn$
DECLARE
  d "Course"%ROWTYPE;
  p "Course"%ROWTYPE;
  n_both int; n_moved int; n_pay int; n_exp int; n_leg int; n_bun int; n_cou int;
  msg text;
BEGIN
  SELECT * INTO d FROM "Course" WHERE "slug" = draft_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบคอร์ส %', draft_slug; END IF;
  SELECT * INTO p FROM "Course" WHERE "slug" = published_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบคอร์ส %', published_slug; END IF;
  IF d."id" = p."id" THEN RAISE EXCEPTION 'ใส่คอร์สเดียวกันทั้งสองช่อง'; END IF;
  IF d."isPublished" THEN RAISE EXCEPTION 'คอร์ส % ยังเปิดขายอยู่ ปิดการขายในหลังบ้านก่อน แล้วค่อยรวม', draft_slug; END IF;
  IF NOT p."isPublished" THEN RAISE EXCEPTION 'คอร์สปลายทาง % ยังไม่เปิดขาย', published_slug; END IF;
  IF d."subjectId" <> p."subjectId" AND NOT allow_other_subject THEN
    RAISE EXCEPTION 'สองคอร์สนี้อยู่คนละวิชา ถ้าตั้งใจรวมจริง ใช้ select ib_merge_course(''%'', ''%'', true);', draft_slug, published_slug;
  END IF;

  -- Access: already on the target → keep the better of the two there; otherwise move the row.
  UPDATE "Enrollment" t SET
    "status" = 'ACTIVE',
    "enrolledAt" = COALESCE(t."enrolledAt", e."enrolledAt"),
    "expiresAt" = CASE
      WHEN (t."status" = 'ACTIVE' AND t."expiresAt" IS NULL) OR e."expiresAt" IS NULL THEN NULL
      WHEN t."status" = 'ACTIVE' THEN GREATEST(t."expiresAt", e."expiresAt")
      ELSE e."expiresAt" END
  FROM "Enrollment" e
  WHERE e."courseId" = d."id" AND t."courseId" = p."id" AND t."userId" = e."userId" AND e."status" = 'ACTIVE';
  DELETE FROM "Enrollment" e
  WHERE e."courseId" = d."id" AND EXISTS (SELECT 1 FROM "Enrollment" t WHERE t."courseId" = p."id" AND t."userId" = e."userId");
  GET DIAGNOSTICS n_both = ROW_COUNT;
  UPDATE "Enrollment" SET "courseId" = p."id" WHERE "courseId" = d."id";
  GET DIAGNOSTICS n_moved = ROW_COUNT;

  UPDATE "Payment" SET "courseId" = p."id" WHERE "courseId" = d."id";
  GET DIAGNOSTICS n_pay = ROW_COUNT;
  UPDATE "Expense" SET "courseId" = p."id" WHERE "courseId" = d."id";
  GET DIAGNOSTICS n_exp = ROW_COUNT;

  UPDATE "LegacyStudent" l SET "courseIds" = (
    SELECT string_agg(DISTINCT CASE WHEN s = d."slug" THEN p."slug" ELSE s END, ',') FROM unnest(string_to_array(l."courseIds", ',')) s)
  WHERE d."slug" = ANY (string_to_array(l."courseIds", ','));
  GET DIAGNOSTICS n_leg = ROW_COUNT;
  UPDATE "Bundle" b SET "courseIds" = (
    SELECT string_agg(DISTINCT CASE WHEN s = d."slug" THEN p."slug" ELSE s END, ',') FROM unnest(string_to_array(b."courseIds", ',')) s)
  WHERE d."slug" = ANY (string_to_array(b."courseIds", ','));
  GET DIAGNOSTICS n_bun = ROW_COUNT;
  UPDATE "Coupon" c SET "targets" = (
    SELECT string_agg(DISTINCT CASE WHEN s = d."slug" THEN p."slug" ELSE s END, ',') FROM unnest(string_to_array(c."targets", ',')) s)
  WHERE c."scope" = 'course' AND d."slug" = ANY (string_to_array(c."targets", ','));
  GET DIAGNOSTICS n_cou = ROW_COUNT;

  IF position('ฉบับร่างเก่า' in d."title") = 0 THEN
    UPDATE "Course" SET "title" = d."title" || ' (ฉบับร่างเก่า · ใช้ ' || upper(p."slug") || ' แทน)' WHERE "id" = d."id";
  END IF;

  msg := d."slug" || ' → ' || p."slug" || ': ย้ายสิทธิ์ ' || n_moved || ' คน, รวมกับสิทธิ์เดิม ' || n_both || ' คน, ประวัติชำระเงิน ' || n_pay ||
         ', รายจ่าย ' || n_exp || ', รายชื่อนักเรียนเก่า ' || n_leg || ', แพ็กเกจ ' || n_bun || ', โค้ดส่วนลด ' || n_cou;
  INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "createdAt")
  VALUES ('merge' || md5(random()::text || clock_timestamp()::text), 'SYSTEM', 'ib.course.merge', left(msg, 500), now());
  RETURN msg;
END
$fn$;

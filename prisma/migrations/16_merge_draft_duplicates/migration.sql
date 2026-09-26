-- Duplicate courses: a draft (unpublished) course with the same title and subject as a published
-- one — e.g. the old site's demo "ชีววิทยา สอวน. ค่าย 1" (bio-posn-camp1, placeholder lessons, no
-- videos) next to the real one (bio-posn, 100 videos). Students granted or imported into the draft
-- saw the empty draft. Every access and record on such a draft moves to the published course, and the
-- draft is renamed so it can't be picked by mistake again. Safe to re-run (a renamed draft no longer
-- matches). Only when the published title is unique, so nothing is merged on a guess.

DROP TABLE IF EXISTS "_dup";
CREATE TEMP TABLE "_dup" AS
SELECT d."id" AS draft_id, d."slug" AS draft_slug, p."id" AS pub_id, p."slug" AS pub_slug
FROM "Course" d
JOIN "Course" p
  ON p."isPublished" AND NOT d."isPublished" AND p."subjectId" = d."subjectId"
 AND lower(regexp_replace(p."title", '\s', '', 'g')) = lower(regexp_replace(d."title", '\s', '', 'g'))
WHERE (SELECT count(*) FROM "Course" q
       WHERE q."isPublished" AND lower(regexp_replace(q."title", '\s', '', 'g')) = lower(regexp_replace(p."title", '\s', '', 'g'))) = 1;

-- Access: the student already has a row on the published course → give it the better of the two
-- (active; no end date wins over an end date), then drop the draft row. Otherwise move the row.
UPDATE "Enrollment" t SET
  "status" = 'ACTIVE',
  "enrolledAt" = COALESCE(t."enrolledAt", e."enrolledAt"),
  "expiresAt" = CASE
    WHEN (t."status" = 'ACTIVE' AND t."expiresAt" IS NULL) OR e."expiresAt" IS NULL THEN NULL
    WHEN t."status" = 'ACTIVE' THEN GREATEST(t."expiresAt", e."expiresAt")
    ELSE e."expiresAt" END
FROM "Enrollment" e JOIN "_dup" x ON e."courseId" = x.draft_id
WHERE t."courseId" = x.pub_id AND t."userId" = e."userId" AND e."status" = 'ACTIVE';
DELETE FROM "Enrollment" e USING "_dup" x
WHERE e."courseId" = x.draft_id
  AND EXISTS (SELECT 1 FROM "Enrollment" t WHERE t."courseId" = x.pub_id AND t."userId" = e."userId");
UPDATE "Enrollment" e SET "courseId" = x.pub_id FROM "_dup" x WHERE e."courseId" = x.draft_id;

-- Payment history (grants, old-student records, slips) and expenses follow the course.
UPDATE "Payment" p SET "courseId" = x.pub_id FROM "_dup" x WHERE p."courseId" = x.draft_id;
UPDATE "Expense" p SET "courseId" = x.pub_id FROM "_dup" x WHERE p."courseId" = x.draft_id;

-- Lists that keep course slugs: old-student lists, bundles, discount codes.
UPDATE "LegacyStudent" l SET "courseIds" = (
  SELECT string_agg(DISTINCT CASE WHEN s = x.draft_slug THEN x.pub_slug ELSE s END, ',')
  FROM unnest(string_to_array(l."courseIds", ',')) s)
FROM "_dup" x WHERE x.draft_slug = ANY (string_to_array(l."courseIds", ','));
UPDATE "Bundle" b SET "courseIds" = (
  SELECT string_agg(DISTINCT CASE WHEN s = x.draft_slug THEN x.pub_slug ELSE s END, ',')
  FROM unnest(string_to_array(b."courseIds", ',')) s)
FROM "_dup" x WHERE x.draft_slug = ANY (string_to_array(b."courseIds", ','));
UPDATE "Coupon" c SET "targets" = (
  SELECT string_agg(DISTINCT CASE WHEN s = x.draft_slug THEN x.pub_slug ELSE s END, ',')
  FROM unnest(string_to_array(c."targets", ',')) s)
FROM "_dup" x WHERE c."scope" = 'course' AND x.draft_slug = ANY (string_to_array(c."targets", ','));

-- Keep the draft (and its lessons) for the record, but make it obvious in หลังบ้าน.
UPDATE "Course" c SET "title" = c."title" || ' (ฉบับร่างเก่า · ใช้ ' || upper(x.pub_slug) || ' แทน)', "isPublished" = false
FROM "_dup" x WHERE c."id" = x.draft_id;

DROP TABLE "_dup";

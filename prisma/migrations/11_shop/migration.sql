-- Safe to run again: every statement skips what already exists (an earlier copy of this
-- migration ran on some databases under the name 10_shop).
-- Shop for the web app: cart → orders → one bill per receiving account, discount codes,
-- bundles, receiving accounts, and a second instructor per course (backend/Code.gs "ร้านค้า").

-- AlterTable
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "instructor2Bio" TEXT,
ADD COLUMN IF NOT EXISTS "instructor2Name" TEXT,
ADD COLUMN IF NOT EXISTS "instructor2Photo" TEXT,
ADD COLUMN IF NOT EXISTS "instructor2Title" TEXT,
ADD COLUMN IF NOT EXISTS "payAccountId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayAccount" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'promptpay',
    "promptpayId" TEXT NOT NULL DEFAULT '',
    "bank" TEXT NOT NULL DEFAULT '',
    "accountNo" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL,
    "qrUrl" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "ig" TEXT NOT NULL DEFAULT '',
    "subjects" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Bundle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "courseIds" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Coupon" (
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'percent',
    "value" DOUBLE PRECISION NOT NULL,
    "maxDiscount" INTEGER,
    "scope" TEXT NOT NULL DEFAULT 'all',
    "targets" TEXT NOT NULL DEFAULT '',
    "minTotal" INTEGER,
    "maxUses" INTEGER,
    "perUser" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "couponCode" TEXT,
    "payTermsHash" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Bill" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "account" JSONB NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "proof" JSONB,
    "slipBlobId" TEXT,
    "slipHash" TEXT,
    "submittedAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopOrder_userId_idx" ON "ShopOrder"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopOrder_couponCode_idx" ON "ShopOrder"("couponCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Bill_userId_idx" ON "Bill"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Bill_slipHash_idx" ON "Bill"("slipHash");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShopOrder_userId_fkey') THEN
    ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Bill_orderId_fkey') THEN
    ALTER TABLE "Bill" ADD CONSTRAINT "Bill_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Bill_userId_fkey') THEN
    ALTER TABLE "Bill" ADD CONSTRAINT "Bill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


-- Math by term (ม.4–ม.6), created as drafts: add the videos, then set them to "เปิดขาย".
INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","instructor2Name","instructor2Title","instructor2Bio","instructor2Photo","subjectId","categoryId")
SELECT 'ib-course-math-m4-t1', 'คณิต ม.4 เทอม 1', 'math-m4-t1', 'คณิตศาสตร์ ม.4 เทอม 1 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้', '/images/courses/math-m4-t1.webp', 490, false, 'เซต · ตรรกศาสตร์ · จำนวนจริง', 'ม.4', 100, 'ครบบท เซต
ครบบท ตรรกศาสตร์
ครบบท จำนวนจริง
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690', 'นักเรียน ม.4 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต', 'พี่พร้อม', 'ภวัต เศรษฐเสถียร', 'นักศึกษาคณะวิศวกรรมศาสตร์ สาขาหุ่นยนต์และปัญญาประดิษฐ์ มหาวิทยาลัยเชียงใหม่
สอวน. ชีววิทยา ศูนย์มหาวิทยาลัยนเรศวร
นักเรียนดีเด่น GPAX 4.00 (2566)
เหรียญเงินการแข่งขันหุ่นยนต์ระดับอาเซียน', '/images/courses/pprom.webp', NULL, NULL, NULL, NULL, s."id", cat."id" FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'math' AND cat."id" = 'demo-cat-math'
ON CONFLICT DO NOTHING;
INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","instructor2Name","instructor2Title","instructor2Bio","instructor2Photo","subjectId","categoryId")
SELECT 'ib-course-math-m4-t2', 'คณิต ม.4 เทอม 2', 'math-m4-t2', 'คณิตศาสตร์ ม.4 เทอม 2 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้', '/images/courses/math-m4-t2.webp', 490, false, 'ความสัมพันธ์และฟังก์ชัน · เอกซ์โพเนนเชียลและลอการิทึม', 'ม.4', 101, 'ครบบท ความสัมพันธ์และฟังก์ชัน
ครบบท ฟังก์ชันเอกซ์โพเนนเชียลและฟังก์ชันลอการิทึม
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690', 'นักเรียน ม.4 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต', 'พี่พร้อม', 'ภวัต เศรษฐเสถียร', 'นักศึกษาคณะวิศวกรรมศาสตร์ สาขาหุ่นยนต์และปัญญาประดิษฐ์ มหาวิทยาลัยเชียงใหม่
สอวน. ชีววิทยา ศูนย์มหาวิทยาลัยนเรศวร
นักเรียนดีเด่น GPAX 4.00 (2566)
เหรียญเงินการแข่งขันหุ่นยนต์ระดับอาเซียน', '/images/courses/pprom.webp', NULL, NULL, NULL, NULL, s."id", cat."id" FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'math' AND cat."id" = 'demo-cat-math'
ON CONFLICT DO NOTHING;
INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","instructor2Name","instructor2Title","instructor2Bio","instructor2Photo","subjectId","categoryId")
SELECT 'ib-course-math-m5-t1', 'คณิต ม.5 เทอม 1', 'math-m5-t1', 'คณิตศาสตร์ ม.5 เทอม 1 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้', '/images/courses/math-m5-t1.webp', 490, false, 'ฟังก์ชันตรีโกณมิติ · เมทริกซ์ · เวกเตอร์', 'ม.5', 102, 'ครบบท ฟังก์ชันตรีโกณมิติ
ครบบท เมทริกซ์
ครบบท เวกเตอร์
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690', 'นักเรียน ม.5 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต', 'พี่น้ำแข็ง', 'ศุภณัฐ กล้าจริง', NULL, '/images/courses/pnk.webp', NULL, NULL, NULL, NULL, s."id", cat."id" FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'math' AND cat."id" = 'demo-cat-math'
ON CONFLICT DO NOTHING;
INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","instructor2Name","instructor2Title","instructor2Bio","instructor2Photo","subjectId","categoryId")
SELECT 'ib-course-math-m5-t2', 'คณิต ม.5 เทอม 2', 'math-m5-t2', 'คณิตศาสตร์ ม.5 เทอม 2 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้', '/images/courses/math-m5-t2.webp', 490, false, 'จำนวนเชิงซ้อน · หลักการนับเบื้องต้น · ความน่าจะเป็น', 'ม.5', 103, 'ครบบท จำนวนเชิงซ้อน
ครบบท หลักการนับเบื้องต้น
ครบบท ความน่าจะเป็น
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690', 'นักเรียน ม.5 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต', 'พี่น้ำแข็ง', 'ศุภณัฐ กล้าจริง', NULL, '/images/courses/pnk.webp', NULL, NULL, NULL, NULL, s."id", cat."id" FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'math' AND cat."id" = 'demo-cat-math'
ON CONFLICT DO NOTHING;
INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","instructor2Name","instructor2Title","instructor2Bio","instructor2Photo","subjectId","categoryId")
SELECT 'ib-course-math-m6-t1', 'คณิต ม.6 เทอม 1', 'math-m6-t1', 'คณิตศาสตร์ ม.6 เทอม 1 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้', '/images/courses/math-m6-t1.webp', 490, false, 'ลำดับและอนุกรม · แคลคูลัสเบื้องต้น', 'ม.6', 104, 'ครบบท ลำดับและอนุกรม
ครบบท แคลคูลัสเบื้องต้น
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690', 'นักเรียน ม.6 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต', 'พี่พร้อม', 'ภวัต เศรษฐเสถียร', 'นักศึกษาคณะวิศวกรรมศาสตร์ สาขาหุ่นยนต์และปัญญาประดิษฐ์ มหาวิทยาลัยเชียงใหม่
สอวน. ชีววิทยา ศูนย์มหาวิทยาลัยนเรศวร
นักเรียนดีเด่น GPAX 4.00 (2566)
เหรียญเงินการแข่งขันหุ่นยนต์ระดับอาเซียน', '/images/courses/pprom.webp', 'พี่น้ำแข็ง', 'ศุภณัฐ กล้าจริง', NULL, '/images/courses/pnk.webp', s."id", cat."id" FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'math' AND cat."id" = 'demo-cat-math'
ON CONFLICT DO NOTHING;
INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","instructor2Name","instructor2Title","instructor2Bio","instructor2Photo","subjectId","categoryId")
SELECT 'ib-course-math-m6-t2', 'คณิต ม.6 เทอม 2', 'math-m6-t2', 'คณิตศาสตร์ ม.6 เทอม 2 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้', '/images/courses/math-m6-t2.webp', 490, false, 'สถิติและข้อมูล · ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น', 'ม.6', 105, 'ครบบท สถิติและข้อมูล
ครบบท ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690', 'นักเรียน ม.6 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต', 'พี่พร้อม', 'ภวัต เศรษฐเสถียร', 'นักศึกษาคณะวิศวกรรมศาสตร์ สาขาหุ่นยนต์และปัญญาประดิษฐ์ มหาวิทยาลัยเชียงใหม่
สอวน. ชีววิทยา ศูนย์มหาวิทยาลัยนเรศวร
นักเรียนดีเด่น GPAX 4.00 (2566)
เหรียญเงินการแข่งขันหุ่นยนต์ระดับอาเซียน', '/images/courses/pprom.webp', 'พี่น้ำแข็ง', 'ศุภณัฐ กล้าจริง', NULL, '/images/courses/pnk.webp', s."id", cat."id" FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'math' AND cat."id" = 'demo-cat-math'
ON CONFLICT DO NOTHING;
-- Bundles show on the site once every course in them is "เปิดขาย".
INSERT INTO "Bundle" ("id","title","subtitle","courseIds","price","coverUrl","status","sortOrder") VALUES ('ib-bundle-math-m4','คณิต ม.4 ทั้งปี (เทอม 1 + 2)','สอนโดย พี่พร้อม · ซื้อแยกเทอมละ 490','math-m4-t1,math-m4-t2',690,'/images/courses/math-m4.webp','active',1) ON CONFLICT DO NOTHING;
INSERT INTO "Bundle" ("id","title","subtitle","courseIds","price","coverUrl","status","sortOrder") VALUES ('ib-bundle-math-m5','คณิต ม.5 ทั้งปี (เทอม 1 + 2)','สอนโดย พี่น้ำแข็ง · ซื้อแยกเทอมละ 490','math-m5-t1,math-m5-t2',690,'/images/courses/math-m5.webp','active',2) ON CONFLICT DO NOTHING;
INSERT INTO "Bundle" ("id","title","subtitle","courseIds","price","coverUrl","status","sortOrder") VALUES ('ib-bundle-math-m6','คณิต ม.6 ทั้งปี (เทอม 1 + 2)','สอนโดย พี่พร้อม และพี่น้ำแข็ง · ซื้อแยกเทอมละ 490','math-m6-t1,math-m6-t2',690,'/images/courses/math-m6.webp','active',3) ON CONFLICT DO NOTHING;
INSERT INTO "Bundle" ("id","title","subtitle","courseIds","price","coverUrl","status","sortOrder") VALUES ('ib-bundle-math-all','คณิตครบ ม.4–ม.6 (6 เทอม)','สอนโดย พี่พร้อม และพี่น้ำแข็ง · ครบ 6 เล่ม ประหยัดกว่าซื้อแยก 1,050','math-m4-t1,math-m4-t2,math-m5-t1,math-m5-t2,math-m6-t1,math-m6-t2',1890,'/images/courses/math-all.webp','active',4) ON CONFLICT DO NOTHING;
-- Course covers shipped with the site, only where no cover has been set.
UPDATE "Course" SET "coverImage" = '/images/courses/bio-posn.webp' WHERE "slug" = 'bio-posn' AND ("coverImage" IS NULL OR "coverImage" = '');
UPDATE "Course" SET "coverImage" = '/images/courses/chem-posn.webp' WHERE "slug" = 'chem-posn' AND ("coverImage" IS NULL OR "coverImage" = '');

-- The real ชีววิทยา สอวน. lessons (backend/bio-lessons.txt, 100 episodes). Only applied while the course
-- still has just the placeholder lessons without videos; those placeholders are removed.
DELETE FROM "Lesson" l WHERE l."courseId" = 'ib-course-bio-posn' AND l."youtubeUrl" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = 'ib-course-bio-posn' AND x."youtubeUrl" IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM "Quiz" z WHERE z."lessonId" = l."id");
INSERT INTO "Lesson" ("id","title","order","type","youtubeUrl","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.url, v.dur, v.chapter, v.prev, 'ib-course-bio-posn' FROM (VALUES
  ('ib-l-bio-posn-ep1','ปูพื้นฐาน EP.1',10,'https://youtu.be/DlkzZPzK1CU',7500,'ปูพื้นฐาน › ปูพื้นฐาน 6 ชั่วโมง (แถมฟรี)',true),
  ('ib-l-bio-posn-ep2','ปูพื้นฐาน EP.2',20,'https://youtu.be/Kw7oR66KNlM',6960,'ปูพื้นฐาน › ปูพื้นฐาน 6 ชั่วโมง (แถมฟรี)',false),
  ('ib-l-bio-posn-ep3','ปูพื้นฐาน EP.3',30,'https://youtu.be/EUE0D62929w',6540,'ปูพื้นฐาน › ปูพื้นฐาน 6 ชั่วโมง (แถมฟรี)',false),
  ('ib-l-bio-posn-ep4','ปูพื้นฐาน EP.4',40,'https://youtu.be/Pi6DFELKVOA',3000,'ปูพื้นฐาน › ปูพื้นฐาน 6 ชั่วโมง (แถมฟรี)',false),
  ('ib-l-bio-posn-ep5','EP.1 Introduction to Biology, Microscopic',50,'https://youtu.be/aksZlMPVxrU',8280,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › พื้นฐานชีววิทยาและชีวเคมี',false),
  ('ib-l-bio-posn-ep6','EP.2 BioChemistry 1',60,'https://youtu.be/POOv2eKOrYk',7320,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › พื้นฐานชีววิทยาและชีวเคมี',false),
  ('ib-l-bio-posn-ep7','EP.3 BioChemistry 2',70,'https://youtu.be/BpwbcnHSt2Q',8100,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › พื้นฐานชีววิทยาและชีวเคมี',false),
  ('ib-l-bio-posn-ep8','EP.4 Cell and Organelles',80,'https://youtu.be/tmpGsw8Y7rY',6960,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › เซลล์',false),
  ('ib-l-bio-posn-ep9','EP.5 Cell Transport',90,'https://youtu.be/TItLo-IGMAc',7920,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › เซลล์',false),
  ('ib-l-bio-posn-ep10','EP.6 Introduction to Cell Division',100,'https://youtu.be/d7cNZvhbI1A',3420,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › เซลล์',false),
  ('ib-l-bio-posn-ep11','EP.7 Cell Division',110,'https://youtu.be/Y3kT-NMUiTU',7560,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › เซลล์',false),
  ('ib-l-bio-posn-ep12','EP.8 Cellular Respiration Ver.น่ารัก',120,'https://youtu.be/I8WZvGZkoc8',4020,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › เซลล์',false),
  ('ib-l-bio-posn-ep13','EP.9 Cellular Respiration ver.อิหยังวะ',130,'https://youtu.be/H5JhE54hzN0',4920,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › เซลล์',false),
  ('ib-l-bio-posn-ep14','EP.10 สรุปกลุ่ม Cell',140,'https://youtu.be/bbeK25iNfhk',3660,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › เซลล์',false),
  ('ib-l-bio-posn-ep15','EP.11 Molecular Genetics',150,'https://youtu.be/7BecEvC5vEE',6660,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › อณูพันธุศาสตร์',false),
  ('ib-l-bio-posn-ep16','EP.12 ทบทวน Molecular Genetics + ทำโจทย์',160,'https://youtu.be/6fobUdfyGwc',6900,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › อณูพันธุศาสตร์',false),
  ('ib-l-bio-posn-ep17','EP.13 Molecular Genetics + DNA Technology',170,'https://youtu.be/i79cz2lnMF0',5160,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › อณูพันธุศาสตร์',false),
  ('ib-l-bio-posn-ep18','EP.14 เฉลยการบ้าน + วิวัฒนาการ',180,'https://youtu.be/yYLxWLt-U6s',6540,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › วิวัฒนาการและพันธุศาสตร์',false),
  ('ib-l-bio-posn-ep19','EP.15 พันธุศาสตร์ประชากร + กฎข้อที่ 1 ของเมนเดล',190,'https://youtu.be/ql33QWqKbOE',3420,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › วิวัฒนาการและพันธุศาสตร์',false),
  ('ib-l-bio-posn-ep20','EP.16 เฉลยการบ้าน + กฎข้อที่ 2 ของเมนเดล + นอกเหนือเมนเดล',200,'https://youtu.be/KuAtudjHtOE',9000,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › วิวัฒนาการและพันธุศาสตร์',false),
  ('ib-l-bio-posn-ep21','EP.17 เฉลยการบ้าน + นอกเหนือเมนเดล + Pedigree',210,'https://youtu.be/pqE9YfC9HD4',6120,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › วิวัฒนาการและพันธุศาสตร์',false),
  ('ib-l-bio-posn-ep22','EP.18 เฉลยการบ้าน (1)',220,'https://youtu.be/SOq2ggrEdZ8',6240,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › วิวัฒนาการและพันธุศาสตร์',false),
  ('ib-l-bio-posn-ep23','EP.19 เฉลยการบ้าน (2)',230,'https://youtu.be/B08M8NMxhvE',3960,'เล่มที่ 1 Fundamentum Vitae · ชีวเคมี เซลล์ และพันธุศาสตร์ › วิวัฒนาการและพันธุศาสตร์',false),
  ('ib-l-bio-posn-ep24','EP.20 Basic Taxonomy + Virus',240,'https://youtu.be/LQ-9ODyBeGk',5640,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › อนุกรมวิธานและอาณาจักรสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-ep25','EP.21 Monera',250,'https://youtu.be/l0Hr2M8BNL0',4500,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › อนุกรมวิธานและอาณาจักรสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-ep26','EP.22 Protista',260,'https://youtu.be/hCpW0CpBFYQ',2640,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › อนุกรมวิธานและอาณาจักรสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-ep27','EP.23 Basic Fungi',270,'https://youtu.be/LapZVM5N4uE',1620,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › อนุกรมวิธานและอาณาจักรสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-ep28','EP.24 สรุป Plantae',280,'https://youtu.be/V42YFKFFjgA',2040,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › อนุกรมวิธานและอาณาจักรสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-ep29','EP.25 เนื้อหา Plantae',290,'https://youtu.be/bu_2qXGFH3c',4020,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › อนุกรมวิธานและอาณาจักรสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-ep30','EP.26 Kingdom of Animalia',300,'https://youtu.be/yiT6-QV6mws',8640,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › อนุกรมวิธานและอาณาจักรสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-ep31','EP.27 เฉลยข้อสอบ Taxonomy + Ecosystem + Population',310,'https://youtu.be/rddhY1k5e5g',6480,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › นิเวศวิทยาและประชากร',false),
  ('ib-l-bio-posn-ep32','EP.28 Plant Structure and Function',320,'https://youtu.be/l__eDf0axO8',7980,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › โครงสร้างและการทำงานของพืช',false),
  ('ib-l-bio-posn-ep33','EP.29 เฉลยการบ้าน + การลำเลียงในพืช (1)',330,'https://youtu.be/5xTm_BVDyRw',4860,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › โครงสร้างและการทำงานของพืช',false),
  ('ib-l-bio-posn-ep34','EP.30 เฉลยการบ้าน + การลำเลียงในพืช (2)',340,'https://youtu.be/Gzr6eYnXlsA',2580,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › โครงสร้างและการทำงานของพืช',false),
  ('ib-l-bio-posn-ep35','EP.31 เฉลยการบ้านเรื่อง Photosynthesis',350,'https://youtu.be/U9pqt16jyRc',720,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › โครงสร้างและการทำงานของพืช',false),
  ('ib-l-bio-posn-ep36','EP.32 สรุปการสืบพันธุ์พืชดอก',360,'https://youtu.be/R0sDoVBf8n0',1740,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › โครงสร้างและการทำงานของพืช',false),
  ('ib-l-bio-posn-ep37','EP.33 การสืบพันธุ์พืชดอก',370,'https://youtu.be/BQie5j2vSEU',2040,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › โครงสร้างและการทำงานของพืช',false),
  ('ib-l-bio-posn-ep38','EP.34 การตอบสนองของพืช',380,'https://youtu.be/dFJJCLd5Em4',960,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › โครงสร้างและการทำงานของพืช',false),
  ('ib-l-bio-posn-ep39','EP.35 เฉลยการบ้านเรื่องการสืบพันธุ์พืชดอก',390,'https://youtu.be/WnefbFZYDso',480,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › โครงสร้างและการทำงานของพืช',false),
  ('ib-l-bio-posn-ep40','EP.36 ฮอร์โมนพืชและเฉลยการบ้าน',400,'https://youtu.be/WsZZv0XNWyw',2280,'เล่มที่ 2 Organismus et Ambiens · สิ่งมีชีวิต สิ่งแวดล้อม และพืช › โครงสร้างและการทำงานของพืช',false),
  ('ib-l-bio-posn-ep41','EP.37 พื้นฐานระบบย่อยอาหาร',410,'https://youtu.be/dAS6mexmrmg',1620,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบย่อยอาหาร',false),
  ('ib-l-bio-posn-ep42','EP.38 อวัยวะระบบย่อยอาหาร I',420,'https://youtu.be/-XvW0TCxx9o',1800,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบย่อยอาหาร',false),
  ('ib-l-bio-posn-ep43','EP.39 อวัยวะระบบย่อยอาหาร II',430,'https://youtu.be/YiClhstlcQY',2400,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบย่อยอาหาร',false),
  ('ib-l-bio-posn-ep44','EP.40 การดูดซึมสารอาหาร',440,'https://youtu.be/E_uM_9_75ks',1740,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบย่อยอาหาร',false),
  ('ib-l-bio-posn-ep45','EP.41 ระบบย่อยอาหารสัตว์อื่น',450,'https://youtu.be/u1_04tR4dWE',960,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบย่อยอาหาร',false),
  ('ib-l-bio-posn-ep46','EP.42 เฉลยข้อสอบระบบย่อยอาหาร',460,'https://youtu.be/jLFAPoJbYWU',1020,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบย่อยอาหาร',false),
  ('ib-l-bio-posn-ep47','EP.43 ระบบไหลเวียนโลหิตของสัตว์',470,'https://youtu.be/QicE7ZNliWc',1380,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบหมุนเวียนเลือดและน้ำเหลือง',false),
  ('ib-l-bio-posn-ep48','EP.44 ระบบไหลเวียนโลหิตของมนุษย์',480,'https://youtu.be/l2ayPtPPaNU',2820,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบหมุนเวียนเลือดและน้ำเหลือง',false),
  ('ib-l-bio-posn-ep49','EP.45 ระบบน้ำเหลือง',490,'https://youtu.be/ewum3xA7fio',1260,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบหมุนเวียนเลือดและน้ำเหลือง',false),
  ('ib-l-bio-posn-ep50','EP.46 เฉลยข้อสอบระบบหมุนเวียนเลือดและระบบน้ำเหลือง',500,'https://youtu.be/5B3nuhne2Q4',540,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบหมุนเวียนเลือดและน้ำเหลือง',false),
  ('ib-l-bio-posn-ep51','EP.47 ระบบภูมิคุ้มกัน I',510,'https://youtu.be/3wQNmp7PiRE',2640,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบภูมิคุ้มกัน',false),
  ('ib-l-bio-posn-ep52','EP.48 ระบบภูมิคุ้มกัน II',520,'https://youtu.be/Dms3tNZBoPw',660,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบภูมิคุ้มกัน',false),
  ('ib-l-bio-posn-ep53','EP.49 เฉลยข้อสอบระบบภูมิคุ้มกัน',530,'https://youtu.be/ycHa0NN7RxQ',660,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบภูมิคุ้มกัน',false),
  ('ib-l-bio-posn-ep54','EP.50 อวัยวะในระบบหายใจมนุษย์',540,'https://youtu.be/J85nCBAfyqU',1920,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบหายใจ',false),
  ('ib-l-bio-posn-ep55','EP.51 กลไกการหายใจและสมดุลกรดเบส',550,'https://youtu.be/6AprGRdkzp0',1920,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบหายใจ',false),
  ('ib-l-bio-posn-ep56','EP.52 การหายใจของสัตว์อื่น',560,'https://youtu.be/47YXYDbFR0g',720,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบหายใจ',false),
  ('ib-l-bio-posn-ep57','EP.53 เฉลยข้อสอบระบบหายใจ',570,'https://youtu.be/mQHngvAYmo0',600,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบหายใจ',false),
  ('ib-l-bio-posn-ep58','EP.54 ระบบขับถ่าย',580,'https://youtu.be/mBKOHyLCEZc',2820,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบขับถ่าย',false),
  ('ib-l-bio-posn-ep59','EP.55 เฉลยข้อสอบระบบขับถ่าย',590,'https://youtu.be/abp0vRrq9tA',840,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบขับถ่าย',false),
  ('ib-l-bio-posn-ep60','EP.56 พื้นฐานระบบประสาท',600,'https://youtu.be/LNNZPCpstfM',1680,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบประสาทและอวัยวะรับความรู้สึก',false),
  ('ib-l-bio-posn-ep61','EP.57 Action Potential และ Synapse',610,'https://youtu.be/72FOal0I1wU',2220,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบประสาทและอวัยวะรับความรู้สึก',false),
  ('ib-l-bio-posn-ep62','EP.58 CNS และ PNS',620,'https://youtu.be/B9a0pdHTM4c',3060,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบประสาทและอวัยวะรับความรู้สึก',false),
  ('ib-l-bio-posn-ep63','EP.59 Sensory Organ',630,'https://youtu.be/gd5EprmoJmU',2100,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบประสาทและอวัยวะรับความรู้สึก',false),
  ('ib-l-bio-posn-ep64','EP.60 เฉลยข้อสอบระบบประสาท',640,'https://youtu.be/mPwmVCOxOz8',1320,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบประสาทและอวัยวะรับความรู้สึก',false),
  ('ib-l-bio-posn-ep65','EP.61 ระบบต่อมไร้ท่อ',650,'https://youtu.be/cz8jhsXVC7o',1920,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบต่อมไร้ท่อ',false),
  ('ib-l-bio-posn-ep66','EP.62 เฉลยข้อสอบระบบต่อมไร้ท่อ',660,'https://youtu.be/MmIiwKl31N8',600,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบต่อมไร้ท่อ',false),
  ('ib-l-bio-posn-ep67','EP.63 ระบบสืบพันธุ์เพศชาย',670,'https://youtu.be/4S8kQYd1AQQ',1320,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบสืบพันธุ์และการเจริญเติบโต',false),
  ('ib-l-bio-posn-ep68','EP.64 ระบบสืบพันธุ์เพศหญิง',680,'https://youtu.be/ZKcjQC53ZvQ',2040,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบสืบพันธุ์และการเจริญเติบโต',false),
  ('ib-l-bio-posn-ep69','EP.65 การเจริญเติบโตของเอ็มบริโอ',690,'https://youtu.be/wjVEV8YPK54',1260,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบสืบพันธุ์และการเจริญเติบโต',false),
  ('ib-l-bio-posn-ep70','EP.66 เฉลยข้อสอบเรื่องระบบสืบพันธุ์',700,'https://youtu.be/RS5MW-Y69P8',1200,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › ระบบสืบพันธุ์และการเจริญเติบโต',false),
  ('ib-l-bio-posn-ep71','EP.67 พฤติกรรมสัตว์',710,'https://youtu.be/1xSIJvxRZnw',780,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › พฤติกรรมและการเคลื่อนที่',false),
  ('ib-l-bio-posn-ep72','EP.68 เฉลยข้อสอบพฤติกรรมสัตว์',720,'https://youtu.be/oKr6FRvMeqQ',300,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › พฤติกรรมและการเคลื่อนที่',false),
  ('ib-l-bio-posn-ep73','EP.69 Locomotion',730,'https://youtu.be/nfa9oBooTXU',1560,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › พฤติกรรมและการเคลื่อนที่',false),
  ('ib-l-bio-posn-ep74','EP.70 เฉลยข้อสอบ Locomotion (ปิดคอร์ส)',740,'https://youtu.be/wvMcKAJYIGs',600,'เล่มที่ 3 Systemata Corporis Humani · ระบบในร่างกายมนุษย์ › พฤติกรรมและการเคลื่อนที่',false),
  ('ib-l-bio-posn-ep75','EP.1 บทนำชีวะและสารชีวโมเลกุล',750,'https://youtu.be/Y8g3-_tDZi0',2280,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep76','EP.2 Cell Structure and Function',760,'https://youtu.be/zJ8oFkoLF-A',1740,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep77','EP.3 Membrane Transport',770,'https://youtu.be/uADIemf31eE',1320,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep78','EP.4 Enzyme และ Cellular Respiration',780,'https://youtu.be/YmFcWNYaDIc',2400,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep79','EP.5 Photosynthesis',790,'https://youtu.be/_lehb_vzSN4',1980,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep80','EP.6 ระบบขับถ่าย',800,'https://youtu.be/EFjvdmDP1vk',1560,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep81','EP.7 ระบบย่อยอาหาร',810,'https://youtu.be/rEx9CwJsJVU',1500,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep82','EP.8 ระบบหมุนเวียนโลหิตและภูมิคุ้มกัน',820,'https://youtu.be/t367NDMVoIU',1020,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep83','EP.9 ระบบหายใจและระบบประสาท',830,'https://youtu.be/HwkaSk_d65o',2580,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep84','EP.10 ระบบประสาท',840,'https://youtu.be/qwOvYYLzA4s',1320,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep85','EP.11 ระบบต่อมไร้ท่อ',850,'https://youtu.be/Uu7-nthfFzs',1620,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep86','EP.12 การเคลื่อนไหว',860,'https://youtu.be/2OoNxIPgH5M',660,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep87','EP.13 ระบบสืบพันธุ์',870,'https://youtu.be/y_xbT8Q8eOQ',3120,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep88','EP.14 โครงสร้างพืช',880,'https://youtu.be/IyUfVeYgPhA',2940,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep89','EP.15 การลำเลียงในพืช',890,'https://youtu.be/NJBxzvHz0Ko',1020,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep90','EP.16 การสืบพันธุ์พืชดอก',900,'https://youtu.be/GCjGVdk9lpQ',2280,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep91','EP.17 การตอบสนองและฮอร์โมนพืช',910,'https://youtu.be/hbDbIEREcp4',1860,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep92','EP.18 การแบ่งเซลล์',920,'https://youtu.be/9dDRvLsW6NY',900,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep93','EP.19 พันธุศาสตร์ พาร์ทคำนวณ I',930,'https://youtu.be/B0gd9tLABtw',1620,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep94','EP.20 พันธุศาสตร์ พาร์ทคำนวณ II',940,'https://youtu.be/aZXxhqJIi_s',4080,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep95','EP.21 พันธุศาสตร์ พาร์ทคำนวณ III',950,'https://youtu.be/Eh14y03AoDk',3720,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep96','EP.22 พันธุศาสตร์โมเลกุล I',960,'https://youtu.be/Emd61USPYdI',1200,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep97','EP.23 พันธุวิศวกรรม',970,'https://youtu.be/4ElVQCu1kRM',600,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep98','EP.24 วิวัฒนาการ',980,'https://youtu.be/Wne7zNliaWg',660,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep99','EP.25 Taxonomy',990,'https://youtu.be/v94TqvQmzcc',2580,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false),
  ('ib-l-bio-posn-ep100','EP.26 พฤติกรรมสัตว์และระบบนิเวศ',1000,'https://youtu.be/uZU8AxBoYhc',1800,'ตะลุยโจทย์ › Examinophobia · ตะลุยข้อสอบ 8 พ.ศ.',false)
) AS v(id, title, ord, url, dur, chapter, prev)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id" = 'ib-course-bio-posn')
  AND NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = 'ib-course-bio-posn' AND x."youtubeUrl" IS NOT NULL)
ON CONFLICT ("id") DO NOTHING;

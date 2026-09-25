-- Catalog and hall of fame from the INeedBio Classroom demo page (claude.ai artifact).
-- Courses, lessons and student results are inserted with fixed ids and skipped if they
-- already exist, so admin edits made later are never overwritten. Lesson videos are left
-- empty: paste the YouTube links from หลังบ้าน → คอร์สและบทเรียน.
-- Student photos and course images live in /public/results and /public/catalog.

-- The earlier placeholder catalog (4_demo_courses) is replaced by this one.
UPDATE "Course" SET "isPublished" = false WHERE "id" LIKE 'demo-course-%';

INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","faq","subjectId","categoryId")
SELECT 'ib-course-bio-posn', 'ชีววิทยา สอวน. ค่าย 1', 'bio-posn', 'คอร์สเตรียมสอบคัดเลือก สอวน. ค่าย 1 สาขาชีววิทยา
สอนตั้งแต่พื้นฐานเคมีของสิ่งมีชีวิตจนถึงพันธุศาสตร์และวิวัฒนาการ พร้อมชีทสรุปทุกบท
เหมาะกับนักเรียน ม.3–ม.5 ที่จะสอบในเดือนสิงหาคม', NULL, 790, true, 'ครบทุกบทตามขอบเขต สอวน. พร้อมแนวข้อสอบย้อนหลัง', NULL, 'สอวน.', 10, 'ครบทุกบทตามขอบเขต สอวน. ค่าย 1
ชีทสรุปประกอบทุกบท เปิดได้ข้างคลิป
เฉลยข้อสอบเก่าย้อนหลังพร้อมวิธีคิด
ดูซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ', 'นักเรียน ม.3–ม.5 ที่จะสอบคัดเลือกค่าย 1 ในเดือนสิงหาคม
คนที่ยังไม่เคยเรียนชีววิทยาเชิงลึกมาก่อน
คนที่อยากทบทวนชีวะ ม.ปลายให้แน่นก่อนสอบ A-Level', 'ทีมผู้สอน INeedBio', 'ผู้สอนชีววิทยา สอวน.', NULL, NULL, 'ต้องมีพื้นฐานชีวะมาก่อนไหม
ไม่จำเป็น คอร์สเริ่มจากพื้นฐานเคมีของสิ่งมีชีวิตก่อน แล้วค่อยลงลึก

มีแบบฝึกหัดไหม
มีท้ายทุกบท พร้อมเฉลยในคลิป', s."id", cat."id"
FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'biology' AND cat."id" = 'demo-cat-biology'
ON CONFLICT DO NOTHING;

INSERT INTO "Lesson" ("id","title","order","type","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.dur, v.chapter, v.prev, 'ib-course-bio-posn' FROM (VALUES
  ('ib-l-bio-posn-1','1.1 น้ำและสมบัติของน้ำ',0,2520,'บทที่ 1 เคมีที่เป็นพื้นฐานของสิ่งมีชีวิต',true),
  ('ib-l-bio-posn-2','1.2 คาร์โบไฮเดรต',1,3060,'บทที่ 1 เคมีที่เป็นพื้นฐานของสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-3','1.3 ลิพิด',2,2820,'บทที่ 1 เคมีที่เป็นพื้นฐานของสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-4','1.4 โปรตีนและเอนไซม์',3,3480,'บทที่ 1 เคมีที่เป็นพื้นฐานของสิ่งมีชีวิต',false),
  ('ib-l-bio-posn-5','2.1 กล้องจุลทรรศน์',4,2880,'บทที่ 2 เซลล์',false),
  ('ib-l-bio-posn-6','2.2 โครงสร้างเยื่อหุ้มเซลล์',5,3300,'บทที่ 2 เซลล์',false),
  ('ib-l-bio-posn-7','2.3 การลำเลียงสารผ่านเยื่อหุ้มเซลล์',6,3660,'บทที่ 2 เซลล์',false),
  ('ib-l-bio-posn-8','2.4 ออร์แกเนลล์',7,3420,'บทที่ 2 เซลล์',false),
  ('ib-l-bio-posn-9','3.1 พลังงานกับสิ่งมีชีวิต',8,2700,'บทที่ 3 เมแทบอลิซึม',false),
  ('ib-l-bio-posn-10','3.2 การหายใจระดับเซลล์',9,3960,'บทที่ 3 เมแทบอลิซึม',false),
  ('ib-l-bio-posn-11','3.3 การสังเคราะห์ด้วยแสง',10,3780,'บทที่ 3 เมแทบอลิซึม',false)
) AS v(id, title, ord, dur, chapter, prev)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id" = 'ib-course-bio-posn')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","faq","subjectId","categoryId")
SELECT 'ib-course-chem-posn', 'เคมี สอวน. ค่าย 1', 'chem-posn', 'ปูพื้นเคมีให้แน่นก่อนสอบคัดเลือกค่าย 1', NULL, 690, true, 'ปูพื้นเคมีทั่วไปถึงอินทรีย์ สำหรับสอบคัดเลือกค่าย 1', NULL, 'สอวน.', 20, NULL, NULL, NULL, NULL, NULL, NULL, NULL, s."id", cat."id"
FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'chemistry' AND cat."id" = 'demo-cat-chemistry'
ON CONFLICT DO NOTHING;

INSERT INTO "Lesson" ("id","title","order","type","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.dur, v.chapter, v.prev, 'ib-course-chem-posn' FROM (VALUES
  ('ib-l-chem-posn-1','1.1 แบบจำลองอะตอม',0,3000,'บทที่ 1 อะตอมและตารางธาตุ',true),
  ('ib-l-chem-posn-2','1.2 การจัดเรียงอิเล็กตรอน',1,2760,'บทที่ 1 อะตอมและตารางธาตุ',false),
  ('ib-l-chem-posn-3','2.1 พันธะไอออนิก',2,2640,'บทที่ 2 พันธะเคมี',false),
  ('ib-l-chem-posn-4','2.2 พันธะโคเวเลนต์',3,3480,'บทที่ 2 พันธะเคมี',false)
) AS v(id, title, ord, dur, chapter, prev)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id" = 'ib-course-chem-posn')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","faq","subjectId","categoryId")
SELECT 'ib-course-phys-alevel', 'A-Level Physics', 'phys-alevel', 'คอร์สฟิสิกส์ A-Level ครบทั้ง 5 เล่ม ตั้งแต่กลศาสตร์ไปจนถึงฟิสิกส์ยุคใหม่ อธิบายตั้งแต่พื้นฐาน เหมาะทั้งคนที่เพิ่งเริ่มและคนที่เตรียมสอบ', '/catalog/phys-alevel-cover.webp', 990, true, 'คอร์สเดียว 5 เล่ม ครบฟิสิกส์ ม.ปลาย สอนโดยพี่หมอซัน', 1090, 'A-Level', 30, 'ครบ 5 เล่ม: กลศาสตร์ การสั่น คลื่นและแสง ไฟฟ้าและแม่เหล็ก ความร้อน ฟิสิกส์ยุคใหม่
เรียนผ่าน YouTube (คลิปเรียน) ดูได้ทั้งมือถือและคอม
ไม่ต้องมีพื้นฐานก็เรียนได้
อ้างอิงข้อสอบ A-Level, PAT และหนังสือ สสวท.', 'นักเรียน ม.1–ม.6 ที่อยากปูพื้นฟิสิกส์ให้แน่น
คนที่เตรียมสอบ A-Level ฟิสิกส์', 'พี่หมอซัน', 'น.พ. อนันดา พงษ์สุราช', 'จบจากโรงเรียนเฉลิมขวัญสตรี พิษณุโลก
ค่าย 1 โอลิมปิกวิชาการ สาขาฟิสิกส์ ศูนย์มหาวิทยาลัยนเรศวร ปี 2559 และ 2560
ค่าย 2 โอลิมปิกวิชาการ สาขาฟิสิกส์ ศูนย์มหาวิทยาลัยนเรศวร ปี 2560
ผู้แทน สอวน. ฟิสิกส์ ศูนย์มหาวิทยาลัยนเรศวร ปี 2560
จบจากคณะแพทยศาสตร์ มหาวิทยาลัยนเรศวร
ปัจจุบันเป็นแพทย์ใช้ทุน', '/catalog/phys-alevel-instructor.webp', 'ต้องมีพื้นฐานฟิสิกส์ไหม
ไม่ต้อง คอร์สเริ่มจากพื้นฐานของแต่ละเล่ม', s."id", cat."id"
FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'physics' AND cat."id" = 'demo-cat-physics'
ON CONFLICT DO NOTHING;

INSERT INTO "Lesson" ("id","title","order","type","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.dur, v.chapter, v.prev, 'ib-course-phys-alevel' FROM (VALUES
  ('ib-l-phys-alevel-1','ธรรมชาติและการวัดทางฟิสิกส์',0,2700,'เล่มที่ 1 The Mechanics · กลศาสตร์',true),
  ('ib-l-phys-alevel-2','การเคลื่อนที่',1,3600,'เล่มที่ 1 The Mechanics · กลศาสตร์',false),
  ('ib-l-phys-alevel-3','แรงและกฎของนิวตัน',2,3480,'เล่มที่ 1 The Mechanics · กลศาสตร์',false),
  ('ib-l-phys-alevel-4','งานและพลังงาน',3,3120,'เล่มที่ 1 The Mechanics · กลศาสตร์',false),
  ('ib-l-phys-alevel-5','โมเมนตัมและการชน',4,3000,'เล่มที่ 1 The Mechanics · กลศาสตร์',false),
  ('ib-l-phys-alevel-6','การเคลื่อนที่แบบหมุน',5,3300,'เล่มที่ 1 The Mechanics · กลศาสตร์',false),
  ('ib-l-phys-alevel-7','สมดุล',6,2400,'เล่มที่ 1 The Mechanics · กลศาสตร์',false),
  ('ib-l-phys-alevel-8','การเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย',7,2880,'เล่มที่ 2 The Oscillation · การสั่น คลื่น และแสง',false),
  ('ib-l-phys-alevel-9','คลื่นกล',8,3000,'เล่มที่ 2 The Oscillation · การสั่น คลื่น และแสง',false),
  ('ib-l-phys-alevel-10','เสียง',9,2760,'เล่มที่ 2 The Oscillation · การสั่น คลื่น และแสง',false),
  ('ib-l-phys-alevel-11','แสง',10,2640,'เล่มที่ 2 The Oscillation · การสั่น คลื่น และแสง',false),
  ('ib-l-phys-alevel-12','กระจกและเลนส์',11,3120,'เล่มที่ 2 The Oscillation · การสั่น คลื่น และแสง',false),
  ('ib-l-phys-alevel-13','การแทรกสอดและการเลี้ยวเบน',12,2940,'เล่มที่ 2 The Oscillation · การสั่น คลื่น และแสง',false),
  ('ib-l-phys-alevel-14','ไฟฟ้าสถิต',13,3300,'เล่มที่ 3 The Electromagnetics · ไฟฟ้าและแม่เหล็ก',false),
  ('ib-l-phys-alevel-15','วงจรไฟฟ้า',14,3000,'เล่มที่ 3 The Electromagnetics · ไฟฟ้าและแม่เหล็ก',false),
  ('ib-l-phys-alevel-16','แม่เหล็ก',15,2520,'เล่มที่ 3 The Electromagnetics · ไฟฟ้าและแม่เหล็ก',false),
  ('ib-l-phys-alevel-17','การเหนี่ยวนำแม่เหล็กไฟฟ้า',16,2820,'เล่มที่ 3 The Electromagnetics · ไฟฟ้าและแม่เหล็ก',false),
  ('ib-l-phys-alevel-18','ไฟฟ้ากระแสสลับ',17,2700,'เล่มที่ 3 The Electromagnetics · ไฟฟ้าและแม่เหล็ก',false),
  ('ib-l-phys-alevel-19','คลื่นแม่เหล็กไฟฟ้า',18,2280,'เล่มที่ 3 The Electromagnetics · ไฟฟ้าและแม่เหล็ก',false),
  ('ib-l-phys-alevel-20','ความยืดหยุ่น',19,2160,'เล่มที่ 4 The Thermodynamics · ความร้อน',false),
  ('ib-l-phys-alevel-21','ความดัน',20,2400,'เล่มที่ 4 The Thermodynamics · ความร้อน',false),
  ('ib-l-phys-alevel-22','ของไหล',21,2880,'เล่มที่ 4 The Thermodynamics · ความร้อน',false),
  ('ib-l-phys-alevel-23','ความร้อน',22,2640,'เล่มที่ 4 The Thermodynamics · ความร้อน',false),
  ('ib-l-phys-alevel-24','แก๊ส',23,2760,'เล่มที่ 4 The Thermodynamics · ความร้อน',false),
  ('ib-l-phys-alevel-25','กฎอุณหพลศาสตร์',24,2520,'เล่มที่ 4 The Thermodynamics · ความร้อน',false),
  ('ib-l-phys-alevel-26','ทฤษฎีควอนตัมเบื้องต้น',25,3000,'เล่มที่ 5 The Modern Physics · ฟิสิกส์ยุคใหม่',false),
  ('ib-l-phys-alevel-27','อะตอม',26,2640,'เล่มที่ 5 The Modern Physics · ฟิสิกส์ยุคใหม่',false),
  ('ib-l-phys-alevel-28','นิวเคลียร์',27,2760,'เล่มที่ 5 The Modern Physics · ฟิสิกส์ยุคใหม่',false),
  ('ib-l-phys-alevel-29','กัมมันตรังสี',28,2400,'เล่มที่ 5 The Modern Physics · ฟิสิกส์ยุคใหม่',false),
  ('ib-l-phys-alevel-30','ฟิสิกส์อนุภาคเบื้องต้น',29,2280,'เล่มที่ 5 The Modern Physics · ฟิสิกส์ยุคใหม่',false)
) AS v(id, title, ord, dur, chapter, prev)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id" = 'ib-course-phys-alevel')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","faq","subjectId","categoryId")
SELECT 'ib-course-math-m4', 'คณิต ม.4 แยกเทอม', 'math-m4', 'เรียนตามเทอม เนื้อหาคณิตศาสตร์ ม.4', NULL, 690, true, 'เซต ตรรกศาสตร์ จำนวนจริง ฟังก์ชัน', NULL, 'ม.4', 40, NULL, NULL, NULL, NULL, NULL, NULL, NULL, s."id", cat."id"
FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'math' AND cat."id" = 'demo-cat-math'
ON CONFLICT DO NOTHING;

INSERT INTO "Lesson" ("id","title","order","type","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.dur, v.chapter, v.prev, 'ib-course-math-m4' FROM (VALUES
  ('ib-l-math-m4-1','1.1 เซตและสับเซต',0,2400,'บทที่ 1 เซต',true),
  ('ib-l-math-m4-2','1.2 การดำเนินการบนเซต',1,2700,'บทที่ 1 เซต',false)
) AS v(id, title, ord, dur, chapter, prev)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id" = 'ib-course-math-m4')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Course" ("id","title","slug","description","coverImage","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","instructorName","instructorTitle","instructorBio","instructorPhoto","faq","subjectId","categoryId")
SELECT 'ib-course-math-m5', 'คณิต ม.5 แยกเทอม', 'math-m5', '', NULL, 690, false, 'เอกซ์โพเนนเชียล ลอการิทึม ตรีโกณมิติ', NULL, NULL, 50, NULL, NULL, NULL, NULL, NULL, NULL, NULL, s."id", cat."id"
FROM "Subject" s JOIN "Category" cat ON cat."subjectId" = s."id"
WHERE s."slug" = 'math' AND cat."id" = 'demo-cat-math'
ON CONFLICT DO NOTHING;

-- Announcement bar: only filled in when the admin has not set one.
INSERT INTO "Setting" ("key","value","updatedAt") VALUES ('announcement','เปิดรับสมัครคอร์สชีววิทยา สอวน. รอบปี 2027 แล้ว',NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW() WHERE "Setting"."value" = '';

INSERT INTO "StudentResult" ("id","nickname","year","subjectId","school","center","review","photoUrl","isPublished","sortOrder")
SELECT v.id, v.nickname, v.year, s."id", v.school, v.center, v.review, v.photo, v.pub, v.so FROM (VALUES
  ('ib-result-R01','แนบฝัน','2569','biology','โรงเรียนเตรียมอุดมศึกษาพัฒนาการ รัชดา','ศูนย์โรงเรียนเตรียมอุดมศึกษาพัฒนาการ','จริงๆก่อนมาลงคอสของพี่ค่อนข้างมีพื้นฐานแล้วครับ แต่ยังรู้สึกสีบางจุดที่ยังเก็บเนื้อหาไม่หมดดดด พอมาเรียนกับพี่แล้วมันมีเนื้อหาหลายๆอย่างที่เคยพลาดไป ไม่ได้เรียน ซึ่งหลายฟจุดก็ออกสอบในปีนี้ครับ แล้วชอบมากเลยที่พี่ส่งไฟล์ที่จดสอนทั้งหมดมาด้วยเวลาไม่มีเวลาจะได้มาดูแค่ไฟล์ คอสตะลุยโจทย์ของพี่คือเยอะๆมากได้ฝึกแบบอันลิมิต จนตอนนี้ยังทำไม่หมดเลย55555 ชอบไฟล์ของพี่มากที่สุดเลยครับ ตั้งแต่เรียนมาเพราะมันดูเป็นระเบียบ มีเนื้อเขียนไว้แล้ว ดูใส่ใจกับการทำไฟล์จริงๆ ขอบคุณพี่ที่ทำคอสดีๆออกมานะครับราคาถูกด้วย🥹🙏🙏','/results/R01.webp',true,10),
  ('ib-result-R02','พี','2569','biology','โรงเรียนเทพศิรินทร์ นนทบุรี','ศูนย์มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ','คอร์สดีมีคุณภาพขนาดนี้ไม่ลงได้ไงใครอยากเรียนชีวะแบบไม่ได้แค่ฟังเฉยๆแต่ได้เขียนตามลงเลยครับคุ้มสุดๆหรือใครนั่งเรียนเองแล้วจับประเด็นไม่ได้ก็แนะนำเลยครับดียิ่งกว่าคือโจทย์ท้ายบทกับโจทย์ MOCK TEST ทำจนไม่ต้องอ่านโจทย์ก็ตอบได้เลย รวมๆ 2/10 ครับ','/results/R02.webp',true,20),
  ('ib-result-R03','ปันปัน','2569','biology','โรงเรียนสุรธรรมพิทักษ์','ศูนย์มหาวิทยาลัยเทคโนโลยีสุรนารี','พี่พร้อมสอนดีมากครับ น่ารัก สอนเนื้อหาเข้าใจดีครับ พี่ช่วยชีวิต TAXO จริงๆครับ 10/10 ไปเล้ย เอาซะผมติดค่ายเลยครับ','/results/R03.webp',true,30),
  ('ib-result-R04','อิ่มจัง','2569','biology','โรงเรียนภูเก็ตวิทยาลัย','ศูนย์มหาวิทยาลัยสงขลานครินทร์','พี่พร้อมอธิบายเข้าใจง่ายดีค่ะ ชอบพาร์ทำโจทย์มาก POSNเล่ม4ที่เป็นโจทย์แยกบทอันนี้ให้เลย รู้สึกได้รู้จุดอ่อนตัวเอง ถามโจทย์แล้วพี่ตอบละเอียดมากค่ะ เข้าใจเลย สิ่งที่ชอบที่สุดคือ มีโจทย์ให้ทำเยอะดีแต่ละบท ก่อนเรียนที่พี่มีปรับพื้นฐานให้อันนั้นดีมากค่ะ','/results/R04.webp',true,40),
  ('ib-result-R05','ไมเคิล','2569','biology','โรงเรียนสารสาสน์วิเทศสุวรรณภูมิ','ศูนย์มหาวิทยาลัยศิลปากร',NULL,'/results/R05.webp',true,50),
  ('ib-result-R06','กัปตัน','2569','biology','โรงเรียนเบญจมราชูทิศ นครศรีธรรมราช','ศูนย์มหาวิทยาลัยวลัยลักษณ์','ส่วนตัวรู้สึกว่าคอร์สนี้ช่วยได้เยอะมาก โดยเฉพาะการปูพื้นฐานและทำให้ผมเข้าใจเนื้อหาเป็นระบบมากขึ้น จากที่ตอนแรกอ่านเองแล้วรู้สึกว่าเนื้อหาเยอะและจำไม่ค่อยได้ พอเรียนแล้วทำให้เห็นภาพและเชื่อมโยงแต่ละบทได้ดีขึ้น ที่ชอบมากที่สุดคือสอนแบบเน้นความเข้าใจ ไม่ได้ให้ท่องอย่างเดียว ทำให้เวลาเจอโจทย์ที่ไม่ตรงกับที่เคยอ่าน ก็ยังสามารถวิเคราะห์และนำความรู้ไปใช้ต่อได้','/results/R06.webp',true,60),
  ('ib-result-R07','อีฟ','2569','biology','โรงเรียนอัตตัรกียะห์อิสลามียะห์','ศูนย์มหาวิทยาลัยทักษิณ','คอร์สดีมากครับราคา ไม่OVER PRICE คนสอนเข้าใจมาก กดสรุปเนื้อหาที่สำคัญๆไม่มีน้ำเลยเนื้อเน้นๆมีตะลุยโจทย์ทำให้เข้ายิ่งขึ้น ถือว่าช่วยได้เยอะมากๆเลยครับ 1000/10','/results/R07.webp',true,70),
  ('ib-result-R08','Ferozpolymerase','2569','biology','โรงเรียนดารุสสาลาม','ศูนย์มหาวิทยาลัยทักษิณ','สิ่งที่ผมชอบในคอร์สชีวะของพี่เลยก็คือ การที่มีคลิปสอนเฉลยข้อสอบแบบแยกบทให้ครับ และมีทริคเล็กๆน้อยๆให้จำสำหรับใช้ในการตัดช้อยส์ได้อย่างดี มันเหมาะกับการมาเตรียมตัวในช่วงติว INTENSIVE ของผมมาก เพราะผมพึ่งมาไล่ทวนเนื้อหาตอนสัปดาห์สุดท้ายก่อนสอบ คอร์สภาคเคมีของพี่เองก็ดีเช่นกัน เพราะสอนให้เห็นตั้งแต่พื้นฐานยันไปจนถึงเนื้อหาขั้นสูงในค่ายเลย','/results/R08.webp',true,80),
  ('ib-result-R09','มาร์ค','2569','biology','โรงเรียนวัชรวิทยา','ศูนย์มหาวิทยาลัยนเรศวร','ตอนแรกผมคิดว่าจะอ่านหนังสืออย่างเดียว แต่พออ่านไปเรื่อยๆ มันรู้สึกแบบว่า มันไม่รู้ต้องอ่านยังไงดี เน้นตรงไหนบ้าง จับประเด็นไม่ถูก ผมเลยลองมาเรียนกับพี่ ผมรู้สึกว่ามันช่วยได้เยอะมากๆเลย พี่สอนเข้าใจสอนสนุก เป็นกันเองฟีลพี่สอนน้องอะ แต่สิ่งที่ผมชอบมากที่สุดคือ พี่ตั้งใจสอนมากๆ มันไม่ได้แค่ความรู้ แต่มันได้อะไรหลายๆอย่างเลย ได้ทั้งแนวทางเนื้อหา ประสบการณ์ แล้วผมก็ได้คอนเนคชั่น ได้อยู่ในสังคมเด็กสอวน.ชีวะ มีแต่คนเก่งๆทั้งนั้นเลย ผมชอบสุดก็โจทย์ สอวน. แยกบท 800กว่าข้อ (ปี60-68) ที่พี่ทำให้ คือแบบ ผมเก่งได้เพราะไฟล์นี้เลย ผมนั่งทำ24/7 เรียนคณิตก็ทำ เรียนเคมีก็ทำ ทิ้งทุกอย่างเพื่อเรียนไฟล์นี้ ผมนั่งเถียงกับเอไอทั้งวันเพราะมันตอบไม่เหมือนผม ห้าห้า แต่นั่นแหละ ขอบคุณนะครับ','/results/R09.webp',true,90),
  ('ib-result-R10','อาเดีย','2569','biology','มูลนิธิอาซิซสถาน','ศูนย์มหาวิทยาลัยทักษิณ','คอสรนี้สำหรับหนูนะคะ พี่ช่วยอธิบายเรื่องยากให้ง่ายขึ้นมากๆค่ะ ไฟล์เอกสารเข้าใจง่าย ชอบที่สุดคือมีโจทยท้ายบท รีเช็คว่าเราเข้าใจจริงๆไหม ทุกบทเลยโครตเริ่ดอะ และที่ชอบที่สุดดดด เล่มโจทย์สอวนที่ผ่านมาทั้งหมด แยกบท มันมีประโยชนมากๆอะ ทำให้เราเห็นว่าเราอ่อนตรงไหน ควรเน้นจุดอะไร เป็นคอสรที่ให้เกินราคามากๆเลยค่ะ','/results/R10.webp',true,100),
  ('ib-result-R11','ลิปตัน','2569','biology',NULL,NULL,NULL,NULL,true,110),
  ('ib-result-R12','หยก','2569','chemistry','โรงเรียนราชสีมาวิทยาลัย','ศูนย์มหาวิทยาลัยเทคโนโลยีสุรนารี','พี่หมีลี่สอนดีมากๆๆๆ เอเนอจี้สุดๆ ไม่มีอ่อม อธิบายเข้าใจมากได้ความรู้แบบสุดๆ ได้เทคนิคจากพี่เอาไปใช้ตอนสอบด้วย โจทย์ก็เริ่ด คุณภาพเกินราคามากๆค่าาา','/results/R12.webp',true,120),
  ('ib-result-R13','ซันไบร์ท','2569','chemistry','โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย สุพรรณบุรี','ศูนย์มหาวิทยาลัยศิลปากร','ส่วนตัวหนูเริ่มเตรียมตัวประมาณ2-3อาทิตก่อนสอบก้เลยเลือกมาเรียนคอร์สตะลุยโจทย์ค่ะ พี่หมีลี่คือสรุปเนื้อหามาได้กระชับมาก เน้นจุดสำคัญมาให้แล้ว โจทย์ในชีทก็เยอะมากๆค่ะ MOCK ก็ค่อนข้างตรง คอร์สดีคุ้มค่าเกินราคามากๆเลยค่ะ','/results/R13.webp',true,130),
  ('ib-result-R14','เค','2569','chemistry','โรงเรียนเตรียมอุดมศึกษา','ศูนย์โรงเรียนเตรียมอุดมศึกษา',NULL,'/results/R14.webp',true,140),
  ('ib-result-R15','ภีม','2569','chemistry','โรงเรียนนาคประสิทธิ์ นครปฐม','ศูนย์มหาวิทยาลัยศิลปากร','พี่หมีลี่ สอนเข้าใจมากครับ มีเทคนิคในการสอน ทำสื่อการสอนแยกเป็นบทชัดเจน และสอนได้เข้าใจมาก ๆ เลยครับ ผมประทับใจสุด ชอบเรียนกับพี่หมีลี่มากเลยๆค้าบบบ พี่หมีลี่น่ารัก555 สอนสนุก เลิฟเว่อร์ ถึงผมไม่ได้เรียนสด แต่ผมดูคลิปย้อนหลังทุกคลิปเลยนะค้าบบบ','/results/R15.webp',true,150),
  ('ib-result-R16','ปลายฟ้า','2569','chemistry','โรงเรียนราชสีมาวิทยาลัย','ศูนย์มหาวิทยาลัยเทคโนโลยีสุรนารี','พี่หมีลี่สอนดีมากคับบูสๆเอเนอจี้มากจิงๆตอนเรียนไม่ง่วงเลย หนูได้ทริคได้อะไรไปเย้อออมากกก คอร์สราคาน่ารักเป็นกันเองแบบมากจิงๆๆ','/results/R16.webp',true,160),
  ('ib-result-R17','ริด','2569','chemistry','โรงเรียนดารุสสาลาม','ศูนย์มหาวิทยาลัยทักษิณ','ราคาหลักร้อย คุณภาพหลักล้าน จ่ายเงินไปแค่ไม่กี่บาท แต่เนื้อหาที่ได้คือลึกและแน่นมากกก ลึกแบบที่ใช้สอบค่ายจริงได้สบายๆ ไม่ใช่แค่ผิวเผิน สอนเคลียร์ ย่อยเรื่องยากให้เข้าใจง่าย จากเนื้อหาเคมีอินทรีย์หรือโมลที่เคยชวนปวดตับ พี่หมีลี่มีวิธีเล่าให้เห็นภาพตามได้ ไม่ต้องท่องจำแบบนกแก้วนกขุนทอง ได้เข้าใจกลไกจริงๆว่ามันมายังไง ละก็ได้ตะลุยโจทย์ฉ่ำสะใจ เรียนทฤษฎีเสร็จมีโจทย์ให้ฝึกมือฉ่ำๆๆๆ แนวข้อสอบคือใกล้เคียงกับข้อสอบจริง ช่วยให้จับจุดได้ว่าข้อสอบชอบหลอกตรงไหน คือตอนติว มันได้ฟีลเหมือนรุ่นพี่มาติวให้ฟังข้างๆ ไม่น่าเบื่อ เหมาะกับเด็กที่อยากลุย สอวน. เคมี แบบเนื้อเน้นๆ ไม่กระดูก','/results/R17.webp',true,170),
  ('ib-result-R18','คูเปอร์','2569','math','โรงเรียนอำนาจเจริญ',NULL,'คอร์ส สอวน. ชีวะ: สอนดีจนต้องบอกต่อ ไม่น่าเบื่อ มีความกระชับคำพูดและเนื้อหา เหมาะกับคนเข้าใจยากมากๆและไม่ยืดจนเกินไป คุ้มค่ากับราคามากๆ
คอร์ส คณิต ม.ปลาย: สอนดีเลยครับ โจทย์พอเหมาะให้เข้าใจกับเนื้อที่เรียน เหมาะกับการเก็บเนื้อหารวบรัด ถือว่าเหมาะกับการลงเป็นอย่างมาก','/results/R18.webp',true,180)
) AS v(id, nickname, year, subj, school, center, review, photo, pub, so)
LEFT JOIN "Subject" s ON s."slug" = v.subj
ON CONFLICT ("id") DO NOTHING;

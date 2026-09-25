-- Demo catalog in the style of the Apps Script site, so the storefront has content
-- while enrollment is closed ("อยู่ในขั้นพัฒนา"). Every insert skips rows that already
-- exist, and lessons are only added to courses this migration created. Remove or edit
-- these courses from หลังบ้าน → คอร์สและบทเรียน.

INSERT INTO "Subject" ("id","name","slug","colorTheme","order") VALUES ('demo-subj-biology','ชีววิทยา','biology','#16875A',1) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Subject" ("id","name","slug","colorTheme","order") VALUES ('demo-subj-chemistry','เคมี','chemistry','#D4541C',2) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Subject" ("id","name","slug","colorTheme","order") VALUES ('demo-subj-physics','ฟิสิกส์','physics','#2563D6',3) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Subject" ("id","name","slug","colorTheme","order") VALUES ('demo-subj-math','คณิตศาสตร์','math','#8246D4',4) ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Category" ("id","name","subjectId") SELECT 'demo-cat-biology','ทั่วไป',"id" FROM "Subject" WHERE "slug"='biology' ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Category" ("id","name","subjectId") SELECT 'demo-cat-chemistry','ทั่วไป',"id" FROM "Subject" WHERE "slug"='chemistry' ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Category" ("id","name","subjectId") SELECT 'demo-cat-physics','ทั่วไป',"id" FROM "Subject" WHERE "slug"='physics' ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Category" ("id","name","subjectId") SELECT 'demo-cat-math','ทั่วไป',"id" FROM "Subject" WHERE "slug"='math' ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Course" ("id","title","slug","description","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","faq","subjectId","categoryId")
SELECT 'demo-course-bio-posn-camp1','ชีววิทยา สอวน. ค่าย 1','bio-posn-camp1','ปูพื้นชีววิทยาตั้งแต่เคมีในสิ่งมีชีวิต เซลล์ ไปจนถึงพันธุศาสตร์ ตามขอบเขตการสอบคัดเลือกค่าย 1 สอวน.
เรียนผ่านคลิป ดูซ้ำได้ไม่จำกัด',790,true,'ครบทุกบทตามขอบเขตค่าย 1 พร้อมชีทสรุป',1090,'สอวน.',1,'ครบทุกบทตามขอบเขต สอวน. ค่าย 1
มีชีทสรุปทุกบท
แบบฝึกหัดท้ายบทพร้อมเฉลย','นักเรียน ม.3–ม.5 ที่จะสอบค่าย 1
คนที่ยังไม่เคยเรียนชีวะเชิงลึก','ต้องมีพื้นฐานอะไรก่อนไหม
ไม่ต้อง คอร์สเริ่มจากพื้นฐาน',s."id",'demo-cat-biology'
FROM "Subject" s WHERE s."slug"='biology' ON CONFLICT DO NOTHING;
INSERT INTO "Lesson" ("id","title","order","type","duration","chapter","courseId")
SELECT v.id, v.title, v.ord, v.type::"LessonType", v.dur, v.chapter, 'demo-course-bio-posn-camp1' FROM (VALUES
  ('demo-l-bio-posn-camp1-1-1','1.1 น้ำและสารอนินทรีย์',0,'VIDEO',2280,'บทที่ 1 เคมีในสิ่งมีชีวิต'),
  ('demo-l-bio-posn-camp1-1-2','1.2 คาร์โบไฮเดรตและลิพิด',1,'VIDEO',2700,'บทที่ 1 เคมีในสิ่งมีชีวิต'),
  ('demo-l-bio-posn-camp1-1-3','1.3 โปรตีนและเอนไซม์',2,'VIDEO',3000,'บทที่ 1 เคมีในสิ่งมีชีวิต'),
  ('demo-l-bio-posn-camp1-2-1','2.1 โครงสร้างของเซลล์',3,'VIDEO',2520,'บทที่ 2 เซลล์'),
  ('demo-l-bio-posn-camp1-2-2','2.2 เยื่อหุ้มเซลล์และการลำเลียงสาร',4,'VIDEO',2400,'บทที่ 2 เซลล์'),
  ('demo-l-bio-posn-camp1-2-3','2.3 การแบ่งเซลล์',5,'VIDEO',2880,'บทที่ 2 เซลล์'),
  ('demo-l-bio-posn-camp1-3-1','3.1 พันธุศาสตร์เมนเดล',6,'VIDEO',2760,'บทที่ 3 พันธุศาสตร์'),
  ('demo-l-bio-posn-camp1-3-2','3.2 DNA และการสังเคราะห์โปรตีน',7,'VIDEO',3120,'บทที่ 3 พันธุศาสตร์')
) AS v(id, title, ord, type, dur, chapter)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id"='demo-course-bio-posn-camp1') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Course" ("id","title","slug","description","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","faq","subjectId","categoryId")
SELECT 'demo-course-bio-alevel','ชีววิทยา A-Level สรุปครบ ม.4–ม.6','bio-alevel','สรุปชีววิทยา ม.ปลาย ทั้งหลักสูตรในคอร์สเดียว แต่ละบทจบด้วยโจทย์แนวข้อสอบ A-Level',1290,true,'สรุปเนื้อหาทั้งหลักสูตร พร้อมตะลุยโจทย์แนว A-Level',1590,'A-Level',2,'สรุปครบทั้งหลักสูตร ม.4–ม.6
โจทย์แนว A-Level ท้ายบท
ดูซ้ำได้ตลอดก่อนสอบ','นักเรียน ม.5–ม.6 ที่จะสอบ A-Level
คนที่อยากทบทวนก่อนสอบแบบเร็ว',NULL,s."id",'demo-cat-biology'
FROM "Subject" s WHERE s."slug"='biology' ON CONFLICT DO NOTHING;
INSERT INTO "Lesson" ("id","title","order","type","duration","chapter","courseId")
SELECT v.id, v.title, v.ord, v.type::"LessonType", v.dur, v.chapter, 'demo-course-bio-alevel' FROM (VALUES
  ('demo-l-bio-alevel-1-1','1.1 ระบบย่อยอาหาร',0,'VIDEO',2400,'บทที่ 1 ระบบในร่างกายมนุษย์'),
  ('demo-l-bio-alevel-1-2','1.2 ระบบหมุนเวียนเลือด',1,'VIDEO',2640,'บทที่ 1 ระบบในร่างกายมนุษย์'),
  ('demo-l-bio-alevel-1-3','1.3 ระบบภูมิคุ้มกัน',2,'VIDEO',2280,'บทที่ 1 ระบบในร่างกายมนุษย์'),
  ('demo-l-bio-alevel-2-1','2.1 โครงสร้างและการลำเลียงในพืช',3,'VIDEO',2520,'บทที่ 2 พืชและนิเวศวิทยา'),
  ('demo-l-bio-alevel-2-2','2.2 การสังเคราะห์ด้วยแสง',4,'VIDEO',2820,'บทที่ 2 พืชและนิเวศวิทยา'),
  ('demo-l-bio-alevel-2-3','2.3 ระบบนิเวศและประชากร',5,'VIDEO',2160,'บทที่ 2 พืชและนิเวศวิทยา')
) AS v(id, title, ord, type, dur, chapter)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id"='demo-course-bio-alevel') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Course" ("id","title","slug","description","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","faq","subjectId","categoryId")
SELECT 'demo-course-chem-alevel-10y','เคมี A-Level ตะลุยโจทย์ 10 ปี','chem-alevel-10y','รวมโจทย์เคมีจากข้อสอบย้อนหลัง 10 ปี แยกตามบท อธิบายวิธีคิดทีละข้อ',990,true,'ตะลุยข้อสอบเก่า 10 ปี แยกตามบท',NULL,'A-Level',3,'ข้อสอบย้อนหลัง 10 ปี แยกตามบท
อธิบายวิธีคิดทีละขั้น
สรุปสูตรที่ใช้บ่อย','นักเรียน ม.6 ที่จะสอบ A-Level เคมี','ต้องเรียนเนื้อหามาก่อนไหม
ควรเคยเรียนเนื้อหาในห้องมาแล้ว คอร์สนี้เน้นทำโจทย์',s."id",'demo-cat-chemistry'
FROM "Subject" s WHERE s."slug"='chemistry' ON CONFLICT DO NOTHING;
INSERT INTO "Lesson" ("id","title","order","type","duration","chapter","courseId")
SELECT v.id, v.title, v.ord, v.type::"LessonType", v.dur, v.chapter, 'demo-course-chem-alevel-10y' FROM (VALUES
  ('demo-l-chem-alevel-10y-1-1','1.1 โครงสร้างอะตอม',0,'VIDEO',2100,'บทที่ 1 อะตอมและตารางธาตุ'),
  ('demo-l-chem-alevel-10y-1-2','1.2 สมบัติตามตารางธาตุ',1,'VIDEO',1920,'บทที่ 1 อะตอมและตารางธาตุ'),
  ('demo-l-chem-alevel-10y-2-1','2.1 พันธะไอออนิกและโคเวเลนต์',2,'VIDEO',2400,'บทที่ 2 พันธะเคมี'),
  ('demo-l-chem-alevel-10y-2-2','2.2 รูปร่างโมเลกุลและสภาพขั้ว',3,'VIDEO',2280,'บทที่ 2 พันธะเคมี'),
  ('demo-l-chem-alevel-10y-3-1','3.1 โมลและสูตรเคมี',4,'VIDEO',2520,'บทที่ 3 ปริมาณสัมพันธ์'),
  ('demo-l-chem-alevel-10y-3-2','3.2 สารละลายและความเข้มข้น',5,'VIDEO',2160,'บทที่ 3 ปริมาณสัมพันธ์')
) AS v(id, title, ord, type, dur, chapter)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id"='demo-course-chem-alevel-10y') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Course" ("id","title","slug","description","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","faq","subjectId","categoryId")
SELECT 'demo-course-phys-posn-mechanics','ฟิสิกส์ สอวน. ค่าย 1 กลศาสตร์','phys-posn-mechanics','เรียนกลศาสตร์สำหรับสอบค่าย 1 สอวน. เน้นความเข้าใจและการแก้โจทย์แบบเป็นขั้นตอน',1190,true,'กลศาสตร์ครบตั้งแต่การเคลื่อนที่ถึงโมเมนตัม',1490,'สอวน.',4,'กลศาสตร์ครบตามขอบเขตค่าย 1
โจทย์แนว สอวน. ทุกบท','นักเรียน ม.3–ม.5 ที่จะสอบค่าย 1 ฟิสิกส์',NULL,s."id",'demo-cat-physics'
FROM "Subject" s WHERE s."slug"='physics' ON CONFLICT DO NOTHING;
INSERT INTO "Lesson" ("id","title","order","type","duration","chapter","courseId")
SELECT v.id, v.title, v.ord, v.type::"LessonType", v.dur, v.chapter, 'demo-course-phys-posn-mechanics' FROM (VALUES
  ('demo-l-phys-posn-mechanics-1-1','1.1 การเคลื่อนที่แนวตรง',0,'VIDEO',2700,'บทที่ 1 การเคลื่อนที่'),
  ('demo-l-phys-posn-mechanics-1-2','1.2 การเคลื่อนที่แบบโพรเจกไทล์',1,'VIDEO',2880,'บทที่ 1 การเคลื่อนที่'),
  ('demo-l-phys-posn-mechanics-2-1','2.1 กฎของนิวตัน',2,'VIDEO',3000,'บทที่ 2 แรงและกฎการเคลื่อนที่'),
  ('demo-l-phys-posn-mechanics-2-2','2.2 แรงเสียดทาน',3,'VIDEO',2400,'บทที่ 2 แรงและกฎการเคลื่อนที่'),
  ('demo-l-phys-posn-mechanics-3-1','3.1 งานและพลังงาน',4,'VIDEO',2760,'บทที่ 3 งาน พลังงาน และโมเมนตัม'),
  ('demo-l-phys-posn-mechanics-3-2','3.2 โมเมนตัมและการชน',5,'VIDEO',2640,'บทที่ 3 งาน พลังงาน และโมเมนตัม')
) AS v(id, title, ord, type, dur, chapter)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id"='demo-course-phys-posn-mechanics') ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Course" ("id","title","slug","description","price","isPublished","subtitle","fullPrice","level","sortOrder","highlights","audience","faq","subjectId","categoryId")
SELECT 'demo-course-math-posn-number','คณิตศาสตร์ สอวน. ทฤษฎีจำนวน','math-posn-number','เรียนทฤษฎีจำนวนตั้งแต่การหารลงตัวจนถึงสมภาค พร้อมโจทย์ฝึกแนว สอวน.',890,true,'พื้นฐานทฤษฎีจำนวนสำหรับค่าย 1',NULL,'สอวน.',5,'เริ่มจากพื้นฐาน ไม่ต้องมีความรู้มาก่อน
โจทย์ฝึกแนว สอวน. ท้ายบท','นักเรียน ม.2–ม.4 ที่สนใจค่ายคณิตศาสตร์',NULL,s."id",'demo-cat-math'
FROM "Subject" s WHERE s."slug"='math' ON CONFLICT DO NOTHING;
INSERT INTO "Lesson" ("id","title","order","type","duration","chapter","courseId")
SELECT v.id, v.title, v.ord, v.type::"LessonType", v.dur, v.chapter, 'demo-course-math-posn-number' FROM (VALUES
  ('demo-l-math-posn-number-1-1','1.1 การหารลงตัวและจำนวนเฉพาะ',0,'VIDEO',2400,'บทที่ 1 การหารลงตัว'),
  ('demo-l-math-posn-number-1-2','1.2 ห.ร.ม. และ ค.ร.น.',1,'VIDEO',2280,'บทที่ 1 การหารลงตัว'),
  ('demo-l-math-posn-number-2-1','2.1 สมภาคมอดุโล',2,'VIDEO',2640,'บทที่ 2 สมภาค'),
  ('demo-l-math-posn-number-2-2','2.2 การแก้สมการสมภาค',3,'VIDEO',2520,'บทที่ 2 สมภาค')
) AS v(id, title, ord, type, dur, chapter)
WHERE EXISTS (SELECT 1 FROM "Course" WHERE "id"='demo-course-math-posn-number') ON CONFLICT ("id") DO NOTHING;


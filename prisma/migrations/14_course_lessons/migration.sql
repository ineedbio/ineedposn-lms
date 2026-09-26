-- Real lessons for เคมี สอวน. and the math terms, from backend/lessons/<course>.txt (same parser as
-- "+ วางหลายตอนพร้อมกัน"). Per course, only while it has no video lessons yet: placeholder lessons
-- without a video are removed first, and a course that already has videos is left alone.

-- chem-posn (43 ตอน)
DELETE FROM "Lesson" l WHERE l."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'chem-posn') AND l."youtubeUrl" IS NULL AND NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'chem-posn') AND x."youtubeUrl" IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "Quiz" z WHERE z."lessonId" = l."id");
INSERT INTO "Lesson" ("id","title","order","type","youtubeUrl","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.url, v.dur, v.chapter, v.prev, c."id" FROM (VALUES
  ('ib-l-chem-posn-ep1','EP.1 ปรับพื้นฐานเคมี',10,'https://youtu.be/E4gjhNzuLdU',11460,'ปรับพื้นฐานและปฏิบัติการ › ปรับพื้นฐานเคมี',true),
  ('ib-l-chem-posn-ep2','EP.2 ความปลอดภัยและเทคนิคปฏิบัติการ (ภาคทฤษฎีและคำนวณ)',20,'https://youtu.be/GqDKQSvAsp8',11760,'ปรับพื้นฐานและปฏิบัติการ › ความปลอดภัยและเทคนิคปฏิบัติการ',false),
  ('ib-l-chem-posn-ep3','EP.3 ความปลอดภัยและเทคนิคปฏิบัติการ (ภาคคำนวณเพิ่มเติมและข้อสอบ)',30,'https://youtu.be/0eZRtUXp5Rc',9900,'ปรับพื้นฐานและปฏิบัติการ › ความปลอดภัยและเทคนิคปฏิบัติการ',false),
  ('ib-l-chem-posn-ep4','EP.4 ทฤษฎีอะตอมและแบบจำลองอะตอม I',40,'https://youtu.be/P0ZfaCrUXD4',6840,'อะตอม ตารางธาตุ และพันธะเคมี › ทฤษฎีอะตอมและแบบจำลองอะตอม',false),
  ('ib-l-chem-posn-ep5','EP.5 ทฤษฎีอะตอมและแบบจำลองอะตอม II',50,'https://youtu.be/q5lWn7PU5So',10380,'อะตอม ตารางธาตุ และพันธะเคมี › ทฤษฎีอะตอมและแบบจำลองอะตอม',false),
  ('ib-l-chem-posn-ep6','EP.6 การจัดเรียงอิเล็กตรอน I',60,'https://youtu.be/iDCjrZ5XmZ8',8400,'อะตอม ตารางธาตุ และพันธะเคมี › การจัดเรียงอิเล็กตรอน',false),
  ('ib-l-chem-posn-ep7','EP.7 การจัดเรียงอิเล็กตรอน II',70,'https://youtu.be/o3B-07oyrOY',9180,'อะตอม ตารางธาตุ และพันธะเคมี › การจัดเรียงอิเล็กตรอน',false),
  ('ib-l-chem-posn-ep8','EP.8 ตารางธาตุ',80,'https://youtu.be/70k75G-Q0ws',8040,'อะตอม ตารางธาตุ และพันธะเคมี › ตารางธาตุและสมบัติของธาตุ',false),
  ('ib-l-chem-posn-ep9','EP.9 สมบัติธาตุหมู่ 1–18',90,'https://youtu.be/Ekn9jnF3HJo',7200,'อะตอม ตารางธาตุ และพันธะเคมี › ตารางธาตุและสมบัติของธาตุ',false),
  ('ib-l-chem-posn-ep10','EP.10 สมบัติธาตุหมู่ 1–18 (ต่อ) และสมบัติของธาตุกัมมันตรังสี',100,'https://youtu.be/p2ejfO78stw',8580,'อะตอม ตารางธาตุ และพันธะเคมี › ตารางธาตุและสมบัติของธาตุ',false),
  ('ib-l-chem-posn-ep11','EP.11 ธาตุกัมมันตรังสี สมการนิวเคลียร์ และพันธะโลหะ พันธะไอออนิก I',110,'https://youtu.be/1L1L7udSsM4',8280,'อะตอม ตารางธาตุ และพันธะเคมี › ตารางธาตุและสมบัติของธาตุ',false),
  ('ib-l-chem-posn-ep12','EP.12 พันธะไอออนิก (ภาคทฤษฎี) II',120,'https://youtu.be/pbM-BRNff6g',8040,'อะตอม ตารางธาตุ และพันธะเคมี › พันธะเคมี',false),
  ('ib-l-chem-posn-ep13','EP.13 วัฏจักร Born–Haber',130,'https://youtu.be/Sfj_A-pRYU0',8340,'อะตอม ตารางธาตุ และพันธะเคมี › พันธะเคมี',false),
  ('ib-l-chem-posn-ep14','EP.14 พลังงานในการละลาย และการเขียนสูตรโครงสร้างแสดงพันธะ I',140,'https://youtu.be/Jsg7hUes4xg',8040,'อะตอม ตารางธาตุ และพันธะเคมี › พันธะเคมี',false),
  ('ib-l-chem-posn-ep15','EP.15 การเขียนสูตรโครงสร้างแสดงพันธะ (ภาคทฤษฎี) II',150,'https://youtu.be/-w6kIg2L51s',8760,'อะตอม ตารางธาตุ และพันธะเคมี › พันธะเคมี',false),
  ('ib-l-chem-posn-ep16','EP.16 การคำนวณพลังงานพันธะ (ภาคคำนวณ)',160,'https://youtu.be/PUJoFXFZ9IY',9180,'อะตอม ตารางธาตุ และพันธะเคมี › พันธะเคมี',false),
  ('ib-l-chem-posn-ep17','EP.17 รูปร่างโมเลกุล และแรงยึดเหนี่ยวระหว่างโมเลกุล',170,'https://youtu.be/XU4C6cjs8gM',10200,'อะตอม ตารางธาตุ และพันธะเคมี › พันธะเคมี',false),
  ('ib-l-chem-posn-ep18','EP.18 มวลอะตอม (ภาคคำนวณ)',180,'https://youtu.be/1SB-Yn1X5Kg',6000,'ปริมาณสารสัมพันธ์และแก๊ส › มวลอะตอมและโมล',false),
  ('ib-l-chem-posn-ep19','EP.19 โมล (ภาคคำนวณ) I',190,'https://youtu.be/egSZTCq1LaM',6960,'ปริมาณสารสัมพันธ์และแก๊ส › มวลอะตอมและโมล',false),
  ('ib-l-chem-posn-ep20','EP.20 โมล (ภาคคำนวณ) II',200,'https://youtu.be/t4wmwwg1znM',7080,'ปริมาณสารสัมพันธ์และแก๊ส › มวลอะตอมและโมล',false),
  ('ib-l-chem-posn-ep21','EP.21 กฎทรงมวลและกฎสัดส่วนคงที่',210,'https://youtu.be/wmaKN6mlhKY',5880,'ปริมาณสารสัมพันธ์และแก๊ส › กฎทรงมวลและสูตรเคมี',false),
  ('ib-l-chem-posn-ep22','EP.22 ร้อยละโดยมวล สูตรโมเลกุลและสูตรอย่างง่าย I',220,'https://youtu.be/1TWm7bVAkCI',7320,'ปริมาณสารสัมพันธ์และแก๊ส › กฎทรงมวลและสูตรเคมี',false),
  ('ib-l-chem-posn-ep23','EP.23 ร้อยละโดยมวล สูตรโมเลกุลและสูตรอย่างง่าย II',230,'https://youtu.be/BWdIJcsdWJg',9060,'ปริมาณสารสัมพันธ์และแก๊ส › กฎทรงมวลและสูตรเคมี',false),
  ('ib-l-chem-posn-ep24','EP.24 ความเข้มข้นของสารละลาย และสมบัติของสารละลาย',240,'https://youtu.be/TzKiewgxjc0',8040,'ปริมาณสารสัมพันธ์และแก๊ส › สารละลาย',false),
  ('ib-l-chem-posn-ep25','EP.25 ปริมาณสัมพันธ์ของแก๊ส และสมการเคมีเบื้องต้น',250,'https://youtu.be/_Qci-wCwds0',5280,'ปริมาณสารสัมพันธ์และแก๊ส › สมการเคมีและปริมาณสัมพันธ์',false),
  ('ib-l-chem-posn-ep26','EP.26 สมการเคมี (ภาคคำนวณ) I',260,'https://youtu.be/flhprTQq8gs',7440,'ปริมาณสารสัมพันธ์และแก๊ส › สมการเคมีและปริมาณสัมพันธ์',false),
  ('ib-l-chem-posn-ep27','EP.27 สมการเคมี (ภาคคำนวณ) II',270,'https://youtu.be/3yfoIFazMVU',7140,'ปริมาณสารสัมพันธ์และแก๊ส › สมการเคมีและปริมาณสัมพันธ์',false),
  ('ib-l-chem-posn-ep28','EP.28 สมบัติของแก๊ส',280,'https://youtu.be/vWrqrwETURI',6180,'ปริมาณสารสัมพันธ์และแก๊ส › แก๊ส',false),
  ('ib-l-chem-posn-ep29','EP.29 กฎของแก๊ส',290,'https://youtu.be/5b3zGmSqeyY',5520,'ปริมาณสารสัมพันธ์และแก๊ส › แก๊ส',false),
  ('ib-l-chem-posn-ep30','EP.30 การแพร่และทฤษฎีจลน์ของแก๊ส',300,'https://youtu.be/8d3d70wUhZo',9120,'ปริมาณสารสัมพันธ์และแก๊ส › แก๊ส',false),
  ('ib-l-chem-posn-ep31','EP.31 การวัดอัตราการเกิดปฏิกิริยา',310,'https://youtu.be/4U_ctOCB2_U',4320,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › อัตราการเกิดปฏิกิริยา',false),
  ('ib-l-chem-posn-ep32','EP.32 การคำนวณอัตราการเกิดปฏิกิริยา',320,'https://youtu.be/UEfNiV1-AV0',3240,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › อัตราการเกิดปฏิกิริยา',false),
  ('ib-l-chem-posn-ep33','EP.33 ปัจจัยที่มีผลต่ออัตราการเกิดปฏิกิริยา ตอน 1',330,'https://youtu.be/g_bDwmpea2c',4920,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › อัตราการเกิดปฏิกิริยา',false),
  ('ib-l-chem-posn-ep34','EP.34 ปัจจัยที่มีผลต่ออัตราการเกิดปฏิกิริยา ตอน 2',340,'https://youtu.be/lCigmqrmG8s',5700,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › อัตราการเกิดปฏิกิริยา',false),
  ('ib-l-chem-posn-ep35','EP.35 ทฤษฎีที่ใช้อธิบายอัตราการเกิดปฏิกิริยา ตอน 1',350,'https://youtu.be/cNUK2llW_vk',5760,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › อัตราการเกิดปฏิกิริยา',false),
  ('ib-l-chem-posn-ep36','EP.36 ทฤษฎีที่ใช้อธิบายอัตราการเกิดปฏิกิริยา ตอน 2',360,'https://youtu.be/gt46OSi6hUk',3960,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › อัตราการเกิดปฏิกิริยา',false),
  ('ib-l-chem-posn-ep37','EP.37 สภาวะสมดุลและการเปลี่ยนแปลงสภาวะสมดุล ตอน 1',370,'https://youtu.be/KQqxRLOm7No',3900,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › สมดุลเคมี',false),
  ('ib-l-chem-posn-ep38','EP.38 สภาวะสมดุลและการเปลี่ยนแปลงสภาวะสมดุล ตอน 2',380,'https://youtu.be/KXEfZKaEM0U',4020,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › สมดุลเคมี',false),
  ('ib-l-chem-posn-ep39','EP.39 เฉลยการบ้าน การเปลี่ยนแปลงสภาวะสมดุล',390,'https://youtu.be/2aLerzQoifk',1320,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › สมดุลเคมี',false),
  ('ib-l-chem-posn-ep40','EP.40 สภาวะสมดุลและการเปลี่ยนแปลงสภาวะสมดุล ตอน 3',400,'https://youtu.be/_ihSgD3mqC4',3840,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › สมดุลเคมี',false),
  ('ib-l-chem-posn-ep41','EP.41 ค่าคงที่สมดุล',410,'https://youtu.be/ZTh0Tukpm9Q',3000,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › สมดุลเคมี',false),
  ('ib-l-chem-posn-ep42','EP.42 การคำนวณค่าคงที่สมดุล ตอน 1',420,'https://youtu.be/j4avTkRkIfU',5580,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › สมดุลเคมี',false),
  ('ib-l-chem-posn-ep43','EP.43 การคำนวณค่าคงที่สมดุล ตอน 2',430,'https://youtu.be/bhSbQPiTrjg',5460,'อัตราการเกิดปฏิกิริยาและสมดุลเคมี › สมดุลเคมี',false)
) AS v(id, title, ord, url, dur, chapter, prev) JOIN "Course" c ON c."slug" = 'chem-posn'
WHERE NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'chem-posn') AND x."youtubeUrl" IS NOT NULL)
ON CONFLICT ("id") DO NOTHING;

-- math-m4-t1 (25 ตอน)
DELETE FROM "Lesson" l WHERE l."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m4-t1') AND l."youtubeUrl" IS NULL AND NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m4-t1') AND x."youtubeUrl" IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "Quiz" z WHERE z."lessonId" = l."id");
INSERT INTO "Lesson" ("id","title","order","type","youtubeUrl","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.url, v.dur, v.chapter, v.prev, c."id" FROM (VALUES
  ('ib-l-math-m4-t1-ep1','EP.1 นิยามและสัญลักษณ์เซต',10,'https://youtu.be/oUMq28o--GM',2280,'บทที่ 1 เซต',true),
  ('ib-l-math-m4-t1-ep2','EP.2 เฉลยแบบฝึกหัดที่ 1',20,'https://youtu.be/PBPsTf_lYmY',780,'บทที่ 1 เซต',false),
  ('ib-l-math-m4-t1-ep3','EP.3 สมาชิก จำนวนสมาชิก สับเซตและพาวเวอร์เซต',30,'https://youtu.be/0udYQGZOa1c',2100,'บทที่ 1 เซต',false),
  ('ib-l-math-m4-t1-ep4','EP.4 เฉลยแบบฝึกหัดที่ 2 และ 3',40,'https://youtu.be/tBvfpo5P0pc',660,'บทที่ 1 เซต',false),
  ('ib-l-math-m4-t1-ep5','EP.5 การดำเนินการบนเซต (หัวข้อที่ 4–7)',50,'https://youtu.be/B0O9pV185mw',2520,'บทที่ 1 เซต',false),
  ('ib-l-math-m4-t1-ep6','EP.6 เฉลยข้อสอบท้ายบท เซต',60,'https://youtu.be/uo7dK29trqo',2100,'บทที่ 1 เซต',false),
  ('ib-l-math-m4-t1-ep7','EP.7 ตรรกศาสตร์ หัวข้อที่ 1–2',70,'https://youtu.be/XjMwoym9axU',840,'บทที่ 2 ตรรกศาสตร์',false),
  ('ib-l-math-m4-t1-ep8','EP.8 เฉลยหัวข้อที่ 1–2',80,'https://youtu.be/dE6DD4abKVg',600,'บทที่ 2 ตรรกศาสตร์',false),
  ('ib-l-math-m4-t1-ep9','EP.9 ตรรกศาสตร์ หัวข้อที่ 3–6',90,'https://youtu.be/1QDKo_ICZI4',1200,'บทที่ 2 ตรรกศาสตร์',false),
  ('ib-l-math-m4-t1-ep10','EP.10 เฉลยการบ้านหัวข้อที่ 3',100,'https://youtu.be/Rkiwkwo6T-o',480,'บทที่ 2 ตรรกศาสตร์',false),
  ('ib-l-math-m4-t1-ep11','EP.11 ตรรกศาสตร์ หัวข้อที่ 7–8',110,'https://youtu.be/COxNKdn0hkk',1320,'บทที่ 2 ตรรกศาสตร์',false),
  ('ib-l-math-m4-t1-ep12','EP.12 เฉลยการบ้านที่ 4 และ 5',120,'https://youtu.be/4QRwO0rcen4',480,'บทที่ 2 ตรรกศาสตร์',false),
  ('ib-l-math-m4-t1-ep13','EP.13 ตรรกศาสตร์ หัวข้อที่ 9–10',130,'https://youtu.be/lCrc6km7qqI',840,'บทที่ 2 ตรรกศาสตร์',false),
  ('ib-l-math-m4-t1-ep14','EP.14 เฉลยข้อสอบท้ายบท ตรรกศาสตร์',140,'https://youtu.be/_gSZjV7HRIo',720,'บทที่ 2 ตรรกศาสตร์',false),
  ('ib-l-math-m4-t1-ep15','EP.15 จำนวนจริง หัวข้อที่ 1–4',150,'https://youtu.be/lUL3bONlBRY',4260,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep16','EP.16 จำนวนจริง หัวข้อที่ 5–6',160,'https://youtu.be/RKuwO26dIEY',2460,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep17','EP.17 จำนวนจริง หัวข้อที่ 7–9',170,'https://youtu.be/mKryrAe17eI',3180,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep18','EP.18 เฉลยการบ้าน จำนวนจริง',180,'https://youtu.be/0RQMGKlMqb8',2700,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep19','EP.19 จำนวนจริง หัวข้อที่ 10',190,'https://youtu.be/6oIJLJfFp70',2520,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep20','EP.20 จำนวนจริง หัวข้อที่ 11–12',200,'https://youtu.be/H79x5KH8DAw',1380,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep21','EP.21 จำนวนจริง หัวข้อที่ 13–14',210,'https://youtu.be/LSIJ6pIn2VE',1860,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep22','EP.22 จำนวนจริง หัวข้อที่ 15',220,'https://youtu.be/cZn7pqJB7CI',4020,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep23','EP.23 จำนวนจริง หัวข้อที่ 15 (ต่อ)',230,'https://youtu.be/Y77TYozJjqI',1140,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep24','EP.24 จำนวนจริง หัวข้อที่ 16',240,'https://youtu.be/pH_308aAxLE',660,'บทที่ 3 จำนวนจริงและพหุนาม',false),
  ('ib-l-math-m4-t1-ep25','EP.25 จำนวนจริง หัวข้อที่ 17',250,'https://youtu.be/op_SiIU6Fnk',1620,'บทที่ 3 จำนวนจริงและพหุนาม',false)
) AS v(id, title, ord, url, dur, chapter, prev) JOIN "Course" c ON c."slug" = 'math-m4-t1'
WHERE NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m4-t1') AND x."youtubeUrl" IS NOT NULL)
ON CONFLICT ("id") DO NOTHING;

-- math-m5-t1 (11 ตอน)
DELETE FROM "Lesson" l WHERE l."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m5-t1') AND l."youtubeUrl" IS NULL AND NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m5-t1') AND x."youtubeUrl" IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "Quiz" z WHERE z."lessonId" = l."id");
INSERT INTO "Lesson" ("id","title","order","type","youtubeUrl","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.url, v.dur, v.chapter, v.prev, c."id" FROM (VALUES
  ('ib-l-math-m5-t1-ep1','EP.1 ตรีโกณมิติ: พื้นฐาน กราฟ และมุมผลบวกผลต่าง',10,'https://youtu.be/oWlGW-zNlmM',5880,'บทที่ 1 ฟังก์ชันตรีโกณมิติ',true),
  ('ib-l-math-m5-t1-ep2','EP.2 ตรีโกณมิติ: ผลต่าง ผลคูณ ผลบวก มุม 2 เท่า 3 เท่า ครึ่งเท่า',20,'https://youtu.be/8WT8OAONHtg',3240,'บทที่ 1 ฟังก์ชันตรีโกณมิติ',false),
  ('ib-l-math-m5-t1-ep3','EP.3 ตรีโกณมิติ: ข้อสอบจริง 5 ข้อ',30,'https://youtu.be/krjpzJyiTlo',2760,'บทที่ 1 ฟังก์ชันตรีโกณมิติ',false),
  ('ib-l-math-m5-t1-ep4','EP.4 อินเวิร์สฟังก์ชันตรีโกณมิติ และการแก้สมการ',40,'https://youtu.be/a6o1gzCCZ9o',3840,'บทที่ 1 ฟังก์ชันตรีโกณมิติ',false),
  ('ib-l-math-m5-t1-ep5','EP.5 มุมก้ม มุมเงย กฎของโคไซน์และกฎของไซน์',50,'https://youtu.be/_fd7oJrgjpo',3780,'บทที่ 1 ฟังก์ชันตรีโกณมิติ',false),
  ('ib-l-math-m5-t1-ep6','EP.6 เมทริกซ์ (ครบทั้งบท)',60,'https://youtu.be/wAFKWzMBKtU',7740,'บทที่ 2 เมทริกซ์',false),
  ('ib-l-math-m5-t1-ep7','EP.7 เวกเตอร์ ตอน 1',70,'https://youtu.be/wHG1fAKPzo4',2460,'บทที่ 3 เวกเตอร์',false),
  ('ib-l-math-m5-t1-ep8','EP.8 เวกเตอร์ ตอน 2',80,'https://youtu.be/CLZEBnptFts',2280,'บทที่ 3 เวกเตอร์',false),
  ('ib-l-math-m5-t1-ep9','EP.9 เวกเตอร์ ตอน 3',90,'https://youtu.be/DjR0Q4cwFOs',1320,'บทที่ 3 เวกเตอร์',false),
  ('ib-l-math-m5-t1-ep10','EP.10 เวกเตอร์ ตอน 4',100,'https://youtu.be/bNs3jXs5zHY',5940,'บทที่ 3 เวกเตอร์',false),
  ('ib-l-math-m5-t1-ep11','EP.11 เวกเตอร์ ตอน 5',110,'https://youtu.be/bz8ur23D9ao',2160,'บทที่ 3 เวกเตอร์',false)
) AS v(id, title, ord, url, dur, chapter, prev) JOIN "Course" c ON c."slug" = 'math-m5-t1'
WHERE NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m5-t1') AND x."youtubeUrl" IS NOT NULL)
ON CONFLICT ("id") DO NOTHING;

-- math-m5-t2 (5 ตอน)
DELETE FROM "Lesson" l WHERE l."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m5-t2') AND l."youtubeUrl" IS NULL AND NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m5-t2') AND x."youtubeUrl" IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "Quiz" z WHERE z."lessonId" = l."id");
INSERT INTO "Lesson" ("id","title","order","type","youtubeUrl","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.url, v.dur, v.chapter, v.prev, c."id" FROM (VALUES
  ('ib-l-math-m5-t2-ep1','EP.1 จำนวนเชิงซ้อน ตอน 1',10,'https://youtu.be/uy_H7veOfSc',2760,'บทที่ 1 จำนวนเชิงซ้อน',true),
  ('ib-l-math-m5-t2-ep2','EP.2 จำนวนเชิงซ้อน ตอน 2',20,'https://youtu.be/dv3vU34GNRY',3240,'บทที่ 1 จำนวนเชิงซ้อน',false),
  ('ib-l-math-m5-t2-ep3','EP.3 จำนวนเชิงซ้อน ตอน 3',30,'https://youtu.be/3OgRiQ8lsng',5880,'บทที่ 1 จำนวนเชิงซ้อน',false),
  ('ib-l-math-m5-t2-ep4','EP.4 หลักการนับและความน่าจะเป็น',40,'https://youtu.be/k6b1LXi3qow',2280,'บทที่ 2 หลักการนับเบื้องต้น',false),
  ('ib-l-math-m5-t2-ep5','EP.5 การเรียงสับเปลี่ยน (Permutation)',50,'https://youtu.be/Sv3EaHvTfoY',1440,'บทที่ 2 หลักการนับเบื้องต้น',false)
) AS v(id, title, ord, url, dur, chapter, prev) JOIN "Course" c ON c."slug" = 'math-m5-t2'
WHERE NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m5-t2') AND x."youtubeUrl" IS NOT NULL)
ON CONFLICT ("id") DO NOTHING;

-- math-m6-t1 (8 ตอน)
DELETE FROM "Lesson" l WHERE l."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m6-t1') AND l."youtubeUrl" IS NULL AND NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m6-t1') AND x."youtubeUrl" IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM "Quiz" z WHERE z."lessonId" = l."id");
INSERT INTO "Lesson" ("id","title","order","type","youtubeUrl","duration","chapter","isPreview","courseId")
SELECT v.id, v.title, v.ord, 'VIDEO'::"LessonType", v.url, v.dur, v.chapter, v.prev, c."id" FROM (VALUES
  ('ib-l-math-m6-t1-ep1','EP.1 ลิมิตของฟังก์ชัน ลิมิตซ้ายขวา และการหาลิมิตจากกราฟ',10,'https://youtu.be/eHSGKxQAVMw',6660,'บทที่ 2 แคลคูลัสเบื้องต้น',true),
  ('ib-l-math-m6-t1-ep2','EP.2 แคลคูลัส บทที่ 4–6',20,'https://youtu.be/QRws_uKe5ZQ',5760,'บทที่ 2 แคลคูลัสเบื้องต้น',false),
  ('ib-l-math-m6-t1-ep3','EP.3 แคลคูลัส บทที่ 7–8',30,'https://youtu.be/Us8Nt-G5A8o',3360,'บทที่ 2 แคลคูลัสเบื้องต้น',false),
  ('ib-l-math-m6-t1-ep4','EP.4 กฎของโลปิตาล (บทที่ 12)',40,'https://youtu.be/5VEKbYWfhmw',1080,'บทที่ 2 แคลคูลัสเบื้องต้น',false),
  ('ib-l-math-m6-t1-ep5','EP.5 แคลคูลัส บทที่ 9–11',50,'https://youtu.be/WuUsUri34fk',2880,'บทที่ 2 แคลคูลัสเบื้องต้น',false),
  ('ib-l-math-m6-t1-ep6','EP.6 แคลคูลัส บทที่ 13–16',60,'https://youtu.be/RSTvnd_5b4c',3360,'บทที่ 2 แคลคูลัสเบื้องต้น',false),
  ('ib-l-math-m6-t1-ep7','EP.7 ปริพันธ์ (อินทิเกรต)',70,'https://youtu.be/MXYRZAj8Wdc',3360,'บทที่ 2 แคลคูลัสเบื้องต้น',false),
  ('ib-l-math-m6-t1-ep8','EP.8 พื้นที่ใต้เส้นโค้ง',80,'https://youtu.be/XFdjRIlJIs8',3300,'บทที่ 2 แคลคูลัสเบื้องต้น',false)
) AS v(id, title, ord, url, dur, chapter, prev) JOIN "Course" c ON c."slug" = 'math-m6-t1'
WHERE NOT EXISTS (SELECT 1 FROM "Lesson" x WHERE x."courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'math-m6-t1') AND x."youtubeUrl" IS NOT NULL)
ON CONFLICT ("id") DO NOTHING;

-- Course copy from the brochure (Code.gs v2: setupCourses + setupMathCourses).
-- A field changes only when it is empty or still holds the text an earlier migration seeded,
-- so anything edited in หลังบ้าน is kept. Images are only filled in when empty.

-- BIO-POSN
UPDATE "Course" SET "subtitle" = 'ปูพื้นฐาน + เนื้อหาครบ 3 เล่ม + ตะลุยข้อสอบย้อนหลัง 8 ปี จบในคอร์สเดียว' WHERE "slug" = 'bio-posn' AND ("subtitle" IS NULL OR "subtitle" = '' OR "subtitle" = 'ครบทุกบทตามขอบเขต สอวน. พร้อมแนวข้อสอบย้อนหลัง');
UPDATE "Course" SET "description" = 'คอร์สเตรียมสอบคัดเลือกค่าย 1 สอวน. สาขาชีววิทยา ที่รวมทุกอย่างไว้ในคอร์สเดียว เรียนตามลำดับได้เลยไม่ต้องวางแผนเอง

1) ปูพื้นฐาน 6 ชั่วโมง (แถมฟรี) — สำหรับน้องที่ยังไม่เคยเรียนชีวะเชิงลึก ปูพื้นก่อนเข้าเนื้อหาจริง
2) เนื้อหา 3 เล่ม 70 ตอน — เล่ม 1 Fundamentum Vitae (ชีวเคมี เซลล์ พันธุศาสตร์ วิวัฒนาการ) · เล่ม 2 Organismus et Ambiens (อนุกรมวิธาน อาณาจักรสิ่งมีชีวิต นิเวศ พืช) · เล่ม 3 Systemata Corporis Humani (ระบบในร่างกายมนุษย์ครบทุกระบบ และพฤติกรรมสัตว์)
3) ตะลุยโจทย์ Examinophobia 26 ตอน — ไล่ข้อสอบคัดเลือกย้อนหลัง 8 ปี แยกตามเรื่อง พร้อมเฉลยและเทคนิคคิด

ทุกบทมีเฉลยการบ้านและเฉลยข้อสอบท้ายเรื่อง ดูซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ' WHERE "slug" = 'bio-posn' AND ("description" IS NULL OR "description" = '' OR "description" = 'คอร์สเตรียมสอบคัดเลือก สอวน. ค่าย 1 สาขาชีววิทยา
สอนตั้งแต่พื้นฐานเคมีของสิ่งมีชีวิตจนถึงพันธุศาสตร์และวิวัฒนาการ พร้อมชีทสรุปทุกบท
เหมาะกับนักเรียน ม.3–ม.5 ที่จะสอบในเดือนสิงหาคม');
UPDATE "Course" SET "highlights" = 'ปูพื้นฐาน 6 ชั่วโมง แถมฟรีในคอร์ส
เนื้อหาครบ 3 เล่ม POSN BOOK I–III รวม 70 ตอน
ตะลุยข้อสอบคัดเลือกย้อนหลัง 8 ปี (Examinophobia) 26 ตอน
เฉลยการบ้านและเฉลยข้อสอบท้ายทุกเรื่อง
รวมกว่า 80 ชั่วโมง ดูซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ' WHERE "slug" = 'bio-posn' AND ("highlights" IS NULL OR "highlights" = '' OR "highlights" = 'ครบทุกบทตามขอบเขต สอวน. ค่าย 1
ชีทสรุปประกอบทุกบท เปิดได้ข้างคลิป
เฉลยข้อสอบเก่าย้อนหลังพร้อมวิธีคิด
ดูซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ');
UPDATE "Course" SET "audience" = 'น้อง ม.3–ม.5 ที่จะสอบคัดเลือกค่าย 1 สอวน. ชีววิทยา
คนที่ยังไม่มีพื้นฐานชีวะเชิงลึก เริ่มจากปูพื้นฐานได้เลย
คนที่อ่านเองมาแล้ว อยากเก็บเนื้อหาให้ครบและฝึกข้อสอบจริง
น้องที่เตรียม A-Level ชีววิทยา ใช้ทบทวนเนื้อหาได้' WHERE "slug" = 'bio-posn' AND ("audience" IS NULL OR "audience" = '' OR "audience" = 'นักเรียน ม.3–ม.5 ที่จะสอบคัดเลือกค่าย 1 ในเดือนสิงหาคม
คนที่ยังไม่เคยเรียนชีววิทยาเชิงลึกมาก่อน
คนที่อยากทบทวนชีวะ ม.ปลายให้แน่นก่อนสอบ A-Level');
UPDATE "Course" SET "level" = 'สอวน.' WHERE "slug" = 'bio-posn' AND ("level" IS NULL OR "level" = '');
UPDATE "Course" SET "instructorName" = 'พี่พร้อม' WHERE "slug" = 'bio-posn' AND ("instructorName" IS NULL OR "instructorName" = '' OR "instructorName" = 'ทีมผู้สอน INeedBio');
UPDATE "Course" SET "instructorTitle" = 'ภวัต เศรษฐเสถียร' WHERE "slug" = 'bio-posn' AND ("instructorTitle" IS NULL OR "instructorTitle" = '' OR "instructorTitle" = 'ผู้สอนชีววิทยา สอวน.');
UPDATE "Course" SET "instructorBio" = 'นักศึกษาคณะวิศวกรรมศาสตร์ สาขาหุ่นยนต์และปัญญาประดิษฐ์ มหาวิทยาลัยเชียงใหม่
สอวน. ชีววิทยา ศูนย์มหาวิทยาลัยนเรศวร
นักเรียนดีเด่น GPAX 4.00 (2566) และ GPAX 3.94 (2567)
เหรียญเงินการแข่งขันหุ่นยนต์ระดับอาเซียน
เหรียญทองการแข่งขันหุ่นยนต์บังคับมือระดับภูมิภาค
ตัวจริงคณะวิศวกรรมศาสตร์ สาขาชีวการแพทย์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง
ตัวจริงคณะวิทยาศาสตร์ สาขาชีววิทยา มหาวิทยาลัยนเรศวร
ติดคณะเทคนิคการแพทย์ มหาวิทยาลัยพะเยา' WHERE "slug" = 'bio-posn' AND ("instructorBio" IS NULL OR "instructorBio" = '');
UPDATE "Course" SET "faq" = 'ต้องมีพื้นฐานชีวะมาก่อนไหม
ไม่ต้อง เริ่มจากส่วนปูพื้นฐาน 6 ชั่วโมงก่อน แล้วค่อยเข้าเนื้อหาเล่ม 1

ควรเรียนตามลำดับไหม
แนะนำให้เรียนตามลำดับ ปูพื้นฐาน → เล่ม 1 → เล่ม 2 → เล่ม 3 → ตะลุยโจทย์ เพราะเรื่องหลังใช้ความรู้จากเรื่องก่อน

ข้อสอบที่ใช้ตะลุยเป็นข้อสอบอะไร
ข้อสอบคัดเลือกค่าย 1 สอวน. ย้อนหลัง 8 ปี แยกตามเรื่อง พร้อมเฉลย

เรียนทันก่อนสอบไหม
เนื้อหากว่า 80 ชั่วโมง ถ้าเรียนวันละ 1 ชั่วโมงใช้ประมาณ 3 เดือน เร่งความเร็วคลิปได้ถึง 2 เท่า' WHERE "slug" = 'bio-posn' AND ("faq" IS NULL OR "faq" = '' OR "faq" = 'ต้องมีพื้นฐานชีวะมาก่อนไหม
ไม่จำเป็น คอร์สเริ่มจากพื้นฐานเคมีของสิ่งมีชีวิตก่อน แล้วค่อยลงลึก

มีแบบฝึกหัดไหม
มีท้ายทุกบท พร้อมเฉลยในคลิป');
UPDATE "Course" SET "instructorPhoto" = '/images/courses/pprom.webp' WHERE "slug" = 'bio-posn' AND ("instructorPhoto" IS NULL OR "instructorPhoto" = '');
UPDATE "Course" SET "coverImage" = '/images/courses/bio-posn.webp' WHERE "slug" = 'bio-posn' AND ("coverImage" IS NULL OR "coverImage" = '');
-- CHEM-POSN
UPDATE "Course" SET "subtitle" = 'Concepts of Chemistry 3 Part ครบ กระชับ ใช้ได้จริง' WHERE "slug" = 'chem-posn' AND ("subtitle" IS NULL OR "subtitle" = '' OR "subtitle" = 'ปูพื้นเคมีทั่วไปถึงอินทรีย์ สำหรับสอบคัดเลือกค่าย 1');
UPDATE "Course" SET "description" = 'คอร์สเตรียมสอบคัดเลือกค่าย 1 สอวน. สาขาเคมี เรียงเนื้อหาตามหนังสือ Concepts of Chemistry 3 Part

Part 1 — ปรับพื้นฐานเคมี · Safety and Laboratory Skill · Atomic Structure · Periodic Table
Part 2 — Basic Chemical Bond · Advanced Chemical Bond (พันธะโลหะ พันธะไอออนิก พันธะโคเวเลนต์)
Part 3 — Basic Stoichiometry · Solution · Advanced Stoichiometry · Gases

มีเนื้อหาที่เกินหลักสูตร สสวท. และเนื้อหาค่าย 1 หรือค่าย 2 บางเรื่อง โดยอ้างอิงจากข้อสอบโอลิมปิกปี 60–68 เพื่อให้น้องเจอโจทย์จริงแล้วไม่ตกใจ' WHERE "slug" = 'chem-posn' AND ("description" IS NULL OR "description" = '' OR "description" = 'ปูพื้นเคมีให้แน่นก่อนสอบคัดเลือกค่าย 1');
UPDATE "Course" SET "highlights" = 'ครบ 3 Part: พื้นฐานและอะตอม · พันธะเคมี · ปริมาณสัมพันธ์ สารละลาย แก๊ส
มีทักษะปฏิบัติการและความปลอดภัยในแล็บ
อ้างอิงข้อสอบโอลิมปิกปี 60–68
มีเนื้อหาเกินหลักสูตรที่ออกสอบค่าย
ดูซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ' WHERE "slug" = 'chem-posn' AND ("highlights" IS NULL OR "highlights" = '');
UPDATE "Course" SET "audience" = 'น้อง ม.3–ม.5 ที่จะสอบคัดเลือกค่าย 1 สอวน. เคมี
คนที่อยากปูพื้นเคมีให้แน่นก่อนเรียนในโรงเรียน
คนที่เตรียม TBAT, CU-ATS หรือ A-Level เคมี' WHERE "slug" = 'chem-posn' AND ("audience" IS NULL OR "audience" = '');
UPDATE "Course" SET "level" = 'สอวน.' WHERE "slug" = 'chem-posn' AND ("level" IS NULL OR "level" = '');
UPDATE "Course" SET "instructorName" = 'พี่หมีลี่' WHERE "slug" = 'chem-posn' AND ("instructorName" IS NULL OR "instructorName" = '');
UPDATE "Course" SET "instructorTitle" = 'วรานนท์ เพียรพัฒนรัฐ' WHERE "slug" = 'chem-posn' AND ("instructorTitle" IS NULL OR "instructorTitle" = '');
UPDATE "Course" SET "instructorBio" = 'สอวน. เคมี ค่าย 2 ศูนย์มหาวิทยาลัยนเรศวร (2567)
สำรองผู้แทนศูนย์ สอวน. เคมี ศูนย์มหาวิทยาลัยนเรศวร ลำดับที่ 1
TBAT Chemistry 730 · TBAT Physics 650
CU-ATS Chemistry 690
A-Level เคมี 87.50 · A-Level ชีววิทยา 88.0
มีประสบการณ์ทำงานในห้องปฏิบัติการและการแข่งขันงานวิจัยระดับชาติ ใช้และวิเคราะห์ข้อมูลจากเครื่องมือขั้นสูง เช่น NMR, IR และ LC-MS' WHERE "slug" = 'chem-posn' AND ("instructorBio" IS NULL OR "instructorBio" = '');
UPDATE "Course" SET "faq" = 'เนื้อหาเกินหลักสูตรโรงเรียนไหม
มีบางเรื่องที่เกินหลักสูตร สสวท. และเนื้อหาค่าย 1 หรือค่าย 2 อ้างอิงจากข้อสอบโอลิมปิกปี 60–68

ต้องมีพื้นฐานเคมีไหม
ไม่ต้อง Part 1 เริ่มจากปรับพื้นฐานเคมีก่อน

ใช้เตรียม TBAT หรือ A-Level ได้ไหม
ได้ เนื้อหาพื้นฐาน พันธะ และปริมาณสัมพันธ์เป็นแกนของข้อสอบเหล่านี้' WHERE "slug" = 'chem-posn' AND ("faq" IS NULL OR "faq" = '');
UPDATE "Course" SET "instructorPhoto" = '/images/courses/pmeelee.webp' WHERE "slug" = 'chem-posn' AND ("instructorPhoto" IS NULL OR "instructorPhoto" = '');
UPDATE "Course" SET "coverImage" = '/images/courses/chem-posn.webp' WHERE "slug" = 'chem-posn' AND ("coverImage" IS NULL OR "coverImage" = '');
-- PHYS-ALEVEL
UPDATE "Course" SET "subtitle" = 'คอร์สเดียว 5 เล่ม ครบฟิสิกส์ ม.ปลาย สอนโดยพี่หมอซัน' WHERE "slug" = 'phys-alevel' AND ("subtitle" IS NULL OR "subtitle" = '');
UPDATE "Course" SET "description" = 'คอร์สฟิสิกส์ ม.ปลาย ครบทั้ง 5 เล่ม ปูตั้งแต่พื้นฐานจนพร้อมสอบ A-Level

เล่ม 1 The Mechanics — กลศาสตร์ การเคลื่อนที่ แรง งานและพลังงาน
เล่ม 2 The Oscillation — การสั่น คลื่น เสียง และแสง
เล่ม 3 The Electromagnetism — ไฟฟ้าสถิต วงจรไฟฟ้า แม่เหล็ก และการเหนี่ยวนำ
เล่ม 4 The Thermodynamics — ของแข็ง ของไหล ความร้อน และแก๊ส
เล่ม 5 The Modern Physics — ฟิสิกส์ยุคใหม่ อะตอม และนิวเคลียร์

อธิบายแนวคิดก่อนสูตร แล้วตามด้วยโจทย์ที่อ้างอิงแนวข้อสอบ A-Level, PAT และหนังสือ สสวท. ไม่มีพื้นฐานก็เริ่มเรียนได้' WHERE "slug" = 'phys-alevel' AND ("description" IS NULL OR "description" = '' OR "description" = 'คอร์สฟิสิกส์ A-Level ครบทั้ง 5 เล่ม ตั้งแต่กลศาสตร์ไปจนถึงฟิสิกส์ยุคใหม่ อธิบายตั้งแต่พื้นฐาน เหมาะทั้งคนที่เพิ่งเริ่มและคนที่เตรียมสอบ');
UPDATE "Course" SET "highlights" = 'ครบ 5 เล่ม: กลศาสตร์ · การสั่น คลื่น แสง · ไฟฟ้าและแม่เหล็ก · ความร้อน · ฟิสิกส์ยุคใหม่
ไม่ต้องมีพื้นฐานก็เรียนได้
อ้างอิงแนวข้อสอบ A-Level, PAT และหนังสือ สสวท.
ดูได้ทั้งมือถือและคอม ดูซ้ำได้ไม่จำกัด' WHERE "slug" = 'phys-alevel' AND ("highlights" IS NULL OR "highlights" = '' OR "highlights" = 'ครบ 5 เล่ม: กลศาสตร์ การสั่น คลื่นและแสง ไฟฟ้าและแม่เหล็ก ความร้อน ฟิสิกส์ยุคใหม่
เรียนผ่าน YouTube (คลิปเรียน) ดูได้ทั้งมือถือและคอม
ไม่ต้องมีพื้นฐานก็เรียนได้
อ้างอิงข้อสอบ A-Level, PAT และหนังสือ สสวท.');
UPDATE "Course" SET "audience" = 'นักเรียน ม.4–ม.6 ที่อยากเข้าใจฟิสิกส์ตั้งแต่พื้นฐาน
คนที่เตรียมสอบ A-Level ฟิสิกส์
น้อง ม.ต้น ที่อยากเรียนล่วงหน้า' WHERE "slug" = 'phys-alevel' AND ("audience" IS NULL OR "audience" = '' OR "audience" = 'นักเรียน ม.1–ม.6 ที่อยากปูพื้นฟิสิกส์ให้แน่น
คนที่เตรียมสอบ A-Level ฟิสิกส์');
UPDATE "Course" SET "level" = 'A-Level' WHERE "slug" = 'phys-alevel' AND ("level" IS NULL OR "level" = '');
UPDATE "Course" SET "instructorName" = 'พี่หมอซัน' WHERE "slug" = 'phys-alevel' AND ("instructorName" IS NULL OR "instructorName" = '');
UPDATE "Course" SET "instructorTitle" = 'น.พ. อนันดา พงษ์สุราช' WHERE "slug" = 'phys-alevel' AND ("instructorTitle" IS NULL OR "instructorTitle" = '');
UPDATE "Course" SET "faq" = 'ไม่มีพื้นฐานฟิสิกส์เรียนได้ไหม
ได้ แต่ละเล่มเริ่มจากแนวคิดพื้นฐานก่อนเข้าสูตรและโจทย์

ควรเริ่มจากเล่มไหน
แนะนำเริ่มจากเล่ม 1 กลศาสตร์ เพราะเป็นพื้นของทุกเล่ม' WHERE "slug" = 'phys-alevel' AND ("faq" IS NULL OR "faq" = '' OR "faq" = 'ต้องมีพื้นฐานฟิสิกส์ไหม
ไม่ต้อง คอร์สเริ่มจากพื้นฐานของแต่ละเล่ม');
UPDATE "Course" SET "instructorPhoto" = '/images/courses/pmorsun.webp' WHERE "slug" = 'phys-alevel' AND ("instructorPhoto" IS NULL OR "instructorPhoto" = '');
UPDATE "Course" SET "coverImage" = '/images/courses/phys-alevel-cover.webp' WHERE "slug" = 'phys-alevel' AND ("coverImage" IS NULL OR "coverImage" = '');
-- MATH-M4-T1
UPDATE "Course" SET "subtitle" = 'เซต · ตรรกศาสตร์ · จำนวนจริง' WHERE "slug" = 'math-m4-t1' AND ("subtitle" IS NULL OR "subtitle" = '');
UPDATE "Course" SET "description" = 'คณิตศาสตร์ ม.4 เทอม 1 ตามหลักสูตรโรงเรียน เรียนเรื่อง เซต ตรรกศาสตร์ จำนวนจริงและพหุนาม

แต่ละบทเริ่มจากแนวคิดและนิยาม ตามด้วยตัวอย่างทีละระดับ แล้วปิดด้วยโจทย์ฝึกแนวข้อสอบในโรงเรียน ใช้เรียนล่วงหน้า ทบทวนก่อนสอบกลางภาคและปลายภาค และปูพื้นต่อไปสอบ A-Level

ซื้อคู่เทอม 1 และเทอม 2 ของชั้นเดียวกันเหลือ 690 หรือครบ ม.4–ม.6 ทั้ง 6 เทอม 1,890' WHERE "slug" = 'math-m4-t1' AND ("description" IS NULL OR "description" = '' OR "description" = 'คณิตศาสตร์ ม.4 เทอม 1 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้');
UPDATE "Course" SET "faq" = 'ต้องเรียนเทอม 1 ก่อนเทอม 2 ไหม
แนะนำให้เรียนตามลำดับ แต่ถ้าเคยเรียนเทอม 1 ในโรงเรียนแล้ว เริ่มเทอม 2 ได้เลย

ซื้อเทอม 1 ไปแล้ว อยากซื้อเทอม 2 ต่อ
ใส่เทอม 2 ลงตะกร้า ระบบคิดราคาแพ็กเกจทั้งปีแล้วหักยอดที่จ่ายไป จ่ายแค่ส่วนต่าง 200 บาท' WHERE "slug" = 'math-m4-t1' AND ("faq" IS NULL OR "faq" = '');
UPDATE "Course" SET "highlights" = 'ครบบท เซต
ครบบท ตรรกศาสตร์
ครบบท จำนวนจริงและพหุนาม
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690' WHERE "slug" = 'math-m4-t1' AND ("highlights" IS NULL OR "highlights" = '' OR "highlights" = 'ครบบท เซต
ครบบท ตรรกศาสตร์
ครบบท จำนวนจริง
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690');
UPDATE "Course" SET "audience" = 'นักเรียน ม.4 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต' WHERE "slug" = 'math-m4-t1' AND ("audience" IS NULL OR "audience" = '');
-- MATH-M4-T2
UPDATE "Course" SET "subtitle" = 'ฟังก์ชัน · เอกซ์โพเนนเชียลและลอการิทึม · ภาคตัดกรวย' WHERE "slug" = 'math-m4-t2' AND ("subtitle" IS NULL OR "subtitle" = '' OR "subtitle" = 'ความสัมพันธ์และฟังก์ชัน · เอกซ์โพเนนเชียลและลอการิทึม');
UPDATE "Course" SET "description" = 'คณิตศาสตร์ ม.4 เทอม 2 ตามหลักสูตรโรงเรียน เรียนเรื่อง ความสัมพันธ์และฟังก์ชัน ฟังก์ชันเอกซ์โพเนนเชียลและฟังก์ชันลอการิทึม เรขาคณิตวิเคราะห์และภาคตัดกรวย

แต่ละบทเริ่มจากแนวคิดและนิยาม ตามด้วยตัวอย่างทีละระดับ แล้วปิดด้วยโจทย์ฝึกแนวข้อสอบในโรงเรียน ใช้เรียนล่วงหน้า ทบทวนก่อนสอบกลางภาคและปลายภาค และปูพื้นต่อไปสอบ A-Level

ซื้อคู่เทอม 1 และเทอม 2 ของชั้นเดียวกันเหลือ 690 หรือครบ ม.4–ม.6 ทั้ง 6 เทอม 1,890' WHERE "slug" = 'math-m4-t2' AND ("description" IS NULL OR "description" = '' OR "description" = 'คณิตศาสตร์ ม.4 เทอม 2 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้');
UPDATE "Course" SET "faq" = 'ต้องเรียนเทอม 1 ก่อนเทอม 2 ไหม
แนะนำให้เรียนตามลำดับ แต่ถ้าเคยเรียนเทอม 1 ในโรงเรียนแล้ว เริ่มเทอม 2 ได้เลย

ซื้อเทอม 1 ไปแล้ว อยากซื้อเทอม 2 ต่อ
ใส่เทอม 2 ลงตะกร้า ระบบคิดราคาแพ็กเกจทั้งปีแล้วหักยอดที่จ่ายไป จ่ายแค่ส่วนต่าง 200 บาท' WHERE "slug" = 'math-m4-t2' AND ("faq" IS NULL OR "faq" = '');
UPDATE "Course" SET "highlights" = 'ครบบท ความสัมพันธ์และฟังก์ชัน
ครบบท ฟังก์ชันเอกซ์โพเนนเชียลและฟังก์ชันลอการิทึม
ครบบท เรขาคณิตวิเคราะห์และภาคตัดกรวย
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690' WHERE "slug" = 'math-m4-t2' AND ("highlights" IS NULL OR "highlights" = '' OR "highlights" = 'ครบบท ความสัมพันธ์และฟังก์ชัน
ครบบท ฟังก์ชันเอกซ์โพเนนเชียลและฟังก์ชันลอการิทึม
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690');
UPDATE "Course" SET "audience" = 'นักเรียน ม.4 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต' WHERE "slug" = 'math-m4-t2' AND ("audience" IS NULL OR "audience" = '');
-- MATH-M5-T1
UPDATE "Course" SET "subtitle" = 'ฟังก์ชันตรีโกณมิติ · เมทริกซ์ · เวกเตอร์' WHERE "slug" = 'math-m5-t1' AND ("subtitle" IS NULL OR "subtitle" = '');
UPDATE "Course" SET "description" = 'คณิตศาสตร์ ม.5 เทอม 1 ตามหลักสูตรโรงเรียน เรียนเรื่อง ฟังก์ชันตรีโกณมิติ เมทริกซ์ เวกเตอร์

แต่ละบทเริ่มจากแนวคิดและนิยาม ตามด้วยตัวอย่างทีละระดับ แล้วปิดด้วยโจทย์ฝึกแนวข้อสอบในโรงเรียน ใช้เรียนล่วงหน้า ทบทวนก่อนสอบกลางภาคและปลายภาค และปูพื้นต่อไปสอบ A-Level

ซื้อคู่เทอม 1 และเทอม 2 ของชั้นเดียวกันเหลือ 690 หรือครบ ม.4–ม.6 ทั้ง 6 เทอม 1,890' WHERE "slug" = 'math-m5-t1' AND ("description" IS NULL OR "description" = '' OR "description" = 'คณิตศาสตร์ ม.5 เทอม 1 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้');
UPDATE "Course" SET "faq" = 'ต้องเรียนเทอม 1 ก่อนเทอม 2 ไหม
แนะนำให้เรียนตามลำดับ แต่ถ้าเคยเรียนเทอม 1 ในโรงเรียนแล้ว เริ่มเทอม 2 ได้เลย

ซื้อเทอม 1 ไปแล้ว อยากซื้อเทอม 2 ต่อ
ใส่เทอม 2 ลงตะกร้า ระบบคิดราคาแพ็กเกจทั้งปีแล้วหักยอดที่จ่ายไป จ่ายแค่ส่วนต่าง 200 บาท' WHERE "slug" = 'math-m5-t1' AND ("faq" IS NULL OR "faq" = '');
UPDATE "Course" SET "highlights" = 'ครบบท ฟังก์ชันตรีโกณมิติ
ครบบท เมทริกซ์
ครบบท เวกเตอร์
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690' WHERE "slug" = 'math-m5-t1' AND ("highlights" IS NULL OR "highlights" = '');
UPDATE "Course" SET "audience" = 'นักเรียน ม.5 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต' WHERE "slug" = 'math-m5-t1' AND ("audience" IS NULL OR "audience" = '');
-- MATH-M5-T2
UPDATE "Course" SET "subtitle" = 'จำนวนเชิงซ้อน · หลักการนับเบื้องต้น · ความน่าจะเป็น' WHERE "slug" = 'math-m5-t2' AND ("subtitle" IS NULL OR "subtitle" = '');
UPDATE "Course" SET "description" = 'คณิตศาสตร์ ม.5 เทอม 2 ตามหลักสูตรโรงเรียน เรียนเรื่อง จำนวนเชิงซ้อน หลักการนับเบื้องต้น ความน่าจะเป็น

แต่ละบทเริ่มจากแนวคิดและนิยาม ตามด้วยตัวอย่างทีละระดับ แล้วปิดด้วยโจทย์ฝึกแนวข้อสอบในโรงเรียน ใช้เรียนล่วงหน้า ทบทวนก่อนสอบกลางภาคและปลายภาค และปูพื้นต่อไปสอบ A-Level

ซื้อคู่เทอม 1 และเทอม 2 ของชั้นเดียวกันเหลือ 690 หรือครบ ม.4–ม.6 ทั้ง 6 เทอม 1,890' WHERE "slug" = 'math-m5-t2' AND ("description" IS NULL OR "description" = '' OR "description" = 'คณิตศาสตร์ ม.5 เทอม 2 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้');
UPDATE "Course" SET "faq" = 'ต้องเรียนเทอม 1 ก่อนเทอม 2 ไหม
แนะนำให้เรียนตามลำดับ แต่ถ้าเคยเรียนเทอม 1 ในโรงเรียนแล้ว เริ่มเทอม 2 ได้เลย

ซื้อเทอม 1 ไปแล้ว อยากซื้อเทอม 2 ต่อ
ใส่เทอม 2 ลงตะกร้า ระบบคิดราคาแพ็กเกจทั้งปีแล้วหักยอดที่จ่ายไป จ่ายแค่ส่วนต่าง 200 บาท' WHERE "slug" = 'math-m5-t2' AND ("faq" IS NULL OR "faq" = '');
UPDATE "Course" SET "highlights" = 'ครบบท จำนวนเชิงซ้อน
ครบบท หลักการนับเบื้องต้น
ครบบท ความน่าจะเป็น
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690' WHERE "slug" = 'math-m5-t2' AND ("highlights" IS NULL OR "highlights" = '');
UPDATE "Course" SET "audience" = 'นักเรียน ม.5 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต' WHERE "slug" = 'math-m5-t2' AND ("audience" IS NULL OR "audience" = '');
-- MATH-M6-T1
UPDATE "Course" SET "subtitle" = 'ลำดับและอนุกรม · แคลคูลัสเบื้องต้น' WHERE "slug" = 'math-m6-t1' AND ("subtitle" IS NULL OR "subtitle" = '');
UPDATE "Course" SET "description" = 'คณิตศาสตร์ ม.6 เทอม 1 ตามหลักสูตรโรงเรียน เรียนเรื่อง ลำดับและอนุกรม แคลคูลัสเบื้องต้น

แต่ละบทเริ่มจากแนวคิดและนิยาม ตามด้วยตัวอย่างทีละระดับ แล้วปิดด้วยโจทย์ฝึกแนวข้อสอบในโรงเรียน ใช้เรียนล่วงหน้า ทบทวนก่อนสอบกลางภาคและปลายภาค และปูพื้นต่อไปสอบ A-Level

ซื้อคู่เทอม 1 และเทอม 2 ของชั้นเดียวกันเหลือ 690 หรือครบ ม.4–ม.6 ทั้ง 6 เทอม 1,890' WHERE "slug" = 'math-m6-t1' AND ("description" IS NULL OR "description" = '' OR "description" = 'คณิตศาสตร์ ม.6 เทอม 1 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้');
UPDATE "Course" SET "faq" = 'ต้องเรียนเทอม 1 ก่อนเทอม 2 ไหม
แนะนำให้เรียนตามลำดับ แต่ถ้าเคยเรียนเทอม 1 ในโรงเรียนแล้ว เริ่มเทอม 2 ได้เลย

ซื้อเทอม 1 ไปแล้ว อยากซื้อเทอม 2 ต่อ
ใส่เทอม 2 ลงตะกร้า ระบบคิดราคาแพ็กเกจทั้งปีแล้วหักยอดที่จ่ายไป จ่ายแค่ส่วนต่าง 200 บาท' WHERE "slug" = 'math-m6-t1' AND ("faq" IS NULL OR "faq" = '');
UPDATE "Course" SET "highlights" = 'ครบบท ลำดับและอนุกรม
ครบบท แคลคูลัสเบื้องต้น
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690' WHERE "slug" = 'math-m6-t1' AND ("highlights" IS NULL OR "highlights" = '');
UPDATE "Course" SET "audience" = 'นักเรียน ม.6 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต' WHERE "slug" = 'math-m6-t1' AND ("audience" IS NULL OR "audience" = '');
-- MATH-M6-T2
UPDATE "Course" SET "subtitle" = 'สถิติและข้อมูล · ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น' WHERE "slug" = 'math-m6-t2' AND ("subtitle" IS NULL OR "subtitle" = '');
UPDATE "Course" SET "description" = 'คณิตศาสตร์ ม.6 เทอม 2 ตามหลักสูตรโรงเรียน เรียนเรื่อง สถิติและข้อมูล ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น

แต่ละบทเริ่มจากแนวคิดและนิยาม ตามด้วยตัวอย่างทีละระดับ แล้วปิดด้วยโจทย์ฝึกแนวข้อสอบในโรงเรียน ใช้เรียนล่วงหน้า ทบทวนก่อนสอบกลางภาคและปลายภาค และปูพื้นต่อไปสอบ A-Level

ซื้อคู่เทอม 1 และเทอม 2 ของชั้นเดียวกันเหลือ 690 หรือครบ ม.4–ม.6 ทั้ง 6 เทอม 1,890' WHERE "slug" = 'math-m6-t2' AND ("description" IS NULL OR "description" = '' OR "description" = 'คณิตศาสตร์ ม.6 เทอม 2 เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้');
UPDATE "Course" SET "faq" = 'ต้องเรียนเทอม 1 ก่อนเทอม 2 ไหม
แนะนำให้เรียนตามลำดับ แต่ถ้าเคยเรียนเทอม 1 ในโรงเรียนแล้ว เริ่มเทอม 2 ได้เลย

ซื้อเทอม 1 ไปแล้ว อยากซื้อเทอม 2 ต่อ
ใส่เทอม 2 ลงตะกร้า ระบบคิดราคาแพ็กเกจทั้งปีแล้วหักยอดที่จ่ายไป จ่ายแค่ส่วนต่าง 200 บาท' WHERE "slug" = 'math-m6-t2' AND ("faq" IS NULL OR "faq" = '');
UPDATE "Course" SET "highlights" = 'ครบบท สถิติและข้อมูล
ครบบท ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น
ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690' WHERE "slug" = 'math-m6-t2' AND ("highlights" IS NULL OR "highlights" = '');
UPDATE "Course" SET "audience" = 'นักเรียน ม.6 ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ
คนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค
คนที่ปูพื้นเพื่อสอบ A-Level คณิต' WHERE "slug" = 'math-m6-t2' AND ("audience" IS NULL OR "audience" = '');

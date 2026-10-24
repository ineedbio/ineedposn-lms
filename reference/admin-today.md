# admin.today — หลังบ้าน › ภาพรวมวันนี้ (รอบ 7v)

อ่านอย่างเดียว ไม่เขียนฐานข้อมูล · แอดมินเท่านั้น (ผู้สอน/นักเรียน → `FORBIDDEN`, ไม่ล็อกอิน → `AUTH`) · ตอบด้วย `Cache-Control: no-store`
โค้ด: `lib/ib/today.ts` · หน้าเว็บ: `public/ineedbio/admin-today.js` (`#/admin/today`)

## รับ
`{ date?: "YYYY-MM-DD" }` — ไม่ส่ง = วันนี้ตามเวลาไทย · ผิดรูปแบบ → `BAD_INPUT`
ตัดวัน 00:00–23:59 Asia/Bangkok (`date+"T00:00:00+07:00"` ถึง +24 ชม.)

## นิยาม
- **สมาชิก** = `User.emailVerified = true` และไม่มีบทบาท admin/teacher (ตาม `rolesOf`: `roles = ''` และ `role = STUDENT` หรือ `roles` ไม่มีคำ admin/teacher)
- **ลงคอร์สแล้ว** = มี `Enrollment.status = ACTIVE` และ `expiresAt` ว่างหรือยังไม่ถึง อย่างน้อย 1 คอร์ส (รวมสิทธิ์ฟรีของนักเรียนเก่า / grant)
- **จ่ายเงิน** = มี `Payment.status = APPROVED`, `amount > 0`, `revokedAt IS NULL` ที่คู่กับ Enrollment ที่ยัง ACTIVE ของคอร์สเดียวกัน
- **รอตรวจสลิป** = `Payment.status = PENDING` + `Bill.status = 'reviewing'` · ถูกปฏิเสธ (`REJECTED` / bill `rejected`) ไม่นับ
- **วันของการลงคอร์ส** = วันที่สั่งซื้อ: `Payment.createdAt` (บิลจากตะกร้า: Payment ได้ `createdAt` = `Bill.createdAt`; วันอนุมัติอยู่ที่ `reviewedAt` ไม่ได้ใช้) และ `Bill.createdAt` ของบิลที่ยังรอตรวจ
- **เซลล์** เก็บใน `CellLedger` (1 แถว/ครั้ง, `delta` บวก = ได้, ลบ = ใช้ เช่น `redeem`) · ได้ทั้งหมด = `SUM(GREATEST(delta,0))` · คงเหลือ = `SUM(delta)` · ต่อเนื่อง/สูงสุดจาก `Streak` · วันเรียนทั้งหมด = จำนวน `StudyDay.credited = true`

## ส่งกลับ
```
{
  date, today,                       // วันที่ที่ดู, วันนี้ (เวลาไทย)
  totals: { members, enrolled, paid, no_course, pending },
  day: {
    signups: { n, list: [{ user_id, nickname, name, grade, school, heard_from, created_at }] },
    enrolls: [{ subject, subject_name, course_id, title, approved, approved_amount, pending, pending_amount }],
    enroll_list: [{ user_id, nickname, name, course_id, course, amount, status: "approved"|"pending", at, new_today }]
  },
  no_course_list: [{ user_id, nickname, name, grade, school, phone, line_id, email, created_at, days, heard_from,
                     has_pending, trial_courses: [ชื่อคอร์สที่เคยปลดล็อกไฟล์บทฟรี] }],   // เรียงสมัครล่าสุดก่อน
  cells_top: [{ rank, user_id, nickname, name, has_photo, total, balance, streak, best, study_days }]  // 50 คน, [] ถ้ายังไม่มี
}
```
- `heard_from` เป็นข้อความไทยจาก `APP.HEARD` ("" ถ้าไม่ได้ตอบ) · `approved`/`pending` = จำนวนคน, `*_amount` = บาท
- `cells_top` เรียง total มาก→น้อย เท่ากันให้ `study_days` มากกว่าก่อน · รูปโหลดแยกด้วย `admin.user.photo` (has_photo) ไม่มีรูปใช้แมว INeedBio
- ยอดรวมใช้ `count` / `groupBy` / SQL `SUM … GROUP BY` ในฐานข้อมูล

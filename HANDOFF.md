# INeedBio LMS — สรุปงานที่ทำแล้ว (ส่งต่อให้ Claude Code)

อ้างอิงจากแผนงานเดิม (`ineedbioplan.pdf`, จัดทำ 1 ก.ย. 2026) หมวด P2/P3/P4
งานทั้งหมดด้านล่างทำในเซสชันแชท (ไม่มี network เข้าถึง Vercel/Neon/R2 จริง —
**ยังไม่เคย build หรือ deploy จริง ต้องรัน `npm install && npm run build` และรีวิวก่อน deploy**)

---

## ✅ งานที่ทำเสร็จแล้ว

### 1. อีเมลแจ้งเตือนอัตโนมัติ (P2)
- **ไฟล์:** `app/api/payments/route.ts`, `app/api/payments/[id]/verify/route.ts`
- ฟังก์ชัน `notifyAdminNewEnrollment` และ `notifyStudentPaymentReviewed` มีอยู่แล้วใน `lib/email.ts` แต่ไม่เคยถูกเรียก — เสียบเข้าไปแล้ว
- ทั้งสองจุดห่อด้วย try/catch แยกจาก transaction หลัก (อีเมลพังไม่ทำให้ payment/enrollment ล้มเหลว แต่ log error ชัดเจน)

### 2. Progress bar จริงจากเวลาดูวิดีโอ (P2)
- **ไฟล์ใหม่:** `app/api/progress/route.ts`, `components/LessonPlayer.tsx`
- **ไฟล์แก้:** `app/(learn)/learn/[courseId]/page.tsx`
- เดิม: เปิดหน้าบทเรียน = `isCompleted: true` ทันที (บั๊กตามที่เอกสารระบุ)
- ใหม่: ใช้ YouTube IFrame API อ่านเวลาดูจริงจากฝั่ง client → ยิง progress ทุก 8 วิ ไปที่ `/api/progress` → เซิร์ฟเวอร์ตรวจ enrollment, กัน watchedSeconds ไม่ให้ลดลง, ตัดจบ (`isCompleted`) เมื่อดูถึง 90% ของความยาววิดีโอ
- Auto-fill `Lesson.duration` จากวิดีโอจริงถ้าแอดมินยังไม่ได้กรอก

### 3. Rate limiting ที่ `/api/auth/*` (P3)
- **ไฟล์ใหม่:** `lib/rate-limit.ts`
- **Schema:** เพิ่ม model `RateLimitHit` ใน `prisma/schema.prisma` + migration `prisma/migrations/2_rate_limit_hit/migration.sql`
- เป็น fixed-window counter บน Postgres (ไม่ใช้ in-memory เพราะ Vercel serverless ไม่ share memory ข้าม instance)
- ใส่ครบ: `register` (5/15นาที ต่อ IP), `verify-otp` POST (15/15นาที ต่อ IP) + PUT resend (3/15นาที ต่ออีเมล), `forgot-password` (3/15นาที ต่ออีเมล + 10/15นาที ต่อ IP), `reset-password` (10/15นาที ต่อ IP), **login** ใน `lib/auth.ts` (5/15นาที ต่อบัญชี + 20/15นาที ต่อ IP)
- แก้ `app/(auth)/login/page.tsx` ให้แสดงข้อความ "เข้าสู่ระบบผิดหลายครั้งเกินไป" เมื่อโดน rate limit

### 4. หน้าเปลี่ยนรหัสผ่าน (P3)
- **ไฟล์ใหม่:** `app/api/auth/change-password/route.ts`, `app/(student)/dashboard/settings/page.tsx`
- ใช้ได้ทั้งแอดมิน+นักเรียน (protected ผ่าน middleware เดิมที่ guard `/dashboard/*`)
- ต้องยืนยันรหัสผ่านเดิมก่อน มี rate limit 5 ครั้ง/15นาที
- เพิ่มลิงก์ "ตั้งค่า" ใน `components/Navbar.tsx`

### 5. ตรวจสิทธิ์แอดมินทั้งหมด (P3)
- ไล่เช็คทุก endpoint ใน `app/api/admin/*` → มี `requireAdmin()` ครบทุกจุด ไม่พบรูรั่ว
- ไล่เช็ค `Navbar.tsx`, `DesignStudio` page, หน้า public → **ไม่พบบั๊ก "ปุ่มแก้ไขหน้าโผล่ในมุมมองนักเรียน"** ที่เอกสารเดิมเตือนไว้ (อาจแก้ไปแล้วก่อนหน้านี้ หรือไม่เคยอยู่ในโค้ดเวอร์ชันนี้ — **ควรทดสอบจริงอีกทีเพื่อความชัวร์**)

### 6. ระบบสร้าง/แก้ข้อสอบจากหน้าแอดมิน (P2)
- **ไฟล์ใหม่:**
  - `app/api/admin/quizzes/route.ts` (POST สร้าง)
  - `app/api/admin/quizzes/[id]/route.ts` (PATCH/DELETE)
  - `app/api/admin/quizzes/[id]/questions/route.ts` (POST เพิ่มคำถาม)
  - `app/api/admin/quizzes/[id]/questions/[qid]/route.ts` (PATCH/DELETE คำถาม)
  - `app/(admin)/admin/quizzes/page.tsx`, `NewQuizButton.tsx`, `QuizEditor.tsx`
- รองรับ 2 ชนิดคำถามตาม schema เดิม: MCQ, SHORT_ANSWER (**เอกสารเดิมพูดถึง "4 ชนิดคำถาม" — ถ้าต้องการเพิ่มอีก 2 ชนิด ต้องคุยกับลูกค้าว่าคือชนิดไหน แล้วเพิ่ม enum `QuestionType` ใน schema**)
- เพิ่มเมนู "ข้อสอบ" ใน `components/AdminSidebar.tsx`
- UI ใช้ `prompt()`/`confirm()` แบบเดียวกับ `NewCourseButton.tsx` เดิม (ใช้งานได้แต่หยาบ — ควรทำเป็นฟอร์ม/modal จริงถ้ามีเวลา)

### 7. เริ่ม P4 cleanup
- ลบ script `db:push` ออกจาก `package.json` (อันตราย ทำให้เกิด schema drift แบบที่เคยทำเว็บล่มมาแล้ว)
- แก้ `.env.example`

---

## 🐛 บั๊กที่เจอเพิ่ม (ไม่อยู่ในเอกสารเดิม — สำคัญ)

**`.env.example` ใช้ชื่อตัวแปรผิด:** เขียนว่า `DIRECT_URL` แต่ `prisma/schema.prisma` อ่านจริงจาก
`DATABASE_URL_UNPOOLED` (`directUrl = env("DATABASE_URL_UNPOOLED")`) — ถ้าตั้งค่า env ตามไฟล์ example
ตรงๆ `prisma migrate` จะหาตัวแปรไม่เจอ **แก้ไปแล้วในไฟล์ที่ส่งมอบนี้**

---

## ❌ ยังไม่ได้ทำ

1. **Student-facing quiz player** — ตอนนี้แอดมินสร้างข้อสอบได้แล้ว แต่นักเรียน**ยังไม่มีหน้าทำข้อสอบเลย**
   (ไม่อยู่ใน P2 ที่ระบุไว้เดิม แต่จำเป็นถ้าจะให้ใช้งานจริงได้ครบวงจร — ต้องมี: หน้าแสดงคำถามทีละข้อ/ทั้งหมด,
   จับเวลาตาม `Quiz.timeLimit`, ส่งคำตอบไปสร้าง `QuizAttempt`, คำนวณคะแนน, แสดงผลผ่าน/ไม่ผ่านตาม `passScore`)
2. **P4 ที่เหลือ:**
   - ลบ/จัดการไฟล์ SQL เก่า: `prisma/init.sql` (ซ้ำซ้อนกับ migrations แล้ว ควรลบเพื่อกันรันผิดพลาด),
     `prisma/hotfix-2026-09-missing-columns.sql` (ควรใส่ note ว่า APPLIED แล้ว ไม่ต้องรันซ้ำ)
3. **Design Studio เต็มรูปแบบ** (ลากวางแบบ Canva) — เอกสารเดิมบอกว่าควรแยกเป็นเฟสของตัวเอง (16-30 ชม.)
4. **P1 (ทำไม่ได้จากในนี้เลย ต้องทำนอกโค้ด):**
   - ปลดระงับโดเมน `ineedbio.shop` ที่ Namecheap (ต้องยืนยัน WHOIS อีเมล)
   - ตั้งค่า Cloudflare R2 keys บน Vercel ใหม่
5. **ยังไม่ได้ทดสอบ/verify:**
   - Flow ลืมรหัสผ่านแบบครบวงจร
   - ย้ายกลับไปใช้ Resend เมื่อโดเมนกลับมาใช้ได้
   - **`npm run build` ยังไม่เคยรันผ่านสำเร็จ** (sandbox นี้บล็อก network ไม่ให้ดาวน์โหลด Prisma engine binary — เป็นข้อจำกัดของ sandbox เอง ไม่ใช่บั๊กโค้ด) — **ต้อง build จริงก่อน deploy**

---

---

## ส่วนต่อ — งานที่ทำเพิ่มในเซสชันนี้ (มี network + build จริง)

- `npm install && npm run build` **ผ่านแล้ว** หลังแก้บั๊กหนึ่งจุด: `lib/email.ts` เคยสร้าง
  `new Resend(...)` ตอน import โมดูล ซึ่ง throw ทันทีถ้าไม่มี `RESEND_API_KEY` — ทำให้
  `next build` fail ตอน collect page data ของทุก route ที่ import ไฟล์นี้ (register, payments, ฯลฯ)
  แก้เป็นสร้าง client แบบ lazy เฉพาะตอนจะส่งจริงผ่าน Resend เท่านั้น
- `prisma validate` ผ่าน (ยังไม่ได้ต่อ DB จริงในนี้ — ไม่มี network ไปหา Neon — ต้องรัน
  `prisma migrate dev`/`deploy` กับ DB จริงอีกทีก่อน deploy ตามที่แผนเดิมบอกไว้)
- **สร้างหน้าทำข้อสอบของนักเรียนแล้ว** (ข้อ 1 ใน "ยังไม่ได้ทำ" ด้านบน):
  - `app/(learn)/learn/quiz/[quizId]/page.tsx` — เช็คสิทธิ์ (ต้อง enroll ACTIVE ถ้าข้อสอบผูกกับ
    บทเรียนที่ไม่ใช่ preview), ส่งคำถามไปให้ client โดยไม่มีเฉลย
  - `components/QuizTaker.tsx` — จับเวลาถอยหลังตาม `Quiz.timeLimit`, ส่งคำตอบตอนหมดเวลาอัตโนมัติ,
    แสดงผลคะแนน/ผ่านไม่ผ่าน + เฉลยรายข้อหลังส่ง
  - `app/api/quizzes/[id]/attempt/route.ts` — ตรวจคำตอบฝั่งเซิร์ฟเวอร์ (ไม่เชื่อ client), สร้าง
    `QuizAttempt`, คำนวณ `score`/`isPassed` จาก `passScore`
  - เชื่อมจากหน้าบทเรียน: บทเรียนที่ `type === "QUIZ"` (ตั้งอัตโนมัติตอนแอดมินผูกข้อสอบกับบทเรียน)
    จะโชว์ปุ่ม "เริ่มทำข้อสอบ" แทนวิดีโอ ใน `app/(learn)/learn/[courseId]/page.tsx`
  - **ยังไม่ได้ทำ:** หน้ารายการ "ข้อสอบจำลอง" (mock exam ที่ไม่ผูกกับบทเรียน) ยังไม่มีจุดเข้าถึงจาก
    dashboard — เข้าได้เฉพาะทาง URL ตรง `/learn/quiz/[quizId]` ถ้ารู้ id ควรเพิ่ม section ใน
    `app/(student)/dashboard/page.tsx` ถ้าต้องการให้นักเรียนเห็นรายการข้อสอบจำลองเอง
- P4 cleanup ที่เหลือ: ลบ `prisma/init.sql` แล้ว (ซ้ำซ้อนกับ `prisma/migrations/0_init`),
  ใส่ note "APPLIED — do not run again" ใน `prisma/hotfix-2026-09-missing-columns.sql` แล้ว
- **ยังไม่ได้ทดสอบจริงกับ DB/deploy จริง** — sandbox นี้ไม่มี credentials ไปหา Neon/Vercel/R2
  ต้องรัน manual test ตามหัวข้อ "สิ่งที่ควรบอก Claude Code ให้ทำต่อ" ข้อ 3 เดิมก่อน deploy

---

## สิ่งที่ควรบอก Claude Code ให้ทำต่อ

```
1. npm install && npm run build — แก้ type error ที่เจอ (ถ้ามี) จากงานที่เพิ่งเพิ่ม
2. รัน prisma migrate dev (local) เพื่อเช็คว่า migration 2_rate_limit_hit ใช้ได้จริง
3. ทดสอบ manual: สมัครเรียน → เช็คอีเมลแอดมิน, ดูวิดีโอ → เช็ค progress อัปเดตจริง,
   ยิง login ผิดรัวๆ → เช็คโดน rate limit, สร้างข้อสอบจากหน้าแอดมิน
4. สร้าง student-facing quiz-taking page (ดูรายละเอียดในหัวข้อ "ยังไม่ได้ทำ" ข้อ 1)
5. ลบ prisma/init.sql, เพิ่ม note APPLIED ใน hotfix sql file
6. Deploy migration ด้วย `prisma migrate deploy` (รันอัตโนมัติผ่าน vercel-build อยู่แล้ว) — ระวังเป็นพิเศษ
   เพราะเคยมีปัญหา schema drift มาก่อน ให้ตรวจ diff ก่อน deploy จริงเสมอ
```

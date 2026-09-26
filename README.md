# INeedBio — เวอร์ชัน Next.js

## โครงสร้างไฟล์
```
app/
  layout.tsx        ← <html> ฟอนต์ Anuphan และสคริปต์ QR พร้อมเพย์
  page.tsx          ← หน้าเว็บ (โหลด public/ineedbio/app.js)
  ineedbio.css      ← สไตล์ทั้งหมด (ธีมสว่าง/มืด สีวิชา)
public/
  ineedbio/app.js   ← ตัวเว็บทั้งหมด: หน้าแรก คอร์ส ห้องเรียน โปรไฟล์ หลังบ้าน ข้อตกลง
  ineedbio/logo.webp← โลโก้แมว (ใช้เป็น favicon ด้วย)
  images/students/  ← รูปน้อง R01–R18 (ไม่มี R11)
  images/courses/   ← ปกคอร์ส A-Level ฟิสิกส์ + รูปพี่หมอซัน
backend/
  Code.gs           ← หลังบ้าน วางใน Google Apps Script (ไม่ได้รันบน Next.js)
  results.csv       ← ข้อมูลน้อง 18 คน สำหรับนำเข้าชีต Results
.env.example
```

## ติดตั้ง
1. `npm install`
2. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ URL ของ Apps Script Web App (ลงท้าย `/exec`)
3. `npm run dev` แล้วเปิด http://localhost:3000
4. ขึ้น Vercel: ใส่ `NEXT_PUBLIC_INEEDBIO_API_URL` ใน Settings → Environment Variables แล้ว Redeploy

## หลังบ้าน (Apps Script)
วาง `backend/Code.gs` → รัน `setup()` → Deploy เป็น Web app (Execute as: Me, Who has access: Anyone) → รัน `makeAdmin('อีเมลคุณ')`

## ใส่ข้อมูลน้อง
เปิดชีต Results → File → Import → อัปโหลด `backend/results.csv` → "Replace current sheet"
ลิงก์รูปในไฟล์ชี้ไปที่ `https://ineedbio.shop/images/students/Rxx.webp` แล้ว ใช้ได้ทันทีหลัง deploy เว็บ
รูปคอร์ส: หลังบ้าน → คอร์ส → ใส่ `https://ineedbio.shop/images/courses/phys-alevel-cover.webp` และ `.../pmorsun.webp`
รูปใหม่ต่อจากนี้: วางไฟล์ใน `public/images/` แล้ว deploy หรือกด "อัปโหลดรูป" ในหลังบ้าน (เก็บใน Google Drive)

## หมายเหตุ
- ลิงก์ในเว็บใช้แบบ `/#/course/ID`, `/#/admin`, `/#/terms` ทุกหน้าอยู่ใน route `/` เดียว
- ถ้าจะใส่ในโปรเจกต์ Next.js ที่มีอยู่แล้ว: คัดลอก `public/ineedbio`, `public/images`, `app/ineedbio.css`
  แล้วเอาเนื้อหา `page.tsx` ไปไว้ใน route ที่ต้องการ (CSS นี้เป็น global จะชนกับ Tailwind/สไตล์เดิมได้
  แนะนำให้ใช้แทนหน้าเดิมทั้งหมด)

## อัปเดต: ตะกร้า · บิลแยกบัญชี · โค้ดส่วนลด
วาง `backend/Code.gs` ตัวใหม่ → รัน `setup()` → Deploy เป็น New version แล้วตั้งค่าในหลังบ้าน: บัญชีรับเงิน, โค้ดส่วนลด, ตั้งค่า → การชำระเงิน
ตะกร้าอยู่ที่ `/#/cart` คำสั่งซื้อของนักเรียนอยู่ที่ `/#/orders`

## อัปเดต: คณิตแยกเทอม + แพ็กเกจ + วางหลายตอน
1. วาง `backend/Code.gs` ตัวใหม่ → รัน `setup()` (สร้างแท็บ Bundles) → Deploy เป็น New version
2. รัน `setupMathCourses()` ครั้งเดียว → ได้คอร์ส MATH-M4-T1 … MATH-M6-T2 (เทอมละ 490, สถานะร่าง) และแพ็กเกจ ม.ละ 690 / ครบ 3 ม. 1890
3. ใส่คลิปแต่ละคอร์ส แล้วเปลี่ยนเป็น "เปิดขาย" แพ็กเกจจะขึ้นหน้าเว็บเองเมื่อทุกคอร์สในแพ็กเกจเปิดขาย
4. ใส่คลิป: หลังบ้าน → คอร์ส → เลือกคอร์ส → "+ วางหลายตอนพร้อมกัน" → วางข้อความจากไฟล์ใน `backend/lessons/` ให้ตรงคอร์ส
   - `bio-posn.txt` ชีวะ 100 ตอน · `chem-posn.txt` เคมี 43 ตอน
   - `math-m4-t1.txt` 25 ตอน · `math-m5-t1.txt` 11 ตอน · `math-m5-t2.txt` 5 ตอน · `math-m6-t1.txt` 8 ตอน (ม.4 เทอม 2 และ ม.6 เทอม 2 ยังไม่มีคลิป)

## อัปเดต: ข้อมูลน้องเพิ่ม + คำอธิบายคอร์ส + แฟ้มหลังบ้าน
- วาง `Code.gs` ใหม่ → `setup()` (เพิ่มคอลัมน์ birthday, facebook, instagram, line_id) → Deploy New version
- รัน `setupCourses()` ใส่คำอธิบายคอร์ส ชีวะ (BIO-POSN) เคมี (CHEM-POSN) ฟิสิกส์ (PHYS-ALEVEL) จากโบรชัวร์ และสร้างคอร์สคณิต
  เติมเฉพาะช่องที่ว่าง ถ้าคอร์สในเว็บใช้รหัสอื่น แก้รหัสใน COURSE_COPY ใน Code.gs ก่อน

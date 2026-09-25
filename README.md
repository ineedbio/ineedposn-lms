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

# INeedBio — คำสั่งสำหรับ Claude Code

โปรเจกต์นี้คือหน้าเว็บ INeedBio (Next.js 14) ที่คุยกับหลังบ้าน Google Apps Script ผ่าน URL เดียว

## ก่อนเริ่มงานทุกครั้ง
- อ่าน `CLAUDE_CODE_PROMPT.md` แล้วทำตาม
- `npm run verify` ต้องผ่าน: `app.js`, `ineedbio.css`, `Code.gs` ต้องตรงกับ `CHECKSUMS.txt` ทุกไบต์ ห้ามแก้ ห้าม format
- หน้าตาต้องเหมือน `reference/demo.html` (เดโมที่รันได้เองไม่ต้องมีหลังบ้าน)

## โครงสร้าง
- `app/layout.tsx`, `app/page.tsx` — โหลดตัวเว็บ
- `public/ineedbio/app.js` — ตัวเว็บทั้งหมด (vanilla JS, hash route `/#/...`) **อย่า refactor เป็น React** ถ้าไม่ได้ถูกขอ
- `app/ineedbio.css` — สไตล์ทั้งหมด (global)
- `public/images/courses/` — ปกคอร์ส ปกแพ็กเกจ รูปผู้สอน (ใช้ลิงก์ `https://ineedbio.shop/images/courses/<ชื่อไฟล์>`)
- `backend/Code.gs` — หลังบ้าน **ไม่ได้รันบน Next.js** ต้องวางใน Google Apps Script (`backend/appsscript.json` = manifest สำหรับ clasp เปิด YouTube Data API ไว้แล้ว)
- สิทธิ์ผู้สอน/แอดมินตรวจที่หลังบ้าน (`staffOnly_`, `courseFor_`, `canSubject_`) ห้ามย้ายการตรวจสิทธิ์ไปไว้ที่หน้าเว็บอย่างเดียว
- `backend/lessons/*.txt` — รายการตอนของแต่ละคอร์ส (ชื่อไฟล์ = รหัสคอร์สตัวเล็ก) สำหรับวางที่ "+ วางหลายตอนพร้อมกัน" ในหลังบ้าน ห้ามใส่ลิงก์จริงลงเดโม

## งานที่ทำได้เลย
1. `npm install`
2. สร้าง `.env.local` จาก `.env.example` ใส่ `NEXT_PUBLIC_INEEDBIO_API_URL` (URL Web App ของ Apps Script ลงท้าย `/exec`) — ถามเจ้าของถ้ายังไม่มี
3. `npm run build` ต้องผ่าน แล้ว `npm run dev` เปิด http://localhost:3000 ตรวจว่าหน้าแรกขึ้นคอร์ส
4. Deploy: ถ้าโปรเจกต์เชื่อม Vercel อยู่แล้ว ใช้ `git push` ตามปกติ หรือ `vercel --prod` (ต้องล็อกอิน Vercel ก่อน) และตั้ง env `NEXT_PUBLIC_INEEDBIO_API_URL` ใน Vercel ด้วย

## ข้อควรระวัง
- ถ้าจะวางทับโปรเจกต์ Next.js เดิม ให้แตก branch ใหม่หรือสำรองก่อน `ineedbio.css` เป็น global CSS จะชนกับ Tailwind/สไตล์เดิม
- ห้าม commit `.env.local`
- ห้ามใส่รหัสคลิป YouTube ของคอร์สที่ขาย ลงในไฟล์ที่เปิดสาธารณะ

## งานที่ Claude Code ทำแทนไม่ได้ (เจ้าของต้องทำในเบราว์เซอร์)
1. Apps Script: วาง `backend/Code.gs` → รัน `setup()` (กดอนุญาตสิทธิ์ Google) → Deploy เป็น Web app (Execute as: Me, Who has access: Anyone) → คัดลอก URL `/exec`
   - ทางเลือก: ถ้าเจ้าของติดตั้ง `clasp` และรัน `clasp login` แล้ว Claude Code ใช้ `clasp push` และ `clasp deploy` แทนการวางมือได้ แต่ยังต้องรัน `setup()` ครั้งแรกใน editor เพื่อกดอนุญาตสิทธิ์
2. รัน `makeAdmin('อีเมล')` และ `setupCourses()` ใน editor (ใส่คำอธิบายคอร์สชีวะ เคมี ฟิสิกส์ + สร้างคอร์สคณิตแยกเทอมและแพ็กเกจ)
3. หลังบ้านบนเว็บ: ใส่คลิปคณิตแล้วเปลี่ยนคอร์สเป็น "เปิดขาย", วางไฟล์ใน `backend/lessons/` ที่ "+ วางหลายตอนพร้อมกัน", ตั้งบัญชีรับเงิน

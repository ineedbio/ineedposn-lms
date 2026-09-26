# คำสั่งสำหรับ Claude Code — ทำเว็บ ineedbio.shop ให้เหมือนเดโม 100%

(คัดลอกทั้งหมดตั้งแต่บรรทัดถัดไป วางในแชต Claude Code ที่เปิดอยู่ในโฟลเดอร์โปรเจกต์เว็บ)

---

ในโฟลเดอร์นี้มีไฟล์ `ineedbio-next.zip` คือเว็บ INeedBio เวอร์ชันสมบูรณ์ ต้องการให้เว็บ ineedbio.shop หน้าตาและการทำงานเหมือน `reference/demo.html` ในไฟล์ zip ทุกหน้า 100% ทำตามนี้ทีละขั้น ห้ามข้ามขั้น และรายงานผลทุกขั้น

## กฎเหล็ก (ห้ามฝ่าฝืน)
1. `public/ineedbio/app.js`, `app/ineedbio.css`, `backend/Code.gs` ต้องใช้ไฟล์จาก zip **ตามต้นฉบับทุกไบต์** ห้ามแก้ ห้าม format ห้าม prettier/eslint --fix ห้าม refactor เป็น React ห้ามแยกไฟล์ ห้ามย่อ ห้ามตัดบางส่วนออก ถ้าไฟล์ใหญ่เกินจะอ่าน ไม่ต้องอ่าน ให้คัดลอกด้วยคำสั่ง `cp`/`unzip` เท่านั้น ห้ามพิมพ์เนื้อหาไฟล์ขึ้นมาใหม่
2. ทั้งเว็บอยู่ใน route `/` เดียว ใช้ hash route (`/#/course/...`, `/#/admin`) ห้ามสร้าง route/หน้า Next.js เพิ่ม
3. ห้ามมี CSS อื่น (Tailwind, globals.css, CSS ของ template เดิม) โหลดร่วมกับ `ineedbio.css`
4. ห้าม commit `.env.local` และห้ามใส่รหัสคลิป YouTube ของคอร์สที่ขายลงในไฟล์ที่เปิดสาธารณะ (ไฟล์ `backend/lessons/*.txt` ใช้วางในหลังบ้านเท่านั้น ห้ามไปอยู่ใน `public/`)
5. ถ้าเจอปัญหาที่ต้องเดา ให้หยุดแล้วถามผม อย่าแก้ไฟล์ 3 ไฟล์ในข้อ 1 เพื่อให้ผ่าน

## ขั้นที่ 1 — สำรองและวางไฟล์
1. `git status` ถ้ามีงานค้างให้ commit ก่อน แล้วแตก branch ใหม่ `git checkout -b ineedbio-v2`
   - ก่อนลบอะไร ให้สำรองของเดิมไว้ที่ `_backup_before_v2/` (โค้ดหน้าเว็บ และ Code.gs เดิมถ้ามีในโปรเจกต์)
   - เว็บจริงตอนนี้มีหน้า "บัญชีรายรับ-รายจ่าย" ที่ทำเพิ่มไว้ก่อนหน้านี้ ซึ่งไม่มีใน zip (zip มีหน้า "รายรับรายจ่าย" ตัวใหม่แทน) ถ้าหน้าเดิมเก็บข้อมูลรายจ่ายไว้ที่ไหน (ชีต, localStorage, ไฟล์) ให้บอกผมก่อนว่าเก็บที่ไหน มีกี่รายการ จะได้ลงในระบบใหม่ ห้ามลบข้อมูลนั้น
2. แตก zip ไปที่โฟลเดอร์ชั่วคราว แล้วทำให้โปรเจกต์นี้มีไฟล์ **เหมือนในโฟลเดอร์ `ineedbio-next/` ทุกไฟล์** (ยกเว้น `node_modules`, `.next`)
   - เก็บไว้: `.git`, `.vercel`, `.env.local` (ถ้ามี)
   - ลบของเดิมที่ไม่มีใน zip: route อื่นใน `app/`, `app/globals.css`, `tailwind.config.*`, `postcss.config.*`, `components/`, `styles/` ของ template เดิม
   - ใช้ `package.json`, `next.config.mjs`, `tsconfig.json` จาก zip
3. คัดลอกด้วย `cp -R` / `rsync` เท่านั้น

## ขั้นที่ 2 — ตรวจไฟล์
1. `npm install`
2. `npm run verify` ต้องได้ `✅ ไฟล์ตรงกับเดโมครบ` (คำเตือนเรื่อง `.env.local` ข้ามได้ถ้ายังไม่มี URL)
   ถ้ามี ❌ ให้คัดลอกไฟล์นั้นจาก zip ใหม่ ห้ามแก้ `CHECKSUMS.txt`
3. `npm run build` ต้องผ่านไม่มี error

## ขั้นที่ 3 — เทียบหน้าตากับเดโม
1. `npm run dev` แล้วเปิด http://localhost:3000
2. เปิด `reference/demo.html` ในเบราว์เซอร์อีกแท็บ (ไฟล์นี้รันได้เองโดยไม่ต้องมีหลังบ้าน มีปุ่ม "เข้าเป็นนักเรียน/แอดมิน" ในหน้าเข้าสู่ระบบ)
3. ถ้ามี Playwright ให้ถ่ายภาพทั้งสองฝั่งที่ขนาด 1280×900 และ 390×844 ในหน้าต่อไปนี้ แล้วเทียบกัน:
   `#/`, `#/course/BIO-POSN`, `#/course/MATH-M4-T1`, `#/cart`, `#/results`, `#/terms`, `#/privacy`, หน้าต่างสมัครสมาชิก
   และหลังล็อกอิน (ในเดโมมีปุ่มเข้าเป็นนักเรียน / ผู้สอนเคมี / แอดมิน): `#/my`, `#/profile`, `#/orders`, `#/admin`, `#/admin/finance`, `#/admin/legacy`, `#/admin/log`, `#/admin/users`, `#/admin/course/CHEM-POSN` (ทั้ง 3 แท็บ), `#/admin/course/BIO-POSN` (ปุ่ม "ไฟล์" ท้ายตอน และปุ่ม "✎ เปลี่ยนชื่อ" บนแถบบทสีเขียว), `#/learn/BIO-POSN` (มีไฟล์ประกอบใต้คลิปตอนแรก)
4. สิ่งที่**ต่างได้**เพราะเว็บจริงดึงข้อมูลจาก Google Sheets: รายชื่อคอร์ส ราคา จำนวนตอน ข้อมูลผู้ใช้ คำสั่งซื้อ
   สิ่งที่**ต้องเหมือน**: ฟอนต์ สี ธีมสว่าง/มืด ระยะห่าง แอนิเมชัน ปุ่ม เมนู โครงแต่ละหน้า โมดัล ตะกร้า ห้องเรียน หลังบ้าน
5. ถ้าหน้าตาต่าง ให้หาสาเหตุจากสิ่งที่อยู่นอก 3 ไฟล์หลัก (CSS อื่นทับ, layout.tsx เพี้ยน, รูปหาย, ฟอนต์ไม่โหลด) แล้วรายงานผมพร้อมภาพก่อน/หลัง
6. เปิด DevTools Console ต้องไม่มี error สีแดง (ยกเว้นข้อความว่ายังไม่ได้ตั้ง API URL ถ้ายังไม่มี `.env.local`)

## ขั้นที่ 4 — ต่อหลังบ้าน
1. ถามผมเรื่อง URL Apps Script (ลงท้าย `/exec`) แล้วใส่ใน `.env.local`:
   `NEXT_PUBLIC_INEEDBIO_API_URL=https://script.google.com/macros/s/…/exec`
2. ถ้าเครื่องมี `clasp` และผมล็อกอินแล้ว: `clasp push` เอา `backend/Code.gs` ขึ้น แล้ว `clasp deploy` เป็นเวอร์ชันใหม่บน deployment เดิม (ห้ามสร้าง deployment ใหม่ เพราะ URL จะเปลี่ยน)
   ถ้าไม่มี clasp: บอกผมให้วาง `backend/Code.gs` เองใน Apps Script
3. สรุปให้ผมทำใน Apps Script editor ตามลำดับ (Claude Code ทำแทนไม่ได้):
   - รัน `setup()` แล้วกดอนุญาตสิทธิ์
   - เปิด Services → YouTube Data API v3 (ถ้าใช้ clasp มีใน `backend/appsscript.json` แล้ว) แล้วรัน `installTriggers()` หนึ่งครั้ง
   - รัน `setupCourses()`
   - รัน `makeAdmin('อีเมลแอดมิน')` ถ้ายังไม่ได้ทำ
   - Deploy → Manage deployments → แก้ไข deployment เดิม → New version
4. `npm run dev` อีกรอบ ตรวจว่าหน้าแรกขึ้นคอร์สจริง สมัครสมาชิกได้ (ต้องใส่รูปและติ๊กยินยอม) และเข้าหลังบ้านได้

## ขั้นที่ 5 — ขึ้นเว็บจริง
1. `npm run verify` และ `npm run build` ต้องผ่านอีกรอบ
2. commit (ไม่รวม `.env.local`) แล้ว push ไป branch ที่ Vercel ใช้ deploy หรือรัน `vercel --prod`
3. ตรวจใน Vercel → Settings → Environment Variables ว่ามี `NEXT_PUBLIC_INEEDBIO_API_URL` ถ้าเพิ่งเพิ่มต้อง Redeploy
4. เปิด https://ineedbio.shop แบบล้างแคช (Ctrl+Shift+R) ตรวจหน้าเดิมทั้งหมดอีกรอบ และตรวจว่า
   `https://ineedbio.shop/ineedbio/app.js` เป็นไฟล์ใหม่ (ต้องมีคำว่า `consentBox`, `safePlayer`, `filesModal`, `legacyImportModal`)

## ขั้นที่ 6 — รายงานผล
ส่งสรุปให้ผม: ผล `npm run verify` / `npm run build`, หน้าที่เทียบแล้วเหมือน, หน้าที่ยังต่าง (พร้อมเหตุผล), และสิ่งที่ผมต้องทำเองในหลังบ้าน
งานใส่คลิป: หลังบ้าน → คอร์ส → เลือกคอร์ส → "+ วางหลายตอนพร้อมกัน" → วางข้อความจาก `backend/lessons/<รหัสคอร์สตัวเล็ก>.txt`

// ตรวจว่าโปรเจกต์ตรงกับเดโมครบทุกไฟล์  ใช้: npm run verify
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const bad = [], warn = [];
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const has = (f, ...needles) => { if (!existsSync(f)) return bad.push('ไม่มีไฟล์ ' + f); const s = readFileSync(f, 'utf8'); needles.forEach((n) => { if (!s.includes(n)) bad.push(`${f} ไม่มี "${n}"`); }); };

// 1) ไฟล์หลักต้องตรงกับเดโมทุกไบต์ (ห้ามแก้ ห้าม format ห้าม refactor)
for (const line of readFileSync('CHECKSUMS.txt', 'utf8').trim().split('\n')) {
  const [h, f] = line.trim().split(/\s+/);
  if (!existsSync(f)) bad.push('ไม่มีไฟล์ ' + f);
  else if (sha(f) !== h) bad.push(`${f} ไม่ตรงกับเดโม (ถูกแก้/format/คัดลอกไม่ครบ)`);
}
// 2) โครงหน้า
has('app/page.tsx', 'id="splash"', 'id="topbar"', 'id="app"', 'id="modal"', 'id="toasts"', '/ineedbio/app.js', 'window.INEEDBIO_API_URL');
has('app/layout.tsx', "import './ineedbio.css'", 'qrcode-generator/1.4.4', 'family=Anuphan', 'lang="th"');
// 3) รูป
const need = ['public/ineedbio/logo.webp', ...['bio-posn', 'chem-posn', 'phys-alevel-cover', 'pprom', 'pnk', 'pmeelee', 'pmorsun', 'math-all', 'math-m4', 'math-m5', 'math-m6',
  'math-m4-t1', 'math-m4-t2', 'math-m5-t1', 'math-m5-t2', 'math-m6-t1', 'math-m6-t2', 'math-book-1', 'math-book-2', 'math-book-3', 'math-book-4', 'math-book-5', 'math-book-6'].map((n) => `public/images/courses/${n}.webp`)];
need.forEach((f) => { if (!existsSync(f)) bad.push('ไม่มีรูป ' + f); });
const stu = existsSync('public/images/students') ? readdirSync('public/images/students').length : 0;
if (stu < 17) bad.push(`รูปน้องใน public/images/students มี ${stu} ไฟล์ (ต้องมี 17)`);
// 4) สิ่งที่มักทำให้หน้าตาเพี้ยน
['tailwind.config.js', 'tailwind.config.ts', 'app/globals.css', 'postcss.config.js', 'postcss.config.mjs'].forEach((f) => { if (existsSync(f)) warn.push(`เจอ ${f} — สไตล์อื่นจะทับ ineedbio.css ให้ลบหรือเลิก import`); });
if (existsSync('app') && readdirSync('app').some((f) => !['layout.tsx', 'page.tsx', 'ineedbio.css', 'favicon.ico'].includes(f))) warn.push('ใน app/ มีไฟล์/route อื่นนอกจาก layout.tsx page.tsx ineedbio.css: ' + readdirSync('app').join(', '));
if (!existsSync('.env.local') || !/NEXT_PUBLIC_INEEDBIO_API_URL=https:\/\/script\.google\.com\/macros\/s\/[^/\s]+\/exec/.test(readFileSync('.env.local', 'utf8'))) warn.push('.env.local ยังไม่มี NEXT_PUBLIC_INEEDBIO_API_URL=https://script.google.com/macros/s/…/exec');

warn.forEach((w) => console.log('⚠️  ' + w));
if (bad.length) { bad.forEach((b) => console.log('❌ ' + b)); console.log(`\nไม่ผ่าน ${bad.length} ข้อ`); process.exit(1); }
console.log('✅ ไฟล์ตรงกับเดโมครบ');

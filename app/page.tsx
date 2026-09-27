import Script from 'next/script';

// URL ของ Apps Script Web App — ตั้งใน .env.local หรือใน Vercel → Settings → Environment Variables
// Backend: /api/ib on this site (Neon). NEXT_PUBLIC_INEEDBIO_API_URL overrides it, e.g. an Apps Script /exec URL.
const API_URL = process.env.NEXT_PUBLIC_INEEDBIO_API_URL || '/api/ib';
// Analytics / ads — optional. Loaded by consent.js only after the visitor allows that kind of cookie.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';

export default function Home() {
  return (
    <>
      <div id="splash" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ineedbio/logo.webp" alt="" />
        <b>กำลังเปิด INeedBio…</b>
      </div>
      <div className="topbar" id="topbar" />
      <div id="app" />
      <div id="modal" />
      <div className="toasts" id="toasts" aria-live="polite" />

      <Script id="ineedbio-config" strategy="beforeInteractive">
        {`window.INEEDBIO_API_URL = ${JSON.stringify(API_URL)}; window.INEEDBIO_GA_ID = ${JSON.stringify(GA_ID)}; window.INEEDBIO_PIXEL_ID = ${JSON.stringify(PIXEL_ID)};`}
      </Script>
      {/* สีประจำวิชา (ชีวะเขียว · เคมีม่วง · ฟิสิกส์แดง · คณิตส้ม) ทั้งเว็บ — ก่อนวาดหน้า จะได้ไม่กระพริบ */}
      <Script src="/ineedbio/subject-colors.js" strategy="beforeInteractive" />
      {/* ตัวเว็บทั้งหมด (หน้าแรก คอร์ส ห้องเรียน หลังบ้าน) — ใช้ hash route เช่น /#/course/ID */}
      {/* fixes for app.js that can't go in app.js itself (it must match the zip byte for byte) */}
      <Script src="/ineedbio/fixes.js" strategy="afterInteractive" />
      <Script src="/ineedbio/app.js" strategy="afterInteractive" />
      {/* "รีวิวจากน้องๆ" on the home page (added next to app.js, which stays unchanged) */}
      <Script src="/ineedbio/reviews.js" strategy="afterInteractive" />
      {/* หน้าคอร์ส: เล่นตอนดูฟรีอัตโนมัติ (ปิดเสียงไว้ก่อน) · ซ่อนจำนวนตอน/ชั่วโมงบนหน้าสาธารณะ */}
      <Script src="/ineedbio/course-page.js" strategy="afterInteractive" />
      {/* ขนาดวิดีโอตามกล่องจริง: หมุนจอ / เต็มจอ บน iPhone-iPad ไม่ครอปผิดตำแหน่ง */}
      <Script src="/ineedbio/player-fit.js" strategy="afterInteractive" />
      {/* เลขคำสั่งซื้อ (BIO-0001 …) บนหลังบ้าน เห็นเฉพาะแอดมิน */}
      <Script src="/ineedbio/admin-orders.js" strategy="afterInteractive" />
      {/* "+ เพิ่มสิทธิ์ให้ผู้ใช้เอง": เลือกได้หลายคอร์สพร้อมกัน */}
      <Script src="/ineedbio/grant-multi.js" strategy="afterInteractive" />
      {/* โค้ด INEEDWEB ข้างราคาในหน้าคอร์ส + ใส่ให้เองในตะกร้า */}
      <Script src="/ineedbio/promo.js" strategy="afterInteractive" />
      {/* หลังบ้าน: สีแยกกลุ่มเมนู · แก้ไข/ลบรายรับ */}
      <Script src="/ineedbio/admin-ui.js" strategy="afterInteractive" />
      {/* หลังบ้าน → ชีทสรุป (เตรียมข้อมูล/อัปโหลด PDF · ยังไม่เปิดขาย ไม่มีหน้าฝั่งนักเรียน) */}
      <Script src="/ineedbio/admin-sheets.js" strategy="afterInteractive" />
      {/* แถบยอมรับคุกกี้ — สคริปต์วิเคราะห์/การตลาดโหลดเฉพาะเมื่อผู้ใช้อนุญาต */}
      <Script src="/ineedbio/consent.js" strategy="afterInteractive" />
    </>
  );
}

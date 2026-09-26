import Script from 'next/script';

// URL ของ Apps Script Web App — ตั้งใน .env.local หรือใน Vercel → Settings → Environment Variables
// Backend: /api/ib on this site (Neon). NEXT_PUBLIC_INEEDBIO_API_URL overrides it, e.g. an Apps Script /exec URL.
const API_URL = process.env.NEXT_PUBLIC_INEEDBIO_API_URL || '/api/ib';

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
        {`window.INEEDBIO_API_URL = ${JSON.stringify(API_URL)};`}
      </Script>
      {/* ตัวเว็บทั้งหมด (หน้าแรก คอร์ส ห้องเรียน หลังบ้าน) — ใช้ hash route เช่น /#/course/ID */}
      {/* fixes for app.js that can't go in app.js itself (it must match the zip byte for byte) */}
      <Script src="/ineedbio/fixes.js" strategy="afterInteractive" />
      <Script src="/ineedbio/app.js" strategy="afterInteractive" />
      {/* "รีวิวจากน้องๆ" on the home page (added next to app.js, which stays unchanged) */}
      <Script src="/ineedbio/reviews.js" strategy="afterInteractive" />
      {/* เลขคำสั่งซื้อ (BIO-0001 …) บนหลังบ้าน เห็นเฉพาะแอดมิน */}
      <Script src="/ineedbio/admin-orders.js" strategy="afterInteractive" />
      {/* "+ เพิ่มสิทธิ์ให้ผู้ใช้เอง": เลือกได้หลายคอร์สพร้อมกัน */}
      <Script src="/ineedbio/grant-multi.js" strategy="afterInteractive" />
    </>
  );
}

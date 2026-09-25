import Script from 'next/script';

// หลังบ้าน: /api/ib ในเว็บนี้เอง (ฐานข้อมูล Neon) — ถ้าจะกลับไปใช้ Apps Script ให้ตั้ง
// NEXT_PUBLIC_INEEDBIO_API_URL เป็น URL ที่ลงท้าย /exec
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
      <Script src="/ineedbio/app.js" strategy="afterInteractive" />
    </>
  );
}

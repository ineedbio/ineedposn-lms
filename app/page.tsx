import Script from 'next/script';

// URL ของ Apps Script Web App — ตั้งใน .env.local หรือใน Vercel → Settings → Environment Variables
const API_URL = process.env.NEXT_PUBLIC_INEEDBIO_API_URL || '';

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
      {/* ตัวเว็บทั้งหมด (หน้าแรก คอร์ส ห้องเรียน หลังบ้าน) — ใช้ hash route เช่น /#/course/ID
          ยังไม่ได้ตั้ง API URL: เปิดโหมดเดโม (demo.js จำลองหลังบ้านในเบราว์เซอร์ แล้วค่อยโหลด app.js) */}
      <Script src={API_URL ? '/ineedbio/app.js' : '/ineedbio/demo.js'} strategy="afterInteractive" />
    </>
  );
}

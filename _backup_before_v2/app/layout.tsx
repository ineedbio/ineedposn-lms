import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './ineedbio.css';

export const metadata: Metadata = {
  title: 'INeedBio Classroom',
  description: 'ติวเข้ม ม.ปลาย กับ INeedBio — ชีวะ เคมี ฟิสิกส์ คณิต สอวน.',
  icons: { icon: '/ineedbio/logo.webp' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: app.js ตั้ง data-theme บน <html> เอง (สว่าง/มืด)
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anuphan:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        {/* ใช้สร้าง QR พร้อมเพย์ตอนชำระเงิน */}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

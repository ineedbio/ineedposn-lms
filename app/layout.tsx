import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "INeedPOSN",
  description: "Online tutoring platform for Thai POSN and university entrance exam prep",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

import { Inter } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import ChunkErrorRecovery from "@/components/ChunkErrorRecovery";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "INeedBio",
  description: "Online tutoring platform for Thai POSN and university entrance exam prep",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <ChunkErrorRecovery />
        {children}
      </body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";
import ChunkErrorRecovery from "@/components/ChunkErrorRecovery";

export const metadata: Metadata = {
  title: "INeedBio",
  description: "Online tutoring platform for Thai POSN and university entrance exam prep",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <ChunkErrorRecovery />
        {children}
      </body>
    </html>
  );
}

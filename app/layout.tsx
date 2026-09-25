import { Anuphan, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import ChunkErrorRecovery from "@/components/ChunkErrorRecovery";

const anuphan = Anuphan({ subsets: ["thai", "latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-anuphan" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "INeedBio",
  description: "Online tutoring platform for Thai POSN and university entrance exam prep",
};

// Applies the saved light/dark choice before first paint so the page never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning className={`${anuphan.variable} ${plexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <ChunkErrorRecovery />
        {children}
      </body>
    </html>
  );
}

import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-12 py-7">
        <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
          <Image src="/ineedbio-logo.png" alt="INeedBio" width={34} height={34} />
          INeedBio
        </Link>
      </header>
      {children}
    </div>
  );
}

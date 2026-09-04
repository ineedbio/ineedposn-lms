import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import { LinkButton } from "./Button";

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-12 py-5 bg-white/85 backdrop-blur-md border-b border-border-light shadow-soft">
      <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
        <Image src="/ineedbio-logo.png" alt="INeedBio" width={34} height={34} />
        INeedBio
      </Link>
      <nav className="flex items-center gap-9">
        {user ? (
          <>
            <Link href="/" className="text-[15px] font-medium text-ink hover:text-accent transition-colors">
              คอร์สทั้งหมด
            </Link>
            {user.role === "ADMIN" && (
              <Link href="/admin/payments" className="text-[15px] font-medium text-ink hover:text-accent transition-colors">
                Admin
              </Link>
            )}
            <Link href="/dashboard/settings" className="text-[15px] font-medium text-ink hover:text-accent transition-colors">
              ตั้งค่า
            </Link>
            <LogoutButton className="text-[15px] font-medium text-secondary hover:text-ink transition active:scale-95" />
            <Link
              href="/dashboard"
              className="w-[38px] h-[38px] rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden shadow-soft transition-transform duration-200 hover:scale-110 active:scale-95"
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name ?? ""} className="w-full h-full object-cover" />
              ) : (
                (user.name?.[0] ?? "?").toUpperCase()
              )}
            </Link>
          </>
        ) : (
          <>
            <Link href="/dashboard" className="text-[15px] font-medium text-ink hover:text-accent transition-colors">
              ห้องเรียน
            </Link>
            <Link href="/login" className="text-[15px] font-medium text-ink hover:text-accent transition-colors">
              เข้าสู่ระบบ
            </Link>
            <LinkButton href="/register" size="sm">
              สมัครสมาชิก
            </LinkButton>
          </>
        )}
      </nav>
    </header>
  );
}

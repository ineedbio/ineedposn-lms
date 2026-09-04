import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-12 py-5 bg-white/85 backdrop-blur-md border-b border-border-light">
      <Link href="/" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
        <Image src="/ineedbio-logo.png" alt="INeedBio" width={34} height={34} />
        INeedBio
      </Link>
      <nav className="flex items-center gap-9">
        {user ? (
          <>
            <Link href="/" className="text-[15px] font-medium text-ink hover:text-secondary transition">
              คอร์สทั้งหมด
            </Link>
            {user.role === "ADMIN" && (
              <Link href="/admin/payments" className="text-[15px] font-medium text-ink hover:text-secondary transition">
                Admin
              </Link>
            )}
            <Link href="/dashboard/settings" className="text-[15px] font-medium text-ink hover:text-secondary transition">
              ตั้งค่า
            </Link>
            <LogoutButton className="text-[15px] font-medium text-secondary hover:text-ink transition active:scale-95" />
            <Link
              href="/dashboard"
              className="w-[38px] h-[38px] rounded-full bg-ink text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden transition-transform duration-150 hover:scale-110 active:scale-95"
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
            <Link href="/dashboard" className="text-[15px] font-medium text-ink hover:text-secondary transition">
              ห้องเรียน
            </Link>
            <Link href="/login" className="text-[15px] font-medium text-ink hover:text-secondary transition">
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-white bg-ink px-5 py-2.5 rounded-pill hover:bg-dark-hover transition-all duration-150 active:scale-95"
            >
              สมัครสมาชิก
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

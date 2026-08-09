import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-border-light">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/ineedbio-logo.png" alt="INeedBio" width={30} height={30} />
          <span className="font-bold text-[15px]">INeedBio</span>
        </Link>
        <nav className="flex items-center gap-7 text-[14px] text-ink">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="hover:text-secondary">
                ห้องเรียนของฉัน
              </Link>
              {role === "ADMIN" && (
                <Link href="/admin/payments" className="hover:text-secondary">
                  จัดการชำระเงิน
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-secondary">
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="bg-ink text-white rounded-pill px-5 py-2 text-[13px] font-medium hover:bg-dark-hover transition"
              >
                สมัครสมาชิก
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

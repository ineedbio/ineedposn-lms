"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/admin/payments", label: "การชำระเงิน" },
  { href: "/admin/students", label: "ทะเบียนนักเรียน" },
  { href: "/admin/camp-results", label: "ผลค่าย สอวน." },
  { href: "/admin/courses", label: "คอร์สเรียน" },
  { href: "/admin/quizzes", label: "ข้อสอบ" },
  { href: "/admin/design-studio", label: "Design Studio" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col gap-2 border-border bg-paper px-3 md:sticky md:top-0 md:h-screen md:border-r md:py-5 max-md:border-b max-md:py-2.5">
      <div className="flex items-center justify-between gap-2 px-1 pb-2 max-md:pb-1">
        <Logo href="/admin/payments" suffix="Admin" />
        <span className="md:hidden"><ThemeToggle /></span>
      </div>

      <nav className="flex gap-0.5 md:flex-col max-md:overflow-x-auto">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-[10px] px-3 py-2 text-[14.5px] no-underline transition-colors ${
                active ? "bg-accent-soft font-semibold text-accent" : "text-secondary hover:bg-panel hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 max-md:hidden" />

      <div className="grid gap-1 border-t border-border pt-3 max-md:hidden">
        <div className="px-3 pb-2"><ThemeToggle /></div>
        <Link href="/" className="rounded-[10px] px-3 py-2 text-sm text-secondary no-underline hover:bg-panel hover:text-ink">← กลับหน้าเว็บ</Link>
        <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="rounded-[10px] px-3 py-2 text-left text-sm text-no hover:bg-panel">
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}

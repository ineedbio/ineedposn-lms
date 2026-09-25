"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

// Same order as the Apps Script admin, then the tools only this app has.
const NAV = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/payments", label: "คำขอเข้าเรียน", badge: true },
  { href: "/admin/courses", label: "คอร์สและบทเรียน" },
  { href: "/admin/results", label: "ผลงานนักเรียน" },
  { href: "/admin/users", label: "ผู้ใช้" },
  { href: "/admin/settings", label: "ตั้งค่า" },
];
const TOOLS = [
  { href: "/admin/students", label: "ทะเบียนนักเรียน" },
  { href: "/admin/camp-results", label: "ผลค่าย สอวน." },
  { href: "/admin/quizzes", label: "ข้อสอบ" },
  { href: "/admin/design-studio", label: "Design Studio" },
];

export default function AdminSidebar({ pending = 0 }: { pending?: number }) {
  const pathname = usePathname() ?? "";
  const isOn = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const link = (item: { href: string; label: string; badge?: boolean }) => (
    <Link
      key={item.href}
      href={item.href}
      className={`flex items-center justify-between gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2 text-[14.5px] no-underline transition-colors ${
        isOn(item.href) ? "bg-accent-soft font-semibold text-accent" : "text-secondary hover:bg-panel hover:text-ink"
      }`}
    >
      {item.label}
      {item.badge && pending > 0 && (
        <span className="rounded-pill bg-chem px-[7px] font-mono text-xs leading-5 text-on-accent">{pending}</span>
      )}
    </Link>
  );

  return (
    <aside className="flex flex-col gap-2 border-border bg-paper px-3 md:sticky md:top-0 md:h-screen md:border-r md:py-5 max-md:border-b max-md:py-2.5">
      <div className="flex items-center justify-between gap-2 px-1 pb-2 max-md:pb-1">
        <Logo href="/admin" suffix="Admin" />
        <span className="md:hidden"><ThemeToggle /></span>
      </div>

      <nav className="flex gap-0.5 md:flex-col max-md:overflow-x-auto" aria-label="เมนูหลังบ้าน">
        {NAV.map(link)}
        <span className="mt-3 px-3 pb-1 text-xs font-medium text-muted max-md:hidden">เครื่องมือเพิ่มเติม</span>
        {TOOLS.map(link)}
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

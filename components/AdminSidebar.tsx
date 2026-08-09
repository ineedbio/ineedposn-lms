"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/admin/payments", label: "การชำระเงิน" },
  { href: "/admin/courses", label: "คอร์สเรียน" },
  { href: "/admin/students", label: "นักเรียน" },
  { href: "/admin/design-studio", label: "Design Studio" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] flex-shrink-0 bg-ink text-white min-h-screen px-5 py-8 flex flex-col gap-9">
      <div className="flex items-center gap-2 px-2">
        <Image src="/ineedbio-logo.png" alt="INeedBio" width={28} height={28} />
        <span className="text-[19px] font-extrabold tracking-[-0.02em]">INeedBio</span>
        <span className="text-muted font-semibold text-[13px]">Admin</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[15px] px-3 py-3 rounded-[10px] transition-all duration-150 active:scale-[0.97] ${
                active ? "font-semibold bg-dark-hover text-white" : "font-medium text-muted hover:text-white hover:bg-dark-hover/50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <LogoutButton className="text-left text-sm font-medium text-muted hover:text-white transition px-3 py-3" />
    </aside>
  );
}

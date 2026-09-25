"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/courses") : pathname.startsWith(href);
}

/** Desktop header links; hidden on small screens where MobileNav takes over. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="hidden flex-1 gap-5 text-sm min-[681px]:flex">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`py-1 no-underline ${isActive(pathname, i.href) ? "font-semibold text-accent" : "text-secondary hover:text-ink"}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom tab bar on phones (≤680px). */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="mnav fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-paper px-2 pb-[calc(6px+env(safe-area-inset-bottom,0px))] pt-1.5 min-[681px]:hidden">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex-1 py-1.5 text-center text-xs no-underline ${isActive(pathname, i.href) ? "font-semibold text-accent" : "text-muted"}`}
          >
            {i.label}
          </Link>
        ))}
    </nav>
  );
}

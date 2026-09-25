"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

type Props = { name: string; email: string; avatarUrl?: string | null; isAdmin: boolean };

/** Avatar button in the header that opens the account menu. */
export default function UserMenu({ name, email, avatarUrl, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = "block rounded-[9px] px-3 py-2 text-left text-sm no-underline hover:bg-panel";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-pill p-1 text-sm"
      >
        <span className="relative grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-full bg-accent text-[13px] font-semibold text-on-accent">
          {name.slice(0, 1).toUpperCase()}
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </span>
        <span className="max-[560px]:hidden">{name}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 grid min-w-[210px] rounded-[14px] border border-border bg-paper p-1.5 shadow-pop">
          <div className="mb-1 border-b border-border px-3 pb-2.5 pt-2 text-[13px]">
            <b className="block text-sm">{name}</b>
            <span className="text-muted">{email}</span>
          </div>
          <Link href="/dashboard" className={item} onClick={() => setOpen(false)}>คอร์สของฉัน</Link>
          <Link href="/settings" className={item} onClick={() => setOpen(false)}>ข้อมูลส่วนตัว</Link>
          {isAdmin && <Link href="/admin/payments" className={item} onClick={() => setOpen(false)}>หลังบ้าน</Link>}
          <button type="button" className={`${item} text-no`} onClick={() => signOut({ callbackUrl: "/" })}>ออกจากระบบ</button>
        </div>
      )}
    </div>
  );
}

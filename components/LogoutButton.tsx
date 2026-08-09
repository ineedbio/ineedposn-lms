"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })} className="hover:text-secondary">
      ออกจากระบบ
    </button>
  );
}

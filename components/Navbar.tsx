import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import { NavLinks, MobileNav, type NavItem } from "./NavLinks";
import { LinkButton } from "./Button";
import { getSettings } from "@/lib/settings";

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  // ดึงรูปโปรไฟล์และชื่อสดจาก Database
  const dbUser = user?.id
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { firstName: true, nickname: true, avatarUrl: true, email: true },
      })
    : null;

  const { announcement } = await getSettings();
  const items: NavItem[] = [{ href: "/", label: "คอร์สทั้งหมด" }, { href: "/results", label: "ผลงานน้องๆ" }];
  if (user) items.push({ href: "/dashboard", label: "คอร์สของฉัน" });
  if (user?.role === "ADMIN") items.push({ href: "/admin", label: "หลังบ้าน" });
  const mobileItems: NavItem[] = user ? [...items, { href: "/settings", label: "บัญชี" }] : [...items, { href: "/login", label: "เข้าสู่ระบบ" }];

  return (
    <>
      {announcement && (
        <div className="border-b border-border bg-panel px-4 py-2 text-center text-[13.5px] text-secondary">{announcement}</div>
      )}
      <header className="sticky top-0 z-40 border-b border-border bg-paper/85 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-[58px] max-w-site items-center justify-between gap-5 px-4 max-[560px]:gap-2.5">
          <Logo />
          <NavLinks items={items} />
          <div className="flex items-center gap-3 max-[560px]:gap-2">
            <ThemeToggle />
            {user ? (
              <UserMenu
                name={dbUser?.nickname || dbUser?.firstName || user.name || "?"}
                email={dbUser?.email ?? user.email ?? ""}
                avatarUrl={dbUser?.avatarUrl || user.avatarUrl}
                isAdmin={user.role === "ADMIN"}
              />
            ) : (
              <>
                <LinkButton href="/login" variant="outline" size="xs" className="max-[560px]:hidden">
                  เข้าสู่ระบบ
                </LinkButton>
                <LinkButton href="/register" size="xs">
                  สมัครสมาชิก
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </header>
      <MobileNav items={mobileItems} />
    </>
  );
}

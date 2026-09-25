/* Server-rendered layout and building blocks of the public site, ported 1:1 from the
   Apps Script frontend (header(), footer(), page(), cover(), tileHtml(), reviewCard()). */

import Link from "next/link";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { legalText } from "@/lib/legal";
import { getCatalog } from "@/lib/catalog";
import { subjectKey } from "@/lib/site";
import { MASCOT, type ZResult } from "./blocks";
import { AuthButtons, Fab, Nav, Search, ThemeSwitch, Who, Z1Provider, type NavItem } from "./client";


async function currentUser() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, nickname: true, email: true, avatarUrl: true, role: true },
  });
}

/** Whole-page wrapper: header, <main class="gut"><div class="w">, footer, floating buttons, modal/toast root. */
export async function Shell({ children, noFooter, noMain }: { children: ReactNode; noFooter?: boolean; noMain?: boolean }) {
  const [user, cfg] = await Promise.all([currentUser(), getSettings()]);
  const nav: NavItem[] = [
    { href: "/", label: "คอร์สทั้งหมด", key: "home" },
    { href: "/results", label: "ผลงานน้องๆ", key: "results" },
  ];
  if (user) nav.push({ href: "/dashboard", label: "คอร์สของฉัน", key: "my" });
  if (user?.role === "ADMIN") nav.push({ href: "/admin", label: "หลังบ้าน", key: "admin" });
  const nick = user ? user.nickname || user.firstName : "";

  return (
    <div className={`z1${user ? " has-mnav" : ""}`}>
      <Z1Provider legal={{ terms: legalText("terms", cfg), privacy: legalText("privacy", cfg) }}>
        {cfg.announcement && <div className="ann">{cfg.announcement}</div>}
        <header className="hdr gut">
          <div className="w">
            <Link className="logo" href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MASCOT} alt="" />
              <span>INeed<span>Bio</span></span>
            </Link>
            <Nav items={nav} />
            <Search />
            <div className="hr">
              <ThemeSwitch />
              {user ? (
                <Who nickname={nick} fullName={`${user.firstName} ${user.lastName}`} email={user.email} avatarUrl={user.avatarUrl} isAdmin={user.role === "ADMIN"} />
              ) : (
                <AuthButtons />
              )}
            </div>
          </div>
        </header>
        {user && <Nav mobile items={[...nav, { href: "/settings", label: "บัญชี", key: "profile" }]} />}
        {noMain ? children : (
          <main className="gut pg-enter">
            <div className="w">{children}</div>
          </main>
        )}
        {!noFooter && <Footer ig={cfg.contact_ig} phone={cfg.contact_phone} />}
        <Fab ig={cfg.contact_ig} />
      </Z1Provider>
    </div>
  );
}

async function Footer({ ig, phone }: { ig: string; phone: string }) {
  const cs = await getCatalog();
  const subjects = Array.from(new Map(cs.map((c) => [c.subjectSlug, c.subjectName])).entries());
  const lessons = cs.reduce((a, c) => a + c.lessonCount, 0);
  const mins = cs.reduce((a, c) => a + c.totalMin, 0);
  return (
    <footer className="bigfoot gut">
      <div className="w">
        <div>
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MASCOT} alt="" />
            INeedBio
          </div>
          <p>ติวออนไลน์สำหรับน้อง ม.ปลาย เตรียมสอบ สอวน. และ A-Level เรียนผ่านคลิป ดูซ้ำได้ตลอด มีชีทประกอบทุกบท</p>
          {cs.length > 0 && (
            <div className="stat">
              <div><b>{cs.length}</b><span>คอร์สที่เปิดอยู่</span></div>
              <div><b>{lessons}</b><span>ตอน</span></div>
              <div><b>{Math.round(mins / 60)}</b><span>ชั่วโมงคลิปเรียน</span></div>
            </div>
          )}
        </div>
        <div>
          <h4>คอร์สเรียน</h4>
          <ul>{subjects.map(([slug, name]) => <li key={slug}><Link href={`/?subject=${slug}#courses`}>{name}</Link></li>)}</ul>
        </div>
        <div>
          <h4>ติดต่อ</h4>
          <ul>
            <li><a href={`https://www.instagram.com/${ig}`} target="_blank" rel="noopener">IG @{ig}</a></li>
            {phone && (
              <>
                <li><a>โทร {phone}</a></li>
                <li><a>(เฉพาะเรื่องด่วน 10:00–18:00)</a></li>
              </>
            )}
          </ul>
        </div>
        <div className="copy">
          © {new Date().getFullYear()} INeedBio · ineedbio.shop · <Link href="/terms">ข้อตกลงการใช้งาน</Link> · <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
        </div>
      </div>
    </footer>
  );
}

export async function getResults(): Promise<ZResult[]> {
  const rows = await prisma.studentResult.findMany({
    where: { isPublished: true },
    include: { subject: true },
    orderBy: [{ year: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id, nickname: r.nickname, year: r.year, subject: subjectKey(r.subject), subjectName: r.subject?.name ?? "",
    school: r.school ?? "", center: r.center ?? "", review: r.review ?? "", photoUrl: r.photoUrl ?? "",
  }));
}


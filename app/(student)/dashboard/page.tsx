import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { myStates } from "@/lib/catalog";
import { subjectKey } from "@/lib/site";
import { zdate } from "@/lib/z1";
import { StatusBadge } from "@/components/z1/blocks";

// Port of viewMy() from the Apps Script site.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/login");

  const [user, states, pays] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, firstName: true } }),
    myStates(userId),
    prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);
  const ids = Object.keys(states);
  const courses = await prisma.course.findMany({
    where: { id: { in: ids } },
    include: { subject: true, lessons: { select: { id: true, progress: { where: { userId }, select: { isCompleted: true } } } } },
  });
  const rank = { approved: 0, pending: 1, rejected: 2 } as const;
  const list = courses
    .map((c) => {
      const done = c.lessons.filter((l) => l.progress[0]?.isCompleted).length;
      const pay = pays.find((p) => p.courseId === c.id);
      return { c, st: states[c.id], done, total: c.lessons.length, pct: c.lessons.length ? Math.round((done / c.lessons.length) * 100) : 0, pay };
    })
    .sort((a, b) => rank[a.st] - rank[b.st]);

  return (
    <>
      <div className="page-h">
        <span className="mono">สวัสดี {user?.nickname || user?.firstName}</span>
        <h1>คอร์สของฉัน</h1>
      </div>
      {list.length ? (
        <div className="mine">
          {list.map(({ c, st, done, total, pct, pay }) => (
            <div key={c.id} className={`mc s-${subjectKey(c.subject)}`}>
              <div className="spread"><span className="mono">{c.subject.name}</span><StatusBadge s={st} /></div>
              <h3>{c.title}</h3>
              {st === "approved" ? (
                <>
                  <div className="stack" style={{ gap: 6 }}>
                    <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                    <span className="sm ink2">เรียนไปแล้ว {pct}% · {done} จาก {total} ตอน</span>
                  </div>
                  <div className="act"><Link className="pill" href={`/learn/${c.id}`}>{done ? "เรียนต่อ" : "เริ่มเรียน"}</Link></div>
                </>
              ) : st === "pending" ? (
                <p className="sm ink2">ส่งสลิปเมื่อ {zdate(pay?.createdAt, true)} · แอดมินกำลังตรวจ</p>
              ) : (
                <>
                  <p className="sm ink2">สลิปไม่ผ่าน{pay?.rejectReason ? `: ${pay.rejectReason}` : ""}</p>
                  <div className="act"><Link className="pill ghost" href={`/courses/${c.slug}`}>ส่งสลิปใหม่</Link></div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginBottom: 72 }}>
          <p>ยังไม่มีคอร์ส เลือกคอร์สที่สนใจแล้วส่งสลิปได้เลย</p>
          <Link className="pill" href="/">ดูคอร์สทั้งหมด</Link>
        </div>
      )}
    </>
  );
}

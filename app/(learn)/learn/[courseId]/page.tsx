import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { legalText } from "@/lib/legal";
import { subjectKey } from "@/lib/site";
import LessonPlayer from "@/components/LessonPlayer";
import { Z1Provider } from "@/components/z1/client";
import { DoneButton, Watermark } from "@/components/z1/learn";

export const dynamic = "force-dynamic";

function videoId(url: string | null) {
  return url?.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/)?.[1] ?? null;
}

// Port of viewLearn() from the Apps Script site.
export default async function LearnPage({ params, searchParams }: { params: { courseId: string }; searchParams: { l?: string; lesson?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/login");

  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: params.courseId } } });
  if (enrollment?.status !== "ACTIVE") redirect("/dashboard");

  const [course, user, cfg] = await Promise.all([
    prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        subject: true,
        lessons: {
          orderBy: { order: "asc" },
          include: { attachments: true, progress: { where: { userId } }, quiz: { include: { _count: { select: { questions: true } } } } },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    getSettings(),
  ]);
  if (!course) notFound();
  const all = course.lessons;
  const wrap = (body: React.ReactNode) => (
    <div className={`z1 s-${subjectKey(course.subject)}`}>
      <Z1Provider legal={{ terms: legalText("terms", cfg), privacy: legalText("privacy", cfg) }}>{body}</Z1Provider>
    </div>
  );
  if (!all.length) {
    return wrap(
      <main className="gut"><div className="w"><div className="empty" style={{ marginBlock: 60 }}><p>คอร์สนี้ยังไม่มีบทเรียน</p><Link className="pill" href="/dashboard">กลับ</Link></div></div></main>
    );
  }

  const done = (l: (typeof all)[number]) => !!l.progress[0]?.isCompleted;
  const byIndex = searchParams.lesson !== undefined ? all[Math.min(Math.max(parseInt(searchParams.lesson, 10) || 0, 0), all.length - 1)] : undefined;
  const cur = all.find((l) => l.id === searchParams.l) ?? byIndex ?? all.find((l) => !done(l)) ?? all[0];
  const i = all.indexOf(cur);
  const doneCount = all.filter(done).length;
  const pct = Math.round((doneCount / all.length) * 100);
  const chapters: { title: string; lessons: typeof all }[] = [];
  for (const l of all) {
    const t = l.chapter || "เนื้อหาในคอร์ส";
    const ch = chapters.find((c) => c.title === t) ?? chapters[chapters.push({ title: t, lessons: [] }) - 1];
    ch.lessons.push(l);
  }
  const vid = videoId(cur.youtubeUrl);
  const href = (id: string) => `/learn/${course.id}?l=${id}`;
  const ext = (name: string) => (name.match(/\.([a-z0-9]{2,4})$/i)?.[1] ?? "PDF").toUpperCase();

  return wrap(
    <>
      <div className="gut" style={{ borderBottom: "1px solid rgb(var(--line))" }}>
        <div className="w lhdr">
          <Link className="back" href="/dashboard">← ออกจากห้องเรียน</Link>
          <span className="t">{course.title}</span>
          <span className="mono" style={{ textTransform: "none" }}>{pct}%</span>
        </div>
      </div>
      <main className="gut">
        <div className="w learn">
          <div className="stage">
            <div className="player" id="player">
              {cur.type === "QUIZ" && cur.quiz ? (
                <div className="ph">
                  <b style={{ color: "#fff", fontSize: 17 }}>{cur.quiz.title}</b>
                  <span>{cur.quiz._count.questions} ข้อ · เวลา {Math.round(cur.quiz.timeLimit / 60)} นาที</span>
                  <Link className="pill" href={`/learn/quiz/${cur.quiz.id}`}>เริ่มทำข้อสอบ</Link>
                </div>
              ) : vid ? (
                <LessonPlayer key={cur.id} lessonId={cur.id} videoId={vid} containerId={`yt-player-${cur.id}`} />
              ) : (
                <div className="ph"><span>ยังไม่มีคลิปสำหรับตอนนี้</span></div>
              )}
              {vid && user?.email && <Watermark text={`${user.email} · ${userId.toUpperCase()}`} />}
            </div>
            <div className="lrow">
              <div style={{ minWidth: 0 }}>
                <span className="mono">{cur.chapter || "เนื้อหาในคอร์ส"}</span>
                <h2>{cur.title}</h2>
              </div>
              <DoneButton lessonId={cur.id} done={done(cur)} hasNext={!!all[i + 1]} />
            </div>
            {cur.attachments.length > 0 && (
              <div className="files">
                {cur.attachments.map((a) => (
                  <a key={a.id} className="file" href={a.fileUrl} target="_blank" rel="noopener"><b>{ext(a.fileName)}</b>{a.fileName.replace(/\.[a-z0-9]{2,4}$/i, "")}</a>
                ))}
              </div>
            )}
            <div className="spread" style={{ borderTop: "1px solid rgb(var(--line))", paddingTop: 16 }}>
              {all[i - 1] ? <Link className="pill quiet s" href={href(all[i - 1].id)}>← ตอนก่อนหน้า</Link> : <span />}
              {all[i + 1] ? <Link className="pill s" href={href(all[i + 1].id)}>ตอนถัดไป →</Link> : <span className="sm muted">ตอนสุดท้ายของคอร์ส</span>}
            </div>
            <p className="hint">คลิปนี้สำหรับผู้ซื้อคอร์สเท่านั้น บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ห้ามอัดหน้าจอหรือแชร์ลิงก์</p>
          </div>
          <aside className="lside">
            <div className="prog">
              <span className="sm ink2">เรียนไปแล้ว {doneCount} จาก {all.length} ตอน</span>
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            </div>
            {chapters.map((ch) => (
              <div key={ch.title}>
                <div className="chap">{ch.title}</div>
                {ch.lessons.map((l) => (
                  <Link key={l.id} className={`ep${l === cur ? " on" : ""}${done(l) ? " done" : ""}`} href={href(l.id)}>
                    <span className="ck">{done(l) ? "✓" : ""}</span>
                    <span>{l.title}</span>
                    <span className="d">{Math.round((l.duration ?? 0) / 60)}&apos;</span>
                  </Link>
                ))}
              </div>
            ))}
          </aside>
        </div>
      </main>
    </>
  );
}

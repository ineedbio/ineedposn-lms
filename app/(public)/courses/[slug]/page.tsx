import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import PreviewLesson from "./PreviewLesson";
import { LinkButton } from "@/components/Button";
import CourseCover from "@/components/CourseCover";
import { baht, duration, subjectKey } from "@/lib/site";
import { getSettings } from "@/lib/settings";
import EnrollClosedButton from "@/components/EnrollClosedButton";

export const dynamic = "force-dynamic";

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="mt-0.5 flex-none text-accent" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="rgb(var(--on-acc))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: { subject: true, lessons: { orderBy: { order: "asc" } } },
  });
  if (!course || !course.isPublished) notFound();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const enrollment = userId
    ? await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
      })
    : null;

  let ctaHref = `/checkout?course=${course.slug}`;
  let ctaLabel = "ลงทะเบียนเรียน";
  if (enrollment?.status === "ACTIVE") {
    ctaHref = `/learn/${course.id}`;
    ctaLabel = "ไปที่ห้องเรียน";
  } else if (enrollment?.status === "PENDING") {
    ctaHref = "/dashboard";
    ctaLabel = "รอตรวจสอบการชำระเงิน";
  }

  const total = course.lessons.reduce((a, l) => a + (l.duration ?? 0), 0);
  const [settings, reviews] = await Promise.all([
    getSettings(),
    prisma.studentResult.findMany({
      where: { subjectId: course.subjectId, isPublished: true, review: { not: null } },
      orderBy: [{ year: "desc" }, { sortOrder: "asc" }],
      take: 6,
    }),
  ]);
  const enrollOpen = settings.enroll_open === "1";
  const lines = (t: string | null) => (t ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  const faq = (course.faq ?? "")
    .split(/\n\s*\n/)
    .map((b) => b.trim().split("\n"))
    .filter((b) => b[0]?.trim())
    .map(([q, ...a]) => ({ q: q.trim(), a: a.join("\n").trim() }))
    .concat([
      { q: "ซื้อแล้วดูได้นานแค่ไหน", a: "ดูได้ตลอด ไม่มีวันหมดอายุ เปิดดูซ้ำได้ทุกตอนไม่จำกัดจำนวนครั้ง" },
      { q: "ดูได้กี่เครื่อง", a: "บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ถ้าเข้าสู่ระบบจากเครื่องใหม่ เครื่องเดิมจะออกจากระบบเอง สลับเครื่องได้ตลอด" },
      { q: "โอนเงินแล้วเข้าเรียนได้เมื่อไร", a: "หลังแอดมินตรวจสลิป ปกติภายใน 24 ชั่วโมง ระบบจะส่งอีเมลแจ้งเมื่ออนุมัติ แล้วเข้าเรียนได้ที่เมนู “คอร์สของฉัน”" },
      { q: "มีคำถามเพิ่มเติม ติดต่อใคร", a: `ทัก IG @${settings.contact_ig} ได้เลย` },
    ]);
  const chapters: { name: string; lessons: typeof course.lessons }[] = [];
  for (const l of course.lessons) {
    const name = l.chapter || "เนื้อหาในคอร์ส";
    const ch = chapters.find((c) => c.name === name) ?? chapters[chapters.push({ name, lessons: [] }) - 1];
    ch.lessons.push(l);
  }
  const highlights = lines(course.highlights);
  const audience = lines(course.audience);
  const bio = lines(course.instructorBio);

  return (
    <div className={`s-${subjectKey(course.subject)}`}>
      <main className="mx-auto grid max-w-site items-start gap-11 px-4 pb-[72px] pt-7 min-[841px]:grid-cols-[1.45fr_1fr] max-[840px]:gap-7">
        <div className="min-w-0">
          <Link href="/" className="text-sm text-secondary underline underline-offset-[3px] hover:text-ink">← คอร์สทั้งหมด</Link>
          <div className="mt-6 text-[13px] font-semibold text-accent">{course.subject.name}{course.level ? ` · ${course.level}` : ""}</div>
          <h1 className="mb-3 mt-2 text-[clamp(28px,4.4vw,44px)] font-bold leading-tight">{course.title}</h1>
          {course.subtitle && <p className="text-lg text-secondary">{course.subtitle}</p>}
          <div className="mb-7 mt-3.5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-pill bg-accent-soft px-3.5 py-1 text-accent"><b>{course.lessons.length}</b> ตอน</span>
            {total > 0 && <span className="rounded-pill bg-accent-soft px-3.5 py-1 text-accent"><b>{duration(total)}</b> วิดีโอ</span>}
            <span className="rounded-pill bg-accent-soft px-3.5 py-1 text-accent"><b>ดูได้ตลอด</b> ไม่มีวันหมดอายุ</span>
          </div>
          {course.trailerYoutube ? (
            <div className="mb-7 aspect-video overflow-hidden rounded-card bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${course.trailerYoutube}`}
                title={`คลิปแนะนำ ${course.title}`}
                className="h-full w-full"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <CourseCover course={course} big className="mb-7 rounded-card" />
          )}
          {course.description && <p className="mb-7 max-w-[62ch] whitespace-pre-line text-secondary">{course.description}</p>}
          {(highlights.length > 0 || audience.length > 0) && (
            <div className="mb-8 grid gap-3.5 sm:grid-cols-2">
              {highlights.length > 0 && (
                <div className="rounded-card bg-accent-soft p-5">
                  <h3 className="mb-2 font-bold">จุดเด่นของคอร์ส</h3>
                  <ul className="grid gap-1.5 text-[14.5px]">{highlights.map((h) => <li key={h} className="flex gap-2"><Check />{h}</li>)}</ul>
                </div>
              )}
              {audience.length > 0 && (
                <div className="rounded-card border border-border p-5">
                  <h3 className="mb-2 font-bold">คอร์สนี้เหมาะกับ</h3>
                  <ul className="grid list-disc gap-1.5 pl-5 text-[14.5px] text-secondary">{audience.map((h) => <li key={h}>{h}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-[22px] font-bold">เนื้อหาในคอร์ส</h2>
            <span className="text-[13.5px] text-muted">{course.lessons.length} ตอน{total ? ` · ${duration(total)}` : ""}</span>
          </div>
          <div className="border-t border-border">
            {chapters.map((ch, ci) => (
              <details key={ch.name} open={ci === 0} className="border-b border-border">
                <summary className="flex cursor-pointer list-none justify-between gap-3 px-0.5 py-3.5 font-medium [&::-webkit-details-marker]:hidden">
                  <span>{ch.name}</span>
                  <span className="whitespace-nowrap text-[13.5px] font-normal text-muted">{ch.lessons.length} ตอน</span>
                </summary>
                <ul className="pb-3">
                  {ch.lessons.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 px-0.5 py-1.5 text-sm text-secondary">
                      <span className="truncate">{l.title}</span>
                      <span className="flex flex-none items-center gap-3">
                        {l.duration != null && <span className="font-mono text-xs text-muted">{Math.round(l.duration / 60)} นาที</span>}
                        {l.isPreview && l.youtubeUrl && <PreviewLesson youtubeUrl={l.youtubeUrl} />}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            {course.lessons.length === 0 && <p className="py-4 text-sm text-muted">ยังไม่มีบทเรียนในคอร์สนี้</p>}
          </div>

          {course.instructorName && (
            <section className="mt-10 flex flex-wrap gap-5 rounded-card border border-border p-5">
              {course.instructorPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.instructorPhoto} alt="" className="h-24 w-24 flex-none rounded-full bg-panel object-cover" />
              )}
              <div className="min-w-[220px] flex-1">
                <span className="text-[13px] font-semibold text-accent">ผู้สอน</span>
                <h3 className="text-xl font-bold">{course.instructorName}</h3>
                {course.instructorTitle && <p className="text-sm text-secondary">{course.instructorTitle}</p>}
                {bio.length > 0 && <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm text-secondary">{bio.map((b) => <li key={b}>{b}</li>)}</ul>}
              </div>
            </section>
          )}

          {reviews.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 text-[22px] font-bold">รีวิวจากน้องที่ติดค่าย</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {reviews.map((r) => (
                  <figure key={r.id} className="grid gap-2 rounded-card border border-border p-4">
                    <blockquote className="text-[14.5px] text-secondary">“{r.review}”</blockquote>
                    <figcaption className="text-sm font-medium">น้อง{r.nickname}{r.school ? ` · ${r.school}` : ""} <span className="text-muted">({r.year})</span></figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="mb-2 text-[22px] font-bold">คำถามที่พบบ่อย</h2>
            <div className="border-t border-border">
              {faq.map((x) => (
                <details key={x.q} className="border-b border-border">
                  <summary className="flex cursor-pointer list-none justify-between gap-3 px-0.5 py-3.5 font-medium [&::-webkit-details-marker]:hidden">
                    {x.q}
                    <span className="text-accent">+</span>
                  </summary>
                  <p className="whitespace-pre-line pb-3.5 text-sm text-secondary">{x.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid gap-3.5 rounded-3xl border border-border bg-paper p-6 min-[841px]:sticky min-[841px]:top-[84px]">
          <span className="text-sm text-muted">ราคาคอร์ส</span>
          <div className="text-[32px] font-semibold tabular-nums">
            {course.fullPrice && course.fullPrice > course.price && (
              <span className="mr-2 text-[0.55em] font-normal text-muted line-through">฿{course.fullPrice.toLocaleString()}</span>
            )}
            {baht(course.price)}
          </div>
          <ul className="grid gap-2 border-y border-border py-4 text-[14.5px]">
            <li className="flex gap-2.5"><Check />คลิปเรียน {course.lessons.length} ตอน{total ? ` (${duration(total)})` : ""}</li>
            <li className="flex gap-2.5"><Check />ชีทประกอบในห้องเรียน</li>
            <li className="flex gap-2.5"><Check />ดูได้ตลอด ไม่มีวันหมดอายุ</li>
            <li className="flex gap-2.5"><Check />เรียนได้ทั้งมือถือและคอม</li>
          </ul>
          {!userId && enrollOpen && <p className="text-sm text-secondary">สมัครสมาชิกหรือเข้าสู่ระบบก่อน แล้วจึงซื้อคอร์สได้</p>}
          {!enrollOpen && !enrollment ? (
            // Enrollment closed (หลังบ้าน → ตั้งค่า): the button explains instead of going to checkout.
            <EnrollClosedButton label={userId ? "ลงทะเบียนเรียน" : "สมัครเรียนคอร์สนี้"} message={settings.enroll_closed_message} />
          ) : (
            <LinkButton href={userId ? ctaHref : "/register"} className="w-full">
              {userId ? ctaLabel : "สมัครสมาชิกเพื่อซื้อคอร์ส"}
            </LinkButton>
          )}
          {!userId && (
            <LinkButton href="/login" variant="outline" className="w-full">มีบัญชีแล้ว เข้าสู่ระบบ</LinkButton>
          )}
        </aside>
      </main>
    </div>
  );
}

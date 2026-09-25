import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import PreviewLesson from "./PreviewLesson";
import { LinkButton } from "@/components/Button";
import CourseCover from "@/components/CourseCover";
import { baht, duration, subjectKey } from "@/lib/site";

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

  return (
    <div className={`s-${subjectKey(course.subject)}`}>
      <main className="mx-auto grid max-w-site items-start gap-11 px-4 pb-[72px] pt-7 min-[841px]:grid-cols-[1.45fr_1fr] max-[840px]:gap-7">
        <div className="min-w-0">
          <Link href="/" className="text-sm text-secondary underline underline-offset-[3px] hover:text-ink">← คอร์สทั้งหมด</Link>
          <div className="mt-6 text-[13px] font-semibold text-accent">{course.subject.name}</div>
          <h1 className="mb-3 mt-2 text-[clamp(28px,4.4vw,44px)] font-bold leading-tight">{course.title}</h1>
          <div className="mb-7 mt-3.5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-pill bg-accent-soft px-3.5 py-1 text-accent"><b>{course.lessons.length}</b> ตอน</span>
            {total > 0 && <span className="rounded-pill bg-accent-soft px-3.5 py-1 text-accent"><b>{duration(total)}</b> วิดีโอ</span>}
            <span className="rounded-pill bg-accent-soft px-3.5 py-1 text-accent"><b>ดูได้ตลอด</b> ไม่มีวันหมดอายุ</span>
          </div>
          <CourseCover course={course} big className="mb-7 rounded-card" />
          <p className="mb-7 max-w-[62ch] whitespace-pre-line text-secondary">{course.description}</p>

          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-[22px] font-bold">เนื้อหาในคอร์ส</h2>
            <span className="text-[13.5px] text-muted">{course.lessons.length} ตอน{total ? ` · ${duration(total)}` : ""}</span>
          </div>
          <ul className="border-t border-border">
            {course.lessons.map((l, i) => (
              <li key={l.id} className="flex items-center justify-between gap-3 border-b border-border px-0.5 py-3.5">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="w-6 flex-none font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="truncate font-medium">{l.title}</span>
                </span>
                <span className="flex flex-none items-center gap-3">
                  {l.duration != null && <span className="font-mono text-xs text-muted">{Math.round(l.duration / 60)} นาที</span>}
                  {l.isPreview && l.youtubeUrl && <PreviewLesson youtubeUrl={l.youtubeUrl} />}
                </span>
              </li>
            ))}
            {course.lessons.length === 0 && <li className="py-4 text-sm text-muted">ยังไม่มีบทเรียนในคอร์สนี้</li>}
          </ul>
        </div>

        <aside className="grid gap-3.5 rounded-3xl border border-border bg-paper p-6 min-[841px]:sticky min-[841px]:top-[84px]">
          <span className="text-sm text-muted">ราคาคอร์ส</span>
          <div className="text-[32px] font-semibold tabular-nums">{baht(course.price)}</div>
          <ul className="grid gap-2 border-y border-border py-4 text-[14.5px]">
            <li className="flex gap-2.5"><Check />คลิปเรียน {course.lessons.length} ตอน{total ? ` (${duration(total)})` : ""}</li>
            <li className="flex gap-2.5"><Check />ชีทประกอบในห้องเรียน</li>
            <li className="flex gap-2.5"><Check />ดูได้ตลอด ไม่มีวันหมดอายุ</li>
            <li className="flex gap-2.5"><Check />เรียนได้ทั้งมือถือและคอม</li>
          </ul>
          {!userId && <p className="text-sm text-secondary">สมัครสมาชิกหรือเข้าสู่ระบบก่อน แล้วจึงซื้อคอร์สได้</p>}
          <LinkButton href={userId ? ctaHref : "/register"} className="w-full">
            {userId ? ctaLabel : "สมัครสมาชิกเพื่อซื้อคอร์ส"}
          </LinkButton>
          {!userId && (
            <LinkButton href="/login" variant="outline" className="w-full">มีบัญชีแล้ว เข้าสู่ระบบ</LinkButton>
          )}
        </aside>
      </main>
    </div>
  );
}

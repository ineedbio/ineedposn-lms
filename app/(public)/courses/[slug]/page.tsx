import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import PreviewLesson from "./PreviewLesson";

export const dynamic = "force-dynamic";

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

  return (
    <div className="max-w-[1200px] mx-auto px-12 pt-14 pb-24">
      <div className="mb-10">
        <div className="text-[13px] font-semibold text-secondary mb-3">{course.subject.name}</div>
        <h1 className="text-[42px] font-extrabold tracking-[-0.02em] mb-4 max-w-2xl">{course.title}</h1>
        <p className="text-[17px] text-secondary max-w-2xl leading-relaxed">{course.description}</p>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_360px] gap-10">
        <div className="min-w-0">
          <div className="h-[320px] rounded-card bg-panel border border-dashed border-border flex items-center justify-center text-muted text-sm mb-8">
            ภาพปกคอร์ส
          </div>

          <h2 className="text-xl font-bold mb-4">เนื้อหาบทเรียน ({course.lessons.length} บท)</h2>
          <div className="flex flex-col gap-2">
            {course.lessons.map((l, i) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border-light"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-sm text-muted w-6 flex-shrink-0">{i + 1}</span>
                  <span className="font-medium truncate">{l.title}</span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {l.duration != null && (
                    <span className="text-sm text-secondary">{Math.round(l.duration / 60)} นาที</span>
                  )}
                  {l.isPreview && l.youtubeUrl && <PreviewLesson youtubeUrl={l.youtubeUrl} />}
                </div>
              </div>
            ))}
            {course.lessons.length === 0 && (
              <p className="text-muted text-sm">ยังไม่มีบทเรียนในคอร์สนี้</p>
            )}
          </div>
        </div>

        <div className="md:sticky md:top-24 h-fit border border-border-light rounded-card p-7 flex flex-col gap-5">
          <div className="text-[32px] font-extrabold tracking-[-0.02em]">
            {course.price === 0 ? "ฟรี" : `฿${course.price.toLocaleString()}`}
          </div>
          <Link
            href={ctaHref}
            className="h-[50px] rounded-pill bg-ink text-white text-base font-semibold flex items-center justify-center hover:bg-dark-hover hover:shadow-md transition-all duration-150 active:scale-[0.97]"
          >
            {ctaLabel}
          </Link>
          <ul className="flex flex-col gap-2.5 text-sm text-secondary">
            <li>เรียนซ้ำได้ไม่จำกัดตลอดอายุคอร์ส</li>
            <li>ควิซท้ายบทพร้อมเฉลยละเอียด</li>
            <li>{course.lessons.length} บทเรียนวิดีโอ</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

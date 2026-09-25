import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { baht, duration, subjectKey } from "@/lib/site";
import NewCourseButton from "./NewCourseButton";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({ searchParams }: { searchParams: { course?: string } }) {
  await requireAdmin();
  // Old links used ?course=<id>; the editor now lives at /admin/courses/<id>.
  if (searchParams.course) redirect(`/admin/courses/${searchParams.course}`);

  const [courses, subjects] = await Promise.all([
    prisma.course.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        subject: true,
        lessons: { select: { duration: true } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    }),
    prisma.subject.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="grid gap-5 px-6 py-7 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold">คอร์สและบทเรียน</h1>
        <NewCourseButton subjects={subjects} />
      </div>
      {courses.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
          {courses.map((c) => {
            const secs = c.lessons.reduce((a, l) => a + (l.duration ?? 0), 0);
            return (
              <Link
                key={c.id}
                href={`/admin/courses/${c.id}`}
                className={`s-${subjectKey(c.subject)} grid content-start gap-1.5 rounded-2xl border border-border p-4 no-underline transition-colors hover:border-accent`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-accent">{c.subject.name}</span>
                  <span className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${c.isPublished ? "bg-ok-soft text-ok" : "bg-panel-2 text-secondary"}`}>
                    {c.isPublished ? "เปิดขาย" : "ฉบับร่าง"}
                  </span>
                </div>
                <h3 className="text-lg font-bold leading-snug">{c.title}</h3>
                <span className="text-[13.5px] text-secondary">
                  {c.lessons.length} ตอน{secs ? ` · ${duration(secs)}` : ""} · {baht(c.price)}
                </span>
                <span className="text-[13px] text-muted">นักเรียน {c._count.enrollments} คน · {c.slug}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-secondary">ยังไม่มีคอร์ส เริ่มสร้างคอร์สแรกได้เลย</div>
      )}
    </div>
  );
}

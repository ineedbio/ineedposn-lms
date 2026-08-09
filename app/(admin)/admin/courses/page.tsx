import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import Link from "next/link";
import CourseEditor from "./CourseEditor";
import NewCourseButton from "./NewCourseButton";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: { course?: string };
}) {
  await requireAdmin();

  const [courses, subjects] = await Promise.all([
    prisma.course.findMany({ orderBy: { createdAt: "desc" }, include: { subject: true, lessons: true } }),
    prisma.subject.findMany({ orderBy: { order: "asc" } }),
  ]);

  const selectedId = searchParams.course ?? courses[0]?.id;
  const selected = selectedId
    ? await prisma.course.findUnique({
        where: { id: selectedId },
        include: { lessons: { orderBy: { order: "asc" }, include: { attachments: true } } },
      })
    : null;

  return (
    <main className="px-14 pt-12 pb-24 max-w-[1300px] flex gap-10">
      <div className="w-[300px] flex-shrink-0 flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em]">คอร์สเรียน</h1>
        <NewCourseButton subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />
        <div className="flex flex-col gap-2">
          {courses.map((c) => {
            const active = c.id === selectedId;
            return (
              <Link
                key={c.id}
                href={`/admin/courses?course=${c.id}`}
                className={`p-4 rounded-2xl flex flex-col gap-1 transition-all duration-150 active:scale-[0.98] ${
                  active ? "bg-ink" : "bg-panel hover:bg-border-light"
                }`}
              >
                <div className={`text-[13px] font-semibold ${active ? "text-muted" : "text-secondary"}`}>
                  {c.subject.name}
                </div>
                <div className={`text-[15px] font-bold ${active ? "text-white" : "text-ink"}`}>{c.title}</div>
                <div className={`text-[13px] ${active ? "text-muted" : "text-secondary"}`}>
                  {c.price.toLocaleString()} บาท · {c.lessons.length} บท
                </div>
              </Link>
            );
          })}
          {courses.length === 0 && <p className="text-muted text-sm">ยังไม่มีคอร์ส</p>}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {selected ? (
          <CourseEditor course={selected} subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />
        ) : (
          <p className="text-muted text-[15px] pt-10">เลือกคอร์สทางซ้ายเพื่อแก้ไข</p>
        )}
      </div>
    </main>
  );
}

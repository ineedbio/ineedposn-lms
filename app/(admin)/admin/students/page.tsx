import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import StudentsTable from "./StudentsTable";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  await requireAdmin();

  const [students, subjects] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: { course: { include: { subject: true, lessons: { select: { id: true } } } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subject.findMany({ orderBy: { order: "asc" } }),
  ]);

  const studentIds = students.map((s) => s.id);
  const completed = await prisma.lessonProgress.findMany({
    where: { userId: { in: studentIds }, isCompleted: true },
    select: { userId: true, lessonId: true },
  });
  const completedSet = new Set(completed.map((p) => `${p.userId}:${p.lessonId}`));

  const rows = students.map((s) => {
    const courses = Array.from(new Set(s.enrollments.map((e) => e.course.subject.name)));
    const lessonIds = s.enrollments.flatMap((e) => e.course.lessons.map((l) => l.id));
    const done = lessonIds.filter((id) => completedSet.has(`${s.id}:${id}`)).length;
    const pct = lessonIds.length ? Math.round((done / lessonIds.length) * 100) : 0;
    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      email: s.email,
      school: s.school ?? "-",
      grade: s.gradeLevel ?? "-",
      courses,
      progress: `${pct}%`,
    };
  });

  return (
    <main className="px-14 pt-12 pb-24 max-w-[1300px]">
      <h1 className="text-[32px] font-extrabold tracking-[-0.02em] mb-2">นักเรียน</h1>
      <p className="text-base text-secondary mb-8">ดูว่านักเรียนแต่ละคนลงทะเบียนคอร์สไหนบ้าง และความคืบหน้า</p>

      <StudentsTable students={rows} subjectNames={subjects.map((s) => s.name)} />
    </main>
  );
}

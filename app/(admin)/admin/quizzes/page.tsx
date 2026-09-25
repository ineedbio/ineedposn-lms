import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import Link from "next/link";
import NewQuizButton from "./NewQuizButton";
import QuizEditor from "./QuizEditor";

export const dynamic = "force-dynamic";

export default async function AdminQuizzesPage({
  searchParams,
}: {
  searchParams: { quiz?: string };
}) {
  await requireAdmin();

  const [quizzes, lessonsWithoutQuiz] = await Promise.all([
    prisma.quiz.findMany({
      include: {
        lesson: { include: { course: true } },
        questions: true,
        _count: { select: { attempts: true } },
      },
      orderBy: { id: "desc" },
    }),
    prisma.lesson.findMany({
      where: { quiz: null },
      include: { course: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const selectedId = searchParams.quiz ?? quizzes[0]?.id;
  const selected = selectedId
    ? await prisma.quiz.findUnique({
        where: { id: selectedId },
        include: { questions: true, lesson: true, _count: { select: { attempts: true } } },
      })
    : null;

  return (
    <main className="px-14 pt-12 pb-24 max-w-[1300px] flex gap-10">
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em]">ข้อสอบ / แบบทดสอบ</h1>
        <NewQuizButton lessons={lessonsWithoutQuiz.map((l) => ({ id: l.id, label: `${l.course.title} · ${l.title}` }))} />
        <div className="flex flex-col gap-2">
          {quizzes.map((q) => {
            const active = q.id === selectedId;
            const subtitle = q.isMockExam
              ? "ข้อสอบจำลอง (ไม่ผูกกับบทเรียน)"
              : q.lesson
                ? `${q.lesson.course.title} · ${q.lesson.title}`
                : "ยังไม่ผูกกับบทเรียน";
            return (
              <Link
                key={q.id}
                href={`/admin/quizzes?quiz=${q.id}`}
                className={`p-4 rounded-2xl flex flex-col gap-1 transition-all duration-150 active:scale-[0.98] ${
                  active ? "bg-ink" : "bg-panel hover:bg-border-light"
                }`}
              >
                <div className={`text-[13px] font-semibold ${active ? "text-muted" : "text-secondary"}`}>
                  {subtitle}
                </div>
                <div className={`text-[15px] font-bold ${active ? "text-white" : "text-ink"}`}>{q.title}</div>
                <div className={`text-[13px] ${active ? "text-muted" : "text-secondary"}`}>
                  {q.questions.length} ข้อ · {q._count.attempts} คนทำแล้ว
                </div>
              </Link>
            );
          })}
          {quizzes.length === 0 && <p className="text-muted text-sm">ยังไม่มีข้อสอบ</p>}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {selected ? (
          <QuizEditor quiz={selected as any} />
        ) : (
          <p className="text-muted text-[15px] pt-10">เลือกข้อสอบทางซ้าย หรือสร้างชุดใหม่</p>
        )}
      </div>
    </main>
  );
}

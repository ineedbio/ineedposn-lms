import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import QuizTaker from "@/components/QuizTaker";

export const dynamic = "force-dynamic";

export default async function TakeQuizPage({ params }: { params: { quizId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/login");

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    include: { questions: true, lesson: { include: { course: { include: { lessons: { orderBy: { order: "asc" } } } } } } },
  });
  if (!quiz) notFound();

  // Same gate as the video lesson player: a quiz tied to a non-preview
  // lesson requires an active enrollment in that lesson's course. A
  // standalone mock exam (no lesson) is open to any signed-in student.
  if (quiz.lesson && !quiz.lesson.isPreview) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quiz.lesson.courseId } },
    });
    if (enrollment?.status !== "ACTIVE") redirect("/dashboard");
  }

  const backHref = quiz.lesson
    ? `/learn/${quiz.lesson.courseId}?lesson=${quiz.lesson.course.lessons.findIndex((l) => l.id === quiz.lesson!.id)}`
    : "/dashboard";

  if (quiz.questions.length === 0) {
    return (
      <div className="min-h-screen bg-ink text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-lg font-semibold">ข้อสอบนี้ยังไม่มีคำถาม</div>
        <Link href={backHref} className="text-sm text-panel hover:text-white transition">
          ← กลับ
        </Link>
      </div>
    );
  }

  const questions = quiz.questions.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    choices: q.choices as { id: string; text: string }[] | null,
  }));

  return (
    <div className="min-h-screen bg-white">
      <QuizTaker
        quizId={quiz.id}
        title={quiz.title}
        timeLimit={quiz.timeLimit}
        passScore={quiz.passScore}
        questions={questions}
        backHref={backHref}
      />
    </div>
  );
}

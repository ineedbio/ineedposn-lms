import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import QuizPlayer from "@/components/QuizPlayer";

export const dynamic = "force-dynamic";

export default async function ExamPlayerPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/login");

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: { questions: { orderBy: { id: "asc" } } },
  });
  if (!quiz || !quiz.isMockExam) notFound();

  // correctAnswer/explanation are stripped here (server-side) so a student
  // can't read the answer key out of the page's initial HTML/RSC payload.
  const quizForPlayer = {
    id: quiz.id,
    title: quiz.title,
    timeLimit: quiz.timeLimit,
    passScore: quiz.passScore,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      choices: q.choices as { id: string; text: string }[] | null,
    })),
  };

  return (
    <div className="max-w-[1300px] mx-auto px-12 pt-14 pb-24 flex flex-col items-center">
      <div className="w-full max-w-[800px] mb-6">
        <Link href="/dashboard/exams" className="text-sm font-medium text-secondary hover:text-ink transition">
          ← กลับไปหน้าข้อสอบจำลอง
        </Link>
      </div>
      {quizForPlayer.questions.length > 0 ? (
        <QuizPlayer key={quizForPlayer.id} quiz={quizForPlayer} />
      ) : (
        <div className="w-full max-w-[800px] bg-panel rounded-2xl p-8 text-center text-secondary">
          ข้อสอบนี้ยังไม่มีคำถาม
        </div>
      )}
    </div>
  );
}

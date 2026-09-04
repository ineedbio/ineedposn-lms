import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, ApiError } from "@/lib/rbac";
import { assertQuizAccess } from "@/lib/quiz-access";

// Student-facing quiz fetch. Deliberately strips correctAnswer/explanation
// so a student can't read answers out of the page source before submitting.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    const userId = (session.user as any).id as string;

    await assertQuizAccess(params.id, userId);

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { questions: { orderBy: { id: "asc" } } },
    });
    if (!quiz) return NextResponse.json({ error: "ไม่พบข้อสอบนี้" }, { status: 404 });

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: params.id, userId },
      orderBy: { submittedAt: "desc" },
      select: { id: true, score: true, isPassed: true, submittedAt: true },
    });

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      timeLimit: quiz.timeLimit,
      passScore: quiz.passScore,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        choices: q.choices,
      })),
      attempts,
    });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

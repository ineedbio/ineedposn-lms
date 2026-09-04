import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, ApiError } from "@/lib/rbac";
import { assertQuizAccess } from "@/lib/quiz-access";

const SubmitSchema = z.object({
  answers: z.record(z.string()),
});

function isCorrect(correctAnswer: string, given: string | undefined) {
  if (given == null) return false;
  return given.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    const userId = (session.user as any).id as string;

    const parsed = SubmitSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const quiz = await assertQuizAccess(params.id, userId);
    const questions = await prisma.question.findMany({ where: { quizId: quiz.id } });
    if (questions.length === 0) {
      return NextResponse.json({ error: "ข้อสอบนี้ยังไม่มีคำถาม" }, { status: 400 });
    }

    const { answers } = parsed.data;
    const results = questions.map((q) => ({
      questionId: q.id,
      correct: isCorrect(q.correctAnswer, answers[q.id]),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));
    const correctCount = results.filter((r) => r.correct).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const isPassed = score >= quiz.passScore;

    await prisma.$transaction(async (tx) => {
      await tx.quizAttempt.create({
        data: { userId, quizId: quiz.id, answers, score, isPassed },
      });

      // A quiz lesson has nothing else that ever flips LessonProgress —
      // passing the quiz is what "completing" that lesson means. A failed
      // attempt doesn't undo an earlier pass (retakes shouldn't regress it).
      if (quiz.lessonId && isPassed) {
        await tx.lessonProgress.upsert({
          where: { userId_lessonId: { userId, lessonId: quiz.lessonId } },
          update: { isCompleted: true, completedAt: new Date() },
          create: { userId, lessonId: quiz.lessonId, isCompleted: true, completedAt: new Date() },
        });
      }
    });

    return NextResponse.json({ score, isPassed, passScore: quiz.passScore, results });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

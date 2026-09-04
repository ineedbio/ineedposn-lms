import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, ApiError } from "@/lib/rbac";

const Schema = z.object({
  answers: z.record(z.string(), z.string()),
});

function normalize(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Grades and records a student's quiz attempt. Correct answers/explanations
 * are never trusted from the client — they're re-read from the DB here and
 * only echoed back in the response, after grading, as the review.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    const userId = (session.user as any).id as string;

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { answers } = parsed.data;

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { questions: true, lesson: true },
    });
    if (!quiz) return NextResponse.json({ error: "ไม่พบข้อสอบนี้" }, { status: 404 });

    // Same access rule as the take-quiz page: a quiz tied to a non-preview
    // lesson requires an active enrollment in that lesson's course.
    if (quiz.lesson && !quiz.lesson.isPreview) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: quiz.lesson.courseId } },
      });
      if (enrollment?.status !== "ACTIVE") {
        return NextResponse.json({ error: "คุณยังไม่ได้ลงทะเบียนคอร์สนี้" }, { status: 403 });
      }
    }

    let correctCount = 0;
    const review = quiz.questions.map((q) => {
      const given = answers[q.id] ?? "";
      const isCorrect =
        q.type === "MCQ" ? given === q.correctAnswer : normalize(given) === normalize(q.correctAnswer);
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        yourAnswer: given,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const total = quiz.questions.length;
    const score = total ? Math.round((correctCount / total) * 100) : 0;
    const isPassed = score >= quiz.passScore;

    await prisma.quizAttempt.create({
      data: { userId, quizId: quiz.id, answers, score, isPassed },
    });

    return NextResponse.json({ score, isPassed, total, correctCount, review });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

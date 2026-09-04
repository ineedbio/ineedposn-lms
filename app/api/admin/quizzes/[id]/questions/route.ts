import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

const ChoiceSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });

const QuestionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["MCQ", "SHORT_ANSWER"]),
  choices: z.array(ChoiceSchema).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const parsed = QuestionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { text, type, choices, correctAnswer, explanation } = parsed.data;

    if (type === "MCQ") {
      if (!choices || choices.length < 2) {
        return NextResponse.json({ error: "ข้อสอบแบบเลือกตอบต้องมีตัวเลือกอย่างน้อย 2 ข้อ" }, { status: 400 });
      }
      if (!choices.some((c) => c.id === correctAnswer)) {
        return NextResponse.json({ error: "คำตอบที่ถูกต้องต้องตรงกับหนึ่งในตัวเลือก" }, { status: 400 });
      }
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
    if (!quiz) return NextResponse.json({ error: "ไม่พบข้อสอบนี้" }, { status: 404 });

    const question = await prisma.question.create({
      data: {
        quizId: params.id,
        text,
        type,
        choices: type === "MCQ" ? choices : undefined,
        correctAnswer,
        explanation,
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

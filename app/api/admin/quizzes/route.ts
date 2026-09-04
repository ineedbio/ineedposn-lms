import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

const CreateSchema = z.object({
  title: z.string().min(1),
  timeLimitMinutes: z.number().int().positive(),
  passScore: z.number().int().min(0).max(100),
  isMockExam: z.boolean().default(false),
  lessonId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { title, timeLimitMinutes, passScore, isMockExam, lessonId } = parsed.data;

    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { quiz: true } });
      if (!lesson) return NextResponse.json({ error: "ไม่พบบทเรียนนี้" }, { status: 404 });
      if (lesson.quiz) {
        return NextResponse.json({ error: "บทเรียนนี้มีข้อสอบอยู่แล้ว" }, { status: 409 });
      }
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        timeLimit: timeLimitMinutes * 60,
        passScore,
        isMockExam,
        lessonId: lessonId || null,
      },
    });

    // A quiz attached to a lesson should make that lesson's type QUIZ so the
    // student player knows to render a quiz instead of a video.
    if (lessonId) {
      await prisma.lesson.update({ where: { id: lessonId }, data: { type: "QUIZ" } });
    }

    return NextResponse.json({ id: quiz.id }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

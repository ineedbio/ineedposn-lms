import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.passScore === "number") data.passScore = body.passScore;
    if (typeof body.timeLimitMinutes === "number") data.timeLimit = body.timeLimitMinutes * 60;
    if (typeof body.isMockExam === "boolean") data.isMockExam = body.isMockExam;

    const quiz = await prisma.quiz.update({ where: { id: params.id }, data });
    return NextResponse.json(quiz);
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    try {
      await prisma.quiz.delete({ where: { id: params.id } });
    } catch (err) {
      // FK constraint from QuizAttempt (no cascade — attempt history must
      // survive a quiz edit/delete elsewhere) blocks deleting a quiz that
      // students have already taken. Surface that clearly instead of a
      // raw 500.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        return NextResponse.json(
          { error: "ลบไม่ได้ เพราะมีนักเรียนทำข้อสอบชุดนี้ไปแล้ว" },
          { status: 409 }
        );
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

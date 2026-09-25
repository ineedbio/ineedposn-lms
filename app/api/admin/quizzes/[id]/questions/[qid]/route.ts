import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: { id: string; qid: string } }) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body.text === "string") data.text = body.text;
    if (typeof body.correctAnswer === "string") data.correctAnswer = body.correctAnswer;
    if (typeof body.explanation === "string") data.explanation = body.explanation;
    if (Array.isArray(body.choices)) data.choices = body.choices;

    const question = await prisma.question.update({
      where: { id: params.qid },
      data,
    });
    return NextResponse.json(question);
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string; qid: string } }) {
  try {
    await requireAdmin();
    await prisma.question.delete({ where: { id: params.qid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

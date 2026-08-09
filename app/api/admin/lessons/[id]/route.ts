import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data: any = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.youtubeUrl === "string") data.youtubeUrl = body.youtubeUrl;
    if (typeof body.durationMinutes === "number") data.duration = Math.round(body.durationMinutes * 60);
    if (typeof body.isPreview === "boolean") data.isPreview = body.isPreview;

    const lesson = await prisma.lesson.update({ where: { id: params.id }, data });
    return NextResponse.json(lesson);
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await prisma.lesson.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

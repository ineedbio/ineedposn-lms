import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { courseId } = await req.json();
    if (!courseId) return NextResponse.json({ error: "ไม่พบคอร์ส" }, { status: 400 });

    const count = await prisma.lesson.count({ where: { courseId } });
    const lesson = await prisma.lesson.create({
      data: { courseId, title: "บทเรียนใหม่", order: count, type: "VIDEO" },
    });
    return NextResponse.json(lesson, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { parseLessonFields } from "@/lib/course-fields";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { courseId } = body;
    if (!courseId) return NextResponse.json({ error: "ไม่พบคอร์ส" }, { status: 400 });
    const { data, error } = parseLessonFields(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const count = await prisma.lesson.count({ where: { courseId } });
    const lesson = await prisma.lesson.create({
      data: { title: "บทเรียนใหม่", ...(data as any), courseId, order: count, type: "VIDEO" },
    });
    return NextResponse.json(lesson, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

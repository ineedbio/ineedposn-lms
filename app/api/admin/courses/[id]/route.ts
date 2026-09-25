import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { parseCourseFields } from "@/lib/course-fields";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const { data, error } = parseCourseFields(await req.json());
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (typeof data.subjectId === "string") {
      // Keep the course's category consistent with its (possibly new) subject.
      const current = await prisma.course.findUnique({ where: { id: params.id }, select: { subjectId: true } });
      if (current && current.subjectId !== data.subjectId) {
        const category =
          (await prisma.category.findFirst({ where: { subjectId: data.subjectId } })) ??
          (await prisma.category.create({ data: { name: "ทั่วไป", subjectId: data.subjectId } }));
        data.categoryId = category.id;
      }
    }

    const course = await prisma.course.update({ where: { id: params.id }, data });
    return NextResponse.json(course);
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await prisma.course.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json(
      { error: "ลบไม่สำเร็จ อาจมีนักเรียนลงทะเบียนหรือชำระเงินคอร์สนี้อยู่แล้ว" },
      { status: 409 }
    );
  }
}

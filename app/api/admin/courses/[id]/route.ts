import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data: any = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.price === "number") data.price = body.price;
    if (typeof body.subjectId === "string") data.subjectId = body.subjectId;
    if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;

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

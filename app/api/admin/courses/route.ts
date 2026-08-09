import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";

function slugify(title: string) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "course"}-${nanoid(6)}`;
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { subjectId, title } = await req.json();
    if (!subjectId || !title?.trim()) {
      return NextResponse.json({ error: "กรอกข้อมูลไม่ครบ" }, { status: 400 });
    }

    let category = await prisma.category.findFirst({ where: { subjectId } });
    if (!category) {
      category = await prisma.category.create({ data: { name: "ทั่วไป", subjectId } });
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug: slugify(title),
        description: "",
        price: 0,
        subjectId,
        categoryId: category.id,
        isPublished: false,
      },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

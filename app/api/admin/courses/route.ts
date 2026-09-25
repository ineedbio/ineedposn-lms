import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { parseCourseFields } from "@/lib/course-fields";

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
    const body = await req.json();
    const { data, error } = parseCourseFields(body);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const subjectId = data.subjectId as string | undefined;
    if (!subjectId || !data.title) {
      return NextResponse.json({ error: "กรอกข้อมูลไม่ครบ (วิชา และชื่อคอร์ส)" }, { status: 400 });
    }

    // Optional custom URL slug ("รหัสคอร์ส"); otherwise generated from the title.
    let slug = slugify(String(data.title));
    const custom = String(body.slug ?? "").trim().toLowerCase();
    if (custom) {
      if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(custom)) {
        return NextResponse.json({ error: "รหัสคอร์สใช้ได้เฉพาะ a-z 0-9 และ -" }, { status: 400 });
      }
      if (await prisma.course.findUnique({ where: { slug: custom } })) {
        return NextResponse.json({ error: "รหัสคอร์สนี้ถูกใช้แล้ว" }, { status: 409 });
      }
      slug = custom;
    }

    let category = await prisma.category.findFirst({ where: { subjectId } });
    if (!category) {
      category = await prisma.category.create({ data: { name: "ทั่วไป", subjectId } });
    }

    const course = await prisma.course.create({
      data: {
        description: "",
        price: 0,
        isPublished: false,
        ...(data as any),
        title: String(data.title),
        slug,
        subjectId,
        categoryId: category.id,
      },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

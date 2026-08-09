import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireUser, ApiError } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const userId = (session.user as any).id as string;
    const { courseId, slipImageUrl } = await req.json();

    if (!courseId || !slipImageUrl) {
      return NextResponse.json({ error: "กรอกข้อมูลไม่ครบ" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || !course.isPublished) {
      return NextResponse.json({ error: "ไม่พบคอร์สนี้" }, { status: 404 });
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing?.status === "ACTIVE") {
      return NextResponse.json({ error: "ลงทะเบียนคอร์สนี้แล้ว" }, { status: 409 });
    }

    const promptpayRef = `INB${nanoid(8).toUpperCase()}`;

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          userId,
          courseId,
          amount: course.price,
          promptpayRef,
          slipImageUrl,
          status: "PENDING",
        },
      });
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId, courseId } },
        update: { status: "PENDING" },
        create: { userId, courseId, status: "PENDING" },
      });
      return p;
    });

    return NextResponse.json({ id: payment.id }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

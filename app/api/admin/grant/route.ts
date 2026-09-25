import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { notifyStudentPaymentReviewed } from "@/lib/email";

/**
 * "เพิ่มสิทธิ์ให้ผู้ใช้เอง": give an existing account access to a course without
 * a slip (paid through another channel, or free). Records an APPROVED payment
 * so it shows up in the approved list and in revenue.
 */
export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const { email, courseId, amount, note } = await req.json();
    const user = await prisma.user.findUnique({ where: { email: String(email ?? "").trim().toLowerCase() } });
    if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้อีเมลนี้ ให้นักเรียนสมัครสมาชิกก่อน" }, { status: 404 });
    const course = await prisma.course.findUnique({ where: { id: String(courseId ?? "") } });
    if (!course) return NextResponse.json({ error: "ไม่พบคอร์ส" }, { status: 404 });
    const paid = Math.max(0, Math.round(Number(amount) || 0));

    const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } });
    if (existing?.status === "ACTIVE") return NextResponse.json({ error: "ผู้ใช้นี้มีสิทธิ์เรียนคอร์สนี้อยู่แล้ว" }, { status: 409 });

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          amount: paid,
          promptpayRef: `GRANT${nanoid(8).toUpperCase()}`,
          status: "APPROVED",
          note: String(note ?? "").trim() || null,
          reviewedBy: (session.user as any).id,
          reviewedAt: new Date(),
        },
      }),
      prisma.enrollment.upsert({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
        update: { status: "ACTIVE", enrolledAt: new Date() },
        create: { userId: user.id, courseId: course.id, status: "ACTIVE", enrolledAt: new Date() },
      }),
    ]);

    try {
      await notifyStudentPaymentReviewed({ studentEmail: user.email, courseTitle: course.title, approved: true });
    } catch (err) {
      console.error("[grant] failed to email student", { userId: user.id, courseId: course.id, err });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

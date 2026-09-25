import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ApiError } from "@/lib/rbac";
import { notifyStudentPaymentReviewed } from "@/lib/email";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const adminId = (session.user as any).id as string;
    const { decision, reason } = await req.json();

    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { course: true, user: true },
    });
    if (!payment) return NextResponse.json({ error: "ไม่พบรายการนี้" }, { status: 404 });
    if (payment.status !== "PENDING") {
      return NextResponse.json({ error: "รายการนี้ถูกดำเนินการไปแล้ว" }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
          rejectReason: decision === "REJECT" ? reason ?? null : null,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      if (decision === "APPROVE") {
        await tx.enrollment.upsert({
          where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
          update: { status: "ACTIVE", enrolledAt: new Date() },
          create: {
            userId: payment.userId,
            courseId: payment.courseId,
            status: "ACTIVE",
            enrolledAt: new Date(),
          },
        });
      }
    });

    // Best-effort — the payment decision already committed above; a failed
    // notification email must not undo the approval/rejection or fail this
    // request. Log clearly so a silent failure doesn't go unnoticed.
    try {
      await notifyStudentPaymentReviewed({
        studentEmail: payment.user.email,
        courseTitle: payment.course.title,
        approved: decision === "APPROVE",
        reason: decision === "REJECT" ? reason ?? undefined : undefined,
      });
    } catch (err) {
      console.error("[payments] failed to notify student of payment review", {
        paymentId: payment.id,
        decision,
        err,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

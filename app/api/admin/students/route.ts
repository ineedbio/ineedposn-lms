import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// 1. เพิ่มนักเรียนใหม่ลง Neon DB
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, nickname, grade, school, phone, email, courseId, paymentStatus } = body;

    const parts = name.trim().split(" ");
    const firstName = parts[0] || name;
    const lastName = parts.slice(1).join(" ") || "-";

    const defaultPassword = crypto.createHash("sha256").update(`temp_${Date.now()}`).digest("hex");
    const userEmail = email && email !== "-" ? email : `student_${Date.now()}@ineedbio.com`;

    const newStudent = await prisma.user.create({
      data: {
        firstName,
        lastName,
        nickname: nickname || null,
        email: userEmail,
        password: defaultPassword,
        phone: phone || null,
        school: school || null,
        gradeLevel: grade || null,
        role: "STUDENT",
      },
    });

    if (courseId && courseId !== "MANUAL" && courseId !== "NONE") {
      await prisma.enrollment.create({
        data: {
          userId: newStudent.id,
          courseId,
          status: paymentStatus === "ชำระแล้ว" ? "ACTIVE" : "PENDING",
          enrolledAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, student: newStudent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. ลบนักเรียนออกจาก Neon DB
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await prisma.$transaction([
      prisma.enrollment.deleteMany({ where: { userId: id } }),
      prisma.payment.deleteMany({ where: { userId: id } }),
      prisma.lessonProgress.deleteMany({ where: { userId: id } }),
      prisma.quizAttempt.deleteMany({ where: { userId: id } }),
      prisma.otpToken.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. บันทึกการเปลี่ยนแปลงสถานะชำระเงินลง Neon DB
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { updates } = await req.json();
    if (Array.isArray(updates)) {
      for (const item of updates) {
        const enrollStatus = item.paymentStatus === "ชำระแล้ว" ? "ACTIVE" : "PENDING";
        const payStatus = item.paymentStatus === "ชำระแล้ว" ? "APPROVED" : "PENDING";

        // ตรวจสอบว่ามี Enrollment เดิมอยู่หรือไม่
        const count = await prisma.enrollment.count({
          where: { userId: item.id },
        });

        if (count > 0) {
          // ถ้ามีอยู่แล้ว ให้อัปเดตสถานะ
          await prisma.enrollment.updateMany({
            where: { userId: item.id },
            data: { status: enrollStatus },
          });
        } else if (enrollStatus === "ACTIVE") {
          // ถ้ายังไม่เคยลงคอร์สเลย ให้ดึงคอร์สแรกมาผูกและเปิดสถานะ ACTIVE ให้ทันที
          const firstCourse = await prisma.course.findFirst({ orderBy: { createdAt: "asc" } });
          if (firstCourse) {
            await prisma.enrollment.create({
              data: {
                userId: item.id,
                courseId: firstCourse.id,
                status: "ACTIVE",
                enrolledAt: new Date(),
              },
            });
          }
        }

        // อัปเดตสถานะในตาราง Payment ด้วย (ถ้ามี)
        await prisma.payment.updateMany({
          where: { userId: item.id },
          data: {
            status: payStatus,
            reviewedAt: new Date(),
            reviewedBy: user.email || "ADMIN",
          },
        });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
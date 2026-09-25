import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

const STATUS_KEY = "admin_student_statuses";

// 1. เพิ่มนักเรียน
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

    revalidatePath("/admin/students");
    return NextResponse.json({ success: true, student: newStudent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. ลบนักเรียน
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

    revalidatePath("/admin/students");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. บันทึกสถานะชำระเงินและโน้ตลง Neon DB
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { updates } = await req.json();
    if (Array.isArray(updates)) {
      const existing = await prisma.themeSetting.findUnique({ where: { key: STATUS_KEY } });
      const statusMap = existing?.value ? JSON.parse(existing.value) : {};

      for (const item of updates) {
        statusMap[item.id] = {
          paymentStatus: item.paymentStatus,
          notes: item.notes || "",
        };

        const enrollStatus = item.paymentStatus === "ชำระแล้ว" ? "ACTIVE" : "PENDING";
        await prisma.enrollment.updateMany({
          where: { userId: item.id },
          data: { status: enrollStatus },
        });
      }

      await prisma.themeSetting.upsert({
        where: { key: STATUS_KEY },
        update: { value: JSON.stringify(statusMap) },
        create: { key: STATUS_KEY, value: JSON.stringify(statusMap) },
      });

      revalidatePath("/admin/students");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. แก้ไขข้อมูลส่วนตัวนักเรียนลง Neon DB
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, nickname, grade, school, phone, email } = body;

    const parts = name.trim().split(" ");
    const firstName = parts[0] || name;
    const lastName = parts.slice(1).join(" ") || "-";

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        nickname: nickname || null,
        school: school || null,
        gradeLevel: grade || null,
        phone: phone || null,
        email: email || undefined,
      },
    });

    revalidatePath("/admin/students");
    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
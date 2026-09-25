import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import StudentsClient from "./StudentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminStudentsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const [dbStudents, statusSetting, courses] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nickname: true,
        school: true,
        gradeLevel: true,
        phone: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        enrollments: {
          select: {
            id: true,
            status: true,
            course: { select: { id: true, title: true, price: true } },
          },
        },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            course: { select: { id: true, title: true, price: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.themeSetting.findUnique({
      where: { key: "admin_student_statuses" },
    }),
    prisma.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const customStatusMap = statusSetting?.value ? JSON.parse(statusSetting.value) : {};

  const formatted = dbStudents.map((s) => {
    const activeEnrollment = s.enrollments.find((e) => e.status === "ACTIVE") || s.enrollments[0];
    const latestPayment = s.payments[0];

    let defaultStatus = "ยังไม่ชำระ";
    if (activeEnrollment?.status === "ACTIVE" || latestPayment?.status === "APPROVED") {
      defaultStatus = "ชำระแล้ว";
    } else if (latestPayment?.status === "PENDING" || activeEnrollment?.status === "PENDING") {
      defaultStatus = "รอตรวจสอบ";
    }

    // ดึงค่าที่เคยบันทึกไว้ใน Neon DB
    const custom = customStatusMap[s.id];
    const finalStatus = custom?.paymentStatus || defaultStatus;
    const finalNotes = custom?.notes || "";

    const courseObj = activeEnrollment?.course || latestPayment?.course;

    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      nickname: s.nickname || "-",
      grade: s.gradeLevel || "-",
      school: s.school || "-",
      phone: s.phone || "-",
      email: s.email,
      avatarUrl: s.avatarUrl || null,
      course: courseObj?.title ?? "ยังไม่ลงคอร์ส",
      courseId: courseObj?.id ?? "NONE",
      amount: latestPayment?.amount ?? courseObj?.price ?? 0,
      date: s.createdAt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
      paymentStatus: finalStatus,
      notes: finalNotes,
    };
  });

  return <StudentsClient initialStudents={formatted} allCourses={courses} />;
}
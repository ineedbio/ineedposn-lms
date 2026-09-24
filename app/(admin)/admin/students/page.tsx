import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import StudentsClient from "./StudentsClient";

export default async function AdminStudentsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const dbStudents = await prisma.user.findMany({
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
      createdAt: true,
      enrollments: {
        select: {
          id: true,
          status: true,
          course: { select: { id: true, title: true, price: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = dbStudents.map((s) => {
    const activeEnrollment = s.enrollments[0];
    const statusText = activeEnrollment?.status === "ACTIVE" ? "ชำระแล้ว" : "ยังไม่ชำระ";
    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      nickname: s.nickname || "-",
      grade: s.gradeLevel || "-",
      school: s.school || "-",
      phone: s.phone || "-",
      email: s.email,
      avatarUrl: null, // ใช้ตัวอักษรย่อตัวแรกตามดีไซน์มาตรฐานของระบบ
      course: activeEnrollment?.course?.title ?? "ยังไม่ลงคอร์ส",
      courseId: activeEnrollment?.course?.id ?? "NONE",
      amount: activeEnrollment?.course?.price ?? 0,
      date: s.createdAt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
      paymentStatus: statusText,
      notes: "",
    };
  });

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return <StudentsClient initialStudents={formatted} allCourses={courses} />;
}
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import StudentsClient from "./StudentsClient";

export default async function AdminStudentsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // ดึงนักเรียนทั้งหมด พร้อมคอร์สและประวัติการเรียนจบ
  const students = await prisma.user.findMany({
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
        where: { status: "ACTIVE" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          course: {
            select: {
              id: true,
              title: true,
              lessons: {
                select: {
                  id: true,
                  progress: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // คำนวณ % ความคืบหน้าของแต่ละคอร์ส
  const formattedStudents = students.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    nickname: s.nickname ?? "-",
    school: s.school ?? "-",
    gradeLevel: s.gradeLevel ?? "-",
    phone: s.phone ?? "-",
    email: s.email,
    avatarUrl: s.avatarUrl,
    createdAt: s.createdAt.toISOString(),
    courses: s.enrollments.map((e) => {
      const totalLessons = e.course.lessons.length;
      const completedLessons = e.course.lessons.filter((l) =>
        l.progress.some((p) => p.userId === s.id && p.isCompleted)
      ).length;
      const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      return {
        id: e.course.id,
        title: e.course.title,
        percent,
        completedLessons,
        totalLessons,
      };
    }),
  }));

  // ดึงรายชื่อคอร์สทั้งหมดไว้สำหรับ Dropdown ตัวกรอง
  const allCourses = await prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="max-w-[1300px] mx-auto px-8 py-10">
      <StudentsClient initialStudents={formattedStudents} allCourses={allCourses} />
    </div>
  );
}
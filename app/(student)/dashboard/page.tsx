import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      course: { include: { lessons: { include: { progress: { where: { userId } } } } } },
    },
  });

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-8">ห้องเรียนของฉัน</h1>
      <div className="space-y-3">
        {enrollments.map((e) => {
          const total = e.course.lessons.length;
          const done = e.course.lessons.filter((l) => l.progress[0]?.isCompleted).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <Link
              key={e.id}
              href={`/learn/${e.course.id}`}
              className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4"
            >
              <span className="font-medium">{e.course.title}</span>
              <span className="text-sm font-mono">{pct}%</span>
            </Link>
          );
        })}
        {enrollments.length === 0 && (
          <p className="text-ink/40 text-sm">ยังไม่มีคอร์สที่ลงทะเบียน</p>
        )}
      </div>
    </main>
  );
}

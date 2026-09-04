import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      course: {
        include: {
          subject: true,
          lessons: { orderBy: { order: "asc" }, include: { progress: { where: { userId: user.id } } } },
        },
      },
    },
  });

  const firstName = (user.name as string | undefined)?.split(" ")[0] ?? "";

  return (
    <div className="max-w-[1300px] mx-auto px-12 pt-14 pb-24">
      <div className="mb-12">
        <h1 className="text-[36px] font-extrabold tracking-[-0.02em]">สวัสดี, {firstName} 👋</h1>
        <p className="text-[17px] text-secondary mt-2">เรียนต่อจากที่ค้างไว้ หรือเลือกบทเรียนใหม่</p>
      </div>

      <div className="flex flex-col gap-5">
        {enrollments.map((e) => {
          const total = e.course.lessons.length;
          const done = e.course.lessons.filter((l) => l.progress[0]?.isCompleted).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const resumeIdx = Math.max(
            e.course.lessons.findIndex((l) => !l.progress[0]?.isCompleted),
            0
          );
          return (
            <Link
              key={e.id}
              href={`/learn/${e.course.id}?lesson=${resumeIdx}`}
              className="flex gap-7 p-5 rounded-card bg-panel items-center shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-[200px] h-[130px] flex-shrink-0 rounded-2xl bg-white border border-dashed border-border flex items-center justify-center text-muted text-xs">
                ภาพปกคอร์ส
              </div>
              <div className="flex-1 flex flex-col gap-2.5">
                <div className="text-[13px] font-semibold text-accent">{e.course.subject.name}</div>
                <div className="text-[22px] font-extrabold tracking-[-0.01em]">{e.course.title}</div>
                <div className="text-sm text-secondary">
                  บทเรียน {done}/{total}
                </div>
                <div className="w-full max-w-[400px] h-1.5 rounded-full bg-border overflow-hidden mt-1">
                  <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="text-[15px] font-semibold text-ink flex-shrink-0 px-6 py-3 bg-white rounded-pill shadow-soft">
                เรียนต่อ
              </div>
            </Link>
          );
        })}
        {enrollments.length === 0 && (
          <div className="p-10 rounded-card bg-panel shadow-soft text-center text-secondary text-[15px]">
            ยังไม่มีคอร์สที่ลงทะเบียน
          </div>
        )}
      </div>
    </div>
  );
}

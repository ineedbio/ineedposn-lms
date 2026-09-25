import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import CourseCover from "@/components/CourseCover";
import { LinkButton } from "@/components/Button";
import { subjectKey } from "@/lib/site";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) {
    redirect("/login");
  }

  // 1. ดึงข้อมูลผู้ใช้สดๆ จาก Database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { firstName: true, nickname: true },
  });

  // ใช้ชื่อเล่นก่อน ถ้าไม่มีใช้ชื่อจริง
  const displayName = dbUser?.nickname || dbUser?.firstName || (user.name as string | undefined)?.split(" ")[0] || "";

  // 2. ดึงคอร์สที่ลงทะเบียน (เรียนได้แล้ว + รอตรวจสลิป)
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: { in: ["ACTIVE", "PENDING"] } },
    orderBy: { status: "asc" },
    include: {
      course: {
        include: {
          subject: true,
          lessons: { orderBy: { order: "asc" }, include: { progress: { where: { userId: user.id } } } },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-site px-4 pb-16 pt-9">
      <div className="mb-7 grid gap-1">
        <span className="text-[13px] font-medium text-muted">คอร์สของฉัน</span>
        <h1 className="text-[clamp(28px,4vw,38px)] font-bold">สวัสดี {displayName}</h1>
        <p className="text-secondary">เรียนต่อจากที่ค้างไว้ หรือเลือกบทเรียนใหม่</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-card border border-dashed border-border px-6 py-14 text-center text-secondary">
          <p>ยังไม่มีคอร์สที่ลงทะเบียน</p>
          <LinkButton href="/#courses" size="sm">เลือกคอร์ส</LinkButton>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px]">
          {enrollments.map((e) => {
            const active = e.status === "ACTIVE";
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
                href={active ? `/learn/${e.course.id}?lesson=${resumeIdx}` : `/courses/${e.course.slug}`}
                className={`s-${subjectKey(e.course.subject)} flex flex-col overflow-hidden rounded-card border border-border bg-paper no-underline transition duration-200 hover:-translate-y-0.5 hover:border-secondary`}
              >
                <CourseCover course={e.course} />
                <div className="flex flex-1 flex-col gap-2 px-[18px] pb-[18px] pt-4">
                  <span className="text-[13px] font-semibold text-accent">{e.course.subject.name}</span>
                  <h3 className="text-xl font-bold leading-snug">{e.course.title}</h3>
                  {active ? (
                    <>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2 text-[13.5px]">
                        <span className="text-secondary">เรียนแล้ว {done}/{total} ตอน · {pct}%</span>
                        <span className="rounded-pill bg-accent px-3 py-0.5 text-[12.5px] font-medium text-on-accent">
                          {done === 0 ? "เริ่มเรียน" : "เรียนต่อ"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-auto pt-2">
                      <span className="rounded-pill bg-wait-soft px-2.5 py-0.5 text-xs font-medium text-wait">รอตรวจสลิป</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

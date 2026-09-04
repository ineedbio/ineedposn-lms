import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/login");

  const exams = await prisma.quiz.findMany({
    where: { isMockExam: true },
    include: {
      _count: { select: { questions: true } },
      attempts: { where: { userId }, orderBy: { submittedAt: "desc" }, take: 1 },
    },
    orderBy: { id: "desc" },
  });

  return (
    <div className="max-w-[1300px] mx-auto px-12 pt-14 pb-24">
      <div className="mb-10">
        <Link href="/dashboard" className="text-sm font-medium text-secondary hover:text-ink transition">
          ← กลับหน้าหลัก
        </Link>
        <h1 className="text-[32px] font-extrabold tracking-[-0.02em] mt-3">ข้อสอบจำลอง</h1>
        <p className="text-[15px] text-secondary mt-2">ลองทำข้อสอบจำลองเพื่อประเมินความพร้อมของตัวเอง</p>
      </div>

      <div className="flex flex-col gap-4 max-w-[700px]">
        {exams.map((exam) => {
          const last = exam.attempts[0];
          return (
            <Link
              key={exam.id}
              href={`/dashboard/exams/${exam.id}`}
              className="flex justify-between items-center p-5 rounded-2xl bg-panel hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex flex-col gap-1">
                <div className="text-[17px] font-bold">{exam.title}</div>
                <div className="text-sm text-secondary">
                  {exam._count.questions} ข้อ · {Math.round(exam.timeLimit / 60)} นาที · เกณฑ์ผ่าน {exam.passScore}%
                </div>
              </div>
              {last && (
                <div className={`text-sm font-bold ${last.isPassed ? "text-green-600" : "text-red-600"}`}>
                  ล่าสุด {last.score}%
                </div>
              )}
            </Link>
          );
        })}
        {exams.length === 0 && <p className="text-secondary text-sm">ยังไม่มีข้อสอบจำลองเปิดให้ทำ</p>}
      </div>
    </div>
  );
}

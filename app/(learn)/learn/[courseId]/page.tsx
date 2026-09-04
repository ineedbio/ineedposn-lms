import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import LessonPlayer from "@/components/LessonPlayer";
import QuizPlayer from "@/components/QuizPlayer";

export const dynamic = "force-dynamic";

function extractVideoId(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export default async function LessonPlayerPage({
  params,
  searchParams,
}: {
  params: { courseId: string };
  searchParams: { lesson?: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) redirect("/login");

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: params.courseId } },
  });
  if (enrollment?.status !== "ACTIVE") redirect("/dashboard");

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  if (!course) notFound();

  const idx = Math.min(Math.max(parseInt(searchParams.lesson ?? "0", 10) || 0, 0), course.lessons.length - 1);
  const lesson = course.lessons[idx];
  if (!lesson) notFound();

  // NOTE: completion is no longer set here. Real watch time is reported by
  // the client-side LessonPlayer to POST /api/progress, which is the only
  // place LessonProgress.isCompleted gets flipped to true now.

  const videoId = extractVideoId(lesson.youtubeUrl);

  // Quiz lessons render a QuizPlayer instead of a video. correctAnswer and
  // explanation are stripped here (server-side) so a student can't read the
  // answer key out of the page's initial HTML/RSC payload before submitting.
  const quiz =
    lesson.type === "QUIZ"
      ? await prisma.quiz.findUnique({
          where: { lessonId: lesson.id },
          include: { questions: { orderBy: { id: "asc" } } },
        })
      : null;
  const quizForPlayer = quiz
    ? {
        id: quiz.id,
        title: quiz.title,
        timeLimit: quiz.timeLimit,
        passScore: quiz.passScore,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          choices: q.choices as { id: string; text: string }[] | null,
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col">
      <header className="flex items-center justify-between px-10 py-5 border-b border-dark-hover">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[15px] font-semibold text-panel hover:text-white transition"
        >
          ← กลับหน้าหลัก
        </Link>
        <div className="text-sm text-muted font-medium">
          {course.title} · บทที่ {idx + 1}/{course.lessons.length}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-7">
        {quizForPlayer ? (
          quizForPlayer.questions.length > 0 ? (
            <QuizPlayer key={quizForPlayer.id} quiz={quizForPlayer} />
          ) : (
            <div className="w-full max-w-[800px] bg-white text-ink rounded-2xl p-8 text-center text-secondary">
              ข้อสอบนี้ยังไม่มีคำถาม กรุณาติดต่อผู้ดูแลระบบ
            </div>
          )
        ) : (
          <div className="w-full max-w-[1100px] aspect-video bg-black rounded-2xl overflow-hidden relative">
            {videoId ? (
              <LessonPlayer lessonId={lesson.id} videoId={videoId} containerId={`yt-player-${lesson.id}`} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-secondary">
                <div className="w-16 h-16 rounded-full bg-white/[0.08] flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent border-l-[22px] border-l-secondary ml-1.5" />
                </div>
                <div className="text-sm">ยังไม่มีวิดีโอสำหรับบทเรียนนี้</div>
              </div>
            )}
          </div>
        )}

        <div className="w-full max-w-[1100px] flex justify-between items-center">
          <div className="text-base font-bold">
            บทที่ {idx + 1}: {lesson.title}
          </div>
          <div className="flex gap-3">
            {idx > 0 && (
              <Link
                href={`/learn/${course.id}?lesson=${idx - 1}`}
                className="text-sm font-semibold text-panel bg-dark-hover px-5 py-2.5 rounded-pill hover:bg-[#4a4a4c] transition-all duration-150 active:scale-95"
              >
                ← บทก่อนหน้า
              </Link>
            )}
            {idx < course.lessons.length - 1 && (
              <Link
                href={`/learn/${course.id}?lesson=${idx + 1}`}
                className="text-sm font-semibold text-ink bg-white px-5 py-2.5 rounded-pill hover:bg-panel transition-all duration-150 active:scale-95"
              >
                บทถัดไป →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

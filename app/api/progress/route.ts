import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, ApiError } from "@/lib/rbac";

// A lesson counts as "done" once the student has watched this fraction of
// the video — mirrors how most course platforms treat near-the-end as
// complete (accounts for outro/credits the student may skip).
const COMPLETE_THRESHOLD = 0.9;

/**
 * Records real watch progress for a lesson, called periodically by the
 * client-side YouTube player (see components/LessonPlayer.tsx).
 *
 * Replaces the previous behaviour where simply loading the lesson page
 * marked it complete — this endpoint requires actual watched seconds and
 * verifies the student is enrolled (or the lesson is a free preview)
 * before it will record anything.
 */
export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const userId = (session.user as any).id as string;
    const body = await req.json();
    const lessonId = String(body.lessonId ?? "");
    const watchedSeconds = Math.max(0, Math.floor(Number(body.watchedSeconds) || 0));
    const totalSeconds = body.totalSeconds != null ? Math.floor(Number(body.totalSeconds)) : null;

    if (!lessonId) {
      return NextResponse.json({ error: "กรอกข้อมูลไม่ครบ" }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true, duration: true, isPreview: true },
    });
    if (!lesson) return NextResponse.json({ error: "ไม่พบบทเรียนนี้" }, { status: 404 });

    if (!lesson.isPreview) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: lesson.courseId } },
      });
      if (enrollment?.status !== "ACTIVE") {
        return NextResponse.json({ error: "คุณยังไม่ได้ลงทะเบียนคอร์สนี้" }, { status: 403 });
      }
    }

    // A student can only ever gain watch time, never lose it — otherwise
    // seeking backward or a dropped connection could un-complete a lesson.
    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    // Clamp against the video's own length so a manipulated client payload
    // can't report an impossibly large watchedSeconds.
    const knownDuration = lesson.duration ?? totalSeconds ?? null;
    const cappedWatched = knownDuration
      ? Math.min(watchedSeconds, knownDuration)
      : watchedSeconds;

    const mergedWatched = Math.max(existing?.watchedSeconds ?? 0, cappedWatched);
    const justCompleted =
      !existing?.isCompleted && knownDuration != null && mergedWatched >= knownDuration * COMPLETE_THRESHOLD;
    const isCompleted = existing?.isCompleted || justCompleted;

    await prisma.$transaction(async (tx) => {
      // First time we see a real duration for this lesson, persist it so
      // future views (and the admin's course editor) know the video length
      // without requiring the admin to enter it by hand.
      if (lesson.duration == null && totalSeconds) {
        await tx.lesson.update({ where: { id: lessonId }, data: { duration: totalSeconds } });
      }

      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: {
          watchedSeconds: mergedWatched,
          isCompleted,
          completedAt: justCompleted ? new Date() : existing?.completedAt,
        },
        create: {
          userId,
          lessonId,
          watchedSeconds: mergedWatched,
          isCompleted,
          completedAt: justCompleted ? new Date() : null,
        },
      });
    });

    return NextResponse.json({ watchedSeconds: mergedWatched, isCompleted });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

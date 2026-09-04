import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";

/**
 * A quiz is reachable by a student in exactly two cases: it's a standalone
 * mock exam (no course to be enrolled in), or it's attached to a lesson the
 * student has access to (enrolled + ACTIVE, or the lesson is a free preview).
 * Neither case trusts the client — this re-checks on every read and write.
 */
export async function assertQuizAccess(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { lesson: { select: { id: true, courseId: true, isPreview: true } } },
  });
  if (!quiz) throw new ApiError(404, "ไม่พบข้อสอบนี้");

  if (quiz.lesson) {
    if (!quiz.lesson.isPreview) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: quiz.lesson.courseId } },
      });
      if (enrollment?.status !== "ACTIVE") {
        throw new ApiError(403, "คุณยังไม่ได้ลงทะเบียนคอร์สนี้");
      }
    }
  } else if (!quiz.isMockExam) {
    // Orphaned quiz: not linked to a lesson and not marked as a mock exam.
    // Nothing should ever reach a student in this state.
    throw new ApiError(403, "ข้อสอบนี้ยังไม่เปิดให้ทำ");
  }

  return quiz;
}

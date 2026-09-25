import { cache } from "react";
import { prisma } from "./prisma";
import { subjectKey, type SubjectKey } from "./site";

// Course data in the shape the Apps Script views used (courses.list / course.detail).
export type ZCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  subject: SubjectKey;
  subjectName: string;
  subjectSlug: string;
  level: string;
  price: number;
  fullPrice: number;
  coverUrl: string;
  lessonCount: number;
  totalMin: number;
};
export type EnrollState = "approved" | "pending" | "rejected";

/** Published courses in display order. Cached per request. */
export const getCatalog = cache(async (): Promise<ZCourse[]> => {
  const rows = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { subject: true, lessons: { select: { duration: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle || "",
    description: c.description,
    subject: subjectKey(c.subject),
    subjectName: c.subject.name,
    subjectSlug: c.subject.slug,
    level: c.level || "",
    price: c.price,
    fullPrice: c.fullPrice ?? 0,
    coverUrl: c.coverImage || "",
    lessonCount: c.lessons.length,
    totalMin: Math.round(c.lessons.reduce((a, l) => a + (l.duration ?? 0), 0) / 60),
  }));
});

/** The signed-in user's state per course id: approved / pending (slip sent) / rejected (last slip refused). */
export async function myStates(userId: string | undefined): Promise<Record<string, EnrollState>> {
  if (!userId) return {};
  const [enrolls, pays] = await Promise.all([
    prisma.enrollment.findMany({ where: { userId }, select: { courseId: true, status: true } }),
    prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { courseId: true, status: true } }),
  ]);
  const out: Record<string, EnrollState> = {};
  const lastPay: Record<string, string> = {};
  for (const p of pays) if (!(p.courseId in lastPay)) lastPay[p.courseId] = p.status;
  for (const [cid, st] of Object.entries(lastPay)) out[cid] = st === "APPROVED" ? "approved" : st === "PENDING" ? "pending" : "rejected";
  for (const e of enrolls) {
    if (e.status === "ACTIVE") out[e.courseId] = "approved";
    else if (e.status === "PENDING" && out[e.courseId] !== "rejected") out[e.courseId] = "pending";
  }
  return out;
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import CourseAdmin from "./CourseAdmin";

export const dynamic = "force-dynamic";

export default async function AdminCoursePage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const [c, subjects, students] = await Promise.all([
    prisma.course.findUnique({
      where: { id: params.id },
      include: { subject: true, lessons: { orderBy: { order: "asc" }, include: { attachments: true, quiz: { select: { id: true } } } } },
    }),
    prisma.subject.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.enrollment.count({ where: { courseId: params.id, status: "ACTIVE" } }),
  ]);
  if (!c) notFound();

  const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  return (
    <CourseAdmin
      subjects={subjects}
      students={students}
      subject={{ name: c.subject.name, slug: c.subject.slug }}
      slug={c.slug}
      course={{
        id: c.id, title: c.title, subjectId: c.subjectId, level: s(c.level), isPublished: c.isPublished, subtitle: s(c.subtitle),
        price: s(c.price), fullPrice: s(c.fullPrice), sortOrder: s(c.sortOrder), coverImage: s(c.coverImage),
        trailerYoutube: c.trailerYoutube ? `https://youtu.be/${c.trailerYoutube}` : "", highlights: s(c.highlights), audience: s(c.audience),
        description: s(c.description), instructorName: s(c.instructorName), instructorTitle: s(c.instructorTitle), instructorBio: s(c.instructorBio),
        instructorPhoto: s(c.instructorPhoto), faq: s(c.faq), paymentQrUrl: c.paymentQrUrl,
      }}
      lessons={c.lessons.map((l) => ({
        id: l.id, title: l.title, chapter: l.chapter ?? "", type: l.type, youtubeUrl: l.youtubeUrl ?? "",
        minutes: l.duration ? Math.round(l.duration / 60) : 0, isPreview: l.isPreview, hasQuiz: !!l.quiz,
        attachments: l.attachments.map((a) => ({ id: a.id, fileName: a.fileName, fileUrl: a.fileUrl })),
      }))}
    />
  );
}

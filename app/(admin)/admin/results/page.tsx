import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import ResultsClient from "./ResultsClient";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  await requireAdmin();
  const [rows, subjects] = await Promise.all([
    prisma.studentResult.findMany({ include: { subject: true }, orderBy: [{ year: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.subject.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <ResultsClient
      subjects={subjects}
      rows={rows.map((r) => ({
        id: r.id, nickname: r.nickname, year: r.year, subjectId: r.subjectId ?? "", subjectName: r.subject?.name ?? "–",
        school: r.school ?? "", center: r.center ?? "", review: r.review ?? "", photoUrl: r.photoUrl ?? "",
        isPublished: r.isPublished, sortOrder: String(r.sortOrder),
      }))}
    />
  );
}

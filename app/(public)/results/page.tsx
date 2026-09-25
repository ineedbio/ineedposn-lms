import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ResultCard } from "@/components/HallOfFame";

export const dynamic = "force-dynamic";
export const metadata = { title: "ผลงานน้องๆ · INeedBio" };

export default async function ResultsPage({ searchParams }: { searchParams: { year?: string } }) {
  const years = (await prisma.studentResult.findMany({ where: { isPublished: true }, distinct: ["year"], select: { year: true }, orderBy: { year: "desc" } })).map((y) => y.year);
  const year = searchParams.year && years.includes(searchParams.year) ? searchParams.year : years[0];
  const rows = year
    ? await prisma.studentResult.findMany({
        where: { isPublished: true, year },
        include: { subject: { select: { name: true, slug: true } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
    : [];

  return (
    <main className="mx-auto max-w-site px-4 pb-16 pt-9">
      <span className="text-[13px] font-medium text-muted">ผลงานน้องๆ</span>
      <h1 className="mb-5 text-[clamp(28px,4vw,38px)] font-bold">น้องที่ติดค่าย 1 สอวน.</h1>
      {years.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/results?year=${y}`}
              aria-pressed={y === year}
              className={`rounded-pill border px-4 py-1.5 text-sm no-underline ${y === year ? "border-accent bg-accent text-on-accent" : "border-border text-secondary"}`}
            >
              {y}
            </Link>
          ))}
        </div>
      )}
      {rows.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
          {rows.map((r) => <ResultCard key={r.id} r={r} withReview />)}
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-border px-6 py-12 text-center text-secondary">ยังไม่มีข้อมูล</div>
      )}
    </main>
  );
}

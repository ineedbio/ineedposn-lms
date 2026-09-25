import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { subjectKey } from "@/lib/site";

type Result = { id: string; nickname: string; photoUrl: string | null; school: string | null; center: string | null; review: string | null; year: string; subject: { name: string; slug: string } | null };

/** Polaroid-style card for one student in the hall of fame. */
export function ResultCard({ r, withReview }: { r: Result; withReview?: boolean }) {
  return (
    <figure className={`s-${subjectKey(r.subject)} grid w-[150px] flex-none content-start gap-1.5 rounded-md bg-paper p-2.5 pb-3 shadow-soft-lg ring-1 ring-border ${withReview ? "w-auto" : "odd:-rotate-2 even:rotate-2"}`}>
      <span className="grid aspect-square place-items-center overflow-hidden rounded bg-panel text-3xl font-bold text-accent">
        {r.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          r.nickname.slice(0, 1)
        )}
      </span>
      <figcaption className="text-center">
        <b className="block text-sm">{r.nickname}</b>
        <span className="text-xs font-medium text-accent">{r.subject?.name ?? ""}</span>
        {withReview && (
          <>
            {(r.school || r.center) && <span className="block text-xs text-muted">{[r.school, r.center].filter(Boolean).join(" · ")}</span>}
            {r.review && <blockquote className="mt-2 text-left text-[13.5px] text-secondary">“{r.review}”</blockquote>}
          </>
        )}
      </figcaption>
    </figure>
  );
}

/** Home-page section: students from the latest year who passed POSN camp (หลังบ้าน → ผลงานนักเรียน). */
export default async function HallOfFame() {
  const latest = await prisma.studentResult.findFirst({ where: { isPublished: true }, orderBy: { year: "desc" }, select: { year: true } });
  if (!latest) return null;
  const rows = await prisma.studentResult.findMany({
    where: { isPublished: true, year: latest.year },
    include: { subject: { select: { name: true, slug: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const bySubject = new Map<string, { name: string; slug: string; n: number }>();
  for (const r of rows) {
    if (!r.subject) continue;
    const s = bySubject.get(r.subject.slug) ?? { ...r.subject, n: 0 };
    s.n++;
    bySubject.set(r.subject.slug, s);
  }

  return (
    <section className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <small className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-accent">Hall of fame · {latest.year}</small>
          <h2 className="text-[clamp(22px,3vw,28px)] font-extrabold tracking-[-0.02em]">น้องๆ INeedBio ติดค่าย 1 สอวน.</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...bySubject.values()].map((s) => (
              <span key={s.slug} className={`s-${subjectKey(s)} rounded-pill border border-border px-3 py-0.5 text-[13px] text-secondary`}>
                <i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent align-[1px]" />
                {s.name} <b className="text-ink">{s.n}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <b className="text-[64px] font-extrabold leading-none text-accent">{rows.length}</b> <span className="font-semibold">คน</span>
        </div>
      </div>
      <div className="-mx-4 mt-5 flex gap-4 overflow-x-auto px-4 py-4">
        {rows.map((r) => <ResultCard key={r.id} r={r} />)}
      </div>
      <Link href="/results" className="mt-2 inline-block rounded-pill border border-accent px-4 py-1.5 text-sm text-accent no-underline hover:opacity-85">
        อ่านรีวิวจากน้องๆ ทั้งหมด →
      </Link>
    </section>
  );
}

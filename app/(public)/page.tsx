import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/Button";
import CourseCover from "@/components/CourseCover";
import CourseGrid from "@/components/CourseGrid";
import { tileInclude, toTile } from "@/lib/courses";
import { baht, subjectKey } from "@/lib/site";
import { getSettings } from "@/lib/settings";
import HallOfFame from "@/components/HallOfFame";
import Link from "next/link";

export const dynamic = "force-dynamic";

type BlockContent = { heading: string; sub: string; bg: string; fg: string; imageUrl?: string };

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-3.5">
      <small className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-accent">{kicker}</small>
      <h2 className="text-[clamp(22px,3vw,28px)] font-extrabold tracking-[-0.02em]">{title}</h2>
    </div>
  );
}

export default async function HomePage() {
  const [rows, blocks, cfg] = await Promise.all([
    prisma.course.findMany({ where: { isPublished: true }, include: tileInclude, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.pageBlock.findMany({ where: { page: "home", isPublished: true }, orderBy: { order: "asc" } }),
    getSettings(),
  ]);
  const [titleA, titleB] = cfg.hero_title.split("|");
  const courses = rows.map(toTile);
  const feat = courses[0];

  return (
    <>
      <main className="mx-auto max-w-site px-4">
        {/* ===== Hero ===== */}
        <section className="grid items-center gap-10 pb-7 pt-11 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-accent before:h-0.5 before:w-7 before:bg-accent">
              {cfg.hero_eyebrow}
            </span>
            <h1 className="mb-4 mt-3.5 text-[clamp(38px,6.4vw,68px)] font-extrabold leading-[1.08] tracking-[-0.03em]">
              {titleA}
              {titleB && (
                <>
                  <br />
                  <em className="not-italic text-accent">{titleB}</em>
                </>
              )}
            </h1>
            <p className="max-w-[42ch] text-[clamp(16px,1.8vw,18px)] text-secondary">{cfg.hero_subtitle}</p>
            <div className="mt-[22px] flex flex-wrap gap-2.5">
              <LinkButton href="#courses" size="sm" className="px-[18px] py-2 text-[14.5px]">เลือกคอร์สเลย</LinkButton>
              <LinkButton href={`https://www.instagram.com/${cfg.contact_ig}`} target="_blank" rel="noopener" variant="outline" size="sm" className="px-[18px] py-2 text-[14.5px]">
                ปรึกษาแอดมินฟรี
              </LinkButton>
            </div>
          </div>
          {feat ? (
            <Link
              href={`/courses/${feat.slug}`}
              className={`s-${subjectKey(feat.subject)} relative block aspect-[4/3] overflow-hidden rounded-[22px] border border-border bg-panel no-underline`}
            >
              <CourseCover course={feat} big className="!absolute inset-0 !aspect-auto h-full !items-center !justify-center !pb-[70px]" />
              <span className="absolute inset-x-3.5 bottom-3.5 flex items-center justify-between gap-2.5 rounded-[14px] bg-paper/90 px-3.5 py-3 backdrop-blur">
                <span>
                  <b className="block text-base leading-snug">{feat.title}</b>
                  <span className="text-[13px] text-secondary">{baht(feat.price)} · {feat.lessonCount} ตอน</span>
                </span>
                <span className="flex-none rounded-pill bg-accent px-3 py-0.5 text-[12.5px] font-medium text-on-accent">ดูคอร์ส</span>
              </span>
            </Link>
          ) : (
            <div className="aspect-[4/3] rounded-[22px] bg-panel max-md:hidden" />
          )}
        </section>

        {/* ===== Admin-managed promo blocks (Design Studio) ===== */}
        {blocks.length > 0 && (
          <section className="mb-5 grid gap-3">
            {blocks.map((b) => {
              const c = b.contentJson as unknown as BlockContent;
              const style = { background: c.bg, color: c.fg };
              if (b.type === "banner") {
                return (
                  <div key={b.id} className="rounded-2xl px-6 py-4 text-center" style={style}>
                    <div className="font-bold">{c.heading}</div>
                    {c.sub && <div className="text-sm opacity-75">{c.sub}</div>}
                  </div>
                );
              }
              if (b.type === "course") {
                return (
                  <div key={b.id} className="flex items-center gap-5 rounded-2xl px-6 py-5" style={style}>
                    <div className="flex h-20 w-[120px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/5 text-xs opacity-60">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "รูป"
                      )}
                    </div>
                    <div>
                      <div className="text-xl font-bold">{c.heading}</div>
                      <div className="mt-1 text-sm opacity-75">{c.sub}</div>
                    </div>
                  </div>
                );
              }
              if (b.type === "feature") {
                return (
                  <div key={b.id} className="rounded-2xl px-6 py-7" style={style}>
                    <div className="text-[22px] font-bold">{c.heading}</div>
                    <div className="mt-1.5 whitespace-pre-line text-sm opacity-75">{c.sub}</div>
                  </div>
                );
              }
              return (
                <div key={b.id} className="rounded-2xl px-6 py-12 text-center" style={style}>
                  <div className="text-[28px] font-extrabold tracking-[-0.02em]">{c.heading}</div>
                  <div className="mt-2 text-[15px] opacity-75">{c.sub}</div>
                </div>
              );
            })}
          </section>
        )}

        <HallOfFame />

        {/* ===== Course grid ===== */}
        <section id="courses" className="scroll-mt-20 py-8">
          <SectionHead kicker="All courses" title="คอร์สทั้งหมด" />
          {courses.length ? (
            <CourseGrid courses={courses} />
          ) : (
            <div className="rounded-card border border-dashed border-border px-6 py-12 text-center text-muted">ยังไม่มีคอร์สที่เปิดขาย</div>
          )}
        </section>

        {/* ===== Why ===== */}
        <section className="py-8">
          <SectionHead kicker="Why INeedBio" title="เรียนกับเราได้อะไร" />
          <div className="grid gap-3.5 md:grid-cols-3">
            {[
              ["∞", "ดูได้ตลอดชีพ", "ซื้อครั้งเดียว ไม่มีวันหมดอายุ ไม่มีการลบคลิป ย้อนดูก่อนสอบกี่รอบก็ได้"],
              ["PDF", "ชีทประกอบทุกบท", "เปิดชีทข้างคลิปได้เลย จดตามพี่ได้ทันที ไม่ต้องหาไฟล์เอง"],
              ["%", "รู้ว่าเรียนถึงไหน", "ระบบนับความคืบหน้าจากเวลาที่ดูจริง วางแผนอ่านก่อนสอบได้ง่าย"],
            ].map(([n, h, p]) => (
              <div key={h} className="grid content-start gap-1.5 rounded-card border border-border p-5">
                <b className="text-[28px] font-extrabold leading-none text-accent">{n}</b>
                <h3 className="mt-2 text-[17px] font-bold">{h}</h3>
                <p className="text-sm text-secondary">{p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Contact ===== */}
        <section className="pb-14 pt-8">
          <SectionHead kicker="Contact" title="มีคำถาม ทักพี่ได้เลย" />
          <div className="grid gap-3.5 md:grid-cols-2">
            <a
              href={`https://www.instagram.com/${cfg.contact_ig}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-4 rounded-card bg-[linear-gradient(120deg,#f58529,#dd2a7b_55%,#8134af)] px-6 py-5 text-snow no-underline transition-transform hover:-translate-y-0.5"
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
              <span className="grid">
                <b className="text-lg">Instagram</b>
                <span className="text-[13px] opacity-85">@{cfg.contact_ig} · ช่องทางหลัก สอบถาม/ส่งสลิป</span>
              </span>
            </a>
            <a href={`tel:${cfg.contact_phone.replace(/-/g, "")}`} className="flex items-center gap-4 rounded-card bg-ink px-6 py-5 text-white no-underline transition-transform hover:-translate-y-0.5">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
              </svg>
              <span className="grid">
                <b className="text-lg">{cfg.contact_phone}</b>
                <span className="text-[13px] opacity-80">เฉพาะเรื่องด่วน 10:00–18:00</span>
              </span>
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import { getSettings } from "@/lib/settings";

/** Dark green site footer with live course/lesson/hour counts. */
export default async function Footer() {
  const [courses, lessons, subjects, cfg] = await Promise.all([
    prisma.course.count({ where: { isPublished: true } }),
    prisma.lesson.aggregate({ where: { course: { isPublished: true } }, _count: true, _sum: { duration: true } }),
    prisma.subject.findMany({ where: { courses: { some: { isPublished: true } } }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    getSettings(),
  ]);
  const hours = Math.round((lessons._sum.duration ?? 0) / 3600);
  const link = "text-snow/70 no-underline hover:text-snow";

  return (
    <footer className="bg-foot text-[14px] text-snow">
      <div className="mx-auto grid max-w-site gap-8 px-4 py-12 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="grid content-start gap-3">
          <div className="flex items-center gap-2.5 text-[19px] font-bold">
            <Image src="/ineedbio-logo.png" alt="" width={34} height={34} className="rounded-full bg-snow" />
            {SITE.name}
          </div>
          <p className="max-w-[46ch] text-snow/70">
            ติวออนไลน์สำหรับน้อง ม.ปลาย เตรียมสอบ สอวน. และ A-Level เรียนผ่านคลิป ดูซ้ำได้ตลอด มีชีทประกอบทุกบท
          </p>
          {courses > 0 && (
            <div className="mt-2 flex gap-7">
              {[
                [courses, "คอร์สที่เปิดอยู่"],
                [lessons._count, "ตอน"],
                [hours, "ชั่วโมงคลิปเรียน"],
              ].map(([n, label]) => (
                <div key={label as string} className="grid">
                  <b className="text-2xl font-bold tabular-nums">{n}</b>
                  <span className="text-[12.5px] text-snow/70">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4 className="mb-3 text-[13px] font-semibold">คอร์สเรียน</h4>
          <ul className="grid gap-2">
            {subjects.map((s) => (
              <li key={s.id}>
                <Link href="/#courses" className={link}>{s.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-[13px] font-semibold">ติดต่อ</h4>
          <ul className="grid gap-2">
            <li>
              <a href={`https://www.instagram.com/${cfg.contact_ig}`} target="_blank" rel="noopener" className={link}>IG @{cfg.contact_ig}</a>
            </li>
            {cfg.contact_phone && <li className="text-snow/70">โทร {cfg.contact_phone}</li>}
            <li className="text-snow/70">(เฉพาะเรื่องด่วน 10:00–18:00)</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-site border-t border-snow/15 px-4 py-5 text-[12.5px] text-snow/70">
        © {new Date().getFullYear()} {SITE.name} · {SITE.domain} ·{" "}
        <Link href="/terms" className={link}>ข้อตกลงการใช้งาน</Link> ·{" "}
        <Link href="/privacy" className={link}>นโยบายความเป็นส่วนตัว</Link>
      </div>
    </footer>
  );
}

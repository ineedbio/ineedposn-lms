/* Markup building blocks shared by server and client components (cover(), tileHtml(),
   reviewCard() on the Apps Script site). No server-only imports here. */

import Link from "next/link";
import type { EnrollState, ZCourse } from "@/lib/catalog";
import { hm, zbaht } from "@/lib/z1";

const SHORT: Record<string, string> = { bio: "ชีวะ", chem: "เคมี", phys: "ฟิสิกส์", math: "คณิต" };
export const MASCOT = "/mascot.webp";

/* ─── building blocks ─── */

export function Cover({ c, tile }: { c: ZCourse; tile?: boolean }) {
  const extra = tile ? (
    <>
      {c.fullPrice > c.price && <span className="off">ลด {zbaht(c.fullPrice - c.price)}</span>}
      {c.level && <span className="lv">{c.level}</span>}
    </>
  ) : null;
  return c.coverUrl ? (
    <span className="cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.coverUrl} alt="" loading="lazy" />
      {extra}
    </span>
  ) : (
    <span className="cover typo">
      <small>INeedBio</small>
      <b>{SHORT[c.subject] || c.subjectName}</b>
      {extra}
    </span>
  );
}

export function StatusBadge({ s }: { s?: EnrollState }) {
  if (s === "approved") return <span className="badge b-ok">เรียนได้แล้ว</span>;
  if (s === "pending") return <span className="badge b-wait">รอตรวจสลิป</span>;
  if (s === "rejected") return <span className="badge b-no">สลิปไม่ผ่าน</span>;
  return null;
}

export function Tile({ c, state }: { c: ZCourse; state?: EnrollState }) {
  return (
    <Link className={`tile s-${c.subject}`} href={`/courses/${c.slug}`}>
      <Cover c={c} tile />
      <div className="body">
        {c.coverUrl && <span className="mono">{c.subjectName}</span>}
        <h3>{c.title}</h3>
        <p>{c.subtitle}</p>
        <div className="foot">
          <span className="price">
            {c.fullPrice > c.price && <span className="was">{zbaht(c.fullPrice)}</span>}
            {zbaht(c.price)}
          </span>
          {state ? <StatusBadge s={state} /> : <span className="sm muted">{c.lessonCount} ตอน · {hm(c.totalMin)}</span>}
        </div>
      </div>
    </Link>
  );
}

export type ZResult = { id: string; nickname: string; year: string; subject: string; subjectName: string; school: string; center: string; review: string; photoUrl: string };

export function StuPhoto({ r, cls = "sp" }: { r: { photoUrl: string }; cls?: string }) {
  return (
    <span className={cls}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {r.photoUrl ? <img src={r.photoUrl} alt="" loading="lazy" /> : <img src={MASCOT} alt="" className="cat" />}
    </span>
  );
}

export function ReviewCard({ r }: { r: ZResult }) {
  return (
    <article className={`rv s-${r.subject}`} id={`rv-${r.id}`}>
      <div className="rv-h">
        <StuPhoto r={r} cls="rv-ph" />
        <div><b>{r.nickname}</b><span>{r.school}</span></div>
      </div>
      <div className="rv-tags">
        <span className="rv-sj">{r.subjectName} · ค่าย 1 ปี {r.year}</span>
        {r.center && <span className="rv-c">{r.center}</span>}
      </div>
      {r.review ? <p className="rv-q">{r.review}</p> : <p className="rv-q muted">ยินดีด้วยกับการติดค่าย 1 สอวน. สาขา{r.subjectName}</p>}
    </article>
  );
}

export function subjCount(list: ZResult[]) {
  const o: Record<string, { n: number; name: string }> = {};
  for (const r of list) o[r.subject] = { n: (o[r.subject]?.n ?? 0) + 1, name: r.subjectName };
  return o;
}

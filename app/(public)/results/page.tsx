import Link from "next/link";
import { getResults } from "@/components/z1/server";
import { MASCOT, ReviewCard, subjCount } from "@/components/z1/blocks";

export const dynamic = "force-dynamic";
export const metadata = { title: "ผลงานน้องๆ · INeedBio" };

// Port of viewResults() from the Apps Script site.
export default async function ResultsPage({ searchParams }: { searchParams: { year?: string; subject?: string } }) {
  const all = await getResults();
  const years = Array.from(new Set(all.map((r) => Number(r.year)))).sort((a, b) => b - a);
  const yr = Number(searchParams.year) && years.includes(Number(searchParams.year)) ? Number(searchParams.year) : years[0];
  const sj = searchParams.subject ?? "";
  const inYear = all.filter((r) => Number(r.year) === yr);
  const cnt = subjCount(inYear);
  let list = inYear.filter((r) => !sj || r.subject === sj);
  list = list.filter((r) => r.review).concat(list.filter((r) => !r.review));
  const href = (y: number, s: string) => `/results?year=${y}${s ? `&subject=${s}` : ""}`;

  return (
    <>
      <section className="res-h">
        <small className="k">Hall of fame</small>
        <h1>ผลงานน้องๆ INeedBio</h1>
        <p className="ink2">น้องที่เรียนกับเราและผ่านการคัดเลือกเข้าค่าย 1 สอวน.{yr ? ` ปี ${yr}` : ""}</p>
        {all.length > 0 && (
          <div className="res-stats">
            <div className="big"><b>{inYear.length}</b><span>คนติดค่าย 1</span></div>
            {Object.entries(cnt).map(([k, v]) => <div key={k} className={`s-${k}`}><b>{v.n}</b><span>{v.name}</span></div>)}
          </div>
        )}
      </section>
      {years.length > 1 && (
        <div className="subj-chips">
          {years.map((y) => <Link key={y} className="chip" href={href(y, "")} aria-pressed={y === yr}>ปี {y}</Link>)}
        </div>
      )}
      <div className="subj-chips">
        <Link className="chip" href={href(yr, "")} aria-pressed={!sj}>ทั้งหมด</Link>
        {Object.entries(cnt).map(([k, v]) => (
          <Link key={k} className={`chip s-${k}`} href={href(yr, k)} aria-pressed={sj === k}><i />{v.name} ({v.n})</Link>
        ))}
      </div>
      {list.length ? (
        <div className="rvs">{list.map((r) => <ReviewCard key={r.id} r={r} />)}</div>
      ) : (
        <div className="empty"><p>ยังไม่มีข้อมูลผลงาน</p></div>
      )}
      <div className="ask" style={{ marginTop: 36 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MASCOT} alt="" />
        <div><h3>อยากเป็นคนต่อไป?</h3><p>ดูคอร์สที่น้องๆ ใช้เตรียมสอบ แล้วเริ่มได้เลยวันนี้</p></div>
        <Link className="pill" href="/">ดูคอร์สทั้งหมด</Link>
      </div>
    </>
  );
}

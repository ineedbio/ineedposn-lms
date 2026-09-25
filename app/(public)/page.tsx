import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getCatalog, myStates } from "@/lib/catalog";
import { getResults } from "@/components/z1/server";
import { StuPhoto, subjCount } from "@/components/z1/blocks";
import { Catalog, Featured } from "@/components/z1/home";
import { JumpButton } from "@/components/z1/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const [cs, cfg, results, mine] = await Promise.all([getCatalog(), getSettings(), getResults(), myStates((session?.user as any)?.id)]);
  const title = cfg.hero_title.split("|");
  const ig = cfg.contact_ig;

  // Hall of fame: the latest year
  const yr = results.reduce((m, r) => Math.max(m, Number(r.year) || 0), 0);
  const hof = results.filter((r) => Number(r.year) === yr);
  const cnt = subjCount(hof);
  const polas = (hide: boolean) => (
    <div className="marq-set" aria-hidden={hide || undefined}>
      {hof.map((r, i) => (
        <Link key={r.id} className={`pola s-${r.subject}`} href={`/results#rv-${r.id}`} tabIndex={hide ? -1 : undefined} style={{ ["--r" as any]: `${((i % 3) - 1) * 1.6}deg` }}>
          <StuPhoto r={r} />
          <b>{r.nickname}</b>
          <small>{r.subjectName}</small>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <section className="h2x">
        <div>
          {cfg.hero_eyebrow && <span className="kick">{cfg.hero_eyebrow}</span>}
          <h1>
            {title[0]}
            {title[1] && (<><br /><em>{title[1]}</em></>)}
          </h1>
          {cfg.hero_subtitle && <p className="lead">{cfg.hero_subtitle}</p>}
          <div className="cta">
            <JumpButton to="courses" offset={140} className="pill">เลือกคอร์สเลย</JumpButton>
            <a className="pill ghost" href={`https://www.instagram.com/${ig}`} target="_blank" rel="noopener">ปรึกษาแอดมินฟรี</a>
          </div>
        </div>
        <Featured courses={cs} />
      </section>

      {hof.length > 0 && (
        <section className="blk hof">
          <div className="hof-top">
            <div>
              <small className="k">Hall of fame · {yr}</small>
              <h2>น้องๆ INeedBio ติดค่าย 1 สอวน.</h2>
              <div className="hof-sub">
                {Object.entries(cnt).map(([k, v]) => (
                  <span key={k} className={`s-${k}`}><i />{v.name} <b>{v.n}</b></span>
                ))}
              </div>
            </div>
            <div className="hof-num"><b>{hof.length}</b><span>คน</span></div>
          </div>
          <div className="marq" style={{ ["--dur" as any]: `${Math.max(20, hof.length * 3.2)}s` }}>
            <div className="marq-track">{polas(false)}{polas(true)}</div>
          </div>
          <div className="rowx" style={{ marginTop: 16 }}>
            <Link className="pill ghost" href="/results">อ่านรีวิวจากน้องๆ ทั้งหมด →</Link>
          </div>
        </section>
      )}

      <Catalog courses={cs} mine={mine} />

      <section className="blk">
        <div className="sec-h"><div><small>Why INeedBio</small><h2>เรียนกับเราได้อะไร</h2></div></div>
        <div className="why">
          <div><b className="n">∞</b><h3>ดูได้ตลอดชีพ</h3><p>ซื้อครั้งเดียว ไม่มีวันหมดอายุ ไม่มีการลบคลิป ย้อนดูก่อนสอบกี่รอบก็ได้</p></div>
          <div><b className="n">PDF</b><h3>ชีทประกอบทุกบท</h3><p>เปิดชีทข้างคลิปได้เลย จดตามพี่ได้ทันที ไม่ต้องหาไฟล์เอง</p></div>
          <div><b className="n">%</b><h3>รู้ว่าเรียนถึงไหน</h3><p>ติ๊กตอนที่ดูจบ ระบบนับให้ว่าเหลืออีกกี่ตอน วางแผนอ่านก่อนสอบได้ง่าย</p></div>
        </div>
      </section>
      <section className="blk">
        <div className="sec-h"><div><small>Contact</small><h2>มีคำถาม ทักพี่ได้เลย</h2></div></div>
        <div className="chan">
          <a className="ig" href={`https://www.instagram.com/${ig}`} target="_blank" rel="noopener">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
            <span><b>Instagram</b><span>@{ig} · ช่องทางหลัก สอบถาม/ส่งสลิป</span></span>
          </a>
          {cfg.contact_phone && (
            <a className="tel">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" /></svg>
              <span><b>{cfg.contact_phone}</b><span>เฉพาะเรื่องด่วน 10:00–18:00</span></span>
            </a>
          )}
        </div>
      </section>
    </>
  );
}

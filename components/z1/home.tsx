"use client";

/* Home-page interactive parts, ported from viewHome()/startFeat() on the Apps Script site. */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { EnrollState, ZCourse } from "@/lib/catalog";
import { LV_CAP, LEVELS, zbaht } from "@/lib/z1";
import { Cover, Tile } from "./blocks";

function featPrice(c: ZCourse) {
  return (
    <>
      {c.fullPrice > c.price && <><s>{zbaht(c.fullPrice)}</s> </>}
      {zbaht(c.price)} · {c.lessonCount} ตอน
    </>
  );
}

/** Rotating featured-course card in the hero (first 5 courses, every 4.5 s, pauses on hover). */
export function Featured({ courses }: { courses: ZCourse[] }) {
  const list = courses.slice(0, 5);
  const [i, setI] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const run = () => {
    clearInterval(timer.current);
    if (list.length > 1) timer.current = setInterval(() => setI((x) => (x + 1) % list.length), 4500);
  };
  useEffect(() => {
    run();
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);
  if (!list.length) return <div className="feat sk" />;
  const c = list[i];
  return (
    <Link className="feat" id="feat" href={`/courses/${c.slug}`} onMouseEnter={() => clearInterval(timer.current)} onMouseLeave={run}>
      {list.map((x, k) => (
        <span key={x.id} className={`slide s-${x.subject}${k === i ? " on" : ""}`}>
          <Cover c={x} />
        </span>
      ))}
      <span className="info">
        <span><b>{c.title}</b><span>{featPrice(c)}</span></span>
        <span className="pill s">ดูคอร์ส</span>
      </span>
      {list.length > 1 && (
        <span className="dots2">
          {list.map((x, k) => (
            <i key={x.id} className={k === i ? "on" : ""} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setI(k); }} />
          ))}
        </span>
      )}
    </Link>
  );
}

/** "เรียนเพื่ออะไร?" paths plus the course section with subject chips, search results and filters. */
export function Catalog({ courses, mine }: { courses: ZCourse[]; mine: Record<string, EnrollState> }) {
  const [lv, setLv] = useState("");
  const [fsub, setFsub] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") ?? "");
    setFsub(p.get("subject") ?? "");
  }, []);
  const subjects = Array.from(new Map(courses.map((c) => [c.subjectSlug, { slug: c.subjectSlug, name: c.subjectName, key: c.subject }])).values());
  const levels = LEVELS.filter((l) => courses.some((c) => c.level === l));
  const scrollToCourses = () => {
    const el = document.getElementById("courses");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };
  const clear = (k: "lv" | "fsub" | "q" | "all") => {
    if (k === "lv" || k === "all") setLv("");
    if (k === "fsub" || k === "all") setFsub("");
    if (k === "q" || k === "all") {
      setQ("");
      window.history.replaceState(null, "", "/#courses");
    }
  };
  const ql = q.trim().toLowerCase();
  const filtered = lv || fsub || ql;
  const list = courses.filter(
    (c) => (!lv || c.level === lv) && (!fsub || c.subjectSlug === fsub) && (!ql || [c.title, c.subtitle, c.subjectName, c.level].join(" ").toLowerCase().includes(ql))
  );
  const big = subjects.some((s) => courses.filter((c) => c.subjectSlug === s.slug).length >= 4);
  const subjName = subjects.find((s) => s.slug === fsub)?.name ?? fsub;

  return (
    <>
      {levels.length > 0 && (
        <section className="blk">
          <div className="sec-h"><div><small>Choose your path</small><h2>เรียนเพื่ออะไร?</h2></div></div>
          <div className="paths">
            {levels.map((l) => (
              <button key={l} className="path" aria-pressed={lv === l} onClick={() => { setLv(lv === l ? "" : l); scrollToCourses(); }}>
                <b>{l}</b>
                <span>{LV_CAP[l] || ""}</span>
                <em>{courses.filter((c) => c.level === l).length} คอร์ส →</em>
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="blk" id="courses">
        {filtered ? (
          <>
            <div className="results-h">
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>{list.length} คอร์ส</h2>
              {lv && <button className="x2" onClick={() => clear("lv")}>{lv} ✕</button>}
              {fsub && <button className="x2" onClick={() => clear("fsub")}>{subjName} ✕</button>}
              {ql && <button className="x2" onClick={() => clear("q")}>“{q}” ✕</button>}
            </div>
            {list.length ? (
              <div className="grid">{list.map((c) => <Tile key={c.id} c={c} state={mine[c.id]} />)}</div>
            ) : (
              <div className="empty"><p>ไม่เจอคอร์สที่ตรงกับที่ค้นหา</p><button className="pill ghost" onClick={() => clear("all")}>ดูคอร์สทั้งหมด</button></div>
            )}
          </>
        ) : !courses.length ? (
          <div className="empty"><p>ยังไม่มีคอร์สที่เปิดขาย</p></div>
        ) : big ? (
          subjects.map((s) => {
            const row = courses.filter((c) => c.subjectSlug === s.slug);
            return (
              <div key={s.slug} style={{ marginBottom: 30 }}>
                <div className="sec-h">
                  <div><h2>{s.name}</h2></div>
                  <button onClick={() => { setFsub(s.slug); scrollToCourses(); }}>ดูทั้งหมด ({row.length}) →</button>
                </div>
                <div className="hs">{row.map((c) => <Tile key={c.id} c={c} state={mine[c.id]} />)}</div>
              </div>
            );
          })
        ) : (
          <>
            <div className="sec-h"><div><small>All courses</small><h2>คอร์สทั้งหมด</h2></div></div>
            <div className="subj-chips">
              {subjects.map((s) => (
                <button key={s.slug} className={`chip s-${s.key}`} onClick={() => { setFsub(s.slug); setLv(""); }}>
                  <i />{s.name}
                </button>
              ))}
            </div>
            <div className="grid">{courses.map((c) => <Tile key={c.id} c={c} state={mine[c.id]} />)}</div>
          </>
        )}
      </section>
    </>
  );
}

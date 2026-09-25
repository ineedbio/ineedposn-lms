import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { myStates } from "@/lib/catalog";
import { generatePromptPayQR } from "@/lib/promptpay";
import { subjectKey } from "@/lib/site";
import { hm, zbaht } from "@/lib/z1";
import { getResults } from "@/components/z1/server";
import { ReviewCard } from "@/components/z1/blocks";
import { AuthLink, JumpButton, NoticeButton, PayBox, PreviewButton, SubjectAccent, SylAll, YouTube } from "@/components/z1/client";

export const dynamic = "force-dynamic";

// Port of viewCourse() from the Apps Script site.
export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: { subject: true, lessons: { orderBy: { order: "asc" } } },
  });
  if (!course || !course.isPublished) notFound();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const [cfg, states, results, lastPay] = await Promise.all([
    getSettings(),
    myStates(userId),
    getResults(),
    userId ? prisma.payment.findFirst({ where: { userId, courseId: course.id }, orderBy: { createdAt: "desc" } }) : null,
  ]);
  const st = states[course.id];
  const subject = subjectKey(course.subject);
  const enrollOpen = cfg.enroll_open === "1";
  const closedMsg = cfg.enroll_closed_message;

  // chapters (lessons without a chapter go under one default heading)
  const chapters: { title: string; lessons: typeof course.lessons }[] = [];
  for (const l of course.lessons) {
    const t = l.chapter || "เนื้อหาในคอร์ส";
    const ch = chapters.find((c) => c.title === t) ?? chapters[chapters.push({ title: t, lessons: [] }) - 1];
    ch.lessons.push(l);
  }
  const min = (l: { duration: number | null }) => Math.round((l.duration ?? 0) / 60);
  const total = course.lessons.length;
  const totalMin = course.lessons.reduce((a, l) => a + min(l), 0);
  const ytId = (u: string | null) => u?.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/)?.[1] ?? "";
  const previews = course.lessons.filter((l) => l.isPreview && ytId(l.youtubeUrl));
  const lines = (t: string | null) => (t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const highlights = lines(course.highlights);
  const audience = lines(course.audience);
  const bio = lines(course.instructorBio);
  const reviews = results.filter((r) => r.subject === subject && r.review).slice(0, 4);
  const faq = (course.faq ?? "")
    .split(/\n\s*\n/)
    .map((b) => b.trim().split("\n"))
    .filter((b) => b[0]?.trim())
    .map(([q, ...a]) => ({ q: q.replace(/^ถาม:\s*/, "").trim(), a: a.join("\n").replace(/^ตอบ:\s*/, "").trim() }))
    .concat([
      { q: "ซื้อแล้วดูได้นานแค่ไหน", a: "ดูได้ตลอด ไม่มีวันหมดอายุ เปิดดูซ้ำได้ทุกตอนไม่จำกัดจำนวนครั้ง" },
      { q: "ดูได้กี่เครื่อง", a: "บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ถ้าเข้าสู่ระบบจากเครื่องใหม่ เครื่องเดิมจะออกจากระบบเอง สลับเครื่องได้ตลอด" },
      { q: "โอนเงินแล้วเข้าเรียนได้เมื่อไร", a: "หลังแอดมินตรวจสลิป ปกติภายใน 24 ชั่วโมง ระบบจะส่งอีเมลแจ้งเมื่ออนุมัติ แล้วเข้าเรียนได้ที่เมนู “คอร์สของฉัน”" },
      { q: "มีคำถามเพิ่มเติม ติดต่อใคร", a: `ทัก IG @${cfg.contact_ig} ได้เลย` },
    ]);
  const jumps: [string, string][] = [["overview", "ภาพรวม"], ["syllabus", "เนื้อหา"]];
  if (course.instructorName) jumps.push(["instructor", "ผู้สอน"]);
  if (reviews.length) jumps.push(["reviews", "รีวิว"]);
  jumps.push(["faq", "คำถามที่พบบ่อย"]);

  const learnHref = `/learn/${course.id}`;
  let box: React.ReactNode;
  let cta: React.ReactNode;
  if (!userId) {
    box = enrollOpen ? (
      <>
        <p className="ink2 sm">สมัครสมาชิกหรือเข้าสู่ระบบก่อน แล้วจึงซื้อคอร์สได้</p>
        <AuthLink mode="signup" className="pill block">สมัครสมาชิกเพื่อซื้อคอร์ส</AuthLink>
        <AuthLink mode="login" className="pill ghost block">มีบัญชีแล้ว เข้าสู่ระบบ</AuthLink>
      </>
    ) : (
      <>
        <NoticeButton className="pill block" title="ยังไม่เปิดรับสมัคร" msg={closedMsg}>สมัครเรียนคอร์สนี้</NoticeButton>
        <AuthLink mode="login" className="pill ghost block">มีบัญชีแล้ว เข้าสู่ระบบ</AuthLink>
      </>
    );
    cta = enrollOpen ? <AuthLink mode="signup" className="pill">สมัครเพื่อซื้อ</AuthLink> : <NoticeButton className="pill" title="ยังไม่เปิดรับสมัคร" msg={closedMsg}>สมัครเรียน</NoticeButton>;
  } else if (st === "approved") {
    box = (
      <>
        <div className="note ok">คุณมีสิทธิ์เข้าเรียนคอร์สนี้แล้ว</div>
        <Link className="pill block" href={learnHref}>เข้าห้องเรียน</Link>
      </>
    );
    cta = <Link className="pill" href={learnHref}>เข้าห้องเรียน</Link>;
  } else if (st === "pending") {
    box = <div className="note wait">ส่งสลิปแล้ว แอดมินกำลังตรวจ ปกติไม่เกิน 24 ชั่วโมง ระบบจะส่งอีเมลแจ้งเมื่ออนุมัติ</div>;
    cta = <span className="badge b-wait">รอตรวจสลิป</span>;
  } else if (!enrollOpen) {
    box = <NoticeButton className="pill block" title="ยังไม่เปิดรับสมัคร" msg={closedMsg}>ลงทะเบียนเรียน</NoticeButton>;
    cta = <NoticeButton className="pill" title="ยังไม่เปิดรับสมัคร" msg={closedMsg}>ซื้อคอร์ส</NoticeButton>;
  } else {
    const qr = course.paymentQrUrl || (cfg.promptpay_id ? await generatePromptPayQR(cfg.promptpay_id, course.price) : null);
    box = (
      <>
        {st === "rejected" && <div className="note no">สลิปครั้งก่อนไม่ผ่าน{lastPay?.rejectReason ? `: ${lastPay.rejectReason}` : ""} ส่งสลิปใหม่ได้ด้านล่าง</div>}
        <PayBox courseId={course.id} price={course.price} qr={qr} ppId={cfg.promptpay_id} ppName={cfg.promptpay_name} />
      </>
    );
    cta = <JumpButton to="sec-buy" className="pill">ซื้อคอร์ส</JumpButton>;
  }

  const CK = (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path d="M5.5 10.3l3 3 6-6.3" fill="none" stroke="rgb(var(--on-acc))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <>
      <SubjectAccent subject={subject} />
      <div style={{ paddingTop: 24 }}><Link className="back" href="/">← คอร์สทั้งหมด</Link></div>
      <div className="cd">
        <div>
          <section className="chero" id="sec-overview">
            <span className="mono sj">{course.subject.name}</span>
            <h1>{course.title}</h1>
            {course.subtitle && <p className="ink2 lead">{course.subtitle}</p>}
            <div className="facts">
              <span><b>{total}</b> ตอน</span>
              <span><b>{hm(totalMin)}</b> วิดีโอ</span>
              <span><b>ดูได้ตลอด</b> ไม่มีวันหมดอายุ</span>
            </div>
            {course.trailerYoutube ? (
              <div className="player trailer"><YouTube id={course.trailerYoutube} /></div>
            ) : course.coverImage ? (
              <div className="cover trailer" style={{ borderRadius: 16, aspectRatio: "16/8" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={course.coverImage} alt="" style={{ objectFit: "contain" }} />
              </div>
            ) : null}
            {!course.trailerYoutube && previews.length > 0 && (
              <PreviewButton className="pill ghost s" style={{ justifySelf: "start" }} id={ytId(previews[0].youtubeUrl)} title={previews[0].title}>▶ ดูตอนตัวอย่างฟรี</PreviewButton>
            )}
          </section>
          <nav className="jump" aria-label="ส่วนของหน้า">
            {jumps.map(([k, label]) => <JumpButton key={k} to={`sec-${k}`}>{label}</JumpButton>)}
          </nav>
          {highlights.length > 0 && (
            <section className="sec">
              <h2>จุดเด่นของคอร์ส</h2>
              <div className="hl">{highlights.map((h) => <div key={h}><span className="ic">{CK}</span><span>{h}</span></div>)}</div>
            </section>
          )}
          {audience.length > 0 && (
            <section className="sec">
              <h2>คอร์สนี้เหมาะกับ</h2>
              <ul className="aud">{audience.map((a) => <li key={a}>{a}</li>)}</ul>
            </section>
          )}
          {course.description && (
            <section className="sec">
              <h2>รายละเอียดคอร์ส</h2>
              <p className="desc">{course.description}</p>
            </section>
          )}
          <section className="sec" id="sec-syllabus">
            <div className="spread"><h2>เนื้อหาในคอร์ส</h2><SylAll /></div>
            <p className="sm ink2">
              {chapters.length} บท · {total} ตอน · {hm(totalMin)}{previews.length ? ` · ดูฟรีได้ ${previews.length} ตอน` : ""}
            </p>
            <div className="syl">
              {chapters.map((ch, i) => (
                <details key={ch.title} open={i === 0}>
                  <summary>
                    <span>{ch.title}</span>
                    <span className="n">{ch.lessons.length} ตอน · {hm(ch.lessons.reduce((a, l) => a + min(l), 0))}</span>
                  </summary>
                  <ul>
                    {ch.lessons.map((l) => (
                      <li key={l.id}>
                        <span>
                          {l.title}
                          {l.isPreview && ytId(l.youtubeUrl) && (
                            <> <PreviewButton className="pill s ghost" style={{ marginLeft: 6 }} id={ytId(l.youtubeUrl)} title={l.title}>ดูฟรี</PreviewButton></>
                          )}
                        </span>
                        <span className="d">{min(l)} นาที</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
          {course.instructorName && (
            <section className="sec" id="sec-instructor">
              <h2>ผู้สอน</h2>
              <div className="inst">
                <div className="ph">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {course.instructorPhoto && <img src={course.instructorPhoto} alt="" />}
                  <span>{course.instructorName.replace(/^พี่\s*/, "").slice(0, 1)}</span>
                </div>
                <div className="stack" style={{ gap: 4, flex: 1, minWidth: 220 }}>
                  <h3 style={{ fontSize: 20 }}>{course.instructorName}</h3>
                  {course.instructorTitle && <span className="sm acc">{course.instructorTitle}</span>}
                  {bio.length > 1 ? (
                    <ul className="bl">{bio.map((b) => <li key={b}>{b.replace(/^[-•*]\s*/, "")}</li>)}</ul>
                  ) : bio.length === 1 ? (
                    <p className="ink2 desc" style={{ marginTop: 6 }}>{bio[0]}</p>
                  ) : null}
                </div>
              </div>
            </section>
          )}
          {reviews.length > 0 && (
            <section className="sec" id="sec-reviews">
              <div className="spread"><h2>เสียงจากน้องที่ติดค่าย</h2><Link className="link" href="/results">ดูทั้งหมด</Link></div>
              <div className="rvs two">{reviews.map((r) => <ReviewCard key={r.id} r={r} />)}</div>
            </section>
          )}
          <section className="sec" id="sec-faq">
            <h2>คำถามที่พบบ่อย</h2>
            <div className="syl faq">
              {faq.map((f) => (
                <details key={f.q}>
                  <summary><span className="t">{f.q}</span><span className="n">+</span></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
        <aside className="buy" id="sec-buy">
          <span className="mono">ราคาคอร์ส</span>
          <span className="price">
            {course.fullPrice && course.fullPrice > course.price && <span className="was">{zbaht(course.fullPrice)}</span>}
            {zbaht(course.price)}
          </span>
          <ul className="incl">
            <li>{CK}คลิปเรียน {total} ตอน ({hm(totalMin)})</li>
            <li>{CK}ชีทประกอบในห้องเรียน</li>
            <li>{CK}ดูได้ตลอด ไม่มีวันหมดอายุ</li>
            <li>{CK}เรียนได้ทั้งมือถือและคอม</li>
          </ul>
          {box}
        </aside>
      </div>
      <div className="mbar">
        <div><span className="sm ink2">{course.title}</span><b className="price">{zbaht(course.price)}</b></div>
        {cta}
      </div>
    </>
  );
}

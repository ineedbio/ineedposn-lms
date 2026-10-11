// Cells (study streaks), course reviews, free-episode feedback and grade reports — a port of the
// "เซลล์แบ่งตัว" section of backend/Code.gs (reference/Code.gs), same actions, shapes and messages.
// Only real video time counts: the player sends study.ping once a minute while a clip plays; a day with
// 15+ minutes = 1 study day (+1 cell). A student's cells = sum of CellLedger. Days are Thai-time dates.
// Code.gs keeps the ping anti-cheat state in CacheService; here it lives on the Streak row (pingAt, pos*),
// because serverless functions share no memory.
import type { Prisma, User } from "@prisma/client";
import { prisma } from "../prisma";
import { rateLimit } from "../rate-limit";
import { auth, checkPhoto, courseBySlug, enrollState, getSetting, log, photoOut, savePhoto, type Ctx, type Data } from "./api";
import { couponUses } from "./shop";
import { subjectKey } from "./subjects";
import { clip, err, iso } from "./util";

export const CELLS = {
  MIN_PER_DAY: 15, PING_GAP_MS: 50000, MIN_ADVANCE: 30, POS_TTL_MS: 1800e3, REVIEW: 5, GRADES: 5, GRADES_PROOF: 5, COST: 100, VALUE: 100,
  CODE_DAYS: 60, REDEEM_GAP_DAYS: 30, FREEZE_EVERY: 7, FREEZE_MAX: 2,
  BONUS: { 7: 5, 15: 10, 30: 30, 60: 50, 100: 100, 200: 150, 365: 365 } as Record<number, number>,
  THEMES: [["base", 0], ["petri", 15], ["scope", 30], ["reef", 60], ["forest", 100], ["nebula", 200], ["gold", 365]] as [string, number][],
  // Time-limited events: `need` study days (15+ minutes) between from–to = a limited skin, kept for good (counted from StudyDay).
  // Halloween 2569 has no skin event (the owner took it out on 4 Oct) · shape: { key, name, skin, from: "YYYY-MM-DD", to, need }
  EVENTS: [] as { key: string; name: string; skin: string; from: string; to: string; need: number }[],
};

// "Today" in Thai time. The test server (IB_TEST_HOOKS=1, never set in production) can move the clock by days
// through the test_day_shift_ms setting, like DAY_SHIFT_MS in Code.gs.
async function dayShift() {
  if (process.env.IB_TEST_HOOKS !== "1" || process.env.NODE_ENV === "production") return 0;
  return Number(await getSetting("test_day_shift_ms")) || 0;
}
type CellEvent = (typeof CELLS.EVENTS)[number];
/** The skin events. The test server (IB_TEST_HOOKS=1) may add some through the test_events setting, like the
 *  reference tests pushing into CELLS.EVENTS; production only ever uses CELLS.EVENTS. */
async function cellEvents(): Promise<CellEvent[]> {
  if (process.env.IB_TEST_HOOKS !== "1" || process.env.NODE_ENV === "production") return CELLS.EVENTS;
  try { const x = JSON.parse((await getSetting("test_events")) || "[]"); return CELLS.EVENTS.concat(Array.isArray(x) ? x : []); } catch { return CELLS.EVENTS; }
}
const thDay = (ms: number) => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const today = async () => thDay(Date.now() + (await dayShift()));
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
const addDays = (day: string, n: number) => new Date(Date.parse(day + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
function thDateTxt(d: Date) {
  const M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const t = new Date(d.getTime() + 7 * 36e5);
  return t.getUTCDate() + " " + M[t.getUTCMonth()] + " " + (t.getUTCFullYear() + 543) + " " + String(t.getUTCHours()).padStart(2, "0") + ":" + String(t.getUTCMinutes()).padStart(2, "0") + " น.";
}
const cellsOn = async () => String(await getSetting("cells_enabled")) === "1";

type Tx = Prisma.TransactionClient;
const ensureStreak = (db: Tx | typeof prisma, userId: string) => db.streak.upsert({ where: { userId }, create: { userId }, update: {} });
/** Lock this student's streak row for the rest of the transaction (Code.gs: withLock_). */
async function lockStreak(tx: Tx, userId: string) {
  await ensureStreak(tx, userId);
  await tx.$queryRaw`SELECT 1 FROM "Streak" WHERE "userId" = ${userId} FOR UPDATE`;
  return (await tx.streak.findUnique({ where: { userId } }))!;
}
async function ledgerSum(db: Tx | typeof prisma, userId: string) {
  return (await db.cellLedger.aggregate({ where: { userId }, _sum: { delta: true } }))._sum.delta || 0;
}
const ledgerAdd = (db: Tx | typeof prisma, userId: string, delta: number, reason: string, day = "", ref = "") =>
  db.cellLedger.create({ data: { userId, delta, reason, day, ref } });
async function eventDays(userId: string, ev: CellEvent) {
  return prisma.studyDay.count({ where: { userId, credited: true, day: { gte: ev.from, lte: ev.to } } });
}
async function themesFor(best: number, userId?: string) {
  const t = CELLS.THEMES.filter((x) => best >= x[1]).map((x) => x[0]);
  if (userId) for (const ev of await cellEvents()) if ((await eventDays(userId, ev)) >= ev.need) t.push(ev.skin);
  return t;
}

/** A study day was just completed: continue the streak (freeze cards cover short gaps) and add the cells. */
async function creditDay(userId: string, day: string) {
  return prisma.$transaction(async (tx) => {
    const st = await lockStreak(tx, userId);
    const last = st.lastDay;
    let streak = st.streak, best = st.best, fr = st.freezes, used = 0;
    if (last === day) return null;
    const gap = last ? dayDiff(last, day) : 0;
    if (last && gap <= 0) return null;
    if (gap === 1) streak++;
    else if (gap > 1 && gap - 1 <= fr) { used = gap - 1; fr -= used; streak++; }
    else streak = 1;
    const oldBest = best;
    best = Math.max(best, streak);
    const gained: { reason: string; delta: number }[] = [];
    await ledgerAdd(tx, userId, 1, "study", day); gained.push({ reason: "study", delta: 1 });
    const b = CELLS.BONUS[streak];
    if (b) { await ledgerAdd(tx, userId, b, "bonus-" + streak, day); gained.push({ reason: "bonus-" + streak, delta: b }); }
    if (streak % CELLS.FREEZE_EVERY === 0 && fr < CELLS.FREEZE_MAX) fr++;
    const unlocked = CELLS.THEMES.filter((t) => t[1] > 0 && oldBest < t[1] && best >= t[1]).map((t) => t[0]);
    await tx.streak.update({ where: { userId }, data: { streak, best, lastDay: day, freezes: fr, points: await ledgerSum(tx, userId) } });
    return { streak, used_freezes: used, gained, unlocked };
  });
}

export async function studyPing(d: Data, { p }: Ctx) {
  const u = await auth(p);
  if (!(await cellsOn())) return { off: true };
  const l = await prisma.lesson.findUnique({ where: { id: String(d.lesson_id || "") } });
  if (!l) throw err("NOT_FOUND", "ไม่พบบทเรียน");
  // A free preview episode counts too (logged in = email confirmed at sign-up); any other lesson needs access.
  const freeOk = !!d.preview && l.isPreview && !l.hidden;
  if (!freeOk && (await enrollState(u.id, l.courseId))?.status !== "approved") throw err("NO_ACCESS", "ยังไม่ได้รับสิทธิ์");
  const now = Date.now();
  const st = await ensureStreak(prisma, u.id);
  if (st.pingAt && now - st.pingAt.getTime() < CELLS.PING_GAP_MS) return { ignored: true };
  // The video must really move on: 30+ seconds further than last time (paused, looping or left open doesn't count).
  const pos = Math.min(1e7, Math.max(0, Math.floor(Number(d.pos) || 0)));
  const prev = st.posAt && now - st.posAt.getTime() < CELLS.POS_TTL_MS && st.posLessonId === l.id ? st.pos : null;
  await prisma.streak.update({ where: { userId: u.id }, data: { posLessonId: l.id, pos, posAt: new Date(now) } });
  if (prev != null && pos - prev < CELLS.MIN_ADVANCE) return { ignored: true, reason: "not_advancing" };
  const claim = await prisma.streak.updateMany({
    where: { userId: u.id, OR: [{ pingAt: null }, { pingAt: { lte: new Date(now - CELLS.PING_GAP_MS) } }] }, data: { pingAt: new Date(now) },
  });
  if (!claim.count) return { ignored: true };
  const day = await today();
  const sd = await prisma.studyDay.upsert({
    where: { userId_day: { userId: u.id, day } }, create: { userId: u.id, day, minutes: 1 }, update: { minutes: { increment: 1 } },
  });
  let credited = null;
  if (sd.minutes >= CELLS.MIN_PER_DAY) {
    const flip = await prisma.studyDay.updateMany({ where: { userId: u.id, day, credited: false }, data: { credited: true } });
    if (flip.count) credited = await creditDay(u.id, day);
  }
  return { today_min: sd.minutes, need: CELLS.MIN_PER_DAY, credited };
}

export async function cellsStatus(_d: Data, { p }: Ctx) {
  const u = await auth(p);
  const day = await today();
  const st = (await prisma.streak.findUnique({ where: { userId: u.id } })) || { streak: 0, best: 0, lastDay: "", freezes: 0, theme: "base", lastRedeemAt: null as Date | null };
  let streak = st.streak;
  const fr = st.freezes, best = st.best;
  const gap = st.lastDay ? dayDiff(st.lastDay, day) : 0;
  if (!(st.lastDay && (gap <= 1 || gap - 1 <= fr))) streak = 0;
  const days = (await prisma.studyDay.findMany({ where: { userId: u.id, day: { gte: addDays(day, -34), lte: day } }, orderBy: { day: "asc" } }))
    .map((x) => ({ day: x.day, minutes: x.minutes, credited: x.credited }));
  const td = days.find((x) => x.day === day);
  const led = await prisma.cellLedger.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } });
  const points = led.reduce((a, x) => a + x.delta, 0);
  const nextAt = st.lastRedeemAt ? new Date(st.lastRedeemAt.getTime() + CELLS.REDEEM_GAP_DAYS * 864e5) : null;
  const codes = [];
  for (const c of await prisma.coupon.findMany({ where: { ownerId: u.id, code: { startsWith: "CELL" } }, orderBy: { createdAt: "asc" } }))
    codes.push({ code: c.code, value: c.value || 0, ends_at: iso(c.endsAt), used: (await couponUses(c.code)) > 0 });
  const themes = await themesFor(best, u.id);
  const events = [];
  for (const ev of await cellEvents()) {
    const n = await eventDays(u.id, ev);
    events.push({ key: ev.key, name: ev.name, skin: ev.skin, from: ev.from, to: ev.to, need: ev.need, days: Math.min(n, ev.need), earned: n >= ev.need, active: day >= ev.from && day <= ev.to });
  }
  return {
    enabled: await cellsOn(), today: day, today_min: td ? td.minutes : 0, today_done: !!td?.credited, need: CELLS.MIN_PER_DAY,
    streak, best, freezes: fr, points, theme: themes.includes(st.theme) ? st.theme : "base", themes, events,
    all_themes: CELLS.THEMES, bonus: CELLS.BONUS, cost: CELLS.COST, value: CELLS.VALUE,
    can_redeem: points >= CELLS.COST && (!nextAt || nextAt.getTime() <= Date.now()),
    next_redeem_at: nextAt && nextAt.getTime() > Date.now() ? nextAt.toISOString() : "", days, codes,
    ledger: led.slice(0, 30).map((x) => ({ delta: x.delta, reason: x.reason, day: x.day, ref: x.ref, created_at: iso(x.createdAt) })),
  };
}

export async function cellsRedeem(_d: Data, { p }: Ctx) {
  const u = await auth(p);
  if (!(await cellsOn())) throw err("OFF", "ระบบเซลล์ปิดอยู่");
  const day = await today();
  const code = await prisma.$transaction(async (tx) => {
    const st = await lockStreak(tx, u.id);
    const pts = await ledgerSum(tx, u.id);
    if (pts < CELLS.COST) throw err("BAD_INPUT", "เซลล์ยังไม่ครบ " + CELLS.COST + " (มี " + pts + ")");
    if (st.lastRedeemAt && st.lastRedeemAt.getTime() + CELLS.REDEEM_GAP_DAYS * 864e5 > Date.now())
      throw err("BAD_INPUT", "แลกได้เดือนละ 1 ครั้ง แลกครั้งถัดไปได้วันที่ " + thDateTxt(new Date(st.lastRedeemAt.getTime() + CELLS.REDEEM_GAP_DAYS * 864e5)));
    let c = "";
    do c = "CELL" + Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "X");
    while (await tx.coupon.findUnique({ where: { code: c } }));
    await tx.coupon.create({
      data: {
        code: c, kind: "fixed", value: CELLS.VALUE, scope: "all", targets: "", maxUses: 1, perUser: 1,
        endsAt: new Date(Date.now() + CELLS.CODE_DAYS * 864e5), status: "active", note: clip("แลกเซลล์ · " + (u.nickname || "") + " " + u.email, 500), ownerId: u.id,
      },
    });
    await ledgerAdd(tx, u.id, -CELLS.COST, "redeem", day, c);
    await tx.streak.update({ where: { userId: u.id }, data: { points: await ledgerSum(tx, u.id), lastRedeemAt: new Date() } });
    return c;
  });
  return { code, value: CELLS.VALUE };
}

export async function cellsTheme(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const key = String(d.theme || "base");
  await prisma.$transaction(async (tx) => {
    const st = await lockStreak(tx, u.id);
    if (!(await themesFor(st.best, u.id)).includes(key)) throw err("BAD_INPUT", "ยังไม่ได้ปลดล็อกธีมนี้");
    await tx.streak.update({ where: { userId: u.id }, data: { theme: key } });
  });
  return { theme: key };
}

const fullName = (u: User) => (u.firstName || "") + " " + (u.lastName || "");
export async function adminCells(d: Data) {
  const day = await today();
  const userOf = async (ids: string[]) => new Map((await prisma.user.findMany({ where: { id: { in: ids } } })).map((u) => [u.id, u]));
  const nameOf = (users: Map<string, User>, id: string) => { const u = users.get(id); return u ? { name: fullName(u), nickname: u.nickname || "", email: u.email } : { name: id }; };
  if (d.user_id) {
    const id = String(d.user_id);
    const users = await userOf([id]);
    return {
      user: nameOf(users, id),
      ledger: (await prisma.cellLedger.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 200 }))
        .map((x) => ({ delta: x.delta, reason: x.reason, day: x.day, ref: x.ref, created_at: iso(x.createdAt) })),
      days: (await prisma.studyDay.findMany({ where: { userId: id }, orderBy: { day: "desc" }, take: 60 })).map((x) => ({ day: x.day, minutes: x.minutes, credited: x.credited })),
    };
  }
  const [streaks, sums] = await Promise.all([prisma.streak.findMany(), prisma.cellLedger.groupBy({ by: ["userId"], _sum: { delta: true } })]);
  const pts = new Map(sums.map((s) => [s.userId, s._sum.delta || 0]));
  const users = await userOf(streaks.map((s) => s.userId));
  const rows = streaks
    .map((s) => {
      const gap = s.lastDay ? dayDiff(s.lastDay, day) : 99, alive = gap <= 1 || gap - 1 <= s.freezes;
      return { ...nameOf(users, s.userId), user_id: s.userId, streak: alive ? s.streak : 0, best: s.best, points: pts.get(s.userId) || 0, last_day: s.lastDay, freezes: s.freezes };
    })
    .sort((a, b) => b.streak - a.streak || b.best - a.best);
  return {
    today: day, active_today: await prisma.studyDay.count({ where: { day, credited: true } }), rows: rows.slice(0, 300),
    redeemed: await prisma.cellLedger.count({ where: { reason: "redeem" } }),
  };
}

// ───── Course reviews + grade reports: an admin reads them first; approved = the cells are added ─────
export async function reviewSubmit(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const c = await courseBySlug(d.course_id);
  const rating = Math.round(Number(d.rating) || 0), text = clip(d.text, 1000);
  if (!c || (await enrollState(u.id, c.id))?.status !== "approved") throw err("NO_ACCESS", "รีวิวได้เฉพาะคอร์สที่เรียนอยู่");
  if (rating < 1 || rating > 5) throw err("BAD_INPUT", "ให้ดาว 1–5 ดวง");
  if (text.length < 20) throw err("BAD_INPUT", "เขียนรีวิวอย่างน้อย 20 ตัวอักษร");
  const r = await prisma.review.findUnique({ where: { userId_courseId: { userId: u.id, courseId: c.id } } });
  if (r && r.status !== "pending") throw err("ALREADY", "รีวิวคอร์สนี้ไปแล้ว ขอบคุณมาก");
  if (r) await prisma.review.update({ where: { id: r.id }, data: { rating, text, createdAt: new Date() } });
  else await prisma.review.create({ data: { userId: u.id, courseId: c.id, rating, text } });
  return { cells: CELLS.REVIEW };
}

export async function gradesSubmit(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const year = String(d.year || "").replace(/\D/g, ""), term = String(d.term || "");
  if (!/^25\d\d$/.test(year)) throw err("BAD_INPUT", "ใส่ปีการศึกษา เช่น 2569");
  if (!["1", "2", "summer"].includes(term)) throw err("BAD_INPUT", "เลือกภาคเรียน");
  const grades = (Array.isArray(d.grades) ? d.grades : []).slice(0, 12)
    .map((g: Data) => ({ subject: clip(g?.subject, 40), grade: clip(g?.grade, 5) }))
    .filter((g: { subject: string; grade: string }) => g.subject && /^(4|3\.5|3|2\.5|2|1\.5|1|0)$/.test(g.grade));
  if (!grades.length) throw err("BAD_INPUT", "ใส่เกรดอย่างน้อย 1 วิชา");
  const gpa = d.gpa === "" || d.gpa == null ? "" : Number(d.gpa);
  if (gpa !== "" && !(gpa >= 0 && gpa <= 4)) throw err("BAD_INPUT", "GPA ต้องอยู่ระหว่าง 0.00–4.00");
  const hasProof = checkPhoto(d.proof, false);
  const r = await prisma.gradeReport.findUnique({ where: { userId_year_term: { userId: u.id, year, term } } });
  if (r && r.status !== "pending") throw err("ALREADY", "ส่งผลการเรียนเทอมนี้ไปแล้ว ขอบคุณมาก");
  const row = {
    gradeLevel: u.gradeLevel || "", grades, gpa: gpa === "" ? "" : gpa.toFixed(2), exam: clip(d.exam, 200), message: clip(d.message, 1000),
    consentPublish: !!d.consent_publish, createdAt: new Date(), ...(hasProof ? { proofBlobId: await savePhoto(d.proof) } : {}),
  };
  if (r) await prisma.gradeReport.update({ where: { id: r.id }, data: row });
  else await prisma.gradeReport.create({ data: { ...row, userId: u.id, year, term } });
  return { cells: CELLS.GRADES + (hasProof ? CELLS.GRADES_PROOF : 0) };
}

/** The student only learns that it was sent (not whether it was approved). */
export async function mySubmissions(_d: Data, { p }: Ctx) {
  const u = await auth(p);
  const [revs, grades] = await Promise.all([prisma.review.findMany({ where: { userId: u.id } }), prisma.gradeReport.findMany({ where: { userId: u.id } })]);
  const slugs = new Map((await prisma.course.findMany({ where: { id: { in: revs.map((r) => r.courseId) } }, select: { id: true, slug: true } })).map((c) => [c.id, c.slug]));
  return {
    reviews: revs.map((r) => slugs.get(r.courseId) || r.courseId), grades: grades.map((g) => g.year + "/" + g.term),
    cells: { review: CELLS.REVIEW, grades: CELLS.GRADES, proof: CELLS.GRADES_PROOF },
  };
}

/** A review a student wrote (not one an admin put in) · null source = the student's own (rows from before round 7m). */
const studentReview = { OR: [{ source: null }, { source: { not: "admin" } }] } satisfies Prisma.ReviewWhereInput;
export async function adminFeedback(d: Data) {
  const done = d.status === "done";
  const pick = done ? { status: { not: "pending" } } : { status: "pending" };
  const order = { createdAt: done ? "desc" : "asc" } as const;
  // The queue and its counter are the students' reviews only; the ones an admin put in are listed apart (added).
  const [revs, added, grades, nRev, nGrades, courses] = await Promise.all([
    prisma.review.findMany({ where: { ...pick, ...studentReview }, orderBy: order, take: 200 }),
    prisma.review.findMany({ where: { source: "admin" }, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.gradeReport.findMany({ where: pick, orderBy: order, take: 200 }),
    prisma.review.count({ where: { status: "pending", ...studentReview } }),
    prisma.gradeReport.count({ where: { status: "pending" } }),
    prisma.course.findMany({ include: { subject: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const uids = [...revs.map((x) => x.userId), ...grades.map((x) => x.userId)].filter((x): x is string => !!x);
  const users = new Map((await prisma.user.findMany({ where: { id: { in: uids } } })).map((u) => [u.id, u]));
  const cById = new Map(courses.map((c) => [c.id, c]));
  const who = (id: string | null) => {
    const u = id ? users.get(id) : undefined;
    return u ? { user_id: u.id, name: fullName(u), nickname: u.nickname || "", school: u.school || "", grade: u.gradeLevel || "", email: u.email } : { name: id || "" };
  };
  return {
    reviews: revs.map((x) => ({
      id: x.id, user: x.source === "admin" ? { name: x.displayName || "นักเรียน", nickname: x.displayName || "", school: x.displayGrade || "" } : who(x.userId),
      course: cById.get(x.courseId)?.title || x.courseId, course_id: cById.get(x.courseId)?.slug || x.courseId, rating: x.rating, text: x.text, status: x.status, created_at: iso(x.createdAt),
      source: x.source || "student", display_name: x.displayName || "", display_grade: x.displayGrade || "", note: x.source === "admin" ? x.note || "" : "",
    })),
    added: added.map((x) => ({
      id: x.id, course_id: cById.get(x.courseId)?.slug || x.courseId, course: cById.get(x.courseId)?.title || x.courseId, rating: x.rating, text: x.text, status: x.status,
      display_name: x.displayName || "", display_grade: x.displayGrade || "", note: x.note || "", created_at: iso(x.createdAt),
    })),
    courses: courses.map((c) => ({ course_id: c.slug, title: c.title, subject: subjectKey(c.subject), status: c.isPublished ? "published" : "draft" })),
    grades: grades.map((x) => ({
      id: x.id, user: who(x.userId), year: x.year, term: x.term, grade_level: x.gradeLevel, grades: x.grades, gpa: x.gpa, exam: x.exam, message: x.message,
      has_proof: !!x.proofBlobId, consent_publish: x.consentPublish, status: x.status, created_at: iso(x.createdAt),
    })),
    counts: { reviews: nRev, grades: nGrades },
    trial: await trialAdmin(),
  };
}

export async function adminFeedbackDecide(d: Data, _c: Ctx, admin: User) {
  const isReview = d.kind !== "grades", ok = d.decision === "approve", id = String(d.id || "");
  const r = isReview ? await prisma.review.findUnique({ where: { id } }) : await prisma.gradeReport.findUnique({ where: { id } });
  if (!r) throw err("NOT_FOUND", "ไม่พบรายการ");
  // An admin's own review (source "admin") has no account: never any cells.
  const uid = "source" in r && r.source === "admin" ? null : r.userId;
  await prisma.$transaction(async (tx) => {
    if (uid) await lockStreak(tx, uid);
    const data = { status: ok ? "approved" : "hidden", decidedBy: admin.id, decidedAt: new Date() };
    const where = { id, OR: [{ status: "pending" }, ...(ok ? [{ status: "hidden" }] : [])] };
    const n = isReview ? await tx.review.updateMany({ where, data }) : await tx.gradeReport.updateMany({ where, data });
    if (!n.count) throw err("ALREADY", "ตรวจรายการนี้ไปแล้ว");
    if (ok && uid) {
      const reason = isReview ? "review" : "grades";
      const cells = isReview ? CELLS.REVIEW : CELLS.GRADES + ("proofBlobId" in r && r.proofBlobId ? CELLS.GRADES_PROOF : 0);
      if (!(await tx.cellLedger.findFirst({ where: { userId: uid, reason, ref: id } }))) {
        await ledgerAdd(tx, uid, cells, reason, await today(), id);
        await tx.streak.update({ where: { userId: uid }, data: { points: await ledgerSum(tx, uid) } });
      }
    }
  });
  await log(admin, (isReview ? "review." : "grades.") + (ok ? "approve" : "hide"), id);
  return true;
}

/** An admin puts in a review a student sent another way (LINE, IG…): shown under the course at once, under the name
 *  typed in, tied to no account, no cells. d: { review_id? (edit), course_ids[] (new: one row per course),
 *  display_name, display_grade, rating 1–5, text, note (internal), hidden? }. Course pages read the reviews from the
 *  database on every request (no course-list cache here), so nothing needs clearing afterwards. */
export async function adminReviewSave(d: Data, _c: Ctx, admin: User) {
  const name = clip(d.display_name, 40), grade = clip(d.display_grade, 60), rating = Math.round(Number(d.rating) || 0), text = clip(d.text, 1000), note = clip(d.note, 200);
  if (!name) throw err("BAD_INPUT", "ใส่ชื่อที่จะแสดง เช่น ชื่อเล่นของน้อง");
  if (rating < 1 || rating > 5) throw err("BAD_INPUT", "ให้ดาว 1–5 ดวง");
  if (text.length < 5) throw err("BAD_INPUT", "ใส่ข้อความรีวิว");
  const status = d.hidden ? "hidden" : "approved", ids: string[] = [];
  if (d.review_id) {
    const r = await prisma.review.findUnique({ where: { id: String(d.review_id) } });
    if (!r) throw err("NOT_FOUND", "ไม่พบรีวิว");
    if (r.source !== "admin") throw err("FORBIDDEN", "แก้ได้เฉพาะรีวิวที่แอดมินใส่เอง");
    const c = d.course_id ? await courseBySlug(d.course_id) : await prisma.course.findUnique({ where: { id: r.courseId } });
    if (!c) throw err("BAD_INPUT", "เลือกคอร์ส");
    await prisma.review.update({ where: { id: r.id }, data: { courseId: c.id, displayName: name, displayGrade: grade, rating, text, note, status, decidedBy: admin.id, decidedAt: new Date() } });
    ids.push(r.id);
  } else {
    const list: unknown[] = Array.isArray(d.course_ids) ? d.course_ids : d.course_id != null ? [d.course_id] : [];
    const cids = list.map(String).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 40);
    if (!cids.length) throw err("BAD_INPUT", "เลือกคอร์สอย่างน้อย 1 คอร์ส");
    const found = await prisma.course.findMany({ where: { slug: { in: cids } }, select: { id: true, slug: true } });
    for (const cid of cids) if (!found.some((c) => c.slug === cid)) throw err("BAD_INPUT", "ไม่พบคอร์ส " + cid);
    const at = d.created_at && !isNaN(new Date(d.created_at).getTime()) && new Date(d.created_at) <= new Date() ? new Date(d.created_at) : new Date();
    const rows = await prisma.$transaction(cids.map((cid) => prisma.review.create({
      data: { userId: null, courseId: found.find((c) => c.slug === cid)!.id, rating, text, status, createdAt: at, decidedBy: admin.id, decidedAt: new Date(), source: "admin", displayName: name, displayGrade: grade, note },
    })));
    ids.push(...rows.map((x) => x.id));
  }
  await log(admin, "review.admin.save", ids.join(","));
  return { ids };
}
/** Only an admin's own review can be deleted; a student's is hidden instead (admin.feedback.decide). */
export async function adminReviewDelete(d: Data, _c: Ctx, admin: User) {
  const r = await prisma.review.findUnique({ where: { id: String(d.review_id || "") } });
  if (!r) throw err("NOT_FOUND", "ไม่พบรีวิว");
  if (r.source !== "admin") throw err("FORBIDDEN", "ลบได้เฉพาะรีวิวที่แอดมินใส่เอง รีวิวจากนักเรียนใช้ \"ซ่อน\" แทน");
  await prisma.review.delete({ where: { id: r.id } });
  await log(admin, "review.admin.delete", r.id);
  return true;
}

export async function adminGradesProof(d: Data) {
  const r = await prisma.gradeReport.findUnique({ where: { id: String(d.id || "") } });
  if (!r) throw err("NOT_FOUND", "ไม่พบรายการ");
  return photoOut(r.proofBlobId);
}

// ───── Feedback from people who tried a free episode (no login, no cells: is the preview easy to follow?) ─────
const TRIAL_LEVELS: Record<string, string> = { clear: "เข้าใจ", partly: "เข้าใจบางส่วน", lost: "ยังไม่เข้าใจ" };
export async function trialFeedback(d: Data, { p }: Ctx) {
  const level = String(d.level || "");
  if (!TRIAL_LEVELS[level]) throw err("BAD_INPUT", "เลือกว่าเข้าใจแค่ไหน");
  const c = await courseBySlug(d.course_id);
  if (!c || !c.isPublished) throw err("NOT_FOUND", "ไม่พบคอร์สนี้");
  let u: User | null = null;
  if (p.token) { try { u = await auth(p); } catch {} }
  const who = u ? u.id : String(p.device_id || "").slice(0, 60);
  if (!who) throw err("BAD_INPUT", "ส่งไม่ได้ ลองรีเฟรชหน้าอีกครั้ง");
  // Once per person, course and episode for 6 hours (Code.gs: a 6-hour cache key).
  const once = await rateLimit("tf", who + ":" + c.id + ":" + String(d.lesson || "").slice(0, 40), { limit: 1, windowSeconds: 21600 });
  if (!once.allowed) return { ok: true, repeat: true };
  await prisma.trialFeedback.create({
    data: { courseId: c.id, lesson: clip(d.lesson, 120), level, text: clip(d.text, 500), userId: u ? u.id : null, deviceId: u ? "" : who },
  });
  return { ok: true };
}
/** Shown on the course page once 5+ people answered. */
export async function trialStats(courseId: string) {
  const g = await prisma.trialFeedback.groupBy({ by: ["level"], where: { courseId }, _count: { _all: true } });
  const n = g.reduce((a, x) => a + x._count._all, 0);
  if (n < 5) return null;
  const k = (lv: string) => g.find((x) => x.level === lv)?._count._all || 0;
  return { n, clear_pct: Math.round((k("clear") / n) * 100), ok_pct: Math.round(((k("clear") + k("partly")) / n) * 100) };
}
async function trialAdmin() {
  const rows = await prisma.trialFeedback.findMany({ orderBy: { createdAt: "desc" } });
  const titles = new Map((await prisma.course.findMany({ where: { id: { in: Array.from(new Set(rows.map((x) => x.courseId))) } }, select: { id: true, slug: true, title: true } })).map((c) => [c.id, c]));
  const by: Record<string, { course_id: string; course: string; clear: number; partly: number; lost: number; n: number }> = {};
  for (const x of rows) {
    const c = titles.get(x.courseId);
    const b = (by[x.courseId] ||= { course_id: c?.slug || x.courseId, course: c?.title || x.courseId, clear: 0, partly: 0, lost: 0, n: 0 });
    if (x.level === "clear" || x.level === "partly" || x.level === "lost") b[x.level]++;
    b.n++;
  }
  return {
    summary: Object.values(by).sort((a, b) => b.n - a.n),
    comments: rows.filter((x) => x.text).slice(0, 100).map((x) => ({
      course: titles.get(x.courseId)?.title || x.courseId, lesson: x.lesson, level: x.level, text: x.text, member: !!x.userId, created_at: iso(x.createdAt),
    })),
  };
}

/** Approved reviews on the course page (newest 30) · an admin's review shows the name and class typed in; its
 *  internal note never leaves the server. */
export async function courseReviews(courseId: string) {
  const rs = await prisma.review.findMany({ where: { courseId, status: "approved" }, orderBy: { createdAt: "desc" }, take: 30 });
  const users = new Map((await prisma.user.findMany({ where: { id: { in: rs.map((r) => r.userId).filter((x): x is string => !!x) } } })).map((u) => [u.id, u]));
  return rs.map((r) => {
    const u = r.userId ? users.get(r.userId) : undefined;
    return { nickname: r.displayName || u?.nickname || "นักเรียน", grade: r.source === "admin" ? r.displayGrade || "" : u?.gradeLevel || "", rating: r.rating, text: r.text, created_at: iso(r.createdAt) };
  });
}
export const hasReviewed = async (userId: string, courseId: string) => !!(await prisma.review.findUnique({ where: { userId_courseId: { userId, courseId } } }));

// Web app v4 features for teachers and admins, ported from backend/Code.gs:
// students per course and revoking access, the activity log, finance (income, expenses, revenue
// split, closing a month, teacher payouts), students from before the website, lesson files,
// renaming a chapter and syncing lessons from YouTube playlists.
// Code.gs "Enrollments" rows are Payment rows here; access itself is the Enrollment row (ACTIVE,
// not expired). Teachers are INSTRUCTOR users with User.subjects.
import type { Course, Expense, Lesson, Payment, Prisma, Subject, User } from "@prisma/client";
import { prisma } from "../prisma";
import { subjectKey } from "./subjects";
import {
  activate, adminEmails, auth, courseBySlug, getSetting, ig, isAdminUser, log, rate, setSetting, siteUrlOf, subjectsOf, canSubject,
  type Ctx, type Data,
} from "./api";
import { sendNotice } from "./mail";
import { APP, bkkDate, clip, err, esc, iso, randToken, trim } from "./util";

const csv = (s: unknown) => String(s || "").split(",").map(trim).filter(Boolean);
const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
const shortId = (n = 8) => randToken(8).toUpperCase().slice(0, n);
const userName = (u?: Pick<User, "nickname" | "firstName" | "lastName"> | null) =>
  u ? (u.nickname ? u.nickname + " " : "") + "(" + (u.firstName || "") + " " + (u.lastName || "") + ")" : "";
const fullName = (u: Pick<User, "firstName" | "lastName">) => (u.firstName || "") + " " + (u.lastName || "");

// ───────────────────────── Access helpers ─────────────────────────
type CourseS = Course & { subject: Subject };
export async function courseFor(u: User, cid: unknown) {
  const c = await prisma.course.findUnique({ where: { slug: String(cid || "") }, include: { subject: true } });
  if (!c) throw err("NOT_FOUND", "ไม่พบคอร์ส");
  if (!canSubject(u, subjectKey(c.subject))) throw err("FORBIDDEN", "คอร์สนี้ไม่ได้อยู่ในวิชาที่คุณดูแล");
  return c;
}
export async function lessonFor(u: User, lid: unknown) {
  const l = await prisma.lesson.findUnique({ where: { id: String(lid || "") }, include: { course: { include: { subject: true } } } });
  if (!l) throw err("NOT_FOUND", "ไม่พบบทเรียน");
  if (!canSubject(u, subjectKey(l.course.subject))) throw err("FORBIDDEN", "คอร์สนี้ไม่ได้อยู่ในวิชาที่คุณดูแล");
  return l;
}
/** A draft course with the same title and subject as a published one (a leftover copy): the published one. */
const titleKey = (t: string) => t.replace(/\s/g, "").toLowerCase();
export async function publishedTwin(c: Pick<Course, "id" | "title" | "isPublished" | "subjectId">) {
  if (c.isPublished) return null;
  const pubs = (await prisma.course.findMany({ where: { isPublished: true, subjectId: c.subjectId } })).filter((x) => titleKey(x.title) === titleKey(c.title));
  return pubs.length === 1 ? pubs[0] : null;
}
/** Enrollment filter: may study now (ACTIVE and not past its end date). */
export const activeWhere = () => ({ status: "ACTIVE" as const, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });
export async function hasAccess(userId: string, courseId: string) {
  return !!(await prisma.enrollment.findFirst({ where: { userId, courseId, ...activeWhere() } }));
}

export const SOURCE_LABEL: Record<string, string> = {
  bill: "ซื้อผ่านเว็บ", manual: "รับเงินช่องทางอื่น", grant: "ให้ฟรี", test: "ทดสอบ", legacy: "นักเรียนรุ่นเก่า", request: "ส่งสลิป (แบบเดิม)",
};
/** Where an access came from; older rows without a source are guessed from the note and amount. */
export function sourceOf(p: Pick<Payment, "source" | "note" | "slipImageUrl" | "amount" | "promptpayRef">) {
  if (p.source) return p.source;
  if (/^บิล /.test(p.note || "") || /^BILL-/.test(p.promptpayRef)) return "bill";
  if (p.slipImageUrl) return "request";
  return p.amount > 0 ? "manual" : "grant";
}

// ───────────────────────── Students in a course · revoke · log ─────────────────────────
export async function courseStudents(d: Data, _c: Ctx, me: User) {
  const c = await courseFor(me, d.course_id), admin = isAdminUser(me);
  const [pays, enrs, lessons] = await Promise.all([
    prisma.payment.findMany({ where: { courseId: c.id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    prisma.enrollment.findMany({ where: { courseId: c.id } }),
    prisma.lesson.findMany({ where: { courseId: c.id, hidden: false }, select: { id: true } }),
  ]);
  const ids = lessons.map((l) => l.id);
  const last: Record<string, (typeof pays)[number]> = {};
  for (const p of pays) last[p.userId] = p;
  const deciders = await prisma.user.findMany({ where: { id: { in: Object.values(last).map((p) => p.reviewedBy || "").filter(Boolean) } } });
  const prog = await prisma.lessonProgress.groupBy({ by: ["userId"], where: { lessonId: { in: ids }, isCompleted: true, userId: { in: Object.keys(last) } }, _count: true });
  const now = Date.now();
  return Object.values(last)
    .map((e) => {
      const enr = enrs.find((x) => x.userId === e.userId);
      const src = sourceOf(e), by = deciders.find((x) => x.id === e.reviewedBy);
      const expired = !!enr?.expiresAt && enr.expiresAt.getTime() <= now;
      const st = e.revokedAt ? "revoked" : e.status === "APPROVED" && (expired || enr?.status !== "ACTIVE") ? "expired" : e.status.toLowerCase();
      const done = prog.find((x) => x.userId === e.userId)?._count || 0;
      return {
        enroll_id: e.id, order_number: admin ? e.orderNumber || "" : undefined, user_id: e.userId, name: fullName(e.user), nickname: e.user.nickname || "", email: admin ? e.user.email : "",
        status: st, source: src, source_label: SOURCE_LABEL[src] || src, reason: e.reason || "", amount: admin ? e.amount : null,
        granted_by: by ? by.nickname || by.firstName : e.reviewedBy === "SYSTEM" ? "ระบบ" : "", since: iso(e.reviewedAt || e.createdAt), expires_at: iso(enr?.expiresAt),
        done, percent: ids.length ? Math.round((done / ids.length) * 100) : 0,
        can_revoke: e.status === "APPROVED" && !e.revokedAt && (admin || src === "grant" || src === "test"),
      };
    })
    .filter((r) => r.status !== "rejected")
    .sort((a, b) => (a.since < b.since ? 1 : -1));
}

export async function staffRevoke(d: Data, _c: Ctx, me: User) {
  const e = await prisma.payment.findUnique({ where: { id: String(d.enroll_id || "") }, include: { course: true } });
  if (!e) throw err("NOT_FOUND", "ไม่พบสิทธิ์นี้");
  await courseFor(me, e.course.slug);
  const src = sourceOf(e);
  if (!isAdminUser(me) && src !== "grant" && src !== "test") throw err("FORBIDDEN", "ผู้สอนถอนได้เฉพาะสิทธิ์ที่ให้ฟรีหรือทดสอบ สิทธิ์ที่ซื้อแล้วต้องให้แอดมินถอน");
  if (e.status !== "APPROVED" || e.revokedAt) throw err("ALREADY", "สิทธิ์นี้ถูกถอนไปแล้ว");
  await prisma.payment.update({ where: { id: e.id }, data: { revokedAt: new Date(), note: clip(d.note || "ถอนสิทธิ์โดยทีมงาน", 300) } });
  await prisma.enrollment.updateMany({ where: { userId: e.userId, courseId: e.courseId }, data: { status: "EXPIRED" } });
  if (src === "legacy") {
    const recs = await prisma.legacyStudent.findMany({ where: { userId: e.userId } });
    for (const l of recs) if (csv(l.courseIds).includes(e.course.slug)) await prisma.legacyStudent.update({ where: { id: l.id }, data: { status: "open", userId: null, claimedAt: null, match: "" } });
  }
  await log(me, "revoke", e.userId + " → " + e.course.slug + " (" + src + ")");
  return true;
}

export async function adminLog(d: Data) {
  const rows = await prisma.auditLog.findMany({ where: { action: { startsWith: "ib." } }, orderBy: { createdAt: "desc" }, take: 1500 });
  const users = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(rows.map((r) => r.actorId))) } } });
  const q = String(d.q || "").toLowerCase();
  let out = rows.map((r) => {
    const u = users.find((x) => x.id === r.actorId);
    return { time: iso(r.createdAt), who: u ? u.nickname || u.firstName : r.actorId, role: u ? roleOf(u) : "", action: r.action.slice(3), detail: r.target };
  });
  if (d.teachers_only) out = out.filter((r) => r.role === "teacher");
  if (q) out = out.filter((r) => [r.who, r.action, r.detail].join(" ").toLowerCase().includes(q));
  return out.slice(0, 300);
}
/** หลังบ้าน: find payments by order number (BIO-0042 / 0042), student name, email or course. Admins only. */
export async function adminOrdersSearch(d: Data) {
  const q = trim(d.q).slice(0, 80);
  if (!q) return [];
  const num = q.toUpperCase().replace(/\s+/g, "");
  const or: Prisma.PaymentWhereInput[] = [
    { orderNumber: { contains: num, mode: "insensitive" } },
    { user: { OR: ["email", "firstName", "lastName", "nickname", "phone"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) } },
    { course: { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase() } }] } },
    { billId: { contains: num } },
  ];
  const rows = await prisma.payment.findMany({ where: { OR: or }, include: { user: true, course: true }, orderBy: { createdAt: "desc" }, take: 50 });
  return rows.map((e) => {
    const src = sourceOf(e);
    return {
      order_number: e.orderNumber || "", enroll_id: e.id, created_at: iso(e.createdAt), decided_at: iso(e.reviewedAt),
      status: e.revokedAt ? "revoked" : e.status.toLowerCase(), amount: e.amount, source: src, source_label: SOURCE_LABEL[src] || src,
      student: fullName(e.user), nickname: e.user.nickname || "", email: e.user.email, course_id: e.course.slug, course_title: e.course.title,
      bill_id: e.billId || ((e.note || "").match(/^บิล (\S+)/) || [])[1] || "", has_slip: !!e.slipImageUrl,
    };
  });
}
const roleOf = (u: User) => (u.role === "ADMIN" ? "admin" : u.role === "INSTRUCTOR" ? "teacher" : "student");
async function systemLog(action: string, detail: string) {
  await prisma.auditLog.create({ data: { actorId: "SYSTEM", action: "ib." + action, target: clip(detail, 500) } });
}

// ───────────────────────── Finance ─────────────────────────
const EXPENSE_CATS = ["โฆษณา", "เอกสาร/ชีท", "อุปกรณ์", "ค่าตอบแทน", "ซอฟต์แวร์/โดเมน", "อื่นๆ"];
const SUBJECTS = () => Object.keys(APP.SUBJECTS);
/** "YYYY-MM" in Thai time. */
const periodOf = (d: Date | string | null | undefined) => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime()) ? new Date(t.getTime() + 7 * 36e5).toISOString().slice(0, 7) : "";
};
function checkPeriod(pr: unknown) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(pr || ""))) throw err("BAD_INPUT", "เลือกเดือน");
  return String(pr);
}
const periodRange = (pr: string) => {
  const [y, m] = pr.split("-").map(Number);
  return { gte: new Date(Date.UTC(y, m - 1, 1) - 7 * 36e5), lt: new Date(Date.UTC(y, m, 1) - 7 * 36e5) };
};
async function platformPct() {
  let o: Record<string, unknown> = {};
  try { o = JSON.parse((await getSetting("platform_pct")) || "{}") || {}; } catch {}
  const out: Record<string, number> = {};
  for (const k of SUBJECTS()) out[k] = Math.min(100, Math.max(0, Number(o[k]) || 0));
  return out;
}
const isClosed = async (pr: string) => !!(await prisma.finPeriod.findUnique({ where: { period: pr } }));
const teachersAll = () => prisma.user.findMany({ where: { role: "INSTRUCTOR" } });
type Split = { user_id: string; pct: number };
const splitList = (v: Prisma.JsonValue): Split[] => (Array.isArray(v) ? (v as Split[]) : []);
/** Teachers' shares of a course: set per course, else split equally among the subject's teachers. */
function splitOf(c: Course & { subject: Subject }, teachers: User[]) {
  const sp = splitList(c.teacherSplit).filter((x) => Number(x.pct) > 0 && teachers.some((t) => t.id === x.user_id));
  const tot = sp.reduce((a, x) => a + Number(x.pct), 0);
  if (tot > 0) return { custom: true, parts: sp.map((x) => ({ user_id: x.user_id, w: Number(x.pct) / tot })) };
  const k = subjectKey(c.subject), ts = teachers.filter((t) => subjectsOf(t).includes(k));
  return { custom: false, parts: ts.map((t) => ({ user_id: t.id, w: 1 / ts.length })) };
}
const expenseDate = (x: Expense) => bkkDate(x.date);
function expenseOut(x: Expense, users: User[]) {
  const k = x.subjectKey || "";
  return {
    expense_id: x.id, date: expenseDate(x), subject: k, subject_name: APP.SUBJECTS[k] || "ส่วนกลาง", category: x.category || "อื่นๆ", amount: x.amount,
    note: x.note || "", status: x.status, has_receipt: !!x.slipImageUrl, created_by: x.recordedById, created_by_name: userName(users.find((u) => u.id === x.recordedById)),
  };
}
type Income = {
  enroll_id: string; order_number?: string; date: string; course_id: string; course_title: string; subject: string; amount: number; source: string; source_label: string;
  student: string; nickname: string; bill_id: string; has_slip: boolean; account_label: string; held_by: string; revoked: boolean;
};
type SubjRow = { subject: string; name: string; income: number; expense: number; net: number; pct: number; platform: number; pool: number; unassigned: number; custom_missing: string[] };
type TeacherRow = { user_id: string; name: string; subjects: string[]; share: number; held: number; settle?: number };

/** The whole month (all subjects); trimmed to what the viewer may see afterwards. */
async function finCompute(pr: string) {
  const range = periodRange(pr);
  const [users, courses, teachers, pct, pays, exps, accs] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "INSTRUCTOR"] } } }),
    prisma.course.findMany({ include: { subject: true } }),
    teachersAll(),
    platformPct(),
    prisma.payment.findMany({ where: { status: "APPROVED", OR: [{ reviewedAt: range }, { reviewedAt: null, createdAt: range }] }, include: { user: true } }),
    prisma.expense.findMany({ where: { date: range } }),
    prisma.payAccount.findMany(),
  ]);
  const billIds = pays.map((p) => p.billId || ((p.note || "").match(/^บิล (\S+)/) || [])[1] || "").filter(Boolean);
  const bills = await prisma.bill.findMany({ where: { id: { in: billIds } } });
  const income: Income[] = [], free = { grant: 0, legacy: 0, test: 0, bill0: 0 };
  for (const e of pays) {
    const c = courses.find((x) => x.id === e.courseId); if (!c) continue;
    const src = sourceOf(e);
    if (e.amount <= 0) {
      if (!e.revokedAt) { if (src === "bill") free.bill0++; else if (src in free) (free as Record<string, number>)[src]++; }
      continue;
    }
    const bid = e.billId || ((e.note || "").match(/^บิล (\S+)/) || [])[1] || "";
    const b = bid ? bills.find((x) => x.id === bid) : null;
    const acc = b ? accs.find((a) => a.id === b.accountId) : null;
    income.push({
      enroll_id: e.id, order_number: e.orderNumber || "", date: iso(e.reviewedAt || e.createdAt), course_id: c.slug, course_title: c.title, subject: subjectKey(c.subject), amount: e.amount,
      source: src, source_label: SOURCE_LABEL[src] || src, student: fullName(e.user), nickname: e.user.nickname || "", bill_id: bid, has_slip: !!e.slipImageUrl,
      account_label: acc ? acc.label : b ? "บัญชีหลัก" : "—", held_by: acc?.ownerId || "", revoked: !!e.revokedAt,
    });
  }
  const recorders = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(exps.map((x) => x.recordedById))) } } });
  const expenses = exps.map((x) => expenseOut(x, recorders)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const uname = (id: string) => userName(users.find((u) => u.id === id));
  const subj: Record<string, SubjRow> = {}, tt: Record<string, TeacherRow> = {}, tw: Record<string, Record<string, number>> = {};
  for (const k of SUBJECTS()) subj[k] = { subject: k, name: APP.SUBJECTS[k], income: 0, expense: 0, net: 0, pct: pct[k], platform: 0, pool: 0, unassigned: 0, custom_missing: [] };
  for (const it of income) {
    const S0 = subj[it.subject]; if (!S0) continue;
    S0.income += it.amount;
    const c = courses.find((x) => x.slug === it.course_id)!, sp = splitOf(c, teachers);
    if (!sp.parts.length) { S0.unassigned += it.amount; continue; }
    tw[it.subject] = tw[it.subject] || {};
    for (const x of sp.parts) tw[it.subject][x.user_id] = (tw[it.subject][x.user_id] || 0) + it.amount * x.w;
  }
  for (const x of expenses) if (x.status === "approved" && subj[x.subject]) subj[x.subject].expense += x.amount;
  const shared = expenses.filter((x) => x.status === "approved" && !subj[x.subject]).reduce((a, x) => a + x.amount, 0);
  const teacherRow = (id: string) => (tt[id] = tt[id] || { user_id: id, name: uname(id), subjects: [], share: 0, held: 0 });
  for (const k of Object.keys(subj)) {
    const S0 = subj[k], assigned = S0.income - S0.unassigned;
    S0.net = r2(S0.income - S0.expense);
    // Sales with a teacher: take their part of the expenses, then the platform's cut · sales without one go to the platform.
    const expAssigned = S0.income > 0 ? (S0.expense * assigned) / S0.income : Object.keys(tw[k] || {}).length ? S0.expense : 0;
    S0.pool = r2((assigned - expAssigned) * (1 - S0.pct / 100));
    S0.platform = r2(S0.net - S0.pool);
    const totW = Object.values(tw[k] || {}).reduce((a, v) => a + v, 0);
    for (const uid of Object.keys(tw[k] || {})) {
      const t = teacherRow(uid);
      if (!t.subjects.includes(k)) t.subjects.push(k);
      t.share += totW > 0 ? (S0.pool * tw[k][uid]) / totW : 0;
    }
    if (!totW && S0.expense && !S0.income) { // expenses only: the subject's teachers carry their part
      const ts = teachers.filter((t) => subjectsOf(t).includes(k));
      if (ts.length) {
        S0.pool = r2(-S0.expense * (1 - S0.pct / 100)); S0.platform = r2(S0.net - S0.pool);
        for (const t of ts) { const r = teacherRow(t.id); if (!r.subjects.includes(k)) r.subjects.push(k); r.share += S0.pool / ts.length; }
      }
    }
    S0.income = r2(S0.income); S0.expense = r2(S0.expense); S0.unassigned = r2(S0.unassigned);
  }
  for (const it of income) if (it.held_by) teacherRow(it.held_by).held += it.amount;
  const tlist = Object.values(tt).map((t) => ({ ...t, share: r2(t.share), held: r2(t.held), settle: r2(r2(t.share) - r2(t.held)) })).sort((a, b) => b.share - a.share);
  const totals: Record<string, number> = { income: 0, expense: 0, platform: 0, teachers: 0 };
  for (const k of Object.keys(subj)) { totals.income += subj[k].income; totals.expense += subj[k].expense; totals.platform += subj[k].platform; totals.teachers += subj[k].pool; }
  totals.expense += shared; totals.platform -= shared;
  for (const k of Object.keys(totals)) totals[k] = r2(totals[k]);
  totals.shared = r2(shared); totals.net = r2(totals.income - totals.expense);
  return { income, expenses, by_subject: Object.values(subj), teachers: tlist as TeacherRow[], totals, free };
}
type FinData = Awaited<ReturnType<typeof finCompute>>;
function finScope(r: FinData, me: User, subject: string) {
  const mine = subjectsOf(me), admin = isAdminUser(me);
  const want = subject && mine.includes(subject) ? [subject] : mine;
  const allSubj = admin && !subject;
  const out: Record<string, any> = {
    income: r.income.filter((x) => want.includes(x.subject)),
    expenses: r.expenses.filter((x) => want.includes(x.subject) || (allSubj && !APP.SUBJECTS[x.subject])),
    by_subject: r.by_subject.filter((x) => want.includes(x.subject)),
    teachers: admin ? r.teachers.filter((t) => allSubj || t.subjects.some((s) => want.includes(s))) : r.teachers.filter((t) => t.user_id === me.id),
    free: r.free,
  };
  if (allSubj) out.totals = r.totals;
  else {
    const t: Record<string, number> = { income: 0, expense: 0, platform: 0, teachers: 0, shared: 0 };
    for (const x of out.by_subject as SubjRow[]) { t.income += x.income; t.expense += x.expense; t.platform += x.platform; t.teachers += x.pool; }
    for (const k of Object.keys(t)) t[k] = r2(t[k]);
    t.net = r2(t.income - t.expense); out.totals = t;
  }
  if (!admin) {
    for (const x of out.income as Income[]) { x.bill_id = ""; delete x.order_number; }
    for (const x of out.expenses as ReturnType<typeof expenseOut>[]) if (x.created_by !== me.id) x.created_by_name = x.created_by_name.replace(/\s*\(.*\)$/, "");
  }
  return out;
}
export async function finSummary(d: Data, _c: Ctx, me: User) {
  const pr = d.period ? checkPeriod(d.period) : periodOf(new Date());
  const row = await prisma.finPeriod.findUnique({ where: { period: pr } });
  const live = await finCompute(pr);
  if (row) {
    const snap = row.snapshot as Partial<FinData> | null;
    if (snap) { live.by_subject = snap.by_subject || live.by_subject; live.teachers = snap.teachers || live.teachers; live.totals = snap.totals || live.totals; }
  }
  const out = finScope(live, me, String(d.subject || ""));
  out.period = pr; out.closed = !!row; out.closed_at = iso(row?.closedAt);
  out.subjects = subjectsOf(me); out.admin = isAdminUser(me); out.categories = EXPENSE_CATS;
  out.payouts = (await prisma.finPayout.findMany({ where: { period: pr, ...(isAdminUser(me) ? {} : { userId: me.id }) }, orderBy: { createdAt: "asc" } })).map((x) => ({
    payout_id: x.id, user_id: x.userId, amount: x.amount, share: x.share, held: x.held, status: x.status, paid_at: iso(x.paidAt), note: x.note,
  }));
  return out;
}
const dateOfDay = (day: string) => new Date(day + "T12:00:00+07:00");
export async function finExpenseSave(d: Data, _c: Ctx, me: User) {
  const date = String(d.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(dateOfDay(date).getTime())) throw err("BAD_INPUT", "เลือกวันที่");
  const subject = String(d.subject || "");
  if (subject && !APP.SUBJECTS[subject]) throw err("BAD_INPUT", "เลือกวิชา");
  if (!isAdminUser(me) && !canSubject(me, subject)) throw err("FORBIDDEN", "บันทึกรายจ่ายได้เฉพาะวิชาที่คุณดูแล");
  const amount = r2(d.amount);
  if (!(amount > 0)) throw err("BAD_INPUT", "ใส่ยอดเงินมากกว่า 0");
  if (await isClosed(periodOf(dateOfDay(date)))) throw err("LOCKED", "เดือนนี้ปิดงวดแล้ว ลงรายจ่ายในเดือนถัดไปแทน");
  const category = EXPENSE_CATS.includes(d.category) ? d.category : "อื่นๆ", note = clip(d.note, 300);
  const patch: Prisma.ExpenseUncheckedUpdateInput = { date: dateOfDay(date), subjectKey: subject || null, category, amount, note, title: clip(note || category, 120) };
  if (d.receipt && d.receipt.base64) {
    if (!/^image\/(jpeg|png|webp)$|^application\/pdf$/.test(d.receipt.mime || "")) throw err("BAD_INPUT", "ใบเสร็จต้องเป็นรูปหรือ PDF");
    if (String(d.receipt.base64).length * 0.75 > APP.SLIP_MAX_BYTES) throw err("BAD_INPUT", "ไฟล์ใบเสร็จใหญ่เกิน 3 MB");
    const b = await prisma.fileBlob.create({ data: { mime: d.receipt.mime, data: Buffer.from(String(d.receipt.base64), "base64"), isPublic: false } });
    patch.slipImageUrl = "blob:" + b.id;
  }
  if (d.expense_id) {
    const x = await prisma.expense.findUnique({ where: { id: String(d.expense_id) } });
    if (!x) throw err("NOT_FOUND", "ไม่พบรายการนี้");
    if (await isClosed(periodOf(x.date))) throw err("LOCKED", "รายการนี้อยู่ในเดือนที่ปิดงวดแล้ว แก้ไม่ได้");
    if (!isAdminUser(me) && (x.recordedById !== me.id || x.status !== "pending")) throw err("FORBIDDEN", "แก้ได้เฉพาะรายการของคุณที่ยังรอแอดมินอนุมัติ");
    await prisma.expense.update({ where: { id: x.id }, data: patch });
    await log(me, "expense.edit", x.id + " ฿" + amount);
    return { expense_id: x.id };
  }
  const admin = isAdminUser(me);
  const x = await prisma.expense.create({
    data: {
      ...(patch as Prisma.ExpenseUncheckedCreateInput), id: "X" + shortId(8), recordedById: me.id, status: admin ? "approved" : "pending",
      ...(admin ? { decidedById: me.id, decidedAt: new Date() } : {}),
    },
  });
  await log(me, "expense.create", x.id + " " + (subject || "ส่วนกลาง") + " ฿" + amount);
  return { expense_id: x.id };
}
export async function finExpenseDecide(d: Data, _c: Ctx, me: User) {
  const st = d.decision === "approve" ? "approved" : d.decision === "reject" ? "rejected" : "";
  if (!st) throw err("BAD_INPUT", "เลือกอนุมัติหรือไม่อนุมัติ");
  const x = await prisma.expense.findUnique({ where: { id: String(d.expense_id || "") } });
  if (!x) throw err("NOT_FOUND", "ไม่พบรายการนี้");
  if (await isClosed(periodOf(x.date))) throw err("LOCKED", "เดือนนี้ปิดงวดแล้ว");
  await prisma.expense.update({ where: { id: x.id }, data: { status: st, decidedById: me.id, decidedAt: new Date() } });
  await log(me, "expense." + st, x.id);
  return true;
}
export async function finExpenseDelete(d: Data, _c: Ctx, me: User) {
  const x = await prisma.expense.findUnique({ where: { id: String(d.expense_id || "") } });
  if (!x) throw err("NOT_FOUND", "ไม่พบรายการนี้");
  if (await isClosed(periodOf(x.date))) throw err("LOCKED", "เดือนนี้ปิดงวดแล้ว ลบไม่ได้");
  if (!isAdminUser(me) && (x.recordedById !== me.id || x.status !== "pending")) throw err("FORBIDDEN", "ลบได้เฉพาะรายการของคุณที่ยังรออนุมัติ");
  await prisma.expense.delete({ where: { id: x.id } });
  await log(me, "expense.delete", x.id + " ฿" + x.amount);
  return true;
}
async function blobOut(ref: string | null | undefined) {
  if (!ref || !ref.startsWith("blob:")) return null;
  const b = await prisma.fileBlob.findUnique({ where: { id: ref.slice(5) } });
  return b ? { mime: b.mime, base64: Buffer.from(b.data).toString("base64") } : null;
}
export async function finReceipt(d: Data, _c: Ctx, me: User) {
  const x = await prisma.expense.findUnique({ where: { id: String(d.expense_id || "") } });
  if (!x || !x.slipImageUrl) throw err("NOT_FOUND", "ไม่มีใบเสร็จ");
  if (!isAdminUser(me) && !canSubject(me, x.subjectKey || "")) throw err("FORBIDDEN", "ไม่มีสิทธิ์ดูรายการนี้");
  const out = await blobOut(x.slipImageUrl);
  if (out) return out;
  const r = await fetch(x.slipImageUrl).catch(() => null); // older receipts stored elsewhere
  if (!r?.ok) throw err("NOT_FOUND", "ไม่มีใบเสร็จ");
  return { mime: r.headers.get("content-type") || "image/jpeg", base64: Buffer.from(await r.arrayBuffer()).toString("base64") };
}
export async function finRules() {
  const [teachers, staff, courses] = await Promise.all([
    teachersAll(),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "INSTRUCTOR"] } }, orderBy: { createdAt: "asc" } }),
    prisma.course.findMany({ include: { subject: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const nm = (t: User) => (t.nickname ? t.nickname + " · " : "") + t.firstName + " " + t.lastName;
  return {
    platform_pct: await platformPct(),
    teachers: teachers.map((t) => ({ user_id: t.id, name: nm(t), subjects: subjectsOf(t) })),
    owners: staff.map((t) => ({ user_id: t.id, name: nm(t), role: roleOf(t) })),
    courses: courses.map((c) => {
      const sp = splitOf(c, teachers);
      return { course_id: c.slug, title: c.title, subject: subjectKey(c.subject), custom: sp.custom, split: splitList(c.teacherSplit), effective: sp.parts.map((x) => ({ user_id: x.user_id, pct: r2(x.w * 100) })) };
    }),
  };
}
export async function finRulesSave(d: Data, _c: Ctx, me: User) {
  if (d.platform_pct) {
    const o: Record<string, number> = {};
    for (const k of SUBJECTS()) {
      const v = Number(d.platform_pct[k]);
      if (!(v >= 0 && v <= 100)) throw err("BAD_INPUT", "ส่วนแบ่งต้องอยู่ระหว่าง 0–100%");
      o[k] = v;
    }
    await setSetting("platform_pct", JSON.stringify(o));
    await log(me, "finance.pct", JSON.stringify(o));
  }
  for (const sp of Array.isArray(d.splits) ? d.splits : []) {
    const c = await prisma.course.findUnique({ where: { slug: String(sp.course_id || "") } });
    if (!c) continue;
    const parts = (Array.isArray(sp.split) ? sp.split : []).map((x: any) => ({ user_id: String(x.user_id), pct: r2(x.pct) })).filter((x: Split) => x.pct > 0);
    const tot = parts.reduce((a: number, x: Split) => a + x.pct, 0);
    if (parts.length && Math.abs(tot - 100) > 0.01) throw err("BAD_INPUT", "สัดส่วนของ " + c.title + " รวมกันต้องได้ 100%");
    await prisma.course.update({ where: { id: c.id }, data: { teacherSplit: parts } });
    await log(me, "finance.split", c.slug + " " + JSON.stringify(parts));
  }
  return finRules();
}
export async function finClose(d: Data, c: Ctx, me: User) {
  const pr = checkPeriod(d.period);
  if (pr > periodOf(new Date())) throw err("BAD_INPUT", "ปิดงวดล่วงหน้าไม่ได้");
  const r = await finCompute(pr);
  if (await isClosed(pr)) throw err("ALREADY", "เดือนนี้ปิดงวดไปแล้ว");
  if (r.expenses.some((x) => x.status === "pending")) throw err("BAD_INPUT", "ยังมีรายจ่ายรออนุมัติในเดือนนี้ อนุมัติหรือไม่อนุมัติก่อนปิดงวด");
  try {
    await prisma.$transaction([
      prisma.finPeriod.create({ data: { period: pr, closedBy: me.id, snapshot: { by_subject: r.by_subject, teachers: r.teachers, totals: r.totals } as unknown as Prisma.InputJsonValue } }),
      ...r.teachers.map((t) =>
        prisma.finPayout.create({
          data: { id: "PO" + shortId(8), period: pr, userId: t.user_id, subjects: t.subjects.join(","), share: t.share, held: t.held, amount: t.settle || 0,
            status: t.settle === 0 ? "paid" : "pending", paidAt: t.settle === 0 ? new Date() : null },
        })
      ),
    ]);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw err("ALREADY", "เดือนนี้ปิดงวดไปแล้ว");
    throw e;
  }
  await log(me, "finance.close", pr + " รายรับ ฿" + r.totals.income);
  return finSummary({ period: pr }, c, me);
}
export async function finReopen(d: Data, c: Ctx, me: User) {
  const pr = checkPeriod(d.period);
  if (!(await isClosed(pr))) throw err("NOT_FOUND", "เดือนนี้ยังไม่ได้ปิดงวด");
  const pays = await prisma.finPayout.findMany({ where: { period: pr } });
  if (pays.some((x) => x.status === "paid" && x.amount !== 0)) throw err("LOCKED", "มีการจ่ายเงินผู้สอนของเดือนนี้แล้ว เปิดงวดใหม่ไม่ได้ ลงรายการปรับปรุงในเดือนถัดไปแทน");
  await prisma.$transaction([prisma.finPayout.deleteMany({ where: { period: pr } }), prisma.finPeriod.delete({ where: { period: pr } })]);
  await log(me, "finance.reopen", pr);
  return finSummary({ period: pr }, c, me);
}
export async function finPayoutPaid(d: Data, _c: Ctx, me: User) {
  const x = await prisma.finPayout.findUnique({ where: { id: String(d.payout_id || "") } });
  if (!x) throw err("NOT_FOUND", "ไม่พบรายการ");
  await prisma.finPayout.update({ where: { id: x.id }, data: { status: "paid", paidAt: new Date(), paidBy: me.id, note: clip(d.note, 300) } });
  await log(me, "finance.paid", x.id + " ฿" + x.amount);
  return true;
}

/** Teacher dashboard: their subjects only, nothing about members site-wide. */
export async function teacherStats(me: User) {
  const mine = subjectsOf(me);
  const courses = (await prisma.course.findMany({ include: { subject: true } })).filter((c) => mine.includes(subjectKey(c.subject)));
  const cids = courses.map((c) => c.id), slugs = courses.map((c) => c.slug), month = periodOf(new Date());
  const [enrs, pays, bills, expPending] = await Promise.all([
    prisma.enrollment.findMany({ where: { courseId: { in: cids }, ...activeWhere() } }),
    prisma.payment.findMany({ where: { courseId: { in: cids }, status: "APPROVED", amount: { gt: 0 }, OR: [{ reviewedAt: periodRange(month) }, { reviewedAt: null, createdAt: periodRange(month) }] } }),
    prisma.bill.findMany({ where: { status: "reviewing" } }),
    prisma.expense.count({ where: { status: "pending", recordedById: me.id } }),
  ]);
  const subj = mine.map((k) => ({ subject: k, name: APP.SUBJECTS[k], count: 0, revenue: 0, students: 0 }));
  const rowOf = (courseId: string) => { const c = courses.find((x) => x.id === courseId); return c ? subj.find((x) => x.subject === subjectKey(c.subject)) : undefined; };
  for (const e of enrs) { const r = rowOf(e.courseId); if (r) r.students++; }
  for (const p of pays) { const r = rowOf(p.courseId); if (r) { r.count++; r.revenue += p.amount; } }
  const reviewing = bills.filter((b) => (Array.isArray(b.items) ? (b.items as { course_id: string }[]) : []).some((it) => slugs.includes(it.course_id))).length;
  return {
    teacher: true, subjects: mine, by_subject: subj, reviewing, pending: 0, pending_legacy: 0,
    month_revenue: subj.reduce((a, x) => a + x.revenue, 0), month_count: subj.reduce((a, x) => a + x.count, 0),
    courses: courses.length, students: subj.reduce((a, x) => a + x.students, 0), expense_pending: expPending,
  };
}

// ───────────────────────── Students from before the website ─────────────────────────
const NAME_PREFIX = /^(นางสาว|นาย|นาง|น\.ส\.?|ด\.ช\.?|ด\.ญ\.?|เด็กชาย|เด็กหญิง|mr\.?|mrs\.?|ms\.?|miss)\s*/i;
export function normName(s: unknown) {
  return String(s || "").normalize("NFC").replace(/[​-‍﻿]/g, "").replace(/\([^)]*\)?/g, "").trim().replace(NAME_PREFIX, "").replace(/[\s.\-_'’"()]/g, "").toLowerCase();
}
/** First + last name joined without spaces (a surname of several words may be split differently). */
export const nameKey = (first: unknown, last: unknown) => normName(first) + normName(String(last || "").replace(NAME_PREFIX, ""));
function editDist(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let prev: number[] = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
async function legacyGrant(uid: string, rec: { courseIds: string; batch: string }, by: string) {
  for (const slug of csv(rec.courseIds)) {
    const c0 = await prisma.course.findUnique({ where: { slug } });
    const c = c0 && ((await publishedTwin(c0)) || c0);
    if (!c || (await hasAccess(uid, c.id))) continue;
    await prisma.payment.create({
      data: {
        userId: uid, courseId: c.id, amount: 0, promptpayRef: "LEGACY-" + randToken(8), status: "APPROVED", note: "ย้ายจากระบบเก่า" + (rec.batch ? " · " + rec.batch : ""),
        reviewedBy: by, reviewedAt: new Date(), source: "legacy", reason: rec.batch || "",
      },
    });
    await activate(uid, c.id);
  }
}
const QUEUED = { matched: false, queued: true, message: "ส่งเรื่องให้แอดมินตรวจแล้ว รอไม่เกิน 1–2 วัน" };
/** Name match: exactly one open record, nobody else has it → access right away · anything else goes to the admin. */
export async function legacyMatchUser(u: User | null, manual: boolean): Promise<Record<string, unknown>> {
  if (!u || u.role !== "STUDENT") return { matched: false };
  const key = nameKey(u.firstName, u.lastName);
  const recs = await prisma.legacyStudent.findMany({ where: { norm: key, status: { not: "deleted" } } });
  const hasPending = !!(await prisma.legacyClaim.findFirst({ where: { userId: u.id, status: "pending" } }));
  const queue = async (ids: string[], why: string) => {
    if (!hasPending) await prisma.legacyClaim.create({ data: { id: "LC" + shortId(8), userId: u.id, legacyIds: ids.join(","), reason: why } });
    return QUEUED;
  };
  const mineAlready = recs.filter((r) => r.userId === u.id);
  const open = recs.filter((r) => r.status === "open"), taken = recs.filter((r) => r.status === "claimed" && r.userId !== u.id);
  const sig = new Set<string>();
  const dupe = open.some((r) => (sig.has(r.courseIds) ? true : (sig.add(r.courseIds), false)));
  if (!open.length && mineAlready.length) return { matched: true, already: true, courses: [] };
  // One name can be on several lists (a biology batch and a chemistry batch) → take them all · two records for the
  // same courses (maybe two people) or a record someone else already took → the admin decides.
  if (open.length && !dupe && !taken.length) {
    let got: string[] = [];
    for (const r of open) {
      const claimed = await prisma.legacyStudent.updateMany({ where: { id: r.id, status: "open" }, data: { status: "claimed", userId: u.id, claimedAt: new Date(), match: manual ? "auto-manual" : "auto" } });
      if (!claimed.count) continue;
      await legacyGrant(u.id, r, "SYSTEM");
      got = got.concat(csv(r.courseIds));
    }
    await systemLog("legacy.auto", u.email + " ← " + open.map((r) => r.id).join(","));
    return { matched: true, courses: got };
  }
  if (open.length && dupe) return queue(open.map((r) => r.id), "ชื่อ-นามสกุลนี้มีหลายคนในรายชื่อเก่า");
  if (taken.length) return queue(taken.concat(open).map((r) => r.id), "รายชื่อนี้ถูกบัญชีอื่นใช้ไปแล้ว");
  if (mineAlready.length) return { matched: true, already: true, courses: [] };
  if (!manual) return { matched: false };
  const near = (await prisma.legacyStudent.findMany({ where: { status: "open" } })).filter((r) => editDist(r.norm, key) <= 2);
  if (near.length) return queue(near.slice(0, 5).map((r) => r.id), "ชื่อใกล้เคียง (สะกดต่างกันเล็กน้อย)");
  return { matched: false, message: "ไม่พบชื่อ-นามสกุลนี้ในรายชื่อนักเรียนรุ่นเก่า ตรวจว่าสะกดตรงกับตอนสมัครครั้งแรก หรือทักแอดมินทาง IG" };
}
export async function legacyClaim(_d: Data, { p }: Ctx) {
  const u = await auth(p);
  await rate("legacy:" + u.id, 5, 3600, "ลองบ่อยเกินไป ลองใหม่ภายหลัง");
  return legacyMatchUser(u, true);
}
export async function adminLegacy(d: Data) {
  const [recs, courses, claimsRaw] = await Promise.all([
    prisma.legacyStudent.findMany({ where: { status: { not: "deleted" } } }),
    prisma.course.findMany({ select: { slug: true, title: true } }),
    prisma.legacyClaim.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" } }),
  ]);
  const uids = new Set<string>([...recs.map((r) => r.userId || ""), ...claimsRaw.map((c) => c.userId)].filter(Boolean));
  const users = await prisma.user.findMany({ where: { id: { in: Array.from(uids) } } });
  const uinfo = (id: string | null) => {
    const u = id ? users.find((x) => x.id === id) : null;
    return u ? { user_id: u.id, name: u.firstName + " " + u.lastName, nickname: u.nickname || "", email: u.email, has_photo: !!u.photoBlobId, created_at: iso(u.createdAt) } : null;
  };
  const ctitle = (ids: string) => csv(ids).map((id) => courses.find((x) => x.slug === id)?.title || id);
  const q = normName(d.q || ""), st = String(d.status || "claimed");
  const when = (r: (typeof recs)[number]) => iso(r.claimedAt || r.createdAt);
  const list = recs
    .filter((r) => (st === "all" || r.status === st) && (!q || (r.norm + normName(r.nickname)).includes(q)))
    .sort((a, b) => (when(a) < when(b) ? 1 : -1))
    .slice(0, 300)
    .map((r) => ({ legacy_id: r.id, name: r.firstName + " " + r.lastName, nickname: r.nickname, courses: ctitle(r.courseIds), batch: r.batch, status: r.status, match: r.match, claimed_at: iso(r.claimedAt), user: uinfo(r.userId) }));
  const claims = claimsRaw.map((c) => ({
    claim_id: c.id, reason: c.reason, created_at: iso(c.createdAt), user: uinfo(c.userId),
    candidates: csv(c.legacyIds).map((id) => recs.find((x) => x.id === id)).filter(<T,>(x: T | undefined): x is T => !!x)
      .map((r) => ({ legacy_id: r.id, name: r.firstName + " " + r.lastName, nickname: r.nickname, batch: r.batch, courses: ctitle(r.courseIds), status: r.status, user: uinfo(r.userId) })),
  }));
  const batches: Record<string, { batch: string; total: number; claimed: number }> = {};
  for (const r of recs) { const b = r.batch || "—"; batches[b] = batches[b] || { batch: b, total: 0, claimed: 0 }; batches[b].total++; if (r.status === "claimed") batches[b].claimed++; }
  return {
    total: recs.length, claimed: recs.filter((r) => r.status === "claimed").length, open: recs.filter((r) => r.status === "open").length,
    batches: Object.values(batches), claims, list,
  };
}
export async function adminLegacyImport(d: Data, _c: Ctx, me: User) {
  const rows: any[] = (Array.isArray(d.rows) ? d.rows : []).slice(0, 3000);
  const all = await prisma.course.findMany();
  const cids: string[] = [];
  for (const id of csv(d.course_ids)) {
    const c = all.find((x) => x.slug === id);
    if (!c) continue;
    const slug = ((await publishedTwin(c)) || c).slug; // a leftover draft copy → the published course
    if (!cids.includes(slug)) cids.push(slug);
  }
  if (!cids.length) throw err("BAD_INPUT", "เลือกคอร์สที่นักเรียนชุดนี้เคยซื้อ");
  if (!rows.length) throw err("BAD_INPUT", "ไม่มีรายชื่อ");
  const batch = clip(d.batch, 80), bad: number[] = [], keys: string[] = [];
  let dup = 0;
  const have = await prisma.legacyStudent.findMany({ where: { status: { not: "deleted" }, courseIds: cids.join(","), batch } });
  const data: Prisma.LegacyStudentCreateManyInput[] = [];
  rows.forEach((r, i) => {
    const f = clip(r.first_name, 60).replace(NAME_PREFIX, ""), l = clip(r.last_name, 60);
    if (!f || !l) { bad.push(i + 1); return; }
    const key = nameKey(f, l);
    if (have.some((x) => x.norm === key) || keys.includes(key)) { dup++; return; }
    keys.push(key);
    data.push({ id: "LG" + shortId(7) + i, firstName: f, lastName: l, nickname: clip(r.nickname, 40), norm: key, courseIds: cids.join(","), batch, note: clip(r.note, 200) });
  });
  if (data.length) await prisma.legacyStudent.createMany({ data });
  await log(me, "legacy.import", (batch || "-") + " +" + data.length + " → " + cids.join(","));
  // Match against students who already signed up on the website.
  let matched = 0;
  const students = await prisma.user.findMany({ where: { role: "STUDENT", emailVerified: true } });
  for (const u of students) {
    if (!keys.includes(nameKey(u.firstName, u.lastName))) continue;
    const r = await legacyMatchUser(u, false);
    if (r.matched && !r.already) matched++;
  }
  return { added: data.length, duplicate: dup, invalid_rows: bad, matched_existing: matched };
}
async function revokeLegacy(userId: string, courseIds: string, note: string) {
  const slugs = csv(courseIds);
  const pays = await prisma.payment.findMany({ where: { userId, source: "legacy", status: "APPROVED", revokedAt: null }, include: { course: true } });
  for (const e of pays) {
    if (!slugs.includes(e.course.slug)) continue;
    await prisma.payment.update({ where: { id: e.id }, data: { revokedAt: new Date(), note } });
    await prisma.enrollment.updateMany({ where: { userId, courseId: e.courseId }, data: { status: "EXPIRED" } });
  }
}
export async function adminLegacyDecide(d: Data, _c: Ctx, me: User) {
  const c = await prisma.legacyClaim.findUnique({ where: { id: String(d.claim_id || "") } });
  if (!c || c.status !== "pending") throw err("ALREADY", "คำขอนี้ถูกตัดสินไปแล้ว");
  if (d.decision !== "approve") {
    await prisma.legacyClaim.update({ where: { id: c.id }, data: { status: "rejected", decidedBy: me.id, decidedAt: new Date() } });
    await log(me, "legacy.reject", c.id);
    return { status: "rejected" };
  }
  const rec = await prisma.legacyStudent.findUnique({ where: { id: String(d.legacy_id || "") } });
  if (!rec || !csv(c.legacyIds).includes(rec.id)) throw err("BAD_INPUT", "เลือกรายชื่อที่ตรงกับนักเรียนคนนี้");
  if (rec.userId && rec.userId !== c.userId) await revokeLegacy(rec.userId, rec.courseIds, "ย้ายสิทธิ์นักเรียนเก่าไปบัญชีอื่น"); // move it from the other account
  await prisma.legacyStudent.update({ where: { id: rec.id }, data: { status: "claimed", userId: c.userId, claimedAt: new Date(), match: "admin" } });
  await legacyGrant(c.userId, rec, me.id);
  await prisma.legacyClaim.update({ where: { id: c.id }, data: { status: "approved", decidedBy: me.id, decidedAt: new Date() } });
  await log(me, "legacy.approve", c.userId + " ← " + rec.id);
  return { status: "approved" };
}
export async function adminLegacyRelease(d: Data, _c: Ctx, me: User) {
  const rec = await prisma.legacyStudent.findUnique({ where: { id: String(d.legacy_id || "") } });
  if (!rec || !rec.userId) throw err("NOT_FOUND", "รายชื่อนี้ยังไม่มีใครใช้");
  await revokeLegacy(rec.userId, rec.courseIds, "แอดมินถอนสิทธิ์นักเรียนเก่า");
  await prisma.legacyStudent.update({ where: { id: rec.id }, data: { status: "open", userId: null, claimedAt: null, match: "" } });
  await log(me, "legacy.release", rec.id + " จาก " + rec.userId);
  return true;
}
export async function adminLegacyDelete(d: Data, _c: Ctx, me: User) {
  const rec = await prisma.legacyStudent.findUnique({ where: { id: String(d.legacy_id || "") } });
  if (!rec) throw err("NOT_FOUND", "ไม่พบรายชื่อ");
  if (rec.userId) throw err("IN_USE", "รายชื่อนี้มีคนใช้อยู่ ถอนสิทธิ์ก่อนแล้วค่อยลบ");
  await prisma.legacyStudent.update({ where: { id: rec.id }, data: { status: "deleted" } });
  await log(me, "legacy.delete", rec.id);
  return true;
}

// ───────────────────────── Lessons from YouTube playlists ─────────────────────────
// Needs YOUTUBE_API_KEY (YouTube Data API v3) in the environment. The playlist must be public or unlisted.
type Playlist = { id: string; chapter: string; strip: string; title: string; last_sync: string; last_count: number };
const plList = (v: Prisma.JsonValue): Playlist[] => (Array.isArray(v) ? (v as Playlist[]) : []);
export function playlistId(u: unknown) {
  const s = String(u || "").trim(), m = s.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^(PL|UU|OL|FL)[A-Za-z0-9_-]{10,}$/.test(s) ? s : "";
}
export async function playlistsSave(d: Data, _c: Ctx, me: User) {
  const c = await courseFor(me, d.course_id), old = plList(c.playlists);
  const list = (Array.isArray(d.playlists) ? d.playlists : []).slice(0, 10).map((x: any, i: number) => {
    const id = playlistId(x.url || x.id);
    if (!id) throw err("BAD_INPUT", "แถวที่ " + (i + 1) + ": ลิงก์เพลย์ลิสต์ไม่ถูกต้อง (ต้องมี list=...)");
    const prev = old.find((o) => o.id === id);
    return { id, chapter: clip(x.chapter, 120), strip: clip(x.strip, 60), title: prev?.title || "", last_sync: prev?.last_sync || "", last_count: prev?.last_count || 0 };
  });
  await prisma.course.update({ where: { id: c.id }, data: { playlists: list } });
  await log(me, "playlists.save", c.slug + " " + list.map((l: Playlist) => l.id).join(","));
  return list;
}
async function yt(path: string, params: Record<string, string>) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw err("SETUP", "ยังไม่ได้ตั้ง YOUTUBE_API_KEY ใน Vercel (Settings → Environment Variables) ดึงคลิปจากเพลย์ลิสต์ไม่ได้");
  const r = await fetch("https://www.googleapis.com/youtube/v3/" + path + "?" + new URLSearchParams({ ...params, key }));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw err("YOUTUBE", "YouTube ตอบกลับผิดพลาด: " + (j?.error?.message || r.status));
  return j;
}
async function ytItems(pid: string) {
  const out: { id: string; title: string; pos: number; ok: boolean }[] = [];
  let token = "", guard = 0;
  do {
    const res = await yt("playlistItems", { part: "snippet,contentDetails,status", playlistId: pid, maxResults: "50", ...(token ? { pageToken: token } : {}) });
    for (const it of res.items || []) {
      const priv = it.status?.privacyStatus || "";
      out.push({ id: it.contentDetails.videoId, title: it.snippet.title, pos: it.snippet.position, ok: priv !== "private" && !/^(Private|Deleted) video$/.test(it.snippet.title) });
    }
    token = res.nextPageToken || "";
  } while (token && ++guard < 40);
  let title = "";
  try { const pl = await yt("playlists", { part: "snippet", id: pid }); title = pl.items?.[0]?.snippet?.title || ""; } catch {}
  return { items: out.sort((a, b) => a.pos - b.pos), title };
}
async function ytMinutes(ids: string[]) {
  const out: Record<string, number> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const res = await yt("videos", { part: "contentDetails", id: ids.slice(i, i + 50).join(",") });
    for (const v of res.items || []) {
      const m = String(v.contentDetails?.duration || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
      out[v.id] = Math.round((Number(m[1]) || 0) * 60 + (Number(m[2]) || 0) + (Number(m[3]) || 0) / 60);
    }
  }
  return out;
}
function cleanTitle(t: string, strip: string) {
  let s = String(t || "");
  if (strip) s = s.split(strip).join("");
  return s.replace(/^[\s|·\-–—:]+|[\s|·\-–—:]+$/g, "").replace(/\s{2,}/g, " ").slice(0, 160) || String(t || "").slice(0, 160);
}
const ytOf = (l: Lesson) => (l.youtubeUrl || "").match(/([A-Za-z0-9_-]{11})$/)?.[1] || "";
export async function syncCourse(c: Course) {
  const pls = plList(c.playlists);
  if (!pls.length) throw err("BAD_INPUT", "คอร์สนี้ยังไม่ได้ผูกเพลย์ลิสต์");
  const fetched = [];
  for (const pl of pls) fetched.push({ pl, data: await ytItems(pl.id) });
  const result = { added: 0, hidden: 0, restored: 0, titles: [] as string[], playlists: [] as { id: string; title: string; count: number }[] };
  const mine = await prisma.lesson.findMany({ where: { courseId: c.id }, orderBy: { order: "asc" } });
  const byYt: Record<string, Lesson | { pending: true }> = {};
  for (const l of mine) byYt[ytOf(l)] = l;
  const max = mine.reduce((m, l) => Math.max(m, l.order), 0);
  const lastChap = mine.length ? mine[mine.length - 1].chapter || "ตอนใหม่" : "ตอนใหม่";
  const newOnes: { it: { id: string; title: string }; pl: Playlist }[] = [];
  for (const f of fetched) {
    const live = new Set<string>();
    for (const it of f.data.items) {
      if (!it.ok) continue;
      live.add(it.id);
      const l = byYt[it.id];
      if (l) {
        if ("hidden" in l && l.hidden && l.sourcePlaylist === f.pl.id) { await prisma.lesson.update({ where: { id: l.id }, data: { hidden: false } }); result.restored++; }
        continue;
      }
      byYt[it.id] = { pending: true };
      newOnes.push({ it, pl: f.pl });
    }
    for (const l of mine) {
      if (l.sourcePlaylist === f.pl.id && !live.has(ytOf(l)) && !l.hidden) { await prisma.lesson.update({ where: { id: l.id }, data: { hidden: true } }); result.hidden++; }
    }
    f.pl.title = f.data.title || f.pl.title; f.pl.last_sync = new Date().toISOString(); f.pl.last_count = f.data.items.filter((x) => x.ok).length;
    result.playlists.push({ id: f.pl.id, title: f.pl.title, count: f.pl.last_count });
  }
  if (newOnes.length) {
    const mins = await ytMinutes(newOnes.map((x) => x.it.id));
    await prisma.lesson.createMany({
      data: newOnes.map((x, i) => {
        const title = cleanTitle(x.it.title, x.pl.strip);
        result.titles.push(title);
        return { title, chapter: x.pl.chapter || lastChap, youtubeUrl: "https://youtu.be/" + x.it.id, duration: (mins[x.it.id] || 0) * 60, type: "VIDEO" as const, order: max + (i + 1) * 10, courseId: c.id, sourcePlaylist: x.pl.id };
      }),
    });
    result.added = newOnes.length;
  }
  await prisma.course.update({ where: { id: c.id }, data: { playlists: fetched.map((f) => f.pl) } });
  if (result.added || result.hidden || result.restored) await systemLog("playlists.sync", c.slug + " +" + result.added + " ซ่อน " + result.hidden + " คืน " + result.restored);
  return result;
}
export async function courseSync(d: Data, _c: Ctx, me: User) {
  const c = await courseFor(me, d.course_id);
  await rate("sync:" + c.slug, 6, 600, "กดซิงก์บ่อยเกินไป รอสักครู่");
  const r = await syncCourse(c);
  await log(me, "playlists.sync", c.slug + " +" + r.added + " ซ่อน " + r.hidden);
  return r;
}
/** Scheduled (Vercel Cron): every course with playlists; teachers of the subject get an email about new lessons. */
export async function syncPlaylists() {
  const courses = (await prisma.course.findMany({ include: { subject: true } })).filter((c) => plList(c.playlists).length);
  const done: Record<string, unknown> = {};
  for (const c of courses) {
    try {
      const r = await syncCourse(c);
      done[c.slug] = { added: r.added, hidden: r.hidden, restored: r.restored };
      if (r.added) await notifySync(c, r.titles, r.added);
    } catch (e) {
      done[c.slug] = { error: (e as Error).message };
    }
  }
  return done;
}
async function notifySync(c: CourseS, titles: string[], added: number) {
  const k = subjectKey(c.subject);
  let to = (await teachersAll()).filter((u) => subjectsOf(u).includes(k)).map((u) => u.email);
  if (!to.length) to = await adminEmails();
  if (!to.length) return;
  const site = await siteUrlOf();
  const body =
    '<p style="margin:0 0 12px">มีตอนใหม่จากเพลย์ลิสต์ขึ้นในคอร์ส <b>' + esc(c.title) + "</b> แล้ว " + added + " ตอน</p>" +
    '<ul style="margin:0 0 16px;padding-left:18px">' + titles.slice(0, 20).map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>";
  await sendNotice(to, "ตอนใหม่ขึ้นเว็บแล้ว · " + c.title + " (+" + added + ")", "ตอนใหม่จากเพลย์ลิสต์", body, site + "/#/admin/course/" + encodeURIComponent(c.slug), "ดูในหลังบ้าน", await ig());
}

// ───────────────────────── Lesson files (only for students with access) ─────────────────────────
// Kept in the database (private); students download through learn.file, which checks access every time.
// Vercel limits a request to ~4.5 MB, so uploads are up to 3 MB — bigger files go in as a link.
const LESSON_FILE_MAX_BYTES = 3 * 1024 * 1024;
type LessonFile = { fid: string; name: string; mime?: string; size?: number; blob_id?: string; url?: string };
const fileList = (v: Prisma.JsonValue): LessonFile[] => (Array.isArray(v) ? (v as LessonFile[]) : []);
export const filesOut = (l: Pick<Lesson, "files">) => fileList(l.files).map((f) => ({ fid: f.fid, name: f.name, mime: f.mime || "", size: f.size || 0, url: f.url || "" }));
export async function lessonFileAdd(d: Data, _c: Ctx, me: User) {
  const l = await lessonFor(me, d.lesson_id);
  const name = clip(d.name, 120);
  let item: LessonFile;
  if (d.url) {
    const url = clip(d.url, 500);
    if (!/^https:\/\//.test(url)) throw err("BAD_INPUT", "ลิงก์ต้องขึ้นต้นด้วย https://");
    item = { fid: "U" + shortId(8), name: name || "ลิงก์ประกอบ", url };
  } else {
    if (!d.base64) throw err("BAD_INPUT", "เลือกไฟล์");
    const bytes = Math.round(String(d.base64).length * 0.75);
    if (bytes > LESSON_FILE_MAX_BYTES) throw err("BAD_INPUT", "ไฟล์ใหญ่เกิน 3 MB ใส่เป็นลิงก์ (เช่น Google Drive) แทน หรือแยกเป็นหลายไฟล์");
    if (!name) throw err("BAD_INPUT", "ตั้งชื่อไฟล์");
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(d.mime || "") ? d.mime : "application/octet-stream";
    const b = await prisma.fileBlob.create({ data: { mime, data: Buffer.from(String(d.base64), "base64"), isPublic: false } });
    item = { fid: "F" + shortId(8), blob_id: b.id, name, mime, size: bytes };
  }
  const list = fileList(l.files);
  if (list.length >= 20) throw err("BAD_INPUT", "แนบได้สูงสุด 20 ไฟล์ต่อตอน");
  list.push(item);
  await prisma.lesson.update({ where: { id: l.id }, data: { files: list } });
  await log(me, "lesson.file.add", l.id + " " + item.name);
  return filesOut({ files: list });
}
export async function lessonFileDelete(d: Data, _c: Ctx, me: User) {
  const l = await lessonFor(me, d.lesson_id);
  const list = fileList(l.files), gone = list.find((f) => f.fid === d.fid);
  if (!gone) throw err("NOT_FOUND", "ไม่พบไฟล์นี้");
  await prisma.lesson.update({ where: { id: l.id }, data: { files: list.filter((f) => f.fid !== d.fid) } });
  await log(me, "lesson.file.delete", l.id + " " + gone.name);
  if (gone.blob_id) await prisma.fileBlob.delete({ where: { id: gone.blob_id } }).catch(() => {});
  return true;
}
export async function learnFile(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const l = await prisma.lesson.findUnique({ where: { id: String(d.lesson_id || "") }, include: { course: { include: { subject: true } } } });
  if (!l || l.hidden) throw err("NOT_FOUND", "ไม่พบบทเรียน");
  if (!(await hasAccess(u.id, l.courseId)) && !canSubject(u, subjectKey(l.course.subject))) throw err("NO_ACCESS", "ไฟล์นี้สำหรับผู้ที่ลงทะเบียนคอร์สแล้วเท่านั้น");
  const f = fileList(l.files).find((x) => x.fid === d.fid);
  if (!f) throw err("NOT_FOUND", "ไม่พบไฟล์นี้");
  if (f.url) return { name: f.name, url: f.url };
  await rate("file:" + u.id, 120, 3600, "เปิดไฟล์บ่อยเกินไป ลองใหม่ภายหลัง");
  const b = f.blob_id ? await prisma.fileBlob.findUnique({ where: { id: f.blob_id } }) : null;
  if (!b) throw err("NOT_FOUND", "ไม่พบไฟล์นี้");
  return { name: f.name, mime: f.mime || b.mime, base64: Buffer.from(b.data).toString("base64") };
}
/** Rename a chapter (the green header): every lesson in it, in this course. */
export async function chapterRename(d: Data, _c: Ctx, me: User) {
  const c = await courseFor(me, d.course_id), from = String(d.from || ""), to = clip(d.to, 120).replace(/\s*›\s*/g, " › ");
  if (!to) throw err("BAD_INPUT", "ใส่ชื่อบทใหม่");
  const r = await prisma.lesson.updateMany({ where: { courseId: c.id, chapter: from }, data: { chapter: to } });
  if (!r.count) throw err("NOT_FOUND", "ไม่พบบทนี้ ลองรีเฟรชหน้า");
  const pls = plList(c.playlists);
  if (pls.some((pl) => pl.chapter === from)) await prisma.course.update({ where: { id: c.id }, data: { playlists: pls.map((pl) => (pl.chapter === from ? { ...pl, chapter: to } : pl)) } });
  await log(me, "chapter.rename", c.slug + ": " + from + " → " + to);
  return { renamed: r.count, chapter: to };
}

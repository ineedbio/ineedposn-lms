// Free-chapter files for a 2-question survey, "where did you hear of INeedBio" at sign-up, and the admin's การตลาด
// page — a port of the round 7u section of backend/Code.gs (reference/Code.gs): freeFiles_, trialUnlock_,
// trialOffer_, adminCourseTrial_, adminMarketing_, heard_. Same actions, shapes and messages.
import type { Course, Lesson, User } from "@prisma/client";
import { prisma } from "../prisma";
import { auth, enrollState, log, rate, type Ctx, type Data } from "./api";
import { priceCart } from "./shop";
import { filesOut } from "./staff";
import { APP, clip, err, iso } from "./util";

const csv = (v: unknown) => (Array.isArray(v) ? v : String(v || "").split(",")).map((x) => String(x).trim()).filter(Boolean);
export const refClean = (v: unknown) => String(v || "").replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 40);

/** Sign-up: where they heard of INeedBio + the ?ref= code of the link that brought them. Empty is allowed (the web form
 *  asks for it; older clients and the tests don't send it). */
export function heardOf(d: Data) {
  const k = String(d.heard_from || "");
  if (!k) return {};
  if (!APP.HEARD.some((h) => h[0] === k)) throw err("BAD_INPUT", "เลือกว่ารู้จัก INeedBio จากที่ไหน");
  return { heardFrom: k, heardNote: clip(d.heard_note, 80), ref: refClean(d.ref) };
}

type CourseL = Course & { lessons: Lesson[] };
/** The free episodes' files of a course that gives them (names only, never a link or a blob id), or null. */
export function freeFiles(c: CourseL) {
  if (!c.trialFiles) return null;
  const out = c.lessons
    .filter((l) => l.isPreview && !l.hidden)
    .sort((a, b) => a.order - b.order)
    .map((l) => ({ lesson_id: l.id, title: l.title, files: filesOut(l).map((f) => ({ fid: f.fid, name: f.name })) }))
    .filter((l) => l.files.length);
  return out.length ? out : null;
}
export const trialLead = (userId: string, courseId: string) => prisma.trialLead.findUnique({ where: { userId_courseId: { userId, courseId } } });

/** What this account can buy the course for now (with the discounts that really apply, e.g. new members'), or null when
 *  they have it already or it is in an order / slip waiting. */
async function trialOffer(u: User, c: CourseL) {
  if ((await enrollState(u.id, c.id))?.status === "approved") return null;
  const q = await priceCart([c.slug], "", u), it = q.items[0];
  if (!it || it.blocked) return null;
  const full = Math.round(Number(c.fullPrice) || 0);
  const o: Record<string, unknown> = { price: it.price, full_price: full > it.price ? full : 0, total: q.total, discount: q.discount, label: "", ends_at: "" };
  const cp = q.coupon as { ok?: boolean; code?: string; label?: string; new_only?: boolean } | null;
  if (cp && cp.ok && q.discount > 0) {
    const row = await prisma.coupon.findUnique({ where: { code: String(cp.code) } });
    o.label = cp.new_only ? "สมาชิกใหม่" + String(cp.label).replace(/^ลด/, "ลด") : cp.label;
    o.new_only = !!cp.new_only; o.ends_at = iso(row?.endsAt);
  }
  return o;
}

export async function trialUnlock(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const c = await prisma.course.findUnique({ where: { slug: String(d.course_id || "") }, include: { lessons: true } });
  if (!c || !c.isPublished) throw err("NOT_FOUND", "ไม่พบคอร์สนี้");
  const ff = freeFiles(c);
  if (!ff) throw err("NOT_FOUND", "คอร์สนี้ยังไม่มีไฟล์ให้รับฟรี");
  const had = await trialLead(u.id, c.id);
  if (!had) {
    const goals = csv(d.goals).filter((g, i, a) => APP.TRIAL_GOALS.includes(g) && a.indexOf(g) === i);
    if (!goals.length) throw err("BAD_INPUT", "เลือกว่ากำลังเตรียมสอบอะไรอย่างน้อย 1 ข้อ");
    const help = String(d.help || "");
    if (!APP.TRIAL_HELP.includes(help)) throw err("BAD_INPUT", "เลือกเรื่องที่อยากให้พี่ช่วยมากที่สุด");
    await rate("trial:" + u.id, 20, 3600, "ส่งบ่อยเกินไป ลองใหม่ภายหลัง");
    await prisma.trialLead.createMany({
      data: [{ id: "TL" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), userId: u.id, courseId: c.id, goals: goals.join(","), help, ref: refClean(d.ref) || u.ref || "" }],
      skipDuplicates: true, // answered a moment ago in another tab: keep the first answer
    });
  }
  return { files: ff, label: c.trialLabel || "", offer: await trialOffer(u, c), first: !had };
}

export async function adminCourseTrial(d: Data, _c: Ctx, admin: User) {
  const c = await prisma.course.findUnique({ where: { slug: String(d.course_id || "") } });
  if (!c) throw err("NOT_FOUND", "ไม่พบคอร์สนี้");
  const on = d.on === true || d.on === "true", label = clip(d.label, 80);
  await prisma.course.update({ where: { id: c.id }, data: { trialFiles: on, trialLabel: label || null } });
  await log(admin, "course.trial", c.slug + " " + (on ? "TRUE" : "FALSE"));
  return { trial_files: on ? "TRUE" : "FALSE", trial_label: label };
}

/** หลังบ้าน › การตลาด: where sign-ups heard of us (and who of them bought), and the free-chapter leads (and who bought
 *  that course afterwards). d.days = 0 → everything. "Bought" = an approved course payment above ฿0. */
export async function adminMarketing(d: Data) {
  const days = Math.max(0, Number(d.days) || 0), since = new Date(days ? Date.now() - days * 864e5 : 0);
  const [signups, courses, leads0, paid] = await Promise.all([
    prisma.user.findMany({ where: { heardFrom: { not: null }, NOT: { heardFrom: "" }, createdAt: { gte: since } } }),
    prisma.course.findMany({ include: { lessons: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.trialLead.findMany({ where: { createdAt: { gte: since } } }),
    prisma.payment.findMany({ where: { status: "APPROVED", amount: { gt: 0 } }, select: { userId: true, courseId: true, amount: true, createdAt: true } }),
  ]);
  const cOf = new Map(courses.map((c) => [c.id, c]));
  const want = d.course_id ? courses.find((c) => c.slug === String(d.course_id))?.id || "-" : "";
  const ls = leads0.filter((l) => !want || l.courseId === want);
  const heardLabel: Record<string, string> = Object.fromEntries(APP.HEARD);
  const by = APP.HEARD.map(([key, label]) => {
    const list = signups.filter((u) => u.heardFrom === key), ids = new Set(list.map((u) => u.id));
    const mine = paid.filter((e) => ids.has(e.userId));
    return { key, label, n: list.length, buyers: new Set(mine.map((e) => e.userId)).size, sales: mine.reduce((a, e) => a + Math.round(e.amount), 0) };
  });
  const notes = signups.filter((u) => u.heardNote).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 60)
    .map((u) => ({ heard: heardLabel[u.heardFrom || ""] || u.heardFrom, note: u.heardNote, created_at: iso(u.createdAt) }));
  const refs: Record<string, number> = {};
  for (const u of signups) if (u.ref) refs[u.ref] = (refs[u.ref] || 0) + 1;
  const bought = (l: (typeof ls)[number]) => paid.some((e) => e.userId === l.userId && e.courseId === l.courseId && e.createdAt >= l.createdAt);
  const count = (list: string[], key: "goals" | "help") => {
    const o: Record<string, number> = Object.fromEntries(list.map((x) => [x, 0]));
    for (const l of ls) for (const v of csv(l[key])) if (v in o) o[v]++;
    return list.map((k) => ({ label: k, n: o[k] }));
  };
  const byCourse: Record<string, { course_id: string; title: string; n: number; bought: number }> = {};
  for (const l of ls) {
    const c = cOf.get(l.courseId), b = (byCourse[l.courseId] ||= { course_id: c?.slug || l.courseId, title: c?.title || l.courseId, n: 0, bought: 0 });
    b.n++; if (bought(l)) b.bought++;
  }
  const recentRows = ls.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 300);
  const users = new Map((await prisma.user.findMany({ where: { id: { in: recentRows.map((l) => l.userId) } } })).map((u) => [u.id, u]));
  const recent = recentRows.map((l) => {
    const u = users.get(l.userId), c = cOf.get(l.courseId);
    return {
      created_at: iso(l.createdAt), nickname: u?.nickname || "", grade: u?.gradeLevel || "", school: u?.school || "", course: c?.title || l.courseId,
      label: c?.trialLabel || "", heard: heardLabel[u?.heardFrom || ""] || "", heard_note: u?.heardNote || "", goals: l.goals, help: l.help, ref: l.ref || u?.ref || "", bought: bought(l),
    };
  });
  const cs = courses.filter((c) => c.isPublished).map((c) => {
    const pv = c.lessons.filter((l) => l.isPreview && !l.hidden);
    return { course_id: c.slug, title: c.title, on: c.trialFiles, label: c.trialLabel || "", previews: pv.length, files: pv.reduce((a, l) => a + filesOut(l).length, 0) };
  });
  return {
    days,
    signups: { n: signups.length, by, notes, refs: Object.keys(refs).map((k) => ({ ref: k, n: refs[k] })).sort((a, b) => b.n - a.n) },
    leads: { n: ls.length, bought: ls.filter(bought).length, by_course: Object.values(byCourse) },
    goals: count(APP.TRIAL_GOALS, "goals"), help: count(APP.TRIAL_HELP, "help"), recent, courses: cs,
  };
}

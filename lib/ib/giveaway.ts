// INeedBio Birthday Giveaway (round 8c): the public campaign page, the student's application and the admin review.
// Dates and numbers come from lib/giveaway-config.ts. Time is always the server's: GIVEAWAY_NOW (ISO) moves it for
// local runs only (never on Vercel), and the local test server (IB_TEST_HOOKS=1) can set it per test.
// Applications open 7 Nov 69 00:00 (opened early; announced for 9 Nov 00:01). The Story screenshot is required.
// The student never gets the status, the admin note or the result. A winner gets access through grantAccess (amount 0,
// source "grant": not income, no teacher share) and no email is sent (results go out on IG).
import type { Course, GiveawayApplication, Prisma, User } from "@prisma/client";
import { prisma } from "../prisma";
import { GIVEAWAY, menuVisibleAt, phaseAt, purgeAllowedAt } from "../giveaway-config";
import { auth, courseCard, courseInclude, getSetting, grantAccess, isStaffUser, log, rate, setSetting, type Ctx, type Data } from "./api";
import { hasAccess } from "./staff";
import { loadProfiles } from "./team";
import { subjectKey } from "./subjects";
import { APP, clip, err, iso } from "./util";

const C = GIVEAWAY.id;
const STATUSES = ["pending", "review", "approved", "rejected"] as const;
const STATUS_TH: Record<string, string> = { pending: "รอตรวจ", review: "กำลังพิจารณา", approved: "ผ่าน", rejected: "ไม่ผ่าน" };
const hooks = () => process.env.IB_TEST_HOOKS === "1" && process.env.NODE_ENV !== "production";
const TEST_KEY = "test_giveaway_now";

/** Server time for the campaign (ms). */
export async function nowMs() {
  if (hooks()) {
    const t = Date.parse(await getSetting(TEST_KEY));
    if (!isNaN(t)) return t;
  }
  if (!process.env.VERCEL_ENV && process.env.GIVEAWAY_NOW) {
    const t = Date.parse(process.env.GIVEAWAY_NOW);
    if (!isNaN(t)) return t;
  }
  return Date.now();
}
/** Local tests only: set ("" = real time) the campaign clock. */
export async function testSetNow(d: Data) {
  await setSetting(TEST_KEY, clip(d.now, 40));
  return { now: new Date(await nowMs()).toISOString() };
}

const TH_M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
/** "2026-11-07T00:00:00+07:00" → "7 พ.ย. 69 เวลา 00:00" (Thai time). */
export function thDateTime(s: string) {
  const d = new Date(Date.parse(s) + 7 * 36e5);
  return d.getUTCDate() + " " + TH_M[d.getUTCMonth()] + " " + String((d.getUTCFullYear() + 543) % 100).padStart(2, "0") + " เวลา " + d.toISOString().slice(11, 16);
}
const nameOf = (u: Pick<User, "firstName" | "lastName">) => [u.firstName, u.lastName].filter(Boolean).join(" ");
const textLen = (s: string) => Array.from(s).length;

/** "@Name", "instagram.com/name/", "https://www.instagram.com/name?igsh=…" → "name"; "" if it is not a valid username. */
export function normIg(v: unknown) {
  let s = String(v ?? "").trim();
  const m = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/([^/?#\s]+)/i.exec(s);
  if (m) s = m[1];
  s = s.replace(/^@+/, "").trim().toLowerCase();
  return /^(?!.*\.\.)(?!\.)[a-z0-9._]{1,30}(?<!\.)$/.test(s) ? s : "";
}

/** Courses that take part: every published course with a price (bundles are a different table, never included). */
async function giveawayCourses() {
  const cs = await prisma.course.findMany({ where: { isPublished: true, price: { gt: 0 } }, include: courseInclude, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return cs;
}
async function ownedSlugs(userId: string) {
  const es = await prisma.enrollment.findMany({ where: { userId, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, include: { course: true } });
  return es.map((e) => e.course.slug);
}
async function maybeUser(p: Ctx["p"]) {
  if (!p.token) return null;
  try { return await auth(p); } catch { return null; }
}
function timesOut(t: number) {
  return {
    campaign: C, name: GIVEAWAY.name, server_now: new Date(t).toISOString(), phase: phaseAt(t), menu: menuVisibleAt(t),
    show_at: GIVEAWAY.showAt, open_at: GIVEAWAY.openAt, close_at: GIVEAWAY.closeAt, announce_at: GIVEAWAY.announceAt, hide_at: GIVEAWAY.hideAt,
    seats: GIVEAWAY.seats, instagram: GIVEAWAY.instagram, text_min: GIVEAWAY.textMin, text_max: GIVEAWAY.textMax, story_max_bytes: GIVEAWAY.storyMaxBytes,
  };
}

// ───────────────────────── Public ─────────────────────────
/** giveaway.status: dates, the server's time, the courses; with a login also whether this account has applied. */
export async function status(_d: Data, { p }: Ctx) {
  const t = await nowMs(), u = await maybeUser(p);
  await loadProfiles();
  const out: Record<string, unknown> = { ...timesOut(t), courses: (await giveawayCourses()).map(courseCard) };
  if (u) {
    const a = await prisma.giveawayApplication.findUnique({ where: { campaign_userId: { campaign: C, userId: u.id } } });
    out.me = { logged_in: true, staff: isStaffUser(u), applied: !!a, owned: await ownedSlugs(u.id) };
  } else out.me = { logged_in: false, staff: false, applied: false, owned: [] };
  return out;
}

function mineOut(a: GiveawayApplication, c: Course | null, u: User) {
  return {
    application_id: a.id, created_at: iso(a.createdAt), updated_at: iso(a.updatedAt),
    name: nameOf(u), nickname: u.nickname || "", ig: a.igUsername, course_id: c?.slug || "", course_title: c?.title || "",
    reason: a.reason, goal: a.goal, has_story: !!a.storyFile, consent_pdpa: a.consentPdpa,
  };
}
/** giveaway.mine: the account's own application (without status, note or result). */
export async function mine(_d: Data, { p }: Ctx) {
  const u = await auth(p), t = await nowMs();
  const a = await prisma.giveawayApplication.findUnique({ where: { campaign_userId: { campaign: C, userId: u.id } } });
  const c = a ? await prisma.course.findUnique({ where: { id: a.courseId } }) : null;
  return { ...timesOut(t), name: nameOf(u), nickname: u.nickname || "", staff: isStaffUser(u), owned: await ownedSlugs(u.id), application: a ? mineOut(a, c, u) : null };
}

/** A real JPG / PNG / WEBP (by its first bytes, not only the stated type). */
function imageKind(buf: Buffer) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return "";
}
function storyOf(d: Data) {
  const s = d.story;
  if (!s || !s.base64) return null;
  if (!/^image\/(jpeg|png|webp)$/.test(String(s.mime || ""))) throw err("BAD_INPUT", "ภาพหน้าจอ Story ต้องเป็นไฟล์ JPG PNG หรือ WEBP");
  if (String(s.base64).length * 0.75 > GIVEAWAY.storyMaxBytes + 4) throw err("BAD_INPUT", "ภาพหน้าจอ Story ใหญ่เกิน 5 MB");
  const buf = Buffer.from(String(s.base64), "base64");
  if (buf.length > GIVEAWAY.storyMaxBytes) throw err("BAD_INPUT", "ภาพหน้าจอ Story ใหญ่เกิน 5 MB");
  const kind = imageKind(buf);
  if (!kind) throw err("BAD_INPUT", "ไฟล์ที่แนบไม่ใช่รูปภาพ (JPG PNG หรือ WEBP)");
  return { mime: kind, buf };
}

/** Everything a student sends, checked here (the page checks too, but only this counts). */
async function checkForm(d: Data, u: User) {
  const ig = normIg(d.ig);
  if (!ig) throw err("BAD_INPUT", "ชื่อบัญชี Instagram ไม่ถูกต้อง (ตัวอักษรอังกฤษ ตัวเลข จุด หรือ _ ไม่เกิน 30 ตัว)");
  const reason = String(d.reason ?? "").trim(), goal = String(d.goal ?? "").trim();
  for (const [v, label] of [[reason, "ข้อ 04"], [goal, "ข้อ 05"]] as const) {
    const n = textLen(v);
    if (n < GIVEAWAY.textMin) throw err("BAD_INPUT", label + " ต้องมีอย่างน้อย " + GIVEAWAY.textMin + " ตัวอักษร");
    if (n > GIVEAWAY.textMax) throw err("BAD_INPUT", label + " ยาวเกิน " + GIVEAWAY.textMax.toLocaleString("en-US") + " ตัวอักษร");
  }
  if (d.consent_pdpa !== true) throw err("BAD_INPUT", "ติ๊กยินยอมให้เก็บและใช้ข้อมูลก่อนส่งใบสมัคร");
  const c = await prisma.course.findUnique({ where: { slug: String(d.course_id || "").trim() } });
  if (!c || !c.isPublished || !(c.price > 0)) throw err("BAD_INPUT", "เลือกคอร์สที่ร่วมรายการ (คอร์สที่เปิดขาย ไม่รวมแพ็กเกจ)");
  if (await hasAccess(u.id, c.id)) throw err("BAD_INPUT", "น้องมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว เลือกคอร์สอื่น");
  return { ig, reason, goal, c };
}
async function gate(p: Ctx["p"]) {
  const u = await auth(p);
  if (isStaffUser(u)) throw err("FORBIDDEN", "บัญชีแอดมินและผู้สอนร่วมกิจกรรมนี้ไม่ได้");
  const ph = phaseAt(await nowMs());
  if (ph === "pre" || ph === "countdown") throw err("NOT_OPEN", "ยังไม่เปิดรับสมัคร เปิด " + thDateTime(GIVEAWAY.openAt));
  if (ph !== "open") throw err("CLOSED", "ปิดรับสมัครแล้ว");
  return u;
}
/** 5 sends per 10 minutes per account — counted once the form itself is fine (a typo fixed is not an attempt). */
async function limit(u: User) {
  await rate("gv:" + u.id, 5, 600, "ส่งบ่อยเกินไป รอสักครู่แล้วลองใหม่");
}
async function event(applicationId: string, actorId: string, action: string, detail: Record<string, unknown>) {
  await prisma.giveawayEvent.create({ data: { applicationId, actorId, action, detail: detail as Prisma.InputJsonValue } });
}

/** giveaway.apply: the first application (1 per account). */
export async function apply(d: Data, { p }: Ctx) {
  const u = await gate(p);
  if (await prisma.giveawayApplication.findUnique({ where: { campaign_userId: { campaign: C, userId: u.id } } })) throw err("ALREADY", "น้องส่งใบสมัครแล้ว แก้ไขใบเดิมได้จนปิดรับ");
  const f = await checkForm(d, u);
  if (!d.story || !d.story.base64) throw err("BAD_INPUT", "แนบภาพหน้าจอ Story (ข้อ 06)");
  await limit(u);
  const story = storyOf(d)!;
  const blob = await prisma.fileBlob.create({ data: { mime: story.mime, data: story.buf, isPublic: false } });
  let a: GiveawayApplication;
  try {
    a = await prisma.giveawayApplication.create({
      data: { campaign: C, userId: u.id, igUsername: f.ig, courseId: f.c.id, reason: f.reason, goal: f.goal, storyFile: blob.id,
        consentPdpa: true, consentPdpaAt: new Date() },
    });
  } catch (x) {
    await prisma.fileBlob.delete({ where: { id: blob.id } }).catch(() => {});
    if ((x as { code?: string }).code === "P2002") throw err("ALREADY", "น้องส่งใบสมัครแล้ว แก้ไขใบเดิมได้จนปิดรับ");
    throw x;
  }
  await event(a.id, u.id, "submit", { course: f.c.slug, ig: f.ig, story: true });
  return mineOut(a, f.c, u);
}

/** giveaway.edit: change the application until applications close (its status stays as it is). */
export async function edit(d: Data, { p }: Ctx) {
  const u = await gate(p);
  const old = await prisma.giveawayApplication.findUnique({ where: { campaign_userId: { campaign: C, userId: u.id } } });
  if (!old) throw err("NOT_FOUND", "ยังไม่มีใบสมัคร");
  const f = await checkForm(d, u);
  await limit(u);
  // The Story screenshot is required: a new one replaces the old, none sent keeps the old.
  const story = storyOf(d);
  const blob = story ? await prisma.fileBlob.create({ data: { mime: story.mime, data: story.buf, isPublic: false } }) : null;
  const storyFile = blob ? blob.id : old.storyFile;
  if (!storyFile) throw err("BAD_INPUT", "แนบภาพหน้าจอ Story (ข้อ 06)");
  const a = await prisma.giveawayApplication.update({
    where: { id: old.id },
    data: { igUsername: f.ig, courseId: f.c.id, reason: f.reason, goal: f.goal, storyFile, consentPdpa: true, consentPdpaAt: new Date() },
  });
  // The student replaced their own screenshot: the old one goes (it is theirs, nobody else uses it).
  if (old.storyFile && old.storyFile !== storyFile) await prisma.fileBlob.delete({ where: { id: old.storyFile } }).catch(() => {});
  const changed: string[] = [];
  if (old.igUsername !== f.ig) changed.push("ig");
  if (old.courseId !== f.c.id) changed.push("course");
  if (old.reason !== f.reason) changed.push("reason");
  if (old.goal !== f.goal) changed.push("goal");
  if (old.storyFile !== storyFile) changed.push("story");
  await event(a.id, u.id, "edit", { changed, course: f.c.slug, ig: f.ig, story: !!storyFile });
  return mineOut(a, f.c, u);
}

// ───────────────────────── Admin (adminOnly in api.ts) ─────────────────────────
async function lock(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"giveaway:" + C}))`;
}
async function appRow(id: unknown) {
  const a = await prisma.giveawayApplication.findFirst({ where: { id: String(id || ""), campaign: C } });
  if (!a) throw err("NOT_FOUND", "ไม่พบใบสมัครนี้");
  return a;
}

/** admin.giveaway.count: applications waiting (the number by the menu item). */
export async function adminCount() {
  return { pending: await prisma.giveawayApplication.count({ where: { campaign: C, status: "pending" } }) };
}

/** admin.giveaway.list: every application of the campaign + the numbers on top. */
export async function adminList() {
  const t = await nowMs();
  const apps = await prisma.giveawayApplication.findMany({ where: { campaign: C }, orderBy: { createdAt: "asc" } });
  const [users, courses] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: apps.map((a) => a.userId) } } }),
    prisma.course.findMany({ where: { id: { in: Array.from(new Set(apps.flatMap((a) => [a.courseId, a.awardedCourseId || ""]).filter(Boolean))) } }, include: { subject: true } }),
  ]);
  const items = apps.map((a) => {
    const u = users.find((x) => x.id === a.userId), c = courses.find((x) => x.id === a.courseId), g = courses.find((x) => x.id === a.awardedCourseId);
    return {
      id: a.id, created_at: iso(a.createdAt), updated_at: iso(a.updatedAt), nickname: u?.nickname || "", name: u ? nameOf(u) : "", ig: a.igUsername,
      course_id: c?.slug || "", course_title: c?.title || "", subject: c ? subjectKey(c.subject) : "", has_story: !!a.storyFile, story_purged: !!a.storyPurgedAt,
      status: a.status, status_label: STATUS_TH[a.status] || a.status, awarded: !!a.awardedAt, awarded_course_title: g?.title || "",
    };
  });
  const by = (s: string) => apps.filter((a) => a.status === s).length;
  const subjects: Record<string, number> = {};
  for (const k of Object.keys(APP.SUBJECTS)) subjects[k] = items.filter((x) => x.subject === k).length;
  return {
    ...timesOut(t), purge_allowed: purgeAllowedAt(t), purge_at: GIVEAWAY.purgeAt, purged: apps.some((a) => a.storyPurgedAt),
    kpi: { total: apps.length, pending: by("pending"), review: by("review"), approved: by("approved"), rejected: by("rejected"), awarded: apps.filter((a) => a.awardedAt).length, seats: GIVEAWAY.seats },
    subjects, items,
  };
}

/** admin.giveaway.get: one application in full, with its history. */
export async function adminGet(d: Data) {
  const a = await appRow(d.id);
  const [u, c, g, evs] = await Promise.all([
    prisma.user.findUnique({ where: { id: a.userId } }),
    prisma.course.findUnique({ where: { id: a.courseId }, include: { subject: true } }),
    a.awardedCourseId ? prisma.course.findUnique({ where: { id: a.awardedCourseId } }) : null,
    prisma.giveawayEvent.findMany({ where: { applicationId: a.id }, orderBy: { createdAt: "asc" } }),
  ]);
  const actors = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(evs.map((e) => e.actorId))) } } });
  const approved = await prisma.giveawayApplication.count({ where: { campaign: C, status: "approved" } });
  const owned = u ? await ownedSlugs(u.id) : [];
  return {
    id: a.id, status: a.status, status_label: STATUS_TH[a.status] || a.status, created_at: iso(a.createdAt), updated_at: iso(a.updatedAt),
    nickname: u?.nickname || "", name: u ? nameOf(u) : "", ig: a.igUsername, ig_url: "https://www.instagram.com/" + a.igUsername + "/",
    course_id: c?.slug || "", course_title: c?.title || "", subject: c ? subjectKey(c.subject) : "",
    reason: a.reason, goal: a.goal, has_story: !!a.storyFile, story_purged_at: iso(a.storyPurgedAt), consent_pdpa_at: iso(a.consentPdpaAt),
    admin_note: a.adminNote || "", awarded: !!a.awardedAt, awarded_at: iso(a.awardedAt), awarded_course_id: g?.slug || "", awarded_course_title: g?.title || "",
    owns_chosen: !!(u && c && owned.includes(c.slug)), owned, approved_count: approved, seats: GIVEAWAY.seats,
    events: evs.map((e) => {
      const who = actors.find((x) => x.id === e.actorId);
      return { at: iso(e.createdAt), action: e.action, by: who ? who.nickname || who.firstName : "", detail: e.detail };
    }),
  };
}

/** admin.giveaway.story: the Story screenshot (admins only, never public). */
export async function adminStory(d: Data) {
  const a = await appRow(d.id);
  const b = a.storyFile ? await prisma.fileBlob.findUnique({ where: { id: a.storyFile } }) : null;
  if (!b) throw err("NOT_FOUND", a.storyPurgedAt ? "ลบรูป Story ของกิจกรรมนี้แล้ว" : "ใบนี้ไม่ได้แนบภาพหน้าจอ Story");
  return { mime: b.mime, base64: Buffer.from(b.data).toString("base64") };
}

/** admin.giveaway.status: pending | review | approved | rejected. At most `seats` approved, checked under a lock. */
export async function adminStatus(d: Data, _c: Ctx, admin: User) {
  const to = String(d.status || "");
  if (!(STATUSES as readonly string[]).includes(to)) throw err("BAD_INPUT", "สถานะไม่ถูกต้อง");
  const r = await prisma.$transaction(async (tx) => {
    await lock(tx);
    const a = await tx.giveawayApplication.findFirst({ where: { id: String(d.id || ""), campaign: C } });
    if (!a) throw err("NOT_FOUND", "ไม่พบใบสมัครนี้");
    if (a.awardedAt) throw err("AWARDED", "มอบสิทธิ์แล้ว เปลี่ยนสถานะไม่ได้");
    if (a.status === to) return { a, from: a.status };
    if (to === "approved") {
      const n = await tx.giveawayApplication.count({ where: { campaign: C, status: "approved" } });
      if (n >= GIVEAWAY.seats) throw err("FULL", "ผ่านครบ " + GIVEAWAY.seats + " คนแล้ว เปลี่ยนใบอื่นออกจาก \"ผ่าน\" ก่อน");
    }
    const b = await tx.giveawayApplication.update({ where: { id: a.id }, data: { status: to } });
    await tx.giveawayEvent.create({ data: { applicationId: a.id, actorId: admin.id, action: "status", detail: { from: a.status, to } } });
    return { a: b, from: a.status };
  });
  if (r.from !== to) await log(admin, "giveaway.status", r.a.id + " " + r.from + " → " + to);
  return adminGet({ id: r.a.id });
}

/** admin.giveaway.note: the committee's note (students never see it). */
export async function adminNote(d: Data, _c: Ctx, admin: User) {
  const a = await appRow(d.id), note = clip(d.note, 2000);
  if ((a.adminNote || "") !== note) {
    await prisma.giveawayApplication.update({ where: { id: a.id }, data: { adminNote: note || null } });
    await event(a.id, admin.id, "note", { length: Array.from(note).length });
    await log(admin, "giveaway.note", a.id);
  }
  return adminGet({ id: a.id });
}

/** admin.giveaway.award: give an approved winner one course, once, through the usual free grant (no email). */
export async function adminAward(d: Data, _c: Ctx, admin: User) {
  const c = await prisma.course.findUnique({ where: { slug: String(d.course_id || "").trim() } });
  if (!c || !c.isPublished || !(c.price > 0)) throw err("BAD_INPUT", "เลือกคอร์สที่เปิดขาย (ไม่รวมแพ็กเกจ)");
  // Claim the award under the lock first, so two clicks (or two admins) can never grant twice.
  const a = await prisma.$transaction(async (tx) => {
    await lock(tx);
    const x = await tx.giveawayApplication.findFirst({ where: { id: String(d.id || ""), campaign: C } });
    if (!x) throw err("NOT_FOUND", "ไม่พบใบสมัครนี้");
    if (x.awardedAt) throw err("ALREADY", "ใบนี้มอบสิทธิ์ไปแล้ว");
    if (x.status !== "approved") throw err("BAD_INPUT", "มอบสิทธิ์ได้เฉพาะใบที่ \"ผ่าน\"");
    if (await tx.enrollment.findFirst({ where: { userId: x.userId, courseId: c.id, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }))
      throw err("ALREADY", "น้องมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว เลือกคอร์สอื่น");
    return tx.giveawayApplication.update({ where: { id: x.id }, data: { awardedAt: new Date(), awardedBy: admin.id, awardedCourseId: c.id } });
  });
  const u = await prisma.user.findUnique({ where: { id: a.userId } });
  let payId = "";
  try {
    if (!u) throw err("NOT_FOUND", "ไม่พบบัญชีของน้อง");
    const pay = await grantAccess(admin, u, c, { amount: 0, source: "grant", reason: GIVEAWAY.grantNote, note: GIVEAWAY.grantNote, expires: null });
    payId = pay.id;
  } catch (x) {
    await prisma.giveawayApplication.update({ where: { id: a.id }, data: { awardedAt: null, awardedBy: null, awardedCourseId: null } });
    throw x;
  }
  await prisma.giveawayApplication.update({ where: { id: a.id }, data: { awardRef: payId } });
  await event(a.id, admin.id, "award", { course: c.slug, payment: payId });
  await log(admin, "giveaway.award", a.id + " " + (u?.email || "") + " → " + c.slug);
  return adminGet({ id: a.id });
}

const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // a cell is never read as a formula
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
/** admin.giveaway.csv: UTF-8 with BOM (Excel reads Thai). No phone, no email, no full reason. */
export async function adminCsv(_d: Data, _c: Ctx, admin: User) {
  const L = await adminList();
  const notes = await prisma.giveawayApplication.findMany({ where: { campaign: C }, select: { id: true, adminNote: true } });
  const bkk = (s: string) => { const t = Date.parse(s); return isNaN(t) ? "" : new Date(t + 7 * 36e5).toISOString().slice(0, 16).replace("T", " "); };
  const rows = [["ส่งเมื่อ", "ชื่อเล่น", "ชื่อ-นามสกุล", "IG", "วิชา", "คอร์ส", "สถานะ", "คอร์สที่มอบ", "หมายเหตุ"]];
  for (const x of L.items)
    rows.push([bkk(x.created_at), x.nickname, x.name, "@" + x.ig, APP.SUBJECTS[x.subject] || "", x.course_title, x.status_label,
      x.awarded_course_title, (notes.find((n) => n.id === x.id)?.adminNote || "").replace(/\s+/g, " ")]);
  await log(admin, "giveaway.csv", L.items.length + " ใบ");
  return { filename: "birthday-giveaway-" + C + ".csv", csv: "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n" };
}

/** admin.giveaway.purge: delete every Story screenshot of this campaign (from 30 days after the results). */
export async function adminPurge(d: Data, _c: Ctx, admin: User) {
  if (!purgeAllowedAt(await nowMs())) throw err("NOT_YET", "ลบรูป Story ได้ตั้งแต่ 13 ธ.ค. 69 เวลา 17:00");
  if (String(d.confirm || "").trim() !== "ลบรูป") throw err("BAD_INPUT", "พิมพ์คำว่า ลบรูป เพื่อยืนยัน");
  const apps = await prisma.giveawayApplication.findMany({ where: { campaign: C, storyFile: { not: null } } });
  const ids = apps.map((a) => a.storyFile!).filter(Boolean);
  const del = ids.length ? await prisma.fileBlob.deleteMany({ where: { id: { in: ids } } }) : { count: 0 };
  const at = new Date();
  for (const a of apps) {
    await prisma.giveawayApplication.update({ where: { id: a.id }, data: { storyFile: null, storyPurgedAt: at } });
    await event(a.id, admin.id, "purge_story", { file: a.storyFile });
  }
  await log(admin, "giveaway.purge_story", del.count + " ไฟล์");
  return { deleted: del.count, applications: apps.length };
}

// Teachers (rounds 3–4, ported from reference/Code.gs): teacher profiles (name, photo, bio, bank account),
// the team of each subject (adding / removing a teacher re-splits the subject's % from a start date and
// emails an invite), what a new teacher still has to fill in, and a teacher's price / status request on a course.
import type { Course, User } from "@prisma/client";
import { prisma } from "../prisma";
import { subjectKey } from "./subjects";
import { endSessions, getSetting, ig, isAdminUser, log, siteUrlOf, subjectsOf, type Ctx, type Data } from "./api";
import { sendTeacherInvite } from "./mail";
import { saveSplitVersion, subjectSplits, periodClosed, periodOf, dateOfDay } from "./staff";
import { APP, clip, err, iso, lines, req, trim } from "./util";

const csv = (s: unknown) => (Array.isArray(s) ? s : String(s || "").split(",")).map(trim).filter(Boolean);
const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
const isStaff = (u: Pick<User, "role">) => u.role === "ADMIN" || u.role === "INSTRUCTOR";
const roleOf = (u: User) => (u.role === "ADMIN" ? "admin" : u.role === "INSTRUCTOR" ? "teacher" : "student");
const todayBkk = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

export type Profile = {
  user_id: string; display_name: string; title: string; bio: string[]; photo_url: string;
  bank_name: string; account_name: string; account_no: string; updated_at: string; auto: boolean;
};
type InstructorFields = Pick<Course, "instructorName" | "instructorTitle" | "instructorBio" | "instructorPhoto" | "instructor2Name" | "instructor2Title" | "instructor2Bio" | "instructor2Photo">;
const bare = (n: string) => String(n || "").replace(/^พี่\s*/, "").trim();

/** A staff member without a saved profile: built from sign-up data (nickname, name) and the old instructor
 *  fields of a course whose instructor name matches the nickname. Nothing is saved until "บันทึก". */
function autoProfile(u: User, courses: InstructorFields[]): Profile {
  const nick = String(u.nickname || "").trim(), dn = nick ? (/^พี่/.test(nick) ? nick : "พี่" + nick) : u.firstName || "";
  const c = nick ? courses.find((x) => [x.instructorName, x.instructor2Name].some((n) => n && bare(n) === bare(nick))) : undefined;
  const two = !!c && bare(c.instructor2Name || "") === bare(nick);
  return {
    user_id: u.id, display_name: dn, title: (c && (two ? c.instructor2Title : c.instructorTitle)) || (u.firstName + " " + u.lastName).trim(),
    bio: c ? lines(two ? c.instructor2Bio : c.instructorBio, 20, 200) : [], photo_url: (c && (two ? c.instructor2Photo : c.instructorPhoto)) || "",
    bank_name: "", account_name: "", account_no: "", updated_at: "", auto: true,
  };
}
const profileRowOut = (t: { userId: string; displayName: string; title: string; bio: unknown; photoUrl: string; bankName: string; accountName: string; accountNo: string; updatedAt: Date }): Profile => ({
  user_id: t.userId, display_name: t.displayName, title: t.title, bio: Array.isArray(t.bio) ? (t.bio as unknown[]).map(String) : [],
  photo_url: t.photoUrl, bank_name: t.bankName, account_name: t.accountName, account_no: t.accountNo, updated_at: iso(t.updatedAt), auto: false,
});
const instructorSelect = { instructorName: true, instructorTitle: true, instructorBio: true, instructorPhoto: true, instructor2Name: true, instructor2Title: true, instructor2Bio: true, instructor2Photo: true } as const;

/** The profile of a teacher or admin (saved, or built from sign-up data); null for students / unknown ids. */
export async function profileOf(uid: string): Promise<Profile | null> {
  const t = await prisma.teacherProfile.findUnique({ where: { userId: uid } });
  if (t) return profileRowOut(t);
  const u = await prisma.user.findUnique({ where: { id: uid } });
  if (!u || !isStaff(u)) return null;
  return autoProfile(u, await prisma.course.findMany({ select: instructorSelect }));
}

// ── Profiles on course pages and cards ──
// courseCard() is synchronous and used everywhere, so the profiles are loaded once per request that shows
// courses (see handle() in api.ts) and read from here.
let cache: Map<string, Profile> | null = null;
export async function loadProfiles() {
  const [rows, staff, courses] = await Promise.all([
    prisma.teacherProfile.findMany(),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "INSTRUCTOR"] } } }),
    prisma.course.findMany({ select: instructorSelect }),
  ]);
  const m = new Map<string, Profile>();
  for (const u of staff) m.set(u.id, autoProfile(u, courses));
  for (const t of rows) if (m.has(t.userId)) m.set(t.userId, profileRowOut(t)); // profiles of former staff are not shown
  cache = m;
}
type Instructor = { name: string; title: string; bio: string; photo: string };
/** Who teaches a course: its chosen teachers' profiles, else the course's own instructor fields. */
export function instructorsOf(x: InstructorFields & Pick<Course, "teacherIds">): Instructor[] {
  const ids = csv(x.teacherIds);
  if (ids.length && cache) {
    const ps = ids.map((id) => cache!.get(id)).filter((p): p is Profile => !!p);
    if (ps.length) return ps.map((t) => ({ name: t.display_name, title: t.title, bio: t.bio.join("\n"), photo: t.photo_url }));
  }
  return [
    [x.instructorName, x.instructorTitle, x.instructorBio, x.instructorPhoto],
    [x.instructor2Name, x.instructor2Title, x.instructor2Bio, x.instructor2Photo],
  ]
    .filter((k) => k[0])
    .map((k) => ({ name: k[0]!, title: k[1] || "", bio: k[2] || "", photo: k[3] || "" }));
}

// ── Routes: profiles ──
/** teacher.profile — a teacher gets their own; an admin may pass user_id. */
export async function teacherProfile(d: Data, _c: Ctx, me: User) {
  const uid = isAdminUser(me) && d.user_id ? String(d.user_id) : me.id;
  const t = await profileOf(uid);
  if (!t) throw err("NOT_FOUND", "ผู้ใช้นี้ไม่ได้มียศผู้สอน");
  const u = await prisma.user.findUnique({ where: { id: uid } });
  const courses = await prisma.course.findMany({ where: { teacherIds: { contains: uid } }, select: { slug: true, title: true, teacherIds: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return {
    ...t, full_name: u ? u.firstName + " " + u.lastName : "", nickname: u?.nickname || "", role: u ? roleOf(u) : "", subjects: u && u.role === "INSTRUCTOR" ? subjectsOf(u) : [],
    courses: courses.filter((c) => csv(c.teacherIds).includes(uid)).map((c) => ({ course_id: c.slug, title: c.title })),
  };
}
/** teacher.profile.save — same rights as teacher.profile; the photo must be an https link (from admin.upload). */
export async function teacherProfileSave(d: Data, c: Ctx, me: User) {
  const uid = isAdminUser(me) && d.user_id ? String(d.user_id) : me.id;
  const u = await prisma.user.findUnique({ where: { id: uid } });
  if (!u || !isStaff(u)) throw err("NOT_FOUND", "ผู้ใช้นี้ไม่ได้มียศผู้สอน");
  const photo = clip(d.photo_url, 500);
  if (photo && !/^https:\/\//.test(photo)) throw err("BAD_INPUT", "อัปโหลดรูปใหม่อีกครั้ง");
  const bio = (Array.isArray(d.bio) ? d.bio : []).map((x: unknown) => String(x || "").trim().slice(0, 200)).filter(Boolean).slice(0, 20);
  const data = {
    displayName: req(d.display_name, "ชื่อที่แสดง", 60), title: clip(d.title, 160), bio, photoUrl: photo,
    bankName: clip(d.bank_name, 60), accountName: clip(d.account_name, 120), accountNo: String(d.account_no || "").replace(/[^\d-]/g, "").slice(0, 24),
  };
  await prisma.teacherProfile.upsert({ where: { userId: uid }, create: { userId: uid, ...data }, update: data });
  await log(me, "teacher.profile", uid);
  return teacherProfile({ user_id: uid }, c, me);
}
/** admin.teachers — every teacher and admin with their profile summary. */
export async function adminTeachers() {
  const [staff, courses] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "INSTRUCTOR"] } }, orderBy: { createdAt: "asc" } }),
    prisma.course.findMany({ select: { teacherIds: true } }),
  ]);
  const out = [];
  for (const u of staff) {
    const t = (await profileOf(u.id))!;
    out.push({
      user_id: u.id, display_name: t.display_name, title: t.title, photo_url: t.photo_url, role: roleOf(u), subjects: u.role === "INSTRUCTOR" ? subjectsOf(u) : [],
      has_bank: !!(t.account_no && t.account_name), courses: courses.filter((c) => csv(c.teacherIds).includes(u.id)).length,
    });
  }
  return out;
}
/** What a teacher still has to fill in before using the back office: name, photo, bank account. */
export async function profileTodo(u: User): Promise<string[]> {
  if (u.role !== "INSTRUCTOR") return [];
  const t = await prisma.teacherProfile.findUnique({ where: { userId: u.id } });
  const out: string[] = [];
  if (!t?.displayName) out.push("name");
  if (!t?.photoUrl) out.push("photo");
  if (!t?.accountNo || !t.accountName || !t.bankName) out.push("bank");
  return out;
}

// ── Routes: the team of a subject ──
/** The split in force on a day (none set = equal among the subject's teachers). */
async function currentParts(sj: string, asOf?: string) {
  const day = asOf || todayBkk();
  const vs = ((await subjectSplits())[sj] || []).filter((v) => v.from <= day), v = vs[vs.length - 1];
  if (v && v.parts.length) return v.parts.map((x) => ({ user_id: x.user_id, pct: Number(x.pct) }));
  const ts = (await prisma.user.findMany({ where: { role: "INSTRUCTOR" }, orderBy: { createdAt: "asc" } })).filter((u) => subjectsOf(u).includes(sj));
  return ts.map((u) => ({ user_id: u.id, pct: r2(100 / ts.length) }));
}
/** Round to 2 decimals and put the rounding difference on the last person, so the total is exactly 100. */
function roundTo100(parts: { user_id: string; pct: number }[]) {
  parts.forEach((x) => (x.pct = r2(x.pct)));
  const tot = parts.reduce((a, x) => a + x.pct, 0);
  if (parts.length) parts[parts.length - 1].pct = r2(parts[parts.length - 1].pct + 100 - tot);
  return parts;
}
async function teamFrom(d: Data) {
  const from = String(d.from || todayBkk()).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || isNaN(dateOfDay(from).getTime())) throw err("BAD_INPUT", "เลือกวันเริ่มมีผล");
  if (await periodClosed(periodOf(dateOfDay(from)))) throw err("LOCKED", "งวดของวันที่เลือกปิดไปแล้ว");
  return from;
}
async function sendInvite(u: User, sj: string) {
  try {
    await sendTeacherInvite(u.email, u.nickname || u.firstName || "", APP.SUBJECTS[sj] || sj, (await getSetting("site_url")) || (await siteUrlOf()), await ig());
  } catch (e) {
    console.error("[ib] teacher invite", e);
  }
}
/** admin.team.add { user_id | email, subject, from } — make them a teacher of the subject (a first-time teacher
 *  signs in again), split the subject equally among everyone from `from`, and email an invite to fill in the profile. */
export async function adminTeamAdd(d: Data, _c: Ctx, me: User) {
  const sj = String(d.subject || "");
  if (!APP.SUBJECTS[sj]) throw err("BAD_INPUT", "เลือกวิชา");
  const from = await teamFrom(d);
  const key = String(d.user || d.email || "").trim().toLowerCase();
  const u = d.user_id ? await prisma.user.findUnique({ where: { id: String(d.user_id) } }) : key ? await prisma.user.findFirst({ where: { email: { equals: key, mode: "insensitive" } } }) : null;
  if (!u) throw err("NOT_FOUND", "ไม่พบผู้ใช้นี้ ให้ผู้สอนสมัครสมาชิกก่อน");
  if (u.isBanned) throw err("BAD_INPUT", "บัญชีนี้ถูกระงับ");
  const cur = await currentParts(sj, from);
  if (u.role === "INSTRUCTOR" && subjectsOf(u).includes(sj) && cur.some((x) => x.user_id === u.id)) throw err("ALREADY", "เป็นผู้สอนวิชานี้อยู่แล้ว");
  const parts = cur.filter((x) => x.user_id !== u.id);
  parts.push({ user_id: u.id, pct: 0 });
  parts.forEach((x) => (x.pct = 100 / parts.length));
  roundTo100(parts);
  if (u.role !== "ADMIN") {
    const fresh = u.role !== "INSTRUCTOR", subs = u.role === "INSTRUCTOR" ? subjectsOf(u) : [];
    if (!subs.includes(sj)) subs.push(sj);
    await prisma.user.update({ where: { id: u.id }, data: { role: "INSTRUCTOR", subjects: subs.join(","), instructorSubjectKey: subs[0] } });
    if (fresh) await endSessions(u.id, "admin");
  }
  await log(me, "team.add", u.email + " " + sj);
  await saveSplitVersion(sj, from, parts, me);
  await sendInvite(u, sj);
  return { parts, from };
}
/** admin.team.remove { user_id, subject, from } — take the subject away (none left = student again), take them
 *  off that subject's courses, and give their part to the others in proportion from `from`. */
export async function adminTeamRemove(d: Data, _c: Ctx, me: User) {
  const sj = String(d.subject || "");
  if (!APP.SUBJECTS[sj]) throw err("BAD_INPUT", "เลือกวิชา");
  const from = await teamFrom(d);
  const u = await prisma.user.findUnique({ where: { id: String(d.user_id || "") } });
  if (!u) throw err("NOT_FOUND", "ไม่พบผู้ใช้");
  const parts = (await currentParts(sj, from)).filter((x) => x.user_id !== u.id);
  const tot = parts.reduce((a, x) => a + x.pct, 0);
  parts.forEach((x) => (x.pct = tot > 0 ? (x.pct / tot) * 100 : 100 / parts.length));
  roundTo100(parts);
  if (u.role === "INSTRUCTOR") {
    const subs = subjectsOf(u).filter((s) => s !== sj);
    await prisma.user.update({
      where: { id: u.id },
      data: subs.length ? { subjects: subs.join(","), instructorSubjectKey: subs[0] } : { role: "STUDENT", subjects: null, instructorSubjectKey: null },
    });
    if (!subs.length) await endSessions(u.id, "admin");
  }
  const courses = await prisma.course.findMany({ where: { teacherIds: { contains: u.id } }, include: { subject: true } });
  for (const c of courses) {
    if (subjectKey(c.subject) !== sj || !csv(c.teacherIds).includes(u.id)) continue;
    await prisma.course.update({ where: { id: c.id }, data: { teacherIds: csv(c.teacherIds).filter((x) => x !== u.id).join(",") } });
  }
  await log(me, "team.remove", u.email + " " + sj);
  await saveSplitVersion(sj, from, parts, me);
  return { parts, from };
}
/** Sent when admin.user.update makes someone a teacher for the first time. */
export const inviteNewTeacher = sendInvite;

// ── Routes: a teacher's price / status request ──
/** admin.course.request { course_id, decision: approve | reject } — apply or drop the waiting request. */
export async function adminCourseRequest(d: Data, _c: Ctx, me: User) {
  const c = await prisma.course.findUnique({ where: { slug: String(d.course_id || "") } });
  if (!c || !c.pendingChange) throw err("NOT_FOUND", "ไม่มีคำขอของคอร์สนี้");
  let w: Record<string, unknown> = {};
  try { w = JSON.parse(c.pendingChange) || {}; } catch {}
  const approve = d.decision === "approve";
  const data: Record<string, unknown> = { pendingChange: "" };
  if (approve) {
    if (w.price != null && Number(w.price) >= 0) data.price = Math.round(Number(w.price));
    if (w.full_price != null) data.fullPrice = w.full_price === "" ? null : Math.max(0, Number(w.full_price) || 0);
    if (w.status === "published" || w.status === "draft") data.isPublished = w.status === "published";
  }
  await prisma.course.update({ where: { id: c.id }, data });
  await log(me, "course.request." + (approve ? "approve" : "reject"), c.slug + " " + c.pendingChange);
  return true;
}

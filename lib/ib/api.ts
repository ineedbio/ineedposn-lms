// The INeedBio web app's backend (public/ineedbio/app.js → POST /api/ib), backed by Neon via Prisma.
// A port of backend/Code.gs: same actions, same request/response shapes and error codes/messages,
// but reading and writing the existing tables instead of a Google Sheet:
//   Users → User · Sessions → IbSession · Courses/Lessons → Course/Lesson(+Attachment)
//   Enrollments → Payment (the request + slip) and Enrollment (ACTIVE = may study)
//   Progress → LessonProgress · Results → StudentResult · Settings → Setting · AdminLog → AuditLog
// Ids the web app shows or puts in URLs: user_id = User.id, course_id = Course.slug,
// lesson_id = Lesson.id, enroll_id = Payment.id, result_id = StudentResult.id.
import bcrypt from "bcryptjs";
import type { Course, Lesson, Attachment, Payment, Enrollment, Prisma, Subject, User, OtpPurpose } from "@prisma/client";
import { prisma } from "../prisma";
import { rateLimit } from "../rate-limit";
import { subjectKey } from "./subjects";
import { notifyAdmins, remainingQuota, sendDecisionEmail, sendOtpEmail } from "./mail";
import {
  APP, ApiError, bkkDate, checkImageUrl, checkPassword, clip, err, iso, isRepeat, lines, normEmail, otpCode, parseFaq,
  phone, randToken, req, sha256, slug, topCount, trim, youtubeId,
} from "./util";

/** Accounts that are always admins (promoted on registration / next login). */
const BOOTSTRAP_ADMINS = ["ineedbio1803@gmail.com"];

type Data = Record<string, any>;
export type Payload = { action?: string; data?: Data; token?: string; device_id?: string; device_info?: string };
export type Ctx = { p: Payload };
type Handler = (d: Data, ctx: Ctx) => Promise<unknown>;

// ───────────────────────── Settings ─────────────────────────
const PUBLIC_SETTINGS = ["terms_text", "privacy_text", "hero_eyebrow", "hero_title", "hero_subtitle", "announcement", "promptpay_id", "promptpay_name", "contact_ig", "contact_phone"];
const DEFAULT_SETTINGS: Record<string, string> = {
  hero_eyebrow: "INeedBio Online",
  hero_title: "ติวเข้ม ม.ปลาย|กับ INeedBio",
  hero_subtitle: "คอร์สเดียว เรียนได้ตลอดชีพ ไม่มีการลบคลิป",
  announcement: "",
  promptpay_id: process.env.PROMPTPAY_ID || "0910256171",
  promptpay_name: "INeedBio",
  contact_ig: "ineedbiochem",
  contact_phone: "091-025-6171",
  admin_emails: process.env.ADMIN_NOTIFICATION_EMAIL || "",
  terms_text: "",
  privacy_text: "",
};

async function allSettings() {
  const o: Record<string, string> = {};
  for (const r of await prisma.setting.findMany()) o[r.key] = r.value;
  return o;
}
async function getSetting(k: string) {
  const r = await prisma.setting.findUnique({ where: { key: k } });
  return r ? r.value : DEFAULT_SETTINGS[k];
}
async function setSetting(k: string, v: string) {
  await prisma.setting.upsert({ where: { key: k }, create: { key: k, value: v }, update: { value: v } });
}
const ig = async () => (await getSetting("contact_ig")) || "ineedbiochem";
const adminEmails = async () => String((await getSetting("admin_emails")) || "").split(",").map(trim).filter(Boolean);

async function publicSettings() {
  const s = await allSettings();
  const o: Record<string, unknown> = {};
  for (const k of PUBLIC_SETTINGS) o[k] = k in s ? s[k] : DEFAULT_SETTINGS[k];
  o.subjects = APP.SUBJECTS;
  o.levels = APP.LEVELS;
  o.repeat_grades = APP.REPEAT_GRADES;
  o.terms_version = APP.TERMS_VERSION;
  return o;
}

async function log(admin: User, action: string, detail: string) {
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "ib." + action, target: clip(detail, 500) } });
}
async function rate(key: string, limit: number, sec: number, msg: string) {
  const r = await rateLimit("ib", key, { limit, windowSeconds: sec });
  if (!r.allowed) throw err("RATE_LIMIT", msg);
}

// ───────────────────────── Users & sessions ─────────────────────────
function publicUser(u: User) {
  const instSubj = (u as any).instructorSubjectKey || "";
  return {
    user_id: u.id, email: u.email, first_name: u.firstName, last_name: u.lastName, nickname: u.nickname || "",
    school: u.school || "", grade: u.gradeLevel || "", phone: u.phone || "",
    role: u.role === "ADMIN" || u.role === "INSTRUCTOR" ? "admin" : "student",
    staff_role: u.role === "ADMIN" ? "admin" : u.role === "INSTRUCTOR" ? "instructor" : "student",
    status: u.isBanned ? "banned" : "active", created_at: iso(u.createdAt),
    current_faculty: u.currentFaculty || "", current_university: u.currentUniversity || "",
    dream_faculty: u.dreamFaculty || "", dream_university: u.dreamUniversity || "",
    is_repeat: isRepeat(u.gradeLevel), terms_version: u.termsVersion || "",
    instructor_subject: instSubj,
    instructor_subject_name: instSubj && APP.SUBJECTS[instSubj] ? APP.SUBJECTS[instSubj] : "",
    is_super: isSuperAdmin(u),
  };
}
const hashPw = (pw: string) => bcrypt.hash(pw, 10);
const isSuperAdmin = (u: User) => u.role === "ADMIN";
const isStaff = (u: User) => u.role === "ADMIN" || u.role === "INSTRUCTOR";
const isAdmin = isStaff;
const instructorSubject = (u: User) => (u.role === "INSTRUCTOR" ? (u as any).instructorSubjectKey || "bio" : null);

/** Sign-up goals: dream faculty/university for everyone, current ones for "เด็กซิ่ว" (finished ม.6). */
function goals(d: Data, grade: string) {
  const out = {
    dreamFaculty: req(d.dream_faculty, "คณะในฝัน", 120),
    dreamUniversity: req(d.dream_university, "มหาวิทยาลัยในฝัน", 120),
    currentFaculty: "",
    currentUniversity: "",
  };
  if (isRepeat(grade)) {
    out.currentFaculty = req(d.current_faculty, "คณะที่เรียนอยู่ปัจจุบัน", 120);
    out.currentUniversity = req(d.current_university, "มหาวิทยาลัยที่เรียนอยู่ปัจจุบัน", 120);
  }
  return out;
}
function profileFields(d: Data) {
  const grade = req(d.grade, "ระดับชั้น", 20);
  return {
    firstName: req(d.first_name, "ชื่อ", 60), lastName: req(d.last_name, "นามสกุล", 60),
    nickname: req(d.nickname, "ชื่อเล่น", 30), school: req(d.school, "โรงเรียน", 120),
    gradeLevel: grade, phone: phone(d.phone), ...goals(d, grade),
  };
}

/** New session for this device; every other session of the user ends (1 account = 1 device). */
async function newSession(u: User, p: Payload) {
  const device = clip(p.device_id, 64);
  const now = new Date();
  await prisma.ibSession.updateMany({ where: { userId: u.id, endedAt: null, deviceId: { not: device } }, data: { endedAt: now, endReason: "replaced" } });
  await prisma.ibSession.updateMany({ where: { userId: u.id, endedAt: null }, data: { endedAt: now, endReason: "relogin" } });
  const token = randToken(24);
  await prisma.ibSession.create({
    data: { tokenHash: sha256(token), userId: u.id, deviceId: device, deviceInfo: clip(p.device_info, 120), expiresAt: new Date(Date.now() + APP.SESSION_DAYS * 864e5) },
  });
  if (Math.random() < 0.05) {
    prisma.ibSession.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { endedAt: { lt: new Date(Date.now() - 7 * 864e5) } }] } }).catch(() => {});
  }
  return token;
}
async function endSessions(userId: string, reason: string) {
  await prisma.ibSession.updateMany({ where: { userId, endedAt: null }, data: { endedAt: new Date(), endReason: reason } });
}

async function auth(p: Payload) {
  const token = String(p.token || "");
  if (!token) throw err("AUTH", "กรุณาเข้าสู่ระบบ");
  const s = await prisma.ibSession.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!s) throw err("AUTH", "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  if (s.endedAt) {
    if (s.endReason === "replaced") throw err("SESSION_REPLACED", "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น จึงออกจากระบบในเครื่องนี้แล้ว");
    throw err("AUTH", "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }
  if (s.expiresAt < new Date()) throw err("AUTH", "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  if (s.user.isBanned) throw err("BANNED", "บัญชีนี้ถูกระงับ ติดต่อแอดมินทาง IG");
  return s.user;
}
function adminOnly(fn: (d: Data, ctx: Ctx, admin: User) => Promise<unknown>): Handler {
  return async (d, ctx) => {
    const u = await auth(ctx.p);
    if (!isStaff(u)) throw err("FORBIDDEN", "หน้านี้สำหรับแอดมินหรือผู้สอนเท่านั้น");
    return fn(d, ctx, u);
  };
}

function superAdminOnly(fn: (d: Data, ctx: Ctx, admin: User) => Promise<unknown>): Handler {
  return async (d, ctx) => {
    const u = await auth(ctx.p);
    if (!isSuperAdmin(u)) throw err("FORBIDDEN", "หน้านี้สำหรับแอดมินหลักเท่านั้น");
    return fn(d, ctx, u);
  };
}
async function promoteIfBootstrap(u: User) {
  if (BOOTSTRAP_ADMINS.includes(u.email.toLowerCase()) && u.role !== "ADMIN") {
    u = await prisma.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
    const list = await adminEmails();
    if (!list.includes(u.email)) await setSetting("admin_emails", [...list, u.email].join(","));
  }
  return u;
}

// One-time codes (OtpToken, hashed, 10 minutes, 5 tries).
async function issueOtp(userId: string, purpose: OtpPurpose) {
  await prisma.otpToken.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
  const code = otpCode();
  await prisma.otpToken.create({ data: { userId, purpose, codeHash: sha256(code), expiresAt: new Date(Date.now() + APP.OTP_MINUTES * 60e3) } });
  return code;
}
async function checkOtp(userId: string, purpose: OtpPurpose, otp: unknown) {
  const t = await prisma.otpToken.findFirst({ where: { userId, purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!t || t.expiresAt < new Date()) throw err("OTP_EXPIRED", "รหัสหมดอายุแล้ว กดขอรหัสใหม่");
  if (t.attempts >= APP.OTP_MAX_TRIES) {
    await prisma.otpToken.update({ where: { id: t.id }, data: { consumedAt: new Date() } });
    throw err("OTP_EXPIRED", "กรอกผิดเกิน 5 ครั้ง กดขอรหัสใหม่");
  }
  if (sha256(String(otp || "").replace(/\D/g, "")) !== t.codeHash) {
    await prisma.otpToken.update({ where: { id: t.id }, data: { attempts: { increment: 1 } } });
    throw err("OTP_INVALID", "รหัสไม่ถูกต้อง (เหลืออีก " + (APP.OTP_MAX_TRIES - t.attempts - 1) + " ครั้ง)");
  }
  await prisma.otpToken.update({ where: { id: t.id }, data: { consumedAt: new Date() } });
}

// ───────────────────────── Auth actions ─────────────────────────
async function registerStart(d: Data) {
  const email = normEmail(d.email);
  const f = profileFields(d);
  if (d.accept_terms !== true && d.accept_terms !== "true") throw err("BAD_INPUT", "กรุณายอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัวก่อนสมัคร");
  checkPassword(d.password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerified) throw err("EMAIL_TAKEN", "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบหรือกดลืมรหัสผ่าน");
  await rate("otp1:" + email, 1, 60, "รอ 1 นาทีก่อนขอรหัสใหม่");
  await rate("otpH:" + email, 6, 3600, "ขอรหัสบ่อยเกินไป ลองใหม่ในอีก 1 ชั่วโมง");
  // The account is created unverified and only becomes usable once the emailed code is entered.
  const data = { ...f, password: await hashPw(String(d.password)), termsVersion: APP.TERMS_VERSION, termsAcceptedAt: new Date() };
  const u = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data: { ...data, email, emailVerified: false } });
  const otp = await issueOtp(u.id, "EMAIL_VERIFY");
  await sendOtpEmail(email, otp, f.nickname, "register", await ig());
  return { email, expires_in: APP.OTP_MINUTES * 60 };
}

async function registerVerify(d: Data, { p }: Ctx) {
  const email = normEmail(d.email);
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) throw err("OTP_EXPIRED", "รหัสหมดอายุแล้ว กดขอรหัสใหม่");
  if (u.emailVerified) throw err("EMAIL_TAKEN", "อีเมลนี้สมัครไว้แล้ว");
  await checkOtp(u.id, "EMAIL_VERIFY", d.otp);
  let v = await prisma.user.update({ where: { id: u.id }, data: { emailVerified: true, lastLoginAt: new Date() } });
  v = await promoteIfBootstrap(v);
  return { token: await newSession(v, p), user: publicUser(v) };
}

async function login(d: Data, { p }: Ctx) {
  const email = normEmail(d.email);
  await rate("login:" + email, 8, 900, "ลองเข้าสู่ระบบหลายครั้งเกินไป รอ 15 นาทีแล้วลองใหม่");
  let u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(String(d.password || ""), u.password))) throw err("BAD_LOGIN", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  if (!u.emailVerified) throw err("EMAIL_NOT_VERIFIED", "อีเมลนี้ยังไม่ได้ยืนยัน กด “ลืมรหัสผ่าน” เพื่อรับรหัสทางอีเมลและตั้งรหัสผ่านใหม่");
  if (u.isBanned) throw err("BANNED", "บัญชีนี้ถูกระงับ ติดต่อแอดมินทาง IG");
  u = await promoteIfBootstrap(await prisma.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } }));
  return { token: await newSession(u, p), user: publicUser(u) };
}

async function logout(_d: Data, { p }: Ctx) {
  await prisma.ibSession.updateMany({ where: { tokenHash: sha256(String(p.token || "")), endedAt: null }, data: { endedAt: new Date(), endReason: "logout" } });
  return true;
}

async function passwordForgot(d: Data) {
  const email = normEmail(d.email);
  const u = await prisma.user.findUnique({ where: { email } });
  if (u && !u.isBanned) {
    await rate("otp1:" + email, 1, 60, "รอ 1 นาทีก่อนขอรหัสใหม่");
    await rate("otpH:" + email, 6, 3600, "ขอรหัสบ่อยเกินไป ลองใหม่ในอีก 1 ชั่วโมง");
    const otp = await issueOtp(u.id, "PASSWORD_RESET");
    await sendOtpEmail(email, otp, u.nickname || u.firstName, "reset", await ig());
  }
  return { email }; // same answer either way: never reveal whether the email is registered
}

async function passwordReset(d: Data, { p }: Ctx) {
  const email = normEmail(d.email);
  checkPassword(d.password);
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) throw err("OTP_INVALID", "รหัสไม่ถูกต้อง");
  await checkOtp(u.id, "PASSWORD_RESET", d.otp);
  // Entering the emailed code also proves the address, so this verifies older unverified accounts.
  let v = await prisma.user.update({ where: { id: u.id }, data: { password: await hashPw(String(d.password)), emailVerified: true, lastLoginAt: new Date() } });
  v = await promoteIfBootstrap(v);
  return { token: await newSession(v, p), user: publicUser(v) };
}

async function passwordChange(d: Data, { p }: Ctx) {
  const u = await auth(p);
  if (!(await bcrypt.compare(String(d.old_password || ""), u.password))) throw err("BAD_LOGIN", "รหัสผ่านเดิมไม่ถูกต้อง");
  checkPassword(d.password);
  await prisma.user.update({ where: { id: u.id }, data: { password: await hashPw(String(d.password)) } });
  return true;
}

async function profileUpdate(d: Data, { p }: Ctx) {
  const u = await auth(p);
  return publicUser(await prisma.user.update({ where: { id: u.id }, data: profileFields(d) }));
}

// ───────────────────────── Courses ─────────────────────────
type LessonRow = Lesson & { attachments: Attachment[] };
type CourseRow = Course & { subject: Subject; lessons: LessonRow[] };
const courseInclude = { subject: true, lessons: { orderBy: { order: "asc" }, include: { attachments: true } } } satisfies Prisma.CourseInclude;
const lessonMin = (l: Lesson) => Math.round((l.duration || 0) / 60);

function courseCard(c: CourseRow) {
  const key = subjectKey(c.subject);
  return {
    course_id: c.slug, subject: key, subject_name: APP.SUBJECTS[key], title: c.title, subtitle: c.subtitle || "",
    description: c.description || "", cover_url: c.coverImage || "", price: c.price, full_price: c.fullPrice || 0,
    level: c.level || "", status: c.isPublished ? "published" : "draft",
    lesson_count: c.lessons.length, total_min: c.lessons.reduce((a, l) => a + lessonMin(l), 0),
  };
}
function chapters<T>(lessons: LessonRow[], map: (l: LessonRow) => T) {
  const out: { title: string; lessons: T[] }[] = [];
  const idx: Record<string, number> = {};
  for (const l of lessons) {
    const k = l.chapter || "บทเรียน";
    if (!(k in idx)) { idx[k] = out.length; out.push({ title: k, lessons: [] }); }
    out[idx[k]].lessons.push(map(l));
  }
  return out;
}
async function courseBySlug(id: unknown) {
  const s = String(id || "").trim();
  return s ? prisma.course.findUnique({ where: { slug: s }, include: courseInclude }) : null;
}

/** A student's standing in one course: approved (may study), pending / rejected slip, or none. */
type EnrollState = { status: "approved" | "pending" | "rejected"; note: string; at: Date | null } | null;
function stateOf(pays: Payment[], enr: Enrollment | undefined): EnrollState {
  const sorted = [...pays].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (enr?.status === "ACTIVE") {
    const ap = sorted.find((x) => x.status === "APPROVED");
    return { status: "approved", note: ap?.note || "", at: ap?.createdAt ?? enr.enrolledAt };
  }
  const last = sorted[0];
  if (!last || last.status === "APPROVED") return null; // approved once but access since removed
  return last.status === "PENDING"
    ? { status: "pending", note: last.note || "", at: last.createdAt }
    : { status: "rejected", note: last.rejectReason || last.note || "", at: last.createdAt };
}
async function enrollState(userId: string, courseId: string) {
  const [pays, enr] = await Promise.all([
    prisma.payment.findMany({ where: { userId, courseId } }),
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } }),
  ]);
  return stateOf(pays, enr ?? undefined);
}

async function publishedCourses() {
  const cs = await prisma.course.findMany({ where: { isPublished: true }, include: courseInclude, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return cs.map(courseCard);
}

async function courseDetail(d: Data, { p }: Ctx) {
  const x = await courseBySlug(d.course_id);
  if (!x || !x.isPublished) throw err("NOT_FOUND", "ไม่พบคอร์สนี้");
  const out: Record<string, unknown> = courseCard(x);
  out.chapters = chapters(x.lessons, (l) => ({
    lesson_id: l.id, title: l.title, duration_min: lessonMin(l), is_preview: l.isPreview, youtube_id: l.isPreview ? youtubeId(l.youtubeUrl) : "",
  }));
  out.trailer_id = x.trailerYoutube || "";
  out.highlights = lines(x.highlights, 12, 200);
  out.audience = lines(x.audience, 10, 200);
  out.instructor = x.instructorName ? { name: x.instructorName, title: x.instructorTitle || "", bio: x.instructorBio || "", photo: x.instructorPhoto || "" } : null;
  out.faq = parseFaq(x.faq);
  out.enrollment = null;
  if (p.token) {
    try {
      const u = await auth(p);
      const e = await enrollState(u.id, x.id);
      out.enrollment = e ? e.status : null;
      out.note = e ? e.note : "";
    } catch {}
  }
  return out;
}

async function myCourses(_d: Data, { p }: Ctx) {
  const u = await auth(p);
  const [pays, enrs, prog] = await Promise.all([
    prisma.payment.findMany({ where: { userId: u.id } }),
    prisma.enrollment.findMany({ where: { userId: u.id } }),
    prisma.lessonProgress.findMany({ where: { userId: u.id, isCompleted: true } }),
  ]);
  const ids = Array.from(new Set([...pays.map((x) => x.courseId), ...enrs.map((x) => x.courseId)]));
  const courses = await prisma.course.findMany({ where: { id: { in: ids } }, include: courseInclude });
  return courses
    .map((c) => {
      const st = stateOf(pays.filter((x) => x.courseId === c.id), enrs.find((x) => x.courseId === c.id));
      if (!st) return null;
      const lessonIds = c.lessons.map((l) => l.id);
      const done = prog.filter((r) => lessonIds.includes(r.lessonId)).sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));
      return {
        ...courseCard(c), enrollment: st.status, note: st.note, requested_at: iso(st.at),
        done_count: done.length, percent: lessonIds.length ? Math.round((done.length / lessonIds.length) * 100) : 0,
        last_lesson_id: done[0]?.lessonId || "", _t: st.at?.getTime() || 0,
      };
    })
    .filter(<T,>(x: T | null): x is T => !!x)
    .sort((a, b) => b._t - a._t)
    .map(({ _t, ...rest }) => rest);
}

async function learnGet(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const x = await courseBySlug(d.course_id);
  if (!x) throw err("NOT_FOUND", "ไม่พบคอร์สนี้");
  const e = await enrollState(u.id, x.id);
  if (!isAdmin(u) && e?.status !== "approved") throw err("NO_ACCESS", "คอร์สนี้ยังไม่ได้รับสิทธิ์เข้าเรียน");
  const done = new Set(
    (await prisma.lessonProgress.findMany({ where: { userId: u.id, isCompleted: true, lessonId: { in: x.lessons.map((l) => l.id) } } })).map((r) => r.lessonId)
  );
  const out: Record<string, unknown> = courseCard(x);
  out.chapters = chapters(x.lessons, (l) => ({
    lesson_id: l.id, title: l.title, duration_min: lessonMin(l), youtube_id: youtubeId(l.youtubeUrl),
    attachment_url: l.attachments[0]?.fileUrl || "", done: done.has(l.id),
  }));
  out.watermark = u.email + " · " + u.id;
  return out;
}

async function progressSet(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const l = await prisma.lesson.findUnique({ where: { id: String(d.lesson_id || "") } });
  if (!l) throw err("NOT_FOUND", "ไม่พบบทเรียน");
  const e = await enrollState(u.id, l.courseId);
  if (!isAdmin(u) && e?.status !== "approved") throw err("NO_ACCESS", "ยังไม่ได้รับสิทธิ์");
  const on = !!d.done;
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: u.id, lessonId: l.id } },
    create: { userId: u.id, lessonId: l.id, isCompleted: on, completedAt: on ? new Date() : null },
    update: { isCompleted: on, completedAt: on ? new Date() : null },
  });
  return { lesson_id: l.id, done: on };
}

async function enrollRequest(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const c = await courseBySlug(d.course_id);
  if (!c || !c.isPublished) throw err("NOT_FOUND", "ไม่พบคอร์สนี้");
  const prev = await enrollState(u.id, c.id);
  if (prev?.status === "approved") throw err("ALREADY", "คุณมีสิทธิ์เข้าเรียนคอร์สนี้แล้ว");
  if (prev?.status === "pending") throw err("ALREADY", "ส่งสลิปไปแล้ว กำลังรอแอดมินตรวจ");
  const s = d.slip || {};
  if (!/^image\/(jpeg|png|webp)$/.test(s.mime || "")) throw err("BAD_INPUT", "แนบสลิปเป็นรูปภาพ (JPG หรือ PNG)");
  if (!s.base64 || s.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err("BAD_INPUT", "รูปสลิปใหญ่เกิน 3 MB");
  await rate("slip:" + u.id, 5, 3600, "ส่งสลิปบ่อยเกินไป ลองใหม่ภายหลัง");
  const blob = await prisma.fileBlob.create({ data: { mime: s.mime, data: Buffer.from(String(s.base64), "base64"), isPublic: false } });
  const pay = await prisma.payment.create({
    data: { userId: u.id, courseId: c.id, amount: c.price, promptpayRef: "IB-" + randToken(8), slipImageUrl: "blob:" + blob.id, status: "PENDING" },
  });
  await notifyAdmins(
    await adminEmails(),
    "มีคำขอเข้าเรียนใหม่: " + c.title,
    [["นักเรียน", `${u.firstName} ${u.lastName} (${u.nickname || ""})`], ["อีเมล", u.email], ["เบอร์", u.phone || ""],
     ["คอร์ส", c.title], ["ยอดที่ต้องโอน", "฿" + c.price], ["รหัสคำขอ", pay.id]],
    "เข้าหลังบ้าน → คำขอเข้าเรียน เพื่อตรวจสลิปและอนุมัติ",
    await ig()
  );
  return { enroll_id: pay.id, status: "pending" };
}

// ───────────────────────── Admin ─────────────────────────
async function adminStats(_d: Data, _c: Ctx, admin: User) {
  const isInst = admin.role === "INSTRUCTOR";
  const instSubj = instructorSubject(admin);
  const today = bkkDate(), month = today.slice(0, 7);
  const dayStart = new Date(Date.parse(today + "T00:00:00+07:00"));
  const verified = { emailVerified: true } as const;
  const [usersTotal, usersToday, repeatCount, dreams, pending, oldest, approved] = await Promise.all([
    isInst
      ? prisma.enrollment.count({
          where: { status: "ACTIVE", course: { subject: { slug: SUBJECT_SLUG[instSubj!] || instSubj! } } },
        })
      : prisma.user.count({ where: verified }),
    isInst ? 0 : prisma.user.count({ where: { ...verified, createdAt: { gte: dayStart } } }),
    isInst ? 0 : prisma.user.count({ where: { ...verified, gradeLevel: { in: APP.REPEAT_GRADES } } }),
    isInst
      ? []
      : prisma.user.findMany({
          where: { ...verified, dreamFaculty: { not: null }, dreamUniversity: { not: null } },
          select: { dreamFaculty: true, dreamUniversity: true },
        }),
    prisma.payment.count({
      where: {
        status: "PENDING",
        ...(isInst && instSubj ? { course: { subject: { slug: SUBJECT_SLUG[instSubj] || instSubj } } } : {}),
      },
    }),
    prisma.payment.findFirst({
      where: {
        status: "PENDING",
        ...(isInst && instSubj ? { course: { subject: { slug: SUBJECT_SLUG[instSubj] || instSubj } } } : {}),
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        status: "APPROVED",
        reviewedAt: { gte: new Date(Date.parse(month + "-01T00:00:00+07:00")) },
        ...(isInst && instSubj ? { course: { subject: { slug: SUBJECT_SLUG[instSubj] || instSubj } } } : {}),
      },
      include: { course: { include: { subject: true } } },
    }),
  ]);
  const subj: Record<string, { subject: string; name: string; count: number; revenue: number }> = {};
  for (const k of Object.keys(APP.SUBJECTS)) {
    if (!isInst || k === instSubj) {
      subj[k] = { subject: k, name: APP.SUBJECTS[k], count: 0, revenue: 0 };
    }
  }
  let revenue = 0;
  for (const e of approved) {
    const k = subjectKey(e.course.subject);
    if (!isInst || k === instSubj) {
      revenue += e.amount;
      if (subj[k]) {
        subj[k].count++;
        subj[k].revenue += e.amount;
      }
    }
  }
  return {
    users_total: usersTotal,
    dream_top: topCount(dreams.map((u) => (u.dreamFaculty && u.dreamUniversity ? u.dreamFaculty + " · " + u.dreamUniversity : "")), 6),
    repeat_count: repeatCount,
    users_today: usersToday,
    pending,
    oldest_pending: iso(oldest?.createdAt),
    month_revenue: revenue,
    month_count: approved.filter((e) => !isInst || subjectKey(e.course.subject) === instSubj).length,
    by_subject: Object.values(subj),
    email_quota: await remainingQuota(),
    instructor_subject: instSubj,
    is_super: isSuperAdmin(admin),
  };
}

const PAY_STATUS: Record<string, "PENDING" | "APPROVED" | "REJECTED"> = { pending: "PENDING", approved: "APPROVED", rejected: "REJECTED" };
async function adminEnrollments(d: Data, _c: Ctx, admin: User) {
  const isInst = admin.role === "INSTRUCTOR";
  const instSubj = instructorSubject(admin);
  const st = PAY_STATUS[String(d.status || "")];
  const rows = await prisma.payment.findMany({
    where: {
      ...(st ? { status: st } : {}),
      ...(isInst && instSubj ? { course: { subject: { slug: SUBJECT_SLUG[instSubj] || instSubj } } } : {}),
    },
    include: { user: true, course: { include: { subject: true } } },
    orderBy: { createdAt: st === "PENDING" ? "asc" : "desc" },
    take: 200,
  });
  const filtered = isInst && instSubj ? rows.filter((e) => subjectKey(e.course.subject) === instSubj) : rows;
  return filtered.map((e) => ({
    enroll_id: e.id, status: e.status.toLowerCase(), amount: e.amount, note: e.rejectReason || e.note || "", created_at: iso(e.createdAt),
    decided_at: iso(e.reviewedAt), has_slip: !!e.slipImageUrl, course_id: e.course.slug, course_title: e.course.title,
    user_id: e.userId, name: `${e.user.firstName} ${e.user.lastName}`, nickname: e.user.nickname || "", email: e.user.email, phone: e.user.phone || "",
    subject_key: subjectKey(e.course.subject),
  }));
}

async function adminSlip(d: Data, _c: Ctx, admin: User) {
  const e = await prisma.payment.findUnique({ where: { id: String(d.enroll_id || "") }, include: { course: { include: { subject: true } } } });
  if (!e?.slipImageUrl) throw err("NOT_FOUND", "ไม่พบสลิป");
  if (admin.role === "INSTRUCTOR" && subjectKey(e.course.subject) !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "ไม่มีสิทธิ์ดูสลิปของวิชาอื่น");
  }
  if (e.slipImageUrl.startsWith("blob:")) {
    const b = await prisma.fileBlob.findUnique({ where: { id: e.slipImageUrl.slice(5) } });
    if (!b) throw err("NOT_FOUND", "ไม่พบสลิป");
    return { mime: b.mime, base64: Buffer.from(b.data).toString("base64") };
  }
  // Slips from the previous site were uploaded to object storage.
  const r = await fetch(e.slipImageUrl).catch(() => null);
  if (!r?.ok) throw err("NOT_FOUND", "ไม่พบสลิป");
  return { mime: r.headers.get("content-type") || "image/jpeg", base64: Buffer.from(await r.arrayBuffer()).toString("base64") };
}

async function activate(userId: string, courseId: string) {
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, status: "ACTIVE", enrolledAt: new Date() },
    update: { status: "ACTIVE", enrolledAt: new Date() },
  });
}

async function adminDecide(d: Data, _c: Ctx, admin: User) {
  const ok = d.decision === "approve", no = d.decision === "reject";
  if (!ok && !no) throw err("BAD_INPUT", "เลือกอนุมัติหรือปฏิเสธ");
  const id = String(d.enroll_id || "");
  const checkPayment = await prisma.payment.findUnique({ where: { id }, include: { course: { include: { subject: true } } } });
  if (!checkPayment) throw err("NOT_FOUND", "ไม่พบคำขอนี้");
  if (admin.role === "INSTRUCTOR" && subjectKey(checkPayment.course.subject) !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "ไม่มีสิทธิ์อนุมัติหรือปฏิเสธคำขอของวิชาอื่น");
  }
  const note = clip(d.note, 300);
  const changed = await prisma.payment.updateMany({
    where: { id, status: "PENDING" },
    data: ok
      ? { status: "APPROVED", note: note || null, reviewedBy: admin.id, reviewedAt: new Date() }
      : { status: "REJECTED", rejectReason: note || null, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  const e = await prisma.payment.findUnique({ where: { id }, include: { user: true, course: true } });
  if (!e) throw err("NOT_FOUND", "ไม่พบคำขอนี้");
  if (!changed.count) throw err("ALREADY", "คำขอนี้ถูกตัดสินไปแล้วโดยแอดมินคนอื่น");
  if (ok) await activate(e.userId, e.courseId);
  await log(admin, ok ? "approved" : "rejected", id);
  await sendDecisionEmail(e.user, e.course.title, ok, note, await ig());
  return { enroll_id: id, status: ok ? "approved" : "rejected" };
}

async function adminGrant(d: Data, _c: Ctx, admin: User) {
  const u = await prisma.user.findUnique({ where: { email: normEmail(d.email) } });
  if (!u) throw err("NOT_FOUND", "ไม่พบผู้ใช้อีเมลนี้ (ต้องสมัครสมาชิกก่อน)");
  const c = await courseBySlug(d.course_id);
  if (!c) throw err("NOT_FOUND", "ไม่พบคอร์ส");
  if (admin.role === "INSTRUCTOR" && subjectKey(c.subject) !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "ไม่มีสิทธิ์เพิ่มสิทธิ์คอร์สของวิชาอื่น");
  }
  const prev = await enrollState(u.id, c.id);
  if (prev?.status === "approved") throw err("ALREADY", "ผู้ใช้นี้มีสิทธิ์คอร์สนี้อยู่แล้ว");
  const pending = prev?.status === "pending" ? await prisma.payment.findFirst({ where: { userId: u.id, courseId: c.id, status: "PENDING" } }) : null;
  if (pending) {
    await prisma.payment.update({ where: { id: pending.id }, data: { status: "APPROVED", note: "อนุมัติโดยการเพิ่มสิทธิ์", reviewedBy: admin.id, reviewedAt: new Date() } });
  } else {
    await prisma.payment.create({
      data: {
        userId: u.id, courseId: c.id, amount: d.amount == null || d.amount === "" ? 0 : Number(d.amount) || 0, promptpayRef: "GRANT-" + randToken(8),
        status: "APPROVED", note: clip(d.note || "เพิ่มสิทธิ์โดยแอดมิน", 300), reviewedBy: admin.id, reviewedAt: new Date(),
      },
    });
  }
  await activate(u.id, c.id);
  await log(admin, "grant", u.email + " → " + c.slug);
  await sendDecisionEmail(u, c.title, true, "", await ig());
  return true;
}

async function adminCourses(_d: Data, _c: Ctx, admin: User) {
  const isInst = admin.role === "INSTRUCTOR";
  const instSubj = instructorSubject(admin);
  const cs = await prisma.course.findMany({
    where: isInst && instSubj ? { subject: { slug: SUBJECT_SLUG[instSubj] || instSubj } } : {},
    include: { ...courseInclude, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const filtered = isInst && instSubj ? cs.filter((x) => subjectKey(x.subject) === instSubj) : cs;
  return filtered.map((x) => ({
    ...courseCard(x), sort_order: x.sortOrder,
    trailer_youtube: x.trailerYoutube || "", highlights: x.highlights || "", audience: x.audience || "",
    instructor_name: x.instructorName || "", instructor_title: x.instructorTitle || "", instructor_bio: x.instructorBio || "",
    instructor_photo: x.instructorPhoto || "", faq: x.faq || "", students: x._count.enrollments,
  }));
}

const SUBJECT_SLUG: Record<string, string> = { bio: "biology", chem: "chemistry", phys: "physics", math: "math" };
/** The Subject row (and a Category under it) for bio/chem/phys/math, created if missing. */
async function subjectFor(key: string) {
  const all = await prisma.subject.findMany({ orderBy: { order: "asc" } });
  let s = all.find((x) => x.slug === SUBJECT_SLUG[key]) || all.find((x) => subjectKey(x) === key);
  if (!s) s = await prisma.subject.create({ data: { name: APP.SUBJECTS[key], slug: SUBJECT_SLUG[key], order: Object.keys(SUBJECT_SLUG).indexOf(key) + 1 } });
  return s;
}
async function categoryFor(subjectId: string) {
  return (await prisma.category.findFirst({ where: { subjectId } })) ?? (await prisma.category.create({ data: { name: "ทั่วไป", subjectId } }));
}

async function adminCourseSave(d: Data, _c: Ctx, admin: User) {
  if (admin.role === "INSTRUCTOR") {
    d.subject = instructorSubject(admin);
  }
  if (!APP.SUBJECTS[d.subject]) throw err("BAD_INPUT", "เลือกวิชา");
  if (admin.role === "INSTRUCTOR" && d.subject !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "คุณสามารถสร้างหรือแก้ไขได้เฉพาะวิชาของตนเอง");
  }
  const price = Number(d.price);
  if (!(price >= 0)) throw err("BAD_INPUT", "ราคาต้องเป็นตัวเลข");
  const tr = String(d.trailer_youtube || "").trim();
  const trailer = tr ? youtubeId(tr) : "";
  if (tr && !trailer) throw err("BAD_INPUT", "ลิงก์คลิปแนะนำคอร์สไม่ใช่ลิงก์ YouTube");
  const patch = {
    title: req(d.title, "ชื่อคอร์ส", 120), subtitle: clip(d.subtitle, 160), description: clip(d.description, 2000),
    coverImage: clip(d.cover_url, 500) || null, price: Math.round(price), isPublished: d.status === "published",
    sortOrder: Number(d.sort_order) || 0, level: APP.LEVELS.includes(d.level) ? d.level : null,
    fullPrice: d.full_price === "" || d.full_price == null ? null : Math.max(0, Number(d.full_price) || 0),
    highlights: lines(d.highlights, 12, 200).join("\n"), audience: lines(d.audience, 10, 200).join("\n"),
    instructorName: clip(d.instructor_name, 80), instructorTitle: clip(d.instructor_title, 160),
    instructorBio: clip(d.instructor_bio, 1500), instructorPhoto: clip(d.instructor_photo, 500) || null, faq: clip(d.faq, 5000),
    trailerYoutube: trailer || null,
  };
  checkImageUrl(patch.coverImage || "");
  checkImageUrl(patch.instructorPhoto || "");
  const subject = await subjectFor(d.subject);
  if (d.course_id) {
    const x = await courseBySlug(d.course_id);
    if (!x) throw err("NOT_FOUND", "ไม่พบคอร์ส");
    const moved = x.subjectId !== subject.id ? { subjectId: subject.id, categoryId: (await categoryFor(subject.id)).id } : {};
    await prisma.course.update({ where: { id: x.id }, data: { ...patch, ...moved } });
    await log(admin, "course.edit", x.slug);
    return { course_id: x.slug };
  }
  const cid = slug(d.new_id) || d.subject + "-" + randToken(3);
  if (await prisma.course.findUnique({ where: { slug: cid } })) throw err("BAD_INPUT", "รหัสคอร์ส " + cid.toUpperCase() + " ซ้ำ");
  await prisma.course.create({ data: { ...patch, slug: cid, subjectId: subject.id, categoryId: (await categoryFor(subject.id)).id } });
  await log(admin, "course.create", cid);
  return { course_id: cid };
}

async function adminLessons(d: Data, _c: Ctx, admin: User) {
  const c = await courseBySlug(d.course_id);
  if (!c) return [];
  if (admin.role === "INSTRUCTOR" && subjectKey(c.subject) !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "ไม่มีสิทธิ์ดูบทเรียนของวิชาอื่น");
  }
  return c.lessons.map((l) => ({
    lesson_id: l.id, course_id: c.slug, chapter: l.chapter || "", title: l.title, youtube_id: youtubeId(l.youtubeUrl),
    duration_min: lessonMin(l), attachment_url: l.attachments[0]?.fileUrl || "", is_preview: l.isPreview, sort_order: l.order,
  }));
}

async function adminLessonSave(d: Data, _c: Ctx, admin: User) {
  const yt = youtubeId(d.youtube);
  if (!yt) throw err("BAD_INPUT", "ลิงก์ YouTube ไม่ถูกต้อง ลองคัดลอกจากปุ่มแชร์ใต้คลิป");
  const att = clip(d.attachment_url, 500);
  if (att && !/^https:\/\//.test(att)) throw err("BAD_INPUT", "ลิงก์ไฟล์ประกอบต้องขึ้นต้นด้วย https://");
  const patch = {
    chapter: req(d.chapter, "บท", 120), title: req(d.title, "ชื่อตอน", 160), youtubeUrl: "https://youtu.be/" + yt,
    duration: Math.max(0, Math.round(Number(d.duration_min) || 0)) * 60, isPreview: !!d.is_preview,
  };
  let id: string;
  if (d.lesson_id) {
    const l = await prisma.lesson.findUnique({ where: { id: String(d.lesson_id) }, include: { course: { include: { subject: true } } } });
    if (!l) throw err("NOT_FOUND", "ไม่พบบทเรียน");
    if (admin.role === "INSTRUCTOR" && subjectKey(l.course.subject) !== instructorSubject(admin)) {
      throw err("FORBIDDEN", "ไม่มีสิทธิ์แก้ไขบทเรียนของวิชาอื่น");
    }
    await prisma.lesson.update({ where: { id: l.id }, data: patch });
    id = l.id;
    await log(admin, "lesson.edit", id);
  } else {
    const c = await courseBySlug(d.course_id);
    if (!c) throw err("NOT_FOUND", "ไม่พบคอร์ส");
    if (admin.role === "INSTRUCTOR" && subjectKey(c.subject) !== instructorSubject(admin)) {
      throw err("FORBIDDEN", "ไม่มีสิทธิ์เพิ่มบทเรียนในวิชาอื่น");
    }
    const max = c.lessons.reduce((m, l) => Math.max(m, l.order), 0);
    id = (await prisma.lesson.create({ data: { ...patch, type: "VIDEO", order: max + 10, courseId: c.id } })).id;
    await log(admin, "lesson.create", id);
  }
  await prisma.attachment.deleteMany({ where: { lessonId: id } });
  if (att) await prisma.attachment.create({ data: { lessonId: id, fileName: "ไฟล์ประกอบ", fileUrl: att } });
  return { lesson_id: id, youtube_id: yt };
}

async function adminLessonDelete(d: Data, _c: Ctx, admin: User) {
  const l = await prisma.lesson.findUnique({ where: { id: String(d.lesson_id || "") }, include: { course: { include: { subject: true } } } });
  if (!l) throw err("NOT_FOUND", "ไม่พบบทเรียน");
  if (admin.role === "INSTRUCTOR" && subjectKey(l.course.subject) !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "ไม่มีสิทธิ์ลบบทเรียนของวิชาอื่น");
  }
  await prisma.$transaction([prisma.quiz.updateMany({ where: { lessonId: l.id }, data: { lessonId: null } }), prisma.lesson.delete({ where: { id: l.id } })]);
  await log(admin, "lesson.delete", l.id);
  return true;
}

async function adminLessonsReorder(d: Data, _c: Ctx, admin: User) {
  const c = await courseBySlug(d.course_id);
  if (!c) throw err("NOT_FOUND", "ไม่พบคอร์ส");
  if (admin.role === "INSTRUCTOR" && subjectKey(c.subject) !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "ไม่มีสิทธิ์เรียงบทเรียนของวิชาอื่น");
  }
  const order: string[] = (d.order || []).map(String);
  await prisma.$transaction(
    c.lessons
      .filter((l) => order.includes(l.id) && l.order !== (order.indexOf(l.id) + 1) * 10)
      .map((l) => prisma.lesson.update({ where: { id: l.id }, data: { order: (order.indexOf(l.id) + 1) * 10 } }))
  );
  await log(admin, "lesson.reorder", c.slug);
  return true;
}

async function adminUsers(d: Data) {
  const q = String(d.q || "").trim();
  const users = await prisma.user.findMany({
    where: {
      emailVerified: true,
      ...(q ? { OR: ["email", "firstName", "lastName", "nickname", "phone", "school"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) } : {}),
    },
    include: {
      enrollments: { where: { status: "ACTIVE" }, include: { course: { select: { title: true } } } },
      ibSessions: { where: { endedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return users.map((u) => ({
    ...publicUser(u), courses: u.enrollments.map((e) => e.course.title),
    device: u.ibSessions[0]?.deviceInfo || "", device_since: iso(u.ibSessions[0]?.createdAt),
  }));
}

async function adminUserUpdate(d: Data, _c: Ctx, admin: User) {
  const u = await prisma.user.findUnique({ where: { id: String(d.user_id || "") } });
  if (!u) throw err("NOT_FOUND", "ไม่พบผู้ใช้");
  if (u.id === admin.id) throw err("BAD_INPUT", "แก้สิทธิ์ของตัวเองไม่ได้");
  const patch: Prisma.UserUpdateInput = {};
  if (d.role === "admin" || d.role === "instructor" || d.role === "student") {
    patch.role = d.role === "admin" ? "ADMIN" : d.role === "instructor" ? "INSTRUCTOR" : "STUDENT";
    if (d.role === "instructor") {
      const subj = String(d.instructor_subject || "");
      if (!APP.SUBJECTS[subj]) throw err("BAD_INPUT", "เลือกวิชาสำหรับผู้สอน (ชีววิทยา, เคมี, ฟิสิกส์ หรือ คณิตศาสตร์)");
      (patch as any).instructorSubjectKey = subj;
    } else {
      (patch as any).instructorSubjectKey = null;
    }
  }
  if (d.status === "active" || d.status === "banned") patch.isBanned = d.status === "banned";
  await prisma.user.update({ where: { id: u.id }, data: patch });
  if (patch.isBanned) await endSessions(u.id, "banned");
  await log(admin, "user.update", u.email + " " + JSON.stringify({ role: d.role, subject: d.instructor_subject, status: d.status }));
  return true;
}

async function adminResetDevice(d: Data, _c: Ctx, admin: User) {
  await endSessions(String(d.user_id || ""), "admin");
  await log(admin, "user.resetDevice", String(d.user_id || ""));
  return true;
}

// ───────────────────────── Hall of fame ─────────────────────────
type ResultRow = Prisma.StudentResultGetPayload<{ include: { subject: true } }>;
function resultOut(r: ResultRow) {
  const key = subjectKey(r.subject);
  return {
    result_id: r.id, year: r.year, subject: key, subject_name: APP.SUBJECTS[key], nickname: r.nickname, school: r.school || "",
    center: r.center || "", review: r.review || "", photo_url: r.photoUrl || "", status: r.isPublished ? "published" : "hidden", sort_order: r.sortOrder,
  };
}
const byYearThenSort = (a: ResultRow, b: ResultRow) => (Number(b.year) || 0) - (Number(a.year) || 0) || a.sortOrder - b.sortOrder;
async function publicResults() {
  return (await prisma.studentResult.findMany({ where: { isPublished: true }, include: { subject: true }, orderBy: { createdAt: "asc" } })).sort(byYearThenSort).map(resultOut);
}
async function adminResults(_d: Data, _c: Ctx, admin: User) {
  const isInst = admin.role === "INSTRUCTOR";
  const instSubj = instructorSubject(admin);
  const rows = await prisma.studentResult.findMany({
    where: isInst && instSubj ? { subject: { slug: SUBJECT_SLUG[instSubj] || instSubj } } : {},
    include: { subject: true },
    orderBy: { createdAt: "asc" },
  });
  const filtered = isInst && instSubj ? rows.filter((r) => subjectKey(r.subject) === instSubj) : rows;
  return filtered.sort(byYearThenSort).map(resultOut);
}
async function adminResultSave(d: Data, _c: Ctx, admin: User) {
  if (admin.role === "INSTRUCTOR") d.subject = instructorSubject(admin);
  if (!APP.SUBJECTS[d.subject]) throw err("BAD_INPUT", "เลือกวิชา");
  if (admin.role === "INSTRUCTOR" && d.subject !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "คุณสามารถจัดการผลงานได้เฉพาะวิชาของตนเอง");
  }
  const year = String(d.year || "").replace(/\D/g, "");
  if (!/^25\d\d$/.test(year)) throw err("BAD_INPUT", "ปีต้องเป็น พ.ศ. 4 หลัก เช่น 2569");
  const photo = clip(d.photo_url, 500);
  checkImageUrl(photo);
  const data = {
    year, subjectId: (await subjectFor(d.subject)).id, nickname: req(d.nickname, "ชื่อเล่น", 40), school: clip(d.school, 120), center: clip(d.center, 120),
    review: clip(d.review, 2000), photoUrl: photo || null, isPublished: d.status !== "hidden", sortOrder: Number(d.sort_order) || 0,
  };
  if (d.result_id) {
    const r = await prisma.studentResult.findUnique({ where: { id: String(d.result_id) }, include: { subject: true } });
    if (!r) throw err("NOT_FOUND", "ไม่พบรายการนี้");
    if (admin.role === "INSTRUCTOR" && subjectKey(r.subject) !== instructorSubject(admin)) {
      throw err("FORBIDDEN", "ไม่มีสิทธิ์แก้ไขผลงานของวิชาอื่น");
    }
    await prisma.studentResult.update({ where: { id: r.id }, data });
    await log(admin, "result.edit", r.id);
    return { result_id: r.id };
  }
  const r = await prisma.studentResult.create({ data });
  await log(admin, "result.create", r.id + " " + r.nickname);
  return { result_id: r.id };
}
async function adminResultDelete(d: Data, _c: Ctx, admin: User) {
  const r = await prisma.studentResult.findUnique({ where: { id: String(d.result_id || "") }, include: { subject: true } });
  if (!r) throw err("NOT_FOUND", "ไม่พบรายการนี้");
  if (admin.role === "INSTRUCTOR" && subjectKey(r.subject) !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "ไม่มีสิทธิ์ลบผลงานของวิชาอื่น");
  }
  await prisma.studentResult.delete({ where: { id: r.id } });
  await log(admin, "result.delete", r.id);
  return true;
}

/** Image uploaded from หลังบ้าน → stored in the database, served publicly by /api/ib/file/<id>
    (a site-relative link, so it keeps working on any domain the site is served from). */
async function adminUpload(d: Data, _c: Ctx, admin: User) {
  if (!/^image\/(jpeg|png|webp)$/.test(d.mime || "")) throw err("BAD_INPUT", "อัปโหลดได้เฉพาะรูป JPG, PNG หรือ WEBP");
  if (!d.base64 || d.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err("BAD_INPUT", "รูปใหญ่เกิน 3 MB");
  const b = await prisma.fileBlob.create({ data: { mime: d.mime, data: Buffer.from(String(d.base64), "base64"), isPublic: true } });
  await log(admin, "upload", b.id);
  return { url: `/api/ib/file/${b.id}` };
}

async function adminSettings() {
  return { ...DEFAULT_SETTINGS, ...(await allSettings()) };
}
async function adminSettingsSave(d: Data, _c: Ctx, admin: User) {
  const keys = Object.keys(d).filter((k) => k in DEFAULT_SETTINGS);
  for (const k of keys) await setSetting(k, clip(d[k], /_text$/.test(k) ? 40000 : 1000));
  await log(admin, "settings", keys.join(","));
  return adminSettings();
}

// ───────────────────────── Accounting & Financials ─────────────────────────
async function adminFinanceSummary(d: Data, _c: Ctx, admin: User) {
  const isInst = admin.role === "INSTRUCTOR";
  const instSubj = instructorSubject(admin);
  const targetSubj = isInst ? instSubj : (d.subject && APP.SUBJECTS[d.subject] ? d.subject : null);

  const payments = await prisma.payment.findMany({
    where: {
      status: "APPROVED",
      ...(targetSubj ? { course: { subject: { slug: SUBJECT_SLUG[targetSubj] || targetSubj } } } : {}),
    },
    include: { course: { include: { subject: true } } },
  });
  const validPayments = targetSubj ? payments.filter(p => subjectKey(p.course.subject) === targetSubj) : payments;

  const expenses = await (prisma as any).expense.findMany({
    where: {
      ...(targetSubj ? { subjectKey: targetSubj } : {}),
    },
    include: { course: true, recordedBy: true },
  });

  const totalIncome = validPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpense = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category || "ทั่วไป";
    byCategory[cat] = (byCategory[cat] || 0) + e.amount;
  }

  const byCourse: Record<string, { course_id: string; title: string; income: number; expense: number }> = {};
  for (const p of validPayments) {
    if (!byCourse[p.courseId]) byCourse[p.courseId] = { course_id: p.course.slug, title: p.course.title, income: 0, expense: 0 };
    byCourse[p.courseId].income += p.amount;
  }
  for (const e of expenses) {
    if (e.courseId && byCourse[e.courseId]) {
      byCourse[e.courseId].expense += e.amount;
    }
  }

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_profit: netProfit,
    income_count: validPayments.length,
    expense_count: expenses.length,
    subject: targetSubj,
    subject_name: targetSubj ? APP.SUBJECTS[targetSubj] : "ทุกวิชา",
    by_category: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })),
    by_course: Object.values(byCourse),
  };
}

async function adminFinanceIncomes(d: Data, _c: Ctx, admin: User) {
  const isInst = admin.role === "INSTRUCTOR";
  const instSubj = instructorSubject(admin);
  const targetSubj = isInst ? instSubj : (d.subject && APP.SUBJECTS[d.subject] ? d.subject : null);

  const rows = await prisma.payment.findMany({
    where: {
      status: "APPROVED",
      ...(targetSubj ? { course: { subject: { slug: SUBJECT_SLUG[targetSubj] || targetSubj } } } : {}),
    },
    include: { user: true, course: { include: { subject: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const filtered = targetSubj ? rows.filter(r => subjectKey(r.course.subject) === targetSubj) : rows;

  return filtered.map((e) => ({
    payment_id: e.id,
    amount: e.amount,
    created_at: iso(e.createdAt),
    reviewed_at: iso(e.reviewedAt),
    has_slip: !!e.slipImageUrl,
    course_id: e.course.slug,
    course_title: e.course.title,
    subject_key: subjectKey(e.course.subject),
    subject_name: APP.SUBJECTS[subjectKey(e.course.subject)] || "",
    student_name: `${e.user.firstName} ${e.user.lastName}`,
    student_nickname: e.user.nickname || "",
    student_email: e.user.email,
    student_phone: e.user.phone || "",
  }));
}

async function adminFinanceExpenses(d: Data, _c: Ctx, admin: User) {
  const isInst = admin.role === "INSTRUCTOR";
  const instSubj = instructorSubject(admin);
  const targetSubj = isInst ? instSubj : (d.subject && APP.SUBJECTS[d.subject] ? d.subject : null);

  const rows = await (prisma as any).expense.findMany({
    where: {
      ...(targetSubj ? { subjectKey: targetSubj } : {}),
    },
    include: { course: true, recordedBy: true },
    orderBy: { date: "desc" },
    take: 300,
  });

  return rows.map((e: any) => ({
    expense_id: e.id,
    title: e.title,
    amount: e.amount,
    category: e.category || "ทั่วไป",
    date: iso(e.date),
    note: e.note || "",
    has_slip: !!e.slipImageUrl,
    subject_key: e.subjectKey,
    subject_name: e.subjectKey && APP.SUBJECTS[e.subjectKey] ? APP.SUBJECTS[e.subjectKey] : "",
    course_id: e.course?.slug || "",
    course_title: e.course?.title || "",
    recorded_by: e.recordedBy ? (e.recordedBy.nickname || e.recordedBy.firstName) : "",
    created_at: iso(e.createdAt),
  }));
}

async function adminFinanceExpenseSave(d: Data, _c: Ctx, admin: User) {
  const isInst = admin.role === "INSTRUCTOR";
  const instSubj = instructorSubject(admin);
  const subjKey = isInst ? instSubj : (d.subject_key && APP.SUBJECTS[d.subject_key] ? d.subject_key : null);
  if (!subjKey) throw err("BAD_INPUT", "ระบุวิชาสำหรับรายจ่ายนี้");

  const title = req(d.title, "ชื่อรายการรายจ่าย", 120);
  const amount = Math.round(Number(d.amount));
  if (!(amount > 0)) throw err("BAD_INPUT", "ยอดเงินรายจ่ายต้องมากกว่า 0 บาท");

  let courseId: string | null = null;
  if (d.course_id) {
    const c = await courseBySlug(d.course_id);
    if (c) {
      if (subjectKey(c.subject) !== subjKey) throw err("BAD_INPUT", "คอร์สไม่ตรงกับวิชาที่เลือก");
      courseId = c.id;
    }
  }

  let slipImageUrl: string | null = null;
  if (d.slip && d.slip.base64) {
    if (!/^image\/(jpeg|png|webp)$/.test(d.slip.mime || "")) throw err("BAD_INPUT", "แนบสลิป/ใบเสร็จเป็นรูปภาพ (JPG หรือ PNG)");
    if (d.slip.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err("BAD_INPUT", "รูปสลิปใหญ่เกิน 3 MB");
    const blob = await prisma.fileBlob.create({
      data: { mime: d.slip.mime, data: Buffer.from(String(d.slip.base64), "base64"), isPublic: false },
    });
    slipImageUrl = "blob:" + blob.id;
  }

  const dateVal = d.date ? new Date(d.date) : new Date();

  if (d.expense_id) {
    const existing = await (prisma as any).expense.findUnique({ where: { id: String(d.expense_id) } });
    if (!existing) throw err("NOT_FOUND", "ไม่พบรายการรายจ่าย");
    if (isInst && existing.subjectKey !== instSubj) throw err("FORBIDDEN", "ไม่มีสิทธิ์แก้ไขรายจ่ายของวิชาอื่น");

    const updated = await (prisma as any).expense.update({
      where: { id: existing.id },
      data: {
        title,
        amount,
        category: clip(d.category || "ทั่วไป", 60),
        date: isNaN(dateVal.getTime()) ? existing.date : dateVal,
        note: clip(d.note || "", 500),
        courseId,
        subjectKey: subjKey,
        ...(slipImageUrl ? { slipImageUrl } : {}),
      },
    });
    await log(admin, "expense.edit", `${updated.id} ฿${updated.amount} (${subjKey})`);
    return { expense_id: updated.id };
  } else {
    const created = await (prisma as any).expense.create({
      data: {
        title,
        amount,
        category: clip(d.category || "ทั่วไป", 60),
        date: isNaN(dateVal.getTime()) ? new Date() : dateVal,
        note: clip(d.note || "", 500),
        slipImageUrl,
        subjectKey: subjKey,
        courseId,
        recordedById: admin.id,
      },
    });
    await log(admin, "expense.create", `${created.id} ฿${created.amount} (${subjKey})`);
    return { expense_id: created.id };
  }
}

async function adminFinanceExpenseDelete(d: Data, _c: Ctx, admin: User) {
  const id = String(d.expense_id || "");
  const e = await (prisma as any).expense.findUnique({ where: { id } });
  if (!e) throw err("NOT_FOUND", "ไม่พบรายการรายจ่าย");
  if (admin.role === "INSTRUCTOR" && e.subjectKey !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "ไม่มีสิทธิ์ลบรายจ่ายของวิชาอื่น");
  }
  await (prisma as any).expense.delete({ where: { id } });
  await log(admin, "expense.delete", `${id} (${e.subjectKey})`);
  return true;
}

async function adminFinanceExpenseSlip(d: Data, _c: Ctx, admin: User) {
  const id = String(d.expense_id || "");
  const e = await (prisma as any).expense.findUnique({ where: { id } });
  if (!e) throw err("NOT_FOUND", "ไม่พบรายการรายจ่าย");
  if (admin.role === "INSTRUCTOR" && e.subjectKey !== instructorSubject(admin)) {
    throw err("FORBIDDEN", "ไม่มีสิทธิ์ดูสลิปของวิชาอื่น");
  }
  if (!e.slipImageUrl) throw err("NOT_FOUND", "ไม่มีสลิป/ใบเสร็จแนบในรายการนี้");
  if (e.slipImageUrl.startsWith("blob:")) {
    const b = await prisma.fileBlob.findUnique({ where: { id: e.slipImageUrl.slice(5) } });
    if (!b) throw err("NOT_FOUND", "ไม่พบไฟล์สลิป");
    return { mime: b.mime, base64: Buffer.from(b.data).toString("base64") };
  }
  const r = await fetch(e.slipImageUrl).catch(() => null);
  if (!r?.ok) throw err("NOT_FOUND", "ไม่พบสลิป");
  return { mime: r.headers.get("content-type") || "image/jpeg", base64: Buffer.from(await r.arrayBuffer()).toString("base64") };
}

// ───────────────────────── Routes ─────────────────────────
const ROUTES: Record<string, Handler> = {
  // สาธารณะ
  config: () => publicSettings(),
  "register.start": registerStart,
  "register.verify": registerVerify,
  login,
  "password.forgot": passwordForgot,
  "password.reset": passwordReset,
  "courses.list": () => publishedCourses(),
  "course.detail": courseDetail,
  "results.list": () => publicResults(),
  // นักเรียน
  me: async (_d, { p }) => publicUser(await auth(p)),
  logout,
  "profile.update": profileUpdate,
  "password.change": passwordChange,
  "my.courses": myCourses,
  "learn.get": learnGet,
  "progress.set": progressSet,
  "enroll.request": enrollRequest,
  // แอดมิน & ผู้สอน
  "admin.stats": adminOnly(adminStats),
  "admin.enrollments": adminOnly(adminEnrollments),
  "admin.slip": adminOnly(adminSlip),
  "admin.decide": adminOnly(adminDecide),
  "admin.grant": adminOnly(adminGrant),
  "admin.courses": adminOnly(adminCourses),
  "admin.course.save": adminOnly(adminCourseSave),
  "admin.lessons": adminOnly(adminLessons),
  "admin.lesson.save": adminOnly(adminLessonSave),
  "admin.lesson.delete": adminOnly(adminLessonDelete),
  "admin.lessons.reorder": adminOnly(adminLessonsReorder),
  "admin.results": adminOnly(adminResults),
  "admin.result.save": adminOnly(adminResultSave),
  "admin.result.delete": adminOnly(adminResultDelete),
  "admin.upload": adminOnly(adminUpload),
  // ผู้ใช้และตั้งค่า (เฉพาะแอดมินหลัก)
  "admin.users": superAdminOnly(adminUsers),
  "admin.user.update": superAdminOnly(adminUserUpdate),
  "admin.user.resetDevice": superAdminOnly(adminResetDevice),
  "admin.settings": superAdminOnly(adminSettings),
  "admin.settings.save": superAdminOnly(adminSettingsSave),
  // การเงินและบัญชีรายรับ-รายจ่าย
  "admin.finance.summary": adminOnly(adminFinanceSummary),
  "admin.finance.incomes": adminOnly(adminFinanceIncomes),
  "admin.finance.expenses": adminOnly(adminFinanceExpenses),
  "admin.finance.expense.save": adminOnly(adminFinanceExpenseSave),
  "admin.finance.expense.delete": adminOnly(adminFinanceExpenseDelete),
  "admin.finance.expense.slip": adminOnly(adminFinanceExpenseSlip),
};

/** Runs one action and returns the { ok, data } / { ok:false, error, message } envelope the web app expects. */
export async function handle(p: Payload) {
  try {
    const fn = ROUTES[String(p.action || "")];
    if (!fn) throw err("BAD_ACTION", "ไม่รู้จักคำสั่งนี้");
    return { ok: true, data: await fn(p.data || {}, { p }) };
  } catch (x) {
    if (x instanceof ApiError) return { ok: false, error: x.code, message: x.message };
    console.error("[ib]", p.action, x);
    return { ok: false, error: "SERVER", message: "ระบบขัดข้อง ลองใหม่อีกครั้ง" };
  }
}

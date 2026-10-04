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
import * as shop from "./shop";
import * as staff from "./staff";
import * as sheets from "./sheets";
import * as team from "./team";
import * as cells from "./cells";
import { notifyAdmins, remainingQuota, sendDecisionEmail, sendOtpEmail } from "./mail";
import {
  APP, ApiError, bkkDate, checkImageUrl, checkPassword, clip, err, iso, isRepeat, lines, normEmail, otpCode, parseFaq,
  phone, randToken, req, sha256, slug, topCount, trim, youtubeId,
} from "./util";

/** Accounts that are always admins (promoted on registration / next login). */
const BOOTSTRAP_ADMINS = ["ineedbio1803@gmail.com"];

export type Data = Record<string, any>;
export type Payload = { action?: string; data?: Data; token?: string; device_id?: string; device_info?: string };
export type Ctx = { p: Payload };
type Handler = (d: Data, ctx: Ctx) => Promise<unknown>;

// ───────────────────────── Settings ─────────────────────────
const PUBLIC_SETTINGS = ["terms_text", "privacy_text", "hero_eyebrow", "hero_title", "hero_subtitle", "announcement", "promptpay_id", "promptpay_name", "contact_ig",
  "pay_terms_text", "order_expire_hours", "proof_paid_at", "proof_amount", "proof_from_bank", "proof_payer_name", "proof_extra",
  "cells_enabled", "event_mode", "event_from", "event_until", "home_billboard"];
const DEFAULT_SETTINGS: Record<string, string> = {
  hero_eyebrow: "INeedBio Online",
  hero_title: "ติวเข้ม ม.ปลาย|กับ INeedBio",
  hero_subtitle: "คอร์สเดียว เรียนได้ตลอดชีพ ไม่มีการลบคลิป",
  announcement: "",
  promptpay_id: process.env.PROMPTPAY_ID || "0910256171",
  promptpay_name: "INeedBio",
  contact_ig: "ineedbiochem",
  // Home billboard: course ids in order, comma-separated ("" = the first 5 courses)
  home_billboard: "",
  // Cells (study streaks → discount codes) and the seasonal theme; event_from/event_until = Thai time, "" = by the calendar
  cells_enabled: "1",
  event_mode: "auto",
  event_from: "2026-10-04T00:00",
  event_until: "2026-10-31T23:59",
  admin_emails: process.env.ADMIN_NOTIFICATION_EMAIL || "",
  terms_text: "",
  privacy_text: "",
  // Payment — {account} = name and number of the bill's account, {ig} = contact IG
  pay_terms_text:
    "- ชำระเงินโดยโอนเข้าบัญชี {account} ที่แสดงในหน้าชำระเงินของบิลนี้เท่านั้น\n" +
    "- INeedBio ไม่รับผิดชอบทุกกรณี หากโอนเข้าบัญชีอื่นที่ไม่ได้แสดงในหน้านี้ แม้จะมีผู้อ้างว่าเป็นทีมงาน\n" +
    "- ไม่มีนโยบายคืนเงินทุกกรณีเมื่อชำระเงินแล้ว\n" +
    "- โอนแล้วแนบสลิปและกรอกข้อมูลการโอนให้ครบ แล้วแจ้งการชำระเงินทาง IG @{ig} อีกครั้ง\n" +
    "- สิทธิ์เข้าเรียนจะเปิดหลังแอดมินตรวจยอดเงินแล้ว",
  order_expire_hours: "48",
  proof_paid_at: "required",
  proof_amount: "required",
  proof_from_bank: "required",
  proof_payer_name: "required",
  proof_extra: "",
  site_url: "https://ineedbio.shop",
  platform_pct: "{}",
};

async function allSettings() {
  const o: Record<string, string> = {};
  for (const r of await prisma.setting.findMany()) o[r.key] = r.value;
  return o;
}
export async function getSetting(k: string) {
  const r = await prisma.setting.findUnique({ where: { key: k } });
  return r ? r.value : DEFAULT_SETTINGS[k];
}
export async function setSetting(k: string, v: string) {
  await prisma.setting.upsert({ where: { key: k }, create: { key: k, value: v }, update: { value: v } });
}
export const ig = async () => (await getSetting("contact_ig")) || "ineedbiochem";
export const siteUrlOf = async () => String((await getSetting("site_url")) || "https://ineedbio.shop").replace(/\/+$/, "");
export const adminEmails = async () => String((await getSetting("admin_emails")) || "").split(",").map(trim).filter(Boolean);

async function publicSettings() {
  const s = await allSettings();
  const o: Record<string, unknown> = {};
  for (const k of PUBLIC_SETTINGS) o[k] = k in s ? s[k] : DEFAULT_SETTINGS[k];
  o.subjects = APP.SUBJECTS;
  o.levels = APP.LEVELS;
  o.repeat_grades = APP.REPEAT_GRADES;
  o.terms_version = APP.TERMS_VERSION;
  o.banks = shop.BANKS;
  o.proof_extra_fields = await shop.proofExtra();
  return o;
}

export async function log(admin: User, action: string, detail: string) {
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "ib." + action, target: clip(detail, 500) } });
}
export async function rate(key: string, limit: number, sec: number, msg: string) {
  const r = await rateLimit("ib", key, { limit, windowSeconds: sec });
  if (!r.allowed) throw err("RATE_LIMIT", msg);
}

// ───────────────────────── Users & sessions ─────────────────────────
function publicUser(u: User) {
  return {
    user_id: u.id, email: u.email, first_name: u.firstName, last_name: u.lastName, nickname: u.nickname || "",
    school: u.school || "", grade: u.gradeLevel || "", phone: u.phone || "",
    role: u.role === "ADMIN" ? "admin" : u.role === "INSTRUCTOR" ? "teacher" : "student", roles: rolesOf(u),
    status: u.isBanned ? "banned" : "active", created_at: iso(u.createdAt),
    current_faculty: u.currentFaculty || "", current_university: u.currentUniversity || "",
    dream_faculty: u.dreamFaculty || "", dream_university: u.dreamUniversity || "",
    is_repeat: isRepeat(u.gradeLevel), terms_version: u.termsVersion || "",
    birthday: u.birthday || "", facebook: u.facebook || "", instagram: u.instagram || "", line_id: u.lineId || "",
    has_photo: !!u.photoBlobId, data_consent: !!u.dataConsentAt, subjects: teachSubjects(u),
    profile_todo: [] as string[],
  };
}
/** publicUser + what a teacher still has to fill in (name / photo / bank): the site keeps them on the profile page until done. */
async function publicUserFull(u: User) {
  return { ...publicUser(u), profile_todo: await team.profileTodo(u) };
}
/** The signed-in user's own data (me / login / register / reset): + new_member while a new-member offer is on. */
async function selfUser(u: User) {
  return { ...(await publicUserFull(u)), ...(await shop.newMemberFlag(u)) };
}
const hashPw = (pw: string) => bcrypt.hash(pw, 10);
/** Roles: several at once — User.roles = "admin,teacher" ("" = use the older single `role`; "student" = none).
 *  Everyone can study anyway. Admin = everything · teacher = the subjects in User.subjects. */
const ROLE_KEYS = ["admin", "teacher"] as const;
type RoleKey = (typeof ROLE_KEYS)[number];
export function rolesOf(u: Pick<User, "role" | "roles">): RoleKey[] {
  const r = String(u.roles || "").split(",").map(trim).filter((x): x is RoleKey => (ROLE_KEYS as readonly string[]).includes(x));
  if (!r.length && !u.roles) return u.role === "ADMIN" ? ["admin"] : u.role === "INSTRUCTOR" ? ["teacher"] : [];
  return ROLE_KEYS.filter((k) => r.includes(k));
}
/** Every role change writes both `roles` and `role` (the main one: admin > teacher > student), so code that
 *  still reads `role` keeps working. */
export function rolePatch(roles: string[]) {
  const r = ROLE_KEYS.filter((k) => roles.includes(k));
  return { roles: r.join(",") || "student", role: (r.includes("admin") ? "ADMIN" : r.length ? "INSTRUCTOR" : "STUDENT") as User["role"] };
}
export const isAdminUser = (u: Pick<User, "role" | "roles">) => rolesOf(u).includes("admin");
export const isTeacherUser = (u: Pick<User, "role" | "roles">) => rolesOf(u).includes("teacher");
export const isStaffUser = (u: Pick<User, "role" | "roles">) => rolesOf(u).length > 0;
const isStaff = isStaffUser;
/** The subjects someone actually teaches (only with the teacher role). */
export function teachSubjects(u: Pick<User, "role" | "roles" | "subjects" | "instructorSubjectKey">) {
  if (!isTeacherUser(u)) return [];
  return String(u.subjects ?? u.instructorSubjectKey ?? "").split(",").map(trim).filter((s) => APP.SUBJECTS[s]);
}
/** The subjects someone may manage: admins every subject, teachers theirs. */
export function subjectsOf(u: Pick<User, "role" | "roles" | "subjects" | "instructorSubjectKey">) {
  if (isAdminUser(u)) return Object.keys(APP.SUBJECTS);
  return teachSubjects(u);
}
export const canSubject = (u: User, s: string) => subjectsOf(u).includes(s);

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
/** Birthday (required) + contact channels Facebook / IG / LINE (at least one). */
function contacts(d: Data) {
  const bd = trim(d.birthday);
  if (!bd) throw err("BAD_INPUT", "กรอกวันเดือนปีเกิด");
  const m = bd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!m || !t || isNaN(t.getTime()) || t.getUTCDate() !== +m[3]) throw err("BAD_INPUT", "วันเดือนปีเกิดไม่ถูกต้อง");
  const age = (Date.now() - t.getTime()) / 31557600000;
  if (age < 7 || age > 90) throw err("BAD_INPUT", "ตรวจปีเกิดอีกครั้ง (ใช้ปี พ.ศ.)");
  const out = {
    birthday: bd,
    facebook: clip(d.facebook, 120),
    instagram: clip(String(d.instagram || "").trim().replace(/^@/, ""), 60),
    lineId: clip(String(d.line_id || "").trim().replace(/^@(?=\w)/, ""), 60),
  };
  if (!out.facebook && !out.instagram && !out.lineId) throw err("BAD_INPUT", "กรอกช่องทางติดต่ออย่างน้อย 1 ช่องทาง (Facebook, IG หรือ LINE)");
  return out;
}
function profileFields(d: Data) {
  const grade = req(d.grade, "ระดับชั้น", 20);
  return {
    firstName: req(d.first_name, "ชื่อ", 60), lastName: req(d.last_name, "นามสกุล", 60),
    nickname: req(d.nickname, "ชื่อเล่น", 30), school: req(d.school, "โรงเรียน", 120),
    gradeLevel: grade, phone: phone(d.phone), ...goals(d, grade), ...contacts(d),
  };
}

// Student photo: private FileBlob, visible only to its owner and admins.
type Photo = { mime?: string; base64?: string } | null | undefined;
export function checkPhoto(ph: Photo, required: boolean) {
  if (!ph || !ph.base64) {
    if (required) throw err("BAD_INPUT", "ใส่รูปของน้องด้วย (รูปไหนก็ได้ ขอแค่เป็นรูปน้องเอง)");
    return false;
  }
  if (!/^image\/(jpeg|png|webp)$/.test(ph.mime || "")) throw err("BAD_INPUT", "รูปถ่ายต้องเป็นไฟล์ JPG หรือ PNG");
  if (String(ph.base64).length * 0.75 > APP.PHOTO_MAX_BYTES) throw err("BAD_INPUT", "รูปถ่ายใหญ่เกิน 1 MB ลองเลือกรูปใหม่");
  return true;
}
export async function savePhoto(ph: Photo) {
  const b = await prisma.fileBlob.create({ data: { mime: ph!.mime!, data: Buffer.from(String(ph!.base64), "base64"), isPublic: false } });
  return b.id;
}
export async function photoOut(id: string | null | undefined) {
  if (!id) return null;
  const b = await prisma.fileBlob.findUnique({ where: { id } });
  return b ? { mime: b.mime, base64: Buffer.from(b.data).toString("base64") } : null;
}
const accepted = (v: unknown) => v === true || v === "true";

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
export async function endSessions(userId: string, reason: string) {
  await prisma.ibSession.updateMany({ where: { userId, endedAt: null }, data: { endedAt: new Date(), endReason: reason } });
}

export async function auth(p: Payload) {
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
/** Teachers and admins — the function itself limits teachers to their subjects (staff.courseFor / canSubject). */
function staffOnly(fn: (d: Data, ctx: Ctx, me: User) => Promise<unknown>): Handler {
  return async (d, ctx) => {
    const u = await auth(ctx.p);
    if (!isStaff(u)) throw err("FORBIDDEN", "หน้านี้สำหรับแอดมินและผู้สอนเท่านั้น");
    return fn(d, ctx, u);
  };
}
function adminOnly(fn: (d: Data, ctx: Ctx, admin: User) => Promise<unknown>): Handler {
  return async (d, ctx) => {
    const u = await auth(ctx.p);
    if (!isAdminUser(u)) throw err("FORBIDDEN", "หน้านี้สำหรับแอดมินเท่านั้น");
    return fn(d, ctx, u);
  };
}
async function promoteIfBootstrap(u: User) {
  if (BOOTSTRAP_ADMINS.includes(u.email.toLowerCase()) && !isAdminUser(u)) {
    u = await prisma.user.update({ where: { id: u.id }, data: rolePatch([...rolesOf(u), "admin"]) });
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
  checkPhoto(d.photo, true);
  if (!accepted(d.accept_data)) throw err("BAD_INPUT", "กรุณาติ๊กยินยอมให้เก็บรูปถ่ายและข้อมูลเพิ่มเติมก่อนสมัคร");
  checkPassword(d.password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerified) throw err("EMAIL_TAKEN", "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบหรือกดลืมรหัสผ่าน");
  await rate("otp1:" + email, 1, 60, "รอ 1 นาทีก่อนขอรหัสใหม่");
  await rate("otpH:" + email, 6, 3600, "ขอรหัสบ่อยเกินไป ลองใหม่ในอีก 1 ชั่วโมง");
  // The account is created unverified and only becomes usable once the emailed code is entered.
  const photoBlobId = await savePhoto(d.photo);
  if (existing?.photoBlobId) await prisma.fileBlob.delete({ where: { id: existing.photoBlobId } }).catch(() => {});
  const data = { ...f, password: await hashPw(String(d.password)), termsVersion: APP.TERMS_VERSION, termsAcceptedAt: new Date(), photoBlobId, dataConsentAt: new Date() };
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
  const out: Record<string, unknown> = { token: await newSession(v, p), user: await selfUser(v) };
  try { out.legacy = await staff.legacyMatchUser(v, false); } catch (e) { console.error(e); }
  return out;
}

async function login(d: Data, { p }: Ctx) {
  const email = normEmail(d.email);
  await rate("login:" + email, 8, 900, "ลองเข้าสู่ระบบหลายครั้งเกินไป รอ 15 นาทีแล้วลองใหม่");
  let u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(String(d.password || ""), u.password))) throw err("BAD_LOGIN", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  if (!u.emailVerified) throw err("EMAIL_NOT_VERIFIED", "อีเมลนี้ยังไม่ได้ยืนยัน กด “ลืมรหัสผ่าน” เพื่อรับรหัสทางอีเมลและตั้งรหัสผ่านใหม่");
  if (u.isBanned) throw err("BANNED", "บัญชีนี้ถูกระงับ ติดต่อแอดมินทาง IG");
  u = await promoteIfBootstrap(await prisma.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } }));
  return { token: await newSession(u, p), user: await selfUser(u) };
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
  return { token: await newSession(v, p), user: await selfUser(v) };
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
  const data: Prisma.UserUpdateInput = profileFields(d);
  if (!u.dataConsentAt) {
    if (accepted(d.accept_data)) data.dataConsentAt = new Date();
    else if (d.photo) throw err("BAD_INPUT", "กรุณาติ๊กยินยอมให้เก็บรูปถ่ายและข้อมูลเพิ่มเติมก่อน");
  }
  let oldPhoto = "";
  if (d.photo) {
    checkPhoto(d.photo, true);
    await rate("photo:" + u.id, 10, 3600, "เปลี่ยนรูปบ่อยเกินไป ลองใหม่ภายหลัง");
    oldPhoto = u.photoBlobId || "";
    data.photoBlobId = await savePhoto(d.photo);
  }
  const v = await prisma.user.update({ where: { id: u.id }, data });
  if (oldPhoto) await prisma.fileBlob.delete({ where: { id: oldPhoto } }).catch(() => {});
  return publicUserFull(v);
}
async function myPhoto(_d: Data, { p }: Ctx) {
  return photoOut((await auth(p)).photoBlobId);
}
async function adminUserPhoto(d: Data) {
  const u = await prisma.user.findUnique({ where: { id: String(d.user_id || "") } });
  if (!u) throw err("NOT_FOUND", "ไม่พบผู้ใช้");
  return photoOut(u.photoBlobId);
}

// ───────────────────────── Courses ─────────────────────────
type LessonRow = Lesson & { attachments: Attachment[] };
export type CourseRow = Course & { subject: Subject; lessons: LessonRow[] };
/** Lessons students see: not hidden (a lesson removed from its playlist is hidden, not deleted). */
export const courseInclude = { subject: true, lessons: { where: { hidden: false }, orderBy: { order: "asc" }, include: { attachments: true } } } satisfies Prisma.CourseInclude;
const lessonMin = (l: Lesson) => Math.round((l.duration || 0) / 60);

export function courseCard(c: CourseRow) {
  const key = subjectKey(c.subject);
  return {
    course_id: c.slug, subject: key, subject_name: APP.SUBJECTS[key], title: c.title, subtitle: c.subtitle || "",
    description: c.description || "", cover_url: c.coverImage || "", price: c.price, full_price: c.fullPrice || 0,
    level: c.level || "", status: c.isPublished ? "published" : "draft", updated_month: c.updatedMonth || "",
    lesson_count: c.lessons.length, total_min: c.lessons.reduce((a, l) => a + lessonMin(l), 0),
    teachers: team.instructorsOf(c).map((t) => ({ name: t.name, photo: t.photo })),
    accent: /^#[0-9a-f]{6}$/i.test(c.accent || "") ? c.accent.toLowerCase() : "",
  };
}
export function chapters<T>(lessons: LessonRow[], map: (l: LessonRow) => T) {
  const out: { title: string; lessons: T[] }[] = [];
  const idx: Record<string, number> = {};
  for (const l of lessons) {
    const k = l.chapter || "บทเรียน";
    if (!(k in idx)) { idx[k] = out.length; out.push({ title: k, lessons: [] }); }
    out[idx[k]].lessons.push(map(l));
  }
  return out;
}
export async function courseBySlug(id: unknown) {
  const s = String(id || "").trim();
  return s ? prisma.course.findUnique({ where: { slug: s }, include: courseInclude }) : null;
}

/** A student's standing in one course: approved (may study), pending / rejected slip, or none
    (never asked, or access revoked / past its end date). */
type EnrollState = { status: "approved" | "pending" | "rejected"; note: string; at: Date | null } | null;
const enrActive = (enr: Enrollment | undefined) => enr?.status === "ACTIVE" && (!enr.expiresAt || enr.expiresAt.getTime() > Date.now());
function stateOf(pays: Payment[], enr: Enrollment | undefined): EnrollState {
  const sorted = [...pays].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (enrActive(enr)) {
    const ap = sorted.find((x) => x.status === "APPROVED");
    return { status: "approved", note: ap?.note || "", at: ap?.createdAt ?? enr?.enrolledAt ?? null };
  }
  const last = sorted[0];
  if (!last || last.status === "APPROVED") return null; // approved once but access since removed
  return last.status === "PENDING"
    ? { status: "pending", note: last.note || "", at: last.createdAt }
    : { status: "rejected", note: last.rejectReason || last.note || "", at: last.createdAt };
}
export async function enrollState(userId: string, courseId: string) {
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
  out.instructors = team.instructorsOf(x);
  out.instructor = (out.instructors as unknown[])[0] || null;
  out.faq = parseFaq(x.faq);
  out.bundles = (await shop.publicBundles()).filter((b) => b.course_ids.includes(x.slug));
  out.reviews = await cells.courseReviews(x.id);
  out.trial = await cells.trialStats(x.id);
  out.enrollment = null;
  if (p.token) {
    try {
      const u = await auth(p);
      const e = await enrollState(u.id, x.id);
      out.enrollment = e ? e.status : null;
      out.note = e ? e.note : "";
      out.bill = await shop.openBillFor(u.id, x.slug);
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
  // Teachers and admins can open the classroom of their subjects without access ("ดูแบบนักเรียน").
  const preview = e?.status !== "approved" && canSubject(u, subjectKey(x.subject));
  if (e?.status !== "approved" && !preview) {
    const had = await prisma.payment.findFirst({ where: { userId: u.id, courseId: x.id, status: "APPROVED", revokedAt: null } });
    throw err("NO_ACCESS", had ? "สิทธิ์เข้าเรียนคอร์สนี้หมดอายุแล้ว" : "คอร์สนี้ยังไม่ได้รับสิทธิ์เข้าเรียน");
  }
  const done = new Set(
    (await prisma.lessonProgress.findMany({ where: { userId: u.id, isCompleted: true, lessonId: { in: x.lessons.map((l) => l.id) } } })).map((r) => r.lessonId)
  );
  const out: Record<string, unknown> = courseCard(x);
  out.chapters = chapters(x.lessons, (l) => ({
    lesson_id: l.id, title: l.title, duration_min: lessonMin(l), youtube_id: youtubeId(l.youtubeUrl),
    attachment_url: l.attachments[0]?.fileUrl || "", files: staff.filesOut(l), done: done.has(l.id),
  }));
  out.watermark = u.email + " · " + u.id;
  out.preview = preview;
  out.reviewed = await cells.hasReviewed(u.id, x.id);
  out.review_cells = cells.CELLS.REVIEW;
  return out;
}

async function progressSet(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const l = await prisma.lesson.findUnique({ where: { id: String(d.lesson_id || "") } });
  if (!l) throw err("NOT_FOUND", "ไม่พบบทเรียน");
  const e = await enrollState(u.id, l.courseId);
  if (e?.status !== "approved") {
    const c = await prisma.course.findUnique({ where: { id: l.courseId }, include: { subject: true } });
    if (c && canSubject(u, subjectKey(c.subject))) return { lesson_id: l.id, done: false, preview: true };
    throw err("NO_ACCESS", "ยังไม่ได้รับสิทธิ์");
  }
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
  if ((await shop.courseBlock(u.id, c.slug)) === "in_bill") throw err("ALREADY", "คอร์สนี้อยู่ในคำสั่งซื้อที่ยังไม่เสร็จ ชำระผ่านบิลนั้นที่หน้าคำสั่งซื้อแทน");
  const s = d.slip || {};
  if (!/^image\/(jpeg|png|webp)$/.test(s.mime || "")) throw err("BAD_INPUT", "แนบสลิปเป็นรูปภาพ (JPG หรือ PNG)");
  if (!s.base64 || s.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err("BAD_INPUT", "รูปสลิปใหญ่เกิน 3 MB");
  await rate("slip:" + u.id, 5, 3600, "ส่งสลิปบ่อยเกินไป ลองใหม่ภายหลัง");
  const blob = await prisma.fileBlob.create({ data: { mime: s.mime, data: Buffer.from(String(s.base64), "base64"), isPublic: false } });
  const pay = await prisma.payment.create({
    data: { userId: u.id, courseId: c.id, amount: c.price, promptpayRef: "IB-" + randToken(8), slipImageUrl: "blob:" + blob.id, status: "PENDING", source: "request" },
  });
  await notifyAdmins(
    await adminEmails(),
    "มีคำขอเข้าเรียนใหม่: " + c.title,
    [["นักเรียน", `${u.firstName} ${u.lastName} (${u.nickname || ""})`], ["อีเมล", u.email], ["เบอร์", u.phone || ""],
     ["คอร์ส", c.title], ["ยอดที่ต้องโอน", "฿" + c.price], ["เลขคำสั่งซื้อ", pay.orderNumber || "-"], ["รหัสคำขอ", pay.id]],
    "เข้าหลังบ้าน → คำขอเข้าเรียน เพื่อตรวจสลิปและอนุมัติ",
    await ig()
  );
  return { enroll_id: pay.id, status: "pending" };
}

// ───────────────────────── Admin ─────────────────────────
async function adminStats(_d: Data, _c: Ctx, me: User) {
  if (!isAdminUser(me)) return staff.teacherStats(me);
  const today = bkkDate(), month = today.slice(0, 7);
  const dayStart = new Date(Date.parse(today + "T00:00:00+07:00"));
  const verified = { emailVerified: true } as const;
  const [usersTotal, usersToday, repeatCount, dreams, pending, oldest, approved, reviewing, awaiting, legacyPending, expensePending] = await Promise.all([
    prisma.user.count({ where: verified }),
    prisma.user.count({ where: { ...verified, createdAt: { gte: dayStart } } }),
    prisma.user.count({ where: { ...verified, gradeLevel: { in: APP.REPEAT_GRADES } } }),
    prisma.user.findMany({ where: { ...verified, dreamFaculty: { not: null }, dreamUniversity: { not: null } }, select: { dreamFaculty: true, dreamUniversity: true } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    // Income this month, including accesses revoked later (the money was received).
    prisma.payment.findMany({ where: staff.incomeWhere(staff.periodNow()), include: { course: { include: { subject: true } } } }),
    prisma.bill.findMany({ where: { status: "reviewing" }, select: { submittedAt: true } }),
    prisma.bill.count({ where: { status: "awaiting_payment", OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] } }),
    prisma.legacyClaim.count({ where: { status: "pending" } }),
    prisma.expense.count({ where: { status: "pending" } }),
  ]);
  const subj: Record<string, { subject: string; name: string; count: number; revenue: number }> = {};
  for (const k of Object.keys(APP.SUBJECTS)) subj[k] = { subject: k, name: APP.SUBJECTS[k], count: 0, revenue: 0 };
  let revenue = 0;
  for (const e of approved) {
    revenue += e.amount;
    const k = subjectKey(e.course.subject);
    if (subj[k]) { subj[k].count++; subj[k].revenue += e.amount; }
  }
  return {
    users_total: usersTotal,
    dream_top: topCount(dreams.map((u) => (u.dreamFaculty && u.dreamUniversity ? u.dreamFaculty + " · " + u.dreamUniversity : "")), 6),
    repeat_count: repeatCount,
    users_today: usersToday,
    pending: pending + reviewing.length,
    pending_legacy: pending,
    awaiting,
    oldest_pending: [iso(oldest?.createdAt), ...reviewing.map((b) => iso(b.submittedAt))].filter(Boolean).sort()[0] || "",
    month_revenue: revenue,
    month_count: approved.length,
    by_subject: Object.values(subj),
    email_quota: await remainingQuota(),
    legacy_pending: legacyPending,
    expense_pending: expensePending,
  };
}

const PAY_STATUS: Record<string, "PENDING" | "APPROVED" | "REJECTED"> = { pending: "PENDING", approved: "APPROVED", rejected: "REJECTED" };
async function adminEnrollments(d: Data) {
  const st = PAY_STATUS[String(d.status || "")];
  const rows = await prisma.payment.findMany({
    where: st ? { status: st } : {},
    include: { user: true, course: true },
    orderBy: { createdAt: st === "PENDING" ? "asc" : "desc" },
    take: 200,
  });
  return rows.map((e) => ({
    enroll_id: e.id, order_number: e.orderNumber || "", status: e.revokedAt ? "revoked" : e.status.toLowerCase(), amount: e.amount, note: e.rejectReason || e.note || "", created_at: iso(e.createdAt),
    decided_at: iso(e.reviewedAt), has_slip: !!e.slipImageUrl, course_id: e.course.slug, course_title: e.course.title,
    user_id: e.userId, name: `${e.user.firstName} ${e.user.lastName}`, nickname: e.user.nickname || "", email: e.user.email, phone: e.user.phone || "",
  }));
}

async function adminSlip(d: Data) {
  const e = await prisma.payment.findUnique({ where: { id: String(d.enroll_id || "") } });
  if (!e?.slipImageUrl) throw err("NOT_FOUND", "ไม่พบสลิป");
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

/** May study from now on; a date limits it (a grant "until …"), none = for good. */
export async function activate(userId: string, courseId: string, expiresAt: Date | null = null) {
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, status: "ACTIVE", enrolledAt: new Date(), expiresAt },
    update: { status: "ACTIVE", enrolledAt: new Date(), expiresAt },
  });
}

async function adminDecide(d: Data, _c: Ctx, admin: User) {
  const ok = d.decision === "approve", no = d.decision === "reject";
  if (!ok && !no) throw err("BAD_INPUT", "เลือกอนุมัติหรือปฏิเสธ");
  const id = String(d.enroll_id || ""), note = clip(d.note, 300);
  if (ok) {
    // Same course already paid another way (a cart bill, or added by an admin): approving would count it twice.
    const req = await prisma.payment.findUnique({ where: { id } });
    const dup = req && (await prisma.payment.findFirst({ where: { id: { not: id }, userId: req.userId, courseId: req.courseId, status: "APPROVED", revokedAt: null } }));
    if (dup && (await staff.hasAccess(req.userId, req.courseId)))
      throw err("DUPLICATE", "นักเรียนมีสิทธิ์คอร์สนี้อยู่แล้ว" + (dup.billId ? " จากบิล " + dup.billId : "") + (dup.orderNumber ? " (" + dup.orderNumber + ")" : "") + " คำขอนี้ซ้ำ ให้กด \"ไม่อนุมัติ\" แทน");
  }
  const changed = await prisma.payment.updateMany({
    where: { id, status: "PENDING" },
    data: ok
      ? { status: "APPROVED", note: note || null, reviewedBy: admin.id, reviewedAt: new Date(), source: "request" }
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

/** Give access (free, or paid some other way) to one or more emails. Teachers: their subjects only, no amount. */
async function adminGrant(d: Data, _c: Ctx, admin: User) {
  // One course (course_id) or several at once (course_ids: array, or course_id "a,b,c").
  const raw = Array.isArray(d.course_ids) ? d.course_ids : String(d.course_ids || d.course_id || "").split(",");
  const ids = raw.map((x) => String(x).trim()).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 30);
  if (!ids.length) throw err("BAD_INPUT", "เลือกคอร์สอย่างน้อย 1 คอร์ส");
  const courses = [];
  for (const id of ids) {
    const c = await staff.courseFor(admin, id);
    const twin = await staff.publishedTwin(c);
    if (twin) throw err("BAD_INPUT", (ids.length > 1 ? c.title + ": " : "") + "คอร์สนี้เป็นฉบับร่างที่ชื่อซ้ำกับคอร์สที่เปิดขายแล้ว (" + twin.slug.toUpperCase() + ") ให้สิทธิ์ที่คอร์สนั้นแทน นักเรียนจะได้เห็นคลิปครบ");
    courses.push(c);
  }
  let emails = String(d.emails || d.email || "").split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  emails = emails.filter((x, i) => emails.indexOf(x) === i).slice(0, 200);
  if (!emails.length) throw err("BAD_INPUT", "ใส่อีเมลของนักเรียน");
  const amount = isAdminUser(admin) ? Math.max(0, Math.round(Number(d.amount) || 0)) : 0;
  const exp = String(d.expires_at || "").trim();
  let expires: Date | null = null;
  if (exp) {
    expires = new Date(exp.length === 10 ? exp + "T23:59:59+07:00" : exp);
    if (isNaN(expires.getTime())) throw err("BAD_INPUT", "วันหมดอายุไม่ถูกต้อง");
  }
  const multi = courses.length > 1;
  const reason = clip(d.note || d.reason, 300), out = { added: [] as string[], skipped: [] as { email: string; why: string }[], granted: 0 };
  const mail = new Map<string, { u: User; titles: string[] }>();
  for (const em of emails) {
    const u = await prisma.user.findUnique({ where: { email: em } });
    if (!u || !u.emailVerified) { out.skipped.push({ email: em, why: "ยังไม่ได้สมัครสมาชิก" }); continue; }
    for (const c of courses) {
      if (await staff.hasAccess(u.id, c.id)) { out.skipped.push({ email: multi ? em + " · " + c.title : em, why: "มีสิทธิ์อยู่แล้ว" }); continue; }
      const source = amount > 0 ? "manual" : u.id === admin.id ? "test" : "grant";
      const row = {
        status: "APPROVED" as const, amount, note: reason || (source === "test" ? "ทดสอบโดยทีมงาน" : amount > 0 ? "รับเงินช่องทางอื่น" : "ให้สิทธิ์ฟรี"),
        reviewedBy: admin.id, reviewedAt: new Date(), source, reason,
      };
      const pending = await prisma.payment.findFirst({ where: { userId: u.id, courseId: c.id, status: "PENDING" }, orderBy: { createdAt: "desc" } });
      const pay = pending
        ? await prisma.payment.update({ where: { id: pending.id }, data: row })
        : await prisma.payment.create({ data: { ...row, userId: u.id, courseId: c.id, promptpayRef: "GRANT-" + randToken(8) } });
      await activate(u.id, c.id, expires);
      await log(admin, "grant", (pay.orderNumber ? pay.orderNumber + " " : "") + u.email + " → " + c.slug + " (" + source + (amount ? " ฿" + amount : "") + (expires ? " ถึง " + bkkDate(expires) : "") + ")");
      out.granted++;
      if (!out.added.includes(em)) out.added.push(em);
      if (source !== "test") { const m = mail.get(u.id) || { u, titles: [] }; m.titles.push(c.title); mail.set(u.id, m); }
    }
  }
  // One email per student, listing every course they just got.
  for (const { u, titles } of mail.values()) await sendDecisionEmail(u, titles.join(", "), true, "", await ig());
  if (emails.length === 1 && !out.added.length) {
    const already = out.skipped[0].why === "มีสิทธิ์อยู่แล้ว";
    throw err(already ? "ALREADY" : "NOT_FOUND", already ? (multi ? "ผู้ใช้นี้มีสิทธิ์ทุกคอร์สที่เลือกอยู่แล้ว" : "ผู้ใช้นี้มีสิทธิ์คอร์สนี้อยู่แล้ว") : "ไม่พบผู้ใช้อีเมลนี้ (ต้องสมัครสมาชิกก่อน)");
  }
  return out;
}

async function adminCourses(_d: Data, _c: Ctx, me: User) {
  const cs = await prisma.course.findMany({
    include: { ...courseInclude, _count: { select: { enrollments: { where: staff.activeWhere() } } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return cs.filter((x) => canSubject(me, subjectKey(x.subject))).map((x) => ({
    ...courseCard(x), sort_order: x.sortOrder,
    trailer_youtube: x.trailerYoutube || "", highlights: x.highlights || "", audience: x.audience || "",
    instructor_name: x.instructorName || "", instructor_title: x.instructorTitle || "", instructor_bio: x.instructorBio || "",
    instructor_photo: x.instructorPhoto || "", faq: x.faq || "", students: x._count.enrollments, pay_account_id: x.payAccountId || "",
    instructor2_name: x.instructor2Name || "", instructor2_title: x.instructor2Title || "", instructor2_bio: x.instructor2Bio || "", instructor2_photo: x.instructor2Photo || "",
    playlists: Array.isArray(x.playlists) ? x.playlists : [], can_edit_sales: isAdminUser(me),
    teacher_ids: x.teacherIds || "", pending_change: x.pendingChange || "",
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
  let locked: Course | null = null;
  if (!isAdminUser(admin)) {
    // Teachers: only courses in their subjects, and not the price, status, subject, receiving account or order.
    if (!d.course_id) throw err("FORBIDDEN", "สร้างคอร์สใหม่ได้เฉพาะแอดมิน");
    const c = await staff.courseFor(admin, d.course_id);
    locked = c;
    d = { ...d, subject: subjectKey(c.subject), price: c.price };
  }
  if (!APP.SUBJECTS[d.subject]) throw err("BAD_INPUT", "เลือกวิชา");
  const price = Number(d.price);
  if (!(price >= 0)) throw err("BAD_INPUT", "ราคาต้องเป็นตัวเลข");
  const tr = String(d.trailer_youtube || "").trim();
  const trailer = tr ? youtubeId(tr) : "";
  if (tr && !trailer) throw err("BAD_INPUT", "ลิงก์คลิปแนะนำคอร์สไม่ใช่ลิงก์ YouTube");
  const patch: Prisma.CourseUncheckedUpdateInput = {
    title: req(d.title, "ชื่อคอร์ส", 120), subtitle: clip(d.subtitle, 160), description: clip(d.description, 2000),
    coverImage: clip(d.cover_url, 500) || null, price: Math.round(price), isPublished: d.status === "published",
    sortOrder: Number(d.sort_order) || 0, level: APP.LEVELS.includes(d.level) ? d.level : null,
    fullPrice: d.full_price === "" || d.full_price == null ? null : Math.max(0, Number(d.full_price) || 0),
    highlights: lines(d.highlights, 12, 200).join("\n"), audience: lines(d.audience, 10, 200).join("\n"),
    instructorName: clip(d.instructor_name, 80), instructorTitle: clip(d.instructor_title, 160),
    instructorBio: clip(d.instructor_bio, 1500), instructorPhoto: clip(d.instructor_photo, 500) || null, faq: clip(d.faq, 5000),
    trailerYoutube: trailer || null,
    instructor2Name: clip(d.instructor2_name, 80), instructor2Title: clip(d.instructor2_title, 160), instructor2Bio: clip(d.instructor2_bio, 1500),
    instructor2Photo: clip(d.instructor2_photo, 500) || null, payAccountId: clip(d.pay_account_id, 20) || null,
  };
  // "อัปเดตล่าสุด" badge: admins only, and only when the form sent it (older forms leave it alone).
  if (!locked && d.updated_month !== undefined) {
    const um = String(d.updated_month || "").trim();
    if (um && !/^20\d\d-(0[1-9]|1[0-2])$/.test(um)) throw err("BAD_INPUT", "เลือกเดือนและปีที่อัปเดตล่าสุด");
    patch.updatedMonth = um || null;
  }
  // Who teaches the course (up to 3 teacher / admin profiles): admins only.
  if (!locked && d.teacher_ids != null) {
    const staffIds = (await prisma.user.findMany({ where: { role: { in: ["ADMIN", "INSTRUCTOR"] } }, select: { id: true } })).map((u) => u.id);
    const tids = (Array.isArray(d.teacher_ids) ? d.teacher_ids : String(d.teacher_ids).split(",")).map((x: unknown) => String(x).trim())
      .filter((id: string, i: number, a: string[]) => staffIds.includes(id) && a.indexOf(id) === i);
    if (tids.length > 3) throw err("BAD_INPUT", "เลือกผู้สอนได้สูงสุด 3 คน");
    patch.teacherIds = tids.join(",");
  }
  // Course colour: teachers may set it too.
  if (d.accent !== undefined) {
    const ac = String(d.accent || "").trim();
    if (ac && !/^#[0-9a-f]{6}$/i.test(ac)) throw err("BAD_INPUT", "เลือกสีประจำคอร์สใหม่");
    patch.accent = ac.toLowerCase();
  }
  if (locked) {
    Object.assign(patch, { price: locked.price, fullPrice: locked.fullPrice, isPublished: locked.isPublished, sortOrder: locked.sortOrder, payAccountId: locked.payAccountId });
    // A teacher's new price / "was" price / status is a request for an admin, not a change.
    const want: Record<string, string> = {}, curFull = locked.fullPrice == null ? "" : String(locked.fullPrice), curStatus = locked.isPublished ? "published" : "draft";
    if (d.req_price != null && String(d.req_price) !== "" && Number(d.req_price) >= 0 && String(Number(d.req_price)) !== String(locked.price)) want.price = String(Number(d.req_price));
    if (d.req_full_price != null && String(d.req_full_price) !== curFull) want.full_price = d.req_full_price === "" ? "" : String(Math.max(0, Number(d.req_full_price) || 0));
    if ((d.req_status === "published" || d.req_status === "draft") && d.req_status !== curStatus) want.status = d.req_status;
    if (Object.keys(want).length) patch.pendingChange = JSON.stringify({ ...want, by: admin.id, at: new Date().toISOString() });
  }
  checkImageUrl(String(patch.coverImage || ""));
  checkImageUrl(String(patch.instructorPhoto || ""));
  checkImageUrl(String(patch.instructor2Photo || ""));
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
  await prisma.course.create({ data: { ...(patch as Prisma.CourseUncheckedCreateInput), slug: cid, subjectId: subject.id, categoryId: (await categoryFor(subject.id)).id } });
  await log(admin, "course.create", cid);
  return { course_id: cid };
}

async function adminLessons(d: Data, _c: Ctx, me: User) {
  const c = await staff.courseFor(me, d.course_id);
  const lessons = await prisma.lesson.findMany({ where: { courseId: c.id }, include: { attachments: true }, orderBy: { order: "asc" } });
  return lessons.map((l) => ({
    lesson_id: l.id, course_id: c.slug, chapter: l.chapter || "", title: l.title, youtube_id: youtubeId(l.youtubeUrl),
    duration_min: lessonMin(l), attachment_url: l.attachments[0]?.fileUrl || "", is_preview: l.isPreview, sort_order: l.order,
    hidden: l.hidden, from_playlist: !!l.sourcePlaylist, files: staff.filesOut(l),
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
    const l = await staff.lessonFor(admin, d.lesson_id);
    await prisma.lesson.update({ where: { id: l.id }, data: patch });
    id = l.id;
    await log(admin, "lesson.edit", id);
  } else {
    const c = await staff.courseFor(admin, d.course_id);
    const max = (await prisma.lesson.aggregate({ where: { courseId: c.id }, _max: { order: true } }))._max.order || 0;
    id = (await prisma.lesson.create({ data: { ...patch, type: "VIDEO", order: max + 10, courseId: c.id } })).id;
    await log(admin, "lesson.create", id);
  }
  await prisma.attachment.deleteMany({ where: { lessonId: id } });
  if (att) await prisma.attachment.create({ data: { lessonId: id, fileName: "ไฟล์ประกอบ", fileUrl: att } });
  return { lesson_id: id, youtube_id: yt };
}

async function adminLessonsBulk(d: Data, c: Ctx, admin: User) {
  await staff.courseFor(admin, d.course_id);
  return shop.adminLessonsBulk(d, c, admin);
}

async function adminLessonDelete(d: Data, _c: Ctx, admin: User) {
  const l = await staff.lessonFor(admin, d.lesson_id);
  await prisma.$transaction([prisma.quiz.updateMany({ where: { lessonId: l.id }, data: { lessonId: null } }), prisma.lesson.delete({ where: { id: l.id } })]);
  await log(admin, "lesson.delete", l.id);
  return true;
}

async function adminLessonsReorder(d: Data, _c: Ctx, admin: User) {
  const c = await staff.courseFor(admin, d.course_id);
  const lessons = await prisma.lesson.findMany({ where: { courseId: c.id } });
  const order: string[] = (d.order || []).map(String);
  await prisma.$transaction(
    lessons
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
      ...(q ? { OR: ["email", "firstName", "lastName", "nickname", "phone", "school", "facebook", "instagram", "lineId"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) } : {}),
    },
    include: {
      enrollments: { where: staff.activeWhere(), include: { course: { select: { title: true } } } },
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
  const patch: Prisma.UserUpdateInput = {}, before = rolesOf(u);
  // New: roles = ["admin", "teacher"] (any combination) · older: role = "student" | "teacher" | "admin"
  let roles: string[] | null = Array.isArray(d.roles) ? d.roles.map(String) : d.role ? (d.role === "student" ? [] : [String(d.role)]) : null;
  if (roles) {
    roles = roles.filter((k) => (ROLE_KEYS as readonly string[]).includes(k));
    Object.assign(patch, rolePatch(roles));
    if (roles.includes("teacher")) {
      const subs = (Array.isArray(d.subjects) ? d.subjects.map(String) : String(d.subjects || "").split(",")).map(trim).filter((s: string) => APP.SUBJECTS[s]);
      if (!subs.length) throw err("BAD_INPUT", "เลือกวิชาที่ผู้สอนดูแลอย่างน้อย 1 วิชา");
      patch.subjects = subs.join(",");
      patch.instructorSubjectKey = subs[0];
    } else {
      patch.subjects = null;
      patch.instructorSubjectKey = null;
    }
  }
  if (d.status === "active" || d.status === "banned") patch.isBanned = d.status === "banned";
  await prisma.user.update({ where: { id: u.id }, data: patch });
  const changed = !!roles && ([...roles].sort().join(",") !== [...before].sort().join(",") || String(patch.subjects || "") !== teachSubjects(u).join(","));
  if (patch.isBanned || changed) await endSessions(u.id, patch.isBanned ? "banned" : "admin");
  await log(admin, "user.update", u.email + " " + JSON.stringify({ roles: d.roles, role: d.role, subjects: d.subjects, status: d.status }));
  const out: { ok: true; invite?: unknown } = { ok: true };
  // Became a teacher for the first time: email the invite to fill in the teacher profile, and say how it went.
  if (roles && roles.includes("teacher") && !before.includes("teacher")) out.invite = await team.inviteTeacher(u.id, admin);
  return out;
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
async function adminResults() {
  return (await prisma.studentResult.findMany({ include: { subject: true }, orderBy: { createdAt: "asc" } })).sort(byYearThenSort).map(resultOut);
}
async function adminResultSave(d: Data, _c: Ctx, admin: User) {
  if (!APP.SUBJECTS[d.subject]) throw err("BAD_INPUT", "เลือกวิชา");
  const year = String(d.year || "").replace(/\D/g, "");
  if (!/^25\d\d$/.test(year)) throw err("BAD_INPUT", "ปีต้องเป็น พ.ศ. 4 หลัก เช่น 2569");
  const photo = clip(d.photo_url, 500);
  checkImageUrl(photo);
  const data = {
    year, subjectId: (await subjectFor(d.subject)).id, nickname: req(d.nickname, "ชื่อเล่น", 40), school: clip(d.school, 120), center: clip(d.center, 120),
    review: clip(d.review, 2000), photoUrl: photo || null, isPublished: d.status !== "hidden", sortOrder: Number(d.sort_order) || 0,
  };
  if (d.result_id) {
    const r = await prisma.studentResult.findUnique({ where: { id: String(d.result_id) } });
    if (!r) throw err("NOT_FOUND", "ไม่พบรายการนี้");
    await prisma.studentResult.update({ where: { id: r.id }, data });
    await log(admin, "result.edit", r.id);
    return { result_id: r.id };
  }
  const r = await prisma.studentResult.create({ data });
  await log(admin, "result.create", r.id + " " + r.nickname);
  return { result_id: r.id };
}
async function adminResultDelete(d: Data, _c: Ctx, admin: User) {
  const r = await prisma.studentResult.findUnique({ where: { id: String(d.result_id || "") } });
  if (!r) throw err("NOT_FOUND", "ไม่พบรายการนี้");
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

// ───────────────────────── Routes ─────────────────────────
const ROUTES: Record<string, Handler> = {
  config: async () => ({ ...(await publicSettings()), new_member_promo: await shop.newMemberPromo() }),
  "register.start": registerStart,
  "register.verify": registerVerify,
  login,
  "password.forgot": passwordForgot,
  "password.reset": passwordReset,
  "courses.list": () => publishedCourses(),
  "course.detail": courseDetail,
  "results.list": () => publicResults(),
  "bundles.list": () => shop.publicBundles(),
  "bundle.detail": (d) => shop.bundleDetail(d),
  "cart.quote": (d, c) => shop.cartQuote(d, c),
  me: async (_d, { p }) => selfUser(await auth(p)),
  logout,
  "profile.update": profileUpdate,
  "password.change": passwordChange,
  "my.photo": myPhoto,
  "my.courses": myCourses,
  "learn.get": learnGet,
  "progress.set": progressSet,
  "enroll.request": enrollRequest,
  "order.create": (d, c) => shop.orderCreate(d, c),
  "my.orders": (d, c) => shop.myOrders(d, c),
  "bill.proof": (d, c) => shop.billProof(d, c),
  "bill.cancel": (d, c) => shop.billCancel(d, c),
  "legacy.claim": staff.legacyClaim,
  // Cells (study streaks), reviews, free-episode feedback, grade reports — lib/ib/cells.ts
  "study.ping": cells.studyPing,
  "cells.status": cells.cellsStatus,
  "cells.redeem": cells.cellsRedeem,
  "cells.theme": cells.cellsTheme,
  "review.submit": cells.reviewSubmit,
  "trial.feedback": cells.trialFeedback,
  "grades.submit": cells.gradesSubmit,
  "my.submissions": cells.mySubmissions,
  "admin.cells": adminOnly((d) => cells.adminCells(d)),
  "admin.feedback": adminOnly((d) => cells.adminFeedback(d)),
  "admin.feedback.decide": adminOnly(cells.adminFeedbackDecide),
  "admin.grades.proof": adminOnly((d) => cells.adminGradesProof(d)),
  "learn.file": staff.learnFile,

  "admin.stats": staffOnly(adminStats),
  "admin.enrollments": adminOnly(adminEnrollments),
  "admin.slip": adminOnly(adminSlip),
  "admin.decide": adminOnly(adminDecide),
  "admin.grant": staffOnly(adminGrant),
  "admin.courses": staffOnly(adminCourses),
  "admin.course.save": staffOnly(adminCourseSave),
  "admin.lessons": staffOnly(adminLessons),
  "admin.lesson.save": staffOnly(adminLessonSave),
  "admin.lesson.delete": staffOnly(adminLessonDelete),
  "admin.lessons.bulk": staffOnly(adminLessonsBulk),
  "admin.lessons.reorder": staffOnly(adminLessonsReorder),
  "admin.users": adminOnly(adminUsers),
  "admin.user.photo": adminOnly(adminUserPhoto),
  "admin.user.update": adminOnly(adminUserUpdate),
  "admin.user.resetDevice": adminOnly(adminResetDevice),
  "admin.settings": adminOnly(adminSettings),
  "admin.settings.save": adminOnly(adminSettingsSave),
  "admin.results": adminOnly(adminResults),
  "admin.result.save": adminOnly(adminResultSave),
  "admin.result.delete": adminOnly(adminResultDelete),
  "admin.upload": staffOnly(adminUpload),
  "admin.bills": staffOnly((d, _c, me) => shop.adminBills(d, me)),
  "admin.bill.slip": staffOnly((d, _c, me) => shop.adminBillSlip(d, me)),
  "admin.bill.decide": adminOnly((d, c, a) => shop.adminBillDecide(d, c, a)),
  "admin.accounts": adminOnly(() => shop.adminAccounts()),
  "admin.account.save": adminOnly((d, c, a) => shop.adminAccountSave(d, c, a)),
  "admin.account.delete": adminOnly((d, c, a) => shop.adminAccountDelete(d, c, a)),
  "admin.bundles": staffOnly((_d, _c, me) => shop.adminBundles(me)),
  "admin.bundle.save": adminOnly((d, c, a) => shop.adminBundleSave(d, c, a)),
  "admin.bundle.delete": adminOnly((d, c, a) => shop.adminBundleDelete(d, c, a)),
  "admin.coupons": adminOnly(() => shop.adminCoupons()),
  "admin.coupon.save": adminOnly((d, c, a) => shop.adminCouponSave(d, c, a)),
  "admin.coupon.delete": adminOnly((d, c, a) => shop.adminCouponDelete(d, c, a)),
  // Teachers and admins (limited to the subjects they look after)
  "staff.course.students": staffOnly(staff.courseStudents),
  "staff.chapter.rename": staffOnly(staff.chapterRename),
  "staff.lesson.file.add": staffOnly(staff.lessonFileAdd),
  "staff.lesson.file.delete": staffOnly(staff.lessonFileDelete),
  "staff.revoke": staffOnly(staff.staffRevoke),
  "staff.playlists.save": staffOnly(staff.playlistsSave),
  "staff.playlist.preview": staffOnly(staff.playlistPreview),
  "staff.course.sync": staffOnly(staff.courseSync),
  "fin.summary": staffOnly(staff.finSummary),
  "fin.expense.save": staffOnly(staff.finExpenseSave),
  "fin.expense.delete": staffOnly(staff.finExpenseDelete),
  "fin.receipt": staffOnly(staff.finReceipt),
  "fin.expense.decide": adminOnly(staff.finExpenseDecide),
  "fin.rules": adminOnly(() => staff.finRules()),
  "fin.rules.save": adminOnly(staff.finRulesSave),
  "fin.close": adminOnly(staff.finClose),
  "fin.reopen": adminOnly(staff.finReopen),
  "fin.recut": adminOnly(staff.finRecut),
  "fin.adjust.save": adminOnly(staff.finAdjustSave),
  "fin.adjust.delete": adminOnly(staff.finAdjustDelete),
  "fin.payout.paid": adminOnly(staff.finPayoutPaid),
  "fin.payout.pay": adminOnly(staff.finPayoutPay),
  "fin.payout.slip": staffOnly(staff.finPayoutSlip),
  "fin.payouts.mine": staffOnly(staff.finPayoutsMine),
  "fin.splits": adminOnly(() => staff.finSplits()),
  "fin.splits.save": adminOnly(staff.finSplitsSave),
  "teacher.profile": staffOnly(team.teacherProfile),
  "teacher.profile.save": staffOnly(team.teacherProfileSave),
  "admin.teachers": adminOnly(() => team.adminTeachers()),
  "admin.team.add": adminOnly(team.adminTeamAdd),
  "admin.team.remove": adminOnly(team.adminTeamRemove),
  "admin.course.request": adminOnly(team.adminCourseRequest),
  "admin.teacher.invite": adminOnly(team.adminTeacherInvite),
  "admin.log": adminOnly((d) => staff.adminLog(d)),
  // ชีทสรุป — back office only; nothing public until sheets.SHEETS_ON_SALE
  "admin.sheets": adminOnly(() => sheets.adminSheets()),
  "admin.sheet.save": adminOnly(sheets.sheetSave),
  "admin.sheet.delete": adminOnly(sheets.sheetDelete),
  "admin.sheet.part": adminOnly(sheets.sheetPart),
  "admin.sheet.file.commit": adminOnly(sheets.sheetFileCommit),
  "admin.sheet.file.get": adminOnly(sheets.sheetFileGet),
  "admin.sheet.file.delete": adminOnly(sheets.sheetFileDelete),
  "admin.sheet.bundle.save": adminOnly(sheets.bundleSave),
  "admin.sheet.bundle.delete": adminOnly(sheets.bundleDelete),
  "fin.income.save": adminOnly(staff.finIncomeSave),
  "fin.income.delete": adminOnly(staff.finIncomeDelete),
  "admin.orders.search": adminOnly((d) => staff.adminOrdersSearch(d)),
  "admin.legacy": adminOnly((d) => staff.adminLegacy(d)),
  "admin.legacy.import": adminOnly(staff.adminLegacyImport),
  "admin.legacy.decide": adminOnly(staff.adminLegacyDecide),
  "admin.legacy.release": adminOnly(staff.adminLegacyRelease),
  "admin.legacy.delete": adminOnly(staff.adminLegacyDelete),
};

const ORDER_KEYS = new Set(["order_number", "order_numbers", "orderNumber"]);
function withoutOrderNumbers(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(withoutOrderNumbers);
  if (v && typeof v === "object" && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (!ORDER_KEYS.has(k)) o[k] = withoutOrderNumbers(x);
    return o;
  }
  return v;
}
export async function handle(p: Payload) {
  try {
    const fn = ROUTES[String(p.action || "")];
    if (!fn) throw err("BAD_ACTION", "ไม่รู้จักคำสั่งนี้");
    // Course cards and pages show their teachers' profiles: load them once for this request.
    if (/course|bundle|learn|cart|order|bill/.test(String(p.action))) await team.loadProfiles();
    const data = await fn(p.data || {}, { p });
    // Order numbers are for admins only (they reveal how much a subject sold): whatever a student-facing
    // action returns, they never leave the server. Admin/staff actions filter them per viewer themselves.
    return { ok: true, data: /^(admin|fin|staff)\./.test(String(p.action)) ? data : withoutOrderNumbers(data) };
  } catch (x) {
    if (x instanceof ApiError) return { ok: false, error: x.code, message: x.message };
    console.error("[ib]", p.action, x);
    return { ok: false, error: "SERVER", message: "ระบบขัดข้อง ลองใหม่อีกครั้ง" };
  }
}

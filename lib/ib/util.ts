// Helpers shared by the /api/ib actions — same names and messages as backend/Code.gs.
import crypto from "crypto";

export const APP = {
  NAME: "INeedBio",
  SESSION_DAYS: 30,
  OTP_MINUTES: 10,
  OTP_MAX_TRIES: 5,
  SLIP_MAX_BYTES: 3 * 1024 * 1024,
  SUBJECTS: { bio: "ชีววิทยา", chem: "เคมี", phys: "ฟิสิกส์", math: "คณิตศาสตร์" } as Record<string, string>,
  TERMS_VERSION: "2026-09-25",
  REPEAT_GRADES: ["จบ ม.6 แล้ว", "อื่นๆ"],
  LEVELS: ["สอวน.", "A-Level", "ม.4", "ม.5", "ม.6", "ม.ต้น", "อื่นๆ"],
};

/** An error the web app shows to the user: { ok:false, error: code, message }. */
export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
export const err = (code: string, msg: string) => new ApiError(code, msg);

export const trim = (s: unknown) => String(s ?? "").trim();
export const clip = (s: unknown, n: number) => String(s == null ? "" : s).trim().slice(0, n);
export function req(v: unknown, label: string, max: number) {
  const s = clip(v, max);
  if (!s) throw err("BAD_INPUT", "กรอก" + label);
  return s;
}
export function normEmail(e: unknown) {
  const s = String(e || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(s) || s.length > 120) throw err("BAD_INPUT", "รูปแบบอีเมลไม่ถูกต้อง");
  return s;
}
export function phone(p: unknown) {
  const s = String(p || "").replace(/[^\d]/g, "");
  if (!/^0\d{8,9}$/.test(s)) throw err("BAD_INPUT", "เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)");
  return s;
}
export function checkPassword(pw: unknown) {
  if (String(pw || "").length < 8) throw err("BAD_INPUT", "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว");
}
export const isRepeat = (grade: string | null | undefined) => APP.REPEAT_GRADES.includes(grade || "");

export function lines(v: unknown, max: number, len: number) {
  return String(v || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim().slice(0, len))
    .filter(Boolean)
    .slice(0, max);
}
/** FAQ: blocks separated by a blank line; first line = question, the rest = answer. */
export function parseFaq(v: unknown) {
  return String(v || "")
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((b) => {
      const ls = b.split("\n").map(trim).filter(Boolean);
      return ls.length ? { q: ls[0].replace(/^(ถาม|Q)\s*[:：]\s*/i, ""), a: ls.slice(1).join("\n").replace(/^(ตอบ|A)\s*[:：]\s*/i, "") } : null;
    })
    .filter((f): f is { q: string; a: string } => !!f && !!f.a)
    .slice(0, 20);
}
export function topCount(arr: string[], n: number) {
  const o: Record<string, number> = {};
  for (let v of arr) {
    v = String(v || "").trim();
    if (v) o[v] = (o[v] || 0) + 1;
  }
  return Object.keys(o)
    .map((k) => ({ name: k, count: o[k] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
export function youtubeId(u: unknown) {
  const s = String(u || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}
/** Course ids typed by the admin ("BIO-POSN") become URL slugs ("bio-posn"). */
export const slug = (s: unknown) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
export const esc = (s: unknown) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const randToken = (bytes = 24) => crypto.randomBytes(bytes).toString("hex");
export const otpCode = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : "");
/** Image links saved from หลังบ้าน: https:// or a file shipped with the site (/images/...). */
export function checkImageUrl(u: string) {
  if (u && !/^https:\/\//.test(u) && !/^\/[^/]/.test(u)) throw err("BAD_INPUT", "ลิงก์รูปต้องขึ้นต้นด้วย https://");
}
/** "YYYY-MM-DD" / "YYYY-MM" in Thai time, for "today" and "this month" in the admin stats. */
export function bkkDate(d: Date = new Date()) {
  return new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
}

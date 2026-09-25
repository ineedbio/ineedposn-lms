import { Resend } from "resend";
import nodemailer from "nodemailer";
import { getSettings } from "./settings";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL!;
const FROM = process.env.EMAIL_FROM ?? "INeedBio <onboarding@resend.dev>";

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

const smtpPort = Number(process.env.SMTP_PORT ?? 465);
const smtp = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    })
  : null;

async function send(opts: { to: string | string[]; subject: string; html: string }) {
  if (smtp) {
    try {
      await smtp.sendMail({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
    } catch (err) {
      console.error("[email] SMTP send failed", { to: opts.to, subject: opts.subject, err });
      throw new Error(`SMTP send failed: ${(err as Error).message}`);
    }
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("No email transport configured — set SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY");
  }
  // Constructed lazily (only once we know we're actually sending through
  // Resend) — the Resend constructor throws on a missing key, and eagerly
  // building it at module load broke `next build`'s page-data collection
  // for every route that imports this file when RESEND_API_KEY isn't set
  // (e.g. while SMTP is the active transport, or during a build with no env).
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    console.error("[email] Resend send failed", { to: opts.to, subject: opts.subject, error });
    throw new Error(`Resend rejected the email: ${error.name} — ${error.message}`);
  }
}

// ฟังก์ชันสร้าง Template อีเมล OTP พร้อม One-Tap Select
function renderOtpEmail({
  title,
  description,
  otp,
  name,
}: {
  title: string;
  description: string;
  otp: string;
  name?: string;
}) {
  const digits = String(otp).padStart(6, " ").split("");
  const digitBoxes = digits
    .map(
      (d) => `
      <td style="padding:0 4px;">
        <div style="width:44px;height:56px;line-height:56px;border:1px solid #d1e7dd;border-radius:10px;background:#f3faf6;font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#0f5132;text-align:center;">${d}</div>
      </td>`
    )
    .join("");

  const greeting = name ? `สวัสดี น้อง${name} 👋` : "สวัสดีครับ 👋";

  return `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f5f7;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">รหัสยืนยันของคุณคือ ${otp} (ใช้ได้ภายใน 10 นาที)</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e8eb;font-family:'Sarabun','Leelawadee UI',Tahoma,Arial,sans-serif;"><tr><td style="height:6px;background:#198754;font-size:0;line-height:0;">&nbsp;</td></tr><tr><td style="padding:28px 32px 8px;"><span style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.3px;">INeed<span style="color:#198754;">Bio</span></span></td></tr><tr><td style="padding:12px 32px 0;"><h1 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#111827;">${title}</h1><p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">${greeting}<br>${description}</p></td></tr><tr><td align="center" style="padding:28px 16px 8px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${digitBoxes}</tr></table><div style="margin-top:14px;font-size:13px;color:#6b7280;">แตะที่รหัสเพื่อคัดลอก: <span style="display:inline-block;padding:4px 12px;background:#f3faf6;border:1px solid #d1e7dd;border-radius:8px;font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#0f5132;user-select:all;-webkit-user-select:all;-moz-user-select:all;-ms-user-select:all;letter-spacing:3px;cursor:pointer;">${otp}</span></div></td></tr><tr><td align="center" style="padding:6px 32px 28px;"><span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#fff7e6;color:#8a5300;font-size:13px;">⏱ รหัสนี้ใช้ได้ภายใน 10 นาที</span></td></tr><tr><td style="padding:0 32px;"><div style="border-top:1px solid #eef0f2;"></div></td></tr><tr><td style="padding:18px 32px 26px;font-size:13px;line-height:1.7;color:#6b7280;">ห้ามแชร์รหัสนี้ให้ผู้อื่น ทีมงาน INeedBio จะไม่ขอรหัสนี้จากคุณในทุกกรณี<br>หากคุณไม่ได้ทำรายการนี้ สามารถละเว้นอีเมลนี้ได้เลย</td></tr><tr><td style="background:#f9fafb;padding:18px 32px;font-size:12px;line-height:1.7;color:#9ca3af;text-align:center;">มีคำถาม? ทักมาได้ที่ IG <a href="https://www.instagram.com/ineedbiochem" style="color:#198754;text-decoration:none;font-weight:600;">@ineedbiochem</a><br>© 2026 INeedBio · อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ</td></tr></table></td></tr></table></body></html>`;
}

export async function sendRegistrationOtp(params: { email: string; otp: string; name?: string }) {
  await send({
    to: params.email,
    subject: "รหัสยืนยันการสมัครสมาชิก INeedBio",
    html: renderOtpEmail({
      title: "ยืนยันอีเมลของคุณ",
      description: "ยินดีต้อนรับสู่ INeedBio! กรอกรหัสด้านล่างในหน้าสมัครสมาชิกเพื่อยืนยันอีเมล",
      otp: params.otp,
      name: params.name,
    }),
  });
}

export async function sendPasswordResetOtp(params: { email: string; otp: string; name?: string }) {
  await send({
    to: params.email,
    subject: "รหัสยืนยันสำหรับตั้งรหัสผ่านใหม่ INeedBio",
    html: renderOtpEmail({
      title: "ตั้งรหัสผ่านใหม่ของคุณ",
      description: "คุณได้ขอตั้งรหัสผ่านใหม่สำหรับบัญชี INeedBio กรอกรหัสด้านล่างเพื่อยืนยันตัวตน",
      otp: params.otp,
      name: params.name,
    }),
  });
}

export async function notifyAdminNewEnrollment(params: {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: number;
  promptpayRef: string;
}) {
  // Recipients come from หลังบ้าน → ตั้งค่า (comma-separated), falling back to the env var.
  const configured = (await getSettings()).admin_emails.split(",").map((s) => s.trim()).filter(Boolean);
  await send({
    to: configured.length ? configured : ADMIN_EMAIL,
    subject: `มีนักเรียนสมัครเรียนใหม่ — ${params.courseTitle}`,
    html: `
      <div style="font-family: sans-serif; font-size:14px; color:#111;">
        <p><strong>${params.studentName}</strong> (${params.studentEmail}) สมัครเรียนคอร์ส
        <strong>${params.courseTitle}</strong> ยอดเงิน ฿${params.amount.toLocaleString()}</p>
        <p>เลขอ้างอิง PromptPay: <code>${params.promptpayRef}</code></p>
        <p>เข้าไปตรวจสอบสลิปและอนุมัติได้ที่หน้า Admin → Payments</p>
      </div>
    `,
  });
}

export async function notifyStudentPaymentReviewed(params: {
  studentEmail: string;
  courseTitle: string;
  approved: boolean;
  reason?: string;
}) {
  await send({
    to: params.studentEmail,
    subject: params.approved
      ? `คอร์ส ${params.courseTitle} ปลดล็อกแล้ว!`
      : `การชำระเงินสำหรับ ${params.courseTitle} ถูกปฏิเสธ`,
    html: params.approved
      ? `<p>ยินดีด้วย! คอร์ส <strong>${params.courseTitle}</strong> พร้อมให้เรียนแล้ว</p>`
      : `<p>การชำระเงินสำหรับ <strong>${params.courseTitle}</strong> ถูกปฏิเสธ: ${params.reason ?? "กรุณาตรวจสอบสลิปและลองใหม่"}</p>`,
  });
}
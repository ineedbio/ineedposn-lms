import { Resend } from "resend";
import nodemailer from "nodemailer";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL!;
const FROM = process.env.EMAIL_FROM ?? "INeedBio <onboarding@resend.dev>";

/**
 * Two transports, picked at runtime:
 *   - SMTP (e.g. Gmail app password) when SMTP_HOST/SMTP_USER/SMTP_PASS are set
 *   - Resend otherwise
 * Flip between them with env vars only — no code change. SMTP is the fallback
 * while the ineedbio.shop domain is unavailable and can't be verified in Resend.
 *
 * Both paths THROW on failure so the caller can surface it (Resend's SDK returns
 * `{ error }` instead of throwing, so that case is turned into a throw here).
 */
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

const otpBlock = (intro: string, otp: string, outro: string) => `
  <div style="font-family: sans-serif; font-size:14px; color:#111;">
    <p>${intro}</p>
    <p style="font-size:28px; font-weight:700; letter-spacing:4px;">${otp}</p>
    <p>${outro}</p>
  </div>
`;

export async function sendRegistrationOtp(params: { email: string; otp: string }) {
  await send({
    to: params.email,
    subject: "รหัสยืนยันการสมัครสมาชิก INeedBio",
    html: otpBlock(
      "ยินดีต้อนรับสู่ INeedBio! กรอกรหัสนี้เพื่อยืนยันอีเมลของคุณ",
      params.otp,
      "รหัสนี้ใช้ได้ภายใน 10 นาที"
    ),
  });
}

export async function sendPasswordResetOtp(params: { email: string; otp: string }) {
  await send({
    to: params.email,
    subject: "รหัสยืนยันสำหรับตั้งรหัสผ่านใหม่ INeedBio",
    html: otpBlock(
      "คุณขอตั้งรหัสผ่านใหม่สำหรับบัญชี INeedBio",
      params.otp,
      "รหัสนี้ใช้ได้ภายใน 10 นาที หากคุณไม่ได้เป็นคนขอ สามารถละเว้นอีเมลนี้ได้"
    ),
  });
}

export async function notifyAdminNewEnrollment(params: {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: number;
  promptpayRef: string;
}) {
  await send({
    to: ADMIN_EMAIL,
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

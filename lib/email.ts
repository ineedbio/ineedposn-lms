import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL!;
const FROM = process.env.EMAIL_FROM ?? "INeedBio <onboarding@resend.dev>";

/**
 * Resend's SDK returns `{ data, error }` and does NOT throw on API-level
 * failures (unverified sending domain, revoked key, rate limit...). Code that
 * ignores `error` cannot tell a failed send from a successful one — that is how
 * OTP emails were silently disappearing. Every send goes through here so a
 * failure becomes a thrown error the caller can surface to the user.
 */
async function send(opts: { to: string | string[]; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    console.error("[email] send failed", { to: opts.to, subject: opts.subject, error });
    throw new Error(`Resend rejected the email: ${error.name} — ${error.message}`);
  }
  return data;
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

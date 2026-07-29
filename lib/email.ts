import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL!;
const FROM = process.env.EMAIL_FROM ?? "INeedPOSN <notify@ineedposn.com>";

export async function sendRegistrationOtp(params: { email: string; otp: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.email,
    subject: `รหัสยืนยันการสมัครสมาชิก INeedBio: ${params.otp}`,
    html: `
      <div style="font-family: sans-serif; font-size:14px; color:#111;">
        <p>ยินดีต้อนรับสู่ INeedBio! กรอกรหัสนี้เพื่อยืนยันอีเมลของคุณ</p>
        <p style="font-size:28px; font-weight:700; letter-spacing:4px;">${params.otp}</p>
        <p>รหัสนี้ใช้ได้ภายใน 10 นาที</p>
      </div>
    `,
  });
}

export async function sendPasswordResetOtp(params: { email: string; otp: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.email,
    subject: `รหัสยืนยันสำหรับตั้งรหัสผ่านใหม่: ${params.otp}`,
    html: `
      <div style="font-family: sans-serif; font-size:14px; color:#111;">
        <p>คุณขอตั้งรหัสผ่านใหม่สำหรับบัญชี INeedBio</p>
        <p style="font-size:28px; font-weight:700; letter-spacing:4px;">${params.otp}</p>
        <p>รหัสนี้ใช้ได้ภายใน 10 นาที หากคุณไม่ได้เป็นคนขอ สามารถละเว้นอีเมลนี้ได้</p>
      </div>
    `,
  });
}

export async function notifyAdminNewEnrollment(params: {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: number;
  promptpayRef: string;
}) {
  await resend.emails.send({
    from: FROM,
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
  await resend.emails.send({
    from: FROM,
    to: params.studentEmail,
    subject: params.approved
      ? `คอร์ส ${params.courseTitle} ปลดล็อกแล้ว!`
      : `การชำระเงินสำหรับ ${params.courseTitle} ถูกปฏิเสธ`,
    html: params.approved
      ? `<p>ยินดีด้วย! คอร์ส <strong>${params.courseTitle}</strong> พร้อมให้เรียนแล้ว</p>`
      : `<p>การชำระเงินสำหรับ <strong>${params.courseTitle}</strong> ถูกปฏิเสธ: ${params.reason ?? "กรุณาตรวจสอบสลิปและลองใหม่"}</p>`,
  });
}

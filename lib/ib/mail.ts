// Outgoing email for the web app: the Code.gs templates, sent through SMTP (Gmail app password)
// or Resend — whichever is configured, same env vars as before.
import nodemailer from "nodemailer";
import { prisma } from "../prisma";
import { APP, err, esc } from "./util";

const FROM = process.env.EMAIL_FROM ?? "INeedBio <onboarding@resend.dev>";
const DAILY_QUOTA = Number(process.env.MAIL_DAILY_QUOTA || 500);

const smtpPort = Number(process.env.SMTP_PORT ?? 465);
const smtp =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

const counterKey = () => "mail:" + new Date().toISOString().slice(0, 10);

/** How many more emails can go out today (counted per UTC day, like Gmail's quota). */
export async function remainingQuota() {
  const hit = await prisma.rateLimitHit.findUnique({ where: { key: counterKey() } });
  return Math.max(0, DAILY_QUOTA - (hit?.count ?? 0));
}

async function send(to: string | string[], subject: string, html: string) {
  if (smtp) {
    await smtp.sendMail({ from: FROM, to, subject, html });
  } else if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: FROM, to, subject, html });
    if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
  } else if (process.env.NODE_ENV !== "production") {
    // Local development without a mail transport: print instead of sending.
    console.log(`[mail] to=${to} subject=${subject}`);
  } else {
    throw new Error("No email transport configured — set SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY");
  }
  const key = counterKey();
  await prisma.rateLimitHit.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date(Date.now() + 2 * 864e5) },
    update: { count: { increment: 1 } },
  });
}

function shell(title: string, inner: string, ig: string) {
  return (
    '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#f4f4f3;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f3;padding:32px 12px;"><tr><td align="center">' +
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e6e4;font-family:'Anuphan','Sarabun','Leelawadee UI',Tahoma,Arial,sans-serif;\">" +
    '<tr><td style="padding:28px 32px 4px;"><span style="font-size:20px;font-weight:700;color:#0c0c0c;letter-spacing:-0.3px;">INeed<span style="font-weight:300;">Bio</span></span></td></tr>' +
    '<tr><td style="padding:14px 32px 0;"><h1 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#0c0c0c;">' + esc(title) + "</h1></td></tr>" +
    inner +
    '<tr><td style="background:#fafafa;padding:18px 32px;font-size:12px;line-height:1.7;color:#8a8a8a;text-align:center;border-top:1px solid #efefed;">' +
    'มีคำถาม? ทักมาได้ที่ IG <a href="https://www.instagram.com/' + esc(ig) + '" style="color:#0c0c0c;font-weight:600;text-decoration:none;">@' + esc(ig) +
    "</a><br>© " + new Date().getFullYear() + " INeedBio · อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ</td></tr>" +
    "</table></td></tr></table></body></html>"
  );
}

export async function sendOtpEmail(email: string, otp: string, name: string, purpose: "register" | "reset", ig: string) {
  if ((await remainingQuota()) < 1) throw err("MAIL_QUOTA", "วันนี้ระบบส่งอีเมลครบโควตาแล้ว ลองใหม่พรุ่งนี้ หรือทัก IG แอดมิน");
  const reg = purpose === "register";
  const cells = otp
    .split("")
    .map(
      (d) =>
        "<td style=\"padding:0 4px;\"><div style=\"width:44px;height:56px;line-height:56px;border:1px solid #dcdcda;border-radius:10px;background:#fafafa;font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#0c0c0c;text-align:center;\">" +
        d +
        "</div></td>"
    )
    .join("");
  const inner =
    '<tr><td style="padding:0 32px;"><p style="margin:0;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc(name) + "<br>" +
    (reg ? "ยินดีต้อนรับสู่ INeedBio! กรอกรหัสด้านล่างในหน้าสมัครสมาชิกเพื่อยืนยันอีเมล" : "มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีนี้ กรอกรหัสด้านล่างเพื่อดำเนินการต่อ") + "</p></td></tr>" +
    '<tr><td align="center" style="padding:26px 16px 8px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>' + cells + "</tr></table></td></tr>" +
    '<tr><td align="center" style="padding:6px 32px 24px;"><span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#f1f1ef;color:#525252;font-size:13px;">รหัสนี้ใช้ได้ภายใน ' + APP.OTP_MINUTES + " นาที</span></td></tr>" +
    '<tr><td style="padding:0 32px 24px;font-size:13px;line-height:1.7;color:#8a8a8a;">ห้ามแชร์รหัสนี้ให้ผู้อื่น ทีมงาน INeedBio จะไม่ขอรหัสนี้จากคุณในทุกกรณี<br>' +
    (reg ? "หากคุณไม่ได้สมัครสมาชิก สามารถละเว้นอีเมลนี้ได้" : "หากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน ละเว้นอีเมลนี้ได้ รหัสผ่านเดิมยังใช้ได้ตามปกติ") + "</td></tr>";
  const subject = otp + (reg ? " คือรหัสยืนยันการสมัครสมาชิก INeedBio" : " คือรหัสตั้งรหัสผ่านใหม่ INeedBio");
  try {
    await send(email, subject, shell(reg ? "ยืนยันอีเมลของคุณ" : "ตั้งรหัสผ่านใหม่", inner, ig));
  } catch (e) {
    console.error("[mail] OTP send failed", e);
    throw err("MAIL", "ส่งอีเมลไม่สำเร็จ ลองใหม่อีกครั้ง หรือทัก IG แอดมิน");
  }
}

export async function sendDecisionEmail(
  u: { email: string; nickname: string | null; firstName: string },
  courseTitle: string,
  approved: boolean,
  note: string,
  ig: string
) {
  if ((await remainingQuota()) < 1) return;
  const inner =
    '<tr><td style="padding:0 32px 26px;"><p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc(u.nickname || u.firstName) + "<br>" +
    (approved
      ? 'แอดมินตรวจสลิปแล้ว ตอนนี้เข้าเรียนคอร์ส <b style="color:#0c0c0c;">' + esc(courseTitle) + "</b> ได้เลย เข้าสู่ระบบแล้วไปที่ “คอร์สของฉัน”"
      : 'คำขอเข้าเรียนคอร์ส <b style="color:#0c0c0c;">' + esc(courseTitle) + "</b> ยังไม่ผ่านการตรวจสลิป") + "</p>" +
    (!approved && note ? '<p style="margin:0 0 14px;padding:12px 14px;background:#fafafa;border-radius:10px;font-size:14px;color:#0c0c0c;">เหตุผล: ' + esc(note) + "</p>" : "") +
    (!approved ? '<p style="margin:0;font-size:14px;color:#525252;">แก้ไขแล้วส่งสลิปใหม่ได้ที่หน้าคอร์ส หรือทัก IG แอดมินเพื่อสอบถาม</p>' : "") + "</td></tr>";
  try {
    await send(u.email, approved ? "เข้าเรียนได้แล้ว: " + courseTitle : "คำขอเข้าเรียนยังไม่ผ่าน: " + courseTitle, shell(approved ? "เข้าเรียนได้แล้ว" : "คำขอยังไม่ผ่าน", inner, ig));
  } catch (e) {
    console.error("[mail] decision send failed", e); // the decision itself is saved; the email is best-effort
  }
}

export async function sendBillEmail(
  u: { email: string; nickname: string | null; firstName: string },
  billId: string,
  titles: string[],
  approved: boolean,
  note: string,
  ig: string
) {
  if ((await remainingQuota()) < 1) return;
  const list = '<ul style="margin:0 0 14px;padding-left:18px;color:#0c0c0c;">' + titles.map((t) => '<li style="margin:4px 0;">' + esc(t) + "</li>").join("") + "</ul>";
  const inner =
    '<tr><td style="padding:0 32px 26px;"><p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc(u.nickname || u.firstName) + "<br>" +
    (approved
      ? 'แอดมินตรวจยอดเงินบิล <b style="color:#0c0c0c;">' + esc(billId) + "</b> แล้ว เข้าเรียนคอร์สเหล่านี้ได้เลยที่เมนู “คอร์สของฉัน”"
      : 'หลักฐานการโอนของบิล <b style="color:#0c0c0c;">' + esc(billId) + "</b> ยังไม่ผ่านการตรวจ") + "</p>" + list +
    (!approved && note ? '<p style="margin:0 0 14px;padding:12px 14px;background:#fafafa;border-radius:10px;font-size:14px;color:#0c0c0c;">เหตุผล: ' + esc(note) + "</p>" : "") +
    (!approved ? '<p style="margin:0;font-size:14px;color:#525252;">แก้ไขแล้วส่งหลักฐานใหม่ได้ที่หน้า “คำสั่งซื้อ” หรือทัก IG แอดมินเพื่อสอบถาม</p>' : "") + "</td></tr>";
  try {
    await send(u.email, approved ? "เข้าเรียนได้แล้ว · บิล " + billId : "หลักฐานการโอนยังไม่ผ่าน · บิล " + billId, shell(approved ? "เข้าเรียนได้แล้ว" : "หลักฐานการโอนยังไม่ผ่าน", inner, ig));
  } catch (e) {
    console.error("[mail] bill decision send failed", e);
  }
}

export async function notifyAdmins(to: string[], subject: string, rows: [string, string][], footer: string, ig: string) {
  if (!to.length || (await remainingQuota()) < to.length) return;
  const inner =
    '<tr><td style="padding:0 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">' +
    rows
      .map(
        (r) =>
          '<tr><td style="padding:7px 0;color:#8a8a8a;width:120px;border-bottom:1px solid #efefed;">' + esc(r[0]) +
          '</td><td style="padding:7px 0;color:#0c0c0c;border-bottom:1px solid #efefed;">' + esc(r[1]) + "</td></tr>"
      )
      .join("") +
    '</table></td></tr><tr><td style="padding:14px 32px 26px;font-size:13px;color:#525252;">' + esc(footer) + "</td></tr>";
  try {
    await send(to, subject, shell(subject, inner, ig));
  } catch (e) {
    console.error("[mail] admin notify failed", e);
  }
}

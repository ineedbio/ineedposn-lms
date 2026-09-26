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

// ── Order / bill emails (Code.gs v2): items, amount, the bill's account, deadline and a button back to the site ──
type MailUser = { email: string; nickname: string | null; firstName: string };
type MailItem = { title: string; bundle?: string; price?: number; discount?: number; net?: number };
type MailAccount = { method?: string; bank?: string; account_no?: string; account_name?: string; promptpay_id?: string };
export type MailBill = { id: string; orderId: string; status: string; total: number; items: MailItem[]; account: MailAccount; expiresAt: Date | null; paidAt?: string };

const bahtTxt = (n: unknown) => "฿" + Number(n || 0).toLocaleString("en-US");
/** "26 ก.ย. 2569 14:05 น." in Thai time. */
export function thDateTxt(v: Date | string) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const t = new Date(d.getTime() + 7 * 36e5);
  return t.getUTCDate() + " " + M[t.getUTCMonth()] + " " + (t.getUTCFullYear() + 543) + " " + ("0" + t.getUTCHours()).slice(-2) + ":" + ("0" + t.getUTCMinutes()).slice(-2) + " น.";
}
function mailBtn(href: string, label: string) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 0;"><tr><td style="border-radius:999px;background:#1f7a4d;"><a href="' + esc(href) + '" style="display:inline-block;padding:12px 26px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;">' + esc(label) + "</a></td></tr></table>";
}
function mailRows(items: MailItem[]) {
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">' +
    items
      .map(
        (i) =>
          '<tr><td style="padding:7px 0;color:#0c0c0c;border-bottom:1px dashed #e6e6e4;">' + esc(i.title) + (i.bundle ? '<br><span style="font-size:12px;color:#1f7a4d;">แพ็กเกจ ' + esc(i.bundle) + "</span>" : "") + "</td>" +
          '<td align="right" style="padding:7px 0;color:#0c0c0c;border-bottom:1px dashed #e6e6e4;white-space:nowrap;vertical-align:top;">' +
          (i.discount ? '<span style="color:#8a8a8a;text-decoration:line-through;font-size:12px;">' + bahtTxt(i.price) + "</span> " : "") + bahtTxt(i.net != null ? i.net : i.price) + "</td></tr>"
      )
      .join("") +
    "</table>"
  );
}

/** Order confirmation: each bill with its amount, account and deadline, and what to do next. */
export async function sendOrderEmail(
  u: MailUser,
  res: { order_id: string; discount: number; coupon: string },
  bills: MailBill[],
  site: string,
  ig: string
) {
  if (!bills.length || (await remainingQuota()) < 1) return;
  const link = site + "/#/orders/" + encodeURIComponent(res.order_id);
  const open = bills.filter((b) => b.status === "awaiting_payment");
  const billBox = (b: MailBill, i: number) => {
    const acc = b.account || {}, paid = b.status === "approved";
    const accRows: [string, string | undefined][] =
      acc.method === "bank"
        ? [["ธนาคาร", acc.bank], ["เลขบัญชี", acc.account_no], ["ชื่อบัญชี", acc.account_name]]
        : [["พร้อมเพย์", acc.promptpay_id], ["ชื่อบัญชี", acc.account_name]];
    return (
      '<tr><td style="padding:0 32px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e6e4;border-radius:14px;">' +
      '<tr><td style="padding:14px 16px 4px;"><span style="font-size:12px;color:#8a8a8a;">' + (bills.length > 1 ? "บิลที่ " + (i + 1) + " จาก " + bills.length + " · " : "") + esc(b.id) + "</span></td></tr>" +
      '<tr><td style="padding:0 16px 6px;">' + mailRows(b.items) + "</td></tr>" +
      '<tr><td style="padding:6px 16px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:#525252;">' + (paid ? "ยอด 0 บาท เปิดสิทธิ์แล้ว" : "ยอดที่ต้องโอน") +
      '</td><td align="right" style="font-size:22px;font-weight:700;color:#0c0c0c;">' + bahtTxt(b.total) + "</td></tr></table></td></tr>" +
      (paid
        ? ""
        : '<tr><td style="padding:0 16px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;border-radius:10px;font-size:14px;">' +
          accRows.map((r) => '<tr><td style="padding:8px 12px;color:#8a8a8a;width:90px;">' + r[0] + '</td><td style="padding:8px 12px;color:#0c0c0c;font-weight:600;">' + esc(r[1] || "-") + "</td></tr>").join("") +
          '</table><p style="margin:10px 0 0;font-size:13px;color:#8a5a00;">โอนเข้าบัญชีนี้เท่านั้น · ชำระภายใน ' + esc(b.expiresAt ? thDateTxt(b.expiresAt) : "-") + "</p></td></tr>") +
      "</table></td></tr>"
    );
  };
  const inner =
    '<tr><td style="padding:0 32px 18px;"><p style="margin:0;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc(u.nickname || u.firstName) + "<br>" +
    (open.length
      ? 'ได้รับคำสั่งซื้อ <b style="color:#0c0c0c;">' + esc(res.order_id) + "</b> แล้ว " + (open.length > 1 ? "คำสั่งซื้อนี้มี " + open.length + " บิลเพราะรับเงินคนละบัญชี กรุณาโอนแยกตามบิล" : "โอนเงินตามยอดด้านล่างได้เลย")
      : 'คำสั่งซื้อ <b style="color:#0c0c0c;">' + esc(res.order_id) + "</b> เรียบร้อย เข้าเรียนได้ทันที") + "</p></td></tr>" +
    bills.map(billBox).join("") +
    (res.discount ? '<tr><td style="padding:0 32px 12px;font-size:13px;color:#1f7a4d;">ประหยัดไป ' + bahtTxt(res.discount) + (res.coupon ? " (รวมโค้ด " + esc(res.coupon) + ")" : "") + "</td></tr>" : "") +
    (open.length
      ? '<tr><td style="padding:4px 32px 8px;"><p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0c0c0c;">ขั้นตอนต่อไป</p>' +
        '<ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:#525252;"><li>โอนเงินตามยอดของแต่ละบิล</li><li>แนบสลิปและกรอกข้อมูลการโอนในหน้าคำสั่งซื้อ</li><li>แจ้งการชำระเงินทาง IG @' + esc(ig) +
        " อีกครั้ง</li><li>แอดมินตรวจยอดแล้วเปิดสิทธิ์ ระบบส่งอีเมลแจ้ง</li></ol></td></tr>"
      : "") +
    '<tr><td style="padding:10px 32px 26px;">' + mailBtn(open.length ? link : site + "/#/my", open.length ? "ไปหน้าชำระเงิน" : "เข้าห้องเรียน") +
    (open.length ? '<p style="margin:14px 0 0;font-size:12.5px;line-height:1.7;color:#8a8a8a;">ไม่มีนโยบายคืนเงินทุกกรณีเมื่อชำระเงินแล้ว · INeedBio ไม่รับผิดชอบการโอนเข้าบัญชีอื่นที่ไม่ได้แสดงในบิล</p>' : "") + "</td></tr>";
  const total = open.reduce((a, b) => a + (Number(b.total) || 0), 0);
  try {
    await send(
      u.email,
      open.length ? "ได้รับคำสั่งซื้อ " + res.order_id + " · รอชำระ " + bahtTxt(total) : "คำสั่งซื้อ " + res.order_id + " สำเร็จ · เข้าเรียนได้แล้ว",
      shell(open.length ? "ได้รับคำสั่งซื้อแล้ว" : "สั่งซื้อสำเร็จ", inner, ig)
    );
  } catch (e) {
    console.error("[mail] order send failed", e); // the order itself is saved; the email is best-effort
  }
}

/** Bill decision: approved = receipt + button to the classroom · rejected = reason + button to send new proof. */
export async function sendBillEmail(u: MailUser, b: MailBill, approved: boolean, note: string, site: string, ig: string) {
  if ((await remainingQuota()) < 1) return;
  const items = b.items, acc = b.account || {};
  const meta: [string, string][] = [
    ["เลขบิล", b.id],
    ["วันที่ชำระ", thDateTxt(b.paidAt || new Date())],
    ["ชำระเข้า", acc.method === "bank" ? (acc.bank || "") + " · " + (acc.account_name || "") : "พร้อมเพย์ · " + (acc.account_name || "")],
  ];
  const name = esc(u.nickname || u.firstName);
  const inner = approved
    ? '<tr><td style="padding:0 32px 16px;"><p style="margin:0;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + name + "<br>แอดมินตรวจยอดเงินเรียบร้อย ตอนนี้เข้าเรียนได้เลย</p></td></tr>" +
      '<tr><td style="padding:0 32px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e6e4;border-radius:14px;">' +
      '<tr><td style="padding:14px 16px 2px;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#e7f3ec;color:#1f7a4d;font-size:12px;font-weight:600;">ชำระเงินแล้ว</span></td></tr>' +
      '<tr><td style="padding:8px 16px 4px;">' + mailRows(items) + "</td></tr>" +
      '<tr><td style="padding:6px 16px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:#525252;">ยอดชำระ</td><td align="right" style="font-size:22px;font-weight:700;color:#0c0c0c;">' + bahtTxt(b.total) + "</td></tr></table></td></tr>" +
      '<tr><td style="padding:0 16px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;background:#f5f5f4;border-radius:10px;">' +
      meta.map((r) => '<tr><td style="padding:7px 12px;color:#8a8a8a;width:90px;">' + r[0] + '</td><td style="padding:7px 12px;color:#0c0c0c;">' + esc(r[1]) + "</td></tr>").join("") + "</table></td></tr></table></td></tr>" +
      '<tr><td style="padding:0 32px 26px;">' + mailBtn(site + (items.length === 1 ? "/#/learn/" + encodeURIComponent((items[0] as { course_id?: string }).course_id || "") : "/#/my"), "เข้าห้องเรียน") +
      '<p style="margin:14px 0 0;font-size:12.5px;line-height:1.7;color:#8a8a8a;">บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ดูได้ตลอด ไม่มีวันหมดอายุ · เก็บอีเมลนี้ไว้เป็นหลักฐานการชำระเงิน</p></td></tr>'
    : '<tr><td style="padding:0 32px 16px;"><p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + name + '<br>หลักฐานการโอนของบิล <b style="color:#0c0c0c;">' + esc(b.id) + "</b> ยังไม่ผ่านการตรวจ</p>" +
      (note ? '<p style="margin:0 0 14px;padding:12px 14px;background:#fbe8e6;border-radius:10px;font-size:14px;color:#a3261e;">เหตุผล: ' + esc(note) + "</p>" : "") + mailRows(items) + "</td></tr>" +
      '<tr><td style="padding:0 32px 26px;">' + mailBtn(site + "/#/orders/" + encodeURIComponent(b.orderId), "แก้ไขและส่งหลักฐานใหม่") + '<p style="margin:14px 0 0;font-size:13px;color:#525252;">สงสัยตรงไหน ทัก IG แอดมินได้เลย</p></td></tr>';
  try {
    await send(u.email, approved ? "ชำระเงินสำเร็จ · เข้าเรียนได้แล้ว (" + b.id + ")" : "หลักฐานการโอนยังไม่ผ่าน · บิล " + b.id, shell(approved ? "ชำระเงินสำเร็จ" : "หลักฐานการโอนยังไม่ผ่าน", inner, ig));
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

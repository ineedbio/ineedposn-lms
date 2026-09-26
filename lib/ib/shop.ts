// Shop of the web app — a port of the "ร้านค้า" part of backend/Code.gs onto Neon:
// cart quote (bundles + discount code, split into one bill per receiving account) → order →
// bills the student pays and proves (slip + transfer details) → admin approves → access.
// Approving a bill records a Payment + ACTIVE Enrollment per course, like the rest of the site.
import crypto from "crypto";
import type { Bill, Bundle, PayAccount, Prisma, User } from "@prisma/client";
import { prisma } from "../prisma";
import { sendBillEmail, sendOrderEmail, notifyAdmins, type MailBill } from "./mail";
import { subjectKey } from "./subjects";
import {
  auth, activate, adminEmails, canSubject, chapters, courseBySlug, courseCard, courseInclude, getSetting, ig, isAdminUser, log, rate,
  subjectsOf, type CourseRow, type Ctx, type Data,
} from "./api";
import { activeWhere } from "./staff";
import { APP, checkImageUrl, clip, err, iso, lines, req, sha256, trim, youtubeId } from "./util";

const BILL_OPEN = ["awaiting_payment", "reviewing", "rejected"]; // still in progress: its courses can't go in the cart again
const BILL_LIVE = ["awaiting_payment", "reviewing", "rejected", "approved"]; // counts as a use of its discount code
const PROOF_KEYS = ["paid_at", "amount", "from_bank", "payer_name"] as const;
export const BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงเทพ", "กรุงไทย", "กรุงศรีอยุธยา", "ทหารไทยธนชาต (ttb)", "ออมสิน", "ธ.ก.ส.", "ยูโอบี", "ซีไอเอ็มบี ไทย", "เกียรตินาคินภัทร", "แลนด์ แอนด์ เฮ้าส์", "ทิสโก้", "อาคารสงเคราะห์", "TrueMoney Wallet", "อื่นๆ"];

const csv = (v: unknown) => (Array.isArray(v) ? v : String(v || "").split(",")).map(trim).filter(Boolean);
const money = (v: unknown) => { const n = Math.round(Number(v)); return n >= 0 ? n : 0; };
const baht = (n: number) => n.toLocaleString("en-US");
const shortId = (n: number) => { let s = ""; while (s.length < n) s += crypto.randomBytes(8).readBigUInt64BE().toString(36).toUpperCase(); return s.slice(0, n); };
async function expireHours() { const h = Number(await getSetting("order_expire_hours")); return h > 0 ? Math.min(h, 720) : 48; }

// ───────────────────────── Receiving accounts ─────────────────────────
type AccountLike = Pick<PayAccount, "id" | "label" | "method" | "promptpayId" | "bank" | "accountNo" | "accountName" | "qrUrl" | "note" | "ig" | "subjects">;
/** The main account (used when neither the course nor its subject has one): Settings → PromptPay. */
async function defaultAccount(): Promise<AccountLike> {
  return {
    id: "DEFAULT", label: "บัญชีหลัก", method: "promptpay", promptpayId: String((await getSetting("promptpay_id")) || "").replace(/\D/g, ""),
    bank: "", accountNo: "", accountName: (await getSetting("promptpay_name")) || APP.NAME, qrUrl: "", note: "", ig: "", subjects: "",
  };
}
const activeAccounts = () => prisma.payAccount.findMany({ where: { status: { not: "inactive" } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
function accountFor(c: { payAccountId: string | null; subject: string }, accs: PayAccount[]): AccountLike | null {
  if (c.payAccountId) { const own = accs.find((a) => a.id === c.payAccountId); if (own) return own; }
  return accs.find((a) => csv(a.subjects).includes(c.subject)) || null;
}
/** What the student sees of an account (no internal label). */
async function accountPublic(a: AccountLike) {
  return {
    account_id: a.id, method: a.method === "bank" ? "bank" : "promptpay", promptpay_id: a.promptpayId || "", bank: a.bank || "",
    account_no: a.accountNo || "", account_name: a.accountName || "", qr_url: a.qrUrl || "", note: a.note || "", ig: a.ig || (await ig()),
  };
}

// ───────────────────────── Bills ─────────────────────────
const isExpired = (b: Pick<Bill, "status" | "expiresAt">) => (b.status === "awaiting_payment" || b.status === "rejected") && !!b.expiresAt && b.expiresAt.getTime() < Date.now();
const billStatus = (b: Pick<Bill, "status" | "expiresAt">) => (isExpired(b) ? "expired" : b.status);
type Item = { course_id: string; title: string; subject: string; price: number; discount: number; net: number; bundle: string; bundle_discount: number; coupon_discount: number };
const billItems = (b: Bill) => (Array.isArray(b.items) ? (b.items as unknown as Item[]) : []);

async function expireBills() {
  await prisma.bill.updateMany({ where: { status: { in: ["awaiting_payment", "rejected"] }, expiresAt: { lt: new Date() } }, data: { status: "expired" } });
}

/** course slug → "owned" (may study) | "pending" (older slip request) | "in_bill" (in an unfinished bill). */
async function ownedMap(uid: string) {
  const o: Record<string, string> = {};
  const [enrs, pays, bills] = await Promise.all([
    prisma.enrollment.findMany({ where: { userId: uid, ...activeWhere() }, include: { course: { select: { slug: true } } } }),
    prisma.payment.findMany({ where: { userId: uid, status: "PENDING" }, include: { course: { select: { slug: true } } } }),
    prisma.bill.findMany({ where: { userId: uid, status: { in: BILL_OPEN } } }),
  ]);
  for (const e of enrs) o[e.course.slug] = "owned";
  for (const p of pays) if (!o[p.course.slug]) o[p.course.slug] = "pending";
  for (const b of bills) if (BILL_OPEN.includes(billStatus(b))) for (const it of billItems(b)) if (!o[it.course_id]) o[it.course_id] = "in_bill";
  return o;
}
/** What the user already paid per course they own — bundles only charge the difference. */
async function paidMap(uid: string | undefined) {
  const o: Record<string, number> = {};
  if (!uid) return o;
  const [enrs, pays] = await Promise.all([
    prisma.enrollment.findMany({ where: { userId: uid, ...activeWhere() }, include: { course: { select: { slug: true } } } }),
    prisma.payment.findMany({ where: { userId: uid, status: "APPROVED" }, include: { course: { select: { slug: true } } } }),
  ]);
  for (const e of enrs) o[e.course.slug] = 0;
  for (const p of pays) if (p.course.slug in o) o[p.course.slug] = Math.max(o[p.course.slug], p.amount);
  return o;
}

// ───────────────────────── Discount codes ─────────────────────────
const normCode = (c: unknown) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");
async function couponUses(code: string, uid?: string) {
  const orders = await prisma.shopOrder.findMany({ where: { couponCode: code, ...(uid ? { userId: uid } : {}) }, include: { bills: true } });
  return orders.filter((o) => o.bills.some((b) => BILL_LIVE.includes(billStatus(b)))).length;
}
type CartItem = {
  course_id: string; title: string; subject: string; subject_name: string; cover_url: string; price: number; discount: number;
  bundle_discount: number; coupon_discount: number; bundle: string; net: number; account_id: string; blocked: string; base?: number;
};
/** Discount per course and in total, or a COUPON error explaining why the code can't be used. */
async function applyCoupon(code: string, items: CartItem[], u: User | null) {
  const cp = await prisma.coupon.findUnique({ where: { code } });
  if (!cp || cp.status !== "active") throw err("COUPON", "ไม่พบโค้ด " + code + " หรือโค้ดนี้ปิดใช้งานแล้ว");
  const t = Date.now();
  if (cp.startsAt && cp.startsAt.getTime() > t) throw err("COUPON", "โค้ดนี้ยังไม่เริ่มใช้");
  if (cp.endsAt && cp.endsAt.getTime() < t) throw err("COUPON", "โค้ดนี้หมดอายุแล้ว");
  const targets = csv(cp.targets);
  const elig = items.filter((it) => (cp.scope === "subject" ? targets.includes(it.subject) : cp.scope === "course" ? targets.includes(it.course_id) : true));
  if (!elig.length) throw err("COUPON", "โค้ดนี้ใช้กับคอร์สในตะกร้าไม่ได้");
  const base = elig.reduce((a, it) => a + (it.base || 0), 0);
  if ((cp.minTotal || 0) > 0 && base < (cp.minTotal || 0)) throw err("COUPON", "โค้ดนี้ใช้ได้เมื่อซื้อคอร์สที่ร่วมรายการครบ ฿" + baht(cp.minTotal || 0));
  if ((cp.maxUses || 0) > 0 && (await couponUses(code)) >= (cp.maxUses || 0)) throw err("COUPON", "โค้ดนี้ถูกใช้ครบจำนวนแล้ว");
  if (u && (cp.perUser || 0) > 0 && (await couponUses(code, u.id)) >= (cp.perUser || 0)) throw err("COUPON", "คุณใช้โค้ดนี้ครบจำนวนครั้งแล้ว");
  const v = cp.value || 0;
  let raw = cp.kind === "percent" ? (base * Math.min(v, 100)) / 100 : v;
  if (cp.kind === "percent" && (cp.maxDiscount || 0) > 0) raw = Math.min(raw, cp.maxDiscount || 0);
  const total = Math.min(Math.floor(raw), base);
  // Split across courses by price (whole baht); the remainder goes to the most expensive one.
  const per: Record<string, number> = {};
  let given = 0;
  for (const it of elig) { per[it.course_id] = base ? Math.floor((total * (it.base || 0)) / base) : 0; given += per[it.course_id]; }
  const top = [...elig].sort((a, b) => (b.base || 0) - (a.base || 0))[0];
  per[top.course_id] += total - given;
  const label = cp.kind === "percent" ? "ลด " + v + "%" + ((cp.maxDiscount || 0) > 0 ? " (สูงสุด ฿" + baht(cp.maxDiscount || 0) + ")" : "") : "ลด ฿" + baht(v);
  return { per, total, label };
}

// ───────────────────────── Bundles ─────────────────────────
type CourseLite = { course_id: string; title: string; price: number; status: string; subject: string };
async function courseLites() {
  const cs = await prisma.course.findMany({ include: { subject: true } });
  const m: Record<string, CourseLite & { payAccountId: string | null; coverUrl: string; row: (typeof cs)[number] }> = {};
  for (const c of cs) m[c.slug] = { course_id: c.slug, title: c.title, price: c.price, status: c.isPublished ? "published" : "draft", subject: subjectKey(c.subject), payAccountId: c.payAccountId, coverUrl: c.coverImage || "", row: c };
  return m;
}
const activeBundles = async () => (await prisma.bundle.findMany({ where: { status: { not: "inactive" } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })).filter((b) => csv(b.courseIds).length >= 2);
function bundleOut(b: Bundle, courses: Record<string, CourseLite>) {
  const ids = csv(b.courseIds), cs = ids.map((id) => courses[id]).filter(Boolean);
  return {
    bundle_id: b.id, title: b.title, subtitle: b.subtitle || "", cover_url: b.coverUrl || "", price: money(b.price), status: b.status || "active",
    course_ids: ids, courses: cs.map((c) => ({ course_id: c.course_id, title: c.title, price: money(c.price), status: c.status, subject: c.subject })),
    normal: cs.reduce((a, c) => a + money(c.price), 0), sort_order: b.sortOrder, subject: cs.length ? cs[0].subject : "",
  };
}
export async function publicBundles() {
  const courses = await courseLites();
  return (await activeBundles()).map((b) => bundleOut(b, courses)).filter((b) => b.courses.length === b.course_ids.length && b.courses.every((x) => x.status === "published"));
}

type Cand = { b: Bundle; cart: string[]; owned: string[]; cost: number; save: number };
/** Best set of non-overlapping bundles for the courses in the cart (courses already owned count at what was paid). */
function solveBundles(prices: Record<string, number>, paid: Record<string, number>, bundles: Bundle[]) {
  const cands = bundles
    .map((b): Cand | null => {
      const ids = csv(b.courseIds), cart = ids.filter((id) => id in prices);
      if (!cart.length || !ids.every((id) => id in prices || id in paid)) return null;
      const owned = ids.filter((id) => !(id in prices));
      const cost = Math.max(0, money(b.price) - owned.reduce((a, id) => a + paid[id], 0));
      const normal = cart.reduce((a, id) => a + prices[id], 0);
      return cost < normal ? { b, cart, owned, cost, save: normal - cost } : null;
    })
    .filter((x): x is Cand => !!x)
    .slice(0, 14);
  let best: Cand[] = [], bestSave = 0;
  (function walk(i: number, used: Record<string, 1>, pick: Cand[], save: number) {
    if (save > bestSave) { bestSave = save; best = pick.slice(); }
    for (let j = i; j < cands.length; j++) {
      if (cands[j].cart.some((id) => used[id])) continue;
      const u2 = { ...used }; cands[j].cart.forEach((id) => (u2[id] = 1));
      pick.push(cands[j]); walk(j + 1, u2, pick, save + cands[j].save); pick.pop();
    }
  })(0, {}, [], 0);
  const total = Object.keys(prices).reduce((a, id) => a + prices[id], 0) - bestSave;
  return { best, total };
}
/** Applies the best bundles to the cart items and suggests bundles that are only a course or two away. */
async function applyBundles(ok: CartItem[], u: User | null, courses: Record<string, CourseLite>, own: Record<string, string>) {
  const paid = await paidMap(u?.id), inCart: Record<string, CartItem> = {}, prices: Record<string, number> = {}, bundles = await activeBundles();
  for (const it of ok) { inCart[it.course_id] = it; prices[it.course_id] = it.price; }
  const sol = solveBundles(prices, paid, bundles);
  const applied = sol.best.map((x) => {
    const normal = x.cart.reduce((a, id) => a + inCart[id].price, 0);
    let given = 0;
    for (const id of x.cart) { const it = inCart[id]; it.bundle_discount = Math.floor((x.save * it.price) / normal); given += it.bundle_discount; it.bundle = x.b.title; }
    inCart[x.cart[0]].bundle_discount += x.save - given;
    return { bundle_id: x.b.id, title: x.b.title, save: x.save, cost: x.cost, upgrade: x.owned.length > 0 };
  });
  const seen: Record<string, 1> = {};
  const suggest = bundles
    .map((b) => {
      const ids = csv(b.courseIds);
      if (!ids.some((id) => inCart[id])) return null;
      const missing = ids.filter((id) => !inCart[id] && !(id in paid));
      if (!missing.length || seen[missing.join(",")]) return null;
      const mc = missing.map((id) => (courses[id]?.status === "published" ? courses[id] : undefined));
      if (mc.some((c) => !c || own[c.course_id])) return null;
      const p2 = { ...prices };
      mc.forEach((c) => (p2[c!.course_id] = money(c!.price)));
      const extra = solveBundles(p2, paid, bundles).total - sol.total, full = mc.reduce((a, c) => a + money(c!.price), 0);
      if (extra >= full) return null;
      seen[missing.join(",")] = 1;
      return { bundle_id: b.id, title: b.title, add_ids: missing, add_titles: mc.map((c) => c!.title), extra, save: full - extra };
    })
    .filter(<T,>(x: T | null): x is T => !!x)
    .sort((a, b) => a.extra - b.extra)
    .slice(0, 2);
  return { applied, suggest };
}

// ───────────────────────── Cart & orders ─────────────────────────
/** Prices the cart: bundles, then the discount code, then one bill per receiving account. */
async function priceCart(idsIn: unknown, codeIn: unknown, u: User | null) {
  const ids = (Array.isArray(idsIn) ? idsIn : []).map(String).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 30);
  const courses = await courseLites(), accs = await activeAccounts(), own = u ? await ownedMap(u.id) : {};
  const items: CartItem[] = [], missing: string[] = [];
  const accountOf: Record<string, AccountLike> = {};
  for (const id of ids) {
    const c = courses[id];
    if (!c || c.status !== "published") { missing.push(id); continue; }
    const a = accountFor({ payAccountId: c.payAccountId, subject: c.subject }, accs) || (await defaultAccount());
    accountOf[a.id] = a;
    items.push({
      course_id: c.course_id, title: c.title, subject: c.subject, subject_name: APP.SUBJECTS[c.subject], cover_url: c.coverUrl,
      price: money(c.price), discount: 0, bundle_discount: 0, coupon_discount: 0, bundle: "", net: money(c.price), account_id: a.id, blocked: own[c.course_id] || "",
    });
  }
  const ok = items.filter((it) => !it.blocked);
  const bd = await applyBundles(ok, u, courses, own);
  for (const it of ok) { it.base = it.price - it.bundle_discount; it.discount = it.bundle_discount; it.net = it.base; }
  let coupon: Record<string, unknown> | null = null;
  const code = normCode(codeIn);
  if (code && ok.length) {
    try {
      const r = await applyCoupon(code, ok, u);
      for (const it of ok) { it.coupon_discount = r.per[it.course_id] || 0; it.discount = it.bundle_discount + it.coupon_discount; it.net = it.price - it.discount; }
      coupon = { code, ok: true, label: r.label, discount: r.total };
    } catch (e: any) {
      if (e?.code !== "COUPON") throw e;
      coupon = { code, ok: false, message: e.message };
    }
  }
  const groups: Record<string, { account: Awaited<ReturnType<typeof accountPublic>>; items: CartItem[] }> = {}, order: string[] = [];
  for (const it of ok) {
    if (!groups[it.account_id]) { groups[it.account_id] = { account: await accountPublic(accountOf[it.account_id]), items: [] }; order.push(it.account_id); }
    groups[it.account_id].items.push(it);
  }
  const clean = (it: CartItem) => { const { base, ...rest } = it; return rest; };
  const bills = order.map((k) => {
    const g = groups[k];
    const sub = g.items.reduce((a, it) => a + it.price, 0), dis = g.items.reduce((a, it) => a + it.discount, 0);
    return { account: g.account, items: g.items.map(clean), subtotal: sub, discount: dis, total: sub - dis };
  });
  const subtotal = ok.reduce((a, it) => a + it.price, 0), discount = ok.reduce((a, it) => a + it.discount, 0);
  return {
    items: items.map(clean), missing, bills, subtotal, discount, total: subtotal - discount, coupon,
    bundles: bd.applied, bundle_discount: ok.reduce((a, it) => a + it.bundle_discount, 0), suggest: bd.suggest,
    _accounts: accountOf,
  };
}

export async function cartQuote(d: Data, { p }: Ctx) {
  let u: User | null = null;
  if (p.token) {
    try { u = await auth(p); } catch (e: any) { if (e?.code === "BANNED" || e?.code === "SESSION_REPLACED") throw e; }
  }
  const { _accounts, ...q } = await priceCart(d.course_ids, d.coupon, u);
  return q;
}

export async function orderCreate(d: Data, { p }: Ctx) {
  const u = await auth(p);
  if (d.accept_pay_terms !== true && d.accept_pay_terms !== "true") throw err("BAD_INPUT", "กรุณาติ๊กยอมรับข้อตกลงการชำระเงินก่อน");
  await rate("order:" + u.id, 10, 3600, "สร้างคำสั่งซื้อบ่อยเกินไป ลองใหม่ภายหลัง");
  await expireBills();
  const q = await priceCart(d.course_ids, d.coupon, u);
  if (q.missing.length) throw err("BAD_INPUT", "มีคอร์สที่ปิดขายแล้วในตะกร้า ลบออกแล้วลองใหม่");
  const bad = q.items.find((it) => it.blocked);
  if (bad) throw err("ALREADY", bad.blocked === "owned" ? "คุณมีคอร์ส " + bad.title + " แล้ว ลบออกจากตะกร้าก่อน" : "คอร์ส " + bad.title + " อยู่ในคำสั่งซื้อที่ยังไม่เสร็จ ดูได้ที่หน้าคำสั่งซื้อ");
  if (!q.items.length) throw err("BAD_INPUT", "ตะกร้าว่าง");
  if (q.coupon && !q.coupon.ok) throw err("COUPON", String(q.coupon.message));
  const now = new Date(), exp = new Date(Date.now() + (await expireHours()) * 36e5);
  const oid = "OD" + shortId(8);
  const courses = await courseLites();
  const free: { courseId: string; title: string; billId: string }[] = [];
  await prisma.$transaction(async (tx) => {
    await tx.shopOrder.create({
      data: {
        id: oid, userId: u.id, subtotal: q.subtotal, discount: q.discount, total: q.total, couponCode: q.coupon ? String(q.coupon.code) : null,
        payTermsHash: sha256((await getSetting("pay_terms_text")) || "").slice(0, 12), termsAcceptedAt: now, createdAt: now, expiresAt: exp,
      },
    });
    for (const [i, b] of q.bills.entries()) {
      const billId = oid + "-" + (i + 1);
      const paid = b.total > 0;
      await tx.bill.create({
        data: {
          id: billId, orderId: oid, userId: u.id, accountId: b.account.account_id,
          account: { label: q._accounts[b.account.account_id]?.label || "", pub: b.account } as Prisma.InputJsonValue,
          items: b.items.map((it) => ({ course_id: it.course_id, title: it.title, subject: it.subject, price: it.price, discount: it.discount, net: it.net, bundle: it.bundle, bundle_discount: it.bundle_discount, coupon_discount: it.coupon_discount })),
          subtotal: b.subtotal, discount: b.discount, total: b.total, status: paid ? "awaiting_payment" : "approved",
          note: paid ? "" : "ยอด 0 บาท เปิดสิทธิ์อัตโนมัติ", decidedBy: paid ? null : "SYSTEM", decidedAt: paid ? null : now, createdAt: now, expiresAt: exp,
        },
      });
      if (!paid) for (const it of b.items) free.push({ courseId: courses[it.course_id].row.id, title: it.title, billId });
    }
  });
  // A bill that comes to 0 baht (e.g. a 100% code) opens the courses right away.
  for (const f of free) {
    await prisma.payment.create({
      data: { userId: u.id, courseId: f.courseId, amount: 0, promptpayRef: "BILL-" + f.billId + "-" + shortId(6), status: "APPROVED", note: "บิล " + f.billId + " (0 บาท)", reviewedBy: "SYSTEM", reviewedAt: now, source: "bill", billId: f.billId },
    });
    await activate(u.id, f.courseId);
  }
  try {
    const bills = await prisma.bill.findMany({ where: { orderId: oid }, orderBy: { id: "asc" } });
    await sendOrderEmail(u, { order_id: oid, discount: q.discount, coupon: q.coupon ? String(q.coupon.code) : "" }, bills.map(mailBill), await siteUrl(), await ig());
  } catch (e) {
    console.error(e);
  }
  return { order_id: oid };
}

export const siteUrl = async () => String((await getSetting("site_url")) || "https://ineedbio.shop").replace(/\/+$/, "");
function mailBill(b: Bill): MailBill {
  const pr = (b.proof || {}) as { paid_at?: string };
  return { id: b.id, orderId: b.orderId, status: b.status, total: b.total, items: billItems(b), account: ((b.account || {}) as { pub?: MailBill["account"] }).pub || {}, expiresAt: b.expiresAt, paidAt: pr.paid_at };
}

function billPublic(b: Bill) {
  const acc = (b.account || {}) as { pub?: unknown };
  return {
    bill_id: b.id, order_id: b.orderId, status: billStatus(b), items: billItems(b), subtotal: b.subtotal, discount: b.discount, total: b.total,
    account: acc.pub || {}, proof: b.proof ?? null, has_slip: !!b.slipBlobId, note: b.note, created_at: iso(b.createdAt), expires_at: iso(b.expiresAt),
    submitted_at: iso(b.submittedAt), decided_at: iso(b.decidedAt),
  };
}

export async function myOrders(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const orders = await prisma.shopOrder.findMany({
    where: { userId: u.id, ...(d.order_id ? { id: String(d.order_id) } : {}) },
    include: { bills: { orderBy: { id: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return orders.map((o) => ({
    order_id: o.id, created_at: iso(o.createdAt), subtotal: o.subtotal, discount: o.discount, total: o.total, coupon_code: o.couponCode || "", bills: o.bills.map(billPublic),
  }));
}

/** Transfer-detail fields the admin asks for: required / optional / hidden (Settings → การชำระเงิน). */
async function proofModes() {
  const o: Record<string, string> = {};
  for (const k of PROOF_KEYS) { const v = await getSetting("proof_" + k); o[k] = v === "optional" || v === "hidden" ? v : "required"; }
  return o;
}
export async function proofExtra() {
  return String((await getSetting("proof_extra")) || "")
    .split(/\r?\n/).map(trim).filter(Boolean).slice(0, 6)
    .map((l, i) => { const p = l.split("|"); return { key: "x" + (i + 1), label: clip(p[0], 60), required: /^(required|บังคับ)$/i.test(trim(p[1])) }; });
}

export async function billProof(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const s = d.slip || {};
  if (!/^image\/(jpeg|png|webp)$/.test(s.mime || "")) throw err("BAD_INPUT", "แนบรูปสลิป (JPG หรือ PNG)");
  if (!s.base64 || s.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err("BAD_INPUT", "รูปสลิปใหญ่เกิน 3 MB");
  const modes = await proofModes(), proof: Record<string, unknown> = {};
  const need = (k: string, label: string) => { const v = clip(d[k], 120); if (modes[k] === "required" && !v) throw err("BAD_INPUT", "กรอก" + label); return modes[k] === "hidden" ? "" : v; };
  const paidAt = need("paid_at", "วันและเวลาที่โอน");
  if (paidAt) {
    const pt = new Date(paidAt).getTime();
    if (isNaN(pt)) throw err("BAD_INPUT", "วันเวลาที่โอนไม่ถูกต้อง");
    if (pt > Date.now() + 10 * 60000) throw err("BAD_INPUT", "วันเวลาที่โอนอยู่ในอนาคต ตรวจอีกครั้ง");
    proof.paid_at = new Date(pt).toISOString();
  }
  const amt = need("amount", "ยอดที่โอน");
  if (amt) { const n = Number(String(amt).replace(/[,฿\s]/g, "")); if (!(n > 0)) throw err("BAD_INPUT", "ยอดที่โอนต้องเป็นตัวเลข"); proof.amount = Math.round(n * 100) / 100; }
  proof.from_bank = need("from_bank", "ธนาคารที่โอนออก");
  proof.payer_name = need("payer_name", "ชื่อเจ้าของบัญชีที่โอน");
  proof.payer_relation = clip(d.payer_relation, 60);
  for (const x of await proofExtra()) { const v = clip(d[x.key], 200); if (x.required && !v) throw err("BAD_INPUT", "กรอก" + x.label); if (v) proof[x.label] = v; }
  await rate("slip:" + u.id, 8, 3600, "ส่งสลิปบ่อยเกินไป ลองใหม่ภายหลัง");
  const hash = sha256(String(s.base64));
  const b = await prisma.bill.findFirst({ where: { id: String(d.bill_id || ""), userId: u.id } });
  if (!b) throw err("NOT_FOUND", "ไม่พบบิลนี้");
  if (isExpired(b)) { await prisma.bill.update({ where: { id: b.id }, data: { status: "expired" } }); throw err("EXPIRED", "บิลนี้หมดเวลาชำระแล้ว ใส่คอร์สลงตะกร้าแล้วสั่งซื้อใหม่ได้"); }
  if (b.status === "reviewing") throw err("ALREADY", "ส่งหลักฐานแล้ว กำลังรอแอดมินตรวจ");
  if (b.status !== "awaiting_payment" && b.status !== "rejected") throw err("ALREADY", "บิลนี้ปิดแล้ว");
  if (await prisma.bill.findFirst({ where: { slipHash: hash, id: { not: b.id } } })) throw err("SLIP_USED", "สลิปนี้เคยถูกใช้ส่งแล้ว ถ้าคิดว่าผิดพลาด ทักแอดมินทาง IG");
  const blob = await prisma.fileBlob.create({ data: { mime: s.mime, data: Buffer.from(String(s.base64), "base64"), isPublic: false } });
  const changed = await prisma.bill.updateMany({
    where: { id: b.id, status: { in: ["awaiting_payment", "rejected"] } },
    data: { status: "reviewing", proof: proof as Prisma.InputJsonValue, slipBlobId: blob.id, slipHash: hash, submittedAt: new Date(), note: "" },
  });
  if (!changed.count) throw err("ALREADY", "ส่งหลักฐานแล้ว กำลังรอแอดมินตรวจ");
  const out = (await prisma.bill.findUnique({ where: { id: b.id } }))!;
  const acc = (out.account || {}) as { label?: string };
  await notifyAdmins(
    await adminEmails(),
    "แจ้งโอนใหม่ " + out.id + " · ฿" + baht(out.total),
    [["นักเรียน", `${u.firstName} ${u.lastName} (${u.nickname || ""})`], ["อีเมล", u.email], ["เบอร์", u.phone || ""],
     ["คอร์ส", billItems(out).map((i) => i.title).join(", ")], ["ยอดบิล", "฿" + baht(out.total)],
     ["ยอดที่แจ้ง", proof.amount != null ? "฿" + baht(Number(proof.amount)) : "-"], ["บัญชีรับ", acc.label || ""],
     ["ผู้โอน", (proof.payer_name || "-") + (proof.payer_relation ? " (" + proof.payer_relation + ")" : "")]],
    "เข้าหลังบ้าน → คำสั่งซื้อ เพื่อตรวจยอดและอนุมัติ",
    await ig()
  );
  return billPublic(out);
}

export async function billCancel(d: Data, { p }: Ctx) {
  const u = await auth(p);
  const b = await prisma.bill.findFirst({ where: { id: String(d.bill_id || ""), userId: u.id } });
  if (!b) throw err("NOT_FOUND", "ไม่พบบิลนี้");
  if (b.status !== "awaiting_payment" && b.status !== "rejected") throw err("ALREADY", b.status === "reviewing" ? "ส่งหลักฐานแล้ว ยกเลิกเองไม่ได้ ทักแอดมินทาง IG" : "บิลนี้ปิดแล้ว");
  await prisma.bill.update({ where: { id: b.id }, data: { status: "cancelled", decidedAt: new Date() } });
  return true;
}

/** The open bill (if any) that holds this course, for the course page. */
export async function openBillFor(uid: string, slug: string) {
  const bills = await prisma.bill.findMany({ where: { userId: uid, status: { in: BILL_OPEN } }, orderBy: { createdAt: "desc" } });
  const b = bills.find((x) => BILL_OPEN.includes(billStatus(x)) && billItems(x).some((i) => i.course_id === slug));
  return b ? { bill_id: b.id, order_id: b.orderId, status: billStatus(b) } : null;
}

// ───────────────────────── Bundle page ─────────────────────────
export function instructors(x: CourseRow) {
  return [
    [x.instructorName, x.instructorTitle, x.instructorBio, x.instructorPhoto],
    [x.instructor2Name, x.instructor2Title, x.instructor2Bio, x.instructor2Photo],
  ]
    .filter((k) => k[0])
    .map((k) => ({ name: k[0]!, title: k[1] || "", bio: k[2] || "", photo: k[3] || "" }));
}
export async function bundleDetail(d: Data) {
  const b: any = (await publicBundles()).find((x) => x.bundle_id === d.bundle_id);
  if (!b) throw err("NOT_FOUND", "ไม่พบแพ็กเกจนี้ หรือยังไม่เปิดขาย");
  const seen: Record<string, 1> = {};
  b.items = [];
  for (const id of b.course_ids as string[]) {
    const x = (await courseBySlug(id))!;
    b.items.push({
      ...courseCard(x), instructors: instructors(x), highlights: lines(x.highlights, 12, 200),
      chapters: chapters(x.lessons, () => 1).map((ch) => ({ title: ch.title, count: ch.lessons.length })),
    });
  }
  b.instructors = [];
  for (const c of b.items) for (const t of c.instructors) if (!seen[t.name]) { seen[t.name] = 1; b.instructors.push(t); }
  b.lesson_count = b.items.reduce((a: number, c: any) => a + c.lesson_count, 0);
  b.total_min = b.items.reduce((a: number, c: any) => a + c.total_min, 0);
  return b;
}

// ───────────────────────── Admin: orders ─────────────────────────
function billChecks(b: Bill, u: User) {
  const pr = ((b.proof || {}) as Record<string, any>) || {}, out: { ok: boolean; warn?: boolean; label: string }[] = [], total = b.total;
  if (pr.amount != null && pr.amount !== "") out.push({ ok: Number(pr.amount) === total, label: Number(pr.amount) === total ? "ยอดที่แจ้งตรงกับยอดบิล" : "ยอดที่แจ้ง ฿" + baht(Number(pr.amount)) + " ไม่ตรงกับยอดบิล ฿" + baht(total) });
  if (pr.paid_at) { const okT = new Date(pr.paid_at).getTime() >= b.createdAt.getTime() - 30 * 60000; out.push({ ok: okT, label: okT ? "โอนหลังสร้างคำสั่งซื้อ" : "เวลาโอนก่อนสร้างคำสั่งซื้อ (อาจเป็นสลิปเก่า)" }); }
  if (pr.payer_name) {
    const nm = String(pr.payer_name).replace(/\s+/g, "").toLowerCase(), fn = String(u.firstName || "").replace(/\s+/g, "").toLowerCase();
    const same = !!fn && nm.includes(fn);
    out.push({ ok: same || !!pr.payer_relation, warn: !same, label: same ? "ชื่อผู้โอนตรงกับชื่อที่สมัคร" : pr.payer_relation ? "ผู้โอนไม่ใช่ตัวนักเรียน (" + pr.payer_relation + ")" : "ชื่อผู้โอนไม่ตรงกับชื่อที่สมัคร" });
  }
  return out;
}
/** A bill's items in the viewer's subjects (a teacher only sees and handles those). */
const itemSubject = (it: { subject?: string; course_id: string }, lites: Record<string, { subject: string }>) => it.subject || lites[it.course_id]?.subject || "";
export async function adminBills(d: Data, me: User) {
  const st = String(d.status || "reviewing"), teacher = !isAdminUser(me), mine = subjectsOf(me);
  const lites = await courseLites();
  const mineItem = (it: { subject?: string; course_id: string }) => mine.includes(itemSubject(it, lites));
  const rows = await prisma.bill.findMany({ where: d.account_id ? { accountId: String(d.account_id) } : {}, include: { user: true } });
  const q = String(d.q || "").toLowerCase();
  const key = (b: Bill) => (b.submittedAt || b.createdAt).getTime();
  return rows
    .filter((b) => {
      const s = billStatus(b);
      if (teacher && !billItems(b).some(mineItem)) return false;
      if (q && ![b.id, b.user.email, b.user.firstName, b.user.lastName, b.user.nickname, b.user.phone].join(" ").toLowerCase().includes(q)) return false;
      return st === "closed" ? s === "expired" || s === "cancelled" : st === "all" ? true : s === st;
    })
    .sort((a, b) => (st === "reviewing" ? key(a) - key(b) : key(b) - key(a)))
    .slice(0, 200)
    .map((b) => {
      const o = {
        ...billPublic(b), account_label: ((b.account || {}) as { label?: string }).label || "", user_id: b.userId,
        name: `${b.user.firstName} ${b.user.lastName}`, nickname: b.user.nickname || "", email: b.user.email, phone: b.user.phone || "", has_photo: !!b.user.photoBlobId,
        checks: billChecks(b, b.user), can_decide: !teacher,
      };
      if (teacher) { o.phone = ""; o.email = ""; o.has_photo = false; o.items = o.items.filter(mineItem); }
      return o;
    });
}
export async function adminBillSlip(d: Data, me: User) {
  const b = await prisma.bill.findUnique({ where: { id: String(d.bill_id || "") } });
  if (b && !isAdminUser(me)) {
    const lites = await courseLites();
    if (!billItems(b).some((it) => canSubject(me, itemSubject(it, lites)))) throw err("FORBIDDEN", "บิลนี้ไม่ได้อยู่ในวิชาที่คุณดูแล");
  }
  const blob = b?.slipBlobId ? await prisma.fileBlob.findUnique({ where: { id: b.slipBlobId } }) : null;
  if (!blob) throw err("NOT_FOUND", "ไม่พบสลิป");
  return { mime: blob.mime, base64: Buffer.from(blob.data).toString("base64") };
}
export async function adminBillDecide(d: Data, _c: Ctx, admin: User) {
  const ok = d.decision === "approve", no = d.decision === "reject";
  if (!ok && !no) throw err("BAD_INPUT", "เลือกอนุมัติหรือไม่อนุมัติ");
  const note = clip(d.note, 300);
  if (no && !note) throw err("BAD_INPUT", "ใส่เหตุผลที่ไม่อนุมัติ นักเรียนจะเห็นข้อความนี้");
  const x = await prisma.bill.findUnique({ where: { id: String(d.bill_id || "") }, include: { user: true } });
  if (!x) throw err("NOT_FOUND", "ไม่พบบิลนี้");
  const s = billStatus(x);
  if (no && s !== "reviewing") throw err("ALREADY", "บิลนี้ไม่ได้อยู่ในสถานะรอตรวจ");
  if (ok && !["reviewing", "awaiting_payment", "rejected", "expired"].includes(s)) throw err("ALREADY", "บิลนี้ถูกตัดสินไปแล้ว");
  const changed = await prisma.bill.updateMany({
    where: { id: x.id, status: x.status },
    data: { status: ok ? "approved" : "rejected", note, decidedBy: admin.id, decidedAt: new Date(), ...(no ? { expiresAt: new Date(Date.now() + (await expireHours()) * 36e5) } : {}) },
  });
  if (!changed.count) throw err("ALREADY", "บิลนี้ถูกตัดสินไปแล้ว");
  if (ok) {
    const owned = new Set((await prisma.enrollment.findMany({ where: { userId: x.userId, ...activeWhere() }, include: { course: { select: { slug: true } } } })).map((e) => e.course.slug));
    for (const it of billItems(x)) {
      if (owned.has(it.course_id)) continue;
      const c = await prisma.course.findUnique({ where: { slug: it.course_id } });
      if (!c) continue;
      await prisma.payment.create({
        data: {
          userId: x.userId, courseId: c.id, amount: money(it.net), promptpayRef: "BILL-" + x.id + "-" + shortId(6), slipImageUrl: x.slipBlobId ? "blob:" + x.slipBlobId : null, source: "bill", billId: x.id,
          status: "APPROVED", note: "บิล " + x.id, reviewedBy: admin.id, reviewedAt: new Date(), createdAt: x.createdAt,
        },
      });
      await activate(x.userId, c.id);
    }
  }
  await log(admin, "bill." + (ok ? "approved" : "rejected"), x.id);
  await sendBillEmail(x.user, mailBill(x), ok, note, await siteUrl(), await ig());
  return { bill_id: x.id, status: ok ? "approved" : "rejected" };
}

// ───────────────────────── Admin: receiving accounts ─────────────────────────
export async function adminAccounts() {
  const [accs, bills, courses] = await Promise.all([
    prisma.payAccount.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.bill.findMany({ where: { status: "reviewing" }, select: { accountId: true, status: true, expiresAt: true } }),
    prisma.course.findMany({ where: { payAccountId: { not: null } }, select: { title: true, payAccountId: true } }),
  ]);
  return accs.map((a) => ({
    account_id: a.id, label: a.label, method: a.method, promptpay_id: a.promptpayId, bank: a.bank, account_no: a.accountNo, account_name: a.accountName,
    qr_url: a.qrUrl, note: a.note, ig: a.ig, subjects: csv(a.subjects), status: a.status, sort_order: String(a.sortOrder), created_at: iso(a.createdAt), owner_id: a.ownerId || "",
    courses: courses.filter((c) => c.payAccountId === a.id).map((c) => c.title),
    pending: bills.filter((b) => b.accountId === a.id && billStatus(b) === "reviewing").length,
  }));
}
export async function adminAccountSave(d: Data, _c: Ctx, admin: User) {
  const method = d.method === "bank" ? "bank" : "promptpay";
  const data = {
    label: req(d.label, "ชื่อเรียกบัญชี", 60), method, accountName: clip(d.account_name, 100),
    promptpayId: String(d.promptpay_id || "").replace(/\D/g, ""), bank: clip(d.bank, 60), accountNo: clip(d.account_no, 30),
    qrUrl: clip(d.qr_url, 500), note: clip(d.note, 300), ig: clip(String(d.ig || "").replace(/^@/, ""), 40),
    subjects: csv(d.subjects).filter((s) => APP.SUBJECTS[s]).join(","), status: d.status === "inactive" ? "inactive" : "active", sortOrder: Number(d.sort_order) || 0,
    ownerId: clip(d.owner_id, 30) || null,
  };
  if (data.ownerId && !(await prisma.user.findFirst({ where: { id: data.ownerId, role: { in: ["ADMIN", "INSTRUCTOR"] } } }))) throw err("BAD_INPUT", "เจ้าของบัญชีต้องเป็นผู้สอนหรือแอดมิน");
  // Account name and number are optional when there is a QR image (an uploaded one is /api/ib/file/<id>).
  if (data.qrUrl && !/^https:\/\//.test(data.qrUrl) && !/^\/[^/]/.test(data.qrUrl)) throw err("BAD_INPUT", "ลิงก์รูป QR ต้องขึ้นต้นด้วย https://");
  if (method === "promptpay") {
    if (data.promptpayId && !/^(\d{10}|\d{13}|\d{15})$/.test(data.promptpayId)) throw err("BAD_INPUT", "เลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตร/เลขผู้เสียภาษี 13 หลัก");
    if (!data.promptpayId && !data.qrUrl) throw err("BAD_INPUT", "ใส่เลขพร้อมเพย์ หรืออัปโหลดรูป QR อย่างน้อย 1 อย่าง");
  } else {
    if (data.accountNo && !data.bank) throw err("BAD_INPUT", "เลือกธนาคารของเลขบัญชีนี้");
    if (!data.accountNo && !data.qrUrl) throw err("BAD_INPUT", "ใส่เลขบัญชี หรืออัปโหลดรูป QR อย่างน้อย 1 อย่าง");
  }
  if (d.account_id) {
    const a = await prisma.payAccount.findUnique({ where: { id: String(d.account_id) } });
    if (!a) throw err("NOT_FOUND", "ไม่พบบัญชีนี้");
    await prisma.payAccount.update({ where: { id: a.id }, data });
    await log(admin, "account.edit", a.id);
    return { account_id: a.id };
  }
  const a = await prisma.payAccount.create({ data: { ...data, id: "AC" + shortId(6) } });
  await log(admin, "account.create", a.id + " " + a.label);
  return { account_id: a.id };
}
export async function adminAccountDelete(d: Data, _c: Ctx, admin: User) {
  const id = String(d.account_id || "");
  const a = await prisma.payAccount.findUnique({ where: { id } });
  if (!a) throw err("NOT_FOUND", "ไม่พบบัญชีนี้");
  const open = await prisma.bill.findMany({ where: { accountId: id, status: { in: BILL_OPEN } } });
  if (open.some((b) => BILL_OPEN.includes(billStatus(b)))) throw err("IN_USE", 'ยังมีบิลที่ค้างอยู่กับบัญชีนี้ ตั้งเป็น "ปิดใช้งาน" แทน แล้วลบทีหลัง');
  await prisma.$transaction([prisma.payAccount.delete({ where: { id } }), prisma.course.updateMany({ where: { payAccountId: id }, data: { payAccountId: null } })]);
  await log(admin, "account.delete", id);
  return true;
}

// ───────────────────────── Admin: discount codes ─────────────────────────
export async function adminCoupons() {
  const [coupons, orders] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.shopOrder.findMany({ where: { couponCode: { not: null } }, include: { bills: true } }),
  ]);
  const opt = (n: number | null) => (n ? String(n) : "");
  return coupons.map((c) => {
    let used = 0, paid = 0, disc = 0;
    for (const o of orders.filter((x) => x.couponCode === c.code)) {
      if (o.bills.some((b) => BILL_LIVE.includes(billStatus(b)))) used++;
      for (const b of o.bills) if (billStatus(b) === "approved") { paid += b.total; disc += billItems(b).reduce((a, it) => a + (it.coupon_discount != null ? Number(it.coupon_discount) || 0 : Number(it.discount) || 0), 0); }
    }
    return {
      code: c.code, kind: c.kind, value: String(c.value), max_discount: opt(c.maxDiscount), scope: c.scope, targets: csv(c.targets), min_total: opt(c.minTotal),
      max_uses: opt(c.maxUses), per_user: opt(c.perUser), starts_at: iso(c.startsAt), ends_at: iso(c.endsAt), status: c.status, note: c.note, created_at: iso(c.createdAt),
      used, revenue: paid, discount_given: disc,
    };
  });
}
export async function adminCouponSave(d: Data, _c: Ctx, admin: User) {
  const code = normCode(d.code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw err("BAD_INPUT", "โค้ดใช้ได้เฉพาะ A-Z 0-9 - _ ยาว 3–30 ตัว");
  const kind = d.kind === "fixed" ? "fixed" : "percent", value = Number(d.value);
  if (!(value > 0)) throw err("BAD_INPUT", "ใส่มูลค่าส่วนลด");
  if (kind === "percent" && value > 100) throw err("BAD_INPUT", "ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100");
  const scope = d.scope === "subject" || d.scope === "course" ? d.scope : "all";
  const targets = scope === "all" ? [] : csv(d.targets);
  if (scope !== "all" && !targets.length) throw err("BAD_INPUT", scope === "subject" ? "เลือกวิชาที่ใช้โค้ดได้" : "เลือกคอร์สที่ใช้โค้ดได้");
  const dt = (v: unknown, label: string) => { if (!v) return null; const t = new Date(String(v)).getTime(); if (isNaN(t)) throw err("BAD_INPUT", label + "ไม่ถูกต้อง"); return new Date(t); };
  const pos = (v: unknown) => (Number(v) > 0 ? money(v) : null);
  const data = {
    code, kind, value, maxDiscount: kind === "percent" ? pos(d.max_discount) : null, scope, targets: targets.join(","), minTotal: pos(d.min_total),
    maxUses: pos(d.max_uses), perUser: pos(d.per_user), startsAt: dt(d.starts_at, "วันเริ่ม"), endsAt: dt(d.ends_at, "วันหมดอายุ"),
    status: d.status === "inactive" ? "inactive" : "active", note: clip(d.note, 200),
  };
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) throw err("BAD_INPUT", "วันหมดอายุต้องหลังวันเริ่ม");
  const orig = normCode(d.orig_code);
  const same = await prisma.coupon.findUnique({ where: { code } });
  if (orig) {
    const c = await prisma.coupon.findUnique({ where: { code: orig } });
    if (!c) throw err("NOT_FOUND", "ไม่พบโค้ดนี้");
    if (orig !== code) {
      if (same) throw err("BAD_INPUT", "มีโค้ด " + code + " อยู่แล้ว");
      if (await prisma.shopOrder.findFirst({ where: { couponCode: orig } })) throw err("IN_USE", "โค้ดนี้ถูกใช้ไปแล้ว เปลี่ยนชื่อโค้ดไม่ได้ สร้างโค้ดใหม่แทน");
    }
    await prisma.coupon.update({ where: { code: orig }, data });
    await log(admin, "coupon.edit", code);
  } else {
    if (same) throw err("BAD_INPUT", "มีโค้ด " + code + " อยู่แล้ว");
    await prisma.coupon.create({ data });
    await log(admin, "coupon.create", code);
  }
  return { code };
}
export async function adminCouponDelete(d: Data, _c: Ctx, admin: User) {
  const code = normCode(d.code);
  if (!(await prisma.coupon.findUnique({ where: { code } }))) throw err("NOT_FOUND", "ไม่พบโค้ดนี้");
  if (await prisma.shopOrder.findFirst({ where: { couponCode: code } })) throw err("IN_USE", 'โค้ดนี้ถูกใช้ไปแล้ว ลบไม่ได้ ตั้งเป็น "ปิดใช้งาน" แทน');
  await prisma.coupon.delete({ where: { code } });
  await log(admin, "coupon.delete", code);
  return true;
}

// ───────────────────────── Admin: bundles ─────────────────────────
export async function adminBundles(me?: User) {
  const courses = await courseLites();
  return (await prisma.bundle.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }))
    .map((b) => bundleOut(b, courses))
    .filter((b) => !me || isAdminUser(me) || (b.courses || []).some((c: { subject: string }) => canSubject(me, c.subject)));
}
export async function adminBundleSave(d: Data, _c: Ctx, admin: User) {
  const ids = csv(d.course_ids);
  if (ids.length < 2) throw err("BAD_INPUT", "แพ็กเกจต้องมีอย่างน้อย 2 คอร์ส");
  const courses = await courseLites();
  const miss = ids.filter((id) => !courses[id]);
  if (miss.length) throw err("BAD_INPUT", "ไม่พบคอร์ส " + miss.join(", "));
  const price = Number(d.price);
  if (!(price >= 0)) throw err("BAD_INPUT", "ใส่ราคาแพ็กเกจ");
  const cover = clip(d.cover_url, 500);
  checkImageUrl(cover);
  const data = {
    title: req(d.title, "ชื่อแพ็กเกจ", 120), subtitle: clip(d.subtitle, 200), courseIds: ids.join(","), price: money(price),
    coverUrl: cover, status: d.status === "inactive" ? "inactive" : "active", sortOrder: Number(d.sort_order) || 0,
  };
  if (d.bundle_id) {
    const b = await prisma.bundle.findUnique({ where: { id: String(d.bundle_id) } });
    if (!b) throw err("NOT_FOUND", "ไม่พบแพ็กเกจ");
    await prisma.bundle.update({ where: { id: b.id }, data });
    await log(admin, "bundle.edit", b.id);
    return { bundle_id: b.id };
  }
  const b = await prisma.bundle.create({ data: { ...data, id: "BD" + shortId(6) } });
  await log(admin, "bundle.create", b.id + " " + b.title);
  return { bundle_id: b.id };
}
export async function adminBundleDelete(d: Data, _c: Ctx, admin: User) {
  const b = await prisma.bundle.findUnique({ where: { id: String(d.bundle_id || "") } });
  if (!b) throw err("NOT_FOUND", "ไม่พบแพ็กเกจ");
  await prisma.bundle.delete({ where: { id: b.id } });
  await log(admin, "bundle.delete", b.id);
  return true;
}

// ───────────────────────── Admin: paste many lessons at once ─────────────────────────
/** items = [{ chapter, title, youtube, duration_min, is_preview }], appended after the course's lessons. */
export async function adminLessonsBulk(d: Data, _c: Ctx, admin: User) {
  const items: any[] = Array.isArray(d.items) ? d.items.slice(0, 300) : [];
  if (!items.length) throw err("BAD_INPUT", "ไม่มีรายการตอน");
  const rows = items.map((it, i) => {
    const yt = youtubeId(it.youtube), n = "แถวที่ " + (i + 1) + ": ";
    if (!yt) throw err("BAD_INPUT", n + "ลิงก์ YouTube ไม่ถูกต้อง");
    const title = clip(it.title, 160), chapter = clip(it.chapter, 120);
    if (!title) throw err("BAD_INPUT", n + "ไม่มีชื่อตอน");
    if (!chapter) throw err("BAD_INPUT", n + "ไม่มีชื่อบท (ใส่บรรทัด # ชื่อบท ไว้ก่อน)");
    return { chapter, title, youtubeUrl: "https://youtu.be/" + yt, duration: Math.max(0, Math.round(Number(it.duration_min) || 0)) * 60, isPreview: !!it.is_preview };
  });
  const c = await courseBySlug(d.course_id);
  if (!c) throw err("NOT_FOUND", "ไม่พบคอร์ส");
  const max = (await prisma.lesson.aggregate({ where: { courseId: c.id }, _max: { order: true } }))._max.order || 0;
  await prisma.lesson.createMany({ data: rows.map((r, i) => ({ ...r, type: "VIDEO" as const, order: max + (i + 1) * 10, courseId: c.id })) });
  await log(admin, "lesson.bulk", c.slug + " +" + rows.length);
  return { added: rows.length };
}

export { expireBills };

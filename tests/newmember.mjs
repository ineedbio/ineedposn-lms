// New-member discount tests for /api/ib, ported from reference/tests-newmember.js (11 groups, same names and checks).
// Runs on its own throwaway local database (tests/run.mjs). Code.gs test tricks → here: update_('Users' …) /
// update_('Bills' …) / append_('Enrollments' …) = a row written with the test's Prisma client `db`.
import assert from "node:assert";
import fs from "node:fs";

export async function run({ BASE, OUTBOX, db, makeAdmin }) {
  const outbox = () => fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const call = async (action, data, token, device_id = "dev") =>
    (await fetch(BASE + "api/ib", { method: "POST", body: JSON.stringify({ action, data: data || {}, token, device_id, device_info: "Test" }) })).json();
  const ok = (r) => { if (!r.ok) throw new Error(r.error + ": " + r.message); return r.data; };
  let n = 0;
  const t = async (name, fn) => { await fn(); n++; console.log("✓ newmember:", name); };
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const base = { photo: { mime: "image/png", base64: PNG }, accept_data: true, accept_terms: true, password: "secret123", school: "โรงเรียนตัวอย่าง", grade: "ม.5", phone: "0800000000",
    dream_faculty: "แพทยศาสตร์", dream_university: "มหิดล", birthday: "2009-01-01", line_id: "x" };
  const otpFor = (email) => { const m = outbox().filter((x) => x.to === email && /^\d{6} /.test(x.subject)).pop(); if (!m) throw new Error("no OTP for " + email); return m.subject.slice(0, 6); };
  const reg = async (email, phone) => {
    ok(await call("register.start", { ...base, ...(phone ? { phone } : {}), email, first_name: "ก", last_name: "ข", nickname: "ก" }));
    return ok(await call("register.verify", { email, otp: otpFor(email) }, null, email));
  };

  // setup: an admin, a biology and a chemistry course on sale at ฿2000
  const OLD = await reg("old@x.com");
  // an older account: signed up before the campaign
  await db.user.update({ where: { email: "old@x.com" }, data: { createdAt: new Date("2026-09-01T00:00:00.000Z") } });
  await reg("ad@x.com"); makeAdmin("ad@x.com");
  const adm = ok(await call("login", { email: "ad@x.com", password: "secret123" }, null, "ad@x.com")).token;
  const courses = ok(await call("admin.courses", {}, adm));
  const BIO = courses.find((c) => c.subject === "bio").course_id, CHEM = courses.find((c) => c.subject === "chem").course_id;
  for (const c of courses.filter((x) => x.course_id === BIO || x.course_id === CHEM)) ok(await call("admin.course.save", { ...c, price: 2000, status: "published" }, adm));
  const start = new Date(Date.now() - 864e5).toISOString(), end = new Date(Date.now() + 10 * 864e5).toISOString();

  await t("admin: new_only needs a start date, per_user defaults to 1", async () => {
    assert.equal((await call("admin.coupon.save", { code: "HALLO10", kind: "percent", value: 10, new_only: true }, adm)).error, "BAD_INPUT");
    ok(await call("admin.coupon.save", { code: "HALLO10", kind: "percent", value: 10, new_only: true, starts_at: start, ends_at: end }, adm));
    const c = ok(await call("admin.coupons", {}, adm)).filter((x) => x.code === "HALLO10")[0];
    assert.equal(c.new_only, "1"); assert.equal(c.per_user, "1");
  });
  await t("guest: no discount, sees hint", async () => {
    const q = ok(await call("cart.quote", { course_ids: [BIO] }));
    assert.equal(q.coupon, null); assert.equal(q.promo.label, "10%"); assert.equal(q.total, 2000);
    const q2 = ok(await call("cart.quote", { course_ids: [BIO], coupon: "HALLO10" }));
    assert.equal(q2.coupon.ok, false); assert.match(q2.coupon.message, /สมาชิกใหม่/);
  });
  await t("old account cannot use it, even by typing the code", async () => {
    const q = ok(await call("cart.quote", { course_ids: [BIO] }, OLD.token, "old@x.com"));
    assert.equal(q.coupon, null); assert.equal(q.total, 2000);
    const q2 = ok(await call("cart.quote", { course_ids: [BIO], coupon: "hallo10" }, OLD.token, "old@x.com"));
    assert.equal(q2.coupon.ok, false); assert.match(q2.coupon.message, /สมัครตั้งแต่/);
    assert.equal((await call("order.create", { course_ids: [BIO], coupon: "HALLO10", accept_pay_terms: true }, OLD.token, "old@x.com")).error, "COUPON");
  });
  const NEW = await reg("new@x.com"), NT = NEW.token, nd = "new@x.com";
  await t("new account: auto-applied without a code", async () => {
    const q = ok(await call("cart.quote", { course_ids: [BIO, CHEM] }, NT, nd));
    assert.equal(q.coupon.ok, true); assert.equal(q.coupon.auto, true); assert.equal(q.coupon.code, "HALLO10"); assert.equal(q.total, 3600);
  });
  let oid;
  await t("order applies it server-side even if client sends no code", async () => {
    oid = ok(await call("order.create", { course_ids: [BIO], coupon: "", accept_pay_terms: true }, NT, nd)).order_id;
    const o = await db.shopOrder.findUnique({ where: { id: oid } });
    assert.equal(o.couponCode, "HALLO10"); assert.equal(Number(o.total), 1800);
  });
  await t("another new account with the same phone as a buyer: no discount", async () => {
    const D = await reg("dup@x.com"); // same phone as new@x.com, who just bought
    assert.equal(ok(await call("cart.quote", { course_ids: [CHEM] }, D.token, "dup@x.com")).coupon, null);
    await db.user.update({ where: { email: "dup@x.com" }, data: { phone: "081-234-5678" } });
    assert.equal(ok(await call("cart.quote", { course_ids: [CHEM] }, D.token, "dup@x.com")).coupon.auto, true);
  });
  await t("second order: no longer new", async () => {
    const q = ok(await call("cart.quote", { course_ids: [CHEM] }, NT, nd));
    assert.equal(q.coupon, null); assert.equal(q.total, 2000);
    assert.equal(ok(await call("cart.quote", { course_ids: [CHEM], coupon: "HALLO10" }, NT, nd)).coupon.ok, false);
  });
  await t("expired/cancelled bill gives the right back", async () => {
    await db.bill.updateMany({ where: { orderId: oid }, data: { expiresAt: new Date("2020-01-01T00:00:00.000Z") } });
    const q = ok(await call("cart.quote", { course_ids: [CHEM] }, NT, nd));
    assert.equal(q.coupon.auto, true); assert.equal(q.total, 1800);
  });
  await t("typed code replaces the auto one; legacy-linked students excluded", async () => {
    ok(await call("admin.coupon.save", { code: "ALL50", kind: "fixed", value: 50 }, adm));
    const q = ok(await call("cart.quote", { course_ids: [CHEM], coupon: "ALL50" }, NT, nd));
    assert.equal(q.coupon.code, "ALL50"); assert.equal(q.coupon.auto, false); assert.equal(q.total, 1950);
    const L = await reg("leg@x.com");
    const bio = await db.course.findUnique({ where: { slug: BIO } });
    await db.payment.create({ data: { userId: L.user.user_id, courseId: bio.id, amount: 0, promptpayRef: "LEGACY-TEST-1", status: "APPROVED", source: "legacy", reviewedAt: new Date() } });
    assert.equal(ok(await call("cart.quote", { course_ids: [CHEM] }, L.token, "leg@x.com")).coupon, null);
  });
  await t("banner data: config has the promo, me says who is eligible", async () => {
    const c = ok(await call("config", {})); assert.equal(c.new_member_promo.label, "10%"); assert.equal(c.new_member_promo.all, true);
    assert.equal(ok(await call("me", {}, OLD.token, "old@x.com")).new_member, false);
    const N3 = await reg("n3@x.com", "0899999999"); assert.equal(N3.user.new_member, true);
    assert.equal((await reg("n4@x.com")).user.new_member, false); // same phone as an older student
  });
  await t("inactive or ended campaign: nothing applied", async () => {
    ok(await call("admin.coupon.save", { orig_code: "HALLO10", code: "HALLO10", kind: "percent", value: 10, new_only: true, starts_at: start, ends_at: end, status: "inactive" }, adm));
    const N2 = await reg("n2@x.com");
    const q = ok(await call("cart.quote", { course_ids: [CHEM] }, N2.token, "n2@x.com"));
    assert.equal(q.coupon, null); assert.equal(q.promo, null);
    assert.equal(ok(await call("config", {})).new_member_promo, null); assert.equal(N2.user.new_member, undefined);
  });
  console.log(`\n${n} newmember tests passed`);
}

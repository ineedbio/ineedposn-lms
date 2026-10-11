// Finance tests for /api/ib, ported from reference/tests-finance.js (7 groups, same names and checks): an admin closes
// any time · cutoff · money after the cutoff rolls to the next period · re-cutting afterwards · ปรับปรุงยอด ·
// เบิกล่วงหน้า (request, pay, carry over at closing, cancel / reject / delete, reopen).
// Runs on its own throwaway local database (tests/run.mjs). append_('Enrollments' …) = a Payment row written with `db`;
// run("closePeriod_(…)") = the test server's test.fin.close.
import assert from "node:assert";
import fs from "node:fs";

export async function run({ BASE, OUTBOX, db, makeAdmin }) {
  const outbox = () => fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const call = async (action, data, token, device_id = "dev") =>
    (await fetch(BASE + "api/ib", { method: "POST", body: JSON.stringify({ action, data: data || {}, token, device_id, device_info: "Test" }) })).json();
  const ok = (r) => { if (!r.ok) throw new Error(r.error + ": " + r.message); return r.data; };
  const no = (r, code) => { assert.equal(r.ok, false, "ควรถูกปฏิเสธ"); if (code) assert.equal(r.error, code, r.message); return r; };
  let n = 0;
  const t = async (name, fn) => { await fn(); n++; console.log("✓ finance:", name); };
  const PH = { mime: "image/jpeg", base64: Buffer.from("x").toString("base64") };
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const base = { photo: { mime: "image/png", base64: PNG }, accept_data: true, accept_terms: true, password: "secret123", school: "ร.ร.", grade: "ม.5", phone: "0800000000",
    dream_faculty: "แพทย์", dream_university: "มหิดล", birthday: "2009-01-01", line_id: "x" };
  const otpFor = (email) => { const m = outbox().filter((x) => x.to === email && /^\d{6} /.test(x.subject)).pop(); if (!m) throw new Error("no OTP for " + email); return m.subject.slice(0, 6); };
  const reg = async (email) => {
    ok(await call("register.start", { ...base, email, first_name: "ก" + email[0], last_name: "ข", nickname: email.split("@")[0] }));
    return ok(await call("register.verify", { email, otp: otpFor(email) }, null, email));
  };
  const login = async (e) => ok(await call("login", { email: e, password: "secret123" }, null, e)).token;

  // setup: admin, two math teachers, a student, the math courses of ม.4 เทอม 1–2 and ม.5 เทอม 1
  await reg("ad@x.com"); makeAdmin("ad@x.com");
  const adm = await login("ad@x.com");
  const T1 = await reg("t1@x.com"), T2 = await reg("t2@x.com"), ST = await reg("st@x.com");
  ok(await call("admin.team.add", { user_id: T1.user.user_id, subject: "math" }, adm));
  ok(await call("admin.team.add", { user_id: T2.user.user_id, subject: "math" }, adm));
  const M41 = "math-m4-t1", M42 = "math-m4-t2", M51 = "math-m5-t1";
  const all = ok(await call("admin.courses", {}, adm));
  for (const id of [M41, M42, M51]) { const c = all.find((x) => x.course_id === id); assert(c, id); ok(await call("admin.course.save", { ...c, price: 1000, status: "published" }, adm)); }
  const ago = (m) => new Date(Date.now() - m * 60e3).toISOString();
  const thai = () => new Date(Date.now() + 7 * 36e5).toISOString();
  const P = thai().slice(0, 7) + (Number(thai().slice(8, 10)) <= 15 ? "-1" : "-2");
  const prNext = (pr) => { if (pr.slice(-1) === "1") return pr.slice(0, 8) + "2"; let y = +pr.slice(0, 4), m = +pr.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return y + "-" + ("0" + m).slice(-2) + "-1"; };
  const N1 = prNext(P), N2 = prNext(N1);
  let k = 0;
  const sale = async (slug, amt, when) => {
    const c = await db.course.findUnique({ where: { slug } });
    await db.payment.create({ data: { id: "E" + (++k), userId: ST.user.user_id, courseId: c.id, amount: amt, promptpayRef: "FIN-TEST-" + k, status: "APPROVED", source: "bill", createdAt: new Date(when), reviewedAt: new Date(when) } });
  };
  const today = thai().slice(0, 10), pStart = P.slice(0, 8) + (P.slice(-1) === "1" ? "01" : "16");

  await t("math: each grade/term its own split per teacher", async () => {
    ok(await call("fin.splits.save", { subject: "math", from: pStart, others: [{ label: "ค่าหลังบ้าน", pct: 30 }], courses: {
      [M41]: [{ user_id: T1.user.user_id, pct: 50 }, { user_id: T2.user.user_id, pct: 20 }],
      [M42]: [{ user_id: T1.user.user_id, pct: 70 }],
      [M51]: [{ user_id: T1.user.user_id, pct: 10 }, { user_id: T2.user.user_id, pct: 60 }] } }, adm));
    no(await call("fin.splits.save", { subject: "math", from: today, others: [{ label: "ค่าหลังบ้าน", pct: 30 }], courses: { [M41]: [{ user_id: T1.user.user_id, pct: 50 }] } }, adm), "BAD_INPUT");
    await sale(M41, 1000, ago(60)); await sale(M51, 1000, ago(50));
    const s = ok(await call("fin.summary", { period: P }, adm)), pay = (id) => s.pays.find((x) => x.subject === "math" && x.user_id === id);
    assert.equal(pay(T1.user.user_id).share, 500 + 100); assert.equal(pay(T2.user.user_id).share, 200 + 600);
    assert.equal(s.by_subject.find((x) => x.subject === "math").kept, 600);
  });
  await t("admin closes any time with a cutoff in the past; later sales roll to next period", async () => {
    no(await call("fin.close", { period: P, cutoff: new Date(Date.now() + 36e5).toISOString() }, adm), "BAD_INPUT");
    no(await call("fin.close", { period: N2 }, adm), "BAD_INPUT");
    const t1l = await login("t1@x.com");
    no(await call("fin.close", { period: P }, t1l, "t1@x.com"), "FORBIDDEN");
    await sale(M42, 1000, ago(30)); // after the cutoff (40 minutes ago)
    const c = ok(await call("fin.close", { period: P, cutoff: ago(40) }, adm));
    assert.equal(c.closed, true); assert.equal(c.totals.income, 2000); assert.equal(c.can_recut, true);
    const nx = ok(await call("fin.summary", {}, adm));
    assert.equal(nx.period, N1); assert.equal(nx.income.length, 1); assert.equal(nx.income[0].rolled_from, P); assert.equal(nx.rolled_in, 1);
    await sale(M41, 500, ago(1)); // a new sale today (period P is closed) → next period
    assert.equal(ok(await call("fin.summary", { period: N1 }, adm)).totals.income, 1500);
    assert.equal(ok(await call("fin.summary", { period: P }, adm)).totals.income, 2000); // the closed period does not change
    no(await call("fin.splits.save", { subject: "math", from: pStart, others: [], courses: { [M41]: [{ user_id: T1.user.user_id, pct: 100 }] } }, adm), "LOCKED");
  });
  let paidPo;
  await t("recut after paying: difference goes to next period as adjustment", async () => {
    const s = ok(await call("fin.summary", { period: P }, adm));
    paidPo = s.payouts.find((x) => x.user_id === T1.user.user_id);
    assert.equal(paidPo.amount, 600);
    ok(await call("fin.payout.pay", { payout_id: paidPo.payout_id, slip: PH }, adm));
    // cutoff moved earlier: the M5 sale (50 minutes ago) is no longer in period P
    const r = ok(await call("fin.recut", { period: P, cutoff: ago(55) }, adm));
    assert.equal(r.totals.income, 1000);
    const po1 = r.payouts.find((x) => x.user_id === T1.user.user_id), po2 = r.payouts.find((x) => x.user_id === T2.user.user_id);
    assert.equal(po1.status, "paid"); assert.equal(po1.amount, 600); // transferred: not changed
    assert.equal(po2.status, "pending"); assert.equal(po2.amount, 200); // not transferred yet: the pending amount changes
    const nx = ok(await call("fin.summary", { period: N1 }, adm)), p1 = nx.pays.find((x) => x.subject === "math" && x.user_id === T1.user.user_id);
    assert.equal(nx.income.filter((x) => x.rolled_from === P).length, 3);
    assert.equal(p1.adjust, -100); // paid 100 too much (their part of M5), taken off in the next period
    assert.equal(p1.share, 100 + 700 + 250); assert.equal(p1.settle, 100 + 700 + 250 - 100);
    no(await call("fin.adjust.delete", { adj_id: nx.adjustments[0].adj_id }, adm), "LOCKED");
  });
  await t("manual adjustment in open period; locked after close; recut only latest", async () => {
    no(await call("fin.adjust.save", { period: P, user_id: T2.user.user_id, subject: "math", amount: 100, note: "x" }, adm), "LOCKED");
    no(await call("fin.adjust.save", { period: N1, user_id: T2.user.user_id, subject: "math", amount: 100, note: "" }, adm), "BAD_INPUT");
    let s = ok(await call("fin.adjust.save", { period: N1, user_id: T2.user.user_id, subject: "math", amount: 150, note: "ค่าสอนเสริม ก.ย." }, adm));
    const p2 = s.pays.find((x) => x.subject === "math" && x.user_id === T2.user.user_id); assert.equal(p2.adjust, 150);
    const t2l = await login("t2@x.com");
    const mine = ok(await call("fin.summary", { period: N1 }, t2l, "t2@x.com"));
    assert.equal(mine.adjustments.length, 1); assert.equal(mine.adjustments[0].note, "ค่าสอนเสริม ก.ย.");
    s = ok(await call("fin.adjust.delete", { adj_id: s.adjustments.find((x) => x.source === "manual").adj_id }, adm));
    assert.equal(s.adjustments.length, 1);
    ok(await call("fin.close", { period: N1 }, adm));
    no(await call("fin.recut", { period: P, cutoff: ago(45) }, adm), "LOCKED");
    no(await call("fin.reopen", { period: P }, adm), "LOCKED");
    assert.equal(ok(await call("fin.summary", {}, adm)).period, N2);
  });
  await t("advance: teacher requests from share after expenses; admin pays; net = share − held − advance", async () => {
    const N3 = prNext(N2);
    await sale(M41, 1000, new Date().toISOString()); // T1 50% = 500 · T2 20% = 200
    const t1 = await login("t1@x.com"), t2 = await login("t2@x.com");
    let m = ok(await call("fin.summary", {}, t1, "t1@x.com"));
    assert.equal(m.period, N2); assert.equal(m.adv_open, true);
    assert.equal(m.adv_mine.find((x) => x.subject === "math").available, 500);
    no(await call("fin.advance.request", { subject: "math", amount: 600 }, t1, "t1@x.com"), "BAD_INPUT");
    no(await call("fin.advance.request", { subject: "bio", amount: 100 }, t1, "t1@x.com"), "BAD_INPUT");
    no(await call("fin.advance.request", { subject: "math", amount: 100 }, ST.token, "st@x.com"), "FORBIDDEN");
    m = ok(await call("fin.advance.request", { subject: "math", amount: 300, note: "ค่าเทอมน้อง" }, t1, "t1@x.com"));
    assert.equal(m.adv_pending.length, 1); assert.equal(m.adv_mine.find((x) => x.subject === "math").available, 200);
    no(await call("fin.advance.request", { subject: "math", amount: 250 }, t1, "t1@x.com"), "BAD_INPUT"); // with the request waiting: over
    assert.equal(ok(await call("fin.summary", {}, t2, "t2@x.com")).adv_pending.length, 0); // another teacher doesn't see it
    let a = ok(await call("fin.summary", {}, adm));
    assert.equal(a.adv_pending.length, 1); assert.equal(a.pays.find((x) => x.user_id === T1.user.user_id).adv.pending, 300);
    const before = outbox().length;
    a = ok(await call("fin.advance.pay", { adv_id: a.adv_pending[0].adv_id, slip: PH }, adm));
    assert.equal(outbox().length, before + 1); assert.match(outbox().pop().subject, /เบิกล่วงหน้า/);
    no(await call("fin.advance.pay", { adv_id: a.adv[0].adv_id }, adm), "ALREADY");
    const p1 = a.pays.find((x) => x.user_id === T1.user.user_id && x.subject === "math");
    assert.equal(p1.share, 500); assert.equal(p1.advance, 300); assert.equal(p1.settle, 200); assert.equal(a.totals.advance, 300);
    assert.equal(a.adv.length, 1); assert.equal(a.adv[0].has_slip, true);
    ok(await call("fin.advance.slip", { adv_id: a.adv[0].adv_id }, t1, "t1@x.com"));
    no(await call("fin.advance.slip", { adv_id: a.adv[0].adv_id }, t2, "t2@x.com"), "FORBIDDEN");
    // the admin pays T2 more than their share (200) → at closing the rest is taken off the next period, no transfer back
    a = ok(await call("fin.advance.pay", { user_id: T2.user.user_id, subject: "math", amount: 500, note: "เบิกฉุกเฉิน" }, adm));
    assert.equal(a.pays.find((x) => x.user_id === T2.user.user_id).settle, -300);
    ok(await call("test.fin.close", { period: N2 }, adm)); // closePeriod_ (fin.close can't close more than 1 period ahead)
    const c = ok(await call("fin.summary", { period: N2 }, adm));
    const q2 = c.pays.find((x) => x.user_id === T2.user.user_id), q1 = c.pays.find((x) => x.user_id === T1.user.user_id);
    assert.equal(q2.settle, 0); assert.equal(q2.carry, -300); assert.equal(q1.settle, 200);
    assert.equal(c.payouts.find((x) => x.user_id === T2.user.user_id).status, "paid");
    assert.equal(c.payouts.find((x) => x.user_id === T1.user.user_id).amount, 200);
    no(await call("fin.advance.delete", { adv_id: c.adv.find((x) => x.user_id === T2.user.user_id).adv_id }, adm), "LOCKED");
    const n3 = ok(await call("fin.summary", {}, adm));
    assert.equal(n3.period, N3);
    const aj = n3.adjustments.find((x) => x.user_id === T2.user.user_id);
    assert.equal(aj.amount, -300); assert.equal(aj.source, "advance");
    no(await call("fin.adjust.delete", { adj_id: aj.adj_id }, adm), "LOCKED");
    assert.equal(n3.pays.find((x) => x.user_id === T2.user.user_id).settle, -300);
    no(await call("fin.advance.request", { subject: "math", amount: 1 }, t2, "t2@x.com"), "BAD_INPUT"); // still minus: nothing to ask for
  });
  await t("advance: cancel / reject / delete mistaken entry", async () => {
    await sale(M42, 1000, new Date().toISOString()); // T1 70% = 700
    const t1 = await login("t1@x.com");
    let m = ok(await call("fin.advance.request", { subject: "math", amount: 100 }, t1, "t1@x.com"));
    m = ok(await call("fin.advance.cancel", { adv_id: m.adv_pending[0].adv_id }, t1, "t1@x.com"));
    assert.equal(m.adv_pending.length, 0);
    m = ok(await call("fin.advance.request", { subject: "math", amount: 700 }, t1, "t1@x.com"));
    const id = m.adv_pending[0].adv_id;
    no(await call("fin.advance.reject", { adv_id: id }, t1, "t1@x.com"), "FORBIDDEN");
    ok(await call("fin.advance.reject", { adv_id: id, reply: "รอปิดยอดก่อนนะ" }, adm));
    no(await call("fin.advance.cancel", { adv_id: id }, t1, "t1@x.com"), "ALREADY");
    let a = ok(await call("fin.advance.pay", { user_id: T1.user.user_id, subject: "math", amount: 50 }, adm));
    assert.equal(a.pays.find((x) => x.user_id === T1.user.user_id).advance, 50);
    a = ok(await call("fin.advance.delete", { adv_id: a.adv.find((x) => x.amount === 50).adv_id }, adm));
    assert.ok(!a.pays.find((x) => x.user_id === T1.user.user_id).advance);
  });
  await t("reopen removes advance carry; close again recreates it once", async () => {
    const N3 = prNext(N2);
    ok(await call("fin.reopen", { period: N2 }, adm));
    assert.equal(ok(await call("fin.summary", { period: N3 }, adm)).adjustments.filter((x) => x.source === "advance").length, 0);
    ok(await call("test.fin.close", { period: N2 }, adm));
    assert.equal(ok(await call("fin.summary", { period: N3 }, adm)).adjustments.filter((x) => x.source === "advance").length, 1);
  });
  console.log(`\n${n} finance tests passed`);
}

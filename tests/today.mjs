// หลังบ้าน › ภาพรวมวันนี้ (admin.today, round 7v): who may read it, the Thai day cut, who counts as a member /
// enrolled / paid, slips waiting, rejected orders, and the cells ranking. Runs on its own throwaway local database
// (tests/run.mjs); rows are put in with the test's Prisma client `db`. Read only: admin.today writes nothing.
import assert from "node:assert";
import fs from "node:fs";

export async function run({ BASE, OUTBOX, db, makeAdmin }) {
  const outbox = () => fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const call = async (action, data, token, device_id = "dev") =>
    (await fetch(BASE + "api/ib", { method: "POST", body: JSON.stringify({ action, data: data || {}, token, device_id, device_info: "Test" }) })).json();
  const ok = (r) => { if (!r.ok) throw new Error(r.error + ": " + r.message); return r.data; };
  const no = (r, code) => { assert.equal(r.ok, false, "ควรถูกปฏิเสธ"); if (code) assert.equal(r.error, code, r.message); return r; };
  let n = 0;
  const t = async (name, fn) => { await fn(); n++; console.log("✓ today:", name); };
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const base = { photo: { mime: "image/png", base64: PNG }, accept_data: true, accept_terms: true, password: "secret123", school: "ร.ร.ทดสอบ", grade: "ม.6", dream_faculty: "แพทย์", dream_university: "มหิดล", birthday: "2008-01-01", line_id: "x" };
  const otpFor = (email) => { const m = outbox().filter((x) => x.to === email && /^\d{6} /.test(x.subject)).pop(); if (!m) throw new Error("no OTP for " + email); return m.subject.slice(0, 6); };
  let ph = 10;
  const reg = async (email, extra) => {
    ok(await call("register.start", { ...base, phone: "08100000" + ph++, email, first_name: "ชื่อ" + email[0], last_name: "สกุล", nickname: email.split("@")[0], ...(extra || {}) }));
    const r = ok(await call("register.verify", { email, otp: otpFor(email) }, null, email));
    return { ...r, id: r.user.user_id };
  };
  const D = "2026-03-10", at = (hm, day = D) => new Date(`${day}T${hm}:00+07:00`);
  const setJoined = (id, when) => db.user.update({ where: { id }, data: { createdAt: when } });

  const AD = await reg("ad@x.com"); makeAdmin("ad@x.com");
  const adm = ok(await call("login", { email: "ad@x.com", password: "secret123" }, null, "ad@x.com")).token;
  const TE = await reg("te@x.com");
  await db.user.update({ where: { id: TE.id }, data: { roles: "teacher", role: "INSTRUCTOR", subjects: "chem" } });
  const course = (await db.course.findMany({ orderBy: { createdAt: "asc" }, include: { subject: true } }))[0];
  let pr = 0;
  const pay = (userId, amount, status, createdAt, extra) => db.payment.create({ data: { userId, courseId: course.id, amount, status, promptpayRef: "TODAY-" + pr++, createdAt, ...(extra || {}) } });
  const enrol = (userId) => db.enrollment.create({ data: { userId, courseId: course.id, status: "ACTIVE", enrolledAt: new Date() } });

  // late = signed up 23:30 Thai time on D (16:30 UTC) · early = 00:10 on D+1 (17:10 UTC on D)
  const LATE = await reg("late@x.com", { heard_from: "tiktok" }); await setJoined(LATE.id, at("23:30"));
  const EARLY = await reg("early@x.com"); await setJoined(EARLY.id, at("00:10", "2026-03-11"));
  const BUY = await reg("buy@x.com"); await setJoined(BUY.id, at("09:00")); await pay(BUY.id, 790, "APPROVED", at("10:00"), { source: "bill", reviewedAt: at("15:00", "2026-03-12") }); await enrol(BUY.id);
  const WAIT = await reg("wait@x.com"); await setJoined(WAIT.id, at("08:00", "2026-03-01")); await pay(WAIT.id, 790, "PENDING", at("11:00"), { source: "request" });
  const REJ = await reg("rej@x.com"); await setJoined(REJ.id, at("07:00", "2026-03-01")); await pay(REJ.id, 790, "REJECTED", at("12:00"), { source: "request" });
  const OLD = await reg("old@x.com"); await setJoined(OLD.id, at("08:00", "2026-01-01")); await pay(OLD.id, 0, "APPROVED", at("13:00"), { source: "legacy" }); await enrol(OLD.id);
  // the admin and the teacher have courses and cells too: never counted
  await pay(AD.user.user_id, 0, "APPROVED", at("14:00"), { source: "test" }); await enrol(AD.user.user_id);
  await setJoined(AD.user.user_id, at("10:00")); await setJoined(TE.id, at("10:00"));
  await trialLeadFor(WAIT.id);
  async function trialLeadFor(userId) { await db.trialLead.create({ data: { id: "TLT" + userId.slice(-6), userId, courseId: course.id, goals: "A-Level", help: "ตะลุยโจทย์เยอะๆ" } }); }
  // cells: buy earned 30 and spent 25 on a code (balance 5) · wait earned 20 · old earned 20 with more study days · the admin 999
  const led = (userId, delta, reason) => db.cellLedger.create({ data: { userId, delta, reason } });
  await led(BUY.id, 30, "study"); await led(BUY.id, -25, "redeem");
  await led(WAIT.id, 20, "study"); await led(OLD.id, 15, "study"); await led(OLD.id, 5, "review");
  await led(AD.user.user_id, 999, "study"); await led(TE.id, 500, "study");
  for (const day of ["2026-03-01", "2026-03-02", "2026-03-03"]) await db.studyDay.create({ data: { userId: OLD.id, day, minutes: 20, credited: true } });
  await db.studyDay.create({ data: { userId: WAIT.id, day: "2026-03-01", minutes: 20, credited: true } });
  await db.streak.create({ data: { userId: OLD.id, streak: 3, best: 7, lastDay: "2000-01-01" } });

  await t("students and teachers get FORBIDDEN · bad date rejected", async () => {
    no(await call("admin.today", {}, BUY.token, "buy@x.com"), "FORBIDDEN");
    no(await call("admin.today", {}, TE.token, "te@x.com"), "FORBIDDEN");
    no(await call("admin.today", {}), "AUTH");
    no(await call("admin.today", { date: "10/03/2026" }, adm), "BAD_INPUT");
    assert.match(ok(await call("admin.today", {}, adm)).date, /^\d{4}-\d{2}-\d{2}$/);
  });
  let R;
  await t("a 23:30 Thai-time sign-up counts on that day, 00:10 on the next", async () => {
    R = ok(await call("admin.today", { date: D }, adm));
    const names = R.day.signups.list.map((x) => x.nickname);
    assert.deepEqual(names.sort(), ["buy", "late"]);
    assert.equal(R.day.signups.list.find((x) => x.nickname === "late").heard_from, "TikTok");
    const next = ok(await call("admin.today", { date: "2026-03-11" }, adm));
    assert.deepEqual(next.day.signups.list.map((x) => x.nickname), ["early"]);
  });
  await t("admins and teachers are not members", async () => {
    assert.equal(R.totals.members, 6); // late early buy wait rej old
    assert.ok(!R.no_course_list.some((x) => x.nickname === "ad" || x.nickname === "te"));
    assert.ok(!R.day.enroll_list.some((x) => x.nickname === "ad"));
  });
  await t("only a slip waiting → still no course, with has_pending · trial files listed", async () => {
    const w = R.no_course_list.find((x) => x.nickname === "wait");
    assert.ok(w); assert.equal(w.has_pending, true); assert.deepEqual(w.trial_courses, [course.title]);
    assert.equal(w.days >= 0, true);
    assert.equal(R.no_course_list.find((x) => x.nickname === "late").has_pending, false);
    assert.equal(R.totals.pending, 1);
    // newest first
    const order = R.no_course_list.map((x) => x.nickname);
    assert.deepEqual(order, ["early", "late", "wait", "rej"]);
  });
  await t("rejected orders are not counted", async () => {
    assert.ok(!R.day.enroll_list.some((x) => x.nickname === "rej"));
    const c = R.day.enrolls.find((x) => x.course_id === course.slug);
    assert.equal(c.approved, 2); assert.equal(c.approved_amount, 790); // buy ฿790 + old ฿0 (the admin's is not a member's)
    assert.equal(c.pending, 1); assert.equal(c.pending_amount, 790);
    assert.equal(R.day.enroll_list.find((x) => x.nickname === "buy").new_today, true);
    assert.equal(R.day.enroll_list.find((x) => x.nickname === "wait").new_today, false);
    // by order date, not approval date (buy was approved on the 12th)
    assert.equal(ok(await call("admin.today", { date: "2026-03-12" }, adm)).day.enroll_list.length, 0);
  });
  await t("a legacy student's free access is enrolled, not paid", async () => {
    assert.equal(R.totals.enrolled, 2); assert.equal(R.totals.paid, 1); assert.equal(R.totals.no_course, 4);
    assert.ok(!R.no_course_list.some((x) => x.nickname === "old"));
  });
  await t("cells ranking by cells earned in total (redeemed codes don't drop you) · ties → more study days first", async () => {
    const top = R.cells_top.map((x) => [x.rank, x.nickname, x.total, x.balance, x.study_days]);
    assert.deepEqual(top, [[1, "buy", 30, 5, 0], [2, "old", 20, 20, 3], [3, "wait", 20, 20, 1]]);
    const o = R.cells_top[1]; assert.equal(o.best, 7); assert.equal(o.streak, 0); assert.equal(o.has_photo, true);
  });
  console.log(`\n${n} today tests passed`);
}

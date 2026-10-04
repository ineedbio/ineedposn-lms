// Role tests for /api/ib, ported from reference/tests-roles.js ("finance:", "teacher profiles:", "team:", "playlist preview:"),
// with the setup they depend on (teacher roles, courses with prices). Run through tests/run.mjs, which gives
// them a fresh local database and dev server — never a shared one.
import assert from "node:assert";
import fs from "node:fs";

export async function run({ BASE, OUTBOX, makeAdmin, sql, yt }) {
  const outbox = () => fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const call = async (action, data, token, device_id = "dev") =>
    (await fetch(BASE + "api/ib", { method: "POST", body: JSON.stringify({ action, data: data || {}, token, device_id, device_info: "Test" }) })).json();
  const ok = (r) => { if (!r.ok) throw new Error(r.error + ": " + r.message); return r.data; };
  const no = (r, code) => { assert.equal(r.ok, false, "ควรถูกปฏิเสธ"); if (code) assert.equal(r.error, code, r.message); return r; };
  let n = 0;
  const t = async (name, fn) => { await fn(); n++; console.log("✓", name); };
  const PH = { mime: "image/jpeg", base64: Buffer.from("x").toString("base64") };
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const base = { photo: { mime: "image/png", base64: PNG }, accept_data: true, accept_terms: true, password: "secret123", school: "โรงเรียนตัวอย่าง", grade: "ม.5", phone: "0800000000",
    dream_faculty: "แพทยศาสตร์", dream_university: "มหิดล", birthday: "2009-01-01", line_id: "x" };
  const otpFor = (email) => { const m = outbox().filter((x) => x.to === email && /^\d{6} /.test(x.subject)).pop(); if (!m) throw new Error("no OTP for " + email); return m.subject.slice(0, 6); };
  const reg = async (email, first, last, nick, dev) => {
    ok(await call("register.start", { ...base, email, first_name: first, last_name: last, nickname: nick || first }));
    return ok(await call("register.verify", { email, otp: otpFor(email) }, null, dev || email));
  };
  const login = async (e, d) => ok(await call("login", { email: e, password: "secret123" }, null, d || e)).token;
  const C = call;

  // ── setup: admin, courses with prices, teachers ──
  const A = await reg("admin@x.com", "แอด", "มิน", "แอดมิน");
  makeAdmin("admin@x.com");
  const adm = await login("admin@x.com");
  const adminId = A.user.user_id;
  let courses = ok(await call("admin.courses", {}, adm));
  const bySubj = (k) => courses.filter((c) => c.subject === k);
  for (let i = bySubj("math").length; i < 3; i++) ok(await call("admin.course.save", { subject: "math", title: "คณิต ทดสอบ " + (i + 1), new_id: "math-test-" + (i + 1), price: 490, status: "published" }, adm));
  courses = ok(await call("admin.courses", {}, adm));
  const BIO = bySubj("bio")[0].course_id, CHEM = bySubj("chem")[0].course_id, PHYS = bySubj("phys")[0].course_id;
  const [MATH1, MATH2] = bySubj("math").map((c) => c.course_id);
  for (const c of courses) ok(await call("admin.course.save", { ...c, price: c.subject === "math" ? 490 : 1000, status: "published" }, adm));

  const chemT = await reg("chem@x.com", "ครู", "เคมี", "พี่เคมี"), physT = await reg("phys@x.com", "ครู", "ฟิสิกส์", "พี่ฟิสิกส์");
  const mathA = await reg("ma@x.com", "ครู", "คณิตเอ", "พี่เอ"), mathB = await reg("mb@x.com", "ครู", "คณิตบี", "พี่บี");
  let chem, phys;
  await t("setup: admin sets teacher roles", async () => {
    no(await call("admin.user.update", { user_id: chemT.user.user_id, role: "teacher", subjects: [] }, adm), "BAD_INPUT");
    ok(await call("admin.user.update", { user_id: chemT.user.user_id, role: "teacher", subjects: ["chem"] }, adm));
    ok(await call("admin.user.update", { user_id: physT.user.user_id, role: "teacher", subjects: "phys" }, adm));
    ok(await call("admin.user.update", { user_id: mathA.user.user_id, role: "teacher", subjects: ["math"] }, adm));
    ok(await call("admin.user.update", { user_id: mathB.user.user_id, role: "teacher", subjects: ["math"] }, adm));
    no(await call("admin.courses", {}, chemT.token, "chem@x.com"), "AUTH"); // role changed → sign in again
    chem = await login("chem@x.com"); phys = await login("phys@x.com");
    assert.deepEqual(ok(await call("me", {}, chem, "chem@x.com")).subjects, ["chem"]);
    // becoming a teacher sends the invite to fill in the profile
    assert(outbox().some((m) => m.to === "chem@x.com" && /tprofile/.test(m.html)));
  });
  const s1 = await reg("s1@x.com", "สมชาย", "เรียนดี");

  // ── การเงิน ──
  const thai = (h = 0) => new Date(Date.now() + (7 + h) * 36e5).toISOString();
  const P = thai().slice(0, 7) + (Number(thai().slice(8, 10)) <= 15 ? "-1" : "-2");
  const today = thai().slice(0, 10);
  await t("finance: half-month periods, no platform fee, subject splits with date, held money", async () => {
    ok(await call("admin.account.save", { label: "บัญชีครูฟิสิกส์", method: "promptpay", promptpay_id: "0811111111", account_name: "ครู", subjects: "phys", owner_id: physT.user.user_id }, adm));
    no(await call("admin.account.save", { label: "x", method: "promptpay", promptpay_id: "0811111111", account_name: "x", owner_id: s1.user.user_id }, adm), "BAD_INPUT");
    no(await call("fin.rules.save", { splits: [{ course_id: MATH2, split: [{ user_id: mathA.user.user_id, pct: 60 }, { user_id: mathB.user.user_id, pct: 30 }] }] }, adm), "BAD_INPUT");
    ok(await call("fin.rules.save", { splits: [{ course_id: MATH1, split: [{ user_id: mathA.user.user_id, pct: 100 }] }, { course_id: MATH2, split: [{ user_id: mathA.user.user_id, pct: 60 }, { user_id: mathB.user.user_id, pct: 40 }] }] }, adm));
    const buy = async (email, ids) => { const u = await reg(email, "ผู้ซื้อ" + email[0], "นามสกุล" + email[0]); ok(await call("order.create", { course_ids: ids, accept_pay_terms: true }, u.token, email)); return ok(await call("my.orders", {}, u.token, email))[0].bills; };
    const bs = [].concat(await buy("p1@x.com", [PHYS]), await buy("c1@x.com", [CHEM]), await buy("m1@x.com", [MATH1]), await buy("m6@x.com", [MATH2]));
    for (const b of bs) ok(await call("admin.bill.decide", { bill_id: b.bill_id, decision: "approve" }, adm));
    no(await C("fin.expense.save", { date: today, subject: "bio", amount: 50 }, chem, "chem@x.com"), "FORBIDDEN");
    const ex = ok(await C("fin.expense.save", { date: today, subject: "chem", category: "โฆษณา", amount: 200, note: "ยิงแอด" }, chem, "chem@x.com"));
    ok(await call("fin.expense.save", { date: today, subject: "", category: "ซอฟต์แวร์/โดเมน", amount: 100 }, adm));
    let s = ok(await call("fin.summary", { period: P }, adm));
    assert.equal(s.period, P); assert(/^(1–15|16–\d\d) /.test(s.label));
    assert.equal(s.by_subject.find((x) => x.subject === "chem").expense, 0);
    no(await call("fin.close", { period: P }, adm), "BAD_INPUT"); // an expense still waits for approval
    ok(await call("fin.expense.decide", { expense_id: ex.expense_id, decision: "approve" }, adm));
    s = ok(await call("fin.summary", { period: P }, adm));
    const byS = (k) => s.by_subject.find((x) => x.subject === k), pay = (k, id) => s.pays.find((x) => x.subject === k && x.user_id === id);
    assert.equal(byS("chem").pool, 800); assert.equal(byS("chem").platform, 0); // no platform fee, the subject's expense is deducted
    assert.equal(pay("chem", chemT.user.user_id).settle, 800);
    assert.equal(pay("phys", physT.user.user_id).held, 1000); assert.equal(pay("phys", physT.user.user_id).settle, 0);
    assert.equal(pay("math", mathA.user.user_id).share, 490 + 294); assert.equal(pay("math", mathB.user.user_id).share, 196);
    assert.equal(s.totals.income, 2980); assert.equal(s.totals.shared, 100);
    // the owner sets the chemistry split from today: teacher 70, owner 30
    no(await call("fin.splits.save", { subject: "chem", from: today, parts: [{ user_id: chemT.user.user_id, pct: 70 }] }, adm), "BAD_INPUT");
    no(await C("fin.splits.save", { subject: "chem", from: today, parts: [] }, chem, "chem@x.com"), "FORBIDDEN");
    ok(await call("fin.splits.save", { subject: "chem", from: today, parts: [{ user_id: chemT.user.user_id, pct: 70 }, { user_id: adminId, pct: 30 }] }, adm));
    // a split starting tomorrow does not change today's sales
    const tmr = thai(24).slice(0, 10);
    ok(await call("fin.splits.save", { subject: "chem", from: tmr, parts: [{ user_id: chemT.user.user_id, pct: 100 }] }, adm));
    s = ok(await call("fin.summary", { period: P }, adm));
    assert.equal(pay("chem", chemT.user.user_id).share, 560); assert.equal(pay("chem", adminId).share, 240);
    // a teacher sees only their own
    const cs = ok(await C("fin.summary", { period: P }, chem, "chem@x.com"));
    assert(cs.income.every((x) => x.subject === "chem")); assert.equal(cs.pays.length, 1); assert.equal(cs.totals.income, 1000);
    assert.equal(cs.profiles[chemT.user.user_id].name, "พี่เคมี");
    // close → one transfer per subject × person
    const closed = ok(await call("fin.close", { period: P }, adm));
    assert.equal(closed.closed, true); assert.equal(closed.payouts.length, 5);
    // closed: an expense entered afterwards (dated in the closed period) rolls to the next period by itself, not locked
    const late = ok(await call("fin.expense.save", { date: today, subject: "chem", amount: 10, note: "ลงหลังปิดยอด" }, adm));
    assert(!ok(await call("fin.summary", { period: P }, adm)).expenses.some((x) => x.expense_id === late.expense_id));
    const nx = ok(await call("fin.summary", {}, adm)); assert.notEqual(nx.period, P); assert.equal(nx.expenses.find((x) => x.expense_id === late.expense_id).rolled_from, P);
    ok(await call("fin.expense.delete", { expense_id: late.expense_id }, adm));
    const po = closed.payouts.find((x) => x.user_id === chemT.user.user_id);
    assert.equal(po.subject, "chem"); assert.equal(po.amount, 560);
    no(await call("fin.payout.pay", { payout_id: po.payout_id }, adm), "BAD_INPUT");
    const before = outbox().length;
    ok(await call("fin.payout.pay", { payout_id: po.payout_id, slip: PH, note: "KBank 1234" }, adm));
    const mails = outbox(), mail = mails[mails.length - 1];
    assert.equal(mails.length, before + 1); assert.equal(mail.to, "chem@x.com"); assert.equal(mail.attachments.length, 1); assert(/560/.test(mail.subject));
    no(await call("fin.payout.pay", { payout_id: po.payout_id, slip: PH }, adm), "ALREADY");
    no(await call("fin.reopen", { period: P }, adm), "LOCKED");
    const mine = ok(await C("fin.summary", { period: P }, chem, "chem@x.com"));
    assert.equal(mine.payouts.length, 1); assert.equal(mine.payouts[0].has_slip, true);
    ok(await C("fin.payout.slip", { payout_id: po.payout_id }, chem, "chem@x.com"));
    no(await C("fin.payout.slip", { payout_id: po.payout_id }, phys, "phys@x.com"), "FORBIDDEN");
    assert.equal(ok(await C("fin.payouts.mine", {}, chem, "chem@x.com"))[0].has_slip, true);
  });

  await t("teacher profiles: auto from role, edit, used on course pages", async () => {
    let pr = ok(await C("teacher.profile", {}, chem, "chem@x.com"));
    assert.equal(pr.display_name, "พี่เคมี"); assert.equal(pr.auto, true);
    no(await C("teacher.profile.save", { display_name: "พี่เคมี", photo_url: "javascript:x" }, chem, "chem@x.com"), "BAD_INPUT");
    pr = ok(await C("teacher.profile.save", { display_name: "พี่หมีลี่", title: "สหเวช จุฬาฯ", bio: ["A-Level เคมี 87.5", "", "TBAT 730"], photo_url: "https://x/meely.jpg", bank_name: "กสิกรไทย", account_name: "วรานนท์", account_no: "012-3-45678-9" }, chem, "chem@x.com"));
    assert.deepEqual(pr.bio, ["A-Level เคมี 87.5", "TBAT 730"]);
    // a teacher cannot open someone else's profile (always gets their own)
    const other = ok(await C("teacher.profile", { user_id: physT.user.user_id }, chem, "chem@x.com"));
    assert.equal(other.user_id, chemT.user.user_id);
    const list = ok(await call("admin.teachers", {}, adm));
    assert(list.find((x) => x.user_id === chemT.user.user_id).has_bank);
    no(await C("admin.teachers", {}, chem, "chem@x.com"), "FORBIDDEN");
    // link the course to the profile → course page and card use its name and photo
    const c = ok(await call("admin.courses", {}, adm)).find((x) => x.course_id === CHEM);
    ok(await call("admin.course.save", Object.assign({}, c, { teacher_ids: [chemT.user.user_id, "nope"] }), adm));
    const d = ok(await call("course.detail", { course_id: CHEM }));
    assert.equal(d.instructors.length, 1); assert.equal(d.instructors[0].name, "พี่หมีลี่"); assert.equal(d.instructors[0].photo, "https://x/meely.jpg"); assert(/TBAT/.test(d.instructors[0].bio));
    assert.equal(ok(await call("courses.list", {})).find((x) => x.course_id === CHEM).teachers[0].photo, "https://x/meely.jpg");
    // a teacher cannot change who teaches the course
    ok(await C("admin.course.save", Object.assign({}, c, { teacher_ids: [] }), chem, "chem@x.com"));
    assert.equal(ok(await call("course.detail", { course_id: CHEM })).instructors[0].name, "พี่หมีลี่");
  });

  await t("team: multi-role, per-course ticks, other parts (not teachers), invite email with status", async () => {
    const NX = thai(17 * 24).slice(0, 10), nxPeriod = NX.slice(0, 7) + (Number(NX.slice(8, 10)) <= 15 ? "-1" : "-2");
    const nt = await reg("newt@x.com", "ครู", "ใหม่", "พี่ใหม่");
    const before = outbox().length;
    no(await call("admin.team.add", { email: "nobody@x.com", subject: "phys", from: NX }, adm), "NOT_FOUND");
    const r = ok(await call("admin.team.add", { email: "newt@x.com", subject: "phys", from: NX }, adm));
    assert.equal(r.invite.ok, true); assert.equal(outbox().length, before + 1);
    const mail = outbox().pop();
    assert(/tprofile/.test(mail.html)); assert(/ยังขาด/.test(mail.html)); assert(/ฟิสิกส์/.test(mail.subject));
    no(await call("admin.team.add", { email: "newt@x.com", subject: "phys", from: NX }, adm), "ALREADY");
    no(await C("admin.team.add", { email: "newt@x.com", subject: "chem", from: NX }, chem, "chem@x.com"), "FORBIDDEN");
    // sign in again, then the profile must be filled in
    const nts = await login("newt@x.com");
    assert.deepEqual(ok(await call("me", {}, nts, "newt@x.com")).profile_todo, ["name", "photo", "bank"]);
    // preview (not sent) · send again · a failed send is reported and recorded
    const n0 = outbox().length;
    const pv = ok(await call("admin.teacher.invite", { user_id: nt.user.user_id, preview: true }, adm));
    assert(/กรอกโปรไฟล์ผู้สอน/.test(pv.html)); assert.equal(pv.to, "newt@x.com"); assert.equal(outbox().length, n0);
    assert.equal(ok(await call("admin.teacher.invite", { user_id: nt.user.user_id }, adm)).ok, true); assert.equal(outbox().length, n0 + 1);
    const day = new Date().toISOString().slice(0, 10); // the mail counter is per UTC day
    sql(`INSERT INTO "RateLimitHit" (key, count, "expiresAt") VALUES ('mail:${day}', 1000000, now() + interval '2 days') ON CONFLICT (key) DO UPDATE SET count = 1000000`);
    const bad = ok(await call("admin.teacher.invite", { user_id: nt.user.user_id }, adm));
    assert.equal(bad.ok, false); assert(bad.error);
    assert(ok(await call("admin.teachers", {}, adm)).find((x) => x.user_id === nt.user.user_id).invite_error);
    sql(`UPDATE "RateLimitHit" SET count = 0 WHERE key = 'mail:${day}'`);
    ok(await call("admin.teacher.invite", { user_id: nt.user.user_id }, adm));
    const tl = ok(await call("admin.teachers", {}, adm)).find((x) => x.user_id === nt.user.user_id);
    assert.equal(tl.invite_error, ""); assert(tl.invited_at); assert.deepEqual(tl.profile_todo, ["name", "photo", "bank"]); assert.equal(tl.email, "newt@x.com");
    ok(await call("teacher.profile.save", { display_name: "พี่ใหม่", photo_url: "https://x/a.jpg", bank_name: "กสิกร", account_name: "ครู ใหม่", account_no: "1234567890" }, nts, "newt@x.com"));
    assert.deepEqual(ok(await call("me", {}, nts, "newt@x.com")).profile_todo, []);
    // several roles at once: admin + biology teacher
    const both = await reg("both@x.com", "ทั้ง", "สอง", "พี่สอง");
    const ru = ok(await call("admin.user.update", { user_id: both.user.user_id, roles: ["admin", "teacher"], subjects: ["bio"] }, adm));
    assert.equal(ru.invite.ok, true);
    let bs = await login("both@x.com"), me = ok(await call("me", {}, bs, "both@x.com"));
    assert.deepEqual(me.roles, ["admin", "teacher"]); assert.equal(me.role, "admin"); assert.deepEqual(me.subjects, ["bio"]);
    assert.deepEqual(me.profile_todo, ["name", "photo", "bank"]); // an admin who teaches fills in the profile too
    ok(await call("admin.users", { q: "" }, bs, "both@x.com"));
    assert(ok(await call("admin.teachers", {}, adm)).find((x) => x.user_id === both.user.user_id).subjects.includes("bio"));
    ok(await call("admin.user.update", { user_id: both.user.user_id, roles: ["admin"] }, adm));
    bs = await login("both@x.com"); me = ok(await call("me", {}, bs, "both@x.com"));
    assert.deepEqual(me.roles, ["admin"]); assert.deepEqual(me.subjects, []); assert.deepEqual(me.profile_todo, []);
    ok(await call("admin.user.update", { user_id: both.user.user_id, roles: [] }, adm));
    assert.equal(ok(await call("login", { email: "both@x.com", password: "secret123" }, null, "both2")).user.role, "student");
    // ticked per course: teachers 70%, the other 30% is ค่าหลังบ้าน (not a teacher, no role needed)
    const MC = bySubj("math").map((c) => c.course_id), A_ = mathA.user.user_id, B_ = mathB.user.user_id;
    no(await call("fin.splits.save", { subject: "math", from: NX, others: [{ label: "ค่าหลังบ้าน", pct: 30 }], courses: { [MC[0]]: [{ user_id: A_, pct: 80 }] } }, adm), "BAD_INPUT");
    no(await call("fin.splits.save", { subject: "math", from: NX, others: [{ label: "", pct: 30 }], courses: {} }, adm), "BAD_INPUT");
    no(await call("fin.splits.save", { subject: "math", from: NX, others: [], courses: { [MC[0]]: [{ user_id: s1.user.user_id, pct: 100 }] } }, adm), "BAD_INPUT");
    no(await call("fin.splits.save", { subject: "math", from: NX, others: [{ label: "ก", pct: 10 }, { label: "ก", pct: 10 }], courses: {} }, adm), "BAD_INPUT");
    no(await call("fin.splits.save", { subject: "math", from: NX, others: [{ label: "ก", pct: 100 }], courses: {} }, adm), "BAD_INPUT");
    const sv = ok(await call("fin.splits.save", { subject: "math", from: NX, others: [{ label: "ค่าหลังบ้าน", pct: 30 }], courses: { [MC[0]]: [{ user_id: A_, pct: 70 }], [MC[1]]: [{ user_id: A_, pct: 35 }, { user_id: B_, pct: 35 }] } }, adm));
    assert(sv.courses.length >= MC.length);
    // real money on that day: ฿1000 of the first course, ฿1000 of an unticked course
    const sale = (id, cid) => sql(`INSERT INTO "Payment" (id, "userId", "courseId", amount, "promptpayRef", status, source, "createdAt", "reviewedAt")
      SELECT '${id}', '${nt.user.user_id}', c.id, 1000, '${id}', 'APPROVED', 'bill', '${NX}T12:00:00+07:00', '${NX}T12:00:00+07:00' FROM "Course" c WHERE c.slug = '${cid}'`);
    sale("EMX1", MC[0]); sale("EMX2", MC[2]);
    let f = ok(await call("fin.summary", { period: nxPeriod }, adm));
    let bm = f.by_subject.find((x) => x.subject === "math");
    assert.equal(bm.unassigned, 1000); // not ticked = nobody to share with yet
    assert.equal(bm.pool_all, 1000); assert.equal(bm.kept, 300); assert.equal(bm.pool, 700);
    assert.deepEqual(f.pays.filter((x) => x.subject === "math").map((x) => [x.user_id, x.share]), [[A_, 700]]);
    // add พี่บี to the first course → its teachers split the 70% equally, ค่าหลังบ้าน stays
    ok(await call("admin.team.add", { user_id: B_, subject: "math", from: NX, course_ids: [MC[0]] }, adm));
    let v = ok(await call("fin.splits", {}, adm)).splits.math.find((x) => x.from === NX);
    assert.deepEqual(v.courses[MC[0]].map((x) => x.pct), [35, 35]); assert.equal(v.others[0].pct, 30);
    f = ok(await call("fin.summary", { period: nxPeriod }, adm));
    bm = f.by_subject.find((x) => x.subject === "math");
    assert.equal(bm.pool_all, 1000); assert.equal(bm.kept, 300); assert.equal(bm.pool, 700); assert.equal(bm.others[0].label, "ค่าหลังบ้าน");
    const pm = f.pays.filter((x) => x.subject === "math");
    assert.deepEqual(pm.map((x) => x.share).sort(), [350, 350]); assert(!pm.some((x) => /^o:/.test(x.user_id)));
    assert.deepEqual(pm[0].courses, [bySubj("math")[0].title]);
    assert.equal(f.totals.kept, 300);
    // remove พี่เอ → their part of each course goes to that course's other teachers
    ok(await call("admin.team.remove", { user_id: A_, subject: "math", from: NX }, adm));
    v = ok(await call("fin.splits", {}, adm)).splits.math.find((x) => x.from === NX);
    assert.deepEqual(v.courses[MC[0]], [{ user_id: B_, pct: 70 }]); assert.deepEqual(v.courses[MC[1]], [{ user_id: B_, pct: 70 }]);
    sql(`DELETE FROM "Payment" WHERE id IN ('EMX1', 'EMX2')`);
    // a date in a closed period is refused
    no(await call("admin.team.add", { email: "t3@x.com", subject: "phys", from: today }, adm), "LOCKED");
    // course colour and price requests
    const c = ok(await call("admin.courses", {}, adm)).find((x) => x.course_id === CHEM);
    no(await C("admin.course.save", Object.assign({}, c, { accent: "red" }), chem, "chem@x.com"), "BAD_INPUT");
    ok(await C("admin.course.save", Object.assign({}, c, { accent: "#E91E63", req_price: 590, req_status: c.status }), chem, "chem@x.com"));
    let c2 = ok(await call("admin.courses", {}, adm)).find((x) => x.course_id === CHEM);
    assert.equal(c2.accent, "#e91e63"); assert.equal(String(c2.price), String(c.price)); assert.equal(JSON.parse(c2.pending_change).price, "590");
    assert.equal(ok(await call("courses.list", {})).find((x) => x.course_id === CHEM).accent, "#e91e63");
    no(await C("admin.course.request", { course_id: CHEM, decision: "approve" }, chem, "chem@x.com"), "FORBIDDEN");
    ok(await call("admin.course.request", { course_id: CHEM, decision: "approve" }, adm));
    c2 = ok(await call("admin.courses", {}, adm)).find((x) => x.course_id === CHEM);
    assert.equal(String(c2.price), "590"); assert.equal(c2.pending_change, "");
  });

  await t("playlist preview: pull titles + durations, follow the course naming pattern", async () => {
    const MC = ok(await call("admin.course.save", { subject: "math", title: "คณิต ม.5 เทอม 1 (ทดสอบเพลย์ลิสต์)", new_id: "math-m5-t1-pl", price: 490, status: "draft" }, adm)).course_id;
    const PL2 = "PL30fRiKuDivTESTTEST02";
    ok(await call("admin.lesson.save", { course_id: MC, chapter: "บทที่ 1", title: "EP.1 ลำดับ", youtube: "bbbbbbbbbb1", duration_min: 30 }, adm));
    ok(await call("admin.lesson.save", { course_id: MC, chapter: "บทที่ 1", title: "EP.2 อนุกรม", youtube: "bbbbbbbbbb2", duration_min: 30 }, adm));
    yt.titles[PL2] = "คณิต ม.5 เทอม 1";
    yt.playlists[PL2] = [{ id: "bbbbbbbbbb2", title: "คณิต ม.5 | ตอนที่ 2 อนุกรม | INeedBio", dur: 30 }, { id: "bbbbbbbbbb3", title: "คณิต ม.5 | ตอนที่ 3 ลิมิต | INeedBio", dur: 42 },
      { id: "bbbbbbbbbb4", title: "คณิต ม.5 | สรุปท้ายบท | INeedBio", dur: 18 }, { id: "bbbbbbbbbb5", title: "Private video", dur: 1, priv: "private" }];
    no(await call("staff.playlist.preview", { course_id: MC, url: "https://youtu.be/x" }, adm), "BAD_INPUT");
    const r = ok(await call("staff.playlist.preview", { course_id: MC, url: "https://www.youtube.com/playlist?list=" + PL2 }, adm));
    assert.equal(r.style.format, "EP.N ");
    assert.deepEqual(r.items.map((x) => [x.title, x.duration_min, x.exists]), [["EP.2 อนุกรม", 30, true], ["EP.3 ลิมิต", 42, false], ["EP.4 สรุปท้ายบท", 18, false]]);
    // nothing saved yet → add with bulk, linked to the playlist
    ok(await call("admin.lessons.bulk", { course_id: MC, items: r.items.filter((x) => !x.exists).map((x) => ({ chapter: "บทที่ 2", title: x.title, youtube: "https://youtu.be/" + x.youtube_id, duration_min: x.duration_min, source_playlist: PL2 })) }, adm));
    const ls = ok(await call("admin.lessons", { course_id: MC }, adm));
    const L3 = ls.find((l) => l.youtube_id === "bbbbbbbbbb3");
    assert.equal(L3.title, "EP.3 ลิมิต"); assert.equal(L3.from_playlist, true);
    // automatic sync: a new clip gets the same style, numbering goes on
    ok(await call("staff.playlists.save", { course_id: MC, playlists: [{ url: PL2, chapter: "บทที่ 2" }] }, adm));
    yt.playlists[PL2].push({ id: "bbbbbbbbbb6", title: "คณิต ม.5 | ตอนที่ 5 อนุพันธ์ | INeedBio", dur: 50 });
    const s2 = ok(await call("staff.course.sync", { course_id: MC }, adm));
    assert.deepEqual(s2.titles, ["EP.5 อนุพันธ์"]);
  });

  console.log(`\n${n} tests passed`);
}

// Cells tests for /api/ib, ported from reference/tests-cells.js (14 groups, same names and checks).
// Runs after tests/roles.mjs on the same throwaway local database (tests/run.mjs): reuses its admin and courses.
// Code.gs test tricks → here: cache_().remove('cp:…') = clear Streak.pingAt · DAY_SHIFT_MS = the test-only
// setting test_day_shift_ms (read only when the server runs with IB_TEST_HOOKS=1) · ledgerAdd_ = a CellLedger row.
import assert from "node:assert";
import fs from "node:fs";

export async function run({ BASE, OUTBOX, db }) {
  const outbox = () => fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const call = async (action, data, token, device_id = "dev") =>
    (await fetch(BASE + "api/ib", { method: "POST", body: JSON.stringify({ action, data: data || {}, token, device_id, device_info: "Test" }) })).json();
  const ok = (r) => { if (!r.ok) throw new Error(r.error + ": " + r.message); return r.data; };
  const no = (r, code) => { assert.equal(r.ok, false, "ควรถูกปฏิเสธ"); if (code) assert.equal(r.error, code, r.message); return r; };
  let n = 0;
  const t = async (name, fn) => { await fn(); n++; console.log("✓ cells:", name); };
  const PH = { mime: "image/jpeg", base64: Buffer.from("x").toString("base64") };
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const base = { photo: { mime: "image/png", base64: PNG }, accept_data: true, accept_terms: true, password: "secret123", school: "โรงเรียนตัวอย่าง", grade: "ม.5", phone: "0800000000",
    dream_faculty: "แพทยศาสตร์", dream_university: "มหิดล", birthday: "2009-01-01", line_id: "x" };
  const otpFor = (email) => { const m = outbox().filter((x) => x.to === email && /^\d{6} /.test(x.subject)).pop(); if (!m) throw new Error("no OTP for " + email); return m.subject.slice(0, 6); };
  const reg = async (email, first, last) => {
    ok(await call("register.start", { ...base, email, first_name: first, last_name: last, nickname: first }));
    return ok(await call("register.verify", { email, otp: otpFor(email) }, null, email));
  };
  const exec = (q, ...v) => db.$executeRawUnsafe(q, ...v);
  const setShift = (ms) => exec(`INSERT INTO "Setting" (key, value, "updatedAt") VALUES ('test_day_shift_ms', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = now()`, String(Math.round(ms)));
  const shift = (d) => setShift(d * 864e5);
  const resetGap = (uid) => exec(`UPDATE "Streak" SET "pingAt" = NULL WHERE "userId" = $1`, uid);
  const ledgerAdd = (uid, delta) => exec(`INSERT INTO "CellLedger" (id, "userId", delta, reason) VALUES ($1, $2, $3, 'test')`, "T" + Math.random().toString(36).slice(2), uid, delta);

  // setup: the admin and courses from tests/roles.mjs, a video lesson in BIO and CHEM, cells on
  const adm = ok(await call("login", { email: "admin@x.com", password: "secret123" }, null, "admin@x.com")).token;
  const courses = ok(await call("admin.courses", {}, adm));
  const BIO = courses.find((c) => c.subject === "bio").course_id, CHEM = courses.find((c) => c.subject === "chem").course_id;
  for (const c of courses.filter((x) => x.course_id === BIO || x.course_id === CHEM)) ok(await call("admin.course.save", { ...c, status: "published" }, adm));
  ok(await call("admin.settings.save", { cells_enabled: "1" }, adm));
  const L1 = ok(await call("admin.lesson.save", { course_id: BIO, chapter: "บท 1", title: "ตอน 1", youtube: "abcdefghijk", duration_min: 30 }, adm)).lesson_id;
  const L2 = ok(await call("admin.lesson.save", { course_id: CHEM, chapter: "บท 1", title: "ตอน 1", youtube: "abcdefghijk", duration_min: 30 }, adm)).lesson_id;
  const S1 = await reg("cs1@x.com", "เซลล์", "หนึ่ง"), tok = S1.token, uid = S1.user.user_id, dev = "cs1@x.com";
  const C = (a, d) => call(a, d, tok, dev);
  let POS = 0;
  const study = async (mins) => { let r; for (let i = 0; i < mins; i++) { await resetGap(uid); POS += 60; r = ok(await C("study.ping", { lesson_id: L1, pos: POS })); } return r; };
  await setShift(0);

  try {
    await t("ping needs enrollment", async () => {
      no(await C("study.ping", { lesson_id: L1 }), "NO_ACCESS");
      ok(await call("admin.grant", { course_id: BIO, emails: "cs1@x.com" }, adm));
      no(await C("study.ping", { lesson_id: L2 }), "NO_ACCESS");
    });
    await t("rate limit: pings closer than 50s are ignored", async () => {
      POS = 60; const a = ok(await C("study.ping", { lesson_id: L1, pos: POS })); assert.equal(a.today_min, 1);
      assert.equal(ok(await C("study.ping", { lesson_id: L1, pos: POS + 60 })).ignored, true);
    });
    await t("video must advance: paused / looping / seeking back does not count", async () => {
      await resetGap(uid); assert.equal(ok(await C("study.ping", { lesson_id: L1, pos: POS + 10 })).reason, "not_advancing");
      await resetGap(uid); assert.equal(ok(await C("study.ping", { lesson_id: L1, pos: 5 })).reason, "not_advancing");
      await resetGap(uid); POS = 5 + 120; assert.equal(ok(await C("study.ping", { lesson_id: L1, pos: POS })).today_min, 2); // 2x speed ok
    });
    await t("15 minutes = 1 day, +1 cell, streak 1", async () => {
      const r = await study(13); assert.equal(r.today_min, 15); assert.equal(r.credited.streak, 1);
      const s = ok(await C("cells.status", {})); assert.equal(s.streak, 1); assert.equal(s.points, 1); assert.equal(s.today_done, true);
      assert.equal((await study(3)).credited, null); assert.equal(ok(await C("cells.status", {})).points, 1); // the same day counts once
    });
    await t("consecutive days + bonus at 7 + freeze card", async () => {
      for (let d = 1; d <= 6; d++) { await shift(d); await study(15); }
      const s = ok(await C("cells.status", {})); assert.equal(s.streak, 7); assert.equal(s.points, 7 + 5); assert.equal(s.freezes, 1);
    });
    await t("miss 1 day uses freeze, miss more resets streak but keeps cells and best", async () => {
      await shift(8); const r = await study(15); assert.equal(r.credited.streak, 8); assert.equal(r.credited.used_freezes, 1);
      await shift(12); let s = ok(await C("cells.status", {})); assert.equal(s.streak, 0); assert.equal(s.best, 8);
      await study(15); s = ok(await C("cells.status", {})); assert.equal(s.streak, 1); assert.equal(s.points, 12 + 1 + 1);
    });
    await t("themes unlock by best streak and persist", async () => {
      no(await C("cells.theme", { theme: "petri" }), "BAD_INPUT");
      for (let d = 13; d <= 26; d++) { await shift(d); await study(15); }
      const s = ok(await C("cells.status", {})); assert.equal(s.streak, 15); assert.ok(s.themes.indexOf("petri") >= 0);
      ok(await C("cells.theme", { theme: "petri" })); assert.equal(ok(await C("cells.status", {})).theme, "petri");
    });
    await t("redeem needs 100 cells, once per 30 days, code is personal", async () => {
      no(await C("cells.redeem", {}), "BAD_INPUT");
      await ledgerAdd(uid, 100);
      const r = ok(await C("cells.redeem", {})); assert.match(r.code, /^CELL/);
      const s = ok(await C("cells.status", {})); assert.equal(s.codes.length, 1); assert.equal(s.can_redeem, false);
      await ledgerAdd(uid, 100);
      no(await C("cells.redeem", {}), "BAD_INPUT");
      const S2 = await reg("cs2@x.com", "อีก", "คน");
      const mine = ok(await C("cart.quote", { course_ids: [CHEM], coupon: r.code })); assert.equal(mine.coupon.ok, true); assert.equal(mine.discount, 100);
      const other = ok(await call("cart.quote", { course_ids: [CHEM], coupon: r.code }, S2.token, "cs2@x.com")); assert.equal(other.coupon.ok, false); assert.match(other.coupon.message, /ส่วนตัว/);
      const anon = ok(await call("cart.quote", { course_ids: [CHEM], coupon: r.code })); assert.equal(anon.coupon.ok, false); assert.match(anon.coupon.message, /เข้าสู่ระบบ/);
    });
    await t("review + grades: pending until admin approves, cells once", async () => {
      no(await C("review.submit", { course_id: CHEM, rating: 5, text: "x".repeat(30) }), "NO_ACCESS");
      no(await C("review.submit", { course_id: BIO, rating: 5, text: "สั้นไป" }), "BAD_INPUT");
      assert.equal(ok(await C("review.submit", { course_id: BIO, rating: 5, text: "สอนเข้าใจง่ายมาก ชีทสรุปดี ดูซ้ำได้เรื่อย ๆ" })).cells, 5);
      const g = ok(await C("grades.submit", { year: "2569", term: "1", grades: [{ subject: "ชีววิทยา", grade: "4" }, { subject: "เคมี", grade: "3.5" }], gpa: "3.80", proof: PH, consent_publish: true }));
      assert.equal(g.cells, 10);
      const before = ok(await C("cells.status", {})).points;
      const f = ok(await call("admin.feedback", {}, adm)); assert.equal(f.reviews.length, 1); assert.equal(f.grades.length, 1); assert.equal(f.grades[0].has_proof, true);
      assert.equal(ok(await call("admin.grades.proof", { id: f.grades[0].id }, adm)).mime, "image/jpeg");
      assert.equal(ok(await call("course.detail", { course_id: BIO })).reviews.length, 0);
      ok(await call("admin.feedback.decide", { kind: "reviews", id: f.reviews[0].id, decision: "approve" }, adm));
      ok(await call("admin.feedback.decide", { kind: "grades", id: f.grades[0].id, decision: "approve" }, adm));
      no(await call("admin.feedback.decide", { kind: "grades", id: f.grades[0].id, decision: "approve" }, adm), "ALREADY");
      assert.equal(ok(await C("cells.status", {})).points, before + 15);
      assert.equal(ok(await call("course.detail", { course_id: BIO })).reviews.length, 1);
      no(await C("review.submit", { course_id: BIO, rating: 4, text: "x".repeat(30) }), "ALREADY");
      assert.deepEqual(ok(await C("my.submissions", {})).reviews, [BIO]);
      assert.equal(ok(await call("admin.feedback", { status: "done" }, adm)).reviews.length, 1);
    });
    await t("trial feedback: no login needed, once per lesson, stats after 5", async () => {
      no(await call("trial.feedback", { course_id: BIO, lesson: "ตอน 1", level: "x" }, null, "anon1"), "BAD_INPUT");
      ok(await call("trial.feedback", { course_id: BIO, lesson: "ตอน 1", level: "clear", text: "เข้าใจง่ายดี" }, null, "anon1"));
      assert.equal(ok(await call("trial.feedback", { course_id: BIO, lesson: "ตอน 1", level: "lost" }, null, "anon1")).repeat, true);
      assert.equal(ok(await call("course.detail", { course_id: BIO })).trial, null);
      for (const d of ["a2", "a3", "a4"]) ok(await call("trial.feedback", { course_id: BIO, lesson: "ตอน 1", level: "clear" }, null, d));
      ok(await call("trial.feedback", { course_id: BIO, lesson: "ตอน 1", level: "partly" }, null, "a5"));
      const tr = ok(await call("course.detail", { course_id: BIO })).trial; assert.equal(tr.n, 5); assert.equal(tr.clear_pct, 80);
      assert.equal(ok(await C("learn.get", { course_id: BIO })).reviewed, true);
      const fa = ok(await call("admin.feedback", {}, adm)).trial; assert.equal(fa.summary[0].n, 5); assert.equal(fa.comments.length, 1);
    });
    await t("admin sees ledger; students cannot", async () => {
      no(await C("admin.cells", {}), "FORBIDDEN");
      const a = ok(await call("admin.cells", {}, adm)); assert(a.rows.some((r) => r.user_id === uid && r.points > 0));
      assert(ok(await call("admin.cells", { user_id: uid }, adm)).ledger.length > 0);
    });
    await t("free preview counts as study time (logged in only), other lessons still need enrollment", async () => {
      const LP = ok(await call("admin.lesson.save", { course_id: CHEM, chapter: "บท 1", title: "ตอนตัวอย่าง", youtube: "abcdefghijk", duration_min: 20, is_preview: true }, adm)).lesson_id;
      const S2 = await reg("pv@x.com", "ตัวอย่าง", "ฟรี"), C2 = (a, d) => call(a, d, S2.token, "pv@x.com");
      no(await call("study.ping", { lesson_id: LP, preview: 1, pos: 60 }), "AUTH");
      no(await C2("study.ping", { lesson_id: L2, preview: 1, pos: 60 }), "NO_ACCESS"); // not a preview episode
      no(await C2("study.ping", { lesson_id: LP, pos: 60 }), "NO_ACCESS"); // didn't say it is the preview
      assert.equal(ok(await C2("study.ping", { lesson_id: LP, preview: 1, pos: 60 })).today_min, 1);
      globalThis.__LP = LP;
    });
    await t("halloween 2569: no skin event by default (owner removed it)", async () => {
      const S0 = await reg("hw0@x.com", "ไม่มี", "สกิน"), st = ok(await call("cells.status", {}, S0.token, "hw0@x.com"));
      assert.equal(st.events.length, 0); assert(st.themes.indexOf("spooky") < 0);
    });
    await t("event mechanism still works: 10 study days in window = limited skin, kept after the event", async () => {
      // like CELLS.EVENTS.push(…) in the reference test: the test-only setting test_events (IB_TEST_HOOKS=1)
      await exec(`INSERT INTO "Setting" (key, value, "updatedAt") VALUES ('test_events', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = now()`,
        JSON.stringify([{ key: "halloween2569", name: "ฮาโลวีน 2569", skin: "spooky", from: "2026-10-04", to: "2026-10-31", need: 10 }]));
      const LP = globalThis.__LP;
      const S3 = await reg("hw@x.com", "ฮาโล", "วีน"), C3 = (a, d) => call(a, d, S3.token, "hw@x.com"), u3 = S3.user.user_id;
      let P3 = 0;
      const dayAt = (iso) => setShift(Date.parse(iso + "T05:00:00Z") - Date.now());
      const studyDay = async () => { for (let i = 0; i < 15; i++) { await resetGap(u3); P3 += 60; ok(await C3("study.ping", { lesson_id: LP, preview: 1, pos: P3 })); } };
      await dayAt("2026-10-03"); await studyDay(); // before the event (starts 4 Oct): does not count
      for (const d of [16, 17, 19, 20, 22, 24, 25, 27, 28]) { await dayAt("2026-10-" + d); await studyDay(); } // 9 days, not in a row
      let st = ok(await C3("cells.status", {})), ev = st.events.find((e) => e.key === "halloween2569");
      assert.equal(ev.days, 9); assert.equal(ev.earned, false); assert(st.themes.indexOf("spooky") < 0);
      no(await C3("cells.theme", { theme: "spooky" }), "BAD_INPUT");
      await dayAt("2026-10-31"); await studyDay();
      st = ok(await C3("cells.status", {})); ev = st.events.find((e) => e.key === "halloween2569");
      assert.equal(ev.days, 10); assert.equal(ev.earned, true); assert(st.themes.indexOf("spooky") >= 0);
      ok(await C3("cells.theme", { theme: "spooky" }));
      await dayAt("2026-12-15"); st = ok(await C3("cells.status", {}));
      assert.equal(st.theme, "spooky"); assert.equal(st.events[0].active, false); assert.equal(st.events[0].earned, true);
      await exec(`UPDATE "Setting" SET value = '[]' WHERE key = 'test_events'`);
    });
    await t("settings: cells_enabled / event_mode / event_from / event_until are public and saved by the admin", async () => {
      const cfg = ok(await call("config", {}));
      for (const k of ["cells_enabled", "event_mode", "event_from", "event_until"]) assert(k in cfg, k);
      assert.equal(cfg.event_mode, "auto");
      assert.equal(cfg.event_from, "2026-10-04T00:00"); assert.equal(cfg.event_until, "2026-10-31T23:59"); // migration 24
      ok(await call("admin.settings.save", { event_mode: "halloween", event_from: "2026-10-01T00:00", event_until: "2026-10-31T23:59" }, adm));
      const c2 = ok(await call("config", {})); assert.equal(c2.event_until, "2026-10-31T23:59"); assert(!("test_day_shift_ms" in c2));
      ok(await call("admin.settings.save", { cells_enabled: "0" }, adm));
      assert.equal(ok(await C("study.ping", { lesson_id: L1, pos: 99999 })).off, true);
      ok(await call("admin.settings.save", { cells_enabled: "1", event_mode: "auto", event_from: "", event_until: "" }, adm));
    });
  } finally {
    await setShift(0);
  }
  console.log(`\n${n} cells tests passed`);
}

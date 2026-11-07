// INeedBio Birthday Giveaway (rounds 8c + 8d: opens 7 Nov 00:00, answers up to 5,000 characters, Story required): the campaign clock and its phases, the menu window, who may apply, every
// check on the form (on the server, whatever the page does), the Story screenshot, admin-only actions, at most 5
// "ผ่าน" even with simultaneous clicks, the award (free grant: not income, no teacher share, once only, no email),
// the CSV and the Story purge. Runs on its own throwaway local database (tests/run.mjs). The clock is moved with the
// local-only test hook test.giveaway.now (IB_TEST_HOOKS=1 on the test server, never in production).
import assert from "node:assert";
import fs from "node:fs";

export async function run({ BASE, OUTBOX, db, makeAdmin }) {
  const outbox = () => fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const call = async (action, data, token, device_id = "dev") =>
    (await fetch(BASE + "api/ib", { method: "POST", body: JSON.stringify({ action, data: data || {}, token, device_id, device_info: "Test" }) })).json();
  const ok = (r) => { if (!r.ok) throw new Error(r.error + ": " + r.message); return r.data; };
  const no = (r, code) => { assert.equal(r.ok, false, "ควรถูกปฏิเสธ"); if (code) assert.equal(r.error, code, r.message); return r; };
  let n = 0;
  const t = async (name, fn) => { await fn(); n++; console.log("✓ giveaway:", name); };
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const base = { photo: { mime: "image/png", base64: PNG }, accept_data: true, accept_terms: true, password: "secret123", school: "ร.ร.ทดสอบ", grade: "ม.5", dream_faculty: "แพทย์", dream_university: "มหิดล", birthday: "2009-01-01", line_id: "x" };
  const otpFor = (email) => { const m = outbox().filter((x) => x.to === email && /^\d{6} /.test(x.subject)).pop(); if (!m) throw new Error("no OTP for " + email); return m.subject.slice(0, 6); };
  let ph = 10;
  const reg = async (email) => {
    ok(await call("register.start", { ...base, phone: "08200000" + ph++, email, first_name: "ชื่อ" + email.split("@")[0], last_name: "สกุล", nickname: email.split("@")[0] }));
    const r = ok(await call("register.verify", { email, otp: otpFor(email) }, null, email));
    return { token: r.token, id: r.user.user_id, email };
  };

  // courses: two published with a price, one draft, one free; a bundle (other table)
  const any = await db.course.findFirst({ orderBy: { createdAt: "asc" } });
  const mk = (slug, title, extra) => db.course.create({ data: { slug, title, description: "-", price: 990, isPublished: true, subjectId: any.subjectId, categoryId: any.categoryId, ...(extra || {}) } });
  await db.course.updateMany({ data: { isPublished: false } }); // only the courses below take part
  const A = await mk("gv-a", "คอร์ส A"), B = await mk("gv-b", "คอร์ส B");
  await mk("gv-draft", "ฉบับร่าง", { isPublished: false }); await mk("gv-free", "ฟรี", { price: 0 });
  await db.bundle.create({ data: { id: "BDGV1", title: "แพ็กเกจ", courseIds: "gv-a,gv-b", price: 1500 } });

  const AD = await reg("gvad@x.com"); makeAdmin("gvad@x.com");
  const adm = ok(await call("login", { email: "gvad@x.com", password: "secret123" }, null, "gvad@x.com")).token;
  const TE = await reg("gvte@x.com");
  await db.user.update({ where: { id: TE.id }, data: { roles: "teacher", role: "INSTRUCTOR", subjects: "bio" } });
  const S = await reg("s1@x.com"), S2 = await reg("s2@x.com");
  const clock = async (iso) => ok(await call("test.giveaway.now", { now: iso }, adm));
  const R50 = "ก".repeat(50), R49 = "ก".repeat(49);
  const STORY = { mime: "image/png", base64: PNG };
  const form = (x) => ({ ig: "s1_ig", course_id: "gv-a", reason: R50, goal: R50, consent_pdpa: true, story: STORY, ...(x || {}) });

  await t("dates (opened early): 6 Nov 23:59 not yet · 7 Nov 00:00 open + menu · 7 Nov 10:00 open", async () => {
    await clock("2026-11-06T23:59:00+07:00");
    let s = ok(await call("giveaway.status", {}));
    assert.equal(s.phase, "pre"); assert.equal(s.menu, false); assert.equal(s.server_now, "2026-11-06T16:59:00.000Z");
    assert.equal(s.open_at, "2026-11-07T00:00:00+07:00"); assert.equal(s.text_max, 5000);
    assert.deepEqual(s.courses.map((c) => c.course_id).sort(), ["gv-a", "gv-b"]); // no draft, no free course, no bundle
    const r = no(await call("giveaway.apply", form(), S.token), "NOT_OPEN");
    assert.ok(r.message.includes("7 พ.ย. 69 เวลา 00:00"), r.message);
    await clock("2026-11-07T00:00:00+07:00");
    s = ok(await call("giveaway.status", {})); assert.equal(s.phase, "open"); assert.equal(s.menu, true);
    await clock("2026-11-07T10:00:00+07:00");
    s = ok(await call("giveaway.status", {})); assert.equal(s.phase, "open"); assert.equal(s.menu, true);
  });

  await t("no login → AUTH · admins and teachers may not apply", async () => {
    no(await call("giveaway.apply", form()), "AUTH");
    no(await call("giveaway.mine", {}), "AUTH");
    no(await call("giveaway.apply", form({ ig: "adm_ig" }), adm), "FORBIDDEN");
    no(await call("giveaway.apply", form({ ig: "te_ig" }), TE.token, "gvte@x.com"), "FORBIDDEN");
    assert.equal(ok(await call("giveaway.status", {}, TE.token, "gvte@x.com")).me.staff, true);
  });

  await t("form checks: IG format, 49 characters, 5,001 characters, PDPA, Story required", async () => {
    for (const ig of ["", "a..b", ".abc", "abc.", "ab cd", "ชื่อไทย", "a".repeat(31), "abc-def"]) no(await call("giveaway.apply", form({ ig }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ reason: R49 }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ goal: "  " + R49 + "  " }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ goal: "ก".repeat(5001) }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ reason: "  " + "ก".repeat(5001) + "  " }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ story: undefined }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ story: { mime: "image/png", base64: "" } }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ consent_pdpa: false }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ consent_pdpa: "true" }), S.token), "BAD_INPUT");
    assert.equal(await db.giveawayApplication.count(), 0);
  });

  await t("courses: draft, free course, bundle id and a course already owned are refused (direct API too)", async () => {
    for (const course_id of ["gv-draft", "gv-free", "BDGV1", "nope", ""]) no(await call("giveaway.apply", form({ course_id }), S.token), "BAD_INPUT");
    await db.enrollment.create({ data: { userId: S2.id, courseId: B.id, status: "ACTIVE", enrolledAt: new Date() } });
    no(await call("giveaway.apply", form({ ig: "s2_ig", course_id: "gv-b" }), S2.token), "BAD_INPUT");
    assert.deepEqual(ok(await call("giveaway.status", {}, S2.token)).me.owned, ["gv-b"]);
  });

  await t("Story: over 5 MB or not an image refused · a real image kept private", async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 10, 0); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(big);
    no(await call("giveaway.apply", form({ story: { mime: "image/png", base64: big.toString("base64") } }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ story: { mime: "image/png", base64: Buffer.from("<html>not an image</html>").toString("base64") } }), S.token), "BAD_INPUT");
    no(await call("giveaway.apply", form({ story: { mime: "application/pdf", base64: PNG } }), S.token), "BAD_INPUT");
    assert.equal(await db.giveawayApplication.count(), 0);
  });

  let APP1;
  await t("apply: IG cleaned (@, link, upper case) · one per account · <script> kept as text", async () => {
    const L5000 = "ข".repeat(4975) + "<script>alert(1)</script>"; // exactly 5,000 characters
    assert.equal(Array.from(L5000).length, 5000);
    const r = ok(await call("giveaway.apply", form({ ig: "https://www.instagram.com/S1.IG_x/?igsh=abc", reason: "  " + L5000 + "\n", goal: "บรรทัด 1\nบรรทัด 2\n" + R50 }), S.token));
    assert.equal(r.ig, "s1.ig_x"); assert.equal(r.has_story, true); assert.equal(r.name, "ชื่อs1 สกุล");
    assert.ok(!("status" in r) && !("admin_note" in r));
    no(await call("giveaway.apply", form({ ig: "@another" }), S.token), "ALREADY");
    assert.equal(await db.giveawayApplication.count({ where: { userId: S.id } }), 1);
    APP1 = (await db.giveawayApplication.findFirst({ where: { userId: S.id } }));
    assert.equal(APP1.reason, L5000); assert.ok(APP1.goal.startsWith("บรรทัด 1\nบรรทัด 2\n")); // kept as typed (trimmed), never as HTML
    assert.equal(APP1.consentPdpa, true); assert.ok(APP1.consentPdpaAt);
    assert.ok(!("consentNickname" in APP1));
    assert.equal(APP1.status, "pending");
    const m = ok(await call("giveaway.mine", {}, S.token));
    assert.equal(m.application.course_id, "gv-a"); assert.ok(!("status" in m.application));
    assert.equal(ok(await call("giveaway.status", {}, S.token)).me.applied, true);
    assert.equal(normOk(await call("giveaway.apply", form({ ig: "@S2_IG", course_id: "gv-a" }), S2.token)).ig, "s2_ig");
  });
  function normOk(r) { return ok(r); }

  await t("a student cannot open someone's Story · the file is never public", async () => {
    no(await call("admin.giveaway.story", { id: APP1.id }, S2.token), "FORBIDDEN");
    no(await call("admin.giveaway.story", { id: APP1.id }, TE.token, "gvte@x.com"), "FORBIDDEN");
    assert.equal((await fetch(BASE + "api/ib/file/" + APP1.storyFile)).status, 404);
    assert.equal(ok(await call("admin.giveaway.story", { id: APP1.id }, adm)).mime, "image/png");
  });

  await t("students and teachers get FORBIDDEN on every admin action", async () => {
    for (const a of ["admin.giveaway.count", "admin.giveaway.list", "admin.giveaway.get", "admin.giveaway.status", "admin.giveaway.note", "admin.giveaway.award", "admin.giveaway.csv", "admin.giveaway.purge", "test.giveaway.now"]) {
      no(await call(a, { id: APP1.id, status: "approved", course_id: "gv-a", note: "x", confirm: "ลบรูป", now: "" }, S.token), "FORBIDDEN");
      no(await call(a, { id: APP1.id, status: "approved", course_id: "gv-a", note: "x", confirm: "ลบรูป", now: "" }, TE.token, "gvte@x.com"), "FORBIDDEN");
    }
  });

  await t("rate limit: the 6th send in 10 minutes is refused (a form mistake does not count)", async () => {
    await db.rateLimitHit.deleteMany();
    for (let i = 0; i < 3; i++) no(await call("giveaway.edit", form({ reason: R49 }), S.token), "BAD_INPUT");
    for (let i = 0; i < 5; i++) no(await call("giveaway.edit", form({ ig: "s1_ig", story: { mime: "image/png", base64: Buffer.from("x").toString("base64") } }), S.token), "BAD_INPUT");
    no(await call("giveaway.edit", form({ ig: "s1_ig" }), S.token), "RATE_LIMIT");
    await db.rateLimitHit.deleteMany();
  });

  await t("edit until 12 Nov 23:59:59 (status kept, event logged, Story kept or replaced) · not from 13 Nov 00:00", async () => {
    await db.giveawayApplication.update({ where: { id: APP1.id }, data: { status: "review" } });
    await clock("2026-11-12T23:59:59+07:00");
    assert.equal(ok(await call("giveaway.status", {})).phase, "open");
    const old = APP1.storyFile;
    const r = ok(await call("giveaway.edit", form({ ig: "s1_new", course_id: "gv-b", story: undefined }), S.token)); // no new file: the old one stays
    assert.equal(r.course_id, "gv-b"); assert.equal(r.has_story, true);
    let a = await db.giveawayApplication.findUnique({ where: { id: APP1.id } });
    assert.equal(a.status, "review"); assert.equal(a.igUsername, "s1_new"); assert.equal(a.storyFile, old);
    ok(await call("giveaway.edit", form({ ig: "s1_new", course_id: "gv-b", goal: "ก".repeat(5000) }), S.token)); // a new file replaces it
    a = await db.giveawayApplication.findUnique({ where: { id: APP1.id } });
    assert.notEqual(a.storyFile, old); assert.equal(await db.fileBlob.count({ where: { id: old } }), 0);
    assert.equal(Array.from(a.goal).length, 5000);
    const ev = await db.giveawayEvent.findMany({ where: { applicationId: APP1.id }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(ev.map((e) => e.action), ["submit", "edit", "edit"]);
    assert.ok(ev[1].detail.changed.includes("course") && ev[2].detail.changed.includes("story"));
    await clock("2026-11-13T00:00:00+07:00");
    assert.equal(ok(await call("giveaway.status", {})).phase, "closed");
    no(await call("giveaway.edit", form({ ig: "late" }), S.token), "CLOSED");
    const S3 = await reg("s3@x.com");
    no(await call("giveaway.apply", form({ ig: "s3" }), S3.token), "CLOSED");
    await clock("2026-11-13T16:59:00+07:00"); assert.equal(ok(await call("giveaway.status", {})).phase, "closed");
    await clock("2026-11-13T17:00:00+07:00"); assert.equal(ok(await call("giveaway.status", {})).phase, "announced");
    await clock("2026-11-19T23:59:59+07:00"); assert.equal(ok(await call("giveaway.status", {})).menu, true);
    await clock("2026-11-20T00:00:00+07:00"); assert.equal(ok(await call("giveaway.status", {})).menu, false);
  });

  // 7 more applications (made straight in the database; the form was tested above), then the review.
  const extra = [];
  for (let i = 0; i < 7; i++) {
    const u = await reg("w" + i + "@x.com");
    const a = await db.giveawayApplication.create({ data: { userId: u.id, igUsername: "w" + i, courseId: A.id, reason: R50, goal: R50, consentPdpa: true, consentPdpaAt: new Date() } });
    extra.push({ ...u, app: a.id });
  }

  await t("list + KPI · note (students never see it) · status events", async () => {
    let L = ok(await call("admin.giveaway.list", {}, adm));
    assert.equal(L.kpi.total, 9); assert.equal(L.kpi.pending, 8); assert.equal(L.kpi.review, 1); assert.equal(L.kpi.seats, 5);
    assert.equal(ok(await call("admin.giveaway.count", {}, adm)).pending, 8);
    const g = ok(await call("admin.giveaway.note", { id: APP1.id, note: "ตั้งใจดีมาก" }, adm));
    assert.equal(g.admin_note, "ตั้งใจดีมาก"); assert.equal(g.ig_url, "https://www.instagram.com/s1_new/");
    assert.ok(!JSON.stringify(ok(await call("giveaway.mine", {}, S.token))).includes("ตั้งใจดีมาก"));
    no(await call("admin.giveaway.status", { id: APP1.id, status: "winner" }, adm), "BAD_INPUT");
  });

  await t("at most 5 ผ่าน, also with 3 clicks at the same moment", async () => {
    for (const x of extra.slice(0, 4)) ok(await call("admin.giveaway.status", { id: x.app, status: "approved" }, adm));
    const rs = await Promise.all(extra.slice(4, 7).map((x) => call("admin.giveaway.status", { id: x.app, status: "approved" }, adm)));
    assert.equal(rs.filter((r) => r.ok).length, 1);
    assert.ok(rs.filter((r) => !r.ok).every((r) => r.error === "FULL"));
    assert.equal(await db.giveawayApplication.count({ where: { status: "approved" } }), 5);
    no(await call("admin.giveaway.status", { id: APP1.id, status: "approved" }, adm), "FULL");
    const d = ok(await call("admin.giveaway.get", { id: extra[0].app }, adm));
    assert.equal(d.approved_count, 5); assert.equal(d.events.at(-1).action, "status");
    assert.ok(await db.auditLog.findFirst({ where: { action: "ib.giveaway.status" } }));
  });

  let W;
  await t("award: only ผ่าน · access works · amount 0 grant, not income · once, also with 2 clicks · no email · status locked", async () => {
    no(await call("admin.giveaway.award", { id: APP1.id, course_id: "gv-b" }, adm), "BAD_INPUT"); // review, not approved
    W = extra[0];
    no(await call("admin.giveaway.award", { id: W.app, course_id: "gv-draft" }, adm), "BAD_INPUT");
    const mails = outbox().length;
    const rs = await Promise.all([1, 2].map(() => call("admin.giveaway.award", { id: W.app, course_id: "gv-b" }, adm)));
    assert.equal(rs.filter((r) => r.ok).length, 1);
    const pays = await db.payment.findMany({ where: { userId: W.id, courseId: B.id } });
    assert.equal(pays.length, 1); assert.equal(pays[0].amount, 0); assert.equal(pays[0].source, "grant"); assert.equal(pays[0].status, "APPROVED");
    assert.equal(pays[0].note, "Birthday Giveaway 2569");
    const a = await db.giveawayApplication.findUnique({ where: { id: W.app } });
    assert.equal(a.awardRef, pays[0].id); assert.equal(a.awardedCourseId, B.id); assert.equal(a.awardedBy, AD.id); assert.ok(a.awardedAt);
    assert.equal(outbox().length, mails, "ไม่มีอีเมลออก");
    const my = ok(await call("my.courses", {}, W.token, W.email));
    assert.ok(JSON.stringify(my).includes("gv-b"));
    const learn = await call("learn.get", { course_id: "gv-b" }, W.token, W.email);
    assert.equal(learn.ok, true, learn.message);
    const fin = ok(await call("fin.summary", {}, adm));
    assert.ok(!JSON.stringify(fin.income || []).includes(pays[0].id), "ไม่อยู่ในรายรับ");
    assert.equal(fin.teachers.reduce((s, x) => s + x.share, 0), 0, "ไม่มีส่วนแบ่งผู้สอน");
    assert.equal(fin.totals.income, 0); assert.ok(fin.free.grant >= 1, "นับเป็นสิทธิ์ที่ไม่นับเงิน");
    assert.ok(await db.auditLog.findFirst({ where: { action: "ib.grant", target: { contains: "gv-b" } } }));
    no(await call("admin.giveaway.award", { id: W.app, course_id: "gv-a" }, adm), "ALREADY");
    no(await call("admin.giveaway.status", { id: W.app, status: "rejected" }, adm), "AWARDED");
    const g = ok(await call("admin.giveaway.get", { id: W.app }, adm));
    assert.equal(g.awarded, true); assert.equal(g.awarded_course_id, "gv-b"); assert.equal(g.events.at(-1).action, "award");
    // a winner who already owns the chosen course: warning, and that course cannot be given
    await db.enrollment.create({ data: { userId: extra[1].id, courseId: A.id, status: "ACTIVE", enrolledAt: new Date() } });
    assert.equal(ok(await call("admin.giveaway.get", { id: extra[1].app }, adm)).owns_chosen, true);
    no(await call("admin.giveaway.award", { id: extra[1].app, course_id: "gv-a" }, adm), "ALREADY");
  });

  await t("the old \"+ เพิ่มสิทธิ์ให้ผู้ใช้เอง\" (admin.grant) still emails the student, as before", async () => {
    const G = await reg("gvg@x.com");
    const before = outbox().filter((x) => x.to === G.email).length;
    const r = ok(await call("admin.grant", { course_id: "gv-a", emails: G.email }, adm));
    assert.equal(r.granted, 1);
    const sent = outbox().filter((x) => x.to === G.email);
    assert.equal(sent.length, before + 1, "อีเมลแจ้งสิทธิ์ 1 ฉบับ");
    assert.ok((sent.at(-1).subject + sent.at(-1).html).includes("คอร์ส A"), sent.at(-1).subject);
  });

  await t("CSV: BOM, Thai header, no email / phone / full reason", async () => {
    const c = ok(await call("admin.giveaway.csv", {}, adm));
    assert.ok(c.csv.startsWith("\uFEFFส่งเมื่อ,ชื่อเล่น,ชื่อ-นามสกุล,IG,วิชา,คอร์ส,สถานะ,คอร์สที่มอบ,หมายเหตุ"));
    assert.equal(c.csv.trim().split("\r\n").length, 10);
    assert.ok(!/@x\.com/.test(c.csv) && !/082000/.test(c.csv) && !c.csv.includes(R50) && !c.csv.includes("ขขขขขขขขขข") && !c.csv.includes("<script>"));
    assert.ok(c.csv.includes("@s1_new") && c.csv.includes("ตั้งใจดีมาก") && c.csv.includes("คอร์ส B"));
  });

  await t("Story purge: not before 13 Dec 17:00 · needs ลบรูป · deletes only this campaign's files", async () => {
    const other = await db.fileBlob.create({ data: { mime: "image/png", data: Buffer.from(PNG, "base64"), isPublic: false } });
    no(await call("admin.giveaway.purge", { confirm: "ลบรูป" }, adm), "NOT_YET");
    await clock("2026-12-13T17:00:00+07:00");
    no(await call("admin.giveaway.purge", { confirm: "ลบ" }, adm), "BAD_INPUT");
    const story = (await db.giveawayApplication.findUnique({ where: { id: APP1.id } })).storyFile;
    const r = ok(await call("admin.giveaway.purge", { confirm: "ลบรูป" }, adm));
    assert.equal(r.deleted, 2); // s1 and s2 (the Story is required)
    assert.equal(await db.fileBlob.count({ where: { id: story } }), 0);
    assert.equal(await db.fileBlob.count({ where: { id: other.id } }), 1);
    const a = await db.giveawayApplication.findUnique({ where: { id: APP1.id } });
    assert.equal(a.storyFile, null); assert.ok(a.storyPurgedAt);
    no(await call("admin.giveaway.story", { id: APP1.id }, adm), "NOT_FOUND");
    assert.ok(await db.giveawayEvent.findFirst({ where: { applicationId: APP1.id, action: "purge_story" } }));
    await clock("");
  });
  console.log(n + " giveaway tests passed");
}

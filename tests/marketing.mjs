// "Where did you hear of INeedBio" at sign-up, free-chapter files for a 2-question survey, and the admin's การตลาด
// page, for /api/ib — ported from reference/tests-marketing.js (5 groups, same names and checks). Runs on its own
// throwaway local database (tests/run.mjs). append_('Lessons' | 'Enrollments' …), update_('Users' …) and
// read_('TrialLeads') = rows written / read with the test's Prisma client `db`.
import assert from "node:assert";
import fs from "node:fs";

export async function run({ BASE, OUTBOX, db, makeAdmin }) {
  const outbox = () => fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const call = async (action, data, token, device_id = "dev") =>
    (await fetch(BASE + "api/ib", { method: "POST", body: JSON.stringify({ action, data: data || {}, token, device_id, device_info: "Test" }) })).json();
  const ok = (r) => { if (!r.ok) throw new Error(r.error + ": " + r.message); return r.data; };
  const no = (r, code) => { assert.equal(r.ok, false, "ควรถูกปฏิเสธ"); if (code) assert.equal(r.error, code, r.message); return r; };
  let n = 0;
  const t = async (name, fn) => { await fn(); n++; console.log("✓ marketing:", name); };
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const base = { photo: { mime: "image/png", base64: PNG }, accept_data: true, accept_terms: true, password: "secret123", school: "ร.ร.", grade: "ม.6", dream_faculty: "แพทย์", dream_university: "มหิดล", birthday: "2008-01-01", line_id: "x" };
  const otpFor = (email) => { const m = outbox().filter((x) => x.to === email && /^\d{6} /.test(x.subject)).pop(); if (!m) throw new Error("no OTP for " + email); return m.subject.slice(0, 6); };
  let ph = 10;
  const reg = async (email, extra) => {
    ok(await call("register.start", { ...base, phone: "08000000" + ph++, email, first_name: "ก" + email[0], last_name: "ข", nickname: email.split("@")[0], ...(extra || {}) }));
    return ok(await call("register.verify", { email, otp: otpFor(email) }, null, email));
  };

  // setup: chem-posn on sale at ฿790 with 2 free episodes that have a file + 1 paid episode with a file
  const AD = await reg("ad@x.com"); makeAdmin("ad@x.com");
  const adm = ok(await call("login", { email: "ad@x.com", password: "secret123" }, null, "ad@x.com")).token;
  const CID = "chem-posn";
  const all = ok(await call("admin.courses", {}, adm));
  const c0 = all.find((x) => x.course_id === CID); assert(c0, CID);
  ok(await call("admin.course.save", { ...c0, price: 790, full_price: "", status: "published", pay_account_id: "" }, adm));
  const course = await db.course.findUnique({ where: { slug: CID } });
  await db.lesson.updateMany({ where: { courseId: course.id }, data: { isPreview: false } }); // the demo episodes: not free here
  const mk = (id, title, pv, so) => db.lesson.create({ data: { id, courseId: course.id, chapter: "บทที่ 1", title, type: "VIDEO", youtubeUrl: "https://youtu.be/yyyyyyyyyy" + so, duration: 3600, isPreview: pv, order: 1000 + so, hidden: false,
    files: [{ fid: "F" + id, url: "https://drive.google.com/D" + id, name: "ชีท " + title + ".pdf", mime: "application/pdf", size: 10 }] } });
  await mk("LP1", "โครงสร้างอะตอม ตอนที่ 1", true, 1); await mk("LP2", "โครงสร้างอะตอม ตอนที่ 2", true, 2); await mk("LPAID", "ตารางธาตุ", false, 3);
  const start = new Date(Date.now() - 864e5).toISOString(), end = new Date(Date.now() + 10 * 864e5).toISOString();
  ok(await call("admin.coupon.save", { code: "NEW10", kind: "percent", value: 10, new_only: true, starts_at: start, ends_at: end }, adm));

  let A, OLD;
  await t("signup: heard_from saved (with note and ref) · bad value rejected · old style signup still works", async () => {
    assert.equal((await call("register.start", { ...base, phone: "0899999999", email: "bad@x.com", first_name: "ก", last_name: "ข", nickname: "บ", heard_from: "myspace" })).error, "BAD_INPUT");
    A = await reg("a@x.com", { heard_from: "fb_group", heard_note: "กลุ่ม Dek70 ", ref: "poster-free<script>" });
    const u = await db.user.findUnique({ where: { email: "a@x.com" } });
    assert.equal(u.heardFrom, "fb_group"); assert.equal(u.heardNote, "กลุ่ม Dek70"); assert.equal(u.ref, "poster-freescript");
    OLD = await reg("old@x.com"); // the old way: no answer
    assert.equal((await db.user.findUnique({ where: { email: "old@x.com" } })).heardFrom || "", "");
    const cfg = ok(await call("config", {}));
    assert.equal(cfg.heard[0][0], "fb_page"); assert.equal(cfg.trial_help.length, 5);
  });
  await t("course page: no free files until admin turns it on · file names only, no links", async () => {
    assert.equal(ok(await call("course.detail", { course_id: CID })).free_files, undefined);
    no(await call("admin.course.trial", { course_id: CID, on: true }, A.token, "a@x.com"), "FORBIDDEN");
    ok(await call("admin.course.trial", { course_id: CID, on: true, label: "โครงสร้างอะตอม" }, adm));
    const c = ok(await call("course.detail", { course_id: CID }));
    assert.equal(c.free_files.length, 2); assert.equal(c.free_label, "โครงสร้างอะตอม"); assert.equal(c.free_unlocked, false);
    assert.ok(!JSON.stringify(c.free_files).includes("DLP1"));
    assert.ok(!JSON.stringify(c).includes("ตารางธาตุ.pdf"));
    assert.equal(ok(await call("course.detail", { course_id: CID }, A.token, "a@x.com")).free_unlocked, false);
  });
  await t("files stay locked until the 2-question survey · answers validated", async () => {
    no(await call("learn.file", { lesson_id: "LP1", fid: "FLP1" }, A.token, "a@x.com"), "NO_ACCESS");
    no(await call("trial.unlock", { course_id: CID, goals: ["A-Level"], help: "ตะลุยโจทย์เยอะๆ" }), "AUTH");
    no(await call("trial.unlock", { course_id: CID, goals: [], help: "ตะลุยโจทย์เยอะๆ" }, A.token, "a@x.com"), "BAD_INPUT");
    no(await call("trial.unlock", { course_id: CID, goals: ["A-Level"], help: "ขอเงิน" }, A.token, "a@x.com"), "BAD_INPUT");
    const r = ok(await call("trial.unlock", { course_id: CID, goals: ["A-Level", "สอวน.", "มั่ว"], help: "ตะลุยโจทย์เยอะๆ" }, A.token, "a@x.com"));
    assert.equal(r.first, true); assert.equal(r.files.length, 2);
    // the discount that really applies: new members −10%
    assert.equal(r.offer.price, 790); assert.equal(r.offer.total, 711); assert.equal(r.offer.label, "สมาชิกใหม่ลด 10%"); assert.equal(r.offer.ends_at, end);
    const lead = (await db.trialLead.findMany())[0];
    assert.equal(lead.goals, "A-Level,สอวน."); assert.equal(lead.ref, "poster-freescript");
    assert.equal(ok(await call("learn.file", { lesson_id: "LP1", fid: "FLP1" }, A.token, "a@x.com")).name, "ชีท โครงสร้างอะตอม ตอนที่ 1.pdf");
    // the paid episode stays locked
    no(await call("learn.file", { lesson_id: "LPAID", fid: "FLPAID" }, A.token, "a@x.com"), "NO_ACCESS");
    // opened again without answering, and no new row
    const r2 = ok(await call("trial.unlock", { course_id: CID }, A.token, "a@x.com"));
    assert.equal(r2.first, false); assert.equal(await db.trialLead.count(), 1);
    assert.equal(ok(await call("course.detail", { course_id: CID }, A.token, "a@x.com")).free_unlocked, true);
  });
  await t("old member: no new-member price · turning feature off locks files again", async () => {
    await db.user.update({ where: { email: "old@x.com" }, data: { createdAt: new Date("2026-01-01T00:00:00.000Z") } });
    const r = ok(await call("trial.unlock", { course_id: CID, goals: ["กสพท"], help: "สรุปเนื้อหาให้เข้าใจ" }, OLD.token, "old@x.com"));
    assert.equal(r.offer.total, 790); assert.equal(r.offer.label, "");
    ok(await call("admin.course.trial", { course_id: CID, on: false }, adm));
    no(await call("learn.file", { lesson_id: "LP1", fid: "FLP1" }, A.token, "a@x.com"), "NO_ACCESS");
    no(await call("trial.unlock", { course_id: CID }, A.token, "a@x.com"), "NOT_FOUND");
    ok(await call("admin.course.trial", { course_id: CID, on: true, label: "โครงสร้างอะตอม" }, adm));
  });
  await t("admin marketing: sources from signup, lead → bought after, answers counted", async () => {
    no(await call("admin.marketing", {}, A.token, "a@x.com"), "FORBIDDEN");
    // a buys the course after getting the files
    await db.payment.create({ data: { id: "E1", userId: A.user.user_id, courseId: course.id, amount: 711, promptpayRef: "MKT-TEST-1", status: "APPROVED", source: "bill", createdAt: new Date(Date.now() + 1000), reviewedAt: new Date(Date.now() + 1000) } });
    const m = ok(await call("admin.marketing", { days: 30 }, adm));
    const g = m.signups.by.filter((x) => x.key === "fb_group")[0];
    assert.equal(g.n, 1); assert.equal(g.buyers, 1); assert.equal(g.sales, 711);
    assert.equal(m.signups.notes[0].note, "กลุ่ม Dek70"); assert.equal(m.signups.refs[0].ref, "poster-freescript");
    assert.equal(m.leads.n, 2); assert.equal(m.leads.bought, 1);
    assert.equal(m.goals.filter((x) => x.label === "A-Level")[0].n, 1); assert.equal(m.goals.filter((x) => x.label === "กสพท")[0].n, 1);
    assert.equal(m.help.filter((x) => x.label === "ตะลุยโจทย์เยอะๆ")[0].n, 1);
    const rec = m.recent.filter((x) => x.nickname === "a")[0];
    assert.equal(rec.bought, true); assert.equal(rec.heard, "กลุ่ม Facebook"); assert.equal(rec.label, "โครงสร้างอะตอม");
    const cc = m.courses.filter((x) => x.course_id === CID)[0];
    assert.equal(cc.on, true); assert.equal(cc.previews, 2); assert.equal(cc.files, 2);
  });
  console.log(`\n${n} marketing tests passed`);
}

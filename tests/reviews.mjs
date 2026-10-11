// Reviews an admin puts in (a review a student sent another way) for /api/ib, ported from reference/tests-reviews.js
// (3 groups, same names and checks): shown under each course at once · not in the students' review queue · edit /
// hide / delete only the admin's own · no cells. Runs on its own throwaway local database (tests/run.mjs).
// append_('Reviews' …) = a Review row written with `db`.
import assert from "node:assert";
import fs from "node:fs";

export async function run({ BASE, OUTBOX, db, makeAdmin }) {
  const outbox = () => fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const call = async (action, data, token, device_id = "dev") =>
    (await fetch(BASE + "api/ib", { method: "POST", body: JSON.stringify({ action, data: data || {}, token, device_id, device_info: "Test" }) })).json();
  const ok = (r) => { if (!r.ok) throw new Error(r.error + ": " + r.message); return r.data; };
  const no = (r, code) => { assert.equal(r.ok, false, "ควรถูกปฏิเสธ"); if (code) assert.equal(r.error, code, r.message); return r; };
  let n = 0;
  const t = async (name, fn) => { await fn(); n++; console.log("✓ reviews:", name); };
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const base = { photo: { mime: "image/png", base64: PNG }, accept_data: true, accept_terms: true, password: "secret123", school: "ร.ร.", grade: "ม.5", phone: "0800000000",
    dream_faculty: "แพทย์", dream_university: "มหิดล", birthday: "2009-01-01", line_id: "x" };
  const otpFor = (email) => { const m = outbox().filter((x) => x.to === email && /^\d{6} /.test(x.subject)).pop(); if (!m) throw new Error("no OTP for " + email); return m.subject.slice(0, 6); };
  const reg = async (email) => {
    ok(await call("register.start", { ...base, email, first_name: "ก" + email[0], last_name: "ข", nickname: email.split("@")[0] }));
    return ok(await call("register.verify", { email, otp: otpFor(email) }, null, email));
  };

  // setup: the math courses of ม.4 on sale, an admin, a student
  await reg("ad@x.com"); makeAdmin("ad@x.com");
  const adm = ok(await call("login", { email: "ad@x.com", password: "secret123" }, null, "ad@x.com")).token;
  const ST = await reg("st@x.com");
  const M41 = "math-m4-t1", M42 = "math-m4-t2";
  const all = ok(await call("admin.courses", {}, adm));
  for (const id of [M41, M42]) { const c = all.find((x) => x.course_id === id); assert(c, id); ok(await call("admin.course.save", { ...c, price: 1000, status: "published" }, adm)); }
  const reviewsOf = async (cid) => ok(await call("course.detail", { course_id: cid })).reviews;

  let ids;
  await t("admin adds one review to several courses: shows under each course right away", async () => {
    no(await call("admin.review.save", { course_ids: [M41], display_name: "น้องมิว", rating: 5, text: "ดีมาก" }, ST.token, "st@x.com"), "FORBIDDEN");
    no(await call("admin.review.save", { course_ids: [M41], display_name: "", rating: 5, text: "สอนเข้าใจมาก" }, adm), "BAD_INPUT");
    no(await call("admin.review.save", { course_ids: [M41], display_name: "น้องมิว", rating: 0, text: "สอนเข้าใจมาก" }, adm), "BAD_INPUT");
    no(await call("admin.review.save", { course_ids: [], display_name: "น้องมิว", rating: 5, text: "สอนเข้าใจมาก" }, adm), "BAD_INPUT");
    no(await call("admin.review.save", { course_ids: ["NOPE"], display_name: "น้องมิว", rating: 5, text: "สอนเข้าใจมาก" }, adm), "BAD_INPUT");
    const cells0 = await db.cellLedger.count();
    ids = ok(await call("admin.review.save", { course_ids: [M41, M42], display_name: "น้องมิว", display_grade: "ม.4 เตรียมฯ", rating: 5, text: "พี่สอนเข้าใจมาก ทำข้อสอบได้เลย", note: "จากไลน์ 3 ต.ค." }, adm)).ids;
    assert.equal(ids.length, 2);
    const r = await reviewsOf(M41);
    assert.equal(r.length, 1); assert.equal(r[0].nickname, "น้องมิว"); assert.equal(r[0].grade, "ม.4 เตรียมฯ"); assert.equal(r[0].rating, 5);
    assert.equal(r[0].note, undefined); // the internal note never reaches the page
    assert.equal((await reviewsOf(M42)).length, 1);
    assert.equal(await db.cellLedger.count(), cells0);
  });
  await t("admin list: added reviews separate from student queue", async () => {
    const f = ok(await call("admin.feedback", {}, adm));
    assert.equal(f.added.length, 2); assert.equal(f.added[0].note, "จากไลน์ 3 ต.ค.");
    assert.equal(f.reviews.length, 0); assert.equal(f.counts.reviews, 0);
    assert.ok(f.courses.length > 0);
    assert.equal(ok(await call("admin.feedback", { status: "done" }, adm)).reviews.length, 0);
  });
  await t("edit / hide / delete admin review · student reviews cannot be edited or deleted this way", async () => {
    ok(await call("admin.review.save", { review_id: ids[0], display_name: "น้องมิว", display_grade: "ม.5", rating: 4, text: "แก้ข้อความแล้วนะ", note: "" }, adm));
    assert.equal((await reviewsOf(M41))[0].text, "แก้ข้อความแล้วนะ");
    ok(await call("admin.review.save", { review_id: ids[0], display_name: "น้องมิว", rating: 4, text: "แก้ข้อความแล้วนะ", hidden: true }, adm));
    assert.equal((await reviewsOf(M41)).length, 0);
    ok(await call("admin.review.delete", { review_id: ids[1] }, adm));
    assert.equal((await reviewsOf(M42)).length, 0);
    const c41 = await db.course.findUnique({ where: { slug: M41 } });
    await db.review.create({ data: { id: "RVSTU", userId: ST.user.user_id, courseId: c41.id, rating: 5, text: "รีวิวจากนักเรียนจริง ยาวพอ", status: "approved" } });
    no(await call("admin.review.delete", { review_id: "RVSTU" }, adm), "FORBIDDEN");
    no(await call("admin.review.save", { review_id: "RVSTU", display_name: "x", rating: 5, text: "แก้รีวิวคนอื่น" }, adm), "FORBIDDEN");
    const r = await reviewsOf(M41); assert.equal(r.length, 1); assert.equal(r[0].nickname, "st"); assert.equal(r[0].grade, "ม.5");
  });
  console.log(`\n${n} reviews tests passed`);
}

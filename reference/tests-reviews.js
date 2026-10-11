// ทดสอบ: แอดมินใส่รีวิวเอง (คำรีวิวที่น้องส่งมาทางอื่น) ขึ้นใต้คอร์สทันที · แก้/ซ่อน/ลบ · ไม่ปนกับคิวตรวจรีวิวของนักเรียน · ไม่ให้เซลล์
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = vm.createContext({ console, Date, Math, JSON, String, Number, Object, Array, Error, parseInt, unescape, encodeURIComponent, isNaN });
vm.runInContext(fs.readFileSync(__dirname + '/gas-mock.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../backend/Code.gs', 'utf8'), ctx);
const M = ctx.__mock, run = (js) => vm.runInContext(js, ctx);
const call = (action, data, token, device_id = 'dev') => M.call({ action, data, token, device_id, device_info: 'Test' });
const ok = r => { if (!r.ok) throw new Error(r.error + ': ' + r.message); return r.data; };
const no = (r, code) => { assert.equal(r.ok, false, 'ควรถูกปฏิเสธ'); if (code) assert.equal(r.error, code, r.message); return r; };
const lastOtp = () => M.outbox[M.outbox.length - 1].subject.slice(0, 6);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓', name); };
const PH = { mime: 'image/jpeg', base64: Buffer.from('x').toString('base64') };
const base = { photo: PH, accept_data: true, accept_terms: true, password: 'secret123', school: 'ร.ร.', grade: 'ม.5', phone: '0800000000', dream_faculty: 'แพทย์', dream_university: 'มหิดล', birthday: '2009-01-01', line_id: 'x' };
const reg = (email) => { ok(call('register.start', { ...base, email, first_name: 'ก' + email[0], last_name: 'ข', nickname: email.split('@')[0] })); return ok(call('register.verify', { email, otp: lastOtp() }, null, email)); };

ctx.setup(); run("setupCourses('https://x/', false)");
run("read_('Courses').forEach(function(c){ update_('Courses', c._row, { status: 'published' }); }); cache_().remove('pub_courses');");
const AD = reg('ad@x.com'); ctx.makeAdmin('ad@x.com'); const adm = AD.token;
const ST = reg('st@x.com');
const reviewsOf = cid => ok(call('course.detail', { course_id: cid })).reviews;

let ids;
t('admin adds one review to several courses: shows under each course right away', () => {
  no(call('admin.review.save', { course_ids: ['MATH-M4-T1'], display_name: 'น้องมิว', rating: 5, text: 'ดีมาก' }, ST.token), 'FORBIDDEN');
  no(call('admin.review.save', { course_ids: ['MATH-M4-T1'], display_name: '', rating: 5, text: 'สอนเข้าใจมาก' }, adm), 'BAD_INPUT');
  no(call('admin.review.save', { course_ids: ['MATH-M4-T1'], display_name: 'น้องมิว', rating: 0, text: 'สอนเข้าใจมาก' }, adm), 'BAD_INPUT');
  no(call('admin.review.save', { course_ids: [], display_name: 'น้องมิว', rating: 5, text: 'สอนเข้าใจมาก' }, adm), 'BAD_INPUT');
  no(call('admin.review.save', { course_ids: ['NOPE'], display_name: 'น้องมิว', rating: 5, text: 'สอนเข้าใจมาก' }, adm), 'BAD_INPUT');
  const cells0 = run("read_('CellLedger').length");
  ids = ok(call('admin.review.save', { course_ids: ['MATH-M4-T1', 'MATH-M4-T2'], display_name: 'น้องมิว', display_grade: 'ม.4 เตรียมฯ', rating: 5, text: 'พี่สอนเข้าใจมาก ทำข้อสอบได้เลย', note: 'จากไลน์ 3 ต.ค.' }, adm)).ids;
  assert.equal(ids.length, 2);
  const r = reviewsOf('MATH-M4-T1');
  assert.equal(r.length, 1); assert.equal(r[0].nickname, 'น้องมิว'); assert.equal(r[0].grade, 'ม.4 เตรียมฯ'); assert.equal(r[0].rating, 5);
  assert.equal(r[0].note, undefined); // หมายเหตุภายในไม่หลุดหน้าเว็บ
  assert.equal(reviewsOf('MATH-M4-T2').length, 1);
  assert.equal(run("read_('CellLedger').length"), cells0);
});
t('admin list: added reviews separate from student queue', () => {
  const f = ok(call('admin.feedback', {}, adm));
  assert.equal(f.added.length, 2); assert.equal(f.added[0].note, 'จากไลน์ 3 ต.ค.');
  assert.equal(f.reviews.length, 0); assert.equal(f.counts.reviews, 0);
  assert.ok(f.courses.length > 0);
  assert.equal(ok(call('admin.feedback', { status: 'done' }, adm)).reviews.length, 0);
});
t('edit / hide / delete admin review · student reviews cannot be edited or deleted this way', () => {
  ok(call('admin.review.save', { review_id: ids[0], display_name: 'น้องมิว', display_grade: 'ม.5', rating: 4, text: 'แก้ข้อความแล้วนะ', note: '' }, adm));
  assert.equal(reviewsOf('MATH-M4-T1')[0].text, 'แก้ข้อความแล้วนะ');
  ok(call('admin.review.save', { review_id: ids[0], display_name: 'น้องมิว', rating: 4, text: 'แก้ข้อความแล้วนะ', hidden: true }, adm));
  assert.equal(reviewsOf('MATH-M4-T1').length, 0);
  ok(call('admin.review.delete', { review_id: ids[1] }, adm));
  assert.equal(reviewsOf('MATH-M4-T2').length, 0);
  run("append_('Reviews', { review_id: 'RVSTU', user_id: '" + ST.user.user_id + "', course_id: 'MATH-M4-T1', rating: 5, text: 'รีวิวจากนักเรียนจริง ยาวพอ', status: 'approved', created_at: now_() })");
  no(call('admin.review.delete', { review_id: 'RVSTU' }, adm), 'FORBIDDEN');
  no(call('admin.review.save', { review_id: 'RVSTU', display_name: 'x', rating: 5, text: 'แก้รีวิวคนอื่น' }, adm), 'FORBIDDEN');
  const r = reviewsOf('MATH-M4-T1'); assert.equal(r.length, 1); assert.equal(r[0].nickname, 'st'); assert.equal(r[0].grade, 'ม.5');
});
console.log('\n' + n + ' tests passed');

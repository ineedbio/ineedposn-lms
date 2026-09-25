const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = vm.createContext({ console, Date, Math, JSON, String, Number, Object, Array, Error, parseInt, unescape, encodeURIComponent });
vm.runInContext(fs.readFileSync(__dirname + '/gas-mock.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../backend/Code.gs', 'utf8'), ctx);
const M = ctx.__mock;
const call = (action, data, token, device_id = 'devA') => M.call({ action, data, token, device_id, device_info: 'Test' });
const ok = r => { if (!r.ok) throw new Error(r.error + ': ' + r.message); return r.data; };
const lastOtp = () => M.outbox[M.outbox.length - 1].subject.slice(0, 6);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓', name); };

ctx.setup();
t('config', () => assert.equal(ok(call('config')).contact_ig, 'ineedbiochem'));

const reg = { email: 'Admin@Test.com', password: 'secret123', first_name: 'พี่', last_name: 'แอดมิน', nickname: 'ไอซ์', school: 'CMU', grade: 'อื่นๆ', phone: '091-025-6171', current_faculty: 'วิศวกรรมศาสตร์', current_university: 'มช.', dream_faculty: 'แพทยศาสตร์', dream_university: 'มหิดล', accept_terms: true };
let adminTok;
t('register admin', () => {
  ok(call('register.start', reg));
  assert.equal(M.outbox.length, 1);
  assert.match(M.outbox[0].htmlBody, /ยืนยันอีเมลของคุณ/);
  const bad = call('register.verify', { email: reg.email, otp: '000000' });
  assert.equal(bad.error, 'OTP_INVALID');
  const r = ok(call('register.verify', { email: reg.email, otp: lastOtp() }));
  adminTok = r.token; assert.equal(r.user.email, 'admin@test.com'); assert.equal(r.user.phone, '0910256171');
});
t('duplicate email blocked', () => assert.equal(call('register.start', reg).error, 'EMAIL_TAKEN'));
t('makeAdmin', () => { ctx.makeAdmin('admin@test.com'); const me = ok(call('me', {}, adminTok)); assert.equal(me.role, 'admin'); assert.equal(me.is_repeat, true); assert.equal(me.current_university, 'มช.'); assert.equal(me.terms_version, '2026-09-25'); });
t('password not stored plain', () => { const u = M.db().getSheetByName('Users').rows[1]; assert(!u.join('|').includes('secret123')); });

let stu = { ...reg, email: 'mint@test.com', nickname: 'มิ้นท์', phone: '0812345678', grade: 'ม.4' }, stuTok;
t('signup rules: terms + dream + repeat student', () => {
  assert.equal(call('register.start', { ...stu, email: 'n1@test.com', accept_terms: false }).error, 'BAD_INPUT');
  assert.match(call('register.start', { ...stu, email: 'n2@test.com', dream_faculty: '' }).message, /คณะในฝัน/);
  assert.match(call('register.start', { ...stu, email: 'n3@test.com', grade: 'จบ ม.6 แล้ว', current_university: '' }).message, /มหาวิทยาลัยที่เรียนอยู่/);
  Object.keys(M.cache).forEach(k => k.startsWith('rl:') && delete M.cache[k]);
});
t('register student', () => { ok(call('register.start', stu)); stuTok = ok(call('register.verify', { email: stu.email, otp: lastOtp() }, null, 'phone')).token; const me = ok(call('me', {}, stuTok, 'phone')); assert.equal(me.current_university, ''); assert.equal(me.dream_faculty, 'แพทยศาสตร์'); assert.equal(ok(call('admin.stats', {}, adminTok)).dream_top[0].count, 2); });
t('results (hall of fame)', () => {
  const r = ok(call('admin.result.save', { year: '2569', subject: 'bio', nickname: 'แนบฝัน', school: 'เตรียมพัฒน์', center: 'ศูนย์ ต.อ.พ.', review: 'ดีมาก', photo_url: '' }, adminTok));
  ok(call('admin.result.save', { year: '2569', subject: 'chem', nickname: 'เค', status: 'hidden' }, adminTok));
  assert.equal(call('admin.result.save', { year: '69', subject: 'bio', nickname: 'x' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.result.save', { year: '2569', subject: 'bio', nickname: 'x' }, stuTok, 'phone').error, 'FORBIDDEN');
  const pub = ok(call('results.list'));
  assert.equal(pub.length, 1); assert.equal(pub[0].nickname, 'แนบฝัน'); assert.equal(pub[0].subject_name, 'ชีววิทยา');
  assert.equal(ok(call('admin.results', {}, adminTok)).length, 2);
  ok(call('admin.result.delete', { result_id: r.result_id }, adminTok));
  assert.equal(ok(call('results.list')).length, 0);
  const up = ok(call('admin.upload', { mime: 'image/png', base64: 'AAAA' }, adminTok));
  assert.match(up.url, /^https:\/\/drive\.google\.com\/thumbnail\?id=/);
  assert.equal(call('admin.upload', { mime: 'text/html', base64: 'AAAA' }, adminTok).error, 'BAD_INPUT');
});
t('student blocked from admin', () => assert.equal(call('admin.stats', {}, stuTok, 'phone').error, 'FORBIDDEN'));
t('otp resend rate limit', () => { assert.equal(call('register.start', { ...stu, email: 'x@test.com' }).ok, true); assert.equal(call('register.start', { ...stu, email: 'x@test.com' }).error, 'RATE_LIMIT'); });

let cid, l1, l2;
t('admin creates course + lessons', () => {
  cid = ok(call('admin.course.save', { new_id: 'bio-posn', subject: 'bio', level: 'สอวน.', title: 'ชีววิทยา สอวน.', price: 790, status: 'published' }, adminTok)).course_id;
  assert.equal(ok(call('courses.list'))[0].level, 'สอวน.');
  assert.equal(cid, 'BIO-POSN');
  l1 = ok(call('admin.lesson.save', { course_id: cid, chapter: 'บทที่ 1', title: '1.1 น้ำ', youtube: 'https://youtu.be/aB3xK9pQ2rM?si=x', duration_min: 42, is_preview: true }, adminTok)).lesson_id;
  l2 = ok(call('admin.lesson.save', { course_id: cid, chapter: 'บทที่ 1', title: '1.2 โปรตีน', youtube: 'https://www.youtube.com/watch?v=Zz9yY8xX7wW&t=3', duration_min: 50 }, adminTok)).lesson_id;
  assert.equal(call('admin.lesson.save', { course_id: cid, chapter: 'x', title: 'x', youtube: 'hello' }, adminTok).error, 'BAD_INPUT');
});
t('course intro fields', () => {
  ok(call('admin.course.save', { course_id: cid, subject: 'bio', title: 'ชีววิทยา สอวน.', price: 790, status: 'published',
    trailer_youtube: 'https://youtu.be/TrAiLeR1234', highlights: '- ครบ 100 ตอน\n- ชีทสรุป\n\n', audience: 'ม.3–ม.5',
    instructor_name: 'พี่ไอซ์', instructor_title: 'ผู้สอนชีวะ', instructor_bio: 'อดีตค่าย สอวน.', faq: 'ถาม: ดูได้กี่เครื่อง\nตอบ: 1 เครื่อง\n\nมีชีทไหม\nมีทุกบท' }, adminTok));
  const d = ok(call('course.detail', { course_id: cid }));
  assert.equal(d.trailer_id, 'TrAiLeR1234'); assert.deepEqual(d.highlights, ['ครบ 100 ตอน', 'ชีทสรุป']);
  assert.equal(d.instructor.name, 'พี่ไอซ์'); assert.equal(d.faq.length, 2); assert.equal(d.faq[0].q, 'ดูได้กี่เครื่อง'); assert.equal(d.faq[0].a, '1 เครื่อง');
  assert.equal(call('admin.course.save', { course_id: cid, subject: 'bio', title: 'x', price: 1, trailer_youtube: 'nope' }, adminTok).error, 'BAD_INPUT');
  assert.equal(ok(call('admin.courses', {}, adminTok))[0].instructor_bio, 'อดีตค่าย สอวน.');
});
t('schema migration adds missing columns', () => {
  const sh = M.db().getSheetByName('Courses'); const before = sh.rows[0].length;
  sh.rows.forEach(r => r.splice(12)); ctx.ensureCols_('Courses'); assert.equal(sh.rows[0].length, before);
});
t('public detail hides paid video ids', () => {
  const d = ok(call('course.detail', { course_id: cid }));
  const ls = d.chapters[0].lessons;
  assert.equal(ls[0].youtube_id, 'aB3xK9pQ2rM'); assert.equal(ls[1].youtube_id, '');
  assert.equal(ok(call('courses.list'))[0].lesson_count, 2);
});
t('learn blocked before enroll', () => assert.equal(call('learn.get', { course_id: cid }, stuTok, 'phone').error, 'NO_ACCESS'));
let eid;
t('enroll request', () => {
  const before = M.outbox.length;
  eid = ok(call('enroll.request', { course_id: cid, slip: { mime: 'image/jpeg', base64: 'AAAA' } }, stuTok, 'phone')).enroll_id;
  assert.equal(M.outbox.length, before + 1); assert.equal(M.outbox[before].to, 'admin@test.com');
  assert.equal(call('enroll.request', { course_id: cid, slip: { mime: 'image/jpeg', base64: 'AAAA' } }, stuTok, 'phone').error, 'ALREADY');
  assert.equal(ok(call('course.detail', { course_id: cid }, stuTok, 'phone')).enrollment, 'pending');
});
t('admin sees slip + approves', () => {
  const list = ok(call('admin.enrollments', { status: 'pending' }, adminTok));
  assert.equal(list.length, 1); assert.equal(list[0].nickname, 'มิ้นท์');
  assert.equal(ok(call('admin.slip', { enroll_id: eid }, adminTok)).base64, 'AAAA');
  ok(call('admin.decide', { enroll_id: eid, decision: 'approve' }, adminTok));
  assert.match(M.outbox[M.outbox.length - 1].subject, /เข้าเรียนได้แล้ว/);
  assert.equal(call('admin.decide', { enroll_id: eid, decision: 'reject' }, adminTok).error, 'ALREADY');
});
t('learn + progress', () => {
  const d = ok(call('learn.get', { course_id: cid }, stuTok, 'phone'));
  assert.equal(d.chapters[0].lessons[1].youtube_id, 'Zz9yY8xX7wW');
  ok(call('progress.set', { lesson_id: l1, done: true }, stuTok, 'phone'));
  ok(call('progress.set', { lesson_id: l1, done: true }, stuTok, 'phone'));
  const my = ok(call('my.courses', {}, stuTok, 'phone'));
  assert.equal(my[0].percent, 50); assert.equal(my[0].done_count, 1);
  ok(call('progress.set', { lesson_id: l1, done: false }, stuTok, 'phone'));
  assert.equal(ok(call('my.courses', {}, stuTok, 'phone'))[0].percent, 0);
});
t('reorder', () => {
  ok(call('admin.lessons.reorder', { course_id: cid, order: [l2, l1] }, adminTok));
  assert.equal(ok(call('admin.lessons', { course_id: cid }, adminTok))[0].lesson_id, l2);
});
t('one device: new login kicks old', () => {
  const tok2 = ok(call('login', { email: stu.email, password: 'secret123' }, null, 'laptop')).token;
  assert.equal(call('me', {}, stuTok, 'phone').error, 'SESSION_REPLACED');
  assert.equal(ok(call('me', {}, tok2, 'laptop')).nickname, 'มิ้นท์');
  stuTok = tok2;
});
t('bad login', () => assert.equal(call('login', { email: stu.email, password: 'nope' }).error, 'BAD_LOGIN'));
t('forgot/reset password', () => {
  Object.keys(M.cache).filter(k=>k.startsWith('rl:')).forEach(k=>delete M.cache[k]);
  ok(call('password.forgot', { email: 'nobody@test.com' }));
  const before = M.outbox.length;
  ok(call('password.forgot', { email: stu.email }));
  assert.equal(M.outbox.length, before + 1);
  const r = ok(call('password.reset', { email: stu.email, otp: lastOtp(), password: 'newpass99' }, null, 'laptop'));
  assert(ok(call('login', { email: stu.email, password: 'newpass99' }, null, 'laptop')).token);
  stuTok = null;
});
t('ban kills session', () => {
  const tok = ok(call('login', { email: stu.email, password: 'newpass99' }, null, 'laptop')).token;
  const uid = ok(call('me', {}, tok, 'laptop')).user_id;
  ok(call('admin.user.update', { user_id: uid, status: 'banned' }, adminTok));
  assert.notEqual(call('me', {}, tok, 'laptop').ok, true);
  assert.equal(call('login', { email: stu.email, password: 'newpass99' }).error, 'BANNED');
  ok(call('admin.user.update', { user_id: uid, status: 'active' }, adminTok));
});
Object.keys(M.cache).forEach(k=>k.startsWith('rl:')&&delete M.cache[k]);
t('grant + stats + users + settings', () => {
  ok(call('register.start', { ...stu, email: 'poom@test.com' })); ok(call('register.verify', { email: 'poom@test.com', otp: lastOtp() }, null, 'p'));
  ok(call('admin.grant', { email: 'poom@test.com', course_id: cid, amount: 690 }, adminTok));
  const s = ok(call('admin.stats', {}, adminTok));
  assert.equal(s.month_revenue, 790 + 690); assert.equal(s.users_total, 4 - 1 + 0 || s.users_total);
  assert(ok(call('admin.users', { q: 'poom' }, adminTok))[0].courses.length === 1);
  ok(call('admin.settings.save', { announcement: 'เปิดรอบใหม่', admin_emails: 'admin@test.com' }, adminTok));
  assert.equal(ok(call('config')).announcement, 'เปิดรอบใหม่');
  assert.equal(ok(call('config')).admin_emails, undefined);
});
/* ───── ฟีเจอร์ที่ย้ายมาจากระบบ Next.js ───── */
const rlClear = () => Object.keys(M.cache).filter(k => k.startsWith('rl:')).forEach(k => delete M.cache[k]);
t('profile avatar: upload, replace (old trashed), remove', () => {
  stuTok = ok(call('login', { email: stu.email, password: 'newpass99' }, null, 'laptop')).token;
  const u1 = ok(call('profile.avatar', { mime: 'image/jpeg', base64: 'AAAA' }, stuTok, 'laptop'));
  assert.match(u1.avatar_url, /^https:\/\/drive\.google\.com\/thumbnail\?id=/);
  const id1 = u1.avatar_url.match(/id=([\w-]+)/)[1];
  assert.equal(M.files[id1].folder, 'mock-folder-INeedBio Avatars'); assert.equal(M.files[id1].sharing, 'ANYONE_WITH_LINK');
  assert.equal(ok(call('me', {}, stuTok, 'laptop')).avatar_url, u1.avatar_url);
  const u2 = ok(call('profile.avatar', { mime: 'image/png', base64: 'BBBB' }, stuTok, 'laptop'));
  assert.notEqual(u2.avatar_url, u1.avatar_url); assert.equal(M.trashed[id1], true);
  assert.equal(call('profile.avatar', { mime: 'text/html', base64: 'AAAA' }, stuTok, 'laptop').error, 'BAD_INPUT');
  assert.equal(call('profile.avatar', { mime: 'image/png', base64: 'A'.repeat(3e6) }, stuTok, 'laptop').error, 'BAD_INPUT');
  assert.equal(call('profile.avatar', { mime: 'image/png', base64: 'AAAA' }).error, 'AUTH');
  assert.equal(ok(call('profile.avatar', { remove: true }, stuTok, 'laptop')).avatar_url, '');
  assert.equal(M.trashed[u2.avatar_url.match(/id=([\w-]+)/)[1]], true);
});
t('per-course PromptPay account', () => {
  assert.equal(ok(call('course.detail', { course_id: cid })).pay.promptpay_id, '0910256171');
  const c = ok(call('admin.courses', {}, adminTok)).find(x => x.course_id === cid);
  ok(call('admin.course.save', { ...c, promptpay_id: '081-234-5678', promptpay_name: 'ครูมิ้นท์', payment_qr_url: 'https://drive.google.com/thumbnail?id=qrqrqrqrqrqr' }, adminTok));
  const d = ok(call('course.detail', { course_id: cid }));
  assert.deepEqual(d.pay, { promptpay_id: '0812345678', promptpay_name: 'ครูมิ้นท์', qr_url: 'https://drive.google.com/thumbnail?id=qrqrqrqrqrqr' });
  assert.equal(ok(call('admin.courses', {}, adminTok)).find(x => x.course_id === cid).promptpay_name, 'ครูมิ้นท์');
  assert.equal(call('admin.course.save', { ...c, promptpay_id: '123' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.course.save', { ...c, payment_qr_url: 'http://x' }, adminTok).error, 'BAD_INPUT');
  ok(call('admin.course.save', { ...c, promptpay_id: '', promptpay_name: '', payment_qr_url: '' }, adminTok));
  assert.deepEqual(ok(call('course.detail', { course_id: cid })).pay, { promptpay_id: '0910256171', promptpay_name: 'INeedBio', qr_url: '' });
});
t('lesson files: upload + several attachments, only for enrolled', () => {
  const up = ok(call('admin.file.upload', { name: 'ชีทบทที่ 1.pdf', mime: 'application/pdf', base64: 'AAAA' }, adminTok));
  assert.match(up.url, /^https:\/\/drive\.google\.com\/file\/d\/.+\/view$/); assert.equal(up.name, 'ชีทบทที่ 1');
  assert.equal(M.files[up.url.split('/')[5]].folder, 'mock-folder-INeedBio Lesson Files');
  assert.equal(call('admin.file.upload', { name: 'x.exe', mime: 'application/x-msdownload', base64: 'AAAA' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.file.upload', { name: 'x.pdf', mime: 'application/pdf', base64: 'A'.repeat(14e6) }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.file.upload', { name: 'x.pdf', mime: 'application/pdf', base64: 'AAAA' }, stuTok, 'laptop').error, 'FORBIDDEN');
  const l = ok(call('admin.lessons', { course_id: cid }, adminTok)).find(x => x.lesson_id === l1);
  const base = { lesson_id: l1, chapter: l.chapter, title: l.title, youtube: l.youtube_id, duration_min: l.duration_min, is_preview: l.is_preview };
  ok(call('admin.lesson.save', { ...base, attachment_url: 'ชีทบทที่ 1 | ' + up.url + '\n\n https://drive.google.com/file/d/second/view ' }, adminTok));
  assert.equal(call('admin.lesson.save', { ...base, attachment_url: 'ชีท | http://evil.com' }, adminTok).error, 'BAD_INPUT');
  const files = ok(call('learn.get', { course_id: cid }, stuTok, 'laptop')).chapters[0].lessons.find(x => x.lesson_id === l1).files;
  assert.deepEqual(files, [{ label: 'ชีทบทที่ 1', url: up.url }, { label: '', url: 'https://drive.google.com/file/d/second/view' }]);
  assert.equal(JSON.stringify(ok(call('course.detail', { course_id: cid }))).includes('/file/d/'), false);
});
let manualId, manualEid;
t('student registry: list, add, bulk status/notes, unpaid, edit', () => {
  const r = ok(call('admin.students', {}, adminTok));
  assert(r.courses.some(c => c.course_id === cid));
  const mintRow = r.rows.find(x => x.email === stu.email && x.course_id === cid);
  assert.equal(mintRow.pay_status, 'approved'); assert.equal(mintRow.amount, 790);
  assert.equal(r.rows.find(x => x.email === 'admin@test.com').enroll_id, '');
  const mails = M.outbox.length;
  const c1 = ok(call('admin.student.create', { first_name: 'สมชาย', last_name: 'ใจดี', nickname: 'ชาย', grade: 'ม.3', school: 'บ้านสวน', phone: '-', email: '',
    course_id: cid, pay_status: 'unpaid', note: 'จ่ายสด', posn: { subject: 'ชีวะ', center: 'ม.ขอนแก่น' } }, adminTok));
  manualId = c1.user_id; manualEid = c1.enroll_id;
  let m = ok(call('admin.students', {}, adminTok)).rows.find(x => x.user_id === manualId);
  assert.equal(m.no_email, true); assert.equal(m.pay_status, 'unpaid'); assert.equal(m.note, 'จ่ายสด'); assert.equal(m.amount, 790); assert.equal(m.phone, '');
  const camp = ok(call('admin.camp', {}, adminTok)).rows.find(x => x.user_id === manualId);
  assert.equal(camp.name, 'สมชาย ใจดี'); assert.equal(camp.center, 'ม.ขอนแก่น'); assert.equal(camp.result, 'ยังไม่ทราบผล');
  assert.equal(call('admin.student.create', { first_name: 'x', email: stu.email }, adminTok).error, 'EMAIL_TAKEN');
  assert.equal(call('admin.student.create', { first_name: ' ' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.student.create', { first_name: 'x', phone: '12' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.student.create', { first_name: 'x', course_id: 'NOPE' }, adminTok).error, 'NOT_FOUND');
  ok(call('admin.students.save', { updates: [{ user_id: manualId, enroll_id: manualEid, pay_status: 'approved', note: 'โอนแล้ว' }] }, adminTok));
  assert.equal(M.outbox.length, mails, 'no email to a student without an address');
  m = ok(call('admin.students', {}, adminTok)).rows.find(x => x.user_id === manualId);
  assert.equal(m.pay_status, 'approved'); assert.equal(m.note, 'โอนแล้ว');
  assert.equal(call('admin.students.save', { updates: [{ user_id: manualId, enroll_id: manualEid, pay_status: 'rejected' }] }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.students.save', { updates: [{ user_id: manualId, enroll_id: mintRow.enroll_id, pay_status: 'pending' }] }, adminTok).error, 'NOT_FOUND');
  // ยังไม่ชำระ = ปิดสิทธิ์เรียน นักเรียนส่งสลิปใหม่ได้
  ok(call('admin.students.save', { updates: [{ user_id: mintRow.user_id, enroll_id: mintRow.enroll_id, pay_status: 'unpaid' }] }, adminTok));
  assert.equal(call('learn.get', { course_id: cid }, stuTok, 'laptop').error, 'NO_ACCESS');
  assert.equal(ok(call('course.detail', { course_id: cid }, stuTok, 'laptop')).enrollment, 'unpaid');
  assert.equal(ok(call('my.courses', {}, stuTok, 'laptop'))[0].enrollment, 'unpaid');
  const b2 = M.outbox.length;
  ok(call('admin.students.save', { updates: [{ user_id: mintRow.user_id, enroll_id: mintRow.enroll_id, pay_status: 'approved' }] }, adminTok));
  assert.equal(M.outbox.length, b2 + 1); assert.match(M.outbox[b2].subject, /เข้าเรียนได้แล้ว/);
  assert(ok(call('learn.get', { course_id: cid }, stuTok, 'laptop')).chapters.length);
  ok(call('admin.student.update', { user_id: manualId, first_name: 'สมชาย', last_name: 'ใจงาม', nickname: 'ชาย', grade: 'ม.4', school: 'บ้านสวน', phone: '0899999999', email: 'Chai@Test.com', note: 'แก้แล้ว' }, adminTok));
  m = ok(call('admin.students', {}, adminTok)).rows.find(x => x.user_id === manualId);
  assert.equal(m.email, 'chai@test.com'); assert.equal(m.last_name, 'ใจงาม'); assert.equal(m.no_email, false); assert.equal(m.note, 'แก้แล้ว');
  assert.equal(call('admin.student.update', { user_id: manualId, first_name: 'x', email: stu.email }, adminTok).error, 'EMAIL_TAKEN');
  assert.equal(call('admin.students', {}, stuTok, 'laptop').error, 'FORBIDDEN');
  assert.equal(call('admin.student.create', { first_name: 'x' }, stuTok, 'laptop').error, 'FORBIDDEN');
});
t('admin-added student sets own password via forgot password, then gets email hint', () => {
  rlClear();
  ok(call('password.forgot', { email: 'chai@test.com' }));
  ok(call('password.reset', { email: 'chai@test.com', otp: lastOtp(), password: 'chai12345' }, null, 'c'));
  const ct = ok(call('login', { email: 'chai@test.com', password: 'chai12345' }, null, 'c')).token;
  assert(ok(call('learn.get', { course_id: cid }, ct, 'c')).chapters.length);
  ok(call('profile.avatar', { mime: 'image/png', base64: 'CHAI' }, ct, 'c'));
  const c2 = ok(call('admin.student.create', { first_name: 'ใหม่', email: 'new1@test.com', course_id: cid }, adminTok));
  assert.match(M.outbox[M.outbox.length - 1].htmlBody, /ยังไม่เคยตั้งรหัสผ่าน/);
  assert.equal(ok(call('admin.students', {}, adminTok)).rows.find(x => x.user_id === c2.user_id).pay_status, 'approved');
});
t('student delete cascades, keeps camp record, trashes avatar', () => {
  const me = ok(call('me', {}, adminTok));
  assert.equal(call('admin.student.delete', { user_id: me.user_id }, adminTok).error, 'BAD_INPUT');
  const poom = ok(call('admin.students', {}, adminTok)).rows.find(x => x.email === 'poom@test.com');
  ok(call('admin.user.update', { user_id: poom.user_id, role: 'admin' }, adminTok));
  assert.equal(call('admin.student.delete', { user_id: poom.user_id }, adminTok).error, 'BAD_INPUT');
  ok(call('admin.user.update', { user_id: poom.user_id, role: 'student' }, adminTok));
  const av = ok(call('admin.students', {}, adminTok)).rows.find(x => x.user_id === manualId).avatar_url;
  ok(call('admin.student.delete', { user_id: manualId }, adminTok));
  assert.equal(M.trashed[av.match(/id=([\w-]+)/)[1]], true);
  assert(!ok(call('admin.students', {}, adminTok)).rows.some(x => x.user_id === manualId));
  assert.equal(call('login', { email: 'chai@test.com', password: 'chai12345' }).error, 'BAD_LOGIN');
  assert(!ok(call('admin.enrollments', { status: 'approved' }, adminTok)).some(e => e.enroll_id === manualEid));
  assert.equal(ok(call('admin.camp', {}, adminTok)).rows.find(x => x.name === 'สมชาย ใจดี').user_id, '');
  assert.equal(call('admin.student.delete', { user_id: manualId }, adminTok).error, 'NOT_FOUND');
});
t('students import (JSON from the old system)', () => {
  const r = ok(call('admin.students.import', { rows: [
    { ชื่อ: 'นภา ดวงดี', ชื่อเล่น: 'ฟ้า', ชั้น: 'ม.5', โรงเรียน: 'สตรี', คอร์ส: 'ชีววิทยา สอวน.', ยอดโอน: 690, สถานะชำระเงิน: 'ชำระแล้ว', เบอร์โทร: '081-111-2222', อีเมล: 'fah@test.com', บันทึก: 'VIP' },
    { ชื่อ: 'ต้น', ชื่อเล่น: '-', ชั้น: '-', โรงเรียน: '-', คอร์ส: 'คอร์สที่ไม่มีแล้ว', ยอดโอน: 0, สถานะชำระเงิน: 'ยังไม่ชำระ', เบอร์โทร: '-', อีเมล: '-', บันทึก: '' },
    { ชื่อ: 'ซ้ำ', อีเมล: stu.email }, { ชื่อ: '' }, { ชื่อ: 'เบอร์ผิด', เบอร์โทร: '12', อีเมล: 'not-an-email' }
  ] }, adminTok));
  assert.deepEqual(r, { added: 3, enrolled: 1, skipped: 2, unmatched_courses: ['คอร์สที่ไม่มีแล้ว'] });
  const rows = ok(call('admin.students', {}, adminTok)).rows;
  const fah = rows.find(x => x.email === 'fah@test.com');
  assert.equal(fah.pay_status, 'approved'); assert.equal(fah.amount, 690); assert.equal(fah.phone, '0811112222'); assert.equal(fah.last_name, 'ดวงดี'); assert.equal(fah.note, 'VIP');
  const ton = rows.find(x => x.first_name === 'ต้น');
  assert.equal(ton.no_email, true); assert.equal(ton.course_id, ''); assert.equal(ton.note, 'คอร์สเดิม: คอร์สที่ไม่มีแล้ว'); assert.equal(ton.nickname, 'ต้น'); assert.equal(ton.grade, '');
  assert.equal(rows.find(x => x.first_name === 'เบอร์ผิด').phone, '');
});
t('add a course to an existing student (incl. one without email)', () => {
  const r = ok(call('admin.students', {}, adminTok));
  assert.equal(r.camp.centers.length, 17);
  const ton = r.rows.find(x => x.first_name === 'ต้น'), mails = M.outbox.length;
  ok(call('admin.student.enroll', { user_id: ton.user_id, course_id: cid, amount: 500 }, adminTok));
  assert.equal(M.outbox.length, mails, 'placeholder address gets no email');
  const row = ok(call('admin.students', {}, adminTok)).rows.find(x => x.user_id === ton.user_id && x.course_id === cid);
  assert.equal(row.pay_status, 'approved'); assert.equal(row.amount, 500);
  assert.equal(call('admin.student.enroll', { user_id: ton.user_id, course_id: cid }, adminTok).error, 'ALREADY');
  assert.equal(call('admin.student.enroll', { user_id: ton.user_id, course_id: 'NOPE' }, adminTok).error, 'NOT_FOUND');
  assert.equal(call('admin.grant', { email: ton.email, course_id: cid }, adminTok).error, 'ALREADY');
  assert.equal(call('admin.student.enroll', { user_id: ton.user_id, course_id: cid }, stuTok, 'laptop').error, 'FORBIDDEN');
});
t('POSN camp tracking: add, partial edit, import append/replace, delete', () => {
  const a = ok(call('admin.camp.save', { name: 'สุรพงษ์ เตี้ยเนตร', nickname: 'แนบฝัน', grade: 'ม.3', subject: 'ชีวะ', center: 'ม.ศิลปากร', result: 'ผ่านค่าย 1' }, adminTok));
  assert.equal(a.result, 'ผ่านค่าย 1');
  const up = ok(call('admin.camp.save', { camp_id: a.camp_id, result: 'ตัวสำรอง' }, adminTok));
  assert.equal(up.result, 'ตัวสำรอง'); assert.equal(up.center, 'ม.ศิลปากร'); assert.equal(up.nickname, 'แนบฝัน');
  assert.equal(ok(call('admin.camp.save', { camp_id: a.camp_id, notes: 'สอบเพิ่ม' }, adminTok)).notes, 'สอบเพิ่ม');
  assert.equal(ok(call('admin.camp.save', { camp_id: a.camp_id, result: 'มั่ว' }, adminTok)).result, 'ยังไม่ทราบผล');
  assert.equal(call('admin.camp.save', { name: '' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.camp.save', { camp_id: a.camp_id, name: '' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.camp.save', { camp_id: 'NOPE', notes: 'x' }, adminTok).error, 'NOT_FOUND');
  const meta = ok(call('admin.camp', {}, adminTok));
  assert.equal(meta.centers.length, 17); assert.deepEqual(meta.results, ['ยังไม่ทราบผล', 'ผ่านค่าย 1', 'ตัวสำรอง', 'ไม่ผ่าน']);
  const n0 = meta.rows.length;
  const imp = ok(call('admin.camp.import', { mode: 'append', rows: [
    { ชื่อ: 'ก', ชื่อเล่น: 'เอ', ชั้น: 'ม.2', วิชา: 'เคมี', ศูนย์: 'ม.มหิดล', ผลค่าย1: 'ไม่ผ่าน', บันทึก: 'x' }, { name: 'ข', camp1Result: 'ผ่านค่าย 1' }, { ชื่อ: '-' }] }, adminTok));
  assert.deepEqual(imp, { imported: 2, total: n0 + 2 });
  const b = ok(call('admin.camp', {}, adminTok)).rows.find(x => x.name === 'ข');
  assert.equal(b.result, 'ผ่านค่าย 1'); assert.equal(b.center, 'ยังไม่ระบุ'); assert.equal(b.subject, 'ชีวะ');
  assert.equal(ok(call('admin.camp.import', { mode: 'replace', rows: [{ ชื่อ: 'ใหม่' }] }, adminTok)).total, 1);
  ok(call('admin.camp.save', { name: 'หลังแทนที่' }, adminTok));
  const rows = ok(call('admin.camp', {}, adminTok)).rows;
  assert.deepEqual(rows.map(x => x.name).sort(), ['ใหม่', 'หลังแทนที่'].sort());
  ok(call('admin.camp.delete', { camp_id: rows[0].camp_id }, adminTok));
  assert.equal(ok(call('admin.camp', {}, adminTok)).rows.length, 1);
  assert.equal(call('admin.camp', {}, stuTok, 'laptop').error, 'FORBIDDEN');
  assert.equal(call('admin.camp.import', { mode: 'replace', rows: [] }, stuTok, 'laptop').error, 'FORBIDDEN');
});
t('Design Studio blocks: validate, publish/hide, reorder, public cache', () => {
  const a = ok(call('admin.block.save', { type: 'banner', heading: 'เปิดรอบใหม่', bg: '#123ABC', fg: 'red' }, adminTok));
  const b = ok(call('admin.block.save', { type: 'course', heading: 'คอร์ส สอวน.', sub: '790 บาท', image_url: 'https://drive.google.com/thumbnail?id=x', link_url: '#/course/BIO-POSN' }, adminTok));
  ok(call('admin.block.save', { type: 'feature', heading: 'ซ่อนไว้', status: 'hidden' }, adminTok));
  assert.equal(call('admin.block.save', { type: 'popup', heading: 'x' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.block.save', { type: 'hero', heading: '' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.block.save', { type: 'hero', heading: 'x', link_url: 'javascript:alert(1)' }, adminTok).error, 'BAD_INPUT');
  assert.equal(call('admin.block.save', { type: 'hero', heading: 'x', image_url: 'http://x' }, adminTok).error, 'BAD_INPUT');
  let pub = ok(call('blocks.list'));
  assert.equal(pub.length, 2); assert.equal(pub[0].bg, '#123abc'); assert.equal(pub[0].fg, '#ffffff');
  ok(call('admin.blocks.reorder', { order: [b.block_id, a.block_id] }, adminTok));
  assert.equal(ok(call('blocks.list'))[0].block_id, b.block_id);
  ok(call('admin.block.save', { block_id: a.block_id, type: 'banner', heading: 'แก้แล้ว', status: 'hidden' }, adminTok));
  assert.equal(ok(call('blocks.list')).length, 1);
  assert.equal(ok(call('admin.blocks', {}, adminTok)).length, 3);
  ok(call('admin.block.delete', { block_id: b.block_id }, adminTok));
  assert.equal(ok(call('blocks.list')).length, 0);
  assert.equal(call('admin.block.save', { type: 'hero', heading: 'x' }, stuTok, 'laptop').error, 'FORBIDDEN');
});
t('upgrade from older sheet: missing tabs and columns are added on demand', () => {
  const db = M.db();
  db.sheets = db.sheets.filter(s => s.name !== 'Blocks'); delete M.cache.pub_blocks;
  assert.deepEqual(ok(call('blocks.list')), []);
  assert(db.getSheetByName('Blocks'));
  const users = db.getSheetByName('Users'), w = users.rows[0].indexOf('avatar_url');
  users.rows.forEach(r => r.splice(w));
  assert.equal(ok(call('me', {}, stuTok, 'laptop')).avatar_url, '');
  const u = ok(call('profile.avatar', { mime: 'image/png', base64: 'CCCC' }, stuTok, 'laptop'));
  assert.equal(ok(call('me', {}, stuTok, 'laptop')).avatar_url, u.avatar_url);
  assert(users.rows[0].includes('admin_note'));
});
t('logout', () => { ok(call('logout', {}, adminTok)); assert.equal(call('me', {}, adminTok).error, 'AUTH'); });
t('unknown action', () => assert.equal(call('drop.tables').error, 'BAD_ACTION'));
console.log(`\n${n} tests passed`);

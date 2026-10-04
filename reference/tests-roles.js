// ทดสอบ: ยศผู้สอน · การเงิน · นักเรียนรุ่นเก่า · ดึงคลิปจากเพลย์ลิสต์
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
const base = { photo: PH, accept_data: true, accept_terms: true, password: 'secret123', school: 'โรงเรียนตัวอย่าง', grade: 'ม.5', phone: '0800000000',
  dream_faculty: 'แพทยศาสตร์', dream_university: 'มหิดล', birthday: '2009-01-01', line_id: 'x' };
const reg = (email, first, last, nick, dev) => { ok(call('register.start', { ...base, email, first_name: first, last_name: last, nickname: nick || first })); return ok(call('register.verify', { email, otp: lastOtp() }, null, dev || email)); };

ctx.setup();
const A = reg('admin@x.com', 'แอด', 'มิน', 'แอดมิน'); run("makeAdmin('admin@x.com')");
const adm = A.token;
run("setupCourses('https://x/', false)");
const courses = ok(call('admin.courses', {}, adm));
const BIO = courses.find(c => c.subject === 'bio').course_id, CHEM = courses.find(c => c.subject === 'chem').course_id, PHYS = courses.find(c => c.subject === 'phys').course_id;
run("read_('Courses').forEach(function(c){ update_('Courses', c._row, { status: 'published', price: c.subject === 'math' ? '490' : '1000' }); }); cache_().remove('pub_courses'); cache_().remove('pub_bundles');");
const chemT = reg('chem@x.com', 'ครู', 'เคมี', 'พี่เคมี'), physT = reg('phys@x.com', 'ครู', 'ฟิสิกส์', 'พี่ฟิสิกส์');
const mathA = reg('ma@x.com', 'ครู', 'คณิตเอ', 'พี่เอ'), mathB = reg('mb@x.com', 'ครู', 'คณิตบี', 'พี่บี');
let chem, phys, ma, mb;
const login = (e, d) => ok(call('login', { email: e, password: 'secret123' }, null, d || e)).token;

t('admin sets teacher roles', () => {
  no(call('admin.user.update', { user_id: chemT.user.user_id, role: 'teacher', subjects: [] }, adm), 'BAD_INPUT');
  ok(call('admin.user.update', { user_id: chemT.user.user_id, role: 'teacher', subjects: ['chem'] }, adm));
  ok(call('admin.user.update', { user_id: physT.user.user_id, role: 'teacher', subjects: 'phys' }, adm));
  ok(call('admin.user.update', { user_id: mathA.user.user_id, role: 'teacher', subjects: ['math'] }, adm));
  ok(call('admin.user.update', { user_id: mathB.user.user_id, role: 'teacher', subjects: ['math'] }, adm));
  no(call('admin.courses', {}, chemT.token), 'AUTH'); // เปลี่ยนยศแล้วต้องเข้าสู่ระบบใหม่
  chem = login('chem@x.com'); phys = login('phys@x.com'); ma = login('ma@x.com'); mb = login('mb@x.com');
  assert.deepEqual(ok(call('me', {}, chem, 'chem@x.com')).subjects, ['chem']);
});

const C = (a, d, tok, dev) => call(a, d, tok, dev);
t('teacher sees only own subject', () => {
  const list = ok(C('admin.courses', {}, chem, 'chem@x.com'));
  assert(list.length >= 1 && list.every(c => c.subject === 'chem'));
  no(C('admin.lessons', { course_id: BIO }, chem, 'chem@x.com'), 'FORBIDDEN');
  ok(C('admin.lessons', { course_id: CHEM }, chem, 'chem@x.com'));
  const st = ok(C('admin.stats', {}, chem, 'chem@x.com'));
  assert.equal(st.teacher, true); assert.equal(st.users_total, undefined); assert.deepEqual(st.subjects, ['chem']);
});
t('teacher blocked from admin-only areas', () => {
  const d = 'chem@x.com';
  ['admin.users', 'admin.accounts', 'admin.coupons', 'admin.settings', 'admin.log', 'admin.legacy', 'fin.rules', 'admin.enrollments'].forEach(a => no(C(a, {}, chem, d), 'FORBIDDEN'));
  no(C('admin.account.save', { label: 'x', account_name: 'x', promptpay_id: '0800000000' }, chem, d), 'FORBIDDEN');
  no(C('admin.bill.decide', { bill_id: 'x', decision: 'approve' }, chem, d), 'FORBIDDEN');
  no(C('admin.bundle.save', { title: 'x' }, chem, d), 'FORBIDDEN');
  no(C('admin.user.update', { user_id: chemT.user.user_id, role: 'admin' }, chem, d), 'FORBIDDEN');
  no(C('fin.close', { period: '2026-01' }, chem, d), 'FORBIDDEN');
  const stu = reg('s0@x.com', 'นักเรียน', 'ศูนย์');
  no(C('admin.courses', {}, stu.token, 's0@x.com'), 'FORBIDDEN');
});
t('teacher edits content but not price/status/subject', () => {
  const d = 'chem@x.com';
  const c = ok(C('admin.courses', {}, chem, d)).find(x => x.course_id === CHEM);
  ok(C('admin.course.save', { ...c, course_id: CHEM, title: 'เคมีใหม่', price: 1, status: 'draft', subject: 'bio', pay_account_id: 'HACK', sort_order: -9 }, chem, d));
  const after = ok(call('admin.courses', {}, adm)).find(x => x.course_id === CHEM);
  assert.equal(after.title, 'เคมีใหม่'); assert.equal(after.price, 1000); assert.equal(after.status, 'published'); assert.equal(after.subject, 'chem'); assert.equal(after.pay_account_id, '');
  no(C('admin.course.save', { ...c, course_id: BIO, title: 'x' }, chem, d), 'FORBIDDEN');
  no(C('admin.course.save', { subject: 'chem', title: 'ใหม่', price: 10 }, chem, d), 'FORBIDDEN');
  const L = ok(C('admin.lesson.save', { course_id: CHEM, chapter: 'บท 1', title: 'ตอน 1', youtube: 'abcdefghijk' }, chem, d));
  no(C('admin.lesson.save', { course_id: BIO, chapter: 'x', title: 'x', youtube: 'abcdefghijk' }, chem, d), 'FORBIDDEN');
  const bioL = ok(call('admin.lesson.save', { course_id: BIO, chapter: 'x', title: 'x', youtube: 'bbbbbbbbbbb' }, adm));
  no(C('admin.lesson.save', { lesson_id: bioL.lesson_id, chapter: 'x', title: 'แก้', youtube: 'bbbbbbbbbbb' }, chem, d), 'FORBIDDEN');
  no(C('admin.lesson.delete', { lesson_id: bioL.lesson_id }, chem, d), 'FORBIDDEN');
  no(C('admin.lessons.bulk', { course_id: BIO, items: [{ chapter: 'x', title: 'y', youtube: 'ccccccccccc' }] }, chem, d), 'FORBIDDEN');
  ok(C('admin.lesson.delete', { lesson_id: L.lesson_id }, chem, d));
  const log = ok(call('admin.log', { teachers_only: true }, adm));
  assert(log.some(r => r.action === 'course.edit' && r.who === 'พี่เคมี'));
});

let s1;
t('grants: free, test, expiry, revoke, preview', () => {
  s1 = reg('s1@x.com', 'สมชาย', 'เรียนดี');
  const d = 'chem@x.com';
  no(C('admin.grant', { course_id: BIO, emails: 's1@x.com' }, chem, d), 'FORBIDDEN');
  const g = ok(C('admin.grant', { course_id: CHEM, emails: 's1@x.com, nobody@x.com', amount: 999, note: 'ทุนเรียน' }, chem, d));
  assert.deepEqual(g.added, ['s1@x.com']); assert.equal(g.skipped[0].why, 'ยังไม่ได้สมัครสมาชิก');
  let list = ok(C('staff.course.students', { course_id: CHEM }, chem, d));
  const row = list.find(r => r.user_id === s1.user.user_id);
  assert.equal(row.source, 'grant'); assert.equal(row.amount, null); assert.equal(row.email, ''); assert.equal(row.reason, 'ทุนเรียน');
  assert(ok(call('learn.get', { course_id: CHEM }, s1.token, 's1@x.com')));
  // ครูไม่ได้เพิ่มรายได้ (amount ถูกบังคับเป็น 0)
  const e = run(`read_('Enrollments').filter(function(e){return e.user_id==='${s1.user.user_id}'})[0]`);
  assert.equal(e.amount, '0');
  ok(C('staff.revoke', { enroll_id: row.enroll_id }, chem, d));
  no(call('learn.get', { course_id: CHEM }, s1.token, 's1@x.com'), 'NO_ACCESS');
  // หมดอายุ
  ok(call('admin.grant', { course_id: BIO, email: 's1@x.com', expires_at: '2020-01-01' }, adm));
  no(call('learn.get', { course_id: BIO }, s1.token, 's1@x.com'), 'NO_ACCESS');
  assert.equal(ok(call('my.courses', {}, s1.token, 's1@x.com')).length, 0);
  assert.equal(ok(call('cart.quote', { course_ids: [BIO] }, s1.token, 's1@x.com')).items[0].blocked, '');
  // ดูแบบนักเรียน: ครูเข้าห้องเรียนวิชาตัวเองได้ ไม่บันทึกความคืบหน้า
  const pv = ok(C('learn.get', { course_id: CHEM }, chem, d)); assert.equal(pv.preview, true);
  no(C('learn.get', { course_id: BIO }, chem, d), 'NO_ACCESS');
  // ให้ตัวเองเพื่อทดสอบ → source test ไม่นับเงิน
  ok(C('admin.grant', { course_id: CHEM, emails: 'chem@x.com' }, chem, d));
  assert.equal(ok(C('staff.course.students', { course_id: CHEM }, chem, d)).find(r => r.user_id === chemT.user.user_id).source, 'test');
  assert.equal(ok(C('learn.get', { course_id: CHEM }, chem, d)).preview, false);
});

t('teacher sees own-subject bills without contact data, cannot decide', () => {
  const b = reg('buyer@x.com', 'ผู้ซื้อ', 'ทดลอง');
  ok(call('order.create', { course_ids: [CHEM, BIO], accept_pay_terms: true }, b.token, 'buyer@x.com'));
  const bills = ok(C('admin.bills', { status: 'all' }, chem, 'chem@x.com'));
  assert.equal(bills.length, 1); assert(bills[0].items.every(i => i.subject === 'chem')); assert.equal(bills[0].phone, ''); assert.equal(bills[0].can_decide, false);
  assert.equal(ok(C('admin.bills', { status: 'all' }, phys, 'phys@x.com')).length, 0);
});

// ── การเงิน ──
const P = (() => { const d = new Date(Date.now() + 7 * 36e5).toISOString(); return d.slice(0, 7) + (Number(d.slice(8, 10)) <= 15 ? '-1' : '-2'); })();
const today = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const adminId = () => A.user.user_id;
t('finance: half-month periods, no platform fee, subject splits with date, held money', () => {
  const acc = ok(call('admin.account.save', { label: 'บัญชีครูฟิสิกส์', method: 'promptpay', promptpay_id: '0811111111', account_name: 'ครู', subjects: 'phys', owner_id: physT.user.user_id }, adm));
  no(call('admin.account.save', { label: 'x', method: 'promptpay', promptpay_id: '0811111111', account_name: 'x', owner_id: s1.user.user_id }, adm), 'BAD_INPUT');
  no(call('fin.rules.save', { splits: [{ course_id: 'MATH-M6-T1', split: [{ user_id: mathA.user.user_id, pct: 60 }, { user_id: mathB.user.user_id, pct: 30 }] }] }, adm), 'BAD_INPUT');
  ok(call('fin.rules.save', { splits: [{ course_id: 'MATH-M4-T1', split: [{ user_id: mathA.user.user_id, pct: 100 }] }, { course_id: 'MATH-M6-T1', split: [{ user_id: mathA.user.user_id, pct: 60 }, { user_id: mathB.user.user_id, pct: 40 }] }] }, adm));
  const buy = (email, ids) => { const u = reg(email, 'ผู้ซื้อ' + email[0], 'นามสกุล' + email[0]); ok(call('order.create', { course_ids: ids, accept_pay_terms: true }, u.token, email)); return ok(call('my.orders', {}, u.token, email))[0].bills; };
  const bs = [].concat(buy('p1@x.com', [PHYS]), buy('c1@x.com', [CHEM]), buy('m1@x.com', ['MATH-M4-T1']), buy('m6@x.com', ['MATH-M6-T1']));
  bs.forEach(b => ok(call('admin.bill.decide', { bill_id: b.bill_id, decision: 'approve' }, adm)));
  no(C('fin.expense.save', { date: today, subject: 'bio', amount: 50 }, chem, 'chem@x.com'), 'FORBIDDEN');
  const ex = ok(C('fin.expense.save', { date: today, subject: 'chem', category: 'โฆษณา', amount: 200, note: 'ยิงแอด' }, chem, 'chem@x.com'));
  ok(call('fin.expense.save', { date: today, subject: '', category: 'ซอฟต์แวร์/โดเมน', amount: 100 }, adm));
  let s = ok(call('fin.summary', { period: P }, adm));
  assert.equal(s.period, P); assert(/^(1–15|16–\d\d) /.test(s.label));
  assert.equal(s.by_subject.find(x => x.subject === 'chem').expense, 0);
  no(call('fin.close', { period: P }, adm), 'BAD_INPUT');
  ok(call('fin.expense.decide', { expense_id: ex.expense_id, decision: 'approve' }, adm));
  s = ok(call('fin.summary', { period: P }, adm));
  const byS = k => s.by_subject.find(x => x.subject === k), pay = (k, id) => s.pays.find(x => x.subject === k && x.user_id === id);
  assert.equal(byS('chem').pool, 800); assert.equal(byS('chem').platform, 0); // ไม่มีค่าแพลตฟอร์ม หักรายจ่ายวิชา
  assert.equal(pay('chem', chemT.user.user_id).settle, 800);
  assert.equal(pay('phys', physT.user.user_id).held, 1000); assert.equal(pay('phys', physT.user.user_id).settle, 0);
  assert.equal(pay('math', mathA.user.user_id).share, 490 + 294); assert.equal(pay('math', mathB.user.user_id).share, 196);
  assert.equal(s.totals.income, 2980); assert.equal(s.totals.shared, 100);
  // เจ้าของตั้งสัดส่วนเคมีเอง มีผลตั้งแต่วันนี้: ครูเคมี 70 เจ้าของ 30
  no(call('fin.splits.save', { subject: 'chem', from: today, parts: [{ user_id: chemT.user.user_id, pct: 70 }] }, adm), 'BAD_INPUT');
  no(C('fin.splits.save', { subject: 'chem', from: today, parts: [] }, chem, 'chem@x.com'), 'FORBIDDEN');
  ok(call('fin.splits.save', { subject: 'chem', from: today, parts: [{ user_id: chemT.user.user_id, pct: 70 }, { user_id: adminId(), pct: 30 }] }, adm));
  // สัดส่วนที่เริ่มพรุ่งนี้ ไม่กระทบยอดวันนี้
  const tmr = new Date(Date.now() + 31 * 36e5).toISOString().slice(0, 10);
  ok(call('fin.splits.save', { subject: 'chem', from: tmr, parts: [{ user_id: chemT.user.user_id, pct: 100 }] }, adm));
  s = ok(call('fin.summary', { period: P }, adm));
  assert.equal(pay('chem', chemT.user.user_id).share, 560); assert.equal(pay('chem', adminId()).share, 240);
  // ครูเห็นเฉพาะของตัวเอง
  const cs = ok(C('fin.summary', { period: P }, chem, 'chem@x.com'));
  assert(cs.income.every(x => x.subject === 'chem')); assert.equal(cs.pays.length, 1); assert.equal(cs.totals.income, 1000);
  assert.equal(cs.profiles[chemT.user.user_id].name, 'พี่เคมี');
  // ปิดงวด → รายการโอนแยกวิชา × คน
  const closed = ok(call('fin.close', { period: P }, adm));
  assert.equal(closed.closed, true); assert.equal(closed.payouts.length, 5);
  // ปิดยอดแล้ว รายจ่ายที่ลงทีหลัง (วันที่อยู่ในงวดที่ปิด) ยกไปงวดถัดไปเอง ไม่ถูกล็อก
  const late = ok(call('fin.expense.save', { date: today, subject: 'chem', amount: 10, note: 'ลงหลังปิดยอด' }, adm));
  assert(!ok(call('fin.summary', { period: P }, adm)).expenses.some(x => x.expense_id === late.expense_id));
  const nx = ok(call('fin.summary', {}, adm)); assert.notEqual(nx.period, P); assert.equal(nx.expenses.find(x => x.expense_id === late.expense_id).rolled_from, P);
  ok(call('fin.expense.delete', { expense_id: late.expense_id }, adm));
  const po = closed.payouts.find(x => x.user_id === chemT.user.user_id);
  assert.equal(po.subject, 'chem'); assert.equal(po.amount, 560);
  no(call('fin.payout.pay', { payout_id: po.payout_id }, adm), 'BAD_INPUT');
  const before = M.outbox.length;
  ok(call('fin.payout.pay', { payout_id: po.payout_id, slip: PH, note: 'KBank 1234' }, adm));
  const mail = M.outbox[M.outbox.length - 1]; assert.equal(M.outbox.length, before + 1); assert.equal(mail.to, 'chem@x.com'); assert.equal(mail.attachments.length, 1); assert(/560/.test(mail.subject));
  no(call('fin.payout.pay', { payout_id: po.payout_id, slip: PH }, adm), 'ALREADY');
  no(call('fin.reopen', { period: P }, adm), 'LOCKED');
  const mine = ok(C('fin.summary', { period: P }, chem, 'chem@x.com'));
  assert.equal(mine.payouts.length, 1); assert.equal(mine.payouts[0].has_slip, true);
  ok(C('fin.payout.slip', { payout_id: po.payout_id }, chem, 'chem@x.com'));
  no(C('fin.payout.slip', { payout_id: po.payout_id }, phys, 'phys@x.com'), 'FORBIDDEN');
});

t('teacher profiles: auto from role, edit, used on course pages', () => {
  let pr = ok(C('teacher.profile', {}, chem, 'chem@x.com'));
  assert.equal(pr.display_name, 'พี่เคมี'); assert.equal(pr.auto, true);
  no(C('teacher.profile.save', { display_name: 'พี่เคมี', photo_url: 'javascript:x' }, chem, 'chem@x.com'), 'BAD_INPUT');
  pr = ok(C('teacher.profile.save', { display_name: 'พี่หมีลี่', title: 'สหเวช จุฬาฯ', bio: ['A-Level เคมี 87.5', '', 'TBAT 730'], photo_url: 'https://x/meely.jpg', bank_name: 'กสิกรไทย', account_name: 'วรานนท์', account_no: '012-3-45678-9' }, chem, 'chem@x.com'));
  assert.deepEqual(pr.bio, ['A-Level เคมี 87.5', 'TBAT 730']);
  // ครูแก้โปรไฟล์คนอื่นไม่ได้ (ได้ของตัวเองเสมอ)
  const other = ok(C('teacher.profile', { user_id: physT.user.user_id }, chem, 'chem@x.com'));
  assert.equal(other.user_id, chemT.user.user_id);
  const list = ok(call('admin.teachers', {}, adm));
  assert(list.find(x => x.user_id === chemT.user.user_id).has_bank);
  no(C('admin.teachers', {}, chem, 'chem@x.com'), 'FORBIDDEN');
  // ผูกคอร์สกับโปรไฟล์ → หน้าคอร์สและการ์ดใช้ชื่อและรูปจากโปรไฟล์
  const c = ok(call('admin.courses', {}, adm)).find(x => x.course_id === CHEM);
  ok(call('admin.course.save', Object.assign({}, c, { teacher_ids: [chemT.user.user_id, 'nope'] }), adm));
  const d = ok(call('course.detail', { course_id: CHEM }));
  assert.equal(d.instructors.length, 1); assert.equal(d.instructors[0].name, 'พี่หมีลี่'); assert.equal(d.instructors[0].photo, 'https://x/meely.jpg'); assert(/TBAT/.test(d.instructors[0].bio));
  assert.equal(ok(call('courses.list', {})).find(x => x.course_id === CHEM).teachers[0].photo, 'https://x/meely.jpg');
  // ครูเปลี่ยนผู้สอนของคอร์สเองไม่ได้
  ok(C('admin.course.save', Object.assign({}, c, { teacher_ids: [] }), chem, 'chem@x.com'));
  assert.equal(ok(call('course.detail', { course_id: CHEM })).instructors[0].name, 'พี่หมีลี่');
});

t('team: multi-role, per-course ticks, other parts (not teachers), invite email with status', () => {
  const NX = new Date(Date.now() + (7 + 17 * 24) * 36e5).toISOString().slice(0, 10);
  const nt = reg('newt@x.com', 'ครู', 'ใหม่', 'พี่ใหม่');
  const before = M.outbox.length;
  no(call('admin.team.add', { email: 'nobody@x.com', subject: 'phys', from: NX }, adm), 'NOT_FOUND');
  const r = ok(call('admin.team.add', { email: 'newt@x.com', subject: 'phys', from: NX }, adm));
  assert.equal(r.invite.ok, true); assert.equal(M.outbox.length, before + 1);
  const mail = M.outbox[M.outbox.length - 1];
  assert(/tprofile/.test(mail.htmlBody)); assert(/ยังขาด/.test(mail.htmlBody)); assert(/ฟิสิกส์/.test(mail.subject));
  no(call('admin.team.add', { email: 'newt@x.com', subject: 'phys', from: NX }, adm), 'ALREADY');
  no(C('admin.team.add', { email: 'newt@x.com', subject: 'chem', from: NX }, chem, 'chem@x.com'), 'FORBIDDEN');
  // ต้องล็อกอินใหม่ แล้วต้องกรอกโปรไฟล์ให้ครบ
  const nts = login('newt@x.com');
  assert.deepEqual(ok(call('me', {}, nts, 'newt@x.com')).profile_todo, ['name', 'photo', 'bank']);
  // ดูตัวอย่างอีเมล (ไม่ส่งจริง) · ส่งอีกครั้ง · ส่งไม่สำเร็จต้องบอกและบันทึกไว้
  const n0 = M.outbox.length;
  const pv = ok(call('admin.teacher.invite', { user_id: nt.user.user_id, preview: true }, adm));
  assert(/กรอกโปรไฟล์ผู้สอน/.test(pv.html)); assert.equal(pv.to, 'newt@x.com'); assert.equal(M.outbox.length, n0);
  assert.equal(ok(call('admin.teacher.invite', { user_id: nt.user.user_id }, adm)).ok, true); assert.equal(M.outbox.length, n0 + 1);
  run('var __q = MailApp.getRemainingDailyQuota; MailApp.getRemainingDailyQuota = function () { return 0; };');
  const bad = ok(call('admin.teacher.invite', { user_id: nt.user.user_id }, adm));
  assert.equal(bad.ok, false); assert(bad.error);
  assert(ok(call('admin.teachers', {}, adm)).find(x => x.user_id === nt.user.user_id).invite_error);
  run('MailApp.getRemainingDailyQuota = __q;');
  ok(call('admin.teacher.invite', { user_id: nt.user.user_id }, adm));
  const tl = ok(call('admin.teachers', {}, adm)).find(x => x.user_id === nt.user.user_id);
  assert.equal(tl.invite_error, ''); assert(tl.invited_at); assert.deepEqual(tl.profile_todo, ['name', 'photo', 'bank']);
  ok(call('teacher.profile.save', { display_name: 'พี่ใหม่', photo_url: 'https://x/a.jpg', bank_name: 'กสิกร', account_name: 'ครู ใหม่', account_no: '1234567890' }, nts, 'newt@x.com'));
  assert.deepEqual(ok(call('me', {}, nts, 'newt@x.com')).profile_todo, []);
  // ยศหลายยศพร้อมกัน: แอดมิน + ผู้สอนชีวะ
  const both = reg('both@x.com', 'ทั้ง', 'สอง', 'พี่สอง');
  const ru = ok(call('admin.user.update', { user_id: both.user.user_id, roles: ['admin', 'teacher'], subjects: ['bio'] }, adm));
  assert.equal(ru.invite.ok, true);
  let bs = login('both@x.com'), me = ok(call('me', {}, bs, 'both@x.com'));
  assert.deepEqual(me.roles, ['admin', 'teacher']); assert.equal(me.role, 'admin'); assert.deepEqual(me.subjects, ['bio']);
  ok(call('admin.users', { q: '' }, bs, 'both@x.com'));
  assert(ok(call('admin.teachers', {}, adm)).find(x => x.user_id === both.user.user_id).subjects.indexOf('bio') >= 0);
  ok(call('admin.user.update', { user_id: both.user.user_id, roles: ['admin'] }, adm));
  bs = login('both@x.com'); me = ok(call('me', {}, bs, 'both@x.com'));
  assert.deepEqual(me.roles, ['admin']); assert.deepEqual(me.subjects, []); assert.deepEqual(me.profile_todo, []);
  ok(call('admin.user.update', { user_id: both.user.user_id, roles: [] }, adm));
  assert.equal(ok(call('login', { email: 'both@x.com', password: 'secret123' }, null, 'both2')).user.role, 'student');
  // ติ๊กแยกคอร์ส: ผู้สอนได้ 70% ที่เหลือ 30% เป็นค่าหลังบ้าน (ไม่ใช่ผู้สอน ไม่ต้องมียศ)
  const MC = courses.filter(c => c.subject === 'math').map(c => c.course_id), A_ = mathA.user.user_id, B_ = mathB.user.user_id;
  no(call('fin.splits.save', { subject: 'math', from: NX, others: [{ label: 'ค่าหลังบ้าน', pct: 30 }], courses: { [MC[0]]: [{ user_id: A_, pct: 80 }] } }, adm), 'BAD_INPUT');
  no(call('fin.splits.save', { subject: 'math', from: NX, others: [{ label: '', pct: 30 }], courses: {} }, adm), 'BAD_INPUT');
  no(call('fin.splits.save', { subject: 'math', from: NX, others: [], courses: { [MC[0]]: [{ user_id: nt.user.user_id === 'x' ? '' : 'U_STUDENT', pct: 100 }] } }, adm), 'BAD_INPUT');
  const sv = ok(call('fin.splits.save', { subject: 'math', from: NX, others: [{ label: 'ค่าหลังบ้าน', pct: 30 }], courses: { [MC[0]]: [{ user_id: A_, pct: 70 }], [MC[1]]: [{ user_id: A_, pct: 35 }, { user_id: B_, pct: 35 }] } }, adm));
  assert(sv.courses.length >= MC.length);
  const sf = (cid) => JSON.parse(run(`JSON.stringify(splitFor_(findOne_('Courses', function (c) { return c.course_id === '${cid}'; }), '${NX}T12:00:00+07:00', teachersAll_()))`));
  let s0 = sf(MC[0]); assert.deepEqual(s0.parts.map(x => [x.user_id, Math.round(x.w * 100)]), [[A_, 70], ['o:ค่าหลังบ้าน', 30]]);
  assert.equal(sf(MC[2]).parts.length, 0); // ไม่ได้ติ๊ก = ยังไม่มีผู้รับ
  // เพิ่มพี่บีเข้าคอร์สแรก → ผู้สอนในคอร์สนั้นแบ่ง 70% เท่ากัน ค่าหลังบ้านคงเดิม
  ok(call('admin.team.add', { user_id: B_, subject: 'math', from: NX, course_ids: [MC[0]] }, adm));
  let v = ok(call('fin.splits', {}, adm)).splits.math.find(x => x.from === NX);
  assert.deepEqual(v.courses[MC[0]].map(x => x.pct), [35, 35]); assert.equal(v.others[0].pct, 30);
  // เงินจริง: ขายคอร์สแรก ฿1000 → พี่เอ 350 พี่บี 350 ค่าหลังบ้าน 300 เข้าสถาบัน
  run(`append_('Enrollments', { enroll_id: 'EMX1', user_id: '${nt.user.user_id}', course_id: '${MC[0]}', status: 'approved', amount: '1000', source: 'bill', created_at: '${NX}T05:00:00.000Z', decided_at: '${NX}T05:00:00.000Z' })`);
  const f = JSON.parse(run(`JSON.stringify(finCompute_(periodOf_('${NX}T12:00:00+07:00')))`));
  const bm = f.by_subject.find(x => x.subject === 'math');
  assert.equal(bm.pool_all, 1000); assert.equal(bm.kept, 300); assert.equal(bm.pool, 700); assert.equal(bm.others[0].label, 'ค่าหลังบ้าน');
  const pm = f.pays.filter(x => x.subject === 'math');
  assert.deepEqual(pm.map(x => x.share).sort(), [350, 350]); assert(!pm.some(x => /^o:/.test(x.user_id)));
  // นำพี่เอออก → ส่วนของพี่เอในแต่ละคอร์สไปที่ผู้สอนที่เหลือของคอร์สนั้น
  ok(call('admin.team.remove', { user_id: A_, subject: 'math', from: NX }, adm));
  v = ok(call('fin.splits', {}, adm)).splits.math.find(x => x.from === NX);
  assert.deepEqual(v.courses[MC[0]], [{ user_id: B_, pct: 70 }]); assert.deepEqual(v.courses[MC[1]], [{ user_id: B_, pct: 70 }]);
  run(`deleteRows_('Enrollments', read_('Enrollments').filter(function (e) { return e.enroll_id === 'EMX1'; }))`);
  // สีประจำคอร์สและคำขอเปลี่ยนราคา
  const c = ok(call('admin.courses', {}, adm)).find(x => x.course_id === CHEM);
  no(C('admin.course.save', Object.assign({}, c, { accent: 'red' }), chem, 'chem@x.com'), 'BAD_INPUT');
  ok(C('admin.course.save', Object.assign({}, c, { accent: '#E91E63', req_price: 590, req_status: c.status }), chem, 'chem@x.com'));
  let c2 = ok(call('admin.courses', {}, adm)).find(x => x.course_id === CHEM);
  assert.equal(c2.accent, '#e91e63'); assert.equal(String(c2.price), String(c.price)); assert.equal(JSON.parse(c2.pending_change).price, '590');
  assert.equal(ok(call('courses.list', {})).find(x => x.course_id === CHEM).accent, '#e91e63');
  no(C('admin.course.request', { course_id: CHEM, decision: 'approve' }, chem, 'chem@x.com'), 'FORBIDDEN');
  ok(call('admin.course.request', { course_id: CHEM, decision: 'approve' }, adm));
  c2 = ok(call('admin.courses', {}, adm)).find(x => x.course_id === CHEM);
  assert.equal(String(c2.price), '590'); assert.equal(c2.pending_change, '');
});

t('playlist preview: pull titles + durations, follow the course naming pattern', () => {
  const MC = courses.find(c => c.course_id === 'MATH-M5-T1').course_id, PL2 = 'PL30fRiKuDivTESTTEST02';
  run("append_('Lessons', { lesson_id: 'LX1', course_id: '" + MC + "', chapter: 'บทที่ 1', title: 'EP.1 ลำดับ', youtube_id: 'bbbbbbbbbb1', duration_min: '30', sort_order: '10' })");
  run("append_('Lessons', { lesson_id: 'LX2', course_id: '" + MC + "', chapter: 'บทที่ 1', title: 'EP.2 อนุกรม', youtube_id: 'bbbbbbbbbb2', duration_min: '30', sort_order: '20' })");
  ctx.__yt.titles[PL2] = 'คณิต ม.5 เทอม 1';
  ctx.__yt.playlists[PL2] = [{ id: 'bbbbbbbbbb2', title: 'คณิต ม.5 | ตอนที่ 2 อนุกรม | INeedBio', dur: 30 }, { id: 'bbbbbbbbbb3', title: 'คณิต ม.5 | ตอนที่ 3 ลิมิต | INeedBio', dur: 42 },
    { id: 'bbbbbbbbbb4', title: 'คณิต ม.5 | สรุปท้ายบท | INeedBio', dur: 18 }, { id: 'bbbbbbbbbb5', title: 'Private video', dur: 1, priv: 'private' }];
  no(call('staff.playlist.preview', { course_id: MC, url: 'https://youtu.be/x' }, adm), 'BAD_INPUT');
  const r = ok(call('staff.playlist.preview', { course_id: MC, url: 'https://www.youtube.com/playlist?list=' + PL2 }, adm));
  assert.equal(r.style.format, 'EP.N ');
  assert.deepEqual(r.items.map(x => [x.title, x.duration_min, x.exists]), [['EP.2 อนุกรม', 30, true], ['EP.3 ลิมิต', 42, false], ['EP.4 สรุปท้ายบท', 18, false]]);
  // ยังไม่บันทึกอะไร → เพิ่มด้วย bulk พร้อมผูกเพลย์ลิสต์
  ok(call('admin.lessons.bulk', { course_id: MC, items: r.items.filter(x => !x.exists).map(x => ({ chapter: 'บทที่ 2', title: x.title, youtube: 'https://youtu.be/' + x.youtube_id, duration_min: x.duration_min, source_playlist: PL2 })) }, adm));
  const ls = ok(call('admin.lessons', { course_id: MC }, adm));
  assert.equal(ls.find(l => l.youtube_id === 'bbbbbbbbbb3').title, 'EP.3 ลิมิต');
  // ซิงก์อัตโนมัติ: คลิปใหม่ได้ชื่อตามแบบเดียวกัน นับเลขต่อ
  ok(call('staff.playlists.save', { course_id: MC, playlists: [{ url: PL2, chapter: 'บทที่ 2' }] }, adm));
  ctx.__yt.playlists[PL2].push({ id: 'bbbbbbbbbb6', title: 'คณิต ม.5 | ตอนที่ 5 อนุพันธ์ | INeedBio', dur: 50 });
  const s2 = ok(call('staff.course.sync', { course_id: MC }, adm));
  assert.deepEqual(s2.titles, ['EP.5 อนุพันธ์']);
});

// ── นักเรียนรุ่นเก่า ──
t('legacy: import, auto match by name, duplicates go to queue, release', () => {
  const early = reg('early@x.com', 'มานี', 'มีนา'); // สมัครก่อนนำเข้า
  const r = ok(call('admin.legacy.import', { batch: 'ชีวะ รุ่น 68', course_ids: [BIO], rows: [
    { first_name: 'นางสาวมานี', last_name: 'มีนา' }, { first_name: 'ปิติ', last_name: 'ยินดี' }, { first_name: 'ชูใจ', last_name: 'ใจดี' }, { first_name: 'ชูใจ', last_name: 'ใจดี' }, { first_name: 'x', last_name: '' }] }, adm));
  assert.equal(r.added, 3); assert.equal(r.duplicate, 1); assert.deepEqual(r.invalid_rows, [5]); assert.equal(r.matched_existing, 1);
  assert(ok(call('learn.get', { course_id: BIO }, early.token, 'early@x.com')));
  ok(call('admin.legacy.import', { batch: 'ชีวะ รุ่น 67', course_ids: [BIO], rows: [{ first_name: 'ชูใจ', last_name: 'ใจดี' }] }, adm));
  // สมัครใหม่ด้วยชื่อตรง (มีคำนำหน้า/ช่องว่าง) → ได้สิทธิ์ทันที
  const piti = reg('piti@x.com', 'ด.ช. ปิติ', 'ยิน ดี');
  assert.equal(piti.legacy.matched, true);
  assert(ok(call('learn.get', { course_id: BIO }, piti.token, 'piti@x.com')));
  assert.equal(ok(call('cart.quote', { course_ids: [BIO] }, piti.token, 'piti@x.com')).items[0].blocked, 'owned');
  // ชื่อซ้ำ 2 รายการ → เข้าคิว
  const chu = reg('chu@x.com', 'ชูใจ', 'ใจดี');
  assert.equal(chu.legacy.queued, true);
  no(call('learn.get', { course_id: BIO }, chu.token, 'chu@x.com'), 'NO_ACCESS');
  // สวมรอย: ชื่อที่ถูกใช้แล้ว → เข้าคิว
  const fake = reg('fake@x.com', 'ปิติ', 'ยินดี');
  assert.equal(fake.legacy.queued, true);
  // สะกดใกล้เคียง + กดแจ้งเอง
  const near = reg('near@x.com', 'ปิติ', 'ยินดีย์');
  assert.equal(near.legacy.matched, false); assert.equal(near.legacy.queued, undefined);
  // (ชื่อใกล้เคียงกับรายชื่อที่ถูกใช้ไปแล้ว → ไม่มีตัวเลือกที่ว่าง จึงไม่เข้าคิว)
  const L = ok(call('admin.legacy', { status: 'all' }, adm));
  assert.equal(L.total, 4); assert.equal(L.claimed, 2); assert.equal(L.claims.length, 2);
  const cq = L.claims.find(c => c.user.email === 'chu@x.com');
  assert.equal(cq.candidates.length, 2);
  ok(call('admin.legacy.decide', { claim_id: cq.claim_id, decision: 'approve', legacy_id: cq.candidates[0].legacy_id }, adm));
  assert(ok(call('learn.get', { course_id: BIO }, chu.token, 'chu@x.com')));
  // ตัวจริงของปิติถูกยืนยัน: ย้ายสิทธิ์จากบัญชีแรกไปบัญชีนี้
  const fq = ok(call('admin.legacy', {}, adm)).claims.find(c => c.user.email === 'fake@x.com');
  ok(call('admin.legacy.decide', { claim_id: fq.claim_id, decision: 'approve', legacy_id: fq.candidates[0].legacy_id }, adm));
  assert(ok(call('learn.get', { course_id: BIO }, fake.token, 'fake@x.com')));
  no(call('learn.get', { course_id: BIO }, piti.token, 'piti@x.com'), 'NO_ACCESS');
  // ไม่นับเป็นรายรับ
  const s = ok(call('fin.summary', {}, adm)); // งวด P ปิดยอดไปแล้ว สิทธิ์ที่เกิดหลังจากนั้นอยู่งวดที่เปิดอยู่
  assert(s.income.every(x => x.source !== 'legacy')); assert(s.free.legacy >= 3);
  // ปล่อยรายชื่อ
  const rec = ok(call('admin.legacy', { status: 'claimed' }, adm)).list.find(x => x.user && x.user.email === 'early@x.com');
  ok(call('admin.legacy.release', { legacy_id: rec.legacy_id }, adm));
  no(call('learn.get', { course_id: BIO }, early.token, 'early@x.com'), 'NO_ACCESS');
  const again = ok(call('legacy.claim', {}, early.token, 'early@x.com'));
  assert.equal(again.matched, true);
  // คนเดียวอยู่ทั้งรายชื่อชีวะและเคมี + มีวงเล็บหมายเหตุ + นามสกุลหลายคำ → รับทั้งสองคอร์สอัตโนมัติ
  ok(call('admin.legacy.import', { batch: 'bio-x', course_ids: [BIO], rows: [{ first_name: 'สุภัสสร', last_name: 'งอนรถ ณ อยุธยา(นร.เก่า)' }] }, adm));
  ok(call('admin.legacy.import', { batch: 'chem-x', course_ids: [CHEM], rows: [{ first_name: 'สุภัสสร', last_name: 'งอนรถ ณ อยุธยา' }] }, adm));
  const sp = reg('sp@x.com', 'น.ส.สุภัสสร', 'งอนรถ ณ อยุธยา');
  assert.equal(sp.legacy.matched, true); assert.deepEqual(sp.legacy.courses.sort(), [BIO, CHEM].sort());
  const nobody = reg('none@x.com', 'ไม่มี', 'ในรายชื่อ');
  assert.match(ok(call('legacy.claim', {}, nobody.token, 'none@x.com')).message, /ไม่พบ/);
});

// ── เพลย์ลิสต์ ──
t('playlist sync: add new clips, hide removed, restore, teacher scope', () => {
  const PL = 'PL30fRiKuDivTESTTEST01';
  ctx.__yt.titles[PL] = 'คอร์สเนื้อหา สอวน.เคมี';
  ctx.__yt.playlists[PL] = [{ id: 'aaaaaaaaaa1', title: 'สอวน.เคมี Ep.1 ปรับพื้นฐาน', dur: 190 }, { id: 'aaaaaaaaaa2', title: 'สอวน.เคมี Ep.2 อะตอม', dur: 60 }, { id: 'aaaaaaaaaa3', title: 'Private video', dur: 0, priv: 'private' }];
  const d = 'chem@x.com';
  no(C('staff.playlists.save', { course_id: BIO, playlists: [{ url: PL }] }, chem, d), 'FORBIDDEN');
  no(C('staff.playlists.save', { course_id: CHEM, playlists: [{ url: 'https://youtu.be/xx' }] }, chem, d), 'BAD_INPUT');
  ok(C('staff.playlists.save', { course_id: CHEM, playlists: [{ url: 'https://www.youtube.com/watch?v=E4gjhNzuLdU&list=' + PL + '&pp=x', chapter: 'เนื้อหา', strip: 'สอวน.เคมี' }] }, chem, d));
  const before = ok(C('admin.lessons', { course_id: CHEM }, chem, d)).length;
  let r = ok(C('staff.course.sync', { course_id: CHEM }, chem, d));
  assert.equal(r.added, 2); assert.deepEqual(r.titles, ['Ep.1 ปรับพื้นฐาน', 'Ep.2 อะตอม']);
  let ls = ok(C('admin.lessons', { course_id: CHEM }, chem, d));
  assert.equal(ls.length, before + 2); assert.equal(ls[ls.length - 2].duration_min, 190); assert.equal(ls[ls.length - 1].chapter, 'เนื้อหา');
  r = ok(C('staff.course.sync', { course_id: CHEM }, chem, d)); assert.equal(r.added, 0);
  // เพิ่มตอนใหม่ + เอาตอนเก่าออก
  ctx.__yt.playlists[PL] = [{ id: 'aaaaaaaaaa2', title: 'Ep.2', dur: 60 }, { id: 'aaaaaaaaaa4', title: 'สอวน.เคมี Ep.3 ตารางธาตุ', dur: 75 }];
  M.outbox.length = 0;
  run('syncPlaylists()');
  ls = ok(C('admin.lessons', { course_id: CHEM }, chem, d));
  assert.equal(ls.find(l => l.youtube_id === 'aaaaaaaaaa1').hidden, true);
  assert(ls.find(l => l.youtube_id === 'aaaaaaaaaa4'));
  assert.equal(M.outbox[0].to, 'chem@x.com');
  const pub = ok(call('course.detail', { course_id: CHEM }));
  assert(!pub.chapters.some(ch => ch.lessons.some(l => l.title.indexOf('ปรับพื้นฐาน') >= 0)));
  ctx.__yt.playlists[PL].unshift({ id: 'aaaaaaaaaa1', title: 'x', dur: 190 });
  r = ok(C('staff.course.sync', { course_id: CHEM }, chem, d)); assert.equal(r.restored, 1);
  // ตอนเดิมที่ใส่เองก่อนหน้า (youtube id เดียวกัน) ไม่ซ้ำ
  const PL2 = 'PL30fRiKuDivTESTTEST02'; ctx.__yt.playlists[PL2] = [{ id: 'aaaaaaaaaa2', title: 'ซ้ำ', dur: 1 }];
  ok(C('staff.playlists.save', { course_id: CHEM, playlists: [{ url: PL, chapter: 'เนื้อหา' }, { url: PL2, chapter: 'ตะลุยโจทย์' }] }, chem, d));
  assert.equal(ok(C('staff.course.sync', { course_id: CHEM }, chem, d)).added, 0);
});

t('lesson files: only enrolled can open, teacher scope; chapter rename', () => {
  const d = 'chem@x.com';
  const L = ok(C('admin.lesson.save', { course_id: CHEM, chapter: 'บทเก่า', title: 'EP.1', youtube: 'zzzzzzzzzz1', is_preview: true }, chem, d));
  no(C('staff.lesson.file.add', { lesson_id: L.lesson_id, name: 'x.pdf', mime: 'application/pdf', base64: 'eA==' }, phys, 'phys@x.com'), 'FORBIDDEN');
  const fs1 = ok(C('staff.lesson.file.add', { lesson_id: L.lesson_id, name: 'ชีทบทที่ 1.pdf', mime: 'application/pdf', base64: Buffer.from('PDFDATA').toString('base64') }, chem, d));
  assert.equal(fs1.length, 1); assert.equal(fs1[0].drive_id, undefined);
  ok(C('staff.lesson.file.add', { lesson_id: L.lesson_id, name: 'ลิงก์', url: 'https://drive.google.com/x' }, chem, d));
  // สาธารณะ (ตอนดูฟรี) ไม่เห็นไฟล์
  const pub = ok(call('course.detail', { course_id: CHEM }));
  assert(!JSON.stringify(pub).includes('ชีทบทที่ 1'));
  const outsider = reg('out@x.com', 'คนนอก', 'ไม่ได้ซื้อ');
  no(call('learn.file', { lesson_id: L.lesson_id, fid: fs1[0].fid }, outsider.token, 'out@x.com'), 'NO_ACCESS');
  ok(call('admin.grant', { course_id: CHEM, email: 'out@x.com' }, adm));
  const f = ok(call('learn.file', { lesson_id: L.lesson_id, fid: fs1[0].fid }, outsider.token, 'out@x.com'));
  assert.equal(Buffer.from(f.base64, 'base64').toString(), 'PDFDATA');
  const lg = ok(call('learn.get', { course_id: CHEM }, outsider.token, 'out@x.com'));
  assert.equal(lg.chapters.flatMap(c => c.lessons).find(x => x.lesson_id === L.lesson_id).files.length, 2);
  ok(C('staff.lesson.file.delete', { lesson_id: L.lesson_id, fid: fs1[0].fid }, chem, d));
  no(call('learn.file', { lesson_id: L.lesson_id, fid: fs1[0].fid }, outsider.token, 'out@x.com'), 'NOT_FOUND');
  // เปลี่ยนชื่อบท
  no(C('staff.chapter.rename', { course_id: BIO, from: 'x', to: 'y' }, chem, d), 'FORBIDDEN');
  const r = ok(C('staff.chapter.rename', { course_id: CHEM, from: 'บทเก่า', to: 'ปูพื้นฐาน›บทใหม่' }, chem, d));
  assert.equal(r.chapter, 'ปูพื้นฐาน › บทใหม่');
  assert(ok(C('admin.lessons', { course_id: CHEM }, chem, d)).some(l => l.chapter === 'ปูพื้นฐาน › บทใหม่'));
});

console.log(`\n${n} tests passed`);

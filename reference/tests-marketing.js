// ทดสอบ: รู้จักจากไหน (ตอนสมัคร) + ทดลองเรียนฟรีทั้งบท แลกไฟล์ด้วยแบบสอบถาม + หน้าการตลาดของแอดมิน
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
const base = { photo: PH, accept_data: true, accept_terms: true, password: 'secret123', school: 'ร.ร.', grade: 'ม.6', dream_faculty: 'แพทย์', dream_university: 'มหิดล', birthday: '2008-01-01', line_id: 'x' };
let ph = 10;
const reg = (email, extra) => { ok(call('register.start', { ...base, phone: '08000000' + (ph++), email, first_name: 'ก' + email[0], last_name: 'ข', nickname: email.split('@')[0], ...(extra || {}) })); return ok(call('register.verify', { email, otp: lastOtp() }, null, email)); };

ctx.setup(); run("setupCourses('https://x/', false)");
run("read_('Courses').forEach(function(c){ update_('Courses', c._row, { status: 'published', price: '790', pay_account_id: '' }); }); cache_().remove('pub_courses');");
const CID = 'CHEM-POSN';
// ตอนดูฟรี 2 ตอนมีไฟล์ + ตอนที่ต้องซื้อ 1 ตอนมีไฟล์
const mk = (id, title, pv, so) => run("append_('Lessons', { lesson_id: '" + id + "', course_id: '" + CID + "', chapter: 'บทที่ 1', title: '" + title + "', youtube_id: 'yyyyyyyyyy" + so + "', duration_min: '60', is_preview: '" + (pv ? 'TRUE' : 'FALSE') + "', sort_order: '" + so + "', hidden: 'FALSE', files: JSON.stringify([{ fid: 'F" + id + "', url: 'https://drive.google.com/D" + id + "', name: 'ชีท " + title + ".pdf', mime: 'application/pdf', size: 10 }]) })");
mk('LP1', 'โครงสร้างอะตอม ตอนที่ 1', true, 1); mk('LP2', 'โครงสร้างอะตอม ตอนที่ 2', true, 2); mk('LPAID', 'ตารางธาตุ', false, 3);
const AD = reg('ad@x.com'); ctx.makeAdmin('ad@x.com'); const adm = AD.token;
const start = new Date(Date.now() - 864e5).toISOString(), end = new Date(Date.now() + 10 * 864e5).toISOString();
ok(call('admin.coupon.save', { code: 'NEW10', kind: 'percent', value: 10, new_only: true, starts_at: start, ends_at: end }, adm));

let A, OLD;
t('signup: heard_from saved (with note and ref) · bad value rejected · old style signup still works', () => {
  assert.equal(call('register.start', { ...base, phone: '0899999999', email: 'bad@x.com', first_name: 'ก', last_name: 'ข', nickname: 'บ', heard_from: 'myspace' }).error, 'BAD_INPUT');
  A = reg('a@x.com', { heard_from: 'fb_group', heard_note: 'กลุ่ม Dek70 ', ref: 'poster-free<script>' });
  const u = run("findOne_('Users', function (r) { return r.email === 'a@x.com'; })");
  assert.equal(u.heard_from, 'fb_group'); assert.equal(u.heard_note, 'กลุ่ม Dek70'); assert.equal(u.ref, 'poster-freescript');
  OLD = reg('old@x.com'); // สมาชิกแบบเดิม ไม่มีคำตอบ
  assert.equal(run("findOne_('Users', function (r) { return r.email === 'old@x.com'; })").heard_from, '');
  const cfg = ok(call('config', {}));
  assert.equal(cfg.heard[0][0], 'fb_page'); assert.equal(cfg.trial_help.length, 5);
});
t('course page: no free files until admin turns it on · file names only, no links', () => {
  assert.equal(ok(call('course.detail', { course_id: CID })).free_files, undefined);
  no(call('admin.course.trial', { course_id: CID, on: true }, A.token), 'FORBIDDEN');
  ok(call('admin.course.trial', { course_id: CID, on: true, label: 'โครงสร้างอะตอม' }, adm));
  const c = ok(call('course.detail', { course_id: CID }));
  assert.equal(c.free_files.length, 2); assert.equal(c.free_label, 'โครงสร้างอะตอม'); assert.equal(c.free_unlocked, false);
  assert.ok(!JSON.stringify(c.free_files).includes('DLP1'));
  assert.ok(!JSON.stringify(c).includes('ตารางธาตุ.pdf'));
  assert.equal(ok(call('course.detail', { course_id: CID }, A.token, 'a@x.com')).free_unlocked, false);
});
t('files stay locked until the 2-question survey · answers validated', () => {
  no(call('learn.file', { lesson_id: 'LP1', fid: 'FLP1' }, A.token, 'a@x.com'), 'NO_ACCESS');
  no(call('trial.unlock', { course_id: CID, goals: ['A-Level'], help: 'ตะลุยโจทย์เยอะๆ' }), 'AUTH');
  no(call('trial.unlock', { course_id: CID, goals: [], help: 'ตะลุยโจทย์เยอะๆ' }, A.token, 'a@x.com'), 'BAD_INPUT');
  no(call('trial.unlock', { course_id: CID, goals: ['A-Level'], help: 'ขอเงิน' }, A.token, 'a@x.com'), 'BAD_INPUT');
  const r = ok(call('trial.unlock', { course_id: CID, goals: ['A-Level', 'สอวน.', 'มั่ว'], help: 'ตะลุยโจทย์เยอะๆ' }, A.token, 'a@x.com'));
  assert.equal(r.first, true); assert.equal(r.files.length, 2);
  // โปรที่ใช้ได้จริง: สมาชิกใหม่ลด 10%
  assert.equal(r.offer.price, 790); assert.equal(r.offer.total, 711); assert.equal(r.offer.label, 'สมาชิกใหม่ลด 10%'); assert.equal(r.offer.ends_at, end);
  const lead = run("read_('TrialLeads')[0]");
  assert.equal(lead.goals, 'A-Level,สอวน.'); assert.equal(lead.ref, 'poster-freescript');
  assert.equal(ok(call('learn.file', { lesson_id: 'LP1', fid: 'FLP1' }, A.token, 'a@x.com')).name, 'ชีท โครงสร้างอะตอม ตอนที่ 1.pdf');
  // ตอนที่ต้องซื้อยังล็อก
  no(call('learn.file', { lesson_id: 'LPAID', fid: 'FLPAID' }, A.token, 'a@x.com'), 'NO_ACCESS');
  // เปิดซ้ำได้โดยไม่ต้องตอบใหม่ และไม่เพิ่มแถว
  const r2 = ok(call('trial.unlock', { course_id: CID }, A.token, 'a@x.com'));
  assert.equal(r2.first, false); assert.equal(run("read_('TrialLeads').length"), 1);
  assert.equal(ok(call('course.detail', { course_id: CID }, A.token, 'a@x.com')).free_unlocked, true);
});
t('old member: no new-member price · turning feature off locks files again', () => {
  run("var _u = findOne_('Users', function (r) { return r.email === 'old@x.com'; }); update_('Users', _u._row, { created_at: '2026-01-01T00:00:00.000Z' });");
  const r = ok(call('trial.unlock', { course_id: CID, goals: ['กสพท'], help: 'สรุปเนื้อหาให้เข้าใจ' }, OLD.token, 'old@x.com'));
  assert.equal(r.offer.total, 790); assert.equal(r.offer.label, '');
  ok(call('admin.course.trial', { course_id: CID, on: false }, adm));
  no(call('learn.file', { lesson_id: 'LP1', fid: 'FLP1' }, A.token, 'a@x.com'), 'NO_ACCESS');
  no(call('trial.unlock', { course_id: CID }, A.token, 'a@x.com'), 'NOT_FOUND');
  ok(call('admin.course.trial', { course_id: CID, on: true, label: 'โครงสร้างอะตอม' }, adm));
});
t('admin marketing: sources from signup, lead → bought after, answers counted', () => {
  no(call('admin.marketing', {}, A.token, 'a@x.com'), 'FORBIDDEN');
  // a ซื้อคอร์สหลังรับไฟล์
  run("append_('Enrollments', { enroll_id: 'E1', user_id: '" + A.user.user_id + "', course_id: '" + CID + "', status: 'approved', amount: '711', created_at: new Date(Date.now() + 1000).toISOString(), source: 'bill' })");
  const m = ok(call('admin.marketing', { days: 30 }, adm));
  const g = m.signups.by.filter(x => x.key === 'fb_group')[0];
  assert.equal(g.n, 1); assert.equal(g.buyers, 1); assert.equal(g.sales, 711);
  assert.equal(m.signups.notes[0].note, 'กลุ่ม Dek70'); assert.equal(m.signups.refs[0].ref, 'poster-freescript');
  assert.equal(m.leads.n, 2); assert.equal(m.leads.bought, 1);
  assert.equal(m.goals.filter(x => x.label === 'A-Level')[0].n, 1); assert.equal(m.goals.filter(x => x.label === 'กสพท')[0].n, 1);
  assert.equal(m.help.filter(x => x.label === 'ตะลุยโจทย์เยอะๆ')[0].n, 1);
  const rec = m.recent.filter(x => x.nickname === 'a')[0];
  assert.equal(rec.bought, true); assert.equal(rec.heard, 'กลุ่ม Facebook'); assert.equal(rec.label, 'โครงสร้างอะตอม');
  const cc = m.courses.filter(x => x.course_id === CID)[0];
  assert.equal(cc.on, true); assert.equal(cc.previews, 2); assert.equal(cc.files, 2);
});
console.log('\n' + n + ' tests passed');

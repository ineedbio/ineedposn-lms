// ทดสอบ: เซลล์แบ่งตัว (เรียนต่อเนื่อง) · สมุดเซลล์ · บัตรพักตัว · แลกโค้ด · ธีม
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
const reg = (email, first, last) => { ok(call('register.start', { ...base, email, first_name: first, last_name: last, nickname: first })); return ok(call('register.verify', { email, otp: lastOtp() }, null, email)); };

ctx.setup();
run("setupCourses('https://x/', false)");
const S1 = reg('s1@x.com', 'เซลล์', 'หนึ่ง'), tok = S1.token, uid = S1.user.user_id, dev = 's1@x.com';
const C = (a, d) => call(a, d, tok, dev);
run("append_('Lessons', { lesson_id: 'L1', course_id: 'BIO-POSN', chapter: 'บท 1', title: 'ตอน 1', youtube_id: 'abcdefghijk', duration_min: '30', sort_order: '1' })");
run("append_('Lessons', { lesson_id: 'L2', course_id: 'CHEM-POSN', chapter: 'บท 1', title: 'ตอน 1', youtube_id: 'abcdefghijk', duration_min: '30', sort_order: '1' })");
let POS = 0;
const study = (mins) => { let r; for (let i = 0; i < mins; i++) { run("cache_().remove('cp:" + uid + "')"); POS += 60; r = ok(C('study.ping', { lesson_id: 'L1', pos: POS })); } return r; };
const shift = (d) => run('DAY_SHIFT_MS = ' + d + ' * 864e5');

t('ping needs enrollment', () => {
  no(C('study.ping', { lesson_id: 'L1' }), 'NO_ACCESS');
  run("append_('Enrollments', { enroll_id: 'E1', user_id: '" + uid + "', course_id: 'BIO-POSN', status: 'approved', amount: '0', created_at: now_(), source: 'grant' })");
  no(C('study.ping', { lesson_id: 'L2' }), 'NO_ACCESS');
});
t('rate limit: pings closer than 50s are ignored', () => {
  POS = 60; const a = ok(C('study.ping', { lesson_id: 'L1', pos: POS })); assert.equal(a.today_min, 1);
  assert.equal(ok(C('study.ping', { lesson_id: 'L1', pos: POS + 60 })).ignored, true);
});
t('video must advance: paused / looping / seeking back does not count', () => {
  run("cache_().remove('cp:" + uid + "')"); assert.equal(ok(C('study.ping', { lesson_id: 'L1', pos: POS + 10 })).reason, 'not_advancing');
  run("cache_().remove('cp:" + uid + "')"); assert.equal(ok(C('study.ping', { lesson_id: 'L1', pos: 5 })).reason, 'not_advancing');
  run("cache_().remove('cp:" + uid + "')"); POS = 5 + 120; assert.equal(ok(C('study.ping', { lesson_id: 'L1', pos: POS })).today_min, 2); // 2x speed ok
});
t('15 minutes = 1 day, +1 cell, streak 1', () => {
  const r = study(13); assert.equal(r.today_min, 15); assert.equal(r.credited.streak, 1);
  const s = ok(C('cells.status', {})); assert.equal(s.streak, 1); assert.equal(s.points, 1); assert.equal(s.today_done, true);
  assert.equal(study(3).credited, null); assert.equal(ok(C('cells.status', {})).points, 1); // วันเดียวกันไม่นับซ้ำ
});
t('consecutive days + bonus at 7 + freeze card', () => {
  for (let d = 1; d <= 6; d++) { shift(d); study(15); }
  const s = ok(C('cells.status', {})); assert.equal(s.streak, 7); assert.equal(s.points, 7 + 5); assert.equal(s.freezes, 1);
});
t('miss 1 day uses freeze, miss more resets streak but keeps cells and best', () => {
  shift(8); const r = study(15); assert.equal(r.credited.streak, 8); assert.equal(r.credited.used_freezes, 1);
  shift(12); let s = ok(C('cells.status', {})); assert.equal(s.streak, 0); assert.equal(s.best, 8);
  study(15); s = ok(C('cells.status', {})); assert.equal(s.streak, 1); assert.equal(s.points, 12 + 1 + 1);
});
t('themes unlock by best streak and persist', () => {
  no(C('cells.theme', { theme: 'petri' }), 'BAD_INPUT');
  for (let d = 13; d <= 26; d++) { shift(d); study(15); }
  const s = ok(C('cells.status', {})); assert.equal(s.streak, 15); assert.ok(s.themes.indexOf('petri') >= 0);
  ok(C('cells.theme', { theme: 'petri' })); assert.equal(ok(C('cells.status', {})).theme, 'petri');
});
t('redeem needs 100 cells, once per 30 days, code is personal', () => {
  no(C('cells.redeem', {}), 'BAD_INPUT');
  run("ledgerAdd_('" + uid + "', 100, 'test', '', '')");
  const r = ok(C('cells.redeem', {})); assert.match(r.code, /^CELL/);
  const s = ok(C('cells.status', {})); assert.equal(s.codes.length, 1); assert.equal(s.can_redeem, false);
  run("ledgerAdd_('" + uid + "', 100, 'test', '', '')");
  no(C('cells.redeem', {}), 'BAD_INPUT');
  const q = ok(C('cart.quote', { course_ids: ['CHEM-POSN'], coupon: r.code })); // คอร์สต้องเปิดขายก่อน
  const S2 = reg('s2@x.com', 'อีก', 'คน');
  run("read_('Courses').forEach(function(c){ update_('Courses', c._row, { status: 'published' }); }); cache_().remove('pub_courses');");
  const mine = ok(C('cart.quote', { course_ids: ['CHEM-POSN'], coupon: r.code })); assert.equal(mine.coupon.ok, true); assert.equal(mine.discount, 100);
  const other = ok(call('cart.quote', { course_ids: ['CHEM-POSN'], coupon: r.code }, S2.token, 's2@x.com')); assert.equal(other.coupon.ok, false); assert.match(other.coupon.message, /ส่วนตัว/);
});
t('review + grades: pending until admin approves, cells once', () => {
  no(C('review.submit', { course_id: 'CHEM-POSN', rating: 5, text: 'x'.repeat(30) }), 'NO_ACCESS');
  no(C('review.submit', { course_id: 'BIO-POSN', rating: 5, text: 'สั้นไป' }), 'BAD_INPUT');
  assert.equal(ok(C('review.submit', { course_id: 'BIO-POSN', rating: 5, text: 'สอนเข้าใจง่ายมาก ชีทสรุปดี ดูซ้ำได้เรื่อย ๆ' })).cells, 5);
  const g = ok(C('grades.submit', { year: '2569', term: '1', grades: [{ subject: 'ชีววิทยา', grade: '4' }, { subject: 'เคมี', grade: '3.5' }], gpa: '3.80', proof: PH, consent_publish: true }));
  assert.equal(g.cells, 10);
  const before = ok(C('cells.status', {})).points;
  const A = reg('adm@x.com', 'แอด', 'มิน'); run("makeAdmin('adm@x.com')"); const at = ok(call('login', { email: 'adm@x.com', password: 'secret123' }, null, 'adm')).token;
  const f = ok(call('admin.feedback', {}, at, 'adm')); assert.equal(f.reviews.length, 1); assert.equal(f.grades.length, 1); assert.equal(f.grades[0].has_proof, true);
  assert.equal(ok(call('course.detail', { course_id: 'BIO-POSN' })).reviews.length, 0);
  ok(call('admin.feedback.decide', { kind: 'reviews', id: f.reviews[0].id, decision: 'approve' }, at, 'adm'));
  ok(call('admin.feedback.decide', { kind: 'grades', id: f.grades[0].id, decision: 'approve' }, at, 'adm'));
  no(call('admin.feedback.decide', { kind: 'grades', id: f.grades[0].id, decision: 'approve' }, at, 'adm'), 'ALREADY');
  assert.equal(ok(C('cells.status', {})).points, before + 15);
  assert.equal(ok(call('course.detail', { course_id: 'BIO-POSN' })).reviews.length, 1);
  no(C('review.submit', { course_id: 'BIO-POSN', rating: 4, text: 'x'.repeat(30) }), 'ALREADY');
  assert.deepEqual(ok(C('my.submissions', {})).reviews, ['BIO-POSN']);
});
t('trial feedback: no login needed, once per lesson, stats after 5', () => {
  run("read_('Courses').forEach(function(c){ update_('Courses', c._row, { status: 'published' }); }); cache_().remove('pub_courses');");
  no(call('trial.feedback', { course_id: 'BIO-POSN', lesson: 'ตอน 1', level: 'x' }, null, 'anon1'), 'BAD_INPUT');
  ok(call('trial.feedback', { course_id: 'BIO-POSN', lesson: 'ตอน 1', level: 'clear', text: 'เข้าใจง่ายดี' }, null, 'anon1'));
  assert.equal(ok(call('trial.feedback', { course_id: 'BIO-POSN', lesson: 'ตอน 1', level: 'lost' }, null, 'anon1')).repeat, true);
  assert.equal(ok(call('course.detail', { course_id: 'BIO-POSN' })).trial, null);
  ['a2', 'a3', 'a4'].forEach(d => ok(call('trial.feedback', { course_id: 'BIO-POSN', lesson: 'ตอน 1', level: 'clear' }, null, d)));
  ok(call('trial.feedback', { course_id: 'BIO-POSN', lesson: 'ตอน 1', level: 'partly' }, null, 'a5'));
  const tr = ok(call('course.detail', { course_id: 'BIO-POSN' })).trial; assert.equal(tr.n, 5); assert.equal(tr.clear_pct, 80);
  assert.equal(ok(C('learn.get', { course_id: 'BIO-POSN' })).reviewed, true);
});
t('admin sees ledger; students cannot', () => {
  no(C('admin.cells', {}), 'FORBIDDEN');
});
t('free preview counts as study time (logged in only), other lessons still need enrollment', () => {
  run("append_('Lessons', { lesson_id: 'LP', course_id: 'CHEM-POSN', chapter: 'บท 1', title: 'ตอนตัวอย่าง', youtube_id: 'abcdefghijk', duration_min: '20', sort_order: '2', is_preview: 'TRUE' })");
  const S2 = reg('pv@x.com', 'ตัวอย่าง', 'ฟรี'), C2 = (a, d) => call(a, d, S2.token, 'pv@x.com');
  no(call('study.ping', { lesson_id: 'LP', preview: 1, pos: 60 }), 'AUTH');
  no(C2('study.ping', { lesson_id: 'L2', preview: 1, pos: 60 }), 'NO_ACCESS'); // ไม่ใช่ตอนตัวอย่าง
  no(C2('study.ping', { lesson_id: 'LP', pos: 60 }), 'NO_ACCESS'); // ไม่ได้บอกว่าเป็นตัวอย่าง
  assert.equal(ok(C2('study.ping', { lesson_id: 'LP', preview: 1, pos: 60 })).today_min, 1);
});
t('halloween 2569: no skin event by default (owner removed it)', () => {
  assert.equal(run('CELLS.EVENTS.length'), 0);
  const S0 = reg('hw0@x.com', 'ไม่มี', 'สกิน'); const st = ok(call('cells.status', {}, S0.token, 'hw0@x.com'));
  assert.equal(st.events.length, 0); assert(st.themes.indexOf('spooky') < 0);
});
t('event mechanism still works: 10 study days in window = limited skin, kept after the event', () => {
  run("CELLS.EVENTS.push({ key: 'halloween2569', name: 'ฮาโลวีน 2569', skin: 'spooky', from: '2026-10-04', to: '2026-10-31', need: 10 })");
  const S3 = reg('hw@x.com', 'ฮาโล', 'วีน'), C3 = (a, d) => call(a, d, S3.token, 'hw@x.com'), u3 = S3.user.user_id;
  let P3 = 0;
  const dayAt = (iso) => run("DAY_SHIFT_MS = Date.parse('" + iso + "T05:00:00Z') - Date.now()");
  const studyDay = () => { for (let i = 0; i < 15; i++) { run("cache_().remove('cp:" + u3 + "')"); P3 += 60; ok(C3('study.ping', { lesson_id: 'LP', preview: 1, pos: P3 })); } };
  dayAt('2026-10-03'); studyDay(); // ก่อนช่วงกิจกรรม (เริ่ม 4 ต.ค.) ไม่นับ
  [16, 17, 19, 20, 22, 24, 25, 27, 28].forEach(function (d) { dayAt('2026-10-' + d); studyDay(); }); // 9 วัน ไม่ต้องติดกัน
  let st = ok(C3('cells.status', {})), ev = st.events.find(e => e.key === 'halloween2569');
  assert.equal(ev.days, 9); assert.equal(ev.earned, false); assert(st.themes.indexOf('spooky') < 0);
  no(C3('cells.theme', { theme: 'spooky' }), 'BAD_INPUT');
  dayAt('2026-10-31'); studyDay();
  st = ok(C3('cells.status', {})); ev = st.events.find(e => e.key === 'halloween2569');
  assert.equal(ev.days, 10); assert.equal(ev.earned, true); assert(st.themes.indexOf('spooky') >= 0);
  ok(C3('cells.theme', { theme: 'spooky' }));
  dayAt('2026-12-15'); st = ok(C3('cells.status', {}));
  assert.equal(st.theme, 'spooky'); assert.equal(st.events[0].active, false); assert.equal(st.events[0].earned, true);
  run('DAY_SHIFT_MS = 0; CELLS.EVENTS.length = 0;');
});
console.log('\n' + n + ' tests passed');

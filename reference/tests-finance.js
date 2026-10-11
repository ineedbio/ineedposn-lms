// ทดสอบ: ปิดยอดเองได้ทุกเมื่อ · เวลาตัดยอด · ยอดที่เข้าหลังตัดยอดยกไปงวดถัดไป · แก้เวลาตัดยอดย้อนหลัง · ปรับปรุงยอด
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
const AD = reg('ad@x.com'); ctx.makeAdmin('ad@x.com'); const adm = AD.token;
const T1 = reg('t1@x.com'), T2 = reg('t2@x.com'), ST = reg('st@x.com');
ok(call('admin.team.add', { user_id: T1.user.user_id, subject: 'math' }, adm));
ok(call('admin.team.add', { user_id: T2.user.user_id, subject: 'math' }, adm));
const ago = m => new Date(Date.now() - m * 60e3).toISOString();
const P = run('periodOf_(now_())'), N1 = run("prNext_('" + P + "')"), N2 = run("prNext_('" + N1 + "')");
let k = 0;
const sale = (cid, amt, when) => run("append_('Enrollments', { enroll_id: 'E" + (++k) + "', user_id: '" + ST.user.user_id + "', course_id: '" + cid + "', status: 'approved', amount: '" + amt + "', created_at: '" + when + "', decided_at: '" + when + "', source: 'bill' })");
const today = run('new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10)'), pStart = P.slice(0, 8) + (P.slice(-1) === '1' ? '01' : '16');

t('math: each grade/term its own split per teacher', () => {
  ok(call('fin.splits.save', { subject: 'math', from: pStart, others: [{ label: 'ค่าหลังบ้าน', pct: 30 }], courses: {
    'MATH-M4-T1': [{ user_id: T1.user.user_id, pct: 50 }, { user_id: T2.user.user_id, pct: 20 }],
    'MATH-M4-T2': [{ user_id: T1.user.user_id, pct: 70 }],
    'MATH-M5-T1': [{ user_id: T1.user.user_id, pct: 10 }, { user_id: T2.user.user_id, pct: 60 }] } }, adm));
  no(call('fin.splits.save', { subject: 'math', from: today, others: [{ label: 'ค่าหลังบ้าน', pct: 30 }], courses: { 'MATH-M4-T1': [{ user_id: T1.user.user_id, pct: 50 }] } }, adm), 'BAD_INPUT');
  sale('MATH-M4-T1', 1000, ago(60)); sale('MATH-M5-T1', 1000, ago(50));
  const s = ok(call('fin.summary', { period: P }, adm)), pay = id => s.pays.find(x => x.subject === 'math' && x.user_id === id);
  assert.equal(pay(T1.user.user_id).share, 500 + 100); assert.equal(pay(T2.user.user_id).share, 200 + 600);
  assert.equal(s.by_subject.find(x => x.subject === 'math').kept, 600);
});
t('admin closes any time with a cutoff in the past; later sales roll to next period', () => {
  no(call('fin.close', { period: P, cutoff: new Date(Date.now() + 36e5).toISOString() }, adm), 'BAD_INPUT');
  no(call('fin.close', { period: N2 }, adm), 'BAD_INPUT');
  const t1l = ok(call('login', { email: 't1@x.com', password: 'secret123' }, null, 't1@x.com'));
  no(call('fin.close', { period: P }, t1l.token, 't1@x.com'), 'FORBIDDEN');
  sale('MATH-M4-T2', 1000, ago(30)); // หลังเวลาตัดยอด (40 นาทีก่อน)
  const c = ok(call('fin.close', { period: P, cutoff: ago(40) }, adm));
  assert.equal(c.closed, true); assert.equal(c.totals.income, 2000); assert.equal(c.can_recut, true);
  const nx = ok(call('fin.summary', {}, adm));
  assert.equal(nx.period, N1); assert.equal(nx.income.length, 1); assert.equal(nx.income[0].rolled_from, P); assert.equal(nx.rolled_in, 1);
  sale('MATH-M4-T1', 500, ago(1)); // ยอดใหม่วันนี้ (งวด P ปิดไปแล้ว) → งวดถัดไป
  assert.equal(ok(call('fin.summary', { period: N1 }, adm)).totals.income, 1500);
  assert.equal(ok(call('fin.summary', { period: P }, adm)).totals.income, 2000); // งวดที่ปิดไม่เปลี่ยน
  no(call('fin.splits.save', { subject: 'math', from: pStart, others: [], courses: { 'MATH-M4-T1': [{ user_id: T1.user.user_id, pct: 100 }] } }, adm), 'LOCKED');
});
let paidPo;
t('recut after paying: difference goes to next period as adjustment', () => {
  const s = ok(call('fin.summary', { period: P }, adm));
  paidPo = s.payouts.find(x => x.user_id === T1.user.user_id);
  assert.equal(paidPo.amount, 600);
  ok(call('fin.payout.pay', { payout_id: paidPo.payout_id, slip: PH }, adm));
  // แก้เวลาตัดยอดให้เร็วขึ้น: ยอด M5 (50 นาทีก่อน) ไม่อยู่ในงวด P แล้ว
  const r = ok(call('fin.recut', { period: P, cutoff: ago(55) }, adm));
  assert.equal(r.totals.income, 1000);
  const po1 = r.payouts.find(x => x.user_id === T1.user.user_id), po2 = r.payouts.find(x => x.user_id === T2.user.user_id);
  assert.equal(po1.status, 'paid'); assert.equal(po1.amount, 600); // โอนแล้วไม่แก้
  assert.equal(po2.status, 'pending'); assert.equal(po2.amount, 200); // ยังไม่โอน → แก้ยอดรอโอน
  const nx = ok(call('fin.summary', { period: N1 }, adm)), p1 = nx.pays.find(x => x.subject === 'math' && x.user_id === T1.user.user_id);
  assert.equal(nx.income.filter(x => x.rolled_from === P).length, 3);
  assert.equal(p1.adjust, -100); // จ่ายเกินไป 100 (ส่วนของ M5) หักในงวดถัดไป
  assert.equal(p1.share, 100 + 700 + 250); assert.equal(p1.settle, 100 + 700 + 250 - 100);
  no(call('fin.adjust.delete', { adj_id: nx.adjustments[0].adj_id }, adm), 'LOCKED');
});
t('manual adjustment in open period; locked after close; recut only latest', () => {
  no(call('fin.adjust.save', { period: P, user_id: T2.user.user_id, subject: 'math', amount: 100, note: 'x' }, adm), 'LOCKED');
  no(call('fin.adjust.save', { period: N1, user_id: T2.user.user_id, subject: 'math', amount: 100, note: '' }, adm), 'BAD_INPUT');
  let s = ok(call('fin.adjust.save', { period: N1, user_id: T2.user.user_id, subject: 'math', amount: 150, note: 'ค่าสอนเสริม ก.ย.' }, adm));
  const p2 = s.pays.find(x => x.subject === 'math' && x.user_id === T2.user.user_id); assert.equal(p2.adjust, 150);
  const t2l = ok(call('login', { email: 't2@x.com', password: 'secret123' }, null, 't2@x.com'));
  const mine = ok(call('fin.summary', { period: N1 }, t2l.token, 't2@x.com'));
  assert.equal(mine.adjustments.length, 1); assert.equal(mine.adjustments[0].note, 'ค่าสอนเสริม ก.ย.');
  s = ok(call('fin.adjust.delete', { adj_id: s.adjustments.find(x => x.source === 'manual').adj_id }, adm));
  assert.equal(s.adjustments.length, 1);
  ok(call('fin.close', { period: N1 }, adm));
  no(call('fin.recut', { period: P, cutoff: ago(45) }, adm), 'LOCKED');
  no(call('fin.reopen', { period: P }, adm), 'LOCKED');
  assert.equal(ok(call('fin.summary', {}, adm)).period, N2);
});
t('advance: teacher requests from share after expenses; admin pays; net = share − held − advance', () => {
  const N3 = run("prNext_('" + N2 + "')");
  const soon = s => new Date(Date.now() + s * 1000).toISOString();
  sale('MATH-M4-T1', 1000, new Date().toISOString()); // T1 50% = 500 · T2 20% = 200
  const t1 = ok(call('login', { email: 't1@x.com', password: 'secret123' }, null, 't1@x.com')).token;
  const t2 = ok(call('login', { email: 't2@x.com', password: 'secret123' }, null, 't2@x.com')).token;
  let m = ok(call('fin.summary', {}, t1, 't1@x.com'));
  assert.equal(m.period, N2); assert.equal(m.adv_open, true);
  assert.equal(m.adv_mine.find(x => x.subject === 'math').available, 500);
  no(call('fin.advance.request', { subject: 'math', amount: 600 }, t1, 't1@x.com'), 'BAD_INPUT');
  no(call('fin.advance.request', { subject: 'bio', amount: 100 }, t1, 't1@x.com'), 'BAD_INPUT');
  no(call('fin.advance.request', { subject: 'math', amount: 100 }, ST.token), 'FORBIDDEN');
  m = ok(call('fin.advance.request', { subject: 'math', amount: 300, note: 'ค่าเทอมน้อง' }, t1, 't1@x.com'));
  assert.equal(m.adv_pending.length, 1); assert.equal(m.adv_mine.find(x => x.subject === 'math').available, 200);
  no(call('fin.advance.request', { subject: 'math', amount: 250 }, t1, 't1@x.com'), 'BAD_INPUT'); // รวมคำขอที่รอแล้วเกิน
  assert.equal(ok(call('fin.summary', {}, t2, 't2@x.com')).adv_pending.length, 0); // ผู้สอนอื่นไม่เห็น
  let a = ok(call('fin.summary', {}, adm));
  assert.equal(a.adv_pending.length, 1); assert.equal(a.pays.find(x => x.user_id === T1.user.user_id).adv.pending, 300);
  const before = M.outbox.length;
  a = ok(call('fin.advance.pay', { adv_id: a.adv_pending[0].adv_id, slip: PH }, adm));
  assert.equal(M.outbox.length, before + 1); assert.match(M.outbox[M.outbox.length - 1].subject, /เบิกล่วงหน้า/);
  no(call('fin.advance.pay', { adv_id: a.adv[0].adv_id }, adm), 'ALREADY');
  const p1 = a.pays.find(x => x.user_id === T1.user.user_id && x.subject === 'math');
  assert.equal(p1.share, 500); assert.equal(p1.advance, 300); assert.equal(p1.settle, 200); assert.equal(a.totals.advance, 300);
  assert.equal(a.adv.length, 1); assert.equal(a.adv[0].has_slip, true);
  ok(call('fin.advance.slip', { adv_id: a.adv[0].adv_id }, t1, 't1@x.com'));
  no(call('fin.advance.slip', { adv_id: a.adv[0].adv_id }, t2, 't2@x.com'), 'FORBIDDEN');
  // แอดมินโอนให้ T2 เองเกินส่วนแบ่ง (200) → ปิดยอดแล้วส่วนที่เกินยกไปหักงวดถัดไป ไม่ต้องให้ผู้สอนโอนคืน
  a = ok(call('fin.advance.pay', { user_id: T2.user.user_id, subject: 'math', amount: 500, note: 'เบิกฉุกเฉิน' }, adm));
  assert.equal(a.pays.find(x => x.user_id === T2.user.user_id).settle, -300);
  run("closePeriod_('" + N2 + "', finCompute_('" + N2 + "'), 'test')"); // (fin.close ปิดล่วงหน้าเกิน 1 งวดไม่ได้)
  const c = ok(call('fin.summary', { period: N2 }, adm));
  const q2 = c.pays.find(x => x.user_id === T2.user.user_id), q1 = c.pays.find(x => x.user_id === T1.user.user_id);
  assert.equal(q2.settle, 0); assert.equal(q2.carry, -300); assert.equal(q1.settle, 200);
  assert.equal(c.payouts.find(x => x.user_id === T2.user.user_id).status, 'paid');
  assert.equal(c.payouts.find(x => x.user_id === T1.user.user_id).amount, 200);
  no(call('fin.advance.delete', { adv_id: c.adv.find(x => x.user_id === T2.user.user_id).adv_id }, adm), 'LOCKED');
  const n3 = ok(call('fin.summary', {}, adm));
  assert.equal(n3.period, N3);
  const aj = n3.adjustments.find(x => x.user_id === T2.user.user_id);
  assert.equal(aj.amount, -300); assert.equal(aj.source, 'advance');
  no(call('fin.adjust.delete', { adj_id: aj.adj_id }, adm), 'LOCKED');
  assert.equal(n3.pays.find(x => x.user_id === T2.user.user_id).settle, -300);
  no(call('fin.advance.request', { subject: 'math', amount: 1 }, t2, 't2@x.com'), 'BAD_INPUT'); // ยังติดลบ เบิกไม่ได้
});
t('advance: cancel / reject / delete mistaken entry', () => {
  const soon = s => new Date(Date.now() + s * 1000).toISOString();
  sale('MATH-M4-T2', 1000, new Date().toISOString()); // T1 70% = 700
  const t1 = ok(call('login', { email: 't1@x.com', password: 'secret123' }, null, 't1@x.com')).token;
  let m = ok(call('fin.advance.request', { subject: 'math', amount: 100 }, t1, 't1@x.com'));
  m = ok(call('fin.advance.cancel', { adv_id: m.adv_pending[0].adv_id }, t1, 't1@x.com'));
  assert.equal(m.adv_pending.length, 0);
  m = ok(call('fin.advance.request', { subject: 'math', amount: 700 }, t1, 't1@x.com'));
  const id = m.adv_pending[0].adv_id;
  no(call('fin.advance.reject', { adv_id: id }, t1, 't1@x.com'), 'FORBIDDEN');
  ok(call('fin.advance.reject', { adv_id: id, reply: 'รอปิดยอดก่อนนะ' }, adm));
  no(call('fin.advance.cancel', { adv_id: id }, t1, 't1@x.com'), 'ALREADY');
  let a = ok(call('fin.advance.pay', { user_id: T1.user.user_id, subject: 'math', amount: 50 }, adm));
  assert.equal(a.pays.find(x => x.user_id === T1.user.user_id).advance, 50);
  a = ok(call('fin.advance.delete', { adv_id: a.adv.find(x => x.amount === 50).adv_id }, adm));
  assert.ok(!a.pays.find(x => x.user_id === T1.user.user_id).advance);
});
t('reopen removes advance carry; close again recreates it once', () => {
  const N3 = run("prNext_('" + N2 + "')");
  ok(call('fin.reopen', { period: N2 }, adm));
  assert.equal(ok(call('fin.summary', { period: N3 }, adm)).adjustments.filter(x => x.source === 'advance').length, 0);
  run("closePeriod_('" + N2 + "', finCompute_('" + N2 + "'), 'test')");
  assert.equal(ok(call('fin.summary', { period: N3 }, adm)).adjustments.filter(x => x.source === 'advance').length, 1);
});
console.log('\n' + n + ' tests passed');

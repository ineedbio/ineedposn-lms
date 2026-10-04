// ทดสอบ: ส่วนลดสมาชิกใหม่ (new_only) — ลดให้อัตโนมัติเฉพาะบัญชีใหม่ที่ยังไม่เคยซื้อ
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = vm.createContext({ console, Date, Math, JSON, String, Number, Object, Array, Error, parseInt, unescape, encodeURIComponent, isNaN });
vm.runInContext(fs.readFileSync(__dirname + '/gas-mock.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../backend/Code.gs', 'utf8'), ctx);
const M = ctx.__mock, run = (js) => vm.runInContext(js, ctx);
const call = (action, data, token, device_id = 'dev') => M.call({ action, data, token, device_id, device_info: 'Test' });
const ok = r => { if (!r.ok) throw new Error(r.error + ': ' + r.message); return r.data; };
const lastOtp = () => M.outbox[M.outbox.length - 1].subject.slice(0, 6);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓', name); };
const PH = { mime: 'image/jpeg', base64: Buffer.from('x').toString('base64') };
const base = { photo: PH, accept_data: true, accept_terms: true, password: 'secret123', school: 'โรงเรียนตัวอย่าง', grade: 'ม.5', phone: '0800000000',
  dream_faculty: 'แพทยศาสตร์', dream_university: 'มหิดล', birthday: '2009-01-01', line_id: 'x' };
const reg = (email, phone) => { ok(call('register.start', { ...base, ...(phone ? { phone } : {}), email, first_name: 'ก', last_name: 'ข', nickname: 'ก' })); return ok(call('register.verify', { email, otp: lastOtp() }, null, email)); };

ctx.setup();
run("setupCourses('https://x/', false)");
run("read_('Courses').forEach(function (c) { if (c.course_id === 'BIO-POSN' || c.course_id === 'CHEM-POSN') update_('Courses', c._row, { status: 'published', price: '2000', pay_account_id: '' }); })");
const OLD = reg('old@x.com');
// บัญชีเก่า: สมัครก่อนแคมเปญ
run("var _u = findOne_('Users', function (r) { return r.email === 'old@x.com'; }); update_('Users', _u._row, { created_at: '2026-09-01T00:00:00.000Z' });");
const AD = reg('ad@x.com'); ctx.makeAdmin('ad@x.com'); const adm = AD.token;
const start = new Date(Date.now() - 864e5).toISOString(), end = new Date(Date.now() + 10 * 864e5).toISOString();

t('admin: new_only needs a start date, per_user defaults to 1', () => {
  assert.equal(call('admin.coupon.save', { code: 'HALLO10', kind: 'percent', value: 10, new_only: true }, adm).error, 'BAD_INPUT');
  ok(call('admin.coupon.save', { code: 'HALLO10', kind: 'percent', value: 10, new_only: true, starts_at: start, ends_at: end }, adm));
  const c = ok(call('admin.coupons', {}, adm)).filter(x => x.code === 'HALLO10')[0];
  assert.equal(c.new_only, '1'); assert.equal(c.per_user, '1');
});
t('guest: no discount, sees hint', () => {
  const q = ok(call('cart.quote', { course_ids: ['BIO-POSN'] }));
  assert.equal(q.coupon, null); assert.equal(q.promo.label, '10%'); assert.equal(q.total, 2000);
  const q2 = ok(call('cart.quote', { course_ids: ['BIO-POSN'], coupon: 'HALLO10' }));
  assert.equal(q2.coupon.ok, false); assert.match(q2.coupon.message, /สมาชิกใหม่/);
});
t('old account cannot use it, even by typing the code', () => {
  const q = ok(call('cart.quote', { course_ids: ['BIO-POSN'] }, OLD.token, 'old@x.com'));
  assert.equal(q.coupon, null); assert.equal(q.total, 2000);
  const q2 = ok(call('cart.quote', { course_ids: ['BIO-POSN'], coupon: 'hallo10' }, OLD.token, 'old@x.com'));
  assert.equal(q2.coupon.ok, false); assert.match(q2.coupon.message, /สมัครตั้งแต่/);
  assert.equal(call('order.create', { course_ids: ['BIO-POSN'], coupon: 'HALLO10', accept_pay_terms: true }, OLD.token, 'old@x.com').error, 'COUPON');
});
const NEW = reg('new@x.com'), NT = NEW.token, nd = 'new@x.com';
t('new account: auto-applied without a code', () => {
  const q = ok(call('cart.quote', { course_ids: ['BIO-POSN', 'CHEM-POSN'] }, NT, nd));
  assert.equal(q.coupon.ok, true); assert.equal(q.coupon.auto, true); assert.equal(q.coupon.code, 'HALLO10'); assert.equal(q.total, 3600);
});
let oid;
t('order applies it server-side even if client sends no code', () => {
  oid = ok(call('order.create', { course_ids: ['BIO-POSN'], coupon: '', accept_pay_terms: true }, NT, nd)).order_id;
  const o = run("findOne_('Orders', function (r) { return r.order_id === '" + oid + "'; })");
  assert.equal(o.coupon_code, 'HALLO10'); assert.equal(Number(o.total), 1800);
});
t('another new account with the same phone as a buyer: no discount', () => {
  const D = reg('dup@x.com'); // เบอร์เดียวกับ new@x.com ที่เพิ่งซื้อ
  assert.equal(ok(call('cart.quote', { course_ids: ['CHEM-POSN'] }, D.token, 'dup@x.com')).coupon, null);
  run("var _d = findOne_('Users', function (r) { return r.email === 'dup@x.com'; }); update_('Users', _d._row, { phone: '081-234-5678' });");
  assert.equal(ok(call('cart.quote', { course_ids: ['CHEM-POSN'] }, D.token, 'dup@x.com')).coupon.auto, true);
});
t('second order: no longer new', () => {
  const q = ok(call('cart.quote', { course_ids: ['CHEM-POSN'] }, NT, nd));
  assert.equal(q.coupon, null); assert.equal(q.total, 2000);
  assert.equal(ok(call('cart.quote', { course_ids: ['CHEM-POSN'], coupon: 'HALLO10' }, NT, nd)).coupon.ok, false);
});
t('expired/cancelled bill gives the right back', () => {
  run("read_('Bills').forEach(function (b) { if (b.order_id === '" + oid + "') update_('Bills', b._row, { expires_at: '2020-01-01T00:00:00.000Z' }); })");
  const q = ok(call('cart.quote', { course_ids: ['CHEM-POSN'] }, NT, nd));
  assert.equal(q.coupon.auto, true); assert.equal(q.total, 1800);
});
t('typed code replaces the auto one; legacy-linked students excluded', () => {
  ok(call('admin.coupon.save', { code: 'ALL50', kind: 'fixed', value: 50 }, adm));
  const q = ok(call('cart.quote', { course_ids: ['CHEM-POSN'], coupon: 'ALL50' }, NT, nd));
  assert.equal(q.coupon.code, 'ALL50'); assert.equal(q.coupon.auto, false); assert.equal(q.total, 1950);
  const L = reg('leg@x.com');
  run("append_('Enrollments', { enroll_id: 'EL', user_id: '" + L.user.user_id + "', course_id: 'BIO-POSN', status: 'approved', amount: '0', created_at: now_(), source: 'legacy' })");
  assert.equal(ok(call('cart.quote', { course_ids: ['CHEM-POSN'] }, L.token, 'leg@x.com')).coupon, null);
});
t('banner data: config has the promo, me says who is eligible', () => {
  run("cache_().remove('settings')");
  const c = ok(call('config', {})); assert.equal(c.new_member_promo.label, '10%'); assert.equal(c.new_member_promo.all, true);
  assert.equal(ok(call('me', {}, OLD.token, 'old@x.com')).new_member, false);
  const N3 = reg('n3@x.com', '0899999999'); assert.equal(N3.user.new_member, true); // เบอร์ซ้ำกับนักเรียนเก่า = ไม่ได้สิทธิ์
  assert.equal(reg('n4@x.com').user.new_member, false);
});
t('inactive or ended campaign: nothing applied', () => {
  ok(call('admin.coupon.save', { orig_code: 'HALLO10', code: 'HALLO10', kind: 'percent', value: 10, new_only: true, starts_at: start, ends_at: end, status: 'inactive' }, adm));
  const N2 = reg('n2@x.com');
  const q = ok(call('cart.quote', { course_ids: ['CHEM-POSN'] }, N2.token, 'n2@x.com'));
  assert.equal(q.coupon, null); assert.equal(q.promo, null);
  assert.equal(ok(call('config', {})).new_member_promo, null); assert.equal(N2.user.new_member, undefined);
});
console.log('\n' + n + ' tests passed');

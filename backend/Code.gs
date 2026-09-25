/**
 * INeedBio Classroom — Backend (Google Apps Script)
 * ฐานข้อมูล: Google Sheet · API: Web App (doPost)
 *
 * ติดตั้งครั้งแรก:
 *   1) วางไฟล์นี้ใน Apps Script project ใหม่
 *   2) รันฟังก์ชัน setup() หนึ่งครั้ง (อนุญาตสิทธิ์) → ระบบสร้าง Sheet + โฟลเดอร์สลิปให้
 *   3) Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 *   4) สมัครสมาชิกบนเว็บด้วยอีเมลตัวเอง แล้วรัน makeAdmin('อีเมลของคุณ')
 */

// ───────────────────────── ตั้งค่า ─────────────────────────
var APP = {
  NAME: 'INeedBio',
  SESSION_DAYS: 30,
  OTP_MINUTES: 10,
  OTP_MAX_TRIES: 5,
  HASH_ROUNDS: 300,
  SLIP_MAX_BYTES: 3 * 1024 * 1024,
  SUBJECTS: { bio: 'ชีววิทยา', chem: 'เคมี', phys: 'ฟิสิกส์', math: 'คณิตศาสตร์' },
  TERMS_VERSION: '2026-09-25',
  REPEAT_GRADES: ['จบ ม.6 แล้ว', 'อื่นๆ'],
  LEVELS: ['สอวน.', 'A-Level', 'ม.4', 'ม.5', 'ม.6', 'ม.ต้น', 'อื่นๆ']
};

var SCHEMA = {
  Users:       ['user_id','email','password_hash','salt','first_name','last_name','nickname','school','grade','phone','role','status','created_at','last_login_at',
                'current_faculty','current_university','dream_faculty','dream_university','terms_version','terms_accepted_at'],
  Sessions:    ['token_hash','user_id','device_id','device_info','created_at','expires_at'],
  Courses:     ['course_id','subject','title','subtitle','description','cover_url','price','status','sort_order','created_at',
                'trailer_youtube','highlights','audience','instructor_name','instructor_title','instructor_bio','instructor_photo','faq','full_price','level','pay_account_id',
                'instructor2_name','instructor2_title','instructor2_bio','instructor2_photo'],
  Lessons:     ['lesson_id','course_id','chapter','title','youtube_id','duration_min','attachment_url','is_preview','sort_order'],
  Enrollments: ['enroll_id','user_id','course_id','status','amount','slip_file_id','note','created_at','decided_by','decided_at'],
  Progress:    ['user_id','course_id','lesson_id','completed_at'],
  AdminLog:    ['time','admin_id','action','detail'],
  Settings:    ['key','value'],
  Results:     ['result_id','year','subject','nickname','school','center','review','photo_url','status','sort_order','created_at'],
  PayAccounts: ['account_id','label','method','promptpay_id','bank','account_no','account_name','qr_url','note','ig','subjects','status','sort_order','created_at'],
  Bundles:     ['bundle_id','title','subtitle','course_ids','price','cover_url','status','sort_order','created_at'],
  Coupons:     ['code','kind','value','max_discount','scope','targets','min_total','max_uses','per_user','starts_at','ends_at','status','note','created_at'],
  Orders:      ['order_id','user_id','subtotal','discount','total','coupon_code','pay_terms_hash','terms_accepted_at','created_at','expires_at'],
  Bills:       ['bill_id','order_id','user_id','account_id','account','items','subtotal','discount','total','status','proof','slip_file_id','slip_hash',
                'submitted_at','note','decided_by','decided_at','created_at','expires_at']
};

var PUBLIC_SETTINGS = ['terms_text','privacy_text','hero_eyebrow','hero_title','hero_subtitle','announcement','promptpay_id','promptpay_name','contact_ig',
  'pay_terms_text','order_expire_hours','proof_paid_at','proof_amount','proof_from_bank','proof_payer_name','proof_extra'];
var DEFAULT_SETTINGS = {
  hero_eyebrow: 'INeedBio Online',
  hero_title: 'ติวเข้ม ม.ปลาย|กับ INeedBio',
  hero_subtitle: 'คอร์สเดียว เรียนได้ตลอดชีพ ไม่มีการลบคลิป',
  announcement: '',
  promptpay_id: '0910256171',
  promptpay_name: 'INeedBio',
  contact_ig: 'ineedbiochem',
  admin_emails: '',
  terms_text: '',
  privacy_text: '',
  // การชำระเงิน — {account} = ชื่อและเลขบัญชีของบิลนั้น, {ig} = IG ติดต่อ
  pay_terms_text: '- ชำระเงินโดยโอนเข้าบัญชี {account} ที่แสดงในหน้าชำระเงินของบิลนี้เท่านั้น\n' +
    '- INeedBio ไม่รับผิดชอบทุกกรณี หากโอนเข้าบัญชีอื่นที่ไม่ได้แสดงในหน้านี้ แม้จะมีผู้อ้างว่าเป็นทีมงาน\n' +
    '- ไม่มีนโยบายคืนเงินทุกกรณีเมื่อชำระเงินแล้ว\n' +
    '- โอนแล้วแนบสลิปและกรอกข้อมูลการโอนให้ครบ แล้วแจ้งการชำระเงินทาง IG @{ig} อีกครั้ง\n' +
    '- สิทธิ์เข้าเรียนจะเปิดหลังแอดมินตรวจยอดเงินแล้ว',
  order_expire_hours: '48',
  proof_paid_at: 'required', proof_amount: 'required', proof_from_bank: 'required', proof_payer_name: 'required',
  proof_extra: ''
};

// ───────────────────────── Entry points ─────────────────────────
function doGet() {
  return json_({ ok: true, data: { service: APP.NAME + ' API', time: now_() } });
}

function doPost(e) {
  var out;
  _cache = {};
  try {
    var p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = ROUTES[p.action];
    if (!fn) throw err_('BAD_ACTION', 'ไม่รู้จักคำสั่งนี้');
    out = { ok: true, data: fn(p.data || {}, p) };
  } catch (x) {
    if (x && x.code) out = { ok: false, error: x.code, message: x.message };
    else { console.error(x && x.stack || x); out = { ok: false, error: 'SERVER', message: 'ระบบขัดข้อง ลองใหม่อีกครั้ง' }; }
  }
  return json_(out);
}

var ROUTES = {
  // สาธารณะ
  'config':            function (d) { return publicSettings_(); },
  'register.start':    registerStart_,
  'register.verify':   registerVerify_,
  'login':             login_,
  'password.forgot':   passwordForgot_,
  'password.reset':    passwordReset_,
  'courses.list':      function () { return publishedCourses_(); },
  'bundles.list':      function () { return publicBundles_(); },
  'bundle.detail':     bundleDetail_,
  'course.detail':     courseDetail_,
  // นักเรียน
  'me':                function (d, p) { return publicUser_(auth_(p)); },
  'logout':            logout_,
  'profile.update':    profileUpdate_,
  'password.change':   passwordChange_,
  'my.courses':        myCourses_,
  'learn.get':         learnGet_,
  'progress.set':      progressSet_,
  'enroll.request':    enrollRequest_,
  'cart.quote':        cartQuote_,
  'order.create':      orderCreate_,
  'my.orders':         myOrders_,
  'bill.proof':        billProof_,
  'bill.cancel':       billCancel_,
  // แอดมิน
  'admin.stats':       adminOnly_(adminStats_),
  'admin.enrollments': adminOnly_(adminEnrollments_),
  'admin.slip':        adminOnly_(adminSlip_),
  'admin.decide':      adminOnly_(adminDecide_),
  'admin.grant':       adminOnly_(adminGrant_),
  'admin.courses':     adminOnly_(adminCourses_),
  'admin.course.save': adminOnly_(adminCourseSave_),
  'admin.lessons':     adminOnly_(adminLessons_),
  'admin.lesson.save': adminOnly_(adminLessonSave_),
  'admin.lesson.delete': adminOnly_(adminLessonDelete_),
  'admin.lessons.bulk': adminOnly_(adminLessonsBulk_),
  'admin.lessons.reorder': adminOnly_(adminLessonsReorder_),
  'admin.users':       adminOnly_(adminUsers_),
  'admin.user.update': adminOnly_(adminUserUpdate_),
  'admin.user.resetDevice': adminOnly_(adminResetDevice_),
  'admin.settings':    adminOnly_(function () { return allSettings_(); }),
  'admin.settings.save': adminOnly_(adminSettingsSave_),
  'results.list':      function () { return publicResults_(); },
  'admin.results':     adminOnly_(adminResults_),
  'admin.result.save': adminOnly_(adminResultSave_),
  'admin.result.delete': adminOnly_(adminResultDelete_),
  'admin.upload':      adminOnly_(adminUpload_),
  'admin.bills':       adminOnly_(adminBills_),
  'admin.bill.slip':   adminOnly_(adminBillSlip_),
  'admin.bill.decide': adminOnly_(adminBillDecide_),
  'admin.accounts':    adminOnly_(adminAccounts_),
  'admin.account.save': adminOnly_(adminAccountSave_),
  'admin.account.delete': adminOnly_(adminAccountDelete_),
  'admin.bundles':     adminOnly_(adminBundles_),
  'admin.bundle.save': adminOnly_(adminBundleSave_),
  'admin.bundle.delete': adminOnly_(adminBundleDelete_),
  'admin.coupons':     adminOnly_(adminCoupons_),
  'admin.coupon.save': adminOnly_(adminCouponSave_),
  'admin.coupon.delete': adminOnly_(adminCouponDelete_)
};

// ───────────────────────── Setup (รันเองใน editor) ─────────────────────────
function setup() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('INeedBio DB');
  props.setProperty('SHEET_ID', ss.getId());
  Object.keys(SCHEMA).forEach(function (name) {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
    _ss = ss;
    ensureCols_(name);
  });
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  var cur = allSettings_();
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { if (!(k in cur)) setSetting_(k, DEFAULT_SETTINGS[k]); });
  if (!props.getProperty('SLIP_FOLDER_ID')) props.setProperty('SLIP_FOLDER_ID', DriveApp.createFolder('INeedBio Slips').getId());
  publicFolder_();
  console.log('Sheet: ' + ss.getUrl());
  return ss.getId();
}

/** ตั้งผู้ใช้เป็นแอดมิน: รัน makeAdmin('you@gmail.com') หลังสมัครบนเว็บแล้ว */
function makeAdmin(email) {
  var u = findOne_('Users', function (r) { return r.email === String(email).trim().toLowerCase(); });
  if (!u) throw new Error('ไม่พบผู้ใช้ ' + email + ' (สมัครบนเว็บก่อน)');
  update_('Users', u._row, { role: 'admin' });
  var list = String(getSetting_('admin_emails') || '').split(',').map(trim_).filter(String);
  if (list.indexOf(u.email) < 0) { list.push(u.email); setSetting_('admin_emails', list.join(',')); }
  console.log(u.email + ' เป็นแอดมินแล้ว');
}

/** ลบ session ที่หมดอายุ — ตั้ง trigger รายวันด้วย installTriggers() */
function cleanup() {
  var t = Date.now();
  withLock_(function () {
    var rows = read_('Sessions').filter(function (s) { return new Date(s.expires_at).getTime() < t; });
    deleteRows_('Sessions', rows);
    expireBills_();
  });
}
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'cleanup') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cleanup').timeBased().everyDays(1).atHour(3).create();
}

// ───────────────────────── Auth ─────────────────────────
function registerStart_(d) {
  var f = {
    email: normEmail_(d.email),
    first_name: req_(d.first_name, 'ชื่อ', 60), last_name: req_(d.last_name, 'นามสกุล', 60),
    nickname: req_(d.nickname, 'ชื่อเล่น', 30), school: req_(d.school, 'โรงเรียน', 120),
    grade: req_(d.grade, 'ระดับชั้น', 20), phone: phone_(d.phone)
  };
  goals_(d, f);
  if (d.accept_terms !== true && d.accept_terms !== 'true') throw err_('BAD_INPUT', 'กรุณายอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัวก่อนสมัคร');
  f.terms_version = APP.TERMS_VERSION; f.terms_accepted_at = now_();
  checkPassword_(d.password);
  if (userByEmail_(f.email)) throw err_('EMAIL_TAKEN', 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบหรือกดลืมรหัสผ่าน');
  rate_('otp1:' + f.email, 1, 60, 'รอ 1 นาทีก่อนขอรหัสใหม่');
  rate_('otpH:' + f.email, 6, 3600, 'ขอรหัสบ่อยเกินไป ลองใหม่ในอีก 1 ชั่วโมง');
  var salt = rand_(16);
  f.salt = salt; f.password_hash = hashPw_(d.password, salt);
  var otp = otp_();
  cache_().put('reg:' + f.email, JSON.stringify({ otp: sha256_(otp), tries: 0, f: f }), APP.OTP_MINUTES * 60);
  sendOtpEmail_(f.email, otp, f.nickname, 'register');
  return { email: f.email, expires_in: APP.OTP_MINUTES * 60 };
}

function registerVerify_(d, p) {
  var email = normEmail_(d.email);
  var key = 'reg:' + email;
  var st = checkOtp_(key, d.otp);
  return withLock_(function () {
    ensureCols_('Users');
    if (userByEmail_(email)) throw err_('EMAIL_TAKEN', 'อีเมลนี้สมัครไว้แล้ว');
    var f = st.f;
    var u = {
      user_id: 'U' + id_(), email: email, password_hash: f.password_hash, salt: f.salt,
      first_name: f.first_name, last_name: f.last_name, nickname: f.nickname, school: f.school,
      grade: f.grade, phone: f.phone, role: 'student', status: 'active', created_at: now_(), last_login_at: now_(),
      current_faculty: f.current_faculty, current_university: f.current_university, dream_faculty: f.dream_faculty, dream_university: f.dream_university,
      terms_version: f.terms_version, terms_accepted_at: f.terms_accepted_at
    };
    append_('Users', u);
    cache_().remove(key);
    return { token: newSession_(u.user_id, p), user: publicUser_(u) };
  });
}

function login_(d, p) {
  var email = normEmail_(d.email);
  rate_('login:' + email, 8, 900, 'ลองเข้าสู่ระบบหลายครั้งเกินไป รอ 15 นาทีแล้วลองใหม่');
  var u = userByEmail_(email);
  if (!u || hashPw_(String(d.password || ''), u.salt) !== u.password_hash) throw err_('BAD_LOGIN', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  if (u.status !== 'active') throw err_('BANNED', 'บัญชีนี้ถูกระงับ ติดต่อแอดมินทาง IG');
  return withLock_(function () {
    update_('Users', u._row, { last_login_at: now_() });
    return { token: newSession_(u.user_id, p), user: publicUser_(u) };
  });
}

function logout_(d, p) {
  var th = sha256_(String(p.token || ''));
  withLock_(function () { deleteRows_('Sessions', read_('Sessions').filter(function (s) { return s.token_hash === th; })); });
  cache_().remove('s:' + th);
  return true;
}

function passwordForgot_(d) {
  var email = normEmail_(d.email);
  var u = userByEmail_(email);
  if (u && u.status === 'active') {
    rate_('otp1:' + email, 1, 60, 'รอ 1 นาทีก่อนขอรหัสใหม่');
    rate_('otpH:' + email, 6, 3600, 'ขอรหัสบ่อยเกินไป ลองใหม่ในอีก 1 ชั่วโมง');
    var otp = otp_();
    cache_().put('rst:' + email, JSON.stringify({ otp: sha256_(otp), tries: 0 }), APP.OTP_MINUTES * 60);
    sendOtpEmail_(email, otp, u.nickname, 'reset');
  }
  return { email: email }; // ตอบเหมือนกันเสมอ ไม่บอกว่ามีอีเมลนี้ในระบบไหม
}

function passwordReset_(d, p) {
  var email = normEmail_(d.email);
  checkPassword_(d.password);
  checkOtp_('rst:' + email, d.otp);
  return withLock_(function () {
    var u = userByEmail_(email);
    if (!u) throw err_('OTP_INVALID', 'รหัสไม่ถูกต้อง');
    var salt = rand_(16);
    update_('Users', u._row, { salt: salt, password_hash: hashPw_(d.password, salt), last_login_at: now_() });
    cache_().remove('rst:' + email);
    return { token: newSession_(u.user_id, p), user: publicUser_(u) };
  });
}

function passwordChange_(d, p) {
  var u = auth_(p);
  if (hashPw_(String(d.old_password || ''), u.salt) !== u.password_hash) throw err_('BAD_LOGIN', 'รหัสผ่านเดิมไม่ถูกต้อง');
  checkPassword_(d.password);
  var salt = rand_(16);
  withLock_(function () { update_('Users', u._row, { salt: salt, password_hash: hashPw_(d.password, salt) }); });
  return true;
}

function profileUpdate_(d, p) {
  var u = auth_(p);
  var patch = {
    first_name: req_(d.first_name, 'ชื่อ', 60), last_name: req_(d.last_name, 'นามสกุล', 60),
    nickname: req_(d.nickname, 'ชื่อเล่น', 30), school: req_(d.school, 'โรงเรียน', 120),
    grade: req_(d.grade, 'ระดับชั้น', 20), phone: phone_(d.phone)
  };
  goals_(d, patch);
  withLock_(function () { ensureCols_('Users'); update_('Users', u._row, patch); });
  for (var k in patch) u[k] = patch[k];
  return publicUser_(u);
}

/** สร้าง session ใหม่ และเตะ session เก่าของผู้ใช้คนนี้ออกทั้งหมด (1 บัญชี = 1 เครื่อง) — ต้องเรียกภายใน lock */
function newSession_(userId, p) {
  var old = read_('Sessions').filter(function (s) { return s.user_id === userId; });
  old.forEach(function (s) {
    cache_().remove('s:' + s.token_hash);
    if (s.device_id !== String(p.device_id || '')) cache_().put('gone:' + s.token_hash, '1', 21600);
  });
  deleteRows_('Sessions', old);
  var token = rand_(32);
  append_('Sessions', {
    token_hash: sha256_(token), user_id: userId,
    device_id: clip_(p.device_id, 64), device_info: clip_(p.device_info, 120),
    created_at: now_(), expires_at: new Date(Date.now() + APP.SESSION_DAYS * 864e5).toISOString()
  });
  return token;
}

function auth_(p) {
  var token = String((p && p.token) || '');
  if (!token) throw err_('AUTH', 'กรุณาเข้าสู่ระบบ');
  var th = sha256_(token);
  var uid = cache_().get('s:' + th);
  if (!uid) {
    var s = findOne_('Sessions', function (r) { return r.token_hash === th; });
    if (!s) {
      if (cache_().get('gone:' + th)) throw err_('SESSION_REPLACED', 'บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น จึงออกจากระบบในเครื่องนี้แล้ว');
      throw err_('AUTH', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    if (new Date(s.expires_at).getTime() < Date.now()) throw err_('AUTH', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    uid = s.user_id;
    cache_().put('s:' + th, uid, 600);
  }
  var u = findOne_('Users', function (r) { return r.user_id === uid; });
  if (!u) throw err_('AUTH', 'กรุณาเข้าสู่ระบบ');
  if (u.status !== 'active') throw err_('BANNED', 'บัญชีนี้ถูกระงับ ติดต่อแอดมินทาง IG');
  return u;
}

function adminOnly_(fn) {
  return function (d, p) {
    var u = auth_(p);
    if (u.role !== 'admin') throw err_('FORBIDDEN', 'หน้านี้สำหรับแอดมินเท่านั้น');
    return fn(d, p, u);
  };
}

function checkOtp_(key, otp) {
  var raw = cache_().get(key);
  if (!raw) throw err_('OTP_EXPIRED', 'รหัสหมดอายุแล้ว กดขอรหัสใหม่');
  var st = JSON.parse(raw);
  if (st.tries >= APP.OTP_MAX_TRIES) { cache_().remove(key); throw err_('OTP_EXPIRED', 'กรอกผิดเกิน 5 ครั้ง กดขอรหัสใหม่'); }
  if (sha256_(String(otp || '').replace(/\D/g, '')) !== st.otp) {
    st.tries++;
    cache_().put(key, JSON.stringify(st), APP.OTP_MINUTES * 60);
    throw err_('OTP_INVALID', 'รหัสไม่ถูกต้อง (เหลืออีก ' + (APP.OTP_MAX_TRIES - st.tries) + ' ครั้ง)');
  }
  return st;
}

// ───────────────────────── คอร์ส (สาธารณะ) ─────────────────────────
function publishedCourses_() {
  var c = cache_().get('pub_courses');
  if (c) return JSON.parse(c);
  var lessons = read_('Lessons');
  var list = read_('Courses').filter(function (x) { return x.status === 'published'; })
    .sort(bySort_).map(function (x) { return courseCard_(x, lessons); });
  cache_().put('pub_courses', JSON.stringify(list), 300);
  return list;
}

function courseCard_(x, lessons) {
  var ls = lessons.filter(function (l) { return l.course_id === x.course_id; });
  var mins = ls.reduce(function (a, l) { return a + (Number(l.duration_min) || 0); }, 0);
  return {
    course_id: x.course_id, subject: x.subject, subject_name: APP.SUBJECTS[x.subject] || x.subject,
    title: x.title, subtitle: x.subtitle, description: x.description, cover_url: x.cover_url,
    price: Number(x.price) || 0, full_price: Number(x.full_price) || 0, level: x.level || '', status: x.status, lesson_count: ls.length, total_min: mins
  };
}

function instructors_(x) {
  return [['instructor_name', 'instructor_title', 'instructor_bio', 'instructor_photo'], ['instructor2_name', 'instructor2_title', 'instructor2_bio', 'instructor2_photo']]
    .filter(function (k) { return x[k[0]]; }).map(function (k) { return { name: x[k[0]], title: x[k[1]] || '', bio: x[k[2]] || '', photo: x[k[3]] || '' }; });
}
function bundleDetail_(d) {
  var b = publicBundles_().filter(function (x) { return x.bundle_id === d.bundle_id; })[0];
  if (!b) throw err_('NOT_FOUND', 'ไม่พบแพ็กเกจนี้ หรือยังไม่เปิดขาย');
  var courses = read_('Courses'), lessons = read_('Lessons'), seen = {};
  b.items = b.course_ids.map(function (id) {
    var x = courses.filter(function (c) { return c.course_id === id; })[0];
    var card = courseCard_(x, lessons);
    card.instructors = instructors_(x);
    card.highlights = lines_(x.highlights, 12, 200);
    card.chapters = chapters_(lessons.filter(function (l) { return l.course_id === id; }), function () { return 1; }).map(function (ch) { return { title: ch.title, count: ch.lessons.length }; });
    return card;
  });
  b.instructors = [];
  b.items.forEach(function (c) { c.instructors.forEach(function (t) { if (!seen[t.name]) { seen[t.name] = 1; b.instructors.push(t); } }); });
  b.lesson_count = b.items.reduce(function (a, c) { return a + c.lesson_count; }, 0);
  b.total_min = b.items.reduce(function (a, c) { return a + c.total_min; }, 0);
  return b;
}

function courseDetail_(d, p) {
  var x = findOne_('Courses', function (r) { return r.course_id === d.course_id; });
  if (!x || x.status !== 'published') throw err_('NOT_FOUND', 'ไม่พบคอร์สนี้');
  var lessons = read_('Lessons');
  var out = courseCard_(x, lessons);
  out.chapters = chapters_(lessons.filter(function (l) { return l.course_id === x.course_id; }), function (l) {
    var pv = truthy_(l.is_preview);
    return { lesson_id: l.lesson_id, title: l.title, duration_min: Number(l.duration_min) || 0, is_preview: pv, youtube_id: pv ? l.youtube_id : '' };
  });
  out.trailer_id = x.trailer_youtube || '';
  out.highlights = lines_(x.highlights, 12, 200);
  out.audience = lines_(x.audience, 10, 200);
  out.instructors = instructors_(x);
  out.instructor = out.instructors[0] || null;
  out.faq = parseFaq_(x.faq);
  out.bundles = publicBundles_().filter(function (b) { return b.course_ids.indexOf(x.course_id) >= 0; });
  out.enrollment = null;
  if (p.token) {
    try {
      var u = auth_(p); var e = latestEnroll_(u.user_id, x.course_id); out.enrollment = e ? e.status : null; out.note = e ? e.note : '';
      var bl = read_('Bills').filter(function (b) { return b.user_id === u.user_id && BILL_OPEN.indexOf(billStatus_(b)) >= 0 && jsonParse_(b.items, []).some(function (i) { return i.course_id === x.course_id; }); })[0];
      out.bill = bl ? { bill_id: bl.bill_id, order_id: bl.order_id, status: billStatus_(bl) } : null;
    } catch (ignore) {}
  }
  return out;
}

// ───────────────────────── นักเรียน ─────────────────────────
function myCourses_(d, p) {
  var u = auth_(p);
  var courses = read_('Courses'), lessons = read_('Lessons');
  var prog = read_('Progress').filter(function (r) { return r.user_id === u.user_id; });
  var seen = {};
  return read_('Enrollments').filter(function (e) { return e.user_id === u.user_id; })
    .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })
    .filter(function (e) { if (seen[e.course_id]) return false; seen[e.course_id] = 1; return true; })
    .map(function (e) {
      var c = courses.filter(function (x) { return x.course_id === e.course_id; })[0];
      if (!c) return null;
      var card = courseCard_(c, lessons);
      var ids = lessons.filter(function (l) { return l.course_id === c.course_id; }).map(function (l) { return l.lesson_id; });
      var done = prog.filter(function (r) { return ids.indexOf(r.lesson_id) >= 0; });
      var last = done.sort(function (a, b) { return a.completed_at < b.completed_at ? 1 : -1; })[0];
      card.enrollment = e.status; card.note = e.note; card.requested_at = e.created_at;
      card.done_count = done.length;
      card.percent = ids.length ? Math.round(done.length / ids.length * 100) : 0;
      card.last_lesson_id = last ? last.lesson_id : '';
      return card;
    }).filter(Boolean);
}

function learnGet_(d, p) {
  var u = auth_(p);
  var x = findOne_('Courses', function (r) { return r.course_id === d.course_id; });
  if (!x) throw err_('NOT_FOUND', 'ไม่พบคอร์สนี้');
  var e = latestEnroll_(u.user_id, x.course_id);
  var ok = u.role === 'admin' || (e && e.status === 'approved');
  if (!ok) throw err_('NO_ACCESS', 'คอร์สนี้ยังไม่ได้รับสิทธิ์เข้าเรียน');
  var lessons = read_('Lessons');
  var done = {};
  read_('Progress').forEach(function (r) { if (r.user_id === u.user_id && r.course_id === x.course_id) done[r.lesson_id] = 1; });
  var out = courseCard_(x, lessons);
  out.chapters = chapters_(lessons.filter(function (l) { return l.course_id === x.course_id; }), function (l) {
    return { lesson_id: l.lesson_id, title: l.title, duration_min: Number(l.duration_min) || 0, youtube_id: l.youtube_id,
             attachment_url: l.attachment_url, done: !!done[l.lesson_id] };
  });
  out.watermark = u.email + ' · ' + u.user_id;
  return out;
}

function progressSet_(d, p) {
  var u = auth_(p);
  var l = findOne_('Lessons', function (r) { return r.lesson_id === d.lesson_id; });
  if (!l) throw err_('NOT_FOUND', 'ไม่พบบทเรียน');
  var e = latestEnroll_(u.user_id, l.course_id);
  if (u.role !== 'admin' && !(e && e.status === 'approved')) throw err_('NO_ACCESS', 'ยังไม่ได้รับสิทธิ์');
  withLock_(function () {
    var rows = read_('Progress').filter(function (r) { return r.user_id === u.user_id && r.lesson_id === l.lesson_id; });
    if (d.done && !rows.length) append_('Progress', { user_id: u.user_id, course_id: l.course_id, lesson_id: l.lesson_id, completed_at: now_() });
    if (!d.done && rows.length) deleteRows_('Progress', rows);
  });
  return { lesson_id: l.lesson_id, done: !!d.done };
}

function enrollRequest_(d, p) {
  var u = auth_(p);
  var c = findOne_('Courses', function (r) { return r.course_id === d.course_id; });
  if (!c || c.status !== 'published') throw err_('NOT_FOUND', 'ไม่พบคอร์สนี้');
  var prev = latestEnroll_(u.user_id, c.course_id);
  if (prev && prev.status === 'approved') throw err_('ALREADY', 'คุณมีสิทธิ์เข้าเรียนคอร์สนี้แล้ว');
  if (prev && prev.status === 'pending') throw err_('ALREADY', 'ส่งสลิปไปแล้ว กำลังรอแอดมินตรวจ');
  var s = d.slip || {};
  if (!/^image\/(jpeg|png|webp)$/.test(s.mime || '')) throw err_('BAD_INPUT', 'แนบสลิปเป็นรูปภาพ (JPG หรือ PNG)');
  if (!s.base64 || s.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err_('BAD_INPUT', 'รูปสลิปใหญ่เกิน 3 MB');
  rate_('slip:' + u.user_id, 5, 3600, 'ส่งสลิปบ่อยเกินไป ลองใหม่ภายหลัง');
  var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('SLIP_FOLDER_ID'));
  var enrollId = 'E' + id_();
  var ext = s.mime === 'image/png' ? 'png' : 'jpg';
  var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(s.base64), s.mime, enrollId + '_' + u.user_id + '.' + ext));
  var e = {
    enroll_id: enrollId, user_id: u.user_id, course_id: c.course_id, status: 'pending',
    amount: String(Number(c.price) || 0), slip_file_id: file.getId(), note: '', created_at: now_(), decided_by: '', decided_at: ''
  };
  withLock_(function () { append_('Enrollments', e); });
  notifyAdmins_('มีคำขอเข้าเรียนใหม่: ' + c.title,
    [['นักเรียน', u.first_name + ' ' + u.last_name + ' (' + u.nickname + ')'], ['อีเมล', u.email], ['เบอร์', u.phone],
     ['คอร์ส', c.title], ['ยอดที่ต้องโอน', '฿' + e.amount], ['รหัสคำขอ', enrollId]],
    'เข้าหลังบ้าน → คำขอเข้าเรียน เพื่อตรวจสลิปและอนุมัติ');
  return { enroll_id: enrollId, status: 'pending' };
}

// ───────────────────────── ร้านค้า: ตะกร้า · บิล · บัญชีรับเงิน · โค้ดส่วนลด ─────────────────────────
var BILL_OPEN = ['awaiting_payment', 'reviewing', 'rejected'];      // บิลที่ยังค้างอยู่ (คอร์สในบิลนี้ใส่ตะกร้าซ้ำไม่ได้)
var BILL_LIVE = ['awaiting_payment', 'reviewing', 'rejected', 'approved']; // นับว่าใช้โค้ดส่วนลดแล้ว
var PROOF_KEYS = ['paid_at', 'amount', 'from_bank', 'payer_name'];
var BANKS = ['กสิกรไทย', 'ไทยพาณิชย์', 'กรุงเทพ', 'กรุงไทย', 'กรุงศรีอยุธยา', 'ทหารไทยธนชาต (ttb)', 'ออมสิน', 'ธ.ก.ส.', 'ยูโอบี', 'ซีไอเอ็มบี ไทย', 'เกียรตินาคินภัทร', 'แลนด์ แอนด์ เฮ้าส์', 'ทิสโก้', 'อาคารสงเคราะห์', 'TrueMoney Wallet', 'อื่นๆ'];

function jsonParse_(s, dflt) { try { return s ? JSON.parse(s) : dflt; } catch (e) { return dflt; } }
function csv_(v) { return (Array.isArray(v) ? v : String(v || '').split(',')).map(trim_).filter(String); }
function money_(v) { var n = Math.round(Number(v)); return n >= 0 ? n : 0; }
function expireHours_() { var h = Number(getSetting_('order_expire_hours')); return h > 0 ? Math.min(h, 720) : 48; }

/** บัญชีหลัก (ใช้เมื่อวิชา/คอร์สไม่ได้ผูกบัญชี) มาจาก ตั้งค่า → พร้อมเพย์ */
function defaultAccount_() {
  return { account_id: 'DEFAULT', label: 'บัญชีหลัก', method: 'promptpay', promptpay_id: String(getSetting_('promptpay_id') || '').replace(/\D/g, ''),
    bank: '', account_no: '', account_name: getSetting_('promptpay_name') || APP.NAME, qr_url: '', note: '', ig: '', subjects: '', status: 'active' };
}
function activeAccounts_() { return read_('PayAccounts').filter(function (a) { return a.status !== 'inactive'; }).sort(bySort_); }
function accountFor_(c, accs) {
  if (c.pay_account_id) { var own = accs.filter(function (a) { return a.account_id === c.pay_account_id; })[0]; if (own) return own; }
  return accs.filter(function (a) { return csv_(a.subjects).indexOf(c.subject) >= 0; })[0] || defaultAccount_();
}
/** ข้อมูลบัญชีที่นักเรียนเห็น (ไม่มีชื่อเรียกภายใน) */
function accountPublic_(a) {
  return { account_id: a.account_id, method: a.method === 'bank' ? 'bank' : 'promptpay', promptpay_id: a.promptpay_id || '', bank: a.bank || '',
    account_no: a.account_no || '', account_name: a.account_name || '', qr_url: a.qr_url || '', note: a.note || '', ig: a.ig || getSetting_('contact_ig') || '' };
}

/** เปลี่ยนบิลที่เลยเวลาเป็น expired — ต้องเรียกภายใน lock */
function expireBills_() {
  var t = Date.now();
  read_('Bills').forEach(function (b) {
    if ((b.status === 'awaiting_payment' || b.status === 'rejected') && b.expires_at && new Date(b.expires_at).getTime() < t) update_('Bills', b._row, { status: 'expired' });
  });
}
function isExpired_(b) { return (b.status === 'awaiting_payment' || b.status === 'rejected') && b.expires_at && new Date(b.expires_at).getTime() < Date.now(); }
function billStatus_(b) { return isExpired_(b) ? 'expired' : b.status; }

/** คอร์สที่ผู้ใช้มีสิทธิ์แล้ว หรืออยู่ในบิลที่ค้างอยู่ */
function ownedMap_(uid) {
  var o = {};
  read_('Enrollments').forEach(function (e) { if (e.user_id === uid && (e.status === 'approved' || e.status === 'pending')) o[e.course_id] = e.status === 'approved' ? 'owned' : 'pending'; });
  read_('Bills').forEach(function (b) {
    if (b.user_id !== uid || BILL_OPEN.indexOf(billStatus_(b)) < 0) return;
    jsonParse_(b.items, []).forEach(function (it) { if (!o[it.course_id]) o[it.course_id] = 'in_bill'; });
  });
  return o;
}

// ── โค้ดส่วนลด ──
function normCode_(c) { return String(c || '').trim().toUpperCase().replace(/\s+/g, ''); }
function couponUses_(code, uid) {
  var orders = {};
  read_('Bills').forEach(function (b) { if (BILL_LIVE.indexOf(billStatus_(b)) >= 0) orders[b.order_id] = 1; });
  return read_('Orders').filter(function (o) { return o.coupon_code === code && orders[o.order_id] && (!uid || o.user_id === uid); }).length;
}
/** คืน { discount per course_id, total discount } หรือ throw ถ้าใช้ไม่ได้ */
function applyCoupon_(code, items, u) {
  var cp = findOne_('Coupons', function (r) { return r.code === code; });
  if (!cp || cp.status !== 'active') throw err_('COUPON', 'ไม่พบโค้ด ' + code + ' หรือโค้ดนี้ปิดใช้งานแล้ว');
  var t = Date.now();
  if (cp.starts_at && new Date(cp.starts_at).getTime() > t) throw err_('COUPON', 'โค้ดนี้ยังไม่เริ่มใช้');
  if (cp.ends_at && new Date(cp.ends_at).getTime() < t) throw err_('COUPON', 'โค้ดนี้หมดอายุแล้ว');
  var targets = csv_(cp.targets);
  var elig = items.filter(function (it) { return cp.scope === 'subject' ? targets.indexOf(it.subject) >= 0 : cp.scope === 'course' ? targets.indexOf(it.course_id) >= 0 : true; });
  if (!elig.length) throw err_('COUPON', 'โค้ดนี้ใช้กับคอร์สในตะกร้าไม่ได้');
  var base = elig.reduce(function (a, it) { return a + it.base; }, 0);
  if (Number(cp.min_total) > 0 && base < Number(cp.min_total)) throw err_('COUPON', 'โค้ดนี้ใช้ได้เมื่อซื้อคอร์สที่ร่วมรายการครบ ฿' + Number(cp.min_total).toLocaleString());
  if (Number(cp.max_uses) > 0 && couponUses_(code) >= Number(cp.max_uses)) throw err_('COUPON', 'โค้ดนี้ถูกใช้ครบจำนวนแล้ว');
  if (u && Number(cp.per_user) > 0 && couponUses_(code, u.user_id) >= Number(cp.per_user)) throw err_('COUPON', 'คุณใช้โค้ดนี้ครบจำนวนครั้งแล้ว');
  var v = Number(cp.value) || 0;
  var raw = cp.kind === 'percent' ? base * Math.min(v, 100) / 100 : v;
  if (cp.kind === 'percent' && Number(cp.max_discount) > 0) raw = Math.min(raw, Number(cp.max_discount));
  var total = Math.min(Math.floor(raw), base);
  // แบ่งส่วนลดตามสัดส่วนราคา (เป็นบาทเต็ม) เศษไปลงคอร์สที่แพงสุด
  var per = {}, given = 0;
  elig.forEach(function (it) { per[it.course_id] = base ? Math.floor(total * it.base / base) : 0; given += per[it.course_id]; });
  var top = elig.slice().sort(function (a, b) { return b.base - a.base; })[0];
  per[top.course_id] += total - given;
  return { per: per, total: total, label: cp.kind === 'percent' ? 'ลด ' + v + '%' + (Number(cp.max_discount) > 0 ? ' (สูงสุด ฿' + Number(cp.max_discount).toLocaleString() + ')' : '') : 'ลด ฿' + v.toLocaleString() };
}

/** คำนวณตะกร้า: แยกบิลตามบัญชีรับเงิน + ส่วนลด */
function priceCart_(ids, code, u) {
  ids = (Array.isArray(ids) ? ids : []).map(String).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, 30);
  var courses = read_('Courses'), accs = activeAccounts_(), own = u ? ownedMap_(u.user_id) : {};
  var items = [], missing = [];
  ids.forEach(function (id) {
    var c = courses.filter(function (x) { return x.course_id === id && x.status === 'published'; })[0];
    if (!c) { missing.push(id); return; }
    var a = accountFor_(c, accs);
    items.push({ course_id: c.course_id, title: c.title, subject: c.subject, subject_name: APP.SUBJECTS[c.subject] || c.subject, cover_url: c.cover_url,
      price: money_(c.price), discount: 0, bundle_discount: 0, coupon_discount: 0, bundle: '', net: money_(c.price), account_id: a.account_id, blocked: own[c.course_id] || '' });
  });
  var ok = items.filter(function (it) { return !it.blocked; });
  var bd = applyBundles_(ok, u);
  ok.forEach(function (it) { it.base = it.price - it.bundle_discount; it.discount = it.bundle_discount; it.net = it.base; });
  var coupon = null;
  code = normCode_(code);
  if (code && ok.length) {
    try {
      var r = applyCoupon_(code, ok, u);
      ok.forEach(function (it) { it.coupon_discount = r.per[it.course_id] || 0; it.discount = it.bundle_discount + it.coupon_discount; it.net = it.price - it.discount; });
      coupon = { code: code, ok: true, label: r.label, discount: r.total };
    } catch (e) { if (e.code !== 'COUPON') throw e; coupon = { code: code, ok: false, message: e.message }; }
  }
  var groups = {}, order = [];
  ok.forEach(function (it) {
    if (!groups[it.account_id]) { var a = it.account_id === 'DEFAULT' ? defaultAccount_() : accs.filter(function (x) { return x.account_id === it.account_id; })[0]; groups[it.account_id] = { account: accountPublic_(a), items: [] }; order.push(it.account_id); }
    groups[it.account_id].items.push(it);
  });
  var bills = order.map(function (k) {
    var g = groups[k], sub = 0, dis = 0;
    g.items.forEach(function (it) { sub += it.price; dis += it.discount; });
    return { account: g.account, items: g.items, subtotal: sub, discount: dis, total: sub - dis };
  });
  var subtotal = ok.reduce(function (a, it) { return a + it.price; }, 0), discount = ok.reduce(function (a, it) { return a + it.discount; }, 0);
  return { items: items, missing: missing, bills: bills, subtotal: subtotal, discount: discount, total: subtotal - discount, coupon: coupon,
    bundles: bd.applied, bundle_discount: ok.reduce(function (a, it) { return a + it.bundle_discount; }, 0), suggest: bd.suggest };
}

function cartQuote_(d, p) {
  var u = null;
  if (p.token) { try { u = auth_(p); } catch (e) { if (e.code === 'BANNED' || e.code === 'SESSION_REPLACED') throw e; } }
  return priceCart_(d.course_ids, d.coupon, u);
}

function orderCreate_(d, p) {
  var u = auth_(p);
  if (d.accept_pay_terms !== true && d.accept_pay_terms !== 'true') throw err_('BAD_INPUT', 'กรุณาติ๊กยอมรับข้อตกลงการชำระเงินก่อน');
  rate_('order:' + u.user_id, 10, 3600, 'สร้างคำสั่งซื้อบ่อยเกินไป ลองใหม่ภายหลัง');
  return withLock_(function () {
    ['Orders', 'Bills'].forEach(ensureCols_);
    expireBills_();
    var q = priceCart_(d.course_ids, d.coupon, u);
    if (q.missing.length) throw err_('BAD_INPUT', 'มีคอร์สที่ปิดขายแล้วในตะกร้า ลบออกแล้วลองใหม่');
    var bad = q.items.filter(function (it) { return it.blocked; })[0];
    if (bad) throw err_('ALREADY', bad.blocked === 'owned' ? 'คุณมีคอร์ส ' + bad.title + ' แล้ว ลบออกจากตะกร้าก่อน' : 'คอร์ส ' + bad.title + ' อยู่ในคำสั่งซื้อที่ยังไม่เสร็จ ดูได้ที่หน้าคำสั่งซื้อ');
    if (!q.items.length) throw err_('BAD_INPUT', 'ตะกร้าว่าง');
    if (q.coupon && !q.coupon.ok) throw err_('COUPON', q.coupon.message);
    var now = now_(), exp = new Date(Date.now() + expireHours_() * 36e5).toISOString();
    var oid = 'OD' + id_().slice(-8);
    append_('Orders', { order_id: oid, user_id: u.user_id, subtotal: q.subtotal, discount: q.discount, total: q.total, coupon_code: q.coupon ? q.coupon.code : '',
      pay_terms_hash: sha256_(getSetting_('pay_terms_text') || '').slice(0, 12), terms_accepted_at: now, created_at: now, expires_at: exp });
    var accs = read_('PayAccounts');
    q.bills.forEach(function (b, i) {
      var full = b.account.account_id === 'DEFAULT' ? defaultAccount_() : accs.filter(function (a) { return a.account_id === b.account.account_id; })[0];
      append_('Bills', { bill_id: oid + '-' + (i + 1), order_id: oid, user_id: u.user_id, account_id: b.account.account_id,
        account: JSON.stringify({ label: full.label || '', pub: b.account }),
        items: JSON.stringify(b.items.map(function (it) { return { course_id: it.course_id, title: it.title, subject: it.subject, price: it.price, discount: it.discount, net: it.net, bundle: it.bundle, bundle_discount: it.bundle_discount, coupon_discount: it.coupon_discount }; })),
        subtotal: b.subtotal, discount: b.discount, total: b.total, status: b.total > 0 ? 'awaiting_payment' : 'approved', proof: '', slip_file_id: '', slip_hash: '',
        submitted_at: '', note: b.total > 0 ? '' : 'ยอด 0 บาท เปิดสิทธิ์อัตโนมัติ', decided_by: b.total > 0 ? '' : 'SYSTEM', decided_at: b.total > 0 ? '' : now, created_at: now, expires_at: exp });
      if (!(b.total > 0)) b.items.forEach(function (it) {
        append_('Enrollments', { enroll_id: 'E' + id_(), user_id: u.user_id, course_id: it.course_id, status: 'approved', amount: '0', slip_file_id: '',
          note: 'บิล ' + oid + '-' + (i + 1) + ' (0 บาท)', created_at: now, decided_by: 'SYSTEM', decided_at: now });
      });
    });
    return { order_id: oid };
  });
}

function billPublic_(b) {
  var acc = jsonParse_(b.account, {});
  return { bill_id: b.bill_id, order_id: b.order_id, status: billStatus_(b), items: jsonParse_(b.items, []), subtotal: Number(b.subtotal) || 0,
    discount: Number(b.discount) || 0, total: Number(b.total) || 0, account: acc.pub || {}, proof: jsonParse_(b.proof, null), has_slip: !!b.slip_file_id,
    note: b.note, created_at: b.created_at, expires_at: b.expires_at, submitted_at: b.submitted_at, decided_at: b.decided_at };
}

function myOrders_(d, p) {
  var u = auth_(p);
  var bills = read_('Bills').filter(function (b) { return b.user_id === u.user_id; });
  return read_('Orders').filter(function (o) { return o.user_id === u.user_id && (!d.order_id || o.order_id === d.order_id); })
    .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 30).map(function (o) {
      return { order_id: o.order_id, created_at: o.created_at, subtotal: Number(o.subtotal) || 0, discount: Number(o.discount) || 0, total: Number(o.total) || 0,
        coupon_code: o.coupon_code, bills: bills.filter(function (b) { return b.order_id === o.order_id; }).sort(function (a, b) { return a.bill_id < b.bill_id ? -1 : 1; }).map(billPublic_) };
    });
}

/** ฟิลด์แจ้งโอนที่แอดมินตั้งไว้: required / optional / hidden */
function proofModes_() {
  var o = {};
  PROOF_KEYS.forEach(function (k) { var v = getSetting_('proof_' + k); o[k] = v === 'optional' || v === 'hidden' ? v : 'required'; });
  return o;
}
function proofExtra_() {
  return String(getSetting_('proof_extra') || '').split(/\r?\n/).map(trim_).filter(String).slice(0, 6).map(function (l, i) {
    var p = l.split('|'); return { key: 'x' + (i + 1), label: clip_(p[0], 60), required: /^(required|บังคับ)$/i.test(trim_(p[1])) };
  });
}

function billProof_(d, p) {
  var u = auth_(p);
  var s = d.slip || {};
  if (!/^image\/(jpeg|png|webp)$/.test(s.mime || '')) throw err_('BAD_INPUT', 'แนบรูปสลิป (JPG หรือ PNG)');
  if (!s.base64 || s.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err_('BAD_INPUT', 'รูปสลิปใหญ่เกิน 3 MB');
  var modes = proofModes_(), proof = {};
  var need = function (k, label) { var v = clip_(d[k], 120); if (modes[k] === 'required' && !v) throw err_('BAD_INPUT', 'กรอก' + label); return modes[k] === 'hidden' ? '' : v; };
  var paid = need('paid_at', 'วันและเวลาที่โอน');
  if (paid) {
    var pt = new Date(paid).getTime();
    if (isNaN(pt)) throw err_('BAD_INPUT', 'วันเวลาที่โอนไม่ถูกต้อง');
    if (pt > Date.now() + 10 * 60000) throw err_('BAD_INPUT', 'วันเวลาที่โอนอยู่ในอนาคต ตรวจอีกครั้ง');
    proof.paid_at = new Date(pt).toISOString();
  }
  var amt = need('amount', 'ยอดที่โอน');
  if (amt) { var n = Number(String(amt).replace(/[,฿\s]/g, '')); if (!(n > 0)) throw err_('BAD_INPUT', 'ยอดที่โอนต้องเป็นตัวเลข'); proof.amount = Math.round(n * 100) / 100; }
  proof.from_bank = need('from_bank', 'ธนาคารที่โอนออก');
  proof.payer_name = need('payer_name', 'ชื่อเจ้าของบัญชีที่โอน');
  proof.payer_relation = clip_(d.payer_relation, 60);
  proofExtra_().forEach(function (x) { var v = clip_(d[x.key], 200); if (x.required && !v) throw err_('BAD_INPUT', 'กรอก' + x.label); if (v) proof[x.label] = v; });
  rate_('slip:' + u.user_id, 8, 3600, 'ส่งสลิปบ่อยเกินไป ลองใหม่ภายหลัง');
  var hash = sha256_(s.base64);
  var out = withLock_(function () {
    ensureCols_('Bills');
    var b = findOne_('Bills', function (r) { return r.bill_id === d.bill_id && r.user_id === u.user_id; });
    if (!b) throw err_('NOT_FOUND', 'ไม่พบบิลนี้');
    if (isExpired_(b)) { update_('Bills', b._row, { status: 'expired' }); throw err_('EXPIRED', 'บิลนี้หมดเวลาชำระแล้ว ใส่คอร์สลงตะกร้าแล้วสั่งซื้อใหม่ได้'); }
    if (b.status === 'reviewing') throw err_('ALREADY', 'ส่งหลักฐานแล้ว กำลังรอแอดมินตรวจ');
    if (b.status !== 'awaiting_payment' && b.status !== 'rejected') throw err_('ALREADY', 'บิลนี้ปิดแล้ว');
    var dup = findOne_('Bills', function (r) { return r.slip_hash === hash && r.bill_id !== b.bill_id; });
    if (dup) throw err_('SLIP_USED', 'สลิปนี้เคยถูกใช้ส่งแล้ว ถ้าคิดว่าผิดพลาด ทักแอดมินทาง IG');
    var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('SLIP_FOLDER_ID'));
    var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(s.base64), s.mime, b.bill_id + '_' + u.user_id + (s.mime === 'image/png' ? '.png' : '.jpg')));
    update_('Bills', b._row, { status: 'reviewing', proof: JSON.stringify(proof), slip_file_id: file.getId(), slip_hash: hash, submitted_at: now_(), note: '' });
    return findOne_('Bills', function (r) { return r.bill_id === b.bill_id; });
  });
  var acc = jsonParse_(out.account, {});
  notifyAdmins_('แจ้งโอนใหม่ ' + out.bill_id + ' · ฿' + Number(out.total).toLocaleString(),
    [['นักเรียน', u.first_name + ' ' + u.last_name + ' (' + u.nickname + ')'], ['อีเมล', u.email], ['เบอร์', u.phone],
     ['คอร์ส', jsonParse_(out.items, []).map(function (i) { return i.title; }).join(', ')], ['ยอดบิล', '฿' + Number(out.total).toLocaleString()],
     ['ยอดที่แจ้ง', proof.amount != null ? '฿' + proof.amount.toLocaleString() : '-'], ['บัญชีรับ', acc.label || ''], ['ผู้โอน', (proof.payer_name || '-') + (proof.payer_relation ? ' (' + proof.payer_relation + ')' : '')]],
    'เข้าหลังบ้าน → คำสั่งซื้อ เพื่อตรวจยอดและอนุมัติ');
  return billPublic_(out);
}

function billCancel_(d, p) {
  var u = auth_(p);
  withLock_(function () {
    var b = findOne_('Bills', function (r) { return r.bill_id === d.bill_id && r.user_id === u.user_id; });
    if (!b) throw err_('NOT_FOUND', 'ไม่พบบิลนี้');
    if (b.status !== 'awaiting_payment' && b.status !== 'rejected') throw err_('ALREADY', b.status === 'reviewing' ? 'ส่งหลักฐานแล้ว ยกเลิกเองไม่ได้ ทักแอดมินทาง IG' : 'บิลนี้ปิดแล้ว');
    update_('Bills', b._row, { status: 'cancelled', decided_at: now_() });
  });
  return true;
}

// ── แพ็กเกจ (ซื้อหลายคอร์สรวมกันในราคาพิเศษ) ──
function activeBundles_() {
  return read_('Bundles').filter(function (b) { return b.status !== 'inactive' && csv_(b.course_ids).length >= 2; }).sort(bySort_);
}
function bundleOut_(b, courses) {
  var ids = csv_(b.course_ids), cs = ids.map(function (id) { return courses.filter(function (c) { return c.course_id === id; })[0]; }).filter(Boolean);
  return { bundle_id: b.bundle_id, title: b.title, subtitle: b.subtitle || '', cover_url: b.cover_url || '', price: money_(b.price), status: b.status || 'active',
    course_ids: ids, courses: cs.map(function (c) { return { course_id: c.course_id, title: c.title, price: money_(c.price), status: c.status, subject: c.subject }; }),
    normal: cs.reduce(function (a, c) { return a + money_(c.price); }, 0), sort_order: Number(b.sort_order) || 0,
    subject: cs.length ? cs[0].subject : '' };
}
function publicBundles_() {
  var c = cache_().get('pub_bundles'); if (c) return JSON.parse(c);
  var courses = read_('Courses');
  var list = activeBundles_().map(function (b) { return bundleOut_(b, courses); })
    .filter(function (b) { return b.courses.length === b.course_ids.length && b.courses.every(function (x) { return x.status === 'published'; }); });
  try { cache_().put('pub_bundles', JSON.stringify(list), 300); } catch (e) {}
  return list;
}
/** ยอดที่ผู้ใช้จ่ายไปแล้วต่อคอร์ส (คอร์สที่อนุมัติแล้ว) — ใช้คิดส่วนต่างเมื่ออัปเกรดเป็นแพ็กเกจ */
function paidMap_(uid) {
  var o = {};
  if (!uid) return o;
  read_('Enrollments').forEach(function (e) { if (e.user_id === uid && e.status === 'approved') o[e.course_id] = Math.max(o[e.course_id] || 0, Number(e.amount) || 0); });
  return o;
}
/** เลือกชุดแพ็กเกจที่ไม่ทับกันและประหยัดที่สุดสำหรับคอร์สในตะกร้า แล้วใส่ส่วนลดให้แต่ละคอร์ส */
function solveBundles_(prices, paid, bundles) {
  var cands = bundles.map(function (b) {
    var ids = csv_(b.course_ids), cart = ids.filter(function (id) { return id in prices; });
    if (!cart.length || !ids.every(function (id) { return id in prices || id in paid; })) return null;
    var owned = ids.filter(function (id) { return !(id in prices); });
    var cost = Math.max(0, money_(b.price) - owned.reduce(function (a, id) { return a + paid[id]; }, 0));
    var normal = cart.reduce(function (a, id) { return a + prices[id]; }, 0);
    return cost < normal ? { b: b, cart: cart, owned: owned, cost: cost, save: normal - cost } : null;
  }).filter(Boolean).slice(0, 14);
  var best = [], bestSave = 0;
  (function walk(i, used, pick, save) {
    if (save > bestSave) { bestSave = save; best = pick.slice(); }
    for (var j = i; j < cands.length; j++) {
      if (cands[j].cart.some(function (id) { return used[id]; })) continue;
      var u2 = Object.assign({}, used); cands[j].cart.forEach(function (id) { u2[id] = 1; });
      pick.push(cands[j]); walk(j + 1, u2, pick, save + cands[j].save); pick.pop();
    }
  })(0, {}, [], 0);
  var total = Object.keys(prices).reduce(function (a, id) { return a + prices[id]; }, 0) - bestSave;
  return { best: best, total: total };
}
/** เลือกชุดแพ็กเกจที่ไม่ทับกันและประหยัดที่สุดสำหรับคอร์สในตะกร้า แล้วใส่ส่วนลดให้แต่ละคอร์ส + แนะนำแพ็กเกจที่ขาดอีกนิด */
function applyBundles_(ok, u) {
  var paid = paidMap_(u && u.user_id), inCart = {}, prices = {}, bundles = activeBundles_();
  ok.forEach(function (it) { inCart[it.course_id] = it; prices[it.course_id] = it.price; });
  var sol = solveBundles_(prices, paid, bundles);
  var applied = sol.best.map(function (x) {
    var normal = x.cart.reduce(function (a, id) { return a + inCart[id].price; }, 0), given = 0;
    x.cart.forEach(function (id) { var it = inCart[id]; it.bundle_discount = Math.floor(x.save * it.price / normal); given += it.bundle_discount; it.bundle = x.b.title; });
    inCart[x.cart[0]].bundle_discount += x.save - given;
    return { bundle_id: x.b.bundle_id, title: x.b.title, save: x.save, cost: x.cost, upgrade: x.owned.length > 0 };
  });
  var courses = read_('Courses'), own = u ? ownedMap_(u.user_id) : {}, seen = {};
  var suggest = bundles.map(function (b) {
    var ids = csv_(b.course_ids);
    if (!ids.some(function (id) { return inCart[id]; })) return null;
    var missing = ids.filter(function (id) { return !inCart[id] && !(id in paid); });
    if (!missing.length || seen[missing.join(',')]) return null;
    var mc = missing.map(function (id) { return courses.filter(function (c) { return c.course_id === id && c.status === 'published'; })[0]; });
    if (mc.some(function (c) { return !c || own[c.course_id]; })) return null;
    var p2 = Object.assign({}, prices); mc.forEach(function (c) { p2[c.course_id] = money_(c.price); });
    var extra = solveBundles_(p2, paid, bundles).total - sol.total, full = mc.reduce(function (a, c) { return a + money_(c.price); }, 0);
    if (extra >= full) return null;
    seen[missing.join(',')] = 1;
    return { bundle_id: b.bundle_id, title: b.title, add_ids: missing, add_titles: mc.map(function (c) { return c.title; }), extra: extra, save: full - extra };
  }).filter(Boolean).sort(function (a, b) { return a.extra - b.extra; }).slice(0, 2);
  return { applied: applied, suggest: suggest };
}
function adminBundles_() { var courses = read_('Courses'); return read_('Bundles').sort(bySort_).map(function (b) { return bundleOut_(b, courses); }); }
function adminBundleSave_(d, p, admin) {
  var ids = csv_(d.course_ids);
  if (ids.length < 2) throw err_('BAD_INPUT', 'แพ็กเกจต้องมีอย่างน้อย 2 คอร์ส');
  var courses = read_('Courses');
  var miss = ids.filter(function (id) { return !courses.some(function (c) { return c.course_id === id; }); });
  if (miss.length) throw err_('BAD_INPUT', 'ไม่พบคอร์ส ' + miss.join(', '));
  var price = Number(d.price); if (!(price >= 0)) throw err_('BAD_INPUT', 'ใส่ราคาแพ็กเกจ');
  var cover = clip_(d.cover_url, 500); if (cover && !/^https:\/\//.test(cover)) throw err_('BAD_INPUT', 'ลิงก์รูปต้องขึ้นต้นด้วย https://');
  var patch = { title: req_(d.title, 'ชื่อแพ็กเกจ', 120), subtitle: clip_(d.subtitle, 200), course_ids: ids.join(','), price: String(money_(price)),
    cover_url: cover, status: d.status === 'inactive' ? 'inactive' : 'active', sort_order: String(Number(d.sort_order) || 0) };
  var id = withLock_(function () {
    ensureCols_('Bundles');
    if (d.bundle_id) {
      var b = findOne_('Bundles', function (r) { return r.bundle_id === d.bundle_id; });
      if (!b) throw err_('NOT_FOUND', 'ไม่พบแพ็กเกจ');
      update_('Bundles', b._row, patch); log_(admin, 'bundle.edit', d.bundle_id); return d.bundle_id;
    }
    patch.bundle_id = 'BD' + id_().slice(-6); patch.created_at = now_();
    append_('Bundles', patch); log_(admin, 'bundle.create', patch.bundle_id + ' ' + patch.title); return patch.bundle_id;
  });
  cache_().remove('pub_bundles');
  return { bundle_id: id };
}
function adminBundleDelete_(d, p, admin) {
  withLock_(function () {
    var rows = read_('Bundles').filter(function (r) { return r.bundle_id === d.bundle_id; });
    if (!rows.length) throw err_('NOT_FOUND', 'ไม่พบแพ็กเกจ');
    deleteRows_('Bundles', rows); log_(admin, 'bundle.delete', d.bundle_id);
  });
  cache_().remove('pub_bundles');
  return true;
}

/**
 * สร้างคอร์สคณิตแยกเทอม ม.4–ม.6 (6 คอร์ส เทอมละ 490) + แพ็กเกจ (ม.ละ 690, ครบ 3 ม. 1890)
 * รันครั้งเดียวใน editor: setupMathCourses()  — คอร์สที่มีรหัสอยู่แล้วจะข้าม ไม่เขียนทับ
 * คอร์สที่สร้างใหม่เป็น "ฉบับร่าง" ใส่คลิปแล้วค่อยเปลี่ยนเป็น "เปิดขาย" ในหลังบ้าน
 * baseUrl = ที่อยู่รูปปก เช่น 'https://ineedbio.shop/images/courses/'
 */
function setupMathCourses(baseUrl) {
  baseUrl = baseUrl || 'https://ineedbio.shop/images/courses/';
  var T = [
    ['MATH-M4-T1', 'ม.4', 1, 'เซต · ตรรกศาสตร์ · จำนวนจริง', ['เซต', 'ตรรกศาสตร์', 'จำนวนจริง']],
    ['MATH-M4-T2', 'ม.4', 2, 'ความสัมพันธ์และฟังก์ชัน · เอกซ์โพเนนเชียลและลอการิทึม', ['ความสัมพันธ์และฟังก์ชัน', 'ฟังก์ชันเอกซ์โพเนนเชียลและฟังก์ชันลอการิทึม']],
    ['MATH-M5-T1', 'ม.5', 1, 'ฟังก์ชันตรีโกณมิติ · เมทริกซ์ · เวกเตอร์', ['ฟังก์ชันตรีโกณมิติ', 'เมทริกซ์', 'เวกเตอร์']],
    ['MATH-M5-T2', 'ม.5', 2, 'จำนวนเชิงซ้อน · หลักการนับเบื้องต้น · ความน่าจะเป็น', ['จำนวนเชิงซ้อน', 'หลักการนับเบื้องต้น', 'ความน่าจะเป็น']],
    ['MATH-M6-T1', 'ม.6', 1, 'ลำดับและอนุกรม · แคลคูลัสเบื้องต้น', ['ลำดับและอนุกรม', 'แคลคูลัสเบื้องต้น']],
    ['MATH-M6-T2', 'ม.6', 2, 'สถิติและข้อมูล · ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น', ['สถิติและข้อมูล', 'ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น']]
  ];
  var made = [];
  withLock_(function () {
    ['Courses', 'Bundles'].forEach(ensureCols_);
    T.forEach(function (t, i) {
      if (findOne_('Courses', function (r) { return r.course_id === t[0]; })) return;
      append_('Courses', { course_id: t[0], subject: 'math', title: 'คณิต ' + t[1] + ' เทอม ' + t[2], subtitle: t[3],
        description: 'คณิตศาสตร์ ' + t[1] + ' เทอม ' + t[2] + ' เรียนตามหลักสูตรโรงเรียน ปูพื้นให้แน่นแล้วฝึกโจทย์ทุกบท ใช้เก็บเกรดและต่อยอดสอบ A-Level ได้',
        cover_url: baseUrl + 'math-' + t[0].slice(5).toLowerCase() + '.webp', price: '490', status: 'draft', sort_order: String(100 + i), created_at: now_(),
        highlights: t[4].map(function (x) { return 'ครบบท ' + x; }).concat(['ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690']).join('\n'),
        audience: 'นักเรียน ' + t[1] + ' ที่อยากเข้าใจเนื้อหาเทอมนี้ให้ครบ\nคนที่อยากทบทวนก่อนสอบกลางภาคและปลายภาค\nคนที่ปูพื้นเพื่อสอบ A-Level คณิต',
        level: t[1] });
      var P = { instructor_name: 'พี่พร้อม', instructor_title: 'ภวัต เศรษฐเสถียร', instructor_photo: baseUrl + 'pprom.webp',
        instructor_bio: 'นักศึกษาคณะวิศวกรรมศาสตร์ สาขาหุ่นยนต์และปัญญาประดิษฐ์ มหาวิทยาลัยเชียงใหม่\nสอวน. ชีววิทยา ศูนย์มหาวิทยาลัยนเรศวร\nนักเรียนดีเด่น GPAX 4.00 (2566)\nเหรียญเงินการแข่งขันหุ่นยนต์ระดับอาเซียน' };
      var N = { instructor_name: 'พี่น้ำแข็ง', instructor_title: 'ศุภณัฐ กล้าจริง', instructor_photo: baseUrl + 'pnk.webp', instructor_bio: '' };
      var who = t[1] === 'ม.4' ? [P] : t[1] === 'ม.5' ? [N] : [P, N], patch = {};
      who.forEach(function (w, k) { Object.keys(w).forEach(function (f) { patch[k ? f.replace('instructor_', 'instructor2_') : f] = w[f]; }); });
      var row = findOne_('Courses', function (r) { return r.course_id === t[0]; }); update_('Courses', row._row, patch);
      made.push(t[0]);
    });
    var B = [['คณิต ม.4 ทั้งปี (เทอม 1 + 2)', 'MATH-M4-T1,MATH-M4-T2', 690, 'math-m4.webp', 'สอนโดย พี่พร้อม · ซื้อแยกเทอมละ 490'],
      ['คณิต ม.5 ทั้งปี (เทอม 1 + 2)', 'MATH-M5-T1,MATH-M5-T2', 690, 'math-m5.webp', 'สอนโดย พี่น้ำแข็ง · ซื้อแยกเทอมละ 490'],
      ['คณิต ม.6 ทั้งปี (เทอม 1 + 2)', 'MATH-M6-T1,MATH-M6-T2', 690, 'math-m6.webp', 'สอนโดย พี่พร้อม และพี่น้ำแข็ง · ซื้อแยกเทอมละ 490'],
      ['คณิตครบ ม.4–ม.6 (6 เทอม)', T.map(function (t) { return t[0]; }).join(','), 1890, 'math-all.webp', 'สอนโดย พี่พร้อม และพี่น้ำแข็ง · ครบ 6 เล่ม ประหยัดกว่าซื้อแยก 1,050']];
    B.forEach(function (b, i) {
      if (read_('Bundles').some(function (r) { return r.course_ids === b[1]; })) return;
      append_('Bundles', { bundle_id: 'BD' + id_().slice(-6), title: b[0], subtitle: b[4], course_ids: b[1], price: String(b[2]), cover_url: baseUrl + b[3],
        status: 'active', sort_order: String(i + 1), created_at: now_() });
    });
  });
  cache_().remove('pub_courses'); cache_().remove('pub_bundles');
  console.log('สร้างคอร์สใหม่: ' + (made.join(', ') || 'ไม่มี (มีอยู่แล้ว)') + ' — เข้าหลังบ้านใส่คลิปแล้วเปลี่ยนเป็น "เปิดขาย"');
  return made;
}

// ── แอดมิน: คำสั่งซื้อ ──
function billChecks_(b, u) {
  var pr = jsonParse_(b.proof, {}) || {}, out = [], total = Number(b.total) || 0;
  if (pr.amount != null && pr.amount !== '') out.push({ ok: Number(pr.amount) === total, label: Number(pr.amount) === total ? 'ยอดที่แจ้งตรงกับยอดบิล' : 'ยอดที่แจ้ง ฿' + Number(pr.amount).toLocaleString() + ' ไม่ตรงกับยอดบิล ฿' + total.toLocaleString() });
  if (pr.paid_at) { var okT = new Date(pr.paid_at).getTime() >= new Date(b.created_at).getTime() - 30 * 60000; out.push({ ok: okT, label: okT ? 'โอนหลังสร้างคำสั่งซื้อ' : 'เวลาโอนก่อนสร้างคำสั่งซื้อ (อาจเป็นสลิปเก่า)' }); }
  if (pr.payer_name) {
    var nm = String(pr.payer_name).replace(/\s+/g, '').toLowerCase(), fn = String(u.first_name || '').replace(/\s+/g, '').toLowerCase();
    var same = fn && nm.indexOf(fn) >= 0;
    out.push({ ok: same || !!pr.payer_relation, warn: !same, label: same ? 'ชื่อผู้โอนตรงกับชื่อที่สมัคร' : pr.payer_relation ? 'ผู้โอนไม่ใช่ตัวนักเรียน (' + pr.payer_relation + ')' : 'ชื่อผู้โอนไม่ตรงกับชื่อที่สมัคร' });
  }
  return out;
}
function adminBills_(d) {
  var st = d.status || 'reviewing';
  var users = read_('Users');
  return read_('Bills').filter(function (b) {
    var s = billStatus_(b);
    if (d.account_id && b.account_id !== d.account_id) return false;
    if (d.q) { var u0 = users.filter(function (x) { return x.user_id === b.user_id; })[0] || {}; if ([b.bill_id, u0.email, u0.first_name, u0.last_name, u0.nickname, u0.phone].join(' ').toLowerCase().indexOf(String(d.q).toLowerCase()) < 0) return false; }
    return st === 'closed' ? (s === 'expired' || s === 'cancelled') : st === 'all' ? true : s === st;
  }).sort(function (a, b) {
    var ka = a.submitted_at || a.created_at, kb = b.submitted_at || b.created_at;
    return st === 'reviewing' ? (ka < kb ? -1 : 1) : (ka < kb ? 1 : -1);
  }).slice(0, 200).map(function (b) {
    var u = users.filter(function (x) { return x.user_id === b.user_id; })[0] || {};
    var o = billPublic_(b), acc = jsonParse_(b.account, {});
    o.account_label = acc.label || ''; o.user_id = b.user_id;
    o.name = (u.first_name || '') + ' ' + (u.last_name || ''); o.nickname = u.nickname || ''; o.email = u.email || ''; o.phone = u.phone || '';
    o.checks = billChecks_(b, u);
    return o;
  });
}
function adminBillSlip_(d) {
  var b = findOne_('Bills', function (r) { return r.bill_id === d.bill_id; });
  if (!b || !b.slip_file_id) throw err_('NOT_FOUND', 'ไม่พบสลิป');
  var blob = DriveApp.getFileById(b.slip_file_id).getBlob();
  return { mime: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}
function adminBillDecide_(d, p, admin) {
  var decision = d.decision === 'approve' ? 'approved' : d.decision === 'reject' ? 'rejected' : '';
  if (!decision) throw err_('BAD_INPUT', 'เลือกอนุมัติหรือไม่อนุมัติ');
  var note = clip_(d.note, 300);
  if (decision === 'rejected' && !note) throw err_('BAD_INPUT', 'ใส่เหตุผลที่ไม่อนุมัติ นักเรียนจะเห็นข้อความนี้');
  var b = withLock_(function () {
    var x = findOne_('Bills', function (r) { return r.bill_id === d.bill_id; });
    if (!x) throw err_('NOT_FOUND', 'ไม่พบบิลนี้');
    var s = billStatus_(x);
    if (decision === 'rejected' && s !== 'reviewing') throw err_('ALREADY', 'บิลนี้ไม่ได้อยู่ในสถานะรอตรวจ');
    if (decision === 'approved' && ['reviewing', 'awaiting_payment', 'rejected', 'expired'].indexOf(s) < 0) throw err_('ALREADY', 'บิลนี้ถูกตัดสินไปแล้ว');
    var patch = { status: decision, note: note, decided_by: admin.user_id, decided_at: now_() };
    if (decision === 'rejected') patch.expires_at = new Date(Date.now() + expireHours_() * 36e5).toISOString();
    update_('Bills', x._row, patch);
    if (decision === 'approved') {
      var have = read_('Enrollments').filter(function (e) { return e.user_id === x.user_id && e.status === 'approved'; }).map(function (e) { return e.course_id; });
      jsonParse_(x.items, []).forEach(function (it) {
        if (have.indexOf(it.course_id) >= 0) return;
        append_('Enrollments', { enroll_id: 'E' + id_(), user_id: x.user_id, course_id: it.course_id, status: 'approved', amount: String(it.net), slip_file_id: x.slip_file_id,
          note: 'บิล ' + x.bill_id, created_at: x.created_at, decided_by: admin.user_id, decided_at: now_() });
      });
    }
    log_(admin, 'bill.' + decision, x.bill_id);
    return x;
  });
  var u = findOne_('Users', function (r) { return r.user_id === b.user_id; });
  if (u) sendBillEmail_(u, b, decision, note);
  return { bill_id: b.bill_id, status: decision };
}
function sendBillEmail_(u, b, decision, note) {
  if (MailApp.getRemainingDailyQuota() < 1) return;
  var ok = decision === 'approved', items = jsonParse_(b.items, []);
  var list = '<ul style="margin:0 0 14px;padding-left:18px;color:#0c0c0c;">' + items.map(function (i) { return '<li style="margin:4px 0;">' + esc_(i.title) + '</li>'; }).join('') + '</ul>';
  var inner = '<tr><td style="padding:0 32px 26px;"><p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc_(u.nickname) + '<br>' +
    (ok ? 'แอดมินตรวจยอดเงินบิล <b style="color:#0c0c0c;">' + esc_(b.bill_id) + '</b> แล้ว เข้าเรียนคอร์สเหล่านี้ได้เลยที่เมนู “คอร์สของฉัน”' : 'หลักฐานการโอนของบิล <b style="color:#0c0c0c;">' + esc_(b.bill_id) + '</b> ยังไม่ผ่านการตรวจ') + '</p>' + list +
    (!ok && note ? '<p style="margin:0 0 14px;padding:12px 14px;background:#fafafa;border-radius:10px;font-size:14px;color:#0c0c0c;">เหตุผล: ' + esc_(note) + '</p>' : '') +
    (!ok ? '<p style="margin:0;font-size:14px;color:#525252;">แก้ไขแล้วส่งหลักฐานใหม่ได้ที่หน้า “คำสั่งซื้อ” หรือทัก IG แอดมินเพื่อสอบถาม</p>' : '') + '</td></tr>';
  MailApp.sendEmail({ to: u.email, name: APP.NAME, subject: ok ? 'เข้าเรียนได้แล้ว · บิล ' + b.bill_id : 'หลักฐานการโอนยังไม่ผ่าน · บิล ' + b.bill_id,
    body: (ok ? 'เข้าเรียนได้แล้ว: ' : 'หลักฐานการโอนยังไม่ผ่าน: ') + items.map(function (i) { return i.title; }).join(', ') + (note ? '\nเหตุผล: ' + note : ''),
    htmlBody: mailShell_(ok ? 'เข้าเรียนได้แล้ว' : 'หลักฐานการโอนยังไม่ผ่าน', inner) });
}

// ── แอดมิน: บัญชีรับเงิน ──
function adminAccounts_() {
  var bills = read_('Bills'), courses = read_('Courses');
  return read_('PayAccounts').sort(bySort_).map(function (a) {
    var o = {}; SCHEMA.PayAccounts.forEach(function (k) { o[k] = a[k] || ''; });
    o.subjects = csv_(a.subjects);
    o.courses = courses.filter(function (c) { return c.pay_account_id === a.account_id; }).map(function (c) { return c.title; });
    o.pending = bills.filter(function (b) { return b.account_id === a.account_id && billStatus_(b) === 'reviewing'; }).length;
    return o;
  });
}
function adminAccountSave_(d, p, admin) {
  var method = d.method === 'bank' ? 'bank' : 'promptpay';
  var patch = { label: req_(d.label, 'ชื่อเรียกบัญชี', 60), method: method, account_name: req_(d.account_name, 'ชื่อบัญชี', 100),
    promptpay_id: String(d.promptpay_id || '').replace(/\D/g, ''), bank: clip_(d.bank, 60), account_no: clip_(d.account_no, 30),
    qr_url: clip_(d.qr_url, 500), note: clip_(d.note, 300), ig: clip_(String(d.ig || '').replace(/^@/, ''), 40),
    subjects: csv_(d.subjects).filter(function (s) { return APP.SUBJECTS[s]; }).join(','), status: d.status === 'inactive' ? 'inactive' : 'active',
    sort_order: String(Number(d.sort_order) || 0) };
  if (method === 'promptpay' && !/^(\d{10}|\d{13}|\d{15})$/.test(patch.promptpay_id)) throw err_('BAD_INPUT', 'เลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตร/เลขผู้เสียภาษี 13 หลัก');
  if (method === 'bank' && (!patch.bank || !patch.account_no)) throw err_('BAD_INPUT', 'กรอกธนาคารและเลขบัญชี');
  if (patch.qr_url && !/^https:\/\//.test(patch.qr_url)) throw err_('BAD_INPUT', 'ลิงก์รูป QR ต้องขึ้นต้นด้วย https://');
  var id = withLock_(function () {
    ensureCols_('PayAccounts');
    if (d.account_id) {
      var a = findOne_('PayAccounts', function (r) { return r.account_id === d.account_id; });
      if (!a) throw err_('NOT_FOUND', 'ไม่พบบัญชีนี้');
      update_('PayAccounts', a._row, patch); log_(admin, 'account.edit', d.account_id); return d.account_id;
    }
    patch.account_id = 'AC' + id_().slice(-6); patch.created_at = now_();
    append_('PayAccounts', patch); log_(admin, 'account.create', patch.account_id + ' ' + patch.label); return patch.account_id;
  });
  return { account_id: id };
}
function adminAccountDelete_(d, p, admin) {
  withLock_(function () {
    var rows = read_('PayAccounts').filter(function (r) { return r.account_id === d.account_id; });
    if (!rows.length) throw err_('NOT_FOUND', 'ไม่พบบัญชีนี้');
    if (read_('Bills').some(function (b) { return b.account_id === d.account_id && BILL_OPEN.indexOf(billStatus_(b)) >= 0; })) throw err_('IN_USE', 'ยังมีบิลที่ค้างอยู่กับบัญชีนี้ ตั้งเป็น "ปิดใช้งาน" แทน แล้วลบทีหลัง');
    deleteRows_('PayAccounts', rows);
    read_('Courses').forEach(function (c) { if (c.pay_account_id === d.account_id) update_('Courses', c._row, { pay_account_id: '' }); });
    log_(admin, 'account.delete', d.account_id);
  });
  cache_().remove('pub_courses');
  return true;
}

// ── แอดมิน: โค้ดส่วนลด ──
function adminCoupons_() {
  var orders = read_('Orders'), bills = read_('Bills');
  return read_('Coupons').sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).map(function (c) {
    var o = {}; SCHEMA.Coupons.forEach(function (k) { o[k] = c[k] || ''; });
    o.targets = csv_(c.targets);
    var ids = orders.filter(function (x) { return x.coupon_code === c.code; }).map(function (x) { return x.order_id; });
    var live = {}, paid = 0, disc = 0;
    bills.forEach(function (b) { if (ids.indexOf(b.order_id) < 0) return; var s = billStatus_(b); if (BILL_LIVE.indexOf(s) >= 0) live[b.order_id] = 1; if (s === 'approved') { paid += Number(b.total) || 0; disc += jsonParse_(b.items, []).reduce(function (a, it) { return a + (it.coupon_discount != null ? Number(it.coupon_discount) || 0 : Number(it.discount) || 0); }, 0); } });
    o.used = Object.keys(live).length; o.revenue = paid; o.discount_given = disc;
    return o;
  });
}
function adminCouponSave_(d, p, admin) {
  var code = normCode_(d.code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw err_('BAD_INPUT', 'โค้ดใช้ได้เฉพาะ A-Z 0-9 - _ ยาว 3–30 ตัว');
  var kind = d.kind === 'fixed' ? 'fixed' : 'percent', value = Number(d.value);
  if (!(value > 0)) throw err_('BAD_INPUT', 'ใส่มูลค่าส่วนลด');
  if (kind === 'percent' && value > 100) throw err_('BAD_INPUT', 'ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100');
  var scope = d.scope === 'subject' || d.scope === 'course' ? d.scope : 'all';
  var targets = scope === 'all' ? [] : csv_(d.targets);
  if (scope !== 'all' && !targets.length) throw err_('BAD_INPUT', scope === 'subject' ? 'เลือกวิชาที่ใช้โค้ดได้' : 'เลือกคอร์สที่ใช้โค้ดได้');
  var dt = function (v, label) { if (!v) return ''; var t = new Date(v).getTime(); if (isNaN(t)) throw err_('BAD_INPUT', label + 'ไม่ถูกต้อง'); return new Date(t).toISOString(); };
  var patch = { code: code, kind: kind, value: String(value), max_discount: kind === 'percent' && Number(d.max_discount) > 0 ? String(money_(d.max_discount)) : '',
    scope: scope, targets: targets.join(','), min_total: Number(d.min_total) > 0 ? String(money_(d.min_total)) : '',
    max_uses: Number(d.max_uses) > 0 ? String(money_(d.max_uses)) : '', per_user: Number(d.per_user) > 0 ? String(money_(d.per_user)) : '',
    starts_at: dt(d.starts_at, 'วันเริ่ม'), ends_at: dt(d.ends_at, 'วันหมดอายุ'), status: d.status === 'inactive' ? 'inactive' : 'active', note: clip_(d.note, 200) };
  if (patch.starts_at && patch.ends_at && patch.ends_at <= patch.starts_at) throw err_('BAD_INPUT', 'วันหมดอายุต้องหลังวันเริ่ม');
  withLock_(function () {
    ensureCols_('Coupons');
    var orig = normCode_(d.orig_code);
    var same = findOne_('Coupons', function (r) { return r.code === code; });
    if (orig) {
      var c = findOne_('Coupons', function (r) { return r.code === orig; });
      if (!c) throw err_('NOT_FOUND', 'ไม่พบโค้ดนี้');
      if (orig !== code) {
        if (same) throw err_('BAD_INPUT', 'มีโค้ด ' + code + ' อยู่แล้ว');
        if (read_('Orders').some(function (o) { return o.coupon_code === orig; })) throw err_('IN_USE', 'โค้ดนี้ถูกใช้ไปแล้ว เปลี่ยนชื่อโค้ดไม่ได้ สร้างโค้ดใหม่แทน');
      }
      update_('Coupons', c._row, patch); log_(admin, 'coupon.edit', code);
    } else {
      if (same) throw err_('BAD_INPUT', 'มีโค้ด ' + code + ' อยู่แล้ว');
      patch.created_at = now_(); append_('Coupons', patch); log_(admin, 'coupon.create', code);
    }
  });
  return { code: code };
}
function adminCouponDelete_(d, p, admin) {
  var code = normCode_(d.code);
  withLock_(function () {
    var rows = read_('Coupons').filter(function (r) { return r.code === code; });
    if (!rows.length) throw err_('NOT_FOUND', 'ไม่พบโค้ดนี้');
    if (read_('Orders').some(function (o) { return o.coupon_code === code; })) throw err_('IN_USE', 'โค้ดนี้ถูกใช้ไปแล้ว ลบไม่ได้ ตั้งเป็น "ปิดใช้งาน" แทน');
    deleteRows_('Coupons', rows); log_(admin, 'coupon.delete', code);
  });
  return true;
}

// ───────────────────────── แอดมิน ─────────────────────────
function adminStats_() {
  var users = read_('Users'), en = read_('Enrollments'), courses = read_('Courses'), bills = read_('Bills');
  var today = now_().slice(0, 10), month = now_().slice(0, 7);
  var subj = {};
  Object.keys(APP.SUBJECTS).forEach(function (k) { subj[k] = { subject: k, name: APP.SUBJECTS[k], count: 0, revenue: 0 }; });
  var revenue = 0, monthCount = 0;
  en.forEach(function (e) {
    if (e.status !== 'approved' || String(e.decided_at).slice(0, 7) !== month) return;
    var c = courses.filter(function (x) { return x.course_id === e.course_id; })[0];
    var amt = Number(e.amount) || 0; revenue += amt; monthCount++;
    if (c && subj[c.subject]) { subj[c.subject].count++; subj[c.subject].revenue += amt; }
  });
  return {
    users_total: users.length,
    dream_top: topCount_(users.map(function (u) { return u.dream_faculty && u.dream_university ? u.dream_faculty + ' · ' + u.dream_university : ''; }), 6),
    repeat_count: users.filter(function (u) { return isRepeat_(u.grade); }).length,
    users_today: users.filter(function (u) { return String(u.created_at).slice(0, 10) === today; }).length,
    pending: en.filter(function (e) { return e.status === 'pending'; }).length + bills.filter(function (b) { return b.status === 'reviewing'; }).length,
    pending_legacy: en.filter(function (e) { return e.status === 'pending'; }).length,
    awaiting: bills.filter(function (b) { return billStatus_(b) === 'awaiting_payment'; }).length,
    oldest_pending: en.filter(function (e) { return e.status === 'pending'; }).map(function (e) { return e.created_at; })
      .concat(bills.filter(function (b) { return b.status === 'reviewing'; }).map(function (b) { return b.submitted_at; })).sort()[0] || '',
    month_revenue: revenue, month_count: monthCount,
    by_subject: Object.keys(subj).map(function (k) { return subj[k]; }),
    email_quota: MailApp.getRemainingDailyQuota()
  };
}

function adminEnrollments_(d) {
  var users = read_('Users'), courses = read_('Courses');
  return read_('Enrollments').filter(function (e) { return !d.status || e.status === d.status; })
    .sort(function (a, b) { return a.created_at < b.created_at ? (d.status === 'pending' ? -1 : 1) : (d.status === 'pending' ? 1 : -1); })
    .slice(0, 200).map(function (e) {
      var u = users.filter(function (x) { return x.user_id === e.user_id; })[0] || {};
      var c = courses.filter(function (x) { return x.course_id === e.course_id; })[0] || {};
      return { enroll_id: e.enroll_id, status: e.status, amount: Number(e.amount) || 0, note: e.note, created_at: e.created_at,
        decided_at: e.decided_at, has_slip: !!e.slip_file_id, course_id: e.course_id, course_title: c.title || e.course_id,
        user_id: e.user_id, name: (u.first_name || '') + ' ' + (u.last_name || ''), nickname: u.nickname || '', email: u.email || '', phone: u.phone || '' };
    });
}

function adminSlip_(d) {
  var e = findOne_('Enrollments', function (r) { return r.enroll_id === d.enroll_id; });
  if (!e || !e.slip_file_id) throw err_('NOT_FOUND', 'ไม่พบสลิป');
  var blob = DriveApp.getFileById(e.slip_file_id).getBlob();
  return { mime: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

function adminDecide_(d, p, admin) {
  var decision = d.decision === 'approve' ? 'approved' : d.decision === 'reject' ? 'rejected' : '';
  if (!decision) throw err_('BAD_INPUT', 'เลือกอนุมัติหรือปฏิเสธ');
  var info = withLock_(function () {
    var e = findOne_('Enrollments', function (r) { return r.enroll_id === d.enroll_id; });
    if (!e) throw err_('NOT_FOUND', 'ไม่พบคำขอนี้');
    if (e.status !== 'pending') throw err_('ALREADY', 'คำขอนี้ถูกตัดสินไปแล้วโดยแอดมินคนอื่น');
    update_('Enrollments', e._row, { status: decision, note: clip_(d.note, 300), decided_by: admin.user_id, decided_at: now_() });
    log_(admin, decision, e.enroll_id);
    return e;
  });
  var u = findOne_('Users', function (r) { return r.user_id === info.user_id; });
  var c = findOne_('Courses', function (r) { return r.course_id === info.course_id; });
  if (u && c) sendDecisionEmail_(u, c, decision, d.note);
  return { enroll_id: info.enroll_id, status: decision };
}

function adminGrant_(d, p, admin) {
  var u = userByEmail_(normEmail_(d.email));
  if (!u) throw err_('NOT_FOUND', 'ไม่พบผู้ใช้อีเมลนี้ (ต้องสมัครสมาชิกก่อน)');
  var c = findOne_('Courses', function (r) { return r.course_id === d.course_id; });
  if (!c) throw err_('NOT_FOUND', 'ไม่พบคอร์ส');
  var prev = latestEnroll_(u.user_id, c.course_id);
  if (prev && prev.status === 'approved') throw err_('ALREADY', 'ผู้ใช้นี้มีสิทธิ์คอร์สนี้อยู่แล้ว');
  withLock_(function () {
    if (prev && prev.status === 'pending') update_('Enrollments', prev._row, { status: 'approved', note: 'อนุมัติโดยการเพิ่มสิทธิ์', decided_by: admin.user_id, decided_at: now_() });
    else append_('Enrollments', { enroll_id: 'E' + id_(), user_id: u.user_id, course_id: c.course_id, status: 'approved',
      amount: String(d.amount == null || d.amount === '' ? 0 : Number(d.amount) || 0), slip_file_id: '', note: clip_(d.note || 'เพิ่มสิทธิ์โดยแอดมิน', 300),
      created_at: now_(), decided_by: admin.user_id, decided_at: now_() });
    log_(admin, 'grant', u.email + ' → ' + c.course_id);
  });
  sendDecisionEmail_(u, c, 'approved', '');
  return true;
}

function adminCourses_() {
  var lessons = read_('Lessons'), en = read_('Enrollments');
  return read_('Courses').sort(bySort_).map(function (x) {
    var card = courseCard_(x, lessons);
    card.sort_order = Number(x.sort_order) || 0;
    ['trailer_youtube','highlights','audience','instructor_name','instructor_title','instructor_bio','instructor_photo','faq','pay_account_id','instructor2_name','instructor2_title','instructor2_bio','instructor2_photo'].forEach(function (k) { card[k] = x[k] || ''; });
    card.students = en.filter(function (e) { return e.course_id === x.course_id && e.status === 'approved'; }).length;
    return card;
  });
}

function adminCourseSave_(d, p, admin) {
  if (!APP.SUBJECTS[d.subject]) throw err_('BAD_INPUT', 'เลือกวิชา');
  var price = Number(d.price);
  if (!(price >= 0)) throw err_('BAD_INPUT', 'ราคาต้องเป็นตัวเลข');
  var patch = {
    subject: d.subject, title: req_(d.title, 'ชื่อคอร์ส', 120), subtitle: clip_(d.subtitle, 160), description: clip_(d.description, 2000),
    cover_url: clip_(d.cover_url, 500), price: String(price), status: d.status === 'published' ? 'published' : 'draft',
    sort_order: String(Number(d.sort_order) || 0),
    level: APP.LEVELS.indexOf(d.level) >= 0 ? d.level : '',
    full_price: d.full_price === '' || d.full_price == null ? '' : String(Math.max(0, Number(d.full_price) || 0)),
    highlights: lines_(d.highlights, 12, 200).join('\n'), audience: lines_(d.audience, 10, 200).join('\n'),
    instructor_name: clip_(d.instructor_name, 80), instructor_title: clip_(d.instructor_title, 160),
    instructor_bio: clip_(d.instructor_bio, 1500), instructor_photo: clip_(d.instructor_photo, 500), faq: clip_(d.faq, 5000),
    instructor2_name: clip_(d.instructor2_name, 80), instructor2_title: clip_(d.instructor2_title, 160), instructor2_bio: clip_(d.instructor2_bio, 1500), instructor2_photo: clip_(d.instructor2_photo, 500),
    pay_account_id: clip_(d.pay_account_id, 20)
  };
  var tr = String(d.trailer_youtube || '').trim();
  patch.trailer_youtube = tr ? youtubeId_(tr) : '';
  if (tr && !patch.trailer_youtube) throw err_('BAD_INPUT', 'ลิงก์คลิปแนะนำคอร์สไม่ใช่ลิงก์ YouTube');
  ['cover_url', 'instructor_photo', 'instructor2_photo'].forEach(function (k) { if (patch[k] && !/^https:\/\//.test(patch[k])) throw err_('BAD_INPUT', 'ลิงก์รูปต้องขึ้นต้นด้วย https://'); });
  var id = withLock_(function () {
    ensureCols_('Courses');
    if (d.course_id) {
      var x = findOne_('Courses', function (r) { return r.course_id === d.course_id; });
      if (!x) throw err_('NOT_FOUND', 'ไม่พบคอร์ส');
      update_('Courses', x._row, patch); log_(admin, 'course.edit', d.course_id); return d.course_id;
    }
    var cid = slug_(d.new_id) || (d.subject.toUpperCase() + '-' + id_().slice(0, 5));
    if (findOne_('Courses', function (r) { return r.course_id === cid; })) throw err_('BAD_INPUT', 'รหัสคอร์ส ' + cid + ' ซ้ำ');
    patch.course_id = cid; patch.created_at = now_();
    append_('Courses', patch); log_(admin, 'course.create', cid); return cid;
  });
  cache_().remove('pub_courses'); cache_().remove('pub_bundles');
  return { course_id: id };
}

function adminLessons_(d) {
  var list = read_('Lessons').filter(function (l) { return l.course_id === d.course_id; }).sort(bySort_);
  return list.map(function (l) {
    return { lesson_id: l.lesson_id, course_id: l.course_id, chapter: l.chapter, title: l.title, youtube_id: l.youtube_id,
      duration_min: Number(l.duration_min) || 0, attachment_url: l.attachment_url, is_preview: truthy_(l.is_preview), sort_order: Number(l.sort_order) || 0 };
  });
}

function adminLessonSave_(d, p, admin) {
  var yt = youtubeId_(d.youtube);
  if (!yt) throw err_('BAD_INPUT', 'ลิงก์ YouTube ไม่ถูกต้อง ลองคัดลอกจากปุ่มแชร์ใต้คลิป');
  var att = clip_(d.attachment_url, 500);
  if (att && !/^https:\/\//.test(att)) throw err_('BAD_INPUT', 'ลิงก์ไฟล์ประกอบต้องขึ้นต้นด้วย https://');
  var patch = {
    chapter: req_(d.chapter, 'บท', 120), title: req_(d.title, 'ชื่อตอน', 160), youtube_id: yt,
    duration_min: String(Math.max(0, Math.round(Number(d.duration_min) || 0))), attachment_url: att,
    is_preview: d.is_preview ? 'TRUE' : 'FALSE'
  };
  var id = withLock_(function () {
    if (d.lesson_id) {
      var l = findOne_('Lessons', function (r) { return r.lesson_id === d.lesson_id; });
      if (!l) throw err_('NOT_FOUND', 'ไม่พบบทเรียน');
      update_('Lessons', l._row, patch); log_(admin, 'lesson.edit', d.lesson_id); return d.lesson_id;
    }
    if (!findOne_('Courses', function (r) { return r.course_id === d.course_id; })) throw err_('NOT_FOUND', 'ไม่พบคอร์ส');
    var same = read_('Lessons').filter(function (r) { return r.course_id === d.course_id; });
    var max = same.reduce(function (m, r) { return Math.max(m, Number(r.sort_order) || 0); }, 0);
    patch.lesson_id = 'L' + id_(); patch.course_id = d.course_id; patch.sort_order = String(max + 10);
    append_('Lessons', patch); log_(admin, 'lesson.create', patch.lesson_id); return patch.lesson_id;
  });
  cache_().remove('pub_courses');
  return { lesson_id: id, youtube_id: yt };
}

/** เพิ่มหลายตอนพร้อมกัน: items = [{ chapter, title, youtube, duration_min, is_preview }] (ต่อท้ายตอนเดิม) */
function adminLessonsBulk_(d, p, admin) {
  var items = Array.isArray(d.items) ? d.items.slice(0, 300) : [];
  if (!items.length) throw err_('BAD_INPUT', 'ไม่มีรายการตอน');
  var rows = items.map(function (it, i) {
    var yt = youtubeId_(it.youtube), n = 'แถวที่ ' + (i + 1) + ': ';
    if (!yt) throw err_('BAD_INPUT', n + 'ลิงก์ YouTube ไม่ถูกต้อง');
    var title = clip_(it.title, 160), chapter = clip_(it.chapter, 120);
    if (!title) throw err_('BAD_INPUT', n + 'ไม่มีชื่อตอน');
    if (!chapter) throw err_('BAD_INPUT', n + 'ไม่มีชื่อบท (ใส่บรรทัด # ชื่อบท ไว้ก่อน)');
    return { chapter: chapter, title: title, youtube_id: yt, duration_min: String(Math.max(0, Math.round(Number(it.duration_min) || 0))), attachment_url: '', is_preview: it.is_preview ? 'TRUE' : 'FALSE' };
  });
  var n = withLock_(function () {
    if (!findOne_('Courses', function (r) { return r.course_id === d.course_id; })) throw err_('NOT_FOUND', 'ไม่พบคอร์ส');
    var max = read_('Lessons').filter(function (r) { return r.course_id === d.course_id; }).reduce(function (m, r) { return Math.max(m, Number(r.sort_order) || 0); }, 0);
    var sh = sheet_('Lessons'), head = headers_('Lessons');
    var vals = rows.map(function (r, i) {
      r.lesson_id = 'L' + id_() + i; r.course_id = d.course_id; r.sort_order = String(max + (i + 1) * 10);
      return head.map(function (h) { return r[h] == null ? '' : String(r[h]); });
    });
    var start = sh.getLastRow() + 1;
    sh.getRange(start, 1, vals.length, head.length).setNumberFormat('@').setValues(vals);
    delete _cache.Lessons;
    log_(admin, 'lesson.bulk', d.course_id + ' +' + vals.length);
    return vals.length;
  });
  cache_().remove('pub_courses');
  return { added: n };
}

function adminLessonDelete_(d, p, admin) {
  withLock_(function () {
    var rows = read_('Lessons').filter(function (r) { return r.lesson_id === d.lesson_id; });
    if (!rows.length) throw err_('NOT_FOUND', 'ไม่พบบทเรียน');
    deleteRows_('Lessons', rows); log_(admin, 'lesson.delete', d.lesson_id);
  });
  cache_().remove('pub_courses');
  return true;
}

function adminLessonsReorder_(d, p, admin) {
  var order = (d.order || []).map(String);
  withLock_(function () {
    read_('Lessons').forEach(function (l) {
      var i = order.indexOf(l.lesson_id);
      if (l.course_id === d.course_id && i >= 0 && Number(l.sort_order) !== (i + 1) * 10) update_('Lessons', l._row, { sort_order: String((i + 1) * 10) });
    });
    log_(admin, 'lesson.reorder', d.course_id);
  });
  return true;
}

function adminUsers_(d) {
  var q = String(d.q || '').trim().toLowerCase();
  var en = read_('Enrollments'), ses = read_('Sessions'), courses = read_('Courses');
  return read_('Users').filter(function (u) {
    return !q || [u.email, u.first_name, u.last_name, u.nickname, u.phone, u.school].join(' ').toLowerCase().indexOf(q) >= 0;
  }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 100).map(function (u) {
    var s = ses.filter(function (x) { return x.user_id === u.user_id; })[0];
    var cs = en.filter(function (e) { return e.user_id === u.user_id && e.status === 'approved'; }).map(function (e) {
      var c = courses.filter(function (x) { return x.course_id === e.course_id; })[0]; return c ? c.title : e.course_id; });
    var pu = publicUser_(u);
    pu.courses = cs; pu.device = s ? s.device_info : ''; pu.device_since = s ? s.created_at : '';
    return pu;
  });
}

function adminUserUpdate_(d, p, admin) {
  withLock_(function () {
    var u = findOne_('Users', function (r) { return r.user_id === d.user_id; });
    if (!u) throw err_('NOT_FOUND', 'ไม่พบผู้ใช้');
    if (u.user_id === admin.user_id) throw err_('BAD_INPUT', 'แก้สิทธิ์ของตัวเองไม่ได้');
    var patch = {};
    if (d.role === 'admin' || d.role === 'student') patch.role = d.role;
    if (d.status === 'active' || d.status === 'banned') patch.status = d.status;
    update_('Users', u._row, patch);
    if (patch.status === 'banned') killSessions_(u.user_id);
    log_(admin, 'user.update', u.email + ' ' + JSON.stringify(patch));
  });
  return true;
}

function adminResetDevice_(d, p, admin) {
  withLock_(function () { killSessions_(d.user_id); log_(admin, 'user.resetDevice', d.user_id); });
  return true;
}

// ───────────────────────── ผลงานนักเรียน (Hall of fame) ─────────────────────────
function resultOut_(r) {
  return { result_id: r.result_id, year: r.year, subject: r.subject, subject_name: APP.SUBJECTS[r.subject] || r.subject,
    nickname: r.nickname, school: r.school, center: r.center, review: r.review, photo_url: r.photo_url,
    status: r.status || 'published', sort_order: Number(r.sort_order) || 0 };
}
function publicResults_() {
  var c = cache_().get('pub_results'); if (c) return JSON.parse(c);
  var list = read_('Results').filter(function (r) { return r.status !== 'hidden'; })
    .sort(function (a, b) { return (Number(b.year) || 0) - (Number(a.year) || 0) || bySort_(a, b); }).map(resultOut_);
  try { cache_().put('pub_results', JSON.stringify(list), 300); } catch (e) {}
  return list;
}
function adminResults_() {
  return read_('Results').sort(function (a, b) { return (Number(b.year) || 0) - (Number(a.year) || 0) || bySort_(a, b); }).map(resultOut_);
}
function adminResultSave_(d, p, admin) {
  if (!APP.SUBJECTS[d.subject]) throw err_('BAD_INPUT', 'เลือกวิชา');
  var year = String(d.year || '').replace(/\D/g, '');
  if (!/^25\d\d$/.test(year)) throw err_('BAD_INPUT', 'ปีต้องเป็น พ.ศ. 4 หลัก เช่น 2569');
  var photo = clip_(d.photo_url, 500);
  if (photo && !/^https:\/\//.test(photo)) throw err_('BAD_INPUT', 'ลิงก์รูปต้องขึ้นต้นด้วย https://');
  var patch = { year: year, subject: d.subject, nickname: req_(d.nickname, 'ชื่อเล่น', 40), school: clip_(d.school, 120), center: clip_(d.center, 120),
    review: clip_(d.review, 2000), photo_url: photo, status: d.status === 'hidden' ? 'hidden' : 'published', sort_order: String(Number(d.sort_order) || 0) };
  var id = withLock_(function () {
    ensureCols_('Results');
    if (d.result_id) {
      var r = findOne_('Results', function (x) { return x.result_id === d.result_id; });
      if (!r) throw err_('NOT_FOUND', 'ไม่พบรายการนี้');
      update_('Results', r._row, patch); log_(admin, 'result.edit', d.result_id); return d.result_id;
    }
    patch.result_id = 'R' + id_(); patch.created_at = now_();
    append_('Results', patch); log_(admin, 'result.create', patch.result_id + ' ' + patch.nickname); return patch.result_id;
  });
  cache_().remove('pub_results');
  return { result_id: id };
}
function adminResultDelete_(d, p, admin) {
  withLock_(function () {
    var rows = read_('Results').filter(function (r) { return r.result_id === d.result_id; });
    if (!rows.length) throw err_('NOT_FOUND', 'ไม่พบรายการนี้');
    deleteRows_('Results', rows); log_(admin, 'result.delete', d.result_id);
  });
  cache_().remove('pub_results');
  return true;
}
/** อัปโหลดรูปขึ้น Drive (โฟลเดอร์สาธารณะ) แล้วคืนลิงก์รูปที่ใช้บนเว็บได้ */
function adminUpload_(d, p, admin) {
  if (!/^image\/(jpeg|png|webp)$/.test(d.mime || '')) throw err_('BAD_INPUT', 'อัปโหลดได้เฉพาะรูป JPG, PNG หรือ WEBP');
  if (!d.base64 || d.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err_('BAD_INPUT', 'รูปใหญ่เกิน 3 MB');
  var ext = d.mime === 'image/png' ? 'png' : d.mime === 'image/webp' ? 'webp' : 'jpg';
  var file = publicFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(d.base64), d.mime, 'img_' + id_() + '.' + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  log_(admin, 'upload', file.getId());
  return { url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200' };
}
function publicFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('PUBLIC_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  var f = DriveApp.createFolder('INeedBio Public Images');
  props.setProperty('PUBLIC_FOLDER_ID', f.getId());
  return f;
}

function adminSettingsSave_(d, p, admin) {
  var allowed = Object.keys(DEFAULT_SETTINGS);
  withLock_(function () {
    Object.keys(d).forEach(function (k) { if (allowed.indexOf(k) >= 0) setSetting_(k, clip_(d[k], /_text$/.test(k) ? 40000 : 1000)); });
    log_(admin, 'settings', Object.keys(d).join(','));
  });
  cache_().remove('settings');
  return allSettings_();
}

// ───────────────────────── อีเมล ─────────────────────────
function mailShell_(title, inner) {
  return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
  '<body style="margin:0;padding:0;background:#f4f4f3;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f3;padding:32px 12px;"><tr><td align="center">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e6e4;font-family:\'Anuphan\',\'Sarabun\',\'Leelawadee UI\',Tahoma,Arial,sans-serif;">' +
  '<tr><td style="padding:28px 32px 4px;"><span style="font-size:20px;font-weight:700;color:#0c0c0c;letter-spacing:-0.3px;">INeed<span style="font-weight:300;">Bio</span></span></td></tr>' +
  '<tr><td style="padding:14px 32px 0;"><h1 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#0c0c0c;">' + esc_(title) + '</h1></td></tr>' +
  inner +
  '<tr><td style="background:#fafafa;padding:18px 32px;font-size:12px;line-height:1.7;color:#8a8a8a;text-align:center;border-top:1px solid #efefed;">' +
  'มีคำถาม? ทักมาได้ที่ IG <a href="https://www.instagram.com/' + esc_(getSetting_('contact_ig') || 'ineedbiochem') + '" style="color:#0c0c0c;font-weight:600;text-decoration:none;">@' + esc_(getSetting_('contact_ig') || 'ineedbiochem') + '</a><br>© ' + new Date().getFullYear() + ' INeedBio · อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ</td></tr>' +
  '</table></td></tr></table></body></html>';
}

function sendOtpEmail_(email, otp, name, purpose) {
  if (MailApp.getRemainingDailyQuota() < 1) throw err_('MAIL_QUOTA', 'วันนี้ระบบส่งอีเมลครบโควตาแล้ว ลองใหม่พรุ่งนี้ หรือทัก IG แอดมิน');
  var reg = purpose === 'register';
  var cells = String(otp).split('').map(function (d) {
    return '<td style="padding:0 4px;"><div style="width:44px;height:56px;line-height:56px;border:1px solid #dcdcda;border-radius:10px;background:#fafafa;font-family:\'Courier New\',monospace;font-size:28px;font-weight:700;color:#0c0c0c;text-align:center;">' + d + '</div></td>';
  }).join('');
  var inner =
    '<tr><td style="padding:0 32px;"><p style="margin:0;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc_(name || '') + '<br>' +
    (reg ? 'ยินดีต้อนรับสู่ INeedBio! กรอกรหัสด้านล่างในหน้าสมัครสมาชิกเพื่อยืนยันอีเมล' : 'มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีนี้ กรอกรหัสด้านล่างเพื่อดำเนินการต่อ') + '</p></td></tr>' +
    '<tr><td align="center" style="padding:26px 16px 8px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>' + cells + '</tr></table></td></tr>' +
    '<tr><td align="center" style="padding:6px 32px 24px;"><span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#f1f1ef;color:#525252;font-size:13px;">รหัสนี้ใช้ได้ภายใน ' + APP.OTP_MINUTES + ' นาที</span></td></tr>' +
    '<tr><td style="padding:0 32px 24px;font-size:13px;line-height:1.7;color:#8a8a8a;">ห้ามแชร์รหัสนี้ให้ผู้อื่น ทีมงาน INeedBio จะไม่ขอรหัสนี้จากคุณในทุกกรณี<br>' +
    (reg ? 'หากคุณไม่ได้สมัครสมาชิก สามารถละเว้นอีเมลนี้ได้' : 'หากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน ละเว้นอีเมลนี้ได้ รหัสผ่านเดิมยังใช้ได้ตามปกติ') + '</td></tr>';
  MailApp.sendEmail({
    to: email, name: APP.NAME,
    subject: otp + (reg ? ' คือรหัสยืนยันการสมัครสมาชิก INeedBio' : ' คือรหัสตั้งรหัสผ่านใหม่ INeedBio'),
    body: 'รหัสของคุณคือ ' + otp + ' (ใช้ได้ภายใน ' + APP.OTP_MINUTES + ' นาที)',
    htmlBody: mailShell_(reg ? 'ยืนยันอีเมลของคุณ' : 'ตั้งรหัสผ่านใหม่', inner)
  });
}

function sendDecisionEmail_(u, c, decision, note) {
  if (MailApp.getRemainingDailyQuota() < 1) return;
  var ok = decision === 'approved';
  var inner = '<tr><td style="padding:0 32px 26px;"><p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc_(u.nickname) + '<br>' +
    (ok ? 'แอดมินตรวจสลิปแล้ว ตอนนี้เข้าเรียนคอร์ส <b style="color:#0c0c0c;">' + esc_(c.title) + '</b> ได้เลย เข้าสู่ระบบแล้วไปที่ “คอร์สของฉัน”'
        : 'คำขอเข้าเรียนคอร์ส <b style="color:#0c0c0c;">' + esc_(c.title) + '</b> ยังไม่ผ่านการตรวจสลิป') + '</p>' +
    (!ok && note ? '<p style="margin:0 0 14px;padding:12px 14px;background:#fafafa;border-radius:10px;font-size:14px;color:#0c0c0c;">เหตุผล: ' + esc_(note) + '</p>' : '') +
    (!ok ? '<p style="margin:0;font-size:14px;color:#525252;">แก้ไขแล้วส่งสลิปใหม่ได้ที่หน้าคอร์ส หรือทัก IG แอดมินเพื่อสอบถาม</p>' : '') + '</td></tr>';
  MailApp.sendEmail({ to: u.email, name: APP.NAME,
    subject: ok ? 'เข้าเรียนได้แล้ว: ' + c.title : 'คำขอเข้าเรียนยังไม่ผ่าน: ' + c.title,
    body: ok ? 'เข้าเรียนคอร์ส ' + c.title + ' ได้แล้ว' : 'คำขอเข้าเรียนคอร์ส ' + c.title + ' ยังไม่ผ่าน ' + (note || ''),
    htmlBody: mailShell_(ok ? 'เข้าเรียนได้แล้ว' : 'คำขอยังไม่ผ่าน', inner) });
}

function notifyAdmins_(subject, rows, footer) {
  var to = String(getSetting_('admin_emails') || '').split(',').map(trim_).filter(String);
  if (!to.length || MailApp.getRemainingDailyQuota() < to.length) return;
  var inner = '<tr><td style="padding:0 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">' +
    rows.map(function (r) { return '<tr><td style="padding:7px 0;color:#8a8a8a;width:120px;border-bottom:1px solid #efefed;">' + esc_(r[0]) + '</td><td style="padding:7px 0;color:#0c0c0c;border-bottom:1px solid #efefed;">' + esc_(r[1]) + '</td></tr>'; }).join('') +
    '</table></td></tr><tr><td style="padding:14px 32px 26px;font-size:13px;color:#525252;">' + esc_(footer) + '</td></tr>';
  MailApp.sendEmail({ to: to.join(','), name: APP.NAME + ' ระบบ', subject: subject, body: rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n'), htmlBody: mailShell_(subject, inner) });
}

// ───────────────────────── Sheet helpers ─────────────────────────
var _ss = null, _cache = {};
function ss_() {
  if (_ss) return _ss;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw err_('SETUP', 'ยังไม่ได้รัน setup()');
  return (_ss = SpreadsheetApp.openById(id));
}
function sheet_(name) { return ss_().getSheetByName(name); }

/** อ่านทั้งแท็บเป็น array ของ object (อ้างคอลัมน์ตามชื่อหัวตาราง) */
function read_(name) {
  if (_cache[name]) return _cache[name].map(function (r) { return r; });
  var sh = sheet_(name), vals = sh.getDataRange().getValues();
  var head = vals[0].map(String), out = [];
  for (var i = 1; i < vals.length; i++) {
    var o = { _row: i + 1 }, empty = true;
    for (var j = 0; j < head.length; j++) { var v = vals[i][j]; o[head[j]] = v instanceof Date ? v.toISOString() : String(v); if (o[head[j]] !== '') empty = false; }
    if (!empty) out.push(o);
  }
  _cache[name] = out;
  return out.slice();
}
function headers_(name) { var sh = sheet_(name); return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String); }
/** เพิ่มคอลัมน์ที่ยังไม่มีต่อท้าย (ไม่แตะคอลัมน์เดิม) — ใช้ตอนอัปเดตระบบ */
function ensureCols_(name) {
  var sh = sheet_(name), want = SCHEMA[name];
  var have = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String).filter(String) : [];
  var miss = want.filter(function (c) { return have.indexOf(c) < 0; });
  if (!miss.length) return;
  var all = have.concat(miss);
  sh.getRange(1, 1, sh.getMaxRows(), all.length).setNumberFormat('@');
  sh.getRange(1, 1, 1, all.length).setValues([all]).setFontWeight('bold').setBackground('#f1f1f1');
  sh.setFrozenRows(1);
  delete _cache[name];
}
function findOne_(name, pred) { return read_(name).filter(pred)[0] || null; }
function append_(name, obj) {
  var sh = sheet_(name), head = headers_(name);
  var row = head.map(function (h) { return obj[h] == null ? '' : String(obj[h]); });
  var r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, head.length).setNumberFormat('@').setValues([row]);
  delete _cache[name];
}
function update_(name, rowNum, patch) {
  var sh = sheet_(name), head = headers_(name);
  var rng = sh.getRange(rowNum, 1, 1, head.length), cur = rng.getValues()[0];
  head.forEach(function (h, i) { if (h in patch) cur[i] = patch[h] == null ? '' : String(patch[h]); });
  rng.setNumberFormat('@').setValues([cur]);
  delete _cache[name];
}
function deleteRows_(name, rows) {
  var sh = sheet_(name);
  rows.map(function (r) { return r._row; }).sort(function (a, b) { return b - a; }).forEach(function (n) { sh.deleteRow(n); });
  if (rows.length) delete _cache[name];
}
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { _cache = {}; return fn(); } finally { lock.releaseLock(); }
}

function allSettings_() {
  var o = {};
  read_('Settings').forEach(function (r) { o[r.key] = r.value; });
  return o;
}
function getSetting_(k) { var s = allSettings_(); return k in s ? s[k] : DEFAULT_SETTINGS[k]; }
function setSetting_(k, v) {
  var r = findOne_('Settings', function (x) { return x.key === k; });
  if (r) update_('Settings', r._row, { value: v }); else append_('Settings', { key: k, value: v });
}
function publicSettings_() {
  var c = cache_().get('settings'); if (c) return JSON.parse(c);
  var s = allSettings_(), o = {};
  PUBLIC_SETTINGS.forEach(function (k) { o[k] = k in s ? s[k] : DEFAULT_SETTINGS[k]; });
  o.subjects = APP.SUBJECTS;
  o.levels = APP.LEVELS;
  o.repeat_grades = APP.REPEAT_GRADES;
  o.terms_version = APP.TERMS_VERSION;
  o.banks = BANKS;
  o.proof_extra_fields = proofExtra_();
  cache_().put('settings', JSON.stringify(o), 300);
  return o;
}
function log_(admin, action, detail) { append_('AdminLog', { time: now_(), admin_id: admin.user_id, action: action, detail: clip_(detail, 500) }); }
function killSessions_(userId) {
  var rows = read_('Sessions').filter(function (s) { return s.user_id === userId; });
  rows.forEach(function (s) { cache_().remove('s:' + s.token_hash); });
  deleteRows_('Sessions', rows);
}

// ───────────────────────── Utils ─────────────────────────
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function err_(code, msg) { var e = new Error(msg); e.code = code; return e; }
function cache_() { return CacheService.getScriptCache(); }
function now_() { return new Date().toISOString(); }
function trim_(s) { return String(s || '').trim(); }
function clip_(s, n) { return String(s == null ? '' : s).trim().slice(0, n); }
function truthy_(v) { return String(v).toUpperCase() === 'TRUE' || v === true || v === '1'; }
function req_(v, label, max) { var s = clip_(v, max); if (!s) throw err_('BAD_INPUT', 'กรอก' + label); return s; }
function normEmail_(e) {
  var s = String(e || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(s) || s.length > 120) throw err_('BAD_INPUT', 'รูปแบบอีเมลไม่ถูกต้อง');
  return s;
}
function phone_(p) { var s = String(p || '').replace(/[^\d]/g, ''); if (!/^0\d{8,9}$/.test(s)) throw err_('BAD_INPUT', 'เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)'); return s; }
function checkPassword_(pw) { if (String(pw || '').length < 8) throw err_('BAD_INPUT', 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัว'); }
function userByEmail_(email) { return findOne_('Users', function (r) { return r.email === email; }); }
/** คณะ/มหาวิทยาลัยในฝัน (ทุกคน) + ปัจจุบัน (เด็กซิ่ว: จบ ม.6 แล้ว / อื่นๆ) */
function isRepeat_(grade) { return APP.REPEAT_GRADES.indexOf(grade) >= 0; }
function goals_(d, out) {
  out.dream_faculty = req_(d.dream_faculty, 'คณะในฝัน', 120);
  out.dream_university = req_(d.dream_university, 'มหาวิทยาลัยในฝัน', 120);
  if (isRepeat_(out.grade)) {
    out.current_faculty = req_(d.current_faculty, 'คณะที่เรียนอยู่ปัจจุบัน', 120);
    out.current_university = req_(d.current_university, 'มหาวิทยาลัยที่เรียนอยู่ปัจจุบัน', 120);
  } else { out.current_faculty = ''; out.current_university = ''; }
  return out;
}
function publicUser_(u) {
  return { user_id: u.user_id, email: u.email, first_name: u.first_name, last_name: u.last_name, nickname: u.nickname,
    school: u.school, grade: u.grade, phone: u.phone, role: u.role, status: u.status, created_at: u.created_at,
    current_faculty: u.current_faculty || '', current_university: u.current_university || '', dream_faculty: u.dream_faculty || '', dream_university: u.dream_university || '',
    is_repeat: isRepeat_(u.grade), terms_version: u.terms_version || '' };
}
function latestEnroll_(uid, cid) {
  return read_('Enrollments').filter(function (e) { return e.user_id === uid && e.course_id === cid; })
    .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })[0] || null;
}
function chapters_(lessons, map) {
  var out = [], idx = {};
  lessons.sort(bySort_).forEach(function (l) {
    var k = l.chapter || 'บทเรียน';
    if (!(k in idx)) { idx[k] = out.length; out.push({ title: k, lessons: [] }); }
    out[idx[k]].lessons.push(map(l));
  });
  return out;
}
function lines_(v, max, len) { return String(v || '').split(/\r?\n/).map(function (l) { return l.replace(/^\s*[-•*]\s*/, '').trim().slice(0, len); }).filter(String).slice(0, max); }
/** FAQ: แต่ละข้อคั่นด้วยบรรทัดว่าง บรรทัดแรก = คำถาม บรรทัดที่เหลือ = คำตอบ */
function parseFaq_(v) {
  return String(v || '').replace(/\r/g, '').split(/\n\s*\n/).map(function (b) {
    var ls = b.split('\n').map(trim_).filter(String);
    return ls.length ? { q: ls[0].replace(/^(ถาม|Q)\s*[:：]\s*/i, ''), a: ls.slice(1).join('\n').replace(/^(ตอบ|A)\s*[:：]\s*/i, '') } : null;
  }).filter(function (f) { return f && f.a; }).slice(0, 20);
}
function topCount_(arr, n) {
  var o = {}; arr.forEach(function (v) { v = String(v || '').trim(); if (v) o[v] = (o[v] || 0) + 1; });
  return Object.keys(o).map(function (k) { return { name: k, count: o[k] }; }).sort(function (a, b) { return b.count - a.count; }).slice(0, n);
}
function bySort_(a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0); }
function youtubeId_(u) {
  var s = String(u || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  var m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}
function slug_(s) { return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 30); }
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function hex_(bytes) { return bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function sha256_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)); }
function hashPw_(pw, salt) { var h = salt + '|' + pw; for (var i = 0; i < APP.HASH_ROUNDS; i++) h = sha256_(h + salt); return h; }
function rand_(n) { var s = ''; while (s.length < n) s += Utilities.getUuid().replace(/-/g, ''); return s.slice(0, n); }
function id_() { return (Date.now().toString(36) + rand_(6)).toUpperCase(); }
function otp_() {
  var h = sha256_(Utilities.getUuid() + Math.random());
  return String(parseInt(h.slice(0, 12), 16) % 1000000 + 1000000).slice(1);
}
function rate_(key, limit, sec, msg) {
  var c = cache_(), n = Number(c.get('rl:' + key) || 0);
  if (n >= limit) throw err_('RATE_LIMIT', msg);
  c.put('rl:' + key, String(n + 1), sec);
}

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
                'trailer_youtube','highlights','audience','instructor_name','instructor_title','instructor_bio','instructor_photo','faq','full_price','level'],
  Lessons:     ['lesson_id','course_id','chapter','title','youtube_id','duration_min','attachment_url','is_preview','sort_order'],
  Enrollments: ['enroll_id','user_id','course_id','status','amount','slip_file_id','note','created_at','decided_by','decided_at'],
  Progress:    ['user_id','course_id','lesson_id','completed_at'],
  AdminLog:    ['time','admin_id','action','detail'],
  Settings:    ['key','value'],
  Results:     ['result_id','year','subject','nickname','school','center','review','photo_url','status','sort_order','created_at']
};

var PUBLIC_SETTINGS = ['terms_text','privacy_text','hero_eyebrow','hero_title','hero_subtitle','announcement','promptpay_id','promptpay_name','contact_ig','contact_phone'];
var DEFAULT_SETTINGS = {
  hero_eyebrow: 'INeedBio Online',
  hero_title: 'ติวเข้ม ม.ปลาย|กับ INeedBio',
  hero_subtitle: 'คอร์สเดียว เรียนได้ตลอดชีพ ไม่มีการลบคลิป',
  announcement: '',
  promptpay_id: '0910256171',
  promptpay_name: 'INeedBio',
  contact_ig: 'ineedbiochem',
  contact_phone: '091-025-6171',
  admin_emails: '',
  terms_text: '',
  privacy_text: ''
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
  'admin.upload':      adminOnly_(adminUpload_)
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
  out.instructor = x.instructor_name ? { name: x.instructor_name, title: x.instructor_title || '', bio: x.instructor_bio || '', photo: x.instructor_photo || '' } : null;
  out.faq = parseFaq_(x.faq);
  out.enrollment = null;
  if (p.token) {
    try { var u = auth_(p); var e = latestEnroll_(u.user_id, x.course_id); out.enrollment = e ? e.status : null; out.note = e ? e.note : ''; } catch (ignore) {}
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

// ───────────────────────── แอดมิน ─────────────────────────
function adminStats_() {
  var users = read_('Users'), en = read_('Enrollments'), courses = read_('Courses');
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
    pending: en.filter(function (e) { return e.status === 'pending'; }).length,
    oldest_pending: en.filter(function (e) { return e.status === 'pending'; }).map(function (e) { return e.created_at; }).sort()[0] || '',
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
    ['trailer_youtube','highlights','audience','instructor_name','instructor_title','instructor_bio','instructor_photo','faq'].forEach(function (k) { card[k] = x[k] || ''; });
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
    instructor_bio: clip_(d.instructor_bio, 1500), instructor_photo: clip_(d.instructor_photo, 500), faq: clip_(d.faq, 5000)
  };
  var tr = String(d.trailer_youtube || '').trim();
  patch.trailer_youtube = tr ? youtubeId_(tr) : '';
  if (tr && !patch.trailer_youtube) throw err_('BAD_INPUT', 'ลิงก์คลิปแนะนำคอร์สไม่ใช่ลิงก์ YouTube');
  ['cover_url', 'instructor_photo'].forEach(function (k) { if (patch[k] && !/^https:\/\//.test(patch[k])) throw err_('BAD_INPUT', 'ลิงก์รูปต้องขึ้นต้นด้วย https://'); });
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
  cache_().remove('pub_courses');
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

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
  LEVELS: ['สอวน.', 'A-Level', 'ม.4', 'ม.5', 'ม.6', 'ม.ต้น', 'อื่นๆ'],
  AVATAR_MAX_BYTES: 2 * 1024 * 1024,
  FILE_MAX_BYTES: 10 * 1024 * 1024,
  // สถานะที่แอดมินตั้งเองได้จากทะเบียนนักเรียน ('rejected' ตั้งได้จากการตรวจสลิปเท่านั้น)
  PAY_STATUSES: ['approved', 'pending', 'unpaid'],
  CAMP_SUBJECTS: ['ชีวะ', 'เคมี', 'ฟิสิกส์', 'คอม', 'คณิต', 'ดาราศาสตร์'],
  CAMP_RESULTS: ['ยังไม่ทราบผล', 'ผ่านค่าย 1', 'ตัวสำรอง', 'ไม่ผ่าน'],
  CAMP_CENTERS: ['ศูนย์โรงเรียน', 'ม.เทคโนโลยีสุรนารี', 'ม.ขอนแก่น', 'ม.สงขลานครินทร์', 'ม.นเรศวร', 'ม.อุบลราชธานี', 'ม.ศิลปากร', 'ม.เชียงใหม่',
                 'ม.ทักษิณ', 'ม.บูรพา', 'ม.เกษตรศาสตร์', 'ม.วลัยลักษณ์', 'ม.เทคโนโลยีพระจอมเกล้าพระนครเหนือ', 'จุฬาลงกรณ์มหาวิทยาลัย', 'ม.มหิดล', 'ม.ธรรมศาสตร์', 'ยังไม่ระบุ'],
  BLOCK_TYPES: ['hero', 'course', 'feature', 'banner']
};

var SCHEMA = {
  Users:       ['user_id','email','password_hash','salt','first_name','last_name','nickname','school','grade','phone','role','status','created_at','last_login_at',
                'current_faculty','current_university','dream_faculty','dream_university','terms_version','terms_accepted_at','avatar_url','admin_note'],
  Sessions:    ['token_hash','user_id','device_id','device_info','created_at','expires_at'],
  Courses:     ['course_id','subject','title','subtitle','description','cover_url','price','status','sort_order','created_at',
                'trailer_youtube','highlights','audience','instructor_name','instructor_title','instructor_bio','instructor_photo','faq','full_price','level',
                'promptpay_id','promptpay_name','payment_qr_url'],
  Lessons:     ['lesson_id','course_id','chapter','title','youtube_id','duration_min','attachment_url','is_preview','sort_order'],
  Enrollments: ['enroll_id','user_id','course_id','status','amount','slip_file_id','note','created_at','decided_by','decided_at'],
  Progress:    ['user_id','course_id','lesson_id','completed_at'],
  AdminLog:    ['time','admin_id','action','detail'],
  Settings:    ['key','value'],
  Results:     ['result_id','year','subject','nickname','school','center','review','photo_url','status','sort_order','created_at'],
  Camp:        ['camp_id','name','nickname','grade','subject','center','result','notes','user_id','created_at','updated_at'],
  Blocks:      ['block_id','page','type','heading','sub','bg','fg','image_url','link_url','status','sort_order','created_at']
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
  'profile.avatar':    profileAvatar_,
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
  'admin.upload':      adminOnly_(adminUpload_),
  'admin.file.upload': adminOnly_(adminFileUpload_),
  // ทะเบียนนักเรียน
  'admin.students':        adminOnly_(adminStudents_),
  'admin.students.save':   adminOnly_(adminStudentsSave_),
  'admin.student.create':  adminOnly_(adminStudentCreate_),
  'admin.student.update':  adminOnly_(adminStudentUpdate_),
  'admin.student.delete':  adminOnly_(adminStudentDelete_),
  'admin.student.enroll':  adminOnly_(adminStudentEnroll_),
  'admin.students.import': adminOnly_(adminStudentsImport_),
  // ติดตามผลค่าย สอวน.
  'admin.camp':        adminOnly_(adminCamp_),
  'admin.camp.save':   adminOnly_(adminCampSave_),
  'admin.camp.delete': adminOnly_(adminCampDelete_),
  'admin.camp.import': adminOnly_(adminCampImport_),
  // Design Studio (บล็อกบนหน้าแรก)
  'blocks.list':       function () { return publicBlocks_(); },
  'admin.blocks':      adminOnly_(adminBlocks_),
  'admin.block.save':  adminOnly_(adminBlockSave_),
  'admin.block.delete': adminOnly_(adminBlockDelete_),
  'admin.blocks.reorder': adminOnly_(adminBlocksReorder_)
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
  publicFolder_(); avatarFolder_(); lessonFolder_();
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

/** รูปโปรไฟล์: อัปโหลดขึ้นโฟลเดอร์ INeedBio Avatars (เปิดดูได้ด้วยลิงก์) แล้วย้ายรูปเก่าลงถังขยะ · ส่ง { remove: true } เพื่อลบรูป */
function profileAvatar_(d, p) {
  var u = auth_(p);
  rate_('avatar:' + u.user_id, 10, 3600, 'เปลี่ยนรูปบ่อยเกินไป ลองใหม่ภายหลัง');
  var url = '';
  if (!d.remove) {
    var ext = checkImage_(d, APP.AVATAR_MAX_BYTES);
    var f = avatarFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(d.base64), d.mime, 'avatar_' + u.user_id + '_' + id_() + '.' + ext));
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    url = driveThumb_(f.getId(), 400);
  }
  var old = withLock_(function () {
    ensureCols_('Users');
    var cur = findOne_('Users', function (r) { return r.user_id === u.user_id; });
    update_('Users', cur._row, { avatar_url: url });
    return cur.avatar_url;
  });
  trashDrive_(old);
  u.avatar_url = url;
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
  // บัญชีรับเงินของคอร์สนี้ (ไม่ตั้ง = ใช้บัญชีกลางจากหน้าตั้งค่า) · qr_url = รูป QR ที่อัปโหลดเอง ใช้แทน QR ที่ระบบสร้าง
  out.pay = {
    promptpay_id: x.promptpay_id || getSetting_('promptpay_id'),
    promptpay_name: x.promptpay_id ? (x.promptpay_name || '') : (x.promptpay_name || getSetting_('promptpay_name')),
    qr_url: x.payment_qr_url || ''
  };
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
             attachment_url: l.attachment_url, files: parseFiles_(l.attachment_url), done: !!done[l.lesson_id] };
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
  if (!isPlaceholderEmail_(u.email)) sendDecisionEmail_(u, c, 'approved', '');
  return true;
}

function adminCourses_() {
  var lessons = read_('Lessons'), en = read_('Enrollments');
  return read_('Courses').sort(bySort_).map(function (x) {
    var card = courseCard_(x, lessons);
    card.sort_order = Number(x.sort_order) || 0;
    ['trailer_youtube','highlights','audience','instructor_name','instructor_title','instructor_bio','instructor_photo','faq',
     'promptpay_id','promptpay_name','payment_qr_url'].forEach(function (k) { card[k] = x[k] || ''; });
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
    promptpay_id: String(d.promptpay_id || '').replace(/\D/g, ''), promptpay_name: clip_(d.promptpay_name, 80), payment_qr_url: clip_(d.payment_qr_url, 500)
  };
  if (patch.promptpay_id && [10, 13, 15].indexOf(patch.promptpay_id.length) < 0) throw err_('BAD_INPUT', 'พร้อมเพย์ของคอร์สต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตร 13 หลัก');
  var tr = String(d.trailer_youtube || '').trim();
  patch.trailer_youtube = tr ? youtubeId_(tr) : '';
  if (tr && !patch.trailer_youtube) throw err_('BAD_INPUT', 'ลิงก์คลิปแนะนำคอร์สไม่ใช่ลิงก์ YouTube');
  ['cover_url', 'instructor_photo', 'payment_qr_url'].forEach(function (k) { if (patch[k] && !/^https:\/\//.test(patch[k])) throw err_('BAD_INPUT', 'ลิงก์รูปต้องขึ้นต้นด้วย https://'); });
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
  // ไฟล์ประกอบ: บรรทัดละ 1 ไฟล์ รูปแบบ "ชื่อไฟล์ | ลิงก์" หรือใส่แค่ลิงก์
  var files = parseFiles_(d.attachment_url);
  if (files.some(function (x) { return !/^https:\/\//.test(x.url); })) throw err_('BAD_INPUT', 'ลิงก์ไฟล์ประกอบต้องขึ้นต้นด้วย https://');
  var att = files.map(function (x) { return x.label ? x.label + ' | ' + x.url : x.url; }).join('\n');
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
  var ext = checkImage_(d, APP.SLIP_MAX_BYTES);
  var file = publicFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(d.base64), d.mime, 'img_' + id_() + '.' + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  log_(admin, 'upload', file.getId());
  return { url: driveThumb_(file.getId(), 1200) };
}
var FILE_TYPES = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/zip': 'zip',
  'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
};
/** ไฟล์ประกอบบทเรียน (ชีท/PDF): เก็บในโฟลเดอร์ INeedBio Lesson Files · ลิงก์ไฟล์ส่งให้เฉพาะคนที่มีสิทธิ์เรียนผ่าน learn.get */
function adminFileUpload_(d, p, admin) {
  var ext = FILE_TYPES[d.mime];
  if (!ext) throw err_('BAD_INPUT', 'รองรับไฟล์ PDF, รูป, Word, PowerPoint, Excel หรือ ZIP');
  if (!d.base64 || d.base64.length * 0.75 > APP.FILE_MAX_BYTES) throw err_('BAD_INPUT', 'ไฟล์ใหญ่เกิน 10 MB');
  var base = String(d.name || '').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'ไฟล์ประกอบ';
  var file = lessonFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(d.base64), d.mime, base + '.' + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  log_(admin, 'file.upload', file.getId() + ' ' + base);
  return { url: 'https://drive.google.com/file/d/' + file.getId() + '/view', name: base };
}
function publicFolder_() { return folder_('PUBLIC_FOLDER_ID', 'INeedBio Public Images'); }
function avatarFolder_() { return folder_('AVATAR_FOLDER_ID', 'INeedBio Avatars'); }
function lessonFolder_() { return folder_('LESSON_FOLDER_ID', 'INeedBio Lesson Files'); }
function folder_(prop, name) {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty(prop);
  if (id) return DriveApp.getFolderById(id);
  var f = DriveApp.createFolder(name);
  props.setProperty(prop, f.getId());
  return f;
}

// ───────────────────────── ทะเบียนนักเรียน ─────────────────────────
/** 1 แถว = นักเรียน × คอร์ส (คอร์สละรายการล่าสุด) · นักเรียนที่ยังไม่ลงคอร์สได้ 1 แถวที่ไม่มีคอร์ส */
function adminStudents_() {
  var users = read_('Users'), courses = read_('Courses').sort(bySort_), cById = {}, enByUser = {}, sesByUser = {};
  courses.forEach(function (c) { cById[c.course_id] = c; });
  read_('Enrollments').sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).forEach(function (e) { (enByUser[e.user_id] = enByUser[e.user_id] || []).push(e); });
  read_('Sessions').forEach(function (s) { sesByUser[s.user_id] = s; });
  var rows = [];
  users.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).forEach(function (u) {
    var s = sesByUser[u.user_id], seen = {};
    var base = publicUser_(u);
    base.note = u.admin_note || ''; base.no_email = isPlaceholderEmail_(u.email); base.last_login_at = u.last_login_at || '';
    base.device = s ? s.device_info : ''; base.device_since = s ? s.created_at : '';
    var mine = (enByUser[u.user_id] || []).filter(function (e) { if (seen[e.course_id]) return false; seen[e.course_id] = 1; return true; });
    if (!mine.length) rows.push(Object.assign({}, base, { enroll_id: '', course_id: '', course_title: '', amount: 0, pay_status: '', enrolled_at: '', has_slip: false }));
    mine.forEach(function (e) {
      var c = cById[e.course_id] || {};
      rows.push(Object.assign({}, base, { enroll_id: e.enroll_id, course_id: e.course_id, course_title: c.title || e.course_id, amount: Number(e.amount) || 0,
        pay_status: e.status, enrolled_at: e.created_at, has_slip: !!e.slip_file_id }));
    });
  });
  return { rows: rows, courses: courses.map(function (c) { return { course_id: c.course_id, title: c.title, price: Number(c.price) || 0 }; }),
    camp: { centers: APP.CAMP_CENTERS, subjects: APP.CAMP_SUBJECTS } };
}

/** เพิ่มคอร์สให้นักเรียนที่มีอยู่แล้ว (ใช้ได้ทั้งนักเรียนที่ไม่มีอีเมล) */
function adminStudentEnroll_(d, p, admin) {
  var c = findOne_('Courses', function (r) { return r.course_id === d.course_id; });
  if (!c) throw err_('NOT_FOUND', 'ไม่พบคอร์ส');
  var pay = d.pay_status || 'approved';
  if (APP.PAY_STATUSES.indexOf(pay) < 0) throw err_('BAD_INPUT', 'สถานะการชำระเงินไม่ถูกต้อง');
  var amount = d.amount === '' || d.amount == null ? Number(c.price) || 0 : Math.max(0, Number(d.amount) || 0);
  var out = withLock_(function () {
    var u = findOne_('Users', function (r) { return r.user_id === d.user_id; });
    if (!u) throw err_('NOT_FOUND', 'ไม่พบนักเรียน');
    var prev = latestEnroll_(u.user_id, c.course_id);
    if (prev && (prev.status === 'approved' || prev.status === 'pending')) throw err_('ALREADY', 'นักเรียนคนนี้มีคอร์สนี้อยู่แล้ว เปลี่ยนสถานะในตารางแทน');
    var eid = addEnroll_(u.user_id, c.course_id, pay, amount, admin);
    log_(admin, 'student.enroll', u.email + ' → ' + c.course_id + ' ' + pay);
    return { u: u, eid: eid };
  });
  if (pay === 'approved' && !isPlaceholderEmail_(out.u.email)) sendDecisionEmail_(out.u, c, 'approved', '');
  return { enroll_id: out.eid };
}

/** บันทึกหลายรายการพร้อมกัน: updates = [{ user_id, note?, enroll_id?, pay_status? }] */
function adminStudentsSave_(d, p, admin) {
  var ups = Array.isArray(d.updates) ? d.updates.slice(0, 500) : [];
  var approved = [];
  withLock_(function () {
    ensureCols_('Users');
    var users = {}, ens = {};
    read_('Users').forEach(function (u) { users[u.user_id] = u; });
    read_('Enrollments').forEach(function (e) { ens[e.enroll_id] = e; });
    ups.forEach(function (x) {
      var u = users[x.user_id];
      if (!u) throw err_('NOT_FOUND', 'ไม่พบนักเรียน');
      if ('note' in x && clip_(x.note, 500) !== (u.admin_note || '')) { update_('Users', u._row, { admin_note: clip_(x.note, 500) }); u.admin_note = clip_(x.note, 500); }
      if (!x.enroll_id || !x.pay_status) return;
      if (APP.PAY_STATUSES.indexOf(x.pay_status) < 0) throw err_('BAD_INPUT', 'สถานะการชำระเงินไม่ถูกต้อง');
      var e = ens[x.enroll_id];
      if (!e || e.user_id !== u.user_id) throw err_('NOT_FOUND', 'ไม่พบรายการลงทะเบียน');
      if (e.status === x.pay_status) return;
      var patch = { status: x.pay_status, decided_by: x.pay_status === 'pending' ? '' : admin.user_id, decided_at: x.pay_status === 'pending' ? '' : now_() };
      if (e.status === 'rejected') patch.note = '';
      update_('Enrollments', e._row, patch);
      log_(admin, 'student.pay', e.enroll_id + ' ' + e.status + '→' + x.pay_status);
      if (x.pay_status === 'approved') approved.push({ u: u, course_id: e.course_id });
      e.status = x.pay_status;
    });
  });
  approved.forEach(function (a) {
    var c = findOne_('Courses', function (r) { return r.course_id === a.course_id; });
    if (c && !isPlaceholderEmail_(a.u.email)) sendDecisionEmail_(a.u, c, 'approved', '');
  });
  return { saved: ups.length };
}

/** เพิ่มนักเรียนเอง (ไม่ต้องสมัครผ่านเว็บ) · ไม่มีอีเมลก็ได้ ถ้ามีอีเมล นักเรียนตั้งรหัสผ่านเองได้จาก "ลืมรหัสผ่าน" */
function adminStudentCreate_(d, p, admin) {
  var f = studentFields_(d);
  var email = String(d.email || '').trim() ? normEmail_(d.email) : '';
  var course = null;
  if (d.course_id) { course = findOne_('Courses', function (r) { return r.course_id === d.course_id; }); if (!course) throw err_('NOT_FOUND', 'ไม่พบคอร์ส'); }
  var pay = d.pay_status || 'approved';
  if (APP.PAY_STATUSES.indexOf(pay) < 0) throw err_('BAD_INPUT', 'สถานะการชำระเงินไม่ถูกต้อง');
  var amount = d.amount === '' || d.amount == null ? (course ? Number(course.price) || 0 : 0) : Math.max(0, Number(d.amount) || 0);
  var posn = d.posn && d.posn.subject ? d.posn : null;
  var out = withLock_(function () {
    ensureCols_('Users');
    if (email && userByEmail_(email)) throw err_('EMAIL_TAKEN', 'อีเมลนี้มีบัญชีอยู่แล้ว แก้ไขนักเรียนคนนั้นแทน หรือใช้ "เพิ่มสิทธิ์" ในหน้าคำขอเข้าเรียน');
    var u = newStudent_(f, email);
    append_('Users', u);
    var eid = course ? addEnroll_(u.user_id, course.course_id, pay, amount, admin) : '';
    if (posn) append_('Camp', campRow_({ name: u.first_name + (u.last_name !== '-' ? ' ' + u.last_name : ''), nickname: u.nickname, grade: u.grade,
      subject: posn.subject, center: posn.center, result: 'ยังไม่ทราบผล', notes: u.admin_note }, u.user_id));
    log_(admin, 'student.create', u.email + (course ? ' → ' + course.course_id + ' ' + pay : ''));
    return { u: u, eid: eid };
  });
  if (course && pay === 'approved' && email) sendDecisionEmail_(out.u, course, 'approved', '');
  return { user_id: out.u.user_id, enroll_id: out.eid };
}

function adminStudentUpdate_(d, p, admin) {
  var patch = studentFields_(d);
  if (!('note' in d)) delete patch.admin_note;
  var email = String(d.email || '').trim();
  withLock_(function () {
    ensureCols_('Users');
    var u = findOne_('Users', function (r) { return r.user_id === d.user_id; });
    if (!u) throw err_('NOT_FOUND', 'ไม่พบนักเรียน');
    if (email) {
      var ne = normEmail_(email);
      if (ne !== u.email) { if (userByEmail_(ne)) throw err_('EMAIL_TAKEN', 'อีเมลนี้มีบัญชีอื่นใช้อยู่แล้ว'); patch.email = ne; }
    }
    update_('Users', u._row, patch);
    log_(admin, 'student.edit', u.email + (patch.email ? ' → ' + patch.email : ''));
  });
  return true;
}

/** ลบนักเรียนพร้อมสิทธิ์เรียน ความคืบหน้า และ session · รูปสลิปใน Drive ยังเก็บไว้เป็นหลักฐานการเงิน */
function adminStudentDelete_(d, p, admin) {
  var gone = withLock_(function () {
    var u = findOne_('Users', function (r) { return r.user_id === d.user_id; });
    if (!u) throw err_('NOT_FOUND', 'ไม่พบนักเรียน');
    if (u.user_id === admin.user_id) throw err_('BAD_INPUT', 'ลบบัญชีของตัวเองไม่ได้');
    if (u.role === 'admin') throw err_('BAD_INPUT', 'ถอดสิทธิ์แอดมินก่อน แล้วจึงลบบัญชี');
    killSessions_(u.user_id);
    deleteRows_('Enrollments', read_('Enrollments').filter(function (e) { return e.user_id === u.user_id; }));
    deleteRows_('Progress', read_('Progress').filter(function (r) { return r.user_id === u.user_id; }));
    read_('Camp').filter(function (c) { return c.user_id === u.user_id; }).forEach(function (c) { update_('Camp', c._row, { user_id: '' }); });
    deleteRows_('Users', [u]);
    log_(admin, 'student.delete', u.email);
    return u;
  });
  trashDrive_(gone.avatar_url);
  return true;
}

/** นำเข้าไฟล์ JSON ทะเบียนนักเรียนจากระบบเดิม (รูปแบบ { ทะเบียนนักเรียน: [...] }) · อีเมลที่มีอยู่แล้วจะข้าม */
function adminStudentsImport_(d, p, admin) {
  var list = Array.isArray(d.rows) ? d.rows.slice(0, 1000) : [];
  var byTitle = {};
  read_('Courses').forEach(function (c) { byTitle[String(c.title).trim().toLowerCase()] = c; });
  var MAP = { 'ชำระแล้ว': 'approved', 'รอตรวจสอบ': 'pending', 'ยังไม่ชำระ': 'unpaid', approved: 'approved', pending: 'pending', unpaid: 'unpaid' };
  return withLock_(function () {
    ensureCols_('Users');
    var taken = {}, users = [], ens = [], skipped = 0, unmatched = {};
    read_('Users').forEach(function (u) { taken[u.email] = 1; });
    list.forEach(function (it) {
      var name = pick_(it, ['ชื่อ', 'name']);
      if (!name || name === '-') { skipped++; return; }
      var parts = name.split(/\s+/);
      var rawEmail = pick_(it, ['อีเมล', 'email']), email = '';
      try { email = rawEmail && rawEmail !== '-' ? normEmail_(rawEmail) : ''; } catch (x) { email = ''; }
      if (email && taken[email]) { skipped++; return; }
      var phone = '';
      try { phone = optPhone_(pick_(it, ['เบอร์โทร', 'phone'])); } catch (x) { phone = ''; }
      var courseTitle = pick_(it, ['คอร์ส', 'course']), c = byTitle[courseTitle.toLowerCase()];
      var note = pick_(it, ['บันทึก', 'notes', 'note']);
      if (courseTitle && !c && courseTitle !== '-' && courseTitle !== 'ยังไม่ลงคอร์ส') { unmatched[courseTitle] = 1; note = (note ? note + ' · ' : '') + 'คอร์สเดิม: ' + courseTitle; }
      var u = newStudent_({ first_name: parts[0].slice(0, 60), last_name: parts.slice(1).join(' ').slice(0, 60) || '-',
        nickname: dash_(pick_(it, ['ชื่อเล่น', 'nickname'])).slice(0, 30) || parts[0].slice(0, 30), school: dash_(pick_(it, ['โรงเรียน', 'school'])).slice(0, 120),
        grade: dash_(pick_(it, ['ชั้น', 'grade'])).slice(0, 20), phone: phone, admin_note: note.slice(0, 500) }, email);
      if (email) taken[email] = 1;
      users.push(u);
      if (c) {
        var st = MAP[pick_(it, ['สถานะชำระเงิน', 'paymentStatus', 'pay_status'])] || 'unpaid';
        var amt = pick_(it, ['ยอดโอน', 'amount']);
        ens.push({ enroll_id: 'E' + id_(), user_id: u.user_id, course_id: c.course_id, status: st, amount: String(amt === '' ? Number(c.price) || 0 : Math.max(0, Number(amt) || 0)),
          slip_file_id: '', note: 'นำเข้าจากระบบเดิม', created_at: now_(), decided_by: st === 'pending' ? '' : admin.user_id, decided_at: st === 'pending' ? '' : now_() });
      }
    });
    appendMany_('Users', users);
    appendMany_('Enrollments', ens);
    log_(admin, 'student.import', users.length + ' คน, ข้าม ' + skipped);
    return { added: users.length, enrolled: ens.length, skipped: skipped, unmatched_courses: Object.keys(unmatched) };
  });
}

function studentFields_(d) {
  var first = req_(d.first_name, 'ชื่อ', 60);
  return { first_name: first, last_name: clip_(d.last_name, 60) || '-', nickname: clip_(d.nickname, 30) || first.slice(0, 30),
    school: clip_(d.school, 120), grade: clip_(d.grade, 20), phone: optPhone_(d.phone), admin_note: clip_(d.note, 500) };
}
/** แถวผู้ใช้ใหม่ที่แอดมินสร้าง: รหัสผ่านสุ่ม (ไม่มีใครรู้) จนกว่านักเรียนจะตั้งเองผ่าน "ลืมรหัสผ่าน" */
function newStudent_(f, email) {
  var uid = 'U' + id_(), salt = rand_(16);
  return Object.assign({ user_id: uid, email: email || uid.toLowerCase() + '@noemail.invalid', password_hash: hashPw_(rand_(32), salt), salt: salt,
    role: 'student', status: 'active', created_at: now_(), last_login_at: '', current_faculty: '', current_university: '', dream_faculty: '', dream_university: '',
    terms_version: '', terms_accepted_at: '', avatar_url: '' }, f);
}
function addEnroll_(uid, cid, status, amount, admin) {
  var eid = 'E' + id_();
  append_('Enrollments', { enroll_id: eid, user_id: uid, course_id: cid, status: status, amount: String(amount), slip_file_id: '', note: 'เพิ่มโดยแอดมิน',
    created_at: now_(), decided_by: status === 'pending' ? '' : admin.user_id, decided_at: status === 'pending' ? '' : now_() });
  return eid;
}

// ───────────────────────── ติดตามผลค่าย สอวน. ─────────────────────────
function campOut_(r) {
  return { camp_id: r.camp_id, name: r.name, nickname: r.nickname, grade: r.grade, subject: r.subject, center: r.center,
    result: r.result || APP.CAMP_RESULTS[0], notes: r.notes, user_id: r.user_id, created_at: r.created_at, updated_at: r.updated_at };
}
function adminCamp_() {
  return {
    rows: read_('Camp').sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).map(campOut_),
    centers: APP.CAMP_CENTERS, subjects: APP.CAMP_SUBJECTS, results: APP.CAMP_RESULTS
  };
}
/** รับได้ทั้งคีย์ภาษาไทยจากไฟล์ JSON เดิม (ชื่อ, ชื่อเล่น, ชั้น, วิชา, ศูนย์, ผลค่าย1, บันทึก) และคีย์ภาษาอังกฤษ */
var CAMP_KEYS = { name: ['name', 'ชื่อ'], nickname: ['nickname', 'ชื่อเล่น'], grade: ['grade', 'ชั้น'], subject: ['subject', 'วิชา'],
  center: ['center', 'ศูนย์'], result: ['result', 'camp1Result', 'ผลค่าย1'], notes: ['notes', 'บันทึก'] };
var CAMP_MAX = { name: 120, nickname: 40, grade: 20, subject: 30, center: 120, result: 30, notes: 500 };
function campPatch_(d, partial) {
  var out = {};
  Object.keys(CAMP_KEYS).forEach(function (k) {
    var has = CAMP_KEYS[k].some(function (x) { return d[x] != null; });
    if (partial && !has) return;
    var v = clip_(pick_(d, CAMP_KEYS[k]), CAMP_MAX[k]);
    if (k === 'result' && APP.CAMP_RESULTS.indexOf(v) < 0) v = APP.CAMP_RESULTS[0];
    if (k === 'subject' && !v) v = APP.CAMP_SUBJECTS[0];
    if (k === 'center' && !v) v = 'ยังไม่ระบุ';
    out[k] = v;
  });
  if ('name' in out && !out.name) throw err_('BAD_INPUT', 'กรอกชื่อ - นามสกุล');
  return out;
}
function campRow_(d, userId) {
  var row = campPatch_(d, false);
  row.camp_id = 'C' + id_(); row.user_id = userId || ''; row.created_at = row.updated_at = now_();
  return row;
}
function adminCampSave_(d, p, admin) {
  return withLock_(function () {
    if (d.camp_id) {
      var r = findOne_('Camp', function (x) { return x.camp_id === d.camp_id; });
      if (!r) throw err_('NOT_FOUND', 'ไม่พบรายการนี้ (อาจถูกลบไปแล้ว)');
      var patch = campPatch_(d, true); patch.updated_at = now_();
      update_('Camp', r._row, patch);
      for (var k in patch) r[k] = patch[k];
      return campOut_(r);
    }
    var row = campRow_(d, '');
    append_('Camp', row); log_(admin, 'camp.create', row.name);
    return campOut_(row);
  });
}
function adminCampDelete_(d, p, admin) {
  withLock_(function () {
    var rows = read_('Camp').filter(function (r) { return r.camp_id === d.camp_id; });
    if (!rows.length) throw err_('NOT_FOUND', 'ไม่พบรายการนี้');
    deleteRows_('Camp', rows); log_(admin, 'camp.delete', rows[0].name);
  });
  return true;
}
/** นำเข้าไฟล์ JSON: mode 'append' ต่อท้าย หรือ 'replace' แทนที่ทั้งหมด */
function adminCampImport_(d, p, admin) {
  var list = Array.isArray(d.rows) ? d.rows.slice(0, 2000) : [];
  var rows = list.filter(function (it) { var n = pick_(it, CAMP_KEYS.name); return n && n !== '-'; }).map(function (it) { return campRow_(it, ''); });
  return withLock_(function () {
    if (d.mode === 'replace') clearTable_('Camp');
    appendMany_('Camp', rows);
    log_(admin, 'camp.import', (d.mode === 'replace' ? 'replace ' : 'append ') + rows.length);
    return { imported: rows.length, total: read_('Camp').length };
  });
}

// ───────────────────────── Design Studio (บล็อกบนหน้าแรก) ─────────────────────────
var BLOCK_COLORS = { hero: ['#0c0c0c', '#ffffff'], course: ['#f4f4f3', '#0c0c0c'], feature: ['#ffffff', '#0c0c0c'], banner: ['#0c0c0c', '#ffffff'] };
function blockOut_(b) {
  return { block_id: b.block_id, type: b.type, heading: b.heading, sub: b.sub, bg: b.bg, fg: b.fg, image_url: b.image_url, link_url: b.link_url,
    status: b.status || 'published', sort_order: Number(b.sort_order) || 0 };
}
function publicBlocks_() {
  var c = cache_().get('pub_blocks'); if (c) return JSON.parse(c);
  var list = read_('Blocks').filter(function (b) { return b.status !== 'hidden' && (b.page || 'home') === 'home'; }).sort(bySort_).map(blockOut_);
  try { cache_().put('pub_blocks', JSON.stringify(list), 300); } catch (e) {}
  return list;
}
function adminBlocks_() { return read_('Blocks').sort(bySort_).map(blockOut_); }
function adminBlockSave_(d, p, admin) {
  if (APP.BLOCK_TYPES.indexOf(d.type) < 0) throw err_('BAD_INPUT', 'เลือกชนิดบล็อก');
  var hex = function (v, def) { return /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : def; };
  var patch = {
    type: d.type, heading: req_(d.heading, 'หัวข้อ', 200), sub: clip_(d.sub, 600),
    bg: hex(d.bg, BLOCK_COLORS[d.type][0]), fg: hex(d.fg, BLOCK_COLORS[d.type][1]),
    image_url: clip_(d.image_url, 500), link_url: clip_(d.link_url, 500), status: d.status === 'hidden' ? 'hidden' : 'published'
  };
  if (patch.image_url && !/^https:\/\//.test(patch.image_url)) throw err_('BAD_INPUT', 'ลิงก์รูปต้องขึ้นต้นด้วย https://');
  if (patch.link_url && !/^(https:\/\/|#\/)/.test(patch.link_url)) throw err_('BAD_INPUT', 'ลิงก์ต้องขึ้นต้นด้วย https:// หรือ #/ (หน้าในเว็บ เช่น #/course/BIO-POSN)');
  var id = withLock_(function () {
    if (d.block_id) {
      var b = findOne_('Blocks', function (r) { return r.block_id === d.block_id; });
      if (!b) throw err_('NOT_FOUND', 'ไม่พบบล็อกนี้');
      update_('Blocks', b._row, patch); log_(admin, 'block.edit', d.block_id); return d.block_id;
    }
    var max = read_('Blocks').reduce(function (m, r) { return Math.max(m, Number(r.sort_order) || 0); }, 0);
    patch.block_id = 'B' + id_(); patch.page = 'home'; patch.sort_order = String(max + 10); patch.created_at = now_();
    append_('Blocks', patch); log_(admin, 'block.create', patch.block_id); return patch.block_id;
  });
  cache_().remove('pub_blocks');
  return { block_id: id };
}
function adminBlockDelete_(d, p, admin) {
  withLock_(function () {
    var rows = read_('Blocks').filter(function (r) { return r.block_id === d.block_id; });
    if (!rows.length) throw err_('NOT_FOUND', 'ไม่พบบล็อกนี้');
    deleteRows_('Blocks', rows); log_(admin, 'block.delete', d.block_id);
  });
  cache_().remove('pub_blocks');
  return true;
}
function adminBlocksReorder_(d, p, admin) {
  var order = (d.order || []).map(String);
  withLock_(function () {
    read_('Blocks').forEach(function (b) {
      var i = order.indexOf(b.block_id);
      if (i >= 0 && Number(b.sort_order) !== (i + 1) * 10) update_('Blocks', b._row, { sort_order: String((i + 1) * 10) });
    });
    log_(admin, 'block.reorder', order.length + ' blocks');
  });
  cache_().remove('pub_blocks');
  return true;
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
    (ok && !u.last_login_at ? '<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#525252;">ยังไม่เคยตั้งรหัสผ่าน? เปิดเว็บแล้วกด “เข้าสู่ระบบ” → “ลืมรหัสผ่าน” แล้วกรอกอีเมลนี้ ระบบจะส่งรหัสให้ตั้งรหัสผ่านของตัวเอง</p>' : '') +
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
/** แท็บที่ยังไม่มี (ติดตั้งจากเวอร์ชันเก่าแล้วยังไม่ได้รัน setup ใหม่) จะถูกสร้างให้อัตโนมัติ */
function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh && SCHEMA[name]) { ss_().insertSheet(name); ensureCols_(name); sh = ss_().getSheetByName(name); }
  return sh;
}

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
/** เขียนหลายแถวในครั้งเดียว (ใช้ตอนนำเข้าไฟล์ — เร็วกว่าเรียก append_ ทีละแถวมาก) */
function appendMany_(name, objs) {
  if (!objs.length) return;
  var sh = sheet_(name), head = headers_(name);
  var rows = objs.map(function (o) { return head.map(function (h) { return o[h] == null ? '' : String(o[h]); }); });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setNumberFormat('@').setValues(rows);
  delete _cache[name];
}
/** ล้างข้อมูลทุกแถวยกเว้นหัวตาราง */
function clearTable_(name) {
  var sh = sheet_(name), n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, Math.max(1, sh.getLastColumn())).clearContent();
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
/** เบอร์ไม่บังคับ (แอดมินกรอกแทนนักเรียน): ว่างหรือ "-" ได้ ถ้ากรอกต้องถูกรูปแบบ */
function optPhone_(p) { return String(p || '').replace(/[^\d]/g, '') ? phone_(p) : ''; }
function isPlaceholderEmail_(e) { return /@noemail\.invalid$/.test(String(e || '')); }
/** อ่านค่าจากคีย์แรกที่มี (ใช้กับไฟล์นำเข้าที่มีทั้งคีย์ไทยและอังกฤษ) */
function pick_(o, keys) { for (var i = 0; i < keys.length; i++) if (o && o[keys[i]] != null && String(o[keys[i]]).trim() !== '') return String(o[keys[i]]).trim(); return ''; }
function dash_(s) { return s === '-' ? '' : s; }
function checkImage_(d, max) {
  if (!/^image\/(jpeg|png|webp)$/.test(d.mime || '')) throw err_('BAD_INPUT', 'อัปโหลดได้เฉพาะรูป JPG, PNG หรือ WEBP');
  if (!d.base64 || d.base64.length * 0.75 > max) throw err_('BAD_INPUT', 'รูปใหญ่เกิน ' + Math.round(max / 1048576) + ' MB');
  return d.mime === 'image/png' ? 'png' : d.mime === 'image/webp' ? 'webp' : 'jpg';
}
function driveThumb_(id, w) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + w; }
function driveIdOf_(url) { var m = String(url || '').match(/^https:\/\/drive\.google\.com\/(?:thumbnail\?id=|file\/d\/)([\w-]{10,})/); return m ? m[1] : ''; }
/** ย้ายไฟล์ Drive ที่ระบบสร้างไว้ลงถังขยะ (กู้คืนได้ใน 30 วัน) · ลิงก์ที่ไม่ใช่ของ Drive จะไม่ถูกแตะ */
function trashDrive_(url) {
  var id = driveIdOf_(url); if (!id) return;
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { console.warn('trash failed: ' + id); }
}
/** ไฟล์ประกอบบทเรียน: บรรทัดละ 1 ไฟล์ "ชื่อ | ลิงก์" หรือลิงก์อย่างเดียว */
function parseFiles_(v) {
  var out = [];
  String(v || '').split(/\r?\n/).forEach(function (line) {
    line = line.trim(); if (!line) return;
    var i = line.lastIndexOf('|'), url = (i >= 0 ? line.slice(i + 1) : line).trim();
    out.push({ label: (i >= 0 ? line.slice(0, i).trim() : '').slice(0, 80), url: url.slice(0, 500) });
  });
  return out.slice(0, 10);
}
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
    is_repeat: isRepeat_(u.grade), terms_version: u.terms_version || '', avatar_url: u.avatar_url || '' };
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

/* INeedBio demo mode: loaded instead of the real API when NEXT_PUBLIC_INEEDBIO_API_URL is not set.
   Runs backend/Code.gs against an in-memory mock of the Apps Script services with sample data.
   Everything stays in this browser tab; a refresh starts over. Generated file. */
window.__DEMO_PENDING = 1;

/* Minimal in-memory mock of the Apps Script services used by Code.gs.
   Used for local tests (node) and for the browser demo. */
(function (G) {
  function sha256Bytes(str) {
    var bytes = unescape(encodeURIComponent(str)).split('').map(function (c) { return c.charCodeAt(0); });
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l = bytes.length * 8; bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (var i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    var W = new Array(64);
    for (var o = 0; o < bytes.length; o += 64) {
      for (var t = 0; t < 16; t++) W[t] = (bytes[o+t*4] << 24) | (bytes[o+t*4+1] << 16) | (bytes[o+t*4+2] << 8) | bytes[o+t*4+3];
      for (t = 16; t < 64; t++) {
        var x = W[t-15], y = W[t-2];
        var s0 = ((x>>>7)|(x<<25)) ^ ((x>>>18)|(x<<14)) ^ (x>>>3);
        var s1 = ((y>>>17)|(y<<15)) ^ ((y>>>19)|(y<<13)) ^ (y>>>10);
        W[t] = (W[t-16] + s0 + W[t-7] + s1) | 0;
      }
      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (t = 0; t < 64; t++) {
        var S1 = ((e>>>6)|(e<<26)) ^ ((e>>>11)|(e<<21)) ^ ((e>>>25)|(e<<7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + W[t]) | 0;
        var S0 = ((a>>>2)|(a<<30)) ^ ((a>>>13)|(a<<19)) ^ ((a>>>22)|(a<<10));
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
      }
      H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
    }
    var out = [];
    H.forEach(function (v) { for (var i = 3; i >= 0; i--) { var bt = (v >>> (i * 8)) & 255; out.push(bt > 127 ? bt - 256 : bt); } });
    return out;
  }

  function Range(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype.getValues = function () {
    var out = [];
    for (var i = 0; i < this.nr; i++) { var row = []; for (var j = 0; j < this.nc; j++) { var R = this.sh.rows[this.r - 1 + i]; row.push(R && R[this.c - 1 + j] != null ? R[this.c - 1 + j] : ''); } out.push(row); }
    return out;
  };
  Range.prototype.setValues = function (v) {
    for (var i = 0; i < this.nr; i++) { var R = this.sh.rows[this.r - 1 + i] || (this.sh.rows[this.r - 1 + i] = []); for (var j = 0; j < this.nc; j++) R[this.c - 1 + j] = v[i][j]; }
    for (var k = 0; k < this.sh.rows.length; k++) if (!this.sh.rows[k]) this.sh.rows[k] = [];
    return this;
  };
  ['setNumberFormat','setFontWeight','setBackground'].forEach(function (m) { Range.prototype[m] = function () { return this; }; });

  function Sheet(name) { this.name = name; this.rows = []; }
  Sheet.prototype.getName = function () { return this.name; };
  Sheet.prototype.getLastRow = function () { return this.rows.length; };
  Sheet.prototype.getLastColumn = function () { return this.rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0); };
  Sheet.prototype.getMaxRows = function () { return Math.max(1000, this.rows.length); };
  Sheet.prototype.getRange = function (r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); };
  Sheet.prototype.getDataRange = function () { return new Range(this, 1, 1, Math.max(1, this.rows.length), Math.max(1, this.getLastColumn())); };
  Sheet.prototype.deleteRow = function (n) { this.rows.splice(n - 1, 1); };
  Sheet.prototype.setFrozenRows = function () {};

  function Spreadsheet(name) { this.name = name; this.sheets = [new Sheet('Sheet1')]; }
  Spreadsheet.prototype.getId = function () { return 'mock-sheet'; };
  Spreadsheet.prototype.getUrl = function () { return 'https://docs.google.com/spreadsheets/d/mock-sheet'; };
  Spreadsheet.prototype.getSheetByName = function (n) { return this.sheets.filter(function (s) { return s.name === n; })[0] || null; };
  Spreadsheet.prototype.insertSheet = function (n) { var s = new Sheet(n); this.sheets.push(s); return s; };
  Spreadsheet.prototype.getSheets = function () { return this.sheets.slice(); };
  Spreadsheet.prototype.deleteSheet = function (s) { this.sheets = this.sheets.filter(function (x) { return x !== s; }); };

  var DB = null, props = {}, cache = {}, files = {}, fileSeq = 0;
  var clock = { now: function () { return Date.now(); } };
  var outbox = [];

  G.SpreadsheetApp = {
    create: function (n) { DB = new Spreadsheet(n); return DB; },
    openById: function () { return DB; }
  };
  G.PropertiesService = { getScriptProperties: function () { return {
    getProperty: function (k) { return k in props ? props[k] : null; },
    setProperty: function (k, v) { props[k] = String(v); } }; } };
  G.CacheService = { getScriptCache: function () { return {
    get: function (k) { var e = cache[k]; if (!e) return null; if (e.exp < clock.now()) { delete cache[k]; return null; } return e.v; },
    put: function (k, v, ttl) { cache[k] = { v: String(v), exp: clock.now() + (ttl || 600) * 1000 }; },
    remove: function (k) { delete cache[k]; } }; } };
  G.LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
  G.MailApp = {
    sendEmail: function (o) { outbox.push(o); if (G.__onMail) G.__onMail(o); },
    getRemainingDailyQuota: function () { return 100 - outbox.length; }
  };
  G.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
    computeDigest: function (a, s) { return sha256Bytes(String(s)); },
    getUuid: function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); },
    base64Decode: function (b) { return { __b64: b }; },
    base64Encode: function (bytes) { return bytes.__b64; },
    newBlob: function (bytes, mime, name) { return { bytes: bytes, mime: mime, name: name }; }
  };
  G.DriveApp = {
    createFolder: function (n) { return { getId: function () { return 'mock-folder-' + n; } }; },
    getFolderById: function () { return { createFile: function (blob) { var id = 'F' + (++fileSeq); files[id] = blob; return { getId: function () { return id; }, setSharing: function () {} }; } }; },
    Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' }, Permission: { VIEW: 'VIEW' },
    getFileById: function (id) { var b = files[id]; return { getBlob: function () { return { getContentType: function () { return b.mime; }, getBytes: function () { return b.bytes; } }; } }; }
  };
  G.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: function (s) { return { content: s, setMimeType: function () { return this; } }; } };
  G.ScriptApp = { getProjectTriggers: function () { return []; }, deleteTrigger: function () {}, newTrigger: function () { var b = { timeBased: function () { return b; }, everyDays: function () { return b; }, atHour: function () { return b; }, create: function () {} }; return b; } };
  G.__mock = { outbox: outbox, clock: clock, db: function () { return DB; }, cache: cache,
    call: function (payload) { return JSON.parse(G.doPost({ postData: { contents: JSON.stringify(payload) } }).content); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);


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


/* Demo seed: runs the real Code.gs against the in-memory mock, with sample data. */
(function () {
  setup();
  var day = 864e5, now = Date.now();
  var iso = function (msAgo) { return new Date(now - msAgo).toISOString(); };
  var mkUser = function (id, email, fn, ln, nick, school, grade, phone, role, ago) {
    var salt = rand_(16);
    append_('Users', { user_id: id, email: email, password_hash: hashPw_('demo1234', salt), salt: salt, first_name: fn, last_name: ln, nickname: nick,
      school: school, grade: grade, phone: phone, role: role, status: 'active', created_at: iso(ago), last_login_at: iso(ago) });
  };
  mkUser('UADMIN', 'admin@ineedbio.shop', 'ภวัต', 'เศรษฐเสถียร', 'พร้อม', 'INeedBio', 'อื่นๆ', '0910256171', 'admin', 90 * day);
  mkUser('UMINT', 'mint@example.com', 'ณัฐชา', 'ศรีสุข', 'มิ้นท์', 'ยุพราชวิทยาลัย', 'ม.4', '0812345678', 'student', 20 * day);
  var others = [['UKAO', 'khaohom@example.com', 'กมลชนก', 'วงศ์คำ', 'ข้าวหอม', 'ดาราวิทยาลัย', 'ม.4', '0891112222'],
    ['UTON', 'tonkla@example.com', 'ปัณณวัฒน์', 'ใจดี', 'ต้นกล้า', 'มงฟอร์ตวิทยาลัย', 'ม.5', '0823334444'],
    ['UPOOM', 'poom@example.com', 'ธนกร', 'แก้วมา', 'ภูมิ', 'มงฟอร์ตวิทยาลัย', 'ม.5', '0865556666'],
    ['UTOEY', 'baitoey@example.com', 'พิมพ์ลดา', 'อินทร์แก้ว', 'ใบเตย', 'ปรินส์รอยแยลส์วิทยาลัย', 'ม.4', '0847778888']];
  others.forEach(function (o, i) { mkUser(o[0], o[1], o[2], o[3], o[4], o[5], o[6], o[7], 'student', (i + 1) * 3 * day); });
  var dreams = { UADMIN: ['แพทยศาสตร์', 'มหาวิทยาลัยนเรศวร', 'แพทยศาสตร์', 'มหาวิทยาลัยนเรศวร'], UMINT: ['แพทยศาสตร์', 'จุฬาลงกรณ์มหาวิทยาลัย'], UKAO: ['แพทยศาสตร์', 'มหาวิทยาลัยมหิดล'],
    UTON: ['วิศวกรรมศาสตร์', 'จุฬาลงกรณ์มหาวิทยาลัย'], UPOOM: ['แพทยศาสตร์', 'มหาวิทยาลัยเชียงใหม่'], UTOEY: ['ทันตแพทยศาสตร์', 'มหาวิทยาลัยมหิดล'] };
  read_('Users').forEach(function (u) { var d = dreams[u.user_id]; if (!d) return; var pa = { dream_faculty: d[0], dream_university: d[1], terms_version: '2026-09-25', terms_accepted_at: u.created_at };
    if (d[2]) { pa.current_faculty = d[2]; pa.current_university = d[3]; } update_('Users', u._row, pa); });
  setSetting_('admin_emails', 'admin@ineedbio.shop');
  setSetting_('announcement', 'เปิดรับสมัครคอร์สชีววิทยา สอวน. รอบปี 2027 แล้ว');

  var courses = [
    ['BIO-POSN', 'bio', 'ชีววิทยา สอวน. ค่าย 1', 'ครบทุกบทตามขอบเขต สอวน. พร้อมแนวข้อสอบย้อนหลัง', 'คอร์สเตรียมสอบคัดเลือก สอวน. ค่าย 1 สาขาชีววิทยา\nสอนตั้งแต่พื้นฐานเคมีของสิ่งมีชีวิตจนถึงพันธุศาสตร์และวิวัฒนาการ พร้อมชีทสรุปทุกบท\nเหมาะกับนักเรียน ม.3–ม.5 ที่จะสอบในเดือนสิงหาคม', 790, 10],
    ['CHEM-POSN', 'chem', 'เคมี สอวน. ค่าย 1', 'ปูพื้นเคมีทั่วไปถึงอินทรีย์ สำหรับสอบคัดเลือกค่าย 1', 'ปูพื้นเคมีให้แน่นก่อนสอบคัดเลือกค่าย 1', 690, 20],
    ['PHYS-ALEVEL', 'phys', 'ฟิสิกส์ A-Level', 'สรุปเนื้อหา ม.4–6 และตะลุยโจทย์ A-Level', 'สรุปเนื้อหาฟิสิกส์ ม.ปลาย ครบทุกบท พร้อมตะลุยโจทย์ A-Level', 790, 30],
    ['MATH-M4', 'math', 'คณิต ม.4 แยกเทอม', 'เซต ตรรกศาสตร์ จำนวนจริง ฟังก์ชัน', 'เรียนตามเทอม เนื้อหาคณิตศาสตร์ ม.4', 690, 40]
  ];
  courses.forEach(function (c) { append_('Courses', { course_id: c[0], subject: c[1], title: c[2], subtitle: c[3], description: c[4], cover_url: '', price: c[5], status: 'published', sort_order: c[6], created_at: iso(60 * day) }); });
  var intro = {
    'BIO-POSN': { trailer_youtube: 'dEmoTrailr1', highlights: 'ครบทุกบทตามขอบเขต สอวน. ค่าย 1\nชีทสรุปประกอบทุกบท เปิดได้ข้างคลิป\nเฉลยข้อสอบเก่าย้อนหลังพร้อมวิธีคิด\nดูซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ',
      audience: 'นักเรียน ม.3–ม.5 ที่จะสอบคัดเลือกค่าย 1 ในเดือนสิงหาคม\nคนที่ยังไม่เคยเรียนชีววิทยาเชิงลึกมาก่อน\nคนที่อยากทบทวนชีวะ ม.ปลายให้แน่นก่อนสอบ A-Level',
      instructor_name: 'ทีมผู้สอน INeedBio', instructor_title: 'ผู้สอนชีววิทยา สอวน.', instructor_bio: 'ข้อความตัวอย่าง: แนะนำประวัติ ประสบการณ์สอน และผลงานของผู้สอนตรงนี้ แอดมินแก้ได้จากหลังบ้าน',
      faq: 'ต้องมีพื้นฐานชีวะมาก่อนไหม\nไม่จำเป็น คอร์สเริ่มจากพื้นฐานเคมีของสิ่งมีชีวิตก่อน แล้วค่อยลงลึก\n\nมีแบบฝึกหัดไหม\nมีท้ายทุกบท พร้อมเฉลยในคลิป' },
    'PHYS-ALEVEL': { cover_url: '/images/courses/phys-alevel-cover.webp', title: 'A-Level Physics', subtitle: 'คอร์สเดียว 5 เล่ม ครบฟิสิกส์ ม.ปลาย สอนโดยพี่หมอซัน', price: '990', full_price: '1090',
      highlights: 'ครบ 5 เล่ม: กลศาสตร์ การสั่น คลื่นและแสง ไฟฟ้าและแม่เหล็ก ความร้อน ฟิสิกส์ยุคใหม่\nเรียนผ่าน YouTube (คลิปเรียน) ดูได้ทั้งมือถือและคอม\nไม่ต้องมีพื้นฐานก็เรียนได้\nอ้างอิงข้อสอบ A-Level, PAT และหนังสือ สสวท.',
      audience: 'นักเรียน ม.1–ม.6 ที่อยากปูพื้นฟิสิกส์ให้แน่น\nคนที่เตรียมสอบ A-Level ฟิสิกส์',
      description: 'คอร์สฟิสิกส์ A-Level ครบทั้ง 5 เล่ม ตั้งแต่กลศาสตร์ไปจนถึงฟิสิกส์ยุคใหม่ อธิบายตั้งแต่พื้นฐาน เหมาะทั้งคนที่เพิ่งเริ่มและคนที่เตรียมสอบ',
      instructor_name: 'พี่หมอซัน', instructor_title: 'น.พ. อนันดา พงษ์สุราช', instructor_photo: '/images/courses/pmorsun.webp',
      instructor_bio: 'จบจากโรงเรียนเฉลิมขวัญสตรี พิษณุโลก\nค่าย 1 โอลิมปิกวิชาการ สาขาฟิสิกส์ ศูนย์มหาวิทยาลัยนเรศวร ปี 2559 และ 2560\nค่าย 2 โอลิมปิกวิชาการ สาขาฟิสิกส์ ศูนย์มหาวิทยาลัยนเรศวร ปี 2560\nผู้แทน สอวน. ฟิสิกส์ ศูนย์มหาวิทยาลัยนเรศวร ปี 2560\nจบจากคณะแพทยศาสตร์ มหาวิทยาลัยนเรศวร\nปัจจุบันเป็นแพทย์ใช้ทุน',
      faq: 'ต้องมีพื้นฐานฟิสิกส์ไหม\nไม่ต้อง คอร์สเริ่มจากพื้นฐานของแต่ละเล่ม' }
  };
  intro['BIO-POSN'].level = 'สอวน.'; intro['PHYS-ALEVEL'].level = 'A-Level'; intro['CHEM-POSN'] = { level: 'สอวน.' }; intro['MATH-M4'] = { level: 'ม.4' };
  Object.keys(intro).forEach(function (cid) { var r = findOne_('Courses', function (x) { return x.course_id === cid; }); update_('Courses', r._row, intro[cid]); });
  append_('Courses', { course_id: 'MATH-M5', subject: 'math', title: 'คณิต ม.5 แยกเทอม', subtitle: 'เอกซ์โพเนนเชียล ลอการิทึม ตรีโกณมิติ', description: '', cover_url: '', price: 690, status: 'draft', sort_order: 50, created_at: iso(2 * day) });

  var fake = function (i) { var s = 'dEmoVid' + ('0000' + i).slice(-4); return s.slice(0, 11); };
  var n = 0;
  var lessons = {
    'BIO-POSN': [['บทที่ 1 เคมีที่เป็นพื้นฐานของสิ่งมีชีวิต', [['1.1 น้ำและสมบัติของน้ำ', 42, 1], ['1.2 คาร์โบไฮเดรต', 51], ['1.3 ลิพิด', 47], ['1.4 โปรตีนและเอนไซม์', 58]]],
      ['บทที่ 2 เซลล์', [['2.1 กล้องจุลทรรศน์', 48], ['2.2 โครงสร้างเยื่อหุ้มเซลล์', 55], ['2.3 การลำเลียงสารผ่านเยื่อหุ้มเซลล์', 61], ['2.4 ออร์แกเนลล์', 57]]],
      ['บทที่ 3 เมแทบอลิซึม', [['3.1 พลังงานกับสิ่งมีชีวิต', 45], ['3.2 การหายใจระดับเซลล์', 66], ['3.3 การสังเคราะห์ด้วยแสง', 63]]]],
    'CHEM-POSN': [['บทที่ 1 อะตอมและตารางธาตุ', [['1.1 แบบจำลองอะตอม', 50, 1], ['1.2 การจัดเรียงอิเล็กตรอน', 46]]], ['บทที่ 2 พันธะเคมี', [['2.1 พันธะไอออนิก', 44], ['2.2 พันธะโคเวเลนต์', 58]]]],
    'PHYS-ALEVEL': [['เล่มที่ 1 The Mechanics · กลศาสตร์', [['ธรรมชาติและการวัดทางฟิสิกส์', 45, 1], ['การเคลื่อนที่', 60], ['แรงและกฎของนิวตัน', 58], ['งานและพลังงาน', 52], ['โมเมนตัมและการชน', 50], ['การเคลื่อนที่แบบหมุน', 55], ['สมดุล', 40]]],
      ['เล่มที่ 2 The Oscillation · การสั่น คลื่น และแสง', [['การเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย', 48], ['คลื่นกล', 50], ['เสียง', 46], ['แสง', 44], ['กระจกและเลนส์', 52], ['การแทรกสอดและการเลี้ยวเบน', 49]]],
      ['เล่มที่ 3 The Electromagnetics · ไฟฟ้าและแม่เหล็ก', [['ไฟฟ้าสถิต', 55], ['วงจรไฟฟ้า', 50], ['แม่เหล็ก', 42], ['การเหนี่ยวนำแม่เหล็กไฟฟ้า', 47], ['ไฟฟ้ากระแสสลับ', 45], ['คลื่นแม่เหล็กไฟฟ้า', 38]]],
      ['เล่มที่ 4 The Thermodynamics · ความร้อน', [['ความยืดหยุ่น', 36], ['ความดัน', 40], ['ของไหล', 48], ['ความร้อน', 44], ['แก๊ส', 46], ['กฎอุณหพลศาสตร์', 42]]],
      ['เล่มที่ 5 The Modern Physics · ฟิสิกส์ยุคใหม่', [['ทฤษฎีควอนตัมเบื้องต้น', 50], ['อะตอม', 44], ['นิวเคลียร์', 46], ['กัมมันตรังสี', 40], ['ฟิสิกส์อนุภาคเบื้องต้น', 38]]]],
    'MATH-M4': [['บทที่ 1 เซต', [['1.1 เซตและสับเซต', 40, 1], ['1.2 การดำเนินการบนเซต', 45]]]]
  };
  Object.keys(lessons).forEach(function (cid) {
    var so = 0;
    lessons[cid].forEach(function (ch) { ch[1].forEach(function (l) { so += 10; n++; append_('Lessons', { lesson_id: 'L' + cid.slice(0, 2) + so, course_id: cid, chapter: ch[0], title: l[0], youtube_id: fake(n), duration_min: l[1], attachment_url: 'https://drive.google.com/', is_preview: l[2] ? 'TRUE' : 'FALSE', sort_order: so }); }); });
  });

  // สลิปตัวอย่าง (วาดด้วย canvas)
  var slip = function (name, amt, bank) {
    try {
      var cv = document.createElement('canvas'); cv.width = 360; cv.height = 560; var g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, 360, 560); g.fillStyle = '#1f7a4d'; g.fillRect(0, 0, 360, 90);
      g.fillStyle = '#fff'; g.font = '600 22px sans-serif'; g.fillText(bank, 24, 55);
      g.fillStyle = '#1f7a4d'; g.font = '600 20px sans-serif'; g.fillText('โอนเงินสำเร็จ', 24, 140);
      g.fillStyle = '#666'; g.font = '15px sans-serif';
      [['จาก', name], ['ไปยัง', 'INeedBio (พร้อมเพย์)'], ['จำนวนเงิน', amt.toFixed(2) + ' บาท'], ['วันที่', new Date().toLocaleDateString('th-TH')], ['เลขที่รายการ', '2026' + Math.floor(Math.random() * 1e10)]]
        .forEach(function (r, i) { g.fillStyle = '#888'; g.fillText(r[0], 24, 200 + i * 56); g.fillStyle = '#111'; g.font = '600 17px sans-serif'; g.fillText(r[1], 24, 224 + i * 56); g.font = '15px sans-serif'; });
      g.fillStyle = '#bbb'; g.font = '12px sans-serif'; g.fillText('สลิปตัวอย่างสำหรับเดโม', 24, 530);
      return cv.toDataURL('image/jpeg', 0.85).split(',')[1];
    } catch (e) { return ''; }
  };
  var folder = DriveApp.getFolderById('x');
  var en = function (id, uid, cid, st, amt, ago, withSlip, name) {
    var fid = withSlip ? folder.createFile(Utilities.newBlob(Utilities.base64Decode(slip(name, amt, ['K PLUS', 'SCB EASY', 'Krungthai NEXT'][id.length % 3])), 'image/jpeg', id)).getId() : '';
    append_('Enrollments', { enroll_id: id, user_id: uid, course_id: cid, status: st, amount: amt, slip_file_id: fid, note: '', created_at: iso(ago), decided_by: st === 'pending' ? '' : 'UADMIN', decided_at: st === 'pending' ? '' : iso(Math.max(0, ago - 3600e3)) });
  };
  var hr = 3600e3;
  en('E0001', 'UMINT', 'BIO-POSN', 'approved', 790, 6 * day, true, 'น.ส.ณัฐชา ศรีสุข');
  en('E0002', 'UMINT', 'PHYS-ALEVEL', 'pending', 990, 5 * hr, true, 'น.ส.ณัฐชา ศรีสุข');
  en('E0003', 'UKAO', 'BIO-POSN', 'pending', 790, 3 * hr, true, 'น.ส.กมลชนก วงศ์คำ');
  en('E0004', 'UTON', 'PHYS-ALEVEL', 'pending', 990, 1.5 * hr, true, 'ด.ช.ปัณณวัฒน์ ใจดี');
  en('E0005', 'UPOOM', 'PHYS-ALEVEL', 'approved', 990, 4 * day, true, 'นายธนกร แก้วมา');
  en('E0006', 'UPOOM', 'MATH-M4', 'approved', 690, 3 * day, true, 'นายธนกร แก้วมา');
  en('E0007', 'UTOEY', 'BIO-POSN', 'approved', 790, 2 * day, true, 'น.ส.พิมพ์ลดา อินทร์แก้ว');
  en('E0008', 'UTOEY', 'CHEM-POSN', 'approved', 690, 1 * day, true, 'น.ส.พิมพ์ลดา อินทร์แก้ว');
  ['LBI10', 'LBI20', 'LBI30', 'LBI40', 'LBI50'].forEach(function (l, i) { append_('Progress', { user_id: 'UMINT', course_id: 'BIO-POSN', lesson_id: l, completed_at: iso((5 - i) * day) }); });
  __mock.outbox.length = 0;

  var creds = { student: 'mint@example.com', admin: 'admin@ineedbio.shop' };
  window.__DEMO = {
    imgs: {}, n: 0,
    img: function (u) { return (u && window.__DEMO.imgs[u]) || u; },
    call: function (p) {
      if (p.action === 'admin.upload') { var r = __mock.call(p); if (r.ok) { window.__DEMO.imgs[r.data.url] = 'data:' + p.data.mime + ';base64,' + p.data.base64; } return r; }
      return __mock.call(p);
    },
    login: function (role) { var r = __mock.call({ action: 'login', data: { email: creds[role], password: 'demo1234' }, device_id: localStorageSafe(), device_info: 'เดโม' }); return r.data; }
  };
  function localStorageSafe() { try { return localStorage.getItem('ib_device') || 'demo'; } catch (e) { return 'demo'; } }
  window.__onMail = function (m) {
    var code = /^\d{6}/.test(m.subject) ? m.subject.slice(0, 6) : '';
    var el = document.createElement('div'); el.className = 'mailcard'; el.setAttribute('role', 'status');
    el.innerHTML = '<span class="mono">อีเมลจำลอง · ถึง ' + String(m.to).replace(/[<>&]/g, '') + '</span><b>' + String(m.subject).replace(/[<>&]/g, '') + '</b>' + (code ? '<b class="code">' + code + '</b>' : '') + '<span class="muted" style="font-size:12px">ในเว็บจริง ข้อความนี้จะถูกส่งเข้าอีเมล</span>';
    el.title = 'แตะเพื่อปิด'; el.style.cursor = 'pointer'; el.onclick = function () { el.remove(); };
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, code ? 20000 : 6000);
  };
})();



/* Demo extras: hall of fame from backend/results.csv, and no real PromptPay number
   (nothing a visitor does in the demo reaches the admin, so no one should pay into it). */
(function () {
  var R = [{"result_id": "R01", "year": "2569", "subject": "bio", "nickname": "แนบฝัน", "school": "โรงเรียนเตรียมอุดมศึกษาพัฒนาการ รัชดา", "center": "ศูนย์โรงเรียนเตรียมอุดมศึกษาพัฒนาการ", "review": "จริงๆก่อนมาลงคอสของพี่ค่อนข้างมีพื้นฐานแล้วครับ แต่ยังรู้สึกสีบางจุดที่ยังเก็บเนื้อหาไม่หมดดดด พอมาเรียนกับพี่แล้วมันมีเนื้อหาหลายๆอย่างที่เคยพลาดไป ไม่ได้เรียน ซึ่งหลายฟจุดก็ออกสอบในปีนี้ครับ แล้วชอบมากเลยที่พี่ส่งไฟล์ที่จดสอนทั้งหมดมาด้วยเวลาไม่มีเวลาจะได้มาดูแค่ไฟล์ คอสตะลุยโจทย์ของพี่คือเยอะๆมากได้ฝึกแบบอันลิมิต จนตอนนี้ยังทำไม่หมดเลย55555 ชอบไฟล์ของพี่มากที่สุดเลยครับ ตั้งแต่เรียนมาเพราะมันดูเป็นระเบียบ มีเนื้อเขียนไว้แล้ว ดูใส่ใจกับการทำไฟล์จริงๆ ขอบคุณพี่ที่ทำคอสดีๆออกมานะครับราคาถูกด้วย🥹🙏🙏", "photo_url": "/images/students/R01.webp", "status": "published", "sort_order": "10"}, {"result_id": "R02", "year": "2569", "subject": "bio", "nickname": "พี", "school": "โรงเรียนเทพศิรินทร์ นนทบุรี", "center": "ศูนย์มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ", "review": "คอร์สดีมีคุณภาพขนาดนี้ไม่ลงได้ไงใครอยากเรียนชีวะแบบไม่ได้แค่ฟังเฉยๆแต่ได้เขียนตามลงเลยครับคุ้มสุดๆหรือใครนั่งเรียนเองแล้วจับประเด็นไม่ได้ก็แนะนำเลยครับดียิ่งกว่าคือโจทย์ท้ายบทกับโจทย์ MOCK TEST ทำจนไม่ต้องอ่านโจทย์ก็ตอบได้เลย รวมๆ 2/10 ครับ", "photo_url": "/images/students/R02.webp", "status": "published", "sort_order": "20"}, {"result_id": "R03", "year": "2569", "subject": "bio", "nickname": "ปันปัน", "school": "โรงเรียนสุรธรรมพิทักษ์", "center": "ศูนย์มหาวิทยาลัยเทคโนโลยีสุรนารี", "review": "พี่พร้อมสอนดีมากครับ น่ารัก สอนเนื้อหาเข้าใจดีครับ พี่ช่วยชีวิต TAXO จริงๆครับ 10/10 ไปเล้ย เอาซะผมติดค่ายเลยครับ", "photo_url": "/images/students/R03.webp", "status": "published", "sort_order": "30"}, {"result_id": "R04", "year": "2569", "subject": "bio", "nickname": "อิ่มจัง", "school": "โรงเรียนภูเก็ตวิทยาลัย", "center": "ศูนย์มหาวิทยาลัยสงขลานครินทร์", "review": "พี่พร้อมอธิบายเข้าใจง่ายดีค่ะ ชอบพาร์ทำโจทย์มาก POSNเล่ม4ที่เป็นโจทย์แยกบทอันนี้ให้เลย รู้สึกได้รู้จุดอ่อนตัวเอง ถามโจทย์แล้วพี่ตอบละเอียดมากค่ะ เข้าใจเลย สิ่งที่ชอบที่สุดคือ มีโจทย์ให้ทำเยอะดีแต่ละบท ก่อนเรียนที่พี่มีปรับพื้นฐานให้อันนั้นดีมากค่ะ", "photo_url": "/images/students/R04.webp", "status": "published", "sort_order": "40"}, {"result_id": "R05", "year": "2569", "subject": "bio", "nickname": "ไมเคิล", "school": "โรงเรียนสารสาสน์วิเทศสุวรรณภูมิ", "center": "ศูนย์มหาวิทยาลัยศิลปากร", "review": "", "photo_url": "/images/students/R05.webp", "status": "published", "sort_order": "50"}, {"result_id": "R06", "year": "2569", "subject": "bio", "nickname": "กัปตัน", "school": "โรงเรียนเบญจมราชูทิศ นครศรีธรรมราช", "center": "ศูนย์มหาวิทยาลัยวลัยลักษณ์", "review": "ส่วนตัวรู้สึกว่าคอร์สนี้ช่วยได้เยอะมาก โดยเฉพาะการปูพื้นฐานและทำให้ผมเข้าใจเนื้อหาเป็นระบบมากขึ้น จากที่ตอนแรกอ่านเองแล้วรู้สึกว่าเนื้อหาเยอะและจำไม่ค่อยได้ พอเรียนแล้วทำให้เห็นภาพและเชื่อมโยงแต่ละบทได้ดีขึ้น ที่ชอบมากที่สุดคือสอนแบบเน้นความเข้าใจ ไม่ได้ให้ท่องอย่างเดียว ทำให้เวลาเจอโจทย์ที่ไม่ตรงกับที่เคยอ่าน ก็ยังสามารถวิเคราะห์และนำความรู้ไปใช้ต่อได้", "photo_url": "/images/students/R06.webp", "status": "published", "sort_order": "60"}, {"result_id": "R07", "year": "2569", "subject": "bio", "nickname": "อีฟ", "school": "โรงเรียนอัตตัรกียะห์อิสลามียะห์", "center": "ศูนย์มหาวิทยาลัยทักษิณ", "review": "คอร์สดีมากครับราคา ไม่OVER PRICE คนสอนเข้าใจมาก กดสรุปเนื้อหาที่สำคัญๆไม่มีน้ำเลยเนื้อเน้นๆมีตะลุยโจทย์ทำให้เข้ายิ่งขึ้น ถือว่าช่วยได้เยอะมากๆเลยครับ 1000/10", "photo_url": "/images/students/R07.webp", "status": "published", "sort_order": "70"}, {"result_id": "R08", "year": "2569", "subject": "bio", "nickname": "Ferozpolymerase", "school": "โรงเรียนดารุสสาลาม", "center": "ศูนย์มหาวิทยาลัยทักษิณ", "review": "สิ่งที่ผมชอบในคอร์สชีวะของพี่เลยก็คือ การที่มีคลิปสอนเฉลยข้อสอบแบบแยกบทให้ครับ และมีทริคเล็กๆน้อยๆให้จำสำหรับใช้ในการตัดช้อยส์ได้อย่างดี มันเหมาะกับการมาเตรียมตัวในช่วงติว INTENSIVE ของผมมาก เพราะผมพึ่งมาไล่ทวนเนื้อหาตอนสัปดาห์สุดท้ายก่อนสอบ คอร์สภาคเคมีของพี่เองก็ดีเช่นกัน เพราะสอนให้เห็นตั้งแต่พื้นฐานยันไปจนถึงเนื้อหาขั้นสูงในค่ายเลย", "photo_url": "/images/students/R08.webp", "status": "published", "sort_order": "80"}, {"result_id": "R09", "year": "2569", "subject": "bio", "nickname": "มาร์ค", "school": "โรงเรียนวัชรวิทยา", "center": "ศูนย์มหาวิทยาลัยนเรศวร", "review": "ตอนแรกผมคิดว่าจะอ่านหนังสืออย่างเดียว แต่พออ่านไปเรื่อยๆ มันรู้สึกแบบว่า มันไม่รู้ต้องอ่านยังไงดี เน้นตรงไหนบ้าง จับประเด็นไม่ถูก ผมเลยลองมาเรียนกับพี่ ผมรู้สึกว่ามันช่วยได้เยอะมากๆเลย พี่สอนเข้าใจสอนสนุก เป็นกันเองฟีลพี่สอนน้องอะ แต่สิ่งที่ผมชอบมากที่สุดคือ พี่ตั้งใจสอนมากๆ มันไม่ได้แค่ความรู้ แต่มันได้อะไรหลายๆอย่างเลย ได้ทั้งแนวทางเนื้อหา ประสบการณ์ แล้วผมก็ได้คอนเนคชั่น ได้อยู่ในสังคมเด็กสอวน.ชีวะ มีแต่คนเก่งๆทั้งนั้นเลย ผมชอบสุดก็โจทย์ สอวน. แยกบท 800กว่าข้อ (ปี60-68) ที่พี่ทำให้ คือแบบ ผมเก่งได้เพราะไฟล์นี้เลย ผมนั่งทำ24/7 เรียนคณิตก็ทำ เรียนเคมีก็ทำ ทิ้งทุกอย่างเพื่อเรียนไฟล์นี้ ผมนั่งเถียงกับเอไอทั้งวันเพราะมันตอบไม่เหมือนผม ห้าห้า แต่นั่นแหละ ขอบคุณนะครับ", "photo_url": "/images/students/R09.webp", "status": "published", "sort_order": "90"}, {"result_id": "R10", "year": "2569", "subject": "bio", "nickname": "อาเดีย", "school": "มูลนิธิอาซิซสถาน", "center": "ศูนย์มหาวิทยาลัยทักษิณ", "review": "คอสรนี้สำหรับหนูนะคะ พี่ช่วยอธิบายเรื่องยากให้ง่ายขึ้นมากๆค่ะ ไฟล์เอกสารเข้าใจง่าย ชอบที่สุดคือมีโจทยท้ายบท รีเช็คว่าเราเข้าใจจริงๆไหม ทุกบทเลยโครตเริ่ดอะ และที่ชอบที่สุดดดด เล่มโจทย์สอวนที่ผ่านมาทั้งหมด แยกบท มันมีประโยชนมากๆอะ ทำให้เราเห็นว่าเราอ่อนตรงไหน ควรเน้นจุดอะไร เป็นคอสรที่ให้เกินราคามากๆเลยค่ะ", "photo_url": "/images/students/R10.webp", "status": "published", "sort_order": "100"}, {"result_id": "R11", "year": "2569", "subject": "bio", "nickname": "ลิปตัน", "school": "", "center": "", "review": "", "photo_url": "", "status": "published", "sort_order": "110"}, {"result_id": "R12", "year": "2569", "subject": "chem", "nickname": "หยก", "school": "โรงเรียนราชสีมาวิทยาลัย", "center": "ศูนย์มหาวิทยาลัยเทคโนโลยีสุรนารี", "review": "พี่หมีลี่สอนดีมากๆๆๆ เอเนอจี้สุดๆ ไม่มีอ่อม อธิบายเข้าใจมากได้ความรู้แบบสุดๆ ได้เทคนิคจากพี่เอาไปใช้ตอนสอบด้วย โจทย์ก็เริ่ด คุณภาพเกินราคามากๆค่าาา", "photo_url": "/images/students/R12.webp", "status": "published", "sort_order": "120"}, {"result_id": "R13", "year": "2569", "subject": "chem", "nickname": "ซันไบร์ท", "school": "โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย สุพรรณบุรี", "center": "ศูนย์มหาวิทยาลัยศิลปากร", "review": "ส่วนตัวหนูเริ่มเตรียมตัวประมาณ2-3อาทิตก่อนสอบก้เลยเลือกมาเรียนคอร์สตะลุยโจทย์ค่ะ พี่หมีลี่คือสรุปเนื้อหามาได้กระชับมาก เน้นจุดสำคัญมาให้แล้ว โจทย์ในชีทก็เยอะมากๆค่ะ MOCK ก็ค่อนข้างตรง คอร์สดีคุ้มค่าเกินราคามากๆเลยค่ะ", "photo_url": "/images/students/R13.webp", "status": "published", "sort_order": "130"}, {"result_id": "R14", "year": "2569", "subject": "chem", "nickname": "เค", "school": "โรงเรียนเตรียมอุดมศึกษา", "center": "ศูนย์โรงเรียนเตรียมอุดมศึกษา", "review": "", "photo_url": "/images/students/R14.webp", "status": "published", "sort_order": "140"}, {"result_id": "R15", "year": "2569", "subject": "chem", "nickname": "ภีม", "school": "โรงเรียนนาคประสิทธิ์ นครปฐม", "center": "ศูนย์มหาวิทยาลัยศิลปากร", "review": "พี่หมีลี่ สอนเข้าใจมากครับ มีเทคนิคในการสอน ทำสื่อการสอนแยกเป็นบทชัดเจน และสอนได้เข้าใจมาก ๆ เลยครับ ผมประทับใจสุด ชอบเรียนกับพี่หมีลี่มากเลยๆค้าบบบ พี่หมีลี่น่ารัก555 สอนสนุก เลิฟเว่อร์ ถึงผมไม่ได้เรียนสด แต่ผมดูคลิปย้อนหลังทุกคลิปเลยนะค้าบบบ", "photo_url": "/images/students/R15.webp", "status": "published", "sort_order": "150"}, {"result_id": "R16", "year": "2569", "subject": "chem", "nickname": "ปลายฟ้า", "school": "โรงเรียนราชสีมาวิทยาลัย", "center": "ศูนย์มหาวิทยาลัยเทคโนโลยีสุรนารี", "review": "พี่หมีลี่สอนดีมากคับบูสๆเอเนอจี้มากจิงๆตอนเรียนไม่ง่วงเลย หนูได้ทริคได้อะไรไปเย้อออมากกก คอร์สราคาน่ารักเป็นกันเองแบบมากจิงๆๆ", "photo_url": "/images/students/R16.webp", "status": "published", "sort_order": "160"}, {"result_id": "R17", "year": "2569", "subject": "chem", "nickname": "ริด", "school": "โรงเรียนดารุสสาลาม", "center": "ศูนย์มหาวิทยาลัยทักษิณ", "review": "ราคาหลักร้อย คุณภาพหลักล้าน จ่ายเงินไปแค่ไม่กี่บาท แต่เนื้อหาที่ได้คือลึกและแน่นมากกก ลึกแบบที่ใช้สอบค่ายจริงได้สบายๆ ไม่ใช่แค่ผิวเผิน สอนเคลียร์ ย่อยเรื่องยากให้เข้าใจง่าย จากเนื้อหาเคมีอินทรีย์หรือโมลที่เคยชวนปวดตับ พี่หมีลี่มีวิธีเล่าให้เห็นภาพตามได้ ไม่ต้องท่องจำแบบนกแก้วนกขุนทอง ได้เข้าใจกลไกจริงๆว่ามันมายังไง ละก็ได้ตะลุยโจทย์ฉ่ำสะใจ เรียนทฤษฎีเสร็จมีโจทย์ให้ฝึกมือฉ่ำๆๆๆ แนวข้อสอบคือใกล้เคียงกับข้อสอบจริง ช่วยให้จับจุดได้ว่าข้อสอบชอบหลอกตรงไหน คือตอนติว มันได้ฟีลเหมือนรุ่นพี่มาติวให้ฟังข้างๆ ไม่น่าเบื่อ เหมาะกับเด็กที่อยากลุย สอวน. เคมี แบบเนื้อเน้นๆ ไม่กระดูก", "photo_url": "/images/students/R17.webp", "status": "published", "sort_order": "170"}, {"result_id": "R18", "year": "2569", "subject": "math", "nickname": "คูเปอร์", "school": "โรงเรียนอำนาจเจริญ", "center": "", "review": "คอร์ส สอวน. ชีวะ: สอนดีจนต้องบอกต่อ ไม่น่าเบื่อ มีความกระชับคำพูดและเนื้อหา เหมาะกับคนเข้าใจยากมากๆและไม่ยืดจนเกินไป คุ้มค่ากับราคามากๆ\nคอร์ส คณิต ม.ปลาย: สอนดีเลยครับ โจทย์พอเหมาะให้เข้าใจกับเนื้อที่เรียน เหมาะกับการเก็บเนื้อหารวบรัด ถือว่าเหมาะกับการลงเป็นอย่างมาก", "photo_url": "/images/students/R18.webp", "status": "published", "sort_order": "180"}];
  R.forEach(function (r) { r.created_at = '2026-09-01T00:00:00.000Z'; append_('Results', r); });
  setSetting_('promptpay_id', '');
  setSetting_('promptpay_name', 'เดโม: ไม่ต้องโอนเงินจริง');
  cache_().remove('pub_courses'); cache_().remove('pub_results'); cache_().remove('settings');
})();

(function () { var s = document.createElement('script'); s.src = '/ineedbio/app.js'; document.body.appendChild(s); })();

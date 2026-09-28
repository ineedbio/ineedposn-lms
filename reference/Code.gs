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
  LESSON_FILE_MAX_BYTES: 10 * 1024 * 1024,
  PHOTO_MAX_BYTES: 1024 * 1024,
  SUBJECTS: { bio: 'ชีววิทยา', chem: 'เคมี', phys: 'ฟิสิกส์', math: 'คณิตศาสตร์' },
  TERMS_VERSION: '2026-09-25',
  REPEAT_GRADES: ['จบ ม.6 แล้ว', 'อื่นๆ'],
  LEVELS: ['สอวน.', 'A-Level', 'ม.4', 'ม.5', 'ม.6', 'ม.ต้น', 'อื่นๆ']
};

var SCHEMA = {
  Users:       ['user_id','email','password_hash','salt','first_name','last_name','nickname','school','grade','phone','role','status','created_at','last_login_at',
                'current_faculty','current_university','dream_faculty','dream_university','terms_version','terms_accepted_at',
                'birthday','facebook','instagram','line_id','photo_file_id','data_consent_at','subjects','roles','invited_at','invite_error'],
  Sessions:    ['token_hash','user_id','device_id','device_info','created_at','expires_at'],
  Courses:     ['course_id','subject','title','subtitle','description','cover_url','price','status','sort_order','created_at',
                'trailer_youtube','highlights','audience','instructor_name','instructor_title','instructor_bio','instructor_photo','faq','full_price','level','pay_account_id',
                'instructor2_name','instructor2_title','instructor2_bio','instructor2_photo','playlists','teacher_split','teacher_ids','accent','pending_change'],
  Lessons:     ['lesson_id','course_id','chapter','title','youtube_id','duration_min','attachment_url','is_preview','sort_order','hidden','source_playlist','files'],
  Enrollments: ['enroll_id','user_id','course_id','status','amount','slip_file_id','note','created_at','decided_by','decided_at','source','reason','expires_at','bill_id'],
  Progress:    ['user_id','course_id','lesson_id','completed_at'],
  AdminLog:    ['time','admin_id','action','detail'],
  Settings:    ['key','value'],
  Results:     ['result_id','year','subject','nickname','school','center','review','photo_url','status','sort_order','created_at'],
  PayAccounts: ['account_id','label','method','promptpay_id','bank','account_no','account_name','qr_url','note','ig','subjects','status','sort_order','created_at','owner_id'],
  Bundles:     ['bundle_id','title','subtitle','course_ids','price','cover_url','status','sort_order','created_at'],
  Coupons:     ['code','kind','value','max_discount','scope','targets','min_total','max_uses','per_user','starts_at','ends_at','status','note','created_at','owner_id'],
  Orders:      ['order_id','user_id','subtotal','discount','total','coupon_code','pay_terms_hash','terms_accepted_at','created_at','expires_at'],
  Bills:       ['bill_id','order_id','user_id','account_id','account','items','subtotal','discount','total','status','proof','slip_file_id','slip_hash',
                'submitted_at','note','decided_by','decided_at','created_at','expires_at'],
  Expenses:    ['expense_id','date','subject','category','amount','note','receipt_file_id','status','created_by','created_at','decided_by','decided_at'],
  Periods:     ['period','closed_at','closed_by','snapshot'],
  Payouts:     ['payout_id','period','user_id','subjects','share','held','amount','status','paid_at','paid_by','note','created_at','subject','slip_file_id','account'],
  TeacherProfiles: ['user_id','display_name','title','bio','photo_url','bank_name','account_name','account_no','updated_at'],
  LegacyStudents: ['legacy_id','first_name','last_name','nickname','norm','course_ids','batch','status','user_id','claimed_at','match','note','created_at'],
  LegacyClaims: ['claim_id','user_id','legacy_ids','reason','status','created_at','decided_by','decided_at'],
  StudyDays:   ['user_id','day','minutes','credited','updated_at'],
  Streaks:     ['user_id','streak','best','last_day','freezes','points','theme','last_redeem_at','updated_at'],
  CellLedger:  ['entry_id','user_id','delta','reason','day','ref','created_at'],
  Reviews:     ['review_id','user_id','course_id','rating','text','status','created_at','decided_by','decided_at'],
  TrialFeedback: ['fb_id','course_id','lesson','level','text','user_id','device_id','created_at'],
  GradeReports: ['report_id','user_id','year','term','grade_level','grades','gpa','exam','message','proof_file_id','consent_publish','status','created_at','decided_by','decided_at']
};

var PUBLIC_SETTINGS = ['terms_text','privacy_text','hero_eyebrow','hero_title','hero_subtitle','announcement','promptpay_id','promptpay_name','contact_ig',
  'pay_terms_text','order_expire_hours','proof_paid_at','proof_amount','proof_from_bank','proof_payer_name','proof_extra','cells_enabled','event_mode','home_billboard'];
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
  proof_extra: '',
  site_url: 'https://ineedbio.shop',
  platform_pct: '{}',
  cells_enabled: '1',
  event_mode: 'auto',
  home_billboard: '',
  subject_splits: '{}'
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
  'my.photo':          myPhoto_,
  'bill.proof':        billProof_,
  'bill.cancel':       billCancel_,
  'legacy.claim':      legacyClaim_,
  'study.ping':        studyPing_,
  'cells.status':      cellsStatus_,
  'cells.redeem':      cellsRedeem_,
  'cells.theme':       cellsTheme_,
  'review.submit':     reviewSubmit_,
  'trial.feedback':    trialFeedback_,
  'grades.submit':     gradesSubmit_,
  'my.submissions':    mySubmissions_,
  'admin.feedback':    adminOnly_(adminFeedback_),
  'admin.feedback.decide': adminOnly_(adminFeedbackDecide_),
  'admin.grades.proof': adminOnly_(adminGradesProof_),
  'admin.cells':       adminOnly_(adminCells_),
  // แอดมิน
  'admin.stats':       staffOnly_(adminStats_),
  'admin.enrollments': adminOnly_(adminEnrollments_),
  'admin.slip':        adminOnly_(adminSlip_),
  'admin.decide':      adminOnly_(adminDecide_),
  'admin.grant':       staffOnly_(adminGrant_),
  'admin.courses':     staffOnly_(adminCourses_),
  'admin.course.save': staffOnly_(adminCourseSave_),
  'admin.lessons':     staffOnly_(adminLessons_),
  'admin.lesson.save': staffOnly_(adminLessonSave_),
  'admin.lesson.delete': staffOnly_(adminLessonDelete_),
  'admin.lessons.bulk': staffOnly_(adminLessonsBulk_),
  'admin.lessons.reorder': staffOnly_(adminLessonsReorder_),
  'admin.users':       adminOnly_(adminUsers_),
  'admin.user.photo':  adminOnly_(adminUserPhoto_),
  'admin.teacher.invite': adminOnly_(adminTeacherInvite_),
  'admin.user.update': adminOnly_(adminUserUpdate_),
  'admin.user.resetDevice': adminOnly_(adminResetDevice_),
  'admin.settings':    adminOnly_(function () { return allSettings_(); }),
  'admin.settings.save': adminOnly_(adminSettingsSave_),
  'results.list':      function () { return publicResults_(); },
  'admin.results':     adminOnly_(adminResults_),
  'admin.result.save': adminOnly_(adminResultSave_),
  'admin.result.delete': adminOnly_(adminResultDelete_),
  'admin.upload':      staffOnly_(adminUpload_),
  'admin.bills':       staffOnly_(adminBills_),
  'admin.bill.slip':   staffOnly_(adminBillSlip_),
  'admin.bill.decide': adminOnly_(adminBillDecide_),
  'admin.accounts':    adminOnly_(adminAccounts_),
  'admin.account.save': adminOnly_(adminAccountSave_),
  'admin.account.delete': adminOnly_(adminAccountDelete_),
  'admin.bundles':     staffOnly_(adminBundles_),
  'admin.bundle.save': adminOnly_(adminBundleSave_),
  'admin.bundle.delete': adminOnly_(adminBundleDelete_),
  'admin.coupons':     adminOnly_(adminCoupons_),
  'admin.coupon.save': adminOnly_(adminCouponSave_),
  'admin.coupon.delete': adminOnly_(adminCouponDelete_),
  // ผู้สอน + แอดมิน (จำกัดตามวิชาที่หลังบ้าน)
  'staff.course.students': staffOnly_(courseStudents_),
  'staff.chapter.rename': staffOnly_(chapterRename_),
  'staff.lesson.file.add': staffOnly_(lessonFileAdd_),
  'staff.lesson.file.delete': staffOnly_(lessonFileDelete_),
  'learn.file':        learnFile_,
  'staff.revoke':      staffOnly_(staffRevoke_),
  'staff.playlists.save': staffOnly_(playlistsSave_),
  'staff.course.sync': staffOnly_(courseSync_),
  'fin.summary':       staffOnly_(finSummary_),
  'fin.expense.save':  staffOnly_(finExpenseSave_),
  'fin.expense.delete': staffOnly_(finExpenseDelete_),
  'fin.receipt':       staffOnly_(finReceipt_),
  'fin.expense.decide': adminOnly_(finExpenseDecide_),
  'fin.rules':         adminOnly_(finRules_),
  'fin.rules.save':    adminOnly_(finRulesSave_),
  'fin.close':         adminOnly_(finClose_),
  'fin.reopen':        adminOnly_(finReopen_),
  'fin.payout.paid':   adminOnly_(finPayoutPaid_),
  'fin.payout.pay':    adminOnly_(finPayoutPay_),
  'fin.payout.slip':   staffOnly_(finPayoutSlip_),
  'fin.payouts.mine':  staffOnly_(finPayoutsMine_),
  'fin.splits':        adminOnly_(finSplits_),
  'fin.splits.save':   adminOnly_(finSplitsSave_),
  'teacher.profile':   staffOnly_(teacherProfile_),
  'teacher.profile.save': staffOnly_(teacherProfileSave_),
  'admin.teachers':    adminOnly_(adminTeachers_),
  'admin.team.add':    adminOnly_(adminTeamAdd_),
  'admin.team.remove': adminOnly_(adminTeamRemove_),
  'admin.course.request': adminOnly_(adminCourseRequest_),
  'admin.log':         adminOnly_(adminLog_),
  'admin.legacy':      adminOnly_(adminLegacy_),
  'admin.legacy.import': adminOnly_(adminLegacyImport_),
  'admin.legacy.decide': adminOnly_(adminLegacyDecide_),
  'admin.legacy.release': adminOnly_(adminLegacyRelease_),
  'admin.legacy.delete': adminOnly_(adminLegacyDelete_)
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
  ensureCols_('Users'); update_('Users', u._row, rolePatch_(rolesOf_(u).concat(['admin'])));
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
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'syncPlaylists') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncPlaylists').timeBased().everyMinutes(15).create();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'autoCloseFinance') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('autoCloseFinance').timeBased().everyDays(1).atHour(1).create();
}

// ───────────────────────── Auth ─────────────────────────
function registerStart_(d) {
  var f = {
    email: normEmail_(d.email),
    first_name: req_(d.first_name, 'ชื่อ', 60), last_name: req_(d.last_name, 'นามสกุล', 60),
    nickname: req_(d.nickname, 'ชื่อเล่น', 30), school: req_(d.school, 'โรงเรียน', 120),
    grade: req_(d.grade, 'ระดับชั้น', 20), phone: phone_(d.phone)
  };
  goals_(d, f); contacts_(d, f);
  checkPhoto_(d.photo, true);
  if (d.accept_data !== true && d.accept_data !== 'true') throw err_('BAD_INPUT', 'กรุณาติ๊กยินยอมให้เก็บรูปถ่ายและข้อมูลเพิ่มเติมก่อนสมัคร');
  if (d.accept_terms !== true && d.accept_terms !== 'true') throw err_('BAD_INPUT', 'กรุณายอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัวก่อนสมัคร');
  f.data_consent_at = now_();
  f.terms_version = APP.TERMS_VERSION; f.terms_accepted_at = now_();
  checkPassword_(d.password);
  if (userByEmail_(f.email)) throw err_('EMAIL_TAKEN', 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบหรือกดลืมรหัสผ่าน');
  rate_('otp1:' + f.email, 1, 60, 'รอ 1 นาทีก่อนขอรหัสใหม่');
  rate_('otpH:' + f.email, 6, 3600, 'ขอรหัสบ่อยเกินไป ลองใหม่ในอีก 1 ชั่วโมง');
  var salt = rand_(16);
  f.salt = salt; f.password_hash = hashPw_(d.password, salt);
  f.photo_file_id = savePhoto_(d.photo, f.email);
  var otp = otp_();
  cache_().put('reg:' + f.email, JSON.stringify({ otp: sha256_(otp), tries: 0, f: f }), APP.OTP_MINUTES * 60);
  sendOtpEmail_(f.email, otp, f.nickname, 'register');
  return { email: f.email, expires_in: APP.OTP_MINUTES * 60 };
}

function registerVerify_(d, p) {
  var email = normEmail_(d.email);
  var key = 'reg:' + email;
  var st = checkOtp_(key, d.otp);
  var res = withLock_(function () {
    ensureCols_('Users');
    if (userByEmail_(email)) throw err_('EMAIL_TAKEN', 'อีเมลนี้สมัครไว้แล้ว');
    var f = st.f;
    var u = {
      user_id: 'U' + id_(), email: email, password_hash: f.password_hash, salt: f.salt,
      first_name: f.first_name, last_name: f.last_name, nickname: f.nickname, school: f.school,
      grade: f.grade, phone: f.phone, role: 'student', status: 'active', created_at: now_(), last_login_at: now_(),
      current_faculty: f.current_faculty, current_university: f.current_university, dream_faculty: f.dream_faculty, dream_university: f.dream_university,
      terms_version: f.terms_version, terms_accepted_at: f.terms_accepted_at,
      birthday: f.birthday, facebook: f.facebook, instagram: f.instagram, line_id: f.line_id,
      photo_file_id: f.photo_file_id || '', data_consent_at: f.data_consent_at || ''
    };
    append_('Users', u);
    cache_().remove(key);
    return { token: newSession_(u.user_id, p), user: publicUser_(u), _u: u };
  });
  var r = res; delete r._u;
  try { r.legacy = legacyMatchUser_(res2u_(r.user), false); } catch (e) { console.error(e); }
  return r;
}
function res2u_(pu) { return findOne_('Users', function (x) { return x.user_id === pu.user_id; }); }

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
  goals_(d, patch); contacts_(d, patch);
  if (!u.data_consent_at) {
    if (d.accept_data === true || d.accept_data === 'true') patch.data_consent_at = now_();
    else if (d.photo) throw err_('BAD_INPUT', 'กรุณาติ๊กยินยอมให้เก็บรูปถ่ายและข้อมูลเพิ่มเติมก่อน');
  }
  var oldPhoto = '';
  if (d.photo) { checkPhoto_(d.photo, true); rate_('photo:' + u.user_id, 10, 3600, 'เปลี่ยนรูปบ่อยเกินไป ลองใหม่ภายหลัง'); oldPhoto = u.photo_file_id; patch.photo_file_id = savePhoto_(d.photo, u.email); }
  withLock_(function () { ensureCols_('Users'); update_('Users', u._row, patch); });
  if (oldPhoto) try { DriveApp.getFileById(oldPhoto).setTrashed(true); } catch (e) {}
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
    if (!isAdmin_(u)) throw err_('FORBIDDEN', 'หน้านี้สำหรับแอดมินเท่านั้น');
    return fn(d, p, u);
  };
}

/** ผู้สอนและแอดมิน — ฟังก์ชันข้างในต้องเช็กวิชาเองด้วย courseFor_/canSubject_ */
function staffOnly_(fn) {
  return function (d, p) {
    var u = auth_(p);
    if (!isStaff_(u)) throw err_('FORBIDDEN', 'หน้านี้สำหรับแอดมินและผู้สอนเท่านั้น');
    return fn(d, p, u);
  };
}
/** ยศหลายยศพร้อมกันได้: คอลัมน์ roles = 'admin,teacher' (ว่าง = ใช้คอลัมน์ role เดิม) · ทุกคนเป็นนักเรียนได้อยู่แล้ว */
var ROLE_KEYS = ['admin', 'teacher'];
function rolesOf_(u) {
  var r = csv_(u.roles).filter(function (x) { return ROLE_KEYS.indexOf(x) >= 0; });
  if (!r.length && !u.roles && ROLE_KEYS.indexOf(u.role) >= 0) r = [u.role];
  return r;
}
/** บันทึกยศ: เขียนทั้ง roles และ role (ยศหลัก) ให้โค้ดเก่าที่อ่าน role ยังทำงานได้ */
function rolePatch_(roles) { var r = ROLE_KEYS.filter(function (k) { return roles.indexOf(k) >= 0; }); return { roles: r.join(',') || 'student', role: r.indexOf('admin') >= 0 ? 'admin' : r.length ? 'teacher' : 'student' }; }
function isAdmin_(u) { return rolesOf_(u).indexOf('admin') >= 0; }
function isTeacher_(u) { return rolesOf_(u).indexOf('teacher') >= 0; }
function isStaff_(u) { return rolesOf_(u).length > 0; }
/** วิชาที่สอนจริง (เฉพาะคนที่มียศผู้สอน) */
function teachSubjects_(u) { return isTeacher_(u) ? csv_(u.subjects).filter(function (s) { return APP.SUBJECTS[s]; }) : []; }
/** วิชาที่มีสิทธิ์จัดการ: แอดมินได้ทุกวิชา */
function subjectsOf_(u) {
  if (isAdmin_(u)) return Object.keys(APP.SUBJECTS);
  return teachSubjects_(u);
}
function canSubject_(u, s) { return subjectsOf_(u).indexOf(s) >= 0; }
function courseFor_(u, cid) {
  var c = findOne_('Courses', function (r) { return r.course_id === cid; });
  if (!c) throw err_('NOT_FOUND', 'ไม่พบคอร์ส');
  if (!canSubject_(u, c.subject)) throw err_('FORBIDDEN', 'คอร์สนี้ไม่ได้อยู่ในวิชาที่คุณดูแล');
  return c;
}
function lessonFor_(u, lid) {
  var l = findOne_('Lessons', function (r) { return r.lesson_id === lid; });
  if (!l) throw err_('NOT_FOUND', 'ไม่พบบทเรียน');
  courseFor_(u, l.course_id);
  return l;
}
/** สิทธิ์เข้าเรียนที่ยังใช้ได้ (อนุมัติแล้ว และยังไม่หมดอายุ) */
function enrollActive_(e) { return !!e && e.status === 'approved' && (!e.expires_at || new Date(e.expires_at).getTime() > Date.now()); }

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
  var lessons = visible_(read_('Lessons'));
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
    price: Number(x.price) || 0, full_price: Number(x.full_price) || 0, level: x.level || '', status: x.status, lesson_count: ls.length, total_min: mins,
    teachers: instructors_(x).map(function (t) { return { name: t.name, photo: t.photo }; }),
    accent: /^#[0-9a-f]{6}$/i.test(x.accent || '') ? x.accent : ''
  };
}

function instructors_(x) {
  var ids = csv_(x.teacher_ids);
  if (ids.length) {
    var ps = ids.map(function (id) { return profileOf_(id); }).filter(Boolean);
    if (ps.length) return ps.map(function (t) { return { name: t.display_name, title: t.title, bio: (jsonParse_(t.bio, []) || []).join('\n'), photo: t.photo_url || '' }; });
  }
  return [['instructor_name', 'instructor_title', 'instructor_bio', 'instructor_photo'], ['instructor2_name', 'instructor2_title', 'instructor2_bio', 'instructor2_photo']]
    .filter(function (k) { return x[k[0]]; }).map(function (k) { return { name: x[k[0]], title: x[k[1]] || '', bio: x[k[2]] || '', photo: x[k[3]] || '' }; });
}
function bundleDetail_(d) {
  var b = publicBundles_().filter(function (x) { return x.bundle_id === d.bundle_id; })[0];
  if (!b) throw err_('NOT_FOUND', 'ไม่พบแพ็กเกจนี้ หรือยังไม่เปิดขาย');
  var courses = read_('Courses'), lessons = visible_(read_('Lessons')), seen = {};
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
  var lessons = visible_(read_('Lessons'));
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
  out.reviews = courseReviews_(x.course_id);
  out.trial = trialStats_(x.course_id);
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
  var courses = read_('Courses'), lessons = visible_(read_('Lessons'));
  var prog = read_('Progress').filter(function (r) { return r.user_id === u.user_id; });
  var seen = {};
  return read_('Enrollments').filter(function (e) { return e.user_id === u.user_id; })
    .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })
    .filter(function (e) { if (seen[e.course_id]) return false; seen[e.course_id] = 1; return true; })
    .map(function (e) {
      var c = courses.filter(function (x) { return x.course_id === e.course_id; })[0];
      if (!c || e.status === 'revoked' || (e.status === 'approved' && !enrollActive_(e))) return null;
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
  var preview = !enrollActive_(e) && isStaff_(u) && canSubject_(u, x.subject);
  if (!enrollActive_(e) && !preview) throw err_('NO_ACCESS', e && e.status === 'approved' ? 'สิทธิ์เข้าเรียนคอร์สนี้หมดอายุแล้ว' : 'คอร์สนี้ยังไม่ได้รับสิทธิ์เข้าเรียน');
  var lessons = visible_(read_('Lessons'));
  var done = {};
  read_('Progress').forEach(function (r) { if (r.user_id === u.user_id && r.course_id === x.course_id) done[r.lesson_id] = 1; });
  var out = courseCard_(x, lessons);
  out.chapters = chapters_(lessons.filter(function (l) { return l.course_id === x.course_id; }), function (l) {
    return { lesson_id: l.lesson_id, title: l.title, duration_min: Number(l.duration_min) || 0, youtube_id: l.youtube_id,
             attachment_url: l.attachment_url, files: filesOut_(l), done: !!done[l.lesson_id] };
  });
  out.watermark = u.email + ' · ' + u.user_id;
  out.preview = preview;
  out.reviewed = read_('Reviews').some(function (r) { return r.user_id === u.user_id && r.course_id === x.course_id; });
  out.review_cells = CELLS.REVIEW;
  return out;
}

function progressSet_(d, p) {
  var u = auth_(p);
  var l = findOne_('Lessons', function (r) { return r.lesson_id === d.lesson_id; });
  if (!l) throw err_('NOT_FOUND', 'ไม่พบบทเรียน');
  var e = latestEnroll_(u.user_id, l.course_id);
  if (!enrollActive_(e)) {
    var c0 = findOne_('Courses', function (r) { return r.course_id === l.course_id; });
    if (isStaff_(u) && c0 && canSubject_(u, c0.subject)) return { lesson_id: l.lesson_id, done: false, preview: true };
    throw err_('NO_ACCESS', 'ยังไม่ได้รับสิทธิ์');
  }
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
  var last = {};
  read_('Enrollments').forEach(function (e) { if (e.user_id === uid && (!last[e.course_id] || last[e.course_id].created_at <= e.created_at)) last[e.course_id] = e; });
  Object.keys(last).forEach(function (cid) { var e = last[cid]; if (enrollActive_(e)) o[cid] = 'owned'; else if (e.status === 'pending') o[cid] = 'pending'; });
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
  if (cp.owner_id && (!u || u.user_id !== cp.owner_id)) throw err_('COUPON', u ? 'โค้ดนี้เป็นโค้ดส่วนตัวของบัญชีอื่น' : 'โค้ดนี้เป็นโค้ดส่วนตัว เข้าสู่ระบบก่อนใช้');
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
  var raw = cp.kind === 'percent' ? base * Math.min(v, 100) / 100 : cp.kind === 'each' ? 0 : v;
  if (cp.kind === 'percent' && Number(cp.max_discount) > 0) raw = Math.min(raw, Number(cp.max_discount));
  var per = {}, given = 0;
  if (cp.kind === 'each') {
    // ลดคอร์สละ v บาท (ไม่เกินราคาคอร์สนั้น)
    var tot = 0;
    elig.forEach(function (it) { per[it.course_id] = Math.min(Math.floor(v), it.base); tot += per[it.course_id]; });
    return { per: per, total: tot, label: 'ลดคอร์สละ ฿' + v.toLocaleString() };
  }
  var total = Math.min(Math.floor(raw), base);
  // แบ่งส่วนลดตามสัดส่วนราคา (เป็นบาทเต็ม) เศษไปลงคอร์สที่แพงสุด
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
  var res = withLock_(function () {
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
          note: 'บิล ' + oid + '-' + (i + 1) + ' (0 บาท)', created_at: now, decided_by: 'SYSTEM', decided_at: now, source: 'bill', bill_id: oid + '-' + (i + 1) });
      });
    });
    return { order_id: oid, total: q.total, discount: q.discount, coupon: q.coupon ? q.coupon.code : '', exp: exp };
  });
  try { sendOrderEmail_(u, res); } catch (e) { console.error(e); }
  return { order_id: res.order_id };
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
function adminBundles_(d, p, u) {
  var courses = read_('Courses');
  return read_('Bundles').sort(bySort_).map(function (b) { return bundleOut_(b, courses); })
    .filter(function (b) { return !u || isAdmin_(u) || (b.courses || []).some(function (c) { return canSubject_(u, c.subject); }); });
}
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
 * ใส่คำอธิบายคอร์สชีวะ เคมี ฟิสิกส์ (และสร้างคอร์สคณิตแยกเทอม) จากข้อมูลในโบรชัวร์
 * รันใน editor: setupCourses()
 * - ถ้ายังไม่มีคอร์สรหัสนั้น จะสร้างเป็น "ฉบับร่าง"
 * - ถ้ามีอยู่แล้ว จะเติมเฉพาะช่องที่ยังว่าง (ไม่เขียนทับที่แก้ไว้) — ถ้าต้องการเขียนทับ ใช้ setupCourses(undefined, true)
 * - ถ้าคอร์สในเว็บใช้รหัสอื่น แก้รหัสใน COURSE_COPY ด้านล่างก่อนรัน
 */
var COURSE_COPY = {
  'BIO-POSN': { subject: 'bio', level: 'สอวน.', price: '790', title: 'ชีววิทยา สอวน. ค่าย 1',
    subtitle: 'ปูพื้นฐาน + เนื้อหาครบ 3 เล่ม + ตะลุยข้อสอบย้อนหลัง 8 ปี จบในคอร์สเดียว',
    description: 'คอร์สเตรียมสอบคัดเลือกค่าย 1 สอวน. สาขาชีววิทยา ที่รวมทุกอย่างไว้ในคอร์สเดียว เรียนตามลำดับได้เลยไม่ต้องวางแผนเอง\n\n' +
      '1) ปูพื้นฐาน 6 ชั่วโมง (แถมฟรี) — สำหรับน้องที่ยังไม่เคยเรียนชีวะเชิงลึก ปูพื้นก่อนเข้าเนื้อหาจริง\n' +
      '2) เนื้อหา 3 เล่ม 70 ตอน — เล่ม 1 Fundamentum Vitae (ชีวเคมี เซลล์ พันธุศาสตร์ วิวัฒนาการ) · เล่ม 2 Organismus et Ambiens (อนุกรมวิธาน อาณาจักรสิ่งมีชีวิต นิเวศ พืช) · เล่ม 3 Systemata Corporis Humani (ระบบในร่างกายมนุษย์ครบทุกระบบ และพฤติกรรมสัตว์)\n' +
      '3) ตะลุยโจทย์ Examinophobia 26 ตอน — ไล่ข้อสอบคัดเลือกย้อนหลัง 8 ปี แยกตามเรื่อง พร้อมเฉลยและเทคนิคคิด\n\n' +
      'ทุกบทมีเฉลยการบ้านและเฉลยข้อสอบท้ายเรื่อง ดูซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ',
    highlights: 'ปูพื้นฐาน 6 ชั่วโมง แถมฟรีในคอร์ส\nเนื้อหาครบ 3 เล่ม POSN BOOK I–III รวม 70 ตอน\nตะลุยข้อสอบคัดเลือกย้อนหลัง 8 ปี (Examinophobia) 26 ตอน\nเฉลยการบ้านและเฉลยข้อสอบท้ายทุกเรื่อง\nรวมกว่า 80 ชั่วโมง ดูซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ',
    audience: 'น้อง ม.3–ม.5 ที่จะสอบคัดเลือกค่าย 1 สอวน. ชีววิทยา\nคนที่ยังไม่มีพื้นฐานชีวะเชิงลึก เริ่มจากปูพื้นฐานได้เลย\nคนที่อ่านเองมาแล้ว อยากเก็บเนื้อหาให้ครบและฝึกข้อสอบจริง\nน้องที่เตรียม A-Level ชีววิทยา ใช้ทบทวนเนื้อหาได้',
    instructor_name: 'พี่พร้อม', instructor_title: 'ภวัต เศรษฐเสถียร', photo: 'pprom.webp',
    instructor_bio: 'นักศึกษาคณะวิศวกรรมศาสตร์ สาขาหุ่นยนต์และปัญญาประดิษฐ์ มหาวิทยาลัยเชียงใหม่\nสอวน. ชีววิทยา ศูนย์มหาวิทยาลัยนเรศวร\nนักเรียนดีเด่น GPAX 4.00 (2566) และ GPAX 3.94 (2567)\nเหรียญเงินการแข่งขันหุ่นยนต์ระดับอาเซียน\nเหรียญทองการแข่งขันหุ่นยนต์บังคับมือระดับภูมิภาค\nตัวจริงคณะวิศวกรรมศาสตร์ สาขาชีวการแพทย์ สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง\nตัวจริงคณะวิทยาศาสตร์ สาขาชีววิทยา มหาวิทยาลัยนเรศวร\nติดคณะเทคนิคการแพทย์ มหาวิทยาลัยพะเยา',
    faq: 'ต้องมีพื้นฐานชีวะมาก่อนไหม\nไม่ต้อง เริ่มจากส่วนปูพื้นฐาน 6 ชั่วโมงก่อน แล้วค่อยเข้าเนื้อหาเล่ม 1\n\nควรเรียนตามลำดับไหม\nแนะนำให้เรียนตามลำดับ ปูพื้นฐาน → เล่ม 1 → เล่ม 2 → เล่ม 3 → ตะลุยโจทย์ เพราะเรื่องหลังใช้ความรู้จากเรื่องก่อน\n\nข้อสอบที่ใช้ตะลุยเป็นข้อสอบอะไร\nข้อสอบคัดเลือกค่าย 1 สอวน. ย้อนหลัง 8 ปี แยกตามเรื่อง พร้อมเฉลย\n\nเรียนทันก่อนสอบไหม\nเนื้อหากว่า 80 ชั่วโมง ถ้าเรียนวันละ 1 ชั่วโมงใช้ประมาณ 3 เดือน เร่งความเร็วคลิปได้ถึง 2 เท่า' },
  'CHEM-POSN': { subject: 'chem', level: 'สอวน.', price: '690', title: 'เคมี สอวน. ค่าย 1',
    subtitle: 'Concepts of Chemistry 3 Part ครบ กระชับ ใช้ได้จริง',
    description: 'คอร์สเตรียมสอบคัดเลือกค่าย 1 สอวน. สาขาเคมี เรียงเนื้อหาตามหนังสือ Concepts of Chemistry 3 Part\n\n' +
      'Part 1 — ปรับพื้นฐานเคมี · Safety and Laboratory Skill · Atomic Structure · Periodic Table\n' +
      'Part 2 — Basic Chemical Bond · Advanced Chemical Bond (พันธะโลหะ พันธะไอออนิก พันธะโคเวเลนต์)\n' +
      'Part 3 — Basic Stoichiometry · Solution · Advanced Stoichiometry · Gases\n\n' +
      'มีเนื้อหาที่เกินหลักสูตร สสวท. และเนื้อหาค่าย 1 หรือค่าย 2 บางเรื่อง โดยอ้างอิงจากข้อสอบโอลิมปิกปี 60–68 เพื่อให้น้องเจอโจทย์จริงแล้วไม่ตกใจ',
    highlights: 'ครบ 3 Part: พื้นฐานและอะตอม · พันธะเคมี · ปริมาณสัมพันธ์ สารละลาย แก๊ส\nมีทักษะปฏิบัติการและความปลอดภัยในแล็บ\nอ้างอิงข้อสอบโอลิมปิกปี 60–68\nมีเนื้อหาเกินหลักสูตรที่ออกสอบค่าย\nดูซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ',
    audience: 'น้อง ม.3–ม.5 ที่จะสอบคัดเลือกค่าย 1 สอวน. เคมี\nคนที่อยากปูพื้นเคมีให้แน่นก่อนเรียนในโรงเรียน\nคนที่เตรียม TBAT, CU-ATS หรือ A-Level เคมี',
    instructor_name: 'พี่หมีลี่', instructor_title: 'วรานนท์ เพียรพัฒนรัฐ', photo: 'pmeelee.webp',
    instructor_bio: 'สอวน. เคมี ค่าย 2 ศูนย์มหาวิทยาลัยนเรศวร (2567)\nสำรองผู้แทนศูนย์ สอวน. เคมี ศูนย์มหาวิทยาลัยนเรศวร ลำดับที่ 1\nTBAT Chemistry 730 · TBAT Physics 650\nCU-ATS Chemistry 690\nA-Level เคมี 87.50 · A-Level ชีววิทยา 88.0\nมีประสบการณ์ทำงานในห้องปฏิบัติการและการแข่งขันงานวิจัยระดับชาติ ใช้และวิเคราะห์ข้อมูลจากเครื่องมือขั้นสูง เช่น NMR, IR และ LC-MS',
    faq: 'เนื้อหาเกินหลักสูตรโรงเรียนไหม\nมีบางเรื่องที่เกินหลักสูตร สสวท. และเนื้อหาค่าย 1 หรือค่าย 2 อ้างอิงจากข้อสอบโอลิมปิกปี 60–68\n\nต้องมีพื้นฐานเคมีไหม\nไม่ต้อง Part 1 เริ่มจากปรับพื้นฐานเคมีก่อน\n\nใช้เตรียม TBAT หรือ A-Level ได้ไหม\nได้ เนื้อหาพื้นฐาน พันธะ และปริมาณสัมพันธ์เป็นแกนของข้อสอบเหล่านี้' },
  'PHYS-ALEVEL': { subject: 'phys', level: 'A-Level', price: '990', title: 'A-Level Physics',
    subtitle: 'คอร์สเดียว 5 เล่ม ครบฟิสิกส์ ม.ปลาย สอนโดยพี่หมอซัน',
    description: 'คอร์สฟิสิกส์ ม.ปลาย ครบทั้ง 5 เล่ม ปูตั้งแต่พื้นฐานจนพร้อมสอบ A-Level\n\n' +
      'เล่ม 1 The Mechanics — กลศาสตร์ การเคลื่อนที่ แรง งานและพลังงาน\n' +
      'เล่ม 2 The Oscillation — การสั่น คลื่น เสียง และแสง\n' +
      'เล่ม 3 The Electromagnetism — ไฟฟ้าสถิต วงจรไฟฟ้า แม่เหล็ก และการเหนี่ยวนำ\n' +
      'เล่ม 4 The Thermodynamics — ของแข็ง ของไหล ความร้อน และแก๊ส\n' +
      'เล่ม 5 The Modern Physics — ฟิสิกส์ยุคใหม่ อะตอม และนิวเคลียร์\n\n' +
      'อธิบายแนวคิดก่อนสูตร แล้วตามด้วยโจทย์ที่อ้างอิงแนวข้อสอบ A-Level, PAT และหนังสือ สสวท. ไม่มีพื้นฐานก็เริ่มเรียนได้',
    highlights: 'ครบ 5 เล่ม: กลศาสตร์ · การสั่น คลื่น แสง · ไฟฟ้าและแม่เหล็ก · ความร้อน · ฟิสิกส์ยุคใหม่\nไม่ต้องมีพื้นฐานก็เรียนได้\nอ้างอิงแนวข้อสอบ A-Level, PAT และหนังสือ สสวท.\nดูได้ทั้งมือถือและคอม ดูซ้ำได้ไม่จำกัด',
    audience: 'นักเรียน ม.4–ม.6 ที่อยากเข้าใจฟิสิกส์ตั้งแต่พื้นฐาน\nคนที่เตรียมสอบ A-Level ฟิสิกส์\nน้อง ม.ต้น ที่อยากเรียนล่วงหน้า',
    instructor_name: 'พี่หมอซัน', instructor_title: 'น.พ. อนันดา พงษ์สุราช', photo: 'pmorsun.webp', instructor_bio: '',
    faq: 'ไม่มีพื้นฐานฟิสิกส์เรียนได้ไหม\nได้ แต่ละเล่มเริ่มจากแนวคิดพื้นฐานก่อนเข้าสูตรและโจทย์\n\nควรเริ่มจากเล่มไหน\nแนะนำเริ่มจากเล่ม 1 กลศาสตร์ เพราะเป็นพื้นของทุกเล่ม' }
};
function setupCourses(baseUrl, overwrite) {
  baseUrl = baseUrl || 'https://ineedbio.shop/images/courses/';
  var done = [];
  withLock_(function () {
    ensureCols_('Courses');
    Object.keys(COURSE_COPY).forEach(function (id, i) {
      var c = COURSE_COPY[id], row = findOne_('Courses', function (r) { return r.course_id === id; });
      var data = { subject: c.subject, level: c.level, title: c.title, subtitle: c.subtitle, description: c.description, highlights: c.highlights, audience: c.audience,
        instructor_name: c.instructor_name, instructor_title: c.instructor_title, instructor_bio: c.instructor_bio, instructor_photo: c.photo ? baseUrl + c.photo : '', faq: c.faq,
        cover_url: baseUrl + id.toLowerCase() + '.webp' };
      if (id === 'PHYS-ALEVEL') data.cover_url = baseUrl + 'phys-alevel-cover.webp';
      if (!row) {
        data.course_id = id; data.price = c.price; data.status = 'draft'; data.sort_order = String((i + 1) * 10); data.created_at = now_();
        append_('Courses', data); done.push(id + ' (สร้างใหม่)'); return;
      }
      var patch = {};
      Object.keys(data).forEach(function (k) { if (!row[k] || (overwrite && k !== 'cover_url' && k !== 'instructor_photo')) patch[k] = data[k]; });
      if (Object.keys(patch).length) { update_('Courses', row._row, patch); done.push(id + ' (' + Object.keys(patch).length + ' ช่อง)'); }
    });
  });
  var math = setupMathCourses(baseUrl);
  cache_().remove('pub_courses'); cache_().remove('pub_bundles');
  console.log('อัปเดต: ' + (done.join(', ') || 'ไม่มี') + (math.length ? ' · คณิต: ' + math.join(', ') : ''));
  return done;
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
    ['MATH-M4-T1', 'ม.4', 1, 'เซต · ตรรกศาสตร์ · จำนวนจริง', ['เซต', 'ตรรกศาสตร์', 'จำนวนจริงและพหุนาม']],
    ['MATH-M4-T2', 'ม.4', 2, 'ฟังก์ชัน · เอกซ์โพเนนเชียลและลอการิทึม · ภาคตัดกรวย', ['ความสัมพันธ์และฟังก์ชัน', 'ฟังก์ชันเอกซ์โพเนนเชียลและฟังก์ชันลอการิทึม', 'เรขาคณิตวิเคราะห์และภาคตัดกรวย']],
    ['MATH-M5-T1', 'ม.5', 1, 'ฟังก์ชันตรีโกณมิติ · เมทริกซ์ · เวกเตอร์', ['ฟังก์ชันตรีโกณมิติ', 'เมทริกซ์', 'เวกเตอร์']],
    ['MATH-M5-T2', 'ม.5', 2, 'จำนวนเชิงซ้อน · หลักการนับเบื้องต้น · ความน่าจะเป็น', ['จำนวนเชิงซ้อน', 'หลักการนับเบื้องต้น', 'ความน่าจะเป็น']],
    ['MATH-M6-T1', 'ม.6', 1, 'ลำดับและอนุกรม · แคลคูลัสเบื้องต้น', ['ลำดับและอนุกรม', 'แคลคูลัสเบื้องต้น']],
    ['MATH-M6-T2', 'ม.6', 2, 'สถิติและข้อมูล · ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น', ['สถิติและข้อมูล', 'ตัวแปรสุ่มและการแจกแจงความน่าจะเป็น']]
  ];
  var made = [];
  withLock_(function () {
    ['Courses', 'Bundles'].forEach(ensureCols_);
    // หัวข้อเดิม (ม.4 เทอม 2 ยังไม่มีภาคตัดกรวย): ถ้ายังไม่เคยแก้เอง อัปเดตให้ตรงหลักสูตร สสวท.
    var OLD = { 'MATH-M4-T2': 'ความสัมพันธ์และฟังก์ชัน · เอกซ์โพเนนเชียลและลอการิทึม' };
    T.forEach(function (t, i) {
      var ex = findOne_('Courses', function (r) { return r.course_id === t[0]; });
      if (ex && OLD[t[0]] && ex.subtitle === OLD[t[0]]) {
        update_('Courses', ex._row, { subtitle: t[3], description: String(ex.description || '').replace(/เรียนเรื่อง [^\n]*/, 'เรียนเรื่อง ' + t[4].join(' ')),
          highlights: t[4].map(function (x) { return 'ครบบท ' + x; }).concat(['ซื้อคู่ 2 เทอมของชั้นเดียวกัน เหลือ 690']).join('\n') });
        made.push(t[0] + ' (อัปเดตหัวข้อ)');
      }
      if (ex) return;
      append_('Courses', { course_id: t[0], subject: 'math', title: 'คณิต ' + t[1] + ' เทอม ' + t[2], subtitle: t[3],
        description: 'คณิตศาสตร์ ' + t[1] + ' เทอม ' + t[2] + ' ตามหลักสูตรโรงเรียน เรียนเรื่อง ' + t[4].join(' ') + '\n\nแต่ละบทเริ่มจากแนวคิดและนิยาม ตามด้วยตัวอย่างทีละระดับ แล้วปิดด้วยโจทย์ฝึกแนวข้อสอบในโรงเรียน ใช้เรียนล่วงหน้า ทบทวนก่อนสอบกลางภาคและปลายภาค และปูพื้นต่อไปสอบ A-Level\n\nซื้อคู่เทอม 1 และเทอม 2 ของชั้นเดียวกันเหลือ 690 หรือครบ ม.4–ม.6 ทั้ง 6 เทอม 1,890',
        faq: 'ต้องเรียนเทอม 1 ก่อนเทอม 2 ไหม\nแนะนำให้เรียนตามลำดับ แต่ถ้าเคยเรียนเทอม 1 ในโรงเรียนแล้ว เริ่มเทอม 2 ได้เลย\n\nซื้อเทอม 1 ไปแล้ว อยากซื้อเทอม 2 ต่อ\nใส่เทอม 2 ลงตะกร้า ระบบคิดราคาแพ็กเกจทั้งปีแล้วหักยอดที่จ่ายไป จ่ายแค่ส่วนต่าง 200 บาท',
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
function adminBills_(d, p, me) {
  var st = d.status || 'reviewing', teacher = me && !isAdmin_(me);
  var users = read_('Users'), mine = me ? subjectsOf_(me) : [];
  var mineItem = function (it) { return mine.indexOf(it.subject || subjectOfCourse_(it.course_id)) >= 0; };
  return read_('Bills').filter(function (b) {
    if (teacher && !jsonParse_(b.items, []).some(mineItem)) return false;
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
    o.name = (u.first_name || '') + ' ' + (u.last_name || ''); o.nickname = u.nickname || ''; o.email = u.email || ''; o.phone = u.phone || ''; o.has_photo = !!u.photo_file_id;
    o.checks = billChecks_(b, u);
    o.can_decide = !teacher;
    if (teacher) { o.phone = ''; o.email = ''; o.has_photo = false; o.items = o.items.filter(mineItem); }
    return o;
  });
}
function subjectOfCourse_(cid) { var c = findOne_('Courses', function (r) { return r.course_id === cid; }); return c ? c.subject : ''; }
function adminBillSlip_(d, p, me) {
  var b = findOne_('Bills', function (r) { return r.bill_id === d.bill_id; });
  if (!b || !b.slip_file_id) throw err_('NOT_FOUND', 'ไม่พบสลิป');
  if (me && !isAdmin_(me) && !jsonParse_(b.items, []).some(function (it) { return canSubject_(me, it.subject || subjectOfCourse_(it.course_id)); })) throw err_('FORBIDDEN', 'บิลนี้ไม่ได้อยู่ในวิชาที่คุณดูแล');
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
      var own = ownedMap_(x.user_id);
      jsonParse_(x.items, []).forEach(function (it) {
        if (own[it.course_id] === 'owned') return;
        append_('Enrollments', { enroll_id: 'E' + id_(), user_id: x.user_id, course_id: it.course_id, status: 'approved', amount: String(it.net), slip_file_id: x.slip_file_id,
          note: 'บิล ' + x.bill_id, created_at: x.created_at, decided_by: admin.user_id, decided_at: now_(), source: 'bill', bill_id: x.bill_id });
      });
    }
    log_(admin, 'bill.' + decision, x.bill_id);
    return x;
  });
  var u = findOne_('Users', function (r) { return r.user_id === b.user_id; });
  if (u) sendBillEmail_(u, b, decision, note);
  return { bill_id: b.bill_id, status: decision };
}
// ═════════════════════════ เซลล์แบ่งตัว (เรียนต่อเนื่อง) ═════════════════════════
// นับเฉพาะเวลาที่คลิปเล่นจริง: ตัวเล่นคลิปส่ง study.ping ทุก 1 นาทีที่กำลังเล่น หลังบ้านรับได้ไม่เกิน 1 ครั้งต่อ 50 วินาที
// วันไหนครบ 15 นาที = เรียน 1 วัน (+1 เซลล์) · ยอดเซลล์จริงคือผลรวมใน CellLedger · ตัดวันตามเวลาไทย
var CELLS = { MIN_PER_DAY: 15, PING_GAP_MS: 50000, MIN_ADVANCE: 30, REVIEW: 5, GRADES: 5, GRADES_PROOF: 5, COST: 100, VALUE: 100, CODE_DAYS: 60, REDEEM_GAP_DAYS: 30, FREEZE_EVERY: 7, FREEZE_MAX: 2,
  BONUS: { 7: 5, 15: 10, 30: 30, 60: 50, 100: 100, 200: 150, 365: 365 },
  THEMES: [['base', 0], ['petri', 15], ['scope', 30], ['reef', 60], ['forest', 100], ['nebula', 200], ['gold', 365]] };
var DAY_SHIFT_MS = 0; // ใช้เฉพาะเดโมเพื่อจำลองวันถัดไป ของจริงเป็น 0 เสมอ
function thDay_(ms) { return new Date((ms == null ? Date.now() + DAY_SHIFT_MS : ms) + 7 * 36e5).toISOString().slice(0, 10); }
function dayDiff_(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
function cellsOn_() { return String(getSetting_('cells_enabled')) === '1'; }
function streakRow_(uid, create) {
  var r = findOne_('Streaks', function (x) { return x.user_id === uid; });
  if (!r && create) { append_('Streaks', { user_id: uid, streak: 0, best: 0, last_day: '', freezes: 0, points: 0, theme: 'base', last_redeem_at: '', updated_at: now_() }); r = findOne_('Streaks', function (x) { return x.user_id === uid; }); }
  return r;
}
function ledgerSum_(uid) { return read_('CellLedger').filter(function (x) { return x.user_id === uid; }).reduce(function (a, x) { return a + (Number(x.delta) || 0); }, 0); }
function ledgerAdd_(uid, delta, reason, day, ref) { append_('CellLedger', { entry_id: 'CL' + id_(), user_id: uid, delta: delta, reason: reason, day: day || '', ref: ref || '', created_at: now_() }); }
function themesFor_(best) { return CELLS.THEMES.filter(function (t) { return best >= t[1]; }).map(function (t) { return t[0]; }); }
/** เรียนครบวันนี้ → นับต่อสตรีค (ใช้บัตรพักตัวถ้าขาดไม่เกินจำนวนบัตร) + ลงสมุดเซลล์ · เรียกภายใน withLock_ เท่านั้น */
function creditDay_(uid, day) {
  var st = streakRow_(uid, true), last = st.last_day, streak = Number(st.streak) || 0, best = Number(st.best) || 0, fr = Number(st.freezes) || 0;
  if (last === day) return null;
  var gap = last ? dayDiff_(last, day) : 0, used = 0, gained = [];
  if (last && gap <= 0) return null;
  if (gap === 1) streak++;
  else if (gap > 1 && gap - 1 <= fr) { used = gap - 1; fr -= used; streak++; }
  else streak = 1;
  var oldBest = best; best = Math.max(best, streak);
  ledgerAdd_(uid, 1, 'study', day); gained.push({ reason: 'study', delta: 1 });
  var b = CELLS.BONUS[streak]; if (b) { ledgerAdd_(uid, b, 'bonus-' + streak, day); gained.push({ reason: 'bonus-' + streak, delta: b }); }
  if (streak % CELLS.FREEZE_EVERY === 0 && fr < CELLS.FREEZE_MAX) fr++;
  var unlocked = CELLS.THEMES.filter(function (t) { return t[1] > 0 && oldBest < t[1] && best >= t[1]; }).map(function (t) { return t[0]; });
  update_('Streaks', st._row, { streak: streak, best: best, last_day: day, freezes: fr, points: ledgerSum_(uid), updated_at: now_() });
  return { streak: streak, used_freezes: used, gained: gained, unlocked: unlocked };
}
function studyPing_(d, p) {
  var u = auth_(p);
  if (!cellsOn_()) return { off: true };
  var l = findOne_('Lessons', function (r) { return r.lesson_id === d.lesson_id; });
  if (!l) throw err_('NOT_FOUND', 'ไม่พบบทเรียน');
  if (!enrollActive_(latestEnroll_(u.user_id, l.course_id))) throw err_('NO_ACCESS', 'ยังไม่ได้รับสิทธิ์');
  var ck = 'cp:' + u.user_id, t = Date.now(), last = Number(cache_().get(ck)) || 0;
  if (t - last < CELLS.PING_GAP_MS) return { ignored: true };
  // คลิปต้องเดินหน้าจริง: ตำแหน่งในคลิปต้องขยับไปข้างหน้าอย่างน้อย 30 วินาทีจากครั้งก่อน (หยุด วนซ้ำ หรือเปิดทิ้งที่เดิมไม่นับ)
  var pk = 'cpp:' + u.user_id, pos = Math.max(0, Number(d.pos) || 0), lp = jsonParse_(cache_().get(pk), null);
  cache_().put(pk, JSON.stringify({ lid: l.lesson_id, pos: pos }), 1800);
  if (lp && lp.lid === l.lesson_id && pos - lp.pos < CELLS.MIN_ADVANCE) return { ignored: true, reason: 'not_advancing' };
  cache_().put(ck, String(t), 600);
  var day = thDay_(), res = null, mins = 0;
  withLock_(function () {
    var r = findOne_('StudyDays', function (x) { return x.user_id === u.user_id && x.day === day; });
    if (!r) { append_('StudyDays', { user_id: u.user_id, day: day, minutes: 1, credited: '', updated_at: now_() }); mins = 1; }
    else { mins = (Number(r.minutes) || 0) + 1; update_('StudyDays', r._row, { minutes: mins, updated_at: now_() }); }
    if (mins >= CELLS.MIN_PER_DAY) {
      var r2 = findOne_('StudyDays', function (x) { return x.user_id === u.user_id && x.day === day; });
      if (!r2.credited) { update_('StudyDays', r2._row, { credited: '1' }); res = creditDay_(u.user_id, day); }
    }
  });
  return { today_min: mins, need: CELLS.MIN_PER_DAY, credited: res };
}
function cellsStatus_(d, p) {
  var u = auth_(p), day = thDay_(), st = streakRow_(u.user_id, false) || { streak: 0, best: 0, last_day: '', freezes: 0, theme: 'base', last_redeem_at: '' };
  var streak = Number(st.streak) || 0, fr = Number(st.freezes) || 0, best = Number(st.best) || 0;
  var gap = st.last_day ? dayDiff_(st.last_day, day) : 0;
  var alive = !!st.last_day && (gap <= 1 || gap - 1 <= fr);
  if (!alive) streak = 0;
  var days = read_('StudyDays').filter(function (x) { return x.user_id === u.user_id && dayDiff_(x.day, day) < 35 && dayDiff_(x.day, day) >= 0; })
    .map(function (x) { return { day: x.day, minutes: Number(x.minutes) || 0, credited: !!x.credited }; });
  var today = days.filter(function (x) { return x.day === day; })[0];
  var led = read_('CellLedger').filter(function (x) { return x.user_id === u.user_id; });
  var points = led.reduce(function (a, x) { return a + (Number(x.delta) || 0); }, 0);
  var nextAt = st.last_redeem_at ? new Date(new Date(st.last_redeem_at).getTime() + CELLS.REDEEM_GAP_DAYS * 864e5).toISOString() : '';
  var codes = read_('Coupons').filter(function (c) { return c.owner_id === u.user_id && /^CELL/.test(c.code); }).map(function (c) {
    return { code: c.code, value: Number(c.value) || 0, ends_at: c.ends_at, used: couponUses_(c.code) > 0 }; });
  return { enabled: cellsOn_(), today: day, today_min: today ? today.minutes : 0, today_done: !!(today && today.credited), need: CELLS.MIN_PER_DAY,
    streak: streak, best: best, freezes: fr, points: points, theme: themesFor_(best).indexOf(st.theme) >= 0 ? st.theme : 'base', themes: themesFor_(best),
    all_themes: CELLS.THEMES, bonus: CELLS.BONUS, cost: CELLS.COST, value: CELLS.VALUE, can_redeem: points >= CELLS.COST && (!nextAt || new Date(nextAt).getTime() <= Date.now()),
    next_redeem_at: nextAt && new Date(nextAt).getTime() > Date.now() ? nextAt : '', days: days, codes: codes,
    ledger: led.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 30).map(function (x) { return { delta: Number(x.delta) || 0, reason: x.reason, day: x.day, ref: x.ref, created_at: x.created_at }; }) };
}
function cellsRedeem_(d, p) {
  var u = auth_(p);
  if (!cellsOn_()) throw err_('OFF', 'ระบบเซลล์ปิดอยู่');
  var code = withLock_(function () {
    var st = streakRow_(u.user_id, true), pts = ledgerSum_(u.user_id);
    if (pts < CELLS.COST) throw err_('BAD_INPUT', 'เซลล์ยังไม่ครบ ' + CELLS.COST + ' (มี ' + pts + ')');
    if (st.last_redeem_at && new Date(st.last_redeem_at).getTime() + CELLS.REDEEM_GAP_DAYS * 864e5 > Date.now()) throw err_('BAD_INPUT', 'แลกได้เดือนละ 1 ครั้ง แลกครั้งถัดไปได้วันที่ ' + thDateTxt_(new Date(new Date(st.last_redeem_at).getTime() + CELLS.REDEEM_GAP_DAYS * 864e5).toISOString()));
    var c; do { c = 'CELL' + rand_(6).toUpperCase(); } while (findOne_('Coupons', function (x) { return x.code === c; }));
    append_('Coupons', { code: c, kind: 'fixed', value: String(CELLS.VALUE), max_discount: '', scope: 'all', targets: '', min_total: '', max_uses: '1', per_user: '1',
      starts_at: '', ends_at: new Date(Date.now() + CELLS.CODE_DAYS * 864e5).toISOString(), status: 'active', note: 'แลกเซลล์ · ' + u.nickname + ' ' + u.email, created_at: now_(), owner_id: u.user_id });
    ledgerAdd_(u.user_id, -CELLS.COST, 'redeem', thDay_(), c);
    update_('Streaks', st._row, { points: ledgerSum_(u.user_id), last_redeem_at: now_(), updated_at: now_() });
    return c;
  });
  cache_().remove('pub_coupons');
  return { code: code, value: CELLS.VALUE };
}
function cellsTheme_(d, p) {
  var u = auth_(p), key = String(d.theme || 'base');
  withLock_(function () {
    var st = streakRow_(u.user_id, true);
    if (themesFor_(Number(st.best) || 0).indexOf(key) < 0) throw err_('BAD_INPUT', 'ยังไม่ได้ปลดล็อกธีมนี้');
    update_('Streaks', st._row, { theme: key, updated_at: now_() });
  });
  return { theme: key };
}
function adminCells_(d) {
  var users = read_('Users'), led = read_('CellLedger'), day = thDay_();
  var name = function (id) { var u = users.filter(function (x) { return x.user_id === id; })[0]; return u ? { name: u.first_name + ' ' + u.last_name, nickname: u.nickname, email: u.email } : { name: id }; };
  if (d.user_id) return { user: name(d.user_id), ledger: led.filter(function (x) { return x.user_id === d.user_id; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 200)
    .map(function (x) { return { delta: Number(x.delta) || 0, reason: x.reason, day: x.day, ref: x.ref, created_at: x.created_at }; }),
    days: read_('StudyDays').filter(function (x) { return x.user_id === d.user_id; }).sort(function (a, b) { return a.day < b.day ? 1 : -1; }).slice(0, 60).map(function (x) { return { day: x.day, minutes: Number(x.minutes) || 0, credited: !!x.credited }; }) };
  var rows = read_('Streaks').map(function (s) {
    var gap = s.last_day ? dayDiff_(s.last_day, day) : 99, alive = gap <= 1 || gap - 1 <= (Number(s.freezes) || 0);
    return Object.assign(name(s.user_id), { user_id: s.user_id, streak: alive ? Number(s.streak) || 0 : 0, best: Number(s.best) || 0, points: ledgerSum_(s.user_id), last_day: s.last_day, freezes: Number(s.freezes) || 0 });
  }).sort(function (a, b) { return b.streak - a.streak || b.best - a.best; });
  return { today: day, active_today: read_('StudyDays').filter(function (x) { return x.day === day && x.credited; }).length, rows: rows.slice(0, 300),
    redeemed: led.filter(function (x) { return x.reason === 'redeem'; }).length };
}
// ───── รีวิวคอร์ส + ส่งผลการเรียน (แอดมินอ่านก่อน อนุมัติแล้วค่อยได้เซลล์) ─────
function reviewSubmit_(d, p) {
  var u = auth_(p), cid = String(d.course_id || ''), rating = Math.round(Number(d.rating) || 0), text = clip_(String(d.text || '').trim(), 1000);
  if (!enrollActive_(latestEnroll_(u.user_id, cid))) throw err_('NO_ACCESS', 'รีวิวได้เฉพาะคอร์สที่เรียนอยู่');
  if (rating < 1 || rating > 5) throw err_('BAD_INPUT', 'ให้ดาว 1–5 ดวง');
  if (text.length < 20) throw err_('BAD_INPUT', 'เขียนรีวิวอย่างน้อย 20 ตัวอักษร');
  withLock_(function () {
    var r = findOne_('Reviews', function (x) { return x.user_id === u.user_id && x.course_id === cid; });
    if (r && r.status !== 'pending') throw err_('ALREADY', 'รีวิวคอร์สนี้ไปแล้ว ขอบคุณมาก');
    if (r) update_('Reviews', r._row, { rating: rating, text: text, created_at: now_() });
    else append_('Reviews', { review_id: 'RV' + id_(), user_id: u.user_id, course_id: cid, rating: rating, text: text, status: 'pending', created_at: now_() });
  });
  return { cells: CELLS.REVIEW };
}
function gradesSubmit_(d, p) {
  var u = auth_(p), year = String(d.year || '').replace(/\D/g, ''), term = String(d.term || '');
  if (!/^25\d\d$/.test(year)) throw err_('BAD_INPUT', 'ใส่ปีการศึกษา เช่น 2569');
  if (['1', '2', 'summer'].indexOf(term) < 0) throw err_('BAD_INPUT', 'เลือกภาคเรียน');
  var grades = (Array.isArray(d.grades) ? d.grades : []).slice(0, 12).map(function (g) { return { subject: clip_(g.subject, 40), grade: clip_(g.grade, 5) }; })
    .filter(function (g) { return g.subject && /^(4|3\.5|3|2\.5|2|1\.5|1|0)$/.test(g.grade); });
  if (!grades.length) throw err_('BAD_INPUT', 'ใส่เกรดอย่างน้อย 1 วิชา');
  var gpa = d.gpa === '' || d.gpa == null ? '' : Number(d.gpa);
  if (gpa !== '' && !(gpa >= 0 && gpa <= 4)) throw err_('BAD_INPUT', 'GPA ต้องอยู่ระหว่าง 0.00–4.00');
  var hasProof = checkPhoto_(d.proof, false);
  var fid = hasProof ? savePhoto_(d.proof, 'grades_' + u.email) : '';
  withLock_(function () {
    var r = findOne_('GradeReports', function (x) { return x.user_id === u.user_id && x.year === year && x.term === term; });
    if (r && r.status !== 'pending') throw err_('ALREADY', 'ส่งผลการเรียนเทอมนี้ไปแล้ว ขอบคุณมาก');
    var row = { year: year, term: term, grade_level: u.grade || '', grades: JSON.stringify(grades), gpa: gpa === '' ? '' : gpa.toFixed(2), exam: clip_(d.exam, 200), message: clip_(d.message, 1000),
      consent_publish: d.consent_publish ? '1' : '', created_at: now_() };
    if (fid) row.proof_file_id = fid;
    if (r) update_('GradeReports', r._row, row);
    else { row.report_id = 'GR' + id_(); row.user_id = u.user_id; row.status = 'pending'; append_('GradeReports', row); }
  });
  return { cells: CELLS.GRADES + (hasProof ? CELLS.GRADES_PROOF : 0) };
}
/** ให้นักเรียนรู้แค่ว่าส่งแล้ว (ไม่บอกสถานะการตรวจ) */
function mySubmissions_(d, p) {
  var u = auth_(p);
  return { reviews: read_('Reviews').filter(function (x) { return x.user_id === u.user_id; }).map(function (x) { return x.course_id; }),
    grades: read_('GradeReports').filter(function (x) { return x.user_id === u.user_id; }).map(function (x) { return x.year + '/' + x.term; }),
    cells: { review: CELLS.REVIEW, grades: CELLS.GRADES, proof: CELLS.GRADES_PROOF } };
}
function adminFeedback_(d) {
  var st = d.status === 'done' ? 'done' : 'pending', users = read_('Users'), courses = read_('Courses');
  var who = function (id) { var u = users.filter(function (x) { return x.user_id === id; })[0]; return u ? { user_id: u.user_id, name: u.first_name + ' ' + u.last_name, nickname: u.nickname, school: u.school, grade: u.grade, email: u.email } : { name: id }; };
  var pick = function (x) { return st === 'pending' ? x.status === 'pending' : x.status !== 'pending'; };
  var sort = function (a, b) { return a.created_at < b.created_at ? (st === 'pending' ? -1 : 1) : (st === 'pending' ? 1 : -1); };
  return {
    reviews: read_('Reviews').filter(pick).sort(sort).slice(0, 200).map(function (x) { var c = courses.filter(function (y) { return y.course_id === x.course_id; })[0];
      return { id: x.review_id, user: who(x.user_id), course: c ? c.title : x.course_id, rating: Number(x.rating) || 0, text: x.text, status: x.status, created_at: x.created_at }; }),
    grades: read_('GradeReports').filter(pick).sort(sort).slice(0, 200).map(function (x) {
      return { id: x.report_id, user: who(x.user_id), year: x.year, term: x.term, grade_level: x.grade_level, grades: jsonParse_(x.grades, []), gpa: x.gpa, exam: x.exam, message: x.message,
        has_proof: !!x.proof_file_id, consent_publish: !!x.consent_publish, status: x.status, created_at: x.created_at }; }),
    counts: { reviews: read_('Reviews').filter(function (x) { return x.status === 'pending'; }).length, grades: read_('GradeReports').filter(function (x) { return x.status === 'pending'; }).length },
    trial: trialAdmin_()
  };
}
function adminFeedbackDecide_(d, p, admin) {
  var kind = d.kind === 'grades' ? 'GradeReports' : 'Reviews', idk = kind === 'Reviews' ? 'review_id' : 'report_id';
  var ok = d.decision === 'approve';
  withLock_(function () {
    var r = findOne_(kind, function (x) { return x[idk] === d.id; });
    if (!r) throw err_('NOT_FOUND', 'ไม่พบรายการ');
    if (r.status !== 'pending' && !(ok && r.status === 'hidden')) throw err_('ALREADY', 'ตรวจรายการนี้ไปแล้ว');
    update_(kind, r._row, { status: ok ? 'approved' : 'hidden', decided_by: admin.user_id, decided_at: now_() });
    if (ok) {
      var reason = kind === 'Reviews' ? 'review' : 'grades';
      var already = read_('CellLedger').some(function (x) { return x.user_id === r.user_id && x.reason === reason && x.ref === r[idk]; });
      var n = kind === 'Reviews' ? CELLS.REVIEW : CELLS.GRADES + (r.proof_file_id ? CELLS.GRADES_PROOF : 0);
      if (!already) { ledgerAdd_(r.user_id, n, reason, thDay_(), r[idk]); var st = streakRow_(r.user_id, true); update_('Streaks', st._row, { points: ledgerSum_(r.user_id) }); }
    }
    log_(admin, kind === 'Reviews' ? 'review.' + (ok ? 'approve' : 'hide') : 'grades.' + (ok ? 'approve' : 'hide'), d.id);
  });
  cache_().remove('pub_courses');
  return true;
}
function adminGradesProof_(d) {
  var r = findOne_('GradeReports', function (x) { return x.report_id === d.id; });
  if (!r) throw err_('NOT_FOUND', 'ไม่พบรายการ');
  return photoOut_(r.proof_file_id);
}
// ───── ความเห็นจากคนที่ลองดูตอนฟรี (ไม่ต้องล็อกอิน ไม่ได้เซลล์ ใช้ดูว่าตอนตัวอย่างเข้าใจง่ายไหม) ─────
var TRIAL_LEVELS = { clear: 'เข้าใจ', partly: 'เข้าใจบางส่วน', lost: 'ยังไม่เข้าใจ' };
function trialFeedback_(d, p) {
  var cid = String(d.course_id || ''), level = String(d.level || '');
  if (!TRIAL_LEVELS[level]) throw err_('BAD_INPUT', 'เลือกว่าเข้าใจแค่ไหน');
  var c = findOne_('Courses', function (x) { return x.course_id === cid && x.status === 'published'; });
  if (!c) throw err_('NOT_FOUND', 'ไม่พบคอร์สนี้');
  var u = null; if (p && p.token) { try { u = auth_(p); } catch (ignore) {} }
  var who = u ? u.user_id : String((p && p.device_id) || '').slice(0, 60);
  if (!who) throw err_('BAD_INPUT', 'ส่งไม่ได้ ลองรีเฟรชหน้าอีกครั้ง');
  var key = 'tf:' + who + ':' + cid + ':' + String(d.lesson || '').slice(0, 40);
  if (cache_().get(key)) return { ok: true, repeat: true };
  cache_().put(key, '1', 21600);
  withLock_(function () {
    append_('TrialFeedback', { fb_id: 'TF' + id_(), course_id: cid, lesson: clip_(d.lesson, 120), level: level, text: clip_(String(d.text || '').trim(), 500), user_id: u ? u.user_id : '', device_id: u ? '' : who, created_at: now_() });
  });
  return { ok: true };
}
function trialStats_(cid) {
  var rows = read_('TrialFeedback').filter(function (x) { return x.course_id === cid; });
  if (rows.length < 5) return null;
  var clear = rows.filter(function (x) { return x.level === 'clear'; }).length, partly = rows.filter(function (x) { return x.level === 'partly'; }).length;
  return { n: rows.length, clear_pct: Math.round(clear / rows.length * 100), ok_pct: Math.round((clear + partly) / rows.length * 100) };
}
function trialAdmin_() {
  var courses = read_('Courses'), rows = read_('TrialFeedback'), by = {};
  rows.forEach(function (x) { var b = by[x.course_id] = by[x.course_id] || { course_id: x.course_id, clear: 0, partly: 0, lost: 0, n: 0 }; b[x.level] = (b[x.level] || 0) + 1; b.n++; });
  return { summary: Object.keys(by).map(function (k) { var c = courses.filter(function (y) { return y.course_id === k; })[0]; by[k].course = c ? c.title : k; return by[k]; }).sort(function (a, b) { return b.n - a.n; }),
    comments: rows.filter(function (x) { return x.text; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 100).map(function (x) {
      var c = courses.filter(function (y) { return y.course_id === x.course_id; })[0];
      return { course: c ? c.title : x.course_id, lesson: x.lesson, level: x.level, text: x.text, member: !!x.user_id, created_at: x.created_at }; }) };
}
function courseReviews_(cid) {
  var users = read_('Users');
  return read_('Reviews').filter(function (x) { return x.course_id === cid && x.status === 'approved'; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 30).map(function (x) {
    var u = users.filter(function (y) { return y.user_id === x.user_id; })[0];
    return { nickname: u ? u.nickname : 'นักเรียน', grade: u ? u.grade : '', rating: Number(x.rating) || 0, text: x.text, created_at: x.created_at };
  });
}
function siteUrl_() { return String(getSetting_('site_url') || 'https://ineedbio.shop').replace(/\/+$/, ''); }
function bahtTxt_(n) { return '฿' + Number(n || 0).toLocaleString('en-US'); }
function thDateTxt_(iso) {
  var d = new Date(iso); if (isNaN(d)) return '';
  var M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var t = new Date(d.getTime() + 7 * 36e5); // เวลาไทย
  return t.getUTCDate() + ' ' + M[t.getUTCMonth()] + ' ' + (t.getUTCFullYear() + 543) + ' ' + ('0' + t.getUTCHours()).slice(-2) + ':' + ('0' + t.getUTCMinutes()).slice(-2) + ' น.';
}
function mailBtn_(href, label) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 0;"><tr><td style="border-radius:999px;background:#1f7a4d;"><a href="' + esc_(href) + '" style="display:inline-block;padding:12px 26px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;">' + esc_(label) + '</a></td></tr></table>';
}
function mailRows_(items) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">' + items.map(function (i) {
    return '<tr><td style="padding:7px 0;color:#0c0c0c;border-bottom:1px dashed #e6e6e4;">' + esc_(i.title) + (i.bundle ? '<br><span style="font-size:12px;color:#1f7a4d;">แพ็กเกจ ' + esc_(i.bundle) + '</span>' : '') + '</td>' +
      '<td align="right" style="padding:7px 0;color:#0c0c0c;border-bottom:1px dashed #e6e6e4;white-space:nowrap;vertical-align:top;">' + (i.discount ? '<span style="color:#8a8a8a;text-decoration:line-through;font-size:12px;">' + bahtTxt_(i.price) + '</span> ' : '') + bahtTxt_(i.net != null ? i.net : i.price) + '</td></tr>';
  }).join('') + '</table>';
}
/** อีเมลยืนยันคำสั่งซื้อ: บิล ยอดโอน เลขบัญชี กำหนดชำระ และขั้นตอนต่อไป */
function sendOrderEmail_(u, res) {
  if (MailApp.getRemainingDailyQuota() < 1) return;
  var bills = read_('Bills').filter(function (b) { return b.order_id === res.order_id; }).sort(function (a, b) { return a.bill_id < b.bill_id ? -1 : 1; });
  if (!bills.length) return;
  var ig = getSetting_('contact_ig') || 'ineedbiochem', link = siteUrl_() + '/#/orders/' + encodeURIComponent(res.order_id);
  var open = bills.filter(function (b) { return b.status === 'awaiting_payment'; });
  var billBox = function (b, i) {
    var acc = (jsonParse_(b.account, {}) || {}).pub || {}, items = jsonParse_(b.items, []), paid = b.status === 'approved';
    var accRows = acc.method === 'bank'
      ? [['ธนาคาร', acc.bank], ['เลขบัญชี', acc.account_no], ['ชื่อบัญชี', acc.account_name]]
      : [['พร้อมเพย์', acc.promptpay_id], ['ชื่อบัญชี', acc.account_name]];
    accRows = accRows.filter(function (r) { return r[1]; });
    if (!accRows.length && acc.qr_url) accRows = [['ช่องทาง', 'สแกน QR ในหน้าบิลบนเว็บ']];
    return '<tr><td style="padding:0 32px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e6e4;border-radius:14px;">' +
      '<tr><td style="padding:14px 16px 4px;"><span style="font-size:12px;color:#8a8a8a;">' + (bills.length > 1 ? 'บิลที่ ' + (i + 1) + ' จาก ' + bills.length + ' · ' : '') + esc_(b.bill_id) + '</span></td></tr>' +
      '<tr><td style="padding:0 16px 6px;">' + mailRows_(items) + '</td></tr>' +
      '<tr><td style="padding:6px 16px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:#525252;">' + (paid ? 'ยอด 0 บาท เปิดสิทธิ์แล้ว' : 'ยอดที่ต้องโอน') + '</td><td align="right" style="font-size:22px;font-weight:700;color:#0c0c0c;">' + bahtTxt_(b.total) + '</td></tr></table></td></tr>' +
      (paid ? '' : '<tr><td style="padding:0 16px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;border-radius:10px;font-size:14px;">' +
        accRows.map(function (r) { return '<tr><td style="padding:8px 12px;color:#8a8a8a;width:90px;">' + r[0] + '</td><td style="padding:8px 12px;color:#0c0c0c;font-weight:600;">' + esc_(r[1] || '-') + '</td></tr>'; }).join('') +
        '</table><p style="margin:10px 0 0;font-size:13px;color:#8a5a00;">โอนเข้าบัญชีนี้เท่านั้น · ชำระภายใน ' + esc_(thDateTxt_(b.expires_at)) + '</p></td></tr>') +
      '</table></td></tr>';
  };
  var inner = '<tr><td style="padding:0 32px 18px;"><p style="margin:0;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc_(u.nickname) + '<br>' +
      (open.length ? 'ได้รับคำสั่งซื้อ <b style="color:#0c0c0c;">' + esc_(res.order_id) + '</b> แล้ว ' + (open.length > 1 ? 'คำสั่งซื้อนี้มี ' + open.length + ' บิลเพราะรับเงินคนละบัญชี กรุณาโอนแยกตามบิล' : 'โอนเงินตามยอดด้านล่างได้เลย') : 'คำสั่งซื้อ <b style="color:#0c0c0c;">' + esc_(res.order_id) + '</b> เรียบร้อย เข้าเรียนได้ทันที') + '</p></td></tr>' +
    bills.map(billBox).join('') +
    (res.discount ? '<tr><td style="padding:0 32px 12px;font-size:13px;color:#1f7a4d;">ประหยัดไป ' + bahtTxt_(res.discount) + (res.coupon ? ' (รวมโค้ด ' + esc_(res.coupon) + ')' : '') + '</td></tr>' : '') +
    (open.length ? '<tr><td style="padding:4px 32px 8px;"><p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0c0c0c;">ขั้นตอนต่อไป</p>' +
      '<ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:#525252;"><li>โอนเงินตามยอดของแต่ละบิล</li><li>แนบสลิปและกรอกข้อมูลการโอนในหน้าคำสั่งซื้อ</li><li>แจ้งการชำระเงินทาง IG @' + esc_(ig) + ' อีกครั้ง</li><li>แอดมินตรวจยอดแล้วเปิดสิทธิ์ ระบบส่งอีเมลแจ้ง</li></ol></td></tr>' : '') +
    '<tr><td style="padding:10px 32px 26px;">' + mailBtn_(open.length ? link : siteUrl_() + '/#/my', open.length ? 'ไปหน้าชำระเงิน' : 'เข้าห้องเรียน') +
    (open.length ? '<p style="margin:14px 0 0;font-size:12.5px;line-height:1.7;color:#8a8a8a;">ไม่มีนโยบายคืนเงินทุกกรณีเมื่อชำระเงินแล้ว · INeedBio ไม่รับผิดชอบการโอนเข้าบัญชีอื่นที่ไม่ได้แสดงในบิล</p>' : '') + '</td></tr>';
  var total = bills.reduce(function (a, b) { return a + (b.status === 'awaiting_payment' ? Number(b.total) || 0 : 0); }, 0);
  MailApp.sendEmail({ to: u.email, name: APP.NAME,
    subject: open.length ? 'ได้รับคำสั่งซื้อ ' + res.order_id + ' · รอชำระ ' + bahtTxt_(total) : 'คำสั่งซื้อ ' + res.order_id + ' สำเร็จ · เข้าเรียนได้แล้ว',
    body: 'คำสั่งซื้อ ' + res.order_id + (open.length ? ' รอชำระเงิน ' + bahtTxt_(total) + ' ดูเลขบัญชีและชำระเงินที่ ' + link : ' สำเร็จ'),
    htmlBody: mailShell_(open.length ? 'ได้รับคำสั่งซื้อแล้ว' : 'สั่งซื้อสำเร็จ', inner) });
}
/** อีเมลผลตรวจบิล: อนุมัติ = ใบเสร็จ + ปุ่มเข้าห้องเรียน · ไม่อนุมัติ = เหตุผล + ปุ่มส่งหลักฐานใหม่ */
function sendBillEmail_(u, b, decision, note) {
  if (MailApp.getRemainingDailyQuota() < 1) return;
  var ok = decision === 'approved', items = jsonParse_(b.items, []), pr = jsonParse_(b.proof, {}) || {};
  var acc = ((jsonParse_(b.account, {}) || {}).pub) || {};
  var meta = [['เลขบิล', b.bill_id], ['วันที่ชำระ', pr.paid_at ? thDateTxt_(pr.paid_at) : thDateTxt_(now_())], ['ชำระเข้า', [acc.method === 'bank' ? acc.bank || 'โอนธนาคาร' : 'พร้อมเพย์', acc.account_name].filter(Boolean).join(' · ')]];
  var inner = ok
    ? '<tr><td style="padding:0 32px 16px;"><p style="margin:0;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc_(u.nickname) + '<br>แอดมินตรวจยอดเงินเรียบร้อย ตอนนี้เข้าเรียนได้เลย</p></td></tr>' +
      '<tr><td style="padding:0 32px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e6e4;border-radius:14px;">' +
      '<tr><td style="padding:14px 16px 2px;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#e7f3ec;color:#1f7a4d;font-size:12px;font-weight:600;">ชำระเงินแล้ว</span></td></tr>' +
      '<tr><td style="padding:8px 16px 4px;">' + mailRows_(items) + '</td></tr>' +
      '<tr><td style="padding:6px 16px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:#525252;">ยอดชำระ</td><td align="right" style="font-size:22px;font-weight:700;color:#0c0c0c;">' + bahtTxt_(b.total) + '</td></tr></table></td></tr>' +
      '<tr><td style="padding:0 16px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;background:#f5f5f4;border-radius:10px;">' + meta.map(function (r) { return '<tr><td style="padding:7px 12px;color:#8a8a8a;width:90px;">' + r[0] + '</td><td style="padding:7px 12px;color:#0c0c0c;">' + esc_(r[1]) + '</td></tr>'; }).join('') + '</table></td></tr></table></td></tr>' +
      '<tr><td style="padding:0 32px 26px;">' + mailBtn_(siteUrl_() + (items.length === 1 ? '/#/learn/' + encodeURIComponent(items[0].course_id) : '/#/my'), 'เข้าห้องเรียน') +
      '<p style="margin:14px 0 0;font-size:12.5px;line-height:1.7;color:#8a8a8a;">บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ดูได้ตลอด ไม่มีวันหมดอายุ · เก็บอีเมลนี้ไว้เป็นหลักฐานการชำระเงิน</p></td></tr>'
    : '<tr><td style="padding:0 32px 16px;"><p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc_(u.nickname) + '<br>หลักฐานการโอนของบิล <b style="color:#0c0c0c;">' + esc_(b.bill_id) + '</b> ยังไม่ผ่านการตรวจ</p>' +
      (note ? '<p style="margin:0 0 14px;padding:12px 14px;background:#fbe8e6;border-radius:10px;font-size:14px;color:#a3261e;">เหตุผล: ' + esc_(note) + '</p>' : '') + mailRows_(items) + '</td></tr>' +
      '<tr><td style="padding:0 32px 26px;">' + mailBtn_(siteUrl_() + '/#/orders/' + encodeURIComponent(b.order_id), 'แก้ไขและส่งหลักฐานใหม่') + '<p style="margin:14px 0 0;font-size:13px;color:#525252;">สงสัยตรงไหน ทัก IG แอดมินได้เลย</p></td></tr>';
  MailApp.sendEmail({ to: u.email, name: APP.NAME, subject: ok ? 'ชำระเงินสำเร็จ · เข้าเรียนได้แล้ว (' + b.bill_id + ')' : 'หลักฐานการโอนยังไม่ผ่าน · บิล ' + b.bill_id,
    body: (ok ? 'ชำระเงินสำเร็จ เข้าเรียนได้แล้ว: ' : 'หลักฐานการโอนยังไม่ผ่าน: ') + items.map(function (i) { return i.title; }).join(', ') + (note ? '\nเหตุผล: ' + note : ''),
    htmlBody: mailShell_(ok ? 'ชำระเงินสำเร็จ' : 'หลักฐานการโอนยังไม่ผ่าน', inner) });
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
  var patch = { label: req_(d.label, 'ชื่อเรียกบัญชี', 60), method: method, account_name: clip_(d.account_name, 100),
    promptpay_id: String(d.promptpay_id || '').replace(/\D/g, ''), bank: clip_(d.bank, 60), account_no: clip_(d.account_no, 30),
    qr_url: clip_(d.qr_url, 500), note: clip_(d.note, 300), ig: clip_(String(d.ig || '').replace(/^@/, ''), 40),
    subjects: csv_(d.subjects).filter(function (s) { return APP.SUBJECTS[s]; }).join(','), status: d.status === 'inactive' ? 'inactive' : 'active',
    sort_order: String(Number(d.sort_order) || 0), owner_id: clip_(d.owner_id, 30) };
  if (patch.owner_id && !findOne_('Users', function (r) { return r.user_id === patch.owner_id && isStaff_(r); })) throw err_('BAD_INPUT', 'เจ้าของบัญชีต้องเป็นผู้สอนหรือแอดมิน');
  if (method === 'promptpay' && !patch.promptpay_id && !patch.qr_url) throw err_('BAD_INPUT', 'ใส่เลขพร้อมเพย์ หรืออัปโหลดรูป QR อย่างน้อย 1 อย่าง');
  if (method === 'promptpay' && patch.promptpay_id && !/^(\d{10}|\d{13}|\d{15})$/.test(patch.promptpay_id)) throw err_('BAD_INPUT', 'เลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตร/เลขผู้เสียภาษี 13 หลัก');
  if (method === 'bank' && !patch.account_no && !patch.qr_url) throw err_('BAD_INPUT', 'ใส่เลขบัญชี หรืออัปโหลดรูป QR อย่างน้อย 1 อย่าง');
  if (method === 'bank' && patch.account_no && !patch.bank) throw err_('BAD_INPUT', 'เลือกธนาคารของเลขบัญชีนี้');
  if (patch.qr_url && !/^(https:\/\/|\/)/.test(patch.qr_url)) throw err_('BAD_INPUT', 'ลิงก์รูป QR ต้องขึ้นต้นด้วย https://');
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
  var kind = d.kind === 'fixed' || d.kind === 'each' ? d.kind : 'percent', value = Number(d.value);
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
function adminStats_(d, p, me) {
  if (me && !isAdmin_(me)) return teacherStats_(me);
  var users = read_('Users'), en = read_('Enrollments'), courses = read_('Courses'), bills = read_('Bills');
  var today = now_().slice(0, 10), month = now_().slice(0, 7);
  var subj = {};
  Object.keys(APP.SUBJECTS).forEach(function (k) { subj[k] = { subject: k, name: APP.SUBJECTS[k], count: 0, revenue: 0 }; });
  var revenue = 0, monthCount = 0;
  en.forEach(function (e) {
    if ((e.status !== 'approved' && e.status !== 'revoked') || !(Number(e.amount) > 0) || String(e.decided_at).slice(0, 7) !== month) return;
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
    email_quota: MailApp.getRemainingDailyQuota(),
    legacy_pending: read_('LegacyClaims').filter(function (c) { return c.status === 'pending'; }).length,
    expense_pending: read_('Expenses').filter(function (x) { return x.status === 'pending'; }).length
  };
}
/** ภาพรวมของผู้สอน: เฉพาะวิชาตัวเอง ไม่มีข้อมูลสมาชิกทั้งเว็บ */
function teacherStats_(me) {
  var mine = subjectsOf_(me), courses = read_('Courses').filter(function (c) { return mine.indexOf(c.subject) >= 0; });
  var ids = courses.map(function (c) { return c.course_id; }), month = now_().slice(0, 7), en = read_('Enrollments');
  var subj = mine.map(function (k) { return { subject: k, name: APP.SUBJECTS[k], count: 0, revenue: 0, students: 0 }; });
  en.forEach(function (e) {
    var c = courses.filter(function (x) { return x.course_id === e.course_id; })[0]; if (!c) return;
    var row = subj.filter(function (x) { return x.subject === c.subject; })[0];
    if (enrollActive_(e)) row.students++;
    if ((e.status === 'approved' || e.status === 'revoked') && Number(e.amount) > 0 && String(e.decided_at).slice(0, 7) === month) { row.count++; row.revenue += Number(e.amount) || 0; }
  });
  var reviewing = read_('Bills').filter(function (b) { return b.status === 'reviewing' && jsonParse_(b.items, []).some(function (it) { return ids.indexOf(it.course_id) >= 0; }); }).length;
  return { teacher: true, subjects: mine, by_subject: subj, reviewing: reviewing, pending: 0, pending_legacy: 0,
    month_revenue: subj.reduce(function (a, x) { return a + x.revenue; }, 0), month_count: subj.reduce(function (a, x) { return a + x.count; }, 0),
    courses: courses.length, students: subj.reduce(function (a, x) { return a + x.students; }, 0),
    expense_pending: read_('Expenses').filter(function (x) { return x.status === 'pending' && x.created_by === me.user_id; }).length };
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

/** ให้สิทธิ์เข้าเรียน (ฟรี หรือรับเงินผ่านช่องทางอื่น) — ผู้สอนให้ได้เฉพาะคอร์สวิชาตัวเอง และใส่ยอดเงินไม่ได้ */
function adminGrant_(d, p, admin) {
  var c = courseFor_(admin, d.course_id);
  var emails = String(d.emails || d.email || '').split(/[\s,;]+/).map(function (x) { return x.trim().toLowerCase(); }).filter(String);
  emails = emails.filter(function (x, i) { return emails.indexOf(x) === i; }).slice(0, 200);
  if (!emails.length) throw err_('BAD_INPUT', 'ใส่อีเมลของนักเรียน');
  var amount = isAdmin_(admin) ? Math.max(0, Number(d.amount) || 0) : 0;
  var exp = String(d.expires_at || '').trim();
  if (exp) { var t = new Date(exp.length === 10 ? exp + 'T23:59:59+07:00' : exp); if (isNaN(t)) throw err_('BAD_INPUT', 'วันหมดอายุไม่ถูกต้อง'); exp = t.toISOString(); }
  var reason = clip_(d.note || d.reason, 300), out = { added: [], skipped: [] }, mail = [];
  withLock_(function () {
    emails.forEach(function (em) {
      var u = userByEmail_(em);
      if (!u) { out.skipped.push({ email: em, why: 'ยังไม่ได้สมัครสมาชิก' }); return; }
      var prev = latestEnroll_(u.user_id, c.course_id);
      if (enrollActive_(prev)) { out.skipped.push({ email: em, why: 'มีสิทธิ์อยู่แล้ว' }); return; }
      var source = amount > 0 ? 'manual' : u.user_id === admin.user_id ? 'test' : 'grant';
      var row = { status: 'approved', amount: String(amount), note: reason || (source === 'test' ? 'ทดสอบโดยทีมงาน' : amount > 0 ? 'รับเงินช่องทางอื่น' : 'ให้สิทธิ์ฟรี'),
        decided_by: admin.user_id, decided_at: now_(), source: source, reason: reason, expires_at: exp };
      if (prev && prev.status === 'pending') update_('Enrollments', prev._row, row);
      else append_('Enrollments', Object.assign({ enroll_id: 'E' + id_(), user_id: u.user_id, course_id: c.course_id, slip_file_id: '', created_at: now_() }, row));
      log_(admin, 'grant', u.email + ' → ' + c.course_id + ' (' + source + (amount ? ' ฿' + amount : '') + (exp ? ' ถึง ' + exp.slice(0, 10) : '') + ')');
      out.added.push(em); if (source !== 'test') mail.push(u);
    });
  });
  mail.forEach(function (u) { try { sendDecisionEmail_(u, c, 'approved', ''); } catch (e) { console.error(e); } });
  if (emails.length === 1 && !out.added.length) throw err_(out.skipped[0].why === 'มีสิทธิ์อยู่แล้ว' ? 'ALREADY' : 'NOT_FOUND', out.skipped[0].why === 'มีสิทธิ์อยู่แล้ว' ? 'ผู้ใช้นี้มีสิทธิ์คอร์สนี้อยู่แล้ว' : 'ไม่พบผู้ใช้อีเมลนี้ (ต้องสมัครสมาชิกก่อน)');
  return out;
}

function adminCourses_(d, p, u) {
  var lessons = read_('Lessons'), en = read_('Enrollments');
  return read_('Courses').filter(function (x) { return !u || canSubject_(u, x.subject); }).sort(bySort_).map(function (x) {
    var card = courseCard_(x, visible_(lessons));
    card.sort_order = Number(x.sort_order) || 0;
    ['teacher_ids','accent','pending_change','trailer_youtube','highlights','audience','instructor_name','instructor_title','instructor_bio','instructor_photo','faq','pay_account_id','instructor2_name','instructor2_title','instructor2_bio','instructor2_photo'].forEach(function (k) { card[k] = x[k] || ''; });
    card.students = en.filter(function (e) { return e.course_id === x.course_id && enrollActive_(e); }).length;
    card.playlists = jsonParse_(x.playlists, []);
    card.can_edit_sales = !u || isAdmin_(u);
    return card;
  });
}

function adminCourseSave_(d, p, admin) {
  var lockedFrom = null;
  if (!isAdmin_(admin)) {
    // ผู้สอน: แก้ได้เฉพาะคอร์สในวิชาตัวเอง และแก้ราคา สถานะ วิชา บัญชีรับเงิน ลำดับ ไม่ได้
    if (!d.course_id) throw err_('FORBIDDEN', 'สร้างคอร์สใหม่ได้เฉพาะแอดมิน');
    lockedFrom = courseFor_(admin, d.course_id);
    d = Object.assign({}, d, { subject: lockedFrom.subject, price: lockedFrom.price || 0 });
  }
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
  if (d.teacher_ids != null) {
    var okIds = read_('Users').filter(isStaff_).map(function (u) { return u.user_id; });
    var tids = (Array.isArray(d.teacher_ids) ? d.teacher_ids : csv_(d.teacher_ids)).map(String).filter(function (id, i, a) { return okIds.indexOf(id) >= 0 && a.indexOf(id) === i; });
    if (tids.length > 3) throw err_('BAD_INPUT', 'เลือกผู้สอนได้สูงสุด 3 คน');
    patch.teacher_ids = tids.join(',');
  }
  var ac = String(d.accent || '').trim();
  if (ac && !/^#[0-9a-f]{6}$/i.test(ac)) throw err_('BAD_INPUT', 'เลือกสีประจำคอร์สใหม่');
  patch.accent = ac.toLowerCase();
  if (lockedFrom) {
    // ผู้สอนเปลี่ยนราคา/สถานะ → ส่งเป็นคำขอให้แอดมินอนุมัติ ยังไม่เปลี่ยนจริง
    var want = {};
    if (d.req_price != null && String(d.req_price) !== '' && Number(d.req_price) >= 0 && String(Number(d.req_price)) !== String(lockedFrom.price)) want.price = String(Number(d.req_price));
    if (d.req_full_price != null && String(d.req_full_price) !== String(lockedFrom.full_price || '')) want.full_price = d.req_full_price === '' ? '' : String(Math.max(0, Number(d.req_full_price) || 0));
    if ((d.req_status === 'published' || d.req_status === 'draft') && d.req_status !== lockedFrom.status) want.status = d.req_status;
    ['subject', 'price', 'full_price', 'status', 'sort_order', 'pay_account_id', 'teacher_ids', 'pending_change'].forEach(function (k) { patch[k] = lockedFrom[k] || ''; });
    if (Object.keys(want).length) { want.by = admin.user_id; want.at = now_(); patch.pending_change = JSON.stringify(want); }
  }
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

function adminLessons_(d, p, u) {
  courseFor_(u, d.course_id);
  var list = read_('Lessons').filter(function (l) { return l.course_id === d.course_id; }).sort(bySort_);
  return list.map(function (l) {
    return { lesson_id: l.lesson_id, course_id: l.course_id, chapter: l.chapter, title: l.title, youtube_id: l.youtube_id,
      duration_min: Number(l.duration_min) || 0, attachment_url: l.attachment_url, is_preview: truthy_(l.is_preview), sort_order: Number(l.sort_order) || 0,
      hidden: truthy_(l.hidden), from_playlist: !!l.source_playlist, files: filesOut_(l) };
  });
}

function adminLessonSave_(d, p, admin) {
  if (d.lesson_id) d.course_id = lessonFor_(admin, d.lesson_id).course_id; else courseFor_(admin, d.course_id);
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
  courseFor_(admin, d.course_id);
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
  lessonFor_(admin, d.lesson_id);
  withLock_(function () {
    var rows = read_('Lessons').filter(function (r) { return r.lesson_id === d.lesson_id; });
    if (!rows.length) throw err_('NOT_FOUND', 'ไม่พบบทเรียน');
    deleteRows_('Lessons', rows); log_(admin, 'lesson.delete', d.lesson_id);
  });
  cache_().remove('pub_courses');
  return true;
}

function adminLessonsReorder_(d, p, admin) {
  courseFor_(admin, d.course_id);
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
    return !q || [u.email, u.first_name, u.last_name, u.nickname, u.phone, u.school, u.facebook, u.instagram, u.line_id].join(' ').toLowerCase().indexOf(q) >= 0;
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
  var invite = null, out = { ok: true };
  withLock_(function () {
    var u = findOne_('Users', function (r) { return r.user_id === d.user_id; });
    if (!u) throw err_('NOT_FOUND', 'ไม่พบผู้ใช้');
    if (u.user_id === admin.user_id) throw err_('BAD_INPUT', 'แก้สิทธิ์ของตัวเองไม่ได้');
    ensureCols_('Users');
    var patch = {}, before = rolesOf_(u);
    // ยศแบบใหม่: roles = ['admin','teacher'] เลือกได้หลายยศ · แบบเก่า: role = 'student'|'teacher'|'admin'
    var roles = Array.isArray(d.roles) ? d.roles : d.role ? (d.role === 'student' ? [] : [d.role]) : null;
    if (roles) {
      roles = roles.filter(function (k) { return ROLE_KEYS.indexOf(k) >= 0; });
      Object.assign(patch, rolePatch_(roles));
      if (roles.indexOf('teacher') >= 0) {
        patch.subjects = csv_(d.subjects).filter(function (s) { return APP.SUBJECTS[s]; }).join(',');
        if (!patch.subjects) throw err_('BAD_INPUT', 'เลือกวิชาที่ผู้สอนดูแลอย่างน้อย 1 วิชา');
      } else patch.subjects = '';
    }
    if (d.status === 'active' || d.status === 'banned') patch.status = d.status;
    update_('Users', u._row, patch);
    var changed = roles && (roles.slice().sort().join(',') !== before.slice().sort().join(',') || (patch.subjects || '') !== (isTeacher_(u) ? String(u.subjects || '') : ''));
    if (patch.status === 'banned' || changed) killSessions_(u.user_id);
    log_(admin, 'user.update', u.email + ' ' + JSON.stringify(patch));
    if (roles && roles.indexOf('teacher') >= 0 && before.indexOf('teacher') < 0) invite = u.user_id;
  });
  if (invite) out.invite = inviteTeacher_(invite, admin);
  return out;
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
function sheet_(name) {
  var s = ss_(), sh = s.getSheetByName(name);
  if (!sh && SCHEMA[name]) { sh = s.insertSheet(name); ensureCols_(name); }
  return sh;
}
/** ถ้ามีคอลัมน์ใหม่ในโค้ดที่ชีตยังไม่มี (ลืมรัน setup) เพิ่มให้ก่อนเขียน กันข้อมูลหาย */
function colsFor_(name, obj) {
  var head = headers_(name), want = SCHEMA[name] || [];
  if (Object.keys(obj).some(function (k) { return head.indexOf(k) < 0 && want.indexOf(k) >= 0; })) { ensureCols_(name); head = headers_(name); }
  return head;
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
  var sh = sheet_(name), head = colsFor_(name, obj);
  var row = head.map(function (h) { return obj[h] == null ? '' : String(obj[h]); });
  var r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, head.length).setNumberFormat('@').setValues([row]);
  delete _cache[name];
}
function update_(name, rowNum, patch) {
  var sh = sheet_(name), head = colsFor_(name, patch);
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
/** วันเกิด (บังคับ) + ช่องทางติดต่อ Facebook / IG / LINE (อย่างน้อย 1 ช่องทาง) */
function contacts_(d, out) {
  var bd = String(d.birthday || '').trim();
  if (!bd) throw err_('BAD_INPUT', 'กรอกวันเดือนปีเกิด');
  var m = bd.match(/^(\d{4})-(\d{2})-(\d{2})$/), t = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!t || t.getUTCDate() !== +m[3]) throw err_('BAD_INPUT', 'วันเดือนปีเกิดไม่ถูกต้อง');
  var age = (Date.now() - t.getTime()) / 31557600000;
  if (age < 7 || age > 90) throw err_('BAD_INPUT', 'ตรวจปีเกิดอีกครั้ง (ใช้ปี พ.ศ.)');
  out.birthday = bd;
  out.facebook = clip_(d.facebook, 120); out.instagram = clip_(String(d.instagram || '').replace(/^@/, ''), 60); out.line_id = clip_(String(d.line_id || '').replace(/^@(?=\w)/, ''), 60);
  if (!out.facebook && !out.instagram && !out.line_id) throw err_('BAD_INPUT', 'กรอกช่องทางติดต่ออย่างน้อย 1 ช่องทาง (Facebook, IG หรือ LINE)');
  return out;
}
function publicUser_(u) {
  return { user_id: u.user_id, email: u.email, first_name: u.first_name, last_name: u.last_name, nickname: u.nickname,
    school: u.school, grade: u.grade, phone: u.phone, role: u.role, status: u.status, created_at: u.created_at,
    current_faculty: u.current_faculty || '', current_university: u.current_university || '', dream_faculty: u.dream_faculty || '', dream_university: u.dream_university || '',
    is_repeat: isRepeat_(u.grade), terms_version: u.terms_version || '',
    birthday: u.birthday || '', facebook: u.facebook || '', instagram: u.instagram || '', line_id: u.line_id || '',
    has_photo: !!u.photo_file_id, data_consent: !!u.data_consent_at, roles: rolesOf_(u), subjects: teachSubjects_(u), profile_todo: profileTodo_(u) };
}
// ── รูปถ่ายผู้เรียน: เก็บในโฟลเดอร์ส่วนตัว (โฟลเดอร์เดียวกับสลิป) เห็นเฉพาะเจ้าของและแอดมิน ──
function checkPhoto_(ph, required) {
  if (!ph || !ph.base64) { if (required) throw err_('BAD_INPUT', 'ใส่รูปของน้องด้วย (รูปไหนก็ได้ ขอแค่เป็นรูปน้องเอง)'); return false; }
  if (!/^image\/(jpeg|png|webp)$/.test(ph.mime || '')) throw err_('BAD_INPUT', 'รูปถ่ายต้องเป็นไฟล์ JPG หรือ PNG');
  if (String(ph.base64).length * 0.75 > APP.PHOTO_MAX_BYTES) throw err_('BAD_INPUT', 'รูปถ่ายใหญ่เกิน 1 MB ลองเลือกรูปใหม่');
  return true;
}
function savePhoto_(ph, who) {
  var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('SLIP_FOLDER_ID'));
  var ext = ph.mime === 'image/png' ? 'png' : ph.mime === 'image/webp' ? 'webp' : 'jpg';
  return folder.createFile(Utilities.newBlob(Utilities.base64Decode(ph.base64), ph.mime, 'photo_' + String(who).replace(/[^\w.@-]/g, '_') + '_' + id_() + '.' + ext)).getId();
}
function photoOut_(fid) {
  if (!fid) return null;
  var blob = DriveApp.getFileById(fid).getBlob();
  return { mime: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}
function myPhoto_(d, p) { return photoOut_(auth_(p).photo_file_id); }
function adminUserPhoto_(d) {
  var u = findOne_('Users', function (r) { return r.user_id === d.user_id; });
  if (!u) throw err_('NOT_FOUND', 'ไม่พบผู้ใช้');
  return photoOut_(u.photo_file_id);
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

// ═════════════════════════ ผู้สอน: นักเรียนในคอร์ส · ถอนสิทธิ์ · บันทึกการแก้ไข ═════════════════════════
function visible_(lessons) { return lessons.filter(function (l) { return !truthy_(l.hidden); }); }
var SOURCE_LABEL = { bill: 'ซื้อผ่านเว็บ', manual: 'รับเงินช่องทางอื่น', grant: 'ให้ฟรี', test: 'ทดสอบ', legacy: 'นักเรียนรุ่นเก่า', request: 'ส่งสลิป (แบบเดิม)' };
/** ที่มาของสิทธิ์: แถวเก่าที่ยังไม่มี source เดาจากยอดเงินและหมายเหตุ */
function sourceOf_(e) {
  if (e.source) return e.source;
  if (/^บิล /.test(e.note || '')) return 'bill';
  if (e.slip_file_id) return 'request';
  return Number(e.amount) > 0 ? 'manual' : 'grant';
}
function courseStudents_(d, p, me) {
  var c = courseFor_(me, d.course_id), admin = isAdmin_(me);
  var users = read_('Users'), ids = visible_(read_('Lessons')).filter(function (l) { return l.course_id === c.course_id; }).map(function (l) { return l.lesson_id; });
  var prog = read_('Progress').filter(function (r) { return r.course_id === c.course_id; });
  var last = {};
  read_('Enrollments').forEach(function (e) { if (e.course_id === c.course_id && (!last[e.user_id] || last[e.user_id].created_at <= e.created_at)) last[e.user_id] = e; });
  return Object.keys(last).map(function (uid) {
    var e = last[uid], u = users.filter(function (x) { return x.user_id === uid; })[0] || {};
    var by = users.filter(function (x) { return x.user_id === e.decided_by; })[0];
    var done = prog.filter(function (r) { return r.user_id === uid && ids.indexOf(r.lesson_id) >= 0; }).length;
    var st = e.status === 'approved' && !enrollActive_(e) ? 'expired' : e.status, src = sourceOf_(e);
    return { enroll_id: e.enroll_id, user_id: uid, name: (u.first_name || '') + ' ' + (u.last_name || ''), nickname: u.nickname || '', email: admin ? u.email || '' : '',
      status: st, source: src, source_label: SOURCE_LABEL[src] || src, reason: e.reason || '', amount: admin ? Number(e.amount) || 0 : null,
      granted_by: by ? by.nickname || by.first_name : e.decided_by === 'SYSTEM' ? 'ระบบ' : '', since: e.decided_at || e.created_at, expires_at: e.expires_at || '',
      done: done, percent: ids.length ? Math.round(done / ids.length * 100) : 0,
      can_revoke: e.status === 'approved' && (admin || src === 'grant' || src === 'test') };
  }).filter(function (r) { return r.status !== 'rejected'; }).sort(function (a, b) { return a.since < b.since ? 1 : -1; });
}
function staffRevoke_(d, p, me) {
  var e = findOne_('Enrollments', function (r) { return r.enroll_id === d.enroll_id; });
  if (!e) throw err_('NOT_FOUND', 'ไม่พบสิทธิ์นี้');
  courseFor_(me, e.course_id);
  var src = sourceOf_(e);
  if (!isAdmin_(me) && src !== 'grant' && src !== 'test') throw err_('FORBIDDEN', 'ผู้สอนถอนได้เฉพาะสิทธิ์ที่ให้ฟรีหรือทดสอบ สิทธิ์ที่ซื้อแล้วต้องให้แอดมินถอน');
  if (e.status !== 'approved') throw err_('ALREADY', 'สิทธิ์นี้ถูกถอนไปแล้ว');
  withLock_(function () {
    var x = findOne_('Enrollments', function (r) { return r.enroll_id === d.enroll_id; });
    update_('Enrollments', x._row, { status: 'revoked', note: clip_(d.note || 'ถอนสิทธิ์โดยทีมงาน', 300) });
    if (src === 'legacy') read_('LegacyStudents').forEach(function (l) { if (l.user_id === x.user_id && csv_(l.course_ids).indexOf(x.course_id) >= 0) update_('LegacyStudents', l._row, { status: 'open', user_id: '', claimed_at: '', match: '' }); });
    log_(me, 'revoke', x.user_id + ' → ' + x.course_id + ' (' + src + ')');
  });
  return true;
}
function adminLog_(d) {
  var users = read_('Users'), q = String(d.q || '').toLowerCase();
  var rows = read_('AdminLog').slice(-1500).reverse().map(function (r) {
    var u = users.filter(function (x) { return x.user_id === r.admin_id; })[0] || {};
    return { time: r.time, who: u.nickname || u.first_name || r.admin_id, role: u.role || '', action: r.action, detail: r.detail };
  });
  if (d.teachers_only) rows = rows.filter(function (r) { return r.role === 'teacher'; });
  if (q) rows = rows.filter(function (r) { return [r.who, r.action, r.detail].join(' ').toLowerCase().indexOf(q) >= 0; });
  return rows.slice(0, 300);
}

// ═════════════════════════ การเงิน: รายรับ รายจ่าย ส่วนแบ่ง ปิดงวด ═════════════════════════
var EXPENSE_CATS = ['โฆษณา', 'เอกสาร/ชีท', 'อุปกรณ์', 'ค่าตอบแทน', 'ซอฟต์แวร์/โดเมน', 'อื่นๆ'];
function r2_(n) { return Math.round((Number(n) || 0) * 100) / 100; }
/** งวดครึ่งเดือน (เวลาไทย): YYYY-MM-1 = วันที่ 1–15, YYYY-MM-2 = 16–สิ้นเดือน · งวดเก่าแบบรายเดือน (YYYY-MM) ยังเปิดดูได้ */
function periodOf_(iso) { var t = new Date(iso); if (isNaN(t)) return ''; var s = new Date(t.getTime() + 7 * 36e5).toISOString(); return s.slice(0, 7) + (Number(s.slice(8, 10)) <= 15 ? '-1' : '-2'); }
function periodEnded_(pr) { return pr < periodOf_(now_()); }
function inPeriod_(iso, pr) { var q = periodOf_(iso); return pr.length === 7 ? q.slice(0, 7) === pr : q === pr; }
function checkPeriod_(pr) { if (!/^\d{4}-(0[1-9]|1[0-2])(-[12])?$/.test(String(pr || ''))) throw err_('BAD_INPUT', 'เลือกงวด'); return String(pr); }
/** ไม่มีค่าแพลตฟอร์มแล้ว: ยอดสุทธิของวิชาเป็นของผู้สอนของวิชานั้นทั้งหมด */
function platformPct_() { var out = {}; Object.keys(APP.SUBJECTS).forEach(function (k) { out[k] = 0; }); return out; }
function periodRow_(pr) { return findOne_('Periods', function (r) { return r.period === pr; }); }
function isClosed_(pr) { return !!periodRow_(pr) || (/-[12]$/.test(pr) && !!periodRow_(pr.slice(0, 7))); }
function teachersAll_() { return read_('Users').filter(isStaff_); }
/** สัดส่วนผู้สอนของคอร์ส: ตั้งเองต่อคอร์ส ถ้าไม่ได้ตั้ง แบ่งเท่ากันระหว่างผู้สอนของวิชานั้น */
/** สัดส่วนต่อวิชาที่เจ้าของตั้ง พร้อมวันเริ่มมีผล: { bio:[{from:'2026-10-01', parts:[{user_id,pct}]}] } */
function subjectSplits_() { var o = jsonParse_(getSetting_('subject_splits'), {}) || {}; Object.keys(o).forEach(function (k) { o[k] = (o[k] || []).slice().sort(function (a, b) { return a.from < b.from ? -1 : 1; }); }); return o; }
function splitFor_(c, whenIso, teachers, SS) {
  var day = new Date(new Date(whenIso).getTime() + 7 * 36e5).toISOString().slice(0, 10);
  var vs = ((SS || subjectSplits_())[c.subject] || []).filter(function (v) { return v.from <= day; });
  var v = vs[vs.length - 1];
  if (v) {
    var parts = verParts_(v, c.course_id).filter(function (x) { return Number(x.pct) > 0 && (x.kind === 'other' ? !!x.label : teachers.some(function (t) { return t.user_id === x.user_id; })); });
    // ติ๊กแยกคอร์ส: คอร์สที่ยังไม่มีผู้สอนรับ = ยังไม่มีผู้รับ (เข้าสถาบันทั้งก้อน)
    if (v.courses && !parts.some(function (x) { return x.kind !== 'other'; })) return { custom: true, parts: [] };
    var tot = parts.reduce(function (a, x) { return a + Number(x.pct); }, 0);
    if (tot > 0) return { custom: true, parts: parts.map(function (x) { return { user_id: x.kind === 'other' ? 'o:' + x.label : x.user_id, w: Number(x.pct) / tot }; }) };
  }
  return splitOf_(c, teachers.filter(function (t) { return isTeacher_(t) || (jsonParse_(c.teacher_split, []) || []).some(function (x) { return x.user_id === t.user_id; }); }));
}
/** ส่วนแบ่งของคอร์สจากเวอร์ชัน: แบบใหม่ { others:[{label,pct}], courses:{cid:[{user_id,pct}]} } · แบบเก่า { parts:[...] } */
function verParts_(v, cid) {
  if (v.courses) return (v.courses[cid] || []).map(function (x) { return { user_id: x.user_id, pct: Number(x.pct) }; })
    .concat((v.others || []).map(function (x) { return { kind: 'other', label: x.label, pct: Number(x.pct) }; }));
  return (v.parts || []).map(function (x) { return x.kind === 'other' ? { kind: 'other', label: x.label, pct: Number(x.pct) } : { user_id: x.user_id, pct: Number(x.pct) }; });
}
function splitOf_(c, teachers) {
  var sp = (jsonParse_(c.teacher_split, []) || []).filter(function (x) { return Number(x.pct) > 0 && teachers.some(function (t) { return t.user_id === x.user_id; }); });
  var tot = sp.reduce(function (a, x) { return a + Number(x.pct); }, 0);
  if (tot > 0) return { custom: true, parts: sp.map(function (x) { return { user_id: x.user_id, w: Number(x.pct) / tot }; }) };
  var ts = teachers.filter(function (t) { return csv_(t.subjects).indexOf(c.subject) >= 0; });
  return { custom: false, parts: ts.map(function (t) { return { user_id: t.user_id, w: 1 / ts.length }; }) };
}
/** คำนวณทั้งเดือน (ทุกวิชา) — แยกกรองตามสิทธิ์ผู้ดูทีหลัง */
function finCompute_(pr) {
  var users = read_('Users'), courses = read_('Courses'), bills = read_('Bills'), accs = read_('PayAccounts'), teachers = teachersAll_(), pct = platformPct_(), SS = subjectSplits_();
  var uname = function (id) { var u = users.filter(function (x) { return x.user_id === id; })[0]; return u ? (u.nickname ? u.nickname + ' ' : '') + '(' + (u.first_name || '') + ' ' + (u.last_name || '') + ')' : ''; };
  var income = [], free = { grant: 0, legacy: 0, test: 0, bill0: 0 };
  read_('Enrollments').forEach(function (e) {
    var c = courses.filter(function (x) { return x.course_id === e.course_id; })[0]; if (!c) return;
    var when = e.decided_at || e.created_at; if (!inPeriod_(when, pr)) return;
    var amt = Number(e.amount) || 0, src = sourceOf_(e);
    if (amt <= 0 || (e.status !== 'approved' && e.status !== 'revoked')) { if (e.status === 'approved') { if (src === 'bill') free.bill0++; else if (free[src] != null) free[src]++; } return; }
    var bid = e.bill_id || ((e.note || '').match(/^บิล (\S+)/) || [])[1] || '';
    var b = bid ? bills.filter(function (x) { return x.bill_id === bid; })[0] : null;
    var acc = b ? accs.filter(function (a) { return a.account_id === b.account_id; })[0] : null;
    var u = users.filter(function (x) { return x.user_id === e.user_id; })[0] || {};
    income.push({ enroll_id: e.enroll_id, date: when, course_id: c.course_id, course_title: c.title, subject: c.subject, amount: amt, source: src, source_label: SOURCE_LABEL[src] || src,
      student: (u.first_name || '') + ' ' + (u.last_name || ''), nickname: u.nickname || '', bill_id: bid, has_slip: !!e.slip_file_id,
      account_label: acc ? acc.label : b ? 'บัญชีหลัก' : '—', held_by: acc && acc.owner_id ? acc.owner_id : '', revoked: e.status === 'revoked' });
  });
  var expenses = read_('Expenses').filter(function (x) { return inPeriod_(x.date + 'T12:00:00+07:00', pr); }).map(function (x) {
    return { expense_id: x.expense_id, date: x.date, subject: x.subject, subject_name: APP.SUBJECTS[x.subject] || 'ส่วนกลาง', category: x.category, amount: Number(x.amount) || 0,
      note: x.note, status: x.status, has_receipt: !!x.receipt_file_id, created_by: x.created_by, created_by_name: uname(x.created_by) };
  }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var subj = {}, tt = {};
  Object.keys(APP.SUBJECTS).forEach(function (k) { subj[k] = { subject: k, name: APP.SUBJECTS[k], income: 0, expense: 0, net: 0, pct: pct[k], platform: 0, pool: 0, unassigned: 0, custom_missing: [] }; });
  var tw = {}, tc = {}; // tw[subject][user] = ยอดขายถ่วงสัดส่วน · tc = คอร์สที่ได้ส่วนแบ่ง
  income.forEach(function (it) {
    var S0 = subj[it.subject]; if (!S0) return; S0.income += it.amount;
    var c = courses.filter(function (x) { return x.course_id === it.course_id; })[0], sp = splitFor_(c, it.date, teachers, SS);
    if (!sp.parts.length) { S0.unassigned += it.amount; return; }
    tw[it.subject] = tw[it.subject] || {}; tc[it.subject] = tc[it.subject] || {};
    sp.parts.forEach(function (x) { tw[it.subject][x.user_id] = (tw[it.subject][x.user_id] || 0) + it.amount * x.w; var L = tc[it.subject][x.user_id] = tc[it.subject][x.user_id] || []; if (L.indexOf(it.course_title) < 0) L.push(it.course_title); });
  });
  expenses.forEach(function (x) { if (x.status === 'approved' && subj[x.subject]) subj[x.subject].expense += x.amount; });
  var shared = expenses.filter(function (x) { return x.status === 'approved' && !subj[x.subject]; }).reduce(function (a, x) { return a + x.amount; }, 0);
  Object.keys(subj).forEach(function (k) {
    var S0 = subj[k], assigned = S0.income - S0.unassigned;
    S0.net = r2_(S0.income - S0.expense);
    // ยอดที่มีผู้สอน: หักรายจ่ายตามสัดส่วน แล้วหักส่วนแบ่งแพลตฟอร์ม · ยอดที่ไม่มีผู้สอน เข้าแพลตฟอร์มทั้งหมด
    var expAssigned = S0.income > 0 ? S0.expense * assigned / S0.income : (Object.keys(tw[k] || {}).length ? S0.expense : 0);
    var netAssigned = assigned - expAssigned;
    S0.pool = r2_(netAssigned * (1 - S0.pct / 100));
    S0.platform = r2_(S0.net - S0.pool);
    var totW = Object.keys(tw[k] || {}).reduce(function (a, u) { return a + tw[k][u]; }, 0), P = S0.pool;
    // ส่วนอื่นที่ไม่ใช่ผู้สอน (เช่น ค่าหลังบ้าน): เข้าสถาบัน ไม่ต้องโอน · คนละส่วนกับรายจ่าย
    S0.others = Object.keys(tw[k] || {}).filter(function (u) { return u.slice(0, 2) === 'o:'; }).map(function (u) { return { label: u.slice(2), pct: r2_(totW > 0 ? tw[k][u] / totW * 100 : 0), amount: r2_(totW > 0 ? P * tw[k][u] / totW : 0) }; });
    S0.kept = r2_(S0.others.reduce(function (a, x) { return a + x.amount; }, 0));
    S0.pool_all = P; S0.pool = r2_(P - S0.kept); S0.platform = r2_(S0.platform + S0.kept);
    Object.keys(tw[k] || {}).forEach(function (uid) {
      if (uid.slice(0, 2) === 'o:') return;
      tt[uid] = tt[uid] || { user_id: uid, name: uname(uid), subjects: [], share: 0, held: 0 };
      if (tt[uid].subjects.indexOf(k) < 0) tt[uid].subjects.push(k);
      tt[uid].share += totW > 0 ? P * tw[k][uid] / totW : 0;
    });
    if (!totW && S0.expense && !S0.income) { // มีแต่รายจ่าย: ผู้สอนของวิชารับส่วนที่เป็นของตัวเอง
      var ts = teachers.filter(function (t) { return teachSubjects_(t).indexOf(k) >= 0; });
      if (ts.length) { S0.pool = S0.pool_all = r2_(-S0.expense * (1 - S0.pct / 100)); S0.platform = r2_(S0.net - S0.pool); ts.forEach(function (t) { tt[t.user_id] = tt[t.user_id] || { user_id: t.user_id, name: uname(t.user_id), subjects: [], share: 0, held: 0 }; if (tt[t.user_id].subjects.indexOf(k) < 0) tt[t.user_id].subjects.push(k); tt[t.user_id].share += S0.pool / ts.length; }); }
    }
    S0.income = r2_(S0.income); S0.expense = r2_(S0.expense); S0.unassigned = r2_(S0.unassigned);
  });
  income.forEach(function (it) { if (it.held_by) { tt[it.held_by] = tt[it.held_by] || { user_id: it.held_by, name: uname(it.held_by), subjects: [], share: 0, held: 0 }; tt[it.held_by].held += it.amount; } });
  // ยอดโอนแยกวิชา × ผู้สอน
  var pays = [];
  Object.keys(subj).forEach(function (k) {
    var S0 = subj[k], totW = Object.keys(tw[k] || {}).reduce(function (a, u) { return a + tw[k][u]; }, 0);
    Object.keys(tw[k] || {}).forEach(function (uid) {
      if (uid.slice(0, 2) === 'o:') return;
      var share = r2_(totW > 0 ? S0.pool_all * tw[k][uid] / totW : 0);
      var held = r2_(income.filter(function (it) { return it.subject === k && it.held_by === uid; }).reduce(function (a, it) { return a + it.amount; }, 0));
      pays.push({ subject: k, user_id: uid, name: uname(uid), pct: r2_(totW > 0 ? tw[k][uid] / totW * 100 : 0), share: share, held: held, settle: r2_(share - held), courses: ((tc[k] || {})[uid] || []) });
    });
  });
  var tlist = Object.keys(tt).map(function (k) { var t = tt[k]; t.share = r2_(t.share); t.held = r2_(t.held); t.settle = r2_(t.share - t.held); return t; })
    .sort(function (a, b) { return b.share - a.share; });
  var totals = { income: 0, expense: 0, platform: 0, teachers: 0, kept: 0 };
  Object.keys(subj).forEach(function (k) { if (subj[k].pool_all == null) { subj[k].pool_all = subj[k].pool; subj[k].others = []; subj[k].kept = 0; } totals.income += subj[k].income; totals.expense += subj[k].expense; totals.platform += subj[k].platform; totals.teachers += subj[k].pool; totals.kept += subj[k].kept; });
  totals.expense += shared; totals.platform -= shared;
  Object.keys(totals).forEach(function (k) { totals[k] = r2_(totals[k]); });
  totals.shared = r2_(shared); totals.net = r2_(totals.income - totals.expense);
  return { income: income, expenses: expenses, by_subject: Object.keys(subj).map(function (k) { return subj[k]; }), teachers: tlist, pays: pays, totals: totals, free: free };
}
/** ตัดข้อมูลให้เหลือเฉพาะที่ผู้ดูมีสิทธิ์เห็น */
function finScope_(r, me, subject) {
  var mine = subjectsOf_(me), admin = isAdmin_(me);
  var want = subject && mine.indexOf(subject) >= 0 ? [subject] : mine;
  var allSubj = admin && !subject;
  var out = {
    income: r.income.filter(function (x) { return want.indexOf(x.subject) >= 0; }),
    expenses: r.expenses.filter(function (x) { return want.indexOf(x.subject) >= 0 || (allSubj && !APP.SUBJECTS[x.subject]); }),
    by_subject: r.by_subject.filter(function (x) { return want.indexOf(x.subject) >= 0; }),
    teachers: admin ? r.teachers.filter(function (t) { return allSubj || t.subjects.some(function (s) { return want.indexOf(s) >= 0; }); }) : r.teachers.filter(function (t) { return t.user_id === me.user_id; }),
    pays: (r.pays || []).filter(function (x) { return (allSubj || want.indexOf(x.subject) >= 0) && (admin || x.user_id === me.user_id); }),
    free: r.free
  };
  if (allSubj) out.totals = r.totals;
  else {
    var t = { income: 0, expense: 0, platform: 0, teachers: 0, shared: 0 };
    out.by_subject.forEach(function (x) { t.income += x.income; t.expense += x.expense; t.platform += x.platform; t.teachers += x.pool; });
    Object.keys(t).forEach(function (k) { t[k] = r2_(t[k]); }); t.net = r2_(t.income - t.expense); out.totals = t;
  }
  if (!admin) { out.income.forEach(function (x) { x.bill_id = ''; }); out.expenses.forEach(function (x) { if (x.created_by !== me.user_id) x.created_by_name = x.created_by_name.replace(/\s*\(.*\)$/, ''); }); }
  return out;
}
function finSummary_(d, p, me) {
  var pr = d.period ? checkPeriod_(d.period) : periodOf_(now_());
  var row = periodRow_(pr), live = finCompute_(pr);
  if (!row && /-[12]$/.test(pr) && periodEnded_(pr) && !live.expenses.some(function (x) { return x.status === 'pending'; })) { closePeriod_(pr, live, 'auto'); row = periodRow_(pr); }
  if (row) { var snap = jsonParse_(row.snapshot, null); if (snap) { live.by_subject = snap.by_subject; live.teachers = snap.teachers; live.totals = snap.totals; if (snap.pays) live.pays = snap.pays; } }
  var out = finScope_(live, me, d.subject);
  out.period = pr; out.closed = !!row; out.closed_at = row ? row.closed_at : '';
  out.subjects = subjectsOf_(me); out.admin = isAdmin_(me); out.categories = EXPENSE_CATS;
  out.payouts = read_('Payouts').filter(function (x) { return x.period === pr && (isAdmin_(me) || x.user_id === me.user_id); }).map(function (x) {
    return { payout_id: x.payout_id, user_id: x.user_id, subject: x.subject || '', amount: Number(x.amount) || 0, share: Number(x.share) || 0, held: Number(x.held) || 0, status: x.status, paid_at: x.paid_at, note: x.note, has_slip: !!x.slip_file_id };
  });
  out.pending_close = !row && periodEnded_(pr) && live.expenses.some(function (x) { return x.status === 'pending'; });
  out.profiles = {};
  (out.pays || []).forEach(function (x) { if (out.profiles[x.user_id]) return; var t = profileOf_(x.user_id) || {}; out.profiles[x.user_id] = { name: t.display_name || x.name, photo: t.photo_url || '', bank_name: isAdmin_(me) || x.user_id === me.user_id ? t.bank_name || '' : '', account_name: isAdmin_(me) || x.user_id === me.user_id ? t.account_name || '' : '', account_no: isAdmin_(me) || x.user_id === me.user_id ? t.account_no || '' : '' }; });
  out.label = periodLabel_(pr);
  return out;
}
function finExpenseSave_(d, p, me) {
  var date = String(d.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw err_('BAD_INPUT', 'เลือกวันที่');
  var subject = String(d.subject || '');
  if (subject && !APP.SUBJECTS[subject]) throw err_('BAD_INPUT', 'เลือกวิชา');
  if (!isAdmin_(me) && !canSubject_(me, subject)) throw err_('FORBIDDEN', 'บันทึกรายจ่ายได้เฉพาะวิชาที่คุณดูแล');
  var amount = r2_(d.amount);
  if (!(amount > 0)) throw err_('BAD_INPUT', 'ใส่ยอดเงินมากกว่า 0');
  if (isClosed_(periodOf_(date + 'T12:00:00+07:00'))) throw err_('LOCKED', 'งวดนี้ปิดแล้ว ลงรายจ่ายในเดือนถัดไปแทน');
  var patch = { date: date, subject: subject, category: EXPENSE_CATS.indexOf(d.category) >= 0 ? d.category : 'อื่นๆ', amount: String(amount), note: clip_(d.note, 300) };
  if (d.receipt && d.receipt.base64) {
    if (!/^image\/(jpeg|png|webp)$|^application\/pdf$/.test(d.receipt.mime || '')) throw err_('BAD_INPUT', 'ใบเสร็จต้องเป็นรูปหรือ PDF');
    if (d.receipt.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err_('BAD_INPUT', 'ไฟล์ใบเสร็จใหญ่เกิน 3 MB');
    var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('SLIP_FOLDER_ID'));
    patch.receipt_file_id = folder.createFile(Utilities.newBlob(Utilities.base64Decode(d.receipt.base64), d.receipt.mime, 'receipt_' + id_())).getId();
  }
  var id = withLock_(function () {
    if (d.expense_id) {
      var x = findOne_('Expenses', function (r) { return r.expense_id === d.expense_id; });
      if (!x) throw err_('NOT_FOUND', 'ไม่พบรายการนี้');
      if (isClosed_(periodOf_(x.date + 'T12:00:00+07:00'))) throw err_('LOCKED', 'รายการนี้อยู่ในงวดที่ปิดแล้ว แก้ไม่ได้');
      if (!isAdmin_(me) && (x.created_by !== me.user_id || x.status !== 'pending')) throw err_('FORBIDDEN', 'แก้ได้เฉพาะรายการของคุณที่ยังรอแอดมินอนุมัติ');
      update_('Expenses', x._row, patch); log_(me, 'expense.edit', x.expense_id + ' ฿' + amount); return x.expense_id;
    }
    patch.expense_id = 'X' + id_().slice(-8); patch.status = isAdmin_(me) ? 'approved' : 'pending'; patch.created_by = me.user_id; patch.created_at = now_();
    if (isAdmin_(me)) { patch.decided_by = me.user_id; patch.decided_at = now_(); }
    append_('Expenses', patch); log_(me, 'expense.create', patch.expense_id + ' ' + (subject || 'ส่วนกลาง') + ' ฿' + amount); return patch.expense_id;
  });
  return { expense_id: id };
}
function finExpenseDecide_(d, p, me) {
  var st = d.decision === 'approve' ? 'approved' : d.decision === 'reject' ? 'rejected' : '';
  if (!st) throw err_('BAD_INPUT', 'เลือกอนุมัติหรือไม่อนุมัติ');
  withLock_(function () {
    var x = findOne_('Expenses', function (r) { return r.expense_id === d.expense_id; });
    if (!x) throw err_('NOT_FOUND', 'ไม่พบรายการนี้');
    if (isClosed_(periodOf_(x.date + 'T12:00:00+07:00'))) throw err_('LOCKED', 'งวดนี้ปิดแล้ว');
    update_('Expenses', x._row, { status: st, decided_by: me.user_id, decided_at: now_() }); log_(me, 'expense.' + st, x.expense_id);
  });
  return true;
}
function finExpenseDelete_(d, p, me) {
  withLock_(function () {
    var x = findOne_('Expenses', function (r) { return r.expense_id === d.expense_id; });
    if (!x) throw err_('NOT_FOUND', 'ไม่พบรายการนี้');
    if (isClosed_(periodOf_(x.date + 'T12:00:00+07:00'))) throw err_('LOCKED', 'งวดนี้ปิดแล้ว ลบไม่ได้');
    if (!isAdmin_(me) && (x.created_by !== me.user_id || x.status !== 'pending')) throw err_('FORBIDDEN', 'ลบได้เฉพาะรายการของคุณที่ยังรออนุมัติ');
    deleteRows_('Expenses', [x]); log_(me, 'expense.delete', x.expense_id + ' ฿' + x.amount);
  });
  return true;
}
function finReceipt_(d, p, me) {
  var x = findOne_('Expenses', function (r) { return r.expense_id === d.expense_id; });
  if (!x || !x.receipt_file_id) throw err_('NOT_FOUND', 'ไม่มีใบเสร็จ');
  if (!isAdmin_(me) && !canSubject_(me, x.subject)) throw err_('FORBIDDEN', 'ไม่มีสิทธิ์ดูรายการนี้');
  return photoOut_(x.receipt_file_id);
}
function finRules_() {
  var teachers = teachersAll_(), users = read_('Users');
  return {
    platform_pct: platformPct_(),
    teachers: teachers.map(function (t) { return { user_id: t.user_id, name: (t.nickname ? t.nickname + ' · ' : '') + t.first_name + ' ' + t.last_name, subjects: csv_(t.subjects) }; }),
    owners: users.filter(isStaff_).map(function (t) { return { user_id: t.user_id, name: (t.nickname ? t.nickname + ' · ' : '') + t.first_name + ' ' + t.last_name, role: t.role }; }),
    courses: read_('Courses').sort(bySort_).map(function (c) {
      var sp = splitOf_(c, teachers);
      return { course_id: c.course_id, title: c.title, subject: c.subject, custom: sp.custom, split: (jsonParse_(c.teacher_split, []) || []),
        effective: sp.parts.map(function (x) { return { user_id: x.user_id, pct: r2_(x.w * 100) }; }) };
    })
  };
}
function finRulesSave_(d, p, me) {
  withLock_(function () {
    if (d.platform_pct) {
      var o = {}; Object.keys(APP.SUBJECTS).forEach(function (k) { var v = Number(d.platform_pct[k]); if (!(v >= 0 && v <= 100)) throw err_('BAD_INPUT', 'ส่วนแบ่งต้องอยู่ระหว่าง 0–100%'); o[k] = v; });
      setSetting_('platform_pct', JSON.stringify(o)); log_(me, 'finance.pct', JSON.stringify(o));
    }
    (d.splits || []).forEach(function (sp) {
      var c = findOne_('Courses', function (r) { return r.course_id === sp.course_id; }); if (!c) return;
      var parts = (sp.split || []).map(function (x) { return { user_id: String(x.user_id), pct: r2_(x.pct) }; }).filter(function (x) { return x.pct > 0; });
      var tot = parts.reduce(function (a, x) { return a + x.pct; }, 0);
      if (parts.length && Math.abs(tot - 100) > 0.01) throw err_('BAD_INPUT', 'สัดส่วนของ ' + c.title + ' รวมกันต้องได้ 100%');
      update_('Courses', c._row, { teacher_split: parts.length ? JSON.stringify(parts) : '' }); log_(me, 'finance.split', c.course_id + ' ' + JSON.stringify(parts));
    });
  });
  cache_().remove('settings');
  return finRules_();
}
function finClose_(d, p, me) {
  var pr = checkPeriod_(d.period);
  if (pr > periodOf_(now_())) throw err_('BAD_INPUT', 'ปิดงวดล่วงหน้าไม่ได้');
  var r = finCompute_(pr);
  if (r.expenses.some(function (x) { return x.status === 'pending'; })) throw err_('BAD_INPUT', 'ยังมีรายจ่ายรออนุมัติในงวดนี้ อนุมัติหรือไม่อนุมัติก่อนปิดงวด');
  closePeriod_(pr, r, me.user_id);
  log_(me, 'finance.close', pr + ' รายรับ ฿' + r.totals.income);
  return finSummary_({ period: pr }, p, me);
}
/** ปิดงวด: ล็อกตัวเลข และสร้างรายการโอนแยกวิชา × ผู้สอน (ปิดเองอัตโนมัติเมื่อครบงวด หรือแอดมินกดปิด) */
function closePeriod_(pr, r, by) {
  withLock_(function () {
    if (isClosed_(pr)) return;
    append_('Periods', { period: pr, closed_at: now_(), closed_by: by, snapshot: JSON.stringify({ by_subject: r.by_subject, teachers: r.teachers, pays: r.pays, totals: r.totals }) });
    (r.pays || []).forEach(function (t) {
      append_('Payouts', { payout_id: 'PO' + id_().slice(-8), period: pr, user_id: t.user_id, subject: t.subject, subjects: t.subject, share: t.share, held: t.held, amount: t.settle,
        status: t.settle === 0 ? 'paid' : 'pending', paid_at: t.settle === 0 ? now_() : '', paid_by: '', note: '', created_at: now_() });
    });
  });
}
/** สำหรับ trigger รายวันใน Apps Script: ปิดงวดที่ครบกำหนดแล้วให้อัตโนมัติ */
function autoCloseFinance() {
  var pr = periodOf_(now_()), prev = pr.slice(-1) === '2' ? pr.slice(0, 8) + '1' : (function () { var y = +pr.slice(0, 4), m = +pr.slice(5, 7) - 1; if (m < 1) { m = 12; y--; } return y + '-' + ('0' + m).slice(-2) + '-2'; })();
  if (isClosed_(prev)) return;
  var r = finCompute_(prev);
  if (!r.expenses.some(function (x) { return x.status === 'pending'; })) closePeriod_(prev, r, 'auto');
}
function periodLabel_(pr) {
  var M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var y = +pr.slice(0, 4), m = +pr.slice(5, 7), yy = String(y + 543).slice(-2);
  if (pr.length === 7) return 'ทั้งเดือน ' + M[m - 1] + ' ' + yy;
  var last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return pr.slice(-1) === '1' ? '1–15 ' + M[m - 1] + ' ' + yy : '16–' + last + ' ' + M[m - 1] + ' ' + yy;
}
function finReopen_(d, p, me) {
  var pr = checkPeriod_(d.period);
  withLock_(function () {
    var row = periodRow_(pr); if (!row) throw err_('NOT_FOUND', 'เดือนนี้ยังไม่ได้ปิดงวด');
    var pays = read_('Payouts').filter(function (x) { return x.period === pr; });
    if (pays.some(function (x) { return x.status === 'paid' && Number(x.amount) !== 0; })) throw err_('LOCKED', 'มีการจ่ายเงินผู้สอนของเดือนนี้แล้ว เปิดงวดใหม่ไม่ได้ ลงรายการปรับปรุงในเดือนถัดไปแทน');
    deleteRows_('Payouts', pays); deleteRows_('Periods', [row]); log_(me, 'finance.reopen', pr);
  });
  return finSummary_({ period: pr }, p, me);
}
function finPayoutPay_(d, p, me) {
  if (!d.slip || !d.slip.base64) throw err_('BAD_INPUT', 'แนบสลิปการโอนด้วย');
  if (!/^image\/(jpeg|png|webp)$|^application\/pdf$/.test(d.slip.mime || '')) throw err_('BAD_INPUT', 'สลิปต้องเป็นรูปหรือ PDF');
  if (d.slip.base64.length * 0.75 > APP.SLIP_MAX_BYTES) throw err_('BAD_INPUT', 'ไฟล์สลิปใหญ่เกิน 3 MB');
  var x0 = findOne_('Payouts', function (r) { return r.payout_id === d.payout_id; });
  if (!x0) throw err_('NOT_FOUND', 'ไม่พบรายการ');
  if (x0.status === 'paid' && x0.slip_file_id) throw err_('ALREADY', 'รายการนี้แนบสลิปแล้ว');
  var t = profileOf_(x0.user_id) || {};
  var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('SLIP_FOLDER_ID'));
  var blob = Utilities.newBlob(Utilities.base64Decode(d.slip.base64), d.slip.mime, 'payout_' + x0.payout_id + (d.slip.mime === 'application/pdf' ? '.pdf' : '.jpg'));
  var fid = folder.createFile(blob).getId();
  var paidAt = d.paid_at && !isNaN(new Date(d.paid_at)) ? new Date(d.paid_at).toISOString() : now_();
  withLock_(function () {
    var x = findOne_('Payouts', function (r) { return r.payout_id === d.payout_id; });
    update_('Payouts', x._row, { status: 'paid', paid_at: paidAt, paid_by: me.user_id, note: clip_(d.note, 300), slip_file_id: fid,
      account: [t.bank_name, t.account_no, t.account_name].filter(String).join(' · ') });
    log_(me, 'finance.paid', x.payout_id + ' ' + (x.subject || '') + ' ฿' + x.amount);
  });
  try { sendPayoutEmail_(x0, t, paidAt, d.note, blob); } catch (e) {}
  return true;
}
function sendPayoutEmail_(x, t, paidAt, note, blob) {
  var u = findOne_('Users', function (r) { return r.user_id === x.user_id; });
  if (!u || !u.email || MailApp.getRemainingDailyQuota() < 1) return;
  var sub = APP.SUBJECTS[x.subject] || x.subject || '', amt = '฿' + Number(x.amount).toLocaleString('en-US', { maximumFractionDigits: 2 });
  var rows = [['งวด', periodLabel_(x.period)], ['วิชา', sub], ['ส่วนแบ่ง', '฿' + Number(x.share).toLocaleString('en-US')], ['หักเงินที่เข้าบัญชีคุณโดยตรง', '฿' + Number(x.held).toLocaleString('en-US')], ['ยอดที่โอน', amt],
    ['โอนเข้า', [t.bank_name, t.account_no, t.account_name].filter(String).join(' · ') || '—'], ['เวลาโอน', (function (x) { return +x.slice(8, 10) + '/' + +x.slice(5, 7) + '/' + (+x.slice(0, 4) + 543) + ' ' + x.slice(11, 16); })(new Date(new Date(paidAt).getTime() + 7 * 36e5).toISOString())]].concat(note ? [['หมายเหตุ', note]] : []);
  var inner = '<tr><td style="padding:0 32px 8px;"><p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#525252;">สวัสดี ' + esc_(t.display_name || u.nickname || '') + '<br>INeedBio โอนส่วนแบ่งวิชา' + esc_(sub) + ' งวด ' + esc_(periodLabel_(x.period)) + ' ให้แล้ว แนบสลิปมากับอีเมลนี้</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">' + rows.map(function (r) { return '<tr><td style="padding:7px 0;color:#8a8a8a;border-bottom:1px solid #efefed;">' + esc_(r[0]) + '</td><td align="right" style="padding:7px 0;color:#0c0c0c;border-bottom:1px solid #efefed;">' + esc_(r[1]) + '</td></tr>'; }).join('') + '</table></td></tr>' +
    '<tr><td style="padding:14px 32px 26px;font-size:13px;color:#8a8a8a;">ดูรายละเอียดและสลิปย้อนหลังได้ที่หลังบ้าน เมนู "ส่วนแบ่งของฉัน"</td></tr>';
  MailApp.sendEmail({ to: u.email, name: APP.NAME, subject: 'โอนส่วนแบ่งแล้ว ' + amt + ' · ' + sub + ' ' + periodLabel_(x.period),
    body: rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n'), htmlBody: mailShell_('โอนส่วนแบ่งแล้ว', inner), attachments: [blob] });
}
function finPayoutSlip_(d, p, me) {
  var x = findOne_('Payouts', function (r) { return r.payout_id === d.payout_id; });
  if (!x || !x.slip_file_id) throw err_('NOT_FOUND', 'ไม่มีสลิป');
  if (!isAdmin_(me) && x.user_id !== me.user_id) throw err_('FORBIDDEN', 'ดูได้เฉพาะสลิปของคุณ');
  return photoOut_(x.slip_file_id);
}
function finPayoutsMine_(d, p, me) {
  return read_('Payouts').filter(function (x) { return x.user_id === me.user_id; }).sort(function (a, b) { return a.period < b.period ? 1 : -1; }).slice(0, 48).map(function (x) {
    return { payout_id: x.payout_id, period: x.period, label: periodLabel_(x.period), subject: x.subject || x.subjects || '', share: Number(x.share) || 0, held: Number(x.held) || 0, amount: Number(x.amount) || 0, status: x.status, paid_at: x.paid_at, has_slip: !!x.slip_file_id };
  });
}
function finSplits_() {
  var courses = read_('Courses').sort(bySort_).map(function (c) { return { course_id: c.course_id, title: c.title, subject: c.subject, status: c.status }; });
  return { splits: subjectSplits_(), courses: courses, people: read_('Users').filter(isStaff_).map(function (u) { var t = profileOf_(u.user_id) || {}; return { user_id: u.user_id, name: t.display_name || u.nickname || u.first_name, full: u.first_name + ' ' + u.last_name, role: u.role, roles: rolesOf_(u), subjects: teachSubjects_(u), photo: t.photo_url || '' }; }) };
}
/** บันทึกส่วนแบ่งของวิชา มีวันเริ่มมีผล
 *  แบบใหม่ (ติ๊กแยกคอร์ส): { subject, from, others:[{label,pct}], courses:{ cid:[{user_id,pct}] } } — แต่ละคอร์สที่มีผู้สอน: ผู้สอน + ส่วนอื่น = 100%
 *  แบบเก่า: { subject, from, parts:[{user_id,pct}] } ใช้กับทุกคอร์สของวิชา */
function finSplitsSave_(d, p, me) {
  var sj = String(d.subject || ''); if (!APP.SUBJECTS[sj]) throw err_('BAD_INPUT', 'เลือกวิชา');
  var from = String(d.from || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw err_('BAD_INPUT', 'เลือกวันเริ่มมีผล');
  var staff = read_('Users').filter(isStaff_).map(function (u) { return u.user_id; });
  var firstOpen = periodOf_(from + 'T12:00:00+07:00');
  if (isClosed_(firstOpen)) throw err_('LOCKED', 'งวดของวันที่เลือกปิดไปแล้ว เลือกวันเริ่มมีผลในงวดที่ยังไม่ปิด');
  var ver = null;
  if (!d.remove) {
    if (d.courses || d.others) ver = checkVersion_(sj, from, d.others, d.courses, staff);
    else {
      var parts = (d.parts || []).map(function (x) { return { user_id: String(x.user_id), pct: r2_(x.pct) }; }).filter(function (x) { return x.pct > 0 && staff.indexOf(x.user_id) >= 0; });
      var tot = parts.reduce(function (a, x) { return a + x.pct; }, 0);
      if (parts.length && Math.abs(tot - 100) > 0.01) throw err_('BAD_INPUT', 'สัดส่วนรวมกันต้องได้ 100% (ตอนนี้ ' + r2_(tot) + '%)');
      ver = { from: from, parts: parts };
    }
  }
  withLock_(function () {
    var o = subjectSplits_(); o[sj] = (o[sj] || []).filter(function (v) { return v.from !== from; });
    if (ver) o[sj].push(ver);
    setSetting_('subject_splits', JSON.stringify(o)); log_(me, 'finance.split', sj + ' ' + from + ' ' + JSON.stringify(ver));
  });
  cache_().remove('settings');
  return finSplits_();
}
function checkVersion_(sj, from, others, courses, staff) {
  var oth = [], seen = {};
  (others || []).forEach(function (x) {
    var label = String(x.label || '').trim().slice(0, 40), pct = r2_(x.pct);
    if (!(pct > 0)) return;
    if (!label) throw err_('BAD_INPUT', 'ตั้งชื่อส่วนที่ไม่ใช่ผู้สอนด้วย เช่น ค่าหลังบ้าน');
    if (seen[label]) throw err_('BAD_INPUT', 'ชื่อส่วน "' + label + '" ซ้ำ'); seen[label] = 1;
    oth.push({ label: label, pct: pct });
  });
  var ot = oth.reduce(function (a, x) { return a + x.pct; }, 0);
  if (ot >= 100) throw err_('BAD_INPUT', 'ส่วนที่ไม่ใช่ผู้สอนรวมกันต้องน้อยกว่า 100%');
  var ids = read_('Courses').filter(function (c) { return c.subject === sj; }).map(function (c) { return c.course_id; }), map = {};
  Object.keys(courses || {}).forEach(function (cid) {
    if (ids.indexOf(cid) < 0) return;
    var L = (courses[cid] || []).map(function (x) { return { user_id: String(x.user_id), pct: r2_(x.pct) }; }).filter(function (x) { return x.pct > 0; });
    if (!L.length) return;
    L.forEach(function (x) { if (staff.indexOf(x.user_id) < 0) throw err_('BAD_INPUT', 'ผู้รับส่วนแบ่งต้องมียศผู้สอน ถ้าไม่ใช่ผู้สอนให้ใส่เป็นส่วนอื่น'); });
    var t = L.reduce(function (a, x) { return a + x.pct; }, 0) + ot;
    if (Math.abs(t - 100) > 0.05) { var c = findOne_('Courses', function (r) { return r.course_id === cid; }); throw err_('BAD_INPUT', 'สัดส่วนของ ' + (c ? c.title : cid) + ' รวมกันต้องได้ 100% (ตอนนี้ ' + r2_(t) + '%)'); }
    map[cid] = L;
  });
  return { from: from, others: oth, courses: map };
}

// ───────────────────────── โปรไฟล์ผู้สอน ─────────────────────────
/** โปรไฟล์ของผู้สอน/แอดมิน: ถ้ายังไม่มี สร้างจากข้อมูลตอนสมัคร (ชื่อเล่น ชื่อจริง) และรูปผู้สอนเดิมในคอร์สที่ชื่อตรงกัน */
function profileOf_(uid) {
  var t = findOne_('TeacherProfiles', function (r) { return r.user_id === uid; });
  if (t) return t;
  var u = findOne_('Users', function (r) { return r.user_id === uid; });
  if (!u || !isStaff_(u)) return null;
  var nick = String(u.nickname || '').trim(), dn = nick ? (/^พี่/.test(nick) ? nick : 'พี่' + nick) : (u.first_name || '');
  var c = read_('Courses').filter(function (x) { return nick && [x.instructor_name, x.instructor2_name].some(function (n) { return n && String(n).replace(/^พี่\s*/, '') === nick.replace(/^พี่\s*/, ''); }); })[0];
  var two = c && String(c.instructor2_name || '').replace(/^พี่\s*/, '') === nick.replace(/^พี่\s*/, '');
  return { user_id: uid, display_name: dn, title: (c && (two ? c.instructor2_title : c.instructor_title)) || ((u.first_name || '') + ' ' + (u.last_name || '')).trim(),
    bio: JSON.stringify(c ? lines_(two ? c.instructor2_bio : c.instructor_bio, 20, 200) : []), photo_url: (c && (two ? c.instructor2_photo : c.instructor_photo)) || '',
    bank_name: '', account_name: '', account_no: '', updated_at: '', _auto: true };
}
function teacherProfile_(d, p, me) {
  var uid = isAdmin_(me) && d.user_id ? String(d.user_id) : me.user_id;
  var t = profileOf_(uid); if (!t) throw err_('NOT_FOUND', 'ผู้ใช้นี้ไม่ได้มียศผู้สอน');
  var u = findOne_('Users', function (r) { return r.user_id === uid; }) || {};
  var courses = read_('Courses').filter(function (c) { return csv_(c.teacher_ids).indexOf(uid) >= 0; }).map(function (c) { return { course_id: c.course_id, title: c.title }; });
  return { user_id: uid, display_name: t.display_name, title: t.title, bio: jsonParse_(t.bio, []) || [], photo_url: t.photo_url || '', bank_name: t.bank_name || '', account_name: t.account_name || '', account_no: t.account_no || '',
    full_name: (u.first_name || '') + ' ' + (u.last_name || ''), nickname: u.nickname || '', role: u.role, roles: rolesOf_(u), subjects: teachSubjects_(u), courses: courses, auto: !!t._auto };
}
function teacherProfileSave_(d, p, me) {
  var uid = isAdmin_(me) && d.user_id ? String(d.user_id) : me.user_id;
  var u = findOne_('Users', function (r) { return r.user_id === uid; });
  if (!u || !isStaff_(u)) throw err_('NOT_FOUND', 'ผู้ใช้นี้ไม่ได้มียศผู้สอน');
  var photo = clip_(d.photo_url, 500);
  if (photo && !/^https:\/\//.test(photo)) throw err_('BAD_INPUT', 'อัปโหลดรูปใหม่อีกครั้ง');
  var bio = (Array.isArray(d.bio) ? d.bio : []).map(function (x) { return String(x || '').trim().slice(0, 200); }).filter(String).slice(0, 20);
  var acct = String(d.account_no || '').replace(/[^\d-]/g, '').slice(0, 24);
  var patch = { display_name: req_(d.display_name, 'ชื่อที่แสดง', 60), title: clip_(d.title, 160), bio: JSON.stringify(bio), photo_url: photo,
    bank_name: clip_(d.bank_name, 60), account_name: clip_(d.account_name, 120), account_no: acct, updated_at: now_() };
  withLock_(function () {
    ensureCols_('TeacherProfiles');
    var t = findOne_('TeacherProfiles', function (r) { return r.user_id === uid; });
    if (t) update_('TeacherProfiles', t._row, patch); else append_('TeacherProfiles', Object.assign({ user_id: uid }, patch));
    log_(me, 'teacher.profile', uid);
  });
  cache_().remove('pub_courses'); cache_().remove('pub_bundles');
  return teacherProfile_({ user_id: uid }, p, me);
}
// ───────────────────────── ทีมผู้สอน ─────────────────────────
/** เวอร์ชันส่วนแบ่งที่ใช้อยู่ ณ วันที่ ในรูปแบบใหม่ (ติ๊กแยกคอร์ส) · แปลงจากแบบเก่าให้เอง */
function versionAt_(sj, asOf) {
  var day = asOf || new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  var vs = (subjectSplits_()[sj] || []).filter(function (v) { return v.from <= day; }), v = vs[vs.length - 1];
  var cs = read_('Courses').filter(function (c) { return c.subject === sj; });
  if (v && v.courses) return { others: (v.others || []).slice(), courses: JSON.parse(JSON.stringify(v.courses)) };
  var oth = [], tch;
  if (v && (v.parts || []).length) { oth = v.parts.filter(function (x) { return x.kind === 'other'; }).map(function (x) { return { label: x.label, pct: Number(x.pct) }; }); tch = v.parts.filter(function (x) { return x.kind !== 'other'; }).map(function (x) { return { user_id: x.user_id, pct: Number(x.pct) }; }); }
  else { var ts = read_('Users').filter(function (u) { return teachSubjects_(u).indexOf(sj) >= 0; }); tch = ts.map(function (u) { return { user_id: u.user_id, pct: 100 / ts.length }; }); }
  var map = {}; if (tch.length) cs.forEach(function (c) { map[c.course_id] = tch.map(function (x) { return { user_id: x.user_id, pct: x.pct }; }); });
  return { others: oth, courses: map };
}
function roundCourse_(L, target) {
  L.forEach(function (x) { x.pct = r2_(x.pct); });
  var tot = L.reduce(function (a, x) { return a + x.pct; }, 0);
  if (L.length) L[L.length - 1].pct = r2_(L[L.length - 1].pct + target - tot);
  return L;
}
function saveVersion_(sj, from, ver, me) {
  var o = subjectSplits_(); o[sj] = (o[sj] || []).filter(function (v) { return v.from !== from; }); o[sj].push({ from: from, others: ver.others, courses: ver.courses });
  setSetting_('subject_splits', JSON.stringify(o)); log_(me, 'finance.split', sj + ' ' + from + ' ' + JSON.stringify(ver));
  cache_().remove('settings');
}
function teamFrom_(d) {
  var from = String(d.from || new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10)).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw err_('BAD_INPUT', 'เลือกวันเริ่มมีผล');
  if (isClosed_(periodOf_(from + 'T12:00:00+07:00'))) throw err_('LOCKED', 'งวดของวันที่เลือกปิดไปแล้ว');
  return from;
}
/** เพิ่มผู้สอนเข้าวิชา: เพิ่มยศผู้สอน (ยศเดิมยังอยู่) เพิ่มวิชา แล้วส่งอีเมลให้เข้ามากรอกโปรไฟล์
 *  course_ids (ไม่บังคับ) = ติ๊กคอร์สที่ได้ส่วนแบ่ง: ผู้สอนในคอร์สนั้นแบ่งส่วนของผู้สอนเท่ากันใหม่ */
function adminTeamAdd_(d, p, me) {
  var sj = String(d.subject || ''); if (!APP.SUBJECTS[sj]) throw err_('BAD_INPUT', 'เลือกวิชา');
  var from = teamFrom_(d), key = String(d.user || d.email || d.user_id || '').trim().toLowerCase();
  var u = findOne_('Users', function (r) { return r.user_id === d.user_id || (key && String(r.email).toLowerCase() === key); });
  if (!u) throw err_('NOT_FOUND', 'ไม่พบผู้ใช้นี้ ให้ผู้สอนสมัครสมาชิกก่อน');
  if (u.status === 'banned') throw err_('BAD_INPUT', 'บัญชีนี้ถูกระงับ');
  var ver = null, fresh = !isTeacher_(u);
  withLock_(function () {
    ensureCols_('Users');
    var subs = teachSubjects_(u);
    if (subs.indexOf(sj) >= 0 && !(d.course_ids || []).length) throw err_('ALREADY', 'เป็นผู้สอนวิชานี้อยู่แล้ว');
    if (subs.indexOf(sj) < 0) {
      subs.push(sj);
      update_('Users', u._row, Object.assign(rolePatch_(rolesOf_(u).concat(['teacher'])), { subjects: subs.join(',') }));
      if (!isStaff_(u)) killSessions_(u.user_id);
    }
    var ids = (d.course_ids || []).map(String);
    if (ids.length) {
      ver = versionAt_(sj, from);
      var T = 100 - ver.others.reduce(function (a, x) { return a + x.pct; }, 0);
      read_('Courses').filter(function (c) { return c.subject === sj && ids.indexOf(c.course_id) >= 0; }).forEach(function (c) {
        var L = (ver.courses[c.course_id] || []).filter(function (x) { return x.user_id !== u.user_id; }); L.push({ user_id: u.user_id, pct: 0 });
        L.forEach(function (x) { x.pct = T / L.length; }); ver.courses[c.course_id] = roundCourse_(L, T);
      });
    }
    log_(me, 'team.add', u.email + ' ' + sj);
  });
  if (ver) saveVersion_(sj, from, ver, me);
  var out = { from: from };
  if (fresh) out.invite = inviteTeacher_(u.user_id, me);
  return out;
}
/** นำผู้สอนออกจากวิชา: ถอดวิชา (ไม่เหลือวิชา = ถอดยศผู้สอน ยศอื่นยังอยู่) เอาออกจากคอร์สของวิชานั้น
 *  แล้วส่วนของเขาในแต่ละคอร์สแบ่งให้ผู้สอนที่เหลือของคอร์สนั้นตามสัดส่วน */
function adminTeamRemove_(d, p, me) {
  var sj = String(d.subject || ''); if (!APP.SUBJECTS[sj]) throw err_('BAD_INPUT', 'เลือกวิชา');
  var from = teamFrom_(d);
  var u = findOne_('Users', function (r) { return r.user_id === d.user_id; });
  if (!u) throw err_('NOT_FOUND', 'ไม่พบผู้ใช้');
  var ver;
  withLock_(function () {
    ensureCols_('Users');
    ver = versionAt_(sj, from);
    Object.keys(ver.courses).forEach(function (cid) {
      var L = ver.courses[cid], me0 = L.filter(function (x) { return x.user_id === u.user_id; })[0]; if (!me0) return;
      var rest = L.filter(function (x) { return x.user_id !== u.user_id; }), T = rest.reduce(function (a, x) { return a + x.pct; }, 0) + me0.pct, rt = T - me0.pct;
      rest.forEach(function (x) { x.pct = rt > 0 ? x.pct / rt * T : T / rest.length; });
      if (rest.length) ver.courses[cid] = roundCourse_(rest, T); else delete ver.courses[cid];
    });
    if (isTeacher_(u)) {
      var subs = teachSubjects_(u).filter(function (s) { return s !== sj; });
      if (subs.length) update_('Users', u._row, { subjects: subs.join(',') });
      else { update_('Users', u._row, Object.assign(rolePatch_(rolesOf_(u).filter(function (k) { return k !== 'teacher'; })), { subjects: '' })); if (!isAdmin_(u)) killSessions_(u.user_id); }
    }
    read_('Courses').forEach(function (c) { if (c.subject === sj && csv_(c.teacher_ids).indexOf(u.user_id) >= 0) update_('Courses', c._row, { teacher_ids: csv_(c.teacher_ids).filter(function (x) { return x !== u.user_id; }).join(',') }); });
    log_(me, 'team.remove', u.email + ' ' + sj);
  });
  saveVersion_(sj, from, ver, me);
  cache_().remove('pub_courses'); cache_().remove('pub_bundles');
  return { from: from };
}
/** สิ่งที่ผู้สอนยังต้องกรอก (บังคับกรอกก่อนใช้หลังบ้าน) */
function profileTodo_(u) {
  if (!isTeacher_(u)) return [];
  var t = findOne_('TeacherProfiles', function (r) { return r.user_id === u.user_id; }) || {};
  var out = [];
  if (!t.display_name) out.push('name');
  if (!t.photo_url) out.push('photo');
  if (!t.account_no || !t.account_name || !t.bank_name) out.push('bank');
  return out;
}
var TODO_LABEL = { name: 'ชื่อที่แสดงบนหน้าคอร์ส', photo: 'รูปโปรไฟล์', bank: 'บัญชีรับส่วนแบ่ง (ชื่อบัญชี ธนาคาร เลขที่บัญชี)' };
/** อีเมลเชิญผู้สอนให้เข้ามากรอกโปรไฟล์: บอกวิชาที่สอน สิ่งที่ยังขาด และปุ่มไปหน้ากรอก */
function teacherInviteMail_(u) {
  var site = getSetting_('site_url') || 'https://www.ineedbio.shop', link = site + '/#/admin/tprofile';
  var subs = teachSubjects_(u).map(function (k) { return APP.SUBJECTS[k]; }).join(', ') || '-';
  var todo = profileTodo_(u); if (!todo.length && !isTeacher_(u)) todo = ['name', 'photo', 'bank'];
  var name = u.nickname || u.first_name || '';
  var P = function (t) { return '<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#525252;">' + t + '</p>'; };
  var inner = '<tr><td style="padding:0 32px 26px;">' +
    P('สวัสดี ' + esc_(name) + '<br>คุณได้รับบทบาท <b style="color:#0c0c0c;">ผู้สอนวิชา' + esc_(subs) + '</b> บน INeedBio แล้ว') +
    P('ก่อนเริ่มใช้หลังบ้าน กรุณากรอกโปรไฟล์ผู้สอนให้ครบ รูปและประวัติจะขึ้นในหน้ารายละเอียดของทุกคอร์สที่คุณสอน และบัญชีใช้สำหรับโอนส่วนแบ่งทุกวันที่ 1 และ 16') +
    (todo.length ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background:#fafaf9;border:1px solid #efefed;border-radius:12px;"><tr><td style="padding:14px 18px;font-size:14px;line-height:1.9;color:#0c0c0c;"><b>ยังขาด</b><br>' +
      todo.map(function (k) { return '• ' + esc_(TODO_LABEL[k] || k); }).join('<br>') + '</td></tr></table>' : '') +
    '<p style="margin:0 0 16px;"><a href="' + esc_(link) + '" style="display:inline-block;background:#0c0c0c;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:600;">กรอกโปรไฟล์ผู้สอน</a></p>' +
    '<p style="margin:0;font-size:13px;line-height:1.7;color:#8a8a8a;">เข้าสู่ระบบด้วยอีเมล ' + esc_(u.email) + ' ระบบจะพาไปหน้าโปรไฟล์ให้เอง</p></td></tr>';
  return { to: u.email, subject: 'ยินดีต้อนรับผู้สอนวิชา' + subs + ' · กรอกโปรไฟล์ให้ครบก่อนเริ่ม',
    body: 'สวัสดี ' + name + '\nคุณได้รับบทบาทผู้สอนวิชา' + subs + ' บน INeedBio แล้ว\n' + (todo.length ? 'ยังขาด: ' + todo.map(function (k) { return TODO_LABEL[k] || k; }).join(', ') + '\n' : '') + 'กรอกโปรไฟล์ที่ ' + link,
    html: mailShell_('คุณเป็นผู้สอนแล้ว', inner) };
}
/** ส่งอีเมลเชิญ แล้วบันทึกผลไว้ที่ผู้ใช้ (invited_at / invite_error) · ส่งไม่ได้ต้องบอกแอดมิน ไม่เงียบ */
function inviteTeacher_(uid, me) {
  var u = findOne_('Users', function (r) { return r.user_id === uid; });
  if (!u || !u.email) return { ok: false, error: 'ผู้ใช้นี้ไม่มีอีเมล' };
  var m = teacherInviteMail_(u), res;
  try {
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('โควตาส่งอีเมลของวันนี้หมดแล้ว');
    MailApp.sendEmail({ to: m.to, name: APP.NAME, subject: m.subject, body: m.body, htmlBody: m.html });
    res = { ok: true, to: m.to, at: now_() };
  } catch (e) { res = { ok: false, to: m.to, error: String(e && e.message || e).slice(0, 200) }; }
  try { ensureCols_('Users'); var x = findOne_('Users', function (r) { return r.user_id === uid; }); update_('Users', x._row, res.ok ? { invited_at: res.at, invite_error: '' } : { invite_error: res.error }); } catch (e2) {}
  if (me) log_(me, res.ok ? 'teacher.invite' : 'teacher.invite.fail', m.to + (res.ok ? '' : ' ' + res.error));
  return res;
}
/** แอดมิน: ส่งอีเมลเชิญอีกครั้ง / ดูตัวอย่าง (preview:true) / ส่งทุกคนที่ยังกรอกไม่ครบ (all:true) */
function adminTeacherInvite_(d, p, me) {
  if (d.all) {
    var list = read_('Users').filter(function (u) { return isTeacher_(u) && profileTodo_(u).length; });
    return { results: list.map(function (u) { var r = inviteTeacher_(u.user_id, me); r.user_id = u.user_id; return r; }) };
  }
  var u = findOne_('Users', function (r) { return r.user_id === d.user_id; });
  if (!u) throw err_('NOT_FOUND', 'ไม่พบผู้ใช้');
  if (d.preview) { var m = teacherInviteMail_(u); return { to: m.to, subject: m.subject, html: m.html }; }
  if (!isTeacher_(u)) throw err_('BAD_INPUT', 'ผู้ใช้นี้ยังไม่มียศผู้สอน');
  return inviteTeacher_(u.user_id, me);
}
function adminCourseRequest_(d, p, me) {
  var out;
  withLock_(function () {
    var c = findOne_('Courses', function (r) { return r.course_id === d.course_id; });
    if (!c || !c.pending_change) throw err_('NOT_FOUND', 'ไม่มีคำขอของคอร์สนี้');
    var w = jsonParse_(c.pending_change, {}) || {}, patch = { pending_change: '' };
    if (d.decision === 'approve') ['price', 'full_price', 'status'].forEach(function (k) { if (w[k] != null) patch[k] = w[k]; });
    update_('Courses', c._row, patch); log_(me, 'course.request.' + (d.decision === 'approve' ? 'approve' : 'reject'), c.course_id + ' ' + c.pending_change);
    out = true;
  });
  cache_().remove('pub_courses'); cache_().remove('pub_bundles');
  return out;
}
function adminTeachers_() {
  return read_('Users').filter(isStaff_).map(function (u) {
    var t = profileOf_(u.user_id);
    return { user_id: u.user_id, display_name: t.display_name, title: t.title, photo_url: t.photo_url || '', role: u.role, roles: rolesOf_(u), subjects: teachSubjects_(u), has_bank: !!(t.account_no && t.account_name),
      email: u.email, profile_todo: profileTodo_(u), invited_at: u.invited_at || '', invite_error: u.invite_error || '',
      courses: read_('Courses').filter(function (c) { return csv_(c.teacher_ids).indexOf(u.user_id) >= 0; }).length };
  });
}
function finPayoutPaid_(d, p, me) {
  withLock_(function () {
    var x = findOne_('Payouts', function (r) { return r.payout_id === d.payout_id; });
    if (!x) throw err_('NOT_FOUND', 'ไม่พบรายการ');
    update_('Payouts', x._row, { status: 'paid', paid_at: now_(), paid_by: me.user_id, note: clip_(d.note, 300) }); log_(me, 'finance.paid', x.payout_id + ' ฿' + x.amount);
  });
  return true;
}

// ═════════════════════════ นักเรียนรุ่นเก่า (สมัครก่อนมีเว็บ) ═════════════════════════
var NAME_PREFIX = /^(นางสาว|นาย|นาง|น\.ส\.?|ด\.ช\.?|ด\.ญ\.?|เด็กชาย|เด็กหญิง|mr\.?|mrs\.?|ms\.?|miss)\s*/i;
function normName_(s) {
  return String(s || '').normalize('NFC').replace(/[\u200b-\u200d\ufeff]/g, '').replace(/\([^)]*\)?/g, '').trim().replace(NAME_PREFIX, '').replace(/[\s.\-_'’"()]/g, '').toLowerCase();
}
/** ชื่อ+นามสกุลต่อกันโดยไม่สนช่องว่าง (กันกรณีแบ่งชื่อ/นามสกุลคนละตำแหน่ง เช่น นามสกุลหลายคำ) */
function nameKey_(first, last) { return normName_(first) + normName_(String(last || '').replace(NAME_PREFIX, '')); }
function editDist_(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  var prev = [], i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) { var cur = [i]; for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[b.length];
}
function legacyGrant_(uid, rec, by) {
  csv_(rec.course_ids).forEach(function (cid) {
    if (!findOne_('Courses', function (c) { return c.course_id === cid; })) return;
    if (enrollActive_(latestEnroll_(uid, cid))) return;
    append_('Enrollments', { enroll_id: 'E' + id_(), user_id: uid, course_id: cid, status: 'approved', amount: '0', slip_file_id: '', note: 'ย้ายจากระบบเก่า' + (rec.batch ? ' · ' + rec.batch : ''),
      created_at: now_(), decided_by: by, decided_at: now_(), source: 'legacy', reason: rec.batch || '' });
  });
}
/** จับคู่ชื่อ-นามสกุล: ตรงเป๊ะ มีคนเดียว และยังไม่มีใครใช้ → ให้สิทธิ์ทันที · กรณีอื่นเข้าคิวให้แอดมินดู */
function legacyMatchUser_(u, manual) {
  if (!u || u.role !== 'student') return { matched: false };
  return withLock_(function () {
    var key = nameKey_(u.first_name, u.last_name), recs = read_('LegacyStudents').filter(function (r) { return r.status !== 'deleted' && r.norm === key; });
    var claims = read_('LegacyClaims'), hasPending = claims.some(function (c) { return c.user_id === u.user_id && c.status === 'pending'; });
    var queue = function (ids, why) {
      if (hasPending) return { matched: false, queued: true, message: 'ส่งเรื่องให้แอดมินตรวจแล้ว รอไม่เกิน 1–2 วัน' };
      append_('LegacyClaims', { claim_id: 'LC' + id_().slice(-8), user_id: u.user_id, legacy_ids: ids.join(','), reason: why, status: 'pending', created_at: now_() });
      return { matched: false, queued: true, message: 'ส่งเรื่องให้แอดมินตรวจแล้ว รอไม่เกิน 1–2 วัน' };
    };
    var mineAlready = recs.filter(function (r) { return r.user_id === u.user_id; });
    var open = recs.filter(function (r) { return r.status === 'open'; }), taken = recs.filter(function (r) { return r.status === 'claimed' && r.user_id !== u.user_id; });
    var sig = {}, dupe = open.some(function (r) { var k = r.course_ids; if (sig[k]) return true; sig[k] = 1; return false; });
    if (!open.length && mineAlready.length) return { matched: true, already: true, courses: [] };
    // ชื่อเดียวกันอยู่หลายรายชื่อได้ (เช่น ชุดชีวะ + ชุดเคมี) → รับทุกชุดให้เลย · ถ้ามี 2 รายการคอร์สเดียวกัน (อาจเป็นคนละคน) หรือมีคนใช้ชื่อนี้ไปแล้ว → ให้แอดมินดู
    if (open.length && !dupe && !taken.length) {
      var got = [];
      open.forEach(function (r) {
        update_('LegacyStudents', r._row, { status: 'claimed', user_id: u.user_id, claimed_at: now_(), match: manual ? 'auto-manual' : 'auto' });
        legacyGrant_(u.user_id, r, 'SYSTEM'); got = got.concat(csv_(r.course_ids));
      });
      append_('AdminLog', { time: now_(), admin_id: 'SYSTEM', action: 'legacy.auto', detail: u.email + ' ← ' + open.map(function (r) { return r.legacy_id; }).join(',') });
      return { matched: true, courses: got };
    }
    if (open.length && dupe) return queue(open.map(function (r) { return r.legacy_id; }), 'ชื่อ-นามสกุลนี้มีหลายคนในรายชื่อเก่า');
    if (taken.length) return queue(taken.concat(open).map(function (r) { return r.legacy_id; }), 'รายชื่อนี้ถูกบัญชีอื่นใช้ไปแล้ว');
    if (mineAlready.length) return { matched: true, already: true, courses: [] };
    if (!manual) return { matched: false };
    var near = read_('LegacyStudents').filter(function (r) { return r.status === 'open' && editDist_(r.norm, key) <= 2; });
    if (near.length) return queue(near.slice(0, 5).map(function (r) { return r.legacy_id; }), 'ชื่อใกล้เคียง (สะกดต่างกันเล็กน้อย)');
    return { matched: false, message: 'ไม่พบชื่อ-นามสกุลนี้ในรายชื่อนักเรียนรุ่นเก่า ตรวจว่าสะกดตรงกับตอนสมัครครั้งแรก หรือทักแอดมินทาง IG' };
  });
}
function legacyClaim_(d, p) {
  var u = auth_(p);
  rate_('legacy:' + u.user_id, 5, 3600, 'ลองบ่อยเกินไป ลองใหม่ภายหลัง');
  return legacyMatchUser_(u, true);
}
function adminLegacy_(d) {
  var users = read_('Users'), recs = read_('LegacyStudents').filter(function (r) { return r.status !== 'deleted'; }), courses = read_('Courses');
  var uinfo = function (id) { var u = users.filter(function (x) { return x.user_id === id; })[0]; return u ? { user_id: u.user_id, name: u.first_name + ' ' + u.last_name, nickname: u.nickname, email: u.email, has_photo: !!u.photo_file_id, created_at: u.created_at } : null; };
  var ctitle = function (ids) { return csv_(ids).map(function (id) { var c = courses.filter(function (x) { return x.course_id === id; })[0]; return c ? c.title : id; }); };
  var q = normName_(d.q || ''), st = d.status || 'claimed';
  var list = recs.filter(function (r) { return (st === 'all' || r.status === st) && (!q || (r.norm + normName_(r.nickname)).indexOf(q) >= 0); })
    .sort(function (a, b) { return (a.claimed_at || a.created_at) < (b.claimed_at || b.created_at) ? 1 : -1; }).slice(0, 300)
    .map(function (r) { return { legacy_id: r.legacy_id, name: r.first_name + ' ' + r.last_name, nickname: r.nickname, courses: ctitle(r.course_ids), batch: r.batch, status: r.status, match: r.match, claimed_at: r.claimed_at, user: uinfo(r.user_id) }; });
  var claims = read_('LegacyClaims').filter(function (c) { return c.status === 'pending'; }).map(function (c) {
    return { claim_id: c.claim_id, reason: c.reason, created_at: c.created_at, user: uinfo(c.user_id),
      candidates: csv_(c.legacy_ids).map(function (id) { var r = recs.filter(function (x) { return x.legacy_id === id; })[0]; return r ? { legacy_id: r.legacy_id, name: r.first_name + ' ' + r.last_name, nickname: r.nickname, batch: r.batch, courses: ctitle(r.course_ids), status: r.status, user: uinfo(r.user_id) } : null; }).filter(Boolean) };
  });
  var batches = {}; recs.forEach(function (r) { var b = r.batch || '—'; batches[b] = batches[b] || { batch: b, total: 0, claimed: 0 }; batches[b].total++; if (r.status === 'claimed') batches[b].claimed++; });
  return { total: recs.length, claimed: recs.filter(function (r) { return r.status === 'claimed'; }).length, open: recs.filter(function (r) { return r.status === 'open'; }).length,
    batches: Object.keys(batches).map(function (k) { return batches[k]; }), claims: claims, list: list };
}
function adminLegacyImport_(d, p, me) {
  var rows = (Array.isArray(d.rows) ? d.rows : []).slice(0, 3000);
  var cids = csv_(d.course_ids).filter(function (id) { return findOne_('Courses', function (c) { return c.course_id === id; }); });
  if (!cids.length) throw err_('BAD_INPUT', 'เลือกคอร์สที่นักเรียนชุดนี้เคยซื้อ');
  if (!rows.length) throw err_('BAD_INPUT', 'ไม่มีรายชื่อ');
  var batch = clip_(d.batch, 80), added = 0, dup = 0, bad = [];
  var names = withLock_(function () {
    var have = read_('LegacyStudents'), sh = sheet_('LegacyStudents'), head = colsFor_('LegacyStudents', { norm: 1 }), vals = [], keys = [];
    rows.forEach(function (r, i) {
      var f = clip_(r.first_name, 60).replace(NAME_PREFIX, ''), l = clip_(r.last_name, 60);
      if (!f || !l) { bad.push(i + 1); return; }
      var key = nameKey_(f, l);
      if (have.some(function (x) { return x.norm === key && x.course_ids === cids.join(',') && x.batch === batch && x.status !== 'deleted'; }) || keys.indexOf(key) >= 0) { dup++; return; }
      keys.push(key);
      var o = { legacy_id: 'LG' + id_().slice(-7) + i, first_name: f, last_name: l, nickname: clip_(r.nickname, 40), norm: key, course_ids: cids.join(','), batch: batch, status: 'open', note: clip_(r.note, 200), created_at: now_() };
      vals.push(head.map(function (h) { return o[h] == null ? '' : String(o[h]); }));
    });
    if (vals.length) { sh.getRange(sh.getLastRow() + 1, 1, vals.length, head.length).setNumberFormat('@').setValues(vals); delete _cache.LegacyStudents; }
    added = vals.length;
    log_(me, 'legacy.import', (batch || '-') + ' +' + added + ' → ' + cids.join(','));
    return keys;
  });
  // เทียบย้อนหลังกับนักเรียนที่สมัครบนเว็บไปแล้ว
  var matched = 0;
  read_('Users').filter(function (u) { return u.role === 'student' && names.indexOf(nameKey_(u.first_name, u.last_name)) >= 0; }).forEach(function (u) { var r = legacyMatchUser_(u, false); if (r.matched && !r.already) matched++; });
  return { added: added, duplicate: dup, invalid_rows: bad, matched_existing: matched };
}
function adminLegacyDecide_(d, p, me) {
  var out = withLock_(function () {
    var c = findOne_('LegacyClaims', function (r) { return r.claim_id === d.claim_id; });
    if (!c || c.status !== 'pending') throw err_('ALREADY', 'คำขอนี้ถูกตัดสินไปแล้ว');
    if (d.decision !== 'approve') { update_('LegacyClaims', c._row, { status: 'rejected', decided_by: me.user_id, decided_at: now_() }); log_(me, 'legacy.reject', c.claim_id); return { status: 'rejected' }; }
    var rec = findOne_('LegacyStudents', function (r) { return r.legacy_id === d.legacy_id; });
    if (!rec || csv_(c.legacy_ids).indexOf(rec.legacy_id) < 0) throw err_('BAD_INPUT', 'เลือกรายชื่อที่ตรงกับนักเรียนคนนี้');
    if (rec.user_id && rec.user_id !== c.user_id) { // ย้ายสิทธิ์จากบัญชีเดิม
      read_('Enrollments').forEach(function (e) { if (e.user_id === rec.user_id && e.source === 'legacy' && e.status === 'approved' && csv_(rec.course_ids).indexOf(e.course_id) >= 0) update_('Enrollments', e._row, { status: 'revoked', note: 'ย้ายสิทธิ์นักเรียนเก่าไปบัญชีอื่น' }); });
    }
    update_('LegacyStudents', rec._row, { status: 'claimed', user_id: c.user_id, claimed_at: now_(), match: 'admin' });
    legacyGrant_(c.user_id, rec, me.user_id);
    update_('LegacyClaims', c._row, { status: 'approved', decided_by: me.user_id, decided_at: now_() });
    log_(me, 'legacy.approve', c.user_id + ' ← ' + rec.legacy_id);
    return { status: 'approved' };
  });
  return out;
}
function adminLegacyRelease_(d, p, me) {
  withLock_(function () {
    var rec = findOne_('LegacyStudents', function (r) { return r.legacy_id === d.legacy_id; });
    if (!rec || !rec.user_id) throw err_('NOT_FOUND', 'รายชื่อนี้ยังไม่มีใครใช้');
    read_('Enrollments').forEach(function (e) { if (e.user_id === rec.user_id && e.source === 'legacy' && e.status === 'approved' && csv_(rec.course_ids).indexOf(e.course_id) >= 0) update_('Enrollments', e._row, { status: 'revoked', note: 'แอดมินถอนสิทธิ์นักเรียนเก่า' }); });
    update_('LegacyStudents', rec._row, { status: 'open', user_id: '', claimed_at: '', match: '' });
    log_(me, 'legacy.release', rec.legacy_id + ' จาก ' + rec.user_id);
  });
  return true;
}
function adminLegacyDelete_(d, p, me) {
  withLock_(function () {
    var rec = findOne_('LegacyStudents', function (r) { return r.legacy_id === d.legacy_id; });
    if (!rec) throw err_('NOT_FOUND', 'ไม่พบรายชื่อ');
    if (rec.user_id) throw err_('IN_USE', 'รายชื่อนี้มีคนใช้อยู่ ถอนสิทธิ์ก่อนแล้วค่อยลบ');
    update_('LegacyStudents', rec._row, { status: 'deleted' }); log_(me, 'legacy.delete', rec.legacy_id);
  });
  return true;
}

// ═════════════════════════ ดึงคลิปจากเพลย์ลิสต์ YouTube อัตโนมัติ ═════════════════════════
// ต้องเปิดบริการ YouTube Data API ใน Apps Script (Services → YouTube Data API v3) และรัน installTriggers() หนึ่งครั้ง
function playlistId_(u) {
  var s = String(u || '').trim(), m = s.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^(PL|UU|OL|FL)[A-Za-z0-9_-]{10,}$/.test(s) ? s : '';
}
function playlistsSave_(d, p, me) {
  var c = courseFor_(me, d.course_id);
  var old = jsonParse_(c.playlists, []) || [];
  var list = (Array.isArray(d.playlists) ? d.playlists : []).slice(0, 10).map(function (x, i) {
    var id = playlistId_(x.url || x.id);
    if (!id) throw err_('BAD_INPUT', 'แถวที่ ' + (i + 1) + ': ลิงก์เพลย์ลิสต์ไม่ถูกต้อง (ต้องมี list=...)');
    var prev = old.filter(function (o) { return o.id === id; })[0] || {};
    return { id: id, chapter: clip_(x.chapter, 120), strip: clip_(x.strip, 60), title: prev.title || '', last_sync: prev.last_sync || '', last_count: prev.last_count || 0 };
  });
  withLock_(function () { var x = findOne_('Courses', function (r) { return r.course_id === c.course_id; }); update_('Courses', x._row, { playlists: JSON.stringify(list) }); log_(me, 'playlists.save', c.course_id + ' ' + list.map(function (l) { return l.id; }).join(',')); });
  return list;
}
function courseSync_(d, p, me) {
  var c = courseFor_(me, d.course_id);
  rate_('sync:' + c.course_id, 6, 600, 'กดซิงก์บ่อยเกินไป รอสักครู่');
  var r = syncCourse_(c);
  log_(me, 'playlists.sync', c.course_id + ' +' + r.added + ' ซ่อน ' + r.hidden);
  return r;
}
/** ตัวตั้งเวลา: เช็กทุกคอร์สที่ผูกเพลย์ลิสต์ไว้ (รันทุก 15 นาที) */
function syncPlaylists() {
  _cache = {};
  read_('Courses').filter(function (c) { return (jsonParse_(c.playlists, []) || []).length; }).forEach(function (c) {
    try { var r = syncCourse_(c); if (r.added) notifySync_(c, r); } catch (e) { console.error(c.course_id + ': ' + (e.message || e)); }
  });
}
function ytItems_(pid) {
  if (typeof YouTube === 'undefined') throw err_('SETUP', 'ยังไม่ได้เปิด YouTube Data API ใน Apps Script (Services → เพิ่ม YouTube Data API v3)');
  var out = [], token = '', guard = 0, meta = '';
  do {
    var res = YouTube.PlaylistItems.list('snippet,contentDetails,status', { playlistId: pid, maxResults: 50, pageToken: token || undefined });
    (res.items || []).forEach(function (it) {
      var priv = (it.status && it.status.privacyStatus) || '';
      out.push({ id: it.contentDetails.videoId, title: it.snippet.title, pos: it.snippet.position, ok: priv !== 'private' && !/^(Private|Deleted) video$/.test(it.snippet.title) });
    });
    token = res.nextPageToken || '';
  } while (token && ++guard < 40);
  try { var pl = YouTube.Playlists.list('snippet', { id: pid }); meta = pl.items && pl.items[0] ? pl.items[0].snippet.title : ''; } catch (e) {}
  return { items: out.sort(function (a, b) { return a.pos - b.pos; }), title: meta };
}
function ytMinutes_(ids) {
  var out = {};
  for (var i = 0; i < ids.length; i += 50) {
    var res = YouTube.Videos.list('contentDetails', { id: ids.slice(i, i + 50).join(',') });
    (res.items || []).forEach(function (v) {
      var m = String(v.contentDetails.duration || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
      out[v.id] = Math.round((Number(m[1]) || 0) * 60 + (Number(m[2]) || 0) + (Number(m[3]) || 0) / 60);
    });
  }
  return out;
}
function cleanTitle_(t, strip) {
  var s = String(t || '');
  if (strip) s = s.split(strip).join('');
  return s.replace(/^[\s|·\-–—:]+|[\s|·\-–—:]+$/g, '').replace(/\s{2,}/g, ' ').slice(0, 160) || String(t || '').slice(0, 160);
}
function syncCourse_(c) {
  var pls = jsonParse_(c.playlists, []) || [];
  if (!pls.length) throw err_('BAD_INPUT', 'คอร์สนี้ยังไม่ได้ผูกเพลย์ลิสต์');
  var fetched = pls.map(function (pl) { return { pl: pl, data: ytItems_(pl.id) }; });
  var result = { added: 0, hidden: 0, restored: 0, titles: [], playlists: [] };
  withLock_(function () {
    var mine = read_('Lessons').filter(function (l) { return l.course_id === c.course_id; }).sort(bySort_);
    var byYt = {}; mine.forEach(function (l) { byYt[l.youtube_id] = l; });
    var max = mine.reduce(function (m, l) { return Math.max(m, Number(l.sort_order) || 0); }, 0);
    var lastChap = mine.length ? mine[mine.length - 1].chapter : 'ตอนใหม่';
    var newOnes = [];
    fetched.forEach(function (f) {
      var live = {};
      f.data.items.forEach(function (it) {
        if (!it.ok) return; live[it.id] = 1;
        var l = byYt[it.id];
        if (l) { if (truthy_(l.hidden) && l.source_playlist === f.pl.id) { update_('Lessons', l._row, { hidden: 'FALSE' }); result.restored++; } return; }
        byYt[it.id] = { pending: true };
        newOnes.push({ it: it, pl: f.pl });
      });
      mine.forEach(function (l) {
        if (l.source_playlist === f.pl.id && !live[l.youtube_id] && !truthy_(l.hidden)) { update_('Lessons', l._row, { hidden: 'TRUE' }); result.hidden++; }
      });
      f.pl.title = f.data.title || f.pl.title; f.pl.last_sync = now_(); f.pl.last_count = f.data.items.filter(function (x) { return x.ok; }).length;
      result.playlists.push({ id: f.pl.id, title: f.pl.title, count: f.pl.last_count });
    });
    if (newOnes.length) {
      var mins = ytMinutes_(newOnes.map(function (x) { return x.it.id; }));
      var sh = sheet_('Lessons'), head = colsFor_('Lessons', { hidden: 1, source_playlist: 1 });
      var vals = newOnes.map(function (x, i) {
        var o = { lesson_id: 'L' + id_() + i, course_id: c.course_id, chapter: x.pl.chapter || lastChap, title: cleanTitle_(x.it.title, x.pl.strip), youtube_id: x.it.id,
          duration_min: String(mins[x.it.id] || 0), attachment_url: '', is_preview: 'FALSE', sort_order: String(max + (i + 1) * 10), hidden: 'FALSE', source_playlist: x.pl.id };
        result.titles.push(o.title);
        return head.map(function (h) { return o[h] == null ? '' : String(o[h]); });
      });
      sh.getRange(sh.getLastRow() + 1, 1, vals.length, head.length).setNumberFormat('@').setValues(vals);
      delete _cache.Lessons;
      result.added = vals.length;
    }
    var x = findOne_('Courses', function (r) { return r.course_id === c.course_id; });
    update_('Courses', x._row, { playlists: JSON.stringify(fetched.map(function (f) { return f.pl; })) });
    if (result.added || result.hidden || result.restored) append_('AdminLog', { time: now_(), admin_id: 'SYSTEM', action: 'playlists.sync', detail: c.course_id + ' +' + result.added + ' ซ่อน ' + result.hidden + ' คืน ' + result.restored });
  });
  cache_().remove('pub_courses');
  return result;
}
function notifySync_(c, r) {
  var to = read_('Users').filter(function (u) { return teachSubjects_(u).indexOf(c.subject) >= 0; }).map(function (u) { return u.email; });
  if (!to.length) to = String(getSetting_('admin_emails') || '').split(',').map(trim_).filter(String);
  if (!to.length) return;
  var body = '<p style="margin:0 0 12px">มีตอนใหม่จากเพลย์ลิสต์ขึ้นในคอร์ส <b>' + esc_(c.title) + '</b> แล้ว ' + r.added + ' ตอน</p><ul style="margin:0 0 16px;padding-left:18px">' +
    r.titles.slice(0, 20).map(function (t) { return '<li>' + esc_(t) + '</li>'; }).join('') + '</ul>' + mailBtn_(siteUrl_() + '/#/admin/course/' + encodeURIComponent(c.course_id), 'ดูในหลังบ้าน');
  MailApp.sendEmail({ to: to.join(','), subject: 'ตอนใหม่ขึ้นเว็บแล้ว · ' + c.title + ' (+' + r.added + ')', htmlBody: mailShell_('ตอนใหม่จากเพลย์ลิสต์', body), name: APP.NAME });
}


// ═════════════════════════ ไฟล์ประกอบบทเรียน (เห็นเฉพาะคนที่มีสิทธิ์เรียน) ═════════════════════════
// ไฟล์เก็บในโฟลเดอร์ส่วนตัวบน Drive (ไม่แชร์ลิงก์) · นักเรียนโหลดผ่าน learn.file ซึ่งเช็กสิทธิ์ทุกครั้ง
function filesOut_(l) { return (jsonParse_(l.files, []) || []).map(function (f) { return { fid: f.fid, name: f.name, mime: f.mime || '', size: f.size || 0, url: f.url || '' }; }); }
function lessonFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('LESSON_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  var f = DriveApp.createFolder('INeedBio Lesson Files (ส่วนตัว)');
  props.setProperty('LESSON_FOLDER_ID', f.getId());
  return f;
}
function lessonFileAdd_(d, p, me) {
  var l = lessonFor_(me, d.lesson_id);
  var name = clip_(d.name, 120), item;
  if (d.url) {
    var url = clip_(d.url, 500);
    if (!/^https:\/\//.test(url)) throw err_('BAD_INPUT', 'ลิงก์ต้องขึ้นต้นด้วย https://');
    item = { fid: 'U' + id_().slice(-8), name: name || 'ลิงก์ประกอบ', url: url };
  } else {
    if (!d.base64) throw err_('BAD_INPUT', 'เลือกไฟล์');
    var bytes = Math.round(String(d.base64).length * 0.75);
    if (bytes > APP.LESSON_FILE_MAX_BYTES) throw err_('BAD_INPUT', 'ไฟล์ใหญ่เกิน 10 MB ย่อไฟล์หรือแยกเป็นหลายไฟล์');
    if (!name) throw err_('BAD_INPUT', 'ตั้งชื่อไฟล์');
    var mime = /^[\w.+-]+\/[\w.+-]+$/.test(d.mime || '') ? d.mime : 'application/octet-stream';
    var file = lessonFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(d.base64), mime, l.course_id + '_' + l.lesson_id + '_' + name));
    item = { fid: 'F' + id_().slice(-8), drive_id: file.getId(), name: name, mime: mime, size: bytes };
  }
  withLock_(function () {
    var x = findOne_('Lessons', function (r) { return r.lesson_id === l.lesson_id; });
    var list = jsonParse_(x.files, []) || [];
    if (list.length >= 20) throw err_('BAD_INPUT', 'แนบได้สูงสุด 20 ไฟล์ต่อตอน');
    list.push(item); update_('Lessons', x._row, { files: JSON.stringify(list) });
    log_(me, 'lesson.file.add', l.lesson_id + ' ' + item.name);
  });
  return filesOut_({ files: JSON.stringify((jsonParse_(findOne_('Lessons', function (r) { return r.lesson_id === l.lesson_id; }).files, []) || [])) });
}
function lessonFileDelete_(d, p, me) {
  var l = lessonFor_(me, d.lesson_id), gone = null;
  withLock_(function () {
    var x = findOne_('Lessons', function (r) { return r.lesson_id === l.lesson_id; });
    var list = jsonParse_(x.files, []) || [];
    gone = list.filter(function (f) { return f.fid === d.fid; })[0];
    if (!gone) throw err_('NOT_FOUND', 'ไม่พบไฟล์นี้');
    update_('Lessons', x._row, { files: JSON.stringify(list.filter(function (f) { return f.fid !== d.fid; })) });
    log_(me, 'lesson.file.delete', l.lesson_id + ' ' + gone.name);
  });
  if (gone.drive_id) try { DriveApp.getFileById(gone.drive_id).setTrashed(true); } catch (e) {}
  return true;
}
function learnFile_(d, p) {
  var u = auth_(p);
  var l = findOne_('Lessons', function (r) { return r.lesson_id === d.lesson_id; });
  if (!l || truthy_(l.hidden)) throw err_('NOT_FOUND', 'ไม่พบบทเรียน');
  var c = findOne_('Courses', function (r) { return r.course_id === l.course_id; });
  if (!enrollActive_(latestEnroll_(u.user_id, l.course_id)) && !(isStaff_(u) && c && canSubject_(u, c.subject))) throw err_('NO_ACCESS', 'ไฟล์นี้สำหรับผู้ที่ลงทะเบียนคอร์สแล้วเท่านั้น');
  var f = (jsonParse_(l.files, []) || []).filter(function (x) { return x.fid === d.fid; })[0];
  if (!f) throw err_('NOT_FOUND', 'ไม่พบไฟล์นี้');
  if (f.url) return { name: f.name, url: f.url };
  rate_('file:' + u.user_id, 120, 3600, 'เปิดไฟล์บ่อยเกินไป ลองใหม่ภายหลัง');
  var blob = DriveApp.getFileById(f.drive_id).getBlob();
  return { name: f.name, mime: f.mime || blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}
/** เปลี่ยนชื่อบท (หัวข้อสีเขียว) ทุกตอนที่อยู่บทนี้ในคอร์สเดียวกัน */
function chapterRename_(d, p, me) {
  var c = courseFor_(me, d.course_id), from = String(d.from || ''), to = clip_(d.to, 120).replace(/\s*›\s*/g, ' › ');
  if (!to) throw err_('BAD_INPUT', 'ใส่ชื่อบทใหม่');
  var n = withLock_(function () {
    var rows = read_('Lessons').filter(function (l) { return l.course_id === c.course_id && l.chapter === from; });
    if (!rows.length) throw err_('NOT_FOUND', 'ไม่พบบทนี้ ลองรีเฟรชหน้า');
    rows.forEach(function (l) { update_('Lessons', l._row, { chapter: to }); });
    var x = findOne_('Courses', function (r) { return r.course_id === c.course_id; }), pls = jsonParse_(x.playlists, []) || [];
    if (pls.some(function (pl) { return pl.chapter === from; })) update_('Courses', x._row, { playlists: JSON.stringify(pls.map(function (pl) { if (pl.chapter === from) pl.chapter = to; return pl; })) });
    log_(me, 'chapter.rename', c.course_id + ': ' + from + ' → ' + to);
    return rows.length;
  });
  cache_().remove('pub_courses');
  return { renamed: n, chapter: to };
}

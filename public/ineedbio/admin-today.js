// หลังบ้าน → ภาพรวมวันนี้ (#/admin/today, round 7v): one Thai day's sign-ups and enrolments per subject, the member
// totals, every member who has no course yet (search, filters, CSV) and the cells ranking. Admins only: the menu
// item appears only in the admin sidebar and admin.today is adminOnly on the server. Read only — nothing on this
// page saves anything; it loads once per visit and again on "รีเฟรช". public/ineedbio/app.js stays untouched:
// this page is drawn into its admin shell the same way as admin-sheets.js.
(function () {
  'use strict';
  var API = window.INEEDBIO_API_URL || '/api/ib';
  var CAT = 'data:image/webp;base64,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'; // app.js's INeedBio cat (CATSRC), for people with no photo
  var TH_D = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var data = null, loading = false, date = '', q = '', flt = 'all', photos = {}, lastErr = '';

  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function baht(n) { return '฿' + Number(n || 0).toLocaleString('en-US'); }
  function num(n) { return Number(n || 0).toLocaleString('en-US'); }
  function call(action, d) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: d || {}, token: ls('ib_token'), device_id: ls('ib_device') }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) { var e = new Error(j.message || 'โหลดไม่สำเร็จ'); e.code = j.error; throw e; } return j.data; });
  }
  // dates: "YYYY-MM-DD" (Thai day) ↔ "ศ. 24 ต.ค. 69"; times shown in Thai time
  function thDate(s) { var x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!x) return ''; var w = new Date(Date.UTC(+x[1], +x[2] - 1, +x[3])).getUTCDay(); return TH_D[w] + ' ' + Number(x[3]) + ' ' + TH_M[+x[2] - 1] + ' ' + String((+x[1] + 543) % 100).padStart(2, '0'); }
  function bkk(isoS) { var t = Date.parse(isoS || ''); return isNaN(t) ? null : new Date(t + 7 * 36e5); }
  function dayOf(isoS) { var d = bkk(isoS); return d ? d.toISOString().slice(0, 10) : ''; }
  function hm(isoS) { var d = bkk(isoS); return d ? d.toISOString().slice(11, 16) : ''; }
  function shift(s, n) { var t = Date.parse(s + 'T00:00:00Z') + n * 864e5; return new Date(t).toISOString().slice(0, 10); }
  function todayTh() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); }

  function isAdminShell() { return !!document.querySelector('nav.aside a[href="#/admin/users"]'); }
  function here() { return /^#\/admin\/today\b/.test(location.hash); }

  /* ── menu item (top of the admin sidebar) — a <span role="link"> for the same reason as admin-sheets.js ── */
  function go() { document.body.classList.add('tdy-on'); location.hash = '#/admin/today'; }
  function menu() {
    var nav = document.querySelector('nav.aside'); if (!nav || !isAdminShell()) return;
    var a = nav.querySelector('.tdy-a');
    if (!a) {
      a = document.createElement('span'); a.className = 'tdy-a'; a.setAttribute('role', 'link'); a.tabIndex = 0;
      a.innerHTML = '<span>ภาพรวมวันนี้</span>';
      a.onclick = go;
      a.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      nav.insertBefore(a, nav.firstChild);
    }
    var on = here();
    if (on) Array.prototype.forEach.call(nav.querySelectorAll('a.on'), function (x) { x.classList.remove('on'); });
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }

  /* ── page ── */
  function page() {
    var was = document.body.classList.contains('tdy-on'), now = here() && isAdminShell();
    if (was && !now) window.dispatchEvent(new Event('resize'));
    document.body.classList.toggle('tdy-on', now);
    if (!here()) return;
    var amain = document.getElementById('amain');
    if (!amain || !isAdminShell()) return;
    var root = document.getElementById('tdy');
    if (!root) { root = document.createElement('div'); root.id = 'tdy'; amain.appendChild(root); draw(); }
    if (!data && !loading && !lastErr) load();
  }
  function load() {
    loading = true; lastErr = ''; draw();
    call('admin.today', date ? { date: date } : {}).then(function (d) { data = d; date = d.date; loading = false; draw(); loadPhotos(); })
      .catch(function (e) { loading = false; lastErr = e.message; draw(); });
  }
  function loadPhotos() {
    var want = (data.cells_top || []).filter(function (r) { return r.has_photo && !(r.user_id in photos); }).map(function (r) { return r.user_id; });
    var i = 0;
    function next() {
      if (i >= want.length) return;
      var id = want[i++]; photos[id] = '';
      call('admin.user.photo', { user_id: id }).then(function (p) {
        if (p && p.base64) { photos[id] = 'data:' + p.mime + ';base64,' + p.base64; var img = document.querySelector('#tdy img[data-uid="' + id + '"]'); if (img) img.src = photos[id]; }
      }).catch(function () {}).then(next);
    }
    for (var k = 0; k < 4; k++) next();
  }

  function head() {
    var d = date || todayTh(), isToday = d === todayTh();
    return '<div class="spread tdy-h"><div class="stack" style="gap:2px"><h1>ภาพรวม' + (isToday ? 'วันนี้' : 'วันที่เลือก') + '</h1><span class="ink2">' + esc(thDate(d)) + (isToday ? ' · วันนี้' : '') + '</span></div>' +
      '<div class="rowx tdy-nav"><button class="pill quiet s" data-td="-1">← วันก่อน</button><button class="pill ' + (isToday ? '' : 'ghost ') + 's" data-td="0">วันนี้</button>' +
      '<button class="pill quiet s" data-td="1"' + (d >= todayTh() ? ' disabled' : '') + '>วันถัดไป →</button>' +
      '<input class="i tdy-date" type="date" value="' + esc(d) + '" max="' + todayTh() + '" aria-label="เลือกวันที่"><button class="pill ghost s" data-tdr>รีเฟรช</button></div></div>';
  }
  function draw() {
    var root = document.getElementById('tdy'); if (!root) return;
    if (!data) { root.innerHTML = head() + (lastErr ? '<p class="err">' + esc(lastErr) + '</p>' : '<p class="ink2">กำลังโหลด…</p>'); return; }
    var T = data.totals, D = data.day, appr = 0, pend = 0, apprAmt = 0, pendAmt = 0;
    D.enrolls.forEach(function (c) { appr += c.approved; pend += c.pending; apprAmt += c.approved_amount; pendAmt += c.pending_amount; });
    var html = head() + (loading ? '<p class="sub">กำลังโหลด…</p>' : '') +
      '<div class="kpis tdy-k">' +
      kpi('k1', 'สมัครสมาชิก' + (date === todayTh() ? 'วันนี้' : ''), num(D.signups.n), 'คน') +
      kpi('k2', 'ลงคอร์ส' + (date === todayTh() ? 'วันนี้' : ''), num(appr), 'อนุมัติ' + (pend ? ' · <span class="tdy-wait">รอตรวจ ' + num(pend) + '</span>' : ' · รอตรวจ 0')) +
      kpi('k3', 'สมาชิกทั้งหมด', num(T.members), 'จ่ายเงินแล้ว ' + num(T.paid) + ' คน') +
      kpi('', 'ลงคอร์สแล้ว', num(T.enrolled), 'ยังไม่มีคอร์ส ' + num(T.no_course) + (T.pending ? ' · สลิปรอตรวจตอนนี้ ' + num(T.pending) : '')) +
      '</div>' +
      '<section class="stack tdy-s"><h3>ลงคอร์ส' + (date === todayTh() ? 'วันนี้' : 'วันนี้') + ' แยกวิชา</h3>' + enrollTable(appr, pend, apprAmt, pendAmt) + '</section>' +
      '<div class="tdy-two">' +
      '<section class="stack tdy-s"><h3>สมาชิกใหม่ <span class="sub" style="display:inline">' + num(D.signups.n) + ' คน</span></h3>' + signupList(D.signups.list) + '</section>' +
      '<section class="stack tdy-s"><h3>คนลงคอร์ส <span class="sub" style="display:inline">' + num(D.enroll_list.length) + ' รายการ</span></h3>' + enrollList(D.enroll_list) + '</section>' +
      '</div>' +
      '<section class="stack tdy-s" id="tdy-nc">' + noCourse() + '</section>' +
      '<section class="stack tdy-s"><h3>อันดับเซลล์</h3>' + cells() + '</section>';
    root.innerHTML = html;
  }
  function kpi(k, label, v, sub) { return '<div class="kpi ' + k + '"><span>' + esc(label) + '</span><b>' + v + '</b><span class="sub">' + sub + '</span></div>'; }
  function sj(k, name) { return '<span class="tdy-sj" style="--sj:var(--c-' + esc(k || 'bio') + ')">' + esc(name || k) + '</span>'; }
  function enrollTable(appr, pend, apprAmt, pendAmt) {
    var rows = data.day.enrolls;
    if (!rows.length) return '<p class="ink2 tdy-empty">' + (date === todayTh() ? 'วันนี้' : 'วันนั้น') + 'ยังไม่มีคนลงคอร์ส</p>';
    return '<div class="tbl"><table style="min-width:560px"><thead><tr><th>วิชา › คอร์ส</th><th class="num">อนุมัติ</th><th class="num">รอตรวจ</th><th class="num">ยอดเงิน</th></tr></thead><tbody>' +
      rows.map(function (c) {
        return '<tr><td>' + sj(c.subject, c.subject_name) + ' <span class="sub" style="display:inline">›</span> ' + esc(c.title) + '</td><td class="num">' + num(c.approved) + '</td><td class="num">' + (c.pending ? '<span class="tdy-wait">' + num(c.pending) + '</span>' : '0') + '</td>' +
          '<td class="num">' + baht(c.approved_amount) + (c.pending_amount ? '<span class="sub">รอตรวจ ' + baht(c.pending_amount) + '</span>' : '') + '</td></tr>';
      }).join('') +
      '<tr class="tdy-sum"><td><b>รวม</b></td><td class="num"><b>' + num(appr) + '</b></td><td class="num"><b>' + num(pend) + '</b></td><td class="num"><b>' + baht(apprAmt) + '</b>' + (pendAmt ? '<span class="sub">รอตรวจ ' + baht(pendAmt) + '</span>' : '') + '</td></tr>' +
      '</tbody></table></div>';
  }
  function signupList(list) {
    if (!list.length) return '<p class="ink2 tdy-empty">ยังไม่มีสมาชิกใหม่</p>';
    return '<div class="tbl"><table style="min-width:520px"><thead><tr><th>เวลา</th><th>ชื่อ</th><th>ชั้น · โรงเรียน</th><th>รู้จักจาก</th></tr></thead><tbody>' + list.slice().reverse().map(function (u) {
      return '<tr><td class="num">' + hm(u.created_at) + '</td><td><b>' + esc(u.nickname) + '</b><span class="sub">' + esc(u.name) + '</span></td><td>' + esc(u.grade) + '<span class="sub">' + esc(u.school) + '</span></td><td>' + (esc(u.heard_from) || '<span class="sub">–</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function enrollList(list) {
    if (!list.length) return '<p class="ink2 tdy-empty">' + (date === todayTh() ? 'วันนี้' : 'วันนั้น') + 'ยังไม่มีคนลงคอร์ส</p>';
    return '<div class="tbl"><table style="min-width:560px"><thead><tr><th>เวลา</th><th>ชื่อ</th><th>คอร์ส</th><th class="num">ยอด</th><th>สถานะ</th></tr></thead><tbody>' + list.slice().reverse().map(function (e) {
      return '<tr><td class="num">' + hm(e.at) + '</td><td><b>' + esc(e.nickname) + '</b>' + (e.new_today ? ' <span class="chip ok">ใหม่วันนี้</span>' : '') + '<span class="sub">' + esc(e.name) + '</span></td><td>' + esc(e.course) + '</td>' +
        '<td class="num">' + baht(e.amount) + '</td><td>' + (e.status === 'approved' ? '<span class="chip ok">อนุมัติ</span>' : '<span class="chip wait">รอตรวจ</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  var FLT = [['all', 'ทั้งหมด'], ['d7', 'สมัครใน 7 วัน'], ['pend', 'มีสลิปรอตรวจ'], ['trial', 'เคยรับไฟล์บทฟรี']];
  function ncRows() {
    var s = q.trim().toLowerCase();
    return data.no_course_list.filter(function (u) {
      if (flt === 'd7' && u.days > 7) return false;
      if (flt === 'pend' && !u.has_pending) return false;
      if (flt === 'trial' && !u.trial_courses.length) return false;
      return !s || [u.nickname, u.name, u.school].join(' ').toLowerCase().indexOf(s) >= 0;
    });
  }
  function noCourse() {
    var all = data.no_course_list, cnt = function (k) { var f0 = flt; flt = k; var x = all.filter(function (u) { return k === 'all' || (k === 'd7' ? u.days <= 7 : k === 'pend' ? u.has_pending : u.trial_courses.length); }).length; flt = f0; return x; };
    var rows = ncRows();
    return '<div class="spread"><h3>ยังไม่มีคอร์ส <span class="sub" style="display:inline">' + num(all.length) + ' คน</span></h3><button class="pill ghost s" data-tdcsv' + (rows.length ? '' : ' disabled') + '>ดาวน์โหลด CSV</button></div>' +
      '<div class="rowx tdy-f"><input class="i tdy-q" type="search" placeholder="ค้นหาชื่อ / โรงเรียน" value="' + esc(q) + '" aria-label="ค้นหาชื่อหรือโรงเรียน">' +
      '<div class="seg" role="group" aria-label="ตัวกรอง">' + FLT.map(function (f) { return '<button data-tdf="' + f[0] + '" aria-pressed="' + (flt === f[0]) + '">' + f[1] + ' (' + num(cnt(f[0])) + ')</button>'; }).join('') + '</div></div>' +
      '<div id="tdy-ncl">' + ncTable(rows) + '</div>';
  }
  function ncTable(rows) {
    if (!rows.length) return '<p class="ink2 tdy-empty">' + (data.no_course_list.length ? 'ไม่พบรายชื่อที่ตรงกับที่ค้นหา' : 'สมาชิกทุกคนมีคอร์สแล้ว') + '</p>';
    var more = rows.length > 300 ? '<p class="sub">แสดง 300 จาก ' + num(rows.length) + ' คน · ดาวน์โหลด CSV เพื่อดูทั้งหมด</p>' : '';
    return '<div class="tbl"><table style="min-width:900px"><thead><tr><th>ชื่อ</th><th>ชั้น · โรงเรียน</th><th>ติดต่อ</th><th>สมัคร</th><th>รู้จักจาก</th><th>สถานะ</th></tr></thead><tbody>' + rows.slice(0, 300).map(function (u) {
      return '<tr><td><b>' + esc(u.nickname) + '</b><span class="sub">' + esc(u.name) + '</span></td><td>' + esc(u.grade) + '<span class="sub">' + esc(u.school) + '</span></td>' +
        '<td class="tdy-ct">' + (u.phone ? '<a href="tel:' + esc(u.phone) + '">' + esc(u.phone) + '</a>' : '') + (u.line_id ? '<span class="sub">LINE ' + esc(u.line_id) + '</span>' : '') + '<span class="sub">' + esc(u.email) + '</span></td>' +
        '<td class="tdy-nw">' + esc(thDate(dayOf(u.created_at))) + '<span class="sub">' + (u.days ? u.days + ' วันก่อน' : 'วันนี้') + '</span></td><td>' + (esc(u.heard_from) || '<span class="sub">–</span>') + '</td>' +
        '<td>' + (u.has_pending ? '<span class="chip wait">สลิปรอตรวจ</span> ' : '') + (u.trial_courses.length ? '<span class="chip soft" title="' + esc(u.trial_courses.join(', ')) + '">รับไฟล์บทฟรี</span><span class="sub">' + esc(u.trial_courses.join(', ')) + '</span>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' + more;
  }
  function cells() {
    var r = data.cells_top || [];
    if (!r.length) return '<p class="ink2 tdy-empty">ยังไม่มีข้อมูลเซลล์</p>';
    var medal = ['', 'tdy-g', 'tdy-sv', 'tdy-br'];
    return '<div class="tbl"><table style="min-width:620px"><thead><tr><th class="num">#</th><th>นักเรียน</th><th class="num">เซลล์ที่ได้ทั้งหมด</th><th class="num">คงเหลือ</th><th class="num">ต่อเนื่อง</th><th class="num">สูงสุด</th><th class="num">วันเรียน</th></tr></thead><tbody>' + r.map(function (x) {
      var m = medal[x.rank] || '';
      return '<tr class="' + (m ? 'tdy-top ' + m : '') + '"><td class="num"><span class="tdy-rk">' + x.rank + '</span></td>' +
        '<td><span class="tdy-who"><img src="' + esc(photos[x.user_id] || CAT) + '" data-uid="' + esc(x.user_id) + '" alt="" loading="lazy"><span><b>' + esc(x.nickname) + '</b><span class="sub">' + esc(x.name) + '</span></span></span></td>' +
        '<td class="num"><b>' + num(x.total) + '</b></td><td class="num">' + num(x.balance) + '</td><td class="num">' + (x.streak ? '🔥 ' + num(x.streak) : '0') + '</td><td class="num">' + num(x.best) + '</td><td class="num">' + num(x.study_days) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function csv() {
    var rows = ncRows(), cell = function (v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) || /^[=+\-@]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var out = [['ชื่อเล่น', 'ชื่อ-นามสกุล', 'ชั้น', 'โรงเรียน', 'เบอร์', 'LINE', 'อีเมล', 'วันสมัคร', 'สมัครมา (วัน)', 'รู้จักจาก', 'สลิปรอตรวจ', 'รับไฟล์บทฟรี']].concat(rows.map(function (u) {
      return [u.nickname, u.name, u.grade, u.school, u.phone, u.line_id, u.email, dayOf(u.created_at), u.days, u.heard_from, u.has_pending ? 'มี' : '', u.trial_courses.join(' / ')];
    }));
    var text = '﻿' + out.map(function (r) { return r.map(cell).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'ineedbio-no-course-' + (date || todayTh()) + '.csv'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function setDate(d) { if (!d || d > todayTh()) d = todayTh(); date = d; data = null; lastErr = ''; load(); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('#tdy [data-td], #tdy [data-tdr], #tdy [data-tdf], #tdy [data-tdcsv]'); if (!t || t.disabled) return;
    if (t.dataset.td != null) { var n = Number(t.dataset.td); setDate(n ? shift(date || todayTh(), n) : todayTh()); }
    else if (t.hasAttribute('data-tdr')) { data = null; lastErr = ''; load(); }
    else if (t.dataset.tdf) { flt = t.dataset.tdf; var s = document.getElementById('tdy-nc'); if (s) s.innerHTML = noCourse(); }
    else if (t.hasAttribute('data-tdcsv')) csv();
  });
  document.addEventListener('change', function (e) { if (e.target.classList && e.target.classList.contains('tdy-date') && e.target.closest('#tdy')) setDate(e.target.value); });
  document.addEventListener('input', function (e) {
    if (!(e.target.classList && e.target.classList.contains('tdy-q') && e.target.closest('#tdy'))) return;
    q = e.target.value; var l = document.getElementById('tdy-ncl'); if (l) l.innerHTML = ncTable(ncRows());
    var b = document.querySelector('#tdy [data-tdcsv]'); if (b) b.disabled = !ncRows().length;
  });

  var css = document.createElement('style');
  css.textContent =
    'body.tdy-on #amain > :not(#tdy){display:none!important}' +
    '.aside .tdy-a{text-decoration:none;padding:11px 14px;border-radius:12px;color:var(--ink2);white-space:nowrap;display:flex;align-items:center;gap:10px;font-size:15.5px;cursor:pointer;font-weight:600;margin-bottom:4px;transition:background-color .22s ease,color .22s ease}' +
    '.aside .tdy-a:hover{background:var(--bg2)} .aside .tdy-a.on{background:var(--acc-soft);color:var(--acc)}' +
    '.v2ui .aside .tdy-a{position:relative;z-index:1;color:rgba(255,255,255,.86)} .v2ui .aside .tdy-a:hover{background:rgba(255,255,255,.08);color:#fff}' +
    '.v2ui .aside .tdy-a.on{background:rgba(255,255,255,.14);color:#fff}' +
    'body.tdy-on .aside .glide{opacity:0!important}' +
    '#tdy{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;min-width:0} #tdy > *,.tdy-two > *{min-width:0;max-width:100%} #tdy .tbl{max-width:100%} #tdy h3{font-size:17px;margin:0}' +
    '.tdy-h{flex-wrap:wrap;gap:12px} .tdy-nav{flex-wrap:wrap;gap:8px;align-items:center} .tdy-nav .pill[disabled]{opacity:.4;cursor:default}' +
    '#tdy .tdy-date{width:auto;flex:0 0 auto;min-width:0;padding:3px 10px;font-size:14px}' +
    '.tdy-k .kpi .sub{display:block} .tdy-wait{color:var(--wait,#b26a00);font-weight:600}' +
    '.tdy-s{gap:10px;min-width:0;grid-template-columns:minmax(0,1fr)} .tdy-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:18px;min-width:0}' +
    '#tdy td .sub{display:block} #tdy td{vertical-align:top} .tdy-nw{white-space:nowrap} .tdy-ct a{color:inherit}' +
    '.tdy-sj{display:inline-block;font-size:12px;font-weight:600;color:var(--sj);border:1px solid var(--sj);border-radius:99px;padding:0 8px;line-height:1.6}' +
    '.tdy-sum td{border-top:2px solid var(--line);background:var(--bg2)}' +
    '.tdy-f{flex-wrap:wrap;gap:10px;align-items:center} .tdy-q{flex:1 1 220px;max-width:340px} .tdy-f .seg{max-width:100%;overflow-x:auto;scrollbar-width:none} .tdy-f .seg button{white-space:nowrap}' +
    '.tdy-empty{padding:14px 0}' +
    '.tdy-who{display:flex;align-items:center;gap:10px} .tdy-who img{width:36px;height:36px;border-radius:50%;object-fit:cover;flex:none;background:var(--bg2)}' +
    '.tdy-rk{display:inline-grid;place-items:center;min-width:28px;height:28px;border-radius:50%;font-weight:600}' +
    '.tdy-top .tdy-who img{width:44px;height:44px;box-shadow:0 0 0 3px var(--md)} .tdy-top .tdy-rk{background:var(--md);color:#3a2a00}' +
    '.tdy-top td{background:color-mix(in srgb,var(--md) 12%,transparent)} .tdy-top b{font-size:15.5px}' +
    '.tdy-g{--md:#e8b923} .tdy-sv{--md:#b9c0c8} .tdy-br{--md:#cd8a4f} .tdy-sv .tdy-rk{color:#2b3036} .tdy-br .tdy-rk{color:#3a1f08}' +
    '@media (max-width:640px){.tdy-nav{width:100%} #tdy .tdy-date{flex:1 1 140px} .tdy-q{max-width:none} #tdy .kpis{grid-template-columns:1fr 1fr;gap:10px} #tdy .kpi{padding:12px 14px} #tdy .kpi b{font-size:24px}}';
  document.head.appendChild(css);

  var tm = 0;
  function schedule() { clearTimeout(tm); tm = setTimeout(function () { menu(); page(); }, 15); }
  function start() {
    new MutationObserver(schedule).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { if (!here()) { data = null; lastErr = ''; } schedule(); });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

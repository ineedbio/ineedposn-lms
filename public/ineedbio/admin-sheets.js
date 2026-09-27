// หลังบ้าน → ชีทสรุป (#/admin/sheets): prepare summary-sheet PDFs and bundles before the shop opens.
// Admins only (the menu item appears only in the admin sidebar, every action behind it is adminOnly on the
// server). Nothing here is public: there is no student page, link or API for sheets until the storefront is
// built (lib/ib/sheets.ts SHEETS_ON_SALE). public/ineedbio/app.js stays untouched — this page is drawn into
// its admin shell. PDFs upload in 2 MB parts with a progress bar and open again from here to check them.
(function () {
  'use strict';
  var API = window.INEEDBIO_API_URL || '/api/ib', PART = 2 * 1024 * 1024;
  var SUBJ = { bio: 'ชีววิทยา', chem: 'เคมี', phys: 'ฟิสิกส์', math: 'คณิตศาสตร์' };
  var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var data = null, loading = false, filter = '';

  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function baht(n) { return '฿' + Number(n || 0).toLocaleString('en-US'); }
  function kb(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function upd(m) { var x = /^(\d{4})-(\d{2})$/.exec(m || ''); return x ? TH_M[Number(x[2]) - 1] + ' ' + String((Number(x[1]) + 543) % 100).padStart(2, '0') : ''; }
  function call(action, d) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: d || {}, token: ls('ib_token'), device_id: ls('ib_device') }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) { var e = new Error(j.message || 'ทำรายการไม่สำเร็จ'); e.code = j.error; throw e; } return j.data; });
  }
  function toast(msg, bad) {
    var t = document.getElementById('toasts'); if (!t) return;
    var el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.setAttribute('role', 'status'); el.textContent = msg;
    t.appendChild(el); setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 260); }, 3000);
  }
  function isAdminShell() { return !!document.querySelector('nav.aside a[href="#/admin/users"]'); }
  function here() { return /^#\/admin\/sheets\b/.test(location.hash); }

  /* ── menu item ── */
  function menu() {
    var nav = document.querySelector('nav.aside'); if (!nav || !isAdminShell()) return;
    var a = nav.querySelector('a[href="#/admin/sheets"]');
    if (!a) {
      var after = nav.querySelector('a[href="#/admin/courses"]'); if (!after) return;
      a = document.createElement('a'); a.href = '#/admin/sheets';
      a.innerHTML = '<span>ชีทสรุป</span><span class="shx-soon">ยังไม่เปิดขาย</span>';
      after.parentNode.insertBefore(a, after.nextSibling);
    }
    var on = here();
    if (on) Array.prototype.forEach.call(nav.querySelectorAll('a.on'), function (x) { if (x !== a) x.classList.remove('on'); });
    a.classList.toggle('on', on);
  }

  /* ── page ── */
  function page() {
    document.body.classList.toggle('shx-on', here() && isAdminShell());
    if (!here()) return;
    var amain = document.getElementById('amain');
    if (!amain || !isAdminShell()) return;
    var root = document.getElementById('shx');
    if (!root) { root = document.createElement('div'); root.id = 'shx'; amain.appendChild(root); draw(root); }
    if (!data && !loading) load();
  }
  function load() {
    loading = true;
    call('admin.sheets').then(function (d) { data = d; loading = false; var r = document.getElementById('shx'); if (r) draw(r); })
      .catch(function (e) { loading = false; var r = document.getElementById('shx'); if (r) r.innerHTML = '<h1>ชีทสรุป</h1><p class="err">' + esc(e.message) + '</p>'; });
  }
  function draw(root) {
    if (!data) { root.innerHTML = '<h1>ชีทสรุป</h1><p class="ink2">กำลังโหลด…</p>'; return; }
    var list = data.sheets.filter(function (s) { return !filter || s.subject === filter; });
    var count = function (k) { return data.sheets.filter(function (s) { return !k || s.subject === k; }).length; };
    root.innerHTML =
      '<div class="spread"><h1>ชีทสรุป</h1><div class="rowx"><button class="pill ghost s" data-shb-new>+ สร้างชุดคุ้มกว่า</button><button class="pill s" data-sh-new>+ เพิ่มชีท</button></div></div>' +
      '<div class="note wait shx-flag"><b>ยังไม่เปิดขาย</b> · หน้าร้านฝั่งนักเรียนปิดทั้งระบบ ไม่มีลิงก์ ไม่มีหน้าไหนเข้าถึงชีทได้ เตรียมข้อมูลและอัปโหลดไฟล์ไว้ล่วงหน้าได้เลย เปิดขายเมื่อทำหน้าร้านเสร็จ</div>' +
      '<div class="lg-tabs" role="tablist">' + [''].concat(Object.keys(SUBJ)).map(function (k) {
        return '<button type="button" role="tab" class="lg-tab' + (k ? ' s-' + k : '') + '" data-shf="' + k + '" aria-selected="' + (filter === k) + '">' + (k ? '<i></i>' + SUBJ[k] : 'ทั้งหมด') + '<span class="lg-n">' + count(k) + '</span></button>';
      }).join('') + '</div>' +
      (list.length ? '<div class="tbl"><table style="min-width:760px"><thead><tr><th>ชีท</th><th class="num">ราคา</th><th>หน้า</th><th>ไฟล์ PDF</th><th>อัปเดต</th><th></th></tr></thead><tbody>' + list.map(function (s) {
        return '<tr class="s-' + s.subject + '"><td><b>' + esc(s.title) + '</b><div class="sub"><span class="lg-sj">' + esc(s.subject_name) + '</span>' + (s.cover_title ? ' · ปก: ' + esc(s.cover_title) : '') + '</div></td>' +
          '<td class="num">' + (s.full_price ? '<span class="sub" style="text-decoration:line-through">' + baht(s.full_price) + '</span> ' : '') + baht(s.price) + '</td>' +
          '<td class="sm">' + (s.pages ? s.pages + ' หน้า' : '–') + (s.sample_pages ? '<div class="sub">ตัวอย่าง ' + s.sample_pages + ' หน้า</div>' : '') + '</td>' +
          '<td class="sm">' + fileCell(s, 'file', 'ตัวเต็ม') + fileCell(s, 'sample', 'ตัวอย่างฟรี') + '</td>' +
          '<td class="sm">' + (s.updated_month ? 'อัปเดต ' + upd(s.updated_month) : '<span class="sub">–</span>') + '</td>' +
          '<td><button class="pill quiet s" data-sh-ed="' + esc(s.sheet_id) + '">แก้ไข</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>' + (data.sheets.length ? 'ยังไม่มีชีทวิชานี้' : 'ยังไม่มีชีท กด "+ เพิ่มชีท" เพื่อเริ่ม') + '</p></div>') +
      '<h3 style="font-size:17px;margin-top:10px">ชุดคุ้มกว่า</h3>' +
      (data.bundles.length ? '<div class="stack" style="gap:10px">' + data.bundles.map(function (b) {
        return '<div class="card shx-b"><div class="spread"><div class="stack" style="gap:4px"><b>' + esc(b.title) + '</b><span class="sm ink2">' + b.sheet_ids.map(function (id) { var s = byId(id); return s ? esc(s.title) : ''; }).filter(Boolean).join(' · ') + '</span>' +
          (b.description ? '<span class="sub">' + esc(b.description) + '</span>' : '') + '</div><div class="shx-bp"><span class="sub" style="text-decoration:line-through">' + baht(b.normal) + '</span><b>' + baht(b.price) + '</b><span class="sub">ประหยัด ' + baht(b.save) + '</span></div></div>' +
          '<div class="rowx"><button class="pill quiet s" data-shb-ed="' + esc(b.bundle_id) + '">แก้ไข</button><button class="pill quiet s" data-shb-del="' + esc(b.bundle_id) + '">ลบ</button></div></div>';
      }).join('') + '</div>' : '<p class="ink2 sm">ยังไม่มีชุด เลือกชีทหลายเล่มขายรวมในราคาพิเศษได้ที่ "+ สร้างชุดคุ้มกว่า"</p>');
  }
  function byId(id) { return data && data.sheets.filter(function (s) { return s.sheet_id === id; })[0]; }
  function fileCell(s, kind, label) {
    var f = s[kind];
    return '<div class="shx-f">' + label + ': ' + (f ? '<button class="link" data-sh-open="' + esc(s.sheet_id) + '" data-kind="' + kind + '">' + esc(f.name) + '</button> <span class="sub" style="display:inline">' + kb(f.size) + '</span>' : '<span class="sub" style="display:inline">ยังไม่มีไฟล์</span>') + '</div>';
  }

  /* ── modals (same markup as app.js's openModal; its [data-close] handler closes them) ── */
  function modal(title, sub, body) {
    var m = document.getElementById('modal');
    m.innerHTML = '<div class="scrim" data-close="1"><div class="modal wide" role="dialog" aria-modal="true"><div class="mx"><div class="stack" style="gap:4px"><h2>' + esc(title) + '</h2>' + (sub ? '<p class="ink2 sm">' + esc(sub) + '</p>' : '') + '</div><button class="x" data-close="1" aria-label="ปิด">×</button></div>' + body + '</div></div>';
    return m.querySelector('.modal');
  }
  function closeModal() { var m = document.getElementById('modal'); if (m) m.innerHTML = ''; }
  function fld(name, label, value, opt) {
    opt = opt || {};
    if (opt.options) return '<label class="f">' + label + '<select class="i" name="' + name + '">' + opt.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    if (opt.area) return '<label class="f">' + label + '<textarea class="i" name="' + name + '" placeholder="' + esc(opt.ph || '') + '">' + esc(value || '') + '</textarea></label>';
    return '<label class="f">' + label + '<input class="i" name="' + name + '" value="' + esc(value == null ? '' : value) + '" placeholder="' + esc(opt.ph || '') + '"' + (opt.mode ? ' inputmode="' + opt.mode + '"' : '') + '>' + (opt.hint ? '<span class="hint">' + opt.hint + '</span>' : '') + '</label>';
  }
  function formData(f) { var o = {}; Array.prototype.forEach.call(f.querySelectorAll('input[name],select[name],textarea[name]'), function (el) { o[el.name] = el.value; }); return o; }

  function sheetModal(s) {
    s = s || { subject: filter || 'bio' };
    var md = modal(s.sheet_id ? 'แก้ไขชีท' : 'ชีทใหม่', 'ยังไม่เปิดขาย เห็นเฉพาะแอดมิน',
      '<form class="form" id="shf">' +
      fld('title', 'ชื่อชีท', s.title, { ph: 'เช่น สรุปพันธุศาสตร์ ฉบับ สอวน. + โจทย์ท้ายบท' }) +
      '<div class="row2">' + fld('subject', 'วิชา', s.subject, { options: Object.keys(SUBJ).map(function (k) { return [k, SUBJ[k]]; }) }) + fld('cover_title', 'ชื่อสั้นบนปก (ไม่ใส่ก็ได้)', s.cover_title, { ph: 'เช่น สรุปพันธุศาสตร์' }) + '</div>' +
      '<div class="row2">' + fld('price', 'ราคาขาย (บาท)', s.price == null ? '' : s.price, { mode: 'numeric', ph: '89' }) + fld('full_price', 'ราคาก่อนลด (ไม่ใส่ก็ได้)', s.full_price || '', { mode: 'numeric', ph: '129' }) + '</div>' +
      '<div class="row2">' + fld('pages', 'จำนวนหน้า', s.pages || '', { mode: 'numeric', ph: '24' }) + fld('sample_pages', 'หน้าในไฟล์ตัวอย่าง', s.sample_pages || '', { mode: 'numeric', ph: '3', hint: 'แสดงเป็น "ดูตัวอย่างฟรี N หน้า"' }) + '</div>' +
      '<div data-um-here></div>' +
      '<div class="row2">' + fld('sort_order', 'ลำดับการแสดง (น้อยขึ้นก่อน)', s.sort_order || 0, { mode: 'numeric' }) + '<span></span></div>' +
      fld('description', 'รายละเอียด (ไม่ใส่ก็ได้)', s.description, { area: true, ph: 'มีอะไรในชีทนี้ เหมาะกับใคร' }) +
      '<p class="err" id="shf-err" hidden></p><div class="rowx" style="justify-content:space-between">' + (s.sheet_id ? '<button type="button" class="pill danger quiet" id="sh-del">ลบชีทนี้</button>' : '<span></span>') + '<button class="pill">' + (s.sheet_id ? 'บันทึก' : 'บันทึก แล้วอัปโหลดไฟล์') + '</button></div></form>' +
      (s.sheet_id ? '<div class="shx-up">' + upBox(s, 'file', 'ไฟล์ PDF ตัวเต็ม', 'ไม่เกิน 60 MB · ขายให้คนที่ซื้อ') + upBox(s, 'sample', 'ไฟล์ PDF ตัวอย่างฟรี', 'ไม่เกิน 15 MB · ปุ่ม "ดูตัวอย่างฟรี"') + '</div>' : ''));
    var slot = md.querySelector('[data-um-here]');
    if (window.ibMonthPicker) slot.replaceWith(window.ibMonthPicker('updated_month', s.updated_month, 'อัปเดตล่าสุด (ป้าย "อัปเดต ก.ย. 69")', 'ตั้งเองได้ · เลือก "ไม่แสดงป้าย" ถ้าไม่ต้องการ'));
    var f = md.querySelector('#shf'), er = md.querySelector('#shf-err');
    f.onsubmit = function (e) {
      e.preventDefault(); er.hidden = true;
      var d = formData(f); if (s.sheet_id) d.sheet_id = s.sheet_id;
      var btn = f.querySelector('button.pill:not([type=button])'); btn.disabled = true;
      call('admin.sheet.save', d).then(function (r) {
        toast('บันทึกชีทแล้ว'); refresh();
        if (!s.sheet_id) sheetModal(r); else closeModal();
      }).catch(function (x) { btn.disabled = false; er.textContent = x.message; er.hidden = false; });
    };
    var del = md.querySelector('#sh-del');
    if (del) del.onclick = function () {
      if (!window.confirm('ลบชีท "' + s.title + '" และไฟล์ทั้งหมดของชีทนี้?')) return;
      call('admin.sheet.delete', { sheet_id: s.sheet_id }).then(function () { closeModal(); toast('ลบชีทแล้ว'); refresh(); }).catch(function (x) { er.textContent = x.message; er.hidden = false; });
    };
    Array.prototype.forEach.call(md.querySelectorAll('.shx-box'), function (box) { bindUpload(box, s); });
  }
  function upBox(s, kind, label, hint) {
    var f = s[kind];
    return '<div class="shx-box" data-kind="' + kind + '"><div class="spread"><b>' + label + '</b><span class="hint">' + hint + '</span></div>' +
      '<div class="shx-cur">' + (f ? '<button type="button" class="link" data-sh-open="' + esc(s.sheet_id) + '" data-kind="' + kind + '">' + esc(f.name) + '</button> <span class="sub" style="display:inline">' + kb(f.size) + '</span> <button type="button" class="link shx-rm">ลบไฟล์</button>' : '<span class="sub">ยังไม่มีไฟล์</span>') + '</div>' +
      '<div class="rowx"><button type="button" class="pill ghost s shx-pick">' + (f ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์ PDF') + '</button><input type="file" accept="application/pdf,.pdf" hidden></div>' +
      '<div class="shx-prog" hidden><div class="bar"><i style="width:0%"></i></div><span class="sub"></span></div><p class="err" hidden></p></div>';
  }
  function bindUpload(box, s) {
    var kind = box.dataset.kind, inp = box.querySelector('input[type=file]'), prog = box.querySelector('.shx-prog'), bar = prog.querySelector('i'), txt = prog.querySelector('span'), er = box.querySelector('.err');
    box.querySelector('.shx-pick').onclick = function () { inp.click(); };
    var rm = box.querySelector('.shx-rm');
    if (rm) rm.onclick = function () {
      if (!window.confirm('ลบไฟล์นี้?')) return;
      call('admin.sheet.file.delete', { sheet_id: s.sheet_id, kind: kind }).then(function () { toast('ลบไฟล์แล้ว'); reopen(s.sheet_id); }).catch(function (x) { er.textContent = x.message; er.hidden = false; });
    };
    inp.onchange = function () {
      var file = inp.files && inp.files[0]; inp.value = ''; if (!file) return;
      er.hidden = true;
      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { er.textContent = 'เลือกไฟล์ PDF'; er.hidden = false; return; }
      var max = kind === 'file' ? 60 : 15;
      if (file.size > max * 1048576) { er.textContent = 'ไฟล์ใหญ่เกิน ' + max + ' MB'; er.hidden = false; return; }
      prog.hidden = false; box.querySelector('.shx-pick').disabled = true;
      var n = Math.ceil(file.size / PART), ids = [], i = 0;
      var next = function () {
        if (i >= n) {
          txt.textContent = 'กำลังบันทึก…';
          return call('admin.sheet.file.commit', { sheet_id: s.sheet_id, kind: kind, parts: ids, name: file.name, size: file.size }).then(function () { toast('อัปโหลดแล้ว'); reopen(s.sheet_id); });
        }
        return new Promise(function (res, rej) {
          var rd = new FileReader();
          rd.onload = function () { res(String(rd.result).split(',')[1] || ''); };
          rd.onerror = function () { rej(new Error('อ่านไฟล์ไม่ได้')); };
          rd.readAsDataURL(file.slice(i * PART, Math.min(file.size, (i + 1) * PART)));
        }).then(function (b64) { return call('admin.sheet.part', { data: b64 }); }).then(function (r) {
          ids.push(r.part_id); i++;
          bar.style.width = Math.round(i / n * 100) + '%'; txt.textContent = 'อัปโหลด ' + kb(Math.min(file.size, i * PART)) + ' / ' + kb(file.size);
          return next();
        });
      };
      txt.textContent = 'เริ่มอัปโหลด…';
      next().catch(function (x) { box.querySelector('.shx-pick').disabled = false; prog.hidden = true; er.textContent = x.message || 'อัปโหลดไม่สำเร็จ'; er.hidden = false; });
    };
  }
  function reopen(id) { refresh().then(function () { var s = byId(id); if (s && document.querySelector('#modal #shf')) sheetModal(s); }); }
  function refresh() { return call('admin.sheets').then(function (d) { data = d; var r = document.getElementById('shx'); if (r) draw(r); }); }

  function openPdf(id, kind, btn) {
    var parts = [], label = btn.textContent;
    btn.textContent = 'กำลังเปิด…';
    var w = window.open('', '_blank'); // open now (a later window.open would be blocked as a popup)
    var get = function (i) {
      return call('admin.sheet.file.get', { sheet_id: id, kind: kind, index: i }).then(function (r) {
        var bin = atob(r.base64), u8 = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
        parts.push(u8); btn.textContent = 'กำลังเปิด ' + (i + 1) + '/' + r.parts;
        return i + 1 < r.parts ? get(i + 1) : null;
      });
    };
    get(0).then(function () {
      var url = URL.createObjectURL(new Blob(parts, { type: 'application/pdf' }));
      if (w) w.location.href = url; else window.open(url, '_blank');
      btn.textContent = label;
    }).catch(function (x) { if (w) w.close(); btn.textContent = label; toast(x.message, true); });
  }

  function bundleModal(b) {
    b = b || { sheet_ids: [] };
    if (!data.sheets.length) return toast('เพิ่มชีทก่อน แล้วค่อยจัดชุด', true);
    var md = modal(b.bundle_id ? 'แก้ไขชุดคุ้มกว่า' : 'ชุดคุ้มกว่าใหม่', 'เลือกชีทที่ขายรวมกัน พร้อมราคาชุด',
      '<form class="form" id="sbf">' + fld('title', 'ชื่อชุด', b.title, { ph: 'เช่น ครบชุดชีววิทยา 8 เล่ม' }) +
      fld('description', 'คำอธิบายสั้น (ไม่ใส่ก็ได้)', b.description, { ph: 'เช่น รวมทุกบทที่ออกสอบ สอวน. ค่าย 1' }) +
      '<div class="f">ชีทในชุดนี้<div class="shx-pickl">' + Object.keys(SUBJ).map(function (k) {
        var ss = data.sheets.filter(function (s) { return s.subject === k; }); if (!ss.length) return '';
        return '<span class="gm-g s-' + k + '">' + SUBJ[k] + '</span>' + ss.map(function (s) { return '<label class="chk-l"><input type="checkbox" value="' + esc(s.sheet_id) + '"' + (b.sheet_ids.indexOf(s.sheet_id) >= 0 ? ' checked' : '') + '> ' + esc(s.title) + ' <span class="sub" style="display:inline">· ' + baht(s.price) + '</span></label>'; }).join('');
      }).join('') + '</div></div>' +
      '<div class="row2">' + fld('price', 'ราคาชุด (บาท)', b.price || '', { mode: 'numeric' }) + '<div class="f">ซื้อแยกรวม<b class="shx-sum" style="font-size:20px">฿0</b><span class="hint shx-save"></span></div></div>' +
      '<p class="err" id="sbf-err" hidden></p><div class="rowx" style="justify-content:flex-end"><button class="pill">บันทึกชุด</button></div></form>');
    var f = md.querySelector('#sbf'), er = md.querySelector('#sbf-err');
    var picked = function () { return Array.prototype.filter.call(f.querySelectorAll('.shx-pickl input'), function (x) { return x.checked; }).map(function (x) { return x.value; }); };
    var sum = function () {
      var n = picked().reduce(function (a, id) { return a + ((byId(id) || {}).price || 0); }, 0), p = Number((f.querySelector('[name=price]').value || '').replace(/[^\d]/g, '')) || 0;
      f.querySelector('.shx-sum').textContent = baht(n); f.querySelector('.shx-save').textContent = p && n > p ? 'ประหยัด ' + baht(n - p) + ' (' + Math.round((n - p) / n * 100) + '%)' : '';
    };
    f.addEventListener('input', sum); f.addEventListener('change', sum); sum();
    f.onsubmit = function (e) {
      e.preventDefault(); er.hidden = true;
      var d = formData(f); d.sheet_ids = picked(); if (b.bundle_id) d.bundle_id = b.bundle_id;
      call('admin.sheet.bundle.save', d).then(function () { closeModal(); toast('บันทึกชุดแล้ว'); refresh(); }).catch(function (x) { er.textContent = x.message; er.hidden = false; });
    };
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-sh-new],[data-sh-ed],[data-shb-new],[data-shb-ed],[data-shb-del],[data-sh-open],[data-shf]');
    if (!t || !document.body.classList.contains('shx-on')) return;
    e.preventDefault();
    if (t.hasAttribute('data-shf')) { filter = t.dataset.shf; draw(document.getElementById('shx')); }
    else if (t.hasAttribute('data-sh-new')) sheetModal(null);
    else if (t.dataset.shEd) sheetModal(byId(t.dataset.shEd));
    else if (t.hasAttribute('data-shb-new')) bundleModal(null);
    else if (t.dataset.shbEd) bundleModal(data.bundles.filter(function (b) { return b.bundle_id === t.dataset.shbEd; })[0]);
    else if (t.dataset.shbDel) { if (window.confirm('ลบชุดนี้? (ชีทในชุดไม่ถูกลบ)')) call('admin.sheet.bundle.delete', { bundle_id: t.dataset.shbDel }).then(function () { toast('ลบชุดแล้ว'); refresh(); }).catch(function (x) { toast(x.message, true); }); }
    else if (t.dataset.shOpen) openPdf(t.dataset.shOpen, t.dataset.kind, t);
  });

  var css = document.createElement('style');
  css.textContent =
    'body.shx-on #amain > :not(#shx){display:none!important}' + // app.js draws its dashboard behind this page; hide it
    '.aside a .shx-soon{font-size:10.5px;font-weight:600;color:var(--muted);background:var(--bg2);border-radius:99px;padding:1px 7px;white-space:nowrap}' +
    '.v2ui .aside a .shx-soon{color:rgba(255,255,255,.6);background:rgba(255,255,255,.1)}' +
    '#shx{display:grid;gap:16px} .shx-flag{font-size:14px}' +
    '#shx td .lg-sj{margin-right:2px} .shx-f{white-space:nowrap} .shx-f + .shx-f{margin-top:3px}' +
    '.shx-b .shx-bp{display:grid;justify-items:end;gap:2px} .shx-b .shx-bp b{font-size:20px;color:var(--c-bio)}' +
    '.shx-up{display:grid;gap:12px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}' +
    '.shx-box{border:1px solid var(--line);border-radius:14px;padding:14px;display:grid;gap:10px} .shx-prog{display:grid;gap:4px}' +
    '.shx-pickl{max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin-top:6px;display:grid;gap:4px}' +
    '.shx-pickl .gm-g{display:block;font-size:12px;font-weight:600;color:var(--acc);padding:6px 0 2px}';
  document.head.appendChild(css);

  var t = 0;
  function schedule() { clearTimeout(t); t = setTimeout(function () { menu(); page(); }, 15); }
  function start() {
    new MutationObserver(schedule).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { if (!here()) { data = null; } schedule(); });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// Back-office additions for public/ineedbio/app.js, which must stay byte-identical to the zip (CHECKSUMS.txt).
//  - Sidebar: each menu group (งานประจำวัน / เนื้อหา / การเงินและการขาย / ระบบ) sits on its own light tint.
//  - นักเรียนรุ่นเก่า: tabs per subject (ทั้งหมด / ชีววิทยา / เคมี / ฟิสิกส์ / คณิตศาสตร์) in the subject colours. The
//    tab is sent with app.js's own admin.legacy request, so search, the status switch, the KPIs and the
//    review queue all follow it; a name with courses in two subjects shows in both tabs.
//  - รายรับรายจ่าย → รายรับ (admins): edit amount / note, or delete an income row; rows that look like the
//    same purchase recorded twice are flagged. Everything reads the same Payment rows, so an edit shows up
//    on ภาพรวม, the per-subject totals and teacher shares at once.
(function () {
  'use strict';
  var API = window.INEEDBIO_API_URL || '/api/ib';
  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ── sidebar groups ── */
  var TINT = { 'งานประจำวัน': 'g1', 'เนื้อหา': 'g2', 'การเงินและการขาย': 'g3', 'ระบบ': 'g4' };
  function groupMenu() {
    var nav = document.querySelector('nav.aside');
    if (!nav || nav.dataset.grp) return;
    nav.dataset.grp = '1';
    var box = null;
    Array.prototype.slice.call(nav.children).forEach(function (el) {
      if (el.classList.contains('agh')) {
        box = document.createElement('div');
        box.className = 'agrp ' + (TINT[el.textContent.trim()] || (/^ผู้สอน/.test(el.textContent) ? 'g2' : 'g4'));
        nav.insertBefore(box, el);
      }
      if (box) box.appendChild(el);
    });
  }

  /* ── finance: income rows ── */
  var fin = null; // last fin.summary reply (admin)
  var LG = { bio: 'ชีววิทยา', chem: 'เคมี', phys: 'ฟิสิกส์', math: 'คณิตศาสตร์' }, lg = null, csub = {};
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch (e) { return ''; } }
  var fetch0 = window.fetch;
  window.fetch = function (url, opt) {
    var body = null;
    try { if (opt && typeof opt.body === 'string' && opt.body.charAt(0) === '{') body = JSON.parse(opt.body); } catch (e) { body = null; }
    var action = body && body.action || '';
    if (action === 'admin.legacy') { // the subject tab rides along with app.js's own request
      body.data = body.data || {}; body.data.subject = ss('ib_lg_subj');
      opt = Object.assign({}, opt, { body: JSON.stringify(body) });
    }
    if (action === 'admin.legacy.import') { // show the new names: jump to their subject's tab
      var ks = {}; ((body.data && body.data.course_ids) || []).forEach(function (id) { if (csub[id]) ks[csub[id]] = 1; });
      var cur = ss('ib_lg_subj'); if (cur && !ks[cur]) ss('ib_lg_subj', Object.keys(ks).length === 1 ? Object.keys(ks)[0] : '');
    }
    var p = fetch0.call(this, url, opt);
    if (action !== 'fin.summary' && action !== 'admin.legacy' && action !== 'admin.courses') return p;
    return p.then(function (res) {
      res.clone().json().then(function (j) {
        if (!j || !j.ok) return;
        if (action === 'fin.summary') fin = j.data;
        else if (action === 'admin.legacy') lg = j.data;
        else (j.data || []).forEach(function (c) { csub[c.course_id] = c.subject; });
        schedule();
      }).catch(function () {});
      return res;
    });
  };

  /* ── นักเรียนรุ่นเก่า: subject tabs ── */
  function legacyTabs() {
    if (!/^#\/admin\/legacy/.test(location.hash) || !lg || !lg.by_subject) return;
    var amain = document.getElementById('amain'); if (!amain || amain.querySelector('.lg-tabs')) return;
    var h1 = amain.querySelector('h1'); if (!h1 || !/นักเรียนรุ่นเก่า/.test(h1.textContent)) return;
    var cur = ss('ib_lg_subj'), n = lg.by_subject;
    var tab = function (k, label) {
      return '<button type="button" role="tab" class="lg-tab' + (k ? ' s-' + k : '') + '" data-lgt="' + k + '" aria-selected="' + (cur === k) + '"' + (k && !n[k] ? ' data-empty="1"' : '') + '>' +
        (k ? '<i></i>' : '') + label + '<span class="lg-n">' + (n[k || 'all'] || 0) + '</span></button>';
    };
    var bar = document.createElement('div');
    bar.className = 'lg-tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'แยกตามวิชา');
    bar.innerHTML = tab('', 'ทั้งหมด') + Object.keys(LG).map(function (k) { return tab(k, LG[k]); }).join('');
    var head = h1.closest('.spread') || h1;
    head.parentNode.insertBefore(bar, head.nextSibling);
    if (cur && lg.claims_total > lg.claims.length) {
      var note = document.createElement('p'); note.className = 'hint';
      note.textContent = 'คิวรอยืนยันแสดงเฉพาะวิชา' + LG[cur] + ' · ทุกวิชามี ' + lg.claims_total + ' คำขอ';
      bar.parentNode.insertBefore(note, bar.nextSibling);
    }
    // subject dots next to each name's courses
    var t = amain.querySelector('table'), rows = t && t.tBodies[0] ? t.tBodies[0].rows : [];
    if (rows.length === (lg.list || []).length) Array.prototype.forEach.call(rows, function (tr, i) {
      var subs = lg.list[i].subjects || []; if (!subs.length || !tr.cells[1]) return;
      var d = document.createElement('div'); d.className = 'lg-subs';
      d.innerHTML = subs.map(function (k) { return '<span class="lg-sj s-' + k + '">' + LG[k] + '</span>'; }).join('');
      tr.cells[1].appendChild(d);
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lgt]'); if (!b) return;
    ss('ib_lg_subj', b.dataset.lgt);
    var again = document.querySelector('#amain [data-lgs][aria-pressed="true"]') || document.querySelector('#amain [data-lgs]');
    if (again) again.click(); // app.js redraws the page (and asks admin.legacy again, now with this subject)
  });
  function call(action, data) {
    return fetch0(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: data, token: ls('ib_token'), device_id: ls('ib_device') }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.message || 'ทำรายการไม่สำเร็จ'); return j.data; });
  }
  function incomeTable() {
    var amain = document.getElementById('amain');
    if (!amain) return null;
    return Array.prototype.filter.call(amain.querySelectorAll('table'), function (t) { return /เข้าบัญชี/.test(t.tHead ? t.tHead.textContent : ''); })[0] || null;
  }
  function decorateIncome() {
    if (!fin || !fin.admin || !/^#\/admin\/finance/.test(location.hash)) return;
    var t = incomeTable(); if (!t || t.dataset.ed) return;
    var rows = t.tBodies[0] ? t.tBodies[0].rows : [];
    if (rows.length !== (fin.income || []).length) return;
    t.dataset.ed = '1';
    var hr = t.tHead.rows[0]; hr.appendChild(document.createElement('th'));
    Array.prototype.forEach.call(rows, function (tr, i) {
      var x = fin.income[i], td = document.createElement('td');
      td.style.whiteSpace = 'nowrap';
      if (x.dup_of) {
        var b = document.createElement('span');
        b.className = 'badge b-wait'; b.title = 'นักเรียนคนนี้มีรายรับของคอร์สนี้มากกว่า 1 รายการ อาจบันทึกซ้ำ';
        b.textContent = 'อาจซ้ำ'; tr.cells[3].appendChild(document.createTextNode(' ')); tr.cells[3].appendChild(b);
      }
      if (!fin.closed) td.innerHTML = '<button class="pill quiet s" data-ied="' + i + '">แก้ไข</button>';
      tr.appendChild(td);
    });
    if (fin.closed) {
      var p = document.createElement('p'); p.className = 'hint'; p.textContent = 'เดือนนี้ปิดงวดแล้ว แก้ไข/ลบรายรับได้หลังกด "เปิดงวด" ของเดือนนี้';
      t.parentNode.parentNode.insertBefore(p, t.parentNode);
    }
  }
  function money(n) { return '฿' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function editModal(x) {
    var m = document.getElementById('modal'); if (!m) return;
    m.innerHTML = '<div class="scrim" data-close="1"><div class="modal" role="dialog" aria-modal="true">' +
      '<div class="mx"><div class="stack" style="gap:4px"><h2>แก้ไขรายรับ</h2><p class="ink2 sm">' + esc(x.student) + ' · ' + esc(x.course_title) + (x.order_number ? ' · ' + esc(x.order_number) : '') + '</p></div><button class="x" data-close="1" aria-label="ปิด">×</button></div>' +
      '<form class="form" id="ied">' +
      '<label class="f" for="ied-a">จำนวนเงิน (บาท)<input class="i" id="ied-a" inputmode="decimal" value="' + esc(x.amount) + '"><span class="hint">ใส่ 0 = ไม่นับเป็นรายรับ (นักเรียนยังมีสิทธิ์เรียนเหมือนเดิม)</span></label>' +
      '<label class="f" for="ied-n">หมายเหตุ<input class="i" id="ied-n" value="' + esc(x.note || '') + '" placeholder="เช่น โอนเกิน คืนเงินส่วนต่างแล้ว"></label>' +
      (x.dup_of ? '<div class="note wait">รายการนี้อาจซ้ำกับรายรับอีกรายการของนักเรียนคนเดียวกันในคอร์สนี้ ถ้าซ้ำจริงให้กด "ลบรายการนี้"</div>' : '') +
      '<p class="err" id="ied-err" hidden></p>' +
      '<div class="rowx" style="justify-content:space-between"><button type="button" class="pill danger quiet" id="ied-del">ลบรายการนี้</button><button class="pill">บันทึก</button></div></form></div></div>';
    var f = m.querySelector('#ied'), er = m.querySelector('#ied-err');
    var fail = function (e) { er.textContent = e.message; er.hidden = false; };
    var done = function (msg) { m.innerHTML = ''; reload(msg); };
    f.onsubmit = function (e) {
      e.preventDefault(); er.hidden = true;
      call('fin.income.save', { enroll_id: x.enroll_id, amount: m.querySelector('#ied-a').value, note: m.querySelector('#ied-n').value }).then(function () { done('บันทึกแล้ว'); }).catch(fail);
    };
    m.querySelector('#ied-del').onclick = function () {
      var only = !x.dup_of;
      if (!window.confirm(only
        ? 'ลบรายรับ ' + money(x.amount) + ' ของ ' + x.student + ' ออกจากบัญชีรายรับ?\n\nนักเรียนยังเข้าเรียนคอร์สนี้ได้เหมือนเดิม (บันทึกเป็นสิทธิ์ที่ไม่นับเงิน) ถ้าต้องการเอาสิทธิ์ออกด้วย ให้ใช้ "ถอนสิทธิ์" ในหน้าคอร์ส'
        : 'ลบรายการที่ซ้ำนี้ (' + money(x.amount) + ')? อีกรายการของนักเรียนคนนี้ยังอยู่')) return;
      call('fin.income.delete', { enroll_id: x.enroll_id }).then(function (r) { done(r && r.kept_access ? 'ลบออกจากรายรับแล้ว นักเรียนยังมีสิทธิ์เรียน' : 'ลบรายการแล้ว'); }).catch(fail);
    };
  }
  function reload(msg) {
    var b = document.querySelector('#amain [data-ft="income"]');
    fin = null;
    if (b) b.click(); else window.dispatchEvent(new HashChangeEvent('hashchange'));
    if (msg) setTimeout(function () { var t = document.getElementById('toasts'); if (!t) return; var d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; t.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }, 300);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ied]');
    if (!b || !fin) return;
    e.preventDefault();
    editModal(fin.income[Number(b.dataset.ied)]);
  });

  var css = document.createElement('style');
  css.textContent =
    ':root{--ag1:#eef4ff;--ag2:#ecf7f0;--ag3:#fff5e6;--ag4:#f3f3f1}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ag1:#131b2b;--ag2:#11231a;--ag3:#2a1f10;--ag4:#1a1a1a}}' +
    ':root[data-theme="dark"]{--ag1:#131b2b;--ag2:#11231a;--ag3:#2a1f10;--ag4:#1a1a1a}' +
    '.aside .agrp{display:flex;flex-direction:column;gap:2px;border-radius:16px;padding:8px 6px;margin:0 0 10px}' +
    '.aside .agrp.g1{background:var(--ag1)} .aside .agrp.g2{background:var(--ag2)} .aside .agrp.g3{background:var(--ag3)} .aside .agrp.g4{background:var(--ag4)}' +
    '.aside .agrp .agh{padding:8px 10px 6px} .aside .agrp a.on{background:var(--bg)}' +
    '@media (max-width:780px){.aside .agrp{flex-direction:row;margin:0 8px 0 0;padding:4px;flex:none}}' +
    '.lg-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin:4px 0 2px;scrollbar-width:none} .lg-tabs::-webkit-scrollbar{display:none}' +
    '.lg-tab{flex:none;display:inline-flex;align-items:center;gap:8px;border:0;background:none;padding:10px 14px 11px;margin-bottom:-1px;border-bottom:3px solid transparent;font:inherit;font-size:15px;color:var(--ink2);cursor:pointer;white-space:nowrap}' +
    '.lg-tab i{width:9px;height:9px;border-radius:50%;background:var(--acc)} .lg-tab:hover{color:var(--ink)}' +
    '.lg-tab[aria-selected="true"]{color:var(--acc);font-weight:600;border-bottom-color:var(--acc)} .lg-tab:not(.s-bio):not(.s-chem):not(.s-phys):not(.s-math)[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--ink)}' +
    '.lg-n{font-family:var(--mono);font-size:12px;line-height:20px;padding:0 7px;border-radius:99px;background:var(--bg2);color:var(--ink2)} .lg-tab[aria-selected="true"] .lg-n{background:var(--acc-soft);color:var(--acc)}' +
    '.lg-tab[data-empty] {opacity:.55}' +
    '.lg-subs{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px} .lg-sj{font-size:11.5px;font-weight:600;color:var(--acc);background:var(--acc-soft);border-radius:99px;padding:1px 8px}';
  document.head.appendChild(css);

  var t = 0;
  function schedule() { clearTimeout(t); t = setTimeout(function () { groupMenu(); decorateIncome(); legacyTabs(); }, 20); }
  function start() { new MutationObserver(schedule).observe(document.getElementById('app') || document.body, { childList: true, subtree: true }); schedule(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// Admin-only order numbers (BIO-0001, CHEM-0001, ...) for public/ineedbio/app.js, which must stay
// byte-identical to the zip (CHECKSUMS.txt). Does anything only for admins; the server never sends order numbers
// to students or teachers, so there is nothing for this file to show them anyway.
//  - search card "ค้นหาเลขคำสั่งซื้อ" on #/admin/orders, #/admin/requests, #/admin/finance
//  - badge with the number next to each row of: สิทธิ์เข้าเรียน, คำสั่งซื้อ (approved bills), รายรับ, นักเรียนในคอร์ส
(function () {
  'use strict';
  var byEnroll = {}, byBill = {}, income = null;
  // app.js keeps its state private, so learn the role from its own `me` / sign-in responses (tied to the token).
  // Several roles at once: `roles` (e.g. ["admin","teacher"]); older replies only have `role`.
  var who = { token: '', admin: false };
  function adminOf(u) { return !!u && (Array.isArray(u.roles) ? u.roles.indexOf('admin') >= 0 : u.role === 'admin'); }

  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function isAdmin() { return who.admin && !!who.token && who.token === ls('ib_token'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Remember the numbers the admin endpoints return (app.js drops fields it does not know).
  function remember(action, data) {
    if (!data) return;
    var rows = action === 'fin.summary' ? data.income : Array.isArray(data) ? data : null;
    if (action === 'fin.summary') income = data.income || null;
    if (rows) rows.forEach(function (r) {
      if (r && r.enroll_id && r.order_number) byEnroll[r.enroll_id] = r.order_number;
      if (r && r.bill_id && r.order_numbers && r.order_numbers.length) byBill[r.bill_id] = r.order_numbers;
    });
  }
  var fetch0 = window.fetch;
  window.fetch = function (url, opt) {
    var p = fetch0.apply(this, arguments), body = {};
    try { if (opt && typeof opt.body === 'string' && opt.body.charAt(0) === '{') body = JSON.parse(opt.body) || {}; } catch (e) { body = {}; }
    var action = String(body.action || ''), staff = /^(admin|fin|staff)\./.test(action);
    return p.then(function (res) {
      res.clone().json().then(function (j) {
        if (!j || !j.ok || !j.data) return;
        if (action === 'me') who = { token: body.token || '', admin: adminOf(j.data) };
        else if (j.data.token && j.data.user) who = { token: j.data.token, admin: adminOf(j.data.user) };
        else if (staff && isAdmin()) remember(action, j.data);
        if (!isAdmin()) { byEnroll = {}; byBill = {}; income = null; }
        schedule();
      }).catch(function () {});
      return res;
    });
  };

  function tag(nums) {
    var s = document.createElement('span');
    s.className = 'ibon';
    s.title = 'เลขคำสั่งซื้อ (เห็นเฉพาะแอดมิน)';
    s.textContent = [].concat(nums).join(', ');
    return s;
  }
  function badge(td, nums) {
    if (!td || !nums || td.querySelector('.ibon')) return;
    td.appendChild(document.createTextNode(' '));
    td.appendChild(tag(nums));
  }
  function decorate() {
    var amain = document.getElementById('amain');
    if (!amain || !isAdmin()) return;
    Array.prototype.forEach.call(amain.querySelectorAll('[data-slip],[data-rv]'), function (b) {
      var tr = b.closest('tr'); if (tr) badge(tr.cells[0], byEnroll[b.dataset.slip || b.dataset.rv]);
    });
    Array.prototype.forEach.call(amain.querySelectorAll('button[data-bill]'), function (b) {
      var tr = b.closest('tr'); if (tr) badge(tr.cells[0], byBill[b.dataset.bill]);
    });
    // รายรับ table: rows follow fin.summary's income order.
    if (income && /#\/admin\/finance/.test(location.hash)) {
      var th = Array.prototype.filter.call(amain.querySelectorAll('table'), function (t) { return /เข้าบัญชี/.test(t.tHead ? t.tHead.textContent : ''); })[0];
      var trs = th && th.tBodies[0] ? th.tBodies[0].rows : [];
      if (trs.length === income.length) Array.prototype.forEach.call(trs, function (tr, i) { badge(tr.cells[1], income[i].order_number || null); });
    }
    searchCard(amain);
  }

  var last = { q: '', html: '' };
  function searchCard(amain) {
    if (!/^#\/admin\/(orders|requests|finance)\b/.test(location.hash) || document.getElementById('ibo')) return;
    var h1 = amain.querySelector('h1'); if (!h1) return;
    var box = document.createElement('form');
    box.className = 'card form'; box.id = 'ibo'; box.style.marginBottom = '4px';
    box.innerHTML = '<div class="spread"><h3 style="font-size:16px">ค้นหาเลขคำสั่งซื้อ</h3><span class="sm muted">เห็นเฉพาะแอดมิน นักเรียนไม่เห็นเลขนี้</span></div>' +
      '<div class="rowx"><input class="i" id="ibo-q" style="flex:1;min-width:180px" placeholder="เช่น BIO-0042, ชื่อ, อีเมล หรือชื่อคอร์ส" value="' + esc(last.q) + '"><button class="pill s">ค้นหา</button></div>' +
      '<p class="err" id="ibo-err" hidden></p><div id="ibo-out">' + last.html + '</div>';
    var host = h1.closest('.spread') || h1;
    host.parentNode.insertBefore(box, host.nextSibling);
    box.onsubmit = function (e) {
      e.preventDefault();
      var q = document.getElementById('ibo-q').value.trim(), out = document.getElementById('ibo-out'), er = document.getElementById('ibo-err');
      er.hidden = true; last.q = q;
      if (!q) { out.innerHTML = last.html = ''; return; }
      out.innerHTML = '<p class="sm muted">กำลังค้นหา…</p>';
      fetch0(window.INEEDBIO_API_URL || '/api/ib', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'admin.orders.search', data: { q: q }, token: ls('ib_token'), device_id: ls('ib_device') }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.ok) throw new Error(j.message || 'ค้นหาไม่สำเร็จ');
          out.innerHTML = last.html = results(j.data);
        })
        .catch(function (x) { out.innerHTML = ''; er.textContent = x.message || 'เชื่อมต่อไม่ได้'; er.hidden = false; });
    };
  }
  var ST = { pending: ['b-wait', 'รอตรวจ'], approved: ['b-ok', 'อนุมัติ'], rejected: ['b-no', 'ปฏิเสธ'], revoked: ['b-no', 'ถอนสิทธิ์'] };
  function results(list) {
    if (!list.length) return '<p class="sm muted">ไม่พบรายการ</p>';
    return '<div class="tbl"><table style="min-width:640px"><thead><tr><th>เลขคำสั่งซื้อ</th><th>นักเรียน</th><th>คอร์ส</th><th>สถานะ</th><th class="num">ยอด</th></tr></thead><tbody>' + list.map(function (r) {
      var st = ST[r.status] || ['b-soft', r.status], d = new Date(r.created_at);
      return '<tr><td><span class="ibon">' + esc(r.order_number || '–') + '</span><div class="sub">' + (isNaN(d) ? '' : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })) + '</div></td>' +
        '<td>' + esc(r.student) + (r.nickname ? ' (' + esc(r.nickname) + ')' : '') + '<div class="sub">' + esc(r.email) + '</div></td>' +
        '<td>' + esc(r.course_title) + '<div class="sub">' + esc(r.source_label) + (r.bill_id ? ' · ' + esc(r.bill_id) : '') + '</div></td>' +
        '<td><span class="badge ' + st[0] + '">' + esc(st[1]) + '</span></td><td class="num">฿' + Number(r.amount || 0).toLocaleString() + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  var css = document.createElement('style');
  css.textContent = '.ibon{display:inline-block;font:600 11.5px/1.5 var(--mono,ui-monospace,monospace);letter-spacing:.02em;padding:0 7px;border-radius:6px;border:1px solid var(--line);background:var(--bg2);color:var(--ink2);white-space:nowrap;vertical-align:1px}';
  document.head.appendChild(css);

  var t = 0;
  function schedule() { clearTimeout(t); t = setTimeout(decorate, 30); }
  function start() {
    var app = document.getElementById('app') || document.body;
    new MutationObserver(function () { if (isAdmin() && /^#\/admin/.test(location.hash)) schedule(); }).observe(app, { childList: true, subtree: true });
    window.addEventListener('hashchange', schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

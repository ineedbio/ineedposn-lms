// "+ เพิ่มสิทธิ์ให้ผู้ใช้เอง": pick several courses at once instead of one. public/ineedbio/app.js must stay
// byte-identical to the zip (CHECKSUMS.txt), so this swaps the course <select> of its form (#gf) for a
// checklist and sends the picks as course_id "a,b,c" (admin.grant accepts a list).
(function () {
  'use strict';
  var meta = {};

  // Subject / status of each course, from the admin.courses reply the form is built from.
  var fetch0 = window.fetch;
  window.fetch = function (url, opt) {
    var p = fetch0.apply(this, arguments), action = '';
    try { if (opt && typeof opt.body === 'string' && opt.body.charAt(0) === '{') action = JSON.parse(opt.body).action || ''; } catch (e) { action = ''; }
    if (action !== 'admin.courses') return p;
    return p.then(function (res) {
      res.clone().json().then(function (j) { if (j && j.ok && Array.isArray(j.data)) j.data.forEach(function (c) { meta[c.course_id] = c; }); }).catch(function () {});
      return res;
    });
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function upgrade(form) {
    var sel = form.querySelector('select[name="course_id"]');
    if (!sel || form.querySelector('#gm-list')) return;
    var box = sel.closest('label') || sel;
    var list = Array.prototype.map.call(sel.options, function (o) {
      var m = meta[o.value] || {};
      return { id: o.value, title: m.title || o.textContent, subject: m.subject_name || m.subject || '', draft: m.status ? m.status !== 'published' : false };
    }).filter(function (c) { return c.title.indexOf('ฉบับร่างเก่า') < 0; }); // merged duplicates: grant the published course instead
    list.sort(function (a, b) { return (a.subject > b.subject ? 1 : a.subject < b.subject ? -1 : 0) || (a.draft - b.draft); });

    var groups = [], html = '';
    list.forEach(function (c) { if (groups.indexOf(c.subject) < 0) groups.push(c.subject); });
    groups.forEach(function (g) {
      html += (g ? '<span class="gm-g">' + esc(g) + '</span>' : '') + list.filter(function (c) { return c.subject === g; }).map(function (c) {
        return '<label class="gm-c" data-t="' + esc((c.title + ' ' + c.id + ' ' + g).toLowerCase()) + '"><input type="checkbox" value="' + esc(c.id) + '"><span>' + esc(c.title) + '</span>' + (c.draft ? '<span class="badge b-soft">ร่าง</span>' : '') + '</label>';
      }).join('');
    });

    var wrap = document.createElement('div');
    wrap.className = 'f';
    wrap.innerHTML = '<div class="spread"><span>คอร์ส (เลือกได้หลายคอร์ส)</span><span class="sm muted" id="gm-n">ยังไม่ได้เลือก</span></div>' +
      '<input class="i" id="gm-q" placeholder="ค้นหาคอร์ส" autocomplete="off">' +
      '<div id="gm-list">' + (html || '<p class="sm muted">ไม่มีคอร์ส</p>') + '</div>' +
      '<input type="hidden" name="course_id" id="gm-v" value="">';
    box.parentNode.insertBefore(wrap, box);
    box.style.display = 'none';
    sel.removeAttribute('name'); // the hidden input carries the picks now

    var v = wrap.querySelector('#gm-v'), n = wrap.querySelector('#gm-n'), q = wrap.querySelector('#gm-q');
    function sync() {
      var ids = Array.prototype.filter.call(wrap.querySelectorAll('#gm-list input'), function (x) { return x.checked; }).map(function (x) { return x.value; });
      v.value = ids.join(',');
      n.textContent = ids.length ? 'เลือกแล้ว ' + ids.length + ' คอร์ส' : 'ยังไม่ได้เลือก';
    }
    wrap.querySelector('#gm-list').addEventListener('change', sync);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase();
      Array.prototype.forEach.call(wrap.querySelectorAll('.gm-c'), function (l) { l.style.display = !t || l.dataset.t.indexOf(t) >= 0 ? '' : 'none'; });
      Array.prototype.forEach.call(wrap.querySelectorAll('.gm-g'), function (h) {
        var el = h.nextElementSibling, any = false;
        while (el && el.classList.contains('gm-c')) { if (el.style.display !== 'none') any = true; el = el.nextElementSibling; }
        h.style.display = any ? '' : 'none';
      });
    });
    sync();
  }

  var css = document.createElement('style');
  css.textContent = '#gm-list{max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:6px;margin-top:6px;background:var(--bg)}' +
    '.gm-g{display:block;font-size:12px;font-weight:600;color:var(--muted);padding:8px 8px 4px}' +
    '.gm-c{display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;font-size:14.5px;color:var(--ink)}' +
    '.gm-c:hover{background:var(--bg2)} .gm-c input{width:18px;height:18px;flex:none;accent-color:var(--acc,currentColor)} .gm-c span:not(.badge){flex:1}';
  document.head.appendChild(css);

  var t = 0;
  function scan() { clearTimeout(t); t = setTimeout(function () { var f = document.getElementById('gf'); if (f) upgrade(f); }, 20); }
  function start() { new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); scan(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

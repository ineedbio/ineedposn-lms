/* INeedBio UI v2 รอบ 4 + hotfix เครื่องเล่น (r4h) · ความชัดอัตโนมัติ เพดาน 1080p บนมือถือ ไม่มีกระจกในเครื่องเล่น iframe ตัวเดียว */
/* ═══════════ ตั้งค่า: วาง URL ของ Apps Script Web App ที่นี่ ═══════════ */
var API_URL = window.INEEDBIO_API_URL || 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
/* ฟีเจอร์ที่ยังไม่เปิดบนเว็บจริง (ต้องมี route ฝั่ง backend ก่อน) — เปิดทีหลังได้ใน app/page.tsx โดยตั้ง window.INEEDBIO_FEATURES ก่อนโหลดไฟล์นี้ */
window.INEEDBIO_FEATURES = window.INEEDBIO_FEATURES || { cells: false, reviews: false, fest: false };
/* ═══════════════════════════════════════════════════════════════════ */

(function () {
'use strict';
var DEMO = !!window.__DEMO;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function baht(n) { return '฿' + Number(n || 0).toLocaleString('th-TH'); }
function hm(min) { min = Number(min) || 0; var h = Math.floor(min / 60), m = min % 60; return h ? h + ' ชม.' + (m ? ' ' + m + ' นาที' : '') : m + ' นาที'; }
function thDate(iso, time) {
  if (!iso) return ''; var d = new Date(iso); if (isNaN(d)) return '';
  var s = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  return time ? s + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : s;
}
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

/* ─── theme: auto (ตามเครื่อง) / light / dark ─── */
var THEME = store('ib_theme') || 'auto';
function applyTheme() {
  var r = document.documentElement;
  if (THEME === 'auto') { if (window.__hostTheme) r.setAttribute('data-theme', window.__hostTheme); else r.removeAttribute('data-theme'); }
  else r.setAttribute('data-theme', THEME);
}
if (!window.__hostTheme && document.documentElement.getAttribute('data-theme')) window.__hostTheme = document.documentElement.getAttribute('data-theme');
applyTheme();
var ICON = {
  auto: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  light: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>'
};
function themeSwitch() {
  return '<div class="thm" role="group" aria-label="ธีม">' + [['auto', 'ตามเครื่อง'], ['light', 'ธีมสว่าง'], ['dark', 'ธีมมืด']].map(function (t) {
    return '<button data-theme-set="' + t[0] + '" aria-pressed="' + (THEME === t[0]) + '" title="' + t[1] + '" aria-label="' + t[1] + '">' + ICON[t[0]] + '</button>';
  }).join('') + '</div>';
}

/* ─── state ─── */
var S = { token: DEMO ? null : store('ib_token'), user: null, cfg: { subjects: {} }, courses: null, filter: 'all', mem: {} };
var DEVICE = store('ib_device') || (function () { var d = 'D' + Math.random().toString(36).slice(2) + Date.now().toString(36); store('ib_device', d); return d; })();
function deviceInfo() {
  var ua = navigator.userAgent, os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'อุปกรณ์อื่น';
  var br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : '';
  return os + (br ? ' · ' + br : '');
}

/* ─── API ─── */
var NET = { n: 0, t: null, w: 0 };
function netStart() {
  var b = document.getElementById('topbar'); if (!b) return;
  if (NET.n++ === 0) { clearTimeout(NET.t); NET.w = 8; b.style.transition = 'none'; b.style.width = '0'; b.offsetWidth; b.style.transition = ''; b.classList.add('on'); b.style.width = NET.w + '%';
    NET.tick = setInterval(function () { NET.w += (90 - NET.w) * 0.12; b.style.width = NET.w + '%'; }, 250); }
}
function netEnd() {
  var b = document.getElementById('topbar'); if (!b) return;
  if (--NET.n <= 0) { NET.n = 0; clearInterval(NET.tick); b.style.width = '100%'; NET.t = setTimeout(function () { b.classList.remove('on'); }, 350); }
}
function api(action, data) {
  netStart();
  var payload = { action: action, data: data || {}, token: S.token, device_id: DEVICE, device_info: deviceInfo() };
  var p = DEMO
    ? new Promise(function (r) { setTimeout(function () { r(window.__DEMO.call(payload)); }, 220); })
    : fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .catch(function () { return { ok: false, error: 'NETWORK', message: 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่' }; });
  return p.then(function (res) { netEnd(); return res; }, function (e) { netEnd(); throw e; }).then(function (res) {
    if (res.ok) return res.data;
    if ((res.error === 'SESSION_REPLACED' || res.error === 'AUTH' || res.error === 'BANNED') && S.token) {
      signOut(true);
      if (res.error !== 'AUTH') showNotice(res.error === 'BANNED' ? 'บัญชีถูกระงับ' : 'ออกจากระบบแล้ว', res.message);
    }
    var e = new Error(res.message || 'เกิดข้อผิดพลาด'); e.code = res.error; throw e;
  });
}
function isStaff() { return !!S.user && (S.user.role === 'admin' || S.user.role === 'teacher'); }
function isAdm() { return !!S.user && S.user.role === 'admin'; }
function mySubj() { var all = Object.keys(S.cfg.subjects || {}); return isAdm() ? all : all.filter(function (k) { return (S.user.subjects || []).indexOf(k) >= 0; }); }
function setSession(r) { S.cells = null; S.token = r.token; S.user = r.user; S.photo = null; if (!DEMO) store('ib_token', r.token); S.mem = {}; }
function signOut(silent) {
  if (S.token && !silent) api('logout').catch(function () {});
  S.token = null; S.user = null; S.mem = {}; S.cells = null; if (!DEMO) store('ib_token', null);
  if (!silent) { toast('ออกจากระบบแล้ว'); go('/'); } else route();
}

/* ─── UI helpers ─── */
function toast(msg, bad) {
  var el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.setAttribute('role', 'status'); el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 260); }, 3000);
}
function go(path) { if (location.hash === '#' + path) route(); else location.hash = path; }
function busy(btn, on) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>'; }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}
function openModal(html, wide, onClose) {
  $('#modal').innerHTML = '<div class="scrim" data-close="1"><div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
  hydrateAv($('#modal'));
  S.modalClose = onClose || null; S.modalDirty = false;
  var md = $('#modal .modal');
  md.addEventListener('input', function () { S.modalDirty = true; });
  md.addEventListener('change', function () { S.modalDirty = true; });
  var f = $('#modal input:not([type=hidden]), #modal select, #modal textarea'); if (f) setTimeout(function () { f.focus(); }, 30);
}
/* ปิดด้วยการคลิกพื้นหลัง: ต้องกดและปล่อยเมาส์บนพื้นหลังทั้งคู่ และถ้ากรอกข้อมูลไปแล้วจะไม่ปิดเอง */
function softClose() {
  if (S.modalDirty) {
    var m = $('#modal .modal'); if (m) { m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); }
    if (!$$('.toast').some(function (t) { return /มีข้อมูลที่กรอกไว้/.test(t.textContent); })) toast('มีข้อมูลที่กรอกไว้ กด ✕ ถ้าต้องการปิด'); return;
  }
  closeModal();
}
document.addEventListener('pointerdown', function (e) { S.downOnScrim = !!(e.target && e.target.classList && e.target.classList.contains('scrim')); }, true);
function closeModal() {
  var sc = $('#modal').firstElementChild;
  if (sc && !sc.classList.contains('closing')) { sc.classList.add('closing'); setTimeout(function () { if (sc.parentNode) sc.remove(); }, 200); }
  if (S.modalClose) { var f = S.modalClose; S.modalClose = null; f(); } }
function mhead(title, sub) { return '<div class="mx"><div class="stack" style="gap:4px"><h2>' + title + '</h2>' + (sub ? '<p class="ink2 sm">' + sub + '</p>' : '') + '</div><button class="x" data-close="1" aria-label="ปิด">×</button></div>'; }
function showNotice(title, msg) { openModal(mhead(esc(title)) + '<p class="ink2">' + esc(msg) + '</p><button class="pill block" data-close="1">ตกลง</button>'); }
function confirmBox(title, msg, okLabel, danger) {
  return new Promise(function (resolve) {
    openModal(mhead(esc(title)) + '<p class="ink2">' + esc(msg) + '</p><div class="rowx" style="justify-content:flex-end"><button class="pill quiet" data-close="1">ยกเลิก</button><button class="pill ' + (danger ? 'danger' : '') + '" id="cf-ok">' + esc(okLabel) + '</button></div>', false, function () { resolve(false); });
    $('#cf-ok').onclick = function () { S.modalClose = null; closeModal(); resolve(true); };
  });
}
function formData(form) { var o = {}; $$('input,select,textarea', form).forEach(function (el) { if (!el.name) return; o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); return withBirthday(o); }
function field(name, label, value, opt) {
  opt = opt || {};
  var id = 'f-' + name + (opt.idp || '');
  if (opt.options) return '<label class="f" for="' + id + '">' + label + '<select class="i" id="' + id + '" name="' + name + '">' + opt.options.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>' + (opt.hint ? '<span class="hint">' + opt.hint + '</span>' : '') + '</label>';
  if (opt.area) return '<label class="f" for="' + id + '">' + label + '<textarea class="i" id="' + id + '" name="' + name + '" placeholder="' + esc(opt.ph || '') + '">' + esc(value) + '</textarea></label>';
  var input = '<input class="i" id="' + id + '" name="' + name + '" type="' + (opt.type || 'text') + '" value="' + esc(value == null ? '' : value) + '" placeholder="' + esc(opt.ph || '') + '"' + (opt.auto ? ' autocomplete="' + opt.auto + '"' : '') + (opt.mode ? ' inputmode="' + opt.mode + '"' : '') + (opt.req ? ' required' : '') + '>';
  if (opt.type === 'password') input = '<span class="pw">' + input + '<button type="button" data-peek="' + id + '">แสดง</button></span>';
  if (opt.upload) input = '<span class="upl">' + input + '<button type="button" class="pill quiet s" data-upload="' + id + '">อัปโหลดรูป</button></span><span class="upl-prev" id="' + id + '-prev">' + (value ? '<img src="' + esc(imgSrc(value)) + '" alt="">' : '') + '</span>';
  return '<label class="f" for="' + id + '">' + label + input + (opt.hint ? '<span class="hint">' + opt.hint + '</span>' : '') + '</label>';
}
var CATSRC = 'data:image/webp;base64,UklGRoIJAABXRUJQVlA4WAoAAAAQAAAAbwAAbwAAQUxQSEEDAAABDjq2tSmSnKyszhoGocUmM7O0j/G0BMln9pgZfJZWMJLFYKPFTElxTkNBZnxi+CK/iD8jwoEkSW2z4wx1khOgu9UH2CH5NGmF/fGPScEte3DCA/dyC2LcsjMFg1+v5InkqeecccenH9p3bi7JRgsDT83Iae7NCymQ1LU3uS2Uc3FbGC0nGZIXKjIedckb7zk1tbFdR3MJ69CM0ntvXHJUxqL/HiSvvNNJ+rV0K1EGJykaydSn8hl57EuVa0RqZUhRcTw245D39usM5GWP/+xUqTOiZI8HchL6+b2E7MQHJdWtOiSYpOFETooetMbZc9+oNnWOmQbOsrXOf5/Gq16RStcLpdMw0lK3WyOvcWrUG5RixrzTv/o5N7gqqkdi1A3scBDYzgu/dbV6xhQDU0d/P/LsnxbF7CtkHMnQSYy9D33jTB5gGh4aOwgx5Z6DTq28IEgHE6crt46vuZ89uUrBlMZVG/NDX1/v5hGm8dB8xQ3d636WV5juZVrp/37hx2Xrl0I5XMhihehnm/PsKgXZuHTwaXHON03tvMM4nFOk5TTj7Sqdh5Ru5LDkP/5qmbzENDAtFeGA+yX4qTDqwBIBJrPiVaucp0R7lUNYPKA9r0beQg1ZWHg95aeq9Vch/nTKosssPTsvop8BLc0PuMYzvl2/en2JA23+iPaEq/2WKTGf23Ksa+U5QcfOa5jxBat8V7QXOMxpv+Szyv+bSNvabDvuU5T3RKVxsyY8cnO7/82Rm/qEcGktCGwMmzTlB2oQRFmWSIa09+0WQ8HGtH5XZNfpV0EQxKxYV34TjsacWeJpJUhPycrTmBLPcTgSN3Q8kkamnHe4BkVUyHLyB9eiKOgHkvlHSPooJ/kxkgaSJ3/R4ih8cTL5jCsdDKWL5L1Yupd8AEv8+0F44wzeOIo3T8DNg4jzPN46Bm+dhrYORVxn4x1HwB0n4R0H4h3nwh3H4+Up8PIwcHkmvDwaXJ4QLg+Kl+fFy2PD5enx6hBwdRa8OhJcnQyuDghX58Sr48LVqeHq8HA+AzgfBZ5PBM4HA+fzgfMxofm04HxocD47OB8hmk8SzgcK53NF8/Gi+ZTBfNhwPnM0H/1v03kCcOdBEABWUDggGgYAADAdAJ0BKnAAcAA+YS6TRyQioaElWAnwgAwJYwDTx9XxgtjvJhltuHzp/pF3kbed8hQ8m/JXwO+Jz3pLMJH8QO+uXH2F8Zj6zxQdyNxhNADyXv8TywfT/sHqS9ziHPKoKAUXd1IAr5CNy+Y80lzS/IXq3qaDSmi2zpSLDgr8Rv1gcvMEIkfoPRmmfLky9zA2oyEEkKPL5T69s8Ju239Nkarcp26rkbC39ognuU9xbeZ3TPR1RrZljiUKjihNKYpUxyMTA7/R4f/gnI04d0JPmxkdkN1TvEKF+lMnVCMaWwc/KDdAWfzINoubWWeZJOAInM9AAP7+ByL/lVH//R///9Hj///ol4zsZT0Q4TFb/tQn4mKzUHJofibft4/pl5gTD/7vXsGeOs2Hw9PuheoCDj5IkiQammDlPidBrP6aDZJkTEtyDr3dTtcIOLItbU+3/lrldoleN0QGczDJ86mttEEr3Rq46xZbfnzjbusUA7Xp4TTficGPnHU55kjH2++UyGoUPx2/8E7o9BbeMOHqUyTsRuv4bTcv+8CP9f9l40Pwp364IFupK4jY8Mctri+eKEnfJqeP2fbN5Y1Me1PMeVF4j94los7+Ies3cfL7fhLWe9anJQPXAhYoPms80kfklG0au40GETOzJ1vZ7R6d5D4Bs1Ok/XwuC0wo4DYJ9YYzFxg85qke7E4QjdLId8VuuiEXMFSN1rJejizPGARladUSD/6of0UsTmyMqgHWE9jrv0RafPZDosq8oJ06oQV7npI6OFDpCPKSSX0ltUN3Nw0Weg3K5cQMhkcoYvKyEZAhyRlW3JNBvRqyDXv345K79Thzee+yBu3YBe/TGRlpmLtmU5lftb+ULQIO1btGntE6JM9FYGmt/J+wp2O6auhk++KtfXzlgYRTXu76fgcOpWA1ESge44KMVKMNwf2nlWBbjaGZOdFh+OJ5dZKWhTyWykDV5b+7zYq6IspKDKJ0aR8uyXPkC++infZc/PV3SFG1VpjuZfG54fWvTzCjqOBGwBnTWDIUnOwUuaAgukV8Twv56BJiO/IYEBs5Y8npZ5nVQwVGdVvzhYt6fWBDaYUOqZ4DifkRwVgtBKk5ukNMq6UIHuyc+uHqh79YvRTwy1ggN5xtOK4UNWNNyBARh8XvSgzG5v0b3xD1UJzelsTVtCXb3AZyIhsUmP3h0fWOGnt6BKTUCn8ixhRIxrk74TtTYE2AQMZQIg7uIRXs7GSy11pDQn0KNBntcmAC3soixQuiB4yh+NrS4LTJ4VahsgLb+tocFHyPfnrTbybGA3XkUTFwhwbZenuQ93gwMo0yonkzQ8dmUOrxGdH0kmkb4bwHxFVXSvhFbH4PgJRsOIrqAguLHsqzp8x3rfz3hZfWNrXvMr8zv/5nX5bEWTql1N+PPWiuIODBknTV93/r84bWsZdXi6d/Qd0PBrshwQ82YolJQCndJpvz2leVrIqS6wSAGOXZwIx9mGi3+3XnkWE6dWNFn55Amd8tj/abnQxFb7TjFZ5VQdbcpoBuPgn6aUh4yrB0uI1a2BhLHKM4CQFunfnOO3+DJIPVo0YCTdFA0iaME9eGXpYFeMBL4amzeVRcqLYXmTyHRT9mdTeFuqnVbksawcrec7GLWur9dU/2X1+x7dAelpi8+2pmOuiQMwNN4Olf32eo4yw69mtSC+Z3+P+cevNDyVQiK5olLoFq5C2OBn9GJB1CBi41u/WyA3C2FhYit8AeD5XbbT7zky4nl1oDQEduZCm0hRt+RtasMz4EeVkAL+X/aPW/UnuP3/mbTAdl2GADGOxX4/Sv5HagAuVT/HX4/MI2wgUzsU9R2SfxRaPe0Ish9Y+SbSEaJOYtJnTi20dS9XJ7/W8GKbzNONQc2H832uUTrRyJKr1uMe0yU5HuVVSHcbvapgRmtuNsy3MBNibudQm7II2F8FtoCXi/gh/Eo7i15LtJOJWSpMI8dMkGUcCfrvQ2G+0NIKqQXms0pOiF2Dlt4d64RKeH6rQaAkpPVrsA3hP/3q7iWB0GoZ1rZr//BSrlvSZ1cAt7Gc1L4V7AMCCgStIRo/2ABBV1/71Vm/wdAAAA';
var FACULTIES = ['แพทยศาสตร์', 'ทันตแพทยศาสตร์', 'เภสัชศาสตร์', 'สัตวแพทยศาสตร์', 'พยาบาลศาสตร์', 'สหเวชศาสตร์', 'เทคนิคการแพทย์', 'สาธารณสุขศาสตร์', 'วิศวกรรมศาสตร์', 'วิทยาศาสตร์', 'สถาปัตยกรรมศาสตร์', 'เทคโนโลยีสารสนเทศ', 'บัญชี', 'บริหารธุรกิจ', 'เศรษฐศาสตร์', 'นิติศาสตร์', 'รัฐศาสตร์', 'อักษรศาสตร์', 'ครุศาสตร์ / ศึกษาศาสตร์', 'นิเทศศาสตร์', 'จิตวิทยา', 'เกษตรศาสตร์', 'ยังไม่แน่ใจ'];
var UNIS = ['จุฬาลงกรณ์มหาวิทยาลัย', 'มหาวิทยาลัยมหิดล', 'มหาวิทยาลัยธรรมศาสตร์', 'มหาวิทยาลัยเกษตรศาสตร์', 'มหาวิทยาลัยเชียงใหม่', 'มหาวิทยาลัยขอนแก่น', 'มหาวิทยาลัยสงขลานครินทร์', 'มหาวิทยาลัยศรีนครินทรวิโรฒ', 'มหาวิทยาลัยนเรศวร', 'มหาวิทยาลัยศิลปากร', 'มหาวิทยาลัยบูรพา', 'มหาวิทยาลัยวลัยลักษณ์', 'มหาวิทยาลัยเทคโนโลยีสุรนารี', 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง', 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี', 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ', 'วิทยาลัยแพทยศาสตร์พระมงกุฎเกล้า', 'มหาวิทยาลัยแม่ฟ้าหลวง', 'มหาวิทยาลัยพะเยา', 'มหาวิทยาลัยมหาสารคาม', 'มหาวิทยาลัยอุบลราชธานี', 'มหาวิทยาลัยทักษิณ', 'ยังไม่แน่ใจ'];
function goalLists() { return '<datalist id="dl-fac">' + FACULTIES.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist><datalist id="dl-uni">' + UNIS.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>'; }
function isRepeat(g) { return (S.cfg.repeat_grades || ['จบ ม.6 แล้ว', 'อื่นๆ']).indexOf(g) >= 0; }
function goalFields(v) {
  v = v || {};
  var lf = function (name, label, val, list, ph) { return '<label class="f" for="f-' + name + '">' + label + '<input class="i" id="f-' + name + '" name="' + name + '" list="' + list + '" value="' + esc(val || '') + '" placeholder="' + esc(ph) + '" autocomplete="off"></label>'; };
  return goalLists() +
    '<div class="gbox" id="repeat-box"' + (isRepeat(v.grade) ? '' : ' hidden') + '><b>ตอนนี้เรียนอยู่ที่ไหน (เด็กซิ่ว)</b><span class="hint">ถ้ายังไม่ได้เรียนที่ไหน พิมพ์ว่า "ยังไม่ได้เรียน"</span><div class="row2">' +
    lf('current_faculty', 'คณะที่เรียนอยู่', v.current_faculty, 'dl-fac', 'เช่น วิศวกรรมศาสตร์') + lf('current_university', 'มหาวิทยาลัยที่เรียนอยู่', v.current_university, 'dl-uni', 'เช่น มหาวิทยาลัยเชียงใหม่') + '</div></div>' +
    '<div class="gbox"><b>เป้าหมายของน้อง</b><div class="row2">' + lf('dream_faculty', 'คณะในฝัน', v.dream_faculty, 'dl-fac', 'เช่น แพทยศาสตร์') + lf('dream_university', 'มหาวิทยาลัยในฝัน', v.dream_university, 'dl-uni', 'เช่น มหาวิทยาลัยมหิดล') + '</div></div>';
}
var TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
function contactFields(v) {
  v = v || {};
  var bd = String(v.birthday || '').split('-'), y0 = new Date().getFullYear() + 543;
  var sel = function (name, ph, opts, cur) { return '<select class="i" name="' + name + '" aria-label="' + ph + '"><option value="">' + ph + '</option>' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
  var days = [], months = TH_MONTHS.map(function (m, i) { return [pad2(i + 1), m]; }), years = [];
  for (var d = 1; d <= 31; d++) days.push([pad2(d), d]);
  for (var y = y0 - 8; y >= y0 - 60; y--) years.push([y - 543, y]);
  return '<div class="f">วันเดือนปีเกิด<div class="bd">' + sel('bd_d', 'วัน', days, bd[2]) + sel('bd_m', 'เดือน', months, bd[1]) + sel('bd_y', 'ปี พ.ศ.', years, bd[0]) + '</div></div>' +
    '<div class="gbox"><b>ช่องทางติดต่อ</b><span class="hint">กรอกอย่างน้อย 1 ช่องทาง แอดมินใช้แจ้งเรื่องคอร์สและการชำระเงิน</span>' +
    '<div class="row2">' + field('line_id', 'LINE ID', v.line_id, { ph: 'เช่น ineedbio', auto: 'off' }) + field('instagram', 'Instagram', v.instagram, { ph: 'เช่น @ineedbiochem', auto: 'off' }) + '</div>' +
    field('facebook', 'Facebook (ชื่อหรือลิงก์)', v.facebook, { ph: 'เช่น INeedBio หรือ facebook.com/...', auto: 'off' }) + '</div>';
}
function ageOf(bd) { var m = String(bd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return ''; var n = new Date(), a = n.getFullYear() - m[1]; if (n.getMonth() + 1 < +m[2] || (n.getMonth() + 1 === +m[2] && n.getDate() < +m[3])) a--; return a; }
function contactLine(u) {
  var out = [];
  if (u.birthday) { var m = u.birthday.split('-'); out.push('เกิด ' + (+m[2]) + ' ' + TH_MONTHS[+m[1] - 1].slice(0, 3) + '. ' + (+m[0] + 543) + ' (' + ageOf(u.birthday) + ' ปี)'); }
  if (u.line_id) out.push('LINE <b>' + esc(u.line_id) + '</b>');
  if (u.instagram) out.push('<a href="https://www.instagram.com/' + encodeURIComponent(u.instagram) + '" target="_blank" rel="noopener">IG @' + esc(u.instagram) + '</a>');
  if (u.facebook) out.push('<a href="' + (/^(https?:\/\/|www\.|facebook\.com|fb\.com)/i.test(u.facebook) ? esc(/^https?:/i.test(u.facebook) ? u.facebook : 'https://' + u.facebook) : 'https://www.facebook.com/search/top?q=' + encodeURIComponent(u.facebook)) + '" target="_blank" rel="noopener">FB ' + esc(u.facebook.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 30)) + '</a>');
  return out.length ? '<div class="sub ctl">' + out.join(' · ') + '</div>' : '<div class="sub" style="color:var(--wait)">ยังไม่กรอกวันเกิด/ช่องทางติดต่อ</div>';
}
/* ─── รูปถ่ายผู้เรียน + คำขอความยินยอม ─── */
var PHOTO_LOADING = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
var PERSON_SVG = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
function photoField(cur, required) {
  return '<div class="f">รูปถ่ายของน้อง<div class="phf"><button type="button" class="phbox" id="ph-pick" aria-label="เลือกรูปถ่าย">' +
    (cur ? '<img src="' + cur + '" alt="">' : PERSON_SVG + '<span>เพิ่มรูป</span>') + '</button><div class="stack" style="gap:6px">' +
    '<span class="hint">รูปไหนก็ได้ ขอแค่เป็นรูปของน้องเอง</span>' +
    '<span class="hint">แอดมินใช้ยืนยันตัวตนตอนตรวจการชำระเงินและป้องกันการแชร์บัญชี เห็นเฉพาะน้องกับแอดมิน</span>' +
    '<button type="button" class="pill quiet s" id="ph-pick2" style="justify-self:start">' + (cur ? 'เปลี่ยนรูป' : 'เลือกรูป / ถ่ายรูป') + '</button></div></div></div>';
}
function bindPhoto(root, onPick) {
  var pick = function () {
    var fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.setAttribute('capture', 'user');
    fi.onchange = function () {
      var f = fi.files && fi.files[0]; if (!f) return;
      if (!/^image\//.test(f.type)) return toast('เลือกไฟล์รูปภาพ', true);
      compressImage(f, 640, true).then(function (ph) {
        S.photo = ph; var box = $('#ph-pick', root); if (box) box.innerHTML = '<img src="data:' + ph.mime + ';base64,' + ph.base64 + '" alt="">';
        var b2 = $('#ph-pick2', root); if (b2) b2.textContent = 'เปลี่ยนรูป';
        S.modalDirty = true; if (onPick) onPick(ph);
      }).catch(function () { toast('เปิดรูปนี้ไม่ได้ ลองรูปอื่น', true); });
    };
    fi.click();
  };
  $$('#ph-pick,#ph-pick2', root).forEach(function (b) { b.onclick = pick; });
}
function consentBox(checked) {
  return '<div class="gbox"><b>ขออนุญาตเก็บข้อมูลเพิ่มเติม</b>' +
    '<span class="hint" style="line-height:1.7">นอกจากชื่อ อีเมล และเบอร์โทร INeedBio ขอเก็บข้อมูลต่อไปนี้ด้วย</span>' +
    '<ul class="cns"><li><b>รูปถ่ายของน้อง</b> ใช้ยืนยันตัวตนตอนตรวจการชำระเงิน และป้องกันการแชร์บัญชี</li>' +
    '<li><b>วันเดือนปีเกิด</b> ใช้ยืนยันตัวตนและดูว่าเนื้อหาเหมาะกับช่วงชั้นไหม</li>' +
    '<li><b>LINE / Instagram / Facebook</b> ใช้ติดต่อเรื่องคอร์สและการชำระเงิน</li>' +
    '<li><b>คณะและมหาวิทยาลัยในฝัน</b> ใช้ดูภาพรวมเพื่อพัฒนาคอร์สให้ตรงกับน้อง</li></ul>' +
    '<span class="hint" style="line-height:1.7">ข้อมูลเหล่านี้เห็นเฉพาะแอดมิน ไม่ขาย ไม่เผยแพร่ และไม่ส่งต่อให้ใคร ขอดู แก้ไข หรือลบได้ทุกเมื่อทาง IG</span>' +
    '<label class="consent"><input type="checkbox" name="accept_data"' + (checked ? ' checked' : '') + '><span>ฉันยินยอมให้ INeedBio เก็บและใช้ข้อมูลข้างต้นตามวัตถุประสงค์ที่แจ้งไว้ และถ้าอายุต่ำกว่า 20 ปี ผู้ปกครองรับทราบแล้ว</span></label></div>';
}
function withBirthday(d) {
  if ('bd_y' in d) { d.birthday = d.bd_y && d.bd_m && d.bd_d ? d.bd_y + '-' + d.bd_m + '-' + d.bd_d : ''; delete d.bd_y; delete d.bd_m; delete d.bd_d; }
  return d;
}
function bindGrade(form) {
  if (!form) return;
  var g = form.querySelector('[name=grade]'), box = form.querySelector('#repeat-box'); if (!g || !box) return;
  g.addEventListener('change', function () { box.hidden = !isRepeat(g.value); });
}
/* ─── ข้อตกลง / นโยบาย (แก้ข้อความได้ที่ หลังบ้าน → ตั้งค่า) ─── */
var LEGAL_DATE = '26 กันยายน 2569';
var DEFAULT_TERMS = [
  '# ข้อตกลงและเงื่อนไขการใช้งาน',
  'ข้อตกลงนี้ใช้กับการใช้งานเว็บไซต์ ineedbio.shop และคอร์สเรียนออนไลน์ของ INeedBio ("เรา") การสมัครสมาชิกหรือใช้งานเว็บไซต์ถือว่าผู้ใช้ได้อ่านและยอมรับข้อตกลงนี้แล้ว',
  '## 1. บัญชีผู้ใช้',
  '- ผู้ใช้ต้องกรอกข้อมูลจริงและเป็นปัจจุบัน และใช้อีเมลที่ตนเองเข้าถึงได้',
  '- บัญชีหนึ่งใช้ได้สำหรับผู้เรียน 1 คนเท่านั้น และเข้าสู่ระบบได้ครั้งละ 1 เครื่อง เมื่อเข้าสู่ระบบจากเครื่องใหม่ เครื่องเดิมจะออกจากระบบอัตโนมัติ',
  '- ผู้ใช้ต้องเก็บรหัสผ่านเป็นความลับ ห้ามให้ผู้อื่นยืมหรือใช้บัญชีร่วมกัน',
  '- หากผู้ใช้อายุต่ำกว่า 20 ปี ควรให้ผู้ปกครองรับทราบก่อนสมัครและชำระเงิน',
  '## 2. การสั่งซื้อและชำระเงิน',
  '- ราคาคอร์สเป็นไปตามที่แสดงบนเว็บไซต์ ณ เวลาที่ชำระเงิน',
  '- ผู้ใช้ใส่คอร์สลงตะกร้าแล้วยืนยันคำสั่งซื้อ หากคอร์สในตะกร้ารับเงินคนละบัญชี ระบบจะแยกเป็นหลายบิล ผู้ใช้ต้องโอนแยกตามบิล',
  '- ต้องโอนเข้าบัญชีที่แสดงในหน้าชำระเงินของแต่ละบิลเท่านั้น เราไม่รับผิดชอบทุกกรณีหากโอนเข้าบัญชีอื่น แม้จะมีผู้อ้างว่าเป็นทีมงาน',
  '- หลังโอน ผู้ใช้ต้องแนบสลิปและกรอกข้อมูลการโอนบนเว็บไซต์ แล้วแจ้งการชำระเงินทาง IG อีกครั้ง สิทธิ์เข้าเรียนจะเปิดหลังแอดมินตรวจยอดเงินแล้ว โดยปกติภายใน 24 ชั่วโมง',
  '- บิลที่ไม่ได้ส่งหลักฐานภายในเวลาที่กำหนดจะถูกยกเลิกอัตโนมัติ หากหลักฐานไม่ถูกต้องหรือยอดไม่ครบ แอดมินจะแจ้งเหตุผล และผู้ใช้ส่งหลักฐานใหม่ได้',
  '- โค้ดส่วนลดใช้ได้ 1 โค้ดต่อคำสั่งซื้อ ตามเงื่อนไขของแต่ละโค้ด และแลกเป็นเงินสดไม่ได้',
  '## 3. การคืนเงิน',
  '- ไม่มีนโยบายคืนเงินทุกกรณีเมื่อชำระเงินแล้ว',
  '## 4. สิทธิ์การเข้าเรียน',
  '- "ดูได้ตลอดชีพ" หมายถึงดูได้โดยไม่มีวันหมดอายุตลอดระยะเวลาที่ INeedBio ยังให้บริการเว็บไซต์นี้ หากต้องยุติบริการ เราจะแจ้งล่วงหน้าอย่างน้อย 30 วัน',
  '- เราอาจปรับปรุง แก้ไข หรือเรียงลำดับบทเรียนใหม่เพื่อให้เนื้อหาถูกต้องและทันสมัย',
  '## 5. ลิขสิทธิ์และการใช้เนื้อหา',
  '- คลิป ชีท โจทย์ และเอกสารทั้งหมดเป็นลิขสิทธิ์ของ INeedBio และผู้สอน ใช้ได้เพื่อการเรียนส่วนตัวเท่านั้น',
  '- ห้ามบันทึกหน้าจอ ดาวน์โหลด คัดลอก ขายต่อ แชร์ลิงก์คลิป หรือเผยแพร่เนื้อหาในรูปแบบใด ๆ โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร',
  '- คลิปมีลายน้ำระบุตัวผู้เรียน หากพบการละเมิด เราจะระงับบัญชีทันทีโดยไม่คืนเงิน และอาจดำเนินการตามกฎหมาย',
  '## 6. การระงับบัญชี',
  '- เราอาจระงับหรือยกเลิกบัญชีที่แชร์บัญชี ละเมิดลิขสิทธิ์ ใช้ข้อมูลเท็จ หรือใช้งานในลักษณะที่ก่อความเสียหายแก่เราหรือผู้อื่น',
  '## 7. ข้อจำกัดความรับผิด',
  '- เราตั้งใจทำเนื้อหาให้ถูกต้องและเป็นประโยชน์ที่สุด แต่ไม่รับประกันผลการสอบหรือการผ่านการคัดเลือก เพราะขึ้นกับหลายปัจจัยของผู้เรียน',
  '- เราไม่รับผิดชอบต่อปัญหาจากอุปกรณ์หรืออินเทอร์เน็ตของผู้ใช้ หรือการหยุดชะงักของบริการภายนอก เช่น YouTube หรือ Google',
  '## 8. การแก้ไขข้อตกลง',
  '- เราอาจแก้ไขข้อตกลงนี้เป็นครั้งคราวและจะแจ้งบนเว็บไซต์ การใช้งานต่อหลังการแก้ไขถือว่ายอมรับข้อตกลงฉบับใหม่',
  '## 9. ติดต่อเรา',
  '- Instagram: @{ig}',
  'ปรับปรุงล่าสุด: ' + LEGAL_DATE
].join('\n');
var DEFAULT_PRIVACY = [
  '# นโยบายความเป็นส่วนตัว',
  'INeedBio ("เรา") ให้ความสำคัญกับข้อมูลส่วนบุคคลของผู้ใช้ และดำเนินการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) นโยบายนี้อธิบายว่าเราเก็บข้อมูลอะไร ใช้ทำอะไร และผู้ใช้มีสิทธิ์อะไรบ้าง',
  '## 1. ข้อมูลที่เราเก็บ',
  '- ข้อมูลที่กรอกตอนสมัคร: ชื่อ นามสกุล ชื่อเล่น วันเดือนปีเกิด โรงเรียน ระดับชั้น เบอร์โทร อีเมล ช่องทางติดต่อ (LINE, Instagram, Facebook) คณะและมหาวิทยาลัยในฝัน และคณะและมหาวิทยาลัยที่เรียนอยู่ (กรณีจบ ม.6 แล้ว)',
  '- รูปถ่ายของผู้เรียน: ใช้ยืนยันตัวตนตอนตรวจการชำระเงินและป้องกันการแชร์บัญชี เห็นได้เฉพาะเจ้าของบัญชีและแอดมิน ไม่แสดงต่อผู้ใช้อื่น และไม่นำไปเผยแพร่',
  '- ข้อมูลการซื้อคอร์ส: คอร์สที่ซื้อ ยอดเงิน โค้ดส่วนลด รูปสลิป และข้อมูลการโอนที่กรอก (วันเวลาที่โอน ธนาคาร ชื่อผู้โอน)',
  '- ข้อมูลการเรียน: ตอนที่ดูจบ และความคืบหน้าในแต่ละคอร์ส',
  '- ข้อมูลการใช้งาน: รหัสอุปกรณ์ ประเภทอุปกรณ์และเบราว์เซอร์ และเวลาเข้าสู่ระบบ เพื่อใช้จำกัดการเข้าสู่ระบบ 1 เครื่อง',
  '- เราไม่เก็บรหัสผ่านจริง ระบบเก็บเฉพาะค่าที่เข้ารหัสแล้ว (hash) ซึ่งย้อนกลับเป็นรหัสผ่านไม่ได้',
  '## 2. เราใช้ข้อมูลเพื่อ',
  '- สร้างบัญชี ยืนยันตัวตนด้วยรหัส OTP และดูแลความปลอดภัยของบัญชี',
  '- ตรวจสลิป เปิดสิทธิ์เข้าเรียน และส่งอีเมลแจ้งสถานะ',
  '- บันทึกความคืบหน้าการเรียน และป้องกันการแชร์บัญชี',
  '- ติดต่อผู้ใช้เรื่องคอร์สและการเรียน',
  '- ปรับปรุงเนื้อหาและคอร์ส โดยดูภาพรวม เช่น คณะในฝันที่น้องสนใจ',
  '## 3. การเปิดเผยข้อมูล',
  '- เราไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลแก่ผู้ใด',
  '- ข้อมูลเก็บในบริการของ Google (Google Sheets, Google Drive, Gmail) ซึ่งทำหน้าที่เป็นผู้ประมวลผลข้อมูลให้เรา',
  '- เราอาจเปิดเผยข้อมูลเมื่อกฎหมายกำหนด หรือเมื่อได้รับคำสั่งจากหน่วยงานที่มีอำนาจ',
  '- ผลงานและรีวิวของน้องที่ติดค่ายหรือสอบติด จะเผยแพร่บนเว็บไซต์และสื่อของเราเมื่อได้รับอนุญาตจากน้องเท่านั้น โดยแสดงเฉพาะชื่อเล่น โรงเรียน และศูนย์สอบ',
  '## 4. ระยะเวลาเก็บข้อมูล',
  '- เราเก็บข้อมูลบัญชีตลอดระยะเวลาที่บัญชียังใช้งานอยู่ และลบหรือทำให้ระบุตัวตนไม่ได้เมื่อผู้ใช้ขอให้ลบบัญชี เว้นแต่มีกฎหมายกำหนดให้เก็บต่อ เช่น หลักฐานทางการเงิน',
  '## 5. สิทธิ์ของผู้ใช้',
  '- ขอเข้าถึง ขอสำเนา หรือขอแก้ไขข้อมูลของตนเอง (แก้ข้อมูลส่วนใหญ่ได้เองที่หน้า "ข้อมูลส่วนตัว")',
  '- ขอลบบัญชีและข้อมูล หรือขอให้หยุดใช้ข้อมูลบางส่วน',
  '- ถอนความยินยอมในการเผยแพร่รูปหรือรีวิว หรือขอลบรูปถ่ายและข้อมูลเพิ่มเติมได้ทุกเมื่อ (บางอย่าง เช่น การยืนยันตัวตนตอนชำระเงิน อาจต้องใช้วิธีอื่นแทน)',
  '- ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล หากเห็นว่าเราไม่ปฏิบัติตามกฎหมาย',
  '- ใช้สิทธิ์ได้โดยติดต่อแอดมินทาง IG เราจะตอบกลับภายใน 30 วัน',
  '## 6. ผู้ใช้ที่อายุต่ำกว่า 20 ปี',
  '- ผู้เรียนส่วนใหญ่ของเราเป็นนักเรียนมัธยม ผู้เรียนที่อายุต่ำกว่า 20 ปีควรให้ผู้ปกครองรับทราบก่อนสมัครและก่อนให้ความยินยอมเก็บรูปถ่ายและข้อมูลเพิ่มเติม ผู้ปกครองสามารถติดต่อเราเพื่อสอบถาม ขอดู หรือขอลบข้อมูลของบุตรหลานได้',
  '## 7. คุกกี้และการเก็บข้อมูลในเบราว์เซอร์',
  '- เว็บไซต์เก็บข้อมูลในเบราว์เซอร์ของผู้ใช้เท่าที่จำเป็น ได้แก่ รหัสเข้าสู่ระบบ รหัสอุปกรณ์ และธีมที่เลือก เราไม่ใช้คุกกี้โฆษณาหรือติดตามข้ามเว็บไซต์',
  '- คลิปเรียนเล่นผ่าน YouTube ซึ่งอาจเก็บข้อมูลตามนโยบายของ YouTube',
  '## 8. ติดต่อเรา',
  '- Instagram: @{ig}',
  'ปรับปรุงล่าสุด: ' + LEGAL_DATE
].join('\n');
function legalText(kind) {
  var t = (kind === 'terms' ? S.cfg.terms_text : S.cfg.privacy_text) || (kind === 'terms' ? DEFAULT_TERMS : DEFAULT_PRIVACY);
  return t.replace(/\{ig\}/g, S.cfg.contact_ig || 'ineedbiochem').replace(/\{phone\}/g, '');
}
function mdLite(t) {
  var out = [], list = false;
  t.split(/\r?\n/).forEach(function (l) {
    var line = l.trim();
    if (/^- /.test(line)) { if (!list) { out.push('<ul>'); list = true; } out.push('<li>' + esc(line.slice(2)) + '</li>'); return; }
    if (list) { out.push('</ul>'); list = false; }
    if (!line) return;
    if (/^## /.test(line)) out.push('<h3>' + esc(line.slice(3)) + '</h3>');
    else if (/^# /.test(line)) out.push('<h2>' + esc(line.slice(2)) + '</h2>');
    else out.push('<p>' + esc(line) + '</p>');
  });
  if (list) out.push('</ul>');
  return out.join('');
}
function viewLegal(kind) {
  page('legal', (UI2() ? '<div class="page-h"><span class="mono">INeedBio · ineedbio.shop</span><h1>' + (kind === 'terms' ? 'ข้อตกลงการใช้งาน' : 'นโยบายความเป็นส่วนตัว') + '</h1></div>' : '') + '<div class="legal"><div class="rowx" style="margin-bottom:10px"><a class="chip" href="#/terms" aria-pressed="' + (kind === 'terms') + '">ข้อตกลงการใช้งาน</a><a class="chip" href="#/privacy" aria-pressed="' + (kind === 'privacy') + '">นโยบายความเป็นส่วนตัว</a></div>' + mdLite(legalText(kind)) + '</div>');
}
function legalModal(kind, back) {
  openModal(mhead(kind === 'terms' ? 'ข้อตกลงการใช้งาน' : 'นโยบายความเป็นส่วนตัว') + '<div class="legal in-modal">' + mdLite(legalText(kind).replace(/^# .*\n/, '')) + '</div><button class="pill block" id="lg-back">กลับไปสมัครต่อ</button>', true, back);
  $('#lg-back').onclick = function () { S.modalClose = null; back(); };
}
var GRADES = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'จบ ม.6 แล้ว', 'อื่นๆ'];
var GLYPH = {
  bio: '<svg width="124" height="124" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2"><circle cx="60" cy="60" r="46"/><ellipse cx="66" cy="54" rx="16" ry="12"/><circle cx="68" cy="54" r="4" fill="currentColor"/><path d="M30 78c8-4 14 4 22 0M76 84c6-3 10 3 16 0M34 44c5-3 9 2 14-1"/></svg>',
  chem: '<svg width="124" height="124" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2"><path d="M60 22l30 17v34L60 90 30 73V39z"/><path d="M60 90v18M90 39l14-8M30 39l-14-8"/><circle cx="60" cy="56" r="8"/></svg>',
  phys: '<svg width="124" height="124" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 60c10-30 20-30 30 0s20 30 30 0 20-30 30 0"/><path d="M12 100h96M12 100V20"/></svg>',
  math: '<svg width="124" height="124" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 100h92M20 106V14"/><path d="M20 96C44 94 60 80 72 56S96 20 106 18"/><circle cx="72" cy="56" r="3" fill="currentColor"/></svg>'
};
function imgSrc(u) { return DEMO && window.__DEMO.img ? window.__DEMO.img(u) : u; }
var SHORT = { bio: 'ชีวะ', chem: 'เคมี', phys: 'ฟิสิกส์', math: 'คณิต' };
function cover(c, tile) {
  var extra = tile ? (c.full_price > c.price ? '<span class="off">ลด ' + baht(c.full_price - c.price) + '</span>' : '') + (c.level ? '<span class="lv">' + esc(c.level) + '</span>' : '') : '';
  return c.cover_url ? '<span class="cover"><img src="' + esc(imgSrc(c.cover_url)) + '" alt="" loading="lazy" onerror="this.remove()">' + extra + '</span>' : '<span class="cover typo"><small>INeedBio</small><b>' + esc(SHORT[c.subject] || c.subject_name) + '</b>' + extra + '</span>';
}
function glyph(c) { return c.cover_url ? '<img src="' + esc(c.cover_url) + '" alt="" loading="lazy" onerror="this.remove()">' : (GLYPH[c.subject] || GLYPH.bio); }
function statusBadge(s) {
  return s === 'approved' ? '<span class="badge b-ok">เรียนได้แล้ว</span>' : s === 'pending' ? '<span class="badge b-wait">รอตรวจสลิป</span>' : s === 'rejected' ? '<span class="badge b-no">สลิปไม่ผ่าน</span>' : '';
}
function initials(u) { return esc((u.nickname || u.first_name || '?').slice(0, 1)); }

/* ─── layout ─── */
function header(active) {
  var u = S.user;
  var nav = [['/', 'คอร์สทั้งหมด', 'home'], ['/results', 'ผลงานน้องๆ', 'results']];
  if (u) nav.push(['/my', 'คอร์สของฉัน', 'my']);
  if (u && (u.role === 'admin' || u.role === 'teacher')) nav.push(['/admin', u.role === 'teacher' ? 'หลังบ้านผู้สอน' : 'หลังบ้าน', 'admin']);
  var right = u
    ? '<div class="who"><button id="who-btn" aria-haspopup="true" aria-expanded="false">' + uAv(u.user_id, u.has_photo, 'av') + '<span class="sm">' + esc(u.nickname) + '</span></button>' +
      '<div class="menu" id="who-menu" hidden><div class="hd"><b>' + esc(u.first_name + ' ' + u.last_name) + '</b><div class="muted">' + esc(u.email) + '</div></div>' +
      '<a href="#/my">คอร์สของฉัน</a><a href="#/orders">คำสั่งซื้อ</a><a href="#/profile">ข้อมูลส่วนตัว</a>' + (u.role === 'admin' || u.role === 'teacher' ? '<a href="#/admin">' + (u.role === 'teacher' ? 'หลังบ้านผู้สอน' : 'หลังบ้าน') + '</a>' : '') + '<button data-act="logout">ออกจากระบบ</button></div></div>'
    : '<div class="rowx"><button class="pill ghost s" data-act="login">เข้าสู่ระบบ</button><button class="pill s" data-act="signup">สมัครสมาชิก</button></div>';
  var mnav = '<nav class="mnav" aria-label="เมนู">' + nav.map(function (n) { return '<a href="#' + n[0] + '" class="' + (active === n[2] ? 'on' : '') + '">' + n[1] + '</a>'; }).join('') + (u ? '<a href="#/profile" class="' + (active === 'profile' ? 'on' : '') + '">บัญชี</a>' : '') + '</nav>';
  document.body.classList.toggle('has-mnav', !!u);
  var fe = festOn();
  return (fe ? '<div class="fest-bar">' + esc(FESTS[fe].bar) + '</div>' : S.cfg.announcement ? '<div class="ann">' + esc(S.cfg.announcement) + '</div>' : '') +
    '<header class="hdr gut"><div class="w"><a class="logo" href="#/"><img src="' + CATSRC + '" alt=""><span>INeed<span>Bio</span></span></a><nav class="nav">' +
    nav.map(function (n) { return '<a href="#' + n[0] + '" class="' + (active === n[2] ? 'on' : '') + '">' + n[1] + '</a>'; }).join('') + '</nav>' +
    '<form class="srch" id="srch" role="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="srch-q" name="q" placeholder="ค้นหาคอร์ส เช่น ชีวะ, A-Level" value="' + esc(S.q || '') + '" autocomplete="off"></form><div class="hr">' + themeSwitch() + cellChip() + cartBtn() + right + '</div></div></header>' + (u ? mnav : '');
}
function footer() {
  var ig = S.cfg.contact_ig || 'ineedbiochem', cs = S.courses || [];
  var subs = S.cfg.subjects || {};
  var lessons = cs.reduce(function (a, c) { return a + (c.lesson_count || 0); }, 0), mins = cs.reduce(function (a, c) { return a + (c.total_min || 0); }, 0);
  return '<footer class="bigfoot gut"><div class="w"><div><div class="brand"><img src="' + CATSRC + '" alt="">INeedBio</div>' +
    '<p>ติวออนไลน์สำหรับน้อง ม.ปลาย เตรียมสอบ สอวน. และ A-Level เรียนผ่านคลิป ดูซ้ำได้ตลอด มีชีทประกอบทุกบท</p>' +
    (cs.length ? '<div class="stat"><div><b>' + cs.length + '</b><span>คอร์สที่เปิดอยู่</span></div><div><b>' + lessons + '</b><span>ตอน</span></div><div><b>' + Math.round(mins / 60) + '</b><span>ชั่วโมงคลิปเรียน</span></div></div>' : '') + '</div>' +
    '<div><h4>คอร์สเรียน</h4><ul>' + Object.keys(subs).map(function (k) { return '<li><a href="#/" data-fsub="' + k + '">' + esc(subs[k]) + '</a></li>'; }).join('') + '</ul></div>' +
    '<div><h4>ติดต่อ</h4><ul><li><a href="https://www.instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">IG @' + esc(ig) + '</a></li>' + '</ul></div>' +
    '<div class="copy">© ' + new Date().getFullYear() + ' INeedBio · ineedbio.shop · <a href="#/terms">ข้อตกลงการใช้งาน</a> · <a href="#/privacy">นโยบายความเป็นส่วนตัว</a></div></div></footer>';
}

function setSubj(s, ac) { S.wantSubj = s || ''; S.wantAcc = ac || ''; document.body.classList.remove('s-bio', 's-chem', 's-phys', 's-math'); if (s) document.body.classList.add('s-' + s); applyAcc(document.body, S.wantAcc); }
function sc(s) { return s ? ' s-' + esc(s) : ''; }
function fadeImgs(root) {
  $$('img', root || $('#app')).forEach(function (im) {
    if (im.complete) return;
    im.classList.add('fi');
    var d = function () { im.classList.remove('fi'); };
    im.addEventListener('load', d, { once: true }); im.addEventListener('error', d, { once: true });
  });
}
function freshScroll() { if (!S.scrolled) { window.scrollTo(0, 0); S.scrolled = true; } }
function page(active, body, noFooter, skel) {
  clearTimeout(S.skT);
  var fresh = S.fresh, anim = fresh && !skel ? 'pg-enter' : 'pg-fade';
  if (!skel) S.fresh = false;
  if (fresh) { freshScroll(); setSubj(S.wantSubj, S.wantAcc); }
  var asTop = active === 'admin' && $('.aside') ? $('.aside').scrollTop : 0; glideSnap();
  var tmp = document.createElement('div'); tmp.innerHTML = (DEMO ? '<div class="demo-bar">เดโม: ข้อมูลทั้งหมดเป็นตัวอย่างและอยู่ในเบราว์เซอร์นี้เท่านั้น รีเฟรชแล้วจะเริ่มใหม่<button class="uisw" data-uisw="1">' + (UI2() ? 'ดูหน้าแรกแบบเดิม' : 'ดูหน้าแรกแบบใหม่') + '</button></div>' : '') + header(active) + '<main class="gut ' + anim + '"><div class="w">' + body + '</div></main>' + (noFooter ? '' : footer()) +
    '<div class="fab"><a class="ig" href="https://www.instagram.com/' + esc(S.cfg.contact_ig || 'ineedbiochem') + '" target="_blank" rel="noopener" title="ทักแอดมินทาง IG" aria-label="ทักแอดมินทาง IG"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg></a><button data-top="1" title="กลับขึ้นบน" aria-label="กลับขึ้นบน"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></div>';
  var app = $('#app');
  if (!(UI2() && keepGlideBoxes(app, tmp))) { app.textContent = ''; while (tmp.firstChild) app.appendChild(tmp.firstChild); }
  fadeImgs();
  if (UI2() && !skel) v2Post();
  if (asTop && $('.aside')) $('.aside').scrollTop = asTop;
  hydrateAv();
  glideAll();
}
/** เมนูที่มีป้ายเลื่อน (หัวเว็บ เมนูมือถือ เมนูหลังบ้าน): ถ้าหน้าใหม่ใช้ลิงก์ชุดเดิม ไม่ถอดกล่องเมนูเดิมออกจากหน้าเลย
 *  (ถอดออกแล้วใส่ใหม่ = ป้ายที่กำลังเลื่อนจะหยุดกระตุก) แต่เปลี่ยนเฉพาะส่วนอื่นของหน้ารอบ ๆ มัน คืนค่า false ถ้าใช้วิธีนี้ไม่ได้ */
function keepGlideBoxes(app, tmp) {
  var liveN = [], newN = [], kept = [];
  ['.hdr .nav', '.mnav', '.aside'].forEach(function (sel) {
    var ob = $(sel), nb = tmp.querySelector(sel); if (!ob || !nb || !app.contains(ob)) return;
    var ol = $$('a', ob), nl = [].slice.call(nb.querySelectorAll('a'));
    if (ol.length !== nl.length) return;
    var pair = nl.map(function (a) { return ol.filter(function (o) { return o.getAttribute('href') === a.getAttribute('href'); })[0]; });
    if (pair.some(function (o) { return !o; })) return;
    var lc = [], nc = [], x = ob, y = nb;
    while (x !== app && y !== tmp && x && y) { if (x.tagName !== y.tagName) return; lc.push(x); nc.push(y); x = x.parentNode; y = y.parentNode; }
    if (x !== app || y !== tmp) return;
    nl.forEach(function (a, k) { var o = pair[k]; if (o.className !== a.className) o.className = a.className; if (o.innerHTML !== a.innerHTML) o.innerHTML = a.innerHTML; ['aria-current', 'aria-pressed'].forEach(function (at) { if (a.hasAttribute(at)) o.setAttribute(at, a.getAttribute(at)); else o.removeAttribute(at); }); });
    lc.forEach(function (n, k) { if (liveN.indexOf(n) < 0) { liveN.push(n); newN.push(nc[k]); } });
    kept.push(ob);
  });
  if (!kept.length) return false;
  var sync = function (L, N) {
    if (kept.indexOf(L) >= 0) { var hg = L.classList.contains('has-glide'); L.className = N.className; if (hg) L.classList.add('has-glide'); return; }
    if (L !== app) {
      [].slice.call(L.attributes).forEach(function (at) { if (!N.hasAttribute(at.name)) L.removeAttribute(at.name); });
      [].slice.call(N.attributes).forEach(function (at) { if (L.getAttribute(at.name) !== at.value) L.setAttribute(at.name, at.value); });
    }
    [].slice.call(L.childNodes).forEach(function (c) { if (liveN.indexOf(c) < 0) L.removeChild(c); });
    var kids = [].slice.call(N.childNodes), anchor = null;
    for (var i = kids.length - 1; i >= 0; i--) {
      var k = kids[i], m = liveN[newN.indexOf(k)];
      if (newN.indexOf(k) >= 0) { sync(m, k); anchor = m; }
      else { L.insertBefore(k, anchor); anchor = k; }
    }
  };
  sync(app, tmp);
  return true;
}
function v2Post() {
  var ph = $('main .page-h'), w = $('main > .w');
  var rh = $('main .res-h'); if (rh) phPics(rh); // รูปน้องที่ติดค่าย ใส่เฉพาะหน้าผลงานน้องๆ
  if (ph && w && ph.parentNode !== w) { var top = ph; while (top.parentNode && top.parentNode !== w) top = top.parentNode; if (top.parentNode === w) w.insertBefore(ph, top); }
  var ch = $('.cd .chero'), cd = $('.cd');
  if (!ch || !cd) return;
  cd.parentNode.insertBefore(ch, cd); ch.classList.add('v2b');
  var im = $('img', ch) || $('.cd img');
  if (im && im.getAttribute('src')) { var bg = document.createElement('div'); bg.className = 'v2bg'; bg.style.setProperty('--img', 'url("' + im.getAttribute('src').replace(/"/g, '') + '")'); ch.insertBefore(bg, ch.firstChild); }
}
/** รูปน้องที่ติดค่าย วางบนแถบหัวหน้าสีเข้ม (สลับชุดตามหน้า) */
function phPics(ph) {
  var put = function (all) {
    if (!ph.isConnected || $('.ph-pics', ph)) return;
    var ps = all.filter(function (r) { return r.photo_url; });
    if (ps.length < 3) return;
    var seed = (location.hash.length * 7 + new Date().getDate()) % ps.length, pick = [];
    for (var i = 0; i < Math.min(4, ps.length); i++) pick.push(ps[(seed + i * 3) % ps.length]);
    var rot = [-6, 4, -3, 6];
    ph.classList.add('has-pics');
    ph.insertAdjacentHTML('beforeend', '<div class="ph-pics" aria-hidden="true">' + pick.map(function (r, k) { return '<span class="ph-p" style="--r:' + rot[k] + 'deg"><img src="' + esc(imgSrc(r.photo_url)) + '" alt=""><b>' + esc(r.nickname) + '</b></span>'; }).join('') + '</div>');
  };
  if (S.results) put(S.results); else loadResults().then(put);
}
function skTiles(n) { var h = ''; for (var i = 0; i < n; i++) h += '<div class="sk-tile" style="padding:0;min-height:0;border-radius:16px;overflow:hidden"><div class="sk" style="aspect-ratio:16/9;border-radius:0"></div><div class="stack" style="padding:16px 18px 18px;gap:10px"><div class="sk sk-l" style="width:25%"></div><div class="sk sk-h"></div><div class="sk sk-l" style="width:60%"></div></div></div>'; return '<div class="grid">' + h + '</div>'; }
function skeleton(kind) {
  if (kind === 'course') return '<div class="cd"><div class="stack" style="gap:14px"><div class="sk sk-l" style="width:18%"></div><div class="sk" style="height:44px;width:75%"></div><div class="sk sk-l" style="width:55%"></div><div class="rowx"><div class="sk" style="height:30px;width:90px;border-radius:99px"></div><div class="sk" style="height:30px;width:120px;border-radius:99px"></div></div><div class="sk" style="aspect-ratio:16/9;border-radius:16px"></div></div><div class="sk" style="height:380px;border-radius:24px"></div></div>';
  if (kind === 'learn') return '<div class="learn" style="padding-top:20px"><div class="stack" style="gap:16px;padding-right:24px"><div class="sk" style="aspect-ratio:16/9;border-radius:16px"></div><div class="sk sk-h"></div></div><div class="stack">' + [1, 2, 3, 4, 5, 6].map(function () { return '<div class="sk" style="height:34px"></div>'; }).join('') + '</div></div>';
  if (kind === 'list') return '<div class="page-h"><div class="sk sk-l" style="width:120px"></div><div class="sk" style="height:40px;width:260px"></div></div>' + skTiles(2);
  return '<div class="stack" style="padding-block:30px">' + [1, 2, 3].map(function () { return '<div class="sk" style="height:64px"></div>'; }).join('') + '</div>';
}
function loading(active, kind) { clearTimeout(S.skT); S.skT = setTimeout(function () { page(active, skeleton(kind), true, true); }, 350); }
function failed(active, e) { page(active, '<div class="empty" style="margin-block:60px"><p>' + esc(e.message) + '</p><button class="pill" onclick="location.reload()">ลองใหม่</button></div>'); }

/* ─── router ─── */
function route() {
  S.scrolled = false; S.wantSubj = ''; S.wantAcc = ''; S.fresh = true; clearTimeout(S.skT);
  var oldMain = $('#app main'); if (oldMain) oldMain.classList.add('leaving'); clearInterval(S.featT); S.homeRender = null;
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  stopPlayer();
  var parts = (location.hash.replace(/^#\/?/, '') || '').split('/').map(decodeURIComponent);
  if (S.user && !S.cells) loadCells(); applyCellTheme();
  var r = parts[0] || '';
  applyLearnMode(r === 'learn');
  if (r === '') return UI2() ? viewHome2() : viewHome();
  if (r === 'course') return viewCourse(parts[1]);
  if (r === 'results') return viewResults(parts[1]);
  if (r === 'terms' || r === 'privacy') return viewLegal(r);
  if (r === 'cart') return viewCart();
  if (r === 'bundle') return viewBundle(parts[1]);
  if (!S.user) { if (['my', 'learn', 'profile', 'admin', 'orders', 'cells'].indexOf(r) >= 0) { go('/'); setTimeout(function () { authModal('login'); }, 50); return; } }
  if (r === 'my') return viewMy();
  if (r === 'orders') return viewOrders(parts[1]);
  if (r === 'learn') return viewLearn(parts[1], parts[2]);
  if (r === 'profile') return viewProfile();
  if (r === 'cells') return viewCells();
  if (r === 'admin') { if (!isStaff()) return go('/'); return viewAdmin(parts[1] || 'dash', parts[2]); }
  go('/');
}

/* ─── HOME ─── */
var LV_CAP = { 'สอวน.': 'เตรียมสอบค่าย 1', 'A-Level': 'สอบเข้ามหาวิทยาลัย', 'ม.4': 'เรียนตามเทอม', 'ม.5': 'เรียนตามเทอม', 'ม.6': 'เรียนตามเทอม', 'ม.ต้น': 'ปูพื้นฐาน', 'อื่นๆ': 'คอร์สอื่น ๆ' };
function tileHtml(c, mine) {
  return '<a class="tile' + sc(c.subject) + '" href="#/course/' + encodeURIComponent(c.course_id) + '">' + cover(c, true) + '<div class="body">' + (c.cover_url ? '<span class="mono">' + esc(c.subject_name) + '</span>' : '') + '<h3>' + esc(c.title) + '</h3><p>' + esc(c.subtitle || '') + '</p>' +
    '<div class="foot"><span class="price">' + (c.full_price > c.price ? '<span class="was">' + baht(c.full_price) + '</span>' : '') + baht(c.price) + '</span>' + (statusBadge(mine[c.course_id]) || '<span class="sm muted">' + c.lesson_count + ' ตอน · ' + hm(c.total_min) + '</span>') + '</div></div></a>';
}
function viewHome() {
  var render = function () {
    var cs = S.courses, mine = S.mem.mine || {}, subs = S.cfg.subjects || {};
    var ig = S.cfg.contact_ig || 'ineedbiochem';
    var title = esc(S.cfg.hero_title || 'INeedBio').split('|');
    var html = '<section class="h2x"><div>' + (S.cfg.hero_eyebrow ? '<span class="kick">' + esc(S.cfg.hero_eyebrow) + '</span>' : '') +
      '<h1>' + title[0] + (title[1] ? '<br><em>' + title[1] + '</em>' : '') + '</h1>' + (S.cfg.hero_subtitle ? '<p class="lead">' + esc(S.cfg.hero_subtitle) + '</p>' : '') +
      '<div class="cta"><button class="pill" data-jump2="courses">เลือกคอร์สเลย</button><a class="pill ghost" href="https://www.instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">ปรึกษาแอดมินฟรี</a></div></div>' +
      (cs && cs.length ? '<a class="feat" id="feat" href="#/course/' + encodeURIComponent(cs[0].course_id) + '">' + cs.slice(0, 5).map(function (c, i) {
        return '<span class="slide' + sc(c.subject) + (i === 0 ? ' on' : '') + '" data-cid="' + esc(c.course_id) + '">' + cover(c) + '</span>';
      }).join('') + '<span class="info"><span><b id="feat-t">' + esc(cs[0].title) + '</b><span id="feat-p">' + featPrice(cs[0]) + '</span></span><span class="pill s">ดูคอร์ส</span></span>' +
        (cs.length > 1 ? '<span class="dots2">' + cs.slice(0, 5).map(function (c, i) { return '<i data-slide="' + i + '" class="' + (i === 0 ? 'on' : '') + '"></i>'; }).join('') + '</span>' : '') + '</a>'
        : '<div class="feat sk"></div>') + '</section>';
    if (!cs) { page('home', html + '<div class="blk">' + skTiles(3) + '</div>'); return; }
    html += hofHtml();
    var levels = (S.cfg.levels || []).filter(function (l) { return cs.some(function (c) { return c.level === l; }); });
    if (levels.length) html += '<section class="blk"><div class="sec-h"><div><small>Choose your path</small><h2>เรียนเพื่ออะไร?</h2></div></div><div class="paths">' + levels.map(function (l) {
      var n = cs.filter(function (c) { return c.level === l; }).length;
      return '<button class="path" data-lv="' + esc(l) + '" aria-pressed="' + (S.lv === l) + '"><b>' + esc(l) + '</b><span>' + esc(LV_CAP[l] || '') + '</span><em>' + n + ' คอร์ส →</em></button>';
    }).join('') + '</div></section>';
    var q = (S.q || '').trim().toLowerCase();
    var filtered = S.lv || S.fsub || q;
    html += '<section class="blk" id="courses">';
    if (filtered) {
      var list = cs.filter(function (c) { return (!S.lv || c.level === S.lv) && (!S.fsub || c.subject === S.fsub) && (!q || [c.title, c.subtitle, c.subject_name, c.level].join(' ').toLowerCase().indexOf(q) >= 0); });
      html += '<div class="results-h"><h2 style="font-size:24px;font-weight:800">' + list.length + ' คอร์ส</h2>' +
        (S.lv ? '<button class="x2" data-clear="lv">' + esc(S.lv) + ' ✕</button>' : '') + (S.fsub ? '<button class="x2" data-clear="fsub">' + esc(subs[S.fsub] || S.fsub) + ' ✕</button>' : '') + (q ? '<button class="x2" data-clear="q">“' + esc(S.q) + '” ✕</button>' : '') + '</div>' +
        (list.length ? '<div class="grid">' + list.map(function (c) { return tileHtml(c, mine); }).join('') + '</div>' : '<div class="empty"><p>ไม่เจอคอร์สที่ตรงกับที่ค้นหา</p><button class="pill ghost" data-clear="all">ดูคอร์สทั้งหมด</button></div>');
    } else {
      var keys = Object.keys(subs).filter(function (k) { return cs.some(function (c) { return c.subject === k; }); });
      var big = keys.some(function (k) { return cs.filter(function (c) { return c.subject === k; }).length >= 4; });
      if (!cs.length) html += '<div class="empty"><p>ยังไม่มีคอร์สที่เปิดขาย</p></div>';
      else if (big) {
        // วิชาที่มีคอร์สเยอะ (≥4) ได้แถวของตัวเอง ที่เหลือ (เช่น ชีวะ เคมี ฟิสิกส์) รวมอยู่แถวเดียวกัน
        var cnt = function (k) { return cs.filter(function (c) { return c.subject === k; }).length; };
        var few = keys.filter(function (k) { return cnt(k) < 4; }), many = keys.filter(function (k) { return cnt(k) >= 4; });
        var rows = (few.length ? [few] : []).concat(many.map(function (k) { return [k]; }));
        html += rows.map(function (ks) {
          var row = cs.filter(function (c) { return ks.indexOf(c.subject) >= 0; });
          var head = ks.length > 1 ? '<div><small>' + ks.map(function (k) { return esc(subs[k]); }).join(' · ') + '</small><h2>' + (ks.every(function (k) { return /^(bio|chem|phys)$/.test(k); }) ? 'วิทยาศาสตร์' : 'คอร์สอื่นๆ') + '</h2></div><div class="subj-chips" style="margin:0">' + ks.map(function (k) { return '<button class="chip s-' + k + '" data-fsub="' + k + '"><i></i>' + esc(subs[k]) + '</button>'; }).join('') + '</div>'
            : '<div><h2>' + esc(subs[ks[0]]) + '</h2></div><button data-fsub="' + ks[0] + '">ดูทั้งหมด (' + row.length + ') →</button>';
          return '<div style="margin-bottom:30px"><div class="sec-h">' + head + '</div><div class="hs">' + row.map(function (c) { return tileHtml(c, mine); }).join('') + '</div></div>';
        }).join('');
      }
      else html += '<div class="sec-h"><div><small>All courses</small><h2>คอร์สทั้งหมด</h2></div></div><div class="subj-chips">' + keys.map(function (k) {
        return '<button class="chip s-' + k + '" data-fsub="' + k + '"><i></i>' + esc(subs[k]) + '</button>'; }).join('') + '</div><div class="grid">' + cs.map(function (c) { return tileHtml(c, mine); }).join('') + '</div>';
    }
    html += '</section>';
    var bl = (S.bundles || []).filter(function (b) { return !filtered || (S.fsub && b.subject === S.fsub && !S.lv && !q); });
    if (bl.length) html += '<section class="blk" id="bundles"><div class="sec-h"><div><small>Bundles</small><h2>แพ็กเกจสุดคุ้ม</h2></div></div>' + bundleCards(bl) + '</section>';
    html += '<section class="blk"><div class="sec-h"><div><small>Why INeedBio</small><h2>เรียนกับเราได้อะไร</h2></div></div><div class="why">' +
      '<div><b class="n">∞</b><h3>ดูได้ตลอดชีพ</h3><p>ซื้อครั้งเดียว ไม่มีวันหมดอายุ ไม่มีการลบคลิป ย้อนดูก่อนสอบกี่รอบก็ได้</p></div>' +
      '<div><b class="n">PDF</b><h3>ชีทประกอบทุกบท</h3><p>เปิดชีทข้างคลิปได้เลย จดตามพี่ได้ทันที ไม่ต้องหาไฟล์เอง</p></div>' +
      '<div><b class="n">%</b><h3>รู้ว่าเรียนถึงไหน</h3><p>ติ๊กตอนที่ดูจบ ระบบนับให้ว่าเหลืออีกกี่ตอน วางแผนอ่านก่อนสอบได้ง่าย</p></div></div></section>' +
      '<section class="blk"><div class="sec-h"><div><small>Contact</small><h2>มีคำถาม ทักพี่ได้เลย</h2></div></div><div class="chan">' +
      '<a class="ig" href="https://www.instagram.com/' + esc(ig) + '" target="_blank" rel="noopener"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg><span><b>Instagram</b><span>@' + esc(ig) + ' · ช่องทางหลัก สอบถาม/ส่งสลิป</span></span></a>' +
      '</div></section>';
    page('home', html);
    startFeat();
  };
  render();
  var jobs = [api('courses.list').then(function (c) { S.courses = c; }), loadResults(), api('bundles.list').then(function (b) { S.bundles = b; }).catch(function () { S.bundles = []; })];
  if (S.user && !S.mem.mine) jobs.push(api('my.courses').then(function (m) { var o = {}; m.forEach(function (x) { o[x.course_id] = x.enrollment; }); S.mem.mine = o; }).catch(function () {}));
  Promise.all(jobs).then(render).catch(function (e) { failed('home', e); });
  S.homeRender = render;
}
/* ─── หน้าแรกแบบใหม่ (v2) ─── */
function UI2() { return store('ib_ui') !== '1'; }
function ncCard(c, mine, prog) {
  var st = mine && mine[c.course_id], p = prog && prog[c.course_id];
  var href = p && st === 'approved' ? '#/learn/' + encodeURIComponent(c.course_id) + (p.last ? '/' + p.last : '') : '#/course/' + encodeURIComponent(c.course_id);
  return '<a class="nc' + sc(c.subject) + '"' + accStyle(c.accent) + ' href="' + href + '"><span class="nc-cv">' + (c.cover_url ? '<img src="' + esc(imgSrc(c.cover_url)) + '" alt="" loading="lazy" onerror="this.remove()">' : '<span class="ty">' + esc(SHORT[c.subject] || c.subject_name) + '</span>') +
    (c.level ? '<span class="nc-lv">' + esc(c.level) + '</span>' : '') + (c.full_price > c.price && !st ? '<span class="nc-off">ลด ' + baht(c.full_price - c.price) + '</span>' : '') +
    (p ? '<span class="nc-pg"><i style="width:' + p.pct + '%"></i></span>' : '') + '<span class="nc-go" aria-hidden="true">' + (p ? '▶' : '→') + '</span></span>' +
    '<span class="nc-b"><span class="nc-t">' + esc(c.title) + '</span><span class="nc-m">' + (p ? 'เรียนแล้ว ' + p.pct + '% · ' + p.done + '/' + c.lesson_count + ' ตอน' : c.lesson_count + ' ตอน · ' + hm(c.total_min)) + '</span>' +
    (st ? '' : '<span class="nc-p">' + baht(c.price) + (c.full_price > c.price ? '<s>' + baht(c.full_price) + '</s>' : '') + '</span>') + '</span></a>';
}
function rowHtml(id, kicker, title, cards, more) {
  return '<section class="rw" id="rw-' + id + '"><div class="rw-h"><div>' + (kicker ? '<small>' + kicker + '</small>' : '') + '<h2>' + title + '</h2></div><div class="rowx" style="gap:10px">' + (more || '') +
    '<div class="rw-nav"><button type="button" data-rw="' + id + '" data-d="-1" aria-label="เลื่อนซ้าย">‹</button><button type="button" data-rw="' + id + '" data-d="1" aria-label="เลื่อนขวา">›</button></div></div></div><div class="rw-t">' + cards + '</div></section>';
}
function viewHome2() {
  var render = function () {
    var cs = S.courses, mine = S.mem.mine || {}, subs = S.cfg.subjects || {}, ig = S.cfg.contact_ig || 'ineedbiochem';
    var title = (S.cfg.hero_title || 'ติวเข้ม ม.ปลาย|กับ INeedBio').split('|');
    var html = '<div class="v2"><div class="v2-hi"><div><h1>' + (S.user ? 'สวัสดี ' + esc(S.user.nickname) : esc(title[0]) + (title[1] ? ' ' + esc(title[1]) : '')) + '</h1><p>' + (S.user && S.cells ? (S.cells.today_done ? 'วันนี้เรียนครบแล้ว เรียนติดกัน ' + S.cells.streak + ' วัน' : 'วันนี้ดูคลิปไปแล้ว ' + S.cells.today_min + ' จาก 15 นาที') : esc(S.cfg.hero_subtitle || 'คอร์สเดียว เรียนได้ตลอดชีพ')) + '</p></div></div>';
    if (!cs) { page('home', html + '<div class="bbd sk" style="min-height:420px"></div>' + skTiles(3) + '</div>'); return; }
    var q = (S.q || '').trim().toLowerCase(), filtered = S.lv || S.fsub || q;
    if (filtered) {
      var list = cs.filter(function (c) { return (!S.lv || c.level === S.lv) && (!S.fsub || c.subject === S.fsub) && (!q || [c.title, c.subtitle, c.subject_name, c.level].join(' ').toLowerCase().indexOf(q) >= 0); });
      html += '<div class="results-h" style="margin-top:6px"><h2 style="font-size:24px;font-weight:800">' + list.length + ' คอร์ส</h2>' + (S.fsub ? '<button class="x2" data-clear="fsub">' + esc(subs[S.fsub] || S.fsub) + ' ✕</button>' : '') + (S.lv ? '<button class="x2" data-clear="lv">' + esc(S.lv) + ' ✕</button>' : '') + (q ? '<button class="x2" data-clear="q">“' + esc(S.q) + '” ✕</button>' : '') + '</div>' +
        (list.length ? '<div class="v2-grid">' + list.map(function (c) { return ncCard(c, mine, S.mem.prog); }).join('') + '</div>' : '<div class="empty"><p>ไม่เจอคอร์สที่ตรงกับที่ค้นหา</p><button class="pill ghost" data-clear="all">ดูคอร์สทั้งหมด</button></div>');
      page('home', html + '</div>'); return;
    }
    var feat = billboardCourses(cs);
    html += '<section class="bbd" id="bbd" aria-roledescription="carousel" aria-label="คอร์สแนะนำ">' + feat.map(function (c, i) {
      return '<div class="bbd-s' + sc(c.subject) + (i === 0 ? ' on' : '') + '"' + accStyle(c.accent) + ' aria-hidden="' + (i !== 0) + '">' + (c.cover_url ? '<div class="bbd-bg" style="--img:url(\'' + esc(imgSrc(c.cover_url)) + '\')"></div>' : '') +
        '<div class="bbd-in"><div><span class="bbd-k"><i></i>' + esc(c.subject_name) + (c.level ? ' · ' + esc(c.level) : '') + '</span><h2>' + esc(c.title) + '</h2>' + (c.subtitle ? '<p class="sub">' + esc(c.subtitle) + '</p>' : '') +
        '<div class="bbd-f"><span>' + c.lesson_count + ' ตอน</span><span>' + hm(c.total_min) + '</span><span>ดูได้ตลอดชีพ</span><span>' + baht(c.price) + '</span></div>' +
        '<div class="bbd-cta">' + (mine[c.course_id] === 'approved' ? '<a class="bbtn pri" href="#/learn/' + encodeURIComponent(c.course_id) + '">▶ เรียนต่อ</a>' : '<a class="bbtn pri" href="#/course/' + encodeURIComponent(c.course_id) + '">▶ ดูตอนตัวอย่างฟรี</a><button class="bbtn gh" type="button" data-cart-add="' + esc(c.course_id) + '">+ ใส่ตะกร้า</button>') + '</div></div>' +
        (c.cover_url ? '<a class="bbd-art" href="#/course/' + encodeURIComponent(c.course_id) + '" tabindex="-1"><img src="' + esc(imgSrc(c.cover_url)) + '" alt=""></a>' : '') + '</div></div>';
    }).join('') + (feat.length > 1 ? '<div class="bbd-dots">' + feat.map(function (c, i) { return '<button type="button" data-bb="' + i + '" class="' + (i === 0 ? 'on' : '') + '" aria-label="' + esc(c.title) + '"></button>'; }).join('') + '</div>' : '') + '</section>';
    var prog = S.mem.prog || {};
    var cont = cs.filter(function (c) { return mine[c.course_id] === 'approved'; });
    if (cont.length) html += rowHtml('cont', 'ห้องเรียนของฉัน', 'เรียนต่อจากที่ค้างไว้', cont.map(function (c) { return ncCard(c, mine, prog); }).join(''), '<a class="link sm" href="#/my">คอร์สของฉัน</a>');
    var keys = Object.keys(subs).filter(function (k) { return cs.some(function (c) { return c.subject === k; }); });
    var cnt = function (k) { return cs.filter(function (c) { return c.subject === k; }).length; };
    var few = keys.filter(function (k) { return cnt(k) < 4; }), many = keys.filter(function (k) { return cnt(k) >= 4; });
    (few.length ? [few] : []).concat(many.map(function (k) { return [k]; })).forEach(function (ks, ri) {
      var row = cs.filter(function (c) { return ks.indexOf(c.subject) >= 0; });
      var t = ks.length > 1 ? (ks.every(function (k) { return /^(bio|chem|phys)$/.test(k); }) ? 'วิทยาศาสตร์' : 'คอร์สแนะนำ') : esc(subs[ks[0]]);
      html += rowHtml('s' + ri, ks.map(function (k) { return esc(subs[k]); }).join(' · '), t, row.map(function (c) { return ncCard(c, mine, prog); }).join(''), ks.length === 1 ? '<button class="link sm" data-fsub="' + ks[0] + '">ดูทั้งหมด</button>' : '');
    });
    if ((S.bundles || []).length) html += '<section class="rw"><div class="rw-h"><div><small>ซื้อคู่ถูกกว่า</small><h2>แพ็กเกจสุดคุ้ม</h2></div></div>' + bundleCards(S.bundles) + '</section>';
    html += hofHtml() + reviewsRow();
    var ic = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    html += '<div class="prm"><div>' + ic('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>') + '<b>ดูได้ตลอดชีพ</b><span>ซื้อครั้งเดียว ไม่มีการลบคลิป</span></div>' +
      '<div>' + ic('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>') + '<b>ชีทประกอบทุกบท</b><span>เปิดข้างคลิป จดตามได้ทันที</span></div>' +
      (cellsPromoOn() ? '<div>' + ic('<circle cx="9" cy="10" r="5"/><circle cx="16" cy="15" r="4"/>') + '<b>เรียนทุกวัน เซลล์แบ่งตัว</b><span>สะสมครบ 100 แลกส่วนลด 100 บาท</span></div>' : '<div>' + ic('<rect x="3" y="4" width="13" height="10" rx="2"/><rect x="15" y="9" width="6" height="11" rx="1.5"/><path d="M7 18h5"/>') + '<b>เรียนได้ทุกจอ</b><span>มือถือ แท็บเล็ต คอม ดูต่อจากที่ค้างไว้</span></div>') + '</div>' +
      '<div class="ask"><div><b>ยังไม่แน่ใจว่าจะเริ่มคอร์สไหน?</b><p>ทักพี่ทาง IG บอกระดับชั้นกับสนามสอบ เดี๋ยวพี่แนะนำให้</p></div><a class="pill" href="https://www.instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">ทัก IG @' + esc(ig) + '</a></div></div>';
    page('home', html);
    startBillboard();
    $$('[data-rw]').forEach(function (b) { b.onclick = function () { var t = $('#rw-' + b.dataset.rw + ' .rw-t'); t.scrollBy({ left: Number(b.dataset.d) * t.clientWidth * 0.85, behavior: 'smooth' }); }; });
  };
  render();
  var jobs = [api('courses.list').then(function (c) { S.courses = c; }), loadResults(), api('bundles.list').then(function (b) { S.bundles = b; }).catch(function () { S.bundles = []; })];
  if (S.user) jobs.push(api('my.courses').then(function (m) { var o = {}, pg = {}; m.forEach(function (x) { o[x.course_id] = x.enrollment; pg[x.course_id] = { pct: x.percent || 0, done: x.done_count || 0, last: x.last_lesson_id || '' }; }); S.mem.mine = o; S.mem.prog = pg; }).catch(function () {}));
  Promise.all(jobs).then(render).catch(function (e) { failed('home', e); });
  S.homeRender = render;
}
/** คอร์สบนแบนเนอร์ใหญ่: ตามที่แอดมินเลือกและเรียงไว้ (ตั้งค่า home_billboard) ถ้าไม่ได้เลือกใช้ 5 คอร์สแรก */
function billboardCourses(cs) {
  var ids = String(S.cfg.home_billboard || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  var picked = ids.map(function (id) { return cs.filter(function (c) { return c.course_id === id; })[0]; }).filter(Boolean);
  return picked.length ? picked : cs.slice(0, 5);
}
function startBillboard() {
  clearInterval(S.featT);
  var bb = $('#bbd'); if (!bb) return;
  var sl = $$('.bbd-s', bb), dots = $$('[data-bb]', bb), i = 0;
  if (sl.length < 2) return;
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var show = function (n) {
    i = (n + sl.length) % sl.length;
    sl.forEach(function (s, k) { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
    dots.forEach(function (d, k) { d.classList.remove('on', 'run'); if (k === i) { d.classList.add('on'); void d.offsetWidth; if (!still) d.classList.add('run'); } });
  };
  // เลื่อนไปคอร์สถัดไปเมื่อแถบเวลาบนจุดวิ่งครบ (ชี้เมาส์ค้างไว้ แถบหยุด คอร์สก็หยุด)
  bb.addEventListener('animationend', function (e) { if (e.target.matches && e.target.matches('[data-bb].run')) show(i + 1); });
  dots.forEach(function (d) { d.onclick = function () { show(+d.dataset.bb); }; });
  var x0 = null;
  bb.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
  bb.addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); });
  show(0);
}
/* ─── ป้ายสีเข้มเลื่อนตามปุ่มที่กด (เมนูหัวเว็บ เมนูมือถือ เมนูหลังบ้าน ปุ่มแบ่งกลุ่ม) ─── */
var GLIDES = [['.hdr .nav', 'a.on'], ['.mnav', 'a.on'], ['.aside', 'a.on'], ['.seg', '[aria-pressed="true"]'], ['.lside', 'a.ep.on']];
S.glide = {};
var GLIDE_MS = 420;
S.gAnim = {};
function glideTo(box, act, key, instant) {
  var ind = box.querySelector('.glide');
  if (ind && ind.parentNode !== box) box.insertBefore(ind, box.firstChild);
  var made = !ind;
  if (!ind) { ind = document.createElement('span'); ind.className = 'glide'; ind.setAttribute('aria-hidden', 'true'); box.insertBefore(ind, box.firstChild); }
  if (!act) { ind.style.opacity = '0'; delete S.gAnim[key]; return; }
  var br = box.getBoundingClientRect(), r = act.getBoundingClientRect();
  var to = { x: r.left - br.left + box.scrollLeft, y: r.top - br.top + box.scrollTop, w: r.width, h: r.height };
  var put = function (p) { ind.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)'; ind.style.width = p.w + 'px'; ind.style.height = p.h + 'px'; ind.style.opacity = '1'; };
  var same = function (a, b) { return a && b && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.w - b.w) < 1 && Math.abs(a.h - b.h) < 1; };
  var from = S.glide[key], an = S.gAnim[key], now = Date.now(), left = GLIDE_MS;
  if (!made && an && same(an.to, to) && ind.style.opacity !== '0') { S.glide[key] = to; return; }
  // หน้าวาดใหม่ระหว่างที่ป้ายกำลังเลื่อนไปที่เดิม: เลื่อนต่อจากจุดที่อยู่ด้วยเวลาที่เหลือ ไม่เริ่มนับใหม่ (ไม่กระตุก ไม่ช้าลง)
  if (an && same(an.to, to)) { left = GLIDE_MS - (now - an.t0); if (left < 40) instant = true; }
  else S.gAnim[key] = { to: to, t0: now };
  ind.style.transition = 'none'; put(instant || !from ? to : from); void ind.offsetWidth;
  ind.style.transition = ''; if (left !== GLIDE_MS) ind.style.transitionDuration = [left, left, left, 200].map(function (v) { return Math.max(0, v) + 'ms'; }).join(',');
  else ind.style.transitionDuration = '';
  put(to);
  S.glide[key] = to;
}
/** ก่อนวาดหน้าใหม่ จำตำแหน่งที่ป้ายอยู่จริงตอนนี้ (แม้กำลังเลื่อนอยู่) แล้วให้ป้ายในหน้าใหม่เลื่อนต่อจากตรงนั้น */
function glideSnap() {
  if (!UI2()) return;
  GLIDES.forEach(function (g) { $$(g[0]).forEach(function (box, n) {
    var ind = box.querySelector('.glide'); if (!ind || ind.style.opacity === '0') return;
    var br = box.getBoundingClientRect(), r = ind.getBoundingClientRect();
    S.glide[g[0] + n] = { x: r.left - br.left + box.scrollLeft, y: r.top - br.top + box.scrollTop, w: r.width, h: r.height };
  }); });
}
function glideAll() {
  if (!UI2()) return;
  GLIDES.forEach(function (g) { $$(g[0]).forEach(function (box, n) { box.classList.add('has-glide'); glideTo(box, $(g[1], box), g[0] + n); glideWatch(box, g[1], g[0] + n); }); });
}
/** ถ้าโครงเมนูเปลี่ยนหลังวาด (สคริปต์เสริมห่อกลุ่มเมนู ฟอนต์โหลดเสร็จ ขนาดกล่องเปลี่ยน) ให้ป้ายเลื่อนไปตำแหน่งใหม่ต่อจากจุดที่อยู่ */
function glideWatch(box, sel, key) {
  if (box._gw) return; box._gw = 1;
  var again = function () {
    clearTimeout(box._gwt);
    box._gwt = setTimeout(function () {
      if (!box.isConnected) return;
      var ind = box.querySelector('.glide'), act = $(sel, box), an = S.gAnim[key];
      if (act && an) { var br0 = box.getBoundingClientRect(), r0 = act.getBoundingClientRect(); if (Math.abs(r0.left - br0.left + box.scrollLeft - an.to.x) < 1 && Math.abs(r0.top - br0.top + box.scrollTop - an.to.y) < 1 && Math.abs(r0.width - an.to.w) < 1) return; }
      if (ind && ind.style.opacity !== '0') { var br = box.getBoundingClientRect(), r = ind.getBoundingClientRect(); S.glide[key] = { x: r.left - br.left + box.scrollLeft, y: r.top - br.top + box.scrollTop, w: r.width, h: r.height }; }
      glideTo(box, act, key);
    }, 40);
  };
  var isG = function (nd) { return nd.nodeType === 1 && nd.classList.contains('glide'); };
  if (window.MutationObserver) new MutationObserver(function (rs) {
    if (rs.some(function (r) { return [].some.call(r.addedNodes, function (x) { return !isG(x); }) || [].some.call(r.removedNodes, function (x) { return !isG(x); }); })) again();
  }).observe(box, { childList: true, subtree: true });
  if (window.ResizeObserver) new ResizeObserver(again).observe(box);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(again);
}
document.addEventListener('click', function (e) {
  if (!UI2()) return;
  GLIDES.forEach(function (g) {
    var el = e.target.closest(g[0] + ' a, ' + g[0] + ' button'); if (!el || el.classList.contains('glide')) return;
    var box = el.closest(g[0]), n = $$(g[0]).indexOf(box); if (n < 0) return;
    $$(g[1], box).forEach(function (x) { if (x !== el) { x.classList.remove('on'); x.setAttribute('aria-pressed', x.hasAttribute('aria-pressed') ? 'false' : x.getAttribute('aria-pressed')); } });
    el.classList.add('on'); if (el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', 'true');
    glideTo(box, el, g[0] + n);
  });
}, true);
window.addEventListener('resize', function () { if (!UI2()) return; GLIDES.forEach(function (g) { $$(g[0]).forEach(function (box, n) { glideTo(box, $(g[1], box), g[0] + n, true); }); }); });
function featPrice(c) { return (c.full_price > c.price ? '<s>' + baht(c.full_price) + '</s> ' : '') + baht(c.price) + ' · ' + c.lesson_count + ' ตอน'; }
function startFeat() {
  clearInterval(S.featT);
  var f = $('#feat'); if (!f) return;
  var slides = $$('.slide', f), dots = $$('.dots2 i', f), i = 0;
  if (slides.length < 2) return;
  var show = function (n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle('on', k === i); }); dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    var c = (S.courses || []).filter(function (x) { return x.course_id === slides[i].dataset.cid; })[0]; if (!c) return;
    f.setAttribute('href', '#/course/' + encodeURIComponent(c.course_id)); $('#feat-t').textContent = c.title; $('#feat-p').innerHTML = featPrice(c);
  };
  dots.forEach(function (d) { d.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(+d.dataset.slide); }); });
  var run = function () { clearInterval(S.featT); S.featT = setInterval(function () { if (!document.body.contains(f)) return clearInterval(S.featT); show(i + 1); }, 4500); };
  f.addEventListener('mouseenter', function () { clearInterval(S.featT); }); f.addEventListener('mouseleave', run);
  run();
}


/* ─── HALL OF FAME ─── */
function loadResults() { return S.results ? Promise.resolve(S.results) : api('results.list').then(function (r) { S.results = r; return r; }).catch(function () { S.results = []; return []; }); }
function resYear(list) { return list.reduce(function (m, r) { return Math.max(m, Number(r.year) || 0); }, 0); }
function stuPhoto(r, cls) { return '<span class="' + (cls || 'sp') + '">' + (r.photo_url ? '<img src="' + esc(imgSrc(r.photo_url)) + '" alt="" loading="lazy">' : '<img src="' + CATSRC + '" alt="" class="cat">') + '</span>'; }
function subjCount(list) { var o = {}; list.forEach(function (r) { o[r.subject] = (o[r.subject] || 0) + 1; }); return o; }
function hofHtml() {
  var all = S.results || []; if (!all.length) return '';
  var yr = resYear(all), list = all.filter(function (r) { return Number(r.year) === yr; }), cnt = subjCount(list), subs = S.cfg.subjects || {};
  return '<section class="blk hof"><div class="hof-top"><div><small class="k">Hall of fame · ' + yr + '</small><h2>น้องๆ INeedBio ติดค่าย 1 สอวน.</h2>' +
    '<div class="hof-sub">' + Object.keys(cnt).map(function (k) { return '<span class="s-' + esc(k) + '"><i></i>' + esc(subs[k] || k) + ' <b>' + cnt[k] + '</b></span>'; }).join('') + '</div></div>' +
    '<div class="hof-num"><b>' + list.length + '</b><span>คน</span></div></div>' +
    (function () {
      var set = function (hide) { return '<div class="marq-set"' + (hide ? ' aria-hidden="true"' : '') + '>' + list.map(function (r, i) {
        return '<a class="pola s-' + esc(r.subject) + '" href="#/results/' + esc(r.result_id) + '"' + (hide ? ' tabindex="-1"' : '') + ' style="--r:' + ((i % 3) - 1) * 1.6 + 'deg">' + stuPhoto(r) + '<b>' + esc(r.nickname) + '</b><small>' + esc((subs[r.subject] || '')) + '</small></a>';
      }).join('') + '</div>'; };
      return '<div class="marq" style="--dur:' + Math.max(20, list.length * 3.2) + 's"><div class="marq-track">' + set(false) + set(true) + '</div></div>';
    })() + '<div class="rowx" style="margin-top:16px"><a class="pill ghost" href="#/results">อ่านรีวิวจากน้องๆ ทั้งหมด →</a></div></section>';
}
/** รีวิวโดยภาพรวมบนหน้าแรก: ข้อความ + ชื่อเล่น ไม่ผูกกับคอร์สหรือวิชา */
function reviewsRow() {
  var list = (S.results || []).filter(function (r) { return r.review && String(r.review).trim(); });
  // รีวิวเพิ่มเติมที่ไม่ได้อยู่ในผลงานน้อง: ตั้ง window.INEEDBIO_EXTRA_REVIEWS = [{ nickname, text, photo_url? }] ก่อนโหลดหน้า
  var seen = list.map(function (r) { return String(r.review).trim(); });
  (Array.isArray(window.INEEDBIO_EXTRA_REVIEWS) ? window.INEEDBIO_EXTRA_REVIEWS : []).forEach(function (x, k) {
    var t = String((x && (x.text || x.review)) || '').trim(); if (!t || seen.indexOf(t) >= 0) return; seen.push(t);
    list.push({ result_id: 'xr' + k, nickname: String(x.nickname || x.name || 'น้อง INeedBio'), review: t, photo_url: x.photo_url || '' });
  });
  if (!list.length) return '';
  // คละทุกวิชาทุกรุ่นปนกัน (สลับลำดับใหม่ทุกวัน)
  var day = Math.floor(Date.now() / 864e5);
  list = list.map(function (r, i) { return [((i + 1) * 2654435761 + day * 97) % 1000003, r]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
  var cards = list.map(function (r) {
    return '<article class="grv"><p>' + esc(r.review) + '</p><div class="grv-by">' + stuPhoto(r, 'grv-ph') + '<b>' + esc(r.nickname) + '</b></div></article>';
  }).join('');
  return rowHtml('rv', 'Reviews', 'รีวิวจากน้องๆ', cards, '<a class="link sm" href="#/results">อ่านทั้งหมด</a>');
}
function reviewCard(r) {
  var subs = S.cfg.subjects || {};
  var body = r.review ? '<p class="rv-q">' + esc(r.review) + '</p>' : '<p class="rv-q muted">ยินดีด้วยกับการติดค่าย 1 สอวน. สาขา' + esc(subs[r.subject] || '') + '</p>';
  return '<article class="rv s-' + esc(r.subject) + '" id="rv-' + esc(r.result_id) + '"><div class="rv-h">' + stuPhoto(r, 'rv-ph') + '<div><b>' + esc(r.nickname) + '</b><span>' + esc(r.school || '') + '</span></div></div>' +
    '<div class="rv-tags"><span class="rv-sj">' + esc(subs[r.subject] || r.subject) + ' · ค่าย 1 ปี ' + esc(r.year) + '</span>' + (r.center ? '<span class="rv-c">' + esc(r.center) + '</span>' : '') + '</div>' + body + '</article>';
}
function viewResults(focus) {
  loading('results', 'list');
  loadResults().then(function (all) {
    var subs = S.cfg.subjects || {};
    var years = all.map(function (r) { return Number(r.year); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return b - a; });
    var yr = S.ryear || years[0], sj = S.rsub || '';
    var inYear = all.filter(function (r) { return Number(r.year) === yr; }), cnt = subjCount(inYear);
    var list = inYear.filter(function (r) { return !sj || r.subject === sj; });
    list = list.filter(function (r) { return r.review; }).concat(list.filter(function (r) { return !r.review; }));
    page('results', '<section class="res-h"><small class="k">Hall of fame</small><h1>ผลงานน้องๆ INeedBio</h1><p class="ink2">น้องที่เรียนกับเราและผ่านการคัดเลือกเข้าค่าย 1 สอวน.' + (yr ? ' ปี ' + yr : '') + '</p>' +
      (all.length ? '<div class="res-stats"><div class="big"><b>' + inYear.length + '</b><span>คนติดค่าย 1</span></div>' + Object.keys(cnt).map(function (k) { return '<div class="s-' + esc(k) + '"><b>' + cnt[k] + '</b><span>' + esc(subs[k] || k) + '</span></div>'; }).join('') + '</div>' : '') + '</section>' +
      (years.length > 1 ? '<div class="subj-chips">' + years.map(function (y) { return '<button class="chip" data-ryear="' + y + '" aria-pressed="' + (y === yr) + '">ปี ' + y + '</button>'; }).join('') + '</div>' : '') +
      '<div class="subj-chips"><button class="chip" data-rsub="" aria-pressed="' + (!sj) + '">ทั้งหมด</button>' + Object.keys(cnt).map(function (k) { return '<button class="chip s-' + k + '" data-rsub="' + k + '" aria-pressed="' + (sj === k) + '"><i></i>' + esc(subs[k] || k) + ' (' + cnt[k] + ')</button>'; }).join('') + '</div>' +
      (list.length ? '<div class="rvs">' + list.map(reviewCard).join('') + '</div>' : '<div class="empty"><p>ยังไม่มีข้อมูลผลงาน</p></div>') +
      '<div class="ask" style="margin-top:36px"><img src="' + CATSRC + '" alt=""><div><h3>อยากเป็นคนต่อไป?</h3><p>ดูคอร์สที่น้องๆ ใช้เตรียมสอบ แล้วเริ่มได้เลยวันนี้</p></div><a class="pill" href="#/">ดูคอร์สทั้งหมด</a></div>');
    if (focus) { var el = document.getElementById('rv-' + focus); if (el) { el.classList.add('hl-on'); setTimeout(function () { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' }); }, 60); } }
  }).catch(function (e) { failed('results', e); });
}

/* ─── COURSE ─── */
function revSec(c) {
  var rs = (S.results || []).filter(function (r) { return r.subject === c.subject && r.review; }).slice(0, 4), cr = c.reviews || [];
  if (!rs.length && !cr.length) return '';
  var avg = cr.length ? cr.reduce(function (a, x) { return a + x.rating; }, 0) / cr.length : 0;
  return '<section class="sec" id="sec-reviews">' +
    (cr.length ? '<div class="spread"><h2>รีวิวจากคนที่เรียนคอร์สนี้</h2><span class="sm">' + stars(Math.round(avg)) + ' ' + avg.toFixed(1) + ' · ' + cr.length + ' รีวิว</span></div><div class="rvs two" style="margin-bottom:26px">' + cr.slice(0, 6).map(function (x) {
      return '<article class="rv"><div class="rv-h"><div><b>' + esc(x.nickname) + '</b><span>' + esc(x.grade || '') + ' · ' + thDate(x.created_at) + '</span></div></div><div>' + stars(x.rating) + '</div><p class="rv-q">' + esc(x.text) + '</p></article>'; }).join('') + '</div>' : '') +
    (rs.length ? '<div class="spread"><h2>เสียงจากน้องที่ติดค่าย</h2><a class="link" href="#/results">ดูทั้งหมด</a></div><div class="rvs two">' + rs.map(reviewCard).join('') + '</div>' : '') + '</section>';
}
function viewCourse(id) {
  loading('home', 'course');
  Promise.all([api('course.detail', { course_id: id }), loadResults()]).then(function (res) { var c = res[0];
    S.cur = c; setSubj(c.subject, c.accent);
    var st = c.enrollment;
    var box, cta;
    var inCart = CART.indexOf(c.course_id) >= 0;
    if (st === 'approved') { box = '<div class="note ok">คุณมีสิทธิ์เข้าเรียนคอร์สนี้แล้ว</div><a class="pill block" href="#/learn/' + encodeURIComponent(c.course_id) + '">เข้าห้องเรียน</a>'; cta = '<a class="pill" href="#/learn/' + encodeURIComponent(c.course_id) + '">เข้าห้องเรียน</a>'; }
    else if (st === 'pending') { box = '<div class="note wait">ส่งสลิปแล้ว แอดมินกำลังตรวจ ปกติไม่เกิน 24 ชั่วโมง ระบบจะส่งอีเมลแจ้งเมื่ออนุมัติ</div>'; cta = '<span class="badge b-wait">รอตรวจสลิป</span>'; }
    else if (c.bill) {
      box = '<div class="note ' + (c.bill.status === 'rejected' ? 'no' : 'wait') + '">' + (c.bill.status === 'reviewing' ? 'ส่งหลักฐานการโอนแล้ว แอดมินกำลังตรวจยอด' : c.bill.status === 'rejected' ? 'หลักฐานการโอนไม่ผ่าน แก้ไขแล้วส่งใหม่ได้ที่หน้าคำสั่งซื้อ' : 'คอร์สนี้อยู่ในคำสั่งซื้อที่ยังไม่ได้ชำระเงิน') + '</div><a class="pill block" href="#/orders/' + encodeURIComponent(c.bill.order_id) + '">ไปที่คำสั่งซื้อ ' + esc(c.bill.order_id) + '</a>';
      cta = '<a class="pill" href="#/orders/' + encodeURIComponent(c.bill.order_id) + '">ดูคำสั่งซื้อ</a>';
    }
    else { box = (st === 'rejected' ? '<div class="note no">สลิปครั้งก่อนไม่ผ่าน' + (c.note ? ': ' + esc(c.note) : '') + ' สั่งซื้อใหม่ได้ด้านล่าง</div>' : '') + '<div id="buy-act" class="stack" style="gap:10px">' + buyActions(c) + '</div>' + bundleOffers(c); cta = '<span id="mbar-cta">' + (inCart ? '<a class="pill" href="#/cart">ไปที่ตะกร้า</a>' : '<button class="pill" data-buy-now="' + esc(c.course_id) + '">ซื้อเลย</button>') + '</span>'; }
    var total = c.chapters.reduce(function (a, ch) { return a + ch.lessons.length; }, 0);
    var previews = []; c.chapters.forEach(function (ch) { ch.lessons.forEach(function (l) { if (l.is_preview) previews.push(l); }); });
    var ig = S.cfg.contact_ig || 'ineedbiochem';
    var faq = (c.faq || []).concat([
      { q: 'ซื้อแล้วดูได้นานแค่ไหน', a: 'ดูได้ตลอด ไม่มีวันหมดอายุ เปิดดูซ้ำได้ทุกตอนไม่จำกัดจำนวนครั้ง' },
      { q: 'ดูได้กี่เครื่อง', a: 'บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ถ้าเข้าสู่ระบบจากเครื่องใหม่ เครื่องเดิมจะออกจากระบบเอง สลับเครื่องได้ตลอด' },
      { q: 'ซื้อคอร์สยังไง', a: 'กดซื้อเลยหรือใส่ตะกร้า ใส่โค้ดส่วนลด (ถ้ามี) แล้วยืนยันคำสั่งซื้อ โอนเงินเข้าบัญชีที่แสดงในบิล แนบสลิปพร้อมกรอกข้อมูลการโอน จากนั้นแจ้งทาง IG @' + ig + ' อีกครั้ง' },
      { q: 'โอนเงินแล้วเข้าเรียนได้เมื่อไร', a: 'หลังแอดมินตรวจยอดเงิน ปกติภายใน 24 ชั่วโมง ระบบจะส่งอีเมลแจ้งเมื่ออนุมัติ แล้วเข้าเรียนได้ที่เมนู “คอร์สของฉัน”' },
      { q: 'ขอคืนเงินได้ไหม', a: 'ไม่มีนโยบายคืนเงินทุกกรณีเมื่อชำระเงินแล้ว และต้องโอนเข้าบัญชีที่แสดงในหน้าชำระเงินเท่านั้น' },
      { q: 'มีคำถามเพิ่มเติม ติดต่อใคร', a: 'ทัก IG @' + ig + ' ได้เลย' }
    ]);
    var jumps = [['overview', 'ภาพรวม'], ['syllabus', 'เนื้อหา']];
    if (c.instructor) jumps.push(['instructor', 'ผู้สอน']);
    if ((c.reviews || []).length || (S.results || []).some(function (r) { return r.subject === c.subject && r.review; })) jumps.push(['reviews', 'รีวิว']);
    jumps.push(['faq', 'คำถามที่พบบ่อย']);
    var CK = '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M5.5 10.3l3 3 6-6.3" fill="none" stroke="var(--on-acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    page('home',
      '<div style="padding-top:24px"><a class="back" href="#/">← คอร์สทั้งหมด</a></div><div class="cd"><div>' +
      '<section class="chero" id="sec-overview"><span class="mono sj">' + esc(c.subject_name) + '</span><h1>' + esc(c.title) + '</h1>' + (c.subtitle ? '<p class="ink2 lead">' + esc(c.subtitle) + '</p>' : '') +
      '<div class="facts"><span><b>' + total + '</b> ตอน</span><span><b>' + hm(c.total_min) + '</b> วิดีโอ</span><span><b>ดูได้ตลอด</b> ไม่มีวันหมดอายุ</span>' + (c.trial ? '<span title="จาก ' + c.trial.n + ' คนที่ลองดูตอนฟรี"><b>' + c.trial.clear_pct + '%</b> ของคนที่ลองเรียนฟรีบอกว่าเข้าใจ</span>' : '') + '</div>' +
      (c.trailer_id ? '<div class="player trailer">' + playerInner(c.trailer_id, '') + '</div>' : (c.cover_url ? '<div class="cover trailer" style="border-radius:16px;aspect-ratio:16/8"><img src="' + esc(imgSrc(c.cover_url)) + '" alt="" style="object-fit:contain"></div>' : '')) +
      (!c.trailer_id && previews.length ? '<button class="pill ghost s" style="justify-self:start" data-preview="' + esc(previews[0].youtube_id) + '" data-cid="' + esc(c.course_id) + '" data-title="' + esc(previews[0].title) + '">▶ ดูตอนตัวอย่างฟรี</button>' : '') + '</section>' +
      '<nav class="jump" aria-label="ส่วนของหน้า">' + jumps.map(function (j) { return '<button data-jump="' + j[0] + '">' + j[1] + '</button>'; }).join('') + '</nav>' +
      (c.highlights && c.highlights.length ? '<section class="sec"><h2>จุดเด่นของคอร์ส</h2><div class="hl">' + c.highlights.map(function (h) { return '<div><span class="ic">' + CK + '</span><span>' + esc(h) + '</span></div>'; }).join('') + '</div></section>' : '') +
      (c.audience && c.audience.length ? '<section class="sec"><h2>คอร์สนี้เหมาะกับ</h2><ul class="aud">' + c.audience.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></section>' : '') +
      (c.description ? '<section class="sec"><h2>รายละเอียดคอร์ส</h2><p class="desc">' + esc(c.description) + '</p></section>' : '') +
      '<section class="sec" id="sec-syllabus"><div class="spread"><h2>เนื้อหาในคอร์ส</h2><button class="link" id="syl-all">เปิดทุกบท</button></div><p class="sm ink2">' + (hasSections(c.chapters) ? sections(c.chapters).length + ' ส่วน · ' : '') + c.chapters.length + ' บท · ' + total + ' ตอน · ' + hm(c.total_min) + (previews.length ? ' · ดูฟรีได้ ' + previews.length + ' ตอน' : '') + '</p><div class="syl">' + (function () { var secs = hasSections(c.chapters) ? sections(c.chapters) : [{ name: '', chs: c.chapters.map(function (ch) { return { ch: ch, sub: '' }; }) }], k = 0; return secs.map(function (sec, si) {
        var sl = [].concat.apply([], sec.chs.map(function (x) { return x.ch.lessons; }));
        return (sec.name ? '<div class="secth"><span>' + esc(sec.name) + '</span><small>' + sl.length + ' ตอน · ' + hm(sl.reduce(function (a, l) { return a + l.duration_min; }, 0)) + '</small></div>' : '') + sec.chs.map(function (x) { var ch = x.ch, i = k++;
        var mins = ch.lessons.reduce(function (a, l) { return a + l.duration_min; }, 0);
        return '<details' + (i === 0 ? ' open' : '') + '><summary><span>' + esc(x.sub || ch.title) + '</span><span class="n">' + ch.lessons.length + ' ตอน · ' + hm(mins) + '</span></summary><ul>' + ch.lessons.map(function (l) {
          return '<li><span>' + esc(l.title) + (l.is_preview ? ' <button class="pill s ghost" style="margin-left:6px" data-preview="' + esc(l.youtube_id) + '" data-cid="' + esc(c.course_id) + '" data-title="' + esc(l.title) + '">ดูฟรี</button>' : '') + '</span><span class="d">' + l.duration_min + ' นาที</span></li>';
        }).join('') + '</ul></details>';
      }).join(''); }).join(''); })() + '</div></section>' +
      (c.instructor ? '<section class="sec" id="sec-instructor"><h2>ผู้สอน</h2>' + (c.instructors || [c.instructor]).map(instBlock).join('') + '</section>' : '') +
      revSec(c) +
      '<section class="sec" id="sec-faq"><h2>คำถามที่พบบ่อย</h2><div class="syl faq">' + faq.map(function (f) { return '<details><summary><span class="t">' + esc(f.q) + '</span><span class="n">+</span></summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</div></section>' +
      '</div><aside class="buy" id="sec-buy"><span class="mono">ราคาคอร์ส</span><span class="price">' + (c.full_price > c.price ? '<span class="was">' + baht(c.full_price) + '</span>' : '') + baht(c.price) + '</span>' +
      '<ul class="incl"><li>' + CK + 'คลิปเรียน ' + total + ' ตอน (' + hm(c.total_min) + ')</li><li>' + CK + 'ชีทประกอบในห้องเรียน</li><li>' + CK + 'ดูได้ตลอด ไม่มีวันหมดอายุ</li><li>' + CK + 'เรียนได้ทั้งมือถือและคอม</li></ul>' + box + '</aside></div>' +
      '<div class="mbar"><div><span class="sm ink2">' + esc(c.title) + '</span><b class="price">' + baht(c.price) + '</b></div>' + cta + '</div>');
    $('#syl-all').onclick = function () { var ds = $$('.syl:not(.faq) details'), open = ds.some(function (d) { return !d.open; }); ds.forEach(function (d) { d.open = open; }); this.textContent = open ? 'ปิดทุกบท' : 'เปิดทุกบท'; };
  }).catch(function (e) { failed('home', e); });
}
function pickUpload(btn) {
  var target = document.getElementById(btn.dataset.upload), prev = document.getElementById(btn.dataset.upload + '-prev');
  var fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*';
  fi.onchange = function () {
    var f = fi.files[0]; if (!f) return;
    busy(btn, true);
    compressImage(f).then(function (img) { return api('admin.upload', img); }).then(function (r) {
      target.value = r.url; if (prev) prev.innerHTML = '<img src="' + esc(imgSrc(r.url)) + '" alt="">'; busy(btn, false); toast('อัปโหลดรูปแล้ว');
    }).catch(function (e) { busy(btn, false); toast(e.message, true); });
  };
  fi.click();
}
function compressImage(f, maxSide, square) {
  return new Promise(function (res, rej) {
    var rd = new FileReader();
    rd.onerror = rej;
    rd.onload = function () {
      var img = new Image();
      img.onerror = rej;
      img.onload = function () {
        var max = maxSide || 1400, cv = document.createElement('canvas'), g = cv.getContext('2d');
        if (square) {
          var side = Math.min(img.width, img.height), out = Math.min(max, side);
          cv.width = cv.height = out; g.fillStyle = '#fff'; g.fillRect(0, 0, out, out);
          g.drawImage(img, (img.width - side) / 2, Math.max(0, (img.height - side) / 3), side, side, 0, 0, out, out);
        } else {
          var s = Math.min(1, max / Math.max(img.width, img.height));
          cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
          g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
        }
        res({ mime: 'image/jpeg', base64: cv.toDataURL('image/jpeg', 0.85).split(',')[1] });
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  });
}
function promptpay(id, amount) {
  var f = function (t, v) { return t + ('0' + v.length).slice(-2) + v; };
  var n = String(id).replace(/\D/g, '');
  var acc = n.length >= 13 ? f('02', n) : f('01', ('0000000000000' + '66' + n.replace(/^0/, '')).slice(-13));
  var s = f('00', '01') + f('01', amount ? '12' : '11') + f('29', f('00', 'A000000677010111') + acc) + f('53', '764') + (amount ? f('54', Number(amount).toFixed(2)) : '') + f('58', 'TH') + '6304';
  var crc = 0xFFFF;
  for (var i = 0; i < s.length; i++) { crc ^= s.charCodeAt(i) << 8; for (var j = 0; j < 8; j++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xFFFF; }
  return s + ('000' + crc.toString(16).toUpperCase()).slice(-4);
}
function previewVideo(id, title, cid) {
  openModal(mhead(esc(title), 'ตอนตัวอย่าง ดูได้ฟรี') + '<div class="player">' + playerInner(id, '') + '</div>' +
    (cid && feat('reviews') ? '<div class="tfb" id="tfb"><b>ลองเรียนฟรีแล้ว เข้าใจไหม?</b><div class="rowx" role="group" aria-label="เข้าใจแค่ไหน">' + [['clear', 'เข้าใจ'], ['partly', 'เข้าใจบางส่วน'], ['lost', 'ยังไม่เข้าใจ']].map(function (x) { return '<button class="pill ghost s" data-tf="' + x[0] + '" aria-pressed="false">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div id="tf-more" hidden class="stack" style="gap:8px"><textarea class="i" id="tf-text" rows="2" maxlength="500" placeholder="อยากบอกอะไรเพิ่มไหม เช่น ตรงไหนงง หรือชอบตรงไหน (ไม่ใส่ก็ได้)"></textarea><button class="pill s" id="tf-send" style="justify-self:start">ส่งความเห็น</button></div></div>' : ''), true);
  if (!cid) return;
  var lv = '';
  $$('[data-tf]').forEach(function (b) { b.onclick = function () { lv = b.dataset.tf; $$('[data-tf]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); x.classList.toggle('ghost', x !== b); }); $('#tf-more').hidden = false; }; });
  $('#tf-send').onclick = function () {
    var bt = this; busy(bt, true);
    api('trial.feedback', { course_id: cid, lesson: title, level: lv, text: $('#tf-text').value }).then(function () { $('#tfb').innerHTML = '<b>ขอบคุณที่บอกเรา</b><p class="sm ink2">ความเห็นของน้องช่วยให้พี่ ๆ ปรับคลิปให้เข้าใจง่ายขึ้น</p>'; }).catch(function (e) { busy(bt, false); toast(e.message, true); });
  };
}
function playerInner(id, wm, poster) {
  var v = DEMO
    ? '<div class="ph"' + (poster ? ' style="background:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.75)),url(' + esc(imgSrc(poster)) + ') center/contain no-repeat,#0b0b0b"' : '') + '><div class="play"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M7 4l14 8-14 8z"/></svg></div><span>ในเว็บจริง คลิป YouTube รหัส <b style="font-family:var(--mono)">' + esc(id) + '</b> จะเล่นตรงนี้</span></div>'
    : '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&modestbranding=1&playsinline=1" title="คลิปเรียน" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  return v + (wm ? '<span class="wm" id="wm" style="top:12%;left:8%">' + esc(wm) + '</span>' : '');
}

/* ─── CART / ORDERS ─── */
var CART = (function () { try { var a = JSON.parse(store('ib_cart') || '[]'); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string' && x; }).slice(0, 30) : []; } catch (e) { return []; } })();
function saveCart() { store('ib_cart', CART.length ? JSON.stringify(CART) : null); $$('.cart-n').forEach(function (b) { b.textContent = CART.length; b.hidden = !CART.length; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }); }
function cartAdd(id, silent) { if (CART.indexOf(id) < 0) { CART.push(id); saveCart(); } if (!silent) toast('เพิ่มลงตะกร้าแล้ว'); }
function cartRemove(id) { CART = CART.filter(function (x) { return x !== id; }); saveCart(); }
var DEFAULT_PAY_TERMS = '- ชำระเงินโดยโอนเข้าบัญชี {account} ที่แสดงในหน้าชำระเงินของบิลนี้เท่านั้น\n- INeedBio ไม่รับผิดชอบทุกกรณี หากโอนเข้าบัญชีอื่นที่ไม่ได้แสดงในหน้านี้ แม้จะมีผู้อ้างว่าเป็นทีมงาน\n- ไม่มีนโยบายคืนเงินทุกกรณีเมื่อชำระเงินแล้ว\n- โอนแล้วแนบสลิปและกรอกข้อมูลการโอนให้ครบ แล้วแจ้งการชำระเงินทาง IG @{ig} อีกครั้ง\n- สิทธิ์เข้าเรียนจะเปิดหลังแอดมินตรวจยอดเงินแล้ว';
function ppFmt(id) { var n = String(id || '').replace(/\D/g, ''); return n.length === 10 ? n.slice(0, 3) + '-' + n.slice(3, 6) + '-' + n.slice(6) : n; }
function accLine(a) { return [a.method === 'bank' ? (a.bank ? 'ธนาคาร' + a.bank : '') + (a.account_no ? ' เลขที่ ' + a.account_no : '') : (a.promptpay_id ? 'พร้อมเพย์ ' + ppFmt(a.promptpay_id) : ''), !a.account_no && !a.promptpay_id && a.qr_url ? 'ตาม QR ในหน้าบิล' : '', a.account_name ? 'ชื่อบัญชี ' + a.account_name : ''].filter(Boolean).join(' ').trim(); }
function billIg(a) { return (a && a.ig) || S.cfg.contact_ig || 'ineedbiochem'; }
function instBlock(t) {
  var ls = String(t.bio || '').split(/\n+/).filter(function (x) { return x.trim(); });
  return '<div class="inst"><div class="ph">' + '<img src="' + (t.photo ? esc(imgSrc(t.photo)) : CATSRC) + '" alt=""' + (t.photo ? ' onerror="this.src=CATSRC;this.className=\'cat\'"' : ' class="cat"') + '></div><div class="stack" style="gap:4px;flex:1;min-width:220px"><h3 style="font-size:20px">' + esc(t.name) + '</h3>' + (t.title ? '<span class="sm acc">' + esc(t.title) + '</span>' : '') +
    (ls.length > 1 ? '<ul class="bl">' + ls.map(function (l) { return '<li>' + esc(l.replace(/^[-•*]\s*/, '')) + '</li>'; }).join('') + '</ul>' : ls.length ? '<p class="ink2 desc" style="margin-top:6px">' + esc(ls[0]) + '</p>' : '') + '</div></div>';
}
function payTerms(a) {
  return (S.cfg.pay_terms_text || DEFAULT_PAY_TERMS).replace(/\{account\}/g, a ? accLine(a) : 'ที่แสดงในหน้าชำระเงินของแต่ละบิล').replace(/\{ig\}/g, a ? billIg(a) : (S.cfg.contact_ig || 'ineedbiochem'));
}
function payTermsModal(a) { openModal(mhead('ข้อตกลงการชำระเงิน') + '<div class="legal in-modal">' + mdLite(payTerms(a)) + '</div><button class="pill block" data-close="1">รับทราบ</button>'); }
function billBadge(s) {
  var m = { awaiting_payment: ['b-wait', 'รอชำระเงิน'], reviewing: ['b-inv', 'รอตรวจยอด'], rejected: ['b-no', 'หลักฐานไม่ผ่าน'], approved: ['b-ok', 'เรียนได้แล้ว'], expired: ['b-soft', 'หมดเวลาชำระ'], cancelled: ['b-soft', 'ยกเลิกแล้ว'] }[s] || ['b-soft', s];
  return '<span class="badge ' + m[0] + '">' + m[1] + '</span>';
}
var CART_IC = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17.5" cy="20" r="1.3"/></svg>';
function cartBtn() { return '<a class="cartbtn" href="#/cart" aria-label="ตะกร้า" title="ตะกร้า">' + CART_IC + '<span class="cart-n"' + (CART.length ? '' : ' hidden') + '>' + CART.length + '</span></a>'; }

function buyActions(c) {
  if (CART.indexOf(c.course_id) >= 0) return '<div class="note plain">คอร์สนี้อยู่ในตะกร้าแล้ว</div><a class="pill block" href="#/cart">ไปที่ตะกร้า · ชำระเงิน</a>';
  return '<button class="pill block" data-buy-now="' + esc(c.course_id) + '">ซื้อเลย</button><button class="pill ghost block" data-cart-add="' + esc(c.course_id) + '">เพิ่มลงตะกร้า</button>' +
    '<ol class="steps"><li>ใส่ตะกร้า ใส่โค้ดส่วนลด (ถ้ามี)</li><li>โอนเงินตามบิล แนบสลิปและกรอกข้อมูลการโอน</li><li>แจ้งการชำระเงินทาง IG อีกครั้ง</li><li>แอดมินตรวจยอดแล้วเปิดสิทธิ์ ระบบส่งอีเมลแจ้ง</li></ol>';
}
function refreshBuy(c) { var b = $('#buy-act'); if (b) b.innerHTML = buyActions(c); var m = $('#mbar-cta'); if (m) m.innerHTML = CART.indexOf(c.course_id) >= 0 ? '<a class="pill" href="#/cart">ไปที่ตะกร้า</a>' : '<button class="pill" data-buy-now="' + esc(c.course_id) + '">ซื้อเลย</button>'; }

function viewCart() {
  var empty = function () { page('cart', '<div class="page-h"><span class="mono">ตะกร้า</span><h1>ตะกร้าของฉัน</h1></div><div class="empty" style="margin-bottom:72px"><p>ยังไม่มีคอร์สในตะกร้า</p><a class="pill" href="#/">ดูคอร์สทั้งหมด</a></div>'); };
  if (!CART.length) return empty();
  loading('cart', 'list');
  api('cart.quote', { course_ids: CART, coupon: S.coupon || '' }).then(function (q) {
    if (q.missing.length) { CART = CART.filter(function (id) { return q.missing.indexOf(id) < 0; }); saveCart(); toast('เอาคอร์สที่ปิดขายแล้วออกจากตะกร้าให้แล้ว'); if (!CART.length) return empty(); }
    var blocked = q.items.filter(function (i) { return i.blocked; });
    var row = function (it) {
      var why = { owned: 'คุณมีคอร์สนี้แล้ว', pending: 'คอร์สนี้รอตรวจสลิปอยู่', in_bill: 'อยู่ในคำสั่งซื้อที่ยังไม่เสร็จ' }[it.blocked];
      return '<div class="ci' + sc(it.subject) + (it.blocked ? ' off' : '') + '"><a class="th" href="#/course/' + encodeURIComponent(it.course_id) + '">' + cover(it) + '</a><div class="stack" style="gap:2px;min-width:0"><span class="mono">' + esc(it.subject_name) + '</span><a class="t" href="#/course/' + encodeURIComponent(it.course_id) + '">' + esc(it.title) + '</a>' +
        (why ? '<span class="sm" style="color:var(--no)">' + why + ' · ลบออกก่อนชำระเงิน</span>' : '') + (it.bundle ? '<span class="btag">แพ็กเกจ: ' + esc(it.bundle) + '</span>' : '') + '</div><div class="pr">' + (it.discount ? '<s>' + baht(it.price) + '</s><b>' + baht(it.net) + '</b>' : '<b>' + baht(it.price) + '</b>') + '<button class="link sm" data-cart-rm="' + esc(it.course_id) + '">ลบ</button></div></div>';
    };
    var list = q.bills.length > 1
      ? q.bills.map(function (b, i) { return '<div class="cgrp"><div class="spread"><b>บิลที่ ' + (i + 1) + '</b><span class="sm muted">' + (b.account.method === 'bank' ? 'โอนเข้า ' + esc(b.account.bank) : 'พร้อมเพย์') + ' · ' + esc(b.account.account_name) + '</span></div>' + b.items.map(row).join('') + '<div class="spread sm"><span class="muted">ยอดบิลนี้</span><b>' + baht(b.total) + '</b></div></div>'; }).join('')
      : q.bills.length ? q.bills[0].items.map(row).join('') : '';
    if (blocked.length) list += blocked.map(row).join('');
    var cp = q.coupon;
    page('cart', '<div class="page-h"><span class="mono">ตะกร้า · ' + CART.length + ' คอร์ส</span><h1>ตะกร้าของฉัน</h1></div><div class="cartx"><div class="stack" style="gap:14px">' +
      (q.bills.length > 1 ? '<div class="note wait">คอร์สในตะกร้ารับเงินคนละบัญชี ระบบจะแยกเป็น ' + q.bills.length + ' บิล ต้องโอนแยกตามบิล</div>' : '') + list +
      (q.suggest || []).map(function (g) { return '<div class="sugg"><span>เพิ่ม <b>' + g.add_titles.map(esc).join(', ') + '</b> อีกแค่ <b>' + baht(g.extra) + '</b> ได้ ' + esc(g.title) + ' (ประหยัด ' + baht(g.save) + ')</span><button class="pill s" data-recart="' + esc(g.add_ids.join(',')) + '">เพิ่มเลย</button></div>'; }).join('') +
      '<a class="link sm" href="#/" style="justify-self:start">← เลือกคอร์สเพิ่ม</a></div>' +
      '<aside class="buy"><span class="mono">สรุปคำสั่งซื้อ</span>' +
      '<form class="cpf" id="cpf"><input class="i" id="cp-in" name="coupon" placeholder="โค้ดส่วนลด" value="' + esc(cp ? cp.code : '') + '" autocomplete="off" autocapitalize="characters"' + (cp && cp.ok ? ' readonly' : '') + '>' +
      (cp && cp.ok ? '<button type="button" class="pill quiet s" id="cp-rm">เอาออก</button>' : '<button class="pill ghost s">ใช้โค้ด</button>') + '</form>' +
      (cp ? cp.ok ? '<p class="sm" style="color:var(--ok);margin-top:-6px">ใช้โค้ด ' + esc(cp.code) + ' แล้ว · ' + esc(cp.label) + '</p>' : '<p class="err" style="margin-top:-6px">' + esc(cp.message) + '</p>' : '') +
      '<div class="sum"><div><span>ราคาคอร์ส</span><span>' + baht(q.subtotal) + '</span></div>' + (q.bundles || []).map(function (x) { return '<div class="bdn"><span>แพ็กเกจ ' + esc(x.title) + (x.upgrade ? ' (คิดส่วนต่าง)' : '') + '</span><span>−' + baht(x.save) + '</span></div>'; }).join('') +
      (cp && cp.ok && cp.discount ? '<div class="dis"><span>โค้ด ' + esc(cp.code) + '</span><span>−' + baht(cp.discount) + '</span></div>' : '') + '<div class="tot"><span>ยอดชำระ</span><b>' + baht(q.total) + '</b></div></div>' +
      '<label class="consent"><input type="checkbox" id="pt-ok"><span>ฉันอ่านและยอมรับ <button type="button" class="link" id="pt-read">ข้อตกลงการชำระเงิน</button> โอนเข้าบัญชีที่แสดงในหน้าชำระเงินเท่านั้น และไม่มีนโยบายคืนเงินทุกกรณี</span></label>' +
      (blocked.length ? '<p class="err">ลบคอร์สที่ซื้อไม่ได้ออกจากตะกร้าก่อน</p>' : '') +
      (S.user ? '<button class="pill block" id="checkout"' + (blocked.length || !q.bills.length ? ' disabled' : '') + '>ยืนยันคำสั่งซื้อ</button>' : '<button class="pill block" data-act="login">เข้าสู่ระบบเพื่อชำระเงิน</button><button class="pill ghost block" data-act="signup">ยังไม่มีบัญชี สมัครสมาชิก</button>') +
      '<p class="hint" style="text-align:center">กดยืนยันแล้วจะเห็นเลขบัญชี/QR ของแต่ละบิล ชำระภายใน ' + (Number(S.cfg.order_expire_hours) || 48) + ' ชั่วโมง</p></aside></div>');
    $('#cpf').onsubmit = function (e) { e.preventDefault(); var v = $('#cp-in').value.trim().toUpperCase(); if (!v) return; S.coupon = v; viewCart(); };
    if ($('#cp-rm')) $('#cp-rm').onclick = function () { S.coupon = ''; viewCart(); };
    $('#pt-read').onclick = function () { payTermsModal(null); };
    if ($('#checkout')) $('#checkout').onclick = function () {
      var btn = this;
      if (!$('#pt-ok').checked) { toast('ติ๊กยอมรับข้อตกลงการชำระเงินก่อน', true); $('#pt-ok').focus(); return; }
      busy(btn, true);
      api('order.create', { course_ids: CART, coupon: cp && cp.ok ? cp.code : '', accept_pay_terms: true }).then(function (r) {
        CART = []; saveCart(); S.coupon = ''; S.mem = {}; go('/orders/' + r.order_id);
      }).catch(function (e) { busy(btn, false); toast(e.message, true); if (e.code === 'COUPON') { S.coupon = ''; } });
    };
  }).catch(function (e) { failed('cart', e); });
}

function viewOrders(oid) {
  loading('my', 'list');
  api('my.orders', oid ? { order_id: oid } : {}).then(function (list) {
    if (!oid) {
      page('my', '<div class="page-h"><a class="back" href="#/my">← คอร์สของฉัน</a><h1>คำสั่งซื้อ</h1></div>' + (list.length ? '<div class="stack" style="gap:12px;padding-bottom:72px">' + list.map(function (o) {
        return '<a class="orow" href="#/orders/' + esc(o.order_id) + '"><div class="stack" style="gap:2px"><b>' + esc(o.order_id) + '</b><span class="sm muted">' + thDate(o.created_at, true) + ' · ' + o.bills.reduce(function (a, b) { return a + b.items.length; }, 0) + ' คอร์ส</span></div><div class="rowx">' + o.bills.map(function (b) { return billBadge(b.status); }).join('') + '<b>' + baht(o.total) + '</b></div></a>';
      }).join('') + '</div>' : '<div class="empty" style="margin-bottom:72px"><p>ยังไม่มีคำสั่งซื้อ</p><a class="pill" href="#/">ดูคอร์สทั้งหมด</a></div>'));
      return;
    }
    var o = list[0];
    if (!o) return failed('my', new Error('ไม่พบคำสั่งซื้อนี้'));
    S.bills = {}; o.bills.forEach(function (b) { S.bills[b.bill_id] = b; });
    page('my', '<div class="page-h"><a class="back" href="#/orders">← คำสั่งซื้อทั้งหมด</a><span class="mono">สั่งซื้อเมื่อ ' + thDate(o.created_at, true) + (o.coupon_code ? ' · โค้ด ' + esc(o.coupon_code) : '') + '</span><h1>คำสั่งซื้อ ' + esc(o.order_id) + '</h1>' +
      (o.bills.length > 1 ? '<p class="ink2">คำสั่งซื้อนี้มี ' + o.bills.length + ' บิล เพราะแต่ละวิชารับเงินคนละบัญชี <b>โอนแยกตามบิล</b> และแนบสลิปแยกกัน</p>' : '') + '</div>' +
      '<div class="stack" style="gap:22px;padding-bottom:72px">' + o.bills.map(function (b, i) { return billCard(b, i, o.bills.length); }).join('') + '</div>');
    o.bills.forEach(function (b) { bindProof(b); });
  }).catch(function (e) { failed('my', e); });
}
function billCard(b, i, n) {
  var a = b.account, open = b.status === 'awaiting_payment' || b.status === 'rejected';
  var items = '<ul class="bitems">' + b.items.map(function (it) { return '<li><span>' + esc(it.title) + (it.bundle ? ' <span class="btag">· ' + esc(it.bundle) + '</span>' : '') + '</span><span>' + (it.discount ? '<s class="muted">' + baht(it.price) + '</s> ' : '') + baht(it.net) + '</span></li>'; }).join('') + '</ul>';
  var head = '<div class="spread"><div class="stack" style="gap:2px"><span class="mono">' + (n > 1 ? 'บิลที่ ' + (i + 1) + ' จาก ' + n + ' · ' : '') + esc(b.bill_id) + '</span><b class="btot">' + baht(b.total) + '</b></div>' + billBadge(b.status) + '</div>';
  var body = '';
  if (open) {
    var qr = '';
    try { if (a.method !== 'bank' && !a.qr_url && window.qrcode && a.promptpay_id) { var q = qrcode(0, 'M'); q.addData(promptpay(a.promptpay_id, b.total)); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } } catch (e) { qr = ''; }
    body = (b.status === 'rejected' ? '<div class="note no">หลักฐานครั้งก่อนไม่ผ่าน' + (b.note ? ': ' + esc(b.note) : '') + ' แก้ไขแล้วส่งใหม่ได้ด้านล่าง</div>' : '') +
      '<p class="sm ink2">ชำระภายใน <b>' + thDate(b.expires_at, true) + '</b> ถ้าเลยเวลา บิลจะถูกยกเลิกอัตโนมัติ</p>' +
      '<div class="paygrid"><div class="stack" style="gap:12px">' +
      '<h3 class="bh">1. โอนเงิน ' + baht(b.total) + '</h3>' +
      (a.qr_url ? '<div class="qrbox"><img src="' + esc(imgSrc(a.qr_url)) + '" alt="QR รับเงิน" style="max-width:220px;width:100%"><small>' + (a.account_name ? esc(a.account_name) + '<br>' : '') + 'ยอด ' + baht(b.total) + '</small></div>' :
        a.method === 'bank' || !qr ? '' : '<div class="qrbox"><span class="pp">PromptPay</span>' + qr + '<small>' + (a.account_name ? esc(a.account_name) + '<br>' : '') + 'ยอด ' + baht(b.total) + '</small></div>') +
      '<div class="accbox">' + (a.method === 'bank'
        ? (a.bank ? '<div><span>ธนาคาร</span><b>' + esc(a.bank) + '</b></div>' : '') + (a.account_no ? '<div><span>เลขบัญชี</span><b class="mono-n">' + esc(a.account_no) + '</b><button class="pill quiet s" data-copy="' + esc(String(a.account_no).replace(/\D/g, '')) + '">คัดลอก</button></div>' : '')
        : (a.promptpay_id ? '<div><span>พร้อมเพย์</span><b class="mono-n">' + esc(ppFmt(a.promptpay_id)) + '</b><button class="pill quiet s" data-copy="' + esc(a.promptpay_id) + '">คัดลอก</button></div>' : '')) +
      (a.account_name ? '<div><span>ชื่อบัญชี</span><b>' + esc(a.account_name) + '</b></div>' : '') + '<div><span>ยอดโอน</span><b>' + baht(b.total) + '</b><button class="pill quiet s" data-copy="' + b.total + '">คัดลอก</button></div></div>' +
      (a.note ? '<p class="sm ink2">' + esc(a.note) + '</p>' : '') +
      '<div class="pterms"><b class="sm">ข้อตกลงการชำระเงิน</b>' + mdLite(payTerms(a)) + '</div></div>' +
      '<div class="stack" style="gap:12px"><h3 class="bh">2. แจ้งหลักฐานการโอน</h3>' + proofForm(b) + '</div></div>' +
      '<button class="link sm" data-bill-cancel="' + esc(b.bill_id) + '" style="justify-self:start;color:var(--muted)">ยกเลิกบิลนี้</button>';
  } else if (b.status === 'reviewing') {
    body = '<div class="note wait">ส่งหลักฐานแล้วเมื่อ ' + thDate(b.submitted_at, true) + ' แอดมินกำลังตรวจยอด ระบบจะส่งอีเมลแจ้งเมื่ออนุมัติ</div>' +
      '<div class="rowx"><button class="pill" data-igm="' + esc(b.bill_id) + '">แจ้งทาง IG @' + esc(billIg(a)) + '</button><span class="sm muted">ถ้ายังไม่ได้แจ้ง ส่งข้อความหาแอดมินพร้อมสลิปอีกครั้ง</span></div>';
  } else if (b.status === 'approved') {
    body = '<div class="note ok">ตรวจยอดแล้ว เข้าเรียนได้เลย</div><div class="rowx">' + b.items.map(function (it) { return '<a class="pill ghost s" href="#/learn/' + encodeURIComponent(it.course_id) + '">เรียน ' + esc(it.title) + '</a>'; }).join('') + '</div>';
  } else {
    body = '<div class="note plain">' + (b.status === 'expired' ? 'บิลนี้หมดเวลาชำระแล้ว' : 'บิลนี้ถูกยกเลิกแล้ว') + ' ถ้ายังต้องการคอร์สเหล่านี้ ใส่ตะกร้าแล้วสั่งซื้อใหม่ได้</div><button class="pill ghost s" style="justify-self:start" data-recart="' + esc(b.items.map(function (x) { return x.course_id; }).join(',')) + '">ใส่ตะกร้าอีกครั้ง</button>';
  }
  return '<section class="bill' + (open ? ' open' : '') + '" id="bill-' + esc(b.bill_id) + '">' + head + items + (b.discount ? '<p class="sm muted" style="margin-top:-8px">รวมส่วนลด ' + baht(b.discount) + ' แล้ว</p>' : '') + body + '</section>';
}
function pad2(n) { return ('0' + n).slice(-2); }
function proofForm(b) {
  var m = function (k) { return S.cfg['proof_' + k] === 'optional' || S.cfg['proof_' + k] === 'hidden' ? S.cfg['proof_' + k] : 'required'; };
  var lab = function (t, k) { return t + (m(k) === 'optional' ? ' <span class="muted">(ไม่บังคับ)</span>' : ''); };
  var d = new Date(), u = S.user || {}, id = b.bill_id, pr = b.status === 'rejected' && b.proof ? b.proof : {};
  var pd = pr.paid_at ? new Date(pr.paid_at) : null;
  var banks = (S.cfg.banks || []).map(function (x) { return [x, x]; });
  return '<form class="form pf" data-bill="' + esc(id) + '">' +
    '<input type="file" accept="image/*" hidden class="pf-file"><button class="drop pf-drop" type="button">แตะเพื่อแนบรูปสลิป</button>' +
    (m('paid_at') !== 'hidden' ? '<div class="row2">' + field('pd', lab('วันที่โอน', 'paid_at'), pd ? pd.getFullYear() + '-' + pad2(pd.getMonth() + 1) + '-' + pad2(pd.getDate()) : d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()), { type: 'date', idp: id }) + field('pt', lab('เวลาที่โอน (ตามสลิป)', 'paid_at'), pd ? pad2(pd.getHours()) + ':' + pad2(pd.getMinutes()) : '', { type: 'time', idp: id }) + '</div>' : '') +
    '<div class="row2">' + (m('amount') !== 'hidden' ? field('amount', lab('ยอดที่โอน (บาท)', 'amount'), pr.amount || b.total, { mode: 'decimal', idp: id }) : '') +
    (m('from_bank') !== 'hidden' ? field('from_bank', lab('โอนจากธนาคาร', 'from_bank'), pr.from_bank || '', { options: [['', '— เลือก —']].concat(banks), idp: id }) : '') + '</div>' +
    (m('payer_name') !== 'hidden' ? field('payer_name', lab('ชื่อเจ้าของบัญชีที่โอน', 'payer_name'), pr.payer_name || ((u.first_name || '') + ' ' + (u.last_name || '')).trim(), { idp: id }) +
      field('payer_relation', 'ถ้าไม่ใช่บัญชีของน้องเอง ระบุว่าเป็นของใคร', pr.payer_relation || '', { ph: 'เช่น แม่, พ่อ, พี่', idp: id }) : '') +
    (S.cfg.proof_extra_fields || []).map(function (x) { return field(x.key, esc(x.label) + (x.required ? '' : ' <span class="muted">(ไม่บังคับ)</span>'), pr[x.label] || '', { idp: id }); }).join('') +
    '<p class="err" hidden></p><button class="pill block">ส่งหลักฐานการโอน</button></form>';
}
function bindProof(b) {
  var f = document.querySelector('.pf[data-bill="' + b.bill_id + '"]'); if (!f) return;
  var file = $('.pf-file', f), drop = $('.pf-drop', f), slip = null, er = $('.err', f);
  drop.onclick = function () { file.click(); };
  file.onchange = function () {
    var x = file.files[0]; if (!x) return;
    if (!/^image\//.test(x.type)) return toast('แนบได้เฉพาะรูปภาพ', true);
    compressImage(x).then(function (r) { slip = r; drop.classList.add('has'); drop.innerHTML = '<img src="data:' + r.mime + ';base64,' + r.base64 + '" alt="สลิปที่แนบ"><span class="sm">แตะเพื่อเปลี่ยนรูป</span>'; })
      .catch(function () { toast('เปิดรูปนี้ไม่ได้ ลองรูปอื่น', true); });
  };
  f.onsubmit = function (e) {
    e.preventDefault(); er.hidden = true;
    var d = formData(f), btn = $('button:not([type=button])', f);
    if (!slip) { er.textContent = 'แนบรูปสลิปก่อน'; er.hidden = false; return; }
    d.bill_id = b.bill_id; d.slip = slip;
    if (d.pd !== undefined) { if (d.pd && d.pt) d.paid_at = new Date(d.pd + 'T' + d.pt).toISOString(); else d.paid_at = ''; delete d.pd; delete d.pt; }
    if (S.cfg.proof_paid_at !== 'optional' && S.cfg.proof_paid_at !== 'hidden' && !d.paid_at) { er.textContent = 'กรอกวันและเวลาที่โอนตามสลิป'; er.hidden = false; return; }
    busy(btn, true);
    api('bill.proof', d).then(function (nb) { S.bills[nb.bill_id] = nb; toast('ส่งหลักฐานแล้ว'); viewOrders(nb.order_id); setTimeout(function () { igModal(nb); }, 350); })
      .catch(function (x) { busy(btn, false); er.textContent = x.message; er.hidden = false; });
  };
}
function igMsg(b) {
  var u = S.user || {}, p = b.proof || {};
  return ['แจ้งชำระเงิน INeedBio', 'บิล: ' + b.bill_id, 'ชื่อ: ' + (u.first_name || '') + ' ' + (u.last_name || '') + ' (' + (u.nickname || '') + ')', 'อีเมล: ' + (u.email || ''),
    'คอร์ส: ' + b.items.map(function (i) { return i.title; }).join(', '), 'ยอดโอน: ' + baht(p.amount || b.total) + (p.paid_at ? '\nโอนเมื่อ: ' + thDate(p.paid_at, true) : '') + (p.from_bank ? '\nจากธนาคาร: ' + p.from_bank : '')].join('\n');
}
function igModal(b) {
  var ig = billIg(b.account), msg = igMsg(b);
  openModal(mhead('ขั้นสุดท้าย: แจ้งทาง IG', 'ส่งข้อความนี้หาแอดมิน IG @' + esc(ig) + ' พร้อมแนบรูปสลิปอีกครั้ง แอดมินจะตรวจยอดได้เร็วขึ้น') +
    '<ol class="steps"><li>กด "คัดลอกข้อความ"</li><li>กด "เปิด IG" แล้ววางข้อความในแชท</li><li>แนบรูปสลิปแล้วส่ง</li></ol>' +
    '<textarea class="i igmsg" id="ig-msg" readonly>' + esc(msg) + '</textarea>' +
    '<div class="row2"><button class="pill ghost" id="ig-copy">คัดลอกข้อความ</button><a class="pill" href="https://ig.me/m/' + encodeURIComponent(ig) + '" target="_blank" rel="noopener">เปิด IG @' + esc(ig) + '</a></div>' +
    '<button class="link sm" data-close="1" style="justify-self:center">แจ้งแล้ว ปิดหน้าต่างนี้</button>');
  $('#ig-copy').onclick = function () { copyText(msg, $('#ig-msg')); };
}
function copyText(t, ta) {
  var ok = function () { toast('คัดลอกแล้ว'); };
  var fb = function () { try { var x = ta || document.createElement('textarea'); if (!ta) { x.value = t; x.style.position = 'fixed'; x.style.opacity = '0'; document.body.appendChild(x); } x.select(); document.execCommand('copy'); if (!ta) x.remove(); ok(); } catch (e) { toast('คัดลอกไม่ได้ กดค้างที่ข้อความแล้วคัดลอกเอง', true); } };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(String(t)).then(ok, fb); else fb();
}

/* ─── MY COURSES ─── */
function viewMy() {
  loading('my', 'list');
  Promise.all([api('my.courses'), api('my.orders').catch(function () { return []; })]).then(function (res) {
    var list = res[0], openB = [];
    res[1].forEach(function (od) { od.bills.forEach(function (b) { if (b.status === 'awaiting_payment' || b.status === 'rejected' || b.status === 'reviewing') openB.push({ b: b, o: od.order_id }); }); });
    var o = {}; list.forEach(function (x) { o[x.course_id] = x.enrollment; }); S.mem.mine = o;
    var rank = { approved: 0, pending: 1, rejected: 2 }; list.sort(function (a, b) { return rank[a.enrollment] - rank[b.enrollment]; });
    var needPay = openB.filter(function (x) { return x.b.status !== 'reviewing'; }), waitB = openB.filter(function (x) { return x.b.status === 'reviewing'; });
    page('my', '<div class="page-h"><span class="mono">สวัสดี ' + esc(S.user.nickname) + '</span><div class="spread"><h1>คอร์สของฉัน</h1><a class="pill quiet s" href="#/orders">คำสั่งซื้อทั้งหมด</a></div></div>' +
      (!S.user.has_photo && S.user.role !== 'admin' ? '<a class="note wait" style="display:block;margin-bottom:12px;text-decoration:none" href="#/profile">ยังไม่มีรูปถ่ายของน้องในบัญชี เพิ่มรูปไว้ แอดมินจะยืนยันตัวตนและตรวจการชำระเงินได้เร็วขึ้น → เพิ่มรูป</a>' : '') +
      (needPay.length ? '<a class="note no" style="display:block;margin-bottom:12px;text-decoration:none" href="#/orders/' + encodeURIComponent(needPay[0].o) + '">มีบิลรอชำระ/ส่งหลักฐาน ' + needPay.length + ' บิล · ' + needPay.map(function (x) { return x.b.items.map(function (i) { return esc(i.title); }).join(', '); }).join(' · ') + ' → ชำระเงิน</a>' : '') +
      (S.user.role === 'student' ? '<div class="note plain" style="margin-bottom:12px">เคยเรียนกับ INeedBio ก่อนมีเว็บนี้? คอร์สเดิมจะขึ้นให้อัตโนมัติ ถ้าภายใน 24 ชม. ยังไม่ขึ้น ทักแอดมินที่ <a href="https://www.instagram.com/' + esc(S.cfg.contact_ig || 'ineedbiochem') + '" target="_blank" rel="noopener">IG @' + esc(S.cfg.contact_ig || 'ineedbiochem') + '</a></div>' : '') +
      (waitB.length ? '<div class="note wait" style="margin-bottom:12px">รอแอดมินตรวจยอด ' + waitB.length + ' บิล: ' + waitB.map(function (x) { return x.b.items.map(function (i) { return esc(i.title); }).join(', '); }).join(' · ') + '</div>' : '') +
      (list.length ? '<div class="mine">' + list.map(function (c, i) {
        var st = c.enrollment;
        return '<div class="mc' + sc(c.subject) + '">' + (c.cover_url ? '<a class="mcc" href="' + (st === 'approved' ? '#/learn/' : '#/course/') + encodeURIComponent(c.course_id) + '" aria-hidden="true" tabindex="-1">' + cover(c) + '</a>' : '') + '<div class="spread"><span class="mono">' + esc(c.subject_name) + '</span>' + statusBadge(st) + '</div><h3>' + esc(c.title) + '</h3>' +
          (st === 'approved'
            ? '<div class="stack" style="gap:6px"><div class="bar"><i style="width:' + c.percent + '%"></i></div><span class="sm ink2">เรียนไปแล้ว ' + c.percent + '% · ' + c.done_count + ' จาก ' + c.lesson_count + ' ตอน</span></div><div class="act"><a class="pill" href="#/learn/' + encodeURIComponent(c.course_id) + '">' + (c.done_count ? 'เรียนต่อ' : 'เริ่มเรียน') + '</a></div>'
            : st === 'pending' ? '<p class="sm ink2">ส่งสลิปเมื่อ ' + thDate(c.requested_at, true) + ' · แอดมินกำลังตรวจ</p>'
            : '<p class="sm ink2">สลิปไม่ผ่าน' + (c.note ? ': ' + esc(c.note) : '') + '</p><div class="act"><a class="pill ghost" href="#/course/' + encodeURIComponent(c.course_id) + '">ส่งสลิปใหม่</a></div>') + '</div>';
      }).join('') + '</div>' : '<div class="empty" style="margin-bottom:72px"><p>ยังไม่มีคอร์ส เลือกคอร์สที่สนใจแล้วใส่ตะกร้าได้เลย</p><a class="pill" href="#/">ดูคอร์สทั้งหมด</a></div>'));
    if ($('#legacy-btn')) $('#legacy-btn').onclick = function () {
      var b = this; busy(b, true);
      api('legacy.claim').then(function (r) { busy(b, false); if (r.matched && !r.already) { toast('ยินดีต้อนรับกลับ เปิดคอร์สเดิมให้แล้ว'); S.mem.mine = null; viewMy(); } else toast(r.already ? 'บัญชีนี้ได้รับสิทธิ์นักเรียนเก่าแล้ว' : r.message || 'ส่งเรื่องแล้ว', !r.matched && !r.queued); })
        .catch(function (e) { busy(b, false); toast(e.message, true); });
    };
  }).catch(function (e) { failed('my', e); });
}

/* ─── เครื่องเล่นคลิปเรียน: ซ่อนปุ่มแชร์/คัดลอกลิงก์/ชื่อคลิปของ YouTube ใช้ปุ่มควบคุมของเว็บแทน ─── */
var PI = {
  play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L4 12l7 7"/><text x="13" y="16" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">10</text></svg>',
  fwd: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 5l7 7-7 7"/><text x="1" y="16" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">10</text></svg>',
  vol: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  fs: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
};
function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (S.ytLoad) return S.ytLoad;
  S.ytLoad = new Promise(function (res, rej) {
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) try { prev(); } catch (e) {} res(); };
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = function () { S.ytLoad = null; rej(new Error('load')); };
    document.head.appendChild(s);
    setTimeout(function () { if (!(window.YT && window.YT.Player)) { S.ytLoad = null; rej(new Error('timeout')); } }, 15000);
  });
  return S.ytLoad;
}
function fmtT(s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(x); }
function stopPlayer() {
  S.ytGen = (S.ytGen || 0) + 1; // ตัวที่กำลังโหลดอยู่จะไม่ถูกสร้างต่อ
  if (S.ytT) { clearInterval(S.ytT); S.ytT = null; }
  clearInterval(S.studyT);
  if (S.ytOff) { try { S.ytOff(); } catch (e) {} S.ytOff = null; }
  var p = S.yt || S.ytPend; S.yt = null; S.ytPend = null;
  if (p) { try { p.destroy(); } catch (e) {} }
  S.ytCtl = null; document.body.classList.remove('fake-fs-on');
}
/** มือถือ/แท็บเล็ต (รวม iPad ที่แจ้งตัวเป็น Mac) · คอมจอสัมผัสที่มีเมาส์ไม่นับ */
function isHandheld() {
  var ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches);
}
/** el = กล่อง .player · opt.onEnd เรียกเมื่อดูจบ · opt.key ใช้จำตำแหน่งที่ดูค้างไว้ */
var YTRATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
/* ความชัด: 0 = อัตโนมัติ (กรอบเท่าจอ ไม่ย่อ ให้ YouTube เลือกตามจอเอง) · มือถือ/แท็บเล็ตไม่มี 1440p/4K */
var YTQ = [[0, 'อัตโนมัติ', ''], [2160, '4K', 'highres'], [1440, '1440p', 'hd1440'], [1080, '1080p', 'hd1080'], [720, '720p', 'hd720'], [480, '480p', 'large'], [360, '360p', 'medium']];
var YTQ_KEY = 'ib_q2';
function safePlayer(el, vid, wm, opt) {
  opt = opt || {};
  stopPlayer();
  var gen = S.ytGen, hand = isHandheld(), QS = YTQ.filter(function (q) { return !hand || q[0] <= 1080; });
  el.classList.add('sp', 'is-idle');
  el.innerHTML = '<div class="yt-crop"><div id="yt-host"></div></div><div class="yt-shield"></div>' +
    (wm ? '<span class="wm" id="wm" style="top:12%;left:8%">' + esc(wm) + '</span>' : '') +
    '<div class="yt-cover"' + (opt.poster ? ' style="--poster:url(' + esc(imgSrc(opt.poster)) + ')"' : '') + '><button class="yt-big" aria-label="เล่น">' + PI.play + '</button><div class="yt-msg"></div></div>' +
    '<div class="yt-bar"><input type="range" class="yt-seek" min="0" max="1000" value="0" step="1" aria-label="เลื่อนเวลา">' +
    '<div class="yt-row"><button class="yt-b" data-y="toggle" aria-label="เล่น/หยุด">' + PI.play + '</button><button class="yt-b" data-y="back" aria-label="ย้อน 10 วินาที">' + PI.back + '</button><button class="yt-b" data-y="fwd" aria-label="ข้าม 10 วินาที">' + PI.fwd + '</button>' +
    '<button class="yt-b" data-y="mute" aria-label="เปิด/ปิดเสียง">' + PI.vol + '</button><span class="yt-time">0:00 / 0:00</span><span style="flex:1"></span>' +
    '<select class="yt-q" aria-label="ความชัด">' + QS.map(function (q) { return '<option value="' + q[0] + '">' + q[1] + '</option>'; }).join('') + '</select>' +
    '<select class="yt-rate" aria-label="ความเร็ว">' + YTRATES.map(function (r) { return '<option value="' + r + '"' + (r === 1 ? ' selected' : '') + '>' + r + 'x</option>'; }).join('') + '</select>' +
    '<button class="yt-b" data-y="fs" aria-label="เต็มจอ">' + PI.fs + '</button></div></div>';
  var P = null, dur = 0, drag = false, hideT = null, ended = false, posKey = opt.key ? 'ib_pos_' + opt.key : '';
  var seek = $('.yt-seek', el), time = $('.yt-time', el), msg = $('.yt-msg', el), tgl = $('[data-y=toggle]', el), mb = $('[data-y=mute]', el);
  var setState = function (st) { ['is-idle', 'is-playing', 'is-paused', 'is-ended', 'is-buffering'].forEach(function (c) { el.classList.remove(c); }); el.classList.add(st); tgl.innerHTML = st === 'is-playing' || st === 'is-buffering' ? PI.pause : PI.play; };
  var wake = function () { el.classList.remove('hide-ui'); clearTimeout(hideT); hideT = setTimeout(function () { if (el.classList.contains('is-playing')) el.classList.add('hide-ui'); }, 2600); };
  var tick = function () {
    if (!P || !P.getCurrentTime) return;
    var t = P.getCurrentTime() || 0; dur = P.getDuration() || dur;
    if (!drag && dur) seek.value = Math.round(t / dur * 1000);
    seek.style.setProperty('--p', (seek.value / 10) + '%');
    time.textContent = fmtT(t) + ' / ' + fmtT(dur);
    if (posKey && t > 5 && el.classList.contains('is-playing') && Math.floor(t) % 5 === 0) store(posKey, String(Math.floor(t)));
  };
  var toggle = function () { if (!P) return; if (ended) { ended = false; P.seekTo(0, true); P.playVideo(); return; } var s = P.getPlayerState(); if (s === 1 || s === 3) P.pauseVideo(); else P.playVideo(); };
  var jump = function (d) { if (!P) return; var t = Math.min(Math.max(0, (P.getCurrentTime() || 0) + d), Math.max(0, dur - 1)); P.seekTo(t, true); tick(); wake(); };
  var isFs = function () { return document.fullscreenElement === el || document.webkitFullscreenElement === el || el.classList.contains('fake-fs'); };
  var fs = function () {
    if (isFs()) { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); el.classList.remove('fake-fs'); document.body.classList.remove('fake-fs-on'); return; }
    var rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if (rq) { try { var r = rq.call(el); if (r && r.catch) r.catch(function () { el.classList.add('fake-fs'); document.body.classList.add('fake-fs-on'); }); return; } catch (e) {} }
    el.classList.add('fake-fs'); document.body.classList.add('fake-fs-on');
  };
  var fail = function (t) { el.classList.add('is-error'); msg.textContent = t; };
  S.ytCtl = { toggle: toggle, jump: jump, fs: fs, mute: function () { if (!P) return; if (P.isMuted()) P.unMute(); else P.mute(); setTimeout(function () { mb.innerHTML = P.isMuted() ? PI.mute : PI.vol; }, 60); wake(); }, el: el };
  el.oncontextmenu = function (e) { e.preventDefault(); };
  $('.yt-shield', el).onclick = function () { toggle(); wake(); };
  $('.yt-shield', el).ondblclick = function (e) { e.preventDefault(); fs(); };
  $('.yt-big', el).onclick = function () { toggle(); };
  el.onmousemove = wake; el.ontouchstart = wake;
  $$('.yt-b', el).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var y = b.dataset.y; if (y === 'toggle') toggle(); else if (y === 'back') jump(-10); else if (y === 'fwd') jump(10); else if (y === 'mute') S.ytCtl.mute(); else if (y === 'fs') fs(); wake(); }; });
  seek.oninput = function () { drag = true; seek.style.setProperty('--p', (seek.value / 10) + '%'); time.textContent = fmtT(seek.value / 1000 * dur) + ' / ' + fmtT(dur); };
  seek.onchange = function () { drag = false; if (P && dur) { P.seekTo(seek.value / 1000 * dur, true); ended = false; } wake(); };
  var rateSel = $('.yt-rate', el), qSel = $('.yt-q', el);
  var setRate = function (r) {
    if (!P) return;
    P.setPlaybackRate(r);
    setTimeout(function () { var got = P.getPlaybackRate ? P.getPlaybackRate() : r; if (Math.abs(got - r) > 0.01) { rateSel.value = String(got); toast('YouTube เล่นได้เร็วสุด ' + got + 'x สำหรับคลิปนี้'); } }, 400);
  };
  rateSel.onchange = function () { setRate(Number(this.value)); store('ib_rate', this.value); wake(); };
  var savedRate = Number(store('ib_rate')) || 1; rateSel.value = String(savedRate);
  // ความชัด: อัตโนมัติ = iframe เท่ากรอบ ไม่ย่อ · เลือกเอง = วาดให้ได้พิกเซลจริงเท่าความชัดนั้น (หาร devicePixelRatio) แล้วย่อลง
  // มือถือ/แท็บเล็ต: พิกเซลจริงของภาพไม่เกิน 1920×1080 · ค่าเดิม ib_q (เคยตั้ง "ชัดสุด") เลิกใช้
  store('ib_q', null);
  var qH = Number(store(YTQ_KEY)) || 0; if (!QS.some(function (q) { return q[0] === qH; })) qH = 0; qSel.value = String(qH);
  var qOf = function () { return (YTQ.filter(function (q) { return q[0] === qH; })[0] || YTQ[0])[2]; };
  var crop = $('.yt-crop', el);
  var fit = function () {
    var ifr = $('iframe', crop); if (!ifr) return;
    var W = crop.clientWidth, H = crop.clientHeight; if (!W || !H) return;
    var vw = Math.min(W, H * 16 / 9), vh = vw * 9 / 16, dpr = window.devicePixelRatio || 1, sc = 1;
    if (qH) sc = Math.min(1, vh * dpr / qH);
    if (hand) sc = Math.min(1, Math.max(sc, vh * dpr / 1080, vw * dpr / 1920));
    var st = ifr.style;
    st.setProperty('width', (vw / sc) + 'px', 'important'); st.setProperty('height', (vh / sc + 140) + 'px', 'important');
    st.setProperty('left', ((W - vw) / 2) + 'px', 'important'); st.setProperty('top', ((H - vh) / 2 - 70 * sc) + 'px', 'important');
    st.setProperty('transform', sc < 1 ? 'scale(' + sc + ')' : 'none', 'important'); st.setProperty('transform-origin', '0 0', 'important');
  };
  qSel.onchange = function () { qH = Number(this.value); store(YTQ_KEY, qH ? this.value : null); fit(); if (qH && P && P.setPlaybackQuality) try { P.setPlaybackQuality(qOf()); } catch (e) {} wake(); };
  var ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
  if (ro) ro.observe(crop); else window.addEventListener('resize', fit);
  S.ytOff = function () { if (ro) ro.disconnect(); else window.removeEventListener('resize', fit); clearTimeout(hideT); };
  loadYT().then(function () {
    if (gen !== S.ytGen || !document.body.contains(el)) return;
    P = new YT.Player('yt-host', {
      videoId: vid, host: 'https://www.youtube-nocookie.com',
      playerVars: (function () { var v = { controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, cc_load_policy: 0 }; if (qH) v.vq = qOf(); if (/^https?:/.test(location.origin)) v.origin = location.origin; return v; })(),
      events: {
        onReady: function () {
          if (gen !== S.ytGen) { try { P.destroy(); } catch (e) {} return; }
          S.yt = P; S.ytPend = null; dur = P.getDuration() || 0; fit(); if (savedRate !== 1) setRate(savedRate);
          var ifr = P.getIframe && P.getIframe(); if (ifr) { ifr.setAttribute('tabindex', '-1'); ifr.setAttribute('title', 'คลิปเรียน'); }
          var sv = posKey ? Number(store(posKey)) : 0;
          if (sv > 10 && (!dur || sv < dur - 20)) { P.cueVideoById({ videoId: vid, startSeconds: sv }); msg.textContent = 'ดูค้างไว้ที่ ' + fmtT(sv) + ' · กดเล่นเพื่อดูต่อ'; }
          tick(); S.ytT = setInterval(tick, 250);
        },
        onStateChange: function (e) {
          var s = e.data;
          if (s === 1) { ended = false; msg.textContent = ''; setState('is-playing'); wake(); }
          else if (s === 2) setState('is-paused');
          else if (s === 3) setState('is-buffering');
          else if (s === 0) { ended = true; setState('is-ended'); if (posKey) store(posKey, null); if (opt.onEnd) opt.onEnd(msg); }
          tick();
        },
        onError: function (e) { fail(e.data === 101 || e.data === 150 ? 'คลิปนี้ไม่ได้เปิดให้ฝังในเว็บ แจ้งแอดมินให้เปิด "อนุญาตการฝัง" ใน YouTube Studio' : 'เล่นคลิปนี้ไม่ได้ ลองรีเฟรชหน้า หรือแจ้งแอดมินทาง IG'); }
      }
    });
    S.ytPend = P;
  }).catch(function () { fail('โหลดเครื่องเล่นวิดีโอไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้า'); });
}
document.addEventListener('keydown', function (e) {
  var c = S.ytCtl; if (!c || !document.body.contains(c.el)) return;
  var tg = e.target; if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) && !tg.classList.contains('yt-seek') || tg.isContentEditable)) return;
  if ($('#modal').innerHTML) return;
  var k = e.key;
  if (k === ' ' || k === 'k') { e.preventDefault(); c.toggle(); }
  else if (k === 'ArrowLeft' || k === 'j') { e.preventDefault(); c.jump(k === 'j' ? -10 : -5); }
  else if (k === 'ArrowRight' || k === 'l') { e.preventDefault(); c.jump(k === 'l' ? 10 : 5); }
  else if (k === 'f') c.fs();
  else if (k === 'm') c.mute();
  else if (k === 'Escape' && c.el.classList.contains('fake-fs')) c.fs();
});

/* ─── เซลล์แบ่งตัว (เรียนต่อเนื่อง) ─── */
var CELL_BODY = 'M2-50C28-49 52-32 53-3S34 48 3 50-50 34-52 4-28-51 2-50Z';
var CELL_DEFS = '<svg class="cl-defs" aria-hidden="true" focusable="false"><defs>' +
  '<radialGradient id="cl-m" cx="48%" cy="46%" r="54%"><stop offset="0" style="stop-color:var(--cell1);stop-opacity:.16"/><stop offset=".72" style="stop-color:var(--cell1);stop-opacity:.42"/><stop offset=".93" style="stop-color:var(--cell2);stop-opacity:.78"/><stop offset="1" style="stop-color:var(--cell2);stop-opacity:.95"/></radialGradient>' +
  '<radialGradient id="cl-n" cx="38%" cy="34%" r="70%"><stop offset="0" style="stop-color:var(--cell1);stop-opacity:.9"/><stop offset=".55" style="stop-color:var(--cnuc);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--cnuc);stop-opacity:.85"/></radialGradient>' +
  '<symbol id="cl-cell" viewBox="-60 -56 120 112">' +
  '<path d="' + CELL_BODY + '" fill="url(#cl-m)"/><path d="' + CELL_BODY + '" style="fill:none;stroke:var(--cell2)" stroke-width="1.6"/><path d="' + CELL_BODY + '" transform="scale(.94)" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>' +
  '<g style="fill:none;stroke:var(--cell2)" stroke-width="1.4" stroke-linecap="round" opacity=".45"><path d="M-18-24c-8 6-11 16-8 26"/><path d="M-24-16c-6 8-7 18-3 26"/><path d="M28 14c-2 9-9 16-18 19"/><path d="M33 8c0 11-7 21-17 26"/></g>' +
  '<g style="fill:var(--cell2)" opacity=".55"><ellipse cx="-26" cy="22" rx="8" ry="3.8" transform="rotate(-24 -26 22)"/><ellipse cx="30" cy="-24" rx="7" ry="3.4" transform="rotate(32 30 -24)"/></g>' +
  '<g style="fill:none;stroke:var(--cnuc)" stroke-width=".9" opacity=".7"><path d="M-32 21.5l3 1.5 3-2 3 2 3-1.5" transform="rotate(-24 -26 22)"/><path d="M24.5-24.5l2.5 1.5 3-2 3 2 2.5-1.5" transform="rotate(32 30 -24)"/></g>' +
  '<g style="fill:var(--cnuc)" opacity=".28"><circle cx="-34" cy="-6" r="1.6"/><circle cx="-10" cy="34" r="1.4"/><circle cx="20" cy="30" r="1.8"/><circle cx="36" cy="-4" r="1.3"/><circle cx="-6" cy="-38" r="1.5"/><circle cx="14" cy="-36" r="1.2"/><circle cx="-38" cy="10" r="1.1"/></g>' +
  '<circle cx="4" cy="-2" r="18" fill="url(#cl-n)"/><circle cx="4" cy="-2" r="18" style="fill:none;stroke:var(--cnuc)" stroke-width="1" opacity=".55"/>' +
  '<g fill="#fff" opacity=".35"><circle cx="-2" cy="-8" r="1.3"/><circle cx="10" cy="4" r="1.1"/><circle cx="-4" cy="6" r="1"/></g><circle cx="9" cy="-7" r="5" style="fill:var(--cnuc)" opacity=".85"/>' +
  '<path d="M-30-30c8-9 20-13 30-12" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/></symbol>' +
  '<symbol id="cl-glow" viewBox="-60 -56 120 112"><path d="' + CELL_BODY + '" transform="scale(1.08)" style="fill:none;stroke:var(--cell2)" stroke-width="3" opacity=".35"/></symbol>' +
  '<symbol id="cl-spark" viewBox="-60 -56 120 112"><g style="fill:var(--cnuc)"><circle cx="0" cy="-58" r="2.4"/><circle cx="55" cy="-8" r="1.8"/><circle cx="-50" cy="30" r="2"/><circle cx="30" cy="50" r="1.6"/></g></symbol>' +
  '<symbol id="cl-halo" viewBox="-60 -56 120 112"><ellipse cx="0" cy="0" rx="62" ry="58" fill="none" stroke="#d4a52a" stroke-width="2" stroke-dasharray="3 7" opacity=".85"/></symbol></defs></svg>';
var CELL_THEMES = [
  { k: 'base', d: 0, name: 'INeedBio', desc: 'ธีมเริ่มต้น ขาว-เขียวของ INeedBio', m: ['#ffffff', '#0f1411', '#16875a', '#f4f6f3', 'linear-gradient(135deg,#bfe8d0,#e5eefc)'] },
  { k: 'petri', d: 15, name: 'จานเพาะเชื้อ', desc: 'วุ้นสีอำพัน จุดโคโลนีกระจายทั่วพื้นหลัง', m: ['#fbf7ec', '#2a2413', '#b7791f', '#fffdf5', 'radial-gradient(circle at 25% 40%,#e7c97e 0 9px,transparent 10px),radial-gradient(circle at 70% 60%,#9fd3c1 0 6px,transparent 7px),radial-gradient(circle at 55% 25%,#d9b35e 0 4px,transparent 5px),#f5ead0'] },
  { k: 'scope', d: 30, name: 'ย้อมสี H&E', desc: 'มองใต้กล้อง ม่วงฮีมาทอกซิลิน ชมพูอีโอซิน มีเส้นสเกล', m: ['#0e0b14', '#f3ecf7', '#e86fa8', '#17121f', 'radial-gradient(circle at 35% 45%,#8e6cff88 0 10px,transparent 11px),radial-gradient(circle at 65% 55%,#e86fa888 0 14px,transparent 15px),linear-gradient(#e86fa81a 1px,transparent 1px) 0 0/12px 12px,#16101f'] },
  { k: 'reef', d: 60, name: 'แนวปะการัง', desc: 'ฟ้าน้ำตื้น ปะการังส้ม ลายคลื่นบนพื้น', m: ['#f2fafa', '#0a2e36', '#e8553b', '#ffffff', 'linear-gradient(170deg,#9fe0de,#2f9aa6 55%,#ff9b84)'] },
  { k: 'forest', d: 100, name: 'ป่าดิบชื้น', desc: 'เขียวมอส เส้นใบไม้ แสงแดดสีทอง', m: ['#0f1a14', '#eef3e6', '#d9a441', '#15241b', 'linear-gradient(135deg,#2e6b3c,#16351f 55%,#d9a44155)'] },
  { k: 'nebula', d: 200, name: 'เนบิวลา', desc: 'อวกาศลึก ดาว แสงม่วงชมพู ปุ่มไล่สี', m: ['#0b0a1a', '#f1eeff', '#9d8cff', '#141230', 'radial-gradient(circle at 20% 30%,#fff 0 1px,transparent 2px),radial-gradient(circle at 70% 70%,#fff 0 1px,transparent 2px),linear-gradient(135deg,#4b2fa8,#c2378f)'] },
  { k: 'gold', d: 365, name: 'เกลียวทองคำ', desc: 'งาช้าง หมึกดำ ทองคำ ลายเกลียว DNA', m: ['#fcfaf4', '#16130b', '#a87b14', '#ffffff', 'repeating-linear-gradient(60deg,#e9cf7e 0 5px,#fbf3dc 5px 13px)'] }];
var CELL_POS = { 1: [[200, 198, 150, 0]], 2: [[152, 204, 124, -8], [252, 190, 124, 14]],
  4: [[148, 150, 104, 10], [256, 142, 98, -12], [146, 256, 98, 24], [254, 250, 106, -4]],
  8: [[196, 94, 86, 0], [118, 138, 80, 30], [282, 132, 84, -20], [98, 226, 84, 12], [306, 222, 80, 40], [142, 304, 82, -14], [258, 306, 86, 8], [202, 200, 90, -30]] };
var CELL_REASON = { study: 'เรียนครบ 15 นาที', redeem: 'แลกโค้ดส่วนลด', review: 'รีวิวคอร์ส', grades: 'ส่งผลการเรียน', 'demo-start': 'เซลล์ตั้งต้น (เดโม)' };
/* ─── ตัวละครช่วงเทศกาล (แทนเซลล์) ─── */
var FEST_DEFS = '<svg class="cl-defs" aria-hidden="true" focusable="false"><defs>' +
  '<radialGradient id="fs-pk" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffb35c"/><stop offset=".6" stop-color="#f07a1f"/><stop offset="1" stop-color="#b8480a"/></radialGradient>' +
  '<radialGradient id="fs-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffb52e"/></radialGradient>' +
  '<linearGradient id="fs-ck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d98b47"/><stop offset="1" stop-color="#a95e24"/></linearGradient>' +
  '<linearGradient id="fs-gf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2344c"/><stop offset="1" stop-color="#a50f28"/></linearGradient>' +
  // ฟักทองแกะสลัก
  '<symbol id="fs-pumpkin" viewBox="-60 -56 120 112"><path d="M2-38c2-8 8-13 14-14" fill="none" stroke="#5b4a1c" stroke-width="6" stroke-linecap="round"/><path d="M8-44c10-6 20-2 22 6-10 2-18 0-22-6z" fill="#4f8a36"/>' +
  '<ellipse cx="-24" cy="6" rx="24" ry="36" fill="url(#fs-pk)"/><ellipse cx="24" cy="6" rx="24" ry="36" fill="url(#fs-pk)"/><ellipse cx="0" cy="6" rx="26" ry="39" fill="url(#fs-pk)"/>' +
  '<g fill="none" stroke="#a8420a" stroke-width="1.6" opacity=".55"><path d="M-12-30c-6 12-6 60 0 72"/><path d="M12-30c6 12 6 60 0 72"/></g>' +
  '<g fill="url(#fs-glow)" class="fs-lit"><path d="M-22-6l10-2-4 12z"/><path d="M22-6l-10-2 4 12z"/><path d="M-4 4h8l-4 7z"/><path d="M-24 18l6 5 6-5 6 5 6-5 6 5 6-5 6 5c-4 11-18 16-24 16s-20-5-24-16z"/></g></symbol>' +
  // ลูกอมห่อกระดาษ
  '<symbol id="fs-candy" viewBox="-60 -56 120 112"><path d="M-26 0l-26-20 6 20-6 20z" fill="#8a4fd6"/><path d="M26 0l26-20-6 20 6 20z" fill="#8a4fd6"/><g stroke="#5b2ba0" stroke-width="1.5" opacity=".6"><path d="M-44-12l14 8M-44 12l14-8M44-12l-14 8M44 12l-14-8"/></g>' +
  '<circle r="28" fill="#ff8a1f"/><g fill="#fff" opacity=".85"><path d="M-20-19c10 10 10 28 0 38l6 4c12-12 12-34 0-46z"/><path d="M0-28c10 12 10 44 0 56l7 0c10-14 10-42 0-56z"/></g><circle r="28" fill="none" stroke="#c9560c" stroke-width="2"/><path d="M-16-18c6-6 16-8 24-4" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/></symbol>' +
  // คุกกี้ขิงรูปคน
  '<symbol id="fs-cookie" viewBox="-60 -56 120 112"><path d="M0-52a16 16 0 0 1 12 27c10 1 22 2 28 6 5 4 1 12-5 11l-17-3 4 18 14 22c3 6-4 11-9 7L0 16l-27 20c-5 4-12-1-9-7l14-22 4-18-17 3c-6 1-10-7-5-11 6-4 18-5 28-6A16 16 0 0 1 0-52z" fill="url(#fs-ck)" stroke="#8a4a1a" stroke-width="1.5"/>' +
  '<g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M-30-17l3 3 3-3 3 3"/><path d="M21-17l3 3 3-3 3 3"/><path d="M-26 28l3 3 3-3 3 3"/><path d="M14 28l3 3 3-3 3 3"/><path d="M-5-30q5 4 10 0"/></g>' +
  '<circle cx="-5" cy="-38" r="2.4" fill="#3a1d08"/><circle cx="5" cy="-38" r="2.4" fill="#3a1d08"/><circle cx="0" cy="-8" r="3.4" fill="#c8102e"/><circle cx="0" cy="3" r="3.4" fill="#1f8a4c"/></symbol>' +
  // ลูกกวาดรูปตัว J
  '<symbol id="fs-cane" viewBox="-60 -56 120 112"><path d="M8 50V-18a18 18 0 0 0-36 0v6" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/>' +
  '<path d="M8 50V-18a18 18 0 0 0-36 0v6" fill="none" stroke="#c8102e" stroke-width="13" stroke-linecap="round" stroke-dasharray="7 9"/><path d="M8 50V-18a18 18 0 0 0-36 0v6" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="13" transform="translate(2 1)" style="mix-blend-mode:multiply"/>' +
  '<path d="M4 44V-18a14 14 0 0 0-10-13" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/></symbol>' +
  // กล่องของขวัญ
  '<symbol id="fs-gift" viewBox="-60 -56 120 112"><rect x="-34" y="-10" width="68" height="58" rx="5" fill="url(#fs-gf)"/><rect x="-40" y="-24" width="80" height="18" rx="4" fill="#c8102e"/><rect x="-6" y="-24" width="12" height="72" fill="#f2c14e"/><rect x="-40" y="-18" width="80" height="6" fill="#f2c14e" opacity=".0"/>' +
  '<path d="M0-24c-6-18-26-22-26-10 0 8 14 10 26 10zM0-24c6-18 26-22 26-10 0 8-14 10-26 10z" fill="#f2c14e" stroke="#c9961f" stroke-width="1.5"/><rect x="-34" y="-6" width="68" height="4" fill="#000" opacity=".12"/></symbol>' +
  '</defs></svg>';
var FEST_KINDS = { halloween: [['fs-pumpkin', 'roll'], ['fs-candy', 'twirl']], christmas: [['fs-cookie', 'walk'], ['fs-cane', 'swing'], ['fs-gift', 'bounce']] };
function festKind(i) { var f = festOn(), ks = f && FEST_KINDS[f]; return ks ? ks[i % ks.length] : null; }
/** สวิตช์ฟีเจอร์ใหม่ต่อเว็บ: window.INEEDBIO_FEATURES = { cells, reviews, fest } ไม่ตั้ง = เปิดทั้งหมด (เดโม) */
function feat(k) { var f = window.INEEDBIO_FEATURES; return !f || f[k] !== false; }
function cellsPromoOn() { return feat('cells') && S.cfg.cells_enabled === '1'; }
function cellsOn() { return feat('cells') && !!S.user && S.cfg.cells_enabled === '1'; }
function cellN(streak) { return streak >= 15 ? 8 : streak >= 7 ? 4 : streak >= 3 ? 2 : 1; }
function colonySvg(streak, best, prevN) {
  var sleep = streak === 0, n = cellN(streak), h = '';
  var fx = sleep ? [] : [].concat(best >= 30 ? ['cl-glow'] : [], best >= 100 ? ['cl-spark'] : [], best >= 365 ? ['cl-halo'] : []);
  CELL_POS[n].forEach(function (p, i) {
    var isNew = prevN && n > prevN && i >= prevN, sz = p[2], x = p[0] - sz / 2, y = p[1] - sz / 2;
    var fk = festKind(i);
    h += '<g class="cl-cell' + (fk ? ' fs' : '') + (isNew ? ' new' : '') + (sleep ? ' rest' : '') + '" style="animation-delay:' + (isNew ? (i - prevN) * 0.08 : i * 0.35) + 's"><g class="cl-mv" data-cx="' + p[0] + '" data-cy="' + p[1] + '" data-m="' + (fk ? fk[1] : 'cell') + '" data-sz="' + sz + '"><g transform="rotate(' + (fk ? 0 : p[3]) + ' ' + p[0] + ' ' + p[1] + ')">' +
      (fk ? [] : fx).map(function (f) { return '<use href="#' + f + '" x="' + x + '" y="' + y + '" width="' + sz + '" height="' + sz + '"/>'; }).join('') +
      '<use href="#' + (festKind(i) ? festKind(i)[0] : 'cl-cell') + '" x="' + x + '" y="' + y + '" width="' + sz + '" height="' + sz + '"/></g></g></g>';
  });
  return '<svg class="colony" viewBox="0 0 400 400" role="img" aria-label="' + (sleep ? 'เซลล์กำลังพักตัว' : n + ' เซลล์') + '">' + h + '</svg>';
}
function cellChip() {
  if (!cellsOn()) return '';
  var c = S.cells, st = c ? c.streak : 0;
  return '<a class="cchip' + (c && c.today_done ? '' : ' todo') + '" id="cell-chip" href="#/cells" title="' + (c ? (c.today_done ? 'วันนี้เรียนครบแล้ว' : 'วันนี้เรียนแล้ว ' + c.today_min + '/' + c.need + ' นาที') : 'เซลล์แบ่งตัว') + '" aria-label="เซลล์แบ่งตัว เรียนติดกัน ' + st + ' วัน">' +
    '<svg viewBox="-60 -56 120 112" aria-hidden="true"><use href="#' + (festKind(0) ? festKind(0)[0] : 'cl-cell') + '" x="-60" y="-56" width="120" height="112"/></svg><b>' + st + '</b></a>';
}
/* ─── ลูกเล่นของธีม + ธีมเทศกาล ─── */
var FESTS = { halloween: { name: 'ฮาโลวีน', bar: 'Hello-ween · เดือนแห่งการเรียนแบบไม่หลอก', from: '10-01', to: '10-31' }, christmas: { name: 'คริสต์มาส', bar: 'Merry Christmas · เรียนต่อเนื่องจนจบปี', from: '12-01', to: '12-31' } };
function festActive() {
  if (!feat('fest')) return '';
  if (S.festPreview !== undefined) return S.festPreview;
  var m = S.cfg.event_mode || 'off';
  if (m === 'off') return '';
  if (FESTS[m]) return m;
  if (m !== 'auto') return '';
  var md = new Date(Date.now() + 7 * 36e5).toISOString().slice(5, 10);
  return Object.keys(FESTS).filter(function (k) { return md >= FESTS[k].from && md <= FESTS[k].to; })[0] || '';
}
function festOn() { var f = festActive(); return f && store('ib_fest_off') !== f ? f : ''; }
function fxRand(a, b) { return a + Math.random() * (b - a); }
function fxBuild(key) {
  var h = '', i, n, st = function (o) { return Object.keys(o).map(function (k) { return k + ':' + o[k]; }).join(';'); };
  var BAT = '<svg viewBox="0 0 34 16" width="48" height="23"><path d="M17 5c1-3 2-3 2-3l1 3c3-3 8-4 14-2-4 1-6 4-6 7-2-2-5-2-7 0-1-1-2-2-4-2s-3 1-4 2c-2-2-5-2-7 0 0-3-2-6-6-7 6-2 11-1 14 2z" fill="#6b4a8e"/></svg>';
  if (key === 'christmas') for (i = 0; i < 26; i++) h += '<i class="fx-snow" style="' + st({ left: fxRand(0, 100).toFixed(1) + '%', '--s': fxRand(3, 7).toFixed(1) + 'px', '--t': fxRand(9, 18).toFixed(1) + 's', '--dl': (-fxRand(0, 18)).toFixed(1) + 's', '--dx': fxRand(-40, 40).toFixed(0) + 'px', opacity: fxRand(.5, .95).toFixed(2) }) + '"></i>';
  if (key === 'halloween') { for (i = 0; i < 4; i++) h += '<i class="fx-bat" style="' + st({ top: fxRand(8, 45).toFixed(0) + '%', left: 0, '--t': fxRand(20, 34).toFixed(0) + 's', '--dl': (-fxRand(0, 30)).toFixed(0) + 's' }) + '">' + BAT + '</i>'; h += '<i class="fx-fog"></i>'; }
  if (key === 'reef') for (i = 0; i < 12; i++) h += '<i class="fx-bub" style="' + st({ left: fxRand(0, 100).toFixed(1) + '%', '--s': fxRand(6, 16).toFixed(0) + 'px', '--t': fxRand(12, 22).toFixed(1) + 's', '--dl': (-fxRand(0, 22)).toFixed(1) + 's', '--dx': fxRand(-30, 30).toFixed(0) + 'px' }) + '"></i>';
  if (key === 'forest') for (i = 0; i < 14; i++) h += '<i class="fx-fly" style="' + st({ left: fxRand(2, 98).toFixed(1) + '%', top: fxRand(10, 95).toFixed(1) + '%', '--t': fxRand(12, 22).toFixed(1) + 's', '--t2': fxRand(2, 4.5).toFixed(1) + 's', '--dl': (-fxRand(0, 20)).toFixed(1) + 's', '--a': fxRand(-60, 60).toFixed(0) + 'px', '--b': fxRand(-50, 50).toFixed(0) + 'px', '--c': fxRand(-60, 60).toFixed(0) + 'px', '--d': fxRand(-50, 50).toFixed(0) + 'px' }) + '"></i>';
  if (key === 'nebula') { for (i = 0; i < 28; i++) h += '<i class="fx-star" style="' + st({ left: fxRand(0, 100).toFixed(1) + '%', top: fxRand(0, 100).toFixed(1) + '%', '--t': fxRand(2.5, 6).toFixed(1) + 's', '--dl': (-fxRand(0, 6)).toFixed(1) + 's' }) + '"></i>'; h += '<i class="fx-shoot" style="top:12%;left:92%;--dl:1s"></i><i class="fx-shoot" style="top:30%;left:70%;--dl:6.5s"></i>'; }
  if (key === 'gold') for (i = 0; i < 12; i++) h += '<i class="fx-spark" style="' + st({ left: fxRand(0, 100).toFixed(1) + '%', top: fxRand(0, 100).toFixed(1) + '%', '--t': fxRand(2.4, 5).toFixed(1) + 's', '--dl': (-fxRand(0, 5)).toFixed(1) + 's' }) + '"></i>';
  return h;
}
function applyFx(key) {
  if (S.fxKey === key) return; S.fxKey = key;
  var el = $('#ct-fx'); if (!el) { el = document.createElement('div'); el.id = 'ct-fx'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
  el.innerHTML = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : fxBuild(key);
}
/** จานเพาะเชื้อ: แตะพื้นที่ว่างแล้วมีโคโลนีงอกขึ้นมา */
document.addEventListener('pointerdown', function (e) {
  if (!document.documentElement.classList.contains('ct-petri') || document.documentElement.classList.contains('fe-halloween') || document.documentElement.classList.contains('fe-christmas')) return;
  if (e.target.closest('a,button,input,select,textarea,label,.tile,.dish')) return;
  var c = document.createElement('i'); c.className = 'fx-col'; var s = Math.round(fxRand(18, 40));
  c.style.cssText = 'left:' + (e.clientX - s / 2) + 'px;top:' + (e.clientY - s / 2) + 'px;--s:' + s + 'px';
  document.body.appendChild(c); setTimeout(function () { c.remove(); }, 1700);
});
/** เซลล์ในจานเดินไปมาช้า ๆ รอบตำแหน่งของตัวเอง แตะแล้วเด้ง */
function startColonyMotion() {
  var svg = $('#dish .colony'); if (!svg) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cells = $$('.cl-mv', svg).map(function (m) { return { x: 0, y: 0, vx: fxRand(-.3, .3), vy: fxRand(-.3, .3), r: 0, vr: fxRand(-.15, .15), m: m.dataset.m, t: fxRand(0, 6), dir: Math.random() < .5 ? -1 : 1, sp: fxRand(.8, 1.2) }; });
  var mv = $$('.cl-mv', svg), R = mv.length > 4 ? 14 : mv.length > 2 ? 22 : 28;
  $$('.cl-cell', svg).forEach(function (g) { g.addEventListener('click', function () { g.classList.remove('poke'); void g.getBoundingClientRect(); g.classList.add('poke'); }); });
  var step = function () {
    if (!document.body.contains(svg)) return;
    cells.forEach(function (c, i) {
      var m = mv[i], cx = +m.dataset.cx, cy = +m.dataset.cy, sz = +m.dataset.sz, k = sz / 120, sx = 1, sy = 1;
      if (c.m !== 'cell') {
        c.t += 0.008 * c.sp;
        if (c.m === 'walk') { c.x += c.dir * 0.2 * c.sp; if (Math.abs(c.x) > R * 1.3) c.dir *= -1; c.y = -Math.abs(Math.sin(c.t * 7)) * 5 * k; c.r = Math.sin(c.t * 7) * 6; sx = c.dir; }
        else if (c.m === 'swing') { c.r = Math.sin(c.t * 2.2) * 14; c.x = Math.sin(c.t * 0.6) * R * 0.6; c.y = Math.cos(c.t * 1.1) * 3; }
        else if (c.m === 'bounce') { var ph = (c.t * 1.6) % 1, up = Math.sin(ph * Math.PI); c.y = -up * 16 * k; sy = ph < 0.08 || ph > 0.92 ? 0.86 : 1; sx = sy < 1 ? 1.1 : 1; c.x = Math.sin(c.t * 0.4) * R * 0.5; c.r = Math.sin(c.t * 1.6) * 4; }
        else if (c.m === 'roll') { c.x += c.dir * 0.16 * c.sp; if (Math.abs(c.x) > R * 1.2) c.dir *= -1; c.r = c.x * 360 / (Math.PI * sz) * 0.9; c.y = -Math.abs(Math.sin(c.t * 3)) * 2; }
        else if (c.m === 'twirl') { c.r += 0.9 * c.sp; c.y = Math.sin(c.t * 1.8) * 9 * k; c.x = Math.cos(c.t * 0.7) * R * 0.5; }
        m.setAttribute('transform', 'translate(' + c.x.toFixed(2) + ' ' + c.y.toFixed(2) + ') rotate(' + c.r.toFixed(2) + ' ' + cx + ' ' + cy + ') translate(' + cx + ' ' + cy + ') scale(' + sx + ' ' + sy + ') translate(' + (-cx) + ' ' + (-cy) + ')');
        return;
      }
      c.vx += fxRand(-.05, .05) - c.x * .0008; c.vy += fxRand(-.05, .05) - c.y * .0008; c.vr += fxRand(-.02, .02) - c.r * .002;
      var sp = Math.hypot(c.vx, c.vy); if (sp > .4) { c.vx *= .4 / sp; c.vy *= .4 / sp; }
      c.vx *= .99; c.vy *= .99; c.vr *= .98; c.x += c.vx; c.y += c.vy; c.r += c.vr;
      var d = Math.hypot(c.x, c.y); if (d > R) { c.x *= R / d; c.y *= R / d; c.vx *= -.5; c.vy *= -.5; }
      mv[i].setAttribute('transform', 'translate(' + c.x.toFixed(2) + ' ' + c.y.toFixed(2) + ') rotate(' + c.r.toFixed(2) + ' ' + mv[i].dataset.cx + ' ' + mv[i].dataset.cy + ')');
    });
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function applyCellTheme() {
  var h = document.documentElement, th = cellsOn() && S.cells ? S.cells.theme : 'base', fe = festOn();
  CELL_THEMES.forEach(function (t) { if (t.k !== 'base') h.classList.toggle('ct-' + t.k, t.k === th); });
  Object.keys(FESTS).forEach(function (k) { h.classList.toggle('fe-' + k, k === fe); });
  h.classList.toggle('v2ui', UI2());
  applyFx(fe || th);
}
function loadCells(then) {
  if (!cellsOn() || S.cellsBusy) return;
  S.cellsBusy = true;
  api('cells.status').then(function (c) {
    S.cellsBusy = false; S.cells = c; applyCellTheme();
    var ch = $('#cell-chip'); if (ch) ch.outerHTML = cellChip();
    if (then) then(c);
  }).catch(function () { S.cellsBusy = false; });
}
/** นับเวลาดูคลิปจริง: ทุก 5 วินาทีที่คลิปกำลังเล่นและหน้าจอเปิดอยู่ สะสมครบ 60 วินาทีส่ง study.ping 1 ครั้ง */
function startStudyPing(lid) {
  if (!cellsOn()) return;
  clearInterval(S.studyT); var acc = 0;
  S.studyT = setInterval(function () {
    var pl = $('#player');
    if (!pl || !pl.classList.contains('is-playing') || document.visibilityState !== 'visible') return;
    acc += 5; if (acc < 60) return; acc = 0;
    api('study.ping', { lesson_id: lid, pos: S.yt && S.yt.getCurrentTime ? Math.floor(S.yt.getCurrentTime() || 0) : 0 }).then(function (r) {
      if (!r || r.ignored || r.off) return;
      if (S.cells) { S.cells.today_min = r.today_min; var ch = $('#cell-chip'); if (ch) ch.outerHTML = cellChip(); }
      if (r.credited) { toast(r.credited.gained.length > 1 ? 'เรียนครบวันนี้แล้ว +' + r.credited.gained.reduce(function (a, g) { return a + g.delta; }, 0) + ' เซลล์ (มีโบนัส)' : 'เรียนครบวันนี้แล้ว +1 เซลล์ ติดกัน ' + r.credited.streak + ' วัน'); S.cells = null; loadCells(); }
    }).catch(function () {});
  }, 5000);
}
function viewCells() {
  if (!cellsOn()) return go('/my');
  loading('cells', 'list');
  Promise.all([api('cells.status'), api('my.courses').catch(function () { return []; }), api('my.submissions').catch(function () { return { reviews: [], grades: [], cells: { review: 5, grades: 5, proof: 5 } }; })]).then(function (res) {
    var c = res[0], mineC = res[1], sub = res[2];
    var prevN = S.cellsPrevN || 0; S.cells = c; applyCellTheme();
    var n = cellN(c.streak), pct = Math.min(100, Math.round(c.today_min / c.need * 100)), toCost = Math.min(c.points, c.cost);
    var nextMs = [3, 7, 15, 30, 60, 100, 200, 365].filter(function (d) { return d > c.streak; })[0];
    var capTxt = c.streak === 0 ? 'เซลล์กำลังพักตัว · เรียนวันนี้ 15 นาทีเพื่อเริ่มแบ่งตัว' : n + ' เซลล์ · เรียนติดกัน ' + c.streak + ' วัน' + (nextMs ? ' · อีก ' + (nextMs - c.streak) + ' วันถึง ' + nextMs : '');
    var cal = '', dayMap = {}; c.days.forEach(function (x) { dayMap[x.day] = x; });
    for (var i = 27; i >= 0; i--) {
      var dt = new Date(Date.parse(c.today + 'T00:00:00Z') - i * 864e5), key = dt.toISOString().slice(0, 10), x = dayMap[key];
      cal += '<span class="' + (x && x.credited ? 'on' : x ? 'half' : '') + (i === 0 ? ' today' : '') + '" title="' + key + (x ? ' · ' + x.minutes + ' นาที' : '') + '">' + dt.getUTCDate() + '</span>';
    }
    var road = [[1, '1 เซลล์', 'ตื่นมาเรียนวันแรก'], [3, '2 เซลล์', 'แบ่งตัวครั้งแรก'], [7, '4 เซลล์', 'โบนัส +5 · บัตรพักตัว'], [15, '8 เซลล์', 'ธีมจานเพาะเชื้อ'], [30, 'เยื่อหุ้มเรืองแสง', 'ธีมย้อมสี H&E'], [100, 'ประกายรอบเซลล์', 'ธีมป่าดิบชื้น'], [365, 'วงแหวนทอง', 'ธีมเกลียวทองคำ']];
    page('cells', '<div class="page-h"><span class="mono">สวัสดี ' + esc(S.user.nickname) + '</span><h1>เซลล์แบ่งตัว</h1><p class="ink2" style="max-width:62ch">ดูคลิปเรียนจริงวันละ 15 นาที เซลล์ของน้องจะแบ่งตัวตามจำนวนวันที่เรียนติดกัน ได้วันละ 1 เซลล์ สะสมครบ ' + c.cost + ' เซลล์แลกโค้ดลด ' + baht(c.value) + '</p></div>' +
      '<div class="cl-lab"><div class="dish" id="dish">' + colonySvg(c.streak, c.best, prevN) + '<div class="cap">' + esc(capTxt) + '</div></div>' +
      '<div class="cl-panel"><div class="cl-stats"><div><b>' + c.streak + '</b><span>วันติดกันตอนนี้</span></div><div><b>' + c.best + '</b><span>สถิติสูงสุด</span></div><div><b>' + c.points + '</b><span>เซลล์สะสม</span></div><div><b>' + c.freezes + '</b><span>บัตรพักตัว</span></div></div>' +
      '<div class="cl-box"><div class="spread"><b>วันนี้</b><span class="sm ink2">' + (c.today_done ? 'เรียนครบแล้ว' : 'ดูคลิปแล้ว ' + c.today_min + ' / ' + c.need + ' นาที') + '</span></div><div class="cl-bar"><i style="width:' + pct + '%"></i></div>' +
      (c.today_done ? '<p class="sm ink2">พรุ่งนี้กลับมาเรียนต่อ เซลล์จะได้แบ่งตัวต่อ</p>' : '<a class="pill s" href="#/my" style="justify-self:start">ไปเรียนต่อ</a>') + '</div>' +
      '<div class="cl-box dash"><div class="spread"><b>แลกโค้ดลด ' + baht(c.value) + '</b><span class="sm ink2">' + toCost + ' / ' + c.cost + ' เซลล์</span></div><div class="cl-bar"><i style="width:' + Math.round(toCost / c.cost * 100) + '%"></i></div>' +
      '<div class="rowx"><button class="pill s" id="cl-redeem"' + (c.can_redeem ? '' : ' disabled') + '>แลก ' + c.cost + ' เซลล์</button><span class="sm ink2">' + (c.next_redeem_at ? 'แลกครั้งถัดไปได้ ' + thDate(c.next_redeem_at) : 'ใช้กับคอร์สใหม่ 1 ครั้ง อายุ 60 วัน') + '</span></div>' +
      (c.codes.length ? '<div class="stack" style="gap:6px">' + c.codes.map(function (x) { return '<div class="spread"><span class="mono-n"><b>' + esc(x.code) + '</b></span><span class="sm ink2">' + (x.used ? 'ใช้แล้ว' : 'ลด ' + baht(x.value) + ' · ถึง ' + thDate(x.ends_at)) + '</span>' + (x.used ? '' : '<button class="pill quiet s" data-copy="' + esc(x.code) + '">คัดลอก</button>') + '</div>'; }).join('') + '</div>' : '') + '</div>' +
      (festActive() ? '<div class="cl-box"><div class="spread"><b>ธีมเทศกาล' + esc(FESTS[festActive()].name) + '</b><button class="pill ghost s" data-fest="toggle">' + (festOn() ? 'ใช้ธีมของฉันแทน' : 'ใช้ธีมเทศกาล') + '</button></div><p class="sm ink2">ช่วงเทศกาลเว็บจะเปลี่ยนเป็นธีมพิเศษให้ทุกคน ถ้าชอบธีมที่ปลดล็อกไว้มากกว่า กดใช้ธีมของตัวเองได้</p></div>' : '') +
      (DEMO ? '<div class="cl-demo"><b>เดโม: ลองธีมเทศกาล</b><div class="rowx"><button class="pill ghost s" data-fest="halloween">ฮาโลวีน</button><button class="pill ghost s" data-fest="christmas">คริสต์มาส</button><button class="pill ghost s" data-fest="none">ไม่มีเทศกาล</button></div></div>' : '') +
      (DEMO ? '<div class="cl-demo"><b>เดโม: จำลองการเรียน</b><p class="sm ink2">ของจริงนับจากเวลาที่คลิปเล่นจริงในห้องเรียน ปุ่มนี้มีเฉพาะในเดโม</p><div class="rowx"><button class="pill s" id="cl-sim-study"' + (c.today_done ? ' disabled' : '') + '>เรียนวันนี้ 15 นาที</button><button class="pill ghost s" id="cl-sim-day">ข้ามไปวันถัดไป</button><button class="pill ghost s" id="cl-sim-skip">ขาดเรียน 2 วัน</button></div></div>' : '') +
      '</div></div>' +
      missionsHtml(mineC, sub) +
      '<section class="blk"><div class="sec-h"><div><small>28 วันล่าสุด</small><h2>ปฏิทินการเรียน</h2></div></div><div class="cl-cal">' + cal + '</div><p class="sm ink2" style="margin-top:8px">สีเข้ม = เรียนครบ 15 นาที · สีอ่อน = เรียนแต่ยังไม่ครบ</p></section>' +
      '<section class="blk"><div class="sec-h"><div><small>เส้นทาง</small><h2>เซลล์โตตามวันที่เรียนติดกัน</h2></div></div><div class="cl-road">' + road.map(function (r) { return '<div class="' + (c.best >= r[0] ? 'done' : '') + '"><span class="d">' + r[0] + ' วัน</span><b>' + r[1] + '</b><span class="sm">' + r[2] + '</span></div>'; }).join('') + '</div></section>' +
      '<section class="blk"><div class="sec-h"><div><small>ปลดล็อกตามสถิติสูงสุด เก็บไว้ถาวร</small><h2>ธีมเว็บ</h2></div></div><div class="cl-themes">' + CELL_THEMES.map(function (t) {
        var locked = c.best < t.d, on = c.theme === t.k;
        return '<div class="cl-th' + (on ? ' on' : '') + '"><div class="cl-mock" style="--m-bg:' + t.m[0] + ';--m-ink:' + t.m[1] + ';--m-acc:' + t.m[2] + ';--m-card:' + t.m[3] + ';--m-pat:' + t.m[4] + '"><div class="hd"><span>INeed<em>Bio</em></span><em>' + (t.d || '') + '</em></div><div class="tl"><i></i><b>ชีววิทยา สอวน. ค่าย 1</b><s>฿790</s></div>' + (locked ? '<div class="lk">ปลดล็อกที่ ' + t.d + ' วัน</div>' : '') + '</div>' +
          '<div class="cp"><span class="d">' + (t.d ? t.d + ' วัน' : 'เริ่มต้น') + '</span><b>' + esc(t.name) + '</b><p>' + esc(t.desc) + '</p>' + (locked ? '' : '<button class="pill ' + (on ? 'quiet' : 'ghost') + ' s" data-cth="' + t.k + '" style="justify-self:start"' + (on ? ' disabled' : '') + '>' + (on ? 'ใช้อยู่' : 'ใช้ธีมนี้') + '</button>') + '</div></div>';
      }).join('') + '</div></section>' +
      '<section class="blk"><div class="sec-h"><div><small>กติกา</small><h2>นับจากการเรียนจริงเท่านั้น</h2></div></div><div class="cl-rules">' +
      '<div><b>วันที่นับ</b><p>คลิปต้องเล่นจริงรวม 15 นาทีในวันนั้น (ตัดวันตามเวลาไทย) กดติ๊กดูจบอย่างเดียวไม่นับ</p></div>' +
      '<div><b>บัตรพักตัว</b><p>เรียนติดกันทุก 7 วันได้บัตร 1 ใบ เก็บได้ 2 ใบ ขาดเรียนระบบใช้บัตรแทน สตรีคไม่ขาด</p></div>' +
      '<div><b>ถ้าสตรีคขาด</b><p>เซลล์กลับไปพักตัวและเริ่มนับใหม่ แต่เซลล์สะสม สถิติสูงสุด และธีมที่ปลดล็อกแล้วยังอยู่ครบ</p></div>' +
      '<div><b>โค้ดส่วนลด</b><p>โค้ดส่วนตัว ใช้ได้ 1 ครั้งกับคอร์สใหม่ อายุ 60 วัน แลกได้เดือนละ 1 ครั้ง</p></div></div></section>');
    S.cellsPrevN = n; startColonyMotion();
    $$('[data-fest]').forEach(function (b) { b.onclick = function () { var v = b.dataset.fest; if (v === 'toggle') { var f = festActive(); store('ib_fest_off', store('ib_fest_off') === f ? null : f); } else S.festPreview = v === 'none' ? '' : v; applyCellTheme(); viewCells(); }; });
    var ch = $('#cell-chip'); if (ch) ch.outerHTML = cellChip();
    $$('[data-rv]').forEach(function (b) { b.onclick = function () { reviewModal(b.dataset.rv, b.dataset.rvt); }; });
    var gro = $('#gr-open'); if (gro) gro.onclick = gradesModal;
    var rd = $('#cl-redeem'); if (rd) rd.onclick = function () { busy(rd, true); api('cells.redeem').then(function (r) { toast('ได้โค้ด ' + r.code + ' ลด ' + baht(r.value)); viewCells(); }).catch(function (e) { busy(rd, false); toast(e.message, true); }); };
    $$('[data-cth]').forEach(function (b) { b.onclick = function () { busy(b, true); api('cells.theme', { theme: b.dataset.cth }).then(function () { S.cells.theme = b.dataset.cth; applyCellTheme(); viewCells(); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
    if (DEMO) {
      var sim = function (fn) { return function () { var r = fn(); if (r && r.credited && r.credited.unlocked && r.credited.unlocked.length) toast('ปลดล็อกธีมใหม่!'); viewCells(); }; };
      var s1 = $('#cl-sim-study'); if (s1) s1.onclick = sim(function () { return window.__DEMO.cellsStudy(S.token, S.user.user_id); });
      $('#cl-sim-day').onclick = sim(function () { window.__DEMO.cellsShift(1); });
      $('#cl-sim-skip').onclick = sim(function () { window.__DEMO.cellsShift(3); });
    }
  }).catch(function (e) { failed('cells', e); });
}
function stars(n) { var h = ''; for (var i = 1; i <= 5; i++) h += '<span style="color:' + (i <= n ? 'var(--acc)' : 'var(--line)') + '">★</span>'; return '<span class="stars" aria-label="' + n + ' ดาว">' + h + '</span>'; }
function missionsHtml(mine, sub) {
  var cs = mine.filter(function (x) { return x.enrollment === 'approved'; });
  var yr = new Date().getFullYear() + 543;
  return '<section class="blk"><div class="sec-h"><div><small>ภารกิจรับเซลล์เพิ่ม</small><h2>ช่วยเล่าให้เราฟังหน่อย</h2></div></div><div class="cl-rules">' +
    '<div><b>รีวิวคอร์สที่เรียน · +' + sub.cells.review + ' เซลล์ต่อคอร์ส</b><p>เล่าให้รุ่นน้องฟังว่าเรียนแล้วเป็นยังไง</p>' +
    (cs.length ? '<div class="stack" style="gap:8px;margin-top:6px">' + cs.map(function (c) {
      var done = sub.reviews.indexOf(c.course_id) >= 0;
      return '<div class="spread"><span class="sm">' + esc(c.title) + '</span>' + (done ? '<span class="sm muted">ส่งแล้ว ✓</span>' : '<button class="pill ghost s" data-rv="' + esc(c.course_id) + '" data-rvt="' + esc(c.title) + '">รีวิว</button>') + '</div>'; }).join('') + '</div>' : '<p class="sm muted">ยังไม่มีคอร์สที่เรียนอยู่</p>') + '</div>' +
    '<div><b>ส่งผลการเรียนเทอมนี้ · +' + sub.cells.grades + ' เซลล์</b><p>บอกเกรดแต่ละวิชาเทอมนี้ แนบรูปใบเกรดด้วยรับเพิ่มอีก ' + sub.cells.proof + ' เซลล์</p>' +
    (sub.grades.length ? '<p class="sm muted">ส่งแล้ว: ' + sub.grades.map(function (g) { var p = g.split('/'); return 'ปี ' + p[0] + ' เทอม ' + (p[1] === 'summer' ? 'ฤดูร้อน' : p[1]); }).map(esc).join(' · ') + '</p>' : '') +
    '<button class="pill s" id="gr-open" style="justify-self:start;margin-top:6px">กรอกผลการเรียน</button></div></div></section>';
}
function reviewModal(cid, title) {
  openModal(mhead('รีวิวคอร์ส', esc(title)) + '<form class="form" id="rvf">' +
    '<div class="f">ให้คะแนนคอร์สนี้<div class="rowx" role="radiogroup" aria-label="คะแนน">' + [5, 4, 3, 2, 1].map(function (n) { return '<label class="chk-l"><input type="radio" name="rating" value="' + n + '"' + (n === 5 ? ' checked' : '') + '> ' + n + ' ดาว</label>'; }).join('') + '</div></div>' +
    field('text', 'เรียนแล้วเป็นยังไงบ้าง', '', { area: true, ph: 'เช่น เนื้อหาตรงไหนช่วยได้มาก เรียนแล้วสอบเป็นยังไง อยากบอกอะไรคนที่กำลังจะเรียน (อย่างน้อย 20 ตัวอักษร)' }) +
    '<p class="err" id="rvf-err" hidden></p><button class="pill" style="justify-self:start">ส่งรีวิว</button></form>', true);
  submitForm('#rvf', 'review.submit', '#rvf-err', function (r) { closeModal(); showNotice('ขอบคุณสำหรับรีวิว', 'รับ ' + r.cells + ' เซลล์ เซลล์จะเข้าบัญชีภายใน 1–2 วัน'); viewCells(); }, function () { return { course_id: cid, rating: Number(($('#rvf [name=rating]:checked') || {}).value || 0) }; });
}
var GR_SUBJ = ['ชีววิทยา', 'เคมี', 'ฟิสิกส์', 'คณิตศาสตร์', 'ภาษาอังกฤษ', 'ภาษาไทย'];
var GR_OPT = [['', '–'], ['4', '4'], ['3.5', '3.5'], ['3', '3'], ['2.5', '2.5'], ['2', '2'], ['1.5', '1.5'], ['1', '1'], ['0', '0']];
function gradesModal() {
  var yr = String(new Date().getFullYear() + 543), proof = null;
  openModal(mhead('ส่งผลการเรียน', 'ใส่เฉพาะวิชาที่อยากบอก ไม่ต้องครบทุกวิชา') + '<form class="form" id="grf">' +
    '<div class="row2">' + field('year', 'ปีการศึกษา', yr, { mode: 'numeric' }) + field('term', 'ภาคเรียน', '1', { options: [['1', 'เทอม 1'], ['2', 'เทอม 2'], ['summer', 'ภาคฤดูร้อน']] }) + '</div>' +
    '<div class="f">เกรดแต่ละวิชา<div class="stack" style="gap:6px">' + GR_SUBJ.concat(['']).map(function (sj, i) {
      return '<div class="row2" style="gap:8px"><input class="i" name="gs' + i + '" value="' + esc(sj) + '" placeholder="วิชาอื่น" aria-label="วิชา"><select class="i" name="gg' + i + '" aria-label="เกรด">' + GR_OPT.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></div>'; }).join('') + '</div></div>' +
    '<div class="row2">' + field('gpa', 'เกรดเฉลี่ยเทอมนี้ (ไม่ใส่ก็ได้)', '', { ph: 'เช่น 3.75' }) + field('exam', 'ผลสอบหรือรางวัลอื่น (ไม่ใส่ก็ได้)', '', { ph: 'เช่น ติดค่าย 1 สอวน. ชีวะ' }) + '</div>' +
    field('message', 'เรียนกับ INeedBio แล้วช่วยยังไงบ้าง (ไม่ใส่ก็ได้)', '', { area: true }) +
    '<label class="f" for="gr-file">รูปใบเกรด (ไม่ใส่ก็ได้ ใส่แล้วรับเพิ่ม 5 เซลล์)<input class="i" type="file" id="gr-file" accept="image/*"></label><p class="sm muted" id="gr-fn"></p>' +
    '<label class="chk-l"><input type="checkbox" name="consent_publish"> ยินยอมให้ INeedBio นำผลการเรียนและข้อความไปโพสต์ได้ โดยแสดงแค่ชื่อเล่น</label>' +
    '<p class="err" id="grf-err" hidden></p><button class="pill" style="justify-self:start">ส่งผลการเรียน</button></form>', true);
  $('#gr-file').onchange = function () {
    var f = this.files[0]; if (!f) return; $('#gr-fn').textContent = 'กำลังย่อรูป...';
    var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function () { var k = Math.min(1, 1400 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      proof = { mime: 'image/jpeg', base64: cv.toDataURL('image/jpeg', 0.8).split(',')[1] }; URL.revokeObjectURL(url); $('#gr-fn').textContent = 'แนบแล้ว: ' + f.name; };
    img.onerror = function () { $('#gr-fn').textContent = 'เปิดรูปนี้ไม่ได้ ลองเลือกรูปอื่น'; };
    img.src = url;
  };
  submitForm('#grf', 'grades.submit', '#grf-err', function (r) { closeModal(); showNotice('ขอบคุณที่เล่าให้ฟัง', 'รับ ' + r.cells + ' เซลล์ เซลล์จะเข้าบัญชีภายใน 1–2 วัน'); viewCells(); }, function () {
    var gs = []; for (var i = 0; i <= GR_SUBJ.length; i++) { var sj = $('#grf [name=gs' + i + ']').value.trim(), g = $('#grf [name=gg' + i + ']').value; if (sj && g) gs.push({ subject: sj, grade: g }); }
    return { grades: gs, proof: proof, consent_publish: $('#grf [name=consent_publish]').checked };
  });
}
function aFeedback(shell) {
  var st = S.fbTab || 'pending';
  api('admin.feedback', { status: st }).then(function (r) {
    S.fbQ = r.counts.reviews + r.counts.grades;
    var who = function (u) { return '<b>' + esc(u.nickname || '') + '</b> <span class="sm muted">' + esc(u.name || '') + (u.grade ? ' · ' + esc(u.grade) : '') + (u.school ? ' · ' + esc(u.school) : '') + '</span>'; };
    var btns = function (kind, x) { return x.status === 'pending' ? '<div class="rowx"><button class="pill s" data-fb="approve" data-k="' + kind + '" data-id="' + esc(x.id) + '">อนุมัติ · ให้เซลล์</button><button class="pill ghost s" data-fb="hide" data-k="' + kind + '" data-id="' + esc(x.id) + '">ไม่เผยแพร่</button></div>' : '<span class="badge ' + (x.status === 'approved' ? 'b-ok' : 'b-soft') + '">' + (x.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่เผยแพร่') + '</span>'; };
    shell('<h1>รีวิวและผลการเรียน</h1><p class="ink2 sm">นักเรียนไม่เห็นสถานะการตรวจ เห็นแค่ว่าส่งแล้ว เซลล์เข้าบัญชีเมื่อกดอนุมัติ รีวิวที่อนุมัติจะขึ้นในหน้าคอร์ส</p>' +
      '<div class="seg" role="group">' + [['pending', 'รอตรวจ (' + (r.counts.reviews + r.counts.grades) + ')'], ['done', 'ตรวจแล้ว']].map(function (t) { return '<button data-fbt="' + t[0] + '" aria-pressed="' + (st === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (st === 'pending' && r.trial && r.trial.summary.length ? '<h3 style="font-size:17px">คนที่ลองดูตอนฟรี เข้าใจแค่ไหน</h3><div class="tbl"><table style="min-width:520px"><thead><tr><th>คอร์ส</th><th class="num">ตอบ</th><th class="num">เข้าใจ</th><th class="num">บางส่วน</th><th class="num">ยังไม่เข้าใจ</th></tr></thead><tbody>' +
        r.trial.summary.map(function (x) { var pc = function (v) { return Math.round((v || 0) / x.n * 100) + '%'; }; return '<tr><td>' + esc(x.course) + '</td><td class="num">' + x.n + '</td><td class="num">' + pc(x.clear) + '</td><td class="num">' + pc(x.partly) + '</td><td class="num">' + pc(x.lost) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        (r.trial.comments.length ? '<div class="stack" style="gap:8px;margin-bottom:10px">' + r.trial.comments.slice(0, 20).map(function (x) { return '<div class="card stack" style="gap:4px;padding:14px 16px"><span class="sm muted">' + esc(x.course) + ' · ' + esc(x.lesson || '') + ' · ' + ({ clear: 'เข้าใจ', partly: 'เข้าใจบางส่วน', lost: 'ยังไม่เข้าใจ' }[x.level] || '') + (x.member ? ' · สมาชิก' : ' · ไม่ได้ล็อกอิน') + ' · ' + thDate(x.created_at) + '</span><p>' + esc(x.text) + '</p></div>'; }).join('') + '</div>' : '') : '') +
      '<h3 style="font-size:17px">รีวิวคอร์ส</h3>' + (r.reviews.length ? '<div class="stack" style="gap:10px">' + r.reviews.map(function (x) {
        return '<div class="card stack" style="gap:6px">' + '<div class="spread"><span>' + who(x.user) + '</span><span class="sm muted">' + thDate(x.created_at) + '</span></div><div class="sm">' + esc(x.course) + ' · ' + stars(x.rating) + '</div><p>' + esc(x.text) + '</p>' + btns('reviews', x) + '</div>'; }).join('') + '</div>' : '<p class="ink2 sm">ไม่มีรายการ</p>') +
      '<h3 style="font-size:17px;margin-top:10px">ผลการเรียน</h3>' + (r.grades.length ? '<div class="stack" style="gap:10px">' + r.grades.map(function (x) {
        return '<div class="card stack" style="gap:6px"><div class="spread"><span>' + who(x.user) + '</span><span class="sm muted">ปี ' + esc(x.year) + ' เทอม ' + esc(x.term === 'summer' ? 'ฤดูร้อน' : x.term) + ' · ' + thDate(x.created_at) + '</span></div>' +
          '<div class="rowx">' + x.grades.map(function (g) { return '<span class="badge b-soft">' + esc(g.subject) + ' ' + esc(g.grade) + '</span>'; }).join('') + (x.gpa ? '<span class="badge b-ok">GPA ' + esc(x.gpa) + '</span>' : '') + '</div>' +
          (x.exam ? '<div class="sm">ผลสอบ/รางวัล: ' + esc(x.exam) + '</div>' : '') + (x.message ? '<p>' + esc(x.message) + '</p>' : '') +
          '<div class="rowx sm"><span class="' + (x.consent_publish ? '' : 'muted') + '">' + (x.consent_publish ? 'ยินยอมให้โพสต์ (ชื่อเล่น)' : 'ไม่ยินยอมให้โพสต์') + '</span>' + (x.has_proof ? '<button class="link sm" data-proof="' + esc(x.id) + '">ดูใบเกรด</button>' : '<span class="muted">ไม่แนบใบเกรด</span>') + '</div>' + btns('grades', x) + '</div>'; }).join('') + '</div>' : '<p class="ink2 sm">ไม่มีรายการ</p>'));
    $$('[data-fbt]').forEach(function (b) { b.onclick = function () { S.fbTab = b.dataset.fbt; aFeedback(shell); }; });
    $$('[data-fb]').forEach(function (b) { b.onclick = function () { busy(b, true); api('admin.feedback.decide', { kind: b.dataset.k, id: b.dataset.id, decision: b.dataset.fb }).then(function () { toast(b.dataset.fb === 'approve' ? 'อนุมัติแล้ว เซลล์เข้าบัญชีนักเรียน' : 'ซ่อนแล้ว'); aFeedback(shell); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
    $$('[data-proof]').forEach(function (b) { b.onclick = function () { api('admin.grades.proof', { id: b.dataset.proof }).then(function (ph) { openModal(mhead('ใบเกรด') + '<img src="data:' + esc(ph.mime) + ';base64,' + ph.base64 + '" alt="ใบเกรด" style="width:100%;border-radius:12px">', true); }).catch(function (e) { toast(e.message, true); }); }; });
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function aCells(shell) {
  api('admin.cells').then(function (r) {
    shell('<h1>เซลล์สะสม</h1><p class="ink2 sm">ข้อมูลจากสมุดเซลล์หลังบ้าน นับเฉพาะวันที่คลิปเล่นจริงครบ 15 นาที กดชื่อเพื่อดูประวัติรายวัน</p>' +
      '<div class="kpis"><div class="kpi k1"><span>เรียนครบวันนี้</span><b>' + r.active_today + '</b><span>คน</span></div><div class="kpi k2"><span>มีสตรีคอยู่</span><b>' + r.rows.filter(function (x) { return x.streak > 0; }).length + '</b><span>คน</span></div><div class="kpi k3"><span>แลกโค้ดแล้ว</span><b>' + r.redeemed + '</b><span>ครั้ง</span></div></div>' +
      (r.rows.length ? '<div class="tbl"><table style="min-width:560px"><thead><tr><th>นักเรียน</th><th class="num">ติดกัน</th><th class="num">สูงสุด</th><th class="num">เซลล์</th><th>เรียนล่าสุด</th></tr></thead><tbody>' + r.rows.map(function (x) {
        return '<tr><td><button class="link" data-cu="' + esc(x.user_id) + '">' + esc(x.name) + '</button> <span class="sm muted">(' + esc(x.nickname || '') + ')</span></td><td class="num">' + x.streak + '</td><td class="num">' + x.best + '</td><td class="num">' + x.points + '</td><td>' + esc(x.last_day || '–') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty"><p>ยังไม่มีใครเริ่มสะสมเซลล์</p></div>'));
    $$('[data-cu]').forEach(function (b) { b.onclick = function () { api('admin.cells', { user_id: b.dataset.cu }).then(function (d) {
      openModal(mhead(esc(d.user.name) + ' · สมุดเซลล์') + '<div class="cl-led">' + (d.ledger.map(function (x) { return '<div><span>' + esc(CELL_REASON[x.reason] || x.reason) + (x.ref ? ' · ' + esc(x.ref) : '') + ' <span class="sm muted">' + esc(x.day || '') + '</span></span><b class="' + (x.delta > 0 ? 'plus' : 'minus') + '">' + (x.delta > 0 ? '+' : '') + x.delta + '</b></div>'; }).join('') || '<p class="ink2">ไม่มีรายการ</p>') + '</div>' +
        '<h3 style="font-size:16px;margin-top:14px">นาทีที่ดูคลิปรายวัน</h3><div class="cl-led">' + d.days.map(function (x) { return '<div><span>' + esc(x.day) + '</span><b>' + x.minutes + ' นาที' + (x.credited ? ' ✓' : '') + '</b></div>'; }).join('') + '</div>', true);
    }).catch(function (e) { toast(e.message, true); }); }; });
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}

/* ─── LEARN ─── */
function fileTag(f) { if (f.url) return 'LINK'; var m = String(f.name || '').match(/\.([a-z0-9]{2,4})$/i); return m ? m[1].toUpperCase() : /pdf/.test(f.mime) ? 'PDF' : /image/.test(f.mime) ? 'IMG' : 'FILE'; }
function fmtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
/** เปิดไฟล์ประกอบ: หลังบ้านเช็กสิทธิ์ก่อนส่งไฟล์ทุกครั้ง ลิงก์ไม่หลุดไปถึงคนที่ไม่ได้ลงทะเบียน */
function openLessonFile(lid, fid, btn) {
  var win = null; try { win = window.open('', '_blank'); } catch (e) {}
  if (btn) busy(btn, true);
  api('learn.file', { lesson_id: lid, fid: fid }).then(function (f) {
    if (btn) busy(btn, false);
    if (f.url) { if (win) win.location = f.url; else location.href = f.url; return; }
    var bin = atob(f.base64), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([arr], { type: f.mime || 'application/octet-stream' }));
    if (/pdf|image/.test(f.mime) && win) { win.location = url; }
    else { if (win) win.close(); var a = document.createElement('a'); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }).catch(function (e) { if (btn) busy(btn, false); if (win) win.close(); toast(e.message, true); });
}
function viewLearn(cid, lid) {
  var draw = function (c) {
    clearTimeout(S.skT); freshScroll();
    var all = []; c.chapters.forEach(function (ch) { ch.lessons.forEach(function (l) { all.push(l); }); });
    if (!all.length) { page('my', '<div class="empty" style="margin-block:60px"><p>คอร์สนี้ยังไม่มีบทเรียน</p><a class="pill" href="#/my">กลับ</a></div>'); return; }
    var cur = all.filter(function (l) { return l.lesson_id === lid; })[0] || all.filter(function (l) { return !l.done; })[0] || all[0];
    var i = all.indexOf(cur), done = all.filter(function (l) { return l.done; }).length, pct = Math.round(done / all.length * 100);
    // ชวนรีวิวแค่ 2 จังหวะต่อคอร์ส: เรียนได้ครึ่งทาง กับใกล้จบ (กด "ไว้ทีหลัง" แล้วจะไม่ขึ้นอีกจนถึงจังหวะถัดไป) รีวิวได้คอร์สละ 1 ครั้ง
    // แต่ละจังหวะขึ้นแค่ตอนเดียว (ตอนแรกที่ถึงจังหวะนั้น) ไปตอนอื่นแล้วจะไม่ขึ้นซ้ำ
    var rvSeen = String(store('ib_rvseen_' + cid) || '').split(':'), rvStage = pct >= 90 || (i === all.length - 1 && pct >= 50) ? 'end' : pct >= 50 ? 'mid' : '';
    if (rvSeen[0] === 'end' && rvStage === 'mid') rvStage = '';
    if (rvStage && rvSeen[0] === rvStage && rvSeen[1] !== cur.lesson_id) rvStage = '';
    if (!feat('reviews') || c.preview || c.reviewed) rvStage = '';
    if (rvStage) store('ib_rvseen_' + cid, rvStage + ':' + cur.lesson_id);
    var chap = c.chapters.filter(function (ch) { return ch.lessons.indexOf(cur) >= 0; })[0];
    setSubj(c.subject, c.accent);
    document.body.classList.remove('has-mnav');
    var lsTop = $('.lside') ? $('.lside').scrollTop : null; glideSnap(); $('#app').innerHTML = (DEMO ? '<div class="demo-bar">เดโม: ข้อมูลทั้งหมดเป็นตัวอย่าง</div>' : '') +
      '<div class="gut" style="border-bottom:1px solid var(--line)"><div class="w lhdr"><a class="back" href="#/my">← ออกจากห้องเรียน</a><span class="t">' + esc(c.title) + '</span>' + (UI2() ? lmodeHtml() : '') + '<span class="mono" style="text-transform:none">' + pct + '%</span></div></div>' +
      (c.preview ? '<div class="gut" style="background:var(--wait-soft);color:var(--wait)"><div class="w" style="padding:8px 0;font-size:14px">กำลังดูแบบนักเรียน (พรีวิวของทีมงาน) ความคืบหน้าจะไม่ถูกบันทึก · <a href="#/admin/course/' + encodeURIComponent(cid) + '" style="color:inherit">กลับหลังบ้าน</a></div></div>' : '') +
      '<main class="gut' + (S.fresh ? ' pg-enter' : '') + '"><div class="w learn"><div class="stage">' +
      '<div class="player" id="player">' + (DEMO ? playerInner(cur.youtube_id, c.watermark, c.cover_url) : '') + '</div>' +
      '<div class="lrow"><div style="min-width:0"><span class="mono">' + esc(chap.title) + '</span><h2>' + esc(cur.title) + '</h2></div>' +
      '<button class="pill ' + (cur.done ? 'ghost' : '') + '" id="done-btn">' + (cur.done ? '✓ ดูจบแล้ว' : 'ทำเครื่องหมายว่าดูจบ') + '</button></div>' +
      ((cur.files && cur.files.length) || cur.attachment_url ? '<div class="files">' + (cur.files || []).map(function (f) { return '<button type="button" class="file" data-lf="' + esc(f.fid) + '"><b>' + esc(fileTag(f)) + '</b><span>' + esc(f.name) + (f.size ? ' <span class="sub" style="display:inline">· ' + fmtSize(f.size) + '</span>' : '') + '</span></button>'; }).join('') +
        (cur.attachment_url ? '<a class="file" href="' + esc(cur.attachment_url) + '" target="_blank" rel="noopener"><b>PDF</b>ไฟล์ประกอบตอนนี้</a>' : '') + '</div>' : '') +
      (rvStage ? '<div class="lrv" id="lrv" data-stage="' + rvStage + '"><div class="spread"><b>' + (rvStage === 'end' ? 'ใกล้จบคอร์สแล้ว ช่วยรีวิวให้รุ่นน้องหน่อย' : 'เรียนมาครึ่งทางแล้ว เป็นยังไงบ้าง?') + '</b><span class="rowx" style="gap:8px">' + (cellsOn() ? '<span class="sm muted">รีวิวรับ ' + (c.review_cells || 5) + ' เซลล์ (ครั้งเดียว)</span>' : '') + '<button type="button" class="link sm" id="lrv-skip">ไว้ทีหลัง</button></span></div>' +
        '<div class="lrv-st" role="radiogroup" aria-label="ให้คะแนนคอร์ส">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-st="' + n + '" aria-label="' + n + ' ดาว">★</button>'; }).join('') + '</div>' +
        '<div id="lrv-more" hidden class="stack" style="gap:8px"><textarea class="i" id="lrv-t" rows="3" maxlength="1000" placeholder="เล่าให้รุ่นน้องฟังหน่อย เช่น ตรงไหนช่วยได้มาก เรียนแล้วสอบเป็นยังไง (อย่างน้อย 20 ตัวอักษร)"></textarea><p class="err" id="lrv-err" hidden></p><button class="pill s" id="lrv-go" style="justify-self:start">ส่งรีวิว</button></div></div>' : '') +
      '<div class="spread" style="border-top:1px solid var(--line);padding-top:16px">' +
      (all[i - 1] ? '<a class="pill quiet s" href="#/learn/' + encodeURIComponent(cid) + '/' + all[i - 1].lesson_id + '">← ตอนก่อนหน้า</a>' : '<span></span>') +
      (all[i + 1] ? '<a class="pill s" href="#/learn/' + encodeURIComponent(cid) + '/' + all[i + 1].lesson_id + '">ตอนถัดไป →</a>' : '<span class="sm muted">ตอนสุดท้ายของคอร์ส</span>') + '</div>' +
      '<p class="hint">คลิปนี้สำหรับผู้ซื้อคอร์สเท่านั้น บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ห้ามอัดหน้าจอหรือแชร์ลิงก์ · ปุ่มลัด: เว้นวรรค = เล่น/หยุด, ←/→ = 5 วินาที, F = เต็มจอ</p>' +
      '</div><aside class="lside">' + (c.cover_url ? '<div class="lcov">' + cover(c) + '</div>' : '') + '<div class="prog"><span class="sm ink2">เรียนไปแล้ว ' + done + ' จาก ' + all.length + ' ตอน</span><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      (function () { var sec = '', useS = hasSections(c.chapters), si = 0; return c.chapters.map(function (ch) {
        var j = ch.title.indexOf(' › '), sn = j < 0 ? ch.title : ch.title.slice(0, j), sub = j < 0 ? '' : ch.title.slice(j + 3), head = '';
        if (useS && sn !== sec) { sec = sn; si++; head = '<div class="lsec">' + esc(sn) + '</div>'; }
        return head + '<div class="chap">' + esc(useS ? (sub || sn) : ch.title) + '</div>' + ch.lessons.map(function (l) {
          return '<a class="ep' + (l === cur ? ' on' : '') + (l.done ? ' done' : '') + '" href="#/learn/' + encodeURIComponent(cid) + '/' + l.lesson_id + '"><span class="ck">' + (l.done ? '✓' : '') + '</span><span>' + esc(l.title) + '</span><span class="d">' + l.duration_min + '\'</span></a>';
        }).join('');
      }).join(''); })() + '</aside></div></main>';
    S.fresh = false;
    if (UI2()) {
      var ls = $('.lside'); if (ls && lsTop !== null) ls.scrollTop = lsTop;
      bindLmode();
      glideAll();
      var on = $('.lside .ep.on');
      if (ls && on) { var lr = ls.getBoundingClientRect(), orr = on.getBoundingClientRect(); if (orr.top < lr.top + 40 || orr.bottom > lr.bottom - 40) ls.scrollTo({ top: ls.scrollTop + (orr.top - lr.top) - lr.height / 3, behavior: 'smooth' }); }
    }
    $$('[data-lf]').forEach(function (b) { b.onclick = function () { openLessonFile(cur.lesson_id, b.dataset.lf, b); }; });
    $('#done-btn').onclick = function () {
      if (c.preview) return toast('โหมดพรีวิว ไม่บันทึกความคืบหน้า');
      var b = this, nv = !cur.done; busy(b, true);
      api('progress.set', { lesson_id: cur.lesson_id, done: nv }).then(function () {
        cur.done = nv; S.mem.mine = null;
        if (nv && all[i + 1]) toast('เยี่ยม! ไปตอนถัดไปได้เลย');
        markDone(nv); busy(b, false);
      }).catch(function (e) { busy(b, false); toast(e.message, true); });
    };
    // อัปเดตเฉพาะปุ่ม เครื่องหมายในรายการตอน และแถบความคืบหน้า · ไม่วาดหน้าใหม่ เครื่องเล่นจึงเล่นต่อได้
    var markDone = function (nv) {
      var b = $('#done-btn'); if (b) { b.textContent = nv ? '✓ ดูจบแล้ว' : 'ทำเครื่องหมายว่าดูจบ'; b.classList.toggle('ghost', nv); }
      var ep = $('.ep.on'); if (ep) { ep.classList.toggle('done', nv); $('.ck', ep).textContent = nv ? '✓' : ''; }
      var dn = all.filter(function (l) { return l.done; }).length, pg = $('.lside .prog');
      if (pg) { var t = $('.sm', pg), bi = $('.bar i', pg); if (t) t.textContent = 'เรียนไปแล้ว ' + dn + ' จาก ' + all.length + ' ตอน'; if (bi) bi.style.width = Math.round(dn / all.length * 100) + '%'; }
    };
    if (!DEMO) safePlayer($('#player'), cur.youtube_id, c.watermark, { poster: c.cover_url, key: cur.lesson_id, onEnd: function (msg) {
      var nx = all[i + 1];
      msg.innerHTML = 'ดูจบตอนนี้แล้ว' + (nx ? '<br><a class="pill" style="margin-top:12px" href="#/learn/' + encodeURIComponent(cid) + '/' + nx.lesson_id + '">ตอนถัดไป: ' + esc(nx.title) + ' →</a>' : '<br>จบคอร์สแล้ว เก่งมาก!');
      if (cur.done || c.preview) return;
      api('progress.set', { lesson_id: cur.lesson_id, done: true }).then(function () {
        cur.done = true; S.mem.mine = null; markDone(true);
      }).catch(function () {});
    } });
    if (!DEMO && !c.preview) startStudyPing(cur.lesson_id);
    if ($('#lrv')) {
      $('#lrv-skip').onclick = function () { store('ib_rvseen_' + cid, $('#lrv').dataset.stage + ':-'); $('#lrv').remove(); };
      var rsv = 0, paint = function (n) { $$('[data-st]').forEach(function (b) { b.classList.toggle('on', Number(b.dataset.st) <= n); }); };
      $$('[data-st]').forEach(function (b) { b.onclick = function () { rsv = Number(b.dataset.st); paint(rsv); $('#lrv-more').hidden = false; }; b.onmouseenter = function () { paint(Number(b.dataset.st)); }; b.onmouseleave = function () { paint(rsv); }; });
      $('#lrv-go').onclick = function () {
        var bt = this, er = $('#lrv-err'); er.hidden = true; busy(bt, true);
        api('review.submit', { course_id: cid, rating: rsv, text: $('#lrv-t').value }).then(function (r) { c.reviewed = true; $('#lrv').innerHTML = '<b>ขอบคุณสำหรับรีวิว</b>' + (cellsOn() ? '<p class="sm ink2">รับ ' + r.cells + ' เซลล์ เซลล์จะเข้าบัญชีภายใน 1–2 วัน</p>' : ''); })
          .catch(function (e) { busy(bt, false); er.textContent = e.message; er.hidden = false; });
      };
    }
    S.timer = setInterval(function () { var w = $('#wm'); if (!w) return; w.style.top = (8 + Math.random() * 78) + '%'; w.style.left = (4 + Math.random() * 60) + '%'; }, 9000);
  };
  if (S.learn && S.learn.course_id === cid && !S.learn.preview) return draw(S.learn);
  loading('my', 'learn');
  api('learn.get', { course_id: cid }).then(function (c) { S.learn = c; draw(c); })
    .catch(function (e) { if (e.code === 'NO_ACCESS') { toast(e.message, true); go('/course/' + cid); } else failed('my', e); });
}

/* ─── PROFILE ─── */
function viewProfile() {
  var u = S.user;
  page('profile', '<div class="page-h"><span class="mono">บัญชี</span><h1>ข้อมูลส่วนตัว</h1></div><div class="stack" style="gap:20px;max-width:640px;padding-bottom:72px">' +
    '<form class="card form" id="pf"><h3>ข้อมูลผู้เรียน</h3>' + (u.has_photo ? '' : '<div class="note wait">ยังไม่มีรูปถ่ายของน้อง เพิ่มรูปไว้ แอดมินจะยืนยันตัวตนและตรวจการชำระเงินได้เร็วขึ้น</div>') +
    photoField(u.has_photo ? PHOTO_LOADING : '', false) + '<div class="row2">' + field('first_name', 'ชื่อ', u.first_name) + field('last_name', 'นามสกุล', u.last_name) + '</div>' +
    '<div class="row2">' + field('nickname', 'ชื่อเล่น', u.nickname) + field('grade', 'ระดับชั้น', u.grade, { options: GRADES }) + '</div>' +
    field('school', 'โรงเรียน (หรือโรงเรียนที่จบมา)', u.school) + goalFields(u) + contactFields(u) + '<div class="row2">' + field('phone', 'เบอร์โทร', u.phone, { mode: 'tel' }) + '<label class="f">อีเมล<input class="i" value="' + esc(u.email) + '" disabled></label></div>' +
    (u.data_consent ? '' : consentBox(false)) +
    '<p class="err" id="pf-err" hidden></p><button class="pill" style="justify-self:start">บันทึก</button></form>' +
    '<form class="card form" id="pw"><h3>เปลี่ยนรหัสผ่าน</h3>' + field('old_password', 'รหัสผ่านเดิม', '', { type: 'password', auto: 'current-password' }) + field('password', 'รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)', '', { type: 'password', auto: 'new-password', idp: '2' }) +
    '<p class="err" id="pw-err" hidden></p><button class="pill ghost" style="justify-self:start">เปลี่ยนรหัสผ่าน</button></form>' +
    '<div class="card spread"><div><h3>ธีมของเว็บ</h3><p class="sm ink2">ค่าเริ่มต้นจะสว่างหรือมืดตามการตั้งค่าของเครื่อง</p></div>' + themeSwitch() + '</div>' +
    '<p class="sm muted">อ่าน <a href="#/terms">ข้อตกลงการใช้งาน</a> และ <a href="#/privacy">นโยบายความเป็นส่วนตัว</a> · ต้องการลบบัญชี ทักแอดมินทาง IG</p>' +
    '<div class="card spread"><div><h3>ออกจากระบบ</h3><p class="sm ink2">ถ้าจะใช้เครื่องอื่น เข้าสู่ระบบที่เครื่องใหม่ได้เลย เครื่องนี้จะออกจากระบบเอง</p></div><button class="pill danger" data-act="logout">ออกจากระบบ</button></div></div>');
  bindGrade($('#pf')); S.photo = null; bindPhoto($('#pf'));
  if (u.has_photo) api('my.photo').then(function (ph) { var b = $('#ph-pick'); if (ph && b && !S.photo) b.innerHTML = '<img src="data:' + esc(ph.mime) + ';base64,' + ph.base64 + '" alt="">'; }).catch(function () {});
  submitForm('#pf', 'profile.update', '#pf-err', function (r) { S.user = r; S.photo = null; toast('บันทึกแล้ว'); viewProfile(); }, function () { return S.photo ? { photo: S.photo } : {}; });
  submitForm('#pw', 'password.change', '#pw-err', function () { toast('เปลี่ยนรหัสผ่านแล้ว'); $('#pw').reset(); });
}
function submitForm(sel, action, errSel, done, extra) {
  var f = $(sel); if (!f) return;
  f.onsubmit = function (ev) {
    ev.preventDefault();
    var btn = $('button:not([type=button])', f), er = $(errSel);
    var data = formData(f); if (extra) Object.assign(data, extra());
    er.hidden = true; busy(btn, true);
    api(action, data).then(function (r) { busy(btn, false); done(r, data); }).catch(function (e) { busy(btn, false); er.textContent = e.message; er.hidden = false; });
  };
}

/* ─── AUTH MODAL ─── */
function authModal(mode, st) {
  st = st || {};
  var h;
  if (mode === 'login') h = mhead('ยินดีต้อนรับกลับ') + '<div class="tabs"><button aria-pressed="true">เข้าสู่ระบบ</button><button data-act="signup">สมัครสมาชิก</button></div>' +
    '<form class="form" id="af">' + field('email', 'อีเมล', st.email || '', { type: 'email', auto: 'email' }) + field('password', 'รหัสผ่าน', '', { type: 'password', auto: 'current-password' }) +
    '<p class="err" id="af-err" hidden></p><button class="pill block">เข้าสู่ระบบ</button></form><button class="link" style="justify-self:center" data-act="forgot">ลืมรหัสผ่าน</button>' + (DEMO ? demoLogins() : '');
  else if (mode === 'signup') h = mhead('สร้างบัญชี', 'ใช้อีเมลที่เปิดดูได้จริง ระบบจะส่งรหัสยืนยันไปที่อีเมลนี้') + '<div class="tabs"><button data-act="login">เข้าสู่ระบบ</button><button aria-pressed="true">สมัครสมาชิก</button></div><div class="dots"><i class="on"></i><i></i></div>' +
    '<form class="form" id="af"><div class="row2">' + field('first_name', 'ชื่อ', st.first_name, { auto: 'given-name' }) + field('last_name', 'นามสกุล', st.last_name, { auto: 'family-name' }) + '</div>' +
    '<div class="row2">' + field('nickname', 'ชื่อเล่น', st.nickname) + field('grade', 'ระดับชั้น', st.grade || 'ม.4', { options: GRADES }) + '</div>' + field('school', 'โรงเรียน (หรือโรงเรียนที่จบมา)', st.school) +
    photoField(S.photo ? 'data:' + S.photo.mime + ';base64,' + S.photo.base64 : '', true) +
    goalFields(st) + contactFields(st) +
    '<div class="row2">' + field('phone', 'เบอร์โทร', st.phone, { mode: 'tel', auto: 'tel', ph: '08x-xxx-xxxx' }) + field('email', 'อีเมล', st.email, { type: 'email', auto: 'email' }) + '</div>' +
    field('password', 'รหัสผ่าน (อย่างน้อย 8 ตัว)', st.password || '', { type: 'password', auto: 'new-password' }) +
    consentBox(st.accept_data) +
    '<label class="consent"><input type="checkbox" name="accept_terms"' + (st.accept_terms ? ' checked' : '') + '><span>ฉันได้อ่านและยอมรับ <button type="button" class="link" data-legal="terms">ข้อตกลงการใช้งาน</button> และ <button type="button" class="link" data-legal="privacy">นโยบายความเป็นส่วนตัว</button> ของ INeedBio</span></label>' +
    '<p class="err" id="af-err" hidden></p><button class="pill block">ส่งรหัสยืนยันไปที่อีเมล</button></form>';
  else if (mode === 'otp' || mode === 'reset') h = mhead(mode === 'otp' ? 'ยืนยันอีเมล' : 'ตั้งรหัสผ่านใหม่') + (mode === 'otp' ? '<div class="dots"><i class="on"></i><i class="on"></i></div>' : '') +
    '<p class="ink2">ส่งรหัส 6 หลักไปที่ <b style="color:var(--ink)">' + esc(st.email) + '</b> แล้ว รหัสใช้ได้ภายใน 10 นาที ถ้าไม่เจอให้ดูในโฟลเดอร์สแปม</p>' +
    '<form class="form" id="af"><div class="otp">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<input id="o' + i + '" inputmode="numeric" autocomplete="one-time-code" maxlength="1" aria-label="หลักที่ ' + (i + 1) + '">'; }).join('') + '</div>' +
    (mode === 'reset' ? field('password', 'รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)', '', { type: 'password', auto: 'new-password' }) : '') +
    '<p class="err" id="af-err" hidden></p><button class="pill block">' + (mode === 'otp' ? 'ยืนยันและสร้างบัญชี' : 'ตั้งรหัสผ่านใหม่') + '</button></form>' +
    '<button class="link" style="justify-self:center" id="resend" disabled>ส่งรหัสอีกครั้ง</button>';
  else if (mode === 'forgot') h = mhead('ลืมรหัสผ่าน', 'กรอกอีเมลที่ใช้สมัคร ระบบจะส่งรหัสสำหรับตั้งรหัสผ่านใหม่') +
    '<form class="form" id="af">' + field('email', 'อีเมล', st.email || '', { type: 'email', auto: 'email' }) + '<p class="err" id="af-err" hidden></p><button class="pill block">ส่งรหัส</button></form><button class="link" style="justify-self:center" data-act="login">กลับไปเข้าสู่ระบบ</button>';
  openModal(h);
  var f = $('#af'), er = $('#af-err');
  var fail = function (btn, e) { busy(btn, false); er.textContent = e.message; er.hidden = false; };
  if (mode === 'otp' || mode === 'reset') { bindOtp(); startResend(st, mode); }
  if (mode === 'signup') {
    bindGrade(f); bindPhoto(f);
    $$('[data-legal]', f).forEach(function (b) { b.onclick = function () { var draft = formData(f); legalModal(b.dataset.legal, function () { authModal('signup', draft); }); }; });
  }
  f.onsubmit = function (ev) {
    ev.preventDefault(); er.hidden = true;
    var btn = $('button:not([type=button])', f), d = formData(f); busy(btn, true);
    if (mode === 'login') api('login', d).then(function (r) { setSession(r); closeModal(); toast('สวัสดี ' + r.user.nickname); route(); }).catch(function (e) { fail(btn, e); });
    else if (mode === 'signup') {
      if (!S.photo) return fail(btn, { message: 'ใส่รูปของน้องด้วย (รูปไหนก็ได้ ขอแค่เป็นรูปน้องเอง)' });
      if (!d.accept_data) return fail(btn, { message: 'กรุณาติ๊กยินยอมให้เก็บรูปถ่ายและข้อมูลเพิ่มเติมก่อน' });
      if (!d.accept_terms) return fail(btn, { message: 'กรุณาติ๊กยอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัวก่อน' });
      d.photo = S.photo; api('register.start', d).then(function (r) { authModal('otp', Object.assign({}, d, { email: r.email })); }).catch(function (e) { fail(btn, e); }); }
    else if (mode === 'forgot') api('password.forgot', d).then(function (r) { authModal('reset', { email: r.email }); }).catch(function (e) { fail(btn, e); });
    else {
      var otp = $$('.otp input').map(function (i) { return i.value; }).join('');
      if (otp.length !== 6) return fail(btn, { message: 'กรอกรหัสให้ครบ 6 หลัก' });
      var act = mode === 'otp' ? 'register.verify' : 'password.reset';
      api(act, { email: st.email, otp: otp, password: d.password }).then(function (r) {
        setSession(r); closeModal(); if (r.legacy && r.legacy.matched) { toast('ยินดีต้อนรับกลับ ' + r.user.nickname + ' เปิดคอร์สเดิมให้แล้ว'); go('/my'); return; } toast(mode === 'otp' ? 'สร้างบัญชีแล้ว ยินดีต้อนรับ ' + r.user.nickname + (r.legacy && r.legacy.queued ? ' · ชื่อของคุณอยู่ในรายชื่อนักเรียนเก่า แอดมินกำลังตรวจ' : '') : 'ตั้งรหัสผ่านใหม่แล้ว'); route();
      }).catch(function (e) { fail(btn, e); $$('.otp input').forEach(function (i) { i.value = ''; }); $('#o0').focus(); });
    }
  };
}
function bindOtp() {
  var ins = $$('.otp input');
  ins.forEach(function (inp, i) {
    inp.oninput = function () { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); if (ins.every(function (x) { return x.value; })) $('#af button:not([type=button])').focus(); };
    inp.onkeydown = function (e) { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); };
    inp.onpaste = function (e) { var t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!t) return; e.preventDefault(); t.split('').forEach(function (d, j) { if (ins[j]) ins[j].value = d; }); (ins[t.length] || ins[5]).focus(); };
  });
  setTimeout(function () { ins[0].focus(); }, 40);
}
function startResend(st, mode) {
  var b = $('#resend'), left = 60;
  var tick = function () { if (!document.body.contains(b)) return clearInterval(t); left--; b.textContent = left > 0 ? 'ส่งรหัสอีกครั้ง (' + left + ')' : 'ส่งรหัสอีกครั้ง'; b.disabled = left > 0; if (left <= 0) clearInterval(t); };
  var t = setInterval(tick, 1000); tick();
  b.onclick = function () {
    b.disabled = true;
    var p = mode === 'otp' ? api('register.start', st) : api('password.forgot', { email: st.email });
    p.then(function () { toast('ส่งรหัสใหม่แล้ว'); startResend(st, mode); }).catch(function (e) { toast(e.message, true); b.disabled = false; });
  };
}
function demoLogins() {
  return '<div class="note plain sm stack" style="gap:8px"><b style="color:var(--ink)">บัญชีตัวอย่างสำหรับเดโม</b><div class="rowx"><button class="pill s ghost" data-demo="student">เข้าเป็นนักเรียน</button><button class="pill s ghost" data-demo="teacher">เข้าเป็นผู้สอนเคมี</button><button class="pill s ghost" data-demo="admin">เข้าเป็นแอดมิน</button></div></div>';
}

/* ─── ADMIN ─── */
function viewAdmin(tab, arg) {
  if (S.user && S.user.role === 'teacher' && (S.user.profile_todo || []).length && tab !== 'tprofile') { tab = 'tprofile'; arg = undefined; if (location.hash !== '#/admin/tprofile') history.replaceState(null, '', '#/admin/tprofile'); }
  var groups = isAdm() ? [['งานประจำวัน', [['dash', 'ภาพรวม'], ['orders', 'คำสั่งซื้อ'], ['feedback', 'รีวิวและผลการเรียน'], ['requests', 'สิทธิ์เข้าเรียน'], ['legacy', 'นักเรียนรุ่นเก่า']]],
    ['เนื้อหา', [['courses', 'คอร์สและบทเรียน'], ['results', 'ผลงานนักเรียน']]],
    ['การเงินและการขาย', [['payouts', 'ส่วนแบ่งผู้สอน'], ['finance', 'รายรับรายจ่าย'], ['bundles', 'แพ็กเกจ'], ['coupons', 'โค้ดส่วนลด'], ['accounts', 'บัญชีรับเงิน']]],
    ['ระบบ', [['teachers', 'ผู้สอน'], ['users', 'ผู้ใช้และยศ'], ['cells', 'เซลล์สะสม'], ['log', 'บันทึกการแก้ไข'], ['settings', 'ตั้งค่า']]]]
    : [['ผู้สอน · ' + mySubj().map(function (k) { return S.cfg.subjects[k]; }).join(' · '), [['dash', 'ภาพรวม'], ['courses', 'คอร์สของฉัน'], ['orders', 'คำสั่งซื้อ (ดูอย่างเดียว)'], ['payouts', 'ส่วนแบ่งของฉัน'], ['finance', 'รายรับรายจ่าย'], ['tprofile', 'โปรไฟล์ผู้สอน']]]];
  groups.forEach(function (g) { g[1] = g[1].filter(function (t) { return (t[0] !== 'cells' || feat('cells')) && (t[0] !== 'feedback' || feat('reviews')); }); });
  var allowed = [].concat.apply([], groups.map(function (g) { return g[1].map(function (t) { return t[0]; }); })).concat(['course', 'tprofile']);
  if (allowed.indexOf(tab) < 0) tab = 'dash';
  var shell = function (body, skel) {
    page('admin', '<div class="adm"><nav class="aside" aria-label="เมนูหลังบ้าน">' + groups.map(function (g) { return '<span class="agh">' + g[0] + '</span>' + g[1].map(function (t) {
      return '<a href="#/admin/' + t[0] + '" class="' + (tab === t[0] || (tab === 'course' && t[0] === 'courses') || (tab === 'tprofile' && arg && t[0] === 'teachers') ? 'on' : '') + '"><span>' + t[1] + '</span>' + (t[0] === 'orders' && S.pending ? '<span class="n">' + S.pending + '</span>' : '') + (t[0] === 'requests' && S.pendingLegacy ? '<span class="n">' + S.pendingLegacy + '</span>' : '') + (t[0] === 'legacy' && S.legacyQ ? '<span class="n">' + S.legacyQ + '</span>' : '') + (t[0] === 'finance' && S.expQ ? '<span class="n">' + S.expQ + '</span>' : '') + '</a>';
    }).join(''); }).join('') + '</nav><div class="amain" id="amain">' + body + '</div></div>', true, skel);
  };
  clearTimeout(S.skT); S.skT = setTimeout(function () { shell(skeleton('admin'), true); }, 350);
  var fn = { dash: aDash, orders: aOrders, coupons: aCoupons, bundles: aBundles, accounts: aAccounts, requests: aRequests, courses: aCourses, course: aCourse, results: aResults, users: aUsers, settings: aSettings,
    finance: aFinance, payouts: aPayouts, teachers: aTeachers, tprofile: aTProfile, legacy: aLegacy, log: aLog, cells: aCells, feedback: aFeedback }[tab] || aDash;
  fn(shell, arg);
}
function refreshPending() { return api('admin.stats').then(function (s) { S.pendingLegacy = s.pending_legacy || 0; S.pending = s.teacher ? s.reviewing : s.pending - S.pendingLegacy; S.legacyQ = s.legacy_pending || 0; S.expQ = s.expense_pending || 0; return s; }); }
function aDash(shell) {
  refreshPending().then(function (s) {
    if (s.teacher) return teacherDash(shell, s);
    var max = Math.max.apply(null, s.by_subject.map(function (x) { return x.revenue; }).concat([1]));
    shell('<h1>ภาพรวม</h1><div class="kpis">' +
      '<a class="kpi' + (s.pending ? ' hot' : '') + '" href="#/admin/orders" style="text-decoration:none;color:inherit"><span>รอตรวจยอด</span><b>' + s.pending + '</b><span>' + (s.oldest_pending ? 'เก่าสุด ' + thDate(s.oldest_pending, true) : 'ไม่มีบิลค้าง') + (s.awaiting ? ' · รอโอน ' + s.awaiting + ' บิล' : '') + '</span></a>' +
      '<div class="kpi k1"><span>สมาชิกทั้งหมด</span><b>' + s.users_total.toLocaleString() + '</b><span>+' + s.users_today + ' วันนี้</span></div>' +
      '<div class="kpi k2"><span>รายได้เดือนนี้</span><b>' + baht(s.month_revenue) + '</b><span>' + s.month_count + ' รายการที่อนุมัติ</span></div>' +
      '<div class="kpi k3"><span>อีเมลที่ส่งได้อีกวันนี้</span><b>' + s.email_quota + '</b><span>' + (s.email_quota < 20 ? 'ใกล้เต็มโควตา' : 'โควตารายวันของ Gmail') + '</span></div></div>' +
      (s.dream_top && s.dream_top.length ? '<div class="card"><div class="spread"><h3 style="font-size:17px">คณะในฝันยอดนิยมของสมาชิก</h3><span class="sm muted">เด็กซิ่ว ' + (s.repeat_count || 0) + ' คน</span></div><ol class="dream">' + s.dream_top.map(function (d) { return '<li><span>' + esc(d.name) + '</span><b>' + d.count + ' คน</b></li>'; }).join('') + '</ol></div>' : '') +
      '<h3 style="font-size:17px">รายได้ตามวิชา · เดือนนี้</h3><div class="tbl"><table><thead><tr><th>วิชา</th><th class="num">ลงทะเบียน</th><th class="num">รายได้</th><th style="width:40%"></th></tr></thead><tbody>' +
      s.by_subject.map(function (x) { return '<tr class="s-' + esc(x.subject) + '"><td><span class="dotrow" style="display:inline"><i style="display:inline-block;margin-right:8px"></i></span>' + esc(x.name) + '</td><td class="num">' + x.count + '</td><td class="num">' + baht(x.revenue) + '</td><td><div class="bar"><i style="width:' + Math.round(x.revenue / max * 100) + '%"></i></div></td></tr>'; }).join('') + '</tbody></table></div>');
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function aRequests(shell) {
  var status = S.reqTab || 'pending';
  api('admin.enrollments', { status: status }).then(function (list) {
    if (status === 'pending') S.pendingLegacy = list.length;
    shell('<div class="spread"><h1>สิทธิ์เข้าเรียน</h1><button class="pill ghost s" id="grant-btn">+ เพิ่มสิทธิ์ให้ผู้ใช้เอง</button></div>' +
      '<div class="seg" role="group">' + [['pending', 'รอตรวจ'], ['approved', 'อนุมัติแล้ว'], ['rejected', 'ปฏิเสธแล้ว']].map(function (t) { return '<button data-rtab="' + t[0] + '" aria-pressed="' + (status === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (status === 'pending' ? '<p class="ink2 sm">คำขอแบบเดิมที่ส่งสลิปจากหน้าคอร์ส (ก่อนมีตะกร้า) คำสั่งซื้อใหม่ทั้งหมดอยู่ที่เมนู "คำสั่งซื้อ"</p>' : '<p class="ink2 sm">รายชื่อสิทธิ์เข้าเรียนทั้งหมด รวมที่อนุมัติจากคำสั่งซื้อและที่เพิ่มเอง</p>') +
      (list.length ? '<div class="tbl"><table style="min-width:640px"><thead><tr><th>นักเรียน</th><th>คอร์ส</th><th class="num">ยอด</th><th>' + (status === 'pending' ? 'ส่งเมื่อ' : 'ตัดสินเมื่อ') + '</th><th></th></tr></thead><tbody>' + list.map(function (r) {
        return '<tr><td>' + esc(r.name) + '<div class="sub">' + esc(r.nickname) + ' · ' + esc(r.email) + '</div></td><td>' + esc(r.course_title) + (r.note ? '<div class="sub">' + esc(r.note) + '</div>' : '') + '</td><td class="num">' + baht(r.amount) + '</td><td class="sub">' + thDate(status === 'pending' ? r.created_at : r.decided_at, true) + '</td><td><div class="acts">' +
          (r.has_slip ? '<button class="pill ' + (status === 'pending' ? '' : 'quiet ') + 's" data-slip="' + r.enroll_id + '">' + (status === 'pending' ? 'ตรวจสลิป' : 'ดูสลิป') + '</button>' : '<span class="sub">ไม่มีสลิป</span>') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>' + (status === 'pending' ? 'ไม่มีคำขอค้าง ตรวจครบแล้ว' : 'ยังไม่มีรายการ') + '</p></div>'));
    S.reqList = list;
    $$('[data-rtab]').forEach(function (b) { b.onclick = function () { S.reqTab = b.dataset.rtab; viewAdmin('requests'); }; });
    $$('[data-slip]').forEach(function (b) { b.onclick = function () { slipModal(list.filter(function (r) { return r.enroll_id === b.dataset.slip; })[0]); }; });
    $('#grant-btn').onclick = grantModal;
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function slipModal(r) {
  openModal(mhead('สลิปของ ' + esc(r.nickname), esc(r.course_title) + ' · ต้องโอน ' + baht(r.amount)) + '<div id="slipv" class="loading" style="padding:40px 0"><span class="spin"></span></div>' +
    (r.status === 'pending' ? '<form class="form" id="dec">' + field('note', 'เหตุผล (ใส่เมื่อปฏิเสธ นักเรียนจะเห็นในอีเมล)', '', { ph: 'เช่น ยอดโอนไม่ครบ' }) +
      '<div class="rowx" style="justify-content:flex-end"><button type="button" class="pill danger" id="rej">ปฏิเสธ</button><button type="button" class="pill" id="apv">อนุมัติ</button></div></form>' : ''), true);
  api('admin.slip', { enroll_id: r.enroll_id }).then(function (s) { var v = $('#slipv'); if (v) { v.className = ''; v.innerHTML = '<img class="slipimg" alt="สลิปการโอน" src="data:' + esc(s.mime) + ';base64,' + s.base64 + '">'; } })
    .catch(function (e) { var v = $('#slipv'); if (v) v.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  var decide = function (decision, btn) {
    var note = $('#f-note').value.trim();
    if (decision === 'reject' && !note) { toast('ใส่เหตุผลก่อนปฏิเสธ', true); $('#f-note').focus(); return; }
    busy(btn, true);
    api('admin.decide', { enroll_id: r.enroll_id, decision: decision, note: note }).then(function () {
      closeModal(); toast(decision === 'approve' ? 'อนุมัติแล้ว ส่งอีเมลแจ้ง ' + r.nickname + ' แล้ว' : 'ปฏิเสธแล้ว ส่งอีเมลแจ้งเหตุผลแล้ว'); viewAdmin('requests');
    }).catch(function (e) { busy(btn, false); toast(e.message, true); });
  };
  if ($('#apv')) { $('#apv').onclick = function () { decide('approve', this); }; $('#rej').onclick = function () { decide('reject', this); }; }
}
function grantModal() {
  api('admin.courses').then(function (cs) {
    openModal(mhead('เพิ่มสิทธิ์เข้าเรียน', 'ใช้เมื่อนักเรียนโอนผ่านช่องทางอื่น หรือให้สิทธิ์ฟรี ผู้ใช้ต้องสมัครสมาชิกก่อน') +
      '<form class="form" id="gf">' + field('emails', 'อีเมลของนักเรียน (ใส่ได้หลายอีเมล คั่นด้วยเว้นวรรคหรือขึ้นบรรทัดใหม่)', '', { area: true }) + field('course_id', 'คอร์ส', cs[0] && cs[0].course_id, { options: cs.map(function (c) { return [c.course_id, c.title]; }) }) +
      '<div class="row2">' + field('amount', 'ยอดที่รับ (บาท)', '', { mode: 'numeric', ph: '0 ถ้าให้ฟรี', hint: 'ใส่ยอดเมื่อรับเงินผ่านช่องทางอื่น จะนับเป็นรายรับ' }) + field('expires_at', 'หมดสิทธิ์วันที่ (ไม่ใส่ = ตลอดชีพ)', '', { type: 'date' }) + '</div>' + field('note', 'เหตุผล / หมายเหตุ', '', { ph: 'เช่น โอนผ่าน IG, ทุนเรียน' }) + '<p class="err" id="gf-err" hidden></p><button class="pill">เพิ่มสิทธิ์</button></form>');
    submitForm('#gf', 'admin.grant', '#gf-err', function (r) { closeModal(); toast('เพิ่มสิทธิ์ ' + r.added.length + ' คน' + (r.skipped.length ? ' · ข้าม ' + r.skipped.length + ' (' + r.skipped.map(function (x) { return x.email + ': ' + x.why; }).join(', ') + ')' : '')); S.reqTab = 'approved'; viewAdmin('requests'); });
  });
}
function aCourses(shell, subj) {
  Promise.all([api('admin.courses'), api('admin.bundles').catch(function () { return []; })]).then(function (r) {
    var cs = r[0], bds = r[1], subs = {}, adm = isAdm();
    mySubj().forEach(function (k) { subs[k] = S.cfg.subjects[k]; });
    if (!adm && !subj && mySubj().length === 1) subj = mySubj()[0];
    if (subj && !subs[subj]) subj = '';
    var cardC = function (c) {
      return '<a class="ccard' + sc(c.subject) + '" href="#/admin/course/' + encodeURIComponent(c.course_id) + '">' + (c.cover_url ? '<span class="cthumb">' + cover(c) + '</span>' : '') + '<div class="spread"><span class="mono">' + esc(c.level || c.subject_name) + '</span><span class="badge ' + (c.status === 'published' ? 'b-ok' : 'b-soft') + '">' + (c.status === 'published' ? 'เปิดขาย' : 'ฉบับร่าง') + '</span></div><h3 style="font-size:17px">' + esc(c.title) + '</h3><span class="sm ink2">' + c.lesson_count + ' ตอน · ' + hm(c.total_min) + ' · ' + baht(c.price) + '</span><span class="sm muted">นักเรียน ' + c.students + ' คน · ' + esc(c.course_id) + '</span></a>';
    };
    if (!subj) {
      shell('<div class="spread"><h1>' + (adm ? 'คอร์สและบทเรียน' : 'คอร์สของฉัน') + '</h1>' + (adm ? '<button class="pill s" id="new-course">+ คอร์สใหม่</button>' : '') + '</div><p class="ink2 sm">เลือกแฟ้มวิชาเพื่อดูและแก้คอร์สในวิชานั้น</p>' +
        '<div class="folders">' + Object.keys(subs).map(function (k) {
          var list = cs.filter(function (c) { return c.subject === k; }), pub = list.filter(function (c) { return c.status === 'published'; }).length;
          var st = list.reduce(function (a, c) { return a + c.students; }, 0), nb = bds.filter(function (b) { return b.subject === k; }).length;
          return '<a class="folder s-' + k + '" href="#/admin/courses/' + k + '"><span class="ftab"></span><span class="fbody"><b>' + esc(subs[k]) + '</b><span>' + list.length + ' คอร์ส' + (list.length ? ' · เปิดขาย ' + pub + (list.length - pub ? ' · ร่าง ' + (list.length - pub) : '') : '') + '</span><span>นักเรียน ' + st + ' คน' + (nb ? ' · แพ็กเกจ ' + nb : '') + '</span></span></a>';
        }).join('') + '</div>');
      if ($('#new-course')) $('#new-course').onclick = function () { courseModal(null); };
      return;
    }
    var list = cs.filter(function (c) { return c.subject === subj; }), bl = bds.filter(function (b) { return b.subject === subj; });
    setSubj(subj);
    shell('<div class="crumb"><a href="#/admin/courses">คอร์สและบทเรียน</a><span>›</span><b>' + esc(subs[subj] || subj) + '</b></div>' +
      '<div class="spread"><h1>' + esc(subs[subj] || subj) + '</h1>' + (adm ? '<button class="pill s" id="new-course">+ คอร์สใหม่ในวิชานี้</button>' : '') + '</div>' + (adm ? '' : '<p class="ink2 sm">แก้เนื้อหา ตอนเรียน และให้สิทธิ์นักเรียนได้ ส่วนราคาและการเปิดขาย แอดมินเป็นคนเปลี่ยน</p>') +
      (list.length ? '<div class="cgrid">' + list.map(cardC).join('') + '</div>' : '<div class="empty"><p>ยังไม่มีคอร์สในวิชานี้</p></div>') +
      (bl.length ? '<div class="spread"><h3 style="font-size:17px">แพ็กเกจของวิชานี้</h3><a class="link sm" href="#/admin/bundles">จัดการแพ็กเกจ →</a></div><div class="tbl"><table><tbody>' + bl.map(function (b) { return '<tr><td><b>' + esc(b.title) + '</b><div class="sub">' + b.courses.map(function (c) { return esc(c.title); }).join(' · ') + '</div></td><td class="num">' + baht(b.price) + '</td></tr>'; }).join('') + '</tbody></table></div>' : ''));
    if ($('#new-course')) $('#new-course').onclick = function () { courseModal({ subject: subj, status: 'draft', price: 790, sort_order: 0 }); };
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function courseModal(c) {
  if (!S.accs && isAdm()) return loadAccs().then(function () { courseModal(c); }).catch(function (e) { toast(e.message, true); });
  if (!isAdm()) S.accs = S.accs || [];
  if (isAdm() && !S.tlist) return api('admin.teachers').then(function (l) { S.tlist = l; courseModal(c); }).catch(function (e) { toast(e.message, true); });
  var tids = String(c.teacher_ids || '').split(',').filter(Boolean);
  var subj = Object.keys(S.cfg.subjects).map(function (k) { return [k, S.cfg.subjects[k]]; });
  c = c || { subject: 'bio', status: 'draft', price: 790, sort_order: 0 };
  var sub = function (t, d) { return '<div class="msec"><h3>' + t + '</h3>' + (d ? '<p class="hint">' + d + '</p>' : '') + '</div>'; };
  openModal(mhead(c.course_id ? 'แก้ไขคอร์ส' : 'คอร์สใหม่') + '<form class="form" id="cf">' +
    sub('ข้อมูลหลัก') +
    (c.course_id ? '' : field('new_id', 'รหัสคอร์ส (ภาษาอังกฤษ ใช้ในลิงก์)', '', { ph: 'เช่น BIO-POSN-2027', hint: 'เว้นว่างได้ ระบบจะสร้างให้' })) +
    '<div class="row2">' + field('subject', 'วิชา', c.subject, { options: subj }) + field('level', 'ระดับ / สนามสอบ', c.level || '', { options: [['', '— ไม่ระบุ —']].concat((S.cfg.levels || []).map(function (l) { return [l, l]; })) }) + '</div><div class="row2">' + field('status', 'สถานะ', c.status, { options: [['draft', 'ฉบับร่าง (ยังไม่แสดงหน้าเว็บ)'], ['published', 'เปิดขาย']] }) + '</div>' +
    field('title', 'ชื่อคอร์ส', c.title) + field('subtitle', 'คำโปรยสั้น (แสดงบนการ์ดและใต้ชื่อคอร์ส)', c.subtitle) +
    '<div class="row2">' + field('price', 'ราคาขาย (บาท)', c.price, { mode: 'numeric' }) + field('full_price', 'ราคาเต็ม (ขีดฆ่า, ไม่ใส่ก็ได้)', c.full_price || '', { mode: 'numeric', ph: 'เช่น 1090' }) + '</div>' +
    '<div class="row2">' + field('sort_order', 'ลำดับการแสดง (น้อยขึ้นก่อน)', c.sort_order, { mode: 'numeric' }) +
    field('pay_account_id', 'บัญชีรับเงินของคอร์สนี้', c.pay_account_id || '', { options: [['', 'ตามวิชา (ตั้งที่ บัญชีรับเงิน)']].concat(S.accs.map(function (a) { return [a.account_id, a.label + (a.status === 'inactive' ? ' (ปิดใช้งาน)' : '')]; })) }) + '</div>' +
    field('cover_url', 'รูปปกคอร์ส (ไม่ใส่ก็ได้)', c.cover_url, { ph: 'https://...', upload: true }) +
    sub('สีประจำคอร์ส', 'ใช้กับหน้าคอร์ส การ์ด และหน้าเรียน ถ้าไม่เลือกจะใช้สีของวิชา') + palettePicker('cf-acc', c.accent || '', c.subject) +
    sub('หน้าแนะนำคอร์ส', 'ช่องไหนเว้นว่าง ส่วนนั้นจะไม่แสดงบนหน้าเว็บ') +
    field('trailer_youtube', 'คลิปแนะนำคอร์ส (ลิงก์ YouTube)', c.trailer_youtube ? 'https://youtu.be/' + c.trailer_youtube : '', { ph: 'https://youtu.be/...', hint: 'แสดงใต้ชื่อคอร์ส ทุกคนดูได้ ใช้คลิป Unlisted หรือ Public ก็ได้' }) +
    field('highlights', 'จุดเด่นของคอร์ส (บรรทัดละ 1 ข้อ)', c.highlights, { area: true, ph: 'ครบทุกบทตามขอบเขต สอวน.\nมีชีทสรุปทุกบท\nตะลุยข้อสอบเก่า 10 ปี' }) +
    field('audience', 'คอร์สนี้เหมาะกับ (บรรทัดละ 1 ข้อ)', c.audience, { area: true, ph: 'นักเรียน ม.3–ม.5 ที่จะสอบค่าย 1\nคนที่ยังไม่เคยเรียนชีวะเชิงลึก' }) +
    field('description', 'รายละเอียดคอร์ส', c.description, { area: true }) +
    (isAdm() ? sub('ผู้สอน', 'เลือกจากโปรไฟล์ผู้สอน ได้สูงสุด 3 คน ชื่อ รูป และประวัติดึงจากโปรไฟล์ แก้ที่โปรไฟล์ครั้งเดียว ขึ้นทุกคอร์สที่สอน') +
      '<div class="tpick">' + S.tlist.map(function (t) { return '<label class="tpk"><input type="checkbox" data-tid="' + esc(t.user_id) + '"' + (tids.indexOf(t.user_id) >= 0 ? ' checked' : '') + '>' + tAv(t.photo_url) + '<span><b>' + esc(t.display_name) + '</b><small>' + esc(t.title || '') + '</small></span></label>'; }).join('') + '</div>' : '') +
    sub(isAdm() ? 'ผู้สอนแบบพิมพ์เอง' : 'ผู้สอน', isAdm() ? 'ใช้เฉพาะเมื่อไม่ได้เลือกผู้สอนด้านบน' : '') +
    '<div class="row2">' + field('instructor_name', 'ชื่อผู้สอน', c.instructor_name, { ph: 'เช่น พี่พร้อม' }) + field('instructor_title', 'ตำแหน่ง / ผลงานสั้น ๆ', c.instructor_title, { ph: 'เช่น อดีตผู้แทนค่าย สอวน.' }) + '</div>' +
    field('instructor_bio', 'ประวัติผู้สอน (บรรทัดละ 1 ข้อ จะแสดงเป็นรายการ)', c.instructor_bio, { area: true, ph: 'จบจากโรงเรียน...\nค่าย 1 โอลิมปิกวิชาการ สาขา...\nปัจจุบัน...' }) + field('instructor_photo', 'รูปผู้สอน (ไม่ใส่ก็ได้)', c.instructor_photo, { ph: 'https://...', upload: true }) +
    sub('ผู้สอนคนที่ 2', 'ใส่เมื่อคอร์สนี้สอนร่วมกัน 2 คน เว้นว่างถ้ามีผู้สอนคนเดียว') +
    '<div class="row2">' + field('instructor2_name', 'ชื่อผู้สอน', c.instructor2_name, { ph: 'เช่น พี่น้ำแข็ง' }) + field('instructor2_title', 'ตำแหน่ง / ผลงานสั้น ๆ', c.instructor2_title) + '</div>' +
    field('instructor2_bio', 'ประวัติผู้สอน (บรรทัดละ 1 ข้อ)', c.instructor2_bio, { area: true }) + field('instructor2_photo', 'รูปผู้สอน (ไม่ใส่ก็ได้)', c.instructor2_photo, { ph: 'https://...', upload: true }) +
    sub('คำถามที่พบบ่อย', 'แต่ละข้อเว้น 1 บรรทัดว่าง บรรทัดแรกเป็นคำถาม บรรทัดต่อไปเป็นคำตอบ ระบบจะเติมคำถามพื้นฐาน (ดูได้นานแค่ไหน, กี่เครื่อง, อนุมัติเมื่อไร) ต่อท้ายให้เอง') +
    field('faq', 'คำถามเฉพาะคอร์สนี้', c.faq, { area: true, ph: 'ต้องมีพื้นฐานอะไรก่อนไหม\nไม่ต้อง คอร์สเริ่มจากพื้นฐาน\n\nมีแบบฝึกหัดไหม\nมีท้ายทุกบท' }) +
    '<p class="err" id="cf-err" hidden></p><div class="rowx"><button class="pill">บันทึกคอร์ส</button>' + (c.course_id ? '<span class="hint">หน้าเว็บอัปเดตภายในไม่กี่นาที</span>' : '') + '</div></form>', true);
  $$('#cf textarea').forEach(function (t) { t.style.minHeight = '92px'; });
  bindPalette('cf-acc', c.subject);
  if (!isAdm()) {
    ['subject', 'sort_order', 'pay_account_id'].forEach(function (k) { var el = $('#f-' + k); if (el) { el.disabled = true; el.title = 'แอดมินเป็นคนเปลี่ยน'; } });
    var pend = c.pending_change ? (function () { try { return JSON.parse(c.pending_change); } catch (e) { return {}; } })() : null;
    ['status', 'price', 'full_price'].forEach(function (k) { var el = $('#f-' + k); if (el) { el.name = 'req_' + k; if (pend && pend[k] != null) el.value = pend[k]; } });
    var ph = $('#f-price'); if (ph) ph.closest('.row2').insertAdjacentHTML('afterend', '<div class="note ' + (pend ? 'wait' : 'plain') + '">' + (pend ? 'มีคำขอเปลี่ยนราคา/สถานะรอแอดมินอนุมัติอยู่ ' : '') + 'เปลี่ยนราคาหรือสถานะแล้วกดบันทึก จะส่งเป็นคำขอให้แอดมินอนุมัติก่อน ส่วนอื่นเปลี่ยนทันที</div>');
    var h = $('#cf .msec'); if (h) h.insertAdjacentHTML('afterend', '<div class="note plain">วิชา ลำดับ และบัญชีรับเงิน แอดมินเป็นคนเปลี่ยน ถ้าต้องการปรับ ทักแอดมิน</div>');
  }
  submitForm('#cf', 'admin.course.save', '#cf-err', function (r) { closeModal(); toast('บันทึกคอร์สแล้ว'); if (location.hash === '#/admin/course/' + r.course_id) viewAdmin('course', r.course_id); else go('/admin/course/' + r.course_id); }, function () { var o = c.course_id ? { course_id: c.course_id } : {}; if (isAdm()) o.teacher_ids = $$('[data-tid]').filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.tid; }); return o; });
  $$('[data-tid]').forEach(function (x) { x.onchange = function () { if ($$('[data-tid]').filter(function (y) { return y.checked; }).length > 3) { x.checked = false; toast('เลือกผู้สอนได้สูงสุด 3 คน', true); } }; });
}
function aCourse(shell, cid) {
  var tab = S.ctab && S.ctabCid === cid ? S.ctab : 'lessons';
  Promise.all([api('admin.courses'), tab === 'lessons' ? api('admin.lessons', { course_id: cid }) : Promise.resolve(null)]).then(function (r) {
    var c = r[0].filter(function (x) { return x.course_id === cid; })[0];
    if (!c) return shell('<p class="err">ไม่พบคอร์ส หรือคอร์สนี้ไม่ได้อยู่ในวิชาที่คุณดูแล</p>');
    setSubj(c.subject, c.accent);
    var head = '<div class="crumb"><a href="#/admin/courses">' + (isAdm() ? 'คอร์สและบทเรียน' : 'คอร์สของฉัน') + '</a><span>›</span><a href="#/admin/courses/' + esc(c.subject) + '">' + esc(c.subject_name) + '</a><span>›</span><b>' + esc(c.title) + '</b></div><div class="spread"><div class="stack" style="gap:4px"><span class="mono">' + esc(c.subject_name) + ' · ' + esc(c.course_id) + '</span><h1>' + esc(c.title) + '</h1><span class="sm ink2">' + (c.status === 'published' ? 'เปิดขาย' : 'ฉบับร่าง') + ' · ' + baht(c.price) + ' · นักเรียน ' + c.students + ' คน</span></div>' +
      '<div class="rowx"><a class="pill quiet s" href="#/course/' + encodeURIComponent(cid) + '">ดูหน้าขาย</a><a class="pill quiet s" href="#/learn/' + encodeURIComponent(cid) + '">ดูแบบนักเรียน</a><button class="pill ghost s" id="edit-course">แก้ไขข้อมูลและหน้าแนะนำ</button></div></div>' +
      '<div class="seg" role="tablist">' + [['lessons', 'ตอนเรียน'], ['students', 'นักเรียนในคอร์ส · ' + c.students], ['playlists', 'ดึงคลิปจากเพลย์ลิสต์' + (c.playlists && c.playlists.length ? ' · ' + c.playlists.length : '')]].map(function (t) { return '<button role="tab" data-ctab="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var bindHead = function () {
      $('#edit-course').onclick = function () { courseModal(Object.assign({}, c, { description: c.description })); };
      var pend = c.pending_change ? (function () { try { return JSON.parse(c.pending_change); } catch (e) { return null; } })() : null, seg = $('#amain [data-ctab]');
      if (pend && seg && !$('#creq')) {
        var what = [pend.price != null ? 'ราคา ' + baht(c.price) + ' → ' + baht(Number(pend.price)) : '', pend.full_price != null ? 'ราคาเต็ม → ' + (pend.full_price ? baht(Number(pend.full_price)) : 'ไม่แสดง') : '', pend.status ? 'สถานะ → ' + (pend.status === 'published' ? 'เปิดขาย' : 'ฉบับร่าง') : ''].filter(String).join(' · ');
        seg.parentNode.insertAdjacentHTML('beforebegin', '<div class="note wait spread" id="creq"><span><b>คำขอจากผู้สอน</b> ' + esc(what) + (pend.at ? ' <span class="sub" style="display:inline">· ' + thDate(pend.at, true) + '</span>' : '') + '</span>' + (isAdm() ? '<span class="rowx"><button class="pill s" data-creq="approve">อนุมัติ</button><button class="pill quiet s" data-creq="reject">ไม่อนุมัติ</button></span>' : '<span class="sub">รอแอดมินอนุมัติ</span>') + '</div>');
        $$('[data-creq]').forEach(function (b) { b.onclick = function () { busy(b, true); api('admin.course.request', { course_id: cid, decision: b.dataset.creq }).then(function () { toast(b.dataset.creq === 'approve' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติแล้ว'); viewAdmin('course', cid); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
      }
      $$('[data-ctab]').forEach(function (b) { b.onclick = function () { S.ctab = b.dataset.ctab; S.ctabCid = cid; viewAdmin('course', cid); }; });
    };
    if (tab === 'students') return courseStudentsTab(shell, c, head, bindHead);
    if (tab === 'playlists') return playlistTab(shell, c, head, bindHead);
    var ls = r[1], chapters = [];
    ls.forEach(function (l) { if (chapters.indexOf(l.chapter) < 0) chapters.push(l.chapter); });
    S.alessons = ls; S.achapters = chapters;
    var hid = ls.filter(function (l) { return l.hidden; }).length;
    shell(head +
      '<div class="card form" id="lesson-form-wrap"></div>' +
      '<div class="spread"><h3 style="font-size:17px">ลำดับตอน · ' + (ls.length - hid) + ' ตอน' + (hid ? ' <span class="badge b-soft">ซ่อน ' + hid + '</span>' : '') + '</h3><div class="rowx"><span class="hint">ลาก ⋮⋮ เพื่อเรียงใหม่ ระบบบันทึกให้เอง</span><button class="pill ghost s" id="bulk-btn">+ วางหลายตอนพร้อมกัน</button></div></div>' +
      (ls.length ? '<div class="list" id="llist">' + chapters.map(function (ch) {
        var items = ls.filter(function (l) { return l.chapter === ch; });
        return '<div class="li cap"><span class="rowx" style="gap:8px;min-width:0"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">' + esc(ch) + '</span><button type="button" class="capedit" data-chren="' + esc(ch) + '" title="เปลี่ยนชื่อบท" aria-label="เปลี่ยนชื่อบท ' + esc(ch) + '">✎ เปลี่ยนชื่อ</button></span><span class="hint">' + items.length + ' ตอน</span></div>' + items.map(function (l) {
          return '<div class="li' + (l.hidden ? ' hid' : '') + '" draggable="true" data-lid="' + l.lesson_id + '"><span class="h" aria-hidden="true">⋮⋮</span><span class="t">' + esc(l.title) + (l.is_preview ? ' <span class="badge b-inv">ดูฟรี</span>' : '') + (l.from_playlist ? ' <span class="badge b-soft" title="ดึงมาจากเพลย์ลิสต์อัตโนมัติ">อัตโนมัติ</span>' : '') + (l.hidden ? ' <span class="badge b-wait" title="คลิปถูกเอาออกจากเพลย์ลิสต์ นักเรียนจึงไม่เห็นตอนนี้">ซ่อน · ไม่อยู่ในเพลย์ลิสต์แล้ว</span>' : '') + '</span><span class="d">' + l.duration_min + ' นาที</span><span class="rowx" style="gap:6px"><button class="pill quiet s" data-files="' + l.lesson_id + '">ไฟล์' + (l.files && l.files.length ? ' · ' + l.files.length : '') + '</button><button class="pill quiet s" data-edit="' + l.lesson_id + '">แก้ไข</button></span></div>';
        }).join('');
      }).join('') + '</div>' : '<div class="empty"><p>ยังไม่มีตอน เพิ่มตอนแรกจากฟอร์มด้านบน หรือผูกเพลย์ลิสต์ให้ระบบดึงคลิปให้เอง</p></div>'));
    bindHead();
    $('#bulk-btn').onclick = function () { bulkModal(cid, chapters[chapters.length - 1] || ''); };
    lessonForm(cid, null);
    $$('[data-edit]').forEach(function (b) { b.onclick = function () { lessonForm(cid, ls.filter(function (l) { return l.lesson_id === b.dataset.edit; })[0]); $('#lesson-form-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    $$('[data-files]').forEach(function (b) { b.onclick = function () { filesModal(cid, ls.filter(function (l) { return l.lesson_id === b.dataset.files; })[0]); }; });
    $$('[data-chren]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); chapterModal(cid, b.dataset.chren); }; });
    bindDrag(cid);
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function chapterModal(cid, ch) {
  openModal(mhead('เปลี่ยนชื่อบท', 'ทุกตอนในบทนี้จะย้ายไปอยู่ใต้ชื่อใหม่ นักเรียนเห็นชื่อใหม่ทันที') + '<form class="form" id="chf">' +
    field('to', 'ชื่อบท', ch, { hint: 'ใช้ " › " แบ่งหมวดใหญ่กับบทย่อย เช่น เล่มที่ 1 Fundamentum Vitae › เซลล์ ถ้าตั้งชื่อซ้ำกับบทที่มีอยู่ ตอนจะรวมเข้าบทเดียวกัน' }) +
    '<p class="err" id="chf-err" hidden></p><button class="pill">บันทึกชื่อบท</button></form>');
  var inp = $('#f-to'); setTimeout(function () { inp.focus(); inp.select(); }, 40);
  submitForm('#chf', 'staff.chapter.rename', '#chf-err', function (r) { closeModal(); toast('เปลี่ยนชื่อบทแล้ว (' + r.renamed + ' ตอน)'); viewAdmin('course', cid); }, function () { return { course_id: cid, from: ch }; });
}
function filesModal(cid, l) {
  var list = l.files || [], changed = false;
  var draw = function () {
    openModal(mhead('ไฟล์ประกอบ · ' + esc(l.title), 'เห็นและเปิดได้เฉพาะนักเรียนที่มีสิทธิ์เรียนคอร์สนี้ คนที่ยังไม่ซื้อจะไม่เห็นไฟล์ แม้ตอนนี้จะเป็นตอนดูฟรี') +
      (list.length ? '<div class="list">' + list.map(function (f) { return '<div class="li" style="grid-template-columns:auto minmax(0,1fr) auto auto"><span class="badge b-soft">' + esc(fileTag(f)) + '</span><span class="t">' + esc(f.name) + '</span><span class="d">' + (f.size ? fmtSize(f.size) : f.url ? 'ลิงก์' : '') + '</span><span class="rowx" style="gap:6px"><button class="pill quiet s" data-fopen="' + esc(f.fid) + '">เปิด</button><button class="pill quiet s" data-fdel="' + esc(f.fid) + '">ลบ</button></span></div>'; }).join('') + '</div>' : '<p class="note plain">ยังไม่มีไฟล์ในตอนนี้</p>') +
      '<form class="form" id="ff"><div class="msec"><h3>อัปโหลดไฟล์</h3><p class="hint">PDF, Word, PowerPoint, Excel, รูป หรือ ZIP ไฟล์ละไม่เกิน 10 MB เลือกหลายไฟล์พร้อมกันได้</p></div>' +
      '<input class="i" type="file" id="ff-file" multiple aria-label="เลือกไฟล์">' + '<p class="err" id="ff-err" hidden></p><div class="rowx"><button class="pill s" id="ff-go">อัปโหลด</button></div></form>' +
      '<form class="form" id="fl"><div class="msec"><h3>หรือแนบลิงก์</h3><p class="hint">เช่น Google Drive หรือ Canva ลิงก์ที่ตั้งเป็น "ทุกคนที่มีลิงก์" ถ้าหลุดออกไป คนอื่นก็เปิดได้ ไฟล์ที่อัปโหลดด้านบนปลอดภัยกว่า</p></div><div class="row2">' +
      field('fl_name', 'ชื่อที่แสดง', '', { ph: 'เช่น ชีทสรุปบทที่ 1' }) + field('fl_url', 'ลิงก์', '', { ph: 'https://' }) + '</div><div class="rowx"><button class="pill quiet s">เพิ่มลิงก์</button></div></form>', true, function () { if (changed) viewAdmin('course', cid); });
    $$('[data-fopen]').forEach(function (b) { b.onclick = function () { openLessonFile(l.lesson_id, b.dataset.fopen, b); }; });
    $$('[data-fdel]').forEach(function (b) { b.onclick = function () { busy(b, true); api('staff.lesson.file.delete', { lesson_id: l.lesson_id, fid: b.dataset.fdel }).then(function () { list = list.filter(function (f) { return f.fid !== b.dataset.fdel; }); l.files = list; changed = true; toast('ลบไฟล์แล้ว'); S.modalClose = null; draw(); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
    $('#ff').onsubmit = function (e) {
      e.preventDefault(); var fs = [].slice.call($('#ff-file').files), btn = $('#ff-go'), er = $('#ff-err'); er.hidden = true;
      if (!fs.length) { er.textContent = 'เลือกไฟล์ก่อน'; er.hidden = false; return; }
      var big = fs.filter(function (f) { return f.size > 10 * 1048576; })[0];
      if (big) { er.textContent = big.name + ' ใหญ่เกิน 10 MB'; er.hidden = false; return; }
      busy(btn, true);
      var next = function (i) {
        if (i >= fs.length) { busy(btn, false); changed = true; toast('อัปโหลดแล้ว ' + fs.length + ' ไฟล์'); S.modalClose = null; draw(); return; }
        var rd = new FileReader();
        rd.onload = function () { api('staff.lesson.file.add', { lesson_id: l.lesson_id, name: fs[i].name, mime: fs[i].type, base64: String(rd.result).split(',')[1] }).then(function (r) { list = r; l.files = r; next(i + 1); }).catch(function (x) { busy(btn, false); er.textContent = fs[i].name + ': ' + x.message; er.hidden = false; }); };
        rd.onerror = function () { busy(btn, false); er.textContent = 'อ่านไฟล์ไม่ได้'; er.hidden = false; };
        rd.readAsDataURL(fs[i]);
      };
      next(0);
    };
    $('#fl').onsubmit = function (e) {
      e.preventDefault(); var b = $('#fl button'); busy(b, true);
      api('staff.lesson.file.add', { lesson_id: l.lesson_id, name: $('#f-fl_name').value, url: $('#f-fl_url').value.trim() }).then(function (r) { list = r; l.files = r; changed = true; toast('เพิ่มลิงก์แล้ว'); S.modalClose = null; draw(); }).catch(function (x) { busy(b, false); toast(x.message, true); });
    };
  };
  draw();
}
var SRC_BADGE = { bill: 'b-ok', manual: 'b-ok', grant: 'b-inv', test: 'b-soft', legacy: 'b-wait', request: 'b-ok' };
function courseStudentsTab(shell, c, head, bindHead) {
  api('staff.course.students', { course_id: c.course_id }).then(function (list) {
    var q = (S.csq || '').trim().toLowerCase(), adm = isAdm();
    var rows = list.filter(function (r) { return !q || [r.name, r.nickname, r.email].join(' ').toLowerCase().indexOf(q) >= 0; });
    var active = list.filter(function (r) { return r.status === 'approved'; }).length;
    shell(head +
      '<form class="card form" id="cg"><h3 style="font-size:17px">ให้สิทธิ์เข้าเรียนคอร์สนี้</h3><p class="hint">ให้ฟรี (ทุนเรียน ผู้ช่วยสอน รางวัล) หรือใส่อีเมลตัวเองเพื่อทดลองเรียนแบบนักเรียนจริง ระบบไม่นับเป็นรายรับ' + (adm ? ' ถ้ารับเงินผ่านช่องทางอื่น ใส่ยอดที่รับได้' : '') + ' นักเรียนต้องสมัครสมาชิกก่อน</p>' +
      field('emails', 'อีเมลของนักเรียน (หลายคนได้ คั่นด้วยเว้นวรรคหรือขึ้นบรรทัดใหม่)', '', { area: true }) +
      '<div class="row2">' + field('note', 'เหตุผล', '', { ph: 'เช่น ทุนเรียน, ผู้ช่วยสอน' }) + field('expires_at', 'หมดสิทธิ์วันที่ (ไม่ใส่ = ตลอดชีพ)', '', { type: 'date' }) + '</div>' +
      (adm ? field('amount', 'ยอดที่รับ (บาท) ใส่เมื่อรับเงินช่องทางอื่น', '', { mode: 'numeric', ph: '0' }) : '') +
      '<p class="err" id="cg-err" hidden></p><div class="rowx"><button class="pill s">ให้สิทธิ์</button></div></form>' +
      '<div class="spread"><h3 style="font-size:17px">นักเรียน ' + active + ' คน' + (list.length > active ? ' <span class="sm muted">· ถอน/หมดอายุ ' + (list.length - active) + '</span>' : '') + '</h3><form id="csqf"><input class="i" id="csq" style="width:220px" placeholder="ค้นหาชื่อ" value="' + esc(S.csq || '') + '"></form></div>' +
      (rows.length ? '<div class="tbl"><table style="min-width:720px"><thead><tr><th>นักเรียน</th><th>ที่มาของสิทธิ์</th><th>ความคืบหน้า</th><th>ตั้งแต่</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
        var st = r.status === 'approved' ? '' : r.status === 'revoked' ? ' <span class="badge b-no">ถอนแล้ว</span>' : r.status === 'expired' ? ' <span class="badge b-soft">หมดอายุ</span>' : ' <span class="badge b-wait">' + esc(r.status) + '</span>';
        return '<tr' + (r.status === 'approved' ? '' : ' style="opacity:.6"') + '><td>' + esc(r.name) + ' (' + esc(r.nickname) + ')' + st + (r.email ? '<div class="sub">' + esc(r.email) + '</div>' : '') + '</td>' +
          '<td><span class="badge ' + (SRC_BADGE[r.source] || 'b-soft') + '">' + esc(r.source_label) + '</span>' + (r.amount ? ' <span class="sm">' + baht(r.amount) + '</span>' : '') + (r.reason ? '<div class="sub">' + esc(r.reason) + '</div>' : '') + (r.granted_by ? '<div class="sub">โดย ' + esc(r.granted_by) + '</div>' : '') + '</td>' +
          '<td style="min-width:130px"><div class="bar"><i style="width:' + r.percent + '%"></i></div><span class="sub">' + r.done + ' ตอน · ' + r.percent + '%</span></td>' +
          '<td class="sub">' + thDate(r.since) + (r.expires_at ? '<br>ถึง ' + thDate(r.expires_at) : '') + '</td>' +
          '<td>' + (r.can_revoke ? '<button class="pill quiet s" data-rv="' + esc(r.enroll_id) + '" data-n="' + esc(r.nickname) + '">ถอนสิทธิ์</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>' + (q ? 'ไม่พบชื่อนี้' : 'ยังไม่มีนักเรียนในคอร์สนี้') + '</p></div>'));
    bindHead();
    $('#csqf').onsubmit = function (e) { e.preventDefault(); S.csq = $('#csq').value; viewAdmin('course', c.course_id); };
    submitForm('#cg', 'admin.grant', '#cg-err', function (r) {
      toast('ให้สิทธิ์ ' + r.added.length + ' คน' + (r.skipped.length ? ' · ข้าม ' + r.skipped.map(function (x) { return x.email + ' (' + x.why + ')'; }).join(', ') : ''), !r.added.length);
      viewAdmin('course', c.course_id);
    }, function () { return { course_id: c.course_id }; });
    $$('[data-rv]').forEach(function (b) {
      b.onclick = function () {
        confirmBox('ถอนสิทธิ์ของ ' + b.dataset.n + '?', 'น้องจะเข้าห้องเรียนคอร์สนี้ไม่ได้ทันที ความคืบหน้ายังเก็บไว้ ให้สิทธิ์ใหม่ภายหลังก็เรียนต่อได้', 'ถอนสิทธิ์', true).then(function (y) {
          if (!y) return; api('staff.revoke', { enroll_id: b.dataset.rv }).then(function () { toast('ถอนสิทธิ์แล้ว'); viewAdmin('course', c.course_id); }).catch(function (e) { toast(e.message, true); });
        });
      };
    });
  }).catch(function (e) { shell(head + '<p class="err">' + esc(e.message) + '</p>'); bindHead(); });
}
function playlistTab(shell, c, head, bindHead) {
  var pls = (c.playlists || []).slice();
  if (!pls.length) pls.push({ id: '', chapter: '', strip: '' });
  var row = function (p, i) {
    return '<div class="plrow" data-i="' + i + '">' + field('pl_url_' + i, 'ลิงก์เพลย์ลิสต์', p.id ? 'https://www.youtube.com/playlist?list=' + p.id : '', { ph: 'https://www.youtube.com/playlist?list=PL...' }) +
      '<div class="row2">' + field('pl_ch_' + i, 'ตอนใหม่ใส่ในบท', p.chapter, { ph: 'ว่าง = บทสุดท้ายของคอร์ส', hint: 'ใช้ชื่อบทเดิมได้ เช่น ตะลุยโจทย์ › ชุดที่ 1' }) + field('pl_st_' + i, 'คำที่ตัดออกจากชื่อคลิป (ไม่ใส่ก็ได้)', p.strip, { ph: 'เช่น สอวน.เคมี' }) + '</div>' +
      (p.last_sync ? '<span class="hint">' + esc(p.title || p.id) + ' · มี ' + (p.last_count || 0) + ' คลิป · เช็กล่าสุด ' + thDate(p.last_sync, true) + '</span>' : '') +
      '<button type="button" class="link sm" data-pldel="' + i + '" style="justify-self:start">ลบเพลย์ลิสต์นี้</button></div>';
  };
  shell(head +
    '<div class="note plain">ผูกเพลย์ลิสต์ YouTube ไว้กับคอร์สนี้ ระบบเช็กทุก 15 นาที เจอคลิปใหม่จะเพิ่มเป็นตอนใหม่ให้เอง (ชื่อตอน ความยาว ลำดับ) และส่งอีเมลแจ้งผู้สอน คลิปที่ถูกเอาออกจากเพลย์ลิสต์จะถูกซ่อน ไม่ลบ ความคืบหน้าของน้องยังอยู่ ตอนที่มีอยู่แล้ว (คลิปเดียวกัน) จะไม่ถูกเพิ่มซ้ำ</div>' +
    '<form class="card form" id="plf"><div class="stack" id="plrows" style="gap:18px">' + pls.map(row).join('') + '</div>' +
    '<button type="button" class="pill quiet s" id="pladd" style="justify-self:start">+ เพิ่มอีกเพลย์ลิสต์</button>' +
    '<p class="err" id="plf-err" hidden></p><div class="rowx"><button class="pill s">บันทึก</button><button type="button" class="pill ghost s" id="plsync"' + (c.playlists && c.playlists.length ? '' : ' disabled') + '>ซิงก์ตอนนี้</button></div></form>' +
    '<div id="plres"></div>');
  bindHead();
  var collect = function () {
    return $$('.plrow').map(function (el) { var i = el.dataset.i; return { url: $('#f-pl_url_' + i).value.trim(), chapter: $('#f-pl_ch_' + i).value.trim(), strip: $('#f-pl_st_' + i).value.trim() }; }).filter(function (x) { return x.url; });
  };
  $('#pladd').onclick = function () { var n = $$('.plrow').length + Date.now() % 1000; $('#plrows').insertAdjacentHTML('beforeend', row({ id: '', chapter: '', strip: '' }, n)); bindDel(); };
  var bindDel = function () { $$('[data-pldel]').forEach(function (b) { b.onclick = function () { var r0 = b.closest('.plrow'); if (r0) r0.remove(); }; }); };
  bindDel();
  $('#plf').onsubmit = function (e) {
    e.preventDefault(); var btn = $('#plf button:not([type=button])'), er = $('#plf-err'); er.hidden = true; busy(btn, true);
    api('staff.playlists.save', { course_id: c.course_id, playlists: collect() }).then(function () { busy(btn, false); toast('บันทึกเพลย์ลิสต์แล้ว'); viewAdmin('course', c.course_id); })
      .catch(function (x) { busy(btn, false); er.textContent = x.message; er.hidden = false; });
  };
  $('#plsync').onclick = function () {
    var b = this; busy(b, true);
    api('staff.course.sync', { course_id: c.course_id }).then(function (r) {
      busy(b, false);
      $('#plres').innerHTML = '<div class="note ' + (r.added ? 'ok' : 'plain') + '">' + (r.added ? 'เพิ่มตอนใหม่ ' + r.added + ' ตอน: ' + r.titles.map(esc).join(', ') : 'ไม่มีคลิปใหม่') + (r.hidden ? ' · ซ่อน ' + r.hidden + ' ตอนที่ถูกเอาออกจากเพลย์ลิสต์' : '') + (r.restored ? ' · แสดงกลับ ' + r.restored + ' ตอน' : '') + '</div>';
    }).catch(function (x) { busy(b, false); toast(x.message, true); });
  };
}
/** แปลงข้อความเป็นรายการตอน: บรรทัด "# ชื่อบท" ตั้งบท แล้วตามด้วย "ชื่อตอน | ลิงก์ | นาที | ดูฟรี" */
function parseBulk(text, chap) {
  var out = [], errs = [];
  String(text || '').split(/\r?\n/).forEach(function (raw, i) {
    var l = raw.trim(); if (!l) return;
    if (/^#/.test(l)) { chap = l.replace(/^#+\s*/, ''); return; }
    var p = l.split(/\s*\|\s*|\t/).map(function (x) { return x.trim(); });
    var urlIdx = p.findIndex(function (x) { return ytId(x); });
    if (urlIdx < 0) { errs.push('บรรทัด ' + (i + 1) + ': ไม่เจอลิงก์ YouTube'); return; }
    var title = p.slice(0, urlIdx).join(' ').trim(), rest = p.slice(urlIdx + 1);
    var mins = rest.filter(function (x) { return /^\d+(\.\d+)?$/.test(x); })[0] || (rest.filter(function (x) { return /^\d+:\d{2}(:\d{2})?$/.test(x); }).map(function (x) { var a = x.split(':').map(Number); return a.length === 3 ? a[0] * 60 + a[1] + a[2] / 60 : a[0] + a[1] / 60; })[0]);
    if (!title) { errs.push('บรรทัด ' + (i + 1) + ': ไม่มีชื่อตอน'); return; }
    if (!chap) { errs.push('บรรทัด ' + (i + 1) + ': ยังไม่ได้ตั้งชื่อบท (ใส่ # ชื่อบท ไว้ก่อน)'); return; }
    out.push({ chapter: chap, title: title, youtube: ytId(p[urlIdx]), duration_min: Math.round(Number(mins) || 0), is_preview: rest.some(function (x) { return /ดูฟรี|preview/i.test(x); }) });
  });
  return { items: out, errs: errs };
}
function bulkModal(cid, lastChap) {
  openModal(mhead('วางหลายตอนพร้อมกัน', 'ตอนใหม่จะต่อท้ายตอนเดิม แก้ไขหรือเรียงใหม่ทีหลังได้') + '<div class="form">' +
    '<p class="hint">บรรทัดที่ขึ้นต้นด้วย <b>#</b> = ชื่อบท · บรรทัดอื่น = <b>ชื่อตอน | ลิงก์ YouTube | นาที</b> (เวลาใส่เป็นนาที หรือ 1:05:30 ก็ได้) · ต่อท้ายด้วย <b>| ดูฟรี</b> ถ้าให้ดูได้ก่อนซื้อ · แบ่งเป็นส่วนใหญ่ได้ด้วย <b>›</b> เช่น <b># เนื้อหา › เล่ม 1 · เซลล์</b></p>' +
    '<textarea class="i" id="bulk-t" style="min-height:260px;font-family:var(--mono);font-size:13px" placeholder="# บทที่ 1 เซลล์\nEP.1 โครงสร้างเซลล์ | https://youtu.be/xxxxxxxxxxx | 45 | ดูฟรี\nEP.2 การลำเลียงสาร | https://youtu.be/yyyyyyyyyyy | 1:02:10">' + (lastChap ? '# ' + esc(lastChap) + '\n' : '') + '</textarea>' +
    '<div id="bulk-prev" class="hint"></div><p class="err" id="bulk-err" hidden></p><div class="rowx"><button class="pill" id="bulk-go" disabled>เพิ่มตอน</button></div></div>', true);
  var parsed = { items: [] };
  var upd = function () {
    parsed = parseBulk($('#bulk-t').value, '');
    var chs = []; parsed.items.forEach(function (x) { if (chs.indexOf(x.chapter) < 0) chs.push(x.chapter); });
    var mins = parsed.items.reduce(function (a, x) { return a + x.duration_min; }, 0);
    $('#bulk-prev').innerHTML = parsed.items.length ? 'พร้อมเพิ่ม <b>' + parsed.items.length + ' ตอน</b> ใน ' + chs.length + ' บท · รวม ' + hm(mins) + (parsed.items.some(function (x) { return x.is_preview; }) ? ' · ดูฟรี ' + parsed.items.filter(function (x) { return x.is_preview; }).length + ' ตอน' : '') : '';
    var e = $('#bulk-err'); e.hidden = !parsed.errs.length; e.innerHTML = parsed.errs.slice(0, 5).map(esc).join('<br>') + (parsed.errs.length > 5 ? '<br>และอีก ' + (parsed.errs.length - 5) + ' บรรทัด' : '');
    $('#bulk-go').disabled = !parsed.items.length || parsed.errs.length > 0;
  };
  $('#bulk-t').oninput = upd; upd();
  $('#bulk-go').onclick = function () {
    var b = this; busy(b, true);
    api('admin.lessons.bulk', { course_id: cid, items: parsed.items }).then(function (r) { closeModal(); toast('เพิ่ม ' + r.added + ' ตอนแล้ว'); viewAdmin('course', cid); })
      .catch(function (e) { busy(b, false); $('#bulk-err').textContent = e.message; $('#bulk-err').hidden = false; });
  };
}
/** บทที่ตั้งชื่อแบบ "ส่วน › บท" จะถูกจัดกลุ่มเป็นส่วนใหญ่ เช่น ปูพื้นฐาน / เนื้อหา / ตะลุยโจทย์ */
function sections(chapters) {
  var out = [];
  chapters.forEach(function (ch) {
    var i = ch.title.indexOf(' › '), name = i < 0 ? ch.title : ch.title.slice(0, i), sub = i < 0 ? '' : ch.title.slice(i + 3);
    var last = out[out.length - 1];
    if (!last || last.name !== name) out.push(last = { name: name, chs: [] });
    last.chs.push({ ch: ch, sub: sub });
  });
  return out;
}
function hasSections(chapters) { return chapters.some(function (ch) { return ch.title.indexOf(' › ') >= 0; }); }
function ytId(u) { var s = String(u || '').trim(); if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s; var m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : ''; }
function lessonForm(cid, l) {
  var chs = S.achapters || [];
  var last = chs[chs.length - 1] || 'บทที่ 1';
  l = l || { chapter: last, title: '', youtube_id: '', duration_min: '', attachment_url: '', is_preview: false };
  var w = $('#lesson-form-wrap');
  w.innerHTML = '<form class="form" id="lf"><div class="spread"><h3 style="font-size:17px">' + (l.lesson_id ? 'แก้ไขตอน' : 'เพิ่มตอนใหม่') + '</h3>' + (l.lesson_id ? '<button type="button" class="link" id="lf-cancel">ยกเลิกการแก้ไข</button>' : '') + '</div>' +
    '<div class="row2"><label class="f" for="f-chapter">บท<input class="i" id="f-chapter" name="chapter" list="chlist" value="' + esc(l.chapter) + '" placeholder="เช่น บทที่ 2 เซลล์"><datalist id="chlist">' + chs.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist><span class="hint">เลือกบทเดิม หรือพิมพ์ชื่อบทใหม่</span></label>' +
    field('title', 'ชื่อตอน', l.title, { ph: 'เช่น 2.5 การแบ่งเซลล์' }) + '</div>' +
    field('youtube', 'ลิงก์ YouTube (ตั้งค่าคลิปเป็น Unlisted)', l.youtube_id ? 'https://youtu.be/' + l.youtube_id : '', { ph: 'https://youtu.be/...' }) + '<div id="ytp"></div>' +
    '<div class="row2">' + field('duration_min', 'ความยาว (นาที)', l.duration_min, { mode: 'numeric' }) + field('attachment_url', 'ลิงก์ไฟล์ประกอบแบบเดิม (ไม่ใส่ก็ได้)', l.attachment_url, { ph: 'https://drive.google.com/...', hint: 'แนะนำให้ใช้ปุ่ม "ไฟล์" ในรายการตอนแทน อัปโหลดได้หลายไฟล์และเปิดได้เฉพาะผู้เรียน' }) + '</div>' +
    '<label class="chk"><input type="checkbox" name="is_preview"' + (l.is_preview ? ' checked' : '') + '> ให้คนที่ยังไม่ซื้อดูตอนนี้ฟรี (ตอนตัวอย่าง)</label>' +
    '<p class="err" id="lf-err" hidden></p><div class="rowx"><button class="pill">' + (l.lesson_id ? 'บันทึกการแก้ไข' : 'เพิ่มตอน') + '</button>' + (l.lesson_id ? '<button type="button" class="pill danger" id="lf-del">ลบตอนนี้</button>' : '') + '</div></form>';
  var yt = $('#f-youtube'), prev = $('#ytp');
  var showYt = function () {
    var v = yt.value.trim(), id = ytId(v);
    prev.innerHTML = !v ? '' : id ? '<div class="ytprev"><div class="th"><img src="https://i.ytimg.com/vi/' + id + '/mqdefault.jpg" alt="" onerror="this.remove()"></div><div><div style="color:var(--ok);font-weight:500">✓ อ่านลิงก์ได้</div><div class="hint">รหัสคลิป <span style="font-family:var(--mono)">' + id + '</span> · นักเรียนจะไม่เห็นลิงก์เต็ม</div></div></div>'
      : '<div class="note no sm">ลิงก์นี้ไม่ใช่ลิงก์ YouTube ลองคัดลอกจากปุ่ม “แชร์” ใต้คลิปอีกครั้ง</div>';
  };
  yt.oninput = showYt; showYt();
  submitForm('#lf', 'admin.lesson.save', '#lf-err', function () { toast(l.lesson_id ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มตอนแล้ว'); viewAdmin('course', cid); }, function () { return l.lesson_id ? { lesson_id: l.lesson_id } : { course_id: cid }; });
  if ($('#lf-cancel')) $('#lf-cancel').onclick = function () { lessonForm(cid, null); };
  if ($('#lf-del')) $('#lf-del').onclick = function () {
    confirmBox('ลบตอนนี้?', 'ตอน “' + l.title + '” จะหายจากคอร์ส ความคืบหน้าของนักเรียนในตอนนี้จะไม่ถูกนับ', 'ลบตอน', true).then(function (y) {
      if (!y) return; api('admin.lesson.delete', { lesson_id: l.lesson_id }).then(function () { toast('ลบตอนแล้ว'); viewAdmin('course', cid); }).catch(function (e) { toast(e.message, true); });
    });
  };
}
function bindDrag(cid) {
  var list = $('#llist'); if (!list) return;
  var dragEl = null;
  $$('.li[data-lid]', list).forEach(function (el) {
    el.addEventListener('dragstart', function (e) { dragEl = el; el.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', el.dataset.lid); } catch (x) {} });
    el.addEventListener('dragend', function () { el.classList.remove('drag'); $$('.over', list).forEach(function (o) { o.classList.remove('over'); }); });
    el.addEventListener('dragover', function (e) { if (!dragEl || dragEl === el) return; e.preventDefault(); $$('.over', list).forEach(function (o) { o.classList.remove('over'); }); el.classList.add('over'); });
    el.addEventListener('drop', function (e) {
      e.preventDefault(); if (!dragEl || dragEl === el) return;
      list.insertBefore(dragEl, el); el.classList.remove('over');
      var ls = S.alessons, moved = ls.filter(function (l) { return l.lesson_id === dragEl.dataset.lid; })[0], target = ls.filter(function (l) { return l.lesson_id === el.dataset.lid; })[0];
      var order = $$('.li[data-lid]', list).map(function (x) { return x.dataset.lid; });
      var p = Promise.resolve();
      if (moved.chapter !== target.chapter) {
        moved.chapter = target.chapter;
        p = api('admin.lesson.save', { lesson_id: moved.lesson_id, chapter: target.chapter, title: moved.title, youtube: moved.youtube_id, duration_min: moved.duration_min, attachment_url: moved.attachment_url, is_preview: moved.is_preview });
      }
      p.then(function () { return api('admin.lessons.reorder', { course_id: cid, order: order }); })
        .then(function () { toast('บันทึกลำดับใหม่แล้ว'); viewAdmin('course', cid); }).catch(function (x) { toast(x.message, true); });
    });
  });
}

function aResults(shell) {
  api('admin.results').then(function (list) {
    var subs = S.cfg.subjects || {};
    S.aresults = list;
    shell('<div class="spread"><h1>ผลงานนักเรียน</h1><button class="pill s" id="new-res">+ เพิ่มน้อง</button></div><p class="ink2 sm">น้องที่ติดค่ายจะขึ้นในส่วน "Hall of fame" บนหน้าแรก หน้า "ผลงานน้องๆ" และรีวิวจะขึ้นในหน้าคอร์สวิชาเดียวกัน</p>' +
      (list.length ? '<div class="tbl"><table style="min-width:640px"><thead><tr><th></th><th>ชื่อเล่น</th><th>สาขา · ปี</th><th>ศูนย์</th><th>รีวิว</th><th></th></tr></thead><tbody>' + list.map(function (r) {
        return '<tr><td style="width:56px">' + stuPhoto(r, 'tb-ph') + '</td><td>' + esc(r.nickname) + (r.status === 'hidden' ? ' <span class="badge b-soft">ซ่อน</span>' : '') + '<div class="sub">' + esc(r.school) + '</div></td><td>' + esc(subs[r.subject] || r.subject) + '<div class="sub">' + esc(r.year) + '</div></td><td class="sm">' + esc(r.center || '–') + '</td><td class="sm">' + (r.review ? 'มี' : '<span class="sub">ไม่มี</span>') + '</td><td><div class="acts"><button class="pill quiet s" data-eres="' + r.result_id + '">แก้ไข</button></div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>ยังไม่มีข้อมูล เพิ่มน้องคนแรกได้เลย</p></div>'));
    $('#new-res').onclick = function () { resultModal(null); };
    $$('[data-eres]').forEach(function (b) { b.onclick = function () { resultModal(list.filter(function (r) { return r.result_id === b.dataset.eres; })[0]); }; });
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function resultModal(r) {
  var subs = S.cfg.subjects || {};
  r = r || { year: String(new Date().getFullYear() + 543), subject: 'bio', status: 'published', sort_order: 0 };
  openModal(mhead(r.result_id ? 'แก้ไขข้อมูลน้อง' : 'เพิ่มน้องที่ติดค่าย') + '<form class="form" id="rf">' +
    '<div class="row2">' + field('nickname', 'ชื่อเล่น (แสดงบนเว็บ)', r.nickname) + field('year', 'ปี พ.ศ.', r.year, { mode: 'numeric' }) + '</div>' +
    '<div class="row2">' + field('subject', 'สาขาที่ติด', r.subject, { options: Object.keys(subs).map(function (k) { return [k, subs[k]]; }) }) + field('status', 'การแสดงผล', r.status, { options: [['published', 'แสดงบนเว็บ'], ['hidden', 'ซ่อน']] }) + '</div>' +
    field('school', 'โรงเรียน', r.school) + field('center', 'ศูนย์ สอวน.', r.center, { ph: 'เช่น ศูนย์มหาวิทยาลัยศิลปากร' }) +
    field('review', 'รีวิวจากน้อง (เว้นว่างได้)', r.review, { area: true }) +
    field('photo_url', 'รูปน้อง', r.photo_url, { upload: true, ph: 'https://... หรือกดอัปโหลดรูป' }) +
    field('sort_order', 'ลำดับการแสดง (น้อยขึ้นก่อน)', r.sort_order, { mode: 'numeric' }) +
    '<p class="hint">ขออนุญาตน้องก่อนใช้รูปและรีวิวบนเว็บ บนเว็บจะแสดงแค่ชื่อเล่น โรงเรียน และศูนย์</p>' +
    '<p class="err" id="rf-err" hidden></p><div class="rowx"><button class="pill">บันทึก</button>' + (r.result_id ? '<button type="button" class="pill danger" id="rf-del">ลบ</button>' : '') + '</div></form>', true);
  submitForm('#rf', 'admin.result.save', '#rf-err', function () { S.results = null; closeModal(); toast('บันทึกแล้ว'); viewAdmin('results'); }, function () { return r.result_id ? { result_id: r.result_id } : {}; });
  if ($('#rf-del')) $('#rf-del').onclick = function () {
    confirmBox('ลบ ' + r.nickname + '?', 'ข้อมูลและรีวิวของน้องจะหายจากเว็บ', 'ลบ', true).then(function (y) {
      if (!y) return; api('admin.result.delete', { result_id: r.result_id }).then(function () { S.results = null; toast('ลบแล้ว'); viewAdmin('results'); }).catch(function (e) { toast(e.message, true); });
    });
  };
}
function aUsers(shell) {
  var q = S.uq || '';
  api('admin.users', { q: q }).then(function (us) {
    S.ulist = us;
    shell('<h1>ผู้ใช้และยศ</h1><p class="ink2 sm">ตั้งผู้สอนได้ที่ปุ่ม "ยศ" ผู้สอนเห็นเฉพาะวิชาที่เลือก</p><form id="uqf" class="rowx"><input class="i" id="uq" name="q" style="max-width:360px" placeholder="ค้นหาชื่อ อีเมล เบอร์ หรือโรงเรียน" value="' + esc(q) + '"><button class="pill ghost s">ค้นหา</button></form>' +
      (us.length ? '<div class="tbl"><table style="min-width:760px"><thead><tr><th>ชื่อ</th><th>โรงเรียน</th><th>คอร์สที่มีสิทธิ์</th><th>อุปกรณ์ที่ใช้อยู่</th><th></th></tr></thead><tbody>' + us.map(function (u) {
        return '<tr><td><div class="urow">' + (u.has_photo ? '<button class="pav s" data-ph="' + esc(u.user_id) + '" data-n="' + esc(u.nickname) + '" title="ดูรูป">' + uAv(u.user_id, true) + '</button>' : '<span class="pav s" title="ยังไม่มีรูป">' + uAv('', false) + '</span>') + '<div>' + esc(u.first_name + ' ' + u.last_name) + ' (' + esc(u.nickname) + ')' + (u.is_repeat ? ' <span class="badge b-wait">ซิ่ว</span>' : '') + (u.role === 'admin' ? ' <span class="badge b-inv">แอดมิน</span>' : u.role === 'teacher' ? ' <span class="badge b-ok">ผู้สอน · ' + (u.subjects || []).map(function (k) { return esc(SHORT[k] || k); }).join(', ') + '</span>' : '') + (u.status === 'banned' ? ' <span class="badge b-no">ระงับ</span>' : '') +
          '<div class="sub">' + esc(u.email) + ' · ' + esc(u.phone) + '</div>' + contactLine(u) + '</div></div></td><td>' + esc(u.school) + '<div class="sub">' + esc(u.grade) + (u.is_repeat && u.current_university ? ' · ตอนนี้ ' + esc(u.current_faculty) + ' ' + esc(u.current_university) : '') + '</div>' + (u.dream_faculty ? '<div class="sub">ฝัน: ' + esc(u.dream_faculty) + ' · ' + esc(u.dream_university) + '</div>' : '') + '</td><td class="sm">' + (u.courses.length ? u.courses.map(esc).join('<br>') : '<span class="sub">–</span>') + '</td>' +
          '<td class="sm">' + (u.device ? esc(u.device) + '<div class="sub">ตั้งแต่ ' + thDate(u.device_since, true) + '</div>' : '<span class="sub">ไม่ได้เข้าสู่ระบบ</span>') + '</td>' +
          '<td><div class="acts">' + (u.user_id === S.user.user_id ? '<span class="sub">บัญชีของคุณ</span>' :
            (u.device ? '<button class="pill quiet s" data-u="reset" data-id="' + u.user_id + '" data-n="' + esc(u.nickname) + '">ล้างอุปกรณ์</button>' : '') +
            '<button class="pill quiet s" data-role="' + u.user_id + '">ยศ</button>' +
            '<button class="pill ' + (u.status === 'banned' ? 'quiet' : 'danger') + ' s" data-u="' + (u.status === 'banned' ? 'active' : 'banned') + '" data-id="' + u.user_id + '" data-n="' + esc(u.nickname) + '">' + (u.status === 'banned' ? 'ยกเลิกระงับ' : 'ระงับ') + '</button>') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>ไม่พบผู้ใช้</p></div>'));
    $('#uqf').onsubmit = function (e) { e.preventDefault(); S.uq = $('#uq').value; viewAdmin('users'); };
    $$('[data-ph]').forEach(function (b) {
      b.onclick = function () {
        busy(b, true);
        api('admin.user.photo', { user_id: b.dataset.ph }).then(function (ph) { busy(b, false); if (!ph) return toast('ไม่พบรูป', true);
          openModal(mhead('รูปของ ' + esc(b.dataset.n)) + '<img class="phbig" alt="" src="data:' + esc(ph.mime) + ';base64,' + ph.base64 + '">'); }).catch(function (e) { busy(b, false); toast(e.message, true); });
      };
    });
    $$('[data-role]').forEach(function (b) { b.onclick = function () { roleModal(us.filter(function (x) { return x.user_id === b.dataset.role; })[0]); }; });
    $$('[data-u]').forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.u, id = b.dataset.id, n = b.dataset.n;
        var cfg = { reset: ['ล้างอุปกรณ์ของ ' + n + '?', n + ' จะออกจากระบบ แล้วเข้าสู่ระบบจากเครื่องใหม่ได้', 'ล้างอุปกรณ์'],
          admin: ['ตั้ง ' + n + ' เป็นแอดมิน?', 'แอดมินอนุมัติสลิป แก้คอร์ส และจัดการผู้ใช้ได้ทั้งหมด', 'ตั้งเป็นแอดมิน'],
          student: ['ถอดสิทธิ์แอดมินของ ' + n + '?', n + ' จะเข้าหลังบ้านไม่ได้อีก', 'ถอดแอดมิน'],
          banned: ['ระงับบัญชี ' + n + '?', n + ' จะถูกออกจากระบบทันทีและเข้าสู่ระบบไม่ได้จนกว่าจะยกเลิก', 'ระงับบัญชี'],
          active: ['ยกเลิกการระงับ ' + n + '?', n + ' จะเข้าสู่ระบบได้ตามปกติ', 'ยกเลิกระงับ'] }[a];
        confirmBox(cfg[0], cfg[1], cfg[2], a === 'banned').then(function (y) {
          if (!y) return;
          var p = a === 'reset' ? api('admin.user.resetDevice', { user_id: id }) : api('admin.user.update', (a === 'admin' || a === 'student') ? { user_id: id, role: a } : { user_id: id, status: a });
          p.then(function () { toast('เรียบร้อย'); viewAdmin('users'); }).catch(function (e) { toast(e.message, true); });
        });
      };
    });
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function bbSetup() {
  var box = $('#bbset'), inp = $('#f-home_billboard'); if (!box || !inp) return;
  api('courses.list').then(function (cs) {
    var by = {}; cs.forEach(function (c) { by[c.course_id] = c; });
    var ids = inp.value.split(',').map(function (x) { return x.trim(); }).filter(function (x) { return by[x]; });
    var draw = function () {
      inp.value = ids.join(',');
      box.innerHTML = (ids.length ? '<ol class="bbl">' + ids.map(function (id, i) { var c = by[id];
        return '<li><span class="bbl-n">' + (i + 1) + '</span>' + (c.cover_url ? '<img src="' + esc(imgSrc(c.cover_url)) + '" alt="">' : '<span class="bbl-img"></span>') + '<span class="bbl-t"><b>' + esc(c.title) + '</b><small>' + esc(c.subject_name || '') + '</small></span>' +
          '<span class="bbl-a"><button type="button" class="pill quiet s" data-bbm="' + i + '" data-d="-1"' + (i ? '' : ' disabled') + ' aria-label="เลื่อนขึ้น">↑</button><button type="button" class="pill quiet s" data-bbm="' + i + '" data-d="1"' + (i < ids.length - 1 ? '' : ' disabled') + ' aria-label="เลื่อนลง">↓</button><button type="button" class="pill ghost s" data-bbx="' + i + '">เอาออก</button></span></li>'; }).join('') + '</ol>'
        : '<p class="hint">ยังไม่ได้เลือก ตอนนี้แบนเนอร์ใช้ 5 คอร์สแรก</p>') +
        (cs.length > ids.length ? '<select class="i" id="bbadd" aria-label="เพิ่มคอร์สขึ้นแบนเนอร์"><option value="">+ เพิ่มคอร์สขึ้นแบนเนอร์</option>' + cs.filter(function (c) { return ids.indexOf(c.course_id) < 0; }).map(function (c) { return '<option value="' + esc(c.course_id) + '">' + esc(c.title) + '</option>'; }).join('') + '</select>' : '');
      $$('[data-bbm]', box).forEach(function (b) { b.onclick = function () { var i = +b.dataset.bbm, j = i + Number(b.dataset.d), t = ids[i]; ids[i] = ids[j]; ids[j] = t; draw(); }; });
      $$('[data-bbx]', box).forEach(function (b) { b.onclick = function () { ids.splice(+b.dataset.bbx, 1); draw(); }; });
      var ad = $('#bbadd', box); if (ad) ad.onchange = function () { if (ad.value) { ids.push(ad.value); draw(); } };
    };
    draw();
  }).catch(function () { box.innerHTML = '<p class="hint">โหลดรายชื่อคอร์สไม่ได้</p>'; });
}
function aSettings(shell) {
  api('admin.settings').then(function (s) {
    shell('<h1>ตั้งค่า</h1><form class="card form" id="sf" style="max-width:640px">' +
      '<h3 style="font-size:16px">หน้าแรก</h3>' + field('hero_eyebrow', 'ข้อความเล็กเหนือหัวข้อ', s.hero_eyebrow) + field('hero_title', 'หัวข้อใหญ่ (ใส่ | เพื่อขึ้นบรรทัดใหม่ บรรทัดที่ 2 จะเป็นสีเขียว)', s.hero_title) + field('hero_subtitle', 'ข้อความใต้หัวข้อ', s.hero_subtitle) +
      '<h3 style="font-size:16px;margin-top:6px">แบนเนอร์ใหญ่หน้าแรก</h3><p class="hint" style="margin-top:-6px">เลือกคอร์สที่จะขึ้นแบนเนอร์ใหญ่ และเรียงลำดับด้วยลูกศร (อันดับ 1 ขึ้นก่อน) ถ้าไม่เลือกเลย เว็บจะใช้ 5 คอร์สแรก กดบันทึกด้านล่างเพื่อใช้</p>' +
      '<input type="hidden" name="home_billboard" id="f-home_billboard" value="' + esc(s.home_billboard || '') + '"><div class="bbset" id="bbset"><p class="hint">กำลังโหลดคอร์ส…</p></div>' +
      '<h3 style="font-size:16px;margin-top:6px">ทั่วไป</h3>' + field('announcement', 'ประกาศบนหัวเว็บ (เว้นว่างเพื่อซ่อน)', s.announcement, { ph: 'เช่น เปิดรับสมัครคอร์สชีววิทยา สอวน. รอบ 2027 แล้ว' }) +
      (feat('cells') ? field('cells_enabled', 'ระบบเซลล์แบ่งตัว (สะสมวันเรียนต่อเนื่อง แลกโค้ดลด)', s.cells_enabled || '1', { options: [['1', 'เปิด'], ['0', 'ปิด']] }) : '') +
      (feat('fest') ? field('event_mode', 'ธีมเทศกาล (ทับธีมของทุกคนชั่วคราว น้องกดกลับไปใช้ธีมตัวเองได้)', s.event_mode || 'auto', { options: [['auto', 'อัตโนมัติตามปฏิทิน · ฮาโลวีน 1–31 ต.ค. · คริสต์มาส 1–31 ธ.ค.'], ['off', 'ปิด'], ['halloween', 'ฮาโลวีน ตั้งแต่ตอนนี้'], ['christmas', 'คริสต์มาส ตั้งแต่ตอนนี้']] }) : '') +
      '<h3 style="font-size:16px;margin-top:6px">การชำระเงิน</h3><p class="hint">บัญชีแยกตามวิชาตั้งได้ที่เมนู <a href="#/admin/accounts">บัญชีรับเงิน</a> ส่วนนี้คือบัญชีหลัก ใช้กับวิชาที่ยังไม่ได้ผูกบัญชี</p>' +
      '<div class="row2">' + field('promptpay_id', 'บัญชีหลัก: เบอร์หรือเลขบัตรพร้อมเพย์', s.promptpay_id, { mode: 'numeric' }) + field('promptpay_name', 'บัญชีหลัก: ชื่อบัญชี', s.promptpay_name) + '</div>' +
      field('order_expire_hours', 'ต้องส่งหลักฐานภายในกี่ชั่วโมงหลังสั่งซื้อ (เลยแล้วบิลยกเลิกเอง)', s.order_expire_hours || '48', { mode: 'numeric' }) +
      field('pay_terms_text', 'ข้อตกลงการชำระเงิน (แสดงตอนยืนยันคำสั่งซื้อและในทุกบิล)', s.pay_terms_text || DEFAULT_PAY_TERMS, { area: true, hint: 'บรรทัดละ 1 ข้อ ขึ้นต้นด้วย - · {account} = ชื่อและเลขบัญชีของบิลนั้น · {ig} = IG ที่ให้แจ้งโอน' }) +
      '<div class="f">ข้อมูลที่นักเรียนต้องกรอกตอนแจ้งโอน (รูปสลิปบังคับเสมอ)<div class="row2">' + [['paid_at', 'วันเวลาที่โอน'], ['amount', 'ยอดที่โอน'], ['from_bank', 'ธนาคารที่โอนออก'], ['payer_name', 'ชื่อเจ้าของบัญชีที่โอน']].map(function (x) { return field('proof_' + x[0], x[1], s['proof_' + x[0]] || 'required', { options: [['required', 'บังคับกรอก'], ['optional', 'ไม่บังคับ'], ['hidden', 'ไม่ต้องถาม']] }); }).join('') + '</div></div>' +
      field('proof_extra', 'ช่องที่อยากถามเพิ่ม (บรรทัดละ 1 ช่อง ใส่ |required ต่อท้ายถ้าบังคับ)', s.proof_extra, { area: true, ph: 'LINE ID|required\nหมายเหตุถึงแอดมิน' }) +
      '<div class="row2">' + field('contact_ig', 'IG ติดต่อ (ไม่ต้องใส่ @)', s.contact_ig) + field('site_url', 'ที่อยู่เว็บ (ใช้ในปุ่มลิงก์ในอีเมล)', s.site_url || 'https://ineedbio.shop') + '</div>' +
      '<h3 style="font-size:16px;margin-top:6px">ข้อตกลงและนโยบาย</h3><p class="hint">เว้นว่างไว้ = ใช้ข้อความมาตรฐานของระบบ ถ้าจะแก้ ให้กดปุ่มด้านล่างเพื่อใส่ข้อความมาตรฐานลงช่องแล้วแก้ต่อ ใช้ # หัวข้อใหญ่, ## หัวข้อย่อย, - รายการ และ {ig} แทน IG ติดต่อ</p>' +
      '<button type="button" class="pill quiet s" id="copy-legal" style="justify-self:start">ใส่ข้อความมาตรฐานลงในช่องเพื่อแก้ไข</button>' +
      field('terms_text', 'ข้อตกลงการใช้งาน', s.terms_text, { area: true }) + field('privacy_text', 'นโยบายความเป็นส่วนตัว', s.privacy_text, { area: true }) +
      field('admin_emails', 'อีเมลที่รับแจ้งเตือนคำขอใหม่ (คั่นด้วย , )', s.admin_emails, { ph: 'a@gmail.com, b@gmail.com' }) +
      '<p class="err" id="sf-err" hidden></p><button class="pill" style="justify-self:start">บันทึก</button></form>');
    $('#copy-legal').onclick = function () { if (!$('#f-terms_text').value) $('#f-terms_text').value = DEFAULT_TERMS; if (!$('#f-privacy_text').value) $('#f-privacy_text').value = DEFAULT_PRIVACY; };
    bbSetup();
    submitForm('#sf', 'admin.settings.save', '#sf-err', function () { toast('บันทึกแล้ว'); api('config').then(function (c) { S.cfg = c; }); });
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}

/* ─── แพ็กเกจ ─── */
function bundleCards(list) {
  return '<div class="bdls">' + list.map(function (b) {
    var ids = b.course_ids.join(','), inAll = b.course_ids.every(function (id) { return CART.indexOf(id) >= 0; });
    var href = '#/bundle/' + encodeURIComponent(b.bundle_id);
    return '<div class="bdl' + sc(b.subject) + '">' + (b.cover_url ? '<a class="bc" href="' + href + '"><img src="' + esc(imgSrc(b.cover_url)) + '" alt="" loading="lazy" onerror="this.remove()"></a>' : '') +
      '<div class="bb"><span class="save">ประหยัด ' + baht(b.normal - b.price) + '</span><h3><a href="' + href + '">' + esc(b.title) + '</a></h3>' + (b.subtitle ? '<p class="sm ink2" style="margin-top:-4px">' + esc(b.subtitle) + '</p>' : '') +
      '<div class="bcs">' + b.courses.map(function (c) { return '<a href="#/course/' + encodeURIComponent(c.course_id) + '">' + esc(c.title) + '</a>'; }).join('') + '</div>' +
      '<div class="bp"><span><s>' + baht(b.normal) + '</s><b>' + baht(b.price) + '</b></span><span class="rowx" style="gap:6px"><a class="pill quiet s" href="' + href + '">รายละเอียด</a>' + (inAll ? '<a class="pill s" href="#/cart">อยู่ในตะกร้าแล้ว</a>' : '<button class="pill s" data-recart="' + esc(ids) + '">ใส่ตะกร้า</button>') + '</span></div></div></div>';
  }).join('') + '</div>';
}
function bundleOffers(c) {
  var bs = (c.bundles || []).slice().sort(function (a, b) { return a.course_ids.length - b.course_ids.length; });
  if (!bs.length) return '';
  return '<div class="offer"><b class="sm">ซื้อเป็นแพ็กเกจคุ้มกว่า</b>' + bs.map(function (b) {
    return '<div class="of"><div><a href="#/bundle/' + encodeURIComponent(b.bundle_id) + '"><span>' + esc(b.title) + '</span></a><small><s>' + baht(b.normal) + '</s> ' + baht(b.price) + ' · ประหยัด ' + baht(b.normal - b.price) + '</small></div><button class="pill ghost s" data-recart="' + esc(b.course_ids.join(',')) + '">ใส่ตะกร้า</button></div>';
  }).join('') + '<small class="muted">ใส่แยกทีละเทอมก็ได้ ระบบคิดราคาแพ็กเกจให้เองในตะกร้า ถ้าเคยซื้อบางเทอมแล้ว จ่ายแค่ส่วนต่าง</small></div>';
}
function viewBundle(id) {
  loading('home', 'course');
  api('bundle.detail', { bundle_id: id }).then(function (b) {
    S.wantSubj = b.subject; setSubj(b.subject);
    var ids = b.course_ids.join(','), inAll = b.course_ids.every(function (x) { return CART.indexOf(x) >= 0; });
    var CK = '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M5.5 10.3l3 3 6-6.3" fill="none" stroke="var(--on-acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var buy = inAll ? '<div class="note plain">แพ็กเกจนี้อยู่ในตะกร้าแล้ว</div><a class="pill block" href="#/cart">ไปที่ตะกร้า · ชำระเงิน</a>' : '<button class="pill block" data-recart="' + esc(ids) + '">ซื้อแพ็กเกจนี้</button>';
    page('home', '<div style="padding-top:24px"><a class="back" href="#/">← คอร์สทั้งหมด</a></div><div class="cd"><div>' +
      '<section class="chero"><span class="mono sj">แพ็กเกจ · ' + b.courses.length + ' คอร์ส</span><h1>' + esc(b.title) + '</h1>' + (b.subtitle ? '<p class="ink2 lead">' + esc(b.subtitle) + '</p>' : '') +
      '<div class="facts"><span><b>' + b.courses.length + '</b> คอร์ส</span><span><b>' + b.lesson_count + '</b> ตอน</span><span><b>' + hm(b.total_min) + '</b> วิดีโอ</span><span><b>ประหยัด ' + baht(b.normal - b.price) + '</b></span></div>' +
      (b.cover_url ? '<div class="cover trailer" style="border-radius:16px;aspect-ratio:16/8"><img src="' + esc(imgSrc(b.cover_url)) + '" alt="" style="object-fit:contain"></div>' : '') + '</section>' +
      '<section class="sec"><h2>ในแพ็กเกจนี้มีอะไรบ้าง</h2><div class="bitm">' + b.items.map(function (c, i) {
        return '<a class="bi' + sc(c.subject) + '" href="#/course/' + encodeURIComponent(c.course_id) + '">' + cover(c) + '<div class="stack" style="gap:6px;min-width:0"><span class="mono">คอร์สที่ ' + (i + 1) + ' · ' + baht(c.price) + ' ถ้าซื้อแยก</span><h3>' + esc(c.title) + '</h3>' +
          (c.subtitle ? '<p class="sm ink2">' + esc(c.subtitle) + '</p>' : '') + '<span class="sm muted">' + c.lesson_count + ' ตอน · ' + hm(c.total_min) + (c.instructors.length ? ' · สอนโดย ' + c.instructors.map(function (t) { return esc(t.name); }).join(' และ ') : '') + '</span>' +
          (c.chapters.length ? '<div class="bcs">' + c.chapters.slice(0, 6).map(function (ch) { return '<span>' + esc(ch.title.replace(/^.* › /, '')) + '</span>'; }).join('') + (c.chapters.length > 6 ? '<span>+' + (c.chapters.length - 6) + ' บท</span>' : '') + '</div>' : '') +
          '<span class="link sm" style="justify-self:start">ดูรายละเอียดคอร์ส →</span></div></a>';
      }).join('') + '</div></section>' +
      (b.instructors.length ? '<section class="sec"><h2>ผู้สอน</h2>' + b.instructors.map(instBlock).join('') + '</section>' : '') +
      '<section class="sec"><h2>คำถามที่พบบ่อย</h2><div class="syl faq">' + [
        { q: 'ซื้อแพ็กเกจกับซื้อแยกต่างกันยังไง', a: 'เนื้อหาเหมือนกันทุกอย่าง ซื้อเป็นแพ็กเกจราคารวม ' + baht(b.price) + ' ถ้าซื้อแยกรวม ' + baht(b.normal) },
        { q: 'เคยซื้อบางคอร์สในแพ็กเกจไปแล้ว', a: 'ใส่คอร์สที่เหลือลงตะกร้า ระบบคิดราคาแพ็กเกจแล้วหักยอดที่เคยจ่ายให้เอง จ่ายแค่ส่วนต่าง' },
        { q: 'ใส่ทีละคอร์สลงตะกร้าได้ราคาแพ็กเกจไหม', a: 'ได้ ถ้าในตะกร้ามีครบทุกคอร์สของแพ็กเกจ ระบบคิดราคาแพ็กเกจให้เอง' },
        { q: 'ดูได้นานแค่ไหน', a: 'ดูได้ตลอด ไม่มีวันหมดอายุ ทุกคอร์สในแพ็กเกจ' }].map(function (f) { return '<details><summary><span class="t">' + esc(f.q) + '</span><span class="n">+</span></summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</div></section>' +
      '</div><aside class="buy"><span class="mono">ราคาแพ็กเกจ</span><span class="price"><span class="was">' + baht(b.normal) + '</span>' + baht(b.price) + '</span>' +
      '<ul class="incl">' + b.items.map(function (c) { return '<li>' + CK + esc(c.title) + '</li>'; }).join('') + '<li>' + CK + 'ดูได้ตลอด ไม่มีวันหมดอายุ</li></ul>' + buy +
      '<p class="hint" style="text-align:center">ประหยัด ' + baht(b.normal - b.price) + ' เทียบกับซื้อแยก</p></aside></div>' +
      '<div class="mbar"><div><span class="sm ink2">' + esc(b.title) + '</span><b class="price">' + baht(b.price) + '</b></div>' + (inAll ? '<a class="pill" href="#/cart">ไปที่ตะกร้า</a>' : '<button class="pill" data-recart="' + esc(ids) + '">ซื้อแพ็กเกจ</button>') + '</div>');
  }).catch(function (e) { failed('home', e); });
}
function aBundles(shell) {
  Promise.all([api('admin.bundles'), api('admin.courses')]).then(function (r) {
    var list = r[0], cs = r[1];
    shell('<div class="spread"><h1>แพ็กเกจ</h1><button class="pill s" id="new-bd">+ สร้างแพ็กเกจ</button></div>' +
      '<p class="ink2 sm">รวมหลายคอร์สขายในราคาพิเศษ เช่น คณิต ม.4 เทอม 1 + 2 = 690 นักเรียนใส่ทีละคอร์สลงตะกร้าก็ได้ ระบบเลือกแพ็กเกจที่ถูกที่สุดให้เอง ถ้าเคยซื้อบางคอร์สในแพ็กเกจแล้ว จะจ่ายแค่ส่วนต่าง</p>' +
      (list.length ? '<div class="tbl"><table style="min-width:680px"><thead><tr><th>แพ็กเกจ</th><th>คอร์สในแพ็กเกจ</th><th class="num">ราคาปกติ</th><th class="num">ราคาแพ็กเกจ</th><th></th></tr></thead><tbody>' + list.map(function (b) {
        return '<tr><td><b>' + esc(b.title) + '</b> ' + (b.status === 'inactive' ? '<span class="badge b-soft">ปิด</span>' : '<span class="badge b-ok">ใช้งาน</span>') + (b.subtitle ? '<div class="sub">' + esc(b.subtitle) + '</div>' : '') + '</td>' +
          '<td class="sm">' + b.courses.map(function (c) { return esc(c.title) + (c.status !== 'published' ? ' <span class="badge b-soft">ร่าง</span>' : ''); }).join('<br>') + '</td>' +
          '<td class="num">' + baht(b.normal) + '</td><td class="num"><b>' + baht(b.price) + '</b><div class="sub">ลด ' + baht(b.normal - b.price) + '</div></td>' +
          '<td><div class="acts"><button class="pill quiet s" data-bd="' + esc(b.bundle_id) + '">แก้ไข</button></div></td></tr>';
      }).join('') + '</tbody></table></div><p class="hint">แพ็กเกจจะขึ้นหน้าเว็บเมื่อทุกคอร์สในแพ็กเกจ "เปิดขาย" แล้ว</p>' : '<div class="empty"><p>ยังไม่มีแพ็กเกจ</p></div>'));
    $('#new-bd').onclick = function () { bundleModal(null, cs); };
    $$('[data-bd]').forEach(function (x) { x.onclick = function () { bundleModal(list.filter(function (b) { return b.bundle_id === x.dataset.bd; })[0], cs); }; });
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function bundleModal(b, cs) {
  b = b || { status: 'active', course_ids: [], sort_order: 0 };
  openModal(mhead(b.bundle_id ? 'แก้ไขแพ็กเกจ' : 'สร้างแพ็กเกจ') + '<form class="form" id="bdf">' +
    field('title', 'ชื่อแพ็กเกจ', b.title, { ph: 'เช่น คณิต ม.4 ทั้งปี (เทอม 1 + 2)' }) + field('subtitle', 'คำโปรยสั้น (ไม่ใส่ก็ได้)', b.subtitle, { ph: 'เช่น ซื้อแยกเทอมละ 490' }) +
    '<div class="f">คอร์สในแพ็กเกจ (เลือกอย่างน้อย 2)<div class="stack" style="gap:6px;max-height:220px;overflow:auto">' + cs.map(function (c) {
      return '<label class="chk-l"><input type="checkbox" name="c_' + esc(c.course_id) + '" data-p="' + c.price + '"' + (b.course_ids.indexOf(c.course_id) >= 0 ? ' checked' : '') + '> ' + esc(c.title) + ' <span class="muted">' + baht(c.price) + (c.status !== 'published' ? ' · ร่าง' : '') + '</span></label>';
    }).join('') + '</div><span class="hint" id="bd-sum"></span></div>' +
    '<div class="row2">' + field('price', 'ราคาแพ็กเกจ (บาท)', b.price, { mode: 'numeric' }) + field('status', 'สถานะ', b.status, { options: [['active', 'ใช้งาน'], ['inactive', 'ปิด']] }) + '</div>' +
    field('cover_url', 'รูปปกแพ็กเกจ (ไม่ใส่ก็ได้)', b.cover_url, { upload: true, ph: 'https://...' }) + field('sort_order', 'ลำดับ', b.sort_order, { mode: 'numeric' }) +
    '<p class="err" id="bdf-err" hidden></p><div class="rowx"><button class="pill">บันทึก</button>' + (b.bundle_id ? '<button type="button" class="pill danger" id="bd-del">ลบ</button>' : '') + '</div></form>', true);
  var sum = function () { var t = 0, n = 0; $$('#bdf [name^="c_"]').forEach(function (x) { if (x.checked) { t += Number(x.dataset.p) || 0; n++; } }); var p = Number($('#f-price').value) || 0; $('#bd-sum').textContent = n + ' คอร์ส · ราคาปกติรวม ' + baht(t) + (p && t > p ? ' · ลด ' + baht(t - p) : ''); };
  $$('#bdf [name^="c_"]').forEach(function (x) { x.onchange = sum; }); $('#f-price').oninput = sum; sum();
  submitForm('#bdf', 'admin.bundle.save', '#bdf-err', function () { closeModal(); toast('บันทึกแพ็กเกจแล้ว'); viewAdmin('bundles'); }, function () {
    var o = { bundle_id: b.bundle_id || '', course_ids: [] };
    $$('#bdf [name^="c_"]').forEach(function (x) { if (x.checked) o.course_ids.push(x.name.slice(2)); o[x.name] = undefined; });
    return o;
  });
  if ($('#bd-del')) $('#bd-del').onclick = function () {
    confirmBox('ลบแพ็กเกจ ' + b.title + '?', 'คอร์สยังขายแยกได้ตามปกติ คำสั่งซื้อเก่าไม่เปลี่ยน', 'ลบ', true).then(function (y) {
      if (!y) return; api('admin.bundle.delete', { bundle_id: b.bundle_id }).then(function () { toast('ลบแล้ว'); viewAdmin('bundles'); }).catch(function (e) { toast(e.message, true); });
    });
  };
}

/* ─── ADMIN: คำสั่งซื้อ / บัญชีรับเงิน / โค้ดส่วนลด ─── */
function loadAccs(force) { return S.accs && !force ? Promise.resolve(S.accs) : api('admin.accounts').then(function (a) { S.accs = a; return a; }); }
function checksHtml(cs) { return (cs || []).map(function (c) { return '<li class="' + (c.ok && !c.warn ? 'ok' : 'warn') + '">' + (c.ok && !c.warn ? '✓' : '!') + ' ' + esc(c.label) + '</li>'; }).join(''); }
function aOrders(shell) {
  var st = S.bTab || 'reviewing', acc = S.bAcc || '', q = S.bq || '';
  Promise.all([api('admin.bills', { status: st, account_id: acc, q: q }), isAdm() ? loadAccs() : Promise.resolve([])]).then(function (r) {
    var all = r[0], accs = r[1], subs = S.cfg.subjects || {}, adm = isAdm();
    if (st === 'reviewing' && !acc && !q) S.pending = all.length;
    var subjOf = function (b) { var u = []; b.items.forEach(function (i) { if (u.indexOf(i.subject) < 0) u.push(i.subject); }); return u.length === 1 ? u[0] : 'mix'; };
    all.forEach(function (b) { b._subj = subjOf(b); });
    var fk = Object.keys(subs).filter(function (k) { return all.some(function (b) { return b._subj === k; }); });
    if (all.some(function (b) { return b._subj === 'mix'; })) fk.push('mix');
    var fsub = S.bSub && fk.indexOf(S.bSub) >= 0 ? S.bSub : '';
    var fname = function (k) { return k === 'mix' ? 'หลายวิชา' : subs[k] || k; };
    var list = fsub ? all.filter(function (b) { return b._subj === fsub; }) : all;
    var order = fsub ? [fsub] : fk;
    list = [].concat.apply([], order.map(function (k) { return list.filter(function (b) { return b._subj === k; }); }));
    S.blist = list;
    shell('<div class="spread"><h1>คำสั่งซื้อ</h1>' + (adm ? '<button class="pill ghost s" id="grant-btn">+ เพิ่มสิทธิ์ให้ผู้ใช้เอง</button>' : '') + '</div>' + (adm ? '' : '<p class="note plain">ดูบิลของวิชาที่คุณสอนได้ การอนุมัติยอดเงินเป็นหน้าที่ของแอดมิน</p>') +
      '<div class="rowx"><div class="seg" role="group">' + [['reviewing', 'รอตรวจ'], ['awaiting_payment', 'รอโอน'], ['rejected', 'ไม่ผ่าน'], ['approved', 'อนุมัติแล้ว'], ['closed', 'ยกเลิก/หมดเวลา']].map(function (t) { return '<button data-btab="' + t[0] + '" aria-pressed="' + (st === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (adm ? '<select class="i" id="bacc" style="width:auto;min-width:180px"><option value="">ทุกบัญชีรับเงิน</option><option value="DEFAULT"' + (acc === 'DEFAULT' ? ' selected' : '') + '>บัญชีหลัก</option>' + accs.map(function (a) { return '<option value="' + esc(a.account_id) + '"' + (acc === a.account_id ? ' selected' : '') + '>' + esc(a.label) + '</option>'; }).join('') + '</select>' : '') +
      '<form id="bqf" class="rowx"><input class="i" id="bq" style="width:220px" placeholder="' + (adm ? 'ค้นหาเลขบิล ชื่อ อีเมล เบอร์' : 'ค้นหาเลขบิล หรือชื่อ') + '" value="' + esc(q) + '"></form></div>' +
      (all.length ? '<div class="ofold" role="group" aria-label="แฟ้มวิชา"><button data-bsub="" aria-pressed="' + !fsub + '">ทุกวิชา <span class="n">' + all.length + '</span></button>' + fk.map(function (k) { return '<button class="' + (k === 'mix' ? '' : 's-' + k) + '" data-bsub="' + k + '" aria-pressed="' + (fsub === k) + '">' + esc(fname(k)) + ' <span class="n">' + all.filter(function (b) { return b._subj === k; }).length + '</span></button>'; }).join('') + '</div>' : '') +
      (st === 'reviewing' ? '<p class="ink2 sm">เปิดดูสลิป เทียบยอดกับแอปธนาคารของบัญชีนั้น แล้วกดอนุมัติ นักเรียนได้อีเมลแจ้งและเข้าเรียนได้ทันที</p>' : st === 'awaiting_payment' ? '<p class="ink2 sm">บิลที่สร้างแล้วแต่ยังไม่ส่งหลักฐาน ถ้าน้องโอนแล้วแจ้งทาง IG อย่างเดียว เปิดบิลแล้วกดอนุมัติได้เลย</p>' : '') +
      (list.length ? '<div class="tbl"><table style="min-width:760px"><thead><tr><th>บิล</th><th>นักเรียน</th><th>คอร์ส</th><th class="num">ยอด</th><th>บัญชีรับ</th><th>ตรวจเบื้องต้น</th><th></th></tr></thead><tbody>' + list.map(function (b, ix, arr) {
        var bad = (b.checks || []).filter(function (c) { return !c.ok || c.warn; }).length;
        var gh = !fsub && fk.length > 1 && (ix === 0 || arr[ix - 1]._subj !== b._subj) ? '<tr class="grp-row' + (b._subj === 'mix' ? '' : ' s-' + b._subj) + '"><td colspan="7">' + esc(fname(b._subj)) + ' · ' + list.filter(function (x) { return x._subj === b._subj; }).length + ' บิล</td></tr>' : '';
        return gh + '<tr><td><b class="sm">' + esc(b.bill_id) + '</b><div class="sub">' + thDate(b.submitted_at || b.created_at, true) + '</div></td><td>' + esc(b.name) + '<div class="sub">' + esc(b.nickname) + ' · ' + esc(b.phone) + '</div></td>' +
          '<td class="sm">' + b.items.map(function (i) { return esc(i.title); }).join('<br>') + '</td><td class="num">' + baht(b.total) + (b.discount ? '<div class="sub">ลด ' + baht(b.discount) + '</div>' : '') + '</td><td class="sm">' + esc(b.account_label) + '</td>' +
          '<td class="sm">' + (b.checks && b.checks.length ? (bad ? '<span class="badge b-wait">! ' + bad + ' จุดที่ต้องดู</span>' : '<span class="badge b-ok">✓ ผ่าน ' + b.checks.length + ' ข้อ</span>') : '<span class="sub">–</span>') + '</td>' +
          '<td><div class="acts"><button class="pill ' + (st === 'reviewing' ? '' : 'quiet ') + 's" data-bill="' + esc(b.bill_id) + '">' + (st === 'reviewing' ? 'ตรวจ' : 'เปิดดู') + '</button></div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>' + (st === 'reviewing' ? 'ไม่มีบิลรอตรวจ ตรวจครบแล้ว' : 'ยังไม่มีรายการ') + '</p></div>'));
    $$('[data-btab]').forEach(function (b) { b.onclick = function () { S.bTab = b.dataset.btab; viewAdmin('orders'); }; });
    $$('[data-bsub]').forEach(function (b) { b.onclick = function () { S.bSub = b.dataset.bsub; viewAdmin('orders'); }; });
    if ($('#bacc')) $('#bacc').onchange = function () { S.bAcc = this.value; viewAdmin('orders'); };
    $('#bqf').onsubmit = function (e) { e.preventDefault(); S.bq = $('#bq').value.trim(); viewAdmin('orders'); };
    $$('[data-bill]').forEach(function (b) { b.onclick = function () { billModal(list.filter(function (x) { return x.bill_id === b.dataset.bill; })[0]); }; });
    if ($('#grant-btn')) $('#grant-btn').onclick = grantModal;
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function billModal(b) {
  var p = b.proof || {}, a = b.account || {};
  var row = function (k, v) { return v ? '<div><span>' + k + '</span><b>' + v + '</b></div>' : ''; };
  var extra = Object.keys(p).filter(function (k) { return ['paid_at', 'amount', 'from_bank', 'payer_name', 'payer_relation'].indexOf(k) < 0; });
  var canDecide = b.can_decide !== false && ['reviewing', 'awaiting_payment', 'rejected', 'expired'].indexOf(b.status) >= 0;
  openModal(mhead('บิล ' + esc(b.bill_id), esc(b.name) + ' · ยอดบิล ' + baht(b.total)) +
    '<div class="bm"><div>' + (b.has_slip ? '<div id="slipv" class="loading" style="padding:40px 0;text-align:center"><span class="spin"></span></div>' : '<div class="note plain">ยังไม่ได้แนบสลิป</div>') + '</div>' +
    '<div class="stack" style="gap:12px">' + (b.can_decide === false ? '' : b.has_photo ? '<div class="stuph"><span class="pav" id="bph"><span class="spin"></span></span><div><b>' + esc(b.name) + '</b><span class="sub">รูปที่น้องใส่ตอนสมัคร ใช้เทียบตัวตน</span></div></div>' : '<div class="note plain">น้องยังไม่ได้ใส่รูปถ่ายในบัญชี</div>') +
    '<div class="kv">' + row('สถานะ', billBadge(b.status)) + row('นักเรียน', esc(b.name) + ' (' + esc(b.nickname) + ')') + row('อีเมล', esc(b.email || '')) + row('เบอร์', esc(b.phone || '')) +
    row('บัญชีรับ', esc(b.account_label) + '<br><span class="sub">' + esc(accLine(a)) + '</span>') + '</div>' +
    '<ul class="bitems">' + b.items.map(function (it) { return '<li><span>' + esc(it.title) + '</span><span>' + (it.discount ? '<s class="muted">' + baht(it.price) + '</s> ' : '') + baht(it.net) + '</span></li>'; }).join('') + '<li class="t"><span>ยอดบิล</span><b>' + baht(b.total) + '</b></li></ul>' +
    (b.proof ? '<div class="kv"><h4>ข้อมูลที่นักเรียนกรอก</h4>' + row('โอนเมื่อ', p.paid_at ? thDate(p.paid_at, true) : '') + row('ยอดที่โอน', p.amount != null ? baht(p.amount) : '') + row('จากธนาคาร', esc(p.from_bank || '')) +
      row('ชื่อผู้โอน', esc(p.payer_name || '') + (p.payer_relation ? ' <span class="sub">(' + esc(p.payer_relation) + ')</span>' : '')) + extra.map(function (k) { return row(esc(k), esc(p[k])); }).join('') + row('ส่งเมื่อ', thDate(b.submitted_at, true)) + '</div>' : '') +
    (b.checks && b.checks.length ? '<ul class="chk">' + checksHtml(b.checks) + '</ul>' : '') +
    (b.note ? '<div class="note no">เหตุผลครั้งก่อน: ' + esc(b.note) + '</div>' : '') + '</div></div>' +
    (canDecide ? '<form class="form" id="dec">' + (b.status === 'reviewing' ? field('note', 'เหตุผล (ใส่เมื่อไม่อนุมัติ นักเรียนจะเห็นในอีเมลและหน้าคำสั่งซื้อ)', '', { ph: 'เช่น ยอดโอนไม่ครบ, ไม่พบยอดเข้าบัญชี' }) : '<p class="hint">' + (b.status === 'awaiting_payment' ? 'น้องยังไม่ได้ส่งหลักฐานบนเว็บ ถ้าตรวจแล้วว่ายอดเข้าบัญชีจริง (เช่น แจ้งทาง IG) กดอนุมัติได้เลย' : 'อนุมัติได้ถ้าตรวจแล้วว่ายอดเข้าบัญชีจริง') + '</p>') +
      '<div class="rowx" style="justify-content:flex-end">' + (b.status === 'reviewing' ? '<button type="button" class="pill danger" id="rej">ไม่อนุมัติ</button>' : '') + '<button type="button" class="pill" id="apv">อนุมัติ · เปิดสิทธิ์ ' + b.items.length + ' คอร์ส</button></div></form>' : ''), true);
  if (b.has_photo) api('admin.user.photo', { user_id: b.user_id }).then(function (ph) { var v = $('#bph'); if (v && ph) v.innerHTML = '<a href="data:' + esc(ph.mime) + ';base64,' + ph.base64 + '" target="_blank" rel="noopener"><img alt="รูปนักเรียน" src="data:' + esc(ph.mime) + ';base64,' + ph.base64 + '"></a>'; }).catch(function () { var v = $('#bph'); if (v) v.textContent = '—'; });
  if (b.has_slip) api('admin.bill.slip', { bill_id: b.bill_id }).then(function (s) { var v = $('#slipv'); if (v) { v.className = ''; v.innerHTML = '<a href="data:' + esc(s.mime) + ';base64,' + s.base64 + '" target="_blank" rel="noopener"><img class="slipimg" alt="สลิปการโอน" src="data:' + esc(s.mime) + ';base64,' + s.base64 + '"></a>'; } })
    .catch(function (e) { var v = $('#slipv'); if (v) v.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  var decide = function (decision, btn) {
    var nf = $('#f-note'), note = nf ? nf.value.trim() : '';
    if (decision === 'reject' && !note) { toast('ใส่เหตุผลก่อนกดไม่อนุมัติ', true); nf.focus(); return; }
    busy(btn, true);
    api('admin.bill.decide', { bill_id: b.bill_id, decision: decision, note: note }).then(function () {
      closeModal(); toast(decision === 'approve' ? 'อนุมัติแล้ว ส่งอีเมลแจ้ง ' + b.nickname + ' แล้ว' : 'ไม่อนุมัติ ส่งอีเมลแจ้งเหตุผลแล้ว'); viewAdmin('orders');
    }).catch(function (e) { busy(btn, false); toast(e.message, true); });
  };
  if ($('#apv')) $('#apv').onclick = function () { decide('approve', this); };
  if ($('#rej')) $('#rej').onclick = function () { decide('reject', this); };
}

/* ─── ผู้สอน: ภาพรวม ─── */
function teacherDash(shell, s) {
  var subs = S.cfg.subjects || {};
  shell('<h1>ภาพรวม</h1><p class="ink2 sm">คุณดูแลวิชา ' + s.subjects.map(function (k) { return esc(subs[k]); }).join(', ') + ' · เห็นเฉพาะคอร์ส นักเรียน และรายรับของวิชานี้</p><div class="kpis">' +
    '<a class="kpi k2" href="#/admin/finance" style="text-decoration:none;color:inherit"><span>รายรับเดือนนี้</span><b>' + baht(s.month_revenue) + '</b><span>' + s.month_count + ' รายการ · ดูส่วนแบ่งที่หน้ารายรับรายจ่าย</span></a>' +
    '<a class="kpi k1" href="#/admin/courses" style="text-decoration:none;color:inherit"><span>นักเรียนที่มีสิทธิ์</span><b>' + s.students + '</b><span>ใน ' + s.courses + ' คอร์ส</span></a>' +
    '<a class="kpi k3" href="#/admin/orders" style="text-decoration:none;color:inherit"><span>บิลรอแอดมินตรวจ</span><b>' + s.reviewing + '</b><span>ดูได้ อนุมัติโดยแอดมิน</span></a></div>' +
    (s.expense_pending ? '<div class="note wait">รายจ่ายที่คุณขอเบิก รอแอดมินอนุมัติ ' + s.expense_pending + ' รายการ</div>' : '') +
    '<div class="tbl"><table><thead><tr><th>วิชา</th><th class="num">นักเรียน</th><th class="num">ขายเดือนนี้</th><th class="num">รายรับ</th></tr></thead><tbody>' +
    s.by_subject.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td class="num">' + x.students + '</td><td class="num">' + x.count + '</td><td class="num">' + baht(x.revenue) + '</td></tr>'; }).join('') + '</tbody></table></div>');
}

/* ─── รูปโปรไฟล์จริงของทุกคน (ไม่มีตัวย่อชื่อ) ─── */
S.phc = {}; S.phq = {};
function uAv(uid, has, cls) {
  var src = uid && S.phc[uid];
  return '<span class="uav' + (cls ? ' ' + cls : '') + '"' + (has && uid && !src ? ' data-uav="' + esc(uid) + '"' : '') + '><img src="' + (src || CATSRC) + '" alt=""' + (src ? '' : ' class="cat"') + '></span>';
}
function tAv(photo, cls) { return '<span class="uav' + (cls ? ' ' + cls : '') + '"><img src="' + (photo ? esc(imgSrc(photo)) : CATSRC) + '" alt=""' + (photo ? ' onerror="this.src=CATSRC;this.className=\'cat\'"' : ' class="cat"') + '></span>'; }
function loadPhoto(id) {
  if (S.phc[id]) return Promise.resolve(S.phc[id]);
  if (S.phq[id]) return S.phq[id];
  var me = S.user && id === S.user.user_id;
  if (!me && !isStaff()) return Promise.resolve('');
  S.phq[id] = api(me ? 'my.photo' : 'admin.user.photo', me ? {} : { user_id: id }).then(function (ph) { return ph ? (S.phc[id] = 'data:' + ph.mime + ';base64,' + ph.base64) : ''; }).catch(function () { return ''; });
  return S.phq[id];
}
function hydrateAv(root) {
  var els = $$('[data-uav]', root || document);
  if (!els.length) return;
  var fill = function (el) { var id = el.getAttribute('data-uav'); el.removeAttribute('data-uav'); loadPhoto(id).then(function (src) { var im = el.querySelector('img'); if (src && im) { im.src = src; im.className = ''; } }); };
  if (!window.IntersectionObserver) return els.forEach(fill);
  S.avIO = S.avIO || new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { S.avIO.unobserve(e.target); fill(e.target); } }); }, { rootMargin: '200px' });
  els.forEach(function (el) { S.avIO.observe(el); });
}

/* ─── งวดครึ่งเดือน ─── */
var TH_M3 = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function prOf(dateStr) { return dateStr.slice(0, 7) + (+dateStr.slice(8, 10) <= 15 ? '-1' : '-2'); }
function prNow() { return prOf(new Date(Date.now() + 7 * 36e5).toISOString()); }
function prAdd(pr, d) { if (pr.length === 7) pr += '-1'; var i = (+pr.slice(-1) - 1) + d, m = Math.floor(i / 2); return ymAdd(pr.slice(0, 7), m) + '-' + ((((i % 2) + 2) % 2) + 1); }
function prLabel(pr) {
  var y = +pr.slice(0, 4), m = +pr.slice(5, 7), yy = String(y + 543).slice(-2);
  if (pr.length === 7) return 'ทั้งเดือน ' + TH_M3[m - 1] + ' ' + yy;
  return pr.slice(-1) === '1' ? '1–15 ' + TH_M3[m - 1] + ' ' + yy : '16–' + new Date(Date.UTC(y, m, 0)).getUTCDate() + ' ' + TH_M3[m - 1] + ' ' + yy;
}

/* ─── ส่วนแบ่งผู้สอน ─── */
function aPayouts(shell) {
  var pr = S.poP || prNow(), adm = isAdm();
  Promise.all([api('fin.summary', { period: pr }), adm ? Promise.resolve([]) : api('fin.payouts.mine').catch(function () { return []; })]).then(function (res) {
    var f = res[0], hist = res[1], subs = S.cfg.subjects || {}, pays = f.pays || [], pos = f.payouts || [], P = f.profiles || {};
    var poOf = function (x) { return pos.filter(function (p) { return p.user_id === x.user_id && (p.subject || '') === x.subject; })[0]; };
    var need = 0, paid = 0, sales = 0;
    f.by_subject.forEach(function (b) { sales += b.income; });
    pays.forEach(function (x) { if (x.settle > 0) { need += x.settle; var po = poOf(x); if (po && po.status === 'paid') paid += x.settle; } });
    var st = f.closed ? '<span class="chip ok">ปิดยอดแล้ว' + (f.closed_at ? ' ' + thDate(f.closed_at) : '') + '</span>' : f.pending_close ? '<span class="chip wait">รอปิดยอด · มีรายจ่ายรออนุมัติ</span>' : '<span class="chip soft">กำลังนับ · ปิดยอดเองเมื่อครบรอบ</span>';
    var html = '<div class="spread"><h1>' + (adm ? 'ส่วนแบ่งผู้สอน' : 'ส่วนแบ่งของฉัน') + '</h1><div class="rowx">' +
      '<button class="pill quiet s" id="po-prev" aria-label="งวดก่อน">←</button><b style="min-width:150px;text-align:center">' + esc(prLabel(pr)) + '</b><button class="pill quiet s" id="po-next" aria-label="งวดถัดไป"' + (pr >= prNow() ? ' disabled' : '') + '>→</button></div></div>' +
      '<div class="rowx" style="justify-content:space-between">' + st + (adm ? '<div class="rowx">' + (f.pending_close ? '<a class="pill ghost s" href="#/admin/finance">ดูรายจ่ายรออนุมัติ</a>' : '') + (f.closed && !pos.some(function (p) { return p.status === 'paid' && p.amount; }) ? '<button class="pill quiet s" id="po-reopen">เปิดงวดใหม่</button>' : '') + '<button class="pill s" id="po-split">ตั้งสัดส่วนผู้สอน</button></div>' : '') + '</div>' +
      '<div class="kpis">' + [['ยอดขายงวดนี้', sales, ''], [adm ? 'ต้องโอนผู้สอน' : 'ส่วนแบ่งของฉัน', need, ''], ['โอนแล้ว', paid, ''], ['รอโอน', need - paid, need - paid > 0 ? ' wait' : '']].map(function (k) { return '<div class="kpi' + k[2] + '"><span>' + k[0] + '</span><b>' + money2(k[1]) + '</b></div>'; }).join('') + '</div>';
    var cards = Object.keys(subs).map(function (k) {
      var b = f.by_subject.filter(function (x) { return x.subject === k; })[0], rows = pays.filter(function (x) { return x.subject === k; });
      if (!b || (!b.income && !b.expense && !rows.length)) return '';
      var row = function (x) {
        var p = P[x.user_id] || {}, po = poOf(x), act;
        if (x.settle < 0) act = '<span class="amt">' + money2(-x.settle) + '</span><span class="chip wait">ผู้สอนโอนคืน</span>';
        else if (!x.settle) act = '<span class="amt">฿0</span><span class="chip soft">ไม่ต้องโอน</span>';
        else if (!f.closed) act = '<span class="amt">' + money2(x.settle) + '</span><span class="chip soft">รอปิดยอด</span>';
        else if (po && po.status === 'paid') act = '<span class="amt">' + money2(x.settle) + '</span><span class="chip ok">โอนแล้ว ' + thDate(po.paid_at, true) + '</span>' + (po.has_slip ? '<button class="link sm" data-poslip="' + esc(po.payout_id) + '">ดูสลิป</button>' : '');
        else act = '<span class="amt">' + money2(x.settle) + '</span>' + (adm && po ? '<button class="pill s" data-popay="' + esc(po.payout_id) + '" data-u="' + esc(x.user_id) + '" data-s="' + esc(k) + '">แนบสลิปโอน</button>' : '<span class="chip wait">รอโอน</span>');
        var acc = p.account_no ? '<div class="po-acc"><span>ชื่อบัญชี ' + esc(p.account_name || '-') + '</span><b>' + esc(p.bank_name || '') + ' ' + esc(p.account_no) + '</b></div>'
          : '<div class="po-acc miss"><span>ยังไม่ได้ใส่บัญชีรับเงิน</span><b>' + (adm ? '<a href="#/admin/tprofile/' + esc(x.user_id) + '">เพิ่มในโปรไฟล์ผู้สอน</a>' : '<a href="#/admin/tprofile">เพิ่มในโปรไฟล์ของคุณ</a>') + '</b></div>';
        return '<div class="po-row">' + tAv(p.photo, 'po-av') + '<div class="po-nm"><b>' + esc(p.name || x.name) + '</b><small>' + x.pct + '% ของวิชา' + esc(subs[k]) + (x.held ? ' · หักเงินที่เข้าบัญชีตัวเอง ' + money2(x.held) : '') + '</small></div>' + acc + '<div class="po-act">' + act + '</div></div>';
      };
      return '<div class="po-sj' + sc(k) + '"><div class="po-hd"><span class="po-dot">' + esc(subs[k]) + '</span><div class="po-calc"><span>ยอดขาย <b>' + money2(b.income) + '</b></span><span>− รายจ่าย <b>' + money2(b.expense) + '</b></span><span>= แบ่งได้ <b>' + money2(b.pool) + '</b></span></div></div>' +
        (rows.length ? rows.map(row).join('') : '') +
        (b.unassigned ? '<div class="po-note warn">' + money2(b.unassigned) + ' ยังไม่มีผู้รับส่วนแบ่ง' + (adm ? ' · <button class="link sm" data-posp="' + k + '">ตั้งสัดส่วนวิชานี้</button>' : '') + '</div>' : '') + '</div>';
    }).join('');
    html += cards || '<div class="empty"><p>ยังไม่มียอดขายในงวดนี้</p></div>';
    if (!adm && hist.length) html += '<h3 style="font-size:17px">ย้อนหลัง</h3><div class="tbl"><table style="min-width:560px"><thead><tr><th>งวด</th><th>วิชา</th><th class="num">ส่วนแบ่ง</th><th class="num">ยอดโอน</th><th>สถานะ</th><th></th></tr></thead><tbody>' +
      hist.map(function (h) { return '<tr><td>' + esc(h.label) + '</td><td>' + esc(subs[h.subject] || h.subject) + '</td><td class="num">' + money2(h.share) + '</td><td class="num">' + money2(h.amount) + '</td><td>' + (h.status === 'paid' ? '<span class="chip ok">โอนแล้ว ' + thDate(h.paid_at) + '</span>' : '<span class="chip wait">รอโอน</span>') + '</td><td>' + (h.has_slip ? '<button class="link sm" data-poslip="' + esc(h.payout_id) + '">ดูสลิป</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    html += '<p class="hint">วิธีคิด: ยอดขายของวิชา − รายจ่ายที่อนุมัติแล้วของวิชา = ยอดที่แบ่ง ไม่มีค่าแพลตฟอร์ม แบ่งให้ผู้สอนตามสัดส่วนที่ตั้งไว้ ณ วันที่ขาย ถ้าน้องโอนเข้าบัญชีผู้สอนโดยตรง หักออกจากยอดที่ต้องโอน · ปิดยอดทุกวันที่ 15 และวันสุดท้ายของเดือน</p>';
    shell(html);
    $('#po-prev').onclick = function () { S.poP = prAdd(pr, -1); viewAdmin('payouts'); };
    $('#po-next').onclick = function () { S.poP = prAdd(pr, 1); viewAdmin('payouts'); };
    if ($('#po-split')) $('#po-split').onclick = function () { splitsModal(); };
    $$('[data-posp]').forEach(function (b) { b.onclick = function () { splitsModal(b.dataset.posp); }; });
    if ($('#po-reopen')) $('#po-reopen').onclick = function () { confirmBox('เปิดงวด ' + prLabel(pr) + ' ใหม่?', 'ตัวเลขจะคำนวณใหม่ ทำได้เฉพาะเมื่อยังไม่ได้โอนเงินผู้สอนของงวดนี้', 'เปิดงวดใหม่', true).then(function (y) { if (y) api('fin.reopen', { period: pr }).then(function () { toast('เปิดงวดใหม่แล้ว'); viewAdmin('payouts'); }).catch(function (e) { toast(e.message, true); }); }); };
    $$('[data-popay]').forEach(function (b) { b.onclick = function () { var x = pays.filter(function (y) { return y.user_id === b.dataset.u && y.subject === b.dataset.s; })[0]; payModal(b.dataset.popay, x, P[b.dataset.u] || {}, subs[b.dataset.s], pr); }; });
    $$('[data-poslip]').forEach(function (b) { b.onclick = function () { busy(b, true); api('fin.payout.slip', { payout_id: b.dataset.poslip }).then(function (r) { busy(b, false); openModal(mhead('สลิปการโอน') + (r.mime === 'application/pdf' ? '<iframe title="สลิป" style="width:100%;height:70vh;border:0" src="data:application/pdf;base64,' + r.base64 + '"></iframe>' : '<img class="phbig" alt="สลิปการโอน" src="data:' + esc(r.mime) + ';base64,' + r.base64 + '">')); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
  }).catch(function (e) { shell('<h1>ส่วนแบ่งผู้สอน</h1><p class="err">' + esc(e.message) + '</p>'); });
}
function payModal(id, x, p, subj, pr) {
  var now = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 16);
  openModal(mhead('แนบสลิปโอน', 'บันทึกแล้วระบบส่งอีเมลแจ้งผู้สอน พร้อมยอดและสลิป') +
    '<div class="po-sum">' + tAv(p.photo, 'po-av') + '<div><b>' + esc(p.name || x.name) + '</b><span>วิชา' + esc(subj) + ' · ' + esc(prLabel(pr)) + '</span></div><b class="amt">' + money2(x.settle) + '</b></div>' +
    (p.account_no ? '<div class="accbox"><div><span>ธนาคาร</span><b>' + esc(p.bank_name || '-') + '</b></div><div><span>เลขบัญชี</span><b class="mono-n">' + esc(p.account_no) + '</b><button type="button" class="pill quiet s" id="pm-copy">คัดลอก</button></div><div><span>ชื่อบัญชี</span><b>' + esc(p.account_name || '-') + '</b></div></div>' : '<div class="note wait">ผู้สอนยังไม่ได้ใส่บัญชีรับเงินในโปรไฟล์</div>') +
    '<form class="form" id="pmf"><label class="f" for="pm-file">สลิปการโอน (รูปหรือ PDF)<input class="i" type="file" id="pm-file" accept="image/*,application/pdf" required></label>' +
    '<div class="row2"><label class="f" for="pm-at">เวลาที่โอน<input class="i" type="datetime-local" id="pm-at" value="' + now + '"></label>' + field('note', 'หมายเหตุ (ไม่ใส่ก็ได้)', '', { ph: 'เช่น เลขอ้างอิง' }) + '</div>' +
    '<p class="err" id="pmf-err" hidden></p><button class="pill">บันทึกว่าโอนแล้ว</button></form>');
  if ($('#pm-copy')) $('#pm-copy').onclick = function () { var t = String(p.account_no); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('คัดลอกเลขบัญชีแล้ว'); }).catch(function () { toast(t); }); };
  $('#pmf').onsubmit = function (e) {
    e.preventDefault(); var btn = $('#pmf button:not([type=button])'), er = $('#pmf-err'), file = $('#pm-file').files[0]; er.hidden = true;
    if (!file) { er.textContent = 'เลือกไฟล์สลิปก่อน'; er.hidden = false; return; }
    busy(btn, true);
    var send = function (slip) { api('fin.payout.pay', { payout_id: id, slip: slip, paid_at: new Date($('#pm-at').value + ':00+07:00').toISOString(), note: $('#f-note').value }).then(function () { closeModal(); toast('บันทึกแล้ว ส่งอีเมลแจ้งผู้สอนแล้ว'); viewAdmin('payouts'); }).catch(function (x2) { busy(btn, false); er.textContent = x2.message; er.hidden = false; }); };
    if (file.type === 'application/pdf') { var rd = new FileReader(); rd.onload = function () { send({ mime: 'application/pdf', base64: String(rd.result).split(',')[1] }); }; rd.readAsDataURL(file); }
    else compressImage(file).then(send).catch(function () { busy(btn, false); er.textContent = 'เปิดไฟล์สลิปไม่ได้'; er.hidden = false; });
  };
}
function splitsModal(only) {
  api('fin.splits').then(function (r) {
    var subs = S.cfg.subjects || {}, cur = only || S.spS || Object.keys(subs)[0];
    var today = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    var pname = function (id) { var x = r.people.filter(function (y) { return y.user_id === id; })[0]; return x ? x.name + ' (' + x.full + ')' : id; };
    var draw = function () {
      S.spS = cur;
      var vs = (r.splits[cur] || []).slice().reverse();
      var cand = r.people.filter(function (x) { return x.role === 'admin' || x.subjects.indexOf(cur) >= 0; });
      var last = vs[0] ? vs[0].parts : cand.filter(function (x) { return x.role === 'teacher'; }).map(function (x, i, a) { return { user_id: x.user_id, pct: Math.round(100 / a.length * 100) / 100 }; });
      openModal(mhead('ตั้งสัดส่วนผู้สอน', 'แบ่งยอดสุทธิของวิชา (ยอดขาย − รายจ่ายวิชา) ให้ผู้สอน รวมกันต้องได้ 100% · มีผลกับยอดขายตั้งแต่วันที่เลือก') +
        '<div class="sp-tabs" role="tablist">' + Object.keys(subs).map(function (k) { return '<button type="button" data-sps="' + k + '" aria-pressed="' + (k === cur) + '">' + esc(subs[k]) + '</button>'; }).join('') + '</div>' +
        '<div class="msec"><h3>สัดส่วนที่ใช้อยู่</h3></div>' +
        (vs.length ? '<div class="stack" style="gap:8px">' + vs.map(function (v, i) { return '<div class="sp-v' + (i === 0 ? ' on' : '') + '"><div><b>ตั้งแต่ ' + thDate(v.from + 'T12:00:00+07:00') + '</b><span>' + v.parts.map(function (x) { return esc(pname(x.user_id)) + ' ' + x.pct + '%'; }).join(' · ') + '</span></div><button type="button" class="link sm" data-spdel="' + esc(v.from) + '">ลบ</button></div>'; }).join('') + '</div>' : '<p class="hint">ยังไม่ได้ตั้ง ตอนนี้แบ่งเท่ากันระหว่างผู้สอนของวิชานี้</p>') +
        '<div class="msec"><h3>ตั้งสัดส่วนใหม่</h3></div><form class="form" id="spf"><label class="f" for="sp-from">มีผลตั้งแต่วันที่<input class="i" type="date" id="sp-from" value="' + today + '"></label>' +
        '<div id="sp-rows" class="stack" style="gap:8px"></div><button type="button" class="pill quiet s" id="sp-add" style="justify-self:start">+ เพิ่มผู้รับ</button>' +
        '<p class="hint" id="sp-sum"></p><p class="err" id="spf-err" hidden></p><button class="pill">บันทึกสัดส่วน</button></form>', true);
      var rows = last.map(function (x) { return { user_id: x.user_id, pct: x.pct }; });
      var paint = function () {
        $('#sp-rows').innerHTML = rows.map(function (x, i) { return '<div class="sp-r"><select class="i" data-spu="' + i + '" aria-label="ผู้รับ">' + cand.map(function (c) { return '<option value="' + esc(c.user_id) + '"' + (c.user_id === x.user_id ? ' selected' : '') + '>' + esc(c.name + ' · ' + c.full) + '</option>'; }).join('') + '</select><input class="i" data-spp="' + i + '" inputmode="decimal" value="' + x.pct + '" aria-label="เปอร์เซ็นต์"><span>%</span><button type="button" class="link sm" data-spx="' + i + '">ลบ</button></div>'; }).join('');
        var tot = rows.reduce(function (a, x) { return a + (Number(x.pct) || 0); }, 0);
        $('#sp-sum').innerHTML = 'รวม <b style="color:' + (Math.abs(tot - 100) < 0.01 ? 'var(--ok)' : 'var(--no)') + '">' + (Math.round(tot * 100) / 100) + '%</b>';
        $$('[data-spu]').forEach(function (s) { s.onchange = function () { rows[+s.dataset.spu].user_id = s.value; }; });
        $$('[data-spp]').forEach(function (s) { s.oninput = function () { rows[+s.dataset.spp].pct = s.value; var t2 = rows.reduce(function (a, x) { return a + (Number(x.pct) || 0); }, 0); $('#sp-sum').innerHTML = 'รวม <b style="color:' + (Math.abs(t2 - 100) < 0.01 ? 'var(--ok)' : 'var(--no)') + '">' + (Math.round(t2 * 100) / 100) + '%</b>'; }; });
        $$('[data-spx]').forEach(function (b) { b.onclick = function () { rows.splice(+b.dataset.spx, 1); paint(); }; });
      };
      paint();
      $('#sp-add').onclick = function () { var free = cand.filter(function (c) { return !rows.some(function (x) { return x.user_id === c.user_id; }); })[0]; if (!free) return toast('ไม่มีผู้สอนคนอื่นในวิชานี้ ตั้งยศผู้สอนก่อนที่หน้า ผู้ใช้และยศ', true); rows.push({ user_id: free.user_id, pct: 0 }); paint(); };
      $$('[data-sps]').forEach(function (b) { b.onclick = function () { cur = b.dataset.sps; draw(); }; });
      $$('[data-spdel]').forEach(function (b) { b.onclick = function () { busy(b, true); api('fin.splits.save', { subject: cur, from: b.dataset.spdel, remove: true }).then(function (x) { r = x; toast('ลบแล้ว'); draw(); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
      $('#spf').onsubmit = function (e) {
        e.preventDefault(); var btn = $('#spf button:not([type=button])'), er = $('#spf-err'); er.hidden = true; busy(btn, true);
        api('fin.splits.save', { subject: cur, from: $('#sp-from').value, parts: rows.map(function (x) { return { user_id: x.user_id, pct: Number(x.pct) || 0 }; }) }).then(function (x) { r = x; toast('บันทึกสัดส่วนแล้ว'); closeModal(); viewAdmin('payouts'); }).catch(function (x2) { busy(btn, false); er.textContent = x2.message; er.hidden = false; });
      };
    };
    draw();
  }).catch(function (e) { toast(e.message, true); });
}

/* ─── โปรไฟล์ผู้สอน ─── */
function aTeachers(shell) {
  api('admin.teachers').then(function (list) {
    var subs = S.cfg.subjects || {};
    shell('<div class="spread"><h1>ผู้สอน</h1><span class="sub">เพิ่มหรือนำผู้สอนออกได้ที่นี่ · โปรไฟล์สร้างให้อัตโนมัติเมื่อได้ยศผู้สอน</span></div><div id="team"></div><h3 style="font-size:17px">โปรไฟล์ผู้สอน</h3>' +
      '<div class="tc-grid">' + list.map(function (t) {
        return '<a class="tc" href="#/admin/tprofile/' + esc(t.user_id) + '">' + tAv(t.photo_url, 'tc-av') + '<div><b>' + esc(t.display_name) + '</b><span>' + esc(t.title || '') + '</span><div class="rowx" style="gap:6px;margin-top:6px">' +
          (t.role === 'admin' ? '<span class="chip soft">เจ้าของ/แอดมิน</span>' : '') + t.subjects.map(function (k) { return '<span class="chip soft">' + esc(subs[k] || k) + '</span>'; }).join('') +
          '<span class="chip ' + (t.has_bank ? 'ok' : 'no') + '">' + (t.has_bank ? 'มีบัญชีรับเงิน' : 'ยังไม่มีบัญชีรับเงิน') + '</span><span class="chip soft">สอน ' + t.courses + ' คอร์ส</span></div></div></a>';
      }).join('') + '</div>');
    teamCard($('#team'));
  }).catch(function (e) { shell('<h1>ผู้สอน</h1><p class="err">' + esc(e.message) + '</p>'); });
}
function aTProfile(shell, uid) {
  api('teacher.profile', uid ? { user_id: uid } : {}).then(function (t) {
    var st = { photo_url: t.photo_url, bio: t.bio.slice() };
    var prev = function () {
      var name = ($('#f-display_name') || {}).value || t.display_name, title = ($('#f-title') || {}).value || '';
      $('#tp-prev').innerHTML = '<div class="inst">' + '<div class="ph">' + (st.photo_url ? '<img src="' + esc(imgSrc(st.photo_url)) + '" alt="">' : '<img src="' + CATSRC + '" alt="" class="cat">') + '</div><div class="stack" style="gap:4px;flex:1;min-width:200px"><span class="sub">ผู้สอน</span><h3 style="font-size:20px">' + esc(name) + '</h3>' + (title ? '<p class="ink2 sm">' + esc(title) + '</p>' : '') +
        (st.bio.length ? '<ul class="bl">' + st.bio.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '') + '</div></div>';
      $('#tp-photo').innerHTML = st.photo_url ? '<img src="' + esc(imgSrc(st.photo_url)) + '" alt="">' : '<img src="' + CATSRC + '" alt="" class="cat">';
    };
    var bio = function () {
      $('#tp-bio').innerHTML = st.bio.map(function (l, i) { return '<div class="bi"><span>' + esc(l) + '</span><span class="bi-a"><button type="button" data-bu="' + i + '" aria-label="เลื่อนขึ้น"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-bd="' + i + '" aria-label="เลื่อนลง"' + (i < st.bio.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" class="del" data-bx="' + i + '">ลบ</button></span></div>'; }).join('') || '<p class="hint">ยังไม่มีประวัติ เพิ่มได้ด้านล่าง</p>';
      $$('[data-bu]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.bu, x = st.bio[i]; st.bio[i] = st.bio[i - 1]; st.bio[i - 1] = x; bio(); }; });
      $$('[data-bd]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.bd, x = st.bio[i]; st.bio[i] = st.bio[i + 1]; st.bio[i + 1] = x; bio(); }; });
      $$('[data-bx]').forEach(function (b) { b.onclick = function () { st.bio.splice(+b.dataset.bx, 1); bio(); }; });
      prev();
    };
    var mine = !uid || uid === S.user.user_id;
    shell('<div class="spread"><h1>' + (mine ? 'โปรไฟล์ผู้สอนของฉัน' : 'โปรไฟล์ผู้สอน') + '</h1>' + (isAdm() && !mine ? '<a class="link sm" href="#/admin/teachers">← ผู้สอนทั้งหมด</a>' : '') + '</div>' +
      (mine && (S.user.profile_todo || []).length ? '<div class="note wait"><b>กรอกโปรไฟล์ให้ครบก่อนเริ่มใช้งาน</b><br>ยังขาด: ' + S.user.profile_todo.map(function (k) { return { name: 'ชื่อที่แสดง', photo: 'รูปโปรไฟล์', bank: 'บัญชีรับส่วนแบ่ง (ชื่อบัญชี ธนาคาร เลขที่บัญชี)' }[k] || k; }).join(' · ') + '</div>' : t.auto ? '<div class="note plain">สร้างจากข้อมูลตอนสมัครของ ' + esc(t.full_name) + ' ตรวจแล้วกดบันทึกเพื่อใช้บนหน้าเว็บ</div>' : '') +
      '<div class="tp"><form class="card form" id="tpf">' +
      '<div class="tp-ph"><span class="tp-img" id="tp-photo"></span><div class="stack" style="gap:6px"><label class="pill s" style="cursor:pointer;justify-self:start">อัปโหลดรูปใหม่<input type="file" id="tp-file" accept="image/*" hidden></label><span class="hint">รูปนี้ขึ้นทุกคอร์สที่สอน' + (t.courses.length ? ' ' + t.courses.length + ' คอร์ส' : '') + '</span></div></div>' +
      '<div class="row2">' + field('display_name', 'ชื่อที่แสดง', t.display_name, { ph: 'เช่น พี่หมีลี่' }) + '<label class="f">ชื่อจริง (จากตอนสมัคร)<input class="i" value="' + esc(t.full_name) + '" disabled></label></div>' +
      field('title', 'คำโปรยใต้ชื่อ', t.title, { ph: 'เช่น ที่ 1 คณะสหเวชศาสตร์ จุฬาฯ' }) +
      '<div class="f">ประวัติ (เรียงลำดับได้)<div class="stack" style="gap:6px" id="tp-bio"></div><div class="rowx" style="flex-wrap:nowrap"><input class="i" id="tp-add" placeholder="เพิ่มประวัติ เช่น ผลงาน รางวัล ประสบการณ์" maxlength="200"><button type="button" class="pill quiet s" id="tp-addb">เพิ่ม</button></div></div>' +
      '<div class="msec"><h3>บัญชีรับส่วนแบ่ง</h3><p class="hint">เห็นได้แค่เจ้าของบัญชีกับเจ้าของเว็บ</p></div>' +
      '<div class="row2">' + field('account_name', 'ชื่อบัญชี', t.account_name) + field('bank_name', 'ธนาคาร', t.bank_name, { ph: 'เช่น กสิกรไทย' }) + '</div>' + field('account_no', 'เลขที่บัญชี', t.account_no, { mode: 'numeric' }) +
      '<p class="err" id="tpf-err" hidden></p><button class="pill" style="justify-self:start">บันทึกโปรไฟล์</button></form>' +
      '<div class="stack" style="gap:8px;align-content:start"><span class="sub">ตัวอย่างที่ขึ้นในหน้าคอร์ส</span><div id="tp-prev"></div>' + (t.courses.length ? '<p class="hint">สอน: ' + t.courses.map(function (c) { return esc(c.title); }).join(', ') + '</p>' : '<p class="hint">ยังไม่ได้ผูกกับคอร์สไหน แอดมินเลือกผู้สอนได้ในหน้าแก้คอร์ส</p>') + '</div></div>');
    bio();
    ['display_name', 'title'].forEach(function (k) { $('#f-' + k).oninput = prev; });
    var addB = function () { var v = $('#tp-add').value.trim(); if (!v) return; st.bio.push(v); $('#tp-add').value = ''; bio(); };
    $('#tp-addb').onclick = addB; $('#tp-add').onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); addB(); } };
    $('#tp-file').onchange = function () {
      var f = this.files[0]; if (!f) return; var lab = this.parentNode; busy(lab, true);
      compressImage(f, 800, true).then(function (img) { return api('admin.upload', img); }).then(function (r) { busy(lab, false); st.photo_url = r.url; prev(); toast('อัปโหลดรูปแล้ว กดบันทึกเพื่อใช้'); }).catch(function (e) { busy(lab, false); toast(e.message, true); });
    };
    $('#tpf').onsubmit = function (e) {
      e.preventDefault(); var btn = $('#tpf > button'), er = $('#tpf-err'); er.hidden = true; busy(btn, true);
      var d = formData($('#tpf')); d.bio = st.bio; d.photo_url = st.photo_url || ''; if (uid) d.user_id = uid;
      api('teacher.profile.save', d).then(function () { return api('me'); }).then(function (me) { busy(btn, false); var was = (S.user.profile_todo || []).length; if (me && me.user_id === S.user.user_id) S.user.profile_todo = me.profile_todo || []; S.courses = null; S.tlist = null; if (was && !S.user.profile_todo.length) { toast('โปรไฟล์ครบแล้ว เริ่มใช้งานได้เลย'); viewAdmin('dash'); } else toast(S.user.profile_todo && S.user.profile_todo.length ? 'บันทึกแล้ว ยังขาดข้อมูลบางส่วน' : 'บันทึกโปรไฟล์แล้ว หน้าคอร์สอัปเดตภายในไม่กี่นาที'); if (S.user.profile_todo && S.user.profile_todo.length) viewAdmin('tprofile'); }).catch(function (x) { busy(btn, false); er.textContent = x.message; er.hidden = false; });
    };
  }).catch(function (e) { shell('<h1>โปรไฟล์ผู้สอน</h1><p class="err">' + esc(e.message) + '</p>'); });
}

/* ─── สีประจำคอร์ส: จานสีแบบ Material ชี้เพื่อดูเฉด คลิกเพื่อเลือก ─── */
var MPAL = [['แดง', 'ffcdd2 ef9a9a e57373 ef5350 f44336 e53935 d32f2f c62828 b71c1c'], ['ชมพู', 'f8bbd0 f48fb1 f06292 ec407a e91e63 d81b60 c2185b ad1457 880e4f'],
  ['ม่วง', 'e1bee7 ce93d8 ba68c8 ab47bc 9c27b0 8e24aa 7b1fa2 6a1b9a 4a148c'], ['ม่วงเข้ม', 'd1c4e9 b39ddb 9575cd 7e57c2 673ab7 5e35b1 512da8 4527a0 311b92'],
  ['คราม', 'c5cae9 9fa8da 7986cb 5c6bc0 3f51b5 3949ab 303f9f 283593 1a237e'], ['น้ำเงิน', 'bbdefb 90caf9 64b5f6 42a5f5 2196f3 1e88e5 1976d2 1565c0 0d47a1'],
  ['ฟ้า', 'b3e5fc 81d4fa 4fc3f7 29b6f6 03a9f4 039be5 0288d1 0277bd 01579b'], ['ฟ้าอมเขียว', 'b2ebf2 80deea 4dd0e1 26c6da 00bcd4 00acc1 0097a7 00838f 006064'],
  ['เขียวหัวเป็ด', 'b2dfdb 80cbc4 4db6ac 26a69a 009688 00897b 00796b 00695c 004d40'], ['เขียว', 'c8e6c9 a5d6a7 81c784 66bb6a 4caf50 43a047 388e3c 2e7d32 1b5e20'],
  ['เขียวอ่อน', 'dcedc8 c5e1a5 aed581 9ccc65 8bc34a 7cb342 689f38 558b2f 33691e'], ['มะนาว', 'f0f4c3 e6ee9c dce775 d4e157 cddc39 c0ca33 afb42b 9e9d24 827717'],
  ['เหลือง', 'fff9c4 fff59d fff176 ffee58 ffeb3b fdd835 fbc02d f9a825 f57f17'], ['อำพัน', 'ffecb3 ffe082 ffd54f ffca28 ffc107 ffb300 ffa000 ff8f00 ff6f00'],
  ['ส้ม', 'ffe0b2 ffcc80 ffb74d ffa726 ff9800 fb8c00 f57c00 ef6c00 e65100'], ['ส้มเข้ม', 'ffccbc ffab91 ff8a65 ff7043 ff5722 f4511e e64a19 d84315 bf360c'],
  ['น้ำตาล', 'd7ccc8 bcaaa4 a1887f 8d6e63 795548 6d4c41 5d4037 4e342e 3e2723'], ['เทา', 'f5f5f5 eeeeee e0e0e0 bdbdbd 9e9e9e 757575 616161 424242 212121'],
  ['เทาอมฟ้า', 'cfd8dc b0bec5 90a4ae 78909c 607d8b 546e7a 455a64 37474f 263238']].map(function (h) { return [h[0], h[1].split(' ').map(function (x) { return '#' + x; })]; });
function hexLum(h) { var f = function (i) { var c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(1) + 0.7152 * f(3) + 0.0722 * f(5); }
/** ตัวแปรสีของคอร์ส: สีอ่อนเกินจะเข้มขึ้นให้ ตัวหนังสือบนปุ่มอ่านได้เสมอ */
function accVars(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return null;
  var light = hexLum(hex) > 0.36, acc = light ? 'color-mix(in srgb,' + hex + ' 58%,#000)' : hex;
  return { '--acc': acc, '--acc-soft': 'color-mix(in srgb,' + hex + ' 16%,var(--bg))', '--on-acc': '#fff', '--acc-raw': hex };
}
function accStyle(hex) { var v = accVars(hex); return v ? ' style="' + Object.keys(v).map(function (k) { return k + ':' + v[k]; }).join(';') + '"' : ''; }
function applyAcc(el, hex) { ['--acc', '--acc-soft', '--on-acc', '--acc-raw'].forEach(function (k) { el.style.removeProperty(k); }); var v = accVars(hex); if (v) Object.keys(v).forEach(function (k) { el.style.setProperty(k, v[k]); }); }
function palettePicker(id, value, subject) {
  var cell = function (hue, hex, i) { var dark = hexLum(hex) < 0.4; return '<button type="button" class="mp-c' + (hex === value ? ' on' : '') + '" data-hex="' + hex + '" data-name="' + hue + ' ' + ((i + 1) * 100) + '" style="background:' + hex + ';color:' + (dark ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.45)') + '" aria-label="' + hue + ' ' + ((i + 1) * 100) + '">' + ((i + 1) * 100) + '</button>'; };
  return '<div class="mp" id="' + id + '"><input type="hidden" name="accent" value="' + esc(value || '') + '"><div class="mp-top"><span class="mp-sw" id="' + id + '-sw"></span><div><b id="' + id + '-nm">' + (value ? esc(value) : 'ตามสีของวิชา') + '</b><span class="hint" id="' + id + '-hint">ชี้เพื่อดูเฉด คลิกเพื่อเลือก</span></div><button type="button" class="pill quiet s" data-mpreset="1">ใช้สีตามวิชา</button></div>' +
    '<div class="mp-scroll"><div class="mp-grid" role="group" aria-label="จานสีประจำคอร์ส">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return MPAL.map(function (h) { return cell(h[0], h[1][i], i); }).join(''); }).join('') + '</div></div>' +
    '<div class="mp-prev" id="' + id + '-pv"><span class="mp-k">' + esc((S.cfg.subjects || {})[subject] || '') + '</span><b>ตัวอย่างหน้าคอร์ส</b><span class="mp-btn">▶ ดูตอนตัวอย่างฟรี</span><span class="mp-chip">เรียนแล้ว 40%</span><i class="mp-bar"><i></i></i></div></div>';
}
function bindPalette(id, subject) {
  var box = $('#' + id); if (!box) return;
  var inp = $('input[name=accent]', box), sw = $('#' + id + '-sw'), nm = $('#' + id + '-nm'), hint = $('#' + id + '-hint'), pv = $('#' + id + '-pv');
  var show = function (hex, name, preview) {
    applyAcc(pv, hex); pv.classList.toggle('s-' + subject, !hex);
    sw.style.background = hex || 'var(--acc)'; nm.textContent = hex ? (name ? name + ' · ' : '') + hex : 'ตามสีของวิชา';
    hint.textContent = hex && hexLum(hex) > 0.36 ? 'สีอ่อน ระบบเข้มขึ้นให้บนปุ่มและตัวหนังสือ' : preview ? 'คลิกเพื่อเลือกสีนี้' : 'ชี้เพื่อดูเฉด คลิกเพื่อเลือก';
  };
  var cur = function () { var on = $('.mp-c.on', box); show(inp.value, on ? on.dataset.name : '', false); };
  $$('.mp-c', box).forEach(function (b) {
    b.onmouseenter = b.onfocus = function () { show(b.dataset.hex, b.dataset.name, true); };
    b.onclick = function () { $$('.mp-c.on', box).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); inp.value = b.dataset.hex; cur(); };
  });
  $('.mp-grid', box).onmouseleave = cur;
  $('[data-mpreset]', box).onclick = function () { $$('.mp-c.on', box).forEach(function (x) { x.classList.remove('on'); }); inp.value = ''; cur(); };
  cur();
}

/* ─── หน้าเรียน: ขาว / ดำ / ตามเครื่อง ─── */
var LMODE = store('ib_lmode') || 'auto';
var MQD = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyLearnMode(on) {
  var r = document.documentElement;
  S.inLearn = !!on;
  if (!on || !UI2()) { r.classList.remove('theater'); applyTheme(); return; }
  var dark = LMODE === 'dark' || (LMODE === 'auto' && MQD && MQD.matches);
  r.classList.toggle('theater', dark);
  r.setAttribute('data-theme', dark ? 'dark' : 'light');
}
if (MQD && MQD.addEventListener) MQD.addEventListener('change', function () { if (S.inLearn && LMODE === 'auto') applyLearnMode(true); });
function lmodeHtml() { return '<div class="thm lthm" role="group" aria-label="สีหน้าเรียน">' + [['auto', 'ตามเครื่อง'], ['light', 'หน้าเรียนสีขาว'], ['dark', 'หน้าเรียนสีดำ']].map(function (m) { return '<button type="button" data-lm="' + m[0] + '" aria-pressed="' + (LMODE === m[0]) + '" title="' + m[1] + '" aria-label="' + m[1] + '">' + ICON[m[0]] + '</button>'; }).join('') + '</div>'; }
function lmodeKnob(instant) {
  var g = $('.lmode'); if (!g) return; var on = $('[aria-pressed="true"]', g), k = $('.lm-k', g); if (!on || !k) return;
  if (instant) k.style.transition = 'none';
  k.style.transform = 'translateX(' + on.offsetLeft + 'px)'; k.style.width = on.offsetWidth + 'px';
  if (instant) { void k.offsetWidth; k.style.transition = ''; }
}
function bindLmode() {
  lmodeKnob(true);
  $$('[data-lm]').forEach(function (b) { b.onclick = function () { LMODE = b.dataset.lm; store('ib_lmode', LMODE === 'auto' ? null : LMODE); $$('[data-lm]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); lmodeKnob(); applyLearnMode(true); }; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lmodeKnob(true); });
}

/* ─── ทีมผู้สอน: เพิ่ม/นำออก และ % ปรับให้เอง ─── */
function teamCard(host, subjDefault) {
  Promise.all([api('fin.splits'), api('admin.users', { q: '' }).catch(function () { return []; })]).then(function (res) {
    var r = res[0], users = res[1], subs = S.cfg.subjects || {}, cur = S.tmS || subjDefault || Object.keys(subs)[0];
    var today = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), from = S.tmFrom || today, q = '';
    var person = function (id) { return r.people.filter(function (p) { return p.user_id === id; })[0] || { name: id, full: '' }; };
    var partsOf = function (sj) {
      var vs = (r.splits[sj] || []).filter(function (v) { return v.from <= from; }), v = vs[vs.length - 1];
      if (v && v.parts.length) return v.parts.map(function (x) { return { user_id: x.user_id, pct: Number(x.pct) }; });
      var ts = r.people.filter(function (p) { return p.role === 'teacher' && p.subjects.indexOf(sj) >= 0; });
      return ts.map(function (p) { return { user_id: p.user_id, pct: Math.round(10000 / ts.length) / 100 }; });
    };
    var L = partsOf(cur), dirty = false;
    var fix = function () { L.forEach(function (x) { x.pct = Math.round(x.pct * 100) / 100; }); var t = L.reduce(function (a, x) { return a + x.pct; }, 0); if (L.length) L[L.length - 1].pct = Math.round((L[L.length - 1].pct + 100 - t) * 100) / 100; };
    var paintBar = function () {
      var bs = $$('.tm-bar > span', host);
      L.forEach(function (x, i) { if (bs[i]) { bs[i].style.flexBasis = x.pct + '%'; bs[i].textContent = x.pct >= 14 ? person(x.user_id).name + ' ' + Math.round(x.pct) + '%' : ''; } });
      $$('.tm-p', host).forEach(function (el, i) { if (!L[i]) return; $('.tm-pc', el).value = Math.round(L[i].pct * 10) / 10; var rg = $('input[type=range]', el); if (document.activeElement !== rg) rg.value = Math.round(L[i].pct); });
      $('#tm-save', host).disabled = !dirty;
    };
    var draw = function () {
      S.tmS = cur;
      var inT = L.map(function (x) { return x.user_id; });
      var cands = q.length >= 2 ? users.filter(function (u) { return inT.indexOf(u.user_id) < 0 && [u.first_name, u.last_name, u.nickname, u.email].join(' ').toLowerCase().indexOf(q.toLowerCase()) >= 0; }).slice(0, 5) : [];
      host.innerHTML = '<div class="card tm"><div class="spread"><h3>ทีมผู้สอนและสัดส่วน</h3><div class="sp-tabs">' + Object.keys(subs).map(function (k) { return '<button type="button" data-tms="' + k + '" aria-pressed="' + (k === cur) + '">' + esc(subs[k]) + '</button>'; }).join('') + '</div></div>' +
        '<div class="tm-bar' + sc(cur) + '">' + (L.length ? L.map(function (x, i) { return '<span style="flex-basis:' + x.pct + '%;background:color-mix(in srgb,var(--acc) ' + (100 - i * 20) + '%,#0b0e12)"></span>'; }).join('') : '<span class="none">ยังไม่มีผู้รับส่วนแบ่ง</span>') + '</div>' +
        '<div class="stack" style="gap:8px">' + L.map(function (x, i) { var p = person(x.user_id); return '<div class="tm-p' + sc(cur) + '">' + tAv(p.photo, 'tm-av') + '<div class="tm-nm"><b>' + esc(p.name) + '</b><small>' + esc(p.full) + (p.role === 'admin' ? ' · เจ้าของ' : '') + '</small></div><input type="range" min="0" max="100" step="1" value="' + Math.round(x.pct) + '" data-tmr="' + i + '" aria-label="สัดส่วนของ ' + esc(p.name) + '"><label class="tm-pcw"><input class="i tm-pc" inputmode="decimal" data-tmn="' + i + '" value="' + x.pct + '" aria-label="เปอร์เซ็นต์"><span>%</span></label><button type="button" class="tm-x" data-tmx="' + esc(x.user_id) + '" aria-label="นำ ' + esc(p.name) + ' ออก">×</button></div>'; }).join('') + '</div>' +
        '<div class="tm-add"><input class="i" id="tm-q" placeholder="+ เพิ่มผู้สอน: พิมพ์ชื่อหรืออีเมลของคนที่สมัครแล้ว" value="' + esc(q) + '" autocomplete="off"><div class="stack" style="gap:6px" id="tm-c">' +
        cands.map(function (u) { return '<div class="tm-cand">' + uAv(u.user_id, u.has_photo) + '<span><b>' + esc(u.first_name + ' ' + u.last_name) + '</b> (' + esc(u.nickname) + ') <span class="sub" style="display:inline">' + esc(u.email) + '</span></span><button type="button" class="pill s" data-tma="' + esc(u.user_id) + '">เพิ่มเป็นผู้สอน' + esc(subs[cur]) + '</button></div>'; }).join('') +
        (q.length >= 2 && !cands.length ? '<span class="hint">ไม่พบผู้ใช้ ให้ผู้สอนสมัครสมาชิกก่อน</span>' : '') + '</div></div>' +
        '<div class="spread"><label class="rowx sm ink2" style="gap:8px">มีผลตั้งแต่<input class="i" type="date" id="tm-from" value="' + from + '" style="width:auto"></label><div class="rowx"><button type="button" class="pill quiet s" id="tm-eq">แบ่งเท่ากัน</button><button type="button" class="pill s" id="tm-save"' + (dirty ? '' : ' disabled') + '>บันทึกสัดส่วน</button></div></div>' +
        '<p class="hint">เพิ่มผู้สอน: ให้ยศผู้สอน ส่งอีเมลให้เข้ามากรอกโปรไฟล์ และแบ่ง % ใหม่เท่ากันทันที · นำออก: ส่วนของเขาแบ่งให้คนที่เหลือตามสัดส่วน และเอาออกจากคอร์สของวิชานี้ · งวดที่ปิดแล้วไม่เปลี่ยน</p></div>';
      hydrateAv(host); paintBar();
      $$('[data-tms]', host).forEach(function (b) { b.onclick = function () { cur = b.dataset.tms; L = partsOf(cur); dirty = false; q = ''; draw(); }; });
      $$('[data-tmr]', host).forEach(function (rg) { rg.oninput = function () {
        var i = +rg.dataset.tmr, nv = +rg.value, oth = L.filter(function (_, j) { return j !== i; }), rest = oth.reduce(function (a, x) { return a + x.pct; }, 0);
        if (!oth.length) { L[i].pct = 100; paintBar(); return; }
        L[i].pct = nv; oth.forEach(function (x) { x.pct = rest > 0 ? x.pct / rest * (100 - nv) : (100 - nv) / oth.length; }); fix(); dirty = true; paintBar();
      }; });
      $$('[data-tmn]', host).forEach(function (n) { n.onchange = function () { var i = +n.dataset.tmn, nv = Math.max(0, Math.min(100, Number(n.value) || 0)), oth = L.filter(function (_, j) { return j !== i; }), rest = oth.reduce(function (a, x) { return a + x.pct; }, 0); L[i].pct = nv; oth.forEach(function (x) { x.pct = rest > 0 ? x.pct / rest * (100 - nv) : (100 - nv) / (oth.length || 1); }); fix(); dirty = true; paintBar(); }; });
      $('#tm-eq', host).onclick = function () { L.forEach(function (x) { x.pct = 100 / L.length; }); fix(); dirty = true; paintBar(); };
      $('#tm-from', host).onchange = function () { from = this.value || today; S.tmFrom = from; L = partsOf(cur); dirty = false; draw(); };
      var qi = $('#tm-q', host); qi.oninput = function () { q = qi.value; var pos = qi.selectionStart; draw(); var n = $('#tm-q', host); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
      $$('[data-tma]', host).forEach(function (b) { b.onclick = function () { busy(b, true); api('admin.team.add', { user_id: b.dataset.tma, subject: cur, from: from }).then(function () { toast('เพิ่มผู้สอนแล้ว ส่งอีเมลให้กรอกโปรไฟล์แล้ว'); S.tlist = null; viewAdmin('teachers'); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
      $$('[data-tmx]', host).forEach(function (b) { b.onclick = function () { var p = person(b.dataset.tmx); confirmBox('นำ ' + p.name + ' ออกจากวิชา' + subs[cur] + '?', 'ส่วนแบ่งของเขาจะแบ่งให้คนที่เหลือตามสัดส่วน ตั้งแต่ ' + thDate(from + 'T12:00:00+07:00') + ' และเอาออกจากคอร์สของวิชานี้', 'นำออก', true).then(function (y) { if (!y) return; api('admin.team.remove', { user_id: b.dataset.tmx, subject: cur, from: from }).then(function () { toast('นำออกแล้ว'); S.tlist = null; viewAdmin('teachers'); }).catch(function (e) { toast(e.message, true); }); }); }; });
      $('#tm-save', host).onclick = function () { var b = this; busy(b, true); api('fin.splits.save', { subject: cur, from: from, parts: L.map(function (x) { return { user_id: x.user_id, pct: x.pct }; }) }).then(function (x) { r = x; dirty = false; busy(b, false); toast('บันทึกสัดส่วนแล้ว'); draw(); }).catch(function (e) { busy(b, false); toast(e.message, true); }); };
    };
    draw();
  }).catch(function (e) { host.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
}

/* ─── รายรับรายจ่าย ─── */
function ymNow() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 7); }
function ymAdd(ym, d) { var y = +ym.slice(0, 4), m = +ym.slice(5) - 1 + d; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + pad2(m + 1); }
function ymLabel(ym) { return TH_MONTHS[+ym.slice(5) - 1] + ' ' + (+ym.slice(0, 4) + 543); }
function money2(n) { n = Number(n) || 0; return (n < 0 ? '−' : '') + '฿' + Math.abs(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function settleText(t) {
  if (!t.settle) return '<span class="sub">ไม่ต้องโอน</span>';
  return t.settle > 0 ? '<b style="color:var(--ok)">INeedBio โอนให้ผู้สอน ' + money2(t.settle) + '</b>' : '<b style="color:var(--no)">ผู้สอนโอนส่วนแบ่งให้ INeedBio ' + money2(-t.settle) + '</b>';
}
function csvDownload(name, rows) {
  var txt = '﻿' + rows.map(function (r) { return r.map(function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function aFinance(shell) {
  var pr = S.finP || prNow(), sub = S.finS || '', tab = S.finT && S.finT !== 'summary' ? S.finT : 'income';
  api('fin.summary', { period: pr, subject: sub }).then(function (f) {
    var subs = S.cfg.subjects || {}, adm = f.admin, T = f.totals;
    var sname = function (k) { return subs[k] || 'ส่วนกลาง'; };
    var status = f.closed ? '<span class="badge b-ok">ปิดงวดแล้ว ' + thDate(f.closed_at) + '</span>' : pr === prNow() ? '<span class="badge b-soft">งวดปัจจุบัน ยอดยังเปลี่ยนได้</span>' : '<span class="badge b-wait">ยังไม่ปิดงวด</span>';
    var pend = f.expenses.filter(function (x) { return x.status === 'pending'; }).length;
    var kpi = function (k, lab, v, note) { return '<div class="kpi ' + k + '"><span>' + lab + '</span><b>' + money2(v) + '</b><span>' + note + '</span></div>'; };
    var html = '<div class="spread"><h1>รายรับรายจ่าย</h1><div class="rowx">' +
      '<button class="pill quiet s" id="fp-prev" aria-label="งวดก่อน">←</button><b style="min-width:150px;text-align:center">' + esc(prLabel(pr)) + '</b><button class="pill quiet s" id="fp-next" aria-label="งวดถัดไป"' + (pr >= prNow() ? ' disabled' : '') + '>→</button></div></div>' +
      '<div class="rowx" style="justify-content:space-between"><div class="ofold" role="group" aria-label="วิชา">' + (adm ? '<button data-fs="" aria-pressed="' + !sub + '">ทุกวิชา</button>' : '') + f.subjects.map(function (k) { return '<button class="s-' + k + '" data-fs="' + k + '" aria-pressed="' + (sub === k || (!adm && !sub && f.subjects.length === 1)) + '">' + esc(subs[k]) + '</button>'; }).join('') + '</div>' +
      '<div class="rowx">' + status + (f.closed ? '' : '<button class="pill ghost s" id="fx-add">+ บันทึกรายจ่าย</button>') + '<button class="pill quiet s" id="f-csv">ดาวน์โหลด CSV</button>' + '<a class="pill s" href="#/admin/payouts">' + (adm ? 'ส่วนแบ่งผู้สอน' : 'ส่วนแบ่งของฉัน') + ' →</a>' + '</div></div>' +
      '<div class="kpis">' + kpi('k2', 'รายรับ', T.income, f.income.length + ' รายการ') + kpi('', 'รายจ่าย', T.expense, adm && !sub && T.shared ? 'รวมส่วนกลาง ' + money2(T.shared) : (pend ? 'รออนุมัติอีก ' + pend + ' รายการ' : 'อนุมัติแล้ว')) +
      kpi('k1', 'ส่วนแบ่งผู้สอน', T.teachers, 'ยอดขายวิชา − รายจ่ายวิชา ไม่มีค่าแพลตฟอร์ม') + kpi('k3', 'ยังไม่มีผู้รับ / ส่วนกลาง', T.platform, adm && !sub ? 'ยอดที่ยังไม่ได้ตั้งผู้รับ − รายจ่ายส่วนกลาง' : 'ยอดของวิชานี้ที่ยังไม่มีผู้รับ') + '</div>' +
      '<div class="seg" role="tablist">' + [['income', 'รายรับ · ' + f.income.length], ['expense', 'รายจ่าย · ' + f.expenses.length + (pend ? ' (รอ ' + pend + ')' : '')], ['free', 'สิทธิ์ที่ไม่นับเงิน']].map(function (t) { return '<button data-ft="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'summary') {
      html += '<div class="tbl"><table style="min-width:620px"><thead><tr><th>วิชา</th><th class="num">รายรับ</th><th class="num">รายจ่าย</th><th class="num">สุทธิ</th><th class="num">แพลตฟอร์ม</th><th class="num">ผู้สอน</th></tr></thead><tbody>' +
        f.by_subject.map(function (x) { return '<tr><td>' + esc(x.name) + (x.unassigned ? '<div class="sub" style="color:var(--wait)">' + money2(x.unassigned) + ' ยังไม่มีผู้สอนรับ เข้าแพลตฟอร์ม</div>' : '') + '</td><td class="num">' + money2(x.income) + '</td><td class="num">' + money2(x.expense) + '</td><td class="num">' + money2(x.net) + '</td><td class="num">' + money2(x.platform) + ' <span class="sub">' + x.pct + '%</span></td><td class="num"><b>' + money2(x.pool) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' +
        '<h3 style="font-size:17px">ยอดโอนของผู้สอน</h3>' +
        (f.teachers.length ? '<div class="tbl"><table style="min-width:680px"><thead><tr><th>ผู้สอน</th><th class="num">ส่วนแบ่ง</th><th class="num">เงินที่เข้าบัญชีผู้สอนเอง</th><th>ต้องโอน</th><th>สถานะ</th></tr></thead><tbody>' + f.teachers.map(function (t) {
          var po = f.payouts.filter(function (x) { return x.user_id === t.user_id; })[0];
          return '<tr><td>' + esc(t.name) + '<div class="sub">' + t.subjects.map(sname).join(', ') + '</div></td><td class="num">' + money2(t.share) + '</td><td class="num">' + money2(t.held) + '</td><td>' + settleText(t) + '</td><td>' +
            (!f.closed ? '<span class="sub">รอปิดงวด</span>' : po ? (po.status === 'paid' ? '<span class="badge b-ok">โอนแล้ว</span>' + (po.paid_at ? '<div class="sub">' + thDate(po.paid_at) + (po.note ? ' · ' + esc(po.note) : '') + '</div>' : '') : adm ? '<button class="pill s" data-paid="' + esc(po.payout_id) + '">บันทึกว่าโอนแล้ว</button>' : '<span class="badge b-wait">รอโอน</span>') : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty"><p>ยังไม่มียอดของผู้สอนในเดือนนี้' + (adm ? ' · ตั้งยศผู้สอนที่หน้า ผู้ใช้และยศ' : '') + '</p></div>') +
        '<p class="hint">วิธีคิด: รายรับของวิชา − รายจ่ายของวิชา = สุทธิ → หักส่วนแบ่งแพลตฟอร์มตาม % ของวิชา → ที่เหลือแบ่งให้ผู้สอนตามสัดส่วนของแต่ละคอร์ส ถ้าเงินบางส่วนเข้าบัญชีผู้สอนโดยตรง (ตั้งเจ้าของบัญชีที่หน้า บัญชีรับเงิน) ระบบหักออกให้ แล้วบอกว่าใครต้องโอนให้ใคร</p>' +
        (adm ? '<div class="card spread"><div><h3>' + (f.closed ? 'งวดนี้ปิดแล้ว' : 'ปิดงวด ' + ymLabel(pr)) + '</h3><p class="sm ink2">' + (f.closed ? 'ตัวเลขถูกล็อกไว้ รายจ่ายของเดือนนี้เพิ่มหรือแก้ไม่ได้ ถ้ายังไม่ได้โอนเงินผู้สอน เปิดงวดใหม่ได้' : 'ล็อกตัวเลขเดือนนี้ แล้วสร้างรายการโอนให้ผู้สอนแต่ละคน รายการที่ตกหล่นให้ลงเดือนถัดไป') + '</p></div>' +
          (f.closed ? '<button class="pill quiet s" id="f-reopen">เปิดงวดใหม่</button>' : '<button class="pill s" id="f-close"' + (pr === ymNow() ? ' title="ปิดได้เมื่อสิ้นเดือน แต่ปิดก่อนก็ได้"' : '') + '>ปิดงวด</button>') + '</div>' : '');
    } else if (tab === 'income') {
      html += f.income.length ? '<div class="tbl"><table style="min-width:720px"><thead><tr><th>วันที่</th><th>นักเรียน</th><th>คอร์ส</th><th>ที่มา</th><th>เข้าบัญชี</th><th class="num">ยอด</th></tr></thead><tbody>' + f.income.map(function (x) {
        return '<tr' + (x.revoked ? ' style="opacity:.6"' : '') + '><td class="sub">' + thDate(x.date, true) + '</td><td>' + esc(x.student) + (x.nickname ? '<div class="sub">' + esc(x.nickname) + '</div>' : '') + '</td><td>' + esc(x.course_title) + '<div class="sub">' + esc(sname(x.subject)) + (x.bill_id ? ' · ' + esc(x.bill_id) : '') + '</div></td><td><span class="badge ' + (SRC_BADGE[x.source] || 'b-soft') + '">' + esc(x.source_label) + '</span>' + (x.revoked ? ' <span class="badge b-no">ถอนสิทธิ์ภายหลัง</span>' : '') + '</td><td class="sm">' + esc(x.account_label) + '</td><td class="num">' + money2(x.amount) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>ยังไม่มีรายรับในเดือนนี้</p></div>';
    } else if (tab === 'expense') {
      html += f.expenses.length ? '<div class="tbl"><table style="min-width:720px"><thead><tr><th>วันที่</th><th>วิชา · หมวด</th><th>รายละเอียด</th><th>บันทึกโดย</th><th class="num">ยอด</th><th>สถานะ</th><th></th></tr></thead><tbody>' + f.expenses.map(function (x) {
        var mine = x.created_by === S.user.user_id, canEdit = !f.closed && (adm || (mine && x.status === 'pending'));
        return '<tr' + (x.status === 'rejected' ? ' style="opacity:.55"' : '') + '><td class="sub">' + thDate(x.date) + '</td><td>' + esc(x.subject_name) + '<div class="sub">' + esc(x.category) + '</div></td><td class="sm">' + esc(x.note || '–') + (x.has_receipt ? ' <button class="link sm" data-rc="' + esc(x.expense_id) + '">ใบเสร็จ</button>' : '') + '</td><td class="sm">' + esc(x.created_by_name) + '</td><td class="num">' + money2(x.amount) + '</td>' +
          '<td>' + (x.status === 'approved' ? '<span class="badge b-ok">อนุมัติ</span>' : x.status === 'rejected' ? '<span class="badge b-no">ไม่อนุมัติ</span>' : '<span class="badge b-wait">รออนุมัติ</span>') + '</td><td><div class="acts">' +
          (adm && x.status === 'pending' && !f.closed ? '<button class="pill s" data-xd="approve" data-x="' + esc(x.expense_id) + '">อนุมัติ</button><button class="pill quiet s" data-xd="reject" data-x="' + esc(x.expense_id) + '">ไม่อนุมัติ</button>' : '') +
          (canEdit ? '<button class="pill quiet s" data-xe="' + esc(x.expense_id) + '">แก้ไข</button>' : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>ยังไม่มีรายจ่ายในเดือนนี้</p></div>';
      if (!adm) html += '<p class="hint">รายจ่ายที่ผู้สอนบันทึก จะหักจากยอดของวิชาเมื่อแอดมินอนุมัติแล้ว</p>';
    } else {
      html += '<div class="kpis">' + [['grant', 'ให้ฟรี'], ['legacy', 'นักเรียนรุ่นเก่า'], ['test', 'ทดสอบโดยทีมงาน'], ['bill0', 'บิล 0 บาท (โค้ดลดเต็มจำนวน)']].map(function (k) { return '<div class="kpi"><span>' + k[1] + '</span><b>' + (f.free[k[0]] || 0) + '</b><span>สิทธิ์ในเดือนนี้ ไม่นับเป็นรายรับ</span></div>'; }).join('') + '</div>';
    }
    shell(html);
    $('#fp-prev').onclick = function () { S.finP = prAdd(pr, -1); viewAdmin('finance'); };
    $('#fp-next').onclick = function () { S.finP = prAdd(pr, 1); viewAdmin('finance'); };
    $$('[data-fs]').forEach(function (b) { b.onclick = function () { S.finS = b.dataset.fs; viewAdmin('finance'); }; });
    $$('[data-ft]').forEach(function (b) { b.onclick = function () { S.finT = b.dataset.ft; viewAdmin('finance'); }; });
    if ($('#fx-add')) $('#fx-add').onclick = function () { expenseModal(null, f); };
    $$('[data-xe]').forEach(function (b) { b.onclick = function () { expenseModal(f.expenses.filter(function (x) { return x.expense_id === b.dataset.xe; })[0], f); }; });
    $$('[data-xd]').forEach(function (b) { b.onclick = function () { busy(b, true); api('fin.expense.decide', { expense_id: b.dataset.x, decision: b.dataset.xd }).then(function () { toast('บันทึกแล้ว'); refreshPending().catch(function () {}); viewAdmin('finance'); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
    $$('[data-rc]').forEach(function (b) { b.onclick = function () { busy(b, true); api('fin.receipt', { expense_id: b.dataset.rc }).then(function (r) { busy(b, false); openModal(mhead('ใบเสร็จ') + (r.mime === 'application/pdf' ? '<iframe title="ใบเสร็จ" style="width:100%;height:70vh;border:0" src="data:application/pdf;base64,' + r.base64 + '"></iframe>' : '<img class="phbig" alt="ใบเสร็จ" src="data:' + esc(r.mime) + ';base64,' + r.base64 + '">')); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
    $$('[data-paid]').forEach(function (b) { b.onclick = function () { payoutModal(b.dataset.paid); }; });
    $('#f-csv').onclick = function () {
      var rows = [['ประเภท', 'วันที่', 'วิชา', 'รายการ', 'รายละเอียด', 'ที่มา/สถานะ', 'ยอด (บาท)']];
      f.income.forEach(function (x) { rows.push(['รายรับ', x.date.slice(0, 10), sname(x.subject), x.course_title, x.student + (x.bill_id ? ' ' + x.bill_id : ''), x.source_label + (x.revoked ? ' (ถอนภายหลัง)' : ''), x.amount]); });
      f.expenses.forEach(function (x) { rows.push(['รายจ่าย', x.date, x.subject_name, x.category, x.note, x.status === 'approved' ? 'อนุมัติ' : x.status === 'pending' ? 'รออนุมัติ' : 'ไม่อนุมัติ', -x.amount]); });
      rows.push([]); rows.push(['สรุป', '', '', 'วิชา', 'รายรับ', 'รายจ่าย', 'แพลตฟอร์ม', 'ผู้สอน']);
      f.by_subject.forEach(function (x) { rows.push(['', '', '', x.name, x.income, x.expense, x.platform, x.pool]); });
      rows.push([]); rows.push(['ผู้สอน', '', '', 'ชื่อ', 'ส่วนแบ่ง', 'เงินเข้าบัญชีตัวเอง', 'ยอดโอน (+ แพลตฟอร์มโอนให้ / − ผู้สอนโอนให้)']);
      f.teachers.forEach(function (t) { rows.push(['', '', '', t.name, t.share, t.held, t.settle]); });
      csvDownload('ineedbio-' + pr + (sub ? '-' + sub : '') + '.csv', rows);
    };
    if ($('#f-rules')) $('#f-rules').onclick = rulesModal;
    if ($('#f-close')) $('#f-close').onclick = function () {
      var b = this;
      confirmBox('ปิดงวด ' + ymLabel(pr) + '?', 'ตัวเลขเดือนนี้จะถูกล็อก และสร้างรายการโอนให้ผู้สอน ' + f.teachers.length + ' คน', 'ปิดงวด').then(function (y) {
        if (!y) return; busy(b, true); api('fin.close', { period: pr }).then(function () { toast('ปิดงวดแล้ว'); viewAdmin('finance'); }).catch(function (e) { busy(b, false); toast(e.message, true); });
      });
    };
    if ($('#f-reopen')) $('#f-reopen').onclick = function () {
      confirmBox('เปิดงวด ' + ymLabel(pr) + ' ใหม่?', 'ทำได้เฉพาะเมื่อยังไม่ได้บันทึกการโอนเงินผู้สอนของเดือนนี้', 'เปิดงวดใหม่', true).then(function (y) {
        if (!y) return; api('fin.reopen', { period: pr }).then(function () { toast('เปิดงวดใหม่แล้ว'); viewAdmin('finance'); }).catch(function (e) { toast(e.message, true); });
      });
    };
  }).catch(function (e) { shell('<h1>รายรับรายจ่าย</h1><p class="err">' + esc(e.message) + '</p>'); });
}
function expenseModal(x, f) {
  var subs = S.cfg.subjects || {}, adm = f.admin;
  x = x || { date: new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), subject: S.finS || (f.subjects.length === 1 ? f.subjects[0] : ''), category: f.categories[0], amount: '', note: '' };
  var opts = (adm ? [['', 'ส่วนกลาง (INeedBio รับเอง)']] : []).concat(f.subjects.map(function (k) { return [k, subs[k]]; }));
  openModal(mhead(x.expense_id ? 'แก้ไขรายจ่าย' : 'บันทึกรายจ่าย', adm ? 'รายจ่ายของวิชาจะหักก่อนแบ่งส่วนแบ่ง รายจ่ายส่วนกลาง INeedBio รับเอง' : 'แอดมินจะตรวจและอนุมัติ แล้วจึงหักจากยอดของวิชา') +
    '<form class="form" id="xf"><div class="row2">' + field('date', 'วันที่จ่าย', x.date, { type: 'date' }) + field('amount', 'ยอดเงิน (บาท)', x.amount, { mode: 'decimal' }) + '</div>' +
    '<div class="row2">' + field('subject', 'วิชา', x.subject, { options: opts }) + field('category', 'หมวด', x.category, { options: f.categories }) + '</div>' +
    field('note', 'รายละเอียด', x.note, { ph: 'เช่น ยิงโฆษณา IG 7 วัน' }) +
    '<label class="f">ใบเสร็จ (รูปหรือ PDF ไม่บังคับ)<input class="i" type="file" id="xf-file" accept="image/*,application/pdf"></label>' +
    '<p class="err" id="xf-err" hidden></p><div class="rowx"><button class="pill">บันทึก</button>' + (x.expense_id ? '<button type="button" class="pill danger" id="xf-del">ลบรายการ</button>' : '') + '</div></form>', true);
  $('#xf').onsubmit = function (e) {
    e.preventDefault(); var btn = $('#xf button:not([type=button])'), er = $('#xf-err'), d = formData($('#xf')); er.hidden = true; busy(btn, true);
    var file = $('#xf-file').files[0];
    var send = function (rc) { if (x.expense_id) d.expense_id = x.expense_id; if (rc) d.receipt = rc; api('fin.expense.save', d).then(function () { closeModal(); toast(adm ? 'บันทึกแล้ว' : 'ส่งให้แอดมินอนุมัติแล้ว'); S.finT = 'expense'; S.finP = prOf(d.date); viewAdmin('finance'); }).catch(function (x2) { busy(btn, false); er.textContent = x2.message; er.hidden = false; }); };
    if (!file) return send(null);
    if (file.type === 'application/pdf') { var rd = new FileReader(); rd.onload = function () { send({ mime: 'application/pdf', base64: String(rd.result).split(',')[1] }); }; rd.readAsDataURL(file); }
    else compressImage(file).then(send).catch(function () { busy(btn, false); er.textContent = 'เปิดไฟล์ใบเสร็จไม่ได้'; er.hidden = false; });
  };
  if ($('#xf-del')) $('#xf-del').onclick = function () { api('fin.expense.delete', { expense_id: x.expense_id }).then(function () { closeModal(); toast('ลบแล้ว'); viewAdmin('finance'); }).catch(function (e) { toast(e.message, true); }); };
}
function payoutModal(id) {
  openModal(mhead('บันทึกว่าโอนแล้ว') + '<form class="form" id="pof">' + field('note', 'หมายเหตุ (เช่น เลขอ้างอิงการโอน)', '') + '<p class="err" id="pof-err" hidden></p><button class="pill">บันทึก</button></form>');
  submitForm('#pof', 'fin.payout.paid', '#pof-err', function () { closeModal(); toast('บันทึกแล้ว'); viewAdmin('finance'); }, function () { return { payout_id: id }; });
}
function rulesModal() {
  api('fin.rules').then(function (r) {
    var subs = S.cfg.subjects || {};
    var tname = function (id) { var t = r.teachers.filter(function (x) { return x.user_id === id; })[0]; return t ? t.name : id; };
    openModal(mhead('ตั้งค่าส่วนแบ่ง', 'ใช้คำนวณยอดของเดือนที่ยังไม่ปิดงวด เดือนที่ปิดแล้วไม่เปลี่ยน') + '<form class="form" id="rf">' +
      '<div class="msec"><h3>ส่วนแบ่งแพลตฟอร์ม (INeedBio) ต่อวิชา</h3><p class="hint">คิดจากยอดสุทธิของวิชา (รายรับ − รายจ่ายของวิชา) ที่เหลือเป็นของผู้สอน</p></div><div class="row2">' +
      Object.keys(subs).map(function (k) { return field('pct_' + k, subs[k] + ' (%)', r.platform_pct[k], { mode: 'decimal' }); }).join('') + '</div>' +
      '<div class="msec"><h3>สัดส่วนผู้สอนของแต่ละคอร์ส</h3><p class="hint">ไม่ตั้ง = แบ่งเท่ากันระหว่างผู้สอนทุกคนของวิชานั้น ถ้าตั้ง ต้องรวมกันได้ 100%</p></div>' +
      (r.teachers.length ? r.courses.map(function (c) {
        var ts = r.teachers.filter(function (t) { return t.subjects.indexOf(c.subject) >= 0; });
        if (!ts.length) return '';
        var val = function (id) { var x = (c.split || []).filter(function (y) { return y.user_id === id; })[0]; return x ? x.pct : ''; };
        return '<div class="card" style="padding:12px 14px;display:grid;gap:8px"><b class="sm">' + esc(c.title) + ' <span class="sub" style="display:inline">· ' + esc(subs[c.subject]) + (c.custom ? '' : ' · ตอนนี้แบ่งเท่ากัน') + '</span></b><div class="row2">' +
          ts.map(function (t) { return field('sp_' + c.course_id + '__' + t.user_id, esc(t.name) + ' (%)', val(t.user_id), { mode: 'decimal', ph: c.custom ? '0' : String(Math.round(100 / ts.length * 100) / 100) }); }).join('') + '</div></div>';
      }).join('') : '<p class="note plain">ยังไม่มีผู้สอน ตั้งยศผู้สอนได้ที่หน้า ผู้ใช้และยศ</p>') +
      '<p class="err" id="rf-err" hidden></p><button class="pill">บันทึก</button></form>', true);
    $('#rf').onsubmit = function (e) {
      e.preventDefault(); var btn = $('#rf button'), er = $('#rf-err'); er.hidden = true; busy(btn, true);
      var pct = {}; Object.keys(subs).forEach(function (k) { pct[k] = Number($('#f-pct_' + k).value || 0); });
      var splits = r.courses.map(function (c) {
        var parts = r.teachers.filter(function (t) { return t.subjects.indexOf(c.subject) >= 0; }).map(function (t) { var el = $('#f-sp_' + c.course_id + '__' + t.user_id); return { user_id: t.user_id, pct: el && el.value !== '' ? Number(el.value) : 0 }; });
        return { course_id: c.course_id, split: parts.filter(function (x) { return x.pct > 0; }) };
      });
      api('fin.rules.save', { platform_pct: pct, splits: splits }).then(function () { closeModal(); toast('บันทึกส่วนแบ่งแล้ว'); viewAdmin('finance'); }).catch(function (x) { busy(btn, false); er.textContent = x.message; er.hidden = false; });
    };
  }).catch(function (e) { toast(e.message, true); });
}

/* ─── นักเรียนรุ่นเก่า ─── */
function parseNames(text) {
  return String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(String).map(function (l) {
    var p = l.split(/\t|,|\|/).map(function (x) { return x.trim(); }).filter(String);
    if (p.length === 1) { var w = p[0].split(/\s+/); p = [w.slice(0, -1).join(' ') || w[0], w.length > 1 ? w[w.length - 1] : '']; if (/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง)$/.test(w[0]) && w.length > 2) p = [w[0] + w[1], w.slice(2).join(' ')]; }
    return { first_name: p[0] || '', last_name: p[1] || '', nickname: p[2] || '' };
  }).filter(function (r) { return !/^ชื่อ$|^first/i.test(r.first_name); });
}
function aLegacy(shell) {
  var st = S.lgS || 'claimed', q = S.lgQ || '';
  Promise.all([api('admin.legacy', { status: st, q: q }), api('admin.courses')]).then(function (r) {
    var L = r[0], cs = r[1]; S.legacyQ = L.claims.length;
    var who = function (u) { return u ? esc(u.name) + ' (' + esc(u.nickname) + ')<div class="sub">' + esc(u.email) + ' · สมัคร ' + thDate(u.created_at) + '</div>' : '<span class="sub">–</span>'; };
    shell('<div class="spread"><h1>นักเรียนรุ่นเก่า</h1><button class="pill s" id="lg-imp">+ นำเข้ารายชื่อ</button></div>' +
      '<p class="ink2 sm">นักเรียนที่สมัครก่อนมีเว็บ เมื่อสมัครบนเว็บด้วยชื่อ-นามสกุลที่ตรงกับรายชื่อ (มีคนเดียวและยังไม่มีใครใช้) ระบบเปิดคอร์สเดิมให้ทันทีโดยไม่นับเป็นรายรับ กรณีชื่อซ้ำหรือถูกใช้ไปแล้วจะมาอยู่ในคิวด้านล่าง</p>' +
      '<div class="kpis"><div class="kpi"><span>รายชื่อทั้งหมด</span><b>' + L.total + '</b><span>' + L.batches.length + ' ชุด</span></div><div class="kpi k1"><span>ย้ายมาแล้ว</span><b>' + L.claimed + '</b><span>' + (L.total ? Math.round(L.claimed / L.total * 100) : 0) + '%</span></div><div class="kpi"><span>ยังไม่มาสมัคร</span><b>' + L.open + '</b><span>รายชื่อที่ยังว่าง</span></div><div class="kpi' + (L.claims.length ? ' hot' : '') + '"><span>รอแอดมินยืนยัน</span><b>' + L.claims.length + '</b><span>ชื่อซ้ำ / ถูกใช้แล้ว / ใกล้เคียง</span></div></div>' +
      (L.claims.length ? '<h3 style="font-size:17px">รอยืนยัน</h3><div class="stack" style="gap:10px">' + L.claims.map(function (c) {
        return '<div class="card" style="display:grid;gap:10px"><div class="spread"><div class="urow">' + (c.user && c.user.has_photo ? '<button class="pav s" data-lph="' + esc(c.user.user_id) + '" data-n="' + esc(c.user.nickname) + '" title="ดูรูป">' + uAv(c.user.user_id, true) + '</button>' : '<span class="pav s">' + uAv('', false) + '</span>') + '<div>' + who(c.user) + '</div></div><span class="badge b-wait">' + esc(c.reason) + '</span></div>' +
          '<div class="stack" style="gap:6px">' + c.candidates.map(function (x) {
            return '<label class="chk-l" style="align-items:flex-start"><input type="radio" name="lc_' + esc(c.claim_id) + '" value="' + esc(x.legacy_id) + '"><span><b>' + esc(x.name) + '</b>' + (x.nickname ? ' (' + esc(x.nickname) + ')' : '') + ' · ' + esc(x.batch || '–') + ' · ' + x.courses.map(esc).join(', ') + (x.user ? '<br><span class="sub">ตอนนี้อยู่กับ ' + esc(x.user.name) + ' (' + esc(x.user.email) + ') ถ้ายืนยัน ระบบจะย้ายสิทธิ์มาบัญชีนี้</span>' : '') + '</span></label>';
          }).join('') + '</div><div class="rowx"><button class="pill s" data-lok="' + esc(c.claim_id) + '">ยืนยันรายชื่อที่เลือก</button><button class="pill quiet s" data-lno="' + esc(c.claim_id) + '">ไม่ใช่นักเรียนเก่า</button></div></div>';
      }).join('') + '</div>' : '') +
      '<div class="spread"><div class="seg" role="group">' + [['claimed', 'ย้ายมาแล้ว'], ['open', 'ยังไม่มาสมัคร'], ['all', 'ทั้งหมด']].map(function (t) { return '<button data-lgs="' + t[0] + '" aria-pressed="' + (st === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<form id="lgqf"><input class="i" id="lgq" style="width:220px" placeholder="ค้นหาชื่อ" value="' + esc(q) + '"></form></div>' +
      (L.list.length ? '<div class="tbl"><table style="min-width:720px"><thead><tr><th>ชื่อในรายชื่อเก่า</th><th>ชุด · คอร์ส</th><th>บัญชีบนเว็บ</th><th></th></tr></thead><tbody>' + L.list.map(function (x) {
        return '<tr><td><b>' + esc(x.name) + '</b>' + (x.nickname ? ' (' + esc(x.nickname) + ')' : '') + '</td><td class="sm">' + esc(x.batch || '–') + '<div class="sub">' + x.courses.map(esc).join(', ') + '</div></td><td>' + (x.user ? who(x.user) + '<div class="sub">' + (x.match === 'admin' ? 'แอดมินยืนยัน' : 'จับคู่อัตโนมัติ') + ' · ' + thDate(x.claimed_at, true) + '</div>' : '<span class="sub">ยังไม่มาสมัคร</span>') + '</td>' +
          '<td><div class="acts">' + (x.user && x.user.has_photo ? '<button class="pill quiet s" data-lph="' + esc(x.user.user_id) + '" data-n="' + esc(x.user.nickname) + '">ดูรูป</button>' : '') + (x.user ? '<button class="pill quiet s" data-lrel="' + esc(x.legacy_id) + '" data-n="' + esc(x.user.nickname) + '">ไม่ใช่ตัวจริง · ถอนสิทธิ์</button>' : '<button class="pill quiet s" data-ldel="' + esc(x.legacy_id) + '">ลบ</button>') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>' + (L.total ? 'ไม่มีรายการ' : 'ยังไม่ได้นำเข้ารายชื่อ กด "+ นำเข้ารายชื่อ" แล้ววางชื่อ-นามสกุลได้เลย') + '</p></div>'));
    $('#lg-imp').onclick = function () { legacyImportModal(cs); };
    $$('[data-lgs]').forEach(function (b) { b.onclick = function () { S.lgS = b.dataset.lgs; viewAdmin('legacy'); }; });
    $('#lgqf').onsubmit = function (e) { e.preventDefault(); S.lgQ = $('#lgq').value.trim(); viewAdmin('legacy'); };
    $$('[data-lph]').forEach(function (b) { b.onclick = function () { api('admin.user.photo', { user_id: b.dataset.lph }).then(function (ph) { if (ph) openModal(mhead('รูปของ ' + esc(b.dataset.n)) + '<img class="phbig" alt="" src="data:' + esc(ph.mime) + ';base64,' + ph.base64 + '">'); }).catch(function (e) { toast(e.message, true); }); }; });
    $$('[data-lok]').forEach(function (b) { b.onclick = function () { var pick = $('input[name="lc_' + b.dataset.lok + '"]:checked'); if (!pick) return toast('เลือกรายชื่อที่ตรงกับนักเรียนคนนี้ก่อน', true); busy(b, true); api('admin.legacy.decide', { claim_id: b.dataset.lok, decision: 'approve', legacy_id: pick.value }).then(function () { toast('เปิดคอร์สเดิมให้แล้ว'); viewAdmin('legacy'); }).catch(function (e) { busy(b, false); toast(e.message, true); }); }; });
    $$('[data-lno]').forEach(function (b) { b.onclick = function () { api('admin.legacy.decide', { claim_id: b.dataset.lno, decision: 'reject' }).then(function () { toast('ปิดคำขอแล้ว'); viewAdmin('legacy'); }).catch(function (e) { toast(e.message, true); }); }; });
    $$('[data-lrel]').forEach(function (b) { b.onclick = function () { confirmBox('ถอนสิทธิ์นักเรียนเก่าจาก ' + b.dataset.n + '?', 'คอร์สที่ได้จากรายชื่อนี้จะถูกถอน รายชื่อกลับมาว่างให้ตัวจริงใช้', 'ถอนสิทธิ์', true).then(function (y) { if (!y) return; api('admin.legacy.release', { legacy_id: b.dataset.lrel }).then(function () { toast('ถอนสิทธิ์แล้ว'); viewAdmin('legacy'); }).catch(function (e) { toast(e.message, true); }); }); }; });
    $$('[data-ldel]').forEach(function (b) { b.onclick = function () { api('admin.legacy.delete', { legacy_id: b.dataset.ldel }).then(function () { toast('ลบแล้ว'); viewAdmin('legacy'); }).catch(function (e) { toast(e.message, true); }); }; });
  }).catch(function (e) { shell('<h1>นักเรียนรุ่นเก่า</h1><p class="err">' + esc(e.message) + '</p>'); });
}
function legacyImportModal(cs) {
  openModal(mhead('นำเข้ารายชื่อนักเรียนรุ่นเก่า', 'วางรายชื่อจาก Excel หรือ Google Sheets ได้เลย บรรทัดละ 1 คน') + '<form class="form" id="lif">' +
    field('batch', 'ชื่อชุด (ไว้ดูทีหลังว่ามาจากไหน)', '', { ph: 'เช่น ชีวะ สอวน. รุ่นปี 2568' }) +
    '<div class="f">นักเรียนชุดนี้เคยซื้อคอร์สไหน<div class="stack" style="gap:6px">' + cs.map(function (c) { return '<label class="chk-l"><input type="checkbox" name="lc_' + esc(c.course_id) + '"> ' + esc(c.title) + ' <span class="sub" style="display:inline">· ' + esc(c.subject_name) + '</span></label>'; }).join('') + '</div></div>' +
    field('names', 'รายชื่อ', '', { area: true, ph: 'ชื่อ[Tab]นามสกุล[Tab]ชื่อเล่น (ชื่อเล่นไม่ใส่ก็ได้)\nหรือ "ชื่อ นามสกุล" คั่นด้วยเว้นวรรค\n\nนาย ปิติ ยินดี\nมานี มีนา' }) +
    '<div id="li-prev" class="hint"></div><p class="err" id="lif-err" hidden></p><button class="pill" id="li-go">นำเข้า</button></form>', true);
  $('#f-names').style.minHeight = '200px';
  var upd = function () { var rows = parseNames($('#f-names').value); $('#li-prev').innerHTML = rows.length ? 'อ่านได้ ' + rows.length + ' คน · ตัวอย่าง: ' + rows.slice(0, 3).map(function (r) { return '<b>' + esc(r.first_name) + '</b> / <b>' + esc(r.last_name) + '</b>'; }).join(', ') : ''; };
  $('#f-names').oninput = upd;
  $('#lif').onsubmit = function (e) {
    e.preventDefault(); var btn = $('#li-go'), er = $('#lif-err'); er.hidden = true;
    var ids = cs.filter(function (c) { var x = $('#lif [name="lc_' + c.course_id + '"]'); return x && x.checked; }).map(function (c) { return c.course_id; });
    busy(btn, true);
    api('admin.legacy.import', { batch: $('#f-batch').value, course_ids: ids, rows: parseNames($('#f-names').value) }).then(function (r) {
      closeModal(); toast('นำเข้า ' + r.added + ' คน' + (r.duplicate ? ' · ซ้ำ ' + r.duplicate : '') + (r.invalid_rows.length ? ' · อ่านไม่ได้ ' + r.invalid_rows.length + ' บรรทัด' : '') + (r.matched_existing ? ' · จับคู่กับคนที่สมัครแล้ว ' + r.matched_existing + ' คน' : '')); S.lgS = 'all'; viewAdmin('legacy');
    }).catch(function (x) { busy(btn, false); er.textContent = x.message; er.hidden = false; });
  };
}

/* ─── บันทึกการแก้ไข ─── */
var LOG_LABEL = { 'course.edit': 'แก้คอร์ส', 'course.create': 'สร้างคอร์ส', 'lesson.edit': 'แก้ตอน', 'lesson.create': 'เพิ่มตอน', 'lesson.delete': 'ลบตอน', 'lesson.bulk': 'วางหลายตอน', 'lesson.reorder': 'เรียงตอน',
  grant: 'ให้สิทธิ์', revoke: 'ถอนสิทธิ์', 'bill.approved': 'อนุมัติบิล', 'bill.rejected': 'ไม่อนุมัติบิล', 'expense.create': 'บันทึกรายจ่าย', 'expense.edit': 'แก้รายจ่าย', 'expense.delete': 'ลบรายจ่าย', 'expense.approved': 'อนุมัติรายจ่าย', 'expense.rejected': 'ไม่อนุมัติรายจ่าย',
  'finance.close': 'ปิดงวด', 'finance.reopen': 'เปิดงวดใหม่', 'finance.paid': 'บันทึกโอนเงินผู้สอน', 'finance.pct': 'แก้ส่วนแบ่งแพลตฟอร์ม', 'finance.split': 'แก้สัดส่วนผู้สอน', 'playlists.save': 'ผูกเพลย์ลิสต์', 'playlists.sync': 'ซิงก์เพลย์ลิสต์',
  'legacy.import': 'นำเข้านักเรียนเก่า', 'legacy.auto': 'จับคู่นักเรียนเก่าอัตโนมัติ', 'legacy.approve': 'ยืนยันนักเรียนเก่า', 'legacy.reject': 'ปฏิเสธนักเรียนเก่า', 'legacy.release': 'ถอนสิทธิ์นักเรียนเก่า', 'user.update': 'เปลี่ยนยศ/สถานะผู้ใช้', upload: 'อัปโหลดรูป', settings: 'แก้ตั้งค่า' };
function aLog(shell) {
  var q = S.logQ || '', to = !!S.logT;
  api('admin.log', { q: q, teachers_only: to }).then(function (rows) {
    shell('<h1>บันทึกการแก้ไข</h1><p class="ink2 sm">ทุกการเปลี่ยนแปลงของแอดมิน ผู้สอน และระบบอัตโนมัติ 300 รายการล่าสุด</p><div class="rowx"><div class="seg" role="group"><button data-lt="" aria-pressed="' + !to + '">ทุกคน</button><button data-lt="1" aria-pressed="' + to + '">เฉพาะผู้สอน</button></div>' +
      '<form id="logf"><input class="i" id="logq" style="width:240px" placeholder="ค้นหา ชื่อ การกระทำ รายละเอียด" value="' + esc(q) + '"></form></div>' +
      (rows.length ? '<div class="tbl"><table style="min-width:720px"><thead><tr><th>เวลา</th><th>ใคร</th><th>ทำอะไร</th><th>รายละเอียด</th></tr></thead><tbody>' + rows.map(function (r) {
        return '<tr><td class="sub" style="white-space:nowrap">' + thDate(r.time, true) + '</td><td>' + esc(r.who) + (r.role === 'teacher' ? ' <span class="badge b-soft">ผู้สอน</span>' : r.who === 'SYSTEM' ? ' <span class="badge b-soft">อัตโนมัติ</span>' : '') + '</td><td>' + esc(LOG_LABEL[r.action] || r.action) + '</td><td class="sm" style="word-break:break-word">' + esc(r.detail) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>ไม่มีรายการ</p></div>'));
    $$('[data-lt]').forEach(function (b) { b.onclick = function () { S.logT = b.dataset.lt; viewAdmin('log'); }; });
    $('#logf').onsubmit = function (e) { e.preventDefault(); S.logQ = $('#logq').value.trim(); viewAdmin('log'); };
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}

/* ─── ตั้งยศ ─── */
function roleModal(u) {
  var subs = S.cfg.subjects || {};
  openModal(mhead('ยศของ ' + esc(u.nickname || u.first_name), esc(u.first_name + ' ' + u.last_name) + ' · ' + esc(u.email)) + '<form class="form" id="rolef">' +
    '<div class="stack" style="gap:10px">' + [['student', 'นักเรียน', 'ใช้งานเว็บปกติ'], ['teacher', 'ผู้สอน', 'เห็นและจัดการเฉพาะคอร์สในวิชาที่เลือก ดูรายรับรายจ่ายของวิชาตัวเอง ให้สิทธิ์ฟรีได้ แก้ราคา บัญชีรับเงิน และอนุมัติสลิปไม่ได้'], ['admin', 'แอดมิน', 'เข้าถึงทุกอย่างในเว็บ']].map(function (r) {
      return '<label class="chk-l" style="align-items:flex-start"><input type="radio" name="role" value="' + r[0] + '"' + (u.role === r[0] ? ' checked' : '') + '><span><b>' + r[1] + '</b><br><span class="sub">' + r[2] + '</span></span></label>';
    }).join('') + '</div>' +
    '<div class="f" id="role-subj">วิชาที่ดูแล<div class="rowx">' + Object.keys(subs).map(function (k) { return '<label class="chk-l"><input type="checkbox" name="rs_' + k + '"' + ((u.subjects || []).indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(subs[k]) + '</label>'; }).join('') + '</div></div>' +
    '<p class="hint">เปลี่ยนยศแล้ว ผู้ใช้คนนี้จะถูกออกจากระบบ ต้องเข้าสู่ระบบใหม่</p><p class="err" id="rolef-err" hidden></p><button class="pill">บันทึกยศ</button></form>');
  var sync = function () { var v = ($('#rolef input[name=role]:checked') || {}).value; $('#role-subj').hidden = v !== 'teacher'; };
  $$('#rolef input[name=role]').forEach(function (r) { r.onchange = sync; }); sync();
  $('#rolef').onsubmit = function (e) {
    e.preventDefault(); var btn = $('#rolef button'), er = $('#rolef-err'); er.hidden = true;
    var role = ($('#rolef input[name=role]:checked') || {}).value, sj = Object.keys(subs).filter(function (k) { return $('#rolef [name=rs_' + k + ']').checked; });
    busy(btn, true);
    api('admin.user.update', { user_id: u.user_id, role: role, subjects: sj }).then(function () { S.owners = null; closeModal(); toast('บันทึกยศแล้ว'); viewAdmin('users'); }).catch(function (x) { busy(btn, false); er.textContent = x.message; er.hidden = false; });
  };
}

function aAccounts(shell) {
  loadAccs(true).then(function (accs) {
    var subs = S.cfg.subjects || {};
    var mapped = {}; accs.forEach(function (a) { if (a.status !== 'inactive') a.subjects.forEach(function (s) { if (!mapped[s]) mapped[s] = a.label; }); });
    var free = Object.keys(subs).filter(function (k) { return !mapped[k]; });
    shell('<div class="spread"><h1>บัญชีรับเงิน</h1><button class="pill s" id="new-acc">+ เพิ่มบัญชี</button></div>' +
      '<p class="ink2 sm">แต่ละวิชารับเงินเข้าบัญชีของตัวเองได้ ระบบเลือกบัญชีให้คอร์สตามลำดับนี้: 1) บัญชีที่ตั้งไว้ในหน้าแก้ไขคอร์ส 2) บัญชีที่ผูกกับวิชา 3) บัญชีหลัก ถ้าตะกร้ามีคอร์สหลายบัญชี ระบบจะแยกเป็นหลายบิลให้เอง</p>' +
      '<div class="cgrid">' + accs.map(function (a) {
        return '<button class="ccard acard" data-acc="' + esc(a.account_id) + '"><div class="spread"><b>' + esc(a.label) + '</b><span class="badge ' + (a.status === 'inactive' ? 'b-soft' : 'b-ok') + '">' + (a.status === 'inactive' ? 'ปิดใช้งาน' : 'ใช้งาน') + '</span></div>' +
          '<span class="sm">' + esc(accLine(a)) + '</span>' +
          '<div class="rowx" style="gap:6px">' + (a.subjects.length ? a.subjects.map(function (s) { return '<span class="badge b-soft s-' + esc(s) + '"><i class="dot"></i>' + esc(subs[s] || s) + '</span>'; }).join('') : '<span class="sm muted">ยังไม่ผูกวิชา</span>') + '</div>' +
          (a.courses.length ? '<span class="sm muted">ตั้งเฉพาะคอร์ส: ' + a.courses.map(esc).join(', ') + '</span>' : '') +
          (a.pending ? '<span class="sm" style="color:var(--c-chem)">รอตรวจ ' + a.pending + ' บิล</span>' : '') + '</button>';
      }).join('') +
      '<div class="ccard acard def"><div class="spread"><b>บัญชีหลัก</b><span class="badge b-soft">ค่าเริ่มต้น</span></div><span class="sm">พร้อมเพย์ ' + esc(ppFmt(S.cfg.promptpay_id)) + ' ชื่อบัญชี ' + esc(S.cfg.promptpay_name || '') + '</span>' +
      '<span class="sm muted">ใช้กับ: ' + (free.length ? free.map(function (k) { return esc(subs[k]); }).join(', ') : 'ไม่มีวิชาที่ใช้บัญชีนี้') + ' · แก้ได้ที่ <a href="#/admin/settings">ตั้งค่า</a></span></div></div>');
    $('#new-acc').onclick = function () { accountModal(null); };
    $$('[data-acc]').forEach(function (b) { b.onclick = function () { accountModal(accs.filter(function (a) { return a.account_id === b.dataset.acc; })[0]); }; });
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function accountModal(a) {
  if (!S.owners) return api('fin.rules').then(function (r) { S.owners = r.owners; accountModal(a); }).catch(function (e) { toast(e.message, true); });
  var subs = S.cfg.subjects || {};
  a = a || { method: 'promptpay', status: 'active', subjects: [], sort_order: 0 };
  openModal(mhead(a.account_id ? 'แก้ไขบัญชีรับเงิน' : 'เพิ่มบัญชีรับเงิน', 'นักเรียนเห็นเลขบัญชี ชื่อบัญชี QR และหมายเหตุ ส่วนชื่อเรียกเห็นเฉพาะแอดมิน') + '<form class="form" id="af2">' +
    '<div class="row2">' + field('label', 'ชื่อเรียก (เห็นเฉพาะแอดมิน)', a.label, { ph: 'เช่น บัญชีพี่หมอซัน' }) + field('method', 'ช่องทางรับเงิน', a.method, { options: [['promptpay', 'พร้อมเพย์ (สร้าง QR ใส่ยอดให้)'], ['bank', 'เลขบัญชีธนาคาร']] }) + '</div>' +
    '<div class="m-pp">' + field('promptpay_id', 'เบอร์มือถือหรือเลขบัตรประชาชนที่ผูกพร้อมเพย์ (ไม่มีก็เว้นว่าง)', a.promptpay_id, { mode: 'numeric', ph: '08x-xxx-xxxx', hint: 'เว้นว่างได้ถ้าใส่รูป QR ด้านล่าง ช่องที่ว่างจะไม่แสดงให้น้องเห็น' }) + '</div>' +
    '<div class="row2 m-bank">' + field('bank', 'ธนาคาร', a.bank, { options: [['', '— เลือก —']].concat((S.cfg.banks || []).filter(function (x) { return !/Wallet|อื่นๆ/.test(x); }).map(function (x) { return [x, x]; })) }) + field('account_no', 'เลขบัญชี (ไม่มีก็เว้นว่าง)', a.account_no, { mode: 'numeric', ph: 'xxx-x-xxxxx-x' }) + '</div>' +
    field('account_name', 'ชื่อบัญชี (ต้องตรงกับที่ขึ้นในแอปธนาคาร · ไม่ใส่ก็ได้)', a.account_name) +
    field('qr_url', 'รูป QR รับเงินของตัวเอง', a.qr_url, { upload: true, ph: 'https://...', hint: 'ถ้าใส่ จะแสดงรูปนี้แทน QR ที่ระบบสร้าง · ต้องมีเลขพร้อมเพย์/เลขบัญชี หรือรูป QR อย่างน้อย 1 อย่าง' }) +
    '<div class="row2">' + field('ig', 'IG ที่ให้น้องแจ้งโอน (ไม่ใส่ = IG หลัก)', a.ig, { ph: S.cfg.contact_ig || 'ineedbiochem' }) + field('sort_order', 'ลำดับ', a.sort_order, { mode: 'numeric' }) + '</div>' +
    field('note', 'หมายเหตุที่นักเรียนเห็น', a.note, { ph: 'เช่น โอนแล้วรออนุมัติไม่เกิน 12 ชม.' }) +
    '<div class="f">ใช้กับวิชา<div class="rowx">' + Object.keys(subs).map(function (k) { return '<label class="chk-l"><input type="checkbox" name="subj_' + k + '"' + (a.subjects.indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(subs[k]) + '</label>'; }).join('') + '</div><span class="hint">ถ้าเลือกวิชาเดียวกันหลายบัญชี ระบบใช้บัญชีที่ลำดับน้อยกว่า อยากให้บางคอร์สใช้บัญชีนี้ ตั้งได้ในหน้าแก้ไขคอร์ส</span></div>' +
    field('status', 'สถานะ', a.status, { options: [['active', 'ใช้งาน'], ['inactive', 'ปิดใช้งาน (คอร์สจะไปใช้บัญชีถัดไป)']] }) +
    field('owner_id', 'เงินเข้าบัญชีของใคร (ใช้คิดยอดโอนในรายรับรายจ่าย)', a.owner_id || '', { options: [['', 'INeedBio']].concat(S.owners.map(function (o) { return [o.user_id, o.name + (o.role === 'teacher' ? ' (ผู้สอน)' : ' (แอดมิน)')]; })), hint: 'ถ้าเป็นบัญชีของผู้สอน ระบบจะนับว่าผู้สอนถือเงินส่วนนี้อยู่แล้ว แล้วคำนวณว่าผู้สอนต้องโอนส่วนแบ่งคืนเท่าไร' }) +
    '<p class="err" id="af2-err" hidden></p><div class="rowx"><button class="pill">บันทึก</button>' + (a.account_id ? '<button type="button" class="pill danger" id="acc-del">ลบ</button>' : '') + '</div></form>', true);
  var sync = function () { var bank = $('#f-method').value === 'bank'; $('.m-pp').hidden = bank; $('.m-bank').hidden = !bank; };
  $('#f-method').onchange = sync; sync();
  submitForm('#af2', 'admin.account.save', '#af2-err', function () { S.accs = null; closeModal(); toast('บันทึกแล้ว'); viewAdmin('accounts'); }, function () {
    return { account_id: a.account_id || '', subjects: Object.keys(subs).filter(function (k) { var c = $('#af2 [name=subj_' + k + ']'); return c && c.checked; }) };
  });
  if ($('#acc-del')) $('#acc-del').onclick = function () {
    confirmBox('ลบ ' + a.label + '?', 'บิลเก่ายังเก็บเลขบัญชีเดิมไว้ คอร์สที่ใช้บัญชีนี้จะไปใช้บัญชีตามวิชาหรือบัญชีหลักแทน', 'ลบ', true).then(function (y) {
      if (!y) return; api('admin.account.delete', { account_id: a.account_id }).then(function () { S.accs = null; toast('ลบแล้ว'); viewAdmin('accounts'); }).catch(function (e) { toast(e.message, true); });
    });
  };
}

function cpLabel(c) { return c.kind === 'each' ? 'ลดคอร์สละ ' + baht(c.value) : c.kind === 'percent' ? 'ลด ' + c.value + '%' + (Number(c.max_discount) ? ' สูงสุด ' + baht(c.max_discount) : '') : 'ลด ' + baht(c.value); }
function toLocalInput(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d)) return ''; return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function aCoupons(shell) {
  Promise.all([api('admin.coupons'), api('admin.courses')]).then(function (r) {
    var list = r[0], cs = r[1], subs = S.cfg.subjects || {}, now = Date.now();
    shell('<div class="spread"><h1>โค้ดส่วนลด</h1><button class="pill s" id="new-cp">+ สร้างโค้ด</button></div>' +
      '<p class="ink2 sm">นักเรียนใส่โค้ดได้ 1 โค้ดต่อคำสั่งซื้อในหน้าตะกร้า ระบบนับสิทธิ์ทันทีที่สร้างคำสั่งซื้อ และคืนสิทธิ์ถ้าบิลถูกยกเลิกหรือหมดเวลา</p>' +
      (list.length ? '<div class="tbl"><table style="min-width:760px"><thead><tr><th>โค้ด</th><th>ส่วนลด</th><th>ใช้กับ</th><th class="num">ใช้ไป</th><th>ช่วงเวลา</th><th class="num">ยอดขาย</th><th></th></tr></thead><tbody>' + list.map(function (c) {
        var ended = c.ends_at && new Date(c.ends_at).getTime() < now;
        return '<tr><td><b class="mono-n">' + esc(c.code) + '</b> ' + (c.status === 'inactive' ? '<span class="badge b-soft">ปิด</span>' : ended ? '<span class="badge b-soft">หมดอายุ</span>' : '<span class="badge b-ok">ใช้ได้</span>') + (c.note ? '<div class="sub">' + esc(c.note) + '</div>' : '') + '</td>' +
          '<td class="sm">' + cpLabel(c) + (Number(c.min_total) ? '<div class="sub">ขั้นต่ำ ' + baht(c.min_total) + '</div>' : '') + '</td>' +
          '<td class="sm">' + (c.scope === 'all' ? 'ทุกคอร์ส' : c.scope === 'subject' ? c.targets.map(function (s) { return esc(subs[s] || s); }).join(', ') : c.targets.map(function (id) { var x = cs.filter(function (y) { return y.course_id === id; })[0]; return esc(x ? x.title : id); }).join('<br>')) + '</td>' +
          '<td class="num">' + c.used + (Number(c.max_uses) ? ' / ' + c.max_uses : '') + (Number(c.per_user) ? '<div class="sub">คนละ ' + c.per_user + ' ครั้ง</div>' : '') + '</td>' +
          '<td class="sm">' + (c.starts_at ? thDate(c.starts_at, true) : 'ตอนนี้') + ' – ' + (c.ends_at ? thDate(c.ends_at, true) : 'ไม่หมดอายุ') + '</td>' +
          '<td class="num">' + baht(c.revenue) + (c.discount_given ? '<div class="sub">ลดไป ' + baht(c.discount_given) + '</div>' : '') + '</td>' +
          '<td><div class="acts"><button class="pill quiet s" data-cp="' + esc(c.code) + '">แก้ไข</button></div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>ยังไม่มีโค้ดส่วนลด</p></div>'));
    $('#new-cp').onclick = function () { couponModal(null, cs); };
    $$('[data-cp]').forEach(function (b) { b.onclick = function () { couponModal(list.filter(function (c) { return c.code === b.dataset.cp; })[0], cs); }; });
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function couponModal(c, cs) {
  var subs = S.cfg.subjects || {};
  c = c || { kind: 'percent', scope: 'all', targets: [], status: 'active' };
  openModal(mhead(c.code ? 'แก้ไขโค้ด ' + esc(c.code) : 'สร้างโค้ดส่วนลด') + '<form class="form" id="cpf2">' +
    '<div class="row2">' + field('code', 'โค้ด (A-Z 0-9 - _)', c.code, { ph: 'เช่น BIO2569' }) + field('status', 'สถานะ', c.status, { options: [['active', 'ใช้ได้'], ['inactive', 'ปิด']] }) + '</div>' +
    '<div class="row2">' + field('kind', 'แบบส่วนลด', c.kind, { options: [['percent', 'ลดเป็นเปอร์เซ็นต์'], ['fixed', 'ลดเป็นบาท (ต่อบิล)'], ['each', 'ลดคอร์สละ (บาท)']] }) + field('value', 'มูลค่า', c.value, { mode: 'numeric', ph: 'เช่น 10 หรือ 300' }) + '</div>' +
    '<div class="m-pct">' + field('max_discount', 'ลดสูงสุด (บาท, ไม่ใส่ = ไม่จำกัด)', c.max_discount, { mode: 'numeric' }) + '</div>' +
    field('scope', 'ใช้กับ', c.scope, { options: [['all', 'ทุกคอร์ส'], ['subject', 'เฉพาะวิชา'], ['course', 'เฉพาะคอร์สที่เลือก']] }) +
    '<div class="f m-subject"><div class="rowx">' + Object.keys(subs).map(function (k) { return '<label class="chk-l"><input type="checkbox" name="t_' + k + '"' + (c.scope === 'subject' && c.targets.indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(subs[k]) + '</label>'; }).join('') + '</div></div>' +
    '<div class="f m-course"><div class="stack" style="gap:6px;max-height:190px;overflow:auto">' + cs.map(function (x) { return '<label class="chk-l"><input type="checkbox" name="t_' + esc(x.course_id) + '"' + (c.scope === 'course' && c.targets.indexOf(x.course_id) >= 0 ? ' checked' : '') + '> ' + esc(x.title) + ' <span class="muted">' + baht(x.price) + '</span></label>'; }).join('') + '</div></div>' +
    '<div class="row2">' + field('min_total', 'ยอดขั้นต่ำ (บาท)', c.min_total, { mode: 'numeric', ph: 'ไม่ใส่ = ไม่มีขั้นต่ำ' }) + field('max_uses', 'ใช้ได้ทั้งหมดกี่ครั้ง', c.max_uses, { mode: 'numeric', ph: 'ไม่ใส่ = ไม่จำกัด' }) + '</div>' +
    '<div class="row2">' + field('per_user', 'ใช้ได้คนละกี่ครั้ง', c.per_user, { mode: 'numeric', ph: 'ไม่ใส่ = ไม่จำกัด' }) + '<span></span></div>' +
    '<div class="row2">' + field('starts_at', 'เริ่มใช้ได้', toLocalInput(c.starts_at), { type: 'datetime-local' }) + field('ends_at', 'หมดอายุ', toLocalInput(c.ends_at), { type: 'datetime-local' }) + '</div>' +
    field('note', 'บันทึกภายใน (นักเรียนไม่เห็น)', c.note, { ph: 'เช่น แจกใน IG story 1 ต.ค.' }) +
    '<p class="err" id="cpf2-err" hidden></p><div class="rowx"><button class="pill">บันทึก</button>' + (c.code ? '<button type="button" class="pill danger" id="cp-del">ลบ</button>' : '') + '</div></form>', true);
  var sync = function () { var sc2 = $('#f-scope').value; $('.m-subject').hidden = sc2 !== 'subject'; $('.m-course').hidden = sc2 !== 'course'; $('.m-pct').hidden = $('#f-kind').value !== 'percent'; };
  $('#f-scope').onchange = sync; $('#f-kind').onchange = sync; sync();
  submitForm('#cpf2', 'admin.coupon.save', '#cpf2-err', function () { closeModal(); toast('บันทึกโค้ดแล้ว'); viewAdmin('coupons'); }, function () {
    var scope = $('#f-scope').value, keys = scope === 'subject' ? Object.keys(subs) : scope === 'course' ? cs.map(function (x) { return x.course_id; }) : [];
    var iso = function (v) { return v ? new Date(v).toISOString() : ''; };
    var o = { orig_code: c.code || '', targets: keys.filter(function (k) { var el = document.querySelector('#cpf2 [name="t_' + k + '"]'); return el && el.checked; }), starts_at: iso($('#f-starts_at').value), ends_at: iso($('#f-ends_at').value) };
    $$('#cpf2 [name^="t_"]').forEach(function (el) { o[el.name] = undefined; });
    return o;
  });
  if ($('#cp-del')) $('#cp-del').onclick = function () {
    confirmBox('ลบโค้ด ' + c.code + '?', 'ลบได้เฉพาะโค้ดที่ยังไม่เคยถูกใช้ ถ้าเคยใช้แล้วให้ตั้งเป็น "ปิด" แทน', 'ลบ', true).then(function (y) {
      if (!y) return; api('admin.coupon.delete', { code: c.code }).then(function () { toast('ลบแล้ว'); viewAdmin('coupons'); }).catch(function (e) { toast(e.message, true); });
    });
  };
}

/* ─── global events ─── */
document.addEventListener('click', function (e) {
  var t = e.target;
  var close = t.closest('[data-close]');
  if (close && close.classList.contains('scrim')) { if (t === close && S.downOnScrim) softClose(); S.downOnScrim = false; if (t === close) return; }
  else if (close) { closeModal(); return; }
  var peek = t.closest('[data-peek]');
  if (peek) { var i = document.getElementById(peek.dataset.peek); i.type = i.type === 'password' ? 'text' : 'password'; peek.textContent = i.type === 'password' ? 'แสดง' : 'ซ่อน'; return; }
  var wb = t.closest('#who-btn'), menu = $('#who-menu');
  if (wb) { menu.hidden = !menu.hidden; wb.setAttribute('aria-expanded', String(!menu.hidden)); return; }
  if (menu && !menu.hidden && !t.closest('#who-menu')) menu.hidden = true;
  var a = t.closest('[data-act]');
  if (a) {
    var act = a.dataset.act;
    if (act === 'login') authModal('login');
    else if (act === 'signup') authModal('signup');
    else if (act === 'forgot') authModal('forgot', { email: ($('#f-email') || {}).value });
    else if (act === 'logout') signOut();
    return;
  }
  var f = t.closest('[data-filter]');
  if (f) { S.filter = f.dataset.filter; viewHome(); return; }
  if (t.closest('[data-top]')) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  var ts = t.closest('[data-theme-set]');
  if (ts) { var hr = document.documentElement; hr.classList.add('theming'); clearTimeout(S.thT); S.thT = setTimeout(function () { hr.classList.remove('theming'); }, 500); THEME = ts.dataset.themeSet; store('ib_theme', THEME === 'auto' ? null : THEME); applyTheme(); $$('[data-theme-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === THEME)); }); toast(THEME === 'auto' ? 'ใช้ธีมตามเครื่อง' : THEME === 'dark' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'); return; }
  var ry = t.closest('[data-ryear]'), rsb = t.closest('[data-rsub]');
  if (ry) { S.ryear = Number(ry.dataset.ryear); S.rsub = ''; viewResults(); return; }
  if (rsb) { S.rsub = rsb.dataset.rsub; viewResults(); return; }
  var upb = t.closest('[data-upload]');
  if (upb) { pickUpload(upb); return; }
  var lvb = t.closest('[data-lv]'), fsb = t.closest('[data-fsub]'), clr = t.closest('[data-clear]');
  if (lvb || fsb || clr) {
    e.preventDefault();
    if (lvb) S.lv = S.lv === lvb.dataset.lv ? '' : lvb.dataset.lv;
    if (fsb) { S.fsub = fsb.dataset.fsub; S.lv = ''; }
    if (clr) { var k = clr.dataset.clear; if (k === 'all') { S.lv = S.fsub = S.q = ''; } else S[k] = ''; var qi = $('#srch-q'); if (qi && (k === 'q' || k === 'all')) qi.value = ''; }
    var goHome = !/^#\/?$/.test(location.hash) && location.hash !== '';
    if (goHome) { location.hash = '/'; setTimeout(function () { var cc = document.getElementById('courses'); if (cc) cc.scrollIntoView({ behavior: 'smooth' }); }, 400); }
    else if (S.homeRender) { S.homeRender(); var cc = document.getElementById('courses'); if (cc) window.scrollTo({ top: cc.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }
    return;
  }
  var j2 = t.closest('[data-jump2]');
  if (j2) { var g = document.getElementById(j2.dataset.jump2) || document.getElementById('courses'); if (g) window.scrollTo({ top: g.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' }); return; }
  var jp = t.closest('[data-jump]');
  if (jp) { var el = document.getElementById('sec-' + jp.dataset.jump); if (el) { var y = el.getBoundingClientRect().top + window.scrollY - 120; window.scrollTo({ top: y, behavior: 'smooth' }); } return; }
  var ca = t.closest('[data-cart-add]');
  if (ca) { cartAdd(ca.dataset.cartAdd); if (S.cur) refreshBuy(S.cur); return; }
  var bn = t.closest('[data-buy-now]');
  if (bn) { cartAdd(bn.dataset.buyNow, true); go('/cart'); return; }
  var cr = t.closest('[data-cart-rm]');
  if (cr) { cartRemove(cr.dataset.cartRm); viewCart(); return; }
  var rc = t.closest('[data-recart]');
  if (rc) { rc.dataset.recart.split(',').forEach(function (id) { cartAdd(id, true); }); go('/cart'); return; }
  var cp = t.closest('[data-copy]');
  if (cp) { copyText(cp.dataset.copy); return; }
  var igb = t.closest('[data-igm]');
  if (igb && S.bills && S.bills[igb.dataset.igm]) { igModal(S.bills[igb.dataset.igm]); return; }
  var bc = t.closest('[data-bill-cancel]');
  if (bc) { var bid = bc.dataset.billCancel; confirmBox('ยกเลิกบิล ' + bid + '?', 'ถ้าโอนเงินไปแล้ว อย่ายกเลิก ให้แนบสลิปแทน คอร์สในบิลนี้จะกลับมาซื้อใหม่ได้', 'ยกเลิกบิล', true).then(function (y) { if (!y) return; api('bill.cancel', { bill_id: bid }).then(function () { toast('ยกเลิกบิลแล้ว'); route(); }).catch(function (e) { toast(e.message, true); }); }); return; }
  if (t.closest('[data-uisw]')) { store('ib_ui', UI2() ? '1' : null); S.fresh = true; route(); return; }
  var pv = t.closest('[data-preview]');
  if (pv) { previewVideo(pv.dataset.preview, pv.dataset.title, pv.dataset.cid); return; }
  var dm = t.closest('[data-demo]');
  if (dm && window.__DEMO) { var r = window.__DEMO.login(dm.dataset.demo); setSession(r); closeModal(); toast('สวัสดี ' + r.user.nickname); if (dm.dataset.demo !== 'student') go('/admin'); else route(); }
});
document.addEventListener('submit', function (e) {
  if (e.target.id !== 'srch') return;
  e.preventDefault(); S.q = $('#srch-q').value.trim(); S.lv = ''; S.fsub = '';
  if (location.hash && !/^#\/?$/.test(location.hash)) { location.hash = '/'; setTimeout(function () { var cc = document.getElementById('courses'); if (cc) cc.scrollIntoView(); }, 400); }
  else if (S.homeRender) { S.homeRender(); var cc = document.getElementById('courses'); if (cc) window.scrollTo({ top: cc.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#modal').innerHTML) softClose(); });
window.addEventListener('hashchange', function () { if ($('#modal .scrim')) closeModal(); if (!/^#\/learn\//.test(location.hash)) S.learn = null; route(); });

/* ─── boot ─── */
var BOOT = Date.now();
if (!DEMO && /PASTE_YOUR/.test(API_URL)) {
  var sp0 = document.getElementById('splash'); if (sp0) sp0.remove();
  document.getElementById('app').innerHTML = '<div class="gut"><div class="w empty" style="margin-top:60px"><h2>ยังไม่ได้ตั้งค่า API_URL</h2><p>เปิดไฟล์ index.html แล้ววาง URL ของ Apps Script Web App ในบรรทัด <code>var API_URL = ...</code></p></div></div>';
  return;
}
document.body.insertAdjacentHTML('beforeend', CELL_DEFS + FEST_DEFS);
api('config').then(function (c) { S.cfg = c; }).catch(function () {})
  .then(function () { return S.token ? api('me').then(function (u) { S.user = u; }).catch(function () {}) : null; })
  .then(route)
  .then(function () { var sp = document.getElementById('splash'); if (!sp) return; setTimeout(function () { sp.classList.add('out'); setTimeout(function () { sp.remove(); }, 500); }, Math.max(0, 700 - (Date.now() - BOOT))); });
})();

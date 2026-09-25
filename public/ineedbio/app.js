/* ═══════════ ตั้งค่า: วาง URL ของ Apps Script Web App ที่นี่ ═══════════ */
var API_URL = window.INEEDBIO_API_URL || 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
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
function setSession(r) { S.token = r.token; S.user = r.user; if (!DEMO) store('ib_token', r.token); S.mem = {}; }
function signOut(silent) {
  if (S.token && !silent) api('logout').catch(function () {});
  S.token = null; S.user = null; S.mem = {}; if (!DEMO) store('ib_token', null);
  if (!silent) { toast('ออกจากระบบแล้ว'); go('/'); } else route();
}

/* ─── UI helpers ─── */
function toast(msg, bad) {
  var el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.setAttribute('role', 'status'); el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(function () { el.remove(); }, 3200);
}
function go(path) { if (location.hash === '#' + path) route(); else location.hash = path; }
function busy(btn, on) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>'; }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}
function openModal(html, wide, onClose) {
  $('#modal').innerHTML = '<div class="scrim" data-close="1"><div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
  S.modalClose = onClose || null;
  var f = $('#modal input:not([type=hidden]), #modal select, #modal textarea'); if (f) setTimeout(function () { f.focus(); }, 30);
}
function closeModal() { $('#modal').innerHTML = ''; if (S.modalClose) { var f = S.modalClose; S.modalClose = null; f(); } }
function mhead(title, sub) { return '<div class="mx"><div class="stack" style="gap:4px"><h2>' + title + '</h2>' + (sub ? '<p class="ink2 sm">' + sub + '</p>' : '') + '</div><button class="x" data-close="1" aria-label="ปิด">×</button></div>'; }
function showNotice(title, msg) { openModal(mhead(esc(title)) + '<p class="ink2">' + esc(msg) + '</p><button class="pill block" data-close="1">ตกลง</button>'); }
function confirmBox(title, msg, okLabel, danger) {
  return new Promise(function (resolve) {
    openModal(mhead(esc(title)) + '<p class="ink2">' + esc(msg) + '</p><div class="rowx" style="justify-content:flex-end"><button class="pill quiet" data-close="1">ยกเลิก</button><button class="pill ' + (danger ? 'danger' : '') + '" id="cf-ok">' + esc(okLabel) + '</button></div>', false, function () { resolve(false); });
    $('#cf-ok').onclick = function () { S.modalClose = null; closeModal(); resolve(true); };
  });
}
function formData(form) { var o = {}; $$('input,select,textarea', form).forEach(function (el) { if (!el.name) return; o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); return o; }
function field(name, label, value, opt) {
  opt = opt || {};
  var id = 'f-' + name + (opt.idp || '');
  if (opt.options) return '<label class="f" for="' + id + '">' + label + '<select class="i" id="' + id + '" name="' + name + '">' + opt.options.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>';
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
function bindGrade(form) {
  if (!form) return;
  var g = form.querySelector('[name=grade]'), box = form.querySelector('#repeat-box'); if (!g || !box) return;
  g.addEventListener('change', function () { box.hidden = !isRepeat(g.value); });
}
/* ─── ข้อตกลง / นโยบาย (แก้ข้อความได้ที่ หลังบ้าน → ตั้งค่า) ─── */
var LEGAL_DATE = '25 กันยายน 2569';
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
  '- ชำระผ่านพร้อมเพย์และแนบสลิปในหน้าคอร์ส สิทธิ์เข้าเรียนจะเปิดหลังแอดมินตรวจสลิปแล้ว โดยปกติภายใน 24 ชั่วโมง',
  '- หากสลิปไม่ถูกต้องหรือยอดไม่ครบ แอดมินจะแจ้งเหตุผลทางอีเมล และผู้ใช้ส่งสลิปใหม่ได้',
  '## 3. การคืนเงิน',
  '- คอร์สเป็นเนื้อหาดิจิทัลที่เข้าถึงได้ทันทีหลังอนุมัติ เราจึงไม่คืนเงินหลังเปิดสิทธิ์เข้าเรียนแล้ว ยกเว้นกรณีที่เราไม่สามารถให้บริการได้ตามที่แจ้งไว้',
  '- กรณีโอนเงินซ้ำหรือโอนเกิน ติดต่อแอดมินทาง IG พร้อมหลักฐาน เราจะตรวจสอบและคืนส่วนที่เกินให้',
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
  '- Instagram: @{ig}', '- โทร: {phone} (เฉพาะเรื่องด่วน 10:00–18:00)',
  'ปรับปรุงล่าสุด: ' + LEGAL_DATE
].join('\n');
var DEFAULT_PRIVACY = [
  '# นโยบายความเป็นส่วนตัว',
  'INeedBio ("เรา") ให้ความสำคัญกับข้อมูลส่วนบุคคลของผู้ใช้ และดำเนินการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) นโยบายนี้อธิบายว่าเราเก็บข้อมูลอะไร ใช้ทำอะไร และผู้ใช้มีสิทธิ์อะไรบ้าง',
  '## 1. ข้อมูลที่เราเก็บ',
  '- ข้อมูลที่กรอกตอนสมัคร: ชื่อ นามสกุล ชื่อเล่น โรงเรียน ระดับชั้น เบอร์โทร อีเมล คณะและมหาวิทยาลัยในฝัน และคณะและมหาวิทยาลัยที่เรียนอยู่ (กรณีจบ ม.6 แล้ว)',
  '- ข้อมูลการซื้อคอร์ส: คอร์สที่ซื้อ ยอดเงิน และรูปสลิปการโอน',
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
  '- ถอนความยินยอมในการเผยแพร่รูปหรือรีวิวได้ทุกเมื่อ',
  '- ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล หากเห็นว่าเราไม่ปฏิบัติตามกฎหมาย',
  '- ใช้สิทธิ์ได้โดยติดต่อแอดมินทาง IG เราจะตอบกลับภายใน 30 วัน',
  '## 6. ผู้ใช้ที่อายุต่ำกว่า 20 ปี',
  '- ผู้เรียนส่วนใหญ่ของเราเป็นนักเรียนมัธยม ผู้ปกครองสามารถติดต่อเราเพื่อสอบถาม ขอดู หรือขอลบข้อมูลของบุตรหลานได้',
  '## 7. คุกกี้และการเก็บข้อมูลในเบราว์เซอร์',
  '- เว็บไซต์เก็บข้อมูลในเบราว์เซอร์ของผู้ใช้เท่าที่จำเป็น ได้แก่ รหัสเข้าสู่ระบบ รหัสอุปกรณ์ และธีมที่เลือก เราไม่ใช้คุกกี้โฆษณาหรือติดตามข้ามเว็บไซต์',
  '- คลิปเรียนเล่นผ่าน YouTube ซึ่งอาจเก็บข้อมูลตามนโยบายของ YouTube',
  '## 8. ติดต่อเรา',
  '- Instagram: @{ig}', '- โทร: {phone} (เฉพาะเรื่องด่วน 10:00–18:00)',
  'ปรับปรุงล่าสุด: ' + LEGAL_DATE
].join('\n');
function legalText(kind) {
  var t = (kind === 'terms' ? S.cfg.terms_text : S.cfg.privacy_text) || (kind === 'terms' ? DEFAULT_TERMS : DEFAULT_PRIVACY);
  return t.replace(/\{ig\}/g, S.cfg.contact_ig || 'ineedbiochem').replace(/\{phone\}/g, S.cfg.contact_phone || '-');
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
  page('legal', '<div class="legal"><div class="rowx" style="margin-bottom:10px"><a class="chip" href="#/terms" aria-pressed="' + (kind === 'terms') + '">ข้อตกลงการใช้งาน</a><a class="chip" href="#/privacy" aria-pressed="' + (kind === 'privacy') + '">นโยบายความเป็นส่วนตัว</a></div>' + mdLite(legalText(kind)) + '</div>');
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
  if (u && u.role === 'admin') nav.push(['/admin', 'หลังบ้าน', 'admin']);
  var right = u
    ? '<div class="who"><button id="who-btn" aria-haspopup="true" aria-expanded="false"><span class="av">' + initials(u) + '</span><span class="sm">' + esc(u.nickname) + '</span></button>' +
      '<div class="menu" id="who-menu" hidden><div class="hd"><b>' + esc(u.first_name + ' ' + u.last_name) + '</b><div class="muted">' + esc(u.email) + '</div></div>' +
      '<a href="#/my">คอร์สของฉัน</a><a href="#/profile">ข้อมูลส่วนตัว</a>' + (u.role === 'admin' ? '<a href="#/admin">หลังบ้าน</a>' : '') + '<button data-act="logout">ออกจากระบบ</button></div></div>'
    : '<div class="rowx"><button class="pill ghost s" data-act="login">เข้าสู่ระบบ</button><button class="pill s" data-act="signup">สมัครสมาชิก</button></div>';
  var mnav = '<nav class="mnav" aria-label="เมนู">' + nav.map(function (n) { return '<a href="#' + n[0] + '" class="' + (active === n[2] ? 'on' : '') + '">' + n[1] + '</a>'; }).join('') + (u ? '<a href="#/profile" class="' + (active === 'profile' ? 'on' : '') + '">บัญชี</a>' : '') + '</nav>';
  document.body.classList.toggle('has-mnav', !!u);
  return (S.cfg.announcement ? '<div class="ann">' + esc(S.cfg.announcement) + '</div>' : '') +
    '<header class="hdr gut"><div class="w"><a class="logo" href="#/"><img src="' + CATSRC + '" alt=""><span>INeed<span>Bio</span></span></a><nav class="nav">' +
    nav.map(function (n) { return '<a href="#' + n[0] + '" class="' + (active === n[2] ? 'on' : '') + '">' + n[1] + '</a>'; }).join('') + '</nav>' +
    '<form class="srch" id="srch" role="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="srch-q" name="q" placeholder="ค้นหาคอร์ส เช่น ชีวะ, A-Level" value="' + esc(S.q || '') + '" autocomplete="off"></form><div class="hr">' + themeSwitch() + right + '</div></div></header>' + (u ? mnav : '');
}
function footer() {
  var ig = S.cfg.contact_ig || 'ineedbiochem', cs = S.courses || [];
  var subs = S.cfg.subjects || {};
  var lessons = cs.reduce(function (a, c) { return a + (c.lesson_count || 0); }, 0), mins = cs.reduce(function (a, c) { return a + (c.total_min || 0); }, 0);
  return '<footer class="bigfoot gut"><div class="w"><div><div class="brand"><img src="' + CATSRC + '" alt="">INeedBio</div>' +
    '<p>ติวออนไลน์สำหรับน้อง ม.ปลาย เตรียมสอบ สอวน. และ A-Level เรียนผ่านคลิป ดูซ้ำได้ตลอด มีชีทประกอบทุกบท</p>' +
    (cs.length ? '<div class="stat"><div><b>' + cs.length + '</b><span>คอร์สที่เปิดอยู่</span></div><div><b>' + lessons + '</b><span>ตอน</span></div><div><b>' + Math.round(mins / 60) + '</b><span>ชั่วโมงคลิปเรียน</span></div></div>' : '') + '</div>' +
    '<div><h4>คอร์สเรียน</h4><ul>' + Object.keys(subs).map(function (k) { return '<li><a href="#/" data-fsub="' + k + '">' + esc(subs[k]) + '</a></li>'; }).join('') + '</ul></div>' +
    '<div><h4>ติดต่อ</h4><ul><li><a href="https://www.instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">IG @' + esc(ig) + '</a></li>' + (S.cfg.contact_phone ? '<li><a>โทร ' + esc(S.cfg.contact_phone) + '</a></li><li><a>(เฉพาะเรื่องด่วน 10:00–18:00)</a></li>' : '') + '</ul></div>' +
    '<div class="copy">© ' + new Date().getFullYear() + ' INeedBio · ineedbio.shop · <a href="#/terms">ข้อตกลงการใช้งาน</a> · <a href="#/privacy">นโยบายความเป็นส่วนตัว</a></div></div></footer>';
}

function setSubj(s) { document.body.classList.remove('s-bio', 's-chem', 's-phys', 's-math'); if (s) document.body.classList.add('s-' + s); }
function sc(s) { return s ? ' s-' + esc(s) : ''; }
function page(active, body, noFooter) {
  var anim = S.fresh ? 'pg-enter' : 'pg-fade'; S.fresh = false;
  $('#app').innerHTML = (DEMO ? '<div class="demo-bar">เดโม: ข้อมูลทั้งหมดเป็นตัวอย่างและอยู่ในเบราว์เซอร์นี้เท่านั้น รีเฟรชแล้วจะเริ่มใหม่</div>' : '') + header(active) + '<main class="gut ' + anim + '"><div class="w">' + body + '</div></main>' + (noFooter ? '' : footer()) +
    '<div class="fab"><a class="ig" href="https://www.instagram.com/' + esc(S.cfg.contact_ig || 'ineedbiochem') + '" target="_blank" rel="noopener" title="ทักแอดมินทาง IG" aria-label="ทักแอดมินทาง IG"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg></a><button data-top="1" title="กลับขึ้นบน" aria-label="กลับขึ้นบน"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></div>';
}
function skTiles(n) { var h = ''; for (var i = 0; i < n; i++) h += '<div class="sk-tile" style="padding:0;min-height:0;border-radius:16px;overflow:hidden"><div class="sk" style="aspect-ratio:16/9;border-radius:0"></div><div class="stack" style="padding:16px 18px 18px;gap:10px"><div class="sk sk-l" style="width:25%"></div><div class="sk sk-h"></div><div class="sk sk-l" style="width:60%"></div></div></div>'; return '<div class="grid">' + h + '</div>'; }
function skeleton(kind) {
  if (kind === 'course') return '<div class="cd"><div class="stack" style="gap:14px"><div class="sk sk-l" style="width:18%"></div><div class="sk" style="height:44px;width:75%"></div><div class="sk sk-l" style="width:55%"></div><div class="rowx"><div class="sk" style="height:30px;width:90px;border-radius:99px"></div><div class="sk" style="height:30px;width:120px;border-radius:99px"></div></div><div class="sk" style="aspect-ratio:16/9;border-radius:16px"></div></div><div class="sk" style="height:380px;border-radius:24px"></div></div>';
  if (kind === 'learn') return '<div class="learn" style="padding-top:20px"><div class="stack" style="gap:16px;padding-right:24px"><div class="sk" style="aspect-ratio:16/9;border-radius:16px"></div><div class="sk sk-h"></div></div><div class="stack">' + [1, 2, 3, 4, 5, 6].map(function () { return '<div class="sk" style="height:34px"></div>'; }).join('') + '</div></div>';
  if (kind === 'list') return '<div class="page-h"><div class="sk sk-l" style="width:120px"></div><div class="sk" style="height:40px;width:260px"></div></div>' + skTiles(2);
  return '<div class="stack" style="padding-block:30px">' + [1, 2, 3].map(function () { return '<div class="sk" style="height:64px"></div>'; }).join('') + '</div>';
}
function loading(active, kind) { page(active, skeleton(kind), true); }
function failed(active, e) { page(active, '<div class="empty" style="margin-block:60px"><p>' + esc(e.message) + '</p><button class="pill" onclick="location.reload()">ลองใหม่</button></div>'); }

/* ─── router ─── */
function route() {
  window.scrollTo(0, 0); setSubj(''); S.fresh = true; clearInterval(S.featT); S.homeRender = null;
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  var parts = (location.hash.replace(/^#\/?/, '') || '').split('/').map(decodeURIComponent);
  var r = parts[0] || '';
  if (r === '') return viewHome();
  if (r === 'course') return viewCourse(parts[1]);
  if (r === 'results') return viewResults(parts[1]);
  if (r === 'terms' || r === 'privacy') return viewLegal(r);
  if (!S.user) { if (['my', 'learn', 'profile', 'admin'].indexOf(r) >= 0) { go('/'); setTimeout(function () { authModal('login'); }, 50); return; } }
  if (r === 'my') return viewMy();
  if (r === 'learn') return viewLearn(parts[1], parts[2]);
  if (r === 'profile') return viewProfile();
  if (r === 'admin') { if (S.user.role !== 'admin') return go('/'); return viewAdmin(parts[1] || 'dash', parts[2]); }
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
      else if (big) html += keys.map(function (k) {
        var row = cs.filter(function (c) { return c.subject === k; });
        return '<div style="margin-bottom:30px"><div class="sec-h"><div><h2>' + esc(subs[k]) + '</h2></div><button data-fsub="' + k + '">ดูทั้งหมด (' + row.length + ') →</button></div><div class="hs">' + row.map(function (c) { return tileHtml(c, mine); }).join('') + '</div></div>';
      }).join('');
      else html += '<div class="sec-h"><div><small>All courses</small><h2>คอร์สทั้งหมด</h2></div></div><div class="subj-chips">' + keys.map(function (k) {
        return '<button class="chip s-' + k + '" data-fsub="' + k + '"><i></i>' + esc(subs[k]) + '</button>'; }).join('') + '</div><div class="grid">' + cs.map(function (c) { return tileHtml(c, mine); }).join('') + '</div>';
    }
    html += '</section>';
    html += '<section class="blk"><div class="sec-h"><div><small>Why INeedBio</small><h2>เรียนกับเราได้อะไร</h2></div></div><div class="why">' +
      '<div><b class="n">∞</b><h3>ดูได้ตลอดชีพ</h3><p>ซื้อครั้งเดียว ไม่มีวันหมดอายุ ไม่มีการลบคลิป ย้อนดูก่อนสอบกี่รอบก็ได้</p></div>' +
      '<div><b class="n">PDF</b><h3>ชีทประกอบทุกบท</h3><p>เปิดชีทข้างคลิปได้เลย จดตามพี่ได้ทันที ไม่ต้องหาไฟล์เอง</p></div>' +
      '<div><b class="n">%</b><h3>รู้ว่าเรียนถึงไหน</h3><p>ติ๊กตอนที่ดูจบ ระบบนับให้ว่าเหลืออีกกี่ตอน วางแผนอ่านก่อนสอบได้ง่าย</p></div></div></section>' +
      '<section class="blk"><div class="sec-h"><div><small>Contact</small><h2>มีคำถาม ทักพี่ได้เลย</h2></div></div><div class="chan">' +
      '<a class="ig" href="https://www.instagram.com/' + esc(ig) + '" target="_blank" rel="noopener"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg><span><b>Instagram</b><span>@' + esc(ig) + ' · ช่องทางหลัก สอบถาม/ส่งสลิป</span></span></a>' +
      (S.cfg.contact_phone ? '<a class="tel"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg><span><b>' + esc(S.cfg.contact_phone) + '</b><span>เฉพาะเรื่องด่วน 10:00–18:00</span></span></a>' : '') + '</div></section>';
    page('home', html);
    startFeat();
  };
  render();
  var jobs = [api('courses.list').then(function (c) { S.courses = c; }), loadResults()];
  if (S.user && !S.mem.mine) jobs.push(api('my.courses').then(function (m) { var o = {}; m.forEach(function (x) { o[x.course_id] = x.enrollment; }); S.mem.mine = o; }).catch(function () {}));
  Promise.all(jobs).then(render).catch(function (e) { failed('home', e); });
  S.homeRender = render;
}
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
  var rs = (S.results || []).filter(function (r) { return r.subject === c.subject && r.review; }).slice(0, 4);
  if (!rs.length) return '';
  return '<section class="sec" id="sec-reviews"><div class="spread"><h2>เสียงจากน้องที่ติดค่าย</h2><a class="link" href="#/results">ดูทั้งหมด</a></div><div class="rvs two">' + rs.map(reviewCard).join('') + '</div></section>';
}
function viewCourse(id) {
  loading('home', 'course');
  Promise.all([api('course.detail', { course_id: id }), loadResults()]).then(function (res) { var c = res[0];
    S.cur = c; setSubj(c.subject);
    var st = c.enrollment;
    var box, cta;
    if (!S.user) { box = '<p class="ink2 sm">สมัครสมาชิกหรือเข้าสู่ระบบก่อน แล้วจึงซื้อคอร์สได้</p><button class="pill block" data-act="signup">สมัครสมาชิกเพื่อซื้อคอร์ส</button><button class="pill ghost block" data-act="login">มีบัญชีแล้ว เข้าสู่ระบบ</button>'; cta = '<button class="pill" data-act="signup">สมัครเพื่อซื้อ</button>'; }
    else if (st === 'approved') { box = '<div class="note ok">คุณมีสิทธิ์เข้าเรียนคอร์สนี้แล้ว</div><a class="pill block" href="#/learn/' + encodeURIComponent(c.course_id) + '">เข้าห้องเรียน</a>'; cta = '<a class="pill" href="#/learn/' + encodeURIComponent(c.course_id) + '">เข้าห้องเรียน</a>'; }
    else if (st === 'pending') { box = '<div class="note wait">ส่งสลิปแล้ว แอดมินกำลังตรวจ ปกติไม่เกิน 24 ชั่วโมง ระบบจะส่งอีเมลแจ้งเมื่ออนุมัติ</div>'; cta = '<span class="badge b-wait">รอตรวจสลิป</span>'; }
    else { box = (st === 'rejected' ? '<div class="note no">สลิปครั้งก่อนไม่ผ่าน' + (c.note ? ': ' + esc(c.note) : '') + ' ส่งสลิปใหม่ได้ด้านล่าง</div>' : '') + payBox(c); cta = '<button class="pill" data-jump="buy">ซื้อคอร์ส</button>'; }
    var total = c.chapters.reduce(function (a, ch) { return a + ch.lessons.length; }, 0);
    var previews = []; c.chapters.forEach(function (ch) { ch.lessons.forEach(function (l) { if (l.is_preview) previews.push(l); }); });
    var ig = S.cfg.contact_ig || 'ineedbiochem';
    var faq = (c.faq || []).concat([
      { q: 'ซื้อแล้วดูได้นานแค่ไหน', a: 'ดูได้ตลอด ไม่มีวันหมดอายุ เปิดดูซ้ำได้ทุกตอนไม่จำกัดจำนวนครั้ง' },
      { q: 'ดูได้กี่เครื่อง', a: 'บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ถ้าเข้าสู่ระบบจากเครื่องใหม่ เครื่องเดิมจะออกจากระบบเอง สลับเครื่องได้ตลอด' },
      { q: 'โอนเงินแล้วเข้าเรียนได้เมื่อไร', a: 'หลังแอดมินตรวจสลิป ปกติภายใน 24 ชั่วโมง ระบบจะส่งอีเมลแจ้งเมื่ออนุมัติ แล้วเข้าเรียนได้ที่เมนู “คอร์สของฉัน”' },
      { q: 'มีคำถามเพิ่มเติม ติดต่อใคร', a: 'ทัก IG @' + ig + ' ได้เลย' }
    ]);
    var jumps = [['overview', 'ภาพรวม'], ['syllabus', 'เนื้อหา']];
    if (c.instructor) jumps.push(['instructor', 'ผู้สอน']);
    if ((S.results || []).some(function (r) { return r.subject === c.subject && r.review; })) jumps.push(['reviews', 'รีวิว']);
    jumps.push(['faq', 'คำถามที่พบบ่อย']);
    var CK = '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M5.5 10.3l3 3 6-6.3" fill="none" stroke="var(--on-acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    page('home',
      '<div style="padding-top:24px"><a class="back" href="#/">← คอร์สทั้งหมด</a></div><div class="cd"><div>' +
      '<section class="chero" id="sec-overview"><span class="mono sj">' + esc(c.subject_name) + '</span><h1>' + esc(c.title) + '</h1>' + (c.subtitle ? '<p class="ink2 lead">' + esc(c.subtitle) + '</p>' : '') +
      '<div class="facts"><span><b>' + total + '</b> ตอน</span><span><b>' + hm(c.total_min) + '</b> วิดีโอ</span><span><b>ดูได้ตลอด</b> ไม่มีวันหมดอายุ</span></div>' +
      (c.trailer_id ? '<div class="player trailer">' + playerInner(c.trailer_id, '') + '</div>' : (c.cover_url ? '<div class="cover trailer" style="border-radius:16px;aspect-ratio:16/8"><img src="' + esc(imgSrc(c.cover_url)) + '" alt="" style="object-fit:contain"></div>' : '')) +
      (!c.trailer_id && previews.length ? '<button class="pill ghost s" style="justify-self:start" data-preview="' + esc(previews[0].youtube_id) + '" data-title="' + esc(previews[0].title) + '">▶ ดูตอนตัวอย่างฟรี</button>' : '') + '</section>' +
      '<nav class="jump" aria-label="ส่วนของหน้า">' + jumps.map(function (j) { return '<button data-jump="' + j[0] + '">' + j[1] + '</button>'; }).join('') + '</nav>' +
      (c.highlights && c.highlights.length ? '<section class="sec"><h2>จุดเด่นของคอร์ส</h2><div class="hl">' + c.highlights.map(function (h) { return '<div><span class="ic">' + CK + '</span><span>' + esc(h) + '</span></div>'; }).join('') + '</div></section>' : '') +
      (c.audience && c.audience.length ? '<section class="sec"><h2>คอร์สนี้เหมาะกับ</h2><ul class="aud">' + c.audience.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></section>' : '') +
      (c.description ? '<section class="sec"><h2>รายละเอียดคอร์ส</h2><p class="desc">' + esc(c.description) + '</p></section>' : '') +
      '<section class="sec" id="sec-syllabus"><div class="spread"><h2>เนื้อหาในคอร์ส</h2><button class="link" id="syl-all">เปิดทุกบท</button></div><p class="sm ink2">' + c.chapters.length + ' บท · ' + total + ' ตอน · ' + hm(c.total_min) + (previews.length ? ' · ดูฟรีได้ ' + previews.length + ' ตอน' : '') + '</p><div class="syl">' + c.chapters.map(function (ch, i) {
        var mins = ch.lessons.reduce(function (a, l) { return a + l.duration_min; }, 0);
        return '<details' + (i === 0 ? ' open' : '') + '><summary><span>' + esc(ch.title) + '</span><span class="n">' + ch.lessons.length + ' ตอน · ' + hm(mins) + '</span></summary><ul>' + ch.lessons.map(function (l) {
          return '<li><span>' + esc(l.title) + (l.is_preview ? ' <button class="pill s ghost" style="margin-left:6px" data-preview="' + esc(l.youtube_id) + '" data-title="' + esc(l.title) + '">ดูฟรี</button>' : '') + '</span><span class="d">' + l.duration_min + ' นาที</span></li>';
        }).join('') + '</ul></details>';
      }).join('') + '</div></section>' +
      (c.instructor ? '<section class="sec" id="sec-instructor"><h2>ผู้สอน</h2><div class="inst"><div class="ph">' + (c.instructor.photo ? '<img src="' + esc(imgSrc(c.instructor.photo)) + '" alt="" onerror="this.remove()">' : '') + '<span>' + esc(c.instructor.name.replace(/^พี่\s*/, '').slice(0, 1)) + '</span></div><div class="stack" style="gap:4px;flex:1;min-width:220px"><h3 style="font-size:20px">' + esc(c.instructor.name) + '</h3>' + (c.instructor.title ? '<span class="sm acc">' + esc(c.instructor.title) + '</span>' : '') +
        (c.instructor.bio ? (function (ls) { return ls.length > 1 ? '<ul class="bl">' + ls.map(function (l) { return '<li>' + esc(l.replace(/^[-•*]\s*/, '')) + '</li>'; }).join('') + '</ul>' : '<p class="ink2 desc" style="margin-top:6px">' + esc(ls[0] || '') + '</p>'; })(c.instructor.bio.split(/\n+/).filter(function (x) { return x.trim(); })) : '') + '</div></div></section>' : '') +
      revSec(c) +
      '<section class="sec" id="sec-faq"><h2>คำถามที่พบบ่อย</h2><div class="syl faq">' + faq.map(function (f) { return '<details><summary><span class="t">' + esc(f.q) + '</span><span class="n">+</span></summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</div></section>' +
      '</div><aside class="buy" id="sec-buy"><span class="mono">ราคาคอร์ส</span><span class="price">' + (c.full_price > c.price ? '<span class="was">' + baht(c.full_price) + '</span>' : '') + baht(c.price) + '</span>' +
      '<ul class="incl"><li>' + CK + 'คลิปเรียน ' + total + ' ตอน (' + hm(c.total_min) + ')</li><li>' + CK + 'ชีทประกอบในห้องเรียน</li><li>' + CK + 'ดูได้ตลอด ไม่มีวันหมดอายุ</li><li>' + CK + 'เรียนได้ทั้งมือถือและคอม</li></ul>' + box + '</aside></div>' +
      '<div class="mbar"><div><span class="sm ink2">' + esc(c.title) + '</span><b class="price">' + baht(c.price) + '</b></div>' + cta + '</div>');
    bindPay(c);
    $('#syl-all').onclick = function () { var ds = $$('.syl:not(.faq) details'), open = ds.some(function (d) { return !d.open; }); ds.forEach(function (d) { d.open = open; }); this.textContent = open ? 'ปิดทุกบท' : 'เปิดทุกบท'; };
  }).catch(function (e) { failed('home', e); });
}
function payBox(c) {
  var qr = '';
  try {
    if (window.qrcode && S.cfg.promptpay_id) { var q = qrcode(0, 'M'); q.addData(promptpay(S.cfg.promptpay_id, c.price)); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); }
  } catch (e) { qr = ''; }
  return '<ol class="steps"><li>สแกน QR พร้อมเพย์ด้วยแอปธนาคาร ยอด ' + baht(c.price) + '</li><li>แนบรูปสลิปการโอน</li><li>รอแอดมินอนุมัติ ระบบจะส่งอีเมลแจ้ง</li></ol>' +
    '<div class="qrbox"><span class="pp">PromptPay</span>' + (qr || '<p style="padding:30px 0">โอนเข้าพร้อมเพย์ ' + esc(S.cfg.promptpay_id) + '</p>') + '<small>' + esc(S.cfg.promptpay_name || '') + '<br>ยอด ' + baht(c.price) + '</small></div>' +
    '<input type="file" id="slip-file" accept="image/*" hidden><button class="drop" id="slip-drop" type="button">แตะเพื่อแนบรูปสลิป</button>' +
    '<button class="pill block" id="slip-send" disabled>ส่งสลิปเพื่อยืนยัน</button>';
}
function bindPay(c) {
  var drop = $('#slip-drop'); if (!drop) return;
  var file = $('#slip-file'), send = $('#slip-send'), slip = null;
  drop.onclick = function () { file.click(); };
  file.onchange = function () {
    var f = file.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) return toast('แนบได้เฉพาะรูปภาพ', true);
    compressImage(f).then(function (r) { slip = r; drop.classList.add('has'); drop.innerHTML = '<img src="data:' + r.mime + ';base64,' + r.base64 + '" alt="สลิปที่แนบ"><span class="sm">แตะเพื่อเปลี่ยนรูป</span>'; send.disabled = false; })
      .catch(function () { toast('เปิดรูปนี้ไม่ได้ ลองรูปอื่น', true); });
  };
  send.onclick = function () {
    busy(send, true);
    api('enroll.request', { course_id: c.course_id, slip: slip }).then(function () {
      S.mem = {}; toast('ส่งสลิปแล้ว แอดมินจะตรวจภายใน 24 ชั่วโมง'); viewCourse(c.course_id);
    }).catch(function (e) { busy(send, false); toast(e.message, true); });
  };
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
function compressImage(f) {
  return new Promise(function (res, rej) {
    var rd = new FileReader();
    rd.onerror = rej;
    rd.onload = function () {
      var img = new Image();
      img.onerror = rej;
      img.onload = function () {
        var max = 1400, s = Math.min(1, max / Math.max(img.width, img.height));
        var cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
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
function previewVideo(id, title) {
  openModal(mhead(esc(title), 'ตอนตัวอย่าง ดูได้ฟรี') + '<div class="player">' + playerInner(id, '') + '</div>', true);
}
function playerInner(id, wm) {
  var v = DEMO
    ? '<div class="ph"><div class="play"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M7 4l14 8-14 8z"/></svg></div><span>ในเว็บจริง คลิป YouTube รหัส <b style="font-family:var(--mono)">' + esc(id) + '</b> จะเล่นตรงนี้</span></div>'
    : '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&modestbranding=1&playsinline=1" title="คลิปเรียน" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  return v + (wm ? '<span class="wm" id="wm" style="top:12%;left:8%">' + esc(wm) + '</span>' : '');
}

/* ─── MY COURSES ─── */
function viewMy() {
  loading('my', 'list');
  api('my.courses').then(function (list) {
    var o = {}; list.forEach(function (x) { o[x.course_id] = x.enrollment; }); S.mem.mine = o;
    var rank = { approved: 0, pending: 1, rejected: 2 }; list.sort(function (a, b) { return rank[a.enrollment] - rank[b.enrollment]; });
    page('my', '<div class="page-h"><span class="mono">สวัสดี ' + esc(S.user.nickname) + '</span><h1>คอร์สของฉัน</h1></div>' +
      (list.length ? '<div class="mine">' + list.map(function (c, i) {
        var st = c.enrollment;
        return '<div class="mc' + sc(c.subject) + '"><div class="spread"><span class="mono">' + esc(c.subject_name) + '</span>' + statusBadge(st) + '</div><h3>' + esc(c.title) + '</h3>' +
          (st === 'approved'
            ? '<div class="stack" style="gap:6px"><div class="bar"><i style="width:' + c.percent + '%"></i></div><span class="sm ink2">เรียนไปแล้ว ' + c.percent + '% · ' + c.done_count + ' จาก ' + c.lesson_count + ' ตอน</span></div><div class="act"><a class="pill" href="#/learn/' + encodeURIComponent(c.course_id) + '">' + (c.done_count ? 'เรียนต่อ' : 'เริ่มเรียน') + '</a></div>'
            : st === 'pending' ? '<p class="sm ink2">ส่งสลิปเมื่อ ' + thDate(c.requested_at, true) + ' · แอดมินกำลังตรวจ</p>'
            : '<p class="sm ink2">สลิปไม่ผ่าน' + (c.note ? ': ' + esc(c.note) : '') + '</p><div class="act"><a class="pill ghost" href="#/course/' + encodeURIComponent(c.course_id) + '">ส่งสลิปใหม่</a></div>') + '</div>';
      }).join('') + '</div>' : '<div class="empty" style="margin-bottom:72px"><p>ยังไม่มีคอร์ส เลือกคอร์สที่สนใจแล้วส่งสลิปได้เลย</p><a class="pill" href="#/">ดูคอร์สทั้งหมด</a></div>'));
  }).catch(function (e) { failed('my', e); });
}

/* ─── LEARN ─── */
function viewLearn(cid, lid) {
  var draw = function (c) {
    var all = []; c.chapters.forEach(function (ch) { ch.lessons.forEach(function (l) { all.push(l); }); });
    if (!all.length) { page('my', '<div class="empty" style="margin-block:60px"><p>คอร์สนี้ยังไม่มีบทเรียน</p><a class="pill" href="#/my">กลับ</a></div>'); return; }
    var cur = all.filter(function (l) { return l.lesson_id === lid; })[0] || all.filter(function (l) { return !l.done; })[0] || all[0];
    var i = all.indexOf(cur), done = all.filter(function (l) { return l.done; }).length, pct = Math.round(done / all.length * 100);
    var chap = c.chapters.filter(function (ch) { return ch.lessons.indexOf(cur) >= 0; })[0];
    setSubj(c.subject);
    document.body.classList.remove('has-mnav');
    $('#app').innerHTML = (DEMO ? '<div class="demo-bar">เดโม: ข้อมูลทั้งหมดเป็นตัวอย่าง</div>' : '') +
      '<div class="gut" style="border-bottom:1px solid var(--line)"><div class="w lhdr"><a class="back" href="#/my">← ออกจากห้องเรียน</a><span class="t">' + esc(c.title) + '</span><span class="mono" style="text-transform:none">' + pct + '%</span></div></div>' +
      '<main class="gut"><div class="w learn"><div class="stage">' +
      '<div class="player" id="player">' + playerInner(cur.youtube_id, c.watermark) + '</div>' +
      '<div class="lrow"><div style="min-width:0"><span class="mono">' + esc(chap.title) + '</span><h2>' + esc(cur.title) + '</h2></div>' +
      '<button class="pill ' + (cur.done ? 'ghost' : '') + '" id="done-btn">' + (cur.done ? '✓ ดูจบแล้ว' : 'ทำเครื่องหมายว่าดูจบ') + '</button></div>' +
      (cur.attachment_url ? '<div class="files"><a class="file" href="' + esc(cur.attachment_url) + '" target="_blank" rel="noopener"><b>PDF</b>ไฟล์ประกอบตอนนี้</a></div>' : '') +
      '<div class="spread" style="border-top:1px solid var(--line);padding-top:16px">' +
      (all[i - 1] ? '<a class="pill quiet s" href="#/learn/' + encodeURIComponent(cid) + '/' + all[i - 1].lesson_id + '">← ตอนก่อนหน้า</a>' : '<span></span>') +
      (all[i + 1] ? '<a class="pill s" href="#/learn/' + encodeURIComponent(cid) + '/' + all[i + 1].lesson_id + '">ตอนถัดไป →</a>' : '<span class="sm muted">ตอนสุดท้ายของคอร์ส</span>') + '</div>' +
      '<p class="hint">คลิปนี้สำหรับผู้ซื้อคอร์สเท่านั้น บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ห้ามอัดหน้าจอหรือแชร์ลิงก์</p>' +
      '</div><aside class="lside"><div class="prog"><span class="sm ink2">เรียนไปแล้ว ' + done + ' จาก ' + all.length + ' ตอน</span><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      c.chapters.map(function (ch) {
        return '<div class="chap">' + esc(ch.title) + '</div>' + ch.lessons.map(function (l) {
          return '<a class="ep' + (l === cur ? ' on' : '') + (l.done ? ' done' : '') + '" href="#/learn/' + encodeURIComponent(cid) + '/' + l.lesson_id + '"><span class="ck">' + (l.done ? '✓' : '') + '</span><span>' + esc(l.title) + '</span><span class="d">' + l.duration_min + '\'</span></a>';
        }).join('');
      }).join('') + '</aside></div></main>';
    $('#done-btn').onclick = function () {
      var b = this, nv = !cur.done; busy(b, true);
      api('progress.set', { lesson_id: cur.lesson_id, done: nv }).then(function () {
        cur.done = nv; S.mem.mine = null;
        if (nv && all[i + 1]) toast('เยี่ยม! ไปตอนถัดไปได้เลย');
        draw(c);
      }).catch(function (e) { busy(b, false); toast(e.message, true); });
    };
    S.timer = setInterval(function () { var w = $('#wm'); if (!w) return; w.style.top = (8 + Math.random() * 78) + '%'; w.style.left = (4 + Math.random() * 60) + '%'; }, 9000);
  };
  if (S.learn && S.learn.course_id === cid) return draw(S.learn);
  loading('my', 'learn');
  api('learn.get', { course_id: cid }).then(function (c) { S.learn = c; draw(c); })
    .catch(function (e) { if (e.code === 'NO_ACCESS') { toast(e.message, true); go('/course/' + cid); } else failed('my', e); });
}

/* ─── PROFILE ─── */
function viewProfile() {
  var u = S.user;
  page('profile', '<div class="page-h"><span class="mono">บัญชี</span><h1>ข้อมูลส่วนตัว</h1></div><div class="stack" style="gap:20px;max-width:640px;padding-bottom:72px">' +
    '<form class="card form" id="pf"><h3>ข้อมูลผู้เรียน</h3><div class="row2">' + field('first_name', 'ชื่อ', u.first_name) + field('last_name', 'นามสกุล', u.last_name) + '</div>' +
    '<div class="row2">' + field('nickname', 'ชื่อเล่น', u.nickname) + field('grade', 'ระดับชั้น', u.grade, { options: GRADES }) + '</div>' +
    field('school', 'โรงเรียน (หรือโรงเรียนที่จบมา)', u.school) + goalFields(u) + '<div class="row2">' + field('phone', 'เบอร์โทร', u.phone, { mode: 'tel' }) + '<label class="f">อีเมล<input class="i" value="' + esc(u.email) + '" disabled></label></div>' +
    '<p class="err" id="pf-err" hidden></p><button class="pill" style="justify-self:start">บันทึก</button></form>' +
    '<form class="card form" id="pw"><h3>เปลี่ยนรหัสผ่าน</h3>' + field('old_password', 'รหัสผ่านเดิม', '', { type: 'password', auto: 'current-password' }) + field('password', 'รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)', '', { type: 'password', auto: 'new-password', idp: '2' }) +
    '<p class="err" id="pw-err" hidden></p><button class="pill ghost" style="justify-self:start">เปลี่ยนรหัสผ่าน</button></form>' +
    '<div class="card spread"><div><h3>ธีมของเว็บ</h3><p class="sm ink2">ค่าเริ่มต้นจะสว่างหรือมืดตามการตั้งค่าของเครื่อง</p></div>' + themeSwitch() + '</div>' +
    '<p class="sm muted">อ่าน <a href="#/terms">ข้อตกลงการใช้งาน</a> และ <a href="#/privacy">นโยบายความเป็นส่วนตัว</a> · ต้องการลบบัญชี ทักแอดมินทาง IG</p>' +
    '<div class="card spread"><div><h3>ออกจากระบบ</h3><p class="sm ink2">ถ้าจะใช้เครื่องอื่น เข้าสู่ระบบที่เครื่องใหม่ได้เลย เครื่องนี้จะออกจากระบบเอง</p></div><button class="pill danger" data-act="logout">ออกจากระบบ</button></div></div>');
  bindGrade($('#pf'));
  submitForm('#pf', 'profile.update', '#pf-err', function (r) { S.user = r; toast('บันทึกแล้ว'); viewProfile(); });
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
    goalFields(st) +
    '<div class="row2">' + field('phone', 'เบอร์โทร', st.phone, { mode: 'tel', auto: 'tel', ph: '08x-xxx-xxxx' }) + field('email', 'อีเมล', st.email, { type: 'email', auto: 'email' }) + '</div>' +
    field('password', 'รหัสผ่าน (อย่างน้อย 8 ตัว)', st.password || '', { type: 'password', auto: 'new-password' }) +
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
    bindGrade(f);
    $$('[data-legal]', f).forEach(function (b) { b.onclick = function () { var draft = formData(f); legalModal(b.dataset.legal, function () { authModal('signup', draft); }); }; });
  }
  f.onsubmit = function (ev) {
    ev.preventDefault(); er.hidden = true;
    var btn = $('button:not([type=button])', f), d = formData(f); busy(btn, true);
    if (mode === 'login') api('login', d).then(function (r) { setSession(r); closeModal(); toast('สวัสดี ' + r.user.nickname); route(); }).catch(function (e) { fail(btn, e); });
    else if (mode === 'signup') { if (!d.accept_terms) return fail(btn, { message: 'กรุณาติ๊กยอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัวก่อน' }); api('register.start', d).then(function (r) { authModal('otp', Object.assign({}, d, { email: r.email })); }).catch(function (e) { fail(btn, e); }); }
    else if (mode === 'forgot') api('password.forgot', d).then(function (r) { authModal('reset', { email: r.email }); }).catch(function (e) { fail(btn, e); });
    else {
      var otp = $$('.otp input').map(function (i) { return i.value; }).join('');
      if (otp.length !== 6) return fail(btn, { message: 'กรอกรหัสให้ครบ 6 หลัก' });
      var act = mode === 'otp' ? 'register.verify' : 'password.reset';
      api(act, { email: st.email, otp: otp, password: d.password }).then(function (r) {
        setSession(r); closeModal(); toast(mode === 'otp' ? 'สร้างบัญชีแล้ว ยินดีต้อนรับ ' + r.user.nickname : 'ตั้งรหัสผ่านใหม่แล้ว'); route();
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
  return '<div class="note plain sm stack" style="gap:8px"><b style="color:var(--ink)">บัญชีตัวอย่างสำหรับเดโม</b><div class="rowx"><button class="pill s ghost" data-demo="student">เข้าเป็นนักเรียน</button><button class="pill s ghost" data-demo="admin">เข้าเป็นแอดมิน</button></div></div>';
}

/* ─── ADMIN ─── */
function viewAdmin(tab, arg) {
  var tabs = [['dash', 'ภาพรวม'], ['requests', 'คำขอเข้าเรียน'], ['courses', 'คอร์สและบทเรียน'], ['results', 'ผลงานนักเรียน'], ['users', 'ผู้ใช้'], ['settings', 'ตั้งค่า']];
  var shell = function (body) {
    page('admin', '<div class="adm"><nav class="aside" aria-label="เมนูหลังบ้าน">' + tabs.map(function (t) {
      return '<a href="#/admin/' + t[0] + '" class="' + (tab === t[0] || (tab === 'course' && t[0] === 'courses') ? 'on' : '') + '"><span>' + t[1] + '</span>' + (t[0] === 'requests' && S.pending ? '<span class="n">' + S.pending + '</span>' : '') + '</a>';
    }).join('') + '</nav><div class="amain" id="amain">' + body + '</div></div>', true);
  };
  shell(skeleton('admin'));
  var fn = { dash: aDash, requests: aRequests, courses: aCourses, course: aCourse, results: aResults, users: aUsers, settings: aSettings }[tab] || aDash;
  fn(shell, arg);
}
function refreshPending() { return api('admin.stats').then(function (s) { S.pending = s.pending; return s; }); }
function aDash(shell) {
  refreshPending().then(function (s) {
    var max = Math.max.apply(null, s.by_subject.map(function (x) { return x.revenue; }).concat([1]));
    shell('<h1>ภาพรวม</h1><div class="kpis">' +
      '<a class="kpi' + (s.pending ? ' hot' : '') + '" href="#/admin/requests" style="text-decoration:none"><span>รอตรวจสลิป</span><b>' + s.pending + '</b><span>' + (s.oldest_pending ? 'เก่าสุด ' + thDate(s.oldest_pending, true) : 'ไม่มีคำขอค้าง') + '</span></a>' +
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
    if (status === 'pending') S.pending = list.length;
    shell('<div class="spread"><h1>คำขอเข้าเรียน</h1><button class="pill ghost s" id="grant-btn">+ เพิ่มสิทธิ์ให้ผู้ใช้เอง</button></div>' +
      '<div class="seg" role="group">' + [['pending', 'รอตรวจ'], ['approved', 'อนุมัติแล้ว'], ['rejected', 'ปฏิเสธแล้ว']].map(function (t) { return '<button data-rtab="' + t[0] + '" aria-pressed="' + (status === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (status === 'pending' ? '<p class="ink2 sm">เปิดดูสลิป ตรวจยอดและชื่อบัญชีให้ตรงก่อนอนุมัติ เมื่ออนุมัติแล้ว นักเรียนได้อีเมลแจ้งและเข้าเรียนได้ทันที</p>' : '') +
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
      '<form class="form" id="gf">' + field('email', 'อีเมลของนักเรียน', '', { type: 'email' }) + field('course_id', 'คอร์ส', cs[0] && cs[0].course_id, { options: cs.map(function (c) { return [c.course_id, c.title]; }) }) +
      '<div class="row2">' + field('amount', 'ยอดที่รับ (บาท)', '', { mode: 'numeric', ph: '0 ถ้าให้ฟรี' }) + field('note', 'หมายเหตุ', '', { ph: 'เช่น โอนผ่าน IG' }) + '</div><p class="err" id="gf-err" hidden></p><button class="pill">เพิ่มสิทธิ์</button></form>');
    submitForm('#gf', 'admin.grant', '#gf-err', function () { closeModal(); toast('เพิ่มสิทธิ์แล้ว ส่งอีเมลแจ้งนักเรียนแล้ว'); S.reqTab = 'approved'; viewAdmin('requests'); });
  });
}
function aCourses(shell) {
  api('admin.courses').then(function (cs) {
    shell('<div class="spread"><h1>คอร์สและบทเรียน</h1><button class="pill s" id="new-course">+ คอร์สใหม่</button></div>' +
      (cs.length ? '<div class="cgrid">' + cs.map(function (c) {
        return '<a class="ccard' + sc(c.subject) + '" href="#/admin/course/' + encodeURIComponent(c.course_id) + '"><div class="spread"><span class="mono">' + esc(c.subject_name) + '</span><span class="badge ' + (c.status === 'published' ? 'b-ok' : 'b-soft') + '">' + (c.status === 'published' ? 'เปิดขาย' : 'ฉบับร่าง') + '</span></div><h3 style="font-size:18px">' + esc(c.title) + '</h3><span class="sm ink2">' + c.lesson_count + ' ตอน · ' + hm(c.total_min) + ' · ' + baht(c.price) + '</span><span class="sm muted">นักเรียน ' + c.students + ' คน · รหัส ' + esc(c.course_id) + '</span></a>';
      }).join('') + '</div>' : '<div class="empty"><p>ยังไม่มีคอร์ส เริ่มสร้างคอร์สแรกได้เลย</p></div>'));
    $('#new-course').onclick = function () { courseModal(null); };
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function courseModal(c) {
  var subj = Object.keys(S.cfg.subjects).map(function (k) { return [k, S.cfg.subjects[k]]; });
  c = c || { subject: 'bio', status: 'draft', price: 790, sort_order: 0 };
  var sub = function (t, d) { return '<div class="msec"><h3>' + t + '</h3>' + (d ? '<p class="hint">' + d + '</p>' : '') + '</div>'; };
  openModal(mhead(c.course_id ? 'แก้ไขคอร์ส' : 'คอร์สใหม่') + '<form class="form" id="cf">' +
    sub('ข้อมูลหลัก') +
    (c.course_id ? '' : field('new_id', 'รหัสคอร์ส (ภาษาอังกฤษ ใช้ในลิงก์)', '', { ph: 'เช่น BIO-POSN-2027', hint: 'เว้นว่างได้ ระบบจะสร้างให้' })) +
    '<div class="row2">' + field('subject', 'วิชา', c.subject, { options: subj }) + field('level', 'ระดับ / สนามสอบ', c.level || '', { options: [['', '— ไม่ระบุ —']].concat((S.cfg.levels || []).map(function (l) { return [l, l]; })) }) + '</div><div class="row2">' + field('status', 'สถานะ', c.status, { options: [['draft', 'ฉบับร่าง (ยังไม่แสดงหน้าเว็บ)'], ['published', 'เปิดขาย']] }) + '</div>' +
    field('title', 'ชื่อคอร์ส', c.title) + field('subtitle', 'คำโปรยสั้น (แสดงบนการ์ดและใต้ชื่อคอร์ส)', c.subtitle) +
    '<div class="row2">' + field('price', 'ราคาขาย (บาท)', c.price, { mode: 'numeric' }) + field('full_price', 'ราคาเต็ม (ขีดฆ่า, ไม่ใส่ก็ได้)', c.full_price || '', { mode: 'numeric', ph: 'เช่น 1090' }) + '</div>' +
    field('sort_order', 'ลำดับการแสดง (น้อยขึ้นก่อน)', c.sort_order, { mode: 'numeric' }) +
    field('cover_url', 'รูปปกคอร์ส (ไม่ใส่ก็ได้)', c.cover_url, { ph: 'https://...', upload: true }) +
    sub('หน้าแนะนำคอร์ส', 'ช่องไหนเว้นว่าง ส่วนนั้นจะไม่แสดงบนหน้าเว็บ') +
    field('trailer_youtube', 'คลิปแนะนำคอร์ส (ลิงก์ YouTube)', c.trailer_youtube ? 'https://youtu.be/' + c.trailer_youtube : '', { ph: 'https://youtu.be/...', hint: 'แสดงใต้ชื่อคอร์ส ทุกคนดูได้ ใช้คลิป Unlisted หรือ Public ก็ได้' }) +
    field('highlights', 'จุดเด่นของคอร์ส (บรรทัดละ 1 ข้อ)', c.highlights, { area: true, ph: 'ครบทุกบทตามขอบเขต สอวน.\nมีชีทสรุปทุกบท\nตะลุยข้อสอบเก่า 10 ปี' }) +
    field('audience', 'คอร์สนี้เหมาะกับ (บรรทัดละ 1 ข้อ)', c.audience, { area: true, ph: 'นักเรียน ม.3–ม.5 ที่จะสอบค่าย 1\nคนที่ยังไม่เคยเรียนชีวะเชิงลึก' }) +
    field('description', 'รายละเอียดคอร์ส', c.description, { area: true }) +
    sub('ผู้สอน') +
    '<div class="row2">' + field('instructor_name', 'ชื่อผู้สอน', c.instructor_name, { ph: 'เช่น พี่ไอซ์' }) + field('instructor_title', 'ตำแหน่ง / ผลงานสั้น ๆ', c.instructor_title, { ph: 'เช่น อดีตผู้แทนค่าย สอวน.' }) + '</div>' +
    field('instructor_bio', 'ประวัติผู้สอน (บรรทัดละ 1 ข้อ จะแสดงเป็นรายการ)', c.instructor_bio, { area: true, ph: 'จบจากโรงเรียน...\nค่าย 1 โอลิมปิกวิชาการ สาขา...\nปัจจุบัน...' }) + field('instructor_photo', 'รูปผู้สอน (ไม่ใส่ก็ได้)', c.instructor_photo, { ph: 'https://...', upload: true }) +
    sub('คำถามที่พบบ่อย', 'แต่ละข้อเว้น 1 บรรทัดว่าง บรรทัดแรกเป็นคำถาม บรรทัดต่อไปเป็นคำตอบ ระบบจะเติมคำถามพื้นฐาน (ดูได้นานแค่ไหน, กี่เครื่อง, อนุมัติเมื่อไร) ต่อท้ายให้เอง') +
    field('faq', 'คำถามเฉพาะคอร์สนี้', c.faq, { area: true, ph: 'ต้องมีพื้นฐานอะไรก่อนไหม\nไม่ต้อง คอร์สเริ่มจากพื้นฐาน\n\nมีแบบฝึกหัดไหม\nมีท้ายทุกบท' }) +
    '<p class="err" id="cf-err" hidden></p><div class="rowx"><button class="pill">บันทึกคอร์ส</button>' + (c.course_id ? '<span class="hint">หน้าเว็บอัปเดตภายในไม่กี่นาที</span>' : '') + '</div></form>', true);
  $$('#cf textarea').forEach(function (t) { t.style.minHeight = '92px'; });
  submitForm('#cf', 'admin.course.save', '#cf-err', function (r) { closeModal(); toast('บันทึกคอร์สแล้ว'); if (location.hash === '#/admin/course/' + r.course_id) viewAdmin('course', r.course_id); else go('/admin/course/' + r.course_id); }, function () { return c.course_id ? { course_id: c.course_id } : {}; });
}
function aCourse(shell, cid) {
  Promise.all([api('admin.courses'), api('admin.lessons', { course_id: cid })]).then(function (r) {
    var c = r[0].filter(function (x) { return x.course_id === cid; })[0];
    if (!c) return shell('<p class="err">ไม่พบคอร์ส</p>');
    var ls = r[1], chapters = [];
    ls.forEach(function (l) { if (chapters.indexOf(l.chapter) < 0) chapters.push(l.chapter); });
    S.alessons = ls; S.achapters = chapters; setSubj(c.subject);
    shell('<div><a class="back" href="#/admin/courses">← คอร์สทั้งหมด</a></div><div class="spread"><div class="stack" style="gap:4px"><span class="mono">' + esc(c.subject_name) + ' · ' + esc(c.course_id) + '</span><h1>' + esc(c.title) + '</h1><span class="sm ink2">' + (c.status === 'published' ? 'เปิดขาย' : 'ฉบับร่าง') + ' · ' + baht(c.price) + ' · นักเรียน ' + c.students + ' คน</span></div>' +
      '<div class="rowx"><a class="pill quiet s" href="#/course/' + encodeURIComponent(cid) + '">ดูหน้าขาย</a><button class="pill ghost s" id="edit-course">แก้ไขข้อมูลและหน้าแนะนำ</button></div></div>' +
      '<div class="card form" id="lesson-form-wrap"></div>' +
      '<div class="spread"><h3 style="font-size:17px">ลำดับตอน · ' + ls.length + ' ตอน</h3><span class="hint">ลาก ⋮⋮ เพื่อเรียงใหม่ ระบบบันทึกให้เอง</span></div>' +
      (ls.length ? '<div class="list" id="llist">' + chapters.map(function (ch) {
        var items = ls.filter(function (l) { return l.chapter === ch; });
        return '<div class="li cap"><span>' + esc(ch) + '</span><span class="hint">' + items.length + ' ตอน</span></div>' + items.map(function (l) {
          return '<div class="li" draggable="true" data-lid="' + l.lesson_id + '"><span class="h" aria-hidden="true">⋮⋮</span><span class="t">' + esc(l.title) + (l.is_preview ? ' <span class="badge b-inv">ดูฟรี</span>' : '') + '</span><span class="d">' + l.duration_min + ' นาที</span><span class="rowx" style="gap:6px"><button class="pill quiet s" data-edit="' + l.lesson_id + '">แก้ไข</button></span></div>';
        }).join('');
      }).join('') + '</div>' : '<div class="empty"><p>ยังไม่มีตอน เพิ่มตอนแรกได้จากฟอร์มด้านบน</p></div>'));
    $('#edit-course').onclick = function () { courseModal(Object.assign({}, c, { description: c.description })); };
    lessonForm(cid, null);
    $$('[data-edit]').forEach(function (b) { b.onclick = function () { lessonForm(cid, ls.filter(function (l) { return l.lesson_id === b.dataset.edit; })[0]); $('#lesson-form-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    bindDrag(cid);
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
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
    '<div class="row2">' + field('duration_min', 'ความยาว (นาที)', l.duration_min, { mode: 'numeric' }) + field('attachment_url', 'ลิงก์ไฟล์ประกอบ (Google Drive, ไม่ใส่ก็ได้)', l.attachment_url, { ph: 'https://drive.google.com/...' }) + '</div>' +
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
    shell('<h1>ผู้ใช้</h1><form id="uqf" class="rowx"><input class="i" id="uq" name="q" style="max-width:360px" placeholder="ค้นหาชื่อ อีเมล เบอร์ หรือโรงเรียน" value="' + esc(q) + '"><button class="pill ghost s">ค้นหา</button></form>' +
      (us.length ? '<div class="tbl"><table style="min-width:760px"><thead><tr><th>ชื่อ</th><th>โรงเรียน</th><th>คอร์สที่มีสิทธิ์</th><th>อุปกรณ์ที่ใช้อยู่</th><th></th></tr></thead><tbody>' + us.map(function (u) {
        return '<tr><td>' + esc(u.first_name + ' ' + u.last_name) + ' (' + esc(u.nickname) + ')' + (u.is_repeat ? ' <span class="badge b-wait">ซิ่ว</span>' : '') + (u.role === 'admin' ? ' <span class="badge b-inv">แอดมิน</span>' : '') + (u.status === 'banned' ? ' <span class="badge b-no">ระงับ</span>' : '') +
          '<div class="sub">' + esc(u.email) + ' · ' + esc(u.phone) + '</div></td><td>' + esc(u.school) + '<div class="sub">' + esc(u.grade) + (u.is_repeat && u.current_university ? ' · ตอนนี้ ' + esc(u.current_faculty) + ' ' + esc(u.current_university) : '') + '</div>' + (u.dream_faculty ? '<div class="sub">ฝัน: ' + esc(u.dream_faculty) + ' · ' + esc(u.dream_university) + '</div>' : '') + '</td><td class="sm">' + (u.courses.length ? u.courses.map(esc).join('<br>') : '<span class="sub">–</span>') + '</td>' +
          '<td class="sm">' + (u.device ? esc(u.device) + '<div class="sub">ตั้งแต่ ' + thDate(u.device_since, true) + '</div>' : '<span class="sub">ไม่ได้เข้าสู่ระบบ</span>') + '</td>' +
          '<td><div class="acts">' + (u.user_id === S.user.user_id ? '<span class="sub">บัญชีของคุณ</span>' :
            (u.device ? '<button class="pill quiet s" data-u="reset" data-id="' + u.user_id + '" data-n="' + esc(u.nickname) + '">ล้างอุปกรณ์</button>' : '') +
            '<button class="pill quiet s" data-u="' + (u.role === 'admin' ? 'student' : 'admin') + '" data-id="' + u.user_id + '" data-n="' + esc(u.nickname) + '">' + (u.role === 'admin' ? 'ถอดแอดมิน' : 'ตั้งเป็นแอดมิน') + '</button>' +
            '<button class="pill ' + (u.status === 'banned' ? 'quiet' : 'danger') + ' s" data-u="' + (u.status === 'banned' ? 'active' : 'banned') + '" data-id="' + u.user_id + '" data-n="' + esc(u.nickname) + '">' + (u.status === 'banned' ? 'ยกเลิกระงับ' : 'ระงับ') + '</button>') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>ไม่พบผู้ใช้</p></div>'));
    $('#uqf').onsubmit = function (e) { e.preventDefault(); S.uq = $('#uq').value; viewAdmin('users'); };
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
function aSettings(shell) {
  api('admin.settings').then(function (s) {
    shell('<h1>ตั้งค่า</h1><form class="card form" id="sf" style="max-width:640px">' +
      '<h3 style="font-size:16px">หน้าแรก</h3>' + field('hero_eyebrow', 'ข้อความเล็กเหนือหัวข้อ', s.hero_eyebrow) + field('hero_title', 'หัวข้อใหญ่ (ใส่ | เพื่อขึ้นบรรทัดใหม่ บรรทัดที่ 2 จะเป็นสีเขียว)', s.hero_title) + field('hero_subtitle', 'ข้อความใต้หัวข้อ', s.hero_subtitle) +
      '<h3 style="font-size:16px;margin-top:6px">ทั่วไป</h3>' + field('announcement', 'ประกาศบนหัวเว็บ (เว้นว่างเพื่อซ่อน)', s.announcement, { ph: 'เช่น เปิดรับสมัครคอร์สชีววิทยา สอวน. รอบ 2027 แล้ว' }) +
      '<div class="row2">' + field('promptpay_id', 'เบอร์หรือเลขบัตรพร้อมเพย์', s.promptpay_id, { mode: 'numeric' }) + field('promptpay_name', 'ชื่อบัญชีที่แสดงใต้ QR', s.promptpay_name) + '</div>' +
      '<div class="row2">' + field('contact_ig', 'IG ติดต่อ (ไม่ต้องใส่ @)', s.contact_ig) + field('contact_phone', 'เบอร์ติดต่อเรื่องด่วน', s.contact_phone) + '</div>' +
      '<h3 style="font-size:16px;margin-top:6px">ข้อตกลงและนโยบาย</h3><p class="hint">เว้นว่างไว้ = ใช้ข้อความมาตรฐานของระบบ ถ้าจะแก้ ให้กดปุ่มด้านล่างเพื่อใส่ข้อความมาตรฐานลงช่องแล้วแก้ต่อ ใช้ # หัวข้อใหญ่, ## หัวข้อย่อย, - รายการ และ {ig} {phone} แทนช่องทางติดต่อ</p>' +
      '<button type="button" class="pill quiet s" id="copy-legal" style="justify-self:start">ใส่ข้อความมาตรฐานลงในช่องเพื่อแก้ไข</button>' +
      field('terms_text', 'ข้อตกลงการใช้งาน', s.terms_text, { area: true }) + field('privacy_text', 'นโยบายความเป็นส่วนตัว', s.privacy_text, { area: true }) +
      field('admin_emails', 'อีเมลที่รับแจ้งเตือนคำขอใหม่ (คั่นด้วย , )', s.admin_emails, { ph: 'a@gmail.com, b@gmail.com' }) +
      '<p class="err" id="sf-err" hidden></p><button class="pill" style="justify-self:start">บันทึก</button></form>');
    $('#copy-legal').onclick = function () { if (!$('#f-terms_text').value) $('#f-terms_text').value = DEFAULT_TERMS; if (!$('#f-privacy_text').value) $('#f-privacy_text').value = DEFAULT_PRIVACY; };
    submitForm('#sf', 'admin.settings.save', '#sf-err', function () { toast('บันทึกแล้ว'); api('config').then(function (c) { S.cfg = c; }); });
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}

/* ─── global events ─── */
document.addEventListener('click', function (e) {
  var t = e.target;
  var close = t.closest('[data-close]');
  if (close && (close.classList.contains('scrim') ? t === close : true)) { closeModal(); return; }
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
  if (ts) { THEME = ts.dataset.themeSet; store('ib_theme', THEME === 'auto' ? null : THEME); applyTheme(); $$('[data-theme-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === THEME)); }); toast(THEME === 'auto' ? 'ใช้ธีมตามเครื่อง' : THEME === 'dark' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'); return; }
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
  var pv = t.closest('[data-preview]');
  if (pv) { previewVideo(pv.dataset.preview, pv.dataset.title); return; }
  var dm = t.closest('[data-demo]');
  if (dm && window.__DEMO) { var r = window.__DEMO.login(dm.dataset.demo); setSession(r); closeModal(); toast('สวัสดี ' + r.user.nickname); if (dm.dataset.demo === 'admin') go('/admin'); else route(); }
});
document.addEventListener('submit', function (e) {
  if (e.target.id !== 'srch') return;
  e.preventDefault(); S.q = $('#srch-q').value.trim(); S.lv = ''; S.fsub = '';
  if (location.hash && !/^#\/?$/.test(location.hash)) { location.hash = '/'; setTimeout(function () { var cc = document.getElementById('courses'); if (cc) cc.scrollIntoView(); }, 400); }
  else if (S.homeRender) { S.homeRender(); var cc = document.getElementById('courses'); if (cc) window.scrollTo({ top: cc.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#modal').innerHTML) closeModal(); });
window.addEventListener('hashchange', function () { if ($('#modal .scrim')) closeModal(); if (!/^#\/learn\//.test(location.hash)) S.learn = null; route(); });

/* ─── boot ─── */
var BOOT = Date.now();
if (!DEMO && /PASTE_YOUR/.test(API_URL)) {
  var sp0 = document.getElementById('splash'); if (sp0) sp0.remove();
  document.getElementById('app').innerHTML = '<div class="gut"><div class="w empty" style="margin-top:60px"><h2>ยังไม่ได้ตั้งค่า API_URL</h2><p>เปิดไฟล์ index.html แล้ววาง URL ของ Apps Script Web App ในบรรทัด <code>var API_URL = ...</code></p></div></div>';
  return;
}
api('config').then(function (c) { S.cfg = c; }).catch(function () {})
  .then(function () { return S.token ? api('me').then(function (u) { S.user = u; }).catch(function () {}) : null; })
  .then(route)
  .then(function () { var sp = document.getElementById('splash'); if (!sp) return; setTimeout(function () { sp.classList.add('out'); setTimeout(function () { sp.remove(); }, 500); }, Math.max(0, 700 - (Date.now() - BOOT))); });
})();

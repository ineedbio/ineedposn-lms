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
  S.modalClose = onClose || null;
  var f = $('#modal input:not([type=hidden]), #modal select, #modal textarea'); if (f) setTimeout(function () { f.focus(); }, 30);
}
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
  '- ข้อมูลที่กรอกตอนสมัคร: ชื่อ นามสกุล ชื่อเล่น โรงเรียน ระดับชั้น เบอร์โทร อีเมล คณะและมหาวิทยาลัยในฝัน และคณะและมหาวิทยาลัยที่เรียนอยู่ (กรณีจบ ม.6 แล้ว)',
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
  '- ถอนความยินยอมในการเผยแพร่รูปหรือรีวิวได้ทุกเมื่อ',
  '- ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล หากเห็นว่าเราไม่ปฏิบัติตามกฎหมาย',
  '- ใช้สิทธิ์ได้โดยติดต่อแอดมินทาง IG เราจะตอบกลับภายใน 30 วัน',
  '## 6. ผู้ใช้ที่อายุต่ำกว่า 20 ปี',
  '- ผู้เรียนส่วนใหญ่ของเราเป็นนักเรียนมัธยม ผู้ปกครองสามารถติดต่อเราเพื่อสอบถาม ขอดู หรือขอลบข้อมูลของบุตรหลานได้',
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
      '<a href="#/my">คอร์สของฉัน</a><a href="#/orders">คำสั่งซื้อ</a><a href="#/profile">ข้อมูลส่วนตัว</a>' + (u.role === 'admin' ? '<a href="#/admin">หลังบ้าน</a>' : '') + '<button data-act="logout">ออกจากระบบ</button></div></div>'
    : '<div class="rowx"><button class="pill ghost s" data-act="login">เข้าสู่ระบบ</button><button class="pill s" data-act="signup">สมัครสมาชิก</button></div>';
  var mnav = '<nav class="mnav" aria-label="เมนู">' + nav.map(function (n) { return '<a href="#' + n[0] + '" class="' + (active === n[2] ? 'on' : '') + '">' + n[1] + '</a>'; }).join('') + (u ? '<a href="#/profile" class="' + (active === 'profile' ? 'on' : '') + '">บัญชี</a>' : '') + '</nav>';
  document.body.classList.toggle('has-mnav', !!u);
  return (S.cfg.announcement ? '<div class="ann">' + esc(S.cfg.announcement) + '</div>' : '') +
    '<header class="hdr gut"><div class="w"><a class="logo" href="#/"><img src="' + CATSRC + '" alt=""><span>INeed<span>Bio</span></span></a><nav class="nav">' +
    nav.map(function (n) { return '<a href="#' + n[0] + '" class="' + (active === n[2] ? 'on' : '') + '">' + n[1] + '</a>'; }).join('') + '</nav>' +
    '<form class="srch" id="srch" role="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="srch-q" name="q" placeholder="ค้นหาคอร์ส เช่น ชีวะ, A-Level" value="' + esc(S.q || '') + '" autocomplete="off"></form><div class="hr">' + themeSwitch() + cartBtn() + right + '</div></div></header>' + (u ? mnav : '');
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

function setSubj(s) { S.wantSubj = s || ''; document.body.classList.remove('s-bio', 's-chem', 's-phys', 's-math'); if (s) document.body.classList.add('s-' + s); }
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
  if (fresh) { freshScroll(); setSubj(S.wantSubj); }
  $('#app').innerHTML = (DEMO ? '<div class="demo-bar">เดโม: ข้อมูลทั้งหมดเป็นตัวอย่างและอยู่ในเบราว์เซอร์นี้เท่านั้น รีเฟรชแล้วจะเริ่มใหม่</div>' : '') + header(active) + '<main class="gut ' + anim + '"><div class="w">' + body + '</div></main>' + (noFooter ? '' : footer()) +
    '<div class="fab"><a class="ig" href="https://www.instagram.com/' + esc(S.cfg.contact_ig || 'ineedbiochem') + '" target="_blank" rel="noopener" title="ทักแอดมินทาง IG" aria-label="ทักแอดมินทาง IG"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg></a><button data-top="1" title="กลับขึ้นบน" aria-label="กลับขึ้นบน"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></div>';
  fadeImgs();
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
  S.scrolled = false; S.wantSubj = ''; S.fresh = true; clearTimeout(S.skT);
  var oldMain = $('#app main'); if (oldMain) oldMain.classList.add('leaving'); clearInterval(S.featT); S.homeRender = null;
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  stopPlayer();
  var parts = (location.hash.replace(/^#\/?/, '') || '').split('/').map(decodeURIComponent);
  var r = parts[0] || '';
  if (r === '') return viewHome();
  if (r === 'course') return viewCourse(parts[1]);
  if (r === 'results') return viewResults(parts[1]);
  if (r === 'terms' || r === 'privacy') return viewLegal(r);
  if (r === 'cart') return viewCart();
  if (r === 'bundle') return viewBundle(parts[1]);
  if (!S.user) { if (['my', 'learn', 'profile', 'admin', 'orders'].indexOf(r) >= 0) { go('/'); setTimeout(function () { authModal('login'); }, 50); return; } }
  if (r === 'my') return viewMy();
  if (r === 'orders') return viewOrders(parts[1]);
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
      '<section class="sec" id="sec-syllabus"><div class="spread"><h2>เนื้อหาในคอร์ส</h2><button class="link" id="syl-all">เปิดทุกบท</button></div><p class="sm ink2">' + (hasSections(c.chapters) ? sections(c.chapters).length + ' ส่วน · ' : '') + c.chapters.length + ' บท · ' + total + ' ตอน · ' + hm(c.total_min) + (previews.length ? ' · ดูฟรีได้ ' + previews.length + ' ตอน' : '') + '</p><div class="syl">' + (function () { var secs = hasSections(c.chapters) ? sections(c.chapters) : [{ name: '', chs: c.chapters.map(function (ch) { return { ch: ch, sub: '' }; }) }], k = 0; return secs.map(function (sec, si) {
        var sl = [].concat.apply([], sec.chs.map(function (x) { return x.ch.lessons; }));
        return (sec.name ? '<div class="secth"><span>' + esc(sec.name) + '</span><small>' + sl.length + ' ตอน · ' + hm(sl.reduce(function (a, l) { return a + l.duration_min; }, 0)) + '</small></div>' : '') + sec.chs.map(function (x) { var ch = x.ch, i = k++;
        var mins = ch.lessons.reduce(function (a, l) { return a + l.duration_min; }, 0);
        return '<details' + (i === 0 ? ' open' : '') + '><summary><span>' + esc(x.sub || ch.title) + '</span><span class="n">' + ch.lessons.length + ' ตอน · ' + hm(mins) + '</span></summary><ul>' + ch.lessons.map(function (l) {
          return '<li><span>' + esc(l.title) + (l.is_preview ? ' <button class="pill s ghost" style="margin-left:6px" data-preview="' + esc(l.youtube_id) + '" data-title="' + esc(l.title) + '">ดูฟรี</button>' : '') + '</span><span class="d">' + l.duration_min + ' นาที</span></li>';
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

/* ─── CART / ORDERS ─── */
var CART = (function () { try { var a = JSON.parse(store('ib_cart') || '[]'); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string' && x; }).slice(0, 30) : []; } catch (e) { return []; } })();
function saveCart() { store('ib_cart', CART.length ? JSON.stringify(CART) : null); $$('.cart-n').forEach(function (b) { b.textContent = CART.length; b.hidden = !CART.length; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }); }
function cartAdd(id, silent) { if (CART.indexOf(id) < 0) { CART.push(id); saveCart(); } if (!silent) toast('เพิ่มลงตะกร้าแล้ว'); }
function cartRemove(id) { CART = CART.filter(function (x) { return x !== id; }); saveCart(); }
var DEFAULT_PAY_TERMS = '- ชำระเงินโดยโอนเข้าบัญชี {account} ที่แสดงในหน้าชำระเงินของบิลนี้เท่านั้น\n- INeedBio ไม่รับผิดชอบทุกกรณี หากโอนเข้าบัญชีอื่นที่ไม่ได้แสดงในหน้านี้ แม้จะมีผู้อ้างว่าเป็นทีมงาน\n- ไม่มีนโยบายคืนเงินทุกกรณีเมื่อชำระเงินแล้ว\n- โอนแล้วแนบสลิปและกรอกข้อมูลการโอนให้ครบ แล้วแจ้งการชำระเงินทาง IG @{ig} อีกครั้ง\n- สิทธิ์เข้าเรียนจะเปิดหลังแอดมินตรวจยอดเงินแล้ว';
function ppFmt(id) { var n = String(id || '').replace(/\D/g, ''); return n.length === 10 ? n.slice(0, 3) + '-' + n.slice(3, 6) + '-' + n.slice(6) : n; }
function accLine(a) { return a.method === 'bank' ? 'ธนาคาร' + a.bank + ' เลขที่ ' + a.account_no + ' ชื่อบัญชี ' + a.account_name : 'พร้อมเพย์ ' + ppFmt(a.promptpay_id) + ' ชื่อบัญชี ' + a.account_name; }
function billIg(a) { return (a && a.ig) || S.cfg.contact_ig || 'ineedbiochem'; }
function instBlock(t) {
  var ls = String(t.bio || '').split(/\n+/).filter(function (x) { return x.trim(); });
  return '<div class="inst"><div class="ph">' + (t.photo ? '<img src="' + esc(imgSrc(t.photo)) + '" alt="" onerror="this.remove()">' : '') + '<span>' + esc(t.name.replace(/^พี่\s*/, '').slice(0, 1)) + '</span></div><div class="stack" style="gap:4px;flex:1;min-width:220px"><h3 style="font-size:20px">' + esc(t.name) + '</h3>' + (t.title ? '<span class="sm acc">' + esc(t.title) + '</span>' : '') +
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
      (a.qr_url ? '<div class="qrbox"><img src="' + esc(imgSrc(a.qr_url)) + '" alt="QR รับเงิน" style="max-width:220px;width:100%"><small>' + esc(a.account_name) + '<br>ยอด ' + baht(b.total) + '</small></div>' :
        a.method === 'bank' ? '' : '<div class="qrbox"><span class="pp">PromptPay</span>' + (qr || '') + '<small>' + esc(a.account_name) + '<br>ยอด ' + baht(b.total) + '</small></div>') +
      '<div class="accbox">' + (a.method === 'bank'
        ? '<div><span>ธนาคาร</span><b>' + esc(a.bank) + '</b></div><div><span>เลขบัญชี</span><b class="mono-n">' + esc(a.account_no) + '</b><button class="pill quiet s" data-copy="' + esc(String(a.account_no).replace(/\D/g, '')) + '">คัดลอก</button></div>'
        : '<div><span>พร้อมเพย์</span><b class="mono-n">' + esc(ppFmt(a.promptpay_id)) + '</b><button class="pill quiet s" data-copy="' + esc(a.promptpay_id) + '">คัดลอก</button></div>') +
      '<div><span>ชื่อบัญชี</span><b>' + esc(a.account_name) + '</b></div><div><span>ยอดโอน</span><b>' + baht(b.total) + '</b><button class="pill quiet s" data-copy="' + b.total + '">คัดลอก</button></div></div>' +
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
      (needPay.length ? '<a class="note no" style="display:block;margin-bottom:12px;text-decoration:none" href="#/orders/' + encodeURIComponent(needPay[0].o) + '">มีบิลรอชำระ/ส่งหลักฐาน ' + needPay.length + ' บิล · ' + needPay.map(function (x) { return x.b.items.map(function (i) { return esc(i.title); }).join(', '); }).join(' · ') + ' → ชำระเงิน</a>' : '') +
      (waitB.length ? '<div class="note wait" style="margin-bottom:12px">รอแอดมินตรวจยอด ' + waitB.length + ' บิล: ' + waitB.map(function (x) { return x.b.items.map(function (i) { return esc(i.title); }).join(', '); }).join(' · ') + '</div>' : '') +
      (list.length ? '<div class="mine">' + list.map(function (c, i) {
        var st = c.enrollment;
        return '<div class="mc' + sc(c.subject) + '"><div class="spread"><span class="mono">' + esc(c.subject_name) + '</span>' + statusBadge(st) + '</div><h3>' + esc(c.title) + '</h3>' +
          (st === 'approved'
            ? '<div class="stack" style="gap:6px"><div class="bar"><i style="width:' + c.percent + '%"></i></div><span class="sm ink2">เรียนไปแล้ว ' + c.percent + '% · ' + c.done_count + ' จาก ' + c.lesson_count + ' ตอน</span></div><div class="act"><a class="pill" href="#/learn/' + encodeURIComponent(c.course_id) + '">' + (c.done_count ? 'เรียนต่อ' : 'เริ่มเรียน') + '</a></div>'
            : st === 'pending' ? '<p class="sm ink2">ส่งสลิปเมื่อ ' + thDate(c.requested_at, true) + ' · แอดมินกำลังตรวจ</p>'
            : '<p class="sm ink2">สลิปไม่ผ่าน' + (c.note ? ': ' + esc(c.note) : '') + '</p><div class="act"><a class="pill ghost" href="#/course/' + encodeURIComponent(c.course_id) + '">ส่งสลิปใหม่</a></div>') + '</div>';
      }).join('') + '</div>' : '<div class="empty" style="margin-bottom:72px"><p>ยังไม่มีคอร์ส เลือกคอร์สที่สนใจแล้วใส่ตะกร้าได้เลย</p><a class="pill" href="#/">ดูคอร์สทั้งหมด</a></div>'));
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
  if (S.ytT) { clearInterval(S.ytT); S.ytT = null; }
  if (S.yt) { try { S.yt.destroy(); } catch (e) {} S.yt = null; }
  S.ytCtl = null; document.body.classList.remove('fake-fs-on');
}
/** el = กล่อง .player · opt.onEnd เรียกเมื่อดูจบ · opt.key ใช้จำตำแหน่งที่ดูค้างไว้ */
function safePlayer(el, vid, wm, opt) {
  opt = opt || {};
  stopPlayer();
  el.classList.add('sp', 'is-idle');
  el.innerHTML = '<div class="yt-crop"><div id="yt-host"></div></div><div class="yt-shield"></div>' +
    (wm ? '<span class="wm" id="wm" style="top:12%;left:8%">' + esc(wm) + '</span>' : '') +
    '<div class="yt-cover"><button class="yt-big" aria-label="เล่น">' + PI.play + '</button><div class="yt-msg"></div></div>' +
    '<div class="yt-bar"><input type="range" class="yt-seek" min="0" max="1000" value="0" step="1" aria-label="เลื่อนเวลา">' +
    '<div class="yt-row"><button class="yt-b" data-y="toggle" aria-label="เล่น/หยุด">' + PI.play + '</button><button class="yt-b" data-y="back" aria-label="ย้อน 10 วินาที">' + PI.back + '</button><button class="yt-b" data-y="fwd" aria-label="ข้าม 10 วินาที">' + PI.fwd + '</button>' +
    '<button class="yt-b" data-y="mute" aria-label="เปิด/ปิดเสียง">' + PI.vol + '</button><span class="yt-time">0:00 / 0:00</span><span style="flex:1"></span>' +
    '<select class="yt-rate" aria-label="ความเร็ว">' + [0.75, 1, 1.25, 1.5, 1.75, 2].map(function (r) { return '<option value="' + r + '"' + (r === 1 ? ' selected' : '') + '>' + r + 'x</option>'; }).join('') + '</select>' +
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
  $('.yt-rate', el).onchange = function () { if (P) P.setPlaybackRate(Number(this.value)); store('ib_rate', this.value); wake(); };
  var savedRate = Number(store('ib_rate')) || 1; $('.yt-rate', el).value = String(savedRate);
  loadYT().then(function () {
    if (!document.body.contains(el)) return;
    P = new YT.Player('yt-host', {
      videoId: vid, host: 'https://www.youtube-nocookie.com',
      playerVars: (function () { var v = { controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, cc_load_policy: 0 }; if (/^https?:/.test(location.origin)) v.origin = location.origin; return v; })(),
      events: {
        onReady: function () {
          S.yt = P; dur = P.getDuration() || 0; if (savedRate !== 1) P.setPlaybackRate(savedRate);
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

/* ─── LEARN ─── */
function viewLearn(cid, lid) {
  var draw = function (c) {
    clearTimeout(S.skT); freshScroll();
    var all = []; c.chapters.forEach(function (ch) { ch.lessons.forEach(function (l) { all.push(l); }); });
    if (!all.length) { page('my', '<div class="empty" style="margin-block:60px"><p>คอร์สนี้ยังไม่มีบทเรียน</p><a class="pill" href="#/my">กลับ</a></div>'); return; }
    var cur = all.filter(function (l) { return l.lesson_id === lid; })[0] || all.filter(function (l) { return !l.done; })[0] || all[0];
    var i = all.indexOf(cur), done = all.filter(function (l) { return l.done; }).length, pct = Math.round(done / all.length * 100);
    var chap = c.chapters.filter(function (ch) { return ch.lessons.indexOf(cur) >= 0; })[0];
    setSubj(c.subject);
    document.body.classList.remove('has-mnav');
    $('#app').innerHTML = (DEMO ? '<div class="demo-bar">เดโม: ข้อมูลทั้งหมดเป็นตัวอย่าง</div>' : '') +
      '<div class="gut" style="border-bottom:1px solid var(--line)"><div class="w lhdr"><a class="back" href="#/my">← ออกจากห้องเรียน</a><span class="t">' + esc(c.title) + '</span><span class="mono" style="text-transform:none">' + pct + '%</span></div></div>' +
      '<main class="gut' + (S.fresh ? ' pg-enter' : '') + '"><div class="w learn"><div class="stage">' +
      '<div class="player" id="player">' + (DEMO ? playerInner(cur.youtube_id, c.watermark) : '') + '</div>' +
      '<div class="lrow"><div style="min-width:0"><span class="mono">' + esc(chap.title) + '</span><h2>' + esc(cur.title) + '</h2></div>' +
      '<button class="pill ' + (cur.done ? 'ghost' : '') + '" id="done-btn">' + (cur.done ? '✓ ดูจบแล้ว' : 'ทำเครื่องหมายว่าดูจบ') + '</button></div>' +
      (cur.attachment_url ? '<div class="files"><a class="file" href="' + esc(cur.attachment_url) + '" target="_blank" rel="noopener"><b>PDF</b>ไฟล์ประกอบตอนนี้</a></div>' : '') +
      '<div class="spread" style="border-top:1px solid var(--line);padding-top:16px">' +
      (all[i - 1] ? '<a class="pill quiet s" href="#/learn/' + encodeURIComponent(cid) + '/' + all[i - 1].lesson_id + '">← ตอนก่อนหน้า</a>' : '<span></span>') +
      (all[i + 1] ? '<a class="pill s" href="#/learn/' + encodeURIComponent(cid) + '/' + all[i + 1].lesson_id + '">ตอนถัดไป →</a>' : '<span class="sm muted">ตอนสุดท้ายของคอร์ส</span>') + '</div>' +
      '<p class="hint">คลิปนี้สำหรับผู้ซื้อคอร์สเท่านั้น บัญชีหนึ่งใช้ได้ครั้งละ 1 เครื่อง ห้ามอัดหน้าจอหรือแชร์ลิงก์ · ปุ่มลัด: เว้นวรรค = เล่น/หยุด, ←/→ = 5 วินาที, F = เต็มจอ</p>' +
      '</div><aside class="lside"><div class="prog"><span class="sm ink2">เรียนไปแล้ว ' + done + ' จาก ' + all.length + ' ตอน</span><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      (function () { var sec = '', useS = hasSections(c.chapters), si = 0; return c.chapters.map(function (ch) {
        var j = ch.title.indexOf(' › '), sn = j < 0 ? ch.title : ch.title.slice(0, j), sub = j < 0 ? '' : ch.title.slice(j + 3), head = '';
        if (useS && sn !== sec) { sec = sn; si++; head = '<div class="lsec">' + esc(sn) + '</div>'; }
        return head + '<div class="chap">' + esc(useS ? (sub || sn) : ch.title) + '</div>' + ch.lessons.map(function (l) {
          return '<a class="ep' + (l === cur ? ' on' : '') + (l.done ? ' done' : '') + '" href="#/learn/' + encodeURIComponent(cid) + '/' + l.lesson_id + '"><span class="ck">' + (l.done ? '✓' : '') + '</span><span>' + esc(l.title) + '</span><span class="d">' + l.duration_min + '\'</span></a>';
        }).join('');
      }).join(''); })() + '</aside></div></main>';
    S.fresh = false;
    $('#done-btn').onclick = function () {
      var b = this, nv = !cur.done; busy(b, true);
      api('progress.set', { lesson_id: cur.lesson_id, done: nv }).then(function () {
        cur.done = nv; S.mem.mine = null;
        if (nv && all[i + 1]) toast('เยี่ยม! ไปตอนถัดไปได้เลย');
        draw(c);
      }).catch(function (e) { busy(b, false); toast(e.message, true); });
    };
    if (!DEMO) safePlayer($('#player'), cur.youtube_id, c.watermark, { key: cur.lesson_id, onEnd: function (msg) {
      var nx = all[i + 1];
      msg.innerHTML = 'ดูจบตอนนี้แล้ว' + (nx ? '<br><a class="pill" style="margin-top:12px" href="#/learn/' + encodeURIComponent(cid) + '/' + nx.lesson_id + '">ตอนถัดไป: ' + esc(nx.title) + ' →</a>' : '<br>จบคอร์สแล้ว เก่งมาก!');
      if (cur.done) return;
      api('progress.set', { lesson_id: cur.lesson_id, done: true }).then(function () {
        cur.done = true; S.mem.mine = null;
        var b = $('#done-btn'); if (b) { b.textContent = '✓ ดูจบแล้ว'; b.classList.add('ghost'); }
        var ep = $('.ep.on'); if (ep) { ep.classList.add('done'); $('.ck', ep).textContent = '✓'; }
      }).catch(function () {});
    } });
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
  var tabs = [['dash', 'ภาพรวม'], ['orders', 'คำสั่งซื้อ'], ['coupons', 'โค้ดส่วนลด'], ['bundles', 'แพ็กเกจ'], ['accounts', 'บัญชีรับเงิน'], ['courses', 'คอร์สและบทเรียน'], ['results', 'ผลงานนักเรียน'], ['users', 'ผู้ใช้'], ['requests', 'สิทธิ์เข้าเรียน'], ['settings', 'ตั้งค่า']];
  var shell = function (body, skel) {
    page('admin', '<div class="adm"><nav class="aside" aria-label="เมนูหลังบ้าน">' + tabs.map(function (t) {
      return '<a href="#/admin/' + t[0] + '" class="' + (tab === t[0] || (tab === 'course' && t[0] === 'courses') ? 'on' : '') + '"><span>' + t[1] + '</span>' + (t[0] === 'orders' && S.pending ? '<span class="n">' + S.pending + '</span>' : '') + (t[0] === 'requests' && S.pendingLegacy ? '<span class="n">' + S.pendingLegacy + '</span>' : '') + '</a>';
    }).join('') + '</nav><div class="amain" id="amain">' + body + '</div></div>', true, skel);
  };
  clearTimeout(S.skT); S.skT = setTimeout(function () { shell(skeleton('admin'), true); }, 350);
  var fn = { dash: aDash, orders: aOrders, coupons: aCoupons, bundles: aBundles, accounts: aAccounts, requests: aRequests, courses: aCourses, course: aCourse, results: aResults, users: aUsers, settings: aSettings }[tab] || aDash;
  fn(shell, arg);
}
function refreshPending() { return api('admin.stats').then(function (s) { S.pendingLegacy = s.pending_legacy || 0; S.pending = s.pending - S.pendingLegacy; return s; }); }
function aDash(shell) {
  refreshPending().then(function (s) {
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
  if (!S.accs) return loadAccs().then(function () { courseModal(c); }).catch(function (e) { toast(e.message, true); });
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
    sub('หน้าแนะนำคอร์ส', 'ช่องไหนเว้นว่าง ส่วนนั้นจะไม่แสดงบนหน้าเว็บ') +
    field('trailer_youtube', 'คลิปแนะนำคอร์ส (ลิงก์ YouTube)', c.trailer_youtube ? 'https://youtu.be/' + c.trailer_youtube : '', { ph: 'https://youtu.be/...', hint: 'แสดงใต้ชื่อคอร์ส ทุกคนดูได้ ใช้คลิป Unlisted หรือ Public ก็ได้' }) +
    field('highlights', 'จุดเด่นของคอร์ส (บรรทัดละ 1 ข้อ)', c.highlights, { area: true, ph: 'ครบทุกบทตามขอบเขต สอวน.\nมีชีทสรุปทุกบท\nตะลุยข้อสอบเก่า 10 ปี' }) +
    field('audience', 'คอร์สนี้เหมาะกับ (บรรทัดละ 1 ข้อ)', c.audience, { area: true, ph: 'นักเรียน ม.3–ม.5 ที่จะสอบค่าย 1\nคนที่ยังไม่เคยเรียนชีวะเชิงลึก' }) +
    field('description', 'รายละเอียดคอร์ส', c.description, { area: true }) +
    sub('ผู้สอน') +
    '<div class="row2">' + field('instructor_name', 'ชื่อผู้สอน', c.instructor_name, { ph: 'เช่น พี่ไอซ์' }) + field('instructor_title', 'ตำแหน่ง / ผลงานสั้น ๆ', c.instructor_title, { ph: 'เช่น อดีตผู้แทนค่าย สอวน.' }) + '</div>' +
    field('instructor_bio', 'ประวัติผู้สอน (บรรทัดละ 1 ข้อ จะแสดงเป็นรายการ)', c.instructor_bio, { area: true, ph: 'จบจากโรงเรียน...\nค่าย 1 โอลิมปิกวิชาการ สาขา...\nปัจจุบัน...' }) + field('instructor_photo', 'รูปผู้สอน (ไม่ใส่ก็ได้)', c.instructor_photo, { ph: 'https://...', upload: true }) +
    sub('ผู้สอนคนที่ 2', 'ใส่เมื่อคอร์สนี้สอนร่วมกัน 2 คน เว้นว่างถ้ามีผู้สอนคนเดียว') +
    '<div class="row2">' + field('instructor2_name', 'ชื่อผู้สอน', c.instructor2_name, { ph: 'เช่น พี่น้ำแข็ง' }) + field('instructor2_title', 'ตำแหน่ง / ผลงานสั้น ๆ', c.instructor2_title) + '</div>' +
    field('instructor2_bio', 'ประวัติผู้สอน (บรรทัดละ 1 ข้อ)', c.instructor2_bio, { area: true }) + field('instructor2_photo', 'รูปผู้สอน (ไม่ใส่ก็ได้)', c.instructor2_photo, { ph: 'https://...', upload: true }) +
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
      '<div class="spread"><h3 style="font-size:17px">ลำดับตอน · ' + ls.length + ' ตอน</h3><div class="rowx"><span class="hint">ลาก ⋮⋮ เพื่อเรียงใหม่ ระบบบันทึกให้เอง</span><button class="pill ghost s" id="bulk-btn">+ วางหลายตอนพร้อมกัน</button></div></div>' +
      (ls.length ? '<div class="list" id="llist">' + chapters.map(function (ch) {
        var items = ls.filter(function (l) { return l.chapter === ch; });
        return '<div class="li cap"><span>' + esc(ch) + '</span><span class="hint">' + items.length + ' ตอน</span></div>' + items.map(function (l) {
          return '<div class="li" draggable="true" data-lid="' + l.lesson_id + '"><span class="h" aria-hidden="true">⋮⋮</span><span class="t">' + esc(l.title) + (l.is_preview ? ' <span class="badge b-inv">ดูฟรี</span>' : '') + '</span><span class="d">' + l.duration_min + ' นาที</span><span class="rowx" style="gap:6px"><button class="pill quiet s" data-edit="' + l.lesson_id + '">แก้ไข</button></span></div>';
        }).join('');
      }).join('') + '</div>' : '<div class="empty"><p>ยังไม่มีตอน เพิ่มตอนแรกได้จากฟอร์มด้านบน</p></div>'));
    $('#edit-course').onclick = function () { courseModal(Object.assign({}, c, { description: c.description })); };
    $('#bulk-btn').onclick = function () { bulkModal(cid, chapters[chapters.length - 1] || ''); };
    lessonForm(cid, null);
    $$('[data-edit]').forEach(function (b) { b.onclick = function () { lessonForm(cid, ls.filter(function (l) { return l.lesson_id === b.dataset.edit; })[0]); $('#lesson-form-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    bindDrag(cid);
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
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
      '<h3 style="font-size:16px;margin-top:6px">การชำระเงิน</h3><p class="hint">บัญชีแยกตามวิชาตั้งได้ที่เมนู <a href="#/admin/accounts">บัญชีรับเงิน</a> ส่วนนี้คือบัญชีหลัก ใช้กับวิชาที่ยังไม่ได้ผูกบัญชี</p>' +
      '<div class="row2">' + field('promptpay_id', 'บัญชีหลัก: เบอร์หรือเลขบัตรพร้อมเพย์', s.promptpay_id, { mode: 'numeric' }) + field('promptpay_name', 'บัญชีหลัก: ชื่อบัญชี', s.promptpay_name) + '</div>' +
      field('order_expire_hours', 'ต้องส่งหลักฐานภายในกี่ชั่วโมงหลังสั่งซื้อ (เลยแล้วบิลยกเลิกเอง)', s.order_expire_hours || '48', { mode: 'numeric' }) +
      field('pay_terms_text', 'ข้อตกลงการชำระเงิน (แสดงตอนยืนยันคำสั่งซื้อและในทุกบิล)', s.pay_terms_text || DEFAULT_PAY_TERMS, { area: true, hint: 'บรรทัดละ 1 ข้อ ขึ้นต้นด้วย - · {account} = ชื่อและเลขบัญชีของบิลนั้น · {ig} = IG ที่ให้แจ้งโอน' }) +
      '<div class="f">ข้อมูลที่นักเรียนต้องกรอกตอนแจ้งโอน (รูปสลิปบังคับเสมอ)<div class="row2">' + [['paid_at', 'วันเวลาที่โอน'], ['amount', 'ยอดที่โอน'], ['from_bank', 'ธนาคารที่โอนออก'], ['payer_name', 'ชื่อเจ้าของบัญชีที่โอน']].map(function (x) { return field('proof_' + x[0], x[1], s['proof_' + x[0]] || 'required', { options: [['required', 'บังคับกรอก'], ['optional', 'ไม่บังคับ'], ['hidden', 'ไม่ต้องถาม']] }); }).join('') + '</div></div>' +
      field('proof_extra', 'ช่องที่อยากถามเพิ่ม (บรรทัดละ 1 ช่อง ใส่ |required ต่อท้ายถ้าบังคับ)', s.proof_extra, { area: true, ph: 'LINE ID|required\nหมายเหตุถึงแอดมิน' }) +
      field('contact_ig', 'IG ติดต่อ (ไม่ต้องใส่ @)', s.contact_ig) +
      '<h3 style="font-size:16px;margin-top:6px">ข้อตกลงและนโยบาย</h3><p class="hint">เว้นว่างไว้ = ใช้ข้อความมาตรฐานของระบบ ถ้าจะแก้ ให้กดปุ่มด้านล่างเพื่อใส่ข้อความมาตรฐานลงช่องแล้วแก้ต่อ ใช้ # หัวข้อใหญ่, ## หัวข้อย่อย, - รายการ และ {ig} แทน IG ติดต่อ</p>' +
      '<button type="button" class="pill quiet s" id="copy-legal" style="justify-self:start">ใส่ข้อความมาตรฐานลงในช่องเพื่อแก้ไข</button>' +
      field('terms_text', 'ข้อตกลงการใช้งาน', s.terms_text, { area: true }) + field('privacy_text', 'นโยบายความเป็นส่วนตัว', s.privacy_text, { area: true }) +
      field('admin_emails', 'อีเมลที่รับแจ้งเตือนคำขอใหม่ (คั่นด้วย , )', s.admin_emails, { ph: 'a@gmail.com, b@gmail.com' }) +
      '<p class="err" id="sf-err" hidden></p><button class="pill" style="justify-self:start">บันทึก</button></form>');
    $('#copy-legal').onclick = function () { if (!$('#f-terms_text').value) $('#f-terms_text').value = DEFAULT_TERMS; if (!$('#f-privacy_text').value) $('#f-privacy_text').value = DEFAULT_PRIVACY; };
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
  Promise.all([api('admin.bills', { status: st, account_id: acc, q: q }), loadAccs()]).then(function (r) {
    var list = r[0], accs = r[1];
    if (st === 'reviewing' && !acc && !q) S.pending = list.length;
    S.blist = list;
    shell('<div class="spread"><h1>คำสั่งซื้อ</h1><button class="pill ghost s" id="grant-btn">+ เพิ่มสิทธิ์ให้ผู้ใช้เอง</button></div>' +
      '<div class="rowx"><div class="seg" role="group">' + [['reviewing', 'รอตรวจ'], ['awaiting_payment', 'รอโอน'], ['rejected', 'ไม่ผ่าน'], ['approved', 'อนุมัติแล้ว'], ['closed', 'ยกเลิก/หมดเวลา']].map(function (t) { return '<button data-btab="' + t[0] + '" aria-pressed="' + (st === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<select class="i" id="bacc" style="width:auto;min-width:180px"><option value="">ทุกบัญชีรับเงิน</option><option value="DEFAULT"' + (acc === 'DEFAULT' ? ' selected' : '') + '>บัญชีหลัก</option>' + accs.map(function (a) { return '<option value="' + esc(a.account_id) + '"' + (acc === a.account_id ? ' selected' : '') + '>' + esc(a.label) + '</option>'; }).join('') + '</select>' +
      '<form id="bqf" class="rowx"><input class="i" id="bq" style="width:220px" placeholder="ค้นหาเลขบิล ชื่อ อีเมล เบอร์" value="' + esc(q) + '"></form></div>' +
      (st === 'reviewing' ? '<p class="ink2 sm">เปิดดูสลิป เทียบยอดกับแอปธนาคารของบัญชีนั้น แล้วกดอนุมัติ นักเรียนได้อีเมลแจ้งและเข้าเรียนได้ทันที</p>' : st === 'awaiting_payment' ? '<p class="ink2 sm">บิลที่สร้างแล้วแต่ยังไม่ส่งหลักฐาน ถ้าน้องโอนแล้วแจ้งทาง IG อย่างเดียว เปิดบิลแล้วกดอนุมัติได้เลย</p>' : '') +
      (list.length ? '<div class="tbl"><table style="min-width:760px"><thead><tr><th>บิล</th><th>นักเรียน</th><th>คอร์ส</th><th class="num">ยอด</th><th>บัญชีรับ</th><th>ตรวจเบื้องต้น</th><th></th></tr></thead><tbody>' + list.map(function (b) {
        var bad = (b.checks || []).filter(function (c) { return !c.ok || c.warn; }).length;
        return '<tr><td><b class="sm">' + esc(b.bill_id) + '</b><div class="sub">' + thDate(b.submitted_at || b.created_at, true) + '</div></td><td>' + esc(b.name) + '<div class="sub">' + esc(b.nickname) + ' · ' + esc(b.phone) + '</div></td>' +
          '<td class="sm">' + b.items.map(function (i) { return esc(i.title); }).join('<br>') + '</td><td class="num">' + baht(b.total) + (b.discount ? '<div class="sub">ลด ' + baht(b.discount) + '</div>' : '') + '</td><td class="sm">' + esc(b.account_label) + '</td>' +
          '<td class="sm">' + (b.checks && b.checks.length ? (bad ? '<span class="badge b-wait">! ' + bad + ' จุดที่ต้องดู</span>' : '<span class="badge b-ok">✓ ผ่าน ' + b.checks.length + ' ข้อ</span>') : '<span class="sub">–</span>') + '</td>' +
          '<td><div class="acts"><button class="pill ' + (st === 'reviewing' ? '' : 'quiet ') + 's" data-bill="' + esc(b.bill_id) + '">' + (st === 'reviewing' ? 'ตรวจ' : 'เปิดดู') + '</button></div></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>' + (st === 'reviewing' ? 'ไม่มีบิลรอตรวจ ตรวจครบแล้ว' : 'ยังไม่มีรายการ') + '</p></div>'));
    $$('[data-btab]').forEach(function (b) { b.onclick = function () { S.bTab = b.dataset.btab; viewAdmin('orders'); }; });
    $('#bacc').onchange = function () { S.bAcc = this.value; viewAdmin('orders'); };
    $('#bqf').onsubmit = function (e) { e.preventDefault(); S.bq = $('#bq').value.trim(); viewAdmin('orders'); };
    $$('[data-bill]').forEach(function (b) { b.onclick = function () { billModal(list.filter(function (x) { return x.bill_id === b.dataset.bill; })[0]); }; });
    $('#grant-btn').onclick = grantModal;
  }).catch(function (e) { shell('<p class="err">' + esc(e.message) + '</p>'); });
}
function billModal(b) {
  var p = b.proof || {}, a = b.account || {};
  var row = function (k, v) { return v ? '<div><span>' + k + '</span><b>' + v + '</b></div>' : ''; };
  var extra = Object.keys(p).filter(function (k) { return ['paid_at', 'amount', 'from_bank', 'payer_name', 'payer_relation'].indexOf(k) < 0; });
  var canDecide = ['reviewing', 'awaiting_payment', 'rejected', 'expired'].indexOf(b.status) >= 0;
  openModal(mhead('บิล ' + esc(b.bill_id), esc(b.name) + ' · ยอดบิล ' + baht(b.total)) +
    '<div class="bm"><div>' + (b.has_slip ? '<div id="slipv" class="loading" style="padding:40px 0;text-align:center"><span class="spin"></span></div>' : '<div class="note plain">ยังไม่ได้แนบสลิป</div>') + '</div>' +
    '<div class="stack" style="gap:12px"><div class="kv">' + row('สถานะ', billBadge(b.status)) + row('นักเรียน', esc(b.name) + ' (' + esc(b.nickname) + ')') + row('อีเมล', esc(b.email)) + row('เบอร์', esc(b.phone)) +
    row('บัญชีรับ', esc(b.account_label) + '<br><span class="sub">' + esc(accLine(a)) + '</span>') + '</div>' +
    '<ul class="bitems">' + b.items.map(function (it) { return '<li><span>' + esc(it.title) + '</span><span>' + (it.discount ? '<s class="muted">' + baht(it.price) + '</s> ' : '') + baht(it.net) + '</span></li>'; }).join('') + '<li class="t"><span>ยอดบิล</span><b>' + baht(b.total) + '</b></li></ul>' +
    (b.proof ? '<div class="kv"><h4>ข้อมูลที่นักเรียนกรอก</h4>' + row('โอนเมื่อ', p.paid_at ? thDate(p.paid_at, true) : '') + row('ยอดที่โอน', p.amount != null ? baht(p.amount) : '') + row('จากธนาคาร', esc(p.from_bank || '')) +
      row('ชื่อผู้โอน', esc(p.payer_name || '') + (p.payer_relation ? ' <span class="sub">(' + esc(p.payer_relation) + ')</span>' : '')) + extra.map(function (k) { return row(esc(k), esc(p[k])); }).join('') + row('ส่งเมื่อ', thDate(b.submitted_at, true)) + '</div>' : '') +
    (b.checks && b.checks.length ? '<ul class="chk">' + checksHtml(b.checks) + '</ul>' : '') +
    (b.note ? '<div class="note no">เหตุผลครั้งก่อน: ' + esc(b.note) + '</div>' : '') + '</div></div>' +
    (canDecide ? '<form class="form" id="dec">' + (b.status === 'reviewing' ? field('note', 'เหตุผล (ใส่เมื่อไม่อนุมัติ นักเรียนจะเห็นในอีเมลและหน้าคำสั่งซื้อ)', '', { ph: 'เช่น ยอดโอนไม่ครบ, ไม่พบยอดเข้าบัญชี' }) : '<p class="hint">' + (b.status === 'awaiting_payment' ? 'น้องยังไม่ได้ส่งหลักฐานบนเว็บ ถ้าตรวจแล้วว่ายอดเข้าบัญชีจริง (เช่น แจ้งทาง IG) กดอนุมัติได้เลย' : 'อนุมัติได้ถ้าตรวจแล้วว่ายอดเข้าบัญชีจริง') + '</p>') +
      '<div class="rowx" style="justify-content:flex-end">' + (b.status === 'reviewing' ? '<button type="button" class="pill danger" id="rej">ไม่อนุมัติ</button>' : '') + '<button type="button" class="pill" id="apv">อนุมัติ · เปิดสิทธิ์ ' + b.items.length + ' คอร์ส</button></div></form>' : ''), true);
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
  var subs = S.cfg.subjects || {};
  a = a || { method: 'promptpay', status: 'active', subjects: [], sort_order: 0 };
  openModal(mhead(a.account_id ? 'แก้ไขบัญชีรับเงิน' : 'เพิ่มบัญชีรับเงิน', 'นักเรียนเห็นเลขบัญชี ชื่อบัญชี QR และหมายเหตุ ส่วนชื่อเรียกเห็นเฉพาะแอดมิน') + '<form class="form" id="af2">' +
    '<div class="row2">' + field('label', 'ชื่อเรียก (เห็นเฉพาะแอดมิน)', a.label, { ph: 'เช่น บัญชีพี่หมอซัน' }) + field('method', 'ช่องทางรับเงิน', a.method, { options: [['promptpay', 'พร้อมเพย์ (สร้าง QR ใส่ยอดให้)'], ['bank', 'เลขบัญชีธนาคาร']] }) + '</div>' +
    '<div class="m-pp">' + field('promptpay_id', 'เบอร์มือถือหรือเลขบัตรประชาชนที่ผูกพร้อมเพย์', a.promptpay_id, { mode: 'numeric', ph: '08x-xxx-xxxx' }) + '</div>' +
    '<div class="row2 m-bank">' + field('bank', 'ธนาคาร', a.bank, { options: [['', '— เลือก —']].concat((S.cfg.banks || []).filter(function (x) { return !/Wallet|อื่นๆ/.test(x); }).map(function (x) { return [x, x]; })) }) + field('account_no', 'เลขบัญชี', a.account_no, { mode: 'numeric', ph: 'xxx-x-xxxxx-x' }) + '</div>' +
    field('account_name', 'ชื่อบัญชี (ต้องตรงกับที่ขึ้นในแอปธนาคาร)', a.account_name) +
    field('qr_url', 'รูป QR รับเงินของตัวเอง (ไม่ใส่ก็ได้)', a.qr_url, { upload: true, ph: 'https://...', hint: 'ถ้าใส่ จะแสดงรูปนี้แทน QR ที่ระบบสร้าง' }) +
    '<div class="row2">' + field('ig', 'IG ที่ให้น้องแจ้งโอน (ไม่ใส่ = IG หลัก)', a.ig, { ph: S.cfg.contact_ig || 'ineedbiochem' }) + field('sort_order', 'ลำดับ', a.sort_order, { mode: 'numeric' }) + '</div>' +
    field('note', 'หมายเหตุที่นักเรียนเห็น', a.note, { ph: 'เช่น โอนแล้วรออนุมัติไม่เกิน 12 ชม.' }) +
    '<div class="f">ใช้กับวิชา<div class="rowx">' + Object.keys(subs).map(function (k) { return '<label class="chk-l"><input type="checkbox" name="subj_' + k + '"' + (a.subjects.indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(subs[k]) + '</label>'; }).join('') + '</div><span class="hint">ถ้าเลือกวิชาเดียวกันหลายบัญชี ระบบใช้บัญชีที่ลำดับน้อยกว่า อยากให้บางคอร์สใช้บัญชีนี้ ตั้งได้ในหน้าแก้ไขคอร์ส</span></div>' +
    field('status', 'สถานะ', a.status, { options: [['active', 'ใช้งาน'], ['inactive', 'ปิดใช้งาน (คอร์สจะไปใช้บัญชีถัดไป)']] }) +
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

function cpLabel(c) { return c.kind === 'percent' ? 'ลด ' + c.value + '%' + (Number(c.max_discount) ? ' สูงสุด ' + baht(c.max_discount) : '') : 'ลด ' + baht(c.value); }
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
    '<div class="row2">' + field('kind', 'แบบส่วนลด', c.kind, { options: [['percent', 'ลดเป็นเปอร์เซ็นต์'], ['fixed', 'ลดเป็นบาท']] }) + field('value', 'มูลค่า', c.value, { mode: 'numeric', ph: 'เช่น 10 หรือ 300' }) + '</div>' +
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

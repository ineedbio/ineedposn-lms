// Cookie consent (approved demo), next to public/ineedbio/app.js which stays untouched.
//  - First visit: a compact bar at the bottom centre — "ปฏิเสธที่ไม่จำเป็น" / "ยอมรับทั้งหมด" / "ตั้งค่าคุกกี้"
//    (necessary: always on · analytics · marketing). The choice is kept in localStorage (ib_consent).
//  - Analytics / marketing scripts are only ever loaded after a "yes": GA4 (window.INEEDBIO_GA_ID) and
//    Meta Pixel (window.INEEDBIO_PIXEL_ID), plus any <script type="text/plain" data-consent="analytics|marketing"
//    data-src="…">. Nothing is loaded before or without consent; turning one off reloads the page so it's gone.
//  - Change later: "ตั้งค่าคุกกี้" in the footer and on #/privacy (which also gets a short cookie section).
(function () {
  'use strict';
  var KEY = 'ib_consent', VER = 1;
  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.v === VER ? v : null; } catch (e) { return null; } }
  function write(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }
  var state = read(), loaded = {};

  function addScript(src, attrs) { var s = document.createElement('script'); s.async = true; s.src = src; if (attrs) for (var k in attrs) s.setAttribute(k, attrs[k]); document.head.appendChild(s); return s; }
  function load(kind) {
    if (loaded[kind]) return; loaded[kind] = true;
    if (kind === 'analytics' && window.INEEDBIO_GA_ID) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', window.INEEDBIO_GA_ID, { anonymize_ip: true });
      addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(window.INEEDBIO_GA_ID));
    }
    if (kind === 'marketing' && window.INEEDBIO_PIXEL_ID) {
      var f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      if (!window._fbq) window._fbq = f; f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
      addScript('https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', window.INEEDBIO_PIXEL_ID); window.fbq('track', 'PageView');
    }
    Array.prototype.forEach.call(document.querySelectorAll('script[type="text/plain"][data-consent="' + kind + '"]'), function (s) {
      if (s.dataset.src) addScript(s.dataset.src); else { var n = document.createElement('script'); n.text = s.text; document.head.appendChild(n); }
      s.removeAttribute('data-consent');
    });
  }
  function apply(c) { if (c.analytics) load('analytics'); if (c.marketing) load('marketing'); }
  window.ibConsent = { get: function () { return state; }, open: function () { show(true); } };

  var bar = null;
  var ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="10" r="1.1" fill="currentColor"/><circle cx="14" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="14" r="1.1" fill="currentColor"/><circle cx="10" cy="15" r="1.1" fill="currentColor"/></svg>';
  function sw(id, on, locked) { return '<label class="ck-sw"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (locked ? ' disabled' : '') + '><span class="ck-tr"></span><span class="ck-th"></span></label>'; }
  function show(settings) {
    if (bar) bar.remove();
    var c = state || { analytics: false, marketing: false };
    bar = document.createElement('div');
    bar.className = 'ck-layer';
    bar.innerHTML = '<div class="ck-card" role="dialog" aria-live="polite" aria-label="การใช้คุกกี้">' +
      '<div class="ck-top"><span class="ck-ic">' + ICON + '</span><div class="ck-txt"><h2>เว็บนี้ใช้คุกกี้</h2><p>เราใช้คุกกี้เพื่อให้เว็บทำงานได้ปกติ จดจำการเข้าสู่ระบบ และเข้าใจการใช้งานเพื่อปรับปรุงคอร์สเรียน อ่านรายละเอียดได้ที่ <a href="#/privacy">นโยบายความเป็นส่วนตัว</a></p></div></div>' +
      '<div class="ck-set"' + (settings ? '' : ' hidden') + '>' +
      '<div class="ck-row"><div><strong>คุกกี้ที่จำเป็น</strong><span>จำเป็นสำหรับการเข้าสู่ระบบ ตะกร้าสินค้า และความปลอดภัยของบัญชี ปิดไม่ได้</span><em>เปิดใช้งานเสมอ</em></div>' + sw('ck-n', true, true) + '</div>' +
      '<div class="ck-row"><div><strong>คุกกี้วิเคราะห์การใช้งาน</strong><span>ช่วยให้เราดูว่าน้องๆ ใช้งานหน้าไหนบ้าง เพื่อปรับปรุงคอร์สและหน้าเว็บ</span></div>' + sw('ck-a', state ? c.analytics : true) + '</div>' +
      '<div class="ck-row"><div><strong>คุกกี้การตลาด</strong><span>ใช้แสดงโปรโมชันและติดตามผลแคมเปญโฆษณาของ INeedBio</span></div>' + sw('ck-m', c.marketing) + '</div>' +
      '</div>' +
      '<div class="ck-act"><button type="button" class="ck-link" id="ck-opt">' + (settings ? 'บันทึกการตั้งค่า' : 'ตั้งค่าคุกกี้') + '</button><span class="ck-sp"></span>' +
      '<button type="button" class="ck-btn ck-sec" id="ck-no">ปฏิเสธที่ไม่จำเป็น</button><button type="button" class="ck-btn ck-pri" id="ck-yes">ยอมรับทั้งหมด</button></div></div>';
    document.body.appendChild(bar);
    var set = bar.querySelector('.ck-set'), opt = bar.querySelector('#ck-opt');
    opt.onclick = function () {
      if (set.hidden) { set.hidden = false; opt.textContent = 'บันทึกการตั้งค่า'; return; }
      decide({ analytics: bar.querySelector('#ck-a').checked, marketing: bar.querySelector('#ck-m').checked });
    };
    bar.querySelector('#ck-no').onclick = function () { decide({ analytics: false, marketing: false }); };
    bar.querySelector('#ck-yes').onclick = function () { decide({ analytics: true, marketing: true }); };
    requestAnimationFrame(function () { bar.classList.add('in'); });
  }
  function decide(c) {
    var before = state;
    state = { v: VER, analytics: !!c.analytics, marketing: !!c.marketing, at: new Date().toISOString() };
    write(state);
    var b = bar; bar = null;
    if (b) { b.classList.remove('in'); setTimeout(function () { b.remove(); }, 320); }
    // A tracker that already ran can't be unloaded: reload so it's really gone.
    if (before && ((before.analytics && !state.analytics && loaded.analytics) || (before.marketing && !state.marketing && loaded.marketing))) { setTimeout(function () { location.reload(); }, 350); return; }
    apply(state);
  }

  // "ตั้งค่าคุกกี้" in the footer and on the privacy page.
  function extras() {
    var copy = document.querySelector('footer .copy');
    if (copy && !copy.querySelector('.ck-open')) {
      copy.appendChild(document.createTextNode(' · '));
      var a = document.createElement('button'); a.type = 'button'; a.className = 'ck-open ck-link'; a.textContent = 'ตั้งค่าคุกกี้';
      copy.appendChild(a);
    }
    var legal = /^#\/privacy/.test(location.hash) && document.querySelector('.legal');
    if (legal && !legal.querySelector('.ck-pol')) {
      var s = document.createElement('section'); s.className = 'ck-pol';
      s.innerHTML = '<h2>คุกกี้</h2><p>คุกกี้คือไฟล์ขนาดเล็กที่เว็บบันทึกไว้ในเบราว์เซอร์ของคุณ INeedBio ใช้คุกกี้ 3 ประเภท</p><ul>' +
        '<li><b>คุกกี้ที่จำเป็น</b> ใช้สำหรับการเข้าสู่ระบบ ตะกร้าสินค้า และความปลอดภัยของบัญชี ปิดไม่ได้</li>' +
        '<li><b>คุกกี้วิเคราะห์การใช้งาน</b> ใช้ดูว่าหน้าไหนมีคนใช้มาก เพื่อปรับปรุงคอร์สและหน้าเว็บ จะทำงานเมื่อคุณอนุญาตเท่านั้น</li>' +
        '<li><b>คุกกี้การตลาด</b> ใช้แสดงโปรโมชันและวัดผลโฆษณา จะทำงานเมื่อคุณอนุญาตเท่านั้น</li></ul>' +
        '<p class="ck-now">การตั้งค่าตอนนี้: ' + (state ? 'วิเคราะห์การใช้งาน ' + (state.analytics ? 'เปิด' : 'ปิด') + ' · การตลาด ' + (state.marketing ? 'เปิด' : 'ปิด') : 'ยังไม่ได้เลือก') + '</p>' +
        '<button type="button" class="ck-btn ck-sec ck-open">ตั้งค่าคุกกี้</button>';
      legal.appendChild(s);
    }
  }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.ck-open')) { e.preventDefault(); show(true); } });

  var css = document.createElement('style');
  css.textContent =
    '.ck-layer{position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));pointer-events:none;z-index:45}' + // above the header / bottom bar / buttons, below dialogs (.scrim 50) so it never covers a form
    '.ck-card{pointer-events:auto;width:100%;max-width:560px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 -8px 30px rgba(20,24,26,.12),0 2px 10px rgba(20,24,26,.06);padding:14px 16px;transform:translateY(140%);opacity:0;transition:transform .38s cubic-bezier(.22,.9,.34,1),opacity .3s ease}' +
    '.ck-layer.in .ck-card{transform:none;opacity:1}' +
    '.ck-top{display:flex;gap:11px;align-items:flex-start} .ck-ic{flex:none;width:28px;height:28px;border-radius:8px;background:var(--c-bio-soft);color:var(--c-bio);display:grid;place-items:center}' +
    '.ck-txt h2{font-size:14px;margin:0 0 2px;font-weight:700} .ck-txt p{margin:0;font-size:12.5px;line-height:1.5;color:var(--ink2)} .ck-txt a{color:var(--ink);text-decoration:underline;text-underline-offset:2px}' +
    '.ck-set{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);display:grid;gap:12px} .ck-set[hidden]{display:none}' +
    '.ck-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px} .ck-row strong{display:block;font-size:13px;margin-bottom:1px} .ck-row span{display:block;font-size:12px;color:var(--ink2);max-width:44ch}' +
    '.ck-row em{display:inline-block;margin-top:6px;font-style:normal;font-size:11px;font-weight:700;color:var(--c-bio);background:var(--c-bio-soft);padding:2px 8px;border-radius:999px}' +
    '.ck-sw{position:relative;flex:none;width:36px;height:22px} .ck-sw input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;z-index:1}' +
    '.ck-tr{position:absolute;inset:0;background:var(--line);border-radius:999px;transition:background .18s} .ck-th{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .18s}' +
    '.ck-sw input:checked+.ck-tr{background:var(--c-bio)} .ck-sw input:checked+.ck-tr+.ck-th{transform:translateX(14px)} .ck-sw input:disabled+.ck-tr{opacity:.55} .ck-sw input:disabled{cursor:not-allowed}' +
    '.ck-sw input:focus-visible+.ck-tr{outline:2px solid var(--c-bio);outline-offset:2px}' +
    '.ck-act{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px} .ck-sp{flex:1 1 auto}' +
    '.ck-btn{font:inherit;font-size:13px;font-weight:600;padding:8px 16px;border-radius:999px;cursor:pointer;border:1px solid transparent;white-space:nowrap}' +
    '.ck-pri{background:var(--c-bio);color:#fff} .ck-pri:hover{filter:brightness(.92)} .ck-sec{background:transparent;border-color:var(--line);color:var(--ink)} .ck-sec:hover{border-color:var(--ink)}' +
    '.ck-link{background:none;border:0;padding:8px 4px;font:inherit;font-size:13px;font-weight:600;color:var(--ink2);text-decoration:underline;text-underline-offset:2px;cursor:pointer} .ck-link:hover{color:var(--ink)}' +
    'footer .ck-link{padding:0;font-size:inherit;font-weight:inherit;color:inherit}' +
    '.ck-pol{margin-top:28px;padding-top:20px;border-top:1px solid var(--line)} .ck-pol .ck-now{color:var(--ink2);font-size:14px}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ck-pri{color:#0b0b0b}} :root[data-theme="dark"] .ck-pri{color:#0b0b0b}' +
    '@media (max-width:480px){.ck-act{flex-direction:column;align-items:stretch} .ck-sp{display:none} .ck-btn{width:100%;text-align:center} .ck-act .ck-link{order:3}}';
  document.head.appendChild(css);

  function start() {
    if (state) apply(state); else show(false);
    new MutationObserver(extras).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    extras();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

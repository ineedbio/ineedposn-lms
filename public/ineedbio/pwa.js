// Home Screen app (manifest.webmanifest, display: standalone) and the iPhone fullscreen hint.
// app.js must stay byte-identical to the zip (CHECKSUMS.txt), so this lives here.
//  1) Opened from the Home Screen (no Safari bars): the status bar is see-through (black-translucent), so the page starts
//     below it with a dark strip behind the clock; side insets keep the content clear of the notch in landscape; the
//     thin loading bar sits below the status bar; links to other sites (IG, YouTube…) open in Safari, not inside the app.
//  2) iPhone in Safari: the page can't put the player itself into real fullscreen (only a <video> of the page's own can),
//     so the fullscreen button fills the page and Safari's bars stay. The first time that happens on a device, a small
//     hint says how to get real fullscreen (landscape + Add to Home Screen). Once per device (localStorage), closable,
//     gone by itself after a few seconds. Never shown in the Home Screen app.
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var STANDALONE = navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  var IPHONE = /iPhone|iPod/.test(ua);
  var HINT_KEY = 'ib_fs_hint';

  if (STANDALONE) {
    document.documentElement.classList.add('ib-standalone');
    var css = document.createElement('style');
    css.textContent =
      'html.ib-standalone body{padding-top:env(safe-area-inset-top,0px);padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}' +
      'html.ib-standalone .topbar{top:env(safe-area-inset-top,0px)}' +
      '.ib-sa-top{position:fixed;left:0;right:0;top:0;height:env(safe-area-inset-top,0px);background:#0b0b0b;z-index:110;pointer-events:none}' +
      'body.fake-fs-on .ib-sa-top{display:none}';
    document.head.appendChild(css);
    var strip = document.createElement('div'); strip.className = 'ib-sa-top'; strip.setAttribute('aria-hidden', 'true');
    var addStrip = function () { if (!strip.parentNode) document.body.appendChild(strip); };
    if (document.body) addStrip(); else document.addEventListener('DOMContentLoaded', addStrip);
    // Other sites open in Safari (a link without a target would load inside the Home Screen app, with no way back).
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || a.target || a.hasAttribute('download')) return;
      var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (x) { return; }
      if (!/^https?:$/.test(u.protocol) || u.origin === location.origin) return;
      a.target = '_blank'; a.rel = 'noopener';
    }, true);
    return;
  }

  if (!IPHONE) return;
  var seen = function () { try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return true; } };
  function hint(player) {
    if (seen() || player.querySelector('.ib-fs-hint')) return;
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
    var box = document.createElement('div');
    box.className = 'ib-fs-hint'; box.setAttribute('role', 'status');
    box.innerHTML = '<b>อยากได้เต็มจอจริง ไม่มีแถบ Safari?</b>' +
      '<span>หมุนจอเป็นแนวนอน และเพิ่มเว็บนี้ลงหน้าจอโฮม แล้วเปิดจากไอคอน</span>' +
      '<span>1) กดปุ่มแชร์ของ Safari (สี่เหลี่ยมมีลูกศรขึ้น)</span>' +
      '<span>2) เลือก “เพิ่มไปยังหน้าจอโฮม”</span>' +
      '<button type="button" aria-label="ปิด">×</button>';
    var close = function () { clearTimeout(t); box.remove(); };
    ['click', 'touchstart', 'touchend', 'mousedown', 'dblclick'].forEach(function (ev) { box.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    box.querySelector('button').addEventListener('click', close);
    var t = setTimeout(close, 9000);
    player.appendChild(box);
  }
  var css2 = document.createElement('style');
  css2.textContent =
    '.ib-fs-hint{position:absolute;left:50%;top:max(12px,env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:8;width:min(92%,380px);box-sizing:border-box;' +
    'display:grid;gap:2px;padding:10px 36px 10px 14px;border-radius:12px;background:rgba(0,0,0,.82);color:#fff;font-size:13px;line-height:1.45;text-align:left}' +
    '.ib-fs-hint b{font-size:14px;font-weight:600;margin-bottom:2px}' +
    '.ib-fs-hint button{position:absolute;right:6px;top:6px;width:28px;height:28px;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font-size:18px;line-height:1;cursor:pointer}';
  document.head.appendChild(css2);
  // after the player's own fullscreen button ran: if it ended up as the page-filling fallback (.fake-fs), give the hint
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('.player.sp [data-y=fs]');
    if (!b || seen()) return;
    var player = b.closest('.player');
    setTimeout(function () { if (player.classList.contains('fake-fs')) hint(player); }, 400);
  }, true);
})();

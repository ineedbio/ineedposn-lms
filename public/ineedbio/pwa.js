// Home Screen app (manifest.webmanifest, display: standalone). app.js must stay byte-identical to the zip
// (CHECKSUMS.txt), so this lives here.
// Opened from the Home Screen (no Safari bars): the status bar is see-through (black-translucent), so the page starts
// below it with a dark strip behind the clock; side insets keep the content clear of the notch in landscape; the
// thin loading bar sits below the status bar; links to other sites (IG, YouTube…) open in Safari, not inside the app.
// (The iPhone "Add to Home Screen for real fullscreen" hint is gone since 7l: every video is YouTube's own player,
// whose fullscreen is the phone's real one.)
(function () {
  'use strict';
  var STANDALONE = navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);

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
  }
})();

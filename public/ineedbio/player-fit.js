// Lesson / preview player sizing for iPhone & iPad (rotation, fullscreen).
(function () {
  'use strict';
  var RATIO = 16 / 9;
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null, list = [];

  function fit(player) {
    var crop = player.querySelector('.yt-crop'); if (!crop) return;
    var W = player.clientWidth, H = player.clientHeight;
    if (!W || !H) return;
    var key = W + 'x' + H;
    if (crop.__ibFit === key) return;
    crop.__ibFit = key;
    var vw = Math.min(W, H * RATIO), vh = vw / RATIO;
    var put = function (el, k, v) { el.style.setProperty(k, v, 'important'); };
    put(crop, 'position', 'absolute');
    put(crop, 'left', Math.round((W - vw) / 2) + 'px'); put(crop, 'top', Math.round((H - vh) / 2) + 'px');
    put(crop, 'width', Math.round(vw) + 'px'); put(crop, 'height', Math.round(vh) + 'px');
    put(crop, 'right', 'auto'); put(crop, 'bottom', 'auto'); put(crop, 'overflow', 'hidden');
  }

  function watch(player) {
    if (seen ? seen.has(player) : list.indexOf(player) >= 0) return;
    if (seen) seen.add(player); else list.push(player);
    if (typeof ResizeObserver === 'function') new ResizeObserver(function () { fit(player); }).observe(player);
    fit(player);
  }
  function scan() { Array.prototype.forEach.call(document.querySelectorAll('.player.sp'), watch); }
  function all() { Array.prototype.forEach.call(document.querySelectorAll('.player.sp'), fit); }

  var raf = 0;
  function later() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { all(); setTimeout(all, 250); }); }
  window.addEventListener('resize', later);
  window.addEventListener('orientationchange', function () {
    later();
    setTimeout(function () {
      var p = document.querySelector('.player.sp.is-playing:not(.fake-fs)');
      if (p && window.innerWidth > window.innerHeight && window.innerHeight < 560) p.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 350);
  });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', later);
  document.addEventListener('fullscreenchange', later);
  document.addEventListener('webkitfullscreenchange', later);

  var css = document.createElement('style');
  css.textContent =
    '@media (orientation:landscape) and (max-height:560px){' +
    '.player.sp:not(.fake-fs):not(:fullscreen){width:min(100%,calc((100vh - 16px) * 16 / 9));width:min(100%,calc((100svh - 16px) * 16 / 9));margin-inline:auto}}' +
    '.player.fake-fs{height:100vh;height:100dvh;width:100vw;padding:0;margin:0!important;max-width:none!important;background:#000}' +
    'body.fake-fs-on main,body.fake-fs-on :has(> .player.fake-fs),body.fake-fs-on :has(.player.fake-fs){transform:none!important;animation:none!important;filter:none!important;contain:none!important;will-change:auto!important}' +
    '.player.fake-fs .yt-bar{padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:max(12px,env(safe-area-inset-right,0px));padding-bottom:max(8px,env(safe-area-inset-bottom,0px))}' +
    '.yt-q{display:none!important}' +
    '.player:fullscreen{background:#000;margin:0!important} .player:-webkit-full-screen{background:#000;margin:0!important}';
  document.head.appendChild(css);

  var scanTimer = 0;
  function debouncedScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 100);
  }
  function start() {
    new MutationObserver(debouncedScan).observe(document.body, { childList: true, subtree: true });
    scan();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

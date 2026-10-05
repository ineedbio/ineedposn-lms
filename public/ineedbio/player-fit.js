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
  function scan() { Array.prototype.forEach.call(document.querySelectorAll('.player.sp'), watch); watchFrames(); }
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
    '.player:fullscreen .yt-crop iframe,.player:-webkit-full-screen .yt-crop iframe,.player.fake-fs .yt-crop iframe{transform:none!important}' +
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

  /* ?ytfit=1.5|2 for the lesson player in app.js (course-page.js has its own): app.js can't be edited, so after its
     fit() writes the iframe's inline style this puts the experimental layout back. Does nothing unless ytfit is on.
     The rewrite is idempotent (only writes when a value differs), so the style observer settles after one pass. */
  var Y = window.__ibYt, framed = typeof WeakSet === 'function' ? new WeakSet() : null;
  function applyFrame(ifr) {
    var crop = ifr.parentNode; if (!Y || !crop || !crop.classList || !crop.classList.contains('yt-crop')) return;
    var W = crop.clientWidth, H = crop.clientHeight; if (!W || !H) return;
    var L = Y.layout(W, H), st = ifr.style, want = { width: L.w + 'px', height: L.h + 'px', left: L.left + 'px', top: L.top + 'px', transform: L.tf, 'transform-origin': '0 0' };
    for (var k in want) if (st.getPropertyValue(k) !== want[k] || st.getPropertyPriority(k) !== 'important') st.setProperty(k, want[k], 'important');
  }
  function watchFrames() {
    if (!Y || !Y.cfg.n || !framed) return;
    Array.prototype.forEach.call(document.querySelectorAll('.player.sp:not([data-ibp]) .yt-crop iframe'), function (ifr) {
      if (framed.has(ifr)) return; framed.add(ifr);
      new MutationObserver(function () { applyFrame(ifr); }).observe(ifr, { attributes: true, attributeFilter: ['style'] });
      applyFrame(ifr);
    });
  }

  /* ?ytdebug=1: read-only overlay, refreshed once a second */
  if (/[?&]ytdebug=1(&|$)/.test(location.search)) {
    var box = null;
    setInterval(function () {
      var ifr = document.querySelector('.player.sp .yt-crop iframe');
      if (!box) {
        box = document.createElement('pre');
        box.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:2147483647;margin:0;padding:6px 8px;background:rgba(0,0,0,.78);color:#7CFC9A;font:11px/1.35 monospace;border-radius:6px;pointer-events:none;max-width:92vw;white-space:pre-wrap';
        document.body.appendChild(box);
      }
      if (!ifr) { box.textContent = 'ytdebug: no player on this page'; return; }
      var crop = ifr.parentNode, r = ifr.getBoundingClientRect(), pl = null, q = 'n/a';
      try { pl = (window.YT && YT.get && YT.get(ifr.id)) || (window.__ibYtLast && window.__ibYtLast.getIframe && window.__ibYtLast.getIframe() === ifr ? window.__ibYtLast : null); } catch (e) {}
      try { if (pl && pl.getPlaybackQuality) q = pl.getPlaybackQuality() + ' (levels: ' + (pl.getAvailableQualityLevels ? pl.getAvailableQualityLevels().join(',') : '-') + ')'; } catch (e) {}
      var c = Y ? Y.cfg : { n: '?', asked: '?', ios: '?', blocked: '?' };
      box.textContent = 'getPlaybackQuality: ' + q + '\n' +
        'iframe layout: ' + ifr.offsetWidth + '×' + ifr.offsetHeight + ' · on screen: ' + r.width.toFixed(1) + '×' + r.height.toFixed(1) + '\n' +
        '.yt-crop: ' + crop.clientWidth + '×' + crop.clientHeight + ' · dpr: ' + window.devicePixelRatio + '\n' +
        'transform: ' + getComputedStyle(ifr).transform + '\n' +
        'ytfit asked: ' + c.asked + ' · applied: ' + c.n + ' · ios: ' + c.ios + (c.blocked ? ' (blocked: add &ytios=1 after testing)' : '');
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

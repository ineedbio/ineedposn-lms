// Lesson / preview player sizing for iPhone & iPad (rotation, fullscreen).
(function () {
  'use strict';
  var RATIO = 16 / 9;
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null, list = [];

  /* fullscreen on a phone = .fake-fs (iPhone Safari can't fullscreen a div) or the real :fullscreen (Android) */
  function inFs(player) {
    return player.classList.contains('fake-fs') || document.fullscreenElement === player || document.webkitFullscreenElement === player;
  }
  /* The crop box is the 16:9 picture, sized from the player's real box (its padding is the notch safe area):
       normal / fullscreen "whole picture": the biggest 16:9 that fits, centred
       fullscreen "fill width" (data-fscover=1): as wide as the box, so taller than it; the player clips top and bottom
     The iframe is then sized from the crop by each player's own fit() (course-page.js / app.js): no transform. */
  function fit(player) {
    var crop = player.querySelector('.yt-crop'); if (!crop) return;
    var W = player.clientWidth, H = player.clientHeight;
    if (!W || !H) return;
    var cs = getComputedStyle(player), pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0,
      pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0, cw = W - pl - pr, ch = H - pt - pb;
    if (cw <= 0 || ch <= 0) return;
    var fs = inFs(player), cover = fs && player.getAttribute('data-fscover') === '1';
    var fill = cw / ch <= RATIO + 0.01 ? '1' : '0'; // box no wider than 16:9: "whole picture" already fills the width
    if (player.getAttribute('data-fsfill') !== fill) player.setAttribute('data-fsfill', fill);
    var key = [W, H, pl, pr, pt, pb, cover ? 1 : 0].join('x');
    if (crop.__ibFit === key) return;
    crop.__ibFit = key;
    var vw = cover ? cw : Math.min(cw, ch * RATIO), vh = vw / RATIO;
    var put = function (el, k, v) { el.style.setProperty(k, v, 'important'); };
    put(crop, 'position', 'absolute');
    put(crop, 'left', Math.round(pl + (cw - vw) / 2) + 'px'); put(crop, 'top', Math.round(pt + (ch - vh) / 2) + 'px');
    put(crop, 'width', Math.round(vw) + 'px'); put(crop, 'height', Math.round(vh) + 'px');
    put(crop, 'right', 'auto'); put(crop, 'bottom', 'auto'); put(crop, 'overflow', 'hidden');
  }

  /* fullscreen-only button on phones: whole picture <-> fill width (crop top/bottom). Starts on whole picture. */
  function ensureFitButton(player) {
    var row = player.querySelector('.yt-row'); if (!row || row.querySelector('.yt-fitmode')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'yt-b yt-fitmode';
    var label = function () {
      var on = player.getAttribute('data-fscover') === '1';
      b.textContent = on ? 'ทั้งภาพ' : 'เต็มกว้าง'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? 'แสดงทั้งภาพ' : 'ขยายเต็มความกว้าง ตัดบนล่าง');
    };
    label();
    b.onclick = function (e) {
      e.stopPropagation();
      if (player.getAttribute('data-fscover') === '1') player.removeAttribute('data-fscover'); else player.setAttribute('data-fscover', '1');
      label(); fit(player);
    };
    var anchor = row.querySelector('.yt-rate') || row.querySelector('[data-y=fs]');
    if (anchor) row.insertBefore(b, anchor); else row.appendChild(b);
  }

  function watch(player) {
    if (seen ? seen.has(player) : list.indexOf(player) >= 0) return;
    if (seen) seen.add(player); else list.push(player);
    if (typeof ResizeObserver === 'function') new ResizeObserver(function () { fit(player); }).observe(player);
    // fullscreen on/off and the fill-width switch change no size when the box is already full: fit again on those
    if (typeof MutationObserver === 'function') new MutationObserver(function () { fit(player); }).observe(player, { attributes: true, attributeFilter: ['class', 'data-fscover'] });
    fit(player);
  }
  function scan() { Array.prototype.forEach.call(document.querySelectorAll('.player.sp'), function (p) { watch(p); ensureFitButton(p); }); watchFrames(); }
  function all() { Array.prototype.forEach.call(document.querySelectorAll('.player.sp'), fit); }

  var raf = 0;
  function later() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { all(); setTimeout(all, 250); setTimeout(all, 700); }); }
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
    '.player.fake-fs{position:fixed;inset:0;width:100vw;width:100dvw;height:100vh;height:100dvh;box-sizing:border-box;padding:0 env(safe-area-inset-right,0px) 0 env(safe-area-inset-left,0px);margin:0!important;max-width:none!important;background:#000;overflow:hidden}' +
    '.yt-fitmode{display:none;width:auto!important;padding:0 8px;font-size:12.5px;white-space:nowrap}' +
    '@media (pointer:coarse){.player.fake-fs:not([data-fsfill="1"]) .yt-fitmode{display:grid}.player:fullscreen:not([data-fsfill="1"]) .yt-fitmode{display:grid}}' +
    '@media (pointer:coarse){.player:-webkit-full-screen:not([data-fsfill="1"]) .yt-fitmode{display:grid}}' +
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

  /* ?ytdebug=1: read-only measuring overlay (yt-debug.js), fetched only when the URL has it */
  if (/[?&]ytdebug=1(&|$)/.test(location.search)) {
    var dbg = document.createElement('script'); dbg.src = '/ineedbio/yt-debug.js'; dbg.async = true; document.head.appendChild(dbg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

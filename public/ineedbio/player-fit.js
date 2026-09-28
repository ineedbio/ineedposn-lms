// Lesson / preview player sizing for iPhone & iPad (rotation, fullscreen).
// The player hides YouTube's own title bar, logo and "more videos" overlays by making the iframe taller than
// the picture and cutting the extra off (.yt-crop, overflow:hidden). app.js sizes the iframe inside .yt-crop
// itself (fitted 16:9 picture, 70 px hidden above and below, drawn large for the chosen quality and scaled down
// with transform, re-run whenever .yt-crop changes size). But ineedbio.css — which must stay byte-identical
// (CHECKSUMS.txt) — makes .yt-crop cover the whole player, so when the player is taller than a 16:9 picture
// (phone "fullscreen" held upright, iOS 100vh vs the visible height after rotating) the hidden strips above and
// below the picture — where YouTube draws its title bar and logo — showed inside the black box.
// Here only the cut-off window is sized: .yt-crop is made exactly the largest 16:9 picture that fits the
// player's real box, centred (ResizeObserver + resize / orientationchange / visualViewport), in normal, iPad
// fullscreen and phone "fake" fullscreen alike. The iframe itself is left to app.js (quality / scaling).
// In landscape on a phone the player is kept within the screen height.
(function () {
  'use strict';
  var RATIO = 16 / 9;
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null, list = [];

  function fit(player) {
    var crop = player.querySelector('.yt-crop'); if (!crop) return;
    var W = player.clientWidth, H = player.clientHeight;
    if (!W || !H) return;
    var key = W + 'x' + H;
    if (crop.__ibFit === key) return; // nothing changed (the time display ticks 4× a second)
    crop.__ibFit = key;
    // The largest 16:9 picture that fits the box, centred. The cut-off window (.yt-crop) is exactly that
    // picture, so YouTube's overlays above and below it always stay hidden; the rest of the box is the
    // player's black background. app.js then fits the iframe to this window (its ResizeObserver on .yt-crop).
    var vw = Math.min(W, H * RATIO), vh = vw / RATIO;
    var put = function (el, k, v) { el.style.setProperty(k, v, 'important'); };
    put(crop, 'position', 'absolute');
    put(crop, 'left', Math.round((W - vw) / 2) + 'px'); put(crop, 'top', Math.round((H - vh) / 2) + 'px');
    put(crop, 'width', Math.round(vw) + 'px'); put(crop, 'height', Math.round(vh) + 'px');
    put(crop, 'right', 'auto'); put(crop, 'bottom', 'auto'); put(crop, 'overflow', 'hidden');
  }

  function watch(player) {
    if (seen ? seen.has(player) : list.indexOf(player) >= 0) { fit(player); return; }
    if (seen) seen.add(player); else list.push(player);
    if (typeof ResizeObserver === 'function') new ResizeObserver(function () { fit(player); }).observe(player);
    // the YouTube API swaps its placeholder <div> for the <iframe> a moment later
    new MutationObserver(function () { fit(player); }).observe(player, { childList: true, subtree: true });
    fit(player);
  }
  function scan() { Array.prototype.forEach.call(document.querySelectorAll('.player.sp'), watch); }
  function all() { Array.prototype.forEach.call(document.querySelectorAll('.player.sp'), fit); }

  var raf = 0;
  function later() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { all(); setTimeout(all, 250); }); } // iOS reports the new size a beat after rotating
  window.addEventListener('resize', later);
  window.addEventListener('orientationchange', function () {
    later();
    // Turning a phone sideways while a lesson plays: bring the player into view so it fills the screen.
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
    // phone in landscape: never taller than the screen (keep 16:9, centred)
    '@media (orientation:landscape) and (max-height:560px){' +
    '.player.sp:not(.fake-fs):not(:fullscreen){width:min(100%,calc((100vh - 16px) * 16 / 9));width:min(100%,calc((100svh - 16px) * 16 / 9));margin-inline:auto}}' +
    // phone "fullscreen" (iPhone has no element fullscreen): cover the visible area, including the notch sides
    '.player.fake-fs{height:100vh;height:100dvh;width:100vw;padding:0;margin:0!important;max-width:none!important;background:#000}' +
    // The page's entrance animation leaves a transform on <main>, which traps position:fixed inside it (the
    // "fullscreen" player then started below the header). Drop transforms on its ancestors while it's open.
    'body.fake-fs-on main,body.fake-fs-on :has(> .player.fake-fs),body.fake-fs-on :has(.player.fake-fs){transform:none!important;animation:none!important;filter:none!important;contain:none!important;will-change:auto!important}' +
    '.player.fake-fs .yt-bar{padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:max(12px,env(safe-area-inset-right,0px));padding-bottom:max(8px,env(safe-area-inset-bottom,0px))}' +
    '.player:fullscreen{background:#000;margin:0!important} .player:-webkit-full-screen{background:#000;margin:0!important}';
  document.head.appendChild(css);

  function start() {
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    scan();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

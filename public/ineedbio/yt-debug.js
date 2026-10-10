// ?ytdebug=1 only (player-fit.js loads this file when the URL has it; without it nothing here is fetched or run).
// Read-only overlay for measuring video sharpness on real devices, in the lesson room (#/learn, app.js safePlayer)
// and on the course page (#/course, course-page.js mount). Refreshed once a second. It never calls a setter on the
// player and never writes styles on the player, the crop box or the iframe.
// Sources of the numbers:
//  - the player object (YT.get(iframe id), or the course page's window.__ibYtLast): getPlaybackQuality() etc.
//  - the messages the YouTube iframe posts to this page anyway (infoDelivery): playbackQuality and
//    availableQualityLevels, in case the player object can't be reached. Only read, never answered.
// "คัดลอกผล" copies everything as one line. No clip id is shown or copied.
(function () {
  'use strict';
  var fromMsg = typeof WeakMap === 'function' ? new WeakMap() : null; // iframe window → last info YouTube posted
  window.addEventListener('message', function (e) {
    if (!fromMsg || !e.source || !/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
    if (!d || !d.info || (d.event !== 'infoDelivery' && d.event !== 'initialDelivery')) return;
    var o = fromMsg.get(e.source) || {};
    ['playbackQuality', 'availableQualityLevels', 'playerState', 'playbackRate'].forEach(function (k) { if (k in d.info) o[k] = d.info[k]; });
    fromMsg.set(e.source, o);
  });

  var frames = function () { return Array.prototype.filter.call(document.querySelectorAll('iframe'), function (f) { return /youtube(-nocookie)?\.com\/embed\//.test(f.src || ''); }); };
  /** the iframe to report: the one playing, else the last player on the page */
  function pick(list) {
    var inPlayer = list.filter(function (f) { return f.closest('.player'); });
    var playing = inPlayer.filter(function (f) { var p = f.closest('.player'); return p.classList.contains('is-playing') || p.classList.contains('is-buffering'); });
    return playing[playing.length - 1] || inPlayer[inPlayer.length - 1] || list[list.length - 1] || null;
  }
  function madeBy(f) {
    if (f.id === 'yt-host') return 'app.js safePlayer';
    if (/^ibp-host-\d+$/.test(f.id)) return 'course-page.js mount';
    if (!f.id) return 'app.js playerInner (embed, no API)';
    return 'unknown (' + f.id + ')';
  }
  function playerOf(f) {
    var p = null;
    try { if (window.YT && typeof YT.get === 'function' && f.id) p = YT.get(f.id) || null; } catch (e) {}
    try { if (!p && window.__ibYtLast && window.__ibYtLast.getIframe && window.__ibYtLast.getIframe() === f) p = window.__ibYtLast; } catch (e) {}
    return p;
  }
  var r1 = function (n) { return Math.round(n * 10) / 10; };
  var px = function (w, h) { return r1(w) + 'x' + r1(h); };
  function read() {
    var list = frames(), f = pick(list), dpr = window.devicePixelRatio || 1, vv = window.visualViewport;
    var o = {
      files: versions(),
      page: (location.hash.match(/^#\/(\w+)/) || [, 'home'])[1],
      dpr: dpr,
      screen: screen.width + 'x' + screen.height,
      window: window.innerWidth + 'x' + window.innerHeight + (vv ? ' (vv ' + px(vv.width, vv.height) + ' z' + r1(vv.scale) + ')' : ''),
      orientation: (screen.orientation && screen.orientation.type) || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
      frames: list.length
    };
    if (!f) { o.player = 'none'; return o; }
    var pl = f.closest('.player'), crop = f.parentNode, rc = f.getBoundingClientRect(), cs = getComputedStyle(f);
    o.by = madeBy(f);
    o.mode = pl ? pl.getAttribute('data-ibmode') || 'custom' : '-';
    o.fullscreen = document.fullscreenElement || document.webkitFullscreenElement ? 'native' : pl && pl.classList.contains('fake-fs') ? 'fake-fs' : 'no';
    var P = playerOf(f), m = fromMsg && f.contentWindow ? fromMsg.get(f.contentWindow) : null;
    o.api = P ? 'player' : m ? 'messages' : 'none';
    try { o.quality = P && P.getPlaybackQuality ? P.getPlaybackQuality() : m && m.playbackQuality || '?'; } catch (e) { o.quality = 'err'; }
    try { o.levels = (P && P.getAvailableQualityLevels ? P.getAvailableQualityLevels() : m && m.availableQualityLevels || []).join(',') || '-'; } catch (e) { o.levels = 'err'; }
    if (m && P && m.playbackQuality && m.playbackQuality !== o.quality) o.quality_msg = m.playbackQuality;
    try { var vd = P && P.getVideoData ? P.getVideoData() : null; if (vd && vd.video_quality) o.video_quality = vd.video_quality; } catch (e) {}
    try { o.state = P && P.getPlayerState ? P.getPlayerState() : m && m.playerState != null ? m.playerState : '?'; } catch (e) {}
    try { o.rate = P && P.getPlaybackRate ? P.getPlaybackRate() : m && m.playbackRate || '?'; } catch (e) {}
    var Y = window.__ibYt && window.__ibYt.cfg, sc = f.offsetWidth ? rc.width / f.offsetWidth : 1;
    o.group = Y ? Y.group : '?';
    o.target = Y ? (Y.on ? Y.target : 'off') + ' (' + Y.src + ', cap ' + Y.capW + 'x' + Y.capH + (Y.fsZoom ? '' : ', not in fullscreen') + ')' : '?';
    o.multiplier = sc ? Math.round(1 / sc * 1000) / 1000 : '?';
    // what YouTube draws into (the iframe's own size, before the transform): this is what it picks the quality from
    o.iframe_css = px(f.offsetWidth, f.offsetHeight);
    o.render_picture_device_px = px(f.offsetWidth * dpr, Math.max(0, f.offsetHeight - 140) * dpr); // minus the 140px crop
    // what is seen on screen (after the transform)
    o.screen_picture_css = px(rc.width, Math.max(0, rc.height - 140 * sc));
    o.screen_picture_device_px = px(rc.width * dpr, Math.max(0, rc.height - 140 * sc) * dpr);
    o.crop_css = crop && crop.classList && crop.classList.contains('yt-crop') ? px(crop.clientWidth, crop.clientHeight) : 'no .yt-crop';
    o.player_css = pl ? px(pl.clientWidth, pl.clientHeight) : '-';
    o.transform = cs.transform;
    // the inline style on the iframe right now (whoever wrote it last): catches a layout being overwritten
    o.style = ['width', 'height', 'transform'].map(function (k) { return k + ':' + (f.style.getPropertyValue(k) || '-'); }).join(' ');
    return o;
  }
  /** which build of each add-on this page runs (?v=<hash> on its script link) */
  function versions() {
    return ['course-page', 'player-fit', 'yt-debug', 'app'].map(function (n) {
      var s = Array.prototype.filter.call(document.scripts, function (x) { return (x.src || '').indexOf('/ineedbio/' + n + '.js') >= 0; })[0];
      return n + '@' + (s ? (s.src.match(/[?&]v=([\w-]+)/) || [, 'none'])[1] : 'not loaded');
    }).join(',');
  }
  var line = function (o) { return 'ytdebug ' + Object.keys(o).map(function (k) { return k + '=' + o[k]; }).join(' | ') + ' | ua=' + (navigator.userAgent || '').replace(/\s+/g, ' ').slice(0, 160); };

  var box = document.createElement('div'), pre = document.createElement('pre'), btn = document.createElement('button'), last = {};
  box.setAttribute('data-ytdebug', '1');
  box.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:2147483647;max-width:min(94vw,560px);padding:6px 8px;background:rgba(0,0,0,.82);color:#7CFC9A;border-radius:8px;font:11px/1.35 ui-monospace,Menlo,monospace;pointer-events:none';
  pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-all';
  btn.type = 'button'; btn.textContent = 'คัดลอกผล';
  btn.style.cssText = 'pointer-events:auto;margin-top:6px;padding:6px 12px;border:0;border-radius:6px;background:#7CFC9A;color:#000;font:600 13px/1 system-ui,sans-serif;cursor:pointer';
  box.appendChild(pre); box.appendChild(btn);
  function copy(t) {
    var done = function () { btn.textContent = 'คัดลอกแล้ว ✓'; setTimeout(function () { btn.textContent = 'คัดลอกผล'; }, 1500); };
    var old = function () {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
      box.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); if (ok) done(); else window.prompt('คัดลอกข้อความนี้', t);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, old); else old();
  }
  ['click', 'touchstart', 'touchend', 'mousedown', 'dblclick'].forEach(function (ev) { btn.addEventListener(ev, function (e) { e.stopPropagation(); }); });
  btn.addEventListener('click', function (e) { e.preventDefault(); copy(line(last)); });

  function tick() {
    // in native fullscreen only the fullscreen element is drawn: keep the overlay inside it
    var host = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    if (box.parentNode !== host) host.appendChild(box);
    try { last = read(); } catch (e) { last = { error: String(e && e.message || e) }; }
    pre.textContent = Object.keys(last).map(function (k) { return k + ': ' + last[k]; }).join('\n');
  }
  function start() { tick(); setInterval(tick, 1000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

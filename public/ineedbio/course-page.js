// Course page tweaks for public/ineedbio/app.js, which must stay byte-identical to the zip (CHECKSUMS.txt).
//  1) Free preview episodes ("ดูฟรี") play in the same player as paid lessons (a port of app.js's safePlayer:
//     YouTube IFrame API with YouTube's own controls, title and share/copy-link hidden behind a shield, and the
//     site's play/seek/quality/speed/fullscreen bar). The first free episode starts by itself in the course hero —
//     muted, so browsers (iOS Safari included) allow it — with a "แตะเพื่อเปิดเสียง" button. "ดูฟรี" buttons
//     open the same player in a modal. The clip ids are taken out of the page's attributes.
//     course.detail only sends the YouTube id of free episodes, so no enrollment check is involved.
//     Signed in with cells on: a free episode counts as study time — study.ping { lesson_id, preview: 1, pos }
//     once per 60 seconds of real play (sound on, page in front), like app.js's startStudyPing.
//  2) Counts are removed from every public page: episode counts and total video time ("12 ตอน · 13 ชม.") on
//     cards, the featured carousel, the course page (facts, syllabus, chapters, price box) and bundle page;
//     and the catalogue size (home stats "N คอร์สที่เปิดอยู่", "N คอร์ส →" on the path buttons, "N คอร์ส"
//     above search results). #/my, #/learn and the admin pages keep their numbers.
(function () {
  'use strict';

  /* ── 2) hide counts ── */
  var DUR = '\\d+ ชม\\.(?: \\d+ นาที)?|\\d+ นาที';
  var RE_EP = /^\d+ ตอน$/, RE_DUR = new RegExp('^(?:' + DUR + ')$');
  var RE_PAIR = new RegExp('^\\d+ ตอน · (?:' + DUR + ')$');           // "12 ตอน · 13 ชม. 18 นาที"
  var RE_FACT = new RegExp('^(?:\\d+ ตอน|(?:' + DUR + ') วิดีโอ)$'); // .facts pills
  var RE_INCL = new RegExp('คลิปเรียน \\d+ ตอน \\((?:' + DUR + ')\\)'); // price box "คลิปเรียน 120 ตอน (13 ชม.)"

  function publicView() { return !/^#\/(admin|learn|my)\b/.test(location.hash); }
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function isSeg(s) { s = s.trim(); return RE_EP.test(s) || RE_DUR.test(s); }
  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)).concat(root.matches && root.matches(sel) ? [root] : []); }

  function stripCounts(root) {
    if (!root || root.nodeType !== 1 || !publicView()) return;
    all(root, '.stat').forEach(function (el) { el.remove(); });
    all(root, '.path em').forEach(function (el) { if (/^\d+ คอร์ส/.test(el.textContent)) el.textContent = 'ดูคอร์ส →'; });
    all(root, '.results-h h2').forEach(function (el) { if (/^\d+ คอร์ส$/.test(norm(el.textContent))) el.textContent = 'ผลการค้นหา'; });
    all(root, '.facts > span').forEach(function (el) { if (RE_FACT.test(norm(el.textContent))) el.remove(); });
    all(root, 'span, small').forEach(function (el) { if (!el.children.length && RE_PAIR.test(norm(el.textContent))) el.remove(); });
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), t, list = [];
    while ((t = w.nextNode())) list.push(t);
    list.forEach(function (n) {
      var s = n.nodeValue;
      if (RE_INCL.test(s)) { n.nodeValue = s.replace(RE_INCL, 'คลิปเรียนวิดีโอ'); return; }
      if (s.indexOf(' · ') < 0) return;
      var parts = s.split(' · '), keep = parts.filter(function (p) { return !isSeg(p); });
      if (keep.length === parts.length) return;
      var out = keep.join(' · ');
      if (/ · $/.test(s) && out && !/ · $/.test(out)) out += ' · ';
      n.nodeValue = keep.length ? out : '';
    });
  }

  /* ── 1) the lesson player, for free episodes ── */
  var PI = {
    play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L4 12l7 7"/><text x="13" y="16" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">10</text></svg>',
    fwd: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 5l7 7-7 7"/><text x="1" y="16" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">10</text></svg>',
    vol: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    mute: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    fs: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtT(s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(x); }
  var ytLoad = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytLoad) return ytLoad;
    ytLoad = new Promise(function (res, rej) {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) try { prev(); } catch (e) {} res(); };
      var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
      s.onerror = function () { ytLoad = null; rej(new Error('load')); };
      document.head.appendChild(s);
      setTimeout(function () { if (!(window.YT && window.YT.Player)) { ytLoad = null; rej(new Error('timeout')); } }, 15000);
    });
    return ytLoad;
  }

  // Same speed / quality choices as app.js's lesson player, remembered under the same keys (ib_rate, ib_q2).
  // Quality 0 = auto: the iframe is the size of the box, not scaled, no vq sent. Phones/tablets get no 1440p/4K and
  // the picture is never drawn larger than 1920×1080 device pixels. The old ib_q value is not read.
  var YTRATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  var YTQ = [[0, 'อัตโนมัติ', ''], [2160, '4K', 'highres'], [1440, '1440p', 'hd1440'], [1080, '1080p', 'hd1080'], [720, '720p', 'hd720'], [480, '480p', 'large'], [360, '360p', 'medium']];
  var YTQ_KEY = 'ib_q2';
  function isHandheld() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
    return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches);
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function toast(t) {
    var box = document.getElementById('toasts'); if (!box) return;
    var d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t; box.appendChild(d);
    setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 260); }, 3000);
  }

  var players = [], seq = 0;
  function pauseOthers(keep) { players.forEach(function (p) { if (p !== keep && p.P && p.P.pauseVideo) try { p.P.pauseVideo(); } catch (e) {} }); }
  function drop(p) { clearInterval(p.t); clearInterval(p.ping); if (p.off) try { p.off(); } catch (e) {} try { p.P && p.P.destroy(); } catch (e) {} p.P = null; }
  function sweep() { players = players.filter(function (p) { if (document.body.contains(p.el)) return true; drop(p); return false; }); }
  // Only one video iframe on the page: before a new player starts, the others are destroyed. A destroyed player
  // still on the page (the hero, under the "ดูฟรี" modal) shows a play button that starts it again.
  function stopAll() {
    sweep();
    players.forEach(function (p) {
      drop(p);
      var el = p.el, again = p.again;
      el.className = 'player sp is-idle' + (el.classList.contains('trailer') ? ' trailer' : '');
      el.innerHTML = '<div class="yt-cover"><button class="yt-big" aria-label="เล่น">' + PI.play + '</button></div>';
      el.querySelector('.yt-big').onclick = function () { again(); };
    });
    players = [];
  }

  /** el = .player box. opt.muted: autoplay muted (+ unmute pill); opt.sound: autoplay with sound, muted if the browser refuses. */
  function mount(el, vid, opt) {
    opt = opt || {};
    stopAll();
    var me = { el: el, P: null, t: null, ping: null, again: function () { mount(el, vid, { sound: true, lid: opt.lid }); } };
    players.push(me);
    var hand = isHandheld(), QS = YTQ.filter(function (q) { return !hand || q[0] <= 1080; });
    var host = 'ibp-host-' + (++seq);
    el.classList.add('sp', 'is-idle');
    el.innerHTML = '<div class="yt-crop"><div id="' + host + '"></div></div><div class="yt-shield"></div>' +
      '<div class="yt-cover"><button class="yt-big" aria-label="เล่น">' + PI.play + '</button><div class="yt-msg"></div></div>' +
      '<div class="yt-bar"><input type="range" class="yt-seek" min="0" max="1000" value="0" step="1" aria-label="เลื่อนเวลา">' +
      '<div class="yt-row"><button class="yt-b" data-y="toggle" aria-label="เล่น/หยุด">' + PI.play + '</button><button class="yt-b" data-y="back" aria-label="ย้อน 10 วินาที">' + PI.back + '</button><button class="yt-b" data-y="fwd" aria-label="ข้าม 10 วินาที">' + PI.fwd + '</button>' +
      '<button class="yt-b" data-y="mute" aria-label="เปิด/ปิดเสียง">' + PI.vol + '</button><span class="yt-time">0:00 / 0:00</span><span style="flex:1"></span>' +
      '<select class="yt-q" aria-label="ความชัด">' + QS.map(function (q) { return '<option value="' + q[0] + '">' + q[1] + '</option>'; }).join('') + '</select>' +
      '<select class="yt-rate" aria-label="ความเร็ว">' + YTRATES.map(function (r) { return '<option value="' + r + '"' + (r === 1 ? ' selected' : '') + '>' + r + 'x</option>'; }).join('') + '</select>' +
      '<button class="yt-b" data-y="fs" aria-label="เต็มจอ">' + PI.fs + '</button></div></div>';
    var $ = function (s) { return el.querySelector(s); };
    var P = null, dur = 0, drag = false, hideT = null, ended = false;
    var seek = $('.yt-seek'), time = $('.yt-time'), msg = $('.yt-msg'), tgl = $('[data-y=toggle]'), mb = $('[data-y=mute]'), pill = null;
    var setState = function (st) { ['is-idle', 'is-playing', 'is-paused', 'is-ended', 'is-buffering'].forEach(function (c) { el.classList.remove(c); }); el.classList.add(st); tgl.innerHTML = st === 'is-playing' || st === 'is-buffering' ? PI.pause : PI.play; };
    var wake = function () { el.classList.remove('hide-ui'); clearTimeout(hideT); hideT = setTimeout(function () { if (el.classList.contains('is-playing')) el.classList.add('hide-ui'); }, 2600); };
    var syncMute = function () { if (!P || !P.isMuted) return; var m = P.isMuted(); mb.innerHTML = m ? PI.mute : PI.vol; if (!m && pill) { pill.remove(); pill = null; } };
    var lastTimeText = '';
    var tick = function () {
      if (!P || !P.getCurrentTime) return;
      var t = P.getCurrentTime() || 0; dur = P.getDuration() || dur;
      if (!drag && dur) {
        var skVal = Math.round(t / dur * 1000);
        if (seek.value != skVal) {
          seek.value = skVal;
          seek.style.setProperty('--p', (skVal / 10) + '%');
        }
      }
      var tTxt = fmtT(t) + ' / ' + fmtT(dur);
      if (lastTimeText !== tTxt) {
        lastTimeText = tTxt;
        time.textContent = tTxt;
      }
    };
    var toggle = function () { if (!P) return; if (ended) { ended = false; P.seekTo(0, true); P.playVideo(); return; } var s = P.getPlayerState(); if (s === 1 || s === 3) P.pauseVideo(); else { pauseOthers(me); P.playVideo(); } };
    var jump = function (d) { if (!P) return; var t = Math.min(Math.max(0, (P.getCurrentTime() || 0) + d), Math.max(0, dur - 1)); P.seekTo(t, true); tick(); wake(); };
    var isFs = function () { return document.fullscreenElement === el || document.webkitFullscreenElement === el || el.classList.contains('fake-fs'); };
    var fs = function () {
      if (isFs()) { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); el.classList.remove('fake-fs'); document.body.classList.remove('fake-fs-on'); return; }
      var rq = el.requestFullscreen || el.webkitRequestFullscreen;
      if (rq) { try { var r = rq.call(el); if (r && r.catch) r.catch(function () { el.classList.add('fake-fs'); document.body.classList.add('fake-fs-on'); }); return; } catch (e) {} }
      el.classList.add('fake-fs'); document.body.classList.add('fake-fs-on');
    };
    var mute = function () { if (!P) return; if (P.isMuted()) { P.unMute(); if (P.getVolume && P.getVolume() < 5) P.setVolume(100); } else P.mute(); setTimeout(syncMute, 60); wake(); };
    var showPill = function () {
      if (pill) return;
      pill = document.createElement('button');
      pill.type = 'button'; pill.className = 'ap-snd';
      pill.innerHTML = PI.mute + '<span>แตะเพื่อเปิดเสียง</span>';
      pill.onclick = function (e) { e.stopPropagation(); if (!P) return; P.unMute(); P.setVolume(100); if (P.getPlayerState() !== 1) { pauseOthers(me); P.playVideo(); } setTimeout(syncMute, 80); };
      el.appendChild(pill);
    };
    var fail = function (t) { el.classList.add('is-error'); msg.textContent = t; };
    el.oncontextmenu = function (e) { e.preventDefault(); };
    $('.yt-shield').onclick = function () { toggle(); wake(); };
    $('.yt-shield').ondblclick = function (e) { e.preventDefault(); fs(); };
    $('.yt-big').onclick = function () { toggle(); };
    el.onmousemove = wake; el.ontouchstart = wake;
    Array.prototype.forEach.call(el.querySelectorAll('.yt-b'), function (b) { b.onclick = function (e) { e.stopPropagation(); var y = b.dataset.y; if (y === 'toggle') toggle(); else if (y === 'back') jump(-10); else if (y === 'fwd') jump(10); else if (y === 'mute') mute(); else if (y === 'fs') fs(); wake(); }; });
    seek.oninput = function () { drag = true; seek.style.setProperty('--p', (seek.value / 10) + '%'); time.textContent = fmtT(seek.value / 1000 * dur) + ' / ' + fmtT(dur); };
    seek.onchange = function () { drag = false; if (P && dur) { P.seekTo(seek.value / 1000 * dur, true); ended = false; } wake(); };
    var rate = $('.yt-rate'), qSel = $('.yt-q');
    var setRate = function (r) {
      if (!P) return;
      P.setPlaybackRate(r);
      setTimeout(function () { var got = P.getPlaybackRate ? P.getPlaybackRate() : r; if (Math.abs(got - r) > 0.01) { rate.value = String(got); toast('YouTube เล่นได้เร็วสุด ' + got + 'x สำหรับคลิปนี้'); } }, 400);
    };
    rate.onchange = function () { setRate(Number(this.value)); store('ib_rate', this.value); wake(); };
    var savedRate = Number(store('ib_rate')) || 1; rate.value = String(savedRate);
    var qH = Number(store(YTQ_KEY)) || 0; if (!QS.some(function (q) { return q[0] === qH; })) qH = 0; qSel.value = String(qH);
    var qOf = function () { return (YTQ.filter(function (q) { return q[0] === qH; })[0] || YTQ[0])[2]; };
    var crop = $('.yt-crop');
    var lastFitKey = '';
    var fit = function () {
      var ifr = crop.querySelector('iframe'); if (!ifr) return;
      var W = crop.clientWidth, H = crop.clientHeight; if (!W || !H) return;
      var key = W + 'x' + H + '@' + qH;
      if (lastFitKey === key) return;
      lastFitKey = key;
      var vw = Math.min(W, H * 16 / 9), vh = vw * 9 / 16, dpr = window.devicePixelRatio || 1, sc = 1, st = ifr.style;
      if (qH) sc = Math.min(1, vh * dpr / qH);
      if (hand) sc = Math.min(1, Math.max(sc, vh * dpr / 1080, vw * dpr / 1920));
      st.setProperty('width', (vw / sc) + 'px', 'important'); st.setProperty('height', (vh / sc + 140) + 'px', 'important');
      st.setProperty('left', ((W - vw) / 2) + 'px', 'important'); st.setProperty('top', ((H - vh) / 2 - 70 * sc) + 'px', 'important');
      st.setProperty('transform', sc < 1 ? 'scale(' + sc + ')' : 'none', 'important'); st.setProperty('transform-origin', '0 0', 'important');
    };
    qSel.onchange = function () { qH = Number(this.value); store(YTQ_KEY, qH ? this.value : ''); lastFitKey = ''; fit(); if (qH && P && P.setPlaybackQuality) try { P.setPlaybackQuality(qOf()); } catch (e) {} wake(); };
    var ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(crop); else window.addEventListener('resize', fit);
    var narrow = function () { el.classList.toggle('ibp-narrow', window.innerWidth < 420); };
    window.addEventListener('resize', narrow);
    window.addEventListener('orientationchange', narrow);
    narrow();
    me.off = function () { if (ro) ro.disconnect(); else window.removeEventListener('resize', fit); window.removeEventListener('resize', narrow); window.removeEventListener('orientationchange', narrow); clearTimeout(hideT); };
    if (opt.muted) showPill();
    loadYT().then(function () {
      if (players.indexOf(me) < 0 || !document.body.contains(el)) return;
      var v = { controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, cc_load_policy: 0, autoplay: opt.muted || opt.sound ? 1 : 0, mute: opt.muted ? 1 : 0 };
      if (qH) v.vq = qOf();
      if (/^https?:/.test(location.origin)) v.origin = location.origin;
      P = me.P = new YT.Player(host, {
        videoId: vid, host: 'https://www.youtube-nocookie.com', playerVars: v,
        events: {
          onReady: function () {
            if (players.indexOf(me) < 0) return;
            dur = P.getDuration() || 0; fit(); if (savedRate !== 1) setRate(savedRate);
            var ifr = P.getIframe && P.getIframe(); if (ifr) { ifr.setAttribute('tabindex', '-1'); ifr.setAttribute('title', 'ตอนตัวอย่างฟรี'); }
            if (opt.muted) { P.mute(); P.playVideo(); }
            else if (opt.sound) {
              pauseOthers(me); P.playVideo();
              setTimeout(function () { if (P.getPlayerState && P.getPlayerState() !== 1 && P.getPlayerState() !== 3) { P.mute(); P.playVideo(); showPill(); } }, 1500);
            }
            tick(); me.t = setInterval(function () { if (!document.body.contains(el)) { sweep(); return; } tick(); }, 500);
            if (opt.lid) studyPing(me, opt.lid);
          },
          onStateChange: function (e) {
            var s = e.data;
            if (s === 1) { ended = false; msg.textContent = ''; setState('is-playing'); wake(); syncMute(); }
            else if (s === 2) setState('is-paused');
            else if (s === 3) setState('is-buffering');
            else if (s === 0) { ended = true; setState('is-ended'); msg.textContent = 'ชอบตอนนี้? ซื้อคอร์สเพื่อดูตอนอื่นต่อได้เลย'; }
            tick();
          },
          onError: function (e) { fail(e.data === 101 || e.data === 150 ? 'คลิปนี้ไม่ได้เปิดให้ฝังในเว็บ แจ้งแอดมินทาง IG' : 'เล่นคลิปนี้ไม่ได้ ลองรีเฟรชหน้า หรือแจ้งแอดมินทาง IG'); }
        }
      });
    }).catch(function () { fail('โหลดเครื่องเล่นวิดีโอไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้า'); });
    return me;
  }

  /** Free episode = study time for the cells (app.js: startStudyPing(lid, true)). Counted only while it really plays
      with sound and the page is in front; muted autoplay in the hero doesn't count. Stops with the player (drop).
      app.js runs in its own closure, so this posts to /api/ib itself with the signed-in token and device id;
      the server answers { off: true } when the cells system is switched off. */
  function studyPing(me, lid) {
    var F = window.INEEDBIO_FEATURES, token = store('ib_token');
    if (!lid || !token || (F && F.cells === false) || !window.INEEDBIO_API_URL) return;
    clearInterval(me.ping); var acc = 0;
    me.ping = setInterval(function () {
      var P = me.P;
      if (!P || !me.el.classList.contains('is-playing') || document.visibilityState !== 'visible' || (P.isMuted && P.isMuted())) return;
      acc += 5; if (acc < 60) return; acc = 0;
      var body = { action: 'study.ping', data: { lesson_id: lid, preview: 1, pos: P.getCurrentTime ? Math.floor(P.getCurrentTime() || 0) : 0 }, token: store('ib_token'), device_id: store('ib_device'), device_info: 'course-page' };
      fetch(window.INEEDBIO_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
        .then(function (x) { return x.json(); }).then(function (res) {
          if (!res.ok) { if (/^(AUTH|SESSION_REPLACED|BANNED|NO_ACCESS)$/.test(res.error)) clearInterval(me.ping); return; }
          var r = res.data;
          if (!r || r.off) { clearInterval(me.ping); return; }
          if (r.ignored || !r.credited) return;
          var g = r.credited.gained || [];
          toast(g.length > 1 ? 'เรียนครบวันนี้แล้ว +' + g.reduce(function (a, x) { return a + x.delta; }, 0) + ' เซลล์ (มีโบนัส)' : 'เรียนครบวันนี้แล้ว +1 เซลล์ ติดกัน ' + r.credited.streak + ' วัน');
        }).catch(function () {});
    }, 5000);
  }

  // Free-episode buttons: keep the clip id out of the page (app.js puts it in data-preview).
  var clips = new WeakMap();
  function takeIds(root) {
    all(root, '[data-preview]').forEach(function (b) {
      if (b.dataset.preview) clips.set(b, { id: b.dataset.preview, title: b.dataset.title || '', lid: b.dataset.plid || '' });
      b.removeAttribute('data-preview'); b.removeAttribute('data-title'); b.removeAttribute('data-plid');
      b.setAttribute('data-ibpv', clips.has(b) ? '1' : '0');
    });
  }
  function openPreview(c) {
    var m = document.getElementById('modal'); if (!m) return;
    m.innerHTML = '<div class="scrim" data-close="1"><div class="modal wide" role="dialog" aria-modal="true">' +
      '<div class="mx"><div class="stack" style="gap:4px"><h2>' + esc(c.title) + '</h2><p class="ink2 sm">ตอนตัวอย่าง ดูได้ฟรี</p></div><button class="x" data-close="1" aria-label="ปิด">×</button></div>' +
      '<div class="player"></div></div></div>';
    mount(m.querySelector('.player'), c.id, { sound: true, lid: c.lid });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ibpv]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var c = clips.get(b); if (c) openPreview(c);
  }, true);

  function heroPlayer() {
    if (!/^#\/course\//.test(location.hash)) return;
    var hero = document.querySelector('.chero');
    if (!hero || hero.dataset.ap) return;
    var syl = document.getElementById('sec-syllabus'); if (!syl) return;
    hero.dataset.ap = '1';
    var first = null;
    Array.prototype.some.call(document.querySelectorAll('#sec-syllabus [data-ibpv="1"], .chero [data-ibpv="1"]'), function (b) { first = clips.get(b); return !!first; });
    var tr = hero.querySelector('.player.trailer iframe'), trId = tr ? decodeURIComponent((tr.src.match(/\/embed\/([^?]+)/) || [])[1] || '') : '';
    var c = first || (trId ? { id: trId, title: '' } : null);
    if (!c) return;
    var box = document.createElement('div');
    box.className = 'player trailer';
    var old = hero.querySelector('.player.trailer, .cover.trailer');
    if (old) old.replaceWith(box); else { var at = hero.querySelector('.facts') || hero.querySelector('h1'); at.parentNode.insertBefore(box, at.nextSibling); }
    if (first) {
      var cap = document.createElement('p');
      cap.className = 'sm ink2 ap-cap';
      cap.textContent = 'ตอนตัวอย่างฟรี · ' + c.title;
      box.parentNode.insertBefore(cap, box.nextSibling);
      var btn = hero.querySelector(':scope > [data-ibpv]'); if (btn) btn.remove();
    }
    mount(box, c.id, { muted: true, lid: c.lid });
  }

  var css = document.createElement('style');
  css.textContent = '.player .ap-snd{position:absolute;left:12px;top:12px;z-index:5;display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:7px 14px 7px 11px;font:500 13.5px/1.2 inherit;font-family:inherit;color:#fff;background:rgba(0,0,0,.72);cursor:pointer}' +
    '.player .ap-snd svg{width:16px;height:16px} .player .ap-snd:hover{background:rgba(0,0,0,.86)} .ap-cap{margin:6px 0 0}' +
    '.player.ibp-narrow .yt-time{display:none}' +
    '.cover .upd,.nc-cv .upd{position:absolute;right:12px;top:12px;z-index:1;background:rgba(0,0,0,.55);color:#fff;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;white-space:nowrap;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}' +
    '.feat .cover .upd{right:14px;top:14px} .ci .cover .upd{display:none}' +
    '.nc-cv .upd{right:10px;top:10px;font-size:12px} .nc-cv .nc-off ~ .upd{top:40px}' +
    '.cd > *{min-width:0} .jump{max-width:100%;overflow-x:auto;scrollbar-width:none} .jump::-webkit-scrollbar{display:none} .jump button{flex:none}';
  document.head.appendChild(css);

  function run(nodes) {
    nodes.forEach(function (n) { var el = n.nodeType === 3 ? n.parentNode : n; if (el && el.nodeType === 1) { takeIds(el); stripCounts(el); } });
    heroPlayer();
  }

  var moTimer = 0, moNodes = [];
  function start() {
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { moNodes.push(n); }); });
      clearTimeout(moTimer);
      moTimer = setTimeout(function () {
        var nodes = moNodes; moNodes = [];
        if (nodes.length) run(nodes);
      }, 50);
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { sweep(); stripCounts(document.getElementById('app')); });
    run([document.body]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

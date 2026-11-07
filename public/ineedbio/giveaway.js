// INeedBio Birthday Giveaway (rounds 8c + 8d): #/birthday (the campaign page), #/birthday/apply (the application),
// the "แจกคอร์สฟรี" link in the header, the announcement bar as a link, and หลังบ้าน › กิจกรรม › Birthday Giveaway
// (#/admin/giveaway). An add-on: public/ineedbio/app.js stays byte-identical to the zip (CHECKSUMS.txt).
//
// app.js sends any route it does not know back to the home page, so this file is loaded before app.js and:
//  · catches the hashchange to #/birthday… first (capture phase) so app.js never sees it;
//  · has app.js draw a plain page (#/terms, synchronous: header, footer) and then puts the campaign into its <main>;
//  · on the first load app.js sends the unknown route home: that step is caught and the URL put back;
//  · after a login/sign-up started on these pages (app.js then routes to "/"), comes back to the page it was on.
// Every date and number comes from the server (giveaway.status: lib/giveaway-config.ts and the server's time); the
// countdown runs on from the server time and the page changes phase by itself. All checks are made again on the server.
(function () {
  'use strict';
  var API = window.INEEDBIO_API_URL || '/api/ib';
  var RX = /^#\/birthday(?:\/(apply))?\/?$/;
  var SUBJ = { bio: 'ชีววิทยา', chem: 'เคมี', phys: 'ฟิสิกส์', math: 'คณิตศาสตร์' };
  var SHORT = { bio: 'ชีวะ', chem: 'เคมี', phys: 'ฟิสิกส์', math: 'คณิต' };
  var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var ST_TH = { pending: 'รอตรวจ', review: 'กำลังพิจารณา', approved: 'ผ่าน', rejected: 'ไม่ผ่าน' };
  var ST_BADGE = { pending: 'b-soft', review: 'b-wait', approved: 'b-ok', rejected: 'b-no' };
  var STORY_MAX = 5 * 1024 * 1024, LONG_SIDE = 1600;

  var st = null, off = 0, stAt = 0, stLoading = null, mine = null, editing = false;
  var bounce = null, gsub = '', fsub = '', draft = null, passing = false, booted = false, tick = 0, lastPhase = '';

  /* ── helpers ── */
  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function call(action, d) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: d || {}, token: ls('ib_token'), device_id: ls('ib_device') }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) { var e = new Error(j.message || 'โหลดไม่สำเร็จ'); e.code = j.error; throw e; } return j.data; });
  }
  function toast(msg, bad) {
    var box = document.getElementById('toasts'); if (!box) return;
    var el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.setAttribute('role', 'status'); el.textContent = msg;
    box.appendChild(el); setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 260); }, 3000);
  }
  function openModal(html, wide) {
    var m = document.getElementById('modal'); if (!m) return;
    m.innerHTML = '<div class="scrim" data-close="1"><div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
  }
  function closeModal() { var m = document.getElementById('modal'); if (m) m.innerHTML = ''; }
  function len(s) { return Array.from(String(s || '').trim()).length; }
  function now() { return Date.now() + off; }
  function T(s) { return Date.parse(s); }
  function bkk(t) { return new Date(t + 7 * 36e5); }
  function thD(s) { var d = bkk(T(s)); return d.getUTCDate() + ' ' + TH_M[d.getUTCMonth()] + ' ' + String((d.getUTCFullYear() + 543) % 100).padStart(2, '0'); }
  function thT(s) { return bkk(T(s)).toISOString().slice(11, 16); }
  function thDT(s) { return thD(s) + ' เวลา ' + thT(s); }
  function thShort(s) { var d = bkk(T(s)); return d.getUTCDate() + ' ' + TH_M[d.getUTCMonth()] + ' ' + thT(s); }
  function stamp(s) { return thD(s) + ' ' + thT(s); }
  function phase() {
    if (!st) return '';
    var t = now();
    if (t < T(st.show_at)) return 'pre';
    if (t < T(st.open_at)) return 'countdown';
    if (t < T(st.close_at) + 1000) return 'open';
    if (t < T(st.announce_at)) return 'closed';
    return 'announced';
  }
  function menuOn() { if (!st) return false; var t = now(); return t >= T(st.show_at) && t < T(st.hide_at); }
  function parts(ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000); return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; }
  function p2(n) { return String(n).padStart(2, '0'); }
  function igUrl() { return 'https://www.instagram.com/' + encodeURIComponent((st && st.instagram) || 'ineedbio.official'); }
  function igAt() { return '@' + esc((st && st.instagram) || 'ineedbio.official'); }
  function loggedIn() { return !!ls('ib_token'); }
  // URL changes go through the browser's own replaceState: Next.js wraps history.replaceState to keep its router state
  // and writes that URL back later, which would undo the switch to #/terms and back.
  var nativeRS = History.prototype.replaceState;
  function rs(u) { nativeRS.call(history, history.state, '', u); }
  // The page was left (reloaded) during the moment the URL reads #/terms: come back to the campaign page instead.
  var here = '';
  try {
    var sh = JSON.parse(sessionStorage.getItem('gv_shell') || 'null');
    sessionStorage.removeItem('gv_shell');
    if (sh && location.hash === '#/terms' && RX.test(sh.h) && Date.now() - sh.t < 30000) rs(sh.h);
  } catch (x) {}
  // Next.js can write its own copy of the URL (#/terms) back a moment later: keep the campaign's URL.
  function fixUrl() { if (!passing && here && location.hash === '#/terms' && $('#gv-root')) rs(here); }
  function want() { var m = RX.exec(location.hash || ''); return m ? (m[1] || 'main') : null; }
  function logo() { var i = $('.hdr .logo img'); return i ? i.getAttribute('src') : '/ineedbio/logo.webp'; }

  /* ── CSS (public/ineedbio/giveaway.css, versioned like the scripts) ── */
  (function () {
    var v = (window.INEEDBIO_ASSETS || {})['giveaway.css'] || 'x';
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/ineedbio/giveaway.css?v=' + v; l.id = 'gv-css';
    document.head.appendChild(l);
  })();

  /* ── data ── */
  function loadStatus(force) {
    if (!force && st && Date.now() - stAt < 60000) return Promise.resolve(st);
    if (stLoading) return stLoading;
    var t0 = Date.now();
    stLoading = call('giveaway.status').then(function (d) {
      var t1 = Date.now();
      st = d; stAt = t1; off = Date.parse(d.server_now) - Math.round((t0 + t1) / 2); stLoading = null;
      decorate(); return d;
    }, function (e) { stLoading = null; throw e; });
    return stLoading;
  }
  function loadMine() {
    if (!loggedIn()) { mine = null; return Promise.resolve(null); }
    return call('giveaway.mine').then(function (d) { mine = d; return d; }, function (e) { if (e.code === 'AUTH' || e.code === 'SESSION_REPLACED') { mine = null; return null; } throw e; });
  }

  /* ── routing ── */
  function shell() {
    // app.js draws #/terms (synchronously: header + empty main + footer), then the URL goes back to this page.
    var target = location.hash; here = target;
    try { sessionStorage.setItem('gv_shell', JSON.stringify({ h: target, t: Date.now() })); } catch (x) {}
    passing = true;
    try { rs('#/terms'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
    finally { passing = false; rs(target); }
    setTimeout(function () { try { sessionStorage.removeItem('gv_shell'); } catch (x) {} }, 2000);
  }
  function show() {
    var v = want(); if (!v) return;
    closeModal();
    shell(); draw();
  }
  function root() {
    var w = $('#app main .w'); if (!w) return null;
    var r = $('#gv-root', w);
    if (!r) { w.innerHTML = '<div id="gv-root" class="gv-root"></div>'; r = $('#gv-root', w); }
    return r;
  }
  function draw() {
    var v = want(), r = root(); if (!v || !r) return;
    document.documentElement.classList.add('gv-page');
    r.dataset.v = v;
    if (!st) r.innerHTML = '<div class="empty"><p>กำลังโหลด…</p></div>';
    var p = Promise.all([loadStatus(), v === 'apply' || loggedIn() ? loadMine() : null]);
    p.then(function () { if (want() === v) render(); }, function (e) {
      var rr = root(); if (!rr || want() !== v) return;
      rr.innerHTML = '<div class="empty"><div class="gv-big">!</div><b style="font-size:20px;color:var(--ink)">โหลดไม่สำเร็จ</b><p>' + esc(e.message) + '</p><button class="pill ghost" data-gv="retry">ลองใหม่</button></div>';
    });
  }
  function render() {
    var r = root(); if (!r || !st) return;
    lastPhase = phase();
    r.innerHTML = want() === 'apply' ? applyView() : mainView();
    navActive();
    if (want() === 'apply') hydrateForm();
    clock();
  }

  // hashchange: ours never reaches app.js; coming back after a login started here
  window.addEventListener('hashchange', function (e) {
    if (passing) return;
    var v = want();
    if (!v) {
      document.documentElement.classList.remove('gv-page');
      var from0 = ''; try { from0 = new URL(e.oldURL).hash; } catch (x) {}
      // first load on #/birthday…: app.js boots, does not know the route and sends it home (location.hash = "/"; while
      // the page is still loading that replaces the history entry). Put the campaign's URL back and show it instead;
      // nothing of app.js's home page has been drawn yet.
      if (!booted && RX.test(from0) && !$('#app .hdr')) { booted = true; e.stopImmediatePropagation(); rs(from0); show(); return; }
      var back = null; try { back = JSON.parse(sessionStorage.getItem('gv_back') || 'null'); } catch (x) {}
      var from = ''; try { from = new URL(e.oldURL).hash; } catch (x) {}
      // a theme button on this page (app.js redraws with route(), which sends unknown routes home): stay here
      if (bounce && RX.test(from) && Date.now() - bounce.t < 2000) { var h = bounce.h; bounce = null; e.stopImmediatePropagation(); rs(h); show(); return; }
      if (back && loggedIn() && RX.test(from) && Date.now() - back.t < 20 * 60000) {
        try { sessionStorage.removeItem('gv_back'); } catch (x) {}
        e.stopImmediatePropagation();
        rs(back.h); mine = null; st = null; show();
      }
      return;
    }
    e.stopImmediatePropagation();
    if (v === 'main') editing = false;
    if (!booted && !$('#app .hdr')) return; // app.js has not booted: its first route() comes back through here
    booted = true;
    show();
  }, true);


  /* ── header link "แจกคอร์สฟรี" + announcement bar ── */
  function decorate() {
    var nav = $('.hdr .nav');
    if (nav) {
      var a = $('.gv-nav', nav);
      if (menuOn()) {
        if (!a) {
          a = document.createElement('a'); a.href = '#/birthday'; a.className = 'gv-nav'; a.textContent = 'แจกคอร์สฟรี';
          var links = $$('a', nav), after = links.filter(function (x) { return x.getAttribute('href') === '#/my'; })[0] || links.filter(function (x) { return x.getAttribute('href') === '#/results'; })[0];
          if (after && after.nextSibling) nav.insertBefore(a, after.nextSibling); else nav.appendChild(a);
        }
      } else if (a) a.remove();
    }
    var ann = $('.ann');
    if (ann) ann.classList.toggle('gv-ann', menuOn());
    navActive();
    homeBB();
  }
  function navActive() {
    var nav = $('.hdr .nav'); if (!nav) return;
    var on = !!want(), a = $('.gv-nav', nav);
    if (on) $$('a.on', nav).forEach(function (x) { if (x !== a) x.classList.remove('on'); });
    if (a) { a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  }

  /* ── home page billboard (#bbd): the campaign is the first slide while the menu link shows ──
     app.js draws #bbd and starts its slider inside its own closure (startBillboard). The slider is copied as is:
     #bbd is swapped for a clone (drops app.js's listeners), the campaign slide and its dot go first, then bbRun(). */
  var BB_LABEL = 'Birthday Giveaway · แจกคอร์สเรียนฟรี';
  function bbKey() { return phase() + (st.me && st.me.applied ? 1 : 0); }
  function bbCta(ph) {
    var more = '<a class="bbtn ' + (ph === 'open' || ph === 'announced' ? 'gh' : 'pri') + '" href="#/birthday">ดูรายละเอียด</a>';
    if (ph === 'open') return '<a class="bbtn pri" href="#/birthday/apply">' + (st.me && st.me.applied ? 'ดูใบสมัครของฉัน' : 'สมัครเลย') + '</a>' + more;
    if (ph === 'announced') return '<a class="bbtn pri" href="' + igUrl() + '" target="_blank" rel="noopener">ดูผลที่ Instagram</a>' + more;
    return more;
  }
  function bbInner() {
    var ph = phase();
    return '<div class="bbd-in"><div><span class="bbd-k"><i></i>Birthday Giveaway · 12.11</span><h2>แจกคอร์สเรียนฟรี ' + Number(st.seats || 5) + ' ที่นั่ง</h2>' +
      '<p class="sub">ฉลองวันเกิดพี่พร้อม เลือกได้ 1 คอร์สจากทุกวิชา ชีวะ เคมี ฟิสิกส์ คณิต</p>' + heroTime(ph) +
      '<div class="bbd-cta">' + bbCta(ph) + '</div></div>' +
      '<a class="bbd-art" href="#/birthday" tabindex="-1" aria-hidden="true">' + shelf() + '</a></div>';
  }
  function bbRun(bb) { // = app.js startBillboard()
    var sl = $$('.bbd-s', bb), dots = $$('[data-bb]', bb), i = 0;
    if (sl.length < 2) { sl.forEach(function (x) { x.classList.add('on'); x.setAttribute('aria-hidden', 'false'); }); return; }
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var show = function (n) {
      i = (n + sl.length) % sl.length;
      sl.forEach(function (x, k) { x.classList.toggle('on', k === i); x.setAttribute('aria-hidden', String(k !== i)); });
      dots.forEach(function (d, k) { d.classList.remove('on', 'run'); if (k === i) { d.classList.add('on'); void d.offsetWidth; if (!still) d.classList.add('run'); } });
    };
    bb.addEventListener('animationend', function (e) { if (e.target.matches && e.target.matches('[data-bb].run')) show(i + 1); });
    dots.forEach(function (d) { d.onclick = function () { show(+d.dataset.bb); }; });
    var x0 = null;
    bb.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    bb.addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); });
    show(0);
  }
  function homeBB() {
    var bb = $('#bbd'); if (!bb || !st) return;
    var have = $('.gv-bb', bb), on = menuOn();
    if (have && on) { if (have.dataset.k !== bbKey()) { have.dataset.k = bbKey(); have.innerHTML = bbInner(); } return; }
    if (!have && !on) return;
    var labels = $$('[data-bb]', bb).map(function (d) { return d.getAttribute('aria-label') || ''; });
    if (!labels.length) labels = $$('.bbd-s', bb).map(function (x) { var h = $('h2', x); return h ? h.textContent : ''; });
    var nb = bb.cloneNode(true);
    bb.parentNode.replaceChild(nb, bb);
    if (on) { nb.insertAdjacentHTML('afterbegin', '<div class="bbd-s gv-bb" data-k="' + bbKey() + '" aria-hidden="true">' + bbInner() + '</div>'); labels.unshift(BB_LABEL); }
    else { nb.removeChild($('.gv-bb', nb)); labels.shift(); }
    var d = $('.bbd-dots', nb); if (d) nb.removeChild(d);
    if (labels.length > 1) nb.insertAdjacentHTML('beforeend', '<div class="bbd-dots">' + labels.map(function (t, i) { return '<button type="button" data-bb="' + i + '" aria-label="' + esc(t) + '"></button>'; }).join('') + '</div>');
    bbRun(nb);
  }

  /* ── #/birthday ── */
  function countdown(label, to) {
    var x = parts(T(to) - now());
    return '<div class="gv-cd" data-to="' + esc(to) + '"><div class="lb"><b><i></i>' + label + '</b></div>' +
      '<div><b data-u="d">' + x.d + '</b><span>วัน</span></div><div><b data-u="h">' + p2(x.h) + '</b><span>ชั่วโมง</span></div>' +
      '<div><b data-u="m">' + p2(x.m) + '</b><span>นาที</span></div><div><b data-u="s">' + p2(x.s) + '</b><span>วินาที</span></div></div>';
  }
  function heroTime(ph) {
    if (ph === 'pre') return '<div class="gv-msg"><b>เปิดรับสมัคร ' + thDT(st.open_at) + '</b><span>ปิดรับ ' + thDT(st.close_at) + (T(st.show_at) < T(st.open_at) ? ' · นับถอยหลังเริ่ม ' + thD(st.show_at).replace(/ \d+$/, '') : '') + '</span></div>';
    if (ph === 'countdown') return countdown('เปิดรับสมัครใน', st.open_at);
    if (ph === 'open') return countdown('ปิดรับสมัครใน', st.close_at);
    if (ph === 'closed') return '<div class="gv-msg"><b>ปิดรับสมัครแล้ว</b><span>ประกาศผล ' + thDT(st.announce_at) + ' ทาง IG ' + igAt() + '</span></div>';
    return '<div class="gv-msg"><b>ประกาศผลแล้ว</b><span>ดูรายชื่อผู้ได้รับรางวัลที่ IG ' + igAt() + ' ผู้ได้รับรางวัลได้สิทธิ์เรียนเข้าบัญชีแล้ว</span></div>';
  }
  function heroCta(ph) {
    var small = function (t) { return '<span class="gv-sm">' + t + '</span>'; };
    if (ph === 'pre' || ph === 'countdown') return '<a class="pill wh" disabled aria-disabled="true">เปิดรับสมัคร ' + thShort(st.open_at) + '</a><a class="pill gh" href="#gv-courses" data-gv="courses">ดูคอร์สที่เลือกได้</a>';
    if (ph === 'open') {
      if (st.me && st.me.applied) return '<a class="pill wh" href="#/birthday/apply">ดูใบสมัครของฉัน</a>' + small('ส่งแล้ว ✓');
      return '<a class="pill wh" href="#/birthday/apply">สมัครเลย</a>' + small(st.me && st.me.logged_in ? 'ใช้บัญชีที่เข้าสู่ระบบอยู่' : 'ต้องเข้าสู่ระบบก่อนสมัคร');
    }
    if (ph === 'closed') return '<a class="pill wh" disabled aria-disabled="true">ปิดรับสมัครแล้ว</a>';
    return '<a class="pill wh" href="' + igUrl() + '" target="_blank" rel="noopener">ดูผลที่ Instagram</a>';
  }
  function shelf() {
    var f = [['bio', 'bio70', 'สอวน. ปี 70'], ['bio', 'biop', 'สอวน. ค่าย 1'], ['chem', 'chemp', 'สอวน. ค่าย 1'], ['chem', 'chema', 'A-Level'], ['phys', 'phys', 'A-Level'], ['math', 'math', 'ม.4–ม.6']];
    return '<div class="gv-shelf" aria-hidden="true">' + f.map(function (x) {
      return '<figure class="s-' + x[0] + '"><span class="im"><img src="/images/giveaway/' + x[1] + '.webp" alt=""></span><figcaption><i></i><b>' + SUBJ[x[0]] + '</b><span>' + x[2] + '</span></figcaption></figure>';
    }).join('') + '</div>';
  }
  function timeline(ph) {
    var idx = { open: 0, closed: 1, announced: 2 }[ph];
    var cards = [['เปิดรับสมัคร', thD(st.open_at), thT(st.open_at)], ['ปิดรับสมัคร', thD(st.close_at), thT(st.close_at)], ['ประกาศผล', thD(st.announce_at), thT(st.announce_at) + ' · IG ' + igAt()]];
    return '<section class="gv-sec"><div class="sec-h"><div><small>กำหนดการ</small><h2>3 วันที่ต้องจำ</h2></div><span class="sm muted">เวลาประเทศไทย</span></div><div class="gv-g3">' +
      cards.map(function (c, i) {
        var now_ = idx === i, past = idx != null && i < idx;
        return '<div class="card gv-tl' + (now_ ? ' now' : '') + '"><span class="n">0' + (i + 1) + '</span><b>' + c[0] + '</b><span class="d">' + c[1] + '</span><span class="sm ink2">' + c[2] + '</span>' +
          (now_ ? '<span><span class="badge b-inv">ตอนนี้</span></span>' : past ? '<span><span class="badge b-soft">ผ่านแล้ว</span></span>' : '') + '</div>';
      }).join('') + '</div></section>';
  }
  function steps() {
    return '<section class="gv-sec"><div class="sec-h"><div><small>วิธีร่วมกิจกรรม</small><h2>ทำครบ 4 ขั้น</h2></div></div><div class="gv-g4">' +
      '<div class="card gv-st"><span class="ic ig">1</span><b>แชร์โพสต์ลง Story</b><p>แชร์โพสต์กิจกรรมลง IG Story แล้วแท็ก ' + igAt() + '</p><span class="where">ทำใน Instagram</span></div>' +
      '<div class="card gv-st"><span class="ic ig">2</span><b>แท็กเพื่อน 3 คน</b><p>แท็กเพื่อน 3 คนใต้โพสต์กิจกรรม</p><span class="where">ทำใน Instagram</span></div>' +
      '<div class="card gv-st"><span class="ic ig">3</span><b>รีโพสต์</b><p>กดรีโพสต์โพสต์กิจกรรม</p><span class="where">ทำใน Instagram</span></div>' +
      '<div class="card gv-st web"><span class="ic web">4</span><b>กรอกใบสมัคร</b><p>เลือก 1 คอร์ส แล้วตอบ 2 คำถาม ทำไมอยากเรียน และจะเอาความรู้ไปใช้ทำอะไร</p><span class="where">ทำบนเว็บนี้</span></div>' +
      '</div></section>';
  }
  function subjChips(sel, attr) {
    var keys = Object.keys(SUBJ).filter(function (k) { return st.courses.some(function (c) { return c.subject === k; }); });
    return '<button type="button" class="chip" ' + attr + '="" aria-pressed="' + (!sel) + '">ทั้งหมด</button>' + keys.map(function (k) {
      return '<button type="button" class="chip s-' + k + '" ' + attr + '="' + k + '" aria-pressed="' + (sel === k) + '"><i></i>' + SUBJ[k] + '</button>';
    }).join('');
  }
  function meta(c) {
    var t = (c.teachers || []).map(function (x) { return x.name; }).filter(function (n, i, a) { return n && a.indexOf(n) === i; }).join(', ');
    var n = c.lesson_count ? c.lesson_count + ' ตอน' : '';
    return [t, n].filter(Boolean).join(' · ');
  }
  function courseCard(c) {
    return '<a class="nc s-' + esc(c.subject) + '" href="#/course/' + encodeURIComponent(c.course_id) + '"><span class="nc-cv">' +
      (c.cover_url ? '<img src="' + esc(c.cover_url) + '" alt="" loading="lazy" onerror="this.remove()">' : '<span class="ty">' + esc(SHORT[c.subject] || c.subject_name) + '</span>') +
      (c.level ? '<span class="nc-lv">' + esc(c.level) + '</span>' : '') + '</span>' +
      '<span class="nc-b"><span class="nc-t">' + esc(c.title) + '</span><span class="nc-m">' + esc(meta(c)) + '</span>' +
      '<span class="nc-p"><span class="fr">ฟรี</span>' + (c.price > 0 ? '<s>฿' + Number(c.price).toLocaleString('th-TH') + '</s>' : '<span class="sm muted" style="font-weight:500">คอร์สใหม่</span>') + '</span></span></a>';
  }
  function courseGrid() {
    var list = st.courses.filter(function (c) { return !gsub || c.subject === gsub; });
    return list.map(courseCard).join('') || '<div class="empty"><p>ยังไม่มีคอร์สในวิชานี้</p></div>';
  }
  function faq() {
    var q = [
      ['ต้องมีบัญชี INeedBio ไหม', 'ต้องมี ใบสมัครผูกกับบัญชี ชื่อ-นามสกุลดึงจากบัญชีให้อัตโนมัติ ยังไม่มีบัญชีสมัครได้ฟรี'],
      ['สมัครได้กี่ครั้ง', '1 บัญชีส่งได้ 1 ใบสมัคร เลือกได้ 1 คอร์ส แก้ไขใบสมัครได้จนถึง ' + thDT(st.close_at)],
      ['ถ้ามีคอร์สนั้นอยู่แล้ว', 'เลือกคอร์สที่มีสิทธิ์เรียนอยู่แล้วไม่ได้ ในใบสมัครจะขึ้นว่า "มีสิทธิ์แล้ว"'],
      ['คัดเลือกยังไง', 'พี่ๆ อ่านใบสมัครทุกใบ ดูจากเหตุผล เป้าหมาย และการทำกติกาใน Instagram ครบ ไม่ใช่การสุ่ม'],
      ['ประกาศผลที่ไหน', thDT(st.announce_at) + ' ทาง IG ' + '@' + ((st && st.instagram) || 'ineedbio.official') + ' ผู้ได้รับรางวัลได้สิทธิ์เรียนเข้าบัญชีทันที ไม่ต้องโอนเงิน'],
      ['ข้อมูลของน้องใช้ทำอะไร', 'ใช้คัดเลือกกิจกรรมนี้เท่านั้น ประกาศผลด้วยชื่อเล่น ไม่เผยแพร่ชื่อจริงหรือรูปของน้อง'],
    ];
    return '<section class="gv-sec"><div class="sec-h"><div><small>FAQ</small><h2>กติกาและคำถามที่พบบ่อย</h2></div></div><div class="syl faq">' +
      q.map(function (x) { return '<details><summary><span class="t">' + esc(x[0]) + '</span><span class="n">+</span></summary><p>' + esc(x[1]) + '</p></details>'; }).join('') + '</div></section>';
  }
  function mainView() {
    var ph = phase();
    return '<section class="res-h gv-hero"><div><small class="k">Birthday Giveaway · 12.11</small><h1>แจกคอร์สเรียนฟรี<br>' + Number(st.seats || 5) + ' ที่นั่ง</h1>' +
      '<p>ฉลองวันเกิดพี่พร้อม เลือกได้ 1 คอร์สจากทุกวิชา ชีวะ เคมี ฟิสิกส์ คณิต พี่ๆ อ่านใบสมัครทุกใบแล้วคัดเลือกเอง ไม่ใช่การสุ่ม</p>' +
      '<div id="cd">' + heroTime(ph) + '</div><div class="rowx gv-cta">' + heroCta(ph) + '</div></div>' + shelf() + '</section>' +
      timeline(ph) + steps() +
      '<section class="gv-sec" id="gv-courses"><div class="rw-h"><div><small>คอร์สที่ร่วมรายการ</small><h2>เลือกได้ 1 คอร์ส</h2></div><span class="sm muted">ไม่รวมแพ็กเกจ</span></div>' +
      '<div class="gv-chips">' + subjChips(gsub, 'data-gvsub') + '</div><div class="gv-grid" id="gv-grid">' + courseGrid() + '</div></section>' +
      faq() +
      '<div class="card gv-end"><div class="who"><img src="' + esc(logo()) + '" alt=""><div><b>มีคำถามเรื่องกิจกรรม?</b><div class="sm ink2">ทักพี่ทาง IG ได้เลย ตอบทุกข้อความ</div></div></div><a class="pill" href="' + igUrl() + '" target="_blank" rel="noopener">ทัก IG ' + igAt() + '</a></div>';
  }

  /* ── #/birthday/apply ── */
  function box(icon, title, text, buttons) {
    return '<div class="empty"><div class="gv-big">' + icon + '</div><b style="font-size:20px;color:var(--ink)">' + title + '</b><p>' + text + '</p>' + (buttons || '') + '</div>';
  }
  function applyHead() {
    return '<section class="page-h"><small class="mono">Birthday Giveaway · ใบสมัคร</small><h1>เล่าให้พี่ฟังหน่อย</h1><p>ส่งได้ 1 ครั้งต่อบัญชี แก้ไขได้ถึง ' + thDT(st.close_at) + '</p></section>';
  }
  function applyView() {
    var ph = phase(), back = '<a class="pill ghost" href="#/birthday">';
    var head = applyHead();
    if (!loggedIn() || !(st.me && st.me.logged_in) && !mine)
      return head + box('🔒', 'เข้าสู่ระบบก่อนสมัคร', 'ใบสมัครผูกกับบัญชี INeedBio ของน้อง ยังไม่มีบัญชีสมัครได้ฟรี', '<div class="rowx" style="justify-content:center"><button class="pill ghost" data-act="login" data-gvauth="1">เข้าสู่ระบบ</button><button class="pill" data-act="signup" data-gvauth="1">สมัครสมาชิก</button></div>');
    if (mine && mine.staff) return head + box('🎂', 'บัญชีนี้ร่วมกิจกรรมไม่ได้', 'บัญชีแอดมินและผู้สอนร่วมกิจกรรมนี้ไม่ได้', back + 'กลับหน้ากิจกรรม</a>');
    if (ph === 'pre' || ph === 'countdown') return head + box('⏳', 'ยังไม่เปิดรับสมัคร', 'เปิดรับ ' + thDT(st.open_at) + ' ระหว่างนี้ทำกติกาใน IG เตรียมไว้ได้', back + 'ดูรายละเอียดกิจกรรม</a>');
    var app = mine && mine.application;
    if (ph === 'closed' || ph === 'announced') return head + box('📮', 'ปิดรับสมัครแล้ว', (app ? 'ใบสมัครของน้องอยู่ในระบบแล้ว ' : '') + 'ประกาศผล ' + thDT(st.announce_at) + ' ทาง IG ' + igAt(), back + 'กลับหน้ากิจกรรม</a>');
    if (app && !editing) return head + recap(app);
    return head + form(app);
  }
  function recap(a) {
    var row = function (k, v) { return '<div class="r"><span>' + k + '</span><div>' + v + '</div></div>'; };
    return '<div class="empty gv-done"><div class="gv-big">✓</div><b style="font-size:20px;color:var(--ink)">ส่งใบสมัครแล้ว</b><p>พี่ได้รับใบสมัครของน้องแล้ว ประกาศผล ' + thDT(st.announce_at) + '</p>' +
      '<div class="card gv-recap">' + row('IG', '@' + esc(a.ig)) + row('คอร์ส', esc(a.course_title)) + row('เหตุผล', esc(a.reason)) + row('เป้าหมาย', esc(a.goal)) +
      row('รูป Story', a.has_story ? 'แนบแล้ว' : '—') + row('ส่งเมื่อ', esc(stamp(a.created_at))) + '</div>' +
      '<div class="rowx" style="justify-content:center;flex-wrap:wrap"><button class="pill ghost" data-gv="edit">แก้ไขใบสมัคร</button><a class="pill" href="#/birthday">กลับหน้ากิจกรรม</a><span class="sm muted">แก้ไขได้ถึง ' + thDT(st.close_at) + '</span></div></div>';
  }
  function field(id, q, title, help, body, err, opt) {
    return '<div class="gv-f" id="' + id + '"><div class="t"><span class="q">' + q + '</span>' + title + (opt ? '' : '<span class="rq">*</span>') + '</div>' + (help ? '<div class="h">' + help + '</div>' : '') + body + (err ? '<p class="err">' + err + '</p>' : '') + '</div>';
  }
  function courseOpt(c, sel, owned) {
    var own = owned.indexOf(c.course_id) >= 0;
    return '<label class="gv-co s-' + esc(c.subject) + (own ? ' own' : '') + '" data-sj="' + esc(c.subject) + '"' + (fsub && c.subject !== fsub ? ' hidden' : '') + '><input type="radio" name="co" value="' + esc(c.course_id) + '"' + (own ? ' disabled' : '') + (sel === c.course_id && !own ? ' checked' : '') + '>' +
      '<span class="cv">' + (c.cover_url ? '<img src="' + esc(c.cover_url) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span><span><b>' + esc(c.title) + '</b><small>' + (own ? 'มีสิทธิ์เรียนแล้ว' : esc(meta(c))) + '</small></span>' +
      (own ? '<span class="badge b-soft">มีแล้ว</span>' : '<span class="rd"></span>') + '</label>';
  }
  function form(a) {
    var d = draft || { ig: a ? a.ig : '', co: a ? a.course_id : '', reason: a ? a.reason : '', goal: a ? a.goal : '', pdpa: !!a, story: null, hasStory: !!(a && a.has_story) };
    draft = d;
    var owned = (mine && mine.owned) || (st.me && st.me.owned) || [];
    var max = Number(st.text_max || 5000), min = Number(st.text_min || 50);
    var ta = function (name, ph) { return '<textarea class="i" name="' + name + '" maxlength="' + max + '" placeholder="' + ph + '">' + esc(d[name]) + '</textarea><div class="gv-cnt"><span>อย่างน้อย ' + min + ' ตัวอักษร</span><span data-cnt="' + name + '">' + len(d[name]) + ' / ' + max + '</span></div>'; };
    var name = mine ? [mine.name, mine.nickname ? '(' + mine.nickname + ')' : ''].filter(Boolean).join(' ') : '';
    var drop = d.story ? '<img src="' + d.story.url + '" alt=""><span>' + esc(d.story.name) + ' · แตะเพื่อเปลี่ยน</span>' : d.hasStory ? '<span>แนบแล้ว · แตะเพื่อเปลี่ยน</span>' : '<span>แตะเพื่อเลือกรูป</span>';
    return '<div class="gv-form"><form class="card" id="gv-form" novalidate>' +
      field('gv-f1', '01', 'ชื่อ-นามสกุล', '', '<input class="i" readonly value="' + esc(name) + '" style="background:var(--bg2);color:var(--ink2)"><div class="sm muted">ดึงจากบัญชีของน้อง แก้ได้ที่หน้าข้อมูลส่วนตัว</div>', '', true) +
      field('gv-f2', '02', 'Instagram', 'บัญชีที่ใช้แชร์ Story และแท็กเพื่อน', '<div class="gv-ig"><span>@</span><input class="i" name="ig" placeholder="username" maxlength="30" autocomplete="off" autocapitalize="none" spellcheck="false" value="' + esc(d.ig) + '"></div>', 'ใส่ username ภาษาอังกฤษ ตัวเลข จุด หรือ _ ได้ 1–30 ตัว') +
      field('gv-f3', '03', 'คอร์สที่อยากได้', 'เลือก 1 คอร์ส', '<div class="gv-chips" style="margin-top:0">' + subjChips(fsub, 'data-gvfsub') + '</div><div class="gv-cl">' + st.courses.map(function (c) { return courseOpt(c, d.co, owned); }).join('') + '</div>', 'เลือก 1 คอร์ส') +
      field('gv-f4', '04', 'ทำไมถึงอยากเรียนคอร์สนี้', '', ta('reason', 'เช่น ตอนนี้อยู่ ม.5 กำลังเตรียมสอบ...'), 'เขียนอย่างน้อย ' + min + ' ตัวอักษร') +
      field('gv-f5', '05', 'จะนำความรู้ไปใช้ทำอะไร', 'เช่น สอบเข้าคณะไหน สอบค่าย สอวน. หรืออยากเข้าใจเรื่องไหนให้ได้', ta('goal', ''), 'เขียนอย่างน้อย ' + min + ' ตัวอักษร') +
      field('gv-f6', '06', 'ภาพหน้าจอ Story', '', '<label class="gv-drop"><input type="file" name="story" accept="image/png,image/jpeg,image/webp" hidden>' + drop + '</label>', '<span data-err="story">แนบภาพหน้าจอ Story</span>') +
      field('gv-f7', '07', 'การใช้ข้อมูลส่วนตัว', '', '<div class="note plain">INeedBio ใช้ข้อมูลในใบสมัครนี้ (ชื่อ, IG, คำตอบ, รูป Story) เพื่อคัดเลือกและประกาศชื่อเล่นผู้ได้รับรางวัลกิจกรรม Birthday Giveaway 2569 เท่านั้น เห็นเฉพาะทีมงาน และลบรูป Story หลังประกาศผล 30 วัน</div>' +
        '<label class="gv-ck"><input type="checkbox" name="pdpa"' + (d.pdpa ? ' checked' : '') + '><span>ยินยอมให้ใช้ข้อมูลตามข้างบน</span></label>', 'ต้องยินยอมก่อนส่งใบสมัคร') +
      '</form><aside class="gv-side"><div class="card gv-sum"><h3>สรุปใบสมัคร</h3>' +
      '<div class="r"><span>IG</span><b data-s="ig">—</b></div><div class="r"><span>คอร์ส</span><b data-s="co">—</b></div>' +
      '<div class="r"><span>เหตุผล</span><b data-s="reason">0 ตัว</b></div><div class="r"><span>เป้าหมาย</span><b data-s="goal">0 ตัว</b></div><div class="r"><span>รูป Story</span><b data-s="story">—</b></div>' +
      '<button type="button" class="pill block" data-gv="send" style="margin-top:14px;padding:10px 16px;font-size:15px;font-weight:600">ส่งใบสมัคร</button>' +
      '<div class="sm muted" style="text-align:center;margin-top:6px" data-left="1"></div></div>' +
      '<div class="card"><b style="display:block;margin-bottom:8px">เช็กก่อนส่ง</b><ol class="gv-chk"><li>แชร์ Story แท็ก ' + igAt() + '</li><li>แท็กเพื่อน 3 คนใต้โพสต์</li><li>รีโพสต์</li><li class="me">ส่งใบสมัครนี้</li></ol></div></aside></div>';
  }
  function normIg(v) {
    var s = String(v || '').trim(), m = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/([^/?#\s]+)/i.exec(s);
    if (m) s = m[1];
    s = s.replace(/^@+/, '').trim().toLowerCase();
    return /^(?!.*\.\.)(?!\.)[a-z0-9._]{1,30}$/.test(s) && s.slice(-1) !== '.' ? s : '';
  }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(Math.max(t.scrollHeight + 2, 120), 360) + 'px'; t.style.overflowY = t.scrollHeight + 2 > 360 ? 'auto' : 'hidden'; }
  function hydrateForm() {
    var f = $('#gv-form'); if (!f) return;
    $$('textarea', f).forEach(grow);
    summary();
  }
  function summary() {
    var f = $('#gv-form'); if (!f || !draft) return;
    var max = Number(st.text_max || 5000);
    var set = function (k, v) { var el = $('[data-s="' + k + '"]'); if (el) el.textContent = v; };
    set('ig', draft.ig ? '@' + (normIg(draft.ig) || draft.ig.replace(/^@+/, '')) : '—');
    var c = st.courses.filter(function (x) { return x.course_id === draft.co; })[0]; set('co', c ? c.title : '—');
    set('reason', len(draft.reason) + ' ตัว'); set('goal', len(draft.goal) + ' ตัว');
    set('story', draft.story || draft.hasStory ? 'แนบแล้ว' : '—');
    ['reason', 'goal'].forEach(function (k) { var el = $('[data-cnt="' + k + '"]'); if (el) el.textContent = len(draft[k]) + ' / ' + max; });
  }
  function check() {
    var min = Number(st.text_min || 50), max = Number(st.text_max || 5000), bad = [];
    var mark = function (id, wrong) { var el = document.getElementById(id); if (el) el.classList.toggle('bad', !!wrong); if (wrong) bad.push(id); };
    mark('gv-f2', !normIg(draft.ig));
    mark('gv-f3', !draft.co);
    mark('gv-f4', len(draft.reason) < min || len(draft.reason) > max);
    mark('gv-f5', len(draft.goal) < min || len(draft.goal) > max);
    var se = $('[data-err="story"]'); if (se && !draft.storyErr) se.textContent = 'แนบภาพหน้าจอ Story';
    mark('gv-f6', !!draft.storyErr || !(draft.story || draft.hasStory));
    mark('gv-f7', !draft.pdpa);
    return bad;
  }
  function send(btn) {
    var bad = check();
    if (bad.length) {
      var first = document.getElementById(bad[0]); if (first) window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
      toast('ยังกรอกไม่ครบ ' + bad.length + ' ข้อ', true); return;
    }
    var app = mine && mine.application, data = { ig: normIg(draft.ig), course_id: draft.co, reason: draft.reason, goal: draft.goal, consent_pdpa: true };
    if (draft.story) data.story = { mime: draft.story.mime, base64: draft.story.base64 };
    btn.disabled = true; var label = btn.innerHTML; btn.innerHTML = '<span class="spin"></span>';
    call(app ? 'giveaway.edit' : 'giveaway.apply', data).then(function () {
      draft = null; editing = false; if (st.me) st.me.applied = true;
      return loadMine();
    }).then(function () {
      toast(app ? 'บันทึกการแก้ไขแล้ว' : 'ส่งใบสมัครแล้ว'); render(); window.scrollTo(0, 0);
    }, function (e) {
      btn.disabled = false; btn.innerHTML = label; toast(e.message, true);
      if (e.code === 'CLOSED' || e.code === 'NOT_OPEN') loadStatus(true).then(render);
    });
  }
  /** The screenshot is redrawn in the browser (long side ≤ 1600 px, JPEG): a phone screenshot of several MB fits in
   *  one request (Vercel takes at most 4.5 MB). If it cannot be read, it cannot be sent. */
  function pickStory(file) {
    var fail = function (msg) { draft.story = null; draft.storyErr = msg; var se = $('[data-err="story"]'); if (se) se.textContent = msg; var f6 = $('#gv-f6'); if (f6) f6.classList.add('bad'); dropInfo(); summary(); };
    draft.storyErr = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return fail('ใช้รูปนี้ไม่ได้ ลองแคปหน้าจอใหม่');
    if (file.size > STORY_MAX) return fail('รูปใหญ่เกิน 5 MB');
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      try {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, LONG_SIDE / Math.max(w, h));
        if (!w || !h) throw new Error('empty');
        var cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
        var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
        var data = cv.toDataURL('image/jpeg', 0.85), b64 = data.split(',')[1] || '';
        URL.revokeObjectURL(url);
        if (!/^data:image\/jpeg;base64,/.test(data) || !b64 || b64.length * 0.75 > STORY_MAX) return fail('ใช้รูปนี้ไม่ได้ ลองแคปหน้าจอใหม่');
        draft.story = { name: file.name, mime: 'image/jpeg', base64: b64, url: data };
        var f6 = $('#gv-f6'); if (f6) f6.classList.remove('bad');
        dropInfo(); summary();
      } catch (e) { URL.revokeObjectURL(url); fail('ใช้รูปนี้ไม่ได้ ลองแคปหน้าจอใหม่'); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); fail('ใช้รูปนี้ไม่ได้ ลองแคปหน้าจอใหม่'); };
    img.src = url;
  }
  function dropInfo() {
    var dz = $('#gv-f6 .gv-drop'); if (!dz) return;
    var inp = $('input', dz);
    $$('img, span', dz).forEach(function (x) { x.remove(); });
    var html = draft.story ? '<img src="' + draft.story.url + '" alt=""><span>' + esc(draft.story.name) + ' · แตะเพื่อเปลี่ยน</span>' : draft.hasStory && !draft.storyErr ? '<span>แนบแล้ว · แตะเพื่อเปลี่ยน</span>' : '<span>แตะเพื่อเลือกรูป</span>';
    dz.insertAdjacentHTML('beforeend', html); if (inp) inp.value = '';
  }

  /* ── clock: countdowns, "ปิดรับใน …", and a page that changes phase by itself ── */
  function clock() {
    fixUrl();
    if (!st) return;
    var ph = phase();
    if (want() && ph !== lastPhase) { loadStatus(true).then(function () { if (want()) { if (want() === 'apply') loadMine().then(render); else render(); } }); lastPhase = ph; return; }
    $$('.gv-cd[data-to]').forEach(function (el) {
      var x = parts(T(el.dataset.to) - now());
      var put = function (u, v) { var b = $('[data-u="' + u + '"]', el); if (b && b.textContent !== v) b.textContent = v; };
      put('d', String(x.d)); put('h', p2(x.h)); put('m', p2(x.m)); put('s', p2(x.s));
    });
    var left = $('[data-left]');
    if (left) { var y = parts(T(st.close_at) + 1000 - now()); left.textContent = 'ปิดรับใน ' + (y.d ? y.d + ' วัน ' : '') + (y.d || y.h ? y.h + ' ชม. ' : '') + y.m + ' นาที'; }
    if (menuOn() !== !!$('.hdr .nav .gv-nav')) decorate();
    homeBB();
  }

  /* ── events (public pages) ── */
  document.addEventListener('click', function (e) {
    var t = e.target;
    var ann = t.closest && t.closest('.ann');
    if (ann && menuOn() && !t.closest('a,button')) { location.hash = '#/birthday'; return; }
    // login / sign-up started on these pages (our buttons or the header's): come back here afterwards
    var au = t.closest && t.closest('[data-act="login"], [data-act="signup"]');
    if (au && want()) { try { sessionStorage.setItem('gv_back', JSON.stringify({ h: location.hash, t: Date.now() })); } catch (x) {} return; }
    if (t.closest && t.closest('[data-theme-set], [data-hwsnd]') && want()) bounce = { h: location.hash, t: Date.now() };
    var r = t.closest && t.closest('#gv-root'); if (!r) return;
    var b = t.closest('[data-gv], [data-gvsub], [data-gvfsub]');
    if (!b) return;
    if (b.hasAttribute('data-gvsub')) { gsub = b.getAttribute('data-gvsub'); $$('[data-gvsub]', r).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); var g = $('#gv-grid'); if (g) g.innerHTML = courseGrid(); return; }
    if (b.hasAttribute('data-gvfsub')) { fsub = b.getAttribute('data-gvfsub'); $$('[data-gvfsub]', r).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); $$('.gv-co', r).forEach(function (l) { l.hidden = !!fsub && l.dataset.sj !== fsub; }); return; }
    var a = b.getAttribute('data-gv');
    if (a === 'retry') { st = null; draw(); }
    else if (a === 'courses') { e.preventDefault(); var s = $('#gv-courses'); if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }
    else if (a === 'edit') { editing = true; draft = null; render(); window.scrollTo(0, 0); }
    else if (a === 'send') send(b);
  });
  document.addEventListener('input', function (e) {
    var f = e.target.closest && e.target.closest('#gv-form'); if (!f || !draft) return;
    var n = e.target.name;
    if (n === 'ig') { draft.ig = e.target.value; if (normIg(draft.ig)) $('#gv-f2').classList.remove('bad'); }
    else if (n === 'reason' || n === 'goal') { draft[n] = e.target.value; grow(e.target); var min = Number(st.text_min || 50); if (len(draft[n]) >= min) $('#gv-f' + (n === 'reason' ? 4 : 5)).classList.remove('bad'); }
    summary();
  });
  document.addEventListener('change', function (e) {
    var f = e.target.closest && e.target.closest('#gv-form'); if (!f || !draft) return;
    var n = e.target.name;
    if (n === 'co') { draft.co = e.target.value; $('#gv-f3').classList.remove('bad'); }
    else if (n === 'pdpa') { draft.pdpa = e.target.checked; if (draft.pdpa) $('#gv-f7').classList.remove('bad'); }
    else if (n === 'story') pickStory(e.target.files && e.target.files[0]);
    summary();
  });
  document.addEventListener('submit', function (e) { if (e.target.id === 'gv-form') e.preventDefault(); });

  /* ════════════════════ หลังบ้าน › Birthday Giveaway (#/admin/giveaway) ════════════════════ */
  var A = { data: null, loading: false, err: '', tab: 'all', q: '', sub: '', pending: null, cur: null, stories: {} };
  function aHere() { return /^#\/admin\/giveaway\b/.test(location.hash); }
  function isAdminShell() { return !!$('nav.aside a[href="#/admin/users"]'); }
  function aMenu() {
    var nav = $('nav.aside'); if (!nav || !isAdminShell()) return;
    var a = $('.gv-a', nav);
    if (!a) {
      var after = $('a[href="#/admin/legacy"]', nav) || $('a[href="#/admin/requests"]', nav);
      var h = document.createElement('span'); h.className = 'agh gv-agh'; h.textContent = 'กิจกรรม';
      a = document.createElement('span'); a.className = 'gv-a'; a.setAttribute('role', 'link'); a.tabIndex = 0;
      a.innerHTML = '<span>Birthday Giveaway</span><span class="n" hidden></span>';
      a.onclick = function () { location.hash = '#/admin/giveaway'; };
      a.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = '#/admin/giveaway'; } };
      if (after && after.nextSibling) { nav.insertBefore(a, after.nextSibling); nav.insertBefore(h, a); } else { nav.appendChild(h); nav.appendChild(a); }
      if (A.pending == null) { A.pending = 0; call('admin.giveaway.count').then(function (d) { A.pending = d.pending; badge(); }, function () {}); }
    }
    badge();
    var on = aHere();
    if (on) $$('a.on', nav).forEach(function (x) { x.classList.remove('on'); });
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  function badge() { var n = $('nav.aside .gv-a .n'); if (!n) return; n.hidden = !A.pending; n.textContent = A.pending || ''; }
  function aPage() {
    var now_ = aHere() && isAdminShell();
    document.body.classList.toggle('gv-adm-on', now_);
    if (!now_) return;
    var amain = document.getElementById('amain'); if (!amain) return;
    var r = document.getElementById('gvadm');
    if (!r) { r = document.createElement('div'); r.id = 'gvadm'; amain.appendChild(r); aDraw(); }
    if (!A.data && !A.loading && !A.err) aLoad();
  }
  function aLoad() {
    A.loading = true; A.err = ''; aDraw();
    call('admin.giveaway.list').then(function (d) { A.data = d; A.loading = false; A.pending = d.kpi.pending; badge(); aDraw(); }, function (e) { A.loading = false; A.err = e.message; aDraw(); });
  }
  function aRows() {
    var d = A.data; if (!d) return [];
    var q = A.q.trim().toLowerCase().replace(/^@/, '');
    return d.items.filter(function (x) {
      return (A.tab === 'all' || x.status === A.tab) && (!A.sub || x.subject === A.sub) &&
        (!q || [x.nickname, x.name, x.ig].join(' ').toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
  }
  function stBadges(x) { return '<span class="badge ' + ST_BADGE[x.status] + '">' + ST_TH[x.status] + '</span>' + (x.awarded ? ' <span class="badge b-inv">มอบสิทธิ์แล้ว</span>' : ''); }
  function aTable() {
    var rows = aRows();
    return '<div class="tbl"><table style="min-width:720px"><thead><tr><th>ส่งเมื่อ</th><th>น้อง</th><th>IG</th><th>คอร์สที่เลือก</th><th>สถานะ</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (x) {
        return '<tr class="cl" data-gvopen="' + esc(x.id) + '"><td style="white-space:nowrap"><b class="sm">' + esc(stamp(x.created_at)) + '</b></td><td style="white-space:nowrap">' + esc(x.nickname || '—') + '<div class="sub">' + esc(x.name) + '</div></td>' +
          '<td class="sm">@' + esc(x.ig) + '</td><td class="sm"><span class="gv-sj s-' + esc(x.subject) + '"><i></i>' + esc(x.course_title) + '</span></td><td>' + stBadges(x) + '</td>' +
          '<td><div class="acts"><button class="pill s" data-gvopen="' + esc(x.id) + '">เปิดดู</button></div></td></tr>';
      }).join('') : '<tr><td colspan="6" class="muted" style="text-align:center;padding:22px">ไม่พบใบสมัคร</td></tr>') + '</tbody></table></div>';
  }
  function aFolders() {
    var d = A.data, base = d.items.filter(function (x) { return A.tab === 'all' || x.status === A.tab; });
    var n = function (k) { return base.filter(function (x) { return !k || x.subject === k; }).length; };
    return '<button data-gvasub="" aria-pressed="' + (!A.sub) + '">ทุกวิชา <span class="n">' + n('') + '</span></button>' + Object.keys(SUBJ).map(function (k) {
      return '<button class="s-' + k + '" data-gvasub="' + k + '" aria-pressed="' + (A.sub === k) + '">' + SUBJ[k] + ' <span class="n">' + n(k) + '</span></button>';
    }).join('');
  }
  function aDraw() {
    var r = document.getElementById('gvadm'); if (!r) return;
    var head = '<div class="spread"><h1>Birthday Giveaway 2569</h1><button class="pill ghost s" data-gva="csv"' + (A.data && A.data.items.length ? '' : ' disabled') + '>ดาวน์โหลด CSV</button></div>' +
      '<p class="ink2 sm" style="margin-top:-12px">รับสมัคร 7–12 พ.ย. (เปิดก่อนกำหนด เดิม 9 พ.ย.) · ประกาศผล 13 พ.ย. 17:00 · อ่านใบสมัคร เปิด IG ของน้องตรวจกติกา แล้วเลือกผู้ได้รับรางวัลไม่เกิน 5 คน</p>';
    if (A.err) { r.innerHTML = head + '<div class="empty"><p>' + esc(A.err) + '</p><button class="pill ghost" data-gva="reload">ลองใหม่</button></div>'; return; }
    if (!A.data) { r.innerHTML = head + '<div class="empty"><p>กำลังโหลด…</p></div>'; return; }
    var k = A.data.kpi, seats = k.seats || 5;
    var tabs = [['all', 'ทั้งหมด'], ['pending', 'รอตรวจ'], ['review', 'กำลังพิจารณา'], ['approved', 'ผ่าน'], ['rejected', 'ไม่ผ่าน']];
    r.innerHTML = head +
      '<div class="kpis"><div class="kpi hot"><span>รอตรวจ</span><b>' + k.pending + '</b><span>จากใบสมัครทั้งหมด ' + k.total + ' ใบ</span></div>' +
      '<div class="kpi"><span>กำลังพิจารณา</span><b>' + k.review + '</b><span>ไม่ผ่าน ' + k.rejected + '</span></div>' +
      '<div class="kpi gold"><span>ผู้ได้รับรางวัล</span><b>' + k.approved + ' / ' + seats + '</b><div class="gv-five">' + Array.apply(null, Array(seats)).map(function (_, i) { return '<i' + (i < k.approved ? ' class="on"' : '') + '></i>'; }).join('') + '</div><span>มอบสิทธิ์เรียนแล้ว ' + k.awarded + ' คน</span></div></div>' +
      '<div class="rowx gv-af"><div class="seg">' + tabs.map(function (t) { return '<button data-gvtab="' + t[0] + '" aria-pressed="' + (A.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<input class="i gv-aq" style="width:240px" placeholder="ค้นชื่อ ชื่อเล่น หรือ IG" value="' + esc(A.q) + '"></div>' +
      '<div class="ofold" id="gv-fold">' + aFolders() + '</div><div id="gv-tbl">' + aTable() + '</div>' +
      '<p class="sm muted">ระบบไม่ดึงข้อมูลจาก IG พี่กดลิงก์เข้าไปดูเอง</p>' +
      '<div class="spread gv-purge"><span class="sm muted">' + (A.data.purged ? 'ลบรูป Story ของกิจกรรมนี้แล้ว' : 'ลบรูป Story ได้ตั้งแต่ ' + thDT(A.data.purge_at) + ' (30 วันหลังประกาศผล)') + '</span>' +
      '<button class="pill ghost s" data-gva="purge"' + (A.data.purge_allowed && !A.data.purged ? '' : ' disabled') + '>ลบรูป Story ของกิจกรรมนี้</button></div>';
  }
  function aRefreshList() { var t = document.getElementById('gv-tbl'); if (t) t.innerHTML = aTable(); var f = document.getElementById('gv-fold'); if (f) f.innerHTML = aFolders(); }
  var ACT = { submit: 'ส่งใบสมัคร', edit: 'แก้ไขใบสมัคร', note: 'แก้หมายเหตุ', purge_story: 'ลบรูป Story' };
  function histLine(e, g) {
    var d = e.detail || {}, who = esc(e.by || ''), what;
    if (e.action === 'status') what = 'เปลี่ยนสถานะ ' + (ST_TH[d.from] || d.from) + ' → ' + (ST_TH[d.to] || d.to);
    else if (e.action === 'award') what = 'มอบสิทธิ์เรียน ' + esc(g.awarded_course_title || d.course || '') + ' (Birthday Giveaway 2569)';
    else what = ACT[e.action] || e.action;
    if (e.action === 'submit') return 'น้อง' + what;
    if (e.action === 'edit') return 'น้อง' + what;
    return who + ' ' + what;
  }
  function aModal(g) {
    A.cur = g;
    var full = g.approved_count >= g.seats && g.status !== 'approved';
    var seg = ['pending', 'review', 'approved', 'rejected'].map(function (s) {
      var dis = g.awarded ? s !== g.status : s === 'approved' && full;
      return '<button type="button" data-gvst="' + s + '" aria-pressed="' + (g.status === s) + '"' + (dis ? ' disabled' : '') + '>' + ST_TH[s] + '</button>';
    }).join('');
    var story = g.has_story ? '<div class="gv-story" id="gv-story">' + (A.stories[g.id] ? '<img src="' + A.stories[g.id] + '" alt="ภาพหน้าจอ Story">' : '<div class="gv-tx muted">กำลังโหลดรูป…</div>') + '</div>'
      : '<div class="gv-tx muted">' + (g.story_purged_at ? 'ลบรูป Story ของกิจกรรมนี้แล้ว' : 'ไม่มีรูป') + '</div>';
    openModal('<div class="mx"><div class="stack" style="gap:6px"><h2>' + esc(g.nickname || '—') + ' · ' + esc(g.name) + '</h2><span>' + stBadges(g) + '</span></div><button class="x" data-close="1" aria-label="ปิด">×</button></div>' +
      '<div class="gv-kv"><span>Instagram</span><a href="' + esc(g.ig_url) + '" target="_blank" rel="noopener">@' + esc(g.ig) + ' ↗</a>' +
      '<span>คอร์สที่เลือก</span><span class="gv-sj s-' + esc(g.subject) + '" style="color:var(--ink)"><i></i>' + esc(SUBJ[g.subject] || '') + ' · ' + esc(g.course_title) + '</span>' +
      '<span>ส่งเมื่อ</span><span style="color:var(--ink)">' + esc(stamp(g.created_at)) + '</span></div>' +
      (g.owns_chosen && !g.awarded ? '<div class="note wait">น้องมีสิทธิ์คอร์สนี้อยู่แล้ว (ได้มาหลังส่งใบสมัคร) ถ้าให้รางวัลต้องเปลี่ยนคอร์ส</div>' : '') +
      '<div class="gv-bk"><h4>ทำไมอยากเรียนคอร์สนี้</h4><div class="gv-tx">' + esc(g.reason) + '</div></div>' +
      '<div class="gv-bk"><h4>จะนำความรู้ไปใช้ทำอะไร</h4><div class="gv-tx">' + esc(g.goal) + '</div></div>' +
      '<div class="gv-bk"><h4>ภาพ Story</h4>' + story + '</div>' +
      '<label class="f">หมายเหตุพี่ๆ กรรมการ (น้องไม่เห็น)<textarea class="i" id="gv-note" style="min-height:70px">' + esc(g.admin_note) + '</textarea></label>' +
      '<div class="gv-bk"><h4>สถานะ</h4><div class="gv-seg">' + seg + '</div>' +
      (full && !g.awarded ? '<div class="note wait sm">ผ่านครบ ' + g.seats + ' คนแล้ว ต้องเปลี่ยนสถานะคนอื่นก่อนถึงให้ผ่านเพิ่มได้</div>' : '') +
      (g.awarded ? '<div class="sm muted">มอบสิทธิ์แล้ว เปลี่ยนสถานะไม่ได้ ถ้าต้องยกเลิกให้ทำที่หน้าสิทธิ์เข้าเรียน</div>' : '') + '</div>' +
      (g.status === 'approved' && !g.awarded ? '<div class="note plain spread"><span><b style="color:var(--ink)">มอบสิทธิ์เรียน</b><br><span class="sm">เพิ่มสิทธิ์เข้าบัญชีน้องทันที ไม่ผ่านระบบชำระเงิน ไม่นับเป็นรายรับ</span></span><button class="pill" data-gva="award">มอบสิทธิ์เรียน</button></div>' : '') +
      (g.awarded ? '<div class="note ok"><b>มอบสิทธิ์เรียนแล้ว</b><br>' + esc(g.awarded_course_title) + ' · โดย ' + esc(awardedBy(g)) + ' · ' + esc(stamp(g.awarded_at)) + '<br><span class="sm">สิทธิ์ที่ไม่นับเงิน · หมายเหตุ "Birthday Giveaway 2569"</span></div>' : '') +
      '<div class="gv-bk"><h4>ประวัติ</h4><ul class="gv-hist">' + g.events.slice().reverse().map(function (e) { return '<li><time>' + esc(stamp(e.at)) + '</time><span>' + histLine(e, g) + '</span></li>'; }).join('') + '</ul></div>', true);
    if (g.has_story && !A.stories[g.id]) call('admin.giveaway.story', { id: g.id }).then(function (s) {
      A.stories[g.id] = 'data:' + s.mime + ';base64,' + s.base64;
      var el = document.getElementById('gv-story'); if (el && A.cur && A.cur.id === g.id) el.innerHTML = '<img src="' + A.stories[g.id] + '" alt="ภาพหน้าจอ Story">';
    }, function (e) { var el = document.getElementById('gv-story'); if (el) el.innerHTML = '<div class="gv-tx muted">' + esc(e.message) + '</div>'; });
  }
  function awardedBy(g) { var e = g.events.filter(function (x) { return x.action === 'award'; }).pop(); return e ? e.by : ''; }
  function aOpen(id) { call('admin.giveaway.get', { id: id }).then(aModal, function (e) { toast(e.message, true); }); }
  function aAfter(g) {
    // keep the list in step without reloading everything
    if (A.data) {
      var x = A.data.items.filter(function (i) { return i.id === g.id; })[0];
      if (x) { x.status = g.status; x.status_label = g.status_label; x.awarded = g.awarded; x.awarded_course_title = g.awarded_course_title; }
      var it = A.data.items, k = A.data.kpi;
      ['pending', 'review', 'approved', 'rejected'].forEach(function (s) { k[s] = it.filter(function (i) { return i.status === s; }).length; });
      k.awarded = it.filter(function (i) { return i.awarded; }).length; A.pending = k.pending; badge();
      aDraw();
    }
    aModal(g);
  }
  function awardModal(g) {
    var owned = g.owned || [];
    loadStatus().then(function () {
      var cs = st.courses;
      openModal('<div class="mx"><h2>มอบสิทธิ์เรียนให้ ' + esc(g.nickname || g.name) + '</h2><button class="x" data-close="1" aria-label="ปิด">×</button></div>' +
        '<p class="ink2">ตรวจคอร์สก่อนกดยืนยัน ค่าเริ่มต้นคือคอร์สที่น้องเลือก</p>' +
        '<label class="f">คอร์ส<select class="i" id="gv-aw">' + cs.map(function (c) { var own = owned.indexOf(c.course_id) >= 0; return '<option value="' + esc(c.course_id) + '"' + (own ? ' disabled' : '') + (c.course_id === g.course_id && !own ? ' selected' : '') + '>' + esc(SUBJ[c.subject] || '') + ' · ' + esc(c.title) + (own ? ' (มีแล้ว)' : '') + '</option>'; }).join('') + '</select></label>' +
        '<div class="note plain sm">ประเภท: สิทธิ์ที่ไม่นับเงิน · ยอด ฿0<br>หมายเหตุ: Birthday Giveaway 2569<br>ไม่นับในรายรับและส่วนแบ่งผู้สอน · มอบได้ครั้งเดียวต่อใบสมัคร</div>' +
        (owned.indexOf(g.course_id) >= 0 ? '<div class="note wait sm">น้องมีสิทธิ์คอร์สนี้แล้ว เลือกคอร์สอื่น</div>' : '') +
        '<div class="rowx" style="justify-content:flex-end"><button class="pill quiet" data-gva="award-back">ยกเลิก</button><button class="pill" data-gva="award-ok">ยืนยันมอบสิทธิ์</button></div>');
    });
  }
  function csvModal() {
    openModal('<div class="mx"><h2>ดาวน์โหลด CSV</h2><button class="x" data-close="1" aria-label="ปิด">×</button></div>' +
      '<div class="note wait">ไฟล์มีข้อมูลส่วนตัวของน้อง (ชื่อ, IG, คำตอบ) ใช้คัดเลือกกิจกรรมนี้เท่านั้น ห้ามส่งต่อหรือโพสต์</div>' +
      '<div class="rowx" style="justify-content:flex-end"><button class="pill quiet" data-close="1">ยกเลิก</button><button class="pill" data-gva="csv-ok">เข้าใจแล้ว ดาวน์โหลด</button></div>');
  }
  function purgeModal() {
    openModal('<div class="mx"><h2>ลบรูป Story ของกิจกรรมนี้</h2><button class="x" data-close="1" aria-label="ปิด">×</button></div>' +
      '<div class="note wait">ลบรูป Story ทุกใบของกิจกรรมนี้ถาวร กู้คืนไม่ได้ ใบสมัครและคำตอบยังอยู่</div>' +
      '<label class="f">พิมพ์ ลบรูป เพื่อยืนยัน<input class="i" id="gv-purge-in" autocomplete="off"></label>' +
      '<div class="rowx" style="justify-content:flex-end"><button class="pill quiet" data-close="1">ยกเลิก</button><button class="pill" data-gva="purge-ok">ลบรูป</button></div>');
  }
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var inAdm = t.closest('#gvadm'), inMod = t.closest('#modal');
    if (!inAdm && !inMod) return;
    var o = t.closest('[data-gvopen]'); if (o && inAdm) { aOpen(o.getAttribute('data-gvopen')); return; }
    var tb = t.closest('[data-gvtab]'); if (tb && inAdm) { A.tab = tb.getAttribute('data-gvtab'); $$('[data-gvtab]', inAdm).forEach(function (x) { x.setAttribute('aria-pressed', String(x === tb)); }); aRefreshList(); return; }
    var sb = t.closest('[data-gvasub]'); if (sb && inAdm) { A.sub = sb.getAttribute('data-gvasub'); aRefreshList(); return; }
    var s = t.closest('[data-gvst]');
    if (s && inMod && A.cur && !s.disabled && s.getAttribute('aria-pressed') !== 'true') {
      $$('[data-gvst]', inMod).forEach(function (x) { x.disabled = true; });
      call('admin.giveaway.status', { id: A.cur.id, status: s.getAttribute('data-gvst') }).then(function (g) { toast('เปลี่ยนสถานะเป็น "' + ST_TH[g.status] + '" แล้ว'); aAfter(g); }, function (er) { toast(er.message, true); aOpen(A.cur.id); });
      return;
    }
    var b = t.closest('[data-gva]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-gva');
    if (a === 'reload') { A.data = null; A.err = ''; aLoad(); }
    else if (a === 'csv') csvModal();
    else if (a === 'csv-ok') {
      b.disabled = true;
      call('admin.giveaway.csv').then(function (d) {
        var link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([d.csv], { type: 'text/csv;charset=utf-8' }));
        link.download = 'ineedbio-birthday-giveaway-2569.csv'; document.body.appendChild(link); link.click();
        setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 500); closeModal();
      }, function (er) { b.disabled = false; toast(er.message, true); });
    }
    else if (a === 'award' && A.cur) awardModal(A.cur);
    else if (a === 'award-back' && A.cur) aModal(A.cur);
    else if (a === 'award-ok' && A.cur) {
      var sel = document.getElementById('gv-aw'); b.disabled = true;
      call('admin.giveaway.award', { id: A.cur.id, course_id: sel ? sel.value : '' }).then(function (g) { toast('มอบสิทธิ์เรียนแล้ว'); aAfter(g); }, function (er) { b.disabled = false; toast(er.message, true); });
    }
    else if (a === 'purge') purgeModal();
    else if (a === 'purge-ok') {
      var v = (document.getElementById('gv-purge-in') || {}).value || ''; b.disabled = true;
      call('admin.giveaway.purge', { confirm: v }).then(function (d) { closeModal(); toast('ลบรูป Story แล้ว ' + d.deleted + ' รูป'); A.stories = {}; A.data = null; aLoad(); }, function (er) { b.disabled = false; toast(er.message, true); });
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'gv-note' && A.cur) {
      var id = A.cur.id;
      call('admin.giveaway.note', { id: id, note: e.target.value }).then(function (g) { if (A.cur && A.cur.id === id) A.cur = g; toast('บันทึกหมายเหตุแล้ว'); }, function (er) { toast(er.message, true); });
    }
    if (e.target.id === 'gv-aw' && A.cur) {
      var own = (A.cur.owned || []).indexOf(e.target.value) >= 0, ok = $('[data-gva="award-ok"]'); if (ok) ok.disabled = own;
    }
  });
  document.addEventListener('input', function (e) {
    if (!(e.target.classList && e.target.classList.contains('gv-aq'))) return;
    A.q = e.target.value; aRefreshList();
  });

  /* ── start: watch #app (app.js redraws pages), the first boot, the clock ── */
  var sch = 0;
  function onMut() {
    if ($('#app .hdr')) booted = true;
    fixUrl();
    if (st && $('#bbd') && !$('#bbd .gv-bb')) homeBB(); // before the first paint: no flash of the course slide
    // app.js drew its page again while the campaign is showing (e.g. after loading something): put it back right away
    if (want() && $('#app main .w') && !$('#gv-root')) draw();
    clearTimeout(sch);
    sch = setTimeout(function () {
      if (st) decorate(); else if ($('#app .hdr')) loadStatus().catch(function () {});
      aMenu(); aPage();
    }, 0);
  }
  function start() {
    var app = document.getElementById('app');
    if (!app) { setTimeout(start, 30); return; }
    new MutationObserver(onMut).observe(app, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { if (!aHere()) { A.data = null; A.err = ''; } if (!want()) document.documentElement.classList.remove('gv-page'); onMut(); });
    tick = setInterval(clock, 1000);
    onMut();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

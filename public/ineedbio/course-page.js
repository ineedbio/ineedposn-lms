// Course page tweaks for public/ineedbio/app.js, which must stay byte-identical to the zip (CHECKSUMS.txt).
//  1) The free preview episode ("ดูฟรี") plays by itself on the course page: the first free episode goes in
//     the hero (or the trailer, when a course has no free episode), started muted so browsers — iOS Safari
//     included — allow it, with a "เปิดเสียง" button. Clicking another "ดูฟรี" starts that clip right away.
//  2) Episode counts and total video time ("12 ตอน · 13 ชม. 18 นาที") are removed from every public page:
//     home stats and featured carousel, course cards, course page (facts, syllabus, chapters, price box),
//     bundle page. The student's own progress (#/my, #/learn) and the admin pages keep them.
(function () {
  'use strict';

  /* ── 2) hide counts ── */
  var DUR = '\\d+ ชม\\.(?: \\d+ นาที)?|\\d+ นาที';
  var RE_EP = /^\d+ ตอน$/, RE_DUR = new RegExp('^(?:' + DUR + ')$');
  var RE_PAIR = new RegExp('^\\d+ ตอน · (?:' + DUR + ')$');           // "12 ตอน · 13 ชม. 18 นาที"
  var RE_FACT = new RegExp('^(?:\\d+ ตอน|(?:' + DUR + ') วิดีโอ)$'); // .facts pills
  var RE_INCL = new RegExp('คลิปเรียน \\d+ ตอน \\((?:' + DUR + ')\\)'); // price box "คลิปเรียน 120 ตอน (13 ชม.)"
  var RE_STAT = /^\d+(?:ตอน|ชั่วโมงคลิปเรียน)$/;                       // home hero stats

  function publicView() { return !/^#\/(admin|learn|my)\b/.test(location.hash); }
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function isSeg(s) { s = s.trim(); return RE_EP.test(s) || RE_DUR.test(s); }

  function stripCounts(root) {
    if (!root || root.nodeType !== 1 || !publicView()) return;
    var q = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)).concat(root.matches && root.matches(sel) ? [root] : []); };
    q('.facts > span').forEach(function (el) { if (RE_FACT.test(norm(el.textContent))) el.remove(); });
    q('.stat > div').forEach(function (el) { if (RE_STAT.test(norm(el.textContent).replace(/ /g, ''))) el.remove(); });
    q('span, small').forEach(function (el) { if (!el.children.length && RE_PAIR.test(norm(el.textContent))) el.remove(); });
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), t, list = [];
    while ((t = w.nextNode())) list.push(t);
    list.forEach(function (n) {
      var s = n.nodeValue;
      if (RE_INCL.test(s)) { n.nodeValue = s.replace(RE_INCL, 'คลิปเรียนวิดีโอ'); return; }
      if (s.indexOf(' · ') < 0) return;
      var parts = s.split(' · '), keep = parts.filter(function (p) { return !isSeg(p); });
      if (keep.length === parts.length) return;
      var out = keep.join(' · ');
      if (/ · $/.test(s) && out && !/ · $/.test(out)) out += ' · '; // "12 ตอน · 13 ชม. · " + <instructor>
      n.nodeValue = keep.length ? out : '';
    });
  }

  /* ── 1) autoplay the free preview ── */
  function ytSrc(id, extra) {
    return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&modestbranding=1&playsinline=1&enablejsapi=1' + extra + '&origin=' + encodeURIComponent(location.origin);
  }
  function cmd(frame, func) { try { frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*'); } catch (e) {} }
  function unmuteBtn(player) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ap-snd';
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg><span>แตะเพื่อเปิดเสียง</span>';
    b.onclick = function () {
      var f = player.querySelector('iframe');
      cmd(f, 'unMute'); cmd(f, 'playVideo');
      b.remove();
    };
    player.appendChild(b);
  }
  function autoplayHero() {
    if (!/^#\/course\//.test(location.hash)) return;
    var hero = document.querySelector('.chero');
    if (!hero || hero.dataset.ap) return;
    hero.dataset.ap = '1';
    var first = Array.prototype.filter.call(document.querySelectorAll('#sec-syllabus [data-preview], .chero [data-preview]'), function (x) { return x.dataset.preview; })[0];
    var trailer = hero.querySelector('.player.trailer iframe');
    if (first && first.dataset.preview) {
      var box = document.createElement('div');
      box.className = 'player trailer ap';
      box.innerHTML = '<iframe src="' + ytSrc(first.dataset.preview, '&autoplay=1&mute=1') + '" title="ตอนตัวอย่างฟรี" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
      var cap = document.createElement('p');
      cap.className = 'sm ink2 ap-cap';
      cap.textContent = 'ตอนตัวอย่างฟรี · ' + (first.dataset.title || '');
      var old = hero.querySelector('.player.trailer, .cover.trailer');
      if (old) old.replaceWith(box); else { var at = hero.querySelector('.facts') || hero.querySelector('h1'); at.parentNode.insertBefore(box, at.nextSibling); }
      box.parentNode.insertBefore(cap, box.nextSibling);
      var btn = hero.querySelector(':scope > [data-preview]'); if (btn) btn.remove(); // "▶ ดูตอนตัวอย่างฟรี" now plays inline
      unmuteBtn(box);
    } else if (trailer && !/autoplay=1/.test(trailer.src)) {
      var id = (trailer.src.match(/\/embed\/([^?]+)/) || [])[1];
      if (!id) return;
      trailer.src = ytSrc(decodeURIComponent(id), '&autoplay=1&mute=1');
      unmuteBtn(trailer.parentNode);
    }
  }
  // "ดูฟรี" buttons open app.js's modal player: start it at once, and pause the muted hero clip meanwhile.
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-preview]')) return;
    var h = document.querySelector('.player.trailer iframe'); if (h) cmd(h, 'pauseVideo');
    setTimeout(function () {
      var f = document.querySelector('#modal .player iframe');
      if (f && !/autoplay=1/.test(f.src)) f.src += '&autoplay=1';
    }, 0);
  }, true);

  var css = document.createElement('style');
  css.textContent = '.ap-snd{position:absolute;left:12px;bottom:12px;z-index:2;display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:7px 14px 7px 11px;font:500 13.5px/1.2 inherit;font-family:inherit;color:#fff;background:rgba(0,0,0,.72);cursor:pointer;backdrop-filter:blur(4px)}' +
    '.ap-snd:hover{background:rgba(0,0,0,.85)} .ap-cap{margin:6px 0 0}';
  document.head.appendChild(css);

  function run(nodes) {
    if (nodes) nodes.forEach(function (n) { stripCounts(n.nodeType === 3 ? n.parentNode : n); });
    autoplayHero();
  }
  function start() {
    new MutationObserver(function (ms) {
      var nodes = [];
      ms.forEach(function (m) {
        if (m.type === 'characterData') nodes.push(m.target);
        else Array.prototype.forEach.call(m.addedNodes, function (n) { nodes.push(n); });
      });
      run(nodes);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('hashchange', function () { stripCounts(document.getElementById('app')); });
    run([document.body]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// INeedBio — "รีวิวจากน้องๆ" on the home page (approved redesign). app.js renders the home page and must not be
// edited, so this script adds the section after "เรียนกับเราได้อะไร" each time the home page is drawn.
//  - Real reviews only: the ชีววิทยา สอวน. course reviews below (word for word) + the reviews saved with each
//    student's result in the database (results.list, every subject).
//  - Each card: the strongest line of the review as a serif headline (an exact excerpt), the rest below it
//    small, an initials avatar and a thin top border in the subject colour.
//  - A horizontal carousel of 8 (the first one a large pull-quote); "อ่านรีวิวทั้งหมด (N)" opens every review
//    in the previous grid layout, filterable by subject.
(function () {
  'use strict';

  // Reviews of ชีววิทยา สอวน. exactly as the students wrote them. name: '' = no name given (shown without a name).
  var FEATURED = { text: 'พี่ตั้งใจสอนมากๆ ผมไม่รู้จะขอบคุณพี่ยังไงแล้ว พี่สอนด้วยใจอะ ทำคอร์สมาเพื่อน้องจริงๆ สอนเข้าใจ สอนสนุก ผมไม่รู้จะรีวิวยังไงดี แต่รักพี่นะ', name: 'Mark' };
  var GROUPS = [
    ['เข้าใจง่ายแค่ไหน', [
      ['โอเคที่สุดเลยค่า พี่พร้อมสอนดีม้ากก แบบเข้าใจสุดๆ เรื่องไหนที่เคยเข้าใจยาก รู้สึกว่ามาเรียนแล้วเข้าใจง่ายม้ากๆ เนื้อหาคือแน่นครบ ละเอียดมาก คุ้มเกินราคามากค่ะ ทำคอร์สดีๆ ออกมาอีกนะคะ', ''],
      ['คือเรียนเนื้อหาแล้วรู้สึกเข้าใจชีวะเป็นครั้งแรกเลยครับ ตอนเรียนรู้สึกว่าพี่สอนเข้าใจง่ายมากๆ ครับ', '']]],
    ['น้องๆ ว่าไงกันบ้าง', [
      ['โอเคครับ เรียนแล้วเข้าใจครับ', ''],
      ['ก็โอเคเลยค่ะพี่ เนื้อหาที่เรียนเข้าใจดีมาก พี่สอนเข้าใจง่ายมากค่ะ', ''],
      ['Ok ครับ เนื้อหาสอนดี สอนเข้าใจมากๆ ครับ', ''],
      ['โอเคนะคับ เนื้อหาเข้าใจง่าย แถมสอนสนุกด้วยคับบ', ''],
      ['สนุกคับบ พี่สอนโอเคดี เข้าใจมาก', ''],
      ['พี่สอนดีมากค่ะ', '']]],
    ['เนื้อหากับชีทเป็นยังไง', [
      ['เนื้อหาดีม้ากกค่า เรียนเข้าใจสุ้ดๆ ชีทสวยอ่านง่ายย ชอบที่มีโจทย์ให้ทบทวนระหว่างบท คือช่วยได้มากจิงๆ พี่พร้อมสอนสนุก เข้าใจง่าย เปนกันเองมากก ไม่น่าเบื่อเลยย เปนคอร์สเรียนที่เริ่ดม้าก', ''],
      ['เอาจริงๆ ตอนนี้ยังเรียนไม่ครบ แต่รู้สึกว่าพี่สอนเข้าใจง่ายมากๆ ค่ะ อธิบายละเอียดดี ตอนเรียนแทบจะไม่มีคำถามในหัวเลย แล้วก็รู้สึกว่ามีแนวทางในการอ่านมากขึ้นเยอะเลยค่ะ', '']]],
    ['ละเอียดขนาดไหน', [
      ['พี่พร้อมสอนดีมาก สนุกมากก เป็นกันเองมากก แถมคอร์สราคาดี เนื้อหาละเอียด แอบมีบางทีเรียนไม่เข้าใจเลยต้องเรียนซ้ำ แต่เนื้อหาละเอียดจริงคับ ถ้าอันไหนเน้นพี่พร้อมบอกหมด บางเรื่องเข้าใจเพราะคอร์สพี่พร้อมเลย', 'why'],
      ['คอร์สพี่ดีมากก ละเอียด บอกจุดที่ออกเยอะมาก สอนวิธีการดูข้อสอบ ละก็คอร์สทำออกมาเพื่อคนขี้เกียจแบบหนู ในคอร์สพูดจาเป็นกันเองมาก ไม่เกร็ง สอนสนุก ขอบคุณค้าบ ได้ความรู้มาเยอะม้าก', 'ละพัด']]],
    ['เรียนแล้วสนุกยังไง', [
      ['คอร์สพี่ดีมาก สอนละเอียดชอบมากก คือเริ่ด เรียนแบบ active recall เรียนสลับกับบรรยายคือสนุก', 'แพตตี้'],
      ['อีกอย่างติวเตอร์พูดไปเรื่อยมากก ชอบ เพลิน ตลกดี', 'แพตตี้'],
      ['พี่พร้อมสอนดีคับ เป็นมิตรสุดๆ เลย เรียนแล้วไม่เครียดเลย ไปเรื่อยๆ สนุกๆ', 'สอง']]],
    ['เรียนแล้วรู้สึกยังไง', [
      ['โอเคมาก เรียนแล้วมีความสุขมากกที่สุดของที่สุด สอนไม่เบื่อเลยแบบเริสน้า รักชีวะขึ้นมา ถึงเนื้อหาจะโหดแต่เริส เรียนแล้วแบบได้รู้อะไรใหม่ๆ', ''],
      ['สนุกม้ากกก สอนดีม้ากก ราคาดี สอนเข้าใจม้ากก เป็นกันเองสุดๆ ขอบคุณพี่พร้อมที่ทำคอร์สดีๆ ขึ้นมา', 'P'],
      ['สอนดีสอนฟิน ไม่ได้เรียนก็เรียนย้อนหลังได้ เหมาะกับคนขี้เกียจ เริ่ดเลยล่ะ', '']]],
    ['คุ้มแค่ไหน', [
      ['คือเรียนสนุกมากกก แถมเป็นคอร์สที่ราคาดีมาก คือซื้อมาสามารถเรียนได้ทุกบทอ่ะ ไม่ได้ใช้แค่สอบ สอวน. ด้วยย แล้วเวลาเรียนที่ รร. ไม่ทันบทไหน ก็เปิดของพี่พร้อมมาเรียนล่วงหน้าแล้ว เกรดอัพมากก ได้ดีเพราะคอร์สพี่พร้อม', 'Pear'],
      ['โอเคค่ะ สอนละเอียดเข้าใจ แถมมีคลิปย้อนหลัง คุ้มราคาที่จ่ายไปมากค่ะ', ''],
      ['เนื้อหาดีม้ากกกก เข้าใจสุดๆ พี่พร้อมใส่ใจมากก คุ้มมากๆ สนุกก ไม่น่าเบื่ออเลยย', '']]],
    ['แล้วผลเป็นยังไง', [
      ['พี่สอนดีมั้กกๆ ทำให้คะแนนเก็บชีวะหนูท็อปห้อง สอบปลายภาคก็ได้เกือบเต็ม ตอนก่อนสอบ สอวน. ชีวะ หนูอาจจะเก็บเนื้อหาไม่ครบ แต่ก็ดีใจแล้ว เป็นปีแรกที่สอบชีวะด้วยย ร้ากกพี่ติวเตอร์', 'Gracee'],
      ['เรียนสนุก แต่ผมไม่ค่อยมีวินัยเลย เก็บไม่ค่อยทัน สนุกมากกับพี่พร้อม เวลาฟังไปก็มีสต๊อปบ้างเพราะเป็นคนหัวช้า แต่เรียนได้ลึกกว่าในโรงเรียนมากๆ ความสนุกมากสุดๆ', 'Tar']]],
    ['ถ้าไม่ถนัดชีวะล่ะ', [
      ['ผมเป็นคนที่เรียนพวกชีวะไม่เก่งเลย มาเรียนกับพี่เข้าใจง่ายดี บางช็อตพี่ก็มีมงมีมุขมาให้เล่นด้วยเพื่อไม่ให้เครียดเกินไป สนุกดีคับ เข้าใจง่าย ได้ศัพท์ชีวะเยอะมาก', ''],
      ['พี่สอนโอเคมากกก แต่พูดเร็วไปนิดนึง บางอันถ้ายังไม่รู้มาก่อนก็จะงงๆ หน่อย แต่โดยรวมโอเคเลยค่ะ', ''],
      ['โอเคเลยคับ เพราะเป็นเนื้อหา ม.4 ด้วย เลยได้ทวนไปด้วยเลย แต่แอบยากตรงเคมีอินทรีย์แรกๆ หน่อยเพราะไม่ค่อยถนัดเคมี', '']]],
    ['จากคลาสติวฟรี', [
      ['ดีม้ากก พี่พร้อมสอนเข้าใจง่าย เนื้อหาละเอียด ชอบที่มีเพิ่มเติมเข้ามาเสริมเรื่อยๆ เลย ชอบตั้งแต่คอร์สปูพื้นฐานฟรี เหมือนมีอะไรในหัวพี่พร้อมให้หมด ถือว่าเริ่ดๆ รอพี่พร้อมไลฟ์อีก รอบที่แล้วไม่ทันเสียใจมาก', ''],
      ['ขอบคุณพี่แล้วก็พี่ทีมงานมากๆ ครับ ติวฟรีที่สนุกมากๆ ครับ สอนดีครับ เข้าใจง่ายมากครับ', ''],
      ['ขอบคุณที่ช่วยติวฟรีครับ รู้สึกเข้าใจมากขึ้น', '']]],
    ['ฝากไว้ท้ายคลาส', [
      ['ขอบคุณมากนะคะที่ตั้งใจสอน ได้ความรู้จากพี่เยอะมากเลยค่ะ', ''],
      ['โอเคเลยค่ะ เข้าใจขึ้นเยอะมากๆ', ''],
      ['เรียนสนุก แบบหนูอ่านเรื่องนี้พอดี แล้วพี่ลงรายละเอียดดีมาก', ''],
      ['ดี ดี หนูจดไม่ทันรอบที่ 1', ''],
      ['คนสอนเรอ่ดแล้วค่ะ เดี๋ยวคนเรียนจะตามไปค่ะ', ''],
      ['อยากให้พี่เฉลยข้อสอบ สอวน. 69 ด้วยได้มั้ยครับ ตอนสอบเสร็จ', '']]],
  ];
  var SUBJ = { bio: 'ชีววิทยา', chem: 'เคมี', phys: 'ฟิสิกส์', math: 'คณิตศาสตร์' };
  var SHORT = { bio: 'ชว', chem: 'คม', phys: 'ฟส', math: 'คณ' };
  var COURSE_HREF = '#/course/bio-posn', API = window.INEEDBIO_API_URL || '/api/ib', CAROUSEL = 8;

  // ── the strongest line of a review, as an exact excerpt ──
  var GOOD = [['ครั้งแรก', 5], ['ท็อป', 5], ['เกือบเต็ม', 5], ['เกรด', 3], ['ด้วยใจ', 5], ['เพื่อน้อง', 4], ['เข้าใจ', 3], ['คุ้ม', 3], ['ละเอียด', 2], ['สนุก', 2], ['ไม่เบื่อ', 2],
    ['ไม่เครียด', 2], ['รัก', 2], ['ความสุข', 3], ['ชอบ', 1], ['ดีม', 2], ['ดีมาก', 2], ['เป็นกันเอง', 1], ['ลึก', 2], ['ติด', 2], ['ง่าย', 1]];
  var BAD = [['งง', 4], ['ยาก', 2], ['ไม่ทัน', 3], ['เร็วไป', 4], ['ไม่ค่อย', 3], ['ไม่ครบ', 3], ['ไม่เข้าใจ', 3], ['หัวช้า', 3], ['ไม่เก่ง', 1]];
  var WEAK_START = /^(แต่|ละก็|ละ|แล้วก็|แล้ว|แถม|คือ|ก็|อีกอย่าง|เพราะ)/;
  function score(s) {
    var v = 0;
    GOOD.forEach(function (k) { if (s.indexOf(k[0]) >= 0) v += k[1]; });
    BAD.forEach(function (k) { if (s.indexOf(k[0]) >= 0) v -= k[1]; });
    var n = s.length;
    v -= n < 14 ? (14 - n) / 2 : n > 64 ? (n - 64) / 6 : 0;
    if (WEAK_START.test(s)) v -= 2;
    return v;
  }
  function split(text) {
    var t = String(text || '').trim();
    if (t.length <= 58) return { h: t, rest: '' };
    var w = t.split(/\s+/), best = null;
    for (var i = 0; i < w.length; i++) for (var j = i; j < Math.min(w.length, i + 4); j++) {
      var s = w.slice(i, j + 1).join(' ');
      if (s.length > 80) break;
      var v = score(s);
      if (!best || v > best.v) best = { v: v, i: i, j: j, s: s };
    }
    var before = w.slice(0, best.i).join(' '), after = w.slice(best.j + 1).join(' ');
    return { h: best.s, rest: before && after ? before + ' … ' + after : before || after, v: best.v };
  }

  // ── data ──
  var BASE = [{ text: FEATURED.text, name: FEATURED.name, subject: 'bio', tag: 'ชีววิทยา สอวน.', featured: true }];
  GROUPS.forEach(function (g) { g[1].forEach(function (r) { BASE.push({ text: r[0], name: r[1], subject: 'bio', tag: 'ชีววิทยา สอวน.', topic: g[0] }); }); });
  BASE.forEach(function (r) { var x = split(r.text); r.h = x.h; r.rest = x.rest; r.v = score(x.h); });
  var fromDb = [], dbLoad = null;
  function loadDb() {
    if (!dbLoad) dbLoad = fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'results.list', data: {} }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        fromDb = (j && j.ok ? j.data : []).filter(function (r) { return r.review && SUBJ[r.subject]; }).map(function (r) {
          var x = split(r.review);
          return { text: r.review, name: r.nickname || '', subject: r.subject, tag: SUBJ[r.subject] + (r.year ? ' · ติดค่าย ' + r.year : ''), h: x.h, rest: x.rest, v: score(x.h) };
        });
      }).catch(function () { fromDb = []; });
    return dbLoad;
  }
  function everyone() { return BASE.slice(1).concat(fromDb); } // "all reviews" (the featured one is shown on top of the list)
  function carousel() {
    // The pull-quote, then the strongest review of each other subject, then the strongest ones left.
    var out = [BASE[0]], pool = BASE.slice(1).concat(fromDb).sort(function (a, b) { return b.v - a.v; });
    Object.keys(SUBJ).forEach(function (k) { if (k === 'bio') return; var r = pool.filter(function (x) { return x.subject === k; })[0]; if (r) out.push(r); });
    pool.forEach(function (r) { if (out.length < CAROUSEL && out.indexOf(r) < 0) out.push(r); });
    return out.slice(0, CAROUSEL);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function initials(r) {
    var n = (r.name || '').trim();
    if (!n) return SHORT[r.subject];
    if (/^[a-z]/i.test(n)) return n.charAt(0).toUpperCase();
    var m = n.replace(/[ัิ-ฺ็-๎]/g, '').match(/[ก-ฮ]/g) || [n.charAt(0)]; // first two consonants of a Thai name
    return m.slice(0, 2).join('');
  }
  function head(r) {
    return '<div class="ibrv-head"><span class="ibrv-av" aria-hidden="true">' + esc(initials(r)) + '</span><span class="ibrv-who"><b>' + esc(r.name || 'น้องในคอร์ส') + '</b><span>' + esc(r.tag) + '</span></span></div>';
  }
  function card(r, big) {
    return '<figure class="ibrv s-' + r.subject + (big ? ' big' : '') + '">' + (big ? '' : head(r)) +
      '<span class="ibrv-q" aria-hidden="true">“</span><blockquote><p class="ibrv-h">' + esc(r.h) + '</p>' + (r.rest ? '<p class="ibrv-rest">' + esc(r.rest) + '</p>' : '') + '</blockquote>' +
      (big ? head(r) : '') + '</figure>';
  }
  function legend(list) {
    var seen = {}; list.forEach(function (r) { seen[r.subject] = 1; });
    return '<div class="ibrv-legend">' + Object.keys(SUBJ).filter(function (k) { return seen[k]; }).map(function (k) { return '<span class="s-' + k + '"><i></i>' + SUBJ[k] + '</span>'; }).join('') + '</div>';
  }
  function sectionHtml() {
    var list = carousel(), total = everyone().length + 1;
    return '<div class="sec-h"><div><small>Reviews</small><h2>รีวิวจากน้องๆ</h2></div>' +
      '<div class="ibrv-nav"><button type="button" class="ibrv-arrow" data-rv-go="-1" aria-label="เลื่อนไปทางซ้าย">‹</button><button type="button" class="ibrv-arrow" data-rv-go="1" aria-label="เลื่อนไปทางขวา">›</button></div></div>' +
      legend(everyone()) +
      '<div class="ibrv-track" tabindex="0" aria-label="รีวิว เลื่อนดูได้">' + list.map(function (r, i) { return card(r, i === 0); }).join('') + '</div>' +
      '<div class="ibrv-more"><button type="button" class="pill ghost" data-rv-all>อ่านรีวิวทั้งหมด (' + total + ') →</button></div>' +
      '<div class="ibr-cta"><div><h3>อยากเข้าใจชีวะ แบบที่น้องๆ เล่าบ้างมั้ย</h3><p>คอร์ส สอวน. ชีววิทยา เรียนย้อนหลังได้ทุกบท</p></div>' +
      '<a class="pill" href="' + COURSE_HREF + '">ดูคอร์ส สอวน. ชีววิทยา</a></div>';
  }

  // ── every review: the previous grid, in a large modal, filterable by subject ──
  var filter = '';
  function allHtml() {
    var list = [BASE[0]].concat(everyone()), shown = filter ? list.filter(function (r) { return r.subject === filter; }) : list;
    var chip = function (k, label, n) { return '<button type="button" class="chip" data-rv-f="' + k + '" aria-pressed="' + (filter === k) + '">' + esc(label) + ' · ' + n + '</button>'; };
    return '<div class="ibr-chips">' + chip('', 'ทั้งหมด', list.length) + Object.keys(SUBJ).map(function (k) { var n = list.filter(function (r) { return r.subject === k; }).length; return n ? chip(k, SUBJ[k], n) : ''; }).join('') + '</div>' +
      '<div class="ibr-grid">' + shown.map(function (r) {
        return '<figure class="ibr-card s-' + r.subject + '"><p>' + esc(r.text) + '</p><figcaption>' + head(r) + '</figcaption></figure>';
      }).join('') + '</div>';
  }
  function openAll() {
    var m = document.getElementById('modal'); if (!m) return;
    filter = '';
    m.innerHTML = '<div class="scrim" data-close="1"><div class="modal wide ibrv-modal" role="dialog" aria-modal="true" aria-label="รีวิวทั้งหมด">' +
      '<div class="mx"><div class="stack" style="gap:4px"><h2>รีวิวทั้งหมดจากน้องๆ</h2><p class="ink2 sm">คำพูดจริงจากน้องที่เรียนกับ INeedBio ไม่ได้แก้สักคำ</p></div><button class="x" data-close="1" aria-label="ปิด">×</button></div>' +
      '<div data-rv-body>' + allHtml() + '</div></div></div>';
    m.querySelector('.ibrv-modal').addEventListener('click', function (e) {
      var f = e.target.closest('[data-rv-f]'); if (!f) return;
      filter = f.dataset.rvF; m.querySelector('[data-rv-body]').innerHTML = allHtml();
    });
  }

  var font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@500;600&display=swap';
  document.head.appendChild(font);
  var css = document.createElement('style');
  css.id = 'ibr-css';
  css.textContent =
    '.ibr{--serif:"Noto Serif Thai",Georgia,"Times New Roman",serif}' +
    '.ibr .sec-h{align-items:flex-end}' +
    '.ibrv-nav{display:flex;gap:8px} .ibrv-arrow{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0 0 3px}' +
    '.ibrv-arrow:hover{border-color:var(--ink)} @media (max-width:640px){.ibrv-nav{display:none}}' +
    '.ibrv-legend{display:flex;gap:14px;flex-wrap:wrap;margin:-4px 0 14px} .ibrv-legend span{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink2);font-weight:500}' +
    '.ibrv-legend i{width:9px;height:9px;border-radius:50%;background:var(--acc)}' +
    '.ibrv-track{display:flex;gap:14px;overflow-x:auto;padding:4px 2px 18px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scroll-padding-left:2px;outline:none;scrollbar-width:thin}' +
    '.ibrv-track::-webkit-scrollbar{height:6px} .ibrv-track::-webkit-scrollbar-thumb{background:var(--line);border-radius:99px}' +
    '.ibrv{scroll-snap-align:start;flex:none;width:272px;margin:0;background:var(--bg);border:1px solid var(--line);border-top:3px solid var(--acc);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:10px}' +
    '.ibrv.big{width:360px;padding:24px;justify-content:center;background:linear-gradient(180deg,var(--acc-soft),var(--bg) 70%)}' +
    '.ibrv blockquote{margin:0;display:grid;gap:8px}' +
    '.ibrv-q{font-family:var(--serif);font-size:40px;line-height:.55;color:var(--acc);opacity:.55;height:18px} .ibrv.big .ibrv-q{font-size:56px;height:24px}' +
    '.ibrv-h{margin:0;font-family:var(--serif);font-weight:500;font-size:17px;line-height:1.55;color:var(--ink);text-wrap:balance} .ibrv.big .ibrv-h{font-size:21px;font-weight:600}' +
    '.ibrv-rest{margin:0;font-size:13px;line-height:1.6;color:var(--ink2);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden} .ibrv.big .ibrv-rest{-webkit-line-clamp:5}' +
    '.ibrv-head{display:flex;align-items:center;gap:10px;min-width:0} .ibrv.big .ibrv-head{margin-top:6px}' +
    '.ibrv-av{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;background:var(--acc-soft);color:var(--acc);font-weight:700;font-size:12.5px;letter-spacing:.02em} .ibrv.big .ibrv-av{width:40px;height:40px;font-size:14px}' +
    '.ibrv-who{display:grid;min-width:0} .ibrv-who b{font-size:13.5px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .ibrv-who span{font-size:12px;color:var(--acc);font-weight:600}' +
    '.ibrv-more{display:flex;justify-content:center;margin:2px 0 4px}' +
    '.ibrv-modal .ibr-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 12px;scrollbar-width:none} .ibrv-modal .ibr-chips .chip{flex:0 0 auto;cursor:pointer;white-space:nowrap}' +
    '.ibr-grid{columns:3 260px;column-gap:14px}' +
    '.ibr-card{break-inside:avoid;margin:0 0 14px;border:1px solid var(--line);border-top:3px solid var(--acc);border-radius:16px;padding:16px 18px;background:var(--bg);display:grid;gap:12px}' +
    '.ibr-card p{margin:0;font-size:14.5px;line-height:1.7;color:var(--ink)}' +
    '.ibr-cta{margin-top:22px;border-radius:24px;padding:26px 28px;background:var(--inv);color:var(--inv-ink);display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap}' +
    '.ibr-cta h3{margin:0 0 4px;font-size:clamp(18px,2.4vw,22px);font-weight:800;letter-spacing:-.01em} .ibr-cta p{margin:0;opacity:.72;font-size:14.5px}' +
    '.ibr-cta .pill{padding:10px 22px;font-size:15px;white-space:nowrap}' +
    '@media (max-width:640px){.ibrv{width:236px}.ibrv.big{width:290px;padding:20px}.ibrv.big .ibrv-h{font-size:19px}.ibr-cta{padding:22px 20px}.ibr-cta .pill{width:100%}}';
  document.head.appendChild(css);

  function bind(sec) {
    sec.addEventListener('click', function (e) {
      var go = e.target.closest('[data-rv-go]');
      if (go) { var t = sec.querySelector('.ibrv-track'); t.scrollBy({ left: Number(go.dataset.rvGo) * Math.max(280, t.clientWidth * 0.8), behavior: 'smooth' }); return; }
      if (e.target.closest('[data-rv-all]')) openAll();
    });
  }
  function isHome() { var h = location.hash.replace(/^#/, ''); return h === '' || h === '/'; }
  /** Put the section after "เรียนกับเราได้อะไร" (before Contact) whenever app.js draws the home page. */
  function mount() {
    var app = document.getElementById('app');
    if (!app || !isHome() || app.querySelector('#ib-reviews')) return;
    // UI v1: after "เรียนกับเราได้อะไร" · UI v2: after the Hall of Fame (or before the perks strip)
    var why = app.querySelector('.why'), hof = app.querySelector('.hof'), prm = app.querySelector('.prm');
    var anchor = (why && why.closest('section')) || hof || (prm && prm.previousElementSibling);
    if (!anchor) return;
    var sec = document.createElement('section');
    sec.className = 'blk ibr';
    sec.id = 'ib-reviews';
    sec.setAttribute('aria-label', 'รีวิวจากน้องๆ');
    sec.innerHTML = sectionHtml();
    anchor.parentNode.insertBefore(sec, anchor.nextSibling);
    bind(sec);
  }
  function refresh() { var s = document.getElementById('ib-reviews'); if (s) { s.innerHTML = sectionHtml(); } }
  function start() {
    var app = document.getElementById('app');
    if (!app) return setTimeout(start, 50);
    new MutationObserver(mount).observe(app, { childList: true });
    window.addEventListener('hashchange', function () { setTimeout(mount, 0); });
    mount();
    loadDb().then(refresh);
  }
  start();
})();

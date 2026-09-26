// INeedBio — "รีวิวจากน้องๆ" on the home page (real reviews of the ชีววิทยา สอวน. course, word for word).
// app.js renders the home page and must not be edited, so this script adds the section after
// "เรียนกับเราได้อะไร" each time the home page is drawn. Styles use ineedbio.css tokens (light/dark).
(function () {
  'use strict';

  // Reviews exactly as the students wrote them. name: '' = no name given (shown without a name).
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
  var ALL = [];
  GROUPS.forEach(function (g, gi) { g[1].forEach(function (r) { ALL.push({ text: r[0], name: r[1], topic: g[0], g: gi }); }); });
  var FIRST = 9; // cards shown in "ทั้งหมด" before "ดูรีวิวทั้งหมด"
  var COURSE_HREF = '#/course/bio-posn';
  var state = { topic: -1, all: false };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var css = document.createElement('style');
  css.id = 'ibr-css';
  css.textContent =
    '.ibr .ibr-sub{margin:-6px 0 18px;color:var(--ink2);font-size:14.5px}' +
    '.ibr-feat{position:relative;border-radius:24px;padding:30px 30px 26px 30px;background:var(--acc-soft);margin-bottom:22px;overflow:hidden}' +
    '.ibr-feat:before{content:"\\201C";position:absolute;top:-18px;left:18px;font-size:120px;line-height:1;color:var(--acc);opacity:.18;font-family:Georgia,serif}' +
    '.ibr-feat q{display:block;quotes:none;font-size:clamp(18px,2.4vw,23px);line-height:1.6;font-weight:600;color:var(--ink);letter-spacing:-.01em;position:relative}' +
    '.ibr-feat q:before,.ibr-feat q:after{content:none}' +
    '.ibr-feat .ibr-who{margin-top:14px}' +
    '.ibr-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px;margin:0 -2px 8px;scrollbar-width:none}' +
    '.ibr-chips::-webkit-scrollbar{display:none}' +
    '.ibr-chips .chip{flex:0 0 auto;cursor:pointer;white-space:nowrap}' +
    '.ibr-grid{columns:3 280px;column-gap:14px}' +
    '.ibr-card{break-inside:avoid;margin:0 0 14px;border:1px solid var(--line);border-radius:18px;padding:18px 20px;background:var(--bg);display:grid;gap:12px}' +
    '.ibr-card p{margin:0;font-size:15px;line-height:1.7;color:var(--ink)}' +
    '.ibr-meta{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}' +
    '.ibr-who{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--ink)}' +
    '.ibr-who i{width:28px;height:28px;border-radius:50%;background:var(--acc);color:var(--on-acc);display:inline-grid;place-items:center;font-style:normal;font-size:12.5px;font-weight:700}' +
    '.ibr-who.anon{color:var(--muted);font-weight:500}' +
    '.ibr-who.anon i{background:var(--bg2);color:var(--muted)}' +
    '.ibr-topic{font-size:12px;color:var(--acc);background:var(--acc-soft);border-radius:999px;padding:3px 10px}' +
    '.ibr-more{display:flex;justify-content:center;margin-top:6px}' +
    '.ibr-cta{margin-top:22px;border-radius:24px;padding:26px 28px;background:var(--inv);color:var(--inv-ink);display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap}' +
    '.ibr-cta h3{margin:0 0 4px;font-size:clamp(18px,2.4vw,22px);font-weight:800;letter-spacing:-.01em}' +
    '.ibr-cta p{margin:0;opacity:.72;font-size:14.5px}' +
    '.ibr-cta .pill{padding:10px 22px;font-size:15px;white-space:nowrap}' +
    '@media (max-width:640px){.ibr-feat{padding:24px 20px 20px}.ibr-cta{padding:22px 20px}.ibr-cta .pill{width:100%}}';
  document.head.appendChild(css);

  function who(name) {
    return name
      ? '<span class="ibr-who"><i aria-hidden="true">' + esc(name.charAt(0).toUpperCase()) + '</i>' + esc(name) + '</span>'
      : '<span class="ibr-who anon"><i aria-hidden="true">✦</i>น้องในคอร์ส</span>';
  }
  function cards() {
    var list = state.topic < 0 ? ALL : ALL.filter(function (r) { return r.g === state.topic; });
    var shown = state.topic < 0 && !state.all ? list.slice(0, FIRST) : list;
    return '<div class="ibr-grid">' + shown.map(function (r) {
      return '<figure class="ibr-card"><p>' + esc(r.text) + '</p><figcaption class="ibr-meta">' + who(r.name) +
        (state.topic < 0 ? '<span class="ibr-topic">' + esc(r.topic) + '</span>' : '') + '</figcaption></figure>';
    }).join('') + '</div>' +
      (shown.length < list.length ? '<div class="ibr-more"><button class="pill ghost" type="button" data-ibr-more>ดูรีวิวทั้งหมด (' + list.length + ')</button></div>' : '');
  }
  function chips() {
    var b = function (i, label) { return '<button type="button" class="chip" data-ibr-t="' + i + '" aria-pressed="' + (state.topic === i) + '">' + esc(label) + '</button>'; };
    return '<div class="ibr-chips" role="group" aria-label="เลือกหัวข้อรีวิว">' + b(-1, 'ทั้งหมด · ' + ALL.length) + GROUPS.map(function (g, i) { return b(i, g[0]); }).join('') + '</div>';
  }
  function sectionHtml() {
    return '<div class="sec-h"><div><small>Reviews</small><h2>รีวิวจากน้องๆ</h2></div><a href="' + COURSE_HREF + '">คอร์ส สอวน. ชีววิทยา →</a></div>' +
      '<p class="ibr-sub">คำพูดจริงจากน้องที่เรียนคอร์ส สอวน. ชีววิทยา ไม่ได้แก้สักคำ</p>' +
      '<figure class="ibr-feat"><q>' + esc(FEATURED.text) + '</q><figcaption>' + who(FEATURED.name) + '</figcaption></figure>' +
      chips() + '<div data-ibr-list>' + cards() + '</div>' +
      '<div class="ibr-cta"><div><h3>อยากเข้าใจชีวะ แบบที่น้องๆ เล่าบ้างมั้ย</h3><p>คอร์ส สอวน. ชีววิทยา เรียนย้อนหลังได้ทุกบท</p></div>' +
      '<a class="pill" href="' + COURSE_HREF + '">ดูคอร์ส สอวน. ชีววิทยา</a></div>';
  }
  function bind(sec) {
    sec.addEventListener('click', function (e) {
      var t = e.target.closest('[data-ibr-t]'), more = e.target.closest('[data-ibr-more]');
      if (!t && !more) return;
      if (t) { state.topic = Number(t.dataset.ibrT); state.all = false; sec.querySelector('.ibr-chips').outerHTML = chips(); }
      if (more) state.all = true;
      sec.querySelector('[data-ibr-list]').innerHTML = cards();
    });
  }

  function isHome() { var h = location.hash.replace(/^#/, ''); return h === '' || h === '/'; }
  /** Put the section after "เรียนกับเราได้อะไร" (before Contact) whenever app.js draws the home page. */
  function mount() {
    var app = document.getElementById('app');
    if (!app || !isHome() || app.querySelector('#ib-reviews')) return;
    var why = app.querySelector('.why');
    var anchor = why && why.closest('section');
    if (!anchor) return;
    var sec = document.createElement('section');
    sec.className = 'blk ibr s-bio';
    sec.id = 'ib-reviews';
    sec.setAttribute('aria-label', 'รีวิวจากน้องๆ');
    sec.innerHTML = sectionHtml();
    anchor.parentNode.insertBefore(sec, anchor.nextSibling);
    bind(sec);
  }
  function start() {
    var app = document.getElementById('app');
    if (!app) return setTimeout(start, 50);
    new MutationObserver(mount).observe(app, { childList: true });
    window.addEventListener('hashchange', function () { setTimeout(mount, 0); });
    mount();
  }
  start();
})();

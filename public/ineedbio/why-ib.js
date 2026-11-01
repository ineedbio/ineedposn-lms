// "Why INeedBio" section on the course page (round 8a). An add-on like course-page.js: app.js stays byte-identical
// to the zip (CHECKSUMS.txt). On #/course/<id> for an id in WHY_IB_COURSES, once app.js has rendered the course page,
// the section goes in as the first section of the left column (.cd > div), right after nav.jump and before
// "จุดเด่นของคอร์ส". app.js renders the page again on every route change, so a MutationObserver on #app puts it
// back; it is never put in twice (.wib is checked first). Other pages and other courses are left as they are.
// Colours follow the site theme like ineedbio.css: light by default, dark with :root[data-theme="dark"] or the
// device's prefers-color-scheme when the theme button is on auto (no data-theme / not "light"). The cells colour
// themes are matched too (ct-scope / ct-forest / ct-nebula always dark, ct-petri / ct-reef / ct-gold / fe-christmas
// always light, as in ineedbio.css); the Halloween theme (fe-halloween / ct-spooky) already follows data-theme and
// the device, so it needs nothing extra.
// Layout uses a container query on the section (container: wib), so it follows the real column width.
// Font: Prompt 200/300/400 from Google Fonts, loaded once; Anuphan (already on the site) if it can't load.
(function () {
  'use strict';
  var WHY_IB_COURSES = ['170'];

  var HTML = `<section class="wib" aria-labelledby="wib-h">
  <div class="wib-top">
    <header class="wib-head">
      <p class="wib-kicker">INeedBio · ชีววิทยา สอวน. ค่าย 1</p>
      <h2 id="wib-h">Why INeedBio</h2>
      <p class="wib-sub">A Complete Biology Preparation</p>
      <p class="wib-vol">Vol . I – IV</p>
      <p class="wib-lead"><span>มากกว่าแค่การเรียนชีววิทยา</span> <span>คือการเตรียมความพร้อมสู่สนามสอบ สอวน.</span></p>
    </header>
    <div class="wib-art"><img src="/images/books/bio-posn-70-books.webp" alt="หนังสือ 4 เล่ม Genesis Natura Corpus Exercitium" loading="lazy"></div>
  </div>
  <ol class="wib-grid">
    <li class="wib-card" data-v="genesis"><span class="wib-n">01</span><p class="wib-tag">Complete Content</p><h3>เนื้อหาครบ จบตั้งแต่พื้นฐานจนถึงระดับ สอวน.</h3><p>ครอบคลุมเนื้อหาชีววิทยาตามหลักสูตร สสวท. ตั้งแต่พื้นฐานไปจนถึงเนื้อหาเชิงลึกที่จำเป็นสำหรับการสอบคัดเลือก สอวน. เรียบเรียงอย่างเป็นระบบ แม้ไม่มีพื้นฐานก็สามารถเริ่มต้นเรียนได้</p></li>
    <li class="wib-card" data-v="exercitium"><span class="wib-n">02</span><p class="wib-tag">Past Exam Collection</p><h3>ข้อสอบเก่าย้อนหลัง พร้อมเฉลยและวิธีคิด</h3><p>ฝึกฝนด้วยข้อสอบย้อนหลังตั้งแต่ปี 2560–2569 พร้อมเฉลยละเอียดและคำอธิบายแนวคิด ช่วยให้เข้าใจรูปแบบข้อสอบและพัฒนาทักษะการวิเคราะห์โจทย์</p></li>
    <li class="wib-card" data-v="corpus"><span class="wib-n">03</span><p class="wib-tag">Mock Exam</p><h3>จำลองสนามสอบจริง ก่อนลงสนามจริง</h3><p>Mock Exam จำนวน 2 ชุด ชุดละ 120 ข้อ พร้อมฝึกจับเวลาตามเงื่อนไขการสอบจริง เพื่อประเมินความพร้อม ฝึกบริหารเวลา และค้นหาจุดที่ต้องพัฒนา</p></li>
    <li class="wib-card" data-v="natura"><span class="wib-n">04</span><p class="wib-tag">Biology Drill</p><h3>ฝึกคิด วิเคราะห์ และคำนวณ ไม่ใช่แค่ท่องจำ</h3><p>แบบฝึกเฉพาะทางสำหรับการอ่านกราฟ ตาราง การแปลผลข้อมูล และการคำนวณทางชีววิทยา เพราะข้อสอบ สอวน. ไม่ได้วัดเพียงความจำ แต่ยังต้องอาศัยการประยุกต์ใช้ความรู้ด้วย</p></li>
    <li class="wib-card wib-wide wib-books" data-v="genesis"><div class="wib-txt"><span class="wib-n">05</span><p class="wib-tag">4 Books Collection</p><h3>หนังสือประกอบการเรียน 4 เล่ม ครบทั้งเนื้อหาและแบบฝึกหัด</h3><p>รวบรวมองค์ความรู้ ตารางเปรียบเทียบ แผนภาพ และแบบฝึกหัดไว้เป็นระบบ พร้อมพื้นที่สำหรับจดบันทึกและฝึกทำโจทย์ ช่วยให้การเรียนรู้และทบทวนมีประสิทธิภาพยิ่งขึ้น</p></div>
      <div class="wib-shelf"><figure><img src="/images/books/genesis.webp" alt="" loading="lazy"><figcaption>Genesis</figcaption></figure><figure><img src="/images/books/natura.webp" alt="" loading="lazy"><figcaption>Natura</figcaption></figure><figure><img src="/images/books/corpus.webp" alt="" loading="lazy"><figcaption>Corpus</figcaption></figure><figure><img src="/images/books/exercitium.webp" alt="" loading="lazy"><figcaption>Exercitium</figcaption></figure></div></li>
    <li class="wib-card" data-v="natura"><span class="wib-n">06</span><p class="wib-tag">Learn &amp; Practice</p><h3>เรียนจบแต่ละเรื่อง ฝึกทำโจทย์ได้ทันที</h3><p>มีโจทย์แนวข้อสอบ สอวน. แทรกอยู่ท้ายหัวข้อต่าง ๆ พร้อมเฉลยละเอียด อธิบายแนวคิดและวิธีคิด ช่วยให้สามารถนำความรู้ที่เพิ่งเรียนไปประยุกต์ใช้ได้ทันที</p></li>
    <li class="wib-card" data-v="corpus"><span class="wib-n">07</span><p class="wib-tag">Lifetime Access</p><h3>เรียนซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ</h3><p>ไม่ต้องกังวลว่าจะเรียนไม่ทัน สามารถแบ่งเวลาเรียนตามความพร้อม หยุดพัก และกลับมาทบทวนเนื้อหาได้ทุกเมื่อ แม้เรียนจบคอร์สไปแล้วก็ยังกลับมาเรียนซ้ำได้</p></li>
    <li class="wib-card wib-wide" data-v="exercitium"><div class="wib-txt"><span class="wib-n">08</span><p class="wib-tag">More Than POSN</p><h3>ไม่ได้เตรียมตัวแค่สอบ สอวน. แต่ต่อยอดได้ถึง <span class="wib-nw">A-Level</span></h3></div><p class="wib-body">เหมาะสำหรับน้องที่กำลังเตรียมสอบ สอวน. ชีววิทยา ค่าย 1 รวมถึงผู้ที่ต้องการปูพื้นฐาน ทบทวนเนื้อหาชีววิทยา และเตรียมความพร้อมสำหรับการสอบ <span class="wib-nw">A-Level</span> ในอนาคต</p></li>
  </ol>
  <p class="wib-sign">Pawat Satesathian · INeedBio</p>
</section>`;

  var CSS = `/* สีตามธีมเครื่อง: ค่าเริ่มต้น = สว่าง, มืดตาม prefers-color-scheme หรือปุ่มธีมของเว็บ (data-theme) */
.wib{--wib-ink:#151a2e;--wib-h:#1b2340;--wib-soft:rgba(21,26,46,.7);--wib-dim:rgba(21,26,46,.46);--wib-num:rgba(21,26,46,.32);
  --wib-edge:rgba(21,26,46,.09);--wib-base:#f6f4ef;--wib-g:.16;--wib-cardbase:#fbfaf7;--wib-cg:.2;
  --wib-t-genesis:#e2eafb;--wib-t-natura:#e0eee5;--wib-t-corpus:#f5e2e8;--wib-t-exercitium:#f3ebdb;
  --wib-k-genesis:30,92,196;--wib-k-natura:38,112,70;--wib-k-corpus:156,32,72;--wib-k-exercitium:150,108,36;--wib-shadow:rgba(21,26,46,.25)}
:root[data-theme="dark"] .wib{--wib-ink:#e4e6ee;--wib-h:#d5d8e2;--wib-soft:rgba(228,230,238,.68);--wib-dim:rgba(228,230,238,.42);--wib-num:rgba(228,230,238,.5);
  --wib-edge:rgba(255,255,255,.07);--wib-base:#08081a;--wib-g:.34;--wib-cardbase:#0b0c16;--wib-cg:.42;
  --wib-t-genesis:#0c1d55;--wib-t-natura:#10301f;--wib-t-corpus:#2c0c1c;--wib-t-exercitium:#2e2a2a;
  --wib-k-genesis:96,160,255;--wib-k-natura:104,196,138;--wib-k-corpus:236,92,138;--wib-k-exercitium:232,200,136;--wib-shadow:rgba(0,0,0,.8)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .wib{--wib-ink:#e4e6ee;--wib-h:#d5d8e2;--wib-soft:rgba(228,230,238,.68);--wib-dim:rgba(228,230,238,.42);--wib-num:rgba(228,230,238,.5);
  --wib-edge:rgba(255,255,255,.07);--wib-base:#08081a;--wib-g:.34;--wib-cardbase:#0b0c16;--wib-cg:.42;
  --wib-t-genesis:#0c1d55;--wib-t-natura:#10301f;--wib-t-corpus:#2c0c1c;--wib-t-exercitium:#2e2a2a;
  --wib-k-genesis:96,160,255;--wib-k-natura:104,196,138;--wib-k-corpus:236,92,138;--wib-k-exercitium:232,200,136;--wib-shadow:rgba(0,0,0,.8)}}
.wib{container:wib/inline-size;position:relative;isolation:isolate;overflow:hidden;border-radius:28px;color:var(--wib-ink);
  padding:clamp(24px,4vw,60px) clamp(16px,3.6vw,52px) clamp(24px,3vw,40px);
  font-family:Prompt,Anuphan,Tahoma,sans-serif;line-height:1.7;box-shadow:inset 0 0 0 1px var(--wib-edge);
  background:
    radial-gradient(60% 50% at 0% 0%,rgba(38,112,220,calc(var(--wib-g)*1.1)),transparent 70%),
    radial-gradient(45% 40% at 100% 8%,rgba(150,34,72,calc(var(--wib-g)*.9)),transparent 70%),
    radial-gradient(50% 40% at 0% 100%,rgba(40,120,80,calc(var(--wib-g)*.8)),transparent 70%),
    radial-gradient(45% 40% at 100% 100%,rgba(200,160,90,calc(var(--wib-g)*.7)),transparent 70%),
    var(--wib-base)}
.wib *{box-sizing:border-box}
.wib-top{display:grid;gap:clamp(18px,3vw,36px);align-items:center;margin-bottom:clamp(26px,4vw,48px)}
@container wib (min-width:820px){.wib-top{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)}}
.wib-kicker{margin:0 0 14px;font-size:13px;font-weight:400;letter-spacing:.06em;color:var(--wib-dim)}
.wib h2{margin:0;font-weight:200;font-size:clamp(44px,11cqi,92px);line-height:1;letter-spacing:-.015em;color:var(--wib-h)}
.wib-sub{margin:14px 0 4px;font-weight:300;font-size:clamp(18px,3.4cqi,26px);color:var(--wib-ink)}
.wib-vol{margin:0;font-weight:300;font-size:15px;letter-spacing:.06em;color:var(--wib-soft)}
.wib-lead{margin:22px 0 0;font-weight:300;font-size:clamp(15px,1.7vw,17px);color:var(--wib-soft)}
.wib-lead span{display:inline-block}
.wib-art{margin:0 -8px}
.wib-art img{display:block;width:100%;height:auto}
.wib-grid{list-style:none;margin:0;padding:0;display:grid;gap:14px;grid-template-columns:1fr}
@container wib (min-width:620px){.wib-grid{grid-template-columns:1fr 1fr;gap:18px}}
.wib-card{--k:var(--wib-k-genesis);--t:var(--wib-t-genesis);position:relative;overflow:hidden;isolation:isolate;border-radius:20px;
  padding:clamp(22px,2.6vw,30px) clamp(20px,2.4vw,30px) clamp(22px,2.6vw,28px);
  background:radial-gradient(90% 70% at 0% 0%,rgba(var(--k),var(--wib-cg)),transparent 62%),linear-gradient(165deg,var(--t) 0%,var(--wib-cardbase) 78%);
  box-shadow:inset 0 0 0 1px var(--wib-edge);transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s}
.wib-card[data-v=natura]{--k:var(--wib-k-natura);--t:var(--wib-t-natura)}
.wib-card[data-v=corpus]{--k:var(--wib-k-corpus);--t:var(--wib-t-corpus)}
.wib-card[data-v=exercitium]{--k:var(--wib-k-exercitium);--t:var(--wib-t-exercitium)}
.wib-card::after{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(70% 60% at 100% 100%,rgba(var(--k),.14),transparent 70%);opacity:0;transition:opacity .35s}
.wib-n{display:block;font-weight:200;font-size:clamp(48px,5.4vw,68px);line-height:1;letter-spacing:-.02em;color:var(--wib-num);margin-bottom:14px;transition:color .35s}
.wib-tag{margin:0 0 6px;font-size:12px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:rgb(var(--k))}
.wib h3{margin:0 0 10px;font-weight:400;font-size:clamp(17px,1.9vw,20px);line-height:1.5;color:var(--wib-ink)}
.wib-card p:not(.wib-tag){margin:0;font-weight:300;font-size:14.5px;color:var(--wib-soft)}
.wib-nw{white-space:nowrap}
@media (hover:hover){.wib-card:hover{transform:translateY(-4px);box-shadow:inset 0 0 0 1px rgba(var(--k),.55),0 24px 50px -28px rgba(var(--k),.7)}.wib-card:hover .wib-n{color:rgb(var(--k))}.wib-card:hover::after{opacity:1}}
.wib-shelf{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}
.wib-shelf figure{margin:0}
.wib-shelf img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:6px;box-shadow:0 10px 24px -12px var(--wib-shadow),0 0 0 1px var(--wib-edge);transition:transform .35s}
.wib-shelf figcaption{margin-top:6px;font-size:11px;font-weight:300;color:var(--wib-dim);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (hover:hover){.wib-books:hover .wib-shelf img{transform:translateY(-3px)}}
.wib-sign{margin:clamp(22px,3vw,34px) 0 0;text-align:center;font-weight:300;font-size:14px;letter-spacing:.04em;color:var(--wib-dim)}
.wib-txt>p:last-child{margin:0}
@container wib (min-width:620px){
  .wib-wide{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:clamp(24px,4vw,48px);align-items:end}
  .wib-wide .wib-shelf{margin-top:0}
  .wib-wide .wib-body{margin:0 0 4px}
}
/* ธีมสีจากเซลล์ (class ct-* บน <html>, app.js) ล็อกสีทั้งเว็บไม่สนปุ่มธีม: ให้ส่วนนี้ตามด้วย */
:root.ct-scope .wib,:root.ct-forest .wib,:root.ct-nebula .wib{--wib-ink:#e4e6ee;--wib-h:#d5d8e2;--wib-soft:rgba(228,230,238,.68);--wib-dim:rgba(228,230,238,.42);--wib-num:rgba(228,230,238,.5);
  --wib-edge:rgba(255,255,255,.07);--wib-base:#08081a;--wib-g:.34;--wib-cardbase:#0b0c16;--wib-cg:.42;
  --wib-t-genesis:#0c1d55;--wib-t-natura:#10301f;--wib-t-corpus:#2c0c1c;--wib-t-exercitium:#2e2a2a;
  --wib-k-genesis:96,160,255;--wib-k-natura:104,196,138;--wib-k-corpus:236,92,138;--wib-k-exercitium:232,200,136;--wib-shadow:rgba(0,0,0,.8)}
:root.ct-petri .wib,:root.ct-reef .wib,:root.ct-gold .wib,:root.fe-christmas .wib{--wib-ink:#151a2e;--wib-h:#1b2340;--wib-soft:rgba(21,26,46,.7);--wib-dim:rgba(21,26,46,.46);--wib-num:rgba(21,26,46,.32);
  --wib-edge:rgba(21,26,46,.09);--wib-base:#f6f4ef;--wib-g:.16;--wib-cardbase:#fbfaf7;--wib-cg:.2;
  --wib-t-genesis:#e2eafb;--wib-t-natura:#e0eee5;--wib-t-corpus:#f5e2e8;--wib-t-exercitium:#f3ebdb;
  --wib-k-genesis:30,92,196;--wib-k-natura:38,112,70;--wib-k-corpus:156,32,72;--wib-k-exercitium:150,108,36;--wib-shadow:rgba(21,26,46,.25)}`;

  function courseId() {
    var m = /^#\/course\/([^/?#]+)/.exec(location.hash || '');
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }
  function wanted() {
    var id = courseId();
    return id !== null && WHY_IB_COURSES.indexOf(String(id)) >= 0;
  }
  function once() {
    if (!document.getElementById('wib-css')) {
      var s = document.createElement('style'); s.id = 'wib-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    if (!document.getElementById('wib-font')) {
      var p = document.createElement('link'); p.rel = 'preconnect'; p.href = 'https://fonts.gstatic.com'; p.crossOrigin = '';
      var l = document.createElement('link'); l.id = 'wib-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Prompt:wght@200;300;400&display=swap';
      document.head.appendChild(p); document.head.appendChild(l);
    }
  }
  function run() {
    if (!wanted()) return;
    var app = document.getElementById('app'); if (!app || app.querySelector('.wib')) return;
    var col = app.querySelector('.cd > div'); if (!col) return;
    var jump = col.querySelector(':scope > nav.jump'); if (!jump) return;
    once();
    jump.insertAdjacentHTML('afterend', HTML);
  }

  var queued = false;
  function soon() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; run(); }); }
  function start() {
    var app = document.getElementById('app');
    if (!app) { setTimeout(start, 50); return; }
    new MutationObserver(soon).observe(app, { childList: true, subtree: true });
    window.addEventListener('hashchange', soon);
    run();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

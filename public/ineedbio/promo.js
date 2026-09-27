// Promo code INEEDWEB on every course page, next to the price (public/ineedbio/app.js stays untouched).
// The strip only shows when the code really works for that course right now (asked via cart.quote), so an
// expired or deleted code simply disappears. "คัดลอกโค้ด" copies it; once a visitor has seen a working code,
// the cart fills it in by itself (unless they took it out there).
(function () {
  'use strict';
  var CODE = 'INEEDWEB', API = window.INEEDBIO_API_URL || '/api/ib', cache = {};
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function baht(n) { return '฿' + Number(n || 0).toLocaleString('en-US'); }

  function quote(cid) {
    if (!cache[cid]) cache[cid] = fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'cart.quote', data: { course_ids: [cid], coupon: CODE } }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { return j && j.ok && j.data && j.data.coupon && j.data.coupon.ok ? j.data : null; })
      .catch(function () { delete cache[cid]; return null; });
    return cache[cid];
  }

  function coursePromo() {
    var m = /^#\/course\/([^/?]+)/.exec(location.hash); if (!m) return;
    var box = document.getElementById('sec-buy');
    if (!box || box.dataset.promo || !box.querySelector('#buy-act')) return; // only while the course can be bought
    box.dataset.promo = '1';
    var cid = decodeURIComponent(m[1]);
    quote(cid).then(function (q) {
      if (!q || !document.body.contains(box) || box.querySelector('.promo')) return;
      ss('ib_promo_ok', '1');
      var off = q.coupon.discount || 0;
      var el = document.createElement('div');
      el.className = 'promo';
      el.innerHTML = '<div class="promo-t"><span class="promo-tag">โค้ดส่วนลด</span><span>ใช้โค้ด <b class="promo-code">' + CODE + '</b> ลด ' + baht(off) + ' ทุกคอร์ส' +
        (q.total >= 0 ? ' <span class="promo-net">เหลือ ' + baht(q.total) + '</span>' : '') + '</span></div>' +
        '<button type="button" class="pill ghost s promo-copy">คัดลอกโค้ด</button>';
      el.querySelector('.promo-copy').onclick = function () {
        var b = this, done = function () { b.textContent = 'คัดลอกแล้ว ✓'; setTimeout(function () { b.textContent = 'คัดลอกโค้ด'; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CODE).then(done, fallback); else fallback();
        function fallback() { var t = document.createElement('textarea'); t.value = CODE; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); done(); }
      };
      var price = box.querySelector('.price');
      price.parentNode.insertBefore(el, price.nextSibling);
    });
  }

  // Cart: fill the code in once, unless the visitor removed it or typed another one.
  function cartPromo() {
    if (location.hash !== '#/cart' || ss('ib_promo_ok') !== '1' || ss('ib_promo_off') === '1') return;
    var f = document.getElementById('cpf'), inp = document.getElementById('cp-in');
    if (!f || !inp || f.dataset.promo || inp.readOnly || inp.value) return;
    f.dataset.promo = '1';
    inp.value = CODE;
    if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true }));
  }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#cp-rm')) ss('ib_promo_off', '1'); }, true);
  document.addEventListener('submit', function (e) { if (e.target && e.target.id === 'cpf' && e.isTrusted) { var v = (document.getElementById('cp-in') || {}).value || ''; if (v.trim().toUpperCase() !== CODE) ss('ib_promo_off', '1'); } }, true);

  var css = document.createElement('style');
  css.textContent = '.promo{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:10px 0 4px;padding:10px 12px;border-radius:12px;border:1px dashed var(--acc);background:var(--acc-soft);font-size:13.5px;color:var(--ink)}' +
    '.promo-t{display:flex;flex-direction:column;gap:2px;min-width:0} .promo-tag{font-size:11.5px;font-weight:600;color:var(--acc);letter-spacing:.02em}' +
    '.promo-code{font-family:var(--mono,ui-monospace,monospace);letter-spacing:.04em;color:var(--acc)} .promo-net{color:var(--ink2);white-space:nowrap}' +
    '.promo .promo-copy{flex:none}';
  document.head.appendChild(css);

  var t = 0;
  function run() { clearTimeout(t); t = setTimeout(function () { coursePromo(); cartPromo(); }, 30); }
  function start() { new MutationObserver(run).observe(document.getElementById('app') || document.body, { childList: true, subtree: true }); window.addEventListener('hashchange', run); run(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// Floating contact buttons (round 7x): app.js draws the Facebook button in .fab; this adds IG, LINE and email under
// it, same size and shape. Links come from config (contact_ig / contact_line / contact_email; empty = defaults).
// public/ineedbio/app.js stays untouched.
(function () {
  'use strict';
  var API = window.INEEDBIO_API_URL || '/api/ib';
  var C = { ig: 'ineedbio.official', line: 'https://lin.ee/t3jbjtN', email: 'ineedbio1803@gmail.com' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var ICON = {
    ig: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    line: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6.1C21.7 14.2 22 12.6 22 11c0-4.4-4.5-8-10-8zM8.3 13.4H6.4c-.3 0-.5-.2-.5-.5V9.1c0-.3.2-.5.5-.5s.5.2.5.5v3.3h1.4c.3 0 .5.2.5.5s-.2.5-.5.5zm2 -.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9.1c0-.3.2-.5.5-.5s.5.2.5.5zm4.6 0c0 .2-.1.4-.3.5h-.2c-.2 0-.3-.1-.4-.2l-2-2.6v2.3c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9.1c0-.2.1-.4.3-.5h.2c.2 0 .3.1.4.2l2 2.6V9.1c0-.3.2-.5.5-.5s.5.2.5.5zm3.1-2.4c.3 0 .5.2.5.5s-.2.5-.5.5h-1.4v.9h1.4c.3 0 .5.2.5.5s-.2.5-.5.5h-1.9c-.3 0-.5-.2-.5-.5V9.1c0-.3.2-.5.5-.5h1.9c.3 0 .5.2.5.5s-.2.5-.5.5h-1.4v.9z"/></svg>',
    mail: '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#4285f4" d="M3.6 20H6.9V12L2 8.4V18.4C2 19.3 2.7 20 3.6 20z"/><path fill="#34a853" d="M17.1 20h3.3c.9 0 1.6-.7 1.6-1.6V8.4L17.1 12z"/><path fill="#fbbc04" d="M17.1 5.5V12L22 8.4V6.4c0-1.8-2.1-2.9-3.6-1.8z"/><path fill="#ea4335" d="M6.9 12V5.5L12 9.3l5.1-3.8V12L12 15.8z"/><path fill="#c5221f" d="M2 6.4v2L6.9 12V5.5L5.6 4.6C4.1 3.5 2 4.6 2 6.4z"/></svg>'
  };
  function add() {
    var fb = document.querySelector('.fab a[href*="facebook.com"]');
    if (!fb || fb.parentNode.querySelector('.cfab')) return;
    var html =
      '<a class="ig cfab" href="https://www.instagram.com/' + esc(C.ig) + '" target="_blank" rel="noopener" title="Instagram @' + esc(C.ig) + '" aria-label="Instagram @' + esc(C.ig) + '">' + ICON.ig + '</a>' +
      '<a class="cfab" style="background:#06c755;color:#fff;border:0" href="' + esc(C.line) + '" target="_blank" rel="noopener" title="LINE" aria-label="LINE">' + ICON.line + '</a>' +
      '<a class="cfab" style="background:#fff;border:1px solid #e3e3e3" href="mailto:' + esc(C.email) + '" title="อีเมล ' + esc(C.email) + '" aria-label="อีเมล ' + esc(C.email) + '">' + ICON.mail + '</a>';
    fb.insertAdjacentHTML('afterend', html);
  }
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'config', data: {} }) })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      var d = (j && j.data) || {};
      if (d.contact_ig) C.ig = String(d.contact_ig).replace(/^@/, '');
      if (d.contact_line) C.line = d.contact_line;
      if (d.contact_email) C.email = d.contact_email;
      Array.prototype.forEach.call(document.querySelectorAll('.cfab'), function (x) { x.remove(); });
      add();
    }).catch(function () {});
  var t = 0;
  function start() {
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(add, 20); }).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
    add();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

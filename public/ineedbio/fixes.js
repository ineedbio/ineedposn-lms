// Fixes for public/ineedbio/app.js, which must stay byte-identical to the zip (CHECKSUMS.txt).
// Profile / sign-up photo: app.js opens its file picker with capture="user", which makes phones
// (iOS Safari, Android Chrome) open the front camera only, with no way to pick from the photo
// library. Drop that attribute on file inputs right before the picker opens.
(function () {
  'use strict';
  var click = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file' && this.hasAttribute('capture')) this.removeAttribute('capture');
    return click.apply(this, arguments);
  };

  // Video quality menu is gone (YouTube ignores vq / setPlaybackQuality). Forget the old choice (ib_q2 / ib_q) before
  // app.js reads it, so nobody stays on 360p or gets an oversized scaled iframe. Only these two keys are removed.
  try { localStorage.removeItem('ib_q2'); localStorage.removeItem('ib_q'); } catch (e) {}
})();

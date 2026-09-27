// Subject colours used across the whole site (cards, badges, course pages, reviews, admin):
// ชีววิทยา green · เคมี purple · ฟิสิกส์ red · คณิตศาสตร์ orange, a little brighter in dark mode.
// ineedbio.css must stay byte-identical (CHECKSUMS.txt), so this overrides its --c-* tokens. It runs before the
// page is drawn and uses html:root (one step more specific than the stylesheet's :root), so there's no flash.
(function () {
  var L = '--c-bio:#1f8a4c;--c-bio-soft:#e6f4ec;--c-chem:#8457c9;--c-chem-soft:#efe9fa;--c-phys:#d1483f;--c-phys-soft:#fbe9e7;--c-math:#e0883a;--c-math-soft:#fdf0e2;';
  var D = '--c-bio:#3fcf85;--c-bio-soft:#123423;--c-chem:#a687e0;--c-chem-soft:#241c33;--c-phys:#e57b73;--c-phys-soft:#331c1a;--c-math:#eda15c;--c-math-soft:#332210;';
  var s = document.createElement('style');
  s.id = 'ib-subject-colors';
  s.textContent = 'html:root{' + L + '}@media (prefers-color-scheme:dark){html:root:not([data-theme="light"]){' + D + '}}html:root[data-theme="dark"]{' + D + '}';
  (document.head || document.documentElement).appendChild(s);
})();

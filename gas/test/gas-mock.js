/* Minimal in-memory mock of the Apps Script services used by Code.gs.
   Used for local tests (node) and for the browser demo. */
(function (G) {
  function sha256Bytes(str) {
    var bytes = unescape(encodeURIComponent(str)).split('').map(function (c) { return c.charCodeAt(0); });
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l = bytes.length * 8; bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (var i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    var W = new Array(64);
    for (var o = 0; o < bytes.length; o += 64) {
      for (var t = 0; t < 16; t++) W[t] = (bytes[o+t*4] << 24) | (bytes[o+t*4+1] << 16) | (bytes[o+t*4+2] << 8) | bytes[o+t*4+3];
      for (t = 16; t < 64; t++) {
        var x = W[t-15], y = W[t-2];
        var s0 = ((x>>>7)|(x<<25)) ^ ((x>>>18)|(x<<14)) ^ (x>>>3);
        var s1 = ((y>>>17)|(y<<15)) ^ ((y>>>19)|(y<<13)) ^ (y>>>10);
        W[t] = (W[t-16] + s0 + W[t-7] + s1) | 0;
      }
      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (t = 0; t < 64; t++) {
        var S1 = ((e>>>6)|(e<<26)) ^ ((e>>>11)|(e<<21)) ^ ((e>>>25)|(e<<7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + W[t]) | 0;
        var S0 = ((a>>>2)|(a<<30)) ^ ((a>>>13)|(a<<19)) ^ ((a>>>22)|(a<<10));
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
      }
      H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
    }
    var out = [];
    H.forEach(function (v) { for (var i = 3; i >= 0; i--) { var bt = (v >>> (i * 8)) & 255; out.push(bt > 127 ? bt - 256 : bt); } });
    return out;
  }

  function Range(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype.getValues = function () {
    var out = [];
    for (var i = 0; i < this.nr; i++) { var row = []; for (var j = 0; j < this.nc; j++) { var R = this.sh.rows[this.r - 1 + i]; row.push(R && R[this.c - 1 + j] != null ? R[this.c - 1 + j] : ''); } out.push(row); }
    return out;
  };
  Range.prototype.setValues = function (v) {
    for (var i = 0; i < this.nr; i++) { var R = this.sh.rows[this.r - 1 + i] || (this.sh.rows[this.r - 1 + i] = []); for (var j = 0; j < this.nc; j++) R[this.c - 1 + j] = v[i][j]; }
    for (var k = 0; k < this.sh.rows.length; k++) if (!this.sh.rows[k]) this.sh.rows[k] = [];
    return this;
  };
  Range.prototype.clearContent = function () {
    for (var i = 0; i < this.nr; i++) { var R = this.sh.rows[this.r - 1 + i]; if (R) for (var j = 0; j < this.nc; j++) R[this.c - 1 + j] = ''; }
    return this;
  };
  ['setNumberFormat','setFontWeight','setBackground'].forEach(function (m) { Range.prototype[m] = function () { return this; }; });

  function Sheet(name) { this.name = name; this.rows = []; }
  Sheet.prototype.getName = function () { return this.name; };
  // เหมือน Sheets จริง: นับถึงแถวสุดท้ายที่มีข้อมูล (แถวที่ถูกล้างค่าไม่นับ)
  Sheet.prototype.getLastRow = function () {
    for (var i = this.rows.length - 1; i >= 0; i--) if ((this.rows[i] || []).some(function (v) { return v !== '' && v != null; })) return i + 1;
    return 0;
  };
  Sheet.prototype.getLastColumn = function () { return this.rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0); };
  Sheet.prototype.getMaxRows = function () { return Math.max(1000, this.rows.length); };
  Sheet.prototype.getRange = function (r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); };
  Sheet.prototype.getDataRange = function () { return new Range(this, 1, 1, Math.max(1, this.rows.length), Math.max(1, this.getLastColumn())); };
  Sheet.prototype.deleteRow = function (n) { this.rows.splice(n - 1, 1); };
  Sheet.prototype.setFrozenRows = function () {};

  function Spreadsheet(name) { this.name = name; this.sheets = [new Sheet('Sheet1')]; }
  Spreadsheet.prototype.getId = function () { return 'mock-sheet'; };
  Spreadsheet.prototype.getUrl = function () { return 'https://docs.google.com/spreadsheets/d/mock-sheet'; };
  Spreadsheet.prototype.getSheetByName = function (n) { return this.sheets.filter(function (s) { return s.name === n; })[0] || null; };
  Spreadsheet.prototype.insertSheet = function (n) { var s = new Sheet(n); this.sheets.push(s); return s; };
  Spreadsheet.prototype.getSheets = function () { return this.sheets.slice(); };
  Spreadsheet.prototype.deleteSheet = function (s) { this.sheets = this.sheets.filter(function (x) { return x !== s; }); };

  var DB = null, props = {}, cache = {}, files = {}, fileSeq = 0, trashed = {};
  var clock = { now: function () { return Date.now(); } };
  var outbox = [];

  G.SpreadsheetApp = {
    create: function (n) { DB = new Spreadsheet(n); return DB; },
    openById: function () { return DB; }
  };
  G.PropertiesService = { getScriptProperties: function () { return {
    getProperty: function (k) { return k in props ? props[k] : null; },
    setProperty: function (k, v) { props[k] = String(v); } }; } };
  G.CacheService = { getScriptCache: function () { return {
    get: function (k) { var e = cache[k]; if (!e) return null; if (e.exp < clock.now()) { delete cache[k]; return null; } return e.v; },
    put: function (k, v, ttl) { cache[k] = { v: String(v), exp: clock.now() + (ttl || 600) * 1000 }; },
    remove: function (k) { delete cache[k]; } }; } };
  G.LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
  G.MailApp = {
    sendEmail: function (o) { outbox.push(o); if (G.__onMail) G.__onMail(o); },
    getRemainingDailyQuota: function () { return 100 - outbox.length; }
  };
  G.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
    computeDigest: function (a, s) { return sha256Bytes(String(s)); },
    getUuid: function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); },
    base64Decode: function (b) { return { __b64: b }; },
    base64Encode: function (bytes) { return bytes.__b64; },
    newBlob: function (bytes, mime, name) { return { bytes: bytes, mime: mime, name: name }; }
  };
  G.DriveApp = {
    createFolder: function (n) { return { getId: function () { return 'mock-folder-' + n; } }; },
    getFolderById: function (fid) { return { createFile: function (blob) { var id = 'F' + (++fileSeq) + 'xxxxxxxxxxxx'; blob.folder = fid; files[id] = blob; return { getId: function () { return id; }, setSharing: function (a) { blob.sharing = a; } }; } }; },
    Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' }, Permission: { VIEW: 'VIEW' },
    getFileById: function (id) {
      var b = files[id];
      if (!b) throw new Error('File not found: ' + id);
      return { getBlob: function () { return { getContentType: function () { return b.mime; }, getBytes: function () { return b.bytes; } }; },
               setTrashed: function (v) { trashed[id] = !!v; } };
    }
  };
  G.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: function (s) { return { content: s, setMimeType: function () { return this; } }; } };
  G.ScriptApp = { getProjectTriggers: function () { return []; }, deleteTrigger: function () {}, newTrigger: function () { var b = { timeBased: function () { return b; }, everyDays: function () { return b; }, atHour: function () { return b; }, create: function () {} }; return b; } };
  G.__mock = { outbox: outbox, clock: clock, db: function () { return DB; }, cache: cache, files: files, trashed: trashed, props: props,
    call: function (payload) { return JSON.parse(G.doPost({ postData: { contents: JSON.stringify(payload) } }).content); } };
})(typeof globalThis !== 'undefined' ? globalThis : this);

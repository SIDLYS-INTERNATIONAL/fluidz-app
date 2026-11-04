/* Profile Name Search — stored data: model, migration from 2.x, backup file (format 1), local PIN hash.
   Pure functions on plain objects. The engine (content.js) reads and writes chrome.storage.local; nothing ever leaves this computer.

   chrome.storage.local keys
     pns_v3          settings, active search, folders, saved searches, local marks, journal lock   (this file)
     pns_journal_v1  scan journal                                                                    (journal.js)
     pns_state_v1    2.x settings. Read once to migrate, then left untouched (so going back to 2.2.1 still works).
     gnf_state_v3    Profile Hunter (1.x) settings. Same. */
(function (g) {
  'use strict';
  var C = g.PNS_CRIT || (typeof require === 'function' ? require('./criteria.js') : null);
  var JR = g.PNS_JOURNAL || (typeof require === 'function' ? require('./journal.js') : null);

  var KEYS = { STATE: 'pns_v3', JOURNAL: 'pns_journal_v1', OLD: 'pns_state_v1', OLDER: 'gnf_state_v3' };
  var FORMAT = 1, APP = 'profile-name-search', DEFAULT_FOLDER = 'f0';
  var CAPS = [10, 20, 30, 60, 120]; // scan time limit choices (minutes)

  function defaults() {
    return {
      schema: 3,
      settings: { lang: null, speed: 'gentle', pauseEach: true, outline: true, discreet: false, capMin: 30, favFilter: 'all', hideSeen: false,
        pos: null, collapsed: false, chatNoteDismissed: false, lastSide: false, welcomeDone: false, whatsNew: '' },
      q: C.emptyQuery(),
      folders: [{ id: DEFAULT_FOLDER, name: '', open: true }],
      searches: [],
      marks: {},
      lock: null,
      notice: ''
    };
  }
  var idn = 0;
  function newId(prefix) { idn = (idn + 1) % 1e6; return (prefix || 'x') + Date.now().toString(36) + idn.toString(36) + Math.random().toString(36).slice(2, 6) }

  /* ---------- sanitizing (stored data and imported files go through the same checks) ---------- */
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : '' }
  function cleanFolder(f) { if (!f || typeof f !== 'object' || !f.id) return null; return { id: str(String(f.id), 40), name: str(f.name, 40).trim(), open: f.open !== false } }
  function cleanSearch(s) {
    if (!s || typeof s !== 'object' || !s.id || !s.q || typeof s.q !== 'object') return null;
    var q = C.clean(s.q); if (C.isEmpty(q)) return null;
    return { id: str(String(s.id), 40), name: str(s.name, 60).trim() || C.shortText(q, null, 40), folder: str(String(s.folder || DEFAULT_FOLDER), 40), pinned: !!s.pinned, q: q, created: +s.created || 0, used: +s.used || 0 };
  }
  function cleanMark(id, m) {
    if (!m || typeof m !== 'object' || (m.m !== 'review' && m.m !== 'ignore')) return null;
    return { m: m.m, name: str(m.name, 80), thumb: /^https:\/\//.test(m.thumb || '') ? str(m.thumb, 400) : '', t: +m.t || 0 };
  }
  function sanitize(raw) {
    var d = defaults(), s = raw && typeof raw === 'object' ? raw : {}, st = s.settings && typeof s.settings === 'object' ? s.settings : {};
    var o = d.settings;
    if (typeof st.lang === 'string') o.lang = st.lang.slice(0, 5);
    o.speed = st.speed === 'fast' ? 'fast' : 'gentle';
    o.pauseEach = st.pauseEach !== false; o.outline = st.outline !== false; o.discreet = !!st.discreet;
    o.capMin = CAPS.indexOf(+st.capMin) >= 0 ? +st.capMin : 30;
    o.favFilter = ['all', 'fav', 'non'].indexOf(st.favFilter) >= 0 ? st.favFilter : 'all';
    o.hideSeen = !!st.hideSeen; o.collapsed = !!st.collapsed; o.chatNoteDismissed = !!st.chatNoteDismissed; o.lastSide = !!st.lastSide;
    o.welcomeDone = !!st.welcomeDone; o.whatsNew = str(st.whatsNew, 12);
    if (st.pos && typeof st.pos.left === 'string' && typeof st.pos.top === 'string') o.pos = { left: st.pos.left.slice(0, 12), top: st.pos.top.slice(0, 12) };
    d.q = C.clean(s.q);
    var folders = (Array.isArray(s.folders) ? s.folders : []).map(cleanFolder).filter(Boolean);
    if (!folders.some(function (f) { return f.id === DEFAULT_FOLDER })) folders.unshift({ id: DEFAULT_FOLDER, name: '', open: true });
    d.folders = folders.slice(0, 50);
    var fids = {}; d.folders.forEach(function (f) { fids[f.id] = 1 });
    d.searches = (Array.isArray(s.searches) ? s.searches : []).map(cleanSearch).filter(Boolean).map(function (x) { if (!fids[x.folder]) x.folder = DEFAULT_FOLDER; return x });
    if (s.marks && typeof s.marks === 'object') Object.keys(s.marks).slice(0, 2000).forEach(function (id) { var m = cleanMark(id, s.marks[id]); if (m) d.marks[id.slice(0, 300)] = m });
    if (s.lock && typeof s.lock.hash === 'string' && typeof s.lock.salt === 'string') d.lock = { hash: s.lock.hash.slice(0, 80), salt: s.lock.salt.slice(0, 40) };
    d.notice = s.notice === 'kept' ? 'kept' : '';
    return d;
  }

  /* ---------- migration ----------
     v3 present  -> use it.
     2.x present -> current chips become the active search, the (up to 3) saved searches go to the default folder,
                    every setting is kept, and the panel says "Your searches were kept". "What's new" shows once.
     1.x present -> same from Profile Hunter.
     nothing     -> fresh install: welcome tour, no "What's new". */
  function migrate(v3, v1, older, now) {
    if (v3 && typeof v3 === 'object' && v3.schema === 3) return { state: sanitize(v3), migrated: false, from: 'v3' };
    var d = defaults(), src = null, from = 'new';
    if (v1 && typeof v1 === 'object') { src = v1; from = 'v2' }
    else if (older && typeof older === 'object') {
      src = { groups: String(older.query || '').split(',').map(function (x) { return x.trim() }).filter(Boolean), favOnly: !!older.favOnly, saved: (older.quickFilters || []).slice(0, 3), welcomeDone: false };
      from = 'v1';
    }
    if (!src) { d.settings.whatsNew = '3.0.0'; return { state: d, migrated: false, from: from } }
    var o = d.settings;
    if (typeof src.lang === 'string') o.lang = src.lang;
    o.speed = src.speed === 'fast' ? 'fast' : 'gentle';
    o.pauseEach = src.pauseEach !== false;
    o.favFilter = ['all', 'fav', 'non'].indexOf(src.favFilter) >= 0 ? src.favFilter : (src.favOnly ? 'fav' : 'all');
    o.welcomeDone = !!src.welcomeDone; o.collapsed = !!src.collapsed; o.chatNoteDismissed = !!src.chatNoteDismissed; o.lastSide = !!src.lastSide;
    if (src.pos && typeof src.pos.left === 'string') o.pos = { left: src.pos.left, top: src.pos.top };
    o.whatsNew = o.welcomeDone ? '' : '3.0.0'; // someone who never finished the welcome gets the welcome, not "What's new"
    var chips = Array.isArray(src.groups) ? src.groups.map(String) : [];
    d.q = C.parse(chips.join(', ')).q;
    var saved = Array.isArray(src.saved) ? src.saved : [];
    saved.forEach(function (text, i) {
      var q = C.parse(String(text)).q; if (C.isEmpty(q)) return;
      d.searches.push({ id: 's-mig' + i, name: String(text).slice(0, 60), folder: DEFAULT_FOLDER, pinned: false, q: q, created: now, used: 0 });
    });
    if (d.searches.length || !C.isEmpty(d.q)) d.notice = 'kept';
    return { state: sanitize(d), migrated: true, from: from, count: d.searches.length };
  }

  /* ---------- backup file ---------- */
  // One JSON file with everything you made: saved searches + folders, local marks and the journal. Never the journal PIN.
  function makeBackup(state, journal, version, now) {
    return {
      app: APP, format: FORMAT, version: version, exported: new Date(now).toISOString(),
      folders: state.folders, searches: state.searches, marks: state.marks, journal: (journal && journal.scans) || []
    };
  }
  // Returns { ok: true, data } or { ok: false, err: 'json' | 'app' | 'newer' | 'shape' }.
  function readBackup(text) {
    var d;
    try { d = JSON.parse(String(text || '')) } catch (e) { return { ok: false, err: 'json' } }
    if (!d || typeof d !== 'object' || d.app !== APP) return { ok: false, err: 'app' };
    if (!Number.isInteger(d.format) || d.format < 1) return { ok: false, err: 'shape' };
    if (d.format > FORMAT) return { ok: false, err: 'newer' };
    if ((d.searches != null && !Array.isArray(d.searches)) || (d.folders != null && !Array.isArray(d.folders)) || (d.journal != null && !Array.isArray(d.journal)) || (d.marks != null && typeof d.marks !== 'object')) return { ok: false, err: 'shape' };
    return { ok: true, data: d };
  }
  /* Merges a backup into the current data without duplicates:
     folders match by id or name; a search is skipped if one with the same id, or the same name and the same criteria, exists;
     marks and journal scans are only added when missing. Nothing you have is overwritten. */
  function mergeBackup(state, journal, data, now) {
    var st = sanitize(state), added = { searches: 0, folders: 0, marks: 0, scans: 0 };
    var folderMap = {};
    (data.folders || []).map(cleanFolder).filter(Boolean).forEach(function (f) {
      var same = st.folders.filter(function (x) { return x.id === f.id || (f.name && x.name.toLowerCase() === f.name.toLowerCase()) })[0];
      if (same) { folderMap[f.id] = same.id; return }
      if (st.folders.length >= 50) { folderMap[f.id] = DEFAULT_FOLDER; return }
      var nf = { id: st.folders.some(function (x) { return x.id === f.id }) ? newId('f') : f.id, name: f.name, open: true };
      st.folders.push(nf); folderMap[f.id] = nf.id; added.folders++;
    });
    var ids = {}, keys = {};
    st.searches.forEach(function (s) { ids[s.id] = 1; keys[s.name.toLowerCase() + C.sig(s.q)] = 1 });
    (data.searches || []).map(cleanSearch).filter(Boolean).forEach(function (s) {
      var k = s.name.toLowerCase() + C.sig(s.q);
      if (ids[s.id] || keys[k]) return;
      s.folder = folderMap[s.folder] || DEFAULT_FOLDER; ids[s.id] = keys[k] = 1; st.searches.push(s); added.searches++;
    });
    if (data.marks && typeof data.marks === 'object') Object.keys(data.marks).forEach(function (id) {
      if (st.marks[id]) return; var m = cleanMark(id, data.marks[id]); if (m) { st.marks[id] = m; added.marks++ }
    });
    var j = JR.prune(journal || JR.empty(), now), have = {};
    j.scans.forEach(function (s) { have[s.id] = 1 });
    var incoming = (data.journal || []).map(JR.cleanScan).filter(function (s) { return s && !have[s.id] });
    var merged = JR.prune({ scans: j.scans.concat(incoming) }, now);
    var kept = {}; merged.scans.forEach(function (s) { kept[s.id] = 1 });
    added.scans = incoming.filter(function (s) { return kept[s.id] }).length;
    return { state: st, journal: merged, added: added };
  }

  /* ---------- journal PIN ----------
     A comfort lock, NOT encryption: it hides the journal in the panel, but the data stays readable by anyone who can open
     this Chrome profile's storage. Only a salted SHA-256 of the PIN is stored. Plain-JS SHA-256 so it works on any page. */
  function sha256(ascii) {
    function rr(v, n) { return (v >>> n) | (v << (32 - n)) }
    var K = [], H = [], primes = [], i, j, isP;
    for (i = 2; primes.length < 64; i++) { isP = true; for (j = 0; j < primes.length && primes[j] * primes[j] <= i; j++) if (i % primes[j] === 0) { isP = false; break } if (isP) primes.push(i) }
    for (i = 0; i < 64; i++) { K[i] = (Math.pow(primes[i], 1 / 3) * 4294967296) | 0; if (i < 8) H[i] = (Math.pow(primes[i], 1 / 2) * 4294967296) | 0 }
    var bytes = unescape(encodeURIComponent(ascii)), words = [], l = bytes.length * 8;
    for (i = 0; i < bytes.length; i++) words[i >> 2] |= bytes.charCodeAt(i) << ((3 - i % 4) * 8);
    words[l >> 5] |= 0x80 << (24 - l % 32);
    words[((l + 64 >> 9) << 4) + 15] = l;
    for (j = 0; j < words.length; j += 16) {
      var w = [], a = H.slice(0);
      for (i = 0; i < 64; i++) {
        if (i < 16) w[i] = words[j + i] | 0;
        else { var x = w[i - 15], y = w[i - 2]; w[i] = (w[i - 16] + (rr(x, 7) ^ rr(x, 18) ^ (x >>> 3)) + w[i - 7] + (rr(y, 17) ^ rr(y, 19) ^ (y >>> 10))) | 0 }
        var t1 = (a[7] + (rr(a[4], 6) ^ rr(a[4], 11) ^ rr(a[4], 25)) + ((a[4] & a[5]) ^ (~a[4] & a[6])) + K[i] + w[i]) | 0;
        var t2 = ((rr(a[0], 2) ^ rr(a[0], 13) ^ rr(a[0], 22)) + ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]))) | 0;
        a = [(t1 + t2) | 0].concat(a); a[4] = (a[4] + t1) | 0; a.length = 8;
      }
      for (i = 0; i < 8; i++) H[i] = (H[i] + a[i]) | 0;
    }
    return H.map(function (v) { return ('00000000' + (v >>> 0).toString(16)).slice(-8) }).join('');
  }
  function validPin(pin) { return /^\d{4,8}$/.test(String(pin || '')) }
  function makeLock(pin) { var salt = Math.random().toString(36).slice(2, 12); return { salt: salt, hash: sha256(salt + ':' + pin) } }
  function checkPin(lock, pin) { return !!lock && sha256(lock.salt + ':' + String(pin || '')) === lock.hash }

  var API = { KEYS: KEYS, FORMAT: FORMAT, APP: APP, DEFAULT_FOLDER: DEFAULT_FOLDER, CAPS: CAPS, defaults: defaults, newId: newId, sanitize: sanitize, migrate: migrate,
    makeBackup: makeBackup, readBackup: readBackup, mergeBackup: mergeBackup, sha256: sha256, validPin: validPin, makeLock: makeLock, checkPin: checkPin };
  g.PNS_STORE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

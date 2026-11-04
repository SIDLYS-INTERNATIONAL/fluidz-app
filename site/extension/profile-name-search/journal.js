/* Profile Name Search — scan journal (history of result lists), "already seen", comparison and "find again".
   Pure functions on plain objects; the engine (content.js) stores the journal in chrome.storage.local, on this computer only.

   Journal = { scans: [Scan] }   newest first, 20 scans at most, none older than 30 days
   Scan    = { id, t0, t1, q, qText, n, end, res: [Result] }
             t0/t1: start and last update (ms) · q: the query model · qText: readable query · n: profiles scanned
             end: 'running' | 'paused' | 'end' (end of grid) | 'cap' (time limit) | 'crash' (Grindr emptied) | 'stopped'
   Result  = { id, name, thumb, fav, t }   id is the stable thumbnail id ("img:<hex>") when Grindr gives one.
             thumb is the thumbnail link only (never the image itself). */
(function (g) {
  'use strict';

  var J = { MAX_SCANS: 20, MAX_AGE_MS: 30 * 24 * 3600 * 1000, MAX_RES: 500 };

  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim() }
  function empty() { return { scans: [] } }

  function cleanResult(r) {
    if (!r || typeof r !== 'object' || !r.id || !r.name) return null;
    return { id: String(r.id).slice(0, 300), name: String(r.name).slice(0, 80), thumb: typeof r.thumb === 'string' && /^https:\/\//.test(r.thumb) ? r.thumb.slice(0, 400) : '', fav: !!r.fav, t: +r.t || 0 };
  }
  function cleanScan(s) {
    if (!s || typeof s !== 'object' || !s.id || !+s.t0) return null;
    var res = (Array.isArray(s.res) ? s.res : []).map(cleanResult).filter(Boolean).slice(0, J.MAX_RES);
    var ends = ['running', 'paused', 'end', 'cap', 'crash', 'stopped'];
    return { id: String(s.id).slice(0, 40), t0: +s.t0, t1: +s.t1 || +s.t0, q: s.q && typeof s.q === 'object' ? s.q : { groups: [], exclude: [] }, qText: String(s.qText || '').slice(0, 200),
      n: Math.max(0, +s.n || 0), end: ends.indexOf(s.end) >= 0 ? s.end : 'stopped', res: res };
  }
  // Keeps the 20 newest scans of the last 30 days, newest first.
  function prune(j, now) {
    var list = (j && Array.isArray(j.scans) ? j.scans : []).map(cleanScan).filter(Boolean);
    var seen = {};
    list = list.filter(function (s) { if (seen[s.id]) return false; seen[s.id] = 1; return now - s.t1 <= J.MAX_AGE_MS });
    list.sort(function (a, b) { return b.t0 - a.t0 });
    return { scans: list.slice(0, J.MAX_SCANS) };
  }
  function newScan(id, q, qText, now) { return { id: id, t0: now, t1: now, q: q, qText: qText, n: 0, end: 'running', res: [] } }
  function find(j, id) { for (var i = 0; i < j.scans.length; i++) if (j.scans[i].id === id) return j.scans[i]; return null }

  // Adds new results to a scan (no duplicates). Returns how many were new. Name and favorite state follow the latest reading.
  function addResults(scan, entries, now) {
    var idx = {}, added = 0;
    scan.res.forEach(function (r, i) { idx[r.id] = i });
    entries.forEach(function (e) {
      var r = cleanResult({ id: e.id, name: e.name, thumb: e.thumb, fav: e.favorite === true || e.fav === true, t: now }); if (!r) return;
      if (idx[r.id] != null) { var ex = scan.res[idx[r.id]]; ex.name = r.name; ex.fav = r.fav; if (r.thumb) ex.thumb = r.thumb; return }
      if (scan.res.length >= J.MAX_RES) return;
      idx[r.id] = scan.res.length; scan.res.push(r); added++;
    });
    scan.t1 = now;
    return added;
  }

  // Profiles listed in any OTHER scan of the journal = "already seen".
  function seenIds(j, exceptId) {
    var s = new Set();
    (j.scans || []).forEach(function (sc) { if (sc.id !== exceptId) sc.res.forEach(function (r) { s.add(r.id) }) });
    return s;
  }

  // Same person in two lists: same thumbnail id first, otherwise same name (a weaker lead).
  function compare(a, b) {
    var aIds = {}, aNames = {}, bIds = {}, bNames = {};
    a.res.forEach(function (r) { aIds[r.id] = 1; aNames[norm(r.name)] = 1 });
    b.res.forEach(function (r) { bIds[r.id] = 1; bNames[norm(r.name)] = 1 });
    var added = b.res.filter(function (r) { return !aIds[r.id] && !aNames[norm(r.name)] });
    var gone = a.res.filter(function (r) { return !bIds[r.id] && !bNames[norm(r.name)] });
    return { added: added, gone: gone, both: b.res.length - added.length };
  }

  /* "Find again": look for a saved result among the profiles currently loaded on the grid.
     entries: iterable of { id, name, ... }. Returns { how: 'id' | 'name' | null, entry, others }.
     A name match is only a lead: names are not unique and can change. */
  function findAgain(result, entries) {
    var byName = [], n = norm(result.name);
    var list = Array.isArray(entries) ? entries : Array.from(entries);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === result.id) return { how: 'id', entry: list[i], others: 0 };
      if (n && norm(list[i].name) === n) byName.push(list[i]);
    }
    if (byName.length) return { how: 'name', entry: byName[0], others: byName.length - 1 };
    return { how: null, entry: null, others: 0 };
  }

  var API = { J: J, empty: empty, prune: prune, newScan: newScan, find: find, addResults: addResults, seenIds: seenIds, compare: compare, findAgain: findAgain, cleanScan: cleanScan };
  g.PNS_JOURNAL = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

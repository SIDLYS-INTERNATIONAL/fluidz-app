/* Profile Name Search — content script (engine + floating panel host).
   Everything runs locally in your browser: nothing is sent anywhere, and the extension never clicks, likes, favorites or
   messages for you. It only scrolls Grindr's grid, reads the names shown on it, and outlines the matches.
   Helpers: criteria.js (search model + syntax), journal.js (scan journal), store.js (stored data, backup), ui.js (panel). */
(function () {
  'use strict';
  if (window.__pnsInjected) return;
  window.__pnsInjected = true;

  var C = window.PNS_CRIT, JR = window.PNS_JOURNAL, ST = window.PNS_STORE;
  var VERSION = '3.0.1';
  var CFG = {
    LIST_CAP: 150,
    // Page-observer pacing (ms). Renders are throttled, never one per DOM mutation; slower while a scan is running.
    RENDER_IDLE_MS: 250, RENDER_RUN_MS: 500, RENDER_NOGRID_MS: 1000, FAV_REFRESH_MS: 2500, SCOPE_CHECK_MS: 3000,
    JOURNAL_SAVE_MS: 800,   // results are written to the journal continuously, at most this often
    CRASH_TICKS: 3,         // grid empty/gone on this many scan steps in a row = Grindr crashed or emptied the grid
    UNLOCK_MS: 10 * 60000,  // the journal locks itself again after 10 minutes
    TABS_RETRY_MS: 2000
  };
  // Scan pacing. "gentle" is the default: smaller steps, ~2-3 s between steps with random jitter, waits for Grindr to finish
  // loading before the next step, and takes a short cool-down break every ~120-150 new profiles. "fast" is the v2.0 pace.
  var PACE = {
    gentle: { step: 0.6, settle: 600, wait: 1900, jitter: 0.25, growWaitMax: 4500, growPoll: 300, stuckTicks: 3, stuckGrowthMs: 8000, breakMin: 120, breakMax: 150, breakMsMin: 8000, breakMsMax: 10000 },
    fast: { step: 0.85, settle: 550, tick: 700, slowTick: 1100, recentGrowthMs: 1500, stuckTicks: 5, stuckGrowthMs: 4000 }
  };

  var D = ST.defaults();            // stored data (settings, active search, folders, saved searches, marks, lock)
  var JN = JR.empty();              // scan journal
  var S = {
    draft: null,                    // text being typed in the search field (live preview), null when not typing
    counts: { all: 0, fav: 0, non: 0 }, newCount: 0, matches: [], current: -1, notified: new Set(), registry: new Map(), total: 0,
    showWelcome: false, welcomeStep: 1, closed: false, chatNote: false,
    breaking: false, breakBase: 0, breakAt: 135, statusKey: '', statusVars: null, countTimer: null, lastFavAt: 0,
    running: false, hasRun: false, scrollContainer: null, scrollTimer: null, note: null, end: null, lastGrowthAt: 0,
    scanId: null, runAcc: 0, runFrom: 0, crashTicks: 0,
    crash: null, interrupted: null, cap: false, otherTabs: 0, tabsOk: false, toast: null,
    unlockedAt: 0, openScan: null, cmp: null, preview: null, selftest: null, find: null,
    sideOpen: false, sideGrace: false, sideBye: false, sideHint: false
  };

  /* ---------- helpers ---------- */
  function T(k, v) { return window.PNS_T(D.settings.lang || 'en', k, v) }
  function allCells() { return Array.prototype.slice.call(document.querySelectorAll('div[role="gridcell"]')) }
  function rnd(a, b) { return a + Math.random() * (b - a) }
  function setCls(el, name, on) { if (el.classList.contains(name) !== on) el.classList.toggle(name, on) }
  function now() { return Date.now() }
  function findSearch(id) { for (var i = 0; i < D.searches.length; i++) if (D.searches[i].id === id) return D.searches[i]; return null }
  function nameOf(id) { var s = findSearch(id); return s ? s.name : '' }
  function resolveName(n) { n = C.norm(n).trim(); for (var i = 0; i < D.searches.length; i++) if (C.norm(D.searches[i].name).trim() === n) return D.searches[i].id; return null }

  /* ---------- the active search ---------- */
  // What is typed (live) wins over the committed search, so the grid reacts while you type.
  var cq = null, cqKey = '';
  function effQuery() { return S.draft != null ? C.parse(S.draft, resolveName).q : D.q }
  function compiled() {
    var key = (S.draft != null ? 'd:' + S.draft : 'q:' + JSON.stringify(D.q)) + '|' + D.searches.length + (D.searches.length ? D.searches[D.searches.length - 1].id : '') + searchesVer;
    if (key !== cqKey) { cqKey = key; cq = C.compile(effQuery(), function (id) { return findSearch(id) }) }
    return cq;
  }
  var searchesVer = 0; // bumped whenever saved searches change (their criteria can be reused by the active search)
  function hasQuery() { return compiled().active }

  function stableId(url) {
    if (!url) return '';
    var m = url.match(/([0-9a-fA-F]{20,})/);
    return m ? 'img:' + m[1] : 'src:' + url;
  }
  function readIdentity(cell) {
    var p = cell.querySelector('p'), pName = p && p.textContent ? p.textContent.trim() : '';
    var img = cell.querySelector('img'), thumb = img ? img.currentSrc || img.getAttribute('src') || '' : '';
    var name = pName;
    if (!name && img) name = (img.getAttribute('alt') || '').replace(/^photo of user\s*/i, '').trim();
    var better = stableId(thumb), existing = cell.dataset.gnfId || '', id = existing, upgradedFrom = null;
    if (better && (!existing || existing.indexOf('name:') === 0)) {
      if (existing && existing !== better && existing.indexOf('name:') === 0) upgradedFrom = existing;
      id = better; cell.dataset.gnfId = id;
    } else if (!id && name) { id = 'name:' + name; cell.dataset.gnfId = id }
    return { id: id, name: name, thumb: thumb, upgradedFrom: upgradedFrom };
  }
  // A favorited card renders an extra 5-point star <svg> (path starts "M8,1L5.7,5.6"). Matching on the path data
  // survives Grindr's class-name changes; if Grindr redraws the icon this hint needs updating (the grid self-test in ⚙ shows it).
  var STAR = 'M8,1L5.7,5.6';
  function readFav(cell) {
    var paths = cell.querySelectorAll('svg path');
    for (var i = 0; i < paths.length; i++) { if ((paths[i].getAttribute('d') || '').indexOf(STAR) === 0) return true }
    return false;
  }
  function findScroller() {
    var cells = document.querySelectorAll('div[role="gridcell"]');
    for (var i = 0; i < cells.length && i < 6; i++) { // the first few cards share the same scroller; no need to walk thousands
      var el = cells[i].parentElement, depth = 0;
      while (el && depth < 10) {
        var st = getComputedStyle(el);
        if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) return el;
        el = el.parentElement; depth++;
      }
    }
    return null;
  }

  /* ---------- "already seen" (profiles listed in another scan of the journal) ---------- */
  var seen = new Set(), seenKey = '';
  function seenSet() {
    var key = S.scanId + '|' + JN.scans.map(function (s) { return s.id + ':' + s.res.length }).join(',');
    if (key !== seenKey) { seenKey = key; seen = JR.seenIds(JN, S.scanId) }
    return seen;
  }

  /* ---------- registry + matching ---------- */
  // Tabs All / Favorites / Not favorites filter everything (results list, grid outline, pauses, Previous/Next), and so do
  // "hide already seen" and the local "Ignore" mark. With no search typed, only the Favorites tab lists something.
  var lastBase = [];
  function computeMatches() {
    var c = compiled(), hasName = c.active, f = D.settings.favFilter, sn = seenSet(), marks = D.marks;
    var all = Array.from(S.registry.values());
    var base = hasName ? all.filter(function (e) { return c.testNorm(C.norm(e.name)) }) : (f === 'fav' ? all : []);
    lastBase = hasName ? base : [];
    var visible = base.filter(function (e) { return !(marks[e.id] && marks[e.id].m === 'ignore') && !(D.settings.hideSeen && sn.has(e.id)) });
    var nFav = 0; visible.forEach(function (e) { if (e.favorite === true) nFav++ });
    S.counts = hasName ? { all: visible.length, fav: nFav, non: visible.length - nFav } : { all: 0, fav: nFav, non: 0 };
    S.newCount = hasName && JN.scans.some(function (s) { return s.id !== S.scanId }) ? base.filter(function (e) { return !sn.has(e.id) }).length : -1;
    if (f === 'fav') return visible.filter(function (e) { return e.favorite === true });
    if (f === 'non') return visible.filter(function (e) { return e.favorite !== true });
    return visible;
  }
  function countFor(q) { // live preview of the search editor, on the profiles loaded so far
    var c = C.compile(q, function (id) { return findSearch(id) }); if (!c.active) return 0;
    var n = 0; S.registry.forEach(function (e) { if (c.testNorm(C.norm(e.name))) n++ }); return n;
  }

  // Where this card sits in the scrollable grid, so we can scroll back to it if Grindr unloads it later.
  function yOf(cell) {
    var c = S.scrollContainer && S.scrollContainer.isConnected ? S.scrollContainer : (S.scrollContainer = findScroller());
    if (!c) return null;
    return cell.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop;
  }

  function render() {
    var cells = allCells(), grew = false, t = now();
    // While a scan runs, only re-read the "favorite" star on every card every couple of seconds (new cards are always read).
    var favNow = !S.running || t - S.lastFavAt > CFG.FAV_REFRESH_MS; if (favNow) S.lastFavAt = t;
    S.total = cells.length;
    cells.forEach(function (cell) {
      var r = readIdentity(cell); if (!r.id || !r.name) return;
      if (r.upgradedFrom && S.registry.has(r.upgradedFrom)) S.registry.delete(r.upgradedFrom);
      var ex = S.registry.get(r.id);
      if (!ex) { S.registry.set(r.id, { id: r.id, name: r.name, thumb: r.thumb, cell: cell, favorite: readFav(cell), y: yOf(cell) }); grew = true }
      else { ex.name = r.name; if (r.thumb) ex.thumb = r.thumb; ex.cell = cell; if (favNow) ex.favorite = readFav(cell) }
    });
    if (grew) S.lastGrowthAt = now();

    var matches = computeMatches(); S.matches = matches;
    if (S.current >= matches.length) S.current = matches.length - 1;
    var ids = new Set(matches.map(function (m) { return m.id })), q = hasQuery() || D.settings.favFilter === 'fav';
    cells.forEach(function (cell) { // only touch a card's classes when they actually change (no needless style work on Grindr's page)
      var id = cell.dataset.gnfId, isMatch = q && !!id && ids.has(id);
      setCls(cell, 'gnf-hidden', false); setCls(cell, 'gnf-match', isMatch); setCls(cell, 'gnf-dim', q && !isMatch);
    });

    // Every match of a running scan goes to the journal right away (continuous autosave).
    if (S.running && S.scanId) { var sc = JR.find(JN, S.scanId); if (sc) { sc.n = S.registry.size; if (JR.addResults(sc, lastBase, now()) || t - sc.t1 > 5000) saveJournalSoon() } }

    // "Pause at each new match" (user's choice, on by default): stop and tell the user, never act on the profile.
    if (S.running && D.settings.pauseEach) {
      var fresh = matches.filter(function (m) { return !S.notified.has(m.id) });
      if (fresh.length) {
        fresh.forEach(function (m) { S.notified.add(m.id) });
        var latest = fresh[fresh.length - 1];
        stopScroll('paused'); S.note = { id: latest.id, name: latest.name, thumb: latest.thumb };
      }
    } else if (S.running) matches.forEach(function (m) { S.notified.add(m.id) });
    publish();
  }
  // Throttled (not trailing-debounced): at most one render per window, even while Grindr keeps mutating the page.
  var debounce = null, observer = null, obsTarget = null, scopeTimer = null;
  function renderDelay() { return S.running ? CFG.RENDER_RUN_MS : (obsTarget && obsTarget !== document.body ? CFG.RENDER_IDLE_MS : CFG.RENDER_NOGRID_MS) }
  function scheduleRender() { if (debounce || S.closed && !S.sideOpen) return; debounce = setTimeout(function () { debounce = null; render() }, renderDelay()) }
  // Watch only the grid's scroll container when we can find it (chat, menus, etc. are then ignored); otherwise fall back to <body>.
  function observeTarget(el) {
    if (observer) observer.disconnect();
    obsTarget = el || document.body;
    observer = new MutationObserver(scheduleRender);
    observer.observe(obsTarget, { childList: true, subtree: true, characterData: !!el });
  }
  function checkScope() {
    if (!observer) return;
    var onGrid = obsTarget && obsTarget !== document.body;
    if (onGrid && obsTarget.isConnected) return;
    var el = findScroller(); // grid appeared (still on <body>) or Grindr replaced its scroller
    if (el) { S.scrollContainer = el; observeTarget(el); scheduleRender() } else if (onGrid) observeTarget(null);
  }
  function startObserving() {
    var el = S.scrollContainer && S.scrollContainer.isConnected ? S.scrollContainer : findScroller();
    if (el) S.scrollContainer = el;
    observeTarget(el);
    if (!scopeTimer) scopeTimer = setInterval(checkScope, CFG.SCOPE_CHECK_MS);
  }
  function stopObserving() {
    if (observer) observer.disconnect(); observer = null; obsTarget = null;
    if (scopeTimer) clearInterval(scopeTimer); scopeTimer = null;
    if (debounce) clearTimeout(debounce); debounce = null;
  }
  // Coral outline on the grid's matches: on by default, can be switched off in ⚙ (the dimming of other cards stays).
  function applyOutline() { setCls(document.documentElement, 'pns-no-outline', !D.settings.outline) }

  /* ---------- scan journal ---------- */
  var jTimer = null;
  function saveJournalSoon() { if (!jTimer) jTimer = setTimeout(saveJournalNow, CFG.JOURNAL_SAVE_MS) }
  function saveJournalNow() {
    if (jTimer) clearTimeout(jTimer); jTimer = null;
    if (!hasStore()) return;
    try { var o = {}; o[ST.KEYS.JOURNAL] = JN; chrome.storage.local.set(o) } catch (e) { /* extension reloaded */ }
  }
  function setScanEnd(end) { var sc = S.scanId && JR.find(JN, S.scanId); if (sc) { sc.end = end; sc.t1 = now(); sc.n = Math.max(sc.n, S.registry.size); saveJournalNow() } }
  // A scan of the same search continues its journal entry (after a pause, a crash, a time limit); a new search starts a new entry.
  function openScanEntry() {
    if (!hasQuery()) { S.scanId = null; return }
    var q = C.clone(effQuery()), cur = S.scanId && JR.find(JN, S.scanId);
    if (cur && cur.end !== 'end' && C.sig(cur.q) === C.sig(q)) { cur.end = 'running'; saveJournalNow(); return }
    var sc = JR.newScan(ST.newId('j'), q, C.shortText(q, nameOf, 120), now());
    JN.scans.unshift(sc); JN = JR.prune(JN, now()); S.scanId = sc.id; S.runAcc = 0;
    JR.addResults(sc, lastBase, now()); saveJournalNow();
  }
  function closeScanEntry() { if (S.scanId) { var sc = JR.find(JN, S.scanId); if (sc && (sc.end === 'running' || sc.end === 'paused')) setScanEnd('stopped') } S.scanId = null; S.runAcc = 0 }
  function unlocked() { return !D.lock || (S.unlockedAt && now() - S.unlockedAt < CFG.UNLOCK_MS) }

  /* ---------- auto-scroll ---------- */
  function pace() { return PACE[D.settings.speed] || PACE.gentle }
  function jit(ms, j) { return ms * (1 + (Math.random() * 2 - 1) * j) }
  function resetBreakCounter() { S.breakBase = S.registry.size; S.breakAt = Math.round(rnd(PACE.gentle.breakMin, PACE.gentle.breakMax)) }
  function clearCount() { if (S.countTimer) clearInterval(S.countTimer); S.countTimer = null; if (S.breaking) { S.breaking = false; if (S.statusKey === 'breakStatus') { S.statusKey = ''; S.statusVars = null } } }
  function capMs() { return D.settings.capMin * 60000 }
  function ranMs() { return S.runAcc + (S.running ? now() - S.runFrom : 0) }

  // Cool-down: stop scrolling for ~8-10 s with a visible countdown, then carry on where we left off.
  function startBreak(next) {
    var P = PACE.gentle, until = now() + Math.round(rnd(P.breakMsMin, P.breakMsMax));
    S.breaking = true; if (!D.settings.chatNoteDismissed) S.chatNote = true;
    function paint() { S.statusKey = 'breakStatus'; S.statusVars = { s: Math.max(1, Math.ceil((until - now()) / 1000)) }; publish() }
    paint();
    S.countTimer = setInterval(paint, 1000);
    S.scrollTimer = setTimeout(function () { clearCount(); resetBreakCounter(); publish(); if (S.running) next() }, until - now());
  }

  function startScroll() {
    if (!S.scrollContainer || !S.scrollContainer.isConnected) S.scrollContainer = findScroller();
    if (!S.scrollContainer) { S.statusKey = 'noGrid'; publish(); return }
    if (S.cap) { S.cap = false; S.runAcc = 0 } // pressing Resume after the time limit starts a new period
    S.running = true; S.hasRun = true; S.end = null; S.note = null; S.crash = null; S.statusKey = ''; S.statusVars = null; S.crashTicks = 0;
    S.runFrom = now();
    S.matches.forEach(function (m) { S.notified.add(m.id) });
    openScanEntry();
    S.lastGrowthAt = now(); resetBreakCounter(); publish();
    var stuck = 0;
    function later(fn, ms) { S.scrollTimer = setTimeout(fn, ms) }

    function tick() {
      if (!S.running) return;
      if (ranMs() >= capMs()) { capStop(); return }
      var P = pace();
      if (D.settings.speed === 'gentle' && S.registry.size - S.breakBase >= S.breakAt) { startBreak(tick); return }
      var c = S.scrollContainer;
      if (!c || !c.isConnected) c = S.scrollContainer = findScroller();
      // Grindr crashed or emptied the grid (it happens after long sessions): pause, keep the list, offer "Resume".
      if (!c || allCells().length === 0) {
        if (S.registry.size > 0 && ++S.crashTicks >= CFG.CRASH_TICKS) { crashStop(); return }
        if (S.registry.size === 0) { stopScroll('stopped'); S.statusKey = 'noGrid'; publish(); return }
        later(tick, 2000); return;
      }
      S.crashTicks = 0;
      var before = c.scrollTop, h0 = c.scrollHeight, n0 = S.registry.size, t0 = now();
      c.scrollTop = Math.min(before + c.clientHeight * P.step, c.scrollHeight);
      later(function () { settle(c, before, h0, n0, t0, P) }, P.settle);
    }

    function settle(c, before, h0, n0, t0, P) {
      if (!S.running) return;
      var scrollStuck = c.scrollTop === before, contentStuck = now() - S.lastGrowthAt > P.stuckGrowthMs;
      if (scrollStuck) {
        stuck++;
        if (stuck >= P.stuckTicks && contentStuck) { reachEnd(); return }
      } else stuck = 0;
      if (D.settings.speed === 'fast') { // v2.0 pace
        var recently = now() - S.lastGrowthAt < P.recentGrowthMs;
        later(tick, recently ? P.tick : P.slowTick); return;
      }
      // Gentle: if we are close to the bottom, Grindr is about to load more. Give it time to finish before the next step.
      var near = c.scrollTop + c.clientHeight * 2 >= c.scrollHeight;
      if (!scrollStuck && near) { waitForLoad(c, h0, n0, t0, P); return }
      later(tick, jit(P.wait, P.jitter));
    }

    function waitForLoad(c, h0, n0, t0, P) {
      (function poll() {
        if (!S.running) return;
        var grew = c.scrollHeight > h0 || S.registry.size > n0 || S.lastGrowthAt >= t0;
        if (grew || now() - t0 > P.growWaitMax) { later(tick, jit(P.wait, P.jitter)); return }
        later(poll, P.growPoll);
      })();
    }
    tick();
  }
  function stopScroll(end) {
    if (S.running) S.runAcc += now() - S.runFrom;
    S.running = false; if (S.scrollTimer) clearTimeout(S.scrollTimer); S.scrollTimer = null; clearCount();
    setScanEnd(end || 'paused');
  }
  function reachEnd() { stopScroll('end'); render(); S.end = { scanned: S.registry.size, found: S.matches.length }; if (!D.settings.chatNoteDismissed) S.chatNote = true; publish() }
  function capStop() { stopScroll('cap'); S.cap = true; publish() }
  function crashStop() { stopScroll('crash'); var sc = S.scanId && JR.find(JN, S.scanId); S.crash = { n: sc ? sc.res.length : S.matches.length }; publish() }

  /* ---------- navigation ---------- */
  function pulse(cell) { cell.classList.add('gnf-pulse'); setTimeout(function () { cell.classList.remove('gnf-pulse') }, 1600) }
  function focusEntry(entry, tries) {
    if (!entry) return;
    var idx = S.matches.findIndex(function (m) { return m.id === entry.id }); if (idx >= 0) S.current = idx;
    if (entry.cell && entry.cell.isConnected) {
      entry.cell.scrollIntoView({ behavior: 'smooth', block: 'center' }); pulse(entry.cell); S.statusKey = ''; publish(); return;
    }
    // He scrolled out of the loaded area: jump back to where we saw him and let Grindr re-render the card.
    var c = S.scrollContainer || findScroller();
    if (c && entry.y != null && (tries || 0) < 3) {
      c.scrollTo({ top: Math.max(0, entry.y - c.clientHeight / 2), behavior: 'auto' });
      setTimeout(function () { render(); var fresh = S.registry.get(entry.id); focusEntry(fresh || entry, (tries || 0) + 1) }, 900);
    }
    publish();
  }
  function go(delta) {
    var n = S.matches.length; if (!n) return;
    S.current = (S.current + delta + n) % n; if (S.current < 0) S.current = 0;
    focusEntry(S.matches[S.current]);
  }
  // "Find again" a profile from the journal: same thumbnail id first, then same name. A lead, not a guarantee.
  function findAgain(scanId, id) {
    var sc = JR.find(JN, scanId), r = sc && sc.res.filter(function (x) { return x.id === id })[0];
    if (!r) return;
    var f = JR.findAgain(r, Array.from(S.registry.values()));
    S.find = { how: f.how, name: r.name, others: f.others, id: r.id };
    if (f.entry) focusEntry(f.entry); else publish();
  }

  /* ---------- persistence ---------- */
  function hasStore() { try { return !!(chrome && chrome.storage && chrome.storage.local) } catch (e) { return false } }
  function save() {
    if (!hasStore()) return;
    try { var o = {}; o[ST.KEYS.STATE] = D; chrome.storage.local.set(o) } catch (e) { /* extension reloaded */ }
  }
  function load(cb) {
    if (!hasStore()) return cb({});
    try { chrome.storage.local.get([ST.KEYS.STATE, ST.KEYS.JOURNAL, ST.KEYS.OLD, ST.KEYS.OLDER], function (r) { cb(r || {}) }) } catch (e) { cb({}) }
  }

  /* ---------- host + UI ---------- */
  var host = null, ui = null, port = null;
  function marksList() {
    return Object.keys(D.marks).map(function (id) { var m = D.marks[id]; return { id: id, m: m.m, name: m.name, thumb: m.thumb, t: m.t, on: S.registry.has(id) } })
      .sort(function (a, b) { return b.t - a.t }).slice(0, 300);
  }
  function snapshot() {
    var sn = seenSet(), open = unlocked();
    var list = S.matches.slice(0, CFG.LIST_CAP).map(function (m) {
      return { id: m.id, name: m.name, thumb: m.thumb || '', fav: m.favorite === true, on: !!(m.cell && m.cell.isConnected), mark: D.marks[m.id] ? D.marks[m.id].m : '', seen: sn.has(m.id) };
    });
    var q = hasQuery(), sc = open && S.openScan ? JR.find(JN, S.openScan) : null, cmp = null;
    if (open && S.cmp) { var a = JR.find(JN, S.cmp.a), b = JR.find(JN, S.cmp.b); if (a && b) { if (a.t0 > b.t0) { var x = a; a = b; b = x } var r = JR.compare(a, b); cmp = { a: summ(a), b: summ(b), added: r.added, gone: r.gone, both: r.both } } }
    var mk = { review: 0, ignore: 0 }; Object.keys(D.marks).forEach(function (id) { mk[D.marks[id].m]++ });
    return {
      version: VERSION, lang: D.settings.lang || 'en', settings: D.settings,
      view: S.showWelcome ? 'welcome' : (whatsNewDue() ? 'whatsnew' : 'panel'), welcomeStep: S.welcomeStep, collapsed: D.settings.collapsed,
      q: D.q, qText: C.serialize(D.q, nameOf), draft: S.draft, hasQuery: q, folders: D.folders, searches: D.searches,
      favFilter: D.settings.favFilter, counts: S.counts, newCount: S.newCount, pauseEach: D.settings.pauseEach,
      running: S.running, breaking: S.breaking, hasRun: S.hasRun, speed: D.settings.speed, chatNote: S.chatNote && !D.settings.chatNoteDismissed,
      status: S.statusKey ? T(S.statusKey, S.statusVars) : '', ranMin: Math.floor(ranMs() / 60000),
      scanned: S.registry.size, found: q ? S.counts.all : (D.settings.favFilter === 'fav' ? S.counts.fav : 0), favs: S.counts.fav,
      matches: list, current: S.current, note: S.note, end: S.end,
      crash: S.crash, interrupted: S.interrupted, cap: S.cap, otherTabs: S.tabsOk ? 0 : S.otherTabs, notice: D.notice, toast: S.toast,
      lock: !!D.lock, unlocked: open, journal: open ? JN.scans.map(summ) : null, scanCount: JN.scans.length, scanId: S.scanId,
      scan: sc ? { s: summ(sc), res: sc.res } : null, cmp: cmp,
      marks: mk, markList: marksList(), preview: S.preview, selftest: S.selftest, find: S.find, sideOpen: S.sideOpen, sideHint: S.sideHint
    };
  }
  function summ(s) { return { id: s.id, t0: s.t0, t1: s.t1, qText: s.qText, n: s.n, end: s.end, count: s.res.length } }
  function whatsNewDue() { return D.settings.welcomeDone && D.settings.whatsNew !== VERSION }
  var pubTimer = null, pubDirty = false;
  function publish() {
    pubDirty = true; if (pubTimer) return;
    pubTimer = setTimeout(function () {
      pubTimer = null; if (!pubDirty) return; pubDirty = false;
      var snap = snapshot();
      if (ui && !S.sideOpen && !S.closed) ui.update(snap);
      if (port) { try { port.postMessage({ type: 'state', state: snap }) } catch (e) { /* port closed */ } }
    }, 120);
  }
  function flushNow() { if (pubTimer) { clearTimeout(pubTimer); pubTimer = null } pubDirty = true; publish() }
  // Files and clipboard go through the panel that is on screen (side panel if open, else the floating panel).
  function toView(msg) {
    if (port) { try { port.postMessage(msg); return } catch (e) { /* closed */ } }
    if (ui) ui.deliver(msg);
  }
  function toast(k, v) { S.toast = { k: k, v: v || null, id: now() } }

  // "Turn off for now": stop scanning and disconnect every observer/timer so Grindr Web runs exactly as without the extension.
  // The toolbar icon (Show the floating panel) turns it back on. A side panel that is open keeps the observer alive.
  function suspend() { if (S.running) stopScroll('paused'); S.closed = true; if (!S.sideOpen) stopObserving(); applyHostVisibility() }
  function resume() { S.closed = false; applyHostVisibility(); if (!observer) startObserving(); render(); flushNow() }
  // The floating panel stays hidden while the side panel is open. If the side panel link drops without a goodbye (Chrome re-connects it
  // on page navigations, e.g. when a profile opens), keep the floating panel hidden for a short grace period so it never flashes over Grindr.
  var graceTimer = null;
  function startGrace() { S.sideGrace = true; clearTimeout(graceTimer); graceTimer = setTimeout(function () { S.sideGrace = false; applyHostVisibility() }, 4000) }
  function applyHostVisibility() { if (host) host.style.display = (S.closed || S.sideOpen || S.sideGrace) ? 'none' : '' }
  function clampPos() {
    if (!host) return;
    var r = host.getBoundingClientRect(), left = Math.min(Math.max(0, r.left), Math.max(0, innerWidth - 80)), top = Math.min(Math.max(0, r.top), Math.max(0, innerHeight - 40));
    host.style.left = left + 'px'; host.style.top = top + 'px'; host.style.right = 'auto'; fitHeight();
  }
  // The panel scrolls inside itself: keep its bottom on screen whatever its position, so every button stays reachable.
  function fitHeight() { if (!host) return; var top = Math.max(0, host.getBoundingClientRect().top); host.style.maxHeight = Math.max(160, innerHeight - top - 8) + 'px' }
  function resetPos() { D.settings.pos = null; if (host) { host.style.left = 'auto'; host.style.top = '70px'; host.style.right = '20px'; fitHeight() } save() }

  function dragStart(e, onClick) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    var r = host.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top, sx = e.clientX, sy = e.clientY, moved = false;
    function mv(ev) {
      if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) return;
      moved = true; host.style.left = ev.clientX - ox + 'px'; host.style.top = ev.clientY - oy + 'px'; host.style.right = 'auto';
    }
    function up() {
      window.removeEventListener('pointermove', mv, true); window.removeEventListener('pointerup', up, true);
      if (moved) { clampPos(); D.settings.pos = { left: host.style.left, top: host.style.top }; save() } else if (onClick) onClick();
    }
    window.addEventListener('pointermove', mv, true); window.addEventListener('pointerup', up, true);
  }

  /* ---------- search changes ---------- */
  function setQuery(q) {
    var before = C.sig(D.q);
    D.q = C.clean(q); S.draft = null; S.current = -1; S.end = null; S.note = null; S.notified = new Set(); S.find = null;
    if (C.sig(D.q) !== before) { if (S.running) { closeScanEntry(); openScanEntry() } else closeScanEntry() }
    render(); save();
  }
  function searchSnapshotName(q) { return C.shortText(q, nameOf, 40) || T('untitled') }
  function folderExists(id) { return D.folders.some(function (f) { return f.id === id }) }
  function touchSearches() { searchesVer++; cqKey = '' }

  /* ---------- actions sent by the panel ---------- */
  function act(a) {
    var s, i;
    switch (a.a) {
      // search
      case 'draft': S.draft = a.v == null ? null : String(a.v).slice(0, 400); S.current = -1; S.end = null; render(); break;
      case 'set-text': setQuery(C.parse(String(a.v || '').slice(0, 400), resolveName).q); break;
      case 'set-q': setQuery(a.q || C.emptyQuery()); break;
      case 'clear-q': setQuery(C.emptyQuery()); break;
      case 'preview': S.preview = { sig: C.sig(a.q || {}), n: countFor(a.q || {}) }; break;
      case 'search-name': setQuery({ groups: [{ items: [{ name: '', terms: [{ t: String(a.name || '').slice(0, 60), w: false }] }] }] }); break;
      // results
      case 'favfilter': // switching tabs must not make the scan stop on every match that was hidden until now
        D.settings.favFilter = ['all', 'fav', 'non'].indexOf(a.v) >= 0 ? a.v : 'all'; S.current = -1; S.note = null;
        computeMatches().forEach(function (m) { S.notified.add(m.id) }); render(); save(); break;
      case 'hide-seen': D.settings.hideSeen = !D.settings.hideSeen; S.current = -1; computeMatches().forEach(function (m) { S.notified.add(m.id) }); render(); save(); break;
      case 'mark':
        if (!a.id) break;
        if (!a.m || (D.marks[a.id] && D.marks[a.id].m === a.m)) delete D.marks[a.id];
        else { var en = S.registry.get(a.id) || {}; D.marks[a.id] = { m: a.m === 'ignore' ? 'ignore' : 'review', name: String(a.name || en.name || '').slice(0, 80), thumb: /^https:\/\//.test(a.thumb || en.thumb || '') ? (a.thumb || en.thumb) : '', t: now() } }
        render(); save(); break;
      case 'prev': go(-1); break;
      case 'next': go(1); break;
      case 'show': var e1 = S.registry.get(a.id); if (e1) { S.note = null; focusEntry(e1) } break;
      // scan
      case 'toggle-scroll': if (S.running) { stopScroll('paused'); publish() } else { S.note = null; startScroll() } break;
      case 'note-show': var n = S.note && S.registry.get(S.note.id); S.note = null; if (n) focusEntry(n); else publish(); break;
      case 'note-resume': S.note = null; startScroll(); break;
      case 'end-see': S.end = null; break;
      case 'crash-resume': S.crash = null; startScroll(); break;
      case 'crash-ok': S.crash = null; break;
      case 'cap-ok': S.cap = false; S.runAcc = 0; break;
      case 'interrupted-resume':
        if (S.interrupted) { var it = JR.find(JN, S.interrupted.id); S.interrupted = null; if (it) { D.q = C.clean(it.q); S.draft = null; S.scanId = it.id; save(); render(); startScroll() } }
        break;
      case 'interrupted-ok': S.interrupted = null; break;
      case 'tabs-ok': S.tabsOk = true; break;
      case 'chat-note-ok': S.chatNote = false; D.settings.chatNoteDismissed = true; save(); break;
      // settings
      case 'pause-each': D.settings.pauseEach = !D.settings.pauseEach; save(); break;
      case 'speed': if (a.v === 'gentle' || a.v === 'fast') { D.settings.speed = a.v; if (S.running) resetBreakCounter(); save() } break;
      case 'cap': if (ST.CAPS.indexOf(+a.v) >= 0) { D.settings.capMin = +a.v; save() } break;
      case 'outline': D.settings.outline = !D.settings.outline; applyOutline(); save(); break;
      case 'discreet': D.settings.discreet = !D.settings.discreet; save(); break;
      case 'lang': D.settings.lang = a.l; save(); break;
      // saved searches and folders
      case 'search-save':
        var q = a.q ? C.clean(a.q) : C.clean(D.q); if (C.isEmpty(q)) break;
        var dupe = D.searches.filter(function (x) { return C.sig(x.q) === C.sig(q) && (!a.name || x.name === a.name) })[0];
        if (dupe) { toast('tSavedAlready', { name: dupe.name }); break }
        D.searches.push({ id: ST.newId('s'), name: String(a.name || '').trim().slice(0, 60) || searchSnapshotName(q), folder: folderExists(a.folder) ? a.folder : ST.DEFAULT_FOLDER, pinned: false, q: q, created: now(), used: 0 });
        touchSearches(); toast('tSaved'); save(); break;
      case 'search-update': s = findSearch(a.id); if (s && a.q && !C.isEmpty(C.clean(a.q))) { s.q = C.clean(a.q); if (a.name) s.name = String(a.name).trim().slice(0, 60); touchSearches(); toast('tSaved'); save(); render() } break;
      case 'search-load': s = findSearch(a.id); if (s) { s.used = now(); setQuery(C.clone(s.q)) } break;
      case 'search-rename': s = findSearch(a.id); if (s && String(a.name || '').trim()) { s.name = String(a.name).trim().slice(0, 60); touchSearches(); save() } break;
      case 'search-pin': s = findSearch(a.id); if (s) { s.pinned = !s.pinned; save() } break;
      case 'search-dup': s = findSearch(a.id); if (s) { D.searches.push({ id: ST.newId('s'), name: (s.name + ' ' + T('copySuffix')).slice(0, 60), folder: s.folder, pinned: false, q: C.clone(s.q), created: now(), used: 0 }); touchSearches(); save() } break;
      case 'search-del': D.searches = D.searches.filter(function (x) { return x.id !== a.id }); touchSearches(); save(); render(); break;
      case 'search-move': s = findSearch(a.id); if (s && folderExists(a.folder)) { s.folder = a.folder; save() } break;
      case 'folder-new': var nm = String(a.name || '').trim().slice(0, 40); if (nm && D.folders.length < 50) { var f = { id: ST.newId('f'), name: nm, open: true }; D.folders.push(f); if (a.move) { s = findSearch(a.move); if (s) s.folder = f.id } save() } break;
      case 'folder-rename': for (i = 0; i < D.folders.length; i++) if (D.folders[i].id === a.id && a.id !== ST.DEFAULT_FOLDER && String(a.name || '').trim()) D.folders[i].name = String(a.name).trim().slice(0, 40); save(); break;
      case 'folder-del': if (a.id !== ST.DEFAULT_FOLDER) { D.searches.forEach(function (x) { if (x.folder === a.id) x.folder = ST.DEFAULT_FOLDER }); D.folders = D.folders.filter(function (x) { return x.id !== a.id }); save() } break;
      case 'folder-toggle': for (i = 0; i < D.folders.length; i++) if (D.folders[i].id === a.id) D.folders[i].open = !D.folders[i].open; save(); break;
      // journal
      case 'scan-open': if (unlocked()) { S.openScan = a.id || null; S.find = null } break;
      case 'scan-del': if (unlocked()) { JN.scans = JN.scans.filter(function (x) { return x.id !== a.id }); if (S.scanId === a.id) S.scanId = null; if (S.openScan === a.id) S.openScan = null; saveJournalNow(); render() } break;
      case 'journal-clear': JN = JR.empty(); S.scanId = null; S.openScan = null; S.cmp = null; S.interrupted = null; D.lock = null; saveJournalNow(); save(); toast('tCleared'); render(); break;
      case 'compare': if (unlocked() && a.a1 && a.b1) S.cmp = { a: a.a1, b: a.b1 }; else S.cmp = null; break;
      case 'find-again': findAgain(a.scan, a.id); break;
      case 'find-ok': S.find = null; break;
      // lock (comfort lock, not encryption)
      case 'lock-set': if (ST.validPin(a.pin) && (!D.lock || ST.checkPin(D.lock, a.old))) { D.lock = ST.makeLock(String(a.pin)); S.unlockedAt = 0; save(); toast('tLockOn') } else toast('tPinBad'); break;
      case 'lock-remove': if (D.lock && ST.checkPin(D.lock, a.pin)) { D.lock = null; save(); toast('tLockOff') } else toast('tPinBad'); break;
      case 'unlock': if (D.lock && ST.checkPin(D.lock, a.pin)) S.unlockedAt = now(); else toast('tPinBad'); break;
      case 'relock': S.unlockedAt = 0; S.openScan = null; S.cmp = null; break;
      // my data
      case 'export':
        if (!unlocked()) { toast('tUnlockFirst'); break }
        var d = new Date(), stamp = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        toView({ type: 'download', name: 'profile-name-search-backup-' + stamp + '.json', text: JSON.stringify(ST.makeBackup(D, JN, VERSION, now()), null, 1) });
        break;
      case 'import':
        var rb = ST.readBackup(a.text);
        if (!rb.ok) { toast('tImport_' + rb.err); break }
        var mr = ST.mergeBackup(D, JN, rb.data, now());
        mr.state.settings = D.settings; mr.state.q = D.q; mr.state.lock = D.lock; mr.state.notice = D.notice;
        D = mr.state; JN = mr.journal; touchSearches(); save(); saveJournalNow(); render();
        toast('tImported', mr.added); break;
      case 'wipe-all':
        var keep = { lang: D.settings.lang, welcomeDone: true, whatsNew: VERSION };
        if (S.running) stopScroll('stopped');
        D = ST.defaults(); D.settings.lang = keep.lang; D.settings.welcomeDone = true; D.settings.whatsNew = VERSION;
        JN = JR.empty(); S.scanId = null; S.openScan = null; S.cmp = null; S.interrupted = null; S.crash = null; S.draft = null; S.notified = new Set();
        touchSearches(); applyOutline();
        try { chrome.storage.local.remove([ST.KEYS.JOURNAL, ST.KEYS.OLD, ST.KEYS.OLDER]) } catch (e) { /* ignore */ }
        save(); toast('tWiped'); render(); break;
      case 'notice-ok': D.notice = ''; save(); break;
      case 'toast-ok': S.toast = null; break;
      case 'selftest': S.selftest = selfTest(); break;
      // panel, welcome, what's new
      case 'tips': S.showWelcome = true; S.welcomeStep = 1; break;
      case 'welcome-next': if (S.welcomeStep >= 4) { S.showWelcome = false; D.settings.welcomeDone = true; D.settings.whatsNew = VERSION; save() } else S.welcomeStep++; break;
      case 'welcome-back': if (S.welcomeStep > 1) S.welcomeStep--; break;
      case 'welcome-skip': S.showWelcome = false; D.settings.welcomeDone = true; D.settings.whatsNew = VERSION; save(); break;
      case 'whatsnew-ok': D.settings.whatsNew = VERSION; D.notice = ''; save(); break;
      case 'min': D.settings.collapsed = !D.settings.collapsed; save(); break;
      case 'close': suspend(); break;
      // Chrome only opens its side panel on a user gesture: the message is sent right here, from the click handler, and the
      // service worker calls chrome.sidePanel.open(). If that fails (old Chrome, gesture lost), say how to open it by hand.
      case 'side': try { chrome.runtime.sendMessage({ type: 'pns-open-side' }, function (r) { if (chrome.runtime.lastError || !r || !r.ok) { S.sideHint = true; publish() } }) } catch (e) { S.sideHint = true; publish() } break;
      case 'side-hint-ok': S.sideHint = false; break;
      case 'float': break; /* handled by the side panel itself */
    }
    if (a.a !== 'draft') flushNow();
  }

  /* ---------- grid self-test (⚙): a text report you can copy, with no names and no photos ---------- */
  function selfTest() {
    var cells = allCells(), named = 0, ids = 0, favs = 0;
    cells.forEach(function (c) { var p = c.querySelector('p'), img = c.querySelector('img'); if ((p && p.textContent.trim()) || (img && img.getAttribute('alt'))) named++; if (img && /[0-9a-fA-F]{20,}/.test(img.currentSrc || img.getAttribute('src') || '')) ids++; if (readFav(c)) favs++ });
    var sc = findScroller(), n = cells.length, pct = function (k) { return n ? Math.round(k / n * 100) : 0 };
    var checks = [
      { k: 'stCards', ok: n > 0, v: String(n) },
      { k: 'stNames', ok: n > 0 && pct(named) >= 80, v: named + ' / ' + n },
      { k: 'stIds', ok: n > 0 && pct(ids) >= 80, v: ids + ' / ' + n },
      { k: 'stFav', ok: true, v: String(favs) },
      { k: 'stScroll', ok: !!sc, v: sc ? 'ok' : '—' }
    ];
    var ua = (navigator.userAgent.match(/Chrome\/([\d.]+)/) || [])[1] || '?';
    var lines = ['Profile Name Search ' + VERSION + ' — grid self-test', 'Date: ' + new Date().toISOString(), 'Chrome: ' + ua + ' · Language: ' + (D.settings.lang || 'en') + ' · Window: ' + innerWidth + 'x' + innerHeight,
      'Site: ' + location.host + ' · Side panel: ' + (S.sideOpen ? 'open' : 'closed') + ' · Speed: ' + D.settings.speed + ' · Pause each match: ' + (D.settings.pauseEach ? 'on' : 'off'), ''];
    checks.forEach(function (c) { lines.push((c.ok ? '[OK]   ' : '[FAIL] ') + c.k.replace(/^st/, '') + ': ' + c.v) });
    lines.push('', 'Saved searches: ' + D.searches.length + ' · Journal scans: ' + JN.scans.length + ' · Profiles read this visit: ' + S.registry.size, '(No names, photos or profile links are included in this report.)');
    return { t: now(), checks: checks, text: lines.join('\n'), ok: checks.every(function (c) { return c.ok }) };
  }

  function buildHost() {
    host = document.createElement('div'); host.id = 'pns-host';
    host.style.cssText = 'position:fixed;top:70px;right:20px;z-index:2147483647;max-height:calc(100vh - 16px);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent;border-radius:18px;';
    var shadow = host.attachShadow({ mode: 'open' });
    ui = window.PNS_UI.mount(shadow, { mode: 'float', send: act, dragStart: dragStart });
    document.documentElement.appendChild(host);
    var pos = D.settings.pos;
    if (pos && pos.left && pos.top) { host.style.left = pos.left; host.style.top = pos.top; host.style.right = 'auto'; clampPos() }
    window.addEventListener('resize', function () { if (D.settings.pos) clampPos(); else fitHeight() });
    fitHeight();
    applyHostVisibility();
  }

  /* ---------- other Grindr tabs: background.js counts the tabs where this script runs (no extra permission) ---------- */
  function linkBackground() {
    try {
      var bg = chrome.runtime.connect({ name: 'pns-tab' });
      bg.onMessage.addListener(function (m) { if (m && m.type === 'tabs') { var o = Math.max(0, (m.n || 1) - 1); if (o !== S.otherTabs) { S.otherTabs = o; if (!o) S.tabsOk = false; publish() } } else if (m && m.type === 'cmd') command(m.cmd) });
      bg.onDisconnect.addListener(function () { void chrome.runtime.lastError; setTimeout(function () { try { if (chrome.runtime && chrome.runtime.id) linkBackground() } catch (e) { /* extension reloaded */ } }, CFG.TABS_RETRY_MS) });
    } catch (e) { /* no background (tests) or extension reloaded */ }
  }
  // Keyboard shortcuts (chrome://extensions/shortcuts): background.js forwards them to the tab.
  function command(cmd) {
    if (cmd === 'toggle-scan') act({ a: 'toggle-scroll' });
    else if (cmd === 'next-match') act({ a: 'next' });
    else if (cmd === 'prev-match') act({ a: 'prev' });
    else if (cmd === 'focus-search') {
      if (S.closed) resume();
      if (D.settings.collapsed) { D.settings.collapsed = false; save() }
      flushNow();
      if (port) { try { port.postMessage({ type: 'focus' }) } catch (e) { /* closed */ } } else setTimeout(function () { if (ui) ui.focusInput() }, 200);
    }
  }

  /* ---------- messaging with popup / background / side panel ---------- */
  function wire() {
    try {
      chrome.runtime.onMessage.addListener(function (msg, _s, reply) {
        if (!msg || !msg.type) return;
        if (msg.type === 'pns-reset-pos') { resetPos(); D.settings.collapsed = false; resume(); reply({ ok: true }) }
        else if (msg.type === 'pns-show') { resume(); reply({ ok: true }) }
        else if (msg.type === 'pns-off') { suspend(); reply({ ok: true }) }
        else if (msg.type === 'pns-lang') { D.settings.lang = msg.lang; save(); publish(); reply({ ok: true }) }
        else if (msg.type === 'pns-cmd') { command(msg.cmd); reply({ ok: true }) }
        else if (msg.type === 'pns-ping') reply({ ok: true });
      });
      chrome.runtime.onConnect.addListener(function (p) {
        if (p.name !== 'pns-side') return;
        port = p; S.sideOpen = true; S.sideGrace = false; S.sideHint = false; clearTimeout(graceTimer); S.sideBye = false; applyHostVisibility(); if (!observer) { startObserving(); render() }
        if (!D.settings.lastSide) { D.settings.lastSide = true; save() }
        p.onMessage.addListener(function (m) { if (m && m.type === 'act' && m.a) act(m.a); else if (m && m.type === 'bye') S.sideBye = true; else if (m && m.type === 'hello') { try { p.postMessage({ type: 'state', state: snapshot() }) } catch (e) { /* closed */ } } });
        p.onDisconnect.addListener(function () {
          if (port === p) port = null; S.sideOpen = false;
          if (S.sideBye) { S.sideBye = false; S.sideGrace = false; clearTimeout(graceTimer); if (D.settings.lastSide) { D.settings.lastSide = false; save() } } else if (!port) startGrace();
          applyHostVisibility(); if (S.closed) { if (S.running) stopScroll('paused'); stopObserving() } flushNow();
        });
        try { p.postMessage({ type: 'state', state: snapshot() }) } catch (e) { /* closed */ }
      });
      document.addEventListener('visibilitychange', function () { if (!document.hidden && D.settings.lastSide && !S.sideOpen) startGrace() }); // coming back to this tab: the side panel re-links in a moment
      window.addEventListener('pagehide', function () { if (S.running && S.scanId) saveJournalNow() });
      if (chrome.storage && chrome.storage.onChanged) chrome.storage.onChanged.addListener(function (ch, area) {
        var nv = area === 'local' && ch[ST.KEYS.STATE] && ch[ST.KEYS.STATE].newValue;
        if (nv && nv.settings && nv.settings.lang && nv.settings.lang !== D.settings.lang) { D.settings.lang = nv.settings.lang; publish() } // language changed from the toolbar popup
      });
    } catch (e) { /* extension context invalidated (extension reloaded) */ }
  }

  function init() {
    load(function (r) {
      var mg = ST.migrate(r[ST.KEYS.STATE], r[ST.KEYS.OLD], r[ST.KEYS.OLDER], now());
      D = mg.state;
      if (!D.settings.lang) D.settings.lang = window.PNS_GUESS_LANG();
      JN = JR.prune(r[ST.KEYS.JOURNAL] || JR.empty(), now());
      // A scan still marked "running" means the tab was closed, reloaded or crashed during it: offer to pick it up again.
      var last = JN.scans[0];
      if (last && last.end === 'running') { last.end = 'crash'; S.interrupted = { id: last.id, n: last.res.length, t: last.t1, qText: last.qText }; saveJournalNow() }
      S.showWelcome = !D.settings.welcomeDone;
      if (D.settings.lastSide) startGrace(); // the side panel was open on the last visit: give it time to reconnect before showing the floating panel
      applyOutline();
      buildHost(); wire(); linkBackground(); startObserving(); render(); flushNow();
      save(); // writes the migrated (or first) v3 data once
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 1200);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1200) });
})();

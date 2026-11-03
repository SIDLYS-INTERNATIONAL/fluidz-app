/* Profile Name Search — content script (engine + floating panel host).
   Everything runs locally in your browser: nothing is sent anywhere, and the extension never clicks, likes or messages for you. */
(function () {
  'use strict';
  if (window.__pnsInjected) return;
  window.__pnsInjected = true;

  var CFG = {
    KEY: 'pns_state_v1', OLD_KEY: 'gnf_state_v3', LIST_CAP: 150, MAX_SAVED: 3, MAX_GROUPS: 12,
    // Page-observer pacing (ms). Renders are throttled, never one per DOM mutation; slower while a scan is running.
    RENDER_IDLE_MS: 250, RENDER_RUN_MS: 500, RENDER_NOGRID_MS: 1000, FAV_REFRESH_MS: 2500, SCOPE_CHECK_MS: 3000
  };
  // Scan pacing. "gentle" is the default: smaller steps, ~2-3 s between steps with random jitter, waits for Grindr to finish
  // loading before the next step, and takes a short cool-down break every ~120-150 new profiles. "fast" is the v2.0 pace.
  var PACE = {
    gentle: { step: 0.6, settle: 600, wait: 1900, jitter: 0.25, growWaitMax: 4500, growPoll: 300, stuckTicks: 3, stuckGrowthMs: 8000, breakMin: 120, breakMax: 150, breakMsMin: 8000, breakMsMax: 10000 },
    fast: { step: 0.85, settle: 550, tick: 700, slowTick: 1100, recentGrowthMs: 1500, stuckTicks: 5, stuckGrowthMs: 4000 }
  };

  var S = {
    groups: [], draft: '', favFilter: 'all', counts: { all: 0, fav: 0, non: 0 }, pauseEach: true, saved: [], lang: null,
    welcomeDone: false, welcomeStep: 1, showWelcome: false, collapsed: false, closed: false,
    speed: 'gentle', chatNote: false, chatNoteDismissed: false, breaking: false, breakBase: 0, breakAt: 135, statusVars: null, countTimer: null, lastFavAt: 0,
    running: false, hasRun: false, scrollContainer: null, scrollTimer: null, statusKey: '', note: null, end: null,
    registry: new Map(), matches: [], current: -1, notified: new Set(), lastGrowthAt: 0, total: 0,
    sideOpen: false, pos: null, nogridTried: false
  };

  /* ---------- helpers ---------- */
  function T(k, v) { return window.PNS_T(S.lang || 'en', k, v) }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }
  function allCells() { return Array.prototype.slice.call(document.querySelectorAll('div[role="gridcell"]')) }
  function rnd(a, b) { return a + Math.random() * (b - a) }
  function setCls(el, name, on) { if (el.classList.contains(name) !== on) el.classList.toggle(name, on) }

  // Query syntax: comma / ; / | = OR, + = AND, "quotes" = exact phrase (spaces kept inside a term). Parsed in ui.js (PNS_PARSE).
  function effectiveGroups() { // chips + what is being typed; syntax parsed by PNS_PARSE (ui.js)
    var out = [];
    window.PNS_PARSE.combine(S.groups, S.draft).forEach(function (raw) {
      window.PNS_PARSE.parse(raw).groups.forEach(function (terms) {
        var t = terms.map(function (x) { return norm(x.trim()) }).filter(Boolean); if (t.length) out.push(t);
      });
    });
    return out;
  }
  function hasQuery() { return effectiveGroups().length > 0 }
  function matchEntry(entry, groups) {
    var n = norm(entry.name);
    return groups.some(function (and) { return and.every(function (t) { return n.indexOf(t) >= 0 }) });
  }

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
  // survives Grindr's class-name changes; if Grindr redraws the icon this hint needs updating.
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

  /* ---------- registry + matching ---------- */
  // Tabs All / Favorites / Not favorites: the tab filters everything (results list, grid highlight, pauses, Previous/Next).
  // With no search typed, only the Favorites tab lists something (all favorites seen on the grid).
  function computeMatches() {
    var groups = effectiveGroups(), hasName = groups.length > 0, f = S.favFilter;
    var all = Array.from(S.registry.values());
    var base = hasName ? all.filter(function (e) { return matchEntry(e, groups) }) : (f === 'fav' ? all : []);
    var nFav = 0; base.forEach(function (e) { if (e.favorite === true) nFav++ });
    S.counts = hasName ? { all: base.length, fav: nFav, non: base.length - nFav } : { all: 0, fav: nFav, non: 0 };
    if (f === 'fav') return base.filter(function (e) { return e.favorite === true });
    if (f === 'non') return base.filter(function (e) { return e.favorite !== true });
    return base;
  }

  // Where this card sits in the scrollable grid, so we can scroll back to it if Grindr unloads it later.
  function yOf(cell) {
    var c = S.scrollContainer && S.scrollContainer.isConnected ? S.scrollContainer : (S.scrollContainer = findScroller());
    if (!c) return null;
    return cell.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop;
  }

  function render() {
    var cells = allCells(), grew = false, now = Date.now();
    // While a scan runs, only re-read the "favorite" star on every card every couple of seconds (new cards are always read).
    var favNow = !S.running || now - S.lastFavAt > CFG.FAV_REFRESH_MS; if (favNow) S.lastFavAt = now;
    S.total = cells.length;
    cells.forEach(function (cell) {
      var r = readIdentity(cell); if (!r.id || !r.name) return;
      if (r.upgradedFrom && S.registry.has(r.upgradedFrom)) S.registry.delete(r.upgradedFrom);
      var ex = S.registry.get(r.id);
      if (!ex) { S.registry.set(r.id, { id: r.id, name: r.name, thumb: r.thumb, cell: cell, favorite: readFav(cell), y: yOf(cell) }); grew = true }
      else { ex.name = r.name; if (r.thumb) ex.thumb = r.thumb; ex.cell = cell; if (favNow) ex.favorite = readFav(cell) }
    });
    if (grew) S.lastGrowthAt = Date.now();

    var matches = computeMatches(); S.matches = matches;
    if (S.current >= matches.length) S.current = matches.length - 1;
    var ids = new Set(matches.map(function (m) { return m.id })), q = hasQuery() || S.favFilter === 'fav';
    cells.forEach(function (cell) { // only touch a card's classes when they actually change (no needless style work on Grindr's page)
      var id = cell.dataset.gnfId, isMatch = q && !!id && ids.has(id);
      setCls(cell, 'gnf-hidden', false); setCls(cell, 'gnf-match', isMatch); setCls(cell, 'gnf-dim', q && !isMatch);
    });

    // "Pause at each new match": stop and tell the user, never act on the profile.
    if (S.running && S.pauseEach) {
      var fresh = matches.filter(function (m) { return !S.notified.has(m.id) });
      if (fresh.length) {
        fresh.forEach(function (m) { S.notified.add(m.id) });
        var latest = fresh[fresh.length - 1];
        stopScroll(); S.note = { id: latest.id, name: latest.name, thumb: latest.thumb };
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

  /* ---------- auto-scroll ---------- */
  function pace() { return PACE[S.speed] || PACE.gentle }
  function jit(ms, j) { return ms * (1 + (Math.random() * 2 - 1) * j) }
  function resetBreakCounter() { S.breakBase = S.registry.size; S.breakAt = Math.round(rnd(PACE.gentle.breakMin, PACE.gentle.breakMax)) }
  function clearCount() { if (S.countTimer) clearInterval(S.countTimer); S.countTimer = null; if (S.breaking) { S.breaking = false; if (S.statusKey === 'breakStatus') { S.statusKey = ''; S.statusVars = null } } }

  // Cool-down: stop scrolling for ~8-10 s with a visible countdown, then carry on where we left off.
  function startBreak(next) {
    var P = PACE.gentle, until = Date.now() + Math.round(rnd(P.breakMsMin, P.breakMsMax));
    S.breaking = true; if (!S.chatNoteDismissed) S.chatNote = true;
    function paint() { S.statusKey = 'breakStatus'; S.statusVars = { s: Math.max(1, Math.ceil((until - Date.now()) / 1000)) }; publish() }
    paint();
    S.countTimer = setInterval(paint, 1000);
    S.scrollTimer = setTimeout(function () { clearCount(); resetBreakCounter(); publish(); if (S.running) next() }, until - Date.now());
  }

  function startScroll() {
    if (!S.scrollContainer || !S.scrollContainer.isConnected) S.scrollContainer = findScroller();
    if (!S.scrollContainer) { S.statusKey = 'noGrid'; publish(); return }
    S.running = true; S.hasRun = true; S.end = null; S.note = null; S.statusKey = ''; S.statusVars = null;
    S.matches.forEach(function (m) { S.notified.add(m.id) });
    S.lastGrowthAt = Date.now(); resetBreakCounter(); publish();
    var stuck = 0;
    function later(fn, ms) { S.scrollTimer = setTimeout(fn, ms) }

    function tick() {
      if (!S.running) return;
      var P = pace();
      if (S.speed === 'gentle' && S.registry.size - S.breakBase >= S.breakAt) { startBreak(tick); return }
      var c = S.scrollContainer;
      if (!c || !c.isConnected) { c = S.scrollContainer = findScroller(); if (!c) { stopScroll(); S.statusKey = 'noGrid'; publish(); return } }
      var before = c.scrollTop, h0 = c.scrollHeight, n0 = S.registry.size, t0 = Date.now();
      c.scrollTop = Math.min(before + c.clientHeight * P.step, c.scrollHeight);
      later(function () { settle(c, before, h0, n0, t0, P) }, P.settle);
    }

    function settle(c, before, h0, n0, t0, P) {
      if (!S.running) return;
      var scrollStuck = c.scrollTop === before, contentStuck = Date.now() - S.lastGrowthAt > P.stuckGrowthMs;
      if (scrollStuck) {
        stuck++;
        if (stuck >= P.stuckTicks && contentStuck) { reachEnd(); return }
      } else stuck = 0;
      if (S.speed === 'fast') { // v2.0 pace
        var recently = Date.now() - S.lastGrowthAt < P.recentGrowthMs;
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
        if (grew || Date.now() - t0 > P.growWaitMax) { later(tick, jit(P.wait, P.jitter)); return }
        later(poll, P.growPoll);
      })();
    }
    tick();
  }
  function stopScroll() { S.running = false; if (S.scrollTimer) clearTimeout(S.scrollTimer); S.scrollTimer = null; clearCount() }
  function reachEnd() { stopScroll(); render(); S.end = { scanned: S.registry.size, found: S.matches.length }; if (!S.chatNoteDismissed) S.chatNote = true; publish() }

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

  /* ---------- persistence ---------- */
  function hasStore() { try { return !!(chrome && chrome.storage && chrome.storage.local) } catch (e) { return false } }
  function save() {
    if (!hasStore()) return;
    try {
      var o = {}; o[CFG.KEY] = { groups: S.groups, favFilter: S.favFilter, pauseEach: S.pauseEach, saved: S.saved, lang: S.lang, welcomeDone: S.welcomeDone, collapsed: S.collapsed, pos: S.pos, speed: S.speed, chatNoteDismissed: S.chatNoteDismissed };
      chrome.storage.local.set(o);
    } catch (e) { /* ignore */ }
  }
  function load(cb) {
    if (!hasStore()) return cb(null, null);
    try { chrome.storage.local.get([CFG.KEY, CFG.OLD_KEY], function (r) { cb((r && r[CFG.KEY]) || null, (r && r[CFG.OLD_KEY]) || null) }) } catch (e) { cb(null, null) }
  }

  /* ---------- host + UI ---------- */
  var host = null, ui = null, port = null;
  function snapshot() {
    var list = S.matches.slice(0, CFG.LIST_CAP).map(function (m) { return { id: m.id, name: m.name, thumb: m.thumb || '', fav: m.favorite === true, on: !!(m.cell && m.cell.isConnected) } });
    var q = hasQuery();
    return {
      lang: S.lang || 'en', view: S.showWelcome ? 'welcome' : 'panel', welcomeStep: S.welcomeStep, collapsed: S.collapsed,
      groups: S.groups.slice(), hasDraft: !!S.draft.trim(), favOnly: S.favFilter === 'fav', favFilter: S.favFilter, counts: S.counts, hasQuery: q, pauseEach: S.pauseEach, saved: S.saved.slice(),
      running: S.running, hasRun: S.hasRun, speed: S.speed, chatNote: S.chatNote && !S.chatNoteDismissed, status: S.statusKey ? T(S.statusKey, S.statusVars) : '',
      scanned: S.registry.size, found: q ? S.counts.all : (S.favFilter === 'fav' ? S.counts.fav : 0), favs: S.counts.fav,
      matches: list, current: S.current, note: S.note, end: S.end
    };
  }
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

  // "Turn off for now": stop scanning and disconnect every observer/timer so Grindr Web runs exactly as without the extension.
  // The toolbar icon (Show the floating panel) turns it back on. A side panel that is open keeps the observer alive.
  function suspend() { stopScroll(); S.closed = true; if (!S.sideOpen) stopObserving(); applyHostVisibility() }
  function resume() { S.closed = false; applyHostVisibility(); if (!observer) startObserving(); render(); flushNow() }
  function applyHostVisibility() { if (host) host.style.display = (S.closed || S.sideOpen) ? 'none' : '' }
  function clampPos() {
    if (!host) return;
    var r = host.getBoundingClientRect(), left = Math.min(Math.max(0, r.left), Math.max(0, innerWidth - 80)), top = Math.min(Math.max(0, r.top), Math.max(0, innerHeight - 40));
    host.style.left = left + 'px'; host.style.top = top + 'px'; host.style.right = 'auto';
  }
  function resetPos() { S.pos = null; if (host) { host.style.left = 'auto'; host.style.top = '70px'; host.style.right = '20px' } save() }

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
      if (moved) { clampPos(); S.pos = { left: host.style.left, top: host.style.top }; save() } else if (onClick) onClick();
    }
    window.addEventListener('pointermove', mv, true); window.addEventListener('pointerup', up, true);
  }

  function act(a) {
    switch (a.a) {
      case 'draft': S.draft = String(a.v || '').slice(0, 60); S.current = -1; S.end = null; render(); break;
      case 'groups': S.groups = (a.groups || []).map(function (s) { return String(s).slice(0, 60) }).slice(0, CFG.MAX_GROUPS); S.draft = ''; S.current = -1; S.end = null; S.note = null; S.notified = new Set(); if (ui) ui.clearDraft(); render(); save(); break;
      case 'fav': act({ a: 'favfilter', v: S.favFilter === 'fav' ? 'all' : 'fav' }); break;
      case 'favfilter': // switching tabs must not make the scan stop on every match that was hidden until now
        S.favFilter = ['all', 'fav', 'non'].indexOf(a.v) >= 0 ? a.v : 'all'; S.current = -1; S.note = null;
        computeMatches().forEach(function (m) { S.notified.add(m.id) }); render(); save(); break;
      case 'pause-each': S.pauseEach = !S.pauseEach; publish(); save(); break;
      case 'toggle-scroll': if (S.running) { stopScroll(); publish() } else { S.note = null; startScroll() } break;
      case 'prev': go(-1); break;
      case 'next': go(1); break;
      case 'show': var en = S.registry.get(a.id); if (en) { S.note = null; focusEntry(en) } break;
      case 'save':
        var key = S.groups.join(', ');
        if (!key || S.saved.indexOf(key) >= 0) break;
        if (S.saved.length >= CFG.MAX_SAVED) { S.statusKey = 'saveFull'; publish(); break }
        S.saved.push(key); publish(); save(); break;
      case 'load-saved': if (S.saved[a.i]) act({ a: 'groups', groups: S.saved[a.i].split(', ') }); break;
      case 'del-saved': S.saved.splice(a.i, 1); publish(); save(); break;
      case 'lang': S.lang = a.l; publish(); save(); break;
      case 'tips': S.showWelcome = true; S.welcomeStep = 1; publish(); break;
      case 'welcome-next': if (S.welcomeStep >= 3) { S.showWelcome = false; S.welcomeDone = true; save() } else S.welcomeStep++; publish(); break;
      case 'welcome-skip': S.showWelcome = false; S.welcomeDone = true; save(); publish(); break;
      case 'min': S.collapsed = !S.collapsed; publish(); save(); break;
      case 'speed': if (a.v === 'gentle' || a.v === 'fast') { S.speed = a.v; if (S.running) resetBreakCounter(); publish(); save() } break;
      case 'chat-note-ok': S.chatNote = false; S.chatNoteDismissed = true; publish(); save(); break;
      case 'close': suspend(); break;
      case 'side': try { chrome.runtime.sendMessage({ type: 'pns-open-side' }, function (r) { if (chrome.runtime.lastError || !r || !r.ok) { S.statusKey = 'side'; publish() } }) } catch (e) { S.statusKey = 'side'; publish() } break;
      case 'float': break; /* handled by the side panel itself */
      case 'end-see': if (ui) ui.scrollToResults(); break;
      case 'note-show': var n = S.note && S.registry.get(S.note.id); S.note = null; if (n) focusEntry(n); else publish(); break;
      case 'note-resume': S.note = null; startScroll(); break;
    }
    if (a.a !== 'draft') flushNow();
  }

  function buildHost() {
    host = document.createElement('div'); host.id = 'pns-host';
    host.style.cssText = 'position:fixed;top:70px;right:20px;z-index:2147483647;max-height:calc(100vh - 16px);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent;border-radius:18px;';
    var shadow = host.attachShadow({ mode: 'open' });
    ui = window.PNS_UI.mount(shadow, { mode: 'float', send: act, dragStart: dragStart });
    document.documentElement.appendChild(host);
    if (S.pos && S.pos.left && S.pos.top) { host.style.left = S.pos.left; host.style.top = S.pos.top; host.style.right = 'auto'; clampPos() }
    window.addEventListener('resize', function () { if (S.pos) clampPos() });
    applyHostVisibility();
  }

  /* ---------- messaging with popup / background / side panel ---------- */
  function wire() {
    try {
      chrome.runtime.onMessage.addListener(function (msg, _s, reply) {
        if (!msg || !msg.type) return;
        if (msg.type === 'pns-reset-pos') { resetPos(); S.collapsed = false; resume(); reply({ ok: true }) }
        else if (msg.type === 'pns-show') { resume(); reply({ ok: true }) }
        else if (msg.type === 'pns-off') { suspend(); reply({ ok: true }) }
        else if (msg.type === 'pns-lang') { S.lang = msg.lang; save(); publish(); reply({ ok: true }) }
        else if (msg.type === 'pns-ping') reply({ ok: true });
      });
      chrome.runtime.onConnect.addListener(function (p) {
        if (p.name !== 'pns-side') return;
        port = p; S.sideOpen = true; applyHostVisibility(); if (!observer) { startObserving(); render() }
        p.onMessage.addListener(function (m) { if (m && m.type === 'act' && m.a) act(m.a); else if (m && m.type === 'hello') { try { p.postMessage({ type: 'state', state: snapshot() }) } catch (e) { /* closed */ } } });
        p.onDisconnect.addListener(function () { if (port === p) port = null; S.sideOpen = false; applyHostVisibility(); if (S.closed) { stopScroll(); stopObserving() } flushNow() });
        try { p.postMessage({ type: 'state', state: snapshot() }) } catch (e) { /* closed */ }
      });
      if (chrome.storage && chrome.storage.onChanged) chrome.storage.onChanged.addListener(function (ch, area) {
        if (area === 'local' && ch[CFG.KEY] && ch[CFG.KEY].newValue && ch[CFG.KEY].newValue.lang && ch[CFG.KEY].newValue.lang !== S.lang) { S.lang = ch[CFG.KEY].newValue.lang; publish() }
      });
    } catch (e) { /* extension context invalidated (extension reloaded) */ }
  }

  function init() {
    load(function (saved, old) {
      var s = saved || {};
      if (!saved && old) { // migrate from Profile Hunter
        s = { groups: String(old.query || '').split(',').map(function (x) { return x.trim() }).filter(Boolean), favOnly: !!old.favOnly, saved: (old.quickFilters || []).slice(0, 3), welcomeDone: false };
      }
      S.groups = Array.isArray(s.groups) ? s.groups.slice(0, CFG.MAX_GROUPS) : [];
      S.speed = s.speed === 'fast' ? 'fast' : 'gentle'; S.chatNoteDismissed = !!s.chatNoteDismissed;
      S.favFilter = ['all', 'fav', 'non'].indexOf(s.favFilter) >= 0 ? s.favFilter : (s.favOnly ? 'fav' : 'all'); S.pauseEach = s.pauseEach !== false; S.saved = Array.isArray(s.saved) ? s.saved.slice(0, CFG.MAX_SAVED) : [];
      S.lang = s.lang || window.PNS_GUESS_LANG(); S.welcomeDone = !!s.welcomeDone; S.showWelcome = !S.welcomeDone; S.collapsed = !!s.collapsed; S.pos = s.pos || null;
      buildHost(); wire(); startObserving(); render(); flushNow();
      if (!s.lang) save();
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 1200);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1200) });
})();

/* Profile Name Search — content script (engine + floating panel host).
   Everything runs locally in your browser: nothing is sent anywhere, and the extension never clicks, likes or messages for you. */
(function () {
  'use strict';
  if (window.__pnsInjected) return;
  window.__pnsInjected = true;

  var CFG = {
    KEY: 'pns_state_v1', OLD_KEY: 'gnf_state_v3', DEBOUNCE_MS: 150, TICK_MS: 700, SLOW_TICK_MS: 1100, STEP: 0.85,
    STUCK_TICKS: 5, STUCK_GROWTH_MS: 4000, RECENT_GROWTH_MS: 1500, LIST_CAP: 150, MAX_SAVED: 3, MAX_GROUPS: 12
  };

  var S = {
    groups: [], draft: '', favOnly: false, pauseEach: true, saved: [], lang: null,
    welcomeDone: false, welcomeStep: 1, showWelcome: false, collapsed: false, closed: false,
    running: false, hasRun: false, scrollContainer: null, scrollTimer: null, statusKey: '', note: null, end: null,
    registry: new Map(), matches: [], current: -1, notified: new Set(), lastGrowthAt: 0, total: 0,
    sideOpen: false, pos: null, nogridTried: false
  };

  /* ---------- helpers ---------- */
  function T(k, v) { return window.PNS_T(S.lang || 'en', k, v) }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }
  function allCells() { return Array.prototype.slice.call(document.querySelectorAll('div[role="gridcell"]')) }

  // Query syntax: comma = OR, + = AND, "quotes" = exact phrase (spaces kept inside a term).
  function effectiveGroups() {
    var g = S.groups.slice(); var d = S.draft.trim(); if (d) g.push(d);
    return g.map(function (grp) {
      return grp.split('+').map(function (t) { return norm(t.trim().replace(/^"+|"+$/g, '').trim()) }).filter(Boolean);
    }).filter(function (a) { return a.length });
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
    var cells = allCells();
    for (var i = 0; i < cells.length; i++) {
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
  function computeMatches() {
    var groups = effectiveGroups(), hasName = groups.length > 0;
    if (!hasName && !S.favOnly) return [];
    return Array.from(S.registry.values()).filter(function (e) {
      if (hasName && !matchEntry(e, groups)) return false;
      if (S.favOnly && e.favorite !== true) return false;
      return true;
    });
  }

  // Where this card sits in the scrollable grid, so we can scroll back to it if Grindr unloads it later.
  function yOf(cell) {
    var c = S.scrollContainer && S.scrollContainer.isConnected ? S.scrollContainer : (S.scrollContainer = findScroller());
    if (!c) return null;
    return cell.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop;
  }

  function render() {
    var cells = allCells(), grew = false;
    S.total = cells.length;
    cells.forEach(function (cell) {
      var r = readIdentity(cell); if (!r.id || !r.name) return;
      if (r.upgradedFrom && S.registry.has(r.upgradedFrom)) S.registry.delete(r.upgradedFrom);
      var fav = readFav(cell), ex = S.registry.get(r.id);
      if (!ex) { S.registry.set(r.id, { id: r.id, name: r.name, thumb: r.thumb, cell: cell, favorite: fav, y: yOf(cell) }); grew = true }
      else { ex.name = r.name; if (r.thumb) ex.thumb = r.thumb; ex.cell = cell; ex.favorite = fav }
    });
    if (grew) S.lastGrowthAt = Date.now();

    var matches = computeMatches(); S.matches = matches;
    if (S.current >= matches.length) S.current = matches.length - 1;
    var ids = new Set(matches.map(function (m) { return m.id })), q = hasQuery() || S.favOnly;
    cells.forEach(function (cell) {
      cell.classList.remove('gnf-match', 'gnf-dim');
      cell.classList.remove('gnf-hidden');
      if (!q) return;
      var id = cell.dataset.gnfId;
      if (id && ids.has(id)) cell.classList.add('gnf-match'); else cell.classList.add('gnf-dim');
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
  var debounce = null;
  function scheduleRender() { clearTimeout(debounce); debounce = setTimeout(render, CFG.DEBOUNCE_MS) }
  var observer = null;
  function startObserving() { observer = new MutationObserver(scheduleRender); observer.observe(document.body, { childList: true, subtree: true, characterData: true }) }
  function stopObserving() { if (observer) observer.disconnect(); observer = null }

  /* ---------- auto-scroll ---------- */
  function startScroll() {
    if (!S.scrollContainer || !S.scrollContainer.isConnected) S.scrollContainer = findScroller();
    if (!S.scrollContainer) { S.statusKey = 'noGrid'; publish(); return }
    S.running = true; S.hasRun = true; S.end = null; S.note = null; S.statusKey = '';
    S.matches.forEach(function (m) { S.notified.add(m.id) });
    S.lastGrowthAt = Date.now(); publish();
    var stuck = 0;
    (function tick() {
      if (!S.running) return;
      var c = S.scrollContainer, before = c.scrollTop;
      c.scrollTop = Math.min(c.scrollTop + c.clientHeight * CFG.STEP, c.scrollHeight);
      setTimeout(function () {
        if (!S.running) return;
        var scrollStuck = c.scrollTop === before, contentStuck = Date.now() - S.lastGrowthAt > CFG.STUCK_GROWTH_MS;
        if (scrollStuck) {
          stuck++;
          if (stuck >= CFG.STUCK_TICKS && contentStuck) { reachEnd(); return }
        } else stuck = 0;
        var recently = Date.now() - S.lastGrowthAt < CFG.RECENT_GROWTH_MS;
        S.scrollTimer = setTimeout(tick, recently ? CFG.TICK_MS : CFG.SLOW_TICK_MS);
      }, 550);
    })();
  }
  function stopScroll() { S.running = false; if (S.scrollTimer) clearTimeout(S.scrollTimer); S.scrollTimer = null }
  function reachEnd() { stopScroll(); render(); S.end = { scanned: S.registry.size, found: S.matches.length }; publish() }

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
      var o = {}; o[CFG.KEY] = { groups: S.groups, favOnly: S.favOnly, pauseEach: S.pauseEach, saved: S.saved, lang: S.lang, welcomeDone: S.welcomeDone, collapsed: S.collapsed, pos: S.pos };
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
      groups: S.groups.slice(), hasDraft: !!S.draft.trim(), favOnly: S.favOnly, pauseEach: S.pauseEach, saved: S.saved.slice(),
      running: S.running, hasRun: S.hasRun, status: S.statusKey ? T(S.statusKey) : '',
      scanned: S.registry.size, found: q || S.favOnly ? S.matches.length : 0, favs: S.matches.filter(function (m) { return m.favorite }).length,
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
      case 'fav': S.favOnly = !S.favOnly; S.current = -1; render(); save(); break;
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
      case 'close': stopScroll(); S.closed = true; applyHostVisibility(); break;
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
        if (msg.type === 'pns-reset-pos') { resetPos(); S.collapsed = false; S.closed = false; applyHostVisibility(); publish(); reply({ ok: true }) }
        else if (msg.type === 'pns-show') { S.closed = false; applyHostVisibility(); flushNow(); reply({ ok: true }) }
        else if (msg.type === 'pns-lang') { S.lang = msg.lang; save(); publish(); reply({ ok: true }) }
        else if (msg.type === 'pns-ping') reply({ ok: true });
      });
      chrome.runtime.onConnect.addListener(function (p) {
        if (p.name !== 'pns-side') return;
        port = p; S.sideOpen = true; applyHostVisibility();
        p.onMessage.addListener(function (m) { if (m && m.type === 'act' && m.a) act(m.a); else if (m && m.type === 'hello') { try { p.postMessage({ type: 'state', state: snapshot() }) } catch (e) { /* closed */ } } });
        p.onDisconnect.addListener(function () { if (port === p) port = null; S.sideOpen = false; applyHostVisibility(); flushNow() });
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
      S.favOnly = !!s.favOnly; S.pauseEach = s.pauseEach !== false; S.saved = Array.isArray(s.saved) ? s.saved.slice(0, CFG.MAX_SAVED) : [];
      S.lang = s.lang || window.PNS_GUESS_LANG(); S.welcomeDone = !!s.welcomeDone; S.showWelcome = !S.welcomeDone; S.collapsed = !!s.collapsed; S.pos = s.pos || null;
      buildHost(); wire(); startObserving(); render(); flushNow();
      if (!s.lang) save();
    });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 1200);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1200) });
})();

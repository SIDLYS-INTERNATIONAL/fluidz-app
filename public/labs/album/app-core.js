'use strict';
/* Adult Album Creator: state, captions model, shell, navigation. Photos live in memory only. */
/* ---------------------------------------------------------------- helpers */
var LANGS = ['en', 'fr', 'es', 'pt', 'it', 'de'];
var P = window.AlbumPhrases, E = window.AlbumEngine;
var LS_KEY = 'fluidz_album_v1';
var L = window.LABS_LANG || 'en', LI = Math.max(0, LANGS.indexOf(L));
var MISS = []; window.__acpMiss = MISS;
function t(k, v) {
  var a = T[k], s;
  if (!a) { MISS.push(k); return k; }
  s = a[LI] || a[0];
  if (v) s = s.replace(/\{(\w+)\}/g, function (_, x) { return v[x] != null ? v[x] : ''; });
  return s;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
var INL = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  circle: '<circle cx="12" cy="12" r="9"/>'
};
function ico(n) { return INL[n] ? '<svg class="i" aria-hidden="true" viewBox="0 0 24 24">' + INL[n] + '</svg>' : '<svg class="i" aria-hidden="true"><use href="/labs/icons.svg#' + n + '"/></svg>'; }
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
function freeCv(c) { if (c) { try { c.width = 0; c.height = 0; } catch (e) {} } }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* i18n for static markup (data-i18n, -html, -ph, -aria, -title) */
function applyI18n(root) {
  $$('[data-i18n]', root).forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
  $$('[data-i18n-html]', root).forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  $$('[data-i18n-ph]', root).forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
  $$('[data-i18n-aria]', root).forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  $$('[data-i18n-title]', root).forEach(function (el) { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
}
function applyHead() {
  document.documentElement.lang = L;
  document.title = t('title.album-app');
  var m = $('meta[name="description"]'); if (m) m.setAttribute('content', t('desc.album-app'));
  var og = $('meta[property="og:title"]'); if (og) og.setAttribute('content', t('title.album-app'));
}

/* ---------------------------------------------------------------- state */
var PAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
var SLOT = { 1: 0, 2: 1, 3: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7 };
function pageOfSlot(i) { return i < 3 ? i + 1 : i + 2; }
function kindOf(p) { return p === 4 ? 'alert' : p === 10 ? 'rules' : p <= 3 ? 'normal' : 'private'; }
var BANK_OF = { 1: 'face', 2: 'intro', 3: 'intro', 4: 'alert', 5: 'likes', 6: 'likes', 7: 'likes', 8: 'likes', 9: 'likes', 10: 'end' };

var IDX = {};
if (P) Object.keys(P.banks).forEach(function (b) { P.banks[b].forEach(function (it) { IDX[it.id] = it; }); });
function txt(it, lang) { return it && it.t ? (it.t[lang] || it.t.en || '') : ''; }
function otherLang(l) { return l === 'es' ? 'en' : 'es'; }

function freshAnswers() {
  return {
    main: L, second: otherLang(L), secondOn: false, tone: 'playful', likes: [],
    rules: P ? P.banks.rules.slice(0, 3).map(function (r) { return r.id; }) : [], custom: [], pg: {}, ed: {}
  };
}
var S = {
  step: 0, consent: [false, false, false], mainTouched: false, tab: 'vibe', exp: {}, capSig: '', editing: null,
  slots: [null, null, null, null, null, null, null, null], loading: {}, stamp: true,
  blobs: null, names: null, urls: [], keep: true, pv: null, sheet: null, ownOpen: false, busy: false, hadSaved: false, genErr: false
};
(function () { var a = freshAnswers(); for (var k in a) S[k] = a[k]; })();

/* ---------------------------------------------------------------- persistence (answers only — never photos) */
function snapshot() {
  return { v: 1, main: S.main, second: S.second, secondOn: S.secondOn, tone: S.tone, likes: S.likes, rules: S.rules, custom: S.custom, pg: S.pg, ed: S.ed, stamp: S.stamp };
}
function saveAnswers() { if (S.keep) lsSet(LS_KEY, JSON.stringify(snapshot())); }
function loadAnswers() {
  var raw = lsGet(LS_KEY); if (!raw) return;
  try {
    var o = JSON.parse(raw); if (!o || o.v !== 1) return;
    if (LANGS.indexOf(o.main) >= 0) { S.main = o.main; S.mainTouched = true; }
    if (LANGS.indexOf(o.second) >= 0 && o.second !== S.main) S.second = o.second;
    S.secondOn = !!o.secondOn && S.second !== S.main;
    if (P.tones[o.tone]) S.tone = o.tone;
    if (Array.isArray(o.likes)) S.likes = o.likes.filter(function (id) { return IDX[id] && P.banks.likes.indexOf(IDX[id]) >= 0; });
    if (Array.isArray(o.rules)) S.rules = o.rules.filter(function (id) { return IDX[id] && P.banks.rules.indexOf(IDX[id]) >= 0; }).slice(0, 5);
    if (Array.isArray(o.custom)) S.custom = o.custom.filter(function (s) { return typeof s === 'string' && s.trim(); }).map(function (s) { return s.slice(0, 80); }).slice(0, 5);
    while (S.rules.length + S.custom.length > 5) S.custom.pop();
    if (o.pg && typeof o.pg === 'object') { Object.keys(o.pg).forEach(function (p) { if (IDX[o.pg[p]] && BANK_OF[p] && P.banks[BANK_OF[p]].indexOf(IDX[o.pg[p]]) >= 0) S.pg[p] = o.pg[p]; }); }
    if (Object.keys(S.pg).length === 10) {
      S.capSig = capSig();
      if (o.ed && typeof o.ed === 'object') Object.keys(o.ed).forEach(function (p) {
        var e = o.ed[p]; if (!e || e.id !== S.pg[p]) return;
        var x = { id: e.id };
        if (typeof e.main === 'string' && LANGS.indexOf(e.mainLang) >= 0) { x.main = e.main.slice(0, 160); x.mainLang = e.mainLang; }
        if (typeof e.second === 'string' && LANGS.indexOf(e.secondLang) >= 0) { x.second = e.second.slice(0, 160); x.secondLang = e.secondLang; }
        if (x.main != null || x.second != null) S.ed[p] = x;
      });
    } else { S.pg = {}; }
    if (typeof o.stamp === 'boolean') S.stamp = o.stamp;
    S.hadSaved = true;
  } catch (e) { S.pg = {}; S.ed = {}; }
}
function resetAnswers() {
  lsDel(LS_KEY);
  var a = freshAnswers(); for (var k in a) S[k] = a[k];
  S.mainTouched = false; S.capSig = ''; S.hadSaved = false; S.stamp = true; S.editing = null; S.ownOpen = false; S.exp = {};
  toast(t('acp.d.erased')); render();
}

/* ---------------------------------------------------------------- captions model */
function capSig() { return [S.tone, S.likes.slice(0, 5).join(','), S.likes.length].join('|'); }
function pickN(bank, n, exclude) {
  var r = [];
  try { r = P.pick(bank, S.tone, n, exclude) || []; } catch (e) {}
  if (r.length < n) {
    var ex = (exclude || []).concat(r.map(function (x) { return x.id; }));
    var rest = P.banks[bank].filter(function (it) { return ex.indexOf(it.id) < 0; });
    while (r.length < n && rest.length) r.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  }
  return r;
}
function buildCaps() {
  var sig = capSig();
  if (sig === S.capSig && Object.keys(S.pg).length === 10) return;
  var pg = {}, used;
  pg[1] = pickN('face', 1, [])[0].id;
  var iv = pickN('intro', 2, []); pg[2] = iv[0].id; pg[3] = iv[1].id;
  pg[4] = P.banks.alert[0].id;
  var ids = S.likes.slice(0, 5);
  if (ids.length < 5) ids = ids.concat(pickN('likes', 5 - ids.length, ids).map(function (x) { return x.id; }));
  for (var i = 0; i < 5; i++) pg[5 + i] = ids[i];
  pg[10] = P.banks.end[0].id;
  Object.keys(S.ed).forEach(function (p) { if (S.ed[p].id !== pg[p]) delete S.ed[p]; });
  S.pg = pg; S.capSig = sig;
}
function shufflePage(p) {
  var bank = BANK_OF[p], used = PAGES.filter(function (q) { return BANK_OF[q] === bank; }).map(function (q) { return S.pg[q]; });
  var c = pickN(bank, 1, used);
  if (!c.length) return false;
  S.pg[p] = c[0].id; delete S.ed[p];
  return true;
}
function capOf(p) {
  var id = S.pg[p], it = IDX[id], ed = S.ed[p] && S.ed[p].id === id ? S.ed[p] : null;
  var mainEdited = !!(ed && ed.main != null && ed.mainLang === S.main);
  var main = mainEdited ? ed.main : txt(it, S.main);
  var useSecond = S.secondOn && S.second !== S.main;
  var second = '';
  if (useSecond) second = (ed && ed.second != null && ed.secondLang === S.second) ? ed.second : txt(it, S.second);
  return { item: it, main: main, second: second, mainEdited: mainEdited };
}
function bigSplit(s) {
  s = String(s || '').trim();
  if (s.indexOf('\n') >= 0) { var ls = s.split(/\n+/); return [ls[0] || '', ls[1] || '', ls.slice(2).join(' ')]; }
  var m = s.match(/^(.+?[.!?…])\s+(.*)$/), first = m ? m[1] : s, rest = m ? m[2] : '';
  var w = first.split(/\s+/); if (w.length < 2) return [first, '', rest];
  var k = Math.ceil(w.length / 2);
  return [w.slice(0, k).join(' '), w.slice(k).join(' '), rest];
}
function endSplit(s) {
  s = String(s || '').trim();
  if (s.indexOf('\n') >= 0) { var ls = s.split(/\n+/); return [ls[0], ls.slice(1).join(' ')]; }
  var m = s.match(/^(.+?[.!?…])\s+(.*)$/);
  return m ? [m[1], m[2]] : [s, ''];
}
function rulesList() {
  var out = S.rules.map(function (id) { return txt(IDX[id], S.main); });
  return out.concat(S.custom).filter(Boolean).slice(0, 5);
}
function pageSpec(n) {
  if (n === 4) {
    var c = capOf(4), it = c.item, sp = it.split && it.split[S.main], l1, l2, sm;
    if (!c.mainEdited && sp) { l1 = sp[0]; l2 = sp[1]; sm = (it.small && it.small[S.main]) || ''; }
    else { var b = bigSplit(c.main); l1 = b[0]; l2 = b[1]; sm = b[2]; }
    return { kind: 'alert', line1: l1, line2: l2, small: sm, second: c.second, badge: P.img.badge };
  }
  if (n === 10) {
    var e = capOf(10), sp2 = e.item.split && e.item.split[S.main], a, b2;
    if (!e.mainEdited && sp2) { a = sp2[0]; b2 = sp2[1]; } else { var z = endSplit(e.main); a = z[0]; b2 = z[1]; }
    return { kind: 'end', line1: a, line2: b2, rules: rulesList(), tagline: P.img.tagline[S.main], madeWith: P.img.madeWith[S.main], second: e.second };
  }
  var cc = capOf(n), sl = S.slots[SLOT[n]];
  return { kind: 'photo', photo: sl && sl.photo, main: cc.main, second: cc.second, stamp: S.stamp, date: sl && sl.photo ? sl.photo.takenAt : null };
}
function specSig(n) {
  var sp = pageSpec(n), o = {};
  for (var k in sp) o[k] = k === 'photo' ? (sp.photo ? sp.photo.id + '#' + S.slots[SLOT[n]].ver : '') : k === 'date' ? (sp.date ? +sp.date : 0) : sp[k];
  return JSON.stringify(o);
}
function filled() { return S.slots.filter(Boolean).length; }

/* ---------------------------------------------------------------- UI shell */
var app, elTop, elProg, elMain, elFoot, elOv, elToast, fin;
var toastT = 0;
function toast(msg) {
  elToast.innerHTML = '<div role="status">' + esc(msg) + '</div>';
  clearTimeout(toastT); toastT = setTimeout(function () { elToast.innerHTML = ''; }, 3400);
}
function topHTML() {
  var s = S.step, langs = LANGS.map(function (l) {
    return '<li><button type="button" data-act="setlang" data-l="' + l + '"' + (l === L ? ' aria-current="true"' : '') + '><span>' + esc(P.langNames[l]) + '</span><b>' + l.toUpperCase() + '</b></button></li>';
  }).join('');
  var lang = '<div class="lang" id="lang"><button type="button" data-act="langmenu" aria-haspopup="true" aria-expanded="false" aria-label="' + esc(t('acp.langlabel')) + '">' + ico('globe') + '<span>' + L.toUpperCase() + '</span></button><ul>' + langs + '</ul></div>';
  var logo = '<span class="logo"><i></i>fluidz <small>labs</small></span>';
  if (s === 0) return '<a class="logo" href="/album-creator" aria-label="Fluidz Labs"><i></i>fluidz <small>labs</small></a><span class="sp"></span>' + lang;
  return '<button type="button" class="bk" data-act="back" aria-label="' + esc(t('acp.back')) + '">' + ico('chevron-left') + '</button><span class="st">' + esc(t('acp.step', { n: s })) + '</span><span class="sp"></span>' + logo + '<span class="pad"></span>' + lang;
}

var lastStep = -1;
function render(focusHead) {
  if (!P || !E) { elMain.innerHTML = '<p class="err">' + esc(t('acp.err.load')) + '</p>'; return; }
  var sc = elMain.scrollTop, fk = document.activeElement && document.activeElement.getAttribute ? document.activeElement.getAttribute('data-fk') : null;
  var open = elTop.querySelector('.lang.open');
  var r = SCREENS[S.step]();
  elTop.innerHTML = topHTML();
  elProg.firstChild.style.width = (S.step / 9 * 100) + '%';
  elProg.style.display = S.step ? '' : 'none';
  elMain.innerHTML = r.main;
  elMain.className = 'main' + (r.cls ? ' ' + r.cls : '');
  elFoot.innerHTML = r.foot || '';
  applyI18n(app);
  if (r.after) r.after();
  if (S.step === lastStep) elMain.scrollTop = sc; else elMain.scrollTop = 0;
  lastStep = S.step;
  if (focusHead) { var h = $('h1', elMain); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  else if (fk) { var n = $('[data-fk="' + fk + '"]', app); if (n) n.focus({ preventScroll: true }); }
}
var SCREENS = {};

/* ---------------------------------------------------------------- navigation */
function canEnter(n) {
  if (n >= 1 && !S.consent.every(Boolean)) return 0;
  if (n === 7) return ED ? 7 : 6;
  if (n >= 8 && filled() < 8) return n === 9 ? 6 : 6;
  if (n === 9 && !S.blobs) return 8;
  return n;
}
function setStep(n) {
  if (S.step === 7 && n !== 7) edFree();
  if (S.step === 8 && n !== 8) pvCancel();
  S.step = n; S.editing = null; S.sheet = null; elOv.innerHTML = '';
  render(true);
}
function go(n) {
  var m = canEnter(n); if (m !== n) n = m;
  try { history.pushState({ s: n }, ''); } catch (e) {}
  setStep(n);
}
function back() { if (S.busy) return; try { if (history.state && history.state.s > 0) { history.back(); return; } } catch (e) {} setStep(Math.max(0, S.step - 1)); }
window.addEventListener('popstate', function (e) {
  if (S.busy) { try { history.pushState({ s: S.step }, ''); } catch (x) {} return; }
  var n = e.state && typeof e.state.s === 'number' ? e.state.s : 0, m = canEnter(n);
  if (m !== n) { try { history.replaceState({ s: m }, ''); } catch (x) {} n = m; }
  setStep(n);
});

/* ---------------------------------------------------------------- sheets */
var sheetFrom = null;
function showSheet(kind, data) {
  sheetFrom = document.activeElement; S.sheet = { kind: kind, data: data };
  drawSheet(true);
}
function closeSheet() {
  S.sheet = null; elOv.innerHTML = '';
  if (sheetFrom && document.contains(sheetFrom)) { try { sheetFrom.focus({ preventScroll: true }); } catch (e) {} }
  sheetFrom = null;
}
function drawSheet(focus) {
  var sh = S.sheet; if (!sh) { elOv.innerHTML = ''; return; }
  var h = '';
  if (sh.kind === 'slot') {
    var i = sh.data, p = pageOfSlot(i);
    h = '<h2 id="sht">' + esc(t('acp.k.pg', { n: p })) + ' · ' + esc(t('acp.ty.' + kindOf(p))) + '</h2>' +
      '<button type="button" class="sa" data-act="replace" data-i="' + i + '">' + ico('refresh-cw') + esc(t('acp.p.replace')) + '</button>' +
      '<button type="button" class="sa" data-act="blur" data-i="' + i + '">' + ico('droplets') + esc(t('acp.p.blurone')) + '</button>' +
      '<button type="button" class="sa" data-act="move" data-d="-1" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + '>' + ico('chevron-left') + esc(t('acp.p.earlier')) + '</button>' +
      '<button type="button" class="sa" data-act="move" data-d="1" data-i="' + i + '"' + (i === 7 ? ' disabled' : '') + '>' + ico('chevron-right') + esc(t('acp.p.later')) + '</button>' +
      '<button type="button" class="sa dg" data-act="remove" data-i="' + i + '">' + ico('x') + esc(t('acp.p.remove')) + '</button>' +
      '<button type="button" class="btn btn-g btn-s" data-act="sheetclose">' + esc(t('acp.close')) + '</button>';
  } else if (sh.kind === 'pick') {
    var any = filled() > 0;
    h = '<h2 id="sht">' + esc(t('acp.p.pick')) + '</h2>';
    if (!any) h += '<p>' + esc(t('acp.p.pick0')) + '</p>';
    else h += '<div class="pk">' + S.slots.map(function (s, i) { return s ? '<button type="button" data-act="blur" data-i="' + i + '" aria-label="' + esc(t('acp.k.pg', { n: pageOfSlot(i) })) + '" data-pk="' + i + '"><b>' + pageOfSlot(i) + '</b></button>' : ''; }).join('') + '</div>';
    h += '<button type="button" class="btn btn-g btn-s" data-act="sheetclose">' + esc(t('acp.close')) + '</button>';
  } else if (sh.kind === 'wipe') {
    h = '<h2 id="sht">' + esc(t('acp.d.wipe.t')) + '</h2><p>' + esc(t('acp.d.wipe.p')) + '</p>' +
      '<button type="button" class="btn btn-p btn-s" data-act="wipe">' + esc(t('acp.d.wipe.ok')) + '</button>' +
      '<button type="button" class="btn btn-g btn-s" data-act="sheetclose">' + esc(t('acp.cancel')) + '</button>';
  }
  elOv.innerHTML = '<div class="ov" data-act="ovclose"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sht"><div class="gr"></div>' + h + '</div></div>';
  $$('[data-pk]', elOv).forEach(function (b) {
    var s = S.slots[+b.getAttribute('data-pk')]; if (!s) return;
    var c = document.createElement('canvas'); c.width = s.thumb.width; c.height = s.thumb.height; c.getContext('2d').drawImage(s.thumb, 0, 0); b.insertBefore(c, b.firstChild);
  });
  applyI18n(elOv);
  if (focus) { var f = $('.sheet button:not([disabled])', elOv); if (f) f.focus({ preventScroll: true }); }
}


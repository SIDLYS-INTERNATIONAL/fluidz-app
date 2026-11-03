'use strict';
/* Adult Album Creator: blur editor, preview, export, events, boot. */
/* ---------------------------------------------------------------- screen 7 : blur a detail */
var ED = null;
function openEditor(idx) {
  var s = S.slots[idx]; if (!s) return;
  var ph = s.photo, k = Math.min(1, 900 / Math.max(ph.width, ph.height)), sw = Math.max(1, Math.round(ph.width * k)), sh = Math.max(1, Math.round(ph.height * k));
  var base = document.createElement('canvas'); base.width = sw; base.height = sh;
  var bx = base.getContext('2d'); bx.imageSmoothingQuality = 'high'; bx.drawImage(ph.canvas, 0, 0, sw, sh);
  var work = document.createElement('canvas'); work.width = sw; work.height = sh;
  var view = document.createElement('canvas'); view.width = sw; view.height = sh;
  view.tabIndex = 0; view.setAttribute('role', 'img'); view.setAttribute('aria-label', t('acp.b.canvas'));
  ED = { idx: idx, slot: s, ph: ph, k: k, sw: sw, sh: sh, base: base, work: work, view: view, strokes: [], cur: null, tool: 'brush', pct: 7, cx: sw / 2, cy: sh / 2, kb: false };
  wireEditor();
  S.sheet = null; elOv.innerHTML = '';
  edRefresh();
  go(7);
}
function edSize() { return ED.pct / 100 * Math.min(ED.ph.width, ED.ph.height); }
function edScaled() {
  var k = ED.k;
  return ED.strokes.map(function (s) {
    return s.kind === 'circle' ? { kind: 'circle', cx: s.cx * k, cy: s.cy * k, r: s.r * k } : { kind: 'brush', size: s.size * k, points: s.points.map(function (p) { return { x: p.x * k, y: p.y * k }; }) };
  });
}
function edRefresh() {
  var w = ED.work, ctx = w.getContext('2d');
  ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(ED.base, 0, 0);
  if (ED.strokes.length) E.applyBlur({ canvas: w, width: w.width, height: w.height }, edScaled());
  edDraw();
}
function edDraw() {
  if (!ED) return;
  var v = ED.view, ctx = v.getContext('2d'), w = v.width, h = v.height;
  ctx.clearRect(0, 0, w, h); ctx.drawImage(ED.work, 0, 0);
  // page crop guide: the album page is 1179:2556 (cover, centred)
  var pr = 1179 / 2556, ir = w / h, cx0 = 0, cy0 = 0, cw = w, ch = h;
  if (ir > pr) { cw = h * pr; cx0 = (w - cw) / 2; } else { ch = w / pr; cy0 = (h - ch) / 2; }
  ctx.fillStyle = 'rgba(5,4,10,.62)';
  if (cx0 > 0.5) { ctx.fillRect(0, 0, cx0, h); ctx.fillRect(cx0 + cw, 0, w - cx0 - cw, h); }
  if (cy0 > 0.5) { ctx.fillRect(0, 0, w, cy0); ctx.fillRect(0, cy0 + ch, w, h - cy0 - ch); }
  if (cx0 > 0.5 || cy0 > 0.5) { ctx.strokeStyle = 'rgba(224,136,122,.8)'; ctx.lineWidth = Math.max(1, w / 400); ctx.setLineDash([w / 60, w / 90]); ctx.strokeRect(cx0 + .5, cy0 + .5, cw - 1, ch - 1); ctx.setLineDash([]); }
  var c = ED.cur, k = ED.k;
  ctx.fillStyle = 'rgba(224,136,122,.38)'; ctx.strokeStyle = 'rgba(224,136,122,.55)'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (c && c.kind === 'brush') {
    ctx.lineWidth = c.size * k; ctx.beginPath(); ctx.moveTo(c.points[0].x * k, c.points[0].y * k);
    for (var i = 1; i < c.points.length; i++) ctx.lineTo(c.points[i].x * k, c.points[i].y * k);
    ctx.stroke(); ctx.beginPath(); ctx.arc(c.points[0].x * k, c.points[0].y * k, c.size * k / 2, 0, 6.2832); ctx.fill();
  } else if (c && c.kind === 'circle') {
    ctx.beginPath(); ctx.arc(c.cx * k, c.cy * k, Math.max(1, c.r * k), 0, 6.2832); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#E0887A'; ctx.stroke();
  }
  if (ED.kb) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ED.cx, ED.cy, Math.max(4, edSize() * k / 2), 0, 6.2832); ctx.stroke(); }
}
function edPt(e) {
  var r = ED.view.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * ED.sw, y = (e.clientY - r.top) / r.height * ED.sh;
  return { x: Math.max(0, Math.min(ED.sw, x)) / ED.k, y: Math.max(0, Math.min(ED.sh, y)) / ED.k };
}
function wireEditor() {
  var v = ED.view, down = false;
  v.addEventListener('pointerdown', function (e) {
    if (e.button > 0 || !ED) return; e.preventDefault(); down = true;
    try { v.setPointerCapture(e.pointerId); } catch (x) {}
    var p = edPt(e);
    ED.cur = ED.tool === 'brush' ? { kind: 'brush', size: edSize(), points: [p] } : { kind: 'circle', cx: p.x, cy: p.y, r: 0 };
    edDraw();
  });
  v.addEventListener('pointermove', function (e) {
    if (!down || !ED || !ED.cur) return; var p = edPt(e), c = ED.cur;
    if (c.kind === 'brush') { var l = c.points[c.points.length - 1]; if (Math.hypot(p.x - l.x, p.y - l.y) * ED.k >= 1.5) c.points.push(p); }
    else c.r = Math.hypot(p.x - c.cx, p.y - c.cy);
    edDraw();
  });
  function up() {
    if (!down || !ED) return; down = false; var c = ED.cur; ED.cur = null; if (!c) return;
    if (c.kind === 'brush') { if (c.points.length === 1) c.points.push({ x: c.points[0].x + .01, y: c.points[0].y }); }
    else if (c.r < edSize() * 0.15) c.r = edSize() * 0.9;
    ED.strokes.push(c); edRefresh(); edButtons();
  }
  v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);
  v.addEventListener('focus', function () { if (ED) { ED.kb = true; edDraw(); } });
  v.addEventListener('blur', function () { if (ED) { ED.kb = false; edDraw(); } });
  v.addEventListener('keydown', function (e) {
    if (!ED) return; var st = (e.shiftKey ? 0.01 : 0.03) * Math.min(ED.sw, ED.sh), handled = true;
    if (e.key === 'ArrowLeft') ED.cx = Math.max(0, ED.cx - st); else if (e.key === 'ArrowRight') ED.cx = Math.min(ED.sw, ED.cx + st);
    else if (e.key === 'ArrowUp') ED.cy = Math.max(0, ED.cy - st); else if (e.key === 'ArrowDown') ED.cy = Math.min(ED.sh, ED.cy + st);
    else if (e.key === 'Enter' || e.key === ' ') { var px = ED.cx / ED.k, py = ED.cy / ED.k; ED.strokes.push({ kind: 'brush', size: edSize(), points: [{ x: px, y: py }, { x: px + .01, y: py }] }); edRefresh(); edButtons(); }
    else handled = false;
    if (handled) { e.preventDefault(); edDraw(); }
  });
}
function edFit() {
  if (!ED) return; var st = $('#stage'); if (!st) return;
  var aw = st.clientWidth, ah = st.clientHeight, s = Math.min(aw / ED.sw, ah / ED.sh);
  if (!(s > 0)) return; ED.view.style.width = Math.floor(ED.sw * s) + 'px'; ED.view.style.height = Math.floor(ED.sh * s) + 'px';
}
function edButtons() {
  if (!ED) return; var u = $('#undo'), a = $('#apply');
  if (u) u.disabled = !ED.strokes.length; if (a) a.disabled = !ED.strokes.length;
}
function edFree() { if (ED) { freeCv(ED.base); freeCv(ED.work); freeCv(ED.view); ED = null; } }
SCREENS[7] = function () {
  if (!ED) return { main: '', foot: '' };
  return {
    cls: 'edm',
    main: '<div class="ed-wrap"><div class="hd"><h1>' + esc(t('acp.p.blurone')) + '</h1><p class="lead" style="margin-bottom:8px">' + esc(t('acp.b.p')) + '</p></div>' +
      '<div class="stage" id="stage"></div><div class="tools">' +
      '<div class="trow"><div class="seg" role="group" aria-label="' + esc(t('acp.b.tool')) + '"><button type="button" data-act="tool" data-v="brush" aria-pressed="' + (ED.tool === 'brush') + '" data-fk="tb">' + ico('pen-line') + esc(t('acp.b.brush')) + '</button><button type="button" data-act="tool" data-v="circle" aria-pressed="' + (ED.tool === 'circle') + '" data-fk="tc">' + ico('circle') + esc(t('acp.b.circle')) + '</button></div>' +
      '<button type="button" class="und" id="undo" data-act="undo"' + (ED.strokes.length ? '' : ' disabled') + '>' + ico('undo') + esc(t('acp.b.undo')) + '</button></div>' +
      '<label class="sz"><span>' + esc(t('acp.b.size')) + '</span><input type="range" id="size" min="2" max="22" step="1" value="' + ED.pct + '" data-fk="size"></label>' +
      '<div class="warn">' + ico('info') + '<span>' + esc(t('acp.b.warn')) + ' ' + esc(t('acp.b.crop')) + '</span></div></div></div>',
    foot: '<div class="row"><button type="button" class="btn btn-g" data-act="back">' + esc(t('acp.cancel')) + '</button><button type="button" class="btn btn-p" id="apply" data-act="apply"' + (ED.strokes.length ? '' : ' disabled') + '>' + esc(t('acp.b.apply')) + '</button></div>',
    after: function () { var st = $('#stage'); if (st && ED) { st.appendChild(ED.view); edFit(); edDraw(); } }
  };
};
window.addEventListener('resize', function () { if (S.step === 7) edFit(); });

/* ---------------------------------------------------------------- screen 8 : preview */
var PV = { cv: [], sig: [], tok: 0, run: false };
function pvCancel() { PV.tok++; }
function pvStart() {
  var tok = ++PV.tok, todo = [];
  for (var i = 1; i <= 10; i++) { if (!PV.cv[i] || PV.sig[i] !== specSig(i)) todo.push(i); }
  if (!todo.length) return;
  (async function () {
    for (var j = 0; j < todo.length; j++) {
      if (tok !== PV.tok) return;
      var n = todo[j], sig = specSig(n);
      try {
        var c = await E.renderPage(pageSpec(n), 0.34);
        if (tok !== PV.tok) { freeCv(c); return; }
        if (PV.cv[n]) freeCv(PV.cv[n]);
        PV.cv[n] = c; PV.sig[n] = sig;
        var slot = S.step === 8 ? $('.pgc[data-n="' + n + '"]', elMain) : null;
        if (slot) { slot.classList.remove('sk'); slot.innerHTML = ''; slot.appendChild(c); c.setAttribute('role', 'img'); c.setAttribute('aria-label', t('acp.s.page', { n: n })); }
      } catch (e) {
        if (tok === PV.tok && S.step === 8) { toast(t('acp.s.err')); }
        return;
      }
      await wait(10);
    }
  })();
}
SCREENS[8] = function () {
  var noDate = S.slots.some(function (s) { return s && !s.photo.takenAt; });
  var pages = PAGES.map(function (n) { return '<div class="pgc sk" data-n="' + n + '" role="group" aria-roledescription="slide" aria-label="' + esc(t('acp.s.page', { n: n })) + '"></div>'; }).join('');
  return {
    main: '<h1>' + esc(t('acp.s.h')) + '</h1><p class="lead" style="margin-bottom:10px">' + esc(t('acp.s.p')) + '</p>' +
      '<div class="car" id="car" tabindex="0" role="region" aria-roledescription="carousel" aria-label="' + esc(t('acp.s.car')) + '">' + pages + '</div>' +
      '<div class="cnav"><button type="button" data-act="cprev" aria-label="' + esc(t('acp.s.prev')) + '">' + ico('chevron-left') + '</button><div class="dots" aria-hidden="true">' + PAGES.map(function (n) { return '<i data-d="' + n + '"></i>'; }).join('') + '</div><button type="button" data-act="cnext" aria-label="' + esc(t('acp.s.next')) + '">' + ico('chevron-right') + '</button></div>' +
      '<div class="pgl" id="pgl" aria-live="polite"></div>' +
      '<div class="card tgc"><button type="button" class="sw" role="switch" aria-checked="' + S.stamp + '" data-act="stamp" data-fk="stamp"><span style="flex:1;text-align:left"><span class="lb" style="display:block">' + esc(t('acp.s.stamp.t')) + '</span><span style="display:block;font-size:12.5px;color:var(--tx2);font-weight:500;margin-top:2px;line-height:1.4">' + esc(t('acp.s.stamp.p')) + '</span></span><span class="tg"></span></button>' +
      (S.stamp && noDate ? '<p class="hint" style="margin-top:6px">' + esc(t('acp.s.nodate')) + '</p>' : '') + '</div>',
    foot: '<button type="button" class="btn btn-p" data-act="create">' + ico('sparkles') + esc(t('acp.s.create')) + '</button>',
    after: function () {
      for (var n = 1; n <= 10; n++) {
        var c = PV.cv[n], slot = $('.pgc[data-n="' + n + '"]', elMain);
        if (c && c.width && slot) { slot.classList.remove('sk'); slot.appendChild(c); c.setAttribute('role', 'img'); c.setAttribute('aria-label', t('acp.s.page', { n: n })); }
      }
      var car = $('#car'); car.addEventListener('scroll', carSync, { passive: true }); carSync(); pvStart();
    }
  };
};
function carIdx() { var car = $('#car'); if (!car) return 0; var w = 212; return Math.max(0, Math.min(9, Math.round(car.scrollLeft / w))); }
function carSync() {
  var i = carIdx();
  $$('.dots i', elMain).forEach(function (d, k) { d.classList.toggle('on', k === i); });
  var l = $('#pgl'); if (l) l.textContent = t('acp.s.page', { n: i + 1 });
  var pv = $('[data-act=cprev]', elMain), nx = $('[data-act=cnext]', elMain); if (pv) pv.disabled = i === 0; if (nx) nx.disabled = i === 9;
}
function carGo(i) { var car = $('#car'); if (!car) return; i = Math.max(0, Math.min(9, i)); car.scrollTo({ left: i * 212, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }

/* ---------------------------------------------------------------- generation */
function showBusy(n, err) {
  if (err) { elOv.innerHTML = '<div class="busy" role="alertdialog" aria-labelledby="bt"><h2 id="bt">' + esc(t('acp.g.t')) + '</h2><p class="err">' + esc(t('acp.g.err')) + '</p><button type="button" class="btn btn-p" style="max-width:260px" data-act="create" data-fk="retry">' + esc(t('acp.g.retry')) + '</button><button type="button" class="btn btn-g" style="max-width:260px" data-act="busyclose">' + esc(t('acp.close')) + '</button></div>'; var b = $('[data-fk=retry]', elOv); if (b) b.focus(); return; }
  var h = '<div class="busy" role="alertdialog" aria-busy="true" aria-labelledby="bt"><div class="spin"></div><h2 id="bt">' + esc(t('acp.g.t')) + '</h2><p aria-live="polite">' + esc(t('acp.g.p', { n: n })) + '</p><div class="bar"><i style="width:' + ((n - 1) / 10 * 100) + '%"></i></div></div>';
  elOv.innerHTML = h;
}
function revokeOut() { S.urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); S.urls = []; S.blobs = null; S.names = null; }
async function createAll() {
  if (S.busy) return; S.busy = true; S.genErr = false;
  try {
    var names = E.fileNames(), blobs = [];
    for (var n = 1; n <= 10; n++) {
      showBusy(n); await wait(30);
      var c = await E.renderPage(pageSpec(n), 1);
      var b = await E.toBlobs([c]); freeCv(c);
      blobs.push(b[0]);
    }
    revokeOut(); S.blobs = blobs; S.names = names; S.urls = blobs.map(function (b) { return URL.createObjectURL(b); });
    S.busy = false; elOv.innerHTML = '';
    saveAnswers();
    go(9);
  } catch (e) { S.busy = false; showBusy(0, true); }
}

/* ---------------------------------------------------------------- screen 9 : ready */
function canShareFiles() {
  try { var f = new File([new Blob(['x'], { type: 'image/jpeg' })], 'a.jpg', { type: 'image/jpeg' }); return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [f] })); } catch (e) { return false; }
}
SCREENS[9] = function () {
  var th = (S.urls || []).map(function (u, i) { return '<a href="' + u + '" download="' + esc(S.names[i]) + '" aria-label="' + esc(t('acp.d.thumb', { n: i + 1 })) + '"><img src="' + u + '" alt=""><b>' + (i + 1) + '</b></a>'; }).join('');
  return {
    main: '<div class="ok">' + ico('check') + '</div><h1 class="cen">' + esc(t('acp.d.h')) + '</h1><p class="lead cen" style="margin-bottom:0">' + esc(t('acp.d.p')) + '</p>' +
      '<div class="strip">' + th + '</div>' +
      '<div class="acts"><button type="button" class="btn btn-p" data-act="save" data-fk="save">' + ico('images') + esc(t('acp.d.save')) + '</button>' +
      '<div class="row" style="display:flex;gap:10px"><button type="button" class="btn btn-g btn-s" data-act="zip" data-fk="zip">' + ico('download') + esc(t('acp.d.zip')) + '</button>' +
      (canShareFiles() ? '<button type="button" class="btn btn-g btn-s" data-act="share">' + ico('share-2') + esc(t('acp.d.share')) + '</button>' : '') + '</div></div>' +
      '<div class="card mt2 cinfo">' + ico('smartphone') + '<div><b>' + esc(t('acp.d.how.t')) + '</b><p>' + esc(t('acp.d.how.p')) + '</p></div></div>' +
      '<div class="card mt"><b style="font-size:14.5px">' + esc(t('acp.d.keep.t')) + '</b><p class="hint" style="margin:4px 0 4px">' + esc(t('acp.d.keep.p')) + '</p>' +
      '<button type="button" class="sw" role="switch" aria-checked="' + S.keep + '" data-act="keep" data-fk="keep"><span class="lb" style="font-size:14px">' + esc(t('acp.d.keep.sw')) + '</span><span class="tg"></span></button>' +
      '<div class="links2" style="justify-content:flex-start;margin-top:0"><a class="link" href="/my-labs" target="_blank" rel="noopener">' + esc(t('acp.d.id')) + ' ' + ico('external-link').replace('class="i"', 'class="i" style="display:inline;width:13px;height:13px;margin-left:4px;vertical-align:-1px"') + '</a><button type="button" class="link" data-act="reset">' + esc(t('acp.c0.reset')) + '</button></div></div>' +
      '<div class="cen mt2"><button type="button" class="link" data-act="startover">' + esc(t('acp.d.start')) + '</button></div>',
    foot: ''
  };
};
async function doSave() {
  if (!S.blobs) return;
  var r = await E.share(S.blobs, S.names);
  if (r === 'shared') toast(t('acp.d.saved'));
  else if (r === 'unsupported') { toast(t('acp.d.dl')); S.blobs.forEach(function (b, i) { setTimeout(function () { E.download(b, S.names[i]); }, i * 450); }); }
}
async function doShare() {
  if (!S.blobs) return;
  var r = await E.share(S.blobs, S.names);
  if (r === 'shared') toast(t('acp.d.saved'));
}
async function doZip(btn) {
  if (!S.blobs) return; if (btn) btn.disabled = true;
  try { var z = await E.zip(S.blobs, S.names); E.download(z, 'fluidz-album.zip'); } catch (e) { toast(t('acp.g.err')); }
  if (btn) btn.disabled = false;
}
function wipeAll() {
  S.slots.forEach(function (s) { if (s) { freeCv(s.photo.canvas); freeCv(s.thumb); } });
  S.slots = [null, null, null, null, null, null, null, null]; S.loading = {};
  PV.cv.forEach(freeCv); PV.cv = []; PV.sig = []; PV.tok++;
  revokeOut(); edFree();
  S.consent = [false, false, false];
  closeSheet(); S.sheet = null; elOv.innerHTML = '';
  try { history.pushState({ s: 0 }, ''); } catch (e) {}
  setStep(0);
}

/* ---------------------------------------------------------------- events */
function langMenu(open) {
  var l = $('#lang'); if (!l) return; l.classList.toggle('open', open);
  var b = l.querySelector('button'); b.setAttribute('aria-expanded', String(open));
  if (open) { var c = l.querySelector('[aria-current]') || l.querySelector('li button'); if (c) c.focus(); }
}
function setLang(l) {
  if (LANGS.indexOf(l) < 0) return; L = l; LI = LANGS.indexOf(l); window.LABS_LANG = l;
  try { localStorage.setItem('fluidz_lang', l); } catch (e) {}
  if (!S.mainTouched) { S.main = l; if (S.second === S.main) S.second = otherLang(S.main); S.secondOn = S.secondOn && S.second !== S.main; }
  applyHead(); render();
  if (S.sheet) drawSheet(false);
  var b = $('#lang button'); if (b) b.focus();
}
function toggleLike(id) {
  var i = S.likes.indexOf(id); if (i >= 0) S.likes.splice(i, 1); else S.likes.push(id);
}
function clickHandler(e) {
  var el = e.target.closest ? e.target.closest('[data-act]') : null;
  if (!el) { if (!e.target.closest('#lang')) langMenu(false); return; }
  var a = el.getAttribute('data-act');
  if (a === 'ovclose') { if (e.target === el && S.sheet) closeSheet(); return; }
  if (a !== 'langmenu' && a !== 'setlang') langMenu(false);
  switch (a) {
    case 'langmenu': langMenu(!$('#lang').classList.contains('open')); break;
    case 'setlang': setLang(el.getAttribute('data-l')); break;
    case 'back': back(); break;
    case 'start': if (S.consent.every(Boolean)) go(1); break;
    case 'next': go(S.step === 6 ? 8 : S.step + 1); break;
    case 'reset': resetAnswers(); break;
    case 'second': S.second = el.getAttribute('data-l'); S.secondOn = true; render(); break;
    case 'secondsw':
      S.secondOn = !S.secondOn; if (S.secondOn && S.second === S.main) S.second = otherLang(S.main); render(); break;
    case 'tone': S.tone = el.getAttribute('data-v'); render(); break;
    case 'tab': S.tab = el.getAttribute('data-g'); render(); break;
    case 'like': toggleLike(el.getAttribute('data-id')); render(); break;
    case 'exp': var k = el.getAttribute('data-k'); S.exp[k] = !S.exp[k]; render(); break;
    case 'rule':
      var id = el.getAttribute('data-id'), ri = S.rules.indexOf(id);
      if (ri >= 0) S.rules.splice(ri, 1); else if (S.rules.length + S.custom.length < 5) S.rules.push(id);
      render(); break;
    case 'ownopen': S.ownOpen = true; render(); var oi = $('#ownin'); if (oi) oi.focus(); break;
    case 'addown': addOwn(); break;
    case 'rmcustom': S.custom.splice(+el.getAttribute('data-i'), 1); render(); break;
    case 'edit': S.editing = { p: +el.getAttribute('data-p'), f: el.getAttribute('data-f') }; render(); var ta = $('textarea.ta', elMain); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } break;
    case 'shuffle':
      var sp = +el.getAttribute('data-p');
      if (!shufflePage(sp)) toast(t('acp.k.none')); render(); break;
    case 'slot':
      var si = +el.getAttribute('data-i');
      if (S.slots[si]) showSheet('slot', si); else { fin.multiple = true; S.pend = { start: si }; fin.click(); }
      break;
    case 'replace': fin.multiple = false; S.pend = { replace: +el.getAttribute('data-i') }; closeSheet(); fin.click(); break;
    case 'blur': openEditor(+el.getAttribute('data-i')); break;
    case 'blurpick': showSheet('pick'); break;
    case 'move':
      var mi = +el.getAttribute('data-i'), d = +el.getAttribute('data-d'), mj = mi + d;
      if (mj >= 0 && mj < 8) { var tmp = S.slots[mi]; S.slots[mi] = S.slots[mj]; S.slots[mj] = tmp; closeSheet(); render(); }
      break;
    case 'remove':
      var ri2 = +el.getAttribute('data-i'), s2 = S.slots[ri2];
      if (s2) { freeCv(s2.photo.canvas); freeCv(s2.thumb); S.slots[ri2] = null; }
      closeSheet(); render(); break;
    case 'sheetclose': closeSheet(); break;
    case 'tool': ED.tool = el.getAttribute('data-v'); $$('.seg button', elMain).forEach(function (b) { b.setAttribute('aria-pressed', String(b === el)); }); break;
    case 'undo': if (ED && ED.strokes.length) { ED.strokes.pop(); edRefresh(); edButtons(); } break;
    case 'apply':
      if (ED && ED.strokes.length) {
        E.applyBlur(ED.ph, ED.strokes); drawThumb(ED.slot.thumb, ED.ph); ED.slot.ver++;
        toast(t('acp.b.done')); history.back();
      }
      break;
    case 'stamp': S.stamp = !S.stamp; render(); break;
    case 'cprev': carGo(carIdx() - 1); break;
    case 'cnext': carGo(carIdx() + 1); break;
    case 'create': createAll(); break;
    case 'busyclose': elOv.innerHTML = ''; break;
    case 'save': doSave(); break;
    case 'share': doShare(); break;
    case 'zip': doZip(el); break;
    case 'keep': S.keep = !S.keep; if (S.keep) saveAnswers(); else lsDel(LS_KEY); render(); break;
    case 'startover': showSheet('wipe'); break;
    case 'wipe': wipeAll(); break;
  }
}
function addOwn() {
  var inp = $('#ownin'); if (!inp) return; var v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!v) { inp.focus(); return; }
  if (S.rules.length + S.custom.length >= 5) { toast(t('acp.r.full')); return; }
  if (S.custom.indexOf(v) < 0) S.custom.push(v);
  S.ownOpen = false; render();
}
function changeHandler(e) {
  var el = e.target;
  if (el.matches('input[data-k]')) {
    S.consent[+el.getAttribute('data-k')] = el.checked; el.closest('.chk').classList.toggle('on', el.checked);
    var b = $('#startb'); if (b) b.disabled = !S.consent.every(Boolean);
  } else if (el.matches('input[name=main]')) {
    S.main = el.value; S.mainTouched = true; if (S.second === S.main) { S.second = otherLang(S.main); } render();
  } else if (el.id === 'size' && ED) { ED.pct = +el.value; edDraw(); }
}
function inputHandler(e) {
  var el = e.target;
  if (el.id === 'size' && ED) { ED.pct = +el.value; edDraw(); }
  else if (el.matches && el.matches('textarea.ta')) autosize(el);
}
function keyHandler(e) {
  var el = e.target;
  if (e.key === 'Escape') {
    if (S.sheet) { closeSheet(); e.preventDefault(); return; }
    var l = $('#lang'); if (l && l.classList.contains('open')) { langMenu(false); var b = l.querySelector('button'); if (b) b.focus(); e.preventDefault(); return; }
    if (S.editing) { S.editing = null; render(); e.preventDefault(); return; }
  }
  if (e.key === 'Enter' && el.id === 'ownin') { e.preventDefault(); addOwn(); }
  else if (e.key === 'Enter' && !e.shiftKey && el.matches && el.matches('textarea.ta')) { e.preventDefault(); el.blur(); }
  else if (e.key === 'Tab' && S.sheet) {
    var f = $$('.sheet button:not([disabled])', elOv); if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); } else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); e.preventDefault(); }
  } else if (S.step === 8 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && el.id === 'car') { carGo(carIdx() + (e.key === 'ArrowRight' ? 1 : -1)); e.preventDefault(); }
}

/* ---------------------------------------------------------------- boot */
function boot() {
  app = $('#app'); elTop = $('#top'); elProg = $('#prog'); elMain = $('#main'); elFoot = $('#foot'); elOv = $('#ov'); elToast = $('#toast'); fin = $('#fin');
  applyHead();
  if (!P || !E) { elMain.innerHTML = '<p class="err">' + esc(t('acp.err.load')) + '</p>'; return; }
  loadAnswers();
  app.addEventListener('click', clickHandler);
  app.addEventListener('change', changeHandler);
  app.addEventListener('input', inputHandler);
  app.addEventListener('keydown', keyHandler);
  app.addEventListener('focusout', function (e) {
    var el = e.target;
    if (el.matches && el.matches('textarea.ta') && S.editing && !el.__done) { el.__done = true; commitEdit(el); }
  });
  fin.addEventListener('change', function () {
    var files = Array.prototype.slice.call(fin.files || []), pend = S.pend || {}; fin.value = '';
    addFiles(files, pend.start, pend.replace);
  });
  // drag & drop photos onto the photo screen
  elMain.addEventListener('dragover', function (e) { if (S.step === 6) { e.preventDefault(); elMain.classList.add('drop'); } });
  elMain.addEventListener('dragleave', function () { elMain.classList.remove('drop'); });
  elMain.addEventListener('drop', function (e) { elMain.classList.remove('drop'); if (S.step === 6) { e.preventDefault(); addFiles(e.dataTransfer.files, 0); } });
  try { history.replaceState({ s: 0 }, ''); } catch (e) {}
  render(false);
}
window.__album = { S: S, go: go, t: t, T: T };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

/* Profile Name Search — panel UI. Pure view: renders the state sent by the engine (content.js) and sends actions back.
   Used in two hosts: the floating panel (content script, inside a shadow root) and Chrome's side panel.

   Layout: header (by Fluidz · ⚙) — banners — three numbered blocks, only one open at a time:
     ① Search  ② Scan  ③ Results   — then a folded "Advanced" row (editor, saved searches, journal, comparison, marks).
   Everything rare lives in an overlay that replaces the blocks (← back): settings, my data, self-test, help, editor... */
(function (g) {
  'use strict';
  var C = g.PNS_CRIT;
  var FLUIDZ = 'https://fluidz.app', FEEDBACK = 'hello@fluidz.app';

  var CSS = g.PNS_UI_CSS || ''; // the stylesheet lives in ui-css.js (loaded first)

  /* ---------- tiny DOM helpers ---------- */
  function ic(name) {
    var inner = (g.PNS_ICONS || {})[name] || '';
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'ic'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = inner; // static, bundled markup only
    return s;
  }
  function h(tag, attrs) {
    var e = document.createElement(tag), a = attrs || {};
    if (a.cls) e.className = a.cls;
    if (a.text != null) e.textContent = a.text;
    if (a.title) { e.title = a.title; e.setAttribute('aria-label', a.title) }
    if (a.type) e.type = a.type;
    if (a.on) for (var k in a.on) e.addEventListener(k, a.on[k]);
    if (a.attrs) for (var n in a.attrs) if (a.attrs[n] != null) e.setAttribute(n, a.attrs[n]);
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i]; if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) e.appendChild(typeof x === 'string' ? document.createTextNode(x) : x) });
      else e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }
  function btn(cls, label, onclick, icon, title) { return h('button', { type: 'button', cls: cls, title: title, on: { click: onclick } }, icon ? ic(icon) : null, label != null ? h('span', { text: label }) : null) }
  function stopKeys(el) { ['keydown', 'keyup', 'keypress'].forEach(function (k) { el.addEventListener(k, function (e) { e.stopPropagation() }) }); return el } // Grindr's own shortcuts must not fire while typing

  function mount(host, ctx) {
    var side = ctx.mode === 'side', S = null, lang = 'en';
    var T = function (k, v) { return g.PNS_T(lang, k, v) };
    var style = document.createElement('style'); style.textContent = CSS;
    var root = h('div', { cls: 'root' + (side ? ' side' : '') });
    host.appendChild(style); host.appendChild(root);

    // View-only state (each panel has its own): which block is open, which overlay, menus, editor draft...
    var V = { block: 1, ov: null, adv: false, menu: null, rename: null, confirm: null, ed: null, edFor: null, edSave: false, cmpA: '', cmpB: '', mtab: 'review', moveFor: null, ovArg: null };
    var kind = '', slots = {}, sigs = {}, lastRunning = false, lastEnd = null, lastNote = null;

    function send(a) { ctx.send(a) }
    function nameOf(id) { var s = (S.searches || []).filter(function (x) { return x.id === id })[0]; return s ? s.name : '' }
    function fmtN(n) { try { return Number(n).toLocaleString(lang === 'en' ? 'en-US' : lang).replace(/[  ]/g, ' ') } catch (e) { return String(n) } }
    function fmtDate(t) { try { return new Date(t).toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch (e) { return new Date(t).toISOString() } }
    function avatar(thumb, cls) { return thumb ? h('img', { cls: 'av' + (cls ? ' ' + cls : ''), attrs: { src: thumb, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' } }) : h('div', { cls: 'av' }) }
    function toggle(on, label, action, extra) { return h('button', { type: 'button', cls: 'tg', attrs: { role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': label }, on: { click: function () { send(Object.assign({ a: action }, extra || {})) } } }, h('i')) }
    function openOv(k, arg) { V.ov = k; V.ovArg = arg || null; V.menu = null; V.rename = null; V.confirm = null; redraw() }
    function closeOv() { if (V.ov === 'scan' || V.ov === 'compare') { send({ a: 'scan-open', id: null }); send({ a: 'compare' }) } V.ov = V.ov === 'scan' || V.ov === 'compare' ? 'journal' : (V.ov === 'data' || V.ov === 'selftest' || V.ov === 'help' && V.ovArg === 'settings' ? 'settings' : null); V.ovArg = null; V.menu = null; V.confirm = null; redraw() }
    function openBlock(n) { V.block = n; V.ov = null; redraw() }
    function redraw() { if (S) update(S, true) }

    /* ---------- the search field: chips (as in 2.x) + one input, kept across re-renders so focus and caret survive ----------
       A chip = one alternative of the search ("dom + top" = dom AND top inside the chip); chips are OR alternatives.
       Comma or Enter turns what is typed into a chip, "+ word" continues the last chip (AND), Backspace removes the last chip,
       click a chip to edit it. Searches that need more (synonyms, exclusions, whole word, saved blocks) show the summary instead. */
    var typing = false, quiet = false;
    var input = stopKeys(h('input', { type: 'text', attrs: { autocomplete: 'off', spellcheck: 'false', maxlength: '400', 'aria-label': 'search' } }));
    // Simple form of a query: [{ terms: ['dom', 'top'], text: 'dom + top' }, ...] or null when it needs the readable summary.
    function chipsOf(q) {
      q = C.clean(q); if (q.exclude.length) return null;
      var plain = function (it) { return it.ref == null && !it.name && it.terms.every(function (t) { return !t.w }) };
      var one = function (gr) { return C.serialize({ groups: [gr], exclude: [] }) };
      if (q.groups.length === 1 && q.groups[0].items.length === 1 && plain(q.groups[0].items[0])) return q.groups[0].items[0].terms.map(function (t) { return { terms: [t.t], text: one({ items: [{ name: '', terms: [t] }] }) } });
      var out = [];
      for (var i = 0; i < q.groups.length; i++) { var gr = q.groups[i]; if (!gr.items.every(function (it) { return plain(it) && it.terms.length === 1 })) return null; out.push({ terms: gr.items.map(function (it) { return it.terms[0].t }), text: one(gr) }) }
      return out;
    }
    // The chips as the panel knows them right now: the engine answers a little later, so a search just sent is used until the state catches up
    // (paste "top, dom" then Enter at once must not lose "top").
    var sentText = null;
    function setText(v) { sentText = v; send({ a: 'set-text', v: v }) }
    function curQ() { return sentText != null ? C.parse(sentText, resolver).q : S.q }
    function chipsText(list) { return (list || chipsOf(curQ()) || []).map(function (c) { return c.text }).join(', ') }
    // Chips + what is typed, as one text. A draft starting with "+" continues the last chip (AND), otherwise it is a new chip (OR).
    function joinPiece(base, d) { d = String(d || '').trim(); if (!d) return base; if (!base) return d.replace(/^\+\s*/, ''); return /^\+/.test(d) ? base + ' ' + d : base + ', ' + d }
    function combineText(draft) { return joinPiece(chipsText(), draft) }
    var resolver = function (n) { var f = (S.searches || []).filter(function (x) { return C.norm(x.name) === C.norm(n) })[0]; return f ? f.id : null };
    // Splits typed text at OR separators (outside quotes and parentheses): complete pieces become chips, `last` stays in the input.
    function splitOr(str) {
      var pieces = [], cur = '', inQ = false, depth = 0;
      for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if (/["“”]/.test(ch)) inQ = !inQ; else if (!inQ && ch === '(') depth++; else if (!inQ && ch === ')') depth = Math.max(0, depth - 1);
        if (!inQ && !depth && /[,，;|]/.test(ch)) { if (cur.trim()) pieces.push(cur.trim()); cur = ''; continue }
        cur += ch;
      }
      return { pieces: pieces, last: pieces.length ? cur.replace(/^\s+/, '') : cur };
    }
    input.addEventListener('input', function () {
      if (/＋/.test(input.value)) input.value = input.value.replace(/＋/g, '+');
      var sp = splitOr(input.value);
      if (sp.pieces.length) { var txt = chipsText(); sp.pieces.forEach(function (p) { if (!/["“”]/.test(p)) p = p.replace(/\s*\+\s*$/, ''); txt = joinPiece(txt, p) }); input.value = sp.last; setText(txt) }
      typing = !!input.value.trim();
      send({ a: 'draft', v: typing ? combineText(input.value) : null }); renderLive();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!input.value.trim()) { send({ a: e.shiftKey ? 'prev' : 'next' }); return }
        if (C.parse(input.value).pending) return; // "dom +" waits for its next word
        commit();
      } else if (e.key === 'Backspace' && !input.value) { var ch = chipsOf(curQ()); if (ch && ch.length) setText(chipsText(ch.slice(0, -1))) }
      else if (e.key === 'Escape') { if (input.value.trim() && !C.parse(input.value).pending) commit(); else { typing = false; input.value = ''; send({ a: 'draft', v: null }); renderLive() } } // Esc leaves the field; a chip being edited is not lost
    });
    input.addEventListener('blur', function () { if (!quiet && typing && !C.parse(input.value).pending) commit() });
    function commit() { var v = combineText(input.value); typing = false; input.value = ''; setText(v) }
    function editChip(i) { // the chip goes back into the input, the others stay
      var ch = chipsOf(curQ()) || [], c = ch[i]; if (!c) return;
      var rest = chipsText(ch.filter(function (_, j) { return j !== i }));
      setText(rest); input.value = c.text; typing = true; send({ a: 'draft', v: joinPiece(rest, c.text) });
      setTimeout(function () { input.focus(); try { input.setSelectionRange(c.text.length, c.text.length) } catch (e) { /* ignore */ } }, 0);
    }
    function insertText(t, replace) { // from the "?" help: an example replaces the search, a keyword is added as a chip (OR)
      V.ov = null; V.block = 1; typing = false; input.value = ''; setText(replace ? t : joinPiece(chipsText(), t)); redraw();
      setTimeout(function () { input.focus() }, 0);
    }
    function opEl(kind) { return h('i', { cls: 'op ' + kind, text: T(kind === 'or' ? 'opOr' : 'opAnd') }) }
    function chipBody(c) { var out = []; c.terms.forEach(function (t, ti) { if (ti) out.push(opEl('and')); out.push(h('span', { text: t })) }); return out }
    function buildField() {
      var f = h('div', { cls: 'field', on: { click: function (e) { if (e.target === f) input.focus() } } });
      var ch = chipsOf(S.q) || [];
      ch.forEach(function (c, i) {
        if (i) f.appendChild(h('span', { cls: 'orp', text: T('opOr') }));
        var ct = h.apply(null, ['span', { cls: 'ct', title: T('chipEdit'), attrs: { role: 'button', tabindex: '0' }, on: { click: function (e) { e.stopPropagation(); editChip(i) }, keydown: function (e) { if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); editChip(i) } } } }].concat(chipBody(c)));
        f.appendChild(h('span', { cls: 'chip', attrs: { 'data-chip': String(i) } }, ct, h('button', { type: 'button', title: T('clearChip') + ': ' + c.text, on: { click: function (e) { e.stopPropagation(); setText(chipsText(ch.filter(function (_, j) { return j !== i }))) } } }, ic('x'))));
      });
      input.placeholder = ch.length ? '' : T('ph');
      f.appendChild(input);
      return f;
    }

    // Readable lines for a query: "Size  XL · XXL", "and also", "or else", "Without  bot".
    function linesEl(q, pending) {
      var box = h('div', { cls: 'lines' });
      var ls = C.summary(q, nameOf);
      ls.forEach(function (l, i) {
        if (l.or) box.appendChild(h('div', { cls: 'or', text: T('orElse') }));
        else if (i > 0 && l.kind !== 'x') box.appendChild(h('div', { cls: 'and', text: T('andAlso') }));
        var row = h('div', { cls: 'l' + (l.kind === 'x' ? ' x' : '') });
        if (l.kind === 's') { row.appendChild(ic('folder')); row.appendChild(document.createTextNode(' ')); row.appendChild(h('b', { text: l.label })); if (l.missing) row.appendChild(h('span', { cls: 'miss', text: T('refMissing') })); box.appendChild(row); return }
        if (l.kind === 'x') row.appendChild(h('b', { text: T('without') }));
        else if (l.label) row.appendChild(h('b', { text: l.label }));
        l.terms.forEach(function (t, ti) { if (ti) row.appendChild(h('span', { cls: 'sep', text: '·' })); row.appendChild(h('span', { cls: 'tm' + (t.w ? ' w' : ''), text: t.t, title: t.w ? T('wholeOn') : null })) });
        box.appendChild(row);
      });
      if (pending) box.appendChild(h('div', { cls: 'wait', text: T('andAlso') + ' … ' + T('sumWait') }));
      return box;
    }
    // One line under the field, from the chips + what is typed: "Looking for: dom AND top OR 🚀" (readable lines when the text needs more).
    function renderLive() {
      var box = slots.live; if (!box) return;
      while (box.firstChild) box.removeChild(box.firstChild);
      var text = typing && input.value.trim() ? combineText(input.value) : chipsText();
      if (!text.trim()) { box.style.display = 'none'; return }
      var p = C.parse(text, resolver), ch = chipsOf(p.q);
      box.style.display = '';
      if (!ch) { box.appendChild(linesEl(p.q, p.pending)); return }
      var line = h('div', { cls: 'sum' }, document.createTextNode(T('sumLbl') + ' '));
      ch.forEach(function (c, gi) {
        if (gi) { line.appendChild(document.createTextNode(' ')); line.appendChild(opEl('or')); line.appendChild(document.createTextNode(' ')) }
        c.terms.forEach(function (t, ti) { if (ti) { line.appendChild(document.createTextNode(' ')); line.appendChild(opEl('and')); line.appendChild(document.createTextNode(' ')) } line.appendChild(h('b', { text: t })) });
      });
      if (p.pending) { line.appendChild(document.createTextNode(' ')); line.appendChild(opEl('and')); line.appendChild(h('em', { cls: 'wait', text: ' ' + T('sumWait') })) }
      box.appendChild(line);
    }

    /* ---------- header ---------- */
    function buildHeader() {
      var left = h('div', { cls: 'brand' },
        side ? null : h('span', { cls: 'grip', title: T('drag'), on: { pointerdown: function (e) { ctx.dragStart && ctx.dragStart(e) } } }, ic('grip-vertical')),
        h('span', { cls: 'drop' }),
        h('div', null, h('b', { text: 'Profile Name Search' }), h('a', { text: T('byFluidz'), attrs: { href: FLUIDZ, target: '_blank', rel: 'noopener noreferrer' } })));
      var btns = h('div', { cls: 'btns' },
        h('button', { type: 'button', cls: V.ov === 'settings' ? 'on' : '', title: T('settings'), on: { click: function () { if (V.ov === 'settings') closeOv(); else openOv('settings') } } }, ic('settings')),
        h('button', { type: 'button', title: side ? T('floatBack') : T('side'), on: { click: function () { send({ a: side ? 'float' : 'side' }) } } }, ic('panel-right')),
        side ? null : h('button', { type: 'button', title: T('min'), on: { click: function () { send({ a: 'min' }) } } }, ic('minus')),
        side ? null : h('button', { type: 'button', title: T('close'), on: { click: function () { send({ a: 'close' }) } } }, ic('x')));
      return h('div', { cls: 'hd' }, left, btns);
    }

    /* ---------- banners ---------- */
    function card(cls, icon, title, text, actions) {
      return h('div', { cls: 'card ' + cls, attrs: { role: 'status' } }, h('h4', null, ic(icon), h('span', { text: title })), text ? h('p', { text: text }) : null, actions ? h('div', { cls: 'acts' }, actions) : null);
    }
    function buildCards() {
      var box = h('div', { attrs: { style: 'display:contents' } });
      if (S.toast) {
        var tv = S.toast.v || {}, tk = S.toast.k;
        var msg = tk === 'tImported' ? T('tImported', { s: tv.searches || 0, f: tv.folders || 0, m: tv.marks || 0, j: tv.scans || 0 }) : T(tk, tv);
        box.appendChild(h('div', { cls: 'toast', attrs: { role: 'status' } }, h('span', { text: msg }), btn('', null, function () { send({ a: 'toast-ok' }) }, 'x', T('dismiss'))));
      }
      if (S.otherTabs > 0) box.appendChild(card('warn', 'triangle-alert', T('tabsTitle'), T('tabsText'), [btn('', T('gotIt'), function () { send({ a: 'tabs-ok' }) })]));
      if (S.sideHint && !side) box.appendChild(card('sidehint', 'panel-right', T('sideHintT'), T('sideHint'), [btn('', T('gotIt'), function () { send({ a: 'side-hint-ok' }) })]));
      if (S.crash) box.appendChild(card('warn', 'triangle-alert', T('crashTitle'), T('crashText', { n: S.crash.n }), [btn('p', T('resumeScan'), function () { send({ a: 'crash-resume' }) }), btn('', T('openJournal'), function () { send({ a: 'crash-ok' }); openOv('journal') })]));
      if (S.interrupted && !S.running) box.appendChild(card('warn', 'history', T('intTitle'), T('intText', { d: fmtDate(S.interrupted.t), n: S.interrupted.n, q: S.interrupted.qText }), [btn('p', T('resumeScan'), function () { send({ a: 'interrupted-resume' }); V.block = 2 }), btn('', T('openJournal'), function () { send({ a: 'interrupted-ok' }); openOv('journal') }), btn('', T('dismiss'), function () { send({ a: 'interrupted-ok' }) })]));
      if (S.cap) box.appendChild(card('warn', 'timer', T('capTitle'), T('capText', { m: S.settings.capMin }), [btn('p', T('resumeScan'), function () { send({ a: 'toggle-scroll' }) }), btn('', T('gotIt'), function () { send({ a: 'cap-ok' }) })]));
      if (S.notice === 'kept' && S.view === 'panel') box.appendChild(card('ok', 'circle-check', T('keptTitle'), T('keptText', { n: (S.searches || []).length }), [btn('', T('gotIt'), function () { send({ a: 'notice-ok' }) })]));
      if (S.note) {
        box.appendChild(h('div', { cls: 'card note' }, avatar(S.note.thumb),
          h('div', { cls: 'tx' }, h('b', { cls: 'nmx', text: T('noteTitle', { name: S.note.name }) }), h('small', { text: T('noteText') })),
          h('div', { cls: 'na' }, h('button', { type: 'button', cls: 'p', text: T('noteShow'), on: { click: function () { send({ a: 'note-show' }) } } }),
            h('button', { type: 'button', text: T('noteResume'), on: { click: function () { send({ a: 'note-resume' }) } } }))));
      }
      if (S.end) box.appendChild(card('end', 'flag', T('endTitle'), T('endText', { n: fmtN(S.end.scanned) }), [btn('p', S.end.found ? T('endSee', { k: S.end.found }) : T('endSee0'), function () { send({ a: 'end-see' }); openBlock(3) })]));
      if (S.chatNote) box.appendChild(h('div', { cls: 'card', attrs: { role: 'note' } }, h('p', { text: T('chatNote') }), h('p', { text: T('chatTip'), attrs: { style: 'color:var(--tx3)' } }), h('div', { cls: 'acts' }, btn('', T('gotIt'), function () { send({ a: 'chat-note-ok' }) }))));
      return box;
    }

    /* ---------- the three blocks ---------- */
    function blockHead(n, title, summary, hot, extra) {
      var on = V.block === n;
      return h('div', { cls: 'bhw', attrs: { style: 'display:flex;align-items:center;gap:4px;padding-right:' + (extra ? '8px' : '0') } },
        h('button', { type: 'button', cls: 'bh', attrs: { 'aria-expanded': on ? 'true' : 'false', 'data-b': String(n) }, on: { click: function () { openBlock(on ? 0 : n) } } },
          h('span', { cls: 'n', text: String(n) }), h('span', { cls: 't', text: title }), h('span', { cls: 's' + (hot ? ' hot' : '') }, summary), ic('chevron-right')),
        extra || null);
    }
    function wrapBlock(n, head, body) { var on = V.block === n; return h('section', { cls: 'blk' + (on ? ' on' : ''), attrs: { 'data-block': String(n) } }, head, on ? h('div', { cls: 'bb' }, body) : null) }

    function buildB1() {
      var has = !C.isEmpty(S.q), short = C.shortText(S.q, nameOf, 40);
      var head = blockHead(1, T('b1'), has ? short : T('b1none'), has);
      if (V.block !== 1) return wrapBlock(1, head);
      var row = h('div', { cls: 'frow' }, buildField(),
        (has || typing) ? h('button', { type: 'button', cls: 'fbtn clr', title: T('clearSearch'), on: { click: function () { typing = false; input.value = ''; sentText = ''; send({ a: 'clear-q' }); renderLive() } } }, ic('x')) : null,
        h('button', { type: 'button', cls: 'fbtn q', title: T('helpSyntax'), text: '?', on: { click: function () { openOv('help') } } }));
      slots.live = h('div', { attrs: { 'aria-live': 'polite' } });
      var body = [row, slots.live];
      // The chips are the summary; only a search the chips cannot show (synonyms, exclusions, whole word, saved blocks) gets "Active search [Edit]".
      if (has && !chipsOf(S.q)) body.push(h('div', { cls: 'act' }, h('div', { cls: 'top' }, h('span', { text: T('activeSearch') }), btn('edit', T('edit'), function () { openEditor(S.q, null) }, 'pencil')), linesEl(S.q)));
      var nSaved = (S.searches || []).length;
      body.push(h('div', { cls: 'links' },
        btn('lk', T('saveSearch'), function () { openOv('searches', 'save') }, 'star', null),
        btn('lk', T('mySearches', { n: nSaved }), function () { openOv('searches') }, 'folder'),
        btn('lk', T('advCriteria'), function () { openEditor(S.q, null) }, 'list-filter')));
      if (has) body.push(h('button', { type: 'button', cls: 'cta', on: { click: function () { V.block = 2; redraw(); if (!S.running) send({ a: 'toggle-scroll' }) } } }, ic('play'), h('span', { text: S.hasRun ? T('resume') : T('start') })));
      renderLive();
      return wrapBlock(1, head, body);
    }
    function buildB2() {
      var run = S.running, sum = run ? [h('span', { cls: 'dot' }), document.createTextNode(T('scanning') + ' · ' + fmtN(S.scanned))] : (S.hasRun ? T('nScanned', { n: fmtN(S.scanned) }) : T('b2idle'));
      var mini = (S.hasQuery || S.favFilter === 'fav') && V.block !== 2 ? h('button', { type: 'button', cls: 'mini', title: run ? T('pause') : (S.hasRun ? T('resume') : T('start')), on: { click: function () { send({ a: 'toggle-scroll' }) } } }, ic(run ? 'pause' : 'play')) : null;
      var head = blockHead(2, T('b2'), sum, run, mini);
      if (V.block !== 2) return wrapBlock(2, head);
      var label = run ? T('pause') : (S.hasRun ? T('resume') : T('start'));
      var body = [h('button', { type: 'button', cls: 'go' + (run ? ' stop' : ''), on: { click: function () { send({ a: 'toggle-scroll' }) } } }, ic(run ? 'pause' : 'play'), h('span', { text: label }))];
      if (S.status) body.push(h('div', { cls: 'status', text: S.status, attrs: { role: 'status' } }));
      body.push(h('div', { cls: 'stats' },
        h('div', { cls: 'stat' }, h('b', { text: fmtN(S.scanned), attrs: { style: 'color:var(--sage)' } }), h('small', { text: T('gScanned') })),
        h('div', { cls: 'stat' }, h('b', { text: fmtN(S.found), attrs: { style: 'color:var(--p)' } }), h('small', { text: T('gFound') })),
        h('div', { cls: 'stat' }, h('b', { text: fmtN(S.favs), attrs: { style: 'color:var(--lav)' } }), h('small', { text: T('gFav') }))));
      var st = S.settings;
      body.push(h('div', { cls: 'meta' }, h('span', { text: (st.speed === 'fast' ? T('speedFast') : T('speedGentle')) + ' · ' + (st.pauseEach ? T('metaPause') : T('metaNoPause')) + ' · ' + T('metaCap', { m: st.capMin }) }), btn('', T('change'), function () { openOv('settings') })));
      if (S.found > 0) body.push(btn('lk', T('seeResults', { n: S.found }), function () { openBlock(3) }, 'arrow-right'));
      if (!S.hasQuery && S.favFilter !== 'fav') body.push(h('div', { cls: 'hint' }, ic('info'), h('span', { text: T('needSearch') })));
      return wrapBlock(2, head, body);
    }
    function buildB3() {
      var n = S.found, nw = S.newCount;
      var sum = (S.hasQuery || S.favFilter === 'fav') ? [document.createTextNode(T('nFound', { n: n })), nw > 0 ? document.createTextNode(' · ' + T('nNew', { n: nw })) : null] : T('b3idle');
      var head = blockHead(3, T('b3'), sum, n > 0);
      if (V.block !== 3) return wrapBlock(3, head);
      var c = S.counts || { all: 0, fav: 0, non: 0 }, f = S.favFilter || 'all', q = !!S.hasQuery;
      function tab(v, label, k, icon) {
        return h('button', { type: 'button', attrs: { role: 'tab', 'aria-selected': f === v ? 'true' : 'false', title: label }, on: { click: function () { if (f !== v) send({ a: 'favfilter', v: v }) } } },
          icon ? ic(icon) : null, h('span', { text: label }), (q || v === 'fav') ? h('i', { text: String(k) }) : null);
      }
      var body = [h('div', { cls: 'ftabs', attrs: { role: 'tablist', 'aria-label': T('tabsLbl') } }, tab('all', T('tabAll'), c.all), tab('fav', T('tabFav'), c.fav, 'star'), tab('non', T('tabNon'), c.non))];
      if (q && S.scanCount > 0) body.push(h('div', { cls: 'row' }, h('span', { cls: nw > 0 ? 'newc' : '', text: nw >= 0 ? T('newSince', { n: nw }) : '' }), h('label', { attrs: { style: 'display:flex;align-items:center;gap:6px' } }, h('span', { text: T('hideSeen') }), toggle(S.settings.hideSeen, T('hideSeen'), 'hide-seen'))));
      var m = S.matches.length;
      if (m) body.push(h('div', { cls: 'nav' },
        h('button', { type: 'button', on: { click: function () { send({ a: 'prev' }) } } }, ic('chevron-left'), h('span', { text: T('prev') })),
        h('span', { text: (Math.max(S.current, 0) + 1) + ' / ' + m }),
        h('button', { type: 'button', on: { click: function () { send({ a: 'next' }) } } }, h('span', { text: T('next') }), ic('chevron-right'))));
      var res = h('div', { cls: 'res', attrs: { role: 'list' } });
      if (!m) res.appendChild(buildEmpty());
      S.matches.forEach(function (r, i) { res.appendChild(resultRow(r, i === S.current)) });
      slots.res = res; body.push(res);
      if (m) body.push(h('div', { cls: 'hint' }, ic('star'), h('span', { text: T('favHint') })));
      return wrapBlock(3, head, body);
    }
    function markBtn(id, m, cur, icon, title, name, thumb) {
      return h('button', { type: 'button', cls: 'mk', title: title, attrs: { 'aria-pressed': cur === m ? 'true' : 'false' }, on: { click: function (e) { e.stopPropagation(); send({ a: 'mark', id: id, m: m, name: name, thumb: thumb }) } } }, ic(icon));
    }
    function resultRow(r, on) {
      var nm = h('b', { cls: 'nmx' }, r.fav ? ic('star') : null, document.createTextNode(r.name));
      var sub = h('small', null, document.createTextNode(r.on ? T('onScreen') : T('pastBack')), r.seen ? h('span', { cls: 'sn', text: ' · ' + T('seenBefore') }) : null, r.mark === 'review' ? h('span', { cls: 'sn', text: ' · ' + T('markReview') }) : null);
      return h('div', { cls: 'r' + (on ? ' on' : ''), attrs: { role: 'listitem' }, on: { click: function () { send({ a: 'show', id: r.id }) } } },
        avatar(r.thumb), h('div', { cls: 'tx' }, nm, sub),
        markBtn(r.id, 'review', r.mark, 'bookmark', T('markReviewT'), r.name, r.thumb), markBtn(r.id, 'ignore', r.mark, 'ban', T('markIgnoreT'), r.name, r.thumb),
        h('span', { cls: 'sh', title: T('show') }, h('span', { text: T('noteShow') }), ic('locate-fixed')));
    }
    // Empty state: a message and two ways forward (+ the second Fluidz link).
    function buildEmpty() {
      var c = S.counts || {}, msg = T('empty'), q = S.hasQuery;
      if (S.favFilter === 'non' && c.all > 0) msg = T('emptyNon');
      else if (S.favFilter === 'fav' && q && c.all > 0) msg = T('emptyFav');
      else if (q || S.favFilter === 'fav') msg = S.end ? T('noMatchEnd') : T('noMatch');
      var acts = [];
      if ((q || S.favFilter === 'fav') && !S.end) acts.push(btn('p', S.running ? T('scanning') : T('keepScrolling'), function () { if (!S.running) send({ a: 'toggle-scroll' }); openBlock(2) }, 'play'));
      acts.push(btn('', q ? T('widen') : T('typeSearch'), function () { if (q) openEditor(S.q, null); else { openBlock(1); setTimeout(function () { input.focus() }, 0) } }, q ? 'list-filter' : 'search'));
      return h('div', { cls: 'empty' }, h('span', { text: msg }), h('div', { cls: 'acts' }, acts),
        h('div', { cls: 'fz' }, document.createTextNode(T('fluidzLine') + ' '), h('a', { text: 'fluidz.app', attrs: { href: FLUIDZ, target: '_blank', rel: 'noopener noreferrer' } })));
    }
    function buildAdv() {
      var open = V.adv, mk = S.marks || {};
      var head = h('button', { type: 'button', cls: 'advh', attrs: { 'aria-expanded': open ? 'true' : 'false' }, on: { click: function () { V.adv = !V.adv; redraw() } } }, ic('chevron-right'), h('span', { text: T('advanced') }));
      if (!open) return h('div', { cls: 'adv' }, head);
      function a(icon, label, fn) { return h('button', { type: 'button', on: { click: fn } }, ic(icon), h('span', { text: label })) }
      return h('div', { cls: 'adv' }, head, h('div', { cls: 'agrid' },
        a('list-filter', T('editorT'), function () { openEditor(S.q, null) }),
        a('folder', T('mySearches', { n: (S.searches || []).length }), function () { openOv('searches') }),
        a('history', T('journalN', { n: S.scanCount || 0 }), function () { openOv('journal') }),
        a('git-compare', T('compareT'), function () { openOv('compare') }),
        a('bookmark', T('reviewN', { n: mk.review || 0 }), function () { V.mtab = 'review'; openOv('marks') }),
        a('ban', T('ignoredN', { n: mk.ignore || 0 }), function () { V.mtab = 'ignore'; openOv('marks') })));
    }

    /* ---------- overlays ---------- */
    function ovWrap(title, body, noBack) {
      return h('div', { cls: 'ov', attrs: { 'data-ov': V.ov } },
        h('div', { cls: 'ovh' }, noBack ? null : h('button', { type: 'button', cls: 'back', title: T('back'), on: { click: closeOv } }, ic('arrow-left')), h('h3', { text: title })),
        body);
    }
    function sec(title, items) { return h('div', { cls: 'sec' }, title ? h('h4', { text: title }) : null, items) }
    function chipChoice(items, cur, onPick, label) {
      return h('div', { cls: 'chips', attrs: { role: 'group', 'aria-label': label || null } }, items.map(function (it) {
        return h('button', { type: 'button', cls: 'c', text: it[1], title: it[2] || null, attrs: { 'aria-pressed': String(it[0]) === String(cur) ? 'true' : 'false' }, on: { click: function () { onPick(it[0]) } } });
      }));
    }

    // Settings & About
    function ovSettings() {
      var st = S.settings, lock = S.lock;
      var langs = chipChoice(g.PNS_LANGS.map(function (l) { return [l[0], l[1], l[2]] }), lang, function (l) { send({ a: 'lang', l: l }) }, T('lang'));
      var pin1 = stopKeys(h('input', { cls: 'txt', type: 'password', attrs: { inputmode: 'numeric', maxlength: '8', placeholder: lock ? T('pinCurrent') : T('pinNew'), autocomplete: 'off', 'aria-label': lock ? T('pinCurrent') : T('pinNew') } }));
      var pin2 = stopKeys(h('input', { cls: 'txt', type: 'password', attrs: { inputmode: 'numeric', maxlength: '8', placeholder: T('pinNew'), autocomplete: 'off', 'aria-label': T('pinNew') } }));
      var lockRow = lock
        ? h('div', { cls: 'frm' }, pin1, btn('lk', T('pinRemove'), function () { send({ a: 'lock-remove', pin: pin1.value }); pin1.value = '' }))
        : h('div', { cls: 'frm' }, pin1, btn('lk', T('pinSet'), function () { send({ a: 'lock-set', pin: pin1.value }); pin1.value = '' }));
      var changeRow = lock ? h('div', { cls: 'frm' }, pin2, btn('lk', T('pinChange'), function () { send({ a: 'lock-set', old: pin1.value, pin: pin2.value }); pin1.value = pin2.value = '' })) : null;
      var mail = 'mailto:' + FEEDBACK + '?subject=' + encodeURIComponent('Profile Name Search ' + S.version + ' — feedback');
      return ovWrap(T('settingsT'), [
        sec(T('lang'), langs),
        sec(T('scanSec'), [
          chipChoice([['gentle', T('speedGentle')], ['fast', T('speedFast')]], st.speed, function (v) { send({ a: 'speed', v: v }) }, T('speedLbl')),
          h('p', { text: st.speed === 'fast' ? T('speedFastHint') : T('speedGentleHint') }),
          h('div', { cls: 'row' }, h('span', { text: T('pauseEach') }), toggle(st.pauseEach, T('pauseEach'), 'pause-each')),
          h('div', { cls: 'row' }, h('span', { text: T('capLbl') })),
          chipChoice([[10, '10 min'], [20, '20 min'], [30, '30 min'], [60, '1 h'], [120, '2 h']], st.capMin, function (v) { send({ a: 'cap', v: v }) }, T('capLbl')),
          h('p', { text: T('capHint') })]),
        sec(T('viewSec'), [
          h('div', { cls: 'row' }, h('span', { text: T('outlineLbl') }), toggle(st.outline, T('outlineLbl'), 'outline')),
          h('div', { cls: 'row' }, h('span', { text: T('discreetLbl') }), toggle(st.discreet, T('discreetLbl'), 'discreet')),
          h('p', { text: T('discreetHint') })]),
        sec(T('lockSec'), [h('p', { text: lock ? T('lockOnText') : T('lockOffText') }), lockRow, changeRow, h('p', { cls: 'note honest', text: T('lockHonest') })]),
        sec(T('helpSec'), [h('div', { cls: 'links' },
          btn('lk', T('helpSyntax'), function () { openOv('help', 'settings') }, 'circle-help'),
          btn('lk', T('tourAgain'), function () { V.ov = null; send({ a: 'tips' }) }, 'lightbulb'),
          btn('lk', T('myData'), function () { openOv('data') }, 'database'),
          btn('lk', T('selfTest'), function () { openOv('selftest') }, 'activity'),
          h('a', { cls: 'lk', attrs: { href: mail, target: '_blank', rel: 'noopener noreferrer' } }, ic('mail'), h('span', { text: T('feedback') })))]),
        sec(T('aboutSec'), [
          h('p', null, h('b', { text: 'Profile Name Search ' + S.version, attrs: { style: 'color:var(--tx)' } }), document.createTextNode(' · ' + T('aboutBy') + ' ')),
          h('p', { text: T('aboutPrivacy') }),
          h('div', { cls: 'links' }, h('a', { cls: 'lk p', attrs: { href: FLUIDZ, target: '_blank', rel: 'noopener noreferrer' } }, ic('external-link'), h('span', { text: 'fluidz.app' })))])
      ]);
    }

    // "?" syntax help: clickable examples insert themselves in the field
    function ovHelp() {
      var ex = [['top, dom', T('hxOr')], ['TOP + XXL', T('hxAnd')], ['(top, dom, active) + XXL', T('hxCrit')], ['TOP -sub', T('hxNot')], ['"vers top"', T('hxPhrase')], ['=sub', T('hxWhole')]];
      var sugg = ['TOP', 'XXL', 'vers', '🚀', '🔥', 'new'];
      return ovWrap(T('helpT'), [
        sec(T('hExamples'), ex.map(function (e) { return h('button', { type: 'button', cls: 'ex', on: { click: function () { insertText(e[0], true) } } }, document.createTextNode(e[0]), h('span', { text: e[1] })) })),
        sec(T('hSuggest'), h('div', { cls: 'chips' }, sugg.map(function (s) { return h('button', { type: 'button', cls: 'c', text: s, on: { click: function () { insertText(s) } } }) }))),
        sec(T('hRules'), [h('p', { text: T('hRule1') }), h('p', { text: T('hRule2') }), h('p', { text: T('hRule3') })]),
        sec(T('keysT'), [h('div', { cls: 'kb' },
          h('kbd', { text: 'Alt+Shift+S' }), h('span', { text: T('kScan') }), h('kbd', { text: 'Alt+Shift+F' }), h('span', { text: T('kFocus') }),
          h('kbd', { text: 'Alt+Shift+N / P' }), h('span', { text: T('kNext') }), h('kbd', { text: 'Enter / ⇧ Enter' }), h('span', { text: T('kEnter') }),
          h('kbd', { text: 'Esc' }), h('span', { text: T('kEsc') })), h('p', { text: T('keysHint') })]),
        sec(null, h('div', { cls: 'links' }, btn('lk', T('tourAgain'), function () { V.ov = null; send({ a: 'tips' }) }, 'lightbulb')))
      ]);
    }

    // My data: what is stored, counters, export / import, clear
    var fileIn = null;
    function ovData() {
      fileIn = h('input', { type: 'file', attrs: { accept: 'application/json,.json', style: 'display:none' }, on: { change: function () {
        var f = fileIn.files && fileIn.files[0]; if (!f) return;
        if (f.size > 5 * 1024 * 1024) { send({ a: 'import', text: '' }); return }
        var rd = new FileReader(); rd.onload = function () { send({ a: 'import', text: String(rd.result || '') }) }; rd.readAsText(f);
        fileIn.value = ''; // the same file can be picked again
      } } });
      var mk = S.marks || {}, conf = V.confirm;
      var wipe = conf === 'wipe'
        ? h('div', { cls: 'acts' }, btn('p', T('wipeYes'), function () { V.confirm = null; send({ a: 'wipe-all' }) }), btn('', T('cancel'), function () { V.confirm = null; redraw() }))
        : btn('lk warn', T('wipeAll'), function () { V.confirm = 'wipe'; redraw() }, 'trash-2');
      var jclear = conf === 'journal'
        ? h('div', { cls: 'acts' }, btn('p', T('clearJournalYes'), function () { V.confirm = null; send({ a: 'journal-clear' }) }), btn('', T('cancel'), function () { V.confirm = null; redraw() }))
        : btn('lk', T('clearJournal'), function () { V.confirm = 'journal'; redraw() }, 'history');
      return ovWrap(T('myData'), [
        sec(T('dStored'), [h('div', { cls: 'dl' },
          h('span', { text: T('dSearches') }), h('b', { text: String((S.searches || []).length) }),
          h('span', { text: T('dFolders') }), h('b', { text: String(Math.max(0, (S.folders || []).length - 1)) }),
          h('span', { text: T('dScans') }), h('b', { text: String(S.scanCount || 0) }),
          h('span', { text: T('dReview') }), h('b', { text: String(mk.review || 0) }),
          h('span', { text: T('dIgnored') }), h('b', { text: String(mk.ignore || 0) }),
          h('span', { text: T('dLock') }), h('b', { text: S.lock ? T('on') : T('off') })),
          h('p', { text: T('dWhere') })]),
        sec(T('dBackup'), [h('p', { text: T('dBackupText') }), h('div', { cls: 'links' }, btn('lk p', T('export'), function () { send({ a: 'export' }) }, 'download'), btn('lk', T('import'), function () { fileIn.click() }, 'upload'), fileIn), h('p', { text: T('dImportText') })]),
        sec(T('dClear'), [jclear, wipe, h('p', { text: T('dClearText') })])
      ]);
    }

    // Grid self-test: diagnostic text, copied to the clipboard, and a pre-filled e-mail you send yourself (nothing is sent by the extension)
    function ovSelfTest() {
      var r = S.selftest, body = [h('p', { text: T('stIntro') }), h('div', { cls: 'links' }, btn('lk p', r ? T('stAgain') : T('stRun'), function () { send({ a: 'selftest' }) }, 'activity'))];
      if (r) {
        body.push(h('div', { cls: 'checks' }, r.checks.map(function (c) { return h('div', null, h('b', { cls: c.ok ? 'ok' : 'ko', text: c.ok ? '✓' : '!' }), h('span', { text: T(c.k) }), h('b', { text: c.v })) })));
        body.push(h('p', { text: r.ok ? T('stAllOk') : T('stSomeKo') }));
        body.push(h('pre', { cls: 'rep', text: r.text }));
        body.push(h('div', { cls: 'links' }, btn('lk p', T('stCopy'), function () { copyReport(r.text) }, 'copy')));
        body.push(h('p', { cls: 'note', text: T('stPrivacy') }));
      }
      return ovWrap(T('selfTest'), sec(null, body));
    }
    function copyReport(text) {
      var done = function () { openMail(text) };
      try { navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done() }) } catch (e) { fallbackCopy(text); done() }
    }
    function fallbackCopy(text) { var ta = h('textarea', { attrs: { style: 'position:fixed;opacity:0' } }); ta.value = text; root.appendChild(ta); ta.select(); try { document.execCommand('copy') } catch (e) { /* ignore */ } ta.remove() }
    function openMail(text) {
      var a = h('a', { attrs: { href: 'mailto:' + FEEDBACK + '?subject=' + encodeURIComponent('Profile Name Search ' + S.version + ' — self-test') + '&body=' + encodeURIComponent(text.slice(0, 1800)), target: '_blank', rel: 'noopener noreferrer', style: 'display:none' } });
      root.appendChild(a); a.click(); a.remove();
    }

    // Saved searches, in folders
    function ovSearches() {
      var list = S.searches || [], folders = S.folders || [];
      var body = [];
      var saveName = stopKeys(h('input', { cls: 'txt', attrs: { maxlength: '60', placeholder: C.shortText(S.q, nameOf, 40) || T('searchName'), 'aria-label': T('searchName') } }));
      var folderSel = h('select', { cls: 'txt', attrs: { 'aria-label': T('folder') } }, folders.map(function (f) { return h('option', { text: f.name || T('folderDefault'), attrs: { value: f.id } }) }));
      if (!C.isEmpty(S.q)) body.push(sec(T('saveActive'), [linesEl(S.q), h('div', { cls: 'frm' }, saveName, folderSel), h('div', { cls: 'links' }, btn('lk p', T('save'), function () { send({ a: 'search-save', name: saveName.value, folder: folderSel.value }) }, 'star'))]));
      else if (V.ovArg === 'save') body.push(h('p', { cls: 'note', text: T('saveNothing') }));
      var newF = stopKeys(h('input', { cls: 'txt', attrs: { maxlength: '40', placeholder: T('newFolderPh'), 'aria-label': T('newFolder') } }));
      var pinned = list.filter(function (s) { return s.pinned });
      var lst = [];
      if (!list.length) lst.push(h('p', { cls: 'note', text: T('noSaved') }));
      if (pinned.length) lst.push(h('div', { cls: 'fold' }, h('div', { cls: 'fh' }, h('span', null, ic('pin'), document.createTextNode(' ' + T('pinned')))), h('div', { cls: 'list' }, pinned.map(searchRow))));
      folders.forEach(function (f) {
        var items = list.filter(function (s) { return s.folder === f.id && !s.pinned });
        if (!items.length && f.id === 'f0' && folders.length > 1) return;
        var fh = h('div', { cls: 'fh', attrs: { 'data-open': f.open ? 'true' : 'false' } },
          h('button', { type: 'button', attrs: { 'aria-expanded': f.open ? 'true' : 'false' }, on: { click: function () { send({ a: 'folder-toggle', id: f.id }) } } }, ic('chevron-right'), h('span', { text: f.name || T('folderDefault') }), h('i', { text: '(' + items.length + ')' })),
          f.id !== 'f0' ? h('button', { type: 'button', cls: 'dots', title: T('more'), on: { click: function () { V.menu = V.menu === 'f:' + f.id ? null : 'f:' + f.id; redraw() } } }, ic('ellipsis')) : null);
        var parts = [fh];
        if (V.menu === 'f:' + f.id) parts.push(folderMenu(f));
        if (f.open) parts.push(h('div', { cls: 'list' }, items.map(searchRow)));
        lst.push(h('div', { cls: 'fold' }, parts));
      });
      body.push(sec(T('mySearches', { n: list.length }), lst));
      body.push(sec(T('newFolder'), [h('div', { cls: 'frm' }, newF, btn('lk', T('create'), function () { if (newF.value.trim()) send({ a: 'folder-new', name: newF.value }) }, 'folder-plus'))]));
      body.push(h('p', { cls: 'note', text: T('combineHint') }));
      return ovWrap(T('mySearches', { n: list.length }), body);
    }
    function folderMenu(f) {
      if (V.rename === 'f:' + f.id) return renameForm(f.name, function (v) { send({ a: 'folder-rename', id: f.id, name: v }) });
      if (V.confirm === 'f:' + f.id) return h('div', { cls: 'menu' }, h('p', { cls: 'note', text: T('delFolderQ') }), h('div', { cls: 'acts' }, btn('p', T('delete'), function () { V.confirm = null; V.menu = null; send({ a: 'folder-del', id: f.id }) }), btn('', T('cancel'), function () { V.confirm = null; redraw() })));
      return h('div', { cls: 'menu' }, btn('', T('rename'), function () { V.rename = 'f:' + f.id; redraw() }), btn('danger', T('delFolder'), function () { V.confirm = 'f:' + f.id; redraw() }));
    }
    function renameForm(cur, done) {
      var inp = stopKeys(h('input', { cls: 'txt', attrs: { maxlength: '60', 'aria-label': T('rename') } })); inp.value = cur || '';
      var ok = function () { V.rename = null; V.menu = null; if (inp.value.trim()) done(inp.value.trim()); else redraw() };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); else if (e.key === 'Escape') { V.rename = null; redraw() } });
      setTimeout(function () { inp.focus(); inp.select() }, 0);
      return h('div', { cls: 'menu' }, h('div', { cls: 'frm' }, inp, btn('lk p', T('ok'), ok)));
    }
    function searchRow(s) {
      var row = h('div', { cls: 'it', attrs: { 'data-search': s.id } },
        h('div', { cls: 'tx', attrs: { role: 'button', tabindex: '0', title: T('useSearch') }, on: { click: function () { useSearch(s.id) }, keydown: function (e) { if (e.key === 'Enter') useSearch(s.id) } } },
          h('b', null, s.pinned ? h('span', { cls: 'pin' }, ic('pin'), document.createTextNode(' ')) : null, document.createTextNode(s.name)), h('small', { text: C.shortText(s.q, nameOf, 60) })),
        h('button', { type: 'button', cls: 'dots', title: T('more'), attrs: { 'aria-expanded': V.menu === 's:' + s.id ? 'true' : 'false' }, on: { click: function () { V.menu = V.menu === 's:' + s.id ? null : 's:' + s.id; V.rename = null; V.confirm = null; V.moveFor = null; redraw() } } }, ic('ellipsis')));
      if (V.menu !== 's:' + s.id) return row;
      var menu;
      if (V.rename === 's:' + s.id) menu = renameForm(s.name, function (v) { send({ a: 'search-rename', id: s.id, name: v }) });
      else if (V.confirm === 's:' + s.id) {
        var used = (S.searches || []).filter(function (x) { return x.id !== s.id && C.refs(x.q).indexOf(s.id) >= 0 }).length + (C.refs(S.q).indexOf(s.id) >= 0 ? 1 : 0);
        menu = h('div', { cls: 'menu' }, h('p', { cls: 'note', text: used ? T('delUsedQ', { n: used }) : T('delSearchQ', { name: s.name }) }), h('div', { cls: 'acts' }, btn('p', T('delete'), function () { V.confirm = null; V.menu = null; send({ a: 'search-del', id: s.id }) }), btn('', T('cancel'), function () { V.confirm = null; redraw() })));
      } else if (V.moveFor === s.id) {
        menu = h('div', { cls: 'menu' }, (S.folders || []).map(function (f) { return btn(f.id === s.folder ? 'danger' : '', (f.name || T('folderDefault')) + (f.id === s.folder ? ' ✓' : ''), function () { V.moveFor = null; V.menu = null; send({ a: 'search-move', id: s.id, folder: f.id }) }) }));
      } else {
        menu = h('div', { cls: 'menu' },
          btn('', T('useSearch'), function () { useSearch(s.id) }),
          btn('', T('combineAnd'), function () { combine(s.id, 'and') }),
          btn('', T('combineOr'), function () { combine(s.id, 'or') }),
          btn('', T('edit'), function () { V.menu = null; openEditor(s.q, s.id) }),
          btn('', T('rename'), function () { V.rename = 's:' + s.id; redraw() }),
          btn('', s.pinned ? T('unpin') : T('pin'), function () { V.menu = null; send({ a: 'search-pin', id: s.id }) }),
          btn('', T('duplicate'), function () { V.menu = null; send({ a: 'search-dup', id: s.id }) }),
          btn('', T('moveTo'), function () { V.moveFor = s.id; redraw() }),
          btn('danger', T('delete'), function () { V.confirm = 's:' + s.id; redraw() }));
      }
      return h('div', { attrs: { style: 'display:flex;flex-direction:column;gap:4px' } }, row, menu);
    }
    function useSearch(id) { V.menu = null; V.ov = null; V.block = 2; typing = false; send({ a: 'search-load', id: id }); redraw() }
    // Combine a saved search with the active one: AND adds it as a block to every alternative, OR adds it as a new alternative.
    function combine(id, mode) {
      var q = C.clone(C.clean(S.q)), item = { ref: id, name: nameOf(id) };
      if (!q.groups.length) q.groups.push({ items: [item] });
      else if (mode === 'and') q.groups.forEach(function (gr) { gr.items.push(C.clone(item)) });
      else q.groups.push({ items: [item] });
      V.menu = null; V.ov = null; V.block = 1; typing = false; send({ a: 'set-q', q: q }); redraw();
    }

    /* ---------- Advanced search (step by step): ui-editor.js, loaded after this file ---------- */
    var ED = g.PNS_UI_EDITOR ? g.PNS_UI_EDITOR.create({ h: h, ic: ic, btn: btn, T: T, S: function () { return S }, V: V, send: send, redraw: redraw, nameOf: nameOf, stopKeys: stopKeys, ovWrap: ovWrap,
      applySearch: function (q) { V.ed = null; V.ov = null; V.block = 2; typing = false; input.value = ''; sentText = C.serialize(q, nameOf); send({ a: 'set-q', q: q }); redraw() },
      closeEditor: function (ov) { V.ed = null; V.ov = ov || null; redraw() } }) : null;
    function openEditor(q, forId) { if (ED) ED.open(q, forId) }

    // Scan journal
    function lockGate() {
      var pin = stopKeys(h('input', { cls: 'txt', type: 'password', attrs: { inputmode: 'numeric', maxlength: '8', placeholder: T('pinCurrent'), autocomplete: 'off', 'aria-label': T('pinCurrent') } }));
      pin.addEventListener('keydown', function (e) { if (e.key === 'Enter') send({ a: 'unlock', pin: pin.value }) });
      setTimeout(function () { pin.focus() }, 0);
      return sec(null, [h('p', { text: T('lockedText') }), h('div', { cls: 'frm' }, pin, btn('lk p', T('unlock'), function () { send({ a: 'unlock', pin: pin.value }) }, 'lock-open')), h('p', { cls: 'note honest', text: T('lockHonest') })]);
    }
    function endBadge(e) { var k = { running: 'run', crash: 'bad', cap: 'bad' }[e] || ''; return h('span', { cls: 'badge ' + k, text: T('end_' + e) }) }
    function ovJournal() {
      if (!S.unlocked) return ovWrap(T('journalT'), lockGate());
      var list = S.journal || [];
      var body = [h('p', { cls: 'note', text: T('journalIntro') })];
      if (!list.length) body.push(h('p', { cls: 'note', text: T('journalEmpty') }));
      body.push(h('div', { cls: 'list' }, list.map(function (s) {
        return h('div', { cls: 'it', attrs: { 'data-scan': s.id } }, h('div', { cls: 'tx', attrs: { role: 'button', tabindex: '0' }, on: { click: function () { send({ a: 'scan-open', id: s.id }); openOv('scan', s.id) }, keydown: function (e) { if (e.key === 'Enter') { send({ a: 'scan-open', id: s.id }); openOv('scan', s.id) } } } },
          h('b', { text: s.qText || '—' }), h('small', { text: fmtDate(s.t0) + ' · ' + T('jCount', { n: s.count, m: fmtN(s.n) }) })), endBadge(s.end));
      })));
      var tools = [btn('lk', T('compareT'), function () { openOv('compare') }, 'git-compare')];
      if (S.lock) tools.push(btn('lk', T('relock'), function () { send({ a: 'relock' }); V.ov = null; redraw() }, 'lock'));
      body.push(h('div', { cls: 'links' }, tools));
      return ovWrap(T('journalT'), body);
    }
    function ovScan() {
      if (!S.unlocked) return ovWrap(T('journalT'), lockGate());
      var d = S.scan; if (!d) return ovWrap(T('journalT'), h('p', { cls: 'note', text: '…' }));
      var body = [h('div', { cls: 'act' }, h('div', { cls: 'top' }, h('span', { text: fmtDate(d.s.t0) }), endBadge(d.s.end)), h('div', { cls: 'lines' }, h('div', { cls: 'l' }, h('b', { text: d.s.qText }))), h('small', { text: T('jCount', { n: d.s.count, m: fmtN(d.s.n) }), attrs: { style: 'font-size:11px;color:var(--tx3)' } }))];
      if (S.find) {
        var f = S.find, txt = f.how === 'id' ? T('findId', { name: f.name }) : f.how === 'name' ? T('findName', { name: f.name, n: f.others }) : T('findNone', { name: f.name });
        body.push(card(f.how === 'id' ? 'ok' : 'warn', f.how ? 'locate-fixed' : 'search', T('findT'), txt, [f.how ? null : btn('p', T('findSearchName'), function () { send({ a: 'search-name', name: f.name }); V.ov = null; V.block = 2; redraw() }), btn('', T('gotIt'), function () { send({ a: 'find-ok' }) })]));
      }
      body.push(h('p', { cls: 'note honest', text: T('findHonest') }));
      body.push(h('div', { cls: 'list' }, d.res.map(function (r) {
        return h('div', { cls: 'it' }, avatar(r.thumb), h('div', { cls: 'tx' }, h('b', { cls: 'nmx' }, r.fav ? ic('star') : null, document.createTextNode(r.name)), h('small', { text: fmtDate(r.t) + (r.fav ? ' · ' + T('wasFav') : '') })),
          btn('lk', T('findAgain'), function () { send({ a: 'find-again', scan: d.s.id, id: r.id }) }, 'locate-fixed'));
      })));
      var conf = V.confirm === 'scan';
      body.push(h('div', { cls: 'links' },
        btn('lk', T('reuseSearch'), function () { var it = (S.journal || []).filter(function (x) { return x.id === d.s.id })[0]; send({ a: 'set-text', v: d.s.qText }); void it; V.ov = null; V.block = 2; redraw() }, 'rotate-ccw'),
        conf ? btn('lk warn', T('deleteSure'), function () { V.confirm = null; send({ a: 'scan-del', id: d.s.id }); V.ov = 'journal'; redraw() }, 'trash-2') : btn('lk', T('delete'), function () { V.confirm = 'scan'; redraw() }, 'trash-2')));
      return ovWrap(T('scanT'), body);
    }
    function ovCompare() {
      if (!S.unlocked) return ovWrap(T('compareT'), lockGate());
      var list = S.journal || [];
      if (list.length < 2) return ovWrap(T('compareT'), h('p', { cls: 'note', text: T('cmpNeed2') }));
      if (!V.cmpA || !list.some(function (s) { return s.id === V.cmpA })) V.cmpA = list[1].id;
      if (!V.cmpB || !list.some(function (s) { return s.id === V.cmpB })) V.cmpB = list[0].id;
      function sel(cur, set) {
        var s = h('select', { cls: 'txt', on: { change: function () { set(s.value); redraw() } } }, list.map(function (x) { return h('option', { text: fmtDate(x.t0) + ' — ' + (x.qText || '—').slice(0, 30), attrs: { value: x.id } }) }));
        s.value = cur; return s;
      }
      var body = [sec(null, [h('p', { cls: 'note', text: T('cmpIntro') }), h('div', { cls: 'frm' }, h('b', { text: 'A', attrs: { style: 'font-size:12px;color:var(--tx3)' } }), sel(V.cmpA, function (v) { V.cmpA = v })), h('div', { cls: 'frm' }, h('b', { text: 'B', attrs: { style: 'font-size:12px;color:var(--tx3)' } }), sel(V.cmpB, function (v) { V.cmpB = v })),
        h('div', { cls: 'links' }, btn('lk p', T('cmpGo'), function () { send({ a: 'compare', a1: V.cmpA, b1: V.cmpB }) }, 'git-compare'))])];
      var r = S.cmp;
      if (r) {
        body.push(h('div', { cls: 'stats' },
          h('div', { cls: 'stat' }, h('b', { text: String(r.added.length), attrs: { style: 'color:var(--sage)' } }), h('small', { text: T('cmpNew') })),
          h('div', { cls: 'stat' }, h('b', { text: String(r.gone.length), attrs: { style: 'color:var(--p)' } }), h('small', { text: T('cmpGone') })),
          h('div', { cls: 'stat' }, h('b', { text: String(r.both) }), h('small', { text: T('cmpBoth') }))));
        body.push(h('p', { cls: 'note', text: T('cmpOrder', { a: fmtDate(r.a.t0), b: fmtDate(r.b.t0) }) }));
        function lst(title, items) { return sec(title, items.length ? h('div', { cls: 'list' }, items.slice(0, 100).map(function (x) { return h('div', { cls: 'it' }, avatar(x.thumb), h('div', { cls: 'tx' }, h('b', { cls: 'nmx', text: x.name }), h('small', { text: x.fav ? T('wasFav') : '' }))) })) : h('p', { cls: 'note', text: '—' })) }
        body.push(lst(T('cmpNew'), r.added)); body.push(lst(T('cmpGone'), r.gone));
      }
      return ovWrap(T('compareT'), body);
    }
    // Local marks: To review / Ignored
    function ovMarks() {
      var items = (S.markList || []).filter(function (m) { return m.m === V.mtab });
      var tabs = h('div', { cls: 'ftabs', attrs: { role: 'tablist' } },
        h('button', { type: 'button', attrs: { role: 'tab', 'aria-selected': V.mtab === 'review' ? 'true' : 'false' }, on: { click: function () { V.mtab = 'review'; redraw() } } }, ic('bookmark'), h('span', { text: T('markReview') }), h('i', { text: String((S.marks || {}).review || 0) })),
        h('button', { type: 'button', attrs: { role: 'tab', 'aria-selected': V.mtab === 'ignore' ? 'true' : 'false' }, on: { click: function () { V.mtab = 'ignore'; redraw() } } }, ic('ban'), h('span', { text: T('markIgnore') }), h('i', { text: String((S.marks || {}).ignore || 0) })));
      var body = [tabs, h('p', { cls: 'note', text: V.mtab === 'review' ? T('reviewIntro') : T('ignoreIntro') })];
      if (!items.length) body.push(h('p', { cls: 'note', text: T('marksEmpty') }));
      body.push(h('div', { cls: 'list' }, items.map(function (m) {
        return h('div', { cls: 'it' }, avatar(m.thumb), h('div', { cls: 'tx' }, h('b', { cls: 'nmx', text: m.name }), h('small', { text: m.on ? T('onGridNow') : T('notLoaded') })),
          m.on ? btn('lk', T('show'), function () { send({ a: 'show', id: m.id }) }, 'locate-fixed') : btn('lk', T('findSearchName'), function () { send({ a: 'search-name', name: m.name }); V.ov = null; V.block = 2; redraw() }, 'search'),
          h('button', { type: 'button', cls: 'dots', title: T('unmark'), on: { click: function () { send({ a: 'mark', id: m.id, m: null }) } } }, ic('x')));
      })));
      return ovWrap(T('marksT'), body);
    }

    /* ---------- welcome (4 steps) and What's new ---------- */
    function buildWelcome() {
      var n = S.welcomeStep || 1, last = n === 4;
      var langs = h('div', { cls: 'lg' }, h('span', { text: T('lang') }));
      g.PNS_LANGS.forEach(function (l) { langs.appendChild(h('button', { type: 'button', cls: l[0] === lang ? 'on' : '', text: l[1], title: l[2], on: { click: function () { send({ a: 'lang', l: l[0] }) } } })) });
      var il = h('div', { cls: 'il' });
      if (n === 1) { il.appendChild(h('div', { cls: 'f' }, h('span', { cls: 'g', text: T('w1f1') }), h('span', { cls: 'g', text: T('w1f2') }), h('span', { cls: 'g', text: T('w1f3') }))); var gr = h('div', { cls: 'grid' }); for (var k = 0; k < 8; k++) gr.appendChild(h('i')); il.appendChild(gr); il.appendChild(h('small', { text: T('w1s') })) }
      else if (n === 2) { il.appendChild(h('div', { cls: 'f' }, h('span', { text: 'top, dom' }), h('span', { text: 'TOP + XXL' }), h('span', { text: '🚀' }))); il.appendChild(h('small', { text: T('w2s') })) }
      else if (n === 3) { il.appendChild(h('div', { cls: 'big', text: T('w3s') })); il.appendChild(h('small', { text: '1 200 · 9 · 5' })) }
      else { il.appendChild(h('div', { cls: 'big', text: T('w4s') })); il.appendChild(h('small', { text: T('pastBack') })) }
      var dots = h('div', { cls: 'dots' }); for (var i = 1; i <= 4; i++) dots.appendChild(h('i', { cls: i === n ? 'on' : '' }));
      return h('div', { cls: 'pw', attrs: { 'data-step': String(n) } },
        h('div', { cls: 'top' }, h('span', { text: T('step', { n: n }) }), h('button', { type: 'button', text: T('skip'), on: { click: function () { send({ a: 'welcome-skip' }) } } })),
        n === 1 ? langs : null,
        h('h4', { text: T('w' + n + 'h') }), il, h('p', { text: T('w' + n + 'p') }),
        h('div', { cls: 'bot' }, dots, h('button', { type: 'button', cls: 'nx', on: { click: function () { send({ a: 'welcome-next' }) } } }, h('span', { text: last ? T('done') : T('nextW') }), last ? ic('check') : ic('arrow-right'))));
    }
    function buildWhatsNew() {
      var items = ['wn0', 'wn1', 'wn2', 'wn3', 'wn4', 'wn5', 'wn6'].map(function (k) { var p = T(k).split(' — '); return h('li', null, h('b', { text: p[0] }), p[1] ? document.createTextNode(' — ' + p[1]) : null) });
      return h('div', { cls: 'pw', attrs: { 'data-whatsnew': '' } },
        h('div', { cls: 'top' }, h('span', { text: 'v' + S.version }), null),
        h('h4', { text: T('wnTitle') }),
        S.notice === 'kept' ? card('ok', 'circle-check', T('keptTitle'), T('keptText', { n: (S.searches || []).length })) : null,
        h('ul', null, items),
        h('p', { text: T('wnBackup'), attrs: { style: 'font-size:12px' } }),
        h('div', { cls: 'bot' }, h('a', { text: 'fluidz.app', attrs: { href: FLUIDZ, target: '_blank', rel: 'noopener noreferrer', style: 'font-size:12px;color:var(--tx3);text-decoration:none' } }), h('button', { type: 'button', cls: 'nx', on: { click: function () { send({ a: 'whatsnew-ok' }) } } }, h('span', { text: T('wnGo') }), ic('arrow-right'))));
    }
    function buildPill() {
      return h('div', { cls: 'pill', attrs: { role: 'button', tabindex: '0', 'aria-label': T('max') }, on: {
        pointerdown: function (e) { if (ctx.dragStart) ctx.dragStart(e, function () { send({ a: 'min' }) }); else send({ a: 'min' }) },
        keydown: function (e) { if (e.key === 'Enter' || e.key === ' ') send({ a: 'min' }) } } },
        h('span', { cls: 'drop' }), h('b', { text: 'Profile Name Search' }),
        S.found > 0 ? h('span', { cls: 'cnt', text: String(S.found) }) : null,
        S.running ? h('span', { cls: 'st' }, h('i'), document.createTextNode(T('scrolling'))) : null,
        ic('maximize-2'));
    }

    /* ---------- skeleton + update ---------- */
    function slot(parent, name, sig, build) {
      if (sigs[name] === sig && slots[name + '$']) return slots[name + '$'];
      sigs[name] = sig;
      var n = build(), old = slots[name + '$'];
      if (old && old.parentNode) old.replaceWith(n); else parent.appendChild(n);
      slots[name + '$'] = n; return n;
    }
    function skeleton(k) {
      while (root.firstChild) root.removeChild(root.firstChild);
      slots = {}; sigs = {}; kind = k;
      slots.cards = h('div', { attrs: { style: 'display:contents' } }); root.appendChild(slots.cards);
      slots.main = h('div', { attrs: { style: 'display:contents' } }); root.appendChild(slots.main);
      if (k === 'panel') { slots.panel = h('div', { cls: 'panel' }); slots.main.appendChild(slots.panel) }
    }
    // Detects engine events that move the user forward: a scan that stops on a match or reaches the end opens ③ Results.
    function autoAdvance() {
      var endNow = !!S.end, noteNow = S.note ? S.note.id : null;
      if ((endNow && !lastEnd) || (noteNow && noteNow !== lastNote)) { if (!V.ov && V.block === 2) V.block = 3 }
      lastRunning = S.running; lastEnd = endNow; lastNote = noteNow;
    }
    function update(state, local) {
      S = state; lang = state.lang || 'en';
      if (sentText != null && S.q && C.sig(C.parse(sentText, resolver).q) === C.sig(S.q)) sentText = null; // the engine caught up with the last search sent
      var k = state.nogrid ? 'nogrid' : (state.view === 'welcome' ? 'welcome' : (state.view === 'whatsnew' ? 'whatsnew' : (state.collapsed && !side ? 'pill' : 'panel')));
      if (!local) autoAdvance();
      var hadFocus = root.getRootNode().activeElement === input, edKey = hadFocus ? null : focusKey();
      quiet = true; try { updateBody(k) } finally { quiet = false }
      root.classList.toggle('disc', !!(state.settings && state.settings.discreet));
      if (hadFocus && input.isConnected) input.focus();
      else if (V.edFocus) { var el = root.querySelector('input[data-k="' + V.edFocus + '"]'); V.edFocus = null; if (el) el.focus() }
      else if (edKey) { var el2 = root.querySelector('input[data-k="' + edKey + '"]'); if (el2 && root.getRootNode().activeElement !== el2) el2.focus() }
    }
    function focusKey() { var a = root.getRootNode().activeElement; return a && a.getAttribute && a.getAttribute('data-k') }
    function updateBody(k) {
      if (k !== kind) skeleton(k);
      var L = lang;
      slot(slots.cards, 'cards', JSON.stringify([L, S.note, S.end, !!S.chatNote, S.crash, S.interrupted, S.cap, S.otherTabs, S.sideHint, S.notice, S.view, S.toast, S.running, S.settings && S.settings.capMin]), buildCards);
      if (S.toast && S.toast.id !== lastToast) { lastToast = S.toast.id; clearTimeout(toastTimer); toastTimer = setTimeout(function () { send({ a: 'toast-ok' }) }, 5000) }
      if (k === 'pill') { slot(slots.main, 'pill', [L, S.found, S.running].join('|'), buildPill); return }
      if (k === 'welcome') { slot(slots.main, 'welcome', [L, S.welcomeStep].join('|'), buildWelcome); return }
      if (k === 'whatsnew') { slot(slots.main, 'whatsnew', [L, S.notice, (S.searches || []).length].join('|'), buildWhatsNew); return }
      if (k === 'nogrid') { slot(slots.main, 'nogrid', L, function () { return h('div', { cls: 'panel nogrid' }, h('p', { text: T('spNo') }), h('div', { cls: 'acts' }, h('a', { cls: 'p', text: T('spOpen'), attrs: { href: 'https://web.grindr.com', target: '_blank', rel: 'noopener noreferrer' } }))) }); return }
      var P = slots.panel;
      slot(P, 'hd', L + (side ? 's' : '') + V.ov, buildHeader);
      if (V.ov) {
        ['b1', 'b2', 'b3', 'adv', 'drag'].forEach(function (n) { var el = slots[n + '$']; if (el) { el.remove(); delete slots[n + '$']; delete sigs[n] } });
        slot(P, 'ov', ovSig(), ovBuild);
        return;
      }
      if (slots['ov$']) { slots['ov$'].remove(); delete slots['ov$']; delete sigs.ov }
      var vb = V.block;
      slot(P, 'b1', JSON.stringify([L, vb, S.q, S.qText, (S.searches || []).length, S.searches && S.searches.map(function (s) { return s.name }), S.hasRun, S.running]), buildB1);
      slot(P, 'b2', JSON.stringify([L, vb, S.running, S.hasRun, S.status, S.scanned, S.found, S.favs, S.settings.speed, S.settings.pauseEach, S.settings.capMin, S.hasQuery, S.favFilter]), buildB2);
      var prevRes = slots.res, keepTop = prevRes && prevRes.isConnected ? prevRes.scrollTop : 0, curChanged = S.current !== lastCurrent; lastCurrent = S.current;
      var b3 = slot(P, 'b3', JSON.stringify([L, vb, S.matches, S.current, S.favFilter, S.counts, S.hasQuery, S.newCount, S.scanCount, S.settings.hideSeen, !!S.end, S.running, S.found]), buildB3);
      void b3;
      if (slots.res && slots.res !== prevRes && keepTop) slots.res.scrollTop = keepTop;
      if (curChanged && S.current >= 0) keepActiveVisible();
      slot(P, 'adv', JSON.stringify([L, V.adv, S.marks, (S.searches || []).length, S.scanCount]), buildAdv);
      if (!side) slot(P, 'drag', L, function () { return h('div', { cls: 'dragbar', on: { pointerdown: function (e) { ctx.dragStart && ctx.dragStart(e) } } }, ic('grip-horizontal'), h('span', { text: T('drag') })) });
      // keep order: header, blocks, advanced, drag
      ['hd', 'b1', 'b2', 'b3', 'adv', 'drag'].forEach(function (n) { var el = slots[n + '$']; if (el) P.appendChild(el) });
    }
    var lastToast = null, toastTimer = null, lastCurrent = -1;
    function ovSig() {
      var o = V.ov, base = [lang, o, V.ovArg, V.menu, V.rename, V.confirm, V.moveFor, S.unlocked];
      if (o === 'settings') base.push(S.settings, S.lock, S.version);
      else if (o === 'help') base.push(0);
      else if (o === 'data') base.push(S.searches.length, S.folders.length, S.scanCount, S.marks, S.lock);
      else if (o === 'selftest') base.push(S.selftest && S.selftest.t);
      else if (o === 'searches') base.push(S.searches, S.folders, S.q);
      else if (o === 'editor') base.push(ED && ED.sig());
      else if (o === 'journal') base.push(S.journal, S.lock);
      else if (o === 'scan') base.push(S.scan && S.scan.s, S.scan && S.scan.res.length, S.find);
      else if (o === 'compare') base.push(S.journal && S.journal.map(function (x) { return x.id }), V.cmpA, V.cmpB, S.cmp && [S.cmp.added.length, S.cmp.gone.length, S.cmp.a.id, S.cmp.b.id]);
      else if (o === 'marks') base.push(V.mtab, S.markList);
      return JSON.stringify(base);
    }
    function ovBuild() {
      var o = V.ov;
      if (o === 'settings') return ovSettings();
      if (o === 'help') return ovHelp();
      if (o === 'data') return ovData();
      if (o === 'selftest') return ovSelfTest();
      if (o === 'searches') return ovSearches();
      if (o === 'editor') return ED ? ED.build() : h('div');
      if (o === 'journal') return ovJournal();
      if (o === 'scan') return ovScan();
      if (o === 'compare') return ovCompare();
      if (o === 'marks') return ovMarks();
      return h('div');
    }
    function keepActiveVisible() {
      var res = slots.res, row = res && res.querySelector && res.querySelector('.r.on'); if (!row) return;
      if (side) { row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return } // side panel: the page itself scrolls
      var rr = res.getBoundingClientRect(), r = row.getBoundingClientRect();
      if (r.top < rr.top) res.scrollTo({ top: Math.max(0, res.scrollTop - (rr.top - r.top) - 4), behavior: 'smooth' });
      else if (r.bottom > rr.bottom) res.scrollTo({ top: res.scrollTop + (r.bottom - rr.bottom) + 4, behavior: 'smooth' });
    }
    // Esc closes an overlay (when not typing in a field).
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && V.ov && e.target.tagName !== 'INPUT') { e.stopPropagation(); closeOv() } });
    // Messages from the engine that are not state: a file to download (backup), focus the search field.
    function deliver(m) {
      if (!m) return;
      if (m.type === 'download') {
        var blob = new Blob([m.text], { type: 'application/json' }), url = URL.createObjectURL(blob);
        var a = h('a', { attrs: { href: url, download: m.name, style: 'display:none' } }); root.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url) }, 4000);
      } else if (m.type === 'focus') focusInput();
    }
    function focusInput() { V.ov = null; V.block = 1; redraw(); setTimeout(function () { input.focus() }, 0) }
    return { update: function (s) { update(s, false) }, root: root, focusInput: focusInput, deliver: deliver, clearDraft: function () { input.value = ''; typing = false } };
  }

  g.PNS_UI = { mount: mount };
})(typeof window !== 'undefined' ? window : self);

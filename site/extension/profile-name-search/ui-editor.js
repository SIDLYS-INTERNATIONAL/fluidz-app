/* Profile Name Search — "Advanced search" screen (step by step), used by ui.js and loaded right after it.
   Step 1 "Create keyword groups": a group = one criterion of criteria.js (optional name + synonym terms: one of them in the
     name is enough), plus a "Without" group for excluded words.
   Step 2 "Combine the groups": required groups must all match (AND); the groups left unticked are alternatives (one of them
     is enough, OR). Saved searches can be added as groups. A live preview says the search in words.
   Mapping to the criteria.js model (Query = alternatives of AND-ed items): the required items go into every alternative and
   each optional item makes one alternative. A query typed in the field that does not fit this shape (e.g. "a + b, c + d")
   keeps its own combination until a box is ticked. Pure view: the engine (content.js) applies the result. */
(function (g) {
  'use strict';
  var C = g.PNS_CRIT;
  var PH = ['phRole', 'phSize', 'phOrigin'];

  // api: { h, ic, btn, T, S(), V, send, redraw, nameOf, stopKeys, ovWrap, applySearch(q), closeEditor(ov) }
  function create(a) {
    var h = a.h, ic = a.ic, btn = a.btn, T = a.T, V = a.V, send = a.send, redraw = a.redraw;
    var prevTimer = null, holdTimer = null;

    function key(it) { return it.ref != null ? '@' + it.ref : C.norm(it.name) + '|' + it.terms.map(function (t) { return C.norm(t.t) + (t.w ? '|w' : '') }).join(',') }
    function newItem(ed) { var k = 'n' + (ed.n = (ed.n || 0) + 1); ed.items.push({ k: k, name: '', terms: [] }); ed.req[k] = true; return k }
    function valid(ed) { return ed.items.filter(function (it) { return it.ref != null || it.terms.length }) }
    function strip(it) { return it.ref != null ? { ref: it.ref, name: it.name } : { name: it.name, terms: it.terms } }

    /* ---------- model -> draft ---------- */
    function fromQuery(q) {
      q = C.clone(C.clean(q || C.emptyQuery()));
      var items = [], seen = {};
      var alts = q.groups.map(function (gr) { return gr.items.map(function (it) { var k = key(it); if (!seen[k]) { seen[k] = 1; it.k = k; items.push(it) } return k }) });
      var ed = { step: 1, items: items, exclude: q.exclude, req: {}, alts: null, n: 0 };
      if (!alts.length) { newItem(ed); return ed }
      // Items present in every alternative are required. If each alternative then has exactly one other item, those are the optional ones.
      var common = alts[0].filter(function (k) { return alts.every(function (al) { return al.indexOf(k) >= 0 }) });
      var rest = alts.map(function (al) { return al.filter(function (k) { return common.indexOf(k) < 0 }) });
      var fits = alts.length === 1 || rest.every(function (r) { return r.length === 1 });
      items.forEach(function (it) { ed.req[it.k] = alts.length === 1 || common.indexOf(it.k) >= 0 });
      if (!fits) ed.alts = alts;
      return ed;
    }
    /* ---------- draft -> model ---------- */
    function toQuery(ed) {
      var live = {}, vs = valid(ed); vs.forEach(function (it) { live[it.k] = it });
      var groups;
      if (ed.alts) { // combination as typed: kept, new groups are added to every alternative
        var fresh = vs.filter(function (it) { return !ed.alts.some(function (al) { return al.indexOf(it.k) >= 0 }) });
        groups = ed.alts.map(function (al) { return { items: al.filter(function (k) { return live[k] }).map(function (k) { return live[k] }).concat(fresh) } });
      } else {
        var req = vs.filter(function (it) { return ed.req[it.k] }), opt = vs.filter(function (it) { return !ed.req[it.k] });
        groups = opt.length ? opt.map(function (o) { return { items: req.concat([o]) } }) : [{ items: req }];
      }
      return C.clean({ groups: groups.map(function (gr) { return { items: gr.items.map(strip) } }), exclude: ed.exclude });
    }
    // How many groups a profile must match at once (the precision warning).
    function reqCount(q) { return q.groups.reduce(function (m, gr) { return Math.max(m, gr.items.length) }, 0) }

    /* ---------- the search in words ---------- */
    function itemWords(it) {
      if (it.ref != null) return a.nameOf(it.ref) || it.name || '?';
      var w = it.terms.map(function (t) { return t.t }).join(' ' + T('edOr') + ' ');
      return it.name ? it.name + ': ' + w : w;
    }
    function words(ed, q) {
      var AND = ', ' + T('opAnd') + ' ', OR = ', ' + T('opOr') + ' ', s;
      if (ed.alts) s = q.groups.map(function (gr) { var w = gr.items.map(itemWords).join(AND); return gr.items.length > 1 ? '(' + w + ')' : w }).join(OR);
      else {
        var vs = valid(ed), req = vs.filter(function (it) { return ed.req[it.k] }).map(itemWords), opt = vs.filter(function (it) { return !ed.req[it.k] }).map(itemWords);
        s = req.join(AND);
        if (opt.length) s += (s ? AND + '(' : '') + opt.join(OR) + (s ? ')' : '');
      }
      if (q.exclude.length) s += (s ? ', ' : '') + T('without').toLowerCase() + ' ' + q.exclude.map(function (t) { return t.t }).join(', ');
      return s;
    }

    /* ---------- open / change / preview ---------- */
    function open(q, forId) {
      V.ed = fromQuery(q); V.edFor = forId || null; V.edSave = false; V.edFocus = null; V.ov = 'editor'; V.edVer = (V.edVer || 0) + 1; V.menu = null;
      redraw(); preview();
    }
    function changed(focus) { V.edVer++; V.edFocus = focus || null; redraw(); preview() }
    function preview() { clearTimeout(prevTimer); prevTimer = setTimeout(function () { if (V.ed) send({ a: 'preview', q: toQuery(V.ed) }) }, 150) }
    function cancel() { V.ed = null; V.ov = null; redraw() }
    function addWords(list, raw) {
      String(raw).split(/[,，;|]/).forEach(function (w) { w = w.trim(); if (w && !list.some(function (t) { return C.norm(t.t) === C.norm(w) })) list.push({ t: w.slice(0, 60), w: false }) });
    }

    /* ---------- chips (a synonym; "word" toggle on hover, keyboard focus or long press) ---------- */
    function chipEl(t, list, i, k) {
      var el = h('span', { cls: 'chp' + (t.w ? ' w' : ''), on: {
        pointerdown: function () { clearTimeout(holdTimer); holdTimer = setTimeout(function () { el.classList.add('hold') }, 450) },
        pointerup: function () { clearTimeout(holdTimer) }, pointerleave: function () { clearTimeout(holdTimer) } } },
        h('span', { text: t.t }),
        h('button', { type: 'button', cls: 'ww', text: T('wwShort'), title: T('wholeT'), attrs: { 'aria-pressed': t.w ? 'true' : 'false' }, on: { click: function () { t.w = !t.w; changed() } } }),
        h('button', { type: 'button', title: T('remove') + ': ' + t.t, on: { click: function () { list.splice(i, 1); changed(k) } } }, ic('x')));
      return el;
    }
    function wordInput(list, k) {
      var inp = a.stopKeys(h('input', { cls: 'addw', attrs: { maxlength: '60', placeholder: T('addWord'), 'aria-label': T('addWord'), 'data-k': k } }));
      function flush() { if (inp.value.trim()) { addWords(list, inp.value); inp.value = ''; changed(k) } }
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); flush() }
        else if (e.key === 'Backspace' && !inp.value && list.length) { list.pop(); changed(k) }
        else if (e.key === 'Escape') { if (inp.value) inp.value = ''; else cancel() }
      });
      inp.addEventListener('blur', function () { if (inp.value.trim()) { addWords(list, inp.value); inp.value = ''; V.edVer++; preview(); setTimeout(redraw, 0) } });
      return inp;
    }

    /* ---------- shared pieces ---------- */
    function stepHead(n) {
      return h('div', { cls: 'steps', attrs: { 'data-step': String(n) } }, h('span', { cls: 'sn', text: T('edStep', { n: n }) }), h('b', { text: T(n === 1 ? 'ed1T' : 'ed2T') }),
        h('div', { cls: 'dots' }, h('i', { cls: n === 1 ? 'on' : '' }), h('i', { cls: n === 2 ? 'on' : '' })));
    }
    // The reminder: muted, coral once 3 or more groups are required at once.
    function precision(q) {
      var warn = reqCount(q) >= 3;
      return h('div', { cls: 'hint' + (warn ? ' warn' : ''), attrs: { 'data-precision': warn ? 'warn' : 'info', role: 'note' } }, ic(warn ? 'triangle-alert' : 'info'), h('span', { text: T('edPrecision') }));
    }
    function removeItem(ed, i) {
      var k = ed.items[i].k; ed.items.splice(i, 1); delete ed.req[k];
      if (ed.alts) { ed.alts = ed.alts.map(function (al) { return al.filter(function (x) { return x !== k }) }).filter(function (al) { return al.length }); if (!ed.alts.length) ed.alts = null }
      if (!ed.items.length) newItem(ed);
    }

    /* ---------- step 1: keyword groups ---------- */
    function groupCard(ed, it, i) {
      var k = it.k, n = ed.items.length;
      var up = btn('', null, function () { if (i > 0) { ed.items.splice(i, 1); ed.items.splice(i - 1, 0, it); changed() } }, 'chevron-up', T('edUp')); up.disabled = i === 0;
      var down = btn('', null, function () { if (i < n - 1) { ed.items.splice(i, 1); ed.items.splice(i + 1, 0, it); changed() } }, 'chevron-down', T('edDown')); down.disabled = i === n - 1;
      var tools = h('div', { cls: 'gt' }, up, down, btn('', null, function () { removeItem(ed, i); changed() }, 'x', T('edDel')));
      if (it.ref != null) {
        var nm = a.nameOf(it.ref);
        return h('div', { cls: 'crit ref', attrs: { 'data-group': k } }, h('div', { cls: 'cn' }, h('span', { cls: 'gn', text: String(i + 1) }), ic('folder'), h('b', { text: nm || it.name || '?' }), h('span', { cls: 'badge' + (nm ? '' : ' bad'), text: nm ? T('addSaved') : T('refMissing') }), tools));
      }
      var name = a.stopKeys(h('input', { cls: 'txt', attrs: { maxlength: '40', placeholder: T(PH[i % PH.length]), 'aria-label': T('edGroupName') } }));
      name.value = it.name || ''; name.addEventListener('input', function () { it.name = name.value; preview() });
      name.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var w = card.querySelector('.addw'); if (w) w.focus() } else if (e.key === 'Escape') cancel() });
      var card = h('div', { cls: 'crit', attrs: { 'data-group': k } },
        h('div', { cls: 'cn' }, h('span', { cls: 'gn', text: String(i + 1) }), name, tools),
        h('div', { cls: 'chips' }, it.terms.map(function (t, ti) { return chipEl(t, it.terms, ti, k) }), wordInput(it.terms, k)));
      return card;
    }
    function step1(ed, q) {
      var body = [stepHead(1), h('p', { cls: 'note', text: T('ed1Hint') + ' ' + T('edWW') })];
      ed.items.forEach(function (it, i) { body.push(groupCard(ed, it, i)) });
      body.push(h('div', { cls: 'links' }, btn('lk', T('edAddGroup'), function () { var k = newItem(ed); changed(k) }, 'plus')));
      body.push(h('div', { cls: 'crit x' }, h('div', { cls: 'cn' }, ic('ban'), h('b', { text: T('without') }), h('small', { text: T('edWithoutHint') })),
        h('div', { cls: 'chips' }, ed.exclude.map(function (t, ti) { return chipEl(t, ed.exclude, ti, 'x') }), wordInput(ed.exclude, 'x'))));
      body.push(precision(q));
      var empty = C.isEmpty(q), next = btn('lk p', T('nextW'), function () { if (!C.isEmpty(toQuery(ed))) { ed.step = 2; changed() } }, 'arrow-right'); next.disabled = empty;
      body.push(h('div', { cls: 'foot' }, empty ? h('span', { cls: 'note', attrs: { style: 'flex:1;align-self:center' }, text: T('edEmpty') }) : null, btn('lk', T('cancel'), cancel), next));
      return body;
    }

    /* ---------- step 2: combine ---------- */
    function step2(ed, q) {
      var S = a.S(), vs = valid(ed);
      var allReq = vs.every(function (it) { return ed.req[it.k] }), noneReq = vs.length > 1 && vs.every(function (it) { return !ed.req[it.k] });
      function setAll(v) { ed.alts = null; vs.forEach(function (it) { ed.req[it.k] = v }); changed() }
      var body = [stepHead(2), h('p', { cls: 'note', text: T('ed2Hint') })];
      body.push(h('div', { cls: 'chips mode', attrs: { role: 'group', 'aria-label': T('edModeL') } },
        h('button', { type: 'button', cls: 'c', text: T('edModeAnd'), attrs: { 'aria-pressed': !ed.alts && allReq ? 'true' : 'false', 'data-mode': 'and' }, on: { click: function () { setAll(true) } } }),
        h('button', { type: 'button', cls: 'c', text: T('edModeOr'), attrs: { 'aria-pressed': !ed.alts && noneReq ? 'true' : 'false', 'data-mode': 'or' }, on: { click: function () { setAll(false) } } })));
      if (ed.alts) body.push(h('p', { cls: 'note honest', text: T('edCustom') }));
      body.push(h('div', { cls: 'list' }, vs.map(function (it, i) {
        var on = !!ed.req[it.k];
        var cb = h('input', { type: 'checkbox', attrs: { 'aria-label': T('edReq'), 'data-req': it.k } }); cb.checked = on;
        cb.addEventListener('change', function () { ed.alts = null; ed.req[it.k] = cb.checked; changed() });
        var title = it.ref != null ? (a.nameOf(it.ref) || it.name || '?') : (it.name || T('edGroupN', { n: i + 1 }));
        var sub = it.ref != null ? T('addSaved') : it.terms.map(function (t) { return t.t }).join(' ' + T('edOr') + ' ');
        return h('label', { cls: 'it req' + (on ? ' on' : '') }, cb, h('div', { cls: 'tx' }, h('b', { text: title }), h('small', { text: sub })), h('span', { cls: 'badge' + (on ? ' req' : ''), text: on ? T('edReq') : T('edOpt') }));
      })));
      var others = (S.searches || []).filter(function (s) { return s.id !== V.edFor && !ed.items.some(function (it) { return it.ref === s.id }) });
      body.push(h('div', { cls: 'links' }, btn('lk', T('edAddSaved'), function () { V.menu = V.menu === 'pick' ? null : 'pick'; redraw() }, 'folder')));
      if (V.menu === 'pick') body.push(h('div', { cls: 'menu' }, others.length ? others.map(function (s) { return btn('', s.name, function () { var k = '@' + s.id; ed.items.push({ k: k, ref: s.id, name: s.name }); ed.req[k] = true; V.menu = null; changed() }) }) : h('p', { cls: 'note', text: T('noSaved') })));
      var empty = C.isEmpty(q), pv = S.preview, n = pv && pv.sig === C.sig(q) ? pv.n : null;
      body.push(h('div', { cls: 'prev' }, h('h4', { text: T('preview') }), h('p', { cls: 'pvw', attrs: { 'data-words': '' }, text: empty ? T('edEmpty') : words(ed, q) }),
        h('div', { cls: 'cnt', attrs: { 'data-preview': '' }, text: empty ? '' : (n == null ? '…' : T('previewN', { n: n })) })));
      body.push(precision(q));
      if (V.edSave) {
        var nameIn = a.stopKeys(h('input', { cls: 'txt', attrs: { maxlength: '60', placeholder: C.shortText(q, a.nameOf, 40) || T('searchName'), 'aria-label': T('searchName') } }));
        var fsel = h('select', { cls: 'txt', attrs: { 'aria-label': T('folder') } }, (S.folders || []).map(function (f) { return h('option', { text: f.name || T('folderDefault'), attrs: { value: f.id } }) }));
        var doSave = function () { send({ a: 'search-save', q: q, name: nameIn.value, folder: fsel.value }); V.edSave = false; redraw() };
        nameIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSave(); else if (e.key === 'Escape') { V.edSave = false; redraw() } });
        body.push(h('div', { cls: 'sec' }, h('h4', { text: T('saveAs') }), h('div', { cls: 'frm' }, nameIn, fsel), h('div', { cls: 'foot' }, btn('lk', T('cancel'), function () { V.edSave = false; redraw() }), btn('lk p', T('save'), doSave, 'star'))));
        setTimeout(function () { nameIn.focus() }, 0);
      }
      var forName = V.edFor ? a.nameOf(V.edFor) : '';
      if (!V.edSave) body.push(h('div', { cls: 'foot' },
        btn('lk', T('back'), function () { ed.step = 1; changed() }, 'arrow-left'),
        btn('lk', T('cancel'), cancel),
        btn('lk', forName ? T('saveChanges') : T('save'), function () { if (empty) return; if (forName) { send({ a: 'search-update', id: V.edFor, q: q }); a.closeEditor('searches') } else { V.edSave = true; redraw() } }, 'star'),
        btn('lk p', T('searchBtn'), function () { if (!empty) a.applySearch(q) }, 'search')));
      return body;
    }

    function build() {
      var ed = V.ed; if (!ed) return h('div');
      var q = toQuery(ed), forName = V.edFor ? a.nameOf(V.edFor) : '';
      return a.ovWrap(forName ? T('editorOf', { name: forName }) : T('editorT'), h('div', { cls: 'edb', attrs: { 'data-step': String(ed.step) } }, ed.step === 1 ? step1(ed, q) : step2(ed, q)));
    }
    function sig() { var S = a.S(); return JSON.stringify([V.edVer, V.edSave, V.menu, (S.searches || []).map(function (s) { return s.name }), S.preview]) }
    return { open: open, build: build, sig: sig, fromQuery: fromQuery, toQuery: toQuery, words: words };
  }

  g.PNS_UI_EDITOR = { create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = g.PNS_UI_EDITOR;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

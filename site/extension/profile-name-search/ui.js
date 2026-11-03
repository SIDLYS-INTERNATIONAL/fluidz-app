/* Profile Name Search — panel UI. Pure view: renders a state object and sends actions.
   Used in two hosts: the floating panel (content script, inside a shadow root) and Chrome's side panel. */
(function (g) {
  'use strict';

  var CSS = [
    ':host{all:initial}',
    '.root{--bg:#05040A;--bg1:#0D0C16;--bg2:#141222;--bg3:#1D1B2E;--tx:#EDE8F5;--tx2:rgba(237,232,245,.56);--tx3:rgba(237,232,245,.28);--p:#E0887A;--p2:rgba(224,136,122,.12);--pbd:rgba(224,136,122,.28);--sage:#6BA888;--lav:#9080BA;--rule:rgba(255,255,255,.05);--rule2:rgba(255,255,255,.09);--ink:#14090A;',
    'box-sizing:border-box;width:340px;max-width:100%;display:flex;flex-direction:column;gap:10px;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--tx);text-align:left;font-size:13px;line-height:1.3;-webkit-font-smoothing:antialiased}',
    '.root *{box-sizing:border-box;margin:0;font-family:inherit}',
    '.root.side{width:100%;min-height:100vh;background:var(--bg);padding:10px}',
    '.ic{width:1em;height:1em;flex-shrink:0;display:inline-block;vertical-align:middle}',
    'button{cursor:pointer;font:inherit;color:inherit;background:none;border:0;padding:0}',
    'button:focus-visible,input:focus-visible{outline:2px solid var(--p);outline-offset:2px}',
    '.card,.panel,.pw{background:rgba(13,12,22,.95);border:1px solid var(--rule2);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.6);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px)}',
    '.root.side .card,.root.side .panel,.root.side .pw{box-shadow:none}',
    '.panel{padding:14px;display:flex;flex-direction:column;gap:10px}',
    '.hd{display:flex;align-items:center;justify-content:space-between;height:31px}',
    '.brand{display:flex;align-items:center;gap:8px;min-width:0}',
    '.grip{width:22px;height:28px;border-radius:6px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;color:var(--tx2);font-size:14px;cursor:grab;touch-action:none}',
    '.drop{width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#E0887A,#9080BA);flex-shrink:0}',
    '.brand b{display:block;font-size:14px;font-weight:700;line-height:1.15;white-space:nowrap}',
    '.brand small{display:block;font-size:10px;font-weight:600;color:var(--tx3)}',
    '.btns{display:flex;gap:4px}',
    '.btns button{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;color:var(--tx2);font-size:15px}',
    '.btns button:hover{background:rgba(255,255,255,.09)}',
    '.btns button.on{background:var(--p2);color:var(--p)}',
    '.step{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700}',
    '.step i{width:20px;height:20px;border-radius:50%;background:var(--p2);color:var(--p);font-style:normal;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '.field{min-height:40px;background:var(--bg3);border:1px solid var(--pbd);border-radius:12px;padding:7px 10px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;cursor:text}',
    '.chip{display:inline-flex;align-items:center;gap:4px;background:var(--p2);color:var(--p);font-size:13px;font-weight:700;border-radius:999px;padding:3px 6px 3px 10px;max-width:100%}',
    '.chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.chip button{color:var(--p);font-size:12px;display:flex;border-radius:50%}',
    '.field input{flex:1;min-width:90px;background:none;border:0;outline:0;color:var(--tx);font-size:13px;padding:2px 0}',
    '.field input::placeholder{color:var(--tx3)}',
    '.tip{display:flex;gap:6px;font-size:11.5px;line-height:1.45;color:var(--tx2)}',
    '.tip .ic{color:var(--lav);font-size:13px;margin-top:2px}',
    '.saved{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--tx3)}',
    '.saved .pl{border:1px solid var(--rule2);border-radius:999px;padding:4px 10px;font-weight:600;color:var(--tx2);display:inline-flex;align-items:center;gap:6px;max-width:100%}',
    '.saved .pl:hover{border-color:var(--pbd);color:var(--tx)}',
    '.saved .pl em{font-style:normal;color:var(--tx3);font-size:11px;line-height:1}',
    '.saved .pl em:hover{color:var(--p)}',
    '.saved .pl.add{background:rgba(255,255,255,.04);border-color:transparent}',
    '.row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12.5px;font-weight:600;color:var(--tx2);min-height:20px}',
    '.row label{display:flex;align-items:center;gap:6px;cursor:pointer}',
    '.tg{width:36px;height:20px;border-radius:999px;background:var(--bg3);padding:2px;display:flex;flex-shrink:0;transition:background .2s;cursor:pointer}',
    '.tg i{width:16px;height:16px;border-radius:50%;background:#fff;display:block;transition:transform .2s}',
    '.tg[aria-checked=true]{background:var(--p)}.tg[aria-checked=true] i{transform:translateX(16px)}',
    'hr{border:0;height:1px;background:var(--rule2)}',
    '.go{height:42px;border-radius:12px;background:var(--p);color:var(--ink);font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;width:100%}',
    '.go:hover{filter:brightness(1.06)}',
    '.go.stop{background:var(--bg3);color:var(--p)}',
    '.help{display:flex;gap:6px;font-size:11px;line-height:1.45;color:var(--tx3)}',
    '.help .ic{font-size:12px;margin-top:2px}',
    '.status{font-size:11px;font-weight:600;color:var(--lav);min-height:0;margin-top:-4px}',
    '.speed{display:flex;flex-direction:column;gap:5px}',
    '.speed .sr{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12.5px;font-weight:600;color:var(--tx2)}',
    '.speed .sr>span{margin-right:2px}',
    '.speed .sr button{border-radius:999px;padding:4px 10px;font-size:11.5px;font-weight:800;background:rgba(255,255,255,.05);color:var(--tx2)}',
    '.speed .sr button:hover{background:rgba(255,255,255,.09)}',
    '.speed .sr button[aria-pressed=true]{background:var(--p);color:var(--ink)}',
    '.speed .sh2{font-size:11px;line-height:1.4;color:var(--tx3)}',
    '.speed .sh2.warn{color:var(--p)}',
    '.help{flex-direction:column;gap:5px}',
    '.help .hl{display:flex;gap:6px}',
    '.gauges{display:flex;gap:8px}',
    '.gauge{flex:1;background:rgba(255,255,255,.025);border-radius:12px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;min-width:0}',
    '.gauge .w{position:relative;width:58px;height:58px;display:flex;align-items:center;justify-content:center}',
    '.gauge .ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--c) calc(var(--v)*1%),rgba(255,255,255,.08) 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px))}',
    '.gauge b{position:relative;font-weight:800;font-size:20px;color:var(--c);letter-spacing:-.02em}',
    '.gauge b.sm{font-size:15px}',
    '.gauge small{font-size:10.5px;line-height:1.25;color:var(--tx2)}',
    '.nav{display:flex;align-items:center;justify-content:space-between;height:26px}',
    '.nav button{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.04);border-radius:999px;padding:6px 10px;font-size:11.5px;font-weight:700;color:var(--tx2)}',
    '.nav button:hover{background:rgba(255,255,255,.09)}',
    '.nav button:disabled{opacity:.4;cursor:default}',
    '.nav .ic{font-size:12px}',
    '.nav span{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:11px;color:var(--tx3)}',
    '.res{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent}',
    '.root.side .res{max-height:none}',
    '.r{display:flex;align-items:center;gap:10px;border-radius:12px;padding:8px 10px;background:rgba(255,255,255,.03);border:1px solid var(--rule);cursor:pointer;flex-shrink:0}',
    '.r.on{background:var(--p2);border-color:var(--pbd)}',
    '.av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#3A3540,#5A4E60);flex-shrink:0;object-fit:cover;display:block}',
    '.r .tx{flex:1;min-width:0}',
    '.r .tx b{display:block;font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.r .tx b .ic{color:var(--p);font-size:11px;margin-right:4px;fill:var(--p)}',
    '.r .tx small{display:block;font-size:10.5px;color:var(--tx3);line-height:1.3}',
    '.sh{display:inline-flex;align-items:center;gap:3px;border-radius:999px;padding:5px 8px;font-size:11.5px;font-weight:800;background:rgba(255,255,255,.07);color:var(--tx);white-space:nowrap;flex-shrink:0}',
    '.r.on .sh{background:var(--p);color:var(--ink)}',
    '.sh .ic{font-size:12px}',
    '.empty{font-size:12px;line-height:1.45;color:var(--tx3);text-align:center;padding:10px 6px}',
    '.dragbar{height:22px;border-radius:8px;background:rgba(255,255,255,.03);display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px;font-weight:600;color:var(--tx3);cursor:grab;touch-action:none}',
    '.dragbar .ic{font-size:14px}',
    /* cards */
    '.card{padding:14px;display:flex;flex-direction:column;gap:10px}',
    '.card.end{border-color:var(--lav);padding:16px}',
    '.card.end h4{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700}',
    '.card.end h4 .ic{color:var(--lav);font-size:16px}',
    '.card.end p{font-size:12.5px;line-height:1.5;color:var(--tx2)}',
    '.acts{display:flex;gap:8px;flex-wrap:wrap}',
    '.acts button,.acts a{border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;background:rgba(255,255,255,.07);color:var(--tx);text-decoration:none;display:inline-flex;align-items:center;gap:4px}',
    '.acts .p{background:var(--p);color:var(--ink);font-weight:800}',
    '.card.chat{padding:12px 14px;gap:8px}',
    '.card.chat p{font-size:11.5px;line-height:1.5;color:var(--tx2)}',
    '.card.chat p.t{color:var(--tx3)}',
    '.card.note{border-color:var(--pbd);flex-direction:row;align-items:center;gap:12px}',
    '.card.note .av{width:40px;height:40px}',
    '.card.note .tx{flex:1;min-width:0}.card.note .tx b{display:block;font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.card.note .tx small{display:block;font-size:11.5px;color:var(--tx2);line-height:1.4;margin-top:2px}',
    '.card.note .na{display:flex;flex-direction:column;gap:6px}',
    '.card.note .na button{border-radius:999px;padding:5px 10px;font-size:11.5px;font-weight:700;background:rgba(255,255,255,.07);text-align:center}',
    '.card.note .na .p{background:var(--p);color:var(--ink);font-weight:800}',
    /* pill */
    '.pill{display:inline-flex;align-items:center;gap:10px;border-radius:999px;padding:10px 14px 10px 12px;width:auto;align-self:flex-start;cursor:pointer;background:rgba(13,12,22,.95);border:1px solid var(--rule2);box-shadow:0 20px 60px rgba(0,0,0,.6);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);touch-action:none}',
    '.pill b{font-size:13px;font-weight:700;white-space:nowrap}',
    '.pill .cnt{background:var(--p);color:var(--ink);border-radius:999px;padding:2px 8px;font-size:11px;font-weight:800}',
    '.pill .st{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--sage);white-space:nowrap}',
    '.pill .st i{width:7px;height:7px;border-radius:50%;background:var(--sage)}',
    '.pill .ic{color:var(--tx2);font-size:14px}',
    /* welcome */
    '.pw{padding:16px;display:flex;flex-direction:column;gap:12px}',
    '.pw .top{display:flex;justify-content:space-between;font-size:11px;font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;color:var(--p)}',
    '.pw .top button{font-family:inherit;font-weight:600;color:var(--tx3);font-size:12px}',
    '.pw .lg{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--tx3);flex-wrap:wrap}',
    '.pw .lg button{font-size:11px;font-weight:800;border-radius:999px;padding:4px 8px;background:rgba(255,255,255,.05);color:var(--tx2)}',
    '.pw .lg button.on{background:var(--p);color:var(--ink)}',
    '.pw h4{font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.1}',
    '.pw .il{background:var(--bg2);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px}',
    '.pw .il .f{background:var(--bg3);border:1px solid var(--pbd);border-radius:12px;padding:8px 10px;display:flex;gap:6px;flex-wrap:wrap}',
    '.pw .il .f span{background:var(--p2);color:var(--p);font-size:13px;font-weight:700;border-radius:999px;padding:3px 10px}',
    '.pw .il .big{background:var(--p);color:var(--ink);font-weight:800;font-size:13px;border-radius:12px;padding:10px;text-align:center}',
    '.pw .il small{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;font-size:11px;color:var(--tx2)}',
    '.pw p{font-size:13px;line-height:1.5;color:var(--tx2)}',
    '.pw .bot{display:flex;justify-content:space-between;align-items:center}',
    '.pw .dots{display:flex;align-items:center;gap:6px}.pw .dots i{width:6px;height:6px;border-radius:50%;background:var(--tx3)}.pw .dots i.on{width:18px;border-radius:3px;background:var(--p)}',
    '.pw .nx{background:var(--p);color:var(--ink);font-weight:800;font-size:13px;border-radius:999px;padding:9px 16px;display:inline-flex;align-items:center;gap:6px}',
    '.nogrid{font-size:12.5px;line-height:1.5;color:var(--tx2);padding:6px 2px}',
    '@media (prefers-reduced-motion:reduce){.tg,.tg i{transition:none}}'
  ].join('\n');

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
    if (a.attrs) for (var n in a.attrs) e.setAttribute(n, a.attrs[n]);
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i]; if (c == null || c === false) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }

  function mount(host, ctx) {
    var side = ctx.mode === 'side', S = null, lang = 'en';
    var T = function (k, v) { return g.PNS_T(lang, k, v) };
    var style = document.createElement('style'); style.textContent = CSS;
    var root = h('div', { cls: 'root' + (side ? ' side' : '') });
    host.appendChild(style); host.appendChild(root);
    var input = h('input', { type: 'text', attrs: { autocomplete: 'off', spellcheck: 'false', maxlength: '60' } });
    var kind = '', slots = {}, sigs = {}, resEl = null, cardsEl = null;

    function send(a) { ctx.send(a) }

    function slot(name, sig, build) {
      if (sigs[name] === sig && slots[name]) return;
      sigs[name] = sig;
      var n = build();
      if (slots[name] && slots[name].parentNode) slots[name].replaceWith(n);
      slots[name] = n;
    }
    function mountSlot(parent, name) { slots[name] = h('div'); parent.appendChild(slots[name]) }

    /* ---------- builders ---------- */
    function commitDraft() {
      var v = input.value.trim().replace(/,+$/, '').trim();
      if (!v) return false;
      var gs = S.groups.slice(); if (gs.indexOf(v) < 0) gs.push(v);
      gs = gs.slice(0, 12); S.groups = gs; input.value = ''; send({ a: 'draft', v: '' }); send({ a: 'groups', groups: gs }); return true;
    }
    input.addEventListener('input', function () {
      if (input.value.indexOf(',') >= 0) { var parts = input.value.split(','); var last = parts.pop(); input.value = parts.join(',') + (parts.length ? ',' : ''); commitDraft(); input.value = last; }
      send({ a: 'draft', v: input.value });
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!commitDraft()) send({ a: e.shiftKey ? 'prev' : 'next' }); }
      else if (e.key === 'Backspace' && !input.value && S.groups.length) { e.stopPropagation(); S.groups = S.groups.slice(0, -1); send({ a: 'groups', groups: S.groups }) }
      else e.stopPropagation();
    });
    input.addEventListener('keyup', function (e) { e.stopPropagation() });
    input.addEventListener('keypress', function (e) { e.stopPropagation() });
    input.addEventListener('blur', function () { if (input.value.trim()) commitDraft() });

    function buildHeader() {
      var left = h('div', { cls: 'brand' },
        side ? null : h('span', { cls: 'grip', title: T('drag'), on: { pointerdown: function (e) { ctx.dragStart && ctx.dragStart(e) } } }, ic('grip-vertical')),
        h('span', { cls: 'drop' }),
        h('div', null, h('b', { text: 'Profile Name Search' }), h('small', { text: T('by') })));
      var btns = h('div', { cls: 'btns' },
        h('button', { type: 'button', cls: 'on', title: T('tips'), on: { click: function () { send({ a: 'tips' }) } } }, ic('lightbulb')),
        h('button', { type: 'button', title: side ? T('floatBack') : T('side'), on: { click: function () { send({ a: side ? 'float' : 'side' }) } } }, ic('panel-right')),
        side ? null : h('button', { type: 'button', title: T('min'), on: { click: function () { send({ a: 'min' }) } } }, ic('minus')),
        side ? null : h('button', { type: 'button', title: T('close'), on: { click: function () { send({ a: 'close' }) } } }, ic('x')));
      return h('div', { cls: 'hd' }, left, btns);
    }
    function stepRow(n, text) { return h('div', { cls: 'step' }, h('i', { text: String(n) }), h('span', { text: text })) }
    function toggle(on, label, action) {
      var tg = h('button', { type: 'button', cls: 'tg', attrs: { role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': label }, on: { click: function () { send({ a: action }) } } }, h('i'));
      return tg;
    }
    function buildField() {
      var f = h('div', { cls: 'field', on: { click: function () { input.focus() } } });
      S.groups.forEach(function (gp, i) {
        f.appendChild(h('span', { cls: 'chip' }, h('span', { text: gp }),
          h('button', { type: 'button', title: T('clearChip') + ': ' + gp, on: { click: function (e) { e.stopPropagation(); S.groups = S.groups.filter(function (_, j) { return j !== i }); send({ a: 'groups', groups: S.groups }) } } }, ic('x'))));
      });
      input.placeholder = S.groups.length ? '' : T('ph');
      f.appendChild(input);
      return f;
    }
    function buildSaved() {
      var w = h('div', { cls: 'saved' }, h('span', { text: T('saved') }));
      S.saved.forEach(function (s, i) {
        w.appendChild(h('span', { cls: 'pl' },
          h('button', { type: 'button', text: s, on: { click: function () { send({ a: 'load-saved', i: i }) } } }),
          h('em', { attrs: { role: 'button', tabindex: '0' }, title: T('unsave'), text: '×', on: { click: function () { send({ a: 'del-saved', i: i }) }, keydown: function (e) { if (e.key === 'Enter') send({ a: 'del-saved', i: i }) } } })));
      });
      var can = S.groups.length > 0 && S.saved.indexOf(S.groups.join(', ')) < 0;
      if (can) w.appendChild(h('button', { type: 'button', cls: 'pl add', text: T('save'), title: S.saved.length >= 3 ? T('saveFull') : '', on: { click: function () { send({ a: 'save' }) } } }));
      return w;
    }
    function buildGo() {
      var running = S.running, label = running ? T('pause') : (S.hasRun ? T('resume') : T('start'));
      var b = h('button', { type: 'button', cls: 'go' + (running ? ' stop' : ''), on: { click: function () { send({ a: 'toggle-scroll' }) } } }, ic(running ? 'pause' : 'play'), h('span', { text: label }));
      return b;
    }
    function buildStatus() {
      return S.status ? h('div', { cls: 'status', text: S.status, attrs: { role: 'status' } }) : h('div', { attrs: { style: 'display:none' } });
    }
    function buildSpeed() {
      var gentle = S.speed !== 'fast';
      function chip(v, label) { return h('button', { type: 'button', text: label, attrs: { 'aria-pressed': (S.speed === 'fast' ? v === 'fast' : v === 'gentle') ? 'true' : 'false' }, on: { click: function () { send({ a: 'speed', v: v }) } } }) }
      return h('div', { cls: 'speed' },
        h('div', { cls: 'sr', attrs: { role: 'group', 'aria-label': T('speedLbl') } }, h('span', { text: T('speedLbl') }), chip('gentle', T('speedGentle')), chip('fast', T('speedFast'))),
        h('div', { cls: 'sh2' + (gentle ? '' : ' warn'), text: gentle ? T('speedGentleHint') : T('speedFastHint') }));
    }
    function ring(v, c, num, label, sm) {
      return h('div', { cls: 'gauge' }, h('div', { cls: 'w' }, h('div', { cls: 'ring', attrs: { style: '--v:' + v + ';--c:' + c } }), h('b', { cls: sm ? 'sm' : '', text: String(num), attrs: { style: '--c:' + c } })), h('small', { text: label }));
    }
    function fmtN(n) { try { return n.toLocaleString(lang === 'en' ? 'en-US' : lang).replace(/ | /g, ' ') } catch (e) { return String(n) } }
    function buildGauges() {
      var sc = S.scanned, fd = S.found, fv = S.favs;
      var vf = fd > 0 && sc > 0 ? Math.max(8, Math.min(100, fd / sc * 100)) : 0, vv = fd > 0 ? fv / fd * 100 : 0;
      return h('div', { cls: 'gauges' },
        ring(sc > 0 ? 100 : 0, '#6BA888', fmtN(sc), T('gScanned'), String(sc).length > 3),
        ring(vf, '#E0887A', fd, T('gFound')),
        ring(vv, '#9080BA', fv, T('gFav')));
    }
    function buildNav() {
      var n = S.matches.length;
      return h('div', { cls: 'nav' },
        h('button', { type: 'button', attrs: n === 0 ? { disabled: '' } : null, on: { click: function () { send({ a: 'prev' }) } } }, ic('chevron-left'), h('span', { text: T('prev'), attrs: { style: 'font:inherit;color:inherit' } })),
        h('span', { text: n ? (Math.max(S.current, 0) + 1) + ' / ' + n : '0 / 0' }),
        h('button', { type: 'button', on: { click: function () { send({ a: 'next' }) } } }, h('span', { text: T('next'), attrs: { style: 'font:inherit;color:inherit' } }), ic('chevron-right')));
    }
    function buildResults() {
      var box = h('div', { cls: 'res', attrs: { role: 'list' } });
      if (!S.matches.length) {
        box.appendChild(h('div', { cls: 'empty', text: S.groups.length || S.hasDraft || S.favOnly ? T('noMatch') : T('empty') }));
        return box;
      }
      S.matches.forEach(function (m, i) {
        var on = i === S.current;
        var av = m.thumb ? h('img', { cls: 'av', attrs: { src: m.thumb, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' } }) : h('div', { cls: 'av' });
        var nm = h('b', null, m.fav ? ic('star') : null, document.createTextNode(m.name));
        var row = h('div', { cls: 'r' + (on ? ' on' : ''), attrs: { role: 'listitem' }, on: { click: function () { send({ a: 'show', id: m.id }) } } },
          av, h('div', { cls: 'tx' }, nm, h('small', { text: m.on ? T('onScreen') : T('pastBack') })),
          h('span', { cls: 'sh' }, h('span', { text: T('show') }), ic('locate-fixed')));
        box.appendChild(row);
      });
      return box;
    }
    function buildCards() {
      var box = h('div', { attrs: { style: 'display:contents' } });
      if (S.note) {
        box.appendChild(h('div', { cls: 'card note' },
          S.note.thumb ? h('img', { cls: 'av', attrs: { src: S.note.thumb, alt: '', referrerpolicy: 'no-referrer' } }) : h('div', { cls: 'av' }),
          h('div', { cls: 'tx' }, h('b', { text: T('noteTitle', { name: S.note.name }) }), h('small', { text: T('noteText') })),
          h('div', { cls: 'na' }, h('button', { type: 'button', cls: 'p', text: T('noteShow'), on: { click: function () { send({ a: 'note-show' }) } } }),
            h('button', { type: 'button', text: T('noteResume'), on: { click: function () { send({ a: 'note-resume' }) } } }))));
      }
      if (S.end) {
        var k = S.end.found;
        box.appendChild(h('div', { cls: 'card end' },
          h('h4', null, ic('flag'), h('span', { text: T('endTitle') })),
          h('p', { text: T('endText', { n: fmtN(S.end.scanned) }) }),
          h('div', { cls: 'acts' },
            h('button', { type: 'button', cls: 'p', text: k ? T('endSee', { k: k }) : T('endSee0'), on: { click: function () { send({ a: 'end-see' }); scrollToResults() } } }))));
      }
      if (S.chatNote) {
        box.appendChild(h('div', { cls: 'card chat', attrs: { role: 'note' } },
          h('p', { text: T('chatNote') }), h('p', { cls: 't', text: T('chatTip') }),
          h('div', { cls: 'acts' }, h('button', { type: 'button', text: T('chatNoteOk'), on: { click: function () { send({ a: 'chat-note-ok' }) } } }))));
      }
      return box;
    }
    function buildPill() {
      var p = h('div', { cls: 'pill', attrs: { role: 'button', tabindex: '0', 'aria-label': T('max') }, on: {
        pointerdown: function (e) { if (ctx.dragStart) ctx.dragStart(e, function () { send({ a: 'min' }) }); else send({ a: 'min' }) },
        keydown: function (e) { if (e.key === 'Enter' || e.key === ' ') send({ a: 'min' }) } } },
        h('span', { cls: 'drop' }), h('b', { text: 'Profile Name Search' }),
        S.found > 0 ? h('span', { cls: 'cnt', text: String(S.found) }) : null,
        S.running ? h('span', { cls: 'st' }, h('i'), document.createTextNode(T('scrolling'))) : null,
        ic('maximize-2'));
      return p;
    }
    function buildWelcome() {
      var n = S.welcomeStep || 1, last = n === 3;
      var langs = h('div', { cls: 'lg' }, h('span', { text: T('lang') }));
      g.PNS_LANGS.forEach(function (l) { langs.appendChild(h('button', { type: 'button', cls: l[0] === lang ? 'on' : '', text: l[1], title: l[2], on: { click: function () { send({ a: 'lang', l: l[0] }) } } })) });
      var il = h('div', { cls: 'il' });
      if (n === 1) { il.appendChild(h('div', { cls: 'f' }, h('span', { text: 'jay, mike' }), h('span', { text: 'dom + top' }), h('span', { text: '🚀' }))); il.appendChild(h('small', { text: T('w1s') })) }
      else if (n === 2) { il.appendChild(h('div', { cls: 'big', text: T('w2s') })); il.appendChild(h('small', { text: '1 200 · 9 · 5' })) }
      else { il.appendChild(h('div', { cls: 'big', text: T('w3s') })); il.appendChild(h('small', { text: T('pastBack') })) }
      var dots = h('div', { cls: 'dots' }); for (var i = 1; i <= 3; i++) dots.appendChild(h('i', { cls: i === n ? 'on' : '' }));
      return h('div', { cls: 'pw' },
        h('div', { cls: 'top' }, h('span', { text: T('step', { n: n }) }), h('button', { type: 'button', text: T('skip'), on: { click: function () { send({ a: 'welcome-skip' }) } } })),
        n === 1 ? langs : null,
        h('h4', { text: T('w' + n + 'h') }), il, h('p', { text: T('w' + n + 'p') }),
        h('div', { cls: 'bot' }, dots, h('button', { type: 'button', cls: 'nx', on: { click: function () { send({ a: 'welcome-next' }) } } }, h('span', { text: last ? T('done') : T('nextW') }), last ? ic('check') : ic('arrow-right'))));
    }

    /* ---------- skeleton ---------- */
    function skeleton(k) {
      while (root.firstChild) root.removeChild(root.firstChild);
      slots = {}; sigs = {}; kind = k;
      cardsEl = h('div', { attrs: { style: 'display:contents' } }); root.appendChild(cardsEl); slots.cards = h('div'); cardsEl.appendChild(slots.cards);
      if (k === 'pill') { mountSlot(root, 'pill'); return }
      if (k === 'welcome') { mountSlot(root, 'welcome'); return }
      if (k === 'nogrid') { mountSlot(root, 'nogrid'); return }
      var p = h('div', { cls: 'panel' }); root.appendChild(p);
      mountSlot(p, 'hd');
      mountSlot(p, 's1'); mountSlot(p, 'field'); mountSlot(p, 'tip'); mountSlot(p, 'saved'); mountSlot(p, 'fav');
      p.appendChild(h('hr')); mountSlot(p, 's2'); mountSlot(p, 'go'); mountSlot(p, 'status'); mountSlot(p, 'speed'); mountSlot(p, 'pause'); mountSlot(p, 'help'); mountSlot(p, 'gauges');
      p.appendChild(h('hr')); mountSlot(p, 's3'); mountSlot(p, 'nav'); mountSlot(p, 'res');
      if (!side) mountSlot(p, 'drag');
    }

    function update(state) {
      S = state; lang = state.lang || 'en';
      var k = state.nogrid ? 'nogrid' : (state.view === 'welcome' ? 'welcome' : (state.collapsed && !side ? 'pill' : 'panel'));
      var hadFocus = root.getRootNode().activeElement === input;
      if (k !== kind) skeleton(k);
      var L = lang;
      slot('cards', JSON.stringify([L, S.note, S.end, !!S.chatNote]), buildCards);
      if (k === 'pill') { slot('pill', [L, S.found, S.running].join('|'), buildPill); return }
      if (k === 'welcome') { slot('welcome', [L, S.welcomeStep].join('|'), buildWelcome); return }
      if (k === 'nogrid') { slot('nogrid', L, function () { return h('div', { cls: 'panel nogrid' }, h('p', { text: T('spNo') }), h('div', { cls: 'acts' }, h('a', { cls: 'p', text: T('spOpen'), attrs: { href: 'https://web.grindr.com', target: '_blank', rel: 'noopener noreferrer' } }))) }); return }
      slot('hd', L + (side ? 's' : ''), buildHeader);
      slot('s1', L, function () { return stepRow(1, T('s1')) });
      slot('field', L + JSON.stringify(S.groups), buildField);
      slot('tip', L, function () { return h('div', { cls: 'tip' }, ic('sparkles'), h('div', null, h('div', { text: T('tip1') }), h('div', { text: T('tip2') }))) });
      slot('saved', L + JSON.stringify([S.saved, S.groups]), buildSaved);
      slot('fav', L + S.favOnly, function () { return h('div', { cls: 'row' }, h('span', { text: '★  ' + T('onlyFav') }), toggle(S.favOnly, T('onlyFav'), 'fav')) });
      slot('s2', L, function () { return stepRow(2, T('s2')) });
      slot('go', [L, S.running, S.hasRun].join('|'), buildGo);
      slot('status', S.status || '', buildStatus);
      slot('speed', [L, S.speed].join('|'), buildSpeed);
      slot('pause', L + S.pauseEach, function () { return h('div', { cls: 'row' }, h('span', { text: T('pauseEach') }), toggle(S.pauseEach, T('pauseEach'), 'pause-each')) });
      slot('help', L, function () { return h('div', { cls: 'help' }, h('div', { cls: 'hl' }, ic('info'), h('span', { text: T('scrollHelp') })), h('div', { cls: 'hl' }, ic('info'), h('span', { text: T('scrollHelp2') }))) });
      slot('gauges', [L, S.scanned, S.found, S.favs].join('|'), buildGauges);
      slot('s3', L, function () { return stepRow(3, T('s3')) });
      slot('nav', [L, S.matches.length, S.current].join('|'), buildNav);
      // The list is rebuilt whenever matches or the active row change: keep its scroll position, and only scroll (smoothly, inside the list)
      // when the active row is out of view. Never jump back to the top.
      var prevRes = slots.res, keepTop = prevRes ? prevRes.scrollTop : 0, curChanged = S.current !== lastCurrent; lastCurrent = S.current;
      slot('res', L + JSON.stringify([S.matches, S.current, S.groups.length, S.hasDraft, S.favOnly]), buildResults);
      if (slots.res !== prevRes && prevRes && keepTop) slots.res.scrollTop = keepTop;
      if (curChanged && S.current >= 0) keepActiveVisible();
      if (!side) slot('drag', L, function () { return h('div', { cls: 'dragbar', on: { pointerdown: function (e) { ctx.dragStart && ctx.dragStart(e) } } }, ic('grip-horizontal'), h('span', { text: T('drag') })) });
      if (hadFocus) input.focus();
    }
    var lastCurrent = -1;
    function keepActiveVisible() {
      var res = slots.res, row = res && res.querySelector && res.querySelector('.r.on'); if (!row) return;
      if (side) { row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return } // side panel: the page itself scrolls
      var rr = res.getBoundingClientRect(), r = row.getBoundingClientRect();
      if (r.top < rr.top) res.scrollTo({ top: Math.max(0, res.scrollTop - (rr.top - r.top) - 4), behavior: 'smooth' });
      else if (r.bottom > rr.bottom) res.scrollTo({ top: res.scrollTop + (r.bottom - rr.bottom) + 4, behavior: 'smooth' });
    }
    function scrollToResults() { var r = slots.res; if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }
    return { update: update, root: root, focusInput: function () { input.focus() }, scrollToResults: scrollToResults, clearDraft: function () { input.value = '' } };
  }

  g.PNS_UI = { mount: mount };
})(typeof window !== 'undefined' ? window : self);

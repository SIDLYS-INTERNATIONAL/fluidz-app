/* Profile Name Search — the minimized panel, used by ui.js and loaded after ui-editor.js.
   The bubble ("pill") shows the match count and its own play / pause button, so the scan can run with the panel closed.
   While it is minimized, a new match shows a small card above it for a few seconds: one tap scrolls Grindr's grid to that
   profile (it never opens the profile by itself), and the panel stays minimized. Pure view: content.js does the scrolling. */
(function (g) {
  'use strict';
  // api: { h, ic, T, S(), send, redraw, dragStart, avatar }
  function create(a) {
    var h = a.h, ic = a.ic, T = a.T, send = a.send;
    var known = null, flash = null, timer = null;

    // Called on every engine update: remembers the matches already seen, flashes the newest one while minimized.
    function track(S, minimized) {
      var ms = S.matches || [], fresh = null;
      if (known) for (var i = ms.length - 1; i >= 0; i--) if (!known[ms[i].id]) { fresh = ms[i]; break }
      known = {}; ms.forEach(function (m) { known[m.id] = 1 });
      if (!minimized) { flash = null; return }
      if (fresh && !S.note) {
        flash = { id: fresh.id, name: fresh.name, thumb: fresh.thumb };
        clearTimeout(timer); timer = setTimeout(function () { flash = null; a.redraw() }, 7000);
      }
    }
    function flashSig() { return flash ? flash.id : '' }
    function show(id) { flash = null; clearTimeout(timer); send({ a: 'show', id: id }) }

    // The flash card: tap anywhere on it to see him on the grid.
    function flashCard(S) {
      if (!flash || S.note) return null;
      var f = flash, go = function () { show(f.id) };
      return h('div', { cls: 'card note flash', attrs: { role: 'button', tabindex: '0', 'aria-label': T('noteTitle', { name: f.name }) },
        on: { click: go, keydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } } } },
        a.avatar(f.thumb),
        h('div', { cls: 'tx' }, h('b', { cls: 'nmx', text: T('noteTitle', { name: f.name }) }), h('small', { text: T('flashText') })),
        h('div', { cls: 'na' }, h('button', { type: 'button', cls: 'p', text: T('noteShow'), on: { click: function (e) { e.stopPropagation(); go() } } })));
    }

    // The bubble: tap to open the panel; its round button starts / pauses the scan without opening it.
    function pill(S) {
      var run = S.running, canRun = S.hasQuery || S.favFilter === 'fav';
      var stop = function (e) { e.stopPropagation() };
      var pp = canRun ? h('button', { type: 'button', cls: 'pp' + (run ? ' on' : ''), attrs: { 'aria-label': run ? T('pause') : (S.hasRun ? T('resume') : T('start')), title: run ? T('pause') : (S.hasRun ? T('resume') : T('start')) },
        on: { pointerdown: stop, keydown: stop, click: function (e) { e.stopPropagation(); send({ a: 'toggle-scroll' }) } } }, ic(run ? 'pause' : 'play')) : null;
      return h('div', { cls: 'pill', attrs: { role: 'button', tabindex: '0', 'aria-label': T('max') }, on: {
        pointerdown: function (e) { if (a.dragStart) a.dragStart(e, function () { send({ a: 'min' }) }); else send({ a: 'min' }) },
        keydown: function (e) { if (e.key === 'Enter' || e.key === ' ') send({ a: 'min' }) } } },
        pp, h('span', { cls: 'drop' }), h('b', { text: 'Profile Name Search' }),
        S.found > 0 ? h('span', { cls: 'cnt', text: String(S.found) }) : null,
        run ? h('span', { cls: 'st' }, h('i'), document.createTextNode(T('scrolling'))) : null,
        ic('maximize-2'));
    }
    return { track: track, flashSig: flashSig, flashCard: flashCard, pill: pill };
  }

  g.PNS_UI_MINI = { create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = g.PNS_UI_MINI;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

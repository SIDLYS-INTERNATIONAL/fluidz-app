'use strict';
/* Adult Album Creator: screens 0-6 (consent to photos). */
/* ---------------------------------------------------------------- screen 0 : 18+ consent */
SCREENS[0] = function () {
  var ks = [1, 2, 3].map(function (n, i) {
    return '<label class="chk' + (S.consent[i] ? ' on' : '') + '"><input type="checkbox" data-k="' + i + '"' + (S.consent[i] ? ' checked' : '') + '><span>' + esc(t('acp.c0.k' + n)) + '</span></label>';
  }).join('');
  function two(k) { var a = t(k).split('|'); return a; }
  var c2 = two('acp.c0.card2'), c3 = two('acp.c0.card3');
  var fan = '<div class="fan" aria-hidden="true">' +
    '<div class="pc a"><div class="cb"><i></i><div class="sf">' + esc(t('acp.c0.card1')) + '</div></div></div>' +
    '<div class="pc b"><div class="bd">● 18+ · NSFW</div><div class="sf">' + esc(c2[0]) + '</div><div class="sf o">' + esc(c2[1]) + '</div></div>' +
    '<div class="pc c"><div class="sf">' + esc(c3[0]) + '</div><div class="sf o">' + esc(c3[1]) + '</div></div></div>';
  var ok = S.consent.every(Boolean);
  return {
    main: fan + '<h1>' + esc(t('acp.c0.h')) + '</h1><p class="lead">' + esc(t('acp.c0.p')) + '</p>' +
      '<fieldset style="border:0"><legend class="sr">' + esc(t('acp.c0.legend')) + '</legend>' + ks + '</fieldset>' +
      '<div class="notice mt">' + ico('lock') + '<div><b>' + esc(t('acp.c0.priv')) + '</b><span>' + esc(t('acp.c0.priv2')) + '</span></div></div>' +
      (S.hadSaved ? '<p class="hint">' + esc(t('acp.c0.loaded')) + '</p>' : '') +
      '<div class="links2"><button type="button" class="link" data-act="reset">' + esc(t('acp.c0.reset')) + '</button><a class="link" href="/album-creator">' + esc(t('acp.c0.about')) + '</a></div>' +
      '<p class="fine">' + esc(t('acp.c0.fine')) + '</p>',
    foot: '<button type="button" class="btn btn-p" id="startb" data-act="start"' + (ok ? '' : ' disabled') + '>' + esc(t('acp.c0.start')) + ico('arrow-right') + '</button>'
  };
};

/* ---------------------------------------------------------------- screen 1 : language */
SCREENS[1] = function () {
  var rows = LANGS.map(function (l) {
    var on = S.main === l;
    return '<label class="opt' + (on ? ' on' : '') + '"><input type="radio" name="main" value="' + l + '"' + (on ? ' checked' : '') + ' data-fk="m-' + l + '"><span class="cd">' + l.toUpperCase() + '</span><span class="nm">' + esc(P.langNames[l]) + '</span><span class="rd"></span></label>';
  }).join('');
  var useSec = S.secondOn && S.second !== S.main;
  var chips = LANGS.map(function (l) {
    return '<button type="button" class="pill" data-act="second" data-l="' + l + '" data-fk="s-' + l + '" aria-pressed="' + (S.second === l && S.secondOn) + '"' + (l === S.main || !S.secondOn ? ' disabled' : '') + '>' + l.toUpperCase() + '</button>';
  }).join('');
  var it = P.byId('p2-03');
  return {
    main: '<h1>' + esc(t('acp.l.h')) + '</h1>' +
      '<div class="sec-t" id="lm">' + esc(t('acp.l.main')) + ' <small>— ' + esc(t('acp.l.main.s')) + '</small></div>' +
      '<div role="radiogroup" aria-labelledby="lm">' + rows + '</div>' +
      '<div class="mt2"></div>' +
      '<div class="card"><button type="button" class="sw" role="switch" aria-checked="' + S.secondOn + '" data-act="secondsw" data-fk="sw"><span class="lb">' + esc(t('acp.l.sec')) + '</span><span class="tg"></span></button>' +
      '<p class="hint" style="margin-top:2px">' + esc(t('acp.l.sec.p')) + '</p>' +
      '<div class="pills" role="group" aria-label="' + esc(t('acp.l.sec.a')) + '">' + chips + '</div></div>' +
      '<div class="prevbox" aria-live="polite"><div class="eb">' + esc(t('acp.l.prev')) + '</div><div class="big">' + esc(txt(it, S.main)) + '</div><div class="sm">' + (useSec ? esc(txt(it, S.second)) : '') + '</div></div>',
    foot: '<button type="button" class="btn btn-p" data-act="next">' + esc(t('acp.continue')) + ico('arrow-right') + '</button>'
  };
};

/* ---------------------------------------------------------------- screen 2 : vibe */
var QM = { en: ['“', '”'], pt: ['“', '”'], fr: ['«\u00a0', '\u00a0»'], es: ['«', '»'], it: ['«', '»'], de: ['„', '“'] };
SCREENS[2] = function () {
  var cards = ['playful', 'classy', 'warm'].map(function (k) {
    var on = S.tone === k, d = P.tones[k];
    return '<button type="button" class="tone' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="tone" data-v="' + k + '" data-fk="t-' + k + '"><div class="nm"><span>' + esc(d.label[L]) + '</span>' + ico('circle-check') + '</div><div class="qt">' + (QM[S.main] || QM.en)[0] + esc(d.sample[S.main]) + (QM[S.main] || QM.en)[1] + '</div></button>';
  }).join('');
  return {
    main: '<h1>' + esc(t('acp.v.h')) + '</h1><p class="lead">' + esc(t('acp.v.p')) + '</p><div role="radiogroup" aria-label="' + esc(t('acp.v.h')) + '">' + cards + '</div>',
    foot: '<button type="button" class="btn btn-p" data-act="next">' + esc(t('acp.continue')) + ico('arrow-right') + '</button>'
  };
};

/* ---------------------------------------------------------------- screen 3 : what are you into */
var GROUPS = ['vibe', 'pace', 'style', 'limits'];
SCREENS[3] = function () {
  var tabs = GROUPS.map(function (g) {
    var n = S.likes.filter(function (id) { return IDX[id].group === g; }).length;
    return '<button type="button" role="tab" id="tab-' + g + '" aria-selected="' + (S.tab === g) + '" aria-controls="tp" data-act="tab" data-g="' + g + '" data-fk="tab-' + g + '"><span>' + esc(t('acp.i.t.' + g)) + '</span>' + (n ? '<span class="cn">' + n + '</span>' : '') + '</button>';
  }).join('');
  var items = P.banks.likes.filter(function (it) { return it.group === S.tab; });
  var lim = 5, expd = S.exp['l' + S.tab], vis = expd ? items : items.slice(0, lim);
  var chips = vis.map(function (it) {
    var pos = S.likes.indexOf(it.id), on = pos >= 0;
    return '<button type="button" class="chip' + (on && pos >= 5 ? ' over' : '') + '" role="checkbox" aria-checked="' + on + '" data-act="like" data-id="' + it.id + '" data-fk="c-' + it.id + '"><span class="t">' + esc(txt(it, S.main)) + '</span><span class="tk">' + ico('check') + '</span></button>';
  }).join('');
  var more = items.length > lim ? '<button type="button" class="more" data-act="exp" data-k="l' + S.tab + '">' + esc(expd ? t('acp.less') : t('acp.more', { n: items.length - lim })) + '</button>' : '';
  var n = S.likes.length;
  return {
    main: '<h1>' + esc(t('acp.i.h')) + '</h1><p class="lead">' + esc(t('acp.i.p')) + '</p>' +
      '<div class="tabs" role="tablist">' + tabs + '</div><div id="tp" role="tabpanel" aria-labelledby="tab-' + S.tab + '">' + chips + more + '</div>' +
      '<p class="hint">' + esc(n > 5 ? t('acp.i.over') : t('acp.i.fill')) + '</p>',
    foot: '<button type="button" class="btn btn-p" data-act="next">' + esc(t('acp.i.cont', { n: n })) + ico('arrow-right') + '</button>'
  };
};

/* ---------------------------------------------------------------- screen 4 : rules */
SCREENS[4] = function () {
  var total = S.rules.length + S.custom.length;
  var bank = P.banks.rules, lim = 6, vis = S.exp.rules ? bank : bank.slice(0, lim);
  var chips = vis.map(function (it) {
    var on = S.rules.indexOf(it.id) >= 0, dis = !on && total >= 5;
    return '<button type="button" class="chip" role="checkbox" aria-checked="' + on + '"' + (dis ? ' disabled' : '') + ' data-act="rule" data-id="' + it.id + '" data-fk="r-' + it.id + '"><span class="t">' + esc(txt(it, S.main)) + '</span><span class="tk">' + ico('check') + '</span></button>';
  }).join('');
  var cust = S.custom.map(function (s, i) {
    return '<div class="chip" role="group" aria-checked="true"><span class="t">' + esc(s) + '</span><button type="button" class="rm" data-act="rmcustom" data-i="' + i + '" aria-label="' + esc(t('acp.r.remove')) + '">' + ico('x') + '</button></div>';
  }).join('');
  var own = S.ownOpen
    ? '<div class="own"><input id="ownin" type="text" maxlength="80" autocomplete="off" enterkeyhint="done" data-fk="own" placeholder="' + esc(t('acp.r.ph')) + '" aria-label="' + esc(t('acp.r.own')) + '"><button type="button" class="btn btn-p" data-act="addown">' + esc(t('acp.r.add')) + '</button></div><p class="hint">' + esc(t('acp.r.own.n')) + '</p>'
    : '<button type="button" class="more" data-act="ownopen" data-fk="ownb" style="margin-top:2px">' + ico('plus') + ' ' + esc(t('acp.r.own')) + '</button>';
  return {
    main: '<h1>' + esc(t('acp.r.h')) + '</h1><p class="lead">' + esc(t('acp.r.p')) + '</p>' +
      '<div class="eb" style="margin-bottom:10px;display:flex;justify-content:space-between"><span>' + esc(t('acp.r.max')) + '</span><span>' + esc(t('acp.r.count', { n: total })) + '</span></div>' +
      chips + (!S.exp.rules && bank.length > lim ? '' : '') + cust +
      (bank.length > lim ? '<button type="button" class="more" data-act="exp" data-k="rules" style="margin-bottom:8px">' + esc(S.exp.rules ? t('acp.less') : t('acp.more', { n: bank.length - lim })) + '</button>' : '') +
      own + (total >= 5 ? '<p class="hint">' + esc(t('acp.r.full')) + '</p>' : ''),
    foot: '<button type="button" class="btn btn-p" data-act="next">' + esc(t('acp.continue')) + ico('arrow-right') + '</button>'
  };
};

/* ---------------------------------------------------------------- screen 5 : captions */
function rowHTML(p) {
  var c = capOf(p), ed = S.editing, k = kindOf(p), useSec = S.secondOn && S.second !== S.main;
  function field(f, val, cls, lab) {
    if (ed && ed.p === p && ed.f === f) return '<textarea class="ta" rows="2" maxlength="160" data-edit="' + f + '" data-p="' + p + '" aria-label="' + esc(lab) + '" data-fk="ta">' + esc(val) + '</textarea><div class="hint" style="margin-top:4px">' + esc(t('acp.k.hint')) + '</div>';
    return '<button type="button" class="ed ' + cls + '" data-act="edit" data-p="' + p + '" data-f="' + f + '" aria-label="' + esc(lab + ': ' + val) + '" data-fk="e-' + p + f + '">' + esc(val) + '</button>';
  }
  var mainH = field('main', c.main, 'm', t('acp.k.edit', { n: p })), secH = useSec ? field('second', c.second, 's', t('acp.k.edit2', { n: p })) : '';
  return '<div class="cr' + (k === 'private' ? ' pv' : '') + '" data-row="' + p + '"><span class="nb">' + p + '</span><div class="bd"><div class="ty">' + esc(t('acp.ty.' + k)) + '</div>' + mainH + secH +
    (p === 10 ? '<div class="rl">' + esc(t('acp.k.rules', { n: rulesList().length })) + '</div>' : '') + '</div>' +
    '<button type="button" class="sh" data-act="shuffle" data-p="' + p + '" aria-label="' + esc(t('acp.k.shuffle', { n: p })) + '" data-fk="sh-' + p + '">' + ico('refresh-cw') + '</button></div>';
}
SCREENS[5] = function () {
  buildCaps();
  var vis = S.exp.pages ? PAGES : PAGES.slice(0, 6);
  return {
    main: '<h1>' + esc(t('acp.k.h')) + '</h1><p class="lead">' + esc(t('acp.k.p')) + '</p>' + vis.map(rowHTML).join('') +
      '<button type="button" class="more" data-act="exp" data-k="pages">' + esc(S.exp.pages ? t('acp.k.less') : t('acp.k.more', { n: 4 })) + '</button>',
    foot: '<button type="button" class="btn btn-p" data-act="next">' + esc(t('acp.continue')) + ico('arrow-right') + '</button>',
    after: function () { var ta = $('textarea.ta', elMain); if (ta) autosize(ta); }
  };
};
function autosize(ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }
function commitEdit(ta) {
  var p = +ta.getAttribute('data-p'), f = ta.getAttribute('data-edit'), v = ta.value.replace(/\s+/g, ' ').trim();
  S.editing = null;
  var cur = S.ed[p] && S.ed[p].id === S.pg[p] ? S.ed[p] : { id: S.pg[p] };
  if (v) { cur[f] = v; cur[f + 'Lang'] = f === 'main' ? S.main : S.second; } else { delete cur[f]; delete cur[f + 'Lang']; }
  if (cur.main != null || cur.second != null) S.ed[p] = cur; else delete S.ed[p];
  var row = $('.cr[data-row="' + p + '"]', elMain);
  if (row) row.outerHTML = rowHTML(p);
}

/* ---------------------------------------------------------------- screen 6 : photos */
function slotHTML(p) {
  var k = kindOf(p), lab = esc(t('acp.ty.' + k));
  if (p === 4 || p === 10) {
    return '<div class="sl fx ' + (p === 4 ? 'al' : 'ru') + '" role="img" aria-label="' + esc(t('acp.p.fixed', { n: p }) + ' · ' + t('acp.ty.' + k)) + '"><span class="nu" aria-hidden="true">' + p + '</span><span class="ic" aria-hidden="true">' + (p === 4 ? '<b style="font:700 13px var(--fm);color:var(--p)">18+</b>' : ico('shield-check')) + '</span><span class="lb" aria-hidden="true">' + lab + '</span></div>';
  }
  var i = SLOT[p], s = S.slots[i], ld = S.loading[i];
  return '<button type="button" class="sl' + (s ? ' fl' : '') + (k === 'private' ? ' pv' : '') + '" data-act="slot" data-i="' + i + '" data-fk="slot' + i + '" aria-label="' + esc(s ? t('acp.p.open', { n: p }) : t('acp.p.add', { n: p })) + ' (' + lab + ')">' +
    '<span class="nu" aria-hidden="true">' + p + '</span>' + (k === 'private' ? '<span class="lk" aria-hidden="true">' + ico('lock') + '</span>' : '') +
    (s ? '<span data-th="' + i + '"></span>' : '<span class="pl" aria-hidden="true">' + ico('plus') + '</span>') +
    (ld ? '<span class="ldg"><span class="spin"></span></span>' : '') + '<span class="lb" aria-hidden="true">' + lab + '</span></button>';
}
SCREENS[6] = function () {
  var n = filled(), g = n === 0 ? t('acp.p.priv.g0') : n === 1 ? t('acp.p.priv.g1') : t('acp.p.priv.gn', { n: n });
  var loading = Object.keys(S.loading).length > 0;
  return {
    main: '<h1>' + esc(t('acp.p.h')) + '</h1><p class="lead">' + esc(t('acp.p.p')) + '</p>' +
      '<div class="g10" id="g10">' + PAGES.map(slotHTML).join('') + '</div>' +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="' + n + '"><i style="width:' + (n / 8 * 100) + '%"></i></div>' +
      '<p class="hint" style="margin-top:2px" aria-live="polite">' + (loading ? esc(t('acp.p.reading')) : '&nbsp;') + '</p>' +
      '<div class="notice mt">' + ico('shield-check') + '<div><b>' + esc(t('acp.p.priv.t')) + '</b><ul class="ck" style="margin-top:8px">' +
      '<li>' + ico('check') + '<span>' + esc(g) + '</span></li><li>' + ico('check') + '<span>' + esc(t('acp.p.priv.2')) + '</span></li><li>' + ico('check') + '<span>' + esc(t('acp.p.priv.3')) + '</span></li></ul></div></div>' +
      '<button type="button" class="rowbtn" data-act="blurpick" data-fk="blurpick">' + ico('droplets') + '<span>' + esc(t('acp.p.blur')) + '</span>' + ico('chevron-right') + '</button>',
    foot: '<button type="button" class="btn btn-p" data-act="next"' + (n < 8 || loading ? ' disabled' : '') + '>' + esc(t('acp.p.cont', { n: n })) + ico('arrow-right') + '</button>',
    after: bindThumbs
  };
};
function makeThumb(photo) {
  var c = document.createElement('canvas'); c.width = 130; c.height = 282; drawThumb(c, photo); return c;
}
function drawThumb(c, photo) {
  var ctx = c.getContext('2d'), src = photo.canvas, dr = c.width / c.height, sr = src.width / src.height, sx, sy, sw, sh;
  if (sr > dr) { sh = src.height; sw = sh * dr; sx = (src.width - sw) / 2; sy = 0; } else { sw = src.width; sh = sw / dr; sx = 0; sy = (src.height - sh) / 2; }
  ctx.fillStyle = '#05040A'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
}
function bindThumbs() {
  $$('[data-th]', elMain).forEach(function (el) { var s = S.slots[+el.getAttribute('data-th')]; if (s) el.replaceWith(s.thumb); });
}
function emptyFrom(start) {
  var out = []; for (var k = 0; k < 8; k++) { var i = (start + k) % 8; if (!S.slots[i] && !S.loading[i]) out.push(i); } return out;
}
var fileJob = Promise.resolve();
function addFiles(files, start, replace) {
  files = Array.prototype.slice.call(files || []); if (!files.length) return;
  var targets;
  if (replace != null) { targets = [replace]; files = files.slice(0, 1); }
  else { targets = emptyFrom(start || 0); if (files.length > targets.length) { toast(t('acp.p.toomany')); files = files.slice(0, targets.length); } }
  files = files.slice(0, targets.length);
  files.forEach(function (f, k) { S.loading[targets[k]] = true; });
  if (S.step === 6) render();
  fileJob = fileJob.then(async function () {
    var bad = 0;
    for (var k = 0; k < files.length; k++) {
      var idx = targets[k];
      try {
        var ph = await E.loadPhoto(files[k]);
        var old = S.slots[idx]; if (old) { freeCv(old.photo.canvas); freeCv(old.thumb); }
        S.slots[idx] = { photo: ph, thumb: makeThumb(ph), ver: 0 };
      } catch (e) { bad++; }
      delete S.loading[idx];
      if (S.step === 6) render();
    }
    if (bad) toast(t('acp.p.bad'));
  });
}

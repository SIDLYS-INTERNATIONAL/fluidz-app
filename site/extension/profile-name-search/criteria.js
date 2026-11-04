/* Profile Name Search — search model, text syntax and matching.
   Pure functions: no DOM, no storage, no network. Shared by the engine (content.js) and the panel (ui.js),
   and loadable in Node for the tests.

   The model
     Query  = { groups: [Group], exclude: [Term] }
              groups are alternatives ("or else"): a profile matches if ONE group matches.
              exclude: a profile whose name contains one of these terms never matches.
     Group  = { items: [Item] }           every item of a group must match ("and also").
     Item   = { name: 'Size', terms: [Term] }    a criterion: its terms are synonyms (one is enough)
            | { ref: '<saved search id>', name: 'My search' }   a saved search reused as a block
     Term   = { t: 'top', w: false }      w = whole word only. Default is "contains" (substring).

   The text syntax (what you type in the field)
     jay, mike            comma (or ; | ，) = OR
     dom + top            + (or ＋) = AND
     (jay, jayden) + TOP  parentheses = one criterion with synonyms
     Size: (XL, XXL)      optional criterion name before the parentheses
     TOP -XXL             a word starting with - is excluded
     "dom top"            quotes keep a phrase (and any symbol) as one term
     =top                 whole word only ("top" but not "laptop")
     @"My search"         reuse a saved search by its name
   Accents and case are ignored everywhere. */
(function (g) {
  'use strict';

  var LIMITS = { groups: 12, items: 12, terms: 30, term: 60, name: 40 };

  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }
  function emptyQuery() { return { groups: [], exclude: [] } }
  function clone(o) { return JSON.parse(JSON.stringify(o)) }

  /* ---------- cleaning ---------- */
  function cleanTerm(t) {
    if (!t) return null;
    var s = String(typeof t === 'string' ? t : t.t || '').trim().slice(0, LIMITS.term);
    return s ? { t: s, w: !!(t && t.w) } : null;
  }
  function cleanTerms(list) {
    var out = [], seen = {};
    (Array.isArray(list) ? list : []).forEach(function (t) {
      var c = cleanTerm(t); if (!c) return;
      var k = norm(c.t) + (c.w ? '|w' : ''); if (seen[k]) return; seen[k] = 1; out.push(c);
    });
    return out.slice(0, LIMITS.terms);
  }
  // Drops empty parts, applies the size limits, and merges "jay, mike" (several one-word alternatives) into one criterion.
  function clean(q) {
    q = q && typeof q === 'object' ? q : {};
    var groups = [];
    (Array.isArray(q.groups) ? q.groups : []).forEach(function (gr) {
      var items = [];
      ((gr && Array.isArray(gr.items)) ? gr.items : []).forEach(function (it) {
        if (!it || typeof it !== 'object') return;
        if (it.ref != null) { items.push({ ref: String(it.ref).slice(0, 64), name: String(it.name || '').slice(0, LIMITS.name) }); return }
        var terms = cleanTerms(it.terms); if (!terms.length) return;
        items.push({ name: String(it.name || '').trim().slice(0, LIMITS.name), terms: terms });
      });
      if (items.length) groups.push({ items: items.slice(0, LIMITS.items) });
    });
    var mergeable = groups.length > 1 && groups.every(function (gr) { return gr.items.length === 1 && gr.items[0].terms && !gr.items[0].name });
    if (mergeable) {
      var all = []; groups.forEach(function (gr) { all = all.concat(gr.items[0].terms) });
      groups = [{ items: [{ name: '', terms: cleanTerms(all) }] }];
    }
    return { groups: groups.slice(0, LIMITS.groups), exclude: cleanTerms(q.exclude) };
  }
  function isEmpty(q) { return !q || ((!q.groups || !q.groups.length) && (!q.exclude || !q.exclude.length)) }
  // Stable signature, used to compare two searches (duplicates, journal "same query").
  function sig(q) {
    q = clean(q);
    return JSON.stringify([q.groups.map(function (gr) { return gr.items.map(function (it) { return it.ref != null ? '@' + it.ref : [norm(it.name), it.terms.map(function (t) { return norm(t.t) + (t.w ? '|w' : '') })] }) }), q.exclude.map(function (t) { return norm(t.t) + (t.w ? '|w' : '') })]);
  }

  /* ---------- text -> model ---------- */
  // Splits at `sep` only outside parentheses.
  function splitTop(s, sep) {
    var out = [], cur = '', depth = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === sep && depth === 0) { out.push(cur); cur = ''; continue }
      cur += ch;
    }
    out.push(cur);
    return out;
  }

  /* Parses typed text. resolve(name) returns the id of a saved search with that name (or null).
     Returns { q, pending } — pending is true while a trailing "+" waits for its next word. */
  function parse(text, resolve) {
    var quotes = [];
    var restore = function (s) { return s.replace(/\x01(\d+)\x02/g, function (_, i) { return quotes[+i] }) };
    // 1. "quoted phrases" become placeholders, so nothing inside them is read as syntax
    var src = String(text || '').replace(/[\x01\x02]/g, '').replace(/["“”]([^"“”]*)(?:["“”]|$)/g, function (_, inner) { quotes.push(inner); return '\x01' + (quotes.length - 1) + '\x02' });
    // 2. one spelling per separator
    src = src.replace(/＋/g, '+').replace(/[，;|]/g, ',');
    var pending = /\+\s*$/.test(src);
    var q = emptyQuery();

    // A term may carry exclusions: "TOP -XXL" -> TOP, and XXL excluded. "-XXL" alone is only an exclusion.
    function readTerms(raw, into) {
      var pieces = String(raw).trim().split(/\s+-(?=\S)/);
      pieces.forEach(function (p, i) {
        p = p.trim(); if (!p) return;
        var neg = i > 0;
        if (!neg && p.charAt(0) === '-' && p.length > 1) { neg = true; p = p.slice(1) }
        else if (p === '-') return;
        var w = false;
        if (p.charAt(0) === '=' && p.length > 1) { w = true; p = p.slice(1) }
        var t = restore(p).trim(); if (!t) return;
        (neg ? q.exclude : into).push({ t: t, w: w });
      });
    }

    splitTop(src, ',').forEach(function (gtxt) {
      var items = [];
      splitTop(gtxt, '+').forEach(function (itxt) {
        var s = itxt.trim(); if (!s) return;
        // @saved search
        if (s.charAt(0) === '@' && s.length > 1) {
          var nm = restore(s.slice(1)).trim(), id = resolve ? resolve(nm) : null;
          items.push({ ref: id || '', name: nm }); return;
        }
        // Name: (a, b)   or   (a, b)
        var m = /^([^():\x01\x02]{1,40}):\s*\(/.exec(s), name = '';
        if (m) { name = restore(m[1]).trim(); s = s.slice(m[0].length - 1) }
        if (s.charAt(0) === '(') {
          var inner = s.slice(1), close = inner.lastIndexOf(')'), after = '';
          if (close >= 0) { after = inner.slice(close + 1); inner = inner.slice(0, close) }
          var terms = [];
          inner.split(',').forEach(function (p) { readTerms(p, terms) });
          if (terms.length) items.push({ name: name, terms: terms });
          if (after.trim()) { var extra = []; readTerms(after, extra); if (extra.length) items.push({ name: '', terms: extra }) }
          return;
        }
        var one = []; readTerms(s, one);
        if (one.length) items.push({ name: '', terms: one });
      });
      if (items.length) q.groups.push({ items: items });
    });
    return { q: clean(q), pending: pending };
  }

  /* ---------- model -> text ---------- */
  function termText(t) {
    var s = t.t;
    if (/[,，;|+＋()"“”@=:]|^\s|\s$|^-|\s-\S/.test(s)) s = '"' + s.replace(/["“”]/g, '') + '"';
    return (t.w ? '=' : '') + s;
  }
  // nameOf(id) gives the current name of a saved search (it may have been renamed).
  function serialize(q, nameOf) {
    q = clean(q);
    var single = q.groups.length === 1 && q.groups[0].items.length === 1 && q.groups[0].items[0].terms && !q.groups[0].items[0].name;
    var txt = q.groups.map(function (gr) {
      return gr.items.map(function (it) {
        if (it.ref != null) { var n = (nameOf && nameOf(it.ref)) || it.name || '?'; return '@' + (/^[\wÀ-ɏ-]+$/.test(n) ? n : '"' + n.replace(/["“”]/g, '') + '"') }
        if (single) return it.terms.map(termText).join(', ');
        if (it.terms.length === 1 && !it.name) return termText(it.terms[0]);
        var nm = it.name ? it.name.replace(/[():,+"“”]/g, '') + ': ' : '';
        return nm + '(' + it.terms.map(termText).join(', ') + ')';
      }).join(' + ');
    }).join(', ');
    q.exclude.forEach(function (t) { txt += (txt ? ' ' : '') + '-' + termText(t) });
    return txt;
  }

  /* ---------- matching ---------- */
  var WORD = /[\p{L}\p{N}]/u;
  function hasWord(n, t) {
    var i = n.indexOf(t);
    while (i >= 0) {
      var before = i > 0 ? n.charAt(i - 1) : '', after = n.charAt(i + t.length);
      if ((!before || !WORD.test(before)) && (!after || !WORD.test(after))) return true;
      i = n.indexOf(t, i + 1);
    }
    return false;
  }
  function prep(t) { return { t: norm(t.t).trim(), w: !!t.w } }
  function hit(n, t) { return t.t && (t.w ? hasWord(n, t.t) : n.indexOf(t.t) >= 0) }

  /* Compiles a query once; test(name) is then cheap. getSearch(id) returns a saved search { q } (for @references).
     References are followed 4 levels deep at most, so a loop between two searches cannot hang the page. */
  function compile(q, getSearch, depth) {
    q = clean(q); depth = depth || 0;
    var ex = q.exclude.map(prep).filter(function (t) { return t.t });
    var missing = 0;
    var groups = q.groups.map(function (gr) {
      return gr.items.map(function (it) {
        if (it.ref != null) {
          var s = depth < 4 && getSearch ? getSearch(it.ref) : null;
          if (!s || !s.q) { missing++; return null }
          var sub = compile(s.q, getSearch, depth + 1);
          return sub.active ? sub.testNorm : null;
        }
        var ts = it.terms.map(prep).filter(function (t) { return t.t });
        return ts.length ? function (n) { return ts.some(function (t) { return hit(n, t) }) } : null;
      }).filter(Boolean);
    }).filter(function (items) { return items.length });
    var active = groups.length > 0 || ex.length > 0;
    function testNorm(n) {
      if (!active) return false;
      for (var i = 0; i < ex.length; i++) if (hit(n, ex[i])) return false;
      if (!groups.length) return true; // only exclusions: everyone except them
      return groups.some(function (items) { return items.every(function (f) { return f(n) }) });
    }
    return { active: active, missing: missing, testNorm: testNorm, test: function (name) { return testNorm(norm(name)) } };
  }
  function matches(q, name, getSearch) { var c = compile(q, getSearch); return c.active && c.test(name) }

  /* ---------- readable summary ----------
     One line per criterion, for "Active search [Edit]": { kind: 'c'|'s'|'x', label, terms: [Term], missing, or: true before a new alternative } */
  function summary(q, nameOf) {
    q = clean(q);
    var lines = [];
    q.groups.forEach(function (gr, gi) {
      gr.items.forEach(function (it, ii) {
        var first = ii === 0 && gi > 0;
        if (it.ref != null) { var n = nameOf ? nameOf(it.ref) : ''; lines.push({ kind: 's', label: n || it.name || '?', missing: !n, terms: [], or: first }); return }
        lines.push({ kind: 'c', label: it.name, terms: it.terms, or: first });
      });
    });
    if (q.exclude.length) lines.push({ kind: 'x', label: '', terms: q.exclude });
    return lines;
  }
  // Short one-line text (journal, collapsed block header): "jay · mike + TOP".
  function shortText(q, nameOf, max) {
    q = clean(q); max = max || 80;
    var s = q.groups.map(function (gr) {
      return gr.items.map(function (it) {
        if (it.ref != null) return '@' + ((nameOf && nameOf(it.ref)) || it.name || '?');
        return it.terms.map(function (t) { return t.t }).join(' · ');
      }).join(' + ');
    }).join(' | ');
    if (q.exclude.length) s += (s ? '  ' : '') + q.exclude.map(function (t) { return '−' + t.t }).join(' ');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }
  // Every @reference id used by a query (to warn before deleting a saved search that others reuse).
  function refs(q) { var out = []; clean(q).groups.forEach(function (gr) { gr.items.forEach(function (it) { if (it.ref) out.push(it.ref) }) }); return out }

  var API = { LIMITS: LIMITS, norm: norm, emptyQuery: emptyQuery, clone: clone, clean: clean, isEmpty: isEmpty, sig: sig, parse: parse, serialize: serialize,
    compile: compile, matches: matches, hasWord: hasWord, summary: summary, shortText: shortText, refs: refs };
  g.PNS_CRIT = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

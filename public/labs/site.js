/* Fluidz Labs — shared shell for the legal pages: nav, footer, language selector, i18n.
   Each page loads /labs/lang.js in <head> and this file at the end of <body>.
   Page markup carries the English text; translations live in /labs/i18n/<lang>.js and in each page.
   (The old sign-in modal, tools menu and Fluidz block were removed with the one-page pivot — see git history.) */
(function () {
  'use strict'
  var LANGS = [['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['pt', 'Português'], ['it', 'Italiano'], ['de', 'Deutsch']]
  var D = document
  var $ = function (s, r) { return (r || D).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)) }
  var body = D.body
  var PAGE = body.getAttribute('data-nav') || ''
  var LANG = window.LABS_LANG || 'en'

  /* ---------- English strings owned by the shared chrome ---------- */
  var EN = {
    'nav.get': 'Get the extension', 'nav.privacy': 'Privacy', 'nav.terms': 'Terms', 'nav.legal': 'Legal notice',
    'aria.main': 'Main', 'aria.lang': 'Language', 'aria.footer': 'Footer',
    'foot.p': '© 2026 Fluidz Labs · USA · Not affiliated with Grindr.'
  }

  /* ---------- helpers ---------- */
  function ico(n) { return '<span class="ico"><svg aria-hidden="true"><use href="/labs/icons.svg#' + n + '"/></svg></span>' }
  function fillIcons(root) {
    $$('[data-ico]', root).forEach(function (el) {
      if (el.getAttribute('data-ico-done')) return
      el.classList.add('ico'); el.setAttribute('data-ico-done', '1')
      el.innerHTML = '<svg aria-hidden="true"><use href="/labs/icons.svg#' + el.getAttribute('data-ico') + '"/></svg>'
    })
  }
  function lsSet(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }

  /* ---------- i18n ---------- */
  var DICT = window.LABS_I18N = window.LABS_I18N || {}
  function t(key, fallback) {
    var d = DICT[LANG]
    if (d && d[key] != null) return d[key]
    return EN[key] != null ? EN[key] : (fallback != null ? fallback : key)
  }
  function applyLang() {
    D.documentElement.lang = LANG
    $$('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (EN[k] != null) el.textContent = t(k) })
    $$('[data-i18n-html]').forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (EN[k] != null) el.innerHTML = t(k) })
    $$('[data-i18n-aria]').forEach(function (el) { var k = el.getAttribute('data-i18n-aria'); if (EN[k] != null) el.setAttribute('aria-label', t(k)) })
    $$('.lang-cur').forEach(function (el) { el.textContent = LANG.toUpperCase() })
    $$('.lang li').forEach(function (li) { li.classList.toggle('on', li.getAttribute('data-l') === LANG) })
    var tk = 'title.' + PAGE, dk = 'desc.' + PAGE
    if (EN[tk] != null) D.title = t(tk)
    var md = $('meta[name="description"]'); if (md && EN[dk] != null) md.setAttribute('content', t(dk))
  }
  function captureEN(root) {
    $$('[data-i18n]', root).forEach(function (el) { var k = el.getAttribute('data-i18n'); if (EN[k] == null) EN[k] = el.textContent })
    $$('[data-i18n-html]', root).forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (EN[k] == null) EN[k] = el.innerHTML })
    $$('[data-i18n-aria]', root).forEach(function (el) { var k = el.getAttribute('data-i18n-aria'); if (EN[k] == null) EN[k] = el.getAttribute('aria-label') })
  }
  function setLang(l) {
    if (!LANGS.some(function (x) { return x[0] === l })) l = 'en'
    var done = function () {
      var pg = window.LABS_PAGE && window.LABS_PAGE[l]
      if (pg) { var d = DICT[l] = DICT[l] || {}; for (var k in pg) d[k] = pg[k] }
      LANG = l; lsSet('fluidz_lang', l); applyLang()
      D.dispatchEvent(new CustomEvent('labs:lang', { detail: l }))
    }
    if (l === 'en' || DICT[l]) return done()
    var s = D.createElement('script'); s.src = '/labs/i18n/' + l + '.js?v=2'; s.onload = done; s.onerror = done; D.head.appendChild(s)
  }

  /* ---------- chrome: nav + footer ---------- */
  function langList() { return LANGS.map(function (l) { return '<li data-l="' + l[0] + '" role="option" tabindex="0"><span>' + l[1] + '</span><span class="code">' + l[0].toUpperCase() + '</span></li>' }).join('') }
  function buildNav() {
    var h = '<header class="nav"><div class="wrap">' +
      '<a href="/" class="logo" aria-label="Fluidz Labs"><i></i>fluidz <small>labs</small></a>' +
      '<div class="nav-r">' +
      '<div class="lang" id="lang"><button type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Language" data-i18n-aria="aria.lang">' + ico('globe') + '<span class="lang-cur">EN</span>' + ico('chevron-down') + '</button><ul role="listbox">' + langList() + '</ul></div>' +
      '<a href="/#download" class="btn btn-p btn-s" data-i18n="nav.get">' + EN['nav.get'] + '</a>' +
      '</div></div></header>'
    var slot = $('#site-nav'); if (slot) slot.outerHTML = h; else body.insertAdjacentHTML('afterbegin', h)
  }
  function buildFooter() {
    var h = '<footer><div class="wrap"><div><div class="logo" style="font-size:18px;margin-bottom:8px"><i></i>fluidz <small>labs</small></div><p data-i18n="foot.p">' + EN['foot.p'] + '</p></div>' +
      '<nav aria-label="Footer" data-i18n-aria="aria.footer"><a href="/privacy" data-i18n="nav.privacy">Privacy</a><a href="/terms" data-i18n="nav.terms">Terms</a><a href="/legal-notice" data-i18n="nav.legal">Legal notice</a><a href="mailto:hello@fluidz.app">hello@fluidz.app</a></nav></div></footer>'
    var slot = $('#site-foot'); if (slot) slot.outerHTML = h; else body.insertAdjacentHTML('beforeend', h)
  }
  function closeMenus() { $$('.lang.open').forEach(function (x) { x.classList.remove('open') }); $$('.lang > button').forEach(function (b) { b.setAttribute('aria-expanded', 'false') }) }

  /* ---------- boot ---------- */
  buildNav(); buildFooter()
  fillIcons(D)
  EN['title.' + PAGE] = D.title
  var md0 = $('meta[name="description"]'); if (md0) EN['desc.' + PAGE] = md0.getAttribute('content')
  captureEN(D)
  var langBox = $('#lang'); if (langBox) {
    var lb = $('button', langBox)
    lb.onclick = function (e) { e.stopPropagation(); var open = !langBox.classList.contains('open'); closeMenus(); langBox.classList.toggle('open', open); lb.setAttribute('aria-expanded', open) }
    $$('li', langBox).forEach(function (li) { li.onclick = function () { closeMenus(); setLang(li.getAttribute('data-l')) }; li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.onclick() } } })
  }
  D.addEventListener('click', closeMenus)
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus() })
  applyLang()

  /* ---------- public API for the pages ---------- */
  window.Labs = {
    t: t, lang: function () { return LANG }, setLang: setLang, EN: EN,
    refresh: function (root) { fillIcons(root || D); captureEN(root || D); applyLang() }
  }
  D.dispatchEvent(new CustomEvent('labs:ready'))
})()

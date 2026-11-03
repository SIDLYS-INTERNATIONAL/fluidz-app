/* Fluidz Labs — shared site engine: nav, footer, "Fluidz" block, sign-in modal, account, i18n.
   Every Labs page loads /labs/lang.js in <head> and this file at the end of <body>.
   Page markup carries the English text; translations live in /labs/i18n/<lang>.js. */
(function () {
  'use strict'
  var SB_URL = 'https://kxbrfjqxufvskcxmliak.supabase.co'
  var SB_KEY = 'sb_publishable_G2j2f4to4L6nkp75L1fVAA_qrAJUL7h' // public (browser) key
  var SESSION_KEY = 'fluidz_labs_session'
  var LANGS = [['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['pt', 'Português'], ['it', 'Italiano'], ['de', 'Deutsch']]
  var D = document
  var $ = function (s, r) { return (r || D).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)) }
  var body = D.body
  var PAGE = body.getAttribute('data-nav') || ''
  var SOURCE = body.getAttribute('data-source') || 'labs-home'
  var LANG = window.LABS_LANG || 'en'

  /* ---------- English strings owned by the shared chrome ---------- */
  var EN = {
    'nav.labs': 'Labs', 'nav.tools': 'Tools', 'nav.pns': 'Profile Name Search', 'nav.album': 'Adult Album Creator', 'nav.safety': 'Hookup Safety Check',
    'nav.privacy': 'Privacy', 'nav.legal': 'Legal notice', 'nav.terms': 'Terms', 'nav.app': 'Fluidz app', 'nav.support': 'Support us', 'nav.signin': 'Sign in', 'nav.cta': 'Get your Fluidz ID',
    'nav.mine': 'My tools', 'nav.signout': 'Sign out', 'nav.menu': 'Menu', 'nav.signedin': 'Signed in as',
    'nav.t.live': 'Live', 'nav.t.soon': 'Soon', 'nav.t.beta': 'Beta',
    'm.title': 'One account for every Fluidz Labs tool',
    'm.p': 'Profile Name Search, Album Creator and Hookup Safety Check — on the web, installed on your phone, and in the Fluidz app when it launches.',
    'm.email': 'Email', 'm.ph': 'your@email.com', 'm.btn': 'Email me a sign-in link', 'm.optin': 'Keep me posted about new Fluidz Labs tools (no spam)',
    'm.wa': 'WhatsApp sign-in coming later', 'm.legal': 'No password. We never sell your email. Your photos are never stored.',
    'm.sent.t': 'Check your inbox', 'm.sent.p': 'We sent a sign-in link to', 'm.sent.p2': 'Open it on this device — it signs you in to every Fluidz Labs tool.',
    'm.code': 'Opening it on another device? Type the 6-digit code from the email instead.', 'm.code.btn': 'Confirm code', 'm.resend': 'Resend the link', 'm.resent': 'Sent again ✓',
    'm.err.invalid': 'Please enter a valid email address.', 'm.err.retry': 'Oops, please try again in a moment.',
    'm.err.code': 'That code didn’t work. Check it, or ask for a new one.', 'm.err.expired': 'This link has expired — enter your email again to get a new one.',
    'toast.in': 'You’re signed in as', 'toast.out': 'You’re signed out.',
    'fz.l1': 'Grindr is where it starts.', 'fz.l2': '<b>Fluidz</b> is what comes after.',
    'fz.p': 'We’re building the after-Grindr app, made for the queer community. Your Fluidz Labs account comes with you: your circle and your vouches are waiting the day the app launches.',
    'fz.a1': 'Group sessions', 'fz.a2': 'One-to-one meets', 'fz.a3': 'Your rules first', 'fz.a4': 'Reputation-based trust',
    'fz.cta': 'Get my Fluidz ID', 'fz.note': 'One email, no password. It opens your free Fluidz ID and keeps you posted on Fluidz Labs tools. No spam. Never sold. Unsubscribe anytime.',
    'fz.sent.t': 'Check your inbox ✉️', 'fz.sent.p': 'We sent your sign-in link to', 'fz.sent.n': 'Nothing after a minute? Check your spam or Promotions tab — or', 'fz.sent.r': 'send it again',
    'fz.wel.t': 'Welcome to Fluidz Labs 👋', 'fz.wel.p': 'Your Fluidz ID is ready. The same email signs you in to every tool — and to Fluidz, the day it launches.',
    'fz.in.btn': 'Open my tools',
    'foot.p': '© 2026 Fluidz Labs · USA · Free experiments by the Fluidz team · Not affiliated with Grindr, Scruff, Romeo, Hornet, Jack’d or Sniffies.'
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function ico(n) { return '<span class="ico"><svg aria-hidden="true"><use href="/labs/icons.svg#' + n + '"/></svg></span>' }
  function fillIcons(root) {
    $$('[data-ico]', root).forEach(function (el) {
      if (el.getAttribute('data-ico-done')) return
      el.classList.add('ico'); el.setAttribute('data-ico-done', '1')
      el.innerHTML = '<svg aria-hidden="true"><use href="/labs/icons.svg#' + el.getAttribute('data-ico') + '"/></svg>'
    })
  }
  function lsGet(k) { try { return localStorage.getItem(k) } catch (e) { return null } }
  function lsSet(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k) } catch (e) {} }

  /* ---------- i18n ---------- */
  var DICT = window.LABS_I18N = window.LABS_I18N || {}
  var XT = { 'nav.guides': { fr: 'Guides', es: 'Guías', pt: 'Guias', it: 'Guide', de: 'Ratgeber' },
    'nav.legal': { fr: 'Mentions légales', es: 'Aviso legal', pt: 'Aviso legal', it: 'Note legali', de: 'Rechtliche Hinweise' },
    'nav.terms': { fr: 'CGU', es: 'Condiciones de uso', pt: 'Termos de uso', it: 'Condizioni d’uso', de: 'Nutzungsbedingungen' } }
  function t(key, fallback) {
    if (XT[key] && XT[key][LANG]) return XT[key][LANG]
    var d = DICT[LANG]
    if (d && d[key] != null) return d[key]
    return EN[key] != null ? EN[key] : (fallback != null ? fallback : key)
  }
  function applyLang() {
    D.documentElement.lang = LANG
    $$('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (EN[k] != null) el.textContent = t(k) })
    $$('[data-i18n-html]').forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (EN[k] != null) el.innerHTML = t(k) })
    $$('[data-i18n-ph]').forEach(function (el) { var k = el.getAttribute('data-i18n-ph'); if (EN[k] != null) el.setAttribute('placeholder', t(k)) })
    $$('[data-i18n-aria]').forEach(function (el) { var k = el.getAttribute('data-i18n-aria'); if (EN[k] != null) el.setAttribute('aria-label', t(k)) })
    $$('[data-i18n-title]').forEach(function (el) { var k = el.getAttribute('data-i18n-title'); if (EN[k] != null) el.setAttribute('title', t(k)) })
    $$('.lang-cur').forEach(function (el) { el.textContent = LANG.toUpperCase() })
    $$('.lang li').forEach(function (li) { li.classList.toggle('on', li.getAttribute('data-l') === LANG) })
    var tk = 'title.' + PAGE, dk = 'desc.' + PAGE
    if (EN[tk] != null) D.title = t(tk)
    var md = $('meta[name="description"]'); if (md && EN[dk] != null) md.setAttribute('content', t(dk))
  }
  function captureEN(root) {
    $$('[data-i18n]', root).forEach(function (el) { var k = el.getAttribute('data-i18n'); if (EN[k] == null) EN[k] = el.textContent })
    $$('[data-i18n-html]', root).forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (EN[k] == null) EN[k] = el.innerHTML })
    $$('[data-i18n-ph]', root).forEach(function (el) { var k = el.getAttribute('data-i18n-ph'); if (EN[k] == null) EN[k] = el.getAttribute('placeholder') })
    $$('[data-i18n-aria]', root).forEach(function (el) { var k = el.getAttribute('data-i18n-aria'); if (EN[k] == null) EN[k] = el.getAttribute('aria-label') })
    $$('[data-i18n-title]', root).forEach(function (el) { var k = el.getAttribute('data-i18n-title'); if (EN[k] == null) EN[k] = el.getAttribute('title') })
  }
  function setLang(l) {
    if (!LANGS.some(function (x) { return x[0] === l })) l = 'en'
    var done = function () {
      LANG = l; lsSet('fluidz_lang', l); applyLang(); refreshAccount()
      D.dispatchEvent(new CustomEvent('labs:lang', { detail: l }))
    }
    if (l === 'en' || DICT[l]) return done()
    var s = D.createElement('script'); s.src = '/labs/i18n/' + l + '.js?v=1'; s.onload = done; s.onerror = done; D.head.appendChild(s)
  }

  /* ---------- auth (Supabase REST; no SDK needed) ---------- */
  function jwt(tok) { try { var p = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(p)))) } catch (e) { return {} } }
  function readSession() { try { return JSON.parse(lsGet(SESSION_KEY) || 'null') } catch (e) { return null } }
  function saveSession(s) { lsSet(SESSION_KEY, JSON.stringify(s)); return s }
  function api(path, opts) {
    opts = opts || {}
    var h = { apikey: SB_KEY, 'Content-Type': 'application/json' }
    if (opts.token) h.Authorization = 'Bearer ' + opts.token
    return fetch(SB_URL + path, { method: opts.method || 'POST', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined })
  }
  function storeTokens(j) {
    var prev = readSession() || {}
    var c = jwt(j.access_token)
    var user = j.user || prev.user || { email: c.email, user_metadata: c.user_metadata || {} }
    return saveSession({ access_token: j.access_token, refresh_token: j.refresh_token || prev.refresh_token, expires_at: Date.now() + 1000 * Number(j.expires_in || 3600), user: user })
  }
  function session() {
    var s = readSession()
    if (!s || !s.access_token) return null
    if (!s.refresh_token && s.expires_at < Date.now()) return null
    return s
  }
  function user() { var s = session(); if (!s) return null; var c = jwt(s.access_token); var u = s.user || {}; return { email: u.email || c.email || '', meta: u.user_metadata || c.user_metadata || {}, id: u.id || c.sub } }
  async function ensureFresh() {
    var s = readSession(); if (!s || !s.access_token) return null
    if (s.expires_at - Date.now() > 120000) return s
    if (!s.refresh_token) { lsDel(SESSION_KEY); return null }
    try {
      var r = await api('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } })
      if (!r.ok) { lsDel(SESSION_KEY); return null }
      return storeTokens(await r.json())
    } catch (e) { return s }
  }
  async function loadUser() {
    var s = await ensureFresh(); if (!s) return null
    try {
      var r = await api('/auth/v1/user', { method: 'GET', token: s.access_token })
      if (r.ok) { s.user = await r.json(); saveSession(s) }
    } catch (e) {}
    return s
  }
  async function updateMeta(data) {
    var s = await ensureFresh(); if (!s) throw new Error('signed_out')
    var r = await api('/auth/v1/user', { method: 'PUT', token: s.access_token, body: { data: data } })
    if (!r.ok) throw new Error('update_failed')
    s.user = await r.json(); saveSession(s)
    D.dispatchEvent(new CustomEvent('labs:auth', { detail: user() }))
    return user()
  }
  function signOut() {
    var s = readSession()
    if (s && s.access_token) { try { api('/auth/v1/logout', { token: s.access_token }).catch(function () {}) } catch (e) {} }
    lsDel(SESSION_KEY); refreshAccount(); toast(t('toast.out'))
    D.dispatchEvent(new CustomEvent('labs:auth', { detail: null }))
  }
  function redirectFor(hash) {
    var host = location.hostname
    var base = (host === 'fluidz.app' || host === 'www.fluidz.app') ? location.origin : 'https://fluidz.app'
    return base + location.pathname.replace(/\.html$/, '') + '?welcome=1' + (hash ? '#' + hash : '')
  }
  var qs = new URLSearchParams(location.search)
  var UTM = { source: qs.get('utm_source') || '', medium: qs.get('utm_medium') || '', campaign: qs.get('utm_campaign') || '' }
  async function sendLink(email, o) {
    o = o || {}
    var res = await fetch('/api/labs-signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, source: o.source || SOURCE, lang: LANG, marketing: o.marketing !== false, utm: UTM, redirect: o.redirect || redirectFor(o.hash || '') })
    })
    if (!res.ok) throw new Error('request_failed')
    return res.json()
  }
  async function verifyCode(email, code) {
    var r = await api('/auth/v1/verify', { body: { type: 'email', email: email, token: String(code).replace(/\s/g, '') } })
    if (!r.ok) throw new Error('bad_code')
    var s = storeTokens(await r.json())
    return s
  }

  // Back from the e-mail link: Supabase puts the session (or an error) in the URL hash.
  var returned = { ok: false, error: '', anchor: '' }
  ;(function captureReturn() {
    var h = location.hash || ''
    var g = function (k) { var m = h.match(new RegExp('[#&]' + k + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : '' }
    var at = g('access_token'), er = g('error')
    if (!at && !er) return
    var a = h.match(/^#([a-z-]+)[&#]/); returned.anchor = a ? a[1] : ''
    if (er) { returned.error = g('error_code') || er }
    else { storeTokens({ access_token: at, refresh_token: g('refresh_token'), expires_in: g('expires_in') }); returned.ok = true }
    history.replaceState(null, '', location.pathname + location.search.replace(/([?&])welcome=1&?/, '$1').replace(/[?&]$/, '') + (returned.anchor ? '#' + returned.anchor : ''))
  })()

  /* ---------- chrome: nav, drawer, footer, fz block, modal, toast ---------- */
  function toolsMenu(cls) {
    return '<a href="/profile-name-search" class="' + cls + '" data-p="pns"><span data-i18n="nav.pns">Profile Name Search</span><em class="pill live" data-i18n="nav.t.live">Live</em></a>' +
      '<a href="/album-creator" class="' + cls + '" data-p="album"><span data-i18n="nav.album">Adult Album Creator</span><em class="pill live" data-i18n="nav.t.live">Live</em></a>' +
      '<a href="/hookup-safety-check" class="' + cls + '" data-p="safety"><span data-i18n="nav.safety">Hookup Safety Check</span><em class="pill beta" data-i18n="nav.t.beta">Beta</em></a>'
  }
  function langList() { return LANGS.map(function (l) { return '<li data-l="' + l[0] + '" role="option"><span>' + l[1] + '</span><span class="code">' + l[0].toUpperCase() + '</span></li>' }).join('') }
  function buildNav() {
    var h = '<header class="nav"><div class="wrap">' +
      '<a href="/" class="logo" aria-label="Fluidz Labs"><i></i>fluidz <small>labs</small></a>' +
      '<nav class="links" aria-label="Main">' +
      '<a href="/" data-p="home" data-i18n="nav.labs">Labs</a>' +
      '<div class="dd" id="dd-tools"><button type="button" aria-haspopup="true" aria-expanded="false" data-p="tools"><span data-i18n="nav.tools">Tools</span>' + ico('chevron-down') + '</button><div class="dd-menu">' + toolsMenu('dd-item') + '</div></div>' +
      '<a href="/guides" data-p="guides" data-i18n="nav.guides">Guides</a>' +
      '<a href="/about" data-p="about" data-i18n="nav.app">Fluidz app</a>' +
      '<a href="/support" class="heart" data-p="support">' + ico('heart') + '<span data-i18n="nav.support">Support us</span></a>' +
      '</nav>' +
      '<div class="nav-r">' +
      '<div class="lang" id="lang"><button type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Language">' + ico('globe') + '<span class="lang-cur">EN</span>' + ico('chevron-down') + '</button><ul role="listbox">' + langList() + '</ul></div>' +
      '<span id="acct-slot"></span>' +
      '<button type="button" class="burger" id="burger" aria-label="Menu" aria-expanded="false" data-i18n-aria="nav.menu">' + ico('menu') + '</button>' +
      '</div></div></header>' +
      '<div class="drawer" id="drawer" hidden><div class="wrap">' +
      '<a href="/" data-p="home" data-i18n="nav.labs">Labs</a>' +
      '<p class="dr-h" data-i18n="nav.tools">Tools</p>' + toolsMenu('dr-item') +
      '<a href="/guides" data-p="guides" data-i18n="nav.guides">Guides</a><a href="/about" data-p="about" data-i18n="nav.app">Fluidz app</a>' +
      '<a href="/support" class="heart" data-p="support">' + ico('heart') + '<span data-i18n="nav.support">Support us</span></a>' +
      '<div id="dr-acct"></div>' +
      '</div></div>'
    var slot = $('#site-nav'); if (slot) slot.outerHTML = h; else body.insertAdjacentHTML('afterbegin', h)
  }
  function buildFooter() {
    var h = '<footer><div class="wrap"><div><div class="logo" style="font-size:18px;margin-bottom:8px"><i></i>fluidz <small>labs</small></div><p data-i18n="foot.p">' + EN['foot.p'] + '</p></div>' +
      '<nav aria-label="Footer"><a href="/" data-i18n="nav.labs">Labs</a><a href="/profile-name-search">Profile Name Search</a><a href="/album-creator" data-i18n="nav.album">Adult Album Creator</a><a href="/hookup-safety-check" data-i18n="nav.safety">Hookup Safety Check</a><a href="/guides" data-i18n="nav.guides">Guides</a><a href="/about" data-i18n="nav.app">Fluidz app</a><a href="/support" data-i18n="nav.support">Support us</a><a href="/privacy" data-i18n="nav.privacy">Privacy</a><a href="/legal-notice" data-i18n="nav.legal">Legal notice</a><a href="/terms" data-i18n="nav.terms">Terms</a><a href="/my-labs" data-i18n="nav.mine">My tools</a></nav></div></footer>'
    var slot = $('#site-foot'); if (slot) slot.outerHTML = h; else body.insertAdjacentHTML('beforeend', h)
  }
  function buildFz() {
    var slot = $('#site-fz'); if (!slot) return
    slot.outerHTML = '<section id="fluidz" class="sec fz"><div class="wrap"><div class="logo"><i></i>fluidz</div>' +
      '<h2 class="rv"><span data-i18n="fz.l1">' + EN['fz.l1'] + '</span><span class="l2" data-i18n-html="fz.l2">' + EN['fz.l2'] + '</span></h2>' +
      '<p class="p rv" data-i18n="fz.p">' + EN['fz.p'] + '</p>' +
      '<ul class="atouts"><li data-i18n="fz.a1">' + EN['fz.a1'] + '</li><li data-i18n="fz.a2">' + EN['fz.a2'] + '</li><li data-i18n="fz.a3">' + EN['fz.a3'] + '</li><li data-i18n="fz.a4">' + EN['fz.a4'] + '</li></ul>' +
      '<div id="fz-form"><form class="wf" id="fz-wf" novalidate><input type="email" id="fz-em" data-i18n-ph="m.ph" placeholder="your@email.com" autocomplete="email" inputmode="email" aria-label="Email"><button type="submit" class="btn btn-p" id="fz-sub" data-i18n="fz.cta">' + EN['fz.cta'] + '</button></form>' +
      '<p class="wn" data-i18n="fz.note">' + EN['fz.note'] + '</p><p class="msg" id="fz-m"></p></div>' +
      '<div class="done" id="fz-sent"><p class="ok" data-i18n="fz.sent.t">' + EN['fz.sent.t'] + '</p><p class="hint"><span data-i18n="fz.sent.p">' + EN['fz.sent.p'] + '</span> <b id="fz-to"></b>.</p>' +
      '<p class="wn"><span data-i18n="fz.sent.n">' + EN['fz.sent.n'] + '</span> <button type="button" class="linkbtn" id="fz-resend" data-i18n="fz.sent.r">' + EN['fz.sent.r'] + '</button>.</p></div>' +
      '<div class="done" id="fz-welcome"><p class="ok" data-i18n="fz.wel.t">' + EN['fz.wel.t'] + '</p><p class="hint" data-i18n="fz.wel.p">' + EN['fz.wel.p'] + '</p><p style="margin-top:20px"><a class="btn btn-p btn-s" href="/my-labs" data-i18n="fz.in.btn">' + EN['fz.in.btn'] + '</a></p></div>' +
      '</div></section>'
  }
  function buildModal() {
    body.insertAdjacentHTML('beforeend',
      '<div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><div class="box">' +
      '<div class="top"><div class="logo" style="font-size:20px"><i></i>fluidz <small>labs</small></div><button type="button" class="x" id="m-x" aria-label="Close">' + ico('x') + '</button></div>' +
      '<div id="m-form"><h2 id="m-title" data-i18n="m.title">' + EN['m.title'] + '</h2><p class="p" data-i18n="m.p">' + EN['m.p'] + '</p>' +
      '<form id="m-f" novalidate><label for="m-em" data-i18n="m.email">Email</label><input class="field" type="email" id="m-em" data-i18n-ph="m.ph" placeholder="your@email.com" autocomplete="email" inputmode="email">' +
      '<label class="chk"><input type="checkbox" id="m-opt"><span data-i18n="m.optin">' + EN['m.optin'] + '</span></label>' +
      '<p class="msg" id="m-m"></p><button type="submit" class="btn btn-p" id="m-sub" data-i18n="m.btn">' + EN['m.btn'] + '</button></form>' +
      '<p class="wa">' + ico('message-circle') + '<span data-i18n="m.wa">' + EN['m.wa'] + '</span></p><p class="legal" data-i18n="m.legal">' + EN['m.legal'] + '</p></div>' +
      '<div class="sent" id="m-sent"><div class="big">' + ico('mail-check') + '</div><h2 data-i18n="m.sent.t">' + EN['m.sent.t'] + '</h2>' +
      '<p class="p"><span data-i18n="m.sent.p">' + EN['m.sent.p'] + '</span> <b id="m-to"></b>. <span data-i18n="m.sent.p2">' + EN['m.sent.p2'] + '</span></p>' +
      '<p class="p small" data-i18n="m.code">' + EN['m.code'] + '</p>' +
      '<form id="m-cf" novalidate><input class="field code" id="m-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="000000" aria-label="Code"><p class="msg" id="m-cm"></p><button type="submit" class="btn btn-g" data-i18n="m.code.btn">' + EN['m.code.btn'] + '</button></form>' +
      '<button type="button" class="btn btn-g" id="m-resend" data-i18n="m.resend">' + EN['m.resend'] + '</button></div>' +
      '</div></div><div class="toast" id="toast" role="status" aria-live="polite"></div>')
  }

  /* ---------- account (nav + drawer) ---------- */
  function initial(u) { return (u.email || '?').charAt(0).toUpperCase() }
  function refreshAccount() {
    var u = user(), slot = $('#acct-slot'), dr = $('#dr-acct')
    if (!slot || !dr) return
    if (!u) {
      slot.innerHTML = '<button type="button" class="signin" id="nav-signin" data-i18n="nav.signin">' + t('nav.signin') + '</button><button type="button" class="btn btn-p btn-s nav-cta" id="nav-cta" data-i18n="nav.cta">' + t('nav.cta') + '</button>'
      dr.innerHTML = '<button type="button" class="btn btn-p" id="dr-signin" data-i18n="nav.signin">' + t('nav.signin') + '</button>'
      $('#nav-signin').onclick = function () { openSignIn() }
      $('#nav-cta').onclick = function () { var f = $('#fluidz'); if (f && PAGE !== 'mine') f.scrollIntoView({ behavior: 'smooth' }); else openSignIn() }
      $('#dr-signin').onclick = function () { closeDrawer(); openSignIn() }
    } else {
      slot.innerHTML = '<div class="dd acct" id="dd-acct"><button type="button" class="avatar" aria-haspopup="true" aria-expanded="false" aria-label="Account">' + esc(initial(u)) + '</button>' +
        '<div class="dd-menu right"><p class="who"><span data-i18n="nav.signedin">' + t('nav.signedin') + '</span><b>' + esc(u.email) + '</b></p><a class="dd-item" href="/my-labs"><span data-i18n="nav.mine">' + t('nav.mine') + '</span></a><button type="button" class="dd-item" id="nav-out"><span data-i18n="nav.signout">' + t('nav.signout') + '</span></button></div></div>'
      dr.innerHTML = '<p class="who"><span data-i18n="nav.signedin">' + t('nav.signedin') + '</span> <b>' + esc(u.email) + '</b></p><a class="btn btn-p" href="/my-labs" data-i18n="nav.mine">' + t('nav.mine') + '</a> <button type="button" class="btn btn-g" id="dr-out" data-i18n="nav.signout">' + t('nav.signout') + '</button>'
      $('#nav-out').onclick = signOut; $('#dr-out').onclick = function () { closeDrawer(); signOut() }
      bindDropdown($('#dd-acct'))
    }
    markActive(); renderFz()
  }
  function markActive() {
    $$('.links a[data-p],.drawer a[data-p]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-p') === PAGE || (a.getAttribute('data-p') === 'guides' && PAGE.indexOf('guide') === 0)) })
    var dd = $('#dd-tools > button'); if (dd) dd.classList.toggle('on', ['pns', 'album', 'safety'].indexOf(PAGE) >= 0)
    $$('.dd-item[data-p],.dr-item[data-p]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-p') === PAGE) })
  }
  function bindDropdown(box) {
    if (!box) return
    var b = $('button', box)
    b.onclick = function (e) { e.stopPropagation(); var open = !box.classList.contains('open'); closeMenus(); box.classList.toggle('open', open); b.setAttribute('aria-expanded', open) }
  }
  function closeMenus() { $$('.dd.open,.lang.open').forEach(function (x) { x.classList.remove('open') }); $$('.dd > button,.lang > button').forEach(function (b) { b.setAttribute('aria-expanded', 'false') }) }
  function closeDrawer() { var d = $('#drawer'), b = $('#burger'); if (!d) return; d.hidden = true; body.classList.remove('drawer-open'); b.setAttribute('aria-expanded', 'false') }

  /* ---------- "Fluidz" block (shared by Home, Profile Name Search, Album Creator) ---------- */
  var fzShown = ''
  function fzShow(id) { fzShown = id; ;['fz-form', 'fz-sent', 'fz-welcome'].forEach(function (x) { var el = $('#' + x); if (el) el.style.display = x === id ? 'block' : 'none' }) }
  var fzEmail = ''
  function renderFz() { if (!$('#fz-wf')) return; if (user()) fzShow('fz-welcome'); else if (fzShown !== 'fz-sent') fzShow('fz-form') }
  function bindFz() {
    var f = $('#fz-wf'); if (!f) return
    fzShow('fz-form')
    f.addEventListener('submit', async function (e) {
      e.preventDefault()
      var el = $('#fz-em'), email = el.value.trim(), btn = $('#fz-sub'), m = $('#fz-m')
      m.style.display = 'none'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { m.style.display = 'block'; m.textContent = t('m.err.invalid'); el.focus(); return }
      btn.disabled = true
      try {
        var r = await sendLink(email, { source: Labs.source() })
        fzEmail = email; $('#fz-to').textContent = email
        fzShow(r.emailed ? 'fz-sent' : 'fz-welcome')
      } catch (_) { m.style.display = 'block'; m.textContent = t('m.err.retry') }
      btn.disabled = false
    })
    $('#fz-resend').addEventListener('click', async function (e) { if (!fzEmail) return; e.target.disabled = true; try { await sendLink(fzEmail, { source: Labs.source() }); e.target.textContent = '✓' } catch (_) { e.target.disabled = false } })
  }

  /* ---------- sign-in modal ---------- */
  var mOpts = {}, mEmail = ''
  function mShow(sent) { $('#m-form').style.display = sent ? 'none' : 'block'; $('#m-sent').style.display = sent ? 'block' : 'none' }
  function openSignIn(o) {
    mOpts = o || {}; closeDrawer(); closeMenus()
    mShow(false); $('#m-m').style.display = 'none'; $('#m-cm').style.display = 'none'; $('#m-code').value = ''
    $('#modal').classList.add('open'); body.classList.add('modal-open')
    setTimeout(function () { var e = $('#m-em'); if (e) e.focus() }, 50)
  }
  function closeModal() { $('#modal').classList.remove('open'); body.classList.remove('modal-open') }
  function bindModal() {
    $('#m-x').onclick = closeModal
    $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal() })
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModal(); closeMenus(); closeDrawer() } })
    $('#m-f').addEventListener('submit', async function (e) {
      e.preventDefault()
      var email = $('#m-em').value.trim(), m = $('#m-m'), btn = $('#m-sub')
      m.style.display = 'none'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { m.style.display = 'block'; m.textContent = t('m.err.invalid'); return }
      btn.disabled = true
      try {
        var r = await sendLink(email, { source: mOpts.source || Labs.source(), redirect: mOpts.redirect, hash: mOpts.hash, marketing: $('#m-opt').checked })
        mEmail = email; $('#m-to').textContent = email
        if (r.emailed) mShow(true); else { m.style.display = 'block'; m.textContent = t('m.err.retry') }
      } catch (_) { m.style.display = 'block'; m.textContent = t('m.err.retry') }
      btn.disabled = false
    })
    $('#m-cf').addEventListener('submit', async function (e) {
      e.preventDefault()
      var code = $('#m-code').value.trim(), m = $('#m-cm')
      m.style.display = 'none'
      if (code.length < 6) { m.style.display = 'block'; m.textContent = t('m.err.code'); return }
      try {
        await verifyCode(mEmail, code); closeModal(); signedIn(true)
        if (mOpts.onDone) mOpts.onDone(user())
      } catch (_) { m.style.display = 'block'; m.textContent = t('m.err.code') }
    })
    $('#m-resend').onclick = async function (e) { var b = e.currentTarget; b.disabled = true; try { await sendLink(mEmail, { source: mOpts.source || Labs.source(), redirect: mOpts.redirect, hash: mOpts.hash, marketing: $('#m-opt').checked }); b.textContent = t('m.resent') } catch (_) {} setTimeout(function () { b.disabled = false; b.textContent = t('m.resend') }, 4000) }
  }

  /* ---------- toast ---------- */
  var toastT
  function toast(msg) { var el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show') }, 4200) }
  function signedIn(announce) {
    refreshAccount()
    var u = user(); if (announce && u) toast(t('toast.in') + ' ' + u.email)
    D.dispatchEvent(new CustomEvent('labs:auth', { detail: u }))
    loadUser().then(function () { refreshAccount() })
  }

  /* ---------- boot ---------- */
  buildNav(); buildFz(); buildFooter(); buildModal()
  fillIcons(D)
  EN['title.' + PAGE] = D.title
  var md0 = $('meta[name="description"]'); if (md0) EN['desc.' + PAGE] = md0.getAttribute('content')
  captureEN(D)
  bindDropdown($('#dd-tools'))
  var langBox = $('#lang'); if (langBox) {
    $('button', langBox).onclick = function (e) { e.stopPropagation(); var open = !langBox.classList.contains('open'); closeMenus(); langBox.classList.toggle('open', open) }
    $$('li', langBox).forEach(function (li) { li.onclick = function () { closeMenus(); setLang(li.getAttribute('data-l')) } })
  }
  D.addEventListener('click', closeMenus)
  var burger = $('#burger'); burger.onclick = function () { var d = $('#drawer'); var open = d.hidden; d.hidden = !open; body.classList.toggle('drawer-open', open); burger.setAttribute('aria-expanded', open) }
  $$('#drawer a').forEach(function (a) { a.addEventListener('click', closeDrawer) })
  bindModal(); bindFz()
  // elements marked data-signin open the modal (data-source / data-hash tune it)
  D.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-signin]'); if (!el) return
    e.preventDefault(); openSignIn({ source: el.getAttribute('data-source') || undefined, hash: el.getAttribute('data-hash') || undefined })
  })
  refreshAccount()
  applyLang()
  var obs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('v'); obs.unobserve(e.target) } }) }, { threshold: 0.1 }) : null
  function watchReveal(root) { $$('.rv', root).forEach(function (el) { if (obs) obs.observe(el); else el.classList.add('v') }) }
  watchReveal(D)

  if (returned.error) { setTimeout(function () { toast(returned.error === 'otp_expired' ? t('m.err.expired') : t('m.err.retry')); openSignIn() }, 300) }
  if (returned.ok) { signedIn(true) } else if (session()) { loadUser().then(function () { refreshAccount() }) }

  /* ---------- public API for the pages ---------- */
  var Labs = window.Labs = {
    t: t, lang: function () { return LANG }, setLang: setLang, en: function (o) { for (var k in o) if (EN[k] == null) EN[k] = o[k]; applyLang() }, EN: EN,
    refresh: function (root) { fillIcons(root || D); captureEN(root || D); applyLang(); watchReveal(root || D) },
    session: session, user: user, updateMeta: updateMeta, signOut: signOut, openSignIn: openSignIn, sendLink: sendLink, toast: toast, ico: ico,
    returned: returned, source: function () { return SOURCE }, setSource: function (s) { SOURCE = s }, redirectFor: redirectFor
  }
  D.dispatchEvent(new CustomEvent('labs:ready'))
})()

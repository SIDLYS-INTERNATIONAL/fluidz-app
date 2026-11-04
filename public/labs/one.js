/* Fluidz — one page for Profile Name Search: language, e-mail form, magic-link return, download.
   No analytics, no cookies. localStorage only for the language, the session and remembered utm values. */
(function () {
  'use strict'
  var D = document
  var $ = function (s, r) { return (r || D).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)) }

  /* ---------- config ---------- */
  // Social accounts: put an https:// URL to show it in the footer. Empty = nothing is shown.
  var SOCIAL = { x: '', snapchat: '', instagram: '', bluesky: '', telegram: '' }
  var SOCIAL_NAMES = { x: 'X', snapchat: 'Snapchat', instagram: 'Instagram', bluesky: 'Bluesky', telegram: 'Telegram' }
  var SB_URL = 'https://kxbrfjqxufvskcxmliak.supabase.co'
  var SB_KEY = 'sb_publishable_G2j2f4to4L6nkp75L1fVAA_qrAJUL7h' // public (browser) key
  var SESSION_KEY = 'fluidz_labs_session'
  var REDIRECT = 'https://fluidz.app/?welcome=1#download'
  var COOLDOWN = 30
  var LANGS = ['en', 'fr', 'es', 'pt', 'it', 'de']

  function lsGet(k) { try { return localStorage.getItem(k) } catch (e) { return null } }
  function lsSet(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k) } catch (e) {} }

  /* ---------- i18n: English lives in the page (data-i18n*), other languages in /labs/one-i18n*.js ---------- */
  var LANG = window.ONE_LANG || 'en'
  var EN = {
    'err.invalid': 'Please enter a valid e-mail address.',
    'err.limit': 'Too many requests right now. Try again in a few minutes.',
    'err.net': 'Couldn’t reach the server. Check your connection and try again.',
    'f.sending': 'Sending…',
    'sent.resend.in': 'Send it again in {n}s',
    'sent.resent': 'Sent again. Check your inbox.',
    'exp.t': 'That link has expired or was already used. Enter your e-mail to get a new one.',
    'exp.session': 'Your session has ended. Enter your e-mail to get a new link.',
    'ready.loading': 'Preparing…',
    'ready.done': 'Download started. Unzip it, then follow the steps below.',
    'ready.err': 'The download didn’t work. Try again in a moment.'
  }
  var ATTRS = [['ph', 'placeholder'], ['aria', 'aria-label']]
  $$('[data-i18n]').forEach(function (el) { EN[el.getAttribute('data-i18n')] = el.textContent })
  $$('[data-i18n-html]').forEach(function (el) { EN[el.getAttribute('data-i18n-html')] = el.innerHTML })
  ATTRS.forEach(function (a) { $$('[data-i18n-' + a[0] + ']').forEach(function (el) { EN[el.getAttribute('data-i18n-' + a[0])] = el.getAttribute(a[1]) }) })
  EN['meta.title'] = D.title
  EN['meta.desc'] = $('meta[name="description"]').content

  function t(k, v) {
    var s = ((window.ONE_I18N || {})[LANG] || {})[k]; if (s == null) s = EN[k]; if (s == null) return k
    if (v) for (var n in v) s = s.replace('{' + n + '}', v[n])
    return s
  }
  function applyLang() {
    D.documentElement.lang = LANG
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')) })
    $$('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')) })
    ATTRS.forEach(function (a) { $$('[data-i18n-' + a[0] + ']').forEach(function (el) { el.setAttribute(a[1], t(el.getAttribute('data-i18n-' + a[0]))) }) })
    D.title = t('meta.title')
    $$('meta[property="og:title"],meta[name="twitter:title"]').forEach(function (m) { m.content = t('meta.title') })
    $$('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').forEach(function (m) { m.content = t('meta.desc') })
    $('#lang').value = LANG
    if (busy) label('f.sending')
    tick()
    if (noticeKey) notice.textContent = t(noticeKey)
    whoEl.textContent = who()
  }
  function setLang(l) {
    if (LANGS.indexOf(l) < 0) l = 'en'
    var done = function () { LANG = l; window.ONE_LANG = l; lsSet('fluidz_lang', l); applyLang() }
    if (l === 'en' || (window.ONE_I18N || {})[l]) return done()
    var s = D.createElement('script')
    s.src = '/labs/' + (l === 'it' || l === 'de' ? 'one-i18n-2.js' : 'one-i18n.js') + '?v=2'
    s.onload = done; s.onerror = done; D.head.appendChild(s)
  }

  /* ---------- phone (Chrome extensions don't run on phones) ---------- */
  function mq(q) { try { return matchMedia(q).matches } catch (e) { return false } }
  function updPhone() { D.documentElement.classList.toggle('is-phone', mq('(hover: none) and (pointer: coarse)') || mq('(max-width: 760px)')) }
  updPhone()
  try { matchMedia('(max-width: 760px)').addEventListener('change', updPhone) } catch (e) {}

  /* ---------- utm (remembered from the URL) ---------- */
  var UTM = (function () {
    var q = new URLSearchParams(location.search), cut = function (s) { return String(s || '').slice(0, 100) }
    var u = { source: cut(q.get('utm_source')), medium: cut(q.get('utm_medium')), campaign: cut(q.get('utm_campaign')) }
    if (u.source || u.medium || u.campaign) { lsSet('fluidz_utm', JSON.stringify(u)); return u }
    try { var s = JSON.parse(lsGet('fluidz_utm') || 'null'); if (s) return { source: cut(s.source), medium: cut(s.medium), campaign: cut(s.campaign) } } catch (e) {}
    return u
  })()

  /* ---------- session (Supabase REST, no SDK) ---------- */
  function jwt(tok) { try { var p = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(p)))) } catch (e) { return {} } }
  function readSession() { try { return JSON.parse(lsGet(SESSION_KEY) || 'null') } catch (e) { return null } }
  function storeTokens(j) {
    var prev = readSession() || {}, c = jwt(j.access_token)
    var s = { access_token: j.access_token, refresh_token: j.refresh_token || prev.refresh_token, expires_at: Date.now() + 1000 * Number(j.expires_in || 3600), user: j.user || prev.user || { email: c.email } }
    lsSet(SESSION_KEY, JSON.stringify(s)); return s
  }
  function session() {
    var s = readSession()
    if (!s || !s.access_token || (!s.refresh_token && s.expires_at < Date.now())) return null
    return s
  }
  function who() { var s = session(); return s ? ((s.user || {}).email || jwt(s.access_token).email || '') : '' }
  async function refresh() {
    var s = readSession(); if (!s || !s.refresh_token) { lsDel(SESSION_KEY); return null }
    try {
      var r = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) })
      if (!r.ok) { lsDel(SESSION_KEY); return null }
      return storeTokens(await r.json())
    } catch (e) { return s }
  }
  async function ensureFresh() {
    var s = readSession(); if (!s || !s.access_token) return null
    return s.expires_at - Date.now() > 120000 ? s : refresh()
  }

  // Back from the e-mail link: Supabase puts the session (or an error) in the URL hash.
  var returned = { ok: false, error: '' }
  ;(function () {
    var h = location.hash || ''
    var g = function (k) { var m = h.match(new RegExp('[#&]' + k + '=([^&]*)')); try { return m ? decodeURIComponent(m[1]) : '' } catch (e) { return m ? m[1] : '' } }
    var at = g('access_token'), er = g('error')
    if (!at && !er) return
    if (er) returned.error = g('error_code') || er
    else { storeTokens({ access_token: at, refresh_token: g('refresh_token'), expires_in: g('expires_in') }); returned.ok = true }
    try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])welcome=1&?/, '$1').replace(/[?&]$/, '') + '#download') } catch (e) {}
  })()

  /* ---------- form ---------- */
  var card = $('#download'), form = $('form', card), input = $('#em'), box = $('input[name=marketing]', card)
  var hp = $('input[name=website]', card), btn = $('button[type=submit]', form), btnLabel = $('span', btn)
  var notice = $('[data-notice]', card), resendBtn = $('[data-resend]', card), whoEl = $('[data-who]', card)
  var panels = {}; $$('[data-panel]', card).forEach(function (p) { panels[p.getAttribute('data-panel')] = p })
  var state = 'form', busy = false, email = '', marketing = false, cool = 0, timer = null, noticeKey = null
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function signup(addr, mk) {
    var res = await fetch('/api/labs-signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addr, source: 'pns-home', lang: LANG, marketing: !!mk, utm: UTM, redirect: REDIRECT, website: hp ? hp.value : '' })
    })
    var j = null; try { j = await res.json() } catch (e) {}
    if (res.status === 400 || (j && j.error === 'invalid_email')) return 'invalid_email'
    if (j && j.emailed) return 'ok'
    if (res.status === 429 || (j && j.error === 'email_failed')) return 'limit'
    throw new Error('http_' + res.status)
  }
  function msg(text, ok) {
    $$('[data-msg]', card).forEach(function (m) { m.textContent = ''; m.classList.remove('ok') })
    var m = $('[data-msg]', panels[state])
    if (text) { m.textContent = text; m.classList.toggle('ok', !!ok) }
  }
  function show(name, focus) {
    state = name
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name })
    if (focus) { var h = $('h2', panels[name]); (h || input).focus({ preventScroll: true }) }
  }
  function label(key) { btnLabel.textContent = t(key || btnLabel.getAttribute('data-i18n')) }
  function setNotice(key) { noticeKey = key; notice.hidden = !key; notice.textContent = key ? t(key) : '' }
  function bad() { msg(t('err.invalid')); input.setAttribute('aria-invalid', 'true'); input.focus() }
  function tick() { resendBtn.disabled = cool > 0; resendBtn.textContent = cool > 0 ? t('sent.resend.in', { n: cool }) : t('sent.resend') }
  function startCooldown() {
    cool = COOLDOWN; clearInterval(timer); tick()
    timer = setInterval(function () { cool--; tick(); if (cool <= 0) clearInterval(timer) }, 1000)
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault(); if (busy) return
    var v = input.value.trim(); msg('')
    if (!EMAIL_RE.test(v)) return bad()
    input.removeAttribute('aria-invalid')
    busy = true; btn.disabled = true; label('f.sending')
    try {
      var r = await signup(v, box.checked)
      if (r === 'ok') { email = v; marketing = box.checked; $('[data-to]', card).textContent = v; setNotice(null); show('sent', true); startCooldown() }
      else if (r === 'invalid_email') bad()
      else msg(t('err.limit'))
    } catch (err) { msg(t('err.net')) }
    busy = false; btn.disabled = false; label()
  })
  input.addEventListener('input', function () { msg('') })
  resendBtn.addEventListener('click', async function () {
    if (cool > 0 || !email) return
    resendBtn.disabled = true; msg('')
    var r; try { r = await signup(email, marketing) } catch (e) { r = 'net' }
    msg(t(r === 'ok' ? 'sent.resent' : r === 'net' ? 'err.net' : 'err.limit'), r === 'ok')
    startCooldown()
  })
  $$('[data-other]', card).forEach(function (b) {
    b.addEventListener('click', function () {
      clearInterval(timer); cool = 0
      if (session()) { lsDel(SESSION_KEY); D.documentElement.classList.remove('is-in') }
      msg(''); setNotice(null); input.value = ''; show('form', true)
    })
  })
  $('[data-desktop]', card).addEventListener('click', function () { D.documentElement.classList.add('force-desktop') })

  function ready(focus) { whoEl.textContent = who(); setNotice(null); show('ready', focus); D.documentElement.classList.add('is-in') }
  function expired(key) {
    D.documentElement.classList.remove('is-in'); clearInterval(timer)
    show('form'); setNotice(key)
    setTimeout(function () { try { input.focus({ preventScroll: true }) } catch (e) {} }, 0)
  }

  var dl = $('[data-download]', card), dlLabel = $('span', dl)
  dl.addEventListener('click', async function () {
    if (dl.disabled) return
    dl.disabled = true; dlLabel.textContent = t('ready.loading'); msg('')
    var get = function (s) { return fetch('/api/profile-name-search-download', { headers: { Authorization: 'Bearer ' + s.access_token } }) }
    try {
      var s = await ensureFresh()
      if (!s) return expired('exp.session')
      var r = await get(s)
      if (r.status === 401) {
        s = await refresh()
        if (!s) return expired('exp.session')
        r = await get(s)
        if (r.status === 401) { lsDel(SESSION_KEY); return expired('exp.session') }
      }
      if (!r.ok) throw new Error('http_' + r.status)
      var url = URL.createObjectURL(await r.blob()), a = D.createElement('a')
      a.href = url; a.download = 'profile-name-search.zip'; a.style.display = 'none'
      D.body.appendChild(a); a.click(); a.remove()
      setTimeout(function () { URL.revokeObjectURL(url) }, 8000)
      msg(t('ready.done'), true)
    } catch (e) { msg(t('ready.err')) }
    finally { dl.disabled = false; dlLabel.textContent = t('ready.btn') }
  })

  /* ---------- social links (footer) ---------- */
  var fl = $('#follow-l')
  Object.keys(SOCIAL).forEach(function (k) {
    var u = String(SOCIAL[k] || '').trim(); if (!/^https:\/\//i.test(u)) return
    var a = D.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener me'; a.textContent = SOCIAL_NAMES[k]
    if (fl.childNodes.length) fl.appendChild(D.createTextNode(' · '))
    fl.appendChild(a)
  })
  $('#follow').hidden = !fl.childNodes.length

  /* ---------- init ---------- */
  applyLang()
  $('#lang').addEventListener('change', function (e) { setLang(e.target.value) })
  function toForm() { setTimeout(function () { card.scrollIntoView({ block: 'center' }) }, 60) }
  if (returned.error) { expired('exp.t'); toForm() }
  else if (session()) {
    ready(false)
    if (returned.ok) toForm()
    else ensureFresh().then(function (s) { if (!s) expired('exp.session') })
  }
})()

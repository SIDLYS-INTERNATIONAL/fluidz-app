/* Fluidz — single product page (Profile Name Search): language, e-mail funnel, magic-link return, download.
   No analytics, no cookies. localStorage only for the language, the session and remembered utm values. */
(function () {
  'use strict'
  var D = document
  var $ = function (s, r) { return (r || D).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)) }

  /* ---------- config ---------- */
  // Social accounts: fill a URL (https://...) to show it in the "Follow Fluidz" row. Empty = nothing is shown.
  var SOCIAL = { x: '', snapchat: '', instagram: '', bluesky: '', telegram: '' }
  var SOCIAL_NAMES = { x: 'X', snapchat: 'Snapchat', instagram: 'Instagram', bluesky: 'Bluesky', telegram: 'Telegram' }
  var SB_URL = 'https://kxbrfjqxufvskcxmliak.supabase.co'
  var SB_KEY = 'sb_publishable_G2j2f4to4L6nkp75L1fVAA_qrAJUL7h' // public (browser) key
  var SESSION_KEY = 'fluidz_labs_session'
  var SOURCE = 'pns-home'
  var REDIRECT = 'https://fluidz.app/?welcome=1#download'
  var COOLDOWN = 30
  var LANGS = ['en', 'fr', 'es', 'pt', 'it', 'de']

  /* ---------- storage (always guarded) ---------- */
  function lsGet(k) { try { return localStorage.getItem(k) } catch (e) { return null } }
  function lsSet(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k) } catch (e) {} }

  /* ---------- i18n: English lives in the page (data-i18n*), other languages in /labs/one-l-<lang>.js ---------- */
  var LANG = window.ONE_LANG || 'en'
  var EN = {
    'err.invalid': 'Please enter a valid e-mail address.',
    'err.limit': 'Too many requests right now. Try again in a few minutes.',
    'err.net': 'Couldn’t reach the server. Check your connection and try again.',
    'sent.resend.in': 'Send it again in {n}s',
    'sent.resent': 'Sent again. Check your inbox.',
    'exp.t': 'That link has expired or was already used. Enter your e-mail to get a new one.',
    'exp.session': 'Your session has ended. Enter your e-mail to get a new link.',
    'ready.loading': 'Preparing…',
    'ready.done': 'Download started. Unzip it, then follow the steps below.',
    'end.done': 'Download started. Unzip it, then follow the install steps above.',
    'end.ready': 'Your free extension is ready. Download it, then install it in about two minutes (steps above).',
    'end.next': 'Back to the install steps ↑',
    'ready.err': 'The download didn’t work. Try again in a moment.',
    'how.copied': 'Copied',
    'f.sending': 'Sending…'
  }
  function collectEN() {
    $$('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (EN[k] == null) EN[k] = el.textContent })
    $$('[data-i18n-html]').forEach(function (el) { var k = el.getAttribute('data-i18n-html'); if (EN[k] == null) EN[k] = el.innerHTML })
    ;['ph:placeholder', 'aria:aria-label', 'title:title', 'alt:alt'].forEach(function (p) {
      var a = p.split(':')
      $$('[data-i18n-' + a[0] + ']').forEach(function (el) { var k = el.getAttribute('data-i18n-' + a[0]); if (EN[k] == null) EN[k] = el.getAttribute(a[1]) })
    })
    EN['meta.title'] = D.title
    EN['meta.desc'] = ($('meta[name="description"]') || {}).content || ''
  }
  function dict() { return (window.ONE_I18N || {})[LANG] || {} }
  function t(k, v) {
    var s = dict()[k]; if (s == null) s = EN[k]; if (s == null) return k
    if (v) for (var n in v) s = s.replace('{' + n + '}', v[n])
    return s
  }
  function setMeta(sel, attr, val) { var el = $(sel); if (el) el.setAttribute(attr, val) }
  function applyLang() {
    D.documentElement.lang = LANG
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')) })
    $$('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')) })
    $$('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))) })
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))) })
    $$('[data-i18n-title]').forEach(function (el) { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))) })
    $$('[data-i18n-alt]').forEach(function (el) { el.setAttribute('alt', t(el.getAttribute('data-i18n-alt'))) })
    // Screenshots exist in English and French: French pages show the French ones, every other language the English ones.
    $$('img[data-src-fr]').forEach(function (el) {
      if (!el.getAttribute('data-src-en')) el.setAttribute('data-src-en', el.getAttribute('src'))
      var want = LANG === 'fr' ? el.getAttribute('data-src-fr') : el.getAttribute('data-src-en')
      if (el.getAttribute('src') !== want) el.setAttribute('src', want)
    })
    D.title = t('meta.title')
    setMeta('meta[name="description"]', 'content', t('meta.desc'))
    setMeta('meta[property="og:title"]', 'content', t('meta.title')); setMeta('meta[name="twitter:title"]', 'content', t('meta.title'))
    setMeta('meta[property="og:description"]', 'content', t('meta.desc')); setMeta('meta[name="twitter:description"]', 'content', t('meta.desc'))
    brApply()
    langUI()
    forms.forEach(function (f) { f.refreshText() })
    setDemo()
    setAnims()
  }
  function setLang(l) {
    if (LANGS.indexOf(l) < 0) l = 'en'
    var done = function () { LANG = l; window.ONE_LANG = l; lsSet('fluidz_lang', l); applyLang() }
    if (l === 'en' || (window.ONE_I18N || {})[l]) return done()
    var s = D.createElement('script')
    s.src = '/labs/one-l-' + l + '.js?v=1'
    s.onload = done; s.onerror = done; D.head.appendChild(s)
  }

  /* ---------- language menu (button + listbox, replaces the native <select>) ---------- */
  var LB = $('#lang'), LM = $('#lang-menu')
  function langOpts() { return $$('[role=option]', LM) }
  function langUI() {
    if (!LB) return
    var cur = null
    langOpts().forEach(function (o) { var on = o.getAttribute('data-lang') === LANG; o.setAttribute('aria-selected', on ? 'true' : 'false'); if (on) cur = o })
    var u = $('.fl use', LB); if (u) u.setAttribute('href', '#fl-' + LANG)
    var c = $('[data-lang-code]', LB); if (c) c.textContent = LANG.toUpperCase()
    LB.setAttribute('aria-label', t('aria.lang') + ': ' + (cur ? cur.textContent.trim() : LANG))
  }
  function langOpen(focusLast) {
    if (!LM.hidden) return
    LM.hidden = false; LB.setAttribute('aria-expanded', 'true')
    var os = langOpts(), sel = os.filter(function (o) { return o.getAttribute('aria-selected') === 'true' })[0]
    ;(focusLast ? os[os.length - 1] : sel || os[0]).focus()
  }
  function langClose(back) {
    if (LM.hidden) return
    LM.hidden = true; LB.setAttribute('aria-expanded', 'false')
    if (back) LB.focus()
  }
  function langPick(o) { langClose(true); var l = o.getAttribute('data-lang'); if (l !== LANG) setLang(l) }
  function langInit() {
    if (!LB || !LM) return
    LB.addEventListener('click', function () { if (LM.hidden) langOpen(); else langClose(false) })
    LB.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); langOpen(e.key === 'ArrowUp') }
    })
    LM.addEventListener('click', function (e) { var o = e.target.closest('[role=option]'); if (o) langPick(o) })
    LM.addEventListener('keydown', function (e) {
      var os = langOpts(), i = os.indexOf(D.activeElement), k = e.key
      if (k === 'ArrowDown') { e.preventDefault(); os[(i + 1) % os.length].focus() }
      else if (k === 'ArrowUp') { e.preventDefault(); os[(i - 1 + os.length) % os.length].focus() }
      else if (k === 'Home') { e.preventDefault(); os[0].focus() }
      else if (k === 'End') { e.preventDefault(); os[os.length - 1].focus() }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (i >= 0) langPick(os[i]) }
      else if (k === 'Escape') { e.preventDefault(); langClose(true) }
      else if (k === 'Tab') langClose(false)
      else if (k.length === 1 && /\S/.test(k)) {
        var m = os.filter(function (o) { return o.textContent.trim().toLowerCase().indexOf(k.toLowerCase()) === 0 })[0]
        if (m) m.focus()
      }
    })
    D.addEventListener('pointerdown', function (e) { if (!LM.hidden && !e.target.closest('.lsel')) langClose(false) })
    D.addEventListener('focusin', function (e) { if (!LM.hidden && !e.target.closest('.lsel')) langClose(false) })
  }

  /* ---------- phone detection (Chrome extensions can't run on phones) ---------- */
  function mq(q) { try { return matchMedia(q).matches } catch (e) { return false } }
  function isPhone() { return mq('(hover: none) and (pointer: coarse)') || mq('(max-width: 760px)') }
  function updPhone() { D.documentElement.classList.toggle('is-phone', isPhone()) }
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
  function saveSession(s) { lsSet(SESSION_KEY, JSON.stringify(s)); return s }
  function sbApi(path, body) {
    return fetch(SB_URL + path, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }
  function storeTokens(j) {
    var prev = readSession() || {}, c = jwt(j.access_token)
    var user = j.user || prev.user || { email: c.email, user_metadata: c.user_metadata || {} }
    return saveSession({ access_token: j.access_token, refresh_token: j.refresh_token || prev.refresh_token, expires_at: Date.now() + 1000 * Number(j.expires_in || 3600), user: user })
  }
  function session() {
    var s = readSession()
    if (!s || !s.access_token) return null
    if (!s.refresh_token && s.expires_at < Date.now()) return null
    return s
  }
  function who() { var s = session(); if (!s) return ''; var c = jwt(s.access_token), u = s.user || {}; return u.email || c.email || '' }
  async function refresh() {
    var s = readSession(); if (!s || !s.refresh_token) { lsDel(SESSION_KEY); return null }
    try {
      var r = await sbApi('/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token })
      if (!r.ok) { lsDel(SESSION_KEY); return null }
      return storeTokens(await r.json())
    } catch (e) { return s }
  }
  async function ensureFresh() {
    var s = readSession(); if (!s || !s.access_token) return null
    if (s.expires_at - Date.now() > 120000) return s
    return refresh()
  }

  // Back from the e-mail link: Supabase puts the session (or an error) in the URL hash.
  var returned = { ok: false, error: '' }
  ;(function captureReturn() {
    var h = location.hash || ''
    var g = function (k) { var m = h.match(new RegExp('[#&]' + k + '=([^&]*)')); try { return m ? decodeURIComponent(m[1]) : '' } catch (e) { return m ? m[1] : '' } }
    var at = g('access_token'), er = g('error')
    if (!at && !er) return
    if (er) returned.error = g('error_code') || er
    else { storeTokens({ access_token: at, refresh_token: g('refresh_token'), expires_in: g('expires_in') }); returned.ok = true }
    try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])welcome=1&?/, '$1').replace(/[?&]$/, '') + '#download') } catch (e) {}
  })()

  /* ---------- signup ---------- */
  async function signup(email, marketing, website) {
    var res = await fetch('/api/labs-signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, source: SOURCE, lang: LANG, marketing: !!marketing, utm: UTM, redirect: REDIRECT, website: website || '' })
    })
    var j = null; try { j = await res.json() } catch (e) {}
    if (res.status === 400 || (j && j.error === 'invalid_email')) return 'invalid_email'
    if (j && j.emailed) return 'ok'
    if (j && j.error === 'email_failed') return 'email_failed'
    if (!res.ok) throw new Error('http_' + res.status)
    return 'email_failed'
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  /* ---------- form instances: every [data-form] box gets the same three panels from <template id="gc-tpl"> ---------- */
  var forms = []
  function buildForms() {
    var tpl = $('#gc-tpl'); if (!tpl) return
    $$('[data-form]').forEach(function (box) {
      if ($('[data-panel]', box)) return
      var n = box.getAttribute('data-form'), frag = tpl.content.cloneNode(true)
      $$('[id]', frag).forEach(function (el) { el.id = el.id + '-' + n })
      $$('label[for]', frag).forEach(function (el) { el.setAttribute('for', el.getAttribute('for') + '-' + n) })
      if (n === 'end') {
        $$('[data-i18n="ready.p"]', frag).forEach(function (el) { el.setAttribute('data-i18n', 'end.ready') })
        $$('[data-i18n="ready.next"]', frag).forEach(function (el) { el.setAttribute('data-i18n', 'end.next'); el.setAttribute('href', '#how') })
      }
      box.appendChild(frag)
    })
  }
  function Form(root) {
    var self = this
    this.root = root; this.name = root.getAttribute('data-form')
    this.email = ''; this.marketing = false; this.cool = 0; this.timer = null; this.state = 'form'; this.busy = false
    this.panels = {}; $$('[data-panel]', root).forEach(function (p) { self.panels[p.getAttribute('data-panel')] = p })
    this.input = $('input[type=email]', root); this.box = $('input[name=marketing]', root); this.hp = $('input[name=website]', root)
    this.btn = $('form button[type=submit]', root); this.btnLabel = $('span', this.btn)
    this.notice = $('[data-notice]', root)
    var f = $('form', root)
    f.addEventListener('submit', function (e) { e.preventDefault(); self.submit() })
    var rs = $('[data-resend]', root); if (rs) rs.addEventListener('click', function () { self.resend() })
    $$('[data-other]', root).forEach(function (b) { b.addEventListener('click', function () { self.other() }) })
    var dl = $('[data-download]', root); if (dl) dl.addEventListener('click', function () { self.download() })
    var ds = $('[data-desktop]', root); if (ds) ds.addEventListener('click', function () { D.documentElement.classList.add('force-desktop') })
    this.input.addEventListener('input', function () { self.msg('') })
  }
  Form.prototype.msg = function (text, ok, scope) {
    $$('[data-msg]', this.root).forEach(function (m) { m.textContent = ''; m.classList.remove('ok') })
    var p = this.panels[scope || this.state]; var m = p && $('[data-msg]', p)
    if (m && text) { m.textContent = text; if (ok) m.classList.add('ok') }
  }
  Form.prototype.show = function (name, focus) {
    var self = this; this.state = name
    Object.keys(this.panels).forEach(function (k) { self.panels[k].hidden = k !== name })
    if (focus) { var h = $('.gc-h', this.panels[name]); if (h) h.focus({ preventScroll: true }); else if (name === 'form') this.input.focus({ preventScroll: true }) }
  }
  Form.prototype.refreshText = function () {
    this.setLabel(this.busy ? 'f.sending' : null)
    this.tick(true)
    if (this.noticeKey) this.notice.textContent = t(this.noticeKey)
    if (this.state === 'ready') { var w = $('[data-who]', this.panels.ready); if (w) w.textContent = who() }
  }
  Form.prototype.setLabel = function (key) {
    var el = this.btnLabel
    if (key) el.textContent = t(key)
    else { var k = el.getAttribute('data-i18n'); el.textContent = t(k) }
  }
  Form.prototype.setNotice = function (key) {
    this.noticeKey = key
    if (!this.notice) return
    this.notice.hidden = !key; this.notice.textContent = key ? t(key) : ''
  }
  Form.prototype.submit = async function () {
    if (this.busy) return
    var email = this.input.value.trim()
    this.msg('')
    if (!EMAIL_RE.test(email)) { this.msg(t('err.invalid')); this.input.setAttribute('aria-invalid', 'true'); this.input.focus(); return }
    this.input.removeAttribute('aria-invalid')
    this.busy = true; this.btn.disabled = true; this.setLabel('f.sending')
    try {
      var r = await signup(email, this.box.checked, this.hp ? this.hp.value : '')
      if (r === 'ok') { this.email = email; this.marketing = this.box.checked; this.sent(); }
      else if (r === 'invalid_email') { this.msg(t('err.invalid')); this.input.setAttribute('aria-invalid', 'true'); this.input.focus() }
      else this.msg(t('err.limit'))
    } catch (e) { this.msg(t('err.net')) }
    this.busy = false; this.btn.disabled = false; this.setLabel(null)
  }
  Form.prototype.sent = function () {
    $('[data-to]', this.panels.sent).textContent = this.email
    this.setNotice(null); this.show('sent', true); this.startCooldown()
  }
  Form.prototype.startCooldown = function () {
    var self = this; this.cool = COOLDOWN; clearInterval(this.timer)
    this.tick()
    this.timer = setInterval(function () { self.cool--; self.tick(); if (self.cool <= 0) clearInterval(self.timer) }, 1000)
  }
  Form.prototype.tick = function () {
    var b = $('[data-resend]', this.root); if (!b) return
    b.disabled = this.cool > 0
    b.textContent = this.cool > 0 ? t('sent.resend.in', { n: this.cool }) : t('sent.resend')
  }
  Form.prototype.resend = async function () {
    if (this.cool > 0 || !this.email) return
    var b = $('[data-resend]', this.root); b.disabled = true; this.msg('')
    try {
      var r = await signup(this.email, this.marketing, this.hp ? this.hp.value : '')
      if (r === 'ok') this.msg(t('sent.resent'), true)
      else this.msg(t('err.limit'))
    } catch (e) { this.msg(t('err.net')) }
    this.startCooldown()
  }
  Form.prototype.other = function () {
    clearInterval(this.timer); this.cool = 0
    var self = this
    if (this.panels.ready && session()) {
      lsDel(SESSION_KEY); D.documentElement.classList.remove('is-in')
      forms.forEach(function (g) { if (g !== self && g.state === 'ready') { g.msg(''); g.show('form') } })
    }
    this.msg(''); this.setNotice(null); this.input.value = ''; this.show('form', true)
  }
  Form.prototype.ready = function (focus) {
    var w = $('[data-who]', this.panels.ready); if (w) w.textContent = who()
    this.setNotice(null); this.msg(''); this.show('ready', focus)
    D.documentElement.classList.add('is-in')
  }
  Form.prototype.expired = function (key) {
    var self = this
    D.documentElement.classList.remove('is-in'); clearInterval(this.timer)
    forms.forEach(function (g) { if (g !== self && g.state === 'ready') g.show('form') })
    this.show('form'); this.setNotice(key)
    var im = this.input; setTimeout(function () { try { im.focus({ preventScroll: true }) } catch (e) {} }, 0)
  }
  Form.prototype.download = async function () {
    var self = this, btn = $('[data-download]', this.root), lab = $('span', btn)
    if (btn.disabled) return
    btn.disabled = true; lab.textContent = t('ready.loading'); this.msg('')
    var get = function (s) { return fetch('/api/profile-name-search-download', { headers: { Authorization: 'Bearer ' + s.access_token } }) }
    try {
      var s = await ensureFresh()
      if (!s) { this.expired('exp.session'); return }
      var r = await get(s)
      if (r.status === 401) {
        s = await refresh()
        if (!s) { this.expired('exp.session'); return }
        r = await get(s)
        if (r.status === 401) { lsDel(SESSION_KEY); this.expired('exp.session'); return }
      }
      if (!r.ok) throw new Error('http_' + r.status)
      var blob = await r.blob()
      var cd = r.headers.get('Content-Disposition') || '', fm = /filename="?([A-Za-z0-9._-]+\.zip)"?/.exec(cd)
      var url = URL.createObjectURL(blob), a = D.createElement('a')
      a.href = url; a.download = fm ? fm[1] : 'Fluidz-Profile-Name-Search.zip'; a.style.display = 'none'
      D.body.appendChild(a); a.click(); a.remove()
      setTimeout(function () { URL.revokeObjectURL(url) }, 8000)
      this.msg(t(this.name === 'end' ? 'end.done' : 'ready.done'), true)
    } catch (e) { this.msg(t('ready.err')) }
    btn.disabled = false; lab.textContent = t('ready.btn')
  }

  /* ---------- demo (loads with the page, it sits next to the hero; static frame when motion is reduced) ---------- */
  var demoOn = false
  function setDemo() {
    var f = $('#demo-frame'); if (!f || !demoOn) return
    var reduced = mq('(prefers-reduced-motion: reduce)')
    var src = '/labs/demo/pns-demo.html?lang=' + LANG + (reduced ? '&t=7' : '')
    if (f.getAttribute('src') !== src) f.setAttribute('src', src)
  }
  function startDemo() { if (!$('#stage')) return; demoOn = true; setDemo() }

  /* ---------- feature animations: each iframe[data-anim] loads once it is near the viewport, in the current language ---------- */
  function animSrc(f) { return f.getAttribute('data-anim') + '?lang=' + LANG + (mq('(prefers-reduced-motion: reduce)') ? '&static' : '') }
  function setAnims() { $$('iframe[data-anim][data-on]').forEach(function (f) { var src = animSrc(f); if (f.getAttribute('src') !== src) f.setAttribute('src', src) }) }
  function startAnims() {
    var fs = $$('iframe[data-anim]'); if (!fs.length) return
    var on = function (f) { f.setAttribute('data-on', '1'); f.setAttribute('src', animSrc(f)) }
    if (!('IntersectionObserver' in window)) { fs.forEach(on); return }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { on(e.target); io.unobserve(e.target) } }) }, { rootMargin: '400px 0px' })
    fs.forEach(function (f) { io.observe(f) })
  }

  /* ---------- social row ---------- */
  function renderSocial() {
    var box = $('#follow-l'), n = 0; if (!box) return
    Object.keys(SOCIAL).forEach(function (k) {
      var u = String(SOCIAL[k] || '').trim()
      if (!/^https:\/\//i.test(u)) return
      var a = D.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener me'; a.textContent = SOCIAL_NAMES[k] || k
      box.appendChild(a); n++
    })
    $('#follow').hidden = n === 0
  }

  /* ---------- browser: the same zip runs in every Chromium browser; only the install steps change (address, names, notes) ---------- */
  var BRS = { chrome: { n: 'Chrome', u: 'chrome://extensions' }, brave: { n: 'Brave', u: 'brave://extensions' }, edge: { n: 'Edge', u: 'edge://extensions' }, arc: { n: 'Arc', u: 'chrome://extensions' }, opera: { n: 'Opera', u: 'opera://extensions' }, vivaldi: { n: 'Vivaldi', u: 'vivaldi://extensions' } }
  var BR_KEY = 'fluidz_br', BR = 'chrome', BR_OFF = false, PNS_VERSION = '3.0.2', PNS_SIZE = '120 KB'
  function detectBrowser() {
    var ua = navigator.userAgent || ''
    if (/Firefox\//.test(ua)) return 'firefox'
    if (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg/.test(ua)) return 'safari'
    if (navigator.brave) return 'brave'
    if (/Edg\//.test(ua)) return 'edge'
    if (/OPR\//.test(ua)) return 'opera'
    if (/Vivaldi/.test(ua)) return 'vivaldi'
    try { if (getComputedStyle(D.documentElement).getPropertyValue('--arc-palette-title')) return 'arc' } catch (e) {}
    return 'chrome'
  }
  function brInit() {
    var d = detectBrowser(), saved = ''
    try { saved = localStorage.getItem(BR_KEY) || '' } catch (e) {}
    BR_OFF = (d === 'firefox' || d === 'safari') && !/iPhone|iPad|iPod|Android/.test(navigator.userAgent || '') // phones get the mobile tabs instead
    BR = BRS[saved] ? saved : (BRS[d] ? d : 'chrome')
    $$('[data-br-pick]').forEach(function (b) { b.addEventListener('click', function () { BR = b.getAttribute('data-br-pick'); try { localStorage.setItem(BR_KEY, BR) } catch (e) {} brApply() }) })
    if (BR === 'chrome' && !saved && !BR_OFF) setTimeout(function () { if (detectBrowser() === 'arc') { BR = 'arc'; brApply() } }, 1500) // Arc adds its CSS variables after load
  }
  function brApply() {
    var b = BRS[BR] || BRS.chrome
    $$('[data-br][data-i18n]').forEach(function (el) { var s = t(el.getAttribute('data-i18n')); el.textContent = BR === 'chrome' ? s : s.replace(/Google Chrome|Chrome(?! Web Store)/g, b.n).replace(LANG === 'fr' ? /\b([Dd])e (Edge|Arc)\b/g : /$^/, '$1’$2') })
    $$('[data-br-url]').forEach(function (el) { el.textContent = b.u })
    $$('[data-i18n-html="upd.2"]').forEach(function (el) { el.innerHTML = el.innerHTML.replace(/[a-z]+:\/\/extensions/g, b.u) })
    $$('[data-br-only]').forEach(function (el) { el.hidden = el.getAttribute('data-br-only') !== BR })
    $$('[data-br-pick]').forEach(function (el) { el.setAttribute('aria-pressed', el.getAttribute('data-br-pick') === BR ? 'true' : 'false') })
    $$('[data-br-warn]').forEach(function (el) { el.hidden = !BR_OFF })
    $$('[data-br-meta]').forEach(function (el) { el.textContent = 'v' + PNS_VERSION + ' · ' + (EN['l.br.for'] = EN['l.br.for'] || 'for {b}', t('l.br.for', { b: b.n })) + ' · ' + PNS_SIZE })
  }

  /* ---------- install guide tabs: Computer / iPhone / Android (picked from the device, switchable) ---------- */
  function deviceTab() { var ua = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(ua) ? 'ios' : (/Android/.test(ua) ? 'and' : 'pc') }
  function initItabs() {
    var bar = $('.itabs'); if (!bar) return
    var ids = ['pc', 'ios', 'and'], bs = ids.map(function (k) { return $('#it-' + k) }), ps = ids.map(function (k) { return $('#ip-' + k) })
    function sel(i, focus) {
      bs.forEach(function (b, j) { var on = i === j; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; ps[j].hidden = !on })
      if (focus) bs[i].focus()
    }
    bs.forEach(function (b, i) {
      b.addEventListener('click', function () { sel(i) })
      b.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0); if (d) { e.preventDefault(); sel((i + d + 3) % 3, true) } })
    })
    $$('[data-itab]').forEach(function (a) { a.addEventListener('click', function () { var k = a.getAttribute('data-itab'); if (k === 'auto') k = deviceTab() === 'pc' ? 'ios' : deviceTab(); sel(ids.indexOf(k)) }) })
    sel(ids.indexOf(deviceTab()))
  }

  /* ---------- install guide: one step open; on a computer its screenshot sits in the viewer on the right ---------- */
  function initStepper() {
    var box = $('#stepper'); if (!box) return
    var sts = $$('[data-st]', box); if (!sts.length) return
    function open(i, focus) {
      if (i < 0 || i >= sts.length) return
      sts.forEach(function (li, j) { var on = j === i; li.classList.toggle('on', on); $('.st-b', li).setAttribute('aria-expanded', on ? 'true' : 'false') })
      if (focus) {
        try { $('.st-b', sts[i]).focus({ preventScroll: true }) } catch (e) {}
        if (mq('(max-width: 900px)')) sts[i].scrollIntoView({ block: 'start', behavior: mq('(prefers-reduced-motion: reduce)') ? 'auto' : 'smooth' })
      }
    }
    sts.forEach(function (li, i) {
      $('.st-b', li).addEventListener('click', function () { open(i) })
      var n = $('[data-st-next]', li); if (n) n.addEventListener('click', function () { open(i + 1, true) })
    })
    box.classList.add('js-st'); open(0)
    var imgs = $$('.st-img', box), pre = function () { imgs.forEach(function (im) { im.loading = 'eager' }) }
    if (!('IntersectionObserver' in window)) { pre(); return }
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting })) { pre(); io.disconnect() } }, { rootMargin: '600px 0px' })
    io.observe(box)
  }

  /* ---------- FAQ: Questions / Troubleshooting tabs, six questions first ---------- */
  function initFaq() {
    var tabs = $('.ftabs'), q = $('#faq-q'), ts = $('#help'), more = $('#faq-more'), mb = $('.faq-mbtn')
    if (more && mb) {
      more.hidden = true; mb.hidden = false
      mb.addEventListener('click', function () {
        more.hidden = false; mb.hidden = true; mb.setAttribute('aria-expanded', 'true')
        var s1 = $('summary', more); if (s1) try { s1.focus() } catch (e) {}
      })
    }
    if (!tabs || !q || !ts) return
    var bs = $$('[role="tab"]', tabs)
    function sel(i, focus) {
      bs.forEach(function (b, j) { var on = i === j; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1 })
      q.hidden = i !== 0; ts.hidden = i !== 1
      if (focus) bs[i].focus()
    }
    bs.forEach(function (b, i) {
      b.addEventListener('click', function () { sel(i) })
      b.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); sel(i === 0 ? 1 : 0, true) } })
    })
    tabs.hidden = false; var sec = $('#faq'); if (sec) sec.classList.add('js-tabs')
    sel(location.hash === '#help' ? 1 : 0)
  }

  /* ---------- init ---------- */
  buildForms()
  brInit()
  collectEN()
  $$('[data-form]').forEach(function (r) { forms.push(new Form(r)) })
  var hero = forms.filter(function (f) { return f.name === 'hero' })[0]
  applyLang()
  langInit()
  renderSocial(); startDemo(); startAnims(); initStepper(); initFaq(); initItabs()

  var cpy = $('#copy-ext')
  if (cpy) cpy.addEventListener('click', function () {
    var done = function () { cpy.textContent = t('how.copied'); setTimeout(function () { cpy.textContent = t('how.copy') }, 2200) }
    try { navigator.clipboard.writeText((BRS[BR] || BRS.chrome).u).then(done, done) } catch (e) { done() }
  })

  $$('[data-goto-form]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (hero && hero.state === 'form') setTimeout(function () { try { hero.input.focus({ preventScroll: true }) } catch (e) {} }, 450)
    })
  })

  function scrollToForm() { var el = $('#download'); if (el) setTimeout(function () { el.scrollIntoView({ block: 'center' }) }, 60) }
  // Signed-in state is shared: the hero form and the bottom form both show "You're in" with the download.
  var others = forms.filter(function (f) { return f !== hero && f.panels.ready })
  if (hero) {
    if (returned.error) { hero.expired('exp.t'); scrollToForm() }
    else if (session()) {
      hero.ready(false); others.forEach(function (f) { f.ready(false) })
      if (returned.ok) scrollToForm()
      else ensureFresh().then(function (s) { if (!s) hero.expired('exp.session') })
    }
  }
})()

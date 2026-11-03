/* Profile Name Search page: copy button, e-mail-unlocked download. Needs /labs/site.js (window.Labs). */
(function () {
  'use strict'
  var $ = function (s) { return document.getElementById(s) }
  var IS_MOBILE = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  var PAGE_URL = 'https://fluidz.app/profile-name-search'
  if (IS_MOBILE) document.documentElement.classList.add('is-mobile')
  Labs.en({
    'pns.dl.btn.mob': 'Email me the link for my computer', 'pns.copied': 'Copied ✓', 'pns.dl.resent': 'sent again ✓',
    'pns.dl.welcome.t': 'Welcome to Fluidz Labs 👋', 'pns.dl.welcome.p': 'Your account is ready and your download is starting.',
    'pns.dl.welcome.mob': 'Your account is ready. Open this page on your computer to install Profile Name Search.',
    'pns.share.title': 'Profile Name Search — install on my computer', 'pns.share.text': 'Install Profile Name Search on my computer:'
  })
  var t = Labs.t
  if (IS_MOBILE) { var b = $('dl-btn'); b.setAttribute('data-i18n', 'pns.dl.btn.mob'); b.textContent = t('pns.dl.btn.mob') }

  /* copy chrome://extensions */
  $('copy-ext').addEventListener('click', function (e) {
    var b = e.currentTarget
    var done = function () { b.textContent = t('pns.copied'); setTimeout(function () { b.textContent = t('pns.s2.copy') }, 2200) }
    if (navigator.clipboard) navigator.clipboard.writeText('chrome://extensions').then(done, done); else done()
  })

  /* download: e-mail unlocks it, a signed-in Fluidz ID unlocks it directly */
  var shown = ''
  function show(id) { shown = id; ;['dl-form', 'dl-sent', 'dl-ready'].forEach(function (x) { var el = $(x); if (el) el.style.display = x === id ? 'block' : 'none' }) }
  var lastEmail = ''
  function unlocked(auto) {
    show('dl-ready')
    $('dl-ok').textContent = auto ? t('pns.dl.welcome.t') : t('pns.dl.ready.t')
    $('dl-hint').textContent = auto ? (IS_MOBILE ? t('pns.dl.welcome.mob') : t('pns.dl.welcome.p')) : t('pns.dl.ready.p')
    if (auto && !IS_MOBILE) setTimeout(function () { $('dl-file').click() }, 700)
  }
  function refresh() { if (Labs.user()) { if (shown !== 'dl-ready') unlocked(false) } else if (shown === 'dl-ready') show('dl-form'); else if (!shown) show('dl-form') }
  show('dl-form'); refresh()
  document.addEventListener('labs:auth', function () { refresh() })
  if (Labs.returned.ok && Labs.user() && !sessionStorage.getItem('pns_dl_auto')) {
    try { sessionStorage.setItem('pns_dl_auto', '1') } catch (e) {}
    unlocked(true); $('download').scrollIntoView()
  }
  if (Labs.returned.error) $('download').scrollIntoView()

  $('dl-wf').addEventListener('submit', async function (e) {
    e.preventDefault()
    var el = $('dl-em'), email = el.value.trim(), btn = $('dl-btn'), m = $('dl-m')
    m.style.display = 'none'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { m.style.display = 'block'; m.textContent = t('m.err.invalid'); el.focus(); return }
    btn.disabled = true
    try {
      var r = await Labs.sendLink(email, { source: 'profile-hunter', hash: 'download', redirect: 'https://fluidz.app/profile-name-search?welcome=1#download', marketing: $('dl-opt').checked })
      lastEmail = email
      if (r.emailed) { $('dl-to').textContent = email; show('dl-sent') } else { unlocked(false) } // never block the visitor
    } catch (_) { m.style.display = 'block'; m.textContent = t('m.err.retry'); }
    btn.disabled = false
  })
  $('dl-resend').addEventListener('click', async function (e) {
    if (!lastEmail) return; e.target.disabled = true
    try { await Labs.sendLink(lastEmail, { source: 'profile-hunter', hash: 'download', redirect: 'https://fluidz.app/profile-name-search?welcome=1#download' }); e.target.textContent = t('pns.dl.resent') } catch (_) { e.target.disabled = false }
  })
  $('dl-code').addEventListener('click', function () { Labs.openSignIn({ source: 'profile-hunter', hash: 'download' }) })
  $('dl-share').addEventListener('click', async function () {
    if (navigator.share) { try { await navigator.share({ title: t('pns.share.title'), text: t('pns.share.text'), url: PAGE_URL }) } catch (_) {} }
    else location.href = 'mailto:?subject=' + encodeURIComponent(t('pns.share.title')) + '&body=' + encodeURIComponent(PAGE_URL)
  })
  $('dl-copy').addEventListener('click', function (e) {
    var b = e.currentTarget
    var done = function () { b.textContent = t('pns.copied') }
    if (navigator.clipboard) navigator.clipboard.writeText(PAGE_URL).then(done, function () { b.textContent = PAGE_URL }); else b.textContent = PAGE_URL
  })
})()

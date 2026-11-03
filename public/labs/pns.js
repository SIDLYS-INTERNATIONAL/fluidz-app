/* Profile Name Search page: copy button, e-mail-unlocked download, demo language. Needs /labs/site.js (window.Labs).
   Desktop: the email unlocks the .zip right away (a sign-in link is also emailed when sending works).
   Phone / tablet (html.is-mobile, set in <head>): extensions can't run there, so we email the link to open on the computer. */
(function () {
  'use strict'
  var $ = function (s) { return document.getElementById(s) }
  var PAGE_URL = 'https://fluidz.app/profile-name-search'
  var isMob = function () { return document.documentElement.classList.contains('is-mobile') }
  Labs.en({
    'pns.copied': 'Copied ✓', 'pns.dl.resent': 'sent again ✓',
    'pns.dl.welcome.t': 'Welcome to Fluidz Labs 👋', 'pns.dl.welcome.p': 'Your Fluidz ID is set up and your download is starting.',
    'pns.dl.welcome.mob': 'Your Fluidz ID is set up. Open this page on your computer to install Profile Name Search.',
    'pns.dl.ready.mt': 'Continue on your computer 💻',
    'pns.dl.ready.mp': 'Chrome extensions don’t run on phones: send this page to your computer (or copy the link) and download it there.',
    'pns.s1.btn.ok': 'Download profile-name-search.zip',
    'pns.share.title': 'Profile Name Search — install on my computer', 'pns.share.text': 'Install Profile Name Search on my computer:'
  })
  var t = Labs.t
  function setKey(el, k) { el.setAttribute('data-i18n', k); el.textContent = t(k) }

  /* copy chrome://extensions */
  $('copy-ext').addEventListener('click', function (e) {
    var b = e.currentTarget
    var done = function () { b.textContent = t('pns.copied'); setTimeout(function () { b.textContent = t('pns.s2.copy') }, 2200) }
    if (navigator.clipboard) navigator.clipboard.writeText('chrome://extensions').then(done, done); else done()
  })

  /* download: e-mail unlocks it, a signed-in Fluidz ID unlocks it directly */
  var shown = '', isUnlocked = false
  function show(id) { shown = id; ;['dl-form', 'dl-sent', 'dl-ready'].forEach(function (x) { var el = $(x); if (el) el.style.display = x === id ? 'block' : 'none' }) }
  var lastEmail = ''
  function setStep1(open) {
    isUnlocked = open
    var b = $('s1-get'), mob = isMob()
    setKey(b.querySelector('[data-i18n]'), open && !mob ? 'pns.s1.btn.ok' : 'pns.s1.btn')
    b.style.display = open && mob ? 'none' : '' // on a phone, once the email is in, there is nothing to download here
  }
  // o: { emailed: a sign-in link was also sent, failed: the email could not be sent }
  function unlocked(auto, o) {
    o = o || {}
    var mob = isMob()
    show('dl-ready')
    $('dl-ready').classList.toggle('emailed', !!o.emailed && !mob)
    $('dl-nomail').style.display = o.failed && mob ? 'block' : 'none'
    $('dl-mine').style.display = o.failed ? 'none' : '' // no Fluidz ID was created if the email could not be sent
    setKey($('dl-ok'), auto ? 'pns.dl.welcome.t' : (mob ? 'pns.dl.ready.mt' : 'pns.dl.ready.t'))
    setKey($('dl-hint'), auto ? (mob ? 'pns.dl.welcome.mob' : 'pns.dl.welcome.p') : (mob ? 'pns.dl.ready.mp' : 'pns.dl.ready.p'))
    setStep1(true)
    if (auto && !mob) setTimeout(function () { $('dl-file').click() }, 700)
  }
  function locked() { show('dl-form'); setStep1(false) }
  function refresh() { if (Labs.user()) { if (shown !== 'dl-ready') unlocked(false) } else if (shown === 'dl-ready' || !shown) locked() }
  locked(); refresh()
  document.addEventListener('labs:auth', function () { refresh() })
  if (Labs.returned.ok && Labs.user() && !sessionStorage.getItem('pns_dl_auto')) {
    try { sessionStorage.setItem('pns_dl_auto', '1') } catch (e) {}
    unlocked(true); $('download').scrollIntoView()
  }
  if (Labs.returned.error) $('download').scrollIntoView()

  /* hero button and install step 1: go to the email form (or download directly once unlocked, on a computer) */
  function toForm() { var el = $('dl-em'); if (shown === 'dl-form' && el) setTimeout(function () { try { el.focus({ preventScroll: true }) } catch (e) { el.focus() } }, 350) }
  $('hero-get').addEventListener('click', toForm)
  $('s1-get').addEventListener('click', function (e) {
    if (isUnlocked && !isMob()) { e.preventDefault(); $('dl-file').click() } else toForm()
  })

  $('dl-wf').addEventListener('submit', async function (e) {
    e.preventDefault()
    var el = $('dl-em'), email = el.value.trim(), btn = $('dl-btn'), m = $('dl-m')
    m.style.display = 'none'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { m.style.display = 'block'; m.textContent = t('m.err.invalid'); el.focus(); return }
    btn.disabled = true
    try {
      var r = await Labs.sendLink(email, { source: 'profile-hunter', hash: 'download', redirect: 'https://fluidz.app/profile-name-search?welcome=1#download', marketing: $('dl-opt').checked })
      lastEmail = email
      if (isMob() && r.emailed) { $('dl-to').textContent = email; show('dl-sent'); $('s1-get').style.display = 'none' }
      else unlocked(false, { emailed: !!r.emailed, failed: !r.emailed }) // never block the visitor
    } catch (_) { m.style.display = 'block'; m.textContent = t('m.err.retry') }
    btn.disabled = false
  })
  $('dl-resend').addEventListener('click', async function (e) {
    if (!lastEmail) return; e.target.disabled = true
    try { await Labs.sendLink(lastEmail, { source: 'profile-hunter', hash: 'download', redirect: 'https://fluidz.app/profile-name-search?welcome=1#download' }); e.target.textContent = t('pns.dl.resent') } catch (_) { e.target.disabled = false }
  })
  $('dl-share').addEventListener('click', async function () {
    if (navigator.share) { try { await navigator.share({ title: t('pns.share.title'), text: t('pns.share.text'), url: PAGE_URL }) } catch (_) {} }
    else location.href = 'mailto:?subject=' + encodeURIComponent(t('pns.share.title')) + '&body=' + encodeURIComponent(PAGE_URL)
  })
  $('dl-copy').addEventListener('click', function (e) {
    var b = e.currentTarget
    var done = function () { b.textContent = t('pns.copied') }
    if (navigator.clipboard) navigator.clipboard.writeText(PAGE_URL).then(done, function () { b.textContent = PAGE_URL }); else b.textContent = PAGE_URL
  })

  /* demo iframe follows the page language (it also reads ?lang= when opened on its own) */
  var frame = $('demo-frame')
  function demoLang(l) { if (frame) frame.src = '/labs/demo/pns-demo.html?lang=' + (l || 'en') }
  /* the welcome mock in install step 5 highlights the current language, like the extension does */
  function mockLang(l) { Array.prototype.forEach.call(document.querySelectorAll('.pw .lg b[data-l]'), function (el) { el.classList.toggle('on', el.getAttribute('data-l') === l) }) }
  demoLang(Labs.lang()); mockLang(Labs.lang())
  document.addEventListener('labs:lang', function (e) { demoLang(e.detail); mockLang(e.detail) })
})()

/* Fluidz Labs — picks the language before first paint (loaded synchronously in <head>). */
(function () {
  var ok = ['en', 'fr', 'es', 'pt', 'it', 'de'], l = 'en', fromUrl = ''
  try {
    fromUrl = new URLSearchParams(location.search).get('lang') || ''
    l = fromUrl || localStorage.getItem('fluidz_lang') || (navigator.language || 'en').slice(0, 2).toLowerCase()
  } catch (e) {}
  l = String(l).toLowerCase()
  if (ok.indexOf(l) < 0) l = 'en'
  window.LABS_LANG = l
  window.LABS_I18N = window.LABS_I18N || {}
  document.documentElement.lang = l
  try { if (fromUrl && ok.indexOf(fromUrl) >= 0) localStorage.setItem('fluidz_lang', l) } catch (e) {}
  if (l !== 'en') document.write('<script src="/labs/i18n/' + l + '.js?v=2"><\/script>')
})()

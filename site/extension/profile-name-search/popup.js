(function () {
  var KEY = 'pns_state_v1', lang = window.PNS_GUESS_LANG();
  function $(id) { return document.getElementById(id) }
  function T(k) { return window.PNS_T(lang, k) }
  function tab(cb) { chrome.tabs.query({ active: true, currentWindow: true }, function (t) { cb(t && t[0]) }) }
  function paint() {
    $('by').textContent = T('by'); $('side').textContent = T('popSide'); $('show').textContent = T('popShow'); $('reset').textContent = T('popReset'); $('off').textContent = T('popOff');
    $('home').textContent = T('popHome'); $('lgl').textContent = T('popLang'); $('more').textContent = T('popMore');
    var box = $('langs'); box.textContent = '';
    window.PNS_LANGS.forEach(function (l) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = l[1]; b.title = l[2]; if (l[0] === lang) b.className = 'on';
      b.onclick = function () {
        lang = l[0]; paint();
        chrome.storage.local.get([KEY], function (r) { var s = (r && r[KEY]) || {}; s.lang = lang; var o = {}; o[KEY] = s; chrome.storage.local.set(o) });
        tab(function (t) { if (t) chrome.tabs.sendMessage(t.id, { type: 'pns-lang', lang: lang }, function () { void chrome.runtime.lastError }) });
      };
      box.appendChild(b);
    });
  }
  $('side').onclick = function () { tab(function (t) { if (t && chrome.sidePanel) chrome.sidePanel.open({ tabId: t.id }).then(function () { window.close() }).catch(function () {}) }) };
  $('show').onclick = function () { tab(function (t) { if (t) chrome.tabs.sendMessage(t.id, { type: 'pns-show' }, function () { void chrome.runtime.lastError; window.close() }) }) };
  $('reset').onclick = function () { tab(function (t) { if (t) chrome.tabs.sendMessage(t.id, { type: 'pns-reset-pos' }, function () { void chrome.runtime.lastError; window.close() }) }) };
  $('off').onclick = function () { tab(function (t) { if (t) chrome.tabs.sendMessage(t.id, { type: 'pns-off' }, function () { void chrome.runtime.lastError; window.close() }) }) };
  chrome.storage.local.get([KEY], function (r) { var s = r && r[KEY]; if (s && s.lang) lang = s.lang; paint() });
})();

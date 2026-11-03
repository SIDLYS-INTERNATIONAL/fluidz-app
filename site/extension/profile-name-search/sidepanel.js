/* Profile Name Search — side panel. A view only: the grid is read and driven by the content script on web.grindr.com. */
(function () {
  var app = document.getElementById('app'), port = null, tabId = null, lang = window.PNS_GUESS_LANG(), retry = null;
  var ui = window.PNS_UI.mount(app, { mode: 'side', send: send });

  function send(a) {
    if (a.a === 'float') { closeSelf(); return }
    if (port) { try { port.postMessage({ type: 'act', a: a }) } catch (e) { /* closed */ } }
  }
  function closeSelf() {
    if (tabId != null && chrome.sidePanel) {
      chrome.sidePanel.setOptions({ tabId: tabId, enabled: false }).then(function () { setTimeout(function () { chrome.sidePanel.setOptions({ tabId: tabId, enabled: true }) }, 500) }).catch(function () {});
    }
    try { window.close() } catch (e) { /* ignore */ }
  }
  function showNo() { port = null; ui.update({ nogrid: true, lang: lang, groups: [], saved: [], matches: [] }); clearTimeout(retry); retry = setTimeout(connect, 2500) }
  function connect() {
    clearTimeout(retry);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs && tabs[0]; if (!tab) return showNo();
      tabId = tab.id;
      chrome.tabs.sendMessage(tab.id, { type: 'pns-ping' }, function () {
        if (chrome.runtime.lastError) return showNo();
        var p = chrome.tabs.connect(tab.id, { name: 'pns-side' }); port = p;
        p.onMessage.addListener(function (m) { if (m && m.type === 'state') { lang = m.state.lang || lang; ui.update(m.state) } });
        p.onDisconnect.addListener(function () { void chrome.runtime.lastError; if (port === p) showNo() });
      });
    });
  }
  chrome.tabs.onActivated.addListener(function () { if (port) { try { port.disconnect() } catch (e) { /* ignore */ } port = null } connect() });
  // Reconnect only when the link is really gone (a real page load drops it by itself). Cutting a healthy link on every "complete" event
  // made the floating panel flash over Grindr each time a profile opened.
  chrome.tabs.onUpdated.addListener(function (id, info) { if (id === tabId && info.status === 'complete' && !port) setTimeout(function () { if (!port) connect() }, 1500) });
  // Tell the page this is a deliberate close, so the floating panel can come back at once.
  window.addEventListener('pagehide', function () { if (port) { try { port.postMessage({ type: 'bye' }) } catch (e) { /* closed */ } } });
  chrome.storage.local.get(['pns_state_v1'], function (r) { var s = r && r.pns_state_v1; if (s && s.lang) lang = s.lang; connect() });
})();

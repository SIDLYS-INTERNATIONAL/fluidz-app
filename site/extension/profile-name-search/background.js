/* Profile Name Search — service worker. Only opens Chrome's side panel when you ask for it. */
chrome.runtime.onInstalled.addListener(function () {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(function () {});
});
chrome.runtime.onMessage.addListener(function (msg, sender, reply) {
  if (msg && msg.type === 'pns-open-side' && sender.tab && chrome.sidePanel) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).then(function () { reply({ ok: true }) }).catch(function () { reply({ ok: false }) });
    return true;
  }
});

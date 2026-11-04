/* Profile Name Search — service worker.
   - Opens Chrome's side panel when you ask for it.
   - Counts the Grindr Web tabs where the extension runs, so each panel can warn "Grindr Web is also open in another tab".
     Each tab's content script opens a port to this worker: no "tabs" permission and no host permission are needed for that.
   - Forwards the keyboard shortcuts (manifest "commands", editable in chrome://extensions/shortcuts) to the current tab.
   No network access, nothing stored here. */
chrome.runtime.onInstalled.addListener(function () {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(function () {});
});
chrome.runtime.onMessage.addListener(function (msg, sender, reply) {
  if (msg && msg.type === 'pns-open-side' && sender.tab && chrome.sidePanel) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).then(function () { reply({ ok: true }) }).catch(function () { reply({ ok: false }) });
    return true;
  }
});

var tabs = new Map(); // tab id -> port
function broadcast() { tabs.forEach(function (p) { try { p.postMessage({ type: 'tabs', n: tabs.size }) } catch (e) { /* closed */ } }) }
chrome.runtime.onConnect.addListener(function (p) {
  if (p.name !== 'pns-tab' || !p.sender || !p.sender.tab) return;
  var id = p.sender.tab.id;
  tabs.set(id, p); broadcast();
  p.onDisconnect.addListener(function () { if (tabs.get(id) === p) tabs.delete(id); broadcast() });
});

if (chrome.commands && chrome.commands.onCommand) chrome.commands.onCommand.addListener(function (cmd, tab) {
  function send(t) { if (t && t.id != null) chrome.tabs.sendMessage(t.id, { type: 'pns-cmd', cmd: cmd }, function () { void chrome.runtime.lastError }) }
  if (tab) send(tab); else chrome.tabs.query({ active: true, currentWindow: true }, function (t) { send(t && t[0]) });
});

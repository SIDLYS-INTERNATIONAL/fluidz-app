// Builds a single userscript (Safari "Userscripts" app on iPhone, Violentmonkey/Tampermonkey on Firefox Android)
// from the unchanged extension files: chrome.* is replaced by a small localStorage shim, the panel becomes a bottom sheet.
import { readFileSync, writeFileSync } from 'fs'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
// Run after `vite build`: writes dist/m/<token>/profile-name-search.user.js (unlisted beta link, not indexed).
const repo = join(dirname(fileURLToPath(import.meta.url)), '../..')
const TOKEN = '0b97765b'
const EXT = process.argv[2] || join(repo, 'site/extension/profile-name-search')
const OUT = process.argv[3] || join(repo, 'dist/m', TOKEN, 'profile-name-search.user.js')
mkdirSync(dirname(OUT), { recursive: true })
const man = JSON.parse(readFileSync(EXT + '/manifest.json', 'utf8'))
const files = man.content_scripts[0].js
let ui = readFileSync(EXT + '/ui.js', 'utf8')
const SIDE = "h('button', { type: 'button', title: side ? T('floatBack') : T('side')"
if (!ui.includes(SIDE)) throw new Error('side button not found')
ui = ui.replace(SIDE, 'PNS_MOBILE ? null : ' + SIDE)
const CLOSE = "side ? null : h('button', { type: 'button', title: T('close')"
if (!ui.includes(CLOSE)) throw new Error('close button not found')
ui = ui.replace(CLOSE, '(side || PNS_MOBILE) ? null : ' + CLOSE.slice('side ? null : '.length))
const css = readFileSync(EXT + '/content.css', 'utf8')
const MOBILE_DOC_CSS = `
#pns-host{top:auto!important;left:6px!important;right:6px!important;bottom:calc(6px + env(safe-area-inset-bottom))!important;width:auto!important;max-height:62vh!important;border-radius:18px!important;-webkit-overflow-scrolling:touch}
`
const MOBILE_UI_CSS = [
  '.root{width:100%!important;max-width:none!important;box-sizing:border-box}',
  '.dragbar,.grip{display:none!important}',
  '.bh{min-height:44px}',
  '.res .it{min-height:44px}',
  'input,textarea{font-size:16px!important}' // iOS zooms into fields under 16px
].join('\n')
const shim = `
var PNS_MOBILE = true;
var chrome = (function () {
  var P = 'pns_us:', changed = [];
  function rd(k) { try { var v = localStorage.getItem(P + k); return v == null ? undefined : JSON.parse(v) } catch (e) { return undefined } }
  function wr(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)) } catch (e) {} }
  function keys(k) { return k == null ? Object.keys(localStorage).filter(function (x) { return x.indexOf(P) === 0 }).map(function (x) { return x.slice(P.length) }) : (Array.isArray(k) ? k : (typeof k === 'string' ? [k] : Object.keys(k))) }
  var local = {
    get: function (k, cb) { var o = {}; keys(k).forEach(function (x) { var v = rd(x); if (v !== undefined) o[x] = v; else if (k && typeof k === 'object' && !Array.isArray(k) && k[x] !== undefined) o[x] = k[x] }); if (cb) setTimeout(function () { cb(o) }, 0); return Promise.resolve(o) },
    set: function (o, cb) { Object.keys(o).forEach(function (x) { wr(x, o[x]) }); if (cb) setTimeout(cb, 0); return Promise.resolve() },
    remove: function (k, cb) { keys(k).forEach(function (x) { try { localStorage.removeItem(P + x) } catch (e) {} }); if (cb) setTimeout(cb, 0); return Promise.resolve() },
    clear: function (cb) { keys(null).forEach(function (x) { localStorage.removeItem(P + x) }); if (cb) setTimeout(cb, 0); return Promise.resolve() }
  };
  function ev() { return { addListener: function () {}, removeListener: function () {} } }
  return {
    storage: { local: local, onChanged: { addListener: function (f) { changed.push(f) }, removeListener: function () {} } },
    runtime: { id: 'pns-mobile', lastError: null, onMessage: ev(), onConnect: ev(), onInstalled: ev(),
      sendMessage: function (m, cb) { if (cb) setTimeout(function () { cb({ ok: false, mobile: true }) }, 0); return Promise.resolve({ ok: false }) },
      connect: function (o) { return { name: o && o.name, postMessage: function () {}, disconnect: function () {}, onMessage: ev(), onDisconnect: ev() } } }
  };
})();
(function () { var s = document.createElement('style'); s.textContent = ${JSON.stringify(css + MOBILE_DOC_CSS)}; (document.head || document.documentElement).appendChild(s) })();
`
let body = ''
for (const f of files) {
  let src = f === 'ui.js' ? ui : readFileSync(EXT + '/' + f, 'utf8')
  if (f === 'ui.js') src = 'window.PNS_UI_CSS = (window.PNS_UI_CSS || "") + "\\n" + ' + JSON.stringify(MOBILE_UI_CSS) + ';\n' + src
  body += '\n/* ===== ' + f + ' ===== */\n' + src + '\n'
}
const header = `// ==UserScript==
// @name         Profile Name Search (mobile preview)
// @namespace    https://fluidz.app
// @version      ${man.version}-m1
// @description  Find a Grindr Web profile by name, keyword or emoji, on your phone. Nothing leaves your browser.
// @author       Fluidz Labs
// @match        https://web.grindr.com/*
// @downloadURL  https://fluidz.app/m/0b97765b/profile-name-search.user.js
// @updateURL    https://fluidz.app/m/0b97765b/profile-name-search.user.js
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==
`
writeFileSync(OUT, header + '(function () {\n' + shim + body + '\n})();\n')
console.log('ok', OUT, Buffer.byteLength(readFileSync(OUT)))

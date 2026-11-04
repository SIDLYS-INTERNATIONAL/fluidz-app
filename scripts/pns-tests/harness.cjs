/* Test harness for Profile Name Search (3.x). Loads the real extension scripts into a fake web.grindr.com-like page
   with a scrollable grid that loads more cards (simulated network latency) when scrolled near the bottom. Uses Playwright's
   virtual clock so minutes of scanning run in seconds. chrome.* is stubbed (storage in memory, background port).
   Based on the 2.x harness (/tmp/claude-0/work/fav/harness.js). */
const { chromium } = require('/opt/npm-tools/node_modules/playwright')
const fs = require('fs'), path = require('path')
const EXT = path.join(__dirname, '../../site/extension/profile-name-search/')
const read = f => fs.readFileSync(EXT + f, 'utf8')
const SCRIPTS = JSON.parse(read('manifest.json')).content_scripts[0].js

const PAGE = `<!doctype html><html><head><meta charset=utf-8><style>
body{margin:0;font:14px sans-serif;background:#111;color:#ddd}#app{display:flex}#chat{width:200px;height:600px;overflow:auto}
#scroller{height:600px;width:700px;overflow-y:auto}#grid{display:grid;grid-template-columns:repeat(3,1fr)}
[role=gridcell]{height:150px;box-sizing:border-box;border:1px solid #333;position:relative}
[role=gridcell] img{width:100%;height:100%;object-fit:cover;display:block}
[role=gridcell] p{position:absolute;left:8px;bottom:6px;margin:0;color:#fff;font-weight:700;text-shadow:0 1px 3px #000}
[role=gridcell] svg{position:absolute;right:8px;top:8px;width:16px;height:16px;fill:#f5c518}</style></head>
<body><div id=app><div id=chat></div><div id=scroller><div id=grid></div></div></div></body></html>`

// Stubs run before the page: chrome.* (storage in memory), counters, observer tracking, fake network grid.
const INIT = (cfg) => `(() => {
  window.__cfg = ${JSON.stringify(cfg)};
  const mem = window.__cfg.mem || { pns_v3: { schema: 3, settings: { welcomeDone: true, whatsNew: '3.0.0', lang: 'en' } } }; const listeners = [], changed = [];
  const clone = o => JSON.parse(JSON.stringify(o));
  window.chrome = {
    storage: { local: {
      get(k, cb) { const o = {}; (Array.isArray(k) ? k : [k]).forEach(x => { if (mem[x] !== undefined) o[x] = clone(mem[x]) }); cb(o) },
      set(o, cb) { Object.assign(mem, clone(o)); window.__writes = (window.__writes || 0) + 1; cb && cb() },
      remove(k, cb) { (Array.isArray(k) ? k : [k]).forEach(x => delete mem[x]); cb && cb() } },
      onChanged: { addListener(f) { changed.push(f) } } },
    runtime: { id: 'test', onMessage: { addListener(f) { listeners.push(f) } }, onConnect: { addListener(f) { window.__onConnect = f } }, sendMessage() {}, lastError: null,
      connect(o) { const ls = { m: [], d: [] }; const p = { name: o && o.name, postMessage() {}, onMessage: { addListener(f) { ls.m.push(f) } }, onDisconnect: { addListener(f) { ls.d.push(f) } } };
        window.__bg = { tabs: n => ls.m.forEach(f => f({ type: 'tabs', n })), cmd: c => ls.m.forEach(f => f({ type: 'cmd', cmd: c })) }; return p } } };
  window.__mem = mem; window.__send = (m) => { let r; listeners.forEach(f => f(m, {}, x => { r = x })); return r };
  window.__steps = 0; window.__loads = 0;
  const d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
  function setup() { const cfg = window.__cfg;
    const sc = document.getElementById('scroller'), grid = document.getElementById('grid'); let n = 0, loading = false;
    Object.defineProperty(sc, 'scrollTop', { configurable: true, get() { return d.get.call(this) }, set(v) { const before = d.get.call(this); d.set.call(this, v); if (d.get.call(this) !== before) window.__steps++ } });
    function add(k) { if (window.__crashed) return; for (let i = 0; i < k && n < cfg.total; i++, n++) {
      const c = document.createElement('div'); c.setAttribute('role', 'gridcell');
      const name = cfg.names ? cfg.names[n % cfg.names.length] + (cfg.names.length < cfg.total && n >= cfg.names.length ? ' ' + n : '') : (n === cfg.targetAt ? 'Target Jay' : 'user' + n);
      const img = 'https://x.test/' + (n + 100000).toString(16).padStart(24, 'a') + '.jpg';
      c.innerHTML = '<img alt="photo of user ' + name + '" src="' + img + '"><p>' + name + '</p>'; if (cfg.favs && cfg.favs.indexOf(n) >= 0) c.innerHTML += '<svg viewBox="0 0 16 16"><path d="M8,1L5.7,5.6L1,6.3L4.5,9.6L3.7,14.5L8,12.2L12.3,14.5L11.5,9.6L15,6.3L10.3,5.6z"/></svg>'; grid.appendChild(c) } }
    add(cfg.first);
    function maybe() {
      if (loading || n >= cfg.total) return;
      if (sc.scrollTop + sc.clientHeight * 2 >= sc.scrollHeight) { loading = true; window.__loads++; setTimeout(() => { add(cfg.batch); loading = false; maybe() }, cfg.latency) }
    }
    sc.addEventListener('scroll', maybe);
    const ds = Object.getOwnPropertyDescriptor(sc, 'scrollTop'); Object.defineProperty(sc, 'scrollTop', { get: ds.get, set(v) { ds.set.call(this, v); setTimeout(maybe, 50) } });
    window.__cells = () => document.querySelectorAll('[role=gridcell]').length;
    window.__crash = () => { window.__crashed = true; grid.innerHTML = '' };            // Grindr emptied the grid
    window.__restore = () => { window.__crashed = false; n = 0; add(cfg.first) };         // Grindr came back
  }
  document.addEventListener('DOMContentLoaded', setup);
})()`

// Neutral avatars: soft gradient discs (no photos of people).
const AV_COLORS = ['#6BA888', '#9080BA', '#E0887A', '#7A9CE0', '#C9A86B', '#5FA3A8']
function avatarSvg(i) {
  const a = AV_COLORS[i % AV_COLORS.length], b = AV_COLORS[(i + 2) % AV_COLORS.length]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><circle cx="60" cy="48" r="20" fill="rgba(255,255,255,.55)"/><path d="M22 120c4-26 20-38 38-38s34 12 38 38z" fill="rgba(255,255,255,.55)"/></svg>`
}

async function mk(browser, cfg, opts = {}) {
  const ctx = opts.ctx || await browser.newContext({ viewport: opts.viewport || { width: 1100, height: 700 }, deviceScaleFactor: opts.scale || 1, locale: opts.locale || 'en-US' })
  const page = await ctx.newPage()
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  const net = []; page.on('request', r => { const u = r.url(); if (!/^https:\/\/x\.test\/|^http:\/\/web\.grindr\.test\/|^data:|^blob:/.test(u)) net.push(u) })
  await page.clock.install({ time: opts.time || 1_762_250_000_000 })
  await page.route('https://x.test/**', r => { const m = r.request().url().match(/([0-9a-f]{24})/); const i = m ? parseInt(m[1].slice(-6), 16) : 0; r.fulfill({ contentType: 'image/svg+xml', body: avatarSvg(i) }) })
  await page.route('http://web.grindr.test/**', r => r.fulfill({ contentType: 'text/html', body: PAGE }))
  await page.addInitScript(INIT(cfg))
  await page.goto('http://web.grindr.test/')
  await page.addStyleTag({ content: read('content.css') })
  for (const f of SCRIPTS) await page.addScriptTag({ content: read(f) })
  await page.clock.runFor(2500); if (errs.length && !opts.quiet) console.log('INIT ERRS', errs)
  const run = ms => page.clock.runFor(ms)
  const $ = s => page.locator('#pns-host ' + s)
  const sh = fn => page.evaluate(`(() => { const r = document.getElementById('pns-host').shadowRoot; return (${fn})(r) })()`)
  return { page, ctx, errs, net, run, $, sh, mem: () => page.evaluate(() => JSON.parse(JSON.stringify(window.__mem))) }
}
let fails = 0, passes = 0
const check = (n, ok, i) => { if (ok) passes++; else fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && i !== undefined ? '  ' + (typeof i === 'string' ? i : JSON.stringify(i)) : '')) }
const done = () => { console.log(`\n${passes} passed, ${fails} failed`); return fails }
module.exports = { chromium, mk, check, done, EXT, read, avatarSvg, PAGE, INIT, counts: () => ({ passes, fails }) }

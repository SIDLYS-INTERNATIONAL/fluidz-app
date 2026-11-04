/* Real Chromium test: the zip built by the download API's code, unzipped, loaded with --load-extension (persistent profile,
   --headless=new). Checks the extension loads without errors, its pages open, the content script runs on web.grindr.com
   (served here by a fake grid), real chrome.storage, the background "other tab" warning and the keyboard commands.
   Usage: node scripts/pns-tests/chromium.test.cjs <unzipped profile-name-search dir> */
const { chromium } = require('/opt/npm-tools/node_modules/playwright')
const fs = require('fs'), os = require('os'), path = require('path')
const { check, done, PAGE, avatarSvg } = require('./harness.cjs')
const DIR = process.argv[2]
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'pns-chr-'))
const names = []; for (let i = 0; i < 60; i++) names.push(i % 7 === 2 ? 'DOM TOP ' + i : 'Guy ' + i)
const GRID = PAGE.replace('</body>', `<script>const g=document.getElementById('grid');${JSON.stringify(names)}.forEach((n,i)=>{const c=document.createElement('div');c.setAttribute('role','gridcell');c.innerHTML='<img alt="photo of user '+n+'" src="https://x.test/'+(i+100000).toString(16).padStart(24,'a')+'.jpg"><p>'+n+'</p>';g.appendChild(c)})</script></body>`)
;(async () => {
  const ctx = await chromium.launchPersistentContext(prof, { headless: false, viewport: { width: 1200, height: 760 }, args: ['--headless=new', '--disable-extensions-except=' + DIR, '--load-extension=' + DIR] })
  const errs = [], ext = []
  ctx.on('weberror', e => errs.push(String(e.error())))
  let sw = ctx.serviceWorkers()[0]; if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 20000 })
  const id = sw.url().split('/')[2]
  check('extension loads in Chromium (service worker running)', /^[a-p]{32}$/.test(id), id)
  await ctx.route('https://web.grindr.com/**', r => r.fulfill({ contentType: 'text/html', body: GRID }))
  await ctx.route('https://x.test/**', r => r.fulfill({ contentType: 'image/svg+xml', body: avatarSvg(1) }))
  ctx.on('request', r => { const u = r.url(); if (!/^https:\/\/(web\.grindr\.com|x\.test)\/|^chrome-extension:|^data:|^blob:/.test(u)) ext.push(u) })
  // extension pages
  const pop = await ctx.newPage(); const perr = []; pop.on('pageerror', e => perr.push(String(e))); pop.on('console', m => { if (m.type() === 'error') perr.push(m.text()) })
  await pop.goto('chrome-extension://' + id + '/popup.html'); await pop.waitForTimeout(500)
  const info = await pop.evaluate(() => new Promise(r => chrome.commands.getAll(c => r({ v: chrome.runtime.getManifest().version, perms: chrome.runtime.getManifest().permissions, cmds: c.map(x => x.name + '=' + x.shortcut), by: document.getElementById('by').textContent }))))
  check('manifest version 3.0.0, permissions unchanged (storage, sidePanel)', info.v === '3.0.0' && JSON.stringify(info.perms) === '["storage","sidePanel"]', info)
  check('4 keyboard commands registered', info.cmds.filter(c => /toggle-scan|focus-search|next-match|prev-match/.test(c)).length === 4, info.cmds)
  await pop.goto('chrome-extension://' + id + '/sidepanel.html'); await pop.waitForTimeout(800)
  check('popup + side panel pages open without errors', perr.length === 0 && await pop.evaluate(() => !!document.querySelector('#app .root')), perr)
  await pop.goto('chrome-extension://' + id + '/popup.html') // (a side panel page left open would link to the Grindr tab and hide the floating panel)
  // content script on Grindr Web
  const t1 = await ctx.newPage(); const terr = []; t1.on('pageerror', e => terr.push(String(e)))
  await t1.goto('https://web.grindr.com/'); await t1.waitForSelector('#pns-host', { timeout: 10000 }); await t1.waitForTimeout(800)
  check('floating panel injected on web.grindr.com (welcome on first run)', await t1.evaluate(() => !!document.getElementById('pns-host').shadowRoot.querySelector('.pw[data-step="1"]')))
  await t1.locator('#pns-host .pw .top button').click(); await t1.waitForTimeout(400)
  await t1.locator('#pns-host .field input').fill('dom + top'); await t1.locator('#pns-host .field input').press('Enter'); await t1.waitForTimeout(1200)
  const n = await t1.evaluate(() => document.querySelectorAll('[role=gridcell].gnf-match').length)
  check('search works on the real extension (outlines matches)', n === names.filter(x => /DOM TOP/.test(x)).length, n)
  const stored = await pop.evaluate(() => new Promise(r => chrome.storage.local.get(null, r)))
  check('data saved in real chrome.storage.local (pns_v3)', stored.pns_v3 && stored.pns_v3.schema === 3 && stored.pns_v3.q.groups.length === 1)
  // a second Grindr tab → both warn
  const t2 = await ctx.newPage(); await t2.goto('https://web.grindr.com/'); await t2.waitForSelector('#pns-host'); await t2.waitForTimeout(2000)
  const warn = p => p.evaluate(() => [...document.getElementById('pns-host').shadowRoot.querySelectorAll('.card h4')].some(h => /another tab/.test(h.textContent)))
  check('Grindr open in 2 tabs → warning in both (background port count, no tabs permission)', await warn(t1) && await warn(t2))
  await t2.close(); await t1.waitForTimeout(800)
  check('closing the other tab removes the warning', !(await warn(t1)))
  check('no page errors on Grindr page', terr.length === 0, terr)
  check('no network request from the extension', ext.length === 0, ext)
  check('no extension errors', errs.length === 0, errs)
  await ctx.close(); fs.rmSync(prof, { recursive: true, force: true })
  process.exit(done() ? 1 : 0)
})().catch(e => { console.error('ERR', e); process.exit(1) })

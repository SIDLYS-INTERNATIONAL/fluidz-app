/* The 2.2.x regression tests (fav-test.js and side-flash-test.js from /tmp/claude-0/work/fav), ported to the 3.0 panel.
   Same checks; only the selectors changed (results now live in block ③, the scan button in block ②, the field has a ✕).
   Run: node scripts/pns-tests/legacy.test.cjs */
const { chromium, mk, check, done } = require('./harness.cjs')
const NAMES = ['TOP 🚀', 'top guy', 'Kai', 'vers top', 'XXL', 'dom top', 'Rob', 'top dom', 'bear', 'Top here', 'Leo', 'xxl bear']
const FAVS = [0, 3, 7] // TOP 🚀, vers top, top dom are favorites
async function block(e, n) { const open = await e.$('section.blk.on').getAttribute('data-block').catch(() => null); if (open !== String(n)) { await e.$('.bh[data-b="' + n + '"]').click(); await e.run(300) } }
async function st(e) { await block(e, 3); return e.sh(r => ({ tabs: [...r.querySelectorAll('.ftabs button')].map(b => b.textContent.replace(/\s+/g, ' ').trim() + (b.getAttribute('aria-selected') === 'true' ? '*' : '')), res: [...r.querySelectorAll('.res .r .tx b')].map(b => b.textContent), empty: (r.querySelector('.res .empty') || {}).textContent || '', grid: [...document.querySelectorAll('[role=gridcell].gnf-match p')].map(p => p.textContent) })) }
async function tab(e, i) { await block(e, 3); await e.$('.ftabs button').nth(i).click(); await e.run(800) }
async function type(e, t) { await block(e, 1); const i = e.$('.field input'); await i.click(); await i.fill(t); await i.press('Enter'); await e.run(1000) }
async function clear(e) { await block(e, 1); if (await e.$('.fbtn.clr').count()) { await e.$('.fbtn.clr').click(); await e.run(400) } }
const shown = e => e.page.evaluate(() => { const h = document.getElementById('pns-host'); return !!h && h.style.display !== 'none' })
const CONNECT = () => { window.__ports = window.__ports || []; const ls = { m: [], d: [] }; const p = { name: 'pns-side', postMessage() { window.__got = (window.__got || 0) + 1 }, onMessage: { addListener(f) { ls.m.push(f) } }, onDisconnect: { addListener(f) { ls.d.push(f) } }, __ls: ls }; window.__ports.push(p); window.__onConnect(p); window.__cur = p }
const DROP = bye => { const p = window.__cur; if (bye) p.__ls.m.forEach(f => f({ type: 'bye' })); p.__ls.d.forEach(f => f()) }
const WATCH = () => { window.__flash = 0; const h = document.getElementById('pns-host'); window.__w = setInterval(() => { if (h.style.display !== 'none') window.__flash++ }, 50) }

;(async () => {
  const b = await chromium.launch()
  // ===== fav-test =====
  const e = await mk(b, { total: NAMES.length, first: NAMES.length, batch: 0, latency: 100, names: NAMES, favs: FAVS })
  let s = await st(e); check('3 tabs, All selected by default', s.tabs.length === 3 && /\*$/.test(s.tabs[0]), s.tabs)
  await type(e, 'top')
  s = await st(e); check('All: 6 "top" matches + counts 6/3/3', s.res.length === 6 && /All\s*6/.test(s.tabs[0]) && /Favorites\s*3/.test(s.tabs[1]) && /Not favorites\s*3/.test(s.tabs[2]), s)
  await tab(e, 2); s = await st(e); check('Not favorites: 3 non-fav matches, grid highlights only them', JSON.stringify(s.res.sort()) === JSON.stringify(['Top here', 'dom top', 'top guy']) && s.grid.length === 3 && !s.grid.includes('TOP 🚀'), s)
  await tab(e, 1); s = await st(e); check('Favorites: 3 fav matches', JSON.stringify(s.res.sort()) === JSON.stringify(['TOP 🚀', 'top dom', 'vers top'].sort()), s.res)
  check('tab saved in storage', (await e.mem()).pns_v3.settings.favFilter === 'fav')
  await clear(e); await type(e, 'top dom')
  await tab(e, 2); s = await st(e); check('Not favorites empty state when all matches are favorites', /already in your favorites/.test(s.empty), s.empty)
  await clear(e); await type(e, 'xxl')
  await tab(e, 1); s = await st(e); check('Favorites empty state when no match is a favorite', /None of these matches/.test(s.empty), s.empty)
  await clear(e); s = await st(e); check('no search + Favorites tab lists all favorites', s.res.length === 3, s)
  await tab(e, 0); s = await st(e); check('no search + All tab lists nothing (prompt)', s.res.length === 0 && /Type a search/.test(s.empty), s.empty)
  check('no page errors', e.errs.length === 0, e.errs)
  const e2 = await mk(b, { total: NAMES.length, first: NAMES.length, batch: 0, latency: 100, names: NAMES, favs: FAVS, mem: { pns_state_v1: { welcomeDone: true, lang: 'fr', favOnly: true } } })
  await e2.$('[data-whatsnew] .nx').click(); await e2.run(300)
  s = await st(e2); check('migration favOnly:true -> Favoris tab selected (FR labels)', /^Favoris.*\*$/.test(s.tabs[1]) && /^Tous/.test(s.tabs[0]) && /^Non favoris/.test(s.tabs[2]), s.tabs)
  const N2 = [], F2 = []; for (let i = 0; i < 400; i++) { N2.push(i % 9 === 0 ? 'top ' + i : 'user' + i); if (i % 18 === 0) F2.push(i) }
  const e3 = await mk(b, { total: 400, first: 30, batch: 60, latency: 300, names: N2, favs: F2 })
  await type(e3, 'top'); await tab(e3, 2); await block(e3, 2); await e3.$('.go').click(); let pauses = 0, prev = false
  for (let t = 0; t < 40; t++) {
    await e3.run(1000); const n = await e3.sh(r => !!r.querySelector('.card.note'))
    if (n && !prev) { pauses++; const nm = await e3.sh(r => r.querySelector('.card.note b').textContent); const num = +nm.match(/top (\d+)/)[1]; if (num % 18 === 0) check('pause never on a favorite in Not favorites tab', false, nm); await e3.$('.card.note .na button').nth(1).click() }
    prev = n
  }
  check('scan pauses on non-favorite matches (pause per match ON by default)', pauses > 0, pauses)
  const before = await e3.sh(r => !!r.querySelector('.card.note'))
  await tab(e3, 0); await e3.run(300); const after = await e3.sh(r => r.querySelector('.card.note') ? r.querySelector('.card.note b').textContent : '')
  // (the scan keeps running, so a pause on a NEW non-favorite match may legitimately appear; a favorite must not)
  check('switching tab does not pop a pause for previously hidden favorites', !after || before || +(after.match(/top (\d+)/) || [0, 1])[1] % 18 !== 0, after)
  check('no page errors (scan)', e3.errs.length === 0, e3.errs)
  await e.ctx.close(); await e2.ctx.close(); await e3.ctx.close()

  // ===== side-flash-test =====
  const SIX = ['a', 'b', 'c', 'd', 'e', 'f']
  let f = await mk(b, { total: 6, first: 6, batch: 0, latency: 100, names: SIX })
  check('floating panel visible when no side panel', await shown(f))
  await f.page.evaluate(CONNECT); await f.run(200)
  check('connect hides floating panel', !(await shown(f)))
  await f.page.evaluate(WATCH)
  await f.page.evaluate(DROP, false); await f.run(100)
  check('unannounced drop: still hidden right after', !(await shown(f)))
  await f.run(1500); await f.page.evaluate(CONNECT); await f.run(2000)
  const fl = await f.page.evaluate(() => window.__flash)
  check('no flash during drop + reconnect (1.5 s)', fl === 0, 'visible samples: ' + fl)
  check('hidden after reconnect', !(await shown(f)))
  await f.page.evaluate(DROP, true); await f.run(100)
  check('deliberate close shows floating panel at once', await shown(f))
  await f.page.evaluate(CONNECT); await f.run(200)
  await f.page.evaluate(DROP, false); await f.run(3500)
  check('still hidden at 3.5 s', !(await shown(f)))
  await f.run(1000)
  check('visible after the 4 s grace if the side panel never comes back', await shown(f))
  check('no page errors', f.errs.length === 0, f.errs)
  await f.ctx.close()
  const lastSide = { pns_v3: { schema: 3, settings: { welcomeDone: true, whatsNew: '3.0.0', lang: 'en', lastSide: true } } }
  f = await mk(b, { total: 6, first: 6, batch: 0, latency: 100, names: SIX, mem: lastSide })
  check('reload with lastSide: floating panel hidden during grace', !(await shown(f)))
  await f.page.evaluate(CONNECT); await f.run(2500)
  check('side panel reconnects: stays hidden', !(await shown(f)))
  await f.ctx.close()
  f = await mk(b, { total: 6, first: 6, batch: 0, latency: 100, names: SIX, mem: JSON.parse(JSON.stringify(lastSide)) })
  await f.run(4500)
  check('no side panel after reload: floating panel appears after grace', await shown(f))
  await f.ctx.close()
  const fails = done(); await b.close(); process.exit(fails ? 1 : 0)
})().catch(err => { console.error(err); process.exit(1) })

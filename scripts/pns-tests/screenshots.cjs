/* Screenshots of the 3.0.1 panel (EN + FR, 2x) for the site and the review. Fake grid with fictitious first names and
   neutral avatars (or photo tiles with PHOTOS=dir); test words TOP and XXL. Usage: node scripts/pns-tests/screenshots.cjs <out dir> */
const harness = require('./harness.cjs')
const { chromium, mk } = harness
// Photo tiles for the fake grid (PHOTOS=<dir with 01..32.webp>, Unsplash tiles curated for the site); tagged names get the
// tiles without a visible face. Without PHOTOS the harness's neutral avatars are used.
const PHOTOS = process.env.PHOTOS || ''
const NF = [2, 3, 5, 6, 8, 9, 11, 13, 14, 16, 17, 19, 21, 22, 24, 25, 27, 29, 30, 31]
const tile = i => { const tagged = /[A-Z]{2}|\u{1F525}|\u{1F680}|sub|top|vers|bttm/u.test(NAMES[i] || ''); const n = tagged ? NF[(i * 5) % NF.length] : ((i * 11) % 32) + 1; return PHOTOS + '/' + String(n).padStart(2, '0') + '.webp' }
if (PHOTOS) harness.photoFor = tile
const OUT = process.argv[2] || '/tmp/claude-0/work/fav/v3'
const FIRST = ['Leo', 'Sam', 'Noah', 'Eli', 'Theo', 'Max', 'Hugo', 'Adam', 'Lucas', 'Tom', 'Ben', 'Nico', 'Alex', 'Paul', 'Liam', 'Enzo', 'Karim', 'Mehdi', 'Yanis', 'Diego', 'Rafael', 'Kenji', 'Omar', 'Jules', 'Marco']
const TAGS = [' TOP', '', ' XXL', ' DOM', ' 🚀', ' sub', ' top', ' FIST', '', ' TOP XXL', ' vers DOM XL', ' bttm 🔥']
const NAMES = []; for (let i = 0; i < 5000; i++) NAMES.push(FIRST[i % FIRST.length] + TAGS[i % TAGS.length])
const FAVS = [0, 9, 21, 45, 60]
const T0 = 1_762_250_000_000
const img = i => 'https://x.test/' + (i + 100000).toString(16).padStart(24, 'a') + '.jpg', iid = i => 'img:' + (i + 100000).toString(16).padStart(24, 'a')
const res = (idx, t) => idx.map(i => ({ id: iid(i), name: NAMES[i], thumb: img(i), fav: FAVS.includes(i), t }))
const q = txt => ({ groups: [{ items: [{ name: '', terms: [{ t: txt, w: false }] }] }], exclude: [] })
const JOURNAL = { scans: [
  { id: 'j3', t0: T0 - 20 * 60e3, t1: T0 - 12 * 60e3, q: q('top'), qText: 'top', n: 642, end: 'end', res: res([0, 6, 9, 18, 24, 30, 42, 45, 54], T0 - 15 * 60e3) },
  { id: 'j2', t0: T0 - 26 * 3600e3, t1: T0 - 25.7 * 3600e3, q: q('top'), qText: 'top', n: 515, end: 'cap', res: res([0, 6, 9, 12, 18, 33, 45], T0 - 25.8 * 3600e3) },
  { id: 'j1', t0: T0 - 50 * 3600e3, t1: T0 - 49.8 * 3600e3, q: q('xxl'), qText: 'xxl', n: 230, end: 'stopped', res: res([2, 9, 14, 21], T0 - 49.9 * 3600e3) }] }
const SEARCHES = [
  { id: 's1', name: 'DOM + XXL', folder: 'f0', pinned: true, q: { groups: [{ items: [{ name: 'Role', terms: [{ t: 'top', w: false }, { t: 'dom', w: false }] }, { name: '', terms: [{ t: 'xxl', w: false }] }] }], exclude: [] }, created: T0 },
  { id: 's2', name: 'XXL', folder: 'f1', pinned: false, q: q('xxl'), created: T0 },
  { id: 's3', name: 'Rocket', folder: 'f1', pinned: false, q: q('🚀'), created: T0 },
  { id: 's4', name: 'Leo or Noah', folder: 'f0', pinned: false, q: { groups: [{ items: [{ name: '', terms: [{ t: 'leo' }, { t: 'noah' }] }] }], exclude: [] }, created: T0 }]
const FOLDERS = [{ id: 'f0', name: '', open: true }, { id: 'f1', name: 'Week-end', open: true }]
const mem = (lang, extra) => ({ pns_v3: Object.assign({ schema: 3, settings: { welcomeDone: true, whatsNew: '3.0.1', lang, pauseEach: true }, folders: FOLDERS, searches: SEARCHES }, extra || {}), pns_journal_v1: JOURNAL })
const grid = (lang, extra, m) => ({ total: 300, first: 45, batch: 45, latency: 300, names: NAMES, favs: FAVS, mem: m || mem(lang, extra) })

;(async () => {
  const b = await chromium.launch()
  const opts = { scale: 2, viewport: { width: 1100, height: 1500 }, quiet: true, time: T0 }
  for (const lang of ['en', 'fr']) {
    const shot = async (e, name) => { await e.run(400); await e.page.locator('#pns-host').screenshot({ path: `${OUT}/${lang}-${name}.png` }); console.log(lang, name) }
    const B = async (e, n) => { const open = await e.$('section.blk.on').getAttribute('data-block').catch(() => null); if (open !== String(n)) { await e.$('.bh[data-b="' + n + '"]').click(); await e.run(300) } }
    const search = async (e, t) => { await B(e, 1); if (await e.$('.fbtn.clr').count()) { await e.$('.fbtn.clr').click(); await e.run(200) } const i = e.$('.field input'); await i.click(); await i.fill(t); await i.press('Enter'); await e.run(900) }
    const adv = async (e, i) => { if (!(await e.$('.agrid').count())) { await e.$('.advh').click(); await e.run(200) } await e.$('.agrid button').nth(i).click(); await e.run(400) }
    let e
    // welcome step 1 + What's new
    e = await mk(b, grid(lang, null, { pns_v3: { schema: 3, settings: { lang } } }), opts); await shot(e, '01-welcome-step1-prepare-your-grid'); await e.ctx.close()
    e = await mk(b, grid(lang, null, { pns_state_v1: { groups: ['top'], saved: ['TOP, XXL', 'dom + fist', '🚀'], lang, welcomeDone: true } }), opts); await shot(e, '02-whats-new'); await e.ctx.close()
    // ① search field with chips: "top" OR "dom AND XXL" + the read-back line
    e = await mk(b, grid(lang), opts)
    await shot(e, '03-panel-3-blocks-start')
    await search(e, 'top, dom'); const fi = e.$('.field input'); await fi.type('+ XXL'); await fi.press('Enter'); await e.run(600); await fi.blur(); await shot(e, '04-block1-search-chips')
    // ③ results with tabs
    await search(e, 'top'); await B(e, 3); await shot(e, '06-block3-results-tabs')
    // grid with coral outline (page + panel)
    await e.page.screenshot({ path: `${OUT}/${lang}-16-grid-coral-outline.png`, clip: { x: 0, y: 0, width: 1100, height: 700 } }); console.log(lang, 'grid')
    // ② scanning
    await search(e, 'xxl'); await B(e, 2); await e.$('.go').click()
    for (let k = 0; k < 30 && !(await e.$('.card.note').count()); k++) await e.run(1000)
    if (await e.$('.card.note').count()) await shot(e, '07-pause-on-match')
    await e.page.evaluate(() => 0); await (async () => { const s = await e.mem(); return s })()
    await e.ctx.close()
    e = await mk(b, grid(lang, { settings: { welcomeDone: true, whatsNew: '3.0.1', lang, pauseEach: false } }), opts)
    await search(e, 'xxl'); await B(e, 2); await e.$('.go').click(); await e.run(9000); await shot(e, '05-block2-scan-running')
    // crash banner
    await e.page.evaluate(() => window.__crash()); await e.run(12000); await shot(e, '15-resume-banner-after-crash'); await e.ctx.close()
    // Advanced search, step 1 (groups of synonyms) and step 2 (combination, preview, precision warning with 3 required groups)
    e = await mk(b, grid(lang), opts)
    await search(e, 'Role: (top, dom, active) + Pos: (vers, vers top) + Size: (XXL, XL)'); await B(e, 1); await e.$('.act .top button').click(); await e.run(700)
    await shot(e, '08-advanced-search-step1-groups')
    await e.$('.foot .lk.p').click(); await e.run(700); await shot(e, '08b-advanced-search-step2-combine')
    await e.$('.ovh .back').click(); await e.run(200)
    await e.$('.links button').nth(1).click(); await e.run(400); await shot(e, '09-saved-searches-folders')
    await e.$('.it:has-text("XXL") .dots').first().click(); await e.run(300); await shot(e, '10-saved-search-menu-combine')
    await e.$('.ovh .back').click(); await e.run(200)
    await adv(e, 2); await shot(e, '11-scan-journal')
    await e.$('.ov .it .tx').first().click(); await e.run(400); await e.$('.ov .it button').first().click(); await e.run(1500); await shot(e, '12-journal-scan-find-again')
    await e.$('.ovh .back').click(); await e.run(200); await e.$('.ov .links button').first().click(); await e.run(300)
    await e.$('.ov select').first().selectOption('j2'); await e.run(200); await e.$('.ov .links button').last().click(); await e.run(500); await shot(e, '13-compare-two-scans')
    await e.$('.ovh .back').click(); await e.run(200); await e.$('.ovh .back').click(); await e.run(200)
    // "?" help
    await B(e, 1); await e.$('.fbtn.q').click(); await e.run(300); await shot(e, '14-help-syntax'); await e.$('.ovh .back').click(); await e.run(200)
    // settings, my data, self-test
    await e.$('.btns button').first().click(); await e.run(400); await shot(e, '17-settings-about')
    await e.$('.ov .links button').nth(2).click(); await e.run(400); await shot(e, '18-my-data')
    await e.$('.ovh .back').click(); await e.run(200); await e.$('.ov .links button').nth(3).click(); await e.run(200); await e.$('.ov .links button').first().click(); await e.run(500); await shot(e, '19-grid-self-test')
    await e.$('.ovh .back').click(); await e.run(200); await e.$('.ovh .back').click(); await e.run(200)
    // results with "new since last time", marks and discreet mode
    await search(e, 'top'); await B(e, 3); await e.$('.res .r .mk').nth(2).click(); await e.run(300); await shot(e, '20-results-new-since-last-time-marks')
    await e.ctx.close()
    // empty state
    e = await mk(b, grid(lang), opts); await search(e, 'zzzz'); await B(e, 3); await shot(e, '21-empty-state'); await e.ctx.close()
    // discreet mode
    e = await mk(b, grid(lang, { settings: { welcomeDone: true, whatsNew: '3.0.1', lang, discreet: true } }), opts); await search(e, 'top'); await B(e, 3); await shot(e, '22-discreet-mode'); await e.ctx.close()
    // other tab + time limit banners
    e = await mk(b, Object.assign(grid(lang, { settings: { welcomeDone: true, whatsNew: '3.0.1', lang, pauseEach: false, capMin: 10, chatNoteDismissed: true } }), { total: 5000 }), opts)
    await e.page.evaluate(() => window.__bg.tabs(2)); await search(e, 'top'); await B(e, 2); await e.$('.go').click(); await e.run(10.5 * 60000); await shot(e, '23-banners-other-tab-time-limit'); await e.ctx.close()
  }
  await b.close()
})().catch(err => { console.error(err); process.exit(1) })

/* Integration tests, part 2: journal, compare, already seen, find again, lock, time limit, crash, interrupted scan,
   other tab, keyboard shortcuts, migration + What's new, welcome step 1, backup export/import, languages, erase.
   Run: node scripts/pns-tests/robustness.test.cjs */
const { chromium, mk, check, done } = require('./harness.cjs')
const fs = require('fs'), os = require('os'), path = require('path')
const BIG = []; for (let i = 0; i < 400; i++) BIG.push(i % 10 === 3 ? 'top ' + i : i % 25 === 7 ? 'XXL ' + i : 'guy ' + i)
const big = { total: 400, first: 30, batch: 60, latency: 300, names: BIG, favs: [3, 53, 103] }
const v3 = (settings, extra) => ({ pns_v3: Object.assign({ schema: 3, settings: Object.assign({ welcomeDone: true, whatsNew: '3.0.0', lang: 'en' }, settings || {}) }, extra || {}) })

async function search(e, text) { const i = e.$('.field input'); if (!(await i.count())) { await e.$('.bh[data-b="1"]').click(); await e.run(200) } await i.click(); await i.fill(text); await i.press('Enter'); await e.run(800) }
async function block(e, n) { const open = await e.$('section.blk.on').getAttribute('data-block').catch(() => null); if (open !== String(n)) { await e.$('.bh[data-b="' + n + '"]').click(); await e.run(300) } }
async function adv(e, i) { if (!(await e.$('.agrid').count())) { await e.$('.advh').click(); await e.run(200) } await e.$('.agrid button').nth(i).click(); await e.run(300) }
async function settings(e) { await e.$('.btns button').first().click(); await e.run(300) }
const btnText = (e, t) => e.$('button:has-text("' + t + '")')
const cardTitles = e => e.sh(r => [...r.querySelectorAll('.card h4')].map(h => h.textContent))
const gridMatches = e => e.page.evaluate(() => [...document.querySelectorAll('[role=gridcell].gnf-match p')].map(p => p.textContent))
async function startScan(e) { await block(e, 2); await e.$('.go').click(); await e.run(200) }
async function stopScan(e) { await block(e, 2); if (/Pause/.test(await e.$('.go').textContent())) await e.$('.go').click(); await e.run(200) }

;(async () => {
  const b = await chromium.launch()
  let e, m

  // ---------- journal: continuous autosave, journal list, find again, compare, already seen ----------
  e = await mk(b, Object.assign({}, big, { mem: v3({ pauseEach: false }) }), { quiet: true })
  await search(e, 'top'); await startScan(e); await e.run(20000)
  m = await e.mem()
  const j1 = m.pns_journal_v1 && m.pns_journal_v1.scans[0]
  check('journal: scan saved while still running (continuous autosave)', j1 && j1.end === 'running' && j1.res.length >= 3 && j1.qText === 'top', j1 && [j1.end, j1.res.length])
  check('journal entry keeps thumbnail link/id, name, date, query, favorite state — not the image', j1 && j1.res.every(r => /^img:/.test(r.id) && /^https:/.test(r.thumb) && r.name && r.t > 0 && typeof r.fav === 'boolean') && j1.res.some(r => r.fav) && !JSON.stringify(j1).includes('base64'))
  const n1 = j1.res.length
  await e.run(15000); m = await e.mem()
  check('journal grows as results come in', m.pns_journal_v1.scans[0].res.length > n1, [n1, m.pns_journal_v1.scans[0].res.length])
  await stopScan(e); m = await e.mem()
  check('pause marks the journal entry "paused"', m.pns_journal_v1.scans[0].end === 'paused')
  const firstCount = m.pns_journal_v1.scans[0].res.length
  // second scan, other query
  await search(e, 'xxl'); await startScan(e); await e.run(8000); await stopScan(e)
  m = await e.mem()
  check('a new search starts a new journal entry', m.pns_journal_v1.scans.length === 2 && m.pns_journal_v1.scans[0].qText === 'xxl')
  // third scan, same "top" query again → new counter + hide seen
  await search(e, 'top')
  await block(e, 3)
  check('"N new since last time" counter shown', await e.sh(r => /new since last time/.test(r.querySelector('.row') ? r.querySelector('.row').textContent : '')))
  const before = await e.sh(r => r.querySelectorAll('.res .r').length)
  check('rows seen in an earlier scan are labelled', await e.sh(r => /seen before/.test(r.querySelector('.res').textContent)))
  await e.$('.tg[aria-label="Hide already seen"]').click(); await e.run(500)
  const after = await e.sh(r => r.querySelectorAll('.res .r').length)
  check('"Hide already seen" hides profiles of earlier scans', after < before, [before, after])
  await e.$('.tg[aria-label="Hide already seen"]').click(); await e.run(300)
  // journal overlay
  await adv(e, 2)
  check('journal list: date, query, counts, status', await e.sh(r => r.querySelectorAll('.ov[data-ov=journal] .it').length === 2 && /results/.test(r.querySelector('.ov .it small').textContent) && !!r.querySelector('.ov .it .badge')))
  await e.$('.ov .it .tx').last().click(); await e.run(400)
  const openCount = await e.sh(r => r.querySelector('.ov[data-ov=scan]') && /Find again/.test(r.querySelector('.ov .it').textContent) ? r.querySelectorAll('.ov .it').length : -1)
  check('open a scan: its saved list with "Find again"', openCount === firstCount, [openCount, firstCount])
  check('honest note: a lead, not a guarantee', await e.sh(r => /lead, not a guarantee/.test(r.querySelector('.ov').textContent)))
  await e.$('.ov .it button:has-text("Find again")').first().click(); await e.run(1500)
  check('find again by thumbnail id → found on the grid', await e.sh(r => /same photo id/.test((r.querySelector('.ov .card') || {}).textContent || '')))
  // compare
  await e.$('.ovh .back').click(); await e.run(200); await btnText(e, 'Compare two scans').click(); await e.run(300)
  await btnText(e, 'Compare').last().click(); await e.run(400)
  check('compare two scans: new / gone / both', await e.sh(r => r.querySelector('.ov[data-ov=compare]') && r.querySelectorAll('.ov .stats .stat').length === 3 && /New in B/.test(r.querySelector('.ov').textContent)))
  check('no page errors (journal)', e.errs.length === 0, e.errs)
  await e.ctx.close()

  // ---------- find again by name (thumbnail changed) and nothing found ----------
  const now = 1_762_250_000_000
  const jr = { scans: [{ id: 'jx', t0: now - 3600e3, t1: now - 3500e3, q: { groups: [{ items: [{ name: '', terms: [{ t: 'dom', w: false }] }] }], exclude: [] }, qText: 'dom', n: 50, end: 'stopped', res: [
    { id: 'img:ffffffffffffffffffffffff', name: 'DOM TOP', thumb: 'https://x.test/ffffffffffffffffffffffff.jpg', fav: false, t: now - 3550e3 },
    { id: 'img:eeeeeeeeeeeeeeeeeeeeeeee', name: 'Nobody', thumb: '', fav: true, t: now - 3550e3 }] }] }
  e = await mk(b, { total: 12, first: 12, batch: 0, latency: 100, names: ['DOM TOP', 'Bear', 'Leo'], mem: Object.assign(v3(), { pns_journal_v1: jr }) }, { quiet: true })
  await adv(e, 2); await e.$('.ov .it .tx').first().click(); await e.run(300)
  await e.$('.ov .it:has-text("DOM TOP") button').click(); await e.run(1500)
  check('find again by name: honest "check it is really him" + homonyms count', await e.sh(r => /Check it’s really him/.test(r.querySelector('.ov .card').textContent) && /other/.test(r.querySelector('.ov .card').textContent)))
  await e.$('.ov .card button').last().click(); await e.run(300)
  await e.$('.ov .it:has-text("Nobody") button').click(); await e.run(500)
  check('find again, nothing loaded: offers "Search this name"', await e.sh(r => /not in the part of the grid/.test(r.querySelector('.ov .card').textContent) && /Search this name/.test(r.querySelector('.ov .card').textContent)))
  await e.ctx.close()

  // ---------- journal lock (comfort lock) ----------
  e = await mk(b, Object.assign({}, big, { mem: Object.assign(v3(), { pns_journal_v1: jr }) }), { quiet: true })
  await settings(e)
  await e.$('.ov input[type=password]').first().fill('2468'); await btnText(e, 'Set PIN').click(); await e.run(300)
  m = await e.mem()
  check('PIN stored as salted hash only', m.pns_v3.lock && m.pns_v3.lock.hash.length === 64 && !JSON.stringify(m).includes('2468'))
  check('settings say it is a comfort lock, not encryption', await e.sh(r => /comfort lock, not encryption/.test(r.querySelector('.ov').textContent)))
  await e.$('.ovh .back').click(); await e.run(200); await adv(e, 2)
  check('locked journal asks for the PIN, shows nothing', await e.sh(r => r.querySelector('.ov input[type=password]') && !r.querySelector('.ov .it')))
  await e.$('.ov input[type=password]').fill('1111'); await e.$('.ov .frm button').click(); await e.run(300)
  check('wrong PIN refused', await e.sh(r => /Wrong PIN/.test(r.querySelector('.toast') ? r.querySelector('.toast').textContent : '') && !r.querySelector('.ov .it')))
  await e.$('.ov input[type=password]').fill('2468'); await e.$('.ov .frm button').click(); await e.run(400)
  check('right PIN unlocks the journal', await e.sh(r => r.querySelectorAll('.ov .it').length === 1))
  await btnText(e, 'Lock now').click(); await e.run(300); await adv(e, 2)
  check('"Lock now" locks again', await e.sh(r => !!r.querySelector('.ov input[type=password]')))
  await e.ctx.close()

  // ---------- scan time limit ----------
  e = await mk(b, Object.assign({}, big, { total: 4000, mem: v3({ pauseEach: false, capMin: 10 }) }), { quiet: true })
  await search(e, 'top'); await startScan(e)
  await e.run(9 * 60000)
  check('still scanning before the limit', await e.sh(r => /Pause/.test(r.querySelector('.go').textContent)))
  await e.run(2 * 60000 + 5000)
  check('stops by itself after the limit (10 min) with a clear message', (await cardTitles(e)).some(t => /time limit/.test(t)) && await e.sh(r => !/Pause/.test(r.querySelector('.go') ? r.querySelector('.go').textContent : 'x')))
  m = await e.mem(); check('journal entry marked "cap"', m.pns_journal_v1.scans[0].end === 'cap')
  const steps = await e.page.evaluate(() => window.__steps); await e.run(30000)
  check('no more scrolling after the limit', await e.page.evaluate(() => window.__steps) === steps)
  await e.$('.card:has-text("time limit") button.p').click(); await e.run(3000)
  check('Resume after the limit starts a new period', await e.page.evaluate(() => window.__steps) > steps && !(await cardTitles(e)).some(t => /time limit/.test(t)))
  await e.ctx.close()

  // ---------- crash detection ----------
  e = await mk(b, Object.assign({}, big, { mem: v3({ pauseEach: false }) }), { quiet: true })
  await search(e, 'top'); await startScan(e); await e.run(12000)
  await e.page.evaluate(() => window.__crash()); await e.run(12000)
  check('grid emptied during a scan → scan pauses with a "Resume" banner', (await cardTitles(e)).some(t => /stopped responding/.test(t)) && await e.sh(r => /Resume/.test(r.querySelector('.card.warn').textContent)))
  m = await e.mem(); check('list kept in the journal (marked interrupted)', m.pns_journal_v1.scans[0].end === 'crash' && m.pns_journal_v1.scans[0].res.length > 0)
  await e.page.evaluate(() => window.__restore()); await e.run(1500)
  const st0 = await e.page.evaluate(() => window.__steps)
  await e.$('.card.warn button.p').click(); await e.run(5000)
  check('Resume continues the same journal entry', await e.page.evaluate(() => window.__steps) > st0 && (await e.mem()).pns_journal_v1.scans.length === 1 && (await e.mem()).pns_journal_v1.scans[0].end === 'running')
  check('no page errors (crash)', e.errs.length === 0, e.errs)
  await e.ctx.close()

  // ---------- interrupted scan after a reload ----------
  const jrun = JSON.parse(JSON.stringify(jr)); jrun.scans[0].end = 'running'
  e = await mk(b, Object.assign({}, big, { mem: Object.assign(v3({ pauseEach: false }), { pns_journal_v1: jrun }) }), { quiet: true })
  check('reload after an unfinished scan → "Your last scan was interrupted"', (await cardTitles(e)).some(t => /interrupted/.test(t)))
  await e.$('.card:has-text("interrupted") button.p').click(); await e.run(4000)
  m = await e.mem()
  check('Resume restores its search and continues the same entry', m.pns_v3.q.groups[0].items[0].terms[0].t === 'dom' && m.pns_journal_v1.scans[0].id === 'jx' && m.pns_journal_v1.scans[0].end === 'running')
  await e.ctx.close()

  // ---------- other tab + keyboard shortcuts ----------
  e = await mk(b, Object.assign({}, big, { mem: v3({ pauseEach: false }) }), { quiet: true })
  await e.page.evaluate(() => window.__bg.tabs(2)); await e.run(300)
  check('warning when Grindr Web is open in another tab', (await cardTitles(e)).some(t => /another tab/.test(t)))
  await e.$('.card:has-text("another tab") button').click(); await e.run(300)
  check('warning can be dismissed', !(await cardTitles(e)).some(t => /another tab/.test(t)))
  await e.page.evaluate(() => window.__bg.tabs(1)); await e.run(200)
  await search(e, 'top')
  await e.page.evaluate(() => window.__bg.cmd('toggle-scan')); await e.run(4000)
  check('shortcut toggle-scan starts the scan', await e.page.evaluate(() => window.__steps) > 0)
  await e.page.evaluate(() => window.__bg.cmd('toggle-scan')); await e.run(300)
  const s1 = await e.page.evaluate(() => window.__steps); await e.run(4000)
  check('shortcut toggle-scan pauses it', await e.page.evaluate(() => window.__steps) === s1)
  await e.page.evaluate(() => window.__send({ type: 'pns-cmd', cmd: 'focus-search' })); await e.run(500)
  check('shortcut focus-search focuses the field', await e.sh(r => r.activeElement && r.activeElement.matches('.field input')))
  await block(e, 3); await e.page.evaluate(() => window.__bg.cmd('next-match')); await e.run(300); await e.page.evaluate(() => window.__bg.cmd('next-match')); await e.run(300)
  check('shortcut next-match moves through matches', await e.sh(r => /^2 \//.test(r.querySelector('.nav>span').textContent)))
  await e.ctx.close()

  // ---------- migration from 2.x + What's new + kept notice ----------
  const old = { pns_state_v1: { groups: ['top'], saved: ['TOP, XXL', 'dom + top', 'bear'], lang: 'en', welcomeDone: true, favFilter: 'non', speed: 'gentle', pauseEach: true } }
  e = await mk(b, Object.assign({}, big, { mem: old }), { quiet: true })
  check('2.x user sees "What’s new" once', await e.sh(r => !!r.querySelector('[data-whatsnew]')))
  check('"Your searches were kept" shown', await e.sh(r => /Your searches were kept/.test(r.querySelector('[data-whatsnew]').textContent) && /3 saved/.test(r.querySelector('[data-whatsnew]').textContent)))
  m = await e.mem()
  check('migration: 3 saved searches + tab + active search, 2.x key left untouched', m.pns_v3.searches.length === 3 && m.pns_v3.settings.favFilter === 'non' && m.pns_v3.q.groups.length === 1 && m.pns_state_v1.saved.length === 3)
  await btnText(e, 'Let’s go').click(); await e.run(300)
  check('after What’s new: the panel', await e.sh(r => r.querySelectorAll('section.blk').length === 3))
  check('migrated searches listed', /My searches \(3\)/.test(await e.sh(r => r.querySelector('.links') ? r.querySelector('.links').textContent : r.querySelector('.panel').textContent)))
  const memAfter = await e.mem(); await e.ctx.close()
  e = await mk(b, Object.assign({}, big, { mem: memAfter }), { quiet: true })
  check('What’s new is not shown a second time', await e.sh(r => !r.querySelector('[data-whatsnew]') && r.querySelectorAll('section.blk').length === 3))
  await e.ctx.close()

  // ---------- fresh install: welcome with step 1 "Get your grid ready" ----------
  e = await mk(b, Object.assign({}, big, { mem: {} }), { quiet: true })
  check('fresh install: welcome step 1 = "Get your grid ready" (Grindr filters first)', await e.sh(r => r.querySelector('.pw[data-step="1"]') && /Get your grid ready/.test(r.querySelector('.pw h4').textContent) && /filters/.test(r.querySelector('.pw p').textContent) && /STEP 1 OF 4/.test(r.querySelector('.pw .top').textContent)))
  for (let i = 0; i < 4; i++) { await e.$('.pw .nx').click(); await e.run(250) }
  m = await e.mem()
  check('4 steps, then the panel; no What’s new for a fresh install', await e.sh(r => r.querySelectorAll('section.blk').length === 3) && m.pns_v3.settings.welcomeDone && m.pns_v3.settings.whatsNew === '3.0.0')
  await e.ctx.close()

  // ---------- backup export / import ----------
  e = await mk(b, Object.assign({}, big, { mem: memAfter }), { quiet: true })
  await settings(e); await btnText(e, 'My data').click(); await e.run(300)
  const [dl] = await Promise.all([e.page.waitForEvent('download'), btnText(e, 'Export a backup').click()])
  const tmp = path.join(os.tmpdir(), 'pns-backup-test.json'); await dl.saveAs(tmp)
  const bk = JSON.parse(fs.readFileSync(tmp, 'utf8'))
  check('export: one file, format 1, searches + folders + marks + journal', bk.app === 'profile-name-search' && bk.format === 1 && bk.searches.length === 3 && Array.isArray(bk.folders) && Array.isArray(bk.journal) && /profile-name-search-backup-\d{4}-\d\d-\d\d\.json/.test(dl.suggestedFilename()))
  await e.$('.ov input[type=file]').setInputFiles(tmp); await e.run(500)
  check('import the same file: merged without duplicates', (await e.mem()).pns_v3.searches.length === 3 && await e.sh(r => /Imported: 0 searches/.test(r.querySelector('.toast').textContent)))
  bk.searches.push({ id: 'new1', name: 'From backup', folder: 'f0', q: { groups: [{ items: [{ name: '', terms: [{ t: 'leo' }] }] }], exclude: [] } }); fs.writeFileSync(tmp, JSON.stringify(bk))
  await e.$('.ov input[type=file]').setInputFiles(tmp); await e.run(500)
  check('import adds what is new', (await e.mem()).pns_v3.searches.length === 4)
  fs.writeFileSync(tmp, JSON.stringify(Object.assign({}, bk, { format: 2 }))); await e.$('.ov input[type=file]').setInputFiles(tmp); await e.run(500)
  check('import refuses a newer format cleanly', await e.sh(r => /newer version/.test(r.querySelector('.toast').textContent)) && (await e.mem()).pns_v3.searches.length === 4)
  fs.writeFileSync(tmp, 'not json'); await e.$('.ov input[type=file]').setInputFiles(tmp); await e.run(500)
  check('import refuses an invalid file cleanly', await e.sh(r => /not a valid backup/.test(r.querySelector('.toast').textContent)))
  // erase everything
  await btnText(e, 'Erase everything').click(); await e.run(200); await btnText(e, 'Yes, erase everything').click(); await e.run(500)
  m = await e.mem()
  check('erase everything: searches, journal and 2.x data removed', m.pns_v3.searches.length === 0 && !m.pns_journal_v1 && !m.pns_state_v1)
  check('no page errors (backup)', e.errs.length === 0, e.errs)
  await e.ctx.close()

  // ---------- languages ----------
  e = await mk(b, Object.assign({}, big, { mem: v3({ lang: 'fr' }) }), { quiet: true })
  check('French panel: Chercher / Scanner / Résultats, "par Fluidz"', await e.sh(r => [...r.querySelectorAll('.bh .t')].map(x => x.textContent).join() === 'Chercher,Scanner,Résultats' && /par Fluidz/.test(r.querySelector('.brand a').textContent)))
  await settings(e); await e.$('.ov .chips button').nth(5).click(); await e.run(300)
  check('switch language to German from ⚙', await e.sh(r => /Einstellungen/.test(r.querySelector('.ovh h3').textContent)))
  for (const l of ['es', 'pt', 'it']) { await e.$('.ov .chips button:has-text("' + l.toUpperCase() + '")').first().click(); await e.run(200) }
  check('Italian after cycling ES/PT/IT', await e.sh(r => /Impostazioni/.test(r.querySelector('.ovh h3').textContent)))
  check('no page errors (languages)', e.errs.length === 0, e.errs)
  await e.ctx.close()

  console.log('--- part 2 done'); const f = done(); await b.close(); process.exit(f ? 1 : 0)
})().catch(err => { console.error(err); process.exit(1) })

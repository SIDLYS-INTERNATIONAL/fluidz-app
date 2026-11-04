/* Experiment for the brief's point 16 (fixed extension ID through manifest "key").
   Question: an installation loaded WITHOUT a key, then reloaded from the same folder WITH a key — does the ID change,
   and are chrome.storage.local data (saved searches) lost?
   Real Chromium, persistent profile, --headless=new, --load-extension (the folder path stays the same, like a user who
   unzips the update over the same folder).
   Usage: node scripts/pns-tests/key-experiment.cjs <unzipped extension dir> <public key base64 file> */
const { chromium } = require('/opt/npm-tools/node_modules/playwright')
const fs = require('fs'), os = require('os'), path = require('path')
const SRC = process.argv[2], KEY = fs.readFileSync(process.argv[3], 'utf8').trim()
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pns-key-')), dir = path.join(work, 'profile-name-search'), prof = path.join(work, 'profile')
fs.cpSync(SRC, dir, { recursive: true })
async function launch() {
  const ctx = await chromium.launchPersistentContext(prof, { headless: false, args: ['--headless=new', '--disable-extensions-except=' + dir, '--load-extension=' + dir] })
  let sw = ctx.serviceWorkers()[0]; if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 20000 })
  const id = sw.url().split('/')[2]
  const page = await ctx.newPage(); await page.goto('chrome-extension://' + id + '/popup.html')
  return { ctx, id, page }
}
const read = p => p.evaluate(() => new Promise(r => chrome.storage.local.get(null, r)))
;(async () => {
  // 1) 2.2.1-like install without key: store a saved search
  let s = await launch()
  await s.page.evaluate(() => new Promise(r => chrome.storage.local.set({ pns_state_v1: { saved: ['TOP, XXL'], lang: 'fr', welcomeDone: true } }, r)))
  const id1 = s.id; await s.ctx.close()
  // 2) control: same folder, same profile, still no key
  s = await launch(); const id2 = s.id, data2 = await read(s.page); await s.ctx.close()
  // 3) same folder, same profile, manifest now has "key"
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); m.key = KEY; fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2))
  s = await launch(); const id3 = s.id, data3 = await read(s.page); await s.ctx.close()
  // 4) remove the key again: does the old ID (and its data) come back?
  delete m.key; fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2))
  s = await launch(); const id4 = s.id, data4 = await read(s.page); await s.ctx.close()
  const res = {
    idWithoutKey: id1, idControlRelaunch: id2, controlKeepsData: !!(data2.pns_state_v1 && data2.pns_state_v1.saved),
    idWithKey: id3, idChangedWithKey: id3 !== id1, dataVisibleWithKey: !!(data3.pns_state_v1 && data3.pns_state_v1.saved),
    idAfterRemovingKey: id4, oldDataBackWithoutKey: !!(data4.pns_state_v1 && data4.pns_state_v1.saved)
  }
  console.log(JSON.stringify(res, null, 2))
  fs.rmSync(work, { recursive: true, force: true })
})().catch(e => { console.error('ERR', e); process.exit(1) })

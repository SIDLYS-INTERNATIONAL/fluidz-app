/* Unit tests (Node, no browser) for the pure modules: criteria.js, journal.js, store.js.
   Run: node scripts/pns-tests/unit.test.cjs */
const path = require('path')
const EXT = path.join(__dirname, '../../site/extension/profile-name-search/')
// The extension files are plain browser scripts: run them as such (they register window-style globals).
const vm = require('vm'), fs = require('fs')
for (const f of ['criteria.js', 'journal.js', 'store.js']) vm.runInThisContext(fs.readFileSync(EXT + f, 'utf8'), { filename: f })
const C = globalThis.PNS_CRIT, JR = globalThis.PNS_JOURNAL, ST = globalThis.PNS_STORE
let fails = 0, passes = 0
const check = (n, ok, info) => { if (ok) passes++; else fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && info !== undefined ? '  ' + info : '')) }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ---- 2.x syntax must keep its meaning (cases from the 2.1.x regression test) ----
const NAMES = ['DOM TOP 🚀', 'dom bottom', 'top guy', 'Kai', 'rob', 'Kaiden dom top', '🚀 rocket', 'José', 'Jose B', 'Dom  Top', 'vers', 'Rob & Kai', 'domtop', 'top dom', 'c++ dev', 'Zoë, 25', 'bear']
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const ref = groups => NAMES.filter(n => groups.some(g => g.every(t => norm(n).includes(norm(t)))))
const OLD = [
  ['dom + top', [['dom', 'top']]], ['dom+top', [['dom', 'top']]], ['dom +top', [['dom', 'top']]], ['dom＋top', [['dom', 'top']]],
  ['kai, rob', [['kai'], ['rob']]], ['kai,rob', [['kai'], ['rob']]], ['kai，rob', [['kai'], ['rob']]], ['kai; rob', [['kai'], ['rob']]], ['kai | rob', [['kai'], ['rob']]], ['kai|rob', [['kai'], ['rob']]],
  ['dom + top, 🚀', [['dom', 'top'], ['🚀']]], ['dom + top + 🚀', [['dom', 'top', '🚀']]], ['"dom top"', [['dom top']]], ['"c++"', [['c++']]], ['"dom top" + 🚀', [['dom top', '🚀']]],
  ['JOSE', [['jose']]], ['josé', [['jose']]], ['zoe, kai', [['zoe'], ['kai']]], ['dom +', [['dom']]], ['dom + ', [['dom']]], ['kai,', [['kai']]],
]
for (const [text, groups] of OLD) {
  const q = C.parse(text).q, c = C.compile(q)
  const got = NAMES.filter(n => c.test(n)), want = ref(groups)
  check(`2.x syntax "${text}"`, eq(got, want) && want.length > 0, JSON.stringify(got) + ' vs ' + JSON.stringify(want))
}
check('"dom +" is pending', C.parse('dom +').pending && !C.parse('dom + top').pending)
check('old chips joined ", " (2.x saved search) keep OR/AND', eq(NAMES.filter(C.compile(C.parse(['dom + top', 'kai'].join(', ')).q).test), ref([['dom', 'top'], ['kai']])))

// ---- new syntax ----
const P = ['Kai TOP', 'Kaiden XXL top', 'Kai XXL', 'Rob TOP', 'kei top xxl', 'laptop Kai', 'Leo']
const m = (txt, list = P) => list.filter(C.compile(C.parse(txt).q).test)
check('criteria (kai, kaiden) + (top)', eq(m('(kai, kaiden) + (top)'), ['Kai TOP', 'Kaiden XXL top', 'laptop Kai']))
check('three criteria with synonyms', eq(m('(kai, kei) + (top) + (xxl)'), ['Kaiden XXL top', 'kei top xxl']))
check('exclusion: TOP -XXL', eq(m('TOP -XXL'), ['Kai TOP', 'Rob TOP', 'laptop Kai']))
check('exclusion inside criteria: (kai) + top -xxl', eq(m('(kai) + top -xxl'), ['Kai TOP', 'laptop Kai']))
check('exclusion only: -kai', eq(m('-kai'), ['Rob TOP', 'kei top xxl', 'Leo']))
check('whole word: =top skips "laptop"', eq(m('kai + =top'), ['Kai TOP', 'Kaiden XXL top']))
check('whole word works with emoji neighbour', C.hasWord(norm('🚀top🚀'), 'top') && !C.hasWord('laptops', 'top'))
check('named criterion: Size: (XL, XXL)', (() => { const q = C.parse('Size: (XL, XXL) + top').q; return q.groups[0].items[0].name === 'Size' && q.groups[0].items[0].terms.length === 2 && q.groups[0].items[1].terms[0].t === 'top' })())
check('unclosed parenthesis while typing still works', eq(m('(kai, kaiden'), ['Kai TOP', 'Kaiden XXL top', 'Kai XXL', 'laptop Kai']))
check('hyphenated names are not exclusions', eq(C.parse('jean-luc').q.groups[0].items[0].terms[0].t, 'jean-luc') && C.parse('jean-luc').q.exclude.length === 0)
check('quoted minus is literal', C.parse('"TOP -XXL"').q.exclude.length === 0)
check('"kai, rob" becomes ONE criterion with 2 synonyms', C.parse('kai, rob').q.groups.length === 1 && C.parse('kai, rob').q.groups[0].items[0].terms.length === 2)
check('empty text -> empty query', C.isEmpty(C.parse('  ').q) && !C.compile(C.parse('').q).active)

// ---- serialize round trip ----
const RT = ['kai, rob', 'dom + top, 🚀', '(kai, kaiden) + TOP', 'Size: (XL, XXL) + =top', 'TOP -XXL', '"c++" + "a, b"', '-kai -rob', '(kai, kei) + (top) + (xxl)']
for (const t of RT) { const q1 = C.parse(t).q, s = C.serialize(q1), q2 = C.parse(s).q; check(`round trip "${t}" -> "${s}"`, C.sig(q1) === C.sig(q2), JSON.stringify([q1, q2])) }

// ---- saved searches reused as blocks ----
const saved = { a: { q: C.parse('(kai, kaiden) + top').q }, b: { q: C.parse('xxl').q }, loop: { q: { groups: [{ items: [{ ref: 'loop2' }] }], exclude: [] } }, loop2: { q: { groups: [{ items: [{ ref: 'loop' }] }], exclude: [] } } }
const get = id => saved[id]
const comb = (q, list = P) => list.filter(C.compile(q, get).test)
check('saved A AND saved B', eq(comb({ groups: [{ items: [{ ref: 'a' }, { ref: 'b' }] }] }), ['Kaiden XXL top']))
check('saved A OR saved B', eq(comb({ groups: [{ items: [{ ref: 'a' }] }, { items: [{ ref: 'b' }] }] }), ['Kai TOP', 'Kaiden XXL top', 'Kai XXL', 'kei top xxl', 'laptop Kai']))
check('@name syntax resolves a saved search', (() => { const q = C.parse('@"Plan A" + xxl', n => n === 'Plan A' ? 'a' : null).q; return comb(q).join() === 'Kaiden XXL top' })())
check('reference loop does not hang', comb({ groups: [{ items: [{ ref: 'loop' }] }] }).length === 0)
check('missing reference reported', C.compile({ groups: [{ items: [{ ref: 'zzz' }, { name: '', terms: [{ t: 'kai' }] }] }] }, get).missing === 1)
check('serialize writes @name with current name', C.serialize({ groups: [{ items: [{ ref: 'a' }, { name: '', terms: [{ t: 'top' }] }] }] }, id => id === 'a' ? 'Plan A' : '') === '@"Plan A" + top')
check('summary lines: one per criterion + exclusions', (() => { const l = C.summary(C.parse('Who: (kai, kei) + top -xxl').q); return l.length === 3 && l[0].label === 'Who' && l[2].kind === 'x' })())

// ---- Advanced search mapping (ui-editor.js, pure part) ----
{
  vm.runInThisContext(fs.readFileSync(EXT + 'ui-editor.js', 'utf8'), { filename: 'ui-editor.js' })
  const EN = { opAnd: 'AND', opOr: 'OR', edOr: 'or', without: 'Without' }
  const ED = globalThis.PNS_UI_EDITOR.create({ T: k => EN[k] || k, nameOf: id => id === 's1' ? 'Big' : '', V: {}, S: () => ({}), h: () => null, ic: () => null, btn: () => null, send() {}, redraw() {}, stopKeys: x => x, ovWrap: x => x })
  const rt = txt => { const ed = ED.fromQuery(C.parse(txt).q); return { ed, q: ED.toQuery(ed), w: ED.words(ed, ED.toQuery(ed)) } }
  let r = rt('Role: (top, dom, active) + Size: (XXL, XL) -sub')
  check('editor: AND query -> 2 groups, both required, same query back', r.ed.items.length === 2 && Object.values(r.ed.req).every(Boolean) && !r.ed.alts && C.sig(r.q) === C.sig(C.parse('Role: (top, dom, active) + Size: (XXL, XL) -sub').q))
  check('editor: words "Role: top or dom or active, AND Size: XXL or XL, without sub"', r.w === 'Role: top or dom or active, AND Size: XXL or XL, without sub', r.w)
  r = rt('top, dom')
  check('editor: "top, dom" is ONE group of synonyms', r.ed.items.length === 1 && r.ed.items[0].terms.length === 2 && r.w === 'top or dom')
  r = rt('xxl + top, xxl + dom')
  check('editor: common item required, others as alternatives (xxl AND (top OR dom))', r.ed.items.length === 3 && r.ed.req[r.ed.items[0].k] && !r.ed.req[r.ed.items[1].k] && !r.ed.alts && r.w === 'xxl, AND (top, OR dom)' && C.sig(r.q) === C.sig(C.parse('xxl + top, xxl + dom').q), r.w)
  r = rt('dom + top, bear + xxl')
  check('editor: a combination that does not fit keeps its own alternatives (lossless)', r.ed.alts && r.ed.alts.length === 2 && C.sig(r.q) === C.sig(C.parse('dom + top, bear + xxl').q) && r.w === '(dom, AND top), OR (bear, AND xxl)', r.w)
  r.ed.req[r.ed.items[0].k] = true; r.ed.alts = null; r.ed.items.forEach((it, i) => { if (i) r.ed.req[it.k] = false })
  check('editor: ticking a box rebuilds: dom AND (top OR bear OR xxl)', C.sig(ED.toQuery(r.ed)) === C.sig(C.parse('dom + top, dom + bear, dom + xxl').q))
  const ref = ED.fromQuery({ groups: [{ items: [{ ref: 's1', name: 'Big' }, { name: '', terms: [{ t: 'top' }] }] }], exclude: [] })
  check('editor: saved search block is a group; words use its current name', ref.items[0].ref === 's1' && ED.words(ref, ED.toQuery(ref)) === 'Big, AND top')
  check('editor: empty query opens with one empty group, builds an empty query', ED.fromQuery(null).items.length === 1 && C.isEmpty(ED.toQuery(ED.fromQuery(null))))
}

// ---- journal ----
const now = Date.UTC(2026, 10, 4)
let j = JR.empty()
for (let i = 0; i < 25; i++) { const s = JR.newScan('s' + i, C.parse('top').q, 'top', now - (25 - i) * 60000); JR.addResults(s, [{ id: 'img:' + i, name: 'n' + i, thumb: 'https://x/' + i + '.jpg' }], s.t0); j.scans.push(s) }
j.scans.push(Object.assign(JR.newScan('old', C.parse('x').q, 'x', now - 31 * 864e5), {}))
j = JR.prune(j, now)
check('journal keeps 20 newest scans, drops > 30 days', j.scans.length === 20 && j.scans[0].id === 's24' && !JR.find(j, 'old'))
const sc = JR.newScan('z', C.parse('top').q, 'top', now)
check('addResults dedupes and counts new', JR.addResults(sc, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'a', name: 'A2', favorite: true }], now) === 2 && sc.res.length === 2 && sc.res[0].name === 'A2' && sc.res[0].fav)
check('thumb kept as https link only', (() => { const s = JR.newScan('t', {}, '', now); JR.addResults(s, [{ id: 'x', name: 'X', thumb: 'data:image/png;base64,AAAA' }], now); return s.res[0].thumb === '' })())
const A = { res: [{ id: 'img:1', name: 'Kai' }, { id: 'img:2', name: 'Rob' }, { id: 'img:3', name: 'Leo' }] }, B = { res: [{ id: 'img:1', name: 'Kai' }, { id: 'img:9', name: 'Rob' }, { id: 'img:4', name: 'Sam' }] }
const cmp = JR.compare(A, B)
check('compare: new / gone / both (id first, then name)', cmp.added.map(r => r.name).join() === 'Sam' && cmp.gone.map(r => r.name).join() === 'Leo' && cmp.both === 2)
check('seenIds excludes the current scan', (() => { const jj = { scans: [{ id: 'a', res: [{ id: '1' }] }, { id: 'b', res: [{ id: '2' }] }] }; const s = JR.seenIds(jj, 'b'); return s.has('1') && !s.has('2') })())
check('findAgain: by id first', JR.findAgain({ id: 'img:2', name: 'X' }, [{ id: 'img:1', name: 'X' }, { id: 'img:2', name: 'Y' }]).how === 'id')
check('findAgain: by name as a lead, counts homonyms', (() => { const r = JR.findAgain({ id: 'img:7', name: 'José' }, [{ id: 'img:1', name: 'jose' }, { id: 'img:5', name: 'JOSE' }]); return r.how === 'name' && r.others === 1 })())
check('findAgain: nothing', JR.findAgain({ id: 'img:7', name: 'Z' }, []).how === null)

// ---- migration ----
const v1 = { groups: ['dom + top', 'kai'], saved: ['TOP, XXL', 'kai + XXL', 'rob'], lang: 'fr', welcomeDone: true, speed: 'fast', pauseEach: false, favFilter: 'non', pos: { left: '10px', top: '20px' }, lastSide: true }
const mg = ST.migrate(null, v1, null, now)
check('migration 2.x: 3 saved searches kept, in default folder', mg.migrated && mg.state.searches.length === 3 && mg.state.searches.every(s => s.folder === 'f0'))
check('migration 2.x: saved search meaning unchanged', eq(NAMES.filter(C.compile(mg.state.searches[1].q).test), ref([['kai', 'xxl']])) && eq(['TOP x', 'XXL y', 'z'].filter(C.compile(mg.state.searches[0].q).test), ['TOP x', 'XXL y']))
check('migration 2.x: active chips become active search', eq(NAMES.filter(C.compile(mg.state.q).test), ref([['dom', 'top'], ['kai']])))
check('migration 2.x: settings kept (lang, speed, pause, tab, position, side)', mg.state.settings.lang === 'fr' && mg.state.settings.speed === 'fast' && mg.state.settings.pauseEach === false && mg.state.settings.favFilter === 'non' && mg.state.settings.pos.left === '10px' && mg.state.settings.lastSide)
check('migration 2.x: "kept" notice + What\'s new pending', mg.state.notice === 'kept' && mg.state.settings.whatsNew === '' && mg.state.settings.welcomeDone)
check('migration 2.x: favOnly:true -> Favorites tab', ST.migrate(null, { favOnly: true, welcomeDone: true }, null, now).state.settings.favFilter === 'fav')
check('migration 2.x: pause default stays ON', ST.migrate(null, { welcomeDone: true }, null, now).state.settings.pauseEach === true)
check('migration Profile Hunter', (() => { const r = ST.migrate(null, null, { query: 'kai, rob', quickFilters: ['top'] }, now); return r.state.searches.length === 1 && r.state.q.groups.length === 1 })())
check('fresh install: welcome, no What\'s new, no notice', (() => { const r = ST.migrate(null, null, null, now).state; return !r.settings.welcomeDone && r.settings.whatsNew === '3.0.0' && !r.notice && r.settings.pauseEach && r.settings.outline })())
check('v3 data is used as is (no re-migration)', (() => { const r = ST.migrate(Object.assign(ST.defaults(), { searches: [{ id: 'k', name: 'K', folder: 'f0', q: C.parse('x').q }] }), v1, null, now); return !r.migrated && r.state.searches.length === 1 })())
check('sanitize: unknown folder -> default, bad search dropped', (() => { const r = ST.sanitize({ schema: 3, searches: [{ id: 'a', name: 'A', folder: 'nope', q: C.parse('x').q }, { id: 'b', q: {} }] }); return r.searches.length === 1 && r.searches[0].folder === 'f0' })())

// ---- backup ----
const state = ST.migrate(null, v1, null, now).state
state.folders.push({ id: 'f1', name: 'Week-end', open: true }); state.searches.push({ id: 's9', name: 'Plan', folder: 'f1', q: C.parse('(kai, kei) + top').q, created: now })
state.marks['img:1'] = { m: 'review', name: 'Kai', thumb: '', t: now }; state.lock = ST.makeLock('1234')
const jj = { scans: [JR.newScan('j1', C.parse('top').q, 'top', now)] }
const file = JSON.stringify(ST.makeBackup(state, jj, '3.0.0', now))
check('backup has app, format 1, never the PIN', /"format":1/.test(file) && /"app":"profile-name-search"/.test(file) && !/hash|salt/.test(file))
const rb = ST.readBackup(file)
check('backup reads back', rb.ok)
const fresh = ST.defaults()
const mr = ST.mergeBackup(fresh, JR.empty(), rb.data, now)
check('import into empty: everything added', mr.added.searches === 4 && mr.added.folders === 1 && mr.added.marks === 1 && mr.added.scans === 1, JSON.stringify(mr.added))
const mr2 = ST.mergeBackup(mr.state, mr.journal, rb.data, now)
check('import twice: no duplicates', mr2.added.searches === 0 && mr2.added.folders === 0 && mr2.added.marks === 0 && mr2.added.scans === 0 && mr2.state.searches.length === 4)
check('import keeps folder of a search', mr.state.searches.find(s => s.id === 's9').folder === 'f1')
check('import: same name + same criteria under another id is a duplicate', (() => { const d = JSON.parse(file); d.searches = [Object.assign({}, d.searches[4], { id: 'other' })]; return ST.mergeBackup(mr.state, mr.journal, d, now).added.searches === 0 })())
check('import: folder matched by name', (() => { const d = JSON.parse(file); d.folders = [{ id: 'zz', name: 'week-END' }]; d.searches = [{ id: 'n1', name: 'New', folder: 'zz', q: C.parse('leo').q }]; const r = ST.mergeBackup(mr.state, mr.journal, d, now); return r.added.folders === 0 && r.state.searches.find(s => s.id === 'n1').folder === 'f1' })())
check('refuse: not JSON', ST.readBackup('hello').err === 'json')
check('refuse: other app', ST.readBackup('{"app":"x","format":1}').err === 'app')
check('refuse: newer format', ST.readBackup('{"app":"profile-name-search","format":2}').err === 'newer')
check('refuse: bad shape', ST.readBackup('{"app":"profile-name-search","format":1,"searches":"x"}').err === 'shape' && ST.readBackup('{"app":"profile-name-search","format":"1"}').err === 'shape')
check('import sanitizes junk entries', ST.mergeBackup(ST.defaults(), JR.empty(), { searches: [null, 5, { id: 'q' }, { id: 'ok', name: 'OK', q: C.parse('a').q }], marks: { a: { m: 'evil' } }, journal: [{}] }, now).added.searches === 1)

// ---- PIN ----
check('sha256 known vector', ST.sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
const lk = ST.makeLock('2468')
check('PIN check', ST.checkPin(lk, '2468') && !ST.checkPin(lk, '1111') && ST.validPin('1234') && !ST.validPin('12') && !ST.validPin('abcd'))

// ---- static checks on the shipped files ----
{
  const files = fs.readdirSync(EXT).filter(f => /\.(js|json|html|css|md)$/.test(f))
  const code = files.filter(f => /\.(js|html)$/.test(f)).map(f => [f, fs.readFileSync(EXT + f, 'utf8')])
  check('no network API in the extension (fetch, XHR, WebSocket, beacon, EventSource, importScripts)', code.every(([, s]) => !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts/.test(s)), code.filter(([, s]) => /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(s)).map(x => x[0]))
  check('no remote script/style/font', code.every(([, s]) => !/<script[^>]+src=["']https?:|@import|fonts\.googleapis|<link[^>]+href=["']https?:/.test(s)))
  check('the name SIDLYS appears nowhere', files.every(f => !/sidlys/i.test(fs.readFileSync(EXT + f, 'utf8'))))
  check('readable code: no minified line over 400 chars in engine/logic files', ['content.js', 'criteria.js', 'journal.js', 'store.js', 'background.js'].every(f => fs.readFileSync(EXT + f, 'utf8').split('\n').every(l => l.length < 400)))
  check('the extension never clicks into Grindr (no .click() on page elements in content.js)', !/\.click\(\)/.test(fs.readFileSync(EXT + 'content.js', 'utf8')))
  const W = { navigator: { language: 'en' } }; W.window = W; vm.createContext(W)
  for (const f of ['i18n.js', 'i18n-fr.js', 'i18n-es.js', 'i18n-pt.js', 'i18n-it.js', 'i18n-de.js']) vm.runInContext(fs.readFileSync(EXT + f, 'utf8'), W)
  W.__D = W.PNS_I18N_D
  const langs = W.PNS_LANGS.map(l => l[0]), en = Object.keys(W.__D.en)
  check('6 languages, English first', langs.join() === 'en,fr,es,pt,it,de')
  check('every language has every key (no missing string)', langs.every(l => en.every(k => typeof W.__D[l][k] === 'string' && W.__D[l][k].length)), langs.map(l => l + ':' + en.filter(k => !W.__D[l][k]).join('|')).join(' '))
  check('placeholders consistent across languages', langs.every(l => en.every(k => (W.__D.en[k].match(/\{\w+\}/g) || []).sort().join() === (W.__D[l][k].match(/\{\w+\}/g) || []).sort().join())), langs.map(l => en.filter(k => (W.__D.en[k].match(/\{\w+\}/g) || []).sort().join() !== (W.__D[l][k].match(/\{\w+\}/g) || []).sort().join()).map(k => l + ':' + k)).flat().join(' '))
  const man = JSON.parse(fs.readFileSync(EXT + 'manifest.json', 'utf8'))
  check('manifest 3.0.2, permissions storage + sidePanel only, no host permissions, no key (see docs)', man.version === '3.0.2' && JSON.stringify(man.permissions) === '["storage","sidePanel"]' && !man.host_permissions && !man.key)
  check('every content script file exists', man.content_scripts[0].js.every(f => fs.existsSync(EXT + f)))
  check('ui-editor.js is loaded right after ui.js in the content scripts and in sidepanel.html', man.content_scripts[0].js.indexOf('ui-editor.js') === man.content_scripts[0].js.indexOf('ui.js') + 1 && /ui\.js"><\/script><script src="ui-editor\.js"/.test(fs.readFileSync(EXT + 'sidepanel.html', 'utf8')))
  check('every shipped file stays under 70 KB (the repo is edited through tools that push whole files)', files.every(f => fs.statSync(EXT + f).size < 70000), files.filter(f => fs.statSync(EXT + f).size >= 70000).join())
}
console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0)

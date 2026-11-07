// Run after build-userscript.mjs: writes the unlisted mobile page dist/m/<token>/index.html (French, beta).
// What it does (3 real screenshots of the mobile panel on a sample grid), then the install steps with small drawn
// illustrations and the store links. Images: /labs/img/pnsm-*.webp (site/labs-img/*.webp.b64).
import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const repo = join(dirname(fileURLToPath(import.meta.url)), '../..')
const TOKEN = '0b97765b'
const v = JSON.parse(readFileSync(join(repo, 'site/extension/profile-name-search/manifest.json'), 'utf8')).version
const STORE = {
  userscripts: 'https://apps.apple.com/app/id1463298887',
  firefox: 'https://play.google.com/store/apps/details?id=org.mozilla.firefox',
  violentmonkey: 'https://addons.mozilla.org/android/addon/violentmonkey/'
}
const shot = (img, n, t, p) => `<figure class="sh"><img src="/labs/img/pnsm-${img}.webp" width="390" height="780" alt="${t}" loading="${n === 1 ? 'eager' : 'lazy'}" decoding="async"><figcaption><b>${n}. ${t}</b><span>${p}</span></figcaption></figure>`
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#05040A"><title>Profile Name Search sur mobile (bêta) · Fluidz</title><link rel="icon" href="/favicon.svg">
<style>
:root{--bg:#05040A;--bg1:#0D0C16;--bg2:#141222;--bg3:#1D1B2E;--tx:#EDE8F5;--mut:rgba(237,232,245,.7);--dim:rgba(237,232,245,.5);--p:#E0887A;--p2:rgba(224,136,122,.12);--pbd:rgba(224,136,122,.34);--rule:rgba(255,255,255,.08);--sage:#6BA888;--ios:#0A84FF}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;padding:24px 0 calc(40px + env(safe-area-inset-bottom))}
main{max-width:620px;margin:0 auto}.pad{padding:0 18px}
.top{display:flex;align-items:center;gap:8px;font-weight:800;margin-bottom:22px}.top i{width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#E0887A,#9080BA)}.top small{font-size:11px;font-weight:700;color:var(--dim);border:1px solid var(--rule);border-radius:6px;padding:1px 6px}
.eb{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--p);background:var(--p2);border:1px solid var(--pbd);border-radius:999px;padding:5px 12px}
h1{font-size:30px;line-height:1.1;letter-spacing:-.02em;margin:14px 0 8px}h2{font-size:22px;letter-spacing:-.01em;margin:34px 0 6px}p{color:var(--mut);margin:0 0 14px}
.shots{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 18px 10px;scrollbar-width:none}.shots::-webkit-scrollbar{display:none}
.sh{flex:0 0 72%;max-width:280px;margin:0;scroll-snap-align:center}.sh img{display:block;width:100%;height:auto;border-radius:22px;border:1px solid var(--rule);background:var(--bg1)}
.sh figcaption{padding:10px 4px 0}.sh b{display:block;font-size:15px}.sh span{display:block;font-size:13.5px;color:var(--mut);line-height:1.4;margin-top:2px}
.note{font-size:12.5px;color:var(--dim);padding:0 18px}
.tabs{display:flex;gap:6px;padding:5px;margin:14px 0 4px;border:1px solid var(--rule);border-radius:999px;background:var(--bg1);width:max-content}
.tabs a{color:var(--mut);text-decoration:none;font-weight:700;font-size:14px;padding:8px 16px;border-radius:999px}.tabs a.on{background:var(--p);color:#14090A}
.st{display:grid;grid-template-columns:34px minmax(0,1fr);gap:4px 12px;margin:18px 0}.st .n{width:30px;height:30px;border-radius:50%;background:var(--p);color:#14090A;font-weight:800;display:flex;align-items:center;justify-content:center}
.st h3{margin:2px 0 4px;font-size:17px}.st p{margin:0 0 10px;font-size:15px}.st .ill{grid-column:2;min-width:0}.st>div{min-width:0}
.ill{background:var(--bg1);border:1px solid var(--rule);border-radius:16px;padding:12px;font-size:13.5px}
.ill .lbl{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);margin-bottom:8px}
.app{display:flex;align-items:center;gap:12px}.app .ico{width:46px;height:46px;border-radius:11px;background:linear-gradient(135deg,#3a3f4b,#1d2027);display:flex;align-items:center;justify-content:center;color:#fff;font:700 15px ui-monospace,monospace}
.app b{display:block}.app small{color:var(--dim)}.app .get{margin-left:auto;background:var(--ios);color:#fff;border-radius:999px;padding:5px 16px;font-weight:700;font-size:13px}
.rows{border-radius:12px;overflow:hidden;background:var(--bg2)}.row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--rule)}.row:last-child{border:0}
.row .chev{margin-left:auto;color:var(--dim)}.row.hi{outline:2px solid var(--p);outline-offset:-2px;border-radius:10px}
.tg{margin-left:auto;width:42px;height:25px;border-radius:999px;background:#34C759;position:relative}.tg:after{content:"";position:absolute;right:2px;top:2px;width:21px;height:21px;border-radius:50%;background:#fff}
.ok{margin-left:auto;color:var(--sage);font-weight:700}
.bar{display:flex;align-items:center;gap:8px;background:var(--bg2);border-radius:12px;padding:8px 10px}.aa{border:2px solid var(--p);border-radius:8px;padding:0 6px;font-weight:700}.url{color:var(--mut);flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.menu{margin-top:8px;border-radius:12px;background:var(--bg2);overflow:hidden}.menu .row{font-size:13.5px}.inst{margin-left:auto;background:var(--p);color:#14090A;border-radius:999px;padding:3px 12px;font-weight:800;font-size:12.5px}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;background:var(--p);color:#14090A;font-weight:800;text-decoration:none;border-radius:999px;padding:14px 18px;margin:8px 0 4px}
.btn.g{background:transparent;color:var(--tx);border:1px solid var(--rule)}.store{display:inline-flex;align-items:center;gap:8px;background:#000;border:1px solid rgba(255,255,255,.25);color:#fff;text-decoration:none;border-radius:10px;padding:7px 14px;font-weight:700;font-size:14px;margin:2px 6px 8px 0}
.store small{display:block;font-size:10px;font-weight:500;opacity:.8}
.card{background:var(--bg1);border:1px solid var(--rule);border-radius:18px;padding:16px 18px;margin:28px 0 0}.card li{color:var(--mut);margin:0 0 8px}.card b{color:var(--tx)}.card ul{margin:0;padding-left:20px}
small.f{display:block;color:var(--dim);font-size:12.5px;margin-top:26px}a{color:var(--p)}
</style></head><body><main>
<div class="pad"><div class="top"><i></i>Fluidz <small>LABS</small></div>
<span class="eb">Bêta · version ${v}</span>
<h1>Profile Name Search sur ton téléphone</h1>
<p>La même recherche que l’extension, dans Grindr Web sur mobile. Rien ne quitte ton téléphone.</p></div>
<div class="shots">
${shot('search', 1, 'Tape tes mots-clés', 'top, dom, XXL… La grille Grindr reste visible au-dessus du panneau.')}
${shot('flash', 2, 'Réduis, le défilement continue', 'Lecture / pause sur la barre. Chaque nouveau match s’affiche au-dessus.')}
${shot('found', 3, 'Touche : la grille t’amène à lui', 'Le profil est entouré et clignote. Touche sa photo pour l’ouvrir.')}
</div>
<p class="note">Vraies captures sur une grille d’exemple générée : prénoms fictifs, aucun vrai profil Grindr.</p>

<div class="pad">
<h2 id="iphone">Installer en 5 minutes</h2>
<div class="tabs"><a href="#iphone" class="on">iPhone</a><a href="#android">Android</a></div>

<div class="st"><span class="n">1</span><div><h3>Installe l’app Userscripts</h3><p>Gratuite et open source. Ouvre-la une fois et choisis un dossier (par exemple « Userscripts » dans iCloud Drive).</p>
<a class="store" href="${STORE.userscripts}" target="_blank" rel="noopener"><span><small>Télécharger dans</small>l’App Store</span></a></div>
<div class="ill"><div class="lbl">Illustration</div><div class="app"><span class="ico">{ }</span><div><b>Userscripts</b><small>Gratuit</small></div><span class="get">Obtenir</span></div></div></div>

<div class="st"><span class="n">2</span><div><h3>Active-la dans Safari</h3><p><b>Réglages → Apps → Safari → Extensions → Userscripts</b> : active-la, puis mets <b>web.grindr.com</b> sur « Autoriser ».</p></div>
<div class="ill"><div class="lbl">Illustration · Réglages</div><div class="rows"><div class="row">Safari<span class="chev">›</span></div><div class="row">Extensions<span class="chev">›</span></div><div class="row hi">Userscripts<span class="tg"></span></div><div class="row">web.grindr.com<span class="ok">Autoriser</span></div></div></div></div>

<div class="st"><span class="n">3</span><div><h3>Installe le script</h3><p>Dans <b>Safari</b>, touche le bouton ci-dessous. Puis touche <b>aA</b> (ou l’icône puzzle) dans la barre d’adresse → <b>Userscripts</b> → <b>Installer</b>.</p>
<a class="btn" href="profile-name-search.user.js">Installer le script</a></div>
<div class="ill"><div class="lbl">Illustration · Safari</div><div class="bar"><span class="aa">aA</span><span class="url">fluidz.app/m/…/profile-name-search.user.js</span></div><div class="menu"><div class="row">Userscripts<span class="chev">›</span></div><div class="row">Profile Name Search<span class="inst">Installer</span></div></div></div></div>

<div class="st"><span class="n">4</span><div><h3>Ouvre Grindr Web dans Safari</h3><p>Connecte-toi sur web.grindr.com : le panneau Profile Name Search apparaît en bas de l’écran (capture 1 ci-dessus).</p>
<a class="btn g" href="https://web.grindr.com" target="_blank" rel="noopener">Ouvrir web.grindr.com ↗</a></div></div>
<p style="font-size:13.5px">Chrome sur iPhone ne peut pas lancer de scripts : utilise <b>Safari</b>.</p>

<h2 id="android">Sur Android</h2>
<div class="st"><span class="n">1</span><div><h3>Installe Firefox</h3><p>Chrome sur Android n’accepte pas les modules ; Firefox oui.</p>
<a class="store" href="${STORE.firefox}" target="_blank" rel="noopener"><span><small>Disponible sur</small>Google Play</span></a></div></div>
<div class="st"><span class="n">2</span><div><h3>Ajoute Violentmonkey</h3><p>Le module gratuit qui fait tourner le script.</p>
<a class="store" href="${STORE.violentmonkey}" target="_blank" rel="noopener"><span><small>Module Firefox</small>Violentmonkey</span></a></div></div>
<div class="st"><span class="n">3</span><div><h3>Installe le script</h3><p>Dans <b>Firefox</b>, touche le bouton : Violentmonkey ouvre sa page → <b>Installer</b>.</p>
<a class="btn" href="profile-name-search.user.js">Installer le script</a></div></div>
<div class="st"><span class="n">4</span><div><h3>Ouvre Grindr Web dans Firefox</h3><p>Connecte-toi sur web.grindr.com : le panneau apparaît en bas.</p></div></div>

<div class="card"><ul>
<li><b>Mises à jour</b> : le script se met à jour depuis ce lien. Pour forcer, retouche « Installer le script ».</li>
<li><b>Tes données</b> restent sur ton téléphone, dans le stockage du site web.grindr.com.</li>
<li><b>Bêta</b> : si le panneau dit qu’il ne trouve pas la grille, écris à <a href="mailto:hello@fluidz.app">hello@fluidz.app</a> avec une capture.</li>
</ul></div>
<small class="f">Fluidz Labs · Profile Name Search n’est pas affilié à Grindr. App Store est une marque d’Apple Inc. Google Play est une marque de Google LLC.</small>
</div>
</main></body></html>`
writeFileSync(join(repo, 'dist/m', TOKEN, 'index.html'), html)
console.log('install page ok')

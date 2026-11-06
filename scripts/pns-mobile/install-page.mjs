// Run after build-userscript.mjs: writes the unlisted install page dist/m/<token>/index.html (French, beta testers).
import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const repo = join(dirname(fileURLToPath(import.meta.url)), '../..')
const TOKEN = '0b97765b'
const v = JSON.parse(readFileSync(join(repo, 'site/extension/profile-name-search/manifest.json'), 'utf8')).version
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>Profile Name Search mobile (bêta) · Fluidz</title><link rel="icon" href="/favicon.svg">
<style>
:root{--bg:#05040A;--bg1:#0D0C16;--bg2:#141222;--tx:#EDE8F5;--mut:rgba(237,232,245,.7);--p:#E0887A;--p2:rgba(224,136,122,.12);--pbd:rgba(224,136,122,.34);--rule:rgba(255,255,255,.08)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;padding:28px 18px calc(40px + env(safe-area-inset-bottom))}
main{max-width:560px;margin:0 auto}.eb{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--p);background:var(--p2);border:1px solid var(--pbd);border-radius:999px;padding:5px 12px}
h1{font-size:30px;line-height:1.1;letter-spacing:-.02em;margin:16px 0 8px}p{color:var(--mut);margin:0 0 14px}
.card{background:var(--bg1);border:1px solid var(--rule);border-radius:18px;padding:18px;margin:18px 0}
h2{font-size:18px;margin:0 0 10px}ol{margin:0;padding-left:20px}li{margin:0 0 8px;color:var(--mut)}li b{color:var(--tx)}
.btn{display:block;text-align:center;background:var(--p);color:#14090A;font-weight:800;text-decoration:none;border-radius:999px;padding:15px 18px;margin:12px 0 6px}
.btn.g{background:transparent;color:var(--tx);border:1px solid var(--rule)}small{color:var(--mut);font-size:13px}code{background:var(--bg2);border-radius:6px;padding:2px 6px;font-size:14px}
</style></head><body><main>
<span class="eb">Bêta · version ${v}</span>
<h1>Profile Name Search sur ton téléphone</h1>
<p>La même recherche que l’extension, dans Grindr Web sur mobile. Rien ne quitte ton téléphone.</p>
<div class="card"><h2>iPhone (Safari)</h2><ol>
<li>Installe l’app gratuite <b>Userscripts</b> depuis l’App Store, ouvre-la et choisis un dossier (par exemple « Userscripts » dans iCloud Drive).</li>
<li><b>Réglages → Safari → Extensions → Userscripts</b> : active-la, et autorise <b>web.grindr.com</b>.</li>
<li>Dans <b>Safari</b>, touche le bouton ci-dessous, puis le bouton <b>aA</b> (ou l’icône puzzle) de la barre d’adresse → <b>Userscripts</b> → <b>Installer</b>.</li>
<li>Va sur <b>web.grindr.com</b> dans Safari et connecte-toi : le panneau apparaît en bas de l’écran.</li>
</ol><a class="btn" href="profile-name-search.user.js">Installer le script</a><small>Chrome sur iPhone ne peut pas lancer de scripts : utilise Safari.</small></div>
<div class="card"><h2>Android (Firefox)</h2><ol>
<li>Installe <b>Firefox</b>, puis le module <b>Violentmonkey</b> (menu ⋮ → Modules).</li>
<li>Touche le bouton ci-dessous : Violentmonkey ouvre sa page d’installation → <b>Confirmer l’installation</b>.</li>
<li>Va sur <b>web.grindr.com</b> dans Firefox et connecte-toi.</li>
</ol><a class="btn" href="profile-name-search.user.js">Installer le script</a></div>
<div class="card"><h2>Bon à savoir</h2><ol>
<li>Tes recherches et ton journal restent sur ton téléphone, dans le stockage du site web.grindr.com.</li>
<li>Le bouton <b>—</b> réduit le panneau en bulle ; touche la bulle pour le rouvrir.</li>
<li>Version bêta : si le panneau dit qu’il ne trouve pas la grille, écris à <a href="mailto:hello@fluidz.app" style="color:var(--p)">hello@fluidz.app</a> avec une capture.</li>
</ol></div>
<small>Fluidz Labs · Profile Name Search n’est pas affilié à Grindr.</small>
</main></body></html>`
writeFileSync(join(repo, 'dist/m', TOKEN, 'index.html'), html)
console.log('install page ok')

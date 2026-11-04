// Decodes the page images kept as base64 text in site/labs-img/ (this repo is edited through tools that only push text)
// into public/labs/img/, where Vite serves and copies them as normal static files (/labs/img/<name>.webp).
// Runs before the Vite build (see the "build" script in package.json). Run it by hand once for `npm run dev`.
// To add or replace an image: put <name>.webp.b64 (base64 of the file, one line) in site/labs-img/.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'site', 'labs-img')
const out = join(root, 'public', 'labs', 'img')
if (!existsSync(src)) { console.log('labs-images: no site/labs-img folder, nothing to do'); process.exit(0) }
mkdirSync(out, { recursive: true })
let n = 0
for (const f of readdirSync(src).filter((x) => x.endsWith('.b64')).sort()) {
  const buf = Buffer.from(readFileSync(join(src, f), 'utf-8').replace(/\s+/g, ''), 'base64')
  writeFileSync(join(out, f.slice(0, -4)), buf)
  n++
}
console.log(`labs-images: ${n} image(s) written to public/labs/img/`)

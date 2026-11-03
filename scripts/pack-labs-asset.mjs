// Packs a binary file as base64 text parts for api/labs-asset.js.
// Usage: node scripts/pack-labs-asset.mjs <file> [more files…]   → site/downloads/labs/<name>.b64[.partN]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
const dir = resolve('site/downloads/labs'); mkdirSync(dir, { recursive: true })
const CHUNK = 60000
for (const f of process.argv.slice(2)) {
  const name = basename(f), b64 = readFileSync(f).toString('base64')
  if (b64.length <= CHUNK) { writeFileSync(`${dir}/${name}.b64`, b64); console.log(name, '1 part'); continue }
  let n = 0
  for (let i = 0; i < b64.length; i += CHUNK) writeFileSync(`${dir}/${name}.b64.part${n++}`, b64.slice(i, i + CHUNK))
  console.log(name, n, 'parts')
}

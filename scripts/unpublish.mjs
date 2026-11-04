// Removes the paused pages/tools from the deployed site.
//
// Runs after `vite build` (see the "build" script in package.json). Every path listed in
// scripts/unpublished.json (relative to public/) is deleted from dist/. The source files
// stay untouched in public/, so nothing is lost.
//
// TO RE-PUBLISH a page or tool: remove its entry from scripts/unpublished.json (and restore
// its rewrite in vercel.json, its line in public/sitemap-labs.xml, and any link to it).
// Missing entries are ignored. Exits non-zero if dist/ does not exist.

import { existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

if (!existsSync(dist)) {
  console.error('unpublish: dist/ not found. Run the Vite build first.')
  process.exit(1)
}

const list = JSON.parse(readFileSync(join(root, 'scripts', 'unpublished.json'), 'utf-8'))
if (!Array.isArray(list)) {
  console.error('unpublish: scripts/unpublished.json must be an array of paths')
  process.exit(1)
}

let removed = 0
for (const entry of list) {
  const rel = String(entry).replace(/^\/+/, '')
  const target = resolve(dist, rel)
  const back = relative(dist, target)
  // Never delete dist/ itself or anything outside it.
  if (!rel || !back || back.startsWith('..') || isAbsolute(back)) {
    console.error(`unpublish: refusing unsafe entry "${entry}"`)
    process.exit(1)
  }
  if (!existsSync(target)) {
    console.log(`unpublish: skip ${rel} (not in dist)`)
    continue
  }
  rmSync(target, { recursive: true, force: true })
  removed++
  console.log(`unpublish: removed ${rel}`)
}
console.log(`unpublish: ${removed} path(s) removed from dist/`)

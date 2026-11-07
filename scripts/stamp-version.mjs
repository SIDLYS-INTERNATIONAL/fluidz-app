// Run after `vite build`: writes the extension version (from its manifest.json) into the built landing page,
// so the download line, the JSON-LD and one.js always show the version the download API really serves.
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const v = JSON.parse(readFileSync(join(repo, 'site/extension/profile-name-search/manifest.json'), 'utf8')).version
const edits = [
  ['dist/index.html', [[/"softwareVersion":"\d+\.\d+\.\d+"/, `"softwareVersion":"${v}"`], [/>v\d+\.\d+\.\d+ · /, `>v${v} · `]]],
  ['dist/labs/one.js', [[/PNS_VERSION = '\d+\.\d+\.\d+'/, `PNS_VERSION = '${v}'`]]]
]
for (const [file, reps] of edits) {
  const p = join(repo, file); let s = readFileSync(p, 'utf8')
  for (const [re, to] of reps) { if (!re.test(s)) throw new Error(`stamp-version: ${re} not found in ${file}`); s = s.replace(re, to) }
  writeFileSync(p, s)
}
console.log('stamp-version: ' + v)

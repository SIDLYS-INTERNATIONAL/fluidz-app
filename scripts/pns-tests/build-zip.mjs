// Builds the extension zip with the SAME code as the download API (api/profile-name-search-download.js):
// the buildZip() function is taken from that file as is, so this checks what users really get.
// Usage: node scripts/pns-tests/build-zip.mjs <out.zip>
import { readFileSync, writeFileSync, mkdtempSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
const repo = join(dirname(fileURLToPath(import.meta.url)), '../..')
const api = readFileSync(join(repo, 'api/profile-name-search-download.js'), 'utf8')
const body = api.slice(api.indexOf("const ROOT"), api.indexOf("const SUPABASE_URL"))
const tmp = mkdtempSync(join(tmpdir(), 'pnszip-'))
writeFileSync(join(tmp, 'z.mjs'), "import { readdirSync, readFileSync } from 'fs'\nimport { join } from 'path'\nimport { deflateRawSync } from 'zlib'\n" + body + "\nexport { buildZip }\n")
const { buildZip } = await import(join(tmp, 'z.mjs'))
process.chdir(repo) // buildZip reads site/extension/profile-name-search from the current directory, like on Vercel
const zip = buildZip()
writeFileSync(process.argv[2] || 'profile-name-search.zip', zip)
console.log('zip bytes', zip.length)

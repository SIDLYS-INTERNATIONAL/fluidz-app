// Builds public/labs/icons.svg (a Lucide sprite) for the Fluidz Labs static pages.
// Usage: node scripts/build-labs-icons.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const NAMES = `check chevron-down chevron-up chevron-left chevron-right heart globe x mail-check mail menu user laptop app-window folder-down clipboard-copy info lightbulb panel-right minus sparkles star play pause flag hand wifi-off hard-drive map-pin-off file-code circle-check circle-play text-cursor-input arrow-right arrow-down external-link download message-square pen-line images smartphone droplets timer coffee bot flask-conical crown server shield-check rocket message-circle lock locate-fixed grip-vertical grip-horizontal search maximize-2 log-out layout-grid image shield mouse-pointer-2 copy share-2 users eye-off bell life-buoy refresh-cw key-round camera badge-check circle-user-round puzzle pin zap scroll-text eraser wand-sparkles tag`.split(/\s+/)

const dir = resolve('node_modules/lucide-react/dist/esm/icons')
const symbols = [], missing = []
for (const n of NAMES) {
  const f = resolve(dir, n + '.js')
  if (!existsSync(f)) { missing.push(n); continue }
  const src = readFileSync(f, 'utf8')
  const m = src.match(/const __iconNode = (\[[\s\S]*?\]);\s*\nconst /)
  if (!m) { missing.push(n); continue }
  const nodes = Function('return ' + m[1])()
  const inner = nodes.map(([tag, attrs]) => {
    const a = Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')
    return `<${tag} ${a}/>`
  }).join('')
  symbols.push(`<symbol id="${n}" viewBox="0 0 24 24">${inner}</symbol>`)
}
writeFileSync(resolve('public/labs/icons.svg'), `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>\n`)
console.log('icons:', symbols.length, 'missing:', missing.join(', ') || 'none')

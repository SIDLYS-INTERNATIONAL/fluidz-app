// Tiny local server to preview the static Labs pages (mirrors Vercel clean URLs). Usage: node scripts/labs-serve.mjs [port]
import http from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
const root = resolve('.'), port = Number(process.argv[2] || 4173)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm', '.zip': 'application/zip' }
const find = p => {
  for (const c of [join(root, 'public', p), join(root, p === '/' ? 'index.html' : p)]) if (existsSync(c) && statSync(c).isFile()) return c
  for (const c of [join(root, 'public', p + '.html'), join(root, p + '.html')]) if (existsSync(c)) return c
}
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); let p = decodeURIComponent(u.pathname)
  if (p === '/api/labs-signup') { res.setHeader('content-type', 'application/json'); return res.end('{"ok":true,"emailed":true}') }
  if (['/api/labs-asset', '/api/profile-hunter-asset', '/api/profile-hunter-download'].includes(p)) {
    return import(resolve('api' + p.slice(4) + '.js')).then(m => {
      const r = { status(c) { res.statusCode = c; return r }, setHeader: (k, v) => res.setHeader(k, v), json(o) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)) }, send(b) { res.end(b) }, end() { res.end() } }
      return m.default({ query: Object.fromEntries(u.searchParams), headers: req.headers, method: req.method }, r)
    })
  }
  if (p.startsWith('/api/')) { res.statusCode = 404; return res.end('{}') }
  const f = find(p)
  if (!f) { res.statusCode = 404; return res.end('not found') }
  res.setHeader('content-type', types[extname(f)] || 'application/octet-stream'); res.end(readFileSync(f))
}).listen(port, () => console.log('labs preview on http://localhost:' + port))

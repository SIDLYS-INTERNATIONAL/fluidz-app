// Vercel Serverless Function: serves the binary media of the Fluidz Labs pages (demo video, storyboard
// frames, posters…). The repo is edited through tools that only handle text, so each file is committed as
// base64 text under site/downloads/labs/ (`<file>.b64`, or split in `<file>.b64.part0`, `.part1`…) and
// decoded here. Supports HTTP Range requests (required by iOS Safari for <video>).

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const TYPES = { mp4: 'video/mp4', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', zip: 'application/zip' }
const cache = new Map()

function load(file) {
  if (cache.has(file)) return cache.get(file)
  const dir = join(process.cwd(), 'site', 'downloads', 'labs')
  const parts = readdirSync(dir).filter((n) => n === `${file}.b64` || n.startsWith(`${file}.b64.part`)).sort((a, b) => {
    const na = Number(a.split('.part')[1] || 0), nb = Number(b.split('.part')[1] || 0)
    return na - nb
  })
  if (!parts.length) throw new Error('missing')
  const buf = Buffer.from(parts.map((n) => readFileSync(join(dir, n), 'utf-8')).join('').replace(/\s+/g, ''), 'base64')
  cache.set(file, buf)
  return buf
}

export default async function handler(req, res) {
  const file = String(req.query.file || '')
  const ext = file.split('.').pop()
  if (!/^[a-z0-9._-]+$/i.test(file) || !TYPES[ext]) return res.status(404).json({ error: 'not_found' })
  let buf
  try { buf = load(file) } catch (e) { return res.status(404).json({ error: 'not_found' }) }

  res.setHeader('Content-Type', TYPES[ext])
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
  if (range) {
    let start = range[1] === '' ? Math.max(0, buf.length - Number(range[2])) : Number(range[1])
    let end = range[1] === '' || range[2] === '' ? buf.length - 1 : Math.min(Number(range[2]), buf.length - 1)
    if (start > end || start >= buf.length) { res.setHeader('Content-Range', `bytes */${buf.length}`); return res.status(416).end() }
    res.setHeader('Content-Range', `bytes ${start}-${end}/${buf.length}`)
    res.setHeader('Content-Length', String(end - start + 1))
    return res.status(206).send(buf.subarray(start, end + 1))
  }
  res.setHeader('Content-Length', String(buf.length))
  return res.status(200).send(buf)
}

// Vercel Serverless Function: serves the small static images used on
// public/profile-hunter.html (the annotated install-guide screenshots and the
// social-share preview image og.png). Same
// reasoning as api/profile-hunter-download.js and
// api/profile-hunter-demo-video.js: this repo is edited through tools that
// only handle text content, so these images are checked in as base64 text
// files and decoded here at request time.

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const ALLOWED = {
  'install-1.png': 'image/png',
  'install-2.png': 'image/png',
  'install-3.png': 'image/png',
  'og.png': 'image/png',
  'demo-poster.jpg': 'image/jpeg',
}

export default async function handler(req, res) {
  const file = String(req.query.file || '')
  const contentType = ALLOWED[file]
  if (!contentType) {
    return res.status(404).json({ error: 'not_found' })
  }

  // An image is stored either as one `<file>.b64` file, or split into
  // `<file>.b64.part0`, `.part1`… (kept small so each can be committed as text).
  let b64
  try {
    const dir = join(process.cwd(), 'site', 'downloads', 'assets')
    const parts = readdirSync(dir)
      .filter((n) => n === `${file}.b64` || n.startsWith(`${file}.b64.part`))
      .sort()
    if (!parts.length) throw new Error('missing')
    b64 = parts.map((n) => readFileSync(join(dir, n), 'utf-8')).join('')
  } catch (e) {
    console.error('profile-hunter asset: not found', file, e)
    return res.status(404).json({ error: 'not_found' })
  }

  const buffer = Buffer.from(b64.replace(/\s+/g, ''), 'base64')

  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Length', String(buffer.length))
  res.setHeader('Cache-Control', 'public, max-age=604800')
  return res.status(200).send(buffer)
}

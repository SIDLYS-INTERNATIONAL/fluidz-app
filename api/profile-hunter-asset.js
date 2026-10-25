// Vercel Serverless Function: serves the small static images used on
// site/profile-hunter.html (the annotated install-guide screenshots). Same
// reasoning as api/profile-hunter-download.js and
// api/profile-hunter-demo-video.js: this repo is edited through tools that
// only handle text content, so these images are checked in as base64 text
// files and decoded here at request time.

import { readFileSync } from 'fs'
import { join } from 'path'

const ALLOWED = {
  'install-1.png': 'image/png',
  'install-2.png': 'image/png',
  'install-3.png': 'image/png',
}

export default async function handler(req, res) {
  const file = String(req.query.file || '')
  const contentType = ALLOWED[file]
  if (!contentType) {
    return res.status(404).json({ error: 'not_found' })
  }

  let b64
  try {
    b64 = readFileSync(join(process.cwd(), 'site', 'downloads', 'assets', `${file}.b64`), 'utf-8')
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

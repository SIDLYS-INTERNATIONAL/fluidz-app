// Vercel Serverless Function: serves the autoplaying demo video embedded on
// site/profile-hunter.html ("See it in action"). Recorded against a
// synthetic placeholder grid (fictional names, generated avatars) with the
// real extension code — no actual Grindr data was loaded or recorded.
//
// Same reasoning as api/profile-hunter-download.js and
// api/profile-hunter-asset.js: this repo is edited through tools that only
// accept a limited amount of text content per write. The video is checked
// in as several small base64 text parts
// (site/downloads/profile-hunter-demo.mp4.partNN.b64) and reassembled here,
// in filename order, at request time before being decoded and streamed.

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

export default async function handler(req, res) {
  const dir = join(process.cwd(), 'site', 'downloads')

  let files
  try {
    files = readdirSync(dir)
      .filter((f) => /^profile-hunter-demo\.mp4\.part\d+\.b64$/.test(f))
      .sort()
  } catch (e) {
    console.error('profile-hunter demo video: downloads dir not found', e)
    return res.status(404).json({ error: 'not_found' })
  }

  if (files.length === 0) {
    console.error('profile-hunter demo video: no parts found')
    return res.status(404).json({ error: 'not_found' })
  }

  let b64 = ''
  try {
    for (const f of files) {
      b64 += readFileSync(join(dir, f), 'utf-8')
    }
  } catch (e) {
    console.error('profile-hunter demo video: failed to read parts', e)
    return res.status(404).json({ error: 'not_found' })
  }

  const buffer = Buffer.from(b64.replace(/\s+/g, ''), 'base64')

  res.setHeader('Content-Type', 'video/mp4')
  res.setHeader('Content-Length', String(buffer.length))
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.setHeader('Accept-Ranges', 'bytes')
  return res.status(200).send(buffer)
}

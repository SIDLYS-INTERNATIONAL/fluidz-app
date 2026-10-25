// Vercel Serverless Function: serves the autoplaying demo video embedded on
// site/profile-hunter.html ("See it in action"). Recorded against a
// mock Grindr-style profile grid using stock/AI-generated photos (not real
// people's photos) with the real extension code — no actual Grindr data
// was loaded or recorded.
//
// Same reasoning as api/profile-hunter-download.js and
// api/profile-hunter-asset.js: this repo is edited through tools that only
// accept a limited amount of text content per write. The video is checked
// in as several small base64 text parts
// (site/downloads/profile-hunter-demo2.mp4.gz.part*.b64) and reassembled
// here, in filename order, at request time before being decoded,
// gunzipped, and streamed.
//
// The video is gzip-compressed before being base64-encoded and split into
// parts. This isn't about size — it's because long runs of repeated bytes
// in the raw MP4 (zero-padding inside box headers) turn into long runs of
// identical base64 characters, and those runs were silently corrupted when
// written through the repo-editing tool that checks these parts in.
// Gzipping first breaks up those repeated runs, so each part is reliably
// byte-for-byte verifiable after upload. Two parts (09 and 43) still
// corrupted occasionally even after gzipping and were further split into
// 500-byte sub-parts (e.g. part09s00.b64 .. part09s09.b64); filename sort
// order still reassembles everything correctly since "08" < "09s00" <
// "10" lexicographically.

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { gunzipSync } from 'zlib'

export default async function handler(req, res) {
  const dir = join(process.cwd(), 'site', 'downloads')

  let files
  try {
    files = readdirSync(dir)
      .filter((f) => /^profile-hunter-demo2\.mp4\.gz\.part[^.]*\.b64$/.test(f))
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

  const gzipped = Buffer.from(b64.replace(/\s+/g, ''), 'base64')

  let buffer
  try {
    buffer = gunzipSync(gzipped)
  } catch (e) {
    console.error('profile-hunter demo video: failed to gunzip', e)
    return res.status(500).json({ error: 'decode_failed' })
  }

  res.setHeader('Content-Type', 'video/mp4')
  res.setHeader('Content-Length', String(buffer.length))
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.setHeader('Accept-Ranges', 'bytes')
  return res.status(200).send(buffer)
}

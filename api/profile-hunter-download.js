// Vercel Serverless Function: serves the Profile Hunter extension .zip.
// The actual binary is checked into the repo as a base64 text file
// (site/downloads/profile-hunter.zip.b64) because this repo is edited
// through tools that only handle text content — this function decodes it
// at request time and streams it back as a real .zip download.

import { readFileSync } from 'fs'
import { join } from 'path'

export default async function handler(req, res) {
  let b64
  try {
    b64 = readFileSync(join(process.cwd(), 'site', 'downloads', 'profile-hunter.zip.b64'), 'utf-8')
  } catch (e) {
    console.error('profile-hunter download: zip.b64 not found', e)
    return res.status(404).json({ error: 'not_found' })
  }

  const buffer = Buffer.from(b64.trim(), 'base64')

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', 'attachment; filename="profile-hunter.zip"')
  res.setHeader('Content-Length', String(buffer.length))
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.status(200).send(buffer)
}

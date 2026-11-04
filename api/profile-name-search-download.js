// Vercel Serverless Function: serves the Profile Name Search extension as a .zip.
// The extension source lives in site/extension/profile-name-search/ as plain text files
// (PNG icons as *.png.b64, because this repo is edited through text-only tools). The zip is
// built here at request time, with a top-level "profile-name-search/" folder so that
// unzipping gives exactly the folder the install guide talks about.

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { deflateRawSync } from 'zlib'

const ROOT = 'profile-name-search/'
let cached = null

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function buildZip() {
  const dir = join(process.cwd(), 'site', 'extension', 'profile-name-search')
  const names = readdirSync(dir).filter((n) => !n.startsWith('.')).sort()
  if (!names.includes('manifest.json')) throw new Error('manifest missing')
  const dosTime = (12 << 11) | (0 << 5) | 0 // 12:00:00
  const dosDate = ((2026 - 1980) << 9) | (11 << 5) | 3 // 2026-11-03
  const parts = []
  const central = []
  let offset = 0
  for (const n of names) {
    const raw = readFileSync(join(dir, n))
    const isB64 = n.endsWith('.b64')
    const data = isB64 ? Buffer.from(raw.toString('utf-8').trim(), 'base64') : raw
    const name = Buffer.from(ROOT + (isB64 ? n.slice(0, -4) : n), 'utf-8')
    const comp = deflateRawSync(data, { level: 9 })
    const useDeflate = comp.length < data.length
    const body = useDeflate ? comp : data
    const crc = crc32(data)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4)
    lh.writeUInt16LE(0x0800, 6)
    lh.writeUInt16LE(useDeflate ? 8 : 0, 8)
    lh.writeUInt16LE(dosTime, 10)
    lh.writeUInt16LE(dosDate, 12)
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(body.length, 18)
    lh.writeUInt32LE(data.length, 22)
    lh.writeUInt16LE(name.length, 26)
    lh.writeUInt16LE(0, 28)
    parts.push(lh, name, body)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0)
    ch.writeUInt16LE(0x031e, 4)
    ch.writeUInt16LE(20, 6)
    ch.writeUInt16LE(0x0800, 8)
    ch.writeUInt16LE(useDeflate ? 8 : 0, 10)
    ch.writeUInt16LE(dosTime, 12)
    ch.writeUInt16LE(dosDate, 14)
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(body.length, 20)
    ch.writeUInt32LE(data.length, 24)
    ch.writeUInt16LE(name.length, 28)
    ch.writeUInt32LE(0x81a40000, 38) // -rw-r--r--
    ch.writeUInt32LE(offset, 42)
    central.push(ch, name)
    offset += lh.length + name.length + body.length
  }
  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(names.length, 8)
  end.writeUInt16LE(names.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, cd, end])
}

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kxbrfjqxufvskcxmliak.supabase.co').replace(/\/+$/, '')
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

// The zip is only served to a signed-in Fluidz account: the visitor gets there through
// the magic link e-mailed by /api/labs-signup. Token verified against Supabase Auth;
// if Supabase cannot be reached we refuse (never serve unverified).
async function verifiedUser(req) {
  const m = /^Bearer\s+([A-Za-z0-9._~+/=-]{20,4096})$/.exec(String(req.headers.authorization || '').trim())
  if (!m) return false
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${m[1]}` },
      signal: AbortSignal.timeout(5000),
    })
    return r.status === 200
  } catch (e) {
    console.error('profile-name-search download: auth check failed', e?.name || 'error')
    return false
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Robots-Tag', 'noindex')
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    return res.status(204).end()
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (!(await verifiedUser(req))) return res.status(401).json({ error: 'login_required' })
  try {
    if (!cached) cached = buildZip()
  } catch (e) {
    console.error('profile-name-search download: build failed', e)
    return res.status(404).json({ error: 'not_found' })
  }
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', 'attachment; filename="profile-name-search.zip"')
  res.setHeader('Content-Length', String(cached.length))
  if (req.method === 'HEAD') return res.status(200).end()
  return res.status(200).send(cached)
}

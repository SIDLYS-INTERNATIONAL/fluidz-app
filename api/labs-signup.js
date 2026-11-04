// Vercel Serverless Function: one sign-up endpoint for every Fluidz Labs tool.
//
// POST { email, source, lang, marketing, utm: {source, medium, campaign}, redirect }
//
// 1. Records the email + where it came from in `leads_profile_hunter`
//    (insert-only for anon — kept as a backup list even if sending fails).
// 2. Asks Supabase Auth to email a magic link. Clicking it creates (or opens)
//    the visitor's free Fluidz Labs account and brings them back to `redirect`
//    signed in. Where they came from (source, lang, utm, marketing consent) is
//    stored in the account's user_metadata, so we can later suggest the tools
//    they haven't tried yet — only to people who ticked the marketing box.
//
// Answers: 200 { ok: true, emailed: true }  link sent
//          400 { error: 'invalid_email' }
//          413 { error: 'payload_too_large' } · 429 { error: 'rate_limited' }
//          200 { ok: false, emailed: false, error: 'email_failed' }  could not send
//              (e-mail rate limit etc.; the lead row is stored anyway). There is no
//              "download anyway" fallback: the zip endpoint requires a signed-in user.
//
// Abuse protection without extra infrastructure: 2 KB body cap, a hidden honeypot
// field `website` (bots fill it: we answer ok and do nothing), and a tiny
// per-instance in-memory throttle (5 requests / IP / minute).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kxbrfjqxufvskcxmliak.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SOURCES = new Set(['profile-hunter', 'album-creator', 'hookup-safety', 'labs-home', 'support', 'pns-home'])
const LANGS = new Set(['en', 'fr', 'es', 'pt', 'it', 'de'])
const ALLOWED_REDIRECT = /^https:\/\/(www\.)?fluidz\.app\//

const MAX_BODY_BYTES = 2048
const THROTTLE_MAX = 5
const THROTTLE_WINDOW_MS = 60_000
const hits = new Map() // ip -> [timestamps] (per serverless instance, best effort)

const clean = (v, max = 80) => String(v || '').trim().slice(0, max)

// "jane.doe@example.com" -> "j***@e***.com" (never log a full address)
const mask = (e) => {
  const [u = '', d = ''] = String(e).split('@')
  const dot = d.lastIndexOf('.')
  return `${u.slice(0, 1)}***@${d.slice(0, 1)}***${dot > 0 ? d.slice(dot) : ''}`
}

function throttled(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < THROTTLE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < THROTTLE_WINDOW_MS)) hits.delete(k)
  }
  return recent.length > THROTTLE_MAX
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim()
  if (throttled(ip)) return res.status(429).json({ error: 'rate_limited' })

  if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'payload_too_large' })
  }
  let body = req.body
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) return res.status(413).json({ error: 'payload_too_large' })
    try { body = JSON.parse(body) } catch { body = {} }
  } else if (body && typeof body === 'object') {
    if (Buffer.byteLength(JSON.stringify(body)) > MAX_BODY_BYTES) return res.status(413).json({ error: 'payload_too_large' })
  }

  // Honeypot: real visitors never see/fill this field.
  if (body && typeof body.website === 'string' && body.website.trim() !== '') {
    return res.status(200).json({ ok: true, emailed: true })
  }

  const email = clean(body?.email, 320).toLowerCase()
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' })

  const source = SOURCES.has(body?.source) ? body.source : 'labs-home'
  const lang = LANGS.has(body?.lang) ? body.lang : 'en'
  const marketing = body?.marketing === true
  const utm = {
    utm_source: clean(body?.utm?.source),
    utm_medium: clean(body?.utm?.medium),
    utm_campaign: clean(body?.utm?.campaign),
  }
  const redirect = ALLOWED_REDIRECT.test(String(body?.redirect || ''))
    ? String(body.redirect)
    : 'https://fluidz.app/?welcome=1#download'

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: 'implicit' },
  })

  // 1. Backup lead row (the table only allows inserts from the anon key).
  try {
    const { error } = await supabase.from('leads_profile_hunter').insert({
      email,
      lang: lang === 'fr' ? 'fr' : 'en',
      source: [source, utm.utm_source, utm.utm_campaign].filter(Boolean).join(':').slice(0, 120),
      user_agent: clean(req.headers['user-agent'], 300),
    })
    if (error && error.code !== '23505') console.error('labs-signup lead insert error:', error.code, mask(email))
  } catch (e) {
    console.error('labs-signup lead exception:', e?.code || e?.name || 'unknown', mask(email))
  }

  // 2. Magic link = download link + free Fluidz Labs account.
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirect,
        shouldCreateUser: true,
        data: {
          signup_source: source,
          signup_lang: lang,
          marketing_opt_in: marketing,
          marketing_opt_in_at: marketing ? new Date().toISOString() : null,
          ...utm,
        },
      },
    })
    if (error) {
      console.error('labs-signup otp error:', error.status, error.code || error.message, mask(email))
      return res.status(200).json({ ok: false, emailed: false, error: 'email_failed' })
    }
  } catch (e) {
    console.error('labs-signup otp exception:', e?.code || e?.name || 'unknown', mask(email))
    return res.status(200).json({ ok: false, emailed: false, error: 'email_failed' })
  }

  return res.status(200).json({ ok: true, emailed: true })
}

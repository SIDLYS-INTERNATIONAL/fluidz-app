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
// If the magic link can't be sent (e.g. email rate limit before custom SMTP is
// configured), we answer { ok: true, emailed: false } and the page falls back to
// giving the download straight away: nobody is left without the tool.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kxbrfjqxufvskcxmliak.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SOURCES = new Set(['profile-hunter', 'album-creator', 'hookup-safety', 'labs-home', 'support'])
const LANGS = new Set(['en', 'fr', 'es', 'pt', 'it', 'de'])
const ALLOWED_REDIRECT = /^https:\/\/(www\.)?fluidz\.app\//

const clean = (v, max = 80) => String(v || '').trim().slice(0, max)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
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
    : 'https://fluidz.app/'

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
    if (error && error.code !== '23505') console.error('labs-signup lead insert error:', error)
  } catch (e) {
    console.error('labs-signup lead error:', e)
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
      console.error('labs-signup otp error:', error.status, error.message)
      return res.status(200).json({ ok: true, emailed: false })
    }
  } catch (e) {
    console.error('labs-signup otp exception:', e)
    return res.status(200).json({ ok: true, emailed: false })
  }

  return res.status(200).json({ ok: true, emailed: true })
}

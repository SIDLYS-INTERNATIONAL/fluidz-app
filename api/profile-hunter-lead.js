// Vercel Serverless Function: capture an email from the Profile Hunter landing
// page (site/profile-hunter.html) before unlocking the download link.
// Inserts into Supabase table `leads_profile_hunter` (insert-only RLS policy
// for the anon role — see supabase/migrations/..._create_leads_profile_hunter.sql).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kxbrfjqxufvskcxmliak.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }

  const email = String(body?.email || '').trim().toLowerCase()
  const lang = body?.lang === 'fr' ? 'fr' : 'en'

  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid_email' })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { error } = await supabase.from('leads_profile_hunter').insert({
      email,
      lang,
      source: 'profile-hunter-landing',
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    })

    // 23505 = unique_violation (email already captured) — not a failure from
    // the visitor's point of view, they still get the download.
    if (error && error.code !== '23505') {
      console.error('profile-hunter lead insert error:', error)
      return res.status(500).json({ error: 'insert_failed' })
    }
  } catch (e) {
    console.error('profile-hunter lead error:', e)
    return res.status(500).json({ error: 'server_error' })
  }

  return res.status(200).json({ ok: true })
}

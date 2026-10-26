// Vercel Serverless Function: returns the real number of people who unlocked
// the Profile Hunter download, for the counter on public/profile-hunter.html.
// Only an aggregate count is exposed, through the security-definer SQL function
// public.profile_hunter_lead_count() (see supabase/migrations/
// 20261026180000_profile_hunter_lead_count.sql) — emails are never readable.
// If the function isn't deployed yet, returns { count: null } and the page
// simply hides the counter.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kxbrfjqxufvskcxmliak.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cached at the edge for 5 minutes: the number moves, but nobody needs it to the second.
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data, error } = await supabase.rpc('profile_hunter_lead_count')
    if (error) throw error
    const count = Number(data)
    return res.status(200).json({ count: Number.isFinite(count) ? count : null })
  } catch (e) {
    console.error('profile-hunter stats error:', e?.message || e)
    return res.status(200).json({ count: null })
  }
}

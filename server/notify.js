// Owner notifications by e-mail (new sign-up, new download), sent through Resend.
// Nothing is sent unless RESEND_API_KEY is set (installed by the Resend integration in Vercel).
// A notification never blocks or fails the request it is attached to: errors are logged, that's all.
//
// Env:  RESEND_API_KEY  (required to send)
//       NOTIFY_TO       recipient, default hello@fluidz.app
//       NOTIFY_FROM     sender, default "Fluidz Labs <notify@fluidz.app>" (the domain must be verified in Resend)

const TO = process.env.NOTIFY_TO || 'hello@fluidz.app'
const FROM = process.env.NOTIFY_FROM || 'Fluidz Labs <notify@fluidz.app>'
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// rows: [[label, value], ...] — shown as a small table; empty values are skipped.
export async function notifyOwner(subject, rows, { fetchImpl = fetch } = {}) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false, reason: 'no_key' }
  const lines = rows.filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
  const text = lines.map(([k, v]) => `${k}: ${v}`).join('\n')
  const html = `<table style="font:14px/1.5 -apple-system,Segoe UI,sans-serif;border-collapse:collapse">${lines
    .map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#777">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`)
    .join('')}</table>`
  try {
    const r = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], subject, text, html }),
      signal: AbortSignal.timeout(4000),
    })
    if (!r.ok) {
      console.error('notify: resend answered', r.status)
      return { sent: false, reason: 'http_' + r.status }
    }
    return { sent: true }
  } catch (e) {
    console.error('notify: failed', e?.name || 'error')
    return { sent: false, reason: e?.name || 'error' }
  }
}

export const when = () => new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'

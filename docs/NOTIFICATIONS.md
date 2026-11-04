# Owner notifications (new sign-up, new download)

`server/notify.js` e-mails the owner through [Resend](https://resend.com) when:

- someone signs up on fluidz.app (`api/labs-signup.js`, after the magic link is sent) — subject `Nouvelle inscription · <source>`;
- someone downloads the extension (`api/profile-name-search-download.js`, after the zip is served) — subject `Nouveau téléchargement · <zip name>`.

The e-mail lists the address, language, source / UTM, file and time. The notification runs after the HTTP answer and never fails or slows the request: without a key nothing is sent, and a Resend error is only logged.

## Environment variables (Vercel project `fluidz-app`)

| Variable | Required | Default |
| --- | --- | --- |
| `RESEND_API_KEY` | yes, to send anything | — (set by the Resend integration from the Vercel Marketplace) |
| `NOTIFY_TO` | no | `hello@fluidz.app` |
| `NOTIFY_FROM` | no | `Fluidz Labs <notify@fluidz.app>` — the domain `fluidz.app` must be verified in Resend (DKIM/SPF records); the integration can add them to Vercel DNS |

## Setup (once)

1. In Vercel: Marketplace → Resend → Install, team `sunnyinterns-projects`, project `fluidz-app`. This creates the Resend account and puts `RESEND_API_KEY` in the project.
2. In Resend: Domains → add `fluidz.app` and let it write the DNS records (the domain's DNS is on Vercel).
3. Redeploy (any push) or wait for the next deploy: the key is read at runtime.

Free plan: 100 e-mails / day, 3 000 / month — far above the expected volume.

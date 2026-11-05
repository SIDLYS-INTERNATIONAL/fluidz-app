# Supabase Auth — "Magic Link" e-mail template (download link)

Dashboard → Authentication → Email Templates → **Magic Link**. One template for every language: the sign-up
language travels in the user metadata (`signup_lang`, set by `api/labs-signup.js`), so the template branches on it.
Variables available: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Data.signup_lang }}`.

## Subject

```
{{ if eq .Data.signup_lang "fr" }}Ton lien pour télécharger Profile Name Search{{ else if eq .Data.signup_lang "es" }}Tu enlace para descargar Profile Name Search{{ else if eq .Data.signup_lang "pt" }}Seu link para baixar o Profile Name Search{{ else if eq .Data.signup_lang "it" }}Il tuo link per scaricare Profile Name Search{{ else if eq .Data.signup_lang "de" }}Dein Link zum Herunterladen von Profile Name Search{{ else }}Your link to download Profile Name Search{{ end }}
```

## Body (HTML)

```html
<div style="margin:0;padding:32px 16px;background:#f6f4fb;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1b1727">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:36px 32px;border:1px solid #ebe7f3">
    <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#E0887A">Fluidz Labs</p>
    {{ if eq .Data.signup_lang "fr" }}
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Ton lien de téléchargement</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#4b4560">Un clic ouvre fluidz.app sur ton ordinateur avec le bouton de téléchargement de <b>Profile Name Search</b> (extension Chrome gratuite). Ce lien crée aussi ton compte Fluidz Labs, sans mot de passe.</p>
      <p style="margin:0 0 28px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#E0887A;color:#14090A;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px">Télécharger l’extension</a></p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b4560">Le lien ne marche qu’une fois et pendant une heure. Ouvre-le sur l’ordinateur où tu utilises Chrome.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8399">Tu n’as rien demandé ? Ignore cet e-mail, rien ne sera créé. L’installation prend deux minutes, tout est expliqué sur la page.</p>
    {{ else if eq .Data.signup_lang "es" }}
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Tu enlace de descarga</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#4b4560">Un clic abre fluidz.app en tu ordenador con el botón para descargar <b>Profile Name Search</b> (extensión de Chrome gratuita). Este enlace también crea tu cuenta Fluidz Labs, sin contraseña.</p>
      <p style="margin:0 0 28px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#E0887A;color:#14090A;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px">Descargar la extensión</a></p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b4560">El enlace solo funciona una vez y durante una hora. Ábrelo en el ordenador donde usas Chrome.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8399">¿No pediste nada? Ignora este e-mail, no se creará nada.</p>
    {{ else if eq .Data.signup_lang "pt" }}
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Seu link de download</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#4b4560">Um clique abre o fluidz.app no seu computador com o botão para baixar o <b>Profile Name Search</b> (extensão gratuita do Chrome). Este link também cria sua conta Fluidz Labs, sem senha.</p>
      <p style="margin:0 0 28px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#E0887A;color:#14090A;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px">Baixar a extensão</a></p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b4560">O link funciona uma única vez e por uma hora. Abra no computador onde você usa o Chrome.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8399">Não pediu nada? Ignore este e-mail, nada será criado.</p>
    {{ else if eq .Data.signup_lang "it" }}
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Il tuo link per scaricare</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#4b4560">Un clic apre fluidz.app sul tuo computer con il pulsante per scaricare <b>Profile Name Search</b> (estensione Chrome gratuita). Questo link crea anche il tuo account Fluidz Labs, senza password.</p>
      <p style="margin:0 0 28px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#E0887A;color:#14090A;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px">Scarica l’estensione</a></p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b4560">Il link funziona una sola volta e per un’ora. Aprilo sul computer dove usi Chrome.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8399">Non hai chiesto nulla? Ignora questa e-mail, non verrà creato niente.</p>
    {{ else if eq .Data.signup_lang "de" }}
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Dein Download-Link</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#4b4560">Ein Klick öffnet fluidz.app auf deinem Computer mit dem Download-Button für <b>Profile Name Search</b> (kostenlose Chrome-Erweiterung). Der Link legt auch dein Fluidz-Labs-Konto an, ohne Passwort.</p>
      <p style="margin:0 0 28px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#E0887A;color:#14090A;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px">Erweiterung herunterladen</a></p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b4560">Der Link funktioniert nur einmal und eine Stunde lang. Öffne ihn auf dem Computer, auf dem du Chrome nutzt.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8399">Nichts angefordert? Ignoriere diese E-Mail, es wird nichts angelegt.</p>
    {{ else }}
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">Your download link</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#4b4560">One click opens fluidz.app on your computer with the download button for <b>Profile Name Search</b> (free Chrome extension). The link also creates your Fluidz Labs account, no password.</p>
      <p style="margin:0 0 28px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#E0887A;color:#14090A;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px">Download the extension</a></p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b4560">The link works once and for one hour. Open it on the computer where you use Chrome.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8399">Didn’t ask for this? Ignore this e-mail, nothing will be created.</p>
    {{ end }}
    <p style="margin:28px 0 0;font-size:12px;color:#8a8399">Fluidz Labs · USA · <a href="https://fluidz.app/privacy" style="color:#8a8399">Privacy</a></p>
  </div>
</div>
```

Note: the page has no field for the OTP code, so the template does not show `{{ .Token }}` (the default Supabase template did, which confused testers).

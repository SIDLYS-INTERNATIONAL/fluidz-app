# Profile Name Search — Chrome extension (by Fluidz Labs)

Find any profile on **Grindr Web** by name, keyword or emoji. It scrolls the grid for you, pauses on every match and shows you where he is. Free, no account needed, nothing leaves your browser.

Landing page and install guide: https://fluidz.app/profile-name-search

## Install (2 minutes)

1. Unzip the download. You get a folder called `profile-name-search`.
2. In Chrome, open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the unzipped `profile-name-search` folder (the one that contains `manifest.json`).
4. Open https://web.grindr.com. On your first visit a 3-step welcome walks you through it.

Works in Chrome 116+ and browsers built on it (Brave, Edge, Arc). Not Safari or Firefox.

## Using it

- **Search**: type a name, a keyword or an emoji and press Enter. Each Enter adds a chip. Chips are combined with **OR**; inside a chip use **+** for **AND** (`dom + top`) and quotes for an exact phrase (`"dom top"`).
- **Auto-scroll**: scrolls the grid to load more profiles and pauses on each new match (switch that off if you prefer it to keep going).
- **Show on grid**: scrolls to the profile and flashes it. If Grindr already unloaded the card, the panel scrolls back to where he was.
- **Saved searches**: keep up to 3.
- **Side panel**: toolbar icon → *Open in Chrome's side panel*. It sits next to the page and never covers the grid.
- **Floating panel**: drag it by either handle, shrink it to a bubble, or close it (toolbar icon → *Show the floating panel*). Lost it? Toolbar icon → *Reset panel position*.
- **Languages**: English, Français, Español, Português, Italiano, Deutsch (the 💡 button reopens the welcome, where you can change language).

## Privacy

- No network requests, no analytics, no account. The code is plain, unminified JavaScript — read it.
- Permissions: `storage` (remembers your searches, language and panel position on this computer) and `sidePanel`. It only runs on `web.grindr.com`.
- It never clicks, likes, favorites or messages anyone for you.

## Updating

Download the new zip, replace the old folder, then click ↻ on the extension's card in `chrome://extensions` and reload your Grindr tab. Settings are kept. If you used **Profile Hunter** before, your last search and shortcuts are carried over.

## Changelog

### 2.0.0
- Renamed from *Profile Hunter* to **Profile Name Search**.
- New panel design: step-by-step layout, chips, saved searches, live counters, results with *Show on grid*.
- Search syntax: comma = OR, `+` = AND, quotes = exact phrase; accents are ignored.
- Chrome side panel, collapsible bubble, welcome in 3 steps, English/French/Spanish/Portuguese/Italian/German.
- End-of-grid message and a notification when a new match is found.
- *Hide others* mode removed (non-matches are always dimmed).

Not affiliated with Grindr, Scruff, Romeo, Hornet, Jack'd or Sniffies. © 2026 Fluidz Labs · USA.

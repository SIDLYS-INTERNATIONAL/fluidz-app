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

- **Search**: type a name, a keyword or an emoji and press Enter. Each Enter adds a chip. Chips are combined with **OR**; inside a chip use **+** for **AND** (`+` and `＋` both work; `, ; |` all start a new OR chip) (`dom + top`) and quotes for an exact phrase (`"dom top"`).
- **Auto-scroll**: scrolls the grid to load more profiles and pauses on each new match (switch that off if you prefer it to keep going).
- **Scan speed**: *Gentle* (default, recommended) scrolls slower with a little random jitter, waits for Grindr to finish loading and takes a short break (about 8-10 s) every ~120-150 new profiles. *Fast* is the old v2.0 pace and may disconnect the Grindr chat.
- **Turn off for now**: the × in the panel (or toolbar icon → *Turn off for now*) stops the scan and all page watching, so Grindr Web runs as if the extension were not there. Toolbar icon → *Show the floating panel* turns it back on.
- **Show on grid**: scrolls to the profile and flashes it. If Grindr already unloaded the card, the panel scrolls back to where he was.
- **All / Favorites / Not favorites**: three tabs above the results. *Not favorites* hides the profiles you already favorited, everywhere (results list, grid highlight, auto-scroll pauses, Previous/Next), so you can focus on new guys. *Favorites* works without a search too: it lists every favorite seen on the grid. The extension remembers your tab.
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

## Grindr chat got disconnected?

Some people report that the chat on Grindr Web disconnected after a long scan. We could not reproduce it ourselves and do not know the exact cause, so we cannot promise it is fixed. A long, fast scan loads thousands of profiles in minutes, which Grindr Web may not like. What helps:

- Reload the Grindr tab (⌘R / Ctrl+R). You stay signed in.
- For long chats, use the Grindr phone app, a Chrome window without the extension, or turn the extension off in `chrome://extensions` and reload.
- Keep *Scan speed* on **Gentle** (default). Avoid **Fast** for long scans.

## Changelog

### 2.2.1
- Fixed: with the side panel open, the floating panel no longer flashes over Grindr (and blocks your clicks) each time you open a profile. The side panel keeps its link to the page, and the floating panel only comes back after a short delay if the side panel really went away, or right away when you close the side panel yourself.

### 2.2.0
- New tabs above the results: **All**, **Favorites** and **Not favorites**, each with its count. The tab filters everything: results, grid highlight, auto-scroll pauses and Previous/Next. *Not favorites* lets you skip the profiles you already favorited. Replaces the *Only my favorites* switch (your old setting carries over). All 6 languages.

### 2.1.1
- Fixed: `+` (AND) no longer turns into OR when the field loses focus or you press Enter right after typing it. `dom +` now waits for its second word instead of becoming a separate chip, and a chip followed by `+ top` becomes `dom + top`.

### 2.1.0
- Gentler auto-scroll by default: smaller steps, about 2-3 s between steps with random jitter, waits for Grindr to finish loading before the next step, and a short cool-down break (about 8-10 s, with a countdown) every ~120-150 newly scanned profiles. End-of-grid detection adjusted to the new pace.
- New **Scan speed** setting under the auto-scroll button: *Gentle* (recommended, default) or *Fast* (the old pace, may disconnect Grindr chat).
- Lighter page work: the page observer is throttled (slower while scanning) and limited to the profile grid when it is found.
- The × now fully turns the extension off for now (scan, observer and timers stop). New *Turn off for now* button in the toolbar popup; *Show the floating panel* turns it back on.
- Fixed: the results list no longer jumps back to the top after *Show on grid*, Previous/Next or when new matches arrive; the active row stays in view (floating and side panel).
- Search field made unmistakable: a visible OR pill between chips, a coral AND badge inside a chip (`dom + top`), and a live line under the field ("Looking for: dom AND top OR jay", with a hint while a trailing `+` waits for the next word). A comma, `;`, `|` or Enter start a new OR chip, `+`/`＋` is AND, quotes keep a phrase (even `"c++"`) as one term. A pasted list like `jay, mike; dom + top` is split into chips. Click a chip's text to edit it (× still removes it).
- End-of-grid banner now says the answer itself (more profiles = a higher Grindr plan) and no longer links to the website.
- In-panel notice (all 6 languages) about the Grindr chat disconnecting after long scans, with what to do.

### 2.0.0
- Renamed from *Profile Hunter* to **Profile Name Search**.
- New panel design: step-by-step layout, chips, saved searches, live counters, results with *Show on grid*.
- Search syntax: comma = OR, `+` = AND, quotes = exact phrase; accents are ignored.
- Chrome side panel, collapsible bubble, welcome in 3 steps, English/French/Spanish/Portuguese/Italian/German.
- End-of-grid message and a notification when a new match is found.
- *Hide others* mode removed (non-matches are always dimmed).

Not affiliated with Grindr, Scruff, Romeo, Hornet, Jack'd or Sniffies. © 2026 Fluidz Labs · USA.

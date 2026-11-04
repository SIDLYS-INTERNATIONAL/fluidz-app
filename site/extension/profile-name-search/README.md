# Profile Name Search — Chrome extension (by Fluidz Labs)

Find any profile on **Grindr Web** by name, keyword or emoji. It scrolls the grid for you, pauses on every match and shows you where he is. Free, no account needed, nothing leaves your browser.

Landing page and install guide: https://fluidz.app/profile-name-search

## Install (2 minutes)

1. Unzip the download. You get a folder called `profile-name-search`.
2. In Chrome, open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the unzipped `profile-name-search` folder (the one that contains `manifest.json`).
4. Open https://web.grindr.com. On your first visit a 4-step welcome walks you through it (step 1: get your Grindr grid ready).

Works in Chrome 116+ and browsers built on it (Brave, Edge, Arc). Not Safari or Firefox.

## Using it

The panel has three numbered steps. Only one is open at a time; the others show a one-line summary.

1. **Search** — type names, keywords or emojis, press Enter. *Active search [Edit]* shows one readable line per criterion. **?** opens the syntax help with clickable examples and keyword ideas.
2. **Scan** — starts the auto-scroll. It loads the grid, reads every name and, if you keep *Pause at each match* on (default), stops on each new match.
3. **Results** — tabs *All / Favorites / Not favorites*, *N new since last time*, *Hide already seen*, *Show on grid* (scrolls back to him and flashes the card). Matches get a discreet coral outline on Grindr's grid.

The search works on Grindr's **grid view**, after Grindr's own filters (position, favorites, age…): set those first.

### Search syntax

| Type | Means |
|---|---|
| `top, dom` | top OR dom (`;` `\|` and `，` work too) |
| `TOP + XXL` | TOP AND XXL |
| `(top, dom, active) + XXL` | one criterion with synonyms AND another one |
| `Size: (XL, XXL)` | a named criterion |
| `TOP -sub` | TOP but not sub |
| `"vers top"` | exact phrase (any symbol inside is literal) |
| `=sub` | whole word only (`sub`, not `subway`). Default is *contains*. |
| `@"My search"` | reuse a saved search as a block |

Accents and capitals are ignored. Searches typed in 2.x keep exactly the same meaning.

### Advanced (folded under the three steps)

- **Search editor** — criteria as rows of synonym chips (OR inside a row, *and also* between rows, *or else* for alternatives), a *word* toggle per chip (whole word), *Without* for exclusions, saved searches as blocks, live preview, Cancel / Save / Search.
- **My searches** — unlimited, in collapsible folders, with a counter. ⋯ menu: use, add to the active search (AND / OR), edit, rename, pin, duplicate, move, delete.
- **Scan journal** — every result is written as it is found (date, time, query, name, favorite state, thumbnail link/id — never the image). Last 20 scans, kept 30 days. **Find again** looks for the same thumbnail id first, then the same name: a lead, not a guarantee.
- **Compare two scans** — new in B, gone since A, in both.
- **To review / Ignored** — local marks. Ignored profiles disappear from results, outline and pauses.

### Safety nets

- **Scan time limit** (⚙, default 30 min): the scan stops by itself with a message; *Resume* continues.
- **Another Grindr tab**: a warning appears when Grindr Web is open in two tabs.
- **Grindr crashes or empties the grid** during a scan: the scan pauses, the list is already in the journal, a *Resume* banner appears. After a reload, an unfinished scan is offered again.
- **Interested in someone?** Press *Show on grid* and tap Grindr's own star yourself. The extension never clicks in your Grindr account.

### ⚙ Settings & About

Language (6), scan speed (*Gentle* default / *Fast*), *Pause at each match* (on by default), scan time limit, coral outline on/off, **discreet mode** (photos and names blurred in the panel until hovered), **journal PIN**, help, **My data**, **grid self-test** (*Copy the report* copies a text diagnostic without names or photos and opens an e-mail draft to hello@fluidz.app — nothing is sent by the extension), feedback, version, fluidz.app.

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Alt+Shift+S | start / pause the scan |
| Alt+Shift+F | go to the search field |
| Alt+Shift+N / Alt+Shift+P | next / previous match |
| Enter / Shift+Enter (in the field) | search, then next / previous match |
| Esc | close a window of the panel |

Change them in `chrome://extensions/shortcuts`.

## Your data

Everything is stored in this Chrome profile only (`chrome.storage.local`). Nothing is ever sent.

| Key | What |
|---|---|
| `pns_v3` | settings, active search, folders, saved searches, local marks, journal PIN (salted SHA-256 hash only) |
| `pns_journal_v1` | scan journal (20 scans, 30 days) |
| `pns_state_v1` | 2.x settings: read once to migrate, then left untouched |

**⚙ → My data** shows what is stored and the counters, exports one backup file (`format: 1`: searches, folders, marks, journal — never the PIN), imports one (merges without duplicates; refuses invalid files and files from a newer format), clears the journal, or erases everything.

The **journal PIN** is a comfort lock, not encryption: it hides the journal in the panel, but someone with access to this computer's Chrome profile could still read the data.

## Privacy

- No network requests, no analytics, no account, no remote fonts or scripts. The code is plain, unminified JavaScript — read it.
- Permissions: `storage` (your data, on this computer) and `sidePanel`. Unchanged since 2.x. It only runs on `web.grindr.com`. The "other tab" warning uses a message port between the page and the extension's own service worker: no `tabs` permission, no host permission.
- It never clicks, likes, favorites or messages anyone for you.

## Updating without losing anything

Download the new zip and **unzip it over the same folder** (replace the files), then click ↻ on the extension's card in `chrome://extensions` and reload your Grindr tab. Do not remove the extension: removing it deletes its data. Your 2.x searches (up to 3), current search, tab, language and settings move to 3.0 automatically and the panel says *Your searches were kept*. *What's new* is shown once.

Chrome ties an unpacked extension's data to its ID, and that ID comes from the folder's location. Keep the same folder and nothing is lost. If you ever move the folder, export a backup first (⚙ → My data) and import it after.

## Grindr chat got disconnected?

Some people report that the chat on Grindr Web disconnected after a long scan. We could not reproduce it ourselves and do not know the exact cause, so we cannot promise it is fixed. What helps:

- Reload the Grindr tab (⌘R / Ctrl+R). You stay signed in.
- For long chats, use the Grindr phone app, a Chrome window without the extension, or turn the extension off in `chrome://extensions` and reload.
- Keep *Scan speed* on **Gentle** (default) and the scan time limit on.

## Changelog

### 3.0.0
- **Clearer panel**: three numbered, collapsible steps (① Search, ② Scan, ③ Results), one open at a time; rare settings moved to **⚙ Settings & About**; small *by Fluidz* link in the header; empty state with two ways forward.
- **Search**: criteria with synonyms `(a, b) + (c, d)`, named criteria, exclusions `-word`, whole word `=word` (default stays *contains*), saved searches as blocks `@"name"`. *Active search [Edit]* summary. **?** help with clickable examples and keyword ideas. 2.x syntax unchanged.
- **Search editor** (overlay): chips per criterion, *and also* / *or else*, per-chip whole-word toggle, *Without*, saved searches as blocks, live preview, Cancel / Save / Search.
- **Saved searches**: unlimited, in collapsible folders, pin, rename, duplicate, move, delete, combine (AND / OR). Your 2.x searches are migrated automatically.
- **Scan journal** with continuous autosave (20 scans, 30 days), **Find again** (thumbnail id, then name — a lead, not a guarantee), **compare two scans**, **hide already seen** with a *new since last time* counter.
- **Local marks** *To review* / *Ignore*, **discreet mode**, **journal PIN** (comfort lock), **My data** screen, one **backup file** (format 1) with export / import, erase everything.
- **Safety**: scan time limit (default 30 min), warning when Grindr Web is open in another tab, pause + *Resume* when Grindr crashes or empties the grid, interrupted scans offered again after a reload, keyboard shortcuts.
- **Grid self-test** with *Copy the report* (no names, no photos) and a feedback link.
- Discreet coral outline on matches (can be switched off). Welcome tour gets a step 1 *Get your grid ready*. *What's new* shown once after the update. All 6 languages.
- Same permissions as 2.2.1. No network access.

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
- Search field made unmistakable: a visible OR pill between chips, a coral AND badge inside a chip (`dom + top`), and a live line under the field ("Looking for: dom AND top OR xxl", with a hint while a trailing `+` waits for the next word). A comma, `;`, `|` or Enter start a new OR chip, `+`/`＋` is AND, quotes keep a phrase (even `"c++"`) as one term. A pasted list like `top, dom; dom + xxl` is split into chips. Click a chip's text to edit it (× still removes it).
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

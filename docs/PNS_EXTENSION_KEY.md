# Profile Name Search — fixed extension ID (manifest "key"): prepared, NOT shipped in 3.0.0

## Why it is not in 3.0.0
Experiment run on real Chromium (persistent profile, `--headless=new`, `--load-extension`, same folder each time),
script `scripts/pns-tests/key-experiment.cjs`:

| Step | Extension ID | Saved data visible? |
|---|---|---|
| 1. loaded without key (like 2.2.1 today), data written | jelkheggmfikdnafljocjfopggfhjlmp (from the folder path) | yes |
| 2. relaunched, still no key (control) | same | yes |
| 3. same folder, manifest now has `key` | **aicmgfcppldogbibmhbiamohnijmohgg** (from the key) | **no** |
| 4. key removed again | back to the first ID | yes (old data still there) |

So adding the key to an existing unpacked installation **changes its ID** and the extension starts with **empty storage**
(the old data stays in the profile under the old ID, but the extension can no longer read it). Shipping the key in 3.0.0
would have made every 2.x user "lose" their saved searches. Rule of the brief applied: key prepared, not shipped.

Today the ID of an unpacked install comes from the folder path, so updating by unzipping over the same folder already keeps
the ID and the data. The key only matters if a user moves the folder, or for a future Chrome Web Store / packed version.

## The prepared key
- Public key (this is what would go into `manifest.json` as `"key"`):

```
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr7ejrhlJ0QBCrf03n5zPYS7maqm4jWE4jKgXawI8DJqkd71Xz9ybRBVgOvt+LVudDPG0F8k2DX2SgP0Vc8jbi3+9Xf2xciNxg83Q/D+6xOVEcMdgL6BBEsgFvr10dX+0DzHxVtiioLmD5++wk5ioVwkTY2+F6wwDKejFr6tWon5kKfx4zzTm8bvDzlubBcAIfLQgeC6y2WeP5v1m3FucN8aB3OF/VsyUoJvkyMyynF49twbowXny2BqkU+CPPHlcS51ePjrPbVgWGUibGsqMwVvUYL53rqKBK6dDyEsO1G51xhwp6CpXaHIbHRpGa2sz1EWJdfA8VN0bkiO6FOGKGQIDAQAB
```

- Resulting fixed ID: `aicmgfcppldogbibmhbiamohnijmohgg`
- The private key is NOT in the repo (only needed to pack a .crx; not needed for "Load unpacked", not used by the Chrome Web Store,
  which assigns its own key). A copy was left outside the repo on the build machine: `/tmp/claude-0/ext3-key/pns-private.pem`
  (temporary folder: move it somewhere safe or regenerate it later).

## How to switch to the key later without losing data (suggested)
1. 3.0.0 ships the backup file (⚙ → My data → Export a backup) and *What's new* already tells users to export one.
2. The version that adds the key must say so loudly in its *What's new* and on the download page: "export your backup before
   updating, then import it after". Import merges without duplicates, so doing it twice is harmless.
3. Alternative: switch only when moving to the Chrome Web Store (a new install anyway), with the same backup/import path.

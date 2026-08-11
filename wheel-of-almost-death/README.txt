# Wheel of Almost Death

A standalone, installable PWA. Works offline after first load.
Loaded with the ACTIVE exposure list. Passives are deliberately not on it —
they're situational, not spinnable.

## What it does

- Spin. The wheel picks, because choosing is the compulsion.
- The verdict shows the exposure, and the response prevention under
  "NO MATTER WHAT" — the neutralizer you don't get to run.
- SUDS: each item shows how it felt LAST time. Do it, enter the new number,
  and it replaces the old one. The small arrow next to it shows the direction
  of the change, which is the whole point of tracking it — you want to watch
  the number come down on repeats.

## Deploy to arrosho.com/wheel-of-almost-death

1. In the GitHub repo that serves arrosho.com, create a folder named exactly
   `wheel-of-almost-death` at the repo root.
2. Drop `index.html`, `manifest.webmanifest`, `sw.js`, and the three
   `icon-*.png` files inside it. All four icons/files sit flat in that folder —
   there is no `icons/` subfolder.
3. Commit and push. Live at https://arrosho.com/wheel-of-almost-death/

Every path is relative, so the folder name is the only thing that has to match.
If you rename the folder, update the `"id"` field in `manifest.webmanifest`.

## Notes

- Everything is saved in the browser on that device. Nothing is sent anywhere.
  That matters here — the list is clinical.
- Storage key is `woad.v2`. The v1 key held a plain list of strings and is not
  read anymore, so the old generic wheel's options won't carry over.
- To ship an update, bump `VERSION` in `sw.js` (e.g. `woad-v3`) so installed
  copies pull the new files instead of serving the cached ones.
- HTTPS is required for install + offline. GitHub Pages gives you that.
- "Reset to default list" restores the nine active exposures and clears SUDS.

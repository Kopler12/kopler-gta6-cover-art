[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Kopler12/kopler-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Kopler12/kopler-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# VICE HEAT — GTA-style Cover Maker

Turn any photo and a caption into cover art in the style of GTA 6 posters: a
multi-panel poster with tilted white-framed panels, a retro sunset sun, palm
silhouettes and bold condensed lettering, exported as a PNG to share. It runs
entirely offline in a desktop browser from its own static files — your photos
never leave your machine.

## What it does

- **Your photos, your way** — drag and drop a photo (or pick a file), or start
  with the two built-in sample photos. Each panel takes its own photo, so one
  cover can mix several shots.
- **Multi-panel layouts** — Classic (hero + two), Duo, Solo full-bleed, and
  Quad. Panels are tilted a few degrees and framed in white, pasted-poster
  style.
- **Crop and position per panel** — click a panel to select it, drag its photo
  to pan, scroll to zoom, or use the zoom and pan sliders. Reset a crop, or
  fill every panel with one photo in a click.
- **Caption lettering** — an editable title and subtitle in bold condensed
  capitals with a thick outline and a sunset gradient fill, drawn on canvas.
- **Colour grades** — Vice City Sunset, Neon Night, and Pastel Day. Each one
  regrades the sky, the sun, the title and the photos.
- **Poster dressing, drawn in code** — a striped retro sun, palm silhouettes
  flanking the title, a skyline along the foot, halftone dots, film grain and
  a vignette. No Rockstar logo, artwork or font anywhere: everything is
  original, drawn by this app.
- **One-click export** — PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080, or
  all three sizes at once.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome. No build step, no
network: every file the app loads is under `app/`.

## How it is built

- `app/index.html` — the studio shell: controls on the left, live preview
  on the right.
- `app/style.css` — the dark studio theme and the full-frame cover mode.
- `app/src/cover.js` — the cover engine: layouts, grades, the retro sun,
  palms, skyline, halftone, grain, vignette and the title lettering, all
  drawn on a 2D canvas at any size.
- `app/src/main.js` — the editor: photo loading, layout/grade/caption
  controls, drag-to-pan and scroll-to-zoom on the preview, PNG export.
- `app/src/shots.js` — the deterministic `?shot=` demo states the
  screenshots use: `shot=cover` draws the cover full-frame, `shot=editor`
  shows the full studio.
- `app/samples/` — two sample photos made for make.fun, free to use.
- `main.ts` — the entry program (Node 22, standard library only): copies
  `app/` and `screenshots/` to the output directory and writes
  `dossier.json` with `vendor/makefun-app.ts`.

## Screenshots

`screenshots/` holds four JPEGs: the wide cover first, then the editor with a
photo loaded, a neon duo cover, and the portrait cover. They are taken with
headless Chromium from the app's own `?shot=` demo states (see `shots.json`).

## License

MIT — see [LICENSE](LICENSE).

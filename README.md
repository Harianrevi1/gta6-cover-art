# Neon Coast Cover Studio

[![Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Harianrevi1/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Harianrevi1/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn any photo into GTA-style poster cover art — offline, in your browser.
Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty on make.fun.

## What it does

Pick a photo (or one of the bundled samples), choose a poster layout, pick a
Vice City colour grade, write your title and subtitle — and export a
share-ready PNG. The whole thing runs as static files: photos are read on
your machine and never uploaded anywhere.

- **6 layouts** — four-panel grid, hero-and-three, full bleed, tilted
  snapshot, nine-panel grid, triptych strip
- **5 gradient-map grades** — Vice Sunset, Neon Pink, Teal Night, Gold Hour,
  Noir — plus grain and vignette sliders
- **Poster lettering** — big Anton display title with a sunset gradient fill,
  Pacifico script subtitle, badge ribbon, and a 0–5 star heat meter
- **Drag & zoom per panel** — drag a panel to reposition its photo, scroll
  to zoom; one photo can fill every panel or each panel can hold its own
- **Undo / redo** — full history (Ctrl+Z / Ctrl+Y)
- **4 export sizes** — 1080×1080, 1080×1350, 1080×1920 (story), 1920×1080

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json`.

## Originality

No Rockstar Games logo, wordmark, official artwork, character, or game font
is used anywhere. The display fonts (Anton, Pacifico) are SIL Open Font
License files bundled under `app/fonts/` — see `app/fonts/OFL.txt`. The
sample photos are either the kit's free-to-use samples or procedural art
generated for this entry.

## License

MIT — see [LICENSE](LICENSE).

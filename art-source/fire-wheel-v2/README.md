# Fire wheel material source

The original generated texture and its exact prompt/request are retained here. The source is original session-generated artwork; no third-party license is asserted. The published atlas provenance is in `dist/assets/battle/fire-wheel-v2/SOURCES.json`.

`tools/art/fire-wheel-author.mjs` preserves the accepted Artv2 texture projection, two large distance-driven currents and reduced-motion variant. It authors 128 phases per rotation. To add phases, change `MATERIAL.frames` in that offline author and update `FIRE_WHEEL_MATERIAL` in `dist/fire-material.js` to match. The original texture can be reused without generating another image.

From the repository root, bake into a development output directory, then encode at the reviewed Q85 colour quality with exact alpha:

```powershell
node tools/art/bake-fire-wheel.mjs C:/path/to/private-bake
python tools/art/encode-fire-wheel.py C:/path/to/private-bake C:/path/to/private-encoded --quality 85
```

The reviewed environment uses Pillow11.2.1/libwebp1.5.0. The baker records source/module hashes and exports `normal.png`, `reduced.png` and `bake.json`. The encoder preserves every alpha pixel while compressing RGB with loss; it writes two WebP files and `encoding.json` with source/decoded colour and alpha hashes. Changing codec, quality, dimensions or frame count needs a comparison at game size and DPR3 before copying reviewed assets into the published directory. Source PNG texture and author remain available for new frames. The game loads finished atlases; it never runs either authoring step.

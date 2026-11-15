# Fire wheel material source

The original generated texture and its exact prompt/request are retained here. The source is original session-generated artwork; no third-party license is asserted. The published atlas provenance is in `dist/assets/battle/fire-wheel-v2/SOURCES.json`.

`tools/art/fire-wheel-author.mjs` preserves the accepted Artv2 texture projection, two large distance-driven currents and reduced-motion variant. It authors 128 phases per rotation. To add phases, change `MATERIAL.frames` in that offline author and update `FIRE_WHEEL_MATERIAL` in `dist/fire-material.js` to match. The original texture can be reused without generating another image.

From the repository root, bake into a development output directory, then encode losslessly:

```powershell
node tools/art/bake-fire-wheel.mjs C:/path/to/private-bake
python tools/art/encode-fire-wheel.py C:/path/to/private-bake C:/path/to/private-encoded
```

The development environment needs Playwright/Edge and Pillow with WebP support. The baker records source/module hashes and exports `normal.png`, `reduced.png` and `bake.json`. The encoder checks every RGBA pixel and writes two WebP files plus `encoding.json`. Compare the resulting frames at game size and copy only reviewed WebP assets into the published directory. The game loads finished atlases; it never runs either authoring step.

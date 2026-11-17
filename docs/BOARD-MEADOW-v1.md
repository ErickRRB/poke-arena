# Meadow scenery prototype

`dist/arena-scenery.js` composes the floor into the renderer's existing background cache. It is presentation only: the arena tilemap, tower anchors, river, bridges, deployment rules and camera are unchanged.

The second composition uses `assets/battle/arena-meadow-ground-v3.webp`, a new bitmap made with the built-in imagegen tool. Its complete prompt, original PNG, source roles and checksums are kept in `tools/art/board-meadow/`. The existing PMD TownBase image was a pixel-style reference and the existing ground image was a reference for the sparse floor being replaced; neither was modified. The new bitmap contains floor only. It adds no river, path, structure or game obstacle.

The grass fallback and dirt sample reuse `assets/battle/arena-ground-v2.webp`, already shipped in the public 3def renderer. The original canvas path network has narrower King approaches and varied trail contours. The first composition's procedural flowers and broad uniform dirt ring were removed after Root found that the result still looked too sparse. The existing perimeter assets keep their PMDCollab provenance recorded in `assets/battle/manifest.json` and its README.

The painter runs only from `buildBackground` at initialisation, asset load or resize. Its deterministic, world-anchored details are flattened at two world pixels per sample into the existing cached layer. River drawing and all combat layers continue through their original code.

The final path treatment uses a cache-time alpha mask: variable soil wear and rough, feathered verges mix the old dirt texture into the unchanged meadow. Reclaimed stretches keep the slim King approaches from becoming a continuous dirt ring. The mask reads its own transient dirt canvas once per background build; it adds no per-frame pixel reads.

Held circular spell previews use the existing `emphasis` option in `areaGuide` for a diffuse dark backing and a brighter soft rim inside the original radius. The default guide and the active-field, travel and cell helpers are unchanged. A larger earthquake preview in both affordable and insufficient-energy states is the extra shared-helper review case.

The repeated wooden fence is replaced with low mossy stone/leaf/flower edging and fuller corner gardens from `arena-meadow-border-v1.webp`. Its original transparent sheet, prompt, actual crops and checksums are stored beside the ground source. Native outer canopy remains behind it. An even-odd clip excludes the exact playable ARENA rectangle from all perimeter painting, so decorative volume cannot occupy a legal cell. Water/bridges are painted through their unchanged later layer. This perimeter is also cached; it adds no per-frame work or DOM.

The first review uses the existing workbench with `tools/review/board-meadow.case.json`. Its adapter declares its native spawn positions, disabled AI, starting hand and muted sound. It retains the App clock, native attacks, health, tower positions and actual hand/pointer placement preview. This is local scenery composition evidence and does not approve gameplay balance, audio, physical devices or animation cadence.

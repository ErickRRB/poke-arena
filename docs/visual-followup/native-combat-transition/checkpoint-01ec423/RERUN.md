# Repetición acotada después de una corrección

Las 23 claves de `affected-contact-keys.json` tienen diferencias de dibujo reales al entregar `attackRelease` mediante `publicSnapshot` a 15 Hz. La selección excluye diferencias de índice con RGBA idéntico. Se agregan Ampharos y los otros dos guardias como controles; no se repite la auditoría de tamaños o cámara.

## Congelar un commit antes de medir

Ejecutar desde la raíz de `pokemon-arena-search-timer`. Reemplazar únicamente el SHA por el commit que contiene la corrección. El guion usa `git archive` de ese commit y comprueba sus módulos; no toma el working tree.

```powershell
$nativeAfter = '2ccd1df'
node scripts/inventory-native-checkpoint.mjs "--candidate-ref=$nativeAfter"
$nativeAudit = "docs/visual-followup/native-combat-transition/checkpoint-$nativeAfter"
$nativeContactKeys = (Get-Content -Raw -LiteralPath 'docs/visual-followup/native-combat-transition/checkpoint-01ec423/affected-contact-keys.json' | ConvertFrom-Json).selector + ',ampharos'
```

## Contacto, cadencia y emisores

Ocho vistas; tres ciclos automáticos y un ataque directo; motor local a 30/60 Hz y `publicSnapshot`/eventos públicos a 15 Hz con Renderer a 60 Hz. El guardia 34 ya está en las 23 claves; el runner agrega 31 y 52. Son 26 claves con controles.

```powershell
node scripts/qa-native-contact-browser.mjs "--inventory=$nativeAudit" "--keys=$nativeContactKeys" --directions=all --name=browser-contact-after
node scripts/qa-native-contact-browser.mjs "--inventory=$nativeAudit" "--keys=$nativeContactKeys" --directions=all --modes=public15 --team=1 --name=browser-contact-after-viewer1
```

La primera ejecución cubre la perspectiva 0 y los controles locales; la segunda aplica la transformación real de perspectiva 1 a snapshots y eventos. No hace falta duplicar los controles locales bajo una etiqueta de perspectiva.

Revisar `summary.json`: `missingContactRasters`, `markerFindings`, `earlyReleases`, `lateReleases`, `clockRewinds`, intervalos y recuperación final. Los archivos `traces/*.json.gz` conservan cada muestra y los eventos. Un cambio de índice con RGBA idéntico no se considera pérdida del contacto.

## Repro visual pequeño del rey 34

```powershell
node scripts/qa-native-contact-browser.mjs "--inventory=$nativeAudit" --keys=tower-34 --extra-guards=0 --modes=public15 --team=both --capture=1 --name=repro-king34-after
```

Produce cuatro casos (automático/directo por dos perspectivas) y láminas antes/durante/después de la entrega. `verboseSources` conserva el attacker completo, `card`, `guard` y el orden de entrega de los eventos.

## Origen físico de los proyectiles

La corrección del contacto del Renderer no corrige por sí sola el origen que guarda Game. Después del commit del motor, repetir por separado:

```powershell
node scripts/qa-native-contact-browser.mjs "--inventory=$nativeAudit" --keys=beedrill,treecko --extra-guards=0 --modes=local30,local60 --directions=all --triggers=direct --distance=60 --draw-projectiles=1 --capture=1 --name=repro-flight-source-after
```

El objetivo a 60 unidades mantiene visible el proyectil. Amarillo indica el marcador de la pose efectivamente dibujada; cian, el origen guardado; rojo, el centro que dibuja `Renderer.projectile`. Comparar `frames[].projectiles[].launch`, `drawMarker.expected` y `projectileDraws`, además de los PNG ampliados. El bob de un volador y el redondeo de raster son distintos de cambiar de marcador entre preparación y contacto.

## Una sola URL de engine

El runner lee los imports de `render`, `snapshot`, `online-wire` y `spell-preview`, comprueba que usan la misma referencia de engine y adopta esa URL en el harness. Interrumpe antes de medir si el grafo mezcla referencias. Los reportes nuevos registran también las URL de engine solicitadas por el navegador. No cambiar cachebusters en un probe para ajustar números.

Los guiones sólo escriben sus cachés y carpetas nuevas de evidencia. No modifican runtime, colisiones, escalas ni tests cerrados. Estas pruebas aisladas no simulan jitter de red ni certifican la cámara o la fluidez visual completa del catálogo.

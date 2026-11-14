# Origen físico en 8172b58: persiste

Se congeló `8172b584dbf10acb7d663ba12371e10cda2c6e39` desde Git y se repitieron **sólo Treecko y Beedrill**, local30, ocho direcciones: 16 casos y 16 releases. Se usó una única URL de engine, `/frozen/engine.js?v=26`, compartida por el harness, Renderer, snapshot y online-wire. No se usó WIP ni se modificó balance o runtime.

El origen guardado del proyectil sigue correspondiendo al frame de preparación anterior, mientras el cuerpo ya muestra el contacto. El marcador visual coincide con el dibujo; el proyectil conserva la fuente anterior mediante `liftX/Y`.

| Vista sur, release .500 s | Treecko | Beedrill |
|---|---|---|
| Pose usada por la fuente | Appeal5, edad .466667 | Attack4, edad .466667 |
| Pose dibujada | Appeal6 | Attack10 |
| Origen guardado | (287.2497, 584.4163) | (286.3446, 575.3102) |
| Marcador del frame dibujado | (291.8338, 597.501) | (287.3108, 584.3114) |
| Distancia entre ambos | 13.864 unidades | 9.053 unidades |
| Primer centro real del proyectil | (289.737563, 581.454252) | (290.78538, 596.347533) |

En ocho vistas, Treecko registra 11.754–13.864 unidades de diferencia y Beedrill 2.180–9.053. Los 16 primeros centros dibujados coinciden con la trayectoria desde el origen guardado, con error menor a .00001. Las coordenadas se midieron nuevamente en este checkpoint; no se reutilizaron expectativas numéricas del corte anterior.

`physical-verification.json` es el resultado de esta comprobación física. El `summary.json` genérico del runner muestra cero diferencias de raster o del marcador visual: esas comprobaciones no comparan el origen físico guardado y no deben interpretarse como una corrección del fallo.

Las láminas de `physical-recheck/contacts` incluyen ocho vistas por especie, ampliadas 2×. Amarillo marca el emisor del contacto efectivamente dibujado, cian el origen guardado y rojo el centro real del proyectil. Se inspeccionaron las dos láminas sur; las otras vistas se comprobaron mediante sus mediciones. El objetivo pasivo resistente está a60 unidades para que el proyectil permanezca visible.

Se verificaron 780 archivos servidos contra los objetos Git. Los binarios coinciden byte por byte; la única normalización del texto exportado es CRLF→LF. Los hashes de los bytes usados, las fuentes del fixture y las trazas completas permanecen junto al reporte.

El código de este corte todavía llama `emissionPoint(actor,shot)` desde `muzzle`, y drena los releases vencidos antes del decremento del reloj del actor. Los registros de origen añadidos no cambian el resultado medido. La corrección queda a cargo del motor; esta revisión no modifica engine ni Renderer.

Repetición exacta desde la raíz del worktree:

```powershell
node scripts/inventory-native-checkpoint.mjs --candidate-ref=8172b58
node scripts/qa-native-contact-browser.mjs --inventory=docs/visual-followup/native-combat-transition/checkpoint-8172b58 --keys=beedrill,treecko --extra-guards=0 --modes=local30 --directions=all --triggers=direct --distance=60 --draw-projectiles=1 --capture=1 --name=physical-recheck
node docs/visual-followup/native-combat-transition/checkpoint-8172b58/verify-physical-recheck.mjs
```

No se repitieron la QA global de contactos, las otras cartas, cámara, escalas ni partidas online.

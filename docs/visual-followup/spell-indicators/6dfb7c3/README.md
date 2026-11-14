# Indicadores de los trece hechizos

[Visor](index.html) · [Resumen](summary.json) · [Trazas y fuentes](verification.json)

Corte inmutable **6dfb7c3b05a9e0a7bfb37e717d471bf3bfeefb4a**, capturado 2026-11-14T21:43:07.230Z. Pasan **1319/1319 comprobaciones medidas**: 1.170 de render/física, 78 de ratón/teclado, 65 de touch real y 6 de textura/traza. Hay 78 combinaciones de hechizo/perspectiva/tamaño, sobre 390×844, 768×1024 y 1440×1000, con Game a 30 Hz, snapshots a 15 Hz y muestras del Renderer a 60 Hz. Las 53 regresiones unitarias nuevas también pasaron en este corte.

Mientras se apunta aparece un área por hechizo; Log conserva sólo su ancla y enemigos válidos tintados. Al salir, cancelar o lanzar, las llamadas a areaGuide/cellGuide/travelGuide son cero. Se cuentan directamente con instrumentación de la respuesta de targeting-art.js; los bytes originales del producto y los instrumentados tienen hashes separados. Las pruebas táctiles usan CDP y observan el estado después del handler nativo de pointermove.

| Clave | Comprobaciones de render | Guías tácticas postimpacto |
| --- | --- | --- |
| thunder | 90/90 | 0 |
| fireball | 90/90 | 0 |
| log | 90/90 | 0 |
| sneaselAmbush | 90/90 | 0 |
| pinMissile | 90/90 | 0 |
| lightning | 90/90 | 0 |
| hyperBeam | 90/90 | 0 |
| blizzard | 90/90 | 0 |
| spikes | 90/90 | 0 |
| stealthRock | 90/90 | 0 |
| whirlpool | 90/90 | 0 |
| nightmare | 90/90 | 0 |
| earthquake | 90/90 | 0 |

Los cinco campos persistentes conservaron agua, púas, rocas, niebla y terremoto, su duración y su medidor. No queda areaGuide en field(). Los impactos transitorios, las invocaciones y el recorrido físico de Log siguen presentes. El payload físico de cada cast es idéntico antes/después de dibujar. Log se comprueba por travelRemaining, distancia e impactos durante la rodadura; no se exige una explosión o spellHit al final que el motor no emite.

## Esfera V3 realmente cargada

El recurso es **assets/battle/pokeball-material-classic-v3.svg**, HTTP200 y SHA-256 `4162fe190b18d8bd13770abd60ca7ec89799887930c7624ee4c89f9aa0de2ceb`. La imagen está completa, la textura 512×256 existe y difiere en 0 canales de los píxeles muestreados del SVG. Esa misma textura está ligada a cada dibujo de las cápsulas de ambos bandos; no se usa el fallback.

[Primer tramo](frames/sphere-before.png), [tramo medio](frames/sphere-middle.png) y [último tramo antes del impacto](frames/sphere-arrival-before-impact.png) son frames del Game/Renderer reales. La comparación con la traza histórica usa la misma trayectoria y pausa de 1,0–1,4 s: error máximo de posición mundo **0**, edad visual **0**, sin diferencias en el número de dibujos. No compara cámara ni apariencia, ni vuelve a generar el material V2 rechazado.

## Alcance

Este paquete conserva su fuente 6dfb7c3 y sus hashes. La investigación posterior de la X de coordenadas inválidas se registra aparte; estas comprobaciones de área/celda/corredor no afirmaban cubrir ese gesto. No se reetiqueta la captura con un arreglo posterior.

Son escenarios controlados en una app local servida desde el commit, sin jitter de red. Los objetivos quietos usan aturdimiento real; la IA y los ataques de torres se desactivan para aislar el indicador. El HUD exterior conserva el inicio de la app. No se publica nada ni se modifican física, material, fondo, cámara o loader. No hubo errores de navegador ni recursos faltantes; sólo se cargó /engine.js?v=26.

Repetición: node scripts/qa-spell-indicators.mjs --checkpoint=<SHA> --capture. Sin --capture guarda la verificación funcional en qa/. El verificador de documentación es node scripts/qa-spell-report.mjs --checkpoint=<SHA>.

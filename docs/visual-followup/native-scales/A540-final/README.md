# Tamaños sobre la cámara final A540

[Abrir láminas](index.html) · [Mediciones](measurements.json) · [Decisiones](body-measurements.csv) · [Colisiones por separado](collisions-separate.csv) · [Hashes](SHA256SUMS.json).

Fuentes congeladas del commit 6dfb7c3b05a9e0a7bfb37e717d471bf3bfeefb4a, sin cambios después de congelarse. Cámara compartida 540×934, origen (30, −122), proyección uniforme y verticalScale 1. En el viewport 390×844 el canvas mide 370×677 CSS y una celda de 24 u ocupa 16,4444×16,4444 CSS.

El catálogo tiene 124 claves y 110 cuerpos. Se añade el Geodude derivado de una muerte real de Golem: 111 cuerpos, 101 especies, ocho orientaciones y ciclos completos de reposo. El informe registra 65.872 muestras, 5.167 mediciones distintas de raster y otras 12.528 muestras de reposo y ataque de los perfiles prioritarios. Hay 46 láminas: 22 de catálogo y 24 ampliadas. Los 2.578 archivos de entrada incluyen las superficies SVG y los indicadores nuevos.

| Perfil | Escala retenida | Ancho de reposo CSS | Alto de reposo CSS |
| --- | ---: | ---: | ---: |
| Farfetch’d / Caballero | 2.2 | 22–30 | 30–33 |
| Conkeldurr / Lanzarrocas | 2.05 | 34–56 | 41–47 |
| Roselia / Princesa | 1.7143 | 15–33 | 24–25 |
| Nuzleaf / Lanzadardos | 1.55 | 21–27 | 24–31 |
| Ampharos / Tesla | 1.85 | 16–32 | 28–41 |
| Rayquaza | 1.25 | 39–55 | 50–59 |
| Rhydon / P.E.K.K.A. | 2.125 | 36–57 | 39–47 |

Se conservan las escalas revisadas en el catálogo anterior. A540 aumenta uniformemente el tamaño en pantalla un 8,9 % respecto de la cámara 588; Rayquaza usa su pie nativo y escala 1,25, comprobados por separado en movimiento y recuperación. En este corte se revisaron las láminas de ataque en ocho vistas de Ampharos, Farfetch’d, Conkeldurr, Nuzleaf, Roselia y Rayquaza. No se alteraron las demás escalas después de la revisión completa anterior.

Dusclops ocupa 31–37 CSS de alto; sus Duskull 12–15 y Shuppet 15–18. Los pequeños quedan por debajo de la bruja. El Geodude de Golem conserva 1,3 y sigue separado del Caballero de especie 83. Las decisiones de la tabla son revisión visual; no se modifican las mediciones originales ni se deducen radios de colisión desde el dibujo. El tamaño medido no demuestra igualdad de píxeles con Clash Royale ni balance de daño.

Repetición: node scripts/qa-visual-scales-followup.mjs --native-camera --cut=<nombre-nuevo>, con Playwright y Edge instalados. PLAYWRIGHT_MODULE permite indicar su ruta. El script registra hashes de entradas y de sí mismo; usar un corte nuevo conserva las capturas anteriores. El directorio padre documenta la cámara 588 como evidencia histórica; esta carpeta corresponde a A540.

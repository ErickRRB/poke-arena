# Separación de FB26 y FB29 — 2026-11-16

Este ajuste posterior al plan de b686e02 conserva la historia del prototipo d23fe6c. La rama de FB26 parte del plan y restaura el ataque del baseline 219: cambia solamente la ganancia de ciertas voces en eventos deploy. El criterio solicitado de volumen se comprueba comparando la misma grabación con los mismos buses y escena; no demuestra gusto, claridad en todas las mezclas ni calidad perceptual previa. Una escucha independiente puede evaluar esas dimensiones por separado. FB29 permanece abierto para una muestra semántica de madera o vegetal y revisión auditiva real.

La selección preliminar usa RMS de cada MP3, tras recorte al 1,5% del pico, 5 ms de margen inicial y 25 ms final y normalización a pico 0,8; decodificación ffmpeg mono a 44,1 kHz. El umbral de cohorte fue 0,083, cercano al valor de Pikachu, y no es un juicio de sonoridad humana. Hay ocho IDs en la cohorte medida:

| ID | RMS aproximado |
| --- | ---: |
| 23 | 0,04469 |
| 54 | 0,05894 |
| 52 | 0,06694 |
| 252 | 0,06846 |
| 196 | 0,06939 |
| 25 | 0,07979 |
| 27 | 0,08141 |
| 302 | 0,08201 |

Sube 0,22 a 0,264 (+20%) solo en deploy; voces directas, demás voces, música, efectos y ataques mantienen la ruta anterior. El límite de 3 voces no cambia. A pico normalizado 0,8 y sin paneo, una voz aumentada tiene pico teórico de 0,1183 a la entrada del limitador (0,8 × 0,264 × 0,7 × 0,8); tres voces simultáneas tienen cota por suma de 0,3549, sin música ni efectos. Esto no prueba ausencia de saturación en una mezcla densa completa.

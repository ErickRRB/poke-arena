# Auditoría de audio del catálogo

La revisión del 14 de noviembre de 2026 cubre las 121 claves: 108 unidades y 13 hechizos, agrupados en 26 estilos originales. Los resultados corresponden a los hashes guardados en `verification.json`. Las claves de mazo se conservan aunque cambie la especie visible, como `duskull` con Dusclops 356.

Pasaron las 28 pruebas: 18 del catálogo y 10 de recuperación. Se decodificaron por completo con FFmpeg los 124 archivos del manifiesto: 105 voces, 13 Foley y 6 efectos específicos. No faltan voces en las 108 claves de unidad y no hubo errores de decodificación.

| Medición | Antes | Actual |
|---|---:|---:|
| Cartas con salida muda durante la carga | 37 | 0 |
| Cartas con contactos retrasados mudos | 19 | 0 |
| Nodos para la segunda línea simultánea | 0 | 2 |
| Pico FX en estrés sintético | 203 | 23 |
| Límite global FX | Sin límite global | 24 |

El estrés programa 26 familias en ocho ráfagas separadas por 40 ms. Es una prueba de programación de fuentes, no una partida ni una medición de clipping. Otra regresión usa 156 ataques y compara el pico con `MAX_EFFECT_VOICES` exportado por producción. Las voces tienen presupuesto propio de tres, mantienen prioridad con los FX llenos y los nodos finalizados liberan sus espacios.

Las trazas ejecutan el SoundSystem real hasta `output()` y capturan el comienzo de cada fuente con muestra, ganancia, velocidad, duración, paneo y demora. Las escenas controladas prueban las familias de cada clave, aliases, muestras ausentes, mute frío y desbloqueado, contexto interrumpido, explosiones sin voz añadida, entradas, transformación, reflexión, curación agrupada y habilidades. Emboscada Sneasel emite una sola voz al aterrizar la cápsula con sus tres cuerpos.

Estas verificaciones no sustituyen una audición de batalla en el navegador ni permiten afirmar calidad de timbre, balance percibido o disfrute. `remaining-observations.json` conserva decisiones opcionales sobre emergencia, comienzo de campos y carga de hechizos. Los ticks DOT y refuerzos no necesitan una voz por cuerpo.

`catalog.json` contiene las 121 claves y sus eventos reales; `coverage.csv` permite comparar muestras y ganancias. `native-files.json` conserva duración, formato, SHA-256 y resultado de decodificación completa. Esta documentación no incluye copias del material voluminoso de QA.

La investigación y las pruebas no modificaron `audio.js`, el manifiesto ni la lista de suites. Los cambios de runtime pertenecen al integrador. No se publicó el sitio.

# X al salir del área jugable

[Comparación visual](index.html) · [Resumen](summary.json) · [Antes: 6dfb7c3](6dfb7c3/verification.json) · [Después: 5af8a6d](5af8a6d/verification.json)

Se comprobó únicamente Fireball con ratón real en la app local, servida desde cada commit inmutable. El recorrido fue área válida → margen que sigue dentro del canvas → fuera del canvas → Escape. Un segundo probe, rotulado como sintético, conserva una coordenada válida con `inside:false` para verificar el rechazo de un estado viejo. No se repitió la matriz de trece hechizos.

`arenaPoint.inside` usa `inArena`, que describe el área jugable. `pointerleave` responde al límite del canvas HTML. La cámara muestra un margen entre ambos límites; allí el puntero puede seguir en el canvas con `inside:false`.

| Observación | 6dfb7c3 | 5af8a6d |
| --- | --- | --- |
| En el margen: diagonales de la X | 2 | 0 |
| En el margen: arcos de área | 1 | 0 |
| Salir del canvas HTML limpia puntero y dibujo | Sí | Sí |
| Escape cancela | Sí | Sí |
| Coordenada vieja con `inside:false` no dibuja nada | No | Sí |
| Casts, campos o energía gastada durante el gesto | 0 | 0 |

La X anterior son dos líneas de Canvas de 10×10 en `drawPlacement`, desde su rama `!valid`; no es texto «×», un efecto ni un elemento DOM. Las órdenes de trazo y el estado del puntero están en los JSON. La corrección de Root rechaza `inside:false` y excluye la X de los spells inválidos. No modifica destinos físicos, materiales, cámara o fondo.

El gesto local reproduce la X al salir del área jugable mientras se permanece en el canvas. La salida completa del canvas ya limpiaba en el corte anterior. Esto explica la diferencia de límites sin afirmar otra ejecución contra la URL pública V36.

La [matriz de 1.319 controles](../spell-indicators/6dfb7c3/README.md) conserva su fuente anterior `6dfb7c3`, fecha y hashes. Este anexo sólo verifica el gesto posterior sobre `5af8a6d`; no reetiqueta la evidencia previa ni implica publicación.

Repetición: `node scripts/qa-spell-exit-marker.mjs --checkpoint=6dfb7c3 --checkpoint=5af8a6d`. El script lee producto desde Git y guarda cinco PNG por corte, con sus hashes. La comprobación después de cada movimiento espera dos frames reales del navegador.

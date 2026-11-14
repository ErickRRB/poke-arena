# Revisión de escalas del catálogo

Se revisaron las 121 claves del catálogo: 108 cartas con cuerpo, 100 especies y 13 hechizos sin cuerpo propio. Las medidas provienen del alfa de los PNG nativos en ocho direcciones. Los contactos se dibujaron con `Renderer.sprite` en Edge a 390×844; el tablero medido tiene 370 px de ancho, por lo que una unidad del motor ocupa 0,6167 px CSS.

`metrics.json` conserva la rama aislada observada. `integrated-proposed/metrics.json` es una simulación de las 17 calibraciones de `main` (`c617eb1`) más las tres propuestas siguientes y la conservación de Roselia. No se modificó ningún archivo de runtime.

| Especie | Escala integrada de main | Propuesta | Cuerpo máximo propuesto | Motivo |
|---|---:|---:|---:|---|
| Zubat 41 | 1,44 | 1,12 | 28×26,88 u | Los cinco murciélagos frágiles deben distinguirse de los tres Beedrill, que ocupan 36×32,28 u cada uno. |
| Voltorb 100 | 2,625 | 1,875 | 30×30 u | El aumento paralelo lo deja en 42×42 u, casi igual que Electrode (44×44) y que un mago. La unidad de un elixir mantiene una silueta pequeña y visible. |
| Umbreon 197 | 1,5556 | 1,7778 | 42,67×48 u | La calibración paralela deja a Eevee y Umbreon con la misma altura de 42 u. El mini tanque gana una diferencia moderada frente al cuerpo de ciclo. |
| Roselia 315 | 1,5 | **Conservar 1,7143** | 48×36 u | El `Object.assign` final de main pisaría el aumento del padre y devolvería la altura a 31,5 u. |

La comparación directa está en `integrated-proposed/recommendations-comparison.png`. El resto de las ampliaciones de main mejora la lectura de cuerpos únicos pequeños; no se proponen cambios duplicados para Sableye, Grimer, Altaria, Pikachu ni los demás cuerpos ya ajustados allí.

Se conservaron las escalas actuales del resto tras comparar apoyo, luchadores, mini tanques, tanques pesados, voladores, estructuras y todos los despliegues multiunidad. La decisión por cada una de las 108 claves está en `recommendations.json`, campo `allBodyDecisions`. Los trece hechizos se enumeran como efectos sin cuerpo propio; su revisión visual corresponde al inventario de ataques del padre.

Los tamaños del padre están bien encaminados: Rhydon 68×65,88 u frente a Snorlax 67,2×76,8 y Golem 78×78; Roselia 48×36; Dusclops 57,6×54 frente a Duskull 20×20,8. Las estructuras naturales se leen sin base y mantienen una diferencia respecto a la central con plataforma y la compuerta de Tesla.

Estas son calibraciones de función y silueta al tamaño de juego. No representan una medición exacta de píxeles de Clash Royale ni una afirmación de equilibrio competitivo.

Repetición: `node qa/review-all-scales.mjs` y `node qa/review-all-scales.mjs --proposal`. Requieren las dependencias Playwright ya instaladas del worktree principal y un proceso que pueda iniciar Edge.

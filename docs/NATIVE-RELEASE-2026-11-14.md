# Entrega nativa y visual del 14 de noviembre

Esta entrega integra el campo de 18×32 celdas y la cámara A540 en CPU, laboratorio y multijugador. Cliente y servidor usan el protocolo 3. La publicación y sus identificadores se registran fuera de los artefactos de motor para no alterar sus hashes.

| Pedido | Resultado y evidencia |
|---|---|
| 1: continuidad después de destruir una torre | `tests/browser/battle.mjs`: cae una Princesa, despierta el rey y continúa el tiempo de simulación. |
| 2–3: Bandida y retención de objetivos | Preparación, trayecto, segundo blanco válido y básicos cercanos; `catalog-initialization.test.mjs` y [dos embestidas con audio](visual-followup/native-dash/6dfb7c3/README.md). |
| 4: laboratorio | Torres pasivas con recuperación, diez columnas iniciales, presets y espacios libres que esperan al rival, hasta 24 columnas; `tests/browser/sandbox.mjs`. |
| 5: Princesa y tamaño de objetivos | Área nativa y cuerpos/huellas reales; `spell-footprints.test.mjs`, `native-interactions.test.mjs` y [Roselia integrada](visual-followup/native-integrated/6dfb7c3/README.md). |
| 6, 9, 11–12: sprites y animación | [Tamaños de todo el catálogo](visual-followup/native-scales/A540-final/README.md), [cámara/física](visual-followup/native-camera/README.md), esfera [clásica V3](visual-followup/capsule-classic-v3/README.md), Hurt de Golem limitado a muerte/empuje efectivo; Farfetch’d y Conkeldurr con identidades separadas de los tokens. |
| 7–8: umbrales y golpes completos | Básicos activos de al menos 81, Blissey 202, combos como paquete completo; `thresholds.test.mjs` y `catalog-initialization.test.mjs`. |
| 10, 13: interfaz y legendarios | Sin instrucciones visibles añadidas ni activables de legendarios en motor, API, fichas o laboratorio. |
| 14–17: referencias e inventario completo | [Equivalencias de 110 cartas](CARD-EQUIVALENTS.md), [matriz 372](NATIVE-TRADE-MATRIX-2026-11-14.json), [50 originales](ORIGINAL-CATALOG-REVIEW-2026-11-14.md), [valores actuales](BALANCE.md). Incluye Lanzadardos, Cementerio de 12 unidades y Pandilla de 3+3. |
| 18: publicación común | Mismo árbol final en las ramas de código/publicación; servidor compilado con el motor final y comprobación de protocolo 3. |
| 19–20: Tronco y Refugio | Tronco muestra ancla y enemigos rojos sin corredor; Refugio Ralts de 4 independiente del Vivero de 3; [cinco escenas integradas, 306 controles](visual-followup/native-integrated/6dfb7c3/README.md). |
| 21–23: sonido y carga | [Mezcla real de 16 escenas y 131 muestras](audio-feedback-2026-11-14/README.md), retiro de heavy/punch y respaldos genéricos; Pokébolas SVG opacas en todas las rutas; pruebas de carga demorada y posiciones estables. |
| 24–25: esfera y apuntado | [Esfera clásica](visual-followup/capsule-classic-v3/README.md), [13 hechizos y ciclo de apuntado](visual-followup/spell-indicators/6dfb7c3/README.md), limpieza de puntero fuera del campo y `pointercancel`; los campos conservan sus FX sin retículas de destino. |
| 26: tiempo extra y 2×/3× | [Reloj rojo, barra y multiplicador con pausa/movimiento reducido](battle-phase-2026-11-14/README.md), snapshots en ambas perspectivas y rectángulos idénticos en tres tamaños. |

La comprobación de Bola de fuego conserva un radio de 2,5 celdas. El caso de la torre de Princesa y Regice hacia el centro está cubierto en ambos lados, incluyendo objetivos fuera del borde y coherencia del indicador con el daño real. No se aumenta el radio para compensar una proyección deformada.

La matriz contiene 90 tropas y tres estructuras ofensivas contra cuatro referencias: 372 casos. Sus 16 dependencias transitivas incluyen fingerprints normalizados a LF y blobs Git reales. La revisión de originales contiene 45 tropas, tres estructuras y dos hechizos. Los encuentros sin interacción y el empuje posterior se separan del resultado del duelo. Las capturas y mediciones no prueban balance competitivo universal, rendimiento en toda máquina ni igualdad de pathfinding con otro juego.

La suite completa previa tenía 506 pruebas de Node y siete del runtime. Después se añadieron y comprobaron las regresiones del ciclo de hechizos y del HUD; la sección final de renderizado tiene 190 pruebas. La batería final de navegador incluye carga, batalla y laboratorio en 390×844, 768×1024 y 1440×980, además de dos clientes WebSocket reales con despliegue, recarga y desconexión/recuperación sin perder sala. Los controles nuevos del HUD usan fixtures explícitos del reloj; no se presentan como partidas de cinco minutos.

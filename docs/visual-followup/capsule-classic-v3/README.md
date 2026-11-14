# Pokébola clásica V3

El usuario aprobó el movimiento y rechazó el material granulado/crema deV2. El commit99b30d0 reemplaza solamente el material por un SVG opaco con rojo vivo, blanco neutro, banda oscura y botón con anillo gris. Se conserva la proyección esférica del material completo y el mismo algoritmo de giro, eje, reloj, luz, caché, diámetro52, pausa y movimiento reducido. El fallback utiliza la misma paleta.

Es una gráfica vectorial del sistema de código existente; no se generó ni editó un raster nuevo. Root revisó el SVG, fallback y [comparación32/40CSS](99b30d0/comparison.png) y aprobó la presentación para avanzar. [Ciclo de96frames a60fps](99b30d0/material-cycle.mp4). Es una comparación aislada con la texturaV2 auténtica bajo la misma clase, luz y ángulo; no es una grabación pública.

La carga real del SVG se comprueba por separado en el árbol integrado6dfb7c3: HTTP200, textura512×256presente, píxeles muestreados idénticos al recurso y textura vinculada en todas las llamadas de vuelo. La posición/edad coincide exactamente con la traza histórica. Sus capturas e informe se entregan en `docs/visual-followup/spell-indicators/6dfb7c3/`, con la limpieza de indicadores y los13hechizos. Los9controles de vuelo/rotación/pausa/diámetro permanecen aprobados.

Reproducir la comparación con `node scripts/qa-capsule-classic-material.mjs --checkpoint=99b30d0`, Playwright y FFmpeg ya instalados. [Fuentes y hashes](99b30d0/verification.json). El SVG de carga/espera es otro recurso y mantiene sus rellenos opacos; esta entrega corresponde a la esfera que viaja con Sneasel.

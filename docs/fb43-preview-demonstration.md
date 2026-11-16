# Demostración FB43/44/47

Base pública 7283dd297424f39f0cd6c8cfb2aab4af36169200. Log es `log` / nativeReference `Log`, no Barbarian Barrel. `sneaselAmbush` / `GoblinBarrel` produce tres Sneasel. No se encontró BarbarianBarrel en el catálogo de la base.

Comparación directa con módulos de la base extraídos de Git: todos los perfiles CARDS son deep-equal; los productores anterior y nuevo coinciden para diez situaciones (dos equipos, torre, centro y bordes) y la predicción coincide con la producción. El cálculo previo no muta el estado. Evidencia: `qa/barrel-base-compare.json`.

En `qa/preview-enemies/` se capturó a24cc20 con selección controlada y enemigos quietos: Fireball marca una víctima y Log dos en su corredor, dejando sin marca una tercera fuera; vida y posiciones no cambian durante la vista. La pausa limpia los objetivos. El gesto natural emulado de pausa guarda selección y elixir en `qa/preview-safearea/pause-gesture.json`; pausa y reanudación limpian selección y no gastan. El runner táctil adicional con cancelación, incluido pointercancel, está en `.supervision/preview-ui-a24/gesture-mobile`.

La base mantiene visibles las barras de vida sana antes de apuntar: FB42 pertenece a Art y debe integrarse para una demostración final sin barras sanas. Las capturas son navegador emulado y no sustituyen revisión independiente ni dispositivo físico.

El arrastre táctil real emulado en 390 × 844 está registrado en `qa/preview-touch/report.json`: carta Fireball arrastrada al campo, una víctima dentro y otra fuera, vida intacta mientras se apunta y despliegue al soltar en la celda legal (288,292), con gasto de cuatro y limpieza del preview. La captura conserva las barras sanas de la base hasta la integración FB42.

La suite de carga demorada con matriz móvil, tablet, escritorio y horizontal pasó sobre 4d84aaf; el reporte está en `qa/sections/last-report.json`. El primer intento no conectó por aislamiento del servidor y se repitió con servidor y navegador en el mismo entorno.

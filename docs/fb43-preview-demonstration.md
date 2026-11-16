# Demostración FB43/44/47

Base pública 7283dd297424f39f0cd6c8cfb2aab4af36169200. Log es `log` / nativeReference `Log`, no Barbarian Barrel. `sneaselAmbush` / `GoblinBarrel` produce tres Sneasel. No se encontró BarbarianBarrel en el catálogo de la base.

Comparación directa con módulos de la base extraídos de Git: todos los perfiles CARDS son deep-equal; los productores anterior y nuevo coinciden para diez situaciones (dos equipos, torre, centro y bordes) y la predicción coincide con la producción. El cálculo previo no muta el estado. Evidencia: `qa/barrel-base-compare.json`.

En `qa/preview-enemies/` se capturó a24cc20 con selección controlada y enemigos quietos: Fireball marca una víctima y Log dos en su corredor, dejando sin marca una tercera fuera; vida y posiciones no cambian durante la vista. La pausa limpia los objetivos. El gesto natural emulado de pausa guarda selección y elixir en `qa/preview-safearea/pause-gesture.json`; pausa y reanudación limpian selección y no gastan. El runner táctil adicional con cancelación, incluido pointercancel, está en `.supervision/preview-ui-a24/gesture-mobile`.

La base mantiene visibles las barras de vida sana antes de apuntar: FB42 pertenece a Art y debe integrarse para una demostración final sin barras sanas. Las capturas son navegador emulado y no sustituyen revisión independiente ni dispositivo físico.

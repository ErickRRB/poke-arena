# FB43, FB44, FB47, FB49: plan de implementación

Base: 7283dd297424f39f0cd6c8cfb2aab4af36169200. Referencias: A5FA9749 y 9980C158, imágenes originales inspeccionadas el 2026-11-16.

Primera muestra: tropa y cápsula/hechizo en juego real; nombre sin nivel anclado al punto legal, formaciones tomadas del productor Game, sin efectos secundarios, y sólo estructuras con rango. Luego extender a equivalentes efectivos y conservar áreas reales de hechizos y corredor inicial del tronco. Tipografía local licenciada legible, sin estirar. Comparar proporciones normalizadas en viewport equivalente sin alterar colisiones, ni zoom universal, con límites de emulación explícitos. Mantener controles y contenido estables durante estados transitorios y probar cancelación, pausa y pointercancel. Art posee HP y geometría de torres.

Verificación: pruebas placement/rendering pertinentes, demostración nativa móvil y comparación de rectángulos móvil/tablet/escritorio; inspección visual independiente por Root. No implica aprobación perceptual ni prueba en dispositivo físico.

## Corrección de revisión: cápsula junto a torre

La revisión independiente de 74a observó que la etiqueta tapa el primer cuerpo y que el arte de torre reduce su contraste. Mantener las tres posiciones calculadas; separar la etiqueta verticalmente de la formación visible, dar contraste suave al sprite real sin placas ni marcadores, y observar los mismos puntos junto a torre y en terreno despejado a escala CSS. Verificar que el dibujo no modifica HP, no genera salud ni altera el productor; contrastar además la composición con FB42 sin reclamar su aprobación. La predicción describe el estado actual y puede variar al impacto si cambian obstáculos.

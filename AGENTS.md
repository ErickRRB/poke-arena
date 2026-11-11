# Geometría del juego

La arena, la mano y el elixir conservan su tamaño y posición cuando aparecen controles o información durante una partida. Ninguna habilidad, aviso, botón o control transitorio debe crear filas, márgenes o espacio adicional que achique o desplace el tablero.

Los controles de combate transitorios van en `#battle-overlays`, como capas absolutas sobre la arena. Las habilidades aparecen junto al borde inferior, encima de las cartas. La capa deja pasar los eventos en las zonas sin controles. Si hay muchas acciones, se desplazan dentro de esa capa; no agrandan el panel de cartas.

Al modificar esos controles, comparar los rectángulos de la arena, la mano y la barra de elixir antes y después de mostrar una y varias acciones, en móvil, tablet y escritorio. Deben permanecer iguales. Comprobar que los botones sigan siendo accesibles y que los espacios libres permitan tocar la arena.

El mazo se guarda localmente en cada cambio y se restaura al volver a entrar. No reemplazar una selección guardada por el mazo inicial al actualizar el catálogo; migrar las claves y conservar las cartas válidas, su orden y los huecos pendientes.

# Sprites, ataques y voces

La revisión abarca 101 cartas de Pokémon y 93 especies, incluidas variantes e invocaciones. Cada carta tiene un registro en [POKEMON-MOTION-REVIEW.json](POKEMON-MOTION-REVIEW.json) y [COMBAT-VISUAL-REVIEW.json](COMBAT-VISUAL-REVIEW.json).

Los personajes usan los sprites originales de PMDCollab. Se retiraron las seis sustituciones de Showdown que mezclaban estilos y representaban el movimiento con vistas diagonales y reflejos. Charizard, Pidgeot, Dragonite, Lugia, Altaria y Flygon recuperan sus ocho direcciones originales. Los recursos retirados siguen en [sprite-sources](../artwork/sprite-sources/README.md).

Los 23 voladores se comprobaron en ocho direcciones durante 120 momentos por dirección. El movimiento de vuelo mantiene la fase al esperar o recibir un golpe. Charizard y Dragonite conservan las poses disponibles en PMD, cuyo aleteo tiene pocos cuadros. Lugia y Altaria tienen una flotación más sutil. Estos recursos mantienen el estilo y la orientación del juego, aunque su fluidez sigue limitada por los originales. El conteo de cuadros verifica reproducción, no demuestra por sí solo calidad visual. [Comparaciones](flight-review/README.md).

Las capturas del catálogo comparan movimiento y ataque. Los marcadores amarillos señalan cabeza, manos, cuerpo o cañones para revisar la emisión.

| Página | Movimiento | Ataque |
| --- | --- | --- |
| 1 | [Ver](motion-review/movement-1.png) | [Ver](motion-review/attack-1.png) |
| 2 | [Ver](motion-review/movement-2.png) | [Ver](motion-review/attack-2.png) |
| 3 | [Ver](motion-review/movement-3.png) | [Ver](motion-review/attack-3.png) |
| 4 | [Ver](motion-review/movement-4.png) | [Ver](motion-review/attack-4.png) |
| 5 | [Ver](motion-review/movement-5.png) | [Ver](motion-review/attack-5.png) |

Se midió la silueta de cada especie en ocho direcciones. El tamaño de proyectiles, haces y golpes de contacto se calcula a partir de esa silueta y del tipo de ataque. Las variantes pequeñas conservan su escala. Los proyectiles usan sus límites visibles, con el margen transparente eliminado al dibujar. Los disparos de agua utilizan la esfera original de Hidrocañón. Las ascuas y las notas de canto tienen sus propios recursos. Burbujas y otros disparos evitan repetir los cuadros de aparición y desaparición durante el viaje. Las bolas de sombra y otros proyectiles tienen una cadencia visual más pausada. Las áreas de daño mantienen su tamaño y sus reglas. [Ataques renderizados](combat-review/README.md).

Bola de Fuego utiliza un recurso original de Meteorobola de fuego, con una cabeza estable de unas 58 unidades de arena y una estela animada a ocho cuadros por segundo. La orientación sigue la tangente de la trayectoria. Conserva el tiempo de viaje, daño y radio del motor.

Las 93 especies tienen una grabación de voz que el navegador pudo decodificar. Se agregó Forretress y se quitaron los dos tonos electrónicos añadidos a cada despliegue. Un archivo ausente o corrupto deja cargar los demás sonidos. Las pruebas de Safari al volver del segundo plano se conservan. La decodificación y la comparación de fuentes comprueban integridad y procedencia, no equivalen a una escucha humana de cada voz.

Para repetir: iniciar la vista local y ejecutar `node scripts/audit-pokemon-motion.mjs`, `node scripts/audit-flight.mjs` y `node scripts/audit-combat-visuals.mjs`. Usan la instalación de Playwright configurada para las pruebas del proyecto. `python scripts/measure-combat-art.py` vuelve a medir los recursos originales.

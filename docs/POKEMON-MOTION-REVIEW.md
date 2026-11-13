# Revisión de movimiento y ataques

Se comprobaron las 101 cartas de Pokémon, incluidas invocaciones y variantes, que representan 93 especies. El render real recorrió ocho direcciones, 16 momentos de movimiento y 12 de ataque por carta. No aparecieron recursos faltantes ni cuadros vacíos. El informe completo está en [POKEMON-MOTION-REVIEW.json](POKEMON-MOTION-REVIEW.json).

Charizard, Pidgeot, Scyther, Dragonite y Salamence usan bucles de poses originales de `Hop`, elegidas para mostrar cambios en las alas. El anclaje al cuerpo elimina el desplazamiento vertical del salto original. El resto de los aéreos conserva sus cuadros originales de alas o flotación, también cuando espera entre ataques. Las barras de vida respetan la altura de las alas.

Se revisaron las salidas de los ataques desde cabeza, manos, cuerpo y cañones. Se ajustaron, entre otros, los huevos de Chansey y Blissey, el núcleo de Starmie, la gema de Espeon, el pulso de Rayquaza y las hojas de Sceptile. Las capturas de ataque señalan el punto de emisión con un píxel amarillo para la inspección técnica.

Blastoise es una tropa móvil terrestre de cuatro de elixir, con 1.400 PV, alcance de cinco casillas y dos cañonazos de 85 cada 1,8 s. Conserva sus dos emisores y deja de usar plataforma, duración y atracción de estructuras. Su ilustración representa ese rol.

Las estructuras tienen un único presupuesto de vida y duración. La vida baja con el tiempo y con los golpes, y determina el tiempo restante. Se retiró la barra inferior separada y la estela amarilla que podía aparentar una vida completa durante el desgaste natural.

Los números flotantes están apagados inicialmente. Ajustes → Depuración → Mostrar números de daño permite activarlos y guarda la preferencia en el navegador. Las barras de vida y los efectos de impacto permanecen visibles. El aturdimiento al morir de Forretress conserva su control sin el antiguo impacto artificial de 1. Las expiraciones y autodestrucciones dejan de registrarse como ataques contra su propio dueño.

## Capturas del catálogo

Cada página compara tres momentos del movimiento o ataque original. La comprobación automática incluye las ocho direcciones.

| Página | Movimiento | Ataques |
| --- | --- | --- |
| 1 | [Ver](motion-review/movement-1.png) | [Ver](motion-review/attack-1.png) |
| 2 | [Ver](motion-review/movement-2.png) | [Ver](motion-review/attack-2.png) |
| 3 | [Ver](motion-review/movement-3.png) | [Ver](motion-review/attack-3.png) |
| 4 | [Ver](motion-review/movement-4.png) | [Ver](motion-review/attack-4.png) |
| 5 | [Ver](motion-review/movement-5.png) | [Ver](motion-review/attack-5.png) |

Para reproducir, iniciar la vista local y ejecutar `node scripts/audit-pokemon-motion.mjs`. Usa la misma instalación de Playwright que las pruebas de navegador.

# Revisión de voladores

Se revisaron los 23 voladores con el render real en ocho direcciones y 120 momentos por dirección. Ninguno mostró cuadros vacíos ni recursos ausentes. [Informe](../FLIGHT-MOTION-REVIEW.json).

Charizard, Dragonite, Pidgeot, Lugia, Altaria y Flygon usan ciclos completos de vuelo de Showdown. Los GIF originales están conservados en `artwork/sprite-sources`, junto con su procedencia y el importador. La animación continúa al atacar y recibir golpes. Las vistas originales frontal y posterior, con sus reflejos, representan cuatro orientaciones visuales.

[Ver un ciclo de Charizard capturado del render de la arena](charizard-flight.gif).

Se conservaron las animaciones de PMD donde la alternativa no mejoraba el aleteo o la flotación. Las comparaciones de Salamence incluyeron Showdown y Pokémon Ranger. Sus recursos de movimiento de PMD ofrecen más variación visible de alas que esas alternativas.

Cada fila muestra cinco momentos hacia arriba y cinco hacia abajo. Estas tiras permiten comparar poses, pero la comprobación del ciclo completo se hace en el juego y en las pruebas del render.

- [Zubat, Charizard, Magnemite, Scyther, Butterfree y Beedrill](fliers-1.png)
- [Pidgeot, Gastly, Koffing, Gyarados, Articuno y Zapdos](fliers-2.png)
- [Moltres, Dragonite, Crobat, Skarmory, Lugia y Ho-Oh](fliers-3.png)
- [Flygon, Altaria, Salamence, Rayquaza y Celebi](fliers-4.png)

Para repetir la revisión, iniciar la vista local y ejecutar `node scripts/audit-flight.mjs`, con la misma instalación de Playwright que usan las pruebas de navegador.

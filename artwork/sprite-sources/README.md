# Sprites de vuelo

Las carpetas `charizard`, `dragonite`, `pidgeot`, `lugia`, `altaria` y `flygon` conservan los GIF originales de Pokémon Showdown, descargados el 13 de noviembre de 2026.

Origen: [Pokémon Showdown / Smogon Sprites](https://github.com/smogon/sprites).

Por especie, `front.gif` corresponde a `https://play.pokemonshowdown.com/sprites/ani/<especie>.gif` y `back.gif` a `https://play.pokemonshowdown.com/sprites/ani-back/<especie>.gif`.

Los gráficos originales de Pokémon pertenecen a Nintendo, Creatures y GAME FREAK. La atribución del repositorio de sprites se conserva mediante el enlace anterior.

`python scripts/import-flight-sprites.py` copia cada cuadro completo a una lámina PNG con ocho columnas, sin dibujar, interpolar, filtrar ni modificar sus píxeles. Los checksums de los GIF, las dimensiones y la cantidad de cuadros quedan en `dist/assets/battle/flight-atlases.js`.

El juego usa las vistas frontal y posterior originales y sus reflejos horizontales para las cuatro orientaciones visuales. Las ocho direcciones de movimiento del motor se mantienen. El aleteo continúa durante movimiento, espera, golpes y ataques. Los perfiles de `dist/flight-motion.js` fijan la escala y la posición de la boca en esas láminas.

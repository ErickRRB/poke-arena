# Archivo de sprites de vuelo

Las carpetas `charizard`, `dragonite`, `pidgeot`, `lugia`, `altaria` y `flygon` conservan los GIF originales de [Pokémon Showdown / Smogon Sprites](https://github.com/smogon/sprites), descargados el 13 de noviembre de 2026. `front.gif` proviene de `https://play.pokemonshowdown.com/sprites/ani/<especie>.gif` y `back.gif` de `https://play.pokemonshowdown.com/sprites/ani-back/<especie>.gif`.

Las láminas PNG retiradas están en `retired-atlases`, junto con sus metadatos, checksums de origen y el perfil que las utilizaba. `charizard-showdown-demo.gif` conserva la demostración anterior. El juego utiliza los sprites de ocho direcciones de PMDCollab.

`python scripts/import-flight-sprites.py` vuelve a desempaquetar los cuadros originales en esa carpeta de archivo. Conserva sus píxeles y sus secuencias, sin modificar los recursos activos del juego.

Los gráficos de Pokémon pertenecen a Nintendo, Creatures y GAME FREAK. Las ilustraciones antiguas de cartas se conservan por separado en `artwork/imagenes-viejas`.

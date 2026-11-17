# Audio: ataques suaves y voces al comenzar

Base publica ad102a2cffb9cd13d2db06bf4169a5a61a7d08d8. Farfetch'd conserva PCM y timing aprobados, con ganancia de cue +20%; las fases de lanzamiento de Treecko, Roselia y Alakazam reciben +20% como casos suaves, sin cambiar contacto, mezcla maestra ni otras familias. Se evaluan headroom y efectos de buses.

El archivo ya cargado se reproduce un 6% mas lento solo en deploy, por lo que dura 6.4% mas y baja ligeramente el tono; la envolvente sostiene hasta una cola corta en vez de desvanecer desde el inicio. No se inventan muestras. Una voz corta de movimiento puede ocurrir una vez por grupo de carta, con espera inicial y cooldown global, solo con actor vivo, moviendose y sin haber atacado; se comprueba Game actual en el ciclo de App y se descartan pendientes al pausar, mutear o salir. No voces para tokens, companeros, estructuras o generados. Online usa el snapshot vigente y puede omitir una voz si llega tarde.

Primer ciclo: accion nativa deploy -> caminar -> ataque, pausa, mute y grupo, con fuentes/niveles, registro temporal y captura local; pruebas focales, sin backend ni framework. Las mediciones no implican escucha ni juicio de agrado.

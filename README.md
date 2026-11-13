# Poké Arena

Juego web de estrategia en tiempo real inspirado en las batallas de torres de Clash Royale, con Pokémon, dos carriles, puentes y tres torres por equipo. Permite jugar contra la CPU o contra otra persona online.

[Jugar en el navegador](https://poke-arena-erick.eriqrb.chatgpt.site)

## Cómo se juega

Armá un mazo de ocho cartas en la home. Durante la partida tenés cuatro cartas en la mano y una cola rotativa. Cada despliegue consume elixir, que se regenera hasta diez. Podés guardar cuatro mazos en el navegador.

La colección tiene 105 cartas: tropas terrestres y aéreas, estructuras, invocadores y doce hechizos. Cada carta tiene funciones y estadísticas propias. Algunas unidades legendarias tienen una habilidad que consume elixir y se puede activar una vez por despliegue.

La partida dura tres minutos. Ganás al destruir la torre central o terminar con más torres que el rival. Un empate lleva a dos minutos extra con muerte súbita y luego a un desempate por vida de las torres. El elixir se acelera en las fases finales.

La CPU utiliza diez estrategias de mazo. Las partidas online usan una simulación autoritativa en el servidor que valida cartas, elixir, colocación y habilidades. La pausa está disponible únicamente contra CPU. El mazo se edita desde la home y los créditos se consultan en Ajustes.

En móvil se juega en vertical, tocando una carta y luego la arena, o arrastrándola. Un aviso al girar el dispositivo mantiene el juego en vertical cuando el navegador restringe el bloqueo de orientación.

| Tecla | Acción |
| --- | --- |
| `1`–`4` | Seleccionar carta |
| Flechas | Mover la posición de despliegue |
| `Enter` | Desplegar |
| `Escape` | Cancelar la selección o continuar una pausa |
| Espacio | Pausar o continuar contra CPU |

## Ejecutar localmente

Requiere Node.js 22.18 o posterior. Los recursos y las herramientas para ejecutar el juego están incluidos en el repositorio.

```sh
git clone https://github.com/ErickRRB/poke-arena.git
cd poke-arena
npm run dev
```

La interfaz se abre en `http://127.0.0.1:4173`. Para jugar online en desarrollo, iniciá también el servidor de salas en otra terminal y abrí dos sesiones de navegador:

```sh
cd realtime
npm ci
npm run dev
```

Las conexiones locales usan WebSocket en el puerto 4180. La versión publicada usa el [servidor de Cloudflare](https://poke-arena-realtime.eriickramiirez.workers.dev).

## Servidor multijugador

Un Worker de Cloudflare recibe las conexiones WebSocket. Un Durable Object organiza la búsqueda de rival y otro mantiene cada partida, con simulación autoritativa a 30 pasos por segundo y envío de estados a 15 actualizaciones por segundo. El servidor valida el mazo, elixir, objetivos y colocación. Cada jugador recibe su propia mano y los movimientos se confirman mediante identificadores que evitan despliegues duplicados al reenviar.

Las salas guardan las jugadas y sus confirmaciones antes de responder, con un punto de recuperación del combate cada segundo. Una desconexión permite volver a la misma sala durante 25 segundos. Una recarga recupera la sesión sin abrir otra búsqueda.

La configuración está en `realtime/cloudflare.config.ts`. Para probar o publicar desde esa carpeta:

```sh
npm test
npm run build
npx cf auth login
npm run deploy
```

`dist/online-config.js` contiene la dirección del servidor de producción. `ALLOWED_ORIGINS` en la configuración de Cloudflare limita los sitios que pueden abrir las conexiones desde un navegador. El comando `node scripts/smoke-realtime.mjs https://tu-worker.workers.dev` verifica una partida con dos conexiones, reenvío y reconexión.

## Comprobar y compilar

```sh
npm run test:deck
npm run test:ui:deck
```

Las pruebas se eligen por sección. Un cambio en el editor de mazos usa `test:deck` y `test:ui:deck`; esos comandos no abren sesiones online ni juegan partidas. Las pruebas del navegador usan un único tamaño móvil por defecto y no cargan sprites de combate cuando se revisa solo el editor. Agregá `-- --matrix` cuando cambies la disposición responsive y necesites revisar los cinco tamaños.

| Sección | Pruebas de lógica | Pruebas del navegador |
| --- | --- | --- |
| Mazos y guardado | `npm run test:deck` | `npm run test:ui:deck` |
| Combate y unidades | `npm run test:battle` | `npm run test:ui:battle` |
| Arena, torres y colocación | `npm run test:placement` | `npm run test:ui:battle` |
| Dibujo, efectos y alcance | `npm run test:rendering` | `npm run test:ui:battle` |
| Carga e indicadores | Según el módulo modificado | `npm run test:ui:loading` |
| Conexión y reconexión | `npm run test:online` | `npm run test:ui:online` |
| Recursos del servidor | `npm run test:server` | Solo si cambia la entrega al navegador |
| Audio | `npm run test:audio` | Solo si cambia una interacción con sonido |
| Balance | `npm run test:balance` | Solo si cambia su representación visual |
| Herramientas de pruebas | `npm run test:tooling` | No corresponde |

Podés combinar secciones con `npm test -- deck rendering`, sin repetir archivos. `npm run test:list` muestra los grupos. `npm test` sin sección muestra la ayuda y termina sin ejecutar pruebas; no lanza la suite completa por defecto.

Para las pruebas de navegador, primero iniciá `npm run dev`. Reutilizan Playwright de `qa/node_modules` o de la instalación local; si falta, instalalo con `npm install --prefix qa playwright`. En Windows usan Edge. Para apuntar a otro servidor, usá `node scripts/test-ui.mjs deck --url http://127.0.0.1:4180` o la variable `POKE_ARENA_TEST_URL`.

La comprobación completa queda reservada para cambios grandes o transversales:

```sh
npm run test:all      # Toda la lógica, sin abrir navegadores
npm run test:full     # Lógica y las cuatro secciones del navegador, con matriz responsive
npm run check
npm run build
```

`balance:simulate` se ejecuta al cambiar estadísticas o reglas de balance, no para revisar menús o estilos.

Las pruebas cubren combate, objetivos, balance, formaciones, movimiento, colocación, guardado de mazos, recuperación de audio y restauración de partidas online. `check` comprueba la sintaxis de los módulos. `build` genera el Worker ESM en `dist/server/index.js`, con los recursos necesarios para servir el cliente. `balance:simulate` ejecuta un sandbox con despliegues libres, duelos, enjambres y combinaciones de cartas, y guarda los resultados en `docs/balance-simulation.json`.

La interfaz se aloja con la configuración de `.openai/hosting.json`. El backend multijugador se publica por separado en Cloudflare. La API HTTP y su base D1 se conservan para las pestañas abiertas de versiones anteriores.

## Organización del proyecto

| Ruta | Contenido |
| --- | --- |
| `dist/index.html`, `dist/app.js` | Interfaz, controles y flujo de partida |
| `dist/engine.js` | Combate, movimiento, colocación y CPU |
| `dist/catalog.js`, `dist/balance.js` | Cartas, estadísticas y reglas de balance |
| `dist/render.js` | Arena, sprites, efectos y vista previa |
| `dist/audio.js`, `dist/music.js` | Voces, efectos y música |
| `dist/online.js`, `dist/online-wire.js`, `dist/snapshot.js` | WebSocket, serialización y perspectiva |
| `dist/deck-storage.js` | Guardado y migración de mazos |
| `dist/assets/` | Ilustraciones, sprites, fuentes, iconos y audio |
| `realtime/` | Worker, salas Durable Objects y pruebas del servidor WebSocket |
| `worker/api.js` | Compatibilidad con la API HTTP anterior |
| `drizzle/` | Esquema y migraciones de base de datos |
| `scripts/` | Servidor local, compilación y preparación de recursos |
| `tests/` | Pruebas automatizadas |
| `docs/` | Mecánicas, balance, revisiones y prompts |

Las reglas de mecánicas están en [MECHANICS.md](docs/MECHANICS.md), las referencias en [BALANCE.md](docs/BALANCE.md), las mediciones del sandbox en [BALANCE-SIMULATIONS.md](docs/BALANCE-SIMULATIONS.md) y la revisión de la interfaz con capturas en [UI-UX-REVIEW.md](docs/UI-UX-REVIEW.md).

## Recursos y atribuciones

Los sprites y animaciones de la arena provienen de Pokémon Mystery Dungeon, conservados por [PMDCollab / SpriteCollab](https://github.com/PMDCollab/SpriteCollab). Se mantienen las atribuciones de cada especie en sus recursos. Parte del arte de referencia proviene de [PokéAPI / sprites](https://github.com/PokeAPI/sprites). La portada, las escenas de las cartas y los iconos ilustrados fueron generados para el proyecto, con los prompts documentados en `docs/`.

Las ilustraciones anteriores y sus variantes se conservan en [artwork/imagenes-viejas](artwork/imagenes-viejas/README.md), con un visor local para compararlas.

Las voces utilizan la compilación [HQ Pokémon Anime Cries Gen 1–5, de Galladito/RojoY](https://forums.pokemmo.com/index.php?/topic/86447-mod-hq-pokemon-anime-cries-gen-1-5/). Los efectos incluyen recursos de Kenney y receptron bajo CC0, con sus fuentes y licencias en `dist/assets/audio/`. La música de batalla es una composición original secuenciada con Web Audio. Las fuentes son Barlow Condensed y DM Sans.

Pokémon pertenece a Nintendo, Creatures y GAME FREAK. Poké Arena es un juego de fans sin afiliación oficial.

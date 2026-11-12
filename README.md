# Poké Arena

Juego web de batallas de torres contra otra persona online o contra la computadora, inspirado en las mecánicas de Clash Royale. Incluye dos carriles, puentes, tres torres por equipo, mazo editable de ocho cartas, mano de cuatro y cola rotativa. El elixir llega hasta diez. La colección tiene 105 cartas, con Pokémon de las primeras tres generaciones y doce hechizos.

La ampliación incorpora Pin misil, Rayo, Hiperrayo, Ventisca, Púas, Trampa rocas, Remolino, Pesadilla y Terremoto. Bomba ígnea y Mazazo conservan las claves y mecánicas de Bola de fuego y Tronco para mantener los mazos guardados. Las zonas persistentes tienen efectos diferentes: daño terrestre, presión antiaérea, atracción, invocaciones graduales o daño contra estructuras. Los hechizos reducen su daño a torres; Púas, Trampa rocas y Remolino no dañan torres.

Central Electrode genera Voltorb; Madriguera Nidoqueen y Vivero Exeggutor producen parejas por tandas. Liberan refuerzos al morir o al terminar su duración. Duskull avanza e invoca Shuppet, con una última pareja al caer. Regice es una defensa inmóvil; Regirock y Celebi ignoran tropas para buscar estructuras. Raichu y Registeel dan golpes fuertes con preparación y limitaciones frente a enjambres. Pandilla Rocket despliega tres Poochyena y dos Ralts con estadísticas propias. Voltorb salta hacia su objetivo y explota al aterrizar; se puede eliminar durante el salto.

El CPU elige entre diez estrategias y mezcla su mano inicial mediante el generador de la partida. El editor ofrece cuatro mazos independientes, guardados automáticamente, y migra la selección anterior al primero. Las fichas se cierran al agregar o quitar. Hay filtros por rol y búsqueda de nombres, roles y ataques. Los menús usan paneles crema, bordes oscuros y botones rojos y amarillos inspirados en GBA y DS; las cartas legendarias tienen un marco recortado con cresta, gemas y brillo opcional. El marco mantiene el tamaño y las zonas de toque de las cartas.

La ayuda de colocación busca la celda legal más cercana dentro de cuatro celdas pequeñas, incluida la distancia de la captura aportada. Vista previa, CPU y servidor resuelven la misma posición. Al apuntar aparece un solo círculo de alcance y una celda; al soltar o cancelar se limpia de inmediato. Las estructuras pasivas no muestran un alcance de ataque. El salto de Voltorb y las invocaciones mixtas muestran el alcance correspondiente a su mecánica.

Meowth defiende las torres laterales con monedas. Nidoking y Nidoqueen ocupan las torres centrales: cada partida sortea cuál queda de tu lado y asigna la otra especie al rival. Disparan proyectiles cuando se activa su torre. La asignación se conserva en la partida online y al invertir la perspectiva. Blastoise es una estructura desplegable: permanece sobre un bastión durante 35 segundos y dispara dos cañones. Los ataques incluyen combos de Machamp, rayos encadenados de Pikachu, burbujas de Squirtle, fuego en cono de Charizard, quemaduras de Charmander, teletransporte de Gengar, curación de Zubat, cargas de Eevee y golpes de cola de Onix. El daño y los sonidos se sincronizan con los fotogramas de impacto.

Las explicaciones están en Tutorial y en las fichas de las cartas. En Mazo, el retrato abre el detalle y el botón separado agrega o quita la carta. Menú principal permite abandonar la batalla y volver a editar. Los sprites se anclan con los puntos originales de `Shadow.png`; solo los voladores tienen elevación sobre el suelo.

La home usa una ilustración completa de la arena, con Pikachu, Charizard y Blastoise en el mismo entorno. Muestra ocho cartas del mismo tamaño, con nombre, elixir y escenas de combate con fondo. Treecko muestra dos tiradores y Zubat tres voladores; las nuevas cartas de enjambre usan retratos de grupo con la cantidad de cuerpos que despliegan. La colección permite buscar por nombre, filtrar rareza y ordenar por elixir o nombre. El mazo se actualiza y persiste en cada cambio, incluidos los huecos pendientes; solo se puede iniciar una partida cuando vuelve a tener ocho cartas. El botón Listo cierra la colección. Las rarezas son descriptivas y no modifican estadísticas. En móvil, la aplicación ocupa el alto visible del navegador; la colección tiene desplazamiento propio con cabecera, filtros y pie fijos. Las fichas muestran vida, daño, DPS directo, intervalo, objetivos, movimiento, alcance y despliegue en una grilla con iconos. Cantidad y escudo quedan visibles. Las descripciones explican la función de la carta; los umbrales de supervivencia quedan en la documentación técnica.

Las tropas que avanzan buscan el objetivo válido más cercano; al comenzar a atacar, lo mantienen. Los atacantes de edificios priorizan una estructura defensiva a hasta diez casillas mientras marchan, aunque esté algo más lejos que la torre que perseguían. Esto permite atraer a Snorlax, Groudon y Golem desde ambos carriles con un Blastoise central colocado antes del cruce. El aturdimiento cancela el ataque pendiente y reinicia la selección; conserva los proyectiles ya disparados y las restricciones de objetivos. La vista previa y el despliegue usan el mismo punto permitido. La ayuda solo se aplica cerca de una zona legal; alcanza también el borde legal más cercano al apuntar sobre el río. Arrastrar a territorio rival lejano o devolver la carta a la mano cancela sin gastar elixir ni rotarla. Al ubicar una tropa se dibuja su alcance y una exclamación roja sobre los enemigos que pueden atacar esa posición. Los avisos de colocación se limpian al soltar; las marcas de aparición duran solo el tiempo de despliegue. Las unidades grandes esquivan o apartan cuerpos que bloquean el paso, respetando los límites del puente. Ambas torres del rey dejan un pequeño espacio de despliegue detrás; la trayectoria evita la propia torre al salir.

Los grupos seleccionables de Nidoran y Shuppet se reemplazaron por Trío Ralts, Manada Poochyena, Diglett y Horda Diglett. Los mazos guardados se migran automáticamente. Las tropas activas usan cuerpo a cuerpo cuando su Ataque base supera su Ataque Especial, y rango cuando ocurre lo contrario. Pikachu es una excepción explícita: cumple el rol de mago eléctrico solicitado y conserva ataques eléctricos a distancia. Los empates, las estructuras, la autodestrucción y los defensores pasivos conservan su función. Los datos originales están en `dist/pokemon-stats.js`.

El balance compartido entre cliente, CPU y servidor está en `dist/balance.js`, con coste, vida, daño, cadencia y velocidad explícitos por carta. La revisión usa roles de Clash Royale como referencia y adapta las habilidades a cada Pokémon. Pikachu cuesta 4, tiene 714 PV, dos rayos de 115 cada 1,8 s y una descarga de entrada de 192 con aturdimiento. Treecko es un dúo de arqueros de 3; Snorlax es un tanque de 5; Slowbro controla con hielo por 3 y Gardevoir daña en área por 5. Los hechizos tienen valores compatibles con esta base: Impactrueno 192, Bola de fuego 689 y Tronco 290. Las torres laterales conservan 3000 PV y 109 de daño; las centrales, 4800 PV. La [revisión completa](docs/ROLE-REVIEW.json) registra las 105 cartas. `npm run balance:report` regenera las tablas técnicas. Las simulaciones verifican interacciones concretas; el balance competitivo necesita partidas con personas.

Se usaron como referencia los [datos extraídos de Tower Princess](https://crtool.app/en/units/tower-princess/) y el [ajuste oficial de Supercell que sitúa a Archers y Firecracker en 304 de vida](https://supercell.com/en/games/clashroyale/blog/release-notes/october-balance-changes-2/). La variante de Zubat que requiere dos tiros es una decisión solicitada para Poké Arena.

Las barras de vida tienen mayor tamaño, contorno oscuro, destello y una franja de daño reciente que baja después del impacto. Los escudos tienen una barra separada. Los números de impacto usan texto de 20–23 píxeles con contorno y agrupan ráfagas. Nueve Pokémon legendarios tienen habilidades propias activables con elixir una vez por despliegue; los botones flotan sobre el borde inferior de la arena, sin cambiar la geometría del tablero ni de la mano.

Las partidas duran tres minutos. La torre central da la victoria inmediata; al agotarse el tiempo gana quien haya destruido más torres. Un empate inicia dos minutos extra de muerte súbita. Hay elixir ×2 desde el último minuto regular y ×3 en el último minuto extra. Si siguen empatados, se detiene el combate y todas las torres supervivientes pierden vida al mismo ritmo hasta la primera destrucción. Dos torres con la misma vida mínima producen empate. Las reglas de tiempo siguen el [soporte oficial de elixir](https://support.supercell.com/clash-royale/en/articles/elixir.html); las habilidades se inspiran en [héroes](https://supercell.com/en/games/clashroyale/blog/release-notes/december-update-2025/) y el retarget en la [aclaración oficial del aturdimiento](https://supercell.com/en/games/clashroyale/blog/release-notes/balance-changes-coming-2/).

Buscar partida empareja dos personas que estén buscando. La simulación, el elixir, los costes, las habilidades y las acciones se validan en el servidor. Ambos ven su propio equipo abajo. Hay cancelación, reconexión, revancha en el mismo modo y derrota al abandonar o perder conexión durante 25 segundos. Si ambos se desconectan, empatan. La CPU se elige por separado y tiene tres dificultades; solo ese modo admite pausa.

## Ejecutar

Requiere Node.js 22.13 o posterior. No necesita instalar dependencias para ejecutar la vista local.

```powershell
node scripts/serve.mjs
```

Abrí [la vista local](http://127.0.0.1:4173). El servidor usa SQLite local en el directorio ignorado `.sites-runtime/`; dos navegadores separados pueden probar el matchmaking. Producción usa un Worker y D1 provisto por Sites. `npm run build` genera `dist/server/index.js` y conserva el mismo `project_id`. El SQL y su diario están en `drizzle/`.

## Controles

- Tocá una carta y después tu mitad de la arena; también podés arrastrarla.
- Usá `1` a `4` para seleccionar una carta, las flechas para apuntar y `Enter` para desplegar.
- `Escape` cancela la selección; `Espacio` pausa o reanuda contra CPU.
- Los Pokémon terrestres cruzan por los puentes y los voladores pasan sobre el río. Tronco siempre comienza en tu lado.
- Editá el mazo antes de comenzar. El mazo, nombre y ajustes se guardan en este navegador.

## Código y verificación

`dist/engine.js` contiene la simulación y `dist/catalog.js` las cartas añadidas. `dist/render.js` dibuja y carga hojas originales por especie, sin decodificar toda la colección. `dist/snapshot.js` conserva las referencias y transforma la perspectiva. `worker/api.js` implementa sesiones, cola y simulación autoritativa con control de versiones; `dist/online.js` sincroniza el cliente. Para verificar:

```powershell
npm run check
npm test
npm run build
```

Las 188 pruebas cubren combate, colocación, retarget, todas las cartas, habilidades, invocaciones, curación, escudos, reflejo, muerte súbita, drenaje, serialización y servidor. Incluyen la supervivencia de Zubat, el cruce de seis unidades grandes por ambos puentes en ambas direcciones, atracción de estructuras, límite de ayuda al desplegar, búsquedas concurrentes y desconexiones. Las pruebas en Chrome verificaron seis tamaños desde 320 × 568 hasta 1440 × 980, cartas uniformes, orden por elixir, mazo persistente sin guardar, detalle compacto, cancelación del arrastre y despliegue detrás del rey. Dos sesiones comprobaron matchmaking, balance compartido, rotación, abandono y revancha. Una prueba de audio decodificó las 97 voces y 13 efectos, comprobó que la voz solo se dispara al desplegar y renderizó música sin saturación con 96 compases distintos. También se verificaron trece rutas del Worker compilado y su simulación en una sala online local.

Las torres de princesa empiezan a disparar cuando una tropa llega a la mitad del puente, con 230 unidades de alcance para cubrir también los desplazamientos laterales de la grilla. Las partidas online restauradas adoptan ese mismo alcance al sincronizar. Las pruebas verifican despliegues reales, primer disparo en movimiento, daño, avisos de peligro y reconexión para ambos carriles y equipos; la mitad de entrada del puente queda fuera de alcance hasta acercarse al centro.

La revisión anterior comprobó 3480 poses de las hojas originales y trece escenas de efectos en Chrome, con fichas desde 320 × 568 hasta 1440 × 980. El Worker compilado también verificó una partida de dos jugadores con los nuevos enjambres y la eliminación de nueve unidades frágiles mediante Impactrueno.

## Recursos

Los sprites de la arena son originales de CHUNSOFT para Pokémon Mystery Dungeon, distribuidos por [PMDCollab / SpriteCollab](https://github.com/PMDCollab/SpriteCollab). Cada carpeta incluye atribución y `AnimData.xml`; se resuelven alias sin modificar imágenes. Hay recursos para 97 especies, incluidas invocaciones y defensores. La imagen de inicio y las ilustraciones originales de las cartas fueron generadas para este proyecto con ImageGen. Las 19 ilustraciones nuevas también se generaron con ImageGen, con fondos completos, luz y perspectiva compartidas. Los prompts están en docs/IMAGE-PROMPTS-EXPANSION.json; scripts/prepare-card-art.py prepara los WebP sin recortar las composiciones. Hay seis atlas WebP y cuatro escenas nuevas de grupo dentro de `dist/assets/cards/`; `dist/card-art.js` define sus recortes y orientación. Los artworks decorativos del menú y los iconos de habilidad provienen de [PokéAPI / sprites](https://github.com/PokeAPI/sprites). `scripts/download-assets.mjs` conserva caché local.

Para mantener bajo el uso de memoria del Worker, las animaciones básicas y recursos iniciales quedan embebidos; los otros PNG se sirven desde commits fijados con caché del navegador de los repositorios originales. Todas las copias originales siguen en el proyecto. El cliente carga las animaciones según el mazo y los Pokémon que aparecen.

Los tamaños se calibran por especie a partir de la silueta opaca de los sprites originales: Zubat usa escala 1,44 y Snorlax 2,4. Las barras de vida, avisos y vista previa usan la misma escala. Los defensores montados de las torres conservan su tamaño propio.

Las fuentes son Barlow Condensed y DM Sans de Google Fonts. `scripts/download-fonts.mjs` permite volver a obtenerlas.

El audio usa 94 voces de anime de la compilación pública [HQ Pokémon Anime Cries Gen 1–5, de Galladito/RojoY](https://forums.pokemmo.com/index.php?/topic/86447-mod-hq-pokemon-anime-cries-gen-1-5/), convertidas a MP3 mono. La voz suena una vez por despliegue de carta, sin repetirse al seleccionar, consultar, atacar ni por cada miembro del enjambre. Los 13 efectos de Kenney y receptron bajo CC0 siguen acompañando los ataques y golpes. Las fuentes están en `dist/assets/audio/SOURCES.txt`; los audios digitales anteriores quedan fuera del Worker publicado. `scripts/prepare-anime-voices.mjs` permite volver a convertir los WAV numerados del pack y `scripts/download-audio.mjs` conserva las voces ya preparadas.

La partida tiene música original secuenciada con Web Audio en `dist/music.js`. La melodía, armonía, registro y acompañamiento cambian por secciones; no se repite un archivo corto en bucle. El último minuto y el tiempo extra aumentan suavemente el tempo. Se detiene al pausar, abrir un diálogo, salir, terminar o pasar la pestaña a segundo plano. El botón de silencio controla voces, efectos y música.

Pokémon pertenece a Nintendo, Creatures y GAME FREAK. Juego de fans sin afiliación oficial.

La revisión visual de esta versión comprobó las fichas en 320 × 568, 390 × 844, 768 × 1024 y 1440 × 980, con las ocho estadísticas visibles en la grilla, botón inferior accesible, grupos con fondo y migración del mazo anterior. Los prompts y destinos de las imágenes nuevas están en [IMAGE-PROMPTS.json](docs/IMAGE-PROMPTS.json).

La [revisión de mecánicas](docs/MECHANICS.md) detalla la grilla, el viaje de Bola de fuego desde el rey, el recorrido fijo de Tronco, la activación del rey y las adaptaciones Pokémon. Se verificaron cuatro tamaños de pantalla y dos jugadores sobre el Worker compilado.

El mazo se conserva por navegador mediante almacenamiento local y una copia local en cookie. Se verificó al cerrar y reabrir un perfil de Chrome y al recargar una selección incompleta. La regla de geometría fija para controles futuros está en AGENTS.md.

La revisión de esta ampliación verificó seis tamaños de pantalla, de 320 × 568 a 1440 × 980 e incluyendo 932 × 430 horizontal: los cuatro mazos, recarga de selecciones incompletas, cierre automático de fichas, filtros, marcos legendarios, colocación asistida y limpieza al colocar, cancelar y pausar. Los rectángulos de arena, mano y elixir se mantienen iguales al mostrar una o tres habilidades. Las simulaciones cubren las diez estrategias del CPU, las zonas persistentes, el salto interrumpible, invocaciones al expirar y su restauración online; estas comprobaciones no establecen balance competitivo.

Se verificó además una partida online con dos sesiones locales y una respuesta de despliegue demorada: el indicador desaparece antes de la respuesta y un segundo toque no coloca otra carta. El Worker compilado sirvió nueve rutas de la ampliación y ejecutó invocaciones y zonas persistentes en una partida autoritativa. Las estructuras defensivas vuelven a elegir un enemigo alcanzable cuando su objetivo anterior sale de rango.

El editor coloca los cuatro selectores junto al cierre, sin título ni contador general, y reduce la altura de las cartas de colección cerca de un 10 %. La evasión conserva el lado elegido al pasar entre cuerpos próximos, suaviza los giros y limita la separación acumulada. Un enjambre frena a un tanque, que sigue avanzando y puede desplazar cuerpos pequeños respetando los puentes y las estructuras. Las nuevas pruebas incluyen ambas direcciones, ambos carriles, grupos aéreos, frente a torres y restauración online.

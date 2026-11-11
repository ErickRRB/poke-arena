# Poké Arena

Juego web de batallas de torres contra otra persona online o contra la computadora, inspirado en las mecánicas de Clash Royale. Incluye dos carriles, puentes, tres torres por equipo, mazo editable de ocho cartas, mano de cuatro y cola rotativa. El elixir llega hasta diez. La colección tiene 82 cartas: 79 Pokémon de las primeras tres generaciones y tres hechizos.

Meowth defiende las torres laterales con monedas y Raichu dispara rayos desde la central cuando se activa. Blastoise es una estructura desplegable: permanece sobre un bastión durante 35 segundos y dispara dos cañones. Los ataques incluyen combos de Machamp, rayos encadenados de Pikachu, burbujas de Squirtle, fuego en cono de Charizard, quemaduras de Charmander, teletransporte de Gengar, curación de Zubat, cargas de Eevee y rocas de asedio de Onix. El daño y los sonidos se sincronizan con los fotogramas de impacto.

Las explicaciones están en Tutorial y en las fichas de las cartas. En Mazo, el retrato abre el detalle y el botón separado agrega o quita la carta. Menú principal permite abandonar la batalla y volver a editar. Los sprites se anclan con los puntos originales de `Shadow.png`; solo los voladores tienen elevación sobre el suelo.

El menú principal tiene una composición con ilustraciones oficiales y accesos a Buscar partida, CPU, Mazo y Tutorial. No muestra el reloj ni los controles de batalla. La colección permite buscar por nombre y filtrar rareza; el mazo se ve en ocho iconos sobre ella. Las rarezas son descriptivas y no modifican estadísticas. En móvil y tablet, las cuatro cartas y la próxima quedan debajo del terreno; en escritorio, a la derecha. Nombre del rival y reloj van arriba. No hay anuncios centrales ni registro de victorias/derrotas.

Las tropas que avanzan buscan el objetivo válido más cercano; al comenzar a atacar, lo mantienen. Las estructuras desplegadas atraen a los atacantes que pasan cerca, incluidos los que buscan edificios. El aturdimiento cancela el ataque pendiente y reinicia la selección; conserva los proyectiles ya disparados y las restricciones de objetivos. La vista previa y el despliegue usan el mismo punto permitido, incluso al apuntar sobre el puente, territorio rival o una torre propia.

El balance conserva la resistencia anterior y aumenta alrededor de un 6 % el daño de las tropas existentes. Las torres laterales tienen 3000 de vida y la central 4800. Bola de fuego hace 400 de daño a tropas y 110 a torres; Impactrueno hace 155 y 43, y aturde durante 0,75 segundos. Tronco cuesta dos, recorre el terreno, empuja y solo daña enemigos terrestres. Treecko despliega dos tiradores; Golem deja dos Geodude más débiles al caer; Exeggutor invoca Exeggcute explosivos. También hay curadores, escudos, reflejo, zonas dañinas y otras invocaciones. Las estadísticas adaptan esos roles a esta arena.

Las barras de vida tienen mayor tamaño, contorno oscuro, destello y una franja de daño reciente que baja después del impacto. Los escudos tienen una barra separada. Los números de impacto usan texto de 20–23 píxeles con contorno y agrupan ráfagas. Nueve Pokémon legendarios tienen habilidades propias activables con elixir una vez por despliegue; el botón queda fuera de la cancha.

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

Las 87 pruebas cubren combate, colocación, retarget, todas las cartas, habilidades, invocaciones, curación, escudos, reflejo, muerte súbita, drenaje, serialización y servidor. Incluyen búsquedas concurrentes, acciones repetidas, cancelación y desconexiones. La comprobación en dos sesiones de Chrome verificó matchmaking, nombres, despliegues, rotación, abandono y revancha. Otras comprobaciones verificaron barras de daño, habilidad de Mewtwo, filtros y tamaños desde 320 × 667 hasta 3831 × 1956. También se comprobó el Worker compilado y sus rutas de medios y base de datos.

## Recursos

Los sprites de la arena son originales de CHUNSOFT para Pokémon Mystery Dungeon, distribuidos por [PMDCollab / SpriteCollab](https://github.com/PMDCollab/SpriteCollab). Cada carpeta incluye atribución y `AnimData.xml`; se resuelven alias sin modificar imágenes. Hay recursos para 94 especies, incluidas invocaciones y defensores. Los artworks no pixelados y retratos de cartas provienen de [PokéAPI / sprites](https://github.com/PokeAPI/sprites). El menú compone estas ilustraciones con una escena de torres. `scripts/download-assets.mjs` conserva caché local.

Para mantener bajo el uso de memoria del Worker, las animaciones básicas y recursos iniciales quedan embebidos; los otros PNG se sirven desde commits fijados con caché del navegador de los repositorios originales. Todas las copias originales siguen en el proyecto. El cliente carga las animaciones según el mazo y los Pokémon que aparecen.

Las fuentes son Barlow Condensed y DM Sans de Google Fonts. `scripts/download-fonts.mjs` permite volver a obtenerlas.

El audio incluye 94 voces originales desde [PokéAPI Cries](https://github.com/PokeAPI/cries) y 13 muestras de Kenney y receptron bajo CC0, con fuentes y licencias locales. Se usan al seleccionar, desplegar, atacar, activar habilidades y caer. La mezcla limita voces simultáneas. `scripts/download-audio.mjs` obtiene los recursos; los sonidos se decodifican al activar audio y se conserva la preferencia de silencio del usuario.

Pokémon pertenece a Nintendo, Creatures y GAME FREAK. Juego de fans sin afiliación oficial.

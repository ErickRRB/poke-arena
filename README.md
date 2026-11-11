# Poké Arena

Juego web de batallas de torres contra la computadora, inspirado en las mecánicas de Clash Royale. Incluye dos carriles, puentes, tres torres por equipo, mazo editable de ocho cartas, mano de cuatro y cola rotativa. La energía se recarga hasta diez, se duplica en el último minuto y permite desplegar Pokémon o lanzar hechizos. Los Pokémon tienen roles de tanque, ataque a distancia, vuelo, enjambre y daño de área.

Meowth defiende las torres laterales con monedas y Raichu dispara rayos desde la central cuando se activa. Blastoise es una estructura desplegable: permanece sobre un bastión durante 35 segundos y dispara dos cañones. Los ataques incluyen combos de Machamp, rayos encadenados de Pikachu, burbujas de Squirtle, fuego en cono de Charizard, quemaduras de Charmander, teletransporte de Gengar, curación de Zubat, cargas de Eevee y rocas de asedio de Onix. El daño y los sonidos se sincronizan con los fotogramas de impacto.

Las explicaciones están en Tutorial y en las fichas de las cartas. En Mazo, el retrato abre el detalle y el botón separado agrega o quita la carta. Menú principal permite abandonar la batalla y volver a editar. Los sprites se anclan con los puntos originales de `Shadow.png`; solo los voladores tienen elevación sobre el suelo.

La colección tiene 20 Pokémon y dos hechizos. El mazo de ocho cartas se ve en una fila de iconos fija sobre la colección. Los menús tienen fondos opacos. En escritorio, la arena utiliza la altura disponible y los controles crecen con ella, sin el límite anterior de 800 píxeles.

Las tropas que están avanzando recalculan el objetivo válido más cercano; una vez que comienzan a atacar, lo mantienen hasta que deja de ser válido o se aleja. Las estructuras desplegadas atraen a los atacantes que pasan cerca, incluidos los que buscan edificios. Soltar una carta sobre un obstáculo la acomoda en el punto libre más cercano y la vista previa muestra ese punto.

El balance da más resistencia a apoyos y tanques, mantiene frágiles los enjambres y conserva el ritmo de ataque más lento. Las torres laterales tienen 3000 de vida y la central 4800. La mayoría de los apoyos hacen menos daño; Machamp y los atacantes de edificios conservan suficiente daño concentrado para cumplir su función. Bola de fuego hace 400 de daño a tropas y 110 a torres; Impactrueno hace 155 y 43, y aturde durante 0,75 segundos. La distinción entre daño a tropas y torres sigue el criterio de las [notas oficiales de balance de Supercell de junio de 2026](https://supercell.com/en/games/clashroyale/blog/release-notes/june-balance-changes-2026/), con valores propios para esta arena.

Los números de impacto usan texto de 20–23 píxeles con contorno oscuro, permanecen hasta 1,15 segundos y suman los golpes consecutivos de una ráfaga en una sola cifra. Las quemaduras y la curación tienen colores distintos.

Las partidas duran tres minutos. Destruir la torre central gana inmediatamente; al agotarse el tiempo gana quien haya destruido más torres. Un empate inicia un minuto extra con muerte súbita. Si continúa el empate, decide la torre superviviente con menos vida. El juego tiene tres dificultades, práctica guiada, pausa, sonido y controles de teclado o pantalla táctil. No incluye multijugador en línea.

## Ejecutar

Requiere Node.js 22 o posterior. No necesita instalar dependencias para jugar.

```powershell
node scripts/serve.mjs
```

Abrí [la vista local](http://127.0.0.1:4173). Los recursos se sirven desde `dist/`; las imágenes y las fuentes están incluidas localmente.

## Controles

- Tocá una carta y después tu mitad de la arena; también podés arrastrarla.
- Usá `1` a `4` para seleccionar una carta, las flechas para apuntar y `Enter` para desplegar.
- `Escape` cancela la selección; `Espacio` pausa o reanuda.
- Los hechizos se pueden lanzar en cualquier zona. Los Pokémon terrestres cruzan por los puentes y los voladores pasan sobre el río.
- Editá el mazo antes de comenzar la batalla. El mazo, los ajustes y el registro de resultados se guardan en este navegador.

## Código y verificación

`dist/engine.js` contiene la simulación sin dependencias del navegador. `dist/render.js` dibuja la arena y reproduce las hojas originales en ocho direcciones. `dist/app.js` conecta controles, accesibilidad, audio y persistencia. Para comprobar el motor:

```powershell
node --test tests/*.test.mjs
```

Las 57 pruebas cubren costes, rotación de cartas, zonas de despliegue, puentes, vuelo, selección de objetivos, ataques específicos, estructuras, hechizos, pausa, torres, muerte súbita, colocación junto a obstáculos, tiempos de supervivencia por rol y partidas completas. Las comprobaciones en Chrome cubren 31 recorridos de interfaz, 480 poses, 256 anclajes de suelo y 19 perfiles de audio con muestras reales. Incluyen escritorio hasta 3831 × 1956 y móvil. Otros 12 controles verifican las estadísticas actualizadas, los números de daño, despliegue táctil, una partida completa y la revancha sin errores del navegador.

## Recursos

Los sprites de la arena son los originales de CHUNSOFT para Pokémon Mystery Dungeon, distribuidos por [PMDCollab / SpriteCollab](https://github.com/PMDCollab/SpriteCollab). Cada carpeta incluye `credits.txt` y `AnimData.xml`. El manifiesto conserva tamaños y duraciones de los fotogramas. Los retratos de las cartas provienen de [PokéAPI / sprites](https://github.com/PokeAPI/sprites). `scripts/download-assets.mjs` permite volver a obtenerlos.

Las fuentes son Barlow Condensed y DM Sans de Google Fonts. `scripts/download-fonts.mjs` permite volver a obtenerlas.

El audio incluye 22 voces originales desde [PokéAPI Cries](https://github.com/PokeAPI/cries) y 13 muestras de efectos de Kenney y receptron, bajo CC0. Los archivos de origen y sus licencias están en `dist/assets/audio/`. `scripts/download-audio.mjs` obtiene los recursos; el navegador los decodifica al activar audio y mezcla las muestras con paneo, cambios de velocidad y texturas de ruido. Los osciladores de ataque quedan como respaldo si las muestras todavía no cargaron.

Pokémon pertenece a Nintendo, Creatures y GAME FREAK. Juego de fans sin afiliación oficial.

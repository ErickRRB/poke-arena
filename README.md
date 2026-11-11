# Poké Arena

Juego web de batallas de torres contra la computadora, inspirado en las mecánicas de Clash Royale. Incluye dos carriles, puentes, tres torres por equipo, mazo editable de ocho cartas, mano de cuatro y cola rotativa. La energía se recarga hasta diez, se duplica en el último minuto y permite desplegar Pokémon o lanzar hechizos. Los Pokémon tienen roles de tanque, ataque a distancia, vuelo, enjambre y daño de área.

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
node --test tests/engine.test.mjs
```

Las pruebas cubren costes, rotación de cartas, zonas de despliegue, puentes, vuelo, selección de objetivos, hechizos, pausa, torres, muerte súbita y partidas completas. Las pruebas visuales se ejecutaron en Chrome con Playwright, en escritorio y móvil.

## Recursos

Los sprites de la arena son los originales de CHUNSOFT para Pokémon Mystery Dungeon, distribuidos por [PMDCollab / SpriteCollab](https://github.com/PMDCollab/SpriteCollab). Cada carpeta incluye `credits.txt` y `AnimData.xml`. El manifiesto conserva tamaños y duraciones de los fotogramas. Los retratos de las cartas provienen de [PokéAPI / sprites](https://github.com/PokeAPI/sprites). `scripts/download-assets.mjs` permite volver a obtenerlos.

Las fuentes son Barlow Condensed y DM Sans de Google Fonts. `scripts/download-fonts.mjs` permite volver a obtenerlas.

Pokémon pertenece a Nintendo, Creatures y GAME FREAK. Juego de fans sin afiliación oficial.

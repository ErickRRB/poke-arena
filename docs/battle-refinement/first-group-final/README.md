# Primer grupo sobre la base aislada

Esta evidencia usa el checkout aislado `pokemon-arena-search-timer` con su tablero anterior. El integrador debe repetirla sobre la rama final. Los archivos de runtime, manifiestos, sprites del grupo y recursos del tablero se congelan en memoria al comenzar; `verification.json` registra sus hashes y el commit base. No se modificó runtime ni se publicó.

## Cobertura anterior y nueva

`scripts/verify-battle-refinement.mjs` comprobaba búsqueda, HUD, carga demorada, audio y 660 cuadros de Pikachu, Charizard y Emboscada Sneasel. Sus videos usaban simulación de 30 Hz y render de 60 Hz, en una sola perspectiva, antes del rig actual. Las láminas de ocho direcciones eran muestras de poses y emisores; no recorrían el protocolo de snapshots.

Esta pasada conserva únicamente tres videos necesarios. Cada uno compara dos perspectivas lado a lado: dos paneles equivalentes a 390 × 844, con tablero de 370 × 677. Son 651 muestras temporales en total, capturadas a 60 Hz; el motor avanza a 30 Hz y los snapshots y eventos llegan a 15 Hz mediante `publicSnapshot`, `publicEvent`, `unpackEvent`, `perspective` y `unpackGame`. Se reproducen los relojes de animación, aparición y daño visual del app, mientras Renderer controla el reloj de ataque. No se añade jitter de red.

## Resultados

Pasaron las 23 comprobaciones específicas y ocho casos numéricos adicionales contra bloqueo permanente. Los tres videos están en [el visor local](index.html); `frames/` contiene cuatro cuadros clave por escenario.

- **Pikachu contra Charizard:** ambos atacan. En ocho duelos numéricos de 20 s, alternando equipo, orden de actualización y una preparación adversarial de Pikachu de 0,26 s, Charizard libera entre 22 y 33 llamaradas. El orden conserva una diferencia en la cantidad de liberaciones; todos los casos mantienen respuesta de Charizard.
- **Charizard:** se verificó que Renderer dibuje la imagen articulada de alas durante el combate, con varias siluetas para un mismo cuadro nativo. Los píxeles protegidos de cabeza y cuerpo permanecen iguales al original y el emisor coincide con el marcador de cabeza en ambas perspectivas. La primera llamarada viaja antes de causar daño. Los tres impactos suman 216 al objetivo de delante, 0 al de detrás y 0 al que queda fuera del cono.
- **Emboscada Sneasel:** el vuelo usa 192 unidades/s; la cápsula avanza de forma monótona y en más del 90 % de las muestras dibuja una posición temporal distinta. El aterrizaje ocurre a 3,1 s en este fixture. Los Sneasel pueden recibir daño durante la aparición: el probe resta 10 de vida, de 202 a 192, y las reglas de objetivo de tropas y hechizos los reconocen. Permanecen quietos durante el despliegue. El primer golpe llega a 4,533 s, 1,433 s después del aterrizaje, con los 1,1 s de despliegue y 0,3 s de preparación configurados.

Las capturas a 60 Hz describen la frecuencia de muestreo, no una cantidad equivalente de dibujos nativos nuevos. Los videos son silenciosos; las comprobaciones de audio y de layout anteriores no se duplicaron en esta pasada.

## Tamaño de la cápsula

La cápsula mide 52 unidades visibles del canvas, equivalentes a 32,07 píxeles CSS en cada panel de 390 cuyo tablero mide 370 de ancho. El PNG de esta rama mide 30 × 30 y su alfa visible ocupa `[6,6,24,24]`; el recorte efectivo usa esos mismos bounds. `flight.geometry` registra la medida del recurso y del recorte. Los videos y los doce cuadros clave se regeneraron con esta corrección y con las composiciones de alas compartidas actuales.

## Reproducción

```text
node scripts/qa-first-group-final.mjs --numeric
node scripts/qa-first-group-final.mjs
```

La pasada rápida guarda `qa/first-group-final/numeric-report.json`. La completa actualiza estos tres MP4, doce cuadros clave y `verification.json`. Usa Edge y Playwright, además de FFmpeg/FFprobe; se pueden indicar sus rutas mediante `POKE_ARENA_PLAYWRIGHT_MODULE` y `POKE_ARENA_FFMPEG`.

El fixture predeclara sus contextos de lectura con `alpha:false` y `willReadFrequently:true` antes de crear Renderer. Las muestras de cabeza y cuerpo se leen inmediatamente de la composición compartida del rig. La configuración del contexto de producción conserva su valor predeterminado.

Los fixtures aíslan el comportamiento: el duelo numérico aumenta la vida para sostener 20 s y detiene el movimiento; los blancos del cono son pasivos; las torres del escenario de cápsula no contraatacan. Se preservan el daño y los tiempos de ataque del perfil actual, salvo la preparación adversarial explícita del test de Pikachu.

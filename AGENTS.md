# Geometría del juego

## Publicación en Sites

El Worker compilado se divide en `dist/server/index.js` y módulos `asset-chunk-*.js`. Conservar cada archivo por debajo de 32 MiB, el límite de objetos del repositorio de Sites.

GitHub `main` conserva el historial completo del proyecto. Sites usa una rama de publicación con el mismo árbol final y su propio historial: un commit antiguo de GitHub contiene un Worker de más de 32 MiB que Sites rechaza incluso si un commit posterior lo reduce. No reescribir ni forzar el historial de GitHub.

Para Sites, usar el worktree vecino `pokemon-arena-site-publication` y su rama `site-publication`. Abrir y sincronizar allí el repositorio con el helper oficial. Con el árbol principal probado y commiteado, aplicar su árbol con `git read-tree --reset -u <commit>` únicamente en ese worktree de publicación limpio, crear el commit y verificar que ambos árboles coincidan. Publicar ese commit con el helper y el conector Sites. Mantener la rama de publicación en GitHub para conservar su procedencia. Al continuar, no intentar subir el historial de `main` al repositorio de Sites.

## Selección de pruebas

Elegir las pruebas por la sección modificada. Para el editor o guardado del mazo, usar `npm run test:deck` y `npm run test:ui:deck`; no ejecutar conexión entre usuarios, audio, combate ni balance. Usar los grupos `battle`, `placement`, `rendering`, `online`, `server`, `audio`, `balance` y `tooling` solo cuando el cambio alcance esas áreas. Se pueden combinar con `npm test -- deck rendering`.

Las pruebas de navegador están separadas en `tests/browser/deck.mjs`, `battle.mjs`, `loading.mjs` y `online.mjs`. Durante la implementación, usar un solo tamaño que reproduzca el problema. Agregar `-- --matrix` al cerrar cambios responsive o cuando un fallo indique otro tamaño afectado. No repetir verificaciones que ya pasaron con entradas sin cambios.

Reservar `npm run test:all` y `npm run test:full` para cambios grandes que puedan romper áreas distintas, como reglas compartidas del motor, formato de snapshots o infraestructura común. Antes de una ejecución amplia, explicar qué dependencias transversales la justifican. `npm test` sin sección no ejecuta la suite completa.

## Disposición

Los indicadores de carga, búsqueda de rival, conexión, guardado y errores temporales van en capas flotantes o absolutas. Nunca agregan filas ni cambian el tamaño o la posición del menú, sus controles, la arena o la mano. Para la carga inicial, usar una Pokébola animada con progreso real de los recursos; para esperas sin progreso medible, una Pokébola indeterminada. Respetar la opción de reducir movimiento y conservar los anuncios accesibles sin texto visible que ocupe espacio. Verificar con carga demorada y errores, comparando rectángulos en móvil, tablet y escritorio.

La arena, la mano y el elixir conservan su tamaño y posición cuando aparecen controles o información durante una partida. Ninguna habilidad, aviso, botón o control transitorio debe crear filas, márgenes o espacio adicional que achique o desplace el tablero.

Los controles de combate transitorios van en `#battle-overlays`, como capas absolutas sobre la arena. Las habilidades aparecen junto al borde inferior, encima de las cartas. La capa deja pasar los eventos en las zonas sin controles. Si hay muchas acciones, se desplazan dentro de esa capa; no agrandan el panel de cartas.

Al modificar esos controles, comparar los rectángulos de la arena, la mano y la barra de elixir antes y después de mostrar una y varias acciones, en móvil, tablet y escritorio. Deben permanecer iguales. Comprobar que los botones sigan siendo accesibles y que los espacios libres permitan tocar la arena.

El mazo se guarda localmente en cada cambio y se restaura al volver a entrar. No reemplazar una selección guardada por el mazo inicial al actualizar el catálogo; migrar las claves y conservar las cartas válidas, su orden y los huecos pendientes.

Cualquier acceso al inicio durante una partida contra CPU pide confirmación y pausa la partida mientras se decide. Al cancelar, conserva la pausa previa o reanuda según corresponda. Durante una partida online activa, los accesos al inicio quedan bloqueados. Una recarga intenta recuperar la sesión y la misma sala antes de terminar de descargar los recursos gráficos, sin iniciar otra búsqueda ni enviar una cancelación al salir de la página.

# Ilustraciones y menús

No agregar explicaciones visibles salvo pedido explícito del usuario. No agregar es la regla; agregar es la excepción. No dejar párrafos de instrucciones, consejos ni texto de relleno en las vistas de uso. Conservar etiquetas de controles, datos necesarios y nombres accesibles. La ayuda solicitada por el usuario puede estar dentro de su diálogo de ayuda; no mostrarla por defecto.

Las cartas nuevas y las ilustraciones que se renuevan deben mantener el nivel de las escenas existentes: Pokémon o ataques integrados en un entorno completo, con fondo, iluminación y perspectiva compartidos. Usar ilustraciones originales; los iconos simples y los recortes de personajes sobre un fondo genérico no cumplen ese estándar.

Variar las poses y las orientaciones del conjunto. Combinar vistas frontales, perfiles, diagonales y acciones hacia la izquierda y la derecha; no dar a todas las cartas la misma dirección. Revisar las imágenes dentro de la colección, conservando sus siluetas y acciones legibles al tamaño real de las cartas.

Para los menús, seguir la preferencia de una interfaz inspirada en los juegos de Nintendo de alrededor de 2000, con paneles crema, bordes oscuros y acentos rojos y amarillos. Priorizar espacio para las cartas: el editor mantiene los cuatro selectores junto a la X, sin título ni contador general.

El editor muestra el mazo en dos filas de cuatro cartas grandes. El mazo y la colección comparten un área de desplazamiento; al bajar, el mazo sale de la vista. Los selectores de mazo son bajos y los filtros se abren desde un botón pequeño. Rareza queda al final, plegada. Tocar una carta del editor muestra primero un menú pequeño con Info y Usar o Quitar. Las cantidades de enjambre van debajo del nombre, con icono y texto, sin fondo crema.

El indicador de carga es la propia Pokébola centrada: se llena con el progreso real y gira sobre su centro en esperas indeterminadas. No agregar aros ni placas circulares alrededor. Las cartas sin elixir se muestran completamente en blanco y negro. El panel de combate usa bordes rectos y un patrón tenue de Pokébolas; la próxima carta queda centrada verticalmente y muestra su nombre pequeño debajo.

Las posiciones reales de las torres del rey usan `KING_Y` y dejan exactamente una fila de la grilla detrás de cada torre, con colocación válida en su centro. Mantener esa geometría al restaurar partidas antiguas y al invertir la perspectiva online.

Los nombres de las cartas se alinean arriba y los roles abajo. Conservar la proporción de las ilustraciones en todas las vistas. En los hechizos, priorizar la silueta del ataque y permitir como máximo un Pokémon pequeño hacia un costado. Usar fondos tranquilos, contraste equilibrado y texturas limpias, con detalle concentrado en la acción.

Las descripciones explican la acción principal en una frase breve. Evitar punto y coma y aclaraciones sobre lo que una carta no hace. Los valores precisos van en estadísticas.

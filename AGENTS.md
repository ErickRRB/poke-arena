# Geometría del juego

## Publicación directa en Cloudflare

Cloudflare es el único destino habitual de publicación de la aplicación y sus medios. La URL canónica es `https://poke-arena-web.eriickramiirez.workers.dev`; usarla en entregas y enlaces nuevos. Usar Node.js 22.18 o superior y las dependencias existentes. Desde `realtime/frontend`, `npm run build` prepara Build Output sin activar y `npm run preview` sube una versión sin activarla. La publicación habitual es exclusivamente `npm run deploy -- --manifest RUTA --decision RUTA`: ejecuta el guard real, comprueba la revisión independiente del plan y la decisión de calidad de Root y promueve el ID inmutable aprobado al 100%, sin reconstruir ni volver a subir. `cf deploy` directo no es una ruta normal de publicación frontend. Seguir [Publicación del frontend](docs/frontend-publication.md), con fuente, árbol, Build Output, versión y alcance vinculados; sin registros suficientes, corregir el error de calidad sin pedir nuevamente un permiso de despliegue ya vigente.

El servidor multijugador se publica por separado desde `realtime`, también con `cf`. Actualizarlo cuando cambien reglas compartidas, catálogo, snapshots o protocolo; una corrección visual del frontend no requiere desplegarlo. Su revisión y decisión de Root dependen del riesgo y alcance propios: su `npm run deploy` no aprueba frontend ni queda automatizado por el wrapper frontend. La automatización de esa ruta realtime permanece como seguimiento separado abierto. Validar sólo las áreas afectadas. Los cambios exclusivos de documentación se sincronizan con GitHub sin desplegar la aplicación ni el servidor.

GitHub `main` conserva el código y su historial completo. No reescribir ni forzar el historial. La rama `site-publication`, su worktree y las versiones existentes de Sites son históricos: no sincronizarlos, igualar sus árboles, generar archivos de entrega ni publicar nuevas versiones de Sites como parte de una corrección normal.

La aplicación de Cloudflare no debe depender de Sites en ejecución. Sus medios usan `ASSETS` y sus partidas usan el servicio WebSocket de Cloudflare. El namespace HTTP `/api` está retirado del frontend: responder `410` con indicación de actualizar, sin reenviar credenciales, sesiones ni acciones a otro origen. No reintroducir ese proxy ni crear una migración D1 para estados temporales que el cliente actual no usa.

Sites queda como puente legado existente y aloja la API HTTP antigua sólo en su propio origen. Conservar su enlace, configuración y almacenamiento por origen para quienes tienen mazos guardados allí. No borrarlo, modificarlo ni redirigirlo automáticamente al publicar en Cloudflare. Usar el flujo de Sites únicamente ante un pedido explícito de mantenimiento de ese legado. `npm run build` en la raíz genera el Worker de compatibilidad para Sites y no forma parte del despliegue habitual del frontend.

## Calidad de la entrega completa

Aplicar un estándar absoluto de resultado terminado a todo Poké Arena. Una mejora respecto de una versión mala puede seguir siendo inaceptable. Pasar pruebas, conservar números o fuentes 1:1 y no introducir regresiones no demuestran calidad visual, sonora ni de uso. Evaluar el conjunto: sprite, pose, emisor, trayectoria, velocidad, visibilidad, área física e impacto deben funcionar juntos. Corregir una trayectoria no justifica perder el gesto del personaje o volver casi invisible su ataque; Charizard debe conservar una pose legible y fuego visible que salga de su boca.

Antes de cambiar un componente, revisar sus requisitos y restricciones anteriores. Un pedido nuevo se suma a los anteriores salvo que los reemplace explícitamente o exista un conflicto justificado y registrado. Por ejemplo, superponer la vida al gráfico de una torre conserva el requisito de vida enemiga arriba.

Antes de implementar o revisar, registrar un plan versionado con criterios y cobertura derivados del pedido. Antes del veredicto, Root o un revisor existente coteja explícitamente su suficiencia contra pedido, diff, rutas compartidas, riesgos y exclusiones; deja un recibo breve con razones y límites, sin crear un agente o etapa redundante. La estructura, fecha y hashes no prueban suficiencia. Corregir y versionar omisiones justificadamente, conservando fallos e historia, sin fingir preregistro. Mantener decisiones técnicas, visuales/perceptuales y de uso separadas; un criterio requerido no evaluado bloquea el cierre. Entregar al revisor fresco un paquete de reproducción separado de las conclusiones del autor. El movimiento se evalúa con el bucle natural a escala y contexto reales, por reproducción o secuencia densa con tiempos y método declarados, sin fingir capacidades perceptuales. La publicación parcial identifica su alcance aprobado y conserva abiertos los demás criterios.

Usar [Desarrollo con menos retrabajo](docs/development-workflow.md) y su checklist de diez puntos según el riesgo. Definir desde el inicio la acción completa, sus contratos y la incertidumbre principal; mostrar una primera demostración antes de extender la solución o una matriz amplia. No exigir un expediente de publicación a cada prototipo local.

Las etapas se aplican a las dimensiones pertinentes del cambio:

1. El autor verifica que la implementación funciona y documenta el alcance y sus límites.
2. Una persona o agente que no sea autor realiza la revisión técnica independiente.
3. Un revisor independiente examina la calidad visual y de uso en movimiento, a tamaño real y en contexto de juego, incluido móvil. Para audio se entregan clips reales de combate y se distingue la verificación técnica de una audición humana o una aprobación perceptual que efectivamente hayan ocurrido.
4. Se corrigen los hallazgos y se vuelve a verificar el resultado. La evidencia identifica fecha, SHA y árbol o hashes de los archivos del candidato final; las capturas de versiones anteriores no aprueban un cambio posterior.
5. Root decide la calidad final del conjunto con los informes y las evidencias de los autores y revisores. Root coordina y revisa el resultado; no reemplaza al autor ni hace las pruebas iniciales.
6. Se publica en Cloudflare con la autorización vigente y se comprueba el resultado público. No pedir nuevamente un permiso de publicación ya otorgado.

Nadie aprueba en solitario su propio cambio. No marcar el trabajo terminado mientras queden hallazgos que impidan que el resultado completo cumpla este estándar.

Una misma persona independiente del autor puede revisar aspectos técnicos, visuales y de uso si tiene capacidad y expresa conclusiones separadas. Para documentación o cambios de bajo impacto, revisar el diff y la vista afectada cuando corresponda; no ejecutar combate, video ni matrices sin un riesgo concreto. Reutilizar evidencia válida de artefactos y condiciones idénticos, sin convertir identidad de bytes en juicio de calidad.

El orquestador es responsable también de la eficiencia. Revisar el proceso al comenzar un lote, tras la primera demostración, antes de integrar y al cerrarlo; intervenir si se repite un fallo, se pierde una restricción conocida o otra iteración no aportaría información nueva. Detener esa iteración, identificar la causa y cambiar método, contrato, herramienta o responsable antes de seguir. No responder automáticamente con más tests, agentes o formularios. Leer la skill [orquestar-calidad](.agents/skills/orquestar-calidad/SKILL.md) al coordinar varios hilos o corregir un bucle de retrabajo.

Mantener una ficha autoritativa y un runner parametrizable por trabajo relacionado. Autor y revisor pueden observar la misma captura íntegra con juicios independientes; no recapturar ni abrir worktrees por rutina. Cada ejecución conserva una salida nueva y sus condiciones realmente observadas. Las mejoras de proceso no reanudan cambios que el usuario haya pedido pausar.

Al servir música, comprobar en la plataforma publicada las respuestas `206`, `416` y `If-Range`, sus cuerpos y cabeceras, además del avance real de reproducción y la transición al final de una pieza. Que el MP3 cargue o que el servidor local soporte rangos no demuestra que la búsqueda temporal funcione en producción. Las pruebas deben reproducir el comportamiento real del binding de archivos; no suponer que devuelve fragmentos si la plataforma entrega el archivo completo.

Al preparar una publicación de la app o cerrar una entrega que usa registros estructurados, Root y el publicador ejecutan `npm run review:check -- ruta/review.json` y examinan el resultado, los informes y sus límites. El plan previo, evidencia compatible, hallazgos y alcance parcial se registran según [Control de revisión](docs/quality-review-gate.md). No fabricar un expediente de publicación para documentación o herramientas locales sin despliegue: comprobar sus invariantes pertinentes y conservar la revisión real. Un resultado automático favorable no decide calidad ni valida por sí solo el proceso.

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

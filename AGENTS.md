# Geometría del juego

Los indicadores de carga, búsqueda de rival, conexión, guardado y errores temporales van en capas flotantes o absolutas. Nunca agregan filas ni cambian el tamaño o la posición del menú, sus controles, la arena o la mano. Para la carga inicial, usar una Pokébola animada con progreso real de los recursos; para esperas sin progreso medible, una Pokébola indeterminada. Respetar la opción de reducir movimiento y conservar los anuncios accesibles sin texto visible que ocupe espacio. Verificar con carga demorada y errores, comparando rectángulos en móvil, tablet y escritorio.

La arena, la mano y el elixir conservan su tamaño y posición cuando aparecen controles o información durante una partida. Ninguna habilidad, aviso, botón o control transitorio debe crear filas, márgenes o espacio adicional que achique o desplace el tablero.

Los controles de combate transitorios van en `#battle-overlays`, como capas absolutas sobre la arena. Las habilidades aparecen junto al borde inferior, encima de las cartas. La capa deja pasar los eventos en las zonas sin controles. Si hay muchas acciones, se desplazan dentro de esa capa; no agrandan el panel de cartas.

Al modificar esos controles, comparar los rectángulos de la arena, la mano y la barra de elixir antes y después de mostrar una y varias acciones, en móvil, tablet y escritorio. Deben permanecer iguales. Comprobar que los botones sigan siendo accesibles y que los espacios libres permitan tocar la arena.

El mazo se guarda localmente en cada cambio y se restaura al volver a entrar. No reemplazar una selección guardada por el mazo inicial al actualizar el catálogo; migrar las claves y conservar las cartas válidas, su orden y los huecos pendientes.

Cualquier acceso al inicio durante una partida contra CPU pide confirmación y pausa la partida mientras se decide. Al cancelar, conserva la pausa previa o reanuda según corresponda. Durante una partida online activa, los accesos al inicio quedan bloqueados. Una recarga intenta recuperar la sesión y la misma sala antes de terminar de descargar los recursos gráficos, sin iniciar otra búsqueda ni enviar una cancelación al salir de la página.

# Ilustraciones y menús

Las cartas nuevas y las ilustraciones que se renuevan deben mantener el nivel de las escenas existentes: Pokémon o ataques integrados en un entorno completo, con fondo, iluminación y perspectiva compartidos. Usar ilustraciones originales; los iconos simples y los recortes de personajes sobre un fondo genérico no cumplen ese estándar.

Variar las poses y las orientaciones del conjunto. Combinar vistas frontales, perfiles, diagonales y acciones hacia la izquierda y la derecha; no dar a todas las cartas la misma dirección. Revisar las imágenes dentro de la colección, conservando sus siluetas y acciones legibles al tamaño real de las cartas.

Para los menús, seguir la preferencia de una interfaz inspirada en los juegos de Nintendo de alrededor de 2000, con paneles crema, bordes oscuros y acentos rojos y amarillos. Priorizar espacio para las cartas: el editor mantiene los cuatro selectores junto a la X, sin título ni contador general.

Los nombres de las cartas se alinean arriba y los roles abajo. Conservar la proporción de las ilustraciones en todas las vistas. En los hechizos, priorizar la silueta del ataque y permitir como máximo un Pokémon pequeño hacia un costado. Usar fondos tranquilos, contraste equilibrado y texturas limpias, con detalle concentrado en la acción.

Las descripciones explican la acción principal en una frase breve. Evitar punto y coma y aclaraciones sobre lo que una carta no hace. Los valores precisos van en estadísticas.

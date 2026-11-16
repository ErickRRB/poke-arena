# CPU: investigación y comprobaciones de autor

Consulta 2026-11-16. RoyaleAPI presenta datos propios de partidas, no pruebas de balance de Poké Arena. Los resultados recuperados son índices sujetos a cambios y ventanas distintas, no una clasificación global comparable. Los mazos locales son adaptaciones, no copias ni garantía de fuerza.

| Referencia observada | Ventana indicada | Adaptación y sustituciones |
|---|---|---|
| [Hog 2.6 Cycle](https://royaleapi.com/decks/popular?lang=en&time=7d&type=All), variantes listadas | 7 días | Ciclo veloz: Rapidash como Hog, Cannon, Ice Wizard, Archer, Skeletons, Electro Spirit, Fireball y Log. No hay Musketeer asignada: Archer cumple apoyo aéreo con diferencias. |
| [Golem Double Dragon Nado](https://royaleapi.com/card/tornado?lang=en&time=7d) | 7 días; lista filtrada por Tornado | Doble dragón: Golem, Baby Dragon, Electro Dragon, Ice Wizard, Skeletons, Tombstone, Tornado, Lightning. Sin colector, se usa Tombstone; Electro Dragon no es Inferno Dragon. |
| [Giant](https://royaleapi.com/decks/popular?lang=en&time=7d&type=All) | 7 días | Gigante y apoyo: Giant con Witch, Mini P.E.K.K.A., Minions, Goblins, Tombstone, Fireball, Zap. Adaptación de roles, sin afirmar misma composición. |
| [Graveyard](https://royaleapi.com/decks/popular?inc=graveyard&lang=en&time=7d) | 7 días; búsqueda filtrada | Control nocturno: Graveyard, Valkyrie, Ice Wizard, Baby Dragon, Tombstone, Skeletons, Tornado, Log. Adaptación clásica de control. |
| [Goblin Barrel](https://royaleapi.com/decks/popular?inc=goblin-barrel&lang=en) | 1 día; búsqueda filtrada | Emboscada: Barrel, Gang, Princess, Tesla, Skeleton Army, Knight, Fireball, Log. Adaptación de bait, no réplica de sus variantes recientes. |

Cada conjunto contiene ocho claves seleccionables distintas. Costos efectivos medios respectivamente 2,63; 4,13; 3,50; 3,13; 3,13. Los contratos `nativeReference` no prueban clon perfecto. No se usan cartas WIP ni ambos alias Hog.

## Primera acción completa y control

Game real, seed 4, 30 Hz, CPU con Remolino y 3 de elixir, dos Snorlax rivales en (210,300)/(270,300), Charizard aliado en (240,215). Remolino se lanzó en t=0,033; impacto Charizard t=0,567. En t=1 la separación era 4,25 y ambos HP 3716. En control sin CPU y sin lanzamiento, separación 53,14 y HP 3968/3800. El motor y cuerpos se movieron normalmente. No se grabó demostración visual ni hubo juicio de uso.

King: Game seed 7, Hog en (200,160), CPU Remolino t=0,033; en 4 s rey activado con 634 de daño recibido y princesa sin daño. Sin Remolino, rey inactivo y princesa recibió 951. Esto demuestra una situación, no que siempre convenga sacrificar HP de rey. La regla está restringida a Hog y una ventana geométrica, no predice todos los recorridos ni el valor estratégico de HP remanente.

Pruebas: `node --test tests/engine.test.mjs` 23/23; `node --test tests/new-archetypes.test.mjs` 24/24. `npm run test:battle` original 192/194: un fallo por expectativa obsoleta de diez mazos corregido y otro en `knockback.test.mjs:43` también reproducido sin cambios en public219. Salida original en `battle-result.txt` local sin versionar. El fixture con la torre caída demuestra un despliegue, no cubre todos los bloqueos posibles. La cancelación se evaluó con atacante aliado aturdido.

Pendiente para aceptación: runner visual existente a tiempo real/rAF y tamaño móvil, pausas y revisión independiente; ampliar defensa más allá de perseguidores de edificios; pruebas de trayectorias, masa/colisiones, tiempos de proyectil y distintos perfiles; selección inteligente de condiciones de victoria y soporte. El primer algoritmo sólo considera apoyo activo cercano y puede fallar para alcance/movimiento, colisiones o ataques que no llegan durante el campo. El criterio genérico de hechizos es deliberadamente sencillo y no constituye optimización completa. No se evaluó disfrute ni dificultad real con jugadores. No publicar como implementación completa sin resolver y revisar esos puntos.

Seguimiento de defensa: Hog en (200,210), CPU con 3 elixir, 30 Hz durante 4 s: Remolino lanzado, torre izquierda sin daño y rey inactivo; control sin Remolino recibió 951 en esa torre. La trayectoria puede cambiar de carril y no mide todas las consecuencias. La regla cubre unidades móviles que buscan edificios, no toda amenaza individual.

## Demostración móvil del prototipo CB9 y revisión inicial

Preflight del primer cuadro: viewport 390×844 DPR 1, estado pausado, sin diálogos; Snorlax 7/8 equipo 0 en (210,300)/(270,300), ambos 3968/3968; Charizard 9 equipo 1 en (240,215), 1152/1152; mano CPU Remolino/Pikachu/Snorlax/Charizard, energía 3. Se fijaron posiciones, mano y seed sólo para el fixture; fueron `spawn` directos y no una jugada de usuario. Se conservó comportamiento de torres, `Game.step(1/30)` y rAF real. Sonido silenciado.

Captura completa de canvas y contexto DOM estático: `../.supervision/cpu-pull-mobile/2026-11-16T04-09-31-935Z-77b5e2d1-4df2-4fdf-a91a-1796f7931323/`; `canvas.webm` tiene 736 PTS desde 0 hasta 6,048 s. CPU lanzó en t=.067 de juego; Charizard impactó a ambos por 168 en .600 y Remolino por 84 en .667. En t≈.9 quedaron a 4,8 px y 3716 de vida cada uno. No demuestra movimiento del DOM ni audio. El primer intento `2026-11-16T04-08-59-121Z-a4cc4a98-41e3-4762-952a-54deb4cc8fa3` conserva fracaso CDP por marcas descendentes, aunque su canal canvas concluyó; no se reordenaron marcas.

Recheck independiente inicial: campo y convergencia legibles; cuerpos y barras se superponen y no distinguen dos impactos sólo por imagen, aunque los eventos los atribuyen. No hubo juicio de fluidez ni aprobación general. El informe técnico independiente halló además que CPU rechazaba remate al rey; se corrigió después de esta captura.

## Cambios posteriores al recheck

La CPU prioriza un remate de torre legal incluso con poca energía; guarda Log ante un aislado y lo usa ante un grupo alineado; considera alcance aéreo en defensa, inicia condición de victoria disponible y acompaña un ataque activo en su carril. Para Remolino exige un atacante de área compatible, disponible y con tiempo estimado de impacto durante el campo, y no agrupa objetivos ya cubiertos por splash. Esta estimación es conservadora y aproximada: movimiento, colisiones, adquisición de objetivos y trayectorias pueden diferir. El desvío de Hog puede trasladar daño al carril contrario (en la prueba registrada, 317 contra 951 sin Remolino), no debe interpretarse como predicción universal.

`node --test tests/engine.test.mjs tests/new-archetypes.test.mjs`: 57/57 en esta iteración. Se preserva la prueba de combate previa 194/195 con el fallo visual de base `knockback.test.mjs:43`; no se ejecutó otra matriz. La muestra de un push, su apoyo, una defensa aérea y hechizos no constituye validación de balance o diversión. Es preciso recheck independiente del diff final y observación del nuevo candidato.

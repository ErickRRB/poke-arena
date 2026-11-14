# Revisión global de movimiento y ataques

Se inspeccionaron las **54 láminas completas**, con las **108 claves con cuerpo, 100 especies y ocho direcciones**. El corte inicial permitió encontrar seis defectos concretos que afectan siete claves. Las siete se corrigieron y **se recapturaron y revisaron después con Game y Renderer reales**, en simulación local a 30/60 Hz y snapshots a 15 Hz: 168 timelines, 192 contactos, cero hallazgos de las comprobaciones. El [visor corregido](after/index.html) conserva 14 láminas y 14 videos; las 54 imágenes iniciales permanecen como evidencia anterior. Charizard, Scyther y Salamence figuran en el inventario; el juicio de sus tres rigs corresponde al auditor asignado a ellos.

El [visor](index.html) permite abrir cada lámina a su tamaño original. El [CSV completo](all-body-cards.csv) clasifica todas las claves, sin filas pendientes. [review.json](review.json) registra la revisión de cada lámina, sus SHA256 y las decisiones por carta. Hay 105 decisiones artísticas de esta revisión y tres delegadas. Revisar todo el catálogo no equivale a declarar terminado el trabajo de calidad de combate.

## Qué se capturó

`scripts/qa-global-motion.mjs` abre la aplicación real con Edge y Playwright, en 390 × 844. El tablero mide 370 × 677 píxeles CSS. Se usa la proyección de Renderer, incluidos `visualActor`, `sprite`, `drawEffects`, `visualEmission`, los offsets nativos y el anclaje efectivo. Las imágenes muestran el tamaño móvil de cada cuerpo, sin ampliarlo para aparentar mayor detalle.

La escena es **estática y sintética, no una partida**. El fixture desactiva el avance del juego en memoria y entrega `attackStart` y `attackRelease` sintéticos en windup + separación de cada impacto. Así recorre la barrera visual de contacto autoritativo, sin atribuir esos eventos al motor real. Se muestrean los ataques completos a 60 muestras por segundo y dos ciclos nativos de movimiento; las estructuras de velocidad cero permanecen en `Idle`. Se obtuvieron **128.392 muestras**.

Las 27 láminas de ataque y 27 de movimiento reúnen cuatro cartas por página. Cada una incluye todas las poses nativas distintas que efectivamente dibujó Renderer, además de preparación, cada contacto y recuperación. `galleryMissingPoses` está vacío en las 1.728 combinaciones carta/estado/vista. Esto permite revisar los cambios de dibujo sin afirmar que existen 60 dibujos nativos distintos por segundo. Los sostenidos cuantificados cuentan el mismo raster recortado; un anclaje o una transformación pueden continuar moviéndose durante ese sostenido.

Los puntos rojos y azules de las láminas son las dos consultas reales al emisor. Se revisó que permanecieran ligados al cuerpo o miembro previsto y se conservaron sus coordenadas. Esto no demuestra la trayectoria, colisión o claridad de un proyectil en combate.

## Defectos del corte y correcciones posteriores

Los índices de frame son base cero. Los contactos y tiempos originales están conservados por dirección en [inventory.json](inventory.json) y por muestra en [samples-60hz.json.gz](samples-60hz.json.gz).

| Hallazgo | Evidencia capturada | Corrección presente después de la captura |
| --- | --- | --- |
| F01 Lugia | [Ataques 04](attack-04.png): `Shoot` 0/1 está erguido; C1 usa 1 y el gesto frontal de vuelo 2 llega después. | `[10,2,10]`, contacto explícito 2 y anclaje de cuerpo. 10 es planeo de recuperación; se excluyen 0/1 de pie. |
| F02 Koffing | [Ataques 02](attack-02.png): el humo amarillo dibujado en `Attack` sale hacia atrás respecto del objetivo. | `Shoot [0,1,7,0]`, contacto 7 y anclaje de cuerpo. Se omite 15 con motas amarillas. |
| F03 Kangaskhan y cría | [Ataques 08](attack-08.png), [25](attack-25.png): `Attack` gira unos 270° y el contacto 6 queda perpendicular al rival. | `Shoot [0,7,8,7,0]`, contacto 8, anclaje y emisor de cuerpo para ambas claves. Es un golpe de cuerpo frontal. |
| F04 Snorlax | [Ataques 08](attack-08.png): el contacto de `Stomp` ocurre en 4, todavía en el aire; el apoyo de caída está en 7. | Contacto explícito 7, preservando todo el clip y la barrera autoritativa. |
| F05 Rayquaza | [Ataques 05](attack-05.png): C1 sigue en `Shoot` 1, con cuello elevado; 2 adelanta la cabeza después de la emisión. | Contacto explícito 2 y anclaje de cuerpo. |
| F06 Beedrill | [Ataques 22](attack-22.png): los dos impactos físicos sostienen el mismo gesto de aguijón sin una nueva preparación. | Preparación 4, contacto 10, recuperación 16 y reposo 0 por release, usando manos nativas alternadas y anclaje de cuerpo. |

La presencia de esas entradas se comprobó al cerrar el informe. La [recaptura posterior](after/README.md) identifica otro corte por hashes y verifica las siete correcciones. Las láminas anteriores no se sustituyeron mientras se corregía el código.

Se compararon específicamente los clips alternativos ya existentes en disco, sin descargar ni editar sprites:

- [Koffing / Shoot en ocho vistas](native-109-Shoot.png) tiene cuatro dibujos recortados: 0, 1–6 inflado, 7–14 comprimido y 15 con motas. El HitFrame 3 del XML todavía muestra la preparación inflada. Para el gas común dirigido al objetivo, 7 representa mejor la compresión de emisión y permite omitir las motas finales.
- [Kangaskhan / Shoot en ocho vistas](native-115-Shoot.png) tiene tres dibujos: 0–6 con brazos elevados, 7 intermedio, 8–14 con torso/cabeza hacia el rival; 15 repite 7. Conserva la orientación en todas las vistas. No hay un `Punch` local. El gesto propuesto encaja con `Golpe cuerpo`; no se describe como un puñetazo de brazo extendido.

[native-shoot-comparison.json](native-shoot-comparison.json) conserva dimensiones, duraciones, marcadores, equivalencias de raster y hashes de los seis PNG de estas comparaciones.

## Sostenidos y torsiones aceptados

Rhydon conserva una torsión lateral acotada, aproximadamente ±45°, para cargar Megacuerno. Sus contactos 2/3 miran al rival en las ocho vistas. **No da una vuelta completa** y no se recomienda eliminar ese movimiento.

Los sostenidos de conjuro de Zapdos, Venusaur, Bulbasaur, Alakazam, Mr. Mime, Roselia y Dusclops son compatibles con emitir desde cabeza, bulbo, manos u ojo. Las ráfagas de Cloyster, Blastoise, Starmie y Kyogre pueden mantener una postura de disparo. No se les exige simular un nuevo puñetazo por proyectil. Dusclops, cuya clave sigue siendo `duskull`, usa Tinieblas desde el ojo; sus brazos elevados después pueden ser recuperación.

El sostenido de carga de Registeel antes del impacto pesado es deliberado. Madriguera, Central Electrode, Vivero y Wobbuffet no tienen ataque programado activo: forzar su clip en el inventario no lo convierte en una acción alcanzable. Wobbuffet puede permanecer con un único dibujo frontal en reposo. Las otras estructuras también conservan `Idle` cuando no disparan.

En movimiento no apareció otro defecto claro de orientación o una pose de aterrizaje incrustada en los ciclos revisados. Pidgeot alterna dos dibujos de vuelo; Dragonite recorre cuatro dibujos sin los primeros frames de despegue. Lugia y Skarmory pueden planear con dos dibujos. Diglett se aplana para excavar. Pasos, patas, colas, nubes y cuerpos serpentinos completan sus ciclos según cada silueta. Esta conclusión excluye el juicio artístico de los tres rigs delegados.

## Observaciones opcionales

| Clave | Observación | Alcance de la recomendación |
| --- | --- | --- |
| Geodude | El barrido de brazos y cuerpo tiene torsión lateral marcada. | Revisar si molesta en contexto; no se probó una vuelta completa ni un contacto inválido. |
| Regirock | La carga desplaza el torso hacia los lados antes del golpe. | Conservar por ahora; no se declara un error de hitbox u orientación. |
| Mewtwo | `Shoot` 7 dibuja una esfera azul después del primer release. | Puede leerse como afterglow; comprobar si parece una segunda carga antes de cambiar el clip. |

## Casos que requieren otras pruebas

Forretress se retira al primer impacto de su explosión real; la recuperación sintética posterior no demuestra una congelación alcanzable. Voltorb usa `stepLeap` en su ataque automático: esta escena inspecciona su clip `Attack` directo, sin validar la trayectoria de salto. El cuerpo base de Pandilla es Poochyena; sus Ralts, los otros miembros de enjambre y sus rutas se verifican con despliegues reales. La Horda Diglett de estas hojas representa un cuerpo individual, sin probar la distribución de sus 15 integrantes.

Los tamaños corresponden a este checkout aislado. La calibración paralela de `main`, incluidas las 17 especies ya reajustadas, no queda homologada por estas imágenes. La revisión anterior de dimensiones conserva medidas separadas de alto y ancho en `qa/global-scale-audit`. Este informe no duplica esas propuestas.

El recorrido global inicial no mide combate. La recaptura de siete claves sí usa `Game.attack` y `Game.step` reales en un escenario aislado de atacante y objetivo resistente, sin IA ni torres. No valida selección libre de objetivo, rangos, trayectorias/colisiones generales, stun, bloqueos, reparto de líneas, retraso tras spawn, audio, voces, rendimiento, frame pacing, preferencia de movimiento reducido ni calidad subjetiva de fluidez. Las 13 claves sin cuerpo, identificadas en el inventario, están fuera de esta revisión de sprites. Las regresiones del motor y las pruebas visuales de grupos complementan esta evidencia.

## Procedencia y reproducción

[inventory.json](inventory.json) registra SHA256 de los módulos, manifiesto y 873 archivos de activos consultados. Los módulos se compararon antes y después del recorrido: sólo cambió `wing-motion.js`, trabajado en paralelo por el auditor de los tres rigs. Por eso se excluye expresamente su veredicto artístico. No hubo una nueva generación de geometría durante este recorrido.

Los cinco clips añadidos para combos tienen fuente y commit fijados en [combo-poses/provenance.json](../combo-poses/provenance.json). Para los sprites preexistentes, este informe identifica los archivos locales exactos por SHA256 y conserva sus créditos en el repositorio; no vuelve a atribuirles una descarga nueva.

Para producir un **nuevo corte**, desde la raíz del checkout:

```powershell
node scripts/qa-global-motion.mjs
```

El guion resuelve Playwright instalado o el fallback del checkout hermano `pokemon-arena`; también admite `PLAYWRIGHT_MODULE` y `PLAYWRIGHT_CHANNEL`. Abre un servidor local efímero en el mismo proceso y lo cierra al terminar. No instala paquetes ni publica. Una nueva ejecución reemplaza muestras, imágenes y CSV, y **requiere repetir la revisión manual de lo modificado**; el estado de esta revisión pertenece a los hashes conservados en `review.json`.

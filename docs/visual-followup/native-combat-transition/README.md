# Inventario provisional de la transición a combate nativo

Este documento delimita la QA que hará falta después de integrar el motor. Es una comparación de datos y de rutas estáticas del código; **no acredita el combate ni la fluidez de la configuración nueva**. No se ejecutaron `Game.step`, `Game.attack`, Renderer, navegador, cámara ni mediciones de escala.

## Corte y procedencia

El corte coherente se congeló el **2026-11-14 a las 19:10:53.329 UTC**. Las revisiones posteriores del análisis reutilizan esos mismos bytes, comprobados por SHA-256. La fecha `generatedAt` indica cuándo se produjo el informe; `sourceCutGeneratedAt` conserva la fecha de los módulos originales.

| Fuente | HEAD registrado | Estado del árbol en el corte | Módulos/manifest congelados |
|---|---|---|---:|
| Baseline `pokemon-arena-search-timer` | `6ab2d56d82eede0fa17304d4e92df7976360b3ef` | 1 ruta sin seguimiento; runtime estable | 35 |
| Candidato `pokemon-arena` | `d86ad667bab2d34e2b70b49961165001d6cea85b` | 55 rutas modificadas o nuevas; cambios sin commit | 39 |

El HEAD del candidato **no identifica por sí solo** la configuración analizada: los archivos modificados también forman parte del corte. `inventory-provisional.json` contiene SHA-256 y bytes de cada entrada, el estado de Git y las rutas de sus copias congeladas locales. La huella agregada de las entradas es:

```text
baseline   48adc1edfafb7d91684fcf4501b02d038902d29267dd1635532767faa8c2d6fb
candidato  64b53eb1c5b92298187bb76acadc9bc8f2a4dd974b55e6daa8d94b6c89f7661d
```

Main continuó cambiando después de este corte. Un intento posterior de importar su árbol en edición encontró un balance de token incompleto; no se mezclaron esos archivos parciales con el inventario. **Este informe no pretende representar el main más reciente ni un checkpoint final.** Cuando llegue el checkpoint, hay que generar una nueva comparación.

Los PNG activos de Anim/Offsets/Shadow se registran por hash y dimensiones IHDR, por separado de los módulos. Se encontraron 603 entradas de archivo entre ambas fuentes, sin faltantes y sin cambios respecto al análisis previo de esos mismos archivos. Esto comprueba disponibilidad y procedencia; no es una inspección visual de alfa, poses o encuadre.

## Alcance resultante

Se compararon las **123 claves** de la unión: 122 en baseline y 123 en candidato, con 109 claves que tienen cuerpo Pokémon en cada fuente. Las cantidades de claves, cuerpos y especies no son intercambiables.

| Clasificación excluyente | Claves |
|---|---:|
| Existentes con cambio de contrato relevante | 114 |
| Nueva estructura `raltsHut` | 1 |
| Sólo movimiento, radio o física | 5 |
| Sin cambios | 3 |
| Total | 123 |

Dentro de las 114 existentes, **23 sólo cambian su demora de despliegue**. Necesitan una prueba acotada del primer ataque tras aparecer; no necesitan por ese motivo una galería nueva de ocho vistas. Las otras 91 tienen al menos otro cambio de ataque, trayectoria, interacción, cuerpo o programación. En total, el alcance afectado contiene 104 claves con cuerpo en el candidato, correspondientes a 98 especies, y 11 claves de efectos o estructuras sin cuerpo Pokémon.

Se conservaron todos los cambios crudos en la matriz, incluidos HP y daño, pero esos dos campos no seleccionan la QA de sprites. Ausencia frente a `false`, `0` o `1` se normaliza según el comportamiento del motor; los valores equivalentes y el ruido de coma flotante no amplían la selección. El despliegue usa su valor por defecto real de `.75`, y los tokens que reciben una demora desde el padre no se tratan como cartas desplegables independientes.

Las cinco claves con cambios físicos solamente son `babyKangaskhan`, `electrode`, `exeggutor`, `nidoranF` y `registeel`. Se excluyeron de la nueva revisión de poses. `spikes`, `stealthRock` y `whirlpool` no cambian en este corte.

## Hallazgos y decisiones para el integrador

### Frames válidos; contrato nuevo aún por verificar

No se detectaron clips activos ausentes, índices fuera de rango en `attackFrames`, `attackGestures` o `attackContactFrame`, contactos excluidos del clip, geometría ausente ni marcadores no numéricos. Tampoco se detectaron liberaciones programadas después de `attackDuration`. Los tres guardias de torre (52, 31 y 34) tienen sus clips y geometría disponibles. **Cero errores estructurales no demuestra que el gesto sea adecuado.**

Ninguna clave existente cambia el nombre de `attackAnim` en este corte. Por eso no apareció el caso literal «nuevo attackAnim con índices del anterior». Sí cambian cuerpos bajo el mismo nombre de clip, la cadencia y el modo de entrega: esos cambios requieren observar el gesto en su contexto nuevo.

### Beedrill: cuerpo a cuerpo → proyectil

Pasa de rango 30, dos impactos separados `.16`, duración `.82`, a rango 60, un impacto y duración `.66`; mantiene `Attack`, el gesto nativo 4/10/16/0, estilo `slash` y emisor `hands`. La nueva ruta del motor es un proyectil de suelo. Los índices siguen siendo válidos, pero la galería melee anterior no acredita el lanzamiento, su separación de las manos ni el impacto. Revisar las ocho vistas y la transición al proyectil real, conservando el gesto si funciona con esa entrega.

### Forretress: dos cuerpos y ataque a distancia de alcance corto

Pasa de uno a dos cuerpos; rango 28→12, intervalo 1.6→1.2, duración `.75`→`.36`, `rangedAttack:true`, estilo `slam`, emisor efectivo `head`. El motor sí lo dirige al camino de proyectil, aun con rango inferior a 50, y después retira al atacante por su comportamiento suicida.

En este corte, Renderer todavía decide el impulso corporal con `range < 50`, y `combat-visuals` usa `range >= 50` para una clasificación de proyectil de área. Es una posible divergencia entre presentación y entrega explícita: comprobar la carga, ambos cuerpos, explosión y retiro desde el despliegue real. No se declara un fallo observado en combate.

### Diecisiete bursts pasan a un impacto

| Antes → después | Claves |
|---|---|
| 5→1 | `cloyster` |
| 4→1 | `machamp` |
| 3→1 | `blaziken`, `charizard`, `dragonite`, `salamence`, `squirtle`, `starmie` |
| 2→1 | `beedrill`, `blastoise`, `crobat`, `kyogre`, `nidoking`, `sceptile`, `scizor`, `scyther`, `vulpix` |

Las pruebas antiguas de cuatro puños, dos guadañas o varias llamaradas no validan estas secuencias. Se deben contrastar el gesto y el único `attackRelease` nuevo. Scizor y Crobat conservan dos variantes de gesto; con `burst:1`, la segunda no se utiliza. Es metadata sobrante, sin índice inválido: decidir si conservarla como variante disponible o simplificarla después de verificar la secuencia.

### Despliegue y primer ataque

**49 cartas existentes pierden `deployTime:1` y adoptan el valor por defecto `.75` de `Game.deploy`.** No es una diferencia cosmética del objeto: cambia cuándo termina el despliegue. Además hay cambios de `deployStagger`, por lo que el grupo acotado de reloj de despliegue contiene 58 claves, incluida la estructura nueva.

Las 23 existentes cuyo único cambio de control es la demora de despliegue son: `absol`, `aggron`, `altaria`, `blissey`, `chansey`, `ditto`, `ekans`, `flygon`, `gastly`, `gengar`, `grimer`, `gyarados`, `kangaskhan`, `koffing`, `magnemite`, `meganium`, `metagross`, `mrmime`, `nidoqueen`, `regice`, `skarmory`, `umbreon` y `wobbuffet`.

Para ese subconjunto basta comparar aparición, fin de demora y primer ataque automático a 30/60 Hz y con snapshots a 15 Hz, mediante un objetivo resistente. No corresponde declarar una nueva revisión artística completa de esas especies.

### Torres y Tesla

| Caso | Preparación nueva | Intervalo | Duración visual derivada de `Game.attack` |
|---|---:|---:|---:|
| Las cuatro torres de princesa / guardia 52 | .8 | .8 | .96 |
| Los dos reyes / guardias 31 y 34 | .5 | 1 | .66 |
| Tesla / Ampharos | .4 | 1.1 | .56 |

Las duraciones de torre se derivaron estáticamente de `Math.max(.6, windup + .16)`. Su campo inicial de constructor sigue siendo `.6`; no hay que confundirlo con el valor usado por el siguiente ataque. El código candidato procesa trabajos vencidos antes de iniciar el siguiente ciclo de las torres, así que la igualdad preparación/intervalo no prueba por sí sola que se cancelen disparos.

Verificar al menos tres ciclos sostenidos, adquisición inicial, cambio de blanco, activación del rey, interrupciones admitidas y pausa. Comprobar el orden de `attackStart`/`attackRelease` cuando un release vencido y la siguiente secuencia comparten tick, tanto localmente como con paquetes a 15 Hz.

**Tesla no tiene preparación igual al intervalo en este corte.** Se incluye como control y deberá actualizarse con el checkpoint final si cambia. Su `rangedAttack:false` tampoco la vuelve melee: el estilo `lightning` selecciona el haz antes de consultar ese booleano.

### Ditto: dependencia de los campos nuevos

La lista de campos copiados por Transformación no incluye `rangedAttack`, `projectileStart` ni `projectileHoming`. Copiar el rango 12 de Forretress sin copiar su `rangedAttack:true` puede producir una ruta diferente; copiar un proyectil explícitamente no homing sin ese campo también puede recuperar el comportamiento por defecto.

Se requiere un caso de transformación hacia Forretress y otro hacia el Bowler integrado, comprobando entrega, origen y seguimiento. Es un riesgo inferido del código. No se ejecutó la transformación ni se declara un fallo observado. Mantener el aspecto propio de Ditto no requiere por sí mismo copiar todos los emisores de la especie objetivo.

### Cuerpos, tokens y decisiones ya aceptadas

- La Pandilla cambia de 3 Poochyena + 2 Ralts a **3 + 3**, con `count` 5→6. Root confirmó que ésta es la decisión posterior del usuario y que el arte 3+3 fue aprobado. Es un cambio esperado; verificar seis miembros y reparto de líneas.
- Main conserva provisionalmente `geodude`→74 y `graveler`→75, mientras el baseline ya usa los cuerpos aprobados 83 y 534. Root informó que recibió `6ab2d56` para integrarlos. Las diferencias de identidad y los cuatro tamaños ya aceptados son diferencias esperadas de ramas; no se reabre su aprobación ni se repite la auditoría de escalas.
- El Bowler del candidato pierde el emisor explícito `body` y vuelve al efectivo `head` junto con su cuerpo antiguo. Repetir el inventario tras integrar 534/`body`; no usar una captura de 75 como evidencia del cuerpo aceptado.
- Golem pasa de la ruta `split` a `deathSpawn:'geodudeToken'` con demora 1. **Ambas rutas generan dos tokens**, verificado en los bucles del motor congelado. Revisar el disparo de muerte y la demora nueva; el Geodude pequeño sigue siendo una clave independiente.
- `raltsHut` es nueva y pasiva. Su preparación 10 e intervalo 10 no forman un caso de ataque continuo: verificar invocación condicionada por enemigo, demora de los Ralts y unidad de muerte.
- Cambian invocaciones, límites o programación en `duskull`, `madriguera`, `vivero`, `nightmare` y `sneaselAmbush`. Hay además efectos de entrada nuevos o modificados en `bulbasaur`, `lapras` y `slowbro`, y cambio del efecto de muerte de Forretress. Deben producirse desde el padre o despliegue real; invocar directamente el ataque del token no cubre esos caminos.

## Plan mínimo de QA después del checkpoint

Los grupos se solapan para reutilizar escenas. Las claves exactas y sus condiciones están en `qa-minimum-provisional.json`; no son resultados de pruebas realizadas.

| Grupo | Claves | Comprobación |
|---|---:|---|
| P0 frames | 0 | Corregir referencias estructurales antes de capturar si el próximo corte introduce alguna. |
| P1 reloj/contacto | 67 | Ataque automático y directo, tres ciclos, 30/60 Hz y snapshots 15 Hz; gesto en release e impacto en daño. |
| P1 emisor/entrega | 48 | Ocho vistas reales, unión del cuerpo al proyectil/haz, trayectoria e impacto. |
| P1 preparación completa | 1 + 6 torres | Tesla y guardias 52/31/34; cambio de secuencia en el mismo tick. |
| P2 cuerpos | 12 | Miembros, padre real, invocación/muerte, reparto y regreso a idle. |
| P2 reloj de despliegue | 58 | Fin de despliegue y primer ataque; sin nueva galería si no cambió el gesto. |
| P2 caminos especiales | 34 | Entrada/muerte, dash, salto, charge, invocaciones, spells y habilidades retiradas. |
| P2 alcance/interacción | 26 | Adquisición justo dentro/fuera del alcance nuevo y elegibilidad aire/suelo. |
| P2 copia | 1 | Ditto con los dos objetivos de contrato nuevo. |

No queda ninguna de las 115 claves seleccionadas fuera de estos grupos. Se excluyen cambios físicos puros y se separan las pruebas de demora de las artísticas. El número de vistas o muestras no equivale a igual número de dibujos nativos ni prueba fluidez o disfrute.

No se validó la cámara anunciada de 432×768 dentro de 600×800 ni el campo 18×32. No se cambiaron colisiones ni escalas. Las cifras anteriores usan las unidades y segundos exportados por este código; **no son una certificación de equivalencia con números actuales de Clash Royale**.

## Archivos y reproducción

- `all-key-transition.csv`: 123 filas, clasificación y antes/después de animación, frames, gestos, contacto, cadencia, entrega, emisor y demora de despliegue.
- `inventory-provisional.json`: detalle completo por clave, cambios crudos/normalizados, relaciones padre-token, torres, verificaciones estáticas y hashes de entradas.
- `cards-baseline.json` y `cards-main-working-tree.json`: exportaciones completas de CARDS del corte coherente.
- `qa-minimum-provisional.json`: selección concreta de claves por grupo, aún pendiente de ejecución.
- `SHA256SUMS.json`: huellas del guion y de estos entregables.

Desde la raíz del worktree de auditoría, con los dos árboles detenidos en un checkpoint coherente:

```powershell
node scripts/inventory-native-combat-transition.mjs --candidate=../pokemon-arena
```

Para volver a analizar los bytes originales mientras existan las copias locales ignoradas en `qa/native-combat-transition`, sin importar el main en edición:

```powershell
node scripts/inventory-native-combat-transition.mjs --reuse-input=docs/visual-followup/native-combat-transition/inventory-provisional.json
```

El guion sólo escribe su carpeta de salida y sus propias copias de QA. No modifica runtime ni archivos del candidato, no instala paquetes y no publica. Las copias del working tree no se reconstruyen sólo con el HEAD: para repetir exactamente ese corte se necesitan las entradas locales conservadas y sus hashes.

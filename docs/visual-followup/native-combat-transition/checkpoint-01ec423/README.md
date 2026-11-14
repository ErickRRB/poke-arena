# QA del checkpoint nativo 01ec423

Se congeló el commit `01ec423b12a46c5d5acfbadf43607f5571b7eb15`, con baseline `6ab2d56d82eede0fa17304d4e92df7976360b3ef`. No se usaron archivos WIP del motor, cámara o arte. El inventario cubre 124 claves (110 con cuerpo) y contiene la nueva Furnace móvil y su token. Conserva Farfetch’d 83, Conkeldurr 534 y sus decisiones de emisor/tamaño.

## Lectura rápida de los resultados

| Verificación real | Resultado |
|---|---:|
| Casos con Game y Renderer de este corte | 2706 |
| Releases observados | 5268 |
| Comparaciones de intervalo entre ciclos | 2562 |
| Releases tempranos o tardíos frente al perfil actual | 0 |
| Cadencias, perfiles de preparación/duración o recuperación final incorrectos | 0 |
| Rebobinados de reloj | 0 |
| Diferencias de raster en local30/local60 | 0 / 0 |
| Diferencias de raster al entregar eventos públicos a 15 Hz | 290, en 23 claves |
| Divergencias del marcador del dibujo | 96, todas en Central Electrode |
| Archivos servidos comprobados contra el commit | 780 |

Los 77 casos de carta son la unión del grupo de reloj y de emisor, con los guardias 52/31/34 agregados. Se probaron tres ciclos automáticos y un ataque directo, motor local 30/60 Hz, y `publicSnapshot`/`publicEvent`/`unpackEvent` a 15 Hz sobre motor 30 Hz. Renderer selecciona y dibuja a 60 Hz. Hay ocho vistas para los 50 emisores seleccionados inicialmente y los guardias; el resto usa norte. Una revisión del orden real de `release()` identificó además el cambio de Rayquaza de psychic lineal implícito a proyectil: sus ocho vistas se probaron en 62ff663, donde únicamente cambió la geometría de Electrode.

El blanco es una estructura pasiva resistente, sin AI ni otras torres. Se aíslan acompañantes para medir el ataque del cuerpo elegido. Suicidas y saltos conservan su camino natural; retirarse al liberar no se exige como recuperación a idle. Un ataque directo de Tesla se prepara después de emerger. Este fixture no acredita el despliegue de todos los enjambres o invocadores, la cámara ni el comportamiento ante jitter.

## Hallazgos confirmados

### Contacto de 23 claves al entregar public15

La lista exacta está en `affected-contact-keys.json`. Todos los desajustes de raster de esta pasada se concentran en public15. El contacto puede aparecer por predicción antes de recibir el evento y ya estar en recuperación cuando se entrega el release. No se confunde este caso con un índice diferente que dibuja los mismos píxeles.

El repro pequeño `repro-king34/repro.json` incluye el attacker, `card:null`, `guard:{id:34,style:'poison',attackAnim:'Shoot'}`, eventos y muestras de ambas perspectivas. En el ataque directo, el servidor libera a .500 s con preparación Shoot5; el contacto nativo es Shoot6. El evento se entrega a .533333 s y se dibuja Shoot7, con RGBA distinto. El contacto6 se había mostrado antes de entregar el evento. El control automático con la otra fase de paquetes pasa. El marcador se mantiene sobre el dibujo, con error de redondeo menor a .57 unidades.

Princesa52 puede liberar una secuencia e iniciar la siguiente en el mismo tick, pero los rasters y marcadores de sus contactos son equivalentes en las ocho vistas: **no se considera un defecto por índice o secuencia solamente**. Charizard también se descartó como falso positivo de índice al comparar RGBA.

Root preparó después la retención de contacto en 2ccd1df. La evidencia posterior pertenece a su carpeta de checkpoint, sin reemplazar este corte anterior. Los comandos acotados están en `RERUN.md`.

### Geometría de Central Electrode

Central ataca con Shoot, alias de `101/Charge-Anim.png`, mientras `SPRITE_GEOMETRY[101].Shoot` falta en este corte. Renderer dibuja el clip correcto, pero `emissionPoint` usa el fallback Idle. Se detectaron 96 releases sin geometría correspondiente al dibujo.

La corrección de 62ff663 se repitió por separado: 48 casos y 96 releases de Central, ocho vistas, los tres ritmos y ambos disparadores, con cero diferencias de raster o marcador. Rayquaza pasó otros 48/96 en ese corte. No se vuelve a presentar el fallo de Central como pendiente después de esa corrección.

### Origen físico congelado con el frame anterior

`physical-launch-evidence.json` contiene 16 casos: Beedrill y Treecko en ocho direcciones, motor real a30 Hz y objetivo a60 unidades para mantener visible el proyectil. El punto esperado viene del destino real de `drawImage` y de la geometría del frame efectivamente dibujado; se observa también la llamada real a `Renderer.projectile`.

| Caso | Fuente usada por Game | Pose dibujada | Distancia origen guardado ↔ marcador dibujado |
|---|---|---|---:|
| Treecko, sur | Appeal5 | Appeal6 | 13.864 unidades |
| Beedrill, sur | Attack4 | Attack10 | 9.053 unidades |

En las ocho vistas, Treecko tiene 11.754–13.864 unidades de diferencia; Beedrill, 2.180–9.053. La fuente física coincide con la preparación del tick previo. Los centros efectivamente dibujados coinciden con la trayectoria calculada desde ese origen guardado, con error menor a .00001; no coinciden con el origen de la pose de contacto actual.

El marcador de `Renderer.visualEmission` sí coincide con la mano del dibujo, dentro del redondeo. Los proyectiles groundPath retienen `liftX/Y` del origen anterior. Esta observación es distinta de los efectos melee/haces, cuya fuente se vuelve a calcular con `effectSource` y puede quedar visualmente corregida.

En `repro-flight-source/contacts`, los PNG están ampliados 2×: amarillo es el marcador del contacto dibujado; cian, el origen guardado; rojo, el centro real del proyectil. Las láminas sur de Treecko y Beedrill fueron inspeccionadas; los datos cubren las ocho vistas. La corrección física del motor aún no está incluida en 2ccd1df.

## Integridad y límites

`analysis-summary.json` resume los recuentos, fallos y comprobaciones. `browser/summary.json` conserva la matriz; `browser/traces/*.json.gz`, todas las muestras. Los guiones exactos de esa ejecución están copiados junto a su reporte y sus hashes están registrados.

Se verificaron 780 archivos servidos contra sus objetos Git. El export de texto de Windows contiene CRLF: se comprobó que la única diferencia con los blobs es CRLF→LF en los archivos enumerados en el resumen. PNG y demás binarios coinciden byte por byte. Los SHA-256 de los bytes efectivamente usados se conservan en los reportes.

La ejecución de navegador usa sólo `engine.js?v=26`: el harness y los imports congelados de Renderer, wire, snapshot y spell-preview coinciden. El inventario importa engine sin query en un proceso separado que no carga Renderer/wire/snapshot. Las mediciones de este informe no mezclan dos instancias de engine. Los runners nuevos comprueban la URL canónica antes de ejecutar.

El dato «60 Hz» describe el muestreo y la selección del Renderer. No promete 60 dibujos nativos por segundo ni una aprobación global de fluidez. Los números son los contratos de este checkpoint; no se recalibró balance de Clash Royale desde los probes.

# Coreografía comprobada en Renderer

La pasada cubre 12 claves de 11 especies. El Renderer dibuja las poses nativas que corresponden a los 75 contactos de las pruebas a 30 Hz, 60 Hz y snapshots a 15 Hz. Hay 96 líneas de tiempo adicionales, una por clave y dirección, con 200 contactos correctos. Se preservan la orientación y la recuperación; el reloj del ataque no retrocede.

La prueba de pausa mantiene idénticos todos los píxeles del tablero durante 21 capturas consecutivas para cada clave. Las doce interrupciones por aturdimiento, aplicadas antes del primer golpe, cancelan sus contactos pendientes. También pasaron las 25 pruebas de `attack-choreography`, `attack-contact-clock` y `attack-scheduling`.

## Revisión visual

Abrir `index.html` mediante un servidor local para comparar los tres modos. Los 36 MP4 suman aproximadamente 3,72 MB, tienen 390 × 844 píxeles y 60 muestras por segundo. El tablero ocupa 370 × 677, como en la vista móvil comprobada. El círculo amarillo sigue el emisor usado por Renderer. Los clips son silenciosos y muestran un solo cuerpo por carta, incluso en Trío Ralts y Treecko.

Las láminas `contacts/<clave>.png` muestran las ocho direcciones: preparación, contacto y follow de cada golpe, recuperación y regreso al movimiento o reposo. Son vistas ampliadas del mismo Renderer. Amarillo marca el emisor; cian, cabeza; rojo y azul, los marcadores originales de manos. Se validó el recorte que `drawImage()` recibe realmente, además del índice calculado.

Los marcadores proceden de los Offsets/Shadow nativos. «Mano adelantada» significa el marcador con mayor proyección hacia el objetivo; en las vistas donde ambas manos están igualmente adelantadas, cualquiera de las dos es válido. Esto no afirma que el marcador esté en el extremo de una guadaña ni añade articulaciones nuevas.

## Alcance y límite de los dibujos

Capturar a 60 Hz no crea 60 dibujos diferentes. En el ataque visto hacia el norte se usaron los siguientes rasters distintos, comparados tras recortar la transparencia:

| Clave | Clip | Rasters distintos usados |
|---|---|---:|
| Machamp | Punch | 4 |
| Scyther | Slice | 3 |
| Nidoking | Shoot | 4 |
| Scizor | MultiScratch | 6 |
| Dragonite | Attack | 4 |
| Salamence | Attack | 2 |
| Blaziken | Attack | 3 |
| Crobat | Attack | 4 |
| Gardevoir | Appeal | 3 |
| Treecko | Appeal | 3 |
| Ralts, trío y token | Attack | 3 |

Cada golpe vuelve a un contacto visible, con follow y reinicio entre pulsos. Queda una observación: en Machamp con snapshots a 15 Hz, entre los golpes tercero y cuarto se dibuja follow 5 y preparación 1, sin mostrar el reposo 0 intermedio. El cuarto contacto sí coincide con su evento y no hay retroceso del reloj.

Los cuadros originales pueden repetir el mismo raster en índices distintos. La comparación de contacto usa el dibujo visible, además del índice; por ejemplo, Salamence hacia el norte repite su dibujo de contacto en el follow. Las líneas de tiempo conservan ambos datos para evitar contar esa repetición como una pose nueva.

## Datos y reproducción

`verification.json` contiene hashes de fuentes y videos, contactos del motor y su primera pose dibujada al entregar cada evento, emisores, frames, daño efectivo y su pose, líneas de tiempo de las ocho direcciones y pruebas de pausa/interrupción. `contacts.csv` permite comparar tiempos e índices por golpe.

En ataques a distancia, el contacto corporal corresponde al lanzamiento. El impacto contra el enemigo llega después del vuelo del proyectil y puede encontrar al atacante recuperándose; `damage` conserva ese instante aparte de `contacts`.

El fixture usa el motor y Renderer reales, con un Diglett inmóvil y pasivo de mucha vida para recibir un solo combo. No altera daño, cadencia ni perfiles del atacante; bloquea su siguiente ataque con cooldown de prueba. Las torres se retiran para aislar la escena. El modelo de snapshots usa `packGame`, `unpackGame` y eventos serializados cada 1/15 s, con motor de 30 Hz y render de 60 Hz. No añade latencia variable ni valida una conexión de red.

Desde la raíz del proyecto:

```text
node scripts/qa-combo-choreography.mjs --numeric
node scripts/qa-combo-choreography.mjs
```

La primera pasada guarda resultados rápidos en `qa/combo-renderer/numeric-report.json`; la segunda actualiza estos videos, láminas y datos. Requiere Playwright, Edge en Windows y FFmpeg/FFprobe. Las rutas pueden indicarse con `POKE_ARENA_PLAYWRIGHT_MODULE` y `POKE_ARENA_FFMPEG`. El guion espera geometría Punch y Slice ya generada y no modifica archivos de runtime ni publica.

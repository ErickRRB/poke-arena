# Siete gestos corregidos: recaptura con combate

Las siete claves corregidas pasaron **168 timelines, 192 contactos y 12.552 muestras**, sin hallazgos de contacto nativo, orientación, recuperación, retroceso del reloj o emisor. Se inspeccionaron las **14 láminas completas**, en sus ocho vistas. [verification.json](verification.json) contiene el corte definitivo con `summary.findings=0`, `findings=[]` y `changedAfterFreeze=[]`. [review.json](review.json) documenta las decisiones visuales por clave y los hashes de las láminas. El [visor](index.html) incluye las láminas y 14 videos a escala móvil.

La simulación usa `Game.attack` y `Game.step` de producción con un atacante y un objetivo pasivo resistente. Se desactivan IA y torres; se retiran compañeros generados para identificar el cuerpo auditado. En el caso de Snorlax el objetivo cuenta como estructura con vida útil finita. La separación es 20 píxeles lógicos: los 25 del primer fixture cruzaban por un píxel su límite de atracción al oeste del centro. Estos ajustes pertenecen al fixture, sin modificar el motor.

Los tres modos son simulación a 60 Hz, simulación a 30 Hz y simulación a 30 Hz con `packGame`/`unpackGame` y lotes de eventos cada 1/15 s. Renderer dibuja 60 muestras/s. Entre snapshots sólo avanza el contador `anim`, como en la aplicación; Renderer conserva su reloj de ataque y espera el release autoritativo antes de pasar del contacto a la recuperación. No hay servidor en línea, red ni jitter. El escenario inicia un ataque real directo; no representa adquisición libre de objetivos.

| Clave | Contacto dibujado en los tres modos y ocho vistas | Revisión visual |
| --- | --- | --- |
| Beedrill | `Attack` 10 en ambos releases | Nueva preparación 4, contacto 10, recuperación 16 y reposo 0 por cada picotazo; manos alternadas. |
| Snorlax | `Stomp` 7 | El golpe coincide con la caída al suelo, preservando el salto y la recuperación completos. |
| Lugia | `Shoot` 2 | Ataque en vuelo horizontal; no aparecen las poses 0/1 erguidas. |
| Rayquaza | `Shoot` 2 | Cabeza adelantada en la emisión; recuperación del cuerpo/cola visible. |
| Koffing | `Shoot` 7 | Compresión del cuerpo al contacto; desaparece el humo amarillo nativo hacia atrás. |
| Kangaskhan | `Shoot` 8 | Golpe de cuerpo frontal sin el giro de 270° del clip anterior. |
| Cría | `Shoot` 8 | Mismo gesto frontal a su propia escala, conservando dirección y retorno. |

Las imágenes proceden del canvas real de combate a 390 × 844; el tablero ocupa 370 × 677. Los recortes de las láminas mantienen esa escala móvil. Incluyen todas las poses recortadas distintas observadas en `drawImage`, preparación, contacto con cuadro anterior y siguiente, y recuperación. Para Beedrill también se muestran explícitamente follow/rest entre impactos aunque un dibujo se repita. `missingObservedRasters` está vacío en las 112 combinaciones lámina/vista.

Los 14 MP4 muestran la vista norte de cada clave en los modos local a 60 Hz y snapshots a 15 Hz. [media-verification.json](media-verification.json) comprueba sus SHA256 contra el reporte, 390 × 844, `60/1` y cantidad exacta de frames mediante ffprobe. Es una verificación de archivos exportados; no una medición de rendimiento o de reproducción a 60 fps en un teléfono. La revisión artística registrada se hizo sobre las 14 láminas, sin afirmar que se reprodujeron todos los videos.

El servidor sirve **341 archivos congelados en memoria**. El reporte conserva sus SHA256, el commit base, los hashes del guion y el harness exacto utilizado. `harness-used.mjs` reutiliza el harness de combos con adaptaciones limitadas a estas siete claves, contacto escalar, aislamiento de compañeros, objetivo válido y capturas. No sustituye el harness original. El contexto de lectura usa `willReadFrequently` antes de crear Renderer para evitar un cambio de backend de canvas durante la QA; producción permanece igual.

Los primeros ensayos del fixture detectaron una estructura sin `lifetime`, selección del `drawImage` de la cría como si fuera la madre y el límite de atracción de Snorlax al oeste. Se corrigieron antes del corte definitivo. Los ensayos anteriores no son el `verification.json` final ni se contabilizan como fallos del motor.

Este corte corresponde al checkout aislado `pokemon-arena-search-timer`, con su tablero y tamaños identificados por hashes. No sustituye la comprobación del árbol final integrado. No valida pausa, stun, enjambres, colisiones generales, audio, jitter o calidad subjetiva de fluidez.

Para repetir desde la raíz del checkout:

```powershell
node scripts/qa-global-motion-after.mjs
```

Admite `PLAYWRIGHT_MODULE`, `POKE_ARENA_PLAYWRIGHT_MODULE`, `PLAYWRIGHT_CHANNEL` y `POKE_ARENA_FFMPEG`; también usa las instalaciones locales existentes como fallback. No instala paquetes ni publica.

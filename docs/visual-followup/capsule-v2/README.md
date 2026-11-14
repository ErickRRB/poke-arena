# Cápsula de material v2 — QA local

[Abrir visor](index.html) · [Informe completo](verification.json) · [Resumen numérico](numeric-verification.json) · [Auditoría del paquete](package-audit.json) · [Tira a escala actual](phases-current.png)

Captura del 14 de noviembre de 2026, 19:49 UTC, con HEAD real `62ff66320dfdda1f58ea411a5d7a330429cc4870` y los cambios locales de material y render identificados por SHA-256 en el informe. Se congelaron los módulos, la cámara, el material y los recursos usados. La cámara de este corte es `(60, −56, 480, 864)`; ajustes posteriores de cámara quedan fuera de esta evidencia.

La base nativa anterior era `01ec423b12a46c5d5acfbadf43607f5571b7eb15`. Entre ambos commits, el único cambio de datos servidos es `SPRITE_GEOMETRY[101].Shoot`; los otros tres archivos del commit son generador, prueba y documentación. La geometría capturada coincide con `62ff663`, incluidos los finales CRLF del checkout al reproducir su hash. Ninguna escena contiene a la especie 101. Esta precisión de procedencia conserva las capturas originales y sus hashes; el corte también incluye los cambios locales de cápsula y cámara, no sólo los archivos del commit.

`numeric-verification.json` es un extracto identificado del informe completo de esta misma ejecución; no representa una captura adicional. La primera revisión de las 19:36 UTC no registró HEAD: se identifica por sus hashes originales en `first-review.json`, sin atribuirle retrospectivamente otro commit.

El gráfico anterior procede del archivo publicado `capsule-art.js?v=26`, recuperado por el integrador desde [LIVE v34](https://poke-arena-erick.eriqrb.chatgpt.site/). Su SHA-256 es `a8a5b458eee3ccfba5596131df951a45ac21232369d8bd000d103d2e30726c5e`. Los A/B reproducen esa función auténtica sobre una trayectoria local idéntica a la propuesta: sólo cambia el dibujo de la cápsula. No son grabaciones de una partida en producción ni prueban que esta propuesta esté publicada.

## Resultado

Pasaron **80/80 comprobaciones de navegador** en ocho casos: motor real a 30 Hz, vista directa o snapshots públicos a 15 Hz, perspectivas 0/1 y movimiento normal/reducido, con muestras del Renderer a 60 Hz. Cada caso lanza una cápsula de cada bando. Los sprites nativos 215 Idle/Walk/Attack/Hurt están cargados antes del bucle de captura.

- Diámetro: 52 unidades de dibujo, **40,083 píxeles CSS** en el tablero real de 370×677 del viewport 390×844. La proyección es uniforme. La tira actual usa esa escala; la primera tira `phases-8.png` se conserva como revisión histórica y usaba 32,067 píxeles de una proyección anterior.
- El rojo, blanco y la costura cruzan frente, lateral y dorso. Las 96 fases aparecen durante el vuelo normal. El alfa no cambia; al completar 2π el material devuelve exactamente los píxeles iniciales. No hay rotación plana del contexto para dibujar la cápsula.
- Los dos recorridos reales van de `(300,712)` a `(168,172)` y de `(300,88)` a `(432,628)`, con tiempo de vuelo 2,895309 s. La variante antigua y la propuesta tienen las mismas posiciones, tamaño, eje, reloj y trayectoria en cada muestra del A/B.
- Hay 24 muestras pausadas por caso entre t=1 y t=1,4 s: **192 muestras**, sin avance del motor ni cambios de posición, material o píxeles respecto de la primera muestra pausada. Con movimiento reducido el material permanece en fase 0 y el desplazamiento sigue la trayectoria real.
- Los seis Sneasel se generan al aterrizar en cada caso. Esta evidencia se concentra en cápsula y vuelo; no repite balance, ataques, Golem ni Refugio.

## Vídeos y fotogramas

Cada clip tiene 229 muestras, 60/1 fps y duración 3,816667 s. Se muestrea la simulación; esto no afirma 60 dibujos nativos distintos ni garantiza 60 fps en todos los dispositivos. El tablero y los controles proceden de la app servida; el HUD exterior se conserva como fondo estático del fixture. Las torres se mantienen pasivas y con vida elevada para aislar el vuelo.

| Evidencia | Archivos |
| --- | --- |
| A/B, motor 30 Hz | [v34 a la izquierda / propuesta a la derecha](local30-art-only-ab.mp4) |
| A/B, snapshots 15 Hz | [v34 a la izquierda / propuesta a la derecha](snapshots15-art-only-ab.mp4) |
| Propuesta en contexto | [30 Hz](local30-proposal.mp4), [15 Hz](snapshots15-proposal.mp4) |
| Movimiento reducido | [Vídeo 15 Hz](snapshots15-reduced.mp4), [fotograma](frames/reduced-flight.png) |
| Vuelo y pausa | [Vuelo](frames/local30-proposal-108.png), [pausa inicial](frames/local30-proposal-60.png), [pausa mantenida](frames/local30-proposal-72.png), [aterrizaje](frames/snapshots15-proposal-216.png) |

La primera revisión `first-review.json`, `arena-proposal.png`, `arena-live-v34-graphic.png` y `phases-8.png` pertenece a un corte previo. Sus hashes y procedencia se conservan. Después de revisar los clips y fotogramas, Root y Luna comunicaron la aprobación estética de V2. Esto no implica que el cambio esté publicado.

## Coste medido

Edge 157.0.4341.46 en esta máquina: rasterizar una fase nueva tuvo mediana 0,3 ms, p95 0,4 ms y máximo 0,6 ms en 192 consultas frías. **3.840 consultas calientes no generaron fases nuevas**; sus tiempos quedaron por debajo de la resolución del temporizador. Tras recorrer 32 ejes ×96 fases, la caché conserva 256 entradas y reutiliza el mismo atlas 1024² y el mismo buffer temporal.

Atlas, textura muestreada e ImageData suman **4.734.976 bytes RGBA (4,52 MiB)**. Esa cuenta excluye la imagen PNG original decodificada de 1774×887, estructuras JavaScript y copias internas de GPU/navegador. Los tiempos completos de `Renderer.draw` de los ocho casos están en el informe. Se predeclara `willReadFrequently` sólo en el canvas de lectura del fixture para comparar pausas; los resultados de CPU no sustituyen una medición de rendimiento de producción.

## Repetición

`node scripts/qa-capsule-v2-flight.mjs --numeric` repite las comprobaciones. Sin `--numeric` también genera los vídeos, fotogramas y hashes. Requiere Playwright/Edge y FFmpeg; puede usarse `POKE_ARENA_PLAYWRIGHT_MODULE` y `POKE_ARENA_FFMPEG`. El baseline auténtico se verifica contra el SHA indicado antes de ejecutar.

`node --test tests/flight-continuity.test.mjs` pasó **9/9** en este corte. Las pruebas cubren continuidad a 15/30/60 Hz, pausa, diámetro y rodadura del material; el navegador además verifica la textura real y el Renderer integrado. No se modificaron runtime, assets ni reglas de juego durante este QA, ni se publicó el sitio.

`node scripts/verify-capsule-v2-package.mjs` comprueba los enlaces locales, los hashes de los dos cortes y la consistencia del resumen numérico. No regenera imágenes, material ni vídeos.

La copia auténtica del gráfico público usada por los guiones se incluye en `inputs/capsule-live-v34.js`, con el mismo hash del informe. El informe histórico conserva la ruta externa desde la que se tomó al capturar; los guiones actuales usan esta copia versionada para poder repetir la comparación sin ese directorio de coordinación.

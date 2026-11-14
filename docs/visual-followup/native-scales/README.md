# Tamaños sobre la cámara nativa

La revisión actual es [A540-final](A540-final/README.md). El corte 588 que sigue se conserva como evidencia histórica.

Corte `fd8d6d2b6cd9df72d4b4c2d36541e79a3de250dc`, con fuentes congeladas y verificadas durante la captura. La cámara compartida es588×900, origen(6,−88). En el viewport390×844, el canvas mide370×677CSS y cada casilla24u ocupa15,102×15,102CSS; verticalScale=1. Los cuerpos se dibujan con el Renderer real y las mismas vistas nativas de la partida.

Se midieron los110cuerpos del catálogo de124claves, más el Geodude obtenido de una muerte real de Golem, en ocho orientaciones y ciclos completos de reposo:65.872muestras y5.175mediciones de raster distintas. Otras11.448muestras cubren reposo/ataque de los perfiles prioritarios. Las44láminas incluyen22del catálogo completo y22de esos perfiles. Se revisaron las22láminas de catálogo y los ataques de las cuatro escalas ajustadas y Roselia. Ninguna fuente cambió después de congelarse.

| Perfil | Escala retenida | Reposo: anchoCSS | Reposo: altoCSS |
|---|---:|---:|---:|
| Ampharos/Tesla |1,85|15–30|25–37|
| Nuzleaf/Lanzadardos |1,55|20–25|22–29|
| Farfetch’d/Caballero |2,2|20–28|28–31|
| Conkeldurr/Lanzarrocas |2,05|31–52|37–43|
| Roselia/Princesa |1,7143|14–30|21–22|
| Rhydon/P.E.K.K.A. |2,125|33–52|36–42|

Se conservan esas escalas: la primera línea queda por encima de los apoyos pequeños y los tanques mantienen mayor masa. Dusclops mide29–34CSS de alto, sus Duskull11–13 y Shuppet14–17. El Geodude pequeño de Golem conserva1,3 y queda separado del Caballero83. El Horno móvil y Voltorb ígneo conservan respectivamente2,3158 y1,875. Los radios de colisión se registran aparte en `collisions-separate.csv` y no se derivan de la ilustración.

[Visor de láminas](index.html), [mediciones completas](measurements.json), [tabla de cuerpos](body-measurements.csv). El prefijo `candidate-` del auditor identifica las vistas ampliadas de los perfiles retenidos, con una sola escala por perfil en este corte. La medición de tamaño no establece igualdad de píxeles con artwork de Clash Royale ni valida sus intercambios de daño.

Reproducción: `node scripts/qa-visual-scales-followup.mjs --native-camera`, con Playwright y Edge ya instalados. `PLAYWRIGHT_MODULE` permite indicar su ruta. Los hashes de módulos y2.571recursos figuran en el informe. El posterior fix de origen físico4bd550b modifica el muestreo de `Game.release`; queda fuera de la procedencia de estas capturas y no cambia los datos de escala, las hojas ni la cámara.

# Indicador de carga: alfa y SVG

[Abrir comparación](index.html) · [Resumen](summary.json) · [Diff de producto 70aad50](product-70aad50.patch)

El rojo del recurso publicado contiene transparencia real. El WebP de LIVE y el PNG incrustado en su favicon tienen **854 píxeles rojos con alfa parcial y ninguno opaco**; en `(32,14)` el alfa es 126/255. El brillo está pintado sobre un material que además deja pasar el fondo. El SVG nuevo existente en `loader-art.js` ya era opaco: **666 píxeles rojos opacos y ninguno parcial**, con alfa 255 en ese mismo punto.

Se comprobó el sitio público mediante GET y capturas de navegador, sin entrar a partidas. El HTML público usa `pokeball-v2.webp` en `i-loading-ball`/`i-ball`; `loader-art.js` responde 404 porque esa versión aún usa el raster. El laboratorio publicado usa un favicon con PNG incrustado. Las respuestas, fechas y hashes están en [retrieval.json](inputs/public/retrieval.json) y [favicon-retrieval.json](inputs/public/favicon-retrieval.json). El pedido identifica la publicación como V35; una rama local no se usa para establecer su estado.

El ajuste de producto es **70aad50**: el generador escribe también `favicon.svg` desde `LOADER_BALL_SHAPES`. El laboratorio inicial conserva sus dos `img`, clases, recorte de progreso y accesibilidad, pero ahora carga el vector opaco. El símbolo de inicio, búsqueda y reconexión, el icono de 24 y la carga de columnas siguen usando las mismas formas. No se regeneró raster ni se cambiaron esas formas.

Las capturas de propuesta se hicieron sobre el HEAD anterior más el cambio local identificado por hash; después el integrador registró esos mismos bytes en `70aad50`. Los informes conservan el HEAD real observado y no se reetiquetaron como una ejecución posterior al commit. No se publicó el cambio.

## Verificación

[Antes: público y variante local](verification.json), 30 estados. [Después: propuesta local](proposal/verification.json), 15 estados. Ambas matrices usan móvil 390×844, tablet 768×1024 y escritorio 1440×1000.

| Estado | Cómo se observó |
| --- | --- |
| Inicio | Carga real demorada reteniendo un recurso de sprites; progreso real y recorte de 64 conservados. |
| Laboratorio inicial | Carga real demorada; capas base/relleno con su progreso existente. |
| Columna del laboratorio | Se expuso su overlay existente para inspeccionar el recurso; sin desplegar cartas. |
| Búsqueda | Se expuso el panel existente; sin iniciar matchmaking. |
| Reconexión | Se expuso el indicador existente en una partida local; sin abrir o reconectar sockets. |

Los **45 estados** mantienen los rectángulos de controles/contenedores medidos. No hubo errores de navegador ni solicitudes de API. Las comprobaciones de movimiento reducido observadas devolvieron `animation-name: none`. Los hashes de app, HTML, CSS y formas canónicas son iguales antes/después; sólo cambia la salida favicon y su generador. La semántica ARIA, el ancho 64 del recorte, sus fórmulas `height=64*progress`/`y=64*(1-progress)` y los controles quedan conservados.

La [comparación de fondos](alpha-comparison.png) muestra raster y SVG sobre claro, oscuro y azul, a tamaños de inspección y de indicador. En la paleta opaca, el borde contra `#f7f0d5` da 7,12:1 y el marfil contra el borde 6,54:1. Esto verifica esos pares y las capturas; no es una certificación general de accesibilidad.

## CSS que mantiene Main

En el inicio, `editor.css` se carga después de `transient-ui.css` y gana con `.loading-base {filter:grayscale(1); opacity:.45}`. En el laboratorio, `.lab-load-base` usa gris y opacidad `.35`. Esas capas vacías desvanecidas son independientes de los agujeros de alfa del recurso: aun con SVG opaco, el área sin rellenar puede mostrar el fondo por CSS. No se editaron esas reglas, progreso ni app.

Main está agregando otra salida del mismo generador para `assets/ui/pokeball-pixel-v1.svg` y su ruta de Canvas. **Al integrar, conservar ambas salidas; aplicar el delta del favicon sin sustituir el generador completo por una copia anterior.** Esta evidencia no prueba ese futuro cambio de Canvas ni la esfera V2 de combate.

Repetición: `node scripts/qa-loader-art.mjs` audita público/local; `--proposal --local-only` guarda una matriz local separada. `node scripts/qa-loader-summary.mjs` comprueba recursos, hashes y contratos. Los scripts no escriben en el servicio público. Las capturas de UI expuesta no prueban el transporte de búsqueda o reconexión.

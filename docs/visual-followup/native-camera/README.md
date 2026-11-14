# Cámara A540 y ancla nativa de Rayquaza

La alternativa elegida es `ARENA_CAMERA = {left:30, top:-122, width:540, height:934}`, con borde inferior en 812. Rayquaza usa `movementAnchor:'foot'`, escala 1,25 y contacto 2. El resto de los tamaños permanece igual. No se modifican vida, daño, radio, rango, velocidad ni física. **La cámara 588 fue rechazada por presentación y no debe publicarse.**

La [matriz final A](A540-final/legal.json) congeló las fuentes con HEAD `99b30d0ad5b72dec7c49c023886b58a0fc4b5bea` y los cambios de cámara todavía en el árbol de trabajo. Los hashes de cada módulo y PNG identifican esas fuentes exactas. La captura precede a los merges de eliminación de indicadores `c8d41d1`/`8126d04`; no se atribuye esta pasada a sus cambios de interfaz. [verification.json](verification.json) reúne los resultados y hashes del paquete. Las fuentes históricas conservan su procedencia.

## Comparación y lectura

| Alternativa móvil | Campo 18×32, CSS | Área del canvas | Rayquaza |
| --- | --- | --- | --- |
| 588, rechazada | 271,84×483,27 | 52,45% | body, escala 1,3125 |
| A540, elegida | 296×526,22 | 62,18% | foot, escala 1,25 |
| B528, descartada | 302,73×538,18 | 65,04% | foot, escala 1,15 |

A aumenta el área útil móvil un 18,55% frente a 588. Aunque la escala cruda de Rayquaza baja un 4,76%, en móvil se ve aproximadamente un 3,7% mayor por el acercamiento de cámara. B sólo agrega 0,69×0,56 px CSS a Roselia respecto de A y reduce más la presencia de Rayquaza. Las comparaciones usan los mismos sprites, poses y roles: [A](A540-foot125/390-roles-reading.png), [B](B528-foot115/390-roles-reading.png), [dimensiones exactas](ray-anchor-review/comparison.json).

Las referencias de tamaños son fixtures controlados: las cuatro posiciones pasan `canDeploy`, pero no representan despliegues pagados. Las etiquetas son anotaciones de QA. Roselia conserva su escala 1,7143 y su rol de tiradora; en A mide aproximadamente 30,54×24,67 px CSS.

## Por qué foot

El ancla body anterior combinaba el marker de Shoot con el desfase de Idle. En NE, Shoot f4 tiene foot (59,63) y body (69,41); Idle aporta (+7,+18), por lo que se anclaba en (76,59). Esa diferencia de 17 px nativos desplazaba la pose 22,31 unidades hacia el borde y hacía que Rayquaza condicionara toda la cámara.

Se usa el foot original ya soportado por Renderer y `emissionPoint`; no se añade un helper ni se recorta la cola. Las [184 poses Walk/Shoot](A540-selected/ray-foot-audit.json), en ocho orientaciones, coinciden con el frame esperado. El error máximo entre cabeza y emisor es 0,5646 unidades por el redondeo de dibujo; la comparación contempla el avance normal del emisor de 2 px nativos. Esta auditoría usa el mismo perfil y helper del corte final; el ajuste posterior de cámara en 2 unidades no altera sus coordenadas de mundo.

El último frame de Shoot coincide exactamente con Walk0 en RGBA y posición relativa al foot en las ocho vistas. Walk0 coincide con Idle0; los markers de cabeza y cuerpo también tienen delta (0,0). Esto demuestra el cierre nativo de esas poses, sin afirmar una interpolación de todos los cambios de postura o fases del ciclo de vuelo.

Las [cinco trazas físicas de A](ray-anchor-review/physics-A540-final.json) coinciden exactamente con el [baseline](ray-anchor-review/physics-baseline.json): posiciones, direcciones, HP, radios, tiempos de ataque y estados físicos de proyectiles. El radio real de Rayquaza sigue siendo 12; su rango, 170, y su velocidad, 32. El cambio es visual y el emisor sigue a la cabeza.

## Recorridos legales y HUD

La matriz usa `Game.deploy` y `Game.step`: Rayquaza defiende su Princesa a izquierda y derecha ante Emboscada, defiende detrás del rey superior, y Golem recibe Rueda Fuego a ambos lados. Los diez despliegues de cada viewport son legales. Se espera la regeneración normal de elixir y no se fijan posiciones, direcciones, estadísticas ni timers de actores. El CPU se desactiva para reproducir las decisiones de ambos jugadores.

En tres viewports se observan 4.584 frames corporales visibles: **cero recorte corporal y cero intersección opaca con HUD**. No se agranda la cámara para incluir FX. Golem/Hurt se mide por su contorno corporal comprobado, separando los destellos blancos y grises sin retirar píxeles del renderer.

El primer A, con top −120 y height 932, dejó 0,408 px² de intersección con HUD en un solo frame móvil. Se corrigió con el mínimo ajuste entero de 2 unidades: top −122 y height 934, conservando el borde inferior en 812. No se relajó ningún umbral. En móvil cambia la posición vertical 0,685 px CSS y conserva la escala.

| Viewport | Canvas CSS, intacto | Campo 18×32, CSS | Celda cuadrada, CSS |
| --- | --- | --- | --- |
| 390×844 | 370×677 | 296×526,22 | 16,444×16,444 |
| 768×1024 | 490×857 | 392×696,89 | 21,778×21,778 |
| 1440×980 | 643×860 | 397,77×707,15 | 22,099×22,099 |

Pasan la inversa `worldToScreen`/`screenToWorld`, la proyección corporal frente a Canvas, río y puentes, cobertura de caché y rectángulos iguales de arena, marco, mano, elixir y overlays antes de seleccionar, con grilla y al mostrar carga. El error de proyección es menor de 0,000026 px CSS.

Son cinco casos alcanzables. No abarcan todas las combinaciones ni miden rendimiento a 60 FPS. La interfaz existente queda congelada como marco; el campo procede del Game del escenario. Este trabajo no certifica el enlace de textos, elixir o mano, el input o el audio.

## Terreno y capturas

El terreno usa texturas existentes y grupos discretos de copas con poca saturación. Se retiró el bosque teselado que dominaba el encuadre. La decoración está fuera de ARENA, detrás de las unidades; el bit 16 sigue siendo sólo `NO_DEPLOY` lógico. La caché cubre todo `worldBounds`, incluidos los orígenes negativos, y se reconstruye por carga o cambio de tamaño.

Los caminos leen `arenaBits`. Los carriles 168/432, los puentes de 48, el río entre y=376 y 424 y los centros de grilla x=96…504/y=28…772 permanecen en la geometría compartida. Hay una única cámara, celdas uniformes y contenedores intactos.

- Lectura de roles: [móvil](A540-final/390-roles-reading.png), [tablet](A540-final/768-roles-reading.png), [escritorio](A540-final/1440-roles-reading.png).
- Defensa real: [móvil](A540-final/390-ray-left-defence.png), [tablet](A540-final/768-ray-left-defence.png), [escritorio](A540-final/1440-ray-left-defence.png).
- [Rayquaza superior](A540-final/390-ray-top-defence.png) y [Golem alcanzado por Rueda Fuego](A540-final/390-golem-left-log.png).

## Reproducción

Con Node 22 y una instalación existente de Playwright/Edge:

```sh
node scripts/qa-native-camera.mjs --legal --matrix --require-clear-body --require-clear-hud --include-reading --ray-audit --cut=mi-corte
node scripts/check-ray-visual-physics.mjs --label=mi-corte
node scripts/verify-native-camera-evidence.mjs
```

El auditor usa guiones versionables, congela las fuentes y levanta servidor y Edge en el mismo proceso. Los cierra al terminar. `POKE_ARENA_PLAYWRIGHT_MODULE` permite señalar la instalación disponible. No instala dependencias ni lee fixtures ignorados de `qa/`. El último comando verifica el paquete histórico A540 entregado; `--write` regenera su manifiesto de hashes después de un cambio deliberado en la documentación. No se publicó desde esta auditoría.

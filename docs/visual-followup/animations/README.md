# Esfera Sneasel y reacción de Golem

Pasaron seis escenarios de cápsula y 32 de Golem con Game real a 30 Hz, snapshots públicos a 15 Hz y Renderer a 60 Hz. La matriz incluye los dos bandos, ambas perspectivas y movimiento reducido. Los 768 cuadros pausados conservan el tiempo del motor y los píxeles de la pose. Las doce pruebas de `golem-hurt` y `flight-continuity` también pasaron.

La evidencia es nueva y queda separada de la versión 32. `verification.json` identifica los archivos congelados al comenzar, incluidas las correcciones actuales de proyección de cápsula y conservación de Hurt/ghost al pausar. Los scripts no modifican código de producto, imágenes, manifiestos ni estadísticas.

La referencia de alcance es **68f8047**, para las correcciones de cápsula y Golem. Los hashes conservan los bytes que realmente se congelaron y probaron. Las tablas posteriores que añaden especies 83/534 y escalas de 181/274, junto con las heurísticas ranged de lunge/hit/preview, quedan fuera de esta revisión; Golem 76 conserva escala 3,25.

## Cápsula

El [visor](index.html) contiene dos videos a tamaño móvil, uno por perspectiva. Cada escena incluye lanzamientos reales de ambos bandos. Los cuadros `capsule-side*-front/side/back/return.png` muestran frente, lateral, dorso y regreso del cierre; hay capturas equivalentes en tablet y escritorio.

Se instrumentó la llamada real `Renderer.capsule()` y sus arcos de canvas. El círculo exterior conserva diámetro 52; el cierre se aplana y deja de verse en la mitad posterior. Ninguna fase usa `rotate()` del contexto, y el reloj de vuelo no retrocede.

| Viewport | Tablero real | Diámetro proyectado CSS | Ancho y alto opacos medidos |
|---|---|---:|---:|
| 390 × 844 | 370 × 677 | 32,0667 | 32,25 × 32,25 |
| 768 × 1024 | 490 × 857 | 42,4667 | 42,5 × 42,5 |
| 1440 × 980 | 643 × 860 | 55,7267 | 55,75 × 55,75 |

La medida proyectada usa la transformación que recibe el arco real. La segunda medida rasteriza ese mismo método a cuatro muestras por píxel CSS y cuenta alfa ≥ 240, separando el cuerpo opaco de la sombra. La diferencia de hasta 0,25 px corresponde a la cuantización de la medición. Frente, ambos laterales y dorso dan ancho y alto iguales en los tres tamaños.

## Golem

Se registró el PNG nativo y el cuadro que recibe `drawImage()`, sin sustituir la selección de animación del Renderer.

| Caso | Resultado del motor | Pose nativa durante la pausa |
|---|---|---|
| Chip de 5 | Pierde 5 de vida; no se desplaza | Idle |
| Bomba ígnea | Pierde 688 de vida; su inmunidad evita el empuje | Idle |
| Rueda Fuego / Log | Pierde 268 de vida y se desplaza 24 unidades | Hurt, cuadro 0 |
| Muerte | El motor retira el cuerpo; Renderer conserva el ghost breve | Hurt, cuadro 0 |

Cada caso se repite para equipo 0/1, perspectiva 0/1 y reduced false/true. Durante los 24 cuadros de pausa de cada ejecución, el tiempo del motor queda fijo, la imagen nativa sigue presente, el cuadro no cambia y el recorte RGBA tiene **cero canales diferentes**. El ghost conserva su vida visual de 0,24 s mientras el juego está pausado y termina al reanudar. La pausa de prueba dura 0,4 s, más que la vida activa del ghost.

Un probe adicional coloca a Golem en el límite legal que devuelve `constrainMovement()`. Un empuje forzado hacia fuera conserva la posición y no activa `pushHurt`. Los videos cubren los cuatro casos; los PNG adicionales muestran el otro bando y movimiento reducido, incluidos el primer y último cuadro pausado.

## Método y reproducción

```text
node scripts/qa-visual-followup.mjs --numeric
node scripts/qa-visual-followup.mjs
```

La pasada numérica termina antes de generar videos y guarda `qa/visual-followup-animations/numeric.json`. La completa sólo captura si esa matriz no encuentra fallos. Requiere Playwright/Edge y FFmpeg, con las mismas variables opcionales `POKE_ARENA_PLAYWRIGHT_MODULE` y `POKE_ARENA_FFMPEG` de las otras pruebas del proyecto.

Se carga el app con su HTML y CSS reales y se mide el rectángulo del tablero después de cada cambio responsive. El contexto de lectura se crea con `willReadFrequently:true` antes de Renderer para estabilizar la comparación RGBA. La instrumentación expone accesores y detiene la instancia normal de animación durante los fixtures; los casos usan los métodos reales de Game y los eventos públicos serializados.

Los videos componen el canvas vivo de cada fixture sobre una captura del UI real, en su rectángulo medido. El UI alrededor queda fijo para inspeccionar las poses y la esfera. La pausa se aplica al Game del fixture y Renderer recibe dt 0. Las pruebas cubren estas animaciones, sin evaluar HUD, audio, carga, red con jitter ni el preview de Log.

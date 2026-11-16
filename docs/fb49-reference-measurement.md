# FB49: comparación inicial de proporciones

Referencia A5FA9749 imagen 1: captura de 589 × 1280 píxeles. La zona de arena visible llega aproximadamente a y=1053 (82,3 % del alto), y el panel inferior ocupa 17,7 %. Una carta de la mano mide aproximadamente 104 × 128 (17,7 % del ancho de captura, 10,0 % del alto). La imagen está recortada: no demuestra dimensiones físicas, safe areas ni modelo del teléfono.

Muestra local 0879759, Edge emulado 440 × 956 CSS px con táctil, sin dispositivo físico: arena x=10, y=2, ancho=420, alto=798 (95,5 % del ancho y 83,5 % del alto); mano x=69, y=817, ancho=355, alto=91 (80,7 % del ancho y 9,5 % del alto); carta visible aproximadamente 83 × 103 (18,9 % del ancho y 10,8 % del alto). Son medidas aproximadas de captura, no equivalencia de geometría del juego. Los márgenes y la barra de elixir son distintos; la referencia integra el panel al borde mientras la app conserva marco y separaciones.

No se modifica la escala: estas diferencias no bastan para determinar un ajuste universal sin medir áreas útiles, recorte y controles en otras relaciones de aspecto. Faltan una medición de controles y safe areas en móvil/tablet/escritorio, interacción natural, comparación con el tamaño exacto disponible y el trabajo de Art sobre anclaje y dimensiones de torres. Las capturas de prototipo están en qa/preview-demo, fuera del árbol de producto.

## Áreas seguras y controles, 2026-11-16

Con la revisión a24cc20 y Edge emulado a 440 × 956, se aplicaron valores CSS de prueba, no medidas de un iPhone físico. Sin insets: arena (10, 2, 420, 798), mano (69, 817, 355, 91), elixir (81, 924, 333, 16); ajustes y pausa son de 44 × 44. Con insets superior 59 e inferior 34, la arena queda (10, 61, 420, 711), el elixir termina en y=912 y los controles superiores empiezan en y=67: quedan dentro del área simulada. Con insets laterales de 44 e inferior de 21, arena (46, 2, 348, 783), controles laterales dentro de los márgenes y elixir termina en y=925. Evidencia íntegra: `qa/preview-safearea/report.json` y capturas.

La proyección usa un solo factor de escala para X e Y; el área se ajusta sin deformar sprites. El aspecto de la referencia (589/1280 = 0,4602) se aproxima al viewport emulado (440/956 = 0,4603). Las diferencias restantes de margen y tamaños de torres siguen visibles; Art coordina el anclaje y la geometría visual. No hay evidencia que justifique aplicar zoom global ni recortar el tablero. La tipografía de nombres y cifras de la mano, próxima carta y elixir se cambió a Lilita One local; las cajas mantienen sus dimensiones CSS.

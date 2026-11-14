# Tiempo extra y elixir

El HUD usa `Game.multiplier` y su reloj lógico; CPU y snapshots comparten los mismos estados. La [referencia vigente de Supercell](https://support.clashroyale.com/hc/es/articles/49484936933403-Elixir) establece elixir normal durante los dos primeros minutos, doble durante el tercero y el primer minuto extra, y triple durante el último minuto extra. El motor ya seguía ese calendario; esta entrega cambia su presentación.

El reloj permanece rojo y alterna dos tonos durante tiempo extra. La barra y el distintivo 2× usan violeta intenso; 3× usa rosa y un borde dorado. El pulso deriva del tiempo simulado, por eso se congela al pausar. Movimiento reducido conserva una señal roja estática. El anuncio accesible ocurre una vez por cambio de fase, también cuando el primer snapshot recibido ya está dentro de 2× o 3×.

[Informe de navegador](verification.json): cuatro fases en 390×844, 768×1024 y 1440×980, rectángulos de arena, mano, barra y controles idénticos, pausa y reducción de movimiento. Son fixtures de reloj en la interfaz real; se restauran snapshots completos en ambas perspectivas. La prueba online separada comprueba dos transportes WebSocket reales, recarga y pérdida/recuperación de red. Los fixtures del HUD no se presentan como una partida online de cinco minutos.

Repetir con `node scripts/test-ui.mjs phases --matrix`. Las regresiones del calendario, restauración, anuncios y pausa se incluyen en `npm run test:rendering`.

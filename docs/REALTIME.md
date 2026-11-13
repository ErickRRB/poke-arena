# Servidor WebSocket

Servidor: https://poke-arena-realtime.eriickramiirez.workers.dev

El Worker dirige `/v1/lobby` al Durable Object de emparejamiento y `/v1/rooms/<id>` a la sala correspondiente. `/health` informa el protocolo y las frecuencias configuradas. La simulación corre a 30 pasos por segundo y publica estados a 15 por segundo. Las acciones provocan además una confirmación inmediata.

Cada conexión se autentica con una capacidad aleatoria enviada en el primer mensaje, nunca en la URL. El servidor conserva su hash y verifica que pertenezca a uno de los dos jugadores de la sala. Cada snapshot oculta la mano y la cola del rival. El Worker valida los orígenes del navegador y limita tamaño de mensajes, conexiones y frecuencia de acciones.

Las jugadas y sus recibos se escriben en SQLite antes de responder. El movimiento derivado se guarda cada segundo. Tras un reinicio, la sala recupera el punto guardado y avanza la simulación por el tiempo transcurrido. Los recibos de jugadas aceptadas se conservan durante toda la partida para impedir que un reenvío vuelva a consumir elixir o desplegar unidades.

Los mensajes `ping`/`pong` usan la respuesta automática de WebSockets de Cloudflare. Una desconexión conserva la sala durante 25 segundos. Al volver, el cliente restaura la conexión y solicita los eventos posteriores a su último identificador. La partida sigue durante la espera. Si ambos jugadores pierden la conexión durante todo el plazo, termina en empate.

## Verificación

Las pruebas de `realtime/tests/rooms.test.js` corren en el runtime de Workers con almacenamiento SQLite real. Cubren emparejamiento, aislamiento de salas, mensajes WebSocket, validación, reenvíos, cancelación, recuperación de búsqueda y reinicio del Durable Object.

`tests/online-client.test.mjs` verifica reconexión, watchdog, sesión guardada, duplicados y sockets obsoletos. `tests/realtime-match.test.mjs` comprueba los estados compactados, las cartas personalizadas y la simulación sin entradas del cliente. El grupo de navegador `online` conecta dos sesiones y verifica recarga, pérdida de red y geometría estable en móvil, tablet y escritorio.

La prueba contra Cloudflare del 13 de noviembre de 2026 obtuvo 189 ms hasta confirmar una jugada y 66 ms entre snapshots del servidor, con dos jugadores y una unidad desplegada. Los paquetes medidos llegaron a 4285 bytes. Es una muestra desde la máquina de desarrollo; la latencia varía según la conexión y ubicación de los jugadores.

Para repetir una prueba contra un servidor concreto:

```sh
node scripts/smoke-realtime.mjs https://tu-worker.workers.dev
```

Para probar el navegador contra ese servidor, definí `POKE_ARENA_REALTIME_URL` antes de ejecutar `npm run test:ui:online`. La dirección de producción usada por el juego se configura en `dist/online-config.js`.

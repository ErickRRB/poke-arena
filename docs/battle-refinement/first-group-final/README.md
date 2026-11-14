# Primer grupo sobre el tablero integrado

Los tres videos y sus cuadros usan el motor, Renderer, tablero nuevo y Pokébola original de 64×64 de main, con máscaras de alas SHA256 `a9fa115bcd8f08ff6fc5f98fd7812b3809012c768e8e58411f569b8994f3e8e6`. `verification.json` identifica el commit de código `d31b445`, los bytes congelados y los resultados: 23 comprobaciones específicas, ocho casos contra bloqueo permanente, 651 muestras temporales y ningún fallo ni error de página.

La simulación avanza a 30 Hz, los snapshots y eventos a 15 Hz y Renderer a 60 muestras/s, en ambas perspectivas. Es un fixture de combate real con `publicSnapshot`, `publicEvent`, `unpackEvent`, `perspective` y `unpackGame`; no prueba una conexión con jitter. Las entradas congeladas incluyen `assets/ui`, donde está la Pokébola nueva. La cápsula conserva 52 unidades de diámetro visible, equivalentes a 32,07 px CSS en cada tablero de 370 px.

Los archivos capturados conservan en el pie la leyenda histórica «Base aislada · tablero anterior». Ese texto proviene del compositor anterior y es incorrecto para esta pasada. La imagen del tablero, los hashes y `base.kind: integrated-main` documentan su procedencia real. No se retocaron las imágenes ni se repitieron las pruebas para cambiar esa leyenda.

Para otra captura: iniciar `node scripts/qa-first-group-final.mjs`. Los clips son silenciosos; el sonido se comprueba por separado en el catálogo y en la arena de pruebas.

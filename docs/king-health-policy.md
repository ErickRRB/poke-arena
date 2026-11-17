# Vida de Rey según activación

Estado inicial: plan previo, 2026-11-17. Base: `ad102a2cffb9cd13d2db06bf4169a5a61a7d08d8`. Trabajo local en `codex/king-health-policy`, sin publicación.

Pedido: ocultar barra y número de cada Rey mientras siga inactivo. Mostrar ambos al recibir daño real o caer una Princesa de su equipo y conservarlos aunque recupere toda la vida. Una Princesa rival no revela al otro Rey. Las Princesas conservan su política actual.

Contrato: usar `tower.active`, que Game ya cambia por ambos disparadores y conserva en `packGame`, `publicSnapshot`, `perspective` y `unpackGame`. El renderer toma ese estado efectivo del actor en cada cuadro; no deduce activación de `hp < maxHp`, eventos temporales ni un caché visual. No modificar HP, estadísticas, rangos, colisiones, arte ni formato de red.

Rutas: el baseline dibuja en `Renderer.towerHealth`; C3 separa `towerHealthGeometry`, `layoutHealth` y `towerHealth`. El hunk del baseline será mínimo. Entregar aparte el contrato de portado para C3: un Rey oculto tampoco debe reservar un rectángulo que desplace la vida de tropas y un dibujo directo debe tolerar geometría nula. No editar ese checkout.

Primera comprobación: regresión con Game real que muestre el fallo previo y luego ejercite los dos bandos, daño cero/estado temporal, daño efectivo, curación, caída de Princesa propia/rival y barra/número reales. Repetir estados por pack/restore y por el productor `publicSnapshot` en ambas perspectivas. Conservar la política de Princesas, incluidos laboratorio y torre destruida, y el orden del overlay en el draw real.

Verificación proporcional: pruebas de vida/overlay y activación existentes, más un tamaño móvil de la app local con renderer real, capturas antes/después y rectángulos de arena/mano/elixir estables. No ejecutar suite completa ni matriz responsive: el cambio selecciona píxeles dentro del canvas y no modifica DOM, geometría de layout ni estados de carga. Separar reproducción neutral y evaluación del autor; Root o revisor existente decide la suficiencia e integración. No se certifica todavía el portado C3, una conexión con jitter ni calidad perceptual de movimiento.

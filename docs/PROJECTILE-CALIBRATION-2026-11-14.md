# Conversión de velocidad de proyectiles

El valor×.48 tiene evidencia independiente del movimiento de tropas. El ledger primario fija `time.PROJECTILE_SPEED_TO_SUBTILES_PER_TICK=18`, medido en el flujo de efectos del cliente16.402. Para24unidades por celda y50ms por paso:18×24/18000/.05=.48unidades/segundo por unidad de Speed.

Las mediciones enumeran981pasos consecutivos de flechas de Torre princesa (dos capturas:293y688), además de Rey, Mosquetera, Bombardero y Cañón. Los avances se corresponden con sus Speed600/1000/1000/400/500 en milésimas de celda por paso. Esa medición cierra la duda sobre si el factor de proyectiles debía diferir del de las tropas; no se deduce del caso Nuzleaf de nuestro juego.

Fuente fijada: [calibration.json en a849c29ae632e12f81442c45b0d9b2d2f2f99f15](https://raw.githubusercontent.com/RoyaleGym/RoyaleSim/a849c29ae632e12f81442c45b0d9b2d2f2f99f15/data/calibration.json), SHA2567f28b5009d41679ea7ee59442106b02a6edb9cb9f429c1b5471f914fa46c5551. Coincide con los bytes del ledger usado en QA. Revisión independiente y verificación de procedencia por Root en `.supervision/projectile-calibration-review`.

Límite: los pasos cuantificados pertenecen al cliente16.402 de septiembre; las fichas del catálogo son16.635.8 de noviembre. El ledger aplica el mismo multiplicador a proyectiles y hechizos, pero su lista cuantificada no enumera un hechizo. No se inventa una captura de noviembre ni se usa esta conversión para afirmar paridad universal de rutas, colisiones o relojes de impacto.

# Emisor del Horno móvil

El checkpoint nativo `6e0b35c` convierte Central Electrode en Electrode móvil con `attackAnim:'Shoot'`. En el manifiesto101, Shoot usa el PNG original Charge y su hitFrame5. Faltaba la geometría con ese nombre y el emisor recurría a Idle aunque el dibujo mostraba Shoot.

Se regeneraron los markers originales con el catálogo nativo activo. El único añadido respecto a `01ec423` es101/Shoot; los419clips anteriores conservan exactamente sus puntos/duraciones. Se mantiene75/Shoot como cobertura de la especie anterior para datos de compatibilidad. La prueba de cobertura ahora exige el clip real del ataque y ya no permite que Idle tape un clip faltante.

No se alteró el PNG, su pose, el daño, el alcance, los tiempos ni el origen físico del proyectil. El emisor pasa a leer los markers del mismo clip que dibuja Renderer.

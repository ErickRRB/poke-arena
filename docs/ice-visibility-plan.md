# FB31 · Visibilidad de hielo: primer corte

Base: 21903c2004ff23108d5987ea0e2413aae6961aab. Pedido: hacer visibles los ataques de hielo en general, manteniendo la estética pixel, pose, emisor, trayectoria e impacto como una sola acción.

Inventario por rutas reales: Cloyster, Articuno, Regice y Lapras usan style ice; la carga y proyectil usan snow y el impacto ice, con variante areaImpact para daño en área. Blizzard usa impacto ice y campo spell independiente; overlay freeze y marcador slow son estados, no proyectiles. Sneasel conserva claw. FB28 tiene ownership de campos activos, incluido Blizzard: no cambiar sus tiempos ni dibujo aquí.

Primera muestra: Lapras contra Snorlax, Game a 1/30 y rAF natural, viewport 390×844, ataque completo desde preparación y salida hasta impacto y recuperación. Evaluar pose y emisor, masa y contraste efectivos del proyectil a tamaño CSS, composición y lectura de HP. No inferir fluidez de capturas fijas. Revisar recortes y transparencia de recursos y los frames activos antes de elegir tamaños. Luego Root decide si la acción está lista para extender a rutas equivalentes y otras excepciones.

Contrato: sólo presentación; preservar daño, alcance, radios físicos, velocidad, plazos, selección, audio, animación del sprite, reloj de pausa y movimiento reducido. No añadir marcadores de UI ni círculos opacos. El renderer comparte archivo con FB28; integrar por fragmentos y evitar campos. Verificar en contexto real y registrar condiciones/identidad; revisión visual y técnica independiente queda a Root.

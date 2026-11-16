# FB31 · Visibilidad de hielo: primer corte

Base: 21903c2004ff23108d5987ea0e2413aae6961aab. Pedido: hacer visibles los ataques de hielo en general, manteniendo la estética pixel, pose, emisor, trayectoria e impacto como una sola acción.

Inventario por rutas reales: Cloyster, Articuno, Regice y Lapras usan style ice; la carga y proyectil usan snow y el impacto ice, con variante areaImpact para daño en área. Blizzard usa impacto ice y campo spell independiente; overlay freeze y marcador slow son estados, no proyectiles. Sneasel conserva claw. FB28 tiene ownership de campos activos, incluido Blizzard: no cambiar sus tiempos ni dibujo aquí.

Primera muestra: Lapras contra Snorlax, Game a 1/30 y rAF natural, viewport 390×844, ataque completo desde preparación y salida hasta impacto y recuperación. Evaluar pose y emisor, masa y contraste efectivos del proyectil a tamaño CSS, composición y lectura de HP. No inferir fluidez de capturas fijas. Revisar recortes y transparencia de recursos y los frames activos antes de elegir tamaños. Luego Root decide si la acción está lista para extender a rutas equivalentes y otras excepciones.

Contrato: sólo presentación; preservar daño, alcance, radios físicos, velocidad, plazos, selección, audio, animación del sprite, reloj de pausa y movimiento reducido. No añadir marcadores de UI ni círculos opacos. El renderer comparte archivo con FB28; integrar por fragmentos y evitar campos. Verificar en contexto real y registrar condiciones/identidad; revisión visual y técnica independiente queda a Root.

## Extensión FB31 — inventario efectivo y muestra de contraste

La consulta de `CARDS` desde `dist/engine.js` identifica cinco ataques a distancia con `style: ice`: Lapras (131), Slowbro (80), Cloyster (91), Articuno (144) y Regice (378). Slowbro recibe el estilo desde `balance.js` y su acción efectiva es Rayo hielo: es parte de la familia aunque se omitió en el inventario preliminar. Sneasel usa claw. Estilos grass o psychic con slow y referencias IceWizard no se incorporan por similitud. Blizzard usa `style: freeze` y un campo propio; no se cambia su pintor, duración, radio ni ticks.

Extender el contrato ya revisado del primer caso a proyectiles snow y cargas de ataques ranged style ice, con escala limitada por cada silueta, centro en su marcador nativo y dirección de disparo. Los impactos `artImpact` con arte ice de esas cartas reutilizan los fragmentos del primer caso. Los impactos `areaImpact` existentes y la entrada ice conservan su pintor; slow y freeze siguen siendo estados, no ataques. No modificar llamadas genéricas al asset snow, para evitar alterar estados o campos.

Muestra de contraste posterior a la decisión favorable de Root: Articuno hacia el este, frente a Snorlax pasivo, 390×844 DPR 1, secuencia natural y paso de juego 1/30. Contrasta pico y cuerpo volador, otra dirección y geometría de barra; inspeccionar preparación, origen, vuelo y contacto a tamaño real, además de conservar la evidencia de Lapras norte, pausa y movimiento reducido. Verificar límites de silueta, todas las rutas por inventario y pruebas rendering. El caso y su secuencia no demuestran calidad visual de todas las especies, orientaciones o batallas concurridas. Revisión independiente sobre el delta final antes de portar solo el delta a Main; no desplegar.

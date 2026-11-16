# Plan FB26 + FB34 — 2026-11-16

Partimos de 9df9637 (FB26), con FB29 y música 92 fuera de alcance. Este plan se agrega tras el nuevo pedido, antes de implementar FB34.

- Mantener la clave anterior `sound` como silencio global; no existe otra preferencia de volumen en el código de esta base. Guardar dos porcentajes nuevos independientes, predeterminados música 50 y juego 100; aceptar 0 y valores válidos al recargar, y no activar silencio al moverlos.
- El bus musical escala sin modificar pista, tiempos ni crossfade; los buses de efectos, voces y UI escalan juntos y respetan el ajuste de FB26. Silencio global conserva valores. Agregar dos rangos accesibles al diálogo Ajustes existente, sin filas en tablero.
- Probar en navegador real a 390×844: nodos y elemento de música en reproducción, independencia, cambios con 0 y silencio, persistencia y recarga, tiempo de pista, interacción táctil/teclado, selección y posición de tablero/mano antes/durante/después. Repetir en tablet/escritorio si hay cambios de geometría o estados transitorios. Evidencia numérica no afirma balance agradable ni audición perceptual.
- Reusar evidencia FB26 de grabación idéntica y +20% de ganancia, con canal predeterminado de juego intacto. Revisión independiente y decisión final quedan en Root; no publicar desde esta rama.

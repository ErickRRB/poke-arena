# Corte de búsquedas canónicas C4

`C4_CANONICAL_SEARCH_CUTOVER=false` es exclusivamente **PRE-CORTE**: conserva el pool P4 existente. El cambio revisado a `true` es monotónico. Una vez activado, no volver a `false` ni promover un frontend anterior para cerrar C4.

Para cerrar nuevas admisiones después del corte, conservar el frontend con routing C4 y la autoridad compatible en el mismo endpoint/namespaces; cerrar únicamente `C4_NEW_SEARCHES` en esa autoridad. Los intentos admitidos, colas, cancelaciones y salas existentes deben poder continuar. Un rechazo C4 no inicia otra búsqueda en C1.

La recuperación C4 pendiente o confirmada permanece disponible antes y después del corte. Las sesiones y pestañas C1/P4 mantienen su endpoint y sus salas. No hay selector público de protocolo; los overrides de desarrollo requieren loopback. Los bots se mantienen separados.

Criterio antes de activar: autoridad y frontend compatibles, modos/configuración y namespaces reales cotejados, preflight de ambos endpoints revisado y evidencia ligada a los artefactos que se publican. La configuración C4 preparada tiene la puerta cerrada. El caché de build local puede contener el último control P4: antes de cualquier uso de `--prebuilt`, verificar el modo, el nombre y los bindings del output C4 concreto.

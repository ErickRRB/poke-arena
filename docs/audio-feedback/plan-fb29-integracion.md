# FB29 — integración local del gesto aceptado, 2026-11-17

Base pública 3def7ad2cce975c3376c702173851ad03f5ad901. Erick escuchó `light-two-gestures.wav` SHA256 ecec1efdd994a2ace720736ac709d7f738b543505367b4dba3d2c2f00024bf2e y respondió «Sí, va por ahí». Aceptó dirección sonora; no existe escucha independiente de la integración.

- Elaborar un solo evento desde el primer gesto aceptado, conservando proporción de capas y timbre. Documentar procedencia CC0, recorte, ganancia, hashes y medición de pico; no rehacer ni sustituir contenidos. Mantener cry, otros sonidos, música y controles.
- El contacto del gesto está 0,17 s después del inicio, pero hit coincide con release y daño. Separar reproducción del mismo asset en fase de preparación iniciada por `attackStart` y fase de contacto iniciada solo por `hit` válido; así una acción cancelada puede tener gesto pero nunca contacto falso. Mantener windup, daño y física. Registrar discrepancia temporal de ticks y límites del tráfico online.
- Congelar candidato en commit antes de verificar una acción natural en motor y audio renderizado; medir tiempos de ataque, contacto, voces, fuentes, nivel y clipping. Comprobar aislamiento Farfetch’d, fallback en frío y cancelación pertinente. No declarar aprobación perceptual de la integración ni publicar desde esta rama.

## Revision: presentacion por estado vivo

El windup efectivo es .50 s. La primera prueba programaba un nodo futuro desde attackStart, pero la simulacion descarta ataques sin evento de cancelacion. Se cambia el plan: attackStart guarda solo IDs y secuencia; el ciclo existente de App consulta el Game actual, incluidos los snapshots reconstruidos, y empieza los .17 s de gesto solo si el trabajo original y origen/objetivo siguen presentes y validos. Se descarta al pausar, salir o perder esos datos; hit valido conserva contacto unico y tambien retira pendiente. En online se usa el ultimo estado disponible/renderizado: no puede predecir una cancelacion aun no recibida. Si faltan datos o llega tarde, se omite la preparacion. No se cambia Game, wire ni backend. La primera fase se detiene exactamente en .17 s.

## Cierre de primer ciclo: productor C1 y captura visual

La revision adicional usa RealtimeMatch del backend 733265eca225df65bdd5b77f63c7eb3dd8f8f17e para producir packet y serializacion reales, y el cliente congelado para reconstruir cada snapshot antes de consultar el gesto. Se captura una accion con Renderer y WebAudio reales; el resultado no afirma calidad perceptiva ni comportamiento frente a eventos de red todavia no recibidos. No se cambia simulacion, wire ni backend.

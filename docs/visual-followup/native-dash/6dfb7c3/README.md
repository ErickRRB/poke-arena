# Sableye: dos embestidas con el audio actualizado

Corte inmutable `6dfb7c3b05a9e0a7bfb37e717d471bf3bfeefb4a`, capturado el 2026-11-14T21:44:32.539Z. Incluye la cámara A540, contacto instantáneo y emisor físico corregidos, y la mezcla de Main que reemplazó los impactos genéricos anteriores. [Local a 30 Hz](local30.mp4) y [snapshots a 15 Hz](snapshots15.mp4) muestran dos embestidas contra blancos distintos y cinco básicos posteriores contra el segundo blanco que sigue cerca.

Cada vídeo contiene **480 renders a 60 fps y 8 segundos**. VideoEncoder conserva cada render con su timestamp individual. FFmpeg convierte VP8 a H.264 y añade audio AAC; ffprobe confirma 480 frames, 60/1 y 8,000 s. La presentación sigue el tiempo real aunque el monitor funcione a 144 Hz. Se conservan también los flujos IVF y WebM de origen.

SoundSystem decodifica los 131 recursos reales del mismo commit, sin recursos fallidos. Su salida WebAudio se graba con MediaRecorder; las preparaciones, salidas y contactos producen salida real en ambos modos. Esta evidencia comprueba reproducción y sincronía de la mezcla elegida; no sustituye la revisión estética del sonido. El informe anterior 4bd550b conserva su aviso sobre el impacto genérico que el usuario rechazó.

Las dos salidas se producen a separaciones entre cuerpos de 117,6 y 104 u, frente al mínimo nativo de 84 u; los básicos ocurren a 15 u. Los contactos muestran Attack3, el fotograma nativo de Sableye. No hay una tercera embestida contra el blanco cercano.

La escena mantiene Poochyena y Regice inmóviles y pasivos, con vida ampliada en el segundo para observar los básicos. Sableye conserva sus números, selección de blancos y relojes. La partida principal y su audio se detienen durante la captura. Son dos modos controlados de entrega periódica, sin jitter variable ni una partida pública entre personas.

[Visor](index.html) · [Eventos, frames, sonido y fuentes](verification.json) · [Metadatos de vídeo](ffprobe.json) · [Hashes](SHA256SUMS.json).

Repetir la captura: `node scripts/qa-native-dash-audio.mjs --checkpoint=6dfb7c3`. Empaquetar y verificar: `node scripts/qa-native-dash-report.mjs --checkpoint=6dfb7c3`. Se necesitan las instalaciones existentes de Playwright/Edge y FFmpeg; FFPROBE permite cambiar la ruta del verificador. El servidor usa un solo módulo `engine.js?v=26` y sirve las fuentes mediante git show del commit indicado.

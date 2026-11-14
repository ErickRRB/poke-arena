# Correcciones de combate y primer grupo de animación

Checkpoint del 14 de noviembre de 2026. La auditoría global de animaciones, escalas y familias de audio continúa. Este checkpoint no declara cerrado el catálogo completo ni se ha publicado por separado.

Los datos de referencia de nivel 11, fechas, fuentes, conversiones y campos desconocidos están en `../CLASH-REFERENCE-2026-11-14.json`. `../BALANCE-AUDIT-2026-11-14.json` enumera las 121 claves, incluidos cuerpos invocados y cartas retiradas. Los equivalentes aplican valores contrastados. Las adaptaciones parciales conservan su presupuesto y mecánica particular; copiar estadísticas no demuestra balance competitivo.

La Pandilla usa tres Poochyena y dos Ralts por instrucción posterior expresa del usuario. La referencia consultada publica tres más tres; no se presenta la preferencia del proyecto como un nerfeo oficial.

Validación: 289 pruebas de combate, colocación, render, red, balance, audio y recursos del Worker; las cuatro pruebas SQLite/WebSocket del runtime de Workers también pasan. El servidor compila con cf CLI en dry-run usando Node 22.23.4 para ambos procesos. No se desplegó un servidor intermedio.

En Edge se compararon rectángulos de controles y contenido durante carga demorada, búsqueda con reloj adelantado y salto de reloj del equipo, ×2/×3, tiempo extra/desempate y reducir movimiento, a 390, 768 y 1440 px. No hubo desplazamientos. Los PNG y `validation.json` conservan la evidencia.

El primer grupo contiene Pikachu, Charizard y Emboscada Sneasel. Se guardaron 660 muestras de pantalla a un objetivo de 60 Hz, contactos de cada cuadro del ataque en ocho direcciones y vídeos WebM con las voces y los sonidos de salida e impacto. La Pokébola produjo 172 posiciones diferentes en 172 muestras de vuelo. El intervalo medio medido fue 16.666 ms; la cadencia puede variar por hardware y carga. Las poses originales del pixel art conservan sus propios tiempos: no se confunden muestras por segundo con dibujos únicos por segundo.

La llama de Charizard avanza antes de causar daño. Su vuelo sostenido excluye la postura de despegue y el ataque usa los cuadros de vuelo de Shoot; sprite y emisor comparten el mismo fotograma y ancla. Una interrupción cancela los golpes aún no liberados, mientras el fuego que ya salió continúa. Los dos rayos de Pikachu mantienen orígenes separados. La cápsula viaja a 192 unidades/s; sus tres Sneasel pueden recibir daño durante 1.1 s de despliegue y preparan su primer golpe durante 0.3 s.

Las cinco ilustraciones nuevas son escenas originales generadas con la herramienta nativa ImageGen. Prompts y archivos finales: `art-generation.json`. Las voces nuevas proceden de la misma compilación local previamente atribuida en `dist/assets/audio/SOURCES.txt`; no se etiquetan como CC0. Los seis WAV de combate son síntesis original creada para este proyecto.

Pendiente antes del cierre global: integrar con c617eb1 sin perder arena debug, Pokébola global, tablero, colisiones de hechizos, dash y correcciones DOT/TTL/Ditto; validar todas las familias, especies y escalas en el árbol conjunto, a 30/60 Hz y con snapshots15Hz, en ambos bandos. El integrador de main realizará la publicación conjunta autorizada.

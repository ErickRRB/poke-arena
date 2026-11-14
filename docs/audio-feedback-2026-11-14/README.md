# Sonidos de salida y contacto

Se retiraron `heavy.ogg` y `punch-1/2/3.ogg` de los archivos publicados, el manifiesto, las rutas de reproducción y el descargador. También se retiró el golpe de tambor sintetizado que funcionaba como respaldo. `verification.json` identifica sus hashes en la versión pública35 para que una futura carga no los restituya con otro nombre.

Las arqueras usan una salida de arco grabada y un contacto ligero diferente. Princesa añade roce de hojas; Lanzadardos usa aire breve; Arquero mágico combina salida y cristal. Los cuerpos, mordidas y piedra tienen contactos propios. El inicio de un hechizo respeta su preparación y su impacto conserva un evento separado. Tesla anuncia cuándo emerge y cuándo se oculta. DOT permanece silencioso.

Las señales se agrupan por fuente y acción. Dos arqueras cercanas conservan sus sonidos aunque crucen un antiguo límite de100 unidades; un duplicado de la misma acción se agrupa. El presupuesto global sigue siendo24 fuentes de efectos, más un máximo de3 voces. Silenciar y recuperar un contexto suspendido siguen funcionando.

Se buscaron y compararon fuentes publicadas por sus autores. Se seleccionaron [Bow & Arrow Shot de dorkster](https://opengameart.org/content/bow-arrow-shot), con su atribución y licencia CC-BY-SA3.0, y grabaciones de [Tinysized SFX de Vehicle / Jan Schupke](https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx), publicadas como CC0. Los archivos originales elegidos, sus hashes y conversiones están en [SOURCES.json](../../dist/assets/audio/feedback/SOURCES.json). Los créditos y las licencias acompañan los recursos del juego; el arco se conserva sin modificar sus bytes.

Las pruebas de audio cubren las rutas normales y de respaldo, mute, recuperación y concurrencia. Se renderizaron 16 escenas con Game y SoundSystem reales en OfflineAudioContext del navegador, con el volumen principal y compresor de producción. Incluyen una arquera, dos juntas, proyectiles, cuerpos, Tesla, hechizos, tres voces simultáneas y un compás de BattleMusic. `verification.json` registra eventos, ganancia, paneo, RMS, pico y fuentes. Son pruebas de salida y mezcla: no demuestran calidad percibida en todos los dispositivos.

La [demo](feedback-preview.ogg) tiene bloques de2,1 segundos: arquera, dos arqueras, Princesa, Lanzadardos, Arquero mágico, Rhydon, Snorlax, Sableye, Squirtle, Tesla emerge, Tesla se oculta, Flechas, Bola de fuego, curación, mezcla con voces y mezcla con música. [WAV sin compresión](feedback-preview.wav).

Para repetir: `node scripts/audit-feedback-audio.mjs`. El importador `scripts/import-feedback-audio.mjs` verifica los originales antes de convertirlos y conserva su procedencia.

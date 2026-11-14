# Sonidos de ataques Pokémon

Sustituye los22archivos de Foley, contactos genéricos y combate sintetizado que seguían en la entrega21b3eaa. El inventario retirado con hashes está en `retired-assets.json`. Las grabaciones nuevas son50WAV PRSFX originales de Pokémon Reborn conservados en PokéRogue; no son CC0 y no se atribuyen a Poké Arena.

Fuente fijada: `6f2ea545c2e997df09d8f83d3956c82d7cdcbaf3`, repositorio https://github.com/pagefaultgames/pokerogue-assets. Archivos, nombres originales, GitBlobSHA1 y SHA256: `dist/assets/audio/moves/SOURCES.json`. Créditos y licencia original acompañan el banco. El importador verifica cada byte contra esa revisión.

El motor conserva los eventos y tiempos de preparación, salida, vuelo y contacto. La salida y el contacto eligen grabaciones distintas por familia; las variantes dentro de una fase usan blobs distintos. No se alteró el pitch. El adaptador por especie cubre snapshots antiguos que no traen nativeReference.

Para una descarga lenta/fallida,17extractos del mismo banco se incluyen como PCM mono8-bit a su frecuencia original. Sus offsets, transformación y hashes figuran en FALLBACK-SOURCES.json. No vuelven a metal, campanas, vidrio, instrumentos, Foley ni síntesis de ruido.

El runtime recorta silencio de todos los canales, limita el pico de los movimientos a0.5 y ajusta RMS hacia0.09 con ganancia máxima2. Es una corrección acotada propia; la fuente advierte que PRSFX es fuerte y aplica0.5 en su audio-manager. El master sigue en0.7, con el mismo compresor,24FX y3voces. Las grabaciones sostienen su cuerpo y terminan con45ms de fade; los cries siguen siendo ocasionales de despliegue y Barril.

| Familia | Salida | Contacto |
|---|---|---|
| punch | quick-attack | pound, horn-attack |
| body | strength | body-slam1, body-slam2 |
| slam | strength | stomp, body-slam2 |
| rock | rock-throw1 | rock-throw2, rock-slide |
| horn | fury-attack | horn-attack |
| bite | quick-attack | bite |
| slash | agility | slash |
| dash | agility | feint-attack2 |
| bubble | bubble | bubblebeam |
| hydro | water-gun | hydro-pump |
| ember | ember | fire-spin |
| flame | fire-spin | fire-blast |
| lightning | thundershock | thunderbolt1 |
| magnet | thundershock | discharge |
| ice | icy-wind1 | ice-beam |
| bow | bullet-seed | razor-leaf2 |
| petalBow | petal-dance | petal-blizzard2 |
| dart | poison-sting | fury-attack |
| magicArrow | aura-sphere1 | aura-sphere2 |
| volley | bullet-seed | petal-blizzard2 |
| leaf | razor-leaf2 | petal-dance |
| vine | petal-dance | razor-leaf2 |
| psychic | psychic | psybeam |
| confusion | confusion | psychic |
| aura | aura-sphere1 | aura-sphere2 |
| shadow | shadow-ball1 | shadow-ball2 |
| poison | acid | sludge-bomb2 |
| egg | egg-bomb1 | egg-bomb2 |
| coin | pay-day1 | horn-attack |
| heal | healing-pulse | recover |
| explosion | fire-spin | explosion2 |
| wind | gust | quick-attack |

## Verificación

Pruebas de catálogo y recuperación:34casos, incluyendo todas las familias, variantes por blob, bytes distribuidos, carga fallida, mute, recuperación de contexto, presupuestos de voces y coalescing de la misma acción sin silenciar un segundo atacante. Las pruebas del Game cubren preparación, release y contactos reales.

Mezcla mediante OfflineAudioContext real: 23escenas, 157muestras decodificadas, pico máximo0.296. Incluye dos arqueros, Princess, Dart, ataques físicos/elementales, Tesla, hechizos, voces, música y fallback frío. `verification.json` registra tiempos y hashes. `feedback-preview.wav` permite escuchar los casos consecutivos. Pico/RMS comprueban señal y margen; no acreditan escucha humana, timbre aprobado ni balance perceptual en un teléfono.

Fuente primaria de reproducción: https://github.com/pagefaultgames/pokerogue/blob/59a3eed012eb6de0a4b264f61b9fa9e38e62db38/src/audio/audio-manager.ts. El mapeo de Ember se contrastó con battle-anims/ember.json de la revisión del banco.

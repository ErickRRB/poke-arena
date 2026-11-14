# Refugio Ralts: QA visual

Pasaron ocho combinaciones de bando, perspectiva y movimiento reducido, con 384 cuadros pausados sin diferencias RGBA. También pasan las dos regresiones de `tests/structure-art.test.mjs`. Las 17 capturas del [visor](index.html) bastan para revisar estas escenas; no se generaron videos ni se repitieron las escenas anteriores.

## Alcance del fixture

La carta visual usa `structureArt:'raltsHut'` y carece de ID Pokémon. El contrato asignado al actor es 4 de elixir, 1180 HP, duración 30 s y radio lógico 24. Se reutiliza la forma completa de actor que crea Game y se le asigna ese contrato; el daño, la retirada del cuerpo y los eventos de muerte pasan por los métodos reales del motor. Las vistas y eventos usan la serialización pública y `perspective()`.

**La generación de Ralts y la integración de catálogo, colección y despliegue de la carta quedan pendientes.** Esta revisión prueba el cuerpo sin especie y sus estados visuales. El PNG de carta se decodificó correctamente, pero aún no hay una entrada de colección que validar.

## Resultados

- El PNG de batalla carga a través de BattleArt, sin petición, llamada de loader ni clave de especie `undefined`/`null`. La imagen mide 1196 × 1315; la escena de carta mide 1122 × 1402.
- El cuerpo se dibuja una vez, con alfa 1 y sin plataforma. El ancla conserva el offset de base de 4 unidades. La barra muestra el contrato 1180/1180 sobre el tejado y respeta el color del bando.
- La vista previa usa alfa 0,55 en el dibujo de la casa y conserva transparencia. La prueba reproduce la llamada visual de preview; la carta real aún no está en la mano.
- El rojo de selección usa la máscara del edificio: 4067 píxeles modificados en el probe principal, cero píxeles nuevos fuera del alfa y cero diferencias al quitar el tinte. La selección real de Bomba ígnea marca al rival y deja al aliado sin resaltar en ambas perspectivas.
- Un golpe de 100 baja de 1180 a 1080. El cuerpo recibe brillo de impacto con movimiento normal; reduced conserva la imagen sin ese brillo.
- `structureDown` crea una caída de 0,4 s. Al reanudar, el cuerpo se comprime y se desvanece; reduced conserva el tamaño y usa el desvanecimiento. Al terminar no quedan cuerpo, barra ni efecto de caída.
- La pausa conserva cuerpo, impacto o caída durante 24 muestras por fase. El motor, la vida del efecto y todos los píxeles del canvas permanecen iguales; la casa sigue visible. Se verificó después del golpe y después de la muerte en las ocho combinaciones.

| Viewport | Tablero real | Casa proyectada, px CSS |
|---|---|---|
| 390 × 844 | 370 × 677 | 51,8 × 55,45 |
| 768 × 1024 | 490 × 857 | 68,6 × 73,44 |
| 1440 × 980 | 643 × 860 | 90,02 × 96,37 |

Los tres tamaños usan el mismo recorte y la misma proporción del recurso; la proyección compensa la relación vertical del tablero. Las capturas de 768 y 1440 cubren únicamente esta proyección.

## Correcciones comprobadas y reproducción

Durante la preparación se detectaron dos boundaries: `spawn` intentaba llamar al loader con un ID ausente y la caída sólo estaba conectada a `faint`. Root corrigió el guard del loader y conectó la caída a `structureDown`, que es el evento emitido por una estructura. La pasada registrada se ejecutó con ambas correcciones y termina sin hallazgos abiertos.

```text
node scripts/qa-ralts-hut.mjs
node --test tests/structure-art.test.mjs
```

El guion carga HTML y CSS reales del app a 390, congela las fuentes y los assets al comenzar, y suspende la animación normal mientras muestra el fixture. La instrumentación crea el contexto de lectura antes de Renderer y expone accesores; no escribe archivos de producto. `verification.json` conserva los bytes probados mediante sus hashes y `artifacts.json` identifica las capturas. La procedencia de arte se documenta aparte en `asset-provenance.md`.

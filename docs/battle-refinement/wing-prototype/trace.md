# Referencia de vuelo del prototipo — 14 de noviembre de 2026

Las máscaras de Scyther y Salamence conservan los brazos, el cuerpo y las manos como una única capa fija. El trazado incluye el travesaño y el contorno nativos de las alas de Salamence. Los tres rigs producen ocho siluetas distintas por vista y reconstruyen el PNG original sin diferencias cuando la fase vale cero. Los PNG fuente permanecen intactos.

Se corrigieron sólo los datos de dist/wing-rigs.js. Las coordenadas de raíces y markers permanecen nativas. Los polígonos reflejados usan los bordes de las celdas de píxel (K+1−x); las raíces reflejan centros de píxel (K−x). La corrección de Scyther/N retiene 26 píxeles originales verdes y de contorno para que las guadañas sigan unidas al torso. Salamence mantiene su anatomía azul y su contorno en primer plano; la membrana roja queda en las capas móviles. No se eliminan componentes ni se pintan conexiones nuevas.

El auditor versionable es scripts/verify-wing-prototype.mjs. --measure-only realiza las mediciones sin grabar; --fragments-only localiza componentes, sus coordenadas y su pertenencia a cuerpo fijo o ala móvil. El comando completo genera el video, los cinco contactos y las tres capturas de targeting. Los archivos de entrada se sirven desde los mismos bytes cuyos SHA-256 quedan en metrics.json.

| Pokémon | Dibujos / siluetas por vista | Cambios de markers | Componentes de cuerpo fijo | Fragmento móvil máximo (px nativos) | Error emisor máx. a 390 px |
|---|---:|---:|---|---:|---:|
| charizard | 8 | 0 | 1 | 1 | 0.598 |
| scyther | 8 | 0 | 1 | 1 | 0.459 |
| salamence | 8 | 0 | 1 | 1 | 0.39 |
| pidgeot | 2 nativos | 0 | nativo | 0 | 0.325 |
| dragonite | 4 nativos | 0 | nativo | 0 | 0.451 |

Video: 240 cuadros codificados a 60 Hz, 4,000 s, VP9 lossless 4:4:4. Los cuadros se obtienen con plazos de RAF y reloj real; la captura duró 4.0048 s, con media 16.687 ms y p95 21.000 ms. La codificación conserva todos los cuadros capturados.

La congelación conserva fase, sprite y emisor, y continúa desde la fase retenida al terminar. El movimiento reducido queda estático. Targeting se probó en S con dos fases y en NE con otra: tres siluetas distintas, una superficie reutilizada, cero cambios de alfa y cero píxeles de aura fuera de la silueta.

Los límites quedan explícitos en metrics.json: aparecen fragmentos móviles de hasta un píxel nativo en algunos ángulos de rasterización. Charizard/E presenta casos subnativos que desaparecen al muestrear a 1:1; Scyther/N puede mostrar un píxel móvil en una fase. No son restos fijos del cuerpo ni guadañas separadas. Estos contactos y métricas son referencias sintéticas del render. El combate real, su programación de impactos y las interacciones completas requieren la revisión del integrador.

Proveniencia, coordenadas antes/después, criterios de exclusión y hashes originales: rig-trace.json.

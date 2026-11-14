# Cinco escenas — 6dfb7c3

[Abrir visor](index.html) · [Resumen](summary.json) · [Trazas y fuentes](verification.json)

Captura 2026-11-14T21:44:31.813Z, commit inmutable `6dfb7c3b05a9e0a7bfb37e717d471bf3bfeefb4a`, Edge 157.0.4341.46. **306/306 controles pasan en 30 combinaciones; 33 PNG con hashes comprobados.** Todos los criterios de esta matriz pasan.

| Escena | Controles | Hallazgos |
| --- | --- | --- |
| Roselia | 66/66 | Sin fallos |
| Charmander | 66/66 | Sin fallos |
| Log | 66/66 | Sin fallos |
| Refugio Ralts | 54/54 | Sin fallos |
| Horno Electrode y Voltorb ígneo | 54/54 | Sin fallos |

Game real a 30 Hz, snapshots públicos a 15 Hz y muestras de Renderer a 60 Hz. Perspectivas 0/1 en móvil 390×844, tablet 768×1024 y escritorio 1440×1000. Una sola URL de motor: `/engine.js?v=26`. Todos los módulos y recursos de producto se sirven desde ese commit; los guiones de QA tienen hashes separados. El informe registra 407 archivos de producto, sin errores de navegador, solicitudes inválidas de especies ni recursos faltantes.

Roselia causa 168 de daño y Charmander 304 al cuerpo principal, al cuerpo que solapa el borde y a la torre por su huella; el cuerpo exterior queda intacto. El centro y radio del efecto coinciden con el impacto. Log dibuja únicamente su ancla y tinte para enemigos válidos; cancelar deja exactamente los mismos píxeles en las seis combinaciones. La máscara con lectura frecuente evita la diferencia de raster detectada en el diagnóstico provisional; la condición de igualdad no se redujo.

Refugio se despliega desde la carta real sin id. No invoca sin enemigo; después genera Ralts id 280 con primera espera de 1 s e intervalo de 2,2 s, además de un hijo al morir. Horno id 101 camina, dispara fuego y genera desde su posición móvil el token id 100 FireSpirits; se capturaron sus fotogramas nativos. Los eventos release e hit del token usan el estilo ember y la fuente correctos; pasan los doce controles que fallaban en el corte anterior.

Se preparan posiciones de combate y se usa Game.attack en los dos casos de área. Las víctimas se mantienen quietas con un estado de aturdimiento real y las torres permanecen pasivas. Refugio y Horno usan Game.deploy. No se cambian cartas, estadísticas ni física; el HUD exterior conserva el estado inicial. Son escenas controladas, sin jitter de red, que no prueban publicación, audio ni el flujo de colección/detalle.

[Protocolo y repetición](../README.md). No se generaron vídeos ni se repitieron esfera, Golem o las pruebas aisladas previas del Refugio.

# QA de las cinco escenas integradas

La revisión vigente está en [6dfb7c3](6dfb7c3/README.md), con [visor](6dfb7c3/index.html) y [resumen](6dfb7c3/summary.json). Pasan **306/306 controles** en 30 combinaciones. Incluye A540 y los eventos de Voltorb ígneo corregidos en el motor. El corte anterior fd8d6d2 conserva sus doce fallos históricos de estilo; no se reetiqueta como una ejecución nueva ni como producción.

Las ejecuciones de diagnóstico previas se guardan en `qa/native-integrated/` y no representan evidencia final. La comparación final de Log conserva la condición estricta de igualdad de píxeles al cancelar; no se redujo el criterio para admitir la corrección de máscara.

Se usa la app real con su HTML/CSS y un único `/engine.js?v=26`. El servidor lee módulos y recursos, incluidos sonidos, directamente del commit indicado mediante `git show`; no combina un commit con archivos de producto del árbol de trabajo. Los guiones de instrumentación se identifican por separado con sus hashes.

| Escena | Criterios |
| --- | --- |
| Roselia | Proyectil real, daño al llegar, cuerpo principal y cuerpo que solapa el borde alcanzados, cuerpo exterior intacto y torre alcanzada por su huella. El centro y radio del efecto del Renderer deben coincidir con el impacto del motor. |
| Charmander | Los mismos controles para otra familia de proyectil en área, con el radio y daño reales de su carta. |
| Log | Un ancla de una celda; sin grilla, trayectoria ni conector. En ambas perspectivas, sólo objetivos enemigos válidos reciben el tinte real; aliados, voladores y cuerpos fuera quedan excluidos. Se comprueba la limpieza del tinte y los píxeles al cancelar. |
| Refugio Ralts | Despliegue de la carta real, cuerpo sin id, ausencia de invocaciones sin enemigo cercano, primer Ralts y repetición con los tiempos reales del catálogo. Hijos con carta canónica `raltsToken`, id 280 y parentId correcto. También se verifica la invocación de muerte. |
| Horno Electrode | Despliegue real de unidad móvil id 101, desplazamiento, disparo de fuego y Voltorb ígneo id 100 producido desde la posición móvil del dueño. Se verifica la diferencia respecto del Voltorb eléctrico y que los eventos de liberación e impacto conserven el estilo ígneo. |

Cada escena usa Game a 30 Hz, snapshots/eventos públicos a 15 Hz y muestras del Renderer a 60 Hz, sin retrasos de red simulados. La matriz prevista cubre perspectivas 0/1 en 390×844, 768×1024 y 1440×1000 para registrar la proyección responsive. No se repiten colección, detalle, esfera, Golem ni la animación aislada de Refugio.

En los casos de área se preparan posiciones de combate y se inicia un ataque mediante `Game.attack`; las víctimas se mantienen quietas con el estado de aturdimiento del propio motor. Las cartas y posiciones de torres conservan sus valores reales. Refugio y Horno se despliegan mediante `Game.deploy`. Se desactivan los ataques de torres y la IA rival para aislar cada causa. El HUD exterior conserva el estado inicial de la app; los cuerpos, proyectiles, efectos y salud dibujados en el tablero proceden del Game de la escena.

Para ejecutar cuando el checkpoint esté cerrado:

```text
node scripts/qa-native-integrated.mjs --checkpoint=<SHA>
```

La evidencia se escribe en una subcarpeta con el SHA corto, con capturas, resultados, referencias de importación, recursos servidos y hashes. `--draft` guarda únicamente evidencia provisional fuera de esta carpeta. `--no-images`, `--keys=...` y `--widths=...` permiten diagnósticos acotados; las condiciones de paso son las mismas.

El servidor reutilizable se exporta desde `scripts/qa-native-integrated-server.mjs` como `createNativeIntegratedServer({checkpoint, qaRoutes})`. Tras iniciar la app e importar `/__qa/native-integrated-harness.mjs`, el hook `__nativeIntegrated` ofrece `renderer`, `canvas`, `sfx`, `CARDS`, `init`, `step`, `draw`, `game`, `view`, `side`, `eventLog` y `onEvent`. Las cargas de recursos mantienen el mismo corte, aunque otro agente cambie el árbol de trabajo.

No se editan runtime, estadísticas ni assets. Una diferencia observada se conserva en el informe; el guion no sustituye el fallo con un resultado aprobado.

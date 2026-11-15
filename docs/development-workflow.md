# Desarrollo con resultados completos y menos retrabajo

El orquestador cuida el resultado y la eficiencia del trabajo. Revisa el proceso durante el desarrollo y cambia el enfoque cuando aparece repetición sin aprendizaje. El estándar de calidad se conserva; la cantidad de controles depende del cambio.

## Antes de construir

Una [ficha breve](change-card.template.md) reúne pedido, resultado reconocible, restricciones, rutas compartidas, uno o dos riesgos principales y muestra inicial. Para una acción visual, describir el ciclo completo y una referencia adecuada a la estética y escala de la app. Para una mecánica equivalente a Clash Royale, declarar qué números e interacciones deben coincidir y qué fuente los respalda.

Resolver primero la incertidumbre que puede invalidar toda la solución. El autor muestra una primera acción completa en el tamaño de uso antes de extenderla o abrir una matriz amplia. Un revisor existente o Root contrasta brevemente el alcance con el pedido; no se crea otro rol sólo para marcar ese paso.

Definir contratos de los componentes afectados: estados, relojes, anclas del emisor, orden de capas, feedback, geometría y dependencias. Una corrección de trayecto debe conservar la pose y la emisión; una mejora de oclusión debe conservar vida, escudo, marcas y reacción al daño. Reutilizar los pintores y componentes existentes cuando correspondan, en lugar de reconstruir parcialmente su comportamiento.

## Construcción y observación temprana

El autor usa un worktree por cambio relacionado y presets parametrizables. Autor y revisor comparten un runner; cada ejecución escribe una salida nueva e identificada. Cambiar coordenadas, viewport o caso no justifica copiar un script. No crear una rama por cada ajuste local: congelar un candidato cuando exista una primera solución completa y revisable.

El modo de observación sirve para ver el resultado vivo durante la autoría. La captura conserva origen, condiciones, estado realmente observado y tiempos. Los casos pequeños o recortes mantienen tamaño CSS y contexto; un montaje reducido no prueba legibilidad a tamaño de juego. Una semilla lógica no garantiza partículas reproducibles si el renderer usa otra fuente de azar.

Antes de una prueba cara, comprobar lo que la invalidaría: conflictos sin resolver, recursos de otra versión, estado o DPR diferentes al solicitado, o un fixture que nunca produce el evento que pretende observar. El modo exploratorio puede declarar un árbol sucio y hashes de archivos; esa salida no se presenta como aprobación de un candidato congelado.

## Checklist de desarrollo

Responder lo pertinente en la ficha; no crear diez formularios ni exigir categorías ajenas al cambio.

1. **Intención completa.** ¿Se resuelve el pedido y se buscaron equivalentes en las rutas compartidas, con exclusiones explícitas?
2. **Referencia y estilo.** ¿Hay una referencia concreta y el resultado encaja con la estética y el rol, en lugar de aceptar sólo una mejora relativa?
3. **Acción y mecánica juntas.** ¿Preparación, gesto, emisor, trayectoria, colisión, impacto y recuperación forman una acción coherente cuando aplican?
4. **Escala y legibilidad.** ¿Se reconoce en su tamaño real, con contraste y silueta adecuados en los tamaños afectados?
5. **Feedback conservado.** ¿Sonido, reacción, vida, escudo, selección y estados relevantes siguen comunicando lo que ocurre?
6. **Composición y controles.** ¿Capas, oclusiones y efectos permiten actuar y leer la información necesaria, sin desplazar la arena ni los controles?
7. **Tiempo y estados.** ¿Pausa, reducción de movimiento, carga, recuperación y presentación de snapshots se comportan correctamente donde se modifican?
8. **Contratos y dependencias.** ¿Datos, reglas, recursos, anclas e integración conservan sus invariantes y el caso probado usa la versión correcta?
9. **Resultado observado.** ¿La muestra muestra el comportamiento exigido, el autor corrigió defectos evidentes y una revisión independiente suficiente resolvió los hallazgos pertinentes?
10. **Entrega coherente.** ¿Root decide con el alcance real y, cuando corresponde publicar, se promueve esa misma versión y se comprueba el resultado público conservando pendientes ajenos?

## Revisar según riesgo

| Cambio | Comprobación proporcionada |
| --- | --- |
| Documentación o texto sin cambio funcional | Revisión del diff; comprobar la vista afectada sólo si cambia su uso o disposición. Sin suites de combate ni video. |
| Parámetro o variante de componente ya validado | Caso afectado y límites pertinentes del contrato; reutilizar evidencia válida de lo idéntico. |
| Comportamiento visual, sonido o interacción nuevos | Primera demostración completa, revisión independiente con capacidad adecuada y muestra en contexto. La verificación técnica y el juicio perceptual son decisiones distintas. |
| Renderer, capas, reglas, snapshots o infraestructura compartidos | Casos del pedido y representantes de las rutas y excepciones afectadas; ampliar sólo por un riesgo o fallo concreto. |

Una misma persona independiente del autor puede revisar más de una dimensión si tiene capacidad y deja separadas sus conclusiones. No asignar más agentes ni recapturar el mismo caso por rutina. La revisión de un original íntegro puede ser independiente sin que el revisor genere otra copia.

Si sólo se dispone de imágenes, una secuencia suficientemente densa con tiempos y contexto puede demostrar las propiedades observables entre cuadros; no demuestra una percepción continua de fluidez. Completar la inspección viable antes de devolver la tarea. Si falta capacidad para un criterio requerido, dejarlo pendiente y buscar una alternativa adecuada; ni contadores ni puntuaciones genéricas sustituyen esa capacidad.

## Cuándo debe intervenir Root

- Al iniciar un lote: resultado, riesgos, ownership y capacidad para evaluar.
- Tras la primera demostración: comprobar la acción completa antes de extender la implementación o la matriz.
- Si se repite un hallazgo o una ronda no aporta información nueva: detener esa iteración, revisar causa y cambiar hipótesis, herramienta, contrato o responsable.
- Antes de integrar: comprobar dependencias, cambios concurrentes y el candidato real.
- Al cerrar un lote y antes de decidir: revisar retrabajo, límites abiertos y verificaciones duplicadas, además del resultado del producto.

La intervención deja una decisión breve en la ficha. No exige un informe paralelo. Si un error evitable se repite, incorporar el control barato al runner o al contrato existente; evitar otra capa de revisión ceremonial. Las pausas expresas del usuario se conservan y no se levantan por terminar una mejora de proceso.

## Reducir comprobaciones sin bajar el estándar

Cuando un componente, sus contratos y los casos pertinentes tengan resultados consistentes, reducir la matriz a los riesgos del diff y un smoke relevante. No existe un número mágico de pases. Registrar qué sigue idéntico, qué cambió y qué deja de repetirse. Ampliar otra vez ante cambios compartidos o feedback contradictorio.

Conservar una fuente de verdad con pedido, candidato, hallazgos y decisiones. Los informes de los revisores son entradas: no reemplazan el historial autoritativo. El material de publicación se ensambla al congelar el candidato según [Control de revisión](quality-review-gate.md) y [Publicación del frontend](frontend-publication.md); no exigir ese expediente a cada prototipo exploratorio.

Observar sólo señales útiles: ciclos repetidos sobre la misma causa, restricciones conocidas que se pierden, incidencias de integración, criterios requeridos pendientes y tiempo hasta una demostración revisable. No usar cantidad de tests o archivos como medida de calidad. No afirmar mejoras de velocidad o aceptación sin observarlas en trabajos comparables.

## Herramientas

El workbench local usa casos parametrizables y separa observación, captura, tiempos y juicio. El [adaptador del baseline](../tools/review/BASELINE.md) registra el bucle real y un despliegue por UI sin modificar el producto; no garantiza semilla, frame visual ni partículas idénticas. Su `--help` y documentación indican los adaptadores realmente soportados. Un fixture de herramientas no aprueba el juego. Mantener fuera del producto los paneles y etiquetas de desarrollo.

```sh
node scripts/review-workbench.mjs observe tools/review/baseline-case.json --duration-ms 30000
node scripts/review-workbench.mjs capture tools/review/baseline-case.json --out ../.supervision/review-runs
```

La primera orden permite observar durante la autoría; la segunda conserva una ejecución identificada. Los cuadros CDP pueden omitir presentaciones: consultar sus tiempos y huecos reales. El video opcional del canvas y sus PTS son un canal distinto. Las apariciones de eventos por muestra no equivalen a eventos únicos. El visor reúne estas condiciones para evitar reconstruirlas de memoria.

La decisión actual conserva motor y Canvas2D. PixiJS merece un experimento aislado de presentación si el coste de mantener estados y capas sigue alto; Phaser implicaría un cambio más amplio. Aseprite o LibreSprite pueden ayudar con autoría y exportación de sprites y metadatos. Una librería no define por sí sola buena animación, escala, integración ni UX.

Referencias oficiales para decisiones futuras: [contenedores y jerarquía de PixiJS](https://pixijs.com/8.x/guides/components/scene-objects/container), [animaciones de Phaser](https://phaser.io/oss/docs/phaser/concepts/animations), [exportación por CLI de Aseprite](https://aseprite.org/docs/cli) y [comparación visual de Playwright](https://playwright.dev/docs/test-snapshots). Los snapshots requieren un entorno consistente y una referencia ya aprobada; no establecen por sí solos calidad ni disfrute.

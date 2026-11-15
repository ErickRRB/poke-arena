---
name: orquestar-calidad
description: Organizar desarrollo entre varios hilos y detectar bucles de retrabajo, revisiones ineficientes o falta de herramientas. Usar al orquestar entregas complejas o cuando se pide mejorar el proceso; no convertir una edición simple en un flujo de coordinación.
---

# Orquestar calidad con eficiencia

El orquestador responde por el resultado y por cómo se está trabajando. Además de repartir tareas y aprobar, identifica ineficiencias y mejora el método sin esperar a que el usuario las descubra. Conserva las instrucciones, autorizaciones y pausas explícitas de la sesión.

1. Leé el pedido vigente, AGENTS y el flujo del proyecto. Definí el resultado reconocible, restricciones, rutas compartidas y una muestra finita. Aprovechá una ficha existente; no multipliques resúmenes manuales.
2. Identificá la incertidumbre que puede invalidar la solución y la capacidad necesaria para evaluarla. Resolvela con una demostración pequeña y completa antes de extender el cambio. Un ejemplo del usuario requiere buscar equivalentes pertinentes, no probar todo el producto por defecto.
3. Delegá según el rol y la autorización disponibles. Un autor implementa y comprueba; alguien independiente revisa lo relevante; el orquestador decide con una muestra crítica. No crees agentes o etapas redundantes ni reemplaces al implementador o al tester si tu rol es orquestar.
4. Diseñá contratos y composición antes de ajustar síntomas: estados, tiempos, recursos, anclas, capas, feedback, geometría y dependencias que deben funcionar juntos. El estándar es un resultado terminado, no una mejora sobre una base deficiente.
5. Reutilizá presets y herramientas. Preferí un runner parametrizable y una salida identificada por ejecución a copiar scripts, recrear ramas o sobrescribir evidencia. Distinguir lo solicitado de lo realmente observado y observación de aprobación.
6. Revisá el proceso al comenzar un lote, tras la primera demostración, antes de integrar y al cerrarlo. Intervení también cuando se repite un fallo, se pierde una restricción conocida o otra ronda no aportaría información nueva. Son momentos de decisión, no informes obligatorios adicionales.
7. Ante un bucle, detené esa iteración y formulá una pregunta concreta: qué causa sigue sin resolverse, qué supuesto fue falso y qué evidencia cambiaría la decisión. Elegí un cambio de método, contrato, herramienta o responsable y una prueba acotada. No respondas automáticamente con más tests o revisores.
8. Escalá las comprobaciones al riesgo del diff. Un texto simple no necesita un laboratorio de animación; una ruta compartida requiere ejemplos y excepciones pertinentes. Una persona independiente puede evaluar varias dimensiones si tiene capacidad y distingue sus conclusiones.
9. No confundas capacidad técnica con percepción. Tests, hashes y cantidad de cuadros no aprueban apariencia, sonido o facilidad de uso. Si una secuencia de imágenes permite juzgar una propiedad, completá esa inspección viable; si no permite juzgar otra, declarala pendiente sin fingir percepción. Buscá otra capacidad sólo cuando esa carencia sea relevante.
10. Corregí y reexaminá hallazgos concretos, conservando historia y alcance. Reutilizá pases sólo con compatibilidad demostrada de artefactos y condiciones; no recaptures para cada revisor ni transfieras calidad por un hash aislado.
11. Reducí controles repetidos al consolidar componentes y contratos, con razones ligadas a lo que cambió y lo que permanece estable. Volvé a ampliar si aparece un riesgo compartido o feedback contradictorio. No relajes la calidad requerida ni inventes estabilidad por cantidad de pases.
12. Registrá en la ficha las decisiones útiles de proceso y una limitación real cuando exista. Medí retrabajo y tiempo hasta un resultado revisable sólo cuando haya datos; no presentes documentación, una herramienta nueva o un ensayo como prueba de que ya mejoró todo el proyecto.

Para adoptar un framework o herramienta, verificá qué problema concreto resuelve en esta base y probalo en un experimento separado antes de comprometer una migración. Mantené el alcance y los permisos existentes. Si el usuario pausa el producto para mejorar el proceso, continuá ahora el diagnóstico, la documentación y las herramientas de proceso autorizadas; no los condiciones a un permiso para retomar el juego. Esa mejora de proceso tampoco reanuda el trabajo de producto pausado.

# Electrode: presentación eléctrica del Horno

`centralElectrode` (101, FirespiritHut) conserva su contrato móvil, sus disparos y su generación periódica de `fireSpiritToken` (100, FireSpirits). El renderer aplica materiales eléctricos a su preparación, salida, trayectoria e impacto. El pequeño muestra su nacimiento y salto desde los estados nativos; la descarga en área aparece únicamente con su `deathBurst` de ataque real.

La selección exige la clave activa y la especie. `electrode` heredado, Forretress, el Voltorb ElectroSpirit, Pikachu y las demás cartas mantienen su representación. El pequeño del Horno no dibuja cadenas entre enemigos ni señales de aturdimiento. El núcleo del disparo usa la misma posición interpolada y la trayectoria guardada del proyectil ordinario, incluso si desaparece quien lo lanzó. El motor, catálogo, referencias, snapshots y protocolo permanecen sin cambios.

Los trazos usan extremos fijos, oscilación continua y un núcleo con borde oscuro para conservar contraste en el tablero. Reducir movimiento elimina las estelas, las chispas itinerantes y la pulsación del núcleo. No hay relojes de carga adicionales: la preparación sigue el ataque y el nacimiento sigue `spawn`.

La estela ocupa el pase normal del mundo y sólo el núcleo entra en el pase frontal de proyectiles. La descarga local del pequeño usa chispas separadas sobre el suelo, detrás de cuerpos y barras; su vida sigue siendo la del mismo efecto, sin un reloj nuevo. Dos bifurcaciones laterales hacen visible la electricidad de su nacimiento sin tapar la cara, cambiar el desvanecimiento nativo ni agregar otra invocación.

El primer caso de revisión es `tools/review/electrode-lore.case.json`: encuentro aislado de dos Electrode sobre el puente izquierdo en la App real a 390 × 844, DPR 1, conservando torres, cartas y relojes nativos, con IA desactivada. El adaptador no cambia vida, velocidad, objetivos, daños ni temporizadores. La secuencia incluye disparos, nacimiento del pequeño, salto, descarga y desaparición. Las capturas originales y las conclusiones visuales independientes se evalúan por separado; las pruebas automáticas no acreditan fluidez perceptual.

Posibles familias posteriores: carga y proyectil localizado para Magnemite; materiales de salto para Voltorb, conservando exclusivamente sus cadenas reales; rayos existentes de Pikachu, Zapdos y Ampharos. Estas familias no se amplían antes de revisar el primer grupo.

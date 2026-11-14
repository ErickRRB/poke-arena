# Segundo checkpoint de motor y regresiones

> Evidencia histórica del checkpoint 8172b58. La [entrega final](NATIVE-RELEASE-2026-11-14.md) enlaza las pruebas, la matriz regenerada y la revisión completa posteriores.

458pruebas de Node y4pruebas del Worker realtime pasan con Node22.23.4. Comandos: `npm run check`, `npm run test:all`, y `npm test` en realtime. El Worker está compilado, pero esta entrega aún espera cámara y QA visual para publicarse.

Se corrigieron dos hallazgos independientes del primer checkpoint: cada instancia de módulo recibe un clon de las definiciones del catálogo, evitando reducir por segunda vez un combo ya consolidado cuando conviven imports con y sin query. El test abre tres instancias, compara todas las fichas y verifica Scizor270, Blaziken300, Dragonite255 y Crobat150. Sableye comprueba el hueco actual antes de cada embestida: tras la primera, un mismo blanco cercano recibe básicos194, y un nuevo blanco a distancia válida conserva su nueva preparación. Ambos bandos y30/60Hz están cubiertos.

La matriz del primer checkpoint queda retirada como evidencia de los originales afectados por la inicialización compartida. Se regenerará al final, con93fichas ofensivas×4referencias (incluye3estructuras), archivos canónicos UTF8/LF y sus blobs Git. El mismo conjunto estable alimentará la revisión de las50originales seleccionables, no sólo las12adaptaciones de parciales. Los cambios de presupuesto tienen notas individuales en scripts/original-balance-decisions.mjs; no se compensan tasas de victoria de la matriz retirada.

Otros ajustes: emisores nativos con anillo/punto de emisión y miembros de muerte sin DeployTime inventado; Golemitas con deslizamiento; cuadra fija de corona de una celda por semilado y borde estricto para área, con impacto directo preservado; rayos en tres tiempos y tres oleadas de Pin misil sobre sus relojes reales. Las pausas de marcha de tanques y las colisiones usan cuerpos completos. La Pokébola de carga inicial es vector inline y no espera descargar su propia imagen.

Pendientes de integración: nueva esfera aprobada e6efa3b, cámara uniforme y terreno de Arte, inspección de ataques/audio en navegador, protocolo de actualización de clientes antiguos, reportes finales y publicación coordinada. El primer documento conserva su atribución histórica y sus límites; la evidencia nueva de velocidad de proyectiles está en PROJECTILE-CALIBRATION-2026-11-14.md.

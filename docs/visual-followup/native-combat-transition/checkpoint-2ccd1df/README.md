# Contactos después de 2ccd1df

El checkpoint congelado es `2ccd1df234a3ce75856f068074275e9764f50de0`. La retención del contacto se comprobó con el motor real y el Renderer real, sin usar el WIP de cámara. **La corrección de contactos pasa; la corrección del origen físico de los proyectiles todavía no forma parte de este corte.**

| Repetición | Casos | Releases |
|---|---:|---:|
| Perspectiva 0: local30, local60 y public15/render60 | 1248 | 2496 |
| Perspectiva 1: public15/render60 | 416 | 832 |
| Total consolidado | 1664 | 3328 |

Se cubrieron las **23 claves con diferencias reales de raster** del corte anterior, Ampharos y los guardias 31/52 como controles. El guardia34 ya estaba en las 23: son 26 claves, ocho direcciones, tres ciclos automáticos y un ataque directo. Los snapshots y eventos públicos de la perspectiva1 pasan por la misma transformación que usa la app.

No hubo diferencias del raster de contacto, divergencias de marcador, releases tempranos o tardíos, rebobinados, errores de cadencia ni fallos de recuperación final. Las comprobaciones consolidan las trazas de ambas ejecuciones en `verification.json`.

`repro-king34-after/contacts` contiene las láminas reales antes/durante/después de la entrega. Las dos láminas del ataque directo fueron inspeccionadas: a .533333s se conserva **Shoot6**, el contacto que antes ya había pasado a Shoot7. Permanece junto al evento durante la retención y después continúa hacia recuperación. Ambas perspectivas conservan el marcador sobre el dibujo.

Los contratos CARDS exportados son byte-idénticos a01ec423 y los módulos de engine/balance no cambian. Frente a ese corte, los módulos distintos son Renderer, geometría de sprites (la corrección anterior de Electrode) y battle-art/capsule-art del antecedente aprobado. La lista exacta de entradas y sus hashes se conserva junto a cada reporte; no se atribuye a este cambio una modificación del motor.

Los runners comprobaron una única URL de engine en cada página. Se verificaron también los archivos servidos contra los objetos Git, admitiendo únicamente la normalización CRLF del export de texto de Windows. Los binarios coinciden byte por byte.

Archivos principales:

- `browser-contact-after/summary.json` y `traces`: ocho vistas con controles local30/60 y public15.
- `browser-contact-after-viewer1/summary.json` y `traces`: ocho vistas de la otra perspectiva pública.
- `repro-king34-after/contacts`: cuatro láminas pequeñas del repro automático/directo en ambas perspectivas.
- `verification.json`: recuentos, procedencia y comprobaciones consolidadas.

El origen físico pendiente sigue documentado en `checkpoint-01ec423/physical-launch-evidence.json`. Repetir Treecko/Beedrill después del SHA del motor que lo corrija; los comandos están en el `RERUN.md` de ese corte. Esta verificación de contactos no acredita cámara, escalas, jitter ni una revisión artística global de todos los frames.

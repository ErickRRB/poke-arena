# Activación coordinada de83 y534

La entrega de motor `d86ad667bab2d34e2b70b49961165001d6cea85b` se incorporó por cherry-pick como `a8d679c`: incorpora statsbase83/534 y separa `geodudeToken`74, incluida su escala visual independiente1.3. Es una dependencia ya presente en main; no hay que duplicarla al integrar el commit de identidad.

Con esa base, Caballero conserva la clave guardada `geodude` y usa Farfetch’d83, tipoNormal, etiquetaNormal/volador, Attack completo y emisor de cabeza. El nombre de ataque visible pasa a Golpe de puerro. Lanzarrocas conserva `graveler` y usa Conkeldurr534, tipoLucha, Shoot completo y emisor de cuerpo. La roca sigue la trayectoria física existente. Se activan las dos rutas nuevas de ilustraciones en el mismo cambio que los IDs, después del retiro temporal que alineó esta rama con main/v34.

No se cambian vida, daño, alcance, radios, velocidades, windup, intervalos ni mazos guardados en este commit de identidad. Las pruebas comprueban conservación de claves/orden, correspondencia de especie/animación/ilustración y que la muerte de Golem genere dos Geodude74, conservando al Caballero como83. También pasan los controles de markers, ocho orientaciones y guardado de mazos.

La calidad de los nuevos modos de ataque y sus transiciones se vuelve a comprobar con el checkpoint nativo y la cámara18×32 definitivos. Las hojas anteriores describen raster/metadata y la proyección anterior; no acreditan los65+contratos de ataque nuevos del principal ni un encuadre que aún no se aplicó.

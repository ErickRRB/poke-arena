# Vista previa de Rueda Fuego

La vista previa conserva una sola celda de despliegue y el parpadeo rojo de los objetivos terrestres que recibirían el golpe. Se retiraron la trayectoria, el corredor, la grilla general y la línea que conectaba el puntero con una celda próxima. El proyectil lanzado y su colisión siguen usando el motor existente.

`node scripts/qa-log-preview.mjs` usa la aplicación real a390×844, sin reemplazar sus imports, HTML ni CSS. Añade accesores de diagnóstico y congela la simulación después de iniciar para capturar ambas perspectivas. El informe guarda hashes de los archivos comprobados. Comprueba que toda geometría de preview quede dentro de la celda24, que los blancos sean terrestres y que el tinte se limpie al salir o cancelar la selección. Las pruebas de `placement-preview.test.mjs` también comparan el conjunto previsto con los impactos reales de todos los hechizos.

Las dos capturas son evidencia de composición y feedback visual; los valores altos de salud y la escena inmóvil sólo pertenecen al fixture de QA.

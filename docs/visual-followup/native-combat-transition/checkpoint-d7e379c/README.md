# Cloyster: cierre de d7e379c

Se congeló `d7e379cb2aa37839708b664793557c82de85b1c0` y se comprobó **sólo Cloyster** con Game y Renderer reales: 48 casos / 96 releases, ocho vistas, local30/local60/publicSnapshot15 con Renderer60, ataques directos y tres ciclos automáticos.

El contrato observado fue **210 de daño, intervalo 1.6 y burst 1**. Todos los impactos medidos fueron 210; los 48 intervalos entre ciclos fueron 1.6. Los 96 contactos coinciden en RGBA y emisor, y se observaron las 96 recuperaciones intermedias/finales. Cero releases tempranos/tardíos, rebobinados o errores de página. El error máximo de marcador fue .555 unidades; la diferencia máxima entre la fuente física y el emisor visual fue .008, dentro de la precisión pública y del redondeo.

`verification.json` contiene las comprobaciones. Se guardó únicamente un control sur público/automático en `south-control/contacts/cloyster-public15-0-automatic-viewer0.png` y fue inspeccionado visualmente. Sus tres disparos adicionales son un control, separados de la matriz 48/96. Las trazas completas están en `cloyster/traces`.

La fuente usa una única URL de engine, `/frozen/engine.js?v=26`, sin WIP ni relabel a otro SHA. Los bytes servidos fueron contrastados con Git; para texto sólo se admite CRLF→LF del export Windows. La copia del runner para el control sur sólo adapta la ruta de raíz y fija la dirección 0; los guiones anteriores y el producto permanecen intactos. No se repitieron otras cartas, tamaños o cámara y no se ajustó balance.

Para repetir la matriz desde la raíz del worktree:

```powershell
node scripts/inventory-native-checkpoint.mjs --candidate-ref=d7e379c
node scripts/qa-native-contact-browser.mjs --inventory=docs/visual-followup/native-combat-transition/checkpoint-d7e379c --keys=cloyster --extra-guards=0 --modes=local30,local60,public15 --directions=all --triggers=automatic,direct --name=cloyster
node docs/visual-followup/native-combat-transition/checkpoint-d7e379c/verify-cloyster.mjs
```

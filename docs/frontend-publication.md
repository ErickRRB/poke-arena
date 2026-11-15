# Publicación del frontend

La única vía operativa habitual es el wrapper `scripts/publish-frontend.mjs`, mediante `npm run deploy` en `realtime/frontend`. Preparar un build o subir un preview no autoriza su activación. No usar `cf deploy` directo para publicar frontend. Node debe ser 22.18 o superior.

El wrapper y sus instrucciones reciben revisión independiente antes de su primera integración o uso. Ese veredicto precede al guard sobre registros completos y a la decisión de Root; no necesita autorizarse a sí mismo. Para cada publicación posterior se revisa el producto y el alcance correspondientes, no se reutiliza la aprobación del tooling como aprobación visual.

## Preparación sin activación

En el worktree de fuente limpia, desde `realtime/frontend`:

```powershell
npm run build
npm run preview -- --preview-alias review-motion
```

`build` usa `cf workers versions create --dry-run`; `preview` usa `--prebuilt`. Conservar el Build Output completo `.cloudflare/output/v0`, incluido bundle del Worker, configuración y assets. Registrar SHA y árbol limpios, ID UUID completo y URL inmutable. El alias es mutable. Las versiones comparten bindings: usar CPU/fixtures, sin matchmaking ni escrituras compartidas para esta revisión.

Comprobar en navegador la versión propia y conservar una prueba JSON con `source: {sha, tree, status: ""}`, `version`, `origin`, `resources: [{file, url, bytes, sha256}]`, `errors: []`, `canonicalRequests: []`, `externalOrigins: []` y `canvas: {clean: true}`. Los recursos incluyen index.html, app.js y render.js. El wrapper contrasta cada recurso con el Build Output. La prueba necesita revisión independiente y no sustituye el juicio sobre el producto.

Antes del veredicto, Root o un revisor existente coteja plan, pedido, diff, rutas compartidas, riesgos y exclusiones. Puede registrar ese cotejo como parte de su revisión; no requiere otra persona ni una captura por trámite. El recibo vinculado tiene esta forma mínima, con razones reales y cronología honesta:

El review JSON declara además `authorship: {"planAuthors": ["Main"], "scopeAuthors": ["Main"]}`. Usar identificadores de actor consistentes en esa autoridad, los records y el cotejo, sin cambiar de alias entre campos. Todos los autores de records del alcance deben figurar en `scopeAuthors`; los coautores adicionales también se declaran. Si el plan contiene `author` o `authors`, deben coincidir con esta autoridad. El `author` del cotejo pertenece a `planAuthors` y su `reviewer` no puede ser ninguno de los autores del plan o cambio. No basta con comparar dos campos autodeclarados del propio cotejo. Estos identificadores no autentican personas ni permiten detectar aliases falsos no declarados; Root examina su coherencia semántica.

```json
{
  "outcome": "sufficient",
  "author": "Main",
  "reviewer": "Revisor independiente",
  "reviewedAt": "FECHA ISO REAL",
  "chronology": "Cuándo se examinó el plan y sus límites de registro.",
  "candidate": {"sha": "SHA COMPLETO", "tree": "ÁRBOL COMPLETO"},
  "planHash": "SHA256 de JSON.stringify(plan)",
  "basis": {
    "requestAndDiff": "Cotejo concreto del pedido y el diff.",
    "sharedPathsAndRisks": "Rutas compartidas y riesgos revisados.",
    "exclusionsAndLimits": "Exclusiones justificadas y límites pendientes."
  }
}
```

Si falta una obligación, corregir y versionar el plan conservando la historia y los fallos. Los hashes y la fecha no prueban que el alcance sea suficiente; Root examina el contenido. El recibo declara una revisión, no autentica una identidad.

Con los registros finales por criterio y la evidencia accesible, preparar el manifest local desde el checkout operativo del tooling revisado. Las rutas de entrada y salida se pasan absolutas; las referencias guardadas son relativas al manifest:

```powershell
npm run release:prepare -- --source RUTA_FUENTE_CONGELADA --review RUTA_REVIEW_JSON --plan-review RUTA_COTEJO_JSON --preview-proof RUTA_PRUEBA_JSON --version UUID_COMPLETO --output RUTA_MANIFEST_JSON
```

La fuente congelada puede estar en otro worktree; el wrapper operativo no tiene que reemplazarla ni cambiar su árbol. `prepare` escribe únicamente el manifest, con candidato, versión, plan, alcance, referencias y hashes de los registros y un inventario completo del Build Output. No emite una aprobación de calidad. Si cambian registros, evidencia, fuente o build, preparar y revisar de nuevo lo que corresponda; no trasladar una decisión anterior silenciosamente.

## Decisión y promoción

Root ejecuta el guard real y examina plan, evidencias, límites y veredictos independientes. Después escribe su decisión con estos campos:

```json
{
  "schemaVersion": 1,
  "outcome": "approve_publication",
  "reviewer": "/root",
  "reviewedAt": "FECHA ISO REAL POSTERIOR A MANIFEST Y REVISIONES",
  "reason": "Decisión de calidad concreta y alcance aprobado.",
  "manifestSha256": "SHA256 DEL ARCHIVO EXACTO",
  "reviewSha256": "DEL MANIFEST",
  "planReviewSha256": "DEL MANIFEST",
  "planHash": "DEL MANIFEST",
  "scopeHash": "DEL MANIFEST",
  "authorshipHash": "DEL MANIFEST",
  "candidate": {"sha": "SHA COMPLETO", "tree": "ÁRBOL COMPLETO"},
  "versionId": "UUID COMPLETO REVISADO",
  "globalOpen": true
}
```

`globalOpen` debe coincidir con el guard actual, incluso en una publicación parcial válida. La decisión vinculada no borra los pendientes. El publicador ejecuta:

```powershell
npm run deploy -- --manifest RUTA_MANIFEST_JSON --decision RUTA_DECISION_JSON --dry-run
npm run deploy -- --manifest RUTA_MANIFEST_JSON --decision RUTA_DECISION_JSON
```

En PowerShell, seleccionar Node 22.18 o superior explícitamente y comprobar su versión antes del release. La instalación existente 22.23.4 permite invocar el mismo wrapper desde `realtime/frontend`, preservando los argumentos:

```powershell
$releaseNode = 'C:/Users/Mapa/AppData/Roaming/nvm/v22.23.4/node.exe'
& $releaseNode --version
& $releaseNode ../../scripts/publish-frontend.mjs promote --manifest RUTA_MANIFEST_JSON --decision RUTA_DECISION_JSON --dry-run
& $releaseNode ../../scripts/publish-frontend.mjs promote --manifest RUTA_MANIFEST_JSON --decision RUTA_DECISION_JSON
```

Si se usa npm con Node ya seleccionado en PATH, `npm.cmd --% run deploy -- --manifest RUTA_MANIFEST_JSON --decision RUTA_DECISION_JSON --dry-run` evita que PowerShell altere los flags; ejecutar después la misma orden sin `--dry-run`. En este release, `npm.ps1` perdió argumentos y Node 22.16 no pudo cargar `cloudflare.config.ts`: ambos intentos terminaron antes de solicitar activación. Corregir el entorno no requiere reconstruir ni subir otra versión.

El wrapper vuelve a ejecutar el CLI real detrás de `npm run review:check`, comprueba los archivos y todos los vínculos, y sólo propone `cf workers deployments create` con el ID exacto al 100%. No reconstruye ni sube otra versión. Sin registros suficientes, rechaza con un error de calidad concreto antes de mutar Cloudflare; no pide otro permiso al usuario. La autorización de despliegue vigente es distinta de la decisión de calidad de Root.

La ejecución real consulta la versión activa y compara los bytes públicos básicos con el build. Guardar stdout y stderr como registro de publicación. Un resultado favorable queda como `promoted_public_behavior_review_pending`: aún falta reproducir la conducta pública del alcance y su revisión independiente. No cierra hallazgos ni registros.

Si falla después de pedir la activación, el error conserva `activation_requested_not_verified` o `activated_not_verified`, junto al ID. La versión puede estar activa aunque el comando termine con error. Registrar un hallazgo abierto de publicación no verificada, consultar el estado y coordinar recheck o corrección con Root. No reintentar la mutación a ciegas, fingir rollback ni afirmar release completo. `cf workers deployments list --worker poke-arena-web --per-page 1` es una consulta de lectura para diagnosticar; no es una publicación alternativa.

Este control comprueba coherencia de declaraciones y archivos. No firma decisiones, autentica a Root, demuestra suficiencia perceptual, aísla bindings ni impide que quien tiene credenciales lo eluda con `cf` directo. La revisión independiente y la decisión de Root siguen siendo necesarias.

El servidor `realtime` es un release separado. Su `npm run deploy` aún usa `cf deploy`; la automatización de esa ruta queda como seguimiento explícito abierto. Aplicar la política de revisión y aprobación según su riesgo y cambios propios. Este wrapper no lo publica ni convierte su autorización en aprobación del frontend. Sites histórico permanece fuera de este flujo.

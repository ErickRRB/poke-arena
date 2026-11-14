# Identidades nativas: Farfetch’d 83 y Conkeldurr 534

Revisión del 14 de noviembre de 2026. Propuesta aceptada para integrar; este trabajo sólo guarda evidencia y no modifica el runtime. Las siete láminas contienen todos los frames originales en las ocho direcciones, con anclaje al suelo y ampliación nearest-neighbour. Los aros son markers diagnósticos, no arte del juego.

| Clave / identidad | Perfil propuesto | Contacto / retorno originales | Gesto visible |
| --- | --- | --- | --- |
| `geodude` / Farfetch’d 83 / Caballero | Idle, Walk, Attack completos; `emitter: 'head'` | Attack f3 / f6 | Estocada con el puerro desde el pico. Los markers de mano corresponden a las alas levantadas, detrás de la estocada. |
| `graveler` / Conkeldurr 534 / Lanzarrocas | Idle, Walk, Shoot completos; `emitter: 'body'` | Shoot f2 / f5 | Preparación y seguimiento central con ambos pilares todavía sujetos. El PNG no muestra una roca que se suelte. |

Conservan las ocho orientaciones durante los ataques; no se observa un giro completo ni una inversión del rumbo. No se propone recortar frames, sustituir los contactos, ni añadir `attackGestures`.

Los índices siguientes empiezan en cero. Las duraciones de la fuente se expresan en ticks; los segundos corresponden a reproducirlos a 60 ticks/s. El motor puede distribuir estos frames alrededor de su windup: estas cifras **no sustituyen** vida, daño, intervalo, windup ni duración de combate.

| Clip | Duraciones nativas | Inicio del hit | Inicio de ReturnFrame | Total |
| --- | --- | --- | --- | --- |
| 83 Attack | 2,6,1,1,1,2,2,2,2,2 | 9 ticks / 150 ms, f3 | 13 ticks / 216,67 ms, f6 | 21 ticks / 350 ms |
| 534 Shoot | 2,2,6,1,2,2,2,2,2,2,2,2 | 4 ticks / 66,67 ms, f2 | 13 ticks / 216,67 ms, f5 | 27 ticks / 450 ms |
| 534 Attack, alternativa examinada | 2,2,6,1,2,2,2,2,2,2,2,2,2,2 | 4 ticks / 66,67 ms, f2 | 17 ticks / 283,33 ms, f7 | 31 ticks / 516,67 ms |

En Farfetch’d, la extensión aparece en f2 y el contacto marcado es f3. El pico en E/f3 está en (59,33); la mano adelantada está en (43,22). Elegir una mano desplazaría la señal detrás del puerro. Idle y Walk usan exactamente el mismo PNG, con duraciones distintas: 30,12,30,12 frente a 6,12,6,12.

En Conkeldurr/Shoot sólo hay dos dibujos diferentes por dirección una vez anclados al suelo: f0–3 y f4–11. El hit f2 conserva la preparación; el seguimiento comienza en f4. En Attack, el gesto de concentrar los pilares comienza en f6, después del hit original f2. No se convierte ese gesto tardío en un lanzamiento adelantando o retrasando arbitrariamente el contacto.

La roca es una adaptación explícita del juego. Se conserva el nacimiento físico de `rollingShot` en `(actor.x, actor.y)` y el centro dibujado de la roca en `rollingPose.y - 13 / verticalScale`. El emisor de cuerpo aporta una señal central; no eleva ni desplaza esa trayectoria. Las manos son agarres laterales de pilares: en S quedan aproximadamente a 26–29 unidades del eje a escalas 1,85–2,05. Lanzar desde ellas exigiría una transición visual mano→suelo propia; no se afirma que exista en los sprites revisados.

`ReturnFrame` es una etiqueta de tiempo y no garantiza una pose idéntica a Idle. Shoot termina en el segundo dibujo, sin restaurar el inicial; al cambiar a Idle0 el marker de cuerpo se desplaza como máximo 2,83 píxeles nativos (E/W). Farfetch’d Attack vuelve a una postura recogida en f9, distinta de Idle0: el cambio máximo de marker es 6,40 píxeles en cabeza (S) y 5,10 en cuerpo (W). Estos cambios de pose deben observarse en las transiciones de combate integrado; no prueban un desplazamiento del actor. Los valores por dirección están en [analysis.json](analysis.json).

Las escalas 83=2,20/2,25 y 534=1,85/2,05 siguen siendo candidatas para QA de batalla. No se deducen radios de colisión del lienzo transparente, alcance del puerro, pilares ni tamaño visual. Geodude 74 se conserva como token de Golemites; la clave y la descendencia de Golem quedan a cargo del integrador.

## Evidencia y procedencia

- [Farfetch’d Attack, ocho direcciones](contacts/farfetchd-attack-native.png), [Idle](contacts/farfetchd-idle-native.png), [Walk](contacts/farfetchd-walk-native.png).
- [Conkeldurr Shoot, ocho direcciones](contacts/conkeldurr-shoot-native.png), [Attack alternativo](contacts/conkeldurr-attack-native.png), [Idle](contacts/conkeldurr-idle-native.png), [Walk](contacts/conkeldurr-walk-native.png).
- [Perfiles concretos](motion-profiles.json), [mediciones y coordenadas](analysis.json), [28 archivos con SHA256 y URL individual, incluidos los diez Offsets](sources.json).
- Fuente inmutable: PMDCollab/SpriteCollab, commit `576a7f13b5b7f6ad09a5877d5ae6b2d33458c245`. [AnimData 83](https://github.com/PMDCollab/SpriteCollab/blob/576a7f13b5b7f6ad09a5877d5ae6b2d33458c245/sprite/0083/AnimData.xml), [AnimData 534](https://github.com/PMDCollab/SpriteCollab/blob/576a7f13b5b7f6ad09a5877d5ae6b2d33458c245/sprite/0534/AnimData.xml). Los hashes se calculan sobre los bytes locales; esta revisión no vuelve a descargar las fuentes.

## Reproducción desde un clon limpio

Requiere Python 3.10 o posterior y las dos dependencias de [requirements.txt](requirements.txt). El auditor autocontenido está en [scripts/audit-native-identities.py](../../../scripts/audit-native-identities.py); sólo lee assets y manifest versionados. No necesita archivos de `qa/`, navegador ni descargas de fuentes.

Desde la raíz del repositorio:

```powershell
python -m pip install -r docs/visual-followup/native-identities/requirements.txt
python scripts/audit-native-identities.py --output qa/native-identities-reproduced
```

El destino separado recibe los tres JSON y siete contactos, conservando la evidencia aprobada. Para reconstruir directamente el paquete se puede omitir `--output`. Los rótulos originales usan Consolas de Windows a 11 px; `--font ruta/a/fuente.ttf` permite fijar otra fuente. Sin Consolas, el auditor usa DejaVu Sans Mono o la fuente de Pillow: cambia la tipografía diagnóstica, sin alterar las mediciones ni los píxeles de los sprites. `analysis.json.repoHeadAtAudit` registra el commit del clon que ejecuta el auditor, por lo que cambia al avanzar HEAD.

La [prueba de reproducción](reproduction-check.json) ejecutó este guion sobre una exportación de Git que contenía sólo los assets/manifest versionados y el guion, sin carpeta `qa/`: los tres JSON coincidieron salvo el campo de HEAD y los siete PNG resultaron idénticos en bytes y píxeles. El registro incluye el SHA256 del guion y de cada contacto; los contactos aprobados no se modificaron.

El guion verifica XML contra manifest, ocho filas por clip y todos los markers de las poses de hit. Revisión limitada al raster/metadata nativo: falta la comprobación de combate con las identidades activadas; no se certifica rendimiento de navegador a 60 FPS.

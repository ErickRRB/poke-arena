# Tamaños por función después de v32

Se revisaron las **121 claves del catálogo**: 108 cuerpos y 13 efectos sin cuerpo propio. También se midieron por separado el Geodude pequeño de Golem y los candidatos Farfetch’d83 y Conkeldurr534: **111 cuerpos, 102 especies y ocho direcciones**. Se inspeccionaron las **31 láminas globales completas** y una comparación adicional de Bowler, con Golem y Rhydon en la misma grilla. La decisión por cada clave está en [all-key-decisions.csv](all-key-decisions.csv) y [decisions.json](decisions.json).

El integrador aceptó **83=2.2, 534=2.05, Ampharos181=1.85 y Nuzleaf274=1.55**. Alakazam65 conserva1.3548. El Geodude74 pequeño de Golem conserva una escala visual independiente de1.3. Esta auditoría no aplicó escalas ni cambió runtime, colisiones, manifiesto, ilustraciones o sprites.

## Cinco láminas para revisar las decisiones

No hace falta recorrer toda la galería para revisar los cambios propuestos:

| Lámina | Qué permite decidir |
| --- | --- |
| [Bowler con Golem, Rhydon y Caballero](bowler-context/role-comparison.png) | Graveler actual, Conkeldurr1.85 y2.05, Rhydon, Golem y Farfetch’d2.2 comparten grilla y tamaño móvil. Es la comparación final de los dos recambios. |
| [Ampharos en Idle](candidate-ampharos-rest-1.png) | Contrasta1.625,1.8 y1.85 en la pose inicial agachada y en la pose alta, en ocho vistas. |
| [Ampharos en Shoot](candidate-ampharos-attack-1.png) | Comprueba las mismas escalas durante el ciclo completo de disparo. El candidato1.95 está en [Idle](candidate-ampharos-rest-2.png) y [Shoot](candidate-ampharos-attack-2.png). |
| [Nuzleaf individual](candidate-nuzleaf-rest-1.png) | Contrasta1.2667,1.45 y1.55. Se elige1.55 para diferenciarlo de los pequeños cuerpos de enjambre. |
| [Alakazam](candidate-alakazam-rest-1.png) | Contrasta1.3548 con1.3. Se conserva la escala actual: la reducción sólo quita alrededor de un píxel de ancho y alto. |

## Decisión final

Las medidas pintadas siguientes son máximos del ciclo completo y las ocho vistas. Ancho y alto máximos pueden corresponder a poses distintas; no describen una única caja de contacto. Los píxeles CSS se midieron en el Renderer, con el umbral de alfa descrito abajo.

| Clave de integración | Especie y escala elegidas | Resultado visible a390px | Motivo |
| --- | --- | --- | --- |
| `geodude` / Caballero | Farfetch’d83, **2.2** | 20–27px de ancho, 27–29px de alto; área alfa máxima438px². | La silueta erguida se lee como defensor individual. Conserva una masa cercana a Geodude anterior,429px², y mejora su altura frente al cuerpo plano de34×24px.2.4 añade volumen sin una necesidad observada. |
| `graveler` / Bowler | Conkeldurr534, **2.05** | 31–50px de ancho, 36–42px de alto; área alfa máxima1173px². | El Bowler anterior alcanzaba33×31px.1.85 mejora a46×38px, pero2.05 da la altura pedida. Sigue por debajo del Golem56×48px y1576px²; Rhydon llega52×42px. Los pilares explican parte del ancho y de la masa. |
| `ampharos` / Tesla | Ampharos181, **1.85** | Idle15–28×25–36px; Shoot17–29×27–37px. | Aumenta la lectura del cuerpo manteniendo la compuerta y el anclaje. La pose alta ya es mayor que la pose agachada;1.95 alcanza39px de alto en Idle y compite con el Vivero.1.85 conserva una diferencia más moderada. |
| `nuzleaf` / Lanzadardos | Nuzleaf274, **1.55** | 19–24×22–29px; área alfa máxima320px². | Frente a los19×23px y202px² actuales, el cuerpo individual deja de leerse como uno de varios pequeños tiradores. No se traslada este aumento a Treecko, Ralts o Poochyena. |
| `alakazam` / Arquero mágico | Alakazam65, **conservar1.3548** | Máximo26×21px. |1.3 produce25×20px: achica una pose agachada sin corregir un defecto visible. No se exige la altura de un mago erguido a esta silueta. |
| `geodudeToken` / fragmento de Golem | Geodude74, **conservar1.3 independiente** | 15–22×11–15px; área alfa máxima175px². | Mantener el cuerpo pequeño tras separar al Caballero. No derivar su escala de Farfetch’d:2.2×0.65 produciría1.43 y alteraría este token. |

El radio lógico capturado del Geodude pequeño es17. La escala1.3 es una decisión de dibujo; este informe no propone conservar o modificar estadísticas de combate por semejanza de tamaño. El principal revisa esas equivalencias aparte.

## Cómo se revisó todo el catálogo

Las familias se usaron como comparaciones de lectura, sin imponer un rango numérico único a todas sus siluetas:

| Familia | Evidencia | Decisión |
| --- | --- | --- |
| Ciclo y luchadores | [1](fighters-cycle-1.png), [2](fighters-cycle-2.png) | Conservar. Torso, arma, aletas o patas permiten leer un cuerpo individual sin agrandarlo por coste o vida de forma automática. |
| Apoyo a distancia | [1](ranged-support-1.png), [2](ranged-support-2.png), [3](ranged-support-3.png), [4](ranged-support-4.png) | Aumentar Nuzleaf; conservar los demás, incluido Alakazam. Roselia mantiene el aumento previo y sus flores30×22px. |
| Primera línea | [1](frontline-1.png), [2](frontline-2.png), [3](frontline-3.png) | Recambiar Caballero y Bowler; conservar los demás. No igualar por altura una figura baja y ancha con otra erguida. |
| Tanques y atacantes de estructuras | [1](tanks-1.png), [2](tanks-2.png) | Conservar. Golem, Snorlax y Rhydon siguen por encima de los cuerpos económicos. Onix tiene una silueta curva, y Forretress es un cuerpo explosivo; ninguno necesita copiar el volumen de un Gigante. |
| Voladores de apoyo | [1](air-support-1.png), [2](air-support-2.png), [3](air-support-3.png) | Conservar. Se mide el vuelo real, incluidos los tres rigs; ancho de alas y cola no equivalen a huella de suelo. |
| Voladores pesados | [1](air-heavy-1.png) | Conservar la diferencia de envergadura, longitud y masa respecto a los enjambres aéreos. |
| Estructuras | [1](structures-1.png), [2](structures-2.png) | Aumentar sólo el cuerpo de Ampharos. Vivero, Madriguera, Wobbuffet, Cloyster y Regice mantienen su forma natural; la base de Central y la compuerta de Tesla se miden aparte del cuerpo. |
| Enjambres e invocaciones | [1](swarms-tokens-1.png), [2](swarms-tokens-2.png), [3](swarms-tokens-3.png), [4](swarms-tokens-4.png) | Conservar cada cuerpo y separar el Geodude pequeño. No hay multiplicador global que se amplifique en grupos de15 integrantes. |
| Compatibilidad | [1](legacy-1.png) | Conservar Electrode, Exeggutor y Registeel para datos anteriores; no tratarlos como nuevas cartas de colección. |
| Trece efectos sin cuerpo | [CSV de121claves](all-key-decisions.csv) | Clasificados explícitamente como `body_scale_not_applicable`. No convertir el área de un hechizo o el diámetro de una cápsula en escala de tropa. |

No apareció otro ajuste de escala obligatorio en este corte. Sharpedo, Celebi, Moltres y Crobat conservan notas de silueta en la matriz: altura, superficie opaca y extensión de alas no se fuerzan a una misma proporción. Si el balance cambia una adaptación a clon exacto de otra función, debe revisarse esa lectura con el nuevo papel. Este informe describe el catálogo observado.

## Medidas y límites

El viewport real es390×844. El tablero medido ocupa370×677, con escalas0.6166667 horizontal y0.84625 vertical por unidad lógica. La grilla de24 unidades proyecta **14.8×20.31px CSS**. Renderer compensa el estiramiento vertical de los sprites para conservar su proporción: una altura nativa multiplicada por escala de arte no se divide sin más por24 para afirmar que ocupa esa cantidad de filas del suelo.

Se midió el alfa de todos los frames de `Idle` y de la animación de movimiento nativa en ocho direcciones. Se guardan por separado frame0 y ciclo completo. Después se dibujó cada cuerpo con `Renderer.sprite` y sus anclajes reales durante un ciclo completo a60 muestras/s; para los voladores se usa su ciclo real de vuelo. Los tres rigs están incluidos en la medición de silueta, sin reabrir aquí la calidad de su animación. Fueron66.512 muestras globales de cuerpos y13.048 muestras de variantes. La comparación acotada de Bowler añade4.992 muestras de seis cuerpos.

El alfa nativo considera valores mayores que cero. Los bounds pintados usan **alfa≥128** para que franjas casi transparentes surgidas al proyectar el atlas no inflen una silueta visible; los bounds de cualquier alfa no nulo también quedan guardados en `anyAlphaBounds`. `alphaArea` suma cobertura alfa fraccional. La cuadrícula, los rótulos, la sombra, las barras y la plataforma quedan fuera de la medida del cuerpo. Los recortes de la galería sí muestran la base cuando corresponde. Los redondeos del raster pueden producir diferencias de un píxel entre poses.

El caso de Tesla justifica medir ciclos completos: `Idle` pasa de una pose agachada a otra erguida. En fuente, el alto máximo de frame0 en ocho vistas es24px, mientras todo Idle alcanza32px. Se recorren los siete frames de Idle y los doce de Shoot en todas las variantes. Elegir1.95 sólo desde el primer frame habría subestimado la altura posterior.

[body-measurements.csv](body-measurements.csv) registra los111 cuerpos. [collisions-separate.csv](collisions-separate.csv) registra sus radios, diámetros y proyección de suelo por separado. Los candidatos heredan el radio del papel original sólo para esta escena; eso no constituye una aprobación de huella oficial de Clash Royale. No se cambió ningún radio ni se usó una silueta para deducirlo.

Estas decisiones son calibraciones internas de función y silueta. **No se estableció paridad exacta de píxeles de arte con Clash Royale.** Las referencias numéricas de arena y colocación no publican los bounds dibujados de cada carta; la comparación usa el catálogo y la grilla de Poké Arena, sin convertir una referencia de colisión en tamaño oficial de ilustración. Tampoco se usaron las alturas de Pokédex como objetivo de escala.

## Procedencia y repetición

[measurements.json](measurements.json) conserva el commit base, los módulos, el manifiesto y activos exactos identificados por SHA256. Los bytes de entrada se congelaron en memoria durante cada recorrido; ambos reportes indican `changedAfterFreeze=[]`. Los sprites nuevos ya estaban incorporados en `eb2de5d`; esta auditoría sólo los leyó, incluidos XML, PNG, marcadores y créditos presentes. No descargó ni regeneró ilustraciones o sprites.

Los guiones son:

```powershell
node scripts/qa-visual-scales-followup.mjs
node scripts/qa-bowler-scale-context.mjs
```

Usan el Playwright existente del checkout principal o `PLAYWRIGHT_MODULE`, y Edge o `PLAYWRIGHT_CHANNEL`. El servidor local se abre y se cierra en el mismo proceso. No instalan paquetes ni publican. Repetirlos con otro catálogo produce un nuevo corte: las decisiones manuales de este informe pertenecen a los hashes guardados, no a futuras estadísticas o assets.

No se volvió a validar combate, balance, interacciones, sonidos, red o rendimiento. La escena de Golem sólo deriva el cuerpo hijo real para inventariar su escala; no es una prueba de su mecánica de muerte. El integrador aplica las cuatro escalas aprobadas y revisa el árbol final por separado.

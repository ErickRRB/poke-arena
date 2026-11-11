# Balance y lore de las cartas

Revisión del 11 de noviembre de 2026. 86 cartas jugables. Se genera con `npm run balance:report` a partir del catálogo y las decisiones individuales de `dist/card-review.js`.

## Umbrales

| Referencia | Coste | Vida por cuerpo | Interacción |
| --- | --- | --- | --- |
| Diglett ×3 | 1 | 1 | Cualquier daño lo elimina; tres distracciones terrestres. |
| Horda Diglett ×9 | 3 | 1 | Rodea al objetivo único; cualquier hechizo de área limpia los cuerpos alcanzados. |
| Trío Ralts ×3 | 2 | 81 | Un tiro de torre o Impactrueno por cuerpo. |
| Gastly ×4 | 2 | 81 | Enjambre aéreo de un tiro; Tronco no lo alcanza. |
| Manada Poochyena ×4 | 3 | 180 | Dos tiros; Impactrueno deja 71 PV y Tronco los elimina. |
| Zubat ×3 | 2 | 180 | Variante aérea de dos tiros, con Chupavidas. |
| Treecko ×2 | 3 | 304 | Tres tiros por cuerpo; Bola de fuego lo elimina. |
| Torre lateral | — | 3000 | 109 de daño cada 0.8 s. |
| Impactrueno | 2 | — | 109 de daño, 30 a torres y 0,75 s de aturdimiento. |
| Tronco | 2 | — | 218 de daño terrestre, 55 a torres y empuje. |
| Bola de fuego | 4 | — | 400 de daño y 110 a torres. |

Los valores de las tablas son por cuerpo al aparecer. Los escudos propios y la armadura cuentan en los tiros; se excluyen curación, desgaste de estructuras y escudos de aliados. La rareza no aumenta estadísticas. Los apoyos ordinarios de 4–5 como Alakazam, Starmie, Mr. Mime, Espeon, Sceptile, Gardevoir, Crobat y Altaria mueren de Bola de fuego o quedan a uno o dos tiros. Los tanques y los atacantes físicos resistentes son excepciones deliberadas.

## Duelos comprobados

Simulación a 60 pasos/s, sin torres activas ni ayudas. Geodude está en (300, 540); los rivales empiezan a 35 unidades de distancia. Los grupos rodean su posición inicial. Se usan los ataques completos, estados y objetivos del motor.

| Rival de Geodude | Cuerpos | Duración (s) | Vida restante de Geodude | Rivales vivos |
| --- | --- | --- | --- | --- |
| Pikachu | 1 | 5.87 | 1014 | 0 |
| Psyduck | 1 | 14.18 | 721 | 0 |
| Alakazam | 1 | 3.95 | 1210 | 0 |
| Gengar | 1 | 5.57 | 950 | 0 |
| Feraligatr | 1 | 10.42 | 330 | 0 |
| Arcanine | 1 | 7.18 | 827 | 0 |
| Scizor | 1 | 8.8 | 540 | 0 |
| Sableye | 1 | 3.95 | 1207 | 0 |
| Sharpedo | 1 | 3.95 | 1190 | 0 |
| Espeon | 1 | 3.95 | 1255 | 0 |
| Machamp | 1 | 8.3 | 0 | 1 |
| Diglett | 9 | 7.92 | 0 | 4 |
| Manada Poochyena | 4 | 8.52 | 0 | 2 |

Geodude cuesta 3, golpea un solo objetivo terrestre y tiene 1450 PV. Gana los diez duelos ordinarios medidos, pero pierde contra Machamp y los dos enjambres indicados. No pretende vencer a toda carta de 4 en cualquier posición. Snorlax desplegado en (158, 340) destruye la torre lateral activa en 24.83 s y termina con 21 PV. Camina a 18, golpea cada 2 s y sigue ignorando tropas.

Estas simulaciones fijan interacciones reproducibles; las partidas entre personas siguen siendo necesarias para evaluar variedad de mazos y ventajas de posición.

## Revisión una por una

Daño por impacto; las ráfagas muestran cuántos impactos hay. Cadencia en segundos. “+ N tiros” significa Bola de fuego seguida por tiros de torre.

| Carta | Elixir | Cuerpos | PV | Daño | Cadencia | Tiros | Bola de fuego | Decisión y lore |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pikachu | 3 | 1 | 450 | 109 | 1.3 | 5 | + 1 tiro | ATK 55 supera a SpA 50: Chispa empieza a distancia de contacto. Conserva los saltos eléctricos y la interrupción. |
| Squirtle | 2 | 1 | 400 | 28 × 3 | 1.45 | 4 | Lo elimina | Tres burbujas conservan el ataque de agua. Sus 400 PV permiten eliminarlo con Bola de fuego. |
| Charmander | 3 | 1 | 360 | 81 | 1.5 | 4 | Lo elimina | Ascuas y quemadura limpian tiradores frágiles; el cuerpo pequeño necesita protección. |
| Snorlax | 5 | 1 | 3400 | 300 | 2 | 32 | + 28 tiros | Su volumen justifica 3400 PV y pasos lentos. Golpea una estructura cada 2 s, sin carga ni área. |
| Zubat | 2 | 3 | 180 | 40 | 1.1 | 2 | Lo elimina | Chupavidas corresponde al murciélago. Tres cuerpos de 180 PV resisten un tiro y necesitan cobertura. |
| Charizard | 5 | 1 | 1000 | 42 × 3 | 1.65 | 10 | + 6 tiros | Vuelo y tres llamaradas en cono definen un tanque aéreo contra grupos. |
| Impactrueno | 2 | 1 | — | 109 | — | — | — | Descarga de 2: iguala los 109 de la torre. Elimina grupos frágiles, pero no Poochyena ni Zubat. |
| Bola de fuego | 4 | 1 | — | 400 | — | — | — | 400 de daño fija el umbral de apoyos. Conserva daño reducido a torres. |
| Bulbasaur | 3 | 1 | 450 | 81 | 1.3 | 5 | + 1 tiro | Látigo cepa ralentiza un objetivo; no reemplaza a un atacante en área. |
| Gengar | 4 | 1 | 650 | 125 | 1.45 | 6 | + 3 tiros | SpA 130 supera a ATK 65: dispara Bola sombra a distancia. Conserva su teletransporte y el daño en área. |
| Machamp | 4 | 1 | 1150 | 65 × 4 | 1.45 | 11 | + 7 tiros | Los cuatro brazos producen cuatro impactos separados. Especialista contra tanques, vulnerable a grupos y aire. |
| Eevee | 2 | 1 | 300 | 90 | 0.95 | 3 | Lo elimina | Ataque rápido produce una carga de bajo coste con poca resistencia. |
| Onix | 5 | 1 | 1400 | 180 | 2.1 | 13 | + 10 tiros | ATK 45 supera a SpA 30: Cola férrea requiere acercarse a la estructura. Conserva la marcha lenta y la prioridad de edificios. |
| Blastoise | 4 | 1 | 1200 | 85 × 2 | 1.8 | 12 | + 8 tiros | Sus dos cañones se adaptan como bastión defensivo de duración limitada. |
| Vulpix | 3 | 1 | 280 | 42 × 2 | 1.45 | 3 | Lo elimina | Dos llamas pequeñas y quemadura distinguen al zorro del cono de Charizard. |
| Psyduck | 3 | 1 | 450 | 81 | 1.55 | 5 | + 1 tiro | Confusión interrumpe un objetivo. Bola de fuego deja 50 PV, un tiro. |
| Alakazam | 4 | 1 | 400 | 120 | 1.65 | 4 | Lo elimina | El psíquico frágil perfora una fila. Muere ante Bola de fuego. |
| Geodude | 3 | 1 | 1450 | 175 | 1.6 | 14 | + 10 tiros | Defensor de 3 resistente y de objetivo único. Se elimina el área para que los enjambres lo rodeen. |
| Magnemite | 3 | 1 | 400 | 81 | 1.8 | 4 | Lo elimina | Flota y paraliza con magnetismo. Bola de fuego lo elimina. |
| Scyther | 4 | 1 | 650 | 65 × 2 | 1.2 | 6 | + 3 tiros | Sus guadañas dan dos cortes sin área. Persigue objetivos de tierra y aire. |
| Lapras | 5 | 1 | 1500 | 109 | 1.75 | 14 | + 11 tiros | Su cuerpo grande y el hielo justifican el tanque lento que ralentiza. |
| Mewtwo | 6 | 1 | 950 | 180 | 2.2 | 9 | + 6 tiros | Poder psíquico de 6 con preparación larga y habilidad pagada. Se puede interrumpir. |
| Treecko | 3 | 2 | 304 | 81 | 1.2 | 3 | Lo elimina | Dos tiradores de 304 PV: tres tiros de torre o una Bola de fuego por cuerpo. |
| Golem | 8 | 1 | 3600 | 240 | 2.3 | 34 | + 30 tiros | Tanque de 8. La división se adapta con fragmentos débiles de roca con forma de Geodude. |
| Tronco | 2 | 1 | — | 218 | — | — | — | 218 de daño terrestre elimina a Poochyena. No toca a los voladores. |
| Diglett | 1 | 3 | 1 | 35 | 1.2 | 1 | Lo elimina | Tres Diglett terrestres pequeños usan Arañazo como distracción de bajo coste. ATK 55 supera a SpA 35; sus 10 PV base inspiran la fragilidad del grupo. |
| Horda Diglett | 3 | 9 | 1 | 35 | 1.2 | 1 | Lo elimina | Nueve Diglett rodean al rival terrestre con Arañazo. Comparten especie y ataque con el trío, con más cuerpos por despliegue. |
| Trío Ralts | 2 | 3 | 81 | 45 | 1.3 | 1 | Lo elimina | Tres Ralts usan Confusión a distancia: SpA 45 supera a ATK 25. Su ataque psíquico alcanza tierra y aire y no envenena. |
| Manada Poochyena | 3 | 4 | 180 | 75 | 1.3 | 2 | Lo elimina | Cuatro Poochyena avanzan como manada y atacan con Mordisco. ATK 55 supera a SpA 30 y define su combate cuerpo a cuerpo. |
| Venusaur | 5 | 1 | 1450 | 90 | 1.9 | 14 | + 10 tiros | Su tamaño y tipo planta/veneno justifican el tanque que deja zonas tóxicas. |
| Butterfree | 3 | 1 | 304 | 40 | 1.7 | 3 | Lo elimina | Paralizador usa polvo y alas en lugar de una esfera magnética. Ralentiza en área con poco daño. |
| Beedrill | 3 | 2 | 180 | 42 × 2 | 1.35 | 2 | Lo elimina | Dos abejas con doble aguijón. Cada cuerpo cruza el umbral de dos tiros. |
| Pidgeot | 4 | 1 | 720 | 109 | 1.55 | 7 | + 3 tiros | Una picada cargada encaja con su vuelo veloz. No tiene daño en área. |
| Ekans | 2 | 2 | 180 | 40 | 1.25 | 2 | Lo elimina | Dos serpientes envenenan por mordida. Resisten Impactrueno y caen con Tronco. |
| Sandshrew | 3 | 2 | 180 + 109 escudo | 65 | 1.4 | 3 | Lo elimina | Su piel dura se expresa con un escudo de 109 PV por cuerpo, separado de la vida. |
| Nidoqueen | 6 | 1 | 2000 | 109 | 1.8 | 19 | + 15 tiros | El papel de madre protectora sostiene la invocación limitada de Nidoran pequeños. |
| Nidoking | 5 | 1 | 1450 | 75 × 2 | 1.6 | 14 | + 10 tiros | Puño venenoso reemplaza la cría al morir: fuerza y veneno sin una invocación arbitraria. |
| Mankey | 2 | 3 | 109 | 42 | 1.2 | 1 | Lo elimina | Tres atacantes agresivos cargan, pero cada uno cae con un tiro. |
| Arcanine | 4 | 1 | 850 | 109 | 1.5 | 8 | + 5 tiros | Velocidad y fuego justifican una carga que se corta con aturdimiento. |
| Slowbro | 4 | 1 | 1130 + 350 escudo | 65 | 1.8 | 14 | + 10 tiros | La concha de Shellder se representa con escudo. Conserva el paso lento y Confusión. |
| Grimer | 2 | 1 | 610 | 45 | 1.4 | 6 | + 2 tiros | ATK 80 supera a SpA 40: Puño veneno golpea a corta distancia. Al caer deja un charco tóxico. |
| Cloyster | 4 | 1 | 865 + 230 escudo | 28 × 5 | 2.6 | 11 | + 7 tiros | La concha protege un bastión inmóvil con cinco pinchos por ráfaga. |
| Gastly | 2 | 4 | 81 | 35 | 1.3 | 1 | Lo elimina | SpA 100 supera a ATK 35: cuatro fantasmas usan Bola sombra a distancia y dejan niebla al caer. |
| Voltorb | 2 | 1 | 218 | 180 | 1.4 | 2 | Lo elimina | Autodestrucción castiga grupos. La preparación permite eliminarlo antes de explotar. |
| Electrode | 4 | 1 | 790 | 400 | 1.6 | 8 | + 4 tiros | Explosión amenaza estructuras con más potencia y preparación visible. |
| Exeggutor | 5 | 1 | 1250 | 150 | 2.1 | 12 | + 8 tiros | Bomba huevo lanza proyectiles explosivos. Se retiran los Exeggcute que se suicidaban. |
| Koffing | 3 | 1 | 400 | 50 | 1.9 | 4 | Lo elimina | ATK 65 supera a SpA 60: Placaje requiere contacto. Conserva el vuelo y el gas venenoso del impacto. |
| Chansey | 3 | 1 | 618 | 18 | 1.8 | 6 | + 2 tiros | Cura un aliado y lanza huevos con poco daño. Bola de fuego más dos tiros elimina al apoyo. |
| Kangaskhan | 5 | 1 | 1450 | 109 | 1.6 | 14 | + 10 tiros | La madre pelea junto a su cría. Cada cuerpo tiene estadísticas propias. |
| Starmie | 4 | 1 | 450 | 42 × 3 | 2.15 | 5 | + 1 tiro | Tres rayos perforantes conservan su ataque especial. Bola de fuego la deja a un tiro. |
| Mr. Mime | 4 | 1 | 400 + 109 escudo | 65 | 1.5 | 5 | + 1 tiro | Barrera protege al grupo. Sus 400 PV y 109 de escudo equivalen a Bola de fuego más un tiro. |
| Gyarados | 6 | 1 | 1800 | 150 | 1.9 | 17 | + 13 tiros | La enorme serpiente voladora tiene resistencia y una mordida de área lenta. |
| Ditto | 3 | 1 | 508 | 35 | 1.4 | 5 | + 1 tiro | Transformación copia un ataque al 85 %, conservando su cuerpo frágil y sin habilidades activas. |
| Articuno | 6 | 1 | 1250 | 90 | 1.8 | 12 | + 8 tiros | El ave de hielo ralentiza y reserva la congelación fuerte para una habilidad de pago. |
| Zapdos | 6 | 1 | 1090 | 109 | 1.8 | 10 | + 7 tiros | Los rayos encadenados paralizan. Tiene menos resistencia que otros legendarios. |
| Moltres | 6 | 1 | 1170 | 109 | 1.8 | 11 | + 8 tiros | Fuego y recuperación puntual corresponden al ave legendaria. Renacer no revive unidades. |
| Dragonite | 5 | 1 | 1210 | 50 × 3 | 1.9 | 12 | + 8 tiros | ATK 134 supera a SpA 100: se acerca y encadena tres golpes de Garra dragón. Conserva el vuelo. |
| Meganium | 5 | 1 | 1640 | 65 | 1.7 | 16 | + 12 tiros | El aroma reparador sostiene la curación en grupo y el paso lento. |
| Typhlosion | 5 | 1 | 1130 | 150 | 1.8 | 11 | + 7 tiros | SpA 109 supera a ATK 84: Erupción se lanza a distancia, explota y quema en área. |
| Feraligatr | 4 | 1 | 1210 | 160 | 1.55 | 12 | + 8 tiros | Triturar hace daño físico fuerte. Se quita la curación por mordida. |
| Crobat | 4 | 1 | 610 | 50 × 2 | 1.55 | 6 | + 2 tiros | Chupavidas y dos mordidas corresponden a su evolución. Paga su velocidad con poca vida. |
| Ampharos | 5 | 1 | 1130 | 90 | 1.65 | 11 | + 7 tiros | Su papel de faro se adapta como defensa eléctrica fija de duración limitada. |
| Espeon | 4 | 1 | 450 | 65 | 1.1 | 5 | + 1 tiro | Rayo psíquico rápido y perforante. Bola de fuego lo deja a un tiro. |
| Umbreon | 4 | 1 | 1360 | 65 | 1.7 | 13 | + 9 tiros | ATK 65 supera a SpA 60: Mordisco requiere contacto. El veneno es una adaptación de su sudor tóxico. |
| Wobbuffet | 4 | 1 | 1900 | 0 | 2 | 18 | + 14 tiros | Contraataque responde al daño directo recibido. No inicia puñetazos ni devuelve daño continuo. |
| Steelix | 6 | 1 | 2700 | 180 | 2.2 | 30 | + 26 tiros | La armadura de acero justifica reducción de daño y asedio lento. |
| Scizor | 4 | 1 | 720 + 220 escudo | 65 × 2 | 1.3 | 9 | + 5 tiros | Dos golpes de pinza y escudo lo distinguen de Scyther sin otorgarle vuelo. |
| Skarmory | 4 | 1 | 560 + 420 escudo | 81 | 1.5 | 9 | + 6 tiros | El cuerpo metálico sostiene el escudo aéreo y los ataques de corte. |
| Blissey | 5 | 1 | 1405 | 25 | 2 | 13 | + 10 tiros | La sanadora protege al grupo y lanza huevos. Su daño sigue bajo y la curación tiene pausas. |
| Lugia | 7 | 1 | 2050 | 109 | 1.9 | 19 | + 16 tiros | Guardián aéreo resistente que paga el escudo de grupo como habilidad. |
| Ho-Oh | 7 | 1 | 1680 | 109 | 1.9 | 16 | + 12 tiros | ATK 130 supera a SpA 110: Pájaro osado ataca con contacto. Conserva la curación y la habilidad Fuego sagrado. |
| Sceptile | 4 | 1 | 508 | 55 × 2 | 1.4 | 5 | + 1 tiro | Dos hojas rápidas a distancia. Bola de fuego deja 108 PV, un tiro de torre. |
| Blaziken | 4 | 1 | 830 | 55 × 3 | 1.7 | 8 | + 4 tiros | Tres golpes de fuego a corta distancia corresponden al luchador. |
| Swampert | 5 | 1 | 1885 | 130 | 1.9 | 18 | + 14 tiros | El cuerpo pesado y el barro sostienen el tanque que ralentiza grupos terrestres. |
| Gardevoir | 5 | 1 | 509 | 125 | 2.3 | 5 | + 1 tiro | Zona psíquica usa un efecto propio sin nubes de veneno. Bola de fuego deja 109 PV. |
| Sableye | 3 | 1 | 508 | 81 | 1.25 | 5 | + 1 tiro | Amago y garras permiten hostigar. Se quita el robo de vida sin una acción de absorción. |
| Aggron | 6 | 1 | 2335 | 150 | 1.9 | 29 | + 25 tiros | Armadura y represalia leve definen un tanque caro. El daño continuo no provoca reflejo. |
| Sharpedo | 3 | 1 | 508 | 130 | 1.65 | 5 | + 1 tiro | Una mordida cargada muy fuerte compensa los 508 PV: Bola de fuego más un tiro. |
| Flygon | 5 | 1 | 970 | 90 | 1.9 | 9 | + 6 tiros | ATK 100 supera a SpA 80: Garra dragón requiere contacto y levanta arena que ralentiza. Conserva el vuelo. |
| Altaria | 4 | 1 | 618 | 55 | 1.7 | 6 | + 2 tiros | La voz se representa con ondas musicales. Su canto cura y limpia estados. |
| Absol | 4 | 1 | 650 | 109 | 1.4 | 6 | + 3 tiros | Tajo umbrío adapta sus críticos a enemigos heridos. Se conserva su papel de advertir desastres. |
| Salamence | 6 | 1 | 1480 | 50 × 3 | 2.5 | 14 | + 10 tiros | ATK 135 supera a SpA 110: tres zarpazos con Garra dragón reemplazan el cono de fuego. Conserva vuelo y furia. |
| Metagross | 6 | 1 | 2050 + 250 escudo | 175 | 2.1 | 22 | + 18 tiros | Su masa metálica sostiene escudo y golpes terrestres lentos con interrupción. |
| Kyogre | 8 | 1 | 2460 | 81 × 2 | 2.25 | 23 | + 19 tiros | Dos oleadas y Marea expresan su dominio del agua. El coste de 8 incluye resistencia. |
| Groudon | 8 | 1 | 3200 | 260 | 2.4 | 30 | + 26 tiros | Asedio pesado y Terremoto terrestre, sin alcanzar voladores. |
| Rayquaza | 8 | 1 | 2090 | 175 | 2.1 | 20 | + 16 tiros | Rayo de gran alcance y Ascenso expresan presión aérea por un coste alto. |

## Animaciones y ventanas de ataque

La preparación es compartida por cliente, CPU y servidor; cargar una hoja de sprites no modifica cuándo se inflige daño. La animación original se ajusta para que su fotograma de impacto coincida con el primer lanzamiento. Las ráfagas conservan impactos separados y la recuperación termina después del último. Aturdir antes de lanzar cancela el golpe; un proyectil ya lanzado sigue viajando.

Butterfree tiene polvo, Grimer/Koffing/Umbreon usan veneno, Exeggutor lanza huevos en arco, Typhlosion muestra fuego circular y Altaria ondas de voz. Gastly usa Lengüetazo en lugar de garras; Chansey y Blissey lanzan huevos. Los estados de veneno se dibujan morados y las quemaduras naranjas. La zona de Gardevoir tiene órbitas psíquicas. Wobbuffet muestra una respuesta azul al recibir daño directo; permanece sin ataque proactivo. Los escudos se dibujan alrededor del cuerpo y la curación produce un pulso verde. Los enjambres usan sprites y barras proporcionados a la cantidad de cuerpos. Movimiento reducido conserva la lectura de daño y estados.

| Carta | Ataque | Hoja original | Efecto | Preparación (s) | Impactos | Separación (s) | Animación total (s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pikachu | Chispa | Attack | lightning | 0.26 | 1 | — | 0.65 |
| Squirtle | Burbuja | Shoot | bubble | 0.3 | 3 | 0.14 | 0.8 |
| Charmander | Ascuas | Attack | ember | 0.26 | 1 | — | 0.65 |
| Snorlax | Golpe pesado | Stomp | slam | 0.55 | 1 | — | 1.1 |
| Zubat | Chupavidas | Attack | bite | 0.2 | 1 | — | 0.5 |
| Charizard | Lanzallamas | Shoot | flame | 0.3 | 3 | 0.14 | 0.95 |
| Bulbasaur | Látigo cepa | Shoot | vine | 0.27999999999999997 | 1 | — | 0.7 |
| Gengar | Bola sombra | Shoot | shadow | 0.26 | 1 | — | 0.65 |
| Machamp | Puño dinámico | Double | punch | 0.3 | 4 | 0.13 | 0.85 |
| Eevee | Ataque rápido | Attack | dash | 0.22000000000000003 | 1 | — | 0.55 |
| Onix | Cola férrea | Attack | slam | 0.3 | 1 | — | 0.95 |
| Blastoise | Doble hidrobomba | Shoot | hydro | 0.3 | 2 | 0.16 | 0.8 |
| Vulpix | Pirotecnia | Shoot | ember | 0.3 | 2 | 0.18 | 0.85 |
| Psyduck | Confusión | Shoot | confusion | 0.3 | 1 | — | 0.8 |
| Alakazam | Psíquico | Shoot | psychic | 0.3 | 1 | — | 0.9 |
| Geodude | Puño roca | Attack | slam | 0.3 | 1 | — | 0.85 |
| Magnemite | Bomba imán | Shoot | magnet | 0.3 | 1 | — | 0.8 |
| Scyther | Doble corte | Double | slash | 0.3 | 2 | 0.18 | 0.75 |
| Lapras | Rayo hielo | Shoot | ice | 0.3 | 1 | — | 0.95 |
| Mewtwo | Esfera aural | Shoot | aura | 0.65 | 1 | — | 1.2 |
| Treecko | Semilladora | Shoot | leaf | 0.27999999999999997 | 1 | — | 0.7 |
| Golem | Demolición | Attack | slam | 0.5 | 1 | — | 1 |
| Diglett | Arañazo | Attack | slash | 0.3 | 1 | — | 0.75 |
| Horda Diglett | Arañazo | Attack | slash | 0.3 | 1 | — | 0.75 |
| Trío Ralts | Confusión | Shoot | confusion | 0.3 | 1 | — | 0.75 |
| Manada Poochyena | Mordisco | Attack | bite | 0.3 | 1 | — | 0.75 |
| Venusaur | Bomba germen | Shoot | leaf | 0.3 | 1 | — | 0.75 |
| Butterfree | Paralizador | Shoot | powder | 0.3 | 1 | — | 0.75 |
| Beedrill | Doble ataque | Attack | slash | 0.3 | 2 | 0.16 | 0.75 |
| Pidgeot | Ataque ala | Attack | dash | 0.3 | 1 | — | 0.75 |
| Ekans | Colmillo venenoso | Attack | bite | 0.3 | 1 | — | 0.75 |
| Sandshrew | Arañazo | Attack | slash | 0.3 | 1 | — | 0.75 |
| Nidoqueen | Golpe cuerpo | Attack | slam | 0.3 | 1 | — | 0.75 |
| Nidoking | Puño venenoso | Attack | punch | 0.3 | 2 | 0.2 | 0.75 |
| Mankey | Placaje furioso | Attack | dash | 0.3 | 1 | — | 0.75 |
| Arcanine | Carga ígnea | Attack | dash | 0.3 | 1 | — | 0.75 |
| Slowbro | Confusión | Shoot | confusion | 0.3 | 1 | — | 0.75 |
| Grimer | Puño veneno | Attack | punch | 0.3 | 1 | — | 0.75 |
| Cloyster | Carámbano | Shoot | ice | 0.3 | 5 | 0.1 | 0.86 |
| Gastly | Bola sombra | Shoot | shadow | 0.3 | 1 | — | 0.75 |
| Voltorb | Autodestrucción | Attack | slam | 0.3 | 1 | — | 0.75 |
| Electrode | Explosión | Attack | slam | 0.5 | 1 | — | 0.75 |
| Exeggutor | Bomba huevo | Shoot | egg | 0.3 | 1 | — | 0.75 |
| Koffing | Placaje | Attack | poison | 0.3 | 1 | — | 0.75 |
| Chansey | Bomba huevo | Shoot | egg | 0.3 | 1 | — | 0.75 |
| Kangaskhan | Golpe cuerpo | Attack | punch | 0.3 | 1 | — | 0.75 |
| Starmie | Psíquico | Shoot | psychic | 0.3 | 3 | 0.18 | 0.82 |
| Mr. Mime | Confusión y barrera | Shoot | confusion | 0.3 | 1 | — | 0.75 |
| Gyarados | Triturar | Attack | bite | 0.3 | 1 | — | 0.75 |
| Ditto | Transformación | Attack | shadow | 0.3 | 1 | — | 0.75 |
| Articuno | Rayo hielo | Shoot | ice | 0.3 | 1 | — | 0.75 |
| Zapdos | Rayo | Shoot | lightning | 0.3 | 1 | — | 0.75 |
| Moltres | Ascuas | Shoot | ember | 0.3 | 1 | — | 0.75 |
| Dragonite | Garra dragón | Attack | slash | 0.3 | 3 | 0.17 | 0.8 |
| Meganium | Látigo cepa | Attack | vine | 0.3 | 1 | — | 0.75 |
| Typhlosion | Erupción | Shoot | ember | 0.3 | 1 | — | 0.75 |
| Feraligatr | Triturar | Attack | bite | 0.3 | 1 | — | 0.75 |
| Crobat | Chupavidas | Attack | bite | 0.3 | 2 | 0.16 | 0.75 |
| Ampharos | Rayo | Shoot | lightning | 0.3 | 1 | — | 0.75 |
| Espeon | Psíquico | Shoot | psychic | 0.3 | 1 | — | 0.75 |
| Umbreon | Mordisco | Attack | bite | 0.3 | 1 | — | 0.75 |
| Wobbuffet | Contraataque | Respuesta al daño | punch | — | 1 | — | 0.75 |
| Steelix | Cola férrea | Attack | slam | 0.3 | 1 | — | 0.75 |
| Scizor | Tijera X | Attack | slash | 0.3 | 2 | 0.15 | 0.75 |
| Skarmory | Ala de acero | Attack | slash | 0.3 | 1 | — | 0.75 |
| Blissey | Bomba huevo | Shoot | egg | 0.3 | 1 | — | 0.75 |
| Lugia | Hidrobomba | Shoot | hydro | 0.3 | 1 | — | 0.75 |
| Ho-Oh | Pájaro osado | Attack | dash | 0.3 | 1 | — | 0.75 |
| Sceptile | Hojas gemelas | Shoot | leaf | 0.3 | 2 | 0.12 | 0.75 |
| Blaziken | Puño fuego | Attack | punch | 0.3 | 3 | 0.13 | 0.75 |
| Swampert | Golpe de barro | Attack | slam | 0.3 | 1 | — | 0.75 |
| Gardevoir | Psíquico | Shoot | aura | 0.6 | 1 | — | 1.1 |
| Sableye | Amago | Attack | shadow | 0.3 | 1 | — | 0.75 |
| Aggron | Cuerpo pesado | Attack | slam | 0.3 | 1 | — | 0.75 |
| Sharpedo | Triturar | Attack | bite | 0.3 | 1 | — | 0.75 |
| Flygon | Garra dragón | Attack | slash | 0.3 | 1 | — | 0.75 |
| Altaria | Voz cautivadora | Shoot | song | 0.3 | 1 | — | 0.75 |
| Absol | Tajo umbrío | Attack | slash | 0.3 | 1 | — | 0.75 |
| Salamence | Garra dragón | Attack | slash | 0.3 | 3 | 0.13 | 0.75 |
| Metagross | Puño meteoro | Attack | slam | 0.3 | 1 | — | 0.75 |
| Kyogre | Doble hidrobomba | Shoot | hydro | 0.3 | 2 | 0.2 | 0.75 |
| Groudon | Pisotón | Attack | slam | 0.55 | 1 | — | 0.75 |
| Rayquaza | Pulso dragón | Shoot | psychic | 0.3 | 1 | — | 0.75 |

## Invocaciones

Nidoqueen conserva hasta tres Nidoran hembra por madre, con 81 PV y vida limitada. Nidoking deja de crear crías al morir. Exeggutor deja de invocar Exeggcute explosivos: Bomba huevo es un proyectil. Kangaskhan conserva una cría de 218 PV. Los fragmentos de Golem tienen 900 PV, 52 de daño, objetivo de estructuras y no son Geodude completos. Exeggcute queda como recurso interno no seleccionable; no se utiliza como kamikaze.

## Referencias de lore y adaptaciones

La [Pokédex oficial de Snorlax](https://ph.portal-pokemon.com/pokedex/0143/) describe su cuerpo de 460 kg y su costumbre de comer y dormir; el rol de tanque es una adaptación de esos rasgos. La [entrada oficial de Wobbuffet](https://ph.portal-pokemon.com/pokedex/0202/) describe su respuesta al ser atacado, usada para reemplazar los puñetazos por contraataque. Los [datos base de PokéAPI](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_stats.csv) definen la regla ATK > SpA para cuerpo a cuerpo y SpA > ATK para rango. Los empates conservan el ataque previo; las estructuras, los autodestructivos y los defensores pasivos conservan su mecánica. Diglett tiene 10 PV base y es terrestre; los grupos de tres o nueve con 1 PV son una adaptación de su fragilidad para este juego. El [tipo y las habilidades de Umbreon](https://ph.portal-pokemon.com/pokedex/0197/) sirven como referencia de especie; Tóxico se usa como adaptación de control sostenido. Las estructuras Pokémon, los escudos, las habilidades pagadas y los fragmentos de Golem también son adaptaciones al combate de torres.

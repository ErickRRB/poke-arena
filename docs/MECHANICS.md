# Mecánicas y roles

Revisión del 11 de noviembre de 2026. La referencia de estadísticas es el nivel 11 de Clash Royale; las variantes de Pokémon ajustan cantidad, movilidad, daño continuo, curación y habilidades. Los costes se declaran por carta. La revisión completa de las 86 cartas y sus valores está en [ROLE-REVIEW.json](ROLE-REVIEW.json).

## Despliegue y tamaño

Las tropas y estructuras aparecen en centros de celdas de 24 unidades. La grilla se centra de forma simétrica en la arena, de modo que invertir la perspectiva de una partida online conserva la misma celda. Los grupos reservan celdas distintas; la vista previa y el despliegue comparten el cálculo. Cerca de torres, bordes o puentes se elige la celda legal más cercana. Arrastrar a territorio rival lejano cancela sin gastar elixir. Las flechas avanzan una celda.

El movimiento posterior conserva trayectorias continuas y cruces por los puentes. Los hechizos de área permiten elegir su centro libremente; el origen de Tronco sí encaja en una celda propia. Los sprites se calibran por su silueta visible, con sus animaciones y anclas originales. Zubat se reduce de escala 2,05 a 1,44; Snorlax pasa de 2 a 2,4. El resto se normaliza por especie para conservar diferencias entre grupos pequeños, luchadores, tanques y criaturas grandes.

## Hechizos

Bola de fuego sale desde la torre del rey de quien la usa y viaja en arco hacia una posición fija. Su tiempo es 0,15 s de lanzamiento más la distancia dividida por 420 unidades/s. El daño se resuelve al llegar: una tropa puede salir del área durante el viaje. La trayectoria, el tiempo y el impacto se conservan en los snapshots online.

Tronco sale desde la celda elegida en el lado propio y avanza 10,1 casillas en línea recta, a 205 unidades/s. Su recorrido sigue igual aunque no haya enemigos, atraviesa los cuerpos alcanzados, golpea una sola vez a cada objetivo y no cambia su destino para perseguirlos. La CPU comprueba si su objetivo está dentro del recorrido antes de jugarlo. Solo la fila de despliegue más adelantada alcanza una torre de princesa. Esta relación entre colocación y alcance sigue el criterio explicado por [Supercell para Tronco](https://supercell.com/en/games/clashroyale/blog/release-notes/season-14-balance-changes/).

Impactrueno aplica daño y aturdimiento en una zona. Los hechizos reducen su daño contra torres: se separa explícitamente del daño contra tropas.

## Torres y escudos

La torre del rey empieza inactiva. Se activa al perder vida por un ataque o al caer una torre de princesa de su equipo. La proximidad de enemigos, el daño cero, un efecto de estado o la destrucción de un Blastoise no la activan. El estado también se conserva al reconectar o invertir la perspectiva.

Los escudos absorben el golpe que los rompe sin trasladar el exceso a la vida. Los golpes posteriores ya dañan el cuerpo. Cada impacto de una ráfaga se resuelve por separado, por lo que Machamp y los dos rayos de Pikachu interactúan de manera distinta con un escudo.

Los aturdimientos interrumpen ataques pendientes y hacen volver a seleccionar un objetivo válido. Los proyectiles ya lanzados siguen viajando; los atacantes de estructuras mantienen su restricción. Se conserva la distinción de objetivos descrita por [Supercell al explicar el aturdimiento](https://supercell.com/en/games/clashroyale/blog/release-notes/balance-changes-coming-2/).

## Roles y Pokémon

Pikachu adopta el rol de [Mago eléctrico](https://royaleapi.com/card/electro-wizard): cuesta 4, tiene 714 PV, lanza dos rayos de 115 cada 1,8 s y aturde 0,5 s. Con dos objetivos reparte los rayos; con uno concentra ambos. Su entrada causa 192 de daño en área y reinicia ataques. Esta es una excepción intencional a la regla general ATK/SpA solicitada antes: el rol eléctrico tiene prioridad.

Treecko es un dúo de arqueros de 3; Snorlax representa un tanque de 5 que ignora tropas; Machamp concentra daño contra tanques por 4; Geodude es un defensor de 3. Gardevoir usa energía psíquica de área por 5 y Slowbro usa Rayo hielo, ralentización y una onda de entrada por 3.

Las mecánicas propias conservan su identidad: Chupavidas cura a Zubat; Gengar se teletransporta; Ditto copia ataques; Wobbuffet responde al daño; Chansey y Blissey curan; los dragones, venenos, cargas y ataques de agua usan sus efectos específicos. Los legendarios conservan sus habilidades pagadas una vez por despliegue. Los grupos de tres Zubat, nueve Diglett y dos Sandshrew son adaptaciones de este juego.

## Controles y mazo del dispositivo

Las habilidades viven en una capa absoluta sobre el borde inferior de la arena, encima de las cartas. Mostrar una, varias, habilitarlas o usarlas no crea filas en la consola ni altera los rectángulos del tablero, la mano y el elixir. Las acciones numerosas se desplazan horizontalmente dentro de la capa; los espacios sin controles dejan pasar los toques al tablero. La misma regla para controles futuros está en `AGENTS.md`.

El mazo se guarda al cambiar una carta y se restaura en el mismo orden al volver a entrar. Se mantiene una copia local en cookie cuando el almacenamiento del navegador falla. Las migraciones conservan cartas válidas, sustituyen claves antiguas y mantienen mazos incompletos; solo el botón explícito de restablecer recupera el mazo inicial.

## Verificación

Las pruebas cubren celdas y formaciones, simetría, cancelación sin gasto, recorrido de Tronco desde distintos orígenes, su límite contra torres, decisiones de la CPU, tiempos de vuelo, esquiva del área de impacto, activación del rey, escudos, descarga de entrada y reparto de rayos. Las pruebas de combate y partidas completas comprueban estados finitos y resultados. Las capturas comprueban cuatro tamaños de pantalla. Estas verificaciones no establecen balance competitivo.

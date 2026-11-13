# Simulación de balance

Catálogo de 105 cartas revisado el 13 de noviembre de 2026. Los escenarios ejecutan el mismo motor que el navegador y el servidor autoritativo.

## Referencia de nivel 11

[CRTool](https://crtool.app/en/units/) publica tablas extraídas de la versión 16.635.1, actualizadas el 9 de noviembre de 2026. Se conservaron 127 cartas, 125 con tablas de nivel 11. Mirror y Clone heredan estadísticas. La referencia es de la comunidad y sirve para comparar coste, supervivencia y función. Los Pokémon tienen mecánicas propias.

Cada carta de Poké Arena tiene una referencia y una decisión en [balance-review.json](balance-review.json). Ese archivo incluye las estadísticas de referencia y el resultado del escenario correspondiente. Las analogías son aproximadas.

## Protocolo

- Semilla 120112, paso de 1/30 s, despliegues sin restricción de elixir y CPU desactivada.
- 315 bancos de daño contra tierra, aire y torre, con 25 s por prueba. El DPS sostenido se mide después de los primeros 5 s.
- 105 formaciones enemigas de nueve cuerpos para medir bajas por área.
- Duelos con coste igual o adyacente, dos distancias y ambos equipos. La tabla separa los duelos de igual coste en los que ambos rivales pueden atacarse.
- Habilidades de las tres aves con su gasto adicional registrado. Las pruebas de equipo registran curación y coste total.
- Auditoría de las 105 cartas por función: presión sobre torres activas, respuesta de Pikachu, Magnemite y Blastoise, defensa de estructuras, refuerzos y hechizos contra cuerpos de 81 PV.
- Seis combinaciones adicionales con dos distancias y ambos lados para contrastar contadores aéreos, curación y escudos.

Escenarios generales: 6.588 antes y 7.152 después. El total cambia porque tres cartas pasan de seis a cinco de elixir y aumenta su conjunto de rivales. Las tasas globales de ambos catálogos tienen denominadores distintos. Los valores aislados no representan un porcentaje de victorias de jugadores.

## Ajustes

| Carta | Elixir | PV | Daño por impacto | Intervalo | Velocidad |
| --- | ---: | ---: | ---: | ---: | ---: |
| Onix | 5 → 4 | 1400 → 1950 | 180 → 240 | 2,1 → 1,8 | 18 → 30 |
| Blastoise | 4 → 4 | 1200 → 1400 | 85 → 85 | 1,8 → 1,8 | 0 → 26 |
| Articuno | 6 → 5 | 1400 → 1400 | 135 → 145 | 1,8 → 1,8 | 26 → 26 |
| Zapdos | 6 → 5 | 1090 → 1200 | 109 → 150 | 1,8 → 1,8 | 26 → 26 |
| Moltres | 6 → 5 | 1170 → 1350 | 135 → 165 | 1,8 → 1,8 | 26 → 26 |
| Dragonite | 5 → 5 | 2000 → 1600 | 85 → 85 | 1,9 → 1,9 | 26 → 26 |
| Gardevoir | 5 → 5 | 720 → 780 | 230 → 280 | 1,8 → 1,6 | 26 → 26 |
| Celebi | 4 → 4 | 950 → 1350 | 220 → 260 | 1,8 → 1,8 | 32 → 40 |

Celebi pasa de 440 a 1.040 de daño a una torre indefensa. Onix pasa de 180 a 1.200. Pikachu detiene a ambos sin permitir un impacto sobre la torre en el despliegue defensivo evaluado. Dragonite conserva su combo y pierde vida para reducir su dominio en los duelos aéreos de igual coste.

Lapras conserva 160 por golpe y ralentización. Los apoyos se evalúan por su aporte en equipo. Las cartas de daño único, área, invocación y presión a torre conservan funciones distintas.

Remolino conserva radio 84, equivalente a 3,5 casillas de esta arena, y 2,5 s de duración. Tornado de Clash Royale muestra 5,5 casillas y 1 s. Las arenas tienen escalas distintas. La animación de Remolino se encuadra sobre su radio real. La prueba de exposición completa elimina a Diglett y Shuppet, tanto activos como recién desplegados.

## Revisión por carta

El DPS directo incluye la ráfaga completa por cuerpo. El medido suma estados y refuerzos. Un cero de un apoyo o un hechizo se interpreta con su escenario específico.

| Carta | Rol | Elixir | PV | DPS directo | DPS medido | Referencia nivel 11 | Decisión |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Pikachu | Control · antiaéreo | 4 | 714 | 127,78 | 126,5 | [Electro Wizard](https://crtool.app/en/units/electro-wizard/) | Conservar |
| Squirtle | Tirador · antiaéreo | 2 | 400 | 57,93 | 58,8 | [Spear Goblins](https://crtool.app/en/units/spear-goblins/) | Conservar |
| Charmander | Tirador · área | 3 | 440 | 90 | 100,35 | [Firecracker](https://crtool.app/en/units/firecracker/) | Conservar |
| Snorlax | Win condition · tanque | 5 | 4091 | 169,33 | 165,1 | [Giant](https://crtool.app/en/units/giant/) | Conservar |
| Zubat | Enjambre · aéreo | 2 | 180 | 50 | 146,25 | [Bats](https://crtool.app/en/units/bats/) | Conservar |
| Charizard | Mini tanque · aéreo | 5 | 1526 | 120 | 118,8 | [Baby Dragon](https://crtool.app/en/units/baby-dragon/) | Conservar |
| Impactrueno | Hechizo · aturde | 2 | — | — | 0 | [Zap](https://crtool.app/en/units/zap/) | Conservar |
| Bomba ígnea | Hechizo · área | 4 | — | — | 0 | [Fireball](https://crtool.app/en/units/fireball/) | Conservar |
| Bulbasaur | Tirador · control | 2 | 400 | 65,38 | 63,75 | [Ice Wizard](https://crtool.app/en/units/ice-wizard/) | Conservar |
| Gengar | Tirador · área | 4 | 650 | 86,21 | 87,5 | [Royal Ghost](https://crtool.app/en/units/royal-ghost/) | Conservar |
| Machamp | Antitanques · terrestre | 4 | 1361 | 400 | 396 | [Mini P.E.K.K.A](https://crtool.app/en/units/mini-pekka/) | Conservar |
| Eevee | Ciclo · presión | 2 | 300 | 94,74 | 94,5 | [Battle Ram](https://crtool.app/en/units/battle-ram/) | Conservar |
| Onix | Win condition · terrestre | 4 | 1950 | 133,33 | 132 | [Hog Rider](https://crtool.app/en/units/hog-rider/) | Ajustar |
| Blastoise | Mini tanque · antiaéreo | 4 | 1400 | 94,44 | 93,5 | [Musketeer](https://crtool.app/en/units/musketeer/) | Ajustar |
| Vulpix | Tirador · antiaéreo | 3 | 440 | 107,14 | 117,4 | [Firecracker](https://crtool.app/en/units/firecracker/) | Conservar |
| Psyduck | Tirador · control | 3 | 560 | 78,57 | 82,5 | [Ice Wizard](https://crtool.app/en/units/ice-wizard/) | Conservar |
| Alakazam | Tirador · área | 4 | 590 | 120,91 | 119,7 | [Magic Archer](https://crtool.app/en/units/magic-archer/) | Conservar |
| Geodude | Mini tanque · terrestre | 3 | 1766 | 168,33 | 161,6 | [Knight](https://crtool.app/en/units/knight/) | Conservar |
| Magnemite | Volador · control | 3 | 400 | 45 | 44,55 | [Zappies](https://crtool.app/en/units/zappies/) | Conservar |
| Scyther | Volador · antiaéreo | 4 | 650 | 108,33 | 110,5 | [Mega Minion](https://crtool.app/en/units/mega-minion/) | Conservar |
| Lapras | Mini tanque · control | 5 | 1500 | 91,43 | 88 | [Ice Wizard](https://crtool.app/en/units/ice-wizard/) | Conservar |
| Mewtwo | Tirador · área | 6 | 1452 | 157,14 | 154 | [Sparky](https://crtool.app/en/units/sparky/) | Conservar |
| Treecko | Tiradores · dúo | 3 | 304 | 124,44 | 235,2 | [Archers](https://crtool.app/en/units/archers/) | Conservar |
| Golem | Win condition · tanque | 8 | 5120 | 124,8 | 124,8 | [Golem](https://crtool.app/en/units/golem/) | Conservar |
| Mazazo | Hechizo · empuje | 2 | — | — | 0 | [The Log](https://crtool.app/en/units/the-log/) | Conservar |
| Diglett | Ciclo · distracción | 1 | 81 | 81 | 238,95 | [Skeletons](https://crtool.app/en/units/skeletons/) | Conservar |
| Horda Diglett | Enjambre · terrestre | 3 | 81 | 81 | 684,45 | [Skeleton Army](https://crtool.app/en/units/skeleton-army/) | Conservar |
| Trío Ralts | Enjambre · antiaéreo | 2 | 133 | 47,65 | 145,8 | [Spear Goblins](https://crtool.app/en/units/spear-goblins/) | Conservar |
| Manada Poochyena | Enjambre · terrestre | 2 | 202 | 109,09 | 414 | [Goblins](https://crtool.app/en/units/goblins/) | Conservar |
| Venusaur | Mini tanque · área | 5 | 1900 | 73,68 | 88 | [Bowler](https://crtool.app/en/units/bowler/) | Conservar |
| Butterfree | Volador · control | 3 | 440 | 45 | 46,8 | [Ice Wizard](https://crtool.app/en/units/ice-wizard/) | Conservar |
| Beedrill | Enjambre · aéreo | 3 | 260 | 130,77 | 255 | [Minions](https://crtool.app/en/units/minions/) | Conservar |
| Pidgeot | Volador · antiaéreo | 4 | 1052 | 126,92 | 123,75 | [Mega Minion](https://crtool.app/en/units/mega-minion/) | Conservar |
| Ekans | Enjambre · terrestre | 2 | 250 | 50 | 104,1 | [Goblins](https://crtool.app/en/units/goblins/) | Conservar |
| Sandshrew | Enjambre · terrestre | 3 | 220 | 110 | 217,8 | [Guards](https://crtool.app/en/units/guards/) | Conservar |
| Nidoqueen | Tanque · invocadora | 6 | 2800 | 103,13 | 144,6 | [Witch](https://crtool.app/en/units/witch/) | Conservar |
| Nidoking | Antitanques · terrestre | 5 | 2200 | 187,5 | 192,5 | [Valkyrie](https://crtool.app/en/units/valkyrie/) | Conservar |
| Mankey | Enjambre · terrestre | 2 | 150 | 66,67 | 204 | [Goblins](https://crtool.app/en/units/goblins/) | Conservar |
| Arcanine | Luchador · terrestre | 4 | 1400 | 157,14 | 163,1 | [Prince](https://crtool.app/en/units/prince/) | Conservar |
| Slowbro | Tirador · control | 3 | 688 | 52,94 | 54 | [Ice Wizard](https://crtool.app/en/units/ice-wizard/) | Conservar |
| Grimer | Mini tanque · zona | 2 | 900 | 36,67 | 35,75 | [Ice Golem](https://crtool.app/en/units/ice-golem/) | Conservar |
| Cloyster | Estructura · antiaérea | 4 | 865 | 53,85 | 56 | [Inferno Tower](https://crtool.app/en/units/inferno-tower/) | Conservar |
| Gastly | Enjambre · aéreo | 2 | 81 | 26,92 | 105 | [Bats](https://crtool.app/en/units/bats/) | Conservar |
| Voltorb | Ciclo · antienjambre | 1 | 230 | 82,14 | 0 | [Electro Spirit](https://crtool.app/en/units/electro-spirit/) | Conservar |
| Forretress | Win condition · explosiva | 4 | 1200 | 375 | 0 | [Wall Breakers](https://crtool.app/en/units/wall-breakers/) | Conservar |
| Exeggutor | Mini tanque · área | 5 | 1750 | 121,05 | 115 | [Wizard](https://crtool.app/en/units/wizard/) | Conservar |
| Koffing | Volador · área | 3 | 700 | 52,94 | 79,13 | [Skeleton Dragons](https://crtool.app/en/units/skeleton-dragons/) | Conservar |
| Chansey | Apoyo · curación | 3 | 800 | 10 | 9,9 | [Battle Healer](https://crtool.app/en/units/battle-healer/) | Conservar |
| Kangaskhan | Mini tanque · refuerzos | 5 | 2400 | 150 | 221,5 | [Goblin Giant](https://crtool.app/en/units/goblin-giant/) | Conservar |
| Starmie | Tirador · antiaéreo | 4 | 550 | 150 | 148,5 | [Musketeer](https://crtool.app/en/units/musketeer/) | Conservar |
| Mr. Mime | Apoyo · escudos | 4 | 590 | 60 | 63 | [Monk](https://crtool.app/en/units/monk/) | Conservar |
| Gyarados | Tanque · área | 6 | 2600 | 133,33 | 132 | [Baby Dragon](https://crtool.app/en/units/baby-dragon/) | Conservar |
| Ditto | Apoyo · copia | 3 | 508 | 25 | 0 | [Mirror](https://crtool.app/en/units/mirror/) | Conservar |
| Articuno | Volador · control | 5 | 1400 | 80,56 | 79,75 | [Ice Wizard](https://crtool.app/en/units/ice-wizard/) | Ajustar |
| Zapdos | Volador · control | 5 | 1200 | 83,33 | 82,5 | [Electro Dragon](https://crtool.app/en/units/electro-dragon/) | Ajustar |
| Moltres | Volador · área | 5 | 1350 | 91,67 | 101,48 | [Phoenix](https://crtool.app/en/units/phoenix/) | Ajustar |
| Dragonite | Volador · antitanques | 5 | 1600 | 134,21 | 131,75 | [Mega Minion](https://crtool.app/en/units/mega-minion/) | Ajustar |
| Meganium | Tanque · curación | 5 | 2400 | 61,76 | 63 | [Battle Healer](https://crtool.app/en/units/battle-healer/) | Conservar |
| Typhlosion | Tirador · área | 5 | 1130 | 83,33 | 90,75 | [Wizard](https://crtool.app/en/units/wizard/) | Conservar |
| Feraligatr | Antitanques · terrestre | 4 | 1900 | 193,55 | 195 | [Mini P.E.K.K.A](https://crtool.app/en/units/mini-pekka/) | Conservar |
| Crobat | Volador · área | 4 | 900 | 100 | 105 | [Skeleton Dragons](https://crtool.app/en/units/skeleton-dragons/) | Conservar |
| Ampharos | Estructura · control | 5 | 1600 | 84,85 | 84 | [Tesla](https://crtool.app/en/units/tesla/) | Conservar |
| Espeon | Tirador · antiaéreo | 3 | 460 | 110 | 104,5 | [Musketeer](https://crtool.app/en/units/musketeer/) | Conservar |
| Umbreon | Mini tanque · terrestre | 3 | 2100 | 70,59 | 80,75 | [Knight](https://crtool.app/en/units/knight/) | Conservar |
| Wobbuffet | Estructura · reflejo | 4 | 1900 | 0 | 0 | [Monk](https://crtool.app/en/units/monk/) | Conservar |
| Steelix | Win condition · tanque | 6 | 4500 | 140,91 | 139,5 | [Giant](https://crtool.app/en/units/giant/) | Conservar |
| Scizor | Luchador · terrestre | 4 | 1200 | 207,69 | 202,5 | [Dark Prince](https://crtool.app/en/units/dark-prince/) | Conservar |
| Skarmory | Volador · antiaéreo | 4 | 560 | 54 | 56,7 | [Guards](https://crtool.app/en/units/guards/) | Conservar |
| Blissey | Mini tanque · curación | 5 | 1800 | 17,5 | 17,5 | [Battle Healer](https://crtool.app/en/units/battle-healer/) | Conservar |
| Lugia | Tanque aéreo · apoyo | 7 | 3300 | 75 | 78 | [Lava Hound](https://crtool.app/en/units/lava-hound/) | Conservar |
| Ho-Oh | Tanque aéreo · curación | 7 | 2900 | 93,75 | 110,8 | [Phoenix](https://crtool.app/en/units/phoenix/) | Conservar |
| Sceptile | Tirador · antiaéreo | 4 | 600 | 191,67 | 195,5 | [Dart Goblin](https://crtool.app/en/units/dart-goblin/) | Conservar |
| Blaziken | Luchador · terrestre | 4 | 1200 | 176,47 | 185,75 | [Lumberjack](https://crtool.app/en/units/lumberjack/) | Conservar |
| Swampert | Tanque · control | 5 | 2800 | 105,56 | 104,5 | [Bowler](https://crtool.app/en/units/bowler/) | Conservar |
| Gardevoir | Tirador · área | 5 | 780 | 175 | 196 | [Wizard](https://crtool.app/en/units/wizard/) | Ajustar |
| Sableye | Asesino · terrestre | 3 | 800 | 133,33 | 136 | [Bandit](https://crtool.app/en/units/bandit/) | Conservar |
| Aggron | Tanque · área | 6 | 3000 | 129,41 | 132 | [Mega Knight](https://crtool.app/en/units/mega-knight/) | Conservar |
| Sharpedo | Luchador · terrestre | 3 | 907 | 193 | 183,35 | [Prince](https://crtool.app/en/units/prince/) | Conservar |
| Flygon | Mini tanque · aéreo | 5 | 1650 | 91,67 | 90,75 | [Valkyrie](https://crtool.app/en/units/valkyrie/) | Conservar |
| Altaria | Volador · curación | 4 | 900 | 46,88 | 48,75 | [Battle Healer](https://crtool.app/en/units/battle-healer/) | Conservar |
| Absol | Asesino · rematador | 4 | 1100 | 142,86 | 140 | [Mini P.E.K.K.A](https://crtool.app/en/units/mini-pekka/) | Conservar |
| Salamence | Volador · antitanques | 6 | 2200 | 129,55 | 128,25 | [Baby Dragon](https://crtool.app/en/units/baby-dragon/) | Conservar |
| Metagross | Tanque · área | 6 | 2800 | 123,81 | 130 | [Mega Knight](https://crtool.app/en/units/mega-knight/) | Conservar |
| Kyogre | Tanque · área | 8 | 3300 | 133,33 | 135 | [Executioner](https://crtool.app/en/units/executioner/) | Conservar |
| Groudon | Win condition · tanque | 8 | 4500 | 133,33 | 128 | [Giant](https://crtool.app/en/units/giant/) | Conservar |
| Rayquaza | Tanque aéreo · apoyo | 8 | 3000 | 127,78 | 126,5 | [Lava Hound](https://crtool.app/en/units/lava-hound/) | Conservar |
| Central Electrode | Estructura · invocadora | 5 | 1000 | 0 | 17,25 | [Furnace](https://crtool.app/en/units/furnace/) | Conservar |
| Madriguera Nidoqueen | Estructura · invocadora | 5 | 1200 | 0 | 139,5 | [Goblin Hut](https://crtool.app/en/units/goblin-hut/) | Conservar |
| Vivero Exeggutor | Estructura · invocadora | 4 | 900 | 0 | 113,75 | [Tombstone](https://crtool.app/en/units/tombstone/) | Conservar |
| Regice | Estructura · control | 4 | 1000 | 41,67 | 41,25 | [Bomb Tower](https://crtool.app/en/units/bomb-tower/) | Conservar |
| Duskull | Invocador · apoyo | 5 | 598 | 56,25 | 318,5 | [Witch](https://crtool.app/en/units/witch/) | Conservar |
| Raichu | Antitanques · frágil | 3 | 640 | 291,67 | 280 | [Mini P.E.K.K.A](https://crtool.app/en/units/mini-pekka/) | Conservar |
| Registeel | Antitanques · pesado | 7 | 3200 | 348,39 | 324 | [P.E.K.K.A](https://crtool.app/en/units/pekka/) | Conservar |
| Regirock | Win condition · tanque | 7 | 5700 | 100 | 99 | [Golem](https://crtool.app/en/units/golem/) | Conservar |
| Celebi | Win condition · aérea | 4 | 1350 | 144,44 | 143 | [Balloon](https://crtool.app/en/units/balloon/) | Ajustar |
| Pandilla Rocket | Enjambre · mixto | 3 | 202 | 109,09 | 421,2 | [Goblin Gang](https://crtool.app/en/units/goblin-gang/) | Conservar |
| Pin misil | Hechizo · antienjambre | 3 | — | — | 0 | [Arrows](https://crtool.app/en/units/arrows/) | Conservar |
| Rayo | Hechizo · daño selectivo | 6 | — | — | 0 | [Lightning](https://crtool.app/en/units/lightning/) | Conservar |
| Hiperrayo | Hechizo · daño pesado | 6 | — | — | 0 | [Rocket](https://crtool.app/en/units/rocket/) | Conservar |
| Ventisca | Hechizo · congelación | 4 | — | — | 0 | [Freeze](https://crtool.app/en/units/freeze/) | Conservar |
| Púas | Hechizo · zona terrestre | 3 | — | — | 14 | [Poison](https://crtool.app/en/units/poison/) | Conservar |
| Trampa rocas | Hechizo · zona antiaérea | 3 | — | — | 4,5 | [Poison](https://crtool.app/en/units/poison/) | Conservar |
| Remolino | Hechizo · atracción | 3 | — | — | 0 | [Tornado](https://crtool.app/en/units/tornado/) | Conservar |
| Pesadilla | Hechizo · invocación | 5 | — | — | 315,25 | [Graveyard](https://crtool.app/en/units/graveyard/) | Conservar |
| Terremoto | Hechizo · antiestructuras | 3 | — | — | 0 | [Earthquake](https://crtool.app/en/units/earthquake/) | Conservar |

## Reproducir

```sh
node scripts/balance-sandbox.mjs --catalog docs/balance-baseline.json --out docs/balance-baseline-reproduced.json
npm run balance:simulate
node scripts/audit-role-balance.mjs --out docs/balance-roles-current.json
node scripts/report-simulation.mjs
```

Los JSON conservan resultados individuales y protocolo. Las simulaciones comprueban estos enfrentamientos y colocaciones. El balance competitivo también requiere observar partidas con decisiones humanas, rotación y administración de elixir.

Datos: [antes](balance-baseline.json), [después](balance-simulation.json), [escenarios por función](balance-role-audit.json) y [referencia de Clash Royale](clash-royale-level11.json).

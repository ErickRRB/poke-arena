# Simulación de balance

Revisión del 12 de noviembre de 2026. 105 cartas y 6.588 escenarios por catálogo, antes y después del ajuste. El sandbox ejecuta Game.step del motor compartido con navegador y servidor.

## Método

- CPU desactivada y despliegues libres, con todas las unidades de cada carta, sus escudos y sus refuerzos.
- 315 pruebas de daño: un objetivo de tierra, uno de aire y una torre por carta. Se simulan 25 s y se mide el daño sostenido entre los segundos 5 y 25.
- 105 pruebas contra nueve cuerpos terrestres de 202 PV en una formación de 3 × 3, durante un máximo de 12 s.
- 5.840 duelos entre tropas de coste igual o a una unidad de elixir de distancia, a 80 y 160 unidades de separación y alternando ambos equipos. Límite de 45 s.
- 300 duelos adicionales con habilidades de Articuno, Zapdos y Moltres. Se registra el elixir adicional y Renacer espera a que Moltres esté herido.
- 28 escenarios entre combinaciones de dos cartas de igual coste total. Se registran curación, daño y resultado desde ambos lados.
- Las torres de los duelos sirven como destinos de avance, con las armas desactivadas y vida suficiente para conservar el escenario. Su daño recibido se excluye de las métricas de combate.

La semilla es fija y el paso es de 1/30 s. Una prueba adicional compara la medición a 30 y 60 pasos por segundo. Los resultados representan estas colocaciones y rivales concretos. El balance competitivo también depende de torres activas, rotación, colocación, elixir y decisiones de los jugadores.

## Ajustes medidos

| Carta | Daño por impacto | PV | DPS sostenido medido | Duelos ganados |
| --- | ---: | ---: | ---: | ---: |
| Lapras | 109 → 160 | 1500 → 1500 | 59,95 → 88 | 40/156 → 76/156 |
| Articuno | 90 → 135 | 1250 → 1400 | 49,5 → 74,25 | 12/100 → 43/100 |
| Moltres | 109 → 135 | 1170 → 1170 | 70,68 → 84,98 | 30/100 → 41/100 |

Lapras mantiene coste, alcance, vida y ralentización. Su daño sube para sostener su función de mini tanque a distancia. Sigue perdiendo contra antitanques y combinaciones de daño concentrado.

Articuno recibe daño y vida para poder sostener su control de hielo. Moltres recibe daño conservando vida, quemadura y ataque en área. Los ajustes se aplican en el catálogo compartido.

- Articuno: 49/100 victorias con activación habilitada. La habilidad se usó en 100 escenarios y suma 2 de elixir al coste de la carta.
- Moltres: 54/100 victorias con activación habilitada. La habilidad se usó en 48 escenarios y suma 2 de elixir al coste de la carta.

Las cartas de curación, escudos, reflejo e invocación tienen un daño directo bajo como parte de su función. La tabla distingue ese daño del medido con quemaduras, veneno y refuerzos. Los escenarios de equipo registran la curación para examinar su aporte.

## Mediciones por carta

El DPS directo cuenta todos los impactos del ataque básico. El medido incluye efectos y refuerzos. El daño de aire y torre es el acumulado en 25 s. El escenario de enjambre registra bajas dentro de 12 s. Las cartas que van a estructuras usan un objetivo de estructura para la medición de suelo. Ditto copia al blanco pasivo del banco y necesita interpretar su resultado junto con los duelos.

| Carta | Elixir | Rol | PV | Impacto | DPS directo | DPS suelo medido | Daño a aire | Daño a torre | Enjambre |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pikachu | 4 | Control · antiaéreo | 714 | 115 × 2 | 127,78 | 126,5 | 3.412 | 3.278 | 8/9 |
| Squirtle | 2 | Tirador · antiaéreo | 400 | 28 × 3 | 57,93 | 58,8 | 1.428 | 1.428 | 2/9 |
| Charmander | 3 | Tirador · área | 440 | 135 | 90 | 100,35 | 2.439 | 2.439 | 9/9 |
| Snorlax | 5 | Win condition · tanque | 4091 | 254 | 169,33 | 165,1 | 0 | 4.318 | 0/9 |
| Zubat | 2 | Enjambre · aéreo | 180 | 65 | 50 | 146,25 | 3.575 | 3.705 | 6/9 |
| Charizard | 5 | Mini tanque · aéreo | 1526 | 72 × 3 | 120 | 118,8 | 3.024 | 3.024 | 9/9 |
| Impactrueno | 2 | Hechizo · aturde | — | 192 | — | 0 | 192 | 58 | 0/9 |
| Bomba ígnea | 4 | Hechizo · área | — | 689 | — | 0 | 689 | 207 | 9/9 |
| Bulbasaur | 2 | Tirador · control | 400 | 85 | 65,38 | 63,75 | 1.615 | 1.615 | 3/9 |
| Gengar | 4 | Tirador · área | 650 | 125 | 86,21 | 87,5 | 2.125 | 2.125 | 9/9 |
| Machamp | 4 | Antitanques · terrestre | 1361 | 180 × 4 | 400 | 396 | 0 | 10.080 | 7/9 |
| Eevee | 2 | Ciclo · presión | 300 | 90 | 94,74 | 94,5 | 0 | 2.340 | 4/9 |
| Onix | 5 | Win condition · terrestre | 1400 | 180 | 85,71 | 81 | 0 | 2.160 | 0/9 |
| Blastoise | 4 | Estructura · antiaérea | 1200 | 85 × 2 | 94,44 | 93,5 | 2.380 | 2.380 | 3/9 |
| Vulpix | 3 | Tirador · antiaéreo | 440 | 75 × 2 | 107,14 | 117,4 | 2.819 | 2.819 | 4/9 |
| Psyduck | 3 | Tirador · control | 560 | 110 | 78,57 | 82,5 | 1.980 | 1.980 | 4/9 |
| Alakazam | 4 | Tirador · área | 590 | 133 | 120,91 | 119,7 | 2.926 | 2.926 | 9/9 |
| Geodude | 3 | Mini tanque · terrestre | 1766 | 202 | 168,33 | 161,6 | 0 | 4.242 | 9/9 |
| Magnemite | 3 | Volador · control | 400 | 81 | 45 | 44,55 | 1.134 | 1.134 | 2/9 |
| Scyther | 4 | Volador · antiaéreo | 650 | 65 × 2 | 108,33 | 110,5 | 2.730 | 2.730 | 5/9 |
| Lapras | 5 | Mini tanque · control | 1500 | 160 | 91,43 | 88 | 2.240 | 2.240 | 3/9 |
| Mewtwo | 6 | Tirador · área | 1452 | 440 | 157,14 | 154 | 3.960 | 3.960 | 9/9 |
| Treecko | 3 | Tiradores · dúo | 304 | 112 | 124,44 | 235,2 | 5.824 | 5.824 | 9/9 |
| Golem | 8 | Win condition · tanque | 5120 | 312 | 124,8 | 124,8 | 0 | 3.120 | 0/9 |
| Mazazo | 2 | Hechizo · empuje | — | 290 | — | 0 | 0 | 58 | 9/9 |
| Diglett | 1 | Ciclo · distracción | 81 | 81 | 81 | 238,95 | 0 | 5.751 | 9/9 |
| Horda Diglett | 3 | Enjambre · terrestre | 81 | 81 | 81 | 684,45 | 0 | 16.524 | 9/9 |
| Trío Ralts | 2 | Enjambre · antiaéreo | 133 | 81 | 47,65 | 145,8 | 3.645 | 3.645 | 6/9 |
| Manada Poochyena | 2 | Enjambre · terrestre | 202 | 120 | 109,09 | 414 | 0 | 10.440 | 9/9 |
| Venusaur | 5 | Mini tanque · área | 1900 | 140 | 73,68 | 88 | 2.252 | 1.820 | 9/9 |
| Butterfree | 3 | Volador · control | 440 | 72 | 45 | 46,8 | 1.152 | 1.152 | 9/9 |
| Beedrill | 3 | Enjambre · aéreo | 260 | 85 × 2 | 130,77 | 255 | 6.460 | 6.460 | 9/9 |
| Pidgeot | 4 | Volador · antiaéreo | 1052 | 165 | 126,92 | 123,75 | 3.135 | 3.135 | 4/9 |
| Ekans | 2 | Enjambre · terrestre | 250 | 60 | 50 | 104,1 | 0 | 2.760 | 6/9 |
| Sandshrew | 3 | Enjambre · terrestre | 220 | 121 | 110 | 217,8 | 0 | 5.324 | 9/9 |
| Nidoqueen | 6 | Tanque · invocadora | 2800 | 165 | 103,13 | 144,6 | 0 | 3.552 | 4/9 |
| Nidoking | 5 | Antitanques · terrestre | 2200 | 150 × 2 | 187,5 | 192,5 | 0 | 4.920 | 7/9 |
| Mankey | 2 | Enjambre · terrestre | 150 | 80 | 66,67 | 204 | 0 | 5.040 | 9/9 |
| Arcanine | 4 | Luchador · terrestre | 1400 | 220 | 157,14 | 163,1 | 0 | 4.181 | 9/9 |
| Slowbro | 3 | Tirador · control | 688 | 90 | 52,94 | 54 | 1.433 | 1.375 | 9/9 |
| Grimer | 2 | Mini tanque · zona | 900 | 55 | 36,67 | 35,75 | 0 | 935 | 2/9 |
| Cloyster | 4 | Estructura · antiaérea | 865 | 28 × 5 | 53,85 | 56 | 1.400 | 1.400 | 2/9 |
| Gastly | 2 | Enjambre · aéreo | 81 | 35 | 26,92 | 105 | 2.660 | 2.660 | 5/9 |
| Voltorb | 1 | Ciclo · antienjambre | 230 | 115 | 82,14 | 0 | 115 | 115 | 0/9 |
| Electrode | 4 | Win condition · explosiva | 1200 | 600 | 375 | 0 | 0 | 600 | 0/9 |
| Exeggutor | 5 | Mini tanque · área | 1750 | 230 | 121,05 | 115 | 2.990 | 2.990 | 9/9 |
| Koffing | 3 | Volador · área | 700 | 90 | 52,94 | 79,13 | 1.953 | 1.665 | 9/9 |
| Chansey | 3 | Apoyo · curación | 800 | 18 | 10 | 9,9 | 252 | 252 | 0/9 |
| Kangaskhan | 5 | Mini tanque · refuerzos | 2400 | 225 | 150 | 221,5 | 0 | 5.345 | 9/9 |
| Starmie | 4 | Tirador · antiaéreo | 550 | 90 × 3 | 150 | 148,5 | 3.780 | 3.780 | 9/9 |
| Mr. Mime | 4 | Apoyo · escudos | 590 | 90 | 60 | 63 | 1.530 | 1.530 | 2/9 |
| Gyarados | 6 | Tanque · área | 2600 | 240 | 133,33 | 132 | 3.360 | 3.360 | 9/9 |
| Ditto | 3 | Apoyo · copia | 508 | 35 | 25 | 0 | 0 | 630 | 0/9 |
| Articuno | 6 | Volador · control | 1400 | 135 | 75 | 74,25 | 1.890 | 1.890 | 3/9 |
| Zapdos | 6 | Volador · control | 1090 | 109 | 60,56 | 59,95 | 1.526 | 1.526 | 4/9 |
| Moltres | 6 | Volador · área | 1170 | 135 | 75 | 84,98 | 2.150 | 2.150 | 9/9 |
| Dragonite | 5 | Volador · antitanques | 2000 | 85 × 3 | 134,21 | 131,75 | 3.315 | 3.315 | 6/9 |
| Meganium | 5 | Tanque · curación | 2400 | 105 | 61,76 | 63 | 1.575 | 1.575 | 3/9 |
| Typhlosion | 5 | Tirador · área | 1130 | 150 | 83,33 | 90,75 | 2.300 | 2.300 | 9/9 |
| Feraligatr | 4 | Antitanques · terrestre | 1900 | 300 | 193,55 | 195 | 0 | 4.800 | 8/9 |
| Crobat | 4 | Volador · área | 900 | 75 × 2 | 100 | 105 | 2.550 | 2.550 | 9/9 |
| Ampharos | 5 | Estructura · control | 1600 | 140 | 84,85 | 84 | 2.100 | 2.100 | 4/9 |
| Espeon | 3 | Tirador · antiaéreo | 460 | 110 | 110 | 104,5 | 2.640 | 2.640 | 9/9 |
| Umbreon | 3 | Mini tanque · terrestre | 2100 | 120 | 70,59 | 80,75 | 0 | 2.010 | 3/9 |
| Wobbuffet | 4 | Estructura · reflejo | 1900 | 0 | 0 | 0 | 0 | 0 | 0/9 |
| Steelix | 6 | Win condition · tanque | 4500 | 310 | 140,91 | 139,5 | 0 | 3.720 | 0/9 |
| Scizor | 4 | Luchador · terrestre | 1200 | 135 × 2 | 207,69 | 202,5 | 0 | 5.130 | 9/9 |
| Skarmory | 4 | Volador · antiaéreo | 560 | 81 | 54 | 56,7 | 1.377 | 1.377 | 2/9 |
| Blissey | 5 | Mini tanque · curación | 1800 | 35 | 17,5 | 17,5 | 455 | 455 | 1/9 |
| Lugia | 7 | Tanque aéreo · apoyo | 3300 | 120 | 75 | 78 | 1.920 | 1.920 | 8/9 |
| Ho-Oh | 7 | Tanque aéreo · curación | 2900 | 150 | 93,75 | 110,8 | 2.715 | 2.715 | 9/9 |
| Sceptile | 4 | Tirador · antiaéreo | 600 | 115 × 2 | 191,67 | 195,5 | 4.830 | 4.830 | 9/9 |
| Blaziken | 4 | Luchador · terrestre | 1200 | 100 × 3 | 176,47 | 185,75 | 0 | 4.640 | 7/9 |
| Swampert | 5 | Tanque · control | 2800 | 190 | 105,56 | 104,5 | 0 | 2.660 | 9/9 |
| Gardevoir | 5 | Tirador · área | 720 | 230 | 127,78 | 140,5 | 3.549 | 3.220 | 9/9 |
| Sableye | 3 | Asesino · terrestre | 800 | 160 | 133,33 | 136 | 0 | 3.360 | 5/9 |
| Aggron | 6 | Tanque · área | 3000 | 220 | 129,41 | 132 | 0 | 3.300 | 9/9 |
| Sharpedo | 3 | Luchador · terrestre | 907 | 193 | 193 | 183,35 | 0 | 4.632 | 5/9 |
| Flygon | 5 | Mini tanque · aéreo | 1650 | 165 | 91,67 | 90,75 | 2.310 | 2.310 | 9/9 |
| Altaria | 4 | Volador · curación | 900 | 75 | 46,88 | 48,75 | 1.200 | 1.200 | 2/9 |
| Absol | 4 | Asesino · rematador | 1100 | 200 | 142,86 | 140 | 0 | 3.600 | 4/9 |
| Salamence | 6 | Volador · antitanques | 2200 | 95 × 3 | 129,55 | 128,25 | 3.135 | 3.230 | 6/9 |
| Metagross | 6 | Tanque · área | 2800 | 260 | 123,81 | 130 | 0 | 3.120 | 9/9 |
| Kyogre | 8 | Tanque · área | 3300 | 150 × 2 | 133,33 | 135 | 3.300 | 3.300 | 9/9 |
| Groudon | 8 | Win condition · tanque | 4500 | 320 | 133,33 | 128 | 0 | 3.520 | 0/9 |
| Rayquaza | 8 | Tanque aéreo · apoyo | 3000 | 230 | 127,78 | 126,5 | 3.220 | 3.220 | 9/9 |
| Central Electrode | 5 | Estructura · invocadora | 1000 | 0 | 0 | 17,25 | 460 | 460 | 9/9 |
| Madriguera Nidoqueen | 5 | Estructura · invocadora | 1200 | 0 | 0 | 139,5 | 0 | 3.060 | 3/9 |
| Vivero Exeggutor | 4 | Estructura · invocadora | 900 | 0 | 0 | 115,5 | 2.485 | 2.450 | 3/9 |
| Regice | 4 | Estructura · control | 1000 | 75 | 41,67 | 41,25 | 1.050 | 1.050 | 9/9 |
| Duskull | 5 | Invocador · apoyo | 598 | 90 | 56,25 | 318,5 | 1.440 | 7.030 | 6/9 |
| Raichu | 3 | Antitanques · frágil | 640 | 700 | 291,67 | 280 | 0 | 7.000 | 5/9 |
| Registeel | 7 | Antitanques · pesado | 3200 | 1.080 | 348,39 | 324 | 0 | 8.640 | 4/9 |
| Regirock | 7 | Win condition · tanque | 5700 | 220 | 100 | 99 | 0 | 2.420 | 0/9 |
| Celebi | 4 | Win condition · aérea | 950 | 220 | 122,22 | 121 | 3.080 | 3.080 | 0/9 |
| Pandilla Rocket | 3 | Enjambre · mixto | 202 | 120 | 109,09 | 421,2 | 2.430 | 10.350 | 9/9 |
| Pin misil | 3 | Hechizo · antienjambre | — | 366 | — | 0 | 366 | 110 | 9/9 |
| Rayo | 6 | Hechizo · daño selectivo | — | 1.056 | — | 0 | 1.056 | 317 | 3/9 |
| Hiperrayo | 6 | Hechizo · daño pesado | — | 1.484 | — | 0 | 1.484 | 371 | 9/9 |
| Ventisca | 4 | Hechizo · congelación | — | 45 | — | 0 | 45 | 14 | 0/9 |
| Púas | 3 | Hechizo · zona terrestre | — | 0 | — | 14 | 0 | 0 | 9/9 |
| Trampa rocas | 3 | Hechizo · zona antiaérea | — | 0 | — | 4,5 | 720 | 0 | 9/9 |
| Remolino | 3 | Hechizo · atracción | — | 0 | — | 0 | 100 | 0 | 0/9 |
| Pesadilla | 5 | Hechizo · invocación | — | 0 | — | 315,25 | 0 | 7.280 | 9/9 |
| Terremoto | 3 | Hechizo · antiestructuras | — | 0 | — | 0 | 0 | 36 | 0/9 |

## Reproducir

```sh
npm run balance:simulate
node scripts/balance-sandbox.mjs --catalog docs/balance-baseline.json --out docs/balance-baseline-reproduced.json
node scripts/balance-sandbox.mjs --focus lapras,articuno,moltres --out docs/balance-focused.json
node scripts/report-simulation.mjs
```

El script exporta createSandbox, spawnCard, damageTrial, swarmTrial, duelTrial y teamTrial para preparar enfrentamientos propios. --focus limita los duelos al conjunto indicado. --catalog restaura las estadísticas guardadas para repetir una versión anterior.

Datos completos: [antes](balance-baseline.json) y [después](balance-simulation.json). Cada archivo incluye el catálogo, el protocolo y los resultados individuales.

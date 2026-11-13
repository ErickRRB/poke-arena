import { readFile, writeFile } from 'node:fs/promises';
const read=name=>readFile(new URL('../docs/'+name,import.meta.url),'utf8').then(JSON.parse);
const [before,after]=await Promise.all([read('balance-baseline.json'),read('balance-simulation.json')]);
const n=value=>Number(value).toLocaleString('es-AR',{maximumFractionDigits:2});
const benchmark=(report,key,target='ground')=>report.damage.find(row=>row.key===key&&row.target===target);
const totals=report=>report.damage.length+report.swarms.length+report.duels.length+report.abilityDuels.length+report.teams.length;
const adjusted=['lapras','articuno','moltres'];
const changes=adjusted.map(key=>{
 const a=before.scores.find(row=>row.key===key),b=after.scores.find(row=>row.key===key);
 return `| ${b.name} | ${a.damage} → ${b.damage} | ${a.hp} → ${b.hp} | ${n(a.sustainedDps)} → ${n(b.sustainedDps)} | ${a.wins}/${a.trials} → ${b.wins}/${b.trials} |`;
});
const rows=Object.entries(after.catalog).filter(([,card])=>!card.token).map(([key,card])=>{
 const measured=benchmark(after,key)||benchmark(after,key,'structure'),air=benchmark(after,key,'air'),tower=benchmark(after,key,'tower'),swarm=after.swarms.find(row=>row.key===key),impacts=card.bolts||card.burst||1;
 return '| '+[card.name,card.cost,card.role,card.hp||'—',n(card.damage)+(impacts>1?' × '+impacts:''),card.interval?n(card.damage*impacts/card.interval):'—',n(measured?.sustainedDps||0),n(air?.damage||0),n(tower?.damage||0),swarm.eliminated+'/9'].join(' | ')+' |';
});
const ability=adjusted.filter(key=>after.catalog[key].ability).map(key=>{
 const matches=after.abilityDuels.filter(row=>row.a===key),wins=matches.filter(row=>row.winner===key).length,used=matches.filter(row=>row.abilityEnergy>0).length;
 return `- ${after.catalog[key].name}: ${wins}/${matches.length} victorias con activación habilitada. La habilidad se usó en ${used} escenarios y suma ${after.catalog[key].ability.cost} de elixir al coste de la carta.`;
});
const content=[
 '# Simulación de balance','',
 `Revisión del 12 de noviembre de 2026. ${after.cards} cartas y ${n(totals(after))} escenarios por catálogo, antes y después del ajuste. El sandbox ejecuta Game.step del motor compartido con navegador y servidor.`,
 '', '## Método','',
 '- CPU desactivada y despliegues libres, con todas las unidades de cada carta, sus escudos y sus refuerzos.',
 '- 315 pruebas de daño: un objetivo de tierra, uno de aire y una torre por carta. Se simulan 25 s y se mide el daño sostenido entre los segundos 5 y 25.',
 '- 105 pruebas contra nueve cuerpos terrestres de 202 PV en una formación de 3 × 3, durante un máximo de 12 s.',
 '- 5.840 duelos entre tropas de coste igual o a una unidad de elixir de distancia, a 80 y 160 unidades de separación y alternando ambos equipos. Límite de 45 s.',
 '- 300 duelos adicionales con habilidades de Articuno, Zapdos y Moltres. Se registra el elixir adicional y Renacer espera a que Moltres esté herido.',
 '- 28 escenarios entre combinaciones de dos cartas de igual coste total. Se registran curación, daño y resultado desde ambos lados.',
 '- Las torres de los duelos sirven como destinos de avance, con las armas desactivadas y vida suficiente para conservar el escenario. Su daño recibido se excluye de las métricas de combate.',
 '', 'La semilla es fija y el paso es de 1/30 s. Una prueba adicional compara la medición a 30 y 60 pasos por segundo. Los resultados representan estas colocaciones y rivales concretos. El balance competitivo también depende de torres activas, rotación, colocación, elixir y decisiones de los jugadores.',
 '', '## Ajustes medidos','',
 '| Carta | Daño por impacto | PV | DPS sostenido medido | Duelos ganados |',
 '| --- | ---: | ---: | ---: | ---: |',...changes,
 '', 'Lapras mantiene coste, alcance, vida y ralentización. Su daño sube para sostener su función de mini tanque a distancia. Sigue perdiendo contra antitanques y combinaciones de daño concentrado.',
 '', 'Articuno recibe daño y vida para poder sostener su control de hielo. Moltres recibe daño conservando vida, quemadura y ataque en área. Los ajustes se aplican en el catálogo compartido.',
 '', ...ability,
 '', 'Las cartas de curación, escudos, reflejo e invocación tienen un daño directo bajo como parte de su función. La tabla distingue ese daño del medido con quemaduras, veneno y refuerzos. Los escenarios de equipo registran la curación para examinar su aporte.',
 '', '## Mediciones por carta','',
 'El DPS directo cuenta todos los impactos del ataque básico. El medido incluye efectos y refuerzos. El daño de aire y torre es el acumulado en 25 s. El escenario de enjambre registra bajas dentro de 12 s. Las cartas que van a estructuras usan un objetivo de estructura para la medición de suelo. Ditto copia al blanco pasivo del banco y necesita interpretar su resultado junto con los duelos.',
 '', '| Carta | Elixir | Rol | PV | Impacto | DPS directo | DPS suelo medido | Daño a aire | Daño a torre | Enjambre |',
 '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',...rows,
 '', '## Reproducir','',
 '```sh','npm run balance:simulate','node scripts/balance-sandbox.mjs --catalog docs/balance-baseline.json --out docs/balance-baseline-reproduced.json','node scripts/balance-sandbox.mjs --focus lapras,articuno,moltres --out docs/balance-focused.json','node scripts/report-simulation.mjs','```',
 '', 'El script exporta createSandbox, spawnCard, damageTrial, swarmTrial, duelTrial y teamTrial para preparar enfrentamientos propios. --focus limita los duelos al conjunto indicado. --catalog restaura las estadísticas guardadas para repetir una versión anterior.',
 '', 'Datos completos: [antes](balance-baseline.json) y [después](balance-simulation.json). Cada archivo incluye el catálogo, el protocolo y los resultados individuales.','',
].join('\n');
await writeFile(new URL('../docs/BALANCE-SIMULATIONS.md',import.meta.url),content);
console.log(JSON.stringify({scenariosPerCatalog:totals(after),cards:rows.length,report:'docs/BALANCE-SIMULATIONS.md'}));

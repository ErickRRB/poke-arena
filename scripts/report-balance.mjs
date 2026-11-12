import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { Game, CARDS } from '../dist/engine.js';
import { CARD_REVIEW } from '../dist/card-review.js';

const reviews=JSON.parse(await readFile(new URL('../docs/ROLE-REVIEW.json',import.meta.url),'utf8'));
const references=Object.fromEntries(reviews.cards.map(c=>[c.key,c.reference]));
const playable=Object.entries(CARDS).filter(([,c])=>!c.token);
const number=value=>Number(value).toLocaleString('es-AR',{maximumFractionDigits:2});
const rows=playable.map(([key,c])=>{
  const impacts=c.bolts||c.burst||1,dps=c.interval?number(c.damage*impacts/c.interval):'—';
  return '| '+[c.name,c.role,c.cost,c.count||1,c.hp||'—',c.shield||'—',number(c.damage)+(impacts>1?' × '+impacts:''),c.interval?number(c.interval):'—',dps,c.range?(c.range<50?'Contacto':number(c.range/24)+' casillas'):'—',references[key],CARD_REVIEW[key]].join(' | ')+' |';
});
const scales=playable.filter(([,c])=>c.id).map(([,c])=>'| '+[c.name,c.id,c.scale].join(' | ')+' |');
const simulations=[];
for(const [key,count]of[['machamp',1],['diglett',9],['treecko',2],['pikachu',1]]){
  const g=new Game({seed:611});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);
  const tank=g.spawn('snorlax',1,300,460,0);tank.card={...tank.card,passive:true,speed:0};
  for(let i=0;i<count;i++)g.spawn(key,0,276+i%3*24,510+Math.floor(i/3)*24,0);
  for(let i=0;i<45*60&&tank.hp>0;i++)g.step(1/60);
  simulations.push({attacker:CARDS[key].name,count,seconds:Number(g.elapsed.toFixed(2)),tankHp:Math.round(tank.hp)});
}
const content=[
  '# Balance, roles y tamaños',
  '',
  'Revisión del 11 de noviembre de 2026. '+playable.length+' cartas. Valores explícitos compartidos entre CPU, navegador y servidor. La referencia de rol usa Clash Royale de nivel 11 y adaptaciones Pokémon; los valores propios no constituyen una copia de todas sus estadísticas.',
  '',
  'Las reglas y fuentes están en [MECHANICS.md](MECHANICS.md); la revisión por carta está en [ROLE-REVIEW.json](ROLE-REVIEW.json). Las descripciones del producto explican las acciones. Esta tabla técnica incluye daño directo por unidad; el DPS no suma veneno, quemadura, reflejo, curación ni habilidades.',
  '',
  '| Carta | Rol | Elixir | Unidades | PV | Escudo | Daño | Ataque cada (s) | DPS directo | Alcance | Referencia | Identidad y decisión |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
  ...rows,
  '',
  '## Escalas',
  '',
  'Multiplicadores aplicados a los sprites originales después de medir sus siluetas visibles. Zubat usa 1,44 y Snorlax 2,4; las anclas, las animaciones y el tamaño de los defensores montados se conservan.',
  '',
  '| Pokémon | Especie | Escala |',
  '| --- | ---: | ---: |',
  ...scales,
  '',
  '## Simulaciones reproducibles',
  '',
  'Ataque contra un Snorlax inmóvil, sin disparos de torres. Cada escenario registra el resultado de esa colocación y no establece por sí solo balance competitivo.',
  '',
  ...simulations.map(s=>'- '+s.attacker+' ×'+s.count+': '+s.seconds+' s; tanque con '+s.tankHp+' PV.'),
  '',
].join('\n');
await mkdir(new URL('../docs/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/BALANCE.md',import.meta.url),content);
console.log(JSON.stringify({cards:playable.length,simulations,report:'docs/BALANCE.md'},null,2));

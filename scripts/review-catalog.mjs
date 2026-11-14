import { readFile, writeFile } from 'node:fs/promises';
import { CARDS } from '../dist/engine.js';
const file=new URL('../docs/ROLE-REVIEW.json',import.meta.url),previous=JSON.parse(await readFile(file,'utf8'));
const references=Object.fromEntries(previous.cards.map(c=>[c.key,c.reference]));
Object.assign(references,{
  rapidash:'Montapuercos',roselia:'Princesa',graveler:'Lanzarrocas (Bowler)',nuzleaf:'Duende lanzadardos',sneaselAmbush:'Barril de duendes',
  zubat:'Murciélagos con absorción de vida',diglettHorde:'Ejército de esqueletos',beedrill:'Esbirros con doble aguijón',sandshrew:'Guardias',
  fireball:'Bola de fuego',log:'El Tronco',charizard:'Bebé dragón con ráfaga',onix:'Presión terrestre hacia estructuras',blastoise:'Tropa móvil de apoyo con dos cañones',
  forretress:references.electrode||'Rompemuros / explosión contra estructuras',
  centralElectrode:'Horno adaptado a Voltorb',madriguera:'Choza de refuerzos',vivero:'Invocador inmóvil a distancia',regice:'Estructura de control',
  duskull:'Bruja',raichu:'Antitanques frágil de golpe lento',registeel:'P.E.K.K.A. de golpe muy lento',regirock:'Tanque contra estructuras',celebi:'Presión aérea contra estructuras',pandilla:'Pandilla de cuerpo a cuerpo y tiradores',
  pinMissile:'Flechas de área amplia',lightning:'Rayo de tres objetivos',hyperBeam:'Cohete con aviso y demora',blizzard:'Congelación',spikes:'Zona terrestre Pokémon',stealthRock:'Zona antiaérea Pokémon',whirlpool:'Control de posición',nightmare:'Cementerio de invocaciones',earthquake:'Terremoto contra estructuras',
});
const cards=Object.entries(CARDS).filter(([,c])=>!c.token).map(([key,c])=>({key,name:c.name,role:c.role,reference:references[key]||c.role,cost:c.cost,hp:c.hp||0,shield:c.shield||0,count:c.count||1,damage:c.damage,impacts:c.bolts||c.burst||1,interval:c.interval||null,directDps:c.interval?Number((c.damage*(c.bolts||c.burst||1)/c.interval).toFixed(1)):0,range:c.range||c.splash||0,scale:c.scale||null,description:c.description,pokemonIdentity:c.move||c.name,attackRuleException:!!c.attackRoleOverride,...(c.fieldDuration?{fieldDuration:c.fieldDuration,fieldDps:c.fieldDamage||0}:{}),...(c.summon?{summon:c.summon,summonEvery:c.summonEvery,summonCount:c.summonCount||1}:{}),...(c.deathSpawn?{deathSpawn:c.deathSpawn,deathCount:c.deathCount||1}:{})}));
const reviews=Object.fromEntries(cards.map(c=>[c.key,`${c.pokemonIdentity}: ${c.description} Referencia: ${c.reference}. ${c.cost} de elixir.`]));
await writeFile(file,JSON.stringify({...previous,date:new Date().toISOString().slice(0,10),cards},null,2)+'\n');
await writeFile(new URL('../dist/card-review.js',import.meta.url),'// Technical role review; kept separate from product descriptions.\nexport const CARD_REVIEW = '+JSON.stringify(reviews,null,2)+';\n');
console.log(`Reviewed ${cards.length} playable cards.`);

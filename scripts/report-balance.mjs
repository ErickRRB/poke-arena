import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { Game, CARDS } from '../dist/engine.js';
import { THRESHOLDS, cardThresholds } from '../dist/balance.js';
import { CARD_REVIEW } from '../dist/card-review.js';

const animations=JSON.parse(await readFile(new URL('../dist/assets/pokemon/manifest.json',import.meta.url),'utf8'));
const playable=Object.entries(CARDS).filter(([,c])=>!c.token);
const missing=playable.filter(([key])=>!CARD_REVIEW[key]);
if(missing.length)throw Error(`Missing card reviews: ${missing.map(([key])=>key).join(', ')}`);
const run=(g,condition,limit=45)=>{for(let i=0;i<limit*60&&condition();i++)g.step(1/60);};
function fresh(){const g=new Game({seed:14});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);return g;}
function duel(enemy,count=1){
  const g=fresh(),unit=g.spawn('geodude',0,300,540,0),foes=[];
  for(let i=0;i<count;i++){const angle=i/count*Math.PI*2;foes.push(g.spawn(enemy,1,300+Math.cos(angle)*35,540+Math.sin(angle)*35,0));}
  run(g,()=>unit.hp>0&&foes.some(u=>u.hp>0));
  return {enemy:CARDS[enemy].name,count,seconds:Number(g.elapsed.toFixed(2)),geodudeHp:Math.round(unit.hp),survivors:foes.filter(u=>u.hp>0).length};
}
const duels=['pikachu','psyduck','alakazam','gengar','feraligatr','arcanine','scizor','sableye','sharpedo','espeon','machamp'].map(key=>duel(key));
duels.push(duel('shuppet',9),duel('nidoranPack',4));
const tankGame=fresh(),tower=tankGame.towers.find(t=>t.team===1&&t.lane===0);tower.active=true;
const tank=tankGame.spawn('snorlax',0,158,340,0);run(tankGame,()=>tower.hp>0&&tank.hp>0);
const rows=playable.map(([key,c])=>{
  const thresholds=Object.fromEntries(cardThresholds(c));
  return `| ${c.name} | ${c.cost} | ${c.count||1} | ${c.hp??'—'}${c.shield?` + ${c.shield} escudo`:''} | ${c.damage}${c.burst?` × ${c.burst}`:''} | ${c.interval??'—'} | ${thresholds['Tiros de torre']??'—'} | ${thresholds['Bola de fuego']??'—'} | ${CARD_REVIEW[key]} |`;
});
const poses=playable.filter(([,c])=>!c.spell).map(([key,c])=>{
  if(!animations[c.id]?.[c.attackAnim])throw Error(`Missing animation ${key}`);
  return `| ${c.name} | ${c.move} | ${c.passive?'Respuesta al daño':c.attackAnim} | ${c.style} | ${c.passive?'—':c.windup} | ${c.burst||1} | ${c.burstSpacing||'—'} | ${c.attackDuration} |`;
});
const content=`# Balance y lore de las cartas

Revisión del 11 de noviembre de 2026. ${playable.length} cartas jugables. Se genera con \`npm run balance:report\` a partir del catálogo y las decisiones individuales de \`dist/card-review.js\`.

## Umbrales

| Referencia | Coste | Vida por cuerpo | Interacción |
| --- | --- | --- | --- |
| Shuppet ×3 | 1 | 1 | Cualquier daño lo elimina; tres distracciones terrestres. |
| Horda Shuppet ×9 | 3 | 1 | Rodea al objetivo único; cualquier hechizo de área limpia los cuerpos alcanzados. |
| Nidoran tiradores ×3 | 2 | 81 | Un tiro de torre o Impactrueno por cuerpo. |
| Gastly ×4 | 2 | 81 | Enjambre aéreo de un tiro; Tronco no lo alcanza. |
| Manada Nidoran ×4 | 3 | 180 | Dos tiros; Impactrueno deja 71 PV y Tronco los elimina. |
| Zubat ×3 | 2 | 180 | Variante aérea de dos tiros, con Chupavidas. |
| Treecko ×2 | 3 | 304 | Tres tiros por cuerpo; Bola de fuego lo elimina. |
| Torre lateral | — | 3000 | ${THRESHOLDS.tower} de daño cada ${THRESHOLDS.towerInterval} s. |
| Impactrueno | 2 | — | 109 de daño, 30 a torres y 0,75 s de aturdimiento. |
| Tronco | 2 | — | 218 de daño terrestre, 55 a torres y empuje. |
| Bola de fuego | 4 | — | 400 de daño y 110 a torres. |

Los valores de las tablas son por cuerpo al aparecer. Los escudos propios y la armadura cuentan en los tiros; se excluyen curación, desgaste de estructuras y escudos de aliados. La rareza no aumenta estadísticas. Los apoyos ordinarios de 4–5 como Alakazam, Starmie, Mr. Mime, Espeon, Sceptile, Gardevoir, Crobat y Altaria mueren de Bola de fuego o quedan a uno o dos tiros. Los tanques y los atacantes físicos resistentes son excepciones deliberadas.

## Duelos comprobados

Simulación a 60 pasos/s, sin torres activas ni ayudas. Geodude está en (300, 540); los rivales empiezan a 35 unidades de distancia. Los grupos rodean su posición inicial. Se usan los ataques completos, estados y objetivos del motor.

| Rival de Geodude | Cuerpos | Duración (s) | Vida restante de Geodude | Rivales vivos |
| --- | --- | --- | --- | --- |
${duels.map(d=>`| ${d.enemy} | ${d.count} | ${d.seconds} | ${d.geodudeHp} | ${d.survivors} |`).join('\n')}

Geodude cuesta 3, golpea un solo objetivo terrestre y tiene 1450 PV. Gana los diez duelos ordinarios medidos, pero pierde contra Machamp y los dos enjambres indicados. No pretende vencer a toda carta de 4 en cualquier posición. Snorlax desplegado en (158, 340) destruye la torre lateral activa en ${tankGame.elapsed.toFixed(2)} s y termina con ${Math.round(tank.hp)} PV. Camina a 18, golpea cada 2 s y sigue ignorando tropas.

Estas simulaciones fijan interacciones reproducibles; las partidas entre personas siguen siendo necesarias para evaluar variedad de mazos y ventajas de posición.

## Revisión una por una

Daño por impacto; las ráfagas muestran cuántos impactos hay. Cadencia en segundos. “+ N tiros” significa Bola de fuego seguida por tiros de torre.

| Carta | Elixir | Cuerpos | PV | Daño | Cadencia | Tiros | Bola de fuego | Decisión y lore |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Animaciones y ventanas de ataque

La preparación es compartida por cliente, CPU y servidor; cargar una hoja de sprites no modifica cuándo se inflige daño. La animación original se ajusta para que su fotograma de impacto coincida con el primer lanzamiento. Las ráfagas conservan impactos separados y la recuperación termina después del último. Aturdir antes de lanzar cancela el golpe; un proyectil ya lanzado sigue viajando.

Butterfree tiene polvo, Grimer/Koffing/Umbreon usan veneno, Exeggutor lanza huevos en arco, Typhlosion muestra fuego circular y Altaria ondas de voz. Gastly usa Lengüetazo en lugar de garras; Chansey y Blissey lanzan huevos. Los estados de veneno se dibujan morados y las quemaduras naranjas. La zona de Gardevoir tiene órbitas psíquicas. Wobbuffet muestra una respuesta azul al recibir daño directo; permanece sin ataque proactivo. Los escudos se dibujan alrededor del cuerpo y la curación produce un pulso verde. Los enjambres usan sprites y barras proporcionados a la cantidad de cuerpos. Movimiento reducido conserva la lectura de daño y estados.

| Carta | Ataque | Hoja original | Efecto | Preparación (s) | Impactos | Separación (s) | Animación total (s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
${poses.join('\n')}

## Invocaciones

Nidoqueen conserva hasta tres Nidoran hembra por madre, con 81 PV y vida limitada. Nidoking deja de crear crías al morir. Exeggutor deja de invocar Exeggcute explosivos: Bomba huevo es un proyectil. Kangaskhan conserva una cría de 218 PV. Los fragmentos de Golem tienen 900 PV, 52 de daño, objetivo de estructuras y no son Geodude completos. Exeggcute queda como recurso interno no seleccionable; no se utiliza como kamikaze.

## Referencias de lore y adaptaciones

La [Pokédex oficial de Snorlax](https://ph.portal-pokemon.com/pokedex/0143/) describe su cuerpo de 460 kg y su costumbre de comer y dormir; el rol de tanque es una adaptación de esos rasgos. La [entrada oficial de Wobbuffet](https://ph.portal-pokemon.com/pokedex/0202/) describe su respuesta al ser atacado, usada para reemplazar los puñetazos por contraataque. [Shuppet](https://ph.portal-pokemon.com/play/pokedex/0353) se alimenta de emociones oscuras; su clasificación terrestre, los grupos y el mínimo de 1 PV son decisiones de este juego. El [tipo y las habilidades de Umbreon](https://ph.portal-pokemon.com/pokedex/0197/) sirven como referencia de especie; Tóxico se usa como adaptación de control sostenido. Las estructuras Pokémon, los escudos, las habilidades pagadas y los fragmentos de Golem también son adaptaciones al combate de torres.
`;
await mkdir(new URL('../docs/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/BALANCE.md',import.meta.url),content);
console.log(JSON.stringify({cards:playable.length,duels,tankVsTower:{seconds:Number(tankGame.elapsed.toFixed(2)),tankHp:Math.round(tank.hp),towerHp:tower.hp},report:'docs/BALANCE.md'},null,2));

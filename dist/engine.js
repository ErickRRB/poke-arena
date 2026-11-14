import { EXTRA_CARDS } from './catalog.js?v=26';
import { applyBalance, THRESHOLDS } from './balance.js?v=26';
import { REFERENCE_TOWERS } from './current-reference.js?v=26';
import { emissionPoint, structureLift } from './sprite-motion.js?v=26';
import { nativeFormationOffsets } from './native-formations.js?v=26';
export { attackPoseProgress } from './sprite-motion.js?v=26';
import { W,H,TILE,BOARD_VERSION,ARENA,DEPLOY_GRID,RIVER,BRIDGE,PRINCESS_Y,KING_Y,LANES,snapToCell,inArena,arenaBits,inKingBlock,onBridge,pullPosition,laneAt } from './arena-geometry.js?v=26';
export { W,H,TILE,BOARD_VERSION,ARENA,DEPLOY_GRID,RIVER,BRIDGE,PRINCESS_Y,KING_Y,LANES,snapToCell } from './arena-geometry.js?v=26';
// Native attack ranges measure the gap between collision bodies.
export const PRINCESS_RANGE = 7.5 * TILE;

export const attackReach=(actor,target,range=actor.card?.range??actor.range??0)=>range+(actor.radius||0)+(target.radius||0);
export const sightReach=(actor,target)=>attackReach(actor,target,actor.card?.sightRange??165);
const attackRate=actor=>actor.freeze>0?0:actor.slow>0?actor.slowAttackFactor??.7:1;
const charged=actor=>!!(actor.card?.charge&&(actor.card.chargeDistance?(actor.chargeTravel||0)>=actor.card.chargeDistance:actor.charge>=actor.card.charge));
export function spellOverlapsTarget(card,point,target){
  const radius=card.splash??card.radius??0;
  // Crown towers receive spells on their two-cell square footprint. Other
  // bodies overlap by their full collision radius, rather than 40% of it.
  if('king'in target||target.card?.structure){const crown='king'in target,half=crown?TILE:target.radius||TILE,dx=Math.max(0,Math.abs(target.x-point.x)-half),dy=Math.max(0,Math.abs(target.y-point.y)-half),gap=Math.hypot(dx,dy);return crown&&radius>0?gap<radius-1e-7:gap<=radius+1e-7;}
  return Math.hypot(target.x-point.x,target.y-point.y)<=radius+(target.radius||0)+1e-7;
}
export function rollingOverlapsTarget(card,start,end,target){
  const width=card.splash||0,halfLength=card.sweepHalfLength??18,minY=Math.min(start.y,end.y)-halfLength,maxY=Math.max(start.y,end.y)+halfLength;
  const dx=Math.max(0,Math.abs(target.x-start.x)-width),dy=Math.max(0,minY-target.y,target.y-maxY),radius=target.radius||0;
  return 'king'in target||target.card?.structure?dx<=radius+1e-7&&dy<=radius+1e-7:Math.hypot(dx,dy)<=radius+1e-7;
}
export function projectileProfile(card={}){
  const style=card.style;
  return{speed:card.projectileSpeed??({bubble:270,rock:235,egg:235,hydro:420,coin:470,psychic:480}[style]||310),arc:card.projectileArc??({rock:65,egg:55,ember:42,ice:12,bubble:16}[style]||0)};
}
export const CARDS = {
  pikachu: { name: 'Pikachu', id: 25, cost: 3, type: 'electric', label: 'Eléctrico', role: 'A distancia', hp: 310, damage: 76, range: 128, speed: 52, interval: 1.05, air: true, stun: .18, color: '#f8d66d', description: 'Impactrueno alcanza a rivales terrestres y aéreos, y los frena un instante.' },
  squirtle: { name: 'Squirtle', id: 7, cost: 2, type: 'water', label: 'Agua', role: 'A distancia', hp: 390, damage: 46, range: 112, speed: 44, interval: 1.05, air: true, color: '#79c9ed', description: 'Ataca con burbujas. Su bajo coste permite acompañar a un tanque.' },
  charmander: { name: 'Charmander', id: 4, cost: 3, type: 'fire', label: 'Fuego', role: 'Daño de área', hp: 330, damage: 72, range: 112, speed: 46, interval: 1.25, air: true, splash: 32, color: '#f19c6b', description: 'Sus ascuas dañan a varios rivales cercanos. Cuidalo detrás de un tanque.' },
  snorlax: { name: 'Snorlax', id: 143, cost: 5, type: 'normal', label: 'Normal', role: 'Tanque · torres', hp: 1720, damage: 135, range: 29, speed: 27, interval: 1.5, building: true, radius: 20, color: '#86b6ab', description: 'Ignora a los Pokémon y avanza hacia las torres. Tiene mucha vida y camina lento.' },
  zubat: { name: 'Zubat', id: 41, cost: 2, type: 'flying', label: 'Volador', role: 'Enjambre · ×3', hp: 115, damage: 32, range: 27, speed: 66, interval: .9, air: true, flying: true, count: 3, color: '#ad9be4', description: 'Despliega tres Zubat. Vuelan sobre el río, pero son vulnerables al daño de área.' },
  charizard: { name: 'Charizard', id: 6, cost: 5, type: 'fire', label: 'Fuego / volador', role: 'Volador · área', hp: 760, damage: 98, range: 120, speed: 40, interval: 1.4, air: true, flying: true, splash: 45, radius: 18, color: '#f19c6b', description: 'Cruza el río volando y lanza fuego en área contra objetivos terrestres y aéreos.' },
  thunder: { name: 'Impactrueno', cost: 3, type: 'electric', label: 'Eléctrico', role: 'Hechizo · aturde', spell: true, damage: 155, towerDamage: 43, splash: 70, stun: .75, color: '#f8d66d', description: 'Elimina enjambres y aturde durante 0,75 segundos. Hace daño reducido a las torres.' },
  fireball: { name: 'Bola de fuego', cost: 4, type: 'fire', label: 'Fuego', role: 'Hechizo · área', spell: true, damage: 400, towerDamage: 110, splash: 82, knockback: 22, color: '#f19c6b', description: 'Explota en área, daña y empuja a los enemigos de tierra y aire.' },
  bulbasaur: { name: 'Bulbasaur', id: 1, cost: 3, type: 'grass', label: 'Planta', role: 'Apoyo · ralentiza', hp: 420, damage: 58, range: 122, speed: 40, interval: 1.1, slow: 1.3, air: true, color: '#9ad69c', description: 'Látigo cepa ralentiza a su objetivo. Combina bien con Pokémon de ataque a distancia.' },
  gengar: { name: 'Gengar', id: 94, cost: 4, type: 'ghost', label: 'Fantasma', role: 'Cuerpo a cuerpo · área', hp: 650, damage: 100, range: 32, speed: 65, interval: 1.1, splash: 35, color: '#b9a0e6', description: 'Se acerca rápido y golpea en área. Es eficaz contra grupos terrestres.' },
  machamp: { name: 'Machamp', id: 68, cost: 4, type: 'fighting', label: 'Lucha', role: 'Cuerpo a cuerpo', hp: 940, damage: 122, range: 28, speed: 44, interval: 1.0, radius: 17, color: '#c1b4a1', description: 'Sus golpes fuertes y rápidos eliminan tanques. Necesita apoyo contra voladores.' },
  eevee: { name: 'Eevee', id: 133, cost: 2, type: 'normal', label: 'Normal', role: 'Ataque rápido', hp: 300, damage: 65, range: 26, speed: 76, interval: .8, color: '#d6b18b', description: 'Corre hacia sus rivales y ataca muy rápido. Sirve para defender o presionar un carril.' },
  onix: { name: 'Onix', id: 95, cost: 5, type: 'rock', label: 'Roca', role: 'Tanque · torres', hp: 1500, damage: 165, range: 30, speed: 33, interval: 1.8, building: true, radius: 20, color: '#b2b7bc', description: 'Avanza directo a las torres y las golpea fuerte. Sus ataques son lentos.' },
};
Object.assign(CARDS.pikachu, { move: 'Rayo encadenado', style: 'lightning', attackAnim: 'Shock', attackDuration: .65, chain: 2, description: 'Un rayo salta hasta a otros dos rivales cercanos con daño reducido. Cada impacto aturde un instante.' });
Object.assign(CARDS.squirtle, { move: 'Burbuja', style: 'bubble', attackAnim: 'Shoot', attackDuration: .8, damage: 24, burst: 3, burstSpacing: .14, interval: 1.45, description: 'Dispara tres burbujas seguidas al mismo objetivo. Ataca a tierra y aire.' });
Object.assign(CARDS.charmander, { move: 'Ascuas', style: 'ember', attackAnim: 'Attack', attackDuration: .65, damage: 52, burn: 12, description: 'Lanza ascuas en un arco. La explosión golpea en área y quema durante tres segundos.' });
Object.assign(CARDS.snorlax, { move: 'Golpe pesado', style: 'slam', attackAnim: 'Stomp', attackDuration: .95, description: 'Tanque lento que ignora a los Pokémon y golpea estructuras. Protege a las unidades que avanzan detrás.' });
Object.assign(CARDS.zubat, { move: 'Chupavidas', style: 'bite', attackAnim: 'Attack', attackDuration: .5, lifesteal: 10, description: 'Tres voladores rápidos. Sus mordidas recuperan 10 de vida cuando dañan a un Pokémon.' });
Object.assign(CARDS.charizard, { move: 'Lanzallamas', style: 'flame', attackAnim: 'Shoot', attackDuration: .95, damage: 35, burst: 3, burstSpacing: .14, interval: 1.65, cone: .42, description: 'Vuela y exhala tres pulsos de fuego en un cono. Daña a todos los enemigos dentro de la llamarada.' });
Object.assign(CARDS.bulbasaur, { move: 'Látigo cepa', style: 'vine', attackAnim: 'Shoot', attackDuration: .7, description: 'Extiende una liana que ralentiza a su objetivo durante 1,3 segundos. Alcanza tierra y aire.' });
Object.assign(CARDS.gengar, { move: 'Garra umbría', style: 'shadow', attackAnim: 'Attack', attackDuration: .65, blink: 5, description: 'Se teletransporta hacia un rival cercano y ataca con garras en área. El salto se recarga cada cinco segundos.' });
Object.assign(CARDS.machamp, { move: 'Puño dinámico', style: 'punch', attackAnim: 'Double', attackDuration: .85, damage: 34, burst: 4, burstSpacing: .13, interval: 1.35, role: 'Cuerpo a cuerpo · combo', description: 'Encadena cuatro puñetazos a corta distancia. Cada golpe hace daño por separado; no alcanza voladores.' });
Object.assign(CARDS.eevee, { move: 'Ataque rápido', style: 'dash', attackAnim: 'Attack', attackDuration: .55, charge: 1.5, description: 'Tras correr 1,5 segundos, acelera y duplica el daño de su siguiente placaje. La carga se pierde al atacar o quedar aturdido.' });
Object.assign(CARDS.onix, { move: 'Lanzarrocas', style: 'rock', attackAnim: 'Shoot', attackDuration: .95, hp: 1050, range: 172, speed: 24, interval: 2.1, role: 'Asedio · estructuras', description: 'Lanza grandes rocas a las estructuras desde lejos. Ignora a los Pokémon y necesita protección a corta distancia.' });
CARDS.blastoise = { name: 'Blastoise', id: 9, cost: 4, type: 'water', label: 'Agua', role: 'Estructura', move: 'Doble hidrobomba', style: 'hydro', attackAnim: 'Shoot', attackDuration: .8, structure: true, lifetime: 35, hp: 1150, damage: 70, range: 175, speed: 0, interval: 1.8, burst: 2, burstSpacing: .16, air: true, radius: 28, color: '#79c9ed', description: 'Permanece sobre un bastión y dispara sus dos cañones contra tierra y aire. Dura 35 segundos, atrae tanques y no se desplaza.' };
for(const [key,height]of Object.entries({pikachu:22,squirtle:20,charmander:22,snorlax:30,zubat:25,charizard:50,bulbasaur:18,gengar:22,machamp:30,eevee:15,onix:72,blastoise:56}))CARDS[key].muzzleHeight=height;
Object.assign(CARDS,{
  vulpix:{name:'Vulpix',id:37,cost:3,type:'fire',label:'Fuego',role:'Ráfaga · quemadura',move:'Pirotecnia',style:'ember',attackAnim:'Shoot',attackDuration:.85,hp:285,damage:29,range:116,speed:60,interval:1.45,burst:2,burstSpacing:.18,burn:9,air:true,muzzleHeight:19,color:'#edaa72',description:'Lanza dos pequeñas llamas al mismo objetivo y lo quema. Corre rápido, pero tiene poca vida.'},
  psyduck:{name:'Psyduck',id:54,cost:3,type:'water',label:'Agua / psíquico',role:'Control',move:'Confusión',style:'confusion',attackAnim:'Shoot',attackDuration:.8,hp:460,damage:65,range:122,speed:36,interval:1.55,stun:.4,air:true,muzzleHeight:22,color:'#f0cf79',description:'Su onda de confusión aturde durante 0,4 segundos. Interrumpe la preparación de ataques terrestres y aéreos.'},
  alakazam:{name:'Alakazam',id:65,cost:4,type:'psychic',label:'Psíquico',role:'Perforación',move:'Psíquico',style:'psychic',attackAnim:'Shoot',attackDuration:.9,hp:360,damage:88,range:150,speed:45,interval:1.65,pierce:true,air:true,muzzleHeight:32,color:'#deacd8',description:'Proyecta un rayo que atraviesa a los enemigos alineados. Es fuerte desde atrás y frágil a corta distancia.'},
  geodude:{name:'Farfetch’d',id:83,cost:3,type:'normal',label:'Normal / volador',role:'Tanque · área',move:'Golpe de puerro',style:'slam',attackAnim:'Attack',emitter:'head',attackDuration:.85,hp:1020,damage:89,range:29,speed:26,interval:1.6,splash:50,radius:17,muzzleHeight:21,color:'#c1b69c',description:'Resiste en primera línea y golpea en área a rivales terrestres. Camina lento y no alcanza voladores.'},
  magnemite:{name:'Magnemite',id:81,cost:3,type:'electric',label:'Eléctrico / acero',role:'Volador · control',move:'Bomba imán',style:'magnet',attackAnim:'Shoot',attackDuration:.8,hp:365,damage:59,range:145,speed:40,interval:1.8,stun:.32,flying:true,air:true,muzzleHeight:29,color:'#a1cbd0',description:'Flota y dispara una esfera magnética que aturde brevemente. Puede defender contra objetivos de tierra y aire.'},
  scyther:{name:'Scyther',id:123,cost:4,type:'grass',label:'Bicho / volador',role:'Volador · doble corte',move:'Doble corte',style:'slash',attackAnim:'Double',attackDuration:.75,hp:560,damage:45,range:30,speed:72,interval:1.05,burst:2,burstSpacing:.18,flying:true,air:true,muzzleHeight:35,color:'#b8d98c',description:'Se acerca volando y corta dos veces con sus guadañas. Daño rápido contra un solo objetivo de tierra o aire.'},
  lapras:{name:'Lapras',id:131,cost:5,type:'water',label:'Agua / hielo',role:'Tanque · ralentiza',move:'Rayo hielo',style:'ice',attackAnim:'Shoot',attackDuration:.95,hp:1190,damage:72,range:138,speed:25,interval:1.75,slow:2,air:true,radius:20,muzzleHeight:43,color:'#a2deeb',description:'Un tanque a distancia. Sus cristales de hielo ralentizan a su objetivo durante dos segundos.'},
  mewtwo:{name:'Mewtwo',id:150,cost:6,type:'psychic',label:'Psíquico',role:'Área · carga lenta',move:'Esfera aural',style:'aura',attackAnim:'Shoot',attackDuration:1.2,hp:730,damage:149,range:158,speed:38,interval:2.2,splash:45,projectileSpeed:225,air:true,muzzleHeight:37,color:'#cfb9ed',description:'Prepara una esfera de energía lenta que explota en área. Tiene gran alcance y necesita protección durante la carga.'}
});
CARDS.treecko={name:'Treecko',id:252,cost:3,type:'grass',label:'Planta',role:'Pareja · a distancia',move:'Semilladora',style:'leaf',attackAnim:'Shoot',attackDuration:.7,hp:370,damage:55,range:145,speed:45,interval:1.25,count:2,air:true,muzzleHeight:24,color:'#a5d577',description:'Dos tiradores que atacan a tierra y aire. Vulnerables al daño de área.'};
CARDS.golem={name:'Golem',id:76,cost:8,type:'rock',label:'Roca',role:'Tanque · división',move:'Demolición',style:'slam',attackAnim:'Attack',attackDuration:1,hp:4600,damage:190,range:30,speed:21,interval:2.3,building:true,radius:23,muzzleHeight:35,deathDamage:130,split:true,color:'#b9ad92',description:'Tanque que solo ataca estructuras. Al caer explota y deja dos Geodude pequeños.'};
CARDS.log={name:'Rueda Fuego',move:'Rueda Fuego',cost:2,type:'fire',label:'Fuego',role:'Hechizo · empuje',spell:true,rolling:true,damage:200,towerDamage:55,splash:45,knockback:28,color:'#ef9b52',description:'Una rueda de fuego avanza y empuja a los enemigos terrestres.'};
CARDS.mewtwo.description='Esfera de daño en área. Onda psíquica: 2 de elixir, daña y aturde alrededor; un uso por despliegue.';
CARDS.pikachu.description='Rayo que salta a otros dos rivales. Aturde, interrumpe el ataque y hace buscar el objetivo más cercano.';
CARDS.magnemite.description='Volador eléctrico. Aturde, interrumpe el ataque y hace buscar el objetivo más cercano.';
CARDS.thunder.description='Daña, aturde 0,75 s y reinicia el objetivo enemigo. Daño reducido a torres.';
const rarityGroups={comun:['squirtle','zubat','eevee','geodude','treecko','bulbasaur'],especial:['pikachu','charmander','vulpix','psyduck','magnemite','lapras'],epica:['snorlax','machamp','onix','blastoise','gengar','scyther','golem','thunder','fireball'],legendaria:['charizard','mewtwo','log']};
export const RARITIES={comun:'Común',especial:'Especial',epica:'Épica',legendaria:'Legendaria'};
for(const[rarity,keys]of Object.entries(rarityGroups))for(const key of keys)CARDS[key].rarity=rarity;
CARDS.alakazam.rarity='epica';
Object.assign(CARDS,structuredClone(EXTRA_CARDS));
applyBalance(CARDS);
export const DEFAULT_DECK = ['pikachu', 'snorlax', 'machamp', 'blastoise', 'zubat', 'thunder', 'charizard', 'fireball'];
export const CPU_DECKS = [
  {name:'Carga eléctrica',cards:['forretress','raichu','raltsHut','treecko','voltorb','pikachu','pinMissile','lightning']},
  {name:'Camada venenosa',cards:['snorlax','nidoqueen','madriguera','poochyenaPack','butterfree','grimer','spikes','fireball']},
  {name:'Noche de fantasmas',cards:['golem','duskull','gengar','zubat','regice','diglett','nightmare','log']},
  {name:'Asedio de roca',cards:['regirock','rhydon','cloyster','raltsTrio','mankey','gastly','earthquake','thunder']},
  {name:'Vuelo del bosque',cards:['celebi','charizard','vivero','treecko','raltsTrio','skarmory','blizzard','pinMissile']},
  {name:'Contraataque',cards:['steelix','raichu','regice','pikachu','diglett','chansey','whirlpool','fireball']},
  {name:'Emboscada Rocket',cards:['forretress','pandilla','roselia','graveler','raltsHut','voltorb','sneaselAmbush','log']},
  {name:'Carga veloz',cards:['rapidash','lapras','vivero','nuzleaf','poochyenaPack','zubat','thunder','fireball']},
  {name:'Bosque vivo',cards:['golem','vivero','meganium','sceptile','gastly','diglett','spikes','pinMissile']},
  {name:'Presión aérea',cards:['celebi','pidgeot','cloyster','blastoise','pandilla','zubat','whirlpool','lightning']},
];
// PMD sheets run south, southeast, east, northeast, north, northwest, west, southwest.
export function directionRow(dx, dy) { return (2 - Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8; }
export function aimPoint(target) { return { x: target.x, y: target.y - ('king' in target ? 27 : target.card?.structure ? structureLift(target.card)+20 : target.card?.flying ? 27 : 15) }; }
// Compress/extend the original windup so its hit frame coincides with the shared release time.
export function isCombatTargetReady(target){return !(target.spawn>0)||!!target.card?.vulnerableDuringDeploy;}

export function formationOffsets(card, team = 0, anchorX = 300) {
  if(card.nativeFormation)return nativeFormationOffsets(card.nativeFormation,team,anchorX);
  const count = card.count || 1;
  const direction = team ? -1 : 1;
  const mirror=(team?W-anchorX:anchorX)<W/2?1:-1;
  const small = { 1: [[0,0]], 2: [[-.5,0],[.5,0]], 3: [[-1,0],[0,1],[1,0]], 4: [[-1,0],[0,1],[1,0],[0,-1]] };
  return Array.from({length:count},(_,i)=>{
    const [x,y] = card.formation?.[i] || small[count]?.[i] || [i % 3 - 1, Math.floor(i / 3) - Math.floor(count / 6)];
    return { x: x * TILE * direction * mirror, y: y * TILE * direction };
  });
}
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Game {
  constructor({ deck = DEFAULT_DECK, cpuDeck, difficulty = 'normal', seed = Date.now(), onEvent = () => {}, tutorial = false, animations = {} } = {}) {
    const valid = Array.isArray(deck) && deck.length === 8 && new Set(deck).size === 8 && deck.every(k => CARDS[k]&&!CARDS[k].token);
    if (!valid) throw new Error('El mazo necesita ocho cartas diferentes.');
    this.boardVersion=BOARD_VERSION;
    this.seed = seed >>> 0 || 1;
    this.difficulty = difficulty;
    this.onEvent = onEvent;
    this.tutorial = tutorial;
    this.aiEnabled = !tutorial;
    this.animations = animations;
    this.state = 'ready';
    this.time = 180;
    this.elapsed = 0;
    this.overtime = false;
    this.tiebreaker = false;
    this.winner = null;
    this.reason = '';
    this.energy = [6, 6];
    this.hands = [deck.slice(0, 4), DEFAULT_DECK.slice(0, 4)];
    this.queues = [deck.slice(4), DEFAULT_DECK.slice(4)];
    this.units = [];
    this.projectiles = [];
    this.spells = [];
    this.attacks = [];
    this.fields = [];
    this.reinforcements = [];
    this.towers = [];
    this.nextId = 1;
    this.aiClock = 3.5;
    this.stats = [{ deployed: 0, damage: 0, energy: 0, defeated: 0 }, { deployed: 0, damage: 0, energy: 0, defeated: 0 }];
    for (let team = 0; team < 2; team++) {
      for (let lane = 0; lane < 2; lane++) this.towers.push({ id: this.nextId++, team, lane, x: LANES[lane], y: PRINCESS_Y[team], ...REFERENCE_TOWERS.princess, maxHp: REFERENCE_TOWERS.princess.hp, king: false, active: true, cooldown: 0, stun: 0, hit: 0 });
      this.towers.push({ id: this.nextId++, team, lane: -1, x: 300, y: KING_Y[team], ...REFERENCE_TOWERS.king, maxHp: REFERENCE_TOWERS.king.hp, king: true, active: false, cooldown: 0, stun: 0, hit: 0 });
    }
    for (const tower of this.towers) Object.assign(tower, {guard: { id: 52, style: 'coin', attackAnim: 'Shoot' }, dx: 0, dy: tower.team ? 1 : -1, attack: 0, attackDuration: .6, attackSeq: 0, anim: this.random(), target: null });
    const royalGuards = this.random() < .5 ? [34, 31] : [31, 34];
    for (const tower of this.towers) if (tower.king) tower.guard = { id: royalGuards[tower.team], style: 'poison', attackAnim: 'Shoot' };
    for(const tower of this.towers)Object.assign(tower.guard,{projectileSpeed:tower.projectileSpeed,projectileStart:tower.projectileStart});
    const preset=CPU_DECKS[Math.floor(this.random()*CPU_DECKS.length)];
    const bot=[...(cpuDeck|| (tutorial?DEFAULT_DECK:preset.cards))];
    if(bot.length!==8||new Set(bot).size!==8||bot.some(k=>!CARDS[k]||CARDS[k].token))throw Error('Mazo CPU inválido.');
    this.cpuDeckName=cpuDeck||tutorial?'Práctica':preset.name;
    this.cpuDeck=[...bot];
    if(!cpuDeck&&!tutorial)for(let i=bot.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[bot[i],bot[j]]=[bot[j],bot[i]];}
    this.hands[1]=bot.slice(0,4);this.queues[1]=bot.slice(4);
  }
  random() {
    let n = this.seed;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    this.seed = n >>> 0;
    return this.seed / 4294967296;
  }
  emit(type, data = {}) { this.onEvent({ type, ...data }); }
  start() { if (this.state === 'ready') { this.state = 'playing'; this.emit('start'); } }
  pause() { if (this.state === 'playing') { this.state = 'paused'; return true; } return false; }
  resume() { if (this.state === 'paused') this.state = 'playing'; }
  get multiplier() { return this.overtime && (this.time <= 60 || this.tiebreaker) ? 3 : this.time <= 60 || this.overtime ? 2 : 1; }
  crowns(team) {
    if (this.towers.some(t => t.team !== team && t.king && t.hp <= 0)) return 3;
    return this.towers.filter(t => t.team !== team && !t.king && t.hp <= 0).length;
  }
  canDeploy(team,key,x,y){
    const card=CARDS[key];if(!card||!inArena(x,y))return false;
    if(card.spell&&!card.rolling)return !card.spellAsDeploy||!(arenaBits(x,y)&32);
    if(arenaBits(x,y)&32)return false;
    if(arenaBits(x,y)&16)return false;
    if(card.structure){if(team?y>=RIVER.top:y<=RIVER.bottom)return false;}
    else for(const tower of this.towers){
      if(tower.hp<=0||tower.team===team)continue;
      const halfW=(tower.king?18:11)*TILE/2,halfH=(tower.king?16:21)*TILE/2;
      if(Math.abs(x-tower.x)<=halfW+1e-7&&Math.abs(y-tower.y)<=halfH+1e-7)return false;
    }
    if(card.rolling)return true;
    return ![...this.towers,...this.units.filter(u=>u.card.structure)].some(t=>{
      if(t.hp<=0)return false;
      const half=t.king?36:Math.ceil(t.radius/12)*12,extra=card.structure?card.radius||12:0;
      return Math.abs(t.x-x)<half+extra+1e-7&&Math.abs(t.y-y)<half+extra+1e-7;
    });
  }
  resolveDeployment(team,key,x,y,reserved){
    const card=CARDS[key];if(!card||!inArena(x,y))return null;
    const nearest=snapToCell(team,x,y),available=p=>!reserved?.has(p.x+','+p.y)&&this.canDeploy(team,key,p.x,p.y);
    if(card.spell&&!card.rolling){
      if(!available(nearest))return null;
      const tower=this.towers.find(t=>{const cell=snapToCell(team,t.x,t.y);return t.hp>0&&cell.x===nearest.x&&cell.y===nearest.y;});
      return tower?{x:tower.x,y:tower.y}:nearest;
    }
    if(available(nearest))return nearest;
    const candidates=[];
    for(let row=-4;row<=4;row++)for(let col=-4;col<=4;col++){
      const p={x:nearest.x+col*TILE,y:nearest.y+row*TILE};
      if(distance(p,{x,y})<=4*TILE+1e-7&&available(p))candidates.push(p);
    }
    const direction=team?-1:1;
    candidates.sort((a,b)=>distance(a,{x,y})-distance(b,{x,y})||direction*(a.y-b.y)||direction*(a.x-b.x));
    return candidates[0]||null;
  }
  deploymentPositions(team,key,x,y){
    const card=CARDS[key];
    const anchor=this.resolveDeployment(team,key,x,y);if(!anchor)return[];
    if((card.count||1)===1)return[anchor];
    return formationOffsets(card,team,anchor.x).map((offset,index)=>{
      const member=CARDS[card.squad?.[index]]||card;
      const px=clamp(anchor.x+offset.x,ARENA.left+1,ARENA.right-1),py=clamp(anchor.y+offset.y,ARENA.top+1,ARENA.bottom-1),lane=laneAt(px,team);
      return this.constrainMovement({id:this.nextId+index,team,card:member,radius:member.radius||12,x:px,y:py,lane},px,py);
    });
  }
  deploymentThreats(team,key,x,y,placed=false){
    const card=CARDS[key],point=placed?{x,y}:this.resolveDeployment(team,key,x,y);
    if(!point||card.spell)return[];
    const positions=placed?formationOffsets(card,team,point.x).map(offset=>({x:point.x+offset.x,y:point.y+offset.y})):this.deploymentPositions(team,key,point.x,point.y);
    const previews=positions.map(p=>({...p,team,card,hp:card.hp,radius:card.radius||12,spawn:0}));
    return [...this.towers,...this.units].filter(enemy=>enemy.team!==team&&enemy.hp>0&&isCombatTargetReady(enemy)&&previews.some(preview=>{
      if('king'in enemy)return enemy.active&&distance(enemy,preview)<=attackReach(enemy,preview);
      return this.validTarget(enemy,preview)&&distance(enemy,preview)<=attackReach(enemy,preview);
    }));
  }
  deploy(team, handIndex, x, y) {
    if (this.state !== 'playing'||this.tiebreaker) return { ok: false, reason: this.tiebreaker?'Desempate en curso.':'La partida no está en marcha.' };
    const key = this.hands[team]?.[handIndex];
    const card = CARDS[key];
    if (!card) return { ok: false, reason: 'Elegí una carta.' };
    if (this.energy[team] + .00001 < card.cost) return { ok: false, reason: `Necesitás ${card.cost} de energía.` };
    const placement=this.resolveDeployment(team,key,x,y);
    if(!placement)return{ok:false,reason:card.spell?'Fuera de la arena.':'Zona no disponible.'};
    ({x,y}=placement);
    this.energy[team] = Math.max(0, this.energy[team] - card.cost);
    this.stats[team].energy += card.cost;
    this.hands[team][handIndex] = this.queues[team].shift();
    this.queues[team].push(key);
    if (card.spell) {
      const king=this.towers.find(t=>t.team===team&&t.king);
      const origin={x:king.x,y:king.y};
      const travelTime=card.travelSpeed?distance(origin,{x,y})/card.travelSpeed:0;
      this.spells.push({ visualId:this.nextId++,key, card, team, x, y, castAt:this.elapsed,startX:card.rolling?x:origin.x,startY:card.rolling?y:origin.y,
        delay:card.rolling?0:card.castDelay??.4,flightTime:travelTime,flightElapsed:0,
        travelRemaining:card.rolling?card.travelDistance:0,hitIds:[] });
      this.emit('cast', { key, team, x, y, radius: card.splash,flightTime:travelTime,castDelay:card.castDelay??.4,waves:card.waves||1,waveEvery:card.waveEvery||0 });
    } else {
      const delay=card.deployTime??.75,positions=this.deploymentPositions(team,key,x,y),delays=positions.map((_,i)=>card.memberDelays?.[i]??i*(card.deployStagger||0)),spawnGroup={id:this.nextId,x,y,duration:delay+Math.max(...delays)};
      for (const [i,point] of positions.entries())this.spawn(card.squad?.[i]||key,team,point.x,point.y,delay+delays[i],spawnGroup);
    }
    this.emit('deploy', { team, key, x, y, cost: card.cost });
    return { ok: true, key, x, y };
  }
  spawn(key, team, x, y, delay = .75, spawnGroup = null) {
    const card = CARDS[key];
    const u = { id: this.nextId++, key, card, team, x, y, hp: card.hp, maxHp: card.hp, radius: card.radius || 12, lane: laneAt(x,team), cooldown: 0, spawn: delay, stun: 0, slow: 0, hit: 0, attack: 0, attackDuration: 0, attackSeq: 0, anim: this.random() * 2, dx: 0, dy: team ? 1 : -1, moving: false, target: null, engaged:false,charge: 0, blinkCooldown: 0, stepClock: .2, burn: null, lifetime: card.lifetime || 0 };
    u.createdAt=this.elapsed;
    u.spawnGroup=spawnGroup||{id:u.id,x,y,duration:delay};
    u.spawnGroup.startAt??=this.elapsed;
    if(card.burrow){u.burrowed=true;u.burrowProgress=1;}
    this.units.push(u);
    u.shield=card.shield||0;u.maxShield=u.shield;u.summonClock=card.firstSummon??card.summonEvery??0;u.summonCycle=u.summonClock;u.healClock=card.healEvery||0;u.ttl=card.ttl||0;u.entryPending=!!card.entryDamage;if(card.scale)u.scale=card.scale;
    this.stats[team].deployed++;
    this.emit('spawn', { unit: u });
    if(card.entryShield)for(const ally of this.units)if(ally.team===team&&ally!==u&&ally.hp>0&&distance(ally,u)<100){ally.shield=Math.max(ally.shield||0,card.entryShield);ally.maxShield=Math.max(ally.maxShield||0,ally.shield);}
    if(card.spawnWith){const baby=this.spawn(card.spawnWith,team,clamp(x+24,ARENA.left+1,ARENA.right-1),y+12,delay,u.spawnGroup);baby.parentId=u.id;}
    return u;
  }
  damage(target, amount, team, { stun = 0, freeze = 0, slow = 0, slowFactor = .7, slowAttackFactor = .7, burn = 0, burnKind = 'fire', dot = false, sourceId = 0, sourceKey = '', reflected = false, poisonField = 0, affectsHidden = false } = {}) {
    if (target.hp <= 0 || this.state !== 'playing'||target.burrowed&&!affectsHidden||target.dash?.phase==='travel'&&target.card?.dashInvulnerable) return;
    amount*=1-(target.card?.armor||0);const shielded=target.shield>0,absorbed=Math.min(target.shield||0,amount);target.shield=Math.max(0,(target.shield||0)-absorbed);amount=shielded?0:amount;
    const actual = Math.min(target.hp, amount)+absorbed;
    target.hp = Math.max(0, target.hp - amount);
    target.hit = .24;
    target.stun = Math.max(target.stun, stun);
    target.freeze=Math.max(target.freeze||0,freeze);
    target.slow = Math.max(target.slow || 0, slow);
    if(slow>0){target.slowFactor=slowFactor;target.slowAttackFactor=slowAttackFactor;}
    if (stun > 0 && freeze<=0) {
      const interrupted=this.attacks.some(job=>job.attacker===target&&job.seq===target.attackSeq&&!job.done&&job.shot===0);
      target.attackSeq++;target.attack=0;target.charge=0;target.chargeTravel=0;target.target=null;target.engaged=false;
      // A canceled first strike can restart after the stun, without waiting an unused attack cycle.
      target.cooldown=interrupted?stun:Math.max(target.cooldown,stun);
    }
    if (burn > 0) target.burn = { remaining: 3, tick: .5, damage: burn, team, kind: burnKind,sourceId,sourceKey };
    this.stats[team].damage += actual;
    if(actual>0)this.emit('damage', { target, amount: actual, dot,sourceId,sourceKey });
    if(target.card?.structure)target.lifetime=target.card.lifetime*target.hp/target.maxHp;
    if(poisonField&&!dot)this.addField(target.x,target.y,team,poisonField,sourceId);
    if(target.card?.reflect&&sourceId&&!reflected&&!dot&&actual>0){const attacker=this.units.find(u=>u.id===sourceId)||this.towers.find(t=>t.id===sourceId);if(attacker?.hp>0){this.emit('counter',{unit:target,from:aimPoint(target),to:aimPoint(attacker)});this.damage(attacker,actual*target.card.reflect,target.team,{reflected:true,sourceId:target.id,sourceKey:target.key});}}
    if (target.king && actual > 0) target.active = true;
    if (target.hp <= 0) {
      if ('king' in target) {
        const king = this.towers.find(t => t.team === target.team && t.king);
        if(!target.king)king.active = true;
        this.emit('towerDown', { tower: target, team, crowns: this.crowns(team) });
        if (target.king || this.overtime) this.finish(team, target.king ? 'Torre central destruida' : 'Primera torre en tiempo extra');
      } else this.unitDeath(target,team);
    }
  }
  unitDeath(target,team){
        if(target.deathHandled)return;
        target.deathHandled=true;
        this.stats[team].defeated++; this.emit(target.card.structure ? 'structureDown' : 'faint', { unit: target });
        if(target.card.deathDamage){
          const radius=target.card.deathRadius||64;this.emit('deathBurst',{unit:target,radius,groundOnly:!target.card.deathAir});
          for(const other of [...this.units,...this.towers])if(other.team!==target.team&&other.hp>0&&(!other.card?.flying||target.card.deathAir)&&spellOverlapsTarget({splash:radius},target,other)){
            this.damage(other,target.card.deathDamage,target.team,{sourceId:target.id,sourceKey:target.key});
            if(target.card.deathKnockback&&other.card){const d=distance(target,other)||1;this.pushUnit(other,(other.x-target.x)/d*target.card.deathKnockback,(other.y-target.y)/d*target.card.deathKnockback);}
          }
        }
        if(target.card.deathSpawn)this.spawnReinforcements(target,target.card.deathSpawn,target.card.deathCount||1,target.card.deathSpawnDelay??.4,{death:true});
        if(target.card.deathField)this.addField(target.x,target.y,target.team,target.card.deathField,target.id);
        if(target.card.deathHeal)this.healNearby(target,target.card.deathHeal,125,true);
        if(target.card.deathStun){this.emit('deathBurst',{unit:target,radius:100,style:'lightning',groundOnly:false});for(const other of this.units)if(other.team!==target.team&&other.hp>0&&distance(other,target)<100)this.damage(other,0,target.team,{stun:target.card.deathStun,sourceId:target.id});}
  }
  retireUnit(unit){if(unit.hp<=0||unit.deathHandled)return;unit.hp=0;this.unitDeath(unit,1-unit.team);}
  pushUnit(unit,dx,dy,{force=false}={}){
    const immune=unit.card?.knockbackImmune??CARDS[unit.key]?.knockbackImmune;
    if(!unit.card||unit.card.structure||unit.hp<=0||unit.leap||unit.dash?.phase==='travel'&&unit.card.dashInvulnerable||immune&&!force)return false;
    const point=this.constrainMovement(unit,unit.x+dx,unit.y+dy);
    if(unit.key==='golem'&&Math.hypot(point.x-unit.x,point.y-unit.y)>1e-7)unit.pushHurt=.24;
    unit.x=point.x;unit.y=point.y;
    // A push invalidates preparation, not the remaining attack cooldown.
    // Keep the target so the unit can finish approaching after displacement.
    unit.attackSeq++;unit.attack=0;unit.charge=0;unit.chargeTravel=0;unit.dash=null;return true;
  }
  spawnReinforcements(owner,key,count,delay=.5,{death=false}={}){
    if(owner.card?.nativeReference)return this.spawnNativeReinforcements(owner,key,count,delay,death);
    const children=[],spawnGroup={id:this.nextId,x:owner.x,y:owner.y+(owner.team?1:-1)*(owner.card?.structure?42:24),duration:delay};
    for(let i=0;i<count&&this.units.filter(u=>u.hp>0).length<160;i++){
      const spacing=owner.card?.summonSpacing||0,offset=spacing?0:(i-(count-1)/2)*TILE;
      const point=this.reinforcementPoint(key,owner.x+offset,owner.y+(owner.team?1:-1)*(owner.card?.structure?42:24));
      if(!point)continue;
      if(spacing&&i){this.reinforcements.push({key,team:owner.team,x:point.x,y:point.y,parentId:owner.id,delay:i*spacing,spawnDelay:delay,spawnGroup,requiresParent:owner.hp>0});continue;}
      const child=this.spawn(key,owner.team,point.x,point.y,delay,spawnGroup);child.parentId=owner.id;children.push(child);
    }
    return children;
  }
  nativeEmissionPoint(owner,key){
    const d=owner.radius+(CARDS[key].radius||12),point={x:owner.x,y:owner.y+(owner.team?1:-1)*d},r=CARDS[key].radius||12;
    if([[-r,0],[r,0],[0,-r],[0,r]].some(([x,y])=>arenaBits(point.x+x,point.y+y)&32))return{x:owner.x+(owner.x<W/2?-d:d),y:owner.y};
    return point;
  }
  spawnNativeReinforcements(owner,key,count,delay,death){
    const c=owner.card,spacing=death?0:c.summonSpacing||0,emission=this.nativeEmissionPoint(owner,key),group={id:this.nextId,x:owner.x,y:owner.y,duration:delay+(count-1)*spacing},children=[];
    for(let i=0;i<count&&this.units.filter(u=>u.hp>0).length<160;i++){
      let point;
      if(death){
        if(c.deathAtEmission)point=emission;
        else{const radius=c.deathSpawnSlide?6:c.deathSpawnRadius||0,angle=-(i+1)*Math.PI*2/count;point={x:owner.x+Math.cos(angle)*radius,y:owner.y-Math.sin(angle)*radius};}
      }else if(c.summonRadius){const angle=(count-1-i)*Math.PI*2/count;point={x:owner.x+Math.cos(angle)*c.summonRadius,y:owner.y-Math.sin(angle)*c.summonRadius};}
      else point=emission;
      point=this.reinforcementPoint(key,point.x,point.y);if(!point)continue;
      if(spacing&&i){this.reinforcements.push({key,team:owner.team,x:point.x,y:point.y,parentId:owner.id,delay:i*spacing,spawnDelay:delay,spawnGroup:group,requiresParent:true});continue;}
      const child=this.spawn(key,owner.team,point.x,point.y,delay,group);child.parentId=owner.id;children.push(child);
      if(death&&c.deathSpawnSlide){
        const angle=-(i+1)*Math.PI*2/count,end=this.reinforcementPoint(key,owner.x+Math.cos(angle)*c.deathSpawnRadius,owner.y-Math.sin(angle)*c.deathSpawnRadius)||point;
        child.deathSlide={startX:point.x,startY:point.y,endX:end.x,endY:end.y,elapsed:0,duration:.25};
      }
    }
    return children;
  }
  stepDeathSlide(unit,dt){
    const slide=unit.deathSlide;if(!slide)return;
    slide.elapsed+=unit.createdAt===this.elapsed?0:dt;const t=Math.min(1,slide.elapsed/slide.duration);
    // Native first frame is radius250, the next650, then +250 per50ms.
    const phase=slide.elapsed/.05,weights=[0,.32,.52,.72,.92,1],index=Math.min(4,Math.floor(phase)),fraction=Math.min(1,phase-index),progress=t>=1?1:weights[index]+(weights[index+1]-weights[index])*fraction;
    unit.x=slide.startX+(slide.endX-slide.startX)*progress;unit.y=slide.startY+(slide.endY-slide.startY)*progress;
    unit.moving=true;if(t>=1)unit.deathSlide=null;
  }
  reinforcementPoint(key,x,y,reserved=[]){
    const card=CARDS[key],radius=card.radius||12,candidates=[];
    for(let row=-3;row<=3;row++)for(let col=-3;col<=3;col++){
      const p={x:clamp(x+col*18,ARENA.left+1,ARENA.right-1),y:clamp(y+row*18,ARENA.top+1,ARENA.bottom-1)};
      if(reserved.some(other=>distance(p,other)<radius*1.4))continue;
      if(!card.flying&&p.y>RIVER.top-4&&p.y<RIVER.bottom+4&&!LANES.some(lane=>Math.abs(lane-p.x)<BRIDGE.halfWidth))continue;
      if(!card.flying&&[...this.towers,...this.units.filter(u=>u.card.structure)].some(t=>t.hp>0&&distance(p,t)<t.radius+radius))continue;
      candidates.push(p);
    }
    candidates.sort((a,b)=>distance(a,{x,y})-distance(b,{x,y}));return candidates[0]||null;
  }
  summonSpell(spell){
    const card=spell.card,points=[],delay=card.spawnDeployTime??.4,group={id:this.nextId,x:spell.x,y:spell.y,duration:delay};
    for(let i=0;i<card.spawnTotal&&this.units.filter(u=>u.hp>0).length<160;i++){
      const angle=-Math.PI/2+i*2*Math.PI/card.spawnTotal+(spell.team?Math.PI:0),radius=card.spawnRadius;
      const point=this.reinforcementPoint(card.spawnKey,spell.x+Math.cos(angle)*radius,spell.y+Math.sin(angle)*radius,points);
      if(point){points.push(point);this.spawn(card.spawnKey,spell.team,point.x,point.y,delay,group);}
    }
  }
  finish(winner, reason) {
    if (this.state === 'ended') return;
    this.state = 'ended'; this.winner = winner; this.reason = reason;
    this.emit('end', { winner, reason });
  }
  endClock() {
    const a = this.crowns(0), b = this.crowns(1);
    if (a !== b) { this.finish(a > b ? 0 : 1, 'Más torres destruidas'); return; }
    if (!this.overtime) {
      this.overtime = true; this.time = 120; this.emit('overtime');
    } else {
      this.tiebreaker=true;this.time=0;this.attacks=[];this.projectiles=[];this.spells=[];this.fields=[];this.reinforcements=[];for(const unit of this.units){unit.attack=0;unit.moving=false;}this.emit('tiebreaker');
    }
  }
  healNearby(unit,amount,radius,all=false){
    let allies=this.units.filter(u=>u!==unit&&u.team===unit.team&&u.hp>0&&u.hp<u.maxHp&&!u.card.structure&&distance(u,unit)<=radius).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
    if(!all)allies=allies.slice(0,1);
    for(const ally of allies){const restored=Math.min(amount,ally.maxHp-ally.hp);ally.hp+=restored;if(unit.card.cleanse){ally.burn=null;ally.slow=0;}this.emit('heal',{unit:ally,amount:restored});}
  }
  stepSummons(unit,dt){
    const c=unit.card;
    if(c.summonRequiresEnemy){
      const nearby=this.units.some(target=>!target.card.structure&&this.validTarget(unit,target)&&distance(unit,target)<=attackReach(unit,target));
      if(!nearby){unit.summonActive=false;unit.summonClock=c.firstSummon;return;}
      if(!unit.summonActive){unit.summonActive=true;unit.summonClock=c.firstSummon;}
    }
    unit.summonClock-=dt;if(unit.summonClock>1e-7)return;
    unit.summonClock+=c.summonEvery;unit.summonCycle=c.summonEvery;
    const alive=this.units.filter(child=>child.parentId===unit.id&&child.hp>0).length,count=Math.max(0,Math.min(c.summonCount||1,(c.summonMax>0?c.summonMax:160)-alive));
    if(c.summonOwnerOffset&&count){
      const direction=unit.team?1:-1,offset=c.summonOwnerOffset,point=this.reinforcementPoint(c.summon,unit.x+offset.x*direction,unit.y+offset.y*direction);
      if(point){const child=this.spawn(c.summon,unit.team,point.x,point.y,c.summonDeployTime);child.parentId=unit.id;}
    }else if(c.summonOffset&&count){
      unit.summonSide=-(unit.summonSide||1);const angle=(unit.team?Math.PI/2:-Math.PI/2)+unit.summonSide*c.summonAngle*Math.PI/180;
      const child=this.spawn(c.summon,unit.team,clamp(unit.x+Math.cos(angle)*c.summonOffset,ARENA.left+1,ARENA.right-1),clamp(unit.y+Math.sin(angle)*c.summonOffset,ARENA.top+1,ARENA.bottom-1),c.summonDeployTime??.5);child.parentId=unit.id;
    }else this.spawnReinforcements(unit,c.summon,count,c.summonDeployTime??.5);
  }
  addField(x,y,team,damage,sourceId){
    const existing=this.fields.find(f=>f.team===team&&f.sourceId===sourceId&&Math.hypot(f.x-x,f.y-y)<50);
    if(existing){existing.life=3;return;}if(this.fields.length>=24)this.fields.shift();
    const owner=this.units.find(u=>u.id===sourceId);this.fields.push({x,y,team,damage,sourceId,sourceKey:owner?.key||'',style:owner?.card.fieldStyle||'poison',air:!!(owner?.card.air||owner?.card.flying),life:3,tick:.5,radius:48});
  }
  spellField(spell){
    const c=spell.card,startAt=c.spawnSchedule?spell.castAt??this.elapsed:this.elapsed;
    if(c.nativePull){
      const castAt=spell.castAt??this.elapsed,endAt=castAt+c.fieldStep+c.fieldDuration;
      this.fields.push({id:this.nextId++,key:spell.key,x:spell.x,y:spell.y,team:spell.team,radius:c.splash,style:c.style,air:!c.groundOnly,nativePull:true,duration:c.fieldDuration,life:endAt-this.elapsed,startAt:castAt+c.fieldStep,endAt,nextPullAt:castAt+c.fieldStep*2,pullSteps:0,step:c.fieldStep,pullPercent:c.pullPercent,pulse:c.fieldPulseDamage,towerPulse:c.fieldPulseTowerDamage,pulseEvery:c.fieldTick,buffDuration:c.buffDuration,slots:[]});return;
    }
    this.fields.push({id:this.nextId++,key:spell.key,x:spell.x,y:spell.y,team:spell.team,radius:c.splash,style:c.style,damage:c.fieldDamage||0,
      duration:c.fieldDuration,life:Math.max(0,c.fieldDuration-(this.elapsed-startAt)),tick:c.fieldTick||.5,air:!c.groundOnly,pull:c.pull||0,airMultiplier:c.airMultiplier||1,
      buildingMultiplier:c.buildingMultiplier||1,towerDamage:c.fieldTowerDamage||0,slow:c.fieldSlow||0,slowFactor:c.fieldSlowFactor??.7,slowAttackFactor:c.fieldSlowAttackFactor??1,affectsHidden:!!c.affectsHidden,
      spawnKey:c.spawnKey,spawnEvery:c.spawnEvery,spawnTotal:c.spawnTotal||0,spawned:0,spawnClock:0,
      startAt,spawnSchedule:c.spawnSchedule,fieldTick:c.fieldTick||.5,buildingDamage:c.fieldBuildingDamage||0});
  }
  stepFields(dt){
    this.stepNativePulls();
    for(const f of this.fields){
      if(f.nativePull){f.life=Math.max(0,f.endAt-this.elapsed);continue;}
      const active=Math.min(dt,Math.max(0,f.life));f.life=Math.max(0,f.life-active);f.tick-=active;
      const targets=[...this.units,...this.towers].filter(t=>t.team!==f.team&&t.hp>0&&(!t.burrowed||f.affectsHidden)&&isCombatTargetReady(t)&&(!t.card?.flying||f.air)&&(f.key?spellOverlapsTarget(f,f,t):distance(t,f)<f.radius+(t.radius||0)));
      for(const target of targets)if(target.card){
        if(f.slow){target.slow=Math.max(target.slow||0,f.slow);target.slowFactor=f.slowFactor??.7;target.slowAttackFactor=f.slowAttackFactor??1;}
        if(f.pull&&!target.card.structure&&!target.leap){
          const d=distance(target,f)||1,amount=Math.min(d,f.pull*active),p={x:clamp(target.x+(f.x-target.x)/d*amount,ARENA.left+1,ARENA.right-1),y:clamp(target.y+(f.y-target.y)/d*amount,ARENA.top+1,ARENA.bottom-1)};
          const blocked=!target.card.flying&&((p.y>RIVER.top-4&&p.y<RIVER.bottom+4&&!LANES.some(lane=>Math.abs(lane-p.x)<BRIDGE.halfWidth))||[...this.towers,...this.units.filter(u=>u.card.structure)].some(t=>t.hp>0&&distance(p,t)<t.radius+target.radius));
          if(!blocked){target.x=p.x;target.y=p.y;}
        }
      }
      while(f.tick<=1e-7){
        f.tick+=f.fieldTick||.5;
        for(const target of targets){
          const amount='king'in target?(f.towerDamage||0):target.card.structure&&f.buildingDamage?f.buildingDamage:f.damage*(target.card.structure?(f.buildingMultiplier||1):target.card.flying?(f.airMultiplier||1):1);
          if(amount>0)this.damage(target,amount*(f.fieldTick||.5),f.team,{dot:true,sourceId:f.sourceId||0,sourceKey:f.key||f.sourceKey||'',affectsHidden:f.affectsHidden});
        }
      }
      if(f.spawnKey&&f.spawnSchedule){
        const age=this.elapsed-f.startAt;
        while(f.spawned<f.spawnSchedule.length&&age+1e-7>=f.spawnSchedule[f.spawned].at){
          const entry=f.spawnSchedule[f.spawned++],mirror=f.x<=W/2?1:-1,direction=f.team?1:-1;
          const point=this.reinforcementPoint(f.spawnKey,f.x+entry.x*mirror,f.y+entry.y*direction);
          if(point&&this.units.filter(u=>u.hp>0).length<160)this.spawn(f.spawnKey,f.team,point.x,point.y,entry.deploy);
        }
      }else if(f.spawnKey){
        f.spawnClock-=active;
        while(f.spawnClock<=1e-7&&f.spawned<f.spawnTotal){
          f.spawnClock+=f.spawnEvery;f.spawned++;
          const angle=this.random()*Math.PI*2,r=Math.sqrt(this.random())*f.radius*.85;
          const point=this.reinforcementPoint(f.spawnKey,f.x+Math.cos(angle)*r,f.y+Math.sin(angle)*r);
          if(point&&this.units.filter(u=>u.hp>0).length<160)this.spawn(f.spawnKey,f.team,point.x,point.y,.45);
        }
      }
    }
    this.fields=this.fields.filter(f=>f.life>1e-7);
  }
  stepNativePulls(){
    const fields=this.fields.filter(f=>f.nativePull),eps=1e-7;
    for(;;){
      const due=fields.filter(f=>f.pullSteps<Math.round(f.duration/f.step)&&f.nextPullAt<=this.elapsed+eps);
      if(!due.length)break;
      const at=Math.min(...due.map(f=>f.nextPullAt)),batch=due.filter(f=>f.nextPullAt<=at+eps),pulls=new Map(),damage=[];
      for(const f of batch){
        const targets=[...this.units,...this.towers].filter(t=>t.team!==f.team&&t.hp>0&&!t.burrowed&&isCombatTargetReady(t)&&(!t.card?.flying||f.air)&&spellOverlapsTarget(f,f,t));
        for(const target of targets){
          let slot=f.slots.find(s=>s.id===target.id);
          if(!slot){slot={id:target.id,nextPulse:at+f.pulseEvery-f.step};f.slots.push(slot);}
          slot.until=at+f.buffDuration;
          if(!target.card||target.card.structure||target.leap)continue;
          const d=distance(target,f);if(d<eps)continue;
          const amount=(target.card.pullSpeed??target.card.speed)*f.pullPercent/100*f.step,p=pulls.get(target)||{x:0,y:0,sources:0};
          p.x+=(f.x-target.x)/d*amount;p.y+=(f.y-target.y)/d*amount;p.sources++;pulls.set(target,p);
        }
        f.slots=f.slots.filter(s=>s.until>=at-eps);
        for(const slot of f.slots)if(slot.nextPulse<=at+eps){
          const target=[...this.units,...this.towers].find(t=>t.id===slot.id&&t.hp>0);
          if(target)damage.push({f,target,amount:'king'in target?f.towerPulse:f.pulse});
          slot.nextPulse+=f.pulseEvery;
        }
        f.pullSteps++;f.nextPullAt+=f.step;
      }
      for(const[target,pull]of pulls){
        const contacts=this.units.filter(other=>other!==target&&other.hp>0&&other.spawn<=0&&!!other.card.flying===!!target.card.flying&&distance(target,other)<target.radius+other.radius).length;
        const divisor=pull.sources+contacts,point=pullPosition(target,target.x+pull.x/divisor,target.y+pull.y/divisor);
        // Static bodies remain solid; preserve a free tangent axis.
        const bodies=[...this.towers,...this.units.filter(u=>u.card.structure)].filter(t=>t.hp>0);
        const blocked=p=>bodies.some(t=>distance(p,t)<t.radius+target.radius-1e-7);
        if(blocked(point)){if(!blocked({x:point.x,y:target.y}))target.x=point.x;else if(!blocked({x:target.x,y:point.y}))target.y=point.y;}
        else{target.x=point.x;target.y=point.y;}
      }
      for(const{f,target,amount}of damage)this.damage(target,amount,f.team,{dot:true,sourceKey:f.key});
    }
  }
  startLeap(unit,target){
    if(!unit.card.jumpRange||unit.leap||unit.cooldown>1e-7||distance(unit,target)>attackReach(unit,target,unit.card.jumpRange))return false;
    const onBridge=LANES.some(lane=>Math.abs(unit.x-lane)<BRIDGE.halfWidth&&Math.abs(target.x-lane)<BRIDGE.halfWidth);
    if(!unit.card.nativeReference&&!onBridge&&((unit.y<RIVER.top&&target.y>RIVER.top)||(unit.y>RIVER.bottom&&target.y<RIVER.bottom)))return false;
    this.face(unit,target);unit.target=target;unit.engaged=true;
    const duration=unit.card.jumpDuration??Math.max(.05,distance(unit,target)/(unit.card.projectileSpeed||480));
    unit.leap={startX:unit.x,startY:unit.y,endX:target.x,endY:target.y,elapsed:0,duration,prepare:unit.card.nativeReference?unit.card.windup:0};
    unit.attack=unit.attackDuration=unit.attackWindup=unit.leap.prepare;
    if(!unit.leap.prepare)this.emit('leap',{unit,from:{x:unit.x,y:unit.y},to:{x:target.x,y:target.y}});return true;
  }
  startRiverJump(unit,target){
    if(!unit.card.riverJump||unit.leap||unit.attack>0||LANES.some(x=>Math.abs(unit.x-x)<BRIDGE.halfWidth))return false;
    const upward=unit.y>=RIVER.bottom&&target.y<RIVER.top,downward=unit.y<=RIVER.top&&target.y>RIVER.bottom;
    if(!upward&&!downward)return false;
    const bank=upward?RIVER.bottom:RIVER.top;
    if(Math.abs(unit.y-bank)>12)return false;
    const endY=upward?RIVER.top-8:RIVER.bottom+8,ratio=(endY-unit.y)/(target.y-unit.y);
    const point=this.reinforcementPoint(unit.key,unit.x+(target.x-unit.x)*ratio,endY);
    if(!point||(upward?point.y>=RIVER.top:point.y<=RIVER.bottom))return false;
    this.face(unit,point);unit.attackSeq++;unit.attack=0;unit.moving=true;
    unit.leap={kind:'river',startX:unit.x,startY:unit.y,endX:point.x,endY:point.y,elapsed:0,duration:unit.card.riverJumpSpeed?distance(unit,point)/unit.card.riverJumpSpeed:.6};
    this.emit('leap',{unit,from:{x:unit.x,y:unit.y},to:point});return true;
  }
  stepLeap(unit,dt){
    const leap=unit.leap;
    if(leap.prepare>0){leap.prepare=Math.max(0,leap.prepare-dt);if(leap.prepare<=1e-7){leap.prepare=0;this.emit('leap',{unit,from:{x:leap.startX,y:leap.startY},to:{x:leap.endX,y:leap.endY}});}return;}
    leap.elapsed=Math.min(leap.duration,leap.elapsed+dt);
    const p=leap.elapsed/leap.duration;unit.x=leap.startX+(leap.endX-leap.startX)*p;unit.y=leap.startY+(leap.endY-leap.startY)*p;
    if(p<1)return;
    unit.leap=null;
    if(leap.kind==='river'){const point=this.constrainMovement(unit,unit.x,unit.y);unit.x=point.x;unit.y=point.y;unit.moving=true;return;}
    const from=this.muzzle(unit),to={x:unit.x,y:unit.y-15};
    this.emit('attackRelease',{attacker:unit,target:unit.target,key:unit.key,style:'lightning',from,to,shot:0});
    if(unit.card.chain){
      let last=unit;const hits=new Set();
      for(let index=0;index<=unit.card.chain;index++){
        const victim=[...this.units,...this.towers].filter(t=>this.validTarget(unit,t)&&!hits.has(t.id)&&distance(last,t)<=(unit.card.chainRange||72)+(t.radius||0)).sort((a,b)=>distance(last,a)-distance(last,b))[0];
        if(!victim)break;this.strike(unit,victim,unit.card.damage,unit.card);this.emit('beam',{from:aimPoint(last),to:aimPoint(victim),key:unit.key,style:'lightning',team:unit.team,sourceId:unit.id,chainFromId:last.id,targetId:victim.id,shot:index});hits.add(victim.id);last=victim;
      }
    }else for(const target of[...this.units,...this.towers])if(this.validTarget(unit,target)&&spellOverlapsTarget(unit.card,unit,target))this.strike(unit,target,unit.card.damage,unit.card);
    if(!unit.card.chain){this.emit('deathBurst',{unit,radius:unit.card.splash});this.emit('hit',{x:unit.x,y:unit.y-15,key:unit.key,style:'lightning',team:unit.team});}
    this.retireUnit(unit);
  }
  validTarget(unit, target) {
    return !!(target && target.hp > 0 && !target.burrowed && target.team !== unit.team && (!target.card?.flying || unit.card.air) && (!unit.card.building || 'king' in target || target.card?.structure) && isCombatTargetReady(target));
  }
  updateBurrows(dt){
    for(const unit of this.units){
      if(!unit.card.burrow||unit.hp<=0)continue;
      const hidden=unit.spawn>0||![...this.units,...this.towers].some(target=>this.validTarget(unit,target)&&distance(unit,target)<=attackReach(unit,target));
      if(hidden!==unit.burrowed){
        unit.burrowed=hidden;unit.attackSeq++;unit.attack=0;unit.target=null;unit.engaged=false;
        if(!hidden)unit.cooldown=Math.max(unit.cooldown,.3);
        this.emit('burrow',{unit,hidden});
      }
      const goal=hidden?1:0,value=unit.burrowProgress??goal;
      unit.burrowProgress=value+clamp(goal-value,-dt*5,dt*5);
    }
  }
  withinPullLane(unit,target){
    const reach=(unit.radius>TILE/2?2:1)*TILE;
    return (target.x-W/2)*(unit.lane===0?1:-1)<=reach+1e-7;
  }
  acquire(unit) {
    if(unit.card.building&&!unit.engaged){
      const pull=this.units.filter(t=>t.card.structure&&this.validTarget(unit,t)&&this.withinPullLane(unit,t)&&distance(unit,t)<=attackReach(unit,t,unit.card.pullRange||300)&&(unit.team?t.y>=unit.y-48:t.y<=unit.y+48)).sort((a,b)=>distance(unit,a)-distance(unit,b));
      if(pull.length)return pull[0];
    }
    const candidates=[...this.towers,...this.units].filter(t=>{
      if(!this.validTarget(unit,t))return false;
      if(unit.card.building&&t.card?.structure&&!this.withinPullLane(unit,t))return false;
      if(unit.card.structure)return distance(unit,t)<=attackReach(unit,t);
      return 'king'in t||distance(unit,t)<=(t.card.structure?(unit.card.building?attackReach(unit,t,unit.card.pullRange||300):sightReach(unit,t)):sightReach(unit,t));
    });
    candidates.sort((a,b)=>distance(unit,a)-distance(unit,b));return candidates[0]||null;
  }
  waypoint(unit, target) {
    if (unit.card.flying||unit.card.riverJump) return target;
    const bridge = LANES[unit.lane];
    if (unit.y > RIVER.bottom && target.y < RIVER.bottom) return Math.abs(unit.x - bridge) >= BRIDGE.halfWidth ? { x: bridge, y: RIVER.bottom + 20 } : { x: bridge, y: RIVER.top - 20 };
    if (unit.y < RIVER.top && target.y > RIVER.top) return Math.abs(unit.x - bridge) >= BRIDGE.halfWidth ? { x: bridge, y: RIVER.top - 20 } : { x: bridge, y: RIVER.bottom + 20 };
    if (unit.y >= RIVER.top && unit.y <= RIVER.bottom) return { x: bridge, y: target.y < unit.y ? RIVER.top - 20 : RIVER.bottom + 20 };
    return target;
  }
  move(unit, target, dt) {
    if(unit.deathSlide)return;
    if(this.startRiverJump(unit,target))return;
    const goal = this.waypoint(unit, target);
    let dx = goal.x - unit.x, dy = goal.y - unit.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    dx /= d; dy /= d;
    let speed = (unit.card.speed?(unit.card.stompMoveFor?unit.card.moveSpeed:unit.card.speed):0) * (unit.slow > 0 ? unit.slowFactor??.7 : 1) * (charged(unit) ? unit.card.chargeSpeed||1.65 : 1);
    if(unit.card.stompMoveFor&&unit.card.stompWait){
      const moving=unit.card.stompMoveFor,period=moving+unit.card.stompWait,start=unit.stompClock||0;
      const total=t=>Math.floor(t/period)*moving+Math.min(moving,t%period);
      speed*=(total(start+dt)-total(start))/dt;unit.stompClock=start+dt;
    }
    if(speed<=0)return;
    // Steer around bodies before separating overlaps. Pure backward repulsion can
    // cancel a slow tank's entire movement when another body occupies its lane.
    const obstacles=[...this.units.filter(other=>other!==unit&&other.hp>0&&other.spawn<=0&&!!other.card.flying===!!unit.card.flying),...(!unit.card.flying?this.towers.filter(t=>t.hp>0):[])];
    const ahead=obstacles.filter(other=>other!==target).map(other=>{
      const ox=other.x-unit.x,oy=other.y-unit.y,solid='king'in other||other.card.structure;
      return{other,forward:ox*dx+oy*dy,side:ox*(-dy)+oy*dx,gap:solid?other.radius+unit.radius:(unit.radius+other.radius)};
    }).filter(o=>o.forward>0&&o.forward<o.gap+30&&Math.abs(o.side)<o.gap+3).sort((a,b)=>a.forward-b.forward);
    const blocking=ahead[0],forwardX=dx,forwardY=dy;
    const crowd=ahead.filter(o=>o.other.card&&!o.other.card.structure&&o.forward<o.gap+14).length;
    speed*=Math.max(.38,1-crowd*.14);
    if(blocking){
      // Hold the passing side across neighboring bodies in the same crowd.
      // Picking a new side for every nearest-body change caused frame-rate zigzags.
      let side=unit.avoidSide|| (Math.abs(blocking.side)>3?-Math.sign(blocking.side):unit.id%2?1:-1);
      if(!unit.card.flying&&unit.y>RIVER.top-35&&unit.y<RIVER.bottom+35){
        const bridge=LANES[unit.lane];
        const preferred=blocking.other.x-dy*side*(blocking.gap+2),opposite=blocking.other.x+dy*side*(blocking.gap+2);
        if(!unit.avoidSide&&Math.abs(preferred-bridge)>=BRIDGE.halfWidth&&Math.abs(opposite-bridge)<BRIDGE.halfWidth)side=-side;
      }
      unit.avoidId=blocking.other.id;unit.avoidSide=side;unit.avoidClear=0;
      const weight=Math.max(.4,1-blocking.forward/(blocking.gap+30))*1.35;
      const sx=dx-dy*side*weight,sy=dy+dx*side*weight,length=Math.hypot(sx,sy);
      dx=sx/length;dy=sy/length;
    }else{unit.avoidClear=(unit.avoidClear||0)+dt;if(unit.avoidClear>.45){unit.avoidId=null;unit.avoidSide=0;}}
    const blend=1-Math.exp(-9*dt),sameTarget=unit.steerTarget===target.id;
    const sx=sameTarget&&Number.isFinite(unit.steerX)?unit.steerX:dx,sy=sameTarget&&Number.isFinite(unit.steerY)?unit.steerY:dy;
    dx=sx+(dx-sx)*blend;dy=sy+(dy-sy)*blend;
    const heading=Math.hypot(dx,dy)||1;dx/=heading;dy/=heading;
    unit.steerX=dx;unit.steerY=dy;unit.steerTarget=target.id;
    let nx = unit.x + dx * Math.min(d, speed * dt), ny = unit.y + dy * Math.min(d, speed * dt);
    let separateX=0,separateY=0;
    // Body separation is a bounded velocity, not an independent positional jump
    // for every neighbor. Large bodies can gently displace smaller defenders.
    for (const other of this.units) {
      if (other === unit || other.hp <= 0 || other.spawn > 0 || other.card.structure || !!other.card.flying !== !!unit.card.flying) continue;
      let ox=nx-other.x,oy=ny-other.y,od=Math.hypot(ox,oy);
      if(od<1e-7){
        const first=unit.id<other.id?unit:other,sign=(unit.id<other.id?1:-1)*(first.team?-1:1);
        const angle=((unit.id+other.id)%8)*Math.PI/4;ox=Math.cos(angle)*sign;oy=Math.sin(angle)*sign;od=1;
      }
      const gap = (unit.radius + other.radius);
      if (od > .1 && od < gap) {
        const share=other.radius**2/(unit.radius**2+other.radius**2),push=Math.min((gap-od)*4,24);
        separateX+=ox/od*push*share;separateY+=oy/od*push*share;
        if(unit.radius>other.radius*1.12){
          const shifted=this.constrainMovement(other,other.x-ox/od*push*(1-share)*dt,other.y-oy/od*push*(1-share)*dt);
          other.x=shifted.x;other.y=shifted.y;
        }
      }
    }
    unit.separateX=(unit.separateX||0)+(separateX-(unit.separateX||0))*blend;
    unit.separateY=(unit.separateY||0)+(separateY-(unit.separateY||0))*blend;
    const separation=Math.hypot(unit.separateX,unit.separateY)||1,limit=Math.min(1,speed*.7/separation);
    let pushX=unit.separateX*limit*dt,pushY=unit.separateY*limit*dt;
    const retreat=pushX*forwardX+pushY*forwardY,advance=(nx-unit.x)*forwardX+(ny-unit.y)*forwardY;
    if(retreat < -Math.max(0,advance)*.65){const excess=-Math.max(0,advance)*.65-retreat;pushX+=forwardX*excess;pushY+=forwardY*excess;}
    nx+=pushX;ny+=pushY;
    const placed=this.constrainMovement(unit,nx,ny);
    unit.chargeTravel=(unit.chargeTravel||0)+Math.hypot(placed.x-unit.x,placed.y-unit.y);
    unit.x=placed.x;unit.y=placed.y;
    unit.dx = dx; unit.dy = dy; unit.moving = true;
    unit.charge += dt;
    unit.stepClock -= dt;
    if (!unit.card.flying && unit.stepClock <= 0) {
      unit.stepClock = unit.key === 'snorlax' ? .65 : unit.key === 'eevee' ? .22 : .38;
      this.emit('step', { unit });
    }
  }
  constrainMovement(unit,nx,ny){
    if (!unit.card.flying) {
      for (const tower of [...this.towers, ...this.units.filter(u => u !== unit && u.card.structure)]) {
        if (tower.hp <= 0) continue;
        let tx = nx - tower.x, ty = ny - tower.y, td = Math.hypot(tx, ty);
        const gap = tower.radius + unit.radius;
        if (td < gap) {
          if (td < 1e-7) tx = unit.id % 2 ? 1 : -1;
          td = Math.hypot(tx, ty) || 1;
          nx = tower.x + tx / td * gap; ny = tower.y + ty / td * gap;
        }
      }
      if (ny >= RIVER.top - 3 && ny <= RIVER.bottom + 3 && Math.min(...LANES.map(x => Math.abs(nx - x))) >= BRIDGE.halfWidth) {
        if(Math.abs(unit.x-LANES[unit.lane])<=BRIDGE.halfWidth+1e-7)nx=clamp(nx,LANES[unit.lane]-BRIDGE.halfWidth+1e-5,LANES[unit.lane]+BRIDGE.halfWidth-1e-5);
        else ny = unit.y > 400 ? RIVER.bottom + 4 : RIVER.top - 4;
      }
    }
    return{x:clamp(nx,ARENA.left+1,ARENA.right-1),y:clamp(ny,ARENA.top+1,ARENA.bottom-1)};
  }
  face(attacker, target) {
    const dx = target.x - attacker.x, dy = target.y - attacker.y, d = Math.hypot(dx,dy) || 1;
    attacker.dx = dx / d; attacker.dy = dy / d;
  }
  attack(attacker, target) {
    if(attacker.king&&!attacker.active)return;
    const card = attacker.card, profile = card || attacker.guard;
    if (card?.passive) return;
    const duration = card?.attackDuration || Math.max(.6,(attacker.windup??.18)+.16);
    // Simulation timing is independent of which images have finished loading.
    const windup = card?.windup ?? attacker.windup ?? .18;
    this.face(attacker,target);
    attacker.target=target;
    attacker.engaged=true;
    attacker.cooldown = card?.interval || attacker.interval;
    attacker.attack = duration; attacker.attackDuration = duration; attacker.attackWindup = windup; attacker.attackAnim = profile.attackAnim;
    const seq = ++attacker.attackSeq;
    const isCharged = charged(attacker);
    attacker.charge = 0;attacker.chargeTravel=0;
    for (let shot=0;shot<(card?.burst || 1);shot++){
      const delay=windup+shot*(card?.burstSpacing||0);this.attacks.push({attacker,target,seq,shot,charged:isCharged,delay,releaseAt:this.elapsed+delay});
    }
    this.emit('attackStart', { attacker, target, style: profile.style, duration, windup });
  }
  muzzle(actor, shot = 0) {
    return emissionPoint(actor,shot);
  }
  strike(actor, target, amount, profile) {
    const hp = target.hp;
    if(actor.card?.execute&&target.card&&target.hp/target.maxHp<actor.card.execute)amount*=1.6;
    if(actor.card?.enrage&&actor.hp<actor.maxHp*.5)amount*=1.25;
    this.damage(target, amount, actor.team, {...profile,sourceId:actor.id,sourceKey:actor.key||'tower'});
    if (actor.card?.lifesteal && target.card && hp > target.hp && actor.hp > 0) {
      const healed = Math.min(actor.maxHp-actor.hp, actor.card.lifesteal);
      actor.hp += healed;
      if (healed) this.emit('heal',{ unit:actor, amount:healed });
    }
  }
  release(job) {
    const {attacker:a,target,shot,charged}=job;
    if(a.hp<=0||a.burrowed||a.stun>0||a.attackSeq!==job.seq||target.hp<=0||target.burrowed||a.king&&!a.active)return;
    const card=a.card, profile=card||a.guard, style=profile.style;
    const reach=attackReach(a,target);
    if(distance(a,target)>reach+(card?.nativeReference?36:card?card.range<50?12:55:36))return;
    this.face(a,target);
    const from=this.muzzle(a,shot),to=aimPoint(target),amount=charged?(card?.chargeDamage??card.damage*2):(card?.damage??a.damage);
    this.emit('attackRelease',{attacker:a,target,key:a.key||a.guard.id,style,from,to,shot,charged});
    if(card?.rollingShot){
      this.projectiles.push({id:a.id+':'+job.seq+':'+shot,key:a.key,sourceId:a.id,sourceKey:a.key,target,team:a.team,x:a.x,y:a.y,startX:a.x,startY:a.y,dx:a.dx,dy:a.dy,totalDistance:card.projectileRange,travelled:0,speed:card.projectileSpeed,damage:amount,style:'rock',rolling:true,shotRadius:card.shotRadius,knockback:card.knockback,hitIds:[],life:card.projectileRange/card.projectileSpeed+1});
    }else if(card?.pierce){
      const motion=projectileProfile(card);
      this.projectiles.push({id:a.id+':'+job.seq+':'+shot,key:a.key,sourceId:a.id,sourceKey:a.key,target,team:a.team,x:a.x,y:a.y,startX:a.x,startY:a.y,liftX:from.x-a.x,liftY:from.y-a.y,dx:a.dx,dy:a.dy,totalDistance:card.projectileRange||card.range+10,travelled:0,speed:motion.speed,damage:amount,style,linear:true,air:!!card.air,shotRadius:card.shotRadius??17,hitIds:[],life:(card.projectileRange||card.range+10)/motion.speed+1,stun:card.stun||0,slow:card.slow||0,burn:card.burn||0});
    }else if(card?.bolts){
      const second=[...this.units,...this.towers].filter(t=>t!==target&&this.validTarget(a,t)&&distance(a,t)<=attackReach(a,t)).sort((x,y)=>distance(a,x)-distance(a,y))[0];
      const targets=second?[target,second]:[target];
      for(let i=0;i<card.bolts;i++){
        const victim=targets[i%targets.length];this.strike(a,victim,amount,card);
        this.emit('beam',{from:{x:from.x+(i?6:-6),y:from.y},to:aimPoint(victim),style,key:a.key,team:a.team,sourceId:a.id,targetId:victim.id,shot:i});
      }
    }else if(style==='lightning'||style==='vine') {
      this.strike(a,target,amount,card||{stun:a.guard?.stun||0});
      this.emit('beam',{from,to,style,key:a.key,team:a.team,sourceId:a.id,targetId:target.id,shot});
      let last=target;
      const hit=new Set([target.id]);
      for(let i=0;i<(card?.chain||0);i++){
        const next=[...this.units,...this.towers].filter(t=>this.validTarget(a,t)&&!hit.has(t.id)&&distance(t,last)<=(card.chainRange||78)+(t.radius||0)).sort((x,y)=>distance(x,last)-distance(y,last))[0];
        if(!next)break;
        this.strike(a,next,amount*Math.pow(card.chainMultiplier??.6,i+1),card);this.emit('beam',{from:aimPoint(last),to:aimPoint(next),style,key:a.key,team:a.team,chainFromId:last.id,targetId:next.id});hit.add(next.id);last=next;
      }
    } else if(style==='flame') {
      const angle=Math.atan2(a.dy,a.dx);
      const speed=card.flameSpeed||300,length=card.range+Math.max(22,target.radius);
      this.projectiles.push({id:a.id+':'+job.seq+':'+shot,key:a.key,sourceKey:a.key,sourceId:a.id,team:a.team,style,flameCone:true,
        x:a.x,y:a.y,startX:a.x,startY:a.y,groundX:a.x,groundY:a.y,angle,cone:card.cone,air:!!card.air,
        totalDistance:length,travelled:0,speed,damage:amount,hitIds:[],life:length/speed+.05});
      this.emit('flame',{key:a.key,from,to,groundFrom:{x:a.x,y:a.y},groundTo:{x:target.x,y:target.y},team:a.team,length,speed,cone:card.cone,angle,sourceId:a.id,targetId:target.id,shot});
    } else if(card&&!(card.rangedAttack??card.range>=50)) {
      this.strike(a,target,amount,card);
      if(card.splash)for(const u of [...this.units,...this.towers])if(u!==target&&u.hp>0&&u.team!==a.team&&!u.burrowed&&isCombatTargetReady(u)&&(!u.card?.flying||card.air)&&spellOverlapsTarget(card,card.selfSplash?a:target,u))this.strike(a,u,amount,card);
      this.emit('melee',{from,to,key:a.key,style,team:a.team,shot,charged,radius:card.splash||0,sourceId:a.id,targetId:target.id});
      this.emit('hit',{x:to.x,y:to.y,groundX:target.x,groundY:target.y,impactHeight:target.y-to.y,radius:card.splash||0,structuresOnly:!!card.building,groundOnly:!card.air,key:a.key,style,team:a.team,targetId:target.id});
    } else {
      const motion=projectileProfile(profile),offset=profile.projectileStart||0,x=a.x+a.dx*offset,y=a.y+a.dy*offset,totalDistance=distance({x,y},target);
      this.projectiles.push({ id:a.id+':'+job.seq+':'+shot,x,y,startX:x,startY:y,groundPath:true,liftX:from.x-x,liftY:from.y-y,endLiftY:to.y-target.y,totalDistance,travelled:0,target,impactPoint:card?.projectileHoming===false?{x:target.x,y:target.y}:null,team:a.team,sourceId:a.id,sourceKey:a.key||'tower',damage:amount,speed:motion.speed,key:a.key||'tower',style,art:card?.projectileArt,splash:card?.splash||0,stun:card?.stun||0,slow:card?.slow||0,slowFactor:card?.slowFactor,slowAttackFactor:card?.slowAttackFactor,burn:card?.burn||0,burnKind:card?.burnKind||'fire',poisonField:card?.poisonField||0,air:!card||!!card.air,life:Math.max(3,totalDistance/motion.speed+1),arc:motion.arc,trace:[] });
    }
    if(card?.suicide)this.retireUnit(a);
  }
  ai(dt) {
    if (!this.aiEnabled) return;
    this.aiClock -= dt;
    if (this.aiClock > 0) return;
    const level = this.difficulty === 'easy' ? .7 : this.difficulty === 'hard' ? 1.3 : 1;
    this.aiClock = (1.3 + this.random() * 1.5) / level;
    const hand = this.hands[1];
    const threats = this.units.filter(u => u.team === 0 && u.hp > 0 && !u.burrowed && u.y < 380);
    const affordable = hand.map((key, i) => ({ key, i, card: CARDS[key] })).filter(c => c.card.cost <= this.energy[1]);
    if (!affordable.length || (!threats.length && this.energy[1] < (this.difficulty === 'easy' ? 7 : 5))) return;
    let choice = affordable[Math.floor(this.random() * affordable.length)];
    if (threats.some(u => u.card.flying)) choice = affordable.find(c => c.card.air && !c.card.spell) || choice;
    if (choice.card.spell) {
      const weak = this.towers.find(t => t.team === 0 && t.hp > 0 && t.hp <= choice.card.towerDamage);
      const enemy = this.units.filter(u => u.team === 0 && u.hp > 0).sort((a, b) => a.y - b.y)[0];
      if(choice.card.rolling){
        const targets=[...this.units,...this.towers].filter(t=>t.team===0&&t.hp>0&&!t.card?.flying&&(!('king'in t)||t.hp<=choice.card.towerDamage));
        for(const target of targets){
          const origin=this.resolveDeployment(1,choice.key,target.x,Math.min(RIVER.top-TILE/2,Math.max(ARENA.top+TILE/2,target.y-2*TILE)));
          if(origin&&target.y>=origin.y-18-target.radius&&target.y-origin.y<=choice.card.travelDistance+18+target.radius){this.deploy(1,choice.i,origin.x,origin.y);return;}
        }
      }else if(choice.card.spawnKey){
        const tower=this.towers.filter(t=>t.team===0&&!t.king&&t.hp>0).sort((a,b)=>a.hp-b.hp)[0];
        if(tower&&(this.energy[1]>=8||this.units.some(u=>u.team===1&&u.hp>0&&distance(u,tower)<170))){this.deploy(1,choice.i,tower.x,tower.y-35);return;}
      }else if(choice.card.stun>=2){
        const target=[...this.units,...this.towers].find(t=>t.team===0&&t.hp>0&&t.stun<=0&&this.units.some(u=>u.team===1&&u.hp>0&&distance(u,t)<u.card.range+t.radius+55));
        if(target){this.deploy(1,choice.i,target.x,target.y);return;}
      }else if (weak || enemy) {
        const candidates=weak?[weak]:this.units.filter(u=>u.team===0&&u.hp>0);
        candidates.sort((a,b)=>this.spellValue(choice.card,b)-this.spellValue(choice.card,a));
        const target=candidates[0];this.deploy(1,choice.i,target.x,target.y);return;
      }
      choice = affordable.find(c => !c.card.spell);
      if (!choice) return;
    }
    let lane = Math.floor(this.random() * 2);
    if (threats.length) lane = threats[0].x < 300 ? 0 : 1;
    const x = choice.card.structure&&!choice.card.summon?300:LANES[lane] + (this.random() - .5) * 65;
    const y = choice.card.summon&&choice.card.structure?155:threats.length ? 285 : choice.card.building ? 115 : 272;
    this.deploy(1, choice.i, x, y);
  }
  spellValue(card,point){
    return [...this.units,...this.towers].filter(t=>t.team===0&&t.hp>0&&(!card.groundOnly||!t.card?.flying)&&spellOverlapsTarget(card,point,t))
      .sort((a,b)=>b.hp-a.hp).slice(0,card.targetLimit||Infinity).reduce((sum,t)=>sum+('king'in t?card.towerDamage||card.fieldTowerDamage||0:Math.min(t.hp,(card.damage||0)+(card.fieldDamage||0)*(card.fieldDuration||0)*(t.card.structure?card.buildingMultiplier||1:1))),0);
  }
  tickStatus(entity,dt) {
    const rate=attackRate(entity);
    entity.hit=Math.max(0,entity.hit-dt);entity.stun=Math.max(0,entity.stun-dt);
    if(entity.pushHurt)entity.pushHurt=Math.max(0,entity.pushHurt-dt);
    entity.freeze=Math.max(0,(entity.freeze||0)-dt);
    entity.slow=Math.max(0,(entity.slow||0)-dt);entity.attack=Math.max(0,(entity.attack||0)-dt*rate);
    if(entity.burn&&entity.hp>0){
      const burn=entity.burn;burn.remaining-=dt;burn.tick-=dt;
      if(burn.tick<=1e-7){burn.tick+=.5;this.damage(entity,burn.damage*.5,burn.team,{dot:true,sourceId:burn.sourceId||0,sourceKey:burn.sourceKey||''});}
      if(burn.remaining<=0)entity.burn=null;
    }
  }
  blink(unit,target) {
    if(unit.card.dash){
      const d=distance(unit,target),sameBank=unit.y<RIVER.top&&target.y<RIVER.top||unit.y>RIVER.bottom&&target.y>RIVER.bottom;
      const gap=d-(unit.radius||0)-(target.radius||0);
      if(unit.dash||unit.attack>0||gap<unit.card.dashMin-1e-7||d>unit.card.dashMax+(target.radius||0)+1e-7)return false;
      unit.attackSeq++;unit.attack=unit.attackDuration=unit.attackWindup=unit.card.dashWindup;unit.engaged=true;this.face(unit,target);
      unit.dash={phase:'windup',elapsed:0,targetId:target.id,startX:unit.x,startY:unit.y};
      this.emit('dashWindup',{unit,duration:unit.card.dashWindup});return true;
    }
    if(!unit.card.blink||unit.blinkCooldown>0||distance(unit,target)>155||distance(unit,target)<65)return false;
    if(!((unit.y<RIVER.top&&target.y<RIVER.top)||(unit.y>RIVER.bottom&&target.y>RIVER.bottom)))return false;
    const from={x:unit.x,y:unit.y},d=distance(unit,target)||1,reach=unit.card.range+target.radius-3;
    const x=target.x+(unit.x-target.x)/d*reach,y=target.y+(unit.y-target.y)/d*reach;
    if(!inArena(x,y)||this.towers.some(t=>t.hp>0&&distance(t,{x,y})<t.radius+unit.radius))return false;
    unit.x=x;unit.y=y;unit.blinkCooldown=unit.card.blink;this.face(unit,target);
    this.emit('blink',{from,to:{x,y},unit});return true;
  }
  stepDash(unit,dt){
    const dash=unit.dash,target=[...this.units,...this.towers].find(t=>t.id===dash.targetId);
    if(!this.validTarget(unit,target)||unit.stun>0){unit.dash=null;unit.attack=0;unit.engaged=false;return;}
    dash.elapsed+=dt;
    if(dash.phase==='windup'){
      if(dash.elapsed+1e-7<unit.card.dashWindup)return;
      const d=distance(unit,target),reach=attackReach(unit,target)-3;
      const sameBank=unit.y<RIVER.top&&target.y<RIVER.top||unit.y>RIVER.bottom&&target.y>RIVER.bottom;
      if(d<1e-7||d>unit.card.dashMax+(target.radius||0)+1e-7){unit.dash=null;unit.attack=0;unit.engaged=false;return;}
      const end=this.constrainMovement(unit,target.x+(unit.x-target.x)/d*reach,target.y+(unit.y-target.y)/d*reach);
      Object.assign(dash,{phase:'travel',elapsed:0,startX:unit.x,startY:unit.y,endX:end.x,endY:end.y,duration:Math.max(.05,Math.hypot(end.x-unit.x,end.y-unit.y)/unit.card.dashSpeed)});
      unit.attack=0;unit.moving=true;this.face(unit,target);
      this.emit('dashStart',{unit,from:{x:dash.startX,y:dash.startY},to:{x:dash.endX,y:dash.endY},duration:dash.duration});return;
    }
    const progress=Math.min(1,dash.elapsed/dash.duration);unit.x=dash.startX+(dash.endX-dash.startX)*progress;unit.y=dash.startY+(dash.endY-dash.startY)*progress;unit.moving=true;
    if(progress<1)return;
    unit.dash=null;unit.cooldown=Math.max(0,unit.card.interval-unit.card.windup);unit.attackDuration=.4;unit.attackWindup=0;unit.attack=.4;
    if(distance(unit,target)<=attackReach(unit,target)+8){
      const from=this.muzzle(unit),to=aimPoint(target);this.strike(unit,target,unit.card.dashDamage??unit.card.damage*unit.card.dashMultiplier,unit.card);
      this.emit('attackRelease',{attacker:unit,target,key:unit.key,style:'dash',from,to,shot:0,charged:true});
      this.emit('melee',{sourceId:unit.id,targetId:target.id,key:unit.key,team:unit.team,style:'dash',from,to,charged:true});
    }
  }
  releaseAttacks(){
    for(const job of this.attacks)if(!job.done&&job.delay<=1e-7){job.done=true;this.release(job);}
  }
  step(dt) {
    if (this.state !== 'playing') return;
    dt = clamp(dt, 0, .1);
    const oldMultiplier = this.multiplier;
    this.time = Math.max(0, this.time - dt); this.elapsed += dt;
    if(this.tiebreaker){
      const towers=this.towers.filter(t=>t.hp>0),lowest=[0,1].map(team=>Math.min(...towers.filter(t=>t.team===team).map(t=>t.hp))),drain=Math.min(350*dt,...lowest);
      for(const tower of towers){tower.hp=Math.max(0,tower.hp-drain);tower.hit=.1;}
      if(Math.min(...lowest)<=350*dt){const tie=Math.abs(lowest[0]-lowest[1])<1e-7;this.finish(tie?-1:lowest[0]<lowest[1]?1:0,tie?'Empate':'Desempate de torres');}
      return;
    }
    if (oldMultiplier !== this.multiplier) this.emit('energyBoost', { multiplier: this.multiplier });
    const regen = this.multiplier / 2.8;
    for (let team = 0; team < 2; team++) this.energy[team] = Math.min(10, this.energy[team] + regen * dt);
    this.updateBurrows(dt);
    this.stepFields(dt);
    this.ai(dt);
    for(const job of this.reinforcements){
      job.delay-=dt;if(job.delay>1e-7)continue;job.done=true;
      if(job.requiresParent&&!this.units.some(u=>u.id===job.parentId&&u.hp>0)||this.units.filter(u=>u.hp>0).length>=160)continue;
      const point=this.reinforcementPoint(job.key,job.x,job.y);
      if(point){const child=this.spawn(job.key,job.team,point.x,point.y,job.spawnDelay,job.spawnGroup);child.parentId=job.parentId;}
    }
    this.reinforcements=this.reinforcements.filter(job=>!job.done);
    for (const spell of this.spells) {
      if(spell.card.rolling){
        const previousY=spell.y,remaining=spell.travelRemaining??CARDS.log.travelDistance;
        const travelled=Math.min(remaining,(spell.card.travelSpeed||CARDS.log.travelSpeed)*dt);
        spell.y+=(spell.team?1:-1)*travelled;spell.travelRemaining=Math.max(0,remaining-travelled);
        for(const target of[...this.units,...this.towers])if(target.team!==spell.team&&target.hp>0&&!target.burrowed&&isCombatTargetReady(target)&&!target.card?.flying&&!spell.hitIds.includes(target.id)&&rollingOverlapsTarget(spell.card,{x:spell.x,y:previousY},spell,target)){
          spell.hitIds.push(target.id);this.damage(target,'king'in target?spell.card.towerDamage:spell.card.damage,spell.team,{sourceKey:spell.key});
          if(target.card&&!target.card.structure)this.pushUnit(target,0,(spell.team?1:-1)*spell.card.knockback,{force:true});
          this.emit('hit',{x:target.x,y:target.y,key:spell.key,style:'rock',team:spell.team});
        }
        if(spell.travelRemaining<=1e-7)spell.done=true;continue;
      }
      if(spell.done)continue;
      if(spell.card.travelSpeed&&!spell.arrived){
        const waiting=spell.delay;
        spell.delay=Math.max(0,waiting-dt);
        spell.flightElapsed=Math.min(spell.flightTime,spell.flightElapsed+Math.max(0,dt-waiting));
        if(spell.delay>1e-7||spell.flightElapsed+1e-7<spell.flightTime)continue;
      }else{spell.delay-=dt;if(spell.delay>1e-7)continue;}
      spell.done = true;spell.arrived=true;
      if(spell.card.spawnOnImpact)this.summonSpell(spell);
      if(spell.card.fieldDuration)this.spellField(spell);
      let targets = [...this.units, ...this.towers].filter(t => t.team !== spell.team && t.hp > 0 && (!t.burrowed||spell.card.affectsHidden) && isCombatTargetReady(t) && (!spell.card.groundOnly||!t.card?.flying) && spellOverlapsTarget(spell.card,spell,t));
      if(spell.card.targetLimit)targets=targets.filter(t=>!spell.hitIds.includes(t.id)).sort((a,b)=>b.hp-a.hp||a.id-b.id).slice(0,spell.card.hitEvery?1:spell.card.targetLimit);
      for (const target of targets) {
        if(spell.card.hitEvery)spell.hitIds.push(target.id);
        if(spell.card.damage>0)this.damage(target, 'king' in target ? spell.card.towerDamage : spell.card.damage, spell.team, {...spell.card,sourceKey:spell.key});
        if(spell.card.targetLimit)this.emit('beam',{from:{x:target.x,y:target.y-180},to:aimPoint(target),style:'lightning',key:spell.key,team:spell.team});
        if (target.card && spell.card.knockback && !target.card.structure) {
          const d = distance(target, spell) || 1;
          this.pushUnit(target,(target.x-spell.x)/d*spell.card.knockback,(target.y-spell.y)/d*spell.card.knockback);
        }
      }
      this.emit('spellHit', { key: spell.key, x: spell.x, y: spell.y, radius: spell.card.splash, team: spell.team });
      spell.resolvedWaves=(spell.resolvedWaves||0)+1;
      if(spell.resolvedWaves<(spell.card.waves||spell.card.hitEvery&&spell.card.targetLimit||1)){spell.done=false;spell.delay=spell.card.waveEvery||spell.card.hitEvery;}
    }
    this.spells = this.spells.filter(s => !s.done);
    // Complete due contacts before another cycle can replace its sequence.
    // This matters for a tower's full .8s first preparation.
    for(const job of this.attacks){const rate=attackRate(job.attacker);if(Number.isFinite(job.releaseAt)){job.releaseAt+=dt*(1-rate);job.delay=job.releaseAt-this.elapsed;}else job.delay-=dt*rate;}
    this.releaseAttacks();
    for (const tower of this.towers) {
      const rate=attackRate(tower);this.tickStatus(tower,dt);tower.anim+=dt;tower.cooldown-=dt*rate;
      if (tower.hp <= 0 || !tower.active || tower.stun > 0) continue;
      const enemies = this.units.filter(u => u.team !== tower.team && u.hp > 0 && !u.burrowed && isCombatTargetReady(u) && distance(tower, u) <= attackReach(tower,u));
      enemies.sort((a, b) => distance(tower, a) - distance(tower, b));
      if(!enemies.includes(tower.target))tower.target=enemies[0]||null;
      if(tower.target){this.face(tower,tower.target);if(tower.cooldown<=1e-7)this.attack(tower,tower.target);}
    }
    for (const unit of this.units) {
      if (unit.hp <= 0) continue;
      unit.spawn = Math.max(0, unit.spawn - (unit.createdAt===this.elapsed?0:dt));this.tickStatus(unit,dt);
      if(unit.hp<=0)continue;
      if(unit.spawn<=0&&unit.entryPending){
        unit.entryPending=false;
        for(const target of [...this.units,...this.towers])if(target.team!==unit.team&&target.hp>0&&!target.burrowed&&isCombatTargetReady(target)&&distance(target,unit)<=unit.card.entryRadius+target.radius){
          this.damage(target,'king'in target?unit.card.entryTowerDamage??Math.round(unit.card.entryDamage*.3):unit.card.entryDamage,unit.team,{stun:unit.card.entryStun||0,slow:unit.card.entrySlow||0,slowFactor:unit.card.slowFactor,slowAttackFactor:unit.card.slowAttackFactor,sourceId:unit.id,sourceKey:unit.key});
        }
        this.emit('entry',{unit,x:unit.x,y:unit.y,radius:unit.card.entryRadius,style:unit.card.entryStun?'lightning':'ice'});
      }
      unit.cooldown-=dt*attackRate(unit);unit.anim+=dt;unit.blinkCooldown=Math.max(0,unit.blinkCooldown-dt);
      unit.moving = false;
      if(unit.dash&&unit.stun>0){unit.dash=null;unit.attack=0;unit.engaged=false;}
      if(unit.card.structure&&unit.spawn<=0){
        unit.hp=Math.max(0,unit.hp-unit.maxHp/unit.card.lifetime*dt);unit.lifetime=unit.card.lifetime*unit.hp/unit.maxHp;
        if(unit.lifetime<=1e-7||unit.hp<=0){unit.hp=0;this.unitDeath(unit,1-unit.team);continue;}
      }
      if(unit.spawn<=0&&unit.ttl>0){unit.ttl-=dt;if(unit.ttl<=0){this.retireUnit(unit);continue;}}
      if (unit.spawn > 0 || unit.stun > 0 || unit.burrowed) continue;
      if(unit.dash){this.stepDash(unit,dt);continue;}
      if(unit.leap){this.stepLeap(unit,dt);continue;}
      if(unit.deathSlide)this.stepDeathSlide(unit,dt);
      if(unit.card.summon)this.stepSummons(unit,dt);
      if(unit.card.heal){unit.healClock-=dt;if(unit.healClock<=0){unit.healClock=unit.card.healEvery;this.healNearby(unit,unit.card.heal,unit.card.healRadius,unit.card.healAll);}}
      if(unit.card.structure&&unit.target&&distance(unit,unit.target)>attackReach(unit,unit.target)||unit.card.building&&unit.target?.card?.structure&&!this.withinPullLane(unit,unit.target)){unit.target=null;unit.engaged=false;unit.attackSeq++;unit.attack=0;}
      if(!this.validTarget(unit,unit.target)||(unit.target?.card&&distance(unit,unit.target)>(unit.target.card.structure?(unit.card.building?attackReach(unit,unit.target,unit.card.pullRange||300):sightReach(unit,unit.target)):sightReach(unit,unit.target))&&!(unit.engaged&&unit.attack>0&&distance(unit,unit.target)<=attackReach(unit,unit.target)+12))){if(unit.target){unit.attackSeq++;unit.attack=0;}unit.target=null;unit.engaged=false;}
      if(unit.target&&unit.engaged&&unit.attack<=0&&distance(unit,unit.target)>attackReach(unit,unit.target)+45)unit.engaged=false;
      if(!unit.engaged){
        const nearest=this.acquire(unit);
        const pulled=unit.card.building&&nearest?.card?.structure&&!unit.target?.card?.structure;
        if(nearest&&(!unit.target||pulled||distance(unit,nearest)+2<distance(unit,unit.target))){unit.target=nearest;unit.attackSeq++;unit.attack=0;}
      }
      const target = unit.target;
      if (!target) continue;
      if(this.startLeap(unit,target))continue;
      if(unit.card.copy&&target.card&&!target.card.structure&&!target.card.token){const copied={};for(const key of['damage','range','interval','style','burst','burstSpacing','bolts','stun','slow','burn','burnKind','splash','air','chain','cone','pierce','projectileSpeed','projectileArc','projectileArt','rollingShot','projectileRange','shotRadius','knockback','lifesteal','poisonField','attackDuration','windup'])if(key in target.card)copied[key]=target.card[key];unit.card={...unit.card,...copied,damage:Math.max(THRESHOLDS.fragile,Math.round(target.card.damage*.85)),copy:false,attackAnim:'Attack'};this.emit('transform',{unit});}
      if(this.blink(unit,target))continue;
      const reach = attackReach(unit,target);
      if (distance(unit, target) <= reach) { this.face(unit,target);if (unit.cooldown <= 1e-7) this.attack(unit, target); }
      else if(!unit.card.structure&&unit.attack<=0)this.move(unit, target, dt);
    }
    for(const job of this.attacks)if(Number.isFinite(job.releaseAt))job.delay=job.releaseAt-this.elapsed;
    this.releaseAttacks();
    this.attacks=this.attacks.filter(job=>!job.done&&job.attacker.hp>0&&job.attacker.attackSeq===job.seq&&job.target.hp>0);
    for (const p of this.projectiles) {
      p.life -= dt;
      if(p.flameCone){
        p.travelled=Math.min(p.totalDistance,p.travelled+p.speed*dt);
        for(const target of[...this.units,...this.towers]){
          if(target.team===p.team||target.hp<=0||target.burrowed||!isCombatTargetReady(target)||target.card?.flying&&!p.air||p.hitIds.includes(target.id))continue;
          const dx=target.x-p.groundX,dy=target.y-p.groundY,delta=Math.atan2(dy,dx)-p.angle;
          if(Math.hypot(dx,dy)>p.totalDistance+target.radius||Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))>p.cone)continue;
          const impact=aimPoint(target);if(Math.hypot(dx,dy)>p.travelled+1e-7)continue;
          p.hitIds.push(target.id);this.damage(target,p.damage,p.team,{sourceId:p.sourceId,sourceKey:p.key});
          this.emit('hit',{key:p.key,style:p.style,x:impact.x,y:impact.y,groundX:target.x,groundY:target.y,impactHeight:target.y-impact.y,team:p.team,targetId:target.id});
        }
        if(p.travelled>=p.totalDistance-1e-7)p.life=0;
        continue;
      }
      if(p.rolling||p.linear){
        const step=Math.min(Math.max(0,p.totalDistance-p.travelled),p.speed*dt),start={x:p.x,y:p.y};
        p.x+=p.dx*step;p.y+=p.dy*step;p.travelled+=step;
        for(const target of [...this.units,...this.towers]){
          if(target.team===p.team||target.hp<=0||target.burrowed||!isCombatTargetReady(target)||target.card?.flying&&!p.air||p.hitIds.includes(target.id))continue;
          const tx=target.x-start.x,ty=target.y-start.y,along=clamp(tx*p.dx+ty*p.dy,0,step);
          if(Math.hypot(tx-p.dx*along,ty-p.dy*along)>p.shotRadius+target.radius)continue;
          p.hitIds.push(target.id);this.damage(target,p.damage,p.team,p);
          if(p.knockback)this.pushUnit(target,p.dx*p.knockback,p.dy*p.knockback);
          const impact=aimPoint(target);this.emit('hit',{key:p.key,style:p.style,x:impact.x,y:impact.y,groundX:target.x,groundY:target.y,impactHeight:target.y-impact.y,team:p.team,targetId:target.id});
        }
        if(p.travelled>=p.totalDistance-1e-7)p.life=0;
        continue;
      }
      if (!p.impactPoint&&(!p.target||p.target.hp <= 0||p.target.burrowed)) { p.life = 0; continue; }
      const center=p.impactPoint||p.target,{x:tx,y:ty}=p.impactPoint|| (p.groundPath?p.target:aimPoint(p.target));
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d <= p.speed * dt + 1e-7) {
        const victims=(p.splash?[...this.units,...this.towers]:[p.target]).filter(u=>u&&u.team!==p.team&&u.hp>0&&!u.burrowed&&isCombatTargetReady(u)&&(!u.card?.flying||p.air)&&spellOverlapsTarget(p,center,u));
        for(const victim of victims)this.damage(victim,p.damage,p.team,p);
        const impact=p.impactPoint?{x:tx,y:ty+(p.endLiftY??-15)}:aimPoint(p.target);this.emit('hit', { key: p.key, style:p.style, art:p.art, x: impact.x, y: impact.y, groundX:center.x,groundY:center.y,impactHeight:center.y-impact.y,radius:p.splash||0,groundOnly:!p.air,team: p.team,targetId:p.target?.id||0 }); p.life = 0;
      } else { p.trace.push({x:p.x,y:p.y});if(p.trace.length>7)p.trace.shift();p.x += dx / d * p.speed * dt; p.y += dy / d * p.speed * dt;p.travelled+=p.speed*dt; }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
    this.units = this.units.filter(u => u.hp > 0);
    if (this.time <= 0 && this.state === 'playing') this.endClock();
  }
}

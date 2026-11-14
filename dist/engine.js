import { EXTRA_CARDS } from './catalog.js?v=26';
import { applyBalance, THRESHOLDS } from './balance.js?v=26';
import { emissionPoint, structureLift } from './sprite-motion.js?v=26';
export { attackPoseProgress } from './sprite-motion.js?v=26';
export const W = 600, H = 800;
export const TILE = 24;
export const DEPLOY_GRID = Object.freeze({ size: TILE, left: 0, top: (H % TILE) / 2, columns: W / TILE, rows: Math.floor(H / TILE) });
export function snapToCell(team, x, y) {
  const nearest = value => team ? Math.ceil(value - .5 + 1e-9) : Math.floor(value + .5 - 1e-9);
  return { x: DEPLOY_GRID.left + TILE / 2 + nearest((x - DEPLOY_GRID.left - TILE / 2) / TILE) * TILE,
    y: DEPLOY_GRID.top + TILE / 2 + nearest((y - DEPLOY_GRID.top - TILE / 2) / TILE) * TILE };
}
export const RIVER = { top: 388, bottom: 412 };
export const BRIDGE = { top: RIVER.top - 12, bottom: RIVER.bottom + 12 };
export const PRINCESS_Y = [628, 172];
export const KING_Y = [706, 94];
// Include the snapped cells beside the lane center when reaching midbridge.
export const PRINCESS_RANGE = Math.ceil(Math.hypot(PRINCESS_Y[0] - H / 2, TILE));
export const LANES = [158, 442];
export function spellOverlapsTarget(card,point,target){
  const radius=card.splash??card.radius??0;
  // Crown towers receive spells on their two-cell square footprint. Other
  // bodies overlap by their full collision radius, rather than 40% of it.
  if('king'in target){const dx=Math.max(0,Math.abs(target.x-point.x)-TILE),dy=Math.max(0,Math.abs(target.y-point.y)-TILE);return Math.hypot(dx,dy)<radius;}
  return Math.hypot(target.x-point.x,target.y-point.y)<radius+(target.radius||0);
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
  geodude:{name:'Geodude',id:74,cost:3,type:'rock',label:'Roca',role:'Tanque · área',move:'Golpe roca',style:'slam',attackAnim:'Attack',attackDuration:.85,hp:1020,damage:89,range:29,speed:26,interval:1.6,splash:50,radius:17,muzzleHeight:21,color:'#c1b69c',description:'Resiste en primera línea y golpea en área a rivales terrestres. Camina lento y no alcanza voladores.'},
  magnemite:{name:'Magnemite',id:81,cost:3,type:'electric',label:'Eléctrico / acero',role:'Volador · control',move:'Bomba imán',style:'magnet',attackAnim:'Shoot',attackDuration:.8,hp:365,damage:59,range:145,speed:40,interval:1.8,stun:.32,flying:true,air:true,muzzleHeight:29,color:'#a1cbd0',description:'Flota y dispara una esfera magnética que aturde brevemente. Puede defender contra objetivos de tierra y aire.'},
  scyther:{name:'Scyther',id:123,cost:4,type:'grass',label:'Bicho / volador',role:'Volador · doble corte',move:'Doble corte',style:'slash',attackAnim:'Double',attackDuration:.75,hp:560,damage:45,range:30,speed:72,interval:1.05,burst:2,burstSpacing:.18,flying:true,air:true,muzzleHeight:35,color:'#b8d98c',description:'Se acerca volando y corta dos veces con sus guadañas. Daño rápido contra un solo objetivo de tierra o aire.'},
  lapras:{name:'Lapras',id:131,cost:5,type:'water',label:'Agua / hielo',role:'Tanque · ralentiza',move:'Rayo hielo',style:'ice',attackAnim:'Shoot',attackDuration:.95,hp:1190,damage:72,range:138,speed:25,interval:1.75,slow:2,air:true,radius:20,muzzleHeight:43,color:'#a2deeb',description:'Un tanque a distancia. Sus cristales de hielo ralentizan a su objetivo durante dos segundos.'},
  mewtwo:{name:'Mewtwo',id:150,cost:6,type:'psychic',label:'Psíquico',role:'Área · carga lenta',move:'Esfera aural',style:'aura',attackAnim:'Shoot',attackDuration:1.2,hp:730,damage:149,range:158,speed:38,interval:2.2,splash:45,projectileSpeed:225,air:true,muzzleHeight:37,color:'#cfb9ed',description:'Prepara una esfera de energía lenta que explota en área. Tiene gran alcance y necesita protección durante la carga.'}
});
CARDS.treecko={name:'Treecko',id:252,cost:3,type:'grass',label:'Planta',role:'Pareja · a distancia',move:'Semilladora',style:'leaf',attackAnim:'Shoot',attackDuration:.7,hp:370,damage:55,range:145,speed:45,interval:1.25,count:2,air:true,muzzleHeight:24,color:'#a5d577',description:'Dos tiradores que atacan a tierra y aire. Vulnerables al daño de área.'};
CARDS.golem={name:'Golem',id:76,cost:8,type:'rock',label:'Roca',role:'Tanque · división',move:'Demolición',style:'slam',attackAnim:'Attack',attackDuration:1,hp:4600,damage:190,range:30,speed:21,interval:2.3,building:true,radius:23,muzzleHeight:35,deathDamage:130,split:true,color:'#b9ad92',description:'Tanque que solo ataca estructuras. Al caer explota y deja dos Geodude pequeños.'};
CARDS.log={name:'Rueda Fuego',move:'Rueda Fuego',cost:2,type:'fire',label:'Fuego',role:'Hechizo · empuje',spell:true,rolling:true,damage:200,towerDamage:55,splash:45,knockback:28,color:'#ef9b52',description:'Una rueda de fuego avanza y empuja a los enemigos terrestres.'};
CARDS.mewtwo.ability={name:'Onda psíquica',cost:2,damage:240,radius:135,stun:1};
CARDS.mewtwo.description='Esfera de daño en área. Onda psíquica: 2 de elixir, daña y aturde alrededor; un uso por despliegue.';
CARDS.pikachu.description='Rayo que salta a otros dos rivales. Aturde, interrumpe el ataque y hace buscar el objetivo más cercano.';
CARDS.magnemite.description='Volador eléctrico. Aturde, interrumpe el ataque y hace buscar el objetivo más cercano.';
CARDS.thunder.description='Daña, aturde 0,75 s y reinicia el objetivo enemigo. Daño reducido a torres.';
const rarityGroups={comun:['squirtle','zubat','eevee','geodude','treecko','bulbasaur'],especial:['pikachu','charmander','vulpix','psyduck','magnemite','lapras'],epica:['snorlax','machamp','onix','blastoise','gengar','scyther','golem','thunder','fireball'],legendaria:['charizard','mewtwo','log']};
export const RARITIES={comun:'Común',especial:'Especial',epica:'Épica',legendaria:'Legendaria'};
for(const[rarity,keys]of Object.entries(rarityGroups))for(const key of keys)CARDS[key].rarity=rarity;
CARDS.alakazam.rarity='epica';
Object.assign(CARDS,EXTRA_CARDS);
applyBalance(CARDS);
export const DEFAULT_DECK = ['pikachu', 'snorlax', 'machamp', 'blastoise', 'zubat', 'thunder', 'charizard', 'fireball'];
export const CPU_DECKS = [
  {name:'Carga eléctrica',cards:['forretress','raichu','centralElectrode','treecko','voltorb','pikachu','pinMissile','lightning']},
  {name:'Camada venenosa',cards:['snorlax','nidoqueen','madriguera','poochyenaPack','butterfree','grimer','spikes','fireball']},
  {name:'Noche de fantasmas',cards:['golem','duskull','gengar','zubat','regice','diglett','nightmare','log']},
  {name:'Asedio de roca',cards:['regirock','rhydon','cloyster','raltsTrio','mankey','gastly','earthquake','thunder']},
  {name:'Vuelo del bosque',cards:['celebi','charizard','vivero','treecko','eevee','skarmory','blizzard','pinMissile']},
  {name:'Contraataque',cards:['steelix','raichu','regice','pikachu','diglett','chansey','whirlpool','fireball']},
  {name:'Emboscada Rocket',cards:['forretress','pandilla','roselia','graveler','centralElectrode','voltorb','sneaselAmbush','log']},
  {name:'Carga veloz',cards:['rapidash','lapras','vivero','nuzleaf','poochyenaPack','zubat','thunder','fireball']},
  {name:'Bosque vivo',cards:['golem','vivero','meganium','sceptile','gastly','diglett','spikes','pinMissile']},
  {name:'Presión aérea',cards:['celebi','pidgeot','cloyster','blastoise','pandilla','eevee','whirlpool','lightning']},
];
// PMD sheets run south, southeast, east, northeast, north, northwest, west, southwest.
export function directionRow(dx, dy) { return (2 - Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8; }
export function aimPoint(target) { return { x: target.x, y: target.y - ('king' in target ? 27 : target.card?.structure ? structureLift(target.card)+20 : target.card?.flying ? 27 : 15) }; }
// Compress/extend the original windup so its hit frame coincides with the shared release time.
export function isCombatTargetReady(target){return !(target.spawn>0)||!!target.card?.vulnerableDuringDeploy;}

export function formationOffsets(card, team = 0, anchorX = 300) {
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
      for (let lane = 0; lane < 2; lane++) this.towers.push({ id: this.nextId++, team, lane, x: LANES[lane], y: PRINCESS_Y[team], hp: 3000, maxHp: 3000, king: false, active: true, radius: 29, range: PRINCESS_RANGE, damage: THRESHOLDS.tower, interval: THRESHOLDS.towerInterval, cooldown: .3, stun: 0, hit: 0 });
      this.towers.push({ id: this.nextId++, team, lane: -1, x: 300, y: KING_Y[team], hp: 4800, maxHp: 4800, king: true, active: false, radius: 34, range: 210, damage: 109, interval: 1, cooldown: .5, stun: 0, hit: 0 });
    }
    for (const tower of this.towers) Object.assign(tower, {guard: { id: 52, style: 'coin', attackAnim: 'Shoot' }, dx: 0, dy: tower.team ? 1 : -1, attack: 0, attackDuration: .6, attackSeq: 0, anim: this.random(), target: null });
    const royalGuards = this.random() < .5 ? [34, 31] : [31, 34];
    for (const tower of this.towers) if (tower.king) tower.guard = { id: royalGuards[tower.team], style: 'poison', attackAnim: 'Shoot' };
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
  canDeploy(team, key, x, y) {
    const card = CARDS[key];
    if (!card || !Number.isFinite(x) || !Number.isFinite(y) || x < 44 || x > 556 || y < 40 || y > 760) return false;
    if (card.spell && !card.rolling) return true;
    const lane = x < 300 ? 0 : 1;
    const laneDestroyed = this.towers.some(t => t.team !== team && t.lane === lane && !t.king && t.hp <= 0);
    const inOwnHalf = team === 0 ? y >= 444 : y <= 356;
    const inCaptured = laneDestroyed && (team === 0 ? y >= 252 && y <= 356 : y >= 444 && y <= 548);
    if (!inOwnHalf && !inCaptured) return false;
    if (card.rolling) return true;
    if([...this.towers, ...this.units.filter(u => u.card.structure)].some(t => {
      const behindKing=t.king&&t.team===team&&(team?y<t.y:y>t.y);
      return t.hp>0&&distance(t,{x,y})<t.radius+(card.structure?38:behindKing?20:27);
    }))return false;
    return true;
  }
  resolveDeployment(team,key,x,y,reserved){
    const card=CARDS[key];
    if(!card||!Number.isFinite(x)||!Number.isFinite(y))return null;
    if(card.spell&&!card.rolling){
      if(!this.canDeploy(team,key,x,y))return null;
      const snapped=snapToCell(team,x,y),point={x:clamp(snapped.x,60,540),y:clamp(snapped.y,40,760)};
      const tower=this.towers.find(t=>{const cell=snapToCell(team,t.x,t.y);return t.hp>0&&cell.x===point.x&&cell.y===point.y;});
      return tower?{x:tower.x,y:tower.y}:point;
    }
    if(x<15||x>585||y<15||y>785)return null;
    // Include the hover distance in the supplied screenshot, even away from a
    // bridge. Preview and authoritative deployment use this same nearest cell.
    const zones=[{left:44,right:556,top:team?40:444,bottom:team?356:760}];
    for(const lane of[0,1])if(this.towers.some(t=>t.team!==team&&!t.king&&t.lane===lane&&t.hp<=0))zones.push({left:lane?300:44,right:lane?556:300,top:team?444:252,bottom:team?548:356});
    const assist=4*TILE;
    const nearest=snapToCell(team,x,y);
    if(!reserved?.has(`${nearest.x},${nearest.y}`)&&this.canDeploy(team,key,nearest.x,nearest.y))return nearest;
    const points=zones.map(z=>({x:clamp(x,z.left,z.right),y:clamp(y,z.top,z.bottom)})).filter(p=>distance(p,{x,y})<=assist);
    if(!points.length)return null;
    const available=p=>!reserved?.has(`${p.x},${p.y}`)&&this.canDeploy(team,key,p.x,p.y),candidates=[];
    for(const origin of points){
      const closest=snapToCell(team,origin.x,origin.y);
      for(let row=-4;row<=4;row++)for(let col=-4;col<=4;col++){
        const p={x:closest.x+col*TILE,y:closest.y+row*TILE};
        if(distance(p,{x,y})<=assist+1e-7&&available(p))candidates.push(p);
      }
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
      const px=clamp(anchor.x+offset.x,46,554),py=clamp(anchor.y+offset.y,42,758),lane=px<W/2?0:1;
      return this.constrainMovement({id:this.nextId+index,team,card:member,radius:member.radius||12,x:px,y:py,lane},px,py);
    });
  }
  deploymentThreats(team,key,x,y,placed=false){
    const card=CARDS[key],point=placed?{x,y}:this.resolveDeployment(team,key,x,y);
    if(!point||card.spell)return[];
    const positions=placed?formationOffsets(card,team,point.x).map(offset=>({x:point.x+offset.x,y:point.y+offset.y})):this.deploymentPositions(team,key,point.x,point.y);
    const previews=positions.map(p=>({...p,team,card,hp:card.hp,radius:card.radius||12,spawn:0}));
    return [...this.towers,...this.units].filter(enemy=>enemy.team!==team&&enemy.hp>0&&isCombatTargetReady(enemy)&&previews.some(preview=>{
      if('king'in enemy)return enemy.active&&distance(enemy,preview)<=enemy.range;
      return this.validTarget(enemy,preview)&&distance(enemy,preview)<=enemy.card.range+preview.radius;
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
      this.spells.push({ visualId:this.nextId++,key, card, team, x, y, startX:card.rolling?x:origin.x,startY:card.rolling?y:origin.y,
        delay:card.rolling?0:card.castDelay??.4,flightTime:travelTime,flightElapsed:0,
        travelRemaining:card.rolling?card.travelDistance:0,hitIds:[] });
      this.emit('cast', { key, team, x, y, radius: card.splash });
    } else {
      const delay=card.deployTime??.75,spawnGroup={id:this.nextId,x,y,duration:delay};
      for (const [i,point] of this.deploymentPositions(team,key,x,y).entries())this.spawn(card.squad?.[i]||key,team,point.x,point.y,delay,spawnGroup);
    }
    this.emit('deploy', { team, key, x, y, cost: card.cost });
    return { ok: true, key, x, y };
  }
  spawn(key, team, x, y, delay = .75, spawnGroup = null) {
    const card = CARDS[key];
    const u = { id: this.nextId++, key, card, team, x, y, hp: card.hp, maxHp: card.hp, radius: card.radius || 12, lane: x < 300 ? 0 : 1, cooldown: .4, spawn: delay, stun: 0, slow: 0, hit: 0, attack: 0, attackDuration: 0, attackSeq: 0, anim: this.random() * 2, dx: 0, dy: team ? 1 : -1, moving: false, target: null, engaged:false,charge: 0, blinkCooldown: 0, stepClock: .2, burn: null, lifetime: card.lifetime || 0,abilityUsed:false };
    u.spawnGroup=spawnGroup||{id:u.id,x,y,duration:delay};
    if(card.burrow){u.burrowed=true;u.burrowProgress=1;}
    this.units.push(u);
    u.shield=card.shield||0;u.maxShield=u.shield;u.summonClock=card.firstSummon??card.summonEvery??0;u.summonCycle=u.summonClock;u.healClock=card.healEvery||0;u.ttl=card.ttl||0;u.entryPending=!!card.entryDamage;if(card.scale)u.scale=card.scale;
    this.stats[team].deployed++;
    this.emit('spawn', { unit: u });
    if(card.entryShield)for(const ally of this.units)if(ally.team===team&&ally!==u&&ally.hp>0&&distance(ally,u)<100){ally.shield=Math.max(ally.shield||0,card.entryShield);ally.maxShield=Math.max(ally.maxShield||0,ally.shield);}
    if(card.spawnWith){const baby=this.spawn(card.spawnWith,team,clamp(x+24,44,556),y+12,delay,u.spawnGroup);baby.parentId=u.id;}
    return u;
  }
  damage(target, amount, team, { stun = 0, freeze = 0, slow = 0, burn = 0, burnKind = 'fire', dot = false, sourceId = 0, sourceKey = '', reflected = false, poisonField = 0, affectsHidden = false } = {}) {
    if (target.hp <= 0 || this.state !== 'playing'||target.burrowed&&!affectsHidden||target.dash?.phase==='travel'&&target.card?.dashInvulnerable) return;
    amount*=1-(target.card?.armor||0);const shielded=target.shield>0,absorbed=Math.min(target.shield||0,amount);target.shield=Math.max(0,(target.shield||0)-absorbed);amount=shielded?0:amount;
    const actual = Math.min(target.hp, amount)+absorbed;
    target.hp = Math.max(0, target.hp - amount);
    target.hit = .24;
    target.stun = Math.max(target.stun, stun);
    target.freeze=Math.max(target.freeze||0,freeze);
    target.slow = Math.max(target.slow || 0, slow);
    if (stun > 0) {
      const interrupted=this.attacks.some(job=>job.attacker===target&&job.seq===target.attackSeq&&!job.done&&job.shot===0);
      target.attackSeq++;target.attack=0;target.charge=0;target.target=null;target.engaged=false;
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
        if(target.card.split){
          this.emit('deathBurst',{unit:target,radius:64});
          for(const other of[...this.units,...this.towers])if(other.team!==target.team&&other.hp>0&&!other.card?.flying&&distance(other,target)<64+other.radius)this.damage(other,target.card.deathDamage,target.team,{sourceId:target.id,sourceKey:target.key});
          for(const offset of[-20,20]){const small=this.spawn('geodude',target.team,clamp(target.x+offset,44,556),target.y,.4);small.card={...CARDS.geodude,damage:52,building:true,splash:0,speed:28};small.hp=small.maxHp=900;small.scale=CARDS.geodude.scale*.65;}
        }
        if(target.card.deathSpawn)this.spawnReinforcements(target,target.card.deathSpawn,target.card.deathCount||1,.4);
        if(target.card.deathField)this.addField(target.x,target.y,target.team,target.card.deathField,target.id);
        if(target.card.deathHeal)this.healNearby(target,target.card.deathHeal,125,true);
        if(target.card.deathStun){this.emit('deathBurst',{unit:target,radius:100,style:'lightning',groundOnly:false});for(const other of this.units)if(other.team!==target.team&&other.hp>0&&distance(other,target)<100)this.damage(other,0,target.team,{stun:target.card.deathStun,sourceId:target.id});}
  }
  retireUnit(unit){if(unit.hp<=0||unit.deathHandled)return;unit.hp=0;this.unitDeath(unit,1-unit.team);}
  spawnReinforcements(owner,key,count,delay=.5){
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
  reinforcementPoint(key,x,y,reserved=[]){
    const card=CARDS[key],radius=card.radius||12,candidates=[];
    for(let row=-3;row<=3;row++)for(let col=-3;col<=3;col++){
      const p={x:clamp(x+col*18,46,554),y:clamp(y+row*18,42,758)};
      if(reserved.some(other=>distance(p,other)<radius*1.4))continue;
      if(!card.flying&&p.y>RIVER.top-4&&p.y<RIVER.bottom+4&&!LANES.some(lane=>Math.abs(lane-p.x)<=27))continue;
      if(!card.flying&&[...this.towers,...this.units.filter(u=>u.card.structure)].some(t=>t.hp>0&&distance(p,t)<t.radius+radius*.7))continue;
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
  activateAbility(team,id){
    const unit=this.units.find(u=>u.id===id&&u.team===team&&u.hp>0&&u.spawn<=0),ability=unit?.card.ability;
    if(this.state!=='playing'||this.tiebreaker||!ability||unit.abilityUsed)return{ok:false,reason:'Habilidad no disponible.'};
    if(this.energy[team]<ability.cost)return{ok:false,reason:`Necesitás ${ability.cost} de elixir.`};
    this.energy[team]-=ability.cost;this.stats[team].energy+=ability.cost;unit.abilityUsed=true;
    if(ability.dash){const target=this.acquire(unit);if(target){this.face(unit,target);unit.x=clamp(unit.x+unit.dx*ability.dash,44,556);unit.y=clamp(unit.y+unit.dy*ability.dash,44,756);}}
    if(ability.effect==='restore'){const amount=Math.min(unit.maxHp-unit.hp,ability.heal);unit.hp+=amount;if(amount)this.emit('heal',{unit,amount});}
    if(ability.effect==='healingFire')this.healNearby(unit,ability.heal,ability.radius,true);
    if(ability.effect==='shield')for(const ally of this.units)if(ally.team===team&&ally.hp>0&&distance(unit,ally)<=ability.radius){ally.shield=Math.max(ally.shield||0,ability.shield);ally.maxShield=Math.max(ally.maxShield||0,ally.shield);}
    for(const target of[...this.units,...this.towers])if(target.team!==team&&target.hp>0&&(!target.burrowed||ability.effect==='quake')&&(!ability.groundOnly||!target.card?.flying)&&distance(unit,target)<=ability.radius+target.radius){
      if(ability.damage)this.damage(target,'king'in target?Math.round(ability.damage*.28):ability.damage,team,{stun:ability.stun,slow:ability.slow,burn:ability.burn,sourceId:unit.id,affectsHidden:ability.effect==='quake'});
      if(ability.knockback&&target.card&&!target.card.structure){const d=distance(unit,target)||1;target.x=clamp(target.x+(target.x-unit.x)/d*ability.knockback,44,556);target.y=clamp(target.y+(target.y-unit.y)/d*ability.knockback,44,756);target.target=null;target.engaged=false;target.attackSeq++;}
    }
    this.emit('ability',{unit,radius:ability.radius});return{ok:true};
  }
  healNearby(unit,amount,radius,all=false){
    let allies=this.units.filter(u=>u!==unit&&u.team===unit.team&&u.hp>0&&u.hp<u.maxHp&&!u.card.structure&&distance(u,unit)<=radius).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
    if(!all)allies=allies.slice(0,1);
    for(const ally of allies){const restored=Math.min(amount,ally.maxHp-ally.hp);ally.hp+=restored;if(unit.card.cleanse){ally.burn=null;ally.slow=0;}this.emit('heal',{unit:ally,amount:restored});}
  }
  addField(x,y,team,damage,sourceId){
    const existing=this.fields.find(f=>f.team===team&&f.sourceId===sourceId&&Math.hypot(f.x-x,f.y-y)<50);
    if(existing){existing.life=3;return;}if(this.fields.length>=24)this.fields.shift();
    const owner=this.units.find(u=>u.id===sourceId);this.fields.push({x,y,team,damage,sourceId,sourceKey:owner?.key||'',style:owner?.card.fieldStyle||'poison',air:!!(owner?.card.air||owner?.card.flying),life:3,tick:.5,radius:48});
  }
  spellField(spell){
    const c=spell.card;
    this.fields.push({id:this.nextId++,key:spell.key,x:spell.x,y:spell.y,team:spell.team,radius:c.splash,style:c.style,damage:c.fieldDamage||0,
      duration:c.fieldDuration,life:c.fieldDuration,tick:.5,air:!c.groundOnly,pull:c.pull||0,airMultiplier:c.airMultiplier||1,
      buildingMultiplier:c.buildingMultiplier||1,towerDamage:c.fieldTowerDamage||0,slow:c.fieldSlow||0,affectsHidden:!!c.affectsHidden,
      spawnKey:c.spawnKey,spawnEvery:c.spawnEvery,spawnTotal:c.spawnTotal||0,spawned:0,spawnClock:0});
  }
  stepFields(dt){
    for(const f of this.fields){
      const active=Math.min(dt,Math.max(0,f.life));f.life=Math.max(0,f.life-active);f.tick-=active;
      const targets=[...this.units,...this.towers].filter(t=>t.team!==f.team&&t.hp>0&&(!t.burrowed||f.affectsHidden)&&isCombatTargetReady(t)&&(!t.card?.flying||f.air)&&(f.key?spellOverlapsTarget(f,f,t):distance(t,f)<f.radius+(t.radius||0)));
      for(const target of targets)if(target.card){
        if(f.slow)target.slow=Math.max(target.slow||0,f.slow);
        if(f.pull&&!target.card.structure&&!target.leap){
          const d=distance(target,f)||1,amount=Math.min(d,f.pull*active),p={x:clamp(target.x+(f.x-target.x)/d*amount,46,554),y:clamp(target.y+(f.y-target.y)/d*amount,42,758)};
          const blocked=!target.card.flying&&((p.y>RIVER.top-4&&p.y<RIVER.bottom+4&&!LANES.some(lane=>Math.abs(lane-p.x)<=29))||[...this.towers,...this.units.filter(u=>u.card.structure)].some(t=>t.hp>0&&distance(p,t)<t.radius+target.radius*.7));
          if(!blocked){target.x=p.x;target.y=p.y;}
        }
      }
      while(f.tick<=1e-7){
        f.tick+=.5;
        for(const target of targets){
          const amount='king'in target?(f.towerDamage||0):f.damage*(target.card.structure?(f.buildingMultiplier||1):target.card.flying?(f.airMultiplier||1):1);
          if(amount>0)this.damage(target,amount*.5,f.team,{dot:true,sourceId:f.sourceId||0,sourceKey:f.key||f.sourceKey||'',affectsHidden:f.affectsHidden});
        }
      }
      if(f.spawnKey){
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
  startLeap(unit,target){
    if(!unit.card.jumpRange||unit.leap||unit.cooldown>0||distance(unit,target)>unit.card.jumpRange+target.radius)return false;
    const onBridge=LANES.some(lane=>Math.abs(unit.x-lane)<29&&Math.abs(target.x-lane)<29);
    if(!onBridge&&((unit.y<RIVER.top&&target.y>RIVER.top)||(unit.y>RIVER.bottom&&target.y<RIVER.bottom)))return false;
    this.face(unit,target);unit.target=target;unit.engaged=true;
    unit.leap={startX:unit.x,startY:unit.y,endX:target.x,endY:target.y,elapsed:0,duration:unit.card.jumpDuration};
    this.emit('leap',{unit,from:{x:unit.x,y:unit.y},to:{x:target.x,y:target.y}});return true;
  }
  startRiverJump(unit,target){
    if(!unit.card.riverJump||unit.leap||unit.attack>0||LANES.some(x=>Math.abs(unit.x-x)<=29))return false;
    const upward=unit.y>=RIVER.bottom&&target.y<RIVER.top,downward=unit.y<=RIVER.top&&target.y>RIVER.bottom;
    if(!upward&&!downward)return false;
    const bank=upward?RIVER.bottom:RIVER.top;
    if(Math.abs(unit.y-bank)>12)return false;
    const endY=upward?RIVER.top-8:RIVER.bottom+8,ratio=(endY-unit.y)/(target.y-unit.y);
    const point=this.reinforcementPoint(unit.key,unit.x+(target.x-unit.x)*ratio,endY);
    if(!point||(upward?point.y>=RIVER.top:point.y<=RIVER.bottom))return false;
    this.face(unit,point);unit.attackSeq++;unit.attack=0;unit.moving=true;
    unit.leap={kind:'river',startX:unit.x,startY:unit.y,endX:point.x,endY:point.y,elapsed:0,duration:.6};
    this.emit('leap',{unit,from:{x:unit.x,y:unit.y},to:point});return true;
  }
  stepLeap(unit,dt){
    const leap=unit.leap;leap.elapsed=Math.min(leap.duration,leap.elapsed+dt);
    const p=leap.elapsed/leap.duration;unit.x=leap.startX+(leap.endX-leap.startX)*p;unit.y=leap.startY+(leap.endY-leap.startY)*p;
    if(p<1)return;
    unit.leap=null;
    if(leap.kind==='river'){const point=this.constrainMovement(unit,unit.x,unit.y);unit.x=point.x;unit.y=point.y;unit.moving=true;return;}
    const from=this.muzzle(unit),to={x:unit.x,y:unit.y-15};
    this.emit('attackRelease',{attacker:unit,target:unit.target,key:unit.key,style:'lightning',from,to,shot:0});
    for(const target of[...this.units,...this.towers])if(this.validTarget(unit,target)&&distance(unit,target)<unit.card.splash+target.radius*.4)this.strike(unit,target,unit.card.damage,unit.card);
    this.emit('deathBurst',{unit,radius:unit.card.splash});this.emit('hit',{x:unit.x,y:unit.y-15,key:unit.key,style:'lightning',team:unit.team});
    this.retireUnit(unit);
  }
  validTarget(unit, target) {
    return !!(target && target.hp > 0 && !target.burrowed && target.team !== unit.team && (!target.card?.flying || unit.card.air) && (!unit.card.building || 'king' in target || target.card?.structure) && isCombatTargetReady(target));
  }
  updateBurrows(dt){
    for(const unit of this.units){
      if(!unit.card.burrow||unit.hp<=0)continue;
      const hidden=unit.spawn>0||![...this.units,...this.towers].some(target=>this.validTarget(unit,target)&&distance(unit,target)<=unit.card.range+target.radius);
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
    const reach=(unit.radius>=22?2:1)*TILE;
    return (target.x-W/2)*(unit.lane===0?1:-1)<=reach+1e-7;
  }
  acquire(unit) {
    if(unit.card.building&&!unit.engaged){
      const pull=this.units.filter(t=>t.card.structure&&this.validTarget(unit,t)&&this.withinPullLane(unit,t)&&distance(unit,t)<=(unit.card.pullRange||300)&&(unit.team?t.y>=unit.y-48:t.y<=unit.y+48)).sort((a,b)=>distance(unit,a)-distance(unit,b));
      if(pull.length)return pull[0];
    }
    const candidates=[...this.towers,...this.units].filter(t=>{
      if(!this.validTarget(unit,t))return false;
      if(unit.card.building&&t.card?.structure&&!this.withinPullLane(unit,t))return false;
      if(unit.card.structure)return distance(unit,t)<=unit.card.range+t.radius;
      return 'king'in t||distance(unit,t)<=(t.card.structure?(unit.card.building?unit.card.pullRange||300:Math.max(220,unit.card.sightRange||0)):Math.max(165,unit.card.sightRange||0));
    });
    candidates.sort((a,b)=>distance(unit,a)-distance(unit,b));return candidates[0]||null;
  }
  waypoint(unit, target) {
    if (unit.card.flying||unit.card.riverJump) return target;
    const bridge = LANES[unit.lane];
    if (unit.y > RIVER.bottom && target.y < RIVER.bottom) return Math.abs(unit.x - bridge) > 29 ? { x: bridge, y: RIVER.bottom + 20 } : { x: bridge, y: RIVER.top - 20 };
    if (unit.y < RIVER.top && target.y > RIVER.top) return Math.abs(unit.x - bridge) > 29 ? { x: bridge, y: RIVER.top - 20 } : { x: bridge, y: RIVER.bottom + 20 };
    if (unit.y >= RIVER.top && unit.y <= RIVER.bottom) return { x: bridge, y: target.y < unit.y ? RIVER.top - 20 : RIVER.bottom + 20 };
    return target;
  }
  move(unit, target, dt) {
    if(this.startRiverJump(unit,target))return;
    const goal = this.waypoint(unit, target);
    let dx = goal.x - unit.x, dy = goal.y - unit.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    dx /= d; dy /= d;
    let speed = unit.card.speed * (unit.slow > 0 ? .58 : 1) * (unit.card.charge && unit.charge >= unit.card.charge ? 1.65 : 1);
    if(speed<=0)return;
    // Steer around bodies before separating overlaps. Pure backward repulsion can
    // cancel a slow tank's entire movement when another body occupies its lane.
    const obstacles=[...this.units.filter(other=>other!==unit&&other.hp>0&&other.spawn<=0&&!!other.card.flying===!!unit.card.flying),...(!unit.card.flying?this.towers.filter(t=>t.hp>0):[])];
    const ahead=obstacles.filter(other=>other!==target).map(other=>{
      const ox=other.x-unit.x,oy=other.y-unit.y,solid='king'in other||other.card.structure;
      return{other,forward:ox*dx+oy*dy,side:ox*(-dy)+oy*dx,gap:solid?other.radius+unit.radius*.7:(unit.radius+other.radius)*.7};
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
        if(!unit.avoidSide&&Math.abs(preferred-bridge)>29&&Math.abs(opposite-bridge)<=29)side=-side;
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
      const gap = (unit.radius + other.radius) * .7;
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
        const gap = tower.radius + unit.radius * .7;
        if (td < gap) {
          if (td < 1e-7) tx = unit.id % 2 ? 1 : -1;
          td = Math.hypot(tx, ty) || 1;
          nx = tower.x + tx / td * gap; ny = tower.y + ty / td * gap;
        }
      }
      if (ny >= RIVER.top - 3 && ny <= RIVER.bottom + 3 && Math.min(...LANES.map(x => Math.abs(nx - x))) > 29) {
        if(Math.abs(unit.x-LANES[unit.lane])<=29)nx=clamp(nx,LANES[unit.lane]-29,LANES[unit.lane]+29);
        else ny = unit.y > 400 ? RIVER.bottom + 4 : RIVER.top - 4;
      }
    }
    return{x:clamp(nx,46,554),y:clamp(ny,42,758)};
  }
  face(attacker, target) {
    const dx = target.x - attacker.x, dy = target.y - attacker.y, d = Math.hypot(dx,dy) || 1;
    attacker.dx = dx / d; attacker.dy = dy / d;
  }
  attack(attacker, target) {
    if(attacker.king&&!attacker.active)return;
    const card = attacker.card, profile = card || attacker.guard;
    if (card?.passive) return;
    const duration = card?.attackDuration || .6;
    // Simulation timing is independent of which images have finished loading.
    const windup = card?.windup ?? .18;
    this.face(attacker,target);
    attacker.target=target;
    attacker.engaged=true;
    attacker.cooldown = card?.interval || attacker.interval;
    attacker.attack = duration; attacker.attackDuration = duration; attacker.attackWindup = windup; attacker.attackAnim = profile.attackAnim;
    const seq = ++attacker.attackSeq;
    const charged = !!(card?.charge && attacker.charge >= card.charge);
    attacker.charge = 0;
    for (let shot=0;shot<(card?.burst || 1);shot++) this.attacks.push({ attacker, target, seq, shot, charged, delay: windup + shot*(card?.burstSpacing || 0) });
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
    const reach=(card?.range||a.range)+target.radius;
    if(card ? distance(a,target)>reach+(card.range<50?12:55) : distance(a,target)>a.range)return;
    this.face(a,target);
    const from=this.muzzle(a,shot),to=aimPoint(target),amount=(card?.damage||a.damage)*(charged?2:1);
    this.emit('attackRelease',{attacker:a,target,key:a.key||a.guard.id,style,from,to,shot,charged});
    if(card?.rollingShot){
      this.projectiles.push({id:a.id+':'+job.seq+':'+shot,key:a.key,sourceId:a.id,sourceKey:a.key,target,team:a.team,x:a.x,y:a.y,startX:a.x,startY:a.y,dx:a.dx,dy:a.dy,totalDistance:card.projectileRange,travelled:0,speed:card.projectileSpeed,damage:amount,style:'rock',rolling:true,shotRadius:card.shotRadius,knockback:card.knockback,hitIds:[],life:card.projectileRange/card.projectileSpeed+1});
    }else if(style==='psychic'){
      const motion=projectileProfile(card);
      this.projectiles.push({id:a.id+':'+job.seq+':'+shot,key:a.key,sourceId:a.id,sourceKey:a.key,target,team:a.team,x:a.x,y:a.y,startX:a.x,startY:a.y,liftX:from.x-a.x,liftY:from.y-a.y,dx:a.dx,dy:a.dy,totalDistance:card.range+10,travelled:0,speed:motion.speed,damage:amount,style,linear:true,air:!!card.air,shotRadius:17,hitIds:[],life:(card.range+10)/motion.speed+1,stun:card.stun||0,slow:card.slow||0,burn:card.burn||0});
    }else if(card?.bolts){
      const second=[...this.units,...this.towers].filter(t=>t!==target&&this.validTarget(a,t)&&distance(a,t)<=card.range+t.radius).sort((x,y)=>distance(a,x)-distance(a,y))[0];
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
        const next=[...this.units,...this.towers].filter(t=>this.validTarget(a,t)&&!hit.has(t.id)&&distance(t,last)<78).sort((x,y)=>distance(x,last)-distance(y,last))[0];
        if(!next)break;
        this.strike(a,next,amount*Math.pow(.6,i+1),card);this.emit('beam',{from:aimPoint(last),to:aimPoint(next),style,key:a.key,team:a.team,chainFromId:last.id,targetId:next.id});hit.add(next.id);last=next;
      }
    } else if(style==='flame') {
      const angle=Math.atan2(a.dy,a.dx);
      const speed=card.flameSpeed||300,length=card.range+Math.max(22,target.radius);
      this.projectiles.push({id:a.id+':'+job.seq+':'+shot,key:a.key,sourceKey:a.key,sourceId:a.id,team:a.team,style,flameCone:true,
        x:a.x,y:a.y,startX:a.x,startY:a.y,groundX:a.x,groundY:a.y,angle,cone:card.cone,air:!!card.air,
        totalDistance:length,travelled:0,speed,damage:amount,hitIds:[],life:length/speed+.05});
      this.emit('flame',{key:a.key,from,to,groundFrom:{x:a.x,y:a.y},groundTo:{x:target.x,y:target.y},team:a.team,length,speed,cone:card.cone,angle,sourceId:a.id,targetId:target.id,shot});
    } else if(card&&card.range<50) {
      this.strike(a,target,amount,card);
      if(card.splash)for(const u of this.units)if(u!==target&&this.validTarget(a,u)&&distance(u,target)<card.splash)this.strike(a,u,amount,card);
      this.emit('melee',{from,to,key:a.key,style,team:a.team,shot,charged,radius:card.splash||0,sourceId:a.id,targetId:target.id});
      this.emit('hit',{x:to.x,y:to.y,groundX:target.x,groundY:target.y,impactHeight:target.y-to.y,radius:card.splash||0,structuresOnly:!!card.building,groundOnly:!card.air,key:a.key,style,team:a.team,targetId:target.id});
    } else {
      const motion=projectileProfile(profile),totalDistance=distance(a,target);
      this.projectiles.push({ id:a.id+':'+job.seq+':'+shot,x:a.x,y:a.y,startX:a.x,startY:a.y,groundPath:true,liftX:from.x-a.x,liftY:from.y-a.y,endLiftY:to.y-target.y,totalDistance,travelled:0,target,team:a.team,sourceId:a.id,sourceKey:a.key||'tower',damage:amount,speed:motion.speed,key:a.key||'tower',style,art:card?.projectileArt,splash:card?.splash||0,stun:card?.stun||0,slow:card?.slow||0,burn:card?.burn||0,burnKind:card?.burnKind||'fire',poisonField:card?.poisonField||0,air:!card||!!card.air,life:Math.max(3,totalDistance/motion.speed+1),arc:motion.arc,trace:[] });
    }
    if(card?.suicide)this.retireUnit(a);
  }
  ai(dt) {
    if (!this.aiEnabled) return;
    this.aiClock -= dt;
    if (this.aiClock > 0) return;
    const level = this.difficulty === 'easy' ? .7 : this.difficulty === 'hard' ? 1.3 : 1;
    this.aiClock = (1.3 + this.random() * 1.5) / level;
    const hero=this.units.find(u=>u.team===1&&u.spawn<=0&&u.card.ability&&!u.abilityUsed&&u.hp>0&&this.energy[1]>=u.card.ability.cost&&this.units.some(e=>e.team===0&&e.hp>0&&distance(e,u)<u.card.ability.radius));
    if(hero)this.activateAbility(1,hero.id);
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
          const origin=this.resolveDeployment(1,choice.key,target.x,Math.min(352,Math.max(40,target.y-2*TILE)));
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
    entity.hit=Math.max(0,entity.hit-dt);entity.stun=Math.max(0,entity.stun-dt);
    entity.freeze=Math.max(0,(entity.freeze||0)-dt);
    entity.slow=Math.max(0,(entity.slow||0)-dt);entity.attack=Math.max(0,(entity.attack||0)-dt);
    if(entity.burn&&entity.hp>0){
      const burn=entity.burn;burn.remaining-=dt;burn.tick-=dt;
      if(burn.tick<=0){burn.tick+=.5;this.damage(entity,burn.damage*.5,burn.team,{dot:true,sourceId:burn.sourceId||0,sourceKey:burn.sourceKey||''});}
      if(burn.remaining<=0)entity.burn=null;
    }
  }
  blink(unit,target) {
    if(unit.card.dash){
      const d=distance(unit,target),sameBank=unit.y<RIVER.top&&target.y<RIVER.top||unit.y>RIVER.bottom&&target.y>RIVER.bottom;
      if(unit.dash||unit.blinkCooldown>0||unit.attack>0||d<unit.card.dashMin||d>unit.card.dashMax||!sameBank)return false;
      unit.attackSeq++;unit.attack=unit.attackDuration=unit.attackWindup=unit.card.dashWindup;unit.engaged=true;this.face(unit,target);
      unit.dash={phase:'windup',elapsed:0,targetId:target.id,startX:unit.x,startY:unit.y};
      this.emit('dashWindup',{unit,duration:unit.card.dashWindup});return true;
    }
    if(!unit.card.blink||unit.blinkCooldown>0||distance(unit,target)>155||distance(unit,target)<65)return false;
    if(!((unit.y<RIVER.top&&target.y<RIVER.top)||(unit.y>RIVER.bottom&&target.y>RIVER.bottom)))return false;
    const from={x:unit.x,y:unit.y},d=distance(unit,target)||1,reach=unit.card.range+target.radius-3;
    const x=target.x+(unit.x-target.x)/d*reach,y=target.y+(unit.y-target.y)/d*reach;
    if(x<46||x>554||y<42||y>758||this.towers.some(t=>t.hp>0&&distance(t,{x,y})<t.radius+unit.radius*.7))return false;
    unit.x=x;unit.y=y;unit.blinkCooldown=unit.card.blink;this.face(unit,target);
    this.emit('blink',{from,to:{x,y},unit});return true;
  }
  stepDash(unit,dt){
    const dash=unit.dash,target=[...this.units,...this.towers].find(t=>t.id===dash.targetId);
    if(!this.validTarget(unit,target)||unit.stun>0){unit.dash=null;unit.attack=0;unit.engaged=false;return;}
    dash.elapsed+=dt;
    if(dash.phase==='windup'){
      if(dash.elapsed+1e-7<unit.card.dashWindup)return;
      const d=distance(unit,target),reach=unit.card.range+target.radius-3;
      const sameBank=unit.y<RIVER.top&&target.y<RIVER.top||unit.y>RIVER.bottom&&target.y>RIVER.bottom;
      if(d<unit.card.dashMin||d>unit.card.dashMax||!sameBank){unit.dash=null;unit.attack=0;unit.engaged=false;return;}
      const end=this.constrainMovement(unit,target.x+(unit.x-target.x)/d*reach,target.y+(unit.y-target.y)/d*reach);
      Object.assign(dash,{phase:'travel',elapsed:0,startX:unit.x,startY:unit.y,endX:end.x,endY:end.y,duration:Math.max(.18,Math.hypot(end.x-unit.x,end.y-unit.y)/unit.card.dashSpeed)});
      unit.blinkCooldown=unit.card.blink;unit.attack=0;unit.moving=true;this.face(unit,target);
      this.emit('dashStart',{unit,from:{x:dash.startX,y:dash.startY},to:{x:dash.endX,y:dash.endY},duration:dash.duration});return;
    }
    const progress=Math.min(1,dash.elapsed/dash.duration);unit.x=dash.startX+(dash.endX-dash.startX)*progress;unit.y=dash.startY+(dash.endY-dash.startY)*progress;unit.moving=true;
    if(progress<1)return;
    unit.dash=null;unit.cooldown=unit.card.interval;unit.attackDuration=.4;unit.attackWindup=0;unit.attack=.4;
    if(distance(unit,target)<=unit.card.range+target.radius+8){
      const from=this.muzzle(unit),to=aimPoint(target);this.strike(unit,target,unit.card.damage*unit.card.dashMultiplier,unit.card);
      this.emit('attackRelease',{attacker:unit,target,key:unit.key,style:'dash',from,to,shot:0,charged:true});
      this.emit('melee',{sourceId:unit.id,targetId:target.id,key:unit.key,team:unit.team,style:'dash',from,to,charged:true});
    }
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
        for(const target of[...this.units,...this.towers])if(target.team!==spell.team&&target.hp>0&&!target.burrowed&&!target.card?.flying&&!spell.hitIds.includes(target.id)&&Math.abs(target.x-spell.x)<spell.card.splash+target.radius&&target.y>=Math.min(previousY,spell.y)-18-target.radius&&target.y<=Math.max(previousY,spell.y)+18+target.radius){
          spell.hitIds.push(target.id);this.damage(target,'king'in target?spell.card.towerDamage:spell.card.damage,spell.team,{sourceKey:spell.key});
          if(target.card&&!target.card.structure){target.y=clamp(target.y+(spell.team?1:-1)*spell.card.knockback,42,758);target.attackSeq++;target.attack=0;target.target=null;target.engaged=false;}
          this.emit('hit',{x:target.x,y:target.y,key:spell.key,style:'rock',team:spell.team});
        }
        if(spell.travelRemaining<=1e-7)spell.done=true;continue;
      }
      if(spell.done)continue;
      if(spell.card.travelSpeed){
        const waiting=spell.delay;
        spell.delay=Math.max(0,waiting-dt);
        spell.flightElapsed=Math.min(spell.flightTime,spell.flightElapsed+Math.max(0,dt-waiting));
        if(spell.delay>0||spell.flightElapsed+1e-7<spell.flightTime)continue;
      }else{spell.delay-=dt;if(spell.delay>0)continue;}
      spell.done = true;
      if(spell.card.spawnOnImpact)this.summonSpell(spell);
      if(spell.card.fieldDuration)this.spellField(spell);
      let targets = [...this.units, ...this.towers].filter(t => t.team !== spell.team && t.hp > 0 && (!t.burrowed||spell.card.affectsHidden) && isCombatTargetReady(t) && (!spell.card.groundOnly||!t.card?.flying) && spellOverlapsTarget(spell.card,spell,t));
      if(spell.card.targetLimit)targets=targets.sort((a,b)=>b.hp-a.hp||a.id-b.id).slice(0,spell.card.targetLimit);
      for (const target of targets) {
        if(spell.card.damage>0)this.damage(target, 'king' in target ? spell.card.towerDamage : spell.card.damage, spell.team, {...spell.card,sourceKey:spell.key});
        if(spell.card.targetLimit)this.emit('beam',{from:{x:target.x,y:target.y-180},to:aimPoint(target),style:'lightning',key:spell.key,team:spell.team});
        if (target.card && spell.card.knockback && !target.card.building && !target.card.structure) {
          const d = distance(target, spell) || 1;
          const nx = clamp(target.x + (target.x - spell.x) / d * spell.card.knockback, 46, 554);
          const ny = clamp(target.y + (target.y - spell.y) / d * spell.card.knockback, 42, 758);
          const onGround = !target.card.flying;
          const offBridge = Math.min(...LANES.map(x => Math.abs(nx - x))) > 29;
          if (!(onGround && ny > RIVER.top && ny < RIVER.bottom && offBridge)) { target.x = nx; target.y = ny; }
        }
      }
      this.emit('spellHit', { key: spell.key, x: spell.x, y: spell.y, radius: spell.card.splash, team: spell.team });
    }
    this.spells = this.spells.filter(s => !s.done);
    for (const tower of this.towers) {
      this.tickStatus(tower,dt);tower.anim+=dt;tower.cooldown-=dt;
      if (tower.hp <= 0 || !tower.active || tower.stun > 0) continue;
      const enemies = this.units.filter(u => u.team !== tower.team && u.hp > 0 && !u.burrowed && isCombatTargetReady(u) && distance(tower, u) <= tower.range);
      enemies.sort((a, b) => distance(tower, a) - distance(tower, b));
      if(!enemies.includes(tower.target))tower.target=enemies[0]||null;
      if(tower.target){this.face(tower,tower.target);if(tower.cooldown<=0)this.attack(tower,tower.target);}
    }
    for (const unit of this.units) {
      if (unit.hp <= 0) continue;
      unit.spawn = Math.max(0, unit.spawn - dt);this.tickStatus(unit,dt);
      if(unit.hp<=0)continue;
      if(unit.spawn<=0&&unit.entryPending){
        unit.entryPending=false;
        for(const target of [...this.units,...this.towers])if(target.team!==unit.team&&target.hp>0&&!target.burrowed&&isCombatTargetReady(target)&&distance(target,unit)<=unit.card.entryRadius+target.radius*.4){
          this.damage(target,'king'in target?Math.round(unit.card.entryDamage*.3):unit.card.entryDamage,unit.team,{stun:unit.card.entryStun||0,slow:unit.card.entrySlow||0,sourceId:unit.id,sourceKey:unit.key});
        }
        this.emit('entry',{unit,x:unit.x,y:unit.y,radius:unit.card.entryRadius,style:unit.card.entryStun?'lightning':'ice'});
      }
      unit.cooldown-=dt;unit.anim+=dt;unit.blinkCooldown=Math.max(0,unit.blinkCooldown-dt);
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
      if(unit.card.summon){unit.summonClock-=dt;if(unit.summonClock<=0){unit.summonClock+=unit.card.summonEvery;unit.summonCycle=unit.card.summonEvery;const alive=this.units.filter(u=>u.parentId===unit.id&&u.hp>0).length;this.spawnReinforcements(unit,unit.card.summon,Math.max(0,Math.min(unit.card.summonCount||1,(unit.card.summonMax||3)-alive)));}}
      if(unit.card.heal){unit.healClock-=dt;if(unit.healClock<=0){unit.healClock=unit.card.healEvery;this.healNearby(unit,unit.card.heal,unit.card.healRadius,unit.card.healAll);}}
      if(unit.card.structure&&unit.target&&distance(unit,unit.target)>unit.card.range+unit.target.radius||unit.card.building&&unit.target?.card?.structure&&!this.withinPullLane(unit,unit.target)){unit.target=null;unit.engaged=false;unit.attackSeq++;unit.attack=0;}
      if(!this.validTarget(unit,unit.target)||(unit.target?.card&&distance(unit,unit.target)>(unit.card.building?unit.card.pullRange||300:Math.max(240,unit.card.sightRange||0)))){unit.target=null;unit.engaged=false;}
      if(unit.target&&unit.engaged&&unit.attack<=0&&distance(unit,unit.target)>unit.card.range+unit.target.radius+45)unit.engaged=false;
      if(!unit.engaged){
        const nearest=this.acquire(unit);
        const pulled=unit.card.building&&nearest?.card?.structure&&!unit.target?.card?.structure;
        if(nearest&&(!unit.target||pulled||distance(unit,nearest)+2<distance(unit,unit.target))){unit.target=nearest;unit.attackSeq++;unit.attack=0;}
      }
      const target = unit.target;
      if (!target) continue;
      if(this.startLeap(unit,target))continue;
      if(unit.card.copy&&target.card&&!target.card.structure&&!target.card.token){const copied={};for(const key of['damage','range','interval','style','burst','burstSpacing','bolts','stun','slow','burn','burnKind','splash','air','chain','cone','pierce','projectileSpeed','projectileArc','projectileArt','rollingShot','projectileRange','shotRadius','knockback','lifesteal','poisonField','attackDuration','windup'])if(key in target.card)copied[key]=target.card[key];unit.card={...unit.card,...copied,damage:Math.round(target.card.damage*.85),copy:false,attackAnim:'Attack'};this.emit('transform',{unit});}
      if(this.blink(unit,target))continue;
      const reach = unit.card.range + target.radius;
      if (distance(unit, target) <= reach) { this.face(unit,target);if (unit.cooldown <= 0) this.attack(unit, target); }
      else if(!unit.card.structure&&unit.attack<=0)this.move(unit, target, dt);
    }
    for(const job of this.attacks){job.delay-=dt;if(job.delay<=0&&!job.done){job.done=true;this.release(job);}}
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
          if(Math.hypot(tx-p.dx*along,ty-p.dy*along)>p.shotRadius+target.radius*(p.linear?.65:.7))continue;
          p.hitIds.push(target.id);this.damage(target,p.damage,p.team,p);
          if(p.knockback&&target.hp>0&&target.card&&!target.card.structure&&!target.card.building&&!target.card.knockbackImmune&&target.maxHp<2500){
            const point=this.constrainMovement(target,target.x+p.dx*p.knockback,target.y+p.dy*p.knockback);
            target.x=point.x;target.y=point.y;target.attackSeq++;target.attack=0;target.target=null;target.engaged=false;target.charge=0;
          }
          const impact=aimPoint(target);this.emit('hit',{key:p.key,style:p.style,x:impact.x,y:impact.y,groundX:target.x,groundY:target.y,impactHeight:target.y-impact.y,team:p.team,targetId:target.id});
        }
        if(p.travelled>=p.totalDistance-1e-7)p.life=0;
        continue;
      }
      if (p.target.hp <= 0||p.target.burrowed) { p.life = 0; continue; }
      const {x:tx,y:ty}=p.groundPath?p.target:aimPoint(p.target);
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d < p.speed * dt + 7) {
        this.damage(p.target, p.damage, p.team, p);
        if (p.splash) for (const u of this.units) if (u !== p.target && u.team !== p.team && u.hp > 0 && isCombatTargetReady(u) && (!u.card.flying || p.air) && distance(u, p.target) < p.splash) this.damage(u, p.damage, p.team, p);
        const impact=aimPoint(p.target);this.emit('hit', { key: p.key, style:p.style, art:p.art, x: impact.x, y: impact.y, groundX:p.target.x,groundY:p.target.y,impactHeight:p.target.y-impact.y,radius:p.splash||0,groundOnly:!p.air,team: p.team,targetId:p.target.id }); p.life = 0;
      } else { p.trace.push({x:p.x,y:p.y});if(p.trace.length>7)p.trace.shift();p.x += dx / d * p.speed * dt; p.y += dy / d * p.speed * dt;p.travelled+=p.speed*dt; }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
    this.units = this.units.filter(u => u.hp > 0);
    if (this.time <= 0 && this.state === 'playing') this.endClock();
  }
}

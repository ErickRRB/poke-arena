import { EXTRA_CARDS } from './catalog.js?v=7';
import { applyBalance } from './balance.js?v=7';
export const W = 600, H = 800;
export const RIVER = { top: 375, bottom: 425 };
export const LANES = [158, 442];
export const CARDS = {
  pikachu: { name: 'Pikachu', id: 25, cost: 3, type: 'electric', label: 'Eléctrico', role: 'A distancia', hp: 310, damage: 76, range: 128, speed: 52, interval: 1.05, air: true, stun: .18, color: '#f8d66d', description: 'Impactrueno alcanza a rivales terrestres y aéreos, y los frena un instante.' },
  squirtle: { name: 'Squirtle', id: 7, cost: 2, type: 'water', label: 'Agua', role: 'A distancia', hp: 390, damage: 46, range: 112, speed: 44, interval: 1.05, air: true, color: '#79c9ed', description: 'Ataca con burbujas. Su bajo coste permite acompañar a un tanque.' },
  charmander: { name: 'Charmander', id: 4, cost: 3, type: 'fire', label: 'Fuego', role: 'Daño de área', hp: 330, damage: 72, range: 112, speed: 46, interval: 1.25, air: true, splash: 32, color: '#f19c6b', description: 'Sus ascuas dañan a varios rivales cercanos. Cuidalo detrás de un tanque.' },
  snorlax: { name: 'Snorlax', id: 143, cost: 5, type: 'normal', label: 'Normal', role: 'Tanque · torres', hp: 1720, damage: 135, range: 29, speed: 27, interval: 1.5, building: true, radius: 20, color: '#86b6ab', description: 'Ignora a los Pokémon y avanza hacia las torres. Tiene mucha vida y camina lento.' },
  zubat: { name: 'Zubat', id: 41, cost: 2, type: 'flying', label: 'Volador', role: 'Enjambre · ×3', hp: 115, damage: 32, range: 27, speed: 66, interval: .9, air: true, flying: true, count: 3, color: '#ad9be4', description: 'Despliega tres Zubat. Vuelan sobre el río, pero son vulnerables al daño de área.' },
  charizard: { name: 'Charizard', id: 6, cost: 5, type: 'fire', label: 'Fuego / volador', role: 'Volador · área', hp: 760, damage: 98, range: 120, speed: 40, interval: 1.4, air: true, flying: true, splash: 45, radius: 18, color: '#f19c6b', description: 'Cruza el río volando y lanza fuego en área contra objetivos terrestres y aéreos.' },
  thunder: { name: 'Impactrueno', cost: 3, type: 'electric', label: 'Eléctrico', role: 'Hechizo · aturde', spell: true, damage: 155, towerDamage: 43, splash: 70, stun: .75, color: '#f8d66d', description: 'Elimina enjambres y aturde durante 0,75 segundos. Hace daño reducido a las torres.' },
  fireball: { name: 'Bola de fuego', cost: 4, type: 'fire', label: 'Fuego', role: 'Hechizo · área', spell: true, damage: 400, towerDamage: 110, splash: 82, knockback: 22, color: '#f19c6b', description: 'Daña y empuja en área. Elimina apoyos frágiles; los más resistentes sobreviven. Hace daño reducido a las torres.' },
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
Object.assign(CARDS.machamp, { move: 'Puño dinámico', style: 'punch', attackAnim: 'Double', attackDuration: .85, damage: 34, burst: 4, burstSpacing: .13, interval: 1.35, role: 'Melee · combo', description: 'Encadena cuatro puñetazos a corta distancia. Cada golpe hace daño por separado; no alcanza voladores.' });
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
// A slightly longer cadence makes windups and counterplay easier to read.
for(const card of Object.values(CARDS))if(!card.spell)card.interval=Math.round(card.interval*1.18*100)/100;
// Health is tuned by role. Concentrated melee and building attacks remain useful against tanks/towers.
const arenaBalance={
  pikachu:{hp:520,damage:70},squirtle:{hp:680,damage:23},charmander:{hp:540,damage:48,burn:9},
  snorlax:{hp:3000,damage:180},zubat:{hp:145,damage:28},charizard:{hp:1280,damage:32},
  bulbasaur:{hp:720,damage:54},gengar:{hp:1100,damage:96},machamp:{hp:1580,damage:45},
  eevee:{hp:500,damage:60},onix:{hp:1780,damage:170},blastoise:{hp:1650,damage:62},
  vulpix:{hp:390,damage:25,burn:7},psyduck:{hp:800,damage:61},alakazam:{hp:560,damage:82},
  geodude:{hp:1750,damage:84},magnemite:{hp:620,damage:55},scyther:{hp:950,damage:42},
  lapras:{hp:2000,damage:68},mewtwo:{hp:1280,damage:145}
};
for(const[key,stats]of Object.entries(arenaBalance))Object.assign(CARDS[key],stats);
for(const c of Object.values(CARDS))if(!c.spell)c.damage=Math.round(c.damage*1.06);
CARDS.treecko={name:'Treecko',id:252,cost:3,type:'grass',label:'Planta',role:'Pareja · a distancia',move:'Semilladora',style:'leaf',attackAnim:'Shoot',attackDuration:.7,hp:370,damage:55,range:145,speed:45,interval:1.25,count:2,air:true,muzzleHeight:24,color:'#a5d577',description:'Dos tiradores que atacan a tierra y aire. Vulnerables al daño de área.'};
CARDS.golem={name:'Golem',id:76,cost:8,type:'rock',label:'Roca',role:'Tanque · división',move:'Demolición',style:'slam',attackAnim:'Attack',attackDuration:1,hp:4600,damage:190,range:30,speed:21,interval:2.3,building:true,radius:23,muzzleHeight:35,deathDamage:130,split:true,color:'#b9ad92',description:'Tanque que solo ataca estructuras. Al caer explota y deja dos Geodude pequeños.'};
CARDS.log={name:'Tronco',cost:2,type:'rock',label:'Terrestre',role:'Hechizo · empuje',spell:true,rolling:true,damage:200,towerDamage:55,splash:45,knockback:28,color:'#b99462',description:'Rueda desde tu lado, daña y empuja a los enemigos terrestres.'};
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
// PMD sheets run south, southeast, east, northeast, north, northwest, west, southwest.
export function directionRow(dx, dy) { return (2 - Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8; }
export function aimPoint(target) { return { x: target.x, y: target.y - ('king' in target ? 27 : target.card?.structure ? 43 : target.card?.flying ? 27 : 15) }; }
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Game {
  constructor({ deck = DEFAULT_DECK, difficulty = 'normal', seed = Date.now(), onEvent = () => {}, tutorial = false, animations = {} } = {}) {
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
    this.towers = [];
    this.nextId = 1;
    this.aiClock = 3.5;
    this.stats = [{ deployed: 0, damage: 0, energy: 0, defeated: 0 }, { deployed: 0, damage: 0, energy: 0, defeated: 0 }];
    for (let team = 0; team < 2; team++) {
      for (let lane = 0; lane < 2; lane++) this.towers.push({ id: this.nextId++, team, lane, x: LANES[lane], y: team ? 188 : 612, hp: 3000, maxHp: 3000, king: false, active: true, radius: 29, range: 225, damage: 109, interval: .8, cooldown: .3, stun: 0, hit: 0 });
      this.towers.push({ id: this.nextId++, team, lane: -1, x: 300, y: team ? 118 : 682, hp: 4800, maxHp: 4800, king: true, active: false, radius: 34, range: 210, damage: 109, interval: 1, cooldown: .5, stun: 0, hit: 0 });
    }
    for (const tower of this.towers) Object.assign(tower, {guard: { id: tower.king ? 26 : 52, style: tower.king ? 'lightning' : 'coin', stun:tower.king?.18:0,attackAnim: tower.king ? 'Shock' : 'Shoot' }, dx: 0, dy: tower.team ? 1 : -1, attack: 0, attackDuration: .6, attackSeq: 0, anim: this.random(), target: null });
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
    if (!card || !Number.isFinite(x) || !Number.isFinite(y) || x < 44 || x > 556 || y < 44 || y > 756) return false;
    if (card.spell) return true;
    const lane = x < 300 ? 0 : 1;
    const laneDestroyed = this.towers.some(t => t.team !== team && t.lane === lane && !t.king && t.hp <= 0);
    const inOwnHalf = team === 0 ? y >= 444 : y <= 356;
    const inCaptured = laneDestroyed && (team === 0 ? y >= 252 && y <= 356 : y >= 444 && y <= 548);
    if (!inOwnHalf && !inCaptured) return false;
    return ![...this.towers, ...this.units.filter(u => u.card.structure)].some(t => t.hp > 0 && distance(t, { x, y }) < t.radius + (card.structure ? 38 : 27));
  }
  resolveDeployment(team,key,x,y){
    const card=CARDS[key];
    if(!card||!Number.isFinite(x)||!Number.isFinite(y))return null;
    if(card.spell)return this.canDeploy(team,key,x,y)?{x,y:card.rolling?(team?Math.min(y,356):Math.max(y,444)):y}:null;
    if(x<15||x>585||y<15||y>785)return null;
    // Only assist near a legal edge. The far bank of a bridge is the maximum
    // assisted drop before a side tower falls; deep enemy territory cancels.
    const zones=[{left:44,right:556,top:team?44:444,bottom:team?356:756}];
    for(const lane of[0,1])if(this.towers.some(t=>t.team!==team&&!t.king&&t.lane===lane&&t.hp<=0))zones.push({left:lane?300:44,right:lane?556:300,top:team?444:252,bottom:team?548:356});
    const overBridge=y>=RIVER.top&&y<=RIVER.bottom&&LANES.some(lane=>Math.abs(x-lane)<=44);
    const points=zones.map(z=>({x:clamp(x,z.left,z.right),y:clamp(y,z.top,z.bottom)})).filter(p=>distance(p,{x,y})<=(overBridge?72:32)).sort((a,b)=>distance(a,{x,y})-distance(b,{x,y}));
    if(!points.length)return null;
    const origin=points[0];
    if(this.canDeploy(team,key,origin.x,origin.y))return origin;
    // Search outwards from the drop point, so obstructed drops settle at the nearest free edge.
    for(let radius=3;radius<=96;radius+=3)for(let i=0;i<48;i++){
      const angle=i*Math.PI/24-Math.PI/2,px=origin.x+Math.cos(angle)*radius,py=origin.y+Math.sin(angle)*radius;
      if(this.canDeploy(team,key,px,py))return{x:px,y:py};
    }
    return null;
  }
  deploymentThreats(team,key,x,y,placed=false){
    const card=CARDS[key],point=placed?{x,y}:this.resolveDeployment(team,key,x,y);
    if(!point||card.spell)return[];
    const previews=Array.from({length:card.count||1},(_,i)=>{
      const offset=card.count?(i-(card.count-1)/2)*22:0;
      const p=placed?{x:point.x+offset,y:point.y+(i%2)*15}:this.resolveDeployment(team,key,clamp(point.x+offset,48,552),point.y+(i%2)*15)||point;
      return{...p,team,card,hp:card.hp,radius:card.radius||12,spawn:0};
    });
    return [...this.towers,...this.units].filter(enemy=>enemy.team!==team&&enemy.hp>0&&(enemy.spawn===undefined||enemy.spawn<=0)&&previews.some(preview=>{
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
      if(card.rolling)y=team?Math.min(y,356):Math.max(y,444);
      this.spells.push({ key, card, team, x, y, delay:card.rolling?0:.4,remaining:card.rolling?1.7:0,hitIds:[] });
      this.emit('cast', { key, team, x, y, radius: card.splash });
    } else {
      const count = card.count || 1;
      for (let i = 0; i < count; i++) {
        const offset = count > 1 ? (i - (count - 1) / 2) * 22 : 0;
        const point=this.resolveDeployment(team,key,clamp(x+offset,48,552),y+(i%2)*15)||placement;
        this.spawn(key,team,point.x,point.y);
      }
    }
    this.emit('deploy', { team, key, x, y, cost: card.cost });
    return { ok: true, key, x, y };
  }
  spawn(key, team, x, y, delay = .75) {
    const card = CARDS[key];
    const u = { id: this.nextId++, key, card, team, x, y, hp: card.hp, maxHp: card.hp, radius: card.radius || 12, lane: x < 300 ? 0 : 1, cooldown: .4, spawn: delay, stun: 0, slow: 0, hit: 0, attack: 0, attackDuration: 0, attackSeq: 0, anim: this.random() * 2, dx: 0, dy: team ? 1 : -1, moving: false, target: null, engaged:false,charge: 0, blinkCooldown: 0, stepClock: .2, burn: null, lifetime: card.lifetime || 0,abilityUsed:false };
    this.units.push(u);
    u.shield=card.shield||0;u.maxShield=u.shield;u.summonClock=card.summonEvery||0;u.healClock=card.healEvery||0;u.ttl=card.ttl||0;if(card.scale)u.scale=card.scale;
    this.stats[team].deployed++;
    this.emit('spawn', { unit: u });
    if(card.entryShield)for(const ally of this.units)if(ally.team===team&&ally!==u&&ally.hp>0&&distance(ally,u)<100){ally.shield=Math.max(ally.shield||0,card.entryShield);ally.maxShield=Math.max(ally.maxShield||0,ally.shield);}
    if(card.spawnWith){const baby=this.spawn(card.spawnWith,team,clamp(x+24,44,556),y+12,delay);baby.parentId=u.id;}
    return u;
  }
  damage(target, amount, team, { stun = 0, slow = 0, burn = 0, dot = false, sourceId = 0, reflected = false, poisonField = 0 } = {}) {
    if (target.hp <= 0 || this.state !== 'playing') return;
    amount*=1-(target.card?.armor||0);const absorbed=Math.min(target.shield||0,amount);target.shield=Math.max(0,(target.shield||0)-absorbed);amount-=absorbed;
    const actual = Math.min(target.hp, amount)+absorbed;
    target.hp = Math.max(0, target.hp - amount);
    target.hit = .24;
    target.stun = Math.max(target.stun, stun);
    target.slow = Math.max(target.slow || 0, slow);
    if (stun > 0) { target.attackSeq++; target.attack = 0; target.charge = 0; target.target=null;target.engaged=false;target.cooldown=Math.max(target.cooldown,stun+.18); }
    if (burn > 0) target.burn = { remaining: 3, tick: .5, damage: burn, team };
    this.stats[team].damage += actual;
    this.emit('damage', { target, amount: actual, dot });
    if(poisonField&&!dot)this.addField(target.x,target.y,team,poisonField,sourceId);
    if(target.card?.reflect&&sourceId&&!reflected&&!dot){const attacker=this.units.find(u=>u.id===sourceId)||this.towers.find(t=>t.id===sourceId);if(attacker?.hp>0)this.damage(attacker,actual*target.card.reflect,target.team,{reflected:true});}
    if (target.king) target.active = true;
    if (target.hp <= 0) {
      if ('king' in target) {
        const king = this.towers.find(t => t.team === target.team && t.king);
        king.active = true;
        this.emit('towerDown', { tower: target, team, crowns: this.crowns(team) });
        if (target.king || this.overtime) this.finish(team, target.king ? 'Torre central destruida' : 'Primera torre en tiempo extra');
      } else {
        this.stats[team].defeated++; this.emit(target.card.structure ? 'structureDown' : 'faint', { unit: target });
        if(target.card.split){
          this.emit('deathBurst',{unit:target,radius:64});
          for(const other of[...this.units,...this.towers])if(other.team!==target.team&&other.hp>0&&!other.card?.flying&&distance(other,target)<64+other.radius)this.damage(other,target.card.deathDamage,target.team);
          for(const offset of[-20,20]){const small=this.spawn('geodude',target.team,clamp(target.x+offset,44,556),target.y,.4);small.card={...CARDS.geodude,damage:52,building:true,splash:0,speed:28};small.hp=small.maxHp=900;small.scale=1.45;}
        }
        if(target.card.deathSpawn)for(let i=0;i<(target.card.deathCount||1);i++)this.spawn(target.card.deathSpawn,target.team,clamp(target.x+(i-.5)*25,44,556),target.y,.4);
        if(target.card.deathField)this.addField(target.x,target.y,target.team,target.card.deathField,target.id);
        if(target.card.deathHeal)this.healNearby(target,target.card.deathHeal,125,true);
        if(target.card.deathStun)for(const other of this.units)if(other.team!==target.team&&other.hp>0&&distance(other,target)<100)this.damage(other,1,target.team,{stun:target.card.deathStun});
      }
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
      this.tiebreaker=true;this.time=0;this.attacks=[];this.projectiles=[];this.spells=[];this.fields=[];for(const unit of this.units){unit.attack=0;unit.moving=false;}this.emit('tiebreaker');
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
    for(const target of[...this.units,...this.towers])if(target.team!==team&&target.hp>0&&(!ability.groundOnly||!target.card?.flying)&&distance(unit,target)<=ability.radius+target.radius){
      if(ability.damage)this.damage(target,'king'in target?Math.round(ability.damage*.28):ability.damage,team,{stun:ability.stun,slow:ability.slow,burn:ability.burn,sourceId:unit.id});
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
    const owner=this.units.find(u=>u.id===sourceId);this.fields.push({x,y,team,damage,sourceId,air:!!(owner?.card.air||owner?.card.flying),life:3,tick:.5,radius:48});
  }
  validTarget(unit, target) {
    return !!(target && target.hp > 0 && target.team !== unit.team && (!target.card?.flying || unit.card.air) && (!unit.card.building || 'king' in target || target.card?.structure) && (target.spawn === undefined || target.spawn <= 0));
  }
  acquire(unit) {
    if(unit.card.building&&!unit.engaged){
      const pull=this.units.filter(t=>t.card.structure&&this.validTarget(unit,t)&&distance(unit,t)<=(unit.card.pullRange||300)&&(unit.team?t.y>=unit.y-48:t.y<=unit.y+48)).sort((a,b)=>distance(unit,a)-distance(unit,b));
      if(pull.length)return pull[0];
    }
    const candidates=[...this.towers,...this.units].filter(t=>{
      if(!this.validTarget(unit,t))return false;
      if(unit.card.structure)return distance(unit,t)<=unit.card.range+t.radius;
      return 'king'in t||distance(unit,t)<=(t.card.structure?(unit.card.building?unit.card.pullRange||300:220):165);
    });
    candidates.sort((a,b)=>distance(unit,a)-distance(unit,b));return candidates[0]||null;
  }
  waypoint(unit, target) {
    if (unit.card.flying) return target;
    const bridge = LANES[unit.lane];
    if (unit.y > RIVER.bottom && target.y < RIVER.bottom) return Math.abs(unit.x - bridge) > 29 ? { x: bridge, y: RIVER.bottom + 20 } : { x: bridge, y: RIVER.top - 20 };
    if (unit.y < RIVER.top && target.y > RIVER.top) return Math.abs(unit.x - bridge) > 29 ? { x: bridge, y: RIVER.top - 20 } : { x: bridge, y: RIVER.bottom + 20 };
    if (unit.y >= RIVER.top && unit.y <= RIVER.bottom) return { x: bridge, y: target.y < unit.y ? RIVER.top - 20 : RIVER.bottom + 20 };
    return target;
  }
  move(unit, target, dt) {
    const goal = this.waypoint(unit, target);
    let dx = goal.x - unit.x, dy = goal.y - unit.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    dx /= d; dy /= d;
    const speed = unit.card.speed * (unit.slow > 0 ? .58 : 1) * (unit.card.charge && unit.charge >= unit.card.charge ? 1.65 : 1);
    if(speed<=0)return;
    // Steer around bodies before separating overlaps. Pure backward repulsion can
    // cancel a slow tank's entire movement when another body occupies its lane.
    const obstacles=[...this.units.filter(other=>other!==unit&&other.hp>0&&other.spawn<=0&&!!other.card.flying===!!unit.card.flying),...(!unit.card.flying?this.towers.filter(t=>t.hp>0):[])];
    const blocking=obstacles.filter(other=>other!==target).map(other=>{
      const ox=other.x-unit.x,oy=other.y-unit.y,solid='king'in other||other.card.structure;
      return{other,forward:ox*dx+oy*dy,side:ox*(-dy)+oy*dx,gap:solid?other.radius+unit.radius*.7:(unit.radius+other.radius)*.7};
    }).filter(o=>o.forward>0&&o.forward<o.gap+30&&Math.abs(o.side)<o.gap+3).sort((a,b)=>a.forward-b.forward)[0];
    if(blocking){
      let side=unit.avoidId===blocking.other.id?unit.avoidSide:Math.abs(blocking.side)>2?-Math.sign(blocking.side):unit.id%2?1:-1;
      if(!unit.card.flying&&unit.y>RIVER.top-35&&unit.y<RIVER.bottom+35){
        const bridge=LANES[unit.lane];
        const preferred=blocking.other.x-dy*side*(blocking.gap+2),opposite=blocking.other.x+dy*side*(blocking.gap+2);
        if(Math.abs(preferred-bridge)>29&&Math.abs(opposite-bridge)<=29)side=-side;
        if(blocking.other.card&&!blocking.other.card.structure&&blocking.forward<blocking.gap+15&&unit.radius>=blocking.other.radius){
          blocking.other.x=clamp(blocking.other.x+dy*side*16*dt,bridge-29,bridge+29);
        }
      }
      unit.avoidId=blocking.other.id;unit.avoidSide=side;
      const weight=Math.max(.6,1-blocking.forward/(blocking.gap+30))*1.8;
      const sx=dx-dy*side*weight,sy=dy+dx*side*weight,length=Math.hypot(sx,sy);
      dx=sx/length;dy=sy/length;
    }else{unit.avoidId=null;unit.avoidSide=0;}
    let nx = unit.x + dx * Math.min(d, speed * dt), ny = unit.y + dy * Math.min(d, speed * dt);
    // Give crowds space without allowing ground units to step off a bridge.
    for (const other of this.units) {
      if (other === unit || other.hp <= 0 || other.spawn > 0 || !!other.card.flying !== !!unit.card.flying) continue;
      const ox = nx - other.x, oy = ny - other.y, od = Math.hypot(ox, oy);
      const gap = (unit.radius + other.radius) * .7;
      if (od > .1 && od < gap) {
        const push = Math.min((gap - od) * .25, 35 * dt);
        nx += ox / od * push; ny += oy / od * push;
      }
    }
    if (!unit.card.flying) {
      for (const tower of [...this.towers, ...this.units.filter(u => u !== unit && u.card.structure)]) {
        if (tower.hp <= 0) continue;
        let tx = nx - tower.x, ty = ny - tower.y, td = Math.hypot(tx, ty);
        const gap = tower.radius + unit.radius * .7;
        if (td < gap) {
          if (Math.abs(tx) < 1) tx = unit.id % 2 ? 1 : -1;
          td = Math.hypot(tx, ty) || 1;
          nx = tower.x + tx / td * gap; ny = tower.y + ty / td * gap;
        }
      }
      if (ny >= RIVER.top - 3 && ny <= RIVER.bottom + 3 && Math.min(...LANES.map(x => Math.abs(nx - x))) > 29) {
        if(Math.abs(unit.x-LANES[unit.lane])<=29)nx=clamp(nx,LANES[unit.lane]-29,LANES[unit.lane]+29);
        else ny = unit.y > 400 ? RIVER.bottom + 4 : RIVER.top - 4;
      }
    }
    unit.x = clamp(nx, 46, 554); unit.y = clamp(ny, 42, 758);
    unit.dx = dx; unit.dy = dy; unit.moving = true;
    unit.charge += dt;
    unit.stepClock -= dt;
    if (!unit.card.flying && unit.stepClock <= 0) {
      unit.stepClock = unit.key === 'snorlax' ? .65 : unit.key === 'eevee' ? .22 : .38;
      this.emit('step', { unit });
    }
  }
  face(attacker, target) {
    const dx = target.x - attacker.x, dy = target.y - attacker.y, d = Math.hypot(dx,dy) || 1;
    attacker.dx = dx / d; attacker.dy = dy / d;
  }
  attack(attacker, target) {
    const card = attacker.card, profile = card || attacker.guard;
    const duration = card?.attackDuration || .6;
    const meta = this.animations[profile.id]?.[profile.attackAnim] || this.animations[profile.id]?.Attack;
    const total = meta?.durations.reduce((a,b)=>a+b,0) || 0;
    const ratio = total && meta.hitFrame ? meta.durations.slice(0,meta.hitFrame).reduce((a,b)=>a+b,0)/total : .3;
    const windup = Math.max(.08, duration * ratio);
    this.face(attacker,target);
    attacker.target=target;
    attacker.engaged=true;
    attacker.cooldown = card?.interval || attacker.interval;
    attacker.attack = duration; attacker.attackDuration = duration; attacker.attackAnim = profile.attackAnim;
    const seq = ++attacker.attackSeq;
    const charged = !!(card?.charge && attacker.charge >= card.charge);
    attacker.charge = 0;
    for (let shot=0;shot<(card?.burst || 1);shot++) this.attacks.push({ attacker, target, seq, shot, charged, delay: windup + shot*(card?.burstSpacing || 0) });
    this.emit('attackStart', { attacker, target, style: profile.style, duration });
  }
  muzzle(actor, shot = 0) {
    const tower = 'king' in actor;
    const height = tower ? (actor.king ? 71 : 63) : actor.card.muzzleHeight || 22;
    const side = actor.card?.structure ? (shot % 2 ? 1 : -1) * 9 : 0;
    return { x: actor.x + actor.dx*11 - actor.dy*side, y: actor.y - height + actor.dy*7 + actor.dx*side };
  }
  strike(actor, target, amount, profile) {
    const hp = target.hp;
    if(actor.card?.execute&&target.card&&target.hp/target.maxHp<actor.card.execute)amount*=1.6;
    if(actor.card?.enrage&&actor.hp<actor.maxHp*.5)amount*=1.25;
    this.damage(target, amount, actor.team, {...profile,sourceId:actor.id});
    if (actor.card?.lifesteal && target.card && hp > target.hp && actor.hp > 0) {
      const healed = Math.min(actor.maxHp-actor.hp, actor.card.lifesteal);
      actor.hp += healed;
      if (healed) this.emit('heal',{ unit:actor, amount:healed });
    }
  }
  release(job) {
    const {attacker:a,target,shot,charged}=job;
    if(a.hp<=0||a.stun>0||a.attackSeq!==job.seq||target.hp<=0)return;
    const card=a.card, profile=card||a.guard, style=profile.style;
    const reach=(card?.range||a.range)+target.radius;
    if(distance(a,target)>reach+(card&&card.range<50?12:55))return;
    this.face(a,target);
    const from=this.muzzle(a,shot),to=aimPoint(target),amount=(card?.damage||a.damage)*(charged?2:1);
    this.emit('attackRelease',{attacker:a,target,key:a.key||a.guard.id,style,from,to,shot,charged});
    if(style==='psychic'){
      const dx=a.dx,dy=a.dy;
      for(const t of [...this.units,...this.towers]){
        if(!this.validTarget(a,t))continue;
        const tx=t.x-a.x,ty=t.y-a.y,forward=tx*dx+ty*dy,side=Math.abs(tx*dy-ty*dx);
        if(t===target||(forward>0&&forward<=card.range+t.radius&&side<17+t.radius*.65))this.strike(a,t,amount,card);
      }
      this.emit('beam',{from,to:{x:from.x+dx*(card.range+10),y:from.y+dy*(card.range+10)},style,key:a.key,team:a.team});
    }else if(style==='lightning'||style==='vine') {
      this.strike(a,target,amount,card||{stun:a.guard?.stun||0});
      this.emit('beam',{from,to,style,key:a.key,team:a.team});
      let last=target;
      const hit=new Set([target.id]);
      for(let i=0;i<(card?.chain||0);i++){
        const next=[...this.units,...this.towers].filter(t=>this.validTarget(a,t)&&!hit.has(t.id)&&distance(t,last)<78).sort((x,y)=>distance(x,last)-distance(y,last))[0];
        if(!next)break;
        this.strike(a,next,amount*Math.pow(.6,i+1),card);this.emit('beam',{from:aimPoint(last),to:aimPoint(next),style,key:a.key,team:a.team});hit.add(next.id);last=next;
      }
    } else if(style==='flame') {
      const angle=Math.atan2(a.dy,a.dx);
      for(const t of [...this.units,...this.towers]){
        if(!this.validTarget(a,t))continue;
        const delta=Math.atan2(t.y-a.y,t.x-a.x)-angle;
        const spread=Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)));
        if(t===target||(distance(a,t)<card.range+t.radius+22&&spread<card.cone))this.strike(a,t,amount,{});
      }
      this.emit('flame',{from,to,team:a.team,length:distance(a,target)+target.radius,angle});
    } else if(card&&card.range<50) {
      this.strike(a,target,amount,card);
      if(card.splash)for(const u of this.units)if(u!==target&&this.validTarget(a,u)&&distance(u,target)<card.splash)this.strike(a,u,amount,card);
      this.emit('melee',{from,to,style,team:a.team,shot,charged});
      this.emit('hit',{x:to.x,y:to.y,key:a.key,style,team:a.team});
    } else {
      this.projectiles.push({ x:from.x,y:from.y,startX:from.x,startY:from.y,totalDistance:Math.hypot(to.x-from.x,to.y-from.y),travelled:0,target,team:a.team,sourceId:a.id,damage:amount,speed:card?.projectileSpeed||(style==='bubble'?270:style==='rock'?235:style==='hydro'?420:style==='coin'?470:310),key:a.key||'tower',style,splash:card?.splash||0,stun:card?.stun||0,slow:card?.slow||0,burn:card?.burn||0,poisonField:card?.poisonField||0,air:!card||!!card.air,life:3,arc:style==='rock'?65:style==='ember'?38:0,trace:[] });
    }
    if(card?.suicide)this.damage(a,a.maxHp*10,1-a.team);
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
    const threats = this.units.filter(u => u.team === 0 && u.hp > 0 && u.y < 380);
    const affordable = hand.map((key, i) => ({ key, i, card: CARDS[key] })).filter(c => c.card.cost <= this.energy[1]);
    if (!affordable.length || (!threats.length && this.energy[1] < (this.difficulty === 'easy' ? 7 : 5))) return;
    let choice = affordable[Math.floor(this.random() * affordable.length)];
    if (threats.some(u => u.card.flying)) choice = affordable.find(c => c.card.air && !c.card.spell) || choice;
    if (choice.card.spell) {
      const weak = this.towers.find(t => t.team === 0 && t.hp > 0 && t.hp <= choice.card.towerDamage);
      const enemy = this.units.filter(u => u.team === 0 && u.hp > 0).sort((a, b) => a.y - b.y)[0];
      if (weak || enemy) { const t = weak || enemy; this.deploy(1, choice.i, t.x, t.y); return; }
      choice = affordable.find(c => !c.card.spell);
      if (!choice) return;
    }
    let lane = Math.floor(this.random() * 2);
    if (threats.length) lane = threats[0].x < 300 ? 0 : 1;
    const x = LANES[lane] + (this.random() - .5) * 65;
    const y = threats.length ? 285 : choice.card.building ? 115 : 272;
    this.deploy(1, choice.i, x, y);
  }
  tickStatus(entity,dt) {
    entity.hit=Math.max(0,entity.hit-dt);entity.stun=Math.max(0,entity.stun-dt);
    entity.slow=Math.max(0,(entity.slow||0)-dt);entity.attack=Math.max(0,(entity.attack||0)-dt);
    if(entity.burn&&entity.hp>0){
      const burn=entity.burn;burn.remaining-=dt;burn.tick-=dt;
      if(burn.tick<=0){burn.tick+=.5;this.damage(entity,burn.damage*.5,burn.team,{dot:true});}
      if(burn.remaining<=0)entity.burn=null;
    }
  }
  blink(unit,target) {
    if(!unit.card.blink||unit.blinkCooldown>0||distance(unit,target)>155||distance(unit,target)<65)return false;
    if(!((unit.y<RIVER.top&&target.y<RIVER.top)||(unit.y>RIVER.bottom&&target.y>RIVER.bottom)))return false;
    const from={x:unit.x,y:unit.y},d=distance(unit,target)||1,reach=unit.card.range+target.radius-3;
    const x=target.x+(unit.x-target.x)/d*reach,y=target.y+(unit.y-target.y)/d*reach;
    if(x<46||x>554||y<42||y>758||this.towers.some(t=>t.hp>0&&distance(t,{x,y})<t.radius+unit.radius*.7))return false;
    unit.x=x;unit.y=y;unit.blinkCooldown=unit.card.blink;this.face(unit,target);
    this.emit('blink',{from,to:{x,y},unit});return true;
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
    for(const field of this.fields){field.life-=dt;field.tick-=dt;if(field.tick<=0){field.tick+=.5;for(const enemy of this.units)if(enemy.team!==field.team&&enemy.hp>0&&enemy.spawn<=0&&(!enemy.card.flying||field.air)&&distance(enemy,field)<field.radius+enemy.radius)this.damage(enemy,field.damage*.5,field.team,{dot:true});}}
    this.fields=this.fields.filter(f=>f.life>0);
    this.ai(dt);
    for (const spell of this.spells) {
      if(spell.card.rolling){
        spell.y+=(spell.team?1:-1)*205*dt;spell.remaining-=dt;
        for(const target of[...this.units,...this.towers])if(target.team!==spell.team&&target.hp>0&&!target.card?.flying&&!spell.hitIds.includes(target.id)&&Math.abs(target.x-spell.x)<45+target.radius&&Math.abs(target.y-spell.y)<18+target.radius){
          spell.hitIds.push(target.id);this.damage(target,'king'in target?spell.card.towerDamage:spell.card.damage,spell.team);
          if(target.card&&!target.card.structure){target.y=clamp(target.y+(spell.team?1:-1)*spell.card.knockback,42,758);target.attackSeq++;target.attack=0;target.target=null;target.engaged=false;}
          this.emit('hit',{x:target.x,y:target.y,key:spell.key,style:'rock',team:spell.team});
        }
        if(spell.remaining<=0)spell.done=true;continue;
      }
      spell.delay -= dt;
      if (spell.delay > 0 || spell.done) continue;
      spell.done = true;
      const targets = [...this.units, ...this.towers].filter(t => t.team !== spell.team && t.hp > 0 && (t.spawn === undefined || t.spawn <= 0) && distance(t, spell) < spell.card.splash + t.radius * .4);
      for (const target of targets) {
        this.damage(target, 'king' in target ? spell.card.towerDamage : spell.card.damage, spell.team, spell.card);
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
      const enemies = this.units.filter(u => u.team !== tower.team && u.hp > 0 && u.spawn <= 0 && distance(tower, u) <= tower.range);
      enemies.sort((a, b) => distance(tower, a) - distance(tower, b));
      if(!enemies.includes(tower.target))tower.target=enemies[0]||null;
      if(tower.target){this.face(tower,tower.target);if(tower.cooldown<=0)this.attack(tower,tower.target);}
    }
    for (const unit of this.units) {
      if (unit.hp <= 0) continue;
      unit.spawn = Math.max(0, unit.spawn - dt);this.tickStatus(unit,dt);
      unit.cooldown-=dt;unit.anim+=dt;unit.blinkCooldown=Math.max(0,unit.blinkCooldown-dt);
      unit.moving = false;
      if(unit.card.structure&&unit.spawn<=0){
        unit.lifetime=Math.max(0,unit.lifetime-dt);unit.hp=Math.max(0,unit.hp-unit.maxHp/unit.card.lifetime*dt);
        if(unit.lifetime<=0||unit.hp<=0){unit.hp=0;this.emit('structureDown',{unit});continue;}
      }
      if (unit.spawn > 0 || unit.stun > 0) continue;
      if(unit.ttl>0){unit.ttl-=dt;if(unit.ttl<=0){this.damage(unit,unit.maxHp*10,1-unit.team);continue;}}
      if(unit.card.summon){unit.summonClock-=dt;if(unit.summonClock<=0){unit.summonClock=unit.card.summonEvery;const count=this.units.filter(u=>u.parentId===unit.id&&u.hp>0).length;if(count<(unit.card.summonMax||3)&&this.units.length<160){const child=this.spawn(unit.card.summon,unit.team,clamp(unit.x+(count%2?20:-20),44,556),unit.y+(unit.team?20:-20),.5);child.parentId=unit.id;}}}
      if(unit.card.heal){unit.healClock-=dt;if(unit.healClock<=0){unit.healClock=unit.card.healEvery;this.healNearby(unit,unit.card.heal,unit.card.healRadius,unit.card.healAll);}}
      if(!this.validTarget(unit,unit.target)||(unit.target?.card&&distance(unit,unit.target)>(unit.card.building?unit.card.pullRange||300:240))){unit.target=null;unit.engaged=false;}
      if(unit.target&&unit.engaged&&unit.attack<=0&&distance(unit,unit.target)>unit.card.range+unit.target.radius+45)unit.engaged=false;
      if(!unit.engaged){
        const nearest=this.acquire(unit);
        const pulled=unit.card.building&&nearest?.card?.structure&&!unit.target?.card?.structure;
        if(nearest&&(!unit.target||pulled||distance(unit,nearest)+2<distance(unit,unit.target))){unit.target=nearest;unit.attackSeq++;unit.attack=0;}
      }
      const target = unit.target;
      if (!target) continue;
      if(unit.card.copy&&target.card&&!target.card.structure&&!target.card.token){const copied={};for(const key of['damage','range','interval','style','burst','burstSpacing','stun','slow','burn','splash','air','chain','cone','pierce','projectileSpeed','lifesteal','poisonField','attackDuration'])if(key in target.card)copied[key]=target.card[key];unit.card={...unit.card,...copied,damage:Math.round(target.card.damage*.85),copy:false,attackAnim:'Attack'};this.emit('transform',{unit});}
      this.blink(unit,target);
      const reach = unit.card.range + target.radius;
      if (distance(unit, target) <= reach) { this.face(unit,target);if (unit.cooldown <= 0) this.attack(unit, target); }
      else if(!unit.card.structure&&unit.attack<=0)this.move(unit, target, dt);
    }
    for(const job of this.attacks){job.delay-=dt;if(job.delay<=0&&!job.done){job.done=true;this.release(job);}}
    this.attacks=this.attacks.filter(job=>!job.done&&job.attacker.hp>0&&job.attacker.attackSeq===job.seq&&job.target.hp>0);
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.target.hp <= 0) { p.life = 0; continue; }
      const {x:tx,y:ty}=aimPoint(p.target);
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d < p.speed * dt + 7) {
        this.damage(p.target, p.damage, p.team, p);
        if (p.splash) for (const u of this.units) if (u !== p.target && u.team !== p.team && u.hp > 0 && u.spawn <= 0 && (!u.card.flying || p.air) && distance(u, p.target) < p.splash) this.damage(u, p.damage, p.team, p);
        this.emit('hit', { key: p.key, style:p.style, x: tx, y: ty, team: p.team }); p.life = 0;
      } else { p.trace.push({x:p.x,y:p.y});if(p.trace.length>7)p.trace.shift();p.x += dx / d * p.speed * dt; p.y += dy / d * p.speed * dt;p.travelled+=p.speed*dt; }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
    this.units = this.units.filter(u => u.hp > 0);
    if (this.time <= 0 && this.state === 'playing') this.endClock();
  }
}

import { POKEMON_STATS } from './pokemon-stats.js';
import { UNIT_SCALES } from './unit-sizes.js';

// Shared by browser, CPU and online server. Values are per body / per hit.
export const THRESHOLDS = Object.freeze({ tower: 109, towerInterval: .8, fragile: 81, scout: 133, meleeSwarm: 202, archers: 304, fireball: 689, log: 290 });

// Explicit health, damage, cadence and speed for every body. No global multipliers.
export const CARD_BALANCE = {
  rapidash:{cost:4,hp:1696,damage:318,interval:1.6,speed:57.6},
  roselia:{cost:3,hp:261,damage:169,interval:3,speed:26},
  graveler:{cost:5,hp:2080,damage:272,interval:2.5,speed:18},
  nuzleaf:{cost:3,hp:260,damage:131,interval:.7,speed:40},
  sneaselAmbush:{cost:3,damage:0,towerDamage:0},
  sneaselToken:{cost:0,hp:202,damage:125,interval:1.1,speed:40,range:12},
  pikachu: {"cost":4,"hp":714,"damage":115,"interval":1.8,"speed":32,"bolts":2,"range":120,"air":true,"style":"lightning","attackAnim":"Shock","chain":0,"stun":0.5,"entryDamage":192,"entryRadius":72,"entryStun":0.5,"attackRoleOverride":true},
  squirtle: {"cost":2,"hp":400,"damage":28,"interval":1.45,"speed":26},
  charmander: {"cost":3,"hp":440,"damage":135,"interval":1.5,"speed":32,"burn":9},
  snorlax: {"cost":5,"hp":4091,"damage":254,"interval":1.5,"speed":18,"windup":0.55,"attackDuration":1.1,"splash":0,"charge":0},
  zubat: {"cost":2,"hp":180,"damage":65,"interval":1.3,"speed":30},
  charizard: {"cost":5,"hp":1526,"damage":72,"interval":1.8,"speed":26,"moveAnim":"Hop","idleAnim":"Hop","moveFrames":[4,5,6,7,6,5],"moveFrameDuration":5,"movementAnchor":"body"},
  thunder: {"cost":2,"damage":192,"towerDamage":58,"splash":60,"stun":0.5},
  fireball: {"cost":4,"damage":689,"towerDamage":207,"splash":60,"travelSpeed":420,"castDelay":0.15},
  bulbasaur: {"cost":2,"hp":400,"damage":85,"interval":1.3,"speed":26},
  gengar: {"cost":4,"hp":650,"damage":125,"interval":1.45,"speed":40,"blink":5},
  machamp: {"cost":4,"hp":1361,"damage":180,"interval":1.8,"speed":26},
  eevee: {"cost":2,"hp":300,"damage":90,"interval":0.95,"speed":40},
  onix: {"cost":4,"hp":1950,"damage":240,"interval":1.8,"speed":30},
  blastoise: {"cost":4,"hp":1400,"damage":85,"interval":1.8,"speed":26,"range":120,"structure":false,"lifetime":0,"radius":19,"attackRoleOverride":true},
  vulpix: {"cost":3,"hp":440,"damage":75,"interval":1.4,"speed":32,"burn":7},
  psyduck: {"cost":3,"hp":560,"damage":110,"interval":1.4,"speed":26},
  alakazam: {"cost":4,"hp":590,"damage":133,"interval":1.1,"speed":26,"range":168},
  geodude: {"cost":3,"hp":1766,"damage":202,"interval":1.2,"speed":18,"splash":0},
  magnemite: {"cost":3,"hp":400,"damage":81,"interval":1.8,"speed":26},
  scyther: {"cost":4,"hp":650,"damage":65,"interval":1.2,"speed":40,"moveAnim":"Hop","idleAnim":"Hop","moveFrames":[4,5,6,7,6,5],"moveFrameDuration":5,"movementAnchor":"body"},
  lapras: {"cost":5,"hp":1500,"damage":160,"interval":1.75,"speed":18},
  mewtwo: {"cost":6,"hp":1452,"damage":440,"interval":2.8,"speed":26,"windup":0.65,"range":144,"splash":45},
  treecko: {"cost":3,"hp":304,"damage":112,"interval":0.9,"speed":26,"range":120},
  golem: {"cost":8,"hp":5120,"damage":312,"interval":2.5,"speed":18,"windup":0.5,"deathDamage":312},
  log: {"cost":2,"damage":290,"towerDamage":58,"travelDistance":242.4,"travelSpeed":205},
  venusaur: {"cost":5,"hp":1900,"damage":140,"interval":1.9,"speed":18},
  butterfree: {"cost":3,"hp":440,"damage":72,"interval":1.6,"speed":26,"style":"powder","color":"#c9ace9","move":"Paralizador"},
  beedrill: {"cost":3,"hp":260,"damage":85,"interval":1.3,"speed":40},
  pidgeot: {"cost":4,"hp":1052,"damage":165,"interval":1.3,"speed":40,"moveAnim":"Hop","idleAnim":"Hop","moveFrames":[3,4,5,6,7,6,5,4],"moveFrameDuration":6,"movementAnchor":"body"},
  ekans: {"cost":2,"hp":250,"damage":60,"interval":1.2,"speed":32,"burn":12,"burnKind":"poison"},
  sandshrew: {"cost":3,"hp":220,"shield":240,"damage":121,"interval":1.1,"speed":32},
  nidoqueen: {"cost":6,"hp":2800,"damage":165,"interval":1.6,"speed":18},
  nidoking: {"cost":5,"hp":2200,"damage":150,"interval":1.6,"speed":26,"burn":8,"burnKind":"poison","deathSpawn":null,"deathCount":0},
  mankey: {"cost":2,"hp":150,"damage":80,"interval":1.2,"speed":40},
  arcanine: {"cost":4,"hp":1400,"damage":220,"interval":1.4,"speed":40},
  slowbro: {"cost":3,"hp":688,"damage":90,"interval":1.7,"speed":18,"shield":0,"range":132,"slow":2,"style":"ice","entryDamage":83,"entryRadius":72,"entrySlow":1,"splash":36},
  grimer: {"cost":2,"hp":900,"damage":55,"interval":1.5,"speed":18,"style":"poison","range":85,"color":"#b686c8"},
  cloyster: {"cost":4,"hp":865,"damage":28,"interval":2.6,"speed":0,"platform":false},
  gastly: {"cost":2,"hp":81,"damage":35,"interval":1.3,"speed":32,"count":4,"deathField":6,"style":"lick"},
  voltorb: {"cost":1,"hp":230,"damage":115,"interval":1.4,"speed":40,"stun":0.75,"air":true,"jumpRange":78,"jumpDuration":0.42,"windup":0.1},
  electrode: {"cost":4,"hp":1200,"damage":600,"interval":1.6,"speed":32,"windup":0.5,"splash":60},
  forretress: {"cost":4,"hp":1200,"damage":600,"interval":1.6,"speed":32,"windup":0.5,"splash":60},
  exeggutor: {"cost":5,"hp":1750,"damage":230,"interval":1.9,"speed":18,"style":"egg","splash":55,"summon":null,"summonMax":0,"move":"Bomba huevo"},
  koffing: {"cost":3,"hp":700,"damage":90,"interval":1.7,"speed":26,"style":"poison","burnKind":"poison","color":"#b49bcf"},
  chansey: {"cost":3,"hp":800,"damage":18,"interval":1.8,"speed":26,"heal":75,"style":"egg"},
  kangaskhan: {"cost":5,"hp":2400,"damage":225,"interval":1.5,"speed":26},
  starmie: {"cost":4,"hp":550,"damage":90,"interval":1.8,"speed":32},
  mrmime: {"cost":4,"hp":590,"shield":200,"entryShield":240,"damage":90,"interval":1.5,"speed":26},
  gyarados: {"cost":6,"hp":2600,"damage":240,"interval":1.8,"speed":26},
  ditto: {"cost":3,"hp":508,"damage":35,"interval":1.4,"speed":32},
  articuno: {"cost":5,"hp":1400,"damage":145,"interval":1.8,"speed":26},
  zapdos: {"cost":5,"hp":1200,"damage":150,"interval":1.8,"speed":26},
  moltres: {"cost":5,"hp":1350,"damage":165,"interval":1.8,"speed":26},
  dragonite: {"cost":5,"hp":1600,"damage":85,"interval":1.9,"speed":26,"moveAnim":"Hop","idleAnim":"Hop","moveFrames":[3,4,5,6,5,4],"moveFrameDuration":7,"movementAnchor":"body"},
  meganium: {"cost":5,"hp":2400,"damage":105,"interval":1.7,"speed":18},
  typhlosion: {"cost":5,"hp":1130,"damage":150,"interval":1.8,"speed":26,"style":"eruption","air":false},
  feraligatr: {"cost":4,"hp":1900,"damage":300,"interval":1.55,"speed":26,"lifesteal":0},
  crobat: {"cost":4,"hp":900,"damage":75,"interval":1.5,"speed":40},
  ampharos: {cost:4,hp:1182,damage:220,interval:1.1,speed:0,range:132,lifetime:25,stun:0,chain:0},
  espeon: {"cost":3,"hp":460,"damage":110,"interval":1,"speed":32},
  umbreon: {"cost":3,"hp":2100,"damage":120,"interval":1.7,"speed":26,"reflect":0,"burn":10,"burnKind":"poison","style":"poison","range":100,"label":"Siniestro","color":"#b5a4d3","move":"Tóxico"},
  wobbuffet: {"cost":4,"hp":1900,"damage":0,"interval":2,"speed":0,"passive":true,"reflect":0.5,"windup":0,"platform":false},
  steelix: {"cost":6,"hp":4500,"damage":310,"interval":2.2,"speed":18},
  scizor: {"cost":4,"hp":1200,"damage":135,"interval":1.3,"speed":32,"shield":240},
  skarmory: {"cost":4,"hp":560,"damage":81,"interval":1.5,"speed":32},
  blissey: {"cost":5,"hp":1800,"damage":35,"interval":2,"speed":18,"heal":95,"style":"egg"},
  lugia: {"cost":7,"hp":3300,"damage":120,"interval":1.6,"speed":26},
  hooh: {"cost":7,"hp":2900,"damage":150,"interval":1.6,"speed":26},
  sceptile: {"cost":4,"hp":600,"damage":115,"interval":1.2,"speed":40},
  blaziken: {"cost":4,"hp":1200,"damage":100,"interval":1.7,"speed":32},
  swampert: {"cost":5,"hp":2800,"damage":190,"interval":1.8,"speed":18},
  gardevoir: {"cost":5,"hp":780,"damage":280,"interval":1.6,"speed":26,"fieldStyle":"psychic","windup":0.45,"range":132,"splash":42},
  sableye: {"cost":3,"hp":800,"damage":160,"interval":1.2,"speed":40,"lifesteal":0,"label":"Siniestro / fantasma"},
  aggron: {"cost":6,"hp":3000,"damage":220,"interval":1.7,"speed":18},
  sharpedo: {"cost":3,"hp":907,"damage":193,"interval":1,"speed":40},
  flygon: {"cost":5,"hp":1650,"damage":165,"interval":1.8,"speed":32},
  altaria: {"cost":4,"hp":900,"damage":75,"interval":1.6,"speed":26,"style":"song","move":"Voz cautivadora","heal":75},
  absol: {"cost":4,"hp":1100,"damage":200,"interval":1.4,"speed":40,"label":"Siniestro","move":"Tajo umbrío"},
  salamence: {"cost":6,"hp":2200,"damage":95,"interval":2.2,"speed":26,"moveAnim":"Hop","idleAnim":"Hop","moveFrames":[3,4,5,6,7,6,5,4],"movementAnchor":"body"},
  metagross: {"cost":6,"hp":2800,"damage":260,"interval":2.1,"speed":18,"shield":400},
  kyogre: {"cost":8,"hp":3300,"damage":150,"interval":2.25,"speed":18},
  groudon: {"cost":8,"hp":4500,"damage":320,"interval":2.4,"speed":18,"windup":0.55},
  rayquaza: {"cost":8,"hp":3000,"damage":230,"interval":1.8,"speed":32},
  nidoranF: {"cost":0,"hp":81,"damage":35,"interval":1.4,"speed":32,"burnKind":"poison"},
  nidoranM: {"cost":0,"hp":180,"damage":45,"interval":1.4,"speed":32},
  exeggcute: {"cost":0,"hp":81,"damage":81,"interval":1,"speed":32,"suicide":false,"splash":0,"style":"slam","range":26,"air":false,"ttl":0,"attackRoleOverride":true},
  babyKangaskhan: {"cost":0,"hp":400,"damage":80,"interval":1.3,"speed":40},
  diglett: {"cost":1,"hp":81,"damage":81,"interval":1,"speed":32,"scale":1.5},
  diglettHorde: {"cost":3,"hp":81,"damage":81,"interval":1,"speed":32,"scale":1.5},
  raltsTrio: {"cost":2,"hp":133,"damage":81,"interval":1.6,"speed":40,"scale":1.65,"range":120},
  poochyenaPack: {"cost":2,"hp":202,"damage":125,"interval":1.1,"speed":40,"scale":1.65,"range":12},
  centralElectrode: {cost:5,hp:1000,damage:0,interval:2,speed:0,color:'#ffe18b'},
  madriguera: {cost:5,hp:1200,damage:0,interval:2,speed:0,color:'#d0b0e5',platform:false},
  vivero: {cost:3,hp:750,damage:0,interval:2,speed:0,color:'#bedb87',platform:false},
  regice: {cost:4,hp:1000,damage:75,interval:1.8,speed:0,color:'#a5eafa',muzzleHeight:45,platform:false},
  duskull: {cost:5,hp:598,damage:90,interval:1.6,speed:26,color:'#b9a4e7',muzzleHeight:22},
  raichu: {cost:3,hp:640,damage:700,interval:2.4,speed:32,color:'#ffd491',muzzleHeight:28},
  registeel: {cost:7,hp:3200,damage:1080,interval:3.1,speed:18,color:'#b9d1dc',muzzleHeight:35},
  rhydon: {cost:7,hp:3200,damage:1080,interval:3.1,speed:18,color:'#b6b4a6',muzzleHeight:35},
  regirock: {cost:7,hp:5700,damage:220,interval:2.2,speed:18,armor:.2,color:'#dbb38d',muzzleHeight:35},
  celebi: {cost:4,hp:1350,damage:260,interval:1.8,speed:40,color:'#c4e8aa',muzzleHeight:24},
  pandilla: {cost:3,hp:202,damage:125,interval:1.1,speed:40},
  shuppetToken: {cost:0,hp:81,damage:65,interval:1.2,speed:32},
  poochyenaToken: {cost:0,hp:202,damage:125,interval:1.1,speed:40,range:12},
  raltsToken: {cost:0,hp:133,damage:81,interval:1.6,speed:40,range:120},
  pinMissile: {cost:3,damage:366,towerDamage:110},
  lightning: {cost:6,damage:1056,towerDamage:317},
  hyperBeam: {cost:6,damage:1484,towerDamage:371},
  blizzard: {cost:4,damage:45,towerDamage:14},
  spikes: {cost:3,damage:0,towerDamage:0},
  stealthRock: {cost:3,damage:0,towerDamage:0},
  whirlpool: {cost:3,damage:0,towerDamage:0},
  nightmare: {cost:5,damage:0,towerDamage:0},
  earthquake: {cost:3,damage:0,towerDamage:0},
};

const descriptions = {
  snorlax: ['Tanque · estructuras', 'Tanque muy lento. Ignora tropas y golpea una estructura cada 2 s; los enjambres lo rodean.'],
  geodude: ['Defensor · objetivo único', 'Defensor de 3 de elixir. Resiste y golpea fuerte a un solo rival terrestre; necesita ayuda contra enjambres.'],
  thunder: ['Hechizo · aturde', 'Daña y aturde a los enemigos en el área. Interrumpe sus ataques.'],
  log: ['Hechizo · empuje', 'Una rueda de fuego avanza y empuja a los enemigos terrestres.'],
  zubat: ['Trío · absorción', 'Tres murciélagos atacan a corta distancia y recuperan vida con sus mordidas.'],
  gastly: ['Enjambre aéreo · ×4', 'Cuatro fantasmas voladores atacan a distancia. Dejan niebla dañina al caer.'],
  butterfree: ['Volador · polvo', 'Esparce polvo que ralentiza en área. Ataca a tierra y aire.'],
  nidoking: ['Cuerpo a cuerpo · veneno', 'Dos puñetazos venenosos. Su fuerza castiga cuerpos grandes; no alcanza voladores.'],
  grimer: ['Defensa · lodo tóxico', 'Lanza lodo a corta distancia. Al caer deja un charco que daña a tropas terrestres.'],
  exeggutor: ['Tanque · bomba huevo', 'Lanza huevos que explotan en área. Su ataque es lento y se puede interrumpir antes del lanzamiento.'],
  koffing: ['Volador · gas', 'Escupe gas venenoso en área. La nube daña durante 3 s y alcanza tierra y aire.'],
  feraligatr: ['Cuerpo a cuerpo · mordida', 'Tritura un objetivo terrestre con mordidas fuertes. No tiene daño en área.'],
  umbreon: ['Tanque · tóxico', 'Resiste en primera línea y envenena un objetivo terrestre a corta distancia.'],
  wobbuffet: ['Defensa · contraataque', 'No inicia ataques. Devuelve el 50 % del daño directo recibido; el veneno y las quemaduras evitan su respuesta.'],
  typhlosion: ['Cuerpo a cuerpo · erupción', 'Libera fuego en un área amplia alrededor del objetivo. Quema a los enemigos terrestres.'],
  sableye: ['Salto · hostigamiento', 'Se acerca con Amago cada 3 s y golpea con sus garras. Tiene poca vida y no alcanza voladores.'],
  altaria: ['Volador · canto', 'Ataca con ondas de voz y cura a un aliado cercano. Su canto elimina veneno y ralentización.'],
  gardevoir: ['Apoyo · zona psíquica', 'Carga una esfera que explota y deja una zona de energía psíquica que daña a los enemigos.'],
  absol: ['Cuerpo a cuerpo · críticos', 'Tajo umbrío hace un 60 % más de daño a Pokémon por debajo del 35 % de vida. Ataca a un solo objetivo terrestre.'],
};

export function applyBalance(cards) {
  for (const [key, card] of Object.entries(cards)) {
    if (!CARD_BALANCE[key]) throw new Error(`Missing balance for ${key}`);
    Object.assign(card, CARD_BALANCE[key]);
    if(card.id)card.scale=UNIT_SCALES[card.id]*(key==='babyKangaskhan'?.55:1);
    if (card.building) card.pullRange = 300;
    if (!card.spell) {
      card.windup ??= Math.min(.3, card.attackDuration * .4);
      card.attackDuration = Math.max(card.attackDuration, card.windup + ((card.burst || 1) - 1) * (card.burstSpacing || 0) + .16);
    }
    if (descriptions[key]) [card.role, card.description] = descriptions[key];
  }
  const moves = {
    geodude:'Puño roca',feraligatr:'Triturar',nidoking:'Puño venenoso',typhlosion:'Erupción',sableye:'Amago',
    venusaur:'Bomba germen',beedrill:'Doble ataque',pidgeot:'Ataque ala',ekans:'Colmillo venenoso',sandshrew:'Arañazo',
    nidoqueen:'Golpe cuerpo',mankey:'Placaje furioso',arcanine:'Carga ígnea',slowbro:'Confusión',grimer:'Bomba lodo',
    cloyster:'Carámbano',gastly:'Lengüetazo',voltorb:'Autodestrucción',electrode:'Explosión',forretress:'Explosión',koffing:'Gas venenoso',
    chansey:'Bomba huevo',kangaskhan:'Golpe cuerpo',starmie:'Psíquico',mrmime:'Confusión y barrera',gyarados:'Triturar',
    ditto:'Transformación',articuno:'Rayo hielo',zapdos:'Rayo',moltres:'Ascuas',dragonite:'Pulso dragón',meganium:'Látigo cepa',
    crobat:'Chupavidas',ampharos:'Rayo',espeon:'Psíquico',wobbuffet:'Contraataque',steelix:'Cola férrea',scizor:'Tijera X',
    skarmory:'Ala de acero',blissey:'Bomba huevo',lugia:'Hidrobomba',hooh:'Ascuas',sceptile:'Hojas gemelas',blaziken:'Puño fuego',
    swampert:'Golpe de barro',gardevoir:'Psíquico',aggron:'Cuerpo pesado',sharpedo:'Triturar',flygon:'Tormenta de arena',
    salamence:'Lanzallamas',metagross:'Puño meteoro',kyogre:'Doble hidrobomba',groudon:'Pisotón',rayquaza:'Pulso dragón',
    diglett:'Arañazo',diglettHorde:'Arañazo',raltsTrio:'Confusión',poochyenaPack:'Mordisco',
  };
  for (const [key, move] of Object.entries(moves)) cards[key].move = move;
  cards.venusaur.label = 'Planta / veneno';
  applyAttackRoles(cards);
  Object.assign(cards.pikachu,{role:'Mago · control eléctrico',move:'Doble Impactrueno',description:'Al aparecer, descarga electricidad en área. Lanza dos rayos que aturden y reinician ataques; puede repartirlos entre dos rivales.'});
  cards.treecko.role='Arqueros · dúo';
  cards.geodude.role='Defensor · objetivo único';
  cards.machamp.role='Luchador · antitanques';
  Object.assign(cards.slowbro,{role:'Mago · ralentiza',move:'Rayo hielo',description:'Al aparecer, libera una onda fría. Sus proyectiles de hielo ralentizan a los enemigos de tierra y aire.'});
  cards.gardevoir.role='Mago · daño en área';
  cards.gardevoir.description='Lanza energía psíquica que explota en área y deja una zona dañina.';
  cards.mewtwo.role='Mago · explosión';
  cards.fireball.description='Sale desde tu torre del rey y viaja hasta la zona elegida. Al impactar, daña y empuja a tierra y aire.';
  cards.log.description='Rueda en línea recta desde donde lo soltás. Empuja a los enemigos terrestres a su paso.';
  cards.zubat.description='Tres murciélagos pequeños atacan a corta distancia y recuperan vida con sus mordidas.';
  cards.voltorb.description='Se lanza de un salto hacia un enemigo cercano y explota al aterrizar. Daña en área a tierra y aire, aturde y se consume. Puede morir antes de llegar.';
  Object.assign(cards.fireball,{name:'Bomba ígnea',move:'Bomba ígnea'});
  Object.assign(cards.log,{name:'Rueda Fuego',move:'Rueda Fuego'});
  applyRoles(cards);
  cards.roselia.projectileArt='petalShot';
  // Travel speed and arc are simulation data, shared by CPU, browser and server.
  for(const[key,[speed,arc]]of Object.entries({roselia:[230,100],nuzleaf:[460,0],treecko:[380,24],raltsTrio:[400,0],raltsToken:[400,0],sceptile:[460,0],charmander:[270,46],venusaur:[230,65],butterfree:[220,26],slowbro:[310,16],lapras:[300,14],articuno:[310,14],moltres:[270,38],typhlosion:[250,55],gardevoir:[245,35],alakazam:[480,0],starmie:[480,0],espeon:[480,0],rayquaza:[480,0]}))Object.assign(cards[key],{projectileSpeed:speed,projectileArc:arc});
  for(const [key,description] of Object.entries(CARD_DESCRIPTIONS))cards[key].description=description;
}

// Player-facing copy describes the action. Exact values live in statistics.
export const CARD_DESCRIPTIONS = {
  pikachu:'Descarga electricidad al aparecer y aturde con dos rayos.',
  squirtle:'Dispara tres burbujas seguidas al mismo objetivo.',
  charmander:'Lanza ascuas que explotan en área y dejan quemadura.',
  snorlax:'Avanza lentamente hacia las torres y estructuras para golpearlas.',
  zubat:'Tres Zubat recuperan vida con cada mordida.',
  charizard:'Exhala tres llamaradas que cubren un cono frente a él.',
  thunder:'Una descarga daña y aturde en el área elegida.',
  fireball:'Una bola de fuego explota en la zona elegida y empuja a los rivales.',
  bulbasaur:'Golpea a distancia con una liana que ralentiza.',
  gengar:'Se teletransporta y lanza bolas de sombra que explotan en área.',
  machamp:'Encadena cuatro puñetazos contra un mismo rival.',
  eevee:'Toma carrera para golpear con un placaje de daño doble.',
  onix:'Avanza hacia las torres y estructuras y las golpea con su cola.',
  blastoise:'Avanza disparando dos cañonazos contra tierra y aire.',
  vulpix:'Lanza dos llamas seguidas que queman a su objetivo.',
  psyduck:'Su onda de confusión aturde e interrumpe ataques.',
  alakazam:'Dispara un rayo que atraviesa a los enemigos alineados.',
  geodude:'Resiste en primera línea y golpea a un rival por ataque.',
  magnemite:'Vuela y descarga electricidad que aturde e interrumpe ataques.',
  scyther:'Se acerca volando y encadena dos cortes con sus guadañas.',
  lapras:'Resiste al frente y ralentiza con rayos de hielo.',
  mewtwo:'Lanza esferas explosivas y puede activar una onda que daña y aturde.',
  treecko:'Dos tiradores lanzan semillas desde atrás de la primera línea.',
  golem:'Avanza hacia las estructuras y, al caer, explota y deja dos Geodude.',
  log:'Una rueda de fuego avanza y empuja a los enemigos terrestres.',
  diglett:'Tres Diglett rodean y distraen a un rival.',
  diglettHorde:'Nueve Diglett rodean a sus enemigos y atacan en grupo.',
  raltsTrio:'Tres Ralts atacan a distancia con energía psíquica.',
  poochyenaPack:'Cuatro Poochyena avanzan juntos y muerden a corta distancia.',
  venusaur:'Dispara semillas explosivas que dejan una zona venenosa.',
  butterfree:'Esparce polvo que ralentiza a los enemigos en área.',
  beedrill:'Dos Beedrill encadenan dos picotazos cada uno.',
  pidgeot:'Toma impulso al volar para hacer una picada de daño doble.',
  ekans:'Dos Ekans envenenan a sus enemigos con cada mordida.',
  sandshrew:'Dos defensores avanzan protegidos por escudos.',
  nidoqueen:'Resiste en primera línea e invoca Nidoran como refuerzos.',
  nidoking:'Encadena dos puñetazos que envenenan al rival.',
  mankey:'Tres Mankey cargan juntos para dar un primer golpe de daño doble.',
  arcanine:'Toma carrera y golpea con una carga que deja quemadura.',
  slowbro:'Libera frío al aparecer y lanza hielo que ralentiza en área.',
  grimer:'Golpea a corta distancia y deja un charco venenoso al caer.',
  cloyster:'Defiende desde un bastión con ráfagas de cinco pinchos.',
  gastly:'Cuatro Gastly atacan a distancia y dejan niebla dañina al caer.',
  voltorb:'Salta hacia un enemigo y explota al aterrizar, dañando y aturdiendo en área.',
  electrode:'Avanza hacia las estructuras y explota al llegar.',
  forretress:'Avanza hacia las estructuras y explota al llegar.',
  exeggutor:'Lanza huevos que explotan y dañan en área.',
  koffing:'Choca contra los rivales y libera gas venenoso en el impacto.',
  chansey:'Cura al aliado más herido que tenga cerca.',
  kangaskhan:'La madre protege a una cría rápida que pelea a su lado.',
  starmie:'Lanza tres rayos que atraviesan a los enemigos alineados.',
  mrmime:'Protege con escudos a los aliados cercanos al aparecer.',
  gyarados:'Se acerca volando y da mordidas que dañan en área.',
  ditto:'Copia el ataque del primer Pokémon enemigo que enfrenta.',
  articuno:'Dispara hielo que ralentiza y puede activar una ventisca que congela.',
  zapdos:'Aturde con sus rayos y puede activar una tormenta eléctrica en área.',
  moltres:'Quema en área y puede activar Renacer para curarse y liberar fuego.',
  dragonite:'Se acerca volando y encadena tres zarpazos al mismo objetivo.',
  meganium:'Avanza como tanque y cura a los aliados cercanos.',
  typhlosion:'Lanza erupciones que explotan en área y dejan quemadura.',
  feraligatr:'Tritura a un rival con mordidas fuertes.',
  crobat:'Muerde dos veces en área y recupera vida por cada Pokémon alcanzado.',
  ampharos:'Se oculta sin enemigos cerca y emerge para disparar a tierra y aire.',
  espeon:'Dispara un rayo rápido que atraviesa a los enemigos alineados.',
  umbreon:'Resiste en primera línea y envenena con sus mordidas.',
  wobbuffet:'Devuelve parte del daño directo a quien lo ataca.',
  steelix:'Avanza protegido por su armadura y golpea torres y estructuras.',
  scizor:'Avanza con escudo y encadena dos cortes por ataque.',
  skarmory:'Defiende desde el aire con un escudo resistente.',
  blissey:'Cura al grupo cercano y libera una última curación al caer.',
  lugia:'Resiste desde el aire y puede proteger al grupo con Aeroescudo.',
  hooh:'Ataca con picadas y cura a sus aliados con Fuego sagrado.',
  sceptile:'Encadena dos cortes rápidos con sus hojas.',
  blaziken:'Encadena tres golpes que dejan quemadura.',
  swampert:'Golpea en área y ralentiza a los rivales.',
  gardevoir:'Lanza energía psíquica que explota y deja una zona dañina.',
  sableye:'Se acerca con Amago y golpea con sus garras.',
  aggron:'Su armadura reduce el daño y devuelve parte de los golpes recibidos.',
  sharpedo:'Toma carrera para dar una primera mordida de daño doble.',
  flygon:'Golpea con sus garras y levanta arena que ralentiza alrededor.',
  altaria:'Su canto daña a los rivales y cura y limpia de efectos a un aliado.',
  absol:'Sus cortes hacen más daño a los Pokémon con poca vida.',
  salamence:'Encadena tres zarpazos y aumenta su daño al perder la mitad de la vida.',
  metagross:'Da golpes en área que interrumpen ataques.',
  kyogre:'Dispara una doble hidrobomba y puede activar una marea que daña y empuja.',
  groudon:'Busca estructuras y puede activar un terremoto a su alrededor.',
  rayquaza:'Dispara un rayo perforante y puede avanzar con un golpe en área.',
  centralElectrode:'Libera Voltorb periódicamente y deja uno más al caer.',
  madriguera:'Libera parejas de Nidoran y deja una última pareja al caer.',
  vivero:'Libera parejas de Exeggcute frágiles que luchan cuerpo a cuerpo y deja cuatro al caer.',
  regice:'Defiende desde el suelo con hielo que daña en área y ralentiza.',
  duskull:'Ataca a distancia e invoca Shuppet durante el combate y al caer.',
  raichu:'Prepara un golpe lento que hace mucho daño a un solo rival.',
  registeel:'Avanza lentamente y da golpes devastadores a un solo rival.',
  regirock:'Resiste con su armadura y avanza hacia torres y estructuras.',
  celebi:'Vuela directo hacia las torres y estructuras para atacarlas.',
  rhydon:'Avanza lentamente y prepara un golpe de cuerno muy fuerte contra un objetivo terrestre.',
  pandilla:'Tres Poochyena van adelante y tres Ralts los cubren a distancia.',
  pinMissile:'Una lluvia de pinchos daña a los enemigos en una zona amplia.',
  lightning:'Daña y aturde a los tres enemigos con más vida dentro del área.',
  hyperBeam:'Marca una zona y, tras una demora, la golpea con un rayo devastador.',
  blizzard:'Congela a los enemigos dentro del área elegida.',
  spikes:'Deja púas que dañan a los enemigos terrestres que pasan por encima.',
  stealthRock:'Deja rocas flotantes que dañan en área, con daño doble a los voladores.',
  whirlpool:'Arrastra a las tropas hacia el centro y las daña.',
  nightmare:'Invoca Shuppet de a uno en la zona elegida.',
  earthquake:'Sacude y ralentiza en área, con daño extra contra estructuras.',
};

// Labels describe the job and target profile; attacks and rarity have their own fields.
function applyRoles(cards) {
  const roles={blastoise:'Mini tanque · antiaéreo',pikachu:'Control · antiaéreo',machamp:'Antitanques · terrestre',raichu:'Antitanques · frágil',registeel:'Antitanques · pesado',
    feraligatr:'Antitanques · terrestre',nidoking:'Antitanques · terrestre',geodude:'Mini tanque · terrestre',
    snorlax:'Win condition · tanque',golem:'Win condition · tanque',steelix:'Win condition · tanque',groudon:'Win condition · tanque',regirock:'Win condition · tanque',
    onix:'Win condition · terrestre',electrode:'Win condition · explosiva',forretress:'Win condition · explosiva',celebi:'Win condition · aérea',voltorb:'Ciclo · antienjambre',
    exeggutor:'Mini tanque · área',swampert:'Tanque · control',meganium:'Tanque · curación',blissey:'Mini tanque · curación',
    kangaskhan:'Mini tanque · refuerzos',nidoqueen:'Tanque · invocadora',duskull:'Invocador · apoyo',pandilla:'Enjambre · mixto',
    articuno:'Volador · control',zapdos:'Volador · control',moltres:'Volador · área',lugia:'Tanque aéreo · apoyo',hooh:'Tanque aéreo · curación',
    kyogre:'Tanque · área',rayquaza:'Tanque aéreo · apoyo',dragonite:'Volador · antitanques',salamence:'Volador · antitanques',
    absol:'Asesino · rematador',sableye:'Asesino · terrestre',ditto:'Apoyo · copia',mrmime:'Apoyo · escudos',chansey:'Apoyo · curación',
    umbreon:'Mini tanque · terrestre',grimer:'Mini tanque · zona',gengar:'Tirador · área',eevee:'Ciclo · presión',
    treecko:'Tiradores · dúo',raltsTrio:'Enjambre · antiaéreo',diglett:'Ciclo · distracción',diglettHorde:'Enjambre · terrestre'};
  for(const [key,c] of Object.entries(cards)){
    if(c.spell||c.token)continue;
    if(c.structure)c.role=`Estructura · ${c.summon?'invocadora':c.passive?'reflejo':c.slow||c.stun?'control':c.splash?'área':c.air?'antiaérea':'defensa'}`;
    else if(roles[key])c.role=roles[key];
    else if(c.count>1)c.role=`Enjambre · ${c.flying?'aéreo':c.air?'antiaéreo':'terrestre'}`;
    else if(c.heal)c.role=c.flying?'Volador · curación':'Apoyo · curación';
    else if(c.hp>=2500)c.role=`Tanque · ${c.splash?'área':'terrestre'}`;
    else if(c.hp>=1500)c.role=`Mini tanque · ${c.flying?'aéreo':c.splash?'área':c.slow?'control':'terrestre'}`;
    else c.role=`${c.flying?'Volador':c.range>=50?'Tirador':'Luchador'} · ${c.slow||c.stun?'control':c.splash||c.pierce?'área':c.air?'antiaéreo':'terrestre'}`;
  }
}

// Physical attackers approach their target; special attackers fire from range.
// Structures, self-destruct units and passive defenders retain their distinct jobs.
// Equal base stats retain their existing attack, including Ditto's transformation.
function applyAttackRoles(cards) {
  const attacks = {
    pikachu: { move: 'Chispa', style: 'lightning', role: 'Cuerpo a cuerpo · descarga', description: 'Se acerca y descarga electricidad que salta entre rivales cercanos. Aturde e interrumpe sus ataques.' },
    gengar: { move: 'Bola sombra', style: 'shadow', role: 'Rango · teletransporte', description: 'Se teletransporta para reposicionarse y lanza bolas de sombra a tierra y aire.' },
    onix: { move: 'Cola férrea', style: 'slam', role: 'Win condition · estructuras', description: 'Avanza hacia las estructuras y las golpea con su cola. Ignora a las tropas.' },
    grimer: { move: 'Puño veneno', style: 'punch', description: 'Defensor terrestre que golpea a corta distancia. Al caer deja un charco venenoso.' },
    gastly: { move: 'Bola sombra', style: 'shadow' },
    koffing: { move: 'Placaje', style: 'poison', role: 'Volador · contacto', description: 'Choca contra rivales de tierra y aire y libera gas venenoso alrededor del impacto.' },
    dragonite: { move: 'Garra dragón', style: 'slash', description: 'Se acerca volando y encadena tres zarpazos al mismo objetivo de tierra o aire.' },
    typhlosion: { move: 'Erupción', style: 'ember', role: 'Rango · fuego en área', description: 'Lanza fuego que explota en área y deja quemadura. Ataca a tierra y aire.' },
    umbreon: { move: 'Mordisco', style: 'bite', description: 'Muerde a corta distancia y envenena a su objetivo. Avanza junto a la primera línea.' },
    hooh: { move: 'Pájaro osado', style: 'dash', description: 'Ataca con picadas a corta distancia y cura a un aliado cercano. Fuego sagrado cura y quema alrededor.' },
    flygon: { move: 'Garra dragón', style: 'slash', description: 'Golpea con sus garras y levanta arena que ralentiza a los enemigos cercanos.' },
    salamence: { move: 'Garra dragón', style: 'slash', cone: 0, description: 'Encadena tres zarpazos cuerpo a cuerpo. Aumenta su daño al perder la mitad de su vida.' },
  };
  for (const [key, card] of Object.entries(cards)) {
    if (card.spell) continue;
    if (card.structure || card.suicide || card.passive || card.attackRoleOverride) continue;
    const base = POKEMON_STATS[card.id];
    if (!base) throw Error(`Missing Pokémon base stats for ${key}`);
    const ranged = base.specialAttack > base.attack;
    const physical = base.attack > base.specialAttack;
    if (!ranged && !physical) continue;
    const changed = ranged !== (card.range >= 50);
    card.attackKind = ranged ? 'ranged' : 'melee';
    if (changed) {
      card.range = ranged ? 130 : key === 'onix' ? 38 : 30;
      card.air = ranged || !!card.flying;
      card.attackAnim = ranged ? 'Shoot' : 'Attack';
      Object.assign(card, attacks[key]);
    }
  }
}

export function cardThresholds(card) {
  if (card.spell) return [];
  const armor = 1 - (card.armor || 0), shield = card.shield || 0;
  const towerHits=(hp,remainingShield)=>Math.max(0,Math.ceil((hp-1e-7)/(THRESHOLDS.tower*armor)))+Math.max(0,Math.ceil((remainingShield-1e-7)/(THRESHOLDS.tower*armor)));
  const hits = amount => towerHits(shield?card.hp:Math.max(0,card.hp-amount*armor),Math.max(0,shield-amount*armor));
  return [
    ['Tiros de torre', towerHits(card.hp,shield)],
    ['Bola de fuego', hits(THRESHOLDS.fireball) ? `+ ${hits(THRESHOLDS.fireball)} tiro${hits(THRESHOLDS.fireball)>1?'s':''}` : 'Lo elimina'],
    ['Impactrueno', hits(THRESHOLDS.tower) === 0 ? 'Lo elimina' : 'Sobrevive'],
  ];
}

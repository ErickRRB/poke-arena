import { POKEMON_STATS } from './pokemon-stats.js';
import { UNIT_SCALES } from './unit-sizes.js';

// Shared by browser, CPU and online server. Values are per body / per hit.
export const THRESHOLDS = Object.freeze({ tower: 109, towerInterval: .8, fragile: 81, scout: 133, meleeSwarm: 202, archers: 304, fireball: 689, log: 290 });

// Explicit health, damage, cadence and speed for every body. No global multipliers.
export const CARD_BALANCE = {
  pikachu: {"cost":4,"hp":714,"damage":115,"interval":1.8,"speed":32,"bolts":2,"range":120,"air":true,"style":"lightning","attackAnim":"Shock","chain":0,"stun":0.5,"entryDamage":192,"entryRadius":72,"entryStun":0.5,"attackRoleOverride":true},
  squirtle: {"cost":2,"hp":400,"damage":28,"interval":1.45,"speed":26},
  charmander: {"cost":3,"hp":440,"damage":135,"interval":1.5,"speed":32,"burn":9},
  snorlax: {"cost":5,"hp":4091,"damage":254,"interval":1.5,"speed":18,"windup":0.55,"attackDuration":1.1,"splash":0,"charge":0},
  zubat: {"cost":2,"hp":180,"damage":65,"interval":1.3,"speed":30},
  charizard: {"cost":5,"hp":1526,"damage":72,"interval":1.8,"speed":26},
  thunder: {"cost":2,"damage":192,"towerDamage":58,"splash":60,"stun":0.5},
  fireball: {"cost":4,"damage":689,"towerDamage":207,"splash":60,"travelSpeed":420,"castDelay":0.15},
  bulbasaur: {"cost":2,"hp":400,"damage":85,"interval":1.3,"speed":26},
  gengar: {"cost":4,"hp":650,"damage":125,"interval":1.45,"speed":40,"blink":5},
  machamp: {"cost":4,"hp":1361,"damage":180,"interval":1.8,"speed":26},
  eevee: {"cost":2,"hp":300,"damage":90,"interval":0.95,"speed":40},
  onix: {"cost":5,"hp":1400,"damage":180,"interval":2.1,"speed":18},
  blastoise: {"cost":4,"hp":1200,"damage":85,"interval":1.8,"speed":0},
  vulpix: {"cost":3,"hp":440,"damage":75,"interval":1.4,"speed":32,"burn":7},
  psyduck: {"cost":3,"hp":560,"damage":110,"interval":1.4,"speed":26},
  alakazam: {"cost":4,"hp":590,"damage":133,"interval":1.1,"speed":26,"range":168},
  geodude: {"cost":3,"hp":1766,"damage":202,"interval":1.2,"speed":18,"splash":0},
  magnemite: {"cost":3,"hp":400,"damage":81,"interval":1.8,"speed":26},
  scyther: {"cost":4,"hp":650,"damage":65,"interval":1.2,"speed":40},
  lapras: {"cost":5,"hp":1500,"damage":109,"interval":1.75,"speed":18},
  mewtwo: {"cost":6,"hp":1452,"damage":440,"interval":2.8,"speed":26,"windup":0.65,"range":144,"splash":45},
  treecko: {"cost":3,"hp":304,"damage":112,"interval":0.9,"speed":26,"range":120},
  golem: {"cost":8,"hp":5120,"damage":312,"interval":2.5,"speed":18,"windup":0.5,"deathDamage":312},
  log: {"cost":2,"damage":290,"towerDamage":58,"travelDistance":242.4,"travelSpeed":205},
  venusaur: {"cost":5,"hp":1900,"damage":140,"interval":1.9,"speed":18},
  butterfree: {"cost":3,"hp":440,"damage":72,"interval":1.6,"speed":26,"style":"powder","color":"#c9ace9","move":"Paralizador"},
  beedrill: {"cost":3,"hp":260,"damage":85,"interval":1.3,"speed":40},
  pidgeot: {"cost":4,"hp":1052,"damage":165,"interval":1.3,"speed":40},
  ekans: {"cost":2,"hp":250,"damage":60,"interval":1.2,"speed":32,"burn":12,"burnKind":"poison"},
  sandshrew: {"cost":3,"hp":220,"shield":240,"damage":121,"interval":1.1,"speed":32},
  nidoqueen: {"cost":6,"hp":2800,"damage":165,"interval":1.6,"speed":18},
  nidoking: {"cost":5,"hp":2200,"damage":150,"interval":1.6,"speed":26,"burn":8,"burnKind":"poison","deathSpawn":null,"deathCount":0},
  mankey: {"cost":2,"hp":150,"damage":80,"interval":1.2,"speed":40},
  arcanine: {"cost":4,"hp":1400,"damage":220,"interval":1.4,"speed":40},
  slowbro: {"cost":3,"hp":688,"damage":90,"interval":1.7,"speed":18,"shield":0,"range":132,"slow":2,"style":"ice","entryDamage":83,"entryRadius":72,"entrySlow":1,"splash":36},
  grimer: {"cost":2,"hp":900,"damage":55,"interval":1.5,"speed":18,"style":"poison","range":85,"color":"#b686c8"},
  cloyster: {"cost":4,"hp":865,"damage":28,"interval":2.6,"speed":0},
  gastly: {"cost":2,"hp":81,"damage":35,"interval":1.3,"speed":32,"count":4,"deathField":6,"style":"lick"},
  voltorb: {"cost":1,"hp":230,"damage":115,"interval":1.4,"speed":40,"stun":0.75,"air":true},
  electrode: {"cost":4,"hp":1200,"damage":600,"interval":1.6,"speed":32,"windup":0.5,"splash":60},
  exeggutor: {"cost":5,"hp":1750,"damage":230,"interval":1.9,"speed":18,"style":"egg","splash":55,"summon":null,"summonMax":0,"move":"Bomba huevo"},
  koffing: {"cost":3,"hp":700,"damage":90,"interval":1.7,"speed":26,"style":"poison","burnKind":"poison","color":"#b49bcf"},
  chansey: {"cost":3,"hp":800,"damage":18,"interval":1.8,"speed":26,"heal":75,"style":"egg"},
  kangaskhan: {"cost":5,"hp":2400,"damage":225,"interval":1.5,"speed":26},
  starmie: {"cost":4,"hp":550,"damage":90,"interval":1.8,"speed":32},
  mrmime: {"cost":4,"hp":590,"shield":200,"entryShield":240,"damage":90,"interval":1.5,"speed":26},
  gyarados: {"cost":6,"hp":2600,"damage":240,"interval":1.8,"speed":26},
  ditto: {"cost":3,"hp":508,"damage":35,"interval":1.4,"speed":32},
  articuno: {"cost":6,"hp":1250,"damage":90,"interval":1.8,"speed":26},
  zapdos: {"cost":6,"hp":1090,"damage":109,"interval":1.8,"speed":26},
  moltres: {"cost":6,"hp":1170,"damage":109,"interval":1.8,"speed":26},
  dragonite: {"cost":5,"hp":2000,"damage":85,"interval":1.9,"speed":26},
  meganium: {"cost":5,"hp":2400,"damage":105,"interval":1.7,"speed":18},
  typhlosion: {"cost":5,"hp":1130,"damage":150,"interval":1.8,"speed":26,"style":"eruption","air":false},
  feraligatr: {"cost":4,"hp":1900,"damage":300,"interval":1.55,"speed":26,"lifesteal":0},
  crobat: {"cost":4,"hp":900,"damage":75,"interval":1.5,"speed":40},
  ampharos: {"cost":5,"hp":1600,"damage":140,"interval":1.65,"speed":0},
  espeon: {"cost":3,"hp":460,"damage":110,"interval":1,"speed":32},
  umbreon: {"cost":3,"hp":2100,"damage":120,"interval":1.7,"speed":26,"reflect":0,"burn":10,"burnKind":"poison","style":"poison","range":100,"label":"Siniestro","color":"#b5a4d3","move":"Tóxico"},
  wobbuffet: {"cost":4,"hp":1900,"damage":0,"interval":2,"speed":0,"passive":true,"reflect":0.5,"windup":0},
  steelix: {"cost":6,"hp":4500,"damage":310,"interval":2.2,"speed":18},
  scizor: {"cost":4,"hp":1200,"damage":135,"interval":1.3,"speed":32,"shield":240},
  skarmory: {"cost":4,"hp":560,"damage":81,"interval":1.5,"speed":32},
  blissey: {"cost":5,"hp":1800,"damage":35,"interval":2,"speed":18,"heal":95,"style":"egg"},
  lugia: {"cost":7,"hp":3300,"damage":120,"interval":1.6,"speed":26},
  hooh: {"cost":7,"hp":2900,"damage":150,"interval":1.6,"speed":26},
  sceptile: {"cost":4,"hp":600,"damage":115,"interval":1.2,"speed":40},
  blaziken: {"cost":4,"hp":1200,"damage":100,"interval":1.7,"speed":32},
  swampert: {"cost":5,"hp":2800,"damage":190,"interval":1.8,"speed":18},
  gardevoir: {"cost":5,"hp":720,"damage":230,"interval":1.8,"speed":26,"fieldStyle":"psychic","windup":0.6,"range":132,"splash":42},
  sableye: {"cost":3,"hp":800,"damage":160,"interval":1.2,"speed":40,"lifesteal":0,"label":"Siniestro / fantasma"},
  aggron: {"cost":6,"hp":3000,"damage":220,"interval":1.7,"speed":18},
  sharpedo: {"cost":3,"hp":907,"damage":193,"interval":1,"speed":40},
  flygon: {"cost":5,"hp":1650,"damage":165,"interval":1.8,"speed":32},
  altaria: {"cost":4,"hp":900,"damage":75,"interval":1.6,"speed":26,"style":"song","move":"Voz cautivadora","heal":75},
  absol: {"cost":4,"hp":1100,"damage":200,"interval":1.4,"speed":40,"label":"Siniestro","move":"Tajo umbrío"},
  salamence: {"cost":6,"hp":2200,"damage":95,"interval":2.2,"speed":26},
  metagross: {"cost":6,"hp":2800,"damage":260,"interval":2.1,"speed":18,"shield":400},
  kyogre: {"cost":8,"hp":3300,"damage":150,"interval":2.25,"speed":18},
  groudon: {"cost":8,"hp":4500,"damage":320,"interval":2.4,"speed":18,"windup":0.55},
  rayquaza: {"cost":8,"hp":3000,"damage":230,"interval":1.8,"speed":32},
  nidoranF: {"cost":0,"hp":81,"damage":35,"interval":1.4,"speed":32,"burnKind":"poison"},
  nidoranM: {"cost":0,"hp":180,"damage":45,"interval":1.4,"speed":32},
  exeggcute: {"cost":0,"hp":81,"damage":35,"interval":1.4,"speed":26,"suicide":false,"splash":0,"style":"confusion","range":100,"air":true},
  babyKangaskhan: {"cost":0,"hp":400,"damage":80,"interval":1.3,"speed":40},
  diglett: {"cost":1,"hp":81,"damage":81,"interval":1,"speed":32,"scale":1.5},
  diglettHorde: {"cost":3,"hp":81,"damage":81,"interval":1,"speed":32,"scale":1.5},
  raltsTrio: {"cost":2,"hp":133,"damage":81,"interval":1.7,"speed":26,"scale":1.65,"range":120},
  poochyenaPack: {"cost":2,"hp":202,"damage":120,"interval":1.1,"speed":32,"scale":1.65},
};

const descriptions = {
  snorlax: ['Tanque · estructuras', 'Tanque muy lento. Ignora tropas y golpea una estructura cada 2 s; los enjambres lo rodean.'],
  geodude: ['Defensor · objetivo único', 'Defensor de 3 de elixir. Resiste y golpea fuerte a un solo rival terrestre; necesita ayuda contra enjambres.'],
  thunder: ['Hechizo · aturde', 'Daña y aturde a los enemigos en el área. Interrumpe sus ataques.'],
  log: ['Hechizo · empuje', 'Rueda desde tu lado y empuja a los enemigos terrestres a su paso.'],
  zubat: ['Trío · absorción', 'Tres murciélagos atacan a corta distancia y recuperan vida con sus mordidas.'],
  gastly: ['Enjambre aéreo · ×4', 'Cuatro fantasmas voladores atacan a distancia. Dejan niebla dañina al caer.'],
  butterfree: ['Volador · polvo', 'Esparce polvo que ralentiza en área. Ataca a tierra y aire.'],
  nidoking: ['Melee · veneno', 'Dos puñetazos venenosos. Su fuerza castiga cuerpos grandes; no alcanza voladores.'],
  grimer: ['Defensa · lodo tóxico', 'Lanza lodo a corta distancia. Al caer deja un charco que daña a tropas terrestres.'],
  exeggutor: ['Tanque · bomba huevo', 'Lanza huevos que explotan en área. Su ataque es lento y se puede interrumpir antes del lanzamiento.'],
  koffing: ['Volador · gas', 'Escupe gas venenoso en área. La nube daña durante 3 s y alcanza tierra y aire.'],
  feraligatr: ['Melee · mordida', 'Tritura un objetivo terrestre con mordidas fuertes. No tiene daño en área.'],
  umbreon: ['Tanque · tóxico', 'Resiste en primera línea y envenena un objetivo terrestre a corta distancia.'],
  wobbuffet: ['Defensa · contraataque', 'No inicia ataques. Devuelve el 50 % del daño directo recibido; el veneno y las quemaduras evitan su respuesta.'],
  typhlosion: ['Melee · erupción', 'Libera fuego en un área amplia alrededor del objetivo. Quema a los enemigos terrestres.'],
  sableye: ['Salto · hostigamiento', 'Se acerca con Amago cada 3 s y golpea con sus garras. Tiene poca vida y no alcanza voladores.'],
  altaria: ['Volador · canto', 'Ataca con ondas de voz y cura a un aliado cercano. Su canto elimina veneno y ralentización.'],
  gardevoir: ['Apoyo · zona psíquica', 'Carga una esfera que explota y deja una zona de energía psíquica que daña a los enemigos.'],
  absol: ['Melee · críticos', 'Tajo umbrío hace un 60 % más de daño a Pokémon por debajo del 35 % de vida. Ataca a un solo objetivo terrestre.'],
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
    cloyster:'Carámbano',gastly:'Lengüetazo',voltorb:'Autodestrucción',electrode:'Explosión',koffing:'Gas venenoso',
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

}

// Physical attackers approach their target; special attackers fire from range.
// Structures, self-destruct units and passive defenders retain their distinct jobs.
// Equal base stats retain their existing attack, including Ditto's transformation.
function applyAttackRoles(cards) {
  const attacks = {
    pikachu: { move: 'Chispa', style: 'lightning', role: 'Melee · descarga', description: 'Se acerca y descarga electricidad que salta entre rivales cercanos. Aturde e interrumpe sus ataques.' },
    gengar: { move: 'Bola sombra', style: 'shadow', role: 'Rango · teletransporte', description: 'Se teletransporta para reposicionarse y lanza bolas de sombra a tierra y aire.' },
    onix: { move: 'Cola férrea', style: 'slam', role: 'Asedio · estructuras', description: 'Avanza hacia las estructuras y las golpea con su cola. Ignora a las tropas.' },
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
    const base = POKEMON_STATS[card.id];
    if (!base) throw Error(`Missing Pokémon base stats for ${key}`);
    if (card.structure || card.suicide || card.passive || card.attackRoleOverride) continue;
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

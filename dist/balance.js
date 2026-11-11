// Shared by browser, CPU and online server. Values are per body / per hit.
export const THRESHOLDS = Object.freeze({ tower: 109, towerInterval: .8, fragile: 1, scout: 81, meleeSwarm: 180, archers: 304, fireball: 400, log: 218 });

// Explicit health, damage, cadence and speed for every body. No global multipliers.
export const CARD_BALANCE = {
  pikachu: { hp: 450, damage: 109, interval: 1.3, speed: 32 },
  squirtle: { hp: 400, damage: 28, interval: 1.45, speed: 26 },
  charmander: { hp: 360, damage: 81, interval: 1.5, speed: 32, burn: 9 },
  snorlax: { hp: 3400, damage: 300, interval: 2, speed: 18, windup: .55, attackDuration: 1.1, splash: 0, charge: 0 },
  zubat: { hp: 180, damage: 40, interval: 1.1, speed: 30 },
  charizard: { hp: 1000, damage: 42, interval: 1.65, speed: 26 },
  thunder: { cost: 2, damage: 109, towerDamage: 30 },
  fireball: { damage: 400, towerDamage: 110 },
  bulbasaur: { hp: 450, damage: 81, interval: 1.3, speed: 26 },
  gengar: { hp: 650, damage: 125, interval: 1.45, speed: 40, blink: 5 },
  machamp: { hp: 1150, damage: 65, interval: 1.45, speed: 26 },
  eevee: { hp: 300, damage: 90, interval: .95, speed: 40 },
  onix: { hp: 1400, damage: 180, interval: 2.1, speed: 18 },
  blastoise: { hp: 1200, damage: 85, interval: 1.8, speed: 0 },
  vulpix: { hp: 280, damage: 42, interval: 1.45, speed: 32, burn: 7 },
  psyduck: { hp: 450, damage: 81, interval: 1.55, speed: 26 },
  alakazam: { hp: 400, damage: 120, interval: 1.65, speed: 26 },
  geodude: { hp: 1450, damage: 175, interval: 1.6, speed: 18, splash: 0 },
  magnemite: { hp: 400, damage: 81, interval: 1.8, speed: 26 },
  scyther: { hp: 650, damage: 65, interval: 1.2, speed: 40 },
  lapras: { hp: 1500, damage: 109, interval: 1.75, speed: 18 },
  mewtwo: { hp: 950, damage: 180, interval: 2.2, speed: 26, windup: .65 },
  treecko: { hp: 304, damage: 81, interval: 1.2, speed: 26 },
  golem: { hp: 3600, damage: 240, interval: 2.3, speed: 18, windup: .5 },
  log: { damage: 218, towerDamage: 55 },
  venusaur: { hp: 1450, damage: 90, interval: 1.9, speed: 18 },
  butterfree: { hp: 304, damage: 40, interval: 1.7, speed: 26, style: 'powder', color: '#c9ace9', move: 'Paralizador' },
  beedrill: { hp: 180, damage: 42, interval: 1.35, speed: 40 },
  pidgeot: { hp: 720, damage: 109, interval: 1.55, speed: 40 },
  ekans: { hp: 180, damage: 40, interval: 1.25, speed: 32, burn: 8, burnKind: 'poison' },
  sandshrew: { hp: 180, shield: 109, damage: 65, interval: 1.4, speed: 32 },
  nidoqueen: { hp: 2000, damage: 109, interval: 1.8, speed: 18 },
  nidoking: { hp: 1450, damage: 75, interval: 1.6, speed: 26, burn: 8, burnKind: 'poison', deathSpawn: null, deathCount: 0 },
  mankey: { hp: 109, damage: 42, interval: 1.2, speed: 40 },
  arcanine: { hp: 850, damage: 109, interval: 1.5, speed: 40 },
  slowbro: { hp: 1130, damage: 65, interval: 1.8, speed: 18 },
  grimer: { hp: 610, damage: 45, interval: 1.4, speed: 18, style: 'poison', range: 85, color: '#b686c8' },
  cloyster: { hp: 865, damage: 28, interval: 2.6, speed: 0 },
  gastly: { hp: 81, damage: 35, interval: 1.3, speed: 32, count: 4, deathField: 6, style: 'lick' },
  voltorb: { hp: 218, damage: 180, interval: 1.4, speed: 40 },
  electrode: { hp: 790, damage: 400, interval: 1.6, speed: 32, windup: .5 },
  exeggutor: { hp: 1250, damage: 150, interval: 2.1, speed: 18, style: 'egg', splash: 55, summon: null, summonMax: 0, move: 'Bomba huevo' },
  koffing: { hp: 400, damage: 50, interval: 1.9, speed: 26, style: 'poison', burnKind: 'poison', color: '#b49bcf' },
  chansey: { hp: 618, damage: 18, interval: 1.8, speed: 26, heal: 75, style: 'egg' },
  kangaskhan: { hp: 1450, damage: 109, interval: 1.6, speed: 26 },
  starmie: { hp: 450, damage: 42, interval: 2.15, speed: 32 },
  mrmime: { hp: 400, shield: 109, entryShield: 180, damage: 65, interval: 1.5, speed: 26 },
  gyarados: { hp: 1800, damage: 150, interval: 1.9, speed: 26 },
  ditto: { hp: 508, damage: 35, interval: 1.4, speed: 32 },
  articuno: { hp: 1250, damage: 90, interval: 1.8, speed: 26 },
  zapdos: { hp: 1090, damage: 109, interval: 1.8, speed: 26 },
  moltres: { hp: 1170, damage: 109, interval: 1.8, speed: 26 },
  dragonite: { hp: 1210, damage: 50, interval: 1.9, speed: 26 },
  meganium: { hp: 1640, damage: 65, interval: 1.7, speed: 18 },
  typhlosion: { hp: 1130, damage: 150, interval: 1.8, speed: 26, style: 'eruption', air: false },
  feraligatr: { hp: 1210, damage: 160, interval: 1.55, speed: 26, lifesteal: 0 },
  crobat: { hp: 610, damage: 50, interval: 1.55, speed: 40 },
  ampharos: { hp: 1130, damage: 90, interval: 1.65, speed: 0 },
  espeon: { hp: 450, damage: 65, interval: 1.1, speed: 32 },
  umbreon: { hp: 1360, damage: 65, interval: 1.7, speed: 26, reflect: 0, burn: 10, burnKind: 'poison', style: 'poison', range: 100, label: 'Siniestro', color: '#b5a4d3', move: 'Tóxico' },
  wobbuffet: { hp: 1900, damage: 0, interval: 2, speed: 0, passive: true, reflect: .5, windup: 0 },
  steelix: { hp: 2700, damage: 180, interval: 2.2, speed: 18 },
  scizor: { hp: 720, damage: 65, interval: 1.3, speed: 32 },
  skarmory: { hp: 560, damage: 81, interval: 1.5, speed: 32 },
  blissey: { hp: 1405, damage: 25, interval: 2, speed: 18, heal: 75, style: 'egg' },
  lugia: { hp: 2050, damage: 109, interval: 1.9, speed: 26 },
  hooh: { hp: 1680, damage: 109, interval: 1.9, speed: 26 },
  sceptile: { hp: 508, damage: 55, interval: 1.4, speed: 40 },
  blaziken: { hp: 830, damage: 55, interval: 1.7, speed: 32 },
  swampert: { hp: 1885, damage: 130, interval: 1.9, speed: 18 },
  gardevoir: { hp: 509, damage: 125, interval: 2.3, speed: 26, fieldStyle: 'psychic', windup: .6 },
  sableye: { hp: 508, damage: 81, interval: 1.25, speed: 40, lifesteal: 0, label: 'Siniestro / fantasma' },
  aggron: { hp: 2335, damage: 150, interval: 1.9, speed: 18 },
  sharpedo: { hp: 508, damage: 130, interval: 1.65, speed: 40 },
  flygon: { hp: 970, damage: 90, interval: 1.9, speed: 32 },
  altaria: { hp: 618, damage: 55, interval: 1.7, speed: 26, style: 'song', move: 'Voz cautivadora' },
  absol: { hp: 650, damage: 109, interval: 1.4, speed: 40, label: 'Siniestro', move: 'Tajo umbrío' },
  salamence: { hp: 1480, damage: 50, interval: 2.5, speed: 26 },
  metagross: { hp: 2050, damage: 175, interval: 2.1, speed: 18 },
  kyogre: { hp: 2460, damage: 81, interval: 2.25, speed: 18 },
  groudon: { hp: 3200, damage: 260, interval: 2.4, speed: 18, windup: .55 },
  rayquaza: { hp: 2090, damage: 175, interval: 2.1, speed: 32 },
  nidoranF: { hp: 81, damage: 35, interval: 1.4, speed: 32, burnKind: 'poison' },
  nidoranM: { hp: 180, damage: 45, interval: 1.4, speed: 32 },
  exeggcute: { hp: 81, damage: 35, interval: 1.4, speed: 26, suicide: false, splash: 0, style: 'confusion', range: 100, air: true },
  babyKangaskhan: { hp: 218, damage: 35, interval: 1.4, speed: 40 },
  shuppet: { hp: 1, damage: 35, interval: 1.2, speed: 32, scale: 1.5 },
  shuppetSwarm: { hp: 1, damage: 35, interval: 1.2, speed: 32, scale: 1.5 },
  nidoranScouts: { hp: 81, damage: 45, interval: 1.3, speed: 26, burnKind: 'poison', scale: 1.65 },
  nidoranPack: { hp: 180, damage: 75, interval: 1.3, speed: 32, scale: 1.65 },
};

const descriptions = {
  snorlax: ['Tanque · estructuras', 'Tanque muy lento. Ignora tropas y golpea una estructura cada 2 s; los enjambres lo rodean.'],
  geodude: ['Defensor · objetivo único', 'Defensor de 3 de elixir. Resiste y golpea fuerte a un solo rival terrestre; necesita ayuda contra enjambres.'],
  thunder: ['Hechizo · aturde', '109 de daño y 0,75 s de aturdimiento. Elimina Gastly y Nidoran tiradores; los Nidoran melee y Zubat sobreviven.'],
  log: ['Hechizo · empuje', '218 de daño terrestre. Elimina Nidoran melee y empuja; no alcanza voladores.'],
  zubat: ['Trío · absorción', 'Tres voladores de 180 PV. Cada uno cae con dos tiros; sobreviven a Impactrueno y necesitan un tanque delante.'],
  gastly: ['Enjambre aéreo · ×4', 'Cuatro fantasmas voladores de 81 PV. Caen con un tiro o Impactrueno y dejan una niebla débil.'],
  butterfree: ['Volador · polvo', 'Esparce polvo que ralentiza en área. Hace poco daño y cae ante Bola de fuego.'],
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
  gardevoir: ['Apoyo · zona psíquica', 'Carga una esfera que explota y deja energía psíquica. Bola de fuego la deja a un tiro de torre.'],
  absol: ['Melee · críticos', 'Tajo umbrío hace un 60 % más de daño a Pokémon por debajo del 35 % de vida. Ataca a un solo objetivo terrestre.'],
};

export function applyBalance(cards) {
  for (const [key, card] of Object.entries(cards)) {
    if (!CARD_BALANCE[key]) throw new Error(`Missing balance for ${key}`);
    Object.assign(card, CARD_BALANCE[key]);
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
    shuppet:'Impresionar',shuppetSwarm:'Impresionar',
  };
  for (const [key, move] of Object.entries(moves)) cards[key].move = move;
  cards.venusaur.label = 'Planta / veneno';
}

export function cardThresholds(card) {
  if (card.spell) return [];
  const armor = 1 - (card.armor || 0), pool = card.hp + (card.shield || 0);
  const hits = amount => Math.max(0,Math.ceil((pool - amount * armor - 1e-7) / (THRESHOLDS.tower * armor)));
  return [
    ['Tiros de torre', Math.ceil(pool / (THRESHOLDS.tower * armor))],
    ['Bola de fuego', hits(THRESHOLDS.fireball) ? `+ ${hits(THRESHOLDS.fireball)} tiro${hits(THRESHOLDS.fireball)>1?'s':''}` : 'Lo elimina'],
    ['Impactrueno', hits(THRESHOLDS.tower) === 0 ? 'Lo elimina' : 'Sobrevive'],
  ];
}

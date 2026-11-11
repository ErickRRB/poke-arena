// One shared balance pass for browser, CPU, and authoritative online simulation.
// Reference: 109-damage tower shots every 0.8 s; 30 arena units per tile.
export function applyBalance(cards) {
  for (const card of Object.values(cards)) {
    if (card.spell) continue;
    if (card.building) card.pullRange = 300;
    if (card.speed > 0) card.speed = card.speed <= 30 ? 18 : card.speed <= 45 ? 26 : card.speed <= 60 ? 32 : 40;
    // Existing expanded cards retain their mechanics and relative roles.
    // Large bodies retain more health; ranged support and swarms need protection.
    const durability = card.hp >= 2000 ? .82 : card.hp >= 1400 ? .78 : card.count ? .65 : .72;
    card.hp = Math.max(90, Math.round(card.hp * durability / 5) * 5);
  }
  const reference = {
    pikachu: { hp: 450, damage: 100, interval: 1.25 },
    squirtle: { hp: 440, damage: 28, interval: 1.45 },
    charmander: { hp: 360, damage: 65, interval: 1.5 },
    snorlax: { hp: 2800, damage: 300, interval: 1.5 },
    zubat: { hp: 180, damage: 40, speed: 30, interval: 1.1 },
    charizard: { hp: 1000, damage: 42, interval: 1.65 },
    bulbasaur: { hp: 480, damage: 70, interval: 1.3 },
    gengar: { hp: 850, damage: 125, interval: 1.35 },
    machamp: { hp: 1150, damage: 65, interval: 1.45 },
    eevee: { hp: 300, damage: 90, interval: .95 },
    onix: { hp: 1400, damage: 180, interval: 2.1 },
    blastoise: { hp: 1200, damage: 85, interval: 1.8 },
    vulpix: { hp: 280, damage: 38, interval: 1.45 },
    psyduck: { hp: 500, damage: 80, interval: 1.55 },
    alakazam: { hp: 400, damage: 110, interval: 1.65 },
    geodude: { hp: 1250, damage: 110, interval: 1.6 },
    magnemite: { hp: 400, damage: 70, interval: 1.8 },
    scyther: { hp: 650, damage: 55, interval: 1.2 },
    lapras: { hp: 1500, damage: 95, interval: 1.75 },
    mewtwo: { hp: 950, damage: 180, interval: 2.2 },
    treecko: { hp: 304, damage: 80, interval: 1.2 },
    golem: { hp: 3600, damage: 240, interval: 2.3 },
    thunder: { damage: 192, towerDamage: 48 },
  };
  for (const [key, stats] of Object.entries(reference)) Object.assign(cards[key], stats);
  cards.zubat.description = 'Tres voladores de apoyo. Cada uno cae con dos tiros de torre; necesitan un tanque delante. Sus mordidas recuperan 10 de vida.';
}

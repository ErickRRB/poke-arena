import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Game, CARDS, formationOffsets } from '../dist/engine.js';

export const PROTOCOL = { seed: 120112, fps: 30, damageSeconds: 25, warmupSeconds: 5, duelSeconds: 45, gaps: [80, 160], teams: [0, 1] };
const round = n => Math.round(n * 100) / 100;
export const playable = Object.keys(CARDS).filter(key => !CARDS[key].token);
export const combatants = playable.filter(key => !CARDS[key].spell && !CARDS[key].structure && !CARDS[key].building);

export function createSandbox(seed = PROTOCOL.seed, { navigation = false } = {}) {
  const game = new Game({ seed });
  game.start(); game.aiEnabled = false;
  // No tower fire, CPU, deck rotation or resource restrictions in these trials.
  if (navigation) for (const tower of game.towers) { tower.active = false; tower.hp = tower.maxHp = 1e9; }
  else game.towers = [];
  return game;
}

export function spawnCard(game, key, team, x, y) {
  const card = CARDS[key];
  if (!card || card.spell) throw Error(`Expected a troop or structure: ${key}`);
  const group = { id: game.nextId, x, y, duration: 0 };
  return formationOffsets(card, team).map((offset, i) => game.spawn(card.squad?.[i] || key, team, x + offset.x, y + offset.y, 0, group));
}

function dummy(game, team, x, y, { flying = false, structure = false } = {}) {
  const unit = game.spawn('diglett', team, x, y, 0);
  unit.key = 'sandbox-target';
  unit.card = { ...CARDS.diglett, passive: true, damage: 0, speed: 0, count: 1, flying, structure, lifetime: 1e12, radius: 16 };
  unit.hp = unit.maxHp = 1e7; unit.radius = 16; unit.lifetime = 1e12;
  return unit;
}

export function damageTrial(key, { seconds = PROTOCOL.damageSeconds, fps = PROTOCOL.fps, flying = false, tower = false } = {}) {
  const game = createSandbox(), card = CARDS[key];
  let target;
  if (tower) {
    target = { id: game.nextId++, team: 1, lane: 0, king: false, x: 156, y: 500, radius: 29, hp: 1e7, maxHp: 1e7, active: false, cooldown: 1, stun: 0, slow: 0, anim: 0 };
    game.towers.push(target);
  } else target = dummy(game, 1, 156, 500, { flying, structure: !!card.building });
  if (card.spell) {
    game.towers.push({ id: game.nextId++, team: 0, king: true, x: 300, y: 682, radius: 34, hp: 1e7, maxHp: 1e7, active: false, cooldown: 1, stun: 0, slow: 0, anim: 0 });
    game.hands[0] = [key]; game.energy[0] = 1000;
    const result = game.deploy(0, 0, target.x, target.y);
    if (!result.ok) throw Error(`${key}: ${JSON.stringify(result)}`);
  } else spawnCard(game, key, 0, 156, 560);
  let warmupDamage = 0, firstHit = null, releases = 0;
  game.onEvent = event => { if (event.type === 'attackRelease' && event.attacker.team === 0) releases++; };
  for (let step = 0; step < Math.round(seconds * fps); step++) {
    game.step(1 / fps);
    if (firstHit === null && game.stats[0].damage > 0) firstHit = round(game.elapsed);
    if (step < Math.round(PROTOCOL.warmupSeconds * fps)) warmupDamage = game.stats[0].damage;
  }
  return { key, target: tower ? 'tower' : flying ? 'air' : card.building ? 'structure' : 'ground', seconds, damage: round(game.stats[0].damage), sustainedDps: seconds > PROTOCOL.warmupSeconds ? round((game.stats[0].damage - warmupDamage) / (seconds - PROTOCOL.warmupSeconds)) : null, firstHit, releases, bodiesSpawned: game.stats[0].deployed };
}

const alive = (game, team) => game.units.some(unit => unit.team === team && unit.hp > 0) || game.reinforcements.some(job => job.team === team && !job.requiresParent);
export function duelTrial(a, b, { gap = 160, aTeam = 0, fps = PROTOCOL.fps, seconds = PROTOCOL.duelSeconds, seed = PROTOCOL.seed, ability = false } = {}) {
  const game = createSandbox(seed, { navigation: true }), keys = aTeam === 0 ? [a, b] : [b, a], navigationDamage = [0, 0];
  // Inert towers retain normal forward movement after a front row dies. Their
  // damage is excluded, and their weapons stay disabled even if a king wakes.
  game.onEvent = event => { if (event.type === 'damage' && 'king' in event.target) navigationDamage[1 - event.target.team] += event.amount; };
  // Mirror positions and squad orientation, and swap update order with the team.
  for (const team of [0, 1]) spawnCard(game, keys[team], team, 156, 400 + (team ? -1 : 1) * gap / 2);
  for (let step = 0; step < Math.round(seconds * fps) && alive(game, 0) && alive(game, 1); step++) {
    if (ability) for (const unit of game.units.filter(unit => unit.team === aTeam && unit.card.ability && !unit.abilityUsed)) {
      const skill = unit.card.ability;
      if (skill.effect === 'restore' && unit.hp > unit.maxHp * .55) continue;
      if (game.units.some(enemy => enemy.team !== unit.team && Math.hypot(enemy.x - unit.x, enemy.y - unit.y) <= skill.radius + enemy.radius)) {
        game.energy[unit.team] = 10; game.activateAbility(unit.team, unit.id);
      }
    }
    game.towers.forEach(tower => tower.active = false); game.step(1 / fps);
  }
  const living = [0, 1].map(team => alive(game, team));
  const winnerTeam = living[0] && !living[1] ? 0 : living[1] && !living[0] ? 1 : -1;
  const hp = [aTeam, 1 - aTeam].map(team => round(game.units.filter(unit => unit.team === team).reduce((sum, unit) => sum + Math.max(0, unit.hp) + (unit.shield || 0), 0)));
  return { a, b, gap, aTeam, winner: winnerTeam < 0 ? 'draw' : winnerTeam === aTeam ? a : b, seconds: round(game.elapsed), hp, damage: [round(game.stats[aTeam].damage-navigationDamage[aTeam]), round(game.stats[1 - aTeam].damage-navigationDamage[1-aTeam])], abilityEnergy: game.stats[aTeam].energy };
}

export function swarmTrial(key, { seconds = 12 } = {}) {
  const game = createSandbox(), card = CARDS[key], targets = [];
  for (let i = 0; i < 9; i++) {
    const unit = dummy(game, 1, 156 + (i % 3 - 1) * 24, 480 + (Math.floor(i / 3) - 1) * 24);
    unit.hp = unit.maxHp = 202; targets.push(unit);
  }
  if (card.spell) {
    game.towers.push({ id: game.nextId++, team: 0, king: true, x: 300, y: 682, radius: 34, hp: 1e7, maxHp: 1e7, active: false, cooldown: 1, stun: 0, slow: 0, anim: 0 });
    game.hands[0] = [key]; game.energy[0] = 1000; game.deploy(0, 0, 156, 480);
  } else spawnCard(game, key, 0, 156, 560);
  for (let i = 0; i < seconds * PROTOCOL.fps && targets.some(unit => unit.hp > 0); i++) game.step(1 / PROTOCOL.fps);
  return { key, seconds: round(game.elapsed), eliminated: targets.filter(unit => unit.hp <= 0).length, damage: round(game.stats[0].damage) };
}

export const TEAM_SCENARIOS = [
  [['lapras','geodude'],['nidoking','charmander']],
  [['lapras','chansey'],['swampert','charmander']],
  [['geodude','chansey'],['raichu','psyduck']],
  [['sharpedo','blissey'],['lapras','charmander']],
  [['meganium','treecko'],['swampert','psyduck']],
  [['articuno','eevee'],['dragonite','charmander']],
  [['moltres','bulbasaur'],['charizard','vulpix']],
];

export function teamTrial(a, b, { aTeam = 0, gap = 160 } = {}) {
  const game = createSandbox(PROTOCOL.seed, { navigation: true }), sides = aTeam === 0 ? [a, b] : [b, a], healing = [0, 0], navigationDamage = [0, 0];
  game.onEvent = event => {
    if (event.type === 'heal') healing[event.unit.team] += event.amount;
    if (event.type === 'damage' && 'king' in event.target) navigationDamage[1-event.target.team] += event.amount;
  };
  for (const team of [0, 1]) for (const [index, key] of sides[team].entries()) spawnCard(game, key, team, 156 + index * 20, 400 + (team ? -1 : 1) * (gap / 2 + index * 36));
  for (let i = 0; i < PROTOCOL.duelSeconds * PROTOCOL.fps && alive(game, 0) && alive(game, 1); i++) { game.towers.forEach(tower => tower.active = false); game.step(1 / PROTOCOL.fps); }
  const aAlive = alive(game, aTeam), bAlive = alive(game, 1 - aTeam);
  return { a, b, cost: [a, b].map(keys => keys.reduce((sum, key) => sum + CARDS[key].cost, 0)), gap, aTeam, winner: aAlive && !bAlive ? 'a' : bAlive && !aAlive ? 'b' : 'draw', seconds: round(game.elapsed), healing: [round(healing[aTeam]), round(healing[1 - aTeam])], damage: [round(game.stats[aTeam].damage-navigationDamage[aTeam]), round(game.stats[1 - aTeam].damage-navigationDamage[1-aTeam])] };
}

export function runSuite({ focus = null } = {}) {
  const damage = playable.flatMap(key => [damageTrial(key), damageTrial(key, { flying: true }), damageTrial(key, { tower: true })]);
  const duels = [];
  for (let i = 0; i < combatants.length; i++) for (let j = i + 1; j < combatants.length; j++) {
    const a = combatants[i], b = combatants[j];
    if (Math.abs(CARDS[a].cost - CARDS[b].cost) > 1 || focus && !focus.includes(a) && !focus.includes(b)) continue;
    for (const gap of PROTOCOL.gaps) for (const aTeam of PROTOCOL.teams) duels.push(duelTrial(a, b, { gap, aTeam }));
  }
  const scores = combatants.map(key => {
    const matches = duels.filter(trial => trial.a === key || trial.b === key), wins = matches.filter(trial => trial.winner === key).length, draws = matches.filter(trial => trial.winner === 'draw').length;
    return { key, name: CARDS[key].name, role: CARDS[key].role, cost: CARDS[key].cost, hp: CARDS[key].hp, damage: CARDS[key].damage, nominalDps: round(CARDS[key].damage * (CARDS[key].bolts || CARDS[key].burst || 1) / CARDS[key].interval), sustainedDps: damage.find(trial => trial.key === key && trial.target === 'ground')?.sustainedDps ?? null, wins, draws, losses: matches.length - wins - draws, trials: matches.length, winRate: matches.length ? round(wins / matches.length * 100) : null };
  });
  const abilityDuels = ['articuno','zapdos','moltres'].flatMap(a => combatants.filter(b => b !== a && Math.abs(CARDS[a].cost - CARDS[b].cost) <= 1).flatMap(b => PROTOCOL.gaps.flatMap(gap => PROTOCOL.teams.map(aTeam => duelTrial(a, b, { gap, aTeam, ability: true })))));
  const teams = TEAM_SCENARIOS.flatMap(([a, b]) => PROTOCOL.gaps.flatMap(gap => PROTOCOL.teams.map(aTeam => teamTrial(a, b, { gap, aTeam }))));
  return { protocol: PROTOCOL, catalog: structuredClone(CARDS), cards: playable.length, damage, swarms: playable.map(key => swarmTrial(key)), duels, abilityDuels, teams, scores };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), at = args.indexOf('--out'), output = at < 0 ? 'docs/balance-simulation.json' : args[at + 1];
  const focusAt = args.indexOf('--focus'), focus = focusAt < 0 ? null : args[focusAt + 1].split(',');
  const catalogAt = args.indexOf('--catalog');
  if (catalogAt >= 0) {
    const prior = JSON.parse(await readFile(args[catalogAt + 1], 'utf8'));
    for (const [key, card] of Object.entries(prior.catalog)) Object.assign(CARDS[key], card);
  }
  const report = runSuite({ focus });
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, cards: report.cards, damageTrials: report.damage.length, swarms: report.swarms.length, duels: report.duels.length, abilityDuels: report.abilityDuels.length, teams: report.teams.length, focus: report.scores.filter(row => (focus || ['lapras', 'articuno', 'moltres', 'zapdos']).includes(row.key)) }, null, 2));
}

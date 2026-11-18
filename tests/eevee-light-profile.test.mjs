import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, CARDS, DEFAULT_DECK } from '../dist/engine.js?v=target-c1-1';
import { prepareC4Catalog, getC4BaseCard, isCompleteC4CardProfile } from '../dist/c4-catalog.js?v=1';
import { getEeveeLightProfile } from '../dist/eevee-light-profile.js';
import { LIGHT_EEVEE_RULESET, LIGHT_EEVEE_PRODUCER, getArenaProducerByRuleset, getArenaProducerByMarker } from '../dist/arena-profile-producers.js?v=1';
import { packGame, unpackGame } from '../dist/snapshot.js';

await prepareC4Catalog();
const profile = getEeveeLightProfile();
function game(events) {
  const g = new Game({ seed: 71, catalogVersion: 4, ruleset: LIGHT_EEVEE_RULESET, onEvent: event => events.push(event) });
  g.start(); g.aiEnabled = false;
  for (const tower of g.towers) tower.cooldown = 1000;
  return g;
}
function until(g, predicate, steps = 300) {
  for (let i = 0; i < steps && !predicate(); i++) g.step(1 / 30);
  assert.ok(predicate(), 'action did not complete');
}
test('complete candidate leaves both historical resolvers intact', () => {
  assert.ok(isCompleteC4CardProfile(profile, getC4BaseCard('eevee')));
  assert.ok(Object.isFrozen(profile));
  assert.deepEqual([profile.cost, profile.hp, profile.damage, profile.interval, profile.range, profile.speed], [2, 420, 100, 1.2, 18, 43.2]);
  assert.equal(profile.charge, false); assert.equal(profile.riverJump, false);
  assert.equal(profile.splash, 0); assert.equal(profile.stun, 0);
  assert.equal(new Game().cardFor('eevee'), CARDS.eevee);
  assert.equal(new Game({ catalogVersion: 4, ruleset: 'c4-1' }).cardFor('eevee'), getC4BaseCard('eevee'));
  assert.equal(CARDS.eevee.cost, 5); assert.equal(getC4BaseCard('eevee').charge, true);
  assert.equal(profile.windup, 0.25); assert.equal(profile.attackDuration, 0.55);
  assert.equal(CARDS.eevee.windup, 0.5); assert.equal(CARDS.eevee.attackDuration, 0.66);
  assert.equal(getC4BaseCard('eevee').windup, 0.5); assert.equal(getC4BaseCard('eevee').attackDuration, 0.66);
  assert.deepEqual(game([]).cardFor('eevee'), profile);
});
test('producer lookup preserves Eevee identity and rejects a crossed, unimplemented producer', () => {
  const producer = getArenaProducerByRuleset(LIGHT_EEVEE_RULESET);
  assert.equal(producer, getArenaProducerByMarker(LIGHT_EEVEE_PRODUCER));
  assert.deepEqual(producer.keys, ['eevee']); assert.ok(Object.isFrozen(producer) && Object.isFrozen(producer.keys));
  const combined = LIGHT_EEVEE_PRODUCER.replace('c4-eevee-1', 'c4-eevee-espeon-1').replace('eevee-light-v1', 'eevee-light-v1+espeon-single-v1');
  assert.equal(getArenaProducerByMarker(combined), undefined);
  assert.equal(getArenaProducerByRuleset('c4-eevee-espeon-1'), undefined);
  const snapshot = packGame(game([])); snapshot.arenaProfileProducer = combined;
  const before = JSON.stringify(snapshot); assert.throws(() => unpackGame(snapshot), { code: 'ARENA_PROFILE_INVALID' }); assert.equal(JSON.stringify(snapshot), before);
});
test('a new producer deploys Eevee from a real hand at its own cost', () => {
  const deck = ['eevee', ...DEFAULT_DECK.filter(key => key !== 'eevee').slice(0, 7)];
  const g = new Game({ catalogVersion: 4, ruleset: LIGHT_EEVEE_RULESET, deck, seed: 71 });
  g.start(); const before = g.energy[0];
  assert.equal(g.hands[0][0], 'eevee'); assert.equal(g.deploy(0, 0, 250, 600).ok, true);
  assert.equal(g.energy[0], before - 2); assert.deepEqual(g.units.find(u => u.key === 'eevee').card, profile);
});
test('new producer restores a pending native attack and rejects old Eevee before mutation', () => {
  const events = [], g = game(events), tower = g.towers.find(t => t.team === 1 && !t.king);
  const eevee = g.spawn('eevee', 0, tower.x, tower.y + 80, 0); eevee.spawn = 0;
  until(g, () => g.attacks.some(a => a.attacker.id === eevee.id));
  const snapshot = packGame(g), restoredEvents = [], restored = unpackGame(snapshot, e => restoredEvents.push(e));
  assert.equal(restored.ruleset, LIGHT_EEVEE_RULESET); assert.deepEqual(restored.cardFor('eevee'), profile);
  assert.equal(restored.attacks.find(a => a.attacker.id === eevee.id).target.id, tower.id);
  until(restored, () => restoredEvents.some(e => e.type === 'damage' && e.sourceKey === 'eevee'));
  assert.equal(restoredEvents.find(e => e.type === 'damage' && e.sourceKey === 'eevee').amount, 100);
  const compact = structuredClone(snapshot); delete compact.units.find(u => u.key === 'eevee').card;
  assert.deepEqual(unpackGame(compact).units.find(u => u.key === 'eevee').card, profile);
  const bad = structuredClone(snapshot); bad.units.find(u => u.key === 'eevee').card = structuredClone(getC4BaseCard('eevee'));
  const original = JSON.stringify(bad); assert.throws(() => unpackGame(bad), { code: 'ARENA_PROFILE_INVALID' }); assert.equal(JSON.stringify(bad), original);
  const retagged = structuredClone(snapshot); retagged.ruleset = 'c4-1'; assert.throws(() => unpackGame(retagged), { code: 'ARENA_PROFILE_INVALID' });
  const missing = structuredClone(snapshot); delete missing.arenaProfileProducer; assert.throws(() => unpackGame(missing), { code: 'ARENA_PROFILE_INVALID' });
});
test('new producer preserves the C4 base marker for a real canonical projectile', () => {
  const g = game([]), attacker = g.spawn('charmander', 0, 250, 570, 0), target = g.spawn('machamp', 1, 250, 500, 0);
  attacker.spawn = target.spawn = 0; target.card = { ...target.card, passive: true, speed: 0 };
  g.attack(attacker, target); until(g, () => g.projectiles.some(p => p.sourceKey === 'charmander'));
  const snapshot = packGame(g), p = snapshot.projectiles.find(p => p.sourceKey === 'charmander');
  assert.equal(p.sourceProfile, 'c4-1:cards-c1-733'); assert.equal(p.sourceCard, undefined);
  assert.equal(unpackGame(snapshot).projectiles.find(x => x.sourceKey === 'charmander').sourceProfile, p.sourceProfile);
});
test('historical restore and pack reject new producer evidence without changing the input', () => {
  const g = game([]), eevee = g.spawn('eevee', 0, 250, 570, 0); eevee.spawn = 0;
  const snapshot = packGame(g);
  for (const [catalogVersion, ruleset] of [[1, 'c1-733'], [3, 'c3-1'], [4, 'c4-1']]) {
    for (const marker of [true, false]) {
      const data = structuredClone(snapshot); data.catalogVersion = catalogVersion; data.ruleset = ruleset;
      if (!marker) delete data.arenaProfileProducer;
      const before = JSON.stringify(data); assert.throws(() => unpackGame(data), { code: 'ARENA_PROFILE_INVALID' }); assert.equal(JSON.stringify(data), before);
    }
  }
  for (const field of ['snapshotProfiles', 'legacyCardOverrides']) {
    const data = structuredClone(snapshot); data.catalogVersion = 1; data.ruleset = 'c1-733'; delete data.arenaProfileProducer;
    data.units = []; data[field] = { eevee: structuredClone(profile) };
    assert.throws(() => unpackGame(data), { code: 'ARENA_PROFILE_INVALID' });
  }
  for (const field of ['projectiles', 'spells', 'fields']) {
    const data = structuredClone(snapshot); data.catalogVersion = 1; data.ruleset = 'c1-733'; delete data.arenaProfileProducer;
    data.units = []; data[field] = [{ sourceKey: 'eevee', sourceCard: structuredClone(profile) }];
    assert.throws(() => unpackGame(data), { code: 'ARENA_PROFILE_INVALID' });
  }
  const legacy = new Game(); legacy.legacyCardOverrides = { eevee: profile };
  assert.throws(() => packGame(legacy), { code: 'ARENA_PROFILE_INVALID' });
  const opaque = new Game(); opaque.unrelated = { nativeReference: profile.nativeReference };
  assert.doesNotThrow(() => unpackGame(packGame(opaque)));
});
test('natural single hit defeats Diglett and does not apply charge damage', () => {
  const events = [], g = game(events);
  const target = g.spawn('diglett', 1, 250, 500, 0);
  target.card = { ...target.card, passive: true, speed: 0 }; target.spawn = 0;
  const eevee = g.spawn('eevee', 0, 250, 570, 0); eevee.spawn = 0;
  until(g, () => events.some(e => e.type === 'damage' && e.sourceKey === 'eevee'));
  const hits = events.filter(e => e.type === 'damage' && e.sourceKey === 'eevee');
  // Damage events report health actually removed, capped at the target's 81 HP.
  assert.equal(hits.length, 1); assert.equal(hits[0].amount, 81);
  assert.equal(hits[0].target.id, target.id); assert.ok(target.hp <= 0);
});
test('natural approach contacts the enemy tower footprint for one basic hit', () => {
  const events = [], g = game(events), tower = g.towers.find(t => t.team === 1 && !t.king);
  const timing = [];
  g.onEvent = event => { events.push(event); if (event.type === 'attackStart' && event.attacker.key === 'eevee' || event.type === 'damage' && event.sourceKey === 'eevee') timing.push({ event, at: g.elapsed }); };
  const before = tower.hp, eevee = g.spawn('eevee', 0, tower.x, tower.y + 80, 0); eevee.spawn = 0;
  until(g, () => events.some(e => e.type === 'damage' && e.sourceKey === 'eevee'));
  const hit = events.find(e => e.type === 'damage' && e.sourceKey === 'eevee');
  assert.equal(hit.target.id, tower.id); assert.equal(hit.amount, 100); assert.equal(tower.hp, before - 100);
  const start = timing.find(x => x.event.type === 'attackStart'), impact = timing.find(x => x.event.type === 'damage');
  assert.ok(start && impact); assert.equal(start.event.windup, 0.25); assert.equal(start.event.duration, 0.55);
  assert.ok(Math.abs((impact.at - start.at) - 0.25) <= 1 / 30 + 1e-9);
  assert.ok(Math.hypot(eevee.x - tower.x, eevee.y - tower.y) <= profile.range + eevee.radius + tower.radius + 0.01);
});

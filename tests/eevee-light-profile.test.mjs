import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, CARDS } from '../dist/engine.js?v=target-c1-1';
import { prepareC4Catalog, getC4BaseCard, isCompleteC4CardProfile } from '../dist/c4-catalog.js?v=1';
import { getEeveeLightProfile } from '../dist/eevee-light-profile.js';

await prepareC4Catalog();
const profile = getEeveeLightProfile();
// Test-only injection through the existing C1 resolver: not a new producer or wire format.
function game(events) {
  const g = new Game({ seed: 71, onEvent: event => events.push(event) });
  g.legacyCardOverrides = { eevee: profile };
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

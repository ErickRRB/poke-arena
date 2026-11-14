import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../dist/engine.js';
import { createSandbox, spawnCard, damageTrial, swarmTrial, duelTrial, teamTrial } from '../scripts/balance-sandbox.mjs';

test('sandbox removes CPU and tower fire and permits full formations without elixir', () => {
  const game = createSandbox(); game.energy = [0, 0];
  assert.equal(game.aiEnabled, false); assert.deepEqual(game.towers, []);
  const squad = spawnCard(game, 'pandilla', 0, 156, 560);
  assert.deepEqual(squad.map(unit => unit.key), ['poochyenaToken','poochyenaToken','poochyenaToken','raltsToken','raltsToken','raltsToken']);
  assert.ok(Math.max(...squad.slice(0, 3).map(unit => unit.y)) < Math.min(...squad.slice(3).map(unit => unit.y)));
  assert.equal(spawnCard(game, 'diglettHorde', 1, 156, 440).length, 9);
  assert.deepEqual(game.energy, [0, 0]);
});

test('longer duel placement acquires a target and mirrors the attacking side', () => {
  const first = duelTrial('lapras', 'geodude'), mirror = duelTrial('lapras', 'geodude', { aTeam: 1 });
  assert.ok(first.damage[0] > 0 && first.damage[1] > 0);
  assert.equal(first.winner, mirror.winner);
  assert.notEqual(first.winner, 'draw');
});

test('actual spell damage distinguishes troop and tower targets', () => {
  assert.equal(damageTrial('thunder').damage, CARDS.thunder.damage);
  assert.equal(damageTrial('thunder', { tower: true }).damage, CARDS.thunder.towerDamage);
  assert.equal(damageTrial('thunder', { flying: true }).damage, CARDS.thunder.damage);
  assert.equal(damageTrial('spikes', { flying: true }).damage, 0);
  assert.ok(damageTrial('spikes').damage > 0);
});

test('damage trials include complete bursts and delayed reinforcements', () => {
  const burst = damageTrial('machamp', { seconds: 4 });
  assert.ok(burst.releases >= 4); assert.ok(burst.damage >= CARDS.machamp.damage * 4);
  assert.ok(damageTrial('centralElectrode').bodiesSpawned >= 5);
  assert.ok(damageTrial('vivero').bodiesSpawned >= 7);
});

test('area damage and single-target damage differ in the swarm scenario', () => {
  assert.equal(swarmTrial('pinMissile').eliminated, 9);
  assert.ok(swarmTrial('lapras').eliminated < swarmTrial('fireball').eliminated);
});

test('team trials measure healing and record the full team cost', () => {
  const trial = teamTrial(['lapras','chansey'], ['swampert','charmander']);
  assert.deepEqual(trial.cost, [8, 8]); assert.ok(trial.healing[0] > 0);
});

test('30 and 60 fps preserve the measured damage band', () => {
  const a = damageTrial('lapras'), b = damageTrial('lapras', { fps: 60 });
  assert.ok(Math.abs(a.sustainedDps - b.sustainedDps) < CARDS.lapras.damage / 20 + 1);
});

test('player descriptions stay brief, positive and separate from numeric statistics', () => {
  for (const [key, card] of Object.entries(CARDS).filter(([,card]) => !card.token)) {
    assert.ok(card.description.length <= 130, key);
    assert.doesNotMatch(card.description, /;|\bno\b|\d/i, key);
  }
});

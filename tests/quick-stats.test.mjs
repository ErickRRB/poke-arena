import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../dist/engine.js';
import { quickStats, QUICK_STATS_HOLD_MS } from '../dist/quick-stats.js';

const stats = key => quickStats(CARDS[key], CARDS);
const values = key => Object.fromEntries(stats(key).map(row => [row.label, row.value]));

test('a direct spell distinguishes troop and tower damage and shows its radius', () => {
  assert.deepEqual(values('fireball'), { 'Daño a tropas': '688', 'Daño a torres': '159', Radio: '2,5 casillas' });
  assert.deepEqual(values('blizzard'), { 'Daño a tropas': '148', 'Daño a torres': '38', Congela: '3,5 s' });
  assert.equal(values('log').Recorrido, '10,1 casillas');
  assert.equal(QUICK_STATS_HOLD_MS, 250);
});

test('persistent spells show true damage per second and tower immunity instead of false zero impact', () => {
  assert.deepEqual(values('spikes'), { 'Daño / s': '112', Torres: 'No afecta', Duración: '7 s' });
  assert.deepEqual(values('stealthRock'), { 'Daño / s': '60 · 120 al aire', Torres: 'No afecta', Duración: '6 s' });
  assert.deepEqual(values('earthquake'), { 'Daño / s': '81 · 243 a estructuras', 'Torres / s': '49', Duración: '3 s' });
});

test('summon spells describe their troops and never claim zero damage', () => {
  assert.deepEqual(values('sneaselAmbush'), { Invoca: '3 Sneasel', 'Daño / invocación': '125 / golpe', 'Vida / invocación': '202' });
  assert.deepEqual(values('nightmare'), { Invoca: '8 Shuppet', 'Daño / invocación': '65 / golpe', Duración: '5,6 s' });
});

test('ordinary troops show per-body health, hit or burst damage, and actual cadence', () => {
  assert.deepEqual(values('charizard'), { Vida: '1.526', 'Daño / ráfaga': '72 × 3', 'Ataque cada': '1,8 s' });
  assert.deepEqual(values('snorlax'), { Vida: '3.968', 'Daño a torres / golpe': '253', 'Ataque cada': '1,5 s' });
  assert.deepEqual(values('zubat'), { 'Vida / unidad': '81', 'Daño / golpe y unidad': '81', 'Ataque cada': '1,2 s' });
  assert.equal(values('pikachu')['Daño / rayo'], '117');
});

test('a passive reflector shows its useful response instead of an attack it cannot initiate', () => {
  assert.deepEqual(values('wobbuffet'), { Vida: '1.900', 'Devuelve daño directo': '50 %', Duración: '35 s' });
});

test('healers and passive summoners show the action that defines their card', () => {
  assert.deepEqual(values('chansey'), { Vida: '800', Cura: '75 cada 2,5 s', 'Daño / golpe': '18' });
  assert.deepEqual(values('madriguera'), { Vida: '1.200', Invoca: '2 Nidoran♂', Cada: '7 s' });
});

test('mixed groups use real member ranges rather than assigning the leader stats to every body', () => {
  assert.deepEqual(values('pandilla'), { 'Vida / unidad': '133–202', 'Daño / golpe y unidad': '81–125', Unidades: '5' });
});

test('the whole catalog has at most three finite, nonempty quick statistics', () => {
  for (const [key, card] of Object.entries(CARDS)) {
    const rows = stats(key);
    assert.ok(rows.length >= 2 && rows.length <= 3, key);
    assert.equal(new Set(rows.map(row => row.label)).size, rows.length, key);
    for (const row of rows) {
      assert.ok(row.label && row.value, key);
      assert.doesNotMatch(row.value, /NaN|undefined|Infinity/, key);
      if (card.spell) assert.notEqual(row.value, '0', key);
    }
  }
  assert.deepEqual(quickStats(null), []);
});

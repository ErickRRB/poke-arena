import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CARDS, Game } from '../dist/engine.js';
import { POKEMON_STATS } from '../dist/pokemon-stats.js';

function setup(key, distance) {
  const game = new Game({ seed: 213 });
  game.start(); game.aiEnabled = false;
  game.towers.forEach(t => { t.active = false; });
  const attacker = game.spawn(key, 0, 300, 550, 0);
  attacker.card = { ...attacker.card, speed: 0 };
  const target = game.spawn('regice', 1, 300, 550 - distance, 0);
  target.card = { ...target.card, passive: true, damage: 0, lifetime: Infinity };
  target.lifetime = Infinity;
  return { game, attacker, target };
}
function step(game, seconds) { for (let i = 0; i < seconds * 60; i++) game.step(1 / 60); }

test('active troops follow their stronger base attack stat; equal stats keep their role', () => {
  for (const [key, card] of Object.entries(CARDS)) {
    if (card.spell || card.structure || card.suicide || card.passive || card.attackRoleOverride) continue;
    const base = POKEMON_STATS[card.id];
    if (base.attack > base.specialAttack) assert.ok(card.range < 50, key);
    if (base.specialAttack > base.attack) assert.ok(card.range >= 50, key);
  }
});

test('physical replacements must reach contact distance before dealing damage', () => {
  for (const key of ['onix', 'grimer', 'koffing', 'dragonite', 'umbreon', 'hooh', 'flygon', 'salamence', 'diglett', 'poochyenaPack']) {
    const { game, attacker, target } = setup(key, 140);
    game.attack(attacker, target); attacker.cooldown = 100;
    step(game, 1.2);
    assert.equal(target.hp, target.maxHp, `${key} dealt damage from range`);
    target.y = attacker.y - 40;
    game.attack(attacker, target); attacker.cooldown = 100;
    step(game, 1.2);
    assert.ok(target.hp < target.maxHp, `${key} failed at contact distance`);
  }
});

test('special attackers release attacks that hit from behind the front line', () => {
  for (const key of ['gengar', 'gastly', 'typhlosion', 'raltsTrio']) {
    const { game, attacker, target } = setup(key, 115);
    game.attack(attacker, target); attacker.cooldown = 100;
    step(game, 1.5);
    assert.ok(target.hp < target.maxHp, key);
  }
});

test('new groups deploy real grounded species and retain original animation assets', () => {
  const manifest = JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json', import.meta.url)));
  for (const [key, id, count] of [['diglett', 50, 3], ['diglettHorde', 50, 15], ['raltsTrio', 280, 3], ['poochyenaPack', 261, 4]]) {
    const card = CARDS[key];
    assert.equal(card.id, id); assert.equal(card.count, count); assert.ok(!card.flying);
    assert.ok(manifest[id].Walk && manifest[id][card.attackAnim], key);
  }
  assert.ok(!CARDS.shuppet && !CARDS.shuppetSwarm && !CARDS.nidoranScouts && !CARDS.nidoranPack);
});

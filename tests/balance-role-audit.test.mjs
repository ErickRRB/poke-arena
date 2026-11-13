import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/engine.js';
import {towerPushTrial,weakSpellTrial} from '../scripts/audit-role-balance.mjs';
test('Remolino eliminates the weakest ground bodies without enlarging its area',()=>{
 assert.equal(CARDS.whirlpool.splash,84);assert.equal(CARDS.whirlpool.fieldDuration,2.5);
 for(const targetKey of['diglett','shuppetToken'])for(const fresh of[false,true])assert.equal(weakSpellTrial('whirlpool',{targetKey,fresh}).eliminated,3);
});
test('Celebi and Onix threaten undefended towers while an equal-cost defender can stop them',()=>{
 for(const key of['celebi','onix']){
  assert.ok(towerPushTrial(key).damage>=960,key);
  assert.equal(towerPushTrial(key,{defender:'pikachu'}).damage,0,key);
 }
});

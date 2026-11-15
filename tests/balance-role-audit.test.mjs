import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/engine.js?v=34';
import {towerPushTrial,weakSpellTrial} from '../scripts/audit-role-balance.mjs';
test('native Tornado eliminates readied skeleton bodies with its single84-damage pulse',()=>{
 assert.equal(CARDS.whirlpool.splash,132);assert.equal(CARDS.whirlpool.fieldDuration,1.05);
 for(const targetKey of['diglett','shuppetToken'])assert.equal(weakSpellTrial('whirlpool',{targetKey,fresh:false}).eliminated,3);
});
test('Celebi and Onix threaten undefended towers while a control defender reduces the push',()=>{
 for(const key of['celebi','onix']){
  assert.ok(towerPushTrial(key).damage>=CARDS[key].damage*3,key);
  assert.ok(towerPushTrial(key,{defender:'pikachu'}).damage<towerPushTrial(key).damage,key);
 }
});

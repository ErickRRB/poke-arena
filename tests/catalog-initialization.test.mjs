import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/engine.js';
test('independent module URLs preserve every complete original hit budget without mutating the catalog',async()=>{
 const baseline=structuredClone(CARDS),a=await import('../dist/engine.js?catalog-isolation-a'),b=await import('../dist/engine.js?catalog-isolation-b');
 for(const[key,c]of Object.entries(baseline))for(const set of[CARDS,a.CARDS,b.CARDS])assert.deepEqual(set[key],c,key);
 assert.equal(CARDS.blaziken.damage,300);assert.equal(CARDS.dragonite.damage,255);assert.equal(CARDS.crobat.damage,150);assert.equal(CARDS.scizor.damage,270);
 a.CARDS.crobat.hp=1;assert.equal(CARDS.crobat.hp,baseline.crobat.hp);assert.equal(b.CARDS.crobat.hp,baseline.crobat.hp);
});

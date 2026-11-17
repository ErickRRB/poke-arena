import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeSound,CARDS} from './helpers/audio-catalog-harness.mjs';
test('only selected quiet attack cues receive a moderate gain',()=>{
 const a=makeSound();for(const [key,expected] of [['treecko',.102],['roselia',.102],['alakazam',.084]]){const card=CARDS[key];const o=a.event({type:'attackRelease',attacker:{id:card.id,card,key},from:{x:180},style:card.style},10+card.id);assert.ok(Math.abs(o[0].volume-expected)<1e-9,key)}
 const unrelated=a.event({type:'attackRelease',attacker:{id:100,card:CARDS.pikachu,key:'pikachu'},from:{x:180},style:CARDS.pikachu.style},500);assert.equal(unrelated[0].volume,.07);
 assert.equal(a.sound.knightLeek(300,true),true);assert.equal(a.trace.at(-1).volume,.348);
});

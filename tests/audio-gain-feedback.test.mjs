import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SoundSystem} from '../dist/audio.js';

test('quiet deploy voices increase, while other voices and generated spawns stay unchanged',()=>{
 const calls=[], sound=Object.assign(Object.create(SoundSystem.prototype),{enabled:true,ctx:{state:'running'},cry:(...args)=>calls.push(args),play:()=>{}});
 for(const [key,x] of [['pikachu',300],['treecko',301],['snorlax',302]])sound.event({type:'deploy',key,x});
 sound.event({type:'spawn',unit:{key:'pikachu',x:300}});
 sound.event({type:'deploy',key:'missing',x:300});
 assert.deepEqual(calls,[[25,300,.264],[252,301,.264],[143,302,.22]]);
});

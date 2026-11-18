import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundSystem} from '../dist/audio.js';

test('cancelTaggedEffects stops only the result cue and preserves later UI sounds',()=>{
  const calls=[];
  const slot=(tag,recording=false)=>({tag,recording,voice:false,end:8,gain:{gain:{cancelScheduledValues:time=>calls.push(['cancel',tag,time]),setTargetAtTime:(...args)=>calls.push(['fade',tag,...args])}},node:{stop:time=>calls.push(['stop',tag,time])}});
  const cue=slot('result-cue'),later=slot('later-button');
  const sound=Object.assign(Object.create(SoundSystem.prototype),{ctx:{state:'running',currentTime:4},activeEffects:[cue,later],effectSlots:[]});
  assert.equal(sound.cancelTaggedEffects('result-cue'),1);
  assert.deepEqual(sound.activeEffects,[later]);
  assert.deepEqual(calls.map(call=>call.slice(0,2)),[['cancel','result-cue'],['fade','result-cue'],['stop','result-cue']]);
  assert.equal(sound.cancelTaggedEffects('result-cue'),0);
});

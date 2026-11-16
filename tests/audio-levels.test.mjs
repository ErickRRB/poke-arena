import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SoundSystem,AUDIO_LEVELS} from '../dist/audio.js';
function fixture(){const calls={};const s=Object.assign(Object.create(SoundSystem.prototype),{ctx:{state:'running',currentTime:4},levels:{music:50,voices:100,effects:100}});for(const name of ['music','voices','effects','ui'])s[name+'Bus']={gain:{setTargetAtTime:(value,time,delay)=>{calls[name]=[value,time,delay];}}};return {s,calls};}
test('each audio level changes only its own buses and accepts zero',()=>{
 const {s,calls}=fixture();s.setLevel('voices',0);assert.deepEqual(Object.keys(calls),['voices']);assert.equal(calls.voices[0],0);
 s.setLevel('effects',30);assert.equal(calls.effects[0],AUDIO_LEVELS.effects*.3);assert.equal(calls.ui[0],AUDIO_LEVELS.ui*.3);assert.equal(calls.voices[0],0);
 s.setLevel('music',25);assert.equal(calls.music[0],AUDIO_LEVELS.music*.25);assert.deepEqual(s.levels,{music:25,voices:0,effects:30});
 s.setLevel('effects',Infinity);assert.equal(s.levels.effects,30);s.setLevel('voices',120);assert.equal(s.levels.voices,100);
});

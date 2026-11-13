import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SoundSystem} from '../dist/audio.js';
function setup(t){
  const originalWindow=globalThis.window,originalDocument=globalThis.document,instances=[];
  const param=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
  const node=()=>({gain:param(),frequency:param(),threshold:param(),ratio:param(),connect(){},disconnect(){},start(){},stop(){this.onended?.();}});
  class Context{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=100;this.destination=node();this.resumeCalls=0;instances.push(this);}
    createGain(){return node();}createDynamicsCompressor(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}createBufferSource(){return node();}
    createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));return{numberOfChannels:channels,length,sampleRate,getChannelData:ch=>data[ch]};}
    resume(){this.resumeCalls++;if(this.hang)return new Promise(()=>{});if(this.reject)return Promise.reject(Error('Audio is interrupted'));this.state='running';this.onstatechange?.();return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
  }
  class TestSound extends SoundSystem{preload(){return Promise.resolve(true);}}
  globalThis.window={AudioContext:Context};globalThis.document={hidden:false};t.mock.timers.enable({apis:['setTimeout']});
  const sound=new TestSound();sound.unlock();
  t.after(()=>{sound.discardContext();globalThis.window=originalWindow;globalThis.document=originalDocument;});
  return{sound,instances};
}
for(const state of['suspended','interrupted'])test(`audio recovers from ${state} without replacing healthy context or losing music state`,async t=>{
  const{sound,instances}=setup(t),ctx=sound.ctx;sound.setBattleState(true,true);ctx.state=state;ctx.onstatechange();assert.equal(sound.music.playing,false);
  sound.recover();await Promise.resolve();ctx.currentTime=1;t.mock.timers.tick(501);assert.equal(sound.ctx,ctx);assert.equal(ctx.resumeCalls,1);assert.equal(instances.length,1);assert.equal(sound.music.playing,true);assert.equal(sound.music.intense,true);assert.ok(!sound.needsRebuild);
});
test('a closed audio context is replaced while recorded samples and sound preference are preserved',t=>{
  const{sound}=setup(t),old=sound.ctx,buffer={sample:true};sound.buffers.set('cries:25',buffer);sound.last.set('cry:25',99);sound.voiceSlots=[100];old.state='closed';sound.recover();
  assert.notEqual(sound.ctx,old);assert.equal(sound.buffers.get('cries:25'),buffer);assert.equal(sound.enabled,true);assert.equal(sound.last.size,0);assert.deepEqual(sound.voiceSlots,[]);
});
test('the next ordinary gesture rebuilds audio if Safari never resolves resume()',t=>{
  const{sound}=setup(t),old=sound.ctx;old.state='interrupted';old.hang=true;sound.recover();sound.unlock(true);assert.notEqual(sound.ctx,old);assert.equal(old.state,'closed');assert.equal(sound.ctx.state,'running');
});
test('a frozen clock in a running context is detected and recovered on the next gesture',t=>{
  const{sound}=setup(t),old=sound.ctx;sound.setBattleState(true);sound.recover();t.mock.timers.tick(501);assert.equal(sound.needsRebuild,true);sound.setBattleState(true);assert.equal(sound.music.playing,false);
  sound.unlock(true);assert.notEqual(sound.ctx,old);assert.equal(sound.music.playing,true);assert.ok(!sound.needsRebuild);
});
test('a rejected resume is handled and the next gesture restores a new audio graph',async t=>{
  const{sound}=setup(t),old=sound.ctx;old.state='interrupted';old.reject=true;sound.recover();await Promise.resolve();await Promise.resolve();assert.equal(sound.needsRebuild,true);sound.unlock(true);assert.notEqual(sound.ctx,old);assert.equal(sound.ctx.state,'running');
});
test('returning to the page never unmutes audio or resumes a hidden tab',t=>{
  const{sound}=setup(t),ctx=sound.ctx;sound.setEnabled(false);ctx.state='interrupted';sound.recover();sound.unlock(true);assert.equal(ctx.resumeCalls,0);assert.equal(sound.enabled,false);
  sound.enabled=true;document.hidden=true;sound.recover();assert.equal(ctx.resumeCalls,0);
});

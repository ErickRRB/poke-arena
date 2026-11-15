import test from'node:test';import assert from'node:assert/strict';import{BattleMusic,MUSIC_CROSSFADE,MAX_MUSIC_RETRIES}from'../dist/music.js';
const tracks=[{id:'main-a',file:'a.mp3',role:'main'},{id:'main-b',file:'b.mp3',role:'main'},{id:'intense',file:'c.mp3',role:'intense'}];
const param=()=>({value:0,events:[],setValueAtTime(value,at){this.value=value;this.events.push({type:'set',value,at});},linearRampToValueAtTime(value,at){this.events.push({type:'ramp',value,at});},setTargetAtTime(value,at){this.events.push({type:'target',value,at});},cancelScheduledValues(){}});
const node=()=>({gain:param(),connections:[],connect(n){this.connections.push(n);},disconnect(){this.disconnected=true;}});
async function settle(){for(let i=0;i<8;i++)await Promise.resolve();}
function fixture(t,options={}){
 if(!t.musicTimersEnabled){t.mock.timers.enable({apis:['setTimeout','setInterval']});t.musicTimersEnabled=true;}const elements=[],sources=[],ctx={state:'running',currentTime:0,createGain:node,createMediaElementSource(element){assert.ok(!sources.some(s=>s.element===element),'an element can attach to its context only once');const s={...node(),element};sources.push(s);return s;}};
 class Media extends EventTarget{constructor(){super();this.currentTime=0;this.duration=240;this.paused=true;this.ended=false;this.playCalls=0;elements.push(this);}play(){this.playCalls++;if(options.play)return options.play(this);this.paused=false;return Promise.resolve();}pause(){this.paused=true;}load(){}removeAttribute(){this.src='';}}
 const music=new BattleMusic(ctx,node(),{tracks:options.tracks||tracks,createElement:()=>new Media()});t.after(()=>music.dispose());return{ctx,music,elements,sources};
}
test('repeated frame updates and gestures do not restart or recompose a playing recording',async t=>{
 const{music,elements,sources}=fixture(t);music.setPlaying(true);await settle();elements[0].currentTime=83.25;const events=music.bus.gain.events.length;
 for(let i=0;i<180;i++){music.intense=false;music.setPlaying(true);music.userGesture();}
 assert.equal(elements[0].playCalls,1);assert.equal(elements[0].currentTime,83.25);assert.equal(sources.length,1);assert.equal(music.bus.gain.events.length,events);music.intense=true;const changed=music.bus.gain.events.length;for(let i=0;i<180;i++)music.intense=true;assert.equal(music.bus.gain.events.length,changed);
});
test('pause and resume keep the exact musical position and reuse the same media graph',async t=>{
 const{music,elements,sources}=fixture(t);music.setPlaying(true);await settle();elements[0].currentTime=74.125;music.setPlaying(false);t.mock.timers.tick(1000);assert.ok(elements[0].paused);assert.equal(music.snapshot().position,74.125);music.setPlaying(true);await settle();assert.equal(elements[0].currentTime,74.125);assert.equal(sources.length,1);assert.equal(elements[0].playCalls,2);
});
test('a context rebuild restores its recorded track and position without retaining the old element',async t=>{
 const a=fixture(t);a.music.restore({trackId:'main-b',position:111.5,intense:true,rotation:2});a.music.setPlaying(true);await settle();assert.equal(a.elements[0].src,'b.mp3');assert.equal(a.elements[0].currentTime,111.5);const state=a.music.snapshot();a.music.dispose();assert.ok(a.sources[0].disconnected);assert.equal(a.elements[0].src,'');
 const b=fixture(t);b.music.restore(state);b.music.setPlaying(true);await settle();assert.equal(b.elements[0].src,'b.mp3');assert.equal(b.elements[0].currentTime,111.5);assert.ok(b.music.intense);assert.notEqual(b.elements[0],a.elements[0]);
});
test('a whole piece develops before the intensity continuation and crossfades with at most two streams',async t=>{
 const{music,elements}=fixture(t);music.setPlaying(true);await settle();const first=music.current;music.intense=true;first.element.currentTime=180;music.checkProgress();await settle();assert.equal(elements.length,1,'the intensity flag does not restart or prematurely cut the piece');
 first.element.currentTime=240-MUSIC_CROSSFADE/2;music.checkProgress();await settle();assert.equal(music.current.track.id,'intense');assert.equal(music.slots.size,2);assert.ok([...music.slots].every(slot=>slot.element.loop===false));assert.ok(first.gain.gain.events.some(e=>e.type==='ramp'&&e.value===0));t.mock.timers.tick(MUSIC_CROSSFADE*1000+60);assert.equal(music.slots.size,1);assert.ok(first.element.paused);
});
test('network failure advances to another reviewed recording without a procedural fallback',async t=>{
 let attempts=0;const{music,elements}=fixture(t,{play:element=>{attempts++;if(attempts===1)return Promise.reject(new Error('network'));element.paused=false;return Promise.resolve();}});music.setPlaying(true);await settle();assert.ok(music.current);assert.notEqual(music.current.track.id,'main-a');assert.equal(music.slots.size,1);assert.equal(elements.length,2);
});

test('a long practice alternates full compositions even without an overtime flag',async t=>{
 const{music}=fixture(t,{tracks:[tracks[0],tracks[2]]});music.setPlaying(true);await settle();assert.equal(music.current.track.id,'main-a');
 music.current.element.currentTime=239;music.checkProgress();await settle();assert.equal(music.current.track.id,'intense');
 music.current.element.currentTime=239;music.checkProgress();await settle();assert.equal(music.current.track.id,'main-a');assert.equal(music.slots.size,2);
});
test('a blocked autoplay waits for a gesture instead of retrying on every render frame',async t=>{
 let allowed=false;const{music,elements}=fixture(t,{play:element=>{if(!allowed){const e=new Error('gesture');e.name='NotAllowedError';return Promise.reject(e);}element.paused=false;return Promise.resolve();}});music.setPlaying(true);await settle();for(let i=0;i<120;i++)music.setPlaying(true);assert.equal(elements[0].playCalls,1);assert.ok(music.waitingForGesture);allowed=true;music.userGesture();await settle();assert.equal(elements[0].playCalls,2);assert.ok(!elements[0].paused);
});
test('a late play promise cannot start music after pause or clear a newer playback request',async t=>{
 const resolvers=[];const{music}=fixture(t,{play:element=>new Promise(resolve=>resolvers.push(()=>{element.paused=false;resolve();}))});music.setPlaying(true);music.setPlaying(false);music.setPlaying(true);assert.equal(resolvers.length,2);resolvers[0]();await settle();assert.equal(music.pending,true);resolvers[1]();await settle();assert.ok(music.current);assert.ok(music.playing);assert.equal(music.pending,false);assert.equal(music.slots.size,1);
});
test('a single track failing once retries after backoff and becomes playable without another gesture',async t=>{
 let attempts=0;const{music,elements}=fixture(t,{tracks:[tracks[0]],play:element=>{attempts++;if(attempts===1)return Promise.reject(new Error('temporary network'));element.paused=false;return Promise.resolve();}});music.setPlaying(true);await settle();assert.equal(music.slots.size,0);t.mock.timers.tick(999);await settle();assert.equal(attempts,1);t.mock.timers.tick(1);await settle();assert.equal(attempts,2);assert.equal(music.current.track.id,'main-a');assert.equal(elements.length,2);assert.equal(music.slots.size,1);
});
test('persistent failures have bounded exponential retries and a new gesture can retry again',async t=>{
 let attempts=0;const{music}=fixture(t,{tracks:[tracks[0]],play:()=>{attempts++;return Promise.reject(new Error('offline'));}});music.setPlaying(true);await settle();for(const delay of[1000,2000,4000,8000]){t.mock.timers.tick(delay);await settle();}assert.equal(attempts,MAX_MUSIC_RETRIES+1);t.mock.timers.tick(60000);await settle();assert.equal(attempts,MAX_MUSIC_RETRIES+1);assert.equal(music.slots.size,0);music.userGesture();await settle();assert.equal(attempts,MAX_MUSIC_RETRIES+2);
});

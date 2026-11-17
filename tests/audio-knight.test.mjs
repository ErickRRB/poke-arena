import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attackScene,makeSound,CARDS,Game} from './helpers/audio-catalog-harness.mjs';
import {publicEvent,unpackEvent,publicSnapshot} from '../dist/online-wire.js?v=34';
import {unpackGame} from '../dist/snapshot.js?v=34';
test('Knight gesture follows native windup and only valid contact; cold and wire paths',()=>{
 for(const buffered of [false,true]){
  const scene=attackScene('geodude',{buffered});
  const start=scene.events.find(e=>e.type==='attackStart'), release=scene.events.find(e=>e.type==='attackRelease'),damage=scene.events.find(e=>e.type==='damage'),hit=scene.events.find(e=>e.type==='hit');
  assert.equal(start.outputs.length,0);assert.equal(release.outputs.length,0);assert.equal(hit.outputs.length,1);
  const prep=scene.outputs.find(o=>o.sample==='knight:leek'&&o.offset===0);assert.ok(prep);
  assert.equal(hit.outputs[0].sample,'knight:leek');
  assert.equal(prep.offset,0);assert.equal(hit.outputs[0].offset,.17);
  assert.ok(Math.abs(prep.at-10+.17-hit.at)<.035);assert.equal(damage.at,hit.at);
 }
 const a=makeSound({buffered:false}),actor={id:1,key:'geodude',card:CARDS.geodude,x:300};
 const start=unpackEvent(publicEvent({type:'attackStart',attacker:actor,windup:.5}));
 assert.equal(a.event(start).length,0);assert.ok(!a.sound.knightPending?.size);
 const release=unpackEvent(publicEvent({type:'attackRelease',attacker:actor,from:{x:300}}));assert.equal(a.event(release,10.5).length,0);
});
test('cancelled native Knight attack never produces contact',()=>{
 const audio=makeSound({buffered:false}),events=[];let game;
 game=new Game({seed:42,onEvent:e=>{events.push(e.type);audio.event(e,10+(game?.elapsed||0));}});game.start();game.aiEnabled=false;game.towers=[];
 const actor=game.spawn('geodude',0,300,300,0),target=game.spawn('snorlax',1,300,280,0);actor.entryPending=false;target.entryPending=false;actor.target=target;
 events.length=0;audio.trace.length=0;game.attack(actor,target);target.hp=0;
 for(let i=0;i<60;i++)game.step(1/60);
 audio.sound.updateKnight(game);assert.ok(events.includes('attackStart'));assert.ok(!events.includes('hit'));assert.equal(audio.trace.filter(t=>t.sample==='knight:leek').length,0);
});

test('only the current valid attack starts preparation; pause and cancellation discard it',()=>{
 for(const reason of ['normal','actor-dead','target-dead','stun','sequence','missing-job','out-of-range','paused','inactive','snapshot']){
  const audio=makeSound({buffered:false}),game=new Game({seed:42});game.start();game.aiEnabled=false;game.towers=[];
  const actor=game.spawn('geodude',0,300,300,0),target=game.spawn('snorlax',1,300,280,0);actor.entryPending=false;target.entryPending=false;
  let start;game.onEvent=e=>{if(e.type==='attackStart')start=e;};game.attack(actor,target);
  audio.event(unpackEvent(publicEvent(start)));game.elapsed=.34;
  if(reason==='actor-dead')actor.hp=0;if(reason==='target-dead')target.hp=0;if(reason==='stun')actor.stun=1;if(reason==='sequence')actor.attackSeq++;if(reason==='missing-job')game.attacks=[];if(reason==='out-of-range')target.x=900;if(reason==='paused')game.state='paused';
  let current=game;if(reason==='snapshot')current=unpackGame(publicSnapshot(game,0));
  audio.ctx.currentTime=10.34;audio.sound.updateKnight(current,reason!=='inactive');
  const gesture=audio.trace.filter(o=>o.sample==='knight:leek');
  assert.equal(gesture.length,['normal','snapshot'].includes(reason)?1:0,reason);
  if(gesture.length)assert.ok(Math.abs(gesture[0].stoppedAt-gesture[0].at-.17)<1e-7,'no contact samples before hit');
  assert.equal(audio.sound.knightPending.size,0,reason);
 }
});

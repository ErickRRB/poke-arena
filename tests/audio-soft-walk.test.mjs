import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeSound,CARDS,Game} from './helpers/audio-catalog-harness.mjs';
import {publicSnapshot} from '../dist/online-wire.js?v=34';
import {unpackGame} from '../dist/snapshot.js?v=34';

test('deploy voice retains its recorded tail and lasts longer; walking is brief and group-limited',()=>{
 const a=makeSound(),g=new Game({seed:42});g.start();g.aiEnabled=false;g.towers=[];g.onEvent=e=>a.event(e,10+g.elapsed);
 g.hands[0][0]='treecko';g.energy[0]=10;assert.ok(g.deploy(0,0,160,550).ok);const voices=a.trace.filter(t=>t.sample==='cries:252');assert.equal(voices.length,1);assert.equal(voices[0].rate,.94);assert.ok(voices[0].duration>.7);
 const group=g.units.filter(u=>u.key==='treecko');assert.equal(group.length,2);assert.equal(a.sound.walkPending.size,1);
 for(const u of group){u.spawn=0;u.moving=true;u.attackSeq=1;}g.elapsed=1.7;a.ctx.currentTime=11.7;a.sound.updateWalk(unpackGame(publicSnapshot(g,0)));
 assert.equal(a.trace.filter(t=>t.sample==='cries:252').length,2);assert.ok(a.trace.at(-1).duration<=.550001);assert.equal(a.sound.walkPending.size,0);
});
test('pause, mute, death and attacks suppress queued or active walking voices',()=>{
 for(const reason of ['pause','mute','death','attack','inactive']){
  const a=makeSound(),g=new Game({seed:42});g.start();g.aiEnabled=false;g.towers=[];g.onEvent=e=>a.event(e,10+g.elapsed);g.hands[0][0]='geodude';g.energy[0]=10;assert.ok(g.deploy(0,0,160,550).ok);const u=g.units.find(x=>x.key==='geodude');u.spawn=0;u.moving=true;g.elapsed=1.7;a.ctx.currentTime=11.7;
  if(reason==='pause')g.state='paused';if(reason==='mute')a.sound.setLevel('voices',0);if(reason==='death')u.hp=0;if(reason==='attack'){u.attack=1;u.attackDuration=.66;u.attackSeq=1;}
  a.sound.updateWalk(g,reason!=='inactive');assert.equal(a.trace.filter(t=>t.sample==='cries:83').length,1,reason);assert.equal(a.sound.walkPending.size,0,reason);
 }
 const a=makeSound(),g=new Game({seed:42});g.start();g.towers=[];g.onEvent=e=>a.event(e,10+g.elapsed);g.hands[0][0]='geodude';g.energy[0]=10;g.deploy(0,0,160,550);const u=g.units[0];u.spawn=0;u.moving=true;g.elapsed=1.7;a.ctx.currentTime=11.7;a.sound.updateWalk(g);const slot=a.sound.activeEffects.find(x=>x.tag==='walk:'+u.id);assert.ok(slot);g.state='paused';a.ctx.currentTime=11.8;a.sound.updateWalk(g);assert.equal(slot.node.stoppedAt,11.835);
});

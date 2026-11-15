import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js?v=34';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js?v=34';
import {publicSnapshot} from '../dist/online-wire.js?v=34';
import {makeSound} from './helpers/audio-catalog-harness.mjs';

function fresh(){
 const events=[],g=new Game({seed:419,onEvent:event=>events.push({at:g.elapsed,event})});g.start();g.aiEnabled=false;g.towers=[];return{g,events};
}
function still(u){u.card={...u.card,speed:0,damage:0,passive:true,burrow:false};u.cooldown=1000;u.entryPending=false;u.hp=u.maxHp=10000;return u;}
function step(g,seconds,hz=60){for(let i=0;i<Math.round(seconds*hz);i++)g.step(1/hz);}
function dragon(){
 const row=fresh(),a=row.g.spawn('zapdos',0,300,600,0),targets=Array.from({length:4},(_,i)=>still(row.g.spawn(i===1?'charizard':'geodude',1,300+i*40,530,0)));
 a.card={...a.card,speed:0};a.cooldown=1000;row.g.release({attacker:a,target:targets[0],shot:0,seq:a.attackSeq});return{...row,a,targets};
}
function spirit(){
 const row=fresh(),a=row.g.spawn('voltorb',0,95,670,0),targets=Array.from({length:10},(_,i)=>still(row.g.spawn(i===1?'charizard':'geodude',1,95+i*42,610,0)));
 assert.ok(row.g.startLeap(a,targets[0]));a.cooldown=1000;
 for(let i=0;i<120&&a.hp>0;i++)row.g.step(1/60);
 assert.equal(a.hp,0);assert.ok(!row.g.units.includes(a));return{...row,a,targets};
}
for(const hz of[30,60])test(`Dragon delivers three real damage/stun/sound contacts in sequence at ${hz}Hz`,()=>{
 const{g,a,targets,events}=dragon();assert.ok(targets.every(t=>t.hp===10000),'release alone cannot hit');assert.equal(g.projectiles.filter(p=>p.electricChain).length,1);
 a.hp=0; // An already launched attack survives its source.
 g.step(1/hz);assert.equal(targets[0].hp,10000,'the primary shot has real travel');step(g,1,hz);
 const hits=events.filter(e=>e.event.type==='beam');assert.equal(hits.length,3);assert.deepEqual(hits.map(e=>e.event.targetId),targets.slice(0,3).map(t=>t.id));assert.deepEqual(hits.map(e=>e.event.hop),[0,1,2]);
 for(let i=0;i<3;i++){assert.equal(10000-targets[i].hp,CARDS.zapdos.damage);if(i)assert.ok(hits[i].at-hits[i-1].at>=.2-1e-7,'a hop waits150ms then flies at least one50ms tick');}
 assert.equal(targets[3].hp,10000);assert.equal(g.projectiles.length,0);
 const damage=events.filter(e=>e.event.type==='damage');assert.deepEqual(damage.map(e=>e.at),hits.map(e=>e.at),'damage and beam happen on each arrival');
 const audio=makeSound();for(const hit of hits)assert.ok(audio.event(hit.event,hit.at).length,'each arriving link has its own audible contact');assert.equal(new Set(hits.map(e=>e.event.attackId)).size,3);
});
test('a consumed Electro Spirit hits at most nine, including air, with delayed links after its disappearance',()=>{
 const{g,a,targets,events}=spirit();assert.equal(targets[0].hp,10000-CARDS.voltorb.damage);assert.ok(targets.slice(1).every(t=>t.hp===10000));assert.equal(g.projectiles[0].sourceId,a.id);
 const pending=g.projectiles[0],before=targets[1].hp;step(g,.15);assert.equal(targets[1].hp,before,'the next victim is not hurt or stunned during the wait');assert.equal(targets[1].stun,0);step(g,3);
 const hits=events.filter(e=>e.event.type==='beam');assert.equal(hits.length,9);assert.deepEqual(hits.map(e=>e.event.targetId),targets.slice(0,9).map(t=>t.id));assert.equal(targets[9].hp,10000);
 assert.equal(pending.speed,480);assert.ok(hits.slice(1).every((e,i)=>e.at-hits[i].at>=.25-1e-7),'42units require two travel ticks after150ms');
});
test('chain targets becoming hidden are not struck; a primary shot whose target dies stops',()=>{
 for(const hidden of[false,true]){const{g,targets,events}=dragon();if(hidden)targets[0].burrowed=true;else targets[0].hp=0;step(g,1);assert.equal(events.filter(e=>e.event.type==='beam').length,0);assert.ok(targets.slice(1).every(t=>t.hp===10000));assert.equal(g.projectiles.length,0);}
});
test('a dead Spirit hop consumes a slot and continues from its last position after persistence',()=>{
 const{g,targets,events}=spirit();targets[1].hp=0;step(g,1/60);assert.ok(!g.units.includes(targets[1]));
 const restoredEvents=[],clone=unpackGame(JSON.parse(JSON.stringify(packGame(g))),event=>restoredEvents.push({at:clone.elapsed,event}));
 assert.equal(clone.projectiles[0].target,undefined,'the removed dead target is not required to restore a hop');
 step(g,3);step(clone,3);
 for(const game of[g,clone]){assert.equal(game.units.find(t=>t.id===targets[2].id).hp,10000-CARDS.voltorb.damage);assert.equal(game.units.find(t=>t.id===targets[9].id).hp,10000);assert.equal(game.projectiles.length,0);}
 assert.equal(events.filter(e=>e.event.type==='beam'&&e.event.missed).length,1);assert.equal(restoredEvents.filter(e=>e.event.type==='beam'&&e.event.missed).length,1);
 assert.deepEqual(packGame(clone),JSON.parse(JSON.stringify(packGame(g))));
});
test('pause, exact restore and both wire perspectives retain a pending chain without early contact',()=>{
 const{g,events}=spirit(),packed=JSON.parse(JSON.stringify(packGame(g)));g.pause();const frozen=JSON.stringify(packGame(g));step(g,1);assert.equal(JSON.stringify(packGame(g)),frozen);g.resume();
 const clone=unpackGame(packed),mirrored=unpackGame(perspective(packed,1));
 for(const viewer of[0,1]){const copy=unpackGame(perspective(publicSnapshot(g,viewer),viewer)),pending=copy.projectiles[0];assert.equal(pending.sourceId,g.projectiles[0].sourceId);assert.equal(pending.chainTargetId,g.projectiles[0].chainTargetId);assert.equal(pending.team,viewer?1:0);assert.ok(Math.abs(pending.nextStepAt-g.projectiles[0].nextStepAt)<=.001);}
 step(g,3);step(clone,3);step(mirrored,3);assert.deepEqual(packGame(clone),JSON.parse(JSON.stringify(packGame(g))));
 const turnBack=perspective(packGame(mirrored),1);for(const t of g.units){const other=turnBack.units.find(u=>u.id===t.id);assert.equal(other.hp,t.hp);assert.equal(other.stun,t.stun);}assert.equal(events.filter(e=>e.event.type==='beam').length,9);
});
test('Lightning keeps three independent sky strikes500ms apart; Electro Wizard hands and Zap remain simultaneous',()=>{
 const rows=[],g=new Game({seed:12,onEvent:event=>rows.push({at:g.elapsed,event})});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);
 const targets=[-25,0,25].map(dx=>still(g.spawn('geodude',1,288+dx,280,0)));g.hands[0][0]='lightning';g.energy[0]=10;assert.ok(g.deploy(0,0,288,280).ok);g.towers=[];step(g,1.6);
 const strikes=rows.filter(e=>e.event.type==='damage');assert.equal(strikes.length,3);for(let i=1;i<3;i++)assert.ok(Math.abs(strikes[i].at-strikes[i-1].at-.5)<1/60+1e-7);assert.equal(new Set(strikes.map(e=>e.event.target.id)).size,3);assert.ok(rows.filter(e=>e.event.type==='beam').every(e=>e.event.hop===undefined));
 const row=fresh(),wizard=row.g.spawn('pikachu',0,300,600,0),enemies=[still(row.g.spawn('geodude',1,300,530,0)),still(row.g.spawn('charizard',1,330,530,0))];wizard.cooldown=100;row.g.release({attacker:wizard,target:enemies[0],shot:0,seq:wizard.attackSeq});assert.ok(enemies.every(t=>t.hp<10000));assert.equal(row.events.filter(e=>e.event.type==='beam').length,2);assert.ok(row.events.every(e=>e.at===0));assert.equal(row.g.projectiles.length,0);
 const z=new Game({seed:2});z.start();z.aiEnabled=false;z.towers.forEach(t=>t.active=false);const victims=[still(z.spawn('geodude',1,280,280,0)),still(z.spawn('charizard',1,305,280,0))];z.hands[0][0]='thunder';z.energy[0]=10;assert.ok(z.deploy(0,0,288,280).ok);z.step(1/60);assert.ok(victims.every(t=>t.hp===10000-CARDS.thunder.damage));
});

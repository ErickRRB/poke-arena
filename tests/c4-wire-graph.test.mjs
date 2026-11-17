import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {Game} from '../dist/engine.js?v=target-c1-1';
import {prepareC4Transport} from '../dist/c4-packet.js?v=1';
import {publicSnapshot,publicEvent,unpackEvent} from '../dist/online-wire.js?v=target-c1-1';
import {unpackGame,packGame,perspective} from '../dist/snapshot.js?v=target-c1-1';
import {validateC4WireEventIdentity} from '../dist/c4-wire-preparation.js?v=1';
await prepareC4Transport();
const json=value=>JSON.parse(JSON.stringify(value));
const fresh=()=>{const g=new Game({catalogVersion:4,ruleset:'c4-1',seed:42});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.cooldown=1000);return g;};
test('wire preserves the native dead-reference graph and its next step in both perspectives',()=>{
 const g=fresh(),slow=g.spawn('charmander',0,200,500,0),fast=g.spawn('charmander',0,200,440,0),pending=g.spawn('pikachu',0,220,480,0),target=g.spawn('machamp',1,200,400,0);
 target.card={...target.card,passive:true,speed:0};slow.card={...slow.card,windup:.01,projectileSpeed:30};fast.card={...fast.card,windup:.01,projectileSpeed:2000,damage:2000};pending.card={...pending.card,windup:1};g.attack(slow,target);g.attack(fast,target);g.attack(pending,target);g.step(1/30);
 assert.equal(target.hp,0);const raw=packGame(g),wire=json(publicSnapshot(g,0));assert.deepEqual(wire.detachedEntities,json(raw.detachedEntities));
 const restored=unpackGame(wire),ghost=restored.attacks[0].target;assert.equal(restored.projectiles[0].target,ghost);assert.ok(restored.units.some(u=>u.target===ghost));
 const flipped=unpackGame(perspective(wire,1));assert.equal(flipped.attacks[0].target.id,ghost.id);assert.equal(flipped.attacks[0].target.x,600-ghost.x);
 g.step(1/30);restored.step(1/30);assert.deepEqual(json(publicSnapshot(restored,0)),json(publicSnapshot(g,0)));
});
test('a zero-HP entity still in an active array is not moved or filtered by wire',()=>{
 const g=fresh(),a=g.spawn('pikachu',0,200,500,0),b=g.spawn('machamp',1,200,440,0);g.attack(a,b);b.hp=0;
 const wire=json(publicSnapshot(g,0));assert.ok(wire.units.some(u=>u.id===b.id&&u.hp===0));assert.equal(wire.detachedEntities,undefined);const restored=unpackGame(wire);assert.equal(restored.attacks[0].target,restored.units.find(u=>u.id===b.id));
});
test('natural Voltorb electric carrier and an orphaned complete override survive JSON wire',()=>{
 const g=fresh(),v=g.spawn('voltorb',0,200,470,0),a=g.spawn('machamp',1,200,415,0),b=g.spawn('machamp',1,240,415,0);for(const u of[a,b])u.card={...u.card,passive:true,speed:0};
 for(let i=0;i<120&&!g.projectiles.some(p=>p.electricChain&&p.key==='voltorb');i++)g.step(1/30);
 const shot=g.projectiles.find(p=>p.electricChain&&p.key==='voltorb');assert.ok(shot);shot.card={...shot.card,damage:shot.card.damage+.123456789,opaque:{key:'blastoise'}};
 for(const u of g.units)if(u.target===v)u.target=null;g.units=g.units.filter(u=>u!==v);g.attacks=g.attacks.filter(j=>j.attacker!==v&&j.target!==v);
 const wire=json(publicSnapshot(g,0));assert.equal(wire.projectiles.find(p=>p.id===shot.id).card.damage,shot.card.damage);const restored=unpackGame(wire);assert.deepEqual(restored.projectiles.find(p=>p.id===shot.id).card,shot.card);
});
test('known C1/C3 old/Hog and bridge event contexts keep their own profiles through legacy codec',async()=>{
 for(const producer of ['6044941','29e8869','decb9f9','65ab375']){
  const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/arcanine-producers/'+producer+'.json',import.meta.url),'utf8')),g=unpackGame(fixture.snapshot),actor=g.units.find(u=>u.key==='arcanine');assert.ok(actor);
  const event={type:'attackRelease',attacker:actor,key:actor.key,from:{x:actor.x,y:actor.y},to:{x:actor.x,y:actor.y-1}},result=unpackEvent(json(publicEvent(event,g)),{game:g,validateEvent:validateC4WireEventIdentity});assert.deepEqual(result.attacker.card,actor.card);assert.equal(g.ruleset,fixture.snapshot.ruleset??'c1-733');
 }
});

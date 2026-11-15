import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js?v=34';
import {SandboxGame} from '../dist/sandbox.js?v=34';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js?v=34';
import {publicSnapshot,publicEvent,unpackEvent} from '../dist/online-wire.js?v=34';

function fresh(){const events=[],g=new Game({seed:38,onEvent:event=>events.push(event)});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);return{g,events};}
function deploy(g,key){g.hands[0][0]=key;g.energy[0]=10;assert.ok(g.deploy(0,0,300,560).ok);}
function run(g,seconds){for(let i=0;i<Math.round(seconds*60);i++)g.step(1/60);}
for(const key of['vivero','blastoiseCannon','pandilla','gastly','kangaskhan'])test(`${key} has one explicit initial-card group, including squads and companions`,()=>{
 const{g,events}=fresh();deploy(g,key);const direct=g.units.filter(u=>u.spawnCause==='card'),companions=g.units.filter(u=>u.parentId);
 assert.equal(direct.length,CARDS[key].count||1);assert.equal(new Set(direct.map(u=>u.spawnGroup.id)).size,1);for(const u of direct){assert.equal(u.spawnGroup.spawnCause,'card');assert.equal(u.spawnGroup.cardKey,key);assert.equal(u.spawnGroup.startAt,0);assert.ok(u.spawnGroup.duration>=u.spawn);}
 for(const u of companions)assert.equal(u.spawnCause,'companion');
 for(const event of events.filter(e=>e.type==='spawn'))assert.equal(unpackEvent(publicEvent(event)).unit.spawnCause,event.unit.spawnCause);
 for(const viewer of[0,1]){const clone=unpackGame(perspective(publicSnapshot(g,viewer),viewer));assert.deepEqual(clone.units.map(u=>[u.spawnCause,u.spawnGroup.spawnCause,u.spawnGroup.cardKey]),g.units.map(u=>[u.spawnCause,u.spawnGroup.spawnCause,u.spawnGroup.cardKey]));}
});
test('manual lab cards use the same initial-card cause while debug-created fixtures remain generated',()=>{
 const g=new SandboxGame();assert.ok(g.place(0,'pandilla',300,560).ok);assert.ok(g.units.every(u=>u.spawnCause==='card'));const fixture=g.spawn('diglett',1,300,300);assert.equal(fixture.spawnCause,'generated');assert.equal(fixture.spawnGroup.spawnCause,'generated');
});
test('spawner, death, field and barrel children never acquire a direct-card cause',()=>{
 const{g}=fresh();deploy(g,'vivero');run(g,4.5);const parent=g.units.find(u=>u.key==='vivero'),summons=g.units.filter(u=>u.key==='exeggcute');assert.ok(summons.length);assert.ok(summons.every(u=>u.spawnCause==='summon'&&u.spawnGroup.spawnCause==='summon'));
 g.damage(parent,1e6,1);const death=g.units.filter(u=>u.key==='exeggcute'&&u.spawnCause==='death');assert.equal(death.length,4);assert.ok(death.every(u=>u.spawnGroup.spawnCause==='death'));
 const b=fresh().g;b.hands[0][0]='sneaselAmbush';b.energy[0]=10;assert.ok(b.deploy(0,0,300,300).ok);run(b,4);const tokens=b.units.filter(u=>u.key===CARDS.sneaselAmbush.spawnKey);assert.equal(tokens.length,3);assert.ok(tokens.every(u=>u.spawnCause==='spell'&&u.spawnGroup.spawnCause==='spell'));
 const n=fresh().g;n.hands[0][0]='nightmare';n.energy[0]=10;assert.ok(n.deploy(0,0,300,300).ok);run(n,2.5);assert.ok(n.units.length);assert.ok(n.units.every(u=>u.spawnCause==='field'&&u.spawnGroup.spawnCause==='field'));
});
test('scheduled reinforcements preserve origin and deployment clocks through exact restoration',()=>{
 const{g}=fresh(),parent=g.spawn('vivero',0,300,560,0);g.spawnReinforcements(parent,'exeggcute',2,.5);assert.ok(g.reinforcements.length);assert.ok(g.reinforcements.every(job=>job.spawnCause==='summon'));const clone=unpackGame(JSON.parse(JSON.stringify(packGame(g))));run(g,.7);run(clone,.7);assert.deepEqual(JSON.parse(JSON.stringify(packGame(clone))),JSON.parse(JSON.stringify(packGame(g))));assert.ok(g.units.filter(u=>u.parentId).every(u=>u.spawnCause==='summon'));
});

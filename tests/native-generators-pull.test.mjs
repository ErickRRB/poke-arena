import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';
import {native,meleeExchange} from './helpers/native-oracle.mjs';
const run=(g,time,hz)=>{for(let i=0;i<Math.round(time*hz);i++)g.step(1/hz);};
const fresh=()=>{const g=new Game({tutorial:true,seed:76});g.start();g.towers.forEach(t=>t.hp=0);return g;};
for(const hz of[30,60]){
 test(`Furnace independently emits the raw action graph child at${hz}Hz`,()=>{
  const c=native.cards.find(c=>c.name==='FirespiritHut'),sp=c.interval_spawner,g=fresh(),owner=g.spawn('centralElectrode',0,288,600,c.deploy_time_ms/1000),events=[];
  g.onEvent=e=>{if(e.type==='spawn'&&e.unit.key==='fireSpiritToken')events.push({at:g.elapsed,x:e.unit.x,y:e.unit.y,ownerX:owner.x,ownerY:owner.y});};
  run(g,3.9,hz);assert.equal(g.units.filter(u=>u.key==='fireSpiritToken').length,0);
  run(g,.3,hz);let children=g.units.filter(u=>u.parentId===owner.id);assert.equal(children.length,1);
  const first=children[0];assert.equal(first.key,'fireSpiritToken');assert.equal(first.card.nativeReference,'FireSpirits');assert.equal(first.card.damage,Math.floor(native.units.FireSpirits.damage*2.56));
  assert.ok(Math.abs(events[0].at-(1+(sp.interval_ms-sp.start_counter_at_ms)/1000))<=1/hz+1e-7);assert.equal(events[0].x,events[0].ownerX);assert.equal(events[0].y,events[0].ownerY-36);
  assert.equal(first.card.hp,215);assert.ok(first.spawn<=.5);assert.equal(owner.card.structure,false);assert.equal(owner.card.cost,c.elixir);assert.equal(owner.card.speed,28.8);
  run(g,5,hz);children=g.units.filter(u=>u.parentId===owner.id);assert.equal(children.length,2);
  assert.equal(sp.mirrored_y*12,36);assert.ok(children.every(u=>u.card===CARDS.fireSpiritToken));
 });
 test(`Tornado has21 measured pulls, one84-damage pulse and no post-parent damage at${hz}Hz`,()=>{
  const c=native.cards.find(c=>c.name==='Tornado'),ae=c.spell.area_effect_object,g=fresh(),u=g.spawn('geodude',1,400,484,0),hits=[];u.freeze=u.stun=100;
  g.hands[0][0]='whirlpool';g.energy[0]=10;assert.ok(g.deploy(0,0,288,484).ok);
  g.onEvent=e=>{if(e.type==='damage'&&e.sourceKey==='whirlpool')hits.push({at:g.elapsed,amount:e.amount});};
  run(g,.1,hz);assert.ok(u.x<400);assert.ok(Math.abs(u.x-(400-60*.024*ae.buff.attract_percentage/100))<1e-6);
  run(g,1,hz);const expected=400-21*60*.024*ae.buff.attract_percentage/100;assert.ok(Math.abs(u.x-expected)<1e-6,`${u.x} vs${expected}`);
  assert.deepEqual(hits.map(h=>h.amount),[84]);assert.ok(Math.abs(hits[0].at-.6)<=1/hz+1e-7);assert.equal(g.fields.length,0);
  run(g,1,hz);assert.equal(hits.length,1);assert.ok(Math.abs(u.x-expected)<1e-6);
 });
}
test('Tornado ignores mass, slow and freeze for pull magnitude, and cannot be deployed in water',()=>{
 const positions=[];
 for(const mass of[1,100]){
  const g=fresh(),u=g.spawn('geodude',1,400,484,0);u.card={...u.card,mass};u.freeze=u.stun=100;u.slow=100;u.slowFactor=.1;
  g.hands[0][0]='whirlpool';g.energy[0]=10;assert.equal(g.resolveDeployment(0,'whirlpool',300,400),null);assert.ok(g.deploy(0,0,288,484).ok);run(g,1.2,60);positions.push(u.x);
 }
 assert.equal(positions[0],positions[1]);
});
test('Furnace advances on foot and releases a nonhoming fire projectile while its spawner keeps running',()=>{
 const g=new Game({tutorial:true,seed:76});g.start();const attack=g.attack.bind(g);g.attack=(a,b)=>{if(a.card)attack(a,b);};
 const u=g.spawn('centralElectrode',0,168,484,0),events=[];g.onEvent=e=>{if(e.type==='spawn'||e.type==='projectile')events.push(e.type==='spawn'?e.unit.key:e.key);};
 let sawShot=false;for(let i=0;i<600;i++){g.step(1/60);sawShot||=g.projectiles.some(p=>p.key==='centralElectrode'&&p.impactPoint&&!p.target?.card?.flying);}
 assert.ok(u.y<484);assert.ok(sawShot);assert.ok(events.includes('fireSpiritToken'));assert.equal(u.card.structure,false);
});
test('Tornado water clamp preserves the free axis and mirrored snapshots continue the same clock',()=>{
 const a=fresh(),u=a.spawn('geodude',1,250,428,0);u.freeze=u.stun=100;a.hands[0][0]='whirlpool';a.energy[0]=10;assert.ok(a.deploy(0,0,216,364).ok);
 run(a,.3,60);assert.ok(u.y>=424-1e-5);const b=unpackGame(perspective(packGame(a),1));run(a,1,60);run(b,1,60);
 const mirror=b.units.find(t=>t.id===u.id);assert.ok(Math.hypot(mirror.x-(600-u.x),mirror.y-(800-u.y))<1e-5);
});
test('melee oracle identifies its equal-time convention and runtime keeps it under a180-degree mirror',()=>{
 const result=meleeExchange('Knight','Knight');assert.match(result.tiePolicy,/convention/);
 for(const team of[0,1]){
  const g=fresh(),a=g.spawn('geodude',team,300,team?200:600,0),b=g.spawn('geodude',1-team,300,team?230:570,0);
  for(const u of[a,b])u.card={...u.card,speed:0,moveSpeed:0};
  for(let i=0;i<6000&&a.hp>0&&b.hp>0;i++)g.step(1/60);
  assert.deepEqual([a,b].map(u=>u.hp),result.bodies.map(b=>b.hp));
 }
});
test('native death spawns are immediately active, Golemites slide from250 to1500 native and Witch emits a48-unit ring',()=>{
 const g=fresh(),owner=g.spawn('golem',0,300,550,0);g.damage(owner,99999,1);
 const children=g.units.filter(u=>u.key==='geodudeToken');assert.equal(children.length,2);assert.ok(children.every(u=>u.spawn===0));
 assert.deepEqual(children.map(u=>Math.round(Math.abs(u.x-owner.x)*1000)/1000),[6,6]);run(g,.05,60);
 children.forEach(u=>assert.ok(Math.abs(Math.abs(u.x-owner.x)-15.6)<1e-6));run(g,.2,60);children.forEach(u=>assert.ok(Math.abs(Math.abs(u.x-owner.x)-36)<1e-6));
 const witch=g.spawn('duskull',0,300,650,0);run(g,1.1,60);const skeletons=g.units.filter(u=>u.parentId===witch.id);assert.equal(skeletons.length,4);skeletons.forEach(u=>assert.ok(Math.abs(Math.hypot(u.x-witch.x,u.y-witch.y)-48)<1e-6));
});
test('Tombstone death emits all four skeletons at its emission point with zero deployment time and no delayed wave',()=>{
 const g=fresh(),owner=g.spawn('vivero',0,168,600,0);g.damage(owner,99999,1);
 const children=g.units.filter(u=>u.key==='exeggcute');assert.equal(children.length,4);assert.ok(children.every(u=>u.spawn===0));assert.equal(new Set(children.map(u=>`${u.x},${u.y}`)).size,1);assert.equal(children[0].y,564);assert.equal(g.reinforcements.length,0);
});

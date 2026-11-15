import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS,attackReach,spellOverlapsTarget} from '../dist/engine.js?v=34';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js?v=34';
import {native,meleeExchange} from './helpers/native-oracle.mjs';
const fresh=onEvent=>{const g=new Game({tutorial:true,seed:941,onEvent});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.hp=0);return g;};
const run=(g,seconds,hz=60)=>{for(let i=0;i<Math.round(seconds*hz);i++)g.step(1/hz);};
const still=u=>(u.card={...u.card,speed:0,passive:true,summon:null,heal:0},u);

test('no deployed card exposes an activatable ability, including restored legacy snapshots',()=>{
 const g=fresh(),u=g.spawn('mewtwo',0,300,600,0);u.card={...u.card,ability:{damage:999}};u.abilityUsed=true;
 const restored=unpackGame(packGame(g));assert.equal(restored.activateAbility,undefined);assert.ok(Object.values(CARDS).every(c=>!c.ability));assert.equal(restored.units[0].card.ability,undefined);assert.equal(restored.units[0].abilityUsed,undefined);
});
test('all active basic strikes kill the skeleton in one delivered hit; poison remains a separate effect',()=>{
 for(const[key,c]of Object.entries(CARDS).filter(([,c])=>!c.spell&&!c.passive&&c.damage>0&&!c.building)){
  const g=fresh(),actor=g.spawn(key,0,300,600,0),victim=still(g.spawn('diglett',1,300,570,0));
  actor.card={...c,speed:0,summon:null,heal:0,copy:false,jumpRange:0,burrow:false};actor.burrowed=false;actor.entryPending=false;g.attack(actor,victim);actor.cooldown=100;
  let hits=0;g.onEvent=e=>{if(e.type==='damage'&&e.target===victim&&e.sourceId===actor.id&&!e.dot)hits++;};run(g,4);
  assert.equal(victim.hp,0,key);assert.equal(hits,1,key+' must use one complete hit');
 }
});
test('Blissey kills a melee goblin with its basic while Chansey still has a real skeleton-level attack',()=>{
 for(const[key,target]of[['blissey','poochyenaToken'],['chansey','diglett']]){const g=fresh(),a=g.spawn(key,0,300,600,0),b=still(g.spawn(target,1,300,570,0));a.card={...a.card,speed:0};g.attack(a,b);a.cooldown=100;run(g,2);assert.equal(b.hp,0,key);}
});
for(const hz of[30,60]){
 for(const team of[0,1])test(`Bandit uses ordinary hits against the same close target after its first dash, team${team} ${hz}Hz`,()=>{
  const hits=[],dash=[],g=fresh(e=>{if(e.type==='damage'&&e.sourceKey==='sableye')hits.push({at:g.elapsed,amount:e.amount});if(e.type==='dashWindup')dash.push(g.elapsed);});
  const a=g.spawn('sableye',team,300,team?200:600,0),b=still(g.spawn('geodude',1-team,300,team?325:475,0));b.hp=b.maxHp=10000;
  run(g,5,hz);assert.equal(dash.length,1);assert.equal(hits[0].amount,389);assert.ok(hits.length>=3);assert.ok(hits.slice(1).every(h=>h.amount===194));
  assert.ok(Math.abs(hits[1].at-hits[0].at-1)<=2/hz+1e-7);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)-a.radius-b.radius<84);
 });
 test(`native stationary melee trades agree with the independent event oracle at ${hz}Hz`,()=>{
  for(const[key,nativeName]of[['geodude','Knight'],['machamp','MiniPekka'],['feraligatr','MiniPekka'],['raichu','MiniPekka'],['rhydon','Pekka'],['poochyenaToken','Goblin'],['duskullToken','Skeleton']])for(const[opponent,reference]of[['geodude','Knight'],['rhydon','Pekka']]){
   const expected=meleeExchange(nativeName,reference),g=fresh(),a=g.spawn(key,0,300,600,0),b=g.spawn(opponent,1,300,570,0);
   for(const u of[a,b]){u.card={...u.card,speed:0};u.entryPending=false;}
   for(let i=0;i<hz*100&&a.hp>0&&b.hp>0;i++)g.step(1/hz);
   assert.deepEqual([a,b].map(u=>({hp:u.hp,shield:u.shield||0})),expected.bodies.map(({hp,shield})=>({hp,shield})),`${key} vs ${opponent}`);
  }
 });
 for(const team of[0,1])test(`Dart Goblin gets three real tower impacts, team${team} ${hz}Hz`,()=>{
  const events=[],g=new Game({tutorial:true,seed:42,onEvent:e=>events.push(e)});g.start();g.aiEnabled=false;g.hands[team][0]='nuzleaf';g.energy[team]=10;
  assert.ok(g.deploy(team,0,158,team?356:444).ok);run(g,12,hz);
  const hits=events.filter(e=>e.type==='damage'&&e.sourceKey==='nuzleaf'&&'king'in e.target);
  assert.equal(hits.length,3);assert.ok(hits.every(e=>e.amount===143));assert.equal(CARDS.nuzleaf.hp,261);
 });
 test(`Bandit chains two prepared dashes without the old blink recharge at ${hz}Hz`,()=>{
  const events=[],g=fresh(e=>{if(e.type.startsWith('dash'))events.push({type:e.type,time:g.elapsed});}),a=g.spawn('sableye',0,158,700,0),first=still(g.spawn('diglett',1,158,575,0)),second=still(g.spawn('diglett',1,158,475,0));
  a.blinkCooldown=999;run(g,3,hz);assert.equal(first.hp,0);assert.equal(second.hp,0);
  const prep=events.filter(e=>e.type==='dashWindup'),travel=events.filter(e=>e.type==='dashStart');assert.equal(prep.length,2);assert.equal(travel.length,2);
  travel.forEach((e,i)=>assert.ok(e.time-prep[i].time>=.8-1/hz-1e-7));assert.ok(prep[1].time<2,'no three-second recharge');
 });
 test(`Graveyard follows all twelve native action positions and deadlines at ${hz}Hz`,()=>{
  const expected=native.cards.find(c=>c.name==='Graveyard').spell.area_effect_object.schedule.entries;
  const records=[];
  for(const team of[0,1]){
   const spawned=[],g=fresh(e=>{if(e.type==='spawn'&&e.unit.key==='shuppetToken')spawned.push({at:g.elapsed,x:e.unit.x,y:e.unit.y,deploy:e.unit.spawn});});g.hands[team][0]='nightmare';g.energy[team]=10;
   assert.ok(g.deploy(team,0,team?348:252,team?544:256).ok);run(g,9,hz);assert.equal(spawned.length,12);
   for(let i=0;i<12;i++){assert.ok(Math.abs(spawned[i].at-expected[i].delay_ms/1000)<=1/hz+1e-7);assert.equal(spawned[i].deploy,.5);}
   assert.equal(g.fields.length,0);records.push(spawned);
  }
  records[0].forEach((p,i)=>{assert.ok(Math.abs(records[1][i].x-(600-p.x))<1e-7);assert.ok(Math.abs(records[1][i].y-(800-p.y))<1e-7);});
  assert.equal(CARDS.shuppetToken.hp,81);assert.equal(CARDS.shuppetToken.damage,81);assert.equal(CARDS.shuppetToken.interval,1.1);assert.equal(CARDS.shuppetToken.ttl,0);
 });
}
test('Princess impact overlaps bodies and tower footprints around its captured point, through a restored snapshot',()=>{
 let g=fresh();const a=g.spawn('roselia',0,300,650,0),primary=still(g.spawn('geodude',1,300,500,0)),edge=still(g.spawn('geodude',1,353,500,0)),tower=g.towers.find(t=>t.team===1&&!t.king);tower.x=364;tower.y=500;tower.hp=tower.maxHp;tower.active=false;
 a.card={...a.card,speed:0};g.attack(a,primary);a.cooldown=100;run(g,.35);assert.ok(g.projectiles[0].impactPoint);primary.x=440;g.damage(primary,99999,0);run(g,.05);
 const id=edge.id,towerId=tower.id;g=unpackGame(perspective(packGame(g),1));run(g,1);
 assert.equal(g.units.find(u=>u.id===id).hp,CARDS.geodude.hp-168);assert.equal(g.towers.find(t=>t.id===towerId).hp,tower.maxHp-168);
});
test('Golem children use their own complete token and remain Geodude when the knight identity changes',()=>{
 const g=fresh(),parent=g.spawn('golem',0,300,600,0),enemy=still(g.spawn('geodude',1,330,600,0));g.damage(parent,99999,1);
 const children=g.units.filter(u=>u.key==='geodudeToken');assert.equal(children.length,2);assert.ok(children.every(u=>u.card.id===74&&u.hp===1039&&u.card.damage===84&&u.card.deathDamage===99));assert.equal(enemy.hp,CARDS.geodude.hp-225);
});
test('Ralts hut is a separate proximity spawner and uses the same spear-goblin body as the gang',()=>{
 const g=fresh(),hut=g.spawn('raltsHut',0,300,600,0);assert.equal(hut.card.id,null);assert.equal(hut.card.structureArt,'raltsHut');run(g,1.5);assert.equal(g.units.length,1);
 const enemy=still(g.spawn('geodude',1,300,470,0));run(g,1.05);let children=g.units.filter(u=>u.parentId===hut.id);assert.equal(children.length,1);assert.equal(children[0].card,CARDS.raltsToken);assert.equal(children[0].card.damage,81);
 run(g,2.2);assert.equal(g.units.filter(u=>u.parentId===hut.id).length,2);enemy.y=100;run(g,2.5);assert.equal(g.units.filter(u=>u.parentId===hut.id).length,2);
 const before=g.units.length;g.damage(hut,99999,1);assert.equal(g.units.length,before+1);assert.equal(CARDS.vivero.summon,'exeggcute');
});

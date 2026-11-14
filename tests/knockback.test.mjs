import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {Renderer} from '../dist/render.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';
function fresh(onEvent=()=>{}){const g=new Game({tutorial:true,seed:94,onEvent});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.stun=999);return g;}
const run=(g,s)=>{for(let i=0;i<Math.round(s*60);i++)g.step(1/60);};
const stationary=unit=>(unit.card={...unit.card,speed:0,passive:true},unit);
function fireball(g,x,y){g.spells.push({key:'fireball',card:{...CARDS.fireball,travelSpeed:0,damage:1,towerDamage:0},team:0,x,y,delay:0});g.step(1/60);}
function boulder(g,target){g.projectiles.push({id:'test-rock',key:'graveler',target,team:0,x:target.x-20,y:target.y,startX:target.x-20,startY:target.y,dx:1,dy:0,totalDistance:100,travelled:0,speed:180,damage:1,style:'rock',rolling:true,shotRadius:24,knockback:24,hitIds:[],life:2});g.step(1/60);}

test('building seekers such as Rapidash are pushable, with no accidental immunity from their target preference',()=>{
  for(const hit of[fireball,boulder]){const g=fresh(),u=stationary(g.spawn('rapidash',1,300,520,0)),x=u.x;hit===fireball?hit(g,276,520):hit(g,u);assert.ok(u.x-x>=23.9);assert.ok(u.hp<u.maxHp);}
});
test('ordinary fireballs and rocks respect explicit immunity; force pushes can still move heavy bodies',()=>{
  for(const key of['graveler','rhydon','snorlax','golem','regirock','celebi']){
    for(const hit of[fireball,boulder]){const g=fresh(),u=stationary(g.spawn(key,1,300,520,0)),before={x:u.x,y:u.y};hit===fireball?hit(g,276,520):hit(g,u);assert.deepEqual({x:u.x,y:u.y},before,key);assert.equal(g.pushUnit(u,24,0,{force:true}),true);assert.ok(u.x>before.x,key);}
  }
});
test('the push rule depends on a declared body trait, never maximum health',()=>{
  const g=fresh(),light=stationary(g.spawn('geodude',1,300,520,0));light.hp=light.maxHp=9999;boulder(g,light);assert.ok(light.x>320);
  const heavy=stationary(g.spawn('graveler',1,300,580,0));heavy.hp=heavy.maxHp=10;fireball(g,276,580);assert.equal(heavy.x,300);
});
test('a push invalidates a pending attack, retains its target and lets its remaining cooldown run',()=>{
  const g=fresh(),unit=g.spawn('geodude',1,300,520,0),victim=stationary(g.spawn('grimer',0,300,548,0));unit.card={...unit.card,speed:0};
  g.attack(unit,victim);const seq=unit.attackSeq,cooldown=unit.cooldown,hp=victim.hp;assert.ok(g.attacks.some(job=>job.attacker===unit));
  fireball(g,276,520);assert.ok(unit.attackSeq>seq);assert.equal(unit.target,victim);assert.equal(unit.attack,0);assert.ok(Math.abs(unit.cooldown-(cooldown-1/60))<1e-6);
  run(g,.65);assert.equal(victim.hp,hp,'the canceled strike must not resolve after push');
});
test('Log and Marea cancel prepared charges through the same rule',()=>{
  const g=fresh(),unit=stationary(g.spawn('arcanine',1,300,500,0));unit.charge=2;g.hands[0][0]='log';g.energy[0]=10;assert.ok(g.deploy(0,0,300,520).ok);g.step(1/60);assert.ok(unit.charge<CARDS.arcanine.charge);
  const sea=fresh(),kyogre=sea.spawn('kyogre',0,300,500,0),enemy=sea.spawn('arcanine',1,330,520,0),victim=stationary(sea.spawn('grimer',0,330,548,0));
  sea.attack(enemy,victim);enemy.charge=2;const seq=enemy.attackSeq,cooldown=enemy.cooldown;sea.energy[0]=10;assert.ok(sea.activateAbility(0,kyogre.id).ok);
  assert.equal(enemy.charge,0);assert.ok(enemy.attackSeq>seq);assert.equal(enemy.target,victim);assert.equal(enemy.cooldown,cooldown);
});
test('push cannot pull an invulnerable dash or an active jump out of its path',()=>{
  const g=fresh(),dash=g.spawn('sableye',1,300,520,0),jump=g.spawn('rapidash',1,350,420,0);
  dash.dash={phase:'travel'};jump.leap={kind:'river'};for(const u of[dash,jump]){const before={x:u.x,y:u.y};assert.equal(g.pushUnit(u,24,0,{force:true}),false);assert.deepEqual({x:u.x,y:u.y},before);}
});
test('a canceled preparation loses its visual charge in the same frame',()=>{
  const r=Object.assign(Object.create(Renderer.prototype),{effects:[],particles:[],numbers:[],frameActors:new Map(),t:0,verticalScale:1,bodyHeights:new Map(),healthStates:new Map(),ensureSpecies:async()=>{}});
  const g=fresh(e=>r.onEvent(e)),unit=g.spawn('sableye',0,300,600,0),target=stationary(g.spawn('grimer',1,300,480,0));
  g.step(1/60);assert.equal(unit.dash.phase,'windup');assert.ok(r.effects.some(e=>e.kind==='charge'));
  g.pushUnit(unit,24,0);r.frameActors.set(unit.id,unit);const c=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});r.drawEffects(c,0);assert.ok(!r.effects.some(e=>e.kind==='charge'));
});
test('push traits and interruption survive reconnecting and mirrored snapshots',()=>{
  const g=fresh(),unit=g.spawn('rapidash',1,300,520,0);unit.charge=2;unit.cooldown=.7;
  for(const mirrored of[false,true]){const restored=unpackGame(perspective(packGame(g),mirrored?1:0)),copy=restored.units.find(u=>u.id===unit.id),x=copy.x;assert.ok(restored.pushUnit(copy,mirrored?-24:24,0));assert.ok(Math.abs(copy.x-x)>=23.9);assert.equal(copy.charge,0);assert.equal(copy.cooldown,.7);}
});

test('a remote death cancels a preparation even when the cached event actor is stale',()=>{
  const r=Object.assign(Object.create(Renderer.prototype),{effects:[{kind:'charge',actor:{id:8,hp:800,attackSeq:1},seq:1}],particles:[],reduced:true});
  r.onEvent({type:'faint',unit:{id:8,x:300,y:500,hp:0}});assert.equal(r.effects.length,0);
  for(const key of['gyarados','lugia','hooh'])assert.equal(CARDS[key].knockbackImmune,false,'unreferenced flyers retain their established spell vulnerability');
});

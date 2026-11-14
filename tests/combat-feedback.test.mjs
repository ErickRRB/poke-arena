import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {Renderer} from '../dist/render.js';
import {packGame,unpackGame,packEvent,perspective} from '../dist/snapshot.js';
const fresh=()=>{const events=[],game=new Game({seed:92,onEvent:e=>events.push(e)});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);return{game,events};};
const run=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)game.step(1/60);};

test('floating combat numbers stay hidden until explicitly enabled and clear immediately when disabled',()=>{
 const renderer=Object.assign(Object.create(Renderer.prototype),{numbers:[],bodyHeights:new Map(),t:0}),target={id:1,x:300,y:500,team:1,hp:900,maxHp:1000,card:CARDS.snorlax};
 renderer.floatingNumber(target,100);renderer.floatingNumber(target,30,'heal');assert.equal(renderer.numbers.length,0);
 renderer.setCombatNumbers(true);renderer.floatingNumber(target,100);assert.equal(renderer.numbers.length,1);assert.equal(renderer.numbers[0].amount,100);
 renderer.setCombatNumbers(false);assert.equal(renderer.numbers.length,0);let textCalls=0;renderer.drawNumbers({fillText(){textCalls++;}},.1);assert.equal(textCalls,0);
});
test('hiding combat numbers preserves damage, health feedback and healing effects',()=>{
 const renderer=Object.assign(Object.create(Renderer.prototype),{numbers:[],effects:[],healthStates:new Map(),t:0});renderer.setCombatNumbers(false);
 const target={id:1,x:300,y:500,team:1,hp:800,maxHp:1000,card:CARDS.snorlax};renderer.onEvent({type:'damage',target,amount:200});
 assert.equal(renderer.numbers.length,0);assert.equal(renderer.healthStates.get(1).chip,1);assert.equal(renderer.healthStates.get(1).last,.8);
 renderer.onEvent({type:'heal',unit:target,amount:40});assert.equal(renderer.effects[0].art,'heal');assert.equal(renderer.numbers.length,0);
});
test('a structure has one shared health and lifetime budget after time, hits and reconnection',()=>{
 for(const key of Object.keys(CARDS).filter(k=>CARDS[k].structure)){
  const{game}=fresh(),unit=game.spawn(key,0,300,500,0);run(game,2);
  assert.ok(Math.abs(unit.hp/unit.maxHp-unit.lifetime/unit.card.lifetime)<1e-8,key);
  game.damage(unit,unit.maxHp*.4,1);assert.ok(Math.abs(unit.hp/unit.maxHp-unit.lifetime/unit.card.lifetime)<1e-8,key);
  const restored=unpackGame(packGame(game)).units.find(u=>u.id===unit.id);assert.equal(restored.lifetime,unit.lifetime);
  const remaining=unit.lifetime;run(game,remaining+.1);assert.equal(unit.hp,0,key);
 }
});
test('structure health does not leave a full yellow damage trail while its lifetime drains',()=>{
 const renderer=Object.assign(Object.create(Renderer.prototype),{healthStates:new Map(),t:2,drawDt:1/60});
 const unit={id:1,card:CARDS.regice,team:0,hp:500,maxHp:1000,hit:0};renderer.healthStates.set(1,{chip:1,last:.9,at:2});
 const ctx=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});renderer.healthBar(ctx,unit,100,100,44);
 assert.equal(renderer.healthStates.get(1).chip,.5);
});
test('Forretress death stun has no hidden one-damage hit',()=>{
 const{game,events}=fresh(),explosive=game.spawn('forretress',0,300,500,0),enemy=game.spawn('geodude',1,350,500,0),hp=enemy.hp;
 game.damage(explosive,9999,1);assert.equal(enemy.hp,hp);assert.equal(enemy.stun,CARDS.forretress.deathStun);
 assert.ok(!events.some(e=>e.type==='damage'&&e.target===enemy));assert.ok(events.some(e=>e.type==='deathBurst'&&e.unit===explosive));
});
test('expiry and self-removal are not counted as attacks against their own owner',()=>{
 const{game,events}=fresh(),token=game.spawn('shuppetToken',0,300,500,0);token.ttl=.01;run(game,.05);
 assert.equal(token.hp,0);assert.equal(game.stats[1].damage,0);assert.ok(!events.some(e=>e.type==='damage'&&e.target===token));
});
test('burn and spell hits keep their origin through event serialization',()=>{
 const{game,events}=fresh(),source=game.spawn('charmander',0,300,500,0),target=game.spawn('snorlax',1,300,420,0);
 game.strike(source,target,50,{burn:20});game.tickStatus(target,.51);const dot=events.find(e=>e.type==='damage'&&e.dot);
 assert.equal(dot.sourceId,source.id);assert.equal(dot.sourceKey,'charmander');const restored=perspective(packEvent(dot),1);assert.equal(restored.sourceId,source.id);assert.equal(restored.sourceKey,'charmander');
});
test('Blastoise walks, keeps its health over time and cannot lure a building seeker',()=>{
 const{game}=fresh(),unit=game.spawn('blastoise',0,158,530,0),hp=unit.hp;run(game,4);
 assert.ok(unit.y<500);assert.equal(unit.hp,hp);assert.equal(unit.lifetime,0);assert.equal(unit.card.structure,false);
 const tank=game.spawn('snorlax',1,158,390,0);assert.notEqual(game.acquire(tank),unit);
 const structure=game.spawn('regice',0,158,475,0);assert.equal(game.acquire(tank),structure);
});

test('an area projectile reports the exact ground center and radius it damaged, including the other perspective',()=>{
  const{game,events}=fresh(),source=game.spawn('roselia',0,300,560,0),target=game.spawn('grimer',1,300,300,0),inside=game.spawn('grimer',1,335,300,0),outside=game.spawn('grimer',1,355,300,0);
  for(const u of[target,inside,outside])u.card={...u.card,speed:0,damage:0,passive:true};game.attack(source,target);source.cooldown=100;run(game,2);
  assert.equal(target.maxHp-target.hp,CARDS.roselia.damage);assert.equal(inside.maxHp-inside.hp,CARDS.roselia.damage);assert.equal(outside.hp,outside.maxHp);
  const hit=events.find(e=>e.type==='hit'&&e.key==='roselia');assert.equal(hit.radius,48);assert.equal(hit.groundX,target.x);assert.equal(hit.groundY,target.y);assert.equal(hit.art,'petalShot');
  const mirrored=perspective(packEvent(hit),1);assert.equal(mirrored.groundX,600-hit.groundX);assert.equal(mirrored.groundY,800-hit.groundY);
  const renderer=Object.assign(Object.create(Renderer.prototype),{effects:[],verticalScale:1});renderer.onEvent(mirrored);assert.equal(renderer.effects[0].radius,48);assert.equal(renderer.effects[0].y,mirrored.groundY);assert.equal(renderer.effects[0].impactY,mirrored.groundY-hit.impactHeight);
});

test('area feedback draws the real footprint without increasing single-target contact flashes',()=>{
  const effects=[],calls=[],renderer=Object.assign(Object.create(Renderer.prototype),{effects,particles:[],verticalScale:1,reduced:false,combatArt:(c,art,x,y,size)=>calls.push({art,x,y,size})});
  renderer.onEvent({type:'hit',key:'nuzleaf',style:'leaf',x:300,y:280,radius:0});assert.equal(effects[0].kind,'artImpact');assert.ok(effects[0].visualSize<30);
  const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??((...args)=>{if(k==='arc')calls.push({radius:args[2]});}),set:(o,k,v)=>(o[k]=v,true)});
  renderer.areaImpact(ctx,{x:300,y:300,radius:180,art:'explosion',style:'ember'},.35);assert.ok(calls.some(c=>c.radius===180));assert.ok(calls.filter(c=>c.size).every(c=>c.size<=72));
  renderer.onEvent({type:'hit',key:'forretress',style:'slam',x:300,y:280,groundX:300,groundY:300,radius:60,structuresOnly:true});assert.equal(effects.filter(e=>e.kind==='areaImpact').length,0);
});

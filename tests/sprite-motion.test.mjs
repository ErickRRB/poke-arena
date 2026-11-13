import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,CARDS} from '../dist/engine.js';
import {SPRITE_GEOMETRY} from '../dist/sprite-geometry.js';
import {emissionPoint,animationFrame,attackPoseProgress} from '../dist/sprite-motion.js';
import {Renderer} from '../dist/render.js';
import {flightSheets,flightPose,flightEmission} from '../dist/flight-motion.js';
import {packGame,unpackGame,packEvent,perspective} from '../dist/snapshot.js';

test('native emission markers cover every playable attack in all eight directions',()=>{
 for(const card of Object.values(CARDS).filter(c=>!c.spell)){
  assert.ok(SPRITE_GEOMETRY[card.id]?.[card.attackAnim]||SPRITE_GEOMETRY[card.id]?.Idle,card.name);
  for(let direction=0;direction<8;direction++)for(const phase of[0,.25,.5,.9]){
   const angle=(2-direction)*Math.PI/4,actor={card,x:300,y:500,dx:Math.cos(angle),dy:Math.sin(angle),attack:card.attackDuration*(1-phase),attackDuration:card.attackDuration};
   const point=emissionPoint(actor);assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y),card.name);
   assert.ok(Math.hypot(point.x-actor.x,point.y-actor.y)<190,card.name);
  }
 }
});
test('Charizard fire attaches to its original head marker instead of the old height constant',()=>{
 const game=new Game({seed:11}),actor=game.spawn('charizard',0,300,500,0),target=game.spawn('snorlax',1,390,500,0);
 game.face(actor,target);game.attack(actor,target);actor.attack=actor.attackDuration-actor.attackWindup;
 const first=game.muzzle(actor);actor.card={...actor.card,muzzleHeight:999};assert.deepEqual(game.muzzle(actor),first);
 assert.ok(first.x>actor.x+10);assert.ok(first.y<actor.y-16);assert.ok(first.y>actor.y-80);
 game.face(actor,{x:200,y:500});const reverse=game.muzzle(actor);assert.ok(reverse.x<actor.x-10);
});
test('sprite animation time crosses native frame boundaries without skipping the attack recovery',()=>{
 const meta={durations:[4,6,2,2,2],hitFrame:2};
 assert.equal(animationFrame(meta,3.9),0);assert.equal(animationFrame(meta,4),1);assert.equal(animationFrame(meta,10),2);
 assert.equal(animationFrame(meta,20,{loop:false}),4);assert.equal(animationFrame(meta,16),0);
 const phases=Array.from({length:61},(_,i)=>attackPoseProgress(meta,i/60,1,.3));
 assert.ok(phases.every((v,i)=>!i||v>=phases[i-1]));assert.ok(phases.at(-1)>.99);
});
test('visual interpolation survives rebuilt snapshots, keeps attack time monotonic and resets teleports',()=>{
 const renderer=Object.assign(Object.create(Renderer.prototype),{visualActors:new Map(),visualProjectiles:new Map(),frameActors:new Map()});
 const actor={id:4,x:100,y:500,dx:0,dy:-1,attackSeq:1,attack:.6};renderer.visualActor(actor,1/60);
 const first=renderer.visualActor({...actor,x:110},1/60);assert.ok(first.x>100&&first.x<110);
 const second=renderer.visualActor({...actor,x:110,attack:.59},1/60);assert.ok(second.x>first.x);assert.ok(second.attack<first.attack);
 assert.equal(renderer.visualActor({...actor,x:300},1/60).x,300);renderer.resetVisuals();assert.equal(renderer.visualActors.size,0);
});
test('mouth attachments and projectile identities survive online serialization and perspective',()=>{
 const game=new Game({seed:25});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);
 const actor=game.spawn('squirtle',0,300,500,0),target=game.spawn('snorlax',1,300,420,0);target.card={...target.card,speed:0,damage:0};
 game.attack(actor,target);for(let i=0;i<12;i++)game.step(1/30);
 assert.ok(game.projectiles.length);const id=game.projectiles[0].id;assert.equal(typeof id,'string');
 const restored=unpackGame(perspective(packGame(game),1));assert.equal(restored.projectiles[0].id,id);
 const event=packEvent({type:'flame',from:game.muzzle(actor),to:{x:target.x,y:target.y-15},sourceId:actor.id,targetId:target.id});
 assert.equal(perspective(event,1).sourceId,actor.id);assert.equal(perspective(event,1).targetId,target.id);
});
test('airborne movement uses changing original poses instead of a repeated charge frame',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)));
 for(const key of['charizard','pidgeot','scyther','dragonite','salamence']){const card=CARDS[key],meta=manifest[card.id][card.moveAnim];assert.ok(meta);assert.ok(new Set(card.moveFrames).size>=4);assert.ok(card.moveFrames.every(frame=>frame>=0&&frame<meta.durations.length));}
});

test('full flight cycles continue through attack, hurt, idle and rebuilt online actors',()=>{
 for(const key of['charizard','dragonite','pidgeot','lugia','altaria','flygon']){
  const game=new Game({seed:22}),unit=game.spawn(key,0,300,500,0),seen=new Set();
  for(let i=0;i<240;i++){
   const time=i/120,baseline=flightPose(unit,time);
   const attack=flightPose({...unit,moving:false,attack:.8,hit:.2,attackSeq:3},time);
   assert.equal(attack.frame,baseline.frame);assert.equal(attack.key,baseline.key);
   seen.add(baseline.frame);
   assert.ok(baseline.sx>=0&&baseline.sx+baseline.width<=baseline.columns*baseline.width);
   assert.ok(baseline.frame<baseline.frames);
  }
  assert.ok(seen.size>=40,key+' needs a complete wing cycle');
  const height=flightPose(unit,0).healthHeight;
  for(let direction=0;direction<8;direction++){
   const angle=(2-direction)*Math.PI/4,turned={...unit,dx:Math.cos(angle),dy:Math.sin(angle)};
   assert.equal(flightPose(turned,1).healthHeight,height,'turning must not jump the health bar');
   assert.equal(flightPose(turned,0,true).frame,flightPose(turned,120,true).frame);
  }
 }
});

test('flight raster frames are actually drawn during attacks instead of falling back to the rigid shoot pose',()=>{
 const unit={id:7,card:CARDS.charizard,x:300,y:500,dx:0,dy:-1,attack:.7,attackDuration:.95,hit:.2,moving:false,preview:true};
 const images=new Map(flightSheets(6).map(sheet=>[sheet.key,{}])),draws=[],ctx=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>{if(k==='drawImage')draws.push(args)}),set:(o,k,v)=>(o[k]=v,true)});
 const renderer=Object.assign(Object.create(Renderer.prototype),{sprites:images,metadata:{},speciesLoads:new Map([[6,Promise.resolve()]]),anchors:new Map(),bodyHeights:new Map(),reduced:false,verticalScale:1});
 for(let i=0;i<120;i++){renderer.t=i/60;renderer.sprite(ctx,unit,true);}
 assert.equal(draws.length,120,'one opaque original pose per render');
 assert.ok(new Set(draws.map(args=>args[1]+':'+args[2])).size>=40);
 assert.ok(draws.every(args=>[...images.values()].includes(args[0])));
});

test('flight attacks use the visible mouth or alternating claws and mirror with the raster',()=>{
 const actor={id:7,card:CARDS.charizard,x:300,y:500,dx:-1,dy:0};
 const left=flightEmission(actor,flightPose(actor,.3)),rightActor={...actor,dx:1},right=flightEmission(rightActor,flightPose(rightActor,.3));
 assert.ok(left.x<actor.x&&right.x>actor.x);assert.equal(left.y,right.y);
 assert.ok(Math.abs(actor.x-left.x-(right.x-actor.x))<1e-6);
 const dragon={...actor,card:CARDS.dragonite},pose=flightPose(dragon,.4);
 const first=flightEmission(dragon,pose,'hands',0),second=flightEmission(dragon,pose,'hands',1);
 assert.notEqual(first.x,second.x);assert.ok(first.y>flightEmission(dragon,pose).y);
});

test('projectiles from new flight sprites launch at the visible mouth',()=>{
 const game=new Game({seed:36}),actor=game.spawn('lugia',0,300,500,0),target=game.spawn('snorlax',1,300,400,0);game.face(actor,target);
 const native=game.muzzle(actor),calls=[],renderer=Object.assign(Object.create(Renderer.prototype),{sprites:new Map(flightSheets(249).map(sheet=>[sheet.key,{}])),frameActors:new Map([[actor.id,actor],[target.id,target]]),visualProjectiles:new Map(),t:.4,drawDt:1/60,verticalScale:1,reduced:false,combatArt:(_,name,x,y)=>calls.push({name,x,y})});
 renderer.projectile({}, {id:'flight-launch',sourceId:actor.id,target,style:'hydro',x:native.x,y:native.y,startX:native.x,startY:native.y,totalDistance:100,travelled:0});
 const visible=renderer.visualEmission(actor);assert.equal(calls.length,1);assert.equal(calls[0].x,visible.x);assert.equal(calls[0].y,visible.y);
 assert.notDeepEqual(visible,native,'the new raster has its own mouth attachment');
});

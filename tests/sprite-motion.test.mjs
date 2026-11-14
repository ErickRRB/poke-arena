import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,CARDS} from '../dist/engine.js';
import {SPRITE_GEOMETRY} from '../dist/sprite-geometry.js';
import {emissionPoint,animationFrame,attackPoseProgress} from '../dist/sprite-motion.js';
import {Renderer} from '../dist/render.js';
import {combatVisual,projectileVisual,fireballVisual} from '../dist/combat-visuals.js';
import {POKEMON_SILHOUETTES} from '../dist/pokemon-silhouettes.js';
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
 for(const key of['charizard','pidgeot','scyther','dragonite','salamence']){const card=CARDS[key],meta=manifest[card.id][card.moveAnim];assert.ok(meta);assert.ok(new Set(card.moveFrames).size>=3);assert.ok(card.moveFrames.every(frame=>frame>=0&&frame<meta.durations.length));}
});

test('every Pokemon uses the matching original view for all eight directions, including attacks',()=>{
 const metadata=JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)));
 const draws=[],ctx=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>{if(k==='drawImage')draws.push(args)}),set:(o,k,v)=>(o[k]=v,true)});
 const sprites=new Map(Object.entries(metadata).flatMap(([id,animations])=>Object.keys(animations).map(name=>[id+'-'+name,{height:animations[name].height*8}])));
 const renderer=Object.assign(Object.create(Renderer.prototype),{metadata,sprites,speciesLoads:new Map(Object.keys(metadata).map(id=>[Number(id),Promise.resolve()])),anchors:new Map(),bodyHeights:new Map(),reduced:false,verticalScale:1,t:.35,platform(){}});
 for(const [key,card] of Object.entries(CARDS).filter(([,c])=>!c.spell)){
  for(let direction=0;direction<8;direction++)for(const attacking of[false,true]){
   const angle=(2-direction)*Math.PI/4,unit={id:8,key,card,x:300,y:500,dx:Math.cos(angle),dy:Math.sin(angle),attack:attacking?card.attackDuration*.6:0,attackDuration:card.attackDuration,attackWindup:card.windup,moving:true,preview:true};
   draws.length=0;renderer.sprite(ctx,unit,true);
   const animation=attacking?card.attackAnim:card.moveAnim||'Walk',meta=metadata[card.id][animation];
   assert.ok(draws.length,key);const main=draws.at(-1);
   assert.equal(main[0],sprites.get(card.id+'-'+animation),key+' original art');
   assert.equal(main[2],direction*meta.height,key+' facing '+direction);
   if(card.flying&&!attacking){
    renderer.sprite(ctx,{...unit,moving:false,hit:.15},true);
    assert.deepEqual(draws.at(-1).slice(0,5),main.slice(0,5),key+' flap phase must continue while idle or hurt');
   }
  }
 }
});

test('projectiles, contact effects and beams fit every individual Pokemon silhouette',()=>{
 for(const [key,card] of Object.entries(CARDS).filter(([,c])=>!c.spell)){
  assert.ok(POKEMON_SILHOUETTES[card.id],key+' measured silhouette');
  const v=combatVisual(card),areaSize=card.range>=50&&card.splash?Math.min(34,card.splash*.45):0;assert.ok(v.projectile>=8&&v.projectile<=Math.max(v.body*.55,areaSize),key+' projectile');
  assert.ok(v.impact<=v.body*.8,key+' contact effect');assert.ok(v.beam<v.body*.25,key+' beam');
 }
 assert.ok(combatVisual(CARDS.squirtle).projectile<combatVisual(CARDS.blastoise).projectile);
 assert.ok(combatVisual(CARDS.raltsToken).projectile<combatVisual(CARDS.gardevoir).projectile);
 assert.equal(projectileVisual('hydro').name,'hydroShot','a moving shot must use the original water orb');
 assert.equal(projectileVisual('hydro').frame,0,'do not loop water impact disappearance during flight');
 assert.equal(projectileVisual('song').name,'songShot','singing must use notes');
 assert.ok(projectileVisual('bubble').frames.every(frame=>frame>=2&&frame<=4));
 assert.ok(projectileVisual('shadow').fps<=8);assert.equal(projectileVisual('bubble',100,true).age,0);
});

test('native projectile launch uses its saved mouth position and does not jump after the source turns',()=>{
 const game=new Game({seed:36}),actor=game.spawn('lugia',0,300,500,0),target=game.spawn('snorlax',1,300,400,0);game.face(actor,target);
 const native=game.muzzle(actor),calls=[],renderer=Object.assign(Object.create(Renderer.prototype),{frameActors:new Map([[actor.id,actor],[target.id,target]]),visualProjectiles:new Map(),t:.4,drawDt:1/60,verticalScale:1,reduced:false,combatArt:(_,name,x,y,size)=>calls.push({name,x,y,size})});
 renderer.projectile(new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)}), {id:'native-launch',key:'lugia',sourceId:actor.id,target,style:'hydro',x:native.x,y:native.y,startX:native.x,startY:native.y,totalDistance:100,travelled:0});
 assert.equal(calls[0].x,native.x);assert.equal(calls[0].y,native.y);assert.equal(calls[0].size,combatVisual(actor.card).projectile);
});

test('arched projectiles face up while rising and down while descending, unlike a flat dart',()=>{
 const sample=(travelled,arc)=>{const calls=[],renderer=Object.assign(Object.create(Renderer.prototype),{frameActors:new Map(),visualProjectiles:new Map(),t:.5,drawDt:1/60,verticalScale:1,reduced:true,combatArt:(c,art,x,y,size,angle)=>calls.push({x,y,angle})}),target={id:2,x:400,y:400,card:CARDS.grimer};
  renderer.projectile(new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)}),{id:'arc',key:'roselia',style:'leaf',x:200+travelled,y:400,startX:200,startY:400,totalDistance:200,travelled,arc,target});return calls[0];};
 const rising=sample(50,100),falling=sample(150,100),dart=sample(50,0);assert.ok(rising.angle<-.5);assert.ok(falling.angle>.5);assert.ok(rising.y<dart.y-60);assert.ok(Math.abs(dart.angle)<.1);
});

test('fireball has a continuous arc and tangent, a spaced trail, and reaches the real impact position',()=>{
 const spell={x:160,y:240,startX:300,startY:700,flightTime:1.2};let prior;
 for(let frame=0;frame<=120;frame++){
  const pose=fireballVisual({...spell,flightElapsed:frame/100});
  if(prior)assert.ok(Math.hypot(pose.point.x-prior.x,pose.point.y-prior.y)<12,'smooth flight');prior=pose.point;
  assert.ok(pose.tail.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.ok(Number.isFinite(pose.angle));
 }
 assert.ok(Math.hypot(prior.x-spell.x,prior.y-spell.y)<1e-9);
 const calls=[],renderer=Object.assign(Object.create(Renderer.prototype),{verticalScale:1,reduced:false,combatArt:(_,name,x,y,size,angle,h,options)=>calls.push({name,size,options})}),ctx={save(){},restore(){}};
 renderer.fireball(ctx,{...spell,flightElapsed:.6});const head=calls.at(-1);
 assert.equal(head.name,'fireOrb');assert.ok(head.size>=56);assert.equal(head.options.frame,1,'steady original orb instead of cycling ignition/disappearance frames');
 assert.deepEqual(calls.slice(0,3).map(c=>c.name),['fireTrail','fireTrail','fireTrail']);
});

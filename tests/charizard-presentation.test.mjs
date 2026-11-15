import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';
import{CARDS}from'../dist/engine.js';import{attackVisualProfile,combatVisual}from'../dist/combat-visuals.js';
import{attackAnimationFrame,emissionPoint}from'../dist/sprite-motion.js';
import{Renderer}from'../dist/render.js';

test('Charizard restores the full preparation/contact/recovery without changing its native release or muzzle',()=>{
 const card=CARDS.charizard,saved=JSON.stringify(card),shown=attackVisualProfile(card),meta=JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)))[6].Shoot;
 const frames=Array.from({length:60},(_,i)=>attackAnimationFrame(meta,card.attackDuration*i/60,card.attackDuration,card.windup,shown.attackFrames,shown));
 assert.ok(frames.includes(0)&&frames.includes(1)&&frames.includes(10));
 assert.equal(attackAnimationFrame(meta,card.windup,card.attackDuration,card.windup,shown.attackFrames,shown),2);
 for(let direction=0;direction<8;direction++){
  const a=(2-direction)*Math.PI/4,actor={id:10,x:300,y:500,card,dx:Math.cos(a),dy:Math.sin(a),attackDuration:card.attackDuration,attackWindup:card.windup,attack:card.attackDuration-card.windup};
  assert.deepEqual(emissionPoint({...actor,card:shown}),emissionPoint(actor));
 }
 assert.equal(JSON.stringify(card),saved);assert.ok(combatVisual(card).projectile>=26);
 assert.equal(attackVisualProfile(CARDS.nuzleaf),CARDS.nuzleaf);
});

test('the visible breath finishes its gesture after the physical recovery, without holding the game actor',()=>{
 const actor={id:7,x:300,y:500,dx:0,dy:-1,hp:100,card:CARDS.charizard,attackSeq:2,attackDuration:.46,attackWindup:.3,attack:.06,moving:false};
 const renderer=Object.assign(Object.create(Renderer.prototype),{t:1,visualActors:new Map()});
 renderer.visualActor(actor,0);actor.attack=0;const saved=JSON.stringify(actor);
 const shown=renderer.visualActor(actor,1/60);assert.ok(shown.attack>0);assert.equal(shown.attackDuration,.72);assert.equal(JSON.stringify(actor),saved);
 const paused=renderer.visualActor(actor,0);assert.equal(renderer.visualActor(actor,0).attack,paused.attack);
 actor.stun=.5;assert.equal(renderer.visualActor(actor,1/60).attack,0);
});

test('Charizard fire uses the shot clock and retains its discharge at immediate contact',()=>{
 const actor={id:7,key:'charizard',x:300,y:550,dx:0,dy:-1,hp:100,card:CARDS.charizard,attackSeq:2,attackDuration:.46,attackWindup:.3,attack:.16};
 const target={id:8,x:300,y:460,card:CARDS.snorlax,hp:1e6},draws=[],ctx=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const renderer=Object.assign(Object.create(Renderer.prototype),{t:0,reduced:false,drawDt:1/60,verticalScale:1,frameActors:new Map([[7,actor],[8,target]]),visualProjectiles:new Map(),effects:[],particles:[],combatArt(...args){draws.push(args);}});
 const from=emissionPoint(actor),shot={id:'7:2:0',key:'charizard',sourceId:7,style:'ember',x:300,y:534,startX:300,startY:538,liftX:from.x-300,liftY:from.y-538,groundPath:true,endLiftY:-15,target,totalDistance:78,travelled:4,speed:240,arc:42};
 for(let i=0;i<18;i++){
  shot.travelled=4+i*4;shot.y=538-shot.travelled;renderer.t=80+i/60;
  const saved=JSON.stringify(shot);renderer.projectile(ctx,shot);assert.equal(JSON.stringify(shot),saved);
 }
 const heads=draws.filter(args=>args[1]==='emberShot');assert.equal(heads.length,36);
 assert.ok(new Set(heads.map(args=>args[7].frame)).size>1,'Technical frame progression only; visual quality requires the natural-loop review.');
 const last=heads.slice(-2).map(args=>args[7].frame);renderer.drawDt=0;renderer.t=999;draws.length=0;renderer.projectile(ctx,shot);
 assert.deepEqual(draws.filter(args=>args[1]==='emberShot').map(args=>args[7].frame),last,'Pause and unrelated global phase do not advance the material.');
 renderer.onEvent({type:'attackRelease',attacker:actor,target,key:'charizard',from,to:target,style:'ember',shot:0});
 const discharge=renderer.effects.find(effect=>effect.kind==='muzzleFlame');assert.ok(discharge);
 renderer.onEvent({type:'hit',key:'charizard',sourceId:7,style:'ember',radius:36,x:300,y:460});assert.equal(discharge.life,discharge.max);
});

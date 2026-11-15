import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS} from '../dist/engine.js?v=34';
import {SPRITE_GEOMETRY} from '../dist/sprite-geometry.js';
import {attackAnimationFrame,emissionPoint,movementAnchor,emitterPart} from '../dist/sprite-motion.js?v=26';
import {dashPreparation} from '../dist/combat-visuals.js';
import {Renderer} from '../dist/render.js';

const metadata=JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)));
test('Sableye dash impact with zero preparation starts on its native contact, with recovery still visible',()=>{
  const profile=CARDS.sableye,meta=metadata[profile.id][profile.attackAnim],duration=.4;
  assert.equal(attackAnimationFrame(meta,0,duration,0,profile.attackFrames,profile),meta.hitFrame);
  assert.ok(attackAnimationFrame(meta,duration-1e-4,duration,0,profile.attackFrames,profile)>meta.hitFrame,'the zero windup must retain its recovery');
  for(let direction=0;direction<8;direction++){
    const angle=(2-direction)*Math.PI/4,actor={id:81,key:'sableye',card:profile,team:0,x:300,y:600,dx:Math.cos(angle),dy:Math.sin(angle),attack:duration,attackDuration:duration,attackWindup:0,attackAnim:profile.attackAnim};
    const points=SPRITE_GEOMETRY[profile.id][profile.attackAnim].points[direction][meta.hitFrame],scale=profile.scale;
    const anchor=profile.movementAnchor==='body'?movementAnchor(profile.id,profile.attackAnim,direction,meta.hitFrame,{x:points[0],y:points[1]}):{x:points[0],y:points[1]};
    assert.equal(emitterPart(profile),'head');
    const expected={x:actor.x+(points[4]-anchor.x+actor.dx*2)*scale,y:actor.y+(points[5]-anchor.y+actor.dy*2)*scale};
    const actual=emissionPoint(actor);
    assert.ok(Math.hypot(expected.x-actual.x,expected.y-actual.y)<1e-7,`direction${direction}: release must use the contact marker`);
  }
});

test('Sableye visibly coils before travel, while the physical body and dash clock stay unchanged',()=>{
  const unit={id:1,card:CARDS.sableye,hp:100,x:300,y:600,dx:0,dy:-1,dash:{phase:'windup',elapsed:.1}};
  const first=dashPreparation(unit);unit.dash.elapsed=.6;const saved=JSON.stringify(unit),late=dashPreparation(unit);
  assert.notEqual(first.frame,late.frame);assert.ok(late.scaleY<first.scaleY-.1);assert.ok(late.lean>first.lean);assert.equal(JSON.stringify(unit),saved);
  unit.dash.phase='travel';assert.equal(dashPreparation(unit),null);
  unit.dash=null;assert.equal(dashPreparation(unit),null);
  unit.dash={phase:'windup',elapsed:.5};unit.stun=.2;assert.equal(dashPreparation(unit),null);
});

test('dash preparation advances at display cadence between 15Hz packets and freezes in place',()=>{
  const renderer=Object.assign(Object.create(Renderer.prototype),{visualActors:new Map(),t:0}),unit={id:1,card:CARDS.sableye,hp:100,x:300,y:600,dx:0,dy:-1,attackSeq:1,attack:.8,attackDuration:.8,attackWindup:.8,dash:{phase:'windup',elapsed:0}};
  const phases=[];
  for(let i=0;i<28;i++){
    if(i%4===0){unit.dash.elapsed=i/60;unit.attack=.8-i/60;}
    const saved=JSON.stringify(unit),shown=renderer.visualActor(unit,1/60);phases.push(shown.dash.elapsed);assert.equal(JSON.stringify(unit),saved);
  }
  assert.ok(phases.slice(1).every((phase,i)=>phase>phases[i]));
  const paused=renderer.visualActor(unit,0);assert.equal(renderer.visualActor(unit,0).dash.elapsed,paused.dash.elapsed);
  unit.freeze=.5;assert.equal(renderer.visualActor(unit,1/60).dash.elapsed,paused.dash.elapsed);
  const reducedA=dashPreparation(unit,true);unit.dash.elapsed=.7;const reducedB=dashPreparation(unit,true);
  for(const key of['frame','scaleX','scaleY','lean','energy'])assert.equal(reducedA[key],reducedB[key],key+' remains still with reduced motion');
});

test('a pending dash remains in its preparation raster when the attack clock reaches zero before the next packet',()=>{
  const draws=[],attack={},idle={},meta=metadata[302],ctx=new Proxy({globalAlpha:1,drawImage(...args){draws.push(args);}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const renderer=Object.assign(Object.create(Renderer.prototype),{t:1,reduced:false,verticalScale:1,metadata:{302:meta},sprites:new Map([['302-Attack',attack],['302-Idle',idle]]),anchors:new Map(),bodyHeights:new Map([[302,24]]),speciesLoads:new Map([[302,true]]),dashWindup(){},flightWings:{clock:()=>0,frame:()=>null}});
  const unit={id:7,card:CARDS.sableye,x:300,y:600,dx:0,dy:-1,hp:100,attack:0,attackDuration:.8,attackWindup:.8,attackSeq:2,dash:{phase:'windup',elapsed:.8}};
  const saved=JSON.stringify(unit);renderer.sprite(ctx,unit,true);
  assert.equal(draws.length,1);assert.equal(draws[0][0],attack);assert.equal(draws[0][1],meta.Attack.width*2);assert.equal(JSON.stringify(unit),saved);
});

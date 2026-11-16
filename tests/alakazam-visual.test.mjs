import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {CARDS} from '../dist/engine.js';
import {emissionPoint} from '../dist/sprite-motion.js';

function drawLinear(projectile,travelled){
  let beam,head;
  const renderer={verticalScale:1,reduced:true,t:0,projectilePose:()=>({x:100,y:200,travelled}),battleArt:{beam:(_c,_name,from,to)=>{beam={from,to}}},combatArt:(_c,_name,x,y)=>{head={x,y}}};
  Object.defineProperty(renderer,'frameActors',{get(){throw new Error('linear launch must not consult live actor');}});
  Renderer.prototype.projectile.call(renderer,{},projectile);
  return {beam,head};
}
const shot=(key='alakazam')=>({key,sourceKey:key,linear:true,liftX:5.4192,liftY:-27.096,dx:0,dy:-1,shotRadius:12});
test('native launch vector maps to 1.75 once and converges without actor or projectile mutation',()=>{
  const p=shot(),original=structuredClone(p),a=drawLinear(p,0),far=drawLinear(p,48),ratio=1.75/1.3548;
  assert.ok(Math.abs(a.head.x-(100+p.liftX*ratio))<1e-9);
  assert.ok(Math.abs(a.head.y-(200+p.liftY*ratio))<1e-9);
  assert.deepEqual(far.head,{x:100+p.liftX,y:200+p.liftY});
  assert.deepEqual(p,original);
  assert.deepEqual(drawLinear(structuredClone(p),12),drawLinear(structuredClone(p),12));
});
test('other linear sources and mismatched identities retain native path',()=>{
  for(const p of [shot('espeon'),{...shot(),sourceKey:'ditto'}]){
    const r=drawLinear(p,12);assert.deepEqual(r.head,{x:100+p.liftX,y:200+p.liftY});
  }
});
test('visual hand uses the fixed size while engine emission retains native scale',()=>{
  const actor={id:7,key:'alakazam',card:CARDS.alakazam,scale:CARDS.alakazam.scale,x:168,y:377,dx:0,dy:-1,attack:.16,attackDuration:.9,attackWindup:.7,attackAnim:'Shoot'};
  const native=emissionPoint(actor,0,0),expected=emissionPoint({...actor,scale:1.75},0,0);
  const visual=Renderer.prototype.visualEmission.call({reduced:true,t:0,verticalScale:1},actor,0);
  assert.deepEqual(visual,expected);assert.deepEqual(emissionPoint(actor,0,0),native);assert.equal(actor.scale,1.3548);
});

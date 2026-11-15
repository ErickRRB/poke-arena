import {test} from 'node:test';import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {earthquakePhase,whirlpoolPhase} from '../dist/field-motion.js';

test('field display advances between 15Hz packets without changing or extending the physical field',()=>{
 const renderer=Object.assign(Object.create(Renderer.prototype),{t:0}),field={id:17,key:'whirlpool',duration:1.05,life:1.05};
 const ages=[];
 for(let i=0;i<56;i++){
  if(i%4===0)field.life=1.05-i/60;
  const saved=JSON.stringify(field);renderer.t=i/60;
  const visual=renderer.visualField(field,1/60);ages.push(visual.visualAge);
  assert.equal(JSON.stringify(field),saved);assert.ok(visual.life<=field.life);assert.ok(visual.visualAge<=1.05-field.life+1/15+1e-9);
 }
 assert.ok(ages.slice(1).every((age,i)=>age>ages[i]));
 const paused=renderer.visualField(field,0);assert.equal(renderer.visualField(field,0).visualAge,paused.visualAge);
 renderer.resetVisuals();assert.equal(renderer.visualFields.size,0);
});

test('the vortex has a visible active body for the full physical lifetime and a short final fade',()=>{
 for(const age of[0,.2,.5,.85]){
  const state=whirlpoolPhase({life:1.05-age},age);
  assert.ok(state.frame>=0&&state.frame<20);assert.equal(state.opacity,1);
 }
 const ending=whirlpoolPhase({life:.06},.99);assert.ok(ending.frame>=0&&ending.frame<20);assert.ok(ending.opacity>0&&ending.opacity<1);
 assert.equal(whirlpoolPhase({life:0},1.05).opacity,0);
 assert.equal(whirlpoolPhase({life:.8},.25,true).frame,whirlpoolPhase({life:.4},.65,true).frame);
});

test('earthquake damage beats and reduced motion share one physical clock',()=>{
 const before=earthquakePhase({fieldTick:1},.99),hit=earthquakePhase({fieldTick:1},1.01);
 assert.ok(hit.pulse>before.pulse);assert.equal(earthquakePhase({},1.2,true).jitter,0);
});

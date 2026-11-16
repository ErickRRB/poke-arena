import {test} from 'node:test';import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {earthquakePhase,whirlpoolPhase,nightmareFrame,earthquakeFissures} from '../dist/field-motion.js';

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

test('Nightmare enters once and never replays the atlas closure or blank frames while active',()=>{
 assert.equal(nightmareFrame(0),0);assert.ok(nightmareFrame(.2)>0&&nightmareFrame(.2)<7);
 for(let age=7/18;age<9;age+=1/60){
  const frame=nightmareFrame(age);assert.ok(frame>=7&&frame<=8,'Active portal stays in full, nonempty native frames.');
  assert.equal(nightmareFrame(age),frame,'The same paused/restored age gives the same phase.');
 }
 for(const age of[0,.5,2,8.9])assert.equal(nightmareFrame(age,true),7);
});

test('earthquake damage beats and reduced motion share one physical clock',()=>{
 const before=earthquakePhase({fieldTick:1},.99),hit=earthquakePhase({fieldTick:1},1.01);
 assert.ok(hit.pulse>before.pulse);assert.equal(earthquakePhase({},1.2,true).jitter,0);
});

test('ground fissures develop inside the physical radius without a perimeter or late regeneration',()=>{
 const radius=84,early=earthquakeFissures(radius,.2),full=earthquakeFissures(radius,1);
 assert.ok(early.some(points=>points.length>1));assert.ok(early.some(points=>points.length===0));
 assert.ok(full.every(points=>points.length>1));
 for(const points of full)for(const[x,y]of points)assert.ok(Math.hypot(x,y)<radius);
 // A single growing network persists across damage pulses rather than drawing
 // an expanding range ring or restarting the cracks each second.
 assert.deepEqual(earthquakeFissures(radius,earthquakePhase({},.7).growth),full);
 assert.deepEqual(earthquakeFissures(radius,earthquakePhase({},1.05).growth),full);
 assert.deepEqual(earthquakeFissures(radius,earthquakePhase({},2.4).growth),full);
});

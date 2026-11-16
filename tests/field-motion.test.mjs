import {test} from 'node:test';import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {Game} from '../dist/engine.js';
import {packGame,perspective,unpackGame} from '../dist/snapshot.js';
import {earthquakePhase,whirlpoolPhase,nightmareFrame,earthquakeFissures,rockSuspension} from '../dist/field-motion.js';

test('active rocks remain suspended with bounded continuous height and a still reduced-motion pose',()=>{
 for(let index=0;index<9;index++){
  const heights=Array.from({length:361},(_,frame)=>rockSuspension(frame/60,index));
  assert.ok(heights.every(height=>height>=15&&height<=25));
  assert.ok(heights.slice(1).every((height,i)=>Math.abs(height-heights[i])<.22));
  assert.ok(Math.max(...heights)-Math.min(...heights)>9.9,'The ongoing movement is distinct from a nearly static entry pose.');
  for(const age of[0,.3,2,5.8])assert.equal(rockSuspension(age,index,true),20);
 }
 const field={id:31,key:'stealthRock',duration:6,life:3.75};
 const paused=Object.assign(Object.create(Renderer.prototype),{t:2.25}),restored=Object.assign(Object.create(Renderer.prototype),{t:0});
 const first=paused.visualField(field,0),again=paused.visualField(field,0),snapshot=restored.visualField(structuredClone(field),0);
 assert.equal(first.visualAge,again.visualAge);assert.equal(first.visualAge,snapshot.visualAge);
 for(let index=0;index<9;index++)assert.equal(rockSuspension(first.visualAge,index),rockSuspension(snapshot.visualAge,index));
 assert.deepEqual(field,{id:31,key:'stealthRock',duration:6,life:3.75});
});

test('a real in-progress field restores the same rock phase from either server perspective',()=>{
 const game=new Game({tutorial:true});game.start();game.aiEnabled=false;game.hands[0][0]='stealthRock';game.energy[0]=10;
 assert.ok(game.deploy(0,0,288,508).ok);for(let i=0;i<90;i++)game.step(1/30);
 const physical=JSON.stringify(game.fields),source=game.fields[0];assert.ok(source.life>0&&source.life<source.duration);
 const renderer=Object.assign(Object.create(Renderer.prototype),{t:0}),age=renderer.visualField(source,0).visualAge;
 for(const team of[0,1]){
  const restored=unpackGame(perspective(packGame(game),team)),r=Object.assign(Object.create(Renderer.prototype),{t:0});
  const field=restored.fields[0],phase=r.visualField(field,0).visualAge;
  assert.equal(field.id,source.id);assert.equal(field.radius,source.radius);assert.equal(phase,age);
  for(let index=0;index<9;index++)assert.equal(rockSuspension(phase,index),rockSuspension(age,index));
 }
 assert.equal(JSON.stringify(game.fields),physical);
});

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

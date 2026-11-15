import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/engine.js';
import {Renderer} from '../dist/render.js';
import {rollingFirePose} from '../dist/fire-material.js';

const context=()=>new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
for(const hz of [15,30,60])for(const team of [0,1])test(`rolling presentation stays on the native path at ${hz}Hz, team${team}`,()=>{
 const spell={key:'log',card:CARDS.log,team,x:300,y:team?280:520,startY:team?280:520,travelRemaining:CARDS.log.travelDistance};
 let previous;const points=[];
 for(let i=0;i<165;i++){
  const authority=Math.floor(i*hz/60)/hz;spell.travelRemaining=Math.max(0,spell.card.travelDistance-authority*spell.card.travelSpeed);
  const saved=JSON.stringify(spell),pose=rollingFirePose(spell,previous,1/60);assert.equal(JSON.stringify(spell),saved);
  assert.ok(pose.travelled>=0&&pose.travelled<=spell.card.travelDistance);
  if(previous)assert.ok(pose.travelled>=previous.travelled-1e-8);
  assert.ok(pose.elapsed<=pose.logical+1/15+1e-8,'Display prediction is bounded to one room interval.');
  assert.ok(Math.abs(pose.y-spell.startY)<=spell.card.travelDistance+1e-8);points.push(pose.y);previous=pose;
 }
 assert.ok(Math.abs(previous.y-previous.endY)<1e-8);
 const steps=points.slice(1,140).map((y,i)=>Math.abs(y-points[i]));
 assert.ok(steps.filter(step=>step>.01).length>steps.length*.95,'Technical packet continuity, not a perceptual fluency verdict.');
 const held=rollingFirePose(spell,previous,0);assert.deepEqual(held,previous,'Paused presentation retains its own material and roll clocks.');
});

test('two rolling casts have independent clocks and a fresh cast does not inherit the old spin',()=>{
 const spell={card:CARDS.log,team:0,x:300,y:520,startY:520,travelRemaining:100};
 const old=rollingFirePose(spell,null,0),fresh=rollingFirePose({...spell,travelRemaining:CARDS.log.travelDistance},null,0);
 assert.ok(old.age>0);assert.equal(fresh.age,0);assert.equal(Math.abs(fresh.spin),0);
});

test('wheel extinction is emitted once, only after disappearance, and freezes during pause',()=>{
 const c=context(),draws=[],r=Object.assign(Object.create(Renderer.prototype),{t:1,frameActors:new Map(),visualFlights:new Map(),effects:[],reduced:false,fireWheel:(_,pose,reduced,opacity)=>draws.push({pose:{...pose},opacity}),combatArt(){}});
 r.visualFlights.set('rollingFire:1',{kind:'rollingFire',at:1,x:300,y:300,endY:277.6,spin:-7,age:2.5,direction:-1});
 r.drawEffects(c,0);assert.equal(r.effects.length,0);
 r.t+=1/60;r.drawEffects(c,1/60);assert.equal(r.effects.filter(e=>e.kind==='rollingFireEnd').length,1);assert.equal(draws[0].pose.y,277.6);
 const before=JSON.stringify(r.effects);r.drawEffects(c,0);r.drawEffects(c,0);assert.equal(JSON.stringify(r.effects),before);
 for(let i=0;i<20;i++){r.t+=1/60;r.drawEffects(c,1/60);}assert.equal(r.effects.length,0);
});

test('a rolling spell hit has one contact cue and does not mutate the event',()=>{
 const r=Object.assign(Object.create(Renderer.prototype),{effects:[],particles:[]}),event={type:'hit',key:'log',style:'rock',sourceId:9,targetId:10,x:300,y:410},before=JSON.stringify(event);
 r.onEvent(event);assert.equal(JSON.stringify(event),before);assert.equal(r.effects.length,1);assert.equal(r.effects[0].kind,'rollingFireHit');
});

test('Fireball material follows its cast clock; pause and reduced motion preserve the native spell',()=>{
 const seen=[],r=Object.assign(Object.create(Renderer.prototype),{t:500,drawDt:1/60,reduced:false,verticalScale:1,effects:[],combatArt(){},livingFire:(c,x,y,size,angle,age)=>seen.push({x,y,size,age})}),c=context();
 const spell={key:'fireball',card:CARDS.fireball,visualId:1,team:0,startX:300,startY:712,x:300,y:268,flightTime:2,flightElapsed:.5,delay:0};
 const saved=JSON.stringify(spell);r.spellFlight(c,spell);assert.equal(seen[0].age,.5);
 r.t=999;r.drawDt=0;r.spellFlight(c,spell);assert.deepEqual(seen[1],seen[0]);
 r.reduced=true;r.spellFlight(c,spell);assert.equal(seen[2].age,0);assert.equal(JSON.stringify(spell),saved);
 r.reduced=false;r.spellFlight(c,{...spell,visualId:2,flightElapsed:0});assert.equal(seen[3].age,0,'A new cast starts at its own phase.');
});

test('rolling extinction preserves the actual cast footprint instead of using the current catalogue width',()=>{
 const card={...CARDS.log,splash:CARDS.log.splash*.6},spell={card,team:0,x:288,y:508,startY:508,travelRemaining:1};
 const pose=rollingFirePose(spell,null,0),painted=[],r=Object.assign(Object.create(Renderer.prototype),{t:2,frameActors:new Map(),visualFlights:new Map([['rollingFire:9',{...pose,at:1}]]),effects:[],reduced:false,fireWheel:(_c,p,_reduced,opacity)=>painted.push({halfWidth:p.halfWidth,opacity}),combatArt(){}});
 r.drawEffects(context(),.016);
 assert.equal(r.effects[0].halfWidth,card.splash);
 assert.equal(painted[0].halfWidth,card.splash);
 assert.ok(painted[0].opacity<=1,'Only the disappeared cast enters the extinction pass.');
});

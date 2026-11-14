import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {CARDS} from '../dist/engine.js';
import {BattleArt} from '../dist/battle-art.js';
import {BATTLE_ASSETS} from '../dist/assets/battle/manifest.js';
import {PROJECTILE_BOUNDS} from '../dist/assets/battle/projectile-bounds.js';
import {drawCapsule} from '../dist/capsule-art.js';
for(const hz of[15,30,60])for(const team of[0,1])test(`capsule flight remains continuous at ${hz}Hz authority and 60Hz display, team ${team}`,()=>{
  const points=[],ctx={save(){},restore(){},globalAlpha:1},r=Object.assign(Object.create(Renderer.prototype),{t:0,drawDt:1/60,reduced:false,verticalScale:1,capsule:(c,x,y)=>points.push({x,y})});
  const spell={visualId:1,key:'sneaselAmbush',card:CARDS.sneaselAmbush,team,startX:300,startY:team?94:706,x:team?442:158,y:team?628:172,flightTime:3,flightElapsed:0,delay:0};
  let previous=0;
  for(let i=0;i<150;i++){
    spell.flightElapsed=Math.floor((i+1)*hz/60)/hz;if(i===81)spell.flightElapsed-=.015;
    r.t=i/60;r.fireball(ctx,spell);const pose=r.visualFlights.get(1);assert.ok(pose.elapsed>=previous-1e-8);assert.ok(pose.elapsed<spell.flightTime);previous=pose.elapsed;
  }
  const steps=points.slice(10).map((p,i)=>i?Math.hypot(p.x-points[i+9].x,p.y-points[i+9].y):0).slice(1);
  assert.ok(steps.filter(n=>n>.001).length>=steps.length*.96,`${steps.filter(n=>n>.001).length}/${steps.length} progressing frames`);
  const mean=steps.reduce((a,b)=>a+b,0)/steps.length;assert.ok(Math.max(...steps)/mean<1.8,'a packet must not jump the head of the trajectory');
});
test('a delayed capsule has no visible flight and pause does not advance the display clock',()=>{
  const r=Object.assign(Object.create(Renderer.prototype),{t:0,drawDt:1/60,reduced:false,verticalScale:1,capsule(){}}),c={};
  const spell={visualId:7,key:'sneaselAmbush',card:CARDS.sneaselAmbush,team:0,startX:300,startY:706,x:158,y:172,flightTime:3,flightElapsed:.2,delay:.1};
  r.fireball(c,spell);assert.equal(r.visualFlights,undefined);spell.delay=0;r.fireball(c,spell);
  const before=r.visualFlights.get(7).elapsed;r.drawDt=0;for(let i=0;i<10;i++)r.fireball(c,spell);assert.equal(r.visualFlights.get(7).elapsed,before);
});
test('the spherical latch leaves view behind the ball and returns',()=>{
  const circles=[],context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),arc:(...args)=>circles.push(args)},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  for(const [angle,count] of [[0,6],[Math.PI,3],[Math.PI*2,6]]){circles.length=0;drawCapsule(context,0,0,52,angle);assert.equal(circles.length,count);assert.equal(circles[0][2],26);}
});
test('the travelling capsule has a 52-unit visible diameter after trimming native transparent padding',()=>{
  const calls=[],art=new BattleArt(()=>{}),image={};
  art.images.set(BATTLE_ASSETS.pokeball.file,image);
  const context={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage:(...args)=>calls.push(args),globalAlpha:1};
  assert.equal(art.draw(context,'pokeball',100,100,52,52,{trim:true,frame:0}),true);
  const[left,top,right,bottom]=PROJECTILE_BOUNDS.pokeball;
  assert.ok(right-left<BATTLE_ASSETS.pokeball.width,'the source really has transparent padding');
  assert.deepEqual(calls[0].slice(1,5),[left,top,right-left,bottom-top]);
  assert.deepEqual(calls[0].slice(5),[-26,-26,52,52]);
});

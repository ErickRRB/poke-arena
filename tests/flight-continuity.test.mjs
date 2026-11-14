import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {CARDS} from '../dist/engine.js';
import {CapsuleArt,capsulePixels,CAPSULE_FRAME_SIZE} from '../dist/capsule-art.js';
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
test('the red and white hemispheres roll over the surface and return with the latch, instead of keeping a static belt',()=>{
  const front=capsulePixels(0),back=capsulePixels(Math.PI),returned=capsulePixels(Math.PI*2);
  const pixel=(frame,x,y)=>Array.from(frame.data.slice((y*frame.width+x)*4,(y*frame.width+x)*4+3));
  const red=([r,g])=>r>g*1.8,white=([r,g])=>g>r*.8;
  assert.ok(red(pixel(front,32,16)));assert.ok(white(pixel(back,32,16)));
  assert.ok(white(pixel(front,32,48)));assert.ok(red(pixel(back,32,48)));
  assert.notDeepEqual(pixel(front,32,32),pixel(back,32,32));assert.deepEqual(front.data,returned.data);
  assert.equal(front.data[3],0,'Transparent corners keep a spherical silhouette.');
});
test('the travelling material sphere has a 52-unit visible diameter without a planar context rotation',()=>{
  const calls=[],pixels=capsulePixels(.4),occupied=[];
  for(let y=0;y<pixels.height;y++)for(let x=0;x<pixels.width;x++)if(pixels.data[(y*pixels.width+x)*4+3])occupied.push({x,y});
  assert.equal(Math.max(...occupied.map(p=>p.x))-Math.min(...occupied.map(p=>p.x))+1,CAPSULE_FRAME_SIZE);
  assert.equal(Math.max(...occupied.map(p=>p.y))-Math.min(...occupied.map(p=>p.y))+1,CAPSULE_FRAME_SIZE);
  const art={atlas:{},frame:()=>({x:0,y:0})},context={drawImage:(...args)=>calls.push(args)};
  CapsuleArt.prototype.draw.call(art,context,100,100,52,.4,.2);
  assert.deepEqual(calls[0].slice(1,5),[0,0,CAPSULE_FRAME_SIZE,CAPSULE_FRAME_SIZE]);assert.deepEqual(calls[0].slice(5),[74,74,52,52]);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {CARDS} from '../dist/engine.js';

function samples(kind,mirrored){
  const points=[],context=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const renderer=Object.assign(Object.create(Renderer.prototype),{frameActors:new Map(),visualProjectiles:new Map(),t:0,drawDt:1/60,verticalScale:1,reduced:false,battleArt:{beam(){}},combatArt:(c,art,x,y)=>{if(art!=='dust')points.push({x,y});}});
  const startX=mirrored?500:100,target={id:2,x:mirrored?200:400,y:500,card:CARDS.grimer};
  const projectile={id:kind,key:kind==='linear'?'alakazam':'roselia',x:startX,y:500,startX,startY:500,target,sourceId:1,totalDistance:300,travelled:0,speed:kind==='linear'?480:230,style:kind==='rolling'?'rock':kind==='linear'?'psychic':'leaf',dx:mirrored?-1:1,dy:0,arc:kind==='arched'?100:0,rolling:kind==='rolling',linear:kind==='linear'};
  for(let frame=0;frame<48;frame++){
    // Real room snapshots arrive at 15Hz; the renderer is sampled at 60Hz.
    projectile.travelled=Math.floor(frame/4)*projectile.speed/15;projectile.x=startX+projectile.dx*projectile.travelled;renderer.t=frame/60;renderer.projectile(context,projectile);
  }
  const steps=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),active=steps.filter(step=>step>.01),mean=steps.reduce((a,b)=>a+b,0)/steps.length;
  return{active:active.length,ratio:Math.max(...steps)/mean,points};
}
for(const kind of['straight','arched','rolling','linear'])for(const mirrored of[false,true])test(`${kind} projectiles move continuously between 15Hz snapshots, view ${mirrored?2:1}`,()=>{
  const result=samples(kind,mirrored);assert.ok(result.active>=40,`only ${result.active} changing frames`);assert.ok(result.ratio<2.8,`packet-sized jumps: max/mean ${result.ratio.toFixed(2)}`);
  assert.ok(result.points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)));
});

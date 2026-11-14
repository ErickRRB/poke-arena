import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {CARDS} from '../dist/engine.js';
import {Game} from '../dist/engine.js';
import {packGame,unpackGame} from '../dist/snapshot.js';

function samples(kind,mirrored){
  const points=[],context=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const renderer=Object.assign(Object.create(Renderer.prototype),{frameActors:new Map(),visualProjectiles:new Map(),t:0,drawDt:1/60,verticalScale:1,reduced:false,battleArt:{beam(){}},combatArt:(c,art,x,y)=>{if(art!=='dust')points.push({x,y});}});
  const startX=mirrored?500:100,target={id:2,x:mirrored?200:400,y:500,card:CARDS.grimer};
  const projectile={id:kind,key:kind==='linear'?'alakazam':'roselia',x:startX,y:500,startX,startY:500,target,sourceId:1,totalDistance:kind==='linear'?1000:300,travelled:0,speed:kind==='linear'?480:230,style:kind==='rolling'?'rock':kind==='linear'?'psychic':'leaf',dx:mirrored?-1:1,dy:0,arc:kind==='arched'?100:0,rolling:kind==='rolling',linear:kind==='linear'};
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

for(const speed of[240,480,720])for(const mirrored of[false,true])test(`a piercing head contacts its victim when the 15Hz packet deals damage: ${speed}, view ${mirrored?2:1}`,()=>{
  let events=[];const game=new Game({tutorial:true,onEvent:e=>events.push(e)});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.stun=999);
  const target=game.spawn('grimer',1,mirrored?350:250,500,0);target.stun=999;
  const startX=mirrored?500:100;
  game.projectiles.push({id:'contact',key:'alakazam',sourceId:999,team:0,x:startX,y:500,startX,startY:500,target,totalDistance:178,travelled:0,speed,damage:10,style:'psychic',dx:mirrored?-1:1,dy:0,linear:true,shotRadius:17,hitIds:[],life:10,groundPath:true,liftX:0,liftY:-15,endLiftY:-15,air:true});
  const frames=[],context=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  let frame=0;const renderer=Object.assign(Object.create(Renderer.prototype),{frameActors:new Map(),visualProjectiles:new Map(),t:0,drawDt:1/60,verticalScale:1,reduced:false,battleArt:{beam(){}},combatArt:(c,art,x,y,size)=>frames.push({frame,x,y,size})});
  let current=unpackGame(packGame(game)),hitFrame=null,hits=0;
  for(frame=0;frame<150;frame++){
    if(frame&&frame%4===0){game.step(1/30);game.step(1/30);current=unpackGame(packGame(game));const hit=events.filter(e=>e.type==='hit'&&e.targetId===target.id);hits+=hit.length;if(hit.length)hitFrame=frame;events=[];}
    renderer.t=frame/60;for(const shot of current.projectiles)renderer.projectile(context,shot);
    if(hitFrame!==null){
      const contact=frames.filter(p=>p.frame>=hitFrame-3).some(p=>Math.hypot(p.x-target.x,p.y-(target.y-15))<=p.size/2+target.radius);
      assert.ok(contact,`damage frame ${hitFrame} must have visible contact`);assert.equal(hits,1);assert.ok(current.units.find(u=>u.id===target.id).hp<target.maxHp);break;
    }
  }
  assert.notEqual(hitFrame,null);
});

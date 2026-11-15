import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js?v=34';
import {Renderer,spikesContactPoint} from '../dist/render.js';

for(const key of['spikes','stealthRock','whirlpool','nightmare','earthquake'])test(`${key}: active field keeps its actual effect without a targeting outline`,()=>{
  const game=new Game({seed:3605});game.start();game.aiEnabled=false;game.towers.forEach(tower=>tower.active=false);game.energy[0]=10;game.hands[0][0]=key;
  assert.equal(game.deploy(0,0,288,508).ok,true);
  for(let frame=0;frame<240&&!game.fields.length;frame++)game.step(1/60);
  assert.equal(game.fields.length,1,'a real cast must create its real field');
  const physical=JSON.stringify(game.fields),calls=[],effects=[];
  const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(object,name)=>object[name]??((...args)=>calls.push({name,args})),set:(object,name,value)=>(object[name]=value,true)});
  const renderer=Object.assign(Object.create(Renderer.prototype),{t:.5,reduced:false,verticalScale:1,
    fieldSurface:{width:0,height:0,getContext:()=>ctx},
    combatArt:(...args)=>effects.push({kind:'combatArt',args}),battleArt:{tile:(...args)=>effects.push({kind:'tile',args}),draw:(...args)=>effects.push({kind:'draw',args})}});
  renderer.field(ctx,game.fields[0],false);renderer.field(ctx,game.fields[0],true);
  assert.ok(effects.length>0,'the real field art remains visible after aiming ends');
  assert.equal(calls.filter(call=>['strokeRect','setLineDash'].includes(call.name)).length,0,'there is no targeting reticle after release');
  if(key!=='earthquake')assert.equal(calls.filter(call=>['stroke','moveTo','lineTo'].includes(call.name)).length,0,'there is no targeting outline');
  else assert.ok(calls.some(call=>call.name==='clip'),'ground fissures are clipped to the real field');
  assert.equal(JSON.stringify(game.fields),physical,'visual cleanup preserves lifetime, radius, position and mechanics');
});

test('spikes contact lies in both the native field and the entering or leaving body',()=>{
  const field={x:168,y:460,radius:66,team:0,air:false};
  for(const y of[384,528]){
    const target={x:168,y,radius:12,team:1,card:{}},saved=JSON.stringify([field,target]),p=spikesContactPoint(field,target);
    assert.ok(p,'the full collision body overlaps even outside the field center boundary');
    assert.ok(Math.hypot(p.x-field.x,p.y-field.y)<=field.radius);
    assert.ok(Math.hypot(p.x-target.x,p.y-target.y)<=target.radius);
    assert.equal(JSON.stringify([field,target]),saved);
  }
  assert.equal(spikesContactPoint(field,{x:168,y:381,radius:12,team:1,card:{}}),null,'no contact before native overlap');
  assert.equal(spikesContactPoint(field,{x:168,y:450,radius:12,team:1,card:{flying:true}}),null,'ground-only field never paints an aerial puncture');
  assert.equal(spikesContactPoint(field,{x:168,y:450,radius:12,team:0,card:{}}),null,'friendly unit has no contact');
  const building={x:245,y:460,radius:16,team:1,card:{structure:true}},p=spikesContactPoint(field,building);
  assert.ok(p.x>=building.x-building.radius&&p.x<=building.x+building.radius);
  assert.ok(Math.hypot(p.x-field.x,p.y-field.y)<=field.radius,'square footprints retain their native overlap');
});

test('only a real spikes damage event paints contact, and reset removes its old field and pulse',()=>{
  const field={x:168,y:460,radius:66,team:0,air:false},target={id:7,x:168,y:384,radius:12,team:1,hp:1710,maxHp:1766,card:{}};
  const r=Object.assign(Object.create(Renderer.prototype),{spikeFields:[field],effects:[],particles:[],numbers:[],healthStates:new Map(),t:1,showCombatNumbers:false});
  r.onEvent({type:'damage',target,amount:56,dot:true,sourceKey:'spikes'});
  assert.equal(r.effects.filter(e=>e.kind==='spikeContact').length,1);
  const pulse=r.effects[0];assert.ok(pulse.y>=394&&pulse.y<=396,'puncture belongs to the actual body/field intersection');
  r.onEvent({type:'damage',target,amount:109,sourceKey:'tower'});
  assert.equal(r.effects.filter(e=>e.kind==='spikeContact').length,1,'tower damage is not mislabeled');
  r.resetVisuals();assert.deepEqual(r.spikeFields,[]);assert.equal(r.effects.length,0);
  r.onEvent({type:'damage',target,amount:56,dot:true,sourceKey:'spikes'});assert.equal(r.effects.length,0,'an old match cannot supply its ground footprint');
});

test('spikes material is shared by laboratory renderers and keeps field data unchanged',()=>{
  let surfaces=0;const calls=[];
  const textureContext=()=>new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const doc={createElement(){surfaces++;return{width:0,height:0,getContext:()=>textureContext()};}};
  const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??((...args)=>calls.push({name:k,args})),set:(o,k,v)=>(o[k]=v,true)});
  const field={key:'spikes',x:168,y:460,radius:66,duration:7,life:6.5,team:0},saved=JSON.stringify(field);
  for(let i=0;i<24;i++){
    const r=Object.assign(Object.create(Renderer.prototype),{canvas:{ownerDocument:doc},verticalScale:1,t:i,reduced:!!(i%2)});
    r.field(ctx,field);r.field(ctx,field,true);
  }
  assert.equal(surfaces,2,'one node and one ground material serve all columns');
  assert.equal(calls.filter(c=>c.name==='drawImage').length,24);
  assert.equal(calls.filter(c=>['stroke','strokeRect','setLineDash'].includes(c.name)).length,0);
  assert.equal(JSON.stringify(field),saved,'visual material does not alter radius, damage timing or lifetime');
});

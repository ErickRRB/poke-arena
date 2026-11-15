import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js?v=34';
import {Renderer,spikesContactPoint} from '../dist/render.js';
import {publicSnapshot,publicEvent,unpackEvent} from '../dist/online-wire.js';
import {perspective,unpackGame} from '../dist/snapshot.js?v=34';

const feedbackRenderer=()=>Object.assign(Object.create(Renderer.prototype),{effects:[],particles:[],numbers:[],healthStates:new Map(),t:1,showCombatNumbers:false});

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

test('only a real spikes damage event paints contact, and reset removes its old pulse',()=>{
  const field={key:'spikes',x:168,y:460,radius:66,team:0,air:false},target={id:7,x:168,y:384,radius:12,team:1,hp:1710,maxHp:1766,card:{}};
  const r=feedbackRenderer();
  r.onEvent({type:'damage',target,amount:56,dot:true,sourceKey:'spikes'},{fields:[field]});
  assert.equal(r.effects.filter(e=>e.kind==='spikeContact').length,1);
  const pulse=r.effects[0];assert.ok(pulse.y>=394&&pulse.y<=396,'puncture belongs to the actual body/field intersection');
  r.onEvent({type:'damage',target,amount:109,sourceKey:'tower'},{fields:[field]});
  assert.equal(r.effects.filter(e=>e.kind==='spikeContact').length,1,'tower damage is not mislabeled');
  r.resetVisuals();assert.equal(r.effects.length,0);
  r.onEvent({type:'damage',target,amount:56,dot:true,sourceKey:'spikes'},{fields:[]});assert.equal(r.effects.length,0,'an old match cannot supply its ground footprint');
});

test('first snapshot and reconnect bind spikes damage to current fields without a prior draw',()=>{
  const game=new Game({seed:9});game.start();game.aiEnabled=false;
  const target=game.spawn('geodude',1,168,384,0);target.entryPending=false;
  const field={id:8,key:'spikes',x:168,y:460,radius:66,team:0,air:false,life:2,duration:7};game.fields=[field];
  const event=publicEvent({type:'damage',target,amount:56,sourceKey:'spikes'});
  for(const side of[0,1]){
    const r=feedbackRenderer(),snapshot=unpackGame(perspective(publicSnapshot(game,side),side)),e=perspective(unpackEvent(event),side);
    const saved=JSON.stringify([snapshot.fields,e]);
    r.spikeFields=[{...snapshot.fields[0],x:400,y:600}]; // A previous draw is deliberately stale.
    r.onEvent(e,snapshot);
    assert.equal(r.effects.length,1,'first delivery does not require rendering first');
    const p=r.effects[0],f=snapshot.fields[0];
    assert.ok(Math.hypot(p.x-f.x,p.y-f.y)<=f.radius);
    assert.ok(Math.hypot(p.x-e.target.x,p.y-e.target.y)<=e.target.radius);
    assert.equal(JSON.stringify([snapshot.fields,e]),saved,'decoding and feedback do not mutate state');
    r.effects=[];r.onEvent(e,{fields:[]});assert.equal(r.effects.length,0,'a later snapshot without the field cannot reuse the preceding one');
    r.onEvent(e);assert.equal(r.effects.length,0,'no current state never falls back to a frame cache');
  }
});

test('spikes attribution rejects friendly, aerial, unrelated and ambiguous fields',()=>{
  const r=feedbackRenderer(),field={key:'spikes',x:168,y:460,radius:66,team:0,air:false},target={id:7,x:168,y:384,radius:12,team:1,hp:1710,maxHp:1766,card:{}};
  const event={type:'damage',target,amount:56,sourceKey:'spikes'};
  for(const fields of[[{...field,team:1}],[{...field,key:'stealthRock'}],[{...field,x:400}],[field,{...field,y:452}]]){
    r.onEvent(event,{fields});assert.equal(r.effects.length,0,'an invalid or ambiguous field never supplies a made-up puncture');
  }
  r.onEvent({...event,target:{...target,card:{flying:true}}},{fields:[field]});assert.equal(r.effects.length,0);
  r.onEvent(event,{fields:[{...field,team:1},{...field,key:'stealthRock'},field]});assert.equal(r.effects.length,1,'only the valid current enemy ground field is eligible');
});

test('native first and final spikes ticks retain cues before field expiry, with no stale cue afterward',()=>{
  const r=feedbackRenderer(),hits=[];
  const game=new Game({seed:17,onEvent:e=>{if(e.type==='damage'&&e.sourceKey==='spikes'){r.onEvent(e,game);hits.push({life:game.fields[0].life,cues:r.effects.length});}}});
  game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);
  game.spawn('geodude',1,168,450,0);
  game.fields=[{id:8,key:'spikes',x:168,y:460,radius:66,team:0,air:false,life:1,duration:1,tick:.5,fieldTick:.5,damage:112}];
  for(let i=0;i<32;i++)game.step(1/30);
  assert.equal(hits.length,2);assert.deepEqual(hits.map(h=>h.cues),[1,2]);assert.ok(hits.at(-1).life<=1e-7,'the final native tick is not discarded at life zero');
  assert.equal(game.fields.length,0);
  const before=r.effects.length;r.onEvent({type:'damage',sourceKey:'spikes',amount:56,target:game.units[0]},game);
  assert.equal(r.effects.length,before,'expired geometry cannot be reused by a later event');
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

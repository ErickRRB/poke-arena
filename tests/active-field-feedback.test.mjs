import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js?v=26';
import {Renderer} from '../dist/render.js';

for(const key of['spikes','stealthRock','whirlpool','nightmare','earthquake'])test(`${key}: active field keeps its actual effect without a targeting outline`,()=>{
  const game=new Game({seed:3605});game.start();game.aiEnabled=false;game.towers.forEach(tower=>tower.active=false);game.energy[0]=10;game.hands[0][0]=key;
  assert.equal(game.deploy(0,0,288,508).ok,true);
  for(let frame=0;frame<240&&!game.fields.length;frame++)game.step(1/60);
  assert.equal(game.fields.length,1,'a real cast must create its real field');
  const physical=JSON.stringify(game.fields),calls=[],effects=[];
  const ctx=new Proxy({}, {get:(object,name)=>object[name]??((...args)=>calls.push({name,args})),set:(object,name,value)=>(object[name]=value,true)});
  const renderer=Object.assign(Object.create(Renderer.prototype),{t:.5,reduced:false,verticalScale:1,
    combatArt:(...args)=>effects.push({kind:'combatArt',args}),battleArt:{tile:(...args)=>effects.push({kind:'tile',args}),draw:(...args)=>effects.push({kind:'draw',args})}});
  renderer.field(ctx,game.fields[0],false);renderer.field(ctx,game.fields[0],true);
  assert.ok(effects.length>0,'the real field art remains visible after aiming ends');
  assert.equal(calls.filter(call=>['stroke','strokeRect','setLineDash','moveTo','lineTo'].includes(call.name)).length,0,'there is no targeting ring, ticks or reticle after release');
  assert.equal(JSON.stringify(game.fields),physical,'visual cleanup preserves lifetime, radius, position and mechanics');
});

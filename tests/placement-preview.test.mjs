import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../dist/render.js';
import { Game, CARDS } from '../dist/engine.js';
function drawing(key){
  const calls=[];const ctx=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>calls.push({method:k,args})),set:(o,k,v)=>(o[k]=v,true)});
  const game=new Game({seed:433});game.start();game.aiEnabled=false;game.energy[0]=10;game.deploymentThreats=()=>[];
  const renderer=Object.assign(Object.create(Renderer.prototype),{selection:key,pointer:{x:300,y:500},t:0,reduced:true,sprite(){}});
  return{game,renderer,ctx,calls};
}
test('a troop preview draws one range circle and a cell marker, without a second footprint circle',()=>{
  const{game,renderer,ctx,calls}=drawing('pikachu');renderer.drawPlacement(ctx,game);
  assert.deepEqual(calls.filter(c=>c.method==='arc').map(c=>c.args[2]),[CARDS.pikachu.range]);assert.equal(calls.filter(c=>c.method==='ellipse').length,0);assert.ok(calls.some(c=>c.method==='strokeRect'));
});
test('after placement no old hover or preview can draw a placement indicator',()=>{
  const{game,renderer,ctx,calls}=drawing(null);renderer.deploymentPreview={key:'pikachu',x:300,y:500,until:50};renderer.drawPlacement(ctx,game);assert.deepEqual(calls,[]);
});
test('only ranged attacks show a troop range circle, including the ranged members of a mixed squad',()=>{
  for(const[key,radii]of[['centralElectrode',[]],['voltorb',[]],['pandilla',[120]],['meganium',[CARDS.meganium.range]],['regice',[CARDS.regice.range]]]){const{game,renderer,ctx,calls}=drawing(key);renderer.drawPlacement(ctx,game);assert.deepEqual(calls.filter(c=>c.method==='arc').map(c=>c.args[2]),radii,key);}
});
test('melee troops never show explosion, jump, splash or short attack reach as a range circle',()=>{
  for(const[key,card]of Object.entries(CARDS).filter(([,c])=>!c.spell&&!c.squad&&c.range<50)){
    const{game,renderer,ctx,calls}=drawing(key);renderer.drawPlacement(ctx,game);assert.equal(calls.filter(c=>c.method==='arc').length,0,key);
  }
});
test('a spell has one target boundary and Mazazo has its straight travel footprint',()=>{
  for(const[key,radii]of[['spikes',[CARDS.spikes.splash]],['log',[]]]){const{game,renderer,ctx,calls}=drawing(key);renderer.drawPlacement(ctx,game);assert.deepEqual(calls.filter(c=>c.method==='arc').map(c=>c.args[2]),radii);}
});

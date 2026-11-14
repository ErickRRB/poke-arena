import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js?v=26';
import {Renderer} from '../dist/render.js';
import {softDisc} from '../dist/targeting-art.js';

function drawing(){
  const calls=[],gradients=[];
  const ctx=new Proxy({createRadialGradient:(...args)=>{const gradient={args,stops:[],addColorStop(offset,color){this.stops.push([offset,color]);}};gradients.push(gradient);return gradient;}},{get:(o,k)=>o[k]??((...args)=>calls.push({method:k,args,strokeStyle:o.strokeStyle})),set:(o,k,v)=>(o[k]=v,true)});
  return{ctx,calls,gradients};
}
test('small, medium and large areas fade to transparent at the exact mechanical radius without outlines',()=>{
  for(const radius of [24,60,132]){
    const{ctx,calls,gradients}=drawing();softDisc(ctx,300,500,radius,{color:'#e3b351'});
    assert.deepEqual(gradients[0].args,[300,500,0,300,500,radius]);
    assert.match(gradients[0].stops.at(-1)[1],/,0\)$/);assert.equal(gradients[0].stops.at(-1)[0],1);
    assert.equal(calls.filter(c=>['stroke','moveTo','lineTo'].includes(c.method)).length,0);
    assert.deepEqual(calls.find(c=>c.method==='arc').args,[300,500,radius,0,Math.PI*2]);
  }
});
for(const team of [0,1])for(const destroyed of [false,true])test(`no tower-hole frontier segments with side${team} and expanded territory${destroyed}`,()=>{
  const game=new Game();game.start();game.aiEnabled=false;
  if(destroyed){const tower=game.towers.find(t=>t.team!==team&&!t.king&&t.lane===1);game.damage(tower,tower.hp+1,team);assert.ok(tower.hp<=0);}
  const{ctx,calls}=drawing(),renderer=Object.assign(Object.create(Renderer.prototype),{selection:'pikachu',placementTeam:team,pointer:null});
  renderer.drawPlacement(ctx,game);
  assert.ok(calls.some(c=>c.method==='strokeRect'),'The quiet legal-cell grid remains.');
  assert.equal(calls.filter(c=>['moveTo','lineTo','stroke'].includes(c.method)).length,0,'No dark/cream frontier outlines around tower holes or expanded territory.');
});
test('a splash impact keeps its physical footprint and native effects without a hard ripple ring',()=>{
  const{ctx,calls,gradients}=drawing(),effects=[];
  const renderer=Object.assign(Object.create(Renderer.prototype),{verticalScale:1,reduced:false,combatArt:(...args)=>effects.push(args)});
  const effect={x:168,y:224,radius:48,color:'#e2a9b9',style:'leaf',art:'petalShot'},before=JSON.stringify(effect);
  renderer.areaImpact(ctx,effect,.2);
  assert.equal(gradients[0].args[5],48);assert.ok(effects.length>0);assert.equal(calls.filter(c=>c.method==='stroke').length,0);
  assert.equal(JSON.stringify(effect),before);
});

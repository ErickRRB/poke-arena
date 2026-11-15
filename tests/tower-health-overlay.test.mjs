import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js?v=34';
import {Renderer} from '../dist/render.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js?v=34';
import {SandboxGame} from '../dist/sandbox.js';

function drawing(viewerTeam=0){
  const calls=[],ctx=new Proxy({measureText:value=>({width:String(value).length*7})},{get:(o,k)=>o[k]??((...args)=>calls.push({method:k,args,fillStyle:o.fillStyle})),set:(o,k,v)=>(o[k]=v,true)});
  const renderer=Object.assign(Object.create(Renderer.prototype),{viewerTeam,verticalScale:1,bodyHeights:new Map([[31,30],[34,34],[52,30]])});
  return{ctx,calls,renderer};
}
for(const view of [0,1])test(`both health elements of all three enemy towers appear above their bodies after perspective${view}`,()=>{
  const source=new Game({seed:2026}),game=unpackGame(perspective(packGame(source),view));
  const{ctx,calls,renderer}=drawing();
  for(const tower of game.towers){
    calls.length=0;renderer.towerHealth(ctx,tower);
    const label=calls.find(c=>c.method==='fillText'),bar=calls.find(c=>c.method==='fillRect'&&c.args[2]===(tower.king?68:60));
    assert.ok(label&&bar);
    if(tower.team===1){
      const bodyTop=tower.y-(tower.king?102*476/574:72*395/309);
      assert.ok(label.args[2]+8<bodyTop);assert.ok(bar.args[1]+6<bodyTop);
    }else{assert.equal(bar.args[1],tower.y+10);assert.equal(label.args[2],tower.y+28);}
  }
  assert.equal(game.towers.filter(t=>t.team===1).length,3);
});
test('viewer ownership is independent of the deployment side selected in the laboratory',()=>{
  const game=new Game(),{ctx,calls,renderer}=drawing(1);renderer.placementTeam=0;
  for(const tower of game.towers){calls.length=0;renderer.towerHealth(ctx,tower);const label=calls.find(c=>c.method==='fillText');assert.equal(label.args[2]<tower.y,tower.team!==1);}
});
test('the shared overlay keeps immortal enemy laboratory health labels above the towers',()=>{
  const game=new SandboxGame({mode:'duel'}),{ctx,calls,renderer}=drawing();
  assert.equal(game.visibleTowers.filter(t=>t.team===1).length,2);
  for(const tower of game.visibleTowers.filter(t=>t.team===1)){
    assert.equal(tower.labImmortal,true);calls.length=0;renderer.towerHealth(ctx,tower);
    const label=calls.find(c=>c.method==='fillText');assert.equal(label.args[0],'∞');assert.ok(label.args[2]<tower.y-70);
  }
});
test('a destroyed tower has no remaining health overlay',()=>{
  const game=new Game(),tower=game.towers.find(t=>t.team===1&&!t.king),{ctx,calls,renderer}=drawing();
  game.start();
  game.damage(tower,tower.hp+1,0);renderer.towerHealth(ctx,tower);assert.deepEqual(calls,[]);
});
test('the real draw pass paints tower health after attacking units, effects and placement',()=>{
  const game=new Game();game.start();game.aiEnabled=false;
  game.spawn('golem',0,game.towers.find(t=>t.team===1&&!t.king).x,184,0);
  const{ctx,calls,renderer}=drawing();
  Object.assign(renderer,{ctx,canvas:{width:600,height:800},viewport:{width:600,height:800},t:0,
    background:{},battleArt:{structure(){return true;}},healthStates:new Map(),visualActors:new Map(),visualProjectiles:new Map(),visualFlights:new Map(),particles:[],
    visualActor:actor=>({...actor}),drawWater(){},sprite(_c,actor){calls.push({method:actor.mounted?'guard':'attacker'});},frozen(){},drawDeployments(){},
    drawEffects(){calls.push({method:'effect'});},drawPlacement(){calls.push({method:'placement'});}});
  renderer.draw(game,0);
  const lastForeground=Math.max(...calls.map((c,i)=>['attacker','effect','placement'].includes(c.method)?i:-1));
  const labels=calls.flatMap((c,i)=>c.method==='fillText'&&/^\d+$/.test(c.args[0])?[i]:[]);assert.equal(labels.length,6);assert.ok(labels.every(i=>i>lastForeground));
});

test('troop and structure health stays above foreground bodies and effects',()=>{
  const game=new Game();game.start();game.aiEnabled=false;
  for(const [key,x,y]of[['raltsToken',300,510],['raltsHut',300,548],['raltsToken',365,515],['snorlax',365,550]])game.spawn(key,0,x,y,0);
  const{ctx,calls,renderer}=drawing();
  Object.assign(renderer,{ctx,canvas:{width:600,height:800},viewport:{width:600,height:800},t:0,background:{},battleArt:{},healthStates:new Map(),visualActors:new Map(),visualProjectiles:new Map(),visualFlights:new Map(),particles:[],
    visualActor:actor=>({...actor}),drawWater(){},tower(){},sprite(c,actor){calls.push({method:'body',id:actor.id});this.queueUnitHealth(c,actor,actor.x,actor.y-40,30);},frozen(){},drawDeployments(){},
    drawEffects(){calls.push({method:'effect'});},drawPlacement(){calls.push({method:'placement'});},healthBar(_c,actor){calls.push({method:'unitHealth',id:actor.id});}});
  renderer.draw(game,0);
  const lastForeground=Math.max(...calls.map((c,i)=>['body','effect','placement'].includes(c.method)?i:-1));
  const bars=calls.flatMap((c,i)=>c.method==='unitHealth'?[i]:[]);assert.equal(bars.length,4);assert.ok(bars.every(i=>i>lastForeground));
  assert.equal(renderer.unitHealthQueue,undefined);
});

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

test('foreground troop readouts preserve HP, chip and shield ratios without mutating state',()=>{
 const fills=[],ctx={fillRect(...args){fills.push({color:this.fillStyle,args});}};
 const unit={id:1,team:0,hp:35,maxHp:100,shield:25,maxShield:100};
 const r=Object.assign(Object.create(Renderer.prototype),{healthStates:new Map([[1,{chip:.6}]])});
 const saved=JSON.stringify(unit),states=JSON.stringify([...r.healthStates]);r.healthReadout(ctx,unit,200,300,44);
 assert.deepEqual(fills.find(row=>row.color==='#a3e5ff').args,[178,300,Math.round(44*.35),2]);
 assert.deepEqual(fills.find(row=>row.color==='#ffe2a2').args,[178,300,Math.round(44*.6),2]);
 assert.deepEqual(fills.find(row=>row.color==='#f1e0ff').args,[178,311,11,2]);
 assert.equal(JSON.stringify(unit),saved);assert.equal(JSON.stringify([...r.healthStates]),states);
});
test('frame composes compact heads and meter readouts while retaining tower priority and logical state',()=>{
 const game=new Game();game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);
 const actor=game.spawn('charizard',0,220,540,0);actor.hp=actor.maxHp*.35;actor.shield=50;actor.maxShield=100;
 game.projectiles=[{id:'composition-probe'}];
 const order=[],ctx=new Proxy({},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
 const r=Object.assign(Object.create(Renderer.prototype),{ctx,canvas:{width:600,height:800},viewport:{width:600,height:800},t:0,background:{},battleArt:{},healthStates:new Map(),visualActors:new Map(),visualProjectiles:new Map(),visualFlights:new Map(),particles:[],
  visualActor:unit=>({...unit}),drawWater(){},tower(c,tower){this.towerHealthQueue.push(tower);},frozen(){},drawDeployments(){},
  sprite(c,unit){this.queueUnitHealth(c,unit,unit.x,unit.y-50,44);},
  projectile(c){order.push('trail');this.projectileHead(c,()=>order.push('head'));},
  drawEffects(){order.push('impact');},drawPlacement(){},healthBar(){order.push('bar');},healthReadout(){order.push('meter');},towerHealth(){order.push('tower');}});
 const before=JSON.stringify(packGame(game));r.draw(game,1/60);
 for(const [a,b]of [['impact','bar'],['bar','head'],['head','meter'],['meter','tower']])assert.ok(order.indexOf(a)<order.indexOf(b),`${a} before ${b}`);
 assert.equal(order.filter(value=>value==='head').length,1);assert.equal(JSON.stringify(packGame(game)),before);assert.equal(r.projectileHeadQueue,undefined);
 // Composition and numeric ratios do not provide a visual readability verdict.
});
test('standalone projectile heads remain immediate outside a frame queue',()=>{
 const r=Object.create(Renderer.prototype);let count=0;r.projectileHead({},()=>count++);assert.equal(count,1);
});

test('foreground readout retains the native meter pixels including quarter marks and damage feedback',()=>{
 const paint=(method,hit)=>{
  const pixels=new Map(),stack=[],ctx={globalAlpha:1,fillStyle:'#000000',save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle});},restore(){Object.assign(this,stack.pop());},fillRect(x,y,w,h){
   const color=this.fillStyle.slice(1),rgb=[0,2,4].map(offset=>parseInt(color.slice(offset,offset+2),16)),alpha=this.globalAlpha*(color.length===8?parseInt(color.slice(6),16)/255:1);
   for(const row of [300,301,311,312])if(row>=y&&row<y+h)for(let column=178;column<222;column++)if(column>=x&&column<x+w){const key=column+':'+row,prior=pixels.get(key)||[18,25,31];pixels.set(key,rgb.map((channel,index)=>channel*alpha+prior[index]*(1-alpha)));}
  }};
  const unit={id:1,team:0,card:{},hp:35,maxHp:100,shield:25,maxShield:100,hit};
  const r=Object.assign(Object.create(Renderer.prototype),{t:0,drawDt:0,healthStates:new Map([[1,{chip:.6,last:.35,at:0}]])});r[method](ctx,unit,200,300,44);return [...pixels];
 };
 for(const hit of[0,.18,.24])assert.deepEqual(paint('healthReadout',hit),paint('healthBar',hit));
});

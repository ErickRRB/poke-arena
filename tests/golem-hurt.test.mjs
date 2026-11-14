import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {Renderer} from '../dist/render.js';
import {packGame,unpackGame} from '../dist/snapshot.js';

test('Golem reacts to an effective forced push, never ordinary chip or an immune fireball',()=>{
  const game=new Game({tutorial:true});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.stun=999);
  const unit=game.spawn('golem',1,300,520,0);unit.card={...unit.card,speed:0,passive:true};game.damage(unit,5,0);assert.equal(unit.pushHurt,undefined);
  game.spells.push({key:'fireball',card:{...CARDS.fireball,travelSpeed:0,damage:5},team:0,x:276,y:520,delay:0});game.step(1/60);
  assert.equal(unit.pushHurt,undefined);assert.equal(unit.x,300);
  assert.equal(game.pushUnit(unit,24,0,{force:true}),true);assert.ok(unit.pushHurt>0);
  const copy=unpackGame(packGame(game)).units.find(u=>u.id===unit.id);assert.equal(copy.pushHurt,unit.pushHurt);
  game.pause();game.step(.1);assert.equal(unit.pushHurt,copy.pushHurt);game.resume();for(let i=0;i<20;i++)game.step(1/60);assert.equal(unit.pushHurt,0);
});

test('Golem death retains the same brief visual ghost while paused, without advancing its lifetime',()=>{
  const renderer=Object.assign(Object.create(Renderer.prototype),{effects:[],particles:[],frameActors:new Map(),burst(){}});
  const game=new Game({tutorial:true,onEvent:e=>{if(e.type==='faint')renderer.onEvent(e);}});game.start();game.aiEnabled=false;
  const unit=game.spawn('golem',1,300,520,0);game.damage(unit,unit.hp+1,0);assert.equal(unit.hp,0);
  const ghost=renderer.effects.find(e=>e.kind==='golemDeath');assert.ok(ghost);assert.equal(ghost.unit.deathHurt,true);
  let draws=0;renderer.sprite=()=>draws++;const context={save(){},restore(){},globalAlpha:1};
  const before=ghost.life;renderer.drawEffects(context,0);assert.equal(draws,1);assert.equal(ghost.life,before);
  renderer.drawEffects(context,1/60);assert.equal(draws,2);
  for(let i=0;i<20;i++)renderer.drawEffects(context,1/60);assert.ok(!renderer.effects.includes(ghost));
});

test('Golem sprite keeps its normal image for chip and selects native Hurt for a push',()=>{
  const images={Idle:{height:56},Hurt:{height:56}},meta={width:48,height:56,durations:[2,8]},drawn=[];
  const renderer=Object.assign(Object.create(Renderer.prototype),{speciesLoads:new Map([[76,true]]),sprites:new Map([['76-Idle',images.Idle],['76-Hurt',images.Hurt]]),metadata:{76:{Idle:meta,Hurt:meta}},anchors:new Map(),bodyHeights:new Map(),t:0,reduced:false,verticalScale:1,spellTargets:new Set()});
  const ctx=new Proxy({drawImage:image=>drawn.push(image)},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const unit={id:1,key:'golem',card:CARDS.golem,x:300,y:500,dx:0,dy:-1,hp:100,maxHp:100,hit:.2,spawn:0,attack:0,moving:false};
  renderer.sprite(ctx,unit,true);assert.equal(drawn.pop(),images.Idle);
  renderer.sprite(ctx,{...unit,pushHurt:.2,moving:true},true);assert.equal(drawn.pop(),images.Hurt);
  renderer.drawDt=0;renderer.sprite(ctx,{...unit,pushHurt:.2},true);assert.equal(drawn.pop(),images.Hurt);
});

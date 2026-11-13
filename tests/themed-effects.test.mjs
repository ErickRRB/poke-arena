import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, CARDS } from '../dist/engine.js';
import { Renderer } from '../dist/render.js';
import {BattleArt,cardPlaceholder} from '../dist/battle-art.js';
import {BATTLE_ASSETS} from '../dist/assets/battle/manifest.js';
import { packGame, unpackGame, packEvent, perspective } from '../dist/snapshot.js';

function setup(){
  const calls=[],ctx=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>calls.push({method:k,args})),set:(o,k,v)=>(o[k]=v,true)});
  const battleArt=new BattleArt(async()=>({}));for(const asset of Object.values(BATTLE_ASSETS))battleArt.images.set(asset.file,{});
  const renderer=Object.assign(Object.create(Renderer.prototype),{battleArt,frameActors:new Map(),effects:[],particles:[],numbers:[],bodyHeights:new Map(),healthStates:new Map(),t:0,reduced:false,verticalScale:1,ensureSpecies:async()=>{}});
  const game=new Game({seed:913,onEvent:e=>renderer.onEvent(e)});
  game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);
  return{game,renderer,ctx,calls};
}
function deploy(game,key,x=300,y=520,team=0){
  game.hands[team][0]=key;game.energy[team]=10;
  assert.equal(game.deploy(team,0,x,y).ok,true);
}
function markers(renderer,game){
  const result=[];
  const draw=renderer.deploymentIndicator;
  renderer.deploymentIndicator=(_,marker,progress)=>result.push({...marker,progress});
  renderer.drawDeployments(null,game);
  renderer.deploymentIndicator=draw;
  return result;
}

test('one deployment indicator serves every member of swarms, mixed squads and parent/child cards',()=>{
  for(const key of['pikachu','zubat','diglettHorde','pandilla','kangaskhan']){
    const{game,renderer}=setup();deploy(game,key);
    const count=CARDS[key].squad?.length||CARDS[key].count|| (CARDS[key].spawnWith?2:1);
    assert.equal(game.units.length,count,key);
    assert.equal(markers(renderer,game).length,1,key);
    assert.equal(renderer.effects.filter(e=>e.kind==='release').length,1,key);
    assert.equal(markers(renderer,game)[0].progress,0,key);
    game.step(.1);
    assert.ok(markers(renderer,game)[0].progress>0,key);
    for(let i=0;i<8;i++)game.step(.1);
    assert.equal(markers(renderer,game).length,0,key);
  }
});

test('two cards at the same position retain separate deployment indicators',()=>{
  const{game,renderer}=setup();deploy(game,'zubat');deploy(game,'zubat');
  const result=markers(renderer,game);
  assert.equal(result.length,2);assert.notEqual(result[0].id,result[1].id);
});

test('an eliminated member does not remove its surviving swarm indicator',()=>{
  const{game,renderer}=setup();deploy(game,'diglettHorde');
  game.units[0].hp=0;
  assert.equal(markers(renderer,game).length,1);
  game.units.forEach(u=>u.hp=0);
  assert.equal(markers(renderer,game).length,0);
});

test('group markers survive wire serialization, reconnection and the other player perspective',()=>{
  const{game,renderer}=setup();deploy(game,'pandilla');
  const packed=JSON.parse(JSON.stringify(packGame(game))),mirrored=perspective(packed,1);
  const restored=unpackGame(mirrored),result=markers(renderer,restored);
  assert.equal(result.length,1);assert.equal(result[0].x,600-game.units[0].spawnGroup.x);assert.equal(result[0].y,800-game.units[0].spawnGroup.y);
  assert.deepEqual(perspective(mirrored,1),packed);
  const event=packEvent({type:'spawn',unit:game.units[0]});
  assert.deepEqual(perspective(event,1).unit.spawnGroup,restored.units[0].spawnGroup);
});

test('an automatic reinforcement wave shares one marker and honors its shorter deployment duration',()=>{
  const{game,renderer}=setup(),owner=game.spawn('madriguera',0,300,520,0);
  game.spawnReinforcements(owner,'nidoranM',2,.4);
  assert.equal(markers(renderer,game).length,1);
  game.step(.1);game.step(.1);
  assert.ok(Math.abs(markers(renderer,game)[0].progress-.5)<1e-6);
  for(let i=0;i<3;i++)game.step(.1);
  assert.equal(markers(renderer,game).length,0);
});

test('the summon meter starts empty for the first short cycle and resets to the regular cycle',()=>{
  const{game}=setup(),owner=game.spawn('madriguera',0,300,520,0);
  assert.equal(owner.summonClock,1);assert.equal(owner.summonCycle,1);
  for(let i=0;i<5;i++)game.step(.1);
  assert.ok(Math.abs(1-owner.summonClock/owner.summonCycle-.5)<1e-6);
  for(let i=0;i<6;i++)game.step(.1);
  assert.equal(owner.summonCycle,CARDS.madriguera.summonEvery);
  assert.ok(owner.summonClock>6.8);
});

test('a deployment release waits for readiness and creates no expanding ring',()=>{
  const{game,renderer,ctx,calls}=setup();deploy(game,'zubat');
  renderer.drawEffects(ctx,.5);assert.equal(calls.length,0);
  renderer.drawEffects(ctx,.26);assert.ok(calls.some(c=>c.method==='drawImage'));
  assert.equal(calls.filter(c=>['arc','ellipse'].includes(c.method)).length,0);
});

test('Pin misil visibly flies before damage and lands when the simulation hits',()=>{
  const{game,renderer,ctx,calls}=setup();deploy(game,'pinMissile',300,300);
  assert.equal(renderer.effects.filter(e=>e.kind==='missiles').length,1);
  for(let i=0;i<4;i++){game.step(.1);renderer.drawEffects(ctx,.1);}
  assert.equal(game.spells.length,1);assert.ok(calls.some(c=>c.method==='drawImage'));
  for(let i=0;i<2;i++){game.step(.1);renderer.drawEffects(ctx,.1);}
  assert.equal(game.spells.length,0);assert.equal(calls.filter(c=>['arc','ellipse'].includes(c.method)).length,0);
  assert.equal(renderer.effects.filter(e=>e.kind==='missiles').length,1);
  assert.equal(renderer.effects[0].landed,true);
  renderer.drawEffects(ctx,.5);assert.equal(renderer.effects.length,0);
});

test('Pikachu entry, attack charge and missile impacts use sparks instead of loading circles',()=>{
  for(const reduced of[false,true]){
    const{game,renderer,ctx,calls}=setup();renderer.reduced=reduced;
    const unit=game.spawn('pikachu',0,300,520,0);
    renderer.onEvent({type:'entry',unit,x:unit.x,y:unit.y,radius:72,style:'lightning'});
    renderer.onEvent({type:'attackStart',attacker:unit,style:'lightning',windup:.2});
    renderer.onEvent({type:'spellHit',key:'pinMissile',x:300,y:300,radius:86,team:0});
    renderer.drawEffects(ctx,.05);
    assert.ok(calls.some(c=>c.method==='drawImage'));
    assert.equal(calls.filter(c=>['arc','ellipse'].includes(c.method)).length,0);
  }
});

test('Rueda Fuego preserves the saved card key and sweep while replacing the static placeholder with animated attack assets',()=>{
 assert.equal(CARDS.log.name,'Rueda Fuego');assert.equal(CARDS.log.cost,2);assert.equal(CARDS.log.damage,290);assert.equal(cardPlaceholder('log'),false);
 const{game,renderer,ctx,calls}=setup();deploy(game,'log',300,520);
 const spell=game.spells[0];assert.equal(spell.key,'log');const before=spell.y;game.step(.1);assert.ok(spell.y<before);
 const frames=new Set();
 for(let i=0;i<20;i++){renderer.t=i/30;calls.length=0;renderer.rollingSpell(ctx,spell);const draw=calls.find(call=>call.method==='drawImage'&&call.args[0]===renderer.battleArt.image('flameWheel'));assert.ok(draw);frames.add(draw.args[1]);assert.equal(calls.some(call=>call.method==='fillText'),false);}
 assert.ok(frames.size>=4,'the rolling attack must visibly animate');
 for(const reduced of[true,false]){renderer.reduced=reduced;calls.length=0;renderer.rollingSpell(ctx,spell);assert.ok(calls.some(call=>call.method==='drawImage'));}
});

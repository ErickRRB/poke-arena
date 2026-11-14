import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';
import {POKEMON_SILHOUETTES} from '../dist/pokemon-silhouettes.js';
const run=(g,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)g.step(1/60);};
function setup(){const events=[],g=new Game({seed:981,onEvent:e=>events.push(e)});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);return{g,events};}
function dashScene(){const{g,events}=setup(),unit=g.spawn('sableye',0,300,600,0),target=g.spawn('snorlax',1,300,480,0);target.card={...target.card,passive:true,speed:0};return{g,events,unit,target};}

test('Bandit has a vulnerable preparation, visible travel and one double-damage landing',()=>{
  const{g,events,unit,target}=dashScene();run(g,.6);assert.equal(unit.dash.phase,'windup');assert.equal(unit.y,600);assert.equal(target.hp,target.maxHp);
  const health=unit.hp;g.damage(unit,10,1);assert.equal(unit.hp,health-10);
  run(g,.25);assert.equal(unit.dash.phase,'travel');assert.ok(unit.y<600&&unit.y>540);const during=unit.hp;g.damage(unit,100,1);assert.equal(unit.hp,during);
  run(g,.25);assert.equal(unit.dash,null);assert.equal(target.maxHp-target.hp,CARDS.sableye.damage*2);
  assert.equal(events.filter(e=>e.type==='dashStart').length,1);assert.equal(events.filter(e=>e.type==='damage'&&e.target===target).length,1);
  g.damage(unit,10,1);assert.equal(unit.hp,during-10);
});
test('a stun cancels preparation and close enemies never trigger a dash',()=>{
  const{g,unit,target}=dashScene();run(g,.3);g.damage(unit,1,1,{stun:.5});run(g,.1);assert.equal(unit.dash,null);assert.equal(unit.y,600);assert.equal(target.hp,target.maxHp);
  const close=dashScene();close.target.y=550;run(close.g,.1);assert.ok(!close.unit.dash);
});
test('dash state survives reconnection and mirrors its path for the other player',()=>{
  const{g,unit}=dashScene();run(g,.85);assert.equal(unit.dash.phase,'travel');
  const data=packGame(g),restored=unpackGame(data),mirror=unpackGame(perspective(data,1));
  run(g,.3);run(restored,.3);run(mirror,.3);
  const copy=restored.units.find(u=>u.id===unit.id),other=mirror.units.find(u=>u.id===unit.id);
  assert.equal(copy.y,unit.y);assert.ok(Math.abs(other.y-(800-unit.y))<1e-6);assert.equal(copy.dash,null);assert.deepEqual(restored.stats,g.stats);
});
test('small single troops, including Bandit and Princess, have readable silhouettes',()=>{
  for(const key of['sableye','roselia','pikachu','squirtle','charmander','bulbasaur','ditto'])assert.ok(POKEMON_SILHOUETTES[CARDS[key].id].body*CARDS[key].scale>=41.9,key);
  assert.equal(CARDS.sableye.radius,undefined); // Artwork size must not invent a larger collision body.
});
test('a summoner killed by damage over time cannot create its regular wave after dying',()=>{
  const{g}=setup(),unit=g.spawn('duskull',0,300,500,0);unit.hp=1;unit.summonClock=.5;unit.burn={remaining:3,tick:.5,damage:12,team:1,kind:'fire'};
  run(g,.52);assert.equal(unit.hp,0);assert.equal(g.units.filter(u=>u.parentId===unit.id).length+g.reinforcements.filter(job=>job.parentId===unit.id).length,0);
});
test('freezing a summoned unit does not extend its natural lifetime',()=>{
  const{g}=setup(),unit=g.spawn('shuppetToken',0,300,500,0);g.damage(unit,45,1,{stun:3,freeze:3});run(g,16.5);assert.equal(unit.hp,0);assert.ok(!g.units.includes(unit));
});
test('Ditto copies a heavy windup and poison identity along with attack damage',()=>{
  for(const key of['rhydon','umbreon']){
    const{g}=setup(),unit=g.spawn('ditto',0,300,500,0),target=g.spawn(key,1,300,460,0);target.card={...target.card,speed:0,passive:true};
    run(g,.05);assert.equal(unit.card.copy,false);assert.equal(unit.card.windup,CARDS[key].windup);assert.equal(unit.card.burnKind,CARDS[key].burnKind);
    const hp=target.hp;run(g,Math.max(0,CARDS[key].windup-.15));if(key==='rhydon')assert.equal(target.hp,hp);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js?v=34';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js?v=34';
import {BattlePhaseUi} from '../dist/battle-phase-ui.js';
function fixture(){
 const elements=new Map();
 const element=key=>{if(!elements.has(key)){const classes=new Set();elements.set(key,{dataset:{},attributes:{},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name)},contains:name=>classes.has(name)},writes:0,get textContent(){return this.text||''},set textContent(value){this.text=value;this.writes++},setAttribute(key,value){this.attributes[key]=value}});}return elements.get(key)};
 const document={getElementById:element,querySelector:element},ui=new BattlePhaseUi(document);
 return {ui,element};
}
test('the native schedule survives snapshots in both player perspectives',()=>{
 for(const phase of [{time:180,overtime:false,m:1},{time:61,overtime:false,m:1},{time:60,overtime:false,m:2},{time:120,overtime:true,m:2},{time:61,overtime:true,m:2},{time:60,overtime:true,m:3}]){
  const game=new Game();game.start();Object.assign(game,phase);delete game.m;assert.equal(game.multiplier,phase.m);
  for(const team of[0,1]){const restored=unpackGame(perspective(packGame(game),team)),{ui,element}=fixture();ui.update(restored);assert.equal(element('.energy-section').dataset.elixir,String(phase.m));assert.equal(element('boost').hidden,phase.m===1);assert.equal(element('boost-value').textContent,'×'+phase.m);assert.equal(element('boost').writes,0,'the drop artwork must survive phase updates');assert.equal(element('battle-clock').dataset.phase,phase.overtime?'overtime':'regular');}
 }
});
test('late phase snapshots announce once; repeated snapshots and ticks do not repeat the announcement',()=>{
 const {ui,element}=fixture(),game=new Game();game.start();Object.assign(game,{time:80,overtime:true});
 ui.update(unpackGame(packGame(game)));const a=element('battle-phase-announcement'),writes=a.writes;
 assert.match(a.textContent,/Tiempo extra.*doble/);
 for(let i=0;i<12;i++)ui.update(unpackGame(packGame(game)));assert.equal(a.writes,writes);
 game.time=60;ui.update(unpackGame(packGame(game)));assert.match(a.textContent,/triple/);assert.equal(a.writes,writes+1);
});
test('overtime pulse uses logical time, pauses exactly and becomes static with reduced motion',()=>{
 const {ui,element}=fixture(),game=new Game();game.start();Object.assign(game,{time:100,overtime:true,elapsed:.25});ui.update(game);
 const first=element('battle-clock').dataset.beat;game.elapsed=.75;ui.update(game);assert.notEqual(element('battle-clock').dataset.beat,first);
 game.pause();const beat=element('battle-clock').dataset.beat;game.step(.1);ui.update(game);assert.equal(element('battle-clock').dataset.beat,beat);
 for(const elapsed of[.25,.75,1.25]){game.elapsed=elapsed;ui.update(game,{reduced:true});assert.equal(element('battle-clock').dataset.beat,'strong');}
});
test('returning to a fresh game clears the overtime and boosted-elixir presentation',()=>{
 const {ui,element}=fixture(),old=new Game();old.start();Object.assign(old,{time:40,overtime:true});ui.update(old);ui.reset();
 const fresh=new Game();fresh.start();ui.update(fresh);assert.equal(element('battle-clock').dataset.phase,'regular');assert.equal(element('.energy-section').dataset.elixir,'1');assert.equal(element('boost').hidden,true);assert.equal(element('phase-label').hidden,true);assert.equal(element('battle-phase-announcement').textContent,'');
});

test('last-minute warning starts at sixty seconds of either period and preserves paused/reduced clocks',()=>{
 const {ui,element}=fixture(),game=new Game();game.start();const clock=element('battle-clock');
 for(const overtime of[false,true]){
  Object.assign(game,{overtime,time:60.01,elapsed:.25});ui.update(game);assert.equal(clock.classList.contains('last-minute'),false);
  game.time=60;ui.update(game);assert.ok(clock.classList.contains('last-minute'));assert.ok(clock.classList.contains('urgent'));assert.equal(element('timer').textContent,'1:00');
  game.elapsed=.75;ui.update(game);assert.equal(clock.dataset.beat,'soft');game.pause();game.step(.2);ui.update(game);assert.equal(clock.dataset.beat,'soft');
  ui.update(game,{reduced:true});assert.equal(clock.dataset.beat,'strong');game.resume();game.time=0;ui.update(game);assert.ok(clock.classList.contains('last-minute'));assert.equal(element('timer').textContent,'0:00');
 }
});

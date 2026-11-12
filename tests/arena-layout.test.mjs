import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, LANES, RIVER, BRIDGE } from '../dist/engine.js';
import { packGame, unpackGame, perspective } from '../dist/snapshot.js';

function arena(team=0,lane=0){
  const events=[],game=new Game({seed:9182,onEvent:event=>events.push(event)});
  game.start();game.aiEnabled=false;
  const tower=game.towers.find(t=>t.team===team&&t.lane===lane);
  game.towers.forEach(t=>t.active=t===tower);tower.cooldown=0;
  return{game,tower,events};
}
function run(game,seconds){for(let i=0;i<Math.ceil(seconds*60);i++)game.step(1/60);}

test('princess towers acquire and damage ground and flying enemies across their bridge',()=>{
  for(const team of[0,1])for(const lane of[0,1])for(const key of['snorlax','zubat'])for(const y of[BRIDGE.top,400,BRIDGE.bottom]){
    const{game,tower,events}=arena(team,lane),unit=game.spawn(key,1-team,LANES[lane],y,0);
    unit.card={...unit.card,speed:0,damage:0};
    game.step(1/60);assert.equal(tower.target,unit,`${team}/${lane}/${key} at ${y}`);
    run(game,.85);
    assert.ok(events.some(e=>e.type==='attackRelease'&&e.attacker===tower&&e.target===unit));
    assert.ok(unit.hp<unit.maxHp,`${team}/${lane}/${key} took no damage at ${y}`);
  }
});

test('the first princess shot starts and releases while an approaching tank is on the bridge',()=>{
  for(const team of[0,1])for(const lane of[0,1]){
    const{game,tower,events}=arena(team,lane),unit=game.spawn('snorlax',1-team,LANES[lane],team?460:340,0);
    const positions=[];game.onEvent=event=>{events.push(event);if(['attackStart','attackRelease'].includes(event.type)&&event.attacker===tower)positions.push({type:event.type,y:unit.y});};
    run(game,12);
    for(const type of['attackStart','attackRelease']){
      const first=positions.find(p=>p.type===type);assert.ok(first,`${type} never happened`);
      assert.ok(first.y>=BRIDGE.top&&first.y<=BRIDGE.bottom,JSON.stringify({team,lane,first}));
    }
  }
});

test('a princess cancels its pending shot when the victim retreats beyond its range',()=>{
  for(const team of[0,1]){
    const{game,tower,events}=arena(team),direction=team?1:-1,unit=game.spawn('snorlax',1-team,tower.x,tower.y+direction*(tower.range-1),0);
    unit.card={...unit.card,speed:0,damage:0};game.step(1/60);
    assert.ok(events.some(e=>e.type==='attackStart'&&e.attacker===tower));
    unit.y=tower.y+direction*(tower.range+1);run(game,.3);
    assert.ok(!events.some(e=>e.type==='attackRelease'&&e.attacker===tower));
  }
});

test('danger previews agree with tower acquisition on the bridge and beyond its far bank',()=>{
  for(const team of[0,1])for(const lane of[0,1])for(const key of['pikachu','charizard']){
    const{game,tower}=arena(team,lane),enemy=1-team,farBank=team?BRIDGE.bottom:BRIDGE.top;
    const beyond=farBank+(team?1:-1);
    for(const y of[BRIDGE.top,400,BRIDGE.bottom,beyond]){
      const unit=game.spawn(key,enemy,tower.x,y,0);unit.card={...unit.card,speed:0,damage:0};
      game.step(1/60);
      assert.equal(game.deploymentThreats(enemy,key,tower.x,y,true).includes(tower),y!==beyond);
      assert.equal(tower.target===unit,y!==beyond);unit.hp=0;
    }
  }
});

test('ground troops stay on both bridges while crossing the narrowed river in both directions',()=>{
  for(const team of[0,1])for(const lane of[0,1]){
    const{game}=arena(team,lane);game.towers.forEach(t=>t.active=false);
    const unit=game.spawn('snorlax',team,300,team?340:460,0);let crossed=false;
    unit.lane=lane;
    for(let i=0;i<30*60;i++){
      game.move(unit,game.towers.find(t=>t.team!==team&&t.lane===lane),1/60);
      if(unit.y>RIVER.top&&unit.y<RIVER.bottom){crossed=true;assert.ok(Math.abs(unit.x-LANES[lane])<=30);}
    }
    assert.ok(crossed);assert.ok(team?unit.y>BRIDGE.bottom:unit.y<BRIDGE.top);
  }
});

test('each match assigns opposite royal guardians and either species can be on the player side',()=>{
  const species=new Set();
  for(let seed=1;seed<=64;seed++){
    const game=new Game({seed:seed*104729}),kings=game.towers.filter(t=>t.king);
    assert.deepEqual(kings.map(t=>t.guard.id).sort((a,b)=>a-b),[31,34]);
    species.add(kings.find(t=>t.team===0).guard.id);
    assert.deepEqual(new Game({seed:seed*104729}).towers.map(t=>t.guard.id),game.towers.map(t=>t.guard.id));
  }
  assert.equal(species.size,2);
});

test('royal guardians keep their identity through server snapshots and the opponent perspective',()=>{
  const game=new Game({seed:9182}),snapshot=packGame(game),other=unpackGame(perspective(snapshot,1));
  for(const king of game.towers.filter(t=>t.king)){
    const mirrored=other.towers.find(t=>t.id===king.id);
    assert.equal(mirrored.guard.id,king.guard.id);assert.equal(mirrored.team,1-king.team);
  }
});

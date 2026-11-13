import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, DEFAULT_DECK, W, H, TILE, LANES, RIVER, BRIDGE, DEPLOY_GRID, KING_Y, snapToCell } from '../dist/engine.js';
import { packGame, unpackGame, perspective } from '../dist/snapshot.js';

function arena(team=0,lane=0){
  const events=[],game=new Game({seed:9182,cpuDeck:DEFAULT_DECK,onEvent:event=>events.push(event)});
  game.start();game.aiEnabled=false;
  const tower=game.towers.find(t=>t.team===team&&t.lane===lane);
  game.towers.forEach(t=>t.active=t===tower);tower.cooldown=0;
  return{game,tower,events};
}
function run(game,seconds){for(let i=0;i<Math.ceil(seconds*60);i++)game.step(1/60);}

test('exactly one complete deployment row remains behind each royal tower',()=>{
  const game=new Game();
  for(const team of[0,1]){
    const king=game.towers.find(t=>t.team===team&&t.king);
    const rows=Array.from({length:DEPLOY_GRID.rows},(_,i)=>DEPLOY_GRID.top+TILE/2+i*TILE).filter(y=>y>=40&&y<=760&&(team?y<king.y-king.radius:y>king.y+king.radius));
    assert.deepEqual(rows,[team?40:760]);assert.equal(king.y,KING_Y[team]);
    assert.ok(game.canDeploy(team,'pikachu',300,rows[0]));assert.ok(game.canDeploy(team,'golem',300,rows[0]));
    assert.equal(game.canDeploy(team,'pikachu',300,rows[0]+(team?TILE:-TILE)),false);
  }
});

test('old online rooms restore the same one-row rear geometry in either perspective',()=>{
  const saved=packGame(new Game());for(const tower of saved.towers)if(tower.king){tower.y=tower.team?118:682;tower.hp=2345;}
  for(const team of[0,1]){
    const game=unpackGame(perspective(saved,team));
    for(const king of game.towers.filter(t=>t.king)){assert.equal(king.y,KING_Y[king.team]);assert.equal(king.hp,2345);assert.ok(game.canDeploy(king.team,'pikachu',300,king.team?40:760));}
  }
});

test('princess towers damage enemies from the bridge midpoint through their own bank on the real grid',()=>{
  for(const team of[0,1])for(const lane of[0,1])for(const key of['snorlax','zubat'])for(const offset of[-TILE,0,TILE])for(const y of[H/2,team?RIVER.top:RIVER.bottom,team?BRIDGE.top:BRIDGE.bottom]){
    const{game,tower,events}=arena(team,lane),point=snapToCell(1-team,LANES[lane]+offset,y),unit=game.spawn(key,1-team,point.x,y,0);
    unit.card={...unit.card,speed:0,damage:0};
    game.step(1/60);assert.equal(tower.target,unit,`${team}/${lane}/${key} at ${y}`);
    run(game,.85);
    assert.ok(events.some(e=>e.type==='attackRelease'&&e.attacker===tower&&e.target===unit));
    assert.ok(unit.hp<unit.maxHp,`${team}/${lane}/${key} took no damage at ${y}`);
  }
});

test('a normally deployed tank draws its first princess shot at the bridge midpoint',()=>{
  for(const team of[0,1])for(const lane of[0,1])for(const offset of[-TILE,0,TILE]){
    const{game,tower,events}=arena(team,lane),deployment=game.deploy(1-team,1,LANES[lane]+offset,H/2);
    assert.ok(deployment.ok);const unit=game.units[0];
    const positions=[];game.onEvent=event=>{events.push(event);if(['attackStart','attackRelease'].includes(event.type)&&event.attacker===tower)positions.push({type:event.type,y:unit.y});};
    run(game,12);
    for(const type of['attackStart','attackRelease']){
      const first=positions.find(p=>p.type===type);assert.ok(first,`${type} never happened`);
      assert.ok(Math.abs(first.y-H/2)<=6,JSON.stringify({team,lane,offset,first}));
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

test('danger previews and targeting start at midbridge and exclude the approaching half',()=>{
  for(const team of[0,1])for(const lane of[0,1])for(const key of['pikachu','charizard']){
    const{game,tower}=arena(team,lane),enemy=1-team,direction=team?1:-1;
    const point=game.resolveDeployment(team,key,LANES[lane],H/2);
    for(const y of[point.y+direction*TILE,H/2,H/2+direction*4,H/2+direction*TILE]){
      const covered=direction*(y-H/2)<=0;
      const unit=game.spawn(key,enemy,point.x,y,0);unit.card={...unit.card,speed:0,damage:0};
      game.step(1/60);
      assert.equal(game.deploymentThreats(enemy,key,point.x,y,true).includes(tower),covered);
      assert.equal(tower.target===unit,covered);unit.hp=0;
    }
  }
});

test('old online matches use the current princess reach after reconnecting or reversing perspective',()=>{
  for(const oldRange of[180,252])for(const team of[0,1])for(const view of[0,1]){
    const{game,tower}=arena(team),point=snapToCell(1-team,LANES[0],H/2),unit=game.spawn('snorlax',1-team,point.x,point.y,0);
    unit.card={...unit.card,speed:0,damage:0};tower.hp=2100;
    const saved=packGame(game);for(const t of saved.towers)if(!t.king)t.range=oldRange;
    const restored=unpackGame(perspective(saved,view)),defender=restored.towers.find(t=>t.id===tower.id),victim=restored.units[0];
    assert.equal(defender.hp,2100);assert.equal(victim.x,view?W-point.x:point.x);
    run(restored,.85);assert.ok(victim.hp<victim.maxHp);
    victim.y=H/2+(defender.team?1:-1)*TILE;restored.step(1/60);
    assert.equal(defender.target,null);
    assert.deepEqual(restored.towers.filter(t=>t.king).map(t=>t.range),game.towers.filter(t=>t.king).map(t=>t.range));
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

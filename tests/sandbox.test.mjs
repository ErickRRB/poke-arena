import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {SandboxGame} from '../dist/sandbox.js';
const run=(g,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)g.step(1/60);};

test('a prepared side stays frozen, including spawn, cooldown and match clock',()=>{
  const g=new SandboxGame();assert.ok(g.place(1,'geodude',158,304).ok);
  const before=structuredClone(g.units);run(g,10);assert.deepEqual(g.units,before);assert.equal(g.elapsed,0);
  assert.ok(g.place(0,'rhydon',158,472).ok);assert.equal(g.state,'paused');assert.deepEqual([...g.preparedTeams],[1,0]);
  g.resume();run(g,6);assert.ok(g.elapsed>5.9);assert.ok(g.measurement(0).total+g.measurement(1).total>0);
});
test('encounters within sight give the same interactions as the production engine',()=>{
  for(const pair of[['roselia','diglettHorde'],['rhydon','geodude'],['charmander','pandilla'],['nuzleaf','rhydon']]){
    const g=new SandboxGame({seed:30}),normal=new Game({seed:30,tutorial:true});normal.towers.forEach(t=>t.hp=0);normal.start();
    for(const[team,key,y]of[[0,pair[0],448],[1,pair[1],352]]){
      assert.ok(g.place(team,key,158,y).ok);normal.hands[team][0]=key;normal.energy[team]=10;assert.ok(normal.deploy(team,0,158,y).ok);
    }
    g.resume();run(g,8);run(normal,8);
    const state=game=>game.units.map(({key,team,x,y,hp})=>({key,team,x,y,hp}));
    assert.deepEqual(state(g),state(normal),pair.join(' / '));assert.deepEqual(g.stats,normal.stats);
  }
});
test('any playable card can be deployed repeatedly without changing the deck or card stats',()=>{
  for(const[key,card]of Object.entries(CARDS).filter(([,c])=>!c.token)){
    const g=new SandboxGame(),deck=structuredClone(g.hands),stats=structuredClone(card);
    for(let i=0;i<2;i++)assert.ok(g.place(0,key,158,500).ok,key);
    assert.deepEqual(g.hands,deck);assert.deepEqual(card,stats);assert.equal(g.energy[0],10);
  }
});
test('towers recover rapidly after two quiet seconds, and a later hit resets the wait',()=>{
  const g=new SandboxGame({mode:'towers'}),tower=g.towers.find(t=>t.team===1&&!t.king);g.resume();
  g.damage(tower,700,0);run(g,1.9);assert.equal(tower.hp,2300);
  g.damage(tower,100,0);run(g,1.9);assert.equal(tower.hp,2200);run(g,.4);assert.equal(tower.hp,3000);
  assert.equal(g.measurement(0).tower,800);assert.equal(g.measurement(0).total,800);
});
test('destroying a royal tower never ends a sandbox and it revives after two seconds',()=>{
  const g=new SandboxGame({mode:'towers'}),king=g.towers.find(t=>t.team===1&&t.king);g.resume();
  g.damage(king,99999,0);assert.equal(king.hp,0);assert.equal(g.state,'playing');run(g,2.1);
  assert.equal(king.hp,king.maxHp);assert.equal(g.state,'playing');assert.equal(king.target,null);
});
test('the princess scenario has one real tower, and tower attacks can be switched off',()=>{
  for(const towerFire of[true,false]){
    const g=new SandboxGame({mode:'princess',towerFire});assert.equal(g.visibleTowers.length,1);assert.equal(g.visibleTowers[0].maxHp,3000);
    const target=g.spawn('snorlax',0,158,350,0);g.resume();run(g,1.4);
    assert.equal(target.hp<target.maxHp,towerFire);
  }
});
test('measurements count real health and shield damage, exclude healing and discard stale DPS samples',()=>{
  const g=new SandboxGame(),target=g.spawn('geodude',1,158,300,0);target.shield=50;g.resume();
  g.damage(target,100,0);assert.equal(g.measurement(0).total,50);assert.equal(g.measurement(0).hp,0);
  g.damage(target,99999,0);assert.equal(g.measurement(0).total,target.maxHp+50);assert.equal(g.measurement(0).hits,2);
  run(g,6);assert.equal(g.measurement(0).dps,0);assert.equal(g.samples.length,0);assert.equal(g.measurement(0).total,target.maxHp+50);
});
test('the sandbox never enables the CPU, runs out of time, or unlocks the other deployment half',()=>{
  const g=new SandboxGame();assert.equal(g.resolveDeployment(0,'geodude',158,280),null);assert.equal(g.resolveDeployment(1,'geodude',158,520),null);
  g.resume();run(g,181);assert.equal(g.state,'playing');assert.equal(g.aiEnabled,false);assert.equal(g.units.length,0);
});

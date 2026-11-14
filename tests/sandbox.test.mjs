import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {SandboxGame} from '../dist/sandbox.js';
const run=(g,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)g.step(1/60);};

test('duel columns use passive immortal lane towers without preparing either team',()=>{
  const g=new SandboxGame({towerFire:true}),other=new SandboxGame();
  assert.equal(g.preparedTeams.size,0);assert.equal(g.visibleTowers.length,4);
  for(const team of[0,1])for(const lane of[0,1]){
    const tower=g.visibleTowers.find(t=>t.team===team&&t.lane===lane),hp=tower.hp;
    g.resume();g.damage(tower,99999,1-team);assert.equal(tower.hp,hp);assert.equal(g.measurement(1-team).tower,99999*(lane+1));
    const enemy=g.spawn('rhydon',1-team,tower.x,tower.y+(team?40:-40),0),before=enemy.hp;
    run(g,.4);assert.equal(enemy.hp,before,'goal towers never fire');
  }
  assert.equal(other.elapsed,0);assert.equal(other.state,'paused');assert.equal(other.preparedTeams.size,0);
});

test('both sides march to their lane tower until a troop enters sight',()=>{
  for(const team of[0,1]){
    const g=new SandboxGame(),a=g.spawn('rhydon',team,158,team?390:410,0),b=g.spawn('roselia',1-team,442,team?410:390,0);
    b.stun=999;g.resume();run(g,.2);
    assert.equal(a.target?.labImmortal,true);assert.equal(a.target.team,1-team);assert.equal(a.target.lane,0);
    b.x=a.x+110;b.y=a.y;run(g,.1);assert.equal(a.target,b);
    b.x=a.x+190;b.y=a.y;run(g,.1);assert.notEqual(a.target,b,'out-of-sight troops are not pursued');
    b.x=a.x+110;b.y=a.y;run(g,.1);assert.equal(a.target,b,'a defender can be acquired again');
    const buildingSeeker=g.spawn('golem',team,442,team?390:410,0);assert.equal(g.acquire(buildingSeeker)?.labImmortal,true);
  }
});

test('production targeting honors Rhydon sight for acquisition and pursuit in both directions',()=>{
  for(const team of[0,1]){
    const g=new Game({tutorial:true});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);
    const a=g.spawn('rhydon',team,158,400,0),b=g.spawn('roselia',1-team,308,400,0);b.stun=999;
    assert.notEqual(g.acquire(a),b,'150 is outside sight 120');
    b.x=268;assert.equal(g.acquire(a),b);a.target=b;a.engaged=true;
    b.x=350;run(g,.1);assert.notEqual(a.target,b,'a target outside sight is released');
  }
});

test('a prepared side stays frozen, including spawn, cooldown and match clock',()=>{
  const g=new SandboxGame();assert.ok(g.place(1,'geodude',158,304).ok);
  const before=structuredClone(g.units);run(g,10);assert.deepEqual(g.units,before);assert.equal(g.elapsed,0);
  assert.ok(g.place(0,'rhydon',158,472).ok);assert.equal(g.state,'paused');assert.deepEqual([...g.preparedTeams],[1,0]);
  g.resume();run(g,6);assert.ok(g.elapsed>5.9);assert.ok(g.measurement(0).total+g.measurement(1).total>0);
});
test('encounters within sight give the same interactions as the production engine',()=>{
  for(const pair of[['roselia','diglettHorde'],['rhydon','geodude'],['charmander','pandilla'],['nuzleaf','rhydon']]){
    const g=new SandboxGame({seed:30}),normal=new Game({seed:30,tutorial:true});normal.towers.forEach(t=>{if(t.king)t.hp=0;else t.active=false;});normal.start();
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

test('hero abilities are usable in a paused experiment without consuming resources or resuming time',()=>{
  const g=new SandboxGame(),hero=g.spawn('kyogre',0,300,500,0),target=g.spawn('geodude',1,350,500,0);g.energy[0]=0;
  assert.ok(g.useAbility(0,hero.id).ok);assert.ok(target.hp<target.maxHp);assert.equal(g.energy[0],10);assert.equal(g.state,'paused');assert.equal(g.elapsed,0);assert.equal(hero.abilityUsed,true);
  assert.equal(g.useAbility(0,hero.id).ok,false,'normal once-per-body ability rules still apply');
});

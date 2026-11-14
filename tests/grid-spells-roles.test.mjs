import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, CARDS, DEFAULT_DECK, TILE, DEPLOY_GRID, W, H } from '../dist/engine.js';
import { packGame, unpackGame, perspective } from '../dist/snapshot.js';

function fresh(key='pikachu') {
  const game=new Game({deck:[key,...DEFAULT_DECK.filter(k=>k!==key).slice(0,7)],seed:611});
  game.start();game.aiEnabled=false;game.energy=[10,10];game.towers.forEach(t=>{t.active=false;});
  return game;
}
function run(game,seconds,dt=1/120){for(let time=0;time<seconds-1e-9;time+=dt)game.step(Math.min(dt,seconds-time));}
function frozen(game,key,team,x,y){const u=game.spawn(key,team,x,y,0);u.card={...u.card,speed:0,passive:true,entryDamage:0};u.entryPending=false;return u;}
const onGrid=p=>Math.abs((p.x-TILE/2)/TILE-Math.round((p.x-TILE/2)/TILE))<1e-9&&Math.abs((p.y-DEPLOY_GRID.top-TILE/2)/TILE-Math.round((p.y-DEPLOY_GRID.top-TILE/2)/TILE))<1e-9;

test('units, buildings and log starts share a discrete mirrored placement grid',()=>{
  for(const key of ['snorlax','pikachu','blastoise','log'])for(const[x,y]of[[101.3,512.7],[288,560],[315,702],[300,752],[158,400]]){
    const a=fresh(key),b=fresh(key),p=a.resolveDeployment(0,key,x,y),q=b.resolveDeployment(1,key,W-x,H-y);
    assert.ok(p&&q,key);assert.ok(onGrid(p)&&onGrid(q));assert.deepEqual(q,{x:W-p.x,y:H-p.y});
    const result=a.deploy(0,0,x,y);assert.ok(result.ok);assert.deepEqual({x:result.x,y:result.y},p);
    assert.ok((key==='log'?a.spells:a.units).every(onGrid));
  }
});

test('a whole cell shares one placement and changes only on crossing a cell boundary',()=>{
  const g=fresh('snorlax');
  const placements=[[149,489],[151,485],[166,493]].map(([x,y])=>g.resolveDeployment(0,'snorlax',x,y));
  assert.deepEqual(placements[0],placements[1]);assert.deepEqual(placements[1],placements[2]);
  assert.notDeepEqual(g.resolveDeployment(0,'snorlax',171,485),placements[0]);
});

test('swarm previews and deployment occupy the same distinct physical positions even next to towers',()=>{
  for(const key of['zubat','treecko','sandshrew','diglettHorde','poochyenaPack'])for(const[x,y]of[[300,448],[158,628],[300,752]]){
    const g=fresh(key),p=g.resolveDeployment(0,key,x,y),expected=g.deploymentPositions(0,key,p.x,p.y);
    const result=g.deploy(0,0,x,y);assert.ok(result.ok);
    assert.deepEqual(g.units.map(u=>({x:u.x,y:u.y})),expected);
    assert.equal(new Set(g.units.map(u=>`${u.x},${u.y}`)).size,CARDS[key].count);
    assert.ok(g.units.every(u=>Number.isFinite(u.x)&&Number.isFinite(u.y)&&u.x>=44&&u.x<=556&&u.y>=40&&u.y<=760));
  }
});

test('king remains idle near enemies and through zero-damage status effects',()=>{
  for(const team of[0,1]){
    const g=fresh(),king=g.towers.find(t=>t.king&&t.team===team);
    frozen(g,'snorlax',1-team,king.x,king.y+(team?60:-60));
    g.damage(king,0,1-team,{stun:.2});run(g,2);
    assert.equal(king.active,false);assert.equal(king.hp,king.maxHp);assert.equal(king.target,null);assert.equal(king.attack,0);
    g.damage(king,1,1-team);assert.equal(king.active,true);run(g,1.5);assert.ok(king.attackSeq>0);
  }
});

test('only a friendly princess defeat wakes its king, not the other king or a deployed building',()=>{
  const g=fresh(),kings=g.towers.filter(t=>t.king);
  const building=g.spawn('blastoise',0,300,500,0);g.damage(building,9999,1);assert.ok(kings.every(k=>!k.active));
  const princess=g.towers.find(t=>!t.king&&t.team===0);g.damage(princess,1,1);assert.ok(kings.every(k=>!k.active));
  g.damage(princess,9999,1);assert.equal(kings.find(k=>k.team===0).active,true);assert.equal(kings.find(k=>k.team===1).active,false);
});

test('log travels the same finite distance from every legal origin with no target tracking',()=>{
  for(const team of[0,1])for(const origin of[500,650,752]){
    const g=fresh('log');g.hands[team]=g.hands[0].slice();g.queues[team]=g.queues[0].slice();
    const result=g.deploy(team,0,158,team?H-origin:origin);assert.ok(result.ok);
    const spell=g.spells[0],start=spell.y;let last=spell;
    for(let i=0;i<300&&g.spells.length;i++){last=g.spells[0];g.step(.017);}
    assert.ok(!g.spells.length);assert.ok(Math.abs(Math.abs(last.y-start)-CARDS.log.travelDistance)<1e-6);assert.equal(last.x,result.x);
    assert.equal(g.resolveDeployment(team,'log',158,team?650:150),null);
  }
});

test('log hits each ground body once, passes through it and never reaches outside its corridor',()=>{
  const g=fresh('log'),a=frozen(g,'snorlax',1,156,460),far=frozen(g,'snorlax',1,156,150),air=frozen(g,'zubat',1,156,460),side=frozen(g,'snorlax',1,280,460);
  const result=g.deploy(0,0,158,520);run(g,3);
  assert.equal(a.maxHp-a.hp,CARDS.log.damage);assert.equal(far.hp,far.maxHp);assert.equal(air.hp,air.maxHp);assert.equal(side.hp,side.maxHp);
  assert.equal(result.y,520);
});

test('fireball launches from its king and damage waits for distance-dependent flight',()=>{
  const durations=[];
  for(const y of[500,220]){
    const g=fresh('fireball'),victim=frozen(g,'snorlax',1,300,y),king=g.towers.find(t=>t.king&&t.team===0);
    assert.ok(g.deploy(0,0,300,y).ok);const spell=g.spells[0],duration=spell.delay+spell.flightTime;durations.push(duration);
    assert.deepEqual({x:spell.startX,y:spell.startY},{x:king.x,y:king.y});
    run(g,duration-.02);assert.equal(victim.hp,victim.maxHp);run(g,.04);
    assert.equal(victim.maxHp-victim.hp,CARDS.fireball.damage);assert.equal(g.spells.length,0);
  }
  assert.ok(durations[1]>durations[0]+.5);
});

test('fireball keeps its chosen impact area while a moving target can leave it',()=>{
  const g=fresh('fireball'),victim=frozen(g,'snorlax',1,300,250);
  g.deploy(0,0,300,250);run(g,.2);victim.x=500;run(g,2);assert.equal(victim.hp,victim.maxHp);
});

test('fireball flight and fixed log distance survive snapshots and both perspectives',()=>{
  const g=fresh('fireball');g.deploy(0,0,175,230);run(g,.3);
  const snapshot=packGame(g),mirror=perspective(snapshot,1),roundtrip=perspective(mirror,1);
  assert.deepEqual(roundtrip,snapshot);
  const clone=unpackGame(snapshot);run(g,2);run(clone,2);assert.deepEqual(JSON.parse(JSON.stringify(packGame(clone))),JSON.parse(JSON.stringify(packGame(g))));
});

test('Pikachu has the four-elixir electric-control role and hits two targets or concentrates both bolts',()=>{
  assert.equal(CARDS.pikachu.cost,4);assert.equal(CARDS.pikachu.hp,714);assert.equal(CARDS.pikachu.damage,117);assert.equal(CARDS.pikachu.interval,1.8);
  for(const count of[1,2,3]){
    const g=fresh(),p=g.spawn('pikachu',0,300,550,0);p.entryPending=false;p.card={...p.card,speed:0};
    const victims=Array.from({length:count},(_,i)=>frozen(g,'snorlax',1,300+i*35,450));
    g.attack(p,victims[0]);p.cooldown=100;run(g,.7);
    const damage=victims.map(v=>v.maxHp-v.hp);
    assert.deepEqual(damage,count===1?[234]:count===2?[117,117]:[117,117,0]);
    assert.ok(victims.slice(0,2).every(v=>v.stun>0));
  }
});

test('Pikachu arrival damages ground and air in area and resets queued attacks exactly once',()=>{
  const g=fresh(),a=frozen(g,'snorlax',1,280,500),air=frozen(g,'charizard',1,320,500),far=frozen(g,'snorlax',1,460,500);
  a.attack=1;a.target=far;
  g.deploy(0,0,300,500);g.units.find(u=>u.key==='pikachu').cooldown=100;run(g,.7);assert.equal(a.hp,a.maxHp);
  run(g,.4);assert.equal(a.maxHp-a.hp,192);assert.equal(air.maxHp-air.hp,192);assert.equal(far.hp,far.maxHp);assert.equal(a.attack,0);assert.equal(a.target,null);
  const p=g.units.find(u=>u.key==='pikachu');p.card={...p.card,passive:true};run(g,.4);assert.equal(a.maxHp-a.hp,192);
});

test('species scales make bats visibly smaller than ordinary troops and Snorlax larger',()=>{
  assert.ok(CARDS.zubat.scale<2.05*.8);assert.ok(CARDS.snorlax.scale>2*1.15);
  for(const c of Object.values(CARDS))if(c.id)assert.ok(Number.isFinite(c.scale)&&c.scale>0,c.name);
  assert.equal(CARDS.diglett.scale,CARDS.diglettHorde.scale);
});

test('only a log from the front deployment row reaches a princess on either side',()=>{
  for(const team of[0,1])for(const front of[true,false]){
    const g=fresh('log');g.hands[team]=g.hands[0].slice();g.queues[team]=g.queues[0].slice();
    const tower=g.towers.find(t=>!t.king&&t.team!==team&&t.lane===0),y=front?448:472;
    assert.ok(g.deploy(team,0,158,team?H-y:y).ok);run(g,2);
    assert.equal(tower.maxHp-tower.hp,front?CARDS.log.towerDamage:0);
  }
});

test('CPU never throws a log at an unreachable distant target',()=>{
  const g=fresh('log');g.aiEnabled=true;g.aiClock=0;g.random=()=>0;g.energy[1]=5;
  g.hands[1]=['log','mewtwo','kyogre','groudon'];
  const target=frozen(g,'snorlax',0,158,700);g.ai(.01);
  assert.equal(g.spells.length,0);assert.equal(g.energy[1],5);
  target.y=420;g.aiClock=0;g.ai(.01);assert.equal(g.spells.length,1);assert.equal(g.spells[0].startY,352);assert.equal(g.energy[1],3);
});

test('a shield absorbs its breaking blow without spilling excess damage into health',()=>{
  const g=fresh(),defender=g.spawn('sandshrew',0,300,500,0);
  g.damage(defender,10000,1);assert.equal(defender.shield,0);assert.equal(defender.hp,defender.maxHp);
  g.damage(defender,10000,1);assert.equal(defender.hp,0);
});

test('Slowbro enters with an ice wave and slows a group with its ranged splash',()=>{
  const g=fresh('slowbro'),a=frozen(g,'snorlax',1,300,480),b=frozen(g,'snorlax',1,326,480);
  g.deploy(0,0,300,500);const caster=g.units.find(u=>u.key==='slowbro');caster.cooldown=100;
  run(g,1.1);assert.equal(a.maxHp-a.hp,CARDS.slowbro.entryDamage);assert.equal(b.maxHp-b.hp,CARDS.slowbro.entryDamage);assert.ok(a.slow>0&&b.slow>0);
  a.y=400;b.y=400;g.attack(caster,a);caster.cooldown=100;run(g,.9);
  assert.equal(a.maxHp-a.hp,CARDS.slowbro.entryDamage+CARDS.slowbro.damage);assert.equal(b.maxHp-b.hp,CARDS.slowbro.entryDamage+CARDS.slowbro.damage);
  assert.ok(a.slow>1&&b.slow>1);
});

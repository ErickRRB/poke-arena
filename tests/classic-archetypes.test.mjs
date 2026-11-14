import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS,RIVER,PRINCESS_RANGE} from '../dist/engine.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';
import {validDeck} from '../realtime/src/match.js';

const fresh=()=>{const g=new Game({seed:418});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);return g;};
const run=(g,s)=>{for(let i=0;i<Math.ceil(s*60);i++)g.step(1/60);};
const still=u=>{u.card={...u.card,speed:0,damage:0,passive:true};return u;};
const rounded=data=>JSON.parse(JSON.stringify(data,(k,v)=>typeof v==='number'?Number(v.toFixed(7)):v));

test('Rapidash ignores troops and jumps the river off the bridges, remaining alive after landing',()=>{
  for(const team of[0,1]){
    const g=fresh(),horse=g.spawn('rapidash',team,260,team?380:420,0),enemy=still(g.spawn('grimer',1-team,260,team?385:415,0));
    run(g,.1);assert.equal(horse.leap?.kind,'river');assert.ok(horse.target&&!horse.target.card);
    const clone=unpackGame(packGame(g));run(g,.8);run(clone,.8);
    assert.ok(team?horse.y>RIVER.bottom:horse.y<RIVER.top);assert.equal(horse.hp,horse.maxHp);assert.equal(enemy.hp,enemy.maxHp);
    assert.deepEqual(rounded(packGame(clone)),rounded(packGame(g)));
  }
});

test('Roselia can damage a crown tower from beyond its defensive range and covers air at long range',()=>{
  const g=fresh(),tower=g.towers.find(t=>t.team===1&&!t.king&&t.lane===0);tower.active=true;
  const flower=g.spawn('roselia',0,tower.x,tower.y+270,0);assert.ok(CARDS.roselia.range>PRINCESS_RANGE);
  run(g,4);assert.ok(tower.hp<tower.maxHp);assert.equal(flower.hp,flower.maxHp);
  const other=fresh(),shooter=other.spawn('roselia',0,300,550,0),flyer=still(other.spawn('charizard',1,300,300,0));
  run(other,2);assert.ok(flyer.hp<flyer.maxHp);assert.equal(shooter.y,550);
});

test('Graveler rolls through aligned ground troops once, pushes light bodies and leaves air and allies alone',()=>{
  const g=fresh(),bowler=g.spawn('graveler',0,300,550,0),front=still(g.spawn('grimer',1,300,475,0)),back=still(g.spawn('grimer',1,300,440,0));
  const air=still(g.spawn('charizard',1,300,460,0)),side=still(g.spawn('grimer',1,365,450,0)),ally=still(g.spawn('grimer',0,300,450,0));
  g.attack(bowler,front);bowler.cooldown=100;run(g,1.5);
  for(const u of[front,back])assert.equal(u.maxHp-u.hp,CARDS.graveler.damage);
  assert.ok(front.y<475&&back.y<440);for(const u of[air,side,ally])assert.equal(u.hp,u.maxHp);
});

test('a rolling stone survives the original target dying and restores without hitting the same body twice',()=>{
  const g=fresh(),bowler=g.spawn('graveler',0,300,550,0),front=still(g.spawn('diglett',1,300,500,0)),back=still(g.spawn('grimer',1,300,425,0));
  g.attack(bowler,front);bowler.cooldown=100;run(g,.9);assert.equal(front.hp,0);assert.equal(g.projectiles.length,1);
  const packed=packGame(g),clone=unpackGame(packed),flipped=unpackGame(perspective(packed,1));
  assert.equal(clone.projectiles.length,1);run(g,.8);run(clone,.8);run(flipped,.8);
  assert.equal(back.maxHp-back.hp,CARDS.graveler.damage);assert.deepEqual(rounded(packGame(clone)),rounded(packGame(g)));
  const mirrored=flipped.units.find(u=>u.id===back.id);assert.equal(mirrored.hp,back.hp);
});

test('Nuzleaf fires single quick shots at ground and air and remains vulnerable to the rolling spell',()=>{
  for(const key of['grimer','charizard']){
    const g=fresh(),shooter=g.spawn('nuzleaf',0,300,550,0),target=still(g.spawn(key,1,300,425,0));
    run(g,2);assert.ok(target.maxHp-target.hp>=CARDS.nuzleaf.damage*2);assert.equal(shooter.y,550);
    g.damage(shooter,CARDS.log.damage,1);assert.equal(shooter.hp,0);
  }
});

test('the ambush travels first, then releases exactly three Sneasel around a tower for either team',()=>{
  for(const team of[0,1]){
    const g=fresh(),tower=g.towers.find(t=>t.team!==team&&!t.king&&t.lane===0);g.hands[team][0]='sneaselAmbush';g.energy[team]=10;
    assert.ok(g.deploy(team,0,tower.x,tower.y).ok);assert.equal(g.energy[team],7);run(g,.8);assert.equal(g.units.length,0);
    const clone=unpackGame(packGame(g));run(g,.7);run(clone,.7);
    const units=g.units.filter(u=>u.key==='sneaselToken');assert.equal(units.length,3);assert.ok(units.every(u=>u.team===team));assert.equal(tower.hp,tower.maxHp);
    assert.equal(new Set(units.map(u=>u.spawnGroup.id)).size,1);
    for(const u of units)assert.ok(g.towers.every(t=>Math.hypot(u.x-t.x,u.y-t.y)>=t.radius+u.radius*.7));
    assert.deepEqual(rounded(packGame(clone)),rounded(packGame(g)));run(g,2);assert.ok(tower.hp<tower.maxHp);assert.equal(g.units.filter(u=>u.key==='sneaselToken').length,3);
  }
});

test('new archetypes are valid online deck cards while the retired Exeggutor and summons are rejected',()=>{
  const cards=['rapidash','roselia','graveler','nuzleaf','sneaselAmbush','vivero','log','thunder'];
  assert.equal(validDeck(cards),true);assert.equal(validDeck(['exeggutor',...cards.slice(1)]),false);assert.equal(validDeck(['sneaselToken',...cards.slice(1)]),false);
});

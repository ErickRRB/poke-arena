import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS,RIVER,PRINCESS_RANGE,snapToCell} from '../dist/engine.js';
import {spellPreviewTargets} from '../dist/spell-preview.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';
import {validDeck} from '../realtime/src/match.js';
import {readFileSync} from 'node:fs';

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

test('Ampharos is a four-elixir Tesla that stays concealed, spends its lifetime and wakes for ground or air',()=>{
  for(const enemy of['grimer','charizard']){
    const g=fresh(),defense=g.spawn('ampharos',0,300,530,0);run(g,.5);assert.equal(defense.burrowed,true);assert.ok(defense.hp<defense.maxHp);assert.equal(CARDS.ampharos.cost,4);
    const a=still(g.spawn(enemy,1,300,430,0)),b=still(g.spawn(enemy,1,340,425,0));run(g,.7);
    assert.equal(defense.burrowed,false);assert.equal(a.maxHp-a.hp,220);assert.equal(b.hp,b.maxHp);assert.equal(a.stun,0);
    a.x=b.x=500;run(g,.25);assert.equal(defense.burrowed,true);assert.equal(defense.burrowProgress,1);assert.equal(defense.target,null);
  }
});

test('concealed Tesla cannot be targeted or hit by ordinary spells while Earthquake reaches it',()=>{
  for(const key of['fireball','lightning','spikes','earthquake']){
    const g=fresh(),defense=g.spawn('ampharos',1,300,280,0),control=unpackGame(packGame(g));
    const preview=spellPreviewTargets(g,CARDS[key],g.resolveDeployment(0,key,300,280));assert.equal(preview.includes(defense),key==='earthquake');
    const attacker=g.spawn('onix',0,300,440,0);assert.equal(g.validTarget(attacker,defense),false);g.units.pop();
    g.hands[0][0]=key;g.energy[0]=10;assert.ok(g.deploy(0,0,300,280).ok);run(g,4);run(control,4);
    const damage=control.units[0].hp-defense.hp;assert.ok(key==='earthquake'?damage>500:Math.abs(damage)<1e-8,key);
  }
});

test('concealment and its transition survive online restoration and the opposite perspective',()=>{
  const g=fresh(),defense=g.spawn('ampharos',0,300,530,0);still(g.spawn('grimer',1,300,430,0));run(g,.1);assert.ok(defense.burrowProgress>0&&defense.burrowProgress<1);
  const clone=unpackGame(packGame(g)),other=unpackGame(perspective(packGame(g),1));run(g,1);run(clone,1);run(other,1);
  assert.deepEqual(rounded(packGame(clone)),rounded(packGame(g)));assert.equal(other.units[0].burrowed,defense.burrowed);assert.equal(other.units[0].hp,defense.hp);
});

test('spell aiming resolves to cells and the tower center, and deployment uses that exact preview',()=>{
  for(const team of[0,1])for(const key of['sneaselAmbush','fireball','thunder','nightmare','earthquake'])for(const[x,y]of[[161,171],[207,173],[53,49],[549,749],[303,407]]){
    const g=fresh(),pointer={x:team?600-x:x,y:team?800-y:y},point=g.resolveDeployment(team,key,pointer.x,pointer.y);
    g.hands[team][0]=key;g.energy[team]=10;const deployed=g.deploy(team,0,pointer.x,pointer.y);assert.ok(deployed.ok);
    assert.deepEqual({x:deployed.x,y:deployed.y},point);assert.deepEqual({x:g.spells[0].x,y:g.spells[0].y},point);
    const onTower=g.towers.some(t=>t.x===point.x&&t.y===point.y);assert.ok(onTower||JSON.stringify(snapToCell(team,point.x,point.y))===JSON.stringify(point));
  }
});

test('the barrel can be centered on a tower or offset so all three summons arrive on one side',()=>{
  for(const side of[-1,0,1])for(const team of[0,1]){
    const g=fresh(),tower=g.towers.find(t=>t.team!==team&&!t.king&&t.lane===0),x=tower.x+side*48;
    g.hands[team][0]='sneaselAmbush';g.energy[team]=10;const placed=g.deploy(team,0,x,tower.y);assert.ok(placed.ok);if(!side)assert.deepEqual({x:placed.x,y:placed.y},{x:tower.x,y:tower.y});
    run(g,1.5);const summons=g.units.filter(u=>u.key==='sneaselToken');assert.equal(summons.length,3);
    if(side)assert.ok(summons.every(u=>(u.x-tower.x)*side>0));else assert.ok(summons.some(u=>u.x<tower.x)&&summons.some(u=>u.x>tower.x));
  }
});

test('Rhydon replaces Registeel in new matches and still delivers its slow heavy attack',()=>{
  const cards=['rhydon','ampharos','pandilla','roselia','nuzleaf','sneaselAmbush','log','thunder'];assert.equal(validDeck(cards),true);assert.equal(validDeck(['registeel',...cards.slice(1)]),false);
  const g=fresh(),attacker=g.spawn('rhydon',0,300,530,0),enemy=still(g.spawn('snorlax',1,300,495,0));g.attack(attacker,enemy);attacker.cooldown=100;run(g,.8);assert.equal(enemy.hp,enemy.maxHp);run(g,.4);assert.equal(enemy.maxHp-enemy.hp,1080);
});

test('the gang matches the project level-11 Goblin Gang health, damage, cadence, speed and composition',()=>{
  const reference=JSON.parse(readFileSync(new URL('../docs/clash-royale-level11.json',import.meta.url))),find=key=>reference.cards.find(card=>card.key===key),gang=find('goblin-gang');
  const g=fresh();g.hands[0][0]='pandilla';g.energy[0]=10;g.deploy(0,0,300,530);assert.equal(CARDS.pandilla.cost,gang.elixir);
  for(const[key,row,base]of[['poochyenaToken',0,find('goblins')],['raltsToken',1,find('spear-goblins')]]){
    const units=g.units.filter(u=>u.key===key),ref=gang.level11[row];assert.equal(units.length,3);
    for(const u of units){assert.equal(u.hp,Number(ref.Hitpoints));assert.equal(u.card.damage,Number(ref.Damage));assert.equal(u.card.interval,parseFloat(base.traits['Hit Speed']));assert.equal(u.card.speed,40);assert.equal(u.card.range,key==='raltsToken'?Number(base.traits.Range)*24:12);}
  }
});

test('piercing shots keep flying after the first victim is gone and restore in either online perspective',()=>{
  const g=fresh(),source=g.spawn('alakazam',0,300,550,0),first=still(g.spawn('diglett',1,300,500,0)),last=still(g.spawn('grimer',1,300,410,0));g.attack(source,first);source.cooldown=100;run(g,.5);
  assert.equal(first.hp,0);assert.ok(g.projectiles.some(p=>p.linear));const clone=unpackGame(packGame(g)),other=unpackGame(perspective(packGame(g),1));run(g,.4);run(clone,.4);run(other,.4);
  assert.equal(last.maxHp-last.hp,CARDS.alakazam.damage);assert.deepEqual(rounded(packGame(clone)),rounded(packGame(g)));assert.equal(other.units.find(u=>u.id===last.id).hp,last.hp);
});

test('Princess petals have a visible slower arc and piercing shots hit along their flight instead of instantly',()=>{
  const g=fresh(),flower=g.spawn('roselia',0,300,560,0),enemy=still(g.spawn('grimer',1,300,300,0));g.attack(flower,enemy);flower.cooldown=100;run(g,.5);
  const petals=g.projectiles.find(p=>p.key==='roselia');assert.ok(petals.arc>=90);assert.equal(petals.speed,230);assert.equal(enemy.hp,enemy.maxHp);run(g,1.3);assert.equal(enemy.maxHp-enemy.hp,CARDS.roselia.damage);
  const other=fresh(),archer=other.spawn('alakazam',0,300,550,0),near=still(other.spawn('grimer',1,300,460,0)),far=still(other.spawn('grimer',1,300,405,0));other.attack(archer,near);archer.cooldown=100;run(other,CARDS.alakazam.windup+.02);assert.equal(near.hp,near.maxHp);assert.equal(far.hp,far.maxHp);run(other,.4);assert.equal(near.maxHp-near.hp,CARDS.alakazam.damage);assert.equal(far.maxHp-far.hp,CARDS.alakazam.damage);
});

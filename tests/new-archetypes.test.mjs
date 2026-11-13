import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, CARDS, CPU_DECKS, DEFAULT_DECK, TILE, RIVER } from '../dist/engine.js';
import { packGame, unpackGame, perspective } from '../dist/snapshot.js';
const fresh=()=>{const g=new Game({seed:9182});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);return g;};
const run=(g,s)=>{for(let i=0;i<Math.ceil(s*60);i++)g.step(1/60);};
const still=u=>{u.card={...u.card,speed:0,damage:0,passive:true};if(u.card.structure){u.card.lifetime=1e15;u.lifetime=1e15;}return u;};
const cast=(g,key,x,y,team=0)=>{g.hands[team][0]=key;g.energy[team]=10;const result=g.deploy(team,0,x,y);assert.ok(result.ok,key);return result;};

test('hover at the screenshot distance and two cells above an edge resolves to the nearest legal cell for either team',()=>{
  for(const team of[0,1])for(const y of[355,444-2*TILE]){
    const g=fresh(),cursor={x:300,y:team?800-y:y},p=g.resolveDeployment(team,'pikachu',cursor.x,cursor.y);
    assert.deepEqual(p,{x:300,y:team?352:448});
    g.hands[team][0]='pikachu';const result=g.deploy(team,0,cursor.x,cursor.y);assert.equal(result.ok,true);assert.equal(result.x,p.x);assert.equal(result.y,p.y);
  }
});
test('the nearest free cell avoids towers, structures and reserved formation cells',()=>{
  const g=fresh();g.spawn('centralElectrode',0,300,500,0);
  for(const key of['pikachu','regice','pandilla']){
    const points=g.deploymentPositions(0,key,300,500);assert.ok(points.length);assert.equal(new Set(points.map(p=>`${p.x},${p.y}`)).size,points.length);
    for(const [i,p]of points.entries())assert.ok(g.canDeploy(0,CARDS[key].squad?.[i]||key,p.x,p.y));
  }
  assert.equal(g.resolveDeployment(0,'pikachu',300,330),null);
});
test('seeded CPU decks span ten valid strategies and shuffle the opening hand',()=>{
  const found=new Set(),openings=new Set();
  for(let i=1;i<=150;i++){
    const g=new Game({seed:i*104729}),same=new Game({seed:i*104729}),deck=[...g.hands[1],...g.queues[1]];
    found.add(g.cpuDeckName);openings.add(g.hands[1].join(','));assert.deepEqual(deck,[...same.hands[1],...same.queues[1]]);
    assert.equal(deck.length,8);assert.equal(new Set(deck).size,8);assert.ok(deck.some(k=>CARDS[k].building));assert.ok(deck.some(k=>CARDS[k].structure));assert.ok(deck.filter(k=>CARDS[k].spell).length>=2);
    assert.ok(deck.some(k=>!CARDS[k].spell&&CARDS[k].air));assert.ok(deck.some(k=>CARDS[k].cost<=2));assert.ok(deck.every(k=>!CARDS[k].token));
  }
  assert.equal(found.size,10);assert.ok(openings.size>50);
});
test('all CPU strategies finish a simulated match with finite resources and bounded populations',()=>{
  for(const preset of CPU_DECKS){const g=new Game({seed:1234,cpuDeck:preset.cards});g.start();run(g,360);assert.equal(g.state,'ended',preset.name);assert.ok(g.energy.every(v=>v>=0&&v<=10));assert.ok(g.units.every(u=>Number.isFinite(u.hp)&&Number.isFinite(u.x)&&Number.isFinite(u.y)));assert.ok(g.units.length<=170);}
});
test('Pin misil clears archers and flyers across a wider area than the cheap stun',()=>{
  const g=fresh(),ground=still(g.spawn('treecko',1,245,300,0)),air=still(g.spawn('zubat',1,360,300,0)),ally=still(g.spawn('treecko',0,300,300,0));
  cast(g,'pinMissile',300,300);run(g,.7);assert.equal(ground.hp,0);assert.equal(air.hp,0);assert.equal(ally.hp,ally.maxHp);assert.ok(CARDS.pinMissile.splash>CARDS.thunder.splash);
});
test('Rayo strikes exactly the three enemies with the most current health and discounts crown damage',()=>{
  const g=fresh(),tower=g.towers.find(t=>t.team===1&&t.lane===0),a=still(g.spawn('snorlax',1,158,220,0)),b=still(g.spawn('registeel',1,185,210,0)),support=still(g.spawn('pikachu',1,145,210,0));
  cast(g,'lightning',158,210);run(g,.85);
  assert.equal(a.hp,a.maxHp-CARDS.lightning.damage);assert.equal(b.hp,b.maxHp-CARDS.lightning.damage);assert.equal(tower.hp,tower.maxHp-CARDS.lightning.towerDamage);assert.equal(support.hp,support.maxHp);assert.ok(a.stun>0);
});
test('Hiperrayo warns before impact and a target can escape the small area',()=>{
  const g=fresh(),target=still(g.spawn('snorlax',1,300,300,0)),escaped=still(g.spawn('pikachu',1,320,300,0));cast(g,'hyperBeam',300,300);run(g,1.45);assert.equal(target.hp,target.maxHp);escaped.x=450;run(g,.3);assert.equal(target.hp,target.maxHp-CARDS.hyperBeam.damage);assert.equal(escaped.hp,escaped.maxHp);
});
test('Ventisca cancels pending attacks and freezes enemy troops and towers for three seconds',()=>{
  const g=fresh(),tower=g.towers.find(t=>t.team===1&&t.lane===0),enemy=still(g.spawn('machamp',1,160,220,0)),ally=still(g.spawn('snorlax',0,160,245,0));
  g.attack(enemy,ally);cast(g,'blizzard',158,210);run(g,.5);assert.ok(enemy.stun>2.7&&tower.stun>2.7);assert.ok(enemy.freeze>2.7);assert.equal(enemy.attack,0);assert.equal(ally.hp,ally.maxHp);run(g,3);assert.equal(enemy.stun,0);assert.equal(enemy.freeze,0);
});
test('Púas damages only enemies on the ground, stops after seven seconds and never damages crown towers',()=>{
  const g=fresh(),tower=g.towers.find(t=>t.team===1&&t.lane===0),ground=still(g.spawn('snorlax',1,158,210,0)),air=still(g.spawn('zubat',1,158,210,0)),outside=still(g.spawn('snorlax',1,300,210,0));
  cast(g,'spikes',158,210);run(g,7.5);assert.equal(ground.hp,ground.maxHp-112*7);assert.equal(air.hp,air.maxHp);assert.equal(outside.hp,outside.maxHp);assert.equal(tower.hp,tower.maxHp);assert.equal(g.fields.length,0);const hp=ground.hp;run(g,1);assert.equal(ground.hp,hp);
});
test('Trampa rocas deals double damage to flyers and does not affect friendly troops',()=>{
  const g=fresh(),ground=still(g.spawn('snorlax',1,300,300,0)),air=still(g.spawn('charizard',1,300,300,0)),ally=still(g.spawn('charizard',0,300,300,0));
  cast(g,'stealthRock',300,300);run(g,6.5);assert.equal(ground.maxHp-ground.hp,360);assert.equal(air.maxHp-air.hp,720);assert.equal(ally.hp,ally.maxHp);
});
test('Remolino pulls troops while retaining river, structure and arena collision rules',()=>{
  const g=fresh(),ground=still(g.spawn('snorlax',1,300,430,0)),air=still(g.spawn('charizard',1,320,430,0)),building=still(g.spawn('regice',1,350,350,0));
  cast(g,'whirlpool',300,360);run(g,2.9);assert.ok(ground.y>=RIVER.bottom);assert.ok(ground.y<430);assert.ok(air.y<390);assert.equal(building.x,350);assert.equal(building.y,350);
});
test('Terremoto prioritizes structure damage and leaves flying troops unharmed',()=>{
  const g=fresh(),ground=still(g.spawn('snorlax',1,158,220,0)),building=still(g.spawn('regice',1,190,220,0)),air=still(g.spawn('charizard',1,158,220,0)),tower=g.towers.find(t=>t.team===1&&t.lane===0);
  cast(g,'earthquake',158,210);run(g,3.5);assert.equal(ground.maxHp-ground.hp,195);assert.equal(building.maxHp-building.hp,585);assert.equal(tower.maxHp-tower.hp,36);assert.equal(air.hp,air.maxHp);
});
test('Pesadilla releases eight separate invocations over time without putting them inside towers',()=>{
  const g=fresh(),spawns=[];g.onEvent=e=>{if(e.type==='spawn'&&e.unit.key==='shuppetToken')spawns.push({at:g.elapsed,x:e.unit.x,y:e.unit.y});};
  cast(g,'nightmare',158,172);run(g,1.1);assert.equal(spawns.length,1);run(g,5.5);assert.equal(spawns.length,8);assert.ok(spawns.at(-1).at-spawns[0].at>4.7);
  for(const point of spawns)assert.ok(g.towers.every(t=>Math.hypot(t.x-point.x,t.y-point.y)>=t.radius+(CARDS.shuppetToken.radius||12)*.7));
});
test('Central Electrode generates five Voltorb in waves and one final Voltorb when its lifetime ends',()=>{
  const g=fresh();g.towers.forEach(t=>t.hp=0);const owner=g.spawn('centralElectrode',0,300,520,0),children=[];g.onEvent=e=>{if(e.type==='spawn'&&e.unit.key==='voltorb')children.push(e.unit);};
  run(g,.8);assert.equal(children.length,0);run(g,.5);assert.equal(children.length,1);run(g,29);assert.equal(owner.hp,0);assert.equal(children.length,6);g.unitDeath(owner,1);assert.equal(children.length,6);
});
test('destroying a spawner early releases only one final wave and prevents later production',()=>{
  for(const [key,child,count]of[['centralElectrode','voltorb',1],['madriguera','nidoranM',2],['vivero','exeggcute',2]]){
    const g=fresh();g.towers.forEach(t=>t.hp=0);const owner=g.spawn(key,0,300,520,0);g.damage(owner,99999,1);assert.equal(g.units.filter(u=>u.key===child).length,CARDS[key].summonSpacing?1:count);run(g,10);assert.equal(g.units.filter(u=>u.key===child).length,count);
  }
});
test('Exeggutor releases each pair in single file with a real delay, including its last pair and restored online jobs',()=>{
  for(const team of[0,1]){
    const g=fresh(),spawns=[];
    g.onEvent=e=>{if(e.type==='spawn'&&e.unit.key==='exeggcute')spawns.push({x:e.unit.x,y:e.unit.y,at:g.elapsed,unit:e.unit});};
    const owner=g.spawn('vivero',team,158,team?270:530,0);run(g,1.1);assert.equal(spawns.length,1);assert.equal(g.reinforcements.length,1);
    const clone=unpackGame(packGame(g)),flipped=unpackGame(perspective(packGame(g),1));run(g,.8);run(clone,.8);run(flipped,.8);
    assert.equal(spawns.length,2);assert.equal(spawns[0].x,spawns[1].x);assert.equal(spawns[0].y,spawns[1].y);assert.ok(spawns[1].at-spawns[0].at>=.84);
    assert.deepEqual(packGame(clone).units.map(u=>[u.key,u.x,u.y,u.spawn]),packGame(g).units.map(u=>[u.key,u.x,u.y,u.spawn]));
    assert.equal(flipped.units.filter(u=>u.key==='exeggcute'&&u.team===1-team).length,2);
    run(g,.6);const children=g.units.filter(u=>u.parentId===owner.id);assert.ok((children[0].y-children[1].y)*(team?-1:1)<0,'first child advances ahead of the second');
    g.damage(owner,99999,1-team);assert.equal(spawns.length,3);run(g,.9);assert.equal(spawns.length,4);assert.ok(spawns[3].at-spawns[2].at>=.84);run(g,8);assert.equal(spawns.length,4);
  }
});
test('Duskull invokes pairs, respects its living summon limit and leaves reinforcements on death',()=>{
  const g=fresh();g.towers.forEach(t=>t.hp=0);const owner=g.spawn('duskull',0,300,520,0);run(g,1.3);assert.equal(g.units.filter(u=>u.parentId===owner.id).length,2);run(g,13);assert.ok(g.units.filter(u=>u.parentId===owner.id&&u.hp>0).length<=6);const before=g.units.filter(u=>u.key==='shuppetToken'&&u.hp>0).length;g.damage(owner,99999,1);assert.equal(g.units.filter(u=>u.key==='shuppetToken'&&u.hp>0).length,before+2);
});
test('the mixed gang deploys three melee Poochyena and two ranged Ralts for one card cost',()=>{
  const g=fresh(),result=cast(g,'pandilla',300,530);assert.ok(result.ok);assert.equal(g.units.filter(u=>u.key==='poochyenaToken').length,3);assert.equal(g.units.filter(u=>u.key==='raltsToken').length,2);assert.ok(g.units.filter(u=>u.key==='raltsToken').every(u=>u.card.air));assert.equal(g.energy[0],7);
});
test('Rocket gang keeps three melee in front and two ranged behind at edges, towers and in either online perspective',()=>{
  for(const team of[0,1])for(const[x,y]of[[300,530],[300,448],[50,760],[550,760],[158,628],[300,682]]){
    const g=fresh(),cursor={x:team?600-x:x,y:team?800-y:y},anchor=g.resolveDeployment(team,'pandilla',cursor.x,cursor.y);
    assert.ok(anchor,JSON.stringify({team,cursor}));const preview=g.deploymentPositions(team,'pandilla',anchor.x,anchor.y);assert.equal(preview.length,5);
    cast(g,'pandilla',cursor.x,cursor.y,team);assert.deepEqual(g.units.map(({x,y})=>({x,y})),preview);
    const check=units=>{
      const front=units.filter(u=>u.key==='poochyenaToken'),back=units.filter(u=>u.key==='raltsToken'),direction=units[0].team?-1:1;
      assert.equal(front.length,3);assert.equal(back.length,2);assert.ok(Math.max(...front.map(u=>u.y*direction))<Math.min(...back.map(u=>u.y*direction)));
      assert.equal(new Set(front.map(u=>u.y)).size,1);assert.equal(new Set(back.map(u=>u.y)).size,1);assert.equal(new Set(units.map(u=>`${u.x},${u.y}`)).size,5);
    };
    check(g.units);check(unpackGame(perspective(packGame(g),1)).units);
    for(const u of g.units)assert.ok(g.canDeploy(team,u.key,u.x,u.y));
  }
});
test('a defensive structure stops holding an out-of-range target and picks the next reachable enemy',()=>{
  const g=fresh(),defense=g.spawn('regice',0,300,530,0),retreating=still(g.spawn('snorlax',1,300,410,0));run(g,.5);assert.equal(defense.target,retreating);
  retreating.y=530-defense.card.range-retreating.radius-2;const near=still(g.spawn('snorlax',1,340,430,0));g.step(1/60);assert.equal(defense.target,near);assert.equal(defense.attack,0);
});
test('new win conditions ignore adjacent troops and can be pulled to defensive structures',()=>{
  for(const key of['regirock','celebi']){const g=fresh(),unit=g.spawn(key,0,158,450,0),bait=still(g.spawn('pikachu',1,160,430,0));bait.entryPending=false;g.step(1/60);assert.notEqual(unit.target,bait);const structure=g.spawn('regice',1,300,300,0);g.step(1/60);assert.equal(unit.target,structure);assert.ok(CARDS[key].role.startsWith('Win condition'));}
});
test('heavy hitters have real windups, lose to distractions and can be interrupted before impact',()=>{
  for(const key of['raichu','registeel']){const g=fresh(),attacker=g.spawn(key,0,300,530,0),tank=still(g.spawn('snorlax',1,300,495,0));g.attack(attacker,tank);run(g,CARDS[key].windup-.1);assert.equal(tank.hp,tank.maxHp);g.damage(attacker,1,1,{stun:1});run(g,.4);assert.equal(tank.hp,tank.maxHp);const bait=g.spawn('diglett',1,310,530,0);run(g,1);assert.equal(attacker.target,bait);}
  assert.ok(CARDS.raichu.hp<CARDS.fireball.damage);assert.ok(CARDS.registeel.interval>=3);assert.ok(CARDS.registeel.damage>=1000);
});
test('Voltorb leaps before the explosion and damages nearby enemies of both movement types once',()=>{
  const g=fresh(),voltorb=g.spawn('voltorb',0,300,530,0),target=still(g.spawn('snorlax',1,300,460,0)),air=still(g.spawn('charizard',1,325,460,0));voltorb.cooldown=0;
  run(g,.15);assert.ok(voltorb.leap);assert.ok(voltorb.y<530);assert.equal(target.hp,target.maxHp);run(g,.5);assert.equal(voltorb.hp,0);assert.equal(target.maxHp-target.hp,CARDS.voltorb.damage);assert.equal(air.maxHp-air.hp,CARDS.voltorb.damage);const hp=target.hp;run(g,1);assert.equal(target.hp,hp);
});
test('a Voltorb killed during its leap does not inflict an unavoidable explosion',()=>{
  const g=fresh(),v=g.spawn('voltorb',0,300,530,0),target=still(g.spawn('snorlax',1,300,460,0));v.cooldown=0;run(g,.1);assert.ok(v.leap);g.damage(v,689,1);run(g,.6);assert.equal(target.hp,target.maxHp);
});
test('persistent fields, invocations, freeze and leaps survive online serialization and perspective reversal',()=>{
  const g=fresh();cast(g,'nightmare',158,250);cast(g,'spikes',442,300);run(g,.7);g.spawn('duskull',0,300,530,0);const v=g.spawn('voltorb',0,158,525,0);v.cooldown=0;still(g.spawn('snorlax',1,158,455,0));run(g,.15);assert.ok(v.leap);
  g.units.find(u=>u.key==='snorlax').freeze=.5;
  const rounded=data=>JSON.parse(JSON.stringify(data,(k,v)=>typeof v==='number'?Number(v.toFixed(8)):v));
  const packed=packGame(g);assert.deepEqual(rounded(perspective(perspective(packed,1),1)),rounded(packed));const clone=unpackGame(JSON.parse(JSON.stringify(packed)));run(g,4);run(clone,4);assert.deepEqual(JSON.parse(JSON.stringify(packGame(clone))),JSON.parse(JSON.stringify(packGame(g))));
});

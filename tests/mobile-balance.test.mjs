import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, CARDS, DEFAULT_DECK, LANES, RIVER, BRIDGE } from '../dist/engine.js';
const fresh=()=>{const g=new Game({seed:18});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);return g;};
const run=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)g.step(1/60);};

test('large tanks steer around bodies and cross either bridge in both directions',()=>{
  for(const key of['snorlax','groudon','golem','aggron','steelix','metagross'])for(const team of[0,1])for(const x of LANES){
    const g=fresh(),blocker=g.spawn('machamp',team,x,team?380:420,0),tank=g.spawn(key,team,x,team?350:450,0),target=g.towers.find(t=>t.team!==team&&t.lane===(x<300?0:1));
    for(let i=0;i<14*60;i++){
      g.move(tank,target,1/60);
      if(tank.y>=RIVER.top&&tank.y<=RIVER.bottom)assert.ok(Math.abs(tank.x-x)<=30,`left bridge ${tank.x},${tank.y}`);
    }
    assert.ok(team?tank.y>RIVER.bottom:tank.y<RIVER.top,`${key} stuck at ${tank.x},${tank.y} behind ${blocker.x},${blocker.y}`);
  }
});

test('both teams can deploy directly behind their king and the troop walks around it',()=>{
  for(const team of[0,1]){
    const g=fresh(),y=team?48:752,king=g.towers.find(t=>t.team===team&&t.king);
    assert.ok(g.canDeploy(team,'pikachu',300,y));
    const p=g.resolveDeployment(team,'pikachu',300,y);assert.deepEqual(p,{x:300,y:team?40:760});
    const result=g.deploy(team,0,300,y);assert.equal(result.ok,true);const troop=g.units[0];
    run(g,6);assert.ok(team?troop.y>king.y:troop.y<king.y,`still behind king at ${troop.x},${troop.y}`);
  }
});

test('danger preview uses the resolved placement and respects air and building targeting',()=>{
  const g=fresh(),ranged=g.spawn('squirtle',1,158,420,0),melee=g.spawn('machamp',1,158,465,0),tank=g.spawn('snorlax',1,158,465,0);
  const ground=g.deploymentThreats(0,'pikachu',158,400);
  assert.ok(ground.includes(ranged));assert.ok(ground.includes(melee));assert.ok(!ground.includes(tank));
  const flying=g.deploymentThreats(0,'zubat',158,400);assert.ok(flying.includes(ranged));assert.ok(!flying.includes(melee));
  const structure=g.deploymentThreats(0,'blastoise',158,470);assert.ok(structure.includes(tank));
  ranged.hp=0;assert.ok(!g.deploymentThreats(0,'pikachu',158,400).includes(ranged));
  assert.deepEqual(g.deploymentThreats(0,'thunder',158,200),[]);
});

test('edge assistance reaches the bridge but rejects deep enemy territory without spending elixir',()=>{
  for(const team of[0,1]){
    const g=fresh(),energy=g.energy[team],hand=[...g.hands[team]];
    assert.deepEqual(g.resolveDeployment(team,'pikachu',158,team?BRIDGE.bottom:BRIDGE.top),{x:156,y:team?352:448});
    assert.equal(g.resolveDeployment(team,'pikachu',158,team?BRIDGE.bottom+5:BRIDGE.top-5),null);
    const tower=g.towers.find(t=>t.team!==team&&!t.king);
    assert.equal(g.resolveDeployment(team,'pikachu',tower.x,tower.y),null);
    assert.equal(g.deploy(team,0,tower.x,tower.y).ok,false);assert.equal(g.energy[team],energy);assert.deepEqual(g.hands[team],hand);
  }
});

test('inactive kings do not warn, while active towers warn within their actual range',()=>{
  const g=fresh(),king=g.towers.find(t=>t.team===0&&t.king),enemy=g.spawn('pikachu',1,158,430,0);
  g.towers.find(t=>t.team===0&&t.lane===1).hp=0;
  assert.ok(!g.deploymentThreats(1,'pikachu',300,550).includes(king));king.active=true;
  assert.ok(g.deploymentThreats(1,'pikachu',300,550).includes(king));
  assert.ok(!g.deploymentThreats(1,'pikachu',44,350).includes(king));
  enemy.spawn=1;assert.ok(!g.deploymentThreats(0,'pikachu',158,480).includes(enemy));
});

test('each Zubat dies to exactly two tower hits',()=>{
  const g=fresh(),tower=g.towers.find(t=>!t.king),zubat=g.spawn('zubat',1,158,500,0);
  g.damage(zubat,tower.damage,0);assert.ok(zubat.hp>0);g.damage(zubat,tower.damage,0);assert.equal(zubat.hp,0);
});

test('three unsupported Zubat deployed at the bridge deal zero tower damage',()=>{
  const g=new Game({seed:18,deck:['zubat',...DEFAULT_DECK.filter(k=>k!=='zubat')]});g.start();g.aiEnabled=false;
  const tower=g.towers.find(t=>t.team===1&&t.lane===0);g.towers.forEach(t=>t.active=t===tower);
  g.deploy(0,0,158,444);run(g,12);
  assert.equal(tower.hp,tower.maxHp);assert.ok(!g.units.some(u=>u.team===0));
});

test('movement has four slower tiers with a readable gap between tanks and runners',()=>{
  assert.equal(CARDS.snorlax.speed,18);assert.equal(CARDS.treecko.speed,26);assert.equal(CARDS.zubat.speed,30);assert.equal(CARDS.pikachu.speed,32);assert.equal(CARDS.eevee.speed,40);
  for(const c of Object.values(CARDS))if(!c.spell)assert.ok(c.speed>=0&&c.speed<=40,c.name);
});

test('central defensive structures pull marching win conditions before either bridge',()=>{
  for(const key of['snorlax','groudon','golem','steelix','onix'])for(const team of[0,1])for(const x of LANES){
    const g=fresh(),unit=g.spawn(key,team,x,team?350:450,0);g.step(1/60);assert.ok('king'in unit.target);
    const structure=g.spawn('blastoise',1-team,300,team?550:250,.75);run(g,1);
    assert.equal(unit.target,structure,`${key} ignored central defense`);assert.ok(unit.moving||unit.engaged);
  }
});

test('an approaching tank prioritizes a central defense even slightly farther away than the crown tower',()=>{
  const g=fresh(),unit=g.spawn('snorlax',1,442,410,0);g.step(1/60);const structure=g.spawn('blastoise',0,300,565,0);g.step(1/60);assert.equal(unit.target,structure);
});

test('a tank already hitting a crown tower keeps its victim when a new structure appears',()=>{
  const g=fresh(),unit=g.spawn('snorlax',1,442,575,0);run(g,.6);const tower=unit.target;assert.ok(unit.engaged);
  g.spawn('blastoise',0,300,535,0);run(g,.2);assert.equal(unit.target,tower);
});

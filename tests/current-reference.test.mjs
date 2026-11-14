import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,CARDS,TILE,KING_Y,formationOffsets} from '../dist/engine.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';
import {spellPreviewTargets} from '../dist/spell-preview.js';
import {structureLift} from '../dist/sprite-motion.js';
const source=JSON.parse(readFileSync(new URL('../docs/CLASH-REFERENCE-2026-11-14.json',import.meta.url)));
const fresh=()=>{const g=new Game({seed:9291});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);return g;};
const run=(g,s)=>{for(let i=0;i<Math.ceil(s*60);i++)g.step(1/60);};
const still=u=>{u.card={...u.card,speed:0,damage:0,passive:true};return u;};

test('dated current reference is applied per body and total attack without multiplying combos',()=>{
  for(const[key,ref]of Object.entries({pikachu:'Mago eléctrico',rapidash:'Montapuercos',roselia:'Princesa',rhydon:'P.E.K.K.A.',treecko:'Arqueras',geodude:'Caballero',diglettHorde:'Ejército de esqueletos',beedrill:'Esbirros',sandshrew:'Guardias',duskull:'Bruja'})){
    const c=CARDS[key],s=source.profiles[ref].stats;
    assert.equal(c.hp,s.hp,key);assert.equal(c.damage*(c.burst||1)*(c.bolts||1),s.damagePerAttack,key);
    assert.equal(c.interval,s.intervalSeconds,key);assert.ok(Math.abs(c.speed-s.speedUnitsPerSecond)<1e-8,key);
    assert.equal(c.windup,s.firstAttackDelaySeconds,key);assert.equal(c.deployTime,s.deployTimeSeconds,key);
  }
  assert.equal(CARDS.roselia.range,9*TILE);assert.equal(CARDS.ampharos.range,5.5*TILE);
  assert.equal(CARDS.diglettHorde.count,15);assert.equal(CARDS.pandilla.squad.length,5);
  assert.equal(CARDS.pandilla.squad.filter(k=>k==='raltsToken').length,2);
});

test('the Hog equivalent covers the measured unbuffed distance in one second on a clear path',()=>{
  const g=fresh(),u=g.spawn('rapidash',0,100,560,0);u.target=g.towers.find(t=>t.team===1&&t.lane===0);
  let distance=0;for(let i=0;i<60;i++){const p={x:u.x,y:u.y};g.step(1/60);distance+=Math.hypot(u.x-p.x,u.y-p.y);}
  assert.ok(Math.abs(distance-57.6)<.01,`${distance} arena units`);
});

test('Poochyena clears both poles of allied towers, including the original stuck point',()=>{
  for(const team of[0,1])for(const lane of[0,1])for(const extra of[0,1]){
    const g=fresh(),tower=g.towers.find(t=>t.team===team&&!t.king&&t.lane===lane),sign=team?-1:1;
    if(extra)g.spawn('diglett',team,60,team?60:740,0);
    const u=g.spawn('poochyenaToken',team,tower.x,tower.y+sign*34,0);run(g,8);
    assert.ok((u.y-tower.y)*sign< -60,`team ${team}, lane ${lane}, parity ${extra}: ${u.x}, ${u.y}`);
  }
});

test('all swarm anchors can split behind the king and the archer pair follows separate lanes',()=>{
  for(const team of[0,1])for(const key of['treecko','pandilla','diglett','diglettHorde','raltsTrio','poochyenaPack','zubat','sandshrew','beedrill']){
    const g=fresh(),y=KING_Y[team]+(team?-54:54),positions=g.deploymentPositions(team,key,300,y);
    assert.equal(positions.length,CARDS[key].count,key);assert.ok(positions.some(p=>p.x<300)&&positions.some(p=>p.x>300),key);
    g.hands[team][0]=key;g.energy[team]=10;assert.ok(g.deploy(team,0,300,y).ok,key);
    assert.deepEqual(g.units.map(u=>({x:u.x,y:u.y})),positions,key);
    if(key==='treecko'){run(g,6);const units=g.units.filter(u=>u.team===team).sort((a,b)=>a.x-b.x);assert.ok(units[0].x<260&&units[1].x>340,JSON.stringify(units.map(u=>[u.x,u.y])));}
  }
});

test('formations preserve mirrored fractional offsets and spread the army across more than two rows',()=>{
  const g=fresh(),a=g.deploymentPositions(0,'diglettHorde',158,520),b=g.deploymentPositions(1,'diglettHorde',442,280);
  assert.equal(a.length,15);assert.equal(new Set(a.map(p=>`${p.x},${p.y}`)).size,15);
  a.forEach((p,i)=>assert.ok(Math.hypot(600-p.x-b[i].x,800-p.y-b[i].y)<1e-7));
  const offsets=formationOffsets(CARDS.diglettHorde);assert.ok(Math.max(...offsets.map(p=>p.y))-Math.min(...offsets.map(p=>p.y))>TILE*3);
});

test('the rolling spell deploys in each captured lane for either perspective',()=>{
  for(const team of[0,1])for(const lane of[0,1]){
    const g=fresh(),x=lane?442:158,y=team?500:300;assert.equal(g.canDeploy(team,'log',x,y),false);
    g.towers.find(t=>t.team!==team&&!t.king&&t.lane===lane).hp=0;
    assert.equal(g.canDeploy(team,'log',x,y),true);assert.equal(g.canDeploy(team,'log',600-x,y),false);
    g.hands[team][0]='log';g.energy[team]=10;assert.ok(g.deploy(team,0,x,y).ok);assert.ok(Math.abs(g.spells[0].y-y)<=TILE/2);
  }
});

test('Pikachu cannot permanently cancel Charizard in either update order or perspective',()=>{
  for(const team of[0,1])for(const reverse of[false,true]){
    const g=fresh(),actors={};for(const key of reverse?['charizard','pikachu']:['pikachu','charizard']){
      const actorTeam=key==='pikachu'?team:1-team;actors[key]=g.spawn(key,actorTeam,300,actorTeam?490:550,0);
      actors[key].hp=actors[key].maxHp=1e6;actors[key].card={...actors[key].card,speed:0};actors[key].entryPending=false;
      if(key==='pikachu')actors[key].card.windup=.26;
    }
    let releases=0;g.onEvent=e=>{if(e.type==='attackRelease'&&e.attacker===actors.charizard)releases++;};run(g,20);assert.ok(releases>=6,`team ${team}, reverse ${reverse}: ${releases}`);
  }
});

test('Barrel flight, vulnerable landing and first attack have separate measured delays',()=>{
  for(const team of[0,1]){
    const g=fresh(),tower=g.towers.find(t=>t.team!==team&&!t.king&&t.lane===0);g.hands[team][0]='sneaselAmbush';g.energy[team]=10;
    g.deploy(team,0,tower.x,tower.y);const spell=g.spells[0],distance=Math.hypot(spell.x-spell.startX,spell.y-spell.startY);
    assert.equal(spell.flightTime,distance/192);run(g,spell.delay+spell.flightTime-.05);assert.equal(g.units.length,0);run(g,.1);
    const minion=g.units.find(u=>u.key==='sneaselToken');assert.equal(g.units.length,3);assert.ok(minion.spawn>1);
    const defender=still(g.spawn('treecko',1-team,minion.x+10,minion.y,0));assert.ok(g.validTarget(defender,minion));
    assert.ok(spellPreviewTargets(g,CARDS.thunder,minion,1-team).includes(minion));
    const before=minion.hp;g.damage(minion,10,1-team);assert.equal(minion.hp,before-10);
    const locked={x:minion.x,y:minion.y};let releaseAt=null;g.onEvent=e=>{if(e.type==='attackRelease'&&e.attacker===minion&&releaseAt===null)releaseAt=g.elapsed;};
    run(g,.8);assert.deepEqual({x:minion.x,y:minion.y},locked);assert.equal(releaseAt,null);
    const clone=unpackGame(packGame(g)),other=unpackGame(perspective(packGame(g),1));run(g,1);run(clone,1);run(other,1);
    assert.ok(releaseAt!==null);assert.equal(CARDS.sneaselToken.windup,.3);assert.equal(other.units.find(u=>u.id===minion.id).hp,minion.hp);
  }
});

test('Dusclops retains the saved key while its melee evolution family and natural structures stay distinct',()=>{
  assert.equal(CARDS.duskull.name,'Dusclops');assert.equal(CARDS.duskull.id,356);assert.equal(CARDS.duskull.summon,'duskullToken');
  assert.equal(CARDS.duskullToken.id,355);assert.ok(CARDS.duskull.range>=100&&CARDS.duskullToken.range<24);
  assert.ok(CARDS.duskullToken.scale<CARDS.duskull.scale/2);
  for(const key of['cloyster','wobbuffet','madriguera','vivero','regice'])assert.equal(structureLift(CARDS[key]),0,key);
  assert.equal(structureLift(CARDS.centralElectrode),23);
});

test('flame advances before contact, survives stun after release and restores in either perspective',()=>{
  const g=fresh(),dragon=g.spawn('charizard',0,300,560,0),victim=still(g.spawn('snorlax',1,300,460,0));
  dragon.entryPending=false;g.attack(dragon,victim);dragon.cooldown=100;run(g,CARDS.charizard.windup+.02);
  assert.ok(g.projectiles.some(p=>p.flameCone));assert.equal(victim.hp,victim.maxHp);
  g.damage(dragon,0,1,{stun:2});
  const clone=unpackGame(packGame(g)),other=unpackGame(perspective(packGame(g),1));run(g,.6);run(clone,.6);run(other,.6);
  assert.equal(victim.maxHp-victim.hp,CARDS.charizard.damage);
  assert.equal(clone.units.find(u=>u.id===victim.id).hp,victim.hp);assert.equal(other.units.find(u=>u.id===victim.id).hp,victim.hp);
});

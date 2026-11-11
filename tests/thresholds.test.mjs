import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, CARDS, DEFAULT_DECK, formationOffsets, attackPoseProgress } from '../dist/engine.js';
import { CARD_BALANCE, THRESHOLDS, cardThresholds } from '../dist/balance.js';
import { CARD_REVIEW } from '../dist/card-review.js';
import { packGame, unpackGame } from '../dist/snapshot.js';
import { cardArtMarkup } from '../dist/card-art.js';
const animations=JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)));
function fresh(options={}) { const g=new Game({seed:14,...options});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);return g; }
function run(g,seconds) { for(let i=0;i<Math.ceil(seconds*60);i++)g.step(1/60); }
function freeze(u) { u.card={...u.card,speed:0,damage:0,passive:true,blink:0};return u; }
function duel(key,enemy,count=1) {
  const g=fresh(),defender=g.spawn(key,0,300,540,0);
  const attackers=Array.from({length:count},(_,i)=>{const angle=i/count*Math.PI*2;return g.spawn(enemy,1,300+Math.cos(angle)*35,540+Math.sin(angle)*35,0);});
  for(let i=0;i<45*60&&defender.hp>0&&attackers.some(u=>u.hp>0);i++)g.step(1/60);
  return {defender,attackers};
}

test('every playable card has an individual review, explicit stats and visible art',()=>{
  for(const[key,c]of Object.entries(CARDS)) {
    assert.ok(CARD_BALANCE[key],key);
    if(c.token)continue;
    assert.ok(CARD_REVIEW[key]?.length>40,key);assert.ok(cardArtMarkup(key).includes('data-art='),key);
    if(!c.spell)for(const stat of['hp','damage','interval','speed'])assert.ok(Number.isFinite(CARD_BALANCE[key][stat]),`${key}/${stat}`);
  }
});

test('the minimum body dies to every damaging card and to damage over time',()=>{
  for(const c of Object.values(CARDS).filter(c=>c.damage>0)){const g=fresh(),u=g.spawn('diglett',0,300,500,0);g.damage(u,c.damage,1);assert.equal(u.hp,0,c.name);}
  const g=fresh(),u=g.spawn('diglett',0,300,500,0);g.damage(u,.1,1,{burn:3,burnKind:'poison'});run(g,.6);assert.equal(u.hp,0);
});

test('one-shot and two-shot bodies sit on opposite sides of tower and zap thresholds',()=>{
  for(const[key,hits]of[['diglett',1],['gastly',1],['mankey',1],['raltsTrio',1],['poochyenaPack',2],['ekans',2],['beedrill',2],['zubat',2],['treecko',3]]){
    const g=fresh(),u=g.spawn(key,0,300,500,0),tower=g.towers.find(t=>!t.king);
    for(let i=1;i<=hits;i++){g.damage(u,tower.damage,1);assert.equal(u.hp<=0,i===hits,`${key}, shot ${i}`);}
  }
  assert.equal(CARDS.thunder.cost,2);assert.equal(CARDS.thunder.damage,THRESHOLDS.tower);
  assert.equal(CARDS.pikachu.damage,THRESHOLDS.tower);
});

test('a real zap clears light troops while melee Nidoran and Zubat survive',()=>{
  const g=fresh({deck:['thunder',...DEFAULT_DECK.filter(k=>k!=='thunder')]}),units=['diglett','gastly','raltsTrio','poochyenaPack','zubat'].map((key,i)=>freeze(g.spawn(key,1,260+i*15,300,0)));
  assert.ok(g.deploy(0,0,290,300).ok);run(g,.5);
  assert.deepEqual(units.map(u=>u.hp),[0,0,0,71,71]);assert.ok(units.slice(3).every(u=>u.stun>0));
});

test('fireball removes ordinary support of four or five or leaves one or two actual tower hits',()=>{
  for(const key of['alakazam','starmie','mrmime','espeon','sceptile','gardevoir','crobat','altaria']){
    const g=fresh({deck:['fireball',...DEFAULT_DECK.filter(k=>k!=='fireball')]}),u=freeze(g.spawn(key,1,300,300,0));
    g.deploy(0,0,300,300);run(g,.5);
    if(key==='alakazam'){assert.equal(u.hp,0);continue;}
    assert.ok(u.hp>0,key);g.damage(u,109,0);
    if(['crobat','altaria'].includes(key)){assert.ok(u.hp>0,key);g.damage(u,109,0);}
    assert.equal(u.hp,0,key);
  }
  const g=fresh(),tank=g.spawn('snorlax',1,300,300,0);g.damage(tank,400,0);g.damage(tank,218,0);assert.ok(tank.hp>0);
});

test('rolling log clears the full melee pack once and leaves flying swarms intact',()=>{
  const g=fresh({deck:['log',...DEFAULT_DECK.slice(0,7)]}),pack=formationOffsets(CARDS.poochyenaPack).map(p=>freeze(g.spawn('poochyenaPack',1,158+p.x,400+p.y,0))),air=freeze(g.spawn('gastly',1,158,400,0));
  g.deploy(0,0,158,500);run(g,1.8);assert.ok(pack.every(u=>u.hp===0));assert.equal(air.hp,air.maxHp);
});

test('Geodude wins ordinary single-target duels but loses to the tank counter and ground swarms',()=>{
  for(const enemy of['pikachu','psyduck','alakazam','gengar','feraligatr','arcanine','scizor','sableye','sharpedo','espeon'])assert.ok(duel('geodude',enemy).defender.hp>0,enemy);
  for(const[enemy,count]of[['machamp',1],['diglett',9],['poochyenaPack',4]]){
    const result=duel('geodude',enemy,count);assert.equal(result.defender.hp,0,enemy);assert.ok(result.attackers.some(u=>u.hp>0),enemy);
  }
});

test('swarms use compact mirrored formations and deploy every distinct body legally',()=>{
  for(const key of['diglett','diglettHorde','raltsTrio','poochyenaPack','gastly'])for(const team of[0,1]){
    const deck=[key,...DEFAULT_DECK.filter(k=>k!==key).slice(0,7)],g=fresh({deck});g.hands[team]=deck.slice(0,4);g.queues[team]=deck.slice(4);
    const result=g.deploy(team,0,158,team?300:500);assert.ok(result.ok,key);
    const units=g.units.filter(u=>u.team===team);assert.equal(units.length,CARDS[key].count,key);
    assert.equal(new Set(units.map(u=>`${u.x},${u.y}`)).size,units.length,key);
    assert.ok(units.every(u=>g.canDeploy(team,key,u.x,u.y)),key);
    assert.ok(Math.max(...units.map(u=>u.x))-Math.min(...units.map(u=>u.x))<=80,key);
    const a=formationOffsets(CARDS[key]),b=formationOffsets(CARDS[key],1);a.forEach((p,i)=>{assert.ok(Math.abs(p.x+b[i].x)<1e-7);assert.ok(Math.abs(p.y+b[i].y)<1e-7);});
  }
});

test('fireball and zap each clear a deployed nine-body horde in a single cast',()=>{
  for(const spell of['fireball','thunder']){
    const g=fresh({deck:[spell,...DEFAULT_DECK.filter(k=>k!==spell).slice(0,7)]}),units=formationOffsets(CARDS.diglettHorde).map(p=>freeze(g.spawn('diglettHorde',1,300+p.x,300+p.y,0)));
    g.energy[0]=10;g.deploy(0,0,300,300);run(g,.5);assert.ok(units.every(u=>u.hp===0),spell);
  }
});

test('Wobbuffet only counters direct hits, and poison never triggers a response',()=>{
  const events=[],g=fresh({onEvent:e=>events.push(e)}),w=g.spawn('wobbuffet',0,300,500,0),enemy=freeze(g.spawn('machamp',1,300,470,0));
  run(g,2);assert.equal(enemy.hp,enemy.maxHp);assert.ok(!events.some(e=>e.type==='attackRelease'&&e.attacker.id===w.id));
  g.damage(w,100,1,{sourceId:enemy.id});assert.equal(enemy.hp,enemy.maxHp-50);assert.ok(events.some(e=>e.type==='counter'));
  g.damage(w,100,1,{sourceId:enemy.id,dot:true});assert.equal(enemy.hp,enemy.maxHp-50);
});

test('Feraligatr and Sableye no longer heal from ordinary physical attacks',()=>{
  for(const key of['feraligatr','sableye']){
    const g=fresh(),u=g.spawn(key,0,300,500,0),enemy=freeze(g.spawn('snorlax',1,300,470,0));u.hp-=100;
    g.attack(u,enemy);u.cooldown=99;run(g,1);assert.equal(u.hp,u.maxHp-100,key);assert.ok(enemy.hp<enemy.maxHp);
  }
});

test('Exeggutor launches an arcing egg and does not spawn suicidal Pokémon',()=>{
  const events=[],g=fresh({onEvent:e=>events.push(e)}),u=g.spawn('exeggutor',0,300,500,0),a=freeze(g.spawn('snorlax',1,300,400,0)),b=freeze(g.spawn('snorlax',1,325,400,0));
  g.attack(u,a);u.cooldown=99;run(g,.31);assert.ok(g.projectiles.some(p=>p.style==='egg'&&p.arc>0));
  run(g,1);assert.equal(a.maxHp-a.hp,CARDS.exeggutor.damage);assert.equal(b.maxHp-b.hp,CARDS.exeggutor.damage);run(g,10);
  assert.ok(!g.units.some(x=>x.parentId===u.id));assert.ok(events.some(e=>e.type==='hit'&&e.style==='egg'));
});

test('poison status and psychic fields carry distinct visual identities',()=>{
  const g=fresh(),poison=g.spawn('umbreon',0,250,500,0),target=freeze(g.spawn('snorlax',1,250,470,0));g.attack(poison,target);poison.cooldown=99;run(g,1);
  assert.equal(target.burn.kind,'poison');
  const psychic=g.spawn('gardevoir',0,400,500,0);g.addField(400,400,0,14,psychic.id);assert.equal(g.fields[0].style,'psychic');
});

test('every attack has recovery after its final hit and a supported original animation',()=>{
  for(const[key,c]of Object.entries(CARDS))if(!c.spell&&!c.passive){
    const meta=animations[c.id][c.attackAnim];assert.ok(meta,`${key}/${c.attackAnim}`);
    assert.ok(c.windup>0);assert.ok(c.attackDuration>=c.windup+((c.burst||1)-1)*(c.burstSpacing||0)+.15,key);
    assert.ok(c.interval>=c.attackDuration,key);
    const hit=meta.hitFrame||Math.max(1,Math.floor(meta.durations.length*.3)),total=meta.durations.reduce((a,b)=>a+b,0),ratio=meta.durations.slice(0,hit).reduce((a,b)=>a+b,0)/total;
    assert.ok(Math.abs(attackPoseProgress(meta,c.windup,c.attackDuration,c.windup)-ratio)<1e-8,key);
  }
});

test('the first hit, each combo impact and stun cancellation use identical timing with or without metadata',()=>{
  for(const key of['snorlax','machamp','squirtle','mewtwo']){
    const traces=[];
    for(const metadata of[{},animations]){
      const times=[],g=fresh({animations:metadata,onEvent:e=>{if(e.type==='attackRelease')times.push(g.elapsed);}}),u=g.spawn(key,0,key==='snorlax'?158:300,key==='snorlax'?240:500,0),target=key==='snorlax'?g.towers.find(t=>t.team===1&&t.lane===0):freeze(g.spawn('snorlax',1,300,470,0));
      g.attack(u,target);u.cooldown=99;run(g,CARDS[key].attackDuration+.1);traces.push(times);
      assert.equal(times.length,CARDS[key].burst||1,key);
      times.forEach((time,i)=>assert.ok(Math.abs(time-(CARDS[key].windup+i*(CARDS[key].burstSpacing||0)))<=1/60+.001,key));
    }
    assert.deepEqual(traces[0],traces[1],key);
    const g=fresh(),u=g.spawn(key,0,key==='snorlax'?158:300,key==='snorlax'?240:500,0),target=key==='snorlax'?g.towers.find(t=>t.team===1&&t.lane===0):freeze(g.spawn('snorlax',1,300,470,0));g.attack(u,target);g.damage(u,1,1,{stun:2});run(g,1.4);assert.equal(target.hp,target.maxHp,key);
  }
});

test('online snapshots preserve the new formations, pending hits and shared attack timings',()=>{
  const g=fresh({deck:['diglettHorde',...DEFAULT_DECK.slice(0,7)]});g.deploy(0,0,300,500);const tank=g.spawn('snorlax',1,300,470,0);run(g,1);
  const clone=unpackGame(JSON.parse(JSON.stringify(packGame(g))));run(g,.7);run(clone,.7);
  assert.equal(clone.units.find(u=>u.id===tank.id)?.hp,g.units.find(u=>u.id===tank.id)?.hp);
  assert.deepEqual(clone.units.map(u=>[u.id,u.hp,u.attackWindup]),g.units.map(u=>[u.id,u.hp,u.attackWindup]));
});

test('the card detail thresholds match real damage including shields and armor',()=>{
  for(const key of['diglett','poochyenaPack','treecko','mrmime','slowbro','aggron','steelix']){
    const g=fresh(),u=g.spawn(key,0,300,500,0),expected=cardThresholds(CARDS[key])[0][1];let shots=0;
    while(u.hp>0&&shots<100){g.damage(u,109,1);shots++;}assert.equal(shots,expected,key);
  }
});

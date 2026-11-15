import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {Renderer} from '../dist/render.js';

for(const hz of[30,60])for(const team of[0,1])test(`Meganium lash contacts at release without projectile travel, ${hz}Hz team ${team}`,()=>{
  const events=[],g=new Game({seed:71,onEvent:event=>events.push({at:g.elapsed,event})});
  g.start();g.aiEnabled=false;g.towers=[];
  const x=team?444:156,a=g.spawn('meganium',team,x,team?255:545,0);
  const target=g.spawn('geodude',1-team,x,team?380:420,0);
  target.card={...target.card,passive:true,speed:0};target.hp=target.maxHp=10000;
  while(g.elapsed<.8)g.step(1/hz);
  const rows=events.filter(row=>row.event.sourceId===a.id||row.event.attacker===a);
  const start=rows.find(row=>row.event.type==='attackStart'),release=rows.find(row=>row.event.type==='attackRelease');
  const damage=rows.filter(row=>row.event.type==='damage'),beam=rows.filter(row=>row.event.type==='beam');
  assert.ok(start&&release);assert.ok(Math.abs(release.at-start.at-CARDS.meganium.windup)<1/hz+1e-7);
  assert.equal(damage.length,1);assert.equal(beam.length,1);assert.equal(damage[0].at,release.at);assert.equal(beam[0].at,release.at);
  assert.equal(damage[0].event.amount,CARDS.meganium.damage);assert.equal(target.hp,10000-CARDS.meganium.damage);assert.equal(g.projectiles.length,0);
  const r=Object.assign(Object.create(Renderer.prototype),{effects:[]});r.onEvent(beam[0].event);
  assert.equal(r.effects.length,1);assert.equal(r.effects[0].life,.42,'visual recovery does not become projectile travel');
});

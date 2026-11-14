import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS,TILE,spellOverlapsTarget} from '../dist/engine.js';
import {spellPreviewTargets} from '../dist/spell-preview.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';

test('Fireball keeps a 2.5-cell radius and uses the full footprint of each target',()=>{
  assert.equal(CARDS.fireball.splash,2.5*TILE);
  const unit={x:300,y:300,radius:12,card:CARDS.geodude};
  assert.equal(spellOverlapsTarget(CARDS.fireball,{x:371.9,y:300},unit),true);
  assert.equal(spellOverlapsTarget(CARDS.fireball,{x:372.1,y:300},unit),false);
  const tower={x:442,y:172,king:false,radius:29};
  assert.equal(spellOverlapsTarget(CARDS.fireball,{x:358.1,y:172},tower),true);
  assert.equal(spellOverlapsTarget(CARDS.fireball,{x:357.9,y:172},tower),false);
  assert.equal(spellOverlapsTarget(CARDS.fireball,{x:376,y:238},tower),true);
  assert.equal(spellOverlapsTarget(CARDS.fireball,{x:374,y:240},tower),false,'square corners must not acquire an inflated circular radius');
});

test('one cell between a central defense and princess can hit both, with matching preview and CPU valuation',()=>{
  for(const mirrored of[false,true]){
    const events=[],original=new Game({seed:971});original.start();original.aiEnabled=false;original.towers.forEach(t=>t.active=false);
    const defense=original.spawn('regice',1,300,232,0),tower=original.towers.find(t=>t.team===1&&t.lane===1),outside=original.spawn('regice',1,265,232,0);
    const g=mirrored?unpackGame(perspective(packGame(original),1)):original;g.onEvent=e=>events.push(e);
    const team=mirrored?1:0,point=mirrored?{x:228,y:592}:{x:372,y:208};
    const preview=spellPreviewTargets(g,CARDS.fireball,point,team).map(t=>t.id);
    assert.ok(preview.includes(defense.id));assert.ok(preview.includes(tower.id));assert.ok(!preview.includes(outside.id));
    // CPU evaluates the player side; the mirrored scene has its enemies there.
    if(mirrored)assert.equal(g.spellValue(CARDS.fireball,point),CARDS.fireball.damage+CARDS.fireball.towerDamage);
    g.hands[team][0]='fireball';g.energy[team]=10;assert.ok(g.deploy(team,0,point.x,point.y).ok);
    for(let i=0;i<150;i++)g.step(1/60);
    const hits=events.filter(e=>e.type==='damage'&&e.sourceKey==='fireball');
    assert.equal(hits.find(e=>e.target.id===tower.id)?.amount,CARDS.fireball.towerDamage);
    assert.equal(hits.find(e=>e.target.id===defense.id)?.amount,CARDS.fireball.damage);
    assert.ok(!hits.some(e=>e.target.id===outside.id));
  }
});

test('a lingering spell uses the same body edge as the preview on each tick',()=>{
  const g=new Game({seed:99});g.start();g.aiEnabled=false;g.towers=[];
  const c=CARDS.spikes,point={x:300,y:300},inside=g.spawn('squirtle',1,300+c.splash+11.9,300,0),outside=g.spawn('squirtle',1,300+c.splash+12.1,300,0);
  assert.deepEqual(spellPreviewTargets(g,c,point).map(u=>u.id),[inside.id]);
  g.spellField({card:c,key:'spikes',team:0,...point});g.stepFields(.5);
  assert.ok(inside.hp<inside.maxHp);assert.equal(outside.hp,outside.maxHp);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
import {healthMeterWidth,layoutUnitHealth,structureOcclusionRegions,drawVisibleStructure} from '../dist/unit-visibility.js';
const overlaps=(a,b)=>Math.abs(a.x-b.x)<(a.width+b.width)/2+(a.compact?1:2)+(b.compact?1:2)&&a.y-(a.compact?1:2)<b.y+(b.compact?5:10)&&b.y-(b.compact?1:2)<a.y+(a.compact?5:10);
const entry=(unit,y=unit.y-30,height=24)=>({unit,x:unit.x,y,compact:height<=32,width:healthMeterWidth(unit,30,height)});
const fresh=()=>{const g=new Game({tutorial:true});g.start();g.aiEnabled=false;return g;};

test('the real successive hut pair has separate owner meters without moving units or parent health',()=>{
  const g=fresh();g.hands[0][0]='raltsHut';g.hands[1][0]='snorlax';g.energy=[10,10];g.deploy(0,0,168,508);g.deploy(1,0,168,364);
  for(let i=0;i<150;i++)g.step(1/30);
  const parent=g.units.find(u=>u.key==='raltsHut'),children=g.units.filter(u=>u.parentId===parent.id);assert.equal(children.length,2);
  const original=children.map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp,parentId:u.parentId})),meters=children.map(u=>entry(u,442.8468525,29.09)),parentMeter={unit:parent,x:168,y:423.7806763,width:44};
  const layout=layoutUnitHealth([...meters,parentMeter]);assert.ok(!overlaps(layout[0],layout[1]));
  assert.ok(layout.slice(0,2).every((bar,i)=>bar.unit===children[i]&&Math.abs(bar.x-children[i].x)<5&&bar.y===meters[i].y));
  assert.deepEqual(layout[2],parentMeter);assert.equal(healthMeterWidth(parent,44),44);
  assert.deepEqual(children.map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp,parentId:u.parentId})),original);
});

for(const key of['pandilla','raltsTrio','diglettHorde'])test(`${key}: actual native formation keeps independent bounded meters`,()=>{
  const g=fresh();g.hands[0][0]=key;g.energy[0]=10;assert.ok(g.deploy(0,0,288,508).ok);
  const meters=g.units.map(u=>entry(u)),saved=meters.map(m=>({id:m.unit.id,x:m.unit.x,y:m.unit.y,hp:m.unit.hp})),layout=layoutUnitHealth(meters);
  assert.equal(layout.length,meters.length);
  for(let i=0;i<layout.length;i++){
    assert.equal(layout[i].unit,meters[i].unit);assert.ok(Math.abs(layout[i].x-meters[i].x)<=14);assert.ok(Math.abs(layout[i].y-meters[i].y)<=48);
    for(let j=0;j<i;j++)assert.ok(!overlaps(layout[i],layout[j]),`meters${i}/${j} overlap`);
  }
  assert.deepEqual(meters.map(m=>({id:m.unit.id,x:m.unit.x,y:m.unit.y,hp:m.unit.hp})),saved);
});

test('unrelated and shielded lone meters keep their original owner, coordinates and values',()=>{
  const unit={id:82,x:100,y:200,radius:12,shield:50,maxHp:900,card:{}},meter={unit,x:100,y:150,width:30};
  assert.deepEqual(layoutUnitHealth([meter]),[meter]);assert.equal(unit.shield,50);assert.equal(healthMeterWidth(unit,30),30);
});

test('structure reveal follows actual behind-body overlap and entry, without species or parent IDs',()=>{
  const structure={id:1,x:200,y:500,card:{structure:true}},box={left:160,right:240,top:420,bottom:508};
  const actor={id:908,x:190,y:475,hp:133,spawn:0,card:{}},measure=unit=>({width:20,height:28,bottom:unit.y});
  const region=structureOcclusionRegions(structure,[actor],box,measure)[0];assert.equal(region.id,908);assert.ok(region.strength>.8);assert.equal(region.x,actor.x);
  const entering={...actor,spawn:.5,spawnGroup:{duration:.5}};assert.ok(structureOcclusionRegions(structure,[entering],box,measure)[0].strength<region.strength);
  for(const changed of[{y:520},{x:300},{hp:0},{burrowed:true},{hidden:true},{invisible:true},{card:{structure:true}}])assert.deepEqual(structureOcclusionRegions(structure,[{...actor,...changed}],box,measure),[]);
  assert.deepEqual(structureOcclusionRegions({...structure,burrowed:true},[actor],box,measure),[]);
  assert.deepEqual(structureOcclusionRegions(structure,[actor],box,measure)[0],region,'Same paused inputs retain the same local mask.');
  assert.deepEqual(actor,{id:908,x:190,y:475,hp:133,spawn:0,card:{}});
});

test('a structure with no occluded body uses its original painter once',()=>{
  const ctx={},seen=[];const value=drawVisibleStructure(ctx,{},[],c=>{seen.push(c);return 17;});
  assert.equal(value,17);assert.deepEqual(seen,[ctx]);
});

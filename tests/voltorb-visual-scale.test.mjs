import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js?v=34';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js?v=34';
import {unpackEvent} from '../dist/online-wire.js?v=34';
import {Renderer} from '../dist/render.js';
import old from './fixtures/spirit-scales-5d1.json' with {type:'json'};
import manifest from '../dist/assets/pokemon/manifest.json' with {type:'json'};
const withoutScale=card=>{const{scale,visualScale,...fields}=card;return fields;};

test('Voltorb scale is per key and every other spirit field stays identical to the published fixture',()=>{
 assert.equal(CARDS.voltorb.scale,1.35);assert.equal(CARDS.voltorb.visualScale,1.35);assert.deepEqual(withoutScale(CARDS.voltorb),withoutScale(old.voltorb));
 assert.deepEqual(CARDS.fireSpiritToken,old.fireSpiritToken);assert.equal(CARDS.fireSpiritToken.scale,1.875);
});

test('full legacy unit/event cards normalize visual scale in both perspectives without changing rules or FireSpiritToken',()=>{
 const g=new Game({tutorial:true,seed:941});g.start();const v=g.spawn('voltorb',0,168,600,0),f=g.spawn('fireSpiritToken',0,240,600,0);
 v.card=structuredClone(old.voltorb);v.scale=1.875;f.card=structuredClone(old.fireSpiritToken);f.scale=1.875;const packet=packGame(g);
 for(const team of[0,1]){
  const r=unpackGame(perspective(packet,team)),body=r.units.find(u=>u.id===v.id),token=r.units.find(u=>u.id===f.id);
  assert.equal(body.card.scale,1.35);assert.equal(body.scale,1.35);assert.deepEqual(withoutScale(body.card),withoutScale(old.voltorb));assert.equal(body.radius,v.radius);assert.equal(body.hp,v.hp);
  assert.deepEqual(token.card,old.fireSpiritToken);assert.equal(token.scale,1.875);
  for(const unit of[v,f]){const e=unpackEvent(perspective({type:'spawn',unit:structuredClone({...unit,target:null})},team)).unit;assert.equal(e.card.scale,unit.key==='voltorb'?1.35:1.875);assert.equal(e.id,unit.id);assert.equal(e.radius,unit.radius);}
 }
 assert.equal(v.card.scale,1.875,'The authoritative input is not mutated');
});

test('integrated catalog scaling gives the same native body pose as the observed1.35 fixture override',()=>{
 const meta=manifest['100'].Walk,renderer=Object.assign(Object.create(Renderer.prototype),{reduced:false,t:2,drawDt:0,verticalScale:1.5,metadata:{100:{Walk:meta}},sprites:new Map([['100-Walk',{width:meta.width*meta.durations.length,height:meta.height*8}]]),speciesLoads:new Map([[100,Promise.resolve()]]),anchors:new Map(),bodyHeights:new Map([[100,18]])});
 const unit={id:7,key:'voltorb',card:CARDS.voltorb,radius:CARDS.voltorb.radius,x:168,y:600,dx:0,dy:-1,attack:0,moving:true,anim:2,spawn:0};
 const a=renderer.nativeSpritePose(unit),b=renderer.nativeSpritePose({...unit,scale:1.35,card:old.voltorb});
 for(const field of['id','scale','vertical','anim','frame','direction','lift','lunge'])assert.deepEqual(a[field],b[field],field);assert.deepEqual(a.anchor,b.anchor);
});

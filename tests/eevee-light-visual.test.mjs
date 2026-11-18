import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Renderer} from '../dist/render.js';
import {prepareC4Catalog,getC4BaseCard} from '../dist/c4-catalog.js?v=1';
import {getEeveeLightProfile} from '../dist/eevee-light-profile.js?v=1';
import {CARDS} from '../dist/engine.js';
import {SPRITE_GEOMETRY} from '../dist/sprite-geometry.js?v=34';
import {emissionPoint,attackAnimationFrame} from '../dist/sprite-motion.js?v=34';
import {isLightEevee,LIGHT_EEVEE_SCALE,lightEeveeContactPoint,drawLightEeveeContact,lightEeveeHealthPlacement,lightEeveeAdvance} from '../dist/eevee-light-visual.js';
import {EEVEE_NATIVE_BOUNDS} from '../dist/eevee-native-bounds.js';

await prepareC4Catalog();
const profile=getEeveeLightProfile(),metadata=JSON.parse(await readFile(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)));
const unit=card=>({id:8,key:'eevee',card,x:168,y:228,dx:0,dy:-1,hp:311,maxHp:420,spawn:0,attack:card.attackDuration-card.windup,attackDuration:card.attackDuration,attackWindup:card.windup,attackSeq:2,attackAnim:'Attack'});
function renderer(){
 const r=Object.assign(Object.create(Renderer.prototype),{t:1,reduced:false,verticalScale:1,metadata,bodyHeights:new Map([[133,17]]),speciesLoads:new Map([[133,Promise.resolve()]]),sprites:new Map(),anchors:new Map(),effects:[],frameActors:new Map()});
 for(const[name,meta]of Object.entries(metadata[133])){
  r.sprites.set('133-'+name,{width:meta.width*meta.durations.length,height:meta.height*8});
  const points=SPRITE_GEOMETRY[133][name]?.points;if(points)r.anchors.set('133-'+name,points.map(row=>row.map(p=>({x:p[0],y:p[1]}))));
 }
 return r;
}

test('only the typed light profile gets the smaller visual body and matching visual emitter',()=>{
 const r=renderer(),a=unit(profile),before=structuredClone(profile),pose=r.nativeSpritePose(a);
 assert.equal(pose.scale,1.5);assert.equal(pose.frame,3);assert.deepEqual(pose.anchor,{x:32,y:30});
 const expected=emissionPoint({...a,scale:LIGHT_EEVEE_SCALE},0,0);
 const shown=r.visualEmission(a);assert.equal(shown.x,expected.x);assert.equal(shown.y,expected.y);
 assert.deepEqual(profile,before);assert.equal(profile.scale,2);
 for(const card of[CARDS.eevee,getC4BaseCard('eevee')]){assert.equal(isLightEevee(card),false);assert.equal(r.nativeSpritePose(unit(card)).scale,2);}
 assert.equal(isLightEevee({...profile,id:65}),false);
});

test('native preparation and return advance through the required release pose',()=>{
 const meta=SPRITE_GEOMETRY[133].Attack;
 assert.notEqual(attackAnimationFrame(meta,.2,.55,.25),3);
 assert.equal(attackAnimationFrame(meta,.25,.55,.25),3);
 assert.equal(attackAnimationFrame(meta,8/30,.55,.25),3);
 assert.ok(attackAnimationFrame(meta,.4,.55,.25)>3);
 assert.equal(attackAnimationFrame(meta,.55,.55,.25),10);
});

test('the existing compact meter sits beside every native pose instead of over its pixels',()=>{
 let checked=0;
 for(const[name,rows]of Object.entries(EEVEE_NATIVE_BOUNDS))for(let direction=0;direction<rows.length;direction++)for(let frame=0;frame<rows[direction].length;frame++){
  const p=SPRITE_GEOMETRY[133][name].points[direction][frame],pose={anim:name,direction,frame,scale:1.5,vertical:1,anchor:{x:p[0],y:p[1]},lunge:0,lift:0};
  const placement=lightEeveeHealthPlacement(unit(profile),pose,24,1.3,{left:60,right:540});
  assert.ok(placement.x-12>placement.body.right||placement.x+12<placement.body.left);
  assert.ok(placement.y+2.6>=placement.body.top&&placement.y+2.6<=placement.body.bottom);
  assert.ok(placement.x-12>=60&&placement.x+12<=540);checked++;
 }
 assert.equal(checked,176);
 const a=unit(profile),pose=renderer().nativeSpritePose(a);a.x=525;
 const edge=lightEeveeHealthPlacement(a,pose,24,1.3,{left:60,right:540});assert.ok(edge.x+12<edge.body.left);
});

test('legacy compact health never asks for the new native-pose placement',()=>{
 const a={...unit(CARDS.eevee),hp:200,maxHp:420},r=Object.assign(Object.create(Renderer.prototype),{bodyHeights:new Map(),bodyHeight:()=>30,projection:{scale:1},unitHealthQueue:[],nativeSpritePose(){throw Error('legacy pose must not be inspected');}});
 r.queueUnitHealth({},a,168,180,44);assert.equal(r.unitHealthQueue[0].x,168);assert.equal(r.unitHealthQueue[0].y,178);
});

test('a compact cropped contact preserves native pixel scale and its saved surface',()=>{
 const point=lightEeveeContactPoint({x:168,y:172},{x:168,y:200}),before=structuredClone(point),image={},draws=[];
 const c={globalAlpha:1,save(){},restore(){},drawImage(...args){draws.push(args);}};
 for(const progress of[0,.3,.6])drawLightEeveeContact(c,image,point,progress);
 for(const draw of draws){assert.equal(draw[7]/draw[3],24/32);assert.equal(draw[8]/draw[4],24/32);assert.ok(draw[1]>=32,'skip the tiny initial seed');}
 assert.deepEqual(point,before);assert.deepEqual(point.surface,{x:168,y:172});assert.equal(draws.length,3);
 assert.deepEqual({x:point.x,y:point.y},point.surface);
 const reduced=[];c.drawImage=(...args)=>reduced.push(args);drawLightEeveeContact(c,image,point,.1,true);drawLightEeveeContact(c,image,point,.6,true);assert.deepEqual(reduced[0],reduced[1]);
});
test('light Eevee makes a short grounded advance at release and returns smoothly',()=>{
 const a=unit(profile);
 const at=elapsed=>lightEeveeAdvance({...a,attack:a.attackDuration-elapsed});
 const begin=at(0),middle=at(.125),release=at(.25),recovery=at(.4),end=at(.55);
 const length=v=>Math.hypot(v.x,v.y);
 assert.equal(length(begin),0);assert.ok(length(middle)>0&&length(middle)<length(release));assert.ok(Math.abs(length(release)-3)<1e-8);
 assert.ok(length(recovery)>0&&length(recovery)<length(release));assert.equal(length(end),0);
 assert.deepEqual(lightEeveeAdvance(a,true),{x:0,y:0});
 assert.deepEqual(lightEeveeAdvance({...a,card:CARDS.eevee}),{x:0,y:0});
});
test('the displayed actor, its shadow origin and health share one bounded offset without contour sampling',()=>{
 const a=unit(profile),legacy={...unit(CARDS.eevee),id:9},r=renderer();r.biteTargetSurface=()=>{throw Error('per-frame contour sampling');};r.frameActors=new Map([[a.id,a],[legacy.id,legacy]]);
 r.prepareLightEeveeActors();const shown=r.frameActors.get(a.id);
 assert.equal(shown.x,a.x);assert.equal(shown.y,a.y-3);
 assert.equal(a.y,228);assert.equal(r.frameActors.get(legacy.id),legacy);
 const pose=r.nativeSpritePose(shown),health=lightEeveeHealthPlacement(shown,pose,24,1.3,{left:60,right:540}),old=lightEeveeHealthPlacement(a,pose,24,1.3,{left:60,right:540});
 assert.equal(health.y,old.y-3);assert.equal(health.ownerY,old.ownerY-3);
});

test('typed melee produces one short contact; the hit event adds no duplicate',()=>{
 const r=renderer(),event={key:'eevee',sourceId:8,targetId:4,sourceCard:profile,style:'slam',from:{x:168,y:200},to:{x:168,y:145},radius:0};
 r.onEvent({type:'melee',...event});assert.equal(r.effects.length,1);assert.equal(r.effects[0].max,.28);
 r.onEvent({type:'hit',...event,x:168,y:145});assert.equal(r.effects.length,1);
 const old=renderer();old.onEvent({type:'melee',...event,sourceCard:CARDS.eevee,style:'dash'});assert.equal(old.effects[0].max,.27);
});

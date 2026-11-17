import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {CARDS} from '../dist/engine.js?v=34';
import {electricLore,electricUnitState,drawElectricCore} from '../dist/electric-lore.js';

function context(){
  const calls=[];
  const c=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
  return{c,calls};
}
function renderer(){return Object.assign(Object.create(Renderer.prototype),{frameActors:new Map(),visualProjectiles:new Map(),t:0,drawDt:1/60,verticalScale:1,reduced:false,effects:[],particles:[],art:[],burst(){},combatArt(_c,name,x,y){this.art.push({name,x,y});}});}

test('electric lore distinguishes the active Furnace, its splash child, and unrelated identities',()=>{
  assert.equal(electricLore('centralElectrode',CARDS.centralElectrode),'electrode');
  assert.equal(electricLore('fireSpiritToken',CARDS.fireSpiritToken),'child');
  for(const key of ['electrode','forretress','voltorb','pikachu','zapdos','magnemite'])assert.equal(electricLore(key,CARDS[key]),null,key);
  assert.equal(electricLore('centralElectrode',CARDS.fireSpiritToken),null);
  const unit={key:'centralElectrode',card:CARDS.centralElectrode,hp:727,attack:.5,attackDuration:.66,attackWindup:.5,stun:0};
  const frozen=JSON.stringify(unit);assert.ok(electricUnitState(unit));assert.equal(JSON.stringify(unit),frozen);
  assert.equal(electricUnitState({...unit,stun:.1}),null);
  assert.equal(electricUnitState({...unit,hp:0}),null);
  assert.equal(electricUnitState({...unit,attack:0}),null);
});

test('the native child attack burst gets one local splash visual; a killed child creates none',()=>{
  const r=renderer(),unit={id:1,key:'fireSpiritToken',card:CARDS.fireSpiritToken,x:168,y:400};
  r.onEvent({type:'deathBurst',unit,radius:55.2,style:'ember'});
  assert.equal(r.effects.length,1);assert.equal(r.effects[0].kind,'electricImpact');assert.equal(r.effects[0].radius,55.2);
  r.onEvent({type:'hit',key:'fireSpiritToken',x:168,y:400,sourceId:1,style:'ember'});
  assert.equal(r.effects.length,1,'the suicide hit does not duplicate the native burst');
  r.effects=[];r.onEvent({type:'faint',unit});assert.equal(r.effects.length,0);
  r.onEvent({type:'beam',key:'voltorb',style:'lightning',hop:1,from:{x:1,y:1},to:{x:2,y:2}});
  assert.equal(r.effects[0].kind,'beam','real Electro Spirit links keep their original path');
});

for(const mirrored of [false,true])test(`saved Furnace flight is unmodified, continuous, and survives its source, view ${mirrored?2:1}`,()=>{
  const r=renderer(),target={id:2,x:mirrored?100:500,y:500,card:CARDS.grimer},direction=mirrored?-1:1,startX=mirrored?500:100;
  const p={id:'native-shot',key:'centralElectrode',sourceId:1,style:'ember',target,x:startX,y:500,startX,startY:500,totalDistance:400,travelled:0,speed:288,groundPath:true,liftX:0,liftY:-15,endLiftY:-15};
  r.frameActors.set(1,{id:1,key:'centralElectrode',card:CARDS.centralElectrode,x:startX,y:500});
  const points=[];
  for(let frame=0;frame<36;frame++){
    p.travelled=Math.floor(frame/4)*288/15;p.x=startX+direction*p.travelled;r.t=frame/60;
    if(frame===16)r.frameActors.delete(1);
    const frozen=JSON.stringify(p),{c}=context();r.art=[];r.projectile(c,p);assert.equal(JSON.stringify(p),frozen,'painting cannot change the native projectile/card');
    const point=r.art.find(p=>p.name==='electricHop');assert.ok(point&&Number.isFinite(point.x)&&Number.isFinite(point.y));points.push(point.x);
  }
  assert.ok(points.slice(1).filter((x,i)=>direction*(x-points[i])>.01).length>=30,'the new core follows interpolated poses rather than packet jumps');
});

test('reduced motion has a stable shot shape when only the material clock changes',()=>{
  const a=context(),b=context(),shot={x:20,y:30,size:18,angle:.3,travelled:50,reduced:true};
  drawElectricCore(a.c,{...shot,age:0});drawElectricCore(b.c,{...shot,age:3.8});assert.deepEqual(a.calls,b.calls);
});

test('only the electric head enters the foreground queue; its trail stays below HUD',()=>{
  const r=renderer(),{c,calls}=context();r.projectileHeadQueue=[];
  r.projectile(c,{id:'shot',key:'centralElectrode',sourceId:1,style:'ember',x:168,y:400,startX:168,startY:450,totalDistance:150,travelled:50,speed:288,target:{id:2,x:168,y:300},impactPoint:{x:168,y:300}});
  assert.ok(calls.some(c=>c[0]==='stroke'),'trail is painted in the world pass');
  assert.equal(r.art.length,0);assert.equal(r.projectileHeadQueue.length,1);
  const strokes=calls.filter(c=>c[0]==='stroke').length;r.projectileHeadQueue[0]();
  assert.equal(r.art[0].name,'electricHop');assert.equal(calls.filter(c=>c[0]==='stroke').length,strokes,'queued head does not repaint its trail over health');
});

test('local child splash paints behind actors with the existing lifetime, once',()=>{
  const r=renderer(),{c,calls}=context();r.effects=[{kind:'electricImpact',x:168,y:400,radius:55.2,visualSize:28,life:.4,max:.42}];
  r.drawGroundElectricImpacts(c,1/60);assert.ok(calls.some(c=>c[0]==='stroke'));assert.equal(r.effects[0].life,.4,'ground pass does not advance time');
  calls.length=0;r.drawEffects(c,1/60);assert.equal(calls.filter(c=>c[0]==='stroke').length,0,'foreground pass does not cover actors with splash');
  assert.ok(Math.abs(r.effects[0].life-(.4-1/60))<1e-10);
});

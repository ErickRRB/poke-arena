import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {Renderer} from '../dist/render.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';
import {SPELL_VISUALS,spellVisualProfile,spellFlightAge,spellFlightVisual,missileFlightVisuals} from '../dist/spell-visuals.js';

const context=()=>new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function renderer(){const calls=[],r=Object.assign(Object.create(Renderer.prototype),{t:0,drawDt:1/60,reduced:false,verticalScale:1,effects:[],combatArt:(_,name,x,y)=>calls.push({name,x,y}),capsule:(_,x,y)=>calls.push({name:'capsule',x,y})});return{r,calls,c:context()};}

test('every spell has an explicit material; key/native identity wins over missing or misleading style',()=>{
 for(const[key,card]of Object.entries(CARDS).filter(([,c])=>c.spell))assert.ok(SPELL_VISUALS[key],key);
 assert.equal(spellVisualProfile({key:'pinMissile',card:{style:'ember'}}).flight,'needles');
 assert.equal(spellVisualProfile({card:{nativeReference:'Rocket'}}).flight,'hyper');
 assert.equal(spellVisualProfile({key:'unknown',card:{style:'ember'}}),null);
});

test('only Fireball uses its fire head/trail; other spells retain their own routes',()=>{
 for(const[key,card]of Object.entries(CARDS).filter(([,c])=>c.spell)){
  const{r,calls,c}=renderer(),spell={key,card,visualId:key,team:0,startX:300,startY:712,x:300,y:268,flightTime:1,flightElapsed:.5,delay:0};
  r.spellFlight(c,spell);const names=calls.map(c=>c.name);
  if(key==='fireball')assert.ok(names.includes('emberShot')&&names.includes('fireTrail'));
  else assert.ok(!names.includes('emberShot')&&!names.includes('fireTrail'),key);
  if(key==='pinMissile')assert.ok(names.length>0&&names.every(n=>n==='needle'));
  if(key==='hyperBeam')assert.deepEqual(names,['hyperHead']);
  if(key==='sneaselAmbush')assert.deepEqual(names,['capsule']);
  if(['none','rolling'].includes(SPELL_VISUALS[key].flight))assert.equal(names.length,0,key);
 }
});

test('all three Pin Missil waves end at the real scheduled hit without a competing cast effect',()=>{
 const{r,c}=renderer(),game=new Game({seed:312}),hits=[];game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);
 game.onEvent=e=>{r.onEvent(e);if(e.type==='spellHit')hits.push({time:game.elapsed,wave:e.wave});};
 game.energy[0]=10;game.hands[0][0]='pinMissile';assert.ok(game.deploy(0,0,300,268).ok);
 assert.equal(r.effects.length,0);const first=game.spells[0].flightTime,original=structuredClone(packGame(game));
 for(let i=0;i<Math.ceil((first+.7)*60);i++){
  game.step(1/60);const spell=game.spells[0];if(!spell)continue;
  const before=JSON.stringify(packGame(game));r.spellFlight(c,spell);assert.equal(JSON.stringify(packGame(game)),before);
  const shots=missileFlightVisuals(spell,spellFlightAge(spell));
  assert.ok(shots.every(s=>s.wave>=(spell.resolvedWaves||0)),'no carrier remains after its hit');
 }
 assert.equal(hits.length,3);hits.forEach((h,i)=>assert.ok(Math.abs(h.time-first-i*CARDS.pinMissile.waveEvery)<=1/60+1e-7));
 const restored=unpackGame(perspective(original,1));assert.equal(spellFlightAge(restored.spells[0]),0);
 for(let wave=0;wave<3;wave++){
  const source={...original.spells[0],flightElapsed:first,arrived:true,resolvedWaves:wave,delay:wave?.1:0};
  const copy=unpackGame(perspective({...original,spells:[source]},1)).spells[0];
  assert.equal(spellFlightAge(source),spellFlightAge(copy));assert.equal(missileFlightVisuals(source,first*.5).length,missileFlightVisuals(copy,first*.5).length);
 }
});

test('energy, fire and capsule paths advance continuously and reach the exact logical impact point in both perspectives',()=>{
 for(const key of['fireball','hyperBeam','sneaselAmbush'])for(const team of[0,1]){
  const spell={key,card:CARDS[key],team,startX:300,startY:team?88:712,x:team?432:168,y:team?628:172,flightTime:2};let previous;
  for(let frame=0;frame<=120;frame++){
   const pose=spellFlightVisual(spell,frame/60),next=pose.point;
   if(previous)assert.ok(Math.hypot(next.x-previous.x,next.y-previous.y)<14,key);
   previous=next;assert.ok(Number.isFinite(pose.angle));
  }assert.ok(Math.hypot(previous.x-spell.x,previous.y-spell.y)<1e-9);
 }
});

for(const hz of[15,30,60])test(`Pin Missil keeps moving at display cadence with ${hz} Hz snapshots; pause/reduced do not invent hits`,()=>{
 const{r,c,calls}=renderer(),spell={key:'pinMissile',card:CARDS.pinMissile,visualId:1,team:0,startX:300,startY:712,x:168,y:172,flightTime:2,flightElapsed:0,delay:0};let prior=-1;const heads=[];
 for(let frame=0;frame<105;frame++){
  spell.flightElapsed=Math.floor(frame*hz/60)/hz;if(frame===81)spell.flightElapsed-=.01;
  calls.length=0;r.spellFlight(c,spell);const clock=r.visualFlights.get(1).elapsed;
  assert.ok(clock>=prior);prior=clock;heads.push(calls[0]);
 }
 const moving=heads.slice(10).filter((p,i,a)=>i&&Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y)>0.01).length;assert.ok(moving>=heads.length-12);
 r.drawDt=0;const before=r.visualFlights.get(1).elapsed;for(let i=0;i<10;i++)r.spellFlight(c,spell);assert.equal(r.visualFlights.get(1).elapsed,before);
 r.reduced=true;r.spellFlight(c,spell);assert.equal(r.effects.length,0);
});

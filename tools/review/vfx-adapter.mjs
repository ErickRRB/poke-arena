import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import * as baseline from './baseline-adapter.mjs';

const root=path.resolve(import.meta.dirname,'../..'),states=new WeakMap();
const runtime=['render.js','engine.js','balance.js','sprite-motion.js','wing-motion.js','fire-material.js','combat-visuals.js','online-config.js','canvas-raster.js','native-sprite-sampling.js'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function validate(c){
 if(!['north-short','east-short','concurrent-heads','wheel','fireball'].includes(c.scene))throw Error('Unsupported VFX scene');
 const required=['wheel','fireball'].includes(c.scene)?2400:6200;
 if(!Number.isFinite(c.preRollMs)||c.preRollMs<300||c.durationMs<c.preRollMs+required)throw Error('VFX case needs preroll and complete action coverage');
 if(c.snapshots&&c.scene==='concurrent-heads')throw Error('Snapshot scope is isolated action only');
}
export async function beforeNavigate(page,c){
 validate(c);
 if(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim())throw Error('Commit the scenario before capturing a frozen VFX source');
 const state={errors:[],jobs:[],loaded:{},runtime:Object.fromEntries(runtime.map(file=>['/dist/'+file,hash(readFileSync(path.join(root,'dist',file)))]))};states.set(page,state);
 page.on('pageerror',error=>state.errors.push(error.message));
 page.on('response',response=>{
  const pathname=new URL(response.url()).pathname,expected=state.runtime[pathname];if(!expected)return;
  state.jobs.push((async()=>{if(response.status()!==200||hash(await response.body())!==expected)throw Error('Loaded runtime mismatch: '+pathname);state.loaded[pathname]=expected;})().catch(error=>state.errors.push(error.message)));
 });
 await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
 await page.emulateMedia({reducedMotion:c.reduced?'reduce':'no-preference'});
 await baseline.beforeNavigate(page,c);
}
export async function prepare(page,c){
 await baseline.prepare(page,c);
 await page.evaluate(async()=>{
  const q=__reviewAdapter,g=q.game,r=q.renderer;q.action=true;
  g.aiEnabled=false;g.towers.forEach(t=>t.active=false);
  await r.ensureSpecies([6,143,146,224,37]);
  for(const [id,animation]of [[6,'Shoot'],[143,'Walk'],[146,'Shoot'],[224,'Shoot'],[37,'Shoot']])if(!r.metadata[id]?.[animation]||!r.sprites.get(id+'-'+animation)?.width)throw Error('Missing native species resource '+id+' '+animation);
  if(!r.canvas.toDataURL().startsWith('data:image/png'))throw Error('Canvas is not exportable');
 });
 const state=states.get(page);await Promise.all(state.jobs);
 if(state.errors.length||runtime.some(file=>!state.loaded['/dist/'+file]))throw Error('VFX resource preflight failed: '+state.errors.join('; '));
 await page.evaluate(async c=>{
  const q=__reviewAdapter,g=q.game,r=q.renderer;
  g.units=[];g.projectiles=[];g.spells=[];g.fields=[];g.attacks=[];g.energy=[10,10];
  r.resetVisuals();r.effects=[];r.particles=[];r.selection=null;r.pointer=null;q.events=[];
  q.fixture={scene:c.scene,ready:false,actors:[],preRollMs:c.preRollMs,reduced:r.reduced,snapshots:!!c.snapshots,limits:'Isolated authored setup; original Game.step and app rAF retained. Snapshot cases transform draw input and event delivery only, explicitly described below. Sound muted. Particle RNG is not fixed. Two complete post-setup cycles are reviewed; setup gaps are retained.'};
  if(c.snapshots){
   const {publicSnapshot,publicEvent,unpackEvent}=await import('./online-wire.js?v=34');
   const {unpackGame}=await import('./snapshot.js?v=34');
   const step=g.step,draw=r.draw,handle=g.onEvent;let ticks=0,pending=[];
   q.fixture.snapshotMethod='Original CPU30Hz app loop; after every second native step deliver public wire snapshot/events15Hz. Original rAF/draw receives held view with native online animation aging. No replacement clock, websocket or actual network match; synchronous packet delivery, no jitter/loss model.';
   q.fixture.packets=[];
   const deliver=()=>{
    q.snapshotView=unpackGame(publicSnapshot(g,0),()=>{},r.metadata);
    for(const event of pending)handle(unpackEvent(event));pending=[];
    q.fixture.packets.push({wall:performance.timeOrigin+performance.now(),game:g.elapsed,ids:q.snapshotView.units.map(u=>u.id)});
   };
   g.onEvent=event=>pending.push(publicEvent(event));deliver();
   g.step=function(...args){const value=step.apply(this,args);if(++ticks%2===0)deliver();return value;};
   r.draw=function(game,dt,...rest){
    const view=q.snapshotView;view.state=game.state;
    for(const u of [...view.units,...view.towers]){
     u.anim+=dt;u.hit=Math.max(0,(u.hit||0)-dt);
     if(u.card&&view.state==='playing'&&!view.tiebreaker){const activeDt=Math.max(0,dt-u.spawn);u.spawn=Math.max(0,u.spawn-dt);if(u.card.summon)u.summonClock=Math.max(0,u.summonClock-activeDt);}
    }
    return draw.call(this,view,dt,...rest);
   };
  }
  setTimeout(()=>{
   const add=(key,team,x,y,hpRatio=1,shield=false)=>{
    const u=g.spawn(key,team,x,y,0);u.entryPending=false;
    const nativeMaxHp=u.maxHp;u.hp=u.maxHp*hpRatio;
    if(shield){u.shield=500000;u.maxShield=1000000;}
    q.fixture.actors.push({id:u.id,key,team,x,y,nativeMaxHp,hpRatio,shield});return u;
   };
   const durable=(team,x,y)=>{
    const target=add('snorlax',team,x,y);target.hp=target.maxHp=1e7;target.card={...target.card,passive:true,speed:0,damage:0};
    (q.fixture.durableTargets??=[]).push(target.id);return target;
   };
   if(c.scene==='north-short'||c.scene==='east-short'){
    add(c.attacker||'charizard',0,220,540,c.hpRatio??1,!!c.shield);
    durable(1,c.scene==='north-short'?220:310,c.scene==='north-short'?435:540);
    q.fixture.durableTarget={id:q.fixture.durableTargets[0],maxHp:1e7,reason:'Passive target; native Snorlax already uses the wide tank bar.'};
   }else if(c.scene==='concurrent-heads'){
    for(const [x,a,b]of [[120,'charizard','octillery'],[300,'moltres','vulpix'],[480,'octillery','charizard']]){add(a,0,x,540,x===300?1:.35,true);add(b,1,x,435,.35,true);}
    add('vulpix',1,472,740,.35,true);
    q.fixture.durability='Native maxHp retained. Large half-full shields keep actual combat alive without widening troop bars. Middle allied Moltres is healthy; other troops have35% HP.';
   }else{
    const team=c.team??0,key=c.scene==='wheel'?'log':'fireball';
    const x=300,y=key==='log'?(team?280:520):(team?(c.long?600:210):(c.long?200:590));
    if(key==='log'){durable(1-team,300,team?385:415);durable(1-team,300,team?490:310);}else durable(1-team,x,y);
    g.hands[team][0]=key;const result=g.deploy(team,0,x,y);if(!result.ok)throw Error('Fixture deploy failed: '+result.reason);
    q.fixture.deployment={team,key,requested:{x,y},result};
   }
   q.fixture.startEpochMs=performance.timeOrigin+performance.now();q.fixture.startGameTime=g.elapsed;q.fixture.ready=true;
   if(c.pauseAtMs)setTimeout(async()=>{
    const rects=()=>Object.fromEntries(['arena','hand','energy-bar'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return[id,{x:b.x,y:b.y,width:b.width,height:b.height}];}));
    const before=rects();document.getElementById('match-pause').click();
    const phase=()=>({authority:g.spells.map(s=>({key:s.key,flightElapsed:s.flightElapsed,flightTime:s.flightTime,delay:s.delay,arrived:!!s.arrived,done:!!s.done})),wire:q.snapshotView?.spells.map(s=>({key:s.key,flightElapsed:s.flightElapsed,flightTime:s.flightTime,delay:s.delay,arrived:!!s.arrived,done:!!s.done}))});
    await new Promise(resolve=>setTimeout(resolve,120));const first={canvas:r.canvas.toDataURL(),time:r.t,elapsed:g.elapsed,phase:phase()};
    await new Promise(resolve=>setTimeout(resolve,320));const second={canvas:r.canvas.toDataURL(),time:r.t,elapsed:g.elapsed,phase:phase()};
    const inFlight=list=>list?.some(s=>s.key==='fireball'&&s.delay<=0&&!s.arrived&&!s.done&&s.flightElapsed>0&&s.flightElapsed<s.flightTime);
    const digest=async png=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(atob(png.split(',')[1]),x=>x.charCodeAt(0))))).map(x=>x.toString(16).padStart(2,'0')).join('');
    q.fixture.pause={complete:true,rasterStable:first.canvas===second.canvas,rasterSha256:[await digest(first.canvas),await digest(second.canvas)],clockStable:first.time===second.time&&first.elapsed===second.elapsed,layoutStable:JSON.stringify(before)===JSON.stringify(rects()),phase:[first.phase,second.phase],activeFlight:!!inFlight(first.phase.authority)&&(!c.snapshots||!!inFlight(first.phase.wire))};
    document.getElementById('resume-btn').click();
   },c.pauseAtMs);
  },c.preRollMs);
 },c);
}
export async function observe(page,c){
 const sample=await baseline.observe(page,c),state=states.get(page);
 const fixture=await page.evaluate(()=>{
  const q=__reviewAdapter,g=q.game,r=q.renderer,b=r.canvas.getBoundingClientRect();
  return {...q.fixture,device:{touchPoints:navigator.maxTouchPoints,coarse:matchMedia('(pointer:coarse)').matches,visibility:document.visibilityState},canvasClean:r.canvas.toDataURL().startsWith('data:image/png'),actualCanvas:{x:b.x,y:b.y,width:b.width,height:b.height},actors:q.fixture.actors.map(initial=>{const u=g.units.find(u=>u.id===initial.id);return {...initial,current:u?{x:u.x,y:u.y,maxHp:u.maxHp,hp:u.hp,shield:u.shield,maxShield:u.maxShield,attackSeq:u.attackSeq}:null};})};
 });
 if(state.errors.length)throw Error(state.errors.join('; '));
 if(sample.instrumentation.lastStepDt!==1/30)throw Error('Native Game step changed');
 if(sample.instrumentation.network.blocked.length||sample.instrumentation.network.webSockets.length)throw Error('Unexpected external/API/WebSocket attempt in isolated VFX case');
 for(const actor of fixture.actors)if(actor.current&&!fixture.durableTargets?.includes(actor.id)&&actor.current.maxHp!==actor.nativeMaxHp)throw Error('Fixture widened native health bar for '+actor.key);
 const b=fixture.actualCanvas;
 if(!c.contextOnly&&(Math.abs(b.x-c.crop.x)>.5||Math.abs(b.y-c.crop.y)>.5||Math.abs(b.width-c.crop.width)>.5||Math.abs(b.height-c.crop.height)>.5))throw Error('Observed CSS arena differs from the case crop');
 if(b.x<0||b.y<0||b.x+b.width>c.viewport.width+.5||b.y+b.height>c.viewport.height+.5)throw Error('Canvas clipped outside viewport');
 if(fixture.reduced!==!!c.reduced)throw Error('Reduced motion differs from request');
 if(fixture.pause&&(!fixture.pause.rasterStable||!fixture.pause.clockStable||!fixture.pause.layoutStable))throw Error('Pause moved layout, clock or raster');
 if(c.pauseInFlight&&fixture.pause&&!fixture.pause.activeFlight)throw Error('Required pause did not catch an active Fireball flight');
 if(c.snapshots)sample.instrumentation.kind='native-clock-with-declared-wire-view-transform';
 return {...sample,fixture,runtimeHashes:state.loaded};
}

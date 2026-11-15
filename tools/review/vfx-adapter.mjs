import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import * as baseline from './baseline-adapter.mjs';

const root=path.resolve(import.meta.dirname,'../..'),states=new WeakMap();
const runtime=['render.js','engine.js','balance.js','sprite-motion.js','wing-motion.js','fire-material.js','combat-visuals.js','online-config.js'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function validate(c){
 if(!['north-short','concurrent-heads'].includes(c.scene))throw Error('Unsupported VFX scene');
 if(!Number.isFinite(c.preRollMs)||c.preRollMs<300||c.durationMs<c.preRollMs+4200)throw Error('VFX case requires preroll and two complete cycles');
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
 await page.evaluate(c=>{
  const q=__reviewAdapter,g=q.game,r=q.renderer;
  g.units=[];g.projectiles=[];g.spells=[];g.fields=[];g.attacks=[];g.energy=[10,10];
  r.resetVisuals();r.effects=[];r.particles=[];r.selection=null;r.pointer=null;q.events=[];
  q.fixture={scene:c.scene,ready:false,actors:[],preRollMs:c.preRollMs,limits:'Isolated authored setup; native Game.step, rAF, attacks and rendering remain installed. Sound muted. Particle RNG is not fixed.'};
  setTimeout(()=>{
   const add=(key,team,x,y,hpRatio=1,shield=false)=>{
    const u=g.spawn(key,team,x,y,0);u.entryPending=false;
    const nativeMaxHp=u.maxHp;u.hp=u.maxHp*hpRatio;
    if(shield){u.shield=500000;u.maxShield=1000000;}
    q.fixture.actors.push({id:u.id,key,team,x,y,nativeMaxHp,hpRatio,shield});return u;
   };
   if(c.scene==='north-short'){
    add('charizard',0,220,540);
    const target=add('snorlax',1,220,435);target.hp=target.maxHp=1e7;target.card={...target.card,passive:true,speed:0,damage:0};q.fixture.durableTarget={id:target.id,maxHp:1e7,reason:'Passive target; native Snorlax already uses the wide tank bar.'};
   }else{
    for(const [x,a,b]of [[120,'charizard','octillery'],[300,'moltres','vulpix'],[480,'octillery','charizard']]){add(a,0,x,540,x===300?1:.35,true);add(b,1,x,435,.35,true);}
    add('vulpix',1,472,740,.35,true);
    q.fixture.durability='Native maxHp retained. Large half-full shields keep actual combat alive without widening troop bars. Middle allied Moltres is healthy; other troops have35% HP.';
   }
   q.fixture.startEpochMs=performance.timeOrigin+performance.now();q.fixture.startGameTime=g.elapsed;q.fixture.ready=true;
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
 for(const actor of fixture.actors)if(actor.current&&actor.id!==fixture.durableTarget?.id&&actor.current.maxHp!==actor.nativeMaxHp)throw Error('Fixture widened native health bar for '+actor.key);
 const b=fixture.actualCanvas;
 if(Math.abs(b.x-c.crop.x)>.5||Math.abs(b.y-c.crop.y)>.5||Math.abs(b.width-c.crop.width)>.5||Math.abs(b.height-c.crop.height)>.5)throw Error('Observed CSS arena differs from the case crop');
 return {...sample,fixture,runtimeHashes:state.loaded};
}

import * as baseline from './baseline-adapter.mjs';

// Controlled native deployments; the shared workbench owns clocks and capture.
export async function beforeNavigate(page,config){
  if(!['tesla-lifecycle','field-lifecycle'].includes(config.scene))throw Error('Unsupported live feedback scene');
  if(config.scene==='field-lifecycle'&&!['nightmare','stealthRock'].includes(config.fieldKey))throw Error('Unsupported native field');
  await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
  await page.emulateMedia({reducedMotion:config.reduced?'reduce':'no-preference'});
  await baseline.beforeNavigate(page,config);
}
export async function prepare(page,config){
  await baseline.prepare(page,config);
  await page.evaluate(async config=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer;q.action=true;
    g.aiEnabled=false;g.towers.forEach(t=>t.active=false);
    const ids=config.scene==='tesla-lifecycle'?[181,50]:[143,q.CARDS[q.CARDS[config.fieldKey].spawnKey]?.id].filter(Boolean);
    await r.ensureSpecies(ids);
    if(q.CARDS.ampharos.id!==181||q.CARDS.diglett.id!==50)throw Error('Tesla scene identity changed');
    for(const id of ids)if(!r.sprites.get(id+'-Walk')?.width)throw Error('Native species preflight failed');
    g.units=[];g.projectiles=[];g.spells=[];g.fields=[];g.attacks=[];g.energy=[10,10];
    r.resetVisuals();r.effects=[];r.particles=[];r.selection=null;r.pointer=null;q.events=[];
    const rects=()=>Object.fromEntries(['arena','hand','energy-bar'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return[id,[b.x,b.y,b.width,b.height]];}));
    q.fixture={ready:false,actors:[],deployments:[],initialRects:rects(),reduced:r.reduced,limits:'Controlled native Game.deploy calls and starting hand/energy. Field scene additionally places one native enemy Snorlax for actor/HP context. Original Game.step and app rAF retained; no card, HP, lifetime, movement, target, attack or renderer clock replacement. Tower attacks disabled. Sound muted, no audio judgment; particles are not seeded.'};
    q.fixtureRects=rects;
    const team=config.team??0;
    const deploy=(key,side,x,y)=>{
      const before=new Set(g.units.map(u=>u.id));g.hands[side][0]=key;
      const result=g.deploy(side,0,x,y);
      q.fixture.deployments.push({key,team:side,requested:{x,y},result,age:g.elapsed-q.fixture.startGameTime});
      if(!result.ok)throw Error('Native deployment failed: '+result.reason);
      for(const unit of g.units)if(!before.has(unit.id))q.fixture.actors.push({id:unit.id,key:unit.key,team:unit.team,nativeMaxHp:unit.maxHp,initialHp:unit.hp,initialLifetime:unit.lifetime});
    };
    setTimeout(()=>{
      q.fixture.startGameTime=g.elapsed;q.fixture.startEpochMs=performance.timeOrigin+performance.now();q.fixture.ready=true;
      if(config.scene==='tesla-lifecycle')deploy('ampharos',team,300,team?240:560);
      else{
        const context=g.spawn('snorlax',1-team,300,team?350:450,0);context.entryPending=false;
        q.fixture.actors.push({id:context.id,key:context.key,team:context.team,nativeMaxHp:context.maxHp,initialHp:context.hp});
        deploy(config.fieldKey,team,300,team?300:500);
      }
      if(config.pauseAtMs)setTimeout(async()=>{
        try{
          const layout=rects();document.getElementById('match-pause').click();
          await new Promise(resolve=>setTimeout(resolve,120));
          const first={png:r.canvas.toDataURL(),clock:r.t,game:g.elapsed};
          await new Promise(resolve=>setTimeout(resolve,320));
          const second={png:r.canvas.toDataURL(),clock:r.t,game:g.elapsed};
          const {packGame,unpackGame}=await import('./snapshot.js?v=34');
          const restored=unpackGame(packGame(g),()=>{},r.metadata);
          r.draw(restored,0);const restoredPng=r.canvas.toDataURL();r.draw(g,0);
          const hidden=restored.units.find(u=>u.key==='ampharos');
          q.fixture.pause={complete:true,rasterStable:first.png===second.png,clockStable:first.clock===second.clock&&first.game===second.game,layoutStable:JSON.stringify(layout)===JSON.stringify(rects()),restoredRasterStable:restoredPng===second.png,restored:{burrowed:hidden?.burrowed,hp:hidden?.hp,lifetime:hidden?.lifetime,fields:restored.fields.map(f=>({key:f.key,life:f.life,duration:f.duration}))},method:'Real CPU pause UI;120ms settling then320ms hold. Snapshot pack/unpack drawn once at dt0 while paused and immediately restored to original app Game; no network claim.'};
          document.getElementById('resume-btn').click();
        }catch(error){q.fixture.error=error.message;}
      },config.pauseAtMs);
    },config.preRollMs);
    const step=g.step;let enemyDeployed=false;
    Object.defineProperty(g,'step',{configurable:true,writable:true,enumerable:false,value:function(...args){
      const result=step.apply(this,args);
      if(config.scene==='tesla-lifecycle'&&q.fixture.ready&&!enemyDeployed&&g.elapsed-q.fixture.startGameTime>=3){
        enemyDeployed=true;deploy('diglett',1-team,300,team?450:350);
      }
      return result;
    }});
  },config);
}
export async function observe(page,config){
  const sample=await baseline.observe(page,config);
  const fixture=await page.evaluate(()=>{
    const q=__reviewAdapter,g=q.game,r=q.renderer,f=q.fixture;
    return {...f,age:f.ready?g.elapsed-f.startGameTime:null,rects:q.fixtureRects(),actors:f.actors.map(a=>{
      const u=g.units.find(u=>u.id===a.id);
      return {...a,current:u?{x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,lifetime:u.lifetime,burrowed:u.burrowed,burrowProgress:u.burrowProgress,spawn:u.spawn,attack:u.attack,attackSeq:u.attackSeq}:null};
    }),fields:g.fields.map(f=>({id:f.id,key:f.key,life:f.life,duration:f.duration,x:f.x,y:f.y,radius:f.radius})),canvasClean:r.canvas.toDataURL().startsWith('data:image/png')};
  });
  if(sample.instrumentation.lastStepDt!==1/30)throw Error('Native Game step changed');
  if(fixture.error)throw Error(fixture.error);
  if(fixture.reduced!==!!config.reduced)throw Error('Reduced motion differs from request');
  if(JSON.stringify(fixture.initialRects)!==JSON.stringify(fixture.rects))throw Error('Arena or controls moved');
  for(const actor of fixture.actors)if(actor.current&&actor.current.maxHp!==actor.nativeMaxHp)throw Error('Native maximum health changed');
  if(fixture.pause&&Object.entries(fixture.pause).some(([key,value])=>key.endsWith('Stable')&&!value))throw Error('Pause or restored hidden raster changed');
  return {...sample,fixture};
}

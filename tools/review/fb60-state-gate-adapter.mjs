import {beforeNavigate as isolate,observe as observeBaseline} from './baseline-adapter.mjs';

export async function beforeNavigate(page,config){
  if(config.reduced)await page.emulateMedia({reducedMotion:'reduce'});
  await isolate(page,config);
}

// A declared native encounter in the real App, not a hand/deck placement test.
export async function prepare(page,config){
  await page.waitForFunction(()=>!document.querySelector('#start-btn')?.disabled);
  const modules=await page.evaluate(async()=>{
    const app=document.querySelector('script[type="module"][src^="app.js"]')?.src;
    if(!app)throw Error('Actual App module script not found');
    const source=await(await fetch(app)).text();
    const find=name=>{const match=source.match(new RegExp("from ['\"](\\./"+name+"\\.js[^'\"]*)['\"]"));if(!match)throw Error('Actual App import missing: '+name);return new URL(match[1],app).href;};
    return {app,engine:find('engine'),renderer:find('render')};
  });
  await page.evaluate(async modules=>{
    const {Game,CARDS}=await import(modules.engine),{Renderer}=await import(modules.renderer);
    const step=Game.prototype.step,emit=Game.prototype.emit,draw=Renderer.prototype.draw;
    const q=globalThis.__reviewAdapter={game:null,renderer:null,events:[],steps:0,draws:0,observations:0,action:false,CARDS,moduleIdentity:modules,originals:{step,emit,draw},unsupported:['exact sprite frame','emitter position','visual particle seed','game constructor seed']};
    Game.prototype.step=function(...args){const value=step.apply(this,args);q.game=this;q.steps++;q.lastStepDt=args[0];return value;};
    Game.prototype.emit=function(type,data){const value=emit.apply(this,arguments);q.events.push({type,at:this.elapsed,key:data?.key??data?.unit?.key??null,attackerId:data?.attacker?.id??data?.sourceId??null,targetId:data?.target?.id??data?.targetId??data?.tower?.id??null,sourceKey:data?.sourceKey??null,amount:data?.amount??null});if(q.events.length>500)q.events.shift();return value;};
    Renderer.prototype.draw=function(...args){const value=draw.apply(this,args);q.renderer=this;q.draws++;q.lastDrawDt=args[1];return value;};
  },modules);
  await page.locator('#start-btn').click();
  await page.waitForFunction(()=>globalThis.__reviewAdapter?.game?.state==='playing'&&globalThis.__reviewAdapter?.renderer);
  await page.evaluate(async()=>{
    const q=globalThis.__reviewAdapter,g=q.game,r=q.renderer;
    q.action=true;g.aiEnabled=false;
    q.electricUnitState=(await import('./electric-lore.js?v=2')).electricUnitState;
    const species=[[100,['Walk','Idle','Attack']],[101,['Walk','Idle','Shoot']],[143,['Walk','Idle','Attack']],[25,['Walk','Idle',q.CARDS.pikachu.attackAnim]]];
    await r.ensureSpecies(species.map(([id])=>id));
    for(const [id,animations] of species)for(const animation of animations){
      if(!r.metadata[id]?.[animation]||!r.sprites.get(id+'-'+animation)?.width)throw Error('Missing electric encounter animation '+id+' '+animation);
    }
    if(g.towers.some(t=>t.hp!==t.maxHp))throw Error('Encounter requires full native towers.');
    g.units=[];g.projectiles=[];g.spells=[];g.fields=[];g.attacks=[];
    r.resetVisuals();r.effects=[];r.particles=[];q.events=[];
    q.cycleEvents=[];q.fixture={kind:'fb60-parent-child-pikachu-control',ready:false,setup:'AI off; initial native summoned token (144,720), Voltorb (432,700), Electrode (216,700), unchanged Pikachu (480,720); enemy Snorlax (168,300), (432,300), (432,220). Native deploy/summon delays; all towers retained. Initial token has no parent; periodic Electrode children are native real summons. No HP/card/path/target/speed/clock overrides.',limits:'Isolated authored presentation encounter, original Game.step and App rAF; normal constructor seed and renderer particles uncontrolled. Not UI deployment, a complete game, physical device or perceptual 60 fps evidence.'};
    const emit=g.emit;
    Object.defineProperty(g,'emit',{configurable:true,writable:true,enumerable:false,value:function(type,data){
      const value=emit.apply(this,arguments),a=data?.attacker,u=data?.unit,t=data?.target;
      q.cycleEvents.push({type,at:this.elapsed,key:data?.key??u?.key??a?.key??data?.sourceKey??null,actorId:a?.id??u?.id??data?.sourceId??null,targetId:t?.id??data?.targetId??null,team:a?.team??u?.team??null,amount:data?.amount??null,radius:data?.radius??null,style:data?.style??null,x:data?.x??u?.x??null,y:data?.y??u?.y??null});
      return value;
    }});
    setTimeout(()=>{
      q.fixture.startEpochMs=performance.timeOrigin+performance.now();q.fixture.startGameTime=g.elapsed;
      const rows=[['fireSpiritToken',0,144,720],['voltorb',0,432,700],['centralElectrode',0,216,700],['pikachu',0,480,720],['snorlax',1,168,300],['snorlax',1,432,300],['snorlax',1,432,220]];
      q.fixture.actorIds=rows.map(([key,team,x,y])=>g.spawn(key,team,x,y,key==='fireSpiritToken'?q.CARDS.centralElectrode.summonDeployTime:q.CARDS[key].deployTime,null,key==='fireSpiritToken'?'summon':undefined).id);
      q.fixture.ready=true;
    },650);
  });
}

export async function observe(page,config){
  const result=await observeBaseline(page,config);
  const native=await page.evaluate(()=>{
    const q=globalThis.__reviewAdapter,g=q.game,r=q.renderer;
    return {reduced:r.reduced,moduleIdentity:q.moduleIdentity,cycleEvents:q.cycleEvents.slice(),actors:g.units.map(u=>({id:u.id,key:u.key,team:u.team,parentId:u.parentId??null,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,spawn:u.spawn,moving:u.moving,attack:u.attack,attackSeq:u.attackSeq,windup:u.attackWindup,stun:u.stun,targetId:u.target?.id??null,leap:u.leap??null,summonClock:u.summonClock,summonActive:u.summonActive,summonCycle:u.summonCycle,electric:q.electricUnitState(u),pose:r.nativeSpritePose(u)?((p)=>({animation:p.anim,frame:p.frame,direction:p.direction,lift:p.lift}))(r.nativeSpritePose(u)):null})),shots:g.projectiles.map(p=>({key:p.key,sourceId:p.sourceId,x:p.x,y:p.y,startX:p.startX,startY:p.startY,travelled:p.travelled,totalDistance:p.totalDistance,speed:p.speed,impactPoint:p.impactPoint??null,electricChain:p.electricChain??false})),effects:r.effects.map(e=>({kind:e.kind,key:e.key,sourceId:e.sourceId??e.actor?.id??null,life:e.life,max:e.max,radius:e.radius??null})),draws:q.draws};
  });
  return {...result,...native};
}

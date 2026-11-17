import {beforeNavigate as isolate,prepare as prepareBaseline,observe as observeBaseline} from './baseline-adapter.mjs';
export async function beforeNavigate(page,config){
  if(config.reduced)await page.emulateMedia({reducedMotion:'reduce'});
  await isolate(page,config);
}

// An isolated setup in the real App, with native cards, towers, clocks and rAF.
// This is a presentation review fixture, not a deployment/UI acceptance test.
export async function prepare(page,config){
  await prepareBaseline(page,{...config,scenario:undefined});
  await page.evaluate(async comparison=>{
    const q=globalThis.__reviewAdapter,g=q.game,r=q.renderer;
    q.action=true;g.aiEnabled=false;
    const species=comparison?[[100,['Walk','Idle','Attack']],[143,['Walk','Idle','Attack']]]:[[100,['Walk','Idle','Attack']],[101,['Walk','Idle','Shoot']]];
    await r.ensureSpecies(species.map(([id])=>id));
    for(const [id,animations] of species)for(const animation of animations){
      if(!r.metadata[id]?.[animation]||!r.sprites.get(id+'-'+animation)?.width)throw Error('Missing native electric cohort animation '+id+' '+animation);
    }
    if(g.towers.some(t=>t.hp!==t.maxHp))throw Error('Fixture towers must retain full native HP.');
    g.units=[];g.projectiles=[];g.spells=[];g.fields=[];g.attacks=[];
    r.resetVisuals();r.effects=[];r.particles=[];q.events=[];
    q.cycleEvents=[];q.fixture={kind:comparison?'native-electro-spirit-comparison':'native-electrode-exchange',ready:false,setup:comparison?'AI off; native Voltorb at (432,445), enemy Snorlax at (432,365) and (432,285), native deployTime; all towers retained. Targets start 80 units apart on the same bridge-centre line to avoid lateral convergence; no HP/card/path/targeting/clock overrides.':'AI off; paired native centralElectrode at (168,500) and (168,330), native deployTime; all towers retained. No HP/card/targeting/clock overrides.',limits:'Isolated authored encounter, original Game.step and App rAF; native random seed and renderer particles uncontrolled. Not a UI placement or complete game test.'};
    const emit=g.emit;
    Object.defineProperty(g,'emit',{configurable:true,writable:true,enumerable:false,value:function(type,data){
      const value=emit.apply(this,arguments),a=data?.attacker,u=data?.unit,t=data?.target;
      q.cycleEvents.push({type,at:this.elapsed,key:data?.key??u?.key??a?.key??null,actorId:a?.id??u?.id??data?.sourceId??null,targetId:t?.id??data?.targetId??null,team:a?.team??u?.team??null,amount:data?.amount??null,radius:data?.radius??null,style:data?.style??null,x:data?.x??u?.x??null,y:data?.y??u?.y??null});
      return value;
    }});
    setTimeout(()=>{
      q.fixture.startEpochMs=performance.timeOrigin+performance.now();q.fixture.startGameTime=g.elapsed;
      const rows=comparison?[['voltorb',0,432,445],['snorlax',1,432,365],['snorlax',1,432,285]]:[['centralElectrode',0,168,500],['centralElectrode',1,168,330]];
      q.fixture.actorIds=rows.map(([key,team,x,y])=>g.spawn(key,team,x,y,q.CARDS[key].deployTime).id);
      q.fixture.ready=true;
    },650);
  },config.comparison===true);
}

export async function observe(page,config){
  const result=await observeBaseline(page,config);
  const native=await page.evaluate(()=>{
    const q=globalThis.__reviewAdapter,g=q.game,r=q.renderer;
    return{reduced:r.reduced,cycleEvents:q.cycleEvents.slice(),actors:g.units.map(u=>({id:u.id,key:u.key,team:u.team,parentId:u.parentId??null,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,spawn:u.spawn,attack:u.attack,attackSeq:u.attackSeq,windup:u.attackWindup,stun:u.stun,leap:u.leap??null,summonClock:u.summonClock,summonActive:u.summonActive,summonCycle:u.summonCycle,pose:r.nativeSpritePose(u)?((p)=>({animation:p.anim,frame:p.frame,direction:p.direction,lift:p.lift}))(r.nativeSpritePose(u)):null})),shots:g.projectiles.map(p=>({key:p.key,sourceId:p.sourceId,x:p.x,y:p.y,startX:p.startX,startY:p.startY,liftX:p.liftX,liftY:p.liftY,travelled:p.travelled,totalDistance:p.totalDistance,speed:p.speed,impactPoint:p.impactPoint??null,electricChain:p.electricChain??false})),effects:r.effects.map(e=>({kind:e.kind,key:e.key,sourceId:e.sourceId??e.actor?.id??null,life:e.life,max:e.max,radius:e.radius??null})),draws:q.draws};
  });
  return{...result,...native};
}

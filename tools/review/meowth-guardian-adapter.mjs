import {beforeNavigate,prepare as prepareBaseline,observe as observeBaseline} from './baseline-adapter.mjs';
export {beforeNavigate};

export async function prepare(page,config){
  await prepareBaseline(page,{...config,scenario:undefined});
  await page.evaluate(async()=>{
    const q=globalThis.__reviewAdapter,g=q.game,r=q.renderer;
    q.action=true;g.aiEnabled=false;await r.ensureSpecies([52,143]);
    for(const [id,animations] of [[52,['Idle','Shoot']],[143,['Walk','Idle','Attack']]])for(const animation of animations){
      if(!r.metadata[id]?.[animation]||!r.sprites.get(id+'-'+animation)?.width)throw Error('Missing native guardian encounter clip '+id+' '+animation);
    }
    if(g.towers.some(t=>t.hp!==t.maxHp))throw Error('Native tower HP must remain untouched');
    const {towerGuardianScale,guardianEmitterPoint}=await import('./tower-guardian-art.js?v=1');
    const {emissionPoint,TOWER_MOUNTS}=await import('./sprite-motion.js?v=34');
    Object.assign(q,{towerGuardianScale,guardianEmitterPoint,emissionPoint,TOWER_MOUNTS});
    g.units=[];g.projectiles=[];g.spells=[];g.fields=[];g.attacks=[];r.resetVisuals();r.effects=[];r.particles=[];q.events=[];q.sceneEvents=[];
    q.fixture={kind:'native-meowth-princess-views',ready:false,setup:'Native Princesses team0/team1, lane0; opposing native Snorlax start160 units toward the river, original deployTime. AI off; all towers and cards retained, no HP/stat/target/path/clock overrides.',limits:'Authored native encounter in real App rAF/Game.step. Not UI placement, tower melee-contact judgment, real-device or perceptual60fps test.'};
    const emit=g.emit;
    Object.defineProperty(g,'emit',{configurable:true,writable:true,enumerable:false,value:function(type,data){const result=emit.apply(this,arguments),actor=data?.attacker??data?.unit;q.sceneEvents.push({type,at:this.elapsed,actorId:actor?.id??data?.sourceId??null,targetId:data?.target?.id??data?.targetId??null,key:data?.key??actor?.key??null,guardId:actor?.guard?.id??null,amount:data?.amount??null,from:data?.from?{x:data.from.x,y:data.from.y}:null,to:data?.to?{x:data.to.x,y:data.to.y}:null});return result;}});
    setTimeout(()=>{
      const towers=[0,1].map(team=>g.towers.find(t=>t.team===team&&!t.king&&t.lane===0));
      if(towers.some(t=>t.guard.id!==52))throw Error('Expected actual Meowth Princess guards');
      q.fixture.startGameTime=g.elapsed;q.fixture.startEpochMs=performance.timeOrigin+performance.now();q.fixture.towerIds=towers.map(t=>t.id);
      q.fixture.unitIds=towers.map(t=>g.spawn('snorlax',1-t.team,t.x,t.y+(t.team?160:-160),q.CARDS.snorlax.deployTime).id);q.fixture.ready=true;
    },650);
  });
}

export async function observe(page,config){
  const sample=await observeBaseline(page,config);
  const extra=await page.evaluate(()=>{
    const q=globalThis.__reviewAdapter,g=q.game,r=q.renderer,v=r.verticalScale||1;
    return{sceneEvents:q.sceneEvents.slice(),guards:g.towers.filter(t=>!t.king).map(t=>{
      const actor=r.frameActors.get(t.id)||t,scale=q.towerGuardianScale(t),mounted={...actor,card:{id:t.guard.id},scale,y:actor.y-q.TOWER_MOUNTS.princess/v,mounted:true,attack:!t.active?0:actor.attack,attackAnim:t.guard.attackAnim,moving:false},pose=r.nativeSpritePose(mounted);
      return{id:t.id,team:t.team,guardId:t.guard.id,scale,foot:{x:actor.x,y:mounted.y},nativeEmission:q.emissionPoint(actor),visualEmission:r.visualEmission(actor),pose:pose?{animation:pose.anim,frame:pose.frame,direction:pose.direction,scale:pose.scale}:null};
    }),shots:g.projectiles.map(p=>{const source=r.frameActors.get(p.sourceId),point={x:p.startX+(p.liftX||0),y:p.startY+(p.liftY||0)};return{id:p.id,sourceId:p.sourceId,key:p.key,x:p.x,y:p.y,travelled:p.travelled,totalDistance:p.totalDistance,nativeSavedLaunch:point,visualSavedLaunch:r.projected(q.guardianEmitterPoint(source,point),source),renderedPoint:r.visualProjectiles.get(p.id)?.renderedPoint??null};})};
  });
  return{...sample,...extra};
}

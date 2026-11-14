// Shared numeric/browser fixture. All engine and Renderer modules come from one
// immutable Git checkpoint supplied by the runner, never the working tree.
const config = globalThis.__nativeContactConfig || await (await fetch('/__qa/config.json')).json();
const base=config.moduleBase;
const {Game,CARDS,directionRow}=await import(base+'/engine.js?v=26');
const {Renderer}=await import(base+'/render.js');
const {attackAnimationFrame,animationFrame,emissionPoint,emitterPart}=await import(base+'/sprite-motion.js?v=26');
const {movementVisual}=await import(base+'/combat-visuals.js?v=29');
const {SPRITE_GEOMETRY}=await import(base+'/sprite-geometry.js');
const {publicSnapshot,publicEvent,unpackEvent}=await import(base+'/online-wire.js');
const {unpackGame}=await import(base+'/snapshot.js?v=26');
const browser=typeof document!=='undefined',round=value=>Number.isFinite(value)?Math.round(value*1e6)/1e6:value;
const manifest=config.metadata || await (await fetch(base+'/assets/pokemon/manifest.json')).json();
const canvas=browser?document.querySelector('canvas'):null;
if(canvas)canvas.getContext('2d',{alpha:false,willReadFrequently:true});
const renderer=browser?new Renderer(canvas):Object.assign(Object.create(Renderer.prototype),{t:0,visualActors:new Map(),effects:[],particles:[],numbers:[],healthStates:new Map(),frameActors:new Map(),showCombatNumbers:false,verticalScale:1});
const imageKeys=new Map(),articulatedImages=new WeakMap(),rasterCache=new Map();let drawn=[],activeSprite=null;
function selectedPose(actor){
  if(!actor)return null;
  const profile=actor.card||actor.guard,moving=movementVisual(profile),attacking=actor.attack>0;
  const animation=attacking?actor.attackAnim||profile.attackAnim||'Attack':actor.moving||profile.flying?moving.animation:actor.hit>0&&actor.key!=='golem'?'Hurt':profile.idleAnim||'Idle';
  const meta=manifest[profile.id]?.[animation];if(!meta)return{animation,frame:null,direction:directionRow(actor.dx,actor.dy)};
  const age=Math.max(0,(actor.attackDuration||.6)-(actor.attack||0));let frame;
  if(attacking)frame=attackAnimationFrame(meta,age,actor.attackDuration||.6,actor.attackWindup??profile.windup??.18,profile.attackFrames,profile);
  else if(moving.frames&&animation===moving.animation)frame=moving.frames[animationFrame({durations:moving.frames.map(()=>moving.frameDuration)},(renderer.t+actor.id*.173)*60)];
  else frame=animationFrame(meta,animation==='Hurt'?Math.max(0,.24-actor.hit)*60:(renderer.t+actor.id*.173)*60*(actor.moving||profile.flying?.85:.75));
  return{animation,frame,direction:directionRow(actor.dx,actor.dy),age:round(age)};
}
function reset(){renderer.resetVisuals();renderer.effects=[];renderer.particles=[];renderer.numbers=[];renderer.healthStates.clear();renderer.t=0;renderer.reduced=false;}
const profileOf=actor=>actor.card||actor.guard;
function expectedContact(actor,shot){
  const p=profileOf(actor),meta=manifest[p.id]?.[actor.attackAnim||p.attackAnim||'Attack'];
  return p.attackGestures?.length?p.attackGestures[shot%p.attackGestures.length].contact:p.attackContactFrame??(meta?.hitFrame||Math.max(1,Math.floor((meta?.durations.length||1)*.3)));
}
function drawActor(actor){
  if(!browser)return null;
  drawn=[];renderer.frameActors=new Map(actor?[[actor.id,actor]]:[]);
  const c=renderer.ctx;c.setTransform(1,0,0,1,0,0);c.fillStyle='#e8efcd';c.fillRect(0,0,canvas.width,canvas.height);
  if(!actor)return null;
  c.save();c.translate(canvas.width/2-actor.x,canvas.height*.78-actor.y);
  if('king'in actor)renderer.tower(c,actor);else renderer.sprite(c,actor,true);
  c.restore();return drawn.filter(d=>d.actorId===actor.id).at(-1)||null;
}
function raster(id,animation,direction,frame){
  const key=[id,animation,direction,frame].join(':');if(rasterCache.has(key))return rasterCache.get(key);
  const image=renderer.sprites.get(`${id}-${animation}`),meta=manifest[id]?.[animation];if(!image||!meta||!Number.isInteger(frame))return null;
  const surface=document.createElement('canvas');surface.width=meta.width;surface.height=meta.height;
  const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,frame*meta.width,direction*meta.height,meta.width,meta.height,0,0,meta.width,meta.height);
  const pixels=c.getImageData(0,0,meta.width,meta.height).data;let left=meta.width,right=-1,top=meta.height,bottom=-1;
  for(let y=0;y<meta.height;y++)for(let x=0;x<meta.width;x++)if(pixels[(y*meta.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const width=right-left+1,height=bottom-top+1,bytes=width>0?c.getImageData(left,top,width,height).data:new Uint8ClampedArray();
  const value={width,height,bytes};rasterCache.set(key,value);return value;
}
function rasterEquivalent(release,row){
  if(!browser||!row.alive)return null;
  const a=raster(release.id,release.expectedAnimation,row.direction,release.expectedFrame),b=raster(release.id,row.animation,row.direction,row.frame);
  return !!(a&&b&&a.width===b.width&&a.height===b.height&&a.bytes.length===b.bytes.length&&a.bytes.every((v,i)=>v===b.bytes[i]));
}
function markerFromDraw(actor,draw,shot=0){
  if(!browser||!draw?.destination)return null;
  const p=profileOf(actor),points=SPRITE_GEOMETRY[p.id]?.[draw.animation]?.points?.[draw.direction]?.[draw.frame];
  if(!points)return{available:false,reason:'missing_geometry_for_actual_draw',id:p.id,animation:draw.animation,frame:draw.frame};
  const part=emitterPart(p),lead=(points[6]-points[8])*(actor.dx||0)+(points[7]-points[9])*(actor.dy||0)>=0?6:8;
  const offset=part==='body'?2:part==='leadHand'?lead:part==='hands'||part==='cannons'?(shot%2?8:6):4;
  const [x,y,width,height]=draw.destination,padding=draw.padding||0,scaleX=width/(draw.nativeWidth+padding*2),scaleY=height/(draw.nativeHeight+padding*2),forward=part==='head'?2:1;
  const expected={x:x+(padding+points[offset]+(actor.dx||0)*forward)*scaleX,y:y+(padding+points[offset+1]+(actor.dy||0)*forward+(part==='cannons'?-3:0))*scaleY};
  const actual=renderer.visualEmission(actor,shot);
  return{available:true,part,expected:{x:round(expected.x),y:round(expected.y)},actual:{x:round(actual.x),y:round(actual.y)},error:round(Math.hypot(expected.x-actual.x,expected.y-actual.y))};
}
function emitEvent(event){
  if(browser)renderer.onEvent(event);
  else if(['attackStart','attackRelease'].includes(event.type))renderer.onEvent(event);
}

export function run(key,mode='local60',direction=4,trigger='automatic',options={}){
  reset();const rate=mode==='local60'?60:30,remote=mode==='public15',cycles=trigger==='automatic'?options.cycles||3:1;
  const game=new Game({seed:833});game.state='playing';game.aiEnabled=false;
  let actor,view,pending=[],events=[],starts=[],releases=[],damages=[],leaps=[],frames=[],currentDelivered=[];
  if(key.startsWith('tower-')){
    const guard=Number(key.slice(6));actor=game.towers.find(t=>t.team===0&&t.king===(guard!==52));
    actor.guard={...actor.guard,id:guard};actor.active=true;game.towers=[actor];game.units=[];
  }else{game.towers=[];actor=game.spawn(key,0,300,600,0);}
  const angle=(2-direction)*Math.PI/4,target=game.spawn('regice',1,actor.x+Math.cos(angle)*20,actor.y+Math.sin(angle)*20,0);
  target.card={...target.card,passive:true,damage:0,speed:0,structure:true,knockbackImmune:true,armor:0,reflect:0,heal:0,lifetime:1e12};
  target.hp=target.maxHp=1e8;target.radius=4;target.shield=0;target.ttl=0;actor.entryPending=target.entryPending=false;
  game.units=actor.card?[actor,target]:[target];actor.cooldown=0;
  if(trigger==='direct'&&actor.card?.burrow){actor.cooldown=999;for(let i=0;i<6;i++)game.step(.1);}
  const record=(event)=>{
    const entry={type:event.type,at:round(game.elapsed),seq:event.attacker?.attackSeq??event.unit?.attackSeq??null,shot:event.shot??null};
    if(event.from)entry.from={x:round(event.from.x),y:round(event.from.y)};
    if(event.attacker?.id===actor.id&&event.type==='attackStart'){
      entry.windup=event.windup;entry.duration=event.duration;starts.push(entry);if(starts.length>=cycles)actor.cooldown=999;
    }
    if(event.attacker?.id===actor.id&&event.type==='attackRelease'){
      const source=unpackEvent(publicEvent(event)).attacker,p=profileOf(source);
      entry.expectedFrame=expectedContact(source,event.shot||0);entry.expectedAnimation=source.attackAnim||p.attackAnim||'Attack';entry.id=p.id;
      entry.sourcePose=selectedPose(source);entry.sourcePoint=emissionPoint(source,event.shot||0);entry.part=emitterPart(p);
      entry.startAt=starts.findLast(start=>start.seq===entry.seq)?.at??null;
      entry.expectedAt=entry.startAt===null?null:round(entry.startAt+(source.attackWindup??p.windup??.18)+(event.shot||0)*(p.burstSpacing||0));
      releases.push(entry);
    }
    if(event.type==='leap'&&event.unit?.id===actor.id)leaps.push(entry);
    if(event.type==='damage'&&event.sourceId===actor.id)damages.push({...entry,amount:event.amount,targetId:event.target?.id});
    if(event.attacker?.id===actor.id||event.sourceId===actor.id||event.unit?.id===actor.id)events.push(entry);
    if(remote)pending.push(publicEvent(event));else{emitEvent(event);if(event.type==='attackRelease'&&event.attacker?.id===actor.id)currentDelivered.push(entry);}
  };
  game.onEvent=record;
  if(trigger==='direct'){game.face(actor,target);game.attack(actor,target);actor.cooldown=999;}
  const p=profileOf(actor),duration=actor.card?p.attackDuration||.75:Math.max(.6,(actor.windup??.18)+.16),interval=p.interval||actor.interval||1;
  const total=Math.ceil((cycles*interval+(p.windup??actor.windup??.18)+duration+1)*60);
  const alreadyDelivered=new Set();let previous=null,clockRewinds=0;
  for(let index=0;index<=total;index++){
    if(index&&index%(60/rate)===0){game.step(1/rate);game.units=game.units.filter(u=>u===actor||u===target);}
    if(remote&&index%4===0){
      view=unpackGame(publicSnapshot(game,0));
      for(const packed of pending){const event=unpackEvent(packed);emitEvent(event);if(event.type==='attackRelease'&&event.attacker?.id===actor.id){const release=releases.find(r=>!alreadyDelivered.has(r)&&r.seq===event.attacker.attackSeq&&r.shot===event.shot);if(release){currentDelivered.push(release);alreadyDelivered.add(release);}}}
      pending=[];
    }
    if(index)renderer.t+=1/60;
    const world=remote?view:game,logical=actor.card?world.units.find(u=>u.id===actor.id):world.towers.find(t=>t.id===actor.id);
    const displayed=logical?renderer.visualActor(logical,index?1/60:0):null;
    const pose=displayed?selectedPose(displayed):null,actual=drawActor(displayed),point=displayed?renderer.visualEmission(displayed):null;
    const row={index,t:round(index/60),elapsed:round(game.elapsed),seq:displayed?.attackSeq??null,attack:round(displayed?.attack??0),animation:actual?.animation||pose?.animation||null,
      frame:actual?.frame??pose?.frame??null,direction:actual?.direction??pose?.direction??null,age:pose?.age??null,emitter:point?{x:round(point.x),y:round(point.y)}:null,drawn:!!actual,alive:!!displayed,logicalSeq:actor.attackSeq};
    if(browser&&options.capture)row.png=canvas.toDataURL('image/png').split(',')[1];
    if(previous&&row.seq===previous.seq&&row.attack>0&&previous.attack>0&&row.age+1e-6<previous.age)clockRewinds++;
    previous=row;frames.push(row);
    for(const release of currentDelivered){if(release.rendered)continue;release.rendered={...row};release.frameMatches=!!displayed&&row.animation===release.expectedAnimation&&row.frame===release.expectedFrame;release.rasterMatches=rasterEquivalent(release,row);release.drawMarker=displayed?markerFromDraw(displayed,actual,release.shot):null;release.retiredAtRelease=!displayed;release.sameTickNextStart=starts.some(s=>s.at===release.at&&s.seq>release.seq);if(displayed){const point=renderer.visualEmission(displayed,release.shot);release.engineToVisualSourceError=round(Math.hypot(release.from.x-point.x,release.from.y-point.y));}}
    currentDelivered=[];
  }
  const intervals=starts.slice(1).map((start,i)=>round(start.at-starts[i].at));
  const recoveries=starts.map(start=>({seq:start.seq,observed:frames.some(f=>f.seq===start.seq&&f.attack===0&&f.alive),replacedBeforeRest:starts.some(s=>s.seq>start.seq&&s.at<start.at+start.duration)}));
  return{key,mode,direction,trigger,browser,profile:{id:p.id,animation:p.attackAnim||actor.guard?.attackAnim||'Attack',interval,windup:p.windup??actor.windup??.18,duration,burst:p.burst||1,spacing:p.burstSpacing||0,rangedAttack:p.rangedAttack??null,emitter:emitterPart(p),suicide:!!p.suicide,jumpRange:p.jumpRange||0},
    starts,releases,damages,leaps,intervals,recoveries,clockRewinds,events,frames};
}

export const ready=(async()=>{
  if(!browser)return true;
  await renderer.load([...config.keys,'regice']);renderer.verticalScale=1;
  for(const [key,image]of renderer.sprites){const i=key.indexOf('-');imageKeys.set(image,{id:Number(key.slice(0,i)),animation:key.slice(i+1)});}
  const sprite=renderer.sprite.bind(renderer);renderer.sprite=(c,actor,...args)=>{const previous=activeSprite;activeSprite=actor;try{return sprite(c,actor,...args);}finally{activeSprite=previous;}};
  const draw=renderer.ctx.drawImage.bind(renderer.ctx);renderer.ctx.drawImage=(image,...args)=>{
    const key=imageKeys.get(image),rig=articulatedImages.get(image);
    if(activeSprite&&args.length===8&&(key||rig)){
      const meta=renderer.metadata[(key||rig).id][(key||rig).animation];
      drawn.push({actorId:activeSprite.id,...(rig||key),frame:rig?.frame??args[0]/meta.width,direction:rig?.direction??args[1]/meta.height,destination:args.slice(4).map(round),nativeWidth:meta.width,nativeHeight:meta.height});
    }
    return draw(image,...args);
  };
  // Articulated wing canvases hide the native source image. Record the real
  // FlightWings call as well; its arguments are the actual chosen native frame.
  const sample=config.keys.find(k=>CARDS[k]);if(sample){const a={id:999,key:sample,card:CARDS[sample],x:0,y:0,dx:0,dy:-1,hp:1,maxHp:1,attack:0,anim:0};renderer.sprite(renderer.ctx,a,true);}
  if(renderer.flightWings){const frame=renderer.flightWings.frame.bind(renderer.flightWings);renderer.flightWings.frame=(id,animation,direction,index,...args)=>{const result=frame(id,animation,direction,index,...args);if(result)articulatedImages.set(result.image,{id,animation,frame:index,direction,padding:result.padding});return result;};}
  return true;
})();
globalThis.__nativeContact={ready,run,renderer,canvas,config};

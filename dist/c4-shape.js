const has=(value,key)=>Object.hasOwn(value,key);
const fail=path=>{throw Object.assign(new Error('Forma C4 incompatible: '+path),{code:'C4_SHAPE_INVALID'});};
const record=(value,path)=>{if(!value||typeof value!=='object'||Array.isArray(value))fail(path);};
const number=(value,path)=>{if(!Number.isFinite(value))fail(path);};
const integer=(value,path)=>{if(!Number.isSafeInteger(value))fail(path);};
const nonnegative=(value,path)=>{number(value,path);if(value<0)fail(path);};
const positive=(value,path)=>{number(value,path);if(value<=0)fail(path);};
const identifier=(value,path)=>{integer(value,path);if(value<=0)fail(path);};
const boolean=(value,path)=>{if(typeof value!=='boolean')fail(path);};
const string=(value,path)=>{if(typeof value!=='string')fail(path);};
const enumeration=(...values)=>(value,path)=>{if(!values.includes(value))fail(path);};
const team=enumeration(0,1),winner=enumeration(-1,0,1),nullable=rule=>(value,path)=>{if(value!==null)rule(value,path);};
const array=rule=>(value,path)=>{if(!Array.isArray(value))fail(path);value.forEach((item,index)=>rule(item,path+'['+index+']'));};
const fields=(value,path,required={},optional={})=>{
  record(value,path);
  for(const[key,rule]of Object.entries(required)){if(!has(value,key))fail(path+'.'+key);rule(value[key],path+'.'+key);}
  for(const[key,rule]of Object.entries(optional))if(has(value,key))rule(value[key],path+'.'+key);
};
const named=(names,rule)=>Object.fromEntries(names.split(' ').filter(Boolean).map(name=>[name,rule]));
const point=(value,path)=>fields(value,path,{x:number,y:number});
const pair=rule=>(value,path)=>{array(rule)(value,path);if(value.length!==2)fail(path);};
const tuple=(value,path)=>pair(number)(value,path);

// Only interpreted paths are visited. Card identity/completeness and entity
// reference graphs remain the responsibility of the reviewed pure boundary.
export function createC4ShapeValidator({gamePrototype,cardFor}){
  record(gamePrototype,'Game.prototype');if(typeof cardFor!=='function')fail('cardFor');
  const reserved=new Set([...Object.keys(Object.getOwnPropertyDescriptors(gamePrototype)),'__proto__','onEvent','animations']);
  const key=(value,path)=>{string(value,path);if(!cardFor(value))fail(path);};
  const optionalKey=nullable(key),idOrZero=(value,path)=>{integer(value,path);if(value<0)fail(path);};
  const nativeFormation=(value,path)=>fields(value,path,{primaries:identifier,seconds:idOrZero,radius:nonnegative,width:nonnegative,angleShift:number});
  const card=(value,path)=>{
    record(value,path);
    fields(value,path,{}, {
      ...named('name type style color attackAnim structureArt projectileArt',nullable(string)),
      ...named('squad',nullable(array(key))),formation:nullable(array(tuple)),nativeFormation:nullable(nativeFormation),
      ...named('memberDelays spawnSchedule',nullable(array(number))),
      ...named('summon spawnKey spawnWith deathSpawn',optionalKey),
    });
  };
  const spawnGroup=(value,path)=>fields(value,path,{id:identifier,x:number,y:number,duration:nonnegative,startAt:number},{spawnCause:string,cardKey:key});
  const leap=(value,path)=>fields(value,path,{startX:number,startY:number,endX:number,endY:number,elapsed:nonnegative,duration:positive},{kind:enumeration('river'),prepare:nonnegative});
  const dash=(value,path)=>{
    fields(value,path,{phase:enumeration('windup','travel'),elapsed:nonnegative,targetId:identifier,startX:number,startY:number});
    if(value.phase==='travel')fields(value,path,{endX:number,endY:number,duration:positive});
  };
  const burn=(value,path)=>fields(value,path,{remaining:number,tick:number,damage:number,team,kind:string},{sourceId:idOrZero,sourceKey:string,sourceCard:card,sourceProfile:string});
  const guard=(value,path)=>fields(value,path,{id:identifier,style:string,attackAnim:string,projectileSpeed:positive,projectileStart:number});
  function actor(value,path,privateState=false){
    fields(value,path,{id:identifier,team,...named('x y hp anim hit attack attackDuration dx dy',number),maxHp:positive,radius:positive,attackSeq:idOrZero},{targetId:nullable(identifier),burn:nullable(burn),leap:nullable(leap),dash:nullable(dash)});
    if(has(value,'king')){
      fields(value,path,{king:boolean,lane:enumeration(-1,0,1),active:boolean,guard,cooldown:number,stun:number},{card:nullable(card)});
      if(privateState)fields(value,path,named('damage interval windup range projectileSpeed projectileStart',number));
      return;
    }
    fields(value,path,{key,spawn:number,moving:boolean},{card,createdAt:number,spawnGroup,spawnCause:string,
      ...named('scale shield maxShield summonClock summonCycle healClock ttl charge chargeTravel stepClock blinkCooldown lifetime freeze slow slowFactor slowAttackFactor avoidClear steerX steerY separateX separateY attackWindup',number),
      ...named('burrowed entryPending engaged',boolean),burrowProgress:number,parentId:identifier});
    const profile=has(value,'card')?value.card:cardFor(value.key);
    card(profile,path+'.resolvedCard');
    if(profile.summon)fields(value,path,{summonClock:number});
    if(value.spawnCause==='card')fields(value,path,{createdAt:number,spawnGroup});
    if(privateState)fields(value,path,{...named('cooldown stun slow charge blinkCooldown stepClock lifetime shield maxShield summonClock summonCycle healClock ttl createdAt',number),engaged:boolean,entryPending:boolean,spawnCause:string,spawnGroup});
  }
  const unit=(value,path,privateState=false)=>{actor(value,path,privateState);if(has(value,'king'))fail(path+'.unit');};
  const tower=(value,path,privateState=false)=>{actor(value,path,privateState);if(!has(value,'king'))fail(path+'.tower');};
  const attack=(value,path)=>fields(value,path,{attackerId:identifier,targetId:identifier,delay:number},{seq:idOrZero,shot:idOrZero,charged:boolean,releaseAt:number});
  const sourceFields={sourceId:idOrZero,sourceKey:string,sourceCard:card,sourceProfile:string,card};
  const projectile=(value,path)=>{
    fields(value,path,{id:(v,p)=>{if(typeof v!=='string'&&!Number.isSafeInteger(v))fail(p);},key:string,sourceKey:string,sourceId:identifier,team,style:string,
      ...named('x y startX startY travelled totalDistance damage life',number),speed:positive}, {
      ...sourceFields,...named('rolling linear flameCone electricChain groundPath air deadTarget',boolean),
      ...named('dx dy liftX liftY endLiftY arc shotRadius knockback splash stun slow slowFactor slowAttackFactor burn poisonField angle cone flyAt nextStepAt',number),
      ...named('attackSeq hop chainFromId chainTargetId',idOrZero),targetId:nullable(identifier),impactPoint:nullable(point),lastPoint:point,
      hitIds:array(identifier),trace:array(point),art:string,burnKind:string});
    if(value.rolling||value.linear||value.flameCone)fields(value,path,{hitIds:array(identifier)});
    if(value.rolling||value.linear)fields(value,path,{dx:number,dy:number});
    if(value.flameCone)fields(value,path,{angle:number,cone:number});
    if(value.electricChain)fields(value,path,{card,lastPoint:point,hitIds:array(identifier),hop:idOrZero,chainTargetId:identifier,chainFromId:identifier,flyAt:number,nextStepAt:number});
  };
  const spell=(value,path)=>fields(value,path,{visualId:identifier,key,card,team,...named('x y castAt startX startY delay flightTime flightElapsed travelRemaining',number),hitIds:array(identifier)},
    {done:boolean,arrived:boolean,resolvedWaves:idOrZero});
  const pullSlot=(value,path)=>fields(value,path,{id:identifier,nextPulse:number,until:number});
  const field=(value,path)=>{
    fields(value,path,{x:number,y:number,team,radius:nonnegative,life:number,style:string},{...sourceFields,id:identifier,key,
      ...named('air nativePull affectsHidden',boolean),...named('damage duration tick fieldTick pull airMultiplier buildingMultiplier towerDamage slow slowFactor slowAttackFactor buildingDamage spawnEvery spawnTotal spawned spawnClock startAt endAt nextPullAt pullSteps step pullPercent pulse towerPulse pulseEvery buffDuration',number),
      spawnKey:key,spawnSchedule:array(number),slots:array(pullSlot)});
    if(value.nativePull)fields(value,path,{...named('duration endAt nextPullAt pullSteps step pullPercent pulse towerPulse pulseEvery buffDuration',number),slots:array(pullSlot)});
    else fields(value,path,{tick:number,damage:number});
  };
  const reinforcement=(value,path)=>fields(value,path,{key,team,x:number,y:number,delay:number,spawnDelay:number},{parentId:identifier,requiresParent:boolean,done:boolean,spawnCause:string,spawnGroup});
  const eventKey=(value,path)=>{if(value==='tower')return;if(typeof value==='number')identifier(value,path);else key(value,path);};
  const eventRules={
    start:{},overtime:{},tiebreaker:{},energyBoost:{multiplier:number},
    deploy:{key,team,x:number,y:number},cast:{key,team,x:number,y:number},
    spawn:{unit},step:{unit},faint:{unit},structureDown:{unit},transform:{unit},burrow:{unit,hidden:boolean},
    damage:{amount:nonnegative},heal:{unit,amount:nonnegative},towerDown:{tower,team},deathBurst:{unit,radius:nonnegative},
    attackStart:{attacker:actor,target:actor,style:string,duration:number,windup:number},
    attackRelease:{attacker:actor,from:point,to:point,style:string,key:eventKey},
    beam:{from:point,to:point,style:string},flame:{key,team,from:point,to:point,groundFrom:point,groundTo:point,length:number,speed:positive,angle:number},
    melee:{key,team,from:point,to:point,style:string},hit:{key:eventKey,team,x:number,y:number,style:string},
    counter:{unit,from:point,to:point},dashWindup:{unit,duration:number},dashStart:{unit,from:point,to:point,duration:number},
    blink:{unit,from:point,to:point},leap:{unit,from:point,to:point},spellHit:{key,team,x:number,y:number},
    entry:{unit,x:number,y:number,radius:nonnegative,style:string},end:{winner,reason:string},
  };
  const eventOptional={...sourceFields,key:eventKey,team,unit,attacker:actor,target:nullable(actor),tower,
    ...named('from to groundFrom groundTo',point),...named('x y groundX groundY impactHeight radius duration windup length speed cone angle amount cost flightTime castDelay waveEvery',number),
    ...named('shot hop attackSeq waves wave crowns targetId sourceId chainFromId',idOrZero),
    ...named('hidden dot charged missed groundOnly structuresOnly',boolean),style:string,art:string,attackId:(v,p)=>{if(typeof v!=='string'&&!Number.isSafeInteger(v))fail(p);}};
  function validateEvent(value,path='event'){
    record(value,path);if(typeof value.type!=='string'||!has(eventRules,value.type))fail(path+'.type');
    fields(value,path,eventRules[value.type],eventOptional);
    if(value.type==='damage'&&value.amount>0)fields(value,path,{target:actor});
    if(has(value,'groundX')!==has(value,'groundY'))fail(path+'.groundPoint');
    return true;
  }
  function validateEventLog(value,{maxSeq,path='events'}={}){
    array(record)(value,path);idOrZero(maxSeq,path+'.maxSeq');let previous=-1;
    for(let i=0;i<value.length;i++){
      const entry=value[i],at=path+'['+i+']';fields(entry,at,{seq:idOrZero,event:validateEvent});
      if(entry.seq<=previous||entry.seq>maxSeq)fail(at+'.seq');previous=entry.seq;
    }
    return true;
  }
  function validateGame(value,{visibility,team:viewer,path='game'}={}){
    if(!['public','private'].includes(visibility))fail(path+'.visibility');record(value,path);
    for(const name of Object.keys(value))if(reserved.has(name))fail(path+'.'+name);
    fields(value,path,{state:enumeration('ready','playing','paused','ended'),time:nonnegative,elapsed:nonnegative,overtime:boolean,tiebreaker:boolean,winner:nullable(winner),reason:string,
      energy:pair(number),hands:pair(array(key)),queues:pair(array(key)),stats:pair((v,p)=>fields(v,p,named('deployed damage energy defeated',number))),
      units:array((v,p)=>unit(v,p,visibility==='private')),towers:array((v,p)=>tower(v,p,visibility==='private')),attacks:array(attack),projectiles:array(projectile),spells:array(spell),fields:array(field),reinforcements:array(reinforcement)},
      {seed:idOrZero,nextId:identifier,aiClock:number,aiEnabled:boolean,tutorial:boolean,difficulty:string,detachedEntities:array((v,p)=>actor(v,p,visibility==='private'))});
    if(value.state==='ended')winner(value.winner,path+'.winner');
    if(visibility==='public'){
      team(viewer,path+'.viewer');
      if(has(value,'cpuDeck')||has(value,'cpuDeckName'))fail(path+'.privateDeck');
      for(const name of ['hands','queues'])if(value[name][viewer].length!==4||value[name][1-viewer].length!==0)fail(path+'.'+name);
    }else{
      fields(value,path,{seed:idOrZero,nextId:identifier,aiClock:number,aiEnabled:boolean,tutorial:boolean,difficulty:string,cpuDeck:array(key),cpuDeckName:string});
      if(value.cpuDeck.length!==8||value.hands.some(row=>row.length!==4)||value.queues.some(row=>row.length!==4))fail(path+'.deck');
    }
    return true;
  }
  return Object.freeze({validateGame,validateEvent,validateEventLog,eventTypes:Object.freeze(Object.keys(eventRules))});
}

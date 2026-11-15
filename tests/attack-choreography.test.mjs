import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/engine.js?v=34';
import {SPRITE_GEOMETRY} from '../dist/sprite-geometry.js';
import {attackAnimationFrame,emissionPoint} from '../dist/sprite-motion.js';
import {FlightWings} from '../dist/wing-motion.js';
import {Renderer} from '../dist/render.js';
import {attackVisualProfile,biteMotion,biteJaw} from '../dist/combat-visuals.js';

// Contacts chosen by reviewing original eight-direction rasters, not HitFrame
// metadata (several original HitFrames repeat a preparation drawing).
const CONTACTS={beedrill:[10,10],machamp:[4,4,4,4],scyther:[6,6],nidoking:[7,7],scizor:[4,8],dragonite:[5,5,5],salamence:[3,3,3],blaziken:[2,2,2],crobat:[6,8],gardevoir:[4],treecko:[6],raltsTrio:[3],raltsToken:[3]};
test('every reviewed hit displays its contact pose at the first 30/60 Hz simulation release',()=>{
  for(const[key,contacts]of Object.entries(CONTACTS))for(const hz of[30,60]){
    const card=CARDS[key],meta=SPRITE_GEOMETRY[card.id][card.attackAnim];
    contacts.slice(0,card.burst||1).forEach((expected,shot)=>{
      const release=card.windup+shot*(card.burstSpacing||0),sample=Math.ceil((release-1e-8)*hz)/hz;
      assert.equal(attackAnimationFrame(meta,sample,card.attackDuration,card.windup,card.attackFrames,card),expected,`${key} hit ${shot} at ${hz} Hz`);
    });
    const before=attackAnimationFrame(meta,Math.max(0,card.windup-1/hz),card.attackDuration,card.windup,card.attackFrames,card);
    assert.notEqual(before,contacts[0],`${key} prepares before contact`);
    for(let elapsed=0;elapsed<card.attackDuration;elapsed+=1/60){
      const frame=attackAnimationFrame(meta,elapsed,card.attackDuration,card.windup,card.attackFrames,card);
      assert.ok(frame>=0&&frame<meta.durations.length,`${key} valid recovery`);
    }
  }
});
test('lead-hand emission chooses the forward native marker in both perspectives, without changing cannon alternation',()=>{
  for(const key of['machamp','nidoking','scizor','gardevoir','treecko'])for(let direction=0;direction<8;direction++){
    const card=CARDS[key],angle=(2-direction)*Math.PI/4,dx=Math.cos(angle),dy=Math.sin(angle),meta=SPRITE_GEOMETRY[card.id][card.attackAnim];
    for(let shot=0;shot<(card.burst||1);shot++){
      const elapsed=card.windup+shot*(card.burstSpacing||0),frame=CONTACTS[key][shot],points=meta.points[direction][frame];
      const actor={id:7,card,x:300,y:500,dx,dy,attack:card.attackDuration-elapsed,attackDuration:card.attackDuration,attackWindup:card.windup};
      const p=emissionPoint(actor,shot),forward=(points[6]-points[8])*dx+(points[7]-points[9])*dy>=0?6:8;
      assert.ok(Math.abs(p.x-(actor.x+(points[forward]-points[0]+dx)*card.scale))<1e-7,key+' forward hand x');
      assert.ok(Number.isFinite(p.y));
    }
  }
  const card=CARDS.blastoiseCannon,actor={id:1,card,x:300,y:500,dx:0,dy:-1,attack:card.attackDuration-card.windup,attackDuration:card.attackDuration,attackWindup:card.windup};
  assert.notDeepEqual(emissionPoint(actor,0),emissionPoint(actor,1),'two native cannons remain distinct');
});
test('flight clock freezes at its current phase and resumes continuously without returning to native rest',()=>{
  const wings=new FlightWings();
  assert.equal(wings.clock(1,.2),.2);
  for(let frame=1;frame<=60;frame++)assert.equal(wings.clock(1,.2+frame/60,true),.2);
  assert.ok(Math.abs(wings.clock(1,1.2+1/60)-(.2+1/60))<1e-10);
  assert.equal(wings.clock(2,1.3),1.3,'another unit keeps its own phase');
  assert.equal(wings.clock(1,.05),.05,'a new match may reset the render clock');
  assert.equal(wings.clock(1,.05),.05,'paused draws do not advance');
});
test('spell targeting refreshes the moving wing silhouette while reusing its tint surface',()=>{
  const previous=globalThis.document;let surfaces=0;
  globalThis.document={createElement(){surfaces++;const surface={};surface.getContext=()=>({clearRect(){surface.revision=null;},drawImage(image){surface.revision=image.revision;},fillRect(){}});return surface;}};
  try{
    const renderer=Object.assign(Object.create(Renderer.prototype),{t:.3}),image={revision:1},shown=[];
    const context={save(){},restore(){},globalAlpha:1,drawImage:tint=>shown.push(tint.revision)};
    renderer.tintTarget(context,image,0,0,64,64,0,0,64,64);
    image.revision=2;renderer.tintTarget(context,image,0,0,64,64,0,0,64,64);
    assert.deepEqual(shown,[1,2]);assert.equal(surfaces,1);
  }finally{globalThis.document=previous;}
});

test('directed Zubat bite meets the target surface with its native mouth and preserves logical actors',()=>{
  for(const reduced of[false,true]){
    const actor=Object.freeze({id:7,key:'zubat',card:CARDS.zubat,x:266,y:523,dx:1,dy:0,hp:81,
      attackSeq:2,attackTargetId:8,attackAnim:'Attack',attackDuration:.88,attackWindup:.6,attack:.28});
    const target=Object.freeze({id:8,key:'snorlax',card:CARDS.snorlax,x:334,y:541,radius:18,hp:3968});
    const before=JSON.stringify([actor,target]);
    const renderer=Object.assign(Object.create(Renderer.prototype),{t:1,reduced,verticalScale:1,visualActors:new Map([[7,{}]]),frameActors:new Map([[7,actor],[8,target]])});
    renderer.prepareBiteActors();const shown=renderer.frameActors.get(7),mouth=renderer.visualEmission(shown);
    assert.ok(Math.hypot(mouth.x-shown.biteContact.x,mouth.y-shown.biteContact.y)<1e-7,'contact shares the drawn native mouth');
    assert.ok(shown.x>actor.x+15,'the body closes the visible gap rather than adding a distant flash');
    assert.equal(shown.card,actor.card);assert.equal(shown.card.scale,1.12);
    assert.equal(JSON.stringify([actor,target]),before,'Game positions and native card stay untouched');
    const meta=SPRITE_GEOMETRY[41].Attack,profile=attackVisualProfile(actor.card);
    assert.equal(attackAnimationFrame(meta,.6,.88,.6,profile.attackFrames,profile),6);
    assert.equal(CARDS.zubat.attackDuration,.76,'display recovery does not alter native timing');
  }
});

test('bite freeze retains the current pose despite target movement; stun cancels the presentation',()=>{
  const actor={id:7,card:CARDS.zubat,x:266,y:523,dx:1,dy:0,hp:81,attackSeq:2,attackTargetId:8,attackDuration:.88,attackWindup:.6,attack:.28};
  const target={id:8,card:CARDS.snorlax,x:334,y:541,radius:18,hp:3968};
  const renderer=Object.assign(Object.create(Renderer.prototype),{t:1,reduced:false,verticalScale:1,visualActors:new Map([[7,{}]]),frameActors:new Map([[7,actor],[8,target]])});
  renderer.prepareBiteActors();const first=renderer.frameActors.get(7);
  renderer.frameActors=new Map([[7,{...actor,freeze:.5}],[8,{...target,x:target.x+30}]]);
  renderer.prepareBiteActors();const held=renderer.frameActors.get(7);
  assert.equal(held.x,first.x);assert.equal(held.y,first.y);assert.deepEqual(held.biteContact,first.biteContact);
  renderer.frameActors=new Map([[7,{...actor,stun:.5}],[8,target]]);renderer.prepareBiteActors();
  assert.equal(renderer.frameActors.get(7).biteContact,undefined);
  assert.equal(renderer.visualActors.get(7).bite,undefined);
});

test('bite recovery returns to the native body, while reduced keeps the structural approach',()=>{
  const actor={card:CARDS.zubat,hp:81,attackDuration:.88,attackWindup:.6};
  for(const elapsed of[.44,.5,.6,.66,.75,.86]){
    const normal=biteMotion({...actor,attack:.88-elapsed}),reduced=biteMotion({...actor,attack:.88-elapsed},true);
    assert.equal(normal.reach,reduced.reach,'essential contact is retained in reduced motion');
  }
  assert.equal(biteMotion({...actor,attack:.28}).reach,1);
  assert.ok(biteMotion({...actor,attack:.00001}).reach<1e-6);
  assert.equal(biteMotion({...actor,attack:0}),null);
  for(const key of['poochyenaPack','poochyenaToken','crobat','ekans']){
    const card=CARDS[key];assert.equal(attackVisualProfile(card),card,key+' existing profile is unchanged');
    assert.equal(biteMotion({...actor,card,attack:.28}),null);
  }
});

test('bite head follows a progressive route while its contact stays fixed to the moving target',()=>{
  const actor={id:7,card:CARDS.zubat,x:266,y:523,dx:1,dy:0,hp:81,attackSeq:2,attackTargetId:8,attackDuration:1,attackWindup:.6};
  const renderer=Object.assign(Object.create(Renderer.prototype),{t:1,reduced:false,verticalScale:1,visualActors:new Map([[7,{}]]),frameActors:new Map()});
  let surface,previous;
  for(const elapsed of[0,.12,.2,.3,.4,.5,.6]){
    const target={id:8,card:CARDS.snorlax,x:334+elapsed*18,y:541+elapsed*12,radius:18,hp:3968};
    renderer.t=1+elapsed;renderer.frameActors=new Map([[7,{...actor,attack:1-elapsed}],[8,target]]);
    renderer.prepareBiteActors();const shown=renderer.frameActors.get(7),head=renderer.visualEmission(shown);
    const local={x:shown.biteContact.x-target.x,y:shown.biteContact.y-target.y};
    if(!surface)surface=local;
    assert.ok(Math.hypot(local.x-surface.x,local.y-surface.y)<1e-7,'wing frames do not steer the target-local contact');
    if(elapsed>=.12&&previous)assert.ok(head.x>=previous.x,'approach does not reverse between native poses');
    if(elapsed===.3)assert.ok(head.x>actor.x+12,'approach is already visible halfway through windup');
    if(elapsed===.6)assert.ok(Math.hypot(head.x-shown.biteContact.x,head.y-shown.biteContact.y)<1e-7);
    previous=head;
  }
});

test('release retains its original attack target through a logical retarget',()=>{
  const first={id:8},next={id:9},actor={id:7,card:CARDS.zubat,x:266,y:523,dx:1,dy:0,hp:81,
    attackSeq:2,attack:.16,attackDuration:.76,attackWindup:.6,target:first};
  const renderer=Object.assign(Object.create(Renderer.prototype),{t:1,effects:[],visualActors:new Map()});
  renderer.onEvent({type:'attackStart',attacker:actor,target:first});
  actor.target=next;renderer.onEvent({type:'attackRelease',attacker:actor,target:first});
  assert.equal(renderer.attackContacts.get(7).targetId,8);
  assert.equal(renderer.visualActor(actor,0).attackTargetId,8);
});

test('Zubat raises, folds and reopens native wings while its jaw closes only on released contact',()=>{
  const card=CARDS.zubat,meta=SPRITE_GEOMETRY[41].Attack,profile=attackVisualProfile(card);
  const phases=[0,.3,.6,.75,.94].map(t=>attackAnimationFrame(meta,t,1,.6,profile.attackFrames,profile));
  assert.deepEqual(phases,[1,6,6,10,1],'raised preparation, folded entry/contact and reopened recovery');
  const actor={card,hp:81,attackDuration:1,attackWindup:.6};
  const jaw=(elapsed,released=false)=>biteJaw({...actor,attack:1-elapsed},released);
  assert.equal(jaw(.01).frame,3);assert.equal(jaw(.12).frame,0,'the mouth opens during preparation');
  assert.equal(jaw(.3).frame,0);assert.equal(jaw(.6).frame,2,'predicted contact waits for authority');
  assert.equal(jaw(.6,true).frame,3,'the released native bite closes');
  assert.equal(jaw(.9,true).opacity,0,'the mouth cue ends while the wings recover');
});

test('the real mouth drawing uses the preloaded directional Bite atlas at the native emission marker',()=>{
  const image={width:224,height:448},actor={id:7,card:CARDS.zubat,x:266,y:523,dx:1,dy:0,hp:81,
    attackSeq:2,attackDuration:1,attackWindup:.6,attack:.7,biteContact:{x:300,y:495}};
  const renderer=Object.assign(Object.create(Renderer.prototype),{t:1,verticalScale:1,reduced:false,
    attackContacts:new Map([[7,{seq:2,shot:-1}]]),battleArt:{images:new Map([['assets/battle/Particle__Bite.Dir8.png',image]])}});
  const draws=[],locations=[],context={globalAlpha:1,save(){},restore(){},translate(x,y){locations.push({x,y});},scale(){},drawImage(...args){draws.push(args);}};
  const before=JSON.stringify(actor),mouth=renderer.visualEmission(actor);
  assert.equal(renderer.drawBiteGesture(context,actor),true);
  assert.equal(draws[0][0],image);assert.equal(draws[0][1],17,'open native frame0, genuine east row');
  assert.equal(draws[0][2],116);assert.equal(draws[0][3],24);assert.equal(draws[0][4],48);
  assert.ok(Math.hypot(locations[0].x-mouth.x,locations[0].y-mouth.y)<3,'jaw is attached to the mouth, not to a distant impact');
  assert.equal(JSON.stringify(actor),before,'drawing does not write into the logical actor');
  renderer.attackContacts.get(7).shot=0;renderer.drawBiteGesture(context,{...actor,attack:.4});
  assert.equal(draws[1][1],3*56+17,'closed native frame3 at authoritative release');
});

import { CARDS, DEFAULT_DECK, directionRow, attackPoseProgress, spellOverlapsTarget } from './engine.js?v=34';
import { W, H, TILE, ARENA, DEPLOY_GRID, LANES, RIVER, BRIDGE, arenaBits, arenaProjection, screenToWorld } from './arena-geometry.js?v=34';
import { BattleArt,STRUCTURE_ART } from './battle-art.js?v=36';
import { emissionPoint, animationFrame, attackAnimationFrame, movementAnchor, TOWER_MOUNTS, structureLift } from './sprite-motion.js?v=34';
import {combatVisual,projectileVisual,movementVisual,isRangedAttack,attackVisualProfile,dashPreparation} from './combat-visuals.js?v=36';
import { spellPreviewTargets } from './spell-preview.js?v=34';
import {areaGuide,softDisc,cellGuide,travelGuide} from './targeting-art.js?v=36';
import { FlightWings } from './wing-motion.js?v=34';
import { drawCapsule,CapsuleArt,CAPSULE_TEXTURE } from './capsule-art.js?v=34';
import {spellVisualProfile,spellFlightAge,spellFlightVisual,missileFlightVisuals,missileFormation} from './spell-visuals.js?v=34';
import * as onlineConfig from './online-config.js?v=36';
const publicAssetUrl=onlineConfig.publicAssetUrl||((file)=>file);
const {whirlpoolPhase,earthquakePhase,earthquakeFissures}=await import(publicAssetUrl('./field-motion.js?v=36'));
const {flameFrame,rollingFirePose,drawFireWheel,FIRE_WHEEL_FILES,loadFireWheelMaterial}=await import(publicAssetUrl('./fire-material.js?v=38'));
const {canvasBackingSize,alignedSpriteRect}=await import(publicAssetUrl('./canvas-raster.js?v=36'));
const {NativeSpriteSampler}=await import(publicAssetUrl('./native-sprite-sampling.js?v=36'));

function rect(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function ellipse(c, color, x, y, rx, ry) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function line(c, color, x1, y1, x2, y2, width = 1) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function text(c, label, x, y, color = '#f8f1d6', size = 12, weight = 600) { c.font = `${weight} ${size}px "DM Sans", "Segoe UI", sans-serif`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y); }
const visualScale = unit => unit.scale ?? unit.card?.scale ?? 1.5;
const spikeMaterials=new WeakMap();
export function spikesContactPoint(field,target){
  if(!field||!target||field.team===target.team||field.air===false&&target.card?.flying||!spellOverlapsTarget(field,field,target))return null;
  if('king'in target||target.card?.structure){
    const half='king'in target?TILE:target.radius||TILE;
    return{x:Math.max(target.x-half,Math.min(target.x+half,field.x)),y:Math.max(target.y-half,Math.min(target.y+half,field.y))};
  }
  const dx=field.x-target.x,dy=field.y-target.y,d=Math.hypot(dx,dy);
  if(d<=field.radius)return{x:target.x,y:target.y};
  const along=(d-field.radius+(target.radius||0))/2;
  return{x:target.x+dx/d*along,y:target.y+dy/d*along};
}
function spikeMaterial(doc,radius,vertical){
  if(!doc)return null;
  let cache=spikeMaterials.get(doc);if(!cache){cache=new Map();spikeMaterials.set(doc,cache);}
  const key=radius+':'+vertical;if(cache.has(key))return cache.get(key);
  const node=doc.createElement('canvas');node.width=18;node.height=18;
  const n=node.getContext('2d');n.translate(9,14);
  n.fillStyle='#253c365c';n.fillRect(-6,-1,12,3);
  for(const[x,y,h]of[[-4,0,6],[4,0,7],[0,1,11]]){
    n.fillStyle='#344638';n.beginPath();n.moveTo(x-4,y);n.lineTo(x,y-h);n.lineTo(x+4,y);n.closePath();n.fill();
    n.fillStyle='#c9cdb2';n.beginPath();n.moveTo(x-2,y-1);n.lineTo(x,y-h+2);n.lineTo(x,y-1);n.closePath();n.fill();
    n.fillStyle='#819386';n.beginPath();n.moveTo(x,y-h+2);n.lineTo(x+2,y-1);n.lineTo(x,y-1);n.closePath();n.fill();
    n.fillStyle='#f5edca';n.fillRect(x-1,y-h+1,2,2);
  }
  const pad=14,ground=doc.createElement('canvas');ground.width=ground.height=Math.ceil(radius*2+pad*2);
  const c=ground.getContext('2d'),origin=radius+pad;
  c.translate(origin,origin);c.imageSmoothingEnabled=false;
  const soil=c.createRadialGradient(0,0,0,0,0,radius);
  soil.addColorStop(0,'rgba(73,62,38,.25)');soil.addColorStop(.88,'rgba(73,62,38,.25)');soil.addColorStop(.95,'rgba(73,62,38,.20)');soil.addColorStop(1,'rgba(73,62,38,0)');
  c.fillStyle=soil;c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.fill();
  c.save();c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.clip();
  for(let i=0;i<72;i++){
    const a=i*2.39996,r=Math.sqrt((i+.5)/72)*(radius-1),x=Math.round(Math.cos(a)*r),y=Math.round(Math.sin(a)*r);
    c.globalAlpha=.08*Math.min(1,(radius-r)/4);c.fillStyle=i%2?'#eddd9c':'#394e38';c.fillRect(x,y,2+i%3,1+i%2);
  }c.restore();
  const points=Array.from({length:32},(_,i)=>{const a=i*2.39996,r=Math.sqrt((i+.5)/32)*(radius-8);return{x:Math.cos(a)*r,y:Math.sin(a)*r};});
  for(let i=0;i<4;i++){const a=i*Math.PI/2;points.push({x:Math.cos(a)*(radius-5),y:Math.sin(a)*(radius-5)});}
  points.sort((a,b)=>a.y-b.y);
  for(const p of points)c.drawImage(node,p.x-9,p.y-14/vertical,18,18/vertical);
  const result={ground,node,origin};if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
}
function attackLunge(unit,reduced){
  if(!reduced&&!unit.mounted&&unit.dash?.phase!=='windup'&&unit.card?.id===6&&unit.card.attackAnim==='Shoot'&&unit.attack>0){
    const elapsed=(unit.attackDuration||unit.card.attackDuration)-unit.attack,windup=unit.attackWindup??unit.card.windup;
    // Draw back while inhaling, then meet the unchanged native mouth point at
    // release. The sprite and visual emitter use this same presentation offset.
    return windup>0&&elapsed<windup?-14*Math.sin(Math.PI*Math.max(0,elapsed)/windup):0;
  }
  if(reduced||!unit.attack||unit.mounted||unit.dash?.phase==='windup'||!unit.card||isRangedAttack(unit.card))return 0;
  const duration=unit.attackDuration||.75,elapsed=duration-unit.attack;
  const windup=unit.attackWindup??unit.card.windup??.3,spacing=unit.card.burstSpacing||duration;
  let thrust=0;
  for(let shot=0;shot<(unit.card.burst||1);shot++)thrust=Math.max(thrust,Math.exp(-Math.pow((elapsed-windup-shot*spacing)/Math.min(.08,spacing*.3),2)));
  return thrust*3;
}
function pixelMeter(c,x,y,width,progress,color,segments=6){
  rect(c,'#24352e',x-2,y-2,width+4,8);rect(c,'#495346',x,y,width,4);
  const gap=2,step=(width+gap)/segments,filled=Math.floor(Math.max(0,Math.min(1,progress))*segments+1e-6);
  for(let i=0;i<segments;i++)if(i<filled){rect(c,color,x+i*step,y,step-gap,4);rect(c,'#fff3c1',x+i*step,y,step-gap,1);}
}
function placementWarning(c,x,y,vertical){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(1,1/vertical);
  rect(c,'#484832',-8,-13,16,24);rect(c,'#484832',-10,-11,20,20);rect(c,'#484832',-3,11,6,4);
  rect(c,'#fff3cc',-6,-11,12,20);rect(c,'#fff3cc',-8,-9,16,16);rect(c,'#fff3cc',-1,9,2,4);
  rect(c,'#ac3338',-2,-8,4,10);rect(c,'#ac3338',-2,5,4,3);c.restore();
}
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.verticalScale=1;
    const resize=(width,height)=>{
      if(!(width>0&&height>0))return;
      const changed=width!==this.viewport?.width||height!==this.viewport?.height;
      this.viewport={width,height};this.projection=arenaProjection(width,height);this.verticalScale=1;
      this.resizeBacking();
      const start=screenToWorld({x:0,y:0},width,height),end=screenToWorld({x:width,y:height},width,height);
      this.worldBounds={left:start.x,top:start.y,right:end.x,bottom:end.y};
      if(changed&&this.background)this.buildBackground();
    };
    resize(canvas.clientWidth||canvas.width,canvas.clientHeight||canvas.height);
    this.resizeObserver=new ResizeObserver(([entry])=>resize(entry.contentRect.width,entry.contentRect.height));
    this.resizeObserver.observe(canvas);
    if(typeof IntersectionObserver==='function'){
      this.visibilityObserver=new IntersectionObserver(([entry])=>{this.rasterVisible=entry.isIntersecting;this.resizeBacking();});
      this.visibilityObserver.observe(canvas);
    }
    this.background = document.createElement('canvas'); this.background.width = W; this.background.height = H;
    this.sprites = new Map(); this.metadata = {};
    this.anchors = new Map(); this.bodyHeights = new Map(); this.effects = [];
    this.particles = []; this.numbers = [];this.showCombatNumbers=false;
    this.healthStates=new Map();this.speciesLoads=new Map();this.imageLoads=new Map();this.pendingSpecies=new Set();
    this.battleArt=new BattleArt(file=>this.loadImage(file));this.visualActors=new Map();this.visualProjectiles=new Map();this.frameActors=new Map();
    this.t = 0; this.reduced = false; this.pointer = null; this.selection = null; this.tutorialSpot = false; this.viewerTeam=0;
    this.nativeSpriteSampler=new NativeSpriteSampler();
    this.buildBackground();
  }
  resizeBacking(deviceRatio=globalThis.devicePixelRatio||1){
    if(!this.viewport)return;
    const size=canvasBackingSize(this.viewport.width,this.viewport.height,this.rasterVisible===false?1:deviceRatio);
    if(!size)return;
    if(this.canvas.width!==size.width)this.canvas.width=size.width;
    if(this.canvas.height!==size.height)this.canvas.height=size.height;
    this.pixelRatio=size.ratio;this.ctx.imageSmoothingEnabled=false;
  }
  async load(keys=DEFAULT_DECK,onProgress=()=>{}) {
    const response = await fetch('assets/pokemon/manifest.json?v=34');
    if (!response.ok) throw new Error('No se pudo cargar el archivo de sprites.');
    this.metadata = await response.json();
    const ids=[...new Set([...keys.map(k=>CARDS[k]?.id),31,34,52].filter(Boolean))];
    const files=new Set(ids.flatMap(id=>[...this.animationEntries(id).flatMap(([,meta])=>[meta.file,meta.shadow])]));
    const material=loadFireWheelMaterial(file=>this.loadImage(file));
    const total=files.size+this.battleArt.files().length+FIRE_WHEEL_FILES.length;let loaded=0;
    const track=pending=>pending.then(value=>{onProgress(++loaded,total);return value;});
    onProgress(0,total);
    await Promise.all([this.ensureSpecies(ids),...[...files].map(file=>track(this.loadImage(file))),this.battleArt.preload(()=>onProgress(++loaded,total)),...material.images.map(track),material.ready]);
    this.capsuleArt=new CapsuleArt(this.battleArt.images.get(CAPSULE_TEXTURE));
    this.buildBackground();
  }
  animationEntries(id){
    const names=new Set(['Walk','Idle','Attack','Hurt',...([31,34,52].includes(Number(id))?['Shoot']:[]),...Object.values(CARDS).filter(c=>c.id===Number(id)).flatMap(c=>[c.attackAnim,c.moveAnim,c.idleAnim]).filter(Boolean)]);
    return Object.entries(this.metadata[id]||{}).filter(([name])=>names.has(name));
  }
  loadImage(file){
    if(!this.imageLoads.has(file)){const image=new Image();image.crossOrigin='anonymous';image.src=publicAssetUrl(file);this.imageLoads.set(file,image.decode().then(()=>image));}
    return this.imageLoads.get(file);
  }
  ensureSpecies(ids){if(!Object.keys(this.metadata).length)return Promise.resolve();return Promise.all([...new Set(ids.filter(Boolean))].map(id=>{
    if(this.speciesLoads.has(id))return this.speciesLoads.get(id);
    this.pendingSpecies.add(id);
    const pending=Promise.all([...this.animationEntries(id).map(async([name,meta])=>{
      const [img,shadow]=await Promise.all([this.loadImage(meta.file),this.loadImage(meta.shadow)]);
      this.sprites.set(`${id}-${name}`, img);
      const surface=document.createElement('canvas');surface.width=shadow.width;surface.height=shadow.height;
      const ctx=surface.getContext('2d',{willReadFrequently:true});ctx.drawImage(shadow,0,0);
      const pixels=ctx.getImageData(0,0,shadow.width,shadow.height).data,anchors=[];
      for(let y=0;y<shadow.height;y++)for(let x=0;x<shadow.width;x++){
        const n=(y*shadow.width+x)*4;
        if(pixels[n]===255&&pixels[n+1]===255&&pixels[n+2]===255&&pixels[n+3]>0){
          const row=Math.floor(y/meta.height),frame=Math.floor(x/meta.width);
          (anchors[row]||=[])[frame]={x:x%meta.width,y:y%meta.height};
        }
      }
      this.anchors.set(`${id}-${name}`,anchors);
      if(name==='Idle'||Object.values(CARDS).some(card=>card.id===Number(id)&&(card.moveAnim===name||card.idleAnim===name||card.flying&&name==='Walk'))){
        surface.width=img.width;surface.height=img.height;ctx.drawImage(img,0,0);
        const data=ctx.getImageData(0,0,img.width,img.height).data;let height=0;
        for(let row=0;row<img.height/meta.height;row++)for(let frame=0;frame<meta.durations.length;frame++){
          let top=meta.height;
          for(let y=0;y<meta.height&&top===meta.height;y++)for(let x=0;x<meta.width;x++)if(data[((row*meta.height+y)*img.width+frame*meta.width+x)*4+3]>0){top=y;break;}
          const anchor=Object.values(CARDS).some(card=>card.id===Number(id)&&card.moveAnim===name&&card.movementAnchor==='body')?movementAnchor(Number(id),name,row,frame,anchors[row]?.[frame]):anchors[row]?.[frame];
          height=Math.max(height,(anchor?.y??meta.height*.7)-top);
        }
        this.bodyHeights.set(Number(id),Math.max(this.bodyHeights.get(Number(id))||0,height));
      }
    })]);this.speciesLoads.set(id,pending);pending.then(()=>this.pendingSpecies.delete(id),()=>this.pendingSpecies.delete(id));return pending;
  }));
  }
  rng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  tree(c,x,y,scale=1){this.battleArt.draw(c,'tree',x,y-25*scale,65*scale,65*scale,{frame:0});}
  drawPerimeter(c){
    // Native wood and canopy sit wholly outside the 18 × 32 playable cells.
    // The grass itself is continuous across this physical boundary.
    const fence=(x,y,angle=0)=>{c.save();c.translate(x,y);c.rotate(angle);this.battleArt.tile(c,'fence',0,24,48,24,-16,0,32,16);c.restore();};
    c.save();c.filter='saturate(.55) brightness(.9)';c.globalAlpha=.85;
    for(let x=ARENA.left+16;x<ARENA.right;x+=32){fence(x,ARENA.top-16);fence(x,ARENA.bottom);}
    for(let y=ARENA.top+16;y<ARENA.bottom;y+=32){
      if(y+16>RIVER.top&&y-16<RIVER.bottom)continue;
      fence(ARENA.left,y,Math.PI/2);fence(ARENA.right,y,-Math.PI/2);
    }
    c.filter='saturate(.5) brightness(.9)';c.globalAlpha=.9;
    for(const y of[144,288,544,688]){this.tree(c,ARENA.left-28,y,.72);this.tree(c,ARENA.right+28,y,.72);}
    c.restore();
  }
  bridge(c,x){
    const image=this.battleArt.images.get('assets/battle/arena-bridge-v2.webp');
    const width=BRIDGE.halfWidth*2,height=BRIDGE.bottom-BRIDGE.top;
    if(image){
      const edge=4;
      c.drawImage(image,0,0,edge,image.height,x-BRIDGE.halfWidth,BRIDGE.top,edge,height);
      c.drawImage(image,edge,0,image.width-edge*2,image.height,x-BRIDGE.halfWidth+edge,BRIDGE.top,width-edge*2,height);
      c.drawImage(image,image.width-edge,0,edge,image.height,x+BRIDGE.halfWidth-edge,BRIDGE.top,edge,height);
    }else rect(c,'#b9985d',x-BRIDGE.halfWidth,BRIDGE.top,width,height);
  }
  buildBackground(){
    const bounds=this.worldBounds||{left:0,top:0,right:W,bottom:H},left=Math.floor(bounds.left),top=Math.floor(bounds.top),right=Math.ceil(bounds.right),bottom=Math.ceil(bounds.bottom);
    this.backgroundOrigin={x:left,y:top};this.background.width=right-left;this.background.height=bottom-top;
    const c=this.background.getContext('2d');c.imageSmoothingEnabled=false;c.translate(-left,-top);
    const ground=this.battleArt.images.get('assets/battle/arena-ground-v2.webp');
    const pattern=(x,y,width,height)=>{
      const tile=document.createElement('canvas');tile.width=width;tile.height=height;
      tile.getContext('2d').drawImage(ground,x,y,width,height,0,0,width,height);return c.createPattern(tile,'repeat');
    };
    this.landscapePattern=ground?pattern(200,224,120,128):null;
    const path=ground?pattern(146,240,24,72):'#c9bd8c';
    c.fillStyle=this.landscapePattern||'#8eaa79';c.fillRect(left,top,right-left,bottom-top);
    this.drawPerimeter(c);
    const half=TILE/2;
    for(let row=0;row<DEPLOY_GRID.rows*2;row++)for(let col=0;col<DEPLOY_GRID.columns*2;col++){
      const x=ARENA.left+col*half,y=ARENA.top+row*half,bits=arenaBits(x+half/2,y+half/2);
      if(bits&3){c.fillStyle=path;c.fillRect(x,y,half,half);}
    }
  }
  resetVisuals(){this.visualActors?.clear();this.visualProjectiles?.clear();this.visualFlights?.clear();this.visualFields?.clear();this.frameActors?.clear();this.flightWings?.phases.clear();this.attackContacts?.clear();this.effects=this.effects?.filter(e=>e.kind!=='spikeContact')||[];}
  visualActor(unit,dt){
    let pose=this.visualActors.get(unit.id);
    const fresh=!pose||Math.hypot(pose.x-unit.x,pose.y-unit.y)>95;
    if(fresh){pose={x:unit.x,y:unit.y,dx:unit.dx??0,dy:unit.dy??-1,seq:unit.attackSeq,attack:unit.attack||0};this.visualActors.set(unit.id,pose);}
    const blend=1-Math.exp(-dt*(unit.dash?.phase==='travel'?40:24));pose.x+=(unit.x-pose.x)*blend;pose.y+=(unit.y-pose.y)*blend;
    const turn=1-Math.exp(-dt*24);pose.dx+=((unit.dx||0)-pose.dx)*turn;pose.dy+=((unit.dy||0)-pose.dy)*turn;
    if(pose.seq!==unit.attackSeq){pose.seq=unit.attackSeq;pose.attack=unit.attack||0;}else if(!fresh)pose.attack=Math.max(0,Math.min(unit.attack||0,pose.attack-dt));
    const card=unit.card||unit.guard||{},contact=this.attackContacts?.get(unit.id),current=contact?.seq===unit.attackSeq?contact:null;
    if(current&&unit.attack>0){
      const duration=unit.attackDuration||card.attackDuration||.6,windup=unit.attackWindup??card.windup??unit.windup??.18,spacing=card.burstSpacing||duration,next=current.shot+1;
      let elapsed=duration-pose.attack;
      // Do not recover from a predicted contact before its authoritative event
      // arrives. This keeps each native gesture beside the hit at 15 Hz too.
      if(next<(card.burst||1))elapsed=Math.min(elapsed,windup+next*spacing);
      if(this.t<current.until)elapsed=Math.min(elapsed,windup+current.shot*spacing);
      pose.attack=duration-elapsed;
    }
    let dash=unit.dash;
    if(dash?.phase==='windup'){
      const logical=dash.elapsed||0,duration=unit.card?.dashWindup||.8;
      if(pose.dashSeq!==unit.attackSeq||pose.dashPhase!=='windup')pose.dashElapsed=logical;
      else if(!(unit.freeze>0||unit.stun>0))pose.dashElapsed=Math.max(logical,Math.min(logical+1/15,duration,pose.dashElapsed+Math.max(0,dt)));
      pose.dashSeq=unit.attackSeq;pose.dashPhase='windup';dash={...dash,elapsed:pose.dashElapsed};
    }else{pose.dashPhase=dash?.phase;delete pose.dashElapsed;}
    const displayed={...unit,x:pose.x,y:pose.y,dx:pose.dx,dy:pose.dy,attack:pose.attack,dash},held=contact?.held;
    if(held&&this.t<held.until&&!(unit.hp<=0||unit.stun>0||unit.freeze>0||unit.pushHurt>0)){
      // A packet can contain both a release and the next attackStart. Preserve
      // that released pose for two display frames without rewinding either clock.
      const duration=Math.max(held.duration,held.elapsed+1/30+1e-7);
      return this.presentAttack({...displayed,card:held.card,guard:held.guard,attackSeq:held.seq,attackAnim:held.animation,attackDuration:duration,attackWindup:held.windup,attack:duration-held.elapsed,dx:held.dx,dy:held.dy},pose,dt);
    }
    if(held&&this.t>=held.until)delete contact.held;
    return this.presentAttack(displayed,pose,dt);
  }
  presentAttack(actor,pose,dt){
    if(actor.card?.id!==6||actor.card.attackAnim!=='Shoot')return actor;
    const duration=(actor.attackWindup??actor.card.windup??.3)+.42;
    let show=pose.presentation;
    if(actor.hp<=0||actor.stun>0||actor.pushHurt>0){delete pose.presentation;return actor;}
    if(actor.attack>0){
      const elapsed=(actor.attackDuration||actor.card.attackDuration)-actor.attack;
      if(!show||show.seq!==actor.attackSeq)show=pose.presentation={seq:actor.attackSeq,elapsed};
      else if(!(actor.freeze>0))show.elapsed=elapsed;
    }else if(show?.seq===actor.attackSeq&&show.elapsed<duration&&!actor.moving){if(!(actor.freeze>0))show.elapsed+=Math.max(0,dt);}
    else{delete pose.presentation;return actor;}
    return show&&show.elapsed<duration?{...actor,attackDuration:duration,attack:duration-show.elapsed}:actor;
  }
  projected(point,actor){
    if(!actor)return point;
    return{x:actor.x+(point.x-(actor.logicalX??actor.x)),y:actor.y+(point.y-(actor.logicalY??actor.y))/(this.verticalScale||1)};
  }
  visualEmission(actor,shot=0){
    if(!actor)return null;
    const flightClock=this.flightWings?.phases.get(actor.id)?.phase??this.t;
    const point=emissionPoint({...actor,card:attackVisualProfile(actor.card)},shot,this.reduced?0:flightClock),bob=actor.card?.flying&&!this.reduced?Math.sin(flightClock*2.6+actor.id)*1.5:0;
    const lunge=attackLunge(actor,this.reduced);
    return{x:point.x+(actor.dx||0)*lunge,y:actor.y+(point.y-actor.y-bob+(actor.dy||0)*lunge)/(this.verticalScale||1)};
  }
  effectSource(effect){
    if(effect.hop===0&&effect.chainFromId===effect.sourceId){const actor=this.frameActors.get(effect.sourceId);return actor&&actor.hp>0?this.visualEmission(actor,effect.shot||0):effect.from;}
    if(effect.chainFromId){const actor=this.frameActors.get(effect.chainFromId);return actor?this.effectTarget({to:effect.from,targetId:actor.id}):effect.from;}
    const actor=this.frameActors?.get(effect.sourceId||effect.actor?.id);
    if(!actor)return effect.from;
    const from=this.visualEmission(actor,effect.shot||0);
    if(actor.card?.bolts&&effect.kind==='beam')from.x+=(effect.shot?6:-6);
    return from;
  }
  updateSpellTargets(game){
    const team=this.placementTeam||0,card=CARDS[this.selection],allowed=game.state==='playing'||this.placementWhenPaused&&game.state==='paused';
    const point=allowed&&card?.spell&&this.pointer?game.resolveDeployment(team,this.selection,this.pointer.x,this.pointer.y):null;
    this.spellTargets=new Set(spellPreviewTargets(game,card,point,team).map(target=>target.id));
  }
  tintTarget(c,image,sx,sy,sw,sh,dx,dy,dw,dh){
    const cache=this.targetTintCache??=new Map(),key=image.src+':'+[sx,sy,sw,sh].join(':');
    let tint=cache.get(key);
    const refresh=!tint||!image.src;
    if(!tint){tint=document.createElement('canvas');tint.width=sw;tint.height=sh;}
    if(refresh){
      // Articulated sprites are mutable canvases. Reuse their mask surface,
      // refreshing its pixels for this pose rather than caching a stale wing.
      const mask=tint.getContext('2d',{willReadFrequently:true});mask.imageSmoothingEnabled=false;mask.globalCompositeOperation='source-over';mask.clearRect(0,0,sw,sh);mask.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
      mask.globalCompositeOperation='source-in';mask.fillStyle='#ff3048';mask.fillRect(0,0,sw,sh);
    }
    cache.delete(key);cache.set(key,tint);if(cache.size>48)cache.delete(cache.keys().next().value);
    c.save();c.filter='none';c.globalAlpha*=this.reduced?.48:.32+.28*(.5+.5*Math.sin(this.t*Math.PI*2));c.drawImage(tint,0,0,sw,sh,dx,dy,dw,dh);c.restore();
  }
  targetTint(actor){return this.spellTargets?.has(actor.id)?(...args)=>this.tintTarget(...args):undefined;}
  tower(c,tower){
    const {x,y,team,king}=tower,vertical=this.verticalScale||1;
    if(tower.hp<=0){for(let i=0;i<3;i++)this.battleArt.draw(c,'rubble',x+(i-1)*15,y-3+(i%2)*5,32,24,{frame:5+i});return;}
    c.save();
    if(!this.battleArt.structure(c,king?'king':'princess',team,x,y,king?102:72,vertical,this.targetTint(tower)))text(c,'PLACEHOLDER',x,y-25,'#ffe3a0',9);
    if(tower.guard)this.sprite(c,{...tower,attack:!tower.active?0:tower.attack,card:{id:tower.guard.id},scale:king?1.15:1.3,x,y:y-TOWER_MOUNTS[king?'king':'princess']/vertical,mounted:true,attackAnim:tower.guard.attackAnim,moving:false},true);
    if(king&&!tower.active)text(c,'z',x+24,y-30/vertical,'#fff5cd',10);
    if(tower.stun>0)this.combatArt(c,'lightning',x,y-55/vertical,26);
    c.restore();
    if(this.towerHealthQueue)this.towerHealthQueue.push(tower);else this.towerHealth(c,tower);
  }
  towerHealth(c,tower){
    if(tower.hp<=0)return;
    const {x,y,team,king}=tower,vertical=this.verticalScale||1,enemy=team!==(this.viewerTeam??0);
    const guardHeight=(this.bodyHeights?.get(tower.guard?.id)||28)*(king?1.15:1.3);
    const structureHeight=king?102*476/574:72*395/309;
    const top=y-Math.max(structureHeight,tower.guard?TOWER_MOUNTS[king?'king':'princess']+guardHeight:0)/vertical;
    const width=king?68:60,by=enemy?top-31/vertical:y+10/vertical,ratio=Math.max(0,tower.hp/tower.maxHp);
    c.save();
    rect(c,'#20352ad9',x-width/2-2,by-2,width+4,10);rect(c,'#435845',x-width/2,by,width,6);
    rect(c,team?'#eb8e71':'#65b9d0',x-width/2,by,width*ratio,6);rect(c,team?'#ffcfb1':'#c7f1f1',x-width/2,by,width*ratio,2);
    const hp=tower.labImmortal?'∞':String(Math.ceil(tower.hp));c.font='600 12px "DM Sans",sans-serif';const labelWidth=c.measureText(hp).width+12;
    const labelY=by+18/vertical;
    rect(c,'#243b2ad9',x-labelWidth/2,labelY-8,labelWidth,16);text(c,hp,x,labelY,team?'#ffe2ce':'#d5f1ef',11,700);c.restore();
  }
  sprite(c, unit, idle = false) {
    if(unit.card.structureArt){this.structureSprite(c,unit,idle);return;}
    const id = unit.card.id;
    const burrow=unit.card.burrow&&!unit.preview?(this.reduced?(unit.burrowed?1:0):unit.burrowProgress??(unit.burrowed?1:0)):0;
    const buriedHealthY=unit.y-25/(this.verticalScale||1);
    if(burrow>=.999){
      this.platform(c,unit);
      if(!idle)this.queueUnitHealth(c,unit,unit.x,buriedHealthY,44);
      return;
    }
    if(!this.speciesLoads.has(id))this.ensureSpecies([id]).catch(()=>{});
    const movement=movementVisual(unit.card);
    const preparation=dashPreparation(unit,this.reduced);
    const golemHurt=unit.key==='golem'&&(unit.deathHurt||unit.pushHurt>0);
    let anim = golemHurt?'Hurt':unit.attack > 0||preparation ? (unit.attackAnim||unit.card.attackAnim||'Attack') : unit.moving||unit.card.flying ? movement.animation : unit.hit>0&&unit.key!=='golem'?'Hurt':unit.card.idleAnim||'Idle';
    if (!this.sprites.has(`${id}-${anim}`)) anim = 'Walk';
    const meta = this.metadata[id]?.[anim], img = this.sprites.get(`${id}-${anim}`);
    if (!meta || !img) return;
    const scale = visualScale(unit),vertical=this.verticalScale||1;
    let frame = 0;
    const attacking=(unit.attack>0||!!preparation)&&!golemHurt;
    this.flightWings??=new FlightWings();
    const flightClock=this.flightWings.clock(unit.id,this.t,unit.freeze>0);
    const duration = meta.durations.reduce((a,b)=>a+b,0);
    const elapsed = (unit.attackDuration || .6) - unit.attack;
    const windup = unit.attackWindup ?? unit.card.windup ?? .18;
    const progress=attacking?attackPoseProgress(meta,elapsed,unit.attackDuration||.6,windup):0;
    const loopFrames=!attacking&&anim===movement.animation?movement.frames:null;
    const loopMeta=loopFrames?{durations:loopFrames.map(()=>movement.frameDuration)}:meta;
    const speed=loopFrames?1:(unit.card.flying||unit.moving)?.85:.75;
    const clock=attacking?progress*duration:this.reduced?0:anim==='Hurt'?Math.max(0,.24-(golemHurt?unit.pushHurt:unit.hit))*60:(flightClock+unit.id*.173)*60*speed;
    const poseProfile=attackVisualProfile(unit.card);
    frame=attacking?attackAnimationFrame(meta,elapsed,unit.attackDuration||.6,windup,poseProfile.attackFrames,poseProfile):animationFrame(loopMeta,clock);
    if(preparation)frame=Math.min(meta.durations.length-1,preparation.frame);
    if(loopFrames)frame=loopFrames[frame];
    let direction = directionRow(unit.dx,unit.dy);
    if(img.height/meta.height<8)direction=0;
    const {x,y}=unit;
    const nativeAnchor=this.anchors.get(`${id}-${anim}`)?.[direction]?.[frame]||{x:meta.width/2,y:meta.height*.65};
    const anchor=(loopFrames||attacking)&&movement.bodyAnchor?movementAnchor(id,anim,direction,frame,nativeAnchor):nativeAnchor;
    const leapLift=unit.leap?Math.sin(Math.PI*unit.leap.elapsed/unit.leap.duration)*(this.reduced?12:unit.leap.kind==='river'?24:48):0;
    const lift=(leapLift+(unit.card.structure?structureLift(unit.card):unit.card.flying?16+(this.reduced?0:Math.sin(flightClock*2.6+unit.id)*1.5):0))/vertical;
    const lunge=attackLunge(unit,this.reduced);
    const radius=unit.radius||12;
    if(!unit.mounted&&!unit.preview){
      ellipse(c,'#15382a65',x,y+2,radius+2,unit.card.flying?6:4);
    }
    if(unit.card.structure)this.platform(c,unit);
    if(preparation&&!unit.preview)this.dashWindup(c,unit,preparation);
    c.save();
    if(preparation){
      const height=Math.max(16,(this.bodyHeights.get(id)||22)*scale/vertical),shear=(unit.dx||0)*preparation.lean/height;
      c.translate(x,y);c.transform(preparation.scaleX,0,shear,preparation.scaleY,0,0);c.translate(-x,-y);
    }
    if(burrow>0){c.beginPath();c.rect(x-100,y-180/vertical,200,183/vertical);c.clip();}
    const spawnProgress=unit.spawn>0?Math.max(0,1-unit.spawn/Math.max(.001,unit.spawnGroup?.duration??.75)):1;
    if(unit.spawn>0)c.globalAlpha=.2+.8*spawnProgress;
    if(unit.hit>0&&!this.reduced) c.filter=`brightness(${1+.35*unit.hit/.24})`;
    const px=x+unit.dx*lunge-anchor.x*scale,py=y+unit.dy*lunge/vertical-lift-(this.reduced?0:(1-spawnProgress)*12/vertical)-anchor.y*scale/vertical+burrow*((this.bodyHeights.get(id)||22)*scale+25)/vertical;
    if((unit.dash?.phase==='travel'||unit.card.charge&&unit.charge>=unit.card.charge)&&!this.reduced){for(let i=3;i>0;i--){c.globalAlpha=.08*(4-i);c.drawImage(img,frame*meta.width,direction*meta.height,meta.width,meta.height,Math.round(px-unit.dx*i*9),Math.round(py-unit.dy*i*9/vertical),meta.width*scale,meta.height*scale/vertical);}c.globalAlpha=1;}
    const articulated=this.nativeSpriteSampler?.frame(id,anim,direction,frame,meta,scale,vertical,c.getTransform?.(),img)||this.flightWings.frame(id,anim,direction,frame,img,meta,flightClock+(unit.id||0)*.173,this.reduced);
    const spriteImage=articulated?.image||img,spriteFrame=alignedSpriteRect(articulated?[0,0,articulated.image.width,articulated.image.height,px-articulated.padding*scale,py-articulated.padding*scale/vertical,articulated.width*scale,articulated.height*scale/vertical]:[frame*meta.width,direction*meta.height,meta.width,meta.height,px,py,meta.width*scale,meta.height*scale/vertical],c.getTransform?.());
    c.drawImage(spriteImage,...spriteFrame);
    if(preparation&&!unit.preview)this.dashWindup(c,unit,preparation,true);
    if(!unit.preview&&this.spellTargets?.has(unit.id))this.tintTarget(c,spriteImage,...spriteFrame);
    c.restore();
    if(unit.shield>0&&!unit.mounted){c.save();c.globalAlpha=.5;this.combatArt(c,'shield',x,y-lift-16,Math.max(40,radius*3));c.restore();}
    if(idle)return;
    const bodyHealthY=y-lift-((this.bodyHeights.get(id)||22)*scale+9+(id===6?12:0))/vertical;
    const by=bodyHealthY+(buriedHealthY-bodyHealthY)*burrow;
    this.queueUnitHealth(c,unit,x,by,unit.maxHp<=1?18:unit.card.count?30:unit.maxHp>=1800?52:44);
    if(unit.card.ability&&!unit.abilityUsed){ellipse(c,'#382448',x+27,by+4,6,6);text(c,'◆',x+27,by+4,'#e9beff',10,800);}
    if(unit.stun>0)this.combatArt(c,'lightning',x,by-10,22);
    else if(unit.slow>0)this.combatArt(c,'snow',x,by-10,18);
    if(unit.burn)this.combatArt(c,unit.burn.kind==='poison'?'poison':'flame',x,y-lift-9,26);
  }
  bodyHeight(unit,fallback=22){
    const art=STRUCTURE_ART[unit.card?.structureArt];
    return art?art.height-art.baseOffset:(this.bodyHeights.get(unit.card?.id)||fallback)*visualScale(unit)+(unit.card?.structure?structureLift(unit.card):unit.card?.flying?16:0);
  }
  dashWindup(c,unit,preparation,front=false){
    const vertical=this.verticalScale||1,energy=preparation.energy;
    if(!front){
      c.save();c.translate(unit.x,unit.y+2/vertical);c.scale(1,.3/vertical);
      softDisc(c,0,0,(unit.radius||14)+8,{color:'#b99adf',opacity:.18+.16*energy});c.restore();return;
    }
    const profile={...unit.card,emitter:'hands',attackFrames:[preparation.frame],attackContactFrame:preparation.frame};
    const pose={...unit,card:profile,attackAnim:unit.card.attackAnim,attack:1,attackDuration:1,attackWindup:0};
    const size=8+12*energy;
    for(const shot of[0,1]){
      const point=emissionPoint(pose,shot);
      c.save();c.globalAlpha*=.38+.3*energy;
      this.combatArt(c,'shadow',point.x,unit.y+(point.y-unit.y)/vertical,size,0,size,{frame:this.reduced?0:Math.floor(preparation.progress*6)%2,trim:true});c.restore();
    }
  }
  structureSprite(c,unit,idle=false){
    const art=STRUCTURE_ART[unit.card.structureArt];if(!art)return;
    const vertical=this.verticalScale||1,spawn=unit.spawn>0?Math.max(0,1-unit.spawn/Math.max(.001,unit.spawnGroup?.duration??.75)):1;
    const x=unit.x,y=unit.y+(art.baseOffset-(this.reduced?0:(1-spawn)*12))/vertical;
    c.save();if(unit.spawn>0)c.globalAlpha=.2+.8*spawn;
    if(unit.hit>0&&!this.reduced)c.filter=`brightness(${1+.35*unit.hit/.24})`;
    const drawn=this.battleArt.structure(c,unit.card.structureArt,unit.team,x,y,art.width,vertical,unit.preview?undefined:this.targetTint(unit));
    if(drawn){
      c.globalAlpha*=this.reduced?.12:.08+.08*(.5+.5*Math.sin(this.t*2));c.fillStyle='#ffd7ed';
      for(const side of[-1,1])c.fillRect(x+side*art.width*.244-2,y-(art.height*.243+2)/vertical,4,4/vertical);
    }
    c.restore();if(!drawn||idle)return;
    const by=unit.y-(this.bodyHeight(unit)+9)/vertical;
    this.queueUnitHealth(c,unit,x,by,44);
    if(unit.stun>0)this.combatArt(c,'lightning',x,by-10,22);
    else if(unit.slow>0)this.combatArt(c,'snow',x,by-10,18);
    if(unit.burn)this.combatArt(c,unit.burn.kind==='poison'?'poison':'flame',x,unit.y-9/vertical,26);
  }
  drawDeployments(c,game){
    const groups=new Map(),vertical=this.verticalScale||1;
    for(const unit of game.units){
      const group=unit.spawnGroup;
      if(unit.hp<=0||unit.spawn<=0||unit.spawnCause!=='card'||group?.spawnCause!=='card')continue;
      if(!Number.isFinite(group.startAt)||!Number.isFinite(group.duration)||game.elapsed+1e-7>=group.startAt+group.duration)continue;
      let marker=groups.get(group.id);
      if(!marker){marker={...group,top:H,remaining:0};groups.set(group.id,marker);}
      const lift=unit.card.structure?structureLift(unit.card):unit.card.flying?16:0;
      const height=unit.card.structureArt?(this.bodyHeight(unit)+35)/vertical:lift+((this.bodyHeights.get(unit.card.id)||22)*visualScale(unit)+35)/vertical;
      marker.top=Math.min(marker.top,(unit.drawY??unit.y)-height);
      marker.remaining=Math.max(marker.remaining,unit.spawn);
    }
    for(const marker of groups.values()){
      const progress=Math.max(0,Math.min(1,marker.startAt==null?1-marker.remaining/Math.max(.001,marker.duration):(game.elapsed-marker.startAt)/Math.max(.001,marker.duration)));
      this.deploymentIndicator(c,marker,progress);
    }
  }
  deploymentIndicator(c,marker,progress){
    const vertical=this.verticalScale||1,bounds=this.worldBounds||{left:0,top:0,right:W},x=Math.max(bounds.left+28,Math.min(bounds.right-28,marker.x)),y=Math.max(bounds.top+18/vertical,marker.top);
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(1,1/vertical);
    this.battleArt.draw(c,'pokeball',0,0,24,24,{frame:0,angle:this.reduced?0:Math.sin(progress*Math.PI)*.22});
    rect(c,'#263d3da6',-12,14,24,3);rect(c,'#f6e9bc',-12,14,24*Math.max(0,Math.min(1,progress)),3);
    c.restore();
  }
  combatArt(c,name,x,y,size,angle=0,height=size,options={}){
    if(!this.battleArt)return false;
    return this.battleArt.draw(c,name,x,y,size,height/(this.verticalScale||1),{age:this.t,angle,...options});
  }
  queueUnitHealth(c,unit,x,y,width){
    if(this.unitHealthQueue)this.unitHealthQueue.push({unit,x,y,width});
    else this.healthBar(c,unit,x,y,width);
  }
  healthBar(c,unit,x,y,width){
    const ratio=Math.max(0,unit.hp/unit.maxHp);let h=this.healthStates.get(unit.id);
    if(!h){h={chip:ratio,last:ratio,at:-10};this.healthStates.set(unit.id,h);}
    if(unit.card.structure)h.chip=ratio;
    else if(ratio<h.last-.001){h.at=this.t;h.chip=Math.max(h.chip,h.last);}if(ratio>h.chip)h.chip=ratio;h.last=ratio;
    if(this.t-h.at>.35)h.chip=Math.max(ratio,h.chip-(this.drawDt||0)*.9);
    const height=unit.maxHp<=1?4:8;
    rect(c,'#09170f',x-width/2-2,y-2,width+4,height+4);rect(c,'#32413b',x-width/2,y,width,height);
    if(h.chip>ratio)rect(c,'#ffe2a2',x-width/2,y,width*h.chip,height);
    rect(c,unit.team?'#ef615a':'#43baf1',x-width/2,y,width*ratio,height);rect(c,unit.team?'#ffaaa0':'#a3e5ff',x-width/2,y,width*ratio,2);
    if(unit.maxHp>1)for(let i=1;i<4;i++)rect(c,'#061a243d',x-width/2+width*i/4,y,1,height);
    if(unit.hit>.12){c.save();c.globalAlpha=(unit.hit-.12)/.12;rect(c,'#fff5cf',x-width/2,y,width*ratio,3);c.restore();}
    if(unit.shield>0){rect(c,'#102a36',x-width/2-1,y+10,width+2,5);rect(c,'#f1e0ff',x-width/2,y+11,width*unit.shield/Math.max(unit.shield,unit.maxShield||1),3);}
  }
  healthReadout(c,unit,x,y,width){
    // Keep the native meter's upper half and complete shield legible while a
    // moving head passes; the larger health box remains behind that head.
    const ratio=Math.max(0,unit.hp/unit.maxHp),chip=this.healthStates?.get(unit.id)?.chip??ratio;
    rect(c,'#32413b',x-width/2,y,width,4);
    if(chip>ratio)rect(c,'#ffe2a2',x-width/2,y,width*chip,4);
    rect(c,unit.team?'#ef615a':'#43baf1',x-width/2,y,width*ratio,4);
    rect(c,unit.team?'#ffaaa0':'#a3e5ff',x-width/2,y,width*ratio,2);
    if(unit.maxHp>1)for(let i=1;i<4;i++)rect(c,'#061a243d',x-width/2+width*i/4,y,1,4);
    if(unit.hit>.12){c.save();c.globalAlpha=(unit.hit-.12)/.12;rect(c,'#fff5cf',x-width/2,y,width*ratio,3);c.restore();}
    if(unit.shield>0){rect(c,'#102a36',x-width/2-1,y+10,width+2,5);rect(c,'#f1e0ff',x-width/2,y+11,width*unit.shield/Math.max(unit.shield,unit.maxShield||1),3);}
  }
  platform(c,unit){
    if(unit.card.burrow){
      const vertical=this.verticalScale||1;c.save();c.translate(unit.x,unit.y);c.scale(1,1/vertical);
      rect(c,'#263a32',-25,-9,50,20);rect(c,'#89998b',-23,-7,46,16);rect(c,'#b6c0a5',-20,-5,40,12);
      line(c,'#495f52',0,-5,0,7,2);for(const x of[-19,17])rect(c,'#465b4e',x,-4,3,3);
      rect(c,unit.team?'#d75f4e':'#498ca2',-16,7,32,3);
      c.restore();return;
    }
    if(unit.card.platform===false)return;
    if(!this.battleArt.structure(c,'platform',unit.team,unit.x,unit.y+4,74,this.verticalScale||1,this.targetTint(unit)))text(c,'PLACEHOLDER',unit.x,unit.y-15,'#ffe3a0',8);
  }
  onEvent(event,game) {
    const {type}=event;
    if(['faint','structureDown','towerDown'].includes(type)){
      const id=event.unit?.id??event.tower?.id;
      this.effects=this.effects.filter(e=>!['windup','charge'].includes(e.kind)||e.actor?.id!==id);
    }
    // Dash preparation is drawn from its live state, so pause, cancellation and
    // reconnect do not leave an independent charge timer behind the actor.
    if(type==='attackStart'&&event.attacker){
      this.attackContacts??=new Map();
      const held=this.attackContacts.get(event.attacker.id)?.held;
      this.attackContacts.set(event.attacker.id,{seq:event.attacker.attackSeq,shot:-1,until:0,held:held&&this.t<held.until?held:undefined});
    }
    if(type==='attackRelease'&&event.attacker){
      this.attackContacts??=new Map();
      const actor=event.attacker,profile=actor.card||actor.guard||{},duration=actor.attackDuration||profile.attackDuration||.6,windup=actor.attackWindup??profile.windup??actor.windup??.18;
      const shot=event.shot||0,until=this.t+1/30+1e-7,held={seq:actor.attackSeq,card:actor.card,guard:actor.guard,animation:actor.attackAnim||profile.attackAnim||'Attack',duration,windup,elapsed:windup+shot*(profile.burstSpacing||duration),dx:actor.dx,dy:actor.dy,until};
      const current=this.attackContacts.get(actor.id);
      this.attackContacts.set(actor.id,{...(current?.seq>actor.attackSeq?current:{seq:actor.attackSeq,shot,until}),held});
      if(profile.style==='ember'&&isRangedAttack(profile)&&!profile.suicide){const life=profile.id===6?.18:.16;this.effects.push({...event,kind:'muzzleFlame',sourceId:actor.id,targetId:event.target?.id,attackId:`${actor.id}:${actor.attackSeq}:${shot}`,life,max:life});}
    }
    if(type==='attackStart'&&['lightning','aura','psychic','confusion','flame','ember','hydro','bubble','ice','leaf','shadow','poison','powder','egg','song','magnet'].includes(event.style))this.effects.push({kind:'charge',actor:event.attacker,seq:event.attacker.attackSeq,style:event.style,life:event.windup,max:event.windup});
    if(type==='attackStart'&&['slam','eruption','horn'].includes(event.style))this.effects.push({kind:'windup',actor:event.attacker,seq:event.attacker.attackSeq,style:event.style,life:event.windup,max:event.windup});
    if(type==='beam'&&!event.missed){const life=event.hop===undefined?.42:.18;this.effects.push({...event,kind:'beam',life,max:life});}
    if(type==='flame'){const life=event.length/(event.speed||300)+.18;this.effects.push({...event,kind:'flame',life,max:life});}
    if(type==='melee')this.effects.push({...event,kind:'melee',life:['slam','eruption'].includes(event.style)?.5:.27,max:['slam','eruption'].includes(event.style)?.5:.27});
    if(type==='counter')this.effects.push({...event,kind:'counter',life:.3,max:.3});
    if(type==='attackRelease'&&event.style==='hydro')this.burst(event.from.x,event.from.y,'#b4ebef',8,45);
    if(type==='step'){
      const u=event.unit;if(u.key!=='gengar')this.burst(u.x-u.dx*5,u.y-u.dy*5,'#c3bd874d',u.key==='snorlax'?4:2,12);
    }
    if(type==='blink'){
      this.burst(event.from.x,event.from.y-10,'#aa80d1',18,65);this.burst(event.to.x,event.to.y-10,'#bb99e0',18,55);
      this.effects.push({kind:'blink',from:event.from,to:event.to,life:.35,max:.35});
    }
    if(type==='damage'&&event.amount>0){
      this.floatingNumber(event.target,event.amount,event.dot?'dot':'damage');const target=event.target,old=this.healthStates.get(target.id);
      this.healthStates.set(target.id,{chip:Math.max(old?.chip||0,Math.min(1,(target.hp+event.amount)/target.maxHp)),last:target.hp/target.maxHp,at:this.t});
      if(event.sourceKey==='earthquake')this.effects.push({kind:'artImpact',art:'vfxDebris',x:target.x,y:target.y-4,visualSize:Math.min(42,(target.radius||12)*2.5),life:.5,max:.5});
      if(event.sourceKey==='spikes'){
        // Events precede draw after a snapshot. Use that state rather than a
        // previous frame; the wire does not identify which overlapping field hit.
        const matches=(game?.fields||[]).filter(field=>field.key==='spikes').map(field=>({field,point:spikesContactPoint(field,target)})).filter(x=>x.point),match=matches[0];
        if(match&&matches.every(x=>x.point.x===match.point.x&&x.point.y===match.point.y))this.effects.push({kind:'spikeContact',...match.point,radius:match.field.radius,life:.2,max:.2});
      }
    }
    if(type==='heal'&&event.amount>0){this.floatingNumber(event.unit,event.amount,'heal');this.effects.push({kind:'artImpact',art:'heal',x:event.unit.x,y:event.unit.y-18,radius:30,life:1.2,max:1.2});}
    if(type==='spawn'){
      const u=event.unit;if(u.card.id)this.ensureSpecies([u.card.id]).catch(()=>{});
    }
    if(type==='entry')this.effects.push({...event,kind:'entry',life:.36,max:.36});
    if(type==='deathBurst'){
      const abilityArt=type==='ability'?{shield:'shield',wave:'hydro',quake:'quake',healingFire:'heal'}[event.unit.card.ability?.effect]:null;
      const art=abilityArt||(event.style==='lightning'?'lightning':{electric:'lightning',water:'hydro',fire:'explosion',grass:'leaf',psychic:'psychic',ghost:'shadow',rock:'dust'}[event.unit.card.type]||'impact');
      this.effects.push({kind:'areaImpact',art,style:event.style||event.unit.card.style,x:event.unit.x,y:event.unit.y,radius:event.radius||55,color:event.unit.card.color,groundOnly:event.groundOnly??!event.unit.card.air,life:.55,max:.55});
    }
    if(type==='hit'){
      if(event.key==='log'){
        this.effects.push({...event,kind:'rollingFireHit',life:.28,max:.28});
        return;
      }
      for(const effect of this.effects)if(effect.kind==='muzzleFlame'&&effect.key!=='charizard'&&effect.sourceId===event.sourceId)effect.life=Math.min(effect.life,.035);
      if(!event.radius&&CARDS[event.key]&&!isRangedAttack(CARDS[event.key]))return; // Contact is drawn once, by the melee event.
      const color=event.art==='petalShot'?'#ff9ccd':{ember:'#ffc083',hydro:'#91dcff',bubble:'#afeaff',leaf:'#e0f7ac',poison:'#d6a0f0',powder:'#d9b3f4',shadow:'#cda4f5',confusion:'#efb9f8',aura:'#efb9f8',ice:'#c1f5ff',rock:'#e4caa4',slam:'#e4caa4'}[event.style]||CARDS[event.key]?.color||'#eee8bc';
      const point=event.groundY===undefined?event:{x:event.groundX,y:event.groundY-(event.impactHeight||0)/(this.verticalScale||1)};
      const art=event.art||{ember:'explosion',hydro:'hydro',bubble:'bubble',leaf:'leaf',poison:'poison',powder:'poison',shadow:'shadow',confusion:'psychic',aura:'psychic',ice:'ice',rock:'dust'}[event.style];
      if(event.radius>0&&!event.structuresOnly){this.effects.push({kind:'areaImpact',art:art||{slam:'dust',eruption:'explosion',bite:'bite',slash:'slash'}[event.style]||'impact',style:event.style,x:event.groundX??event.x,y:event.groundY??event.y,impactX:point.x,impactY:point.y,radius:event.radius,color,groundOnly:event.groundOnly??!CARDS[event.key]?.air,life:.6,max:.6});return;}
      if(art)this.effects.push({kind:'artImpact',art,x:point.x,y:point.y,visualSize:combatVisual(CARDS[event.key]).impact,radius:28,life:art==='ice'?1.1:.6,max:art==='ice'?1.1:.6});
      else this.burst(point.x,point.y,color,4,30);
      if(['egg','song'].includes(event.style))this.effects.push({...event,...point,kind:'impact',life:.4,max:.4,radius:CARDS[event.key]?.splash||18});
    }
    if(['faint','structureDown'].includes(type)&&STRUCTURE_ART[event.unit.card?.structureArt])this.effects.push({kind:'structureDeath',art:event.unit.card.structureArt,x:event.unit.x,y:event.unit.y,team:event.unit.team,life:.4,max:.4});
    if(type==='faint'){
      if(event.unit.key==='golem')this.effects.push({kind:'golemDeath',unit:{...event.unit,attack:0,moving:false,deathHurt:true},life:.24,max:.24});
      this.burst(event.unit.x,event.unit.y-15,'#ddd9bd',12,55);
    }
    if(type==='structureDown'){this.burst(event.unit.x,event.unit.y-10,'#a9b395',28,85);this.burst(event.unit.x,event.unit.y-24,'#a4d5de',10,60);}
    if(type==='towerDown'){
      this.burst(event.tower.x,event.tower.y-20,'#c5b88d',35,110);
      this.effects.push({kind:'artImpact',art:'dust',x:event.tower.x,y:event.tower.y-15,radius:85,life:.8,max:.8});
    }
    if(type==='spellHit'){
      if(event.key==='pinMissile'){
        this.effects.push({...event,kind:'missiles',wave:event.wave||0,life:.24,max:.24});
        return;
      }
      if(event.key==='thunder'){this.effects.push({...event,kind:'entry',style:'lightning',life:.36,max:.36});return;}
      if(event.key==='lightning')return; // Its three actual target beams provide the strike and contact art.
      if(CARDS[event.key].fieldDuration)return;
      const art={fireball:'explosion',hyperBeam:'hyperImpact',blizzard:'ice',log:'flame'}[event.key]||'impact';
      this.effects.push({...event,kind:'areaImpact',art,style:CARDS[event.key].style,radius:event.radius,color:event.key==='hyperBeam'?'#ffe5a2':CARDS[event.key].color,life:.7,max:.7});
      if(event.key==='blizzard')this.effects.push({...event,kind:'spell',life:.65,max:.65});
    }
    if(type==='end'&&event.winner===0){for(let i=0;i<35;i++)this.particles.push({x:70+Math.random()*460,y:100+Math.random()*220,vx:(Math.random()-.5)*80,vy:-50-Math.random()*100,color:['#e8c777','#92c6ce','#b99ed9'][i%3],life:3,max:3,gravity:55,size:4});}
  }
  burst(x,y,color,count,speed) {
    if(this.reduced)count=Math.min(count,3);
    for(let i=0;i<count&&this.particles.length<350;i++)this.particles.push({x,y,vx:(Math.random()-.5)*speed,vy:(Math.random()-.5)*speed-20,color,life:.3+Math.random()*.4,max:.7,gravity:65,size:2+Math.random()*3});
  }
  setCombatNumbers(enabled){this.showCombatNumbers=enabled===true;this.numbers=[];}
  floatingNumber(target,amount,kind='damage'){
    if(!this.showCombatNumbers)return;
    const combined=this.numbers.find(n=>n.targetId===target.id&&n.kind===kind&&this.t-n.lastAt<.22);
    if(combined){combined.amount+=amount;combined.life=combined.max;combined.lastAt=this.t;return;}
    const height='king'in target?(target.king?83:72):this.bodyHeight(target,23)+13;
    const life=kind==='dot'?.95:1.15;
    if(this.numbers.length>=32)this.numbers.shift();
    this.numbers.push({targetId:target.id,kind,x:Math.max(24,Math.min(W-24,target.x+(target.id%3-1)*7+(kind==='dot'?15:kind==='heal'?-15:0))),y:Math.max(27,Math.min(H-27,target.y-height+(kind==='dot'?12:0))),amount,color:kind==='heal'?'#baf3a2':kind==='dot'?'#ffc27d':target.team?'#ffe8a0':'#ffd2c8',life,max:life,lastAt:this.t});
  }
  drawNumbers(c,dt){
    if(!this.showCombatNumbers){this.numbers=[];return;}
    const occupied=[];
    for(const n of this.numbers){
      n.life-=dt;if(n.life<=0)continue;
      const age=n.max-n.life,progress=age/n.max,size=n.kind==='dot'?17:n.amount>=160?23:20;
      const scale=this.reduced?1:age<.1?.8+age*3.2:age<.22?1.12-(age-.1):1;
      const value=`${n.kind==='heal'?'+':''}${Math.round(n.amount)}`;
      c.save();c.globalAlpha=progress<.62?1:(1-progress)/.38;
      c.font=`800 ${size}px "Barlow Condensed", "Segoe UI", sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
      const peak=this.reduced?1:1.12,width=((c.measureText?.(value)?.width??value.length*size*.58)+8)*peak,height=(size+8)*peak;
      const baseY=n.y-(this.reduced?0:progress*30);let y=baseY-(n.rise||0),below=(n.rise||0)<0;
      for(let i=0;i<occupied.length;i++){
        const other=occupied.find(other=>Math.abs(n.x-other.x)<(width+other.width)/2+3&&Math.abs(y-other.y)<(height+other.height)/2+3);
        if(!other)break;const gap=(height+other.height)/2+3;if(other.y-gap<height/2+4)below=true;const next=other.y+(below?gap:-gap);
        if(Math.abs(baseY-next)>96||next>H-height/2-4)break;y=next;n.rise=baseY-y;
      }
      occupied.push({x:n.x,y,width,height});c.translate(n.x,y);c.scale(scale,scale);
      c.strokeStyle='#0c180f';c.lineWidth=4.5;c.shadowColor='#08110d';c.shadowBlur=3;c.shadowOffsetY=2;c.strokeText(value,0,0);
      c.shadowBlur=0;c.shadowOffsetY=0;c.fillStyle=n.color;c.fillText(value,0,0);c.restore();
    }
    this.numbers=this.numbers.filter(n=>n.life>0);
  }
  projectilePose(p,point=p,predict=false){
    const key=p.id||p;let pose=this.visualProjectiles.get(key);
    if(!pose){pose={x:point.x,y:point.y,travelled:p.travelled||0,at:this.t};this.visualProjectiles.set(key,pose);}
    if(predict){
      // Piercing heads must reach the body on the damage packet. Predict only
      // the next room interval, using the authoritative heading and speed.
      if(pose.logicalTravelled!==p.travelled||pose.logicalX!==p.x||pose.logicalY!==p.y){pose.logicalTravelled=p.travelled;pose.logicalX=p.x;pose.logicalY=p.y;pose.logicalAt=this.t;}
      const advance=Math.min(Math.max(0,p.totalDistance-p.travelled),(p.speed||0)*Math.min(1/15,Math.max(0,this.t-pose.logicalAt)));
      pose.travelled=Math.min(p.totalDistance,Math.max(pose.travelled,p.travelled+advance));
      const ahead=pose.travelled-p.travelled;pose.x=p.x+p.dx*ahead;pose.y=p.y+p.dy*ahead;pose.at=this.t;return pose;
    }
    const blend=1-Math.exp(-(this.drawDt||0)*35);
    pose.x+=(point.x-pose.x)*blend;pose.y+=(point.y-pose.y)*blend;pose.travelled+=((p.travelled||0)-(pose.travelled||0))*blend;pose.at=this.t;
    return pose;
  }
  projectile(c,p){
    if(p.flameCone)return; // The travelling front is drawn by its matching flame event.
    if(p.electricChain){this.electricProjectile(c,p);return;}
    if(p.rolling){
      const pose=this.projectilePose(p);
      c.save();c.fillStyle='#17271f44';c.beginPath();c.ellipse(pose.x,pose.y+3,18,6,0,0,Math.PI*2);c.fill();
      if(!this.reduced)for(let i=1;i<=3;i++){c.save();c.globalAlpha=.25*(1-i/4);this.combatArt(c,'dust',pose.x-p.dx*i*11,pose.y-p.dy*i*11,15+i*3,0,12+i*2,{progress:(pose.travelled/100+i*.2)%1});c.restore();}
      this.combatArt(c,'rock',pose.x,pose.y-13/(this.verticalScale||1),38,this.reduced?0:pose.travelled/18,38,{frame:0,trim:true});c.restore();return;
    }
    if(p.linear){
      const pose=this.projectilePose(p,p,true),vertical=this.verticalScale||1,x=pose.x+(p.liftX||0),y=pose.y+(p.liftY||0)/vertical,length=Math.min(pose.travelled,54),visual=combatVisual(CARDS[p.key]);
      this.battleArt.beam(c,'psychic',{x:x-p.dx*length,y:y-p.dy*length},{x,y},visual.beam,this.reduced?0:this.t);
      const diameter=Math.max(12,visual.projectile,(p.shotRadius||0)*2);
      this.combatArt(c,'psychic',x,y,diameter,0,diameter,{age:this.reduced?0:this.t,trim:true});return;
    }
    const destination=p.impactPoint||p.target;if(!destination)return;
    const logicalProgress=Math.min(1,p.travelled/Math.max(1,p.totalDistance)),source=this.frameActors.get(p.sourceId),target=p.impactPoint?destination:this.frameActors.get(p.target?.id)||destination;
    const targetLift=p.endLiftY??-(p.target&&'king'in p.target?27:p.target?.card?.structure?43:p.target?.card?.flying?27:15);
    const start=this.projected({x:p.startX+(p.groundPath?p.liftX||0:0),y:p.startY+(p.groundPath?p.liftY||0:0)},source||{x:p.startX,y:p.startY}),end=this.projected({x:destination.x,y:destination.y+targetLift},target);
    const logicalEnd={x:destination.x,y:destination.y+(p.groundPath?0:targetLift)};
    const desired={x:p.x+(start.x-p.startX)*(1-logicalProgress)+(end.x-logicalEnd.x)*logicalProgress,y:p.y+(start.y-p.startY)*(1-logicalProgress)+(end.y-logicalEnd.y)*logicalProgress};
    const pose=this.projectilePose(p,desired),progress=Math.min(1,pose.travelled/Math.max(1,p.totalDistance));
    const arc=p.key==='charizard'?0:p.arc||0;
    const x=pose.x,y=pose.y-Math.sin(progress*Math.PI)*arc/(this.verticalScale||1),angle=Math.atan2((end.y-start.y)*(this.verticalScale||1)-Math.PI*arc*Math.cos(progress*Math.PI),end.x-start.x);
    pose.renderedPoint={x,y};
    const visual=combatVisual(source?.card||CARDS[p.key]),motion=projectileVisual(p.style,this.t,this.reduced),size=p.key==='nuzleaf'?Math.max(16,visual.projectile):visual.projectile;
    const fireHead=p.key==='charizard',art=p.key==='nuzleaf'?'needle':p.art||motion.name;
    if(arc>25){c.save();c.globalAlpha=.18;ellipse(c,'#233b31',p.x,p.y,Math.max(4,size*.25),2);c.restore();}
    if(fireHead){
      const fireAge=Math.max(0,pose.travelled)/Math.max(1,p.speed||240),fireSize=size;
      const mouth=source&&this.visualEmission(source),available=mouth?Math.hypot(x-mouth.x,(y-mouth.y)*(this.verticalScale||1)):pose.travelled;
      for(let i=this.reduced?1:2;i>0;i--){const shift=Math.min(available*.7,i*8),tailSize=Math.max(10,fireSize-i*4);c.save();c.globalAlpha*=i===1?.6:.32;
        this.combatArt(c,'fireTrail',x-Math.cos(angle)*shift,y-Math.sin(angle)*shift/(this.verticalScale||1),tailSize,angle-Math.PI/2,tailSize,{frame:this.reduced?5:undefined,frames:[3,4,5,6,5,4],fps:12,age:fireAge+i*.04,trim:true});c.restore();}
      this.projectileHead(c,()=>this.fireBolt(c,x,y,fireSize,angle,fireAge));return;
    }
    this.projectileHead(c,()=>this.combatArt(c,art,x,y,size,art==='needle'?0:['rock','egg'].includes(p.style)?(this.reduced?0:progress*2):['leaf','ember'].includes(p.style)?angle:0,size,{direction:directionRow(end.x-x,end.y-y),age:motion.age,fps:motion.fps,frame:motion.frame,frames:motion.frames,trim:true}));
    if(!this.reduced&&!fireHead&&p.style!=='coin'&&p.style!=='rock'){
      const vertical=this.verticalScale||1,color=p.art==='petalShot'?'#f5c3df':{ember:'#f6c580',hydro:'#a5e6f2',bubble:'#c4eef1',ice:'#dbffff',poison:'#d5a3df',powder:'#d5a3df',shadow:'#b99add',leaf:'#e2edb1',psychic:'#d5baff'}[p.style]||'#e6eac9';
      const length=Math.min(p.travelled,Math.max(16,size*1.5)),bend=Math.sin(progress*Math.PI)*Math.min(8,arc*.05);
      c.save();c.lineCap='round';
      for(let i=3;i>0;i--){const a=i/3,b=(i-1)/3;c.globalAlpha=.38*(1-a*.65);c.strokeStyle=color;c.lineWidth=Math.max(1,size*.14*(1-a*.7));c.beginPath();c.moveTo(x-Math.cos(angle)*length*a,y-(Math.sin(angle)*length*a+bend*a*a)/vertical);c.lineTo(x-Math.cos(angle)*length*b,y-(Math.sin(angle)*length*b+bend*b*b)/vertical);c.stroke();}
      c.restore();
    }
  }
  projectileHead(c,draw){
    // Keep the compact moving head distinct from troop HUD bars. Trails,
    // beams, ground rollers and impacts remain in their existing world pass.
    if(this.projectileHeadQueue)this.projectileHeadQueue.push(draw);else draw();
  }
  fireBolt(c,x,y,size,angle,age){
    this.combatArt(c,'emberShot',x,y,size*1.25,angle-Math.PI/2,size*1.25,{frame:flameFrame(age,this.reduced),trim:true});
    const phase=this.reduced?.4:age,r=size*.39,wave=Math.sin(phase*24)*r*.12;
    c.save();c.translate(x,y);c.scale(1,1/(this.verticalScale||1));c.rotate(angle);
    c.beginPath();c.moveTo(r,0);
    c.bezierCurveTo(r*.8,-r*.85,-r*.3,-r-wave,-r*.8,-r*.62);
    c.lineTo(-r*1.35,-r*.8+wave);c.lineTo(-r,0);c.lineTo(-r*1.25,r*.7-wave);
    c.bezierCurveTo(-r*.2,r+wave,r*.8,r*.8,r,0);
    c.closePath();c.fillStyle='#e45b20';c.strokeStyle='#64302b';c.lineWidth=2;c.lineJoin='round';c.fill();c.stroke();
    ellipse(c,'#ffb333',r*.05,0,r*.68,r*.64);
    ellipse(c,'#fff0a1',r*.26,-r*.03+wave*.25,r*.38,r*.41);
    c.restore();
  }
  electricProjectile(c,p){
    if((this.gameElapsed??0)+1e-7<(p.flyAt||0))return;
    const destination=p.target||p.lastPoint;if(!destination)return;
    const dx=destination.x-p.x,dy=destination.y-p.y,distance=Math.hypot(dx,dy),direction={x:distance?dx/distance:0,y:distance?dy/distance:0};
    const pose=this.projectilePose({...p,dx:direction.x,dy:direction.y,totalDistance:(p.travelled||0)+distance},p,true),progress=Math.min(1,pose.travelled/Math.max(1,p.totalDistance)),vertical=this.verticalScale||1;
    const source=this.frameActors.get(p.chainFromId||p.sourceId),target=this.frameActors.get(p.target?.id);
    const start=this.projected({x:p.startX+(p.liftX||0),y:p.startY+(p.liftY||0)},source||{x:p.startX,y:p.startY});
    const end=this.projected({x:destination.x,y:destination.y+(p.endLiftY??-15)},target||destination);
    const x=pose.x+(start.x-p.startX)*(1-progress)+(end.x-destination.x)*progress,y=pose.y+(start.y-p.startY)*(1-progress)+(end.y-destination.y)*progress;
    const size=Math.max(16,Math.min(24,combatVisual(p.card||CARDS[p.key]).projectile*1.2)),length=Math.min(18,pose.travelled);
    if(!this.reduced&&length>0){c.save();c.globalAlpha*=.45;c.strokeStyle='#fff3a3';c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(x-direction.x*length,y-direction.y*length/vertical);c.lineTo(x,y);c.stroke();c.restore();}
    this.combatArt(c,'electricHop',x,y,size,0,size,{direction:directionRow(direction.x,direction.y),age:this.reduced?0:this.t,fps:12});
  }
  drawMissiles(c,e){
    const progress=1-e.life/e.max;
    for(const point of missileFormation(e,e.radius,e.wave)){
      c.save();c.globalAlpha*=Math.max(0,1-progress);
      this.combatArt(c,'puff',point.x,point.y,15,0,15,{progress:this.reduced?.45:progress});c.restore();
    }
  }
  entryEffect(c,e,progress){
    const radius=e.radius||60,age=e.max-e.life;
    if(e.style==='lightning'){
      this.battleArt.beam(c,'lightning',{x:e.x,y:e.y-140/(this.verticalScale||1)},{x:e.x,y:e.y},24,age);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;this.combatArt(c,'lightning',e.x+Math.cos(a)*radius*.55,e.y+Math.sin(a)*radius*.55,40,0,40,{age});}
    }else this.combatArt(c,'ice',e.x,e.y,radius*2,0,radius*2,{progress});
  }
  livingFire(c,x,y,size,angle,age){
    const vertical=this.verticalScale||1,phase=this.reduced?.4:age;
    // A dense hot body remains visible while the native flame silhouettes
    // change around it. Their transparent centers must not empty the fireball.
    c.save();c.translate(x,y);c.scale(1,1/vertical);c.rotate(angle);
    ellipse(c,'#c34520',0,0,size*.28,size*.25);
    ellipse(c,'#f08224',size*.025,-size*.025,size*.23,size*.205);
    ellipse(c,'#ffd15a',size*.07,-size*.025,size*.15,size*.14);
    const turn=phase*12;
    ellipse(c,'#fff1ae',Math.cos(turn)*size*.075,Math.sin(turn)*size*.065,size*.085,size*.075);
    c.restore();
    this.combatArt(c,'emberShot',x,y,size*1.35,angle-Math.PI/2,size*1.35,{frame:flameFrame(age,this.reduced),trim:true});
    c.save();c.globalAlpha*=.6;
    this.combatArt(c,'emberShot',x+Math.cos(angle)*size*.08,y+Math.sin(angle)*size*.08/(this.verticalScale||1),size*.8,angle-Math.PI/2,size*.8,{frame:flameFrame(age,this.reduced,3),trim:true});c.restore();
  }
  fireWheel(c,pose,reduced=this.reduced,opacity=1){
    const vertical=this.verticalScale||1;
    drawFireWheel(c,pose,(name,x,y,size,angle,options)=>this.combatArt(c,name,x,y,size,angle,size*vertical,options),{vertical,reduced,opacity,halfWidth:pose.halfWidth??CARDS.log.splash});
  }
  effectTarget(effect){
    const actor=this.frameActors.get(effect.targetId);
    return actor?{x:actor.x,y:actor.y-('king'in actor?27:actor.card?.structure?structureLift(actor.card)+20:actor.card?.flying?27:15)/(this.verticalScale||1)}:effect.to;
  }
  vineLash(c,from,to,progress){
    const vertical=this.verticalScale||1,dx=to.x-from.x,dy=(to.y-from.y)*vertical,length=Math.hypot(dx,dy);
    if(length<1)return;
    // Vine hits at release. Show that whole connection immediately; only the
    // recovery retracts. A growing projectile would suggest a delayed hit.
    const phase=this.reduced?.16:progress,recoil=Math.max(0,(phase-.45)/.55);
    const reach=length*(1-.85*recoil*recoil),bow=Math.min(18,length*.18)*(this.reduced?.4:Math.cos(phase*Math.PI*1.4));
    const point=t=>({x:reach*t,y:4*t*(1-t)*bow});
    const leaf=(x,y,angle,size)=>{
      c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(size*.2,-size*.9,size,0);c.quadraticCurveTo(size*.35,size*.4,0,0);
      c.fillStyle='#86b44b';c.strokeStyle='#253e2d';c.lineWidth=2.5;c.fill();c.stroke();
      line(c,'#e0edaa',1,0,size*.7,-size*.12,1.2);c.restore();
    };
    c.save();c.translate(from.x,from.y);c.scale(1,1/vertical);c.rotate(Math.atan2(dy,dx));c.lineCap='round';c.lineJoin='round';
    const stem=offset=>{c.beginPath();c.moveTo(0,offset);c.quadraticCurveTo(reach*.5,bow*2+offset,reach,offset);};
    stem(0);c.strokeStyle='#233b2d';c.lineWidth=8;c.stroke();
    stem(-.5);c.strokeStyle='#78a442';c.lineWidth=4.8;c.stroke();
    stem(-1.5);c.strokeStyle='#d6e79b';c.lineWidth=1.3;c.stroke();
    for(const[t,side]of[[.08,-1],[.32,1],[.65,-1]]){
      const p=point(t),slope=Math.atan2(4*(1-2*t)*bow,reach);
      leaf(p.x,p.y,slope+side*.9,8+2*t);
    }
    const contact=Math.max(0,1-phase/.65);
    if(contact>0){
      c.save();c.globalAlpha*=contact;
      for(const side of[-1,1]){
        const spread=7+phase*24;leaf(length+side*spread*.25,side*spread,side*1.1,8);
        line(c,'#28422f',length-side*6,-side*6,length+side*6,side*6,4.5);
        line(c,'#fff1b9',length-side*6,-side*6,length+side*6,side*6,2);
      }
      c.restore();
    }
    c.restore();
  }
  areaImpact(c,e,progress){
    const radius=e.radius,fade=1-progress,color=e.color||'#dfdab0',vertical=this.verticalScale||1;
    c.save();
    const petals=e.art==='petalShot';
    softDisc(c,e.x,e.y,radius,{color:petals?'#ed8da9':color,opacity:(petals?.5:.27)*Math.max(0,1-progress*1.45)});
    c.beginPath();c.arc(e.x,e.y,radius,0,Math.PI*2);c.clip();
    if(petals){
      softDisc(c,e.x,e.y,radius*.6,{color:'#fff2cf',opacity:.32*Math.max(0,1-progress*2)});
      const count=this.reduced?6:10,size=Math.max(15,Math.min(23,radius*.4)),spread=this.reduced?.74:.2+.72*Math.sin(progress*Math.PI/2);
      for(let i=0;i<count;i++){
        const angle=i*2.39996+(this.reduced?0:progress*.65),r=Math.sqrt((i+.5)/count)*radius*spread;
        const lift=this.reduced?3:Math.sin(progress*Math.PI)*(5+i%3*3);
        c.save();c.globalAlpha*=Math.min(1,fade*1.35);
        this.combatArt(c,'petalShot',e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r-lift/vertical,size,this.reduced?angle:angle+progress,size,{age:i*.1+progress*.6,trim:true});
        c.restore();
      }
    }else if(['leaf','poison','powder','bite','slash'].includes(e.style)){
      const count=this.reduced?4:8,size=Math.min(17,Math.max(10,radius*.27)),spread=this.reduced?.72:.15+Math.sin(Math.min(1,progress)*Math.PI/2)*.75;
      for(let i=0;i<count;i++){
        const angle=i*2.39996+(e.style==='leaf'?progress*.55:0),r=Math.sqrt((i+.5)/count)*radius*spread;
        c.save();c.globalAlpha*=fade;this.combatArt(c,e.art,e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r-Math.sin(progress*Math.PI)*12/vertical,size,this.reduced?0:angle+progress,size,{age:i*.09+progress*.5,trim:true});c.restore();
      }
    }else if(e.style==='hyperbeam'){
      this.combatArt(c,'hyperImpact',e.x,e.y,radius*2,0,radius*2,{progress:this.reduced?.4:progress,blend:!this.reduced});
    }else{
      const count=this.reduced?4:7,size=Math.min(32,Math.max(16,radius*.4)),spread=this.reduced?.65:Math.sin(progress*Math.PI/2)*.8;
      this.combatArt(c,e.art,e.x,e.y-6/vertical,Math.min(72,radius*1.2),0,Math.min(72,radius*1.2),{progress:this.reduced?.45:progress,trim:true});
      for(let i=0;i<count;i++){
        const angle=i*Math.PI*2/count,r=radius*spread;
        const art=e.style==='ember'?'flame':e.style==='rock'||e.style==='slam'?'dust':e.art;
        c.save();c.globalAlpha*=fade*.65;this.combatArt(c,art,e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r-Math.sin(progress*Math.PI)*8/vertical,size,0,size,{progress:this.reduced?.45:progress,trim:true});c.restore();
      }
    }
    c.restore();
    if(e.impactX!==undefined){c.save();c.globalAlpha*=Math.max(0,1-progress*2);this.combatArt(c,e.style==='leaf'?'impact':e.art,e.impactX,e.impactY,Math.min(32,Math.max(18,radius*.45)),0,Math.min(32,Math.max(18,radius*.45)),{progress:this.reduced?.45:progress,trim:true});c.restore();}
  }
  drawEffects(c,dt){
    for(const pose of this.visualFlights?.values()||[])if(pose.kind==='rollingFire'&&!pose.ended&&pose.at<this.t-1e-7){
      pose.ended=true;
      this.effects.push({kind:'rollingFireEnd',x:pose.x,y:pose.endY,spin:pose.spin,age:pose.age,direction:pose.direction,halfWidth:pose.halfWidth,life:.28,max:.28});
    }
    for(const e of this.effects){
      if(['windup','charge'].includes(e.kind)&&e.seq!==undefined&&(this.frameActors?.get(e.actor.id)||e.actor).attackSeq!==e.seq){e.life=0;continue;}
      let activeDt=dt;
      if(e.delay>0){activeDt=Math.max(0,dt-e.delay);e.delay-=dt;if(e.delay>0)continue;}
      e.life-=activeDt;if(e.life<=0)continue;
      const progress=1-e.life/e.max,age=e.max-e.life;
      c.save();c.globalAlpha=Math.min(1,e.life/Math.min(.2,e.max));
      if(e.kind==='spikeContact'){
        const vertical=this.verticalScale||1,material=spikeMaterial(this.canvas?.ownerDocument||globalThis.document,e.radius,vertical);
        if(material){const rise=this.reduced?0:Math.sin(progress*Math.PI)*3;c.drawImage(material.node,e.x-9,e.y-(14+rise)/vertical,18,18/vertical);}
      }else if(e.kind==='rollingFireEnd'){
        this.fireWheel(c,{...e,age:e.age+age,spin:e.spin+(this.reduced?0:e.direction*progress*.25)},this.reduced,1-progress);
      }else if(e.kind==='rollingFireHit'){
        this.combatArt(c,'dust',e.x,e.y+3,28,0,16,{progress});
        this.combatArt(c,'emberShot',e.x,e.y-(5+progress*10)/(this.verticalScale||1),25,0,25,{frame:this.reduced?5:Math.min(8,4+Math.floor(progress*5)),trim:true});
      }else if(e.kind==='structureDeath'){
        const art=STRUCTURE_ART[e.art],vertical=this.verticalScale||1;
        c.save();c.translate(e.x,e.y+art.baseOffset/vertical);if(!this.reduced)c.scale(1,1-progress*.7);
        this.battleArt.structure(c,e.art,e.team,0,0,art.width,vertical);c.restore();
        if(!this.reduced&&progress>.2)for(let i=0;i<3;i++)this.combatArt(c,'rubble',e.x+(i-1)*16,e.y+2/vertical,16,0,16,{frame:5+i});
      }
      else if(e.kind==='golemDeath')this.sprite(c,{...e.unit,pushHurt:e.life},true);
      else if(e.kind==='missiles')this.drawMissiles(c,e);
      else if(e.kind==='entry')this.entryEffect(c,e,progress);
      else if(e.kind==='muzzleFlame'){
        const from=this.effectSource(e),to=this.visualProjectiles.get(e.attackId)?.renderedPoint||this.effectTarget(e)||e.to;
        if(from&&to){
          const dx=to.x-from.x,dy=(to.y-from.y)*(this.verticalScale||1),distance=Math.hypot(dx,dy),length=Math.min(e.key==='charizard'?50:30,distance);
          if(e.key==='charizard'){
            const angle=Math.atan2(dy,dx),length=Math.min(38,distance);
            if(length>2){c.save();c.translate(from.x,from.y);c.scale(1,1/(this.verticalScale||1));c.rotate(angle);this.combatArt(c,'vfxFireJet',0,0,length,0,20*(this.verticalScale||1),{age:.18+age,frames:[3,4,5,6,7,8,9,10],fps:16,frame:this.reduced?6:undefined,anchor:'pivot'});c.restore();}
          }else if(length>2){c.save();c.translate(from.x,from.y);c.rotate(Math.atan2(dy,dx));this.combatArt(c,'vfxFireJet',0,0,length,0,Math.min(17,8+length*.45),{age:this.reduced?.4:age,anchor:'pivot',blend:!this.reduced});c.restore();}
        }
      }
      else if(e.kind==='areaImpact')this.areaImpact(c,e,progress);
      else if(e.kind==='artImpact'){
        const size=e.visualSize??Math.max(24,Math.min(160,(e.radius||30)*1.7));
        this.combatArt(c,e.art,e.x,e.y,size,0,size,{progress:this.reduced?.45:progress});
      }else if(e.kind==='beam'||e.kind==='counter'){
        const from=this.effectSource(e),to=this.effectTarget(e),name=e.style==='lightning'?'lightning':'psychic';
        if(!from||!to){c.restore();continue;}
        if(e.style==='vine'){
          this.vineLash(c,from,to,progress);
        }else{
          if(e.piercing){c.save();c.globalAlpha*=.22;this.battleArt.beam(c,name,from,to,e.width,age);c.restore();}
          this.battleArt.beam(c,name,from,to,e.kind==='counter'?8:combatVisual(this.frameActors.get(e.sourceId)?.card||CARDS[e.key]).beam,age);
        }
      }else if(e.kind==='windup'||e.kind==='charge'){
        const actor=this.frameActors.get(e.actor.id);
        if(!actor){c.restore();continue;}
        if(actor.hp<=0||actor.stun>0||actor.attack<=0||e.seq!==undefined&&actor.attackSeq!==e.seq){c.restore();continue;}
        const from=this.visualEmission(actor);
        const size=combatVisual(actor.card).charge;
        const art={slam:'dust',horn:'horn',eruption:'flame',lightning:'lightning',flame:'flame',ember:'emberShot',hydro:'hydroShot',bubble:'bubble',ice:'snow',leaf:'leaf',shadow:'shadow',poison:'poison',powder:'poison',egg:'egg',song:'songShot',magnet:'lightningHead'}[e.style]||'psychic';
        const chargeSize=size*(e.kind==='charge'?.4+.35*progress:1);
        this.combatArt(c,art,from.x,from.y,chargeSize,0,chargeSize,{age:age*.6,trim:true});
      }else if(e.kind==='impact'){
        this.combatArt(c,e.style==='song'?'song':'impact',e.x,e.y,Math.max(30,(e.radius||18)*2),0,40,{progress});
      }else if(e.kind==='flame'){
        const from=this.effectSource(e),to=this.effectTarget(e);
        if(!from||!to){c.restore();continue;}
        const dx=to.x-from.x,dy=(to.y-from.y)*(this.verticalScale||1),distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
        const groundTarget=this.frameActors.get(e.targetId)||e.groundTo,groundDistance=groundTarget&&e.groundFrom?Math.hypot(groundTarget.x-e.groundFrom.x,groundTarget.y-e.groundFrom.y):distance;
        const length=(e.length||Math.min(190,distance+10))*distance/Math.max(1,groundDistance),head=Math.min(1,age*(e.speed||300)/(e.length||length)),body=combatVisual(this.frameActors.get(e.sourceId)?.card||CARDS[e.key]).body;
        if(e.cone&&e.groundFrom){
          const origin=e.groundFrom;c.save();c.globalAlpha*=.12*(1-progress);c.fillStyle='#f4b563';c.beginPath();c.moveTo(origin.x,origin.y);c.arc(origin.x,origin.y,length,e.angle-e.cone,e.angle+e.cone);c.closePath();c.fill();c.restore();
        }
        const count=this.reduced?3:7;
        for(let i=0;i<count;i++){
          const phase=i/Math.max(1,count-1)*head,size=Math.min(16,body*.25)+phase*Math.min(24,body*.4);
          const spread=e.cone?(i%3-1)*e.cone*.8:0,heading=angle+spread;
          const x=from.x+Math.cos(heading)*length*phase,y=from.y+Math.sin(heading)*length*phase/(this.verticalScale||1);
          this.combatArt(c,'flame',x,y,size,angle,size,{age:age+i*.07,fps:9,trim:true});
        }
      }else if(e.kind==='melee'){
        const to=this.effectTarget(e),from=this.effectSource(e)||e.from;
        const name={punch:'impact',dash:'impact',slam:'dust',eruption:'explosion'}[e.style]||e.style;
        const card=this.frameActors.get(e.sourceId)?.card||CARDS[e.key],size=combatVisual(card).impact*(e.charged?1.2:card?.windup>=.6?1.35:1);
        const angle=Math.atan2((to.y-from.y)*(this.verticalScale||1),to.x-from.x);
        if(['slash','horn','dash'].includes(e.style)&&!this.reduced&&progress<.5){c.save();c.globalAlpha*=.45*(1-progress*2);this.combatArt(c,'slash',(from.x+to.x)/2,(from.y+to.y)/2,size*.85,angle+Math.PI/4,size*.65,{progress:progress*2,trim:true});c.restore();}
        this.combatArt(c,name,to.x,to.y,size,0,size,{progress,direction:directionRow(to.x-from.x,to.y-from.y)});
      }else if(e.kind==='spell'){
        this.combatArt(c,'snow',e.x,e.y,e.radius*2.4,0,e.radius*2.4,{direction:0,progress});
      }else if(e.kind==='blink'){
        for(const p of[e.from,e.to])this.combatArt(c,'shadow',p.x,p.y-12,48,0,48,{progress});
      }
      c.restore();
    }
    this.effects=this.effects.filter(e=>e.life>0);
    this.drawNumbers(c,dt);c.globalAlpha=1;
  }
  drawWater(c){
    const bank=this.battleArt.images.get('assets/battle/riverbank-v2.webp');
    const left=this.worldBounds?.left??0,right=this.worldBounds?.right??W,width=right-left,height=RIVER.bottom-RIVER.top;
    if(bank){
      const edge=4;
      c.drawImage(bank,0,0,bank.width,edge,left,RIVER.top-edge,width,edge);
      c.drawImage(bank,0,edge,bank.width,bank.height-edge*2,left,RIVER.top,width,height);
      c.drawImage(bank,0,bank.height-edge,bank.width,edge,left,RIVER.bottom,width,edge);
    }else rect(c,'#578c8b',left,RIVER.top,width,height);
    const frame=this.reduced?0:Math.floor(this.t*3)%10;
    c.save();c.beginPath();c.rect(left,RIVER.top,width,height);c.clip();
    c.globalAlpha=.1;c.filter='saturate(.3)';
    for(let x=Math.floor(left/216)*216;x<right;x+=216)this.battleArt.tile(c,'water',0,frame*144+32,216,24,x,RIVER.top,216,height);
    c.restore();for(const x of LANES)this.bridge(c,x);
  }
  drawPlacement(c, game) {
    const key=this.selection,card=CARDS[key],team=this.placementTeam||0;
    if(!card||(card.spell||this.placementWhenPaused)&&!this.pointer||game.state!=='playing'&&!(this.placementWhenPaused&&game.state==='paused'))return;
    c.save();
    if(this.selection){
      // The quiet grid marks legal cells without outlining blocked tower holes.
      const cells=Array.from({length:DEPLOY_GRID.rows},(_,row)=>Array.from({length:DEPLOY_GRID.columns},(_,col)=>game.canDeploy(team,key,DEPLOY_GRID.left+col*TILE+TILE/2,DEPLOY_GRID.top+row*TILE+TILE/2)));
      if(!card.spell||card.rolling&&key!=='log')for(let row=0;row<DEPLOY_GRID.rows;row++)for(let col=0;col<DEPLOY_GRID.columns;col++){
        const x=DEPLOY_GRID.left+col*TILE+TILE/2,y=DEPLOY_GRID.top+row*TILE+TILE/2;
        if(cells[row][col]){
          c.strokeStyle='#eef5d525';c.lineWidth=.65;
          c.strokeRect(x-TILE/2,y-TILE/2,TILE,TILE);
        }
      }
      if(this.tutorialSpot)text(c,'D E S P L E G Á  A C Á',300,480,'#e0ecc7aa',10,500);
    }
    if(this.tutorialSpot&&!card.spell){
      c.strokeStyle='#e6d790';c.lineWidth=2;c.setLineDash([4,4]);c.strokeRect(LANES[0]-TILE,520-TILE,TILE*2,TILE*2);c.setLineDash([]);text(c,'↓',LANES[0],482,'#eee2a3',24);
    }
    const p=this.pointer;
    if(p){
      const placement=game.resolveDeployment(team,key,p.x,p.y),point=placement||p;
      const valid=!!placement&&game.energy[team]>=card.cost;
      const color=valid?'#e9dc9e':'#e7947b';
      if(!card.spell&&placement&&this.selection&&Math.hypot(point.x-p.x,point.y-p.y)>TILE/2){
        c.strokeStyle=color;c.lineWidth=2;c.setLineDash([3,5]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(point.x,point.y);c.stroke();c.setLineDash([]);ellipse(c,color,p.x,p.y,3,3);
      }
      if(card.rolling&&key!=='log')travelGuide(c,point.x,point.y,card.splash,card.travelDistance,team,valid);
      if(!card.spell&&placement){
        const ranged=(card.squad?card.squad.map(k=>CARDS[k]):[card]).filter(isRangedAttack),range=Math.max(...ranged.map(member=>member.range));
        if(!card.passive&&ranged.length){
        softDisc(c,point.x,point.y,range,{color:'#fff6df',opacity:.2});
        }
        for(const enemy of game.deploymentThreats(team,key,point.x,point.y)){
          const height='king'in enemy?(enemy.king?106:96):this.bodyHeight(enemy,23)+25;
          const bx=enemy.x+18,by=Math.max((this.worldBounds?.top??0)+22,enemy.y-height/(this.verticalScale||1));
          ellipse(c,'#ef554944',enemy.x,enemy.y,enemy.radius+7,9);
          placementWarning(c,bx,by,this.verticalScale||1);
        }
      }
      if(card.spell)this.spellPlacement(c,key,card,point,team,valid);
      if(!card.spell&&valid&&this.selection){
        const positions=game.deploymentPositions(team,key,point.x,point.y);
        for(const [index,position]of positions.entries()){
          cellGuide(c,position.x,position.y,TILE,valid);
          if(!card.spell){const previewCard=CARDS[card.squad?.[index]]||card;c.globalAlpha=.55;this.sprite(c,{...position,card:previewCard,preview:true,team,dx:0,dy:team?1:-1,anim:this.t,id:-1-index,lifetime:card.lifetime},true);c.globalAlpha=1;}
        }
      }
      if(!valid&&!card.spell){line(c,color,p.x-5,p.y-5,p.x+5,p.y+5,2);line(c,color,p.x+5,p.y-5,p.x-5,p.y+5,2);}
    }
    c.restore();
  }
  spellPlacement(c,key,card,point,team,valid){
    if(!card.rolling&&card.splash>0)areaGuide(c,point.x,point.y,card.splash,{team,valid,color:card.color,emphasis:true});
    else cellGuide(c,point.x,point.y,TILE,valid,true);
    if(key==='log'){
      c.save();c.translate(point.x,point.y);c.scale(1,24/88);
      softDisc(c,0,0,44,{color:valid?'#fff0b5':'#ef9881',opacity:valid?.48:.4});c.restore();
    }
    // Only the held location is illustrated. Nothing is stored for after release.
    c.save();c.globalAlpha*=valid?.6:.32;
    if(key==='log')this.fireWheel(c,{x:point.x,y:point.y,age:.4,spin:.35,direction:team?1:-1,halfWidth:card.splash},true);
    else if(card.spawnOnImpact&&spellVisualProfile(key)?.flight==='capsule')this.capsule(c,point.x,point.y-22,42,0,0);
    c.restore();
  }
  visualField(field,dt){
    if(!field.duration)return field;
    const cache=this.visualFields??=new Map(),key=field.id??`${field.key}:${field.sourceId}:${field.x}:${field.y}`;
    const logical=Math.max(0,field.duration-field.life);let pose=cache.get(key);
    if(!pose)pose={age:logical};
    else pose.age=Math.max(logical,Math.min(logical+1/15,field.duration,pose.age+Math.max(0,dt)));
    pose.at=this.t;cache.set(key,pose);
    return{...field,visualAge:pose.age,life:Math.max(0,Math.min(field.life,field.duration-pose.age))};
  }
  field(c,f,front=false){
    const radius=f.radius,age=f.visualAge??(f.duration?Math.max(0,f.duration-f.life):this.t);
    c.save();c.globalAlpha=Math.min(1,f.life/(f.key==='whirlpool'?.12:.4));
    if(!front&&f.key!=='spikes')softDisc(c,f.x,f.y,radius,{color:CARDS[f.key]?.color||'#b8cad1',opacity:f.key==='whirlpool'?.24:.1});
    if(f.key==='stealthRock'){
      for(let i=0;i<9;i++){
        const a=i*2.39996,r=Math.sqrt((i+.5)/9)*radius*.83,x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;
        if((Math.sin(a)>0)!==front)continue;
        this.combatArt(c,'rock',x,y-(this.reduced?8:8+Math.sin(age*2+i)*3),20+i%3*3,0,20+i%3*3,{frame:i%2});
      }
    }else if(f.key==='nightmare'){
      this.softNightmare(c,f,front,age);
    }else if(!front){
      if(f.key==='whirlpool'){
        this.softWhirlpool(c,f,age);
      }else if(f.key==='spikes'){
        const material=spikeMaterial(this.canvas?.ownerDocument||globalThis.document,radius,this.verticalScale||1);
        if(material)c.drawImage(material.ground,f.x-material.origin,f.y-material.origin);
        else for(let i=0;i<15;i++){const a=i*2.39996,r=Math.sqrt((i+.5)/15)*radius*.85;this.combatArt(c,'spikes',f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,22,0,22,{frame:i%3});}
      }else if(f.key==='earthquake'){
        this.earthquake(c,f,age);
      }else{
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;this.combatArt(c,f.style==='psychic'?'psychic':'poison',f.x+Math.cos(a)*radius*.4,f.y+Math.sin(a)*radius*.4,35,0,35,{age:this.reduced?0:age});}
      }
    }
    if(!front){
      if(f.key){c.save();c.translate(f.x,Math.min(H-12,f.y+radius+8));c.scale(1,1/(this.verticalScale||1));pixelMeter(c,-18,0,36,f.life/f.duration,CARDS[f.key].color);c.restore();}
    }c.restore();
  }
  softNightmare(c,field,front,age){
    const radius=field.radius,size=Math.ceil(radius*2),surface=this.fieldSurface??=this.canvas.ownerDocument.createElement('canvas');
    if(surface.width!==size||surface.height!==size){surface.width=size;surface.height=size;}
    const portal=surface.getContext('2d');portal.setTransform(1,0,0,1,0,0);portal.globalAlpha=1;portal.globalCompositeOperation='source-over';portal.clearRect(0,0,size,size);portal.imageSmoothingEnabled=false;
    this.battleArt.draw(portal,front?'nightmareFront':'nightmareBack',size/2,size/2,radius*2.4,radius*2.4,{age:this.reduced?.3:Math.max(0,age),blend:!this.reduced});
    // Both opaque halves belong to the ground beneath the actors. Above them,
    // screen compositing keeps only the purple wisps; black cannot hide a body.
    if(!front)this.battleArt.draw(portal,'nightmareFront',size/2,size/2,radius*2.4,radius*2.4,{age:this.reduced?.3:Math.max(0,age),blend:!this.reduced});
    if(!front){portal.globalCompositeOperation='source-atop';portal.globalAlpha=.26;portal.fillStyle='#5d3d7e';portal.fillRect(0,0,size,size);portal.globalAlpha=1;portal.globalCompositeOperation='source-over';}
    const fade=portal.createRadialGradient(size/2,size/2,0,size/2,size/2,radius);
    fade.addColorStop(0,'#fff');fade.addColorStop(.48,'#fff');fade.addColorStop(.72,'#ffffff9c');fade.addColorStop(1,'#ffffff00');
    portal.globalCompositeOperation='destination-in';portal.fillStyle=fade;portal.fillRect(0,0,size,size);portal.globalCompositeOperation='source-over';
    c.save();c.globalAlpha*=front?.55:.68;if(front)c.globalCompositeOperation='screen';
    c.drawImage(surface,field.x-radius,field.y-radius,radius*2,radius*2);c.restore();
  }
  softWhirlpool(c,field,age){
    const radius=field.radius,size=Math.ceil(radius*2),surface=this.fieldSurface??=this.canvas.ownerDocument.createElement('canvas');
    if(surface.width!==size||surface.height!==size){surface.width=size;surface.height=size;}
    const water=surface.getContext('2d');water.setTransform(1,0,0,1,0,0);water.globalAlpha=1;water.globalCompositeOperation='source-over';water.clearRect(0,0,size,size);water.imageSmoothingEnabled=false;
    const phase=whirlpoolPhase(field,age,this.reduced);
    water.filter='saturate(.65) brightness(.96)';water.globalAlpha=.76;
    this.battleArt.draw(water,'vfxWhirlpool',size/2,size/2,radius*2,radius*2,{progress:phase.frame/19,trim:true,stretch:true,blend:!this.reduced});
    water.filter='none';water.globalAlpha=1;
    water.save();water.translate(size/2,size/2);
    const fade=water.createRadialGradient(0,0,0,0,0,radius);
    fade.addColorStop(0,'#fff');fade.addColorStop(.42,'#fff');fade.addColorStop(.65,'#ffffff9c');fade.addColorStop(.86,'#ffffff32');fade.addColorStop(1,'#ffffff00');
    water.globalCompositeOperation='destination-in';water.fillStyle=fade;water.fillRect(-size,-size,size*2,size*2);water.restore();
    c.drawImage(surface,field.x-radius,field.y-radius,radius*2,radius*2);
  }
  earthquake(c,field,age){
    const radius=field.radius,phase=earthquakePhase(field,age,this.reduced),vertical=this.verticalScale||1;
    c.save();c.beginPath();c.arc(field.x,field.y,radius,0,Math.PI*2);c.clip();
    softDisc(c,field.x,field.y,radius,{color:'#8c7956',opacity:.18});
    c.translate(field.x+phase.jitter,field.y);
    for(const points of earthquakeFissures(radius,phase.growth)){
      if(points.length<2)continue;
      const banks=points.map(([x,y],index)=>{
        const before=points[Math.max(0,index-1)],after=points[Math.min(points.length-1,index+1)],dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1;
        return{x,y,nx:-dy/length,ny:dx/length,taper:1-index/(points.length-1)*.9};
      });
      const split=(width,offset)=>{
        c.beginPath();
        for(let side=1;side>=-1;side-=2){
          const edge=side===1?banks:banks.slice().reverse();
          edge.forEach(({x,y,nx,ny,taper},index)=>{
            const px=x+nx*width*taper*side,py=y+ny*width*taper*side+offset;
            side===1&&index===0?c.moveTo(px,py):c.lineTo(px,py);
          });
        }
        c.closePath();c.fill();
      };
      c.save();c.globalAlpha*=.78;c.fillStyle='#aa8f5e';split(4.5+phase.pulse*.5,1.1);
      c.fillStyle='#453c2e';split(2.5+phase.pulse*.7,0);c.restore();
    }
    const beat=age%(field.fieldTick||1),sites=[[-.65,.32],[.08,.68],[.62,.36],[.58,-.35],[-.1,-.7],[-.57,-.33]];
    for(let i=0;i<sites.length;i++){
      const elapsed=this.reduced?.3:beat-(i%3)*.025;
      if(elapsed<0||elapsed>.7)continue;
      const progress=elapsed/.7,envelope=Math.sin(progress*Math.PI),[sx,sy]=sites[i],x=sx*radius,y=sy*radius;
      c.save();c.globalAlpha*=this.reduced?.32:.24+envelope*.4;
      c.save();c.translate(x,y);c.scale(1,.58);
      softDisc(c,0,0,14+envelope*16,{color:'#c3b38d',opacity:.68});c.restore();
      const lift=this.reduced?0:envelope*(5+phase.pulse*4)/vertical;
      this.combatArt(c,'vfxDebris',x,y-lift,30+envelope*5,0,27,{progress:.15+progress*.75,anchor:'pivot',blend:!this.reduced});c.restore();
      c.save();c.globalAlpha*=this.reduced?.45:(1-progress)*.85;
      for(let chip=0;chip<3;chip++){
        const travel=this.reduced?.3:progress,angle=i*1.73+chip*2.4,distance=travel*(10+chip*5),size=chip===1?3.4:2.6;
        const px=x+Math.cos(angle)*distance,py=y+Math.sin(angle)*distance*.65-Math.sin(travel*Math.PI)*(9+chip*3)/vertical;
        c.fillStyle='#6d5c40';c.fillRect(px,py,size,size*.8);c.fillStyle='#c1ab78';c.fillRect(px,py,size,1);
      }c.restore();
    }
    c.restore();
  }
  frozen(c,actor){
    if(!(actor.freeze>0)||actor.hp<=0||actor.burrowed)return;
    const width='king'in actor?88:Math.max(40,(actor.radius||12)*3),y=actor.y-(actor.card?.flying?16:0)/(this.verticalScale||1);
    c.save();c.globalAlpha=Math.min(.75,actor.freeze*2);
    this.combatArt(c,'freeze',actor.x,y-width*.25/(this.verticalScale||1),width,0,width,{frame:0});c.restore();
  }
  fireball(c,spell){return this.spellFlight(c,spell);}
  spellFlight(c,spell){
    const kind=spellVisualProfile(spell)?.flight;
    if(!kind||kind==='none'||kind==='rolling'||spell.done||spell.delay>0&&!(spell.resolvedWaves>0))return;
    const id=spell.visualId??`${spell.team}:${spell.key}:${spell.startX}:${spell.startY}:${spell.x}:${spell.y}`;
    this.visualFlights??=new Map();let pose=this.visualFlights.get(id);
    const clock=spellFlightAge(spell);
    const fresh=!pose;if(fresh)pose={elapsed:clock,logical:clock};
    // Flight is deterministic between snapshots. Advance at display cadence,
    // but never show a hit ahead of the next authoritative unresolved wave.
    const limit=Math.max(0,spell.flightTime+(spell.resolvedWaves||0)*(spell.card.waveEvery||0)-1e-6);
    const predicted=fresh||!(this.drawDt>0)?pose.elapsed:Math.max(clock,pose.elapsed+this.drawDt);
    pose.elapsed=Math.max(pose.elapsed,Math.min(limit,predicted));
    pose.logical=clock;pose.at=this.t;this.visualFlights.set(id,pose);
    const age=this.reduced?0:pose.elapsed;
    if(kind==='needles'){
      for(const shot of missileFlightVisuals(spell,pose.elapsed,this.verticalScale||1)){
        const {x,y}=shot.point;c.save();
        if(!this.reduced){c.strokeStyle='#d6ece080';c.lineWidth=1.5;c.beginPath();c.moveTo(x-Math.cos(shot.angle)*14,y-Math.sin(shot.angle)*14/(this.verticalScale||1));c.lineTo(x,y);c.stroke();}
        this.combatArt(c,'needle',x,y,42,shot.angle-Math.PI/2,42,{direction:0,frame:shot.index%2});c.restore();
      }return;
    }
    const {point,tail,angle}=spellFlightVisual(spell,pose.elapsed,this.verticalScale||1);
    if(kind==='capsule'){const axis=Math.atan2(spell.x-spell.startX,(spell.y-spell.startY)*(this.verticalScale||1));this.capsule(c,point.x,point.y,52,this.reduced?0:age*4,axis);return;}
    if(kind==='hyper'){
      c.save();c.lineCap='round';
      for(let i=tail.length-1;i>=0;i--){c.globalAlpha=(1-i/tail.length)*.6;c.strokeStyle=i>1?'#ffbd5d':'#fff4c1';c.lineWidth=10-i*2;c.beginPath();c.moveTo(tail[i].x,tail[i].y);c.lineTo(i?tail[i-1].x:point.x,i?tail[i-1].y:point.y);c.stroke();}
      c.restore();this.combatArt(c,'hyperHead',point.x,point.y,48,angle-Math.PI/2,62,{age,frames:[5,6,7,8,9,10,9,8,7,6],fps:12,frame:this.reduced?7:undefined,trim:true,blend:!this.reduced});return;
    }
    for(let i=tail.length-1;i>=0;i--){c.save();c.globalAlpha=.45-i*.1;const size=36-i*7;
      this.combatArt(c,'fireTrail',tail[i].x,tail[i].y,size,angle-Math.PI/2,size,{age:age+i*.09,frames:[3,4,5,6,5,4],fps:12,frame:this.reduced?5:undefined,trim:true});c.restore();}
    const size=this.reduced?58:58+Math.sin(age*5)*2;
    this.livingFire(c,point.x,point.y,size,angle,age);
  }
  capsule(c,x,y,size,angle,axis=0){c.save();c.translate(x,y);c.scale(1,1/(this.verticalScale||1));drawCapsule(c,0,0,size,angle,axis,this.capsuleArt);c.restore();}
  rollingSpell(c,spell){
    if(spell.done||spell.delay>0)return;
    this.visualFlights??=new Map();
    const id='rollingFire:'+(spell.visualId??`${spell.team}:${spell.key}:${spell.startX}:${spell.startY}`);
    const previous=this.visualFlights.get(id),pose=rollingFirePose(spell,previous,this.drawDt||0);
    pose.at=this.t;this.visualFlights.set(id,pose);
    for(let i=3;i>0;i--)if(pose.travelled>i*14){
      c.save();c.globalAlpha=(1-i/4)*.45;
      this.combatArt(c,'emberShot',pose.x,pose.y-pose.direction*i*14-3,16-i*2,0,16-i*2,{frame:flameFrame(pose.age,this.reduced,i),trim:true});c.restore();
    }
    this.fireWheel(c,pose);
  }
  draw(game,dt=.016){
    this.resizeBacking();
    const c=this.ctx;this.t+=dt;this.drawDt=dt;this.gameElapsed=game.elapsed||0;this.battleArt.time=this.reduced?0:this.t;
    this.updateSpellTargets(game);
    const {width,height}=this.viewport||{width:W,height:H},projection=this.projection||arenaProjection(width,height),bounds=this.worldBounds||{left:0,top:0,right:W,bottom:H};
    c.save();c.setTransform(projection.scale*this.canvas.width/width,0,0,projection.scale*this.canvas.height/height,projection.x*this.canvas.width/width,projection.y*this.canvas.height/height);
    c.imageSmoothingEnabled=false;c.fillStyle=this.landscapePattern||'#8eaa79';c.fillRect(bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top);
    c.drawImage(this.background,this.backgroundOrigin?.x||0,this.backgroundOrigin?.y||0);this.drawWater(c);
    this.frameActors=new Map([...(game.visibleTowers??game.towers),...game.units].map(actor=>{
      const pose=this.visualActor(actor,dt);pose.logicalX=actor.x;pose.logicalY=actor.y;return[actor.id,pose];
    }));
    const fields=(game.fields||[]).map(field=>this.visualField(field,dt));
    for(const field of fields)this.field(c,field);
    for(const spell of game.spells){
      if(spell.key==='pinMissile')continue;
      if(spell.card.rolling){this.rollingSpell(c,spell);continue;}
    }
    this.towerHealthQueue=[];this.unitHealthQueue=[];this.projectileHeadQueue=[];
    const objects=[...this.frameActors.values()].sort((a,b)=>a.y-b.y);
    for(const actor of objects){if('king'in actor)this.tower(c,actor);else this.sprite(c,actor);this.frozen(c,actor);}
    for(const field of fields)if(['stealthRock','nightmare'].includes(field.key))this.field(c,field,true);
    this.drawDeployments(c,game);
    if(game.state==='ready')for(const[key,x,y,team]of[['pikachu',217,286,1],['squirtle',393,290,1],['charmander',210,554,0],['bulbasaur',390,550,0]])this.sprite(c,{id:x,card:CARDS[key],x,y,team,anim:this.t,dx:0,dy:team?1:-1},true);
    for(const p of game.projectiles)this.projectile(c,p);
    for(const spell of game.spells)if(spell.card.travelSpeed&&!spell.card.rolling)this.spellFlight(c,spell);
    this.drawEffects(c,dt);this.drawPlacement(c,game);
    if(this.healthStates.size>300){const ids=new Set(game.units.map(u=>u.id));for(const id of this.healthStates.keys())if(!ids.has(id))this.healthStates.delete(id);}
    const ids=new Set([...game.towers,...game.units].map(u=>u.id));for(const id of this.visualActors.keys())if(!ids.has(id))this.visualActors.delete(id);
    for(const id of this.attackContacts?.keys()||[])if(!ids.has(id))this.attackContacts.delete(id);
    for(const[key,pose]of this.visualProjectiles)if(this.t-pose.at>1)this.visualProjectiles.delete(key);
    for(const[key,pose]of this.visualFlights||[])if(this.t-pose.at>1)this.visualFlights.delete(key);
    for(const[key,pose]of this.visualFields||[])if(this.t-pose.at>1)this.visualFields.delete(key);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;c.globalAlpha=Math.max(0,p.life/p.max);this.combatArt(c,'dust',p.x,p.y,Math.max(8,p.size*3),0,Math.max(8,p.size*3),{progress:1-p.life/p.max});}
    this.particles=this.particles.filter(p=>p.life>0);c.globalAlpha=1;
    for(const {unit,x,y,width} of this.unitHealthQueue)this.healthBar(c,unit,x,y,width);
    for(const draw of this.projectileHeadQueue)draw();delete this.projectileHeadQueue;
    for(const {unit,x,y,width} of this.unitHealthQueue)this.healthReadout(c,unit,x,y,width);delete this.unitHealthQueue;
    for(const tower of this.towerHealthQueue)this.towerHealth(c,tower);delete this.towerHealthQueue;
    c.restore();
  }
}

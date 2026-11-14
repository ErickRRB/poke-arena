import { W, H, TILE, DEPLOY_GRID, LANES, RIVER, BRIDGE, PRINCESS_Y, KING_Y, CARDS, DEFAULT_DECK, directionRow, attackPoseProgress } from './engine.js?v=26';
import { BattleArt } from './battle-art.js?v=32';
import { emissionPoint, animationFrame, attackAnimationFrame, movementAnchor, TOWER_MOUNTS, structureLift } from './sprite-motion.js?v=26';
import {combatVisual,projectileVisual,movementVisual,fireballVisual} from './combat-visuals.js?v=29';
import { spellPreviewTargets } from './spell-preview.js?v=28';
import {areaGuide,cellGuide,travelGuide} from './targeting-art.js?v=32';

function rect(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function ellipse(c, color, x, y, rx, ry) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function line(c, color, x1, y1, x2, y2, width = 1) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function text(c, label, x, y, color = '#f8f1d6', size = 12, weight = 600) { c.font = `${weight} ${size}px "DM Sans", "Segoe UI", sans-serif`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y); }
const visualScale = unit => unit.scale ?? unit.card?.scale ?? 1.5;
function attackLunge(unit,reduced){
  if(reduced||!unit.attack||unit.mounted||!(unit.card.range<50))return 0;
  const duration=unit.attackDuration||.75,elapsed=duration-unit.attack;
  return Math.sin(Math.PI*Math.max(0,Math.min(1,elapsed/duration)))*3;
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
    this.resizeObserver=new ResizeObserver(([entry])=>{const{width,height}=entry.contentRect;this.verticalScale=width?height/width*W/H:1;});
    this.resizeObserver.observe(canvas);
    this.background = document.createElement('canvas'); this.background.width = W; this.background.height = H;
    this.sprites = new Map(); this.metadata = {};
    this.anchors = new Map(); this.bodyHeights = new Map(); this.effects = [];
    this.particles = []; this.numbers = [];this.showCombatNumbers=false;
    this.healthStates=new Map();this.speciesLoads=new Map();this.imageLoads=new Map();this.pendingSpecies=new Set();
    this.battleArt=new BattleArt(file=>this.loadImage(file));this.visualActors=new Map();this.visualProjectiles=new Map();this.frameActors=new Map();
    this.t = 0; this.reduced = false; this.pointer = null; this.selection = null; this.tutorialSpot = false;
    this.buildBackground();
  }
  async load(keys=DEFAULT_DECK,onProgress=()=>{}) {
    const response = await fetch('assets/pokemon/manifest.json?v=26');
    if (!response.ok) throw new Error('No se pudo cargar el archivo de sprites.');
    this.metadata = await response.json();
    const ids=[...new Set([...keys.map(k=>CARDS[k]?.id),31,34,52].filter(Boolean))];
    const files=new Set(ids.flatMap(id=>[...this.animationEntries(id).flatMap(([,meta])=>[meta.file,meta.shadow])]));
    const total=files.size+this.battleArt.files().length;let loaded=0;
    const track=pending=>pending.then(value=>{onProgress(++loaded,total);return value;});
    onProgress(0,total);
    await Promise.all([this.ensureSpecies(ids),...[...files].map(file=>track(this.loadImage(file))),this.battleArt.preload(()=>onProgress(++loaded,total))]);
    this.buildBackground();
  }
  animationEntries(id){
    const names=new Set(['Walk','Idle','Attack','Hurt',...([31,34,52].includes(Number(id))?['Shoot']:[]),...Object.values(CARDS).filter(c=>c.id===Number(id)).flatMap(c=>[c.attackAnim,c.moveAnim,c.idleAnim]).filter(Boolean)]);
    return Object.entries(this.metadata[id]||{}).filter(([name])=>names.has(name));
  }
  loadImage(file){
    if(!this.imageLoads.has(file)){const image=new Image();image.src=file;this.imageLoads.set(file,image.decode().then(()=>image));}
    return this.imageLoads.get(file);
  }
  ensureSpecies(ids){if(!Object.keys(this.metadata).length)return Promise.resolve();return Promise.all([...new Set(ids)].map(id=>{
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
  bridge(c,x){
    const image=this.battleArt.images.get('assets/battle/arena-bridge-v2.webp');
    if(image)c.drawImage(image,x-40,BRIDGE.top,80,BRIDGE.bottom-BRIDGE.top);
  }
  buildBackground(){
    const c=this.background.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,W,H);
    const ground=this.battleArt.images.get('assets/battle/arena-ground-v2.webp');
    if(ground)c.drawImage(ground,0,0,W,H);else rect(c,'#8eaa79',0,0,W,H);
  }
  resetVisuals(){this.visualActors?.clear();this.visualProjectiles?.clear();this.visualFlights?.clear();this.frameActors?.clear();}
  visualActor(unit,dt){
    let pose=this.visualActors.get(unit.id);
    if(!pose||Math.hypot(pose.x-unit.x,pose.y-unit.y)>95){pose={x:unit.x,y:unit.y,dx:unit.dx??0,dy:unit.dy??-1,seq:unit.attackSeq,attack:unit.attack||0};this.visualActors.set(unit.id,pose);}
    const blend=1-Math.exp(-dt*(unit.dash?.phase==='travel'?40:24));pose.x+=(unit.x-pose.x)*blend;pose.y+=(unit.y-pose.y)*blend;
    const turn=1-Math.exp(-dt*24);pose.dx+=((unit.dx||0)-pose.dx)*turn;pose.dy+=((unit.dy||0)-pose.dy)*turn;
    if(pose.seq!==unit.attackSeq){pose.seq=unit.attackSeq;pose.attack=unit.attack||0;}else pose.attack=Math.max(0,Math.min(unit.attack||0,pose.attack-dt));
    return{...unit,x:pose.x,y:pose.y,dx:pose.dx,dy:pose.dy,attack:pose.attack};
  }
  projected(point,actor){
    if(!actor)return point;
    return{x:actor.x+(point.x-(actor.logicalX??actor.x)),y:actor.y+(point.y-(actor.logicalY??actor.y))/(this.verticalScale||1)};
  }
  visualEmission(actor,shot=0){
    if(!actor)return null;
    const point=emissionPoint(actor,shot,this.reduced?0:this.t),bob=actor.card?.flying&&!this.reduced?Math.sin(this.t*2.6+actor.id)*1.5:0;
    const lunge=attackLunge(actor,this.reduced);
    return{x:point.x+(actor.dx||0)*lunge,y:actor.y+(point.y-actor.y-bob+(actor.dy||0)*lunge)/(this.verticalScale||1)};
  }
  effectSource(effect){
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
    if(!tint){
      tint=document.createElement('canvas');tint.width=sw;tint.height=sh;
      const mask=tint.getContext('2d');mask.imageSmoothingEnabled=false;mask.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
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
    const width=king?68:60,by=y+10/vertical,ratio=Math.max(0,tower.hp/tower.maxHp);
    rect(c,'#20352ad9',x-width/2-2,by-2,width+4,10);rect(c,'#435845',x-width/2,by,width,6);
    rect(c,team?'#eb8e71':'#65b9d0',x-width/2,by,width*ratio,6);rect(c,team?'#ffcfb1':'#c7f1f1',x-width/2,by,width*ratio,2);
    const hp=String(Math.ceil(tower.hp));c.font='600 12px "DM Sans",sans-serif';const labelWidth=c.measureText(hp).width+12;
    rect(c,'#243b2ad9',x-labelWidth/2,by+10,labelWidth,16);text(c,hp,x,by+18,team?'#ffe2ce':'#d5f1ef',11,700);c.restore();
  }
  sprite(c, unit, idle = false) {
    const id = unit.card.id;
    const burrow=unit.card.burrow&&!unit.preview?(this.reduced?(unit.burrowed?1:0):unit.burrowProgress??(unit.burrowed?1:0)):0;
    if(burrow>=.999){this.platform(c,unit);return;}
    if(!this.speciesLoads.has(id))this.ensureSpecies([id]).catch(()=>{});
    const movement=movementVisual(unit.card);
    let anim = unit.attack > 0 ? (unit.attackAnim||unit.card.attackAnim||'Attack') : unit.moving||unit.card.flying ? movement.animation : unit.hit>0?'Hurt':unit.card.idleAnim||'Idle';
    if (!this.sprites.has(`${id}-${anim}`)) anim = 'Walk';
    const meta = this.metadata[id]?.[anim], img = this.sprites.get(`${id}-${anim}`);
    if (!meta || !img) return;
    const scale = visualScale(unit),vertical=this.verticalScale||1;
    let frame = 0;
    const attacking=unit.attack>0;
    const duration = meta.durations.reduce((a,b)=>a+b,0);
    const elapsed = (unit.attackDuration || .6) - unit.attack;
    const windup = unit.attackWindup ?? unit.card.windup ?? .18;
    const progress=attacking?attackPoseProgress(meta,elapsed,unit.attackDuration||.6,windup):0;
    const loopFrames=!attacking&&anim===movement.animation?movement.frames:null;
    const loopMeta=loopFrames?{durations:loopFrames.map(()=>movement.frameDuration)}:meta;
    const speed=loopFrames?1:(unit.card.flying||unit.moving)?.85:.75;
    const clock=attacking?progress*duration:this.reduced?0:anim==='Hurt'?Math.max(0,.24-unit.hit)*60:(this.t+unit.id*.173)*60*speed;
    frame=attacking?attackAnimationFrame(meta,elapsed,unit.attackDuration||.6,windup,unit.card.attackFrames):animationFrame(loopMeta,clock);
    if(loopFrames)frame=loopFrames[frame];
    let direction = directionRow(unit.dx,unit.dy);
    if(img.height/meta.height<8)direction=0;
    const {x,y}=unit;
    const nativeAnchor=this.anchors.get(`${id}-${anim}`)?.[direction]?.[frame]||{x:meta.width/2,y:meta.height*.65};
    const anchor=(loopFrames||attacking)&&movement.bodyAnchor?movementAnchor(id,anim,direction,frame,nativeAnchor):nativeAnchor;
    const leapLift=unit.leap?Math.sin(Math.PI*unit.leap.elapsed/unit.leap.duration)*(this.reduced?12:unit.leap.kind==='river'?24:48):0;
    const lift=(leapLift+(unit.card.structure?structureLift(unit.card):unit.card.flying?16+(this.reduced?0:Math.sin(this.t*2.6+unit.id)*1.5):0))/vertical;
    const lunge=attackLunge(unit,this.reduced);
    const radius=unit.radius||12;
    if(!unit.mounted&&!unit.preview){
      ellipse(c,'#15382a65',x,y+2,radius+2,unit.card.flying?6:4);
    }
    if(unit.card.structure)this.platform(c,unit);
    c.save();
    if(burrow>0){c.beginPath();c.rect(x-100,y-180/vertical,200,183/vertical);c.clip();}
    const spawnProgress=unit.spawn>0?Math.max(0,1-unit.spawn/Math.max(.001,unit.spawnGroup?.duration??.75)):1;
    if(unit.spawn>0)c.globalAlpha=.2+.8*spawnProgress;
    if(unit.hit>0&&!this.reduced) c.filter=`brightness(${1+.35*unit.hit/.24})`;
    const px=x+unit.dx*lunge-anchor.x*scale,py=y+unit.dy*lunge/vertical-lift-(this.reduced?0:(1-spawnProgress)*12/vertical)-anchor.y*scale/vertical+burrow*((this.bodyHeights.get(id)||22)*scale+25)/vertical;
    if((unit.dash?.phase==='travel'||unit.card.charge&&unit.charge>=unit.card.charge)&&!this.reduced){for(let i=3;i>0;i--){c.globalAlpha=.08*(4-i);c.drawImage(img,frame*meta.width,direction*meta.height,meta.width,meta.height,Math.round(px-unit.dx*i*9),Math.round(py-unit.dy*i*9/vertical),meta.width*scale,meta.height*scale/vertical);}c.globalAlpha=1;}
    const spriteFrame=[frame*meta.width,direction*meta.height,meta.width,meta.height,Math.round(px),Math.round(py),meta.width*scale,meta.height*scale/vertical];
    c.drawImage(img,...spriteFrame);
    if(!unit.preview&&this.spellTargets?.has(unit.id))this.tintTarget(c,img,...spriteFrame);
    c.restore();
    if(unit.shield>0&&!unit.mounted){c.save();c.globalAlpha=.5;this.combatArt(c,'shield',x,y-lift-16,Math.max(40,radius*3));c.restore();}
    if(idle)return;
    const by=y-lift-((this.bodyHeights.get(id)||22)*scale+9)/vertical;
    this.healthBar(c,unit,x,by,unit.maxHp<=1?18:unit.card.count?30:unit.maxHp>=1800?52:44);
    if(unit.card.ability&&!unit.abilityUsed){ellipse(c,'#382448',x+27,by+4,6,6);text(c,'◆',x+27,by+4,'#e9beff',10,800);}
    if(unit.card.summon&&unit.spawn<=0)this.summonIndicator(c,unit,x,by-(unit.shield>0?13:12)/vertical);
    if(unit.stun>0)this.combatArt(c,'lightning',x,by-10,22);
    else if(unit.slow>0)this.combatArt(c,'snow',x,by-10,18);
    if(unit.burn)this.combatArt(c,unit.burn.kind==='poison'?'poison':'flame',x,y-lift-9,26);
  }
  drawDeployments(c,game){
    const groups=new Map(),vertical=this.verticalScale||1;
    for(const unit of game.units){
      if(unit.hp<=0||unit.spawn<=0)continue;
      const group=unit.spawnGroup||{id:unit.id,x:unit.x,y:unit.y,duration:.75};
      let marker=groups.get(group.id);
      if(!marker){marker={...group,top:H,remaining:0};groups.set(group.id,marker);}
      const lift=unit.card.structure?structureLift(unit.card):unit.card.flying?16:0;
      marker.top=Math.min(marker.top,(unit.drawY??unit.y)-lift-((this.bodyHeights.get(unit.card.id)||22)*visualScale(unit)+35)/vertical);
      marker.remaining=Math.max(marker.remaining,unit.spawn);
    }
    for(const marker of groups.values()){
      const progress=Math.max(0,Math.min(1,1-marker.remaining/Math.max(.001,marker.duration)));
      this.deploymentIndicator(c,marker,progress);
    }
  }
  deploymentIndicator(c,marker,progress){
    const vertical=this.verticalScale||1,x=Math.max(28,Math.min(W-28,marker.x)),y=Math.max(18/vertical,marker.top);
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(1,1/vertical);
    this.battleArt.draw(c,'pokeball',0,0,24,24,{frame:0,angle:this.reduced?0:Math.sin(progress*Math.PI)*.22});
    rect(c,'#263d3da6',-12,14,24,3);rect(c,'#f6e9bc',-12,14,24*Math.max(0,Math.min(1,progress)),3);
    c.restore();
  }
  summonIndicator(c,unit,x,y){
    const progress=1-Math.min(1,Math.max(0,unit.summonClock)/Math.max(.001,unit.summonCycle||unit.card.summonEvery));
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(1,1/(this.verticalScale||1));
    this.battleArt.draw(c,'pokeball',-23,0,21,21,{frame:0});
    rect(c,'#263d3da6',-9,-1,30,3);rect(c,unit.card.color||'#bea2d8',-9,-1,30*progress,3);
    c.restore();
  }
  combatArt(c,name,x,y,size,angle=0,height=size,options={}){
    if(!this.battleArt)return false;
    return this.battleArt.draw(c,name,x,y,size,height/(this.verticalScale||1),{age:this.t,angle,...options});
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
  platform(c,unit){
    if(unit.card.platform===false)return;
    if(unit.card.burrow){
      const vertical=this.verticalScale||1;c.save();c.translate(unit.x,unit.y);c.scale(1,1/vertical);
      rect(c,'#263a32',-25,-9,50,20);rect(c,'#89998b',-23,-7,46,16);rect(c,'#b6c0a5',-20,-5,40,12);
      line(c,'#495f52',0,-5,0,7,2);for(const x of[-19,17])rect(c,'#465b4e',x,-4,3,3);
      rect(c,unit.team?'#d75f4e':'#498ca2',-16,7,32,3);
      if(unit.burrowed){rect(c,'#2f4135',-16,13,32,3);rect(c,unit.team?'#efaf7a':'#b7df9b',-16,13,32*Math.max(0,unit.hp/unit.maxHp),3);}
      c.restore();return;
    }
    if(!this.battleArt.structure(c,'platform',unit.team,unit.x,unit.y+4,74,this.verticalScale||1,this.targetTint(unit)))text(c,'PLACEHOLDER',unit.x,unit.y-15,'#ffe3a0',8);
  }
  onEvent(event) {
    const {type}=event;
    if(type==='dashWindup')this.effects.push({kind:'charge',actor:event.unit,style:'shadow',life:event.duration,max:event.duration});
    if(type==='cast'&&event.key==='pinMissile'){
      const hitAt=CARDS.pinMissile.castDelay??.55,life=hitAt+.42;
      this.effects.push({...event,kind:'missiles',hitAt,life,max:life});
    }
    if(type==='attackStart'&&['lightning','aura','psychic'].includes(event.style))this.effects.push({kind:'charge',actor:event.attacker,style:event.style,life:event.windup,max:event.windup});
    if(type==='attackStart'&&['slam','eruption','horn'].includes(event.style))this.effects.push({kind:'windup',actor:event.attacker,style:event.style,life:event.windup,max:event.windup});
    if(type==='beam')this.effects.push({...event,kind:'beam',life:.42,max:.42});
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
    if(type==='damage'&&event.amount>0){this.floatingNumber(event.target,event.amount,event.dot?'dot':'damage');const target=event.target,old=this.healthStates.get(target.id);this.healthStates.set(target.id,{chip:Math.max(old?.chip||0,Math.min(1,(target.hp+event.amount)/target.maxHp)),last:target.hp/target.maxHp,at:this.t});}
    if(type==='heal'&&event.amount>0){this.floatingNumber(event.unit,event.amount,'heal');this.effects.push({kind:'artImpact',art:'heal',x:event.unit.x,y:event.unit.y-18,radius:30,life:1.2,max:1.2});}
    if(type==='spawn'){
      const u=event.unit,group=u.spawnGroup||{id:u.id,x:u.x,y:u.y};this.ensureSpecies([u.card.id]).catch(()=>{});
      if(u.spawn>0&&!this.effects.some(e=>e.kind==='release'&&e.groupId===group.id))this.effects.push({kind:'release',groupId:group.id,x:group.x,y:group.y,color:u.card.color,delay:u.spawn,life:.3,max:.3});
    }
    if(type==='entry')this.effects.push({...event,kind:'entry',life:.36,max:.36});
    if(type==='ability'||type==='deathBurst'){
      const abilityArt=type==='ability'?{shield:'shield',wave:'hydro',quake:'quake',healingFire:'heal'}[event.unit.card.ability?.effect]:null;
      const art=abilityArt||(event.style==='lightning'?'lightning':{electric:'lightning',water:'hydro',fire:'explosion',grass:'leaf',psychic:'psychic',ghost:'shadow',rock:'dust'}[event.unit.card.type]||'impact');
      this.effects.push({kind:'areaImpact',art,style:event.style||event.unit.card.style,x:event.unit.x,y:event.unit.y,radius:event.radius||55,color:event.unit.card.color,groundOnly:event.groundOnly??!event.unit.card.air,life:.55,max:.55});
    }
    if(type==='hit'){
      if(!event.radius&&CARDS[event.key]?.range<50)return; // Contact is drawn once, by the melee event.
      const color=event.art==='petalShot'?'#ff9ccd':{ember:'#ffc083',hydro:'#91dcff',bubble:'#afeaff',leaf:'#e0f7ac',poison:'#d6a0f0',powder:'#d9b3f4',shadow:'#cda4f5',confusion:'#efb9f8',aura:'#efb9f8',ice:'#c1f5ff',rock:'#e4caa4',slam:'#e4caa4'}[event.style]||CARDS[event.key]?.color||'#eee8bc';
      const point=event.groundY===undefined?event:{x:event.groundX,y:event.groundY-(event.impactHeight||0)/(this.verticalScale||1)};
      const art=event.art||{ember:'explosion',hydro:'hydro',bubble:'bubble',leaf:'leaf',poison:'poison',powder:'poison',shadow:'shadow',confusion:'psychic',aura:'psychic',ice:'ice',rock:'dust'}[event.style];
      if(event.radius>0&&!event.structuresOnly){this.effects.push({kind:'areaImpact',art:art||{slam:'dust',eruption:'explosion',bite:'bite',slash:'slash'}[event.style]||'impact',style:event.style,x:event.groundX??event.x,y:event.groundY??event.y,impactX:point.x,impactY:point.y,radius:event.radius,color,groundOnly:event.groundOnly??!CARDS[event.key]?.air,life:.6,max:.6});return;}
      if(art)this.effects.push({kind:'artImpact',art,x:point.x,y:point.y,visualSize:combatVisual(CARDS[event.key]).impact,radius:28,life:art==='ice'?1.1:.6,max:art==='ice'?1.1:.6});
      else this.burst(point.x,point.y,color,4,30);
      if(['egg','song'].includes(event.style))this.effects.push({...event,...point,kind:'impact',life:.4,max:.4,radius:CARDS[event.key]?.splash||18});
    }
    if(type==='faint')this.burst(event.unit.x,event.unit.y-15,'#ddd9bd',12,55);
    if(type==='structureDown'){this.burst(event.unit.x,event.unit.y-10,'#a9b395',28,85);this.burst(event.unit.x,event.unit.y-24,'#a4d5de',10,60);}
    if(type==='towerDown'){
      this.burst(event.tower.x,event.tower.y-20,'#c5b88d',35,110);
      this.effects.push({kind:'artImpact',art:'dust',x:event.tower.x,y:event.tower.y-15,radius:85,life:.8,max:.8});
    }
    if(type==='spellHit'){
      if(event.key==='pinMissile'){
        const volley=this.effects.find(e=>e.kind==='missiles'&&!e.landed&&e.team===event.team&&e.x===event.x&&e.y===event.y);
        if(volley){volley.life=Math.min(volley.life,.42);volley.landed=true;}
        else{const hitAt=CARDS.pinMissile.castDelay??.55;this.effects.push({...event,kind:'missiles',landed:true,hitAt,life:.42,max:hitAt+.42});}
        return;
      }
      if(event.key==='thunder'){this.effects.push({...event,kind:'entry',style:'lightning',life:.36,max:.36});return;}
      if(CARDS[event.key].fieldDuration)return;
      const art={fireball:'explosion',lightning:'lightning',hyperBeam:'explosion',blizzard:'ice',log:'flame'}[event.key]||'impact';
      this.effects.push({...event,kind:'areaImpact',art,style:CARDS[event.key].style,radius:event.radius,color:CARDS[event.key].color,life:.7,max:.7});
      if(['hyperBeam','blizzard'].includes(event.key))this.effects.push({...event,kind:'spell',life:.65,max:.65});
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
    const id=target.card?.id,scale=visualScale(target);
    const height='king'in target?(target.king?83:72):(this.bodyHeights.get(id)||23)*scale+(target.card.structure?structureLift(target.card):target.card.flying?16:0)+13;
    const life=kind==='dot'?.95:1.15;
    if(this.numbers.length>=32)this.numbers.shift();
    this.numbers.push({targetId:target.id,kind,x:Math.max(24,Math.min(W-24,target.x+(target.id%3-1)*7+(kind==='dot'?15:kind==='heal'?-15:0))),y:Math.max(27,Math.min(H-27,target.y-height+(kind==='dot'?12:0))),amount,color:kind==='heal'?'#baf3a2':kind==='dot'?'#ffc27d':target.team?'#ffe8a0':'#ffd2c8',life,max:life,lastAt:this.t});
  }
  drawNumbers(c,dt){
    if(!this.showCombatNumbers){this.numbers=[];return;}
    for(const n of this.numbers){
      n.life-=dt;if(n.life<=0)continue;
      const age=n.max-n.life,progress=age/n.max,size=n.kind==='dot'?17:n.amount>=160?23:20;
      const scale=this.reduced?1:age<.1?.8+age*3.2:age<.22?1.12-(age-.1):1;
      const value=`${n.kind==='heal'?'+':''}${Math.round(n.amount)}`;
      c.save();c.globalAlpha=progress<.62?1:(1-progress)/.38;
      c.translate(n.x,n.y-(this.reduced?0:progress*30));c.scale(scale,scale);
      c.font=`800 ${size}px "Barlow Condensed", "Segoe UI", sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
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
    const logicalProgress=Math.min(1,p.travelled/Math.max(1,p.totalDistance)),source=this.frameActors.get(p.sourceId),target=this.frameActors.get(p.target.id)||p.target;
    const targetLift=p.endLiftY??-('king'in p.target?27:p.target.card?.structure?43:p.target.card?.flying?27:15);
    const start=this.projected({x:p.startX+(p.groundPath?p.liftX||0:0),y:p.startY+(p.groundPath?p.liftY||0:0)},source),end=this.projected({x:p.target.x,y:p.target.y+targetLift},target);
    const logicalEnd={x:p.target.x,y:p.target.y+(p.groundPath?0:targetLift)};
    const desired={x:p.x+(start.x-p.startX)*(1-logicalProgress)+(end.x-logicalEnd.x)*logicalProgress,y:p.y+(start.y-p.startY)*(1-logicalProgress)+(end.y-logicalEnd.y)*logicalProgress};
    const pose=this.projectilePose(p,desired),progress=Math.min(1,pose.travelled/Math.max(1,p.totalDistance));
    const x=pose.x,y=pose.y-Math.sin(progress*Math.PI)*(p.arc||0)/(this.verticalScale||1),angle=Math.atan2((end.y-start.y)*(this.verticalScale||1)-Math.PI*(p.arc||0)*Math.cos(progress*Math.PI),end.x-start.x);
    const visual=combatVisual(source?.card||CARDS[p.key]),motion=projectileVisual(p.style,this.t,this.reduced),size=p.key==='nuzleaf'?Math.max(16,visual.projectile):visual.projectile;
    const art=p.key==='nuzleaf'?'needle':p.art||motion.name;
    if((p.arc||0)>25){c.save();c.globalAlpha=.18;ellipse(c,'#233b31',p.x,p.y,Math.max(4,size*.25),2);c.restore();}
    this.combatArt(c,art,x,y,size,art==='needle'?0:['rock','egg'].includes(p.style)?(this.reduced?0:progress*2):['leaf','ember'].includes(p.style)?angle:0,size,{direction:directionRow(end.x-x,end.y-y),age:motion.age,fps:motion.fps,frame:motion.frame,frames:motion.frames,trim:true});
    if(!this.reduced&&p.style!=='coin'&&p.style!=='rock'){
      const vertical=this.verticalScale||1,color=p.art==='petalShot'?'#f5c3df':{ember:'#f6c580',hydro:'#a5e6f2',bubble:'#c4eef1',ice:'#dbffff',poison:'#d5a3df',powder:'#d5a3df',shadow:'#b99add',leaf:'#e2edb1',psychic:'#d5baff'}[p.style]||'#e6eac9';
      const length=Math.min(p.travelled,Math.max(16,size*1.5)),bend=Math.sin(progress*Math.PI)*Math.min(8,(p.arc||0)*.05);
      c.save();c.lineCap='round';
      for(let i=3;i>0;i--){const a=i/3,b=(i-1)/3;c.globalAlpha=.38*(1-a*.65);c.strokeStyle=color;c.lineWidth=Math.max(1,size*.14*(1-a*.7));c.beginPath();c.moveTo(x-Math.cos(angle)*length*a,y-(Math.sin(angle)*length*a+bend*a*a)/vertical);c.lineTo(x-Math.cos(angle)*length*b,y-(Math.sin(angle)*length*b+bend*b*b)/vertical);c.stroke();}
      c.restore();
    }
  }
  drawMissiles(c,e){
    const age=e.max-e.life,after=age-e.hitAt,count=this.reduced?9:18;
    for(let i=0;i<count;i++){
      const angle=i*2.39996,r=Math.sqrt((i+.5)/count)*e.radius*.9,x=e.x+Math.cos(angle)*r,y=e.y+Math.sin(angle)*r,launch=(i%3)*.045;
      if(age<launch)continue;
      if(after<0){
        const flight=Math.max(0,Math.min(1,(age-launch)/Math.max(.01,e.hitAt-launch))),direction=e.team?-1:1;
        const px=x-direction*(1-flight)*108,py=y-(1-flight)*210;
        c.globalAlpha=this.reduced?.65:Math.min(1,flight*4);
        this.combatArt(c,'needle',px,py,28,0,28,{direction:directionRow(direction*108,210),age});
      }else{
        c.globalAlpha=Math.max(0,1-after/.42);
        this.combatArt(c,'dust',x,y,22,0,22,{progress:Math.min(1,after/.42)});
      }
    }c.globalAlpha=1;
  }
  entryEffect(c,e,progress){
    const radius=e.radius||60,age=e.max-e.life;
    if(e.style==='lightning'){
      this.battleArt.beam(c,'lightning',{x:e.x,y:e.y-140/(this.verticalScale||1)},{x:e.x,y:e.y},24,age);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;this.combatArt(c,'lightning',e.x+Math.cos(a)*radius*.55,e.y+Math.sin(a)*radius*.55,40,0,40,{age});}
    }else this.combatArt(c,'ice',e.x,e.y,radius*2,0,radius*2,{progress});
  }
  effectTarget(effect){
    const actor=this.frameActors.get(effect.targetId);
    return actor?{x:actor.x,y:actor.y-('king'in actor?27:actor.card?.structure?structureLift(actor.card)+20:actor.card?.flying?27:15)/(this.verticalScale||1)}:effect.to;
  }
  areaImpact(c,e,progress){
    const radius=e.radius,fade=1-progress,color=e.color||'#dfdab0',vertical=this.verticalScale||1;
    c.save();c.beginPath();c.arc(e.x,e.y,radius,0,Math.PI*2);c.clip();
    c.save();c.globalAlpha*=.09*Math.max(0,1-progress*2);c.fillStyle=color;c.fill();c.restore();
    // A brief expanding ground ripple communicates the true splash boundary.
    c.save();c.globalAlpha*=.35*Math.max(0,1-progress*2.2);c.strokeStyle=color;c.lineWidth=2*(1-progress)+.5;c.beginPath();c.arc(e.x,e.y,radius*(.35+.65*Math.min(1,progress*3)),0,Math.PI*2);c.stroke();c.restore();
    if(['leaf','poison','powder','bite','slash'].includes(e.style)){
      const count=this.reduced?4:8,size=Math.min(17,Math.max(10,radius*.27)),spread=this.reduced?.72:.15+Math.sin(Math.min(1,progress)*Math.PI/2)*.75;
      for(let i=0;i<count;i++){
        const angle=i*2.39996+(e.style==='leaf'?progress*.55:0),r=Math.sqrt((i+.5)/count)*radius*spread;
        c.save();c.globalAlpha*=fade;this.combatArt(c,e.art,e.x+Math.cos(angle)*r,e.y+Math.sin(angle)*r-Math.sin(progress*Math.PI)*12/vertical,size,this.reduced?0:angle+progress,size,{age:i*.09+progress*.5,trim:true});c.restore();
      }
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
    for(const e of this.effects){
      let activeDt=dt;
      if(e.delay>0){activeDt=Math.max(0,dt-e.delay);e.delay-=dt;if(e.delay>0)continue;}
      e.life-=activeDt;if(e.life<=0)continue;
      const progress=1-e.life/e.max,age=e.max-e.life;
      c.save();c.globalAlpha=Math.min(1,e.life/Math.min(.2,e.max));
      if(e.kind==='missiles')this.drawMissiles(c,e);
      else if(e.kind==='entry')this.entryEffect(c,e,progress);
      else if(e.kind==='areaImpact')this.areaImpact(c,e,progress);
      else if(e.kind==='artImpact'){
        const size=e.visualSize??Math.max(24,Math.min(160,(e.radius||30)*1.7));
        this.combatArt(c,e.art,e.x,e.y,size,0,size,{progress:this.reduced?.45:progress});
      }else if(e.kind==='release'){
        this.combatArt(c,'puff',e.x,e.y-12,45,0,45,{progress:this.reduced?.4:progress});
      }else if(e.kind==='beam'||e.kind==='counter'){
        const from=this.effectSource(e),to=this.effectTarget(e),name=e.style==='lightning'?'lightning':'psychic';
        if(!from||!to){c.restore();continue;}
        if(e.style==='vine'){
          const length=Math.hypot(to.x-from.x,to.y-from.y),angle=Math.atan2(to.y-from.y,to.x-from.x);
          this.combatArt(c,'vine',(from.x+to.x)/2,(from.y+to.y)/2,Math.max(35,length),angle,32,{progress});
        }else{
          if(e.piercing){c.save();c.globalAlpha*=.22;this.battleArt.beam(c,name,from,to,e.width,age);c.restore();}
          this.battleArt.beam(c,name,from,to,e.kind==='counter'?8:combatVisual(this.frameActors.get(e.sourceId)?.card||CARDS[e.key]).beam,age);
        }
      }else if(e.kind==='windup'||e.kind==='charge'){
        const actor=this.frameActors.get(e.actor.id)||e.actor,from=this.visualEmission(actor);
        const size=combatVisual(actor.card).charge;
        const art={slam:'dust',horn:'horn',eruption:'flame',lightning:'lightning'}[e.style]||'psychic';
        this.combatArt(c,art,from.x,from.y,size,0,size,{age:age*.6,trim:true});
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
        if(e.key==='hyperBeam')this.battleArt.beam(c,'hyper',{x:e.x-45,y:e.y-330/(this.verticalScale||1)},{x:e.x,y:e.y},34*(1-progress*.4),age);
        else this.combatArt(c,'snow',e.x,e.y,e.radius*2.4,0,e.radius*2.4,{direction:0,progress});
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
    if(bank)c.drawImage(bank,0,RIVER.top-8,W,RIVER.bottom-RIVER.top+16);
    else rect(c,'#578c8b',0,RIVER.top,W,RIVER.bottom-RIVER.top);
    const frame=this.reduced?0:Math.floor(this.t*3)%10;
    c.save();c.beginPath();c.rect(0,RIVER.top,W,RIVER.bottom-RIVER.top);c.clip();
    c.globalAlpha=.1;c.filter='saturate(.3)';
    for(let x=0;x<W;x+=216)this.battleArt.tile(c,'water',0,frame*144+32,216,24,x,RIVER.top,216,RIVER.bottom-RIVER.top);
    c.restore();for(const x of LANES)this.bridge(c,x);
  }
  drawPlacement(c, game) {
    const key=this.selection,card=CARDS[key],team=this.placementTeam||0;
    if(!card||this.placementWhenPaused&&!this.pointer||game.state!=='playing'&&!(this.placementWhenPaused&&game.state==='paused'))return;
    c.save();
    if(this.selection){
      // Keep the terrain bright; legal cells and their frontier carry placement feedback.
      const cells=Array.from({length:DEPLOY_GRID.rows},(_,row)=>Array.from({length:DEPLOY_GRID.columns},(_,col)=>game.canDeploy(team,key,col*TILE+TILE/2,DEPLOY_GRID.top+row*TILE+TILE/2)));
      if(!card.spell||card.rolling)for(let row=0;row<DEPLOY_GRID.rows;row++)for(let col=0;col<DEPLOY_GRID.columns;col++){
        const x=col*TILE+TILE/2,y=DEPLOY_GRID.top+row*TILE+TILE/2;
        if(cells[row][col]){
          c.strokeStyle='#eef5d525';c.lineWidth=.65;
          c.strokeRect(x-TILE/2,y-TILE/2,TILE,TILE);
          const neighbor=cells[row+(team?1:-1)];
          if(neighbor&&!neighbor[col]){
            const frontier=y+(team?1:-1)*TILE/2;
            line(c,'#3e5339cc',x-TILE/2,frontier,x+TILE/2,frontier,3);
            line(c,'#fff0ba',x-TILE/2+3,frontier,x+TILE/2-3,frontier,1);
          }
        }
      }
      if(this.tutorialSpot)text(c,'D E S P L E G Á  A C Á',300,480,'#e0ecc7aa',10,500);
    }
    if(this.tutorialSpot&&!card.spell){
      c.strokeStyle='#e6d790';c.lineWidth=2;c.setLineDash([4,4]);c.strokeRect(158-TILE,520-TILE,TILE*2,TILE*2);c.setLineDash([]);text(c,'↓',158,482,'#eee2a3',24);
    }
    const p=this.pointer;
    if(p){
      const placement=game.resolveDeployment(team,key,p.x,p.y),point=placement||p;
      const valid=!!placement&&game.energy[team]>=card.cost;
      const color=valid?'#e9dc9e':'#e7947b';
      if(card.spell&&!card.rolling&&placement){
        // Local cell intersections explain snapping without covering the board.
        c.fillStyle='#edfad15c';
        for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++)c.fillRect(point.x+(col-.5)*TILE-1,point.y+(row-.5)*TILE-1,2,2);
      }
      if(placement&&this.selection&&Math.hypot(point.x-p.x,point.y-p.y)>TILE/2){
        c.strokeStyle=color;c.lineWidth=2;c.setLineDash([3,5]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(point.x,point.y);c.stroke();c.setLineDash([]);ellipse(c,color,p.x,p.y,3,3);
      }
      if(card.rolling)travelGuide(c,point.x,point.y,card.splash,card.travelDistance,team,valid);
      if(!card.spell&&placement){
        const range=card.squad?Math.max(...card.squad.map(k=>CARDS[k].range)):card.range;
        if(!card.passive&&range>=50){
        c.fillStyle='#e9e2a92b';c.strokeStyle='#e6ddb182';c.lineWidth=1.2;c.beginPath();c.arc(point.x,point.y,range,0,Math.PI*2);c.fill();c.stroke();
        }
        for(const enemy of game.deploymentThreats(team,key,point.x,point.y)){
          const id=enemy.card?.id,scale=visualScale(enemy);
          const height='king'in enemy?(enemy.king?106:96):(this.bodyHeights.get(id)||23)*scale+(enemy.card.structure?structureLift(enemy.card):enemy.card.flying?16:0)+25;
          const bx=enemy.x+18,by=Math.max(22,enemy.y-height/(this.verticalScale||1));
          ellipse(c,'#ef554944',enemy.x,enemy.y,enemy.radius+7,9);
          placementWarning(c,bx,by,this.verticalScale||1);
        }
      }
      if(card.spell&&!card.rolling){
        areaGuide(c,point.x,point.y,card.splash,{team,valid});cellGuide(c,point.x,point.y,TILE,valid);
        if(card.spawnOnImpact&&placement){
          const reserved=[];
          for(let i=0;i<card.spawnTotal;i++){
            const angle=-Math.PI/2+i*2*Math.PI/card.spawnTotal+(team?Math.PI:0);
            const spawn=game.reinforcementPoint(card.spawnKey,point.x+Math.cos(angle)*card.spawnRadius,point.y+Math.sin(angle)*card.spawnRadius,reserved);
            if(spawn){reserved.push(spawn);c.save();c.globalAlpha=.5;this.sprite(c,{...spawn,id:-20-i,card:CARDS[card.spawnKey],team,preview:true,dx:0,dy:team?1:-1,anim:this.t},true);c.restore();}
          }
        }
      }
      if((!card.spell||card.rolling)&&valid&&this.selection){
        const positions=card.rolling?[point]:game.deploymentPositions(team,key,point.x,point.y);
        for(const [index,position]of positions.entries()){
          const left=position.x-TILE/2,top=position.y-TILE/2,corner=6;
          c.fillStyle='#f4e4a93d';c.fillRect(left,top,TILE,TILE);
          for(const [cx,cy,dx,dy]of[[left,top,1,1],[left+TILE,top,-1,1],[left,top+TILE,1,-1],[left+TILE,top+TILE,-1,-1]]){line(c,'#f5e4aa',cx,cy,cx+dx*corner,cy,2);line(c,'#f5e4aa',cx,cy,cx,cy+dy*corner,2);}
          if(!card.spell){const previewCard=CARDS[card.squad?.[index]]||card;c.globalAlpha=.55;this.sprite(c,{...position,card:previewCard,preview:true,team,dx:0,dy:team?1:-1,anim:this.t,id:-1-index,lifetime:card.lifetime},true);c.globalAlpha=1;}
        }
      }
      if(!valid){line(c,color,p.x-5,p.y-5,p.x+5,p.y+5,2);line(c,color,p.x+5,p.y-5,p.x-5,p.y+5,2);}
    }
    c.restore();
  }
  field(c,f,front=false){
    const radius=f.radius,age=f.duration?f.duration-f.life:this.t;
    c.save();c.globalAlpha=Math.min(1,f.life*2);
    if(f.key==='stealthRock'){
      for(let i=0;i<9;i++){
        const a=i*2.39996,r=Math.sqrt((i+.5)/9)*radius*.83,x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;
        if((Math.sin(a)>0)!==front)continue;
        this.combatArt(c,'rock',x,y-(this.reduced?8:8+Math.sin(age*2+i)*3),20+i%3*3,0,20+i%3*3,{frame:i%2});
      }
    }else if(f.key==='nightmare'){
      this.combatArt(c,front?'nightmareFront':'nightmareBack',f.x,f.y,radius*2.4,0,radius*2.4,{age:this.reduced?.3:age,blend:!this.reduced});
    }else if(!front){
      if(f.key==='whirlpool'){
        // The visible water reaches the same boundary as the affected zone.
        c.save();c.beginPath();c.arc(f.x,f.y,radius,0,Math.PI*2);c.clip();c.globalAlpha*=.45;
        const frame=this.reduced?0:Math.floor(this.t*8)%10;
        this.battleArt.tile(c,'water',0,frame*144+32,216,24,f.x-radius,f.y-radius,radius*2,radius*2);c.restore();
        this.battleArt.draw(c,'whirlpool',f.x,f.y,radius*1.95,radius*1.95,{age:this.reduced?.8:age,trim:true,blend:!this.reduced});
      }else if(f.key==='spikes'){
        for(let i=0;i<15;i++){const a=i*2.39996,r=Math.sqrt((i+.5)/15)*radius*.85;this.combatArt(c,'spikes',f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,22,0,22,{frame:i%3});}
      }else if(f.key==='earthquake'){
        for(let i=0;i<4;i++){const a=i*Math.PI/2+.5;this.combatArt(c,'quake',f.x+Math.cos(a)*radius*.45,f.y+Math.sin(a)*radius*.45,70,0,70,{age:this.reduced?.2:age+i*.09});}
      }else{
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;this.combatArt(c,f.style==='psychic'?'psychic':'poison',f.x+Math.cos(a)*radius*.4,f.y+Math.sin(a)*radius*.4,35,0,35,{age:this.reduced?0:age});}
      }
    }
    if(!front){
      areaGuide(c,f.x,f.y,radius,{team:f.team,pending:true,progress:f.life/(f.duration||3)});
      if(f.key){c.save();c.translate(f.x,Math.min(H-12,f.y+radius+8));c.scale(1,1/(this.verticalScale||1));pixelMeter(c,-18,0,36,f.life/f.duration,CARDS[f.key].color);c.restore();}
    }c.restore();
  }
  frozen(c,actor){
    if(!(actor.freeze>0)||actor.hp<=0||actor.burrowed)return;
    const width='king'in actor?88:Math.max(40,(actor.radius||12)*3),y=actor.y-(actor.card?.flying?16:0)/(this.verticalScale||1);
    c.save();c.globalAlpha=Math.min(.75,actor.freeze*2);
    this.combatArt(c,'freeze',actor.x,y-width*.25/(this.verticalScale||1),width,0,width,{frame:0});c.restore();
  }
  fireball(c,spell){
    if(spell.delay>0||spell.done)return;
    const id=spell.visualId??`${spell.team}:${spell.key}:${spell.startX}:${spell.startY}:${spell.x}:${spell.y}`;
    this.visualFlights??=new Map();let pose=this.visualFlights.get(id);
    if(!pose||spell.flightElapsed<pose.logical-1e-7)pose={elapsed:Math.max(0,spell.flightElapsed-1/30),logical:spell.flightElapsed};
    // Interpolate the last simulation interval at display rate, without early landing.
    pose.elapsed=Math.max(0,Math.min(spell.flightElapsed,Math.max(pose.elapsed,spell.flightElapsed-1/30)+(this.drawDt||0)));
    pose.logical=spell.flightElapsed;pose.at=this.t;this.visualFlights.set(id,pose);
    const visual={...spell,flightElapsed:Math.min(spell.flightTime,pose.elapsed)};
    const {point,tail,angle}=fireballVisual(visual,this.verticalScale||1),age=this.reduced?0:visual.flightElapsed;
    if(spell.card?.spawnOnImpact){this.combatArt(c,'pokeball',point.x,point.y,52,this.reduced?0:age*4,52,{frame:0,trim:true});return;}
    for(let i=tail.length-1;i>=0;i--){c.save();c.globalAlpha=.45-i*.1;const size=36-i*7;
      this.combatArt(c,'fireTrail',tail[i].x,tail[i].y,size,angle-Math.PI/2,size,{age:age+i*.09,fps:8,trim:true});c.restore();}
    const size=this.reduced?58:58+Math.sin(age*5)*2;
    this.combatArt(c,'fireOrb',point.x,point.y,size,angle-Math.PI/2,size,{frame:1,trim:true});
  }
  rollingSpell(c,spell){
    const travelled=Math.max(0,spell.card.travelDistance-(spell.travelRemaining??spell.card.travelDistance)),direction=spell.team?1:-1;
    for(let i=3;i>0;i--)if(travelled>i*14){
      c.save();c.globalAlpha=(1-i/4)*.6;
      this.combatArt(c,'ember',spell.x,spell.y-direction*i*14-4,24-i*3,0,24-i*3,{age:this.reduced?0:this.t+i*.07});c.restore();
    }
    this.combatArt(c,'flameWheel',spell.x,spell.y-14,88,0,80,{age:this.reduced?0:this.t});
  }
  draw(game,dt=.016){
    const c=this.ctx;this.t+=dt;this.drawDt=dt;this.battleArt.time=this.reduced?0:this.t;
    this.updateSpellTargets(game);
    c.imageSmoothingEnabled=false;c.drawImage(this.background,0,0);this.drawWater(c);
    this.frameActors=new Map([...(game.visibleTowers??game.towers),...game.units].map(actor=>{
      const pose=this.visualActor(actor,dt);pose.logicalX=actor.x;pose.logicalY=actor.y;return[actor.id,pose];
    }));
    for(const field of game.fields||[])this.field(c,field);
    for(const spell of game.spells){
      if(spell.key==='pinMissile')continue;
      if(spell.card.rolling){this.rollingSpell(c,spell);continue;}
      const total=(spell.card.castDelay??.4)+(spell.flightTime||0),remaining=(spell.delay||0)+Math.max(0,(spell.flightTime||0)-(spell.flightElapsed||0));
      areaGuide(c,spell.x,spell.y,spell.card.splash,{team:spell.team,pending:true,progress:1-remaining/total});
    }
    const objects=[...this.frameActors.values()].sort((a,b)=>a.y-b.y);
    for(const actor of objects){if('king'in actor)this.tower(c,actor);else this.sprite(c,actor);this.frozen(c,actor);}
    for(const field of game.fields||[])if(['stealthRock','nightmare'].includes(field.key))this.field(c,field,true);
    this.drawDeployments(c,game);
    if(game.state==='ready')for(const[key,x,y,team]of[['pikachu',217,286,1],['squirtle',393,290,1],['charmander',210,554,0],['bulbasaur',390,550,0]])this.sprite(c,{id:x,card:CARDS[key],x,y,team,anim:this.t,dx:0,dy:team?1:-1},true);
    for(const p of game.projectiles)this.projectile(c,p);
    for(const spell of game.spells)if(spell.card.travelSpeed&&!spell.card.rolling)this.fireball(c,spell);
    this.drawEffects(c,dt);this.drawPlacement(c,game);
    if(this.healthStates.size>300){const ids=new Set(game.units.map(u=>u.id));for(const id of this.healthStates.keys())if(!ids.has(id))this.healthStates.delete(id);}
    const ids=new Set([...game.towers,...game.units].map(u=>u.id));for(const id of this.visualActors.keys())if(!ids.has(id))this.visualActors.delete(id);
    for(const[key,pose]of this.visualProjectiles)if(this.t-pose.at>1)this.visualProjectiles.delete(key);
    for(const[key,pose]of this.visualFlights||[])if(this.t-pose.at>1)this.visualFlights.delete(key);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;c.globalAlpha=Math.max(0,p.life/p.max);this.combatArt(c,'dust',p.x,p.y,Math.max(8,p.size*3),0,Math.max(8,p.size*3),{progress:1-p.life/p.max});}
    this.particles=this.particles.filter(p=>p.life>0);c.globalAlpha=1;
  }
}

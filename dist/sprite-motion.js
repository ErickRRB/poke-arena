import { SPRITE_GEOMETRY } from './sprite-geometry.js';

export const TOWER_MOUNTS = Object.freeze({ princess: 46, king: 59 });
export const structureLift = card => card.structure && card.platform !== false && !card.burrow ? 23 : 0;
export function attackPoseProgress(meta, elapsed, duration, windup) {
  const total=meta.durations.reduce((sum,value)=>sum+value,0);
  const hit=meta.hitFrame||Math.max(1,Math.floor(meta.durations.length*.3));
  const ratio=meta.durations.slice(0,hit).reduce((sum,value)=>sum+value,0)/total;
  const progress=elapsed<=windup?ratio*elapsed/Math.max(.001,windup):ratio+(1-ratio)*(elapsed-windup)/Math.max(.001,duration-windup);
  return Math.max(0,Math.min(.999,progress));
}
export function animationFrame(meta, clock, {loop=true}={}) {
  const total=meta.durations.reduce((sum,value)=>sum+value,0);
  let cursor=loop?((clock%total)+total)%total:Math.max(0,Math.min(total-1e-6,clock));
  for(let frame=0;frame<meta.durations.length;frame++){if(cursor<meta.durations[frame])return frame;cursor-=meta.durations[frame];}
  return meta.durations.length-1;
}
export function attackAnimationFrame(meta,elapsed,duration,windup,frames,profile={}){
  if(profile.attackGestures?.length){
    const spacing=profile.burstSpacing||duration,shots=profile.burst||1;
    const shot=Math.max(0,Math.min(shots-1,Math.floor((elapsed-windup+1e-7)/spacing)));
    const gesture=profile.attackGestures[shot%profile.attackGestures.length];
    if(elapsed<windup-1e-7)return elapsed<windup*.35?gesture.rest:gesture.prepare;
    const last=shot===shots-1,release=windup+shot*spacing;
    const window=Math.max(.001,last?duration-release:spacing),time=Math.max(0,elapsed-release),phase=time/window;
    // Hold contact for a complete 30 Hz step, including a release rounded up to
    // the next step. Both clients then see the contact drawing when damage fires.
    const contactEnd=Math.min(window*.45,Math.max(1/30+.001,window*.25));
    return time<contactEnd?gesture.contact:phase<.6?gesture.follow:phase<.8||last?gesture.rest:profile.attackGestures[(shot+1)%profile.attackGestures.length].prepare;
  }
  const sequence=frames?{durations:frames.map(frame=>meta.durations[frame]),hitFrame:Math.max(1,frames.indexOf(meta.hitFrame))}:meta;
  const phase=attackPoseProgress(sequence,elapsed,duration,windup),total=sequence.durations.reduce((a,b)=>a+b,0);
  const frame=animationFrame(sequence,phase*total,{loop:false});return frames?frames[frame]:frame;
}
export function movementAnchor(id,animation,direction,frame,fallback){
  const pose=SPRITE_GEOMETRY[id]?.[animation]?.points[direction]?.[frame],rest=SPRITE_GEOMETRY[id]?.Idle?.points[direction]?.[0];
  return pose&&rest?{x:pose[2]+rest[0]-rest[2],y:pose[3]+rest[1]-rest[3]}:fallback;
}
const HANDS=new Set(['punch','slash','aura','confusion','psychic']);
const BODY=new Set(['powder','magnet']);
const PARTS={1:'body',3:'body',9:'cannons',54:'head',65:'hands',81:'body',102:'body',109:'body',113:'body',121:'body',122:'hands',150:'hands',154:'body',196:'head',242:'body',251:'hands',252:'hands',254:'hands',282:'hands',384:'head'};
export function emitterPart(profile){return profile.emitter||PARTS[profile.id]||(HANDS.has(profile.style)?'hands':BODY.has(profile.style)?'body':'head');}
export function emissionPoint(actor,shot=0,clock=actor.anim||0) {
  const tower='king'in actor,card=actor.card,profile=card||actor.guard||{},id=profile.id;
  const attacking=actor.attack===undefined||actor.attack>0,moving=!!(profile.flying||actor.moving);
  const animations=SPRITE_GEOMETRY[id],anim=attacking?actor.attackAnim||profile.attackAnim||'Attack':moving?profile.moveAnim||'Walk':actor.hit>0?'Hurt':profile.idleAnim||'Idle',meta=animations?.[anim]||animations?.Idle;
  if(!meta){const height=tower?(actor.king?71:63):card?.muzzleHeight||22;return{x:actor.x+(actor.dx||0)*11,y:actor.y-height+(actor.dy||0)*7};}
  const duration=actor.attackDuration||profile.attackDuration||.75,elapsed=Math.max(0,duration-(actor.attack??duration)),windup=actor.attackWindup??profile.windup??.3;
  let frame;
  if(attacking)frame=attackAnimationFrame(meta,elapsed,duration,windup,profile.attackFrames,profile);
  else if(moving&&profile.moveFrames){const frames=profile.moveFrames;frame=frames[animationFrame({durations:frames.map(()=>profile.moveFrameDuration||8)},(clock+actor.id*.173)*60)];}
  else frame=animationFrame(meta,anim==='Hurt'?Math.max(0,.24-actor.hit)*60:(clock+actor.id*.173)*60*(moving?.85:.75));
  let direction=(2-Math.round(Math.atan2(actor.dy||0,actor.dx||0)/(Math.PI/4))+8)%8;
  if(meta.points.length<8)direction=0;
  const points=meta.points[direction][Math.min(frame,meta.points[direction].length-1)];
  const anchor=profile.movementAnchor==='body'&&(attacking||moving)?movementAnchor(id,anim,direction,frame,{x:points[0],y:points[1]}):{x:points[0],y:points[1]};
  const part=emitterPart(profile);
  const lead=(points[6]-points[8])*(actor.dx||0)+(points[7]-points[9])*(actor.dy||0)>=0?6:8;
  const offset=part==='body'?2:part==='leadHand'?lead:part==='hands'||part==='cannons'?(shot%2?8:6):4;
  const scale=tower?(actor.king?1.15:1.3):actor.scale??profile.scale??1.5;
  const forward=part==='head'?2:1;
  const localX=(points[offset]-anchor.x+(actor.dx||0)*forward)*scale;
  const localY=(points[offset+1]-anchor.y+(actor.dy||0)*forward+(part==='cannons'?-3:0))*scale;
  const lift=tower?TOWER_MOUNTS[actor.king?'king':'princess']:card.structure?structureLift(card):card.flying?16:0;
  return{x:actor.x+localX,y:actor.y-lift+localY};
}

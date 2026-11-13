import { SPRITE_GEOMETRY } from './sprite-geometry.js';

export const TOWER_MOUNTS = Object.freeze({ princess: 46, king: 59 });
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
const HANDS=new Set(['punch','slash','aura','confusion','psychic']);
const BODY=new Set(['powder','magnet','song']);
const PARTS={1:'body',3:'body',9:'cannons',65:'hands',81:'body',122:'hands',150:'hands',282:'hands'};
export function emissionPoint(actor,shot=0) {
  const tower='king'in actor,card=actor.card,profile=card||actor.guard||{},id=profile.id;
  const animations=SPRITE_GEOMETRY[id],anim=actor.attackAnim||profile.attackAnim||'Attack',meta=animations?.[anim]||animations?.Idle;
  if(!meta){const height=tower?(actor.king?71:63):card?.muzzleHeight||22;return{x:actor.x+(actor.dx||0)*11,y:actor.y-height+(actor.dy||0)*7};}
  const duration=actor.attackDuration||profile.attackDuration||.75,elapsed=Math.max(0,duration-(actor.attack??duration)),windup=actor.attackWindup??profile.windup??.3;
  const phase=attackPoseProgress(meta,elapsed,duration,windup),frame=animationFrame(meta,phase*meta.durations.reduce((a,b)=>a+b,0),{loop:false});
  let direction=(2-Math.round(Math.atan2(actor.dy||0,actor.dx||0)/(Math.PI/4))+8)%8;
  if(meta.points.length<8)direction=0;
  const points=meta.points[direction][Math.min(frame,meta.points[direction].length-1)],style=profile.style;
  const part=profile.emitter||PARTS[id]||(HANDS.has(style)?'hands':BODY.has(style)?'body':'head');
  const offset=part==='body'?2:part==='hands'||part==='cannons'?(shot%2?8:6):4;
  const scale=tower?(actor.king?1.15:1.3):actor.scale??profile.scale??1.5;
  const forward=part==='head'?2:1;
  const localX=(points[offset]-points[0]+(actor.dx||0)*forward)*scale;
  const localY=(points[offset+1]-points[1]+(actor.dy||0)*forward+(part==='cannons'?-3:0))*scale;
  const lift=tower?TOWER_MOUNTS[actor.king?'king':'princess']:card.structure?23:card.flying?16:0;
  return{x:actor.x+localX,y:actor.y-lift+localY};
}

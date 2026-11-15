import {POKEMON_SILHOUETTES} from './pokemon-silhouettes.js?v=34';

export const isRangedAttack=card=>!!card&&!card.suicide&&(card.rangedAttack??card.range>=50);

// Sizes refer to visible raster bounds, not transparent sheet padding.
export function combatVisual(card={}){
  const body=(POKEMON_SILHOUETTES[card.id]?.body||24)*(card.scale??1.5);
  const ratio={bubble:.34,ember:.4,hydro:.34,leaf:.34,ice:.34,shadow:.42,confusion:.36,aura:.48,psychic:.36,powder:.42,egg:.32,song:.48,magnet:.36}[card.style]||.38;
  const areaProjectile=isRangedAttack(card)&&card.splash?Math.min(34,card.splash*.45):0;
  const floor=card.id===6?26:['hydro','bubble','ember','ice','shadow','confusion','aura','psychic','poison','powder','song','egg'].includes(card.style)?13:8;
  return {body,projectile:Math.max(floor,Math.min(areaProjectile?34:28,Math.max(body*ratio,areaProjectile))),impact:Math.max(16,Math.min(42,body*.6)),beam:Math.max(4,Math.min(11,body*.16)),charge:Math.max(12,Math.min(26,body*.4))};
}
const FIRE_GESTURE=Object.freeze([0,1,2,3,4,5,6,7,8,9,10]);
export function attackVisualProfile(card){
  return card?.id===6&&card.attackAnim==='Shoot'?{...card,attackFrames:FIRE_GESTURE,attackContactFrame:2}:card;
}
export function dashPreparation(unit,reduced=false){
  if(unit.dash?.phase!=='windup'||unit.hp<=0||unit.stun>0)return null;
  const duration=Math.max(.001,unit.card?.dashWindup||unit.attackWindup||.8);
  const progress=Math.max(0,Math.min(1,(unit.dash.elapsed||0)/duration));
  const tension=reduced?.65:Math.max(0,Math.min(1,(progress-.08)/.68));
  const ease=tension*tension*(3-2*tension);
  return{progress,frame:reduced?2:progress<.14?0:progress<.38?1:2,
    scaleX:1+.07*ease,scaleY:1-.2*ease,lean:3.5*ease,energy:reduced?.6:progress};
}
export function petalPreparation(unit,reduced=false){
  if(unit.card?.projectileArt!=='petalShot'||!(unit.attack>0)||unit.hp<=0||unit.stun>0)return null;
  const duration=unit.attackDuration||unit.card.attackDuration||.6,windup=unit.attackWindup??unit.card.windup??.18;
  const elapsed=duration-unit.attack;if(!(windup>0)||elapsed>=windup-1e-7)return null;
  const progress=Math.max(0,elapsed/windup);
  const tension=reduced?0:Math.sin(Math.PI*progress);
  return{progress,energy:reduced?.65:progress,scaleX:1+.05*tension,scaleY:1-.1*tension};
}
const MOTIONS={
  hydro:{name:'hydroShot',fps:8,frame:0},bubble:{name:'bubble',fps:8,frames:[2,3,4,3]},shadow:{name:'shadow',fps:6},
  aura:{name:'psychic',fps:9},confusion:{name:'psychic',fps:9},psychic:{name:'psychic',fps:9},
  poison:{name:'poison',fps:9},powder:{name:'poison',fps:8},rock:{name:'rock',fps:5},
  leaf:{name:'leaf',fps:8},ice:{name:'snow',fps:8},ember:{name:'emberShot',fps:8,frames:[2,3,4,5,6,5,4,3]},
  magnet:{name:'lightningHead',fps:8,frames:[0,1,2,1]},coin:{name:'coin',fps:1},egg:{name:'egg',fps:8},song:{name:'songShot',fps:6,frame:0},
};
export function projectileVisual(style,age=0,reduced=false){
  const motion=MOTIONS[style]||{name:style,fps:8};
  return {...motion,age:reduced?0:age};
}

// The source sheets have eight genuine views; never substitute diagonal front/back artwork.
export function movementVisual(card){
  return {animation:card.moveAnim||'Walk',frames:card.moveFrames||null,frameDuration:card.moveFrameDuration||8,bodyAnchor:card.movementAnchor==='body'};
}

export function fireballVisual(spell,vertical=1){
  const progress=Math.max(0,Math.min(1,spell.flightElapsed/Math.max(.001,spell.flightTime)));
  const dx=spell.x-spell.startX,dy=spell.y-spell.startY,distance=Math.hypot(dx,dy),arc=Math.min(120,40+distance*.18);
  const position=t=>({x:spell.startX+dx*t,y:spell.startY+dy*t-(60*(1-t)+Math.sin(Math.PI*t)*arc)/vertical});
  const point=position(progress),angle=Math.atan2(dy+60-Math.cos(Math.PI*progress)*Math.PI*arc,dx);
  const tail=Array.from({length:3},(_,i)=>position(Math.max(0,progress-(i+1)*18/Math.max(80,distance))));
  return {point,tail,angle,progress};
}

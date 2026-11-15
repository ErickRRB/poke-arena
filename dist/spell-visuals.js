import {fireballVisual} from './combat-visuals.js?v=34';

// Flight material is an explicit spell identity. A missing style is never fire.
export const SPELL_VISUALS=Object.freeze({
  thunder:{flight:'none',impact:'electric'},
  fireball:{flight:'fire',impact:'fire'},
  log:{flight:'rolling',impact:'fire'},
  sneaselAmbush:{flight:'capsule',impact:'summon'},
  pinMissile:{flight:'needles',impact:'needles'},
  lightning:{flight:'none',impact:'electric'},
  hyperBeam:{flight:'hyper',impact:'hyper'},
  blizzard:{flight:'none',impact:'ice'},
  spikes:{flight:'none',impact:'field'},
  stealthRock:{flight:'none',impact:'field'},
  whirlpool:{flight:'none',impact:'field'},
  nightmare:{flight:'none',impact:'field'},
  earthquake:{flight:'none',impact:'field'},
});
const NATIVE_KEYS={Zap:'thunder',Fireball:'fireball',Log:'log',GoblinBarrel:'sneaselAmbush',Arrows:'pinMissile',Lightning:'lightning',Rocket:'hyperBeam',Freeze:'blizzard',Tornado:'whirlpool',Graveyard:'nightmare',Earthquake:'earthquake'};
export function spellVisualProfile(spell){
  const key=typeof spell==='string'?spell:spell.key||NATIVE_KEYS[(spell.card||spell).nativeReference];
  return SPELL_VISUALS[key]||null;
}
export function spellFlightAge(spell){
  const waves=spell.resolvedWaves||0;
  if(waves>0&&(spell.card.waves||1)>1)return Math.max(0,spell.flightTime+waves*(spell.card.waveEvery||0)-Math.max(0,spell.delay||0));
  return Math.max(0,spell.flightElapsed||0);
}
function arcPosition(spell,progress,vertical,arc,startX=spell.startX,endX=spell.x,endY=spell.y){
  const dx=endX-startX,dy=endY-spell.startY;
  return{point:{x:startX+dx*progress,y:spell.startY+dy*progress-(60*(1-progress)+Math.sin(Math.PI*progress)*arc)/vertical},angle:Math.atan2(dy+60-Math.cos(Math.PI*progress)*Math.PI*arc,dx)};
}
export function spellFlightVisual(spell,clock,vertical=1){
  const kind=spellVisualProfile(spell)?.flight,progress=Math.max(0,Math.min(1,clock/Math.max(.001,spell.flightTime)));
  if(kind==='fire'||kind==='capsule')return fireballVisual({...spell,flightElapsed:clock},vertical);
  if(kind!=='hyper')return null;
  const distance=Math.hypot(spell.x-spell.startX,spell.y-spell.startY),arc=Math.min(180,60+distance*.24);
  const frame=arcPosition(spell,progress,vertical,arc);
  return{...frame,progress,tail:Array.from({length:4},(_,i)=>arcPosition(spell,Math.max(0,progress-(i+1)*13/Math.max(80,distance)),vertical,arc).point)};
}
export function missileFormation(point,radius,wave=0){
  return Array.from({length:12},(_,i)=>{const angle=i*2.39996+wave*.23,r=Math.sqrt((i+.5)/12)*radius*.86;return{x:point.x+Math.cos(angle)*r,y:point.y+Math.sin(angle)*r};});
}
export function missileFlightVisuals(spell,clock,vertical=1){
  const shots=[],time=Math.max(.001,spell.flightTime),card=spell.card;
  for(let wave=spell.resolvedWaves||0;wave<(card.waves||1);wave++){
    const age=clock-wave*(card.waveEvery||0);
    missileFormation(spell,card.splash,wave).forEach((destination,i)=>{
      const stagger=i%3*.016,progress=(age-stagger)/Math.max(.001,time-stagger);
      if(progress<0||progress>=1)return;
      const startX=spell.startX+(i%4-1.5)*3,distance=Math.hypot(destination.x-startX,destination.y-spell.startY),arc=Math.min(150,45+distance*.2);
      const visual=arcPosition(spell,progress,vertical,arc,startX,destination.x,destination.y);
      shots.push({...visual,wave,index:i,progress,destination});
    });
  }return shots;
}

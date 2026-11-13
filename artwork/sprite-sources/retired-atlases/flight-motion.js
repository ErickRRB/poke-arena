// Original Pokémon Showdown animated flight frames, losslessly unpacked from GIF.
// See artwork/sprite-sources/README.md for sources and conversion.
import { FLIGHT_ATLASES } from './assets/battle/flight-atlases.js';
const FLIGHT_PROFILES={
  6:{cycle:1.6,front:{scale:.26,anchor:{x:60,y:116},mouth:{x:32,y:74},phase:0},back:{scale:.21,anchor:{x:118,y:130},mouth:{x:147,y:77},phase:.38}},
  149:{cycle:1.4,front:{scale:.31,anchor:{x:35,y:91},mouth:{x:28,y:27},hands:[{x:17,y:51},{x:49,y:49}],phase:0},back:{scale:.31,anchor:{x:80,y:91},mouth:{x:104,y:37},hands:[{x:80,y:55},{x:104,y:52}],phase:.4}},
  18:{cycle:1.6,front:{scale:.29,anchor:{x:68,y:103},mouth:{x:55,y:63},phase:0},back:{scale:.31,anchor:{x:48,y:98},mouth:{x:61,y:57},phase:0}},
  249:{cycle:2.1,front:{scale:.48,anchor:{x:70,y:115},mouth:{x:53,y:30},phase:0},back:{scale:.44,anchor:{x:108,y:123},mouth:{x:124,y:39},phase:.2}},
  334:{cycle:1.8,front:{scale:.46,anchor:{x:68,y:81},mouth:{x:62,y:26},phase:0},back:{scale:.55,anchor:{x:60,y:82},mouth:{x:78,y:24},phase:.4}},
  330:{cycle:1.3,front:{scale:.24,anchor:{x:65,y:96},mouth:{x:47,y:41},hands:[{x:47,y:57},{x:66,y:58}],phase:0},back:{scale:.21,anchor:{x:105,y:100},mouth:{x:122,y:43},hands:[{x:108,y:59},{x:127,y:60}],phase:.25}},
};
export function flightSheets(id){return Object.entries(FLIGHT_ATLASES[id]||{}).map(([view,meta])=>({...meta,key:id+'-Flight'+view}));}
export function flightPose(actor,time,reduced=false){
  const profile=FLIGHT_PROFILES[actor.card?.id];
  if(!profile||!actor.card.flying||actor.mounted)return null;
  const direction=(2-Math.round(Math.atan2(actor.dy||0,actor.dx||0)/(Math.PI/4))+8)%8;
  const back=direction>=3&&direction<=5,view=back?'back':'front',meta={...FLIGHT_ATLASES[actor.card.id][view],...profile[view],key:actor.card.id+'-Flight'+view};
  const flip=back?direction===5:direction===1||direction===2;
  // A shared cycle preserves the flap through movement, hurt and attack states.
  const phase=reduced?.2:((time/profile.cycle+(Number(actor.id)||0)*.173+meta.phase)%1+1)%1;
  const frame=Math.min(meta.frames-1,Math.floor(phase*meta.frames));
  const scale=(actor.scale??actor.card.scale??1.5)*meta.scale;
  const healthHeight=Math.max(profile.front.anchor.y*profile.front.scale,profile.back.anchor.y*profile.back.scale)*(actor.scale??actor.card.scale??1.5);
  return{...meta,frame,flip,scale,healthHeight,sx:frame%meta.columns*meta.width,sy:Math.floor(frame/meta.columns)*meta.height};
}
export function flightEmission(actor,pose,part='head',shot=0){
  const point=part==='hands'&&pose.hands?pose.hands[shot%2]:pose.mouth;
  return{x:actor.x+(point.x-pose.anchor.x)*pose.scale*(pose.flip?-1:1),y:actor.y-16+(point.y-pose.anchor.y)*pose.scale};
}

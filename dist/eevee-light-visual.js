import {LIGHT_EEVEE_IDENTITY} from './eevee-light-profile.js?v=eevee-1';
import {EEVEE_NATIVE_BOUNDS} from './eevee-native-bounds.js?v=eevee-1';

export const LIGHT_EEVEE_SCALE=1.5;
export const LIGHT_EEVEE_CONTACT_SECONDS=.28;
export const isLightEevee=card=>card?.id===133&&card.nativeReference===LIGHT_EEVEE_IDENTITY&&card.attackAnim==='Attack';

// Original dust atlas bounds; retain its pixel scale/pivot while cropping padding.
const DUST_BOUNDS=[[9,9,23,23],[4,5,28,27],[1,1,31,31],[0,1,32,31],[0,0,32,32],[0,0,32,32],[0,0,32,32]];
export function lightEeveeContactPoint(surface,from,size=24){
  return {surface:{x:surface.x,y:surface.y},x:surface.x,y:surface.y,size};
}
export function lightEeveeAdvance(unit,reduced=false){
  if(reduced||!isLightEevee(unit.card)||unit.mounted||unit.hp<=0||unit.stun>0||unit.freeze>0||unit.pushHurt>0||!(unit.attack>0))return{x:0,y:0};
  const windup=unit.attackWindup??unit.card.windup,duration=unit.attackDuration||unit.card.attackDuration,elapsed=Math.max(0,duration-unit.attack);
  if(!(windup>0&&duration>windup))return{x:0,y:0};
  const t=elapsed<=windup?elapsed/windup:Math.max(0,(duration-elapsed)/(duration-windup));
  const eased=t*t*(3-2*t),distance=Math.hypot(unit.dx||0,unit.dy||0);
  return distance?{x:(unit.dx||0)/distance*3*eased,y:(unit.dy||0)/distance*3*eased}:{x:0,y:0};
}
export function drawLightEeveeContact(c,image,point,progress,reduced=false,vertical=1){
  if(!image||!point)return false;
  progress=Math.max(0,Math.min(1,progress));
  const frame=reduced?2:Math.min(6,1+Math.floor(progress*6));
  const [left,top,right,bottom]=DUST_BOUNDS[frame],scale=point.size/32;
  c.save();c.globalAlpha*=Math.min(1,(1-progress)*4);
  c.drawImage(image,frame*32+left,top,right-left,bottom-top,
    point.x+(left-16)*scale,point.y+(top-16)*scale/vertical,
    (right-left)*scale,(bottom-top)*scale/vertical);
  c.restore();return true;
}
export function lightEeveeHealthPlacement(unit,pose,width,pixel,bounds={left:0,right:600}){
  const box=EEVEE_NATIVE_BOUNDS[pose?.anim]?.[pose.direction]?.[pose.frame];
  if(!box)return null;
  const scale=pose.scale,vertical=pose.vertical||1;
  const originX=unit.x+(unit.dx||0)*pose.lunge-pose.anchor.x*scale;
  const originY=unit.y+(unit.dy||0)*pose.lunge/vertical-pose.lift-pose.anchor.y*scale/vertical;
  const left=originX+box[0]*scale,right=originX+box[2]*scale;
  const top=originY+box[1]*scale/vertical,bottom=originY+box[3]*scale/vertical;
  let x=right+2*pixel+width/2;
  if(x+width/2+pixel>bounds.right)x=left-2*pixel-width/2;
  return{x,y:(top+bottom)/2-2*pixel,ownerX:(left+right)/2,ownerY:(top+bottom)/2,
    body:{left,right,top,bottom}};
}
